/**
 * dsh-dream-skin — URL-wallpaper refresh interval in MINUTES (10.22.1, T10).
 *
 * Contract (design §12): new key `dsh-dream-skin:wallpaper-refresh-minutes`
 * `{minutes, mirrorHours}`, range 5..43200, default 1440. The legacy key
 * `dsh-dream-skin:wallpaper-refresh` keeps `on` / `lastFiredAt` and a rounded
 * `hours` mirror so an older build keeps working; `minutes` is trusted only
 * while `mirrorHours` equals the legacy `hours`. The hours→minutes migration is
 * idempotent and runs only after the host probe settled.
 *
 * Each AC samples observable storage / scheduling behaviour through the public
 * `apply` path, never a private helper.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');
const OLD = 'dsh-dream-skin:wallpaper-refresh';
const NEW = 'dsh-dream-skin:wallpaper-refresh-minutes';
const URL_SEED = {
	'dsh-dream-skin:wallpaper-kind': 'url',
	'dsh-dream-skin:wallpaper-url': 'https://example.com/daily.jpg',
	'dsh-dream-skin:wallpaper-follows-skin': '0'
};

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
 * Sandbox with a controllable host GET, a controllable clock and a captured
 * refresh interval. `store` may be passed in to simulate a reload / an older
 * build sharing the same localStorage.
 */
function buildSandbox({ hostValue = {}, seed = {}, firstBoot = false, store = null, clock = null, code = null } = {}) {
	const body = makeEl();
	const document = { body, createElement: () => makeEl(), createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl() };
	const loc = { origin: 'http://x', pathname: '/', search: '', hash: '' };
	const map = store || new Map();
	for (const [k, v] of Object.entries(seed)) map.set(k, String(v));
	if (!firstBoot && !store) map.set('dsh-dream-skin:factory-applied', '1');
	const localStorage = {
		getItem: (k) => (map.has(k) ? map.get(k) : null),
		setItem: (k, v) => map.set(k, String(v)),
		removeItem: (k) => map.delete(k)
	};
	const sent = { sets: [] };
	const fetchMock = async (url, init) => {
		const b = JSON.parse(init.body);
		if (b.method === 'get') return { ok: true, status: 200, json: async () => ({ ok: true, value: hostValue }) };
		if (b.method === 'set') { sent.sets.push(b.patch); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
		return { ok: true, status: 200, json: async () => ({ ok: false }) };
	};
	const timers = { interval: null };
	const RealDate = Date;
	const FakeDate = clock
		? class extends RealDate { constructor(...a) { if (a.length === 0) super(clock.now); else super(...a); } static now() { return clock.now; } }
		: RealDate;
	let factory = null;
	const sandbox = {
		window: {}, document, navigator: {}, localStorage,
		console, location: loc, history: { replaceState() {} },
		btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
		atob: (s) => Buffer.from(s, 'base64').toString('binary'),
		unescape: (s) => s, escape: (s) => s,
		encodeURIComponent, decodeURIComponent,
		TextEncoder, TextDecoder,
		URL: Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }),
		Blob: class {}, FileReader: class {},
		// No Image constructor: a due refresh commits synchronously, so "did it
		// refresh" is a plain read of lastFiredAt.
		Image: undefined,
		Date: FakeDate,
		setTimeout, clearTimeout, alert: () => {},
		MutationObserver: class { observe() {} disconnect() {} },
		fetch: fetchMock
	};
	sandbox.window.__ModuleLoader__ = { load: (o) => { factory = o.factory; } };
	sandbox.window.location = loc;
	sandbox.window.history = sandbox.history;
	let nextId = 1;
	const live = new Map();
	sandbox.window.setInterval = (fn) => { const id = nextId++; live.set(id, fn); timers.interval = fn; return id; };
	sandbox.window.clearInterval = (id) => { if (live.get(id) === timers.interval) timers.interval = null; live.delete(id); };
	for (const k of ['document', 'localStorage', 'btoa', 'atob', 'fetch']) sandbox.window[k] = sandbox[k];
	const context = vm.createContext(sandbox);
	vm.runInContext((code || CODE) + '\nwindow.__LOGGED__=1;', context);
	return { factory, store: map, sent, timers, get: (k) => (map.has(k) ? map.get(k) : null) };
}

const REACT = { useRef: () => ({ current: {} }), useMemo: (f) => (typeof f === 'function' ? f() : f), useState: (init) => [init, () => {}] };
const RT = { defineStore: (d) => ({ spec: d, create() {} }) };
function makeRequire() {
	return (s) => {
		if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
		if (s === 'react') return REACT;
		if (s === '@deepseek-ai/dsh-client-store') return RT;
		if (s === '@deepseek-ai/dsh-client-runtime/client') return RT;
		throw new Error('unexpected require: ' + s);
	};
}

