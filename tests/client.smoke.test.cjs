/**
 * dsh-dream-skin — browser-half smoke tests (run with `node --test`).
 *
 * These load the hand-written `__ModuleLoader__` bundle inside a VM with a
 * minimal browser-ish environment and verify that:
 *   1. the factory evaluates without throwing and exports the expected surface;
 *   2. `apply(ctx)` mounts every settings slot and registers the built-in skins;
 *   3. a theme-pack can be imported through the share-link URL path and is
 *      persisted to localStorage.
 *
 * The DOM/react/localStorage are mocks; this is a smoke/regression gate, not a
 * browser integration suite.
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
		prepend() {}, click() {}, remove() { this.removed = true; },
		contains(el) { return el && this === el; }
	};
}

function buildSandbox(overrides = {}) {
	const body = makeEl();
	const document = { body, createElement: () => makeEl(), createTextNode: () => ({}), querySelector: () => null, head: makeEl() };
	const store = new Map();
	// seed localStorage from overrides.seed
	if (overrides.seed) for (const [k, v] of Object.entries(overrides.seed)) store.set(k, String(v));
	const localStorage = {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, String(v)),
		removeItem: (k) => store.delete(k)
	};
	const btoa = (s) => Buffer.from(s, 'binary').toString('base64');
	const atob = (s) => Buffer.from(s, 'base64').toString('binary');
	const unescapeB = (s) => s.replace(/%([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
	const escapeB = (s) => s.replace(/[^\x21-\x7e]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));
	const loc = { origin: 'http://x', pathname: '/', search: '', hash: '', ...(overrides.hash ? { hash: overrides.hash } : {}) };
	let factory = null;
	const sandbox = {
		window: {}, document, navigator: { clipboard: { writeText: () => Promise.resolve() } }, localStorage,
		matchMedia: undefined, console, location: loc, history: { replaceState(n, t, url) { loc.hash = ''; loc.pathname = url; } },
		btoa, atob, unescape: unescapeB, escape: escapeB, encodeURIComponent, decodeURIComponent,
		TextEncoder, TextDecoder,
		URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
		Blob: class {}, FileReader: class {}, Image: function () {}, setTimeout, clearTimeout, alert: () => {},
		...overrides,
	};
	sandbox.window.__ModuleLoader__ = { load: (o) => { factory = o.factory; } };
	sandbox.window.location = loc;
	sandbox.window.history = sandbox.history;
	for (const k of ['document', 'localStorage', 'btoa', 'atob']) sandbox.window[k] = sandbox[k];
	const context = vm.createContext(sandbox);
	vm.runInContext(CODE + '\nwindow.__LOGGED__=1;', context);
	return { factory, loc, localStorage, registered: [], slots: { count: 0 } };
}

function makeApplyContext(harness, { captureActions = false } = {}) {
	const theme = {
		register(def) {
			const id = def.id;
			assert.ok(!harness.registered.includes(id), 'duplicate theme id ' + id);
			harness.registered.push(id);
			return () => {};
		},
		setTheme() {},
		getTheme() {
			return { preference: 'system', active: { id: 'dark', colorScheme: 'dark', tokens: { '--dsw-alias-brand-primary': '#4f83f2' } }, themes: [], revision: 1 };
		},
		overrideTokens() { return () => {}; }
	};
	return {
		theme,
		slots: {
			inject(n, f) { harness.slots.count++; f(); },
			register(desc, _Component) {
				// The real slot machinery calls desc.inject(actions) with the store's
				// bound action bag (which the plugin binds to wallpaperBound etc.) and
				// exposes the RETURNED bag to the row component. Capture the return so
				// tests can drive the row actions.
				if (captureActions && typeof desc.inject === 'function') {
					const storeSpec = desc.store && desc.store.spec;
					const storeActions = {};
					if (storeSpec && typeof storeSpec.actions.sync === 'function') {
						const state = storeSpec.init();
						storeActions.sync = (...args) => storeSpec.actions.sync(state, ...args);
					}
					const rowActions = desc.inject(storeActions);
					if (rowActions && typeof rowActions === 'object') {
						(harness.actionBags || (harness.actionBags = {}))[desc.id] = rowActions;
					}
				}
				return {};
			}
		},
		locale: {
			register() {},
			bind() { return (key) => key; } // identity translator for alerts in tests
		},
		on() { return () => {}; },
		effect(t) { const d = t(); if (typeof d === 'function') d(); }
	};
}

const REACT = { useRef: () => ({ current: {} }), useMemo: (f) => (typeof f === 'function' ? f() : f), useState: (init) => [init, () => {}] };

/**
 * defineStore mock: records every store spec (so tests can exercise the
 * `sync` guard directly) and exposes a `syncLog` array where injected
 * action bags' `sync` calls are captured (keyed by store id when the slot
 * registration declares one).
 */
function makeRuntime() {
	const specs = [];
	const syncLog = []; // { storeId, args }
	const RT = {
		defineStore(d) {
			specs.push(d);
			return { spec: d, create() {} };
		}
	};
	return {
		RT,
		specs,
		syncLog,
		findSpec(initKey) {
			return specs.find((s) => Object.prototype.hasOwnProperty.call(s.init(), initKey));
		}
	};
}

function makeRequire(RT) {
	return (s) => {
		if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
		if (s === 'react') return REACT;
		if (s === '@deepseek-ai/dsh-client-runtime/client') return RT;
		throw new Error('unexpected require: ' + s);
	};
}

test('bundle factory evaluates and exports the expected surface', () => {
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.equal(typeof e.apply, 'function');
	assert.ok(Array.isArray(e.inject));
	assert.ok(Array.isArray(e.SKINS));
	assert.ok(e.SKINS.length > 0);
	assert.ok('SETTINGS_NS' in e);
});

