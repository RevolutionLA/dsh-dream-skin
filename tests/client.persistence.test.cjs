/**
 * dsh-dream-skin — client-half persistence tests (host-backed seam).
 *
 * Loads lib/client.js in a VM with a mocked fetch to the fenced /dream-skin/api
 * channel and asserts the three-layer persistence contract from the outside:
 *   - a write lands in cache + localStorage immediately and is PUSHED (GET is
 *     used at boot; a SET is sent on write) — verified by the mocked channel;
 *   - when the host channel is unavailable, reads/writes still work and the
 *     plugin does not throw (graceful degradation);
 *   - on boot, if the host reports keys, they are adopted unless written this
 *     session (the cross-restart "authoritative" values win for untouched keys).
 *
 * These are behavior-level checks exercised through the public `apply` path;
 * the host half's own API contract is covered by tests/host.persistence.test.cjs.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');

function makeEl() {
	return {
		style: {}, dataset: {}, children: [],
		setAttribute() {}, removeAttribute() {},
		appendChild(c) { this.children.push(c); },
		append(c) { this.children.push(c); },
		prepend() {}, click() {}, remove() { this.removed = true; },
		contains(el) { return el && this === el; }
	};
}

/**
 * Build a sandbox with a controllable fetch.
 * @param opts.hostValue - object the GET boot call should return (or 'unavailable').
 * @param opts.onSet - optional callback receiving each SET patch.
 */
function buildSandbox({ hostValue = {}, fetchImpl = null, seed = {}, firstBoot = false } = {}) {
	const body = makeEl();
	const document = { body, createElement: () => makeEl(), createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl() };
	const loc = { origin: 'http://x', pathname: '/', search: '', hash: '' };
	const store = new Map();
	// seed keys are the FULL localStorage keys (they already carry dsh-dream-skin: prefix)
	for (const [k, v] of Object.entries(seed)) store.set(k, String(v));
	// Round-6: exercise the "existing user" path — factory one-shot pre-marked.
	// firstBoot: true simulates a DESKTOP RESTART (blue-team B1): fresh origin =
	// empty localStorage, no marker, host file holding the durable user state.
	if (!firstBoot) store.set('dsh-dream-skin:factory-applied', '1');
	const localStorage = {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, String(v)),
		removeItem: (k) => store.delete(k)
	};
	const sent = { sets: [] };
	let factory = null;
	const fetchMock = fetchImpl || (async (url, init) => {
		const bodyObj = JSON.parse(init.body);
		if (bodyObj.method === 'get') {
			return { ok: true, status: 200, json: async () => ({ ok: true, value: hostValue }) };
		}
		if (bodyObj.method === 'set') {
			sent.sets.push(bodyObj.patch);
			return { ok: true, status: 200, json: async () => ({ ok: true }) };
		}
		return { ok: true, status: 200, json: async () => ({ ok: false }) };
	});
	const sandbox = {
		window: {}, document, navigator: {}, localStorage,
		console, location: loc, history: { replaceState() {} },
		btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
		atob: (s) => Buffer.from(s, 'base64').toString('binary'),
		unescape: (s) => s, escape: (s) => s,
		encodeURIComponent, decodeURIComponent,
		TextEncoder, TextDecoder,
		URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
		Blob: class {}, FileReader: class {}, Image: function () {},
		setTimeout, clearTimeout, alert: () => {},
		MutationObserver: class { observe() {} disconnect() {} },
		fetch: fetchMock
	};
	sandbox.window.__ModuleLoader__ = { load: (o) => { factory = o.factory; } };
	sandbox.window.location = loc;
	sandbox.window.history = sandbox.history;
	for (const k of ['document', 'localStorage', 'btoa', 'atob', 'fetch']) sandbox.window[k] = sandbox[k];
	const context = vm.createContext(sandbox);
	vm.runInContext(CODE + '\nwindow.__LOGGED__=1;', context);
	return { factory, localStorage, sent, getItem: (k) => store.get(k) };
}

const REACT = { useRef: () => ({ current: {} }), useMemo: (f) => (typeof f === 'function' ? f() : f), useState: (init) => [init, () => {}] };
const RT = { defineStore: (d) => ({ spec: d, create() {} }) };
function makeRequire({ storeMissing = false } = {}) {
	return (s) => {
		if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
		if (s === 'react') return REACT;
		if (s === '@deepseek-ai/dsh-client-store') {
			// storeMissing simulates a stable host (issue #43): the master-only
			// seed is absent and the table-miss Error is what the loader throws.
			if (storeMissing) throw new Error('client-modules: require("' + s + '") missed the module table');
			return RT;
		}
		if (s === '@deepseek-ai/dsh-client-runtime/client') return RT;
		throw new Error('unexpected require: ' + s);
	};
}