/** Apply context capturing every slot's injected action bag + store state. */
function makeApplyContext(h) {
	h.bags = [];
	h.states = [];
	return {
		theme: {
			register() { return () => {}; },
			setTheme() {},
			getTheme() { return { preference: 'system', active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
			overrideTokens() { return () => {}; }
		},
		slots: {
			inject(n, f) { f(); },
			register(desc) {
				if (typeof desc.inject === 'function') {
					const spec = desc.store && desc.store.spec;
					const bag = {};
					if (spec && typeof spec.actions.sync === 'function') {
						const state = spec.init();
						h.states.push(state);
						bag.sync = (...args) => spec.actions.sync(state, ...args);
					}
					const ra = desc.inject(bag);
					if (ra && typeof ra === 'object') h.bags.push(ra);
				}
				return {};
			}
		},
		locale: { register() {}, bind() { return (k) => k; } },
		on() { return () => {}; },
		effect(t) { t(); /* keep the generation alive: disposing would stop the tick under test */ }
	};
}

const settle = () => new Promise((r) => setTimeout(r, 60));

async function boot(opts) {
	const h = buildSandbox(opts);
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	h.adv = h.bags.find((b) => typeof b.setRefreshMinutes === 'function');
	h.state = () => h.states.find((s) => Object.prototype.hasOwnProperty.call(s, 'refreshMinutes'));
	await settle();
	return h;
}
const json = (h, k) => { const v = h.get(k); return v === null ? null : JSON.parse(v); };

test('AC16 migration: legacy {on:1,hours:3} becomes {minutes:180,mirrorHours:3} after the host probe, idempotently', async () => {
	const h = await boot({ seed: { ...URL_SEED, [OLD]: JSON.stringify({ on: 1, hours: 3, lastFiredAt: Date.now() }) } });
	assert.deepEqual(json(h, NEW), { minutes: 180, mirrorHours: 3 }, 'migrated once the probe settled');
	const bytesOld = h.get(OLD);
	const bytesNew = h.get(NEW);
	// Reload on the same origin: the migration runs again and must change nothing.
	const h2 = await boot({ store: h.store, hostValue: { [OLD]: bytesOld, [NEW]: bytesNew } });
	assert.equal(h2.get(NEW), bytesNew, 'second migration leaves the minutes key byte-identical');
	assert.equal(h2.get(OLD), bytesOld, 'second migration leaves the legacy key byte-identical');
	assert.ok(!h2.sent.sets.some((p) => Object.prototype.hasOwnProperty.call(p, NEW)), 'a consistent key is not re-written / re-pushed');
});

test('AC16 migration: an untouched factory seed is never migrated', async () => {
	const h = await boot({ firstBoot: true, hostValue: {} });
	assert.equal(h.get(NEW), null, 'no minutes key from the factory seed');
	assert.ok(!h.sent.sets.some((p) => Object.prototype.hasOwnProperty.call(p, NEW)), 'nothing pushed for the minutes key');
});

test('AC17 downgrade/upgrade: 90 min mirrors hours=2; an older build editing hours to 5 wins (300 min)', async () => {
	const now = Date.now();
	const clock = { now };
	const h = await boot({ clock, seed: { ...URL_SEED } });
	h.adv.setRefreshMinutes(true, 90);
	assert.equal(json(h, OLD).hours, 2, 'legacy key carries the rounded hours mirror');
	assert.equal(json(h, OLD).on, 1, 'legacy key still carries on');
	assert.deepEqual(json(h, NEW), { minutes: 90, mirrorHours: 2 });
	assert.equal(h.state().refreshMinutes, 90, 'settings store shows minutes');
	// The older build only knows the legacy key: it edits hours and keeps the rest.
	const legacy = json(h, OLD);
	h.store.set(OLD, JSON.stringify({ ...legacy, hours: 5, lastFiredAt: now - 100 * 60 * 1000 }));
	// Upgrade again. 100 min since the last refresh: due under 90 min, NOT due under 300 min.
	const before = json(h, OLD).lastFiredAt;
	const h2 = await boot({ clock, store: h.store, hostValue: {} });
	assert.equal(json(h2, OLD).lastFiredAt, before, 'boot catch-up honours the legacy 5 h, not the stale 90 min');
	assert.deepEqual(json(h2, NEW), { minutes: 300, mirrorHours: 5 }, 'minutes key re-derived from the legacy edit');
});

test('AC18 host wins: local {30,1} vs host legacy hours:6 reads 360 minutes after adoption', async () => {
	const stamp = Date.now();
	const h = await boot({
		seed: { ...URL_SEED, [OLD]: JSON.stringify({ on: 1, hours: 1, lastFiredAt: stamp }), [NEW]: JSON.stringify({ minutes: 30, mirrorHours: 1 }) },
		hostValue: { [OLD]: JSON.stringify({ on: 1, hours: 6, lastFiredAt: stamp }) }
	});
	assert.equal(json(h, OLD).hours, 6, 'host legacy value adopted');
	assert.deepEqual(json(h, NEW), { minutes: 360, mirrorHours: 6 }, 'post-adoption migration follows the host value');
});

test('AC19 boundaries and invalid values', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	const cases = [[0, 5], [4, 5], [5, 5], [43200, 43200], [43201, 43200], [-1, 5], [7.4, 7], [7.6, 8], [1440, 1440]];
	for (const [input, want] of cases) {
		h.adv.setRefreshMinutes(true, input);
		assert.equal(json(h, NEW).minutes, want, `minutes ${input} -> ${want}`);
		const hours = json(h, OLD).hours;
		assert.equal(hours, Math.min(720, Math.max(1, Math.round(want / 60))), `hours mirror for ${want}`);
		assert.equal(json(h, NEW).mirrorHours, hours, 'mirror equals legacy hours');
	}
	h.adv.setRefreshMinutes(true, 120);
	for (const junk of ['abc', null, undefined, NaN, Infinity]) {
		h.adv.setRefreshMinutes(true, junk);
		assert.equal(json(h, NEW).minutes, 120, `write of ${String(junk)} keeps / clamps sanely`);
		h.adv.setRefreshMinutes(true, 120);
	}
	// Read side: every unusable minutes record falls back to legacy hours × 60.
	const bad = ['{"minutes":"abc","mirrorHours":4}', '{"minutes":null,"mirrorHours":4}', '{"minutes":"Infinity","mirrorHours":4}', '{not json', '{"minutes":30}', '[30,4]'];
	for (const raw of bad) {
		const hb = await boot({ seed: { ...URL_SEED, [OLD]: JSON.stringify({ on: 1, hours: 4, lastFiredAt: Date.now() }), [NEW]: raw } });
		assert.deepEqual(json(hb, NEW), { minutes: 240, mirrorHours: 4 }, `unusable record ${raw} falls back to 4 h × 60`);
	}
});

test('AC19 legacy setRefresh(on, hours) stays a compatible wrapper', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	h.adv.setRefresh(true, 24);
	assert.equal(json(h, OLD).hours, 24);
	assert.deepEqual(json(h, NEW), { minutes: 1440, mirrorHours: 24 });
	h.adv.setRefresh(true, 9999);
	assert.equal(json(h, OLD).hours, 720, 'legacy cap still 720 h');
	assert.equal(json(h, NEW).minutes, 43200);
});

