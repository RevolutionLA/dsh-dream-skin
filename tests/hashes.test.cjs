/**
 * dsh-dream-skin — THE BUILD-HASH GATE (issues #92 and #94).
 *
 * Two rules from this repository's own history that prose could not enforce:
 *
 *   #92 — "hang the host's stable `data-*` attributes, never its build-hash
 *   class names." A comment five lines above the rule that obeys it was still
 *   quoting `BynINW_frame` / `BynINW_centerCol`, two hashes that measure 0 hits
 *   across every host build we support. A comment that teaches a dead hash
 *   teaches the wrong pattern, and it takes a machine to notice.
 *
 *   #94 — "the corpus is the host install, not the packages we happened to
 *   download." A study that scanned 3 packages instead of 287 produced a
 *   *cleaner* report ("nothing here mentions X") and nothing could tell it
 *   apart from the real thing.
 *
 * Same split as the forward gap: the measurement needs the host, the policy
 * does not. `checkHashLiterals()` and `corpusShortfall()` are pure and run
 * everywhere; the live re-measurement declares that it did NOT run rather than
 * passing quietly.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const {
	scanTargets,
	scanHashLiterals,
	indexCorpus,
	measureHashCorpus,
	checkHashLiterals,
	DEAD_HASHES,
	DEAD_HASH_KINDS
} = require("../scripts/lib/hash-literals.cjs");
const { findHostRoot, listFiles, censusDrift, corpusShortfall } = require("../scripts/host-consumers.cjs");

const ROOT = path.join(__dirname, "..");
const CENSUS_PATH = path.join(ROOT, "scripts", "data", "host-token-census.json");

const census = () => JSON.parse(fs.readFileSync(CENSUS_PATH, "utf8"));
const readReal = (f) => fs.readFileSync(f, "utf8");

/** The real scan + the real table, so every assertion below is live by default. */
function live(overrides = {}) {
	const c = overrides.census || census();
	const files = overrides.files || scanTargets();
	const readFile = overrides.readFile || readReal;
	return {
		rows: scanHashLiterals({ files, readFile }),
		table: overrides.table || c.hashes.bases,
		allow: overrides.allow || DEAD_HASHES,
		kinds: overrides.kinds || DEAD_HASH_KINDS,
		corpus: overrides.corpus || { files: c.host.filesScanned, packages: c.host.packagesScanned }
	};
}

/** Prepend a comment line to one file, so the scan is fed real mutated bytes. */
function injecting(rel, line) {
	return (file) => {
		const text = readReal(file);
		return path.resolve(file) === path.resolve(path.join(ROOT, rel)) ? `// ${line}\n${text}` : text;
	};
}

// ── the gate ──────────────────────────────────────────────────────────────

test("#92: every build-hash literal we ship exists in the host corpus", () => {
	const { problems, counts } = checkHashLiterals(live());
	assert.deepEqual(problems, [], `the shipped surface names hashes the host does not have:\n  ${problems.join("\n  ")}`);
	// Guard against a scan that quietly stopped matching anything: a gate that
	// found no literals would satisfy every rule above and prove nothing.
	assert.ok(counts.literals >= 5, `only ${counts.literals} hash literal(s) scanned — the extractor has probably stopped matching`);
	assert.ok(counts.bases >= 5, `only ${counts.bases} distinct hash base(s) — same concern`);
	assert.equal(counts.unmeasured, 0, "every base in our tree must be measured by the frozen census; re-run `npm run host:census`");
});

test("#92: the census records the hash table and says what it measured", () => {
	const c = census();
	assert.ok(c.hashes && c.hashes.bases, "the census must carry a `hashes` section");
	assert.ok(c.hashes.ruler && c.hashes.ruler.length > 100, "the hash ruler must explain how a base is recognised");
	assert.ok(c.hashes.literals >= 5, `the frozen census saw only ${c.hashes.literals} literals`);
	for (const [base, row] of Object.entries(c.hashes.bases)) {
		assert.equal(typeof row.files, "number", `${base}: files must be a number`);
		assert.equal(typeof row.packages, "number", `${base}: packages must be a number`);
	}
});

