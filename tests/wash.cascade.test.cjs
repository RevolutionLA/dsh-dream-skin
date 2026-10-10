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
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
	measure, measureDesktop, buildFixture, buildDesktopFixture, stripDeclaration, fixtureHtml,
	checkReadings, checkDesktopReadings, cssAlpha, skinTokens, WASH_CHECKS, WASH_GROUPS,
	DESKTOP_SKINS, DESKTOP_SWEEP, DESKTOP_SHELL_CSS, DESKTOP_SHELL_SOURCE, browserAttempts,
	probeBrowser, gradeStage, runChrome, environmentError,
	measureCoexist, buildCoexistFixture, checkCoexistReadings, COEXIST_CHECKS,
	hostFadeClasses, hostLayoutClasses, pluginFadeRule, SKIN_CENTER_PKG,
	cornerTokens, cssColor, CORNER_SKIN, CORNER_ALPHA
} = require('../scripts/wash-cascade.cjs');

// Issue #102: "a browser binary exists" is NOT "an engine can be run here". The review
// machine had Chrome installed and could not spawn it (EBUSY on every attempt, node's own
// child_process included), and the old precondition keyed off the path — so 7 computed
// cases went RED and read exactly like the cascade having broken. The probe starts one
// throwaway page and reports the truth; a machine that cannot run these cases SKIPS them
// with the reason named, which is a different thing from passing and from failing.
const engine = probeBrowser();
let hostError = null;
let hostEnvironment = false;
try { buildFixture(); } catch (e) { hostError = e.message; hostEnvironment = !!e.environment; }
// Two independent preconditions, each declared by name in the skip reason. CI has
// neither a browser nor an installed host, so the computed halves skip there.
const RUN = engine.ran && !hostEnvironment;
const skipWhy = !engine.ran
	? `no headless browser usable here: ${engine.why}`
	: `no installed DSH host to read CSS from: ${hostError}`;

// The desktop page needs the browser AND one declaration read out of the installed
// host, so it gets its own readiness pair rather than borrowing the host fixture's.
let desktopError = null;
let desktopEnvironment = false;
try { buildDesktopFixture(); } catch (e) { desktopError = e.message; desktopEnvironment = !!e.environment; }
const RUN_DESKTOP = engine.ran && !desktopEnvironment;
const desktopSkipWhy = !engine.ran
	? `no headless browser usable here: ${engine.why}`
	: `the desktop fixture cannot be built here: ${desktopError}`;

// The coexistence page (issue #105) needs a THIRD thing: the other plugin installed. Its
// absence is an environment skip with the reason named — never a silent "nobody else
// addresses _fade", which is the sentence the census exists to make measurable.
let coexistError = null;
let coexistEnvironment = false;
try {
	buildCoexistFixture();
	// T1 (third-party 10.9.0): the precondition has to include the THIRD-PARTY rule, not just
	// the host parts. `buildCoexistFixture()` never touches the other plugin, so a machine
	// with a browser and a host but WITHOUT skin-center passed the check and then threw inside
	// the live cases — red where the honest answer is "this machine cannot measure it".
	pluginFadeRule();
} catch (e) {
	coexistError = e.message;
	coexistEnvironment = !!e.environment;
}
const RUN_COEXIST = engine.ran && !coexistEnvironment;
const coexistSkipWhy = !engine.ran
	? `no headless browser usable here: ${engine.why}`
	: `the coexistence fixture cannot be built here: ${coexistError}`;

// Blue-team B3: the CLI case below used to signal its own environment skip by RETURNING a
// string — and `node:test` treats a returned value as a PASS, so on a machine that cannot
// spawn node at all the exit-code contract silently went green. The preconditions an option
// skip needs are computed here, at collection time, where they can actually skip.
const selfSpawn = require('node:child_process').spawnSync(process.execPath, ['--version'], { timeout: 30000 });
const SELF_SPAWN_OK = !selfSpawn.error && selfSpawn.status === 0;
const selfSpawnWhy = `cannot spawn node here (${(selfSpawn.error && selfSpawn.error.code) || 'status ' + selfSpawn.status}) — the exit-code contract fits the 10.9.0 (#102) environment state and stays UNVERIFIED on this box`;

// ── the pure halves: run everywhere, including CI ─────────────────────────

test('issue #102 (blue-team B4): "no host here" and "the host renamed a package" part ways', () => {
	// The first split keyed off the ONE package's file: a host that renamed
	// `dsh-client-ui-layout` therefore read as "no host installed" and the whole stage
	// SKIPPED — a real drift hiding inside an environment excuse. Two directories, one
	// expectation each.
	const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-empty-'));
	const populated = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-populated-'));
	try {
		const envErr = (() => { try { buildFixture({ root: empty }); return null; } catch (e) { return e; } })();
		assert.ok(envErr, 'an empty root must refuse to build');
		assert.equal(!!envErr.environment, true, 'an empty root is an ENVIRONMENT skip — there is nothing to read');
		// A root with other packages but not ours: the install is here, the package is not.
		fs.mkdirSync(path.join(populated, 'dsh-client-ui-chat'), { recursive: true });
		const claimErr = (() => { try { buildFixture({ root: populated }); return null; } catch (e) { return e; } })();
		assert.ok(claimErr, 'a populated root without the host package must refuse to build');
		assert.equal(!!claimErr.environment, false, 'it is NOT an environment skip — the install is right there');
		assert.match(claimErr.message, /GONE from/, 'and it says which package is gone and why that is not a missing host');
		// The desktop half made the same distinction for the sidebar consumer.
		const deskErr = (() => { try { buildDesktopFixture({ root: empty }); return null; } catch (e) { return e; } })();
		assert.equal(!!(deskErr && deskErr.environment), true, 'no host at all stays an environment skip for the desktop stage too');
		// …and its RED half needs its own case (third-party 10.9.0 T7): an install that lost the
		// sidebar package must not be filed as "no host here" either.
		const deskClaim = (() => { try { buildDesktopFixture({ root: populated }); return null; } catch (e) { return e; } })();
		assert.ok(deskClaim, 'a populated root without the sidebar packages must refuse to build');
		assert.equal(!!deskClaim.environment, false, 'the desktop split has to redden too, not just the host one');
		assert.match(deskClaim.message, /stopped reading/, 'and it says the host stopped reading the token rather than blaming a missing install');
	} finally {
		fs.rmSync(empty, { recursive: true, force: true });
		fs.rmSync(populated, { recursive: true, force: true });
	}
});

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
	// The refusal has to reach the caller as "did not run": the CLI reports it as a skip and
	// the live cases skip with the reason. Neither may be an empty pass. Read through
	// `runChrome` (not `measure`): `measure` would first build a page, and since issue #105 the
	// fixture REFUSES to build one whose host class names were not derived — a different
	// refusal, which would make this assertion measure the wrong thing.
	const nope = runChrome('<!doctype html><html><head><title>DSH_RESULTS[]</title></head><body></body></html>', { CHROME_PATH: bogus });
	assert.equal(nope.ran, false, 'no browser is reported as not-ran, never as a page that graded nothing');
	assert.match(nope.why, /CHROME_PATH is set/);
});

