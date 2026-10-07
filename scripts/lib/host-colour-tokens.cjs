/**
 * dsh-dream-skin — HOST COLOUR-TOKEN EXTRACTION (shared by census + gap gate).
 *
 * Issue #88: the census in `scripts/host-consumers.cjs` counts EVERY `--dsw-*`
 * token the host mentions (880 of them on 0.2.0-rc.1, including fragments like
 * `--A` that a naive regex picks out of prose). That is the right ruler for the
 * "we ship it, nobody reads it" question (#81). It is the wrong ruler for the
 * forward question — "the host paints with this colour and our skin does not
 * define it" — because a substring match cannot tell a colour from a word.
 *
 * So the forward question gets its own extraction, deliberately narrower:
 *   - the token must be DECLARED in the theme package's
 *     `design_platform_css_default` block (the platform palette, the only place
 *     a host default value lives), and
 *   - the declared value must look like a colour (or a colour function the
 *     browser resolves: `color-mix(...)`, `transparent`, a gradient stop).
 *
 * Everything else — spacing, radius, font stacks, z-index, the mangled
 * duplicate-concatenation names — is not a colour and cannot be a "we left it
 * host-grey" defect. Keeping the two rulers separate and NAMING them is the
 * point: the census says "consumers", this says "colour".
 */

/**
 * Where the palette lives, relative to the discovered host root.
 *
 * `scripts/host-consumers.cjs` discovers the SCOPE directory (`…/@deepseek-ai`)
 * that contains the individual packages, so the path is just the package name.
 * (The census's own `uiThemeVersion` probe joins `@deepseek-ai/…` onto that root
 * and has therefore always read null — noted and fixed alongside this file.)
 */
const THEME_PACKAGE = 'dsh-client-ui-theme';
const THEME_ENTRY = ['lib', 'client.js'];
const PALETTE_MARKER = 'design_platform_css_default';

/** Absolute path of the theme bundle inside a discovered host root. */
const themeEntryPath = (hostRoot, join = require('node:path').join) =>
	join(hostRoot, THEME_PACKAGE, ...THEME_ENTRY);

/**
 * A declared value counts as a colour when the browser will resolve it to one.
 * `var(...)` is EXCLUDED on purpose: a host token aliased to another host token
 * (`turn-trigger-bg = var(--dsw-alias-markdown-code-block)`) inherits whatever
 * that token resolves to, so it is already covered by that token's own row —
 * counting it again would double-count one surface as two gaps.
 */
const COLOUR_VALUE = /^(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(|lch\(|lab\(|color\(|color-mix\(|transparent\b)/;

/** Tokens whose name says "we do not skin this" — never a gap. */
const NOT_SKINNABLE = /^--dsw-static-/;

/**
 * Pull `--token: value` pairs out of the platform palette block.
 *
 * The block holds BOTH schemes back to back (light then dark, or the reverse —
 * the order is not contractual), so a token legitimately appears twice with two
 * values. This returns the LAST declaration seen per token plus every distinct
 * value, because "which value does the user see" depends on the active scheme
 * and this file must not pretend to know which half it read.
 */
function extractColourTokens(source) {
	const at = source.indexOf(PALETTE_MARKER);
	if (at < 0) {
		throw new Error(
			`${PALETTE_MARKER} not found — the host theme package moved its palette block, ` +
				'and a gap measurement that cannot read the palette must fail loudly rather than report zero gaps'
		);
	}
	const out = new Map();
	// Bounded scan: the palette block is large but not unbounded. 200 kB is the
	// same bound the issue's repro used, kept for comparability.
	for (const m of source.slice(at, at + 200000).matchAll(/(--dsw-[a-z0-9-]+)\s*:\s*([^;}"']{1,120})/g)) {
		const name = m[1];
		const value = m[2].trim();
		if (!COLOUR_VALUE.test(value)) continue;
		if (NOT_SKINNABLE.test(name)) continue;
		const row = out.get(name) || { values: [], declarations: 0 };
		row.declarations += 1;
		if (!row.values.includes(value)) row.values.push(value);
		out.set(name, row);
	}
	return out;
}

/**
 * `<token> → set of packages that read it with var()`.
 *
 * Unlike the census (which records a file COUNT), the gap needs to NAME the
 * readers: the disposition of a gap depends on who is on the other end.
 * `basename` mirrors the issue's repro — a consumer is attributed to its own
 * package directory when it is a `lib/client.js`-style bundle, else to the file
 * stem. It is an approximation and is labelled as one in the frozen data.
 */
function extractReaders(files, readFile, colourTokens) {
	const readBy = new Map();
	for (const file of files) {
		let text;
		try { text = readFile(file); } catch { continue; }
		for (const m of text.matchAll(/var\(\s*(--dsw-[a-z0-9-]+)/g)) {
			const name = m[1];
			if (!colourTokens.has(name)) continue;
			const row = readBy.get(name) || new Set();
			row.add(packageOf(file));
			readBy.set(name, row);
		}
	}
	return readBy;
}

/** `…/@deepseek-ai/dsh-client-ui-chat/lib/client.js` → `dsh-client-ui-chat`. */
function packageOf(file) {
	const parts = String(file).split(/[\\/]/);
	const i = parts.lastIndexOf('@deepseek-ai');
	if (i >= 0 && i + 1 < parts.length) return parts[i + 1];
	const base = parts[parts.length - 1];
	return base === 'client.js' ? parts[parts.length - 3] || base : base.replace(/\.css$/, '');
}

/**
 * Split a declared value list into the base tokens it derives from.
 * `color-mix(in srgb, var(--a) 30%, transparent)` → `['--a']`.
 */
function derivedBases(values) {
	const bases = new Set();
	for (const v of values) for (const m of String(v).matchAll(/var\(\s*(--[a-z0-9-]+)/gi)) bases.add(m[1]);
	return [...bases];
}

/**
 * A host token is `derived` when EVERY declaration is built out of `var()`
 * references to other host tokens, and `literal` when even one declaration
 * hardcodes a colour.
 *
 * "Built out of var()" includes `color-mix(in srgb, var(--a) 30%, transparent)`
 * — a mix of another token with `transparent` still FOLLOWS that token, and
 * treating it as a hardcoded colour is how `--dsw-alias-label-shimmer` would
 * have been filed as a gap and then "fixed" by duplicating a decision that
 * already belongs to the static ramp it mixes from.
 *
 * The distinction is the disposition rule. A fully-derived token follows
 * whatever its base resolves to, so overriding it separately is a duplicate
 * owner (#89's `turn-trigger-*`, and the reason that issue warns against
 * "helpfully" adding them back). A token with even one hardcoded declaration
 * does NOT follow anything on that path — `--dsw-specific-menu` is
 * `var(--dsw-menu-surface-fill)` in both schemes and a 94%-opaque literal under
 * `html[data-platform=darwin] body` — so it has to be decided on its own.
 */
function classifyToken(row) {
	const values = (row && row.values) || [];
	const bases = derivedBases(values);
	const hardcoded = values.filter((v) => !/var\(\s*--/.test(v));
	return {
		kind: hardcoded.length ? 'literal' : 'derived',
		hardcoded,
		bases
	};
}

module.exports = {
	THEME_PACKAGE,
	THEME_ENTRY,
	themeEntryPath,
	PALETTE_MARKER,
	COLOUR_VALUE,
	NOT_SKINNABLE,
	extractColourTokens,
	extractReaders,
	classifyToken,
	derivedBases,
	packageOf
};
