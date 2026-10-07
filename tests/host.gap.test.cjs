/**
 * dsh-dream-skin — THE FORWARD TOKEN GAP GATE (issue #88).
 *
 * The inverse question ("we ship it, does anyone read it?") has had a gate
 * since issue #81. This is its other half: **the host paints with this colour
 * token and no skin defines it.**
 *
 * The measurement needs the host installed; the POLICY does not. So the gate
 * is split the same way the script is: `checkGap()` is pure and runs
 * everywhere (against the frozen census), and the live re-measurement runs
 * only where a host exists — where it *declares that it did not run* rather
 * than passing silently, because "we could not check" and "we checked and it
 * is fine" must never look the same.
 *
 * Five mutations at the bottom, one per thing the issue asked to be provable.
 * A gate this new whose only evidence is "it is green today" is exactly what
 * this repository forbids.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const { checkGap, measureGap, shippedTokens } = require("../scripts/lib/host-gap.cjs");
const { DISPOSITIONS, DISPOSITION_KINDS } = require("../scripts/data/host-gap-dispositions.cjs");
const { findHostRoot, listFiles, censusDrift } = require("../scripts/host-consumers.cjs");
const { buildAll } = require("../scripts/skin-system.cjs");

const ROOT = path.join(__dirname, "..");
const CENSUS_PATH = path.join(ROOT, "scripts", "data", "host-token-census.json");
const CLIENT = path.join(ROOT, "lib", "client.js");

const census = () => JSON.parse(fs.readFileSync(CENSUS_PATH, "utf8"));
const clientSource = () => fs.readFileSync(CLIENT, "utf8");

/** The frozen census + the curated policy, run through the pure gate. */
function gate(overrides = {}) {
	const c = overrides.census || census();
	return checkGap({
		gap: c.gap,
		shipped: overrides.shipped || shippedTokens(),
		dispositions: overrides.dispositions || DISPOSITIONS,
		kinds: overrides.kinds || DISPOSITION_KINDS,
		clientSource: overrides.clientSource || clientSource(),
		censusHostVersion: c.host.dshVersion
	});
}

test("#88: every frozen gap carries a disposition and satisfies it", () => {
	const { problems, counts } = gate();
	assert.deepEqual(problems, [], `the frozen gap census does not satisfy its own dispositions:\n  ${problems.join("\n  ")}`);
	// The census must actually BE a census of something. A file whose `entries`
	// quietly went empty would satisfy every assertion below and prove nothing.
	assert.ok(counts.measured >= 10, `only ${counts.measured} gaps measured — the extraction has probably stopped matching the host`);
	assert.equal(
		counts.cover + counts.computed + counts.derived + counts.notSkinned,
		Object.keys(DISPOSITIONS).length,
		"every disposition entry must be exactly one of the four kinds"
	);
});

test("#88: the ruler is recorded, so the gap's scope cannot be quoted out of context", () => {
	const c = census();
	const r = c.gap.ruler;
	assert.ok(r, "the census must record the ruler it used");
	for (const key of ["colourTokensDeclared", "readByHost", "shipped"]) {
		assert.equal(typeof r[key], "number", `ruler.${key} must be a number`);
	}
	assert.ok(r.__comment && r.__comment.length > 80, "the ruler must explain how it differs from the census's token count");
	// The forward ruler is deliberately narrower than the census's; if the two
	// counts ever coincide, one of them has been replaced by the other.
	assert.ok(
		r.colourTokensDeclared < Object.keys(c.tokens).length,
		"the gap ruler must be narrower than the census's token count (colours only, declared only)"
	);
});

test("#88: each disposition kind is used, and every cover really ships", () => {
	const shipped = shippedTokens();
	const byKind = {};
	for (const [token, d] of Object.entries(DISPOSITIONS)) (byKind[d.disposition] ||= []).push(token);
	for (const kind of DISPOSITION_KINDS) {
		assert.ok(byKind[kind] && byKind[kind].length > 0, `no token uses disposition "${kind}" — the vocabulary has a dead word`);
	}
	// A `cover` entry that does not ship is the whole defect this issue is
	// about, so assert it here rather than only inside the generic gate.
	for (const token of byKind.cover) {
		if (DISPOSITIONS[token].since) continue; // forward: not on the installed host yet
		assert.ok(shipped.has(token), `${token} is declared "cover" and the installed host reads it, but no skin ships it`);
	}
	// The design system is the source of truth for `shipped`; spot-check that
	// it really carries the new tokens rather than an empty set passing by luck.
	const built = buildAll();
	assert.ok(built.every((s) => typeof s.tokens["--dsw-focus-ring-color"] === "string"), "every skin ships the focus ring");
	assert.ok(built.every((s) => typeof s.tokens["--dsw-alias-menu-group-header-fill"] === "string"), "every skin ships the stuck-header fill");
});

