/**
 * dsh-dream-skin — boss key (10.23.0, design §4–§6, AC1–AC15, AC21, AC33, AC34).
 *
 * The toggle swaps the wallpaper for a solid colour in the same synchronous call,
 * freezes rotation/refresh, and restores only after the image decoded. The key is
 * `dsh-dream-skin:boss-key` (config) + `dsh-dream-skin:boss-active` (phase, shared
 * by windows through the `storage` event). Window-local: it is a host shortcut (or a
 * keydown fallback), never a global OS hotkey.
 *
 * Harness: a small tree DOM that logs every backgroundImage write, a controllable
 * Image (manual onload), a controllable clock, captured tick / listeners, and an
 * optional host `shortcuts` service with a catalog.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');
const CFG = 'dsh-dream-skin:boss-key';
const ACTIVE = 'dsh-dream-skin:boss-active';
const ROT = 'dsh-dream-skin:wallpaper-rotation';
const REF = 'dsh-dream-skin:wallpaper-refresh';
const REF_MIN = 'dsh-dream-skin:wallpaper-refresh-minutes';
const IMG_A = 'https://example.com/a.jpg';
const URL_SEED = { 'dsh-dream-skin:wallpaper-kind': 'url', 'dsh-dream-skin:wallpaper-url': IMG_A, 'dsh-dream-skin:wallpaper-follows-skin': '0' };
const LANGS = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru'];

// ---------- mini DOM (logs every backgroundImage write) ----------
let bgLog = [];
function makeStyle(el) {
	return new Proxy({}, {
		set(t, k, v) {
			if (k === 'cssText') { for (const x of Object.keys(t)) delete t[x]; }
			if (k === 'backgroundImage') bgLog.push({ el, v: String(v) });
			t[k] = v; return true;
		}
	});
}
let uid = 0;
function makeEl(tag = 'div') {
	const el = {
		uid: ++uid, tagName: String(tag).toUpperCase(), dataset: {}, attrs: {}, parentNode: null, childNodes: [], _text: '', listeners: {},
		get children() { return this.childNodes; },
		get textContent() { return this._text; }, set textContent(v) { this._text = String(v); },
		get innerHTML() { return this._text; }, set innerHTML(v) { this._text = String(v); },
		setAttribute(k, v) { this.attrs[k] = String(v); },
		getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
		hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k); },
		removeAttribute(k) { delete this.attrs[k]; },
		_detach(c) { if (c.parentNode) { const a = c.parentNode.childNodes; const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); c.parentNode = null; } },
		appendChild(c) { this._detach(c); this.childNodes.push(c); c.parentNode = this; return c; },
		append(c) { return this.appendChild(c); },
		prepend(c) { this._detach(c); this.childNodes.unshift(c); c.parentNode = this; },
		insertBefore(c, ref) { this._detach(c); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(c); else this.childNodes.splice(i, 0, c); c.parentNode = this; return c; },
		after(c) { const p = this.parentNode; if (!p) return; p._detach(c); const i = p.childNodes.indexOf(this); p.childNodes.splice(i + 1, 0, c); c.parentNode = p; },
		get previousSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return i > 0 ? p.childNodes[i - 1] : null; },
		get nextSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return p.childNodes[i + 1] || null; },
		remove() { if (this.parentNode) this.parentNode._detach(this); },
		contains(x) { for (let n = x; n; n = n.parentNode) if (n === this) return true; return false; },
		click() {}, addEventListener() {}, removeEventListener() {}
	};
	el.style = makeStyle(el);
	return el;
}

/** Listener registry with capture flag kept, so "0 keydown listeners" is observable. */
function makeTarget(obj) {
	obj.listeners = [];
	obj.addEventListener = (type, fn, cap) => obj.listeners.push({ type, fn, cap: !!cap });
	obj.removeEventListener = (type, fn, cap) => { const i = obj.listeners.findIndex((l) => l.type === type && l.fn === fn && l.cap === !!cap); if (i >= 0) obj.listeners.splice(i, 1); };
	obj.count = (type) => obj.listeners.filter((l) => l.type === type).length;
	obj.fire = (type, ev) => { for (const l of obj.listeners.slice()) if (l.type === type) l.fn(ev); };
	return obj;
}

/**
 * imageMode: 'ok' (onload on src set), 'manual' (held in h.images until .load()), or 'none' (no Image).
 */
