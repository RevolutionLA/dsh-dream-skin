/**
 * dsh-dream-skin — THE CONVERSATION FONT-SIZE RANGE (issue #93).
 *
 * The host's conversation-text stepper went from `12–17 px` to `10–22 px` in
 * **0.2.0-rc.2** — that is `latest`, so new installs already run in the wider
 * range — while every readability conclusion this repo has ever published was
 * measured at the **14 px default**. The two new extremes (10 px and 22 px)
 * have had **zero** samples.
 *
 * What this file can and cannot do, stated up front so nobody reads more into
 * a green run than is there:
 *
 *   CAN — hold the DISCLOSURE still. The dated entry must exist, must carry a
 *   date, must agree with the frozen host tarball reading, must quote the
 *   host's own "small text and code keep fixed sizes" carve-out, and must not
 *   be replaced by a claim that the extremes were measured.
 *
 *   CAN — hold the BEHAVIOUR that makes the claim true: we never write the
 *   host's font ladder (`--dsh-content-font*`), and every `fontSize` literal in
 *   the bundle is a plugin-UI constant at or below the 14 px default.
 *
 *   CANNOT — sample 10 px or 22 px. That needs a live page in a sacrificial
 *   install; upgrading the machine's own install is out of bounds, so this
 *   gate pins the admission rather than the observation. The observation stays
 *   manual.
 *
 * The host facts are frozen in `tests/fixtures/host_font_scale.json`, read out
 * of the real npm tarballs of `@deepseek-ai/dsh-client-ui-theme` (rc.1 / rc.2 /
 * alpha.1). Two of them are worth naming because they are not in the issue
 * text: the widening changed the stepper BOUNDS only (the ladder derivation
 * sentence is byte-identical across all three versions), and the host's own
 * secondary-tier rule puts that tier at **9 px** when the setting is 10 px.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

const FIXTURE_PATH = path.join(__dirname, "fixtures", "host_font_scale.json");
const EVIDENCE_DOC = "docs/desktop-support.md";
const BUNDLE = "lib/client.js";

/** Every document a user reads before believing a compatibility claim. */
const CLAIM_DOCS = [
	"README.md",
	"docs/i18n/README.de.md",
	"docs/i18n/README.en.md",
	"docs/i18n/README.es.md",
	"docs/i18n/README.fr.md",
	"docs/i18n/README.ja.md",
	"docs/i18n/README.ko.md",
	"docs/i18n/README.ru.md",
	"docs/desktop-support.md"
];

/**
 * Fold the typographic dashes and relations the host README uses (−, ≤, –)
 * onto their ASCII spellings so a needle can be built from the fixture instead
 * of being retyped here. Retyping is how a gate quietly starts checking its own
 * copy of a fact rather than the fact.
 */
const norm = (s) =>
	String(s)
		.replace(/[\u2212\u2013\u2014]/g, "-")
		.replace(/\u2264/g, "<=")
		.replace(/\u2265/g, ">=");

/**
 * The phrasing that lets a reader stop worrying, i.e. exactly what we must not
 * write. The required form instead names the range and says the extremes are
 * unsampled. A pattern, not a literal, so the gate does not become a second
 * copy of the thing it bans — and the evidence doc is exempt, because it has to
 * quote the banned phrasing in order to forbid it (same shape as #87's flag).
 */
const BANNED_PHRASING = [/在宿主默认字号下/, /默认字号下/, /at the host'?s default font size/i];

/** A claim of completion that no measurement supports. */
const FALSE_COMPLETION = [
	/极值已测/,
	/全区间已(?:验证|实测|测过)/,
	/extremes (?:are|have been|were) (?:verified|measured|sampled)/i
];

/** The disclaimer the narrowed phrasing must carry. */
const DISCLAIMER = "在宿主字号 10–22 区间内的默认值 14 px 下实测，极值未测";

/** The dated bullet that has to survive in the unverified list. */
const DATED_ENTRY = "会话字号极值：两条分开记，各零次实测";
const DATE_RE = /记录日期 (\d{4}-\d{2}-\d{2})/;

/** A doc that states the host range obliges the disclaimer. */
const RANGE_MENTION = /10[-]22|10 (?:to|through) 22/;

/** The disclaimer may also be spelled in English. */
const DISCLAIMER_ALT = /extremes are (?:unsampled|not sampled|untested)/;

const stripLinkTarget = (s) => String(s).replace(/\(\[[^\]]*\]\([^)]*\)\)/g, "(LINK)");

/**
 * Pure gate. Takes the evidence doc, the fixture, the bundle source and every
 * document that could carry a claim; returns what is wrong. No I/O, so the
 * mutations below can break one thing at a time.
 */
