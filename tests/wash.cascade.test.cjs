/**
 * dsh-dream-skin — the computed-style gate for issues #96 / #97 / #99.
 *
 * WHY THIS FILE EXISTS. Everything else in this repository grades the sheet as TEXT.
 * The 10.8.0 adversarial review put its finger on the exact hole (A9: "#96's acceptance
 * criterion is a computed `border-radius` of 0, and the gate that shipped checks a
 * declaration string — if the host stops reading the variable, the gate stays green";
 * B4: "the radius declaration has no `!important` and the offline gates cannot see the
 * cascade"; release gate: "the CHANGELOG claims sampling in a real CSS engine while the
 * shipped tree contains no way to recompute that claim"). All three are fair, and this
 * file answers all three: it builds a page out of the SHIPPED sheet and the INSTALLED
 * host's own CSS, asks headless Chrome what the computed values are in three states, and
 * then proves the answer is caused by our declaration by removing exactly that one
 * declaration and re-measuring.
 *
 * The desktop half (#99) is a SECOND page, and the 10.8.1 review round is why it looks the
 * way it does now: the first version graded a shell surface with a color this file invented
 * (F14), started its paint-order walk at the wrong element so an opaque ancestor could hide
 * behind a cleared aside (F9), guarded only two of the four shell declarations it reads
 * (F8), and never proved that the win survives without `!important` (F7). Each of those is
 * now a named case below, and each case was written to be able to fail.
 *
 * Honesty rule borrowed from issue #83 (the preview gate): a missing browser or a missing
 * host install is reported as SKIPPED with its reason — never as a pass — while the pure
 * halves of this file still run everywhere.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

const {
	measure, measureDesktop, buildFixture, buildDesktopFixture, stripDeclaration,
	checkReadings, checkDesktopReadings, cssAlpha, skinTokens, WASH_CHECKS, WASH_GROUPS,
	DESKTOP_SKINS, DESKTOP_SWEEP, DESKTOP_SHELL_CSS, DESKTOP_SHELL_SOURCE, browserAttempts
} = require('../scripts/wash-cascade.cjs');
const { findChrome } = require('../scripts/generate-skin-mockups.cjs');

const browser = findChrome();
let hostError = null;
try { buildFixture(); } catch (e) { hostError = e.message; }
const hostReadable = hostError === null;
// Two independent preconditions, each declared by name in the skip reason. CI has
// neither a browser nor an installed host, so the computed halves skip there.
const RUN = browser.path !== null && hostReadable;
const skipWhy = !browser.path
	? `no headless browser: ${browser.why}`
	: `no installed DSH host to read CSS from: ${hostError}`;

// The desktop page needs the browser AND one declaration read out of the installed
// host, so it gets its own readiness pair rather than borrowing the host fixture's.
let desktopError = null;
try { buildDesktopFixture(); } catch (e) { desktopError = e.message; }
const RUN_DESKTOP = browser.path !== null && desktopError === null;
const desktopSkipWhy = !browser.path
	? `no headless browser: ${browser.why}`
	: `the desktop fixture cannot be built: ${desktopError}`;

// ── the pure halves: run everywhere, including CI ─────────────────────────

test('the probe refuses a fixture that could not fail', () => {
	// The failure mode guarded here is not "the host is missing" — it is subtler. A
	// fixture that omits the rule under test reads the SAME value in every state, so
	// "the wash neutralised the fade" gets "proved" by a page that never painted one.
	// buildFixture therefore requires all three host packages BY NAME and aborts on any.
	assert.throws(
		() => buildFixture({ root: path.join(os.tmpdir(), 'definitely-not-a-dsh-install') }),
		/host (layout|fade|chat) CSS .* unreadable/,
		'a host we cannot read must abort the probe, not silently thin it'
	);
	const err = (() => {
		try { buildFixture({ root: path.join(os.tmpdir(), 'definitely-not-a-dsh-install') }); return ''; }
		catch (e) { return e.message; }
	})();
	assert.match(err, /layout/, `the first missing package has to be named, got: ${err}`);
	// The message must carry the reason the package matters, or a future edit can delete
	// the requirement and the error will read like an environment complaint.
	assert.match(err, /would lose|no longer/, `the error has to say what thins, got: ${err}`);
});

test('stripDeclaration removes one declaration and nothing else', () => {
	// The mutation half below depends on this helper cutting exactly ONE line out of the
	// shipped sheet. Sloppy here means the "the gate can fail" evidence measures the
	// helper rather than the CSS.
	const css = 'html[a][b] div:has(> [c]) {\n  background-color: transparent !important;\n  --dsh-windows-content-radius: 0px !important;\n}';
	const stripped = stripDeclaration(css, '--dsh-windows-content-radius');
	assert.ok(!stripped.includes('--dsh-windows-content-radius'), 'the declaration is gone');
	assert.ok(stripped.includes('background-color: transparent !important'), 'its sibling survives');
	assert.ok(stripped.includes('div:has(> [c])'), 'the selector survives');
	// A property that is not there is an error, not a silent no-op: the alternative is a
	// mutation test that measures an unchanged sheet and reports success.
	assert.throws(() => stripDeclaration(css, '--never-authored'), /nothing was mutated/);
});

test('the browser half attempts every installed engine and never ignores CHROME_PATH', () => {
	// WHY THIS IS A CASE AND NOT A DETAIL. The 10.8.1 review round could not run this gate at
	// all on the machine that ships it: one candidate path, one `EBUSY` at spawn, and the whole
	// computed-style verdict became second-hand evidence. Two behaviours are pinned here: every
	// engine that exists gets attempted, and an explicit CHROME_PATH is AUTHORITATIVE — falling
	// through to "whatever else is installed" is the failure mode issue #83 named, because the
	// reading would then come from an engine nobody asked for.
	const bogus = path.join(os.tmpdir(), 'definitely-not-a-browser');
	const real = process.execPath; // any existing executable works: this case is about SELECTION
	const auto = browserAttempts({}, [bogus, real, path.join(os.tmpdir(), 'nor-here')]);
	assert.deepEqual(auto.list, [real], 'only engines that exist are attempted, in candidate order');
	assert.equal(auto.why, 'auto-detected');
	assert.deepEqual(browserAttempts({ CHROME_PATH: real }, [bogus]).list, [real],
		'CHROME_PATH is used even when it is not in the candidate list');
	const refused = browserAttempts({ CHROME_PATH: bogus }, [real, bogus]);
	assert.deepEqual(refused.list, [], 'a named browser that does not exist is a refusal, NOT a fallback to another engine');
	assert.match(refused.why, /CHROME_PATH is set/);
	assert.deepEqual(browserAttempts({}, [bogus, path.join(os.tmpdir(), 'nor-here')]).list, [],
		'nothing installed still resolves to an empty attempt list');
	// The refusal has to reach the caller as "did not run": the CLI exits 1 on it and the live
	// cases skip with the reason. Neither may be an empty pass.
	const nope = measure({ parts: { layout: '', fade: '', chat: '', material: '' }, env: { CHROME_PATH: bogus } });
	assert.equal(nope.ran, false, 'no browser is reported as not-ran, never as a page that graded nothing');
	assert.match(nope.why, /CHROME_PATH is set/);
});

test('the verdict table claims every reading, and each claim is in a named issue group', () => {
	// checkReadings is now the single source of the expected numbers (the CLI and both
	// live tests grade it). That only helps if no check can fall between the two groups:
	// an unclaimed id would be graded by `npm run wash:check` and by NEITHER test — the
	// split-brain this table exists to prevent, in a new costume.
	const groups = [...new Set(WASH_CHECKS.map((c) => c.group))].sort();
	assert.deepEqual(groups, [...WASH_GROUPS].sort(), 'every declared group has a check, and every check sits in a declared group');
	assert.deepEqual(groups, ['corner', 'desktop', 'fade'], 'the groups are #96 (corner), #97 (fade) and #99 (desktop) — a new issue adds a group HERE');
	for (const check of WASH_CHECKS) {
		assert.ok(WASH_GROUPS.includes(check.group), `${check.id} claims an unknown group ${check.group}`);
		assert.ok(typeof check.ok === 'function' && check.msg, `${check.id} needs both a predicate and a message`);
	}
	// The two fixtures sample different field names, so a group must never be run
	// against the wrong page: checkReadings refuses an unknown group outright.
	assert.match(checkReadings([{}, {}, {}], ['no-such-group'])[0], /unknown check group/);
	assert.match(checkReadings([{}, {}, {}], ['desktop'])[0], /^desktop-underlay-painted:/,
		'a desktop check run on readings that lack the field reports the mismatch instead of passing');
	assert.match(checkReadings([{}, {}, {}], ['desktop'])[0], /readings \[\{\},\{\},\{\}\]\)/,
		'the diagnostic names what was actually sampled, so a wrong-page run is readable rather than mysterious');
});

test('the desktop fixture refuses a page that could not fail', () => {
	// Same rule as buildFixture: a fixture that quietly lost the declaration under test
	// reads the same value in every state and "proves" the fix with a check that cannot
	// fail. The desktop page's non-collateral half depends on the host really reading
	// --dsw-specific-sidebar-fill, so a host we cannot read must abort, not thin.
	assert.throws(
		() => buildDesktopFixture({ root: path.join(os.tmpdir(), 'definitely-not-a-dsh-install') }),
		/no declaration reading --dsw-specific-sidebar-fill|could no longer fail/,
		'a host we cannot read has to stop the desktop probe'
	);
	// F8: the shell side is a pinned SNAPSHOT (third-party plugin, no local install to read),
	// so the snapshot guards the declarations the verdict reads. The guard is shown by
	// HANDING IT A TRIMMED COPY — an assertion that the shipped text contains the needle would
	// still pass if the guard itself were deleted, which is the difference between a gate and
	// a description of one.
	for (const trim of [
		[/--dsw-specific-sidebar-fill: var\(--dsw-alias-bg-layer-1\); /, 'the off-branch token re-declaration (#55)'],
		[/\.dshDesktopSidebarSurface \{ --dsw-specific-sidebar-fill: transparent; /, 'the base rule the inherit fix outranks'],
		[/\.dshDesktopFrame \{[^}]*\}/, 'the frame the chain walk passes through'],
		[/\.dshDesktopFrame\[data-desktop-mode="advanced"\]\[data-desktop-platform="win32"\] \.dshDesktopSidebarSurface \{ grid-row: 1 \/ -1; \}/, 'the Windows full-height strip']
	]) {
		const trimmed = DESKTOP_SHELL_CSS.replace(trim[0], '');
		assert.notEqual(trimmed, DESKTOP_SHELL_CSS, `the trim for ${trim[1]} has to actually remove something`);
		assert.throws(() => buildDesktopFixture({ shell: trimmed, consumer: 'background: var(--dsw-specific-sidebar-fill)' }),
			/shell snapshot lost/,
			`losing ${trim[1]} must stop the probe instead of quietly grading a page that cannot fail`);
	}
	// The provenance is part of the guard: a snapshot nobody can re-fetch is a rumor.
	assert.ok(DESKTOP_SHELL_SOURCE.includes('v2.0.17') && DESKTOP_SHELL_SOURCE.includes('styles.ts'),
		`the snapshot has to name where it came from, got: ${DESKTOP_SHELL_SOURCE}`);
});

test('checkReadings is falsifiable, and reads the state each check means', () => {
	// The whole point of giving `npm run wash:check` an exit code is that it CAN fail, so
	// the checker gets its own negative cases — synthetic readings, which is exactly what
	// lets them run in CI where the browser half skips.
	//
	// The pair is deliberate: one fixture where only the WASH state is wrong, one where only
	// the PLAIN state is. A predicate written as `ok: (w) => …` really receives the plain
	// sample (the call passes plain/wash/again positionally), and that bug is invisible if
	// both fixtures are uniform. Split the two halves and the arg order is pinned.
	const UNWASHED = { corner: '16px', frameFill: 'rgba(16, 16, 24, 0.75)', fadeBg: 'linear-gradient(a, b)', chatMask: 'linear-gradient(c)' };
	const WASHED = { corner: '0px', frameFill: 'rgba(0, 0, 0, 0)', fadeBg: 'none', chatMask: 'linear-gradient(c)' };
	const HOST_GROUPS = ['corner', 'fade'];
	const ids = (problems) => problems.map((p) => p.split(':')[0]).sort();

	assert.deepEqual(ids(checkReadings([UNWASHED, UNWASHED, UNWASHED], HOST_GROUPS)),
		['corner-flattened', 'fade-neutralised', 'frame-fill-dropped'],
		'a wash that changes nothing must report exactly the three wash-side checks');

	assert.deepEqual(ids(checkReadings([WASHED, WASHED, UNWASHED], HOST_GROUPS)),
		['corner-host-own', 'fade-paints', 'frame-fill-kept'],
		'a plain state that already looks washed must report the three plain-side checks instead — and proves no wash check is quietly reading the plain sample');

	// The restore half is its own sample: if `washed-again` is not read, a rule that
	// permanently restyles the host would pass as "the wash works".
	assert.deepEqual(ids(checkReadings([UNWASHED, WASHED, WASHED], HOST_GROUPS)), ['corner-restored'],
		'a corner stuck at 0px after the wash leaves is the only new complaint');
	assert.deepEqual(checkReadings([UNWASHED, WASHED, UNWASHED], HOST_GROUPS), [], 'the healthy trio reads no problems at all');
	assert.deepEqual(checkReadings([]), ['expected the three states plain/wash/washed-again, got 0'],
		'a short sampling is a problem, not an empty pass');

	// F12 (adversarial review 10.8.1): the group list is the caller's way of saying WHICH
	// page it measured. An omitted or empty list used to run zero checks and return "no
	// problems", so a caller that forgot the argument handed a green grade to a page nobody
	// graded — and the CLI printed `wash cascade OK`.
	assert.match(checkReadings([UNWASHED, WASHED, UNWASHED])[0], /NON-EMPTY ARRAY/,
		'no groups argument is a caller bug, not a verdict');
	assert.match(checkReadings([UNWASHED, WASHED, UNWASHED], [])[0], /NON-EMPTY ARRAY/,
		'an empty group list selects zero checks, which must not read as a pass');
	assert.match(checkReadings([UNWASHED, WASHED, UNWASHED], 'corner')[0], /NON-EMPTY ARRAY/,
		'the legacy single-string form is rejected too — silently ignoring it would grade nothing');
});

// ── the desktop verdict: same discipline, per skin ────────────────────────

const BUNDLE = require('fs').readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');

/**
 * A synthetic desktop trio built from the skin's OWN tokens, never from a color typed into
 * this file. `cssAlpha` and the check table read the same strings the engine would, so the
 * opaque-skin and translucent-skin shapes both come out of the shipped bundle rather than
 * out of the author's memory (review finding F14: the first version asserted
 * `rgba(30, 27, 44, 0.96)`, a value only this file believed).
 */
