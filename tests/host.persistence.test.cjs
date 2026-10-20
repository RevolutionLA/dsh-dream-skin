/**
 * dsh-dream-skin — host-half persistence tests.
 *
 * Loads lib/index.js (ESM) via dynamic import, mounts its `apply(ctx)` with a
 * fake webServer/webRuntime, captures the registered route handler, and drives
 * it with mocked req/res objects against a throwaway DSH_HOME directory. Covers
 * the fenced JSON API contract: get/set/merge/null-clear, method errors,
 * content-type fence, size cap (413), trust fence (403), and unknown method.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let mod;
async function loadIndex() {
	if (!mod) mod = await import('../lib/index.js');
	return mod;
}

/** Minimal connectivity.EventEmitter-ish req consumed by readJsonBody. */
function makeReq({ method = 'POST', body = null, headers = {} }) {
	const events = {};
	return {
		method,
		headers,
		on(ev, fn) { events[ev] = fn; },
		destroy() {},
		_push() {
			if (body != null && events.data) events.data(Buffer.from(body));
			if (events.end) events.end();
			if (events.error) events.error(); // ensure nothing hangs (readJsonBody resolves on end)
		}
	};
}

function makeRes() {
	return {
		status: 0, payload: null, headers: {},
		writeHead(s, h) { this.status = s; this.headers = h; },
		end(b) { this.payload = b != null ? JSON.parse(b.toString()) : null; }
	};
}

/**
 * Build a ctx that captures the registered route handler.
 *
 * `generation` models the host the plugin is loaded into, because the service
 * that carries the trust authorities moved once already (issue #109):
 *
 *   - `'0.2.1'` (default, current line) — the `web-startup` row provides
 *     `webStartup.trustedHosts`; `webRuntime` does not exist at all.
 *   - `'0.2.0'` — the `web-runtime` row provided `webRuntime.trustedHosts`.
 *   - `'none'` — neither service is mounted: the host half must still mount
 *     (loopback-only fence) and must never throw on the missing service.
 *
 * Services are reached through `ctx.get(name)`, as a plugin must for an
 * optional one, so a hard `ctx.<service>` read shows up here as a TypeError
 * instead of as the silent `pending` the real loader produces.
 */
function makeHarness(overrides = {}) {
	let captured = null;
	const trustedHosts = overrides.trustedHosts || [];
	const generation = overrides.generation || '0.2.1';
	const services = {
		webRuntime: generation === '0.2.0' ? { trustedHosts } : undefined,
		webStartup: generation === '0.2.1' ? { trustedHosts } : undefined
	};
	const ctx = {
		webServer: { register(route) { captured = route; return () => {}; } },
		get(name) { return services[name]; },
		effect(fn) { fn(); }
	};
	return {
		ctx,
		async run(reqOpts) {
			assert.ok(captured && captured.handler, 'handler not registered');
			const req = makeReq(reqOpts);
			const res = makeRes();
			// handler is async: start it (readJsonBody suspends awaiting data/end),
			// then push body events so the promise resolves, then await completion.
			const handlerPromise = captured.handler(req, res);
			req._push();
			await handlerPromise;
			return res;
		}
	};
}

const J = { 'content-type': 'application/json' };
const H = '127.0.0.1:8080';

/**
 * ── state file schema stamp ──────────────────────────────────────────────────
 *
 * `$DSH_HOME/dream-skin.json` is ONE file shared by every install that
 * resolves to the same DSH_HOME — in practice the web profile and the official
 * desktop shell, which can be running two DIFFERENT plugin versions at the
 * same time. So the format has a second consumer we do not control and cannot
 * upgrade first. That rules out nesting the settings under a wrapper: an older
 * build parses the file, finds `{state: {…}}`, and `String()`s that object into
 * a setting.
 *
 * The shape kept is therefore "flat map of strings, plus one reserved metadata
 * key". Three properties, all pinned below:
 *   1. an older build reading our file still sees every setting it knows, as a
 *      string — asserted structurally (no value may be non-string), not by name;
 *   2. unknown keys round-trip untouched, so a downgrade does not wash out what
 *      a newer build stored;
 *   3. the stamp is monotone and belongs to the file, not to the page: a newer
 *      build's stamp survives our writes, and `method:"set"` cannot forge it.
 *
 * The key name and the version are read from the module under test, never
 * hand-copied — but a constant the code exports and the code writes is
 * self-proving, so one test below also requires those two values to appear
 * together in `docs/desktop-support.md`, the document that ships in the tarball.
 */

