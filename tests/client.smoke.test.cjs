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

/**
 * Roadmap A1: the sidebar foot group exactly as the BUNDLE probes it.
 *
 * Derived from lib/client.js rather than typed here. A fixture that hardcodes a probe
 * selector while the bundle probes a different one does not fail — it just mounts nothing,
 * leaves the group permanently "missing", and keeps asserting about some other page. The
 * old `.hHd-Xa_root …` string was copy-pasted into five places in this file; a rename now
 * moves every one of them with it.
 */
const SIDEBAR_PROBE_SEL = (() => {
	const pick = (name) => {
		const m = new RegExp(`const ${name} = "((?:[^"\\\\]|\\\\.)*)"`).exec(CODE);
		if (!m) throw new Error(`${name} moved out of lib/client.js — the drift-probe fixture cannot name the sidebar group`);
		return m[1].replace(/\\"/g, '"');
	};
	return [pick('SIDEBAR_FOOT_SELECTOR'), pick('SIDEBAR_SETTINGS_SELECTOR'), pick('SIDEBAR_FOOTER_ACTIONS_SELECTOR')].join(', ');
})();

// The drift probe now runs a bounded delay ladder (A-1; R-4 round 2 renamed
// CHECKPOINTS→RETRY_DELAYS because the entries are RELATIVE gaps, cumulative
// ≈0/300/1300/4300ms). Fast-path tests patch the ladder to low hundreds of
// milliseconds instead of waiting out the real 4.3s.
// CAUTION for lifecycle cases: unloading after a compressed ladder finishes
// means nothing is in flight to cancel, which is how the round-4 T-1 leak stayed
// invisible to 92 green cases. Teardown/cancellation tests slow the ladder
// instead (see `drift probe (T-1)`).
// --- shipped skin catalog (read out of the bundle, never restated) ---------
// Assertions about a skin's palette must read it from lib/client.js. A literal
// `#f7f0f3` copied into a test is a SECOND source of truth: it pins the design
// and then keeps passing long after the design has moved — which is exactly
// what happened when the presets were rebuilt from the design system (five
// cases went red on palette literals that had silently frozen months earlier).
const SHIPPED_SKINS = (() => {
	const marker = '		const SKINS = [';
	const start = CODE.indexOf(marker);
	if (start < 0) throw new Error('SKINS block not found in lib/client.js');
	const open = start + marker.length - 1;
	let depth = 0;
	let i = open;
	let inStr = null;
	while (i < CODE.length) {
		const ch = CODE[i];
		if (inStr) {
			if (ch === '\\') i += 2;
			else if (ch === inStr) inStr = null;
			i += 1;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; i += 1; continue; }
		if (ch === '[') depth += 1;
		else if (ch === ']') { depth -= 1; if (depth === 0) break; }
		i += 1;
	}
	// eslint-disable-next-line no-new-func
	return new Function('return ' + CODE.slice(open, i + 1))();
})();
const skinById = (id) => SHIPPED_SKINS.find((s) => s.id === id);

/** "rgba(35, 36, 37, 0.5)" from a skin token + an alpha — no palette literals. */
const rgbTriple = (css) => {
	const v = String(css).trim();
	if (v.startsWith('#')) {
		const h = v.slice(1);
		return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
	}
	const m = /rgba?\(([^)]+)\)/i.exec(v);
	assert.ok(m, 'token is a parseable color: ' + v);
	const parts = m[1].split(',').map((x) => parseInt(x.trim(), 10));
	return [parts[0], parts[1], parts[2]];
};
const rgbaOf = (css, alpha) => {
	const [r, g, b] = rgbTriple(css);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// The fast ladder as DATA so a case that counts its rounds reads the number instead of
// restating a literal (see the `diagnostics` case polling "one new checkedAt per round").
const FAST_LADDER_MS = [0, 20, 50, 90];
const FAST_DRIFT_CODE = CODE.replace('[0, 300, 1000, 3000]', `[${FAST_LADDER_MS.join(', ')}]`);
if (FAST_DRIFT_CODE === CODE) throw new Error('DRIFT_RETRY_DELAYS_MS ladder moved — update FAST_DRIFT_CODE patch in smoke tests');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait until the drift ladder publishes its TERMINAL verdict, instead of sleeping a fixed
 * guess past the FAST ladder's ≈160ms.
 *
 * Why the fixed sleep had to go: the fast-path patch shortens the ladder's RELATIVE gaps, and
 * a timer budget is a promise about a scheduler this test does not control. `node --test` runs
 * the suite's files in parallel, so on a loaded machine the rounds land later than the guess —
 * which is exactly how `drift probe (J1)` flaked once in three full runs during the 10.8.1
 * review round while passing in isolation. Polling for the verdict removes the wall-clock
 * dependency from every case whose only precondition is "the ladder finished". Running out of
 * the budget is reported as the probe failing to converge, NOT as a timing detail to widen.
 *
 * Deliberately not used by the mid-ladder and R-4 semantics cases: those assert that a verdict
 * has NOT arrived yet, and no amount of polling can prove a "not yet".
 */
async function settleDrift(win, { timeoutMs = 4000, stepMs = 20, until } = {}) {
	// `until` defaults to "the ladder published its terminal verdict". The one caller that
	// only needs the FIRST snapshot passes its own predicate: a page with no liveness evidence
	// stays pending forever, and waiting for a terminal verdict there would be a lie.
	const done = until || ((s) => s && s.anchors && s.anchors.pending === false);
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const status = win.__DSH_DREAM_SKIN_STATUS__;
		if (done(status)) return status.anchors;
		if (Date.now() >= deadline) {
			assert.fail(`the drift ladder never published a terminal verdict within ${timeoutMs}ms `
				+ `(anchors=${JSON.stringify(status && status.anchors)}) — the probe stopped converging; do not paper over `
				+ 'this by sleeping longer');
		}
		await sleep(stepMs);
	}
}

/**
 * The convergence poll lives in `fixtures/converge.cjs` (blue-team B-05). It used to be copied here
 * and into `client.persistence.test.cjs` with an identical body, which meant a fix to the timeout
 * contract in one file left the other asserting the old one.
 */
const { waitFor } = require('./fixtures/converge.cjs');

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
		// Attributes are RECORDED, not swallowed: the low-power switch (issue #110)
		// is published only through setAttribute/removeAttribute, and a mock that
		// no-ops them would let the feature be deleted without a single red case.
		attrs: {},
		setAttribute(k, v) { this.attrs[k] = String(v); },
		getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; },
		removeAttribute(k) { delete this.attrs[k]; },
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
	// Real documents have a documentElement; the low-power switch (issue #110)
	// publishes its attribute there, so a mock without one silently skips the
	// whole code path and would keep the assertion green on a broken feature.
	const documentElement = makeEl();
	const document = { body, documentElement, createElement: () => makeEl(), createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl() };
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
	for (const k of ['document', 'localStorage', 'btoa', 'atob', 'matchMedia']) sandbox.window[k] = sandbox[k];
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
	assert.equal(status.anchors.probed, 8, 'eight host anchor groups probed on web shell (six hashed families + the two hash-free anchors of issue #96/#97)');
	assert.ok(status.checkedAt > 0 && status.publishedAt > 0, 'timestamps present');
	// Run the whole checkpoint ladder to its end, then re-read: the FINAL
	// round of an undecidable DOM stays pending forever — that is the point.
	// The fixed 400ms clock (≈240ms past the FAST ladder's last round) is replaced by a
	// convergence poll on a REAL observable of ladder completion: every runRound() publish
	// stamps a NEW `checkedAt`, while merge-only publishStatus() calls inherit the previous
	// one (publishStatus merges, never retracts) — so counting DISTINCT checkedAt values
	// proves "the final round has published" before the read below, with no wall-clock
	// margin to lose on a loaded runner. A `conclusive = final` (liveness-gate drop)
	// mutation WOULD have published an 8-group drifted verdict in that final round — the
	// honest pending below is what the sentinel gate buys, not an untested race.
	let latestStatus = h.window.__DSH_DREAM_SKIN_STATUS__;
	const roundPubs = new Set([latestStatus.checkedAt]); // round 1 ran synchronously in apply() (delay 0)
	Object.defineProperty(h.window, '__DSH_DREAM_SKIN_STATUS__', {
		configurable: true,
		get: () => latestStatus,
		set: (v) => { latestStatus = v; roundPubs.add(v.checkedAt); }
	});
	await waitFor(() => ({
		done: roundPubs.size >= FAST_LADDER_MS.length,
		observed: { publishedRounds: roundPubs.size, expected: FAST_LADDER_MS.length }
	}), { label: 'the FAST drift ladder published EVERY round (one distinct checkedAt per round)' });
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
		assert.equal(new Set(keys).size, keys.length, `${lang} declares a duplicate key`);
		dicts[lang] = new Set(keys);
	}
	// The expected key set is DERIVED, not counted: a hand-copied literal ("68 keys")
	// reddens on every legitimate addition and, worse, says nothing when a key is
	// added to one locale only as long as the totals still match by luck. What has to
	// hold is (a) all eight dictionaries are identical, (b) every key the code looks up
	// exists, and (c) every key that exists is reachable — either literally, or through
	// one of the two dynamic families below (skin.<id> / material.<id>[.desc]).
	// A call can also build its key from a literal PREFIX plus a value (W7a's material
	// chips do: t("material." + preset.id)), and the prefix alone is not a key. Trailing
	// dots are dropped here and the finished keys are covered by DYNAMIC_FAMILIES below —
	// otherwise every derived lookup would be reported as "code looks up 'material.'".
	const literalUses = new Set([...src.matchAll(/\b(?:t|localeT)\(\s*"([a-zA-Z0-9.]+)"/g)]
		.map((m) => m[1]).filter((key) => !key.endsWith('.')));
	const DYNAMIC_FAMILIES = [
		{ prefix: 'skin.', ids: SHIPPED_SKINS.map((s) => s.id) },
		{ prefix: 'material.', ids: ['frosted', 'liquid'] },
		{ prefix: 'material.', ids: ['frosted', 'liquid'], suffix: '.desc' },
		// FOLDER_ERROR_KEYS maps each host error code to one of these (the code picks the key at run time).
		{ prefix: 'bg2.rotationFolder', ids: ['Unset', 'NotAbsolute', 'Missing', 'NotDirectory', 'Unreadable', 'HostDown'] }
	];
	const reachable = (key) => {
		if (literalUses.has(key)) return true;
		return DYNAMIC_FAMILIES.some((f) => f.ids.some((id) => key === f.prefix + id + (f.suffix || '')));
	};
	const zhKeys = dicts.zh;
	assert.ok(zhKeys.size >= 60, `the zh dictionary looks truncated (${zhKeys.size} keys)`);
	for (const key of zhKeys) {
		assert.ok(reachable(key), `zh key "${key}" is looked up nowhere — dead copy (delete it or wire it)`);
	}
	for (const key of literalUses) {
		assert.ok(zhKeys.has(key), `code looks up "${key}" but zh has no such key`);
	}
	for (const lang of langs.slice(1)) {
		// Key-set equality (blue-team B11): the per-language `reachable()` loop that used to sit
		// here tested `zhKeys` against the SAME predicate already asserted above, so it was
		// true by construction and never looked at this language's own dictionary. The honest
		// form of "this locale is complete" is the set comparison, and it is already here.
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

test('a skin switch carries its authored numbers (and never the users own)', () => {
	// Each preset ships its own wash / glass / dialog numbers. Switching skins
	// must retune them — but ONLY the ones the user has not made their own.
	// That asymmetry is the whole feature: "I never touched the slider" gets
	// the authored look, "I set this to 0.6" keeps 0.6 forever.
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
	assert.doesNotThrow(() => e.apply({ ...baseCtx, theme }));
	const skinBags = h.actionBags['dream-skin'];

	// (a) untouched keys follow the skin.
	skinBags.setSkin('mist');
	const mist = skinById('mist').defaults;
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), String(mist.wallpaperOpacity), 'mist wash applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-blur'), String(mist.wallpaperBlur), 'mist blur applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), String(mist.composerOpacity), 'mist composer applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), String(mist.modalOpacity), 'mist dialog applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), mist.material, 'mist material applied');

	skinBags.setSkin('midnight');
	const midnight = skinById('midnight').defaults;
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), String(midnight.wallpaperOpacity), 'the wash follows the skin, not a global average');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), String(midnight.composerOpacity), 'composer follows the skin');
	assert.notEqual(String(mist.wallpaperOpacity), String(midnight.wallpaperOpacity), 'the two skins really do differ');

	// (b) a value the user set is theirs. Write it through the real slider so
	// it is recorded as user-owned, then switch skins twice.
	const glassBags = h.actionBags['dream-skin-glass'];
	assert.ok(glassBags && typeof glassBags.setOpacity === 'function', 'glass slider captured');
	glassBags.setOpacity(60);
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), '0.6', 'user value stored');
	skinBags.setSkin('mist');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), '0.6', 'a user-owned wash is NOT retuned by a skin switch');
	skinBags.setSkin('abyss');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), '0.6', '…and survives another switch');
	// While the untouched dialog opacity still follows.
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), String(skinById('abyss').defaults.modalOpacity), 'untouched keys keep following');
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
	// Compare against the skin's OWN glow field: the literal RGB triple used to
	// live here, so the case kept passing after the background was redesigned.
	assert.equal(mistGrad, skinById('mist').glow, 'mist diffused-glow attached');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-follows-skin'), '1', 'mist background marked as following');

	// Switch to nebula → background must swap to nebula's gradient.
	skinBags.setSkin('nebula');
	const g2 = h.localStorage.getItem('dsh-dream-skin:wallpaper-gradient');
	assert.equal(g2, skinById('nebula').glow, 'nebula glow applied (swapped from mist)');
	assert.notEqual(g2, mistGrad, 'the two skins ship different backgrounds');
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
			'dsh-dream-skin:wallpaper-follows-skin': '0',
			// Authored per-skin numbers (incl. auto-dim) now ride along on a skin
			// switch; pin them here so this case keeps isolating the wash COLOUR.
			'dsh-dream-skin:wallpaper-autodim': '0',
			'dsh-dream-skin:modal-opacity': '0.94',
			'dsh-dream-skin:composer-opacity': '0.85',
			'dsh-dream-skin:sidebar-opacity': '0.28',
			'dsh-dream-skin:material-preset': 'frosted',
			'dsh-dream-skin:wallpaper-blur': '0'
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
	const h = buildSandbox({ seed: {
		// Same reason as the case above: pin the authored numbers so the case
		// measures the wash colour, not the new per-skin defaults.
		'dsh-dream-skin:wallpaper-opacity': '0.8',
		'dsh-dream-skin:wallpaper-autodim': '0',
		'dsh-dream-skin:modal-opacity': '0.94',
		'dsh-dream-skin:composer-opacity': '0.85',
		'dsh-dream-skin:sidebar-opacity': '0.28',
		'dsh-dream-skin:material-preset': 'frosted',
		'dsh-dream-skin:wallpaper-blur': '0'
	} });
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
	const roseWash = rgbaOf(skinById('rose').tokens['--dsw-alias-bg-base'], 0.8);
	assert.equal(wash['--dsw-alias-bg-base'].light, roseWash,
		'first selection already washes with ROSE, not the built-in white');

	// The round-trip must not feed either prior wash back into the final rose wash.
	skinBags.setSkin('midnight');
	skinBags.setSkin('rose');
	wash = overrides.get('dsh-dream-skin:appearance').tokens;
	assert.equal(wash['--dsw-alias-bg-base'].light, roseWash,
		'round-trip does not feed a prior wash back into the final rose wash');
});

