/**
 * dsh-dream-skin — WHAT WE CLAIM ABOUT THE OFFICIAL DESKTOP BUILD (issue #87).
 *
 * README (and its seven translations) said the official DSH Desktop preview was
 * "expected to work (Electron, same front-end, **inherits the plugin
 * mechanism**)". None of that had a measurement behind it, and the last clause
 * is narrower than it reads: the host CLI has **no `desktop` shipped profile
 * template**, so a user following the pattern some third-party docs teach ends
 * up in an empty shell profile and sees nothing after a restart.
 *
 * The honest claim is smaller and checkable:
 *
 *   POSITIVE — the official desktop build does not need a new
 *   `dsh.client.platform` value. `dsh-client-modules` discards any declaration
 *   whose platform is not `"web"`, and all 21 client packages the host itself
 *   ships declare `"web"` (measured on 0.2.1-alpha.1). That is the one fact
 *   that supports "expected to LOAD".
 *
 *   NEGATIVE — a profile name the host does not ship is not rejected, it is
 *   silently created from `DEFAULT_PROFILE_BUNDLES` (`["@deepseek-ai/dsh-base"]`,
 *   no `dsh-web-app`). So we must not teach one.
 *
 * Both halves are pinned here, and one more thing that prose alone has never
 * managed: the CLAIM itself is stamped with a machine-readable value, so
 * strengthening the wording without changing the stamp cannot pass.
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");

/** The stamp: one literal, identical in every document that makes the claim. */
const CLAIM = "<!-- desktop-claim: load-expected-unverified -->";

/** Every document that states the compatibility claim to a user. */
const CLAIM_DOCS = [
	"README.md",
	"docs/i18n/README.de.md",
	"docs/i18n/README.en.md",
	"docs/i18n/README.es.md",
	"docs/i18n/README.fr.md",
	"docs/i18n/README.ja.md",
	"docs/i18n/README.ko.md",
	"docs/i18n/README.ru.md"
];

/** The document that carries the evidence and the negative case. */
const EVIDENCE_DOC = "docs/desktop-support.md";

/**
 * The profile flag we must not teach. Written as a pattern rather than a
 * literal so the gate itself does not become a copy of the thing it bans.
 */
const BANNED_FLAG = /--profile[\s=]+(?:desktop|browser|app)\b/i;

/** Facts the evidence document must actually contain, not merely allude to. */
const EVIDENCE = ["PROFILE_TEMPLATES", "DEFAULT_PROFILE_BUNDLES", "dsh-web-app", 'platform: "web"'];

const readReal = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** The gate. Pure: `read` is a parameter, which is what makes the mutations real. */
function checkDesktopClaims(read = readReal) {
	const problems = [];

	// 1. Every claim site carries the SAME stamp. A document that states the
	//    compatibility claim without one has stepped outside the gate.
	const stamps = new Map();
	for (const rel of CLAIM_DOCS) {
		const text = read(rel);
		const found = [...text.matchAll(/<!--\s*desktop-claim:\s*([a-z-]+)\s*-->/g)].map((m) => m[1]);
		if (found.length === 0) {
			problems.push(`${rel}: states the desktop compatibility claim with no \`desktop-claim\` stamp — the claim is not machine-readable`);
			continue;
		}
		for (const value of found) stamps.set(value, (stamps.get(value) || 0) + 1);
	}
	if (stamps.size > 1) {
		problems.push(`the desktop claim says more than one thing across the documents: ${[...stamps.keys()].sort().join(', ')}`);
	}
	for (const [value, count] of stamps) {
		if (value !== "load-expected-unverified") {
			problems.push(
				`desktop claim "${value}" (${count} document(s)): the only claim the evidence supports is "load-expected-unverified" — ` +
					'this repo has never run the official desktop shell, so anything stronger is a claim nobody measured'
			);
		}
	}

	// 2. We do not teach a profile name the host does not ship. The competition
	//    does; their README is not our manual.
	for (const rel of CLAIM_DOCS) {
		const line = read(rel).split("\n").find((l) => BANNED_FLAG.test(l));
		if (line) {
			problems.push(
				`${rel}: teaches a profile flag the host CLI has no shipped template for — a user following it gets an empty shell profile. ` +
					`The negative case belongs in ${EVIDENCE_DOC} as a warning, never as an instruction. Offending line: ${line.trim().slice(0, 120)}`
			);
		}
	}

	// 3. …and the document that carries the WARNING must carry the EVIDENCE too,
	//    so the warning is never just an opinion. It also has to say which
	//    profile flag it is warning about, or a reader cannot act on it.
	const evidence = read(EVIDENCE_DOC);
	for (const token of EVIDENCE) {
		if (!evidence.includes(token)) problems.push(`${EVIDENCE_DOC}: the desktop claim's evidence is missing \`${token}\``);
	}
	if (!BANNED_FLAG.test(evidence)) {
		problems.push(`${EVIDENCE_DOC}: it must name the profile flag it warns about, or the warning is not actionable`);
	}
	if (!evidence.includes(CLAIM)) {
		problems.push(`${EVIDENCE_DOC}: must carry the same \`desktop-claim\` stamp as the READMEs`);
	}
	// The positive half — "do NOT add a new platform value" — is the part that
	// stops the next round from "fixing" desktop support by editing a field the
	// host discards. Pin the sentence, not the idea.
	if (!/不(要|需).{0,12}platform|platform.{0,20}(一致|同样)/.test(evidence)) {
		problems.push(`${EVIDENCE_DOC}: must state that the desktop build needs NO new \`dsh.client.platform\` value (the host discards non-"web" declarations)`);
	}

	return problems;
}