function makeApplyContext(harness, { captureActions = false } = {}) {
	const theme = {
		register(def) { (harness.registered || (harness.registered = [])).push(def.id); return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'system', active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	return {
		theme,
		slots: {
			inject(n, f) { f(); },
			register(desc, _Component) {
				if (captureActions && typeof desc.inject === 'function') {
					const storeSpec = desc.store && desc.store.spec;
					const bag = {};
					if (storeSpec && typeof storeSpec.actions.sync === 'function') {
						const state = storeSpec.init();
						bag.sync = (...args) => storeSpec.actions.sync(state, ...args);
					}
					const ra = desc.inject(bag);
					if (ra && typeof ra === 'object') (harness.actionBags || (harness.actionBags = {}))[desc.id] = ra;
				}
				return {};
			}
		},
		locale: { register() {}, bind() { return (k) => k; } },
		on() { return () => {}; },
		effect(t) { const d = t(); if (typeof d === 'function') d(); }
	};
}

test('boot adopts host keys for untouched preferences (durable values win)', async (t) => {
	const h = buildSandbox({ hostValue: { 'dsh-dream-skin:skin': 'midnight', 'dsh-dream-skin:wallpaper-opacity': '0.5' } });
	const e = h.factory(makeRequire());
	const ctx = makeApplyContext(h);
	e.apply(ctx);
	// loadFromHost is async (fetch + adopt); give it time to settle.
	await new Promise((resolve) => setTimeout(resolve, 50));
	// The host values should have been written into localStorage (adopted).
	assert.equal(h.getItem('dsh-dream-skin:skin'), 'midnight', 'host-adopted skin persisted to localStorage');
	assert.equal(h.getItem('dsh-dream-skin:wallpaper-opacity'), '0.5', 'host-adopted opacity persisted to localStorage');
});

test('blue-team B1: desktop restart (empty localStorage, durable host file) keeps the user config', async (t) => {
	// Desktop app = fresh origin on every restart: empty localStorage, no
	// factory marker. The factory look may seed the FIRST PAINT, but the
	// durable host values must WIN once the probe settles — the user's rose
	// skin and own wallpaper opacity must come back, and the factory seeds
	// must never be pushed over the host file.
	const h = buildSandbox({
		firstBoot: true,
		hostValue: {
			'dsh-dream-skin:skin': 'rose',
			'dsh-dream-skin:wallpaper-opacity': '0.7',
			'dsh-dream-skin:material-preset': 'liquid'
		}
	});
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	// > 200ms debounce: this guard must STILL hold after the push gate
	// releases — deleting the gate (or the factory-seed push filter) must
	// turn this test red, so the wait must cover the debounce window
	// (blue-team T3: a 50ms wait here kept the gate unguarded).
	await new Promise((resolve) => setTimeout(resolve, 400));
	assert.equal(h.getItem('dsh-dream-skin:skin'), 'rose', 'durable skin wins over the factory seed');
	assert.equal(h.getItem('dsh-dream-skin:wallpaper-opacity'), '0.7', 'durable opacity wins over the factory seed');
	assert.equal(h.getItem('dsh-dream-skin:material-preset'), 'liquid', 'durable material wins over the factory seed');
	// The factory look must not have been PUSHED as the user's own config —
	// neither via the gate's flush nor the debounce.
	assert.equal(h.sent.sets.length, 0, 'factory seeds are NOT pushed over the host file');
});

test('blue-team B1: restart with empty host file does not bake factory seeds in', async (t) => {
	// First-ever boot with an empty host file AND empty localStorage: factory
	// seeds must stay localStorage-only until the user actually changes
	// something — otherwise a desktop restart would write the shipped look
	// into dream-skin.json as if the user chose it.
	const h = buildSandbox({ firstBoot: true, hostValue: {} });
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	// > 200ms debounce: the push gate flush + debounce must BOTH stay silent
	// for a pure-factory boot (blue-team T3/A2 — a 50ms wait let the gate
	// leak factory seeds into the host file undetected).
	await new Promise((resolve) => setTimeout(resolve, 400));
	assert.equal(h.getItem('dsh-dream-skin:skin'), 'nebula', 'first launch paints the factory look');
	assert.equal(h.sent.sets.length, 0, 'pure-factory boot pushes nothing to the host file');
});

test('blue-team T1: same-origin reload does NOT bake factory seeds into the host file', async (t) => {
	// Reload vector: after the first launch seeded localStorage, a same-origin
	// reload early-returns from applyFactoryDefaults (marker present) — no
	// session seal runs, yet the empty host file must still NOT trigger a
	// migration push of the untouched factory values.
	const h = buildSandbox({ firstBoot: true, hostValue: {} });
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await new Promise((resolve) => setTimeout(resolve, 400));
	assert.equal(h.sent.sets.length, 0, 'pre: first launch pushed nothing');
	// Second boot on the SAME origin: localStorage intact (factory values +
	// marker + provenance snapshot), host file still empty.
	e.apply(makeApplyContext(h));
	await new Promise((resolve) => setTimeout(resolve, 400));
	assert.equal(h.getItem('dsh-dream-skin:skin'), 'nebula', 'factory look still active after reload');
	assert.equal(h.sent.sets.length, 0, 'reload with untouched factory values must NOT push to the host file');
	// The user then changes ONE value: only now may the host file be seeded,
	// and the provenance of the touched key must be released.
	e.apply(makeApplyContext(h, { captureActions: true }));
	const accentBag = (h.actionBags || {})['dream-skin-accent'];
	accentBag.setAccent('#123456');
	await new Promise((resolve) => setTimeout(resolve, 400));
	assert.ok(h.sent.sets.length >= 1, 'a real user write IS pushed');
	const lastPatch = h.sent.sets[h.sent.sets.length - 1];
	assert.equal(lastPatch['dsh-dream-skin:accent'], '#123456', 'user value pushed');
	assert.equal(lastPatch['dsh-dream-skin:skin'], undefined, 'untouched factory skin value stays out of the host file');
});

test('blue-team B2: upgrader who only touched the sidebar keeps their look (no factory seeding)', async (t) => {
	// An existing user whose ONLY stored preference is the sidebar opacity —
	// a key the old sentinel list missed — must not be force-seeded with the
	// full factory look (nebula + horse wallpaper + 1h third-party polling).
	const h = buildSandbox({ firstBoot: true, hostValue: {} });
	// Simulate the upgrader: only the sidebar key, no marker.
	h.localStorage.removeItem('dsh-dream-skin:factory-applied');
	h.localStorage.setItem('dsh-dream-skin:sidebar-opacity', '0.42');
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal(h.getItem('dsh-dream-skin:sidebar-opacity'), '0.42', 'upgrader sidebar value kept');
	assert.equal(h.getItem('dsh-dream-skin:skin'), null, 'no factory skin forced on the upgrader');
	assert.equal(h.getItem('dsh-dream-skin:wallpaper'), null, 'no factory wallpaper forced on the upgrader');
	assert.equal(h.getItem('dsh-dream-skin:wallpaper-refresh'), null, 'no factory refresh config forced on the upgrader');
	assert.equal(h.getItem('dsh-dream-skin:material-preset'), null, 'no factory material forced on the upgrader');
});

test('writes push to the host channel after a debounce', async (t) => {
	const h = buildSandbox({ hostValue: {} });
	const e = h.factory(makeRequire());
	const ctx = makeApplyContext(h, { captureActions: true });
	e.apply(ctx);
	// exercise the accent row's setAccent, which writes storage + schedules a host push
	const bags = h.actionBags;
	assert.ok(bags['dream-skin-accent'], 'accent action bag captured');
	// setStorage isn't directly exposed; drive via accent setAccent (writes accent)
	bags['dream-skin-accent'].setAccent('#ff8800');
	await new Promise((resolve) => setTimeout(resolve, 350)); // > 200ms debounce
	assert.ok(h.sent.sets.length >= 1, 'a host SET was issued after write');
	const lastPatch = h.sent.sets[h.sent.sets.length - 1];
	assert.equal(lastPatch['dsh-dream-skin:accent'], '#ff8800', 'accent pushed to host');
});

test('degrades gracefully when host channel is unavailable', async (t) => {
	// fetchImpl that always fails like a non-existent route
	const h = buildSandbox({ fetchImpl: async () => { throw new Error('host unavailable'); } });
	const e = h.factory(makeRequire());
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));
	// Reads/writes still work purely in localStorage — apply returned and set up rows.
	assert.ok(true, 'apply() did not throw with unavailable host channel');
});

