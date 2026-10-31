/**
 * dsh-dream-skin — the storage-failure seam (local debt ④ / Roadmap D3).
 *
 * WHY. Every localStorage write in this plugin is best-effort: the cache is updated first, the
 * host file is pushed second, and a throwing `setItem` (quota full, private mode, a locked-down
 * WebView) used to be caught and dropped. That is the right call for a plugin that must never
 * break the shell — and it was the wrong call for the user, because "my settings went back
 * after a restart" produced no evidence anywhere: not on screen, not in
 * `window.__DSH_DREAM_SKIN_STATUS__`. A silent fallback is allowed to cost durability. It is not
 * allowed to cost the record.
 *
 * So these cases assert three things: a failed write is NAMED in the diagnostics global, the
 * value still reaches the durable host channel (so the failure is local to localStorage and not
 * a lost preference), and a healthy run leaves the field null — otherwise the new field would be
 * a permanent red that nobody reads.
 *
 * The last case is the eight-dictionary parity gate. This repository keeps being told to "sync
 * all 8 translations" and keeps needing a human to remember it; a key that lands in `zh` only is
 * invisible to every other check in the suite.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('fs');
const path = require('path');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8');
const SETTINGS_IDS = ['zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru'];

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
 * A sandbox whose localStorage can be made to refuse specific keys, the way a real browser does
 * when the quota is gone. `failWrite(key)` returning true makes that write throw.
 */
function buildSandbox({ failWrite = null, seed = {}, code = null } = {}) {
	const body = makeEl();
	const document = { body, createElement: () => makeEl(), createTextNode: () => ({}), querySelector: () => null, querySelectorAll: () => [], head: makeEl() };
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
	let factory = null;
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
		console, location: loc, history: { replaceState() {} },
		btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
		atob: (s) => Buffer.from(s, 'base64').toString('binary'),
		unescape: (s) => s, escape: (s) => s,
		encodeURIComponent, decodeURIComponent,
		TextEncoder, TextDecoder,
		URL: Object.assign(URL, { createObjectURL: () => 'blob:x', revokeObjectURL() {} }),
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
	vm.runInContext((code || CODE) + '\nwindow.__LOGGED__=1;', context);
	return {
		factory, localStorage, sent, refused, window: sandbox.window,
		getItem: (k) => store.get(k)
	};
}

// `useEffect` is here because the settings rows subscribe to a media query (the responsive
// tiers): a component this sandbox actually renders must be handed the same React surface the
// browser does, or the render throws instead of the case failing on a fact.
const REACT = { useRef: () => ({ current: {} }), useMemo: (f) => (typeof f === 'function' ? f() : f), useState: (init) => [init, () => {}], useEffect: () => {} };
const RT = { defineStore: (d) => ({ spec: d, create() {} }) };

/**
 * `opts.nodes` turns the JSX stub into a RECORDER: every `jsx()/jsxs()` call becomes
 * `{ type, props, key }` instead of `0`. Without it the bundle's whole UI layer compiles to a
 * no-op and the render sites are unfalsifiable — blue team B-03 pointed at exactly that for the
 * storage warning: the field was in the diagnostics global, the string was in 8 dictionaries, and
 * no test could see whether the row the user is supposed to read was ever produced.
 */
