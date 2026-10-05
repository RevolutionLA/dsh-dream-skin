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
 *
 * Test-admission rules live in CONTRIBUTING.md ("测试准入规则", four gates) —
 * that file is authoritative; this block is a mirror of the two that bind a
 * test author most directly:
 *   1. every state-machine case samples at LEAST two time points — an
 *      intermediate snapshot AND the final one. Asserting only the terminal
 *      state cannot distinguish "reached the target state" from "never ran the
 *      transition at all" (external review 9.26.x, process note 1, adopted
 *      after mutation verification caught two "always-green" windows);
 *   2. a "clarification" fix (rename / doc / constant shape) is only pinned
 *      when a SEMANTIC reversal — source edited, literals untouched — reddens a
 *      behavioural assertion. An anchor string that merely fails to match is a
 *      file-level throw, not a pin (round 3 self-catch, see `drift probe (R-4)`);
 *   3. a lifecycle/cleanup case must catch its resource IN FLIGHT. Compressing
 *      the clock can move the unmount past the window the leak lives in, and the
 *      case then passes while proving nothing (round 4: S-3's cases ran on
 *      FAST_DRIFT_CODE, so the ladder timer was already spent at unload and
 *      "unload leaves no residue" was only half implemented without one red).
 * Every attribution statement of the form "mutation X is caught by assertion Y"
 * is itself reverse-checked in isolation before it is written down.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');

// The drift probe now runs a bounded delay ladder (A-1; R-4 round 2 renamed
// CHECKPOINTS→RETRY_DELAYS because the entries are RELATIVE gaps, cumulative
// ≈0/300/1300/4300ms). Fast-path tests patch the ladder to low hundreds of
// milliseconds instead of waiting out the real 4.3s.
// CAUTION for lifecycle cases: unloading after a compressed ladder finishes
// means nothing is in flight to cancel, which is how the round-4 T-1 leak stayed
// invisible to 92 green cases. Teardown/cancellation tests slow the ladder
// instead (see `drift probe (T-1)`).
const FAST_DRIFT_CODE = CODE.replace('[0, 300, 1000, 3000]', '[0, 20, 50, 90]');
if (FAST_DRIFT_CODE === CODE) throw new Error('DRIFT_RETRY_DELAYS_MS ladder moved — update FAST_DRIFT_CODE patch in smoke tests');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Structural CSS matcher (T1, adversarial review 10.5.0) -----------------
// WHY THIS EXISTS: the readability-fill assertions used to check that the sheet
// STRING contains the stamp selectors (`selectors.includes('[data-approval-key] > div')`).
// That test stays green while the selector is broken — it also "passes" for
// `[data-approval-key] > div:nth-child(2)` (substring!), which no longer matches
// the host's actual markup. The reviewer's requirement: assert MATCHABILITY —
// take the selector list the sheet really holds, parse it, and evaluate it
// against a fixture that mirrors the host's rendered structure. Only this
// subset of CSS is needed (attribute presence/=/^=, tag, .class, :nth-child(n),
// descendant and child combinators); anything this matcher does not understand
// FAILS CLOSED (no match), so a future selector using an unsupported construct
// shows up as a red test, not as silent coverage.
function cssNode(tag, attrs = {}, children = []) {
	const el = { tag: String(tag).toUpperCase(), attrs: {}, className: '', children: [], parent: null };
	for (const [k, v] of Object.entries(attrs)) {
		if (k === 'class') { el.className = String(v); continue; }
		el.attrs[k.toLowerCase()] = String(v);
	}
	for (const c of children) { c.parent = el; el.children.push(c); }
	return el;
}
function splitSelectorList(list) {
	const out = [];
	let buf = '', depth = 0, quote = '';
	for (const ch of list) {
		if (quote) { buf += ch; if (ch === quote) quote = ''; continue; }
		if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
		if (ch === '[' || ch === '(') depth++;
		if (ch === ']' || ch === ')') depth--;
		if (ch === ',' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
		buf += ch;
	}
	if (buf.trim()) out.push(buf.trim());
	return out;
}
function parseChain(selector) {
	const compounds = [];
	const combinators = [];
	let buf = '', depth = 0, quote = '';
	let pendingChild = false;
	const flush = () => {
		const t = buf.trim();
		buf = '';
		if (!t) return;
		if (compounds.length > 0) combinators.push(pendingChild ? 'child' : 'desc');
		compounds.push(t);
		pendingChild = false;
	};
	for (const ch of selector) {
		if (quote) { buf += ch; if (ch === quote) quote = ''; continue; }
		if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
		if (ch === '[' || ch === '(') { depth++; buf += ch; continue; }
		if (ch === ']' || ch === ')') { depth--; buf += ch; continue; }
		if (depth === 0 && ch === '>') { flush(); pendingChild = true; continue; }
		if (depth === 0 && /\s/.test(ch)) { flush(); continue; }
		buf += ch;
	}
	flush();
	return { compounds, combinators };
}
function matchesCssCompound(el, compound) {
	let i = 0;
	const tag = /^[A-Za-z][A-Za-z0-9-]*/.exec(compound);
	if (tag) {
		if (el.tag !== tag[0].toUpperCase()) return false;
		i = tag[0].length;
	}
	while (i < compound.length) {
		const ch = compound[i];
		if (ch === '[') {
			const close = compound.indexOf(']', i);
			if (close < 0) return false;
			const spec = compound.slice(i + 1, close);
			const spec2 = /^([A-Za-z0-9_-]+)\s*(?:([\^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?$/.exec(spec);
			if (!spec2) return false;
			const name = spec2[1].toLowerCase();
			if (!Object.prototype.hasOwnProperty.call(el.attrs, name)) return false;
			if (spec2[2] !== undefined) {
				const want = spec2[3] !== undefined ? spec2[3] : spec2[4] !== undefined ? spec2[4] : spec2[5];
				const got = String(el.attrs[name]);
				if (spec2[2] === '=' && got !== want) return false;
				if (spec2[2] === '^=' && got.indexOf(want) !== 0) return false;
				if (spec2[2] === '$=' && !got.endsWith(want)) return false;
				if (spec2[2] === '*=' && got.indexOf(want) === -1) return false;
			}
			i = close + 1;
			continue;
		}
		if (ch === '.') {
			const cm = /^\.([A-Za-z0-9_-]+)/.exec(compound.slice(i));
			if (!cm) return false;
			if (!String(el.className).split(/\s+/).includes(cm[1])) return false;
			i += cm[0].length;
			continue;
		}
		if (ch === ':') {
			const pm = /^:nth-child\(\s*(\d+)\s*\)/.exec(compound.slice(i));
			if (!pm) return false; // unknown pseudo — fail closed
			const idx = el.parent ? el.parent.children.indexOf(el) + 1 : 1;
			if (idx !== parseInt(pm[1], 10)) return false;
			i += pm[0].length;
			continue;
		}
		if (ch === '*') { i += 1; continue; }
		return false; // unknown construct — fail closed
	}
	return true;
}
function matchesChain(el, chain, i) {
	if (!matchesCssCompound(el, chain.compounds[i])) return false;
	if (i === 0) return true;
	if (chain.combinators[i - 1] === 'child') {
		return el.parent !== null && matchesChain(el.parent, chain, i - 1);
	}
	let p = el.parent;
	while (p !== null) {
		if (matchesChain(p, chain, i - 1)) return true;
		p = p.parent;
	}
	return false;
}
/** Does ANY selector in the (comma-separated) list structurally match `el`? */
function covers(selectorList, el) {
	for (const sel of splitSelectorList(selectorList)) {
		if (sel === '') continue;
		const chain = parseChain(sel);
		if (chain.compounds.length > 0 && matchesChain(el, chain, chain.compounds.length - 1)) return true;
	}
	return false;
}

// Mini-DOM with REAL tree semantics for the two things issue #61 needs to see:
// child ORDER (the blur-fill layer must land before the wallpaper layer — both
// are fixed at z-index -1, so tree order alone decides who paints on top) and
// DETACHMENT (a fill-mode switch must remove the stale bleed layer). The old
// stub answered `contains()` with "only the element itself" and dropped every
// child, so each re-render silently created a brand-new layer and neither
// invariant was observable from a test.
function makeEl() {
	const el = {
		style: {}, dataset: {}, children: [], parentElement: null,
		setAttribute() {}, removeAttribute() {},
		// Real DOM insertion semantics: a node cannot occupy two slots, so re-appending an
		// existing child MOVES it. The material sheet's "last in <head>" gate (B9) is only
		// observable under this rule — with a naive push the mock would show two copies of one
		// node and every ordering assertion would pass for the wrong reason.
		place(c, atStart) {
			if (!c) return;
			const mine = this.children.indexOf(c);
			if (mine >= 0) this.children.splice(mine, 1);
			if (c.parentElement && c.parentElement !== this) {
				const other = c.parentElement.children.indexOf(c);
				if (other >= 0) c.parentElement.children.splice(other, 1);
			}
			c.parentElement = this;
			if (atStart) this.children.unshift(c); else this.children.push(c);
		},
		appendChild(c) { this.place(c); },
		append(c) { this.place(c); },
		prepend(c) { this.place(c, true); },
		insertBefore(c, ref) {
			const i = this.children.indexOf(ref);
			if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
			if (c) c.parentElement = this;
		},
		click() {},
		remove() {
			this.removed = true;
			const p = this.parentElement;
			if (p) {
				const i = p.children.indexOf(this);
				if (i >= 0) p.children.splice(i, 1);
			}
		},
		contains(c) { return !!c && this.children.includes(c); }
	};
	return el;
}

function buildSandbox(overrides = {}) {
	const body = makeEl();
	const document = { body, createElement: () => makeEl(), createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl() };
	const store = new Map();
	// seed localStorage from overrides.seed
	if (overrides.seed) for (const [k, v] of Object.entries(overrides.seed)) store.set(k, String(v));
	// Round-6: tests exercise the "existing user" path — the factory-defaults
	// one-shot is pre-marked as already applied so first-boot seeding does not
	// overwrite what individual tests assert about. First-launch behavior has
	// its own dedicated tests (round-6 factory block).
	store.set('dsh-dream-skin:factory-applied', '1');
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
		URL: Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }),
		Blob: class {}, FileReader: class {},
		// Image stub: assigning `src` resolves the preload synchronously as a
		// success, so the plugin's "preload before committing a scheduled
		// wallpaper refresh" path is exercised (and completes) inside the test.
		Image: function () { this.onload = null; this.onerror = null; let _src = ''; Object.defineProperty(this, 'src', { get: () => _src, set: (v) => { _src = v; if (typeof this.onload === 'function') this.onload(); } }); },
		setTimeout, clearTimeout, alert: () => {},
		MutationObserver: class { observe() {} disconnect() {} },
		...overrides,
	};
	sandbox.window.__ModuleLoader__ = { load: (o) => { factory = o.factory; } };
	sandbox.window.location = loc;
	sandbox.window.history = sandbox.history;
	for (const k of ['document', 'localStorage', 'btoa', 'atob']) sandbox.window[k] = sandbox[k];
	const context = vm.createContext(sandbox);
	// overrides.code lets a test patch the bundle source (e.g. pin the migration
	// fingerprint constants to a synthetic fixture) without touching lib/client.js.
	vm.runInContext((overrides.code || CODE) + '\nwindow.__LOGGED__=1;', context);
	// Return the document the bundle ACTUALLY sees. The local `document` const is
	// the default mock, so whenever a test passed a `document:` override it used to
	// get the unused one back — and anything patched through `h.document` (a
	// createElement interceptor, a head detach) silently missed the running code.
	return {
		factory, loc, localStorage, document: sandbox.document, window: sandbox.window, registered: [], slots: { count: 0 },
		// Evaluate the SAME bundle again in the SAME context/document. Needed by the
		// injection-idempotency cases: the module-scope caches go empty on a second
		// evaluation while the DOM keeps the first copy's nodes — exactly what a
		// long-lived page does. Returns the NEW factory instance.
		rerun(code) {
			vm.runInContext((code || overrides.code || CODE) + '\nwindow.__RERUN__=1;', context);
			return factory;
		}
	};
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
						// Expose the live store state so tests can assert SYNC semantics
						// (e.g. the legacy modal setOpacity must keep the glass store in
						// step) — localStorage assertions alone can't see store sync and
						// would stay green even if every syncGlass() call were deleted.
						(harness.storeStates || (harness.storeStates = {}))[desc.id] = state;
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
		// Real host semantics: effect(fn) registers the disposer returned by fn
		// and runs it on UNMOUNT — not immediately. (Running it inline used to
		// hide lifecycle bugs: a scheduler armed inside apply() was torn down at
		// once, which is exactly what blue-team R5 is about.) The disposers are
		// collected on the harness so a test can unmount explicitly.
		effect(t) {
			const d = t();
			if (typeof d === 'function') (harness.disposers || (harness.disposers = [])).push(d);
			return () => {};
		}
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
		if (s === '@deepseek-ai/dsh-client-store') return RT;
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

test('issue #43: stable-DSH fallback — module table has no dsh-client-store, resolves via dsh-client-runtime/client', () => {
	// Simulates a stable host (≤ 0.1.1-rc.x): requiring the master-only
	// `@deepseek-ai/dsh-client-store` seed throws a table-miss Error and the
	// pre-split `@deepseek-ai/dsh-client-runtime/client` is what the platform
	// provides. The bundle must still evaluate, expose its full surface and
	// register its defineStore specs through the fallback module.
	const h = buildSandbox();
	const runtime = makeRuntime();
	const e = h.factory((s) => {
		if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
		if (s === 'react') return REACT;
		if (s === '@deepseek-ai/dsh-client-store') {
			throw new Error('client-modules: require("' + s + '") missed the module table');
		}
		if (s === '@deepseek-ai/dsh-client-runtime/client') return runtime.RT;
		throw new Error('unexpected require: ' + s);
	});
	assert.equal(typeof e.apply, 'function');
	assert.ok(Array.isArray(e.inject));
	assert.ok(Array.isArray(e.SKINS));
	assert.ok(e.SKINS.length > 0);
	assert.ok('SETTINGS_NS' in e);
	// defineStore specs materialize during apply (slot registration), so run the
	// full apply path to prove the stores are created through the fallback module.
	e.apply(makeApplyContext(h));
	assert.ok(runtime.specs.length > 0, 'defineStore specs registered through the fallback module');
});

test('issue #43 / blue-team R3: when no store seed resolves, the factory degrades to a dumb module (never throws)', () => {
	// The host does not isolate loader-entry factories: a throw here would take
	// the whole shell down ("Failed to load plugins"). So total seed failure
	// (store missing, no stable fallback either) must degrade to a no-op module
	// — never rethrow. The original error is surfaced once via console.warn.
	const warns = [];
	const h = buildSandbox({ console: { warn: (m) => warns.push(String(m)), log() {}, error() {} } });
	const e = h.factory((s) => {
		if (s === 'react/jsx-runtime') return { jsx: () => 0, jsxs: () => 0 };
		if (s === 'react') return REACT;
		throw new Error('client-modules: require("' + s + '") missed the module table');
	});
	// Dumb surface: apply is a callable no-op, SKINS is empty, no throw.
	assert.equal(typeof e.apply, 'function', 'apply still exported as a function');
	assert.deepEqual(e.SKINS, [], 'dumb module exposes no skins');
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)), 'apply() of the dumb module is a no-op');
	assert.ok(warns.some((w) => w.includes('plugin disabled')), 'one console.warn explains the degrade');
});

test('issue #43 / blue-team R3 twin: a missing REACT seed also degrades to the dumb module (the core R3 scenario)', () => {
	// The blue team flagged that the store-only case above leaves R3's PRIMARY
	// scenario untested: before the fix, `react` / `react/jsx-runtime` were bare
	// top-level requires OUTSIDE any try — a react seed rename was exactly the
	// "one seed generation change = whole shell white-screens" path. If a future
	// refactor drops `_react` from the null check, this twin keeps CI honest.
	const warns = [];
	const h = buildSandbox({ console: { warn: (m) => warns.push(String(m)), log() {}, error() {} } });
	const e = h.factory((s) => {
		if (s === 'react/jsx-runtime') throw new Error('client-modules: require("' + s + '") missed the module table');
		if (s === 'react') throw new Error('client-modules: require("' + s + '") missed the module table');
		return {}; // store resolves fine — the react seed is what breaks
	});
	assert.equal(typeof e.apply, 'function', 'apply exported as a no-op function');
	assert.deepEqual(e.SKINS, [], 'no skins registered without react');
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)), 'apply() must not throw');
	assert.ok(warns.some((w) => w.includes('plugin disabled')), 'degrade is announced once');
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

test('diagnostics: window.__DSH_DREAM_SKIN_STATUS__ is the machine-readable drift channel (docs/desktop-support.md)', async () => {
	const pkg = require('../package.json');
	// A-1 acceptance case ①: against an empty mock DOM (nothing of the host
	// is mounted) the probe must NOT claim drift — "UI not mounted yet" and
	// "the host hashes drifted" are indistinguishable from querySelector
	// alone, so the honest answer is pending, an empty drifted list, and NO
	// console.warn. (The pre-A-1 probe published drifted.length === 6 here —
	// a false verdict aimed at official desktop tooling.)
	const warns = [];
	const h = buildSandbox({ code: FAST_DRIFT_CODE, seed: { 'dsh-dream-skin:skin': 'abyss' }, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.ok(status, 'apply() publishes the status global even with no UI interaction');
	assert.equal(status.plugin, 'dsh-dream-skin');
	// Release-drift guard: PLUGIN_BUILD in the bundle must track package.json.
	assert.equal(status.build, pkg.version, 'bundle build matches package.json version');
	assert.equal(status.status, 'ready', 'apply() completed → ready (B-4: the token is signed at the END of apply, not its head)');
	assert.equal(status.shell, 'web');
	assert.equal(status.skin, 'abyss', 'status reflects the saved skin at boot');
	// B-3: the READY snapshot must expose the same field set as the degraded
	// one — a strict consumer reading `reason`/`lastError` never hits
	// undefined on either side.
	assert.ok('reason' in status && 'lastError' in status, 'ready snapshot carries reason/lastError keys');
	assert.equal(status.reason, null, 'ready-side reason is an explicit null');
	assert.equal(status.lastError, null, 'ready-side lastError is an explicit null');
	assert.ok(status.anchors, 'drift probe fills anchors even while pending');
	assert.equal(status.anchors.pending, true, 'empty DOM is UNDECIDABLE, not drifted (A-1)');
	assert.deepEqual(status.anchors.drifted, [], 'no drift verdict may be published while pending');
	assert.equal(status.anchors.probed, 6, 'six host anchor groups probed on web shell');
	assert.ok(status.checkedAt > 0 && status.publishedAt > 0, 'timestamps present');
	// Run the whole checkpoint ladder to its end, then re-read: the FINAL
	// round of an undecidable DOM stays pending forever — that is the point.
	// 400ms lands ~240ms past the FAST ladder's last round (≈160ms), so a
	// `conclusive = final` (liveness-gate drop) mutation WOULD have published
	// a 6-group drifted verdict here — the honest pending below is what the
	// sentinel gate buys, not an untested race.
	await sleep(400);
	const settled = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(settled.anchors.pending, true, 'after all rounds the empty DOM is still honestly pending');
	assert.deepEqual(settled.anchors.drifted, [], 'still no drift verdict after the ladder completes');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 0, 'a pending probe must not console.warn about drift');
});

test('diagnostics: degraded boot still publishes a machine-readable status (the moment tooling needs it most)', () => {
	const h = buildSandbox({ console: { warn() {}, log() {}, error() {} } });
	// Total seed failure → dumb module. The inline degraded snapshot must exist
	// so official diagnostics can distinguish "plugin absent" from "plugin
	// present but host seeds renamed" without parsing a console.warn.
	const e = h.factory(() => { throw new Error('client-modules: require missed the module table'); });
	assert.deepEqual(e.SKINS, [], 'degraded surface');
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.ok(status, 'degraded path publishes status at factory time');
	assert.equal(status.status, 'degraded');
	assert.equal(status.reason, 'host-seeds-unavailable');
	assert.ok(status.lastError && status.lastError.includes('missed the module table'), 'last error surfaced for diagnosis');
	// B-09 (9.26.1): degraded snapshot must expose the SAME field set as the
	// ready one — consumers may read any member unguarded.
	for (const k of ['plugin', 'build', 'status', 'shell', 'skin', 'anchors', 'checkedAt', 'publishedAt']) {
		assert.ok(k in status, 'degraded snapshot keeps the ready-schema field: ' + k);
	}
	assert.equal(status.shell, null, 'unknown fields are null, not undefined/missing');
	assert.equal(status.build, require('../package.json').version, 'degraded snapshot tracks package version');
});

test('factory-wallpaper migration: only the exact legacy asset is replaced, user state is never touched', () => {
	// The v9.13.0–v9.23.0 factory photo is replaced by an original abstract image
	// (brand + licensing). The positive path (real legacy bytes → swapped) is
	// verified out-of-band against the actual asset; this test guards the
	// FALSE-POSITIVE side, which is what could destroy user data: a wrong-length
	// string, a same-length different-content smuggle, and a same-byte-length
	// zero payload must all survive untouched, and a clean boot must not throw.
	const legacyPrefix = 'data:image/jpeg;base64,';
	const legacyDataUrlLength = 115863;
	const legacyByteLength = 86879;
	const b64ForBytes = (n) => Buffer.alloc(n).toString('base64'); // zero payload, exact byte length
	const legacy2Prefix = "data:image/jpeg;base64,";
	const legacy2DataUrlLength = 9619; // v9.24.0-v9.27.0 glow raster, 7197 bytes
	const legacy2ByteLength = 7197;

	const cases = {
		'short custom photo': legacyPrefix + b64ForBytes(1000),
		'same length, different content': legacyPrefix + 'A'.repeat(legacyDataUrlLength - legacyPrefix.length),
		'same byte length, zero payload': legacyPrefix + b64ForBytes(legacyByteLength),
		'entry 2: same length, different content': legacy2Prefix + 'B'.repeat(legacy2DataUrlLength - legacy2Prefix.length),
		'entry 2: same byte length, zero payload': legacy2Prefix + b64ForBytes(legacy2ByteLength)
	};
	assert.equal(legacyPrefix.length + (legacyDataUrlLength - legacyPrefix.length), legacyDataUrlLength, 'smuggle case has the exact legacy string length');
	assert.equal(Buffer.from(cases['same byte length, zero payload'].slice(legacyPrefix.length), 'base64').length, legacyByteLength, 'zero-payload case has the exact legacy byte length');
	assert.equal(cases['entry 2: same length, different content'].length, legacy2DataUrlLength, 'entry-2 smuggle case has the exact stored length');
	assert.equal(Buffer.from(cases['entry 2: same byte length, zero payload'].slice(legacy2Prefix.length), 'base64').length, legacy2ByteLength, 'entry-2 zero-payload case has the exact byte length');

	for (const [name, value] of Object.entries(cases)) {
		const h = buildSandbox({ seed: { 'dsh-dream-skin:wallpaper': value } });
		const e = h.factory(makeRequire(makeRuntime().RT));
		assert.doesNotThrow(() => e.apply(makeApplyContext(h)), name + ': apply must not throw');
		assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), value, name + ': stored value must survive the migration check');
	}

	// The shipped factory wallpaper itself must also be stable across boots
	// (idempotence anchor for the day this asset is next replaced).
	const current = CODE.match(/\[WALLPAPER_KEY\]: "(data:[^"]+)"/)[1];
	const h2 = buildSandbox({ seed: { 'dsh-dream-skin:wallpaper': current } });
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e2.apply(makeApplyContext(h2)));
	assert.equal(h2.localStorage.getItem('dsh-dream-skin:wallpaper'), current, 'current factory wallpaper is not migrated away');
});

test('gradient wallpaper: resource-fetching values are refused at write and ignored at render', () => {
	// Gradient values reach `el.style.backgroundImage` (CSSOM write, cannot escape
	// via ; or }), but valid CSS image functions like url()/image-set() would make
	// the page silently fetch an attacker-chosen endpoint. Host state and share
	// links can supply this value, so the same write-gate + render-guard pattern
	// as the URL kind applies.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	// Smuggled resource fetches are refused and nothing is written.
	adv.setGradient('linear-gradient(red, blue), url("http://evil.invalid/ping")');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), null, 'url() smuggle must not write kind');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient'), null, 'url() smuggle must not be persisted');

	adv.setGradient('image-set("http://evil.invalid/a.png" 1x)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient'), null, 'bare image-set must be refused');

	adv.setGradient('#f0f0f0');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient'), null, 'bare color is not a gradient');

	// Single-layer and multi-layer (skin-glow style) gradients persist normally.
	adv.setGradient('linear-gradient(135deg, #000 0%, #fff 100%)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'gradient');
	const glow = 'radial-gradient(1100px 620px at 82% -8%, rgba(94, 106, 210, 0.35), transparent 60%), linear-gradient(165deg, #121216 0%, #0d0d11 55%, #101016 100%)';
	adv.setGradient(glow);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient'), glow, 'multi-layer glow gradient accepted');

	// A value that slipped into storage without validation (old versions or a
	// tampered state file) must be ignored at render time, never applied —
	// asserted positively (9.26.1 B-05): NO element created during apply may
	// carry the smuggled endpoint in any style property.
	const created = [];
	const doc = {
		body: makeEl(), createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl()
	};
	const h2 = buildSandbox({
		document: doc,
		seed: { 'dsh-dream-skin:wallpaper-kind': 'gradient', 'dsh-dream-skin:wallpaper-gradient': 'radial-gradient(circle, red, blue), url("http://evil.invalid/ping")' }
	});
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e2.apply(makeApplyContext(h2)), 'stored unsafe gradient must not break apply()');
	const leaks = created.filter((el) => Object.values(el.style).some((v) => typeof v === 'string' && v.includes('evil.invalid')));
	assert.equal(leaks.length, 0, 'render gate: the unsafe gradient must never reach any element style');
});