function desktopTrio(skin, o = {}) {
	const t = skinTokens(BUNDLE, skin);
	const layer1 = t['--dsw-alias-bg-layer-1'];
	const fill = t['--dsw-specific-sidebar-fill'];
	// What an opaque page's paint-order walk finds, derived from the skin's own fill rather
	// than written out: an opaque aside IS the blocker, a translucent one is not.
	const chain = cssAlpha(layer1) >= 0.999 ? 'dshDesktopSidebarSurface' : '';
	const paintedPlain = o.plainPainted !== false;
	const paintedWash = paintedPlain && o.cleared === false;
	const paintedAgain = o.noRestore ? false : paintedPlain;
	const row = (state, painted, blockers) => ({
		state,
		skin,
		layer1Css: layer1,
		surfaceBg: painted ? layer1 : 'rgba(0, 0, 0, 0)',
		surfaceFill: o.shadowed ? layer1 : fill,
		borderRight: o.border === undefined ? '1px solid' : o.border,
		sidebarBg: o.shadowed ? layer1 : fill,
		blockers: (blockers === undefined ? (painted ? chain : '') : blockers),
		hit: o.hit || 'upstream-sidebar',
		sweepBg: o.sweepFrozen ? layer1 : DESKTOP_SWEEP,
		sweepAside: painted ? layer1 : 'rgba(0, 0, 0, 0)'
	});
	return [
		row('plain', paintedPlain, o.plainBlockers),
		row('wash', paintedWash, o.washBlockers),
		row('washed-again', paintedAgain, o.againBlockers)
	];
}

