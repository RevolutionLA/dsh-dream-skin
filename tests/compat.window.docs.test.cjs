"use strict";
/**
 * Issue #86 — the compatibility window is a promise, and it lives in two places.
 *
 * `package.json`'s `@deepseek-ai/dsh*` peer ranges ARE the window: since dsh
 * 0.2.0-rc.1 the host reads them at boot and SKIPS the whole bundle when one
 * fails. The docs state the same window in prose. Until this file existed
 * nothing compared the two — they were transcribed by hand into four places,
 * and the day 0.3.0 ships the difference between "the docs say <0.3.0" and "the
 * manifest says <0.3.0" is the difference between "we told you" and "it just
 * stopped working".
 *
 * Two boundaries are deliberate and encoded here:
 *
 *   1. LIVE claims are gated. HISTORICAL ones are not.
 *      `CHANGELOG.md` and the per-version notes in `README.md` record what was
 *      true when they were written. Rewriting them to match today's window
 *      would be falsifying history, which is worse than a stale sentence — so
 *      they are explicitly out of scope, and the scope check below fails if
 *      someone registers one as live.
 *
 *   2. The window has an UPPER BOUND ON PURPOSE.
 *      `0.3.0` is not yet verified against this plugin. Refusing it is the
 *      chosen behaviour ("do not inject into an untested host"), not an
 *      oversight. So the gate also asserts the docs say what a user SEES when
 *      that refusal fires, and how to override it — a hard stop with no
 *      documented escape is the failure mode this issue is about.
 */

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const pkg = require("../package.json");

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** The peers the host actually gates on (see evaluatePluginCompatibility). */
const isGatePeer = (name) => name === "@deepseek-ai/dsh" || name.startsWith("@deepseek-ai/dsh-");

function gatePeers() {
	return Object.entries(pkg.peerDependencies).filter(([name]) => isGatePeer(name));
}

/** The window as the manifest states it. Every gate peer must agree. */
function liveRange() {
	const peers = gatePeers();
	assert.ok(peers.length >= 6, `expected the six dsh-client-* peers, found ${peers.length}`);
	const ranges = [...new Set(peers.map(([, range]) => range))];
	assert.equal(
		ranges.length,
		1,
		`the gate peers must share ONE range, found ${ranges.length}: ${ranges.join(" | ")} — ` +
			`a peer with its own range is how the window silently becomes two windows`
	);
	return ranges[0];
}

/**
 * Documents that state the window as a CURRENT fact. Each entry is a REGION
 * (from -> to), not a line, for two reasons learned the hard way:
 *
 *   - `| DSH Web（` alone matches the 0.1.x row, not the 0.2.x one — a marker
 *     that is a prefix of another site's text silently checks the wrong line.
 *   - the gate section states the window in its third bullet, not its heading.
 *
 * Locating by region (never by "count occurrences") is the #77 lesson: a gate
 * that finds its claim site by pattern must fail loudly when the pattern stops
 * being unique, not quietly grade a stranger.
 */
const LIVE_REGIONS = [
	{
		file: "README.md",
		from: "| DeepSeek Harness (`dsh`) |",
		to: "\n\n",
		what: "the compatibility table row"
	},
	{
		file: "docs/desktop-support.md",
		from: "## 宿主 peer 兼容闸门",
		to: "\n## 持久化",
		what: "the gate section"
	},
	{
		file: "docs/desktop-support.md",
		from: "| DSH Web（`0.2.0-rc.1`",
		to: "\n",
		what: "the 0.2.x compat table row"
	}
];

/**
 * Regions that are FROZEN HISTORY. They may state a window we no longer ship,
 * because that is what was true when they were written; rewriting them would
 * falsify the record. Listed explicitly so that adding one is a deliberate act,
 * and so that a live claim cannot be smuggled in by hiding next to history.
 */
const HISTORICAL_REGIONS = [
	{
		file: "README.md",
		from: "**版本 10.6.1（2026-10-06）**",
		to: "\n## ⚙️ 工作原理",
		what: "the dated per-release notes (README's compat section carries both kinds)"
	},
	{
		// Issue #95-E follow-up: the 10.9.x delivery notes recount (as dated
		// history) how the desktop profile command shape was corrected, quoting
		// the window upper bound in passing. That is a snapshot of what was
		// measured that day, not a live statement of the window.
		file: "docs/desktop-support.md",
		from: "**本文件此前给桌面用户写的命令是错的形状**",
		to: "\n",
		what: "the dated desktop-delivery note (historical narrative)"
	}
];