test('issue #45: scheduled URL-wallpaper refresh is due-based, keeps the stored URL clean and never grows history', () => {
	// Blue-team R5/R6 follow-up. The scheduler is armed from apply() (not from the
	// settings row), due-ness comes from the persisted lastFiredAt (so restarting
	// DSH cannot reset the phase), the stored wallpaper URL stays the user's clean
	// URL (cache-busting is render-only), and history is never touched.
	let intervalCb = null;
	const h = buildSandbox({
		window: {
			setInterval: (cb) => { intervalCb = cb; return 123; },
			clearInterval: () => { intervalCb = null; }
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	// The scheduler is armed by apply() itself, independently of the settings row.
	assert.ok(intervalCb !== null, 'refresh scheduler armed from apply()');

	// Default state: refresh off.
	assert.equal(JSON.parse(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh') || '{"on":0}').on, 0, 'refresh default off');

	// Set a URL wallpaper, then enable refresh at 24h.
	adv.setUrl('https://uapis.cn/api/v1/image/bing-daily');
	adv.setRefresh(true, 24);
	const cfg = JSON.parse(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh'));
	assert.equal(cfg.on, 1, 'refresh enabled persisted');
	assert.equal(cfg.hours, 24, 'refresh hours persisted');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://uapis.cn/api/v1/image/bing-daily', 'stored URL stays clean');

	// Due-ness is time-based (R5). The plugin caches storage reads and runs its
	// boot catch-up during apply(), so each case uses a FRESH sandbox seeded with a
	// given lastFiredAt and we compare the stamp BEFORE vs AFTER apply(): a due
	// schedule refreshes during boot, an up-to-date one does not.
	const bootFrom = (lastFiredAt, label) => {
		let cb = null;
		const hs = buildSandbox({
			seed: {
				'dsh-dream-skin:wallpaper-kind': 'url',
				'dsh-dream-skin:wallpaper-url': 'https://uapis.cn/api/v1/image/bing-daily',
				'dsh-dream-skin:wallpaper-follows-skin': '0',
				'dsh-dream-skin:wallpaper-refresh': JSON.stringify({ on: 1, hours: 24, lastFiredAt })
			},
			window: {
				setInterval: (fn) => { cb = fn; return 7; },
				clearInterval: () => { cb = null; }
			}
		});
		const es = hs.factory(makeRequire(makeRuntime().RT));
		es.apply(makeApplyContext(hs, { captureActions: true }));
		const after = JSON.parse(hs.localStorage.getItem('dsh-dream-skin:wallpaper-refresh')).lastFiredAt;
		return {
			label,
			fired: after !== lastFiredAt,
			after,
			storedUrl: hs.localStorage.getItem('dsh-dream-skin:wallpaper-url'),
			history: JSON.parse(hs.localStorage.getItem('dsh-dream-skin:wallpaper-history') || '[]').length,
			tick: cb
		};
	};

	// Freshly refreshed (1 minute ago) with a 24 h interval: NOT due at boot.
	assert.equal(bootFrom(Date.now() - 60 * 1000, 'fresh').fired, false, 'not due one minute after a refresh');

	// Last refreshed 25 h ago: due — boot catch-up refreshes it (this is the case
	// that used to reset the phase on every DSH restart).
	const due = bootFrom(Date.now() - 25 * 60 * 60 * 1000, 'overdue');
	assert.equal(due.fired, true, 'due again after the interval elapsed');
	assert.equal(due.storedUrl, 'https://uapis.cn/api/v1/image/bing-daily', 'no ?t= pollution in the stored URL');
	assert.equal(due.history, 0, 'auto-refresh must not grow wallpaper history');

	// Never refreshed (lastFiredAt=0): due immediately at boot.
	assert.equal(bootFrom(0, 'never').fired, true, 'a never-fired schedule is due immediately at boot');

	// The scheduler arms a wake-up tick + visibility catch-up in every case.
	assert.equal(typeof due.tick, 'function', 'scheduler tick armed after boot');

	// Disabling refresh persists off.
	adv.setRefresh(false, 24);
	const disabled = JSON.parse(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh'));
	assert.equal(disabled.on, 0, 'refresh disabled persisted');
});

test('blue-team R13: pressing apply with an empty URL input must not wipe an existing URL wallpaper', () => {
	// The URL box is uncontrolled (defaultValue) and its local state starts empty,
	// so a stray "Apply" click used to send "" -> trimmed=null -> the current URL
	// wallpaper was cleared. It must now be a no-op, while a real clear still works
	// through the dedicated button.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	e.apply(ctx);
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	adv.setUrl('https://example.com/w.jpg');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://example.com/w.jpg');

	// Accidental apply with nothing typed: keep the wallpaper.
	adv.setUrl('');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://example.com/w.jpg', 'empty apply kept the wallpaper');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'url', 'kind still url after the stray apply');

	// Explicit clear still clears.
	adv.clearAll();
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), null, 'explicit clear still works');
});

test('third-party T1: the cache-busting stamp lands in the QUERY, never inside a #fragment', () => {
	// A `?t=` appended after `#` is part of the fragment, never sent to the server,
	// so the browser keeps serving the cached image and scheduled refresh silently
	// becomes a no-op for every link carrying a fragment. Assert the stamp sits in
	// the query (before `#`) on the value handed to CSS, and that the persisted URL
	// stays pristine (R6).
	const h = buildSandbox({
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/daily.jpg?v=2#photo',
			'dsh-dream-skin:wallpaper-follows-skin': '0',
			// lastFiredAt in the past => the boot catch-up performs a real refresh.
			'dsh-dream-skin:wallpaper-refresh': JSON.stringify({ on: 1, hours: 24, lastFiredAt: 1 })
		},
		window: { setInterval: () => 9, clearInterval: () => {} }
	});
	// Record every background-image the plugin writes to the wallpaper layer.
	const backgrounds = [];
	const origCreate = h.document.createElement;
	h.document.createElement = () => {
		const el = origCreate();
		Object.defineProperty(el.style, 'backgroundImage', {
			set(v) { backgrounds.push(v); },
			get() { return backgrounds[backgrounds.length - 1] || ''; },
			configurable: true
		});
		return el;
	};
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));

	const stamped = backgrounds.map((v) => (/url\("([^"]+)"\)/.exec(v) || [])[1]).filter(Boolean).find((u) => u.includes('t='));
	assert.ok(stamped, `a stamped URL should have been rendered (saw: ${JSON.stringify(backgrounds)})`);
	const tPos = stamped.indexOf('t=');
	const hashPos = stamped.indexOf('#');
	assert.ok(tPos < hashPos, `cache-buster must precede the fragment (got ${stamped})`);
	assert.ok(/[?&]t=\d+/.test(stamped.slice(0, hashPos)), `stamp must be a query parameter (got ${stamped})`);
	// The fragment is preserved untouched at the end.
	assert.ok(stamped.endsWith('#photo'), `fragment preserved (got ${stamped})`);
	// R6: the STORED url is still the user's clean URL.
	assert.equal(
		h.localStorage.getItem('dsh-dream-skin:wallpaper-url'),
		'https://cdn.example.com/daily.jpg?v=2#photo',
		'fragment-carrying URL is stored verbatim'
	);
});

test('third-party T3: clearing the wallpaper resets the refresh config so a new URL cannot inherit the old phase', () => {
	const h = buildSandbox({
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://a.example.com/old.jpg',
			'dsh-dream-skin:wallpaper-follows-skin': '0',
			// A stamp far in the past: without the T3 fix a newly applied URL would
			// read this, consider itself overdue and refresh immediately.
			'dsh-dream-skin:wallpaper-refresh': JSON.stringify({ on: 1, hours: 24, lastFiredAt: 1 })
		},
		window: { setInterval: () => 9, clearInterval: () => {} }
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	adv.clearAll();
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh'), null, 'clearing drops the stale refresh config');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), null, 'clearing drops the URL');

	// A brand-new schedule therefore starts from a clean slate.
	adv.setUrl('https://b.example.com/new.jpg');
	adv.setRefresh(true, 24);
	const cfg = JSON.parse(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh'));
	assert.equal(cfg.on, 1, 'new schedule enabled');
	// It must NOT carry the deleted wallpaper's ancient phase (1). A first fire for
	// the new URL is legitimate — what matters is that it is a fresh timestamp, not
	// an inherited one that would make the schedule fire at the wrong time.
	assert.notEqual(cfg.lastFiredAt, 1, 'new schedule did not inherit the deleted wallpaper phase');
	assert.ok(cfg.lastFiredAt === 0 || cfg.lastFiredAt > 1e12, `lastFiredAt is either unset or a fresh epoch ms (got ${cfg.lastFiredAt})`);
});

test('third-party T2: a refused refresh toggle must not be persisted', () => {
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	e.apply(ctx);
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	// kind is "image" here: enabling refresh is refused (alert) and must NOT write.
	adv.setRefresh(true, 24);
	const raw = h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh');
	const on = raw === null ? 0 : JSON.parse(raw).on;
	assert.equal(on, 0, 'refused toggle left the stored config disabled');
});

test('blue-team R19: a skin id already taken by another plugin is skipped, not thrown over', () => {
	// ThemeRuntime.register throws on a duplicate id, and this call is NOT covered
	// by the factory-level fallback (that only guards seed resolution). Yielding
	// degrades the worst case to "one skin missing" instead of an escaping throw.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	// Simulate a third-party plugin having registered a colliding id first.
	ctx.theme.getTheme = () => ({ preference: 'system', themes: [{ id: e.SKINS[0].id }], active: { id: 'dark', colorScheme: 'dark', tokens: {} }, revision: 1 });
	const registered = [];
	ctx.theme.register = (def) => { registered.push(def.id); return () => {}; };

	assert.doesNotThrow(() => e.apply(ctx), 'apply() must not throw on an id collision');
	assert.ok(!registered.includes(e.SKINS[0].id), 'the colliding skin is skipped');
	assert.equal(registered.length, e.SKINS.length - 1, 'every other skin still registers');
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
		assert.equal(keys.length, 68, `${lang} has ${keys.length} keys (expected 68)`);
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

test('saved third-party skin survives more than eight successful locale reloads', async () => {
	// Regression for issue #36: changing the locale makes DSH briefly re-adopt
	// the built-in `system` preference. The restore guard is a consecutive-failure
	// budget, so every successful return to the saved skin must reset it. Without
	// that reset the ninth locale change permanently falls back to Default.
	const h = buildSandbox({ seed: { 'dsh-dream-skin:skin': 'mist' } });
	const e = h.factory(makeRequire(makeRuntime().RT));

	const themeHandlers = [];
	let pref = 'system';
	const snapshot = () => ({
		preference: pref,
		active: { id: pref, colorScheme: 'light', tokens: {} },
		themes: [],
		revision: 1
	});
	const publish = () => {
		for (const fn of themeHandlers) fn(snapshot());
	};
	const theme = {
		register() { return () => {}; },
		setTheme(id) {
			if (pref === id) return;
			pref = id;
			publish();
		},
		getTheme() { return snapshot(); },
		overrideTokens() { return () => {}; }
	};
	const ctx = {
		theme,
		slots: {
			inject(n, f) { if (typeof f === 'function') f(); },
			register() { return {}; }
		},
		locale: { register() {}, bind() { return (key) => key; } },
		on(ev, fn) { if (ev === 'theme/change') themeHandlers.push(fn); return () => {}; },
		effect(t) { t(); }
	};
	const tick = () => new Promise((resolve) => setTimeout(resolve, 10));

	e.apply(ctx);
	await tick();
	assert.equal(pref, 'mist', 'saved skin restored at boot');

	for (let round = 1; round <= 12; round += 1) {
		pref = 'system';
		publish();
		await tick();
		assert.equal(pref, 'mist', `saved skin restored after locale reload ${round}`);
	}
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
	await new Promise((resolve) => setTimeout(resolve, 10));
	// Issue #67 gate: boot already baked the SEEDED skin's (rose) popup fills, so
	// the final-state assertion below alone cannot see the deferred re-resolve —
	// it only discriminates on the MID-SWITCH skin, whose palette differs from
	// both the boot bake and the final selection. Without the re-resolve the
	// dialogs would keep rose through the midnight leg of the round-trip.
	assert.match(theme.getTheme().active.tokens['--dsw-alias-bg-layer-2'], /rgba\(22,\s*22,\s*28,\s*0\.5\)/,
		'the deferred wallpaper re-shade re-resolves layer-2 for the mid-switch skin (midnight)');
	// Adjudication 10.5.1 P1 (R4-style): pin BOTH scheme entries of the
	// mid-switch override. The inactive (light) scheme must be painted from the
	// scheme base — removing fillFor's colorScheme gate (kill-mutation E4)
	// leaks midnight's dark hue into the light entry and reddens here.
	const midLayer = (packageLayer && packageLayer.tokens['--dsw-alias-bg-layer-2']) || {};
	assert.equal(midLayer.light, 'rgba(255, 255, 255, 0.5)',
		'the light entry of the mid-switch layer-2 is the scheme base (white), not the dark skin hue');
	assert.equal(midLayer.dark, 'rgba(22, 22, 28, 0.5)',
		'the dark entry of the mid-switch layer-2 keeps midnight\'s own hue at the seeded alpha');
	skin.setSkin('rose');
	await new Promise((resolve) => setTimeout(resolve, 10));
	const tokens = theme.getTheme().active.tokens;
	assert.match(tokens['--dsw-alias-bg-base'], /rgba\(247,\s*240,\s*243,\s*0\.8\)/,
		'rose wallpaper wash survives the round-trip');
	assert.match(tokens['--dsw-specific-menu'], /rgba\(247,\s*240,\s*243,\s*0\.5\)/,
		'popup opacity remains active after the wallpaper re-shade');
	assert.equal(tokens['--dsw-alias-brand-primary'], '#123456',
		'custom accent remains active after the wallpaper re-shade');
	// End state settles back to the seeded skin's own layer-2 hue (issue #67).
	assert.match(tokens['--dsw-alias-bg-layer-2'], /rgba\(255,\s*253,\s*253,\s*0\.5\)/,
		'the deferred wallpaper re-shade re-resolves layer-2 to the settled rose hue');
	// Adjudication 10.5.1 P1: the settled (rose, light-scheme) override keeps
	// rose's own hue in the light entry; the inactive dark entry falls back to
	// the scheme base (21, 21, 23).
	const roseLayer = (packageLayer && packageLayer.tokens['--dsw-alias-bg-layer-2']) || {};
	assert.equal(roseLayer.light, 'rgba(255, 253, 253, 0.5)',
		'the settled rose layer-2 keeps rose\'s own (light) hue in the light entry');
	assert.equal(roseLayer.dark, 'rgba(21, 21, 23, 0.5)',
		'the inactive dark entry of the settled rose layer-2 falls back to the scheme base');
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
		head: { children: [], contains(el) { return false; }, appendChild() {}, append(c) { this.children.push(c); } },
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => [],
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
	// injector must add backdrop-filter only to LEAF cards (warning, popover)
	// and NEVER to large columns/sidebar that could be ancestors of a
	// position:fixed modal. apply() must not throw, and the injected stylesheet
	// must contain the safe leaf selectors and not the unsafe container one.
	let appended = null;
	const headChildren = [];
	const documentMock = {
		body: { contains: () => false },
		head: {
			children: headChildren,
			contains(el) { return headChildren.includes(el); },
			appendChild(el) { headChildren.push(el); appended = el; },
			append(el) { headChildren.push(el); appended = el; }
		},
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		// T9 fixture fidelity: the nav hook's ensureSheet() runs again on every
		// apply (arm → same-copy refresh). An answer of [] misses the sheet the
		// eval-time hook just created, so the refresh appends ANOTHER nav
		// <style> — and `appended` (the last appended node) becomes the nav
		// sheet instead of the material sheet this test inspects. Answer the
		// id lookup truthfully, like a real document would.
		querySelectorAll(sel) {
			if (sel === 'style#dsh-dream-skin-nav-icon') {
				return headChildren.filter((el) => el && el.id === 'dsh-dream-skin-nav-icon' && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
			}
			return [];
		}
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h);
	assert.doesNotThrow(() => e.apply(ctx), 'apply injects liquid-glass CSS without throwing');

	assert.ok(appended && appended.textContent, 'a material <style> node was appended');
	const css = appended.textContent;
	assert.ok(css.includes('backdrop-filter'), 'uses backdrop-filter');
	// The inline-warning card keeps the material blur — it hosts no fixed
	// popover, so backdrop-filter cannot trap anything there.
	assert.ok(css.includes('.bqrRRG_card'), 'inline-warning card is a (safe) blur target');
	// The composer card must NOT be a blur target: it hosts the fixed-positioned
	// stop/send button Tooltips. backdrop-filter (like filter/transform) turns an
	// element into a containing block, so those tooltips anchor to the card
	// instead of the viewport — they spill to the bottom-right corner and shove
	// the composer out of layout. The composer keeps its translucent token fill;
	// only the blur layer is dropped for it.
	assert.ok(!/\.uV2eYG_card[^A-Za-z0-9_-]*\{[^}]*backdrop-filter/.test(css), 'composer card must NOT be a blur target (hosts fixed Tooltips)');
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
	assert.ok(css.includes('.uV2eYG_root,'), 'composer root rule present (legacy hash selector)');
	// Issue #50 regression: on dsh 0.1.5+ the host re-rolled every hash class,
	// so the glass rules matched nothing and the 输入框透明度 slider went dead.
	// Every composer rule must now ALSO match our own DOM-shape attribute.
	assert.ok(css.includes('[data-dsh-dream-skin-composer]'), 'composer rules carry the DOM-shape attribute selector');
	assert.ok(css.includes('.uV2eYG_card::before,'), 'glass ::before rule matches BOTH hash and attribute');
	// Issue #50 round 3: on dsh 0.1.5-rc.2 the chat input is a Lexical
	// contenteditable div, NOT a textarea — the marker anchor must include the
	// stable `data-composer-input` fingerprint or the slider stays dead there.
	const clientSrc = fs.readFileSync(require.resolve('../lib/client.js'), 'utf8');
	assert.ok(clientSrc.includes('[data-composer-input], textarea'), 'composer marker anchors on the data-composer-input fingerprint (Lexical root), not textarea-only');
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
	// Blue-team B2 (round 3): the composer glass recipe must keep its fallbacks —
	// the token fill line first, then the @supports gate that transparents the
	// card body, and the OPAQUE composer-base token so the fill weight is the
	// composer slider's alone (the wallpaper slider must not thin it).
	// Issue #50: selectors now carry BOTH the legacy hash and the DOM-shape
	// attribute (`[data-dsh-dream-skin-composer]`), so assert the hash prefix
	// rather than the old bare `{` form.
	assert.ok(/\.uV2eYG_card[^{]*\{/.test(css) && css.includes('var(--dsw-specific-input-major)'), 'composer card keeps the token-fill fallback line');
	assert.ok(css.includes('@supports') && /@supports[^{]*color-mix[^{]*\{[^}]*\.uV2eYG_card[^}]*background: transparent/.test(css.replace(/\n/g, ' ')), '@supports gate transparents the composer card body');
	assert.ok(css.includes('--dsh-dream-skin-composer-base'), 'composer fill mixes the OPAQUE composer-base token (no alpha compounding)');
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

test('10.5.0: the question / approval / plan card readability fill rides host stable stamps, not a hash', () => {
	// This block CORRECTS a diagnosis written earlier in the same cycle and disproved by
	// the blue-team pass (B2). It claimed DSH had re-rolled the hash and that the cards fell
	// back to an 8%-alpha fill — both halves are false on host 0.2.0-rc.1: `.Mbwy4a_card` is
	// *still* the user-questions option card (dsh-client-ui-user-questions lib/client.js:346),
	// and `--dsw-specific-input-major` is OPAQUE (bluish-00 #fff / bluish-850 #2c2c2e), so no
	// conversation ever bled through it. What the audit actually found, and what this test
	// now pins, is three different things:
	//   1. the fill was reachable ONLY through a hashed class name, which issue #50 forbids:
	//      one host rebuild would drop the readability layer of the panel the user is reading,
	//      silently, while every offline test stayed green because the CSS STRING still
	//      contained the old name;
	//   2. two of the three card components had no override at all. The approval card
	//      (`[data-approval-key] > div`) was never in the selector list, and `.LVzXQa_card` is
	//      PlanReviewPanel's hash (user-questions lib/client.js:214) — not the option card;
	//   3. where the fill did apply, it mixed the washed `--dsw-alias-bg-base`, so the
	//      壁纸不透明度 slider compounded into it (pinned by the next test).
	const created = [];
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => [],
		getElementById: () => null
	};
	const h = buildSandbox({ document: doc });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)), 'apply injects the material sheet');
	const sheet = created.find((el) => el.id === 'dsh-dream-skin:material:liquid-glass');
	assert.ok(sheet, 'the material sheet is injected');
	const css = sheet.textContent;

	// Flat-rule scan, so each assertion binds SELECTOR LIST ↔ DECLARATIONS together. A
	// substring check over the whole sheet cannot tell "the hook is in the fill rule"
	// from "the hook is in some unrelated rule" — which is how the hash-only drift hid.
	const rules = [];
	for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		rules.push({ selectors: m[1].replace(/[ \t]*\/\/[^\n]*/g, ''), body: m[2] });
	}
	const fillRules = rules.filter((r) => r.body.includes('color-mix') && r.body.includes('--dsh-dream-skin-modal-fill'));
	assert.equal(fillRules.length, 1, `exactly one rule owns the popup fill (got ${fillRules.length}; per-family drift starts where two rules claim it)`);
	const fill = fillRules[0];
	// T1 (adversarial review 10.5.0): the three stamp anchors are asserted
	// STRUCTURALLY — the selector list is parsed and RUN against a fixture that
	// mirrors the host's rendered structure (the shape documented above
	// `QUESTION_CARD_SELECTOR` in lib/client.js). String containment was not
	// enough: it also "passes" for `[data-approval-key] > div:nth-child(2)`, a
	// selector that matches nothing the host renders. The two negative controls
	// prove the matcher can say NO — without them this upgrade would just be a
	// fancier rubber stamp.
	const qWrap = cssNode('div', { 'data-question-key': 'k1' }, [cssNode('section', { 'aria-labelledby': 'question-k1-0' })]);
	const qCard = qWrap.children[0];
	const aWrap = cssNode('div', { 'data-approval-key': 'k2' }, [cssNode('div')]);
	const aCard = aWrap.children[0];
	const pWrap = cssNode('div', { 'data-plan-review-key': 'k3' }, [cssNode('section')]);
	const pCard = pWrap.children[0];
	assert.ok(covers(fill.selectors, qCard),
		'the fill MATCHES the user-questions card the host renders (data-question-key wrapper + aria-labelledby^="question-" section)');
	assert.ok(covers(fill.selectors, aCard),
		'the fill MATCHES the approval card (stamp wrapper > its only child div) — it had no override at all before');
	assert.ok(covers(fill.selectors, pCard),
		'the fill MATCHES the plan-review card (stamp wrapper > section) — the third component the user has to read');
	assert.ok(!covers(fill.selectors, cssNode('section', { 'aria-labelledby': 'question-x-0' })),
		'negative control: a labelled section WITHOUT the data-question-key ancestor is NOT covered');
	assert.ok(!covers(fill.selectors, cssNode('div')),
		'negative control: a bare div is NOT covered by any branch of the fill rule');
	assert.ok(fill.selectors.includes('.Mbwy4a_card'),
		'the legacy hash branch is kept so hosts older than the stamps do not lose the fill');
	assert.ok(!fill.selectors.includes('.LVzXQa_card'),
		'no NEW hashed class is taken as an anchor — the plan card rides its host stamp, not PlanReviewPanel\'s hash');
	const decls = fill.body;
	const fallbackAt = decls.indexOf('background: var(--dsh-dream-skin-modal-base, var(--dsw-alias-bg-overlay))');
	const mixAt = decls.indexOf('background: color-mix');
	assert.ok(fallbackAt >= 0, 'the no-color-mix() fallback declaration is present');
	assert.ok(mixAt > fallbackAt, 'color-mix comes AFTER the fallback, so a webview that understands one declaration but not the other still gets a readable card');
	// B5 (numbers fact-checked by the 10.5.0 audit, T4): the fallback must be readable
	// ON ITS OWN. The bare overlay token is driven by OUR OWN applyModalOverlay to
	// rgba(base, popup-slider alpha) — factory seed 0.6, measured live rgba(18,16,26,0.5)
	// at a 50% slider — NOT an opaque value. (The earlier "0.94 at the factory defaults"
	// conflated the JS default used when nothing is stored with the `94%` fallback inside
	// the mix line; neither is this token's actual value.) A near-transparent overlay alone
	// would leave the card unreadable where color-mix is unsupported, so the fix tries the
	// OPAQUE modal base token first.
	assert.ok(/background:\s*var\(--dsh-dream-skin-modal-base,\s*var\(--dsw-alias-bg-overlay\)\)/.test(decls),
		'the fallback prefers the OPAQUE modal base token instead of the near-transparent overlay alone');
	assert.ok(decls.includes('var(--dsh-dream-skin-modal-base, var(--dsw-alias-bg-base))'),
		'the mix draws on the OPAQUE modal base token (the washed --dsw-alias-bg-base would compound alphas)');
	assert.ok(/backdrop-filter:\s*blur\(var\(--dsh-dream-skin-glass-blur/.test(decls),
		'the cards keep the shared single frost knob');
	// Reverse guard: the liquid rim must not be painted over the approval card's warn ring.
	const rims = rules.filter((r) => r.selectors.includes('html[data-dsh-material="liquid"]') && r.body.includes('outline:'));
	assert.ok(rims.length >= 1, 'the liquid material still gives its cards a hairline rim');
	const cardRim = rims.find((r) => r.selectors.includes('.Mbwy4a_card'));
	assert.ok(cardRim, 'the question card keeps the rim through the legacy hash');
	assert.ok(cardRim.selectors.includes('[data-question-key]'), 'and through the host stamp');
	assert.ok(cardRim.selectors.includes('[data-plan-review-key] > section'),
		'the plan card keeps the rim too (host CSS gives it border: 0, so the hairline costs the host nothing)');
	assert.ok(!cardRim.selectors.includes('[data-approval-key]'),
		'the approval card is excluded: its own warn border is a semantic affordance, not decoration');
});

test('10.5.0: the card fill mixes an alpha-free base so 壁纸不透明度 cannot thin it', () => {
	// Blue-team B1 was applied to the composer in 9.x and the same compounding was left
	// in the popup path: `--dsw-alias-bg-base` is published as rgba(base, canvasAlpha),
	// so `color-mix(in srgb, that token 60%, transparent)` yields 0.6 × canvasAlpha —
	// dragging the wallpaper slider silently thinned the option card. The fix publishes
	// the same colour WITHOUT alpha under its own token name.
	const h = buildSandbox({
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'gradient',
			'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #222 0%, #444 100%)',
			'dsh-dream-skin:wallpaper-opacity': '0.8',
			'dsh-dream-skin:wallpaper-follows-skin': '0'
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	const overrides = new Map();
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() {
			return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#0b0b0e' } }, themes: [], revision: 1 };
		},
		overrideTokens(source, tokens) { overrides.set(source, tokens); return () => {}; }
	};
	const baseCtx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply({ ...baseCtx, theme }));
	const wash = overrides.get('dsh-dream-skin:appearance');
	assert.ok(wash, 'the wallpaper wash published its token layer');
	const washDark = wash['--dsw-alias-bg-base'];
	assert.ok(washDark, 'the wallpaper layer publishes the canvas (bg-base) token');
	assert.match(washDark.dark, /rgba\(/, 'the canvas token really does carry the wash alpha (that is why mixing it compounds)');
	const modalBase = wash['--dsh-dream-skin-modal-base'];
	assert.ok(modalBase, 'the wallpaper layer also publishes an OPAQUE modal base for the popups');
	assert.equal(modalBase.dark, '#0b0b0e',
		'the modal base is the ACTIVE SKIN HEX, byte for byte, with no alpha channel');
});

test('10.5.0: the shipped popup weight is the slider value, not the CSS 94% fallback', () => {
	// The 94% inside the rule is only what a webview uses when NOBODY publishes the
	// variable. A fresh profile gets the factory weight and the two numbers differ —
	// pinning them apart is what keeps docs and reviews from quoting "94%" as the
	// default (PR #64 did).
	const vars = new Map();
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: {
			style: { setProperty: (name, value) => { vars.set(name, value); } },
			setAttribute() {},
			removeAttribute() {}
		},
		createElement: () => makeEl(),
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const h = buildSandbox({ document: doc });
	h.localStorage.removeItem('dsh-dream-skin:factory-applied'); // true first launch
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h, { captureActions: true })));
	const weight = vars.get('--dsh-dream-skin-modal-fill');
	const stored = h.localStorage.getItem('dsh-dream-skin:modal-opacity');
	assert.ok(weight, 'the popup fill weight is published on :root at boot');
	assert.ok(stored, 'and the slider value it derives from is persisted');
	assert.equal(weight, Math.round(Number(stored) * 100) + '%',
		'the published weight is the stored slider value x 100 (derived, never a copied literal)');
	assert.notEqual(weight, '94%', 'a fresh install does NOT sit on the CSS fallback — the shipped look is thinner than 94%');
	// Second time point (test-admission gate 1): moving 弹窗不透明度 re-publishes the SAME
	// variable the card rule consumes, so the weight is live rather than a constant.
	const glassBags = h.actionBags['dream-skin-glass'];
	assert.ok(glassBags && typeof glassBags.setModalOpacity === 'function', 'the glass row exposes setModalOpacity');
	glassBags.setModalOpacity(25);
	assert.equal(vars.get('--dsh-dream-skin-modal-fill'), '25%', 'the slider owns the fill weight');
});

test('10.5.0: the material sheet is adopted by document id — a re-evaluated bundle cannot double-inject it', () => {
	// Measured on a long-lived page: two `style#dsh-dream-skin-nav-icon` nodes, which
	// proved the bundle gets evaluated more than once per document. The material sheet
	// had the same hole — its cache handle is MODULE scope, so a second copy appended a
	// full second copy of every glass rule.
	const created = [];
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		// T9 fixture fidelity: same class of defect as the leaf-card test — the
		// nav refresh path re-adopts by id on every apply, and an unfaithful []
		// answer appends a fresh nav sheet AFTER the material re-adoption MOVE,
		// stealing the head-tail assertions at the end of this test.
		querySelectorAll(sel) {
			if (sel === 'style#dsh-dream-skin-nav-icon') {
				return doc.head.children.concat(doc.body.children).filter((el) => el && el.id === 'dsh-dream-skin-nav-icon' && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
			}
			return [];
		},
		// Real id lookup: the sheets live in <head>.
		getElementById: (id) => doc.head.children.concat(doc.body.children).find((el) => el && el.id === id) || null
	};
	const h = buildSandbox({ document: doc });
	const sheetsOf = (id) => doc.head.children.concat(doc.body.children).filter((el) => el && el.id === id);
	const MAT = 'dsh-dream-skin:material:liquid-glass';
	const e1 = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e1.apply(makeApplyContext(h)), 'first mount');
	assert.equal(sheetsOf(MAT).length, 1, 'one material sheet after the first mount');
	assert.ok(sheetsOf(MAT)[0].textContent.length > 1000, 'the first sheet carries the rule set');
	// A host CSS chunk lands AFTER our sheet — the state a long-lived page actually reaches.
	const lateHostStyle = makeEl();
	lateHostStyle.id = 'host-late-chunk';
	doc.head.appendChild(lateHostStyle);
	assert.equal(doc.head.children[doc.head.children.length - 1], lateHostStyle, 'the host chunk is the last node in <head> before the remount');

	// Second evaluation of the SAME bundle in the SAME document: fresh module scope, so
	// the module-level cache is empty again — the state the live measurement found.
	const factory2 = h.rerun();
	const e2 = factory2(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e2.apply(makeApplyContext(h)), 'second mount');
	assert.equal(sheetsOf(MAT).length, 1, 'the second mount adopts the existing sheet instead of appending a twin');
	// B9: adoption must restore "ours is LAST in <head>" *at the moment of the remount*. Appending
	// a fresh copy (the pre-10.5.0 behaviour) kept that by accident; leaving the adopted node where
	// it sat would hand a late host chunk the tie-break until the next re-apply. Transient by
	// construction — measured live our sheet ends up at head index 131 of 217 with 85 later nodes,
	// and these three assertions only pin the MOVE, not permanent supremacy (see docs L3 note).
	assert.equal(doc.head.children[doc.head.children.length - 1], sheetsOf(MAT)[0],
		'the remount moves our sheet back to the END of <head>, behind the late host chunk');
	assert.equal(doc.head.children.filter((el) => el === sheetsOf(MAT)[0]).length, 1,
		'the move is a MOVE, not a duplicate insert');
	assert.equal(created.filter((el) => el.id === MAT).length, 1,
		'createElement was called for the sheet exactly once across both mounts');
	assert.ok(sheetsOf(MAT)[0].textContent.length > 1000, 'the adopted sheet stays fully texted (adoption is not a no-op)');
});

test('10.5.0: the settings-nav icon hook is idempotent and self-reports through the status snapshot', async () => {
	// The same audit found the icon IIFE — which sits OUTSIDE the loader's downgrade
	// path — installing a second sheet AND a second body observer on a re-evaluated
	// bundle, while publishing nothing: "0 marked buttons" was uninterpretable, because
	// the settings dialog being CLOSED and the hook being DEAD looked identical.
	// The lock is the published `armed` flag, NOT a property of the sheet node: the node
	// can be replaced by anything, and a flag that dies with it either lets a second
	// observer in or claims ownership without ever arming (B1/B3, pinned below).
	const created = [];
	const navObservers = { count: 0, instances: [] };
	const marked = [];
	const foreignMarked = [];
	const themeShopMarked = [];
	// Labels measured live on host 0.2.0-rc.1: OUR row is the section WE register, with
	// `label: "Theme / 外观"` — a string this repo declares. The bare 「皮肤」 row
	// belongs to a THIRD-PARTY plugin (@linxin666/dsh-client-ui-skin-center), and marking
	// it was the L1 walk-on: our palette over somebody else's icon. `Theme Shop` is the
	// T7 walk-on: a plain substring test for "Theme" painted it even though this repo
	// declares no such row — the full-label containment must refuse it.
	const buttons = [
		{ textContent: '常规', setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; } },
		{
			textContent: 'Theme / 外观',
			setAttribute(k, v) { this[k] = v; if (k === 'data-dsh-dream-skin-nav') marked.push(this); },
			removeAttribute(k) { if (k === 'data-dsh-dream-skin-nav') { const i = marked.indexOf(this); if (i >= 0) marked.splice(i, 1); } delete this[k]; }
		},
		{
			textContent: '皮肤',
			setAttribute(k, v) { this[k] = v; if (k === 'data-dsh-dream-skin-nav') foreignMarked.push(this); },
			removeAttribute(k) { if (k === 'data-dsh-dream-skin-nav') { const i = foreignMarked.indexOf(this); if (i >= 0) foreignMarked.splice(i, 1); } delete this[k]; }
		},
		{
			textContent: 'Theme Shop',
			setAttribute(k, v) { this[k] = v; if (k === 'data-dsh-dream-skin-nav') themeShopMarked.push(this); },
			removeAttribute(k) { if (k === 'data-dsh-dream-skin-nav') { const i = themeShopMarked.indexOf(this); if (i >= 0) themeShopMarked.splice(i, 1); } delete this[k]; }
		}
	];
	const SHEET = 'dsh-dream-skin-nav-icon';
	// A foreign node wearing our sheet id. `style#id` must not match a <div>, so the hook
	// creates its own element instead of treating somebody else's node as its sheet.
	const hostile = { id: SHEET, tagName: 'DIV', textContent: 'KEEP ME' };
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: (tag) => { const el = makeEl(); el.tagName = String(tag || '').toUpperCase(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: (sel) => {
			if (sel === '[role="dialog"] nav button') return buttons;
			if (sel === '[role="dialog"]') return [{ role: 'dialog' }];
			// Faithful `style#id`: only STYLE elements with that id match, and the lookup
			// sees the whole document, not just the nodes this mock happens to hold.
			if (sel === 'style#' + SHEET) return doc.head.children.concat(doc.body.children, [hostile])
				.filter((el) => el && el.id === SHEET && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
			// The bare `#id` form is answered too (a real browser would match the div here), so
			// a mutation that drops the STYLE qualifier cannot hide behind an empty mock response.
			if (sel === '#' + SHEET) return doc.head.children.concat(doc.body.children, [hostile]).filter((el) => el && el.id === SHEET);
			return [];
		},
		getElementById: (id) => doc.head.children.concat(doc.body.children).find((el) => el && el.id === id) || null,
		addEventListener() {}
	};
	doc.body.children.push(hostile);
	const liveSheets = () => doc.head.children.concat(doc.body.children)
		.filter((el) => el && el.id === SHEET && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
	class CountingMutationObserver {
		constructor(fn) { this.fn = fn; navObservers.instances.push(this); }
		observe(_target, opts) { if (opts && opts.characterData === true) navObservers.count++; }
		disconnect() {}
	}
	const h = buildSandbox({ document: doc, MutationObserver: CountingMutationObserver });
	assert.equal(hostile.textContent, 'KEEP ME', 'the foreign id-holder is not adopted as our sheet');
	assert.equal(liveSheets().length, 1, 'one icon sheet on the first evaluation');
	assert.equal(navObservers.count, 1, 'one body observer on the first evaluation');
	assert.equal(marked.length, 1, 'exactly one nav row is marked');
	assert.equal(marked[0] && marked[0].textContent, 'Theme / 外观', 'and the row we marked is the section WE registered');
	assert.deepEqual(foreignMarked.map((b) => b.textContent), [], 'the third-party 皮肤 row is not marked');
	assert.deepEqual(themeShopMarked.map((b) => b.textContent), [], 'T7: a `Theme Shop` row sharing a word with our label is not marked either');
	const nav = h.window.__DSH_DREAM_SKIN_NAV__;
	assert.ok(nav, 'the hook publishes its own hit counts');
	assert.deepEqual({ dialogs: nav.dialogs, buttons: nav.buttons, marked: nav.marked, sheets: nav.sheets, armed: nav.armed },
		{ dialogs: 1, buttons: 4, marked: 1, sheets: 1, armed: true },
		'the self-check tells "panel closed" (dialogs 0) apart from "hook dead" (no object / armed false)');

	// Re-evaluate in the same document: adopt the sheet, do NOT install a second observer.
	const factory2 = h.rerun();
	assert.equal(typeof factory2, 'function', 'the rerun hands back the second module instance');
	assert.equal(liveSheets().length, 1,
		'the second evaluation adopts the existing sheet instead of appending a twin');
	assert.equal(navObservers.count, 1, 'and leaves the bookkeeping to the copy that owns the hook');

	// B3: the lock may not live on the sheet node. Drop our sheet, then evaluate a THIRD
	// copy. It must re-inject the sheet it needs (a node-scoped flag would have been
	// cleared along with the node) and still refuse to arm a second observer.
	liveSheets()[0].remove();
	assert.equal(liveSheets().length, 0, 'the sheet is really gone from the DOM');
	h.rerun();
	assert.equal(liveSheets().length, 1, 'the third copy re-injects the sheet it needs');
	assert.equal(navObservers.instances.length, 1, 'yet exactly one observer exists: the lock is the published flag, not the node');

	// The owning copy is the one that reports, so its next scan must describe the CURRENT
	// DOM — one sheet, not the twin a node-scoped lock would have allowed.
	navObservers.instances[0].fn();
	await sleep(200);
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.sheets, 1, 'the owner re-counts one sheet after its node was replaced and re-injected');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.armed, true, 'and it still reports itself as armed');

	// T6 (adversarial review 10.5.0): `sheets` must be a LIVE count, not a cached
	// or literal value. A twin node (host-side clone, or verbatim pre-10.5.0
	// residue) has to show up in the report — otherwise the one metric that
	// exposes duplicate injection cannot see duplicates — and the count must
	// follow the DOM back down when the twin leaves.
	const twin = makeEl();
	twin.id = SHEET;
	twin.tagName = 'STYLE';
	twin.textContent = '/* twin */';
	doc.head.appendChild(twin);
	navObservers.instances[0].fn();
	await sleep(200);
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.sheets, 2, 'a second sheet node is counted — the report is a live count');
	twin.remove();
	navObservers.instances[0].fn();
	await sleep(200);
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.sheets, 1, 'and the count follows the DOM back down');

	// The status snapshot carries the hook state, so tooling reads one object.
	const e = factory2(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.ok(status.navIcon, 'the ready snapshot exposes the nav hook state (same field set as the degraded one)');
	assert.equal(status.navIcon.marked, 1, 'and it is the live count, not a stale literal');
	assert.equal(status.navIcon.armed, true, 'the ready snapshot carries the armed flag, so a script can tell dead from idle');
});

test('10.5.0: the nav hook stays live when the window gets no animation frames', async () => {
	// The icon scan is coalesced into one wake per batch, and a real browser services
	// requestAnimationFrame by pausing it outright for a hidden or fully occluded
	// window. If the wake ONLY ever asks for a frame, both the icon marking and the
	// self-report freeze at whatever the last painted frame saw (measured live: a
	// 9-minute-old checkedAt on an idle background page), and tooling reading
	// __DSH_DREAM_SKIN_NAV__ cannot tell idle from dead. The timer below is what
	// keeps the hook honest; this case pins it by never firing the frame.
	const buttons = [{
		textContent: 'Theme / 外观',
		setAttribute(k, v) { this[k] = v; },
		removeAttribute(k) { delete this[k]; }
	}];
	const created = [];
	const observers = [];
	const SHEET = 'dsh-dream-skin-nav-icon';
	// T8 (adversarial review 10.5.0): this fixture used to answer a bare
	// `#dsh-dream-skin-nav-icon` lookup the code never asks for — so the REAL
	// `style#…` query missed every time and each ensureSheet call stacked a fresh
	// sheet while nothing asserted adoption. The preset sheet below, the faithful
	// id answer, and the adoption assertions after the build close that hole.
	const preset = makeEl();
	preset.id = SHEET;
	preset.tagName = 'STYLE';
	preset.textContent = '/* preset */';
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: (tag) => { const el = makeEl(); el.tagName = String(tag || '').toUpperCase(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: (sel) => {
			if (sel === '[role="dialog"] nav button') return buttons;
			if (sel === '[role="dialog"]') return [{ role: 'dialog' }];
			if (sel === 'style#' + SHEET) return doc.head.children.concat(doc.body.children)
				.filter((el) => el && el.id === SHEET && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
			return [];
		},
		getElementById: (id) => doc.head.children.concat(doc.body.children).find((el) => el && el.id === id) || null
	};
	doc.head.appendChild(preset);
	class FramelessObserver {
		constructor(fn) { this.fn = fn; observers.push(this); }
		observe() {}
		disconnect() {}
	}
	const frames = [];
	const h = buildSandbox({
		document: doc,
		MutationObserver: FramelessObserver,
		// A frame is handed out only if the test asks for one — the page stays backgrounded.
		requestAnimationFrame: (cb) => { frames.push(cb); return frames.length; }
	});
	assert.equal(observers.length, 1, 'the hook installed its body observer');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.marked, 1, 'the initial synchronous pass marked the nav button');
	assert.equal(created.filter((el) => el.id === SHEET).length, 0, 'the run ADOPTS the existing sheet — createElement is never called for it');
	assert.ok(preset.textContent.includes('data-dsh-dream-skin-nav') && preset.textContent.includes('::before'),
		'adoption is not a no-op: the adopted sheet carries the marker CSS');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.sheets, 1, 'and the self-report counts the one real sheet');

	// A second "Theme / 外观" button appears while no frame will ever arrive.
	buttons.push({
		textContent: 'Theme / 外观',
		setAttribute(k, v) { this[k] = v; },
		removeAttribute(k) { delete this[k]; }
	});
	observers[0].fn();
	await sleep(200);
	assert.equal(frames.length, 1, 'one wake asks for exactly one frame, not one per mutation record');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.marked, 2, 'the timer fallback still ran the scan, so a background window still marks and still reports');

	// And the flag must not let the frame that finally arrives double-run the batch.
	const before = h.window.__DSH_DREAM_SKIN_NAV__.checkedAt;
	frames[0]();
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.checkedAt, before, 'the stale frame is a no-op once the timer already ran this batch');
});

test('10.5.0: a nav hook that ran before <body> existed arms itself on DOMContentLoaded', () => {
	// B1: with the lock on the sheet node, a copy that evaluated while document.body was
	// still null claimed ownership, installed no observer — and every later copy then
	// skipped. The gear icon survived the whole session while the self-report read exactly
	// like a closed panel. Now `armed` is set only once an observer really watches the body,
	// and a body-less pass hangs a one-shot DOMContentLoaded recovery instead.
	const created = [];
	const observers = [];
	const listeners = [];
	const buttons = [
		{ textContent: 'Theme / 外观', setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; } }
	];
	const SHEET = 'dsh-dream-skin-nav-icon';
	const doc = {
		body: null, // the bundle was evaluated before the parser reached <body>
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: (tag) => { const el = makeEl(); el.tagName = String(tag || '').toUpperCase(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: (sel) => {
			if (sel === '[role="dialog"] nav button') return doc.body ? buttons : [];
			if (sel === '[role="dialog"]') return doc.body ? [{ role: 'dialog' }] : [];
			if (sel === 'style#' + SHEET) return doc.head.children.filter((el) => el && el.id === SHEET);
			return [];
		},
		getElementById: (id) => doc.head.children.find((el) => el && el.id === id) || null,
		addEventListener(type, fn, opts) { listeners.push({ type, fn, opts }); }
	};
	class Observer { constructor(fn) { this.fn = fn; observers.push(this); } observe() {} disconnect() {} }
	const h = buildSandbox({ document: doc, MutationObserver: Observer });
	const nav = h.window.__DSH_DREAM_SKIN_NAV__;
	assert.ok(nav, 'a body-less pass still publishes a report instead of throwing (this IIFE has no downgrade path)');
	assert.equal(nav.armed, false, '"nothing is watching" is distinguishable from "the settings panel is closed"');
	assert.equal(observers.length, 0, 'and it does not claim to observe a body it never had');
	assert.equal(listeners.length, 1, 'it hangs exactly one recovery listener');
	assert.equal(listeners[0].type, 'DOMContentLoaded');
	assert.equal(listeners[0].opts && listeners[0].opts.once, true, 'the recovery is one-shot');

	// The parser reaches <body> and the host fires the event.
	doc.body = makeEl();
	listeners[0].fn();
	assert.equal(observers.length, 1, 'the deferred arm installs the body observer');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.armed, true, 'only now does the report say the hook is live');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.marked, 1, 'the pending "Theme / 外观" button gets marked on the arm pass');

	// A second copy on the now-armed page must not double-observe.
	h.rerun();
	assert.equal(observers.length, 1, 'an armed page gets one observer, whichever copy evaluates');
	assert.equal(created.filter((el) => el.id === SHEET).length, 1, 'and one sheet');
});

// Shared fixture for the T9 lifecycle trio below: a minimal wired page (one
// settings row, a faithful `style#id` lookup) plus a MutationObserver stand-in
// that records observe-target/options and disconnects. The nav observer is
// identified by `characterData: true` in its options — the ONLY observer in the
// codebase that asks for characterData (the composer marker watches
// documentElement, the drift probe watches body without characterData).
function makeNavHookDoc(SHEET) {
	const marked = [];
	const buttons = [{
		textContent: 'Theme / 外观',
		// Presence tracker, faithful to setAttribute semantics: setting the same
		// attribute on an already-marked row does not duplicate anything. (An
		// unconditional push here would grow with every sync pass and make
		// "still marked" unassertable.)
		setAttribute(k, v) { this[k] = v; if (k === 'data-dsh-dream-skin-nav' && marked.indexOf(this) === -1) marked.push(this); },
		removeAttribute(k) { if (k === 'data-dsh-dream-skin-nav') { const i = marked.indexOf(this); if (i >= 0) marked.splice(i, 1); } delete this[k]; }
	}];
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: (tag) => { const el = makeEl(); el.tagName = String(tag || '').toUpperCase(); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: (sel) => {
			if (sel === '[role="dialog"] nav button') return buttons;
			if (sel === '[role="dialog"]') return [{ role: 'dialog' }];
			if (sel === 'style#' + SHEET) return doc.head.children.concat(doc.body.children)
				.filter((el) => el && el.id === SHEET && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
			return [];
		},
		getElementById: (id) => doc.head.children.concat(doc.body.children).find((el) => el && el.id === id) || null,
		addEventListener() {}
	};
	return { doc, marked, buttons };
}

test('10.5.0 (T9a): unloading the fiber disposes the nav hook — observer disconnected, marks lifted, sheet removed, armed:false', async () => {
	// T9 (adversarial review 10.5.0): the nav IIFE is page-scope and outlives the
	// fiber; before this fix a plugin unload/reload left a live body observer, a
	// marked row and the sheet behind — residue the "unload leaves nothing
	// behind" tenet forbids. The fiber now hands its generation token to the
	// hook's published (non-enumerable) dispose handle on teardown.
	const SHEET = 'dsh-dream-skin-nav-icon';
	const observers = [];
	class RecordingMO {
		constructor(fn) { this.fn = fn; this.disconnected = false; observers.push(this); }
		observe(target, opts) { this.target = target; this.opts = opts; }
		disconnect() { this.disconnected = true; }
	}
	const { doc, marked } = makeNavHookDoc(SHEET);
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: RecordingMO, console: { warn() {}, log() {}, error() {} } });
	const navMO = () => observers.find((o) => o.opts && o.opts.characterData === true);
	const liveSheets = () => doc.head.children.concat(doc.body.children)
		.filter((el) => el && el.id === SHEET && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
	assert.ok(navMO(), 'the hook installed its body observer at evaluation');
	assert.equal(navMO().target, doc.body, 'watching document.body — a host head rebuild cannot blind it');
	assert.equal(marked.length, 1, 'the row is marked before unload');
	assert.equal(liveSheets().length, 1, 'the sheet is in the DOM before unload');

	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.armed, true, 'apply keeps the hook armed (same-generation refresh, not a re-install)');
	assert.equal(observers.filter((o) => o.opts && o.opts.characterData === true).length, 1, 'and does not stack a second body observer');
	assert.equal(marked.length, 1, 'the mark survives the refresh');

	// Unload the fiber exactly like the host does: run the effect disposers.
	for (const d of h.disposers || []) d();
	assert.equal(navMO().disconnected, true, 'unload disconnects the body observer');
	assert.equal(marked.length, 0, 'unload lifts the nav mark');
	assert.equal(liveSheets().length, 0, 'unload removes our sheet node');
	const after = h.window.__DSH_DREAM_SKIN_NAV__;
	assert.equal(after.armed, false, 'and republishes armed:false — tooling reads "hook gone", never a stale live count');
	assert.equal(after.marked, 0, 'counts are zeroed');
	assert.equal(after.sheets, 0, 'the sheet count follows the DOM');

	// M26 witness: a wake QUEUED just before dispose (the 120ms fallback timer of
	// a mutation batch that arrived in the final milliseconds) must not re-mark
	// or re-report for a dead fiber. The live gate in sync() is the only thing
	// standing between an unloaded fiber and a resurrected mark — if it is
	// removed, this late wake walks straight through.
	navMO().fn(); // queue a wake on the (now dead) fiber's observer callback
	await sleep(200); // past the 120ms fallback
	assert.equal(marked.length, 0, 'the queued wake cannot re-mark the row after dispose');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__, after, 'nor republish anything — the snapshot stays frozen at armed:false');
});

test('10.5.0 (T9b): after an unload, a re-apply re-arms the hook and re-creates exactly one sheet', () => {
	// The other half of T9: teardown must not burn the hook for the rest of the
	// page's life. A settings reload / profile switch re-applies the plugin on a
	// page whose nav hook was disposed — the generation-stamped arm() call must
	// re-install the body observer and the sheet WITHOUT stacking a second copy
	// of either, and the disposed observer must stay dead (never resurrected).
	const SHEET = 'dsh-dream-skin-nav-icon';
	const observers = [];
	class RecordingMO {
		constructor(fn) { this.fn = fn; this.disconnected = false; observers.push(this); }
		observe(target, opts) { this.target = target; this.opts = opts; }
		disconnect() { this.disconnected = true; }
	}
	const { doc, marked } = makeNavHookDoc(SHEET);
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: RecordingMO, console: { warn() {}, log() {}, error() {} } });
	const navMOs = () => observers.filter((o) => o.opts && o.opts.characterData === true);
	const liveSheets = () => doc.head.children.concat(doc.body.children)
		.filter((el) => el && el.id === SHEET && String(el.tagName || 'STYLE').toUpperCase() === 'STYLE');
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	for (const d of h.disposers || []) d(); // full unload
	assert.equal(navMOs().length, 1, 'one observer before the unload');
	assert.equal(navMOs()[0].disconnected, true, 'and the unload disconnected it');
	assert.equal(liveSheets().length, 0, 'the unload also removed the sheet');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.armed, false, 'the hook reports itself gone');

	// The host re-mounts the plugin on the same page.
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	assert.equal(navMOs().length, 2, 'the re-arm installed exactly ONE new body observer');
	assert.equal(navMOs()[1].disconnected, false, 'the new observer is live');
	assert.equal(navMOs()[0].disconnected, true, 'the disposed observer stays dead — never resurrected');
	assert.equal(liveSheets().length, 1, 'and exactly ONE sheet exists again (re-created, not stacked)');
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.armed, true, 'the hook is armed again');
	assert.equal(marked.length, 1, 'the row is marked again');
});