function buildSandbox({ seed = {}, store = null, hostValue = null, imageMode = 'ok', withFetch = true, clock } = {}) {
	const body = makeEl('body');
	const html = makeEl('html');
	const document = makeTarget({
		body, documentElement: html, head: makeEl('head'), visibilityState: 'visible',
		createElement: (t) => makeEl(t), createTextNode: () => makeEl('#text'),
		querySelector: () => null, querySelectorAll: () => [], getElementById: () => null
	});
	const loc = { origin: 'http://x', pathname: '/', search: '', hash: '' };
	const map = store || new Map();
	for (const [k, v] of Object.entries(seed)) map.set(k, String(v));
	if (!store && !map.has('dsh-dream-skin:factory-applied')) map.set('dsh-dream-skin:factory-applied', '1');
	const localStorage = { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
	const sent = { sets: [] };
	const hostGate = {};
	hostGate.promise = new Promise((r) => { hostGate.open = r; });
	if (hostValue === null) hostGate.open();
	const fetchMock = async (url, init) => {
		const b = JSON.parse(init.body);
		if (b.method === 'get') { await hostGate.promise; return { ok: true, status: 200, json: async () => ({ ok: true, value: hostValue || {} }) }; }
		if (b.method === 'set') { sent.sets.push(b.patch); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
		return { ok: true, status: 200, json: async () => ({ ok: false }) };
	};
	const images = [];
	function FakeImage() {
		const self = this; this.onload = null; this.onerror = null; let src = '';
		Object.defineProperty(this, 'src', {
			get: () => src,
			set: (v) => { src = v; const rec = { url: v, load: () => self.onload && self.onload(), fail: () => self.onerror && self.onerror() }; images.push(rec); if (imageMode === 'ok') rec.load(); }
		});
	}
	const now = clock || { t: Date.now() };
	class FakeDate extends Date { constructor(...a) { if (a.length) super(...a); else super(now.t); } static now() { return now.t; } }
	let tick = null;
	let factory = null;
	const win = makeTarget({});
	const sandbox = {
		window: win, document, navigator: { platform: 'Win32', userAgent: 'x' }, localStorage, console, location: loc, history: { replaceState() {} },
		btoa: (s) => Buffer.from(s, 'binary').toString('base64'), atob: (s) => Buffer.from(s, 'base64').toString('binary'),
		unescape: (s) => s, escape: (s) => s, encodeURIComponent, decodeURIComponent, TextEncoder, TextDecoder,
		URL: Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }),
		Blob: class {}, FileReader: class {},
		Image: imageMode === 'none' ? undefined : FakeImage, Date: FakeDate, setTimeout, clearTimeout, alert: () => {},
		MutationObserver: class { observe() {} disconnect() {} }
	};
	if (withFetch) sandbox.fetch = fetchMock;
	win.__ModuleLoader__ = { load: (o) => { factory = o.factory; } };
	win.location = loc; win.history = sandbox.history; win.navigator = sandbox.navigator;
	win.setInterval = (fn) => { tick = fn; return 5; };
	win.clearInterval = () => { tick = null; };
	for (const k of ['document', 'localStorage', 'btoa', 'atob', 'fetch']) if (sandbox[k]) win[k] = sandbox[k];
	vm.runInContext(CODE, vm.createContext(sandbox));
	return { factory, store: map, sent, document, body, html, win, images, now, hostGate, tick: () => tick && tick(), get: (k) => (map.has(k) ? map.get(k) : null) };
}

