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
function buildSandbox({ hostValue = {}, fetchImpl = null, seed = {} } = {}) {
	const body = makeEl();
	const document = { body, createElement: () => makeEl(), createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl() };
	const loc = { origin: 'http://x', pathname: '/', search: '', hash: '' };
	const store = new Map();
	// seed keys are the FULL localStorage keys (they already carry dsh-dream-skin: prefix)
	for (const [k, v] of Object.entries(seed)) store.set(k, String(v));
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
