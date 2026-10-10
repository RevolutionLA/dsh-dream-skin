/**
 * dsh-dream-skin — the CI branch of the computed-style gate (Roadmap M).
 *
 * WHY THIS FILE EXISTS. README's Roadmap M is the sentence "把机制级取证搬进 CI": `npm run
 * wash:check` drives a real engine and reads computed values, but the four engine cases in
 * `tests/wash.cascade.test.cjs` skip in CI because a runner has neither a browser nor a host
 * install — so "the mechanism really works in a real engine" was evidence only one laptop
 * could recompute. `.github/workflows/ci.yml` now provisions both pieces and runs the gate
 * under `DSH_WASH_STRICT=1`. Two things can still rot, and NEITHER is caught by the engine
 * cases (which skip on the very runner whose behaviour is in question):
 *
 *   1. the strict branch itself — a refactor that folds "this machine had no Chrome" into a
 *      passing exit code, or that stops naming WHICH piece is absent;
 *   2. the CI job's own shape — a step deleted, or the skip-detection grep dropped, turning
 *      the job back into a green no-op.
 *
 * So every case here is either pure logic (runs on any machine, no browser, no host) or a
 * subprocess run with deliberately BROKEN paths. Both directions are asserted: strict + a
 * missing environment MUST be a failure, and the same broken environment off strict MUST
 * still be a skip — because the repository's hard rule is that an environment failure and a
 * fact disagreement are different facts:
 *
 *   0 ran and agrees · 1 ran and disagrees · 3 could not run · 4 strict mode was refused
 *
 * Strict mode never turns 1 into 4 (that would hide a real cascade break behind "install a
 * browser"), and never turns a skip into 0 (that would be the false pass #102 exists to kill).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
	cliOutcome, strictRequested, gradeStage, environmentError, probeBrowser,
	buildFixture, buildDesktopFixture, DEFAULT_HOST_ROOT
} = require('../scripts/wash-cascade.cjs');

const GATE = path.join(__dirname, '..', 'scripts', 'wash-cascade.cjs');
const CI_FILE = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');
const OK = 'wash cascade OK';

/** A stage that skipped because the browser is not here — the shape `gradeStage` produces. */
const browserSkip = (label = 'host') => ({
	kind: 'skip', label, piece: 'browser', reason: 'no headless browser found', lines: [`${label}: SKIPPED (environment) — nope`]
});
/** A stage that skipped because the host install is not here. */
const hostSkip = (label = 'desktop') => ({
	kind: 'skip', label, piece: 'host install', reason: `no DSH host install at /tmp/x`, lines: [`${label}: SKIPPED (environment) — nope`]
});
const okStage = (label = 'coexist') => ({ kind: 'ok', label, lines: [] });
const failStage = (label = 'host') => ({ kind: 'fail', label, lines: [`${label}: corner-flattened: the wash did not flatten`] });

// ── 1. the switch itself ──────────────────────────────────────────────────────────
test('Roadmap M: DSH_WASH_STRICT is truthy-spellings-only, so "0" cannot turn CI red', () => {
	for (const on of ['1', 'true', 'TRUE', 'yes', 'on']) {
		assert.equal(strictRequested({ DSH_WASH_STRICT: on }), true, `${on} must mean strict`);
	}
	// The reverse half is the one that bites: an unset OR falsy variable must not put a
	// developer's laptop in strict mode, and must not make CI red for a formatting reason.
	for (const off of ['0', 'false', 'no', '', '   ', '2', undefined]) {
		assert.equal(strictRequested({ DSH_WASH_STRICT: off }), false, `${JSON.stringify(off)} must mean NOT strict`);
	}
	assert.equal(strictRequested({}), false, 'no variable at all is the off state — this is what a developer gets');
});