const REACT = { useRef: () => ({ current: {} }), useMemo: (f) => (typeof f === 'function' ? f() : f), useState: (i) => [i, () => {}], useEffect() {}, useCallback: (f) => f };
const RT = { defineStore: (d) => ({ spec: d, create() {} }) };
const makeRequire = () => (s) => {
	if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
	if (s === 'react') return REACT;
	if (s === '@deepseek-ai/dsh-client-store' || s === '@deepseek-ai/dsh-client-runtime/client') return RT;
	throw new Error('unexpected require: ' + s);
};
/** A host shortcuts service with a catalog that drops entries on dispose. */
function makeShortcuts({ throwOnRegister = false, refuseDefaults = false } = {}) {
	const entries = [];
	const subs = new Set();
	return {
		registered: [],
		entries,
		register(spec) {
			if (throwOnRegister) throw new Error('nope');
			if (refuseDefaults && spec.defaults && Object.keys(spec.defaults).length) throw new Error('default overlaps another command');
			this.registered.push(spec);
			const entry = { id: spec.id, keys: null, conflicts: [] };
			entries.push(entry);
			for (const s of subs) s();
			return () => { const i = entries.indexOf(entry); if (i >= 0) entries.splice(i, 1); for (const s of subs) s(); };
		},
		catalog: { getSnapshot: () => ({ entries: entries.slice() }), subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); } },
		subCount: () => subs.size
	};
}
function makeApplyContext(h, shortcuts) {
	h.bags = []; h.states = []; h.rows = []; h.disposers = [];
	const ctx = {
		theme: {
			register() { return () => {}; }, setTheme() {},
			getTheme() { return { preference: 'system', active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
			overrideTokens() { return () => {}; }
		},
		slots: {
			inject(n, f) { f(); },
			register(desc, Comp) {
				h.rows.push({ desc, Comp });
				if (typeof desc.inject === 'function') {
					const spec = desc.store && desc.store.spec;
					const bag = {};
					if (spec && typeof spec.actions.sync === 'function') { const state = spec.init(); h.states.push(state); bag.sync = (...a) => spec.actions.sync(state, ...a); }
					const ra = desc.inject(bag);
					if (ra && typeof ra === 'object') h.bags.push(ra);
				}
				return {};
			}
		},
		locale: { register(ns, dicts) { h.dicts = h.dicts || dicts; }, bind() { return (k) => k; } },
		on() { return () => {}; },
		effect(t) { const d = t(); if (typeof d === 'function') h.disposers.push(d); }
	};
	if (shortcuts) ctx.get = (n) => (n === 'shortcuts' ? shortcuts : null);
	return ctx;
}
const settle = (ms = 40) => new Promise((r) => setTimeout(r, ms));
async function boot(opts = {}) {
	bgLog = [];
	const h = buildSandbox(opts);
	h.entry = h.factory(makeRequire());
	h.shortcuts = opts.shortcuts || null;
	h.ctx = makeApplyContext(h, h.shortcuts);
	h.entry.apply(h.ctx);
	h.boss = h.bags.find((b) => typeof b.toggleNow === 'function');
	h.adv = h.bags.find((b) => typeof b.setRotationList === 'function');
	h.status = () => h.win.__DSH_DREAM_SKIN_STATUS__ || null;
	h.unmount = () => { for (const d of h.disposers.splice(0)) d(); };
	h.press = (dt = 200) => { h.now.t += dt; h.boss.toggleNow(); };
	if (opts.settle !== false) await settle();
	return h;
}
/** The live wallpaper layer = last element whose backgroundImage was written and is still attached. */
const layer = (h) => { for (let i = bgLog.length - 1; i >= 0; i--) if (h.body.contains(bgLog[i].el) && !String(bgLog[i].el.style.cssText || '').includes('scale(1.2)')) return bgLog[i].el; return null; };
const bleed = (h) => h.body.childNodes.find((n) => String(n.style.cssText || '').includes('scale(1.2)')) || null;
const isBoss = (h) => h.html.getAttribute('data-dsk-boss') === '1';
const caption = (h) => h.body.childNodes.find((n) => n.getAttribute('aria-hidden') === 'true' && n.childNodes[0] && n.childNodes[0].getAttribute('dir') === 'auto') || null;
const captionHidden = (h) => { const c = caption(h); return !c || /display:\s*none/.test(String(c.style.cssText)); };
const seedCfg = (cfg, extra = {}) => ({ ...URL_SEED, [CFG]: JSON.stringify(cfg), ...extra });
const json = (h, k) => { const v = h.get(k); return v === null ? null : JSON.parse(v); };
const keyEv = (over = {}) => ({ code: 'KeyV', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, repeat: false, isComposing: false, target: null, preventDefault() {}, ...over });

// ---------- AC1 / AC11 (host path) ----------
test('AC1 host shortcuts: one command with the ⌘⌥V / Ctrl+Alt+V default map, labelled, routed to the toggle; AC11 dispose clears the catalog', async () => {
	const sc = makeShortcuts();
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }), shortcuts: sc });
	assert.equal(sc.registered.length, 1, 'registered exactly once');
	const spec = sc.registered[0];
	assert.equal(spec.id, 'dsh-dream-skin.boss-key.toggle');
	const V = { code: 'KeyV', modifiers: ['primary', 'alt'] };
	assert.deepEqual(JSON.parse(JSON.stringify(spec.defaults)), { 'desktop:macos': V, 'desktop:windows': V, 'web:macos': V, 'web:windows': V }, 'default ⌘⌥V / Ctrl+Alt+V; Linux left unbound (host reserves primary+V)');
	assert.equal(typeof spec.label(), 'string');
	assert.equal(h.document.count('keydown'), 0, 'host path: no fallback listener');
	assert.equal(h.status().boss.via, 'host');
	const r = spec.resolve();
	assert.equal(r.status, 'handled');
	h.now.t += 500; r.run();
	assert.ok(isBoss(h), 'the host command toggles boss mode');
	assert.equal(sc.entries.length, 1);
	h.unmount();
	assert.equal(sc.entries.length, 0, 'AC11: command gone from the catalog');
	assert.equal(sc.subCount(), 0, 'AC11: catalog subscription released');
	assert.ok(!h.html.hasAttribute('data-dsk-boss'), 'AC11: attribute removed');
});