function checkFontScale({ doc, fixture, bundle, docs }) {
	const problems = [];
	const findings = [];
	const docN = norm(doc);

	// ── the fixture must still be the thing the doc is comparing against ─────
	const versions = fixture && fixture.versions;
	if (!versions || !versions["0.2.0-rc.1"] || !versions["0.2.0-rc.2"] || !versions["0.2.1-alpha.1"]) {
		problems.push("font-scale fixture lost one of its three host versions — the comparison has no frame");
		return { problems, findings };
	}
	const rc1 = versions["0.2.0-rc.1"];
	const rc2 = versions["0.2.0-rc.2"];
	const alpha = versions["0.2.1-alpha.1"];

	if (JSON.stringify(rc1.range) !== JSON.stringify([12, 17])) {
		problems.push(`the fixture no longer records rc.1's 12-17 px range (saw ${JSON.stringify(rc1.range)})`);
	}
	if (JSON.stringify(rc2.range) !== JSON.stringify([10, 22])) {
		problems.push(`the fixture no longer records rc.2's 10-22 px range (saw ${JSON.stringify(rc2.range)})`);
	}
	if (JSON.stringify(alpha.range) !== JSON.stringify([10, 22])) {
		problems.push(`the fixture no longer records alpha.1's 10-22 px range (saw ${JSON.stringify(alpha.range)})`);
	}
	if (rc1.default !== 14 || rc2.default !== 14 || alpha.default !== 14) {
		problems.push("the fixture's default font size moved off 14 px — the whole 'measured at the default' framing depends on it");
	}

	// The widening is a BOUNDS change: the ladder derivation text is identical
	// across all three versions once the one markdown link target is removed.
	if (stripLinkTarget(rc1.sheetSentence) !== stripLinkTarget(rc2.sheetSentence)) {
		problems.push("the ladder derivation sentence differs between rc.1 and rc.2 — the 'bounds only' finding no longer holds");
	}
	if (stripLinkTarget(rc2.sheetSentence) !== stripLinkTarget(alpha.sheetSentence)) {
		problems.push("the ladder derivation sentence differs between rc.2 and alpha.1");
	}

	// The carve-out and the two faces that DO follow the setting.
	const contract = fixture.hostContract || {};
	for (const key of ["followsSetting", "fixed", "secondaryRule", "deltaVar"]) {
		if (!contract[key]) problems.push(`the fixture lost the host-contract fact "${key}"`);
	}
	const sentences = contract.sentences || {};
	// The host ships this rule inside parentheses; the doc quotes the clause
	// itself, so the needle drops the wrapping pair rather than the substance.
	const secondaryRule = (sentences.secondaryRule || "(setting -1 at <=14, setting -2 above; 13px at the default)").replace(/^\(|\)$/g, "");

	// ── the evidence doc has to state the same numbers ───────────────────────
	const latestRange = `${rc2.range[0]}–${rc2.range[1]}`;
	const oldRange = `${rc1.range[0]}–${rc1.range[1]}`;
	if (!docN.includes(norm(latestRange))) {
		problems.push(`the evidence doc does not state the current host font range ${latestRange} px`);
	}
	if (!docN.includes(norm(oldRange))) {
		problems.push(`the evidence doc does not state the superseded range ${oldRange} px (a reader cannot tell what changed)`);
	}
	if (!/0\.2\.0-rc\.2/.test(docN)) {
		problems.push("the evidence doc does not name 0.2.0-rc.2 as the version that widened the range");
	}
	if (!docN.includes(`${rc2.default} px`)) {
		problems.push(`the evidence doc does not state the ${rc2.default} px default`);
	}

	// The host's own words, not a paraphrase: these decide which of our faces
	// the setting reaches, and the carve-out is the reason half of the range
	// cannot hurt us.
	const required = [
		["including the user bubble and composer draft", "the host sentence naming the two faces that follow the setting"],
		["small text and code keep fixed sizes", "the host carve-out for the fixed small/code tiers"],
		[secondaryRule, "the host's secondary-tier rule"],
		["--dsh-content-font-delta", "the host ladder variable"],
		["--dsw-specific-bubble", "the user-bubble token the setting reaches"],
		["--dsw-alias-label-tertiary", "the tertiary ink the pending re-test has to sample"]
	];
	for (const [needle, why] of required) {
		if (!docN.includes(norm(needle))) problems.push(`the evidence doc no longer quotes ${why} ("${needle}")`);
	}

	// The derived number. If the host rule says "setting -1 at <=14", then a
	// 10 px setting puts the secondary tier at 9 px — computed, not sampled,
	// and the doc has to carry the number rather than the adjective.
	const secondaryAt10 = fixture.derived && fixture.derived.secondaryAt && fixture.derived.secondaryAt["10"];
	if (typeof secondaryAt10 !== "number") {
		problems.push("the fixture lost the derived secondary-tier size at 10 px");
	} else if (!new RegExp(`${secondaryAt10}\\s*px`).test(docN)) {
		problems.push(`the evidence doc does not carry the derived secondary-tier size ${secondaryAt10} px at a 10 px setting`);
	}

	// ── admission, date and two-level alignment ─────────────────────────────
	if (!docN.includes(norm(DISCLAIMER))) {
		problems.push(`the evidence doc does not carry the narrowed phrasing "${DISCLAIMER}"`);
	}
	if (!docN.includes(norm(DATED_ENTRY))) {
		problems.push(`the unverified list lost its dated font-extreme entry ("${DATED_ENTRY}") — the admission must survive`);
	} else {
		const m = doc.match(DATE_RE);
		if (!m) problems.push("the font-extreme entry carries no date — an undated admission cannot go stale, so it stops being evidence");
		else findings.push(`font-extreme entry dated ${m[1]}`);
	}

	for (const banned of FALSE_COMPLETION) {
		if (banned.test(docN)) problems.push(`the evidence doc claims a completed measurement the issue says does not exist: ${banned}`);
	}

	// Two levels, one rule: a document that mentions the host range must also
	// say the extremes are unsampled, and no README may use the reassuring
	// phrasing. The evidence doc is exempt from the phrasing ban only.
	for (const [name, text] of Object.entries(docs)) {
		const textN = norm(text);
		const isEvidence = name === EVIDENCE_DOC;
		if (!isEvidence) {
			for (const banned of BANNED_PHRASING) {
				if (banned.test(textN)) {
					problems.push(`${name} uses the open-ended phrasing ${banned} — it must name the range and say the extremes are unsampled`);
				}
			}
		}
		for (const banned of FALSE_COMPLETION) {
			if (banned.test(textN)) problems.push(`${name} claims the extremes were measured: ${banned}`);
		}
		if (RANGE_MENTION.test(textN) && !(textN.includes("极值未测") || DISCLAIMER_ALT.test(textN))) {
			problems.push(`${name} states the host font range without saying the extremes are unsampled`);
		}
		// The superseded range may only appear attributed to rc.1 — otherwise a
		// reader takes 12-17 for the current bounds.
		for (const stale of ["12 through 17", "12 to 17"]) {
			let at = textN.indexOf(stale);
			while (at !== -1) {
				const window = textN.slice(Math.max(0, at - 500), at + 200);
				if (!/rc\.1/.test(window)) {
					problems.push(`${name} writes "${stale}" without attributing it to the superseded rc.1 range`);
					break;
				}
				at = textN.indexOf(stale, at + stale.length);
			}
		}
	}

	// ── the behaviour that makes the admission true ─────────────────────────
	if (/dsh-content-font/.test(bundle)) {
		problems.push("the bundle now references the host font ladder (--dsh-content-font*) — we have always been a reader of the painted result, not a driver of the host's typography");
	}
	const sizes = [...bundle.matchAll(/fontSize:\s*"(\d+)px"/g)].map((m) => Number(m[1]));
	if (sizes.length === 0) {
		problems.push("no fontSize literal found in the bundle — the probe probably stopped reading the right file");
	} else {
		const worst = Math.max(...sizes);
		if (worst > 14) {
			problems.push(`a fontSize literal in the bundle is ${worst}px — plugin-UI constants above the host default would be us driving conversation-size text`);
		} else {
			findings.push(`${sizes.length} plugin-UI fontSize literals, max ${worst}px (host default is ${rc2.default}px)`);
		}
	}
	if (/font-size\s*:/.test(bundle)) {
		problems.push("a raw font-size declaration appeared in the bundle — font sizing belongs to the host ladder, not to this plugin");
	}

	findings.push(`host range ${oldRange} px (rc.1) -> ${latestRange} px (rc.2 = latest), default ${rc2.default} px, 0 samples at either extreme`);
	return { problems, findings };
}