/**
 * Files that are history IN THEIR ENTIRETY, by their nature. `CHANGELOG.md` is
 * an append-only record of releases: every line in it was true on the day it
 * was written, and rewriting one to match today's window would be falsifying
 * the record rather than fixing a doc. Declared as a whole file so that no
 * region boundary has to be maintained as the file grows.
 */
const HISTORICAL_FILES = new Set(["CHANGELOG.md"]);

const ALL_REGIONS = [...LIVE_REGIONS, ...HISTORICAL_REGIONS];

/** Slice the text between `from` and the next `to` after it. */
function region(file, from, to) {
	const text = read(file);
	const start = text.indexOf(from);
	if (start < 0) return null;
	const end = text.indexOf(to, start + from.length);
	return text.slice(start, end < 0 ? text.length : end);
}

/** Every registered region of `file`, with its slice (null when not found). */
function regionsOf(file) {
	return ALL_REGIONS.filter((r) => r.file === file).map((r) => ({
		...r,
		scope: region(r.file, r.from, r.to)
	}));
}

/** The page a user in trouble actually opens. */
const USER_FACING = "docs/desktop-support.md";

test("#86: every live doc statement of the compat window matches the manifest, verbatim", () => {
	const range = liveRange();
	const wrong = [];
	for (const site of LIVE_REGIONS) {
		const scope = region(site.file, site.from, site.to);
		if (scope === null) {
			wrong.push(`${site.file}: region start not found (${site.what}) — the site moved or was deleted`);
			continue;
		}
		if (!scope.includes(range)) {
			wrong.push(`${site.file} (${site.what}): does not state the manifest window "${range}"`);
		}
	}
	assert.deepEqual(wrong, [], `live doc claims drifted from package.json:\n  ${wrong.join("\n  ")}`);
});

test("#86: a doc that states a window we do not ship reddens this gate", () => {
	// The issue's acceptance criterion, applied to the source of truth rather
	// than to a copy: move the window in a doc and the same region check must
	// stop matching. (This asserts the gate CAN fail — an all-green
	// self-confirmation would pass whether or not the check works.)
	const range = liveRange();
	const site = LIVE_REGIONS[0];
	const scope = region(site.file, site.from, site.to);
	assert.ok(scope && scope.includes(range), "the README region actually states the window (else this proves nothing)");
	const drifted = scope.split(range).join(">=0.1.0-rc.6 <0.4.0-0");
	assert.notEqual(drifted, scope);
	assert.ok(
		!drifted.includes(range),
		"a drifted region no longer states the live window — so the check above would fail on it"
	);
});

test("#86: every mention of the window is inside a registered region (live or frozen history)", () => {
	// A future doc that mentions the window must be registered, or it can drift
	// forever without anyone noticing. History is allowed to say something else
	// — but only where it has been declared as history, and only up to the
	// number of mentions that were declared.
	const marker = "0.3.0-0";
	const unregistered = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const abs = path.join(dir, entry.name);
			const rel = path.relative(ROOT, abs).split(path.sep).join("/");
			if (entry.isDirectory()) {
				if (rel === "docs/review" || rel === "node_modules" || rel.startsWith(".git")) continue;
				walk(abs);
				continue;
			}
			if (!entry.name.endsWith(".md")) continue;
			if (HISTORICAL_FILES.has(rel)) continue;
			const text = read(rel);
			const total = text.split(marker).length - 1;
			if (total === 0) continue;

			const registered = regionsOf(rel);
			if (registered.length === 0) {
				unregistered.push(`${rel} (${total} mention(s), no registered region)`);
				continue;
			}
			for (const r of registered) {
				if (r.scope === null) unregistered.push(`${rel}: ${r.what} — region start not found`);
			}
			const covered = registered.reduce((n, r) => n + (r.scope ? r.scope.split(marker).length - 1 : 0), 0);
			if (covered < total) {
				unregistered.push(
					`${rel} (${total - covered} mention(s) outside every registered region — ` +
						"declare it as LIVE (so it is checked) or HISTORICAL (so it is on the record as frozen))"
				);
			}
			// A live claim must not be satisfied by history: if a live region
			// lost its statement, the check above catches it — but if the live
			// region's statement were moved INTO history, the count would still
			// balance, so require each live region to carry at least one.
			for (const r of LIVE_REGIONS.filter((x) => x.file === rel)) {
				const scope = region(rel, r.from, r.to);
				if (scope !== null && !scope.includes(marker)) {
					unregistered.push(`${rel}: ${r.what} — a LIVE region must state the window, and it does not`);
				}
			}
		}
	};
	walk(ROOT);
	assert.deepEqual(
		unregistered,
		[],
		`documents state the compat window without being registered:\n  ${unregistered.join("\n  ")}`
	);
});

