/**
 * dsh-dream-skin — FORWARD TOKEN GAP (issue #88).
 *
 * The census in `scripts/host-consumers.cjs` answers "we ship it, does anyone
 * read it?" (issue #81). This file answers the other half, which nothing
 * covered: "the host reads it — do WE paint it?".
 *
 * A token the host reads and no skin defines is not "one missing token". It is
 * a visible surface that ignores the skin: before #88 the menu body, the card
 * outlines at two of four weights, the tool-bar chips, the file-diff rows and
 * the keyboard focus ring all painted in the host's neutral grey no matter
 * which of the eight skins was active.
 *
 * Two functions, deliberately separated:
 *   `measureGap()` reads the host and returns the raw measurement. It is the
 *   ONLY part that needs the host installed, and it is what the census freezes.
 *   `checkGap()` is PURE — it takes the frozen measurement, the shipped token
 *   set and the disposition table, and returns a list of complaints. All the
 *   policy lives there, which is what lets `tests/host.gap.test.cjs` hand it
 *   deliberately broken inputs and require a specific complaint (a gate whose
 *   only evidence is "it is green today" is the thing this repo forbids).
 */
const fs = require('node:fs');
const path = require('node:path');

const {
	themeEntryPath,
	extractColourTokens,
	extractReaders,
	classifyToken
} = require('./host-colour-tokens.cjs');
const { DISPOSITIONS, DISPOSITION_KINDS } = require('../data/host-gap-dispositions.cjs');

const ROOT = path.join(__dirname, '..', '..');
const CLIENT = path.join(ROOT, 'lib', 'client.js');

/** What each skin ships, as a Set. Read from the design system, not the bundle. */
function shippedTokens() {
	const { buildAll } = require('../skin-system.cjs');
	const out = new Set();
	for (const skin of buildAll()) for (const name of Object.keys(skin.tokens)) out.add(name);
	return out;
}

/**
 * Read the installed host and return the gap.
 *
 * Throws when the host cannot be found or its palette cannot be read — the
 * caller decides whether that is "skip, and say so" (CI) or a failure
 * (a developer machine). Returning an empty gap would be the worst option: it
 * reads as "no problems" and is indistinguishable from a real all-clear.
 */
function measureGap({ hostRoot, readFile = (f) => fs.readFileSync(f, 'utf8'), files }) {
	const themeFile = themeEntryPath(hostRoot);
	const colour = extractColourTokens(readFile(themeFile));
	// The caller passes the already-walked file list when it has one (the
	// census does): the two measurements must describe the SAME bytes, and a
	// second walk could pick up a file the first one missed.
	if (!files) throw new Error('measureGap needs `files` — reuse the census walk rather than walking the host twice');
	const readers = extractReaders(files, readFile, colour);
	const shipped = shippedTokens();
	const entries = {};
	for (const [token, who] of readers) {
		if (shipped.has(token)) continue;
		const row = colour.get(token);
		const cls = classifyToken(row);
		entries[token] = {
			values: [...row.values],
			kind: cls.kind,
			bases: cls.bases,
			consumers: who.size,
			readers: [...who].sort()
		};
	}
	return {
		ruler: {
			__comment:
				'A "colour token" here is narrower than the census\'s "token": it must be DECLARED in the theme package\'s design_platform_css_default block with a value that resolves to a colour. The census counts every --dsw-* mention (880 on 0.2.0-rc.1, fragments included) because its question is "does anyone read it"; this counts the 42 the host can actually paint with, because its question is "do we paint it".',
			colourTokensDeclared: colour.size,
			readByHost: readers.size,
			shipped: shipped.size
		},
		entries
	};
}

/**
 * The gate. Pure: everything it needs is a parameter.
 *
 * Returns `{ problems: [...], counts: {...} }`. An empty `problems` is the only
 * pass; the caller must not treat "no host" as an empty problem list.
 */
