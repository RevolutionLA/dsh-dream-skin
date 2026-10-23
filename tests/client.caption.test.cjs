/**
 * dsh-dream-skin — wallpaper caption (10.22.2, T11a/T11b, design §13).
 *
 * Contract: key `dsh-dream-skin:wallpaper-caption` `{on,text,font,size,opacity,position}`,
 * written only by this plugin. The caption is one fixed layer inserted right
 * AFTER the wallpaper layer (bleed → wallpaper → caption, all z-index -1), text
 * goes in through textContent only, and an image change never touches the node.
 * Theme packs never carry it.
 *
 * The sandbox has a small tree-aware DOM (parent/children/siblings) so ordering
 * and node identity are observable, and it counts every style / textContent write.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');
const KEY = 'dsh-dream-skin:wallpaper-caption';
const URL_SEED = {
	'dsh-dream-skin:wallpaper-kind': 'url',
	'dsh-dream-skin:wallpaper-url': 'https://example.com/a.jpg',
	'dsh-dream-skin:wallpaper-follows-skin': '0'
};
const LANGS = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru'];
const CAPTION_KEYS = ['caption.title', 'caption.enable', 'caption.text', 'caption.textHint', 'caption.tooLong', 'caption.font', 'caption.font.sans', 'caption.font.serif', 'caption.font.kai', 'caption.font.rounded', 'caption.size', 'caption.opacity', 'caption.position', 'caption.pos.center', 'caption.pos.top', 'caption.pos.bottom', 'caption.pos.bottomLeft', 'caption.pos.bottomRight'];

// ---------- mini DOM ----------
const writes = { style: 0, text: 0 };
function makeStyle() {
	const target = {};
	return new Proxy(target, {
		set(t, k, v) { writes.style++; if (k === 'cssText') { for (const x of Object.keys(t)) delete t[x]; } t[k] = v; return true; }
	});
}
let uid = 0;
function makeEl(tag = 'div') {
	const el = {
		uid: ++uid, tagName: String(tag).toUpperCase(), style: makeStyle(), dataset: {}, attrs: {},
		parentNode: null, childNodes: [], _text: '',
		get children() { return this.childNodes; },
		get textContent() { return this._text; },
		set textContent(v) { writes.text++; this._text = String(v); },
		get innerHTML() { return this._text; },
		set innerHTML(v) { this._html = String(v); this._text = String(v); },
		setAttribute(k, v) { this.attrs[k] = String(v); },
		getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
		removeAttribute(k) { delete this.attrs[k]; },
		_detach(c) { if (c.parentNode) { const a = c.parentNode.childNodes; const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); c.parentNode = null; } },
		appendChild(c) { this._detach(c); this.childNodes.push(c); c.parentNode = this; return c; },
		append(c) { return this.appendChild(c); },
		prepend(c) { this._detach(c); this.childNodes.unshift(c); c.parentNode = this; },
		insertBefore(c, ref) { this._detach(c); const i = ref ? this.childNodes.indexOf(ref) : -1; if (i < 0) this.childNodes.push(c); else this.childNodes.splice(i, 0, c); c.parentNode = this; return c; },
		after(c) { const p = this.parentNode; if (!p) return; p._detach(c); const i = p.childNodes.indexOf(this); p.childNodes.splice(i + 1, 0, c); c.parentNode = p; },
		get previousSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return i > 0 ? p.childNodes[i - 1] : null; },
		get nextSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return p.childNodes[i + 1] || null; },
		remove() { if (this.parentNode) this.parentNode._detach(this); this.removed = true; },
		contains(x) { for (let n = x; n; n = n.parentNode) if (n === this) return true; return false; },
		click() {}, addEventListener() {}, removeEventListener() {}
	};
	return el;
}

function buildSandbox({ seed = {}, store = null, hostValue = {}, hash = '', code = null } = {}) {
	const body = makeEl('body');
	const html = makeEl('html');
	const document = {
		body, documentElement: html, head: makeEl('head'),
		createElement: (t) => makeEl(t), createTextNode: () => makeEl('#text'),
		querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
		addEventListener() {}, removeEventListener() {}
	};
	const loc = { origin: 'http://x', pathname: '/', search: '', hash };
	const map = store || new Map();
	for (const [k, v] of Object.entries(seed)) map.set(k, String(v));
	if (!store) map.set('dsh-dream-skin:factory-applied', '1');
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
	const blobs = [];
	let factory = null;
	const sandbox = {
		window: {}, document, navigator: {}, localStorage, console, location: loc, history: { replaceState() { loc.hash = ''; } },
		btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
		atob: (s) => Buffer.from(s, 'base64').toString('binary'),
		unescape: (s) => s, escape: (s) => s, encodeURIComponent, decodeURIComponent, TextEncoder, TextDecoder,
		URL: Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }),
		Blob: class { constructor(parts) { blobs.push(parts.join('')); } }, FileReader: class {},
		Image: undefined, Date, setTimeout, clearTimeout, alert: () => {},
		MutationObserver: class { observe() {} disconnect() {} },
		fetch: fetchMock
	};
	sandbox.window.__ModuleLoader__ = { load: (o) => { factory = o.factory; } };
	sandbox.window.location = loc;
	sandbox.window.history = sandbox.history;
	sandbox.window.setInterval = () => 1;
	sandbox.window.clearInterval = () => {};
	sandbox.window.addEventListener = () => {};
	sandbox.window.removeEventListener = () => {};
	for (const k of ['document', 'localStorage', 'btoa', 'atob', 'fetch']) sandbox.window[k] = sandbox[k];
	vm.runInContext((code || CODE) + '\nwindow.__LOGGED__=1;', vm.createContext(sandbox));
	return { factory, store: map, sent, blobs, document, body, loc, get: (k) => (map.has(k) ? map.get(k) : null) };
}

const REACT = { useRef: () => ({ current: {} }), useMemo: (f) => (typeof f === 'function' ? f() : f), useState: (init) => [init, () => {}], useEffect() {}, useCallback: (f) => f };
const RT = { defineStore: (d) => ({ spec: d, create() {} }) };
function makeRequire() {
	return (s) => {
		if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
		if (s === 'react') return REACT;
		if (s === '@deepseek-ai/dsh-client-store' || s === '@deepseek-ai/dsh-client-runtime/client') return RT;
		throw new Error('unexpected require: ' + s);
	};
}
function makeApplyContext(h) {
	h.bags = []; h.states = []; h.rows = [];
	h.disposers = [];
	return {
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
		locale: { register(ns, dicts) { h.dicts = h.dicts || dicts; }, bind() { return (k) => k; } },
		on() { return () => {}; },
		effect(t) { const d = t(); if (typeof d === 'function') h.disposers.push(d); }
	};
}
const settle = () => new Promise((r) => setTimeout(r, 40));
async function boot(opts) {
	const h = buildSandbox(opts);
	const e = h.factory(makeRequire());
	h.entry = e;
	h.ctx = makeApplyContext(h);
	e.apply(h.ctx);
	h.cap = h.bags.find((b) => typeof b.setCaption === 'function');
	h.wp = h.bags.find((b) => typeof b.setWallpaperUrl === 'function');
	h.adv = h.bags.find((b) => typeof b.setRotationList === 'function');
	h.state = () => h.states.find((s) => Object.prototype.hasOwnProperty.call(s, 'caption'));
	await settle();
	return h;
}
const json = (h, k) => { const v = h.get(k); return v === null ? null : JSON.parse(v); };
/** The layer under body that holds the caption span (aria-hidden + dir=auto span). */
function captionLayer(h) {
	return h.body.childNodes.find((n) => n.getAttribute('aria-hidden') === 'true' && n.childNodes[0] && n.childNodes[0].getAttribute('dir') === 'auto') || null;
}
function wallpaperLayer(h) {
	return h.body.childNodes.find((n) => String(n.style.backgroundImage || '').includes('a.jpg') && !String(n.style.cssText).includes('scale(1.2)')) || null;
}
const seedCaption = (cfg) => ({ ...URL_SEED, [KEY]: JSON.stringify(cfg) });
const captionRegion = () => { const a = CODE.indexOf('//#region dsh-dream-skin: wallpaper caption'); return CODE.slice(a, CODE.indexOf('//#endregion', a)); };

