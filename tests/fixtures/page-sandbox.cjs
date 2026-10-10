/**
 * Shared VM harness for the client-half behaviour tests that need to drive `apply()` more than
 * once on the SAME module instance (fiber generations, storage failures).
 *
 * Why a fixture instead of reusing tests/client.smoke.test.cjs: those files each carry their own
 * sandbox tuned to their assertions, and the cases below need three things none of them offer
 * — a localStorage that can REFUSE specific keys, a `ctx.effect` that COLLECTS the returned
 * disposers instead of running them immediately, and a `theme.overrideTokens` that RECORDS the
 * layer it was handed (and marks it dead when its disposer runs) rather than swallowing the call.
 * Running the disposers immediately is fine for a single fiber and hides exactly the bug the
 * fiber cases are about; swallowing overrideTokens would hide the other half of it, because the
 * wash and the dialog floor are both token channels.
 */
const vm = require('node:vm');
const fs = require('fs');
const path = require('path');

const BUNDLE_PATH = path.join(__dirname, '..', '..', 'lib', 'client.js');
const CODE = fs.readFileSync(BUNDLE_PATH, 'utf8');

/**
 * Every interval every sandbox has left running, so a test FILE can sweep them once in an `after`
 * hook. The bundle's composer poll runs every 800ms for up to 30 tries, and a case that asserts
 * "a stale generation must not cancel the poll" deliberately leaves it alive — without this sweep
 * the process would sit idle for ~24s after the last assertion.
 */
const liveIntervalSets = [];
function releaseAllIntervals() {
	for (const set of liveIntervalSets) {
		for (const id of Array.from(set)) clearInterval(id);
		set.clear();
	}
}

function makeEl(tag) {
	const el = {
		tagName: tag || 'div',
		// Real DOM elements carry `id`, and the bundle's anti-duplication path looks nodes up BY
		// ID before injecting a second copy of a sheet (10.5.x). Without this field the adoption
		// branch could never run in a test, so a fixture that lacked `id` quietly asserted a
		// different code path than the one that ships.
		id: '',
		// `vars` is the custom-property side of the inline style. The real CSSStyleDeclaration
		// keeps those in a separate namespace that `style.property` never shows, and the bundle
		// writes its page-scope channels (`--dsh-composer-fill`, the glass vars) through
		// setProperty inside try/catch blocks — a no-op setProperty would silently DELETE those
		// channels from the test's field of view instead of recording them.
		style: {
			vars: {},
			setProperty(k, v) { this.vars[k] = String(v); },
			removeProperty(k) { delete this.vars[k]; },
			getProperty(k) { return this.vars[k] ?? '' }
		},
		dataset: {}, children: [],
		setAttribute(k, v) { (this.attrs || (this.attrs = {}))[k] = String(v); },
		getAttribute(k) { return (this.attrs || {})[k] ?? null; },
		removeAttribute(k) { if (this.attrs) delete this.attrs[k]; },
		appendChild(c) { this.children.push(c); c.parent = this; return c; },
		append(c) { this.children.push(c); c.parent = this; },
		prepend(c) { this.children.unshift(c); c.parent = this; },
		// The wallpaper bleed layer is inserted BEFORE an existing node (tree order decides who
		// paints on top), so a sandbox without insertBefore cannot reach the `fit=blur` path.
		insertBefore(c, ref) {
			const at = ref ? this.children.indexOf(ref) : -1;
			if (at < 0) this.children.push(c); else this.children.splice(at, 0, c);
			c.parent = this;
			return c;
		},
		click() {}, remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); },
		contains(el) { return this.children.includes(el); }
	};
	return el;
}