test('issue #102: a browser that exists but cannot be spawned is a SKIP, not a red', () => {
	// The third state this gate had no name for: the binary IS there, the OS refuses to start
	// it (EBUSY on the review machine, EPERM/EACCES under an enterprise policy or in a
	// container). Before, that landed in the exception path — a stack, exit 1, no summary —
	// and 6–7 computed cases became indistinguishable from "the cascade broke". Pinned in
	// both directions: cannot-spawn reads as skip, and skip still may not look like a pass.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-spawn-'));
	try {
		// Present, readable, NOT an executable — the same shape as "installed but refused".
		const fake = path.join(dir, process.platform === 'win32' ? 'chrome.exe' : 'chrome');
		fs.writeFileSync(fake, 'this is not a binary\n');
		const html = '<!doctype html><html><head><title>DSH_RESULTS[]</title></head><body></body></html>';

		let threw = null;
		let r = null;
		try { r = runChrome(html, { CHROME_PATH: fake }); } catch (e) { threw = e; }
		assert.equal(threw, null, `a spawn failure must be absorbed, not rethrown (got: ${threw && threw.code})`);
		assert.equal(r.ran, false, 'the caller is told "did not run"');
		assert.match(r.why, /chrome/, `the reason has to name what was attempted, got: ${r.why}`);
		assert.match(r.why, /failed to launch/, `spawn failure is reported as a launch failure, got: ${r.why}`);

		const probe = probeBrowser({ CHROME_PATH: fake });
		assert.equal(probe.ran, false, 'the probe reports the same verdict the gate would hit');
		assert.match(probe.why, /cannot be spawned/, `the probe has to name the state, got: ${probe.why}`);

		// Grading: not-ran is `skip`, and the two kinds of throw are NOT the same thing.
		const skipped = gradeStage('host', ['corner'], () => ({ ran: false, why: 'EBUSY here' }));
		assert.equal(skipped.kind, 'skip', 'an engine that cannot run cannot hand out a verdict');
		assert.match(skipped.lines.join('\n'), /not a pass/, 'the skip has to say it is not a pass');
		assert.match(skipped.lines.join('\n'), /SKIPPED \(environment\)/);
		assert.equal(gradeStage('host', ['corner'], () => { throw environmentError('no DSH host install at X'); }).kind, 'skip',
			'no host on disk is an environment skip too');
		assert.equal(gradeStage('host', ['corner'], () => { throw new Error('the shell snapshot lost X'); }).kind, 'fail',
			'a fixture that lost a guarded declaration is a CLAIM red, never a skip');
		assert.equal(gradeStage('host', ['corner'], () => ({ ran: true, error: 'no results marker' })).kind, 'fail',
			'an engine that started and read garbage is a failure');
		// Reverse: a run that produced readings and disagrees still reddens — the skip lane
		// must not become a new place for real problems to hide.
		assert.equal(gradeStage('host', ['corner'], () => ({ ran: true, readings: [], via: 'x' })).kind, 'fail',
			'empty readings are not a pass either');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test('issue #102: the CLI exits 3 when it could not run, and 3 is not 0', { skip: SELF_SPAWN_OK ? false : selfSpawnWhy }, () => {
	// The user-visible half: `npm run wash:check` has to be tellable apart in three states
	// (0 checked-and-clean / 1 checked-and-wrong / 3 could-not-check). Anything that only
	// reads `=== 0` would treat "no usable browser on this box" as a green gate.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-cli-'));
	try {
		const fake = path.join(dir, process.platform === 'win32' ? 'chrome.exe' : 'chrome');
		fs.writeFileSync(fake, 'not a binary\n');
		const r = require('child_process').spawnSync(process.execPath,
			[path.join(__dirname, '..', 'scripts', 'wash-cascade.cjs')],
			{ encoding: 'utf8', timeout: 120000, env: { ...process.env, CHROME_PATH: fake } });
		assert.equal(r.status, 3, `expected the "not run" exit code, got ${r.status}\n${r.stdout}\n${r.stderr}`);
		assert.match(r.stdout + r.stderr, /SKIPPED \(environment\)/, 'the skip has to be printed, not just coded');
		assert.match(r.stdout + r.stderr, /NOT RUN/, 'and named as "no verdict was read"');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

/**
 * Alpha-composite N layers of `rgb(...)` over white. This is the arithmetic the browser does,
 * RE-DERIVED here from an independent implementation so that neither the synthetic rows below nor
 * the live cross-check depends on a colour somebody typed in — the same reason the fixture stopped
 * hand-copying host class names in 10.9.1 (F14 family). If the engine's `composite()` and this
 * function ever disagree, the live test says so out loud.
 */
function compositeOverWhite(layers, rgb, a) {
	let r = 255, g = 255, b = 255;
	for (let i = 0; i < layers; i += 1) {
		r = rgb[0] * a + r * (1 - a);
		g = rgb[1] * a + g * (1 - a);
		b = rgb[2] * a + b * (1 - a);
	}
	return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
/** The fixture's canvas token, read from the same source the page reads it from. */
const FIXTURE_TOKEN = [16, 16, 24];
const FIXTURE_ALPHA = 0.4;

/**
 * A corner page with no wash, and the same page washed (issue #96/#97/10.9.1). Shared by the two
 * synthetic-verdict tests below, which are the CI half of the computed-style gate — on CI the
 * engine half skips, so these rows are what makes the verdict table falsifiable at all. They carry
 * EVERY field the checks declare in `requires`: a row that lost one would now be reported as a
 * broken checker, which is the point (J4).
 *
 * The composites are DERIVED from the layer counts above (see `compositeOverWhite`), and the live
 * test re-measures the same numbers in a real engine — a transcription that drifted from the
 * fixture would be caught there, not here.
 */
const UNWASHED = {
	corner: '16px', frameFill: 'rgba(16, 16, 24, 0.75)', fadeBg: 'linear-gradient(a, b)', chatMask: 'linear-gradient(c)',
	stripFill: 'rgba(16, 16, 24, 0.75)', stripImage: 'none', stripContent: '""', stripRegion: 'drag',
	stripTop: '0px', stripHeight: '34px', stripTransform: 'none',
	sidebarColFill: 'rgba(16, 16, 24, 0.75)', centerColFill: 'rgba(16, 16, 24, 0.4)', refFill: 'rgba(16, 16, 24, 0.75)',
	bandComposite: 'rgb(25, 25, 33)', contentComposite: 'rgb(29, 29, 36)', bandLayers: 3, contentLayers: 4,
	stripImageOnToken: true
};
const WASHED = {
	corner: '0px', frameFill: 'rgba(0, 0, 0, 0)', fadeBg: 'none', chatMask: 'linear-gradient(c)',
	stripFill: 'rgba(16, 16, 24, 0.4)', stripImage: 'linear-gradient(rgba(16, 16, 24, 0.4), rgba(16, 16, 24, 0.4))',
	stripContent: '""', stripRegion: 'drag',
	stripTop: '0px', stripHeight: '34px', stripTransform: 'none',
	sidebarColFill: 'rgba(16, 16, 24, 0.75)', centerColFill: 'rgba(16, 16, 24, 0.4)', refFill: 'rgba(16, 16, 24, 0.75)',
	// The promise of 10.9.3 in two numbers: band and column composite to the SAME colour out of
	// the SAME number of layers. Both are derived, neither is typed in as a target.
	bandComposite: compositeOverWhite(3, FIXTURE_TOKEN, FIXTURE_ALPHA),
	contentComposite: compositeOverWhite(3, FIXTURE_TOKEN, FIXTURE_ALPHA),
	bandLayers: 3, contentLayers: 3,
	stripImageOnToken: true
};

test('the verdict table claims every reading, and each claim is in a named issue group', () => {
	// checkReadings is now the single source of the expected numbers (the CLI and both
	// live tests grade it). That only helps if no check can fall between the two groups:
	// an unclaimed id would be graded by `npm run wash:check` and by NEITHER test — the
	// split-brain this table exists to prevent, in a new costume.
	const groups = [...new Set(WASH_CHECKS.map((c) => c.group))].sort();
	assert.deepEqual(groups, [...WASH_GROUPS].sort(), 'every declared group has a check, and every check sits in a declared group');
	assert.deepEqual(groups, ['corner', 'desktop', 'fade'],
		'the groups are #96 (corner: the frame, its content corner and its caption ::before), #97 (fade) and #99 (desktop) — a new issue adds a group HERE');
	for (const check of WASH_CHECKS) {
		assert.ok(WASH_GROUPS.includes(check.group), `${check.id} claims an unknown group ${check.group}`);
		assert.ok(typeof check.ok === 'function' && check.msg, `${check.id} needs both a predicate and a message`);
	}
	// The two fixtures sample different field names, so a group must never be run
	// against the wrong page: checkReadings refuses an unknown group outright.
	assert.match(checkReadings([{}, {}, {}], ['no-such-group'])[0], /unknown check group/);
	assert.match(checkReadings([{}, {}, {}], ['desktop'])[0], /^checker: desktop-underlay-painted/,
		'a desktop check run on readings that lack the field reports a BROKEN CHECKER, not a verdict about the page');
	assert.match(checkReadings([{}, {}, {}], ['desktop'])[0], /"surfaceBg"@plain/,
		'and it names the field and the state, so a wrong-page run is readable rather than mysterious');
	// The guard must not swallow the diagnostic for checks that DID sample their fields and then
	// disagreed: the verdict failure still prints the readings it graded.
	const row = { ...UNWASHED };
	assert.match(checkReadings([row, row, row], ['corner'])[0], /readings \[/,
		'a real verdict failure still names what was measured');
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
	// UNWASHED / WASHED are the module-level rows above (shared with the verdict-table test).
	const HOST_GROUPS = ['corner', 'fade'];
	const ids = (problems) => problems.map((p) => p.split(':')[0]).sort();

	assert.deepEqual(ids(checkReadings([UNWASHED, UNWASHED, UNWASHED], HOST_GROUPS)),
		['caption-composites-like-content', 'corner-flattened', 'fade-neutralised', 'frame-fill-dropped'],
		'a wash that changes nothing must report exactly the four wash-side checks');

	assert.deepEqual(ids(checkReadings([WASHED, WASHED, UNWASHED], HOST_GROUPS)),
		['caption-paints', 'caption-restored', 'corner-host-own', 'fade-paints', 'frame-fill-kept'],
		'a plain state that already looks washed must report the plain-side and restore-side checks instead — and proves no wash check is quietly reading the plain sample');

	// The restore half is its own sample: if `washed-again` is not read, a rule that
	// permanently restyles the host would pass as "the wash works".
	assert.deepEqual(ids(checkReadings([UNWASHED, WASHED, WASHED], HOST_GROUPS)), ['caption-restored', 'corner-restored'],
		'a corner AND a caption row stuck at the washed value after the wash leaves are the only new complaints');
	assert.deepEqual(checkReadings([UNWASHED, WASHED, UNWASHED], HOST_GROUPS), [], 'the healthy trio reads no problems at all');

	// 10.9.1 — each new caption claim gets its OWN breakage, so a check cannot ride along on
	// another one's failure. Written against synthetic rows on purpose: these four run in CI,
	// where the browser half skips. `'no-drag'` is what the engine really answers for `none`:
	// the FIRST version of `caption-still-drags` tested "contains drag" and stayed green
	// through a mutation that genuinely stole the drag region — caught by running the
	// mutation, not by reading the check.
	const cornerTrio = (flag) => {
		const plain = { ...UNWASHED }, wash = { ...WASHED }, again = { ...UNWASHED };
		// The host's own paint surviving the wash: the band goes back to the sidebar token, so the
		// composite moves and the image is the host's flat colour again (no layer of ours).
		if (flag === 'stripSurvives') {
			wash.stripFill = plain.stripFill; wash.stripImage = 'none';
			wash.bandComposite = compositeOverWhite(2, [16, 16, 24], 0.75); wash.bandLayers = 2;
		}
		// 10.9.1's answer: the band left bare. Every other caption claim (box generated, drag
		// intact, geometry unmoved, restore) still reads green — this is the one id that carries
		// the decision, and it is the id 10.9.1's own gate could not have produced.
		if (flag === 'bandBare') {
			wash.stripFill = 'rgba(0, 0, 0, 0)'; wash.stripImage = 'none';
			wash.bandComposite = compositeOverWhite(1, FIXTURE_TOKEN, FIXTURE_ALPHA); wash.bandLayers = 1;
		}
		// 10.9.2's answer: the strip paints the token ONCE. Its own computed colour is then
		// byte-identical to the column's own computed colour — the assertion 10.9.2 graded — while
		// the composited band is a layer short. This row is the whole bug, kept as a case.
		if (flag === 'bandOneLayer') {
			wash.stripFill = wash.centerColFill; wash.stripImage = 'none';
			wash.bandComposite = compositeOverWhite(2, FIXTURE_TOKEN, FIXTURE_ALPHA); wash.bandLayers = 2;
		}
		// The anti-vacuity leg for the equality: a page where the centre column paints nothing
		// makes "the band matches the content column" true of a band that matches an empty page.
		if (flag === 'centerNeverPaints') { plain.centerColFill = 'rgba(0, 0, 0, 0)'; wash.centerColFill = 'rgba(0, 0, 0, 0)'; wash.stripFill = 'rgba(0, 0, 0, 0)'; }
		// A host gradient left standing under our shorthand. The composite is held at the healthy
		// value on purpose: this row grades the CHECKER TABLE (one id per failure mode), and the
		// live mutation below is where a real gradient moves both numbers at once.
		if (flag === 'imageSurvives') {
			wash.stripImage = 'linear-gradient(rgba(0, 0, 0, 0), rgba(16, 16, 24, 0.75))';
			wash.stripImageOnToken = false;
		}
		// The fixture losing a layer is how a shallow page starts passing: both sides thinned, so
		// the equality is still true and only the depth claim can say anything about it.
		if (flag === 'stackShallowed') {
			wash.bandLayers = 2; wash.contentLayers = 2;
			wash.bandComposite = compositeOverWhite(2, FIXTURE_TOKEN, FIXTURE_ALPHA);
			wash.contentComposite = wash.bandComposite;
		}
		// An opaque token makes every stack composite to the token itself at any depth — the
		// equality would stop being able to fail. One of the two ways this gate goes vacuous.
		if (flag === 'tokenOpaque') {
			plain.centerColFill = 'rgb(16, 16, 24)'; wash.centerColFill = 'rgb(16, 16, 24)';
			wash.bandComposite = 'rgb(16, 16, 24)'; wash.contentComposite = 'rgb(16, 16, 24)';
		}
		if (flag === 'boxGone') wash.stripContent = 'none';
		if (flag === 'dragGone') wash.stripRegion = 'no-drag';
		if (flag === 'columnMoved') wash.sidebarColFill = 'rgba(0, 0, 0, 0)';
		if (flag === 'columnNeverPainted') { plain.sidebarColFill = 'rgba(0, 0, 0, 0)'; wash.sidebarColFill = 'rgba(0, 0, 0, 0)'; }
		if (flag === 'hostNeverPainted') { plain.stripFill = 'rgba(0, 0, 0, 0)'; again.stripFill = 'rgba(0, 0, 0, 0)'; }
		// 10.9.1 J1 (adjudication, third-party T1/T6): a declaration that MOVES the caption box.
		// The three rows below are the same mutation seen from three angles, and each of them
		// leaves the paint, the image, the generated box and the computed app-region reading
		// exactly as documented — which is why the drag promise needs a geometry reading and not
		// only a property list.
		if (flag === 'bandMoved') wash.stripTop = '-34px';
		if (flag === 'bandTransformed') wash.stripTransform = 'matrix(1, 0, 0, 1, 0, -34)';
		if (flag === 'bandUnshaped') { plain.stripHeight = '0px'; wash.stripHeight = '0px'; }
		return [plain, wash, again];
	};
	for (const [flag, want] of [
		['stripSurvives', ['caption-composites-like-content']],
		['bandBare', ['caption-composites-like-content']],
		['bandOneLayer', ['caption-composites-like-content']],
		['centerNeverPaints', ['center-column-paints']],
		['imageSurvives', ['caption-image-is-our-token']],
		['stackShallowed', ['caption-stack-is-column-deep']],
		['tokenOpaque', ['caption-comparison-is-alpha-sensitive']],
		['boxGone', ['caption-box-alive']],
		['dragGone', ['caption-still-drags']],
		['bandMoved', ['caption-band-anchored']],
		['bandTransformed', ['caption-band-anchored']],
		['bandUnshaped', ['caption-band-shaped']],
		['columnMoved', ['sidebar-column-untouched']],
		['columnNeverPainted', ['sidebar-column-paints']],
		['hostNeverPainted', ['caption-paints']]
	]) {
		assert.deepEqual(ids(checkReadings(cornerTrio(flag), ['corner'])), want,
			`${flag}: the caption claims must name their own failure mode, nothing else`);
	}
	// 10.9.2 shipped `bandOneLayer` past every gate in this repository, so the row above is
	// doubled: the claim 10.9.2 actually graded was "the band's OWN background equals the column's
	// OWN background", and that sentence is TRUE of the broken page. Asserting it here keeps the
	// reason for the rewrite in the test rather than in a paragraph.
	const oneLayer = cornerTrio('bandOneLayer');
	assert.equal(oneLayer[1].stripFill, oneLayer[1].centerColFill,
		'the 10.9.2-era equality really is satisfied by the shape that failed on the user’s screen');
	assert.notEqual(oneLayer[1].bandComposite, oneLayer[1].contentComposite,
		'…and the composite is what tells them apart');
	// The geometry pair above reports ONE id each: the four paint/box/drag checks stay silent
	// through a moved box. That is the whole reason they are not sufficient on their own, and it
	// is written down here as a measured fact rather than as a paragraph in a document.
	// J4 (third-party T2): `requires` is a guard, not documentation. A row that lost `stripTop`
	// must not read as "geometry is fine" — `undefined === undefined` is a true statement about a
	// page that samples nothing at all. The checker says so, and says it about itself.
	const blind = cornerTrio('healthy').map((r) => { const c = { ...r }; delete c.stripTop; return c; });
	const blindProblems = checkReadings(blind, ['corner']);
	assert.equal(blindProblems.length, 2, `the two geometry checks complain and nothing else does, got: ${blindProblems.join(' | ')}`);
	for (const p of blindProblems) {
		assert.match(p, /^checker: /, 'a missing sampled field is a failure of the CHECKER, not a verdict about the page');
		assert.match(p, /"stripTop"/, 'and it names the field it could not read');
	}
	// A check that declares no inputs is the same hole wearing a different hat, so the guard is
	// graded on the guard: plant a check with an empty field list in the real table (WASH_CHECKS
	// is the array the grader walks) and require it to be refused.
	WASH_CHECKS.push({ id: 'no-fields', requires: [], group: 'corner', msg: 'planted check with an empty field list', ok: () => true });
	try {
		assert.match(checkReadings([UNWASHED, WASHED, UNWASHED], ['corner']).find((p) => p.startsWith('checker: no-fields')),
			/^checker: no-fields/,
			'a check with an undeclared field list is refused, so the guard cannot rot into "some checks are protected"');
	} finally {
		WASH_CHECKS.pop();
	}
	// `caption-image-is-our-token` is a guard against a FUTURE host shape, not a reading that can
	// fail today: the host's caption row is a flat colour, so the only image layer on it is ours.
	// That is why its falsifiability lives in the synthetic row above rather than only in the
	// engine — and why the reset is a shorthand in the first place. Saying "the engine would catch
	// it" without this row would be a claim with no test.
	assert.deepEqual(ids(checkReadings([UNWASHED, WASHED, UNWASHED], ['corner'])), [],
		'the healthy corner trio reads no problems even with the two guards that cannot bite on today’s host');
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

// ── J4: the field list is graded against the fixture SOURCE, where CI can see it ──

/**
 * WHY THIS HALF IS A STRING GATE. The `checker:` guard above only fires when the engine actually
 * runs — and on CI it does not (the shape there is 393 pass / 11 skip, no browser). A renamed or
 * dropped sample field would therefore be invisible exactly where the guard is supposed to protect
 * the next author. So the same promise is also read as text: every field a check declares must be
 * produced by the `sample()` of the page that feeds that group. The desktop page keeps its
 * sampling in a separate template constant (`DESKTOP_PAGE_SCRIPT`) that `desktopFixtureHtml`
 * embeds, so the anchor is the text that OPENS the right scope, not the function a reader expects
 * — and an anchor that points at the wrong page does not fail loudly, it grades nothing.
 */
const GROUP_SAMPLE_ANCHOR = {
	corner: 'function fixtureHtml(parts) {',
	fade: 'function fixtureHtml(parts) {',
	desktop: 'const DESKTOP_PAGE_SCRIPT = `'
};
const CASCADE_SRC = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'wash-cascade.cjs'), 'utf8');

/** The `sample(label)` body of one fixture builder, sliced out of the cascade source. */
function sampleBody(anchor) {
	const start = CASCADE_SRC.indexOf(anchor);
	assert.ok(start >= 0, `the cascade source must still open that page with ${JSON.stringify(anchor)} — the field guard has nothing to read`);
	const rest = CASCADE_SRC.slice(start);
	const end = rest.search(/\n(?:\/\*\*|function |const |async function |module\.exports)/);
	const body = end < 0 ? rest : rest.slice(0, end);
	const at = body.indexOf('function sample(label) {');
	assert.ok(at >= 0, `${anchor} must reach a sample(label) function — the guard reads the fields off it`);
	return body.slice(at);
}

test('every check declares the fields it reads, and the fixture that feeds it still samples them', () => {
	for (const g of WASH_GROUPS) {
		assert.ok(GROUP_SAMPLE_ANCHOR[g], `group ${g} has no sampling anchor — the field guard would skip it in silence`);
	}
	const bodies = {};
	for (const check of WASH_CHECKS) {
		assert.ok(Array.isArray(check.requires) && check.requires.length > 0,
			`${check.id} declares no inputs, so nothing can tell whether it is still reading a real field`);
		bodies[check.group] = bodies[check.group] || sampleBody(GROUP_SAMPLE_ANCHOR[check.group]);
		for (const field of check.requires) {
			assert.ok(new RegExp(`(?:[\\s{,(.])${field}\\s*[:=]`).test(bodies[check.group]),
				`${check.id} reads "${field}" but ${GROUP_SAMPLE_ANCHOR[check.group]} no longer produces it — `
				+ 'the engine guard would catch this too, but only on a machine that has a browser');
		}
	}
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
	// The shipped sheet really targets the shell surface. Read out of the BUNDLE rather than
	// through `buildDesktopFixture()`: the first version called the fixture builder here, and
	// the fixture builder needs an installed host — CI, which has none, reddened the case.
	// Anything placed above the skip line has to be computable from files in this repository.
	const material = require('../scripts/craft-audit.cjs').extractSheets(BUNDLE).find((s) => /material/.test(s.id)).css;
	assert.match(material, /\.dshDesktopSidebarSurface\s*\{[^}]*--dsw-specific-sidebar-fill:\s*inherit\s*!important/,
		'the #55 token rule targets the shell surface');
	assert.match(material, /html\[data-dsh-dream-skin-wash\]\s+\.dshDesktopSidebarSurface\s*\{[^}]*background-color:\s*transparent\s*!important/,
		'the #99 wash-gated paint clear ships in the same sheet');
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

// ── 10.9.1: the caption row is a second box, and the fixture now reads it ─

const STRIP_RULE_RE = /html\[data-windows-titlebar\]\[data-dsh-dream-skin-wash\][^{}]*::before[^{]*\{[^}]*\}/g;

test('mutation: with the caption ::before rule gone the strip paints through the wash again', { skip: RUN ? false : skipWhy }, () => {
	// The proof that the transparent reading above is our doing. Delete ONLY the pseudo-element
	// rule and leave the element rule in place — the failure mode worth isolating is "the frame
	// is cleared, and somebody reads that as the strip being cleared too", which is exactly the
	// mistake the 10.9.0 sheet made.
	const parts = buildFixture();
	const material = parts.material.replace(STRIP_RULE_RE, '');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	assert.ok(!/wash\][^{}]*::before/.test(material),
		'the caption rule really went away (the sheet keeps other ::before rules — the composer glass has one — so this names ours, not the spelling)');
	assert.match(material, /html\[data-windows-titlebar\]\[data-dsh-dream-skin-wash\] div:has\(> \[data-shell-overlay\]\)\s*\{[^}]*--dsh-windows-content-radius/,
		'the frame rule is still in the mutated sheet — this mutation isolates the pseudo-element only');
	const r = measure({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const readings = r.readings;
	const ids = checkReadings(readings, ['corner']).map((p) => p.split(':')[0]);
	assert.deepEqual(ids, ['caption-composites-like-content'],
		'the caption is the ONLY thing this mutation breaks: the corner, the frame fill and the sidebar column must all still read as fixed');
	const wash = readings.find((x) => x.state === 'wash');
	assert.equal(wash.stripFill, wash.refFill,
		'without our rule the host caption row paints the sidebar token straight through the wash — that IS the band the report circles');
	assert.notEqual(wash.bandComposite, wash.contentComposite, 'and the composite is the reading that says so');
});

const BAND_RULE_VALUE = 'background: linear-gradient(var(--dsw-alias-bg-base), var(--dsw-alias-bg-base)) var(--dsw-alias-bg-base) !important';

test('mutation: leaving the band bare (what 10.9.1 shipped) is a named failure', { skip: RUN ? false : skipWhy }, () => {
	// 10.9.1's answer was `background: transparent`, and it passed every gate in this repository
	// — because the gate asserted transparency INSTEAD of asserting what the user asked for,
	// which is "the top edge looks like the surface under it".
	const parts = buildFixture();
	const material = parts.material.replace(BAND_RULE_VALUE, 'background: transparent !important');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	assert.match(material, /::before[^{]*\{[^}]*background: transparent !important/);
	const r = measure({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const ids = checkReadings(r.readings, ['corner']).map((p) => p.split(':')[0]);
	assert.deepEqual(ids, ['caption-composites-like-content'],
		'a bare band breaks exactly the claim about what the band should look like — the box, the drag region, the geometry and the restore all still read fine, which is why they never could have carried this');
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.equal(wash.stripFill, 'rgba(0, 0, 0, 0)', 'the band is bare…');
	assert.notEqual(wash.centerColFill, 'rgba(0, 0, 0, 0)', '…and the surface under it is not, which is the whole complaint in two readings');
});

test('mutation: painting the token ONCE (what 10.9.2 shipped) is a named failure too', { skip: RUN ? false : skipWhy }, () => {
	// The second reversal's own tombstone, and the more important of the two. 10.9.2 answered
	// "make the strip paint the same token the content column paints" and shipped it past 412
	// tests, because the check graded `stripFill === centerColFill` — two OWN declarations, which
	// really are equal — while the column stacks that token three times and the strip twice.
	// This row runs the 10.9.2 sheet through the 10.9.3 engine and requires the composite claim to
	// speak, then asserts on the same readings that the 10.9.2 claim would have PASSED. Anything
	// that keeps this green without the composite id firing has put the layer count back where it
	// was not measurable.
	const parts = buildFixture();
	const material = parts.material.replace(BAND_RULE_VALUE, 'background: var(--dsw-alias-bg-base) !important');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	const r = measure({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const ids = checkReadings(r.readings, ['corner']).map((p) => p.split(':')[0]);
	assert.deepEqual(ids, ['caption-composites-like-content'],
		'one layer short breaks the composite claim and NOTHING on the engine side — the box, the drag region, the geometry, the image and the restore all still read fine. Measured across the other gates in an isolated copy (2026-10-09): craft-audit ACCEPTS this sheet (its whitelist carries the one-layer form on purpose — layer count is not a shape question), and the smoke pin reddens, but for the wrong reason (it compares the exact declaration, so it fires on any edit, not on a missing layer). This row is the only gate in the repository that fails because the band is one layer short.');
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.equal(wash.stripFill, wash.centerColFill,
		'the equality 10.9.2 graded is TRUE of this broken page — that is the whole lesson, kept as an assertion');
	assert.notEqual(wash.bandComposite, wash.contentComposite,
		'…and the composited result is what differs, by exactly the missing layer');
	assert.equal(wash.bandLayers, wash.contentLayers - 1, 'named as a count, so the failure is a fact about the page rather than a colour coincidence');
});

test('the caption rule wins by SELECTOR; !important is the inline-stamp belt, not the mechanism', { skip: RUN ? false : skipWhy }, () => {
	// Stated the other way round from issue #99's case on purpose. There, `!important` was
	// load-bearing: the shell outranked us (0,3,1) against (0,2,1) and dropping the flag
	// repainted the column. Here the arithmetic is the reverse — (0,3,3) against the host's
	// (0,2,1) — so the engine must STILL clear the strip with the flag removed. If this ever
	// reddens, the specificity claim in lib/client.js is wrong and the comment above the rule
	// has to be re-measured before anyone repeats it.
	const parts = buildFixture();
	const material = parts.material.replace(BAND_RULE_VALUE, BAND_RULE_VALUE.replace(' !important', ''));
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	assert.match(material, /::before[^{]*\{[^}]*linear-gradient\(var\(--dsw-alias-bg-base\), var\(--dsw-alias-bg-base\)\) var\(--dsw-alias-bg-base\);/, 'the declaration is still there, only unflagged');
	const r = measure({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.equal(wash.bandComposite, wash.contentComposite,
		'the selector alone beats the host rule, layer for layer — which is why the flag guards a different case (an inline stamp), not this one');
	assert.notEqual(wash.stripFill, wash.refFill, 'and it is really overriding the host: the band is not reading the sidebar token any more');
});

test('the AppFrame class names are DERIVED from the host CSS, and a re-roll stops the fixture', () => {
	// 10.9.1 closes the last two hand-written class names in this page (docs boundary ⑤ named
	// `pI_x6G_frame` / `pI_x6G_centerCol`). The reason is not tidiness: our rule reaches the
	// frame STRUCTURALLY, so a stale name would not break our rule — it would break the HOST's,
	// and the page would then read `rgba(0, 0, 0, 0)` for a strip that nothing ever painted.
	const layout = '.AAA_frame{background:red}[data-windows-titlebar] .AAA_frame{--dsh-windows-content-radius:16px}'
		+ '.AAA_centerCol{border-radius:0}.AAA_sidebarCol{background:red}';
	assert.deepEqual(hostLayoutClasses({ layout }),
		{ frameClass: 'AAA_frame', centerColClass: 'AAA_centerCol', sidebarColClass: 'AAA_sidebarCol' },
		'the three names come out of the CSS text as authored');
	// Losing the frame means losing EVERY rule that names it — the plain one and the
	// platform-prefixed one. Removing only one of the two must still build, because either
	// form proves the class exists (that is the B7 fix, asserted on its own below).
	const frameGone = layout
		.replace(/\.AAA_frame\{[^}]*\}/g, '')
		.replace(/\[data-windows-titlebar\] \.AAA_frame\{[^}]*\}/g, '');
	assert.notEqual(frameGone, layout, 'the frame trim has to actually remove something');
	assert.throws(() => hostLayoutClasses({ layout: frameGone }), /would have to INVENT/,
		'losing the frame rule must stop the build instead of measuring a class nobody renders');
	for (const [drop, name] of [
		[/\.AAA_centerCol\{[^}]*\}/g, 'center column'],
		[/\.AAA_sidebarCol\{[^}]*\}/g, 'sidebar column']
	]) {
		const trimmed = layout.replace(drop, '');
		assert.notEqual(trimmed, layout, `the trim for ${name} has to actually remove something`);
		assert.throws(() => hostLayoutClasses({ layout: trimmed }), /would have to INVENT/,
			`losing the ${name} rule must stop the build instead of measuring a class nobody renders`);
	}
	// B7 (blue-team 10.9.1): a host that only ever writes the PLATFORM-PREFIXED form must
	// still be readable. The first version required the class at a rule boundary and would
	// have refused to build against such a host — a false red is still a red, and this gate
	// has to be trusted when it speaks.
	assert.equal(hostLayoutClasses({ layout: '[data-windows-titlebar] .AAA_frame{a:b}.AAA_centerCol{a:b}.AAA_sidebarCol{a:b}' }).frameClass,
		'AAA_frame', 'the prefixed form alone is enough proof the class exists');
	assert.throws(() => hostLayoutClasses({}), /no host layout CSS/);
	// A re-rolled hash is the case the derivation EXISTS for: the names move, the fixture
	// follows, and nothing is remembered. What must stop the build is the rule disappearing.
	assert.deepEqual(hostLayoutClasses({ layout: layout.split('AAA_').join('BBB_panel_') }),
		{ frameClass: 'BBB_panel_frame', centerColClass: 'BBB_panel_centerCol', sidebarColClass: 'BBB_panel_sidebarCol' },
		'a fresh hash on the same families re-derives cleanly — that is the point of reading them out of the CSS');
});

// ── the corner fixture's colors come from the bundle (10.10.0, F14 one group later) ──

/**
 * A SECOND MECHANISM for pulling one token out of the bundle, deliberately not `skinTokens()`.
 *
 * To be exact about what that buys (blue team B-06): it is NOT an independent SOURCE — both readers
 * parse the same `lib/client.js` text, so a fabricated block that lies to one lies to the other, and
 * the only thing standing between a fake `nebula` and a green suite is the literal nail below. What
 * the different mechanism does catch is parser drift: an indentation or key-order change that makes
 * `skinTokens()` silently miss is exactly the failure this shape surfaces as a disagreement.
 *
 * The slice is bounded at the NEXT `id: "`, not at a fixed length. A fixed window overflowed nebula's
 * block by ~1,900 characters (measured), so a token absent from nebula could have been reported from
 * the skin that follows it — the reader would have looked independent and been reading the wrong skin.
 */
function bundleToken(skinId, key) {
	const at = BUNDLE.indexOf('id: "' + skinId + '"');
	if (at < 0) throw new Error(`no ${skinId} block in the bundle`);
	const next = BUNDLE.indexOf('id: "', at + 1);
	const block = BUNDLE.slice(at, next < 0 ? BUNDLE.length : next);
	const m = block.match(new RegExp('"' + key + '": "([^"]+)"'));
	return m ? m[1] : null;
}

test('the corner fixture reads its colors out of the shipped bundle, and refuses to invent them', () => {
	// The desktop group learned this in 10.8.1 (F14: the fixture asserted `rgba(30,27,44,0.96)`,
	// a value this repository invented, so "the shell really paints an underlay" was the gate
	// reading back its own handwriting). The corner group was the last page still typing its
	// :root colors — and because EVERY check in that group is relational (this equals that), a
	// skin repainting either token would have left the gate measuring colours no skin ships while
	// all of them stayed green.
	const hex = bundleToken(CORNER_SKIN, '--dsw-alias-bg-base');
	const sidebarHex = bundleToken(CORNER_SKIN, '--dsw-specific-sidebar-fill');
	// The nail: a skin change is allowed, but it has to be a DECISION. If this goes red, the
	// fixture's composited readings quoted in docs/desktop-support.md move with it.
	assert.equal(hex, '#131116', `${CORNER_SKIN}'s canvas token changed — update the nail and every doc that quotes the fixture's numbers`);
	assert.equal(sidebarHex, '#110f14', `${CORNER_SKIN}'s sidebar token changed — same drill`);
	const t = cornerTokens(BUNDLE);
	const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
	const srgb = [0, 2, 4].map((i) => parseInt(sidebarHex.slice(1 + i, 3 + i), 16));
	assert.equal(t['--dsw-alias-bg-base'], `rgba(${rgb.join(', ')}, ${CORNER_ALPHA['--dsw-alias-bg-base']})`,
		'the canvas token is the bundle colour at the declared slider alpha');
	assert.equal(t['--dsw-specific-sidebar-fill'], `rgba(${srgb.join(', ')}, ${CORNER_ALPHA['--dsw-specific-sidebar-fill']})`,
		'the sidebar token is the bundle colour at the declared slider alpha');
	assert.notEqual(t['--dsw-alias-bg-base'], t['--dsw-specific-sidebar-fill'],
		'these are TWO different materials on the real page — the typed fixture had them as one colour, which is how a relational gate can pass while measuring nothing');
	// layer-2 keeps its authored alpha; the slider alphas are only for the two tokens the wash moves.
	assert.equal(t['--dsw-alias-bg-layer-2'], 'rgba(45, 43, 49, 0.92)', 'layer-2 comes through as the skin ships it');
	// A value this file cannot parse has to stop the build. Falling back to the old typed colour
	// would be the exact failure mode: the gate keeps reading a page nobody renders.
	for (const [key, bad] of [
		['--dsw-alias-bg-base', 'var(--whatever)'],
		['--dsw-specific-sidebar-fill', '']
	]) {
		const source = BUNDLE.replace(`"${key}": "${key === '--dsw-alias-bg-base' ? hex : sidebarHex}"`, `"${key}": "${bad}"`);
		assert.notEqual(source, BUNDLE, `the ${key} swap has to actually change the text`);
		assert.throws(() => cornerTokens(source), /invent/i,
			`an unreadable ${key} must refuse the build instead of becoming a guess`);
	}
	// The fixture refuses a page whose tokens were never read, the same way it refuses classes
	// that were not derived — a thin fixture is worse than no fixture.
	const parts = buildFixture();
	assert.throws(() => fixtureHtml({ ...parts, corner: undefined }), /were not read from the shipped bundle/);
});

test('mutation: the corner page really paints with the bundle tokens, so a skin change moves the readings', { skip: RUN ? false : skipWhy }, () => {
	// The claim above is about a function; this one is about the page. Rewrite nebula's canvas
	// token in a COPY of the bundle, rebuild the fixture from that copy, and the engine must read
	// the new colour off the centre column. If the fixture were still typing its own :root value,
	// this reading would not move — and every relational check would still be green.
	const hex = bundleToken(CORNER_SKIN, '--dsw-alias-bg-base');
	const source = BUNDLE.replace(`"--dsw-alias-bg-base": "${hex}"`, '"--dsw-alias-bg-base": "#010203"');
	assert.notEqual(source, BUNDLE, 'the swap has to actually change the bundle text');
	const r = measure({ parts: buildFixture({ source }) });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	const plain = r.readings.find((x) => x.state === 'plain');
	assert.equal(wash.centerColFill, 'rgba(1, 2, 3, 0.4)',
		'the column paints the bundle colour at the declared slider alpha — nothing here is typed');
	assert.equal(wash.stripFill, 'rgba(1, 2, 3, 0.4)',
		'under the wash the band follows the CANVAS token, so a repainted skin moves the band and the column together');
	assert.equal(plain.stripFill, 'rgba(17, 15, 20, 0.75)',
		'with no wash the band goes back to the SIDEBAR token — the two materials stay distinguishable, which is what makes the equality above a claim about a relation and not about one colour');
	// The composite claim survives a skin change because it compares two measured stacks, not a
	// colour this file chose. That is the property the whole 10.9.3 re-shape was for.
	assert.equal(wash.bandComposite, wash.contentComposite,
		'a repainted skin must not break the band — if this goes red the equality depends on a colour, not on a relation');
	const base = measure();
	const baseWash = base.readings.find((x) => x.state === 'wash');
	assert.notEqual(baseWash.centerColFill, wash.centerColFill, 'the two pages really differ, or nothing was measured');
});

// ── issue #105: two plugins, one face ─────────────────────────────────────

/** The four readings the coexistence page produces, with one thing broken at a time. */
function coexistQuad(flag) {
	const chatMask = 'linear-gradient(rgba(0, 0, 0, 0) 0px, rgb(0, 0, 0) 24px, rgb(0, 0, 0) 100%)';
	const band = 'linear-gradient(rgba(0, 0, 0, 0), rgba(16, 16, 24, 0.75))';
	const rows = [
		{ state: 'plain', realBg: band, realColour: 'rgba(0, 0, 0, 0)', probeBg: 'rgb(1, 2, 3)', chatMask, wash: false, theirs: false },
		{ state: 'wash', realBg: 'none', realColour: 'rgba(0, 0, 0, 0)', probeBg: 'rgb(1, 2, 3)', chatMask, wash: true, theirs: false },
		{ state: 'coexist', realBg: 'none', realColour: 'rgba(0, 0, 0, 0)', probeBg: 'rgba(0, 0, 0, 0)', chatMask, wash: true, theirs: true },
		{ state: 'their-only', realBg: 'none', realColour: 'rgba(0, 0, 0, 0)', probeBg: 'rgba(0, 0, 0, 0)', chatMask, wash: false, theirs: true }
	];
	const at = (s) => rows.find((row) => row.state === s);
	if (flag === 'noBand') at('plain').realBg = 'none';
	if (flag === 'oursLeavesBand') at('wash').realBg = band;
	if (flag === 'probeLosesAnyway') at('wash').probeBg = 'rgba(0, 0, 0, 0)';
	if (flag === 'theirsNotStronger') at('coexist').probeBg = 'rgb(1, 2, 3)';
	if (flag === 'userSeesBand') at('coexist').realBg = band;
	if (flag === 'theirRuleUngated') at('their-only').probeBg = 'rgb(1, 2, 3)';
	if (flag === 'maskDamaged') at('coexist').chatMask = 'none';
	if (flag === 'dropState') rows.pop();
	return rows;
}

test('issue #105: the coexistence verdict is falsifiable, one claim at a time', () => {
	// Every check is aimed at a different failure, and this is the case that says so: a
	// verdict table nobody can break is a verdict table that cannot tell anything. The
	// baseline first (an all-green quad), then one break per check, asserting the OTHER
	// checks stay quiet so a failure can be attributed rather than guessed at.
	assert.deepEqual(checkCoexistReadings(coexistQuad()), [], 'the baseline quad must grade clean');
	// Expectations are SETS, not single ids: two of these breaks really do damage two claims
	// (a band that survives our wash is also a band the user sees in the coexist state), and
	// pretending otherwise would mean writing an assertion that tolerates collateral reds.
	// What the exactness still buys is the other direction — no flag may redden a check it has
	// no business touching, which is how a runaway condition would be caught.
	const broken = {
		noBand: ['coexist-host-paints'],
		oursLeavesBand: ['coexist-ours-kills-band', 'coexist-user-result-agrees'],
		probeLosesAnyway: ['coexist-ours-not-important', 'coexist-their-lane-stronger'],
		theirsNotStronger: ['coexist-their-lane-stronger'],
		userSeesBand: ['coexist-user-result-agrees'],
		theirRuleUngated: ['coexist-band-gated'],
		maskDamaged: ['coexist-chat-mask-untouched']
	};
	for (const [flag, expectedIds] of Object.entries(broken)) {
		const problems = checkCoexistReadings(coexistQuad(flag));
		assert.deepEqual(problems.map((p) => p.split(':')[0]).sort(), expectedIds.slice().sort(),
			`flag ${flag} must redden exactly ${expectedIds.join(' + ')}`);
	}
	const missing = checkCoexistReadings(coexistQuad('dropState'));
	assert.equal(missing.length, 1, 'a run that lost a state is refused');
	assert.match(missing[0], /never produced their-only/, 'and the missing state is named');
	assert.match(missing[0], /refusing to grade/, 'a partial run cannot be graded');
	// Every check must belong to this group's naming, and every state must be read by
	// something — an unread state is a page half nobody grades.
	assert.equal(COEXIST_CHECKS.length, 7, 'the table size is pinned so a check cannot vanish silently');
	for (const c of COEXIST_CHECKS) assert.match(c.id, /^coexist-/, `${c.id} is not in the coexist group`);
	const source = COEXIST_CHECKS.map((c) => c.ok.toString()).join(' ');
	for (const state of ['plain', 'wash', 'coexist', 'their-only']) {
		// `.plain` for the bare names, `['their-only']` for the hyphenated one — either is a
		// real read of that state; a state no check looks at is a page half nobody grades.
		assert.ok(source.includes(`.${state}`) || source.includes(`['${state}']`),
			`no check reads the ${state} state`);
	}
});

test('issue #105: the fade class names are DERIVED from the host CSS, not remembered', () => {
	// Boundary ⑤ in docs/desktop-support.md: the fixture used to hand-copy `bhn1Oq_fade`
	// and `O_Ebla_fadeTop`, so a hash re-roll would leave it measuring a class nobody
	// renders while every reading still "passed". Derivation turns that into a loud break.
	const derived = hostFadeClasses({ fade: '.zzz_root{a:1}.abc123_fade{left:0}', chat: '.def456_fadeTop{mask-image:none}' });
	assert.deepEqual(derived, { fadeClass: 'abc123_fade', chatClass: 'def456_fadeTop' });
	assert.throws(() => hostFadeClasses({ fade: '', chat: '.def456_fadeTop{a:1}' }), /would have to INVENT/,
		'no fade rule in the CSS must break the fixture, not produce one that measures nothing');
	assert.throws(() => hostFadeClasses({ fade: '.abc123_fade{a:1}', chat: '' }), /protecting nothing/,
		'the collateral half needs its own class, or the mask check protects nothing');
	assert.throws(() => hostFadeClasses({ fade: '.abc123_fadeTop{a:1}', chat: '.x_fadeTop{a:1}' }), /_fade \{/,
		'a `_fadeTop`-only host is NOT a `_fade` host — the suffix anchor would have nothing to match');
});

test('issue #105: the other plugin rule is read from its installed bundle, or refused', () => {
	// The rule is composed exactly as that bundle composes it (their scopes × their
	// selector), so the measurement cannot drift from the shipped code. Everything is
	// needles-and-refusals: a missing piece is an error, never a thinner page.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-skincenter-'));
	// A miniature of their bundle's shape: the scope list, and the scoped() call with the
	// declaration block after it. Written as plain strings (the escapes matter — the real
	// bundle carries `\"` inside its own string literal, and the extractor unescapes them).
	const scopedCall = '${scoped("[data-slot=\\"sidebar.workspaces\\"] [class*=\\"_fade\\"]")}';
	const bundle = (block) => [
		'const ACTIVE_VISUAL_SELECTOR = [',
		'  "html[data-dsh-skin]",',
		'  "html[data-dsh-custom-theme]:not([data-dsh-skin])",',
		'  "html[data-dsh-wallpaper-active]"',
		'].join(", ");',
		`const css = \`${scopedCall} {\n  ${block}\n}\`;`
	].join('\n');
	const write = (text) => {
		const f = path.join(dir, 'client.js');
		fs.writeFileSync(f, text, 'utf8');
		return f;
	};
	try {
		const good = write(bundle('background: none !important;\n  background-image: none !important;'));
		const rule = pluginFadeRule({ DSH_SKIN_CENTER: good });
		assert.equal(rule.scopes.length, 3, 'three host-level scopes');
		assert.match(rule.selector, /\[class\*="_fade"\]/, 'the selector is theirs, verbatim');
		assert.match(rule.css, /background: none !important;/, 'the declaration block is theirs, verbatim');
		assert.ok(rule.css.split('\n').length >= 4, 'and it is composed per scope, not once');

		// Refusals, one piece at a time.
		const devolved = write(bundle('background: none;'));
		assert.throws(() => pluginFadeRule({ DSH_SKIN_CENTER: devolved }), /lost !important/,
			'a rule that dropped !important changes the cascade answer and must not be measured silently');
		const shapeless = write('nothing to see here');
		assert.throws(() => pluginFadeRule({ DSH_SKIN_CENTER: shapeless }), /ACTIVE_VISUAL_SELECTOR|scoped\(\)/,
			'a bundle whose shape moved must be refused, not composed from nothing');
		const err = (() => { try { pluginFadeRule({ DSH_SKIN_CENTER: path.join(dir, 'nope', 'client.js') }); return null; } catch (e) { return e; } })();
		assert.ok(err && err.environment, 'an uninstalled plugin is an ENVIRONMENT skip, not a claim about coexistence');
		assert.match(err.message, /NOT evidence that nobody else addresses _fade/,
			'the skip has to refuse the wrong conclusion in writing');
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test('issue #105 (live): two plugins, one face — measured, not argued', { skip: RUN_COEXIST ? false : coexistSkipWhy }, () => {
	const r = measureCoexist();
	assert.ok(r.ran, `the coexistence page must run: ${r.why || r.error}`);
	assert.match(r.provenance || '', new RegExp(SKIN_CENTER_PKG.replace('/', '\\/')), 'the verdict names whose rule was measured');
	assert.deepEqual(checkCoexistReadings(r.readings), []);
	const byState = Object.fromEntries(r.readings.map((x) => [x.state, x]));
	// The two readings the whole issue turns on, quoted rather than summarised: our rule is
	// a normal declaration (the inline sentinel survives it), theirs is an !important one
	// (the sentinel loses), and the face the user sees is neutralised either way.
	assert.equal(byState.wash.probeBg, 'rgb(1, 2, 3)', 'our declaration is NOT !important — inline still wins over it');
	assert.equal(byState.coexist.probeBg, 'rgba(0, 0, 0, 0)', 'their !important lane takes the element even from an inline style');
	assert.equal(byState.coexist.realBg, 'none', 'and the band is gone in either world');
	assert.equal(byState['their-only'].wash, false, 'the last state is genuinely without our wash');
	assert.match(byState.coexist.chatMask, /linear-gradient/, 'their broader operator reaches the chat masks and does NOT break them');
});

test('mutation: with our fade declaration gone the coexistence band comes back', { skip: RUN_COEXIST ? false : coexistSkipWhy }, () => {
	// The coexistence readings have to be caused by OUR shipped declaration, not by the other
	// plugin happening to paint the same nothing. Remove only `background: transparent` from
	// the wash-gated fade rule and re-measure: the band must survive our own wash state while
	// their !important rule still holds the probe down — which is also how we know the
	// attribution line is reading THEIR lane and not ours.
	const parts = buildCoexistFixture();
	const material = parts.material.replace(/(\[class\$="_fade"\][^{]*\{)([^}]*)\}/,
		(m, head, body) => head + body.replace(/background:\s*transparent;/, '') + '}');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	const r = measureCoexist({ parts: { ...parts, material } });
	assert.ok(r.ran && !r.error, `the mutated page must still read: ${r.why || r.error}`);
	const byState = Object.fromEntries(r.readings.map((x) => [x.state, x]));
	assert.match(byState.wash.realBg, /linear-gradient/, 'without our declaration the host band survives our own wash');
	assert.equal(byState.coexist.probeBg, 'rgba(0, 0, 0, 0)', 'their lane still wins the probe — the attribution was not reading our rule');
});