// ── 2. the strict branch: able to fail, because the same input off-strict is a skip ─
test('Roadmap M: strict + a missing browser is a NON-ZERO FAILURE that names the browser', () => {
	const o = cliOutcome([browserSkip('host'), browserSkip('desktop'), browserSkip('coexist')], { strict: true });
	assert.notEqual(o.exitCode, 0, 'the whole point: strict mode cannot hand a skip back as a pass');
	assert.notEqual(o.exitCode, 3, 'and it cannot leave it as the polite "could not run" either');
	assert.equal(o.exitCode, 4, `a refused environment is its own fact, got ${o.exitCode}`);
	assert.deepEqual(o.missing, ['browser'], 'the failure has to name WHICH piece is absent');
	const text = o.lines.map((l) => l.text).join('\n');
	assert.match(text, /MISSING browser/, 'one actionable line per missing piece');
	assert.match(text, /host \+ desktop \+ coexist/, 'and it says which stages that cost');
	assert.match(o.summary, /STRICT MODE/, 'the summary says why this is red rather than skipped');
	assert.ok(o.lines.every((l) => l.stream === 'error' || /SKIPPED/.test(l.text)), 'refusals go to stderr');
});

test('Roadmap M: the SAME stage list off strict is still a skip — exit 3, never red, never green', () => {
	const o = cliOutcome([browserSkip('host'), browserSkip('desktop'), browserSkip('coexist')], { strict: false });
	assert.equal(o.exitCode, 3, 'nothing changes off CI: "could not run" keeps its own exit code');
	assert.equal(o.missing.length, 0, 'no strict mode, therefore no refusal');
	const text = o.lines.map((l) => l.text).join('\n');
	assert.match(text, /SKIPPED \(environment\)/, 'the skip is printed as a skip (issue #102)');
	assert.doesNotMatch(text, /MISSING/, 'and is not dressed up as a pipeline failure');
	assert.doesNotMatch(o.summary, /STRICT MODE/);
});

test('Roadmap M: strict does NOT relabel a disagreement — exit 1 stays 1, and outranks a skip', () => {
	const alone = cliOutcome([failStage('host')], { strict: true });
	assert.equal(alone.exitCode, 1, 'the engine ran and disagreed; strict mode has nothing to say about that');
	assert.deepEqual(alone.missing, [], 'and it must not invent an environment problem');
	assert.ok(!alone.lines.map((l) => l.text).concat(alone.summary).join('\n').includes('MISSING'), 'no MISSING line on a fact red');

	const mixed = cliOutcome([failStage('host'), hostSkip('desktop'), okStage('coexist')], { strict: true });
	assert.equal(mixed.exitCode, 1, 'a real problem plus an absent browser is still reported as the real problem');

	const clean = cliOutcome([okStage('host'), okStage('desktop'), okStage('coexist')], { strict: true });
	assert.equal(clean.exitCode, 0, 'strict, everything provisioned, everything agrees → the green the CI job is there for');
	assert.match(clean.summary, /wash cascade OK/);
});

test('Roadmap M: every absent piece is named once, and an unclassified skip still fails strict', () => {
	const both = cliOutcome([browserSkip('host'), browserSkip('desktop'), hostSkip('coexist')], { strict: true });
	assert.equal(both.exitCode, 4);
	assert.deepEqual(both.missing, ['browser', 'host install'], 'two pieces, two names — "install a browser" must not be the whole advice');
	const lines = both.lines.filter((l) => /MISSING/.test(l.text));
	assert.equal(lines.length, 2, `one line per piece, got ${lines.length}`);

	// A skip whose piece nobody declared (a future stage, or an environmentError thrown
	// without a piece) must still be refused: an unlabelled skip is the no-op this gate was
	// built to make loud.
	const anonymous = cliOutcome([{ kind: 'skip', label: 'host', lines: ['host: SKIPPED (environment) — something'] }], { strict: true });
	assert.equal(anonymous.exitCode, 4, 'a skip without a piece is still a skip');
	assert.match(anonymous.lines.map((l) => l.text).join('\n'), /MISSING environment/);
});