test('issue #18: every skin themes the bubble / selector surfaces (no default-blue leak)', () => {
	// DSH maps message bubbles to --dsw-specific-bubble (default --dsw-static-deepseek-50,
	// a brand light-blue) and the composer option button to --dsw-specific-selector (default
	// blue-grey). If a skin omits these, bubbles/buttons render DSH's default blue on top of a
	// non-blue theme — the "tag/…未覆盖" complaint. Every skin must define the three surface
	// tokens (plus --dsw-specific-menu for popovers) so they inherit the theme, not the default.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.ok(e.SKINS.length === 8, `expected 8 skins, got ${e.SKINS.length}`);
	const required = [
		'--dsw-specific-bubble',
		'--dsw-specific-bubble-highlight',
		'--dsw-specific-selector',
		'--dsw-alias-bg-module-platform',
		'--dsw-alias-bg-base',
	];
	for (const skin of e.SKINS) {
		for (const token of required) {
			assert.ok(typeof skin.tokens[token] === 'string' && skin.tokens[token].length > 0,
				`${skin.id} must define ${token}`);
		}
		// The right tool panel (Files / 任务管理) background uses --dsw-alias-bg-module-platform,
		// which previously fell back to DSH's default bluish/grey, so the right side stayed
		// light on dark themes (issue: left vs right sidebar mismatch). On dark skins it must be
		// a dark fill; on light skins a light fill — matching the theme, not the DSH default.
		const modulePlatform = skin.tokens['--dsw-alias-bg-module-platform'];
		const moduleLum = hexLuminance(modulePlatform);
		if (skin.colorScheme === 'dark') {
			assert.ok(moduleLum !== null && moduleLum < 100,
				`${skin.id} dark module-platform must be a dark fill`);
		} else {
			assert.ok(moduleLum !== null && moduleLum >= 100,
				`${skin.id} light module-platform must be a light fill`);
		}
		// Issue #27: --dsw-alias-bg-layer-1 is a GENERAL token consumed by third-party
		// plugins (e.g. dshmarket) as a card background. Dark skins must give it a DRAL
		// opaque-ish surface (readable light text), not a near-transparent or bright
		// white fill — a 0.65-white makes light text vanish (contrast ~1.4:1), and a
		// 0.04-white lets the backdrop bleed through (the "字叠一起" report).
		const layer1 = skin.tokens['--dsw-alias-bg-layer-1'];
		const layer1Lum = hexLuminance(layer1);
		if (skin.colorScheme === 'dark') {
			// Must NOT be a bright white fill (rgba(255,255,255, .65/.5) or a near-#
			// f..). Must be dark enough that light label text stays readable.
			assert.ok(layer1Lum !== null && layer1Lum < 100,
				`${skin.id} dark layer-1 must be a dark surface (got ${layer1})`);
		} else {
			// Light skins: layer-1 must stay light (dark text reads on it).
			assert.ok(layer1Lum !== null && layer1Lum >= 100,
				`${skin.id} light layer-1 must be a light surface (got ${layer1})`);
		}
		// The bubble fill for dark skins must be a readable dark bubble; for light skins near-white.
		const bubble = skin.tokens['--dsw-specific-bubble'];
		if (skin.colorScheme === 'dark') {
			assert.ok(!/^#|^rgba\(255|^white/i.test(bubble.trim()), `${skin.id} dark bubble must be a dark fill`);
			const layer3 = skin.tokens['--dsw-alias-bg-layer-3'];
			assert.ok(!/rgba\(255,\s*255,\s*255,\s*0\.5\)/i.test(layer3), `${skin.id} dark layer-3 must not be a 50% white box`);
			assert.ok(/^#/.test(layer3.trim()), `${skin.id} dark layer-3 must be a solid dark color (readable light text)`);
		}
	}
});

// Approximate luminance (0-255) for a #rrggbb / #rgb hex or rgba() color, or null
// if the value is not a parseable color. For rgba() we use the RGB channels (the
// alpha only lowers the effective contrast against whatever is behind; the RGB
// channels still tell us whether the fill is light or dark by intent).
function hexLuminance(c) {
	if (typeof c !== 'string') return null;
	c = c.trim();
	let m = /^#([0-9a-f]{6})$/i.exec(c);
	if (m) { const n = parseInt(m[1], 16); return Math.round(0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)); }
	m = /^#([0-9a-f]{3})$/i.exec(c);
	if (m) { const h = m[1]; const n = parseInt(h[0] + h[0] + h[1] + h[1] + h[2] + h[2], 16); return Math.round(0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)); }
	m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/.exec(c);
	if (m) return Math.round(0.2126 * (+m[1]) + 0.7152 * (+m[2]) + 0.0722 * (+m[3]));
	return null;
}

test('apply() mounts slot rows and registers built-in skins without throwing', () => {
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h);
	assert.doesNotThrow(() => e.apply(ctx));
	assert.equal(h.registered.length, e.SKINS.length, 'all built-in skins registered');
	assert.ok(h.slots.count >= 4, 'accent + wallpaper + advanced wallpaper + packs should mount');
});

test('accent store first sync passes the revision guard so a saved accent restores', () => {
	// Regression: accentInjected used to sync with a fixed revision -1, which the
	// store guard (`revision <= d.revision`, init revision -1) always rejected —
	// a saved accent never reached the row UI after reload.
	const h = buildSandbox({ seed: { 'dsh-dream-skin:accent': '#12ab34' } });
	const rt = makeRuntime();
	const e = h.factory(makeRequire(rt.RT));
	const ctx = makeApplyContext(h);
	assert.doesNotThrow(() => e.apply(ctx));

	const accentSpec = rt.findSpec('accent');
	assert.ok(accentSpec, 'accent store spec defined');

	// Guard semantics: a revision equal to or below init (-1) is rejected;
	// a monotonic increment (> -1) — as the fixed plugin now sends — passes.
	const sync = accentSpec.actions.sync;
	const state = accentSpec.init();
	sync(state, '#12ab34', '#4f83f2', -1);
	assert.equal(state.accent, 'system', 'revision -1 must be rejected (the old bug)');
	sync(state, '#12ab34', '#4f83f2', 1);
	assert.equal(state.accent, '#12ab34', 'accent restored into the store');
	assert.equal(state.revision, 1, 'accepted revision recorded');
});

test('packs row store receives manifest names so cards show pack names', () => {
	const h = buildSandbox();
	const rt = makeRuntime();
	const e = h.factory(makeRequire(rt.RT));
	const ctx = makeApplyContext(h);
	e.apply(ctx);
	// The pack store spec must exist and its sync must accept a names map.
	const packSpec = rt.findSpec('ids');
	assert.ok(packSpec, 'pack store spec defined');
	const d = packSpec.init();
	packSpec.actions.sync(d, ['dream-pack:x'], { 'dream-pack:x': 'Nice Pack' }, [], 'system', null, 1);
	assert.equal(d.names['dream-pack:x'], 'Nice Pack', 'names map carried into the pack store');
});

test('share-link theme pack import registers and persists', () => {
	const pack = {
		format: 'dsh-dream-skin/pack', version: 1,
		manifest: {
			id: 'test-skin', name: 'Test Skin', colorScheme: 'dark',
			accent: '#123456',
			tokens: {
				'--dsw-alias-bg-base': '#111111',
				'--dsw-alias-bg-layer-1': '#1c1c1c',
				'--dsw-alias-brand-primary': '#ff8800',
				'--dsw-alias-label-primary': '#ffffff',
				'--dsw-alias-label-secondary': '#aaaaaa',
				'--dsw-alias-border-l1': '#333333',
				'--dsw-alias-border-l2': '#444444'
			}
		}
	};
	const json = JSON.stringify(pack);
	const b64 = Buffer.from(unescape(encodeURIComponent(json)), 'binary').toString('base64');
	const h = buildSandbox({ hash: '#dream-skin-pack=' + b64 });
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h);
	e.apply(ctx);
	assert.ok(h.registered.includes('dream-pack:test-skin'), 'pack imported via share link');
	const persisted = h.localStorage.getItem('dsh-dream-skin:packs');
	assert.ok(persisted && persisted.indexOf('dream-pack:test-skin') !== -1, 'pack persisted to localStorage');
});

