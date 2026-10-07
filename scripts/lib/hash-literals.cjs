/**
 * dsh-dream-skin — BUILD-HASH LITERALS IN OUR OWN SOURCES (issue #92).
 *
 * The repository's anchor discipline is "hang the host's own stable `data-*`
 * attributes, never its build-hash class names". That rule lives in prose, and
 * prose does not fail a build. So the discipline has been re-taught, once per
 * review round, by a fresh hash that had quietly stopped existing:
 *
 *   - `BynINW_frame` / `BynINW_centerCol` were quoted in a comment as the host's
 *     Windows title-bar frame, five lines above the rule that deliberately does
 *     NOT use them. Measured across 0.2.0-rc.1 / rc.2 / 0.2.1-alpha.1: 0 hits.
 *     A comment that teaches a dead hash teaches the wrong pattern (issue #92).
 *
 * So the literals are enumerated mechanically and each one is checked against
 * the host corpus. Two halves, deliberately separated, exactly like
 * `scripts/lib/host-gap.cjs`:
 *
 *   `measureHashCorpus()` reads the host and counts, for the bases WE use, how
 *   many files and packages mention them. It is the only part that needs the
 *   host, and the census freezes its output.
 *
 *   `checkHashLiterals()` is PURE. It takes the live scan of our own files, the
 *   frozen hit table and the curated allowances, and returns complaints. All
 *   the policy is there, which is what lets the suite hand it deliberately
 *   broken inputs and require a specific complaint.
 *
 * The allowance table is deliberately narrow. A dead hash may stay ONLY if
 * somebody wrote down why (a host line we still support, or a dated review
 * record). And an allowance must not outlive its reason: if the frozen corpus
 * starts matching it again, the entry is stale and the gate says so — the same
 * rule the forward-gap `since` field uses.
 */
const fs = require('node:fs');
const path = require('node:path');

const {
	DEAD_HASHES,
	DEAD_HASH_KINDS
} = require('../data/dead-hashes.cjs');

const ROOT = path.join(__dirname, '..', '..');

/**
 * A build-hash class name: `.<scope>_<suffix>` where the scope mixes case.
 *
 * The scope may itself contain an underscore — this host emits both
 * `uV2eYG_card` (one separator) and `pI_x6G_frame` (two), so the scope is
 * greedy up to the LAST underscore on the token. The mixed-case requirement is
 * what keeps this from flagging ordinary identifiers: it rules out ALL_CAPS
 * constants (`SETTINGS_NAV`) and snake_case words (`host_census`), while every
 * hash this host emits (`uV2eYG`, `BynINW`, `hHd-Xa`, `7yHdaG`, `pI_x6G`) has
 * both cases.
 */
const HASH_RE = /\._?([A-Za-z0-9][A-Za-z0-9_-]{3,})_([A-Za-z][A-Za-z0-9-]*)/g;
/** The same token WITHOUT the leading dot — used to index the corpus. */
const CORPUS_RE = /(^|[^A-Za-z0-9-])([A-Za-z0-9][A-Za-z0-9_-]{3,})_([A-Za-z][A-Za-z0-9-]*)/g;

const isBuildHashBase = (s) => /[a-z]/.test(s) && /[A-Z]/.test(s);

/**
 * What the gate is responsible for: the surface we ship or publish. The dated
 * review archives under `docs/review/` are excluded BY NAME, not by a silent
 * pattern — they are internal history whose whole job is quoting hashes that
 * no longer exist, they are not published (`package.json` → `files`), and
 * nobody edits code from them.
 */
const SCAN_FILES = [
	'lib/client.js',
	'lib/index.js',
	'lib/types/index.d.ts',
	'lib/types/client/index.d.ts',
	'README.md',
	'CHANGELOG.md',
	'CONTRIBUTING.md',
	'cordis.patch.yml',
	'package.json',
	'docs/PROJECT.md',
	'docs/themes-spec.md',
	'docs/design-philosophy.md',
	'docs/desktop-support.md',
	'docs/publishing-to-npm.md'
];
const SCAN_DIRS = ['docs/i18n', 'docs/examples', 'locale'];
const SCAN_EXT = /\.(md|json|ya?ml|cjs|mjs|js|ts|txt)$/;
const EXCLUDED_DIRS = ['docs/review', 'node_modules', '.git'];

