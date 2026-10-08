#!/usr/bin/env node
/**
 * dsh-dream-skin — HOST CONSUMER CENSUS.
 *
 * A token a skin ships is a PROMISE: "something downstream will read this and
 * paint with it." When nothing reads it the promise is empty — the skin gets
 * heavier, and worse, every audit that grades the token looks stricter than it
 * is (issue #81: `--dsw-alias-brand-primary-soft` had 0 host consumers yet sat
 * inside the `tints` scoring surface, so a third of that check graded a surface
 * no user can see).
 *
 * The only honest way to settle "who reads this?" is to measure the host. That
 * measurement cannot run in CI (the host is not a dependency), so this script
 * FREEZES it into `scripts/data/host-token-census.json`, and the gates in
 * tests/ assert against the frozen file plus its provenance (host version).
 *
 * Two counts per token, because they mean different things:
 *   - `consumers` — `var(--token …)` occurrences: something READS it.
 *   - `declares`  — `--token:` occurrences: something DEFINES it.
 * A token with declares > 0 and consumers === 0 is host-authored dead weight we
 * are overriding pointlessly. A token with 0 of both is ours alone.
 * A third count, `mentions`, is the raw textual occurrence count (any mention
 * at all — `grep -o`). It exists to RECONCILE with reviews that quote
 * occurrences rather than reads; it is not a consumer signal. Measured on host
 * 0.2.0-rc.1 the reviews' figures reproduce exactly in this column
 * (`markdown-code-block` 37, `markdown-inline-code` 4, `specific-selector` 4,
 * `specific-tip` 2, `brand-primary-soft` 0) while `consumers` tells the
 * different, load-bearing story.
 *
 * The same run also freezes the FORWARD gap (issue #88) — the host colour
 * tokens a host surface reads and no skin defines. Its disposition table lives
 * in `scripts/data/host-gap-dispositions.cjs`; the gate is
 * `tests/host.gap.test.cjs`. Both directions share this file's host-root
 * discovery on purpose: two parallel implementations would eventually disagree
 * about which host they measured.
 *
 * Usage:
 *   node scripts/host-consumers.cjs            # regenerate the census
 *   node scripts/host-consumers.cjs --check    # compare against the frozen file
 *
 * The host root is discovered from the environment, never hardcoded:
 *   DSH_HOST_ROOT, else <npm-global>/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai
 */
const fs = require('node:fs');
const path = require('node:path');
const { measureGap } = require('./lib/host-gap.cjs');
const { themeEntryPath, THEME_PACKAGE } = require('./lib/host-colour-tokens.cjs');
const { DISPOSITIONS } = require('./data/host-gap-dispositions.cjs');
const { scanHashLiterals, indexCorpus, measureHashCorpus } = require('./lib/hash-literals.cjs');
const { HOST_SLOTS } = require('./lib/host-slots.cjs');
const { FADE_RULER, FADE_DISPOSITIONS, OUR_FADE_ANCHOR, measureFade, checkFade } = require('./lib/fade-owners.cjs');

/**
 * Host regions we watch but do not paint (issue #90).
 *
 * "Registrants" is the conservative reading: the number of corpus files that
 * mention the slot id AT ALL. A mention is not proof that anybody registers the
 * slot — but it is proof that the region is no longer invisible, which is
 * exactly the moment the offline decision has to be taken again.
 */
function measureSlots(files, readFile) {
	const entries = {};
	for (const [name, spec] of Object.entries(HOST_SLOTS)) {
		const mentions = [];
		let registrants = 0;
		let anchorFiles = 0;
		for (const file of files) {
			let text;
			try { text = readFile(file); } catch { continue; }
			if (text.includes(name)) {
				registrants += 1;
				if (mentions.length < 8) mentions.push(String(file).split(/[\\/]/).slice(-3).join('/'));
			}
			if (spec.anchor && text.includes(spec.anchor)) anchorFiles += 1;
		}
		entries[name] = { registrants, anchorFiles, mentions };
	}
	return entries;
}

const OUT = path.join(__dirname, 'data', 'host-token-census.json');