test('the desktop verdict is falsifiable, per skin, and each claim names one failure mode', () => {
	const ids = (problems) => problems.map((p) => p.split(':')[0]).sort();
	for (const skin of DESKTOP_SKINS) {
		assert.deepEqual(ids(checkReadings(desktopTrio(skin), ['desktop'])), [],
			`the healthy trio reads no problems for ${skin}`);
	}

	// The bug the issue reports: the shell keeps its opaque paint through the wash.
	assert.deepEqual(ids(checkReadings(desktopTrio('abyss', { cleared: false }), ['desktop'])),
		['desktop-underlay-cleared', 'desktop-wash-path-clear'].sort(),
		'a shell that keeps its underlay through the wash is named by exactly the two checks that mean it '
		+ '(the restore check compares again-vs-plain, so a page that never changed would pass it — that is why the cleared check exists on its own)');

	// The opposite direction: a plugin that clears the shell paint WITHOUT a wash, permanently.
	assert.deepEqual(ids(checkReadings(desktopTrio('abyss', { plainPainted: false }), ['desktop'])),
		['desktop-chain-walk-correct', 'desktop-no-wash-no-touch', 'desktop-underlay-blocks', 'desktop-underlay-painted'].sort(),
		'a paint that never comes back is caught on the plain side by all four plain-state claims, not by one');

	// A rule that clears the paint but never gives it back — "the wash works" would read green
	// on a plugin that permanently restyles the shell, so the restore claim needs its own red.
	assert.deepEqual(ids(checkReadings(desktopTrio('abyss', { noRestore: true }), ['desktop'])),
		['desktop-underlay-restored'], 'the shell getting its own paint back is a claim of its own');

	// Collateral: clearing the paint but eating the shell's own border.
	assert.deepEqual(ids(checkReadings(desktopTrio('abyss', { border: '0px none' }), ['desktop'])),
		['desktop-shell-chrome-kept'], 'the border is its own failure, not a passing line');

	// F9: the aside cleared while an ANCESTOR still paints opaque — "cleared" would otherwise
	// read as success with the wallpaper still invisible.
	assert.deepEqual(ids(checkReadings(desktopTrio('abyss', { washBlockers: 'root' }), ['desktop'])),
		['desktop-wash-path-clear'], 'an opaque ancestor behind a cleared aside is exactly what the chain walk is for');

	// The fixture's own guard: if the wallpaper layer sits ON TOP of the sidebar the whole
	// "reveal" story is moot, so `hit` has to be the sidebar.
	assert.deepEqual(ids(checkReadings(desktopTrio('abyss', { hit: 'dsh-wash-layer' }), ['desktop'])),
		['desktop-wash-path-clear'], 'a page where the wallpaper covers the sidebar cannot be scored as a reveal');

	// The #55 regression: the shell's shadow value wins again, so the token neither reaches
	// the sidebar nor responds to a sweep. Two ids, because that is two claims.
	assert.deepEqual(ids(checkReadings(desktopTrio('abyss', { shadowed: true, sweepFrozen: true }), ['desktop'])),
		['desktop-token-path-alive', 'desktop-token-sweeps-slider'].sort(),
		'a frozen token path is the reporter\'s own sentence — "the slider moves and nothing changes" — and it must not be able to pass');

	// The translucent-skin shape: its underlay is only partly opaque, so the chain walk cannot
	// claim an opaque blocker; the alpha-based checks are what carry this skin.
	const mist = desktopTrio('mist');
	assert.equal(cssAlpha(mist[0].surfaceBg) < 0.999, true, 'mist must be the translucent half of the pair, or the two-skin claim is vacuous');
	assert.deepEqual(ids(checkReadings(mist, ['desktop'])), [], 'the fix holds on a skin whose layer-1 is not opaque either');
});