test('10.5.0 (T9c): a same-copy re-apply re-stamps the generation — the older apply\'s dispose is a stale no-op', () => {
	// Hot reload, order A: the host re-enters apply() on the SAME copy (each
	// apply mints a fresh generation token), and the FIRST apply's fiber unloads
	// AFTER the second one landed. Its dispose() hands back a token that is no
	// longer current — the gate must refuse it, or the freshest apply would lose
	// its hook to a stale teardown. The stale dispose must not even republish:
	// the snapshot object published by the newer generation stays untouched.
	const SHEET = 'dsh-dream-skin-nav-icon';
	const observers = [];
	class RecordingMO {
		constructor(fn) { this.fn = fn; this.disconnected = false; observers.push(this); }
		observe(target, opts) { this.target = target; this.opts = opts; }
		disconnect() { this.disconnected = true; }
	}
	const { doc, marked } = makeNavHookDoc(SHEET);
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: RecordingMO, console: { warn() {}, log() {}, error() {} } });
	const hud = () => h.window.__DSH_DREAM_SKIN_NAV__;
	const navMO = () => observers.find((o) => o.opts && o.opts.characterData === true);
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctxA = makeApplyContext(h);
	assert.doesNotThrow(() => e.apply(ctxA));
	const afterFirst = (h.disposers || []).length;
	const snapshotAfterFirst = hud();
	assert.equal(snapshotAfterFirst.armed, true, 'the first apply armed the hook');

	// Second apply, same copy: arm() re-stamps the generation on the surviving
	// hook (refresh path — no new observer, no new sheet).
	const ctxB = makeApplyContext(h);
	assert.doesNotThrow(() => e.apply(ctxB));
	assert.equal(observers.filter((o) => o.opts && o.opts.characterData === true).length, 1, 'the re-apply refreshes instead of re-installing');
	const snapshotAfterSecond = hud();
	assert.notEqual(snapshotAfterSecond, snapshotAfterFirst, 'the refresh republished a live snapshot');

	// The FIRST apply's fiber unloads (the stale side). Nothing may change.
	for (const d of (h.disposers || []).slice(0, afterFirst)) d();
	assert.equal(navMO().disconnected, false, 'a stale dispose does NOT tear down the hook the new generation owns');
	assert.equal(marked.length, 1, 'the mark survives a stale dispose');
	assert.equal(hud().armed, true, 'and the snapshot still says armed');
	assert.equal(hud(), snapshotAfterSecond, 'a stale dispose does not even republish — it no-ops at the generation gate');

	// The newest generation's unload is the one that wins.
	for (const d of (h.disposers || []).slice(afterFirst)) d();
	assert.equal(navMO().disconnected, true, "the newest generation's unload tears the hook down");
	assert.equal(hud().armed, false, 'and republishes armed:false');
});

