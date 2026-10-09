/**
 * dsh-dream-skin — the documents' numbers must be the gates' own numbers.
 *
 * Issue #77. The 10.6.1 gate set was advertised in ten documents (README + the
 * seven translations + design-philosophy + the CHANGELOG) as "152 measurable
 * quality gates (145 palette + 7 craft)". By the time review opened, those three
 * numbers were wrong in six places: the CHANGELOG had drifted to 113, the
 * "before" baseline was a numerator from a retired denominator, a test file's
 * case count was stale, and desktop-support.md carried 172 and 200 in the same
 * file. Nothing failed — because nothing compared prose against the scripts that
 * produce the numbers. The count IS a fact about `scripts/skin-audit.cjs` and
 * `scripts/craft-audit.cjs`, so it is computed here by CALLING them and never
 * restated.
 *
 * What is gated, and what is not:
 *
 *   - Gated: the audit counts. `palette` = per-skin checks x skins + the
 *     catalog-distinctiveness check (that +1 is what the prose's "= N palette"
 *     arithmetic means); `craft` = the craft audit's checks; `total` = the two
 *     added, which is what "N measurable quality gates" claims.
 *   - Gated: the `npm test` case total, counted by LOADING each test file with
 *     `node:test` stubbed out, so declarations register and bodies never run.
 *     That is the number CI prints, and it includes this file's own cases.
 *   - Not re-stated: the ruler. `tests/skin.quality.test.cjs` pins the audit's
 *     check set and `tests/craft.quality.test.cjs` pins the craft set, so
 *     "delete five checks until the prose matches" is not a way through here.
 *
 * The historical release notes are deliberately out of scope: README's older
 * `回归门 N/N` lines describe those releases and must keep THEIR numbers. Only
 * the current-state statements are pinned, and each one is addressed by an
 * explicit scope or marker rather than by "every occurrence in the file".
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const ROOT = path.join(__dirname, '..');
const CLIENT = path.join(ROOT, 'lib', 'client.js');

// ---------------------------------------------------------------------------
// the live numbers
// ---------------------------------------------------------------------------

/**
 * The probe-group count, read out of the bundle the same way the drift probe
 * publishes it (`MATERIAL_SELECTOR_PROBES.length`, +1 for the desktop shell's own
 * anchor). docs/desktop-support.md documents `probed` as a machine-readable field, so
 * its value is a claim about this array — before J1 it was a claim three reviewers
 * could read as "6, still current" while the code probed 8.
 */
function liveProbeGroups(source) {
	const body = source.match(/const MATERIAL_SELECTOR_PROBES = \[([\s\S]*?)\n\t\t\];/);
	if (!body) throw new Error('MATERIAL_SELECTOR_PROBES is gone or reshaped — the probed count cannot be derived');
	const entries = body[1]
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => /^"(?:[^"\\]|\\.)*",?$|^[A-Za-z_][\w.]*,?$/.test(l));
	if (entries.length < 6) throw new Error(`probe-group parse found only ${entries.length} entries — the array formatting changed`);
	return entries.length;
}

/** Call the audits. Nothing here is a literal that could drift. */
function liveNumbers() {
	const skinAudit = require('../scripts/skin-audit.cjs');
	const craftAudit = require('../scripts/craft-audit.cjs');
	const source = fs.readFileSync(CLIENT, 'utf8');
	const skins = skinAudit.extractSkins(source);
	const reports = skins.map((s) => skinAudit.auditSkin(s));
	// `auditCatalog` returns one check (catalog-distinctiveness), and the CLI's
	// own total adds that 1 on top of the per-skin checks — same model here.
	const catalogCheck = 1;
	const palette = reports.reduce((n, r) => n + r.checks.length, 0) + catalogCheck;
	const craft = craftAudit.auditCraft(source).checks.length;
	const probed = liveProbeGroups(source);
	return {
		skins: skins.length,
		perSkin: reports[0].checks.length,
		palette,
		craft,
		total: palette + craft,
		suite: liveSuiteCount().total,
		probed,
		// The desktop shell adds exactly one anchor of its own (issue #55), which is
		// what `publishVerdict` computes as `probed + (isDesktopShell() ? 1 : 0)`.
		probedDesktop: probed + 1
	};
}