test('wallpaper apply does not recurse into a stack overflow when overrideTokens emits theme/change', () => {
	// Regression: applyWallpaper2 -> shadeTokens2 -> ctx.theme.overrideTokens, which
	// the real ThemeRuntime answers by emitting `theme/change` synchronously; our
	// syncSkin listener re-applies the wallpaper, which used to call overrideTokens
	// again -> infinite recursion -> "Maximum call stack size exceeded" (which DSH's
	// slot boundaries then report as a crashed/abdicated entry). A re-entrancy guard
	// must keep this to a single overrideTokens call.
	const h = buildSandbox({ seed: { 'dsh-dream-skin:wallpaper': 'data:image/png;base64,AAAA' } });
	const e = h.factory(makeRequire(makeRuntime().RT));

	let themeChangeHandler = null;
	let overrideCount = 0;
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() {
			return { preference: 'dark', active: { id: 'dark', colorScheme: 'dark', tokens: { '--dsw-alias-brand-primary': '#4f83f2', '--dsw-alias-bg-base': '#000' } }, themes: [], revision: 1 };
		},
		overrideTokens() {
			overrideCount += 1;
			// mimic ThemeRuntime.publish: emit theme/change synchronously
			if (themeChangeHandler) themeChangeHandler({ preference: 'dark', active: { id: 'dark', colorScheme: 'dark', tokens: {} }, revision: overrideCount });
			return () => {};
		}
	};
	const ctx = {
		theme,
		slots: { inject() {}, register() { return {}; } },
		locale: { register() {}, bind() { return (key) => key; } },
		on(ev, fn) { if (ev === 'theme/change') themeChangeHandler = fn; return () => {}; },
		effect(t) { const d = t(); if (typeof d === 'function') d(); }
	};

	assert.doesNotThrow(() => e.apply(ctx), 'apply with wallpaper set must not overflow the stack');
	assert.ok(overrideCount >= 1, 'overrideTokens was applied');
	assert.ok(overrideCount < 10, `re-entrancy guard kept overrideTokens finite (got ${overrideCount})`);
});

test('setWallpaperKind/removeWallpaper do not throw (module-level syncWallpaper regression)', () => {
	// Regression: removeWallpaper and setWallpaperKind (module scope) used to call
	// `syncWallpaper()`, which was a const declared INSIDE apply() — the closure
	// could not see it, so every URL/gradient apply or "clear wallpaper" click
	// threw `ReferenceError: syncWallpaper is not defined` and the row stores
	// never refreshed.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));

	const bags = h.actionBags;
	assert.ok(bags['dream-skin-wallpaper'], 'wallpaper row action bag captured');
	assert.ok(bags['dream-skin-wallpaper-advanced'], 'advanced wallpaper row action bag captured');

	// URL wallpaper: must not throw, must persist kind=url and the URL value.
	assert.doesNotThrow(() => bags['dream-skin-wallpaper-advanced'].setUrl('https://example.com/w.jpg'));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'url');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://example.com/w.jpg');

	// Gradient: same path, no throw.
	assert.doesNotThrow(() => bags['dream-skin-wallpaper-advanced'].setGradient('linear-gradient(135deg, #000 0%, #fff 100%)'));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'gradient');

	// Clear-all (removeWallpaper path): no throw, kind cleared.
	assert.doesNotThrow(() => bags['dream-skin-wallpaper-advanced'].clearAll());
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), null);
});

test('url wallpaper: unsafe schemes are refused, safe ones persist, stored junk is never applied', () => {
	// The URL wallpaper input accepts only http/https/data:image links. Unsafe
	// schemes (javascript:, file:) must be refused before they reach storage,
	// while legitimate links — including data:image/svg+xml with quotes inside —
	// persist normally.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));
	const bags = h.actionBags;
	const adv = bags['dream-skin-wallpaper-advanced'];

	// Unsafe schemes are refused and nothing is written.
	adv.setUrl('javascript:alert(1)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), null, 'javascript: must not write kind');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), null, 'javascript: must not be persisted');

	adv.setUrl('file:///C:/pics/wall.jpg');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), null, 'file: must be refused');

	adv.setUrl('data:text/html,<script>alert(1)</script>');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), null, 'data:text/html must be refused');

	// Safe schemes persist normally.
	adv.setUrl('https://example.com/w.jpg');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'url');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://example.com/w.jpg');

	// data:image (even an SVG with quotes inside) is allowed — quotes are
	// escaped at CSS-build time, not rejected.
	const svg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
	adv.setUrl(svg);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), svg, 'data:image with quotes accepted');

	// A value that slipped into storage without validation (old versions
	// accepted anything) must be ignored at render time: apply() with an
	// unsafe stored URL must not throw and must not apply it.
	const h2 = buildSandbox({
		seed: { 'dsh-dream-skin:wallpaper-kind': 'url', 'dsh-dream-skin:wallpaper-url': 'javascript:alert(1)' }
	});
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e2.apply(makeApplyContext(h2)), 'stored unsafe URL must not break apply()');
});

test('setWallpaper resets kind to image so a picked photo beats a stale gradient/URL', () => {
	// Regression: setWallpaper only wrote the data-URL key; if a gradient or URL
	// had been set before, wallpaperBackgroundCss() kept returning the gradient/
	// URL and the chosen local image never showed (preview lied).
	const h = buildSandbox({
		seed: { 'dsh-dream-skin:wallpaper-kind': 'gradient', 'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #000 0%, #fff 100%)' }
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));

	const bags = h.actionBags;
	assert.doesNotThrow(() => bags['dream-skin-wallpaper'].setWallpaper('data:image/jpeg;base64,AAAA'));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'image', 'kind reset to image');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), 'data:image/jpeg;base64,AAAA');
});