test('10.5.0: a foreign node wearing the material sheet id is neither re-texted nor removed on unload', () => {
	// B10: the material sheet is adopted by document id, so getElementById can hand back
	// something that is not ours — another script keeping a <div> under the same name.
	// Re-texting it would drop the whole glass rule set into somebody else's element, and
	// teardownMaterial() would then REMOVE that element from the page. The guard adopts
	// <style> only and, in that hostile case, injects an UN-NAMED sheet so the id stays theirs.
	const MAT = 'dsh-dream-skin:material:liquid-glass';
	const created = [];
	const hostile = {
		id: MAT, tagName: 'DIV', textContent: 'somebody elses node', children: [], parentElement: null,
		style: {}, dataset: {}, setAttribute() {}, removeAttribute() {},
		appendChild(c) { this.children.push(c); if (c) c.parentElement = this; },
		append(c) { this.appendChild(c); }, remove() { this.removed = true; }
	};
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: (tag) => { const el = makeEl(); el.tagName = String(tag || '').toUpperCase(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => [],
		getElementById: (id) => (id === MAT ? hostile : null)
	};
	doc.head.children.push(hostile);
	const h = buildSandbox({ document: doc });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)), 'apply still injects a material sheet next to a hostile id-holder');
	assert.equal(hostile.textContent, 'somebody elses node', 'the foreign node keeps its own content');
	const ours = created.find((el) => el.tagName === 'STYLE' && String(el.textContent || '').includes('--dsh-dream-skin-modal-fill'));
	assert.ok(ours, 'the rule set landed in a style element we created');
	assert.ok(!ours.id, 'our sheet does NOT claim the id while somebody else holds it (a duplicate id would confuse the next lookup)');
	// Unmount runs teardownMaterial(): the removal must land on OUR node only.
	for (const d of h.disposers || []) d();
	assert.notEqual(hostile.removed, true, 'unload does not remove the foreign id-holder');
	assert.equal(ours.removed, true, 'unload removes the sheet we actually own');
});
test('issue #55: the material sheet un-shadows --dsw-specific-sidebar-fill on the DSH Desktop shell', () => {
	// In the Electron shell the upstream sidebar renders inside the shell's own
	// <aside class="dshDesktopSidebarSurface">, and that element re-declares
	// `--dsw-specific-sidebar-fill` on itself, shadowing every :root/body theme
	// override for the whole sidebar subtree — the 侧边栏透明度 slider had no
	// pixels to move there while the right file panel (outside that aside) kept
	// responding. Upstream source check: in dsh-plugin-desktop@2.0.0 (the only
	// 2.x on npm) lib/client.js:248 is the package's ONLY declaration of that
	// token and it is a plain, non-important class rule. The fix must re-inherit
	// the token for that subtree in a way that outranks it, and must stay inert
	// on plain DSH Web.
	let appended = null;
	const documentMock = {
		body: { contains: () => false, getAttribute: () => null },
		head: {
			children: [],
			contains() { return false; },
			appendChild(el) { appended = el; },
			append() { appended = el; }
		},
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	const css = appended.textContent;

	const rule = css.match(/\.dshDesktopSidebarSurface\s*\{[^}]*\}/);
	assert.ok(rule, 'the shell sidebar surface is targeted by the material sheet');
	assert.ok(/--dsw-specific-sidebar-fill:\s*inherit\s*!important/.test(rule[0]),
		'the token is re-inherited with !important (the shell declares it without)');
	// Guard the intent: this selector must never broaden into DSH's own sidebar
	// surfaces (the fix is scoped to the desktop shell's element only).
	assert.ok(!/\.dshDesktopSidebarSurface\s*,|,\s*\.dshDesktopSidebarSurface/.test(css),
		'the desktop rule is not merged into a selector list with other surfaces');
});

test('issue #55: the sidebar transparency slider is wired end to end', () => {
	// Behaviour gate for the whole issue. Root cause B was that with the sidebar
	// linked to the wallpaper, shadeTokens2() uses the CANVAS alpha and ignores
	// SIDEBAR_OPACITY_KEY, while the slider kept moving and printing a percentage
	// — so it read as broken. This test drives the REAL public action (the same
	// one the Slider calls) and asserts the stored preference AND the token that
	// ships to the DOM.
	const makeCase = ({ wallpaper = true, seed = {} } = {}) => {
		const wallpaperSeed = wallpaper ? {
			'dsh-dream-skin:wallpaper-kind': 'gradient',
			'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #222 0%, #444 100%)',
			'dsh-dream-skin:wallpaper-opacity': '0.5',
			'dsh-dream-skin:wallpaper-follows-skin': '0'
		} : {
			'dsh-dream-skin:wallpaper-kind': 'image',
			'dsh-dream-skin:wallpaper-follows-skin': '0'
		};
		const h = buildSandbox({ seed: { ...wallpaperSeed, ...seed } });
		const e = h.factory(makeRequire(makeRuntime().RT));
		const active = {
			id: 'rose',
			colorScheme: 'light',
			tokens: { '--dsw-alias-bg-base': '#f7f0f3', '--dsw-specific-sidebar-fill': '#f6e9ef' }
		};
		const captured = [];
		const theme = {
			register() { return () => {}; },
			setTheme() {},
			getTheme() { return { preference: 'rose', active, themes: [active], revision: 1 }; },
			overrideTokens(source, tokens) {
				if (source === 'dsh-dream-skin:appearance' && tokens['--dsw-specific-sidebar-fill']) {
					captured.push(tokens['--dsw-specific-sidebar-fill']);
				}
				return () => {};
			}
		};
		const ctx = { ...makeApplyContext(h, { captureActions: true }), theme };
		assert.doesNotThrow(() => e.apply(ctx), 'apply');
		return { captured, h, last: () => captured[captured.length - 1] };
	};

	// 1) Unlinked: the sidebar keeps its OWN token colour at the slider's alpha.
	const unlinked = makeCase({ seed: { 'dsh-dream-skin:sidebar-link': '0', 'dsh-dream-skin:sidebar-opacity': '0.31' } });
	assert.ok(unlinked.captured.length > 0, 'a sidebar fill override was produced');
	assert.equal(unlinked.last().light, 'rgba(246, 233, 239, 0.31)',
		'unlinked sidebar fill = sidebar token colour at the slider alpha (slider is wired)');

	// 2) Dragging the slider through the public action moves the token.
	unlinked.h.actionBags['dream-skin-glass'].setSidebarOpacity(60);
	assert.equal(unlinked.h.localStorage.getItem('dsh-dream-skin:sidebar-opacity'), '0.6', 'opacity persisted');
	assert.equal(unlinked.last().light, 'rgba(246, 233, 239, 0.6)', 'dragging the slider moves the sidebar fill');

	// 3) Linked: dragging RELEASES the link in the same action, so the value the
	//    user just chose is what renders. This is the actual #55 fix for root
	//    cause B — asserted on storage + token, not on source text.
	const linked = makeCase({ seed: { 'dsh-dream-skin:sidebar-link': '1', 'dsh-dream-skin:sidebar-opacity': '0.31' } });
	assert.ok(/^rgba\(247, 240, 243,/.test(linked.last().light),
		'while linked the sidebar follows the canvas base colour (the documented no-op)');
	linked.h.actionBags['dream-skin-glass'].setSidebarOpacity(60);
	assert.equal(linked.h.localStorage.getItem('dsh-dream-skin:sidebar-link'), '0', 'dragging released the link');
	assert.equal(linked.last().light, 'rgba(246, 233, 239, 0.6)', 'the dragged value reaches the sidebar token');

	// 4) Upgrade path — a profile that predates BOTH keys (the case the review
	//    flagged): absence must resolve to the author's shipped look, i.e. the
	//    SAME numbers the factory seed writes, or the two readers drift again.
	const bare = makeCase({ seed: {} });
	assert.equal(bare.last().light, 'rgba(246, 233, 239, 0.28)',
		'missing sidebar keys fall back to the shipped look (0.28, unlinked)');

	// 5) No wallpaper wash at all: the sidebar fill is not overridden, so the
	//    slider cannot change anything — and it must therefore NOT silently
	//    rewrite the user's link preference either (review P1-1).
	const dry = makeCase({ wallpaper: false, seed: { 'dsh-dream-skin:sidebar-link': '1', 'dsh-dream-skin:sidebar-opacity': '0.31' } });
	assert.equal(dry.captured.length, 0, 'no wash → no sidebar fill override to tune');
	dry.h.actionBags['dream-skin-glass'].setSidebarOpacity(60);
	assert.equal(dry.h.localStorage.getItem('dsh-dream-skin:sidebar-opacity'), '0.6', 'the value is still persisted');
	assert.equal(dry.h.localStorage.getItem('dsh-dream-skin:sidebar-link'), '1',
		'no wash → the stored link is left alone (no preference change without a visible effect)');
});

test('sidebar fill leak: the Windows title-bar frame stops painting the chat area with the sidebar token', () => {
	// Reported: dragging 侧边栏透明度 moved the CHAT area's wallpaper, and at 0%
	// (sidebar alpha 1) the chat area went flat black. Root cause: in the Electron
	// shell's Windows layout the host paints the WHOLE AppFrame with
	// `--dsw-specific-sidebar-fill` and cuts the content column out of it, so the
	// SIDEBAR colour is a second translucent layer UNDER the chat area — the one
	// colour the sidebar slider owns. The frame is reached through the shell's own
	// stable stamp (`[data-shell-overlay]` is a direct child of it), never through
	// a build hash, and the drop is gated on the live wash so a wallpaper-less
	// profile keeps the stock frame fill.
	const created = [];
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {} },
		createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const h = buildSandbox({ document: doc });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)), 'apply');
	const sheet = created.find((el) => el.id === 'dsh-dream-skin:material:liquid-glass');
	assert.ok(sheet, 'the material sheet is injected');
	const css = sheet.textContent;

	// Structural gate over the WHOLE sheet, not a slice of it: a stray `},` after a
	// rule makes the parser swallow the NEXT block while every substring assertion
	// below still passes (a local round of this fix shipped exactly such a dead
	// rule, and the sliced fixture it was checked against cut the stray comma out).
	assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, 'injected sheet braces balance');
	assert.ok(!/\},/.test(css), 'no `}` is directly followed by `,` (that eats the next rule)');

	const rule = css.match(/html\[data-windows-titlebar\]\[data-dsh-dream-skin-wash\][^{]*div:has\(> \[data-shell-overlay\]\)\s*\{[^}]*\}/);
	assert.ok(rule, "the Windows AppFrame is targeted through the shell's own [data-shell-overlay] stamp");
	assert.ok(/background-color:\s*transparent\s*!important/.test(rule[0]),
		'the frame fill is dropped while a wash is live (one translucent layer per surface)');
	// Reverse guard: an UNGATED drop erases the frame fill on every skin, wallpaper
	// or not — the marker is the whole reason the stock look survives.
	const ungated = css.match(/html\[data-windows-titlebar\](?!\[data-dsh-dream-skin-wash\])[^{]*div:has\(> \[data-shell-overlay\]\)\s*\{[^}]*transparent/);
	assert.equal(ungated, null, 'the frame rule only ever fires while the wash marker is present');
});

test('sidebar fill leak: the wash marker and its opaque backdrop follow the wallpaper lifecycle', () => {
	// Behavioural half of the same fix (test-admission gate 1: at least two time
	// points). The rule above only holds if `data-dsh-dream-skin-wash` is published
	// exactly while the wash is on screen, and dropping the frame fill is only safe
	// while something OPAQUE sits under the translucent surfaces.
	const created = [];
	const attrs = new Map();
	const vars = new Map();
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: {
			style: { setProperty: (name, value) => { vars.set(name, value); } },
			setAttribute: (name, value) => { attrs.set(name, value); },
			removeAttribute: (name) => { attrs.delete(name); }
		},
		createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const h = buildSandbox({
		document: doc,
		seed: {
			// A raster source on purpose: the fill mode is a raster-only concern
			// (issue #61 — a gradient has no aspect ratio, so it is always `cover`).
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/tall.jpg',
			'dsh-dream-skin:wallpaper-opacity': '0.5',
			'dsh-dream-skin:wallpaper-follows-skin': '0'
		}
	});
	const active = {
		id: 'midnight',
		colorScheme: 'dark',
		tokens: { '--dsw-alias-bg-base': '#101014', '--dsw-specific-sidebar-fill': '#0d0d12' }
	};
	const published = [];
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'midnight', active, themes: [active], revision: 1 }; },
		overrideTokens(source, tokens) {
			if (source === 'dsh-dream-skin:appearance' && tokens['--dsh-dream-skin-composer-base']) {
				published.push(tokens['--dsh-dream-skin-composer-base']);
			}
			return () => {};
		}
	};
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply({ ...makeApplyContext(h, { captureActions: true }), theme }), 'apply');

	// Time point 1 — the wash is live at boot.
	assert.equal(attrs.get('data-dsh-dream-skin-wash'), '1', 'the root marker is published with the wash layer');
	assert.ok(published.length > 0, 'the skin published its appearance override layer');
	const base = published[published.length - 1].dark;
	assert.equal(base, '#101014', 'the wash carries the skin\'s OPAQUE base colour');
	const backdrop = created.filter((el) => el.style.backgroundColor);
	assert.equal(backdrop.length, 1, 'exactly one opaque backdrop is parked under the wallpaper');
	assert.equal(backdrop[0].style.backgroundColor, base, 'the backdrop carries that opaque base colour (no alpha)');

	// The backdrop must ride the BOTTOM layer: in blur-fill mode that layer is the
	// heavily blurred bleed, and filling the visible image instead would hard-edge
	// the very bands that mode exists to hide.
	h.actionBags['dream-skin-wallpaper-advanced'].setFit('blur');
	const isBleed = (el) => String(el.style.cssText).includes('transform:scale(1.2)');
	const live = (el) => doc.body.children.includes(el);
	const bleed = created.filter((el) => isBleed(el) && live(el) && el.style.backgroundImage);
	assert.equal(bleed.length, 1, 'blur mode still creates its bleed layer');
	assert.equal(bleed[0].style.backgroundColor, base, 'the opaque backdrop rides the bleed layer, not the image');
	const image = created.filter((el) => !isBleed(el) && live(el) && el.style.backgroundImage);
	assert.equal(image.length, 1, 'exactly one visible wallpaper layer');
	assert.equal(image[0].style.backgroundColor, '', 'the visible image layer keeps no fallback fill');

	// Time point 2 — clearing the wallpaper retracts the marker with the layer.
	h.actionBags['dream-skin-wallpaper'].clearWallpaper();
	assert.equal(attrs.has('data-dsh-dream-skin-wash'), false, 'clearing the wallpaper retracts the root marker');
});


test('glass row: material presets, composer opacity and popup opacity persist and sync', () => {
	// Blue-team B4/B5/B9 follow-up: the glass-effect row's actions must persist
	// every value they promise, keep the preset chip in step with the sliders
	// (a slider move is a fine-tune WITHIN the material — the material marker
	// stays; a preset write updates the composer value), and the legacy modal
	// setOpacity must keep the glass store in sync.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));
	const glass = h.actionBags['dream-skin-glass'];
	assert.ok(glass, 'glass row action bag captured');

	// Material preset "frosted" (the factory default): round-5 semantics — the
	// chip is a PURE STYLE switch, it persists the id but writes NO slider keys.
	assert.doesNotThrow(() => glass.setMaterialPreset('frosted'));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), 'frosted', 'preset id persisted');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), null, 'chip never writes wallpaper opacity');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-blur'), null, 'chip never writes wallpaper blur');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), null, 'chip never writes composer opacity');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), null, 'chip never writes popup opacity');

	// "liquid" only flips the id — slider keys STILL untouched.
	glass.setMaterialPreset('liquid');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), 'liquid', 'liquid id persisted');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), null, 'liquid chip still writes no values');

	// Frosted again: same guarantee (two materials only — no "default/none").
	glass.setMaterialPreset('frosted');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), 'frosted', 'frosted id restored');

	// An unknown preset id is refused (the previously chosen preset stays).
	glass.setMaterialPreset('bogus');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), 'frosted', 'unknown preset refused, previous choice kept');

	// A slider move is a fine-tune WITHIN the material: values persist, the
	// material chips stay put (no preset-marker drop since round 2).
	glass.setOpacity(80);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), '0.8', 'slider value persisted');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), 'frosted', 'slider tune keeps the material');
	glass.setBlur(20);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-blur'), '20', 'blur slider persisted');

	// Composer opacity slider persists (clamped).
	glass.setComposerOpacity(150);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), '1', 'composer clamped to 1');
	glass.setComposerOpacity(30);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), '0.3', 'composer opacity persisted');

	// Popup opacity via the glass row persists.
	glass.setModalOpacity(50);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), '0.5', 'modal opacity persisted through the glass row');

	// The legacy modal row's setOpacity keeps the shared state in step (B9) —
	// asserted against the LIVE store state, not just localStorage: deleting
	// every syncGlass()/sync() call must make this test fail (T4).
	const glassState = h.storeStates['dream-skin-glass'];
	assert.ok(glassState, 'glass store state exposed by the harness');
	const legacyModal = h.actionBags['dream-skin-modal-opacity'];
	assert.ok(legacyModal && typeof legacyModal.setOpacity === 'function', 'legacy modal bag kept for compatibility');
	legacyModal.setOpacity(70);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), '0.7', 'legacy setOpacity still persists');
	assert.equal(glassState.modalOpacity, 0.7, 'legacy setOpacity synced the glass store (B9/T4)');
	assert.equal(h.storeStates['dream-skin-modal-opacity'].opacity, 0.7, 'legacy setOpacity synced its own modal store');
});