test("#92: a dead hash cannot survive by being forgotten — it must be reasoned", () => {
	const { findings, counts } = checkHashLiterals(live());
	// The three bases that ARE dead on this host line: they must be allowed,
	// and each allowance must surface as a finding, not vanish into a pass.
	for (const base of ["bqrRRG", "nArs4W", "qDHVXG"]) {
		assert.equal(census().hashes.bases[base].files, 0, `${base} is expected to be 0-hit on this host — if it came back, drop its allowance`);
		assert.ok(DEAD_HASHES[base], `${base} is used in the shipped surface and measures 0 hits: it needs an allowance`);
		assert.ok(
			findings.some((f) => f.startsWith(`${base}_*`)),
			`${base}'s allowance must appear as a finding (it is a dead selector we keep on purpose), got: ${JSON.stringify(findings)}`
		);
	}
	assert.equal(counts.allowed, 3, `expected exactly the three reasoned allowances, got ${counts.allowed}`);
	// An allowance with nothing behind it is a permission, not a decision.
	for (const [base, entry] of Object.entries(DEAD_HASHES)) {
		assert.ok(DEAD_HASH_KINDS.includes(entry.kind), `${base}: unknown kind`);
		assert.ok(entry.why && entry.why.length >= 40, `${base}: the allowance needs a checkable \`why\``);
	}
});

/**
 * J1 (adversarial review 10.8.0): the drift probe publishes a `retired` pool for the
 * anchors kept only for the `0.1.0-rc.6 ~ 0.1.x` line, because on the hosts we can
 * measure they can ONLY ever be missing — and `docs/desktop-support.md` teaches
 * desktop tooling that `anchors.drifted: [] && pending: false` is the only positive
 * "all refinements live" signal. A pool that made that signal unreachable was a red
 * light that could never turn green. The authority for "which hashes are retired" is
 * `DEAD_HASHES`, so the runtime list is derived-and-compared here rather than trusted:
 * a hash retired in the bundle but not reasoned here (or vice versa) reddens this gate
 * instead of quietly changing what the machine contract means.
 */
test("J1: the bundle's retired-anchor pool is exactly the reasoned dead-hash set", () => {
	const bundle = readReal(path.join(ROOT, "lib", "client.js"));
	const block = bundle.match(/const RETIRED_PROBE_GROUPS = \[([\s\S]*?)\];/);
	assert.ok(block, "lib/client.js must declare RETIRED_PROBE_GROUPS (the drift classifier reads it)");
	const bases = [...new Set([...block[1].matchAll(/\.([A-Za-z0-9_-]+)_/g)].map((m) => m[1]))].sort();
	assert.deepEqual(bases, Object.keys(DEAD_HASHES).sort(),
		`retired pool and dead-hash registry must be the same set — bundle: ${bases.join(",")} vs registry: ${Object.keys(DEAD_HASHES).join(",")}`);
	// Every retired group must actually be a probe group, or the pool filters nothing.
	const probes = bundle.match(/const MATERIAL_SELECTOR_PROBES = \[([\s\S]*?)\];/);
	assert.ok(probes, "the probe table must still be readable by this gate");
	for (const sel of [...block[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])) {
		assert.ok(probes[1].includes(sel), `retired group "${sel.slice(0, 40)}" is not in MATERIAL_SELECTOR_PROBES — it would never be sampled`);
	}
	// And the retirement must be measured, not remembered: a dead hash that came back
	// into the corpus is no longer retired, and the gate above already covers the
	// registry side — this side checks the runtime pool did not outlive its evidence.
	for (const base of bases) {
		assert.equal(census().hashes.bases[base].files, 0,
			`${base} is retired in the bundle but the host corpus has it again — un-retire it there first`);
	}
});

test("#94: the corpus is the install, and it is asked for by name", () => {	const c = census();
	assert.ok(c.corpus && Array.isArray(c.corpus.packagesOnDisk), "the census must record the install's package inventory");
	assert.equal(
		c.corpus.packagesWithCode.length + c.corpus.packagesWithoutCode.length,
		c.corpus.packagesOnDisk.length,
		"every package on disk is either scanned or declared as carrying no code — nothing in between"
	);
	assert.ok(c.corpus.packagesWithCode.length >= 100, `only ${c.corpus.packagesWithCode.length} code packages censused — the corpus has shrunk`);
	assert.ok(c.host.packagesScanned === c.corpus.packagesWithCode.length, "`host.packagesScanned` and the inventory must agree");
	// `packagesWithoutCode` is the extension filter's blind spot. It may be
	// empty, but it must be a recorded list, never an unstated assumption.
	assert.ok(Array.isArray(c.corpus.packagesWithoutCode), "the blind spot must be a list, even when it is empty");
});