function checkGap({
	gap,
	shipped,
	dispositions = DISPOSITIONS,
	kinds = DISPOSITION_KINDS,
	clientSource = null,
	censusHostVersion = null
} = {}) {
	const problems = [];
	const entries = (gap && gap.entries) || {};
	const measured = Object.keys(entries).sort();

	// 1. Every measured gap needs a disposition, and it must be one we know.
	const unregistered = [];
	for (const token of measured) {
		const d = dispositions[token];
		if (!d || !d.disposition) unregistered.push(token);
		else if (!kinds.includes(d.disposition)) {
			problems.push(`${token}: unknown disposition "${d.disposition}" (legal: ${kinds.join(' / ')})`);
		}
	}
	if (unregistered.length) {
		problems.push(
			`${unregistered.length} host-read colour token(s) with no disposition — the host paints these and our skins do not, ` +
				`and nobody has decided whether that is deliberate: ${unregistered.join(', ')}`
		);
	}

	// 2. A disposition must describe something real.
	//
	//    `cover` entries are absent from the measurement BY CONSTRUCTION: we
	//    ship the token, so it is no longer a gap. Everything else must either
	//    be measured on this host, or name the host version that introduces it
	//    (`since`) — so an excuse cannot outlive its reason. Once the host is
	//    upgraded and the census re-frozen, the token shows up in `measured`
	//    and the `since` has to go.
	const orphans = [];
	for (const token of Object.keys(dispositions)) {
		const d = dispositions[token];
		if (!d || !d.disposition) continue;
		if (d.disposition === 'cover') continue;
		if (entries[token]) continue;
		if (!d.since) orphans.push(token);
		else if (censusHostVersion && !(d.since > censusHostVersion)) {
			orphans.push(`${token} (declared "since ${d.since}", but the census host is ${censusHostVersion} — the excuse is stale)`);
		}
	}
	if (orphans.length) {
		problems.push(`disposition(s) that describe no measured gap: ${orphans.join(', ')}`);
	}

	// 2b. And the reverse: a `cover` token that is still measured means the
	//     skin set and the census disagree about whether we ship it.
	for (const token of measured) {
		const d = dispositions[token];
		if (d && d.disposition === 'cover') {
			problems.push(`${token} is dispositioned "cover" and still measures as a gap — the frozen census predates the fix; re-run \`npm run host:census\``);
		}
	}

	// 3. Every gap must actually be READ by someone and must declare its values.
	//    A gap with no reader is a measurement artefact, not a gap.
	for (const token of measured) {
		const row = entries[token];
		if (!row.consumers || !row.readers || row.readers.length === 0) {
			problems.push(`${token}: recorded as a gap with no reader — a gap nobody reads is a measurement bug`);
		}
		if (!row.values || row.values.length === 0) {
			problems.push(`${token}: recorded as a gap with no declared host value`);
		}
	}

	// 4. Per-disposition assertions.
	const shippedSet = shipped instanceof Set ? shipped : new Set(shipped || []);
	const src = clientSource != null ? clientSource : (fs.existsSync(CLIENT) ? fs.readFileSync(CLIENT, 'utf8') : '');
	for (const [token, d] of Object.entries(dispositions)) {
		if (!d || !d.disposition) continue;
		if (d.disposition === 'cover') {
			if (!shippedSet.has(token)) {
				problems.push(`${token}: disposition "cover" but no skin ships it — the host keeps painting this surface with its own neutral`);
			}
		} else if (d.disposition === 'not-skinned') {
			if (shippedSet.has(token)) {
				problems.push(
					`${token}: declared "not-skinned" but a skin ships it — either the reasoning is stale or the value is wrong, ` +
						'and silently keeping both means the declared boundary is only a comment'
				);
			}
			if (!d.reason) problems.push(`${token}: "not-skinned" needs a reason`);
		} else if (d.disposition === 'computed') {
			if (shippedSet.has(token)) {
				problems.push(`${token}: declared "computed" but a skin also ships it — two owners for one token`);
			}
			if (!d.anchor) problems.push(`${token}: "computed" needs an \`anchor\` naming the code that computes it`);
			else if (!src.includes(d.anchor)) {
				problems.push(`${token}: "computed" cites anchor "${d.anchor}", which no longer appears in lib/client.js`);
			}
		} else if (d.disposition === 'derived') {
			if (shippedSet.has(token)) {
				problems.push(`${token}: declared "derived" but a skin ships it — a derived token has exactly one owner, its base`);
			}
			if (!d.base) problems.push(`${token}: "derived" needs a \`base\` token`);
			else {
				const row = entries[token];
				const bases = row ? row.bases || [] : [];
				if (row && row.kind !== 'derived') {
					problems.push(`${token}: declared "derived" but the host hardcodes a value for it (${(row.values || []).join(' / ')})`);
				} else if (row && !bases.includes(d.base)) {
					problems.push(`${token}: "derived" cites base ${d.base}, which is not one of its measured bases (${bases.join(', ') || 'none'})`);
				}
			}
		}
	}

	const counts = {
		measured: measured.length,
		cover: Object.values(dispositions).filter((d) => d.disposition === 'cover').length,
		computed: Object.values(dispositions).filter((d) => d.disposition === 'computed').length,
		derived: Object.values(dispositions).filter((d) => d.disposition === 'derived').length,
		notSkinned: Object.values(dispositions).filter((d) => d.disposition === 'not-skinned').length
	};
	return { problems, counts };
}

module.exports = { measureGap, checkGap, shippedTokens, DISPOSITIONS, DISPOSITION_KINDS };