// -------------------------------------------------------------------------
// Each test gets its own throwaway DSH_HOME so state files never leak between
// tests (statePath() reads process.env.DSH_HOME at request time).
const realDsHome = process.env.DSH_HOME;
function freshHome(t) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-skin-home-'));
	process.env.DSH_HOME = dir;
	t.after(() => {
		try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
	});
	return dir;
}
require('node:test').after(() => {
	if (realDsHome === undefined) delete process.env.DSH_HOME;
	else process.env.DSH_HOME = realDsHome;
});
function stateFile(home) { return path.join(home, 'dream-skin.json'); }
function readStateFile(home) {
	try { return JSON.parse(fs.readFileSync(stateFile(home), 'utf8')); }
	catch { return null; }
}
/** The settings the browser owns, i.e. the file minus the reserved metadata key. */
function settingsOf(home, keyName) {
	const raw = readStateFile(home) || {};
	const out = {};
	for (const [k, v] of Object.entries(raw)) if (k !== keyName) out[k] = v;
	return out;
}
// current-home helper so tests can read their own DSH_HOME file
const fh = (t) => {
	freshHome(t);
	return process.env.DSH_HOME;
};
// -------------------------------------------------------------------------

test('registers a prefix route and applies trusted-host config', async (t) => {
	await loadIndex();
	const harness = makeHarness();
	mod.apply(harness.ctx);
	assert.equal(typeof mod.apply, 'function');
	// handler mounted; a non-loopback, non-trusted host gets 403
	const res = await harness.run({ headers: { 'content-type': 'application/json', host: 'evil.example' }, body: '{"method":"get"}' });
	assert.equal(res.status, 403, 'untrusted authority blocked');
});

// ── the service gate: which host generation the fence reads (issue #109) ─────
//
// `inject` is a HARD gate. Naming a service the running host does not provide
// leaves the entry `pending` forever: `apply()` never runs, the route never
// registers, and nothing fails loudly — the loader only logs one line. The host
// removed `webRuntime` in `0.2.1-alpha.2` (`web-startup` now provides
// `webStartup`), so hard-requiring either name silently kills the host half on
// the other generation. These legs pin the mount and the trust source on all
// three shapes the plugin can meet.

test('inject: the host half hard-requires webServer only', async () => {
	await loadIndex();
	assert.deepEqual(
		mod.inject,
		['webServer'],
		'webRuntime was removed in 0.2.1-alpha.2 (webStartup replaced it), so naming either service in inject leaves the entry pending on the other host generation'
	);
});

test('0.2.1+ host: mounts and honours the webStartup trust authorities', async (t) => {
	await loadIndex();
	fh(t);
	const harness = makeHarness({ generation: '0.2.1', trustedHosts: ['app.internal'] });
	mod.apply(harness.ctx);
	const trusted = await harness.run({ headers: { ...J, host: 'app.internal', 'sec-fetch-site': 'same-origin' }, body: '{"method":"get"}' });
	assert.equal(trusted.status, 200, 'a webStartup-supplied authority must reach the API');
	const untrusted = await harness.run({ headers: { ...J, host: 'evil.example', 'sec-fetch-site': 'same-origin' }, body: '{"method":"get"}' });
	assert.equal(untrusted.status, 403, 'authorities we were not given stay blocked');
});

test('0.2.0 host: the legacy webRuntime authorities still apply', async (t) => {
	await loadIndex();
	fh(t);
	const harness = makeHarness({ generation: '0.2.0', trustedHosts: ['app.internal'] });
	mod.apply(harness.ctx);
	const trusted = await harness.run({ headers: { ...J, host: 'app.internal', 'sec-fetch-site': 'same-origin' }, body: '{"method":"get"}' });
	assert.equal(trusted.status, 200, 'the 0.2.0 line must keep working after the fallback chain is introduced');
});

