/**
 * dsh-dream-skin — host compatibility gate (issue #62).
 *
 * Since dsh 0.2.0-rc.1 the host refuses to load a profile bundle whose
 * `@deepseek-ai/dsh*` peer ranges don't include the running dsh version —
 * `dsh-app-boot`'s `evaluatePluginCompatibility()` skips the bundle entirely,
 * so the plugin vanishes with one log line: no client.js route, no
 * `/dream-skin/api`, no diagnostics global. The previous ranges
 * (`^0.1.0-rc.6`, plus `*` for the store) satisfied every 0.1.x runtime the
 * plugin was verified on and silently excluded 0.2.x, which is exactly the
 * "0.2.0-rc.1 不适配啦" report.
 *
 * The expected values here are NOT computed by this file: they are a fixture
 * captured by calling the real host checker
 * (`@deepseek-ai/dsh-app-boot@0.2.0-rc.1`, `evaluatePluginCompatibility`) over
 * a table of runtime versions, for both the pre-fix and the post-fix manifest.
 * This test re-derives the same verdicts with a dependency-free range
 * evaluator (the repo ships no node_modules) and requires agreement — so a
 * retyped range that re-breaks 0.2.x, or a widened range that stops being a
 * bounded claim, goes red against an independent witness rather than against
 * this file's own opinion.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const pkg = require('../package.json');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'host_compat_verdicts.json'), 'utf8'));

/** Only these peer names feed the host gate; cordis and react are ignored by it. */
const isGatePeer = (name) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-');

// ── minimal prerelease-aware semver subset (includePrerelease semantics) ────
function parse(v) {
	const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(v).trim());
	assert.ok(m, `unsupported version spelling in a range or fixture: ${JSON.stringify(v)}`);
	const pre = m[4] ? m[4].split('.').map((x) => (/^\d+$/.test(x) ? Number(x) : x)) : null;
	return { n: [Number(m[1]), Number(m[2]), Number(m[3])], pre };
}

function cmp(a, b) {
	for (let i = 0; i < 3; i++) if (a.n[i] !== b.n[i]) return a.n[i] < b.n[i] ? -1 : 1;
	if (!a.pre && !b.pre) return 0;
	if (!a.pre) return 1; // a release outranks every prerelease of the same tuple
	if (!b.pre) return -1;
	for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
		const x = a.pre[i], y = b.pre[i];
		if (x === undefined) return -1; // shorter prerelease list sorts first
		if (y === undefined) return 1;
		if (x === y) continue;
		if (typeof x !== typeof y) return typeof x === 'number' ? -1 : 1; // numeric < alphanumeric
		return x < y ? -1 : 1;
	}
	return 0;
}

/** `^X` / `~X` upper bounds, per node-semver. */
function bump(target, op) {
	const [M, m, p] = target.n;
	const next = op === '^' ? (M > 0 ? [M + 1, 0, 0] : m > 0 ? [0, m + 1, 0] : [0, 0, p + 1]) : [M, m + 1, 0];
	return { n: next, pre: [0] };
}

function satisfies(version, range) {
	const v = parse(version);
	// includePrerelease:true (what the host passes) disables the prerelease
	// exclusion rule, so `*` and bare comparators reduce to plain ordering.
	return range.split('||').some((set) => {
		const parts = set.trim().split(/\s+/).filter(Boolean);
		return parts.every((c) => {
			if (c === '*' || c === 'x' || c === 'latest') return true;
			const m = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(c);
			assert.ok(m, `unsupported comparator in a peer range: ${JSON.stringify(c)}`);
			const op = m[1] || '=';
			const target = m[2];
			if (target.startsWith('^') || target.startsWith('~')) {
				const lower = parse(target.slice(1));
				return cmp(v, lower) >= 0 && cmp(v, bump(lower, target[0])) < 0;
			}
			assert.ok(op !== '^' && op !== '~', `unsupported comparator in a peer range: ${JSON.stringify(c)}`);
			const t = parse(target);
			const r = cmp(v, t);
			return op === '>=' ? r >= 0 : op === '<=' ? r <= 0 : op === '>' ? r > 0 : op === '<' ? r < 0 : r === 0;
		});
	});
}

/** Mirror of the host loop: every dsh* peer, verdict against one runtime. */
function failingPeers(peers, runtime) {
	return Object.entries(peers).filter(([name, range]) => isGatePeer(name) && !satisfies(runtime, range)).map(([name]) => name).sort();
}

const checkedPeers = () => Object.fromEntries(Object.entries(pkg.peerDependencies).filter(([name]) => isGatePeer(name)));

test('host gate: our peer ranges reproduce the verdicts the real dsh checker returned', () => {
	assert.ok(FIXTURE.table.length >= 6, 'fixture must cover several host generations');
	for (const row of FIXTURE.table) {
		assert.deepEqual(failingPeers(pkg.peerDependencies, row.runtime), row.after.peers, `verdict mismatch for dsh ${row.runtime}`);
	}
});

test('host gate: the shipped ranges accept the runtimes we verified on, and refuse the one we did not', () => {
	const peers = checkedPeers();
	assert.ok(Object.keys(peers).length >= 5, 'the dsh* peers the host checks must still be declared');
	for (const runtime of ['0.1.7-rc.2', '0.2.0-rc.1', '0.2.0']) {
		assert.deepEqual(failingPeers(peers, runtime), [], `dsh ${runtime} must load the plugin`);
	}
	// Boundedness, not a vacuous `*`: an unverified future major must be refused
	// outright, because the host's refusal is a precise actionable message while
	// a false "compatible" claim is a silent crash surface.
	assert.ok(failingPeers(peers, '0.3.0-rc.1').length > 0, 'ranges must not claim compatibility with an untested 0.3.x host');
});

test('host gate: the fixture records a real red (it is not an all-green self-confirmation)', () => {
	const at020 = FIXTURE.table.find((r) => r.runtime === '0.2.0-rc.1');
	assert.ok(at020, 'fixture must cover 0.2.0-rc.1');
	assert.equal(at020.before.ok, false, 'the pre-fix manifest must FAIL the host gate, else this fixture proves nothing');
	assert.equal(at020.after.ok, true, 'the post-fix manifest must pass the host gate');
	assert.notDeepEqual(failingPeers(pkg.peerDependencies, '0.2.0-rc.1'), at020.before.peers, 'package.json must not still carry the pre-fix ranges');
});

test('host gate: every host-checked peer stays optional (a required peer would break `npm install` for consumers)', () => {
	for (const name of Object.keys(checkedPeers())) {
		assert.equal(pkg.peerDependenciesMeta?.[name]?.optional, true, `${name} must stay optional`);
	}
});

// Exported so the evaluator can be cross-checked against the host's own
// node-semver in a one-off (docs/publishing-to-npm.md); the fixture above is
// what keeps that cross-check honest across releases.
module.exports = { satisfies, failingPeers };