/**
 * Count the suite the way `npm test` counts it: load every test file with
 * `node:test` replaced by a recorder, so `test(...)` calls register and nothing
 * executes. A regex over the source undercounts (readme.roadmap declares 21 of
 * its 22 cases inside a locale loop) and a fresh `node --test` inside the suite
 * would be circular.
 */
function liveSuiteCount(files = null, dir = null) {
	const base = dir || path.join(ROOT, 'tests');
	const list = files || fs
		.readdirSync(base)
		.filter((f) => f.endsWith('.test.cjs'))
		.sort();
	const original = Module._load;
	const perFile = {};
	for (const name of list) {
		let declared = 0;
		const recorder = () => { declared += 1; };
		// `color.science.test.cjs` does `const test = require('node:test')` and
		// calls the module object itself, so the stub has to be callable AND
		// carry the named exports.
		recorder.test = recorder;
		recorder.it = recorder;
		recorder.only = recorder;
		recorder.skip = recorder;
		recorder.todo = recorder;
		recorder.describe = (n, cb) => { if (typeof cb === 'function') cb(); };
		recorder.before = recorder.after = recorder.beforeEach = recorder.afterEach = () => {};
		Module._load = function (request, ...rest) {
			if (request === 'node:test') return recorder;
			return original.call(this, request, ...rest);
		};
		const file = path.join(base, name);
		try {
			delete require.cache[require.resolve(file)];
			require(file);
		} finally {
			Module._load = original;
			delete require.cache[require.resolve(file)];
		}
		perFile[name] = declared;
	}
	return { total: Object.values(perFile).reduce((n, v) => n + v, 0), perFile };
}

// ---------------------------------------------------------------------------
// the claim sites
// ---------------------------------------------------------------------------

/**
 * Where each document states the numbers. `marker` picks the line(s) that make
 * the claim (locale-specific wording, so it cannot be shared); an optional
 * `scope` restricts the search to one block, which is how README's current
 * release note is separated from its historical ones.
 */
const CLAIM_SITES = [
	{ label: 'README.md 皮肤段', file: 'README.md', marker: '可测质量门', needs: ['total', 'palette', 'craft'] },
	{
		label: 'README.md 10.9.2 版本块',
		file: 'README.md',
		scope: { from: '**版本 10.9.2', until: '**版本 10.9.1' },
		marker: '回归门',
		needs: ['suite']
	},
	{ label: 'design-philosophy.md', file: 'docs/design-philosophy.md', marker: '调色 +', needs: ['total', 'palette', 'craft'] },
	{ label: 'README.en.md', file: 'docs/i18n/README.en.md', marker: 'palette +', needs: ['total', 'palette', 'craft'] },
	{ label: 'README.de.md', file: 'docs/i18n/README.de.md', marker: 'Farb- +', needs: ['total', 'palette', 'craft'] },
	{ label: 'README.es.md', file: 'docs/i18n/README.es.md', marker: 'paleta +', needs: ['total', 'palette', 'craft'] },
	{ label: 'README.fr.md', file: 'docs/i18n/README.fr.md', marker: 'palette +', needs: ['total', 'palette', 'craft'] },
	{ label: 'README.ja.md', file: 'docs/i18n/README.ja.md', marker: '配色', needs: ['total', 'palette', 'craft'] },
	{ label: 'README.ko.md', file: 'docs/i18n/README.ko.md', marker: '팔레트', needs: ['total', 'palette', 'craft'] },
	{ label: 'README.ru.md', file: 'docs/i18n/README.ru.md', marker: 'палитра', needs: ['total', 'palette', 'craft'] },
	{ label: 'CHANGELOG.md', file: 'CHANGELOG.md', marker: '项质量门', needs: ['total', 'palette', 'craft'] },
	{
		// Issue #95-A: the CURRENT headline block restates the audit counts again
		// (the "226/226 / 217 / 346" family), and mutating them stayed green because
		// only the `项质量门` line above was registered. Historical blocks stay out
		// of scope on purpose — same boundary the header comment draws.
		label: 'CHANGELOG.md 头版块',
		file: 'CHANGELOG.md',
		scope: { from: '## [10.9.2]', until: '## [10.9.1]' },
		marker: '质量审计',
		needs: ['total', 'palette', 'craft']
	},
	{ label: 'desktop-support.md 兼容表', file: 'docs/desktop-support.md', marker: '回归测试覆盖', needs: ['suite'] },
	{ label: 'desktop-support.md 已验证清单', file: 'docs/desktop-support.md', marker: 'Node 18/20/22/24 CI', needs: ['suite'] }
];