test('the desktop grader refuses a run that lost a skin or invented one', () => {
	// One `measureDesktop()` run emits three states PER SKIN. Without a per-skin grader, a
	// crash in the second skin would leave the first skin's readings to be graded as if the
	// whole matrix had run — the "silently thinner fixture" failure mode buildFixture guards
	// against, in the multi-run direction.
	const oneSkin = desktopTrio(DESKTOP_SKINS[0]);
	const lost = checkDesktopReadings(oneSkin).filter((p) => /produced no readings/.test(p));
	assert.equal(lost.length, DESKTOP_SKINS.length - 1,
		'every skin that produced no readings is named, and only those');
	assert.match(lost[0], /produced no readings at all/);
	const both = DESKTOP_SKINS.map((s) => desktopTrio(s, { hit: 'nope' })).flat();
	const problems = checkDesktopReadings(both);
	assert.equal(problems.length, DESKTOP_SKINS.length, 'each broken skin reports once, prefixed with its own skin');
	assert.ok(problems.every((p) => /^desktop\[[a-z0-9-]+\]/.test(p)),
		`a per-skin problem has to say which skin: ${problems.join(' | ').slice(0, 160)}`);
	// A skin the table does not declare is a disagreement, not an extra pass. The row is a
	// COPY of a real skin's readings with the label changed, because `skinTokens` would (and
	// does, above) refuse to invent a skin the bundle does not ship.
	const stranger = [...oneSkin, ...oneSkin.map((r) => ({ ...r, skin: 'nota-cluster-not-shipped' }))];
	assert.ok(checkDesktopReadings(stranger).some((p) => /unexpected skin/.test(p)),
		'a skin outside the declared list is a disagreement between the table and the fixture');
});