/** The shipped surface, as repo-relative paths. */
function scanTargets(root = ROOT) {
	const out = [];
	for (const rel of SCAN_FILES) if (fs.existsSync(path.join(root, rel))) out.push(rel);
	const walk = (rel) => {
		const abs = path.join(root, rel);
		let entries;
		try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
		for (const entry of entries) {
			const child = `${rel}/${entry.name}`;
			if (entry.isDirectory()) {
				if (EXCLUDED_DIRS.some((d) => child === d || child.startsWith(`${d}/`))) continue;
				walk(child);
			} else if (SCAN_EXT.test(entry.name)) out.push(child);
		}
	};
	for (const dir of SCAN_DIRS) walk(dir);
	return [...new Set(out)].sort();
}

/**
 * Every build-hash literal in our own files, with its site. Not deduplicated:
 * the gate has to be able to name the line, because "which file do I edit" is
 * the only actionable part of the complaint.
 */
function scanHashLiterals({ files = scanTargets(), readFile = (f) => fs.readFileSync(f, 'utf8'), root = ROOT } = {}) {
	const rows = [];
	for (const rel of files) {
		let text;
		try { text = readFile(path.isAbsolute(rel) ? rel : path.join(root, rel)); } catch { continue; }
		text.split('\n').forEach((line, i) => {
			HASH_RE.lastIndex = 0;
			let m;
			while ((m = HASH_RE.exec(line)) !== null) {
				if (!isBuildHashBase(m[1])) continue;
				rows.push({ file: rel, line: i + 1, literal: `${m[1]}_${m[2]}`, base: m[1], selector: line.trim().slice(0, 160) });
			}
		});
	}
	return rows;
}

/**
 * The host corpus, indexed by base. One pass over the host's files: for each
 * file, every `scope_suffix` token it contains, so a later lookup is O(1)
 * instead of O(files) per base.
 */
function indexCorpus(files, readFile = (f) => fs.readFileSync(f, 'utf8'), root = null) {
	const byFile = new Map();
	const packages = new Map();
	for (const file of files) {
		let text;
		try { text = readFile(file); } catch { continue; }
		const seen = new Set();
		CORPUS_RE.lastIndex = 0;
		let m;
		while ((m = CORPUS_RE.exec(text)) !== null) if (isBuildHashBase(m[2])) seen.add(m[2]);
		if (seen.size === 0) continue;
		const rel = root ? path.relative(root, file) : file;
		const pkg = String(rel).split(/[\\/]/)[0];
		byFile.set(file, seen);
		for (const base of seen) {
			const row = packages.get(base) || { files: 0, packages: new Set() };
			row.files += 1;
			row.packages.add(pkg);
			packages.set(base, row);
		}
	}
	return { byFile, packages };
}

/**
 * Freeze `{ base: { files, packages } }` for the bases our own sources use.
 * The corpus index is passed in rather than rebuilt: the census already walked
 * the host, and two walks would eventually disagree about what they measured.
 */
function measureHashCorpus({ index, bases }) {
	const out = {};
	for (const base of [...bases].sort()) {
		const row = index.packages.get(base);
		out[base] = { files: row ? row.files : 0, packages: row ? row.packages.size : 0 };
	}
	return out;
}