/**
 * J1 (adversarial review 10.8.0): the probe-group count, checked as a FIELD rather than
 * as "this number appears somewhere on the line". The marker-line form of this claim was
 * tried first and is VACUOUS — the explanatory comment sits on the same line and carries
 * the number already, so rewriting `probed: 8` to `probed: 6` stayed green (measured).
 * A check that cannot fail is worse than no check, because it is written down as coverage.
 * So the two places that state the count are matched against their exact shape, and the
 * reverse case below mutates them to prove the gate has teeth.
 */
function probedFieldProblems(text, live) {
	const problems = [];
	// The field value is captured, not searched: a trailing `//` annotation may say
	// anything it likes (that is what made the marker-line version vacuous — the
	// annotation carried the number and the check could not tell who was claiming it).
	const snapshot = text.match(/^\s*probed:\s*(\d+),\s*(?:\/\/.*)?$/m);
	if (!snapshot) {
		problems.push('no line in this document is the machine field `probed: <n>,` — the field shape moved, update the gate');
	} else if (Number(snapshot[1]) !== live.probed) {
		problems.push(`the snapshot field says probed: ${snapshot[1]}, the bundle probes ${live.probed} groups`);
	}
	const pair = text.match(/Web `probed=(\d+)`、桌面 `probed=(\d+)`/);
	if (!pair) {
		problems.push('the web/desktop probe-pair sentence is gone — the prose that states both counts moved');
	} else if (Number(pair[1]) !== live.probed || Number(pair[2]) !== live.probedDesktop) {
		problems.push(`the prose says probed=${pair[1]} / ${pair[2]}, the bundle says ${live.probed} / ${live.probedDesktop}`);
	}
	return problems;
}

const intsIn = (text) => (text.match(/\d+/g) || []).map(Number);

/** The lines a site makes its claim on, or null when the site's scope is gone. */
function matchingLines(text, site) {
	let lines = text.split('\n');
	if (site.scope) {
		const from = lines.findIndex((l) => l.includes(site.scope.from));
		if (from < 0) return null;
		const until = site.scope.until
			? lines.findIndex((l, i) => i > from && l.includes(site.scope.until))
			: -1;
		lines = lines.slice(from, until < 0 ? lines.length : until);
	}
	return lines.filter((l) => l.includes(site.marker));
}

/** Empty means every site states the live numbers; otherwise one line each. */
function numberProblems(sites, readFile, numbers) {
	const n = numbers || liveNumbers();
	const problems = [];
	for (const site of sites) {
		const lines = matchingLines(readFile(site.file), site);
		if (lines === null) {
			problems.push(`${site.label}: the block starting "${site.scope.from}" is gone — the claim was deleted, not corrected`);
			continue;
		}
		const want = site.needs.map((k) => n[k]);
		if (lines.some((l) => want.every((w) => intsIn(l).includes(w)))) continue;
		const found = lines.length
			? lines.map((l) => `      ${JSON.stringify(intsIn(l))}`).join('\n')
			: '      (no line carries the marker at all — the claim was deleted)';
		problems.push(
			`${site.label} (${site.file}): no line carrying "${site.marker}" states ${site.needs.join(' + ')} ` +
			`= ${want.join(' / ')}.\n` +
			`    Measured now: ${n.perSkin} checks x ${n.skins} skins + 1 catalog = ${n.palette} palette, ` +
			`${n.craft} craft, ${n.total} total, ${n.suite} suite cases.\n` +
			`    Numbers found on the marker line(s):\n${found}`
		);
	}
	return problems;
}

const readReal = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// ---------------------------------------------------------------------------
// the gate
// ---------------------------------------------------------------------------

test('docs numbers: the counts come from the audits and the loaded suite, not from prose', () => {
	const n = liveNumbers();
	assert.ok(n.skins >= 8, `expected at least the 8 built-in skins, extracted ${n.skins}`);
	assert.ok(n.perSkin > 0, 'the per-skin audit returned no checks — the audit API changed shape');
	assert.ok(n.craft > 0, 'the craft audit returned no checks — the audit API changed shape');
	assert.equal(n.palette, n.perSkin * n.skins + 1,
		`palette total ${n.palette} is not perSkin(${n.perSkin}) x skins(${n.skins}) + 1 — the prose's arithmetic model changed`);
	assert.equal(n.total, n.palette + n.craft, 'the headline total must be palette + craft');
	assert.ok(n.suite > 200, `the suite counter found only ${n.suite} cases — the node:test stub is not intercepting`);
});