test('production facade keeps wallpaper, popup opacity, and accent visible together across a skin round-trip', async () => {
	const h = buildSandbox({ seed: {
		'dsh-dream-skin:skin': 'rose',
		'dsh-dream-skin:wallpaper-kind': 'gradient',
		'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #fdf2f6 0%, #f0d2dc 100%)',
		'dsh-dream-skin:wallpaper-opacity': '0.8',
		'dsh-dream-skin:wallpaper-follows-skin': '0',
		'dsh-dream-skin:modal-opacity': '0.5',
		'dsh-dream-skin:wallpaper-autodim': '0',
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
	// Issue #98: the seeded slider value (0.5) is BELOW the dialog readability
	// floor, so the layer-2 legs of this round-trip land on the floor while the
	// menu leg keeps following the slider. Both halves are asserted below on
	// purpose: a floor that also swallowed the menu token would pass a
	// layer-2-only expectation, and a floor that never applied would pass a
	// menu-only one.
	const DIALOG_ALPHA = 0.92;
	const midnightLayer2 = rgbaOf(skinById('midnight').tokens['--dsw-alias-bg-layer-2'], DIALOG_ALPHA);
	assert.equal(theme.getTheme().active.tokens['--dsw-alias-bg-layer-2'], midnightLayer2,
		'the deferred wallpaper re-shade re-resolves layer-2 for the mid-switch skin (midnight)');
	// Adjudication 10.5.1 P1 (R4-style): pin BOTH scheme entries of the
	// mid-switch override. The inactive (light) scheme must be painted from the
	// scheme base — removing fillFor's colorScheme gate (kill-mutation E4)
	// leaks midnight's dark hue into the light entry and reddens here.
	const midLayer = (packageLayer && packageLayer.tokens['--dsw-alias-bg-layer-2']) || {};
	assert.equal(midLayer.light, 'rgba(255, 255, 255, ' + DIALOG_ALPHA + ')',
		'the light entry of the mid-switch layer-2 is the scheme base (white), not the dark skin hue');
	assert.equal(midLayer.dark, midnightLayer2,
		'the dark entry of the mid-switch layer-2 keeps midnight\'s own hue at the floored alpha');
	skin.setSkin('rose');
	await new Promise((resolve) => setTimeout(resolve, 10));
	const tokens = theme.getTheme().active.tokens;
	assert.equal(tokens['--dsw-alias-bg-base'], rgbaOf(skinById('rose').tokens['--dsw-alias-bg-base'], 0.8),
		'rose wallpaper wash survives the round-trip');
	assert.equal(tokens['--dsw-specific-menu'], rgbaOf(skinById('rose').tokens['--dsw-alias-bg-base'], 0.5),
		'popup opacity remains active after the wallpaper re-shade — and the MENU leg still follows the '
		+ 'slider below the dialog floor (issue #98: the floor belongs to layer-2 only)');
	assert.equal(tokens['--dsw-alias-brand-primary'], '#123456',
		'custom accent remains active after the wallpaper re-shade');
	// End state settles back to the seeded skin's own layer-2 hue (issue #67).
	const roseLayer2 = rgbaOf(skinById('rose').tokens['--dsw-alias-bg-layer-2'], DIALOG_ALPHA);
	assert.equal(tokens['--dsw-alias-bg-layer-2'], roseLayer2,
		'the deferred wallpaper re-shade re-resolves layer-2 to the settled rose hue');
	// Adjudication 10.5.1 P1: the settled (rose, light-scheme) override keeps
	// rose's own hue in the light entry; the inactive dark entry falls back to
	// the scheme base (21, 21, 23).
	const roseLayer = (packageLayer && packageLayer.tokens['--dsw-alias-bg-layer-2']) || {};
	assert.equal(roseLayer.light, roseLayer2,
		'the settled rose layer-2 keeps rose\'s own (light) hue in the light entry');
	assert.equal(roseLayer.dark, 'rgba(21, 21, 23, ' + DIALOG_ALPHA + ')',
		'the inactive dark entry of the settled rose layer-2 falls back to the scheme base');
	assert.equal(activeLayerRemovals, 0,
		'same-source replacement never publishes an intermediate unshaded theme');
	assert.equal(presentedTokens['--dsw-alias-bg-base'], rgbaOf(skinById('rose').tokens['--dsw-alias-bg-base'], 0.8),
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

	// m06923: apply() injects a SECOND sheet now (the settings <select> list styling),
	// so "last appended" is no longer the material sheet — locate it by the id it owns.
	const materialSheet = headChildren.find((el) => el && String(el.id || '') === 'dsh-dream-skin:material:liquid-glass');
	assert.ok(materialSheet && materialSheet.textContent, 'a material <style> node was appended');
	const css = materialSheet.textContent;
	// The <select> list is centred from its own sheet (m06923 / user: options were
	// left-aligned and every inline attempt was ignored — ::picker() is a pseudo-element).
	const selectSheet = headChildren.find((el) => el && String(el.id || '') === 'dsh-dream-skin-select');
	assert.ok(selectSheet && selectSheet.textContent, 'the select list sheet is injected with apply()');
	assert.ok(selectSheet.textContent.includes('::picker(select)'), 'the picker pseudo-element is addressed from the sheet');
	assert.ok(selectSheet.textContent.includes('option::checkmark'), 'the empty check column is dropped so the option text centres');
	assert.ok(selectSheet.textContent.includes('justify-content: center'), 'the option box centres its label');
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
	// The sidebar's foot surfaces may never be a blur target (regression guard): they
	// host the settings modal and the slot-rendered footer actions, and blurring an
	// ancestor of a fixed-position element broke it. Re-anchored to the hash-free forms
	// by Roadmap A1, so the guard reads those — the old copy keyed on `hHd-Xa_root`, a
	// selector this sheet no longer contains, which would have made the guard
	// unconditionally true (a green light with nothing behind it).
	assert.ok(!/\[class\$="_footArea"\][^{]*\{[^}]*backdrop-filter/.test(css) && !/\[class\$="_footArea"\][^{]*\{[^}]*[^-]filter:/.test(css), 'must NOT blur the sidebar foot surfaces');
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
	// Roadmap A1: the sidebar foot plane. Three claims, because "the string is in there"
	// was the shape that let 10.9.x ship a rule that could never match:
	//   1. the sheet addresses the surfaces through the hash-free anchors the bundle
	//      derives (same constants the drift probe uses, so the sheet and the probe
	//      cannot describe different pages);
	//   2. EXACTLY two rules do that — the margin alignment and the fill erase. A third
	//      one creeping in is a decision nobody took, and a shape gate cannot see count;
	//   3. no CLASS-FORM `_footArea` selector survives, which is what "去哈希依赖" means
	//      here: `.anything_footArea` is addressable only by a host that keeps its hash.
	assert.ok(css.includes(SIDEBAR_PROBE_SEL), 'sidebar footer/settings pinned to one plane, through the hash-free anchors');
	assert.equal(css.split(SIDEBAR_PROBE_SEL + ' {').length - 1, 2, 'the foot plane is exactly two rules (alignment + erase) — more means an unclaimed decision, fewer means one was dropped');
	assert.ok(!/\.[\w-]+_footArea/.test(css), 'no class-form sidebar foot anchor may survive: only the suffix form is hash-free');
	assert.ok(!/\.[\w-]+_footerActions/.test(css), 'no class-form footerActions anchor: `_footerActions` is shared with the question card, so it must stay scoped under `_footArea`');
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

test('#80: the glass scheme attribute is stamped at mount and follows the active skin', () => {
	// The material sheet carries TWO sets of liquid-glass constants (a dark set on
	// bare `html`, a light set on `html[data-dsh-dream-skin-scheme="light"]`). The
	// attribute used to be the host's `body[data-ds-dark-theme]` — which the host's
	// own theme presenter ERASES on dispose(), so every theme-layer remount reopened
	// a window in which a dark skin was served the paper rim (and the comment on top
	// claimed the opposite). It is now ours, stamped by the plugin.
	const attrs = new Map();
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: {
			style: { setProperty() {} },
			setAttribute: (k, v) => attrs.set(k, v),
			removeAttribute: (k) => attrs.delete(k)
		},
		createElement: () => makeEl(),
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const h = buildSandbox({ document: doc, seed: { 'dsh-dream-skin:skin': 'ivory' } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	const themeHandlers = [];
	const THEMES = [
		{ id: 'ivory', colorScheme: 'light', tokens: {} },
		{ id: 'midnight', colorScheme: 'dark', tokens: {} }
	];
	let pref = 'ivory';
	const ctx = makeApplyContext(h, { captureActions: true });
	ctx.theme.getTheme = () => ({
		preference: pref,
		active: { id: pref, colorScheme: pref === 'ivory' ? 'light' : 'dark', tokens: {} },
		themes: THEMES,
		revision: 1
	});
	ctx.on = (ev, fn) => { if (ev === 'theme/change') themeHandlers.push(fn); return () => {}; };

	assert.doesNotThrow(() => e.apply(ctx));
	// Sample 1 — the light skin restored at boot. `light` is the OVERRIDE, so this
	// half is the one that would silently never apply if the attribute were missing.
	assert.equal(attrs.get('data-dsh-dream-skin-scheme'), 'light',
		'a light skin publishes the light glass set at mount');

	// Sample 2 — switch to a dark skin and fire the real theme/change path. The
	// attribute must move in the SAME event, not on the deferred wallpaper re-shade.
	const skin = h.actionBags && h.actionBags['dream-skin'];
	assert.equal(typeof skin?.setSkin, 'function', 'the skin row exposes setSkin');
	skin.setSkin('midnight');
	pref = 'midnight';
	for (const fn of themeHandlers) {
		fn({ preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: {} }, themes: THEMES, revision: 2 });
	}
	assert.equal(attrs.get('data-dsh-dream-skin-scheme'), 'dark',
		'the attribute follows the skin, so the paper rim cannot outlive it');
	// And it is stamped on <html>, the element the sheet selects on.
	assert.ok(attrs.has('data-dsh-dream-skin-scheme'));
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
	// `label: "个性化皮肤"` — a string this repo declares. The bare 「皮肤」 row
	// belongs to a THIRD-PARTY plugin (@linxin666/dsh-client-ui-skin-center), and marking
	// it was the L1 walk-on: our palette over somebody else's icon. `Theme Shop` is the
	// T7 walk-on: a plain substring test for "Theme" painted it even though this repo
	// declares no such row — the full-label containment must refuse it.
	const buttons = [
		{ textContent: '常规', setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; } },
		{
			textContent: '个性化皮肤',
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
	assert.equal(marked[0] && marked[0].textContent, '个性化皮肤', 'and the row we marked is the section WE registered');
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
		textContent: '个性化皮肤',
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

	// A second "个性化皮肤" button appears while no frame will ever arrive.
	buttons.push({
		textContent: '个性化皮肤',
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
		{ textContent: '个性化皮肤', setAttribute(k, v) { this[k] = v; }, removeAttribute(k) { delete this[k]; } }
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
	assert.equal(h.window.__DSH_DREAM_SKIN_NAV__.marked, 1, 'the pending "个性化皮肤" button gets marked on the arm pass');

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
		textContent: '个性化皮肤',
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
	// The select sheet is injected right after the material sheet, so append order no
	// longer names the sheet under test: find it by its own rule set.
	const appended = [];
	const documentMock = {
		body: { contains: () => false, getAttribute: () => null },
		head: {
			children: [],
			contains() { return false; },
			appendChild(el) { appended.push(el); },
			append() { appended.push(el); }
		},
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	const sheet = appended.find((el) => String(el.textContent || '').includes('--dsh-dream-skin-modal-fill'));
	assert.ok(sheet, 'the material sheet was injected');
	const css = sheet.textContent;

	const rule = css.match(/\.dshDesktopSidebarSurface\s*\{[^}]*\}/);
	assert.ok(rule, 'the shell sidebar surface is targeted by the material sheet');
	assert.ok(/--dsw-specific-sidebar-fill:\s*inherit\s*!important/.test(rule[0]),
		'the token is re-inherited with !important (the shell declares it without)');
	// Guard the intent: this selector must never broaden into DSH's own sidebar
	// surfaces (the fix is scoped to the desktop shell's element only).
	assert.ok(!/\.dshDesktopSidebarSurface\s*,|,\s*\.dshDesktopSidebarSurface/.test(css),
		'the desktop rule is not merged into a selector list with other surfaces');
});

test('issue #99: under a wash the desktop shell sidebar underlay stops eating the slider', () => {
	// The #55 fix above re-inherits the TOKEN. Issue #99 is what that cannot reach:
	// the shell paints its own opaque `background` on the very same element once the
	// window material is `off`, and `off` is not a choice on Windows — the shell admits
	// only off/transparent/acrylic/mica (v2.0.17 dsh-plugin-desktop/src/client/
	// environment.ts:24), folds acrylic/mica down to off (:51-53) and THROWS for
	// win32 + transparent (:58 and :61). The two paint rules are styles.ts:23 (base) and
	// :24 (the `off` pair) and are byte-identical back to v2.0.5, so this is not a
	// regression we caused. The reporter's own words are "窗口模式为增强模式下，侧边栏无法
	// 调整不透明度" — the official sidebar inside does obey the slider, but what shows
	// through it is the shell's layer-1, never the wallpaper.
	const appended = [];
	const documentMock = {
		body: { contains: () => false, getAttribute: () => null },
		head: {
			children: [],
			contains() { return false; },
			appendChild(el) { appended.push(el); }
		},
		createElement() { return { style: {}, dataset: {}, textContent: '', remove() {} }; },
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const h = buildSandbox({ document: documentMock });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	const sheet = appended.find((el) => String(el.textContent || '').includes('--dsh-dream-skin-modal-fill'));
	assert.ok(sheet, 'the material sheet was injected');
	const css = sheet.textContent;

	const tokenRule = css.match(/\.dshDesktopSidebarSurface\s*\{[^}]*\}/);
	assert.ok(tokenRule && /--dsw-specific-sidebar-fill:\s*inherit\s*!important/.test(tokenRule[0]),
		'the #55 token fix is still there (this issue adds to it, it does not replace it)');

	const underlay = css.match(/html\[data-dsh-dream-skin-wash\]\s+\.dshDesktopSidebarSurface\s*\{[^}]*\}/);
	assert.ok(underlay, 'a wash-gated rule targets the shell sidebar surface');
	assert.match(underlay[0], /background-color:\s*transparent\s*!important/,
		'the paint is cleared with !important — sheet order against a third-party bundle is not observable from here');
	// F11 (adversarial review 10.8.1): "do not touch the chrome" is enforced by COUNTING the
	// declarations, not by blacklisting a few property names. A `list-style` / `transform` /
	// `filter` smuggled in later would have passed the name list while this rule is still
	// supposed to be exactly one longhand.
	const declarations = underlay[0].slice(underlay[0].indexOf('{') + 1, underlay[0].lastIndexOf('}'))
		.split(';').map((x) => x.trim()).filter(Boolean);
	assert.equal(declarations.length, 1, `the wash-gated rule is exactly one declaration, got: ${declarations.join(' | ')}`);
	assert.match(declarations[0], /^background-color:\s*transparent\s*!important$/,
		'and that one declaration is the paint clear, nothing else');
	// F10: the reverse gate has to cover the shorthand too. The shell itself paints with
	// `background:`, so a future edit that "fixes" the same problem by adding an UNGATED
	// `background: transparent` would have sailed past a `background-color:`-only test — and
	// would repaint the shell's sidebar for users with no wallpaper at all.
	const bareRules = [...css.matchAll(/(^|\})\s*\.dshDesktopSidebarSurface\s*\{([^}]*)\}/g)].map((m) => m[2]);
	assert.ok(bareRules.length >= 1, 'the #55 token rule on the bare element is still authored');
	for (const body of bareRules) {
		assert.ok(!/(^|[;.\s-])background(-color)?:/.test(body.replace(/--dsw-specific-sidebar-fill:[^;]*/g, '')),
			`an ungated rule must not clear any paint (no-wallpaper case stays the shell's): ${body}`);
	}
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
	//    10.28.0 moved that look to "linked at 40%", so this leg asserts the
	//    INVARIANT (bare == the explicitly seeded shipped values) instead of one
	//    hardcoded colour, and separately that the link half is load-bearing.
	const shipped = makeCase({
		seed: { 'dsh-dream-skin:sidebar-link': '1', 'dsh-dream-skin:sidebar-opacity': '0.4' }
	});
	const bare = makeCase({ seed: {} });
	assert.equal(bare.last().light, shipped.last().light,
		'missing sidebar keys fall back to exactly what the factory seed writes (linked, 0.4)');
	assert.notEqual(bare.last().light, 'rgba(246, 233, 239, 0.4)',
		'and NOT to the unlinked token at the same alpha — otherwise the link half is not part of the shipped look');

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

	// Issue #96: the SAME drop exposes the host's Windows content radius. The host
	// publishes `--dsh-windows-content-radius: 16px` on this frame element and rounds
	// the centre column's top-left corner with it (measured in the shipped CSS of both
	// hosts this release was built against: npm `.pI_x6G_frame` / `.pI_x6G_centerCol`,
	// desktop `.BynINW_frame` / `.BynINW_centerCol` — same declarations, re-rolled
	// hashes). While the frame carried its own paint the cut-out read as continuous
	// chrome; with the paint dropped it shows the title strip behind it, which is the
	// "lifted corner" beside the logo in the report.
	assert.ok(/--dsh-windows-content-radius:\s*0px/.test(rule[0]),
		'the wash flattens the content corner through the host\'s OWN radius variable');
	// The answer must ride the variable, not a `border-radius` on a hashed class: the
	// variable is what `dsh-client-ui-sidebar-right` reads for its fullscreen corner,
	// so one declaration covers both notches and nothing depends on a build hash.
	assert.ok(!/border-radius/.test(rule[0]),
		'the corner is flattened via the host variable only — a border-radius here would miss the right panel and bet on a hash');
	const ungatedRadius = css.match(/html\[data-windows-titlebar\](?!\[data-dsh-dream-skin-wash\])[^{]*div:has\(> \[data-shell-overlay\]\)\s*\{[^}]*--dsh-windows-content-radius/);
	assert.equal(ungatedRadius, null, 'a wallpaper-less profile keeps the stock 16px corner');

	// 10.9.1 — the caption row is the frame's `::before`: a SEPARATE box, and a
	// background-color set on the element does not reach it. The two rules above left it
	// painting `--dsw-specific-sidebar-fill` across the full window width under a wash — the
	// band the report circles — so it needs a rule of its own, and that rule must stay out of
	// the drag geometry the same pseudo-element carries.
	assert.ok(!/::before/.test(rule[0]),
		'the element rule is its own block — a merged selector list would let one declaration read as covering both boxes');
	const strip = css.match(/html\[data-windows-titlebar\]\[data-dsh-dream-skin-wash\][^{]*div:has\(> \[data-shell-overlay\]\)::before\s*\{[^}]*\}/);
	assert.ok(strip, 'the caption row gets its OWN wash-gated rule (a pseudo-element inherits no declaration from its owner’s block)');
	// COUNT, not a property blacklist (adjudication J1 / third-party T1, and the same shape the
	// #99 gate already uses above): the promise is "this block carries the paint and nothing
	// else". A list of four forbidden names only bans what somebody thought of — a
	// `transform: translateY(-34px)` planted here moves the whole caption band off the top of the
	// window while the fill stays cleared, the box stays generated and the computed app-region
	// stays `drag`, so every substring assertion this test used to make would still pass. The
	// VALUE is on the list as of 10.9.3: the band paints the canvas token TWICE (a solid gradient
	// layer over the colour layer), because the content column under it stacks that token three
	// times counting the body, and one layer left the strip a layer light — the shape 10.9.2
	// shipped with every gate green, since its own computed colour matched the column's exactly.
	// A hardcoded colour here would be a fourth material on the chrome that no skin owns and no
	// gate can trace. The SHORTHAND is in the expected value on purpose: a `background-color`
	// longhand would leave a gradient standing (issue #97 is that story already).
	const stripDecls = strip[0].slice(strip[0].indexOf('{') + 1, strip[0].lastIndexOf('}'))
		.split(';').map((x) => x.trim()).filter(Boolean);
	assert.deepEqual(stripDecls, ['background: linear-gradient(var(--dsw-alias-bg-base), var(--dsw-alias-bg-base)) var(--dsw-alias-bg-base) !important'],
		'the caption rule is EXACTLY one declaration, and it is the canvas token stacked twice with the flag — no box, no geometry, no drag, no invented colour');
	const ungatedStrip = css.match(/html\[data-windows-titlebar\](?!\[data-dsh-dream-skin-wash\])[^{]*\[data-shell-overlay\]\)::before/);
	assert.equal(ungatedStrip, null, 'a wallpaper-less profile keeps the stock caption row');
});

test('issue #97: the session-list foot fade is neutralised under a wash through a hash-free anchor', () => {
	// Reported: a horizontal gradient band sits permanently above the user row at the
	// foot of the left sidebar whenever a wallpaper is on screen. Mechanism, read out
	// of the shipped CSS of both hosts: the sidebar column is painted with the
	// translucent `--dsw-specific-sidebar-fill`, and the list's foot fade
	// (`<span class="<hash>_fade">`, 24px, `linear-gradient(to bottom, transparent,
	// var(--dsw-specific-sidebar-fill))`, inset from the right edge) paints a SECOND
	// layer of that same token over it — a band matching neither the list above nor
	// the footer below. Without a wash the column is opaque, so the fade is invisible
	// and doing its job: the neutralisation is wash-gated.
	//
	// WHY THIS IS A REGRESSION GATE AND NOT JUST A RULE: the 10.5.0 fix for this same
	// complaint anchored on `.qDHVXG_fade`, which measures 0 hits on npm 0.2.0-rc.1
	// (ships `bhn1Oq_fade`) and on the desktop app.asar (ships `_9lTDKa_fade`) alike.
	// The rule was inert on every host anyone was running, and every offline test kept
	// its green because it asserted the CSS STRING, not the match. This anchor carries
	// no hash, so a re-roll cannot silently un-arm it.
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

	const fadeRule = css.match(/html\[data-dsh-dream-skin-wash\]\s*\[class\$="_fade"\](\s*,\s*html\[data-dsh-dream-skin-wash\][^{]*)?\s*\{([^}]*)\}/);
	assert.ok(fadeRule, 'the wash-gated fade rule is in the sheet');
	assert.match(fadeRule[0], /background:\s*transparent/, 'the painted gradient is dropped');
	assert.match(fadeRule[0], /(^|\n)\s*mask-image:\s*none/, 'the mask path is dropped too');
	assert.match(fadeRule[0], /-webkit-mask-image:\s*none/, '…on both spellings');
	// Reverse guards.
	assert.equal(css.match(/(^|\n)\s*\[class\$="_fade"\]\s*\{/), null,
		'the neutralisation never fires without the wash marker — the host fade is the stock look');
	// P0-1 (adversarial review 10.8.0): the legacy `qDHVXG_fade` spelling is an
	// OR-fallback for the 0.1.x line, so it lives INSIDE the gated group. What must
	// never come back is a fade rule of its own that runs without the wash — which is
	// the shape this sheet actually shipped for four releases, and the shape the craft
	// gate could not see because its candidate list was attribute-shaped only.
	const fadeRules = (css.match(/[^{}]+\{[^}]*\}/g) || []).filter((r) => /\.qDHVXG_fade\b/.test(r.split('{')[0]));
	assert.ok(fadeRules.length >= 1, 'the legacy 0.1.x spelling is still covered');
	for (const rule of fadeRules) {
		assert.match(rule.split('{')[0], /data-dsh-dream-skin-wash/,
			'a rule naming the legacy fade hash is not wash-gated');
	}
});

test('issue #100/#101: the readability floor is a WASH state, and it travels on both floored channels', () => {
	// Two questions this gate answers, five sample points each (the shape issue #100
	// asks for), both floored channels, plus the two exempt legs read alongside:
	//   1. Does the floor exist when nothing translucent is behind the surface? It must
	//      NOT (issue #100: with no wallpaper the 10.8.0 floor ate 92% of the slider's
	//      travel for zero readability gain — displayed 8..100 all rendered 0.92).
	//   2. Does one slider mean one minimum? It must (issue #101: layer-2 held at 92%
	//      while the question / approval / plan-review cards — the surfaces you read
	//      BEFORE answering — could still be dragged to fully transparent).
	// Reading the menu / overlay leg in the SAME state is what keeps "gate the floor"
	// from quietly turning into "gate the whole slider".
	const FLOOR = 0.92;
	const DISPLAYED = [0, 25, 50, 75, 100]; // transparency %, i.e. what the row shows
	const alphaOf = (value) => Number(/,\s*([\d.]+)\)/.exec(String(value))[1]);
	const boot = (withWallpaper) => {
		const attrs = new Map();
		const styleProps = {};
		const overrides = new Map();
		const documentMock = {
			body: { contains: () => false, prepend() {}, appendChild() {} },
			head: { children: [], contains() { return false; }, appendChild() {}, append(c) { this.children.push(c); } },
			createElement() { return { style: {}, dataset: {}, textContent: '', remove() {}, append() {} }; },
			createTextNode: () => ({}),
			querySelector: () => null,
			querySelectorAll: () => [],
			documentElement: {
				style: { setProperty(k, v) { styleProps[k] = v; } },
				setAttribute(k, v) { attrs.set(k, v); },
				removeAttribute(k) { attrs.delete(k); }
			}
		};
		const theme = {
			setTheme() {},
			getTheme() {
				return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: {
					'--dsw-alias-bg-base': '#0b0b0e',
					'--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)'
				} }, themes: [], revision: 1 };
			},
			overrideTokens(source, tokens) { overrides.set(source, { ...tokens }); return () => {}; }
		};
		const h = buildSandbox({
			document: documentMock,
			seed: withWallpaper ? { 'dsh-dream-skin:wallpaper': 'data:image/png;base64,AAAA' } : {}
		});
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply({ ...makeApplyContext(h, { captureActions: true }), theme });
		const layer = () => overrides.get('dsh-dream-skin:appearance');
		const bag = h.actionBags['dream-skin-glass'];
		// The row's onChange is `(v) => setModalOpacity(100 - v)`: the ACTION takes
		// solidness while the UI shows transparency. Sampling through the displayed
		// number is the point of this gate, so go through the same inversion.
		const setTransparency = (v) => bag.setModalOpacity(100 - v);
		return {
			h,
			layer,
			bag,
			setTransparency,
			washAttr: () => attrs.has('data-dsh-dream-skin-wash'),
			travel: (token) => DISPLAYED.map((v) => { setTransparency(v); return alphaOf(layer()[token].dark); }),
			cardTravel: () => DISPLAYED.map((v) => { setTransparency(v); return styleProps['--dsh-dream-skin-modal-fill']; })
		};
	};

	// --- No wallpaper: full travel on every leg, floor absent.
	const plain = boot(false);
	assert.equal(plain.washAttr(), false, 'no wallpaper means no wash marker to read');
	assert.deepEqual(plain.travel('--dsw-alias-bg-layer-2'), [1, 0.75, 0.5, 0.25, 0],
		'issue #100: with no wash the dialog channel keeps the slider\'s full 0–1 travel');
	assert.deepEqual(plain.cardTravel(), ['100%', '75%', '50%', '25%', '0%'],
		'issue #101: the card channel keeps the same full travel in the same state');
	assert.deepEqual(plain.travel('--dsw-alias-bg-overlay'), [1, 0.75, 0.5, 0.25, 0], 'overlay leg full travel, no wash');
	assert.deepEqual(plain.travel('--dsw-specific-menu'), [1, 0.75, 0.5, 0.25, 0], 'menu leg full travel, no wash');

	// --- Wallpaper wash on: floor engages on BOTH floored channels, exempt legs do not move.
	const washed = boot(true);
	assert.equal(washed.washAttr(), true, 'a seeded wallpaper publishes the wash marker');
	assert.deepEqual(washed.travel('--dsw-alias-bg-layer-2'), [1, FLOOR, FLOOR, FLOOR, FLOOR],
		'issue #98/#101: under a wash the dialog channel holds the 0.92 readability floor');
	assert.deepEqual(washed.cardTravel(), ['100%', '92%', '92%', '92%', '92%'],
		'issue #101: the card channel floors at the SAME 92% — one slider, one minimum');
	assert.deepEqual(washed.travel('--dsw-alias-bg-overlay'), [1, 0.75, 0.5, 0.25, 0],
		'issue #100: gating the floor did not gate the overlay leg — it still reaches 0');
	assert.deepEqual(washed.travel('--dsw-specific-menu'), [1, 0.75, 0.5, 0.25, 0],
		'issue #100: the menu leg still reaches 0 under a wash');

	// The floor is a clamp on the VALUE, not a rewrite of what the user set: the stored
	// slider number stays where they left it (so removing the wallpaper restores it).
	washed.setTransparency(100);
	assert.equal(washed.h.localStorage.getItem('dsh-dream-skin:modal-opacity'), '0',
		'the floor clamps what is painted, it does not remap the stored slider value');
	// And it is not a ceiling: the solid end still reaches full occlusion.
	washed.setTransparency(0);
	assert.equal(alphaOf(washed.layer()['--dsw-alias-bg-layer-2'].dark), 1, 'the solid end still reaches 1');
	washed.setTransparency(50);
	assert.equal(alphaOf(washed.layer()['--dsw-alias-bg-layer-2'].dark), FLOOR,
		'dragging back down re-applies the floor (a clamp on the value, not a one-shot retune)');
});

test('issue #100: adding or clearing the wallpaper re-publishes the floored channels, slider untouched', () => {
	// The floor lives in BAKED token values, so a wash that appears or disappears after
	// boot changes nothing until something re-publishes. A user who sets (or clears) a
	// wallpaper without ever touching the 弹窗滑杆 is exactly that case — and if this
	// re-publish is missing, the dialog either keeps a floor it no longer has a right
	// to, or keeps leaking through the wallpaper it just got.
	const bootPlain = () => {
		const attrs = new Map();
		const styleProps = {};
		const overrides = new Map();
		const documentMock = {
			body: { contains: () => false, prepend() {}, appendChild() {} },
			head: { children: [], contains() { return false; }, appendChild() {}, append(c) { this.children.push(c); } },
			createElement() { return { style: {}, dataset: {}, textContent: '', remove() {}, append() {} }; },
			createTextNode: () => ({}),
			querySelector: () => null,
			querySelectorAll: () => [],
			documentElement: {
				style: { setProperty(k, v) { styleProps[k] = v; } },
				setAttribute(k, v) { attrs.set(k, v); },
				removeAttribute(k) { attrs.delete(k); }
			}
		};
		const theme = {
			setTheme() {},
			getTheme() {
				return { preference: 'midnight', active: { id: 'midnight', colorScheme: 'dark', tokens: {
					'--dsw-alias-bg-base': '#0b0b0e',
					'--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)'
				} }, themes: [], revision: 1 };
			},
			overrideTokens(source, tokens) { overrides.set(source, { ...tokens }); return () => {}; }
		};
		const h = buildSandbox({ document: documentMock });
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply({ ...makeApplyContext(h, { captureActions: true }), theme });
		return {
			h,
			layer: () => overrides.get('dsh-dream-skin:appearance'),
			styleProps,
			attrs,
			bags: h.actionBags
		};
	};
	const alphaOf = (value) => Number(/,\s*([\d.]+)\)/.exec(String(value))[1]);
	const s = bootPlain();
	s.bags['dream-skin-glass'].setModalOpacity(50);
	assert.equal(alphaOf(s.layer()['--dsw-alias-bg-layer-2'].dark), 0.5, 'start: no wash, slider owns layer-2');
	assert.equal(s.styleProps['--dsh-dream-skin-modal-fill'], '50%', 'start: card channel matches the slider');

	// The user picks a wallpaper from the Wallpaper row — never touches the popup slider.
	s.bags['dream-skin-wallpaper'].setWallpaper('data:image/png;base64,BBBB');
	assert.equal(s.attrs.has('data-dsh-dream-skin-wash'), true, 'the wash marker went up');
	assert.equal(alphaOf(s.layer()['--dsw-alias-bg-layer-2'].dark), 0.92,
		'issue #100: the floor engages the moment a wash appears, with the slider still at 50');
	assert.equal(s.styleProps['--dsh-dream-skin-modal-fill'], '92%',
		'issue #101: the card channel floors in the same move, not one repaint later');

	// …and the other way round: clearing it must give the travel back, not strand 0.92.
	s.bags['dream-skin-wallpaper'].clearWallpaper();
	assert.equal(s.attrs.has('data-dsh-dream-skin-wash'), false, 'the wash marker came down');
	assert.equal(alphaOf(s.layer()['--dsw-alias-bg-layer-2'].dark), 0.5,
		'clearing the wallpaper restores the slider\'s own value on layer-2');
	assert.equal(s.styleProps['--dsh-dream-skin-modal-fill'], '50%',
		'and on the card channel — the floor is not allowed to stick');
	assert.equal(s.h.localStorage.getItem('dsh-dream-skin:modal-opacity'), '0.5',
		'the round trip never wrote to the slider');
});

test('issue #100 (adjudication R2): a wash flip re-renders BOTH opacity rows, not just the tokens', () => {
	// The hook that keeps the two rows honest had zero coverage: deleting `onWashFlip = …` left
	// every case green (measured). What it is for: the floor is decided by the WASH, so a
	// wallpaper added or cleared from the Wallpaper row has to re-render the slider rows — their
	// own actions are the only other thing that syncs them, and this path does not go through
	// those actions. Asserted on the two STORE revisions (the render inputs), not on a call
	// count: a hook that ran but published nothing would be no better than no hook.
	const h = buildSandbox();
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	const glass = h.storeStates['dream-skin-glass'];
	const legacy = h.storeStates['dream-skin-modal-opacity'];
	const before = { glass: glass.revision, legacy: legacy.revision };
	h.actionBags['dream-skin-wallpaper'].setWallpaper('data:image/png;base64,BBBB');
	assert.ok(glass.revision > before.glass, 'the glass row store must be synced when the wash appears (its floor marker changed)');
	assert.ok(legacy.revision > before.legacy, 'and so must the legacy modal row');
	const afterAdd = { glass: glass.revision, legacy: legacy.revision };
	h.actionBags['dream-skin-wallpaper'].clearWallpaper();
	assert.ok(glass.revision > afterAdd.glass, 'clearing the wallpaper is the same kind of event and must sync too');
	assert.ok(legacy.revision > afterAdd.legacy, 'both rows, both directions');
});

test('issue #100: the slider says so when the floor is holding it (marker wired, 8 languages)', () => {
	// String-level ON PURPOSE, and labelled as such: the marker lives in a JSX prop that this
	// sandbox cannot render, so what can be pinned here is that the branch exists, that it reads
	// the SAME two facts the floor reads (the wash state and the floor constant — not a copied
	// number), that the value cell still prints a plain percentage (m01584: the marker is a note
	// under the track, not a suffix on the number — it used to be the suffix and squeezed the
	// row), and that every shipped dictionary carries the key it prints. The visual behaviour
	// needs a real page and is recorded as unverified in docs/desktop-support.md.
	const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');
	const at = src.indexOf('label: t("modal.title")');
	assert.ok(at !== -1, 'the modal slider is still where it was');
	const branch = [src.slice(at, at + 1200)];
	assert.match(branch[0], /format:\s*\(v\)\s*=>\s*`\$\{v\}%`/, 'the value cell prints the bare percentage again');
	assert.doesNotMatch(branch[0], /% · /, 'and no longer glues the marker onto it');
	assert.match(branch[0], /note:\s*washActive/, 'the marker is a note gated on the wash state, like the floor itself');
	assert.match(branch[0], /DIALOG_ALPHA_FLOOR/, 'and on the floor constant — not on a literal 0.92');
	assert.match(branch[0], /modal\.floorMark/, 'and it prints the translated marker');
	assert.match(branch[0], /: null/, 'with no note at all while nothing is holding the slider');
	for (const lang of ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru']) {
		const at = src.indexOf(`const ${lang} = {`);
		assert.ok(at !== -1, `${lang} dictionary`);
		const body = src.slice(at, src.indexOf('};', at));
		assert.ok(body.includes('"modal.floorMark"'), `${lang} must carry modal.floorMark (an untranslated marker is a blank chip in that UI)`);
	}
});

test('issue #115: low-power floors the menu fill, so removing the frost cannot make menus MORE transparent', () => {
	// The 10.21.1 switch cleared every backdrop-filter but left the menu fill at the
	// skins' authored 0.46 / 0.58. A frosted pane reads as solid because the BLUR
	// hides what is behind it; without the blur the same alpha is a plastic film you
	// read the chat through — the switch labelled "reduce transparency" made menus
	// more transparent than normal. The fix floors ONE channel (--dsw-menu-surface-fill)
	// only while the switch is on, with the skin's own hue, and emits nothing when off.
	const FLOOR = 0.92;
	const MENU = 'rgba(39, 42, 48, 0.46)';
	const alphaOf = (value) => Number(/,\s*([\d.]+)\)/.exec(String(value))[1]);
	const rgbOf = (value) => {
		const body = /^rgba?\(([^)]+)\)$/.exec(String(value).replace(/\s/g, ''));
		assert.ok(body, `expected an rgb()/rgba() colour, got ${value}`);
		return body[1].split(',').slice(0, 3).join(',');
	};
	const boot = (perf) => {
		const attrs = new Map();
		const styleProps = {};
		const overrides = new Map();
		const documentMock = {
			body: { contains: () => false, prepend() {}, appendChild() {} },
			head: { children: [], contains() { return false; }, appendChild() {}, append(c) { this.children.push(c); } },
			createElement() { return { style: {}, dataset: {}, textContent: '', remove() {}, append() {} }; },
			createTextNode: () => ({}),
			querySelector: () => null,
			querySelectorAll: () => [],
			documentElement: {
				style: { setProperty(k, v) { styleProps[k] = v; } },
				setAttribute(k, v) { attrs.set(k, v); },
				removeAttribute(k) { attrs.delete(k); }
			}
		};
		const theme = {
			setTheme() {},
			getTheme() {
				return { preference: 'abyss', active: { id: 'abyss', colorScheme: 'dark', tokens: {
					'--dsw-alias-bg-base': '#0b0b0e',
					'--dsw-alias-bg-layer-2': 'rgba(22, 22, 28, 0.85)',
					'--dsw-menu-surface-fill': MENU
				} }, themes: [], revision: 1 };
			},
			overrideTokens(source, tokens) { overrides.set(source, { ...tokens }); return () => {}; }
		};
		const seed = { 'dsh-dream-skin:modal-opacity': '0.4' };
		if (perf) seed['dsh-dream-skin:performance'] = '1';
		const h = buildSandbox({ document: documentMock, seed });
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply({ ...makeApplyContext(h, { captureActions: true }), theme });
		return { h, layer: () => overrides.get('dsh-dream-skin:appearance') || {}, bag: h.actionBags['dream-skin-glass'] };
	};

	const on = boot(true);
	const menuOn = on.layer()['--dsw-menu-surface-fill'];
	assert.ok(menuOn, 'low-power emits the menu-floor override');
	assert.ok(alphaOf(menuOn.dark) >= FLOOR, `the dark menu must hold the floor, got ${alphaOf(menuOn.dark)}`);
	assert.ok(alphaOf(menuOn.light) >= FLOOR, `the light menu must hold the floor, got ${alphaOf(menuOn.light)}`);
	assert.equal(rgbOf(menuOn.dark), rgbOf(MENU), 'the skin\'s own menu hue is preserved (not repainted in the canvas colour)');
	// The INACTIVE scheme's hue falls back to the built-in base exactly like layer-2
	// does: the theme object only carries the active scheme's tokens. The floor (the
	// part this fix owns) still applies to both, asserted above.

	const off = boot(false);
	assert.equal(off.layer()['--dsw-menu-surface-fill'], undefined,
		'normal mode does not touch the menu channel at all — the authored glass stays');

	// The override is keyed on the switch, so the toggle must both add and withdraw it.
	off.bag.setPerformance(true);
	assert.ok(off.layer()['--dsw-menu-surface-fill'], 'turning the switch on emits the floor without a reload');
	assert.ok(alphaOf(off.layer()['--dsw-menu-surface-fill'].dark) >= FLOOR, 'and it is the same floor');
	off.bag.setPerformance(false);
	assert.equal(off.layer()['--dsw-menu-surface-fill'], undefined,
		'turning it off withdraws the floor immediately (menus go back to the authored alpha)');
});

test('issue #103: mist seeds BELOW the floor on purpose, and both halves of that claim are pinned', () => {
	// A deliberate deviation with no gate is a deviation waiting to be "fixed" by
	// someone who cannot tell it was a decision (issue #95's whole complaint). mist
	// authors its dialog fill at 0.90 while the floor is 0.92, so a FRESH mist install
	// with a wallpaper renders the floored surfaces one step more solid than that
	// skin intent. Raising mist means re-rolling the design-system output (8 skins
	// x 57 tokens), so the deviation stays. Pinning only "0.90" would let the floor
	// move under it, and pinning only "floor > 0.90" would let mist be re-rolled while
	// the note claims otherwise — both halves are asserted, from the shipped data.
	const mist = skinById('mist');
	assert.equal(mist.defaults.modalOpacity, 0.90,
		'issue #103: mist\'s factory dialog seed is 0.90 (if this redden because you raised it, delete the deviation note too)');
	const floor = Number(/const DIALOG_ALPHA_FLOOR = ([\d.]+);/.exec(CODE)[1]);
	assert.equal(floor, 0.92, 'issue #103: the readability floor is 0.92');
	assert.ok(mist.defaults.modalOpacity < floor,
		'issue #103: the two are STILL in the deviating order — if you aligned them, the claim in client.js / README is no longer true');
	// The other seven skins must NOT be quietly drifting under the floor as well.
	const under = SHIPPED_SKINS.filter((s) => s.defaults.modalOpacity < floor).map((s) => s.id);
	assert.deepEqual(under, ['mist'],
		'issue #103: mist is the ONLY skin seeded under the floor; a second one is a new decision, not a new datum');
});

test('drift probe (#96/#97): an attribute-anchored group is judged by what the HOST css still declares', async () => {
	// The two hash-free anchors carry no `.class` token for the ownership set to look
	// up, so they need their own reading — and that reading has to stay strict enough
	// to catch a rename. Two sandboxes, opposite verdicts, same mount shape:
	//   host still ships a class token ENDING in `_fade` and mentions the shell stamp
	//     → healthy surfaces this page never mounted (notMounted);
	//   host renamed the fade to `_fadeFoot` and dropped the stamp
	//     → the anchors are gone (drifted). A substring test would have waved the
	//       rename through — `_fade` is still in `_fadeFoot` — and that is precisely
	//       the silent no-op issue #97 exists to catch.
	const HOST_ALIVE = '.lXshSW_root{display:block}'
		+ '.bhn1Oq_fade{background:linear-gradient(to bottom,transparent,var(--dsw-specific-sidebar-fill))}'
		+ '[data-shell-overlay]{position:absolute}';
	const HOST_RENAMED = '.lXshSW_root{display:block}.bhn1Oq_fadeFoot{background:linear-gradient(red,blue)}';
	const MOUNTED = new Set([
		'.uV2eYG_root',
		SIDEBAR_PROBE_SEL
	]);
	const run = async (hostCss) => {
		const hostSheet = makeEl();
		hostSheet.textContent = hostCss;
		const doc = {
			body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
			querySelector: (sel) => (MOUNTED.has(sel) ? { matched: true } : null),
			querySelectorAll: (sel) => (sel === 'style[data-plugin-css]' ? [hostSheet] : [])
		};
		const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn() {}, log() {}, error() {} } });
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply(makeApplyContext(h));
		await settleDrift(h.window);
		return h.window.__DSH_DREAM_SKIN_STATUS__.anchors;
	};
	const ATTR_GROUPS = ['div:has(> [data-shell-overlay])', '[class$="_fade"]'];

	const alive = await run(HOST_ALIVE);
	assert.equal(alive.pending, false, 'liveness proven by the two mounted hashed groups');
	for (const sel of ATTR_GROUPS) {
		assert.ok(alive.notMounted.includes(sel), `${sel}: owned by the host css but unmounted ⇒ notMounted, got ${JSON.stringify(alive.notMounted)}`);
		assert.ok(!alive.drifted.includes(sel), `${sel}: an anchor the host still declares must never be a drift alarm`);
	}

	const renamed = await run(HOST_RENAMED);
	for (const sel of ATTR_GROUPS) {
		assert.ok(renamed.drifted.includes(sel), `${sel}: the host no longer declares this anchor ⇒ drifted, got ${JSON.stringify(renamed.drifted)}`);
		assert.ok(!renamed.notMounted.includes(sel), `${sel}: a renamed anchor must not be filed as healthy`);
	}
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
	// The shipped numbers come from the factory SKIN's own `defaults` block, not
	// from a second copy in the seed table (they used to disagree: 0.19 seeded
	// vs 0.26 authored for exactly the same skin).
	const NEBULA = skinById('nebula').defaults;
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-opacity'), String(NEBULA.wallpaperOpacity), 'factory wallpaper opacity applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-blur'), String(NEBULA.wallpaperBlur), 'factory wallpaper blur applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:composer-opacity'), String(NEBULA.composerOpacity), 'factory composer opacity applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), String(NEBULA.modalOpacity), 'factory modal opacity applied (adjudication R6 pin)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:material-preset'), 'frosted', 'factory material applied (frosted IS the shipped look, blue-team B5)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-refresh'), '{"on":0,"hours":24}', 'factory refresh schedule OFF (blue-team B7: third-party polling is opt-in)');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper-fit'), 'cover', 'factory fill mode is part of the shipped look record');
	// 10.28.0: the shipped look's sidebar half lives in the SHARED table, so the
	// seed is the one place that shows both keys landing on a fresh profile.
	// Literals on purpose: these are the declared 10.28.0 numbers, not a
	// re-derivation out of the bundle (which would make the pin blind).
	assert.equal(h.localStorage.getItem('dsh-dream-skin:sidebar-opacity'), '0.4',
		'factory sidebar opacity applied');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:sidebar-link'), '1',
		'factory sidebar link applied (linked = follow the wallpaper)');
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
	//
	// The seeded slider value is 0.9, i.e. ABOVE the issue #98 dialog floor: this
	// gate is about hue ownership and slider authority, and a seed below the floor
	// would grade the floor instead. The floor has its own gate below.
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
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.95');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	assert.doesNotThrow(() => e.apply({ ...baseCtx, theme }));

	const layer = overrides.get('dsh-dream-skin:appearance');
	assert.ok(layer, 'the appearance layer is published');
	const popupDark = layer['--dsw-alias-bg-layer-2'];
	assert.ok(popupDark, 'layer-2 rides the popup-opacity override layer now (was unreachable by the slider)');
	assert.equal(popupDark.dark, 'rgba(22, 22, 28, 0.95)', 'layer-2 keeps the SKIN\'s own hue (22,22,28) at the stored slider alpha 0.95');
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
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.95');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	const ctx = { ...baseCtx, theme };
	ctx.on = (ev, fn) => { if (ev === 'theme/change') handlers.push(fn); return () => {}; };
	assert.doesNotThrow(() => e.apply(ctx));
	await sleep(10); // let the boot-deferred pass settle

	assert.equal(published.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'].dark, 'rgba(22, 22, 28, 0.95)',
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
	assert.equal(published.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'].dark, 'rgba(36, 28, 20, 0.95)',
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
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.95');
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
	assert.equal(published.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'].dark, 'rgba(36, 28, 20, 0.95)',
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
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.95');
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
	assert.equal(entry.light, 'rgba(255, 253, 253, 0.95)', 'the settled layer-2 keeps the rose hue in the light entry at the stored alpha');
	assert.equal(entry.dark, 'rgba(21, 21, 23, 0.95)', 'the inactive dark entry of the settled layer-2 falls back to the scheme base');
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
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.95');
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
	h.localStorage.setItem('dsh-dream-skin:modal-opacity', '0.95');
	const e = h.factory(makeRequire(makeRuntime().RT));
	const baseCtx = makeApplyContext(h, { captureActions: true });
	e.apply({ ...baseCtx, theme });
	await sleep(20); // let the boot-deferred overlay pass publish
	const entry = overrides.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(entry.dark, 'rgba(22, 22, 28, 0.95)', 'the ACTIVE (dark) scheme keeps the skin\'s own layer-2 hue at the slider alpha');
	assert.equal(entry.light, 'rgba(255, 255, 255, 0.95)', 'the INACTIVE (light) scheme entry is painted from the scheme base (white), not the skin\'s dark hue');
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

test('adjudication R6: fresh install bakes the factory modal seed (literal 0.92) into storage and the boot overlay', async () => {
	// The factory seed drives the FIRST-LAUNCH dialog fill. Both the
	// localStorage value and the boot overlay alpha must carry the shipped
	// number, and that number is written out HERE as a literal.
	//
	// It used to be read back out of `skinById('nebula')` — the very object
	// under test — which made the pin blind by construction: change the design
	// system's number and the assertion follows it silently (adjudication T2b,
	// issue #71). 10.5.1 ruled for 0.6; 10.6.1 deliberately moved to 0.92 so a
	// dialog actually occludes the conversation behind it, and that change is
	// declared in CHANGELOG under "行为变更". The counterpart literal lives in
	// tests/skin.quality.test.cjs; the two must be edited together.
	const FACTORY_MODAL = '0.92';
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
	assert.equal(h.localStorage.getItem('dsh-dream-skin:modal-opacity'), FACTORY_MODAL, 'factory modal opacity seed is written on first launch (literal pin)');
	await sleep(20); // let the deferred overlay pass publish
	const entry = overrides.get('dsh-dream-skin:appearance')['--dsw-alias-bg-layer-2'];
	assert.equal(entry.dark, 'rgba(22, 22, 28, ' + FACTORY_MODAL + ')', 'the boot overlay carries the factory-seeded alpha, not the 0.94 fallback');
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
	await settleDrift(h.window);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.shell, 'desktop', 'desktop shell detected via the documented body stamp');
	assert.equal(status.anchors.probed, 9, 'eight host anchor groups + the gated desktop anchor');
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
	await settleDrift(h.window);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, false, 'liveness proven via matched host anchors');
	assert.deepEqual(status.anchors.drifted, [], 'every refinement confirmed live');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 0, 'a clean verdict never warns');
});