// ---------- AC23 ----------
test('AC23 defaults: switch on, empty text renders no node, nothing in FACTORY_DEFAULTS', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	assert.ok(h.cap, 'caption row injected');
	assert.deepEqual(h.state().caption, { on: 1, text: '', font: 'serif', size: 40, opacity: 0.55, position: 'bottom-right' });
	assert.equal(captionLayer(h), null, 'empty text: no caption node');
	assert.ok(wallpaperLayer(h), 'wallpaper itself is on screen');
	const fd = CODE.slice(CODE.indexOf('const FACTORY_DEFAULTS = {'), CODE.indexOf('};', CODE.indexOf('const FACTORY_DEFAULTS = {')));
	assert.ok(!/CAPTION|caption/.test(fd), 'factory defaults carry no caption');
	const row = h.rows.find((r) => r.desc.id === 'dream-skin-wallpaper-caption');
	assert.equal(row.desc.order, 34);
});

// ---------- AC24 ----------
test('AC24 layering: bleed → wallpaper → caption, z-index -1, pointer-events none, aria-hidden', async () => {
	const h = await boot({ seed: { ...seedCaption({ on: 1, text: '晚安' }), 'dsh-dream-skin:wallpaper-fit': 'blur' } });
	const layer = captionLayer(h);
	assert.ok(layer, 'caption node exists');
	const wp = wallpaperLayer(h);
	assert.equal(layer.previousSibling, wp, 'caption sits right after the wallpaper');
	const i = h.body.childNodes.indexOf(wp);
	const bleed = h.body.childNodes[i - 1];
	assert.ok(bleed && String(bleed.style.cssText).includes('scale(1.2)'), 'bleed precedes the wallpaper');
	const css = String(layer.style.cssText);
	assert.match(css, /z-index:\s*-1/);
	assert.match(css, /pointer-events:\s*none/);
	assert.match(css, /position:\s*fixed/);
	assert.equal(layer.getAttribute('aria-hidden'), 'true');
});