test('docs numbers: the suite total is counted by loading the suite (a source regex undercounts it)', () => {
	const counted = liveSuiteCount();
	// The undercount this guards against is real: readme.roadmap.test.cjs
	// declares 22 cases, of which 21 are generated inside a locale loop.
	assert.ok(counted.perFile['readme.roadmap.test.cjs'] > 20,
		`the counter sees only ${counted.perFile['readme.roadmap.test.cjs']} cases in readme.roadmap.test.cjs — ` +
		'a loop-generated case was missed, so the total below would be wrong');
	assert.ok(counted.perFile['client.smoke.test.cjs'] > 100,
		`the counter sees only ${counted.perFile['client.smoke.test.cjs']} cases in client.smoke.test.cjs`);
	assert.equal(counted.total, Object.values(counted.perFile).reduce((a, b) => a + b, 0),
		'the per-file breakdown must add up to the total');
	assert.ok(Object.keys(counted.perFile).includes('docs.numbers.test.cjs'),
		'this file must be inside the counted set — the documented total is what `npm test` prints, this gate included');
});

test('docs numbers: a scratch file is counted by its declarations, not by its filename', () => {
	// Proves the counter is live rather than returning a remembered figure.
	const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'dsh-docnum-'));
	try {
		fs.writeFileSync(path.join(dir, 'a.test.cjs'),
			"const { test } = require('node:test');\n" +
			"test('one', () => {});\n" +
			"test('two', () => { throw new Error('the body must never run: the counter only loads'); });\n" +
			"test('three', () => {});\n");
		fs.writeFileSync(path.join(dir, 'b.test.cjs'),
			"const { test, describe } = require('node:test');\n" +
			"describe('group', () => { test('nested', () => {}); });\n");
		const counted = liveSuiteCount(['a.test.cjs', 'b.test.cjs'], dir);
		assert.equal(counted.perFile['a.test.cjs'], 3, `expected 3 declarations in a.test.cjs, counted ${counted.perFile['a.test.cjs']}`);
		assert.equal(counted.perFile['b.test.cjs'], 1, `a describe-nested case must still be counted, counted ${counted.perFile['b.test.cjs']}`);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test('docs numbers: every document states the live gate counts', () => {
	const problems = numberProblems(CLAIM_SITES, readReal);
	problems.push(...probedFieldProblems(readReal('docs/desktop-support.md'), liveNumbers()));
	assert.deepEqual(problems, [], `\n${problems.join('\n')}\n`);
});

test('docs numbers: the probe-count claim is a field, and mutating it reddens it', () => {
	// Reverse case for the J1 gate. This exists because the FIRST version of this check
	// was vacuous: it asked "does the line carrying `probed:` contain the number 8", and
	// the line's own explanatory comment contained it, so rewriting the field to 6 kept
	// every document green (measured on this tree). The field form is therefore pinned
	// against its own failure, in both of the two places the count is claimed.
	const live = liveNumbers();
	const doc = readReal('docs/desktop-support.md');
	assert.deepEqual(probedFieldProblems(doc, live), [], 'the real document must satisfy the field check');
	const mutatedField = doc.replace(/^\s*probed:\s*(\d+),/m, '    probed: 999,');
	assert.notEqual(mutatedField, doc, 'the field anchor moved');
	assert.equal(probedFieldProblems(mutatedField, live).length, 1, 'the snapshot field must be able to fail');
	const mutatedProse = doc.replace(/Web `probed=(\d+)`/, 'Web `probed=3`');
	assert.notEqual(mutatedProse, doc, 'the prose anchor moved');
	assert.equal(probedFieldProblems(mutatedProse, live).length, 1, 'the prose pair must be able to fail');
	// And a document that no longer claims the numbers is a failure too — silence is not
	// agreement. Both claims are removed here, because either one alone would still be a
	// claim the other could satisfy.
	const silent = doc
		.replace(/^\s*probed:.*\n/m, '')
		.replace(/Web `probed=(\d+)`、桌面 `probed=(\d+)`/, 'the probe counts (see the snapshot above)');
	assert.notEqual(silent, doc, 'both claim anchors moved');
	assert.deepEqual(probedFieldProblems(silent, live), [
		'no line in this document is the machine field `probed: <n>,` — the field shape moved, update the gate',
		'the web/desktop probe-pair sentence is gone — the prose that states both counts moved'
	], 'deleting both claims must report both, not "nothing to check"');
});

test('mutation: an arbitrary wrong gate total in README.md reddens the count check', () => {
	const n = liveNumbers();
	const good = numberProblems(CLAIM_SITES, readReal);
	assert.deepEqual(good, [], 'control: the unmutated tree must pass, or the mutations below prove nothing');

	// Issue #77's acceptance criterion: change README's total to ANY wrong value.
	for (const [name, wrong] of [['an arbitrary value (999)', '999'], ['the retired value (152)', '152']]) {
		const problems = numberProblems(CLAIM_SITES, (rel) => {
			const text = readReal(rel);
			if (rel !== 'README.md') return text;
			return text.replace(`${n.total} 项可测质量门`, `${wrong} 项可测质量门`);
		});
		assert.ok(problems.length > 0, `${name}: README's claim line with ${wrong} must redden the check`);
		assert.ok(problems.some((p) => p.startsWith('README.md 皮肤段')),
			`${name}: the failure must name the README claim site, got: ${problems.map((p) => p.split(':')[0]).join(', ')}`);
	}
});

test('mutation: a CHANGELOG that keeps the retired 113 reddens the count check', () => {
	const n = liveNumbers();
	const problems = numberProblems(CLAIM_SITES, (rel) => {
		const text = readReal(rel);
		if (rel !== 'CHANGELOG.md') return text;
		return text.replace(`${n.total} 项质量门`, '113 项质量门');
	});
	assert.ok(problems.length > 0, 'issue #77 acceptance: a CHANGELOG still claiming 113 must redden the check');
	assert.ok(problems.some((p) => p.startsWith('CHANGELOG.md')),
		`the failure must name the CHANGELOG site, got: ${problems.map((p) => p.split(':')[0]).join(', ')}`);
});

test('mutation: a wrong suite total in desktop-support.md reddens the suite check', () => {
	const n = liveNumbers();
	const problems = numberProblems(CLAIM_SITES, (rel) => {
		const text = readReal(rel);
		if (rel !== 'docs/desktop-support.md') return text;
		return text.replace(`${n.suite} 用例`, '172 用例');
	});
	assert.ok(problems.some((p) => p.startsWith('desktop-support.md 已验证清单')),
		`the 172 that disagreed with 200 in the same file must redden again, got: ${problems.map((p) => p.split(':')[0]).join(', ')}`);
});

test('guard: a newly added translation cannot escape this gate', () => {
	// The claim is written once per locale. A locale that exists but is absent
	// from CLAIM_SITES is silently ungated — and this list is the only thing that
	// would ever say so.
	const onDisk = fs
		.readdirSync(path.join(ROOT, 'docs', 'i18n'))
		.filter((f) => /^README\.[a-z]{2}\.md$/.test(f))
		.map((f) => `docs/i18n/${f}`)
		.sort();
	const covered = CLAIM_SITES.map((s) => s.file)
		.filter((f) => f.startsWith('docs/i18n/'))
		.sort();
	assert.deepEqual(covered, onDisk,
		'the translations on disk and the claim sites must be the same set — add the new locale to CLAIM_SITES, do not leave its numbers ungated');
	assert.ok(onDisk.length >= 7, `expected at least the 7 shipped translations, found ${onDisk.length}`);
});

test('guard: a deleted claim site is a failure, not a pass', () => {
	// The failure mode of every "find the number" gate is silently matching
	// nothing. A missing scope must be reported by name. The site is TAKEN FROM
	// CLAIM_SITES instead of restated here: the current release block moves with
	// every version, and a second copy of that pointer is exactly the
	// two-inventories-drift shape this repository keeps having to fix.
	const scoped = CLAIM_SITES.find((s) => s.scope);
	assert.ok(scoped, 'the claim-site table must still carry a scoped (current-release) site');
	const problems = numberProblems([scoped], () => '# nothing here\n');
	assert.equal(problems.length, 1, 'an absent scope must produce exactly one problem');
	assert.ok(problems[0].includes(`the block starting "${scoped.scope.from}" is gone`), problems[0]);

	const control = numberProblems([scoped], readReal);
	assert.deepEqual(control, [], 'control: the real tree must still satisfy a single-site check');
});
