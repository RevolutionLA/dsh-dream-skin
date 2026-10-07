/**
 * dsh-dream-skin — craft gates (module / material / radius / layout).
 *
 * scripts/skin-audit.cjs proves the PALETTE; scripts/craft-audit.cjs proves
 * the CRAFT — that the modules are fed by audited tokens, that no glass
 * constant is authored for a single scheme, that overlays inherit the host
 * radius, and that we never move host layout.
 *
 * Same admission rules as the palette tests: every gate here is paired with a
 * MUTATION that must redden it, and the check set itself is pinned so a
 * gutted audit cannot pass silently.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { auditCraft, extractSheets, parseBlocks } = require('../scripts/craft-audit.cjs');

const CLIENT = path.join(__dirname, '..', 'lib', 'client.js');
const CODE = fs.readFileSync(CLIENT, 'utf8');

const CHECK_NAMES = [
	'sheet-reconciliation',
	'css-fully-resolved',
	'module-coverage',
	'module-token-audited',
	'glass-scheme-aware',
	'radius-inherit',
	'glass-scheme-pairs',
	'layout-neutral',
	'blur-derived'
];

const checkNamed = (report, name) => report.checks.find((c) => c.name === name);
/** Mutate the bundle SOURCE (the audit reads text, not a require cache). */
const mutate = (...pairs) => pairs.reduce((src, [from, to]) => {
	if (!src.includes(from)) throw new Error(`mutation anchor missing: ${from}`);
	return src.replace(from, to);
}, CODE);

test('the craft audit covers every property it claims to', () => {
	const names = auditCraft(CODE).checks.map((c) => c.name).sort();
	assert.deepEqual(names, [...CHECK_NAMES].sort(), 'the craft check set itself is pinned');
});

test('the shipped sheet clears every craft gate', () => {
	const report = auditCraft(CODE);
	for (const c of report.checks) assert.ok(c.pass, `${c.name}: ${c.detail}`);
});

test('every module in the inventory is fed by an audited token', () => {
	const report = auditCraft(CODE);
	const c = checkNamed(report, 'module-coverage');
	assert.ok(c.pass, c.detail);
	assert.match(c.detail, /15 modules/, 'the whole inventory is covered');
	// Per-module verdicts, not one aggregate number: "14 modules fed" used to
	// be a constant string that stayed true after a module's rule was deleted
	// (issue #74).
	assert.ok(!/MISSING/.test(c.detail), c.detail);
});

// ── mutations: a gate that cannot fail is not a gate ───────────────────────

test('mutation: a literal white rim reddens glass-scheme-aware', () => {
	// The exact defect this audit was written for: a white rim authored for a
	// dark canvas is invisible on `ivory` / `mist` / `rose`.
	const broken = mutate(['"  box-shadow: var(" + GLASS_RIM_VAR + ");",', '"  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.14);",']);
	assert.equal(checkNamed(auditCraft(broken), 'glass-scheme-aware').pass, false, 'rim gate can fail');
	assert.equal(checkNamed(auditCraft(CODE), 'glass-scheme-aware').pass, true, '…and passes on the real sheet');
});

test('mutation: a glass constant declared for one scheme reddens glass-scheme-pairs', () => {
	const broken = mutate([
		'"html[" + SCHEME_ATTR + \'="\' + SCHEME_LIGHT + \'"] {\',',
		'"html[data-never-matches] {",'
	]);
	assert.equal(checkNamed(auditCraft(broken), 'glass-scheme-pairs').pass, false, 'pair gate can fail');
});

test('mutation: an overlay that squares off a rounded card reddens radius-inherit', () => {
	// A rim that does not inherit paints a sharp rectangle over the host's
	// rounded card — the "外层尖角框" this project already fixed once.
	const broken = mutate(['"  border-radius: inherit;",', '"  border-radius: 0;",']);
	assert.equal(checkNamed(auditCraft(broken), 'radius-inherit').pass, false, 'radius gate can fail');
});

test('mutation: a skin that stops shipping a module token reddens module-coverage', () => {
	const broken = mutate(['"--dsw-specific-bubble": "rgba(31, 33, 38, 0.92)",', '"--dsw-specific-bubble-REMOVED": "rgba(31, 33, 38, 0.92)",']);
	assert.equal(checkNamed(auditCraft(broken), 'module-coverage').pass, false, 'coverage gate can fail');
});

test('mutation: painting a module with a token no skin ships reddens module-token-audited', () => {
	// A var() nobody grades is a module nobody graded — and a token no skin
	// ships is a module silently falling back to the host's own palette.
	const broken = mutate(['"  background: var(--dsw-specific-sidebar-fill) !important;",', '"  background: var(--dsw-alias-bg-layer-4) !important;",']);
	const report = auditCraft(broken);
	const hit = checkNamed(report, 'module-token-audited').pass === false || checkNamed(report, 'module-coverage').pass === false;
	assert.ok(hit, 'unmeasured paint is reported');
});