// ── the gate ──────────────────────────────────────────────────────────────

test("#87: the desktop claim is the one the evidence supports, in all eight documents", () => {
	const problems = checkDesktopClaims();
	assert.deepEqual(problems, [], `the desktop claim has drifted from its evidence:\n  ${problems.join("\n  ")}`);
});

test("#87: the banned profile flag really is published somewhere — as a warning, not an instruction", () => {
	// Guard against a vacuously-clean gate: if neither the evidence document nor
	// the READMEs mention the flag at all, the ban above proves nothing and the
	// user has no way to learn why their install went nowhere.
	assert.ok(BANNED_FLAG.test(readReal(EVIDENCE_DOC)), "the evidence document must name the flag it warns about");
	assert.ok(
		!CLAIM_DOCS.some((rel) => BANNED_FLAG.test(readReal(rel))),
		"no README (any locale) may carry the flag"
	);
});

// ── mutations: issue #87 asked for each of these by name ──────────────────

test("mutation #87.1: a README that claims compatibility without the stamp reddens the gate", () => {
	const problems = checkDesktopClaims((rel) =>
		rel === "README.md" ? readReal(rel).replace(CLAIM, "") : readReal(rel)
	);
	assert.ok(
		problems.some((p) => p.startsWith("README.md") && p.includes("no `desktop-claim` stamp")),
		`a claim with no stamp must be named, got: ${JSON.stringify(problems)}`
	);
});

test("mutation #87.2: putting the profile flag back into a README reddens the gate", () => {
	// The exact regression #87 is about: the competition's install recipe
	// migrating into our manual.
	const problems = checkDesktopClaims((rel) =>
		rel === "docs/i18n/README.en.md" ? `${readReal(rel)}\n\n\`dsh plugin --profile desktop add dsh-dream-skin\`\n` : readReal(rel)
	);
	assert.ok(
		problems.some((p) => p.startsWith("docs/i18n/README.en.md") && p.includes("profile flag")),
		`teaching the flag must be reported, got: ${JSON.stringify(problems)}`
	);
	// …including the variants a translator might reach for.
	for (const spelling of ["--profile desktop", "--profile=desktop", "--profile  DESKTOP"]) {
		const bad = checkDesktopClaims((rel) => (rel === "README.md" ? `${readReal(rel)}\n${spelling}\n` : readReal(rel)));
		assert.ok(bad.some((p) => p.includes("profile flag")), `the gate must catch "${spelling}"`);
	}
});

test("mutation #87.3: strengthening the wording without changing the stamp reddens the gate", () => {
	// A one-word edit is exactly how prose gates die. The stamp is what makes
	// the edit visible.
	const problems = checkDesktopClaims((rel) =>
		rel === "docs/i18n/README.ja.md"
			? readReal(rel).replace(CLAIM, "<!-- desktop-claim: verified -->")
			: readReal(rel)
	);
	assert.ok(
		problems.some((p) => p.includes('desktop claim "verified"')),
		`a strengthened claim must be rejected by name, got: ${JSON.stringify(problems)}`
	);
	assert.ok(problems.some((p) => p.includes("more than one thing")), "the documents must not disagree with each other");
});

test("mutation #87.4: a warning with no evidence behind it reddens the gate", () => {
	const problems = checkDesktopClaims((rel) =>
		rel === EVIDENCE_DOC
			? readReal(rel)
					.replaceAll("DEFAULT_PROFILE_BUNDLES", "SOMETHING_ELSE")
					.replaceAll('platform: "web"', "platform")
			: readReal(rel)
	);
	assert.ok(
		problems.some((p) => p.includes("DEFAULT_PROFILE_BUNDLES")) && problems.some((p) => p.includes('platform: "web"')),
		`the evidence tokens must be required by name, got: ${JSON.stringify(problems)}`
	);
	const noWarning = checkDesktopClaims((rel) => (rel === EVIDENCE_DOC ? readReal(rel).replace(/--profile[\s=]+desktop/gi, "a profile") : readReal(rel)));
	assert.ok(noWarning.some((p) => p.includes("name the profile flag")), "a warning that no longer names the flag is not actionable");
});

module.exports = { checkDesktopClaims, CLAIM, CLAIM_DOCS, EVIDENCE_DOC, BANNED_FLAG };