test('drift probe (A-1): one replaced anchor group is reported as exactly that group', async () => {
	// A-1 acceptance case ③ (web variant): seven host groups mount (liveness
	// proven), the eighth never appears — drifted must contain EXACTLY that
	// group's raw selector, nothing else.
	//
	// The group under test is `[class$="_fade"]`, and the choice is forced rather than
	// stylistic: after A1 registered `.lXshSW_root, ._7yHdaG_panel` and `.uV2eYG_root`
	// as channel-divergent, EVERY class-anchored probe group is in some registry (three
	// retired, two channel-divergent), so the only groups that can still legitimately
	// read as drift are the hash-free ones. That is the shape of the contract now, and
	// `tests/hashes.test.cjs` reddens if a future group joins the shipped table without
	// saying which pool it belongs to.
	const warns = [];
	const driftedSel = '[class$="_fade"]';
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}),
		querySelector: (sel) => (sel === driftedSel ? null : { matched: true }),
		querySelectorAll: () => [], head: makeEl()
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await settleDrift(h.window);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, false, 'liveness proven (seven groups matched ≥ the two-group gate)');
	assert.deepEqual(status.anchors.drifted, [driftedSel], 'drifted lists exactly the one unmatched group');
	assert.ok(warns.some((w) => w.includes(driftedSel)), 'the console line names the drifted group');
	// B8: "harmless, cosmetic only" is only true for the anchors the probe samples. The
	// question / approval / plan cards mount on demand and are NOT in the probe, so the
	// human-facing line has to say where its own authority ends.
	assert.ok(warns.some((w) => w.includes('NOT probed') && w.includes('question / approval / plan')),
		'the console line declares its own coverage limit instead of implying every refinement was checked');
});

test('drift probe (J1): a healthy modern host can actually reach the positive signal', async () => {
	// The machine contract in docs/desktop-support.md says `drifted: [] && pending:
	// false` is the ONLY positive "all refinements live" signal. Before J1 that
	// sentence described a state no measurable host could produce: the probe table
	// still samples `.bqrRRG_card`, the `.nArs4W_*` family and `.qDHVXG_fade`, and all
	// three measure 0 hits on every host install this repository can read (they are
	// kept as OR-fallbacks for the 0.1.x line, which is an assumption — there is no
	// 0.1.x corpus). So desktop tooling following the doc saw "anchor damage" on every
	// page load of a host whose refinements were in fact all live.
	//
	// The fixture is that host: five live groups mounted (the two #96/#97 attribute
	// anchors among them), three retired groups absent, no host sheet vouching for
	// anything absent. This is the shape that used to publish a three-item drift list.
	const warns = [];
	const RETIRED = new Set([
		'.bqrRRG_card',
		'.nArs4W_panel, .nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody',
		'.qDHVXG_fade'
	]);
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
		querySelector: (sel) => (RETIRED.has(sel) ? null : { matched: true }),
		querySelectorAll: () => []
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	// Sample 1 (intermediate, read SYNCHRONOUSLY — no timer in this assertion, so it cannot
	// race): the page is published at boot, but the anchor verdict belongs to a ladder whose
	// first round has not been given a tick yet. A terminal verdict here would mean the probe
	// answered before it looked.
	const early = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.ok(!early || !early.anchors || early.anchors.pending === true,
		`no terminal anchor verdict may exist before the ladder runs (got ${JSON.stringify(early && early.anchors)})`);
	// Sample 2 (terminal, waited on by condition, not by a fixed sleep — issue #104: the
	// 10.8.0 version of this case slept 250ms and the 4-step ladder could finish later than
	// that under load, which is how it flaked once in four full runs).
	await settleDrift(h.window);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, false, 'the ladder completed with liveness proven');
	assert.ok(status.checkedAt >= (early ? early.checkedAt || 0 : 0), 'the terminal sample is the later one');
	assert.deepEqual(status.anchors.drifted, [], 'drifted is EMPTY on a host whose live anchors all matched — the positive signal is reachable');
	assert.deepEqual(status.anchors.notMounted, [], 'nothing to retract either');
	assert.deepEqual(status.anchors.retired.sort(), [...RETIRED].sort(), 'the retired anchors are still reported, in their own pool');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 0, 'a healthy host is never warned about');
});

test('issue #105: the snapshot counts what the broad `_fade` anchor actually addresses', async () => {
	// `[class$="_fade"]` trades scope for durability (issue #97), so on a machine that also
	// runs another skin plugin the anchor may be reaching faces we never meant to touch. The
	// census measures that from installed bytes; this measures it from a LIVE page, because
	// the reviewer's acceptance criterion is a field a two-plugin machine can self-report:
	// one host fade + one third-party fade MUST read 2 — reporting 1 is the failure.
	const fade = (cls) => ({ className: cls, getAttribute: (k) => (k === 'class' ? cls : null) });
	const boot = (nodes, throwing) => {
		const RETIRED = new Set([
			'.bqrRRG_card',
			'.nArs4W_panel, .nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody',
			'.qDHVXG_fade'
		]);
		const doc = {
			body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
			querySelector: (sel) => (RETIRED.has(sel) ? null : { matched: true }),
			querySelectorAll: (sel) => {
				// Only the fade read throws: the ownership classifier and the marker passes
				// must keep working, or "the verdict is unaffected" below would be measuring
				// a page that broke everywhere rather than the one field that could not read.
				if (throwing && sel === '[class$="_fade"]') throw new Error('sandbox closed');
				return sel === '[class$="_fade"]' ? nodes : [];
			}
		};
		const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn() {}, log() {}, error() {} } });
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply(makeApplyContext(h));
		return h;
	};

	const two = await settleDrift(boot([fade('bhn1Oq_fade'), fade('skinshop_workspace_fade')]).window);
	assert.equal(two.fadeMatches, 2, 'a host fade PLUS a third-party fade must be reported as 2, not quietly as 1');
	assert.deepEqual(two.fadeClasses, ['bhn1Oq_fade', 'skinshop_workspace_fade'],
		'the class tokens come along too — a machine has to be able to attribute the overlap, not just count it');

	const one = await settleDrift(boot([fade('bhn1Oq_fade')]).window);
	assert.equal(one.fadeMatches, 1, 'the count follows the page, it is not a constant');

	const none = await settleDrift(boot([]).window);
	assert.equal(none.fadeMatches, 0, 'a page with no such element says 0');
	assert.deepEqual(none.fadeClasses, [], 'and names nothing');

	// 兜底不许伪造观测值: an unreadable DOM is `null` ("could not look"), never a 0 that a
	// dashboard would draw as "no coexistence here".
	const blind = await settleDrift(boot([], true).window);
	assert.equal(blind.fadeMatches, null, 'a DOM that throws on the fade read is NOT reported as zero matches');
	assert.equal(blind.pending, false, 'and the drift verdict still converges — the observation is separate from the verdict, so one unreadable field cannot hold the ladder hostage');
});

test('drift probe (J1, issue #104 reverse): a host that cannot prove liveness never reaches the positive signal', async () => {
	// Waiting on a condition instead of a clock is only safe if the gate still reddens when
	// the terminal state is unreachable. Same fixture, one change: the page matches a SINGLE
	// anchor and offers no `[data-composer-input]` sentinel and no desktop shell, so
	// driftProbeLivenessProven() stays false on every round — and a probe that has not proven
	// it is looking at a live page must keep `pending: true` instead of publishing
	// `drifted: []` (that empty list is exactly the green the machine contract reserves for
	// "all refinements live"). If this case ever passes, the waiting version of J1 became a
	// light that can never be red.
	const asked = new Set();
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
		querySelector: (sel) => {
			if (sel === '[data-composer-input]') return null;
			if (asked.size === 0 && !asked.has(sel)) { asked.add(sel); return { matched: true }; }
			return null;
		},
		querySelectorAll: () => []
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn() {}, log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await assert.rejects(
		settleDrift(h.window, { timeoutMs: 600, stepMs: 20 }),
		/never published a terminal verdict/,
		'an unproven liveness must keep the verdict pending — the helper names it, it does not grant a pass');
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, true, 'and what it publishes on the way is pending, not an empty drift list');
	assert.deepEqual(status.anchors.drifted, [], 'drifted stays empty BECAUSE the round is undecided (pending guards it)');
});

test('settleDrift waits on the verdict, and still fails when the probe never converges', async () => {
	// The helper replaced thirteen fixed `sleep(250)` calls, so it needs its own negative: a
	// poll that silently timed out would turn "the probe stopped converging" into a green test.
	// Two directions are pinned — it returns the moment the verdict exists (no budget burned),
	// and it reports loudly when the verdict never arrives.
	const t0 = Date.now();
	const settled = await settleDrift({ __DSH_DREAM_SKIN_STATUS__: { anchors: { pending: false, drifted: [] } } });
	assert.deepEqual(settled.drifted, [], 'a converged verdict is returned, not re-derived');
	assert.ok(Date.now() - t0 < 200, `a converged ladder must not wait out the budget (took ${Date.now() - t0}ms)`);
	await assert.rejects(
		settleDrift({ __DSH_DREAM_SKIN_STATUS__: { anchors: { pending: true, drifted: [] } } }, { timeoutMs: 80, stepMs: 10 }),
		/never published a terminal verdict/,
		'a probe stuck pending is a failure the helper names, not a pass it grants');
	await assert.rejects(settleDrift({ }, { timeoutMs: 80, stepMs: 10 }), /never published a terminal verdict/,
		'a page that never published any status is the same failure');
	// The one caller that only needs the FIRST snapshot opts out of the terminal condition —
	// proving `until` is a real seam and not decoration.
	const first = await settleDrift(
		{ __DSH_DREAM_SKIN_STATUS__: { anchors: { pending: true }, checkedAt: 12 } },
		{ until: (s) => s && s.anchors && s.checkedAt });
	assert.equal(first.pending, true, 'the custom predicate is honoured, so an undecided page is reachable');
});

test('waitFor converges the moment the observable does, and fails LOUDLY when it never will', async () => {
	// The "a check that can never fail is not a check" rule, applied to the helper itself:
	// if a timeout could read as a pass, every converted site would silently regress to
	// "assert nothing". Feed it a predicate that never becomes true and demand a named
	// rejection. Mirrors the settleDrift negative above (issue #104 precedent).
	let ticks = 0;
	const t0 = Date.now();
	const won = await waitFor(() => ({ done: true, observed: 'immediate' }), { label: 'already-true' });
	assert.equal(won, 'immediate', 'a converged reading is returned, not re-derived');
	assert.ok(Date.now() - t0 < 200, `an already-true predicate must not wait out the budget (took ${Date.now() - t0}ms)`);
	await assert.rejects(
		waitFor(() => { ticks += 1; return { done: false, observed: { stuckAt: 1, polls: 'never-zero' } }; },
			{ timeoutMs: 80, stepMs: 10, label: 'never-converging-site' }),
		/never converged/,
		'a predicate that never flips must make the helper THROW — a timeout is a failure, not a pass');
	assert.ok(ticks >= 2, `the poll really iterated (saw ${ticks} samples before the throw)`);
	let caught;
	try {
		await waitFor(() => ({ done: false, observed: { lastSaw: 'nothing' } }), { timeoutMs: 60, stepMs: 10, label: 'named-reason' });
	} catch (e) { caught = e; }
	assert.ok(caught, 'the never-converging poll rejects');
	assert.match(caught.message, /named-reason/, 'the rejection message NAMES the label — every converted site is findable by its reason');
	assert.match(caught.message, /lastSaw/, 'and it carries the last observed value, so the failure is diagnosable without re-running');
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
	// M21 differential, still intact and now aimed at a LIVE anchor: our own sheet
	// contains `.uV2eYG_root` (it is the material rule's selector), so if the
	// classifier ever dropped the `[data-plugin-css]` qualifier our stylesheet would
	// vouch for our own selector and a real re-roll would be filed as
	// "healthy, just not mounted".
	ourSheet.textContent = '.uV2eYG_root{backdrop-filter:blur(1px)}';
	const RETIRED = [
		'.bqrRRG_card',
		'.nArs4W_panel, .nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody',
		'.qDHVXG_fade'
	];
	const MOUNTED = new Set([
		SIDEBAR_PROBE_SEL,
		// Issue #96/#97: the two hash-free anchors mount on any ordinary page (the
		// AppFrame is the app root, the session-list fade ships with the list), so
		// this fixture mounts them too — their classification path when they are
		// ABSENT has its own gate further down.
		'div:has(> [data-shell-overlay])',
		'[class$="_fade"]'
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
	await settleDrift(h.window);
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(t0.anchors.pending, false, 'terminal verdict reached (liveness via the mounted groups)');
	assert.deepEqual(t0.anchors.notMounted, ['.lXshSW_root, ._7yHdaG_panel'],
		'the group the host CSS still owns reads notMounted — a healthy host that never opened that surface');
	assert.deepEqual(t0.anchors.channelAbsent, ['.uV2eYG_root'],
		'A1: a registered group no HOST sheet vouches for is channel-absent — and crucially NOT notMounted. '
		+ 'Our own sheet really does mention it (the material rule), so this is still the M21 differential: drop '
		+ 'the [data-plugin-css] qualifier and our stylesheet would vouch for our own selector and read healthy.');
	assert.deepEqual(t0.anchors.drifted, [],
		'nothing unexplained is left: every missing group is accounted for by ownership, retirement, or a dated divergence measurement');
	assert.deepEqual(t0.anchors.retired.sort(), RETIRED.slice().sort(),
		'J1: the three anchors kept only for the unmeasured 0.1.x line get their own pool');
	assert.equal(warns.filter((w) => w.includes('bqrRRG') || w.includes('nArs4W') || w.includes('qDHVXG')).length, 0,
		'J1: retired anchors never reach the human alarm — on a healthy modern host it would fire on every page load');
	const driftWarns = warns.filter((w) => w.includes('drifted'));
	assert.equal(driftWarns.length, 0,
		'A1: a channel-divergent hash must not reach the human alarm any more than an unmounted surface may — '
		+ 'warning on it would fire on every page load of the official desktop shell, which is the J1 mistake reborn');
	assert.ok(!warns.some((w) => w.includes('uV2eYG')), 'the registered group is machine-readable, not shouted about');
	assert.ok(!warns.some((w) => w.includes('lXshSW')), 'an unmounted-but-owned surface is NOT an alarm');
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
	// Our own sheet really does contain `.uV2eYG_root` (the material rule), so the
	// drifted entry below cannot be made to look notMounted by loosening the
	// `[data-plugin-css]` qualifier.
	ourSheet.textContent = '.uV2eYG_root{backdrop-filter:blur(1px)}';
	const LATE_GROUP = '.lXshSW_root, ._7yHdaG_panel';
	// The drifted stand-in here is `[class$="_fade"]`, deliberately LEFT unmounted by this
	// fixture: after A1 every class-anchored group is in some registry, so the only way to
	// keep a real `drifted` entry — and therefore keep the "warns once, never repeats" leg
	// from going vacuous — is to withhold a hash-free anchor whose token the host sheet
	// above (`.lXshSW_root` only) genuinely does not declare.
	const DRIFTED_GROUP = '[class$="_fade"]';
	const MOUNTED = new Set([
		SIDEBAR_PROBE_SEL,
		// Issue #96/#97: the AppFrame anchor mounts on any ordinary page, so this fixture
		// mounts it — its classification path when ABSENT has its own gate further down.
		'div:has(> [data-shell-overlay])'
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
	await settleDrift(h.window);
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.deepEqual(t0.anchors.notMounted, [LATE_GROUP], 'terminal snapshot names the unmounted group');
	assert.deepEqual(t0.anchors.drifted, [DRIFTED_GROUP],
		'the one unaccounted group is the whole drift list — J1 retired anchors and A1 channel-divergent anchors do not join it');
	assert.deepEqual(t0.anchors.channelAbsent, ['.uV2eYG_root'],
		'A1: the registered hash sits in its own pool while the unregistered anchor above stays in drifted');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 1, 'terminal drift warns once');
	// User opens the surface "a minute later": the group mounts, DOM mutates.
	MOUNTED.add(LATE_GROUP);
	for (const o of observers) o.cb([]);
	// debounce (300ms) + resample: the observable that proves the wait is over is the
	// notMounted pool flipping to empty. Poll for THAT, not for a wall-clock guess.
	const t1 = await waitFor(() => {
		const s = h.window.__DSH_DREAM_SKIN_STATUS__;
		const retracted = !!(s && s.anchors && s.anchors.notMounted.length === 0);
		return { done: retracted, observed: s };
	}, { label: 'T3 late mount retracts notMounted via the debounced resample' });
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
	// `[class$="_fade"]` and not a hashed group: since A1 every class-anchored probe group is
	// registered (retired or channel-divergent), so this is the only way to keep a real
	// `drifted` entry for the ladder's mid/terminal contrast to be about.
	const driftedSel = '[class$="_fade"]';
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
		querySelector: (sel) => (sel === SIDEBAR_PROBE_SEL && !mounted ? null : { matched: true }),
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
	await settleDrift(h.window);
	const t0 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(t0.anchors.pending, false, 'terminal verdict reached');
	assert.deepEqual(t0.anchors.drifted, [SIDEBAR_PROBE_SEL], 'group missing at terminal is named');
	assert.equal(warns.filter((w) => w.includes('drifted')).length, 1, 'terminal drift warns exactly once');
	assert.ok(observers.length >= 1, 'late-correction observer armed after a drifted terminal');
	// User opens settings "a minute later": the surface mounts, DOM mutates.
	mounted = true;
	for (const o of observers) o.cb([]);
	// debounce (300ms) + resample: the observable that proves the wait is over is the
	// drifted pool retracting to empty (staying conclusive while it does).
	const t1 = await waitFor(() => {
		const s = h.window.__DSH_DREAM_SKIN_STATUS__;
		const retracted = !!(s && s.anchors && s.anchors.drifted.length === 0 && s.anchors.pending === false);
		return { done: retracted, observed: s };
	}, { label: 'R-2 late mount retracts the drifted verdict via the debounced resample' });
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
		querySelector: (sel) => (((sel === SIDEBAR_PROBE_SEL || sel === '[class$="_fade"]') && !mounted) ? null : { matched: true }),
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
	await settleDrift(h.window);
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
	// HONEST CLOCK, not convergence debt: this site asserts a NEGATIVE (an unloaded fiber
	// publishes NOTHING), and a poll for "the snapshot stayed unchanged" converges on the
	// first sample and proves nothing — the settleDrift boundary ("no amount of polling can
	// prove a 'not yet'") applies here too. 400ms = the 300ms debounce + resample would have
	// run twice over IF the disposed gate had rotted; the frozen read below is the point.
	await sleep(400); // debounce (300ms) + resample would have run twice over
	const t1 = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.deepEqual(t1.anchors.drifted, driftedBefore, 'an unloaded plugin publishes NOTHING - the verdict is frozen, not improved');
});

test('drift probe (S-3): a re-applied probe supersedes the live observer instead of stacking a second one', async () => {
	// S-3 second half: every apply() builds a fresh probe closure, so without a
	// single-owner handle a second chain could arm a second body observer while
	// the first is still live (two independent samplers, ~7.5s of sampling each).
	const lateMOs = (observers, baseLen, doc) => observers.slice(baseLen).filter((o) => o.target === doc.body);
	const missing = '[class$="_fade"]';
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
	await settleDrift(h.window);
	assert.equal(lateMOs(observers, baseLen, doc).length, 1, 'first chain armed one observer');
	assert.notEqual(lateMOs(observers, baseLen, doc)[0].disconnected, true, 'and it is still live (no unload happened)');
	// Re-apply WITHOUT unmounting (the host can re-enter apply()). ensureMaterialStyle
	// keeps its <style> node, so a chain only re-arms once that node has actually
	// left the document — which is the real scenario this pins: a host hot reload /
	// head rebuild that dropped our sheet while the previous probe chain is still
	// live. Detach it the way the DOM would, then re-apply.
	h.document.head.children.slice().forEach((node) => node.remove());
	e.apply(makeApplyContext(h));
	await settleDrift(h.window);
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
			if (sel === SIDEBAR_PROBE_SEL && Date.now() - start < 60) return null;
			return { matched: true };
		},
		querySelectorAll: () => [], head: makeEl()
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn() {}, log() {}, error() {} } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	await settleDrift(h.window);
	const status = h.window.__DSH_DREAM_SKIN_STATUS__;
	assert.equal(status.anchors.pending, false, 'chain converged after the late mount');
	assert.deepEqual(status.anchors.drifted, [], 'a surface that mounted at ANY round is not drifted (hit-once memory)');
});

test('diagnostics: later re-publishes keep the drift anchors via prev-merge (status never downgrades itself)', async () => {
	// The page has to be one the probe CAN decide (the `[data-composer-input]` sentinel
	// proves liveness on its own), because "wait for the boot probe" without a terminal
	// verdict is only ever a wall-clock guess — and a guess is what made the ladder cases
	// flake under a loaded runner. With a decidable page the wait is on the verdict, not
	// on the clock, and the anchors being compared below are final rather than mid-ladder.
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
		querySelector: (sel) => (sel === '[data-composer-input]' ? { matched: true } : null),
		querySelectorAll: () => []
	};
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, seed: { 'dsh-dream-skin:skin': 'abyss' } });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h, { captureActions: true })));
	const anchors = await settleDrift(h.window);
	assert.equal(anchors.pending, false, 'the boot probe reached a terminal verdict before the re-publish');
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