test('composer marker tags the Lexical input card by behavior (adversarial F2)', () => {
	// Behavioral guard (adversarial-review F2): the source-string assertion
	// above is necessary but NOT sufficient — this test drives the REAL
	// marker over a mock DOM to prove three behaviors:
	//   1. a Lexical contenteditable anchor ([data-composer-input]) climbs to
	//      its rounded card and gets tagged;
	//   2. an anchor inside a settings dialog is REJECTED (F1 — the glass
	//      rules would strip that surface's background);
	//   3. a percentage radius ("50%") is not misread as 50px (F3).
	const tagged = [];
	const mkAnchor = ({ inDialog = false, parentRadius = '12px', parentWidth = 300 }) => {
		const parent = {
			offsetWidth: parentWidth,
			__radius: parentRadius,
			__attrs: {},
			getAttribute(name) { return this.__attrs[name] !== undefined ? this.__attrs[name] : null; },
			// The marker tags the CARD (this node), not the anchor — record here.
			setAttribute(name, value) { this.__attrs[name] = String(value); tagged.push({ name, value, card: this }); }
		};
		const anchor = {
			offsetWidth: 100,
			offsetHeight: 40,
			parentElement: parent,
			closest(sel) {
				if (String(sel).includes('dialog')) return inDialog ? { __dialog: true } : null;
				return null; // no legacy hash card
			},
			getAttribute() { return null; },
			setAttribute(name, value) { tagged.push({ name, value, anchor }); }
		};
		return anchor;
	};
	const composerAnchor = mkAnchor({});
	const dialogAnchor = mkAnchor({ inDialog: true });
	const pillAnchor = mkAnchor({ parentRadius: '50%' });
	const anchors = [composerAnchor, dialogAnchor, pillAnchor];
	const documentMock = {
		body: { contains: () => false },
		head: { children: [], contains: () => false, appendChild() {}, append() {} },
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll(sel) {
			if (String(sel).includes('data-composer-input')) return anchors;
			return [];
		},
		documentElement: {}
	};
	const h = buildSandbox({
		document: documentMock,
		getComputedStyle(node) { return { borderTopLeftRadius: node.__radius || '0px' }; }
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h);
	assert.doesNotThrow(() => e.apply(ctx), 'apply runs the marker without throwing');

	assert.ok(tagged.length === 1, 'exactly one anchor got tagged (dialog + pill rejected), got ' + tagged.length);
	assert.ok(tagged[0].card === composerAnchor.parentElement, 'the tagged card is the composer input\'s rounded parent');
	assert.equal(tagged[0].name, 'data-dsh-dream-skin-composer', 'tagged with the DOM-shape attribute');
});

test('composer opacity drives the CSS fill variable', () => {
	// B4: the composer (chat input) opacity slider must set the
	// --dsh-dream-skin-composer-fill CSS variable at boot and on change.
	const styleProps = {};
	const documentMock = {
		body: { contains: () => false },
		head: { children: [], contains() { return false; }, appendChild() {}, append(c) { this.children.push(c); } },
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => [],
		documentElement: { style: { setProperty(k, v) { styleProps[k] = v; } } }
	};
	const h = buildSandbox({ document: documentMock, seed: { 'dsh-dream-skin:composer-opacity': '0.4' } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply(ctx));
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '40%', 'saved composer fill re-applied at boot');
	h.actionBags['dream-skin-glass'].setComposerOpacity(90);
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '90%', 'slider updates the CSS variable');

	// Round-10: the glass blur variable is owned by the USER'S blur slider and
	// scaled per MATERIAL (liquid = thin glass ×0.25). A chip click never
	// changes the STORED slider value — but the applied var is material-scaled.
	assert.equal(styleProps['--dsh-dream-skin-glass-blur'], '14px', 'boot applies the default blur fallback');
	h.actionBags['dream-skin-glass'].setMaterialPreset('liquid');
	assert.equal(styleProps['--dsh-dream-skin-glass-blur'], '3.5px', 'liquid scales the glass blur (thin glass, x0.25)');
	h.actionBags['dream-skin-glass'].setBlur(0);
	assert.equal(styleProps['--dsh-dream-skin-glass-blur'], '0px', 'blur slider drives the glass var (0 allowed by explicit user choice)');

	// Blue-team D5 (revised): NO value migration at boot — the chip means
	// material IDENTITY, not exact numbers, so a user's stored values must
	// never be overwritten. A fresh install still gets the frosted glass blur
	// (applyMaterialBlur derives it from the active preset) and the chip
	// defaults to frosted via the store sync.
	const h2 = buildSandbox({ document: documentMock });
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	e2.apply(makeApplyContext(h2, { captureActions: true }));
	assert.equal(h2.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), null, 'no migration clobbers user/stock values');
	assert.equal(h2.storeStates['dream-skin-glass'].materialPreset, 'frosted', 'fresh install chip defaults to frosted');
	// Legacy "default" ids from earlier builds read back as frosted too.
	const h3 = buildSandbox({ document: documentMock, seed: { 'dsh-dream-skin:material-preset': 'default' } });
	const e3 = h3.factory(makeRequire(makeRuntime().RT));
	e3.apply(makeApplyContext(h3, { captureActions: true }));
	assert.equal(h3.storeStates['dream-skin-glass'].materialPreset, 'frosted', 'legacy "default" id reads back as frosted');
});

test('packShareUrl round-trip: built-in skins share, decode and validate; packs keep their id', () => {
	// Blue-team B3: a built-in skin's synthesized manifest must round-trip
	// through validatePack, and a receiver recognizing it as built-in must
	// select the skin instead of importing a frozen dream-pack: copy.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const share = h.actionBags['dream-skin-packs'];

	// Build a synthetic abyss manifest the same way packShareUrl does, then
	// import it through the real share-URL path in a fresh sandbox.
	const manifest = {
		id: 'abyss',
		name: 'abyss',
		author: 'dsh-dream-skin',
		version: '1.0.0',
		description: '',
		colorScheme: 'dark',
		tokens: e.SKINS.find((s) => s.id === 'abyss').tokens
	};
	const payload = JSON.stringify({ format: 'dsh-dream-skin/pack', version: 1, manifest });
	const b64 = Buffer.from(unescape(encodeURIComponent(payload)), 'binary').toString('base64');

	// A fresh sandbox importing this link must SELECT abyss, not create
	// dream-pack:abyss (no frozen duplicate).
	const h2 = buildSandbox({ hash: '#dream-skin-pack=' + b64 });
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	let pref = 'system';
	const ctx2 = makeApplyContext(h2);
	ctx2.theme.setTheme = (id) => { pref = id; };
	e2.apply(ctx2);
	assert.equal(pref, 'abyss', 'built-in skin share selects the real skin');
	assert.equal(h2.localStorage.getItem('dsh-dream-skin:skin'), 'abyss', 'selection persisted');
	const packs2 = JSON.parse(h2.localStorage.getItem('dsh-dream-skin:packs') || '[]');
	assert.equal(packs2.filter((p) => p.id === 'dream-pack:abyss').length, 0, 'NO frozen dream-pack:abyss duplicate');

	// A REAL pack manifest (non-builtin id) still imports normally.
	const packManifest = {
		id: 'mytheme',
		name: 'My Theme',
		author: 'someone',
		version: '1.0.0',
		description: '',
		colorScheme: 'dark',
		tokens: {
			'--dsw-alias-bg-base': '#101014',
			'--dsw-alias-bg-layer-1': '#1b1e28',
			'--dsw-alias-brand-primary': '#5e6ad2',
			'--dsw-alias-label-primary': '#f4f5f7',
			'--dsw-alias-label-secondary': '#a5adb8',
			'--dsw-alias-border-l1': '#222222',
			'--dsw-alias-border-l2': '#444444'
		}
	};
	const packPayload = JSON.stringify({ format: 'dsh-dream-skin/pack', version: 1, manifest: packManifest });
	const packB64 = Buffer.from(unescape(encodeURIComponent(packPayload)), 'binary').toString('base64');
	const h3 = buildSandbox({ hash: '#dream-skin-pack=' + packB64 });
	const e3 = h3.factory(makeRequire(makeRuntime().RT));
	e3.apply(makeApplyContext(h3));
	assert.ok(h3.localStorage.getItem('dsh-dream-skin:packs').includes('dream-pack:mytheme'), 'real packs still import with the dream-pack: prefix');

	// A reserved built-in HOST id (system/light/dark) as manifest.id is rejected.
	const evilPayload = JSON.stringify({ format: 'dsh-dream-skin/pack', version: 1, manifest: { ...packManifest, id: 'system' } });
	const evilB64 = Buffer.from(unescape(encodeURIComponent(evilPayload)), 'binary').toString('base64');
	const h4 = buildSandbox({ hash: '#dream-skin-pack=' + evilB64 });
	const e4 = h4.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e4.apply(makeApplyContext(h4)));
	assert.equal(JSON.parse(h4.localStorage.getItem('dsh-dream-skin:packs') || '[]').length, 0, 'reserved manifest.id rejected');

	// An oversized hash payload is refused at the boot gate (B12).
	const bigTokens = { ...packManifest.tokens, pad: 'x'.repeat(1024 * 1024 + 10) };
	const bigPayload = JSON.stringify({ format: 'dsh-dream-skin/pack', version: 1, manifest: { ...packManifest, tokens: bigTokens } });
	const bigB64 = Buffer.from(unescape(encodeURIComponent(bigPayload)), 'binary').toString('base64');
	const h5 = buildSandbox({ hash: '#dream-skin-pack=' + bigB64 });
	const e5 = h5.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e5.apply(makeApplyContext(h5)));
	assert.equal(JSON.parse(h5.localStorage.getItem('dsh-dream-skin:packs') || '[]').length, 0, 'oversized share payload refused');
	assert.ok(share && typeof share.surprise === 'function', 'packs row actions intact');
});

test('round-5: switching materials NEVER moves any slider value (user decision)', () => {
	// User decision (round 5): the material chip is a PURE STYLE switch. After
	// the user tunes the sliders, frosted <-> liquid round-trips must leave
	// every stored value exactly as they left it.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const glass = h.actionBags['dream-skin-glass'];

	// User tunes like they did: opacity 50% (stored 0.5), blur 5px, composer 0.9.
	glass.setOpacity(50);
	glass.setBlur(5);
	glass.setComposerOpacity(90);
	glass.setMaterialPreset('frosted');
	const tuned = {
		o: h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'),
		b: h.localStorage.getItem('dsh-dream-skin:wallpaper-blur'),
		c: h.localStorage.getItem('dsh-dream-skin:composer-opacity')
	};
	assert.equal(tuned.o, '0.5', 'pre: tuned opacity stored');
	assert.equal(tuned.b, '5', 'pre: tuned blur stored');
	assert.equal(tuned.c, '0.9', 'pre: tuned composer stored');

	// Round-trip frosted -> liquid -> frosted (-> liquid -> frosted): every
	// stored value MUST be untouched by the chips.
	glass.setMaterialPreset('liquid');
	glass.setMaterialPreset('frosted');
	glass.setMaterialPreset('liquid');
	glass.setMaterialPreset('frosted');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), tuned.o, 'opacity survives material round-trips');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-blur'), tuned.b, 'blur survives material round-trips');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), tuned.c, 'composer survives material round-trips');

	// UI store: values unchanged, material id updated.
	const st = h.storeStates['dream-skin-glass'];
	assert.equal(st.opacity, 0.5, 'store opacity untouched by chips');
	assert.equal(st.blur, 5, 'store blur untouched by chips');
	assert.equal(st.composerOpacity, 0.9, 'store composer untouched by chips');
	assert.equal(st.materialPreset, 'frosted', 'store material id follows the chip');
});

test('round-5: glass blur var follows the blur slider, not the material', () => {
	// Round-5: ONE blur knob. GLASS_BLUR_VAR must reflect the user's stored
	// blur (whatever the material), with the material only owning the TONE var.
	const styleProps = {};
	const documentMock = {
		body: { contains: () => false },
		head: { children: [], contains() { return false; }, appendChild() {}, append(c) { this.children.push(c); } },
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => [],
		documentElement: { style: { setProperty(k, v) { styleProps[k] = v; } } },
		addEventListener() {}, removeEventListener() {}
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const glass = h.actionBags['dream-skin-glass'];

	// No blur stored yet: the DEFAULT fallback applies.
	assert.equal(styleProps['--dsh-dream-skin-glass-blur'], '14px', 'default blur fallback applied');

	// The blur slider drives the glass var.
	glass.setBlur(23);
	assert.equal(styleProps['--dsh-dream-skin-glass-blur'], '23px', 'blur slider drives the glass var');

	// Switching material must NOT change the STORED slider values (user decision,
	// round-5) — but the applied glass blur var IS material-scaled (round-10:
	// liquid = thin glass, ×0.25); only the tone var flips alongside.
	glass.setMaterialPreset('liquid');
	assert.equal(styleProps['--dsh-dream-skin-glass-blur'], '5.8px', 'liquid scales the applied blur (23 x 0.25), stored value untouched');
	assert.ok(styleProps['--dsh-dream-skin-glass-tone'], 'tone var set by the material chip');

	// Clamping: out-of-range slider values clamp to 60 BEFORE material scaling
	// (still on liquid: 60 x 0.25 = 15 applied).
	glass.setBlur(500);
	assert.equal(styleProps['--dsh-dream-skin-glass-blur'], '15px', 'glass blur clamped to 60px, then material-scaled');
});

test('round-6: first launch applies factory defaults (shipped look)', async () => {
	// Fresh profile WITHOUT the factory-applied marker: first boot must paint
	// the full shipped look (nebula skin, bundled wallpaper, tuned numbers,
	// bing-daily URL) and stamp the one-shot marker.
	// Issue #51: the WALLPAPER keys are deferred until the host probe settles
	// (this sandbox has no fetch, so the catch path fires on the next tick) —
	// non-visual defaults are still synchronous.
	const h = buildSandbox();
	h.localStorage.removeItem('dsh-dream-skin:factory-applied'); // simulate true first launch
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:skin'), 'nebula', 'factory skin applied on first launch');
	await new Promise((resolve) => setTimeout(resolve, 10)); // let the deferred wallpaper seed settle
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'image', 'factory wallpaper kind applied');
	assert.ok((h.localStorage.getItem('dsh-dream-skin:wallpaper') || '').startsWith('data:image/svg+xml;base64,'), 'bundled vector glow applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://uapis.cn/api/v1/image/bing-daily', 'bing-daily default URL visible');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), '0.19', 'factory wallpaper opacity applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), '0.4', 'factory composer opacity applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), '0.6', 'factory modal opacity applied (adjudication R6 pin)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), 'frosted', 'factory material applied (frosted IS the shipped look, blue-team B5)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh'), '{"on":0,"hours":24}', 'factory refresh schedule OFF (blue-team B7: third-party polling is opt-in)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-fit'), 'cover', 'factory fill mode is part of the shipped look record');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:factory-applied'), '1', 'one-shot marker stamped');
});

test('round-6: factory defaults are one-shot — cleared wallpaper stays cleared', () => {
	// Existing user (marker pre-stamped by the sandbox): they had set their own
	// wallpaper, then cleared it. A reboot must NOT resurrect the bundled one.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), null, 'pre: no factory seeding when the one-shot marker is present');
	// Reboot (apply again): factory defaults must stay dormant.
	e.apply(makeApplyContext(h));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), null, 'cleared wallpaper is NOT resurrected by factory defaults');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), null, 'factory numbers stay dormant for existing users');
});

test('round-7 F1: upgrader without marker is NOT factory-seeded (per-key gap)', () => {
	// Blue-team F1: the factory-applied marker is new in this build, so every
	// existing user lacks it. An upgrader with even ONE stored plugin key
	// (e.g. a URL wallpaper they chose themselves) must keep exactly what they
	// have — no factory nebula/horse/1h-refresh silently switched on.
	const h = buildSandbox();
	// Simulate a pre-upgrade user: own URL wallpaper choice, no marker, and
	// crucially NO stored refresh config / opacity numbers.
	h.localStorage.removeItem('dsh-dream-skin:factory-applied');
	h.localStorage.setItem('dsh-dream-skin:wallpaper-kind', 'url');
	h.localStorage.setItem('dsh-dream-skin:wallpaper-url', 'https://example.com/my-random-api');
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:skin'), null, 'upgrader skin untouched');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://example.com/my-random-api', 'upgrader URL kept');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh'), null, 'factory 1h refresh NOT switched on for upgrader');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), null, 'factory numbers NOT written for upgrader');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), null, 'factory material NOT written for upgrader');
	// The marker gets stamped so later boots skip the check entirely.
	assert.equal(h.localStorage.getItem('dsh-dream-skin:factory-applied'), '1', 'marker stamped for the upgrader too');
});

test('issue #67 follow-up: liquid material fills with the skin base, not neutral white', () => {
	// Round-8 made the tint var material-driven to kill the TEA read: liquid =
	// #ffffff, frosted = skin base. Issue #67's follow-up moves liquid onto the
	// skin base TOO: the white was designed for the 15% fill cap, where a breath
	// of white reads as "clear glass". Now that the slider's solid end truly
	// reaches 100% (next test), a white fill boards up as PURE WHITE and the
	// LIGHT input text on dark skins becomes unreadable on it. Both materials
	// now fill with the scheme-aware skin base; the liquid character lives in
	// the tone / sheen layers, not the fill color.
	const styleProps = {};
	const documentMock = {
		body: { contains: () => false },
		head: { children: [], contains() { return false; }, appendChild() {}, append(c) { this.children.push(c); } },
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => [],
		documentElement: { style: { setProperty(k, v) { styleProps[k] = v; } }, setAttribute() {} },
		addEventListener() {}, removeEventListener() {}
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const glass = h.actionBags['dream-skin-glass'];

	glass.setMaterialPreset('liquid');
	assert.equal(styleProps['--dsh-dream-skin-glass-tint'], 'var(--dsh-dream-skin-composer-base, var(--dsw-alias-bg-base))', 'liquid glass fills with the skin base (dark-on-dark, light-on-light)');

	glass.setMaterialPreset('frosted');
	assert.equal(styleProps['--dsh-dream-skin-glass-tint'], 'var(--dsh-dream-skin-composer-base, var(--dsw-alias-bg-base))', 'frosted keeps the skin-base tint');
});

test('round-17: liquid slider drives glass thickness (extra backdrop blur)', () => {
	// User decision (round-13, re-implemented round-17): on liquid, the
	// transparency slider means glass THICKNESS — more opaque = more backdrop
	// blur (+0..24px). The old SVG displacement experiment was removed
	// (Chromium drops backdrop-filter:url() whole; a filter:url() replica
	// erased the DOM text behind the pane).
	const styleProps = {};
	const documentMock = {
		body: { contains: () => false },
		head: { children: [], contains() { return false; }, appendChild(c) { this.children.push(c); }, append(c) { this.children.push(c); } },
		createElement: () => ({ style: {}, dataset: {}, textContent: '', remove() {} }),
		createTextNode: () => ({}),
		getElementById: () => null,
		querySelector: () => null,
		querySelectorAll: () => [],
		documentElement: {
			style: { setProperty(k, v) { styleProps[k] = v; } },
			setAttribute() {}
		},
		addEventListener() {}, removeEventListener() {}
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const glass = h.actionBags['dream-skin-glass'];

	// Thickness mapping: opacity 0.5 -> +12px of extra backdrop blur; the
	// composer fill var carries the LIQUID-REMAPPED weight now (issue #67
	// follow-up): 0.5 + 0.5 × 0.15 = 0.575, which IEEE-754 lands at
	// 0.5749999999999999… — rounds to 57%.
	glass.setMaterialPreset('liquid');
	glass.setComposerOpacity(50);
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '57%', 'fill var carries the liquid-remapped weight (0.5 -> 0.575 -> 57%)');
	assert.equal(styleProps['--dsh-dream-skin-liquid-thickness'], '12px', 'opacity 0.5 maps to +12px glass thickness');

	// Max opacity = thickest glass (+24px); zero transparency = thin (0px).
	glass.setComposerOpacity(100);
	assert.equal(styleProps['--dsh-dream-skin-liquid-thickness'], '24px', 'opacity 1.0 maps to +24px glass thickness');
	glass.setComposerOpacity(0);
	assert.equal(styleProps['--dsh-dream-skin-liquid-thickness'], '0px', 'opacity 0 maps to 0px (thin clear glass)');

	// The liquid CSS rule must consume the thickness var via backdrop-filter
	// (real backdrop sampling — text behind stays fogged, wallpaper blur stacks).
	const styleEl = documentMock.head.children.find((c) => c.textContent && c.textContent.includes('liquid-thickness'));
	assert.ok(styleEl, 'liquid thickness var consumed in material CSS');
	assert.ok(styleEl.textContent.includes('backdrop-filter'), 'liquid rule uses backdrop-filter (not filter:url)');
	assert.ok(!styleEl.textContent.includes('url(#dsh-liquid-refract)'), 'SVG refraction experiment fully removed');
});

test('issue #67 follow-up: the composer fill weight is remapped per material — liquid reaches 100% at the solid end', () => {
	// The slider's promise is "leftmost = most solid" (composer.hint: 越往左越实、
	// 文字越清晰). The old CSS multiply (fill% × fillScale 0.15) broke it on liquid:
	// 100% weight painted a 15% fill, so the window content bled through the input
	// area no matter how far left the slider went — and 85% of the travel did
	// almost nothing. The remap publishes effective = raw + (1 − raw) × floor
	// (liquid floor 0.15, frosted floor 0 — the floor form degenerates to the raw
	// weight on frosted, so its behaviour is unchanged bit for bit).
	const styleProps = {};
	const documentMock = {
		body: { contains: () => false },
		head: { children: [], contains() { return false; }, appendChild(c) { this.children.push(c); }, append(c) { this.children.push(c); } },
		createElement: () => ({ style: {}, dataset: {}, textContent: '', remove() {} }),
		createTextNode: () => ({}),
		getElementById: () => null,
		querySelector: () => null,
		querySelectorAll: () => [],
		documentElement: {
			style: { setProperty(k, v) { styleProps[k] = v; } },
			setAttribute() {}
		},
		addEventListener() {}, removeEventListener() {}
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const glass = h.actionBags['dream-skin-glass'];

	// Liquid: transparent end keeps the 15% clear-glass floor, solid end is 100%.
	glass.setMaterialPreset('liquid');
	glass.setComposerOpacity(100);
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '100%', 'liquid at the solid end is TRULY opaque (was 15% before)');
	glass.setComposerOpacity(0);
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '15%', 'liquid at the transparent end keeps its clear-glass floor');

	// Frosted: identity — the floor form must not touch the stock behaviour.
	glass.setMaterialPreset('frosted');
	glass.setComposerOpacity(85);
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '85%', 'frosted publishes the raw weight (identity, unchanged)');
	glass.setComposerOpacity(30);
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '30%', 'frosted at low weight is the raw weight too');

	// Test-admission gate: the material chip must re-publish the remapped weight
	// when the identity changes, or a chip switch leaves a stale mapping behind.
	// The endpoints (100/0) cannot see this — liquid remap is the identity at
	// both — so the discriminator sits mid-range: 50 on liquid is 57%.
	glass.setComposerOpacity(50);
	glass.setMaterialPreset('liquid');
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '57%', 'chip switch re-publishes the remapped weight (50% -> 57% on liquid)');
	glass.setMaterialPreset('frosted');
	assert.equal(styleProps['--dsh-dream-skin-composer-fill'], '50%', 'chip switch back re-publishes too (frosted floor is 0, not liquid 15%)');

	// The CSS must no longer multiply — double scaling (JS remap × CSS fillScale)
	// would cap liquid right back down. The ::before fill rule consumes the
	// published weight var RAW, so assert on the LINE: it must carry the fill
	// var inside its color-mix and contain no `*` at all (the old shape was
	// `calc(var(--dsh-dream-skin-composer-fill, 85%) * var(--…fill-scale…))`;
	// a reintroduction could also be `* 0.15`, which the old needle missed).
	const sheet = documentMock.head.children.find((c) => c.textContent && c.textContent.includes('--dsh-dream-skin-composer-fill'));
	assert.ok(sheet, 'composer fill var consumed in material CSS');
	const fillLines = sheet.textContent.split('\n').filter((l) => l.includes('--dsh-dream-skin-composer-fill'));
	assert.equal(fillLines.length, 1, 'exactly one CSS line consumes the composer fill var');
	assert.ok(fillLines[0].includes('color-mix') && fillLines[0].includes('background'), '::before fill line reads the published weight var');
	assert.ok(!fillLines[0].includes('*'), 'no multiplication anywhere on the fill line (weight is pre-remapped in JS)');
	assert.ok(!sheet.textContent.includes('--dsh-dream-skin-glass-fill-scale'), 'the retired fill-scale var never re-enters the sheet');
});