test('no trust service at all: still mounts, loopback-only fence', async (t) => {
	await loadIndex();
	fh(t);
	const harness = makeHarness({ generation: 'none' });
	mod.apply(harness.ctx);
	const loopback = await harness.run({ headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: '{"method":"get"}' });
	assert.equal(loopback.status, 200, 'a missing optional service must not turn into a 500 or a thrown TypeError');
	const remote = await harness.run({ headers: { ...J, host: 'evil.example', 'sec-fetch-site': 'same-origin' }, body: '{"method":"get"}' });
	assert.equal(remote.status, 403, 'with no service there are no extra authorities — loopback stays the whole grant');
});

test('rejects non-JSON content-type with 415', async (t) => {
	await loadIndex();
	const harness = makeHarness();
	mod.apply(harness.ctx);
	const res = await harness.run({ headers: { 'content-type': 'text/plain', host: H }, body: '{"method":"get"}' });
	assert.equal(res.status, 415);
});

test('get returns {} when file absent', async (t) => {
	await loadIndex();
	fh(t); // fresh DSH_HOME, no state file yet
	const harness = makeHarness();
	mod.apply(harness.ctx);
	const res = await harness.run({ headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: '{"method":"get"}' });
	assert.equal(res.status, 200);
	assert.deepEqual(res.payload, { ok: true, value: {} });
});

test('set merges across writers (multi-window safety) and null clears one key', async (t) => {
	await loadIndex();
	const home = fh(t);
	const harness = makeHarness();
	mod.apply(harness.ctx);
	const mk = (patch) => ({ headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ method: 'set', patch }) });
	await harness.run(mk({ accent: '#123456' }));
	await harness.run(mk({ wallpaper: 'data:image/png,AAAA' })); // writer B must not wipe accent
	assert.deepEqual(settingsOf(home, mod.STATE_SCHEMA_KEY), { accent: '#123456', wallpaper: 'data:image/png,AAAA' });
	await harness.run(mk({ accent: null }));
	assert.deepEqual(settingsOf(home, mod.STATE_SCHEMA_KEY), { wallpaper: 'data:image/png,AAAA' });
});

test('set drops non-string/non-null values (type fence)', async (t) => {
	await loadIndex();
	const home = fh(t);
	const harness = makeHarness();
	mod.apply(harness.ctx);
	await harness.run({ headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ method: 'set', patch: { bad: { x: 1 }, ok: 'v' } }) });
	assert.deepEqual(settingsOf(home, mod.STATE_SCHEMA_KEY), { ok: 'v' });
});

test('method guard: GET is 405 and unknown method is 404', async (t) => {
	await loadIndex();
	const harness = makeHarness();
	mod.apply(harness.ctx);
	const r405 = await harness.run({ method: 'GET', headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' } });
	assert.equal(r405.status, 405);
	const r404 = await harness.run({ headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: '{"method":"wat"}' });
	assert.equal(r404.status, 404);
});

test('oversized body returns 413 (no 500 leak)', async (t) => {
	await loadIndex();
	const harness = makeHarness();
	mod.apply(harness.ctx);
	const big = JSON.stringify({ method: 'set', patch: { x: 'a'.repeat(40 * 1024 * 1024) } });
	const res = await harness.run({ headers: { ...J, host: 'localhost', 'sec-fetch-site': 'same-origin' }, body: big });
	assert.equal(res.status, 413);
});

test('malformed JSON returns 400', async (t) => {
	await loadIndex();
	const harness = makeHarness();
	mod.apply(harness.ctx);
	const res = await harness.run({ headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: '{not json' });
	assert.equal(res.status, 400);
});

// ── schema stamp: the forward-compatibility drill ────────────────────────────

function setReq(patch) {
	return { headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ method: 'set', patch }) };
}
function getReq() {
	return { headers: { ...J, host: H, 'sec-fetch-site': 'same-origin' }, body: JSON.stringify({ method: 'get' }) };
}
function putFile(home, obj) { fs.writeFileSync(stateFile(home), JSON.stringify(obj)); }