// ── portrait wallpapers tile side by side under contain / blur ──────────────
// A portrait photo on a landscape window left two wide empty bands in the
// contain and blur modes. It now repeats horizontally at full height. The
// orientation comes from an Image probe, so these cases settle the probe by hand.

/** Image stub whose probes stay pending until the test loads them with a size. */
function mkShapeImage(probes) {
	return function () {
		const self = this;
		this.onload = null;
		this.onerror = null;
		this.naturalWidth = 0;
		this.naturalHeight = 0;
		let src = '';
		Object.defineProperty(this, 'src', {
			get: () => src,
			set: (v) => {
				src = v;
				probes.push({ url: v, load: (w, h) => { self.naturalWidth = w; self.naturalHeight = h; if (self.onload) self.onload(); } });
			}
		});
	};
}
const loadProbes = (probes, w, h) => { for (const p of probes.splice(0)) p.load(w, h); };

function startShaped(seed) {
	const g = mkWallpaperDoc();
	const probes = [];
	const h = buildSandbox({ document: g.doc, Image: mkShapeImage(probes), seed });
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	return { g, h, probes, adv: h.actionBags['dream-skin-wallpaper-advanced'] };
}
const TALL_SEED = {
	'dsh-dream-skin:wallpaper-kind': 'url',
	'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/tall.jpg',
	'dsh-dream-skin:wallpaper-follows-skin': '0',
	[FIT_KEY]: 'blur'
};

test('portrait tile: a portrait image repeats at full height under blur and contain, never under cover', () => {
	const { g, probes, adv } = startShaped(TALL_SEED);
	assert.equal(probes.length, 1, 'the blur render probes the image once');
	assert.equal(g.main().style.backgroundImage, `url("${probes[0].url}")`, 'the probe loads the exact URL the layer renders');
	assert.equal(g.main().style.backgroundSize, 'contain', 'until the probe answers, the old contain look stays');
	assert.equal(g.bleeds().length, 1, 'and so does the bleed');

	loadProbes(probes, 600, 1200);
	assert.equal(g.main().style.backgroundSize, 'auto 100%', 'portrait: each copy is full height');
	assert.equal(g.main().style.backgroundRepeat, 'repeat-x', 'portrait: copies sit side by side');
	assert.equal(g.bleeds().length, 0, 'the tiles fill the window, so the bleed layer goes');

	adv.setFit('cover');
	assert.equal(g.main().style.backgroundSize, 'cover', 'cover keeps its single cropped copy');
	assert.equal(g.main().style.backgroundRepeat, 'no-repeat', 'cover does not tile');

	adv.setFit('contain');
	assert.equal(probes.length, 0, 'the same image is not probed again');
	assert.equal(g.main().style.backgroundSize, 'auto 100%', 'contain tiles the portrait image too');
	assert.equal(g.main().style.backgroundRepeat, 'repeat-x');

	adv.setUrl('https://cdn.example.com/wide.jpg');
	assert.equal(g.main().style.backgroundRepeat, 'no-repeat', 'a new image starts untiled, not with the previous repeat');
	assert.equal(g.main().style.backgroundSize, 'contain');
	loadProbes(probes, 1600, 900);
	assert.equal(g.main().style.backgroundSize, 'contain', 'a landscape image keeps contain');
	assert.equal(g.main().style.backgroundRepeat, 'no-repeat', 'a landscape image does not tile');
});

test('portrait tile: a late probe answer for a replaced or unloaded wallpaper changes nothing', () => {
	const { g, h, probes, adv } = startShaped(TALL_SEED);
	const tallProbe = probes.splice(0)[0];
	adv.setUrl('https://cdn.example.com/wide.jpg');
	const wideProbes = probes.length;
	tallProbe.load(600, 1200);
	assert.equal(g.main().style.backgroundRepeat, 'no-repeat', 'the old image\'s portrait answer does not tile the new one');
	assert.equal(g.main().style.backgroundSize, 'contain');
	assert.equal(probes.length, wideProbes, 'nor does it discard the new image\'s pending probe and start another');
	probes.splice(0);

	adv.setUrl('https://cdn.example.com/tall-2.jpg');
	const pending = probes.splice(0);
	assert.ok(pending.length > 0, 'the new image is probed');
	for (const d of h.disposers || []) d();
	const live = () => g.created.filter((el) => !el.removed && g.doc.body.children.includes(el) && el.style.backgroundImage);
	assert.equal(live().length, 0, 'unloading the plugin removes the wallpaper layer');
	for (const p of pending) p.load(600, 1200);
	assert.equal(live().length, 0, 'a probe that lands after unload does not bring a wallpaper layer back');
});

test('portrait tile: a probe that settles synchronously tiles on the same render', () => {
	const g = mkWallpaperDoc();
	const Image = function () {
		this.naturalWidth = 600;
		this.naturalHeight = 1200;
		Object.defineProperty(this, 'src', { set: () => { if (this.onload) this.onload(); } });
	};
	const h = buildSandbox({ document: g.doc, Image, seed: TALL_SEED });
	h.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(h, { captureActions: true }));
	assert.equal(g.main().style.backgroundRepeat, 'repeat-x', 'the answer is used although the re-render was swallowed by the re-entry guard');
});

test('portrait tile: framing moves the tiles and never un-tiles them', () => {
	// The two features meet on the same three style properties: `fit` decides the size and
	// the repeat, framing writes the position and the transform. A framing repaint that
	// also re-decided `background-size` would silently turn a tiled portrait photo back
	// into one centred strip — the exact band #120 removed — and neither feature's own
	// cases would notice, because each of them tests on its own (non-tiled / non-framed)
	// layer. This is the case that has to fail if that merge is ever undone.
	const { g, probes, adv } = startShaped({ ...TALL_SEED, [FRAME_X_KEY]: '-40', [FRAME_ZOOM_KEY]: '150' });
	assert.equal(g.main().style.backgroundSize, 'contain', 'still contain until the probe answers');
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 40vw) 50%', 'a stored crop applies before the orientation is known');

	loadProbes(probes, 600, 1200);
	assert.equal(g.main().style.backgroundSize, 'auto 100%', 'the probe answer turns the layer into tiles');
	assert.equal(g.main().style.backgroundRepeat, 'repeat-x');
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 40vw) 50%', 'the crop survives the re-render the probe triggers');
	assert.equal(g.main().style.transform, 'scale(1.5)', 'and so does the zoom');
	assert.equal(g.bleeds().length, 0, 'tile mode still drops the bleed layer');

	adv.setFrameY(25);
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 40vw) calc(50% + 25vh)', 'a slider move repaints through the framing path');
	assert.equal(g.main().style.backgroundSize, 'auto 100%', 'the framing path must not re-decide the size — that is `fit` + tile');
	assert.equal(g.main().style.backgroundRepeat, 'repeat-x', 'nor the repeat');
	assert.equal(g.main().style.transform, 'scale(1.5)', 'nor lose the zoom while writing the offset');
	assert.equal(g.bleeds().length, 0, 'nor conjure the bleed layer that tile mode removed');

	adv.setFrameZoom(100);
	assert.equal(g.main().style.transform, '', 'identity zoom clears the transform');
	assert.equal(g.main().style.backgroundSize, 'auto 100%', 'un-zooming leaves the tiles standing');
});

test('portrait tile: a gradient wallpaper is never probed', () => {
	const { probes } = startShaped({
		'dsh-dream-skin:wallpaper-kind': 'gradient',
		'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(168deg, #faeeef 0%, #f5e8e9 100%)',
		'dsh-dream-skin:wallpaper-follows-skin': '0',
		[FIT_KEY]: 'blur'
	});
	assert.equal(probes.length, 0, 'a gradient has no orientation to probe');
});

test('issue #110: low-power mode drops backdrop-filter, the wallpaper blur and the bleed layer', () => {
	// The bundle ships no CSS animations, so the measured GPU cost is compositing
	// large blurred surfaces (#110: >50% idle on an M4 with two windows open).
	// This switch is the opt-in escape hatch; the default look must not move.
	const SEED = {
		'dsh-dream-skin:wallpaper': 'data:image/png;base64,AAAA',
		'dsh-dream-skin:wallpaper-blur': '7',
		'dsh-dream-skin:wallpaper-fit': 'blur'
	};
	const painted = (h) => h.document.body.children.filter(
		(el) => typeof el.style.backgroundImage === 'string' && el.style.backgroundImage !== ''
	);
	const start = (extra) => {
		const h = buildSandbox({ seed: { ...SEED, ...extra } });
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply(makeApplyContext(h, { captureActions: true }));
		return h;
	};

	// Control: the shipped default is OFF, with both blurred layers present.
	const off = start({});
	assert.equal(off.document.documentElement.getAttribute('data-dsh-dream-skin-performance'), null,
		'off by default: no root attribute');
	const controlLayers = painted(off);
	assert.equal(controlLayers.length, 2, 'default blur fit keeps the bleed layer + the image');
	const controlBleed = controlLayers.find((el) => String(el.style.cssText).includes('scale(1.2)'));
	assert.ok(controlBleed, 'the bleed layer is the overscaled one');
	assert.equal(controlBleed.style.filter, 'blur(55px)', 'control: bleed keeps blur + 48');
	assert.equal(controlLayers.find((el) => el !== controlBleed).style.filter, 'blur(7px)',
		'control: the image keeps the user blur');

	// Stored ON at boot.
	const on = start({ 'dsh-dream-skin:performance': '1' });
	assert.equal(on.document.documentElement.getAttribute('data-dsh-dream-skin-performance'), '1',
		'the stored switch publishes the root attribute before the first wallpaper render');
	const lowLayers = painted(on);
	assert.equal(lowLayers.length, 1, 'low-power drops the bleed layer (its whole purpose is a blurred halo)');
	assert.equal(lowLayers[0].style.filter, 'none', 'the wallpaper image is not blurred');

	// The CSS half: the shipped material sheet must carry the selector that
	// clears backdrop-filter for everything under the attribute.
	const sheet = on.document.head.children.find((el) => el && el.id === 'dsh-dream-skin:material:liquid-glass');
	assert.ok(sheet, 'the material sheet is installed');
	const css = String(sheet.textContent || '');
	assert.ok(css.includes('html[data-dsh-dream-skin-performance] *'),
		'the override selector is in the material sheet');
	assert.ok(css.includes('backdrop-filter: none !important'),
		'and it actually clears backdrop-filter');

	// Toggling through the settings action flips both halves without a restart.
	const glass = off.actionBags['dream-skin-glass'];
	glass.setPerformance(true);
	assert.equal(off.document.documentElement.getAttribute('data-dsh-dream-skin-performance'), '1');
	assert.equal(off.localStorage.getItem('dsh-dream-skin:performance'), '1');
	assert.equal(painted(off).length, 1, 'the bleed layer is detached on the toggle');
	assert.equal(painted(off)[0].style.filter, 'none', 'and the image is flat immediately');
	glass.setPerformance(false);
	assert.equal(off.document.documentElement.getAttribute('data-dsh-dream-skin-performance'), null);
	assert.equal(off.localStorage.getItem('dsh-dream-skin:performance'), '0');
	const restored = painted(off);
	assert.equal(restored.length, 2, 'turning it off restores the bleed layer');
	assert.equal(restored.find((el) => el.style.filter === 'blur(7px)') !== undefined, true,
		'and the user blur comes back');
});

test('issue #110 follow-up: automatic low-power follows the OS, and a pinned choice outranks it', () => {
	// #110's own A/B on the M4 measured 23% idle GPU with the frost on and 11% with it
	// off, so the flat render is the cheaper one — and the people who already told the
	// OS "less transparency" are the same people. Hence three states: an ABSENT key is
	// automatic (resolve from the OS), "1"/"0" are pinned by the user and win.
	// Honest boundary of this harness: it asserts the ATTRIBUTE, the rendered layers and
	// the STORE FIELDS the row reads — the React component itself is never rendered here
	// (slots.register ignores the component), so "the row shows 交还给自动" is not proven
	// by this file; that it is not mouse-only is proven by the `button` tag, not by a gate.
	const ATTR = 'data-dsh-dream-skin-performance';
	const SEED = {
		'dsh-dream-skin:wallpaper': 'data:image/png;base64,AAAA',
		'dsh-dream-skin:wallpaper-blur': '7',
		'dsh-dream-skin:wallpaper-fit': 'blur'
	};
	const mqlOf = (matches) => {
		const listeners = [];
		return {
			media: '(prefers-reduced-transparency: reduce)', matches, listeners,
			addEventListener(type, fn) { if (type === 'change') listeners.push(fn); },
			removeEventListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
			set(next) { this.matches = next; for (const fn of listeners.slice()) fn(this); }
		};
	};
	const painted = (h) => h.document.body.children.filter(
		(el) => typeof el.style.backgroundImage === 'string' && el.style.backgroundImage !== ''
	);
	const start = (osReduce, seed = {}) => {
		const mql = mqlOf(osReduce);
		const h = buildSandbox({ seed: { ...SEED, ...seed }, matchMedia: () => mql });
		const e = h.factory(makeRequire(makeRuntime().RT));
		e.apply(makeApplyContext(h, { captureActions: true }));
		return { h, mql, glass: h.actionBags['dream-skin-glass'], row: h.storeStates['dream-skin-glass'] };
	};

	// 1. Automatic + OS says reduce → low-power from the first frame, no user action.
	const auto = start(true);
	assert.equal(auto.h.document.documentElement.getAttribute(ATTR), '1',
		'a machine whose OS asked for less transparency gets the flat render without finding the switch');
	assert.equal(painted(auto.h).length, 1, 'the bleed layer is not created');
	assert.equal(painted(auto.h)[0].style.filter, 'none', 'the wallpaper is not blurred');
	assert.equal(auto.row.performance, true, 'the row reads the RESOLVED state');
	assert.equal(auto.row.performanceAuto, true, 'and knows the user never pinned anything');

	// 2. Automatic + OS has no preference → the shipped look, bit for bit (control).
	const plain = start(false);
	assert.equal(plain.h.document.documentElement.getAttribute(ATTR), null,
		'no OS preference means automatic resolves to the glass look');
	assert.equal(painted(plain.h).length, 2, 'control: bleed + image');
	assert.equal(plain.row.performance, false, 'the row is unchecked');
	assert.equal(plain.row.performanceAuto, true, 'but still automatic');

	// 3. Pinned OFF on a machine that reports reduce → the user wins, both halves.
	const off = start(true, { 'dsh-dream-skin:performance': '0' });
	assert.equal(off.h.document.documentElement.getAttribute(ATTR), null,
		'an explicit 0 outranks the OS — the whole point of pinning');
	assert.equal(painted(off.h).length, 2, 'and the wallpaper half agrees with the CSS half');
	assert.equal(off.row.performance, false);
	assert.equal(off.row.performanceAuto, false, 'the row must now offer to hand the choice back');

	// 4. Pinned ON with no OS preference → also wins.
	const on = start(false, { 'dsh-dream-skin:performance': '1' });
	assert.equal(on.h.document.documentElement.getAttribute(ATTR), '1');
	assert.equal(on.row.performance, true);

	// 5. The OS changes while the choice is automatic → re-render live, not on reload.
	const live = start(false);
	assert.equal(live.h.document.documentElement.getAttribute(ATTR), null, 'before');
	live.mql.set(true);
	assert.equal(live.h.document.documentElement.getAttribute(ATTR), '1',
		'an OS flip while automatic repaints the CSS switch');
	assert.equal(painted(live.h).length, 1, '…the wallpaper (the blur and the bleed layer)…');
	assert.equal(live.row.performance, true, '…and the row, so the checkbox does not lie');
	assert.equal(live.h.localStorage.getItem('dsh-dream-skin:performance'), null,
		'following the OS writes nothing: the key stays absent so the state remains automatic');

	// 6. …but once the user pins it, an OS flip must not revoke that decision.
	live.glass.setPerformance(false);
	assert.equal(live.h.localStorage.getItem('dsh-dream-skin:performance'), '0', 'pinned off');
	const pinnedRevision = live.row.revision;
	live.mql.set(false);
	live.mql.set(true);
	assert.equal(live.h.document.documentElement.getAttribute(ATTR), null,
		'a pinned choice survives the OS changing under it (#110 must not become a surprise)');
	assert.equal(live.row.revision, pinnedRevision,
		'and the page is not even re-rendered: readPerformanceMode is the single source, so a '
		+ 'pinned decision means an OS flip costs this window nothing — no repaint, no flash');

	// 7. Handing it back is reachable, and "back to automatic" is absence, not a new value.
	live.glass.setPerformanceAuto();
	assert.equal(live.h.localStorage.getItem('dsh-dream-skin:performance'), null,
		'the reset drops the key rather than inventing a third sentinel value');
	assert.equal(live.h.document.documentElement.getAttribute(ATTR), '1',
		'so the live OS preference resolves immediately, without a reload');
	assert.equal(live.row.performanceAuto, true, 'and the row goes back to showing the automatic hint');

	// 8. A DOM without the media feature at all keeps the shipped look (the guard, not a throw).
	const noFeature = buildSandbox({ seed: { ...SEED } });
	const eNo = noFeature.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => eNo.apply(makeApplyContext(noFeature, { captureActions: true })),
		'an engine with no matchMedia must not break the mount');
	assert.equal(noFeature.document.documentElement.getAttribute(ATTR), null,
		'and automatic resolves to the shipped look there');
});