test('issue #67: the popup-opacity slider drives --dsw-alias-bg-layer-2 with the skin\'s own hue', () => {
	// Host modal dialogs (`Modal.module.css` .dialog) and settings panels paint
	// from --dsw-alias-bg-layer-2, which every dark skin hard-codes at 0.85
	// (mist 0.6). POPUP_TOKENS never carried it, so even at the most-solid end
	// the dialog stayed 15–40% see-through and the window content bled into the
	// dialog's input area (issue #67). The override layer must now carry the
	// token, keep each skin's OWN layer-2 hue, and let only the alpha follow
	// the slider.
	const overrides = new Map();
	const theme = {
		setTheme() {},
		getTheme() {
			return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: {
				'--dsw-alias-bg-base': '#0b0b0e',
				'--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)'
			} }, themes: [], revision: 1 };
		},
		overrideTokens(source, tokens) { overrides.set(source, tokens); return () => {}; }
	};
	const h = buildSandbox();
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.6');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply({ ...baseCtx, theme }));

	const layer = overrides.get('dsh-dream-skin:appearance');
	assert.ok(layer, 'the appearance layer is published');
	const popupDark = layer['--dsw-alias-bg-layer-2'];
	assert.ok(popupDark, 'layer-2 rides the popup-opacity override layer now (was unreachable by the slider)');
	assert.equal(popupDark.dark, 'rgba(22, 22, 28, 0.6)', 'layer-2 keeps the SKIN\'s own hue (22,22,28) at the stored slider alpha 0.6');
	assert.ok(layer['--dsw-alias-bg-overlay'], 'overlay token still driven as before');
	assert.ok(layer['--dsw-specific-menu'], 'menu token still driven as before');

	// Slider move re-publishes with the new alpha; 100% weight = full occlusion.
	const glass = h.actionBags['dream-skin-glass'];
	glass.setModalOpacity(100);
	const solid = overrides.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(solid.dark, 'rgba(22, 22, 28, 1)', 'solid end = alpha 1 — the dialog fully occludes the window content');
});

test('issue #67: a pack skin whose layer-2 does not parse falls back to the skin base (slider keeps full range)', () => {
	// Pack themes may legally declare hsl()/hsla() (docs/themes-spec.md accepts
	// them via looksLikeColor). The legacy toRgba "silent pin" ships such a value
	// through UNCHANGED — alpha intact — so writeModalOpacity would appear dead on
	// that skin's dialogs. The layer-2 driver must detect the unparseable case and
	// fall back to the scheme base instead: the slider then still spans 0..1.
	const overrides = new Map();
	const theme = {
		setTheme() {},
		getTheme() {
			return { preference: 'packed', active: { id: 'dsh-dream-skin-pack:packed', colorScheme: 'dark', tokens: {
				'--dsw-alias-bg-base': '#101014',
				'--dsw-alias-bg-layer-2': 'hsl(220, 40%, 20%)'
			} }, themes: [], revision: 1 };
		},
		overrideTokens(source, tokens) { overrides.set(source, tokens); return () => {}; }
	};
	const h = buildSandbox();
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '1');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply({ ...baseCtx, theme }));

	const entry = overrides.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(entry.dark, 'rgba(16, 16, 20, 1)', 'unparseable layer-2 falls back to the skin base at the slider alpha (full occlusion still reachable)');
	assert.ok(!`${entry.light}|${entry.dark}`.includes('hsl'), 'the raw hsl value never reaches the host as its own override (that was the silent slider death)');
});

test('issue #67: without a live wash, a skin switch still re-resolves the layer-2 popup fills (deferred)', async () => {
	// The wallpaper path re-resolves after applyWallpaper2; the no-wallpaper
	// path must do its own deferred pass, or a skin switch leaves the dialogs on
	// the previous skin's palette until the next slider move or reload.
	const published = new Map();
	let activeTheme = { id: 'midnight', colorScheme: 'dark', tokens: {
		'--dsw-alias-bg-base': '#0b0b0e',
		'--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)'
	} };
	let revision = 1;
	const handlers = [];
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: activeTheme.id, active: activeTheme, themes: [activeTheme], revision }; },
		overrideTokens(source, tokens) { published.set(source, tokens); return () => {}; }
	};
	const h = buildSandbox(); // no wallpaper seeds: wallpaperBackgroundCss() stays null
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.6');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	ctx.on = (ev, fn) => { if (ev === 'theme/change') handlers.push(fn); return () => {}; };
	assert.doesNotThrow(() => e.apply(ctx));
	await sleep(10); // let the boot-deferred pass settle

	assert.equal(published.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'].dark, 'rgba(22, 22, 28, 0.6)',
		'boot resolves layer-2 from the midnight skin');

	// Host-side skin switch: the snapshot now carries ember. The re-resolve is
	// deliberately deferred (setTimeout 0) like the wallpaper re-shade.
	activeTheme = { id: 'ember', colorScheme: 'dark', tokens: {
		'--dsw-alias-bg-base': '#16110d',
		'--dsw-alias-bg-layer-2': 'rgba(36, 28, 20, 0.85)'
	} };
	revision += 1;
	for (const fn of handlers) fn(theme.getTheme());
	await sleep(10);
	assert.equal(published.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'].dark, 'rgba(36, 28, 20, 0.6)',
		'the deferred pass republishes the SETTLED skin hue (ember) without any slider move');
});

// ============================================================================
// ADJUDICATION 10.5.1 REGRESSION GATES (ADJUDICATION-10.5.1.md §6.1, R1-R6)
// These close the blind spots the review proved on this suite: under each of
// the six mutations (E4/E5/E6/E7 + the two 0.94/0.6 literal swaps) the whole
// shipped suite stayed green. Kill map: R1<-E5, R2<-E6, R3<-E7, R4<-E4,
// R5<-model default 0.94 swap, R6<-factory seed "0.6" swap. Every gate ends
// in a LITERAL assertion (no derived round(Number(...)% ...) forms).
// ============================================================================

test('adjudication R1: a skin switch without a live wash settles after one guarded re-resolve pass (emitting host)', async () => {
	// The host answers EVERY overrideTokens() publish with a synchronous
	// theme/change emit (real-machine history, CHANGELOG [0.2.1]). Kill-mutation
	// E5 strips the _applyingWallpaper guard from the no-wallpaper deferred
	// callback: each pass then re-arms itself on its own publish, and the
	// publish count keeps climbing between the two samples.
	const handlers = [];
	let publishes = 0;
	let active = { id: 'midnight', colorScheme: 'dark', tokens: {
		'--dsw-alias-bg-base': '#0b0b0e',
		'--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)'
	} };
	const published = new Map();
	const snapshot = () => ({ preference: active.id, active, themes: [active], revision: publishes });
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return snapshot(); },
		overrideTokens(source, tokens) {
			publishes += 1;
			published.set(source, tokens);
			// mimic ThemeRuntime.publish: emit theme/change synchronously — to
			// EVERY registered handler, including our own syncSkin listener.
			for (const fn of [...handlers]) fn(snapshot());
			return () => {};
		}
	};
	const h = buildSandbox(); // no wallpaper seeds: the no-wash branch is live
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.6');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	ctx.on = (ev, fn) => { if (ev === 'theme/change') handlers.push(fn); return () => {}; };
	assert.doesNotThrow(() => e.apply(ctx));
	assert.ok(handlers.length >= 1, 'syncSkin registered a theme/change listener');
	await sleep(120); // boot + its deferred pass + the nested guarded pass
	const base = publishes;

	// Host-side skin switch: the snapshot now carries ember.
	active = { id: 'ember', colorScheme: 'dark', tokens: {
		'--dsw-alias-bg-base': '#16110d',
		'--dsw-alias-bg-layer-2': 'rgba(36, 28, 20, 0.85)'
	} };
	for (const fn of [...handlers]) fn(snapshot());
	await sleep(500);
	const s1 = publishes;
	await sleep(2000);
	const s2 = publishes;

	assert.equal(s2, s1, `no-wallpaper re-resolve settles: no publishes in the +500ms..+2500ms window (got ${s1} then ${s2})`);
	assert.ok(s2 - base < 10, `a single skin switch publishes a bounded number of times (base ${base}, settled ${s2})`);
	assert.equal(published.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'].dark, 'rgba(36, 28, 20, 0.6)',
		'the settled layer-2 carries the ember hue at the stored alpha');
});

test('adjudication R2: a skin switch WITH a live wash settles after one guarded reshade pass (emitting host)', async () => {
	// Same convergence contract on the wallpaper branch (kill-mutation E6 strips
	// the _applyingWallpaper guard around the deferred applyWallpaper2 +
	// applyModalOverlay pass). The settled override must carry the NEW skin's
	// hue — mid-switch staleness is what the deferred re-resolve fixes.
	const handlers = [];
	let publishes = 0;
	let active = { id: 'midnight', colorScheme: 'dark', tokens: {
		'--dsw-alias-bg-base': '#0b0b0e',
		'--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)'
	} };
	const published = new Map();
	const snapshot = () => ({ preference: active.id, active, themes: [active], revision: publishes });
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return snapshot(); },
		overrideTokens(source, tokens) {
			publishes += 1;
			published.set(source, tokens);
			for (const fn of [...handlers]) fn(snapshot());
			return () => {};
		}
	};
	const h = buildSandbox({ seed: {
		'dsh-dream-skin:wallpaper-kind': 'gradient',
		'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #000 0%, #fff 100%)',
		'dsh-dream-skin:wallpaper-follows-skin': '0'
	} });
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.6');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	ctx.on = (ev, fn) => { if (ev === 'theme/change') handlers.push(fn); return () => {}; };
	assert.doesNotThrow(() => e.apply(ctx));
	assert.ok(handlers.length >= 1, 'syncSkin registered a theme/change listener');
	await sleep(120);
	const base = publishes;

	// Host-side skin switch to a LIGHT-scheme skin (rose).
	active = { id: 'rose', colorScheme: 'light', tokens: {
		'--dsw-alias-bg-base': '#fdfbf8',
		'--dsw-alias-bg-layer-2': 'rgba(255, 253, 253, 0.85)'
	} };
	for (const fn of [...handlers]) fn(snapshot());
	await sleep(500);
	const s1 = publishes;
	await sleep(2000);
	const s2 = publishes;

	assert.equal(s2, s1, `wallpaper re-shade settles: no publishes in the +500ms..+2500ms window (got ${s1} then ${s2})`);
	assert.ok(s2 - base < 10, `a single skin switch publishes a bounded number of times (base ${base}, settled ${s2})`);
	const entry = published.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(entry.light, 'rgba(255, 253, 253, 0.6)', 'the settled layer-2 keeps the rose hue in the light entry at the stored alpha');
	assert.equal(entry.dark, 'rgba(21, 21, 23, 0.6)', 'the inactive dark entry of the settled layer-2 falls back to the scheme base');
});

test('adjudication R3: unmount cancels the in-flight deferred popup re-resolve (no publishes after dispose)', async () => {
	// Kill-mutation E7 deletes the two clearTimeout lines in the syncSkin
	// cleanup effect: the pending deferred pass then fires AFTER teardown and
	// publishes into a dead fiber.
	const handlers = [];
	let publishes = 0;
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#0b0b0e', '--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)' } }, themes: [], revision: 1 }; },
		overrideTokens() { publishes += 1; return () => {}; }
	};
	const h = buildSandbox(); // no wallpaper seeds: the deferred popup timer is armed
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.6');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	ctx.on = (ev, fn) => { if (ev === 'theme/change') handlers.push(fn); return () => {}; };
	e.apply(ctx);
	await sleep(40); // boot settles (non-emitting host: no re-arm loops)
	const before = publishes;

	// Trigger the host-side skin switch, arming the deferred timer; then unmount
	// SYNCHRONOUSLY, before the timer gets a chance to run.
	for (const fn of [...handlers]) fn(theme.getTheme());
	for (const d of h.disposers || []) d();
	await sleep(100);
	assert.equal(publishes - before, 0,
		'unmount cancels the in-flight deferred popup re-resolve: zero publishes after dispose');
});

test('adjudication R4: the layer-2 override keeps the scheme base for the INACTIVE scheme (light entry of a dark skin)', async () => {
	// Kill-mutation E4 removes the colorScheme gate in fillFor: the skin's dark
	// hue then leaks into the light entry too, and a light-scheme host would
	// paint dialogs with a dark translucent fill. Pristine: the inactive scheme
	// entry must come from BUILTIN_BASE (white), never from the skin.
	const overrides = new Map();
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#0b0b0e', '--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)' } }, themes: [], revision: 1 }; },
		overrideTokens(source, tokens) { overrides.set(source, tokens); return () => {}; }
	};
	const h = buildSandbox();
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.6');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	e.apply({ ...baseCtx, theme });
	await sleep(20); // let the boot-deferred overlay pass publish
	const entry = overrides.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(entry.dark, 'rgba(22, 22, 28, 0.6)', 'the ACTIVE (dark) scheme keeps the skin\'s own layer-2 hue at the slider alpha');
	assert.equal(entry.light, 'rgba(255, 255, 255, 0.6)', 'the INACTIVE (light) scheme entry is painted from the scheme base (white), not the skin\'s dark hue');
});

test('adjudication R5: missing slider key falls back to the 0.94 default in the layer-2 override (literal pin)', async () => {
	// The suite's existing seed path asserts DERIVED forms (round(stored*100)%
	// plus notEqual '94%'), which stayed green under a 0.94 -> 0.2 swap of
	// DEFAULT_MODAL_OPACITY. This literal pin is the formal gate.
	const overrides = new Map();
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#0b0b0e', '--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)' } }, themes: [], revision: 1 }; },
		overrideTokens(source, tokens) { overrides.set(source, tokens); return () => {}; }
	};
	const h = buildSandbox(); // no modal-opacity key stored: the JS fallback applies
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	e.apply({ ...baseCtx, theme });
	await sleep(20);
	const entry = overrides.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(entry.dark, 'rgba(22, 22, 28, 0.94)', 'an existing user without a stored slider gets the 0.94 fallback baked into layer-2');
});

test('adjudication R6: fresh install bakes the factory modal seed (literal 0.6) into storage and the boot overlay', async () => {
	// The factory seed drives the FIRST-LAUNCH dialog fill. Both the
	// localStorage literal and the boot overlay alpha must carry the shipped
	// 0.6 (a "0.6" -> "0.3" swap stayed green on the whole suite before this).
	const overrides = new Map();
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: { '--dsw-alias-bg-base': '#0b0b0e', '--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)' } }, themes: [], revision: 1 }; },
		overrideTokens(source, tokens) { overrides.set(source, tokens); return () => {}; }
	};
	const h = buildSandbox();
	h.localStorage.removeItem('dsh-dream-skin:factory-applied'); // true first launch
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	e.apply({ ...baseCtx, theme });
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), '0.6', 'factory modal opacity seed is written on first launch (literal pin)');
	await sleep(20); // let the deferred overlay pass publish
	const entry = overrides.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(entry.dark, 'rgba(22, 22, 28, 0.6)', 'the boot overlay carries the factory-seeded alpha, not the 0.94 fallback');
});

/**
 * 9.26.1 remediation regression gates (adversarial review 9.26.0).
 * Helpers below reimplement the migration fingerprint in-test so a SYNTHETIC
 * legacy asset can drive the positive path (the real photo never re-enters
 * the test tree — fingerprints stay numeric).
 */
function cyrb53(str) {
	let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
	h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
	h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Synthetic legacy-factory-wallpaper fixture + bundle source whose
 * fingerprint constants are rewritten to match it. Entry 1 is the
 * v9.13.0-v9.23.0 stock photo, entry 2 the v9.24.0-v9.27.0 raster of the
 * abstract glow. If the literals move, this throws - which is itself the
 * drift signal the tests must not silently lose.
 */
const FP_LITERALS = {
	1: ["dataUrlLength: 115863", "byteLength: 86879,", "hash: 1042845555783671"],
	2: ["dataUrlLength: 9619", "byteLength: 7197,", "hash: 7481607271554265"]
};
function legacyFixture(entry = 1, size = 4096, fill = 0x5a) {
	const bin = Buffer.alloc(size, fill).toString("binary");
	const fixture = "data:image/jpeg;base64," + Buffer.from(bin, "binary").toString("base64");
	let patched = CODE;
	const [lenLit, byteLit, hashLit] = FP_LITERALS[entry];
	const subs = [
		[lenLit, "dataUrlLength: " + fixture.length],
		[byteLit, "byteLength: " + size + ","],
		[hashLit, "hash: " + cyrb53(bin)]
	];
	for (const [from, to] of subs) {
		assert.ok(CODE.includes(from), "fingerprint literal moved in client.js: " + from);
		patched = patched.replace(from, to);
	}
	return { fixture, patched };
}

test('migration fingerprint: a synthetic asset matching the triple IS replaced by the new factory image; same-length wrong-hash is not', () => {
	const { fixture, patched } = legacyFixture();
	const factoryImage = CODE.match(/\[WALLPAPER_KEY\]: "(data:[^"]+)"/)[1];

	// Positive path — the pre-settle migration must fire on a true fingerprint match.
	const h = buildSandbox({ code: patched, seed: { 'dsh-dream-skin:wallpaper': fixture } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), factoryImage, 'synthetic legacy asset migrated to the shipped image');

	// Hash gate — identical lengths (data URL + bytes), only the content hash differs.
	const almostBin = Buffer.alloc(4096, 0x5b).toString('binary');
	const almost = 'data:image/jpeg;base64,' + Buffer.from(almostBin, 'binary').toString('base64');
	assert.equal(almost.length, fixture.length, 'wrong-hash case keeps the exact fixture length');
	const h2 = buildSandbox({ code: patched, seed: { 'dsh-dream-skin:wallpaper': almost } });
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	e2.apply(makeApplyContext(h2));
	assert.equal(h2.localStorage.getItem('dsh-dream-skin:wallpaper'), almost, 'same-length different-content must survive the hash gate');
});

test('migration fingerprint (entry 2): the shipped raster of the glow IS replaced; same-length wrong-hash is not', () => {
	// The v9.24.0-v9.27.0 factory image is a 1200x678 JPEG whose macroblocks
	// read as squares once `background-size: cover` upscales it on a 2K screen,
	// so 9.27.1 swaps it for the inline-SVG default. Same triple-fingerprint
	// discipline as entry 1: only the exact shipped asset moves.
	const { fixture, patched } = legacyFixture(2, 5120, 0x69);
	const factoryImage = CODE.match(/\[WALLPAPER_KEY\]: "(data:[^"]+)"/)[1];
	const h = buildSandbox({ code: patched, seed: { 'dsh-dream-skin:wallpaper': fixture } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), factoryImage, 'entry-2 legacy raster migrated to the vector default');

	// Same length, same decoded byte length, different content: hash gate holds.
	const almost = 'data:image/jpeg;base64,' + Buffer.alloc(5120, 0x6a).toString('base64');
	assert.equal(almost.length, fixture.length, 'wrong-hash case keeps the exact fixture length');
	const h2 = buildSandbox({ code: patched, seed: { 'dsh-dream-skin:wallpaper': almost } });
	h2.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(h2));
	assert.equal(h2.localStorage.getItem('dsh-dream-skin:wallpaper'), almost, 'same-length different-content must survive the hash gate');
});

test('factory wallpaper asset invariants: inline vector, sized, stitched, under budget', () => {
	// The whole point of the 9.27.1 swap is that a fixed-resolution raster
	// cannot stay smooth once the cover layer upscales it; these assertions
	// fail the day someone re-ships a JPEG/PNG/WebP as the factory default.
	const uri = CODE.match(/\[WALLPAPER_KEY\]: "(data:[^"]+)"/)[1];
	assert.ok(uri.startsWith('data:image/svg+xml;base64,'), 'factory wallpaper must be inline SVG, not a resolution-bound raster');
	const svg = Buffer.from(uri.slice('data:image/svg+xml;base64,'.length), 'base64').toString('utf8');
	assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), 'background-image SVGs need the xmlns or they render blank');
	const dims = svg.match(/width="(\d+)" height="(\d+)"/);
	assert.ok(dims, 'the SVG must declare an intrinsic size for background-size: cover');
	assert.ok(Number(dims[1]) * 9 === Number(dims[2]) * 16, `intrinsic ratio must be 16:9, got ${dims[1]}x${dims[2]}`);
	assert.ok(Number(dims[1]) >= 1600, 'intrinsic width must be at least 1600 so the cover layer never upscales a raster');
	assert.ok(svg.includes('stitchTiles="stitch"'), 'the dither tile must stitch or the grain shows a seam lattice');
	assert.ok(/stop-opacity="0"/.test(svg), 'every glow must fade to zero opacity, else the blob edge shows as a ring');
	assert.ok(Buffer.byteLength(svg, 'utf8') < 5120, `asset budget exceeded: ${Buffer.byteLength(svg, 'utf8')}B (the raster it replaced was 7197B)`);
});

test('drift probe (desktop shell): probed covers the gated anchor, drifted stays raw selectors, console keeps the label (B-08)', async () => {
	const warns = [];
	const doc = {
		body: Object.assign(makeEl(), { getAttribute: (k) => (k === 'data-dsh-desktop-mode' ? 'advanced' : null) }),
		createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => (sel === '.dshDesktopSidebarSurface' ? null : { matched: true }),
		querySelectorAll: () => [], head: makeEl()
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	// Mid-ladder (FAST patch: rounds fire at 0/20/50/90ms — this sample lands
	// after round 2 but BEFORE the final): liveness is already proven here,
	// yet only the FINAL round may deliver a conclusive drifted verdict.
	// Without this pin, `conclusive = liveness` (gate drop) is invisible.
	await sleep(40);
	const mid = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(mid.anchors.pending, true, 'an intermediate round stays pending even with liveness proven');
	assert.deepEqual(mid.anchors.drifted, [], 'no drift verdict before the ladder completes');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 0, 'intermediate rounds stay silent');
	await sleep(250);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.shell, 'desktop', 'desktop shell detected via the documented body stamp');
	assert.equal(status.anchors.probed, 7, 'six host hashes + the gated desktop anchor');
	// A-1 acceptance case ③ (desktop variant): liveness IS proven (host
	// contract stamp + all six host anchors hit), so the single unmatched
	// group may be called drifted — with the machine field kept an exact
	// raw selector and the human label staying in the console line.
	assert.equal(status.anchors.pending, false, 'liveness proven + chain converged → conclusive');
	assert.deepEqual(status.anchors.drifted, ['.dshDesktopSidebarSurface'], 'only the desktop anchor drifted; entries stay valid raw selectors');
	assert.ok(warns.some((w) => w.includes('desktop shell sidebar surface')), 'human label survives in the console line');
});

test('drift probe (A-1): full host match converges to a conclusive zero-drift verdict', async () => {
	// A-1 acceptance case ②: sentinel hits and every anchor matches — the
	// ONLY shape that may publish `drifted: [] && pending: false`.
	const warns = [];
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: () => ({ matched: true }), querySelectorAll: () => [], head: makeEl()
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, false, 'liveness proven via matched host anchors');
	assert.deepEqual(status.anchors.drifted, [], 'every refinement confirmed live');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 0, 'a clean verdict never warns');
});

test('drift probe (A-1): one replaced anchor group is reported as exactly that group', async () => {
	// A-1 acceptance case ③ (web variant): five host groups mount (liveness
	// proven), the sixth never appears — drifted must contain EXACTLY that
	// group's raw selector, nothing else.
	const warns = [];
	const driftedSel = '.qDHVXG_fade';
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => (sel === driftedSel ? null : { matched: true }),
		querySelectorAll: () => [], head: makeEl()
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, false, 'liveness proven (five groups matched ≥ the two-group gate)');
	assert.deepEqual(status.anchors.drifted, [driftedSel], 'drifted lists exactly the one unmatched group');
	assert.ok(warns.some((w) => w.includes(driftedSel)), 'the console line names the drifted group');
	// B8: "harmless, cosmetic only" is only true for the anchors the probe samples. The
	// question / approval / plan cards mount on demand and are NOT in the probe, so the
	// human-facing line has to say where its own authority ends.
	assert.ok(warns.some((w) => w.includes('NOT probed') && w.includes('question / approval / plan')),
		'the console line declares its own coverage limit instead of implying every refinement was checked');
});