// ── the live reading ─────────────────────────────────────────────────────────
const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
const doc = fs.readFileSync(path.join(ROOT, EVIDENCE_DOC), "utf8");
const bundle = fs.readFileSync(path.join(ROOT, BUNDLE), "utf8");
const docs = Object.fromEntries(CLAIM_DOCS.map((p) => [p, fs.readFileSync(path.join(ROOT, p), "utf8")]));

/** Everything the gate reads, so a mutation can swap exactly one input. */
const base = () => ({ doc, fixture, bundle, docs });

test("desktop font scale (#93): the live evidence doc and bundle pass the gate", () => {
	const { problems, findings } = checkFontScale(base());
	assert.deepStrictEqual(problems, [], problems.join("\n"));
	assert.ok(findings.some((f) => /0 samples at either extreme/.test(f)), "the gate must report that neither extreme was sampled");
});

test("desktop font scale (#93): the frozen host reading is internally consistent", () => {
	const { problems } = checkFontScale(base());
	assert.deepStrictEqual(problems, []);
	// The finding that is not in the issue text: bounds changed, machine did not.
	assert.strictEqual(
		stripLinkTarget(fixture.versions["0.2.0-rc.1"].sheetSentence),
		stripLinkTarget(fixture.versions["0.2.0-rc.2"].sheetSentence)
	);
	// And the numbers the host's own rule produces at the two extremes.
	assert.strictEqual(fixture.derived.secondaryAt["10"], 9);
	assert.strictEqual(fixture.derived.secondaryAt["22"], 20);
});