// ---------- AC25 ----------
test('AC25 an image change, a rotation commit and a refresh commit never touch the caption node', async () => {
	const h = await boot({ seed: seedCaption({ on: 1, text: '晚安' }) });
	const layer = captionLayer(h);
	const span = layer.childNodes[0];
	const before = { ...writes };
	// URL change through the settings action.
	h.wp.setWallpaperUrl('https://example.com/b.jpg');
	const wpEl = h.body.childNodes.find((n) => String(n.style.backgroundImage || '').includes('b.jpg'));
	assert.ok(wpEl, 'intermediate: the image really changed');
	assert.equal(layer.previousSibling, wpEl, 'intermediate: still right after the wallpaper');
	assert.equal(captionLayer(h), layer, 'intermediate: same node after the URL change');
	assert.equal(writes.text, before.text, 'intermediate: no textContent write');
	const spanCss = span.style.cssText;
	// Rotation commit.
	h.adv.setRotationList('https://example.com/c.jpg\nhttps://example.com/d.jpg');
	if (typeof h.adv.setRotation === 'function') await h.adv.setRotation(true);
	await settle();
	// Refresh commit (re-applies the same URL kind with a new bust).
	if (typeof h.adv.setRefresh === 'function') h.adv.setRefresh(true, 1);
	await settle();
	const end = captionLayer(h);
	assert.equal(end, layer, 'final: the very same node');
	assert.equal(end.childNodes[0], span, 'final: the very same span');
	assert.equal(writes.text, before.text, 'final: textContent never rewritten');
	assert.equal(span.style.cssText, spanCss, 'final: span style unchanged');
	assert.equal(span.textContent, '晚安');
	assert.ok(String(end.previousSibling.style.backgroundImage).length > 0, 'final: still right after a live wallpaper layer');
});