/** Every distinct base in a scan, with its sites, sorted. */
function groupRows(rows) {
	const byBase = new Map();
	for (const row of rows) {
		const list = byBase.get(row.base) || [];
		list.push(row);
		byBase.set(row.base, list);
	}
	return [...byBase.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * The gate. Pure: everything it needs is a parameter.
 *
 * Returns `{ problems, findings, counts }`. A finding is not a problem — it is
 * a fact the gate measured that a human has to know and that no rule can fix
 * (`checkHashLiterals`'s own docblock in the tests spells the distinction out).
 */
function checkHashLiterals({
	rows,
	table,
	allow = DEAD_HASHES,
	kinds = DEAD_HASH_KINDS,
	corpus = null
} = {}) {
	const problems = [];
	const findings = [];
	const grouped = groupRows(rows || []);

	// 0. A scan that read nothing looks exactly like a clean scan. It is not.
	if (!rows || rows.length === 0) {
		problems.push('the scan found no build-hash literal at all in lib/ + the published docs — a scan that reads nothing must not read as an all-clear');
	}
	if (corpus && (!corpus.files || corpus.files <= 0)) {
		problems.push('the host corpus is empty: a hash check with no corpus cannot tell "this hash is dead" from "I could not look"');
	}

	// 1. Every literal we ship must exist in the corpus, or be allowed with a
	//    written reason. This is the defect issue #92 is about.
	const dead = [];
	for (const [base, sites] of grouped) {
		const row = table ? table[base] : undefined;
		const hits = row ? row.files : 0;
		if (hits > 0) continue;
		if (allow[base] && allow[base].kind) continue;
		dead.push({ base, sites, measured: row !== undefined });
	}
	for (const { base, sites, measured } of dead) {
		const where = sites
			.slice(0, 4)
			.map((s) => `${s.file}:${s.line}`)
			.join(', ');
		const more = sites.length > 4 ? ` (+${sites.length - 4} more)` : '';
		problems.push(
			`${base}_*: 0 hits in the frozen host corpus${measured ? '' : ' (it was never measured — re-run `npm run host:census`)'}, ` +
				`and no allowance says why. Sites: ${where}${more}. ` +
				'A hash this host does not have cannot match anything: anchor on a stable data-* attribute instead, ' +
				'or add an entry to scripts/data/dead-hashes.cjs saying which host line still needs it.'
		);
	}

	// 2. The allowance must not outlive its reason — and must not be dead policy.
	const seenInTree = new Map(grouped.map(([base, sites]) => [base, sites]));
	for (const [base, entry] of Object.entries(allow)) {
		const sites = seenInTree.get(base);
		if (!entry || !entry.kind) {
			problems.push(`${base}: allowance has no \`kind\` (legal: ${kinds.join(' / ')})`);
			continue;
		}
		if (!kinds.includes(entry.kind)) {
			problems.push(`${base}: unknown allowance kind "${entry.kind}" (legal: ${kinds.join(' / ')})`);
			continue;
		}
		if (!entry.why || entry.why.length < 40) {
			problems.push(`${base}: allowance needs a \`why\` long enough to be checkable`);
		}
		if (entry.kind === 'legacy-host-line' && !/^\d+\.\d+\.\d+/.test(String(entry.since || ''))) {
			problems.push(`${base}: a "legacy-host-line" allowance must name the host line it is for (\`since\`, e.g. "0.1.0-rc.6")`);
		}
		if (!sites) {
			problems.push(`${base}: allowance for a base that nothing in the shipped surface uses — delete the entry rather than keeping a permission nobody needs`);
			continue;
		}
		const row = table ? table[base] : undefined;
		const hits = row ? row.files : 0;
		if (hits > 0) {
			problems.push(
				`${base}: allowance is stale — the frozen corpus now contains it in ${hits} file(s). ` +
					'The excuse outlived its reason: drop the allowance so the literal is graded like any other.'
			);
		} else {
			// A dead hash we deliberately keep is a measured fact a human has to
			// act on. It is a finding, never a silent pass.
			findings.push(
				`${base}_* is kept on purpose (${entry.kind}, since ${entry.since || 'n/a'}) and measures 0 hits on the frozen host: ` +
					`${sites.map((s) => `${s.file}:${s.line}`).join(', ')}`
			);
		}
	}

	const counts = {
		literals: (rows || []).length,
		bases: grouped.length,
		live: grouped.filter(([b]) => (table && table[b] ? table[b].files : 0) > 0).length,
		allowed: grouped.filter(([b]) => allow[b] && allow[b].kind).length,
		unmeasured: grouped.filter(([b]) => table && table[b] === undefined).length
	};
	return { problems, findings, counts };
}

module.exports = {
	HASH_RE,
	isBuildHashBase,
	scanTargets,
	scanHashLiterals,
	indexCorpus,
	measureHashCorpus,
	groupRows,
	checkHashLiterals,
	DEAD_HASHES,
	DEAD_HASH_KINDS,
	SCAN_FILES,
	SCAN_DIRS
};