test("mutation #93.1 — deleting the dated admission reddens the gate", () => {
	const broken = base();
	const line = broken.doc.split("\n").find((l) => l.includes(DATED_ENTRY));
	assert.ok(line, "the live doc must contain the bullet this mutation removes");
	broken.doc = broken.doc.replace(line, "- 状态文件无 schema 版本字段——占位。");
	const { problems } = checkFontScale(broken);
	assert.ok(problems.some((p) => p.includes("dated font-extreme entry")), problems.join("\n"));
	// Control: removing an unrelated bullet does not redden it.
	const control = base();
	const other = "- 玻璃材质类名在任意未来构建上的命中率（漂移探针只能报告失效，不能预防）；";
	assert.ok(control.doc.includes(other), "the control bullet must exist verbatim");
	control.doc = control.doc.replace(other, "");
	assert.deepStrictEqual(checkFontScale(control).problems, []);
});

test("mutation #93.2 — flipping the admission into a completion claim reddens the gate", () => {
	const broken = base();
	broken.doc = broken.doc.replace(/极值未测/g, "极值已测");
	const { problems } = checkFontScale(broken);
	assert.ok(problems.some((p) => p.includes("claims a completed measurement")), problems.join("\n"));
	assert.ok(problems.some((p) => p.includes("narrowed phrasing")), problems.join("\n"));
});

test("mutation #93.3 — the host widening its range without a doc update reddens the gate", () => {
	const widened = (o) => {
		o.fixture = JSON.parse(JSON.stringify(o.fixture));
		o.fixture.versions["0.2.0-rc.2"].range = [8, 24];
		o.fixture.versions["0.2.1-alpha.1"].range = [8, 24];
		return o;
	};
	const broken = widened(base());
	const { problems } = checkFontScale(broken);
	assert.ok(problems.some((p) => p.includes("does not state the current host font range 8–24 px")), problems.join("\n"));

	// Control: moving the doc along with the fixture clears exactly that problem.
	const control = widened(base());
	control.doc = control.doc.replace(/10–22/g, "8–24");
	assert.ok(
		!checkFontScale(control).problems.some((p) => p.includes("current host font range")),
		checkFontScale(control).problems.join("\n")
	);
});

test("mutation #93.4 — dropping the host's fixed-small/code carve-out reddens the gate", () => {
	const broken = base();
	broken.doc = broken.doc.replaceAll("while **small text and code keep fixed sizes**", "while **everything follows the setting**");
	broken.doc = broken.doc.replaceAll("「small text and code keep fixed sizes」", "「一切跟随设置」");
	const { problems } = checkFontScale(broken);
	assert.ok(problems.some((p) => p.includes("fixed small/code tiers")), problems.join("\n"));

	// And the derived number is its own requirement, not a side effect of that.
	// It is stated twice (section + unverified list) on purpose, so the mutation
	// has to take both — one surviving mention is still a carried number.
	const noDerived = base();
	assert.ok(noDerived.doc.includes("9 px"), "the live doc must state the derived secondary size");
	noDerived.doc = noDerived.doc.replaceAll("9 px", "the derived size");
	const d = checkFontScale(noDerived).problems;
	assert.ok(d.some((p) => p.includes("derived secondary-tier size 9 px")), d.join("\n") || "(no problems at all)");
});

