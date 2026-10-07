/**
 * dsh-dream-skin — HOST REGIONS WE WATCH BUT DO NOT PAINT (issue #90).
 *
 * 0.2.1-alpha.1 added `renderSlot("shell.bottom", {})` into a `data-shell-bottom`
 * element painted with `var(--dsw-alias-bg-base)` — our canvas wash token. It is
 * a real risk (a full-width strip that could let content read through) AND a
 * real measurement (nothing registers the slot; an empty slot in an `auto` grid
 * row collapses).
 *
 * This file exists so that "nothing to paint" is a DECISION with an expiry
 * date rather than a sentence somebody wrote once. Three rules, each of which
 * can fail:
 *
 *   - the region must be measured by the census, not remembered;
 *   - an `unmounted` disposition is only valid while the measured registrant
 *     count is 0 — the moment the corpus moves, the gate reddens;
 *   - the excuse is dated (`since`), and a `since` that is not newer than the
 *     census host is not an excuse, it is an error.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const { HOST_SLOTS, SLOT_DISPOSITIONS, checkSlots } = require("../scripts/lib/host-slots.cjs");
const { findHostRoot, listFiles } = require("../scripts/host-consumers.cjs");

const ROOT = path.join(__dirname, "..");
const CENSUS = path.join(ROOT, "scripts", "data", "host-token-census.json");

const census = () => JSON.parse(fs.readFileSync(CENSUS, "utf8"));
const readReal = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const live = (overrides = {}) => {
	const c = overrides.census || census();
	return {
		slots: overrides.slots || c.slots,
		story: overrides.story || { files: c.host.filesScanned, packages: c.host.packagesScanned },
		allow: overrides.allow || HOST_SLOTS,
		kinds: overrides.kinds || SLOT_DISPOSITIONS,
		hostVersion: overrides.hostVersion !== undefined ? overrides.hostVersion : c.host.dshVersion
	};
};

// ── the gate ──────────────────────────────────────────────────────────────

test("#90: every watched host region is measured and dispositioned", () => {
	const { problems, counts } = checkSlots(live());
	assert.deepEqual(problems, [], `the watched-region list is out of step with its measurement:\n  ${problems.join("\n  ")}`);
	assert.ok(counts.watched >= 1, 'a watch list that measures nothing satisfies every rule below vacuously');
	assert.equal(counts.unmounted, counts.watched, 'the only disposition that currently fits "nothing registers it" is `unmounted`');
});

test("#90: the bottom region is a recorded fact, not an assumption", () => {
	const c = census();
	const row = c.slots && c.slots.entries["shell.bottom"];
	assert.ok(row, 'the census must record the shell bottom region');
	assert.equal(row.registrants, 0, 'the frozen corpus registers nothing in shell.bottom — if this changed, the disposition must be taken again');
	assert.equal(row.anchorFiles, 0, 'the `data-shell-bottom` anchor does not exist on the frozen host — recorded, with `since` explaining why');
	assert.ok(c.slots.ruler && c.slots.ruler.length > 100, 'the slot ruler must explain what "registrant" means here');
	const { findings } = checkSlots(live());
	assert.ok(
		findings.some((f) => f.startsWith("shell.bottom")),
		`"we watch this and paint nothing" must be VISIBLE in the gate's output, got: ${JSON.stringify(findings)}`
	);
	// And the region must be dated: the excuse has to expire.
	assert.match(HOST_SLOTS["shell.bottom"].since, /^\d+\.\d+\.\d+/, 'the region needs the host version that introduced it');
});

test("#90: the boundary is published, with the measurements that justify it", () => {
	// The decision lives in an internal data file; the user-visible boundary
	// has to live in the user-visible document. Both halves, or the "known
	// limitation" section is a promise nobody can check.
	const doc = readReal("docs/desktop-support.md");
	for (const token of ["data-shell-bottom", "pI_x6G_bottomRow", "minmax(0, 1fr) auto", "shell.bottom"]) {
		assert.ok(doc.includes(token), `docs/desktop-support.md must record the bottom-region evidence (\`${token}\`)`);
	}
	assert.match(
		doc,
		/shell\.bottom[\s\S]{0,400}(0|零)/,
		'docs/desktop-support.md must state the measured registrant count next to the region, not just name it'
	);
});

// ── the live half ─────────────────────────────────────────────────────────

test("#90: with the host installed, the watched-region counts still match the frozen census", (t) => {
	let root;
	try {
		root = findHostRoot();
	} catch (e) {
		t.skip(`host not installed — the watched regions were NOT re-measured here (${e.message.split("\n")[0]})`);
		return;
	}
	const files = listFiles(root, [".css", ".js", ".mjs", ".cjs"]);
	const cached = new Map();
	const readFile = (f) => {
		if (!cached.has(f)) cached.set(f, fs.readFileSync(f, "utf8"));
		return cached.get(f);
	};
	const fresh = {};
	for (const [name, spec] of Object.entries(HOST_SLOTS)) {
		let registrants = 0;
		let anchorFiles = 0;
		for (const file of files) {
			const text = readFile(file);
			if (text.includes(name)) registrants += 1;
			if (spec.anchor && text.includes(spec.anchor)) anchorFiles += 1;
		}
		fresh[name] = { registrants, anchorFiles };
	}
	const frozen = census().slots.entries;
	for (const [name, row] of Object.entries(fresh)) {
		assert.equal(row.registrants, frozen[name].registrants, `${name}: registrant count moved — re-run \`npm run host:census\` and re-take the decision`);
		assert.equal(row.anchorFiles, frozen[name].anchorFiles, `${name}: anchor presence moved — re-run \`npm run host:census\``);
	}
});

// ── mutations: issue #90 asked for a gate that can fail ───────────────────

test("mutation #90.1: a registrant appearing reddens the watched-region gate", () => {
	// The whole point of the disposition: the day the face is live, "nothing to
	// paint" must stop being an acceptable answer.
	const c = census();
	const grown = JSON.parse(JSON.stringify(c));
	grown.slots.entries["shell.bottom"] = { registrants: 1, anchorFiles: 1, mentions: ["dsh-client-ui-something/lib/client.js"] };
	const { problems } = checkSlots(live({ census: grown }));
	assert.ok(
		problems.some((p) => p.startsWith("shell.bottom") && p.includes("the face is live")),
		`a live face must invalidate its disposition, got: ${JSON.stringify(problems)}`
	);
});

test("mutation #90.2: a corpus we cannot read, or an empty watch list, reddens the gate", () => {
	const { problems } = checkSlots(live({ story: { files: 0, packages: 0 } }));
	assert.ok(problems.some((p) => p.includes("corpus is empty")), 'a corpus we cannot read must not look like "nothing registers it"');
	const { problems: none } = checkSlots(live({ slots: { ruler: "x", entries: {} } }));
	assert.ok(none.some((p) => p.includes("no slot was measured")), 'an empty watch list must be a problem, not a pass');
});

test("mutation #90.3: an undispositioned region, an invented kind, and a stale entry all redden", () => {
	const c = census();
	const undispositioned = checkSlots(live({ allow: {} }));
	assert.ok(undispositioned.problems.some((p) => p.includes("nobody has decided")), 'an undecided region must be named');
	const typo = checkSlots(live({ allow: { "shell.bottom": { ...HOST_SLOTS["shell.bottom"], disposition: "ignored" } } }));
	assert.ok(typo.problems.some((p) => p.includes("unknown disposition")), 'a non-vocabulary word is a typo, not a policy');
	// A region nobody measured cannot carry a disposition.
	const stale = checkSlots(live({ slots: { ruler: c.slots.ruler, entries: {} } }));
	assert.ok(stale.problems.some((p) => p.includes("not measured by the census")), 'a disposition for an unmeasured region must be reported');
	// …and neither can a region with no stable anchor.
	const noAnchor = checkSlots(live({ allow: { "shell.bottom": { ...HOST_SLOTS["shell.bottom"], anchor: "" } } }));
	assert.ok(noAnchor.problems.some((p) => p.includes("stable `anchor`")), 'the anchor is what a future rule would use; it must be named');
});

test("mutation #90.4: a `unmounted` claim on a host that should already have the region reddens", () => {
	// Forward-dating: "it arrives in a version newer than the one we measured"
	// is legitimate. Back-dating is not — a region that should exist on the
	// measured host and measures 0 registrants is an extraction bug, not a fact.
	const { problems } = checkSlots(live({ hostVersion: "0.3.0" }));
	assert.ok(
		problems.some((p) => p.startsWith("shell.bottom") && p.includes("must not be excused by a future version")),
		`a stale \`since\` must be reported, got: ${JSON.stringify(problems)}`
	);
	// And the live host really is older than the region — the control that makes
	// the rule above meaningful rather than decorative.
	assert.ok(census().host.dshVersion < HOST_SLOTS["shell.bottom"].since, 'the region must be newer than the measured host');
});

test("mutation #90.5: a disposition on a face that is not there reddens the gate", () => {
	// `skinned` means "we paint this region". Claiming it about a region with 0
	// registrants is a rule written against nothing — the exact failure mode
	// this repository deletes rather than documents.
	const { problems } = checkSlots(live({ allow: { "shell.bottom": { ...HOST_SLOTS["shell.bottom"], disposition: "skinned" } } }));
	assert.ok(
		problems.some((p) => p.includes("describes a face that is not there")),
		`a disposition describing an absent face must be reported, got: ${JSON.stringify(problems)}`
	);
});

module.exports = { checkSlots, HOST_SLOTS };