test('issue #110 follow-up: the reduce-transparency listener belongs to the fiber that armed it', () => {
	// The listener re-renders the wallpaper and the token layer, so a retired
	// generation holding one is not harmless: it can repaint the live page through
	// stale closures. It is therefore armed inside apply() and disposed by that
	// fiber's own effect — the same identity discipline as the nav hook and the
	// wash-flip hook. Two generations in ONE context, opposite expectations.
	const ATTR = 'data-dsh-dream-skin-performance';
	const mql = mqlOfRecording();
	const h = buildSandbox({
		seed: { 'dsh-dream-skin:wallpaper': 'data:image/png;base64,AAAA' },
		matchMedia: () => mql
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctxA = makeApplyContext(h);
	e.apply(ctxA);
	const afterFirst = (h.disposers || []).length;
	const ctxB = makeApplyContext(h);
	e.apply(ctxB);
	assert.equal(mql.listeners.length, 2, 'two live fibers armed two listeners');

	// The STALE fiber unloads: the live one must keep working.
	for (const d of (h.disposers || []).slice(0, afterFirst)) d();
	assert.equal(mql.listeners.length, 1, 'a stale dispose removes only its own listener');
	mql.set(true);
	assert.equal(h.document.documentElement.getAttribute(ATTR), '1',
		'the surviving listener still follows the OS — the retired fiber did not disarm it');

	for (const d of (h.disposers || []).slice(afterFirst)) d();
	assert.equal(mql.listeners.length, 0, 'and the live unload leaves no listener behind');
});

function mqlOfRecording() {
	const listeners = [];
	return {
		media: '(prefers-reduced-transparency: reduce)', matches: false, listeners,
		addEventListener(type, fn) { if (type === 'change') listeners.push(fn); },
		removeEventListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
		set(next) { this.matches = next; for (const fn of listeners.slice()) fn(this); }
	};
}

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

test('dockkit right panel: the docked surfaces follow the sidebar slider and a fullscreen panel is opaque', () => {
	// Reported with dsh-better-sidebar installed: (1) 侧边栏透明度 no longer reached
	// the right panel, which stayed see-through at every value; (2) entering the
	// panel's fullscreen mode showed the conversation THROUGH it. Root cause: the
	// host paints the docked tab host and the empty host with `--dsw-alias-bg-base`
	// (the canvas wash) instead of `--dsw-specific-sidebar-fill`, and the canvas
	// wash is translucent, so a fullscreen panel became a window onto the chat.
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
	e.apply(makeApplyContext(h));
	const sheet = created.find((el) => el.id === 'dsh-dream-skin:material:liquid-glass');
	assert.ok(sheet, 'the material sheet is injected');
	const css = sheet.textContent;

	// Read a rule back through a selector that identifies it, and keep the WHOLE
	// rule: a guard that starts matching AT `[data-dockkit-host=dock]` can never see
	// a prefix added in front of it, so it proves nothing about a wash gate.
	const ruleBy = (token) => {
		const m = css.match(new RegExp('([^{}]*' + token + '[^{}]*)\\{([^}]*)\\}'));
		if (!m) return null;
		const selectorList = m[1].split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
		return {
			selectorList,
			selectors: selectorList.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
			body: m[2]
		};
	};

	const dock = ruleBy('\\[data-dockkit-host=dock\\]\\s*>\\s*section');
	assert.ok(dock, 'both dockkit surfaces (the docked tab host and the empty host) are targeted');
	assert.equal(dock.selectors.length, 2, 'the docked surfaces are one rule with two branches');
	const stamps = [];
	for (const sel of dock.selectors) {
		assert.ok(sel.startsWith('[data-sidebar-right-panel] '),
			`every docked surface is scoped to the right panel, not to every dockkit host: ${sel}`);
		const stamp = sel.match(/\[data-dockkit-(host=dock|empty)\]/);
		assert.ok(stamp, `and it carries a dockkit host stamp: ${sel}`);
		stamps.push(stamp[1]);
	}
	assert.deepEqual(stamps.sort(), ['empty', 'host=dock'],
		'both surfaces are covered: the docked tab host and the empty host');
	assert.ok(/background-color:\s*var\(--dsw-specific-sidebar-fill\)\s*!important/.test(dock.body),
		'the right panel paints the SIDEBAR fill, so its slider reaches it like the left column');
	// Reverse guard over the captured selector list, prefix included. The panel is a
	// sidebar surface whether or not a wash is on screen: the reporter's "stays
	// see-through at every value" read is exactly the wallpaper-less one.
	assert.ok(!/data-dsh-dream-skin-wash/.test(dock.selectorList), 'the docked-panel rule is not gated on the wallpaper');

	// Both dockkit surfaces behind a fullscreen panel are listed in one selector
	// list, so the gate is asserted per branch: dropping it from a single branch
	// is a real regression even though the other branch still carries it.
	const full = ruleBy('\\[data-sidebar-right-panel=fullscreen\\]');
	assert.ok(full, 'the fullscreen right panel is targeted');
	assert.ok(full.selectors.length >= 2, 'both dockkit surfaces of a fullscreen panel are covered');
	for (const sel of full.selectors) {
		assert.ok(sel.startsWith('html[data-dsh-dream-skin-wash]'),
			`every fullscreen surface is gated on a live wash, so a stock profile keeps the host look: ${sel}`);
	}
	assert.ok(/background-color:\s*var\(--dsh-dream-skin-composer-base,\s*var\(--dsw-alias-bg-layer-1\)\)\s*!important/.test(full.body),
		"the fullscreen panel paints the skin's OPAQUE base colour (no conversation showing through)");
});

test('dockkit right panel: a guide capsule hover tints its fill instead of erasing it', () => {
	// Same round, third symptom: hovering 【新建终端】 lit it up while 【文件】 went
	// see-through. ui-sidebar-right's guide entry is `background: var(--dsw-alias-bg-layer-1)`
	// and its :hover REPLACES that fill with the translucent
	// `--dsw-alias-interactive-bg-hover`, so over a wallpaper the capsule lost its
	// fill; the terminal capsule beside it OVERLAYS the same tint on its own fill.
	// One token, two behaviours — keep the fill and layer the tint, like the
	// terminal one does.
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
	e.apply(makeApplyContext(h));
	const sheet = created.find((el) => el.id === 'dsh-dream-skin:material:liquid-glass');
	assert.ok(sheet, 'the material sheet is injected');
	const css = sheet.textContent;

	const m = css.match(/([^{}]*\[data-sidebar-right-guide-entry\][^{}]*)\{([^}]*)\}/);
	assert.ok(m, "the right-sidebar guide capsule hover is targeted through the host's own stamp");
	const selectorList = m[1].split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
	const body = m[2];

	// The terminal capsule carries the same stamp while already overlaying the tint
	// through a ghost button, so a rule that matches it stacks a second layer.
	assert.ok(/\[data-sidebar-right-guide-entry\]:not\(\[data-sidebar-right-guide-entry=terminal\]\):hover/.test(selectorList),
		'the hover rule excludes the capsule kind that overlays its own tint');
	assert.ok(!/\[data-sidebar-right-guide-entry\]:hover/.test(selectorList),
		'no branch matches the terminal capsule (a bare stamp + :hover would)');
	assert.ok(/background-color:\s*var\(--dsw-alias-bg-layer-1\)\s*!important/.test(body),
		'the capsule keeps its own opaque fill while hovered');
	assert.ok(/background-image:\s*linear-gradient\(var\(--dsw-alias-interactive-bg-hover\),\s*var\(--dsw-alias-interactive-bg-hover\)\)\s*!important/.test(body),
		'the host hover tint is layered ON TOP instead of replacing the fill');
	// Reverse guard: the erasing form is the bug — it must not come back.
	assert.ok(!/background(-color)?:\s*var\(--dsw-alias-interactive-bg-hover\)/.test(body),
		'the hover no longer replaces the fill with the translucent tint');
});

test('dockkit right panel: the fullscreen gate rides the wash marker lifecycle', () => {
	// The opaque fullscreen rule only fires while the wash marker is published, and a
	// sandbox stubs the sheet's own `querySelector` to null, so the marker on the root
	// element is the only readable signal for that gate (test-admission gate 1: at
	// least two time points).
	const created = [];
	const attrs = new Map();
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: {
			style: { setProperty() {} },
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
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'midnight', active, themes: [active], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply({ ...makeApplyContext(h, { captureActions: true }), theme }), 'apply');
	const sheet = created.find((el) => el.id === 'dsh-dream-skin:material:liquid-glass');
	assert.ok(sheet, 'the material sheet is injected');

	// The attribute the rule names must be the one the plugin publishes, so the gate
	// cannot go stale behind a renamed marker.
	const gate = sheet.textContent.match(/html\[([a-z-]+)\]\s*\[data-sidebar-right-panel=fullscreen\]/);
	assert.ok(gate, 'the fullscreen rule is gated on a root attribute');
	assert.equal(attrs.get(gate[1]), '1', `the gate attribute (${gate[1]}) is published while the wash is live`);

	// Time point 2 — clearing the wallpaper retracts the marker, so the opaque rule
	// stops applying instead of sticking on a wallpaper-less profile.
	h.actionBags['dream-skin-wallpaper'].clearWallpaper();
	assert.equal(attrs.has(gate[1]), false, 'and it is retracted with the wash layer');
});

// ── wallpaper framing — viewport offsets + zoom ──────────────────────────────
// The "fit" control (#61) decides how the photo meets its box; framing decides
// WHERE inside that box it sits and how large it is. Percentage positioning
// alone is trapped by (container − image) — 0 % pins one edge, 100 % the other,
// so a percentage can never leave the frame. Offsets are therefore expressed in
// vw/vh, and zoom is a scale on the same layer.
const FRAME_X_KEY = 'dsh-dream-skin:wallpaper-pos-x';
const FRAME_Y_KEY = 'dsh-dream-skin:wallpaper-pos-y';
const FRAME_ZOOM_KEY = 'dsh-dream-skin:wallpaper-zoom';

/** Boot the bundle with a URL wallpaper plus any framing seed, and hand back the row actions. */
function bootFraming(seed = {}, doc = mkWallpaperDoc()) {
	const h = buildSandbox({
		document: doc.doc,
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/wide.jpg',
			'dsh-dream-skin:wallpaper-follows-skin': '0',
			...seed
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h, { captureActions: true }));
	return { h, g: doc, adv: h.actionBags['dream-skin-wallpaper-advanced'] };
}

test('wallpaper framing: an untouched wallpaper renders 50/50 at 100 %, and stores nothing', () => {
	const { h, g } = bootFraming();
	assert.equal(g.main().style.backgroundPosition, '50% 50%', 'centred by default — byte-identical to the pre-framing render');
	assert.equal(g.main().style.transform, '', 'no scale at 100 %');
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), null, 'reading must not invent a stored value');
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), null, 'reading must not invent a stored value');
});

test('wallpaper framing: offsets are viewport units, so the image can leave the frame', () => {
	const { h, g, adv } = bootFraming();
	adv.setFrameX(-100);
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '-100', 'a left offset persists as a signed integer');
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 100vw) 50%', 'negative offsets subtract — never "calc(50% + -100vw)"');
	adv.setFrameY(60);
	assert.equal(h.localStorage.getItem(FRAME_Y_KEY), '60');
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 100vw) calc(50% + 60vh)');
	adv.resetFrame();
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '0', 'reset writes the centred default back');
	assert.equal(h.localStorage.getItem(FRAME_Y_KEY), '0');
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), '100');
	assert.equal(g.main().style.backgroundPosition, '50% 50%', 'and the render returns to the untouched form');
});

test('wallpaper framing: zoom scales the layer and is clamped to 50–300 %', () => {
	const { h, g, adv } = bootFraming();
	adv.setFrameZoom(50);
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), '50', 'the lower bound is 50 %, not 100 %');
	assert.equal(g.main().style.transform, 'scale(0.5)');
	adv.setFrameZoom(1000);
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), '300', 'out-of-range writes clamp BEFORE persisting');
	assert.equal(g.main().style.transform, 'scale(3)');
	adv.setFrameZoom(100);
	assert.equal(g.main().style.transform, '', '100 % is identity — no transform may be left behind');
});

test('wallpaper framing: a gradient ignores framing (it fills its box by definition)', () => {
	const { g } = bootFraming({
		'dsh-dream-skin:wallpaper-kind': 'gradient',
		'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #000 0%, #fff 100%)',
		[FRAME_X_KEY]: '-50',
		[FRAME_Y_KEY]: '25',
		[FRAME_ZOOM_KEY]: '200'
	});
	assert.equal(g.main().style.backgroundPosition, '50% 50%', 'a stored offset is ignored, not applied');
	assert.equal(g.main().style.transform, '', 'and no scale either');
});

test('wallpaper framing: the blur backdrop keeps the crop and never shrinks under the zoom', () => {
	// The halo must frame the same crop as the image, but `1.2 * zoom` alone drops under a
	// viewport-sized box below ~83% zoom (1.2 * 0.9 = 1.08 still covers, 1.2 * 0.5 = 0.6
	// does not) — and a halo sitting inside the viewport IS the hard-edged band #61 removes.
	// So the multiplier is clamped at its creation value while the crop keeps following.
	// Seed the blur fill mode directly: calling setFit('blur') would count as a fit CHANGE and
	// reset the framing, wiping the seeded zoom (that reset is the documented behaviour).
	const { g, adv } = bootFraming({
		'dsh-dream-skin:wallpaper-fit': 'blur',
		[FRAME_ZOOM_KEY]: '50'
	});
	const [bleed] = g.bleeds();
	assert.ok(bleed, 'the blur fill mode creates its bleed layer');
	const bleedScale = () => Number(/scale\(([\d.]+)\)/.exec(bleed.style.transform)[1]);
	assert.equal(bleedScale(), 1.2,
		'the FULL RENDER clamps below 83% — a 0.6 box would sit inside the viewport');
	adv.setFrameX(-30);
	adv.setFrameY(40);
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 30vw) calc(50% + 40vh)',
		'the sharp layer did move — otherwise the assertions below are vacuous');
	assert.equal(bleed.style.backgroundPosition, g.main().style.backgroundPosition,
		'the halo must not drift away from the image it sits behind');
	assert.equal(bleedScale(), 1.2, 'the DRAG path clamps too — both sites must agree');
	adv.setFrameZoom(150);
	assert.ok(Math.abs(bleedScale() - 1.8) < 1e-6, 'above 100% the halo tracks the zoom');
});

test('wallpaper framing: low-power mode never resurrects the blur backdrop', () => {
	// Issue #110 skips the bleed layer while low-power is on, and framing is a separate
	// style-only path. The two must not fight: the full render must not create the
	// backdrop, and a slider drag must not quietly create it afterwards. The control leg
	// is what makes the difference attributable to the SWITCH rather than to the seed.
	const control = bootFraming();
	control.adv.setFit('blur');
	control.adv.setFrameX(-40);
	control.adv.setFrameY(25);
	control.adv.setFrameZoom(150);
	assert.equal(control.g.bleeds().length, 1,
		'control: with low-power off the same sequence (fit + three drags) keeps the backdrop');

	const { g, adv } = bootFraming({ 'dsh-dream-skin:performance': '1' });
	adv.setFit('blur');
	assert.equal(g.bleeds().length, 0, 'low-power must not create the bleed layer for fit=blur');
	// Assert after EVERY step: a create-then-remove inside one drag would slip past a single
	// check taken once at the end.
	adv.setFrameX(-40);
	assert.equal(g.bleeds().length, 0, 'dragging X must not create the bleed layer');
	adv.setFrameY(25);
	assert.equal(g.bleeds().length, 0, 'dragging Y must not create the bleed layer');
	adv.setFrameZoom(150);
	assert.equal(g.bleeds().length, 0, 'dragging the zoom must not create the bleed layer');
	assert.equal(g.main().style.filter, 'none', 'low-power keeps the wallpaper unblurred while framing moves it');
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 40vw) calc(50% + 25vh)',
		'framing still moves the sharp layer — a no-op would make the two bleed assertions vacuous');
	assert.equal(g.main().style.transform, 'scale(1.5)', 'and the zoom still applies to the sharp layer');
});

test('wallpaper framing: a framing move only repaints the layer', () => {
	// The maintainer asked for "no horizontal scrollbar at offset = ±100". A scrollbar is
	// the SYMPTOM of a positioned box, so this pins the cause instead of one crop of it:
	// the layer stays `position:fixed` (out of flow, inset:0) and the only properties a
	// framing move may touch are the two paint-only ones. `scrollWidth` is deliberately NOT
	// asserted — the fake DOM has no layout, so that assertion would be vacuously true, and
	// a gate that cannot fail is worse than no gate.
	const { g, adv } = bootFraming();
	const layer = g.main();
	assert.ok(String(layer.style.cssText).includes('position:fixed'), 'the layer starts out of flow');
	assert.ok(String(layer.style.cssText).includes('inset:0'), 'and pinned to the viewport box');
	const before = { ...layer.style };
	adv.setFrameX(100);
	adv.setFrameY(-100);
	adv.setFrameZoom(300);
	const after = { ...layer.style };
	const changed = Object.keys(after).filter((k) => after[k] !== before[k]).sort();
	assert.deepEqual(changed, ['backgroundPosition', 'transform'],
		`a framing move must only repaint — changed: ${changed.join(', ') || '(nothing)'}`);
	assert.equal(after.backgroundPosition, 'calc(50% + 100vw) calc(50% - 100vh)', 'the ±100 corners really are applied');
	assert.equal(after.transform, 'scale(3)', 'and so is the 300 % zoom — otherwise the check is vacuous');
});

test('wallpaper framing: junk values are clamped for rendering and never written back', () => {
	const { h, g } = bootFraming({
		[FRAME_X_KEY]: '500',
		[FRAME_Y_KEY]: 'abc',
		[FRAME_ZOOM_KEY]: '999'
	});
	assert.equal(g.main().style.backgroundPosition, 'calc(50% + 100vw) 50%', '500 clamps to 100; "abc" falls back to the centred default');
	assert.equal(g.main().style.transform, 'scale(3)', '999 clamps to 300');
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '500', 'a tampered value is NOT rewritten (same discipline as fit)');
	assert.equal(h.localStorage.getItem(FRAME_Y_KEY), 'abc');
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), '999');
	// An empty stored value is "not set", not "zero": `Number('') === 0` would clamp the
	// zoom to its 50 % floor instead of the shipped 100 %, and the min is where a wrong
	// reading does the most visible damage. A hand-edited state file or a host round-trip
	// can deliver "", and the design says bad values fall back to the default.
	const blank = bootFraming({ [FRAME_ZOOM_KEY]: '', [FRAME_Y_KEY]: '   ' });
	assert.equal(blank.g.main().style.transform, '', 'an empty zoom renders as the 100 % default, not 50 %');
	assert.equal(blank.g.main().style.backgroundPosition, '50% 50%', 'a blank offset is centred');
	assert.equal(blank.h.localStorage.getItem(FRAME_ZOOM_KEY), '', 'and it is still not written back');
});

test('wallpaper framing: a new picture or a fill-mode change starts from centre', () => {
	const { h, adv } = bootFraming();
	const wallpaper = h.actionBags['dream-skin-wallpaper'];
	assert.ok(wallpaper, 'the wallpaper row exposes its actions');
	adv.setFrameX(40);
	adv.setFrameY(-20);
	adv.setFrameZoom(150);
	wallpaper.setWallpaper('data:image/jpeg;base64,AAAA');
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '0', 'a different picture must not inherit the old offsets');
	assert.equal(h.localStorage.getItem(FRAME_Y_KEY), '0');
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), '100');
	assert.equal(h.storeStates['dream-skin-wallpaper-advanced'].hasImage, true,
		'the row state learns a picture exists — the framing group re-renders on THIS slice, not on a storage read');
	adv.setFrameX(-30);
	adv.setFit('contain');
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '0', '完整显示 shows the whole photo only when the offsets are cleared');
	adv.setFrameX(-30);
	adv.setFit('contain');
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '-30', 're-clicking the same mode is not a change and must not wipe the framing');
	wallpaper.clearWallpaper();
	assert.equal(h.storeStates['dream-skin-wallpaper-advanced'].hasImage, false, 'clearing hides the framing group again');
});

test('wallpaper framing: a slider move updates styles without republishing the token layer', () => {
	// Framing changes no token, so it must not take the applyWallpaper2 route: that
	// path republishes the whole override layer, and the host emits theme/change on
	// every publish — once per pixel of a slider drag. The write-budget counter is
	// the witness; the same harness keeps the seeded wallpaper painted, so a fallback
	// to the full render cannot hide behind a missing layer.
	const p = makeWriteBudgetHarness({
		seed: {
			'dsh-dream-skin:wallpaper-kind': 'url',
			'dsh-dream-skin:wallpaper-url': 'https://cdn.example.com/wide.jpg',
			'dsh-dream-skin:wallpaper-follows-skin': '0'
		}
	});
	const layer = p.h.document.body.children.find(
		(el) => typeof el.style.backgroundImage === 'string' && el.style.backgroundImage !== ''
	);
	assert.ok(layer, 'the seeded wallpaper painted a live layer before the slider moved');
	const publishedBefore = p.counts.publish;
	p.h.actionBags['dream-skin-wallpaper-advanced'].setFrameX(-25);
	assert.equal(layer.style.backgroundPosition, 'calc(50% - 25vw) 50%',
		'the style-only path still moves the LIVE layer — a no-op would make the publish assertion vacuous');
	assert.equal(p.counts.publish, publishedBefore,
		`a framing slider republished the token layer (${p.counts.publish - publishedBefore} publish(es)) — framing changes no token`);
});

test('wallpaper framing: a different URL recentres, re-applying the same URL does not', () => {
	const { h, g, adv } = bootFraming();
	adv.setFrameX(-40);
	adv.setFrameY(25);
	adv.setFrameZoom(180);
	adv.setUrl('https://cdn.example.com/other.jpg');
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '0', 'a different link is a different composition — X recentres');
	assert.equal(h.localStorage.getItem(FRAME_Y_KEY), '0', 'Y recentres too');
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), '100', 'and the zoom returns to identity');
	assert.equal(g.main().style.backgroundPosition, '50% 50%', 'the live layer shows the recentred crop');

	adv.setFrameX(-40);
	adv.setFrameZoom(180);
	adv.setUrl('https://cdn.example.com/other.jpg');
	assert.equal(h.localStorage.getItem(FRAME_X_KEY), '-40',
		're-applying the SAME link is not a new composition and must not wipe the framing');
	assert.equal(h.localStorage.getItem(FRAME_ZOOM_KEY), '180');
	assert.equal(g.main().style.backgroundPosition, 'calc(50% - 40vw) 50%', 'and the user crop stays on screen');
});

// ═══════════════════════════════════════════════════════════════════════════
// Issue #84 — write-volume accounting for a skin switch
// ═══════════════════════════════════════════════════════════════════════════
//
// Three numbers for the same quantity were quoted in review and none of them
// agreed: "3 publishes / 111 token writes", "publish 2 → 3", "5 → 19". They are
// not contradictory. They are three DIFFERENT counters, and nobody had declared
// which one they were reading — so declare them, count each separately, and put
// a budget on each:
//
//   publish      how many times the plugin asks the host for a token layer
//                (`theme.overrideTokens`). NOT the number of tokens in a layer.
//   setProperty  how many CSS custom properties it writes on documentElement.
//                NOT how many tokens the design system defines.
//   setItem      how many localStorage writes. `skin`, the seven authored
//                defaults and the provenance snapshot are separate keys and
//                separate writes; nothing here is derived.
//
// Measured 2026-10-06, one switch (the `dream-skin` row → midnight), from the
// setSkin call to the end of the SYNCHRONOUS work:
//
//              publish   setProperty   setItem
//   after fix    2          6           13
//   before fix   2          6           17–19  ← saveFactorySnapshot() serialises
//                                               the whole provenance map, and ran
//                                               once per seeded key: one storage
//                                               key rewritten seven times
//
// The publish count ALSO differs between a synchronous sample and a settled one
// (2 vs 3 — a wallpaper re-shade lands on a timer). That is why two honest
// measurements of "publishes" can disagree: they sampled different windows.
// This gate pins the synchronous window (deterministic, no timers) and then
// separately requires the settled window to STOP moving — an unguarded
// overrideTokens() emitting theme/change caused a real-machine loop once
// (CHANGELOG [0.2.1]), and a budget that samples once cannot see it.
//
// Budgets are tight enough to redden on the amplification above (17–19 > 15)
// and loose enough to survive one more authored default (13 = 7 authored keys +
// skin id + 5 wallpaper/one-off keys, one write each).
//
// The two mutations at the end of this block re-measure that table rather than
// asserting it: un-batching the retune — either by dropping the deferral inside
// saveFactorySnapshot(), or by dropping the scope that makes the deferral mean
// something — puts the switch back at exactly {publish 2, setProperty 6,
// setItem 19, worst key 7}. The review's "5 → 19" is that number.
const WRITE_BUDGET = {
	// Synchronous window.
	sync: { publish: 4, setProperty: 8, setItem: 15, maxKeyWrites: 2 },
	// …plus everything the switch schedules (the wallpaper re-shade, the deferred
	// host-probe wallpaper seed). Measured: 3 publishes, 6 setProperty, 13
	// (existing user) / 17 (first launch) storage writes. This is a runaway
	// detector, not the amplification detector — the sync budget is that.
	settled: { publish: 5, setProperty: 8, setItem: 22 }
};

/** A sandbox that counts the three declared quantities, and nothing else. */
function makeWriteBudgetHarness({ factoryApplied = true, seed = {}, code } = {}) {
	const counts = { publish: 0, publishSlots: 0, setProperty: 0, setItem: 0, removeItem: 0 };
	const keysWritten = new Map();
	const doc = {
		body: makeEl(),
		head: makeEl(),
		documentElement: {
			style: { setProperty() { counts.setProperty += 1; } },
			setAttribute() {}, removeAttribute() {}
		},
		createElement: () => makeEl(),
		createTextNode: () => ({}),
		querySelector: () => null,
		querySelectorAll: () => []
	};
	const store = new Map(Object.entries(seed).map(([k, v]) => [k, String(v)]));
	if (factoryApplied) store.set('dsh-dream-skin:factory-applied', '1');
	const localStorage = {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem(k, v) {
			counts.setItem += 1;
			keysWritten.set(k, (keysWritten.get(k) || 0) + 1);
			store.set(k, String(v));
		},
		removeItem(k) { counts.removeItem += 1; store.delete(k); }
	};
	const h = buildSandbox({ document: doc, localStorage, code });
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() {
			return { preference: 'dark', active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 };
		},
		overrideTokens(_source, tokens) {
			counts.publish += 1;
			counts.publishSlots += Object.keys(tokens || {}).length;
			return () => {};
		}
	};
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply({ ...makeApplyContext(h, { captureActions: true }), theme });
	// Read the store the plugin actually writes. NOT `h.localStorage`:
	// buildSandbox returns its own internal store, and this harness injects a
	// DIFFERENT localStorage through the overrides spread, so the plugin writes
	// here while `h.localStorage` stays empty. Reading the wrong object made
	// every "the value survived" assertion see `null` and look like a regression
	// in the bundle. Two stores, one of them a decoy — read this one.
	const read = (k) => (store.has(k) ? store.get(k) : null);
	return { h, counts, keysWritten, store, read };
}

const budgetDelta = (before, after) => ({
	publish: after.publish - before.publish,
	publishSlots: after.publishSlots - before.publishSlots,
	setProperty: after.setProperty - before.setProperty,
	setItem: after.setItem - before.setItem
});

/** Drive one skin switch and sample the three counters twice. */
async function measureSkinSwitch({ factoryApplied, seed, code } = {}) {
	const p = makeWriteBudgetHarness({ factoryApplied, seed, code });
	const before = { ...p.counts };
	p.h.actionBags['dream-skin'].setSkin('midnight');
	const sync = budgetDelta(before, p.counts);
	await new Promise((r) => setTimeout(r, 500));
	const at500 = { ...p.counts };
	await new Promise((r) => setTimeout(r, 2000));
	const at2500 = { ...p.counts };
	const worstKey = Math.max(0, ...p.keysWritten.values());
	return { p, sync, at500, at2500, settled: budgetDelta(before, at2500), worstKey };
}

test('#84: the budget harness observes a plugin that is actually running', () => {
	// A harness that counted nothing would make every budget below pass. These
	// are floors, not magic numbers: `apply()` on a first launch seeds the
	// shipped defaults, which IS storage traffic.
	const p = makeWriteBudgetHarness({ factoryApplied: false });
	assert.ok(p.counts.setItem >= 10, `the counter sees boot writes, saw ${p.counts.setItem}`);
	assert.ok(p.counts.setProperty >= 4, `the counter sees root property writes, saw ${p.counts.setProperty}`);
	assert.ok(p.counts.publish >= 1, `the counter sees token publications, saw ${p.counts.publish}`);
});

test('#84: a skin switch stays inside the declared write budget (existing user)', async () => {
	const r = await measureSkinSwitch({ factoryApplied: true });
	assert.ok(r.sync.publish <= WRITE_BUDGET.sync.publish,
		`one switch published ${r.sync.publish} token layer(s), budget ${WRITE_BUDGET.sync.publish}`);
	assert.ok(r.sync.setProperty <= WRITE_BUDGET.sync.setProperty,
		`one switch wrote ${r.sync.setProperty} root property(s), budget ${WRITE_BUDGET.sync.setProperty}`);
	assert.ok(r.sync.setItem <= WRITE_BUDGET.sync.setItem,
		`one switch made ${r.sync.setItem} storage writes, budget ${WRITE_BUDGET.sync.setItem}.\n` +
		'The pre-#84 value was 17-19: saveFactorySnapshot() serialises the WHOLE provenance\n' +
		'map, so calling it once per seeded key rewrote one storage key seven times. Batch it.');
	assert.ok(r.worstKey <= WRITE_BUDGET.sync.maxKeyWrites,
		`one storage key was written ${r.worstKey} times in a single switch, budget ${WRITE_BUDGET.sync.maxKeyWrites}`);
});

test('#84: a first-launch switch stays inside the same budget', async () => {
	// The fresh-install path seeds more (the boot probe is still settling), so it
	// gets its own measurement rather than being assumed equal to the above.
	const r = await measureSkinSwitch({ factoryApplied: false });
	assert.ok(r.sync.setItem <= WRITE_BUDGET.sync.setItem,
		`a first-launch switch made ${r.sync.setItem} sync storage writes, budget ${WRITE_BUDGET.sync.setItem}`);
	assert.ok(r.sync.publish <= WRITE_BUDGET.sync.publish, `a first-launch switch published ${r.sync.publish} layer(s)`);
	assert.ok(r.sync.setProperty <= WRITE_BUDGET.sync.setProperty, `a first-launch switch wrote ${r.sync.setProperty} root properties`);
});

test('#84: the settled window stops moving, and stays under its own budget', async () => {
	// Double sample (+500ms / +2500ms), per the repo test-admission rules: an
	// intermediate snapshot AND a final one, equal. A single sample cannot tell
	// "settled" from "still climbing", and a climbing counter is exactly what an
	// unguarded overrideTokens() emit produced on a real machine.
	for (const factoryApplied of [true, false]) {
		const r = await measureSkinSwitch({ factoryApplied });
		const tag = factoryApplied ? 'existing user' : 'first launch';
		assert.deepEqual(
			{ publish: r.at500.publish, setProperty: r.at500.setProperty, setItem: r.at500.setItem },
			{ publish: r.at2500.publish, setProperty: r.at2500.setProperty, setItem: r.at2500.setItem },
			`${tag}: the counters kept moving between +500ms and +2500ms — something is writing on a loop`
		);
		assert.ok(r.settled.publish <= WRITE_BUDGET.settled.publish, `${tag}: ${r.settled.publish} publishes > ${WRITE_BUDGET.settled.publish}`);
		assert.ok(r.settled.setProperty <= WRITE_BUDGET.settled.setProperty, `${tag}: ${r.settled.setProperty} root writes > ${WRITE_BUDGET.settled.setProperty}`);
		assert.ok(r.settled.setItem <= WRITE_BUDGET.settled.setItem, `${tag}: ${r.settled.setItem} storage writes > ${WRITE_BUDGET.settled.setItem}`);
	}
});