test('the desktop fixture reads its colors out of the bundle, and refuses to invent them', () => {
	// F14's root cause was a color this file typed. `skinTokens` is the only way the desktop
	// page gets a color at all, so its own refusals are the gate.
	assert.throws(() => skinTokens(BUNDLE, 'not-a-skin'), /is not in the shipped bundle/);
	for (const skin of DESKTOP_SKINS) {
		const t = skinTokens(BUNDLE, skin);
		for (const need of ['--dsw-alias-bg-layer-1', '--dsw-alias-border-l1', '--dsw-specific-sidebar-fill']) {
			assert.ok(t[need], `${skin} has no ${need} to measure`);
		}
	}
	// The pair must actually be a pair: one opaque layer-1 and one not. Two opaque skins would
	// let a bug that only bites translucent fills through while every check stayed green.
	const alphas = DESKTOP_SKINS.map((s) => cssAlpha(skinTokens(BUNDLE, s)['--dsw-alias-bg-layer-1']));
	assert.ok(alphas.some((a) => a >= 0.999) && alphas.some((a) => a < 0.999),
		`the two skins must cover both fill shapes, got alphas ${alphas.join('/')}`);
});

test('the shell snapshot guards every declaration the desktop checks read', () => {
	// F8: the first guard only looked for the class name and the `off` branch, so deleting the
	// shell's token re-declaration from the copy left a page that still claimed to prove the
	// #55 half. Each needle below is one the verdict reads, and the guard is what makes the
	// fixture refuse rather than silently grade a page that never painted anything.
	assert.match(buildDesktopFixture().material, /dshDesktopSidebarSurface/, 'the shipped sheet targets the shell surface');
	for (const needle of [
		'.dshDesktopSidebarSurface { --dsw-specific-sidebar-fill: transparent;',
		'--dsw-specific-sidebar-fill: var(--dsw-alias-bg-layer-1); background: var(--dsw-alias-bg-layer-1);',
		'.dshDesktopFrame { position: relative; display: grid;',
		'[data-desktop-platform="win32"] .dshDesktopSidebarSurface { grid-row: 1 / -1; }'
	]) {
		assert.ok(DESKTOP_SHELL_CSS.includes(needle), `the snapshot must keep ${needle.slice(0, 44)}`);
	}
	// The provenance string is part of the guard: a snapshot nobody can re-fetch is a rumor.
	assert.match(DESKTOP_SHELL_SOURCE, /v2\.0\.17/, 'the tag is named');
	assert.match(DESKTOP_SHELL_SOURCE, /styles\.ts:13,14,22,23,24,38/, 'and the exact lines the copy came from');
});