test("mutation #93.5 — a stale 12-17 range outside the rc.1 attribution reddens the gate", () => {
	const broken = base();
	broken.docs = { ...broken.docs, "README.md": broken.docs["README.md"] + "\n会话字号区间为 12 through 17 px。\n" };
	const { problems } = checkFontScale(broken);
	assert.ok(problems.some((p) => p.includes("without attributing it to the superseded rc.1 range")), problems.join("\n"));
	// Control: the same sentence inside an rc.1 attribution window is fine.
	const control = base();
	control.docs = { ...control.docs, "README.md": control.docs["README.md"] + "\n（rc.1 时期的 12 through 17 px 已被 10–22 取代，极值未测。）\n" };
	assert.deepStrictEqual(checkFontScale(control).problems, []);
});

test("mutation #93.6 — the reassuring phrasing coming back to any README reddens the gate", () => {
	for (const phrase of ["在宿主默认字号下测过", "at the host's default font size"]) {
		const broken = base();
		broken.docs = { ...broken.docs, "docs/i18n/README.ja.md": broken.docs["docs/i18n/README.ja.md"] + "\n" + phrase + "\n" };
		const { problems } = checkFontScale(broken);
		assert.ok(problems.some((p) => p.includes("open-ended phrasing")), `${phrase}: ${problems.join("\n")}`);
	}
	// A doc that mentions the range but skips the disclaimer is the same failure.
	const broken = base();
	broken.docs = { ...broken.docs, "README.md": broken.docs["README.md"] + "\n宿主字号 10–22 px。\n" };
	assert.ok(checkFontScale(broken).problems.some((p) => p.includes("without saying the extremes are unsampled")));
	// Control: the evidence doc may quote the banned phrasing in order to forbid it.
	const control = base();
	assert.deepStrictEqual(checkFontScale(control).problems, []);
});

test("mutation #93.7 — driving the host ladder or shipping 22px text reddens the gate", () => {
	const driven = base();
	driven.bundle = driven.bundle + "\ndocumentElement.style.setProperty('--dsh-content-font-size', '22px');\n";
	assert.ok(checkFontScale(driven).problems.some((p) => p.includes("references the host font ladder")));

	const big = base();
	assert.ok(big.bundle.includes('fontSize: "14px"'), "the live bundle must contain the literal this mutation edits");
	big.bundle = big.bundle.replace('fontSize: "14px"', 'fontSize: "22px"');
	const { problems } = checkFontScale(big);
	assert.ok(problems.some((p) => p.includes("fontSize literal in the bundle is 22px")), problems.join("\n"));

	// Control: a smaller plugin-UI constant stays green.
	const small = base();
	small.bundle = small.bundle.replace('fontSize: "14px"', 'fontSize: "11px"');
	assert.deepStrictEqual(checkFontScale(small).problems, []);

	// A raw font-size declaration is the same overreach in another spelling.
	const raw = base();
	raw.bundle = raw.bundle.replace('fontSize: "14px"', 'font-size: 15px;');
	assert.ok(checkFontScale(raw).problems.some((p) => p.includes("raw font-size declaration")));
});

test("mutation #93.8 — an unreadable or emptied document must not look like a passing one", () => {
	const empty = base();
	empty.doc = "";
	const a = checkFontScale(empty).problems;
	assert.ok(a.length >= 6, `an empty evidence doc must produce a wall of problems, saw ${a.length}`);
	assert.ok(a.some((p) => p.includes("dated font-extreme entry")));

	const blank = base();
	blank.bundle = "";
	const b = checkFontScale(blank).problems;
	assert.ok(b.some((p) => p.includes("no fontSize literal found")), b.join("\n"));

	const noFixture = base();
	noFixture.fixture = {};
	const c = checkFontScale(noFixture).problems;
	assert.ok(c.some((p) => p.includes("lost one of its three host versions")), c.join("\n"));
});

test("mutation #93.9 — an undated admission reddens the gate", () => {
	const broken = base();
	broken.doc = broken.doc.replace(/记录日期 \d{4}-\d{2}-\d{2}/, "记录日期待定");
	const { problems } = checkFontScale(broken);
	assert.ok(problems.some((p) => p.includes("carries no date")), problems.join("\n"));
	// Control: a different but still well-formed date keeps it green.
	const control = base();
	control.doc = control.doc.replace(/记录日期 \d{4}-\d{2}-\d{2}/, "记录日期 2026-11-01");
	assert.deepStrictEqual(checkFontScale(control).problems, []);
});

test("mutation #93.10 — misattributing the widening to the wrong host version reddens the gate", () => {
	const broken = base();
	broken.doc = broken.doc.replaceAll("0.2.0-rc.2", "0.2.1-alpha.1");
	const { problems } = checkFontScale(broken);
	assert.ok(problems.some((p) => p.includes("does not name 0.2.0-rc.2")), problems.join("\n"));
});