test('drift probe (T3): a group the HOST CSS still owns is notMounted, not drifted (ownership classifier)', async () => {
	// T3 (adversarial review 10.5.0): after the ladder ends, "0 hits" has two
	// causes — a renamed hash vs a surface this page never mounted — and the old
	// merged `drifted` field mislabeled the second as the first. The
	// discriminator is host ownership: a group whose class token appears in a
	// HOST-OWNED stylesheet (`style[data-plugin-css]`, the attribute the host's
	// css loader stamps on its own chunks) is a healthy-but-unmounted surface;
	// a group no host sheet vouches for is drift.
	//
	// The fixture also carries OUR sheet — it REALLY DOES contain the dead
	// hashes (they are the legacy branches of the material rules) — and answers
	// the bare `"style"` selector with it. That is the M21 differential: if the
	// classifier ever drops the `[data-plugin-css]` qualifier, our own sheet
	// would vouch for our own dead selectors and this test goes red.
	const warns = [];
	const hostSheet = makeEl();
	hostSheet.textContent = '.lXshSW_root{display:block}.host-other-chunk{color:red}';
	const ourSheet = makeEl();
	ourSheet.textContent = '.bqrRRG_card{padding:0}.qDHVXG_fade{opacity:1}.nArs4W_panel{background:none}';
	const MOUNTED = new Set([
		'.uV2eYG_root',
		'.hHd-Xa_root .hHd-Xa_footArea, .hHd-Xa_root .hHd-Xa_settingsArea, .hHd-Xa_root .hHd-Xa_footerActions'
	]);
	const observers = [];
	class FakeMO {
		constructor(cb) { this.cb = cb; observers.push(this); }
		observe() {}
		disconnect() { this.disconnected = true; }
	}
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
		querySelector: (sel) => (MOUNTED.has(sel) ? { matched: true } : null),
		querySelectorAll: (sel) => {
			if (sel === 'style[data-plugin-css]') return [hostSheet];
			if (sel === 'style') return [hostSheet, ourSheet];
			return [];
		}
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: FakeMO, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250); // FAST ladder terminal ≈160ms — deliberately past it
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(t0.anchors.pending, false, 'terminal verdict reached (liveness via the two mounted groups)');
	assert.deepEqual(t0.anchors.notMounted, ['.lXshSW_root, ._7yHdaG_panel'],
		'the group the host CSS still owns reads notMounted — a healthy host that never opened that surface');
	assert.deepEqual(t0.anchors.drifted,
		['.bqrRRG_card', '.nArs4W_panel, .nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody', '.qDHVXG_fade'],
		'groups no host sheet vouches for stay drifted (our own sheet earns nothing — legacy branches are not host ownership)');
	const driftWarns = warns.filter((w) => w.includes('drifted'));
	assert.equal(driftWarns.length, 1, 'the drift warn fires once for the renamed hashes');
	assert.ok(driftWarns[0].includes('.bqrRRG_card'), 'the warn names the drifted groups');
	assert.ok(!driftWarns[0].includes('lXshSW'), 'an unmounted-but-owned surface is NOT an alarm');
	assert.ok(observers.length >= 1, 'late-correction observer armed after a drifted terminal');
});

test('drift probe (T3): a surface mounting late leaves the notMounted pool through the same one-way observer', async () => {
	// T3 second half: the notMounted pool is not a life sentence. When the
	// surface DOES mount after the terminal verdict (user opens settings a
	// minute in), the debounced resample retracts it from notMounted — the
	// drifted pool is untouched, nothing is ever added, and the warn does not
	// repeat.
	const warns = [];
	const hostSheet = makeEl();
	hostSheet.textContent = '.lXshSW_root{display:block}';
	const ourSheet = makeEl();
	ourSheet.textContent = '.bqrRRG_card{padding:0}';
	const LATE_GROUP = '.lXshSW_root, ._7yHdaG_panel';
	const MOUNTED = new Set([
		'.uV2eYG_root',
		'.hHd-Xa_root .hHd-Xa_footArea, .hHd-Xa_root .hHd-Xa_settingsArea, .hHd-Xa_root .hHd-Xa_footerActions'
	]);
	const observers = [];
	class FakeMO {
		constructor(cb) { this.cb = cb; observers.push(this); }
		observe() {}
		disconnect() { this.disconnected = true; }
	}
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
		querySelector: (sel) => (MOUNTED.has(sel) ? { matched: true } : null),
		querySelectorAll: (sel) => {
			if (sel === 'style[data-plugin-css]') return [hostSheet];
			if (sel === 'style') return [hostSheet, ourSheet];
			return [];
		}
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: FakeMO, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250);
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.deepEqual(t0.anchors.notMounted, [LATE_GROUP], 'terminal snapshot names the unmounted group');
	assert.deepEqual(t0.anchors.drifted.length, 3, 'three renamed groups drifted');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 1, 'terminal drift warns once');
	// User opens the surface "a minute later": the group mounts, DOM mutates.
	MOUNTED.add(LATE_GROUP);
	for (const o of observers) o.cb([]);
	await sleep(400); // debounce (300ms) + resample
	const t1 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.deepEqual(t1.anchors.notMounted, [], 'the late mount retracts the notMounted entry (one-way improvement)');
	assert.deepEqual(t1.anchors.drifted, t0.anchors.drifted, 'the drifted pool is untouched by a notMounted retraction');
	assert.equal(t1.anchors.pending, false, 'the corrected snapshot stays conclusive');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 1, 'correction never re-warns');
});

test('drift probe (R-4): the ladder array is RELATIVE gaps — an early terminal would change observable state', async () => {
	// R-4 (external review 9.27.0 round 2) renamed the constant and fixed the
	// docs; the ROUND-3 re-check (S-1's "reverse-check the attribution claims"
	// rule applied to ourselves) showed the rename had NO behavioural pin at
	// all: reading the array as absolute timestamps while keeping the literal
	// `[0, 300, 1000, 3000]` left the whole suite green. This test supplies
	// that pin, in the shape the array semantics demand — a MID sample that
	// only holds under the gap reading, plus the terminal sample.
	// Ladder patched to three 400ms gaps: under the GAP reading the rounds land
	// at ≈0/400/800/1200ms, so at ≈700ms the chain is still undecided. Under the
	// ABSOLUTE reading the same array means gaps of 0/400/0/0 — the terminal
	// verdict would already be published by ≈450ms, and the mid assertions below
	// go red. Margins are ≥250ms on both sides so a loaded runner cannot flip it.
	const code = CODE.replace('[0, 300, 1000, 3000]', '[0, 400, 400, 400]');
	if (code === CODE) throw new Error('ladder anchor moved — update the R-4 semantics test');
	const driftedSel = '.qDHVXG_fade';
	const warns = [];
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => (sel === driftedSel ? null : { matched: true }),
		querySelectorAll: () => [], head: makeEl()
	};
	const h = buildSandbox({ code, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(700);
	// MID SAMPLE: still inside the ladder — no conclusive verdict, no warn.
	const mid = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(mid.anchors.pending, true, 'MID: round 3 of 4 has not run yet under the gap reading (an absolute reading would already be terminal)');
	assert.deepEqual(mid.anchors.drifted, [], 'MID: nothing is blamed while the chain is open');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 0, 'MID: an undecided round stays silent');
	await sleep(700);
	// TERMINAL SAMPLE: ≈1200ms cumulative, liveness proven → conclusive.
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(t0.anchors.pending, false, 'TERMINAL: the ladder completed');
	assert.deepEqual(t0.anchors.drifted, [driftedSel], 'TERMINAL: names exactly the missing group');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 1, 'TERMINAL: warns once, only after the last gap');
});

test('drift probe (R-2): a surface mounting AFTER the terminal verdict retracts via the late-correction observer', async () => {
	// External review R-2 (9.27.0 round 2): hit-once memory only covers the
	// ladder window — a settings surface opened a minute later used to be
	// permanently mis-judged drifted with the warning already emitted. After
	// a terminal drifted verdict a body MutationObserver re-samples
	// (debounced) and the verdict may only IMPROVE: mounted groups retract,
	// the warn is never repeated, and the observer disarms once clean.
	const warns = [];
	let mounted = false;
	const observers = [];
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => (sel.startsWith('.hHd-Xa_root') && !mounted ? null : { matched: true }),
		querySelectorAll: () => [], head: makeEl()
	};
	class FakeMO {
		constructor(cb) { this.cb = cb; observers.push(this); }
		observe() {}
		disconnect() { this.disconnected = true; }
	}
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: FakeMO, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250); // FAST ladder terminal ≈160ms — deliberately past it
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(t0.anchors.pending, false, 'terminal verdict reached');
	assert.deepEqual(t0.anchors.drifted, ['.hHd-Xa_root .hHd-Xa_footArea, .hHd-Xa_root .hHd-Xa_settingsArea, .hHd-Xa_root .hHd-Xa_footerActions'], 'group missing at terminal is named');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 1, 'terminal drift warns exactly once');
	assert.ok(observers.length >= 1, 'late-correction observer armed after a drifted terminal');
	// User opens settings "a minute later": the surface mounts, DOM mutates.
	mounted = true;
	for (const o of observers) o.cb([]);
	await sleep(400); // debounce (300ms) + resample
	const t1 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.deepEqual(t1.anchors.drifted, [], 'late mount retracts the drifted verdict (one-way improvement)');
	assert.equal(t1.anchors.pending, false, 'the corrected snapshot stays conclusive');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 1, 'correction never re-warns');
});

test('drift probe (S-3): fiber unload disarms the late-correction observer and freezes the verdict', async () => {
	// External review S-3 (9.27.0 round 3): teardownMaterial only dropped the
	// <style> node, so an observer armed by a terminal drifted verdict kept
	// sampling document.body after the fiber unloaded — residue the project's
	// "unload leaves nothing behind" tenet does not allow. Two halves are
	// pinned here: the observer is disconnected on unload, AND (the part that
	// actually matters to the machine-readable contract) a DOM change after
	// unload can no longer mutate the snapshot.
	// Two other observers exist in every sandbox (the boot-level DOM guard armed
	// at module load, and the composer marker, which watches documentElement).
	// The unit under test is the LATE-CORRECTION one: armed after apply() and
	// bound to document.body — so filter on exactly that.
	const lateMOs = (observers, baseLen, doc) => observers.slice(baseLen).filter((o) => o.target === doc.body);
	let mounted = false;
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => (((sel.startsWith('.hHd-Xa_root') || sel === '.qDHVXG_fade') && !mounted) ? null : { matched: true }),
		querySelectorAll: () => [], head: makeEl()
	};
	const observers = [];
	class FakeMO {
		constructor(cb) { this.cb = cb; observers.push(this); }
		observe(target, opts) { this.target = target; this.opts = opts; }
		disconnect() { this.disconnected = true; }
	}
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: FakeMO, console: { warn() {}, log() {}, error() {} } });
	const baseLen = observers.length; // the boot guard is already armed at module load
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250); // FAST ladder terminal ≈160ms — deliberately past it
	// MID SAMPLE: while the fiber is mounted the observer is alive.
	assert.equal(lateMOs(observers, baseLen, doc).length, 1, 'terminal drifted verdict armed exactly one observer');
	assert.notEqual(lateMOs(observers, baseLen, doc)[0].disconnected, true, 'the observer is live while the fiber is mounted');
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	const driftedBefore = t0.anchors.drifted.slice();
	assert.equal(t0.anchors.pending, false, 'terminal verdict reached');
	assert.equal(driftedBefore.length, 2, 'two surfaces still missing at terminal (settings area + fade)');
	// UNMOUNT: run every disposer the harness collected, as the real host does.
	for (const d of h.disposers || []) d();
	assert.equal(lateMOs(observers, baseLen, doc)[0].disconnected, true, 'unload disconnects the late-correction observer');
	// TERMINAL SAMPLE: the surfaces now mount, and every observer in the sandbox
	// is poked — a stale (disconnected) callback must not reach the snapshot.
	mounted = true;
	for (const o of observers) o.cb([]);
	await sleep(400); // debounce (300ms) + resample would have run twice over
	const t1 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.deepEqual(t1.anchors.drifted, driftedBefore, 'an unloaded plugin publishes NOTHING - the verdict is frozen, not improved');
});

test('drift probe (S-3): a re-applied probe supersedes the live observer instead of stacking a second one', async () => {
	// S-3 second half: every apply() builds a fresh probe closure, so without a
	// single-owner handle a second chain could arm a second body observer while
	// the first is still live (two independent samplers, ~7.5s of sampling each).
	const lateMOs = (observers, baseLen, doc) => observers.slice(baseLen).filter((o) => o.target === doc.body);
	const missing = '.qDHVXG_fade';
	let mounted = false;
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => (sel === missing && !mounted ? null : { matched: true }),
		querySelectorAll: () => [], head: makeEl()
	};
	const observers = [];
	class FakeMO {
		constructor(cb) { this.cb = cb; observers.push(this); }
		observe(target, opts) { this.target = target; this.opts = opts; }
		disconnect() { this.disconnected = true; }
	}
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, MutationObserver: FakeMO, console: { warn() {}, log() {}, error() {} } });
	const baseLen = observers.length;
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250);
	assert.equal(lateMOs(observers, baseLen, doc).length, 1, 'first chain armed one observer');
	assert.notEqual(lateMOs(observers, baseLen, doc)[0].disconnected, true, 'and it is still live (no unload happened)');
	// Re-apply WITHOUT unmounting (the host can re-enter apply()). ensureMaterialStyle
	// keeps its <style> node, so a chain only re-arms once that node has actually
	// left the document — which is the real scenario this pins: a host hot reload /
	// head rebuild that dropped our sheet while the previous probe chain is still
	// live. Detach it the way the DOM would, then re-apply.
	h.document.head.children.slice().forEach((node) => node.remove());
	e.apply(makeApplyContext(h));
	await sleep(250);
	const armed = lateMOs(observers, baseLen, doc);
	const live = armed.filter((o) => !o.disconnected);
	assert.ok(armed.length >= 2, 'the second chain reached its own terminal drifted verdict and armed its observer');
	assert.equal(live.length, 1, 'at most ONE live late-correction observer per page');
	assert.equal(live[0], armed[armed.length - 1], 'the survivor is the newest chain');
	// The superseded observer must be INERT, not merely disconnected: poking it
	// may not publish anything.
	mounted = true;
	for (const o of observers) o.cb([]);
	await sleep(400);
	assert.deepEqual(h.window.__DSH_DREAM_SKIN_STATUS__.anchors.drifted, [], 'the live chain retracts the late mount, exactly once and by itself');
});

test('drift probe (T-1): fiber unload cancels the ladder timer that is still armed', async () => {
	// External review T-1 (9.27.0 round 4): S-3 gave teardown the
	// late-correction observer, but scheduleNext() threw its setTimeout handle
	// away — so unmounting inside the ~4.3s window left the remaining rounds
	// armed and a dead plugin kept rewriting `checkedAt`. "Unload leaves no
	// residue" has TWO halves and they are pinned by two separate cases on
	// purpose (round-3 S-1: two assertions inside one case let the first
	// failure hide the second). THIS case pins the cancellation; the next one
	// pins the gate that clearTimeout cannot cover.
	// Delays are values no other subsystem timer in this sandbox uses, and long
	// enough that the chain cannot finish while the test runs.
	const code = CODE.replace('[0, 300, 1000, 3000]', '[0, 4321, 5432, 6543]');
	if (code === CODE) throw new Error('ladder anchor moved — update the T-1 cancellation test');
	const armed = [];
	const cleared = [];
	const h = buildSandbox({
		code,
		setTimeout: (fn, ms) => { const id = setTimeout(fn, ms); armed.push({ id, ms }); return id; },
		clearTimeout: (id) => { cleared.push(id); clearTimeout(id); },
		console: { warn() {}, log() {}, error() {} }
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(30); // round 1 ran synchronously; the 4321ms gap is now armed
	const ladder = armed.filter((t) => t.ms === 4321);
	assert.equal(ladder.length, 1, 'the mounted ladder armed exactly one pending round, gaps seen: ' + armed.map((t) => t.ms).join(','));
	for (const d of h.disposers || []) d();
	assert.ok(cleared.includes(ladder[0].id), 'unload CANCELS the armed drift-ladder timer (S-3 was only half done)');
});

test('drift probe (T-1): a step that slips past unload publishes nothing and arms nothing further', async () => {
	// The other half, and the reason a clearTimeout is not enough on its own:
	// once a timer has fired, its handle is consumed, so an unmount landing in
	// that same tick cancels nothing and the in-flight step re-arms the rest of
	// the chain from a plugin that no longer exists. This drives exactly that
	// slip — it unmounts while round 2 is armed, then runs that step by hand —
	// and asserts BOTH observable consequences: the machine-readable snapshot
	// object is not even replaced (any publish allocates a new one, so this is
	// insensitive to Date.now() resolution), and nothing new got armed.
	// The second assertion is what pins the gate's POSITION, not just its
	// existence: a guard inside runRound() also publishes nothing, but the step
	// still reaches scheduleNext() and arms the remaining rounds from a dead
	// fiber. That shape was run as an experiment in the copy tree and its ONLY
	// red is exactly this assertion — the publish assertion above stays green,
	// which is why the position claim could not have been made from it.
	const code = CODE.replace('[0, 300, 1000, 3000]', '[0, 4321, 5432, 6543]');
	if (code === CODE) throw new Error('ladder anchor moved — update the T-1 slip-through test');
	const armed = [];
	const h = buildSandbox({
		code,
		setTimeout: (fn, ms) => { const id = setTimeout(fn, ms); armed.push({ id, ms, fn }); return id; },
		console: { warn() {}, log() {}, error() {} }
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	// Round 1 ran synchronously; round 2 is the 4321ms timer still in the queue.
	const slip = armed.filter((t) => t.ms === 4321);
	assert.equal(slip.length, 1, 'round 2 is armed and untouched by the test clock, gaps: ' + armed.map((t) => t.ms).join(','));
	const before = h.window.__DSH_DREAM_SKIN_STATUS__;
	for (const d of h.disposers || []) d();
	assert.equal(h.window.__DSH_DREAM_SKIN_STATUS__, before, 'unmount itself publishes nothing');
	const armedBefore = armed.length;
	slip[0].fn(); // the race: this step already left the timer queue
	assert.equal(h.window.__DSH_DREAM_SKIN_STATUS__, before, 'an unloaded plugin publishes NOTHING through the ladder either');
	assert.equal(armed.length, armedBefore, 'and the slipped step arms NOTHING further — the chain died with the fiber');
});

test('drift probe (T-1): a re-applied ladder supersedes the previous chain instead of stacking a second one', async () => {
	// The single-owner rule S-3 established for observers has to hold for the
	// ladder too, or a host that re-enters apply() mid-window gets two
	// independent chains sampling the DOM and both writing the snapshot.
	// Invariant order is deliberate: the behavioral half (the stale chain must
	// be INERT, not merely cancelled) is asserted first, so a break of the
	// cancellation half still gets its turn to speak (round-3 S-1 lesson).
	const code = CODE.replace('[0, 300, 1000, 3000]', '[0, 4321, 5432, 6543]');
	if (code === CODE) throw new Error('ladder anchor moved — update the T-1 supersede test');
	const armed = [];
	const cleared = [];
	const h = buildSandbox({
		code,
		setTimeout: (fn, ms) => { const id = setTimeout(fn, ms); armed.push({ id, ms, fn }); return id; },
		clearTimeout: (id) => { cleared.push(id); clearTimeout(id); },
		console: { warn() {}, log() {}, error() {} }
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(20);
	const first = armed.filter((t) => t.ms === 4321);
	assert.equal(first.length, 1, 'the first chain armed one pending round');
	// Drop the injected <style> node from the document, exactly as a host head
	// rebuild would: that is the only state in which ensureMaterialStyle
	// re-injects and therefore re-arms a chain while the old one is still live.
	h.document.head.children.slice().forEach((node) => node.remove());
	e.apply(makeApplyContext(h));
	await sleep(20);
	assert.equal(armed.filter((t) => t.ms === 4321).length, 2, 'the second chain armed its own round instead of being swallowed');
	const before = h.window.__DSH_DREAM_SKIN_STATUS__;
	first[0].fn(); // whatever the stale chain still believes it should do
	assert.equal(h.window.__DSH_DREAM_SKIN_STATUS__, before, 'the superseded chain publishes NOTHING');
	assert.ok(cleared.includes(first[0].id), 'and its pending timer was cancelled at the new chain, not left to fire');
});

test('drift probe (A-1): a late-mounting surface clears itself from the drifted list', async () => {
	// The settings-area group only mounts when the user opens settings —
	// possibly after the whole checkpoint ladder. Hit-once memory means any
	// round that sees it retracts the pending flag for that group; the FINAL
	// verdict must not blame a surface that mounted late. Here the group
	// appears at ~15ms (inside the FAST ladder window).
	const start = Date.now();
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => {
			if (sel.startsWith('.hHd-Xa_root') && Date.now() - start < 60) return null;
			return { matched: true };
		},
		querySelectorAll: () => [], head: makeEl()
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn() {}, log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await sleep(250);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, false, 'chain converged after the late mount');
	assert.deepEqual(status.anchors.drifted, [], 'a surface that mounted at ANY round is not drifted (hit-once memory)');
});

test('diagnostics: later re-publishes keep the drift anchors via prev-merge (status never downgrades itself)', async () => {
	const h = buildSandbox({ code: FAST_DRIFT_CODE, seed: { 'dsh-dream-skin:skin': 'abyss' } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h, { captureActions: true })));
	await sleep(250);
	const before = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.ok(before.anchors && before.checkedAt, 'anchors + timestamp from the boot probe');
	h.actionBags['dream-skin'].setSkin('ember');
	const after = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(after.skin, 'ember', 'skin refreshed by the re-publish');
	assert.deepEqual(after.anchors, before.anchors, 'anchors survive the re-publish (prev-merge)');
	assert.equal(after.checkedAt, before.checkedAt, 'probe timestamp survives the re-publish');
});

test('migration fingerprint constants are pinned (changing the shipped asset requires a new triple, not a silent edit)', () => {
	assert.equal(CODE.includes('dataUrlLength: 115863'), true);
	assert.equal(CODE.includes('byteLength: 86879,'), true);
	assert.equal(CODE.includes('hash: 1042845555783671'), true);
	// The triple's REAL correctness gate is the fixture-recomputation test in
	// client.persistence.test.cjs; this pin only guards silent edits.
	assert.equal(CODE.includes('dataUrlLength: 9619, byteLength: 7197, hash: 7481607271554265'), true, 'entry 2 (the 9.24-9.27 glow raster) must keep its full triple');
	assert.equal(CODE.match(/dataUrlLength: \d+, byteLength: \d+, hash: \d+/g).length, 2, 'exactly two legacy fingerprints ship');
	assert.ok(!/data:image\/jpeg;base64,[A-Za-z0-9+\/=]{500,}/.test(CODE.match(/\[WALLPAPER_KEY\]: "(data:[^"]+)"/)[1]), 'the shipped default must not be a raster literal again');
});

test('schema guard (B-3): ready and degraded snapshots expose EXACTLY the same key set', () => {
	// docs/desktop-support.md promises "字段集完全一致、消费方永不撞
	// undefined". The only way that promise stays true is an executed
	// equality check — adding a field to ONE snapshot (either side) reddens
	// this, which is precisely the one-sided drift B-3 reported.
	const degradedSrc = CODE.match(/window\[STATUS_GLOBAL_KEY\] = \{([\s\S]*?)\};/);
	assert.ok(degradedSrc, 'degraded inline snapshot literal found');
	const degradedKeys = [...degradedSrc[1].matchAll(/^\s*([A-Za-z]+):/gm)].map((m) => m[1]);
	assert.ok(degradedKeys.length >= 8, 'degraded snapshot keeps its full field set');
	const ready = buildSandbox({});
	const e = ready.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(ready));
	const readyKeys = Object.keys(ready.window.__DSH_DREAM_SKIN_STATUS__);
	assert.deepEqual(readyKeys.slice().sort(), degradedKeys.slice().sort(), 'ready and degraded expose the identical key set');
});

test('gradient guard (A-2.1): CSS-escape and comment smuggling are refused at the write gate', () => {
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h, { captureActions: true })));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];
	const KEY = 'dsh-dream-skin:wallpaper-gradient';
	// Every one of these decodes to a value containing `url(` (or otherwise
	// an external reference) once the CSSOM parser resolves escapes — the
	// pre-A-2 denylist ran on the RAW string and waved all of them through.
	// B = literal backslash: CSS escapes must be REAL backslashes in the
	// value (JS `\\75` writes one, but constructing via a constant keeps the
	// vectors honest and immune to string-escape confusion — the round-1
	// "variant ③" was accidentally `ul:` because `\72` is a JS colon).
	const B = String.fromCharCode(92);
	const LF = "\n";
	const CR = String.fromCharCode(13);
	const FF = String.fromCharCode(12);
	// The smuggle list carries TWO decodable spellings of "url(": `${B}a`
	// (CSS escape text — decodes through the hex branch, so it reddens the
	// R-1 deletion fix) and the real control char `a`/CR/FF (the escape
	// TEXT's own character, which the pre-normalization raw fence already
	// refuses — honest redundancy, it pins the fence instead of the decoder).
	//
	// ONE VECTOR BELONGS ON THIS LIST'S OPPOSITE SIDE (reviewer's own round-3
	// correction, and we re-derived it): `ul\a rl(` is NOT a smuggle. `\a`
	// decodes to a newline only INSIDE the identifier, so CSS reads it as
	// `ulrl(` — a function name that does not exist. Do not "fix" a red test by
	// adding it to the must-refuse table; the honest spelling of that attack is
	// `${B}75${B}a rl(` below, where the escape consumes the `a` and the
	// continuation joins `u`+`rl`+`(` back into `url(`.
	const smuggles = [
		`linear-gradient(${B}75 rl("http://evil.invalid/ping"), red)`, // \75 + space-terminator
		`linear-gradient(${B}000075rl("http://evil.invalid/ping"), red)`, // full 6-digit form
		`/*x*/linear-gradient(red, blue), ${B}75${B}rl("http://evil.invalid/ping")`, // comment + \<LF> continuation
		`linear-gradient(red, blue), ${B}75${B}72${B}6c("http://evil.invalid/ping")`, // fully escaped u-r-l
		`linear-gradient(red, ${B}75${B}a rl("http://evil.invalid/ping"))`, // R-1: \a must DELETE (continuation), not insert \n
		`linear-gradient(red, ${B}75${B}${LF}rl("http://evil.invalid/ping"))`, // \<LF> with a REAL newline after the backslash (what `\` + literal-n looks like to a CSS lexer)
		`linear-gradient(red, ${B}75${B}A rl("http://evil.invalid/ping"))`, // R-1: uppercase \A twin
		`linear-gradient(red, ${B}75${B}a${B}a rl("http://evil.invalid/ping"))`, // R-1: doubled \a
		`linear-gradient(red, ${B}75${B}d rl("http://evil.invalid/ping"))`, // R-1: \d (CR) twin — decodes to a real control char, caught by the normalized-form fence
		`linear-gradient(red, ${B}75${B}c rl("http://evil.invalid/ping"))`, // R-1: \c (FF) twin, same route
		`linear-gradient(red, ${B}75${B}${CR}rl("http://evil.invalid/ping"))`, // reviewer's \<CR> vector — REAL CR after the backslash (`${B}cr` would decode to 'c', not CR)
		`linear-gradient(red, ${B}75${B}${FF}rl("http://evil.invalid/ping"))`, // \<FF> literal-continuation twin
		`linear-gradient(red, ${B}2${B}0rl("http://evil.invalid/ping"))`, // R-1 double gate: decode introduces NUL → normalized-form control fence
		'linear-gradient(red, blue), \\75\\72\\6c("http://evil.invalid/ping")' // raw-source twin of the u-r-l vector
	];
	for (const value of smuggles) {
		adv.setGradient(value);
		assert.equal(h.localStorage.getItem(KEY), null, 'escape smuggle must not persist: ' + JSON.stringify(value));
	}
	// A literal control character is still rejected (the pre-existing gate).
	adv.setGradient('linear-gradient(red,\u0001blue)');
	assert.equal(h.localStorage.getItem(KEY), null, 'raw control char rejected');
	// Honest gradients — including the multi-layer factory glow — pass.
	adv.setGradient('linear-gradient(135deg, #000 0%, #fff 100%)');
	assert.equal(h.localStorage.getItem(KEY), 'linear-gradient(135deg, #000 0%, #fff 100%)', 'plain gradient unaffected');
});