test('Roadmap M: a missing browser does not hide behind a missing host', () => {
	// On a runner with NEITHER piece, every stage throws inside `buildFixture()` before the
	// engine is asked, so the stage list alone would report only the host — and the reader
	// would have no way to know Chrome is absent too. The CLI hands over `probeBrowser()`;
	// this is that branch, exercised without a browser.
	const o = cliOutcome([hostSkip('host'), hostSkip('desktop'), hostSkip('coexist')], {
		strict: true,
		browserProbe: { ran: false, why: 'no headless browser found; looked at 6 known locations' }
	});
	assert.equal(o.exitCode, 4);
	assert.deepEqual(o.missing, ['host install', 'browser'], 'both absent pieces named, host first because that is what the stages hit');
	assert.match(o.lines.map((l) => l.text).join('\n'), /MISSING browser — required by the \(precondition\) stage\(s\)/);
	// A probe that RAN must not add anything: "Chrome is fine, the host is missing" is one fact.
	const one = cliOutcome([hostSkip('host')], { strict: true, browserProbe: { ran: true, via: 'chrome' } });
	assert.deepEqual(one.missing, ['host install']);
	// And a stage that already blamed the browser must not be counted twice.
	const notwice = cliOutcome([browserSkip('host'), hostSkip('desktop')], { strict: true, browserProbe: { ran: false, why: 'nope' } });
	assert.deepEqual(notwice.missing, ['browser', 'host install']);
	assert.equal(notwice.lines.filter((l) => /MISSING browser/.test(l.text)).length, 1, 'one line per piece, not one per stage');
});

// ── 3. the pieces the CI job provisions, classified the same way ──────────────────
test('Roadmap M: gradeStage tags the skip with the piece, so the report has something to name', () => {
	const engine = gradeStage('host', ['corner'], () => ({ ran: false, why: 'EBUSY here' }));
	assert.equal(engine.kind, 'skip', 'issue #102 is unchanged: not-ran is a skip');
	assert.equal(engine.piece, 'browser', 'and it is now nameable as the browser');
	assert.match(engine.lines.join('\n'), /SKIPPED \(environment\)/, 'the printed sentence is the one the CI grep looks for');

	const host = gradeStage('desktop', ['desktop'], () => { throw environmentError('no DSH host install at X', 'host install'); });
	assert.equal(host.kind, 'skip');
	assert.equal(host.piece, 'host install');

	const loose = gradeStage('desktop', ['desktop'], () => { throw environmentError('something unreadable'); });
	assert.equal(loose.piece, 'environment', 'an environmentError with no piece still skips, it just says less');

	const red = gradeStage('host', ['corner'], () => { throw new Error('the host fade CSS carries no rule'); });
	assert.equal(red.kind, 'fail', 'a fixture that lost a guarded declaration is a CLAIM red, never a nameable environment piece');
	assert.equal(red.piece, undefined, 'and it carries no piece at all');
});