test('AC20 scheduling: 5-minute interval is not due at 4:59 and fires within one tick after', async () => {
	const now = Date.now();
	const clock = { now };
	const last = now - (4 * 60 + 59) * 1000;
	const h = await boot({
		clock,
		seed: { ...URL_SEED, [OLD]: JSON.stringify({ on: 1, hours: 1, lastFiredAt: last }), [NEW]: JSON.stringify({ minutes: 5, mirrorHours: 1 }) }
	});
	assert.equal(json(h, OLD).lastFiredAt, last, 'not due at 4:59 (boot catch-up)');
	assert.equal(typeof h.timers.interval, 'function', 'tick armed');
	h.timers.interval();
	assert.equal(json(h, OLD).lastFiredAt, last, 'still not due on a tick at 4:59');
	clock.now += 60 * 1000;
	h.timers.interval();
	assert.equal(json(h, OLD).lastFiredAt, clock.now, 'fired on the next tick (≤ one tick late)');
	assert.deepEqual(json(h, NEW), { minutes: 5, mirrorHours: 1 }, 'committing a refresh keeps the minutes record consistent');
});

test('AC19 null and blank input keep the stored interval (no coercion to 0 → 5)', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	h.adv.setRefreshMinutes(true, 90);
	for (const junk of [null, '', '   ']) {
		h.adv.setRefreshMinutes(true, junk);
		assert.deepEqual(json(h, NEW), { minutes: 90, mirrorHours: 2 }, `input ${JSON.stringify(junk)} ignored`);
		assert.equal(json(h, OLD).hours, 2);
	}
	h.adv.setRefreshMinutes(false, null);
	assert.equal(json(h, OLD).on, 0, 'the switch still applies when the minutes are ignored');
	assert.equal(json(h, NEW).minutes, 90);
});

test('default interval is 1440 minutes when nothing is stored', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	h.adv.setRefreshMinutes(true, undefined);
	assert.deepEqual(json(h, NEW), { minutes: 1440, mirrorHours: 24 });
});

test('clearing the wallpaper drops both refresh keys', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	h.adv.setRefreshMinutes(true, 30);
	assert.notEqual(h.get(NEW), null);
	h.adv.clearAll();
	assert.equal(h.get(OLD), null, 'legacy key cleared');
	assert.equal(h.get(NEW), null, 'minutes key cleared');
});

test('AC22 i18n: every dictionary has bg2.refreshMinutes and none keeps bg2.refreshHours', () => {
	assert.equal((CODE.match(/"bg2\.refreshMinutes":/g) || []).length, 8, 'eight dictionaries carry the minutes label');
	assert.equal((CODE.match(/bg2\.refreshHours/g) || []).length, 0, 'the hours label is gone');
	assert.match(CODE, /min: REFRESH_MINUTES_MIN,\s*max: REFRESH_MINUTES_MAX,/, 'input box bounds are the minute range');
});