test("#88: a token declared for a newer host is really newer, and the excuse is dated", () => {
	const c = census();
	for (const [token, d] of Object.entries(DISPOSITIONS)) {
		if (!d.since) continue;
		assert.ok(c.gap.entries[token] === undefined, `${token} declares "since ${d.since}" but the frozen census already measures it — drop the excuse`);
		assert.match(d.since, /^\d+\.\d+\.\d+/, `${token}: \`since\` must be a host version`);
	}
	// And the forward entries must be a subset of what we ship, or "declared
	// for a newer host" is just a longer way of saying "missing".
	const shipped = shippedTokens();
	for (const [token, d] of Object.entries(DISPOSITIONS)) {
		if (d.since) assert.ok(shipped.has(token), `${token} is declared for a newer host but no skin ships it`);
	}
});

// ── the live half: runs only where the host exists, and says so when it does not ──

test("#88: with the host installed, the frozen census still matches it", (t) => {
	let root;
	try {
		root = findHostRoot();
	} catch (e) {
		// NOT a pass. "We could not measure" and "we measured and it is fine"
		// must be distinguishable in the output, or the CI logs will read as an
		// all-clear on a machine that never looked.
		t.skip(`host not installed — the gap census was NOT re-measured here (${e.message.split("\n")[0]})`);
		return;
	}
	const fresh = measureGap({
		hostRoot: root,
		files: listFiles(root, [".css", ".js", ".mjs", ".cjs"])
	});
	const frozen = census();
	const measured = Object.keys(fresh.entries).sort();
	const recorded = Object.keys(frozen.gap.entries).sort();
	assert.deepEqual(
		measured,
		recorded,
		`the installed host's gap differs from the frozen census (host ${root}). Re-frozen gaps:\n` +
		`  new: ${measured.filter((x) => !recorded.includes(x)).join(", ") || "—"}\n` +
		`  gone: ${recorded.filter((x) => !measured.includes(x)).join(", ") || "—"}\n` +
		"Run `npm run host:census` and give every new token a disposition."
	);
});

test("#88: measuring without a usable host THROWS rather than reporting no gaps", () => {
	// The failure mode this guards: a gap measurement that cannot read the host
	// returns `{}`, the suite stays green, and nobody learns that the plugin's
	// coverage was never checked. `checkGap` on an empty gap must also be
	// visibly empty rather than silently clean — see the mutation below.
	assert.throws(
		() => measureGap({ hostRoot: path.join(ROOT, "no-such-host"), files: [] }),
		/design_platform_css_default|ENOENT|no such file/i,
		"a host that cannot be read must throw"
	);
});

// ── mutations: issue #88 asked for each of these by name ───────────────────

test("mutation #88.1: dropping a covered token from the skins reddens the gap gate", () => {
	// The issue's mutation 1. `--dsw-alias-interactive-bg-hover-danger` is read
	// by 8 host packages; un-shipping it must not be silent.
	const shipped = shippedTokens();
	shipped.delete("--dsw-alias-interactive-bg-hover-danger");
	const { problems } = gate({ shipped });
	assert.ok(
		problems.some((p) => p.includes("--dsw-alias-interactive-bg-hover-danger") && p.includes("cover")),
		`un-shipping a covered token must be reported, got: ${JSON.stringify(problems)}`
	);
	// …and the control: with it shipped, no complaint.
	assert.deepEqual(gate().problems, []);
});

test("mutation #88.2: a gap with no disposition reddens the gap gate", () => {
	// The issue's mutation 2. `null` is how the census records "nobody decided".
	const dispositions = { ...DISPOSITIONS, "--dsw-alias-tooltip-key-bg": { disposition: null } };
	const { problems } = gate({ dispositions });
	assert.ok(
		problems.some((p) => p.includes("--dsw-alias-tooltip-key-bg")),
		`an undispositioned gap must be named, got: ${JSON.stringify(problems)}`
	);
	// An invented disposition is a typo, not a policy.
	const { problems: bad } = gate({ dispositions: { ...DISPOSITIONS, "--dsw-alias-bg-mask-1": { disposition: "ignore" } } });
	assert.ok(bad.some((p) => p.includes("unknown disposition")), `a non-vocabulary disposition must be rejected, got: ${JSON.stringify(bad)}`);
});