test('Roadmap M: DSH_HOST_ROOT is the CI door, and an empty one is an ENVIRONMENT skip about the host', () => {
	// The workflow installs the host packages into a throwaway directory and points this at
	// it; the three-state split has to survive that door being opened on an empty room.
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ci-empty-host-'));
	try {
		for (const build of [() => buildFixture({ root: dir }), () => buildDesktopFixture({ root: dir })]) {
			const err = (() => { try { build(); return null; } catch (e) { return e; } })();
			assert.ok(err, 'an empty host root must refuse to build a fixture, not build a thin one');
			assert.equal(err.environment, true, '"nothing installed here" is the environment fact, not a disagreement');
			assert.equal(err.piece, 'host install', 'and it is nameable, which is what strict mode prints');
			assert.match(err.message, /no DSH host install|no declaration reading/, `the reason has to be the reason, got: ${err.message}`);
		}
		// The OTHER door stays red: a host install that lost the package is drift, and strict
		// mode must not be able to talk itself into skipping that.
		fs.mkdirSync(path.join(dir, 'dsh-client-ui-layout'));
		const drift = (() => { try { buildFixture({ root: dir }); return null; } catch (e) { return e; } })();
		assert.ok(drift, 'a directory that is not really a host install must not pass as one');
		assert.notEqual(drift.environment, true, 'this is the fact disagreement, not the environment');
		assert.match(drift.message, /GONE from/, `named as a removal, got: ${drift.message}`);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
	assert.ok(DEFAULT_HOST_ROOT, 'and the default root is still what a developer without the variable reads');
});

// ── 4. the real CLI, three states, with the paths a broken CI would have ──────────
/** Run the shipped CLI with an explicit environment; `null` values delete an inherited var. */
function runCli(over, opts = {}) {
	const env = { ...process.env };
	for (const [k, v] of Object.entries(over)) {
		if (v === null) delete env[k];
		else env[k] = v;
	}
	env.DSH_SKIN_CENTER = ''; // never let a profile copy on this machine decide the branch
	const r = spawnSync(process.execPath, [GATE], { encoding: 'utf8', env, timeout: opts.timeout || 300000 });
	assert.ok(r.status !== null, `the gate was killed before it answered (status ${r.status}, signal ${r.signal})\n${r.stdout}\n${r.stderr}`);
	return { code: r.status, out: `${r.stdout || ''}\n${r.stderr || ''}` };
}

/** Escape a Windows-or-POSIX path so it can be matched as literal text inside a RegExp. */
const lit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('Roadmap M: the CLI itself — strict + a browser that is not there = exit 4 naming the browser', () => {
	const bogus = path.join(os.tmpdir(), `dsh-no-such-browser-${process.pid}.exe`);
	const strict = runCli({ CHROME_PATH: bogus, DSH_WASH_STRICT: '1' });
	assert.equal(strict.code, 4, `strict mode must refuse a missing browser, got ${strict.code}\n${strict.out}`);
	assert.match(strict.out, /MISSING browser/, 'and name it');
	assert.match(strict.out, new RegExp(lit(bogus)), 'naming the bad path is what makes it fixable');
	assert.match(strict.out, /STRICT MODE/);

	// Same broken environment, no strict flag: exit 3, printed as a skip, no refusal text.
	const polite = runCli({ CHROME_PATH: bogus, DSH_WASH_STRICT: null });
	assert.equal(polite.code, 3, `off CI nothing changes — a skip, not a red, got ${polite.code}\n${polite.out}`);
	assert.match(polite.out, /SKIPPED \(environment\)/);
	assert.doesNotMatch(polite.out, /MISSING/, 'a skip is not dressed as a pipeline failure');
	assert.doesNotMatch(polite.out, /STRICT MODE/);
	assert.doesNotMatch(polite.out, new RegExp(OK));
});

test('Roadmap M: the CLI itself — strict + an empty host root = exit 4 naming the host install', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ci-empty-host-cli-'));
	try {
		const strict = runCli({ DSH_HOST_ROOT: dir, DSH_WASH_STRICT: '1' });
		assert.equal(strict.code, 4, `strict mode must refuse a machine with no host to read, got ${strict.code}\n${strict.out}`);
		assert.match(strict.out, /MISSING host install/, 'and say which piece');
		assert.match(strict.out, new RegExp(lit(dir)), 'the root it looked in is in the message');
		assert.doesNotMatch(strict.out, new RegExp(OK), 'never a pass');

		const polite = runCli({ DSH_HOST_ROOT: dir, DSH_WASH_STRICT: null });
		assert.equal(polite.code, 3, `off strict the same empty root stays a skip, got ${polite.code}\n${polite.out}`);
		assert.match(polite.out, /NOT RUN/);
		assert.doesNotMatch(polite.out, /MISSING/);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

// ── 5. the CI job's own shape, with a checker that can fail ───────────────────────
/**
 * What the `wash-gate` job MUST contain. Written as a function returning problems so the
 * case below can hand it a DELETED copy of each requirement and watch it complain — a
 * static test that cannot fail is the exact thing issue #83 / #97 keep being about.
 */
function workflowProblems(ci) {
	const start = ci.indexOf('\n  wash-gate:');
	if (start < 0) return ['no wash-gate job: the computed-style gate does not run in CI'];
	const job = ci.slice(start);
	const problems = [];
	const required = [
		["DSH_WASH_STRICT: '1'", 'strict mode: without it a missing browser is exit 3 and the job is green'],
		['CHROME_PATH=', 'the provisioned browser has to be handed to the gate'],
		['DSH_HOST_ROOT=', 'the provisioned host install has to be handed to the gate'],
		['DSH_SKIN_CENTER=', 'the co-signing plugin has to be handed over, or the coexist stage skips'],
		['node scripts/wash-cascade.cjs', 'the gate has to actually be run'],
		['--ignore-scripts', 'third-party packages are installed to be READ, not executed'],
		['SKIPPED (environment)', 'belt and braces: the output is re-read for a skip'],
		['host-token-census.json', 'the host version under test comes from the census, not from a second hand-typed pin']
	];
	for (const [needle, why] of required) {
		if (!job.includes(needle)) problems.push(`${needle} — missing from the wash-gate job: ${why}`);
	}
	// One sampled field per fixture: proof that all three pages ran, not one page thrice.
	for (const field of ['"corner"', '"surfaceBg"', '"probeBg"']) {
		if (!job.includes(field)) problems.push(`${field} — no reading-field guard for the stage that samples it`);
	}
	if (!/runs-on:\s*ubuntu-latest/.test(job)) problems.push('the job must run on a runner image that ships a browser');
	if (ci.indexOf('\n  typecheck:') > start) {
		problems.push('the wash-gate job must come AFTER typecheck: tests/repo.hygiene.test.cjs slices the test job at `\\n  typecheck:`, and a job inserted before it lands inside that slice');
	}
	return problems;
}

test('Roadmap M: the CI job provisions both pieces, runs the gate strict, and greps its own output', () => {
	const ci = fs.readFileSync(CI_FILE, 'utf8');
	assert.deepEqual(workflowProblems(ci), [], 'the workflow must carry every piece the gate needs');
	// Reverse: each requirement is load-bearing, and removing any one of them reddens this
	// case rather than silently turning the job back into a no-op.
	const mutations = [
		["DSH_WASH_STRICT: '1'", 'the strict flag deleted'],
		['DSH_HOST_ROOT=', 'the host install never handed over'],
		['CHROME_PATH=', 'the browser never handed over'],
		['SKIPPED (environment)', 'the belt-and-braces grep deleted'],
		['"probeBg"', 'one of the three per-stage field guards deleted']
	];
	for (const [needle, label] of mutations) {
		assert.ok(ci.includes(needle), `${label}: the shipped workflow no longer contains ${needle}`);
		// Every occurrence, not the first: `CHROME_PATH=` legitimately appears twice (image
		// browser and downloaded browser), and a mutation that left one of them behind would
		// be a mutation that proves nothing.
		const mutated = ci.split(needle).join('# removed');
		assert.ok(workflowProblems(mutated).length > 0, `${label} must be reported as a problem`);
	}
});

// ── 6. the happy path, where this machine really can measure ─────────────────────
const engine = probeBrowser();
let ready = engine.ran;
for (const build of [() => buildFixture(), () => buildDesktopFixture()]) {
	try { build(); } catch (e) { if (e.environment) ready = false; }
}
const READY_WHY = !engine.ran
	? `no headless browser usable here: ${engine.why}`
	: 'no installed DSH host to read CSS from (the gate would skip, and a skip is not this case)';

test('Roadmap M: strict mode with a REAL browser and a REAL host install exits 0 and prints readings',
	{ skip: ready ? false : READY_WHY }, () => {
	const r = runCli({ DSH_WASH_STRICT: '1', CHROME_PATH: null, DSH_HOST_ROOT: null }, { timeout: 420000 });
	assert.equal(r.code, 0, `strict mode on a provisioned machine must be the green CI is after, got ${r.code}\n${r.out}`);
	assert.match(r.out, new RegExp(OK));
	assert.doesNotMatch(r.out, /SKIPPED \(environment\)/, 'a strict run that skipped is not this case (that is the case above)');
	const rows = r.out.split('\n').filter((l) => l.startsWith('{'));
	assert.ok(rows.length >= 13, `expected the three fixtures to publish their readings (13 rows), got ${rows.length}`);
	for (const field of ['"corner"', '"surfaceBg"', '"probeBg"']) {
		assert.ok(rows.some((l) => l.includes(field)), `no reading row carries ${field}`);
	}
});