// ── the live half ─────────────────────────────────────────────────────────

test("#92: with the host installed, the frozen hash table still matches it", (t) => {
	let root;
	try {
		root = findHostRoot();
	} catch (e) {
		t.skip(`host not installed — the hash table was NOT re-measured here (${e.message.split("\n")[0]})`);
		return;
	}
	const files = listFiles(root, [".css", ".js", ".mjs", ".cjs"]);
	const fresh = measureHashCorpus({ index: indexCorpus(files, readReal, root), bases: new Set(Object.keys(census().hashes.bases)) });
	assert.deepEqual(fresh, census().hashes.bases, "the installed host's hash hits differ from the frozen table — re-run `npm run host:census`");
});

test("#94: a shrunken corpus is named, not silently narrower", (t) => {
	let root;
	try {
		root = findHostRoot();
	} catch (e) {
		t.skip(`host not installed — the corpus was NOT re-measured here (${e.message.split("\n")[0]})`);
		return;
	}
	// Control: the real tree does not shrink.
	assert.equal(corpusShortfall(census(), census()).shrank, false, "a census compared against itself must not look shrunken");
	const fresh = require("../scripts/host-consumers.cjs").build({ quiet: true });
	const shortfall = corpusShortfall(fresh, census());
	assert.equal(shortfall.shrank, false, `the installed host lost packages the census knew: ${shortfall.missing.join(", ")}`);
	assert.equal(shortfall.gained.length, 0, `the installed host gained packages the census does not know: ${shortfall.gained.join(", ")} — re-run "npm run host:census"`);
	assert.equal(censusDrift(fresh, census()), false, "the frozen census must match the installed host");
});

// ── mutations: issue #92 asked for each of these by name ──────────────────

test("mutation #92.1: putting the dead hash back in the comment reddens the gate", () => {
	// The issue's mutation 1 — and it has to be a COMMENT, not a CSS rule:
	// the defect was a comment teaching the wrong pattern, and a scanner that
	// only read selector strings would miss it.
	const rows = scanHashLiterals({
		files: scanTargets(),
		readFile: injecting("lib/client.js", "[data-windows-titlebar] .BynINW_frame     { background: var(--dsw-specific-sidebar-fill) }")
	});
	const { problems } = checkHashLiterals({ ...live(), rows });
	assert.ok(
		problems.some((p) => p.startsWith("BynINW_*") && p.includes("lib/client.js:1")),
		`a dead hash written back into a comment must be reported with its site, got: ${JSON.stringify(problems)}`
	);
	// Control: the same file, unmutated, is clean.
	assert.deepEqual(checkHashLiterals(live()).problems, []);
});

test("mutation #92.2: a hash the host DOES have is allowed — this is not a blanket ban", () => {
	const line = "[data-sidebar] .hHd-Xa_footArea { background: transparent }";
	const rows = scanHashLiterals({ files: scanTargets(), readFile: injecting("lib/client.js", line) });
	assert.deepEqual(
		checkHashLiterals({ ...live(), rows }).problems,
		[],
		"a hash that exists in the corpus must stay green, or the gate would push authors to delete useful information"
	);
	// And the table is what decides it, per base — not a remember-the-hash rule.
	const invented = scanHashLiterals({
		files: scanTargets(),
		readFile: injecting("lib/client.js", "[data-shell] .pI_x6G_frame { background: transparent }")
	});
	assert.ok(
		checkHashLiterals({ ...live(), rows: invented }).problems.some((p) => p.startsWith("pI_x6G_*")),
		"an unmeasured base must be reported, so a new literal forces a re-measurement rather than passing on faith"
	);
	assert.deepEqual(
		checkHashLiterals({ ...live(), rows: invented, table: { ...census().hashes.bases, pI_x6G: { files: 2, packages: 1 } } }).problems,
		[],
		"once the corpus is measured for that base, the very same literal must pass — the rule is existence, not prohibition"
	);
});