test("mutation #88.3: shipping a token declared out-of-scope reddens the REVERSE gate", () => {
	// The issue's mutation 3, and the more interesting direction: the boundary
	// has to hold both ways, or "we decided not to skin the modal mask" is a
	// comment rather than a decision.
	const shipped = shippedTokens();
	shipped.add("--dsw-alias-bg-mask-1");
	const { problems } = gate({ shipped });
	assert.ok(
		problems.some((p) => p.includes("--dsw-alias-bg-mask-1") && p.includes("not-skinned")),
		`covering an out-of-scope token must be reported, got: ${JSON.stringify(problems)}`
	);
});

test("mutation #88.3b: a `computed` token whose anchor is gone reddens the gate", () => {
	// `--dsw-specific-menu` is legitimately NOT a skin token because the plugin
	// recomputes it every publish. If that code is ever refactored away, the
	// exemption silently becomes a hole.
	const { problems } = gate({ clientSource: clientSource().replace(/POPUP_TOKENS/g, "SOMETHING_ELSE") });
	assert.ok(
		problems.some((p) => p.includes("--dsw-specific-menu") && p.includes("POPUP_TOKENS")),
		`a stale \`computed\` anchor must be reported, got: ${JSON.stringify(problems)}`
	);
});

test("mutation #88.4: the drift comparison is sensitive to the host VERSION, not just the token list", () => {
	// The issue's mutation 4. A census that compares token names but not the
	// host it measured them on would call two different products identical.
	const frozen = census();
	assert.equal(censusDrift(frozen, frozen), false, "an unchanged census must not report drift");
	const bump = (mutate) => {
		const copy = JSON.parse(JSON.stringify(frozen));
		mutate(copy);
		return censusDrift(copy, frozen);
	};
	assert.equal(bump((c) => { c.host.dshVersion = "9.9.9"; }), true, "a changed dsh version must read as drift");
	assert.equal(bump((c) => { c.host.uiThemeVersion = "9.9.9"; }), true, "a changed theme-package version must read as drift");
	assert.equal(bump((c) => { c.tokens["--dsw-test-only"] = { declares: 0, consumers: 0, mentions: 1, files: 1 }; }), true, "a new token must read as drift");
	assert.equal(bump((c) => { c.gap.entries["--dsw-alias-bg-mask-1"].consumers += 1; }), true, "a changed consumer count must read as drift");
	assert.equal(bump((c) => { c.gap.ruler.colourTokensDeclared += 1; }), true, "a changed ruler must read as drift");
	// `measuredAt` moves on every regeneration and `root` is machine-specific:
	// comparing either would make every run look like drift.
	assert.equal(bump((c) => { c.measuredAt = "1999-01-01"; c.host.root = "D:\\elsewhere"; }), false, "clock/root must NOT read as drift");
});

test("mutation #88.5: the GATE is the test, not the script's exit code", () => {
	// The issue's mutation 5, answered structurally. `main()`'s
	// `process.exitCode = 1` is a convenience for a human running the script;
	// the suite does not read it. So deleting that line cannot make this file
	// green — every assertion above calls `checkGap` directly. This test pins
	// both halves of that claim.
	const src = fs.readFileSync(path.join(ROOT, "scripts", "host-consumers.cjs"), "utf8");
	assert.match(src, /process\.exitCode = 1/, "the script should still exit non-zero for a human running it by hand");
	// The proof that the suite does not depend on it: break the gap by hand and
	// get a complaint while the exit-code line is irrelevant (never executed
	// here). Deleting a measured entry is the cleanest break available — the
	// token is still dispositioned, so rule 2 names the orphan.
	const broken = census();
	delete broken.gap.entries["--dsw-alias-bg-mask-1"];
	const { problems } = gate({ census: broken });
	assert.ok(
		problems.some((p) => p.includes("--dsw-alias-bg-mask-1")),
		"a broken gap must redden this suite with the script nowhere in the loop"
	);
	// And a census whose gap section is missing entirely is the loudest case.
	const noGap = census();
	delete noGap.gap;
	const { problems: empty } = gate({ census: noGap });
	assert.ok(empty.length > 0, "a census with no gap section must not pass as clean");
});