// ---------- AC2 / AC33 ----------
test('AC2+AC33 enter: same sync stack → colour set, image none, bleed gone, attribute on, caption hidden (mid + final samples)', async () => {
	const h = await boot({ seed: seedCfg({ color: '#334455', bootPaint: 'seed-first' }, { 'dsh-dream-skin:wallpaper-fit': 'blur', 'dsh-dream-skin:wallpaper-caption': JSON.stringify({ on: 1, text: '晚安' }) }) });
	const before = layer(h);
	assert.ok(String(before.style.backgroundImage).includes('a.jpg'), 'precondition: image showing');
	assert.ok(bleed(h), 'precondition: bleed layer');
	assert.ok(caption(h) && !captionHidden(h), 'precondition: caption visible');
	h.press();
	// mid sample: still inside the same macrotask, nothing awaited
	const el = layer(h);
	assert.equal(el.style.backgroundImage, 'none');
	assert.equal(String(el.style.backgroundColor).toLowerCase(), '#334455');
	assert.equal(bleed(h), null, 'bleed removed');
	assert.ok(isBoss(h), 'html[data-dsk-boss=1]');
	assert.ok(captionHidden(h), 'AC33: caption hidden in the same stack');
	assert.equal(h.get(ACTIVE), '1');
	await settle();
	// final sample
	assert.equal(layer(h).style.backgroundImage, 'none');
	assert.ok(captionHidden(h));
	assert.equal(h.status().boss.phase, 'boss');
});

// ---------- AC3 ----------
test('AC3 boss freezes rotation: ticks past the interval start no probe and keep the URL', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }, { [ROT]: JSON.stringify({ on: 1, mode: 'sequential', minutes: 5, urls: [IMG_A, 'https://example.com/b.jpg'], lastRotatedAt: Date.now() }) }) });
	h.press();
	const n = h.images.length;
	h.now.t += 30 * 60 * 1000;
	h.tick(); h.tick();
	h.document.fire('visibilitychange', {});
	assert.equal(h.images.length, n, 'no Image constructed while boss');
	assert.equal(h.get('dsh-dream-skin:wallpaper-url'), IMG_A);
});

// ---------- AC4 ----------
test('AC4 a rotation probe in flight at entry lands later: background stays solid', async () => {
	const h = await boot({ imageMode: 'manual', seed: seedCfg({ bootPaint: 'seed-first' }, { [ROT]: JSON.stringify({ on: 1, mode: 'sequential', minutes: 5, urls: [IMG_A, 'https://example.com/b.jpg'], lastRotatedAt: 1 }) }) });
	const probe = h.images.find((i) => i.url.includes('b.jpg'));
	assert.ok(probe, 'precondition: a rotation probe is in flight');
	h.press();
	probe.load();
	assert.equal(layer(h).style.backgroundImage, 'none', 'late onload does not paint');
	assert.equal(h.get('dsh-dream-skin:wallpaper-url'), IMG_A, 'and does not commit');
	assert.ok(!bgLog.filter((w) => w.v.includes('b.jpg')).length);
});

// ---------- AC5 / AC33 ----------
test('AC5+AC33 exit: solid until decode resolves, then the same image string; caption back with it; rotation resumes with lastRotatedAt≈now', async () => {
	const h = await boot({ imageMode: 'manual', seed: seedCfg({ bootPaint: 'seed-first' }, { 'dsh-dream-skin:wallpaper-caption': JSON.stringify({ on: 1, text: 'hi' }), [ROT]: JSON.stringify({ on: 1, mode: 'sequential', minutes: 60, urls: [IMG_A, 'https://example.com/b.jpg'], lastRotatedAt: Date.now() }) }) });
	const original = layer(h).style.backgroundImage;
	h.press();
	h.press();
	assert.equal(h.status().boss.phase, 'restoring');
	assert.equal(h.get(ACTIVE), '0');
	await settle();
	assert.equal(layer(h).style.backgroundImage, 'none', 'still solid before decode');
	assert.ok(captionHidden(h), 'AC33: caption still hidden while restoring');
	const dec = h.images[h.images.length - 1];
	dec.load();
	await settle();
	assert.equal(layer(h).style.backgroundImage, original, 'same image string as before entry');
	assert.ok(!captionHidden(h), 'AC33: caption back');
	assert.ok(!isBoss(h));
	assert.equal(h.status().boss.phase, 'normal');
	assert.ok(Math.abs(json(h, ROT).lastRotatedAt - h.now.t) < 1000, 'restart-interval: lastRotatedAt ≈ now');
	assert.ok(h.tick !== null);
});