/**
 * A persisted wallpaper, seeded the way a real second boot would find it. A GRADIENT is the
 * cheapest value that still drives the real code path: the image kind would need a decoded File
 * (and a canvas the sandbox has no 2D context for), the url kind needs a network, but
 * `wallpaperBackgroundCss()` returns a gradient string directly — so `applyWallpaper2` reaches
 * `shadeTokens2()` and the wash publishes the two channels the fiber cases have to be able to see
 * being eaten: the root wash attribute and the floored dialog token layer.
 *
 * The opacity is chosen to be DISTINGUISHABLE from the skin default (0.5), so a teardown that
 * repainted only one of the two channels cannot pass.
 */
const WASH_SEED = {
	'dsh-dream-skin:wallpaper-kind': 'gradient',
	'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #101018, #2a2440)',
	'dsh-dream-skin:wallpaper-opacity': '0.5'
};

/** Depth-first list of a stub node and everything under it. */
function walkNodes(node, out) {
	const list = out || [];
	if (!node || typeof node !== 'object') return list;
	list.push(node);
	for (const child of node.children || []) walkNodes(child, list);
	return list;
}

/**
 * @param opts.failWrite  (key) => true to make that key's setItem throw, like a full quota
 * @param opts.code       replacement bundle source, for mutation cases
 */