// ---------- AC26 ----------
test('AC26 invalid config falls back or clamps; cssText never carries raw input', async () => {
	const evil = 'x;background:url(https://evil/)';
	const h = await boot({ seed: seedCaption({ on: 1, text: 'hi', font: evil, size: 9999, opacity: -3, position: evil }) });
	assert.deepEqual(h.state().caption, { on: 1, text: 'hi', font: 'serif', size: 96, opacity: 0.15, position: 'bottom-right' });
	const layer = captionLayer(h);
	const span = layer.childNodes[0];
	for (const css of [String(layer.style.cssText), String(span.style.cssText), String(span.style.fontSize)]) {
		assert.ok(!css.includes('evil') && !css.includes('9999'), 'no raw input in styles: ' + css);
	}
	const h2 = await boot({ seed: { ...URL_SEED, [KEY]: '{broken' } });
	assert.deepEqual(h2.state().caption.font, 'serif');
	const h3 = await boot({ seed: { ...URL_SEED, [KEY]: '[1,2]' } });
	assert.equal(h3.state().caption.position, 'bottom-right');
	const h4 = await boot({ seed: seedCaption({ on: 1, text: 'a', size: 'NaN', opacity: '0.5' }) });
	assert.equal(h4.state().caption.size, 40);
	assert.equal(h4.state().caption.opacity, 0.5);
});

// ---------- AC27 ----------
test('AC27 text is text: markup stays literal, controls stripped, CRLF/3-line/120-code-point limits', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	const cases = [
		['<img src=x onerror=alert(1)>', '<img src=x onerror=alert(1)>'],
		['</span><script>alert(1)</script>', '</span><script>alert(1)</script>'],
		['a\u0000b\u202ec\u0085d', 'abcd'],
		['x\r\ny\rz', 'x\ny\nz'],
		['1\n2\n3\n4\n5', '1\n2\n3 4 5']
	];
	for (const [input, expected] of cases) {
		const kids = h.body.childNodes.length;
		h.cap.setCaption({ text: input });
		const layer = captionLayer(h);
		const span = layer.childNodes[0];
		assert.equal(span.textContent, expected, JSON.stringify(input));
		assert.equal(json(h, KEY).text, expected);
		assert.equal(span._html, undefined, 'innerHTML never written');
		assert.equal(span.childNodes.length, 0, 'no element children (a single text node)');
		assert.equal(layer.childNodes.length, 1, 'layer holds only the span');
		assert.ok(h.body.childNodes.length <= kids + 1, 'no new elements beyond the one caption layer');
		assert.ok(expected.split('\n').length <= 3);
	}
	const long = '😀'.repeat(121);
	h.cap.setCaption({ text: long });
	const stored = json(h, KEY).text;
	assert.equal(Array.from(stored).length, 120, '120 code points');
	assert.ok(!/[\ud800-\udbff]$/.test(stored), 'no dangling high surrogate');
	assert.equal(stored, '😀'.repeat(120));
	const region = captionRegion();
	assert.equal((region.match(/innerHTML|insertAdjacentHTML|outerHTML/g) || []).length, 0, 'source guard');
});

// ---------- AC28 ----------
test('AC28 theme packs never carry the caption: hash import ignores it, export/share do not add it', async () => {
	const manifest = {
		id: 'cap-test', name: 'Cap Test', colorScheme: 'dark', version: '1.0.0',
		tokens: { '--dsw-alias-bg-base': '#000', '--dsw-alias-bg-layer-1': '#111', '--dsw-alias-brand-primary': '#f0f', '--dsw-alias-label-primary': '#fff', '--dsw-alias-label-secondary': '#ccc', '--dsw-alias-border-l1': '#222', '--dsw-alias-border-l2': '#333' },
		caption: { on: 1, text: 'INJECTED' }, wallpaperCaption: 'INJECTED'
	};
	const pack = { format: 'dsh-dream-skin/pack', version: 1, manifest, caption: { text: 'INJECTED' } };
	const hash = '#dream-skin-pack=' + Buffer.from(JSON.stringify(pack), 'utf8').toString('base64');
	const h = await boot({ seed: seedCaption({ on: 1, text: 'mine' }), hash });
	assert.equal(json(h, KEY).text, 'mine', 'caption key untouched by the import');
	const packs = h.get('dsh-dream-skin:packs');
	assert.ok(packs && packs.includes('cap-test'), 'the pack itself was imported');
	assert.ok(!packs.includes('INJECTED'), 'stored pack carries no caption field');
	// Export / share build from the stored manifest; neither touches the caption key.
	for (const fn of ['exportPackAsFile', 'packShareUrl', 'validatePack']) {
		const a = CODE.indexOf('function ' + fn + '(');
		const body = CODE.slice(a, CODE.indexOf('\n\t\t}\n', a));
		assert.ok(!/CAPTION|caption/i.test(body), fn + ' never reads the caption');
	}
});