test('#84: a published token layer is never partial — slots scale with publishes', async () => {
	// `publish` counts LAYERS, not tokens (see the header). A layer that silently
	// lost slots would leave the surface half-themed while the layer count stayed
	// put, so the two numbers are checked together.
	//
	// This is an INVARIANT check, not a magnitude one. The harness's stub host
	// theme exposes no tokens of its own, so the layer this bundle publishes is
	// 7 slots wide here and 37 on a real DSH host — the "111 = 37 × 3" in
	// docs/desktop-support.md is that real width. Pinning 7 would pin the stub;
	// pinning the RATIO pins the plugin.
	for (const factoryApplied of [true, false]) {
		const r = await measureSkinSwitch({ factoryApplied });
		const tag = factoryApplied ? 'existing user' : 'first launch';
		assert.ok(r.sync.publish > 0 && r.sync.publishSlots > 0, `${tag}: the harness saw no publish at all`);
		assert.equal(r.sync.publishSlots % r.sync.publish, 0,
			`${tag}: ${r.sync.publishSlots} slot writes across ${r.sync.publish} publishes — a partial layer`);
		const width = r.sync.publishSlots / r.sync.publish;
		assert.equal(r.settled.publishSlots, r.settled.publish * width,
			`${tag}: the deferred pass published a layer of a different width (${r.settled.publishSlots} slots over ` +
			`${r.settled.publish} publishes, vs ${width}/layer synchronously) — a partial layer themes half a surface`);
	}
});

test('mutation: persisting the provenance map per seeded key reddens the write budget', async () => {
	// Both halves of the fix, each broken in isolation: the deferral and the
	// batch scope are useless without the other, so a case that removed only one
	// of them would not prove the pair.
	const noDefer = CODE.replace(
		'\t\t\tif (snapshotBatchDepth > 0) {\n\t\t\t\tsnapshotBatchDirty = true;\n\t\t\t\treturn;\n\t\t\t}\n',
		''
	);
	// Call the callback, just without a batch around it. NOT `(() => {` — that
	// pairs with the trailing `});` as a parenthesised function EXPRESSION that
	// is never invoked, so it deletes the retune instead of un-batching it and
	// the write count DROPS. The `>= control` guard below exists because that
	// mistake was made once here and read as "the gate still passes".
	const noBatch = CODE.replace('\t\t\twithFactorySnapshotBatch(() => {\n', '\t\t\t((fn) => fn())(() => {\n');
	assert.notEqual(noDefer, CODE, 'mutation A must actually change the bundle');
	assert.notEqual(noBatch, CODE, 'mutation B must actually change the bundle');

	const control = await measureSkinSwitch({ factoryApplied: true });
	for (const [name, code] of [['no deferral', noDefer], ['no batch scope', noBatch]]) {
		const r = await measureSkinSwitch({ factoryApplied: true, code });
		// The mutation must break the BATCHING, not the retune. A mutated bundle
		// that writes fewer keys than the fixed one simply stopped doing the
		// work, and its budget number is meaningless either way.
		assert.ok(
			r.sync.setItem >= control.sync.setItem,
			`${name}: the mutated bundle must still PERFORM the retune — it made ${r.sync.setItem} storage ` +
			`writes against ${control.sync.setItem} on the unmutated bundle. A mutation that never runs the ` +
			'code under test is not a mutation, it is a deletion.'
		);
		assert.ok(
			r.worstKey > WRITE_BUDGET.sync.maxKeyWrites || r.sync.setItem > WRITE_BUDGET.sync.setItem,
			`${name}: the budget must redden again — got ${r.sync.setItem} writes, worst key ${r.worstKey}`
		);
	}
});

test('#84: a skin switch never releases the sidebar link; a slider drag does', () => {
	// `applySkinDefaults()` writes SIDEBAR_OPACITY_KEY through plain writeStorage,
	// NOT through writeSidebarOpacityForSlider(). Deliberate: the slider path
	// releases the "follow the wallpaper" link because a DRAG is the user asking
	// for separate control (issue #55). A skin switch is not the user asking, so
	// flipping their checkbox as a side effect of picking a colour would change a
	// visible setting for no visible reason. This is the measured answer to the
	// review's question, not a reading of the code.
	const seed = {
		'dsh-dream-skin:wallpaper-kind': 'gradient',
		'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #222 0%, #444 100%)',
		'dsh-dream-skin:wallpaper-follows-skin': '0',
		'dsh-dream-skin:sidebar-link': '1',
		'dsh-dream-skin:sidebar-opacity': '0.5' // the user's own number
	};
	const h = makeWriteBudgetHarness({ factoryApplied: true, seed });
	h.h.actionBags['dream-skin'].setSkin('midnight');
	assert.equal(h.read('dsh-dream-skin:sidebar-link'), '1', 'a skin switch leaves the link alone');
	assert.equal(h.read('dsh-dream-skin:sidebar-opacity'), '0.5', 'and never retunes a value the user owns');

	// Time point 2: the slider, on the same profile, DOES release it.
	const bag = h.h.actionBags['dream-skin-wallpaper'];
	assert.ok(bag && typeof bag.setSidebarOpacity === 'function', 'the wallpaper row exposes setSidebarOpacity');
	bag.setSidebarOpacity(40);
	assert.equal(h.read('dsh-dream-skin:sidebar-link'), '0', 'a drag releases the link (issue #55 semantics intact)');
	assert.equal(h.read('dsh-dream-skin:sidebar-opacity'), '0.4', 'and persists the dragged value');
});

test('#84: "never touched a slider" and "reset it to the shipped number" are one state', () => {
	// The review asked whether the two states can still be told apart. Answer:
	// measured, they cannot — and nothing observable is lost. Provenance is
	// VALUE-based (a persistent snapshot of the seeded values), so a profile
	// sitting exactly on the shipped number is indistinguishable from one whose
	// row was never opened. They get the same answer either way, because the
	// number is identical by definition. What survives is the part that matters:
	// a user whose slider differs from the shipped number is never retuned.
	const SHIPPED = '0.4'; // SIDEBAR_DEFAULTS.opacity
	assert.match(CODE, /const SIDEBAR_DEFAULTS = \{ opacity: 0\.4, link: true \}/,
		'the shipped sidebar default this case reasons about must still be 0.4 / linked in the bundle');
	const target = String(skinById('midnight').defaults.sidebarOpacity);
	assert.notEqual(target, SHIPPED, 'the switch target must actually differ from the shipped number, or this proves nothing');

	const run = (seed) => {
		const h = makeWriteBudgetHarness({ factoryApplied: true, seed });
		h.h.actionBags['dream-skin'].setSkin('midnight');
		return h.read('dsh-dream-skin:sidebar-opacity');
	};
	const never = run({});
	const reset = run({ 'dsh-dream-skin:sidebar-opacity': SHIPPED });
	const owned = run({ 'dsh-dream-skin:sidebar-opacity': '0.42' });

	assert.equal(never, target, 'a profile that never touched the slider follows the skin');
	assert.equal(reset, target, 'a profile sitting exactly on the shipped number follows the skin too — the same state');
	assert.equal(never, reset, 'the two are indistinguishable from the outside, which is the honest answer');
	assert.equal(owned, '0.42', 'a profile whose slider differs keeps its number — this is the promise that is kept');
	assert.notEqual(owned, target, 'and the switch really did have something to retune, so the case is not vacuous');
});

// ═══════════════════════════════════════════════════════════════════════════
// Issue #79 — the pre-redesign built-in glows have to be repaired exactly once
// ═══════════════════════════════════════════════════════════════════════════
//
// The 10.6.1 redesign re-rolled every `SKINS[].glow` (old strings 230–320
// characters, new ones 399–409). `followsSkin()`'s pre-0.4.0 branch infers "this
// background is ours, follow the skin" from the stored string being EXACTLY a
// built-in gradient, so after the re-roll it matched nothing: an affected user's
// background stopped following the skin, silently, and the only cure was to
// re-pick the wallpaper by hand. Measured before the migration: 0 of 8 old
// strings matchable.
//
// The eight old strings live in tests/fixtures/legacy_skin_glows_10_6_0.json
// (extracted from tag v10.6.0), so these cases drive REAL bytes against
// UNPATCHED source — and tests/client.persistence.test.cjs recomputes the
// shipped constants from that same fixture. That pairing is the fix for the
// "self-consistent probe" trap this repo already fell into once: when every case
// rewrites the fingerprint to fit its own payload, a hand-copied constant ships
// silently dead and no test can tell.
const LEGACY_GLOWS = JSON.parse(
	fs.readFileSync(path.join(__dirname, 'fixtures', 'legacy_skin_glows_10_6_0.json'), 'utf8')
).skins;
const GLOW_KEY = 'dsh-dream-skin:wallpaper-gradient';
const GLOW_KIND_KEY = 'dsh-dream-skin:wallpaper-kind';
const GLOW_FOLLOWS_KEY = 'dsh-dream-skin:wallpaper-follows-skin';

/** Boot once with a seeded profile and hand back the sandbox. */
function bootWith(seed, code) {
	const h = buildSandbox({ ...(code ? { code } : {}), seed });
	const e = h.factory(makeRequire(makeRuntime().RT));
	assert.doesNotThrow(() => e.apply(makeApplyContext(h)));
	return h;
}

test('#79: every pre-redesign built-in glow becomes the current glow and is marked as following', () => {
	const ids = Object.keys(LEGACY_GLOWS);
	assert.equal(ids.length, 8, `the fixture must carry all eight legacy glows, found ${ids.length}`);

	for (const id of ids) {
		const legacy = LEGACY_GLOWS[id];
		const current = skinById(id).glow;
		assert.notEqual(legacy, current,
			`${id}: the legacy and current glows must differ, or this case proves nothing`);

		// No saved-skin key: the stored legacy string is the only clue, so the
		// repair must land on the skin that wrote it.
		const h = bootWith({ [GLOW_KIND_KEY]: 'gradient', [GLOW_KEY]: legacy });
		assert.equal(h.localStorage.getItem(GLOW_KEY), current,
			`${id}: a legacy built-in glow must be swapped for the current one — that stored string is what tells followsSkin() the background is ours`);
		assert.equal(h.localStorage.getItem(GLOW_FOLLOWS_KEY), '1',
			`${id}: the follows marker must be recorded, or the next redesign repeats this whole silent breakage`);
		assert.ok(String(h.localStorage.getItem(GLOW_KEY)).startsWith('radial-gradient('),
			`${id}: the repair must write a gradient — the legacy factory photo stays unreachable from this path`);
		assert.equal(h.localStorage.getItem(GLOW_KIND_KEY), 'gradient', `${id}: the kind must not be rewritten`);
	}
});

test('#79: the repaired background follows the SAVED skin, not the string it replaced', () => {
	const h = bootWith({
		'dsh-dream-skin:skin': 'mist',
		[GLOW_KIND_KEY]: 'gradient',
		[GLOW_KEY]: LEGACY_GLOWS.abyss
	});
	assert.equal(h.localStorage.getItem(GLOW_KEY), skinById('mist').glow,
		'what "follow the skin" means now is the saved skin — restoring the abyss glow under a mist selection would be a different, wrong background');
	assert.equal(h.localStorage.getItem(GLOW_FOLLOWS_KEY), '1');
});

test('#79: a gradient the user chose is never touched', () => {
	const userGradient = 'linear-gradient(135deg, #101010 0%, #303030 100%)';
	const cases = {
		'a gradient matching nothing we ship': { [GLOW_KIND_KEY]: 'gradient', [GLOW_KEY]: userGradient },
		'a legacy glow the user picked EXPLICITLY (follows=0)': {
			[GLOW_KIND_KEY]: 'gradient',
			[GLOW_KEY]: LEGACY_GLOWS.rose,
			[GLOW_FOLLOWS_KEY]: '0'
		},
		'a legacy glow under a non-gradient kind (dormant, not on screen)': {
			[GLOW_KIND_KEY]: 'image',
			[GLOW_KEY]: LEGACY_GLOWS.ivory
		}
	};
	for (const [name, seed] of Object.entries(cases)) {
		const h = bootWith(seed);
		assert.equal(h.localStorage.getItem(GLOW_KEY), seed[GLOW_KEY],
			`${name}: the stored gradient must survive untouched — a user wallpaper is never ours to move`);
		if (seed[GLOW_FOLLOWS_KEY] === '0') {
			assert.equal(h.localStorage.getItem(GLOW_FOLLOWS_KEY), '0',
				`${name}: an explicit "not following" is a user decision and must stay`);
		}
	}
});

test('#79: the glow repair is idempotent across boots', () => {
	const first = bootWith({ [GLOW_KIND_KEY]: 'gradient', [GLOW_KEY]: LEGACY_GLOWS.nebula });
	const once = first.localStorage.getItem(GLOW_KEY);
	assert.equal(once, skinById('nebula').glow, 'control: the first boot repaired it');

	const second = bootWith({ [GLOW_KIND_KEY]: 'gradient', [GLOW_KEY]: once, [GLOW_FOLLOWS_KEY]: '1' });
	assert.equal(second.localStorage.getItem(GLOW_KEY), once,
		'a second boot must not move the value again — the replacement is a current glow, which is not in the legacy table');
	assert.equal(second.localStorage.getItem(GLOW_FOLLOWS_KEY), '1', 'and the marker stays put');
});

test('#79: the legacy-glow constants are load-bearing (a wrong prefix disables the repair)', () => {
	const legacy = LEGACY_GLOWS.mist;
	const patched = CODE.replace(
		'prefix: "radial-gradient(1000px 560px at 84% -6%, rgba(159, 190, 245, 0.3"',
		'prefix: "radial-gradient(1000px 560px at 84% -6%, rgba(000, 000, 000, 0.0"'
	);
	assert.notEqual(patched, CODE, 'the mist prefix literal must still exist for this mutation to mean anything');

	const h = bootWith({ [GLOW_KIND_KEY]: 'gradient', [GLOW_KEY]: legacy }, patched);
	assert.equal(h.localStorage.getItem(GLOW_KEY), legacy,
		'with a broken fingerprint the repair must NOT fire — that is what the constants are for, and a green run here would mean the case passes for some other reason');
	assert.notEqual(h.localStorage.getItem(GLOW_FOLLOWS_KEY), '1', 'and it must not claim the background follows the skin');
});

// ---------------------------------------------------------------------------
// A1 — the channel-divergent pool
// ---------------------------------------------------------------------------

/**
 * Read a `const NAME = [ "…" ]` array literal out of the SHIPPED bundle.
 *
 * These fixtures used to paste probe selectors as literals, which meant a rename in
 * lib/client.js silently retargeted the test instead of reddening it. The pools are the
 * contract now, so the test asks the bundle which groups are in them.
 */
const codeArrayConst = (name) => {
	const m = new RegExp(String.raw`const ${name} = \[([\s\S]*?)\];`).exec(CODE);
	if (!m) throw new Error(`${name} moved out of lib/client.js — the pool fixture cannot name it`);
	return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1].replace(/\\"/g, '"'));
};

const runPoolFixture = ({ hostCss, mounted }) => {
	const hostSheet = makeEl();
	hostSheet.textContent = hostCss;
	const doc = {
		body: makeEl(), createElement: () => makeEl(), createTextNode: () => ({}), head: makeEl(),
		querySelector: (sel) => (mounted.has(sel) ? { matched: true } : null),
		querySelectorAll: (sel) => (hostCss === null ? [] : (sel === 'style[data-plugin-css]' ? [hostSheet] : []))
	};
	return doc;
};

test('drift probe (A1): a shell-shaped page can finally reach drifted: [] with the divergent hashes named', async () => {
	// The whole point of the pool: docs/desktop-support.md teaches tooling that
	// `drifted: [] && pending: false` is the ONLY positive "all refinements live" signal,
	// and on the official desktop shell it was unreachable — the shell re-rolls the
	// conversation-package hashes independently of npm, so two live anchors could only ever
	// be missing there. This fixture is that page: the divergent hashes and the retired ones
	// are absent from both the DOM and the host CSS, and the hash-free anchors mount.
	const DIVERGENT = codeArrayConst('CHANNEL_DIVERGENT_PROBE_GROUPS');
	const RETIRED = codeArrayConst('RETIRED_PROBE_GROUPS');
	assert.equal(DIVERGENT.length, 2, 'two groups are registered as channel-divergent (todo/queue frosting + composer root)');
	for (const sel of DIVERGENT) assert.ok(!RETIRED.includes(sel), `${sel}: one group cannot sit in two pools at once`);

	const mounted = new Set([SIDEBAR_PROBE_SEL, 'div:has(> [data-shell-overlay])', '[class$="_fade"]']);
	const doc = runPoolFixture({
		hostCss: '._2H3hWW_footArea{display:flex}._2H3hWW_regionArea{margin-left:-4px}._2H3hWW_root{color:red}',
		mounted
	});
	const warns = [];
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	h.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(h));
	await settleDrift(h.window);
	const a = h.window.__DSH_DREAM_SKIN_STATUS__.anchors;
	assert.equal(a.pending, false, 'liveness proven, so this is a verdict rather than a shrug');
	assert.deepEqual(a.drifted, [], 'A1 acceptance: nothing unexplained is left on a shell-shaped page');
	assert.deepEqual(a.channelAbsent.slice().sort(), DIVERGENT.slice().sort(),
		'the two hashes this repository measured as npm-only land in their own pool, named');
	assert.deepEqual(a.notMounted, [], 'no surface is claimed healthy-unmounted that the host does not declare');
	assert.deepEqual(a.retired.slice().sort(), RETIRED.slice().sort(), 'J1 pool unchanged');
	// docs/desktop-support.md promises BOTH explained pools never reach the alarm — that
	// sentence is a contract with whoever reads the console, so it is asserted here rather
	// than inferred from the `terminalDrift.length > 0` guard. On this page `drifted` is
	// empty, so the whole warn must be silent; and no explained absence may show up in a
	// warning line even if a future change makes the alarm fire for another reason.
	assert.deepEqual(warns.filter((w) => w.includes('drifted')), [],
		'an all-explained terminal verdict must not console.warn about drift');
	for (const sel of [...DIVERGENT, ...RETIRED]) {
		assert.ok(!warns.some((w) => w.includes(sel)), `${sel}: an explained absence may never appear in the alarm`);
	}
});

test('drift probe (A1): when a real drift does fire the alarm, the explained pools are not in its list', async () => {
	// The doc promises `retired` and `channelAbsent` never reach the console alarm. On an
	// all-explained page that promise is unfalsifiable — the alarm is gated on a non-empty
	// `drifted` TWICE (the latch, then the print), so a mutation that only widens those guards
	// changes nothing observable (measured: two such mutations stayed green). What a reader of
	// the console CAN see is the printed list, so this fixture mixes one genuinely renamed
	// anchor with the two registered ones: the alarm must name the drift and stay shut about
	// the explained absences.
	const DIVERGENT = codeArrayConst('CHANNEL_DIVERGENT_PROBE_GROUPS');
	const RETIRED = codeArrayConst('RETIRED_PROBE_GROUPS');
	const footGroup = SIDEBAR_PROBE_SEL;
	assert.ok(!DIVERGENT.includes(footGroup) && !RETIRED.includes(footGroup),
		'the fixture needs an unregistered, un-retired group to rename');
	const mounted = new Set(['div:has(> [data-shell-overlay])', '[class$="_fade"]']);
	// Host CSS with no `_footArea` class selector at all (so the suffix anchor reads as
	// renamed, not unmounted) and none of the registered tokens.
	const doc = runPoolFixture({ hostCss: '._9xAbC_somethingElse{color:red}', mounted });
	const warns = [];
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn: (...a) => warns.push(a.join(' ')), log() {}, error() {} } });
	h.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(h));
	await settleDrift(h.window);
	const a = h.window.__DSH_DREAM_SKIN_STATUS__.anchors;
	assert.deepEqual(a.drifted, [footGroup], 'the renamed hash-free anchor is the one real drift here');
	assert.deepEqual(a.channelAbsent.slice().sort(), DIVERGENT.slice().sort(), 'the registered pair still reads as channel-absent');
	const alarm = warns.filter((w) => w.includes('drifted'));
	assert.equal(alarm.length, 1, 'a genuine drift warns exactly once');
	assert.ok(alarm[0].includes(footGroup), 'and it names the drifted group');
	for (const sel of [...DIVERGENT, ...RETIRED]) {
		assert.ok(!alarm[0].includes(sel), `${sel}: explained absences must not be smuggled into the drift alarm`);
	}
});

test('drift probe (A1): host ownership OUTRANKS the registry — a still-declared hash is notMounted, not channel-absent', async () => {
	// The precedence this pool could easily have broken: "this channel rolled the hash" is a
	// claim ABOUT the host, and a host whose own CSS still declares the token contradicts it.
	// Filing that as channel-absent would be a false statement dressed as a documented one —
	// the registry outvoting the evidence, which is the same mistake shape as a fallback value
	// vouching for itself.
	const DIVERGENT = codeArrayConst('CHANNEL_DIVERGENT_PROBE_GROUPS');
	const composerGroup = '.uV2eYG_root';
	assert.ok(DIVERGENT.includes(composerGroup), 'the fixture targets a registered group, or this test proves nothing');
	const mounted = new Set([SIDEBAR_PROBE_SEL, 'div:has(> [data-shell-overlay])', '[class$="_fade"]']);
	const doc = runPoolFixture({ hostCss: '.uV2eYG_root{padding:0}._2H3hWW_root{color:red}', mounted });
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn() {}, log() {}, error() {} } });
	h.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(h));
	await settleDrift(h.window);
	const a = h.window.__DSH_DREAM_SKIN_STATUS__.anchors;
	assert.deepEqual(a.notMounted, [composerGroup],
		'the host still draws this class ⇒ the surface simply never mounted; ownership wins');
	assert.ok(!a.channelAbsent.includes(composerGroup),
		'a registered group must not be called channel-absent on a host that declares it');
	assert.deepEqual(a.drifted, [], 'and it is not drift either — all three verdicts stay distinguishable');
});

test('drift probe (A1): with no host CSS to read, a registered group is still reported — never vanished, never re-labelled drift', async () => {
	// The conservative path used to drop the pool on the floor: `hostSeen === false` returned
	// `channelAbsent: []`, so a registered group disappeared from drifted AND from
	// channelAbsent AND from notMounted. A missing observation is not the same as a
	// retracted one — this is the "silently disappears instead of turning red" shape, caught
	// while writing the gate rather than after shipping it.
	const DIVERGENT = codeArrayConst('CHANNEL_DIVERGENT_PROBE_GROUPS');
	const mounted = new Set([SIDEBAR_PROBE_SEL, 'div:has(> [data-shell-overlay])', '[class$="_fade"]']);
	const doc = runPoolFixture({ hostCss: null, mounted });
	const h = buildSandbox({ code: FAST_DRIFT_CODE, document: doc, console: { warn() {}, log() {}, error() {} } });
	h.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(h));
	await settleDrift(h.window);
	const a = h.window.__DSH_DREAM_SKIN_STATUS__.anchors;
	assert.equal(a.pending, false, 'liveness came from the mounted groups, not from the unreadable CSS');
	assert.deepEqual(a.channelAbsent.slice().sort(), DIVERGENT.slice().sort(),
		'the registry does not depend on reading this page, so it still reports');
	assert.deepEqual(a.notMounted, [], 'and it does NOT claim every host is healthy-unmounted');
	const everyGroup = [...DIVERGENT, ...codeArrayConst('RETIRED_PROBE_GROUPS'), SIDEBAR_PROBE_SEL,
		'div:has(> [data-shell-overlay])', '[class$="_fade"]'];
	const accounted = [...a.drifted, ...a.notMounted, ...a.channelAbsent, ...a.retired];
	// Only the MISSING groups owe an explanation — a mounted one belongs to no pool, and
	// demanding otherwise would make this assertion fail for the wrong reason.
	for (const sel of everyGroup.filter((g) => !mounted.has(g))) {
		assert.ok(accounted.includes(sel), `${sel}: every probe group this page lacks must land in exactly one pool`);
	}
	assert.equal(accounted.length, everyGroup.filter((g) => !mounted.has(g)).length,
		'and no group may be counted twice across pools');
});

// ─────────────────────────────────────────────────────────────────────────────
// Wallpaper rotation (issue #61, second observation: cycling through several
// links). The four blockers named when this was first declined are each pinned
// below by name: (1) the list is an additive key and `wallpaper-url` stays "what
// is showing now"; (2) every entry passes the gate on every path and one bad entry
// never costs the others; (3) rotation has its own phase and shares the tick, so
// one wake-up fetches at most once; (4) the key is a sentinel, not a factory
// default, and a rotation never writes the wallpaper history.
// ─────────────────────────────────────────────────────────────────────────────
const ROT_KEY = 'dsh-dream-skin:wallpaper-rotation';
const ROT_REFRESH_KEY = 'dsh-dream-skin:wallpaper-refresh';
const ROT_HISTORY_KEY = 'dsh-dream-skin:wallpaper-history';
const ROT_A = 'https://cdn.example.com/a.jpg';
const ROT_B = 'https://cdn.example.com/b.jpg';
const ROT_C = 'https://cdn.example.com/c.jpg';
const ROT_D = 'https://cdn.example.com/d.jpg';
const ROT_E = 'https://cdn.example.com/e.jpg';
const MIN = 60 * 1000;

/**
 * An `Image` whose preload the test decides. `mode` is 'ok' (loads at once), 'fail'
 * (errors at once), 'hold' (stays pending until the test calls `ok()`/`fail()`), or a
 * function of (probe, n) returning one of those. Every probe is recorded.
 */
function mkProbeImage(probes, mode) {
	return function () {
		const self = this;
		this.onload = null;
		this.onerror = null;
		let src = '';
		Object.defineProperty(this, 'src', {
			get: () => src,
			set: (v) => {
				src = v;
				const probe = { url: v, ok: () => self.onload && self.onload(), fail: () => self.onerror && self.onerror() };
				probes.push(probe);
				const m = typeof mode === 'function' ? mode(probe, probes.length) : mode;
				if (m === 'ok') probe.ok();
				else if (m === 'fail') probe.fail();
			}
		});
	};
}

/**
 * m02439: the log the bundle publishes its own toasts into. Kept mutable (never replaced) so the
 * `r.alerts.length = 0` calls below still clear it when a case runs before any notice was raised.
 */
const EMPTY_NOTICES = [];

/** Boot the plugin with a rotation config, a controllable preload and a capturable tick. */
function bootRotation({ urls = [ROT_A, ROT_B, ROT_C], current = ROT_A, kind = 'url', rotation = {}, refresh = null, mode = 'ok', visibility, date, seed = {}, fetch: fetchOverride, setTimeout: timeoutOverride } = {}) {
	const probes = [];
	const listeners = {};
	let tick = null;
	const g = mkWallpaperDoc();
	g.doc.addEventListener = (name, fn) => { listeners[name] = fn; };
	g.doc.removeEventListener = (name, fn) => { if (listeners[name] === fn) delete listeners[name]; };
	if (visibility) g.doc.visibilityState = visibility;
	const stored = { 'dsh-dream-skin:wallpaper-kind': kind, 'dsh-dream-skin:wallpaper-follows-skin': '0', ...seed };
	if (current !== null) stored['dsh-dream-skin:wallpaper-url'] = current;
	if (rotation !== null) {
		stored[ROT_KEY] = JSON.stringify({ on: 1, mode: 'sequential', minutes: 60, urls, lastRotatedAt: 0, ...rotation });
	}
	if (refresh) stored[ROT_REFRESH_KEY] = JSON.stringify(refresh);
	const h = buildSandbox({
		document: g.doc,
		Image: mkProbeImage(probes, mode),
		seed: stored,
		...(date ? { Date: date } : {}),
		...(fetchOverride ? { fetch: fetchOverride, AbortController } : {}),
		...(timeoutOverride ? { setTimeout: timeoutOverride } : {}),
		window: {
			setInterval: (fn) => { tick = fn; return 11; },
			clearInterval: () => { tick = null; }
		}
	});
	const e = h.factory(makeRequire(makeRuntime().RT));
	const ctx = makeApplyContext(h, { captureActions: true });
	e.apply(ctx);
	const cfg = () => JSON.parse(h.localStorage.getItem(ROT_KEY));
	return {
		h, g, probes, listeners, ctx,
		// m02439: the bundle raises its OWN toast (AGENTS.md §12 forbids window.alert), so the
		// capture point is the log it publishes rather than a stubbed alert. The getter keeps every
		// `r.alerts.length = 0` / `assert.deepEqual(r.alerts, [...])` below unchanged.
		get alerts() { return h.window.__DSH_DREAM_SKIN_NOTICES__ || EMPTY_NOTICES; },
		tick: () => tick && tick(),
		hasTick: () => tick !== null,
		adv: h.actionBags['dream-skin-wallpaper-advanced'],
		url: () => h.localStorage.getItem('dsh-dream-skin:wallpaper-url'),
		rendered: () => (/url\("([^"]+)"\)/.exec(g.main().style.backgroundImage) || [])[1],
		cfg,
		refreshCfg: () => JSON.parse(h.localStorage.getItem(ROT_REFRESH_KEY)),
		history: () => JSON.parse(h.localStorage.getItem(ROT_HISTORY_KEY) || '[]'),
		unmount: () => { for (const d of h.disposers || []) d(); }
	};
}

