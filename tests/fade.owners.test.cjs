/**
 * dsh-dream-skin — WHO ELSE ADDRESSES `_fade` (issue #105).
 *
 * Issue #97 made the session-list foot fade hash-free with `[class$="_fade"]`. That choice
 * buys durability and pays in scope, and the 10.8.1 review round left the payment as a
 * sentence in a comment: a third-party theme pack installed on the same machine writes
 * `[class*="_fade"]` against the same face, "which rule wins" was never measured, and the
 * classification trap that fooled the reviewer once (`@keyframes BInVoG_fade-in` looks like
 * a second hit, and is not) had no test either.
 *
 * This file is the gate. Three things it can fail on:
 *   - an owner of `_fade`-shaped selectors with no recorded disposition (measured, then
 *     decided — the issue #95 shape);
 *   - a disposition that no longer matches the measurement (a `no-impact` claim on a token
 *     our anchor CAN address, a `host-target` whose face moved away);
 *   - a classifier that slides: the three traps below are exactly the shapes that were
 *     mis-read during the review, so they are pinned as data, not as prose.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const { FADE_DISPOSITIONS, OUR_FADE_ANCHOR, classifyOccurrence, measureFade, checkFade } = require("../scripts/lib/fade-owners.cjs");
const { fadeGate } = require("../scripts/host-consumers.cjs");

const ROOT = path.join(__dirname, "..");
const CENSUS = path.join(ROOT, "scripts", "data", "host-token-census.json");
const census = () => JSON.parse(fs.readFileSync(CENSUS, "utf8"));

// ── the frozen measurement itself ─────────────────────────────────────────

test("#105: the census records the fade owners, with provenance for both corpora", () => {
	const c = census();
	assert.ok(c.fade, "the census must carry a fade section");
	assert.ok(c.fade.ruler && c.fade.ruler.length > 100, "and a ruler saying what an owner is");
	assert.equal(c.fade.anchor, OUR_FADE_ANCHOR, "the anchor under test is the shipped one");
	const kinds = (c.fade.corpora || []).map((x) => x.kind);
	assert.ok(kinds.includes("host"), "the host corpus is part of the measurement");
	assert.ok(kinds.includes("plugin"), "so is the third-party plugin corpus — that is where the review found the other owner");
	const owners = Object.keys(c.fade.owners);
	assert.ok(owners.length >= 3, `expected several owners, got ${owners.length}`);
});

test("#105: the two package families the review identified are the ones our anchor can reach", () => {
	const c = census();
	const rows = c.fade.owners;
	const addressable = Object.entries(rows).filter(([, r]) => r.suffixAddressable).map(([p]) => p).sort();
	assert.deepEqual(addressable, [
		"@deepseek-ai/dsh-client-ui-workspace",
		"@linxin666/dsh-client-ui-skin-center"
	], "exactly these two: the face our anchor exists for, and the third-party plugin that shares it");
	// The pairs the reviewer checked by hand, frozen so the next round does not have to.
	assert.equal(rows["@deepseek-ai/dsh-client-ui-chat"].suffixAddressable, false,
		"fadeTop/fadeBottom are selector-shaped but do NOT end in `_fade` — the suffix anchor cannot reach them");
	assert.equal(rows["@deepseek-ai/dsh-client-ui-chat"].selectorOccurrences > 0, true,
		"...and they ARE selectors, which is why the classifier has to distinguish the two questions");
	assert.equal(rows["@deepseek-ai/dsh-client-ui-attachment"].selectorOccurrences, 0,
		"the `_fade-in` in the attachment package is a @keyframes name, not a class");
	assert.equal((rows["@linxin666/dsh-pet"] || {}).selectorOccurrences, 0,
		"the Live2D vendor's `this._fadeInSeconds` fields are identifiers, not selectors");
});

test("#105: every owner in the frozen census is dispositioned, and the gate agrees", () => {
	const c = census();
	const { problems, notices } = fadeGate(c.fade, c.fade);
	assert.deepEqual(problems, [], `the recorded decisions are out of step with the measurement:\n  ${problems.join("\n  ")}`);
	assert.deepEqual(notices, [], "nothing to declare on the machine the census was generated on");
	const coexist = FADE_DISPOSITIONS["@linxin666/dsh-client-ui-skin-center"];
	assert.ok(coexist && coexist.kind === "coexistent", "the shared face is recorded as accepted coexistence, not as a surprise");
	assert.match(coexist.note, /wash:check|coexistence stage|measured/,
		"and the note points at the engine measurement that settles who wins");
});

// ── the classifier, pinned on the traps that fooled a human ───────────────

test("#105: the classifier separates selectors from identifiers and animation names", () => {
	const cases = [
		{ text: '.bhn1Oq_fade{left:0}', token: '_fade', shape: 'class' },
		{ text: 'overflow:hidden}.bhn1Oq_fade{left:0}', token: '_fade', shape: 'class' },
		{ text: '.O_Ebla_fadeTop{mask-image:none}', token: '_fadeTop', shape: 'class' },
		{ text: '[data-slot="sidebar.workspaces"] [class*="_fade"]{background:none}', token: '_fade', shape: 'attr' },
		{ text: '@keyframes BInVoG_fade-in{0%{opacity:0}}', token: '_fade-in', shape: 'keyframes' },
		// Blue-team B1: an animation EARLIER in the window must not turn a later class rule into
		// a keyframes name — the loose form skipped that owner's disposition entirely.
		{ text: '.btn{animation:pulse 1s}.skinshop_fade{bottom:0}', token: '_fade', shape: 'class' },
		{ text: '.btn{animation-name:pulse}.skinshop_fade{bottom:0}', token: '_fade', shape: 'class' },
		// Third-party 10.9.0 T3: a class selector whose continuation is a pseudo/combinator — the
		// first version only accepted `,`/`{` right after the token and filed these as identifiers.
		{ text: '.skinshop_fade:hover{background:none}', token: '_fade', shape: 'class' },
		{ text: '.skinshop_fade>span{background:none}', token: '_fade', shape: 'class' },
		{ text: ':is(.skinshop_fade){background:none}', token: '_fade', shape: 'class' },
		// Adjudication 10.9.0 R1: chained type/class selectors — a JS member access can never be
		// followed by `{`, which is what makes these decidable; the flat guard read them as
		// identifiers and let the owner skip its disposition entirely.
		{ text: 'div.shop_fade{bottom:0}', token: '_fade', shape: 'class' },
		{ text: '.a.shop_fade{bottom:0}', token: '_fade', shape: 'class' },
		// Blue-team B8: a class name written only from JS still paints an element our anchor
		// reaches; it gets its own shape so the gate demands a decision.
		{ text: 'el.classList.add("shop_fade")', token: '_fade', shape: 'js-class' },
		{ text: 'node.className = "shop_fade"', token: '_fade', shape: 'js-class' },
		{ text: 'render({ class: "shop_fade" })', token: '_fade', shape: 'js-class' },
		{ text: 'this._fadeInSeconds=-1,this._weight=1', token: '_fadeInSeconds', shape: 'identifier' },
		{ text: 'if(i=o,this._fadeTimeSeconds==0){a=1}', token: '_fadeTimeSeconds', shape: 'identifier' },
		{ text: 'a+=t/this._fadeTimeSeconds,a>1&&(a=1)', token: '_fadeTimeSeconds', shape: 'identifier' },
		{ text: '"fade": "bhn1Oq_fade", "flatList"', token: '_fade', shape: 'identifier' }
	];
	for (const c of cases) {
		const at = c.text.indexOf("_fade");
		assert.ok(at >= 0, `fixture must contain _fade: ${c.text}`);
		const got = classifyOccurrence(c.text, at);
		assert.equal(got.token, c.token, `token for ${JSON.stringify(c.text)}`);
		assert.equal(got.shape, c.shape, `shape for ${JSON.stringify(c.text)}`);
	}
});

test("#105: the census can be handed a fresh corpus and still calls the same owners", () => {
	// Same shapes, synthetic package names: the classifier must not be tuned to the packages
	// that happen to be installed today. One addressable owner, one that is not.
	const files = { "a.js": '.aaa_root{x:1}.aaa_fade{bottom:0}', "b.js": '.bbb_scroll .bbb_fadeTop{mask-image:none}' };
	const owners = measureFade(Object.keys(files), (f) => files[f], (f) => f);
	assert.equal(owners["a.js"].suffixAddressable, true, 'a class token ending in `_fade` is addressable');
	assert.equal(owners["b.js"].suffixAddressable, false, 'a `_fadeTop` token is not');
	const { problems } = checkFade({
		owners,
		dispo: { "a.js": { kind: "host-target", since: "10.9.0" }, "b.js": { kind: "no-impact", since: "10.9.0" } },
		corpora: [{ kind: "host", exists: true, packages: 1 }]
	});
	assert.deepEqual(problems, [], 'the synthetic corpus grades clean when its dispositions match');
});

// ── mutations: the gate has to be able to fail ────────────────────────────

test("mutation #105.1: a NEW owner of `_fade` reddens the gate by name", () => {
	const c = census();
	const owners = { ...c.fade.owners, "@third-party/theme-shop": { occurrences: 4, tokens: { _fade: 4 }, shapes: { class: 4 }, files: 1, suffixAddressable: true, selectorOccurrences: 4, samples: [] } };
	const { problems } = checkFade({ owners, dispo: FADE_DISPOSITIONS, corpora: c.fade.corpora });
	assert.equal(problems.length, 1, 'exactly one problem: the newcomer');
	assert.match(problems[0], /"@third-party\/theme-shop"/, 'and it is NAMED — "census drift" would not be enough');
});

test("mutation #105.2: a disposition that contradicts the measurement reddens", () => {
	const c = census();
	const owners = { ...c.fade.owners };
	// The coexistence package demoted to "no impact" while its token is still addressable:
	// the exact silent-green shape this gate exists to refuse.
	owners["@linxin666/dsh-client-ui-skin-center"] = { ...owners["@linxin666/dsh-client-ui-skin-center"] };
	const demoted = { ...FADE_DISPOSITIONS, "@linxin666/dsh-client-ui-skin-center": { kind: "no-impact", since: "10.9.0" } };
	const { problems } = checkFade({ owners, dispo: demoted, corpora: c.fade.corpora });
	assert.equal(problems.length, 1);
	assert.match(problems[0], /no-impact but our .* can address its class/);
	// And the mirror: the host face claimed as target while nothing it draws is addressable.
	const moved = { ...owners, "@deepseek-ai/dsh-client-ui-workspace": { ...owners["@deepseek-ai/dsh-client-ui-workspace"], suffixAddressable: false } };
	const out = checkFade({ owners: moved, dispo: FADE_DISPOSITIONS, corpora: c.fade.corpora });
	assert.ok(out.problems.some((p) => /host-target but nothing it draws is addressable/.test(p)), JSON.stringify(out.problems));
});

test("mutation #105.3: a corpus nobody looked at is DECLARED, not read as 'nobody else uses it'", () => {
	const c = census();
	const corpora = [
		{ kind: 'host', path: 'x', exists: true, packages: 287 },
		{ kind: 'plugin', path: 'y', exists: false, packages: 0 }
	];
	const { problems, notices } = checkFade({ owners: c.fade.owners, dispo: FADE_DISPOSITIONS, corpora });
	assert.deepEqual(problems, [], 'a missing corpus is not a disagreement with the census');
	assert.equal(notices.length, 1, 'but it must be said out loud');
	assert.match(notices[0], /NOT RE-MEASURED/, 'in words that cannot be mistaken for a pass');
	assert.match(notices[0], /plugin/, 'naming which half went unverified');
	// The other direction: a gate that cannot see any owner at all is broken, not green.
	const empty = checkFade({ owners: {}, dispo: FADE_DISPOSITIONS, corpora });
	assert.equal(empty.problems.length, 1);
	assert.match(empty.problems[0], /no owner at all/);
});

test("mutation #105.5: a `coexistent` claim that cannot happen reddens (blue-team B6)", () => {
	// `coexistent` used to be the one kind with no measurement attached: pre-registering a
	// package that does not exist, or filing an unaddressable owner under it, both kept the
	// gate green. The claim means "somebody else CAN hit this face", so it has to hold.
	const c = census();
	const chat = c.fade.owners["@deepseek-ai/dsh-client-ui-chat"];
	const owners = { ...c.fade.owners, "@deepseek-ai/dsh-client-ui-chat": { ...chat, suffixAddressable: false } };
	const dispo = { ...FADE_DISPOSITIONS, "@deepseek-ai/dsh-client-ui-chat": { kind: "coexistent", since: "10.9.0" } };
	const { problems } = checkFade({ owners, dispo, corpora: c.fade.corpora });
	assert.ok(problems.some((p) => /coexistent but our .* cannot address/.test(p)),
		`an unaddressable owner filed as coexistence must redden, got ${JSON.stringify(problems)}`);
	// And a pre-registered package that was never measured is no longer waved through either —
	// unless its corpus was genuinely not scanned here (that case is a NOTICE, tested above).
	const phantom = checkFade({
		owners: c.fade.owners,
		dispo: { ...FADE_DISPOSITIONS, "@future/theme-shop": { kind: "coexistent", since: "10.9.0" } },
		corpora: c.fade.corpora,
		known: Object.keys(c.fade.owners)
	});
	assert.ok(phantom.problems.some((p) => /"@future\/theme-shop" \(coexistent\) has no measured owner/.test(p)),
		`a claim about a package that is not in the corpus must redden, got ${JSON.stringify(phantom.problems)}`);
});

test("#105 (blue-team B2): the frozen census compare must ignore the third-party corpus", () => {
	// The census is frozen on ONE machine, and the plugin half of it is whatever that machine
	// had installed. Folding `fade.owners` into the byte-compare made "I do not have that
	// plugin" arrive as "the host moved" — it reddened this repo's own host test on a machine
	// whose profile differed. The fade half has its own named gate; the byte-compare does not
	// get to speak for it.
	const { censusDrift } = require("../scripts/host-consumers.cjs");
	const c = census();
	const without = JSON.parse(JSON.stringify(c));
	without.fade.owners["@linxin666/dsh-client-ui-skin-center"] = { occurrences: 99, tokens: { _fade: 99 }, shapes: { attr: 99 }, files: 9, suffixAddressable: true, selectorOccurrences: 99, samples: [] };
	assert.equal(censusDrift(without, c), false, "a census that differs ONLY in the plugin corpus is not host drift");
	const moved = JSON.parse(JSON.stringify(c));
	moved.host.dshVersion = "9.9.9";
	assert.equal(censusDrift(moved, c), true, "…while a host difference is still drift");
});

test("mutation #105.6: a plugin that is simply NOT INSTALLED is a notice, not a stale claim (T2)", () => {
	// The other direction of the roster: the corpora were readable, they just do not contain
	// the package. That is "cannot re-verify here", and treating it as a disagreement made
	// `host:census:check` exit 1 on any machine with a different plugin set.
	const c = census();
	const owners = { ...c.fade.owners };
	delete owners["@linxin666/dsh-client-ui-skin-center"];
	const corpora = c.fade.corpora.map((x) => (x.kind === 'plugin' ? { ...x, exists: true, packages: 5, names: ['@linxin666/dsh-client-ui-git-graph'] } : x));
	const { problems, notices } = checkFade({ owners, dispo: FADE_DISPOSITIONS, corpora, known: Object.keys(c.fade.owners) });
	assert.deepEqual(problems, [], 'a package that is not installed here cannot disagree with the frozen census');
	assert.ok(notices.some((n) => /NOT RE-VERIFIED here/.test(n) && /skin-center/.test(n)), `expected a named notice, got ${JSON.stringify(notices)}`);
	// …but a host package missing from the roster IS a problem: the host corpus is always read.
	const hostGone = { ...owners };
	delete hostGone["@deepseek-ai/dsh-client-ui-workspace"];
	const out = checkFade({ owners: hostGone, dispo: FADE_DISPOSITIONS, corpora });
	assert.ok(out.problems.some((p) => /workspace/.test(p) && /no measured owner/.test(p)),
		`the host face is measured from the always-present corpus, got ${JSON.stringify(out.problems)}`);
});

test("mutation #105.4: an owner that disappears from the corpus takes its claim with it", () => {
	const c = census();
	const owners = { ...c.fade.owners };
	delete owners["@deepseek-ai/dsh-client-ui-workspace"];
	const { problems } = checkFade({ owners, dispo: FADE_DISPOSITIONS, corpora: c.fade.corpora });
	assert.ok(problems.some((p) => /has no measured owner/.test(p) && /workspace/.test(p)),
		`the host face vanishing is a claim to re-take, got ${JSON.stringify(problems)}`);
});