function makeRequire({ storeMissing = false, nodes = null } = {}) {
	const jsx = (type, props, key) => {
		if (!nodes) return 0;
		const node = { type, props: props || {}, key };
		nodes.push(node);
		return node;
	};
	return (s) => {
		if (s === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
		if (s === 'react') return REACT;
		if (s === '@deepseek-ai/dsh-client-store' || s === '@deepseek-ai/dsh-client-runtime/client') {
			if (storeMissing) throw new Error('client-modules: require("' + s + '") missed the module table');
			return RT;
		}
		throw new Error('unexpected require: ' + s);
	};
}

function makeApplyContext(harness) {
	const theme = {
		register() { return () => {}; },
		setTheme() {},
		getTheme() { return { preference: 'system', active: { id: 'dark', colorScheme: 'dark', tokens: {} }, themes: [], revision: 1 }; },
		overrideTokens() { return () => {}; }
	};
	return {
		theme,
		slots: {
			inject(n, f) { f(); },
			// The host signature is register(descriptor, Component); the Component is what a render
			// gate needs, so it is kept next to the descriptor rather than dropped on the floor.
			register(desc, Component) {
				if (typeof Component === 'function') {
					(harness.registered || (harness.registered = [])).push({ desc, Component });
				}
				if (typeof desc.inject === 'function') {
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

/**
 * Render one registered row into the recorder. `nodes` is the array the bundle's JSX calls were
 * handed at evaluation time (see `makeRequire({ nodes })`), so a render is bracketed by a mark and
 * everything appended after it is that render's tree — which is also why two renders of the same
 * component can be told apart.
 */
function render(harness, nodes, id, state, propsOverride) {
	const found = (harness.registered || []).filter((r) => r.desc.id === id);
	assert.equal(found.length, 1, `the bundle registers exactly one row with id "${id}"`);
	const mark = nodes.length;
	found[0].Component(Object.assign({
		t: (k) => k,
		setWallpaper: () => {},
		applyFromHistory: () => {},
		useStore: (sel) => sel(state)
	}, propsOverride || {}));
	return nodes.slice(mark);
}

/**
 * Does this render contain a node whose text is `want`? The recorder already holds EVERY node the
 * render produced (children are built before their parent's `jsx()` call returns), so a flat scan
 * is the whole traversal — and `hasText` on a tree that forgot to record a level would be a gate
 * that passes by accident.
 */
function hasText(nodes, want) {
	return nodes.some((node) => {
		const c = node.props && node.props.children;
		if (typeof c === 'string') return c === want;
		if (Array.isArray(c)) return c.some((x) => typeof x === 'string' && x === want);
		return false;
	});
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 450));
const status = (h) => h.window.__DSH_DREAM_SKIN_STATUS__;

test('a refused localStorage write is NAMED in the diagnostics global instead of vanishing', async () => {
	// The whole point: the failure has to leave a trace a script can read. Accent colour is a
	// cheap key to refuse — it is written by a user action, not by a factory seed.
	const h = buildSandbox({ failWrite: (k) => k === 'dsh-dream-skin:accent' });
	const e = h.factory(makeRequire());
	const ctx = makeApplyContext(h);
	e.apply(ctx);
	await flush();
	assert.equal(status(h).status, 'ready', 'the skin itself must still come up');
	assert.equal(status(h).storageError, null, 'nothing has failed yet, so the field must be null — not undefined, not a stale object');
	h.actionBags['dream-skin-accent'].setAccent('#123456');
	await flush();
	const err = status(h).storageError;
	assert.ok(err, 'the refusal has to surface');
	assert.equal(err.key, 'dsh-dream-skin:accent', 'it names WHICH key could not be written');
	assert.match(err.message, /QuotaExceeded/, 'and carries the engine message, not a paraphrase');
	assert.ok(typeof err.at === 'number' && err.at > 0, 'with a timestamp, so "when did I lose my settings" is answerable');
	assert.deepEqual(h.refused, ['dsh-dream-skin:accent'], 'exactly one write was refused — the rest of the page still persists');
});

test('the refused preference still reaches the durable host channel, so the loss is local', async () => {
	// The reason this is a "degraded" state and not a data-loss bug: on desktop the host file
	// (~/.dsh/dream-skin.json) is the durable layer, and it is written through a different door.
	// If the push ever shared the localWrite failure, the user would really lose the value — and
	// this assertion is what notices.
	const h = buildSandbox({ failWrite: (k) => k === 'dsh-dream-skin:accent' });
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await flush();
	h.actionBags['dream-skin-accent'].setAccent('#123456');
	await flush();
	const pushed = h.sent.sets.flatMap((p) => Object.keys(p));
	assert.ok(pushed.includes('dsh-dream-skin:accent'),
		`the value still has to leave the page: pushed ${JSON.stringify(h.sent.sets)}`);
});

test('a healthy session reports storageError: null on BOTH snapshot shapes', async () => {
	const h = buildSandbox();
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await flush();
	assert.equal(status(h).storageError, null, 'ready snapshot');
	// The degraded path writes its snapshot inline (the full publishStatus never runs when the
	// host seeds are gone), so it needs its own read — this is the B-3 field-set rule again.
	const d = buildSandbox();
	const de = d.factory(makeRequire({ storeMissing: true }));
	assert.ok(de, 'the degraded path still returns a module');
	const snap = status(d);
	assert.ok(snap, 'a degraded boot still publishes a snapshot');
	assert.equal(snap.status, 'degraded', 'this is the seed-gate shape');
	assert.ok('storageError' in snap, 'the degraded snapshot must carry the same key, or strict consumers hit undefined on one side only');
	assert.equal(snap.storageError, null, 'and it starts out null, not undefined');
});

test('the wallpaper history is capped in ENTRIES and separately in BYTES', async () => {
	// Five entries used to be the whole policy, and the entry count is not what fills a quota:
	// a 2MB photo base64-inflates to ~2.7M characters, so five of them is ~13MB against a 5MB
	// origin budget. Seeded here as five 600K-character entries — under the entry cap, over the
	// byte cap — then one real user action (switching skin auto-applies that skin's gradient).
	const big = (ch) => ({ kind: "image", value: "data:image/jpeg;base64," + ch.repeat(600000) });
	const seeded = [big("A"), big("B"), big("C"), big("D"), big("E")];
	const h = buildSandbox({ seed: { "dsh-dream-skin:wallpaper-history": JSON.stringify(seeded) } });
	const e = h.factory(makeRequire());
	const ctx = makeApplyContext(h);
	e.apply(ctx);
	await flush();
	h.actionBags["dream-skin"].setSkin("abyss");
	await flush();
	const raw = h.getItem("dsh-dream-skin:wallpaper-history");
	assert.ok(raw, "the history key is still written — pruning is not the same as giving up");
	const list = JSON.parse(raw);
	assert.ok(raw.length <= 2000000, `the payload must fit the byte budget, got ${raw.length} characters`);
	assert.equal(list[0].kind, "gradient", "the entry the user just chose survives and stays first");
	assert.ok(list.length < seeded.length, "and the oldest oversized ones are the ones that went");
	// The `keep.length > 1` guard: pruning may never empty the list. A history of one wallpaper
	// that is itself over budget still gets written (and `localWrite` reports it if the browser
	// refuses even that), because "you lost your current wallpaper" is worse than "you lost a
	// recent one".
	const single = buildSandbox({ seed: { "dsh-dream-skin:wallpaper-history": JSON.stringify([big("A")]) } });
	const se = single.factory(makeRequire());
	se.apply(makeApplyContext(single));
	await flush();
	single.actionBags["dream-skin"].setSkin("midnight");
	await flush();
	const one = JSON.parse(single.getItem("dsh-dream-skin:wallpaper-history"));
	assert.ok(Array.isArray(one) && one.length >= 1, "the list is never pruned to nothing");
});

const count = (hay, needle) => hay.split(needle).length - 1;
function mutate(needle, replacement) {
	assert.equal(count(CODE, needle), 1,
		`mutation target must occur exactly once in the bundle, found ${count(CODE, needle)}: ${needle}`);
	return CODE.replace(needle, replacement);
}

/** The key list of one settings dictionary, taken from any bundle text (the gate and its reverse
 *  leg have to read the SAME extractor or the reverse leg tests nothing). */
function dictKeys(source, id) {
	const m = source.match(new RegExp('\\t\\tconst ' + id + ' = \\{([\\s\\S]*?)\\n\\t\\t\\};'));
	return m ? [...m[1].matchAll(/^\t{3}"([^"]+)":/gm)].map((x) => x[1]).sort() : null;
}

/** The literal value one dictionary gives a key, or null. */
function dictLine(source, id, key) {
	const m = source.match(new RegExp('\\t\\tconst ' + id + ' = \\{([\\s\\S]*?)\\n\\t\\t\\};'));
	if (!m) return null;
	const line = m[1].match(new RegExp('^\\t{3}"' + key.replace('.', '\\.') + '": "(.+)",$', 'm'));
	return line ? line[1] : null;
}

// ── Roadmap D2: the「图片链接」empty state, asserted in the same render harness ─────────────
// This case lives next to the quota-warning case because that is where the JSX-recording harness
// is; the seam they share is "what the settings page tells the user", not localStorage. Moving
// the harness into tests/fixtures/ is a refactor with its own risk and is deliberately NOT
// smuggled into this round.
test('the empty image-link tab says why the background is blank, and stays quiet otherwise', async () => {
	const h = buildSandbox();
	const nodes = [];
	const e = h.factory(makeRequire({ nodes }));
	e.apply(makeApplyContext(h));
	await flush();

	// The state the report reaches by doing nothing: pick the tab, the wallpaper is absent,
	// and until D2 the page said nothing about why.
	let seen = render(h, nodes, 'dream-skin-wallpaper-advanced', { kind: 'url', url: null, gradient: null, history: [] });
	assert.ok(hasText(seen, 'bg2.urlEmpty'), 'the empty url tab has to explain the blank background');

	// Reverse legs. A hint that cannot switch off is noise, and noise is how the next real
	// warning gets ignored — the same shape as the storage.hint pair above.
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', { kind: 'url', url: 'https://example.com/w.jpg', gradient: null, history: [] });
	assert.equal(hasText(seen, 'bg2.urlEmpty'), false, 'a tab that HAS a link must not claim it is empty');
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', { kind: 'image', url: null, gradient: null, history: [] });
	assert.equal(hasText(seen, 'bg2.urlEmpty'), false, 'the local-image tab is not this tab and must stay silent');

	// ① the row never renders (silent degradation restored)
	const never = CODE.replace('!url ? NoteLine({ text: t("bg2.urlEmpty")', 'false ? NoteLine({ text: t("bg2.urlEmpty")');
	assert.notEqual(never, CODE, 'mutation ① has to change the bundle');
	const h1 = buildSandbox({ code: never });
	const n1 = [];
	h1.factory(makeRequire({ nodes: n1 })).apply(makeApplyContext(h1));
	await flush();
	assert.equal(hasText(render(h1, n1, 'dream-skin-wallpaper-advanced', { kind: 'url', url: null, gradient: null, history: [] }), 'bg2.urlEmpty'), false,
		'① with the guard forced false the row disappears — this is the failure the gate exists to see');

	// ② the row always renders (a warning nobody can turn off)
	const always = CODE.replace('!url ? NoteLine({ text: t("bg2.urlEmpty")', 'true ? NoteLine({ text: t("bg2.urlEmpty")');
	assert.notEqual(always, CODE, 'mutation ② has to change the bundle');
	const h2 = buildSandbox({ code: always });
	const n2 = [];
	h2.factory(makeRequire({ nodes: n2 })).apply(makeApplyContext(h2));
	await flush();
	assert.ok(hasText(render(h2, n2, 'dream-skin-wallpaper-advanced', { kind: 'url', url: 'https://example.com/w.jpg', gradient: null, history: [] }), 'bg2.urlEmpty'),
		'② dropping the empty-value guard warns on a healthy tab, which reddens the reverse leg above');
});


// ── B-03 (blue team 10.10.0): the two halves of the quota story that had no gate ──────────────

test('the quota warning reaches the wallpaper row the user reads, in both directions', async () => {
	// The finding was that this seam had a machine-readable outlet and a translated string and NO
	// evidence the string was ever rendered: every sandbox in this suite stubbed `react/jsx-runtime`
	// as `jsx: () => 0`, so the whole UI layer compiled to a no-op. So the JSX calls are recorded
	// here and the registered row is invoked the way the host invokes it when the panel opens.
	const h = buildSandbox({ failWrite: (k) => k === 'dsh-dream-skin:accent' });
	const nodes = [];
	const e = h.factory(makeRequire({ nodes }));
	e.apply(makeApplyContext(h));
	await flush();

	// Healthy first: a row that always warned would be noise, and a warning nobody can turn off is
	// how the next real one gets ignored.
	const before = nodes.length;
	render(h, nodes, 'dream-skin-wallpaper', { url: null, history: [] });
	assert.ok(nodes.length > before, 'the render produced a tree at all (an empty render proves nothing)');
	assert.equal(hasText(nodes.slice(before), 'storage.hint'), false,
		'a session that lost nothing must not tell the user it lost something');

	h.actionBags['dream-skin-accent'].setAccent('#123456');
	await flush();
	assert.ok(status(h).storageError, 'the diagnostics global has the failure');
	const after = nodes.length;
	// `t` is a marker function, so the assertion below can only pass if the row goes through the
	// translator — a hard-coded Chinese string would render "storage.hint"-free text and fail here.
	render(h, nodes, 'dream-skin-wallpaper', { url: null, history: [] }, { t: (k) => 'T[' + k + ']' });
	const tree = nodes.slice(after);
	const hintRow = tree.find((n) => {
		const c = n.props && n.props.children;
		return c === 'T[storage.hint]' || (Array.isArray(c) && c.includes('T[storage.hint]'));
	});
	assert.ok(hintRow, 'the refused write has to be visible on the settings page, not only in a global');
	assert.equal(hintRow.type, 'div', 'rendered as a plain hint line');
});

test('mutation: a hint line that never renders is a silent fallback again', async () => {
	const mutated = mutate('lastStorageError ? NoteLine({', 'null ? NoteLine({');
	const h = buildSandbox({ failWrite: (k) => k === 'dsh-dream-skin:accent', code: mutated });
	const nodes = [];
	const e = h.factory(makeRequire({ nodes }));
	e.apply(makeApplyContext(h));
	await flush();
	h.actionBags['dream-skin-accent'].setAccent('#123456');
	await flush();
	const mark = nodes.length;
	render(h, nodes, 'dream-skin-wallpaper', { url: null, history: [] }, { t: (k) => 'T[' + k + ']' });
	assert.ok(status(h).storageError, 'the failure itself is still recorded (only the row was mutated)');
	assert.equal(hasText(nodes.slice(mark), 'T[storage.hint]'), false,
		'mutation expected: the user sees nothing, which is the defect this round set out to close');
});

test('mutation: a hint line that always renders fails the healthy half', async () => {
	const mutated = mutate('lastStorageError ? NoteLine({', '({}) ? NoteLine({');
	const h = buildSandbox({ code: mutated });
	const nodes = [];
	const e = h.factory(makeRequire({ nodes }));
	e.apply(makeApplyContext(h));
	await flush();
	const mark = nodes.length;
	render(h, nodes, 'dream-skin-wallpaper', { url: null, history: [] }, { t: (k) => 'T[' + k + ']' });
	assert.equal(status(h).storageError, null, 'this session lost nothing');
	assert.ok(hasText(nodes.slice(mark), 'T[storage.hint]'),
		'mutation expected: the warning shows on a healthy page');
});

test('a single wallpaper over the byte budget is still kept, not pruned away', async () => {
	// The `keep.length > 1` floor in `writeWallpaperHistory`. Five entries is the OLD bug (count as
	// a proxy for size); this one is the new risk the byte cap introduces: pruning is allowed to drop
	// history, never the wallpaper the user is looking at. Seeded with ONE 2.1M-character entry
	// against the 2M budget, then re-applied from history — so the survivor has to be the oversized
	// entry itself, which is the only shape where `> 1` and `> 0` differ.
	const huge = 'data:image/jpeg;base64,' + 'B'.repeat(2100000);
	const h = buildSandbox({ seed: { 'dsh-dream-skin:wallpaper-history': JSON.stringify([{ kind: 'image', value: huge }]) } });
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await flush();
	h.actionBags['dream-skin-wallpaper'].applyFromHistory('image', huge);
	await flush();
	const raw = h.getItem('dsh-dream-skin:wallpaper-history');
	assert.ok(raw, 'the key is written even when its value cannot fit');
	const list = JSON.parse(raw);
	assert.equal(list.length, 1, 'the list is never emptied to pay for a budget');
	assert.equal(list[0].value, huge, 'and the entry that survived is the one the user chose');
	assert.ok(raw.length > 2000000, `the written payload really is over budget (${raw.length})`);
});

test('mutation: pruning down to zero drops the current wallpaper to make room for none', async () => {
	const mutated = mutate('while (keep.length > 1 &&', 'while (keep.length > 0 &&');
	const huge = 'data:image/jpeg;base64,' + 'B'.repeat(2100000);
	const h = buildSandbox({
		seed: { 'dsh-dream-skin:wallpaper-history': JSON.stringify([{ kind: 'image', value: huge }]) },
		code: mutated
	});
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await flush();
	h.actionBags['dream-skin-wallpaper'].applyFromHistory('image', huge);
	await flush();
	const raw = h.getItem('dsh-dream-skin:wallpaper-history');
	assert.equal(raw, '[]',
		'mutation expected: the loop eats the last entry too, so the history ends up empty');
});

test('a later write that lands RETRACTS the storage failure (B-01)', async () => {
	// The field is read as "storage is unhealthy NOW" by its name, by the hint row and by any strict
	// tooling. A one-time refusal at boot used to leave it set for the rest of the session, even
	// after every subsequent write succeeded — which is a fabricated current state.
	const h = buildSandbox({ failWrite: (k) => k === 'dsh-dream-skin:accent' });
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await flush();
	h.actionBags['dream-skin-accent'].setAccent('#123456');
	await flush();
	assert.equal(status(h).storageError.key, 'dsh-dream-skin:accent', 'the refusal is recorded');
	h.actionBags['dream-skin'].setSkin('abyss');
	await flush();
	assert.equal(status(h).storageError, null,
		'a successful write has to clear it, or the snapshot reports a fault that no longer exists');
});

test('mutation: without the retraction the snapshot reports a stale fault forever', async () => {
	const mutated = mutate(
		'if (lastStorageError !== null) {\n\t\t\t\t\tlastStorageError = null;\n\t\t\t\t\ttry { publishStatus(); } catch {}\n\t\t\t\t}',
		'/* mutated: a failure is never retracted */');
	const h = buildSandbox({ failWrite: (k) => k === 'dsh-dream-skin:accent', code: mutated });
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await flush();
	h.actionBags['dream-skin-accent'].setAccent('#123456');
	await flush();
	assert.equal(status(h).storageError.key, 'dsh-dream-skin:accent', 'the failure is still recorded');
	h.actionBags['dream-skin'].setSkin('abyss');
	await flush();
	assert.equal(status(h).storageError.key, 'dsh-dream-skin:accent',
		'mutation expected: every later write succeeded and the field still says the page is broken');
});

test('all eight settings dictionaries expose EXACTLY the same keys', () => {
	// Every "remember to add it to the other 7 locales" that ever shipped as a follow-up commit.
	// The check is on the shipped bundle text, so a dictionary that gains a key alone goes red.
	const dicts = {};
	for (const id of SETTINGS_IDS) {
		dicts[id] = dictKeys(CODE, id);
		assert.ok(dicts[id], `the bundle carries no \`${id}\` settings dictionary`);
	}
	for (const id of SETTINGS_IDS) {
		assert.deepEqual(dicts[id], dicts.zh, `${id} has drifted from zh (count ${dicts[id].length} vs ${dicts.zh.length})`);
	}
	// The key this round added, asserted by name: a parity test alone would pass if all eight
	// forgot it, and the render site would then show the raw key to the user.
	assert.ok(dicts.zh.includes('storage.hint'), 'the storage warning needs a string in every locale');
	for (const id of SETTINGS_IDS) {
		const line = dictLine(CODE, id, 'storage.hint');
		assert.ok(line, `${id}: storage.hint must be a non-empty string literal`);
		assert.ok(line.length > 20, `${id}: storage.hint is too short to explain anything (${line})`);
	}
});

test('mutation: dropping storage.hint from ONE dictionary is a red gate, not a silent gap', () => {
	// The parity claim above is only worth what a single-dictionary deletion costs it. Without this
	// reverse leg, "eight dictionaries" is a paragraph about a regex nobody watched fail.
	const mutated = CODE.replace(/(\t\tconst ja = \{[\s\S]*?\n\t{3})"storage\.hint": "[^\n]*\n/, '$1');
	assert.ok(mutated.length < CODE.length,
		'the ja dictionary line has to be findable for this to be a mutation '
		+ `(code length ${CODE.length} → ${mutated.length})`);
	const zh = dictKeys(mutated, 'zh');
	const ja = dictKeys(mutated, 'ja');
	assert.ok(zh.includes('storage.hint'), 'zh still carries it');
	assert.equal(ja.includes('storage.hint'), false, 'ja lost it — which is the whole failure mode');
	assert.notDeepEqual(ja, zh, 'and the parity gate is the thing that notices');
});

test('mutation: the three ways a refusal can still vanish are each caught', async () => {
	// These are the load-bearing legs for §五 of the CHANGELOG: the case that names the refused key
	// is only a gate if breaking the RECORD, the RE-PUBLISH, or the single WRITE DOOR each make it
	// red. Run as one case because they share the setup; each leg asserts the BROKEN behaviour, so
	// a build that silently re-gains the trace shows up here as a mutation that no longer bites.
	const RECORD = 'lastStorageError = {\n\t\t\t\t\tkey,\n\t\t\t\t\tmessage: (e && e.message) || String(e),\n\t\t\t\t\tname: (e && e.name) || null,\n\t\t\t\t\tat: Date.now()\n\t\t\t\t};';
	const REPUBLISH = 'try { publishStatus(); } catch {}\n\t\t\t\treturn false;';
	const DOOR = 'localWrite(key, value);';
	const legs = [
		[RECORD, '/* mutated: the refusal is dropped again */', 'nothing is recorded at all'],
		[REPUBLISH, 'return false;', 'it is recorded but the snapshot is never re-published'],
		[DOOR, 'try { window.localStorage.setItem(key, value); } catch {}', 'writeStorage bypasses the door']
	];
	for (const [needle, replacement, why] of legs) {
		const mutated = mutate(needle, replacement);
		const h = buildSandbox({ failWrite: (k) => k === 'dsh-dream-skin:accent', code: mutated });
		const e = h.factory(makeRequire());
		e.apply(makeApplyContext(h));
		await flush();
		h.actionBags['dream-skin-accent'].setAccent('#123456');
		await flush();
		assert.ok(h.refused.includes('dsh-dream-skin:accent'), `${why}: the write really was attempted`);
		assert.equal(status(h).storageError, null,
			`${why} — this is the leg that used to be a paragraph`);
	}
});

test('mutation: a byte budget of 999999999 keeps the five photos and the quota crash', async () => {
	const mutated = mutate('const WALLPAPER_HISTORY_BUDGET = 2000000;', 'const WALLPAPER_HISTORY_BUDGET = 999999999;');
	const big = (ch) => ({ kind: 'image', value: 'data:image/jpeg;base64,' + ch.repeat(600000) });
	const seeded = [big('A'), big('B'), big('C'), big('D'), big('E')];
	const h = buildSandbox({
		seed: { 'dsh-dream-skin:wallpaper-history': JSON.stringify(seeded) },
		code: mutated
	});
	const e = h.factory(makeRequire());
	e.apply(makeApplyContext(h));
	await flush();
	h.actionBags['dream-skin'].setSkin('abyss');
	await flush();
	const raw = h.getItem('dsh-dream-skin:wallpaper-history');
	assert.ok(raw.length > 2000000,
		`mutation expected: the entry cap alone lets a ${raw.length}-character value through — the number the byte cap exists to stop`);
});


// ── wallpaper rotation controls (issue #61, second observation) ───────────────────────────────
// The behavior is pinned in client.smoke.test.cjs through the action bag; this case pins the
// other half, what the settings page shows and which action each control calls, in the same
// JSX-recording harness as the empty-state case above.
test('the two picture forms show their own controls, and each control calls its own action', async () => {
	const h = buildSandbox();
	const nodes = [];
	h.factory(makeRequire({ nodes })).apply(makeApplyContext(h));
	await flush();
	const calls = [];
	const props = {
		setUrl: (v) => calls.push(['setUrl', v]),
		setRotation: (v) => calls.push(['setRotation', v]),
		setRotationList: (v) => calls.push(['setRotationList', v]),
		setRotationMode: (v) => calls.push(['setRotationMode', v]),
		setRotationMinutes: (v) => calls.push(['setRotationMinutes', v]),
		setRefresh: (on, hours) => calls.push(['setRefresh', on, hours]),
		setAutodim: (v) => calls.push(['setAutodim', v]),
		rotateNow: () => calls.push(['rotateNow'])
	};
	const state = (over) => ({ kind: 'url', url: 'https://example.com/a.jpg', gradient: null, history: [],
		refreshOn: false, refreshHours: 24,
		rotation: { on: true, mode: 'random', minutes: 30, urls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'], source: 'links' }, ...over });
	const find = (seen, pred) => seen.find(pred);
	const switchesIn = (seen) => seen.filter((n) => n.type === 'input' && n.props && n.props.type === 'checkbox');
	const buttonWith = (seen, text) => find(seen, (n) => n.type === 'button' && (n.props.children === text || (Array.isArray(n.props.children) && n.props.children[0] === text)));

	// Sample 1: 图片轮播 (the rotation switch is what arms the form) shows the pool editor
	// and its own interval.
	let seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state(), props);
	for (const key of ['bg2.rotationList', 'bg2.rotationSave', 'bg2.rotationNow', 'bg2.rotationMinutes', 'bg2.rotationSequential', 'bg2.rotationRandom']) {
		assert.ok(hasText(seen, key), `${key} is on the page`);
	}
	const box = find(seen, (n) => n.type === 'textarea');
	assert.ok(box, 'the list is a text box');
	assert.equal(box.props.defaultValue, 'https://example.com/a.jpg\nhttps://example.com/b.jpg', 'it shows the saved list, one link per line');
	const random = find(seen, (n) => n.props && n.props['aria-pressed'] === true && n.props.children && n.props.children[0] === 'bg2.rotationRandom');
	assert.ok(random, 'the stored mode is the pressed one');
	// The box is bounded by the unit it is showing (m01852): 30 minutes opens on 分钟, 1..60.
	const interval = find(seen, (n) => n.type === 'input' && n.props.type === 'number' && n.props.min === 1);
	assert.deepEqual([interval.props.min, interval.props.max, interval.props.value], [1, 60, 30],
		'the interval box shows the stored value, bounded by its unit');

	// Each control reaches its own action. 保存列表 hands the box's draft to the action —
	// this harness has no live input state, so the draft is still empty and nothing arms;
	// the row-side arming is a case-file assertion, where a cell can be pinned.
	buttonWith(seen, 'bg2.rotationSave').props.onClick();
	buttonWith(seen, 'bg2.rotationNow').props.onClick();
	buttonWith(seen, 'bg2.rotationSequential').props.onClick();
	// W11: 图片轮播 carries the shared auto-dim switch and NOT the scheduled-refresh one —
	// that switch belongs to 固定图片, the form the selector is not on here.
	const switches = switchesIn(seen);
	assert.equal(switches.length, 1, '图片轮播 carries the auto-dim switch only, not the refresh one');
	switches[0].props.onChange({ target: { checked: true } });
	assert.deepEqual(calls.map((c) => c[0]), ['setRotationList', 'rotateNow', 'setRotationMode', 'setAutodim'],
		'one action per control, and 保存列表 arms nothing while the box is empty');
	assert.deepEqual(calls[2], ['setRotationMode', 'sequential'], 'the mode button passes its mode');
	assert.deepEqual(calls[3], ['setAutodim', true], 'the auto-dim switch passes the state it was clicked into');

	// Sample 2: 固定图片 — the same link kind with the rotation switch off. The pool editor
	// and every slideshow control are gone, and the refresh pair is what this form owns.
	calls.length = 0;
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({ refreshOn: true, refreshHours: 12, rotation: { on: false, mode: 'sequential', minutes: 60, urls: ['https://example.com/a.jpg'], source: 'links' } }), props);
	assert.equal(hasText(seen, 'bg2.rotationList'), false, '固定图片 has no link list: that box edits the slideshow pool');
	assert.equal(hasText(seen, 'bg2.rotationNow'), false, 'nor a "next now" action');
	assert.equal(hasText(seen, 'bg2.rotationMinutes'), false, 'nor a slideshow interval');
	assert.ok(hasText(seen, 'bg2.refresh'), 'the scheduled-refresh switch is 固定图片\'s own');
	const hours = find(seen, (n) => n.type === 'input' && n.props.type === 'number');
	assert.deepEqual([hours.props.min, hours.props.max, hours.props.value], [1, 720, 12], 'and its hours box shows the stored interval');
	// The link box has ONE 保存 entry and it hands the box's draft to `setUrl` — the draft is
	// empty in this harness (no live input), which is why the assertion is about the ACTION
	// rather than the value.
	buttonWith(seen, 'bg2.apply').props.onClick();
	assert.deepEqual(calls, [['setUrl', '']], 'the link box\'s one 保存 entry reaches the action that writes the link');

	// Other kinds own neither pair: the refresh switch is 图片链接's, and 图片轮播's pool is not a picture kind.
	for (const kind of ['image', 'gradient']) {
		seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({ kind }), props);
		assert.equal(hasText(seen, 'bg2.rotation'), false, `${kind}: no rotation checkbox`);
		assert.equal(hasText(seen, 'bg2.rotationList'), false, `${kind}: no list box`);
		assert.equal(hasText(seen, 'bg2.refresh'), false, `${kind}: no scheduled-refresh switch either`);
	}
	// A state from before the rotation field existed renders as "never configured", not as a crash —
	// and reads back as the 固定图片 form, because a link with no rotation is a fixed picture.
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', { kind: 'url', url: null, gradient: null, history: [] }, props);
	assert.equal(hasText(seen, 'bg2.rotation'), false, 'the rotation switch is gone: the 背景形式 selector carries it');
	assert.equal(find(seen, (n) => n.type === 'select').props.value, 'fixed', 'an old state with no rotation field reads as 固定图片');
});

// ── every rotation string the page asks for is defined ────────────────────────────────────────
// The parity case above proves the eight dictionaries agree with each other; it cannot see a key
// the page asks for that none of them defines (the page would print the raw id).
test('every rotation string the page and its alerts use is defined in the dictionaries', () => {
	const zh = dictKeys(CODE, 'zh');
	assert.ok(zh && zh.length > 50, 'the zh dictionary is readable');
	const used = [...new Set([...CODE.matchAll(/(?:\bt|localeT)\("(bg2\.rotation[A-Za-z]*)"/g)].map((m) => m[1]))];
	assert.ok(used.length >= 10, 'the rotation strings the page and its alerts use were found: ' + used.join(', '));
	for (const key of used) assert.ok(zh.includes(key), `${key} is defined`);
	// m02439 (user): the page raises its OWN toast — AGENTS.md §12 forbids browser-native modals in a
	// web front end, so no rotation path may reach for one any more (it lands on top of the host's own
	// dialogs and ignores the active skin).
	assert.equal(/window\.alert\s*\(/.test(CODE), false, 'the bundle opens no native alert');
	assert.ok(/function announceNotice\(/.test(CODE), 'the toast helper is the one channel left');
});

// ── the rotation source switch and the folder controls ─────────────────────────────────────────
test('the folder controls show for the folder source only, explain each failure code, and each control calls its own action', async () => {
	const h = buildSandbox();
	const nodes = [];
	h.factory(makeRequire({ nodes })).apply(makeApplyContext(h));
	await flush();
	const calls = [];
	const props = {
		setRotation: (v) => calls.push(['setRotation', v]),
		setRotationList: (v) => calls.push(['setRotationList', v]),
		setRotationSource: (v) => calls.push(['setRotationSource', v]),
		setRotationFolder: (v) => calls.push(['setRotationFolder', v]),
		setRotationMode: (v) => calls.push(['setRotationMode', v]),
		setRotationMinutes: (v) => calls.push(['setRotationMinutes', v]),
		rotateNow: () => calls.push(['rotateNow'])
	};
	const rot = (over) => ({ on: true, mode: 'sequential', minutes: 30, urls: [], source: 'folder', folder: '/Users/me/Pictures', folderCount: 12, folderError: null, ...over });
	const state = (over) => ({ kind: 'url', url: null, gradient: null, history: [], rotation: rot(over) });
	const find = (seen, pred) => seen.find(pred);
	const buttonWith = (seen, text) => find(seen, (n) => n.type === 'button' && (n.props.children === text || (Array.isArray(n.props.children) && n.props.children[0] === text)));

	// Sample 1: the folder source shows the path box, its hint, the count, and the shared controls.
	let seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({}), { ...props, t: (k, p) => (p ? `${k}:${p.n}` : k) });
	for (const key of ['bg2.rotationSourceLinks', 'bg2.rotationSourceFolder', 'bg2.rotationFolderHint', 'bg2.rotationFolderSave', 'bg2.rotationFolderCount:12', 'bg2.rotationNow', 'bg2.rotationMinutes']) {
		assert.ok(hasText(seen, key), `${key} is on the page`);
	}
	assert.equal(hasText(seen, 'bg2.rotationList'), false, 'the link list is not shown for the folder source');
	assert.equal(find(seen, (n) => n.type === 'textarea'), undefined, 'and neither is its text box');
	const box = find(seen, (n) => n.type === 'input' && n.props.type === 'text');
	assert.equal(box.props.defaultValue, '/Users/me/Pictures', 'the path box holds the saved folder, keyed by it');
	const pressed = find(seen, (n) => n.type === 'button' && n.props['aria-pressed'] === true && n.props.children && n.props.children[0] === 'bg2.rotationSourceFolder');
	assert.ok(pressed, 'the stored source is the pressed one');
	buttonWith(seen, 'bg2.rotationFolderSave').props.onClick();
	buttonWith(seen, 'bg2.rotationSourceLinks').props.onClick();
	buttonWith(seen, 'bg2.rotationNow').props.onClick();
	assert.deepEqual(calls.map((c) => c[0]), ['setRotationFolder', 'setRotationSource', 'rotateNow'], 'one action per control');
	assert.deepEqual(calls[1], ['setRotationSource', 'links'], 'the source button passes its source');

	// Each failure code is explained with its own string, and an unknown one falls back to the host-down text.
	const codes = { 'folder-unset': 'bg2.rotationFolderUnset', 'folder-not-absolute': 'bg2.rotationFolderNotAbsolute', 'folder-missing': 'bg2.rotationFolderMissing', 'folder-not-directory': 'bg2.rotationFolderNotDirectory', 'folder-unreadable': 'bg2.rotationFolderUnreadable', 'host-unreachable': 'bg2.rotationFolderHostDown', 'something-new': 'bg2.rotationFolderHostDown' };
	for (const [code, key] of Object.entries(codes)) {
		seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({ folderError: code, folderCount: null }), props);
		assert.ok(hasText(seen, key), `${code} reads as ${key}`);
	}
	// Reverse legs: the link source shows the list and no path box; a folder-less state hides the shared controls.
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({ source: 'links', urls: ['https://a.example/1.jpg', 'https://a.example/2.jpg'] }), props);
	assert.ok(hasText(seen, 'bg2.rotationList'), 'links source: the list box is back');
	assert.equal(find(seen, (n) => n.type === 'input' && n.props.type === 'text'), undefined, 'links source: no path box');
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({ folder: '', folderCount: null }), props);
	assert.ok(hasText(seen, 'bg2.rotationNow'), '轮播设置 keeps 切换到下一张 even before a folder is saved — settings-theme-ui.md line 61 puts it in the group, not behind a count');
	assert.ok(hasText(seen, 'bg2.rotationFolderSave'), 'and the box that fixes it survives the empty state — the branch is not a dead end');
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', { ...state({}), kind: 'gradient' }, props);
	assert.equal(hasText(seen, 'bg2.rotationSourceFolder'), false, 'other wallpaper kinds show no source switch');
});

test('every string the folder error map points at is defined in the dictionaries', () => {
	const zh = dictKeys(CODE, 'zh');
	const block = CODE.match(/const FOLDER_ERROR_KEYS = \{([\s\S]*?)\n\t\t\};/);
	assert.ok(block, 'the error map is readable');
	const keys = [...block[1].matchAll(/: "(bg2\.[A-Za-z]+)"/g)].map((m) => m[1]);
	assert.equal(keys.length, 6, 'six codes are mapped');
	for (const key of keys) assert.ok(zh.includes(key), `${key} is defined`);
	const used = [...new Set([...CODE.matchAll(/(?:\bt|localeT)\("(bg2\.rotation[A-Za-z]*)"/g)].map((m) => m[1]))];
	for (const key of used) assert.ok(zh.includes(key), `${key} is defined`);
});

test('the order chips are the design\'s two, and both pool sources read the same', async () => {
	const h = buildSandbox();
	const nodes = [];
	h.factory(makeRequire({ nodes })).apply(makeApplyContext(h));
	await flush();
	assert.equal(CODE.indexOf('bg2.rotationByFolder'), -1,
		'the third order label is gone from the bundle — settings-theme-ui.md line 58 draws 按顺序轮播 / 随机顺序 and nothing else');
	const calls = [];
	const props = {
		setRotation() {}, setRotationList() {}, setRotationSource() {}, setRotationFolder() {}, setRotationMinutes() {}, rotateNow() {},
		setRotationMode: (v) => calls.push(['setRotationMode', v])
	};
	const rot = (over) => ({ on: true, mode: 'sequential', minutes: 30, urls: ['https://a.example/1.jpg', 'https://a.example/2.jpg'], source: 'folder', folder: '/Users/me/Pictures', folderCount: 12, folderError: null, ...over });
	const state = (over) => ({ kind: 'url', url: null, gradient: null, history: [], rotation: rot(over) });
	const buttonWith = (seen, text) => seen.find((n) => n.type === 'button' && Array.isArray(n.props.children) && n.props.children[0] === text);
	const orderChips = (seen) => seen
		.filter((n) => n.type === 'button' && Array.isArray(n.props.children) && (n.props.children[0] === 'bg2.rotationSequential' || n.props.children[0] === 'bg2.rotationRandom'))
		.map((n) => n.props.children[0]);

	let seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({}), props);
	assert.deepEqual(orderChips(seen), ['bg2.rotationSequential', 'bg2.rotationRandom'], 'folder source: 按顺序轮播 then 随机顺序');
	buttonWith(seen, 'bg2.rotationSequential').props.onClick();
	assert.deepEqual(calls, [['setRotationMode', 'sequential']], 'it is the stored sequential mode, no new value');
	seen = render(h, nodes, 'dream-skin-wallpaper-advanced', state({ source: 'links' }), props);
	assert.deepEqual(orderChips(seen), ['bg2.rotationSequential', 'bg2.rotationRandom'], 'links source reads the same two chips: the design has ONE settings group for both');
});