/** Candidate host roots, most specific first. */
function hostRootCandidates() {
	const out = [];
	if (process.env.DSH_HOST_ROOT) out.push(process.env.DSH_HOST_ROOT);
	const appData = process.env.APPDATA;
	if (appData) {
		out.push(path.join(appData, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai'));
		out.push(path.join(appData, 'npm', 'node_modules', '@deepseek-ai'));
	}
	const local = process.env.LOCALAPPDATA;
	if (local) {
		out.push(path.join(local, 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai'));
	}
	// POSIX global prefix, for completeness.
	out.push('/usr/local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai');
	out.push(path.join(process.env.HOME || '/root', '.npm-global', 'lib', 'node_modules', '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai'));
	return out;
}

function findHostRoot() {
	for (const candidate of hostRootCandidates()) {
		try {
			if (fs.statSync(candidate).isDirectory()) return candidate;
		} catch {}
	}
	throw new Error(
		'host not found. Set DSH_HOST_ROOT to the directory that contains @deepseek-ai/* packages '
		+ '(the one with dsh-client-ui-theme inside it), or install dsh globally.'
	);
}

function listFiles(root, ext) {
	const out = [];
	const walk = (dir) => {
		let entries;
		try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
		for (const entry of entries) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
				walk(full);
			} else if (ext.some((e) => entry.name.endsWith(e))) out.push(full);
		}
	};
	walk(root);
	return out;
}

/**
 * A CSS custom-property DEFINITION is `--name:` where the preceding character
 * is not part of a longer identifier (so `--dsw-alias-x-y:` does not also match
 * as `--dsw-alias-x`). A CONSUMER is any `var(--name` reference.
 */
function censusTokens(files, readFile = (f) => fs.readFileSync(f, 'utf8')) {
	const tokens = new Map();
	const rowFor = (t, file) => {
		const row = tokens.get(t) || { declares: 0, consumers: 0, mentions: 0, files: new Set() };
		row.files.add(file);
		tokens.set(t, row);
		return row;
	};
	for (const file of files) {
		let text;
		try { text = readFile(file); } catch { continue; }
		for (const m of text.matchAll(/(--[a-z0-9][a-z0-9-]*)/gi)) {
			rowFor(m[1], file).mentions += 1;
		}
		for (const m of text.matchAll(/(--[a-z0-9][a-z0-9-]*)\s*:/gi)) {
			rowFor(m[1], file).declares += 1;
		}
		for (const m of text.matchAll(/var\(\s*(--[a-z0-9][a-z0-9-]*)/gi)) {
			rowFor(m[1], file).consumers += 1;
		}
	}
	return tokens;
}

function packageOf(file, root) {
	const rel = root ? path.relative(root, file) : file;
	return String(rel).split(/[\\/]/)[0];
}

/**
 * The packages the install directory ACTUALLY carries (issue #94).
 *
 * The census has always scanned whatever `listFiles` walked; nothing asserted
 * that the walk covered the install. So a missing package — a tarball nobody
 * downloaded, a subtree the extension filter skips — widened the comparison
 * silently, and "the host contains 0 mentions of X" could mean "X lives in a
 * package I never looked at". Recording the on-disk inventory turns that into
 * a number a gate can hold, and naming the packages that carry no code at all
 * turns the extension filter's blind spot into a declared one.
 */
function packageInventory(root, files) {
	const onDisk = [];
	let entries = [];
	try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch {}
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
		try {
			if (fs.statSync(path.join(root, entry.name, 'package.json')).isFile()) onDisk.push(entry.name);
		} catch {}
	}
	const withCode = new Set(files.map((f) => packageOf(f, root)));
	return {
		packagesOnDisk: onDisk.sort(),
		packagesWithCode: onDisk.filter((p) => withCode.has(p)).sort(),
		packagesWithoutCode: onDisk.filter((p) => !withCode.has(p)).sort()
	};
}

/**
 * The THIRD-PARTY plugin corpus (issue #105).
 *
 * The host install answers "what does DSH itself draw". It says nothing about the
 * coexistence question the review round raised: a skin/theme plugin installed next to us in
 * the SAME browser document can address the same faces (`[class*="_fade"]`), and a page with
 * two skin plugins on it is exactly where "who covers whom" stops being inferable. So the
 * census also reads the profile directories, restricted to what is actually a DSH plugin —
 * scanning `node_modules` whole would be a multi-hundred-MB walk and would count lodash as a
 * UI owner.
 *
 * A missing profile directory is recorded as `exists: false` rather than as "no other owner":
 * the difference between "we measured nobody else" and "we could not look" is the whole point.
 */
function pluginCorpora(explicit, home = process.env.HOME || process.env.USERPROFILE || '') {
	// Every profile that exists, not a hardcoded pair (blue-team B7): a machine with an extra
	// profile (`lark`, a second account, a future name) was outside the corpus, and "not
	// scanned" is exactly the state this census refuses to report as "nobody else uses it".
	const profilesDir = path.join(home, '.dsh', 'profiles');
	let roots;
	if (explicit) {
		// An absolute node_modules path (third-party 10.9.0, T6): the variable used to be read
		// as a PROFILE NAME and joined under ~/.dsh/profiles, so passing a path silently
		// scanned nothing. A path means a path.
		roots = [explicit];
	} else {
		let profiles = [];
		try {
			profiles = fs.readdirSync(profilesDir, { withFileTypes: true })
				// `node_modules` lives INSIDE this directory on some installs — it is storage,
				// not a profile, and listing it produced a permanent "corpus absent" notice.
				.filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
				.map((e) => e.name)
				.sort();
		} catch {}
		roots = profiles.length
			? profiles.map((p) => path.join(profilesDir, p, 'node_modules'))
			: [path.join(profilesDir, 'web', 'node_modules')]; // the documented default when nothing is installed
	}
	const corpora = [];
	const files = [];
	const labelOf = new Map();
	for (const root of roots) {
		let exists = false;
		try { exists = fs.statSync(root).isDirectory(); } catch {}
		const entry = { kind: 'plugin', path: root, exists, packages: 0, names: [] };
		if (!exists) { corpora.push(entry); continue; }
		let dirs = [];
		const push = (rel) => {
			const full = path.join(root, rel);
			let manifest;
			try { manifest = JSON.parse(fs.readFileSync(path.join(full, 'package.json'), 'utf8')); } catch { return; }
			const peers = Object.keys(manifest.peerDependencies || {});
			const isPlugin = !!manifest.dsh || peers.some((p) => p === '@deepseek-ai/dsh' || p.startsWith('@deepseek-ai/dsh-'));
			// Ourselves: our repo's own client bundle mentions `_fade` by definition (it owns
			// the anchor), and counting it as a third-party owner would be self-confirmation.
			if (!isPlugin || manifest.name === 'dsh-dream-skin') return;
			const scanned = listFiles(full, ['.js', '.mjs', '.cjs', '.css']);
			if (scanned.length === 0) return;
			entry.packages += 1;
			// The NAMES matter as much as the count (third-party 10.9.0, T2): "this package is
			// not installed here" and "it is installed and no longer does this" are different
			// facts, and without the roster the gate could only offer one verdict for both.
			entry.names.push(rel);
			for (const f of scanned) {
				files.push(f);
				labelOf.set(f, rel);
			}
		};
		try {
			for (const e of fs.readdirSync(root, { withFileTypes: true })) {
				if (!e.isDirectory() || e.name.startsWith('.')) continue;
				if (e.name.startsWith('@')) {
					let inner = [];
					try { inner = fs.readdirSync(path.join(root, e.name), { withFileTypes: true }); } catch {}
					for (const s of inner) if (s.isDirectory()) push(`${e.name}/${s.name}`);
				} else push(e.name);
			}
		} catch {}
		corpora.push(entry);
	}
	return { files, labelOf, corpora };
}

function build({ quiet = false } = {}) {
	const root = findHostRoot();
	const files = listFiles(root, ['.css', '.js', '.mjs', '.cjs']);
	// One read of each file, shared by the census and the forward gap: the two
	// measurements must describe the same bytes, and re-reading the tree twice
	// is how they would end up disagreeing mid-run if it changed underneath.
	const cache = new Map();
	const readFile = (f) => {
		if (!cache.has(f)) cache.set(f, fs.readFileSync(f, 'utf8'));
		return cache.get(f);
	};
	const tokens = censusTokens(files, readFile);
	const inventory = packageInventory(root, files);
	let hostVersion = null;
	let dshVersion = null;
	try {
		// @deepseek-ai/dsh is two levels up from the inner @deepseek-ai dir.
		dshVersion = JSON.parse(fs.readFileSync(path.join(root, '..', '..', 'package.json'), 'utf8')).version;
	} catch {}
	// The discovered root IS the scope directory, so the package path is the
	// bare name. This probe used to join `@deepseek-ai/<name>` onto the scope
	// dir and therefore always read null (see scripts/lib/host-colour-tokens.cjs).
	try {
		hostVersion = JSON.parse(readFile(themeEntryPath(root).replace(/([\\/])lib[\\/]client\.js$/, '$1package.json'))).version;
	} catch {
		try {
			hostVersion = JSON.parse(fs.readFileSync(path.join(root, THEME_PACKAGE, 'package.json'), 'utf8')).version;
		} catch {}
	}
	const gap = measureGap({ hostRoot: root, readFile, files });
	// Issue #105: who else addresses `_fade`. Measured over BOTH corpora — the host install
	// and the third-party plugins sitting next to us in the same document.
	const plugin = pluginCorpora(process.env.DSH_PLUGIN_ROOT || null);
	const hostScope = path.basename(root).startsWith('@') ? path.basename(root) + '/' : '';
	const fadePackageOf = (f) => (plugin.labelOf.has(f) ? plugin.labelOf.get(f) : hostScope + packageOf(f, root));
	const fadeOwners = measureFade(files.concat(plugin.files), readFile, fadePackageOf);
	const fadeCorpora = [{
		kind: 'host', path: root, exists: true, packages: inventory.packagesWithCode.length,
		// The host roster, scoped the same way the owners are labelled, so the gate can tell
		// "this package is not installed" from "it is installed and no longer does this".
		names: inventory.packagesWithCode.map((n) => hostScope + n)
	}].concat(plugin.corpora);
	// The hash half of the same corpus (issue #92). Our own literals are
	// enumerated from OUR tree, then looked up in the ONE corpus index — not
	// re-walked, so the two halves cannot describe different bytes.
	const literals = scanHashLiterals();
	const hashBases = new Set(literals.map((r) => r.base));
	const hashTable = measureHashCorpus({ index: indexCorpus(files, readFile, root), bases: hashBases });
	const out = {
		__comment: 'Generated by scripts/host-consumers.cjs — do not hand-edit. Regenerate when the host version moves.',
		measuredAt: new Date().toISOString().slice(0, 10),
		host: {
			root: root,
			// The single-most-important piece of provenance: a census taken
			// against a different host says nothing about this one.
			dshVersion,
			uiThemeVersion: hostVersion,
			filesScanned: files.length,
			packagesScanned: inventory.packagesWithCode.length
		},
		// issue #94: the install's own inventory, so "we found nothing" can be
		// told apart from "we never looked at the package it lives in".
		corpus: {
			ruler:
				'The corpus is every package in the host install directory that ships a .js/.mjs/.cjs/.css file, ' +
				'not the packages a study happened to download. `packagesOnDisk` is what the directory holds, ' +
				'`packagesWithoutCode` is the blind spot of the extension filter, recorded rather than hidden.',
			packagesOnDisk: inventory.packagesOnDisk,
			packagesWithCode: inventory.packagesWithCode,
			packagesWithoutCode: inventory.packagesWithoutCode
		},
		tokens: Object.fromEntries(
			[...tokens.entries()]
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([name, row]) => [name, { declares: row.declares, consumers: row.consumers, mentions: row.mentions, files: row.files.size }])
		),
		// The forward half (issue #88): host colour tokens nothing in our skins
		// defines. `disposition` is merged in from the curated table so the
		// frozen artefact records the decision next to the measurement — and
		// `checkGap` refuses a gap that has none.
		gap: {
			ruler: gap.ruler,
			entries: Object.fromEntries(
				Object.entries(gap.entries)
					.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
					.map(([name, row]) => {
						const d = DISPOSITIONS[name];
						return [name, {
							...row,
							disposition: d ? d.disposition : null,
							...(d && d.base ? { base: d.base } : {}),
							...(d && d.since ? { since: d.since } : {})
						}];
					})
			)
		},
		// The build-hash half (issue #92): for every hash literal OUR shipped
		// surface contains, how much of the host mentions it. 0 is the number
		// that matters — a selector that names it can never match.
		hashes: {
			ruler:
				'A "hash literal" is a CSS-module class name `.<scope>_<suffix>` whose scope mixes case ' +
				'(`uV2eYG_card`, `hHd-Xa_footActions`, `_7yHdaG_panel`); the mixed-case rule is what excludes ' +
				'ALL_CAPS constants and snake_case identifiers. The bases are enumerated from our own shipped ' +
				'surface (lib/ + the published docs, `docs/review/` excluded by name: dated archives whose job ' +
				'is quoting hashes that no longer exist), then counted in the corpus above.',
			literals: literals.length,
			bases: hashTable
		},
		// The watched-region half (issue #90): host UI that exists but that we
		// deliberately do not paint, with the number that makes the decision
		// self-expiring.
		slots: {
			ruler:
				'A watched region is measured as the number of corpus files that mention its slot id at all, plus the ' +
				'number that mention the stable data-* anchor we would address it by. A mention is not proof of a ' +
				'registrant, but it is proof the region stopped being invisible — which is the moment the "nothing to ' +
				'paint" decision has to be taken again.',
			entries: measureSlots(files, readFile)
		},
		// The coexistence half (issue #105): every package — host OR third-party plugin —
		// that addresses a `_fade` class, and whether our hash-free suffix anchor can reach
		// what it draws.
		fade: {
			ruler: FADE_RULER,
			anchor: OUR_FADE_ANCHOR,
			corpora: fadeCorpora,
			owners: fadeOwners
		}
	};
	if (!quiet) {
		const gaps = Object.keys(out.gap.entries).length;
		const dead = Object.entries(hashTable).filter(([, r]) => r.files === 0).map(([b]) => b);
		console.log(`${Object.keys(out.tokens).length} host tokens censused across ${files.length} files (dsh ${dshVersion || '?'})`);
		console.log(`corpus: ${inventory.packagesWithCode.length}/${inventory.packagesOnDisk.length} packages carry code (issue #94)`);
		console.log(`forward gap: ${gaps} host colour token(s) read by the host and shipped by no skin`);
		console.log(`hash literals: ${literals.length} site(s) over ${Object.keys(hashTable).length} base(s), ${dead.length} with 0 host hits (${dead.join(', ') || '—'})`);
		const fadeRows = fadeGate(out.fade, null);
		console.log(`fade owners: ${Object.keys(fadeOwners).length} package(s) address _fade, ${Object.values(fadeOwners).filter((r) => r.suffixAddressable).length} reachable by ${OUR_FADE_ANCHOR}; corpora read: ${fadeCorpora.map((c) => `${c.kind}=${c.exists ? c.packages : 'ABSENT'}`).join(', ')}`);
		for (const line of fadeRows.notices) console.log(`fade: ${line}`);
		const slots = out.slots.entries;
		console.log(`watched regions: ${Object.entries(slots).map(([n, r]) => `${n}=${r.registrants} registrant(s)`).join(', ')}`);
	}
	return out;
}

/**
 * Compare a fresh census against the frozen one. PURE, and exported so the
 * suite can prove it is sensitive to each of the three things it freezes —
 * including the host VERSION, which is the field that makes every other number
 * in the file meaningful or meaningless.
 *
 * `measuredAt` moves every run and `root` is machine-specific, so neither is
 * compared.
 */
function censusDrift(fresh, frozen) {
	const norm = (c) => JSON.stringify({
		host: { dshVersion: c.host.dshVersion, uiThemeVersion: c.host.uiThemeVersion },
		tokens: c.tokens,
		gap: { ruler: c.gap && c.gap.ruler, entries: c.gap && c.gap.entries },
		hashes: c.hashes && c.hashes.bases,
		slots: c.slots && c.slots.entries,
		// Deliberately NOT `fade.owners` (blue-team B2): that half is measured over the
		// THIRD-PARTY plugin corpus, which is whatever the person running this happens to
		// have installed. Comparing it byte-for-byte would let "I do not have that plugin"
		// masquerade as "the host moved" — it reddened this very gate on a machine whose
		// profile differs from the one that froze the census. The fade half has its own
		// named gate below, which is the one that can say something useful about it.
		corpus: c.corpus && c.corpus.packagesWithCode
	});
	return norm(fresh) !== norm(frozen);
}

/**
 * The fade half, reported BY PACKAGE NAME (issue #105's acceptance criterion).
 *
 * `censusDrift` is deliberately opaque — "something in the census moved" — which is right
 * for a token count and wrong for coexistence: a NEW package starting to address `_fade`
 * is a decision somebody has to make, so the message has to carry which package.
 *
 * `frozen` is the recorded census. Its owner rows are what let the gate tell "measured, but
 * not installed on THIS machine" (a notice) from "never measured at all" (a red).
 */
function fadeGate(fade, frozen) {
	return checkFade({
		owners: (fade && fade.owners) || {},
		dispo: FADE_DISPOSITIONS,
		corpora: (fade && fade.corpora) || [],
		known: Object.keys((frozen && frozen.owners) || {})
	});
}

/**
 * The corpus must not SHRINK silently (issue #94).
 *
 * `censusDrift` catches any change at all, but it reports it as one opaque
 * "something differs". This is the check with a name: which packages the frozen
 * census knew about that the fresh one does not. A study that downloads three
 * packages instead of the install's 287 used to produce a *cleaner* gap report
 * — "nothing here mentions X" — and nothing could tell it apart from the real
 * thing. Now the missing packages are named.
 */
function corpusShortfall(fresh, frozen) {
	const f = (fresh && fresh.corpus) || {};
	const z = (frozen && frozen.corpus) || {};
	const had = new Set(z.packagesWithCode || []);
	const has = new Set(f.packagesWithCode || []);
	const missing = [...had].filter((p) => !has.has(p)).sort();
	const gained = [...has].filter((p) => !had.has(p)).sort();
	return { missing, gained, shrank: missing.length > 0 || has.size < had.size };
}

function main() {
	const check = process.argv.includes('--check');
	const fresh = build({ quiet: check });
	if (!check) {
		fs.mkdirSync(path.dirname(OUT), { recursive: true });
		fs.writeFileSync(OUT, JSON.stringify(fresh, null, 2) + '\n', 'utf8');
		console.log(`wrote ${path.relative(process.cwd(), OUT)}`);
		return;
	}
	const frozen = JSON.parse(fs.readFileSync(OUT, 'utf8'));
	// Issue #105 first: coexistence is reported by name, before the opaque byte compare,
	// so "a new plugin started painting the same face" never arrives as "census drift".
	const gate = fadeGate(fresh.fade, frozen.fade);
	for (const line of gate.notices) console.log(`fade: ${line}`);
	if (gate.problems.length > 0) {
		for (const line of gate.problems) console.error(`fade: ${line}`);
		process.exitCode = 1;
		return;
	}
	const shortfall = corpusShortfall(fresh, frozen);
	if (shortfall.shrank) {
		console.error(
			`corpus shrank: the frozen census knew ${(frozen.corpus || {}).packagesWithCode.length} code packages, this run sees ${fresh.corpus.packagesWithCode.length}. ` +
				`Missing: ${shortfall.missing.join(', ') || '(none by name — the count alone fell)'}`
		);
		process.exitCode = 1;
		return;
	}
	if (censusDrift(fresh, frozen)) {
		console.error('census drift: the host\'s token surface differs from scripts/data/host-token-census.json — rerun without --check and review the diff');
		process.exitCode = 1;
		return;
	}
	console.log('census matches the installed host');
}

if (require.main === module) main();

module.exports = { build, findHostRoot, censusTokens, listFiles, packageInventory, censusDrift, corpusShortfall, pluginCorpora, fadeGate, OUT };