function buildSandbox({ failWrite = null, seed = {}, code = null, storeMissing = false } = {}) {
	const body = makeEl('body');
	const head = makeEl('head');
	const documentElement = makeEl('html');
	// Document-level listeners, recorded per event type. The wallpaper-refresh scheduler attaches a
	// `visibilitychange` handler to `document` and clears it through a module-scope handle, so
	// "did a stale generation detach the live one's listener?" (blue team B-A-01) is only a question
	// a test can ask if the sandbox keeps them.
	const listeners = new Map();
	const allNodes = () => [documentElement, head, body].flatMap((root) => walkNodes(root));
	const document = {
		body, head, documentElement,
		visibilityState: 'visible',
		createElement: (tag) => makeEl(tag),
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => [],
		// The bundle looks its own nodes up by id before injecting a second copy (the 10.5.x
		// anti-duplication path). A missing getElementById meant that branch never ran here at all.
		getElementById: (id) => allNodes().find((n) => n.id && n.id === id) || null,
		addEventListener(type, handler) {
			if (!listeners.has(type)) listeners.set(type, []);
			listeners.get(type).push(handler);
		},
		removeEventListener(type, handler) {
			const list = listeners.get(type);
			if (list) listeners.set(type, list.filter((h) => h !== handler));
		}
	};
	const loc = { origin: 'http://x', pathname: '/', search: '', hash: '' };
	const store = new Map();
	for (const [k, v] of Object.entries(seed)) store.set(k, String(v));
	store.set('dsh-dream-skin:factory-applied', '1');
	const refused = [];
	const localStorage = {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => {
			if (failWrite && failWrite(k)) {
				const err = new Error('QuotaExceededError: storage full');
				err.name = 'QuotaExceededError';
				refused.push(k);
				throw err;
			}
			store.set(k, String(v));
		},
		removeItem: (k) => store.delete(k)
	};
	const sent = { sets: [] };
	// Page-scope residue the fiber cases have to see: every MutationObserver the bundle
	// constructs (with whether it is still observing) and every interval it leaves running. Both
	// are module-scope handles in the bundle, so "which generation is still watching the DOM" is
	// exactly the question these cases ask — an unrecorded observer would make the composer-marker
	// assertions unfalsifiable.
	const observers = [];
	const intervals = new Set();
	liveIntervalSets.push(intervals);
	let factory = null;
	const loadedFactories = [];
	const MutationObserverStub = class {
		constructor(callback) {
			this.callback = callback;
			this.observing = false;
			observers.push(this);
		}
		observe(target, options) {
			this.observing = true;
			// Recorded so a test can name WHICH observer it is asserting on instead of counting
			// every one the bundle happens to build (it builds several: composer marker, late
			// correction, desktop-mode probe).
			this.target = target;
			this.options = options;
		}
		disconnect() { this.observing = false; }
		takeRecords() { return []; }
	};
	const setIntervalMock = (fn, ms) => {
		const id = setInterval(fn, ms);
		intervals.add(id);
		return id;
	};
	const clearIntervalMock = (id) => {
		intervals.delete(id);
		clearInterval(id);
	};
	const fetchMock = async (url, init) => {
		const bodyObj = JSON.parse(init.body);
		if (bodyObj.method === 'get') return { ok: true, status: 200, json: async () => ({ ok: true, value: {} }) };
		if (bodyObj.method === 'set') {
			sent.sets.push(bodyObj.patch);
			return { ok: true, status: 200, json: async () => ({ ok: true }) };
		}
		return { ok: true, status: 200, json: async () => ({ ok: false }) };
	};
	const sandbox = {
		window: {}, document, navigator: {}, localStorage,
		console: { log() {}, warn() {}, error() {} },
		location: loc, history: { replaceState() {} },
		btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
		atob: (s) => Buffer.from(s, 'base64').toString('binary'),
		unescape: (s) => s, escape: (s) => s,
		encodeURIComponent, decodeURIComponent,
		TextEncoder, TextDecoder,
		URL: Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }),
		Blob: class {}, FileReader: class {}, Image: function () {},
		setTimeout, clearTimeout, setInterval: setIntervalMock, clearInterval: clearIntervalMock,
		alert: () => {},
		MutationObserver: MutationObserverStub,
		requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 0),
		cancelAnimationFrame: (id) => clearTimeout(id),
		Date, Math, JSON, performance: { now: () => Date.now() },
		fetch: fetchMock
	};
	sandbox.window.__ModuleLoader__ = { load: (o) => { factory = o.factory; loadedFactories.push(o.factory); } };
	sandbox.window.location = loc;
	sandbox.window.history = sandbox.history;
	sandbox.window.document = document;
	sandbox.window.localStorage = localStorage;
	sandbox.window.btoa = sandbox.btoa;
	sandbox.window.atob = sandbox.atob;
	sandbox.window.fetch = fetchMock;
	// The real browser has these on `window`, and the bundle's wallpaper-refresh scheduler arms ONLY
	// when `typeof window.setInterval === "function"` (lib/client.js, startWallpaperRefreshScheduler).
	// A sandbox without them silently skipped that whole code path — which is how blue team B-A-01
	// (a stale generation cancelling the LIVE generation's tick) stayed invisible to the first draft
	// of these cases.
	sandbox.window.setTimeout = setTimeout;
	sandbox.window.clearTimeout = clearTimeout;
	sandbox.window.setInterval = setIntervalMock;
	sandbox.window.clearInterval = clearIntervalMock;
	sandbox.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
	// Window listeners are recorded too: a test that asserts "nothing leaked on unload" has to be
	// able to see the ones attached to `window`, not only the ones on `document`.
	const windowListeners = [];
	sandbox.window.addEventListener = (type, handler) => { windowListeners.push({ type, handler }); };
	sandbox.window.removeEventListener = (type, handler) => {
		const at = windowListeners.findIndex((l) => l.type === type && l.handler === handler);
		if (at >= 0) windowListeners.splice(at, 1);
	};
	const context = vm.createContext(sandbox);
	vm.runInContext((code || CODE) + '\nwindow.__LOADED__=1;', context);
	return {
		factory, localStorage, sent, refused, head, body, documentElement,
		window: sandbox.window,
		/**
		 * Every factory the page has been handed, oldest first. Evaluating the bundle a SECOND time
		 * in the same context is what a real double-load looks like: a new module scope sharing one
		 * DOM, one `window` and one set of page-scope attributes. The fiber-generation cases need
		 * exactly this, because two module scopes are what a per-module counter cannot arbitrate.
		 */
		loadedFactories,
		evaluate(source) {
			vm.runInContext(source || CODE, context);
			return loadedFactories[loadedFactories.length - 1];
		},
		/** Live `document` listeners for an event type (the refresh scheduler's visibilitychange). */
		documentListeners: (type) => (listeners.get(type) || []).slice(),
		/** Whether the page still holds this generation's ownership stamp. */
		pageOwner: () => sandbox.window.__DSH_DREAM_SKIN_PAGE_OWNER__,
		/** Every MutationObserver the bundle constructed, in construction order. */
		observers,
		/** Observers the bundle built that are still watching the DOM. */
		liveObservers: () => observers.filter((o) => o.observing),
		/** Poll timers still running (the composer marker's mark-until-first-hit poll). */
		openIntervals: () => intervals.size,
		/** Test cleanup only: the poll above runs for ~24s if a case forgets to tear down. */
		releaseIntervals: () => { for (const id of Array.from(intervals)) clearIntervalMock(id); },
		getItem: (k) => store.get(k),
		/** Every <style> node this page has ever been handed, in insertion order. */
		sheets: () => head.children.filter((n) => n.tagName === 'style' && !n.removed),
		materialSheets: () => head.children.filter((n) => n.tagName === 'style'
			&& String(n.textContent || '').includes('inset 0 0 0 1px'))
	};
}