// ---------- AC30 ----------
test('AC30 persistence + host push; switch-off removes the node but keeps the text; clearing the wallpaper keeps the config', async () => {
	const h = await boot({ seed: { ...URL_SEED } });
	h.cap.setCaption({ text: '你好', font: 'kai', position: 'top' });
	await new Promise((r) => setTimeout(r, 260)); // host push is debounced 200 ms
	assert.deepEqual(json(h, KEY), { on: 1, text: '你好', font: 'kai', size: 40, opacity: 0.55, position: 'top' });
	assert.ok(h.sent.sets.some((p) => Object.prototype.hasOwnProperty.call(p, KEY)), 'pushed to the host');
	assert.equal(h.state().caption.text, '你好', 'store synced');
	h.cap.setCaption({ on: 0 });
	assert.equal(captionLayer(h), null, 'switch off: node gone');
	assert.equal(json(h, KEY).text, '你好', 'text kept');
	h.cap.setCaption({ on: 1 });
	assert.ok(captionLayer(h));
	h.wp.clearWallpaper();
	assert.equal(captionLayer(h), null, 'no wallpaper: no caption');
	assert.equal(json(h, KEY).text, '你好', 'config survives the clear');
	// Reload adopts the stored value.
	const h2 = await boot({ store: h.store, seed: { ...URL_SEED } });
	assert.equal(captionLayer(h2).childNodes[0].textContent, '你好');
});

// ---------- AC31 ----------
test('AC31 unmount removes the node; re-apply recreates exactly one', async () => {
	const h = await boot({ seed: seedCaption({ on: 1, text: 'x' }) });
	assert.ok(captionLayer(h));
	for (const d of h.disposers.splice(0)) { try { d(); } catch {} }
	if (typeof h.entry.dispose === 'function') h.entry.dispose();
	const left = h.body.childNodes.filter((n) => n.getAttribute('aria-hidden') === 'true' && n.childNodes[0] && n.childNodes[0].getAttribute('dir') === 'auto');
	assert.equal(left.length, 0, 'unmount leaves no caption');
	h.entry.apply(makeApplyContext(h));
	await settle();
	const again = h.body.childNodes.filter((n) => n.getAttribute('aria-hidden') === 'true' && n.childNodes[0] && n.childNodes[0].getAttribute('dir') === 'auto');
	assert.equal(again.length, 1, 'exactly one caption after re-apply');
});

// ---------- AC29 ----------
test('AC29 the default size caps at 8vw and the text direction follows the content', async () => {
	const h = await boot({ seed: seedCaption({ on: 1, text: 'مرحبا' }) });
	const span = captionLayer(h).childNodes[0];
	assert.equal(span.style.fontSize, 'min(40px, 8vw)');
	assert.equal(span.getAttribute('dir'), 'auto');
	assert.match(String(span.style.cssText), /unicode-bidi:\s*plaintext/);
	assert.match(String(span.style.cssText), /max-width:\s*min\(80vw,\s*28em\)/);
	const row = h.rows.find((r) => r.desc.id === 'dream-skin-wallpaper-caption');
	assert.equal(typeof row.Comp, 'function', 'the row has a component');
	assert.ok(/maxLength: CAPTION_TEXT_MAX/.test(CODE) && /placeholder: t\("caption\.textHint"\)/.test(CODE), 'textarea limit + placeholder');
});

// ---------- AC32 ----------
test('AC32 all 18 caption strings exist in all 8 dictionaries, non-empty', () => {
	for (const lang of LANGS) {
		const a = CODE.indexOf('\t\tconst ' + lang + ' = {');
		assert.ok(a > 0, lang);
		const dict = CODE.slice(a, CODE.indexOf('\n\t\t};', a));
		for (const k of CAPTION_KEYS) {
			const m = dict.match(new RegExp('"' + k.replace(/\./g, '\\.') + '": "([^"]+)"'));
			assert.ok(m && m[1].trim() !== '', lang + ' ' + k);
		}
		assert.match(dict, /"caption\.tooLong": "[^"]*\{max\}/, lang + ' tooLong carries {max}');
	}
});