test('every write stamps one reserved metadata key that the page never sees', async (t) => {
	await loadIndex();
	assert.equal(typeof mod.STATE_SCHEMA_KEY, 'string', 'lib/index.js must export the reserved key name');
	assert.equal(typeof mod.STATE_SCHEMA_VERSION, 'string', 'lib/index.js must export the schema version as a string');
	assert.match(mod.STATE_SCHEMA_VERSION, /^\d+$/, 'the version this build declares must be a decimal integer string');
	const KEY = mod.STATE_SCHEMA_KEY;
	const home = fh(t);
	const harness = makeHarness();
	mod.apply(harness.ctx);
	await harness.run(setReq({ accent: '#112233', wallpaper: 'data:,' }));
	const raw = readStateFile(home);
	const extra = Object.keys(raw).filter((k) => k !== 'accent' && k !== 'wallpaper');
	assert.equal(extra.length, 1, 'the file must hold the settings we wrote plus EXACTLY ONE metadata key');
	assert.equal(extra[0], KEY, 'that key must be the reserved one');
	assert.equal(raw[KEY], mod.STATE_SCHEMA_VERSION, 'a file written from scratch carries this build version');
	// Structural promise: an older build reads this same file and String()s any
	// non-string value into a setting, so the map must stay flat strings only.
	for (const [k, v] of Object.entries(raw)) assert.equal(typeof v, 'string', `state file value ${k} must stay a string, got ${typeof v}`);
	const res = await harness.run(getReq());
	assert.deepEqual(res.payload.value, { accent: '#112233', wallpaper: 'data:,' }, 'the metadata key stays on the file, out of the API answer');
});

test('a legacy file with no stamp is served whole and gains the stamp without losing a key', async (t) => {
	await loadIndex();
	assert.equal(typeof mod.STATE_SCHEMA_KEY, "string", "lib/index.js must export STATE_SCHEMA_KEY (otherwise these legs compare undefined to undefined)");
	const KEY = mod.STATE_SCHEMA_KEY;
	const home = fh(t);
	const legacy = { accent: '#abc', 'dsh-dream-skin:skin': 'nebula', 'a-key-we-do-not-know': 'v' };
	putFile(home, legacy);
	const harness = makeHarness();
	mod.apply(harness.ctx);
	const before = await harness.run(getReq());
	assert.deepEqual(before.payload.value, legacy, 'a pre-stamp file must read exactly as it did before this change');
	await harness.run(setReq({ accent: '#def' }));
	const raw = readStateFile(home);
	assert.equal(raw[KEY], mod.STATE_SCHEMA_VERSION, 'the next write stamps it');
	assert.deepEqual(settingsOf(home, KEY), { accent: '#def', 'dsh-dream-skin:skin': 'nebula', 'a-key-we-do-not-know': 'v' }, 'stamping must not drop the key we do not know');
});

test('a file stamped by a NEWER build keeps its stamp and its keys', async (t) => {
	await loadIndex();
	assert.equal(typeof mod.STATE_SCHEMA_KEY, "string", "lib/index.js must export STATE_SCHEMA_KEY (otherwise these legs compare undefined to undefined)");
	const KEY = mod.STATE_SCHEMA_KEY;
	const FUTURE = 'dsh-dream-skin:invented-by-a-later-version';
	const home = fh(t);
	putFile(home, { [KEY]: '99', accent: '#1', [FUTURE]: 'y' });
	const harness = makeHarness();
	mod.apply(harness.ctx);
	await harness.run(setReq({ accent: '#2' }));
	const raw = readStateFile(home);
	// Rewriting "1" here would be a false claim about the bytes below it: the
	// newer build's key is still in the file, so the file is still that schema.
	assert.equal(raw[KEY], '99', 'our write must not downgrade a newer stamp');
	assert.equal(raw[FUTURE], 'y', 'the newer build key must survive our merge');
	assert.deepEqual(settingsOf(home, KEY), { accent: '#2', [FUTURE]: 'y' });
	const res = await harness.run(getReq());
	assert.ok(!(KEY in res.payload.value), 'the browser must not adopt the metadata key as a setting');
});