const REACT = {
	useRef: () => ({ current: {} }),
	useMemo: (f) => (typeof f === 'function' ? f() : f),
	useState: (init) => [init, () => {}],
	useEffect: () => {},
	useCallback: (f) => f
};
const RT = { defineStore: (d) => ({ spec: d, create() {} }) };

function makeRequire({ storeMissing = false } = {}) {
	return (s) => {
		if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
		if (s === 'react') return REACT;
		if (s === '@deepseek-ai/dsh-client-store' || s === '@deepseek-ai/dsh-client-runtime/client') {
			if (storeMissing) throw new Error('client-modules: require("' + s + '") missed the module table');
			return RT;
		}
		throw new Error('unexpected require: ' + s);
	};
}

/**
 * An apply() context that COLLECTS the fiber's cleanups instead of running them, so a test can
 * choose the unload ORDER. `disposers` is what the host would call when the slot goes away.
 */
function makeApplyContext(h) {
	// Every layer the bundle hands to the host is recorded, and its disposer marks the layer DEAD
	// rather than deleting it from the log. The fiber-generation cases below need to ask "is the
	// layer the NEW generation installed still live?" — a plain count cannot answer that, because
	// a stale teardown disposes it and a re-publish would also dispose it.
	const tokenLayers = [];
	const ctx = {
		disposers: [],
		tokenLayers,
		/** The layers the host is currently holding, oldest first. */
		liveTokenLayers: () => tokenLayers.filter((l) => l.live),
		theme: {
			register() { return () => {}; },
			setTheme() {},
			getTheme() { return { preference: 'system', active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
			overrideTokens(source, overrides) {
				const layer = { source, overrides, live: true };
				tokenLayers.push(layer);
				return () => { layer.live = false; };
			}
		},
		slots: {
			inject(n, f) { f(); },
			register(desc) {
				if (typeof desc.inject === 'function') {
					const storeSpec = desc.store && desc.store.spec;
					const bag = {};
					if (storeSpec && typeof storeSpec.actions.sync === 'function') {
						const state = storeSpec.init();
						bag.sync = (...args) => storeSpec.actions.sync(state, ...args);
					}
					const ra = desc.inject(bag);
					if (ra && typeof ra === 'object') (ctx.actionBags || (ctx.actionBags = {}))[desc.id] = ra;
				}
				return {};
			}
		},
		locale: { register() {}, bind() { return (k) => k; } },
		on() { return () => {}; },
		// The host contract: effect(factory) may return a disposer; the harness stores it rather
		// than calling it, which is the whole reason this file exists.
		effect(t) { const d = t(); if (typeof d === 'function') ctx.disposers.push(d); }
	};
	return ctx;
}

module.exports = { buildSandbox, makeRequire, makeApplyContext, CODE, BUNDLE_PATH, WASH_SEED, releaseAllIntervals };