test('rotation: a due rotation shows the next link, keeps history and the stored URL clean, and writes one documented key', () => {
	const r = bootRotation();
	// Boot catch-up (sample 1): due at boot, so exactly one preload ran and it checked
	// the very URL that is painted, cache-busted by the stamp the commit also persists.
	assert.equal(r.probes.length, 1, 'one preload at boot');
	assert.ok(/^https:\/\/cdn\.example\.com\/b\.jpg\?t=\d{13}$/.test(r.probes[0].url), 'the next link is probed with a stamp: ' + r.probes[0].url);
	assert.equal(r.rendered(), r.probes[0].url, 'the probe checked exactly the URL that renders');
	assert.equal(r.url(), ROT_B, '`wallpaper-url` stays the clean "what is showing now"');
	assert.equal(r.history().length, 0, 'a rotation never writes the wallpaper history');
	const c = r.cfg();
	assert.deepEqual(Object.keys(c).sort(), ['lastRotatedAt', 'minutes', 'mode', 'on', 'source', 'urls'], 'the persisted contract is exactly these fields');
	assert.equal(c.source, 'links', 'the source defaults to the link list');
	assert.equal(c.lastRotatedAt, r.refreshCfg().lastFiredAt, 'the commit stamp is the refresh stamp (#61: last fetch of this image)');
	assert.ok(Math.abs(Date.now() - c.lastRotatedAt) < 5000, 'phase is now');
	// Sample 2 (final): "next" walks the list and wraps. The cursor is the showing URL,
	// so no cursor field exists to drift.
	const seen = [];
	for (let i = 0; i < 3; i++) { r.adv.rotateNow(); seen.push(r.url()); }
	assert.deepEqual(seen, [ROT_C, ROT_A, ROT_B], 'sequential order wraps around the list');
	assert.equal(r.history().length, 0, 'still no history after several rotations');
});

test('rotation: an automatic rotation keeps the manual framing — it never recentres the user crop', () => {
	// A DECISION, not a coincidence (review 2026-10-23, and #95's "don't quietly fix it"):
	// rotation only swaps the LINK — timed, or the「next now」button — so it is not the user
	// choosing a new composition, and an automatic event must never overwrite a manual
	// setting (the same family as "low-power does not pause rotation"). A user who types a
	// URL (or picks an image) IS choosing a new composition, so `setUrl` / `setImage` reset
	// the framing. The scheduled URL refresh follows the same RULE — it never resets the
	// framing either — even though it is a separate code path, so this is a rule rather
	// than a quirk of one call site.
	const r = bootRotation({
		seed: { [FRAME_X_KEY]: '-40', [FRAME_Y_KEY]: '25', [FRAME_ZOOM_KEY]: '180' }
	});
	assert.equal(r.url(), ROT_B, 'precondition: the automatic commit really happened');
	assert.equal(r.h.localStorage.getItem(FRAME_X_KEY), '-40', 'the manual X offset survives the rotation');
	assert.equal(r.h.localStorage.getItem(FRAME_Y_KEY), '25', 'and Y');
	assert.equal(r.h.localStorage.getItem(FRAME_ZOOM_KEY), '180', 'and the zoom');
	assert.equal(r.rendered(), r.probes[0].url, 'the crop is painted on the NEXT link, not on the old picture');
	assert.equal(r.g.main().style.backgroundPosition, 'calc(50% - 40vw) calc(50% + 25vh)',
		'the rotated image is painted with the user crop, not centred');
	assert.equal(r.g.main().style.transform, 'scale(1.8)', 'and with the user zoom');
	// The「next now」button is the same operation with the timer skipped: the user asked to
	// advance the link, not to recompose, so the rule has to hold there too — otherwise it
	// is really "timers are special", which is not the reason written above.
	r.adv.rotateNow();
	assert.equal(r.url(), ROT_C, 'precondition: the button advanced the link');
	assert.equal(r.h.localStorage.getItem(FRAME_X_KEY), '-40', 'a manual "next now" keeps the crop as well');
	assert.equal(r.h.localStorage.getItem(FRAME_ZOOM_KEY), '180');
	assert.equal(r.g.main().style.backgroundPosition, 'calc(50% - 40vw) calc(50% + 25vh)',
		'and the advanced link is painted with it');
	// Reverse leg, so nobody reads this as "the reset simply did not run": a MANUAL change
	// of the same URL kind must still recentre — that is the rule this one is carved out of.
	r.adv.setUrl('https://cdn.example.com/manual.jpg');
	assert.equal(r.h.localStorage.getItem(FRAME_X_KEY), '0', 'a manual link change is the user changing the composition');
	assert.equal(r.h.localStorage.getItem(FRAME_ZOOM_KEY), '100');
});

test('rotation: every entry passes the gate on every path, and one bad entry never costs the others', () => {
	const GOOD1 = 'https://good1.example.com/a.jpg';
	const GOOD2 = 'https://good2.example.com/b.jpg';
	const tampered = [
		'javascript:alert(1)', 'file:///etc/passwd', 'data:image/png;base64,AAAAAAAAAAAA', 'ftp://host/x.jpg',
		'http:/nope', GOOD1, 42, null, GOOD2 + '?t=1700000000000', 'https://x.example.com/' + 'a'.repeat(2100),
		'https://good1.example.com/a.jpg'
	];
	// Path 1: a hand-edited / host-adopted state file reaches a real rotation. Cycle many
	// times in both orders; nothing but the two good links may ever be painted.
	for (const mode of ['sequential', 'random']) {
		const r = bootRotation({ urls: tampered, current: GOOD1, rotation: { mode, lastRotatedAt: Date.now() } });
		assert.equal(r.probes.length, 0, mode + ': not due at boot, nothing probed yet');
		const shown = new Set();
		for (let i = 0; i < 8; i++) {
			r.adv.rotateNow();
			shown.add(r.url());
			assert.ok(r.url() === GOOD1 || r.url() === GOOD2, mode + ': only gated links are ever painted, saw ' + r.url());
		}
		assert.deepEqual([...shown].sort(), [GOOD1, GOOD2], mode + ': the good entries keep rotating although others were refused');
		assert.deepEqual(r.cfg().urls, [GOOD1, GOOD2], mode + ': the stored list is scrubbed entry by entry, de-duplicated and stamp-free');
	}
	// Path 2: the settings box. Mixed lines keep the valid ones and say how many were refused.
	const r = bootRotation({ rotation: null });
	r.adv.setRotationList('javascript:alert(1)\n' + GOOD1 + '\n\n   \nftp://bad.example.com/x.jpg\n' + GOOD2 + '\n');
	assert.deepEqual(r.cfg().urls, [GOOD1, GOOD2], 'the valid lines survive');
	assert.deepEqual(r.alerts, ['bg2.rotationDropped'], 'the refusal is announced once');
	// m02439 (user): the refusal reaches the user as the plugin's OWN card — the browser's native
	// modal is what AGENTS.md §12 forbids, and it is what a user sees landing on top of the host.
	const toast = r.g.doc.body.children.find((el) => el.attrs && 'data-dsh-dream-skin-notice' in el.attrs);
	assert.ok(toast, 'the notice card is mounted on the page');
	assert.equal(toast.getAttribute('role'), 'status', 'and it announces itself politely');
	assert.equal(toast.textContent, 'bg2.rotationDropped', 'with the very wording the log holds');
	// Nothing usable at all: refused whole, the saved list is untouched.
	r.alerts.length = 0;
	r.adv.setRotationList('javascript:alert(1)\ndata:image/png;base64,AAAAAAAAAAAA');
	assert.deepEqual(r.cfg().urls, [GOOD1, GOOD2], 'an all-bad box changes nothing');
	assert.deepEqual(r.alerts, ['bg2.rotationNoValid'], 'and says so');
	// The cap: 25 valid lines keep the first 20.
	r.adv.setRotationList(Array.from({ length: 25 }, (_, i) => 'https://cap.example.com/' + i + '.jpg').join('\n'));
	assert.equal(r.cfg().urls.length, 20, 'the list is capped');
	assert.equal(r.cfg().urls[19], 'https://cap.example.com/19.jpg', 'the cap keeps the first entries');
});

test('rotation: one wake-up fetches at most once, and the URL refresh still runs when rotation is not due', () => {
	const now = Date.now();
	// Both due: only the rotation fetches (the refresh would re-fetch the link being replaced).
	const both = bootRotation({
		rotation: { minutes: 5, lastRotatedAt: now - 6 * MIN },
		refresh: { on: 1, hours: 1, lastFiredAt: now - 2 * 60 * MIN }
	});
	assert.equal(both.probes.length, 1, 'one fetch at boot, not two');
	assert.equal(both.url(), ROT_B, 'and it was the rotation');
	assert.ok(!/[?&]t=\d/.test(both.url()), 'no ?t= leaks into stored state');
	both.tick();
	assert.equal(both.probes.length, 1, 'right after a commit neither schedule is due: the next tick fetches nothing');
	assert.equal(both.refreshCfg().lastFiredAt, both.cfg().lastRotatedAt, 'the commit re-phased the refresh too');
	// The race only exists while the rotation's preload is still in flight (a synchronous commit
	// re-phases the refresh before it can run): hold the preload, both due.
	const held = bootRotation({
		mode: 'hold',
		rotation: { minutes: 5, lastRotatedAt: now - 6 * MIN },
		refresh: { on: 1, hours: 1, lastFiredAt: now - 2 * 60 * MIN }
	});
	assert.equal(held.probes.length, 1, 'sample 1: with the rotation preload pending, the due refresh does not fetch the link being replaced');
	held.tick();
	held.tick();
	assert.equal(held.probes.length, 1, 'sample 2: nor does it on later ticks while the rotation is still in flight');
	held.probes[0].ok();
	assert.equal(held.url(), ROT_B, 'the rotation then commits');
	// Rotation not due, refresh due: the refresh is untouched by the feature.
	const refreshOnly = bootRotation({
		rotation: { minutes: 60, lastRotatedAt: now - MIN },
		refresh: { on: 1, hours: 1, lastFiredAt: now - 2 * 60 * MIN }
	});
	assert.equal(refreshOnly.probes.length, 1, 'the refresh fetched');
	assert.ok(refreshOnly.probes[0].url.startsWith(ROT_A + '?t='), 'it re-fetched the CURRENT link, not the next one');
	assert.equal(refreshOnly.url(), ROT_A, 'the showing link did not change');
});

test('rotation: it waits for its interval, for a visible window, for the link kind, and for being switched on', () => {
	const now = Date.now();
	// Interval: 1 minute into a 60-minute interval does not rotate; the next tick still does not.
	const early = bootRotation({ rotation: { minutes: 60, lastRotatedAt: now - MIN } });
	assert.equal(early.probes.length, 0, 'not due at boot');
	early.tick();
	assert.equal(early.url(), ROT_A, 'and not due at the tick either');
	// A clock that went backwards: a stamp in the future must not freeze the schedule.
	const skewed = bootRotation({ rotation: { minutes: 5, lastRotatedAt: now + 3 * 60 * MIN } });
	assert.equal(skewed.url(), ROT_B, 'a stamp from the future counts as due');
	// Off.
	const off = bootRotation({ rotation: { on: 0 } });
	off.tick();
	assert.equal(off.probes.length, 0, 'switched off: no fetch at boot and none at the tick');
	// Kind: rotation never overwrites a wallpaper the user picked as an image or a gradient.
	for (const kind of ['image', 'gradient']) {
		const k = bootRotation({ kind });
		k.tick();
		assert.equal(k.probes.length, 0, kind + ': nothing is fetched');
		assert.equal(k.h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), kind, kind + ': the kind is left alone');
	}
	// Hidden window: no rotation on the tick; the visibility catch-up does it on return (sample 1, then 2).
	const hidden = bootRotation({ visibility: 'hidden' });
	assert.equal(hidden.probes.length, 0, 'hidden at boot: no fetch');
	hidden.tick();
	assert.equal(hidden.probes.length, 0, 'hidden at the tick: no fetch');
	assert.equal(typeof hidden.listeners.visibilitychange, 'function', 'the shared visibility catch-up is armed');
	hidden.g.doc.visibilityState = 'visible';
	hidden.listeners.visibilitychange();
	assert.equal(hidden.url(), ROT_B, 'on return the overdue rotation happens');
});

test('rotation: a dead link keeps the wallpaper, tries a bounded number of others, and spends the interval', () => {
	const urls = [ROT_A, ROT_B, ROT_C, ROT_D, ROT_E];
	// Everything dead: three candidates tried in order, then the interval is spent.
	const dead = bootRotation({ urls, mode: 'fail' });
	assert.deepEqual(dead.probes.map((p) => p.url.split('?')[0]), [ROT_B, ROT_C, ROT_D], 'bounded: the next three in order, no more');
	assert.equal(dead.url(), ROT_A, 'the current wallpaper is kept');
	const spent = dead.cfg().lastRotatedAt;
	assert.ok(Math.abs(Date.now() - spent) < 5000, 'the interval was spent, so a list of dead links is not retried every minute');
	dead.tick();
	dead.tick();
	assert.equal(dead.probes.length, 3, 'later ticks inside the interval fetch nothing');
	// First dead, second alive: it moves on within the same attempt.
	let n = 0;
	const flaky = bootRotation({ urls, mode: () => (++n === 1 ? 'fail' : 'ok') });
	assert.deepEqual(flaky.probes.map((p) => p.url.split('?')[0]), [ROT_B, ROT_C], 'the dead link is skipped');
	assert.equal(flaky.url(), ROT_C, 'and the next live one is shown');
});

test('rotation: a preload still in flight when the plugin is torn down or re-armed must not write', async () => {
	// CONTRIBUTING rule 1: the resource is caught IN FLIGHT (the preload is held pending),
	// not after it has already settled.
	const r = bootRotation({ mode: 'hold' });
	assert.equal(r.probes.length, 1, 'sample 1: a preload is in flight');
	assert.equal(r.url(), ROT_A, 'and nothing was committed yet');
	const before = r.h.localStorage.getItem(ROT_KEY);
	r.unmount();
	r.probes[0].ok();
	assert.equal(r.url(), ROT_A, 'sample 2: the late preload of an unmounted plugin does not repaint');
	assert.equal(r.h.localStorage.getItem(ROT_KEY), before, 'nor does it touch the stored phase');
	// Re-arm (a settings action restarts the scheduler): the old preload is abandoned, and
	// the still-due rotation starts a fresh one that does commit.
	const r2 = bootRotation({ mode: 'hold' });
	assert.equal(r2.probes.length, 1, 'sample 1: a preload is in flight');
	r2.adv.setRefresh(false, 24);
	assert.equal(r2.probes.length, 2, 'the re-armed scheduler started its own preload');
	r2.probes[0].ok();
	assert.equal(r2.url(), ROT_A, 'sample 2: the abandoned preload committed nothing');
	r2.probes[1].ok();
	assert.equal(r2.url(), ROT_B, 'the fresh preload committed');
	// Switching rotation off while a preload is in flight: the user said stop, so it must not land.
	const r3 = bootRotation({ mode: 'hold' });
	assert.equal(r3.probes.length, 1, 'sample 1: a preload is in flight');
	r3.adv.setRotation(false);
	r3.probes[0].ok();
	assert.equal(r3.url(), ROT_A, 'sample 2: it did not land after rotation was switched off');
	// Editing the list while a preload is in flight: a link the user just removed must not appear.
	const r4 = bootRotation({ urls: [ROT_A, ROT_B, ROT_C], mode: 'hold' });
	assert.ok(r4.probes[0].url.startsWith(ROT_B), 'the in-flight candidate is B');
	r4.adv.setRotationList(ROT_A + '\n' + ROT_C);
	r4.probes[0].ok();
	assert.notEqual(r4.url(), ROT_B, 'a link removed from the list while loading is never shown');
});

test('rotation: a preload that never answers is abandoned after the deadline and the due rotation retries', () => {
	let clock = Date.now();
	const FakeDate = class extends Date {
		constructor(...a) { super(...(a.length ? a : [clock])); }
		static now() { return clock; }
	};
	const r = bootRotation({ mode: 'hold', date: FakeDate });
	assert.equal(r.probes.length, 1, 'sample 1: held preload');
	clock += 2 * MIN;
	r.tick();
	assert.equal(r.probes.length, 1, 'inside the deadline the pending preload is waited for');
	clock += 2 * MIN;
	r.tick();
	assert.equal(r.probes.length, 2, 'past the deadline a fresh attempt starts');
	r.probes[1].ok();
	assert.equal(r.url(), ROT_B, 'and it can commit');
	r.probes[0].ok();
	assert.equal(r.url(), ROT_B, 'while the stale one cannot move the wallpaper again');
});

test('rotation: switching it on is validated before it is stored and starts a fresh interval', () => {
	// Image kind: refused, and the refusal is not persisted (the T2 rule of setRefresh).
	const image = bootRotation({ kind: 'image', rotation: null });
	image.adv.setRotationList(ROT_A + '\n' + ROT_B);
	image.adv.setRotation(true);
	assert.deepEqual(image.alerts, ['bg2.rotationUrlOnly'], 'told to pick the link kind first');
	assert.equal(image.cfg().on, 0, 'a refused toggle does not land as on');
	// Too short a list: refused, not persisted.
	const short = bootRotation({ rotation: null });
	short.adv.setRotationList(ROT_A);
	short.adv.setRotation(true);
	assert.deepEqual(short.alerts, ['bg2.rotationNeedTwo'], 'one link is not a rotation');
	assert.equal(short.cfg().on, 0, 'and was not stored as on');
	assert.equal(short.probes.length, 0, 'nothing was fetched');
	// A valid switch-on stamps now: the user is looking at a wallpaper, an old stamp must not fire at once.
	const ok = bootRotation({ rotation: { on: 0, lastRotatedAt: Date.now() - 24 * 60 * MIN } });
	ok.adv.setRotation(true);
	assert.equal(ok.cfg().on, 1, 'switched on');
	assert.ok(Math.abs(Date.now() - ok.cfg().lastRotatedAt) < 5000, 'a fresh interval starts now');
	assert.equal(ok.probes.length, 0, 'sample 1: nothing rotates the instant it is enabled');
	assert.equal(ok.url(), ROT_A, 'sample 2: the wallpaper is unchanged');
	// And off, again, only if it was on: a user who never used rotation never gets the key.
	ok.adv.setRotation(false);
	assert.equal(ok.cfg().on, 0, 'switched off');
	const never = bootRotation({ rotation: null });
	never.adv.setRotation(false);
	assert.equal(never.h.localStorage.getItem(ROT_KEY), null, 'switching off something never configured writes nothing');
});

test('rotation: the list box ignores an empty save, switches rotation off when the list gets too short, and the controls clamp', () => {
	const r = bootRotation({ rotation: { on: 1, lastRotatedAt: Date.now(), urls: [ROT_A, ROT_B, ROT_C] } });
	// R13: an empty or blank box changes nothing at all.
	const before = r.h.localStorage.getItem(ROT_KEY);
	r.adv.setRotationList('');
	r.adv.setRotationList('   \n\t\n');
	r.adv.setRotationList(undefined);
	assert.equal(r.h.localStorage.getItem(ROT_KEY), before, 'blank saves are no-ops');
	assert.deepEqual(r.alerts, [], 'and silent');
	// Shrinking below two entries switches rotation off, and says why.
	r.adv.setRotationList(ROT_B);
	assert.deepEqual(r.cfg().urls, [ROT_B], 'the list was saved');
	assert.equal(r.cfg().on, 0, 'rotation switched itself off');
	assert.deepEqual(r.alerts, ['bg2.rotationNeedTwo'], 'with an explanation');
	// Mode is whitelisted; minutes clamp to the documented range and junk reads as the default.
	r.adv.setRotationMode('random');
	assert.equal(r.cfg().mode, 'random', 'a known mode is stored');
	r.adv.setRotationMode('shuffle-all');
	assert.equal(r.cfg().mode, 'random', 'an unknown mode leaves the stored one alone');
	// m01852: the floor is one minute (the box offers 1..60 分钟), junk still reads as the default.
	for (const [input, want] of [[1, 1], [0.4, 1], [90, 90], [99999, 10080], ['abc', 60], [NaN, 60]]) {
		r.adv.setRotationMinutes(input);
		assert.equal(r.cfg().minutes, want, `minutes ${String(input)} -> ${want}`);
	}
});

test('rotation: "next now" needs the link kind and two links, ignores the schedule, and re-phases it', () => {
	const image = bootRotation({ kind: 'image' });
	image.adv.rotateNow();
	assert.deepEqual(image.alerts, ['bg2.rotationUrlOnly'], 'wrong kind: told why');
	assert.equal(image.probes.length, 0, 'nothing fetched');
	const solo = bootRotation({ urls: [ROT_A] });
	solo.adv.rotateNow();
	assert.deepEqual(solo.alerts, ['bg2.rotationNeedTwo'], 'one link: told why');
	// Works with the schedule off and not due, and moves the phase.
	const off = bootRotation({ rotation: { on: 0, lastRotatedAt: Date.now() - MIN } });
	assert.equal(off.probes.length, 0, 'sample 1: off, so nothing at boot');
	off.adv.rotateNow();
	assert.equal(off.url(), ROT_B, 'sample 2: it rotated although the schedule is off');
	assert.ok(Math.abs(Date.now() - off.cfg().lastRotatedAt) < 5000, 'and the phase moved to now');
	assert.equal(off.cfg().on, 0, 'without switching the schedule on');
});

test('rotation: applying a link yourself keeps it for a full interval, and only touches the key when rotation is on', () => {
	const on = bootRotation({ rotation: { minutes: 30, lastRotatedAt: Date.now() - 20 * MIN } });
	assert.equal(on.probes.length, 0, 'not due at boot');
	on.adv.setUrl('https://my.example.com/own.jpg');
	assert.ok(Math.abs(Date.now() - on.cfg().lastRotatedAt) < 5000, 'a manual choice re-phases the rotation');
	on.tick();
	assert.equal(on.url(), 'https://my.example.com/own.jpg', 'so the timer does not replace it on the next tick');
	// A user who never used rotation: applying a link must not invent the key.
	const plain = bootRotation({ rotation: null });
	plain.adv.setUrl('https://my.example.com/own.jpg');
	assert.equal(plain.h.localStorage.getItem(ROT_KEY), null, 'no rotation key appears for a non-user');
	// And a list entry that is not in the list: sequential order starts at the top.
	const outside = bootRotation({ current: 'https://my.example.com/own.jpg' });
	assert.equal(outside.url(), ROT_A, 'the first rotation from a link outside the list starts at its first entry');
});

test('rotation: clearing the wallpaper switches the schedule off and resets its phase, but keeps the typed list (T3)', () => {
	const r = bootRotation({ rotation: { lastRotatedAt: Date.now() } });
	assert.equal(r.cfg().on, 1, 'sample 1: rotation is on');
	r.adv.clearAll();
	const c = r.cfg();
	assert.equal(c.on, 0, 'sample 2: the schedule is off');
	assert.equal(c.lastRotatedAt, 0, 'and its phase is reset, so a NEW wallpaper cannot inherit the countdown');
	assert.deepEqual(c.urls, [ROT_A, ROT_B, ROT_C], 'the list the user typed survives');
	assert.equal(r.hasTick(), false, 'the scheduler was stopped');
	// A user who never used rotation does not get the key from clearing.
	const plain = bootRotation({ rotation: null });
	plain.adv.clearAll();
	assert.equal(plain.h.localStorage.getItem(ROT_KEY), null, 'clearing creates no rotation key');
});

test('rotation: random never repeats the showing link and visits the others; low-power mode does not pause it', () => {
	const urls = [ROT_A, ROT_B, ROT_C, ROT_D];
	const r = bootRotation({ urls, rotation: { mode: 'random', lastRotatedAt: Date.now() } });
	const visited = new Set();
	let previous = r.url();
	for (let i = 0; i < 60; i++) {
		r.adv.rotateNow();
		assert.notEqual(r.url(), previous, 'random never "rotates" to the link that is already showing');
		previous = r.url();
		visited.add(previous);
	}
	assert.equal(visited.size, 4, 'and over many rotations reaches every link');
	// Decision: rotation costs one image decode per interval, so the low-power switch (#110, which
	// removes blur) does not stop it.
	const low = bootRotation({ seed: { 'dsh-dream-skin:performance': '1' } });
	assert.equal(low.url(), ROT_B, 'a due rotation still happens with low-power mode on');
});

test('rotation: the key is a sentinel — an upgrader whose only stored preference is a rotation list keeps their state', () => {
	// Same B2/F1 reasoning as the fill-mode key: without the key in the first-install probe, a
	// user whose only stored preference is the list is invisible to it and would get the whole
	// factory look pushed over their own choices.
	const h = buildSandbox();
	h.localStorage.removeItem('dsh-dream-skin:factory-applied');
	h.localStorage.setItem(ROT_KEY, JSON.stringify({ on: 0, mode: 'random', minutes: 15, urls: [ROT_A, ROT_B], lastRotatedAt: 0 }));
	const e = h.factory(makeRequire(makeRuntime().RT));
	e.apply(makeApplyContext(h));
	assert.equal(h.localStorage.getItem('dsh-dream-skin:skin'), null, 'no factory skin pushed onto the upgrader');
	assert.equal(h.localStorage.getItem('dsh-dream-skin:wallpaper'), null, 'the bundled wallpaper is not seeded');
	assert.equal(JSON.parse(h.localStorage.getItem(ROT_KEY)).mode, 'random', 'their own rotation settings survive');
	// And the key is NOT a factory default: polling third-party links stays an explicit opt-in (B7).
	const fresh = buildSandbox();
	fresh.localStorage.removeItem('dsh-dream-skin:factory-applied');
	fresh.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(fresh));
	assert.equal(fresh.localStorage.getItem(ROT_KEY), null, 'a first install does not get a rotation config');
});