// ── the computed halves: need a browser AND an installed host ─────────────

test('a real CSS engine flattens the Windows content corner under a wash', { skip: RUN ? false : skipWhy }, () => {
	const r = measure();
	assert.ok(!r.error, `the probe produced no readings: ${r.error}\n${(r.dom || '').slice(0, 300)}`);
	assert.deepEqual(r.readings.map((x) => x.state), ['plain', 'wash', 'washed-again'], 'all three states sampled');
	// #96 in computed values instead of in a declaration string — the acceptance
	// criterion the issue itself asked for. The numbers themselves live in WASH_CHECKS so
	// `npm run wash:check` and this test cannot drift apart; the group filter keeps the
	// two named tests aimed at their own issue.
	assert.deepEqual(checkReadings(r.readings, ['corner']), [], 'issue #96: the corner must flatten under a wash and come back without one');
});

test('the hash-free anchor neutralises the real host fade while chat masks survive', { skip: RUN ? false : skipWhy }, () => {
	// #97, against the hash the INSTALLED host actually ships (`bhn1Oq_fade`) rather than
	// the retired `qDHVXG_fade` the old rule named: painted without a wash, gone with one —
	// while the chat package's scroll masks (the "there is more content" affordance) are
	// untouched, which is the non-collateral claim, read off the engine rather than
	// inferred from the selector text.
	assert.deepEqual(checkReadings(measure().readings, ['fade']), [], 'issue #97: the band goes under a wash, the chat masks never do');
});