// ---------- AC6 ----------
test('AC6 pressing during RESTORING voids the decode and returns to boss; the late decode paints nothing', async () => {
	const h = await boot({ imageMode: 'manual', seed: seedCfg({ bootPaint: 'seed-first' }, { 'dsh-dream-skin:wallpaper-caption': JSON.stringify({ on: 1, text: 'hi' }) }) });
	h.press(); h.press();
	const dec = h.images[h.images.length - 1];
	h.press();
	assert.equal(h.status().boss.phase, 'boss');
	const mark = bgLog.length;
	dec.load();
	await settle();
	assert.ok(!bgLog.slice(mark).some((w) => w.v.includes('url(')), 'no image painted after the stale decode');
	assert.equal(layer(h).style.backgroundImage, 'none');
	assert.ok(captionHidden(h), 'AC33: caption stays hidden');
	assert.equal(h.get(ACTIVE), '1');
});

// ---------- AC7 ----------
test('AC7 five presses inside 120ms = one press; no url( frame while boss', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }) });
	const mark = bgLog.length;
	h.press(500);
	h.press(20);
	assert.equal(h.status().boss.phase, 'boss', 'a second press 20ms later is dropped (leading-edge debounce)');
	assert.equal(h.get(ACTIVE), '1');
	for (let i = 0; i < 3; i++) h.press(20);
	assert.equal(h.status().boss.phase, 'boss', 'odd count ⇒ boss');
	await settle();
	assert.ok(!bgLog.slice(mark).some((w) => w.v.includes('url(')));
	h.press(130);
	assert.equal(h.status().boss.phase === 'restoring' || h.status().boss.phase === 'normal', true, 'outside the window a press counts');
});

// ---------- AC8 ----------
for (const [mode, stored, want] of [['restore-last', '1', true], ['restore-last', '0', false], ['always-normal', '1', false], ['always-boss', '0', true]]) {
	test(`AC8 restart onRestart=${mode} with boss-active=${stored} ⇒ ${want ? 'boss' : 'normal'}`, async () => {
		const h = await boot({ seed: seedCfg({ onRestart: mode, bootPaint: 'seed-first' }, { [ACTIVE]: stored }) });
		assert.equal(isBoss(h), want);
		assert.equal(h.get(ACTIVE), want ? '1' : '0');
		if (want) assert.ok(!bgLog.some((w) => w.v.includes('url(')), 'boss boot never paints the image');
	});
}
test('AC8 host-only state (empty localStorage) under default solid-first: first frame has no url(', async () => {
	const host = { ...URL_SEED, [ACTIVE]: '1', 'dsh-dream-skin:factory-applied': '1' };
	const h = await boot({ store: new Map([['dsh-dream-skin:factory-applied', '1']]), hostValue: host, settle: false });
	assert.ok(!bgLog.some((w) => w.v.includes('url(')), 'nothing before the host answers');
	h.hostGate.open();
	await settle(80);
	assert.ok(isBoss(h), 'host said boss ⇒ boss');
	assert.ok(!bgLog.some((w) => w.v.includes('url(')), 'and still no image');
});

// ---------- AC9 ----------
test('AC9 invalid config falls back field by field and warns once', async () => {
	const warns = [];
	const orig = console.warn;
	console.warn = (...a) => warns.push(a.join(' '));
	try {
		for (const color of ['url(x)', 'red', '#12345']) {
			const h = await boot({ seed: seedCfg({ color, bootPaint: 'seed-first' }) });
			h.press();
			assert.equal(String(layer(h).style.backgroundColor).toLowerCase(), '#1f2329', `${color} ⇒ default colour`);
			assert.ok(!String(layer(h).style.cssText).includes('url(x)'));
		}
		const h = await boot({ seed: { ...URL_SEED, [CFG]: '{broken' } });
		h.press(); h.press(); h.press();
		assert.equal(String(layer(h).style.backgroundColor).toLowerCase(), '#1f2329');
		const colorWarns = warns.filter((w) => /boss/i.test(w) && /color/.test(w) && /red/.test(w));
		assert.equal(colorWarns.length, 1, 'one warn for the bad colour, not one per read');
	} finally { console.warn = orig; }
});

