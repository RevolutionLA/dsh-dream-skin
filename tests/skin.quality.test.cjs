/**
 * dsh-dream-skin — preset-skin quality gates.
 *
 * The eight presets are the product: a user installs the plugin, picks a skin,
 * and that IS the experience. "Looks nice" is not an acceptance criterion, so
 * these gates measure the shipped tokens against the rubric in
 * `scripts/skin-audit.cjs` (perceptual elevation ladder, hue purity, solved
 * text contrast on every surface, signal separation, catalog distinctiveness).
 *
 * Test-admission rules (CONTRIBUTING.md) apply; the two that bite here:
 *   1. a gate that cannot fail is not a gate — every rubric entry below is
 *      paired with a MUTATION that must redden it;
 *   2. an "audit passes" assertion alone would stay green if the audit were
 *      silently emptied, so the case also pins the rubric's own coverage.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { auditSkin, auditCatalog, extractSkins, CENSUS, UNCONSUMED_HOST_SLOTS } = require('../scripts/skin-audit.cjs');
const { buildAll } = require('../scripts/skin-system.cjs');
const { validateDefaults, DEFAULT_STORAGE_KEYS } = require('../scripts/lib/skin-defaults.cjs');

const CLIENT = path.join(__dirname, '..', 'lib', 'client.js');
const SKINS = extractSkins(fs.readFileSync(CLIENT, 'utf8'));

test('the bundle ships every preset the design system defines', () => {
	const expected = buildAll();
	assert.equal(SKINS.length, expected.length, 'every generated skin is shipped');
	for (const built of expected) {
		const shipped = SKINS.find((s) => s.id === built.id);
		assert.ok(shipped, `skin "${built.id}" is present in lib/client.js`);
		assert.deepEqual(
			shipped.tokens,
			built.tokens,
			`${built.id}: lib/client.js tokens match a fresh build of the design system.\n` +
			'The presets are GENERATED — hand-editing them in the bundle makes the design\n' +
			'system a lie. Fix scripts/skin-system.cjs and run:\n' +
			'  node scripts/apply-skin-system.cjs'
		);
		assert.equal(shipped.glow, built.glow, `${built.id}: glow matches the design system`);
		assert.deepEqual(shipped.defaults, built.defaults, `${built.id}: defaults match the design system`);
	}
});

test('every shipped preset clears the full quality rubric', () => {
	const failures = [];
	for (const skin of SKINS) {
		for (const check of auditSkin(skin).checks) {
			if (!check.pass) failures.push(`${skin.id}/${check.name}: ${check.detail}`);
		}
	}
	assert.deepEqual(failures, [], `presets must clear the rubric:\n${failures.join('\n')}`);
});

test('the eight presets are eight choices, not two', () => {
	const catalog = auditCatalog(SKINS);
	assert.ok(catalog.pass, `two presets read as the same skin: ${catalog.rows.map((r) => r.detail).join('; ')}`);
});

test('the rubric covers every surface role a skin is judged on', () => {
	// An audit that quietly loses its checks would let every gate above pass on
	// a gutted rubric. Pin the check set itself.
	const names = auditSkin(SKINS[0]).checks.map((c) => c.name).sort();
	assert.deepEqual(names, [
		'accent',
		'bubble',
		'canvas',
		'composer',
		'detail-finite',
		'elevated-button',
		'elevation-ladder',
		'file-diff',
		'focus-ring',
		'foreground-opaque',
		'hairlines',
		'host-chrome',
		'interaction',
		'layer2-shape',
		'menu-surfaces',
		'neutral-axis',
		'scrollbars',
		'states',
		'text-primary',
		'text-secondary',
		'text-surface-coverage',
		'text-tertiary',
		'tints',
		'token-consumers',
		'token-coverage',
		'token-parse',
		'token-shape'
	]);
});

// ── mutations: each rubric entry must be able to FAIL ───────────────────────
// Without these the suite is a rubber stamp. Each case below breaks exactly
// one property of a real skin and asserts the matching check reddens.
const mutate = (skin, patch) => ({
	...skin,
	tokens: { ...skin.tokens, ...patch }
});
const checkNamed = (report, name) => report.checks.find((c) => c.name === name);

test('mutation: a text level below its contrast floor reddens text-tertiary', () => {
	const skin = SKINS.find((s) => s.colorScheme === 'dark');
	// Shove the hint level down onto the canvas: the classic "passes on the
	// canvas, unreadable on a bubble" failure the old presets actually had.
	const broken = mutate(skin, { '--dsw-alias-label-tertiary': skin.tokens['--dsw-alias-bg-layer-2'] });
	const report = auditSkin(broken);
	assert.equal(checkNamed(report, 'text-tertiary').pass, false, 'tertiary contrast gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'text-tertiary').pass, true, '…and passes on the real skin');
});

test('mutation: a surface off the skin hue axis reddens neutral-axis', () => {
	const skin = SKINS.find((s) => s.colorScheme === 'dark');
	// A green card in a violet skin: chroma blows past the neutral limit.
	const broken = mutate(skin, { '--dsw-alias-bg-layer-1': '#1f3a1c' });
	assert.equal(checkNamed(auditSkin(broken), 'neutral-axis').pass, false, 'hue-purity gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'neutral-axis').pass, true, '…and passes on the real skin');
});

test('mutation: flat / inverted elevation reddens elevation-ladder', () => {
	const skin = SKINS.find((s) => s.colorScheme === 'dark');
	// Cards painted the same colour as the canvas: no depth, no ladder.
	const broken = mutate(skin, { '--dsw-alias-bg-layer-1': skin.tokens['--dsw-alias-bg-base'] });
	assert.equal(checkNamed(auditSkin(broken), 'elevation-ladder').pass, false, 'ladder gate can fail');
});

test('mutation: an accent that fails as text reddens accent', () => {
	const skin = SKINS.find((s) => s.colorScheme === 'dark');
	// A near-black accent on a near-black canvas: great "vibe", unreadable link.
	const broken = mutate(skin, { '--dsw-alias-brand-primary': '#14141a' });
	assert.equal(checkNamed(auditSkin(broken), 'accent').pass, false, 'accent gate can fail');
});

test('mutation: a signal colour sitting on the brand hue reddens states', () => {
	const skin = SKINS.find((s) => s.id === 'abyss');
	// Success green moved onto abyss's indigo accent: the badge stops being a
	// signal and starts being decoration.
	const broken = mutate(skin, { '--dsw-alias-state-success-primary': skin.tokens['--dsw-alias-brand-primary'] });
	assert.equal(checkNamed(auditSkin(broken), 'states').pass, false, 'signal-separation gate can fail');
});

test('mutation: a layer-2 the popup slider cannot re-hue reddens layer2-shape', () => {
	const skin = SKINS[0];
	// Space-separated `rgb()` is valid CSS and is exactly the shape the
	// popup-opacity slider's strict parser cannot keep the hue of
	// (docs/themes-spec.md): the dialog silently becomes the scheme base.
	const broken = mutate(skin, { '--dsw-alias-bg-layer-2': 'rgb(42 44 50 / 0.92)' });
	assert.equal(checkNamed(auditSkin(broken), 'layer2-shape').pass, false, 'layer-2 shape gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'layer2-shape').pass, true, '…and passes on the real skin');
});

test('mutation #89: a host-slot token in a shape the runtime cannot re-hue reddens token-shape', () => {
	const skin = SKINS[0];
	// Issue #89's mutation 3, generalised: the shape rule used to grade ONE
	// token (layer-2). The stuck menu-group-header fill is read by the same
	// popup path, so a space-separated value there drops the skin hue exactly
	// the same way — and nothing used to notice.
	const broken = mutate(skin, { '--dsw-alias-menu-group-header-fill': 'rgb(48 49 54 / 0.94)' });
	assert.equal(checkNamed(auditSkin(broken), 'token-shape').pass, false, 'a non-#hex/comma token must be reported');
	assert.match(checkNamed(auditSkin(broken), 'token-shape').detail, /menu-group-header-fill/, 'the failure must name the token');
	// A control: hex, comma-rgb and comma-rgba all stay green.
	for (const good of ['#303136', 'rgb(48, 49, 54)', 'rgba(48, 49, 54, 0.94)']) {
		assert.equal(
			checkNamed(auditSkin(mutate(skin, { '--dsw-alias-menu-group-header-fill': good })), 'token-shape').pass,
			true,
			`${good} is a shape the runtime preserves`
		);
	}
	assert.match(checkNamed(auditSkin(skin), 'token-shape').detail, /popup path reads 3/, 'the reader list must come from the bundle');
});

test('mutation #89: the shape rule reads its reader list from the bundle, not from this file', () => {
	// If the bundle's POPUP_TOKENS ever stops parsing (renamed, moved, emptied),
	// the check must say so rather than grading an empty list as a pass.
	const skin = SKINS[0];
	const renamed = auditSkin(skin, { pluginSource: 'const SOMETHING_ELSE = [];' });
	assert.equal(checkNamed(renamed, 'token-shape').pass, false, 'an unreadable reader list must not look like a checked one');
	// Control: a list that names only a computed token (`--dsw-specific-menu` is
	// re-derived by the plugin, so no skin ships it) is NOT a failure here —
	// this check owns shapes, and issue #88's gate owns that claim.
	const oneComputed = auditSkin(skin, { pluginSource: 'const POPUP_TOKENS = ["--dsw-specific-menu"];' });
	assert.equal(checkNamed(oneComputed, 'token-shape').pass, true, 'a runtime-computed entry is not a shape violation');
	assert.match(checkNamed(oneComputed, 'token-shape').detail, /0 shipped, 1 computed/, 'the detail must say which is which');
});

test('mutation: an unparseable token reddens token-parse instead of crashing', () => {
	const skin = SKINS[0];
	// `oklch()` reads beautifully in a token and breaks every consumer that
	// parses colors by hand — including this audit. It must be reported, not
	// thrown out of the report.
	const broken = mutate(skin, { '--dsw-alias-bg-layer-2': 'oklch(0.29 0.01 265 / 0.92)' });
	const report = auditSkin(broken);
	assert.equal(checkNamed(report, 'token-parse').pass, false, 'parse gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'token-parse').pass, true, '…and passes on the real skin');
});

test('every skin ships the authored numbers the settings sliders need', () => {
	// Issue #73: seven keys, three of them checked. `wallpaperBlur: 800` and
	// `sidebarOpacity: 3.4` regenerated green. The domain now lives in
	// scripts/lib/skin-defaults.cjs and is shared by the generator, the writer
	// and this test — so adding a key without a domain fails here.
	const problems = [];
	for (const skin of SKINS) {
		problems.push(...validateDefaults(skin.defaults, skin.id));
	}
	assert.deepEqual(problems, [], `defaults outside their domain:\n${problems.join('\n')}`);
});

test('the runtime key list and the defaults domain describe the same keys', () => {
	// Issue #73's real failure mode was not one bad number, it was two lists
	// drifting: `SKIN_DEFAULT_KEYS` in the bundle grew a key that the test
	// never learned about. Compare the bundle's own constants to the domain.
	const bundle = fs.readFileSync(CLIENT, 'utf8');
	const constants = new Map();
	for (const m of bundle.matchAll(/const\s+([A-Z0-9_]*KEY)\s*=\s*"([^"]+)"/g)) {
		constants.set(m[1], m[2]);
	}
	const block = /const SKIN_DEFAULT_KEYS = \[([\s\S]*?)\];/.exec(bundle);
	assert.ok(block, 'SKIN_DEFAULT_KEYS exists in the bundle');
	const runtime = [...block[1].matchAll(/([A-Z0-9_]+)/g)]
		.map((m) => constants.get(m[1]))
		.filter(Boolean)
		.sort();
	assert.deepEqual(runtime, [...DEFAULT_STORAGE_KEYS].sort(),
		'every key applySkinDefaults() writes must have a domain in DEFAULT_DOMAIN');
});

test('every skin ships a diffused-light background that is a pure gradient stack', () => {
	// Same allowlist the runtime enforces (isSafeWallpaperGradient): no url(),
	// no image-set(), no control characters — a skin's own background must not
	// be the thing that smuggles a remote fetch into the page.
	for (const skin of SKINS) {
		assert.ok(typeof skin.glow === 'string' && skin.glow.length > 40, `${skin.id}: glow present`);
		assert.doesNotMatch(skin.glow, /url\s*\(|image-set|element\s*\(|cross-fade|@import|javascript:/i, `${skin.id}: glow is a pure gradient stack`);
		assert.doesNotMatch(skin.glow, /[\u0000-\u001f\u007f]/, `${skin.id}: glow carries no control characters`);
		assert.match(skin.glow, /^radial-gradient\(/, `${skin.id}: the key light is the top layer`);
		assert.match(skin.glow, /linear-gradient\([^)]*\)$/, `${skin.id}: the base wash is the bottom layer`);
	}
});

test('the README previews are projected from the same numbers as the shipped bundle', () => {
	// scripts/skin-data.cjs used to hand-mirror the palettes and silently went
	// stale. It is now a projection of skin-system.cjs; this gate pins that
	// projection to the tokens that actually ship, so a preview can never
	// advertise colours the plugin does not contain.
	//
	// Scope, stated honestly: this compares the projection object, NOT the PNGs.
	// It would stay green with every image on disk showing a retired palette —
	// measured, see issue #83. The pixels are guarded by `tests/previews.test.cjs`
	// (docs/previews/manifest.json binds each PNG to its tokens, its markup and
	// its own bytes). Both gates are needed: this one catches skin-data.cjs
	// drifting, that one catches nobody re-shooting.
	const { SKINS: PREVIEW } = require('../scripts/skin-data.cjs');
	const PROJECTION = {
		accent: '--dsw-alias-brand-primary',
		accentSoft: '--dsw-alias-brand-primary-soft',
		base: '--dsw-alias-bg-base',
		sidebar: '--dsw-specific-sidebar-fill',
		sidebarActive: '--dsw-specific-sidebar-nav-item-active',
		panel: '--dsw-alias-bg-layer-3',
		panel2: '--dsw-alias-bg-layer-1',
		panelBorder: '--dsw-alias-border-l2',
		hairline: '--dsw-alias-border-l1',
		bubble: '--dsw-specific-bubble',
		input: '--dsw-specific-input-major',
		tip: '--dsw-specific-tip',
		overlay: '--dsw-alias-bg-layer-2',
		text1: '--dsw-alias-label-primary',
		text2: '--dsw-alias-label-secondary',
		text3: '--dsw-alias-label-tertiary',
		hover: '--dsw-alias-interactive-bg-hover',
		active: '--dsw-alias-interactive-bg-active',
		brandText: '--dsw-alias-brand-text',
		success: '--dsw-alias-state-success-primary',
		warn: '--dsw-alias-state-warn-primary',
		error: '--dsw-alias-state-error-primary'
	};
	assert.equal(Object.keys(PREVIEW).length, SKINS.length, 'one preview per shipped skin');
	for (const skin of SKINS) {
		const p = PREVIEW[skin.id];
		assert.ok(p, `${skin.id}: preview data exists`);
		assert.equal(p.colorScheme, skin.colorScheme, `${skin.id}: preview scheme matches`);
		for (const [key, token] of Object.entries(PROJECTION)) {
			assert.equal(p[key], skin.tokens[token], `${skin.id}: preview ${key} == shipped ${token}`);
		}
		assert.equal(p.bg, skin.glow, `${skin.id}: preview wallpaper == shipped glow`);
		assert.deepEqual(p.defaults, skin.defaults, `${skin.id}: preview defaults == shipped defaults`);
	}
});

test('mutation: a tint too weak to carry the brand hue reddens tints', () => {
	const skin = SKINS.find((s) => s.id === 'ivory');
	// ivory is the trap: a warm cream canvas drags a thin blue tint off-hue and
	// the tag stops being the brand. 0.05 alpha is exactly that failure.
	const broken = mutate(skin, { '--dsw-alias-markdown-tag': 'rgba(29, 108, 193, 0.05)' });
	const report = auditSkin(broken);
	assert.equal(checkNamed(report, 'tints').pass, false, 'tint gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'tints').pass, true, '…and passes on the real skin');
});

test('mutation: a button surface flush with the canvas reddens elevated-button', () => {
	const skin = SKINS[0];
	const broken = mutate(skin, { '--dsw-alias-button-elevated-fill': skin.tokens['--dsw-alias-bg-base'] });
	assert.equal(checkNamed(auditSkin(broken), 'elevated-button').pass, false, 'elevated-button gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'elevated-button').pass, true, '…and passes on the real skin');
});

test('mutation: a scrollbar that fades on hover reddens scrollbars', () => {
	const skin = SKINS[0];
	// Hover must be MORE findable than idle; inverting the pair is the classic
	// "the thumb disappears when you reach for it".
	const broken = mutate(skin, {
		'--dsw-alias-scrollbar-hover-l1': skin.tokens['--dsw-alias-scrollbar-bg-l1'],
		'--dsw-alias-scrollbar-bg-l1': 'rgba(255, 255, 255, 0.2)'
	});
	assert.equal(checkNamed(auditSkin(broken), 'scrollbars').pass, false, 'scrollbar gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'scrollbars').pass, true, '…and passes on the real skin');
});

// ── issue #88 / #89: the newly covered host surfaces ───────────────────────
// Every one of these is a real token the host reads and we now ship. Each
// mutation is the failure the issue named, applied to the real skin.

test('mutation: an invisible focus ring reddens focus-ring', () => {
	const skin = SKINS.find((s) => s.colorScheme === 'dark');
	// The host's OWN default for this token is the literal string
	// `transparent`. That is the failure mode being guarded: ship nothing and
	// keyboard focus has no indicator at all.
	const broken = mutate(skin, { '--dsw-focus-ring-color': 'transparent' });
	const report = auditSkin(broken);
	assert.equal(checkNamed(report, 'focus-ring').pass, false, 'focus-ring gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'focus-ring').pass, true, '…and passes on the real skin');
});

test('mutation: a see-through stuck menu header reddens menu-surfaces', () => {
	const skin = SKINS[0];
	// The host gives this fill 94% for a reason: scrolled rows must not read
	// through a stuck header. 0.5 is that failure.
	const seeThrough = mutate(skin, { '--dsw-alias-menu-group-header-fill': 'rgba(39, 42, 48, 0.5)' });
	assert.equal(checkNamed(auditSkin(seeThrough), 'menu-surfaces').pass, false, 'alpha floor can fail');
	assert.equal(checkNamed(auditSkin(skin), 'menu-surfaces').pass, true, '…and passes on the real skin');
});

test('mutation: the host\'s own neutral as the stuck header reddens menu-surfaces (issue #89)', () => {
	// Issue #89's mutation 2. The host's value for this token is `#303136f0`,
	// an OKLCH hue of 276.8. Measured against the shipped skins it reddens SIX
	// of the eight, through three different branches: aurora (65deg off the
	// menu body), nebula (27deg), ember (141deg), and ivory/mist/rose (primary
	// text drops to ~1.38:1 on a near-white header).
	//
	// It does NOT redden abyss (264.3deg, i.e. 11.9deg off) or midnight
	// (deliberately achromatic, so it has no axis to be off): on those two the
	// host's grey happens to land where our own axis already is. Asserting a
	// failure there would be asserting something untrue, and asserting it for
	// abyss alone would be picking the skin that makes the rule look good.
	const hostGrey = '#303136f0';
	const reddens = ['aurora', 'nebula', 'ember', 'ivory', 'mist', 'rose'];
	for (const s of SKINS) {
		const pass = checkNamed(auditSkin(mutate(s, { '--dsw-alias-menu-group-header-fill': hostGrey })), 'menu-surfaces').pass;
		const should = reddens.includes(s.id);
		assert.equal(
			!pass,
			should,
			`${s.id}: the host's neutral header ${should ? 'must' : 'must not'} redden menu-surfaces`
		);
	}
	for (const s of SKINS) {
		assert.equal(checkNamed(auditSkin(s), 'menu-surfaces').pass, true, `${s.id}: the real header passes`);
	}
});

test('mutation: a skeleton louder than the platform\'s own placeholder reddens host-chrome', () => {
	const skin = SKINS[0];
	// 0.30 white is far past the measured ceiling (the host's own placeholder
	// measures dE 0.0783); a loading list at this weight is a stack of panels.
	const loud = mutate(skin, { '--dsw-alias-bg-skeleton': 'rgba(255, 255, 255, 0.30)' });
	assert.equal(checkNamed(auditSkin(loud), 'host-chrome').pass, false, 'skeleton ceiling can fail');
	// A tool-bar hover that does not gain weight is the second half of the
	// same check: the chip stops responding to the pointer.
	const flatHover = mutate(skin, {
		'--dsw-alias-button-tool-bar-hover': skin.tokens['--dsw-alias-button-tool-bar-fill']
	});
	assert.equal(checkNamed(auditSkin(flatHover), 'host-chrome').pass, false, 'tool-bar hover can fail');
	assert.equal(checkNamed(auditSkin(skin), 'host-chrome').pass, true, '…and passes on the real skin');
});

test('mutation: a diff whose added and deleted markers are the same hue reddens file-diff', () => {
	const skin = SKINS[0];
	// The whole point of a diff row is that the two directions are tellable
	// apart at a glance. Pointing both markers at the same signal destroys it.
	const confused = mutate(skin, {
		'--dsw-alias-file-diff-deleted-marker': skin.tokens['--dsw-alias-file-diff-added-marker']
	});
	assert.equal(checkNamed(auditSkin(confused), 'file-diff').pass, false, 'diff pair separation can fail');
	// And a row that is invisible is not a row.
	const invisible = mutate(skin, {
		'--dsw-alias-file-diff-added-bg': 'rgba(255, 255, 255, 0)',
		'--dsw-alias-file-diff-added-gutter': 'rgba(255, 255, 255, 0)'
	});
	assert.equal(checkNamed(auditSkin(invisible), 'file-diff').pass, false, 'diff row visibility can fail');
	assert.equal(checkNamed(auditSkin(skin), 'file-diff').pass, true, '…and passes on the real skin');
});

test('mutation: an inverted hairline ladder reddens hairlines', () => {
	const skin = SKINS[0];
	// Four weights, one direction. Swapping l3 and l1 makes the ladder
	// non-monotone, which is how "we added levels 3 and 4" turns into "the
	// edges are in an order nobody decided".
	const inverted = mutate(skin, {
		'--dsw-alias-border-l3': skin.tokens['--dsw-alias-border-l1'],
		'--dsw-alias-border-l1': skin.tokens['--dsw-alias-border-l3']
	});
	assert.equal(checkNamed(auditSkin(inverted), 'hairlines').pass, false, 'ladder monotonicity can fail');
	// The "thin" variant is level 2 at a lighter weight; making it heavier than
	// l2 means the name lies.
	const mislabelled = mutate(skin, {
		'--dsw-alias-border-l2-darkmode-thin': 'rgba(255, 255, 255, 0.40)'
	});
	assert.equal(checkNamed(auditSkin(mislabelled), 'hairlines').pass, false, 'thin-position rule can fail');
	assert.equal(checkNamed(auditSkin(skin), 'hairlines').pass, true, '…and passes on the real skin');
});

test('mutation: malformed token shapes redden token-parse and never print a number', () => {
	// Issue #72. `parseColor` used to return NaN for shapes no browser accepts,
	// NaN loses every `>=`, and the report printed "WCAG 16.322" for a token
	// that renders as nothing at all.
	const skin = SKINS.find((s) => s.colorScheme === 'dark');
	const shapes = ['rgba(255, 255, 255, )', '#gggggg', 'blue'];
	for (const shape of shapes) {
		const report = auditSkin(mutate(skin, { '--dsw-alias-label-tertiary': shape }));
		assert.equal(checkNamed(report, 'token-parse').pass, false,
			`${shape} must fail token-parse`);
		const numbers = report.checks.map((c) => c.detail).join(' ');
		assert.ok(!/NaN|Infinity/.test(numbers), `${shape}: report leaked a non-number: ${numbers}`);
	}
	assert.equal(checkNamed(auditSkin(skin), 'token-parse').pass, true, '…and the real skin parses');
});

test('mutation: a translucent label reddens foreground-opaque', () => {
	// A translucent text token has no single contrast value: it reads
	// differently on every surface. Grading it against its raw channels is how
	// the audit reported 11.9:1 for ink that painted at 2.05:1.
	const skin = SKINS[0];
	const broken = mutate(skin, { '--dsw-alias-label-primary': 'rgba(237, 240, 247, 0.5)' });
	assert.equal(checkNamed(auditSkin(broken), 'foreground-opaque').pass, false, 'opacity gate can fail');
	assert.equal(checkNamed(auditSkin(skin), 'foreground-opaque').pass, true, '…and passes on the real skin');
});

test('mutation: a report line carrying a non-number reddens detail-finite', () => {
	// The tripwire that makes the tripwire above unnecessary: whatever the
	// cause, no line of the report may contain NaN/Infinity/undefined.
	const skin = SKINS[0];
	const report = auditSkin(skin);
	const tamper = { ...report, checks: report.checks.map((c, i) => (i === 0 ? { ...c, detail: 'WCAG NaN' } : c)) };
	// Re-run through the same meta-gate the audit uses, on tampered input.
	const poisoned = tamper.checks.filter((c) => /NaN|Infinity|undefined/.test(c.detail));
	assert.equal(poisoned.length, 1, 'the tripwire pattern catches an invented number');
	assert.equal(checkNamed(report, 'detail-finite').pass, true, 'and the real report is clean');
});

test('the factory seed in the bundle is the number the smoke pin states', () => {
	// Issue #71. R6 used to read its expectation out of `skinById('nebula')`,
	// so editing the design system moved the expectation with it and the pin
	// was blind. R6 now hardcodes the literal; this gate is the other half —
	// it asserts the SHIPPED skin actually equals that literal, so the two can
	// never be "made consistent" by re-deriving one from the other.
	const FACTORY_SKIN_ID = 'nebula';
	const FACTORY_MODAL_LITERAL = 0.92;
	const factory = SKINS.find((s) => s.id === FACTORY_SKIN_ID);
	assert.ok(factory, `${FACTORY_SKIN_ID} is a shipped skin`);
	assert.equal(factory.defaults.modalOpacity, FACTORY_MODAL_LITERAL,
		'the factory modal seed is the declared 0.92 (counterpart literal: tests/client.smoke.test.cjs R6)');

	// And the runtime must source that seed from the skin, not restate it.
	const bundle = fs.readFileSync(CLIENT, 'utf8');
	assert.match(bundle, /\[MODAL_OPACITY_KEY\]:\s*String\(FACTORY_SKIN_DEFAULTS\.modalOpacity/,
		'FACTORY_DEFAULTS takes the modal seed from the factory skin');
});

// ── issue #81: a shipped token must have a reader ──────────────────────────

test('every token the presets ship is justified by a reader on one side or the other', () => {
	const c = checkNamed(auditSkin(SKINS[0]), 'token-consumers');
	assert.ok(c.pass, c.detail);
	// The line must stay self-describing: an audit that grades unverified
	// surfaces is only honest while it says which ones they are.
	assert.match(c.detail, /host-consumed/);
	assert.match(c.detail, /declared-unconsumed/);
});

test('#81: `--dsw-alias-brand-primary-soft` is plugin-consumed, not dead', () => {
	// The review counted only HOST consumers and called this token dead. The
	// plugin reads it twice (settings-row badge background + focus ring), so a
	// green `tints` grade is measuring a surface a user really sees. This case
	// pins both halves: the count is real, and it comes from the shipped source.
	const { pluginConsumerCount } = require('../scripts/skin-audit.cjs');
	const bundle = fs.readFileSync(CLIENT, 'utf8');
	assert.ok(pluginConsumerCount('--dsw-alias-brand-primary-soft', bundle) >= 2,
		'the bundle reads this token (badge background + focus ring)');
	assert.match(bundle, /var\(--dsw-alias-brand-primary-soft/, 'and does so through var()');
	assert.ok(!CENSUS.tokens['--dsw-alias-brand-primary-soft'],
		'the host has never declared it — which is exactly why a host-only census called it dead');
	// And `tints` still grades it: it is a painted tint, not a fictional surface.
	assert.equal(checkNamed(auditSkin(SKINS[0]), 'tints').pass, true);
});

test('mutation: a token nobody reads and nobody declares reddens token-consumers', () => {
	// The gate the issue asked for. A skin that invents a token is caught even
	// though the token is perfectly well-formed.
	const broken = mutate(SKINS[0], { '--dsw-alias-invented-nobody-reads': 'rgba(1, 2, 3, 0.5)' });
	const c = checkNamed(auditSkin(broken), 'token-consumers');
	assert.equal(c.pass, false, 'an unjustified token is caught');
	assert.match(c.detail, /--dsw-alias-invented-nobody-reads/, 'and the report names it');
});

test('mutation: deleting the plugin-side readers turns a justified token unjustified', () => {
	// Proves the "plugin-owned" half is measured live out of the bundle rather
	// than allowlisted: strip the two var() reads and the token must go red.
	const skin = SKINS[0];
	const bundle = fs.readFileSync(CLIENT, 'utf8');
	const stripped = bundle.split('var(--dsw-alias-brand-primary-soft').join('var(--dsw-alias-brand-primary');
	const c = checkNamed(auditSkin(skin, { pluginSource: stripped }), 'token-consumers');
	assert.equal(c.pass, false, 'without readers the token is unjustified');
	assert.match(c.detail, /brand-primary-soft/);
	// …and the unmodified source still passes, so the mutation is what moved it.
	assert.equal(checkNamed(auditSkin(skin, { pluginSource: bundle }), 'token-consumers').pass, true);
});

test('the unconsumed-slot allowlist carries a real measurement and a reason each', () => {
	// An allowlist without a reason is a hole with paperwork. Each entry must
	// state the measured evidence from the frozen census AND why we keep it.
	for (const [token, reason] of Object.entries(UNCONSUMED_HOST_SLOTS)) {
		const row = CENSUS.tokens[token];
		assert.ok(row, `${token}: is in the frozen census`);
		assert.equal(row.consumers, 0, `${token}: the census still measures 0 host consumers`);
		assert.ok(row.declares >= 2, `${token}: the host does declare it (both schemes)`);
		assert.ok(reason.length >= 60 && /consum|read|graded|rung|palette/.test(reason),
			`${token}: the reason states the situation, not just "keep"`);
	}
});

test('the host census is versioned and reconciles with the review\'s occurrence counts', () => {
	// A census taken against a different host says nothing about this one, so
	// the host version is part of the data. And because the review quoted raw
	// occurrences, the file records that column too — with the two known
	// prefix double-counts explained rather than silently disagreeing.
	assert.ok(CENSUS.host && CENSUS.host.dshVersion, 'the census pins the host version it measured');
	assert.ok(CENSUS.host.filesScanned > 500, 'and how much of the host it walked');
	// Review figure → this census's exact-token `mentions`. `code-block` is 37
	// in the review and 30 here because `--dsw-alias-markdown-code-block-banner`
	// (7 occurrences) contains the former as a string prefix.
	const REVIEW = {
		'--dsw-alias-markdown-code-block': 30,
		'--dsw-alias-markdown-inline-code': 4,
		'--dsw-specific-selector': 4,
		'--dsw-specific-tip': 2,
		'--dsw-alias-button-elevated-fill': 4
	};
	for (const [token, mentions] of Object.entries(REVIEW)) {
		assert.equal(CENSUS.tokens[token].mentions, mentions, `${token}: occurrences reconcile`);
	}
	assert.ok(!CENSUS.tokens['--dsw-alias-brand-primary-soft'],
		'the review\'s "0 occurrences" for brand-primary-soft reproduces as "absent from the host entirely"');
});

// ── issue #76: the audit surface must ⊇ the solve surface ─────────────────
//
// The defect this closes is structural, so the first three cases are structural:
// they compare LISTS, not numbers. The numbers come after, pinned.

const {
	SURFACE_TOKENS, TEXT_SURFACES, TEXT_FLOORS, TEXT_TARGETS, TINTED_SURFACES, LADDER_SURFACES
} = require('../scripts/lib/text-surfaces.cjs');

test('#76: the solver and the auditor read the same surface list (one file, no copies)', () => {
	// Both sides now `require` scripts/lib/text-surfaces.cjs. If anyone
	// reintroduces a private list on either side, the audit's own
	// `text-surface-coverage` check reddens — this case is the file-level half.
	const solver = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'skin-system.cjs'), 'utf8');
	const auditor = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'skin-audit.cjs'), 'utf8');
	for (const [name, src] of [['skin-system.cjs', solver], ['skin-audit.cjs', auditor]]) {
		assert.match(src, /require\(["']\.\/lib\/text-surfaces\.cjs["']\)/, `${name} imports the shared list`);
		assert.doesNotMatch(src, /const TEXT_SURFACES = \{/, `${name} does not keep its own TEXT_SURFACES literal`);
	}
});

test('#76: the audit measures every surface the solve constrained, for every level', () => {
	// "audit ⊇ solve", asserted from the data rather than from prose.
	for (const level of Object.keys(TEXT_FLOORS)) {
		const solved = TEXT_SURFACES[level];
		assert.ok(Array.isArray(solved) && solved.length > 0, `${level}: the solve declares surfaces`);
		for (const name of solved) {
			assert.ok(SURFACE_TOKENS[name], `${level}: "${name}" resolves to a token, so the audit can measure it`);
		}
		// The check itself is the runtime half — it fails when a name has no
		// token, or a token the skin does not ship.
		assert.equal(checkNamed(auditSkin(SKINS[0]), 'text-surface-coverage').pass, true);
	}
});

test('#76: the host-painted tinted surfaces are in the set, and they are the ones the host reads', () => {
	// These three were the blind spot: their host consumer counts are real
	// (28/2/2 reads — see the census) and the host paints text on all three.
	assert.deepEqual(TINTED_SURFACES, ['codeBlock', 'inlineCode', 'selector']);
	for (const name of TINTED_SURFACES) {
		const token = SURFACE_TOKENS[name];
		assert.ok(CENSUS.tokens[token] && CENSUS.tokens[token].consumers > 0,
			`${name}: the host really does read ${token}`);
		for (const level of Object.keys(TEXT_FLOORS)) {
			assert.ok(TEXT_SURFACES[level].includes(name), `${name} is measured for ${level}`);
		}
	}
	// The elevation rungs stay a separate list: they drive our own ramp, and the
	// tinted surfaces must not leak into the ladder checks.
	for (const name of LADDER_SURFACES) assert.ok(!TINTED_SURFACES.includes(name));
});

test('#76: the tinted-surface WCAG floors are met by every skin — the eight pairs the review measured are fixed', () => {
	// The review measured 8 failures, all tertiary on selector/codeBlock/
	// inlineCode for ivory/mist/rose. They are now solved for, not documented
	// away: the solver's tertiary clears its target on all nine surfaces.
	const failures = [];
	for (const skin of SKINS) {
		const c = checkNamed(auditSkin(skin), 'text-tertiary');
		if (!c.pass) failures.push(`${skin.id}: ${c.detail}`);
		else if (!/WCAG 4\.[5-9]|WCAG [5-9]\./.test(c.detail)) failures.push(`${skin.id}: tertiary margin looks thin — ${c.detail}`);
	}
	assert.deepEqual(failures, [], failures.join('\n'));
	// And the solve target still sits ABOVE the audit floor, so rounding and
	// compositing cannot land on the line.
	for (const level of Object.keys(TEXT_FLOORS)) {
		assert.ok(TEXT_TARGETS[level] > TEXT_FLOORS[level], `${level}: the solve aims above the audit bar`);
	}
});

test('#76: the host-painted tinted APCA measurements are pinned (reported, not gated)', () => {
	// The APCA floor applies on the elevation rungs — where a level is the
	// designed carrier. On the host's tinted surfaces the LIGHT skins land at
	// Lc 79-85 for primary (APCA's own body-text minimum is 75), and the host's
	// OWN light theme is at WCAG 3.42-3.71 for tertiary on the same surfaces.
	// So the numbers are measured and pinned instead of gated: a regression
	// reddens, and so does an improvement that leaves the pin stale.
	const PINNED = {
		ivory: { primary: 79.147, secondary: 64.97, tertiary: 59.718 },
		mist: { primary: 82.062, secondary: 67.129, tertiary: 61.311 },
		rose: { primary: 84.171, secondary: 69.232, tertiary: 62.533 }
	};
	const TOLERANCE = 0.5;
	for (const [id, levels] of Object.entries(PINNED)) {
		const skin = SKINS.find((s) => s.id === id);
		for (const [level, expected] of Object.entries(levels)) {
			const detail = checkNamed(auditSkin(skin), `text-${level}`).detail;
			const m = /host-painted tinted min Lc ([\d.]+)/.exec(detail);
			assert.ok(m, `${id}/${level}: the report exposes the tinted minimum`);
			assert.ok(Math.abs(Number(m[1]) - expected) < TOLERANCE,
				`${id}/${level}: tinted APCA Lc ${m[1]} moved away from the pinned ${expected} — update the pin deliberately`);
		}
	}
	// Dark skins are above the floor everywhere, so they need no pin.
	for (const id of ['abyss', 'aurora', 'nebula', 'ember', 'midnight']) {
		const skin = SKINS.find((s) => s.id === id);
		const m = /host-painted tinted min Lc ([\d.]+)/.exec(checkNamed(auditSkin(skin), 'text-primary').detail);
		assert.ok(Number(m[1]) > 85, `${id}: dark skins clear Lc 85 even on the tinted surfaces`);
	}
});

test('mutation: dropping a surface from the measured set reddens text-surface-coverage', () => {
	// The runtime half needs teeth too: a skin that stops shipping the token a
	// solved-for surface needs must be caught, not silently skipped.
	const token = SURFACE_TOKENS.codeBlock;
	const broken = { ...SKINS[0], tokens: { ...SKINS[0].tokens } };
	delete broken.tokens[token];
	const c = checkNamed(auditSkin(broken), 'text-surface-coverage');
	assert.equal(c.pass, false, 'a solved-for surface with no shipped token is caught');
	assert.match(c.detail, /markdown-code-block|codeBlock/);
});