test("mutation #92.3: a corpus we cannot read is a failure, not an all-clear", () => {
	const { problems } = checkHashLiterals({ ...live(), corpus: { files: 0, packages: 0 } });
	assert.ok(
		problems.some((p) => p.includes("corpus is empty")),
		`"I could not look" must not read like "I looked and it was fine", got: ${JSON.stringify(problems)}`
	);
	// …and a scan that found nothing at all is the same failure from the other side.
	const { problems: none } = checkHashLiterals({ ...live(), rows: [] });
	assert.ok(none.length > 0, "an empty scan must be a problem: every rule above is satisfied vacuously by it");
});

test("mutation #92.4: an allowance that is stale, dead, or unreasoned reddens the gate", () => {
	// The host grew the hash back → the excuse outlived its reason.
	const revived = checkHashLiterals({ ...live(), table: { ...census().hashes.bases, bqrRRG: { files: 5, packages: 2 } } });
	assert.ok(
		revived.problems.some((p) => p.startsWith("bqrRRG") && p.includes("stale")),
		`a revived hash must invalidate its allowance, got: ${JSON.stringify(revived.problems)}`
	);
	// An allowance nothing uses is a permission, not a decision.
	const unused = checkHashLiterals({ ...live(), allow: { ...DEAD_HASHES, Zz9Qq: { kind: "legacy-host-line", since: "0.1.0-rc.6", why: "x".repeat(60) } } });
	assert.ok(
		unused.problems.some((p) => p.startsWith("Zz9Qq") && p.includes("nothing in the shipped surface")),
		`an unused allowance must be reported, got: ${JSON.stringify(unused.problems)}`
	);
	// A one-word reason is not a reason.
	const vague = checkHashLiterals({ ...live(), allow: { ...DEAD_HASHES, nArs4W: { kind: "legacy-host-line", since: "0.1.0-rc.6", why: "old" } } });
	assert.ok(vague.problems.some((p) => p.startsWith("nArs4W") && p.includes("why")));
	// And a kind nobody defined is a typo, not a policy.
	const typo = checkHashLiterals({ ...live(), allow: { ...DEAD_HASHES, qDHVXG: { kind: "legacy", since: "0.1.0-rc.6", why: "x".repeat(60) } } });
	assert.ok(typo.problems.some((p) => p.includes("unknown allowance kind")));
});

test("mutation #94: dropping packages from the corpus reddens the shortfall check", () => {
	const frozen = census();
	const truncated = JSON.parse(JSON.stringify(frozen));
	truncated.corpus.packagesWithCode = truncated.corpus.packagesWithCode.slice(0, 3);
	const { shrank, missing } = corpusShortfall(truncated, frozen);
	assert.equal(shrank, true, "a corpus holding 3 of the census's packages must read as shrunken");
	assert.ok(missing.length > 200, `the shrunken run must name what it lost, named only ${missing.length}`);
	assert.ok(missing.every((p) => typeof p === "string" && p.length > 0), "the missing packages must be named, not just counted");

	// A census with no inventory section at all is the loudest case: the
	// comparison it enables cannot be made, so it must not pass.
	const noCorpus = JSON.parse(JSON.stringify(frozen));
	delete noCorpus.corpus;
	assert.equal(corpusShortfall(noCorpus, frozen).shrank, true, "a census without an inventory must not look identical to a complete one");
	// And the drift comparison must notice the inventory moving.
	const moved = JSON.parse(JSON.stringify(frozen));
	moved.corpus.packagesWithCode = moved.corpus.packagesWithCode.slice(0, 3);
	assert.equal(censusDrift(moved, frozen), true, "a changed corpus must read as drift");
	// `measuredAt` / `root` still must not.
	const clock = JSON.parse(JSON.stringify(frozen));
	clock.measuredAt = "1999-01-01";
	clock.host.root = "D:\\elsewhere";
	assert.equal(censusDrift(clock, frozen), false, "clock/root must NOT read as drift");
});