// ---------- AC10 / AC11 (fallback) ----------
test('AC10 no host shortcuts: fallback keydown works; repeat / isComposing ignored; AC11 unmount leaves 0 listeners', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }) });
	assert.equal(h.status().boss.via, 'fallback');
	assert.equal(h.document.count('keydown'), 1);
	h.now.t += 500; h.document.fire('keydown', keyEv({ repeat: true }));
	assert.ok(!isBoss(h), 'repeat ignored');
	h.now.t += 500; h.document.fire('keydown', keyEv({ isComposing: true }));
	assert.ok(!isBoss(h), 'IME composition ignored');
	h.now.t += 500; h.document.fire('keydown', keyEv({ shiftKey: true }));
	assert.ok(!isBoss(h), 'wrong modifiers ignored');
	h.now.t += 500; h.document.fire('keydown', keyEv({ altKey: false }));
	assert.ok(!isBoss(h), 'plain Ctrl+V (paste) never toggles');
	h.now.t += 500; h.document.fire('keydown', keyEv());
	assert.ok(isBoss(h), 'default Ctrl+Alt+V toggles');
	h.unmount();
	assert.equal(h.document.count('keydown'), 0);
	assert.equal(h.win.count('storage'), 0);
	assert.ok(!h.html.hasAttribute('data-dsk-boss'));
});
test('AC10 a host whose register throws still gets the fallback', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }), shortcuts: makeShortcuts({ throwOnRegister: true }) });
	assert.equal(h.status().boss.via, 'fallback');
	assert.equal(h.document.count('keydown'), 1);
});
test('AC10 the settings row rejects reserved / too-weak fallback bindings', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }) });
	// recordBinding takes the recorder's keydown event (Win32 platform: ctrl = primary).
	const bad = [
		keyEv({ code: 'KeyC', altKey: false }),
		keyEv({ code: 'F5' }),
		keyEv({ code: 'KeyB', ctrlKey: false, altKey: false }),
		keyEv({ code: 'Backquote' }),
		keyEv({ code: 'KeyV', altKey: false, shiftKey: true })
	];
	for (const b of bad) {
		const r = h.boss.recordBinding(b);
		assert.ok(r && r.rejected && r.rejected.length, `${JSON.stringify(b)} rejected`);
		assert.deepEqual(json(h, CFG).fallbackBinding || { code: 'KeyV', modifiers: ['primary', 'alt'] }, { code: 'KeyV', modifiers: ['primary', 'alt'] }, 'stored binding unchanged');
	}
	const ok = h.boss.recordBinding(keyEv({ code: 'KeyJ' }));
	assert.ok(!ok.rejected || ok.rejected.length === 0);
	assert.deepEqual(json(h, CFG).fallbackBinding, { code: 'KeyJ', modifiers: ['primary', 'alt'] });
});

test('default binding: a host that refuses the default gets the command registered unbound, still on the host path', async () => {
	const sc = makeShortcuts({ refuseDefaults: true });
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }), shortcuts: sc });
	assert.equal(sc.registered.length, 1);
	assert.deepEqual(sc.registered[0].defaults, {});
	assert.equal(h.status().boss.via, 'host');
	assert.equal(h.document.count('keydown'), 0);
});
test('default binding: fallback rebinding and clearing work; a stored legacy Ctrl+Alt+Shift+B reads as the new default', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }) });
	{ const r = h.boss.recordBinding(keyEv({ code: 'KeyK' })); assert.ok(!r.rejected || r.rejected.length === 0); }
	h.now.t += 500; h.document.fire('keydown', keyEv());
	assert.ok(!isBoss(h), 'old default no longer fires after rebinding');
	h.now.t += 500; h.document.fire('keydown', keyEv({ code: 'KeyK' }));
	assert.ok(isBoss(h), 'rebound chord toggles');
	{ const r = h.boss.recordBinding(keyEv()); assert.ok(!r.rejected || r.rejected.length === 0, 'Ctrl+Alt+V passes conflict detection (Alt lifts the primary+V reservation)'); }
	assert.deepEqual(json(h, CFG).fallbackBinding, { code: 'KeyV', modifiers: ['primary', 'alt'] });
	h.boss.setBoss({ fallbackBinding: null });
	assert.equal(json(h, CFG).fallbackBinding, null, 'cleared');
	h.now.t += 500; h.document.fire('keydown', keyEv({ code: 'KeyK' }));
	h.now.t += 500; h.document.fire('keydown', keyEv());
	assert.ok(isBoss(h), 'cleared: nothing toggles');
	h.unmount();
	const h2 = await boot({ seed: seedCfg({ bootPaint: 'seed-first', fallbackBinding: { code: 'KeyB', modifiers: ['primary', 'alt', 'shift'] } }) });
	h2.now.t += 500; h2.document.fire('keydown', keyEv());
	assert.ok(isBoss(h2), 'legacy stored default migrated to Ctrl+Alt+V');
	const h3 = await boot({ seed: seedCfg({ bootPaint: 'seed-first', fallbackBinding: null }) });
	h3.now.t += 500; h3.document.fire('keydown', keyEv());
	assert.ok(!isBoss(h3), 'a stored clear survives restart');
});