test('all locale dictionaries are complete and keep placeholders', () => {
	// Every shipped dictionary must have exactly the zh key set (no missing /
	// extra keys) and must keep the {name} / {error} / {errors} placeholders.
	const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');
	const langs = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru'];
	const dicts = {};
	for (const lang of langs) {
		const start = src.indexOf(`const ${lang} = {`);
		assert.ok(start !== -1, `dictionary ${lang} defined`);
		const end = src.indexOf('};', start);
		const body = src.slice(start, end);
		const keys = [...body.matchAll(/"([a-zA-Z0-9.]+)":\s*"/g)].map((m) => m[1]);
		dicts[lang] = new Set(keys);
		assert.equal(keys.length, 47, `${lang} has ${keys.length} keys (expected 47)`);
	}
	const zhKeys = dicts.zh;
	for (const lang of langs.slice(1)) {
		const missing = [...zhKeys].filter((k) => !dicts[lang].has(k));
		const extra = [...dicts[lang]].filter((k) => !zhKeys.has(k));
		assert.deepEqual(missing, [], `${lang} missing keys`);
		assert.deepEqual(extra, [], `${lang} has extra keys`);
	}
	// Placeholder integrity: for every key, each language must keep exactly the
	// same placeholder set as zh ({name}/{error}/{errors}) — a dropped or added
	// placeholder is a broken translation.
	const placeholders = (v) => [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
	const values = {};
	for (const lang of langs) {
		const start = src.indexOf(`const ${lang} = {`);
		const end = src.indexOf('};', start);
		const body = src.slice(start, end);
		values[lang] = {};
		const m = body.matchAll(/"([a-zA-Z0-9.]+)":\s*"((?:[^"\\]|\\.)*)"/g);
		for (const match of m) values[lang][match[1]] = match[2].replace(/\\n/g, '\n');
	}
	for (const key of zhKeys) {
		const expected = placeholders(values.zh[key]);
		for (const lang of langs.slice(1)) {
			assert.deepEqual(placeholders(values[lang][key]), expected,
				`${lang}.${key} placeholder mismatch vs zh (expected [${expected}])`);
		}
	}
});

test('saved third-party skin survives repeated delayed host adoption (sticky restore)', async () => {
	// Regression: ThemeRuntime only persists system/light/dark to the host
	// settings scope, so an async/retried host adoption resets a saved
	// third-party skin like "midnight" to "system". A once-only reassert can
	// miss adoptions arriving later or a repeated re-adoption. The sticky
	// restore re-applies the saved skin on every fallback to a built-in
	// preference, but never after an explicit Default selection.
	const h = buildSandbox({ seed: { 'dsh-dream-skin:skin': 'midnight' } });
	const e = h.factory(makeRequire(makeRuntime().RT));

	const themeHandlers = [];
	let pref = 'system';
	const setCalls = [];
	const theme = {
		register() { return () => {}; },
		setTheme(id) { pref = id; setCalls.push(id); },
		getTheme() { return { preference: pref, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const skinActions = {};
	const ctx = {
		theme,
		slots: {
			inject(name, registerFn) { if (typeof registerFn === 'function') registerFn(); },
			// capture the skin row's returned action bag so the test can clear the
			// saved skin through the real writeSavedSkin->writeStorage path (which
			// clears the in-memory cache), not by deleting localStorage directly.
			register(desc, _Component) {
				if (desc && desc.id === 'dream-skin' && typeof desc.inject === 'function') {
					const storeSpec = desc.store && desc.store.spec;
					const bag = {};
					if (storeSpec && typeof storeSpec.actions.sync === 'function') {
						const state = storeSpec.init();
						bag.sync = (...args) => storeSpec.actions.sync(state, ...args);
					}
					const ra = desc.inject(bag);
					if (ra && typeof ra === 'object') Object.assign(skinActions, ra);
				}
				return {};
			}
		},
		locale: { register() {}, bind() { return (key) => key; } },
		on(ev, fn) { if (ev === 'theme/change') themeHandlers.push(fn); return () => {}; },
		// Keep deferrals alive (do NOT nuke timers) so the setTimeout(0) restore runs.
		effect(t) { const d = t(); if (typeof d !== 'function') return; }
	};
	const emitAdopt = (p) => {
		pref = p;
		for (const fn of themeHandlers) fn({ preference: p, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, revision: 2 });
	};
	const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

	assert.doesNotThrow(() => e.apply(ctx));
	await tick();
	const midnightCalls = () => setCalls.filter((id) => id === 'midnight').length;
	assert.ok(midnightCalls() >= 1, 'saved midnight skin restored at boot');
	const bootCount = midnightCalls();

	// First host adoption falls back to system — saved skin must be re-applied.
	emitAdopt('system');
	await tick();
	assert.equal(midnightCalls(), bootCount + 1, 'skin re-applied after first adoption');

	// A second re-adoption must be corrected too (once-only reassert regressed here).
	emitAdopt('system');
	await tick();
	assert.equal(midnightCalls(), bootCount + 2, 'skin re-applied after repeated adoption');

	// A deliberate Default selection clears the saved id via the real storage path
	// (writeSavedSkin -> writeStorage removes from cache + localStorage), so nothing
	// may be restored afterward. Drive it through the captured skin row's setSkin.
	assert.equal(typeof skinActions.setSkin, 'function', 'skin row setSkin captured');
	skinActions.setSkin('system');
	emitAdopt('system');
	await tick();
	assert.equal(midnightCalls(), bootCount + 2, 'no restore after the user cleared the skin');
});

test('issue #11: saved skin survives an agent-preset change that re-adopts the host theme', async () => {
	// Regression for issue #11: switching the agent preset in Settings → General
	// makes DSH reload/re-adopt the host `ui-theme.preference` scope (which only
	// holds system/light/dark), so a saved third-party skin like "rose" (Material粉)
	// is clobbered back to a built-in preference. The sticky restore must re-apply
	// the saved skin on every such built-in fallback, while an explicit Default
	// never restores. Model the two failure windows an agent-preset change opens:
	//   1. an immediate re-adoption right after the skin row is mounted;
	//   2. a repeated re-adoption (connection reset) at a later tick.
	const h = buildSandbox({ seed: { 'dsh-dream-skin:skin': 'rose' } });
	const e = h.factory(makeRequire(makeRuntime().RT));

	const themeHandlers = [];
	let pref = 'system';
	const setCalls = [];
	const theme = {
		register() { return () => {}; },
		setTheme(id) { pref = id; setCalls.push(id); },
		getTheme() { return { preference: pref, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const skinActions = {};
	const ctx = {
		theme,
		slots: {
			inject(n, f) { if (typeof f === 'function') f(); },
			register(desc, _Component) {
				if (desc && desc.id === 'dream-skin' && typeof desc.inject === 'function') {
					const bag = {};
					if (desc.store && desc.store.spec && typeof desc.store.spec.actions.sync === 'function') {
						const state = desc.store.spec.init();
						bag.sync = (...args) => desc.store.spec.actions.sync(state, ...args);
					}
					const ra = desc.inject(bag);
					if (ra && typeof ra === 'object') Object.assign(skinActions, ra);
				}
				return {};
			}
		},
		locale: { register() {}, bind() { return (key) => key; } },
		on(ev, fn) { if (ev === 'theme/change') themeHandlers.push(fn); return () => {}; },
		// Keep setTimeout(0) deferrals alive so the sticky restore actually runs.
		effect(t) { const d = t(); if (typeof d !== 'function') return; }
	};
	// Simulate DSH re-adopting the built-in theme after an agent-preset change.
	const adoptBuiltIn = (p) => {
		pref = p;
		for (const fn of themeHandlers) fn({ preference: p, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, revision: 2 });
	};
	const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

	assert.doesNotThrow(() => e.apply(ctx));
	await tick();
	const roseCalls = () => setCalls.filter((id) => id === 'rose').length;
	assert.ok(roseCalls() >= 1, 'saved rose skin restored at boot');
	const bootCount = roseCalls();

	// Agent-preset change #1: immediate host re-adoption to system.
	adoptBuiltIn('system');
	await tick();
	assert.equal(roseCalls(), bootCount + 1, 'rose re-applied after first agent-preset re-adoption');

	// Agent-preset change triggers a connection reset → repeated re-adoption.
	adoptBuiltIn('light');
	await tick();
	assert.equal(roseCalls(), bootCount + 2, 'rose re-applied after repeated re-adoption to light');

	// An explicit Default selection must clear the saved skin so nothing restores.
	assert.equal(typeof skinActions.setSkin, 'function', 'skin row setSkin captured');
	skinActions.setSkin('system');
	adoptBuiltIn('system');
	await tick();
	assert.equal(roseCalls(), bootCount + 2, 'no restore after the user cleared the skin');
});

test('issue #11 (built-in): saved dark/light survives an agent-preset connection reset', async () => {
	// The third-party-skin test above covers dream skins. But the reporter also
	// hit this for a BUILT-IN preference (深色 / 跟随系统): in a remote browser
	// DSH keeps ui-theme.preference process-local (not in $DSH_HOME/settings.yaml),
	// so a client reload / connection-reset from an agent-preset change resets a
	// concrete `dark`/`light` choice back to `system`. The plugin must record the
	// last concrete built-in and re-apply it across that reset window, while
	// treating a later, settled `system` switch as an explicit choice that clears it.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const themeHandlers = [];
	let pref = 'system';
	const setCalls = [];
	const theme = {
		register() { return () => {}; },
		setTheme(id) { pref = id; setCalls.push(id); },
		getTheme() { return { preference: pref, active: { id: pref === 'dark' ? 'dark' : 'light', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const ctx = {
		theme,
		slots: { inject(n, f) { if (typeof f === 'function') f(); }, register() { return {}; } },
		locale: { register() {}, bind() { return (k) => k; } },
		on(ev, fn) { if (ev === 'theme/change') themeHandlers.push(fn); return () => {}; },
		effect(t) { const d = t(); if (typeof d !== 'function') return; }
	};
	// Drive a built-in `dark` selection and record setTheme calls.
	const emit = (p) => { pref = p; for (const fn of themeHandlers) fn({ preference: p, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, revision: 2 }); };
	const tick = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	const darkCalls = () => setCalls.filter((id) => id === 'dark').length;

	assert.doesNotThrow(() => e.apply(ctx));
	// User picks a concrete built-in preference: dark (Appearance row calls
	// setTheme('dark'), which fires theme/change — the plugin records it).
	theme.setTheme('dark');
	emit('dark');
	assert.ok(darkCalls() >= 1, 'user setting dark invokes setTheme(dark)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:builtin-last'), 'dark', 'dark choice recorded for later restore');

	// Agent-preset change → connection reset → scope re-adoption → theme resets to
	// system. Simulate a client remount: a FRESH plugin with the same localStorage
	// (now holding builtin-last=dark) and the host re-adopting `system` right after
	// mount, while the boot/reset window is still open (< BUILTIN_SETTLE_MS).
	const h2 = buildSandbox({ seed: { 'dsh-dream-skin:builtin-last': 'dark' } });
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	const theme2Handlers = [];
	let pref2 = 'system';
	const setCalls2 = [];
	const theme2 = {
		register() { return () => {}; },
		setTheme(id) { pref2 = id; setCalls2.push(id); },
		getTheme() { return { preference: pref2, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const ctx2 = {
		theme: theme2,
		slots: { inject(n, f) { if (typeof f === 'function') f(); }, register() { return {}; } },
		locale: { register() {}, bind() { return (k) => k; } },
		on(ev, fn) { if (ev === 'theme/change') theme2Handlers.push(fn); return () => {}; },
		effect(t) { const d = t(); if (typeof d !== 'function') return; }
	};
	const emit2 = (p) => { pref2 = p; for (const fn of theme2Handlers) fn({ preference: p, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, revision: 2 }); };
	const darkCalls2 = () => setCalls2.filter((id) => id === 'dark').length;
	assert.doesNotThrow(() => e2.apply(ctx2));
	// The boot/reset window is open right after apply() (settle timer not yet fired).
	// The host re-adopts system (remote browser lost process-local dark).
	emit2('system');
	await tick(30); // < builtinSettled (2000ms) — still in the boot/reset window
	assert.ok(darkCalls2() >= 1, 'saved dark re-applied after the agent-preset reset to system');
});

test('setSkin auto-attaches the skin diffused-glow gradient when no user wallpaper is set', () => {
	// Premium material look: picking a built-in skin should attach that skin's
	// recommended iOS diffused-glow gradient automatically — but ONLY when the
	// user has not set a wallpaper of their own (never clobber a user choice).
	const h = buildSandbox(); // no wallpaper seeded
	const rt = makeRuntime();
	const e = h.factory(makeRequire(rt.RT));
	// Make theme.setTheme actually record + reflect the id so getTheme follows.
	let pref = 'system';
	const theme = {
		register() { return () => {}; },
		setTheme(id) { pref = id; },
		getTheme() { return { preference: pref, active: { id: pref, colorScheme: pref === 'system' ? 'dark' : 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	assert.doesNotThrow(() => e.apply(ctx));

	const skinBags = h.actionBags['dream-skin'];
	assert.ok(skinBags && typeof skinBags.setSkin === 'function', 'skin row setSkin captured');

	// No user wallpaper: picking abyss must auto-apply its diffused-glow gradient.
	skinBags.setSkin('abyss');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'gradient', 'auto-set kind to gradient');
	const gradient = h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient');
	assert.ok(gradient && gradient.indexOf('radial-gradient') !== -1, 'auto-applied a diffused-glow gradient');

	// Now the user picks a custom wallpaper (image) via the real wallpaper entry
	// (it resets kind to image AND marks the wallpaper as user-set, so a later
	// skin switch must not swap it back to a built-in gradient).
	const wpBags = h.actionBags['dream-skin-wallpaper'];
	assert.ok(wpBags && typeof wpBags.setWallpaper === 'function', 'wallpaper entry captured');
	wpBags.setWallpaper('data:image/png;base64,AAAA');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-follows-skin'), '0', 'user wallpaper marked as not-following');
	skinBags.setSkin('ember');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), 'data:image/png;base64,AAAA', 'user wallpaper untouched');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'image', 'user image wallpaper kept');
});

test('setSkin swaps the built-in diffused-glow background when switching skins', () => {
	// Regression: switching from one skin to another must swap the wallpaper to
	// the NEW skin's gradient when the current one is the (built-in) skin glow —
	// otherwise the previous skin's background lingers ("switching to nebula kept
	// the liquid-glass background").
	const h = buildSandbox();
	const rt = makeRuntime();
	const e = h.factory(makeRequire(rt.RT));
	let pref = 'system';
	const theme = {
		register() { return () => {}; },
		setTheme(id) { pref = id; },
		getTheme() { return { preference: pref, active: { id: pref, colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	assert.doesNotThrow(() => e.apply(ctx));
	const skinBags = h.actionBags['dream-skin'];

	// Pick mist → its gradient attaches and is marked as following the skin.
	skinBags.setSkin('mist');
	const mistGrad = h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient');
	assert.ok(mistGrad && mistGrad.indexOf('159, 190, 245') !== -1, 'mist diffused-glow attached');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-follows-skin'), '1', 'mist background marked as following');

	// Switch to nebula → background must swap to nebula's gradient.
	skinBags.setSkin('nebula');
	const g2 = h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient');
	assert.ok(g2 && g2.indexOf('139, 124, 246') !== -1, 'nebula purple glow applied (swapped from mist)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-follows-skin'), '1', 'still following after switch');
});

test('issue #29: wallpaper wash uses the target skin tokens, not BUILTIN_BASE fallback, after a skin round-trip', () => {
	// Regression: switching rose -> midnight -> rose with a wallpaper wash must leave
	// --dsw-alias-bg-base / --dsw-specific-sidebar-fill shaded with ROSE's tokens
	// (rgba(247,240,243,.8)), not the light-theme BUILTIN_BASE white (rgba(255,255,255,.8)).
	// The re-shade must run from the settled theme/change snapshot (target active), not
	// from the synchronous setSkin path before the target is active.
	const h = buildSandbox({
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'gradient',
			'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #222 0%, #444 100%)',
			'dsh-dream-skin:wallpaper-opacity': '0.8',
			'dsh-dream-skin:wallpaper-follows-skin': '0'
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));

	// Minimal per-skin token tables so resolveBase/resolveSidebar can find them.
	const SKINS2 = {
		rose: { colorScheme: 'light', tokens: { '--dsw-alias-bg-base': '#f7f0f3', '--dsw-specific-sidebar-fill': '#f6e9ef' } },
		midnight: { colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#0b0b0e', '--dsw-specific-sidebar-fill': 'rgba(11,11,14,0.92)' } }
	};
	let cur = 'rose';
	let changeHandler = null;
	const wallpaperOverrides = [];
	const activeFor = () => { const s = SKINS2[cur]; return { id: cur, colorScheme: s.colorScheme, tokens: s.tokens }; };
	const theme = {
		register() { return () => {}; },
		setTheme(id) { cur = id; if (changeHandler) changeHandler({ preference: cur, active: activeFor(), themes: [], revision: 2 }); },
		getTheme() { return { preference: cur, active: activeFor(), themes: [], revision: 1 }; },
		overrideTokens(source, tokens) { if (source === 'dsh-dream-skin:appearance') wallpaperOverrides.push(tokens); return () => {}; }
	};
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	// Ensure ctx.on('theme/change', ...) captures the handler this theme emits to.
	const origOn = baseCtx.on;
	ctx.on = (ev, fn) => { if (ev === 'theme/change') changeHandler = fn; return origOn(ev, fn); };
	assert.doesNotThrow(() => e.apply(ctx));
	const skinBags = h.actionBags['dream-skin'];
	assert.ok(skinBags && typeof skinBags.setSkin === 'function', 'skin row setSkin captured');

	// The user-kept gradient wallpaper means setSkin does NOT swap the wallpaper, so
	// the wash re-shade must come from the settled theme/change snapshot (syncSkin).
	const roseBase = () => wallpaperOverrides.length
		? wallpaperOverrides[wallpaperOverrides.length - 1]['--dsw-alias-bg-base'].light
		: null;

	// rose -> midnight -> rose. After the final switch back to rose, the wash must use
	// rose's (light) base #f7f0f3, NOT the built-in light fallback white.
	skinBags.setSkin('midnight');
	assert.ok(wallpaperOverrides.length > 0, 'wallpaper override produced after switching to midnight');
	skinBags.setSkin('rose');
	const lastLight = roseBase();
	assert.ok(/rgba\(247,\s*240,\s*243,\s*0\.8\)/.test(lastLight),
		'last wash light base must be ROSE token, not white fallback (got ' + lastLight + ')');
	assert.ok(!/rgba\(255,\s*255,\s*255,\s*0\.8\)/.test(lastLight),
		'light wash must not fall back to BUILTIN_BASE white');
});

test('issue #29: skin-following gradient shades from raw theme tokens, not its own composed override', () => {
	// Real ThemeRuntime folds override layers into snapshot.active. A wallpaper
	// wash must resolve the registered raw theme from snapshot.themes; otherwise
	// its previous white/default wash feeds back into the next skin selection.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	let themes = [
		{ id: 'light', colorScheme: 'light', tokens: { '--dsw-alias-bg-base': '#fff', '--dsw-specific-sidebar-fill': '#fff' } },
		{ id: 'dark', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#151517', '--dsw-specific-sidebar-fill': '#151517' } }
	];
	let preference = 'system';
	let revision = 0;
	const changeHandlers = [];
	const overrides = new Map();
	const snapshot = () => {
		const activeId = preference === 'system' ? 'light' : preference;
		const raw = themes.find((theme) => theme.id === activeId);
		const tokens = { ...raw.tokens };
		for (const layer of overrides.values()) {
			for (const [name, modes] of Object.entries(layer.tokens)) tokens[name] = modes[raw.colorScheme];
		}
		return { preference, active: { ...raw, tokens }, themes: [...themes], revision };
	};
	const publish = () => {
		revision += 1;
		const value = snapshot();
		for (const handler of changeHandlers) handler(value);
	};
	const theme = {
		register(definition) {
			themes = [...themes, definition];
			publish();
			return () => {};
		},
		setTheme(id) { preference = id; publish(); },
		getTheme() { return snapshot(); },
		overrideTokens(source, tokens) {
			const layer = { tokens };
			overrides.set(source, layer);
			publish();
			return () => {
				if (overrides.get(source) !== layer) return;
				overrides.delete(source);
				publish();
			};
		}
	};
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	ctx.on = (ev, fn) => { if (ev === 'theme/change') changeHandlers.push(fn); return () => {}; };
	assert.doesNotThrow(() => e.apply(ctx));
	const skinBags = h.actionBags['dream-skin'];

	// First selection from the default light theme must already use rose, not white.
	skinBags.setSkin('rose');
	let wash = overrides.get('dsh-dream-skin:appearance').tokens;
	assert.match(wash['--dsw-alias-bg-base'].light, /rgba\(247,\s*240,\s*243,\s*0\.8\)/);

	// The round-trip must not feed either prior wash back into the final rose wash.
	skinBags.setSkin('midnight');
	skinBags.setSkin('rose');
	wash = overrides.get('dsh-dream-skin:appearance').tokens;
	assert.match(wash['--dsw-alias-bg-base'].light, /rgba\(247,\s*240,\s*243,\s*0\.8\)/);
});

test('production facade keeps wallpaper, popup opacity, and accent visible together across a skin round-trip', async () => {
	const h = buildSandbox({ seed: {
		'dsh-dream-skin:skin': 'rose',
		'dsh-dream-skin:wallpaper-kind': 'gradient',
		'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #fdf2f6 0%, #f0d2dc 100%)',
		'dsh-dream-skin:wallpaper-opacity': '0.8',
		'dsh-dream-skin:wallpaper-follows-skin': '0',
		'dsh-dream-skin:modal-opacity': '0.5',
		'dsh-dream-skin:accent': '#123456'
	} });
	const e = h.factory(makeRequire(makeRuntime().RT));
	let themes = [
		{ id: 'light', colorScheme: 'light', tokens: { '--dsw-alias-bg-base': '#fff', '--dsw-specific-sidebar-fill': '#f9fafb', '--dsw-specific-menu': '#fff', '--dsw-alias-bg-overlay': '#fff', '--dsw-alias-brand-primary': '#000' } },
		{ id: 'dark', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#151517', '--dsw-specific-sidebar-fill': '#0f0f0f', '--dsw-specific-menu': '#292929', '--dsw-alias-bg-overlay': '#353638', '--dsw-alias-brand-primary': '#fff' } }
	];
	let preference = 'system';
	let revision = 0;
	const handlers = [];
	let packageLayer = null;
	let activeLayerRemovals = 0;
	const snapshot = () => {
		const activeId = preference === 'system' ? 'light' : preference;
		const raw = themes.find((theme) => theme.id === activeId);
		const tokens = { ...raw.tokens };
		if (packageLayer !== null) {
			for (const [name, modes] of Object.entries(packageLayer.tokens)) tokens[name] = modes[raw.colorScheme];
		}
		return { preference, active: { ...raw, tokens }, themes: [...themes], revision };
	};
	const publish = () => {
		revision += 1;
		const value = snapshot();
		// The production dynamic-package event facade may expose the composed
		// active presentation without a usable third-party id. The preference and
		// registry remain authoritative, and the plugin must not feed the composed
		// (already washed) tokens back into the next skin.
		const eventValue = {
			...value,
			// A host-scope adoption can transiently surface the built-in preference
			// in the same turn that the third-party selection is being restored.
			// The already-persisted Dream Skin id is authoritative for its wash.
			preference: ['system', 'light', 'dark'].includes(value.preference)
				? value.preference
				: 'system',
			active: { colorScheme: value.active.colorScheme, tokens: value.active.tokens }
		};
		for (const handler of [...handlers]) handler(eventValue);
	};
	const theme = {
		register(definition) { themes = [...themes, definition]; publish(); return () => {}; },
		setTheme(id) { if (preference === id) return; preference = id; publish(); },
		getTheme() { return snapshot(); },
		overrideTokens(_source, tokens) {
			// dsh-cordis-client-runner deliberately pins every source from one
			// dynamic package to the same package id. This is the production seam.
			const layer = { tokens };
			packageLayer = layer;
			publish();
			return () => {
				if (packageLayer !== layer) return;
				activeLayerRemovals += 1;
				packageLayer = null;
				publish();
			};
		}
	};
	const registrations = [];
	const baseCtx = makeApplyContext(h);
	const ctx = {
		...baseCtx,
		theme,
		effect(register) { register(); },
		on(ev, fn) { if (ev === 'theme/change') handlers.push(fn); return () => {}; },
		slots: {
			inject(_name, factory) { factory(); },
			register(desc) { registrations.push(desc); return {}; }
		}
	};
	assert.doesNotThrow(() => e.apply(ctx));
	for (const desc of registrations) {
		if (typeof desc.inject !== 'function') continue;
		const storeSpec = desc.store && desc.store.spec;
		const state = storeSpec ? storeSpec.init() : undefined;
		const actions = storeSpec && typeof storeSpec.actions.sync === 'function'
			? { sync: (...args) => storeSpec.actions.sync(state, ...args) }
			: {};
		const bag = desc.inject(actions);
		if (bag && typeof bag === 'object') (h.actionBags || (h.actionBags = {}))[desc.id] = bag;
	}

	const skin = h.actionBags['dream-skin'];
	let presentedTokens = null;
	// ui-layout can subscribe after a dynamic package. Its outer callback must not
	// overwrite the nested override snapshot after a theme selection.
	handlers.push((value) => { presentedTokens = value.active.tokens; });
	skin.setSkin('midnight');
	skin.setSkin('rose');
	await new Promise((resolve) => setTimeout(resolve, 10));
	const tokens = theme.getTheme().active.tokens;
	assert.match(tokens['--dsw-alias-bg-base'], /rgba\(247,\s*240,\s*243,\s*0\.8\)/,
		'rose wallpaper wash survives the round-trip');
	assert.match(tokens['--dsw-specific-menu'], /rgba\(247,\s*240,\s*243,\s*0\.5\)/,
		'popup opacity remains active after the wallpaper re-shade');
	assert.equal(tokens['--dsw-alias-brand-primary'], '#123456',
		'custom accent remains active after the wallpaper re-shade');
	assert.equal(activeLayerRemovals, 0,
		'same-source replacement never publishes an intermediate unshaded theme');
	assert.match(presentedTokens['--dsw-alias-bg-base'], /rgba\(247,\s*240,\s*243,\s*0\.8\)/,
		'the presenter ends on the deferred rose wash instead of the outer stale snapshot');
});

test('saved skin survives a page refresh (fresh apply re-stores from localStorage)', () => {
	// Regression for issue #8: selecting a skin must survive a plain page refresh.
	// On refresh the SAME origin's localStorage is still present, but the plugin is
	// a fresh module (empty in-memory cache, getTheme() starts at 'system'). A new
	// apply() must re-apply the persisted third-party skin from localStorage so the
	// UI doesn't fall back to Default. We drive the restore by seeding the storage
	// exactly as a previous "page life" would have left it and re-running apply().
	const h = buildSandbox({
		seed: { 'dsh-dream-skin:skin': 'midnight' } // what the pre-refresh session saved
	});
	let pref = 'system'; // freshly-booted theme runtime has no preference yet
	let setCalls = [];
	const theme = {
		register() { return () => {}; },
		setTheme(id) { pref = id; setCalls.push(id); },
		getTheme() { return { preference: pref, active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	ctx.theme = theme;
	assert.doesNotThrow(() => e.apply(ctx));
	assert.equal(pref, 'midnight', 'refresh restored the saved third-party skin from localStorage');
	assert.ok(setCalls.includes('midnight'), 'theme.setTheme(midnight) invoked during refresh restore');
});

test('modal-opacity row registers, persists, applies the CSS fill, and drives popup token overrides', () => {
	// Feature (issue #9): a user-facing popup-opacity control must (a) register as a
	// settings row, (b) persist its value, (c) set the CSS fill variable, AND
	// (d) stack a token override on DSH's real popup/menu surfaces (--dsw-specific-menu
	// / --dsw-alias-bg-overlay) so the slider actually works on real popovers/dropdowns
	// (the reporter found 0 and 100 looked identical when only .Mbwy4a_card was wired).
	const styleProps = {};
	const documentMock = {
		body: { contains: () => false },
		head: { children: [], contains(el) { return false; }, appendChild() {} },
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		documentElement: { style: { setProperty(k, v) { styleProps[k] = v; } } }
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));

	// Capture theme.overrideTokens calls (the popup token-override vehicle).
	const overrideLog = [];
	const theme = {
		register() { return () => {}; },
		setTheme(id) {},
		getTheme() { return { preference: 'system', active: { id: 'dark', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#101014' } }, themes: [], revision: 1 }; },
		overrideTokens(source, tokens) { overrideLog.push({ source, tokens }); return () => {}; }
	};
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	assert.doesNotThrow(() => e.apply(ctx));

	// At boot the saved/ default popup opacity stacks the token override once.
	assert.ok(overrideLog.some((o) => o.source === 'dsh-dream-skin:appearance' && o.tokens['--dsw-specific-menu']), 'popup token override applied at boot');

	const bags = h.actionBags;
	assert.ok(bags['dream-skin-modal-opacity'], 'modal-opacity row action bag captured');
	assert.doesNotThrow(() => bags['dream-skin-modal-opacity'].setOpacity(50));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), '0.5', 'modal opacity persisted');
	// readModalOpacity → 50% → the CSS variable is set to the weight percentage.
	assert.equal(styleProps['--dsh-dream-skin-modal-fill'], '50%', 'CSS fill variable applied (50%)');
	// The token override is re-applied at 50% alpha (0.5) on the popup surfaces,
	// so 50% is visibly different from 0% / 100% — the exact bug the reporter hit.
	const last = overrideLog[overrideLog.length - 1];
	assert.equal(last.source, 'dsh-dream-skin:appearance', 'slider re-applies the combined appearance override layer');
	assert.ok(last.tokens['--dsw-specific-menu'], 'menu surface token overridden');
	assert.ok(last.tokens['--dsw-alias-bg-overlay'], 'overlay/popover surface token overridden');
	assert.equal(last.tokens['--dsw-specific-menu'].dark, 'rgba(16, 16, 20, 0.5)', 'dark menu fill scaled to 50%');
	assert.equal(last.tokens['--dsw-specific-menu'].light, 'rgba(255, 255, 255, 0.5)', 'light menu fill scaled to 50%');
});

test('liquid-glass material CSS is injected on leaf cards only (no fixed-modal ancestor)', () => {
	// Regression guard for the settings-modal-trapping bug: the premium material
	// injector must add backdrop-filter only to LEAF cards (composer, warning,
	// popover) and NEVER to large columns/sidebar that could be ancestors of a
	// position:fixed modal. apply() must not throw, and the injected stylesheet
	// must contain the safe leaf selectors and not the unsafe container one.
	let appended = null;
	const headChildren = [];
	const documentMock = {
		body: { contains: () => false },
		head: {
			children: headChildren,
			contains(el) { return headChildren.includes(el); },
			appendChild(el) { headChildren.push(el); appended = el; }
		},
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h);
	assert.doesNotThrow(() => e.apply(ctx), 'apply injects liquid-glass CSS without throwing');

	assert.ok(appended && appended.textContent, 'a material <style> node was appended');
	const css = appended.textContent;
	assert.ok(css.includes('.uV2eYG_card'), 'composer card is a (safe) blur target');
	assert.ok(css.includes('backdrop-filter'), 'uses backdrop-filter');
	// The unsafe big containers MUST NOT be blurred (regression): those host the
	// settings modal, and blurring them broke fixed positioning.
	assert.ok(!/centerCol/.test(css), 'must NOT blur the main center column');
	assert.ok(!/sidebarCol/.test(css), 'must NOT blur the sidebar column');
	// The sidebar root may never be a blur target (regression guard). It may still
	// appear as a scoping PREFIX in alignment rules (e.g. `.hHd-Xa_root .hHd-Xa_footArea`)
	// that only adjust margins — those never set backdrop-filter. So the guard is: any
	// rule that mentions the sidebar root must NOT carry a backdrop-filter.
	assert.ok(!/hHd-Xa_root[^A-Za-z0-9_-]*\{[^}]*backdrop-filter/.test(css) && !/hHd-Xa_root[^A-Za-z0-9_-]*\{[^}]*filter:/.test(css), 'must NOT blur the sidebar root');
	// The composer root must stay a leaf-only surface with NO sharp outer frame.
	// The old full-width "bottom scrim" gradient painted a wide rectangular band
	// behind the (narrower, rounded) composer card, which read as an ugly
	// right-angle frame around the input when a wallpaper was active. The root is
	// now transparent so only the rounded card renders (issue: 外层尖角框).
	assert.ok(css.includes('.uV2eYG_root'), 'composer root styled');
	assert.ok(css.includes('.uV2eYG_root {'), 'composer root rule present');
	assert.ok(css.includes("background: transparent"), 'composer root has no sharp frame (transparent)');
	assert.ok(!css.includes('linear-gradient(to bottom'), 'no full-width scrim gradient around the rounded card');
	// Cross-panel consistency: the right file panel must use the same sidebar fill
	// as the left rail (the halves previously rendered with different tints), and
	// the sidebar footer/settings must be one uniform plane with the list.
	assert.ok(css.includes('.nArs4W_panel'), 'right file panel themed to sidebar fill');
	assert.ok(css.includes('var(--dsw-specific-sidebar-fill)'), 'right panel uses the shared sidebar fill');
	assert.ok(css.includes('.hHd-Xa_settingsArea, .hHd-Xa_footerActions'), 'sidebar footer/settings pinned to one plane');
	assert.ok(css.includes('.qDHVXG_fade'), 'list-end fade removed for a uniform left column');
	// Dropdown / popup menu readability (issue: menus see-through): since 0.4.5 the
	// menu / popover fill is driven by the popup-opacity token override layer
	// (applyModalOverlay -> ctx.theme.overrideTokens on --dsw-specific-menu /
	// --dsw-alias-bg-overlay), NOT by an injected !important rule — so the material
	// stylesheet must not carry a hardcoded menu repoint that would fight the slider.
	assert.ok(!css.includes('--dsw-specific-menu: var(--dsw-alias-bg-layer-2) !important'), 'menu fill is NOT hardcoded in CSS (token-driven so the slider controls it)');
	// The user-questions option card must get a high-opacity readable fill (it
	// shares input-major with the translucent composer, so it needs its own
	// solid background or option text becomes illegible).
	assert.ok(css.includes('.Mbwy4a_card'), 'user-questions card overridden');
	assert.ok(css.includes('color-mix('), 'option card uses a base-color mix for a solid fill');
	// The fill weight must be adjustable (issue #9): the rule references the
	// MODAL_FILL_VAR custom property with a readable fallback, not a hardcoded 94%.
	assert.ok(css.includes('--dsh-dream-skin-modal-fill'), 'option card fill is user-adjustable via CSS variable');
	assert.ok(css.includes(', 94%'), 'adjustable fill keeps the readable default fallback');
});