test('the desktop page clears the shell underlay only while the wallpaper is up', { skip: RUN_DESKTOP ? false : desktopSkipWhy }, () => {
	// Issue #99 in computed values, once per skin. The engine answers the questions a string
	// test cannot: does our wash-gated longhand (`background-color`, with !important) beat the
	// shell's shorthand (`background: var(--dsw-alias-bg-layer-1)`), does anything opaque stay
	// in the chain from the aside up to the page background, and does the clear leave the
	// shell's border and the sidebar token path standing? All of it lives in one check group so
	// this test fails if any half drifts, and the per-skin grader fails if a skin drifts away.
	const r = measureDesktop();
	assert.ok(!r.error, `the desktop probe produced no readings: ${r.error}\n${(r.dom || '').slice(0, 300)}`);
	assert.equal(r.readings.length, DESKTOP_SKINS.length * 3,
		'three states for every skin the fixture claims to measure');
	assert.deepEqual(checkDesktopReadings(r.readings), [],
		'issue #99: the shell underlay leaves for the wash and comes back without it, on both skins');
});

test('mutation: without the wash-gated rule the shell underlay eats the slider again', { skip: RUN_DESKTOP ? false : desktopSkipWhy }, () => {
	// The proof that the transparency above was our doing and not the shell's own base rule.
	// Delete ONLY the new rule — the #55 token fix has to stay in the mutated sheet, because
	// the interesting failure mode is "the token is right but the paint hides it", which is
	// exactly what the reporter sees on Windows, where the material cannot be anything but
	// off (v2.0.17 environment.ts:24, 51-53, 58 and 61).
	const parts = buildDesktopFixture();
	const material = parts.material.replace(/html\[data-dsh-dream-skin-wash\][^{}]*dshDesktopSidebarSurface[^{]*\{[^}]*\}/g, '');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	assert.ok(!/html\[data-dsh-dream-skin-wash\][^{]*dshDesktopSidebarSurface/.test(material), 'the underlay rule really went away');
	assert.match(material, /\.dshDesktopSidebarSurface\s*\{[^}]*--dsw-specific-sidebar-fill:\s*inherit\s*!important/,
		'the #55 token fix is still in the mutated sheet — this mutation isolates the paint only');
	const r = measureDesktop({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated desktop probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	// No color is written here: the mutated page must read back the SAME value the off-screen
	// reference element computes from `--dsw-alias-bg-layer-1`, which is the shell's own paint.
	assert.equal(wash.surfaceBg, wash.layer1Css,
		'without our rule the shell keeps painting its own layer-1 through the wash — that IS issue #99');
	assert.notEqual(wash.surfaceBg, 'rgba(0, 0, 0, 0)', 'and the column is not transparent');
	assert.ok(wash.blockers.includes('dshDesktopSidebarSurface') || cssAlpha(wash.surfaceBg) < 0.999,
		'the chain walk has to agree with the paint it is judging');
	const plain = r.readings.find((x) => x.state === 'plain');
	assert.equal(wash.sidebarBg, plain.sidebarBg, 'and the token path is unchanged: the bug is the underlay, not the token');
});

test('mutation: the win over the shell depends on !important, exactly as documented', { skip: RUN_DESKTOP ? false : desktopSkipWhy }, () => {
	// F7 (adversarial review 10.8.1). The comment in `lib/client.js` says our selector is
	// LESS specific than the shell's (`(0,2,1)` against `(0,3,1)`), so `!important` is not
	// decoration — it is the only reason the paint loses. A claim about a cascade is a
	// hypothesis until something breaks it: drop the flag from this ONE declaration, leave the
	// selector and the value alone, and the shell's shorthand must win again. If this test ever
	// goes green with the flag removed, the comment above the rule is wrong and the specificity
	// arithmetic has to be re-measured before anyone repeats it.
	const parts = buildDesktopFixture();
	const material = parts.material.replace(
		/(html\[data-dsh-dream-skin-wash\][^{]*dshDesktopSidebarSurface[^{]*\{[^}]*background-color:\s*transparent)\s*!important/,
		'$1');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	assert.match(material, /dshDesktopSidebarSurface[^{]*\{[^}]*background-color: transparent;\s*\}/,
		'the declaration is still there, only unflagged');
	const r = measureDesktop({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated desktop probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.equal(wash.surfaceBg, wash.layer1Css,
		'without !important the shell (0,3,1) outranks us (0,2,1) and repaints the column — the fix is the flag, not the selector');
});

test('mutation: the same engine proves the readings are caused by our declaration', { skip: RUN ? false : skipWhy }, () => {
	// A computed-style gate nobody has broken is still a hypothesis. Take ONE declaration
	// out of the shipped sheet and re-run the identical fixture: if the corner survives the
	// wash, then the 0px above really was our doing.
	const parts = buildFixture();
	const mutated = { ...parts, material: stripDeclaration(parts.material, '--dsh-windows-content-radius') };
	assert.notEqual(mutated.material, parts.material, 'the mutation must change the sheet');
	const r = measure({ parts: mutated });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.equal(wash.corner, '16px', 'without our declaration the host corner survives the wash');
	// And the fade half must STILL be neutralised — the two fixes are independent, so a
	// mutation aimed at one must not disturb the other.
	assert.equal(wash.fadeBg, 'none', 'removing the radius line does not touch the fade neutralisation');
});

test('mutation: removing the fade rule brings the band back in the same engine', { skip: RUN ? false : skipWhy }, () => {
	// The symmetric proof for #97: without the wash-gated `[class$="_fade"]` block the
	// host gradient paints under a wallpaper too — which is precisely what the sheet used
	// to do invisibly. Written as a second mutation rather than folded into the one above,
	// so a failure here cannot be masked by an earlier assertion.
	const parts = buildFixture();
	// The extracted sheet is already concatenated CSS, so the mutation removes the RULE
	// whose selector carries the hash-free anchor — both branches of it, since they share
	// one declaration block.
	const material = parts.material.replace(/html\[data-dsh-dream-skin-wash\][^{}]*_fade[^{]*\{[^}]*\}/g, '');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	assert.ok(!/\[class\$="_fade"\]/.test(material), 'the hash-free rule really went away');
	const r = measure({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.match(wash.fadeBg, /linear-gradient/, 'without the hash-free rule the band survives the wash — so the `none` above was our rule');
});