// ---------- AC12 ----------
test('AC12 field-set guards: stored config and the status snapshot', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }) });
	h.boss.setBoss({ color: '#101010' });
	assert.deepEqual(Object.keys(json(h, CFG)).sort(), ['bootPaint', 'color', 'enabled', 'fallbackBinding', 'onRestart', 'resume', 'syncWindows']);
	assert.deepEqual(Object.keys(h.status().boss).sort(), ['phase', 'veil', 'via']);
	assert.equal(h.status().boss.veil, false);
});

// ---------- AC13 ----------
test('AC13 every boss.* key exists, non-empty, identically in all 8 dictionaries; placeholders kept', () => {
	const sets = {};
	for (const lang of LANGS) {
		const at = CODE.indexOf(`const ${lang} = {`);
		const body = CODE.slice(at, CODE.indexOf('};', at));
		const pairs = [...body.matchAll(/"(boss\.[a-zA-Z0-9.]+)":\s*"((?:[^"\\]|\\.)*)"/g)];
		sets[lang] = new Map(pairs.map((m) => [m[1], m[2]]));
		assert.equal(sets[lang].size, 25, `${lang} has the 25 boss keys`);
		for (const [k, v] of sets[lang]) assert.ok(v.trim().length > 0, `${lang} ${k} non-empty`);
		assert.match(sets[lang].get('boss.conflict'), /\{list\}/);
		assert.match(sets[lang].get('boss.issue'), /\{issue\}/);
	}
	for (const lang of LANGS) assert.deepEqual([...sets[lang].keys()].sort(), [...sets.zh.keys()].sort(), `${lang} key set = zh`);
});

// ---------- AC14 / AC34 ----------
test('AC14+AC34 solid-first: no url( and no caption until host probe + decode, then exactly one paint of the seed', async () => {
	const h = await boot({ imageMode: 'manual', hostValue: {}, settle: false, seed: { ...URL_SEED, 'dsh-dream-skin:wallpaper-caption': JSON.stringify({ on: 1, text: 'hi' }) } });
	assert.equal(h.status().boss.veil, true, 'veil up');
	assert.ok(!bgLog.some((w) => w.v.includes('url(')), 'no image before the probe');
	assert.ok(captionHidden(h), 'AC34: caption hidden (or absent)');
	h.hostGate.open();
	await settle();
	assert.ok(!bgLog.some((w) => w.v.includes('url(')), 'probe done, decode pending: still solid');
	assert.ok(captionHidden(h));
	const dec = h.images[h.images.length - 1];
	assert.ok(dec && dec.url.includes('a.jpg'), 'decoding the seed image');
	dec.load();
	await settle();
	const paints = bgLog.filter((w) => w.v.includes('url('));
	assert.equal(paints.length, 1, 'exactly one image paint');
	assert.ok(paints[0].v.includes('a.jpg'), 'and it is the seed');
	assert.ok(!captionHidden(h), 'AC34: caption appears with it');
	assert.equal(h.status().boss.veil, false);
});
test('AC14 control: seed-first paints the seed in the first frame', async () => {
	const h = await boot({ imageMode: 'manual', hostValue: {}, settle: false, seed: seedCfg({ bootPaint: 'seed-first' }) });
	assert.ok(bgLog.some((w) => w.v.includes('a.jpg')), 'first frame = seed');
	assert.equal(h.status().boss.veil, false);
	h.hostGate.open();
});