test('gradient guard (R-1/S-1): normalization must not over-refuse honest escape spellings', () => {
	// S-1 (external review 9.27.0 round 3): these two assertions LOOK alike and
	// are not alike — each owns exactly one mutation red, and they own DIFFERENT
	// mutations (measured in isolation):
	//   * A (`linear-gradient\28 …`, `\28` decodes to `(`) reddens when
	//     NORMALIZATION IS BYPASSED and the checks run on the raw string again —
	//     the literal backslash no longer matches the
	//     `^(linear|radial|conic)-gradient\(` allowlist. R-1a cannot touch A at
	//     all (0x28 is not a newline), so A has NO power over the delete
	//     direction. The round-2 response report claimed both pinned it; that
	//     attribution was wrong and is corrected here.
	//   * B (`,\a\a `) is the ONLY assertion that reddens under R-1a: inserting
	//     the decoded newline back puts a real \n into the normalized form, and
	//     the control-char fence then refuses an honest value. Deleting B as "a
	//     duplicate of A" would make R-1a permanently green — CONTRIBUTING
	//     admission rule (1)'s second documented death mode ("the assertion
	//     covers only half the fix").
	// They live in their OWN test on purpose: inside the smuggle test the first
	// failing vector aborts the run, so A's and B's distinct reds are invisible
	// there (that masking is how the wrong attribution survived a whole round).
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h, { captureActions: true })));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];
	const KEY = 'dsh-dream-skin:wallpaper-gradient';
	const B = String.fromCharCode(92);
	adv.setGradient(`linear-gradient${B}28 135deg, #000 0%, #fff 100%)`);
	assert.equal(h.localStorage.getItem(KEY), `linear-gradient${B}28 135deg, #000 0%, #fff 100%)`, 'A: escaped-paren honest value still adopts (pins normalization-applied)');
	adv.setGradient(`linear-gradient(red, blue),${B}a${B}a linear-gradient(#000, #fff)`);
	assert.equal(h.localStorage.getItem(KEY), `linear-gradient(red, blue),${B}a${B}a linear-gradient(#000, #fff)`, 'B: continuation-escape honest value still adopts (the only red for the delete-vs-insert direction)');
});

test('gradient guard (A-2.2): legacy -webkit- prefixes are a DECLINED policy, refused at write', () => {
	// Decision recorded in docs/desktop-support.md: the runtime is evergreen
	// Chromium; `-webkit-linear-gradient` is a different (legacy) grammar and
	// is NOT admitted. This assertion pins the decision either way — if the
	// policy flips to "admit", this test must flip with it deliberately.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h, { captureActions: true })));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];
	adv.setGradient('-webkit-linear-gradient(135deg, #000, #fff)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), null, '-webkit prefix gradient is refused');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient'), null, '-webkit prefix gradient not persisted');
});

test('render gate (A-2.2): an unsafe stored gradient is ignored WITH a visible console.warn', () => {
	// #50/#51 philosophy: a value the render gate refuses must degrade
	// VISIBLY, not silently blank the wallpaper. Stored junk never reaches
	// element style, and exactly one warn names what was ignored.
	const warns = [];
	const created = [];
	const doc = {
		body: makeEl(), createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl()
	};
	const bad = 'radial-gradient(circle, red, blue), url("http://evil.invalid/ping")';
	const h = buildSandbox({
		document: doc,
		console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} },
		seed: { 'dsh-dream-skin:wallpaper-kind': 'gradient', 'dsh-dream-skin:wallpaper-gradient': bad }
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	const leaks = created.filter((el) => Object.values(el.style).some((v) => typeof v === 'string' && v.includes('evil.invalid')));
	assert.equal(leaks.length, 0, 'the unsafe value still never reaches any element style');
	assert.ok(warns.some((w) => w.includes('ignored for safety')), 'render-gate refusal is announced, not silent');
	assert.ok(warns.some((w) => w.includes('radial-gradient')), 'the warn quotes the ignored value');
});

test('render gate (R-5): the warn dedupe cap EVICTS instead of silencing newer values forever', () => {
	// External review R-5 (9.27.0 round 2): the old `size > 20 → return` made
	// every value AFTER the twentieth silently blank the wallpaper again —
	// exactly the phenomenon A-2.2 removed. The cap now evicts the oldest
	// entry (FIFO). The dedupe set lives on a SHARED window object (one page
	// = one cap). An earlier version of this case drove 21 values through 21
	// freshly required instances with PRIVATE scopes — the cap could never
	// engage and the case could never fail (mutation-verification caught it;
	// CONTRIBUTING admission rule #1). Here every sandbox receives the SAME
	// window, and a repeat-value probe proves the state is genuinely shared,
	// not merely "a big cap nobody reaches".
	const warns = [];
	const created = [];
	const sharedWindow = {};
	const mkDoc = () => ({
		body: makeEl(), createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl()
	});
	const driveApply = (grad) => {
		const h = buildSandbox({
			window: sharedWindow,
			document: mkDoc(),
			console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} },
			seed: {
				'dsh-dream-skin:wallpaper-kind': 'gradient',
				'dsh-dream-skin:wallpaper-gradient': grad
			}
		});
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply(makeApplyContext(h));
	};
	const unsafe = (i) => `radial-gradient(circle, red, blue), url("http://evil.invalid/ping${i}")`;
	for (let i = 0; i < 21; i++) driveApply(unsafe(i));
	const gateWarns = warns.filter((w) => w.includes('ignored for safety'));
	const announced = new Set(gateWarns.map((w) => {
		const i = w.indexOf('evil.invalid');
		return i < 0 ? '' : w.slice(i);
	}));
	assert.equal(announced.size, 21, 'every distinct refused value is announced — the 21st is not silenced by a full cap');
	const gateSeen = sharedWindow.__DSH_DREAM_SKIN_RENDER_GATE_SEEN__;
	assert.ok(gateSeen && typeof gateSeen.add === 'function' && typeof gateSeen.size === 'number',
		'the warn state is the documented window singleton (shared, not per-instance)');
	assert.equal(sharedWindow.__DSH_DREAM_SKIN_RENDER_GATE_SEEN__.size, 20,
		'the cap engaged and EVICTED (21 values seen, set holds exactly RENDER_GATE_WARN_CAP)');
	// Sharing proof: a 22nd pass with an ALREADY-ANNOUNCED value must stay
	// deduped — if each instance had its own Set (the old broken shape), this
	// would double-warn while the size assertion above would also fail.
	driveApply(unsafe(20));
	assert.equal(warns.filter((w) => w.includes('ignored for safety')).length, gateWarns.length,
		'a repeat value through a fresh instance does NOT re-warn (same window, same cap)');
	const leaks = created.filter((el) => Object.values(el.style).some((v) => typeof v === 'string' && v.includes('evil.invalid')));
	assert.equal(leaks.length, 0, 'the cap change must not weaken the refusal itself');
});

test('text hygiene (round-3 self-catch): shipped text files carry no C0 control bytes', () => {
	// How this was found: while syncing this round's CHANGELOG entries, a
	// rewrite script wrote the CSS-escape EXAMPLES through a layer that ate one
	// level of backslash, so the literal text `\2\0` and `\75\a rl(` landed in
	// the file as the REAL control bytes they name. Two consequences, both
	// silent: a NUL byte makes git classify the file as binary (a 44-line doc
	// edit showed up as a 719/675 whole-file rewrite), and the published escape
	// examples stopped being the escapes they were there to illustrate. The
	// gradient guard refuses control characters in wallpaper values; this pins
	// the same fence on our own text, where the same class of bug is invisible
	// to every other check in the gate.
	//
	// Allowed bytes: \t, \n, and \r only as part of a CRLF pair (autocrlf
	// checkouts). A lone \r is a corruption signal, not a line ending.
	const root = path.join(__dirname, '..');
	const targets = ['CHANGELOG.md', 'README.md', 'CONTRIBUTING.md', 'package.json',
		'lib/client.js', 'lib/index.js']
		.map((rel) => rel)
		.concat(fs.readdirSync(path.join(root, 'docs')).filter((f) => f.endsWith('.md')).map((f) => 'docs/' + f))
		.concat(fs.readdirSync(path.join(root, 'tests')).filter((f) => f.endsWith('.cjs')).map((f) => 'tests/' + f));
	assert.ok(targets.length >= 10, 'the hygiene scan must actually cover the tree, got: ' + targets.length);
	for (const rel of targets) {
		const buf = fs.readFileSync(path.join(root, rel));
		const bad = [];
		for (let i = 0; i < buf.length; i++) {
			const c = buf[i];
			if (c === 0x09 || c === 0x0a) continue;
			if (c === 0x0d) { if (buf[i + 1] === 0x0a) { i++; continue; } }
			if (c < 0x20) bad.push(i + ':0x' + c.toString(16));
		}
		assert.deepEqual(bad, [], rel + ' contains C0 control bytes (a backslash-escape example was written as the character it spells): ' + bad.slice(0, 5).join(' '));
	}
});
// ── issue #61 — wallpaper fill mode (cover / contain / blurred bleed) ────────
// The wallpaper layer used to hard-code `background-size:cover`, so every photo
// whose aspect ratio differed from the viewport lost its top and bottom (or
// left and right) to cropping, with no way to ask for the whole frame.
const FIT_KEY = 'dsh-dream-skin:wallpaper-fit';
const BLEED_MARK = 'transform:scale(1.2)';

/**
 * A document mock that keeps every element the plugin creates, so a test can
 * read the LIVE style objects of the two wallpaper layers instead of guessing
 * which one a flat write-log referred to.
 */
function mkWallpaperDoc() {
	const created = [];
	const doc = {
		body: makeEl(),
		head: makeEl(),
		createElement: () => { const el = makeEl(); created.push(el); return el; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const isBleed = (el) => String(el.style.cssText).includes(BLEED_MARK);
	const live = (el) => !el.removed && doc.body.children.includes(el);
	const painted = () => created.filter((el) => typeof el.style.backgroundImage === 'string' && el.style.backgroundImage !== '');
	return {
		doc,
		created,
		// The image the user sees on top (the only non-bleed painted layer).
		main: () => {
			const l = painted().filter((el) => !isBleed(el) && live(el));
			assert.equal(l.length, 1, 'exactly one live wallpaper layer, saw ' + l.length);
			return l[0];
		},
		bleeds: () => painted().filter((el) => isBleed(el) && live(el)),
		bleedEverCount: () => created.filter(isBleed).length
	};
}

test('issue #61 (fill mode): the wallpaper layer\'s background-size follows the stored fit', () => {
	const g = mkWallpaperDoc();
	const h = buildSandbox({
		document: g.doc,
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/tall.jpg',
			'dsh-dream-skin:wallpaper-follows-skin': '0'
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	// An existing user must not wake up to a moved wallpaper: no key stored means
	// the pre-#61 behavior (cover) is still the default.
	assert.equal(h.localStorage.getItem(FIT_KEY), null, 'the boot render does not invent a fit key');
	assert.equal(g.main().style.backgroundSize, 'cover', 'default fill mode is cover');

	for (const [fit, size] of [['contain', 'contain'], ['blur', 'contain'], ['cover', 'cover']]) {
		adv.setFit(fit);
		assert.equal(h.localStorage.getItem(FIT_KEY), fit, `setFit(${fit}) persisted`);
		assert.equal(g.main().style.backgroundSize, size, `setFit(${fit}) renders background-size:${size}`);
		// Intermediate snapshot: leaving blur must not leave its bleed layer running.
		assert.equal(g.bleeds().length, fit === 'blur' ? 1 : 0, `bleed layer count after setFit(${fit})`);
	}

	// Restore path in a fresh instance (a reload), for a LOCAL photo — the shape
	// the reporter actually had cropped. Reading the key back is a different code
	// path from the click handler, and it is the one that decides the first paint.
	const r = mkWallpaperDoc();
	const h2 = buildSandbox({
		document: r.doc,
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'image',
			'dsh-dream-skin:wallpaper': 'data:image/jpeg;base64,AAAA',
			[FIT_KEY]: 'contain'
		}
	});
	const e2 = h2.factory(makeRequire(makeRuntime().RT));
	e2.apply(makeApplyContext(h2, { captureActions: true }));
	assert.equal(r.main().style.backgroundSize, 'contain', 'stored fit paints on boot without any interaction');
});

test('issue #61 (fill mode): the row store receives fit so the active chip tracks the value', () => {
	// Own test on purpose (CONTRIBUTING admission rule 1): the render assertion
	// above cannot see a break HERE, because `syncAdvWallpaper` passes its fields
	// POSITIONALLY — dropping the fit argument shifts `revision` into `fit` and
	// the wallpaper still paints correctly while the chip stops tracking.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	assert.equal(h.storeStates['dream-skin-wallpaper-advanced'].fit, 'cover', 'store starts at the default');
	h.actionBags['dream-skin-wallpaper-advanced'].setFit('blur');
	assert.equal(h.storeStates['dream-skin-wallpaper-advanced'].fit, 'blur', 'store mirrors the click');
});

test('issue #61 (blur fill): the bleed layer paints BEHIND the image and detaches when the mode leaves', () => {
	const g = mkWallpaperDoc();
	const h = buildSandbox({
		document: g.doc,
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/tall.jpg',
			'dsh-dream-skin:wallpaper-follows-skin': '0',
			'dsh-dream-skin:wallpaper-blur': '7'
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	assert.equal(g.bleeds().length, 0, 'no bleed layer before blur mode');
	assert.equal(g.bleedEverCount(), 0, 'and none was even created by the cover render');

	adv.setFit('blur');
	const bleed = g.bleeds();
	assert.equal(bleed.length, 1, 'blur mode creates exactly one bleed layer');
	const layer = g.main();
	// Tree order is the ONLY thing that puts the bleed behind the image: both
	// layers are position:fixed at z-index:-1, so appendChild() would paint the
	// heavily blurred copy ON TOP of the sharp one — the same visual result a
	// background-size bug would produce, and invisible to every other assertion.
	assert.ok(g.doc.body.children.indexOf(bleed[0]) < g.doc.body.children.indexOf(layer),
		'the bleed precedes the wallpaper layer in tree order (insertBefore, not append)');
	assert.equal(bleed[0].style.backgroundImage, layer.style.backgroundImage, 'the bleed carries the same image');
	assert.ok(String(bleed[0].style.cssText).includes('background-size:cover'), 'the bleed fills (cover) while the top layer contains');
	assert.ok(String(bleed[0].style.cssText).includes(BLEED_MARK), 'the bleed is overscaled so the blur cannot eat a transparent ring at the viewport edge');
	assert.equal(bleed[0].style.filter, 'blur(55px)', 'bleed blur = user blur (7) + the 48px bleed constant');
	assert.equal(layer.style.filter, 'blur(7px)', 'the top layer keeps the user\'s own blur');
	assert.equal(layer.style.backgroundSize, 'contain', 'the top layer is the whole image');

	adv.setFit('cover');
	assert.equal(g.bleeds().length, 0, 'leaving blur detaches the bleed layer');
	assert.equal(bleed[0].removed, true, 'the node that was live is the one removed');
	assert.equal(g.doc.body.children.indexOf(bleed[0]), -1, 'it is out of the tree, not merely unreferenced');

	adv.setFit('blur');
	assert.equal(g.bleeds().length, 1, 're-entering blur arms a fresh bleed layer');
	assert.notEqual(g.bleeds()[0], bleed[0], 'which is a new node, not the detached one resurrected');

	adv.clearAll();
	assert.equal(g.bleeds().length, 0, 'clearing the wallpaper tears the bleed layer down too');
});

test('issue #61 (fill mode): a gradient ignores it, and both gates whitelist the value', () => {
	// A gradient has no intrinsic aspect ratio, so `fit` must not change how it
	// renders — and it must not conjure a bleed layer behind it.
	const g = mkWallpaperDoc();
	const hg = buildSandbox({
		document: g.doc,
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'gradient',
			'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #000 0%, #fff 100%)',
			[FIT_KEY]: 'blur'
		}
	});
	hg.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(hg, { captureActions: true }));
	assert.equal(g.main().style.backgroundSize, 'cover', 'a gradient renders cover even with fit=blur stored');
	assert.equal(g.bleedEverCount(), 0, 'the gradient path never creates a bleed layer');

	// Write gate: the value goes straight into `style.backgroundSize` (CSSOM), so
	// anything but the three literals must be refused BEFORE persisting — a
	// hand-typed or hand-edited value cannot smuggle declarations.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];
	const refused = [
		'contain; background-image:url("http://evil.invalid/x")',
		'blur;filter:blur(999px)',
		'CONTAIN',
		'contain ',
		'cover,contain',
		'',
		undefined,
		null,
		42,
		{ toString: () => 'cover' }
	];
	for (const bad of refused) {
		assert.doesNotThrow(() => adv.setFit(bad), 'setFit must not throw on: ' + String(bad));
		assert.equal(h.localStorage.getItem(FIT_KEY), null, 'refused write: ' + JSON.stringify(bad));
	}
	adv.setFit('contain');
	assert.equal(h.localStorage.getItem(FIT_KEY), 'contain', 'the gate still admits the real values');

	// Render gate: a state file edited outside the UI reaches readWallpaperFit
	// directly, so the whitelist has to hold there too — not only on the click.
	const r = mkWallpaperDoc();
	const h2 = buildSandbox({
		document: r.doc,
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/tall.jpg',
			'dsh-dream-skin:wallpaper-follows-skin': '0',
			[FIT_KEY]: 'contain; background-image:url("http://evil.invalid/x")'
		}
	});
	h2.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(h2, { captureActions: true }));
	assert.equal(r.main().style.backgroundSize, 'cover', 'a tampered stored fit falls back to the default at render time');
	assert.ok(!JSON.stringify(r.main().style).includes('evil.invalid'), 'the tampered value never reaches the layer style');
});

test('issue #61 (apply link): re-applying the same URL re-fetches it even with the schedule off', async () => {
	// Second half of the report: pressing "应用链接" persisted the URL but rendered
	// a byte-identical background, so the browser answered from cache and a
	// daily-wallpaper link that had just rolled over kept showing the OLD picture
	// until a full page reload. A manual apply now means "fetch it now": bump the
	// stamp, render with it, and re-phase the schedule honestly.
	const probes = [];
	const g = mkWallpaperDoc();
	const h = buildSandbox({
		document: g.doc,
		Image: function () {
			this.onload = null;
			this.onerror = null;
			Object.defineProperty(this, 'src', {
				configurable: true,
				get() { return ''; },
				set(v) { probes.push(v); }
			});
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	const rendered = () => (/url\("([^"]+)"\)/.exec(g.main().style.backgroundImage) || [])[1] || g.main().style.backgroundImage;

	adv.setUrl('https://cdn.example.com/daily.jpg?v=2');
	const first = rendered();
	assert.ok(/[?&]t=\d{13}$/.test(first), 'a manual apply renders a cache-busted URL, got: ' + first);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://cdn.example.com/daily.jpg?v=2', 'the persisted URL stays clean (R6)');
	// The probe must verify exactly the URL that renders, or a "link is dead"
	// notice describes a different request than the one the page makes (review P3).
	assert.equal(probes[probes.length - 1], first, 'the preload probe checks the URL that actually renders');

	// Date.now() has millisecond resolution, so the two applies have to be
	// separated by real time — otherwise an identical stamp would make "different
	// request" unprovable.
	await sleep(3);
	adv.setUrl('https://cdn.example.com/daily.jpg?v=2');
	const second = rendered();
	assert.notEqual(second, first, `re-applying the same link must produce a different request, both: ${second}`);
	assert.ok(/[?&]t=\d{13}$/.test(second), 'the second apply is stamped too, got: ' + second);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-url'), 'https://cdn.example.com/daily.jpg?v=2', 'stored URL is still the pristine one');

	const cfg = JSON.parse(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh') || '{}');
	assert.ok(!cfg.on, 'a manual apply does not silently enable the schedule');
	assert.ok(Math.abs(Date.now() - cfg.lastFiredAt) < 5000, `lastFiredAt re-phased to now, got: ${cfg.lastFiredAt}`);

	// And with the schedule OFF the stamp still lands in the render layer: the
	// old code only busted while `on` was true, which is the exact shape of the
	// reported "nothing happened" case.
	assert.equal(g.bleeds().length, 0, 'no bleed layer for the default cover mode');
});

test('issue #61: the fill-mode key is a sentinel — an upgrader whose only stored preference is fill mode keeps their state', () => {
	// Blue-team B2/F1: the first-install probe has to recognize a user by EVERY
	// user-visible key. `wallpaper-fit` is new in this build, so an existing user
	// who had only ever touched the fill chips is invisible to the probe unless the
	// key is listed — and they would then get the whole factory look pushed over
	// their own choices on the next boot.
	const h = buildSandbox();
	h.localStorage.removeItem('dsh-dream-skin:factory-applied');
	h.localStorage.setItem(FIT_KEY, 'contain');
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:skin'), null, 'no factory skin pushed onto the upgrader');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), null, 'the bundled wallpaper is not seeded');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), null, 'factory numbers stay dormant');
	assert.equal(h.localStorage.getItem(FIT_KEY), 'contain', 'their own fill mode survives');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:factory-applied'), '1', 'marker stamped so later boots skip the probe');
});


test('R13 follow-up (found on the live machine): apply with an empty URL box changes NOTHING', () => {
	// The URL box is uncontrolled (defaultValue) and its local state starts empty, so
	// a stray "应用链接" click sends "". R13 stopped that from wiping an existing URL
	// wallpaper, but the other half of the branch still ran: it rewrote kind/url and,
	// worse, forced 壁纸跟随主题 off (`wallpaper-follows-skin -> "0"`) from a misclick.
	// A click that has nothing to apply must leave every stored value alone.
	const h = buildSandbox({
		seed: {
			// Reachable state: the user picked the 外链 kind but has not pasted a
			// link yet, and still has "壁纸跟随主题" switched on.
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper': 'data:image/png;base64,AAAA',
			'dsh-dream-skin:wallpaper-follows-skin': '1'
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const adv = h.actionBags['dream-skin-wallpaper-advanced'];

	const before = {
		kind: h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'),
		url: h.localStorage.getItem('dsh-dream-skin:wallpaper-url'),
		follows: h.localStorage.getItem('dsh-dream-skin:wallpaper-follows-skin')
	};
	adv.setUrl('');
	const after = {
		kind: h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'),
		url: h.localStorage.getItem('dsh-dream-skin:wallpaper-url'),
		follows: h.localStorage.getItem('dsh-dream-skin:wallpaper-follows-skin')
	};

	assert.equal(before.url, null, 'precondition: this user has never stored a URL');
	assert.deepEqual(after, { kind: 'url', url: null, follows: '1' }, 'nothing-to-apply click left kind, url and follows-skin exactly as they were');
});