test('the page can neither forge nor delete the stamp', async (t) => {
	await loadIndex();
	assert.equal(typeof mod.STATE_SCHEMA_KEY, "string", "lib/index.js must export STATE_SCHEMA_KEY (otherwise these legs compare undefined to undefined)");
	const KEY = mod.STATE_SCHEMA_KEY;
	const home = fh(t);
	const harness = makeHarness();
	mod.apply(harness.ctx);
	await harness.run(setReq({ [KEY]: '9999', accent: '#1' }));
	const raw = readStateFile(home);
	assert.equal(raw[KEY], mod.STATE_SCHEMA_VERSION, 'a patch claiming a newer schema must not be believed');
	assert.deepEqual(settingsOf(home, KEY), { accent: '#1' }, 'the forged key must not become a setting');
	await harness.run(setReq({ [KEY]: null }));
	assert.equal(readStateFile(home)[KEY], mod.STATE_SCHEMA_VERSION, 'null cannot delete the reserved key either');
});

test('stamp normalization is one table, asserted as a group', async (t) => {
	await loadIndex();
	assert.equal(typeof mod.STATE_SCHEMA_KEY, "string", "lib/index.js must export STATE_SCHEMA_KEY (otherwise these legs compare undefined to undefined)");
	const KEY = mod.STATE_SCHEMA_KEY;
	const V = mod.STATE_SCHEMA_VERSION;
	const cases = [
		['absent', undefined, V],
		['empty string', '', V],
		['non-numeric', 'abc', V],
		['negative', '-3', V],
		['float', '1.5', V],
		['exponent form', '1e9', V],
		['number not string', 7, V],
		['null', null, V],
		['object', { a: 1 }, V],
		['zero', '0', V],
		['this build', V, V],
		['leading zeros', '007', '7'],
		['newer build', '99', '99'],
	];
	const fails = [];
	for (const [label, stamp, expected] of cases) {
		const home = fh(t);
		const file = { accent: 'x' };
		if (stamp !== undefined) file[KEY] = stamp;
		putFile(home, file);
		const harness = makeHarness();
		mod.apply(harness.ctx);
		await harness.run(setReq({ 'sidebar-link': '1' }));
		const raw = readStateFile(home);
		if (raw[KEY] !== expected) fails.push(`${label}: stamp ${JSON.stringify(raw[KEY])} expected ${JSON.stringify(expected)}`);
		if (raw.accent !== 'x') fails.push(`${label}: setting lost (${JSON.stringify(raw.accent)})`);
	}
	assert.deepEqual(fails, [], 'normalization table — each row is the stamp left after a merge, plus no setting dropped');
});

/**
 * The code exports the key name and the code writes it, so a test that only
 * compares those two is self-proving. The independent source is the document
 * that ships inside the tarball: rename the key in code and not in the docs,
 * or磨圆 the docs away, and this names the problem.
 *
 * Boundary stated honestly: this is a line-level co-occurrence check. It
 * catches "the sentence was deleted or the numbers drifted"; it does NOT catch
 * a sentence that is still there but describes the semantics wrongly.
 */
function schemaDocProblems(text, key, version) {
	const problems = [];
	// The claim site is a LIST ITEM, not "the first line that mentions the key".
	// 10.14.1 learned this the hard way: adding a release-summary paragraph above
	// the bullet — one that also names the key — silently moved this gate's
	// `find()` onto a different line, so the gate went red while the documented
	// fact had not changed at all. A gate whose subject is found by "first
	// mention" is a gate that prose reordering can move.
	const line = text.split('\n').find((l) => l.startsWith('- ') && l.includes(key));
	if (line === undefined) {
		problems.push(`docs/desktop-support.md never names the reserved key ${key} in a bullet (its claim site)`);
		return problems;
	}
	if (!line.includes('schema 版本')) problems.push('the line naming the reserved key does not say it is the schema version');
	if (!line.includes('`' + version + '`')) problems.push(`the line naming the reserved key does not state the current version ${version}`);
	if (!line.includes('get')) problems.push('the sentence putting the key outside the get answer is gone');
	return problems;
}