// ---------- AC15 ----------
async function twoWindows(cfg = {}, extra = {}) {
	const store = new Map([['dsh-dream-skin:factory-applied', '1'], ...Object.entries(extra)]);
	for (const [k, v] of Object.entries(seedCfg({ bootPaint: 'seed-first', ...cfg }))) store.set(k, v);
	const clock = { t: Date.now() };
	const A = await boot({ store, clock });
	const bLog = bgLog;
	const B = await boot({ store, clock });
	bgLog = bLog.concat(bgLog);
	return { A, B, store };
}
const relay = (from, to, key = ACTIVE) => to.win.fire('storage', { key, newValue: from.get(key), oldValue: null });
test('AC15 window A toggles ⇒ B follows without writing back; syncWindows=0 ⇒ B stays; other keys ignored', async () => {
	const { A, B } = await twoWindows();
	A.press();
	const writesBefore = B.sent.sets.length;
	relay(A, B);
	assert.ok(isBoss(B), 'B entered boss');
	await settle(250);
	assert.equal(B.sent.sets.filter((p) => p && Object.prototype.hasOwnProperty.call(p, ACTIVE)).length, 0, 'B never pushes boss-active');
	assert.equal(B.sent.sets.length >= writesBefore, true);
	B.win.fire('storage', { key: 'dsh-dream-skin:other', newValue: '0' });
	assert.ok(isBoss(B), 'unrelated key ignored');
	const w2 = await twoWindows({ syncWindows: 0 });
	w2.A.press();
	relay(w2.A, w2.B);
	assert.ok(!isBoss(w2.B), 'syncWindows=0: B does not move');
});
test('AC15 B leaves boss on A\'s exit and a re-apply of B reads the fresh value (stateCache updated)', async () => {
	// Both windows boot in boss (restore-last, boss-active=1), so B's cache holds "1".
	const { A, B } = await twoWindows({}, { [ACTIVE]: '1' });
	assert.ok(isBoss(A) && isBoss(B), 'precondition: both boot in boss');
	A.press(); relay(A, B);
	await settle();
	assert.ok(!isBoss(B), 'B left boss');
	// re-apply B: restore-last must read "0" from its cache, not the stale "1"
	B.unmount();
	B.ctx = makeApplyContext(B, null);
	B.entry.apply(B.ctx);
	await settle();
	assert.ok(!isBoss(B), 're-apply stays normal');
});

// ---------- AC21 ----------
// 5-minute interval (minutes key, 10.22.1): restart-interval must wait refreshIntervalMs(), not whole hours.
test('AC21 refresh during boss never fires; restart-interval waits a full period after exit; keep-phase fires on the first tick; lastFiredAt untouched by the key', async () => {
	for (const resume of ['restart-interval', 'keep-phase']) {
		const start = Date.now();
		const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first', resume }, { [REF]: JSON.stringify({ on: 1, hours: 1, lastFiredAt: start }), [REF_MIN]: JSON.stringify({ minutes: 5, mirrorHours: 1 }) }), clock: { t: start } });
		const fired0 = json(h, REF).lastFiredAt;
		h.press();
		h.now.t += 2 * 5 * 60 * 1000;
		h.tick();
		assert.equal(json(h, REF).lastFiredAt, fired0, `${resume}: no refresh while boss`);
		h.press();
		await settle();
		if (resume === 'keep-phase') {
			// The scheduler re-arm at phase=normal IS the first tick: the overdue refresh runs there,
			// stamped by the refresh commit (now), not by the key.
			assert.equal(json(h, REF).lastFiredAt, h.now.t, 'keep-phase: first tick after normal refreshes');
		} else {
			assert.equal(json(h, REF).lastFiredAt, fired0, 'restart-interval: exit does not refresh nor touch lastFiredAt');
			h.now.t += 4 * 60 * 1000 + 30 * 1000;
			h.tick();
			assert.equal(json(h, REF).lastFiredAt, fired0, 'restart-interval: not yet (4m30s of 5m)');
			h.now.t += 31 * 1000;
			h.tick();
			assert.ok(json(h, REF).lastFiredAt > fired0, 'restart-interval: after a full period');
		}
	}
});

// ---------- misc ----------
test('disabling while boss exits boss; disabled = no veil, no listener', async () => {
	const h = await boot({ seed: seedCfg({ bootPaint: 'seed-first' }) });
	h.press();
	h.boss.setBoss({ enabled: 0 });
	await settle();
	assert.ok(!isBoss(h));
	assert.equal(h.document.count('keydown'), 0);
	const d = await boot({ hostValue: {}, settle: false, seed: seedCfg({ enabled: 0 }) });
	assert.equal(d.status().boss.veil, false);
	d.hostGate.open();
});
test('row registered after the advanced wallpaper row; docs say window-local', () => {
	assert.match(CODE, /id:\s*"dream-skin-boss-key"[\s\S]{0,200}order:\s*32\.5/);
	const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
	assert.match(readme, /[Bb]oss key/);
});