test('mutation: resizing a host box reddens layout-neutral', () => {
	const broken = mutate(['".qDHVXG_fade {",', '".qDHVXG_fade { width: 100%;",']);
	assert.equal(checkNamed(auditCraft(broken), 'layout-neutral').pass, false, 'layout gate can fail');
});

test('mutation: an unexplained blur radius reddens blur-derived', () => {
	const broken = mutate(['"    backdrop-filter: blur(24px) saturate(150%);",', '"    backdrop-filter: blur(37px) saturate(150%);",']);
	assert.equal(checkNamed(auditCraft(broken), 'blur-derived').pass, false, 'blur gate can fail');
});

// ── the two failure modes this audit already had ───────────────────────────

/** Swap the four glass constants between the dark and light rule bodies. */
function swapGlassSchemes(src) {
	const lines = src.split('\n');
	const findRule = (marker) => {
		const at = lines.findIndex((l) => l.includes(marker));
		if (at < 0) throw new Error(`rule anchor missing: ${marker}`);
		return at;
	};
	const dark = findRule('"html {",');
	const light = findRule('"html[" + SCHEME_ATTR');
	for (let i = 0; i < 4; i++) {
		const a = dark + 1 + i;
		const b = light + 1 + i;
		const t = lines[a];
		lines[a] = lines[b];
		lines[b] = t;
	}
	return lines.join('\n');
}