test('stable-DSH fallback path (store seed missing) still boots and adopts host keys', async (t) => {
	const h = buildSandbox({ hostValue: { 'dsh-dream-skin:skin': 'midnight' } });
	const e = h.factory(makeRequire({ storeMissing: true }));
	const ctx = makeApplyContext(h);
	e.apply(ctx);
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal(h.getItem('dsh-dream-skin:skin'), 'midnight', 'host-adopted skin persisted via the fallback path');
});

test('post-release review: hung host probe releases the gate; a late write pushes ONLY user-written keys (no null erasure)', async (t) => {
	// Two review findings in one scenario:
	// 🟠-1 the 4s probe timeout must cover the whole fetch+json probe — with a
	// never-resolving fetch the gate MUST still open (previously the gate
	// stayed shut for the whole session);
	// 🟠-2 the flush push must carry ONLY keys written this session. Boot-time
	// READS cache absent keys as null in stateCache; pushing those nulls would
	// ERASE the user's durable accent/packs/favorites on the host.
	let timeoutFired = false;
	const h = buildSandbox({
		firstBoot: true,
		hostValue: {},
		fetchImpl: async (url, init) => {
			// Only the boot GET probe hangs (stalled host connection); SET calls
			// must be recorded normally or the flush could never be observed.
			const bodyObj = JSON.parse(init.body);
			if (bodyObj.method === 'set') {
				sentSets.push(bodyObj.patch);
				return { ok: true, status: 200, json: async () => ({ ok: true }) };
			}
			return new Promise(() => {});
		}
	});
	const sentSets = h.sent.sets;
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h, { captureActions: true }));
	// The user writes BEFORE the probe settles (the common "first change on a
	// slow boot" order) — the write must be held by the gate, then flushed.
	h.actionBags['dream-skin-accent'].setAccent('#123456');
	// > 4s probe timeout + 200ms debounce + slack.
	await new Promise((resolve) => setTimeout(resolve, 4400));
	assert.equal(h.sent.sets.length, 1, 'exactly one push: the gate flushed the held user write');
	const patch = h.sent.sets[0];
	assert.equal(patch['dsh-dream-skin:accent'], '#123456', 'the user write made it to the host file');
	for (const [key, value] of Object.entries(patch)) {
		assert.notEqual(value, null, `no null-erase of ${key} (read-cached absent keys stay out of the patch)`);
	}
	assert.equal(patch['dsh-dream-skin:favorites'], undefined, 'durable favorites NOT erased from the host file');
	assert.equal(patch['dsh-dream-skin:packs'], undefined, 'durable packs NOT erased from the host file');
	timeoutFired = true;
	assert.ok(timeoutFired, 'reached the post-timeout assertions');
});