test("#86: the docs say what a user SEES when the window refuses a host, and how to get out", () => {
	// The issue's real complaint: the mechanism is documented, the SYMPTOM and
	// the ESCAPE are not. A hard stop with no documented way out is the failure.
	//
	// This deliberately does NOT accept "the mechanism is explained" as
	// coverage. An earlier version of this case passed on prose that only said
	// the bundle gets skipped — which is why the assertions below demand an
	// observable symptom AND an actionable command, in the same region.
	const site = LIVE_REGIONS.find((r) => r.file === USER_FACING && r.what === "the gate section");
	const text = region(site.file, site.from, site.to);
	assert.ok(text, `${USER_FACING}: the gate section must exist`);

	assert.match(text, /0\.3\.0/, `${USER_FACING} must name the version where the refusal fires`);
	assert.match(
		text,
		/(皮肤|设置项|Theme \/ 外观)[^\n]{0,60}(消失|不见了|回到|整块)/,
		`${USER_FACING} must state the SYMPTOM a user sees — "the host skips the bundle" is mechanism, not symptom`
	);
	assert.match(
		text,
		/不是为了|不是报错|不是插件崩|不是崩溃/,
		`${USER_FACING} must rule out the wrong diagnosis (users read "everything vanished" as "it broke")`
	);
	// The escape must be a copy-pasteable instruction, not a mention.
	assert.match(
		text,
		/dsh plugin allow-version\s+dsh-dream-skin@/,
		`${USER_FACING} must give the escape hatch as a runnable command, not just name it`
	);
	assert.match(
		text,
		/(未(经)?(测试|验证)|不背书|风险|自行承担)/,
		`${USER_FACING} must warn that the escape hatch ships an unverified combination`
	);
});

test("#86: every gate peer is optional, so the window can only ever skip — never block an install", () => {
	// A required peer would turn "the host skips us" into "npm cannot install".
	// That is a different, worse symptom, and it must not be one edit away.
	const optional = pkg.peerDependenciesMeta || {};
	const required = gatePeers().filter(([name]) => !(optional[name] && optional[name].optional)).map(([n]) => n);
	assert.deepEqual(required, [], `these host-gated peers are NOT optional: ${required.join(", ")}`);
});

// ── issue #95-E: the escape hatch must live where the user in trouble reads ──
// `allow-version` used to exist only in docs/desktop-support.md; the READMEs
// (the page a user actually opens when the skin vanishes) had zero mentions.
// Now every README carries the four-part sentence — symptom / cause / escape /
// risk framing — and this gate keeps it there.

const ESCAPE_DOCS = [
	"README.md",
	"docs/i18n/README.de.md",
	"docs/i18n/README.en.md",
	"docs/i18n/README.es.md",
	"docs/i18n/README.fr.md",
	"docs/i18n/README.ja.md",
	"docs/i18n/README.ko.md",
	"docs/i18n/README.ru.md"
];

function escapeProblems(readFile = read) {
	const problems = [];
	for (const rel of ESCAPE_DOCS) {
		const text = readFile(rel);
		if (!/dsh plugin allow-version\s+dsh-dream-skin@/.test(text)) {
			problems.push(`${rel}: lost the allow-version escape hatch — a user hitting the peer-window skip has no way out from the page they actually read`);
		}
		if (!/(自担风险|自己責任|eigenes Risiko|own risk|propio riesgo|propres risques|본인 책임|страх и риск)/.test(text)) {
			problems.push(`${rel}: the escape hatch is no longer framed as an at-your-own-risk explicit override — it must never read as a recommended practice`);
		}
	}
	return problems;
}

test("#95-E: every README states the allow-version escape with at-your-own-risk framing", () => {
	assert.deepEqual(escapeProblems(), [], `the README escape hatch drifted:\n  ${escapeProblems().join("\n  ")}`);
});

test("#95-E mutation: deleting the README escape sentence reddens the gate", () => {
	const problems = escapeProblems((rel) =>
		rel === "README.md" ? read(rel).replace(/dsh plugin allow-version\s+dsh-dream-skin@<版本>/g, "dsh plugin update") : read(rel)
	);
	assert.ok(problems.some((p) => p.startsWith("README.md") && p.includes("allow-version escape hatch")), problems.join("\n"));
});

test("#95-E mutation: reframing the escape as the recommended practice reddens the gate", () => {
	const problems = escapeProblems((rel) =>
		rel === "README.md" ? read(rel).replace("用户自担风险的显式覆盖", "官方推荐做法") : read(rel)
	);
	assert.ok(problems.some((p) => p.startsWith("README.md") && p.includes("at-your-own-risk")), problems.join("\n"));
});
