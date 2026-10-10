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

const REACT = { useRef: () => ({ current: {} }), useMemo: (f) => (typeof f === 'function' ? f() : f), useState: (init) => [init, () => {}] };
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
	const mutated = mutate('lastStorageError ? (0, react_jsx_runtime.jsx)("div", {', 'null ? (0, react_jsx_runtime.jsx)("div", {');
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
	const mutated = mutate('lastStorageError ? (0, react_jsx_runtime.jsx)("div", {', '({}) ? (0, react_jsx_runtime.jsx)("div", {');
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