test('mutation: swapping the two glass constant sets reddens glass-scheme-pairs', () => {
	// Both sets are now wrong: dark wears the paper values and vice versa.
	// Asserting that two selector strings exist (the old implementation) is
	// satisfied by exactly this mutation — that was issue #74.
	const report = auditCraft(swapGlassSchemes(CODE));
	assert.equal(checkNamed(report, 'glass-scheme-pairs').pass, false, 'the pair gate compares values');
	assert.match(checkNamed(report, 'glass-scheme-pairs').detail, /light\(|no base|one scheme only/);
});

test('mutation: deleting a module rule body reddens module-coverage and names it', () => {
	// The aggregate "N modules fed" line used to survive this, because it was a
	// constant string. Now the module itself must be named.
	const lines = CODE.split('\n');
	const at = lines.findIndex((l) => l.includes('".nArs4W_panel {",'));
	assert.ok(at > 0, 'sidebar rule anchor');
	// Drop the rule (selector line through its closing brace) — three lines.
	const broken = [...lines.slice(0, at), ...lines.slice(at + 3)].join('\n');
	const c = checkNamed(auditCraft(broken), 'module-coverage');
	assert.equal(c.pass, false, 'coverage gate can fail');
	assert.match(c.detail, /sidebar/, `the report names the module: ${c.detail}`);
});

test('mutation: a scheme-blind white rim in the SECOND sheet reddens glass-scheme-aware', () => {
	// The nav-icon sheet is a separate injected <style>. It used to be outside
	// the audit's domain entirely (issue #75), so this mutant stayed green.
	const broken = mutate([
		'"mask:url(\\"data:image/svg+xml," + mask + "\\") center/contain no-repeat}"',
		'"mask:url(\\"data:image/svg+xml," + mask + "\\") center/contain no-repeat;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14)}"'
	]);
	const c = checkNamed(auditCraft(broken), 'glass-scheme-aware');
	assert.equal(c.pass, false, 'the second sheet is graded too');
	assert.match(c.detail, /nav-icon/, `the report says which sheet: ${c.detail}`);
});

test('mutation: a third injected stylesheet reddens sheet-reconciliation', () => {
	// A new sheet must not be able to appear without being read. Simulated by
	// adding an injection site the audit has no payload for.
	const broken = mutate([
		'\t\t\t\tel = document.createElement("style");',
		'\t\t\t\tconst spare = document.createElement("style");\n\t\t\t\tel = document.createElement("style");'
	]);
	const c = checkNamed(auditCraft(broken), 'sheet-reconciliation');
	assert.equal(c.pass, false, 'reconciliation gate can fail');
	assert.match(c.detail, /injects 3 stylesheet/);
});

// ── issue #80: the glass scheme must follow the SKIN, not the host ─────────
//
// `node --test` has no browser, so the cascade is MODELLED: a matcher for the
// only selector shapes the glass blocks use (`tag`, `tag[attr]`,
// `tag[attr="v"]`, `tag:not([attr])`) plus "last matching declaration wins".
// That ordering model is exact for this sheet — the light block is both later
// in source AND higher in specificity (0,1,1 vs 0,0,1) than the bare `html`
// base — and the mutants below are what keep the model honest.

/** Match `html[attr="v"]` / `body:not([attr])` style selectors against a DOM. */
function selectorMatches(selector, dom) {
	const tag = /^([a-z]+)/.exec(selector);
	if (!tag) return false;
	const attrs = tag[1] === 'html' ? dom.html : tag[1] === 'body' ? dom.body : null;
	if (attrs === null) return false;
	let rest = selector.slice(tag[1].length);
	for (;;) {
		let m = /^\[([\w-]+)(?:="([^"]*)")?\]/.exec(rest);
		if (m) {
			if (!(m[1] in attrs)) return false;
			if (m[2] !== undefined && attrs[m[1]] !== m[2]) return false;
			rest = rest.slice(m[0].length);
			continue;
		}
		m = /^:not\(\[([\w-]+)(?:="([^"]*)")?\]\)/.exec(rest);
		if (m) {
			const present = m[1] in attrs;
			const equal = m[2] === undefined ? present : attrs[m[1]] === m[2];
			if (equal) return false;
			rest = rest.slice(m[0].length);
			continue;
		}
		break;
	}
	return rest === '';
}

/** Resolve the four glass constants for a given DOM state (see the note above). */
function resolveGlass(src, dom) {
	const sheet = extractSheets(src).find((s) => s.id === 'material');
	assert.ok(sheet, 'the material sheet must be readable');
	const out = {};
	for (const block of parseBlocks(sheet.css)) {
		if (!selectorMatches(block.selector, dom)) continue;
		for (const d of block.decls) {
			if (d.prop.startsWith('--dsh-dream-skin-glass-')) out[d.prop] = d.value;
		}
	}
	return out;
}

/** The two states that used to be mis-judged by a host-attribute binding. */
const HOST_LOST_ATTR = { html: {}, body: {} }; // host erased its dark attribute
const HOST_DISAGREES = { html: { 'data-dsh-dream-skin-scheme': 'dark' }, body: {} }; // host = light, skin = dark

test('#80: a dark skin keeps the dark glass set when the host stops stamping its scheme', () => {
	// (a) `body` carries no `data-ds-dark-theme`. The old binding put the light
	// override on `body:not([data-ds-dark-theme])`, so this state handed a dark
	// skin the paper rim (0.55 / 0.70) and blend `normal` over a dark canvas —
	// with the comment on top claiming the opposite.
	const glass = resolveGlass(CODE, HOST_LOST_ATTR);
	assert.match(glass['--dsh-dream-skin-glass-sheen-blend'], /screen/, 'dark set, not the paper set');
	assert.match(glass['--dsh-dream-skin-glass-edge'], /rgba\(255,\s*255,\s*255/, 'dark edge stays white-ish');
});

test('#80: a host scheme that disagrees with the skin yields the SKIN set', () => {
	// (b) host light, skin dark: the attribute we stamp says `dark`, so the
	// light override does not match and the dark base wins. Had the override
	// been keyed on the host's own channel it would have flipped here.
	const glass = resolveGlass(CODE, HOST_DISAGREES);
	assert.match(glass['--dsh-dream-skin-glass-sheen-blend'], /screen/, 'skin wins, not the host');
});

test('#80: a light skin gets the paper set', () => {
	const glass = resolveGlass(CODE, { html: { 'data-dsh-dream-skin-scheme': 'light' }, body: { 'data-ds-dark-theme': '' } });
	assert.match(glass['--dsh-dream-skin-glass-sheen-blend'], /normal/, 'screen would bleach the pane');
	assert.match(glass['--dsh-dream-skin-glass-rim'], /rgba\(255,\s*255,\s*255,\s*0\.55\)/, 'paper rim is the strong catch light');
});

test('mutation: re-binding the light override to the host attribute reddens the #80 cases', () => {
	// The migration is only worth anything if the OLD binding actually fails
	// these assertions. Rebuilt here so the gate cannot be satisfied by a
	// cosmetic rename of the same broken semantics.
	const reverted = mutate([
		'"html[" + SCHEME_ATTR + \'="\' + SCHEME_LIGHT + \'"] {\',',
		'"body:not([data-ds-dark-theme]) {",'
	]);
	const glass = resolveGlass(reverted, HOST_LOST_ATTR);
	assert.match(glass['--dsh-dream-skin-glass-sheen-blend'], /normal/,
		'the old binding really does hand the paper set to a dark skin');
	assert.doesNotMatch(glass['--dsh-dream-skin-glass-sheen-blend'], /screen/);
});

test('#80: the scheme attribute is stamped in the same tick as the stylesheet', () => {
	// The sheet reads the attribute, so the attribute has to be on <html> by
	// the time the sheet is in the DOM. ensureMaterialStyle() is the one
	// function that does both, and it must do them in that order.
	const body = CODE.slice(CODE.indexOf('function ensureMaterialStyle(ctx)'));
	const call = body.indexOf('applySchemeAttr(ctx)');
	const append = body.indexOf('appendChild(el)');
	assert.ok(call > 0, 'ensureMaterialStyle stamps the scheme attribute');
	assert.ok(append > call, 'and does so before the sheet reaches the DOM');
});