test('rotation: a preload that answers after the user picked another wallpaper kind does not bring the link back', () => {
	// `setGradient` does not restart the scheduler, so the in-flight preload is not abandoned by
	// the re-arm path; the commit has to re-check the kind itself.
	const r = bootRotation({ mode: 'hold' });
	assert.equal(r.probes.length, 1, 'sample 1: a preload is in flight');
	r.adv.setGradient('linear-gradient(135deg, #000000 0%, #ffffff 100%)');
	assert.equal(r.h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'gradient', 'the user moved to a gradient');
	r.probes[0].ok();
	assert.equal(r.h.localStorage.getItem('dsh-dream-skin:wallpaper-kind'), 'gradient', 'sample 2: the late preload leaves the kind alone');
	assert.equal(r.url(), ROT_A, 'and the stored link is not replaced');
	assert.equal(r.cfg().lastRotatedAt, 0, 'and no phase is recorded for a rotation that did not happen');
});

test('rotation: switching it off stops the schedule — an overdue rotation does not happen, and switching back on starts a fresh interval', () => {
	let clock = Date.now();
	const FakeDate = class extends Date {
		constructor(...a) { super(...(a.length ? a : [clock])); }
		static now() { return clock; }
	};
	const r = bootRotation({ date: FakeDate, rotation: { minutes: 5, lastRotatedAt: clock } });
	assert.equal(r.probes.length, 0, 'sample 1: on, and not yet due');
	r.adv.setRotation(false);
	assert.equal(r.cfg().on, 0, 'the switch is stored as off');
	clock += 3 * 60 * MIN;
	r.tick();
	r.tick();
	assert.equal(r.probes.length, 0, 'sample 2: nothing is fetched while it is off, however overdue');
	assert.equal(r.url(), ROT_A, 'the wallpaper stays put');
	r.listeners.visibilitychange();
	r.adv.setRefresh(false, 24);
	assert.equal(r.probes.length, 0, 'sample 3: neither the visibility catch-up nor a scheduler re-arm rotates an off schedule');
	r.adv.setRotation(true);
	r.tick();
	assert.equal(r.probes.length, 0, 'switching it back on does not rotate at once');
	clock += 6 * MIN;
	r.tick();
	assert.equal(r.url(), ROT_B, 'one interval later it rotates');
});

// ─────────────────────────────────────────────────────────────────────────────
// Wallpaper rotation over a local folder (issue #61, local photos). The browser
// half asks the host half for the folder's images, so these cases run the REAL
// host route (lib/index.js behind a real HTTP server) over a real directory, and
// give the sandbox a `fetch` that talks to it: the client never sees a mock of the
// thing it depends on.
// ─────────────────────────────────────────────────────────────────────────────
const nodeFs = require('node:fs');
const nodeHttp = require('node:http');
const nodeOs = require('node:os');
const nodePath = require('node:path');
const FOLDER_KEY = 'dsh-dream-skin:wallpaper-folder';
const FOLDER_URL_RE = /^dream-skin\/api\/folder\/file\?name=([^&]+)&v=\d+-\d+$/;

const until = async (check, label, ms = 3000) => {
	const end = Date.now() + ms;
	for (;;) {
		const value = check();
		if (value) return value;
		if (Date.now() > end) assert.fail('timed out waiting for: ' + label);
		await sleep(10);
	}
};

/** A real host route over a real photo folder. Each name becomes a file with its own bytes. */
async function startFolderHost(t, names = ['a.png', 'b.png', 'c.png']) {
	const { apply } = await import('../lib/index.js');
	const root = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'dream-client-folder-'));
	const home = nodePath.join(root, 'home');
	const photos = nodePath.join(root, 'photos');
	nodeFs.mkdirSync(home);
	nodeFs.mkdirSync(photos);
	const realHome = process.env.DSH_HOME;
	process.env.DSH_HOME = home;
	let route = null;
	apply({ effect: (fn) => fn(), get: () => undefined, webServer: { register: (r) => { route = r; return () => {}; } } });
	const server = nodeHttp.createServer((req, res) => { route.handler(req, res); });
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const port = server.address().port;
	const write = (name, shade) => nodeFs.writeFileSync(nodePath.join(photos, name), Buffer.from([0x89, 0x50, 0x4e, 0x47, shade, shade, shade]));
	names.forEach((n, i) => write(n, i + 1));
	nodeFs.writeFileSync(nodePath.join(home, 'dream-skin.json'), JSON.stringify({ [FOLDER_KEY]: photos }));
	t.after(() => {
		server.close();
		server.closeAllConnections?.();
		if (realHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = realHome;
		nodeFs.rmSync(root, { recursive: true, force: true });
	});
	const gate = { hold: null, held: 0, listCalls: 0 };
	/** The sandbox's fetch: real HTTP to the real route; a folder-list can be held in flight. */
	const hostFetch = async (url, init) => {
		if (init && typeof init.body === 'string' && init.body.includes('folder-list')) {
			gate.listCalls++;
			if (gate.hold) { gate.held++; await gate.hold; }
		}
		return fetch(new URL(url, `http://127.0.0.1:${port}`), init);
	};
	return {
		root, home, photos, port, write, gate, hostFetch,
		stateFile: () => JSON.parse(nodeFs.readFileSync(nodePath.join(home, 'dream-skin.json'), 'utf8')),
		get: (link) => fetch(new URL(link, `http://127.0.0.1:${port}/`))
	};
}

/** Boot the plugin in folder mode against `host`, with the folder saved and rotation switched on. */
function bootFolder(host, { current = null, rotation = {}, kind = 'url', mode = 'ok', fetch: fetchImpl, setTimeout: timeoutImpl, visibility, date, seed = {} } = {}) {
	return bootRotation({
		urls: [], current, kind, mode, visibility, date, fetch: fetchImpl || host.hostFetch, setTimeout: timeoutImpl,
		rotation: rotation === null ? null : { source: 'folder', ...rotation },
		seed: { [FOLDER_KEY]: host.photos, ...seed }
	});
}
const folderName = (url) => decodeURIComponent((FOLDER_URL_RE.exec(url) || [])[1] || '');

test('folder rotation: a due rotation lists the folder through the real host, shows the next image by its host link, and the link serves that file', async (t) => {
	const host = await startFolderHost(t, ['img2.png', 'img10.png', 'IMG1.png']);
	const r = bootFolder(host, { rotation: { lastRotatedAt: 0 } });
	// Sample 1: with no current folder image, the order starts at the top, in human order.
	await until(() => r.url() !== null && FOLDER_URL_RE.test(r.url() || ''), 'a folder image link');
	assert.equal(folderName(r.url()), 'IMG1.png', 'img2 sorts before img10, and the first rotation starts at the top');
	assert.ok(FOLDER_URL_RE.test(r.url()), 'the stored link has exactly the folder-image shape: ' + r.url());
	assert.ok(/[?&]t=\d{13}$/.test(r.probes[0].url), 'it was probed with the stamp: ' + r.probes[0].url);
	assert.equal(r.rendered(), r.probes[0].url, 'and that is the URL that is painted');
	assert.equal(r.history().length, 0, 'a rotation never writes the wallpaper history');
	// The link is not decoration: asking the host for it returns that very file.
	const served = await host.get(r.url());
	assert.equal(served.status, 200);
	assert.ok(Buffer.from(await served.arrayBuffer()).equals(nodeFs.readFileSync(nodePath.join(host.photos, 'IMG1.png'))), 'the link serves the image it names');
	// Sample 2: the cursor is the showing image: next, next, wrap.
	const seen = [];
	for (let i = 0; i < 3; i++) {
		const before = r.url();
		await r.adv.rotateNow();
		await until(() => r.url() !== before, 'the next image');
		seen.push(folderName(r.url()));
	}
	assert.deepEqual(seen, ['img2.png', 'img10.png', 'IMG1.png'], 'human order, wrapping');
	assert.equal(r.cfg().source, 'folder', 'the source is stored');
});

test('folder rotation: a photo added to the folder joins the rotation with no setting change, and a removed one is gone', async (t) => {
	const host = await startFolderHost(t, ['a.png', 'b.png']);
	const r = bootFolder(host, { rotation: { lastRotatedAt: Date.now() } });
	const rotate = async () => { const before = r.url(); await r.adv.rotateNow(); await until(() => r.url() !== before, 'next image'); return folderName(r.url()); };
	assert.equal(await rotate(), 'a.png');
	assert.equal(await rotate(), 'b.png');
	host.write('c.png', 9);
	assert.equal(await rotate(), 'c.png', 'sample 1: the photo added after boot is the very next one, with no setting touched');
	assert.equal(await rotate(), 'a.png', 'sample 2: and the order wraps around it');
	nodeFs.rmSync(nodePath.join(host.photos, 'b.png'));
	const after = [];
	for (let i = 0; i < 3; i++) after.push(await rotate());
	assert.ok(!after.includes('b.png'), 'a deleted photo is never shown again: ' + after.join(','));
});

test('folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it', async (t) => {
	const host = await startFolderHost(t);
	const good = 'dream-skin/api/folder/file?name=a.png&v=7-1700000000000';
	// Render gate: the exact shape paints (cache-busted); look-alikes paint nothing.
	const paint = (url) => {
		const r = bootRotation({ urls: [], current: url, rotation: null, fetch: host.hostFetch });
		return r;
	};
	const shown = paint(good);
	assert.ok(/url\("dream-skin\/api\/folder\/file\?name=a\.png&v=7-1700000000000"\)/.test(shown.g.main().style.backgroundImage), 'the exact shape paints: ' + shown.g.main().style.backgroundImage);
	const lookalikes = [
		'dream-skin/api/folder/file?name=../x.png&v=1-1', 'dream-skin/api/folder/file?name=..%2Fx.png&v=1-1',
		'/dream-skin/api/folder/file?name=a.png&v=1-1', '//evil.example/x.png', 'dream-skin/api/folder/file?name=a.png&v=1-1&extra=1',
		'dream-skin/api/folder/file?name=a.png', 'dream-skin/api/folder/other?name=a.png&v=1-1', 'dream-skin/api/folder/file?name=%2e%2e&v=1-1',
		'dream-skin/api/folder/file?name=a.png&v=x-1', 'dream-skin/api/folder/file?name=%00.png&v=1-1', 'dream-skin/api/folder/file?name=.hidden.png&v=1-1',
		'dream-skin/api/folder/file?name=' + 'a'.repeat(700) + '&v=1-1'
	];
	for (const url of lookalikes) {
		const r = bootRotation({ urls: [], current: url, rotation: null, fetch: host.hostFetch });
		assert.throws(() => r.g.main(), /exactly one live wallpaper layer/, 'a look-alike paints nothing: ' + url.slice(0, 70));
	}
	// The typed box and the list box keep their own gate: the folder shape is not a link a user can type.
	const typed = bootRotation({ urls: [], current: ROT_A, rotation: null, fetch: host.hostFetch });
	typed.adv.setUrl(good);
	assert.equal(typed.url(), ROT_A, 'the typed box refuses a folder link');
	assert.deepEqual(typed.alerts, ['bg2.urlInvalid']);
	typed.adv.setRotationList(good + '\n' + ROT_B);
	assert.deepEqual(typed.cfg().urls, [ROT_B], 'and so does the link list: only the real link survives');
	// Host adoption: a folder link in the host state is adopted, a look-alike is not.
	nodeFs.writeFileSync(nodePath.join(host.home, 'dream-skin.json'), JSON.stringify({ [FOLDER_KEY]: host.photos, 'dsh-dream-skin:wallpaper-url': good }));
	const adopt = bootRotation({ urls: [], current: ROT_A, rotation: null, fetch: host.hostFetch });
	await until(() => adopt.url() === good, 'the folder link adopted from the host state');
	nodeFs.writeFileSync(nodePath.join(host.home, 'dream-skin.json'), JSON.stringify({ [FOLDER_KEY]: host.photos, 'dsh-dream-skin:wallpaper-url': lookalikes[0] }));
	const refuse = bootRotation({ urls: [], current: ROT_A, rotation: null, fetch: host.hostFetch });
	await sleep(150);
	assert.equal(refuse.url(), ROT_A, 'a look-alike in the host state is not adopted');
});

test('folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained and never switched on', async (t) => {
	const host = await startFolderHost(t, ['a.png', 'b.png']);
	const other = nodePath.join(host.root, 'other');
	nodeFs.mkdirSync(other);
	for (const [i, n] of ['x.png', 'y.png', 'z.png'].entries()) nodeFs.writeFileSync(nodePath.join(other, n), Buffer.from([1, 2, 3, i]));
	const r = bootFolder(host, { rotation: { on: 0, lastRotatedAt: Date.now() } });
	await sleep(60);
	const view = () => r.h.storeStates['dream-skin-wallpaper-advanced'].rotation;
	// The host's state file still names the OLD folder (2 images). Saving the new one must make the
	// listing see the NEW one (3 images): the write is debounced, so the save has to flush it first.
	const answer = await r.adv.setRotationFolder(other);
	assert.equal(answer.files.length, 3, 'sample 1: the listing is of the folder just saved, not the one the host file held');
	assert.equal(host.stateFile()[FOLDER_KEY], other, 'sample 2: and the host file now names it');
	assert.equal(view().folderCount, 3, 'the settings row is told the count');
	assert.equal(view().folderError, null);
	// Blank saves change nothing (R13).
	await r.adv.setRotationFolder('   ');
	assert.equal(r.h.localStorage.getItem(FOLDER_KEY), other, 'a blank box keeps the folder');
	// A path that cannot be a path is refused outright, before it reaches storage or the host.
	for (const bad of ['x'.repeat(2000), '/tmp/\u0001bad', '/tmp/new\nline']) {
		r.alerts.length = 0;
		assert.equal(await r.adv.setRotationFolder(bad), null, 'refused');
		assert.deepEqual(r.alerts, ['bg2.rotationFolderInvalid'], 'and said so');
		assert.equal(r.h.localStorage.getItem(FOLDER_KEY), other, 'the saved folder is untouched');
	}
	// Each unusable folder is explained with its own code, and a switch-on is refused without being stored.
	for (const [path, code] of [[nodePath.join(host.root, 'nope'), 'folder-missing'], ['relative/dir', 'folder-not-absolute'], [nodePath.join(host.photos, 'a.png'), 'folder-not-directory']]) {
		await r.adv.setRotationFolder(path);
		assert.equal(view().folderError, code, `${code} is reported`);
		r.alerts.length = 0;
		await r.adv.setRotationSource('folder');
		await r.adv.setRotation(true);
		assert.deepEqual(r.alerts, [({ 'folder-missing': 'bg2.rotationFolderMissing', 'folder-not-absolute': 'bg2.rotationFolderNotAbsolute', 'folder-not-directory': 'bg2.rotationFolderNotDirectory' })[code]], `${code}: the refusal says why`);
		assert.equal(r.cfg().on, 0, `${code}: and the switch was not stored as on`);
	}
	// One image is not a rotation either.
	const lone = nodePath.join(host.root, 'lone');
	nodeFs.mkdirSync(lone);
	nodeFs.writeFileSync(nodePath.join(lone, 'only.png'), Buffer.from([1]));
	await r.adv.setRotationFolder(lone);
	r.alerts.length = 0;
	await r.adv.setRotation(true);
	assert.deepEqual(r.alerts, ['bg2.rotationNeedTwo'], 'a folder with a single image cannot be rotated');
	assert.equal(r.cfg().on, 0);
	// A valid folder switches on, and starts a fresh interval.
	await r.adv.setRotationFolder(other);
	r.alerts.length = 0;
	await r.adv.setRotation(true);
	assert.deepEqual(r.alerts, [], 'a usable folder is accepted silently');
	assert.equal(r.cfg().on, 1, 'and stored as on');
	assert.equal(r.probes.length, 0, 'without rotating the instant it is enabled');
	// Shrinking the pool under a running schedule switches it off.
	for (const n of ['y.png', 'z.png']) nodeFs.rmSync(nodePath.join(other, n));
	r.alerts.length = 0;
	await r.adv.setRotationFolder(other);
	assert.equal(r.cfg().on, 0, 'a folder that can no longer supply two images switches the schedule off');
	assert.deepEqual(r.alerts, ['bg2.rotationNeedTwo']);
});

test('folder rotation: no host means no rotation, a spent interval and a stated reason — the wallpaper stays', async (t) => {
	const host = await startFolderHost(t);
	let calls = 0;
	const down = async () => { calls++; throw new Error('connection refused'); };
	const r = bootFolder(host, { current: 'dream-skin/api/folder/file?name=a.png&v=1-1', rotation: { lastRotatedAt: 0 }, fetch: down });
	await until(() => r.cfg().lastRotatedAt > 0, 'the interval to be spent');
	assert.equal(r.url(), 'dream-skin/api/folder/file?name=a.png&v=1-1', 'the current wallpaper is kept');
	assert.equal(r.probes.length, 0, 'nothing was probed');
	const view = r.h.storeStates['dream-skin-wallpaper-advanced'].rotation;
	assert.equal(view.folderError, 'host-unreachable', 'the row is told why');
	const before = calls;
	r.tick();
	r.tick();
	await sleep(40);
	assert.equal(calls, before, 'later ticks inside the interval do not ask again');
	r.alerts.length = 0;
	await r.adv.rotateNow();
	assert.deepEqual(r.alerts, ['bg2.rotationFolderHostDown'], 'an explicit "next now" says the host is unreachable');
});

test('folder rotation: a listing still in flight when the plugin is torn down, re-armed or switched off must not write', async (t) => {
	// CONTRIBUTING rule 1: the resource is caught IN FLIGHT — the host's answer is held pending.
	const host = await startFolderHost(t);
	const hold = () => { let release; host.gate.hold = new Promise((resolve) => { release = resolve; }); host.gate.held = 0; return () => { host.gate.hold = null; release(); }; };
	// Teardown.
	let release = hold();
	const r1 = bootFolder(host, { rotation: { lastRotatedAt: 0 } });
	await until(() => host.gate.held === 1, 'the listing to be in flight');
	assert.equal(r1.url(), null, 'sample 1: nothing is committed while the listing is pending');
	const before = r1.h.localStorage.getItem('dsh-dream-skin:wallpaper-rotation');
	r1.unmount();
	release();
	await sleep(120);
	assert.equal(r1.url(), null, 'sample 2: the late answer of an unmounted plugin paints nothing');
	assert.equal(r1.h.localStorage.getItem('dsh-dream-skin:wallpaper-rotation'), before, 'and records no phase');
	// Switching off.
	release = hold();
	const r2 = bootFolder(host, { rotation: { lastRotatedAt: 0 } });
	await until(() => host.gate.held === 1, 'the second listing to be in flight');
	await r2.adv.setRotation(false);
	release();
	await sleep(120);
	assert.equal(r2.url(), null, 'switching it off while the host is answering stops the rotation');
	assert.equal(r2.probes.length, 0, 'no preload was started from the late answer');
	// Re-arm: a settings action restarts the scheduler; the old listing is dropped, the fresh one commits.
	release = hold();
	const r3 = bootFolder(host, { rotation: { lastRotatedAt: 0 } });
	await until(() => host.gate.held === 1, 'the third listing to be in flight');
	r3.adv.setRefresh(false, 24);
	await until(() => host.gate.held === 2, 'the re-armed scheduler to ask again');
	release();
	await until(() => r3.url() !== null && FOLDER_URL_RE.test(r3.url()), 'the fresh listing to commit');
	assert.equal(r3.probes.length, 1, 'exactly one preload: the abandoned listing started none');
});

test('folder rotation: dead images are skipped within a bounded attempt, and a failed rotation still spends its interval', async (t) => {
	const host = await startFolderHost(t, ['a.png', 'b.png', 'c.png', 'd.png', 'e.png']);
	const dead = bootFolder(host, { current: null, rotation: { lastRotatedAt: 0 }, mode: 'fail' });
	await until(() => dead.cfg().lastRotatedAt > 0, 'the interval to be spent');
	assert.deepEqual(dead.probes.map((p) => folderName(p.url.split('&t=')[0])), ['a.png', 'b.png', 'c.png'], 'bounded: three candidates in order');
	assert.equal(dead.url(), null, 'the wallpaper was not replaced');
	const calls = host.gate.listCalls;
	dead.tick();
	dead.tick();
	await sleep(40);
	assert.equal(host.gate.listCalls, calls, 'later ticks inside the interval do not list again');
	let n = 0;
	const flaky = bootFolder(host, { rotation: { lastRotatedAt: 0 }, mode: () => (++n === 1 ? 'fail' : 'ok') });
	await until(() => flaky.url() !== null, 'the second image to commit');
	assert.equal(folderName(flaky.url()), 'b.png', 'the dead first image is skipped and the next live one shown');
});

test('folder rotation: switching source, long names, clearing the wallpaper and the sentinel key', async (t) => {
	const host = await startFolderHost(t, ['a.png', 'b.png']);
	// 80 CJK characters: 244 UTF-8 bytes, inside Linux NAME_MAX (255), yet the encoded link exceeds the 700-character cap.
	const long = '八'.repeat(80) + '.png';
	assert.ok(Buffer.byteLength(long) <= 255, 'the fixture name fits every CI filesystem');
	assert.ok(`dream-skin/api/folder/file?name=${encodeURIComponent(long)}&v=0-0`.length > 700, 'the fixture link is over the cap');
	host.write(long, 5);
	const r = bootFolder(host, { rotation: { source: 'links', on: 1, urls: [ROT_A, ROT_B], lastRotatedAt: Date.now() } });
	// Source: whitelisted, a change switches the schedule off, the same source is a no-op.
	await r.adv.setRotationSource('shuffle');
	assert.equal(r.cfg().source, 'links', 'an unknown source is ignored');
	assert.equal(r.cfg().on, 1);
	await r.adv.setRotationSource('links');
	assert.equal(r.cfg().on, 1, 'choosing the current source changes nothing');
	await r.adv.setRotationSource('folder');
	assert.equal(r.cfg().source, 'folder', 'the source is stored');
	assert.equal(r.cfg().on, 0, 'a new pool has not been checked, so the schedule is off until it is enabled again');
	assert.deepEqual(r.cfg().urls, [ROT_A, ROT_B], 'the link list is kept while the folder is in use');
	// A name whose link would exceed the cap is skipped; the others rotate.
	await r.adv.setRotation(true);
	const seen = new Set();
	for (let i = 0; i < 5; i++) { const b = r.url(); await r.adv.rotateNow(); await until(() => r.url() !== b, 'next image'); seen.add(folderName(r.url())); }
	assert.ok(!seen.has(long), 'the over-long name never becomes a link');
	assert.deepEqual([...seen].sort(), ['a.png', 'b.png'], 'the rest rotate');
	// Clearing the wallpaper: schedule off, phase reset, folder and list kept (T3).
	r.adv.clearAll();
	assert.equal(r.cfg().on, 0);
	assert.equal(r.cfg().lastRotatedAt, 0);
	assert.equal(r.h.localStorage.getItem(FOLDER_KEY), host.photos, 'the folder the user typed survives');
	// Sentinel: an upgrader whose only stored preference is the folder keeps their state.
	const fresh = buildSandbox();
	fresh.localStorage.removeItem('dsh-dream-skin:factory-applied');
	fresh.localStorage.setItem(FOLDER_KEY, '/some/folder');
	fresh.factory(makeRequire(makeRuntime().RT)).apply(makeApplyContext(fresh));
	assert.equal(fresh.localStorage.getItem('dsh-dream-skin:skin'), null, 'no factory skin pushed onto the upgrader');
	assert.equal(fresh.localStorage.getItem(FOLDER_KEY), '/some/folder', 'their folder survives');
});

test('folder rotation: a host that never answers is given up on after the deadline, the request is aborted, and the interval is spent', async (t) => {
	const host = await startFolderHost(t);
	const deadlines = [];
	const realSetTimeout = setTimeout;
	// Only the 15 s listing deadline is captured; every other timer (the debounced host push) stays real.
	const timers = (fn, ms, ...rest) => (ms === 15000 ? (deadlines.push(fn), 0) : realSetTimeout(fn, ms, ...rest));
	let aborted = false;
	const hung = (url, init) => new Promise((resolve, reject) => {
		if (init && typeof init.body === 'string' && init.body.includes('folder-list')) {
			init.signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); });
			return;
		}
		host.hostFetch(url, init).then(resolve, reject);
	});
	const r = bootFolder(host, { rotation: { lastRotatedAt: 0 }, fetch: hung, setTimeout: timers });
	await until(() => deadlines.length === 1, 'the listing deadline to be armed');
	assert.equal(r.cfg().lastRotatedAt, 0, 'sample 1: while the host is silent nothing is spent or committed');
	deadlines[0]();
	await until(() => r.cfg().lastRotatedAt > 0, 'the interval to be spent after the deadline');
	assert.equal(aborted, true, 'sample 2: the pending request was aborted');
	assert.equal(r.h.storeStates['dream-skin-wallpaper-advanced'].rotation.folderError, 'host-unreachable', 'and reported as unreachable');
});

// ── subfolders and folder-by-folder order ────────────────────────────────────
// People keep one folder per person. The host lists three levels of real
// subfolders, and a sequential rotation plays the folder through, then each
// subfolder by name.

/** Write `rel` (a relative path, subfolders created) into the host's photo folder. */
const putPhoto = (host, rel, shade) => {
	nodeFs.mkdirSync(nodePath.dirname(nodePath.join(host.photos, rel)), { recursive: true });
	nodeFs.writeFileSync(nodePath.join(host.photos, rel), Buffer.from([0x89, 0x50, 0x4e, 0x47, shade, shade, shade]));
};

test('folder subfolders: sequential rotation plays the folder, then each subfolder by name, and each link serves its file', async (t) => {
	const host = await startFolderHost(t, ['r.png']);
	putPhoto(host, 'Bella/b.png', 2);
	putPhoto(host, 'Anna/a2.png', 3);
	putPhoto(host, 'Anna/a1.png', 4);
	putPhoto(host, 'Anna/Beach/s.png', 5);
	const r = bootFolder(host, { rotation: { lastRotatedAt: Date.now() } });
	const seen = [];
	for (let i = 0; i < 6; i++) {
		const before = r.url();
		await r.adv.rotateNow();
		await until(() => r.url() !== before, 'the next image');
		seen.push(folderName(r.url()));
	}
	assert.deepEqual(seen, ['r.png', 'Anna/a1.png', 'Anna/a2.png', 'Anna/Beach/s.png', 'Bella/b.png', 'r.png'], 'folder by folder, by name, wrapping');
	assert.ok(r.probes.some((p) => /name=Anna%2FBeach%2Fs\.png&/.test(p.url)), 'the separator travels percent-encoded');
	const served = await host.get(r.probes.find((p) => p.url.includes('Beach')).url);
	assert.equal(served.status, 200, 'a subfolder link serves its file');
	assert.ok(Buffer.from(await served.arrayBuffer()).equals(nodeFs.readFileSync(nodePath.join(host.photos, 'Anna', 'Beach', 's.png'))));
});

test('folder subfolders: the render gate takes a relative path of plain names and nothing near it', async (t) => {
	const host = await startFolderHost(t);
	const paints = (name) => {
		const r = bootRotation({ urls: [], current: `dream-skin/api/folder/file?name=${name}&v=1-1`, rotation: null, fetch: host.hostFetch });
		try { r.g.main(); return true; } catch { return false; }
	};
	for (const name of ['Anna%2Fa.png', 'a%2Fb%2Fc%2Fd.png', '%E6%B2%B3%E5%90%88%2F1.jpg']) assert.equal(paints(name), true, `${name} paints`);
	for (const name of ['a%2F..%2Fb.png', '..%2Fx.png', '%2Fabs.png', 'a%2F%2Fb.png', '.x%2Fy.jpg', 'a%2F.y.jpg', 'a%2F', 'a%2Fb%2Fc%2Fd%2Fe.png', 'a%5Cb.png', 'a%2F%0Ab.png']) {
		assert.equal(paints(name), false, `${name} paints nothing`);
	}
});