/**
 * Mutate ONLY the claim line. A whole-document `replace` would hit the first
 * "`1`" anywhere on the page and leave the claim untouched, so the leg meant to
 * catch a drifted number would prove nothing — the same trap as a boundary
 * matched by "does this string appear in the file" (see the docs.numbers gate).
 */
function mutateClaimLine(text, key, fn) {
	return text
		.split('\n')
		.map((l) => (l.includes(key) ? fn(l) : l))
		.join('\n');
}

test('the reserved key and its version are documented in a file that ships in the tarball', async () => {
	await loadIndex();
	assert.equal(typeof mod.STATE_SCHEMA_KEY, "string", "lib/index.js must export STATE_SCHEMA_KEY (otherwise these legs compare undefined to undefined)");
	const text = fs.readFileSync(path.join(__dirname, '..', 'docs', 'desktop-support.md'), 'utf8');
	assert.deepEqual(
		schemaDocProblems(text, mod.STATE_SCHEMA_KEY, mod.STATE_SCHEMA_VERSION),
		[],
		'the doc must name the key, call it the schema version, state the version, and keep the get-boundary sentence'
	);
	// reverse legs — each mutation must produce exactly the problem it names
	const renamed = text.split(mod.STATE_SCHEMA_KEY).join('dsh-dream-skin:not-the-key');
	assert.match(schemaDocProblems(renamed, mod.STATE_SCHEMA_KEY, mod.STATE_SCHEMA_VERSION).join(' / '), /never names/);
	const unversioned = mutateClaimLine(text, mod.STATE_SCHEMA_KEY, (l) => l.replace('`' + mod.STATE_SCHEMA_VERSION + '`', '`9999`'));
	assert.match(schemaDocProblems(unversioned, mod.STATE_SCHEMA_KEY, mod.STATE_SCHEMA_VERSION).join(' / '), /does not state the current version/);
	const unnamed = mutateClaimLine(text, mod.STATE_SCHEMA_KEY, (l) => l.replace('schema 版本', '那个东西'));
	assert.match(schemaDocProblems(unnamed, mod.STATE_SCHEMA_KEY, mod.STATE_SCHEMA_VERSION).join(' / '), /does not say it is the schema version/);
	const noBoundary = mutateClaimLine(text, mod.STATE_SCHEMA_KEY, (l) => l.split('get').join('读取'));
	assert.match(schemaDocProblems(noBoundary, mod.STATE_SCHEMA_KEY, mod.STATE_SCHEMA_VERSION).join(' / '), /outside the get answer is gone/);
	// Deleting the claim bullet must stay red EVEN IF the key is still mentioned
	// in prose above it — this is the exact shape that bit 10.14.1: a summary
	// paragraph naming the key moved a first-match gate onto the wrong line.
	const bulletDeleted = text
		.split('\n')
		.filter((l) => !(l.startsWith('- ') && l.includes(mod.STATE_SCHEMA_KEY)))
		.join('\n');
	assert.ok(bulletDeleted.includes(mod.STATE_SCHEMA_KEY), 'control: the prose mention must still be there for this leg to mean anything');
	assert.match(schemaDocProblems(bulletDeleted, mod.STATE_SCHEMA_KEY, mod.STATE_SCHEMA_VERSION).join(' / '), /never names/);
	// ... and the line-scoped mutation must NOT be a whole-file accident: the
	// unmutated document still passes the same checker.
	assert.deepEqual(schemaDocProblems(mutateClaimLine(text, mod.STATE_SCHEMA_KEY, (l) => l), mod.STATE_SCHEMA_KEY, mod.STATE_SCHEMA_VERSION), []);
});