test('issue #51: dynamic-port restart with cleared wallpaper does NOT flash the factory wallpaper', async (t) => {
	// Electron shell, fresh port every launch: empty localStorage, no marker
	// (firstBoot), host file holds the user's CLEARED wallpaper (null from the
	// full-state replacement push). The factory wallpaper must never seed —
	// neither at boot (the reported one-frame flash) nor after the probe.
	const h = buildSandbox({
		firstBoot: true,
		hostValue: { 'dsh-dream-skin:wallpaper': null, 'dsh-dream-skin:skin': 'ivory' }
	});
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	// Boot pass: non-visual defaults seed, wallpaper must NOT be there yet.
	assert.equal(h.getItem('dsh-dream-skin:wallpaper'), undefined, 'no factory wallpaper at first paint');
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal(h.getItem('dsh-dream-skin:wallpaper'), undefined, 'factory wallpaper NOT resurrected after probe (host is authoritative)');
	assert.equal(h.getItem('dsh-dream-skin:skin'), 'ivory', 'user skin adopted');
	assert.equal(h.getItem('dsh-dream-skin:factory-applied'), '1', 'factory marker still written');
});

test('issue #51: true first install still gets the factory wallpaper (deferred seed)', async (t) => {
	// Genuine first install: empty localStorage AND an empty host file. The
	// wallpaper keys must arrive via the deferred seed once the probe settles
	// — a few hundred ms later than before, but the shipped look is intact.
	const h = buildSandbox({ firstBoot: true, hostValue: {} });
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.equal(h.getItem('dsh-dream-skin:wallpaper-kind'), 'image', 'deferred wallpaper kind seeded after probe');
	assert.ok(h.getItem('dsh-dream-skin:wallpaper') != null, 'deferred wallpaper seeded after probe');
});

test('issue #51: unreachable host on first install still seeds the wallpaper (catch path)', async (t) => {
	// Host probe fails/times out: report=false = "no host decision seen" — the
	// shipped look must still seed (otherwise a transient host outage on a
	// true first install would leave the user permanently wallpaper-less).
	const h = buildSandbox({
		firstBoot: true,
		fetchImpl: async () => { throw new Error('host unavailable'); }
	});
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await new Promise((resolve) => setTimeout(resolve, 50));
	assert.ok(h.getItem('dsh-dream-skin:wallpaper') != null, 'wallpaper seeded on the unreachable-host path');
});
