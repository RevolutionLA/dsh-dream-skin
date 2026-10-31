/**
 * dsh-dream-skin — a minimal RENDER fixture for the settings section (refactor baseline W1).
 *
 * WHY. Every other sandbox in this suite stubs `react/jsx-runtime` as `jsx: () => 0`, and the host
 * slot registry drops the component it is handed (`register(desc, Component)` keeps the action bag
 * and throws the component away). With both of those in place the plugin's whole UI layer compiles to
 * a no-op: a row could lose a slider, a checkbox or an entire conditional block and no case in the
 * suite could tell. So this fixture keeps the components, hands each one the props the host would
 * hand it (the bound translator, `useStore`, the injected action bag), and expands the returned JSX
 * into a traversable `{ tag, props, children }` tree.
 *
 * WHAT IT DOES NOT DO. There is no React reconciler inside. `useState` returns the value it was
 * given on every call (or the one a case pinned via `hookInitials`) and a setter that RECORDS the
 * call in `page.hookCalls` — that observes both halves of a state-driven style ("the handler asks
 * for focused" / "a focused card renders the ring") without re-implementing React. `useEffect` does
 * not RUN, it RECORDS: `page.effects` holds every effect the render asked for, so a case can invoke
 * one (and the cleanup it returns) and observe the subscribe/unsubscribe half of a hook without a
 * re-render — which is the only half a subscription has. So a control that only exists after a
 * CLICK is not reachable here — the conditional blocks
 * this fixture can exercise are the ones driven by the slot STORE (wallpaper kind, stored URL,
 * rotation config, `hasImage`), which `page.setState()` drives exactly the way the host's `sync`
 * action drives them. Timer-driven behaviour is out of scope too: the sandbox's intervals are
 * released as soon as `apply()` returns, so a page built here cannot keep the test process alive.
 *
 * The tree mirrors the host element tree, not the React element tree: component elements are
 * resolved by INVOKING them (as React would), and text children become `{ tag: '#text' }` nodes so
 * that "which text is under this title" stays a tree question instead of a flat log scan. Every node
 * also carries a `parent` link, which is what makes "the checkbox's label is its next sibling"
 * expressible.
 */
'use strict';

const { buildSandbox } = require('./page-sandbox.cjs');

/**
 * The React surface the registered components touch (`_react.useRef` / `useState`). `useMemo` and
 * `useCallback` are honest passthroughs rather than stubs: if a future refactor hides a VALUE behind
 * `useMemo`, the fixture must still return the value instead of `undefined`.
 */
const REACT = {
	useRef: () => ({ current: null }),
	useMemo: (factory) => (typeof factory === 'function' ? factory() : factory),
	useCallback: (fn) => fn,
	/**
	 * Recorder, not a hook. Hook identity is `owner#index` — the component's function name plus its
	 * call order inside that invocation — because a functional render has no instance to key on.
	 * `hookInitials` pins a cell's value for a page (how a case renders "a card that is focused"
	 * without a click); every setter appends to `render.calls`, which is `page.hookCalls`.
	 */
	useState: (initial) => {
		if (RENDER === null) return [initial, () => {}];
		const owner = HOOK_OWNER === null ? 'anonymous' : HOOK_OWNER.name;
		const index = HOOK_OWNER === null ? 0 : HOOK_OWNER.index++;
		const key = owner + '#' + index;
		// Which component OWNS the cell is the point of the W7b case below: a shared helper
		// invoked as a plain function puts its hooks on the CALLER's list, so the list changes
		// length when a conditional block appears or disappears (React #300/#310 at runtime).
		if (Array.isArray(RENDER.hookKeys)) RENDER.hookKeys.push(key);
		const pinned = RENDER.initials !== null && Object.prototype.hasOwnProperty.call(RENDER.initials, key);
		// The calls array is captured here, not read off RENDER later: a test fires a handler AFTER
		// the render pass ends, when RENDER has been restored.
		const calls = RENDER.calls;
		return [pinned ? RENDER.initials[key] : initial, (next) => {
			calls.push({ hook: key, value: next });
		}];
	},
	/** Recorded, not run: `page.effects` is the list, so mount/unmount is a decision a case makes. */
	useEffect: (fn) => { if (RENDER !== null && Array.isArray(RENDER.effects)) RENDER.effects.push(fn); },
	useLayoutEffect: () => {}
};

/** Per-render hook context (`{ initials, calls }`), set by `expand()`; null outside a page render. */
let RENDER = null;

/** The component currently being invoked, so `useState` can key its cell by owner + index. */
let HOOK_OWNER = null;

/** `defineStore` stub: hands every registration its `spec`, which is where init() and sync live. */
const STORE_RUNTIME = { defineStore: (definition) => ({ spec: definition, create() {} }) };

/** Two guards against a component that renders itself: a visit cap and a depth cap. */
const VISIT_BUDGET = 20000;
const DEPTH_LIMIT = 200;

/** True for the element records our `jsx()` produces (as opposed to props, style bags, etc.). */
const isElement = (value) => typeof value === 'object' && value !== null && value.__element === true;

function makeJsxRuntime(created) {
	const jsx = (tag, props, key) => {
		const element = { __element: true, tag, props: props || {}, key };
		created.push(element);
		return element;
	};
	// `jsx`/`jsxs` differ only in whether React passes an array; the expansion below accepts both, so
	// one recorder serves both call shapes.
	return { jsx, jsxs: jsx, jsxDEV: jsx, Fragment: 'Fragment' };
}

/** The four specifiers the bundle probes (see `requireSeed` in `lib/client.js`). */
function makeRequire(created) {
	const runtime = makeJsxRuntime(created);
	return (specifier) => {
		if (specifier === 'react/jsx-runtime') return runtime;
		if (specifier === 'react') return REACT;
		if (specifier === '@deepseek-ai/dsh-client-store') return STORE_RUNTIME;
		if (specifier === '@deepseek-ai/dsh-client-runtime/client') return STORE_RUNTIME;
		throw new Error('unexpected require: ' + specifier);
	};
}

/**
 * Turn a React element record (or an array/string/null of them) into host nodes.
 *
 * Ordering is React's: children are resolved before the parent node is returned, so a parent's
 * `children` array is always complete. A component element is resolved by calling it — that is the
 * step every `jsx: () => 0` sandbox skips.
 */
function toNodes(value, depth, state) {
	if (value === null || value === undefined || value === false || value === true) return [];
	if (Array.isArray(value)) {
		const out = [];
		for (const entry of value) {
			for (const node of toNodes(entry, depth, state)) out.push(node);
		}
		return out;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return [{ tag: '#text', text: String(value), props: {}, children: [], parent: null }];
	}
	if (!isElement(value)) return [];
	state.visits -= 1;
	if (state.visits < 0) {
		throw new Error('settings-render: expansion exceeded ' + VISIT_BUDGET + ' nodes — a component is rendering itself');
	}
	if (depth > DEPTH_LIMIT) {
		throw new Error('settings-render: expansion nested deeper than ' + DEPTH_LIMIT + ' levels — a component is rendering itself');
	}
	if (typeof value.tag === 'function') {
		const previous = HOOK_OWNER;
		HOOK_OWNER = { name: typeof value.tag.name === 'string' && value.tag.name !== '' ? value.tag.name : 'anonymous', index: 0 };
		try {
			return toNodes(value.tag(value.props), depth + 1, state);
		} finally {
			HOOK_OWNER = previous;
		}
	}
	const node = {
		tag: typeof value.tag === 'string' ? value.tag : '#fragment',
		props: value.props,
		children: [],
		parent: null
	};
	const children = toNodes(value.props && value.props.children, depth + 1, state);
	for (const child of children) {
		child.parent = node;
		node.children.push(child);
	}
	return [node];
}

/** Expand one element record (or array) into host nodes under `render` (`{ initials, calls, effects }`). */
function expand(value, render) {
	const previous = RENDER;
	RENDER = render || null;
	HOOK_OWNER = null;
	try {
		return toNodes(value, 0, { visits: VISIT_BUDGET });
	} finally {
		RENDER = previous;
		HOOK_OWNER = null;
	}
}

/** Depth-first visit of every node under `nodes`, parents before children. */
function walk(nodes, visit) {
	for (const node of nodes) {
		visit(node);
		walk(node.children, visit);
	}
}

/** Every node under `nodes` matching `predicate`. */
function findAll(nodes, predicate) {
	const out = [];
	walk(nodes, (node) => {
		if (predicate(node)) out.push(node);
	});
	return out;
}

/** The first node under `nodes` matching `predicate`, or null. */
function findOne(nodes, predicate) {
	let found = null;
	walk(nodes, (node) => {
		if (found === null && predicate(node)) found = node;
	});
	return found;
}

/** Concatenated text of every text node under `nodes` (React's own children order). */
function textOf(nodes) {
	const parts = [];
	walk(nodes, (node) => {
		if (node.tag === '#text') parts.push(node.text);
	});
	return parts.join('');
}

/**
 * The FIRST text under `nodes`.
 *
 * Needed because a label span is not always one string: `<span>{label}{help ? <HelpDot/> : null}</span>`
 * appends the badge's "?" to the same span, so `textOf` reads "background.blur?" and a case that
 * asserts the row's ORDER would have to know which rows carry a help badge. The first text node is
 * the label; `textOf` stays available for the whole sentence.
 */
function firstText(nodes) {
	let found = null;
	walk(nodes, (node) => {
		if (found === null && node.tag === '#text') found = node.text;
	});
	return found;
}

/** `{ tag: count }` for every tag under `nodes` — the cheapest "what is on this panel" fingerprint. */
function tagCounts(nodes) {
	const counts = {};
	walk(nodes, (node) => {
		counts[node.tag] = (counts[node.tag] || 0) + 1;
	});
	return counts;
}

/** The `type` of every `<input>` under `nodes`, in document order. */
function inputTypes(nodes) {
	return findAll(nodes, (node) => node.tag === 'input').map((node) => node.props.type || 'text');
}

/**
 * A label/control pair as the user reads it: `{ type, label, labelText, node }`.
 *
 * The rows have two shapes and the fixture names them instead of re-deriving them in every case:
* a slider is the tagged row: `<span>label</span><div class="track"><input type=range/></div>
* <span>value</span>`, so its label is the row's FIRST child; a checkbox is
* `<div><input type=checkbox/><span>label</span></div>` (plus optional trailing controls), so its
* label is the NEXT sibling span.
 */

/**
 * The tagged Slider row that owns `input`: the range input sits in the track cell, so the row is an
 * ANCESTOR of the input rather than its parent.
 */
const rowOf = (input) => {
	let node = input.parent;
	while (node && !(node.props && node.props['data-dsh-dream-skin-slider'] !== undefined)) node = node.parent;
	return node || null;
};

function controls(nodes) {
	const out = [];
	for (const input of findAll(nodes, (node) => node.tag === 'input')) {
		const type = input.props.type || 'text';
		const siblings = input.parent ? input.parent.children : [];
		const at = siblings.indexOf(input);
		let labelNode = null;
		if (type === 'range') {
			const row = rowOf(input);
			labelNode = row === null ? null : (row.children[0] || null);
		} else if (type === 'checkbox') labelNode = siblings[at + 1] || null;
		out.push({
			type,
			label: labelNode === null ? null : firstText([labelNode]),
			labelText: labelNode === null ? null : textOf([labelNode]),
			node: input
		});
	}
	return out;
}

/**
 * Build one settings page: evaluate the bundle in a fresh VM sandbox, run `apply()`, and keep every
 * slot registration the plugin makes together with the store state and action bag that go with it.
 *
 * @param opts.seed  `{ key: value }` localStorage pairs seeded before `apply()` runs
 * @param opts.code  replacement bundle source (mutation legs)
 * @param opts.t     translator override; defaults to the identity, so cases assert on KEYS
 * @param opts.hookInitials  `{ 'Component#index': value }` — pin a `useState` cell, so a case can
 *                    render "the card that is focused" without a click
 * @param opts.matchMedia  `(query) => boolean` — the engine's answer per media query, which is how a
 *                    case renders the wide and the compact tier of the SAME component
 * @param opts.noMatchMedia  delete `window.matchMedia` outright: a DOM that cannot answer a query
 */
function buildSettingsPage(opts) {
	const options = opts || {};
	const sandbox = buildSandbox({ seed: options.seed, code: options.code, matchMedia: options.matchMedia });
	if (options.noMatchMedia === true) delete sandbox.window.matchMedia;
	const hookCalls = [];
	const effects = [];
	const hookKeys = [];
	const render = { initials: options.hookInitials || null, calls: hookCalls, effects, hookKeys };
	const created = [];
	const registrations = [];
	const dictionaries = [];
	const translator = typeof options.t === 'function' ? options.t : (key) => key;

	const ctx = {
		theme: {
			register() { return () => {}; },
			setTheme() {},
			getTheme() {
				return {
					preference: 'system',
					active: { id: 'dark', colorScheme: 'dark', tokens: {} },
					themes: [],
					revision: 1
				};
			},
			overrideTokens() { return () => {}; }
		},
		slots: {
			inject(_name, factory) { factory(); },
			/**
			 * The host calls `register(descriptor, Component)`. The OTHER sandboxes drop the component;
			 * keeping it — together with the store state the host would bind and the action bag
			 * `inject()` returns — is the whole point of this fixture.
			 */
			register(desc, Component) {
				const spec = desc.store && desc.store.spec;
				let state = null;
				let actions = {};
				if (spec && typeof spec.init === 'function') {
					state = spec.init();
					const bag = {};
					if (spec.actions && typeof spec.actions.sync === 'function') {
						bag.sync = (...args) => spec.actions.sync(state, ...args);
					}
					if (typeof desc.inject === 'function') actions = desc.inject(bag) || {};
				} else if (typeof desc.inject === 'function') {
					actions = desc.inject({}) || {};
				}
				registrations.push({ desc, Component, state, actions });
				return {};
			}
		},
		locale: {
			register(namespace, dictionary) { dictionaries.push({ namespace, dictionary }); },
			// Identity translator bound for non-React call paths; the row props get the same one.
			bind() { return (key) => key; }
		},
		on() { return () => {}; },
		effect(factory) {
			const disposer = factory();
			if (typeof disposer === 'function') (sandbox.disposers || (sandbox.disposers = [])).push(disposer);
		}
	};

	const plugin = sandbox.factory(makeRequire(created));
	plugin.apply(ctx);
	// A page built for assertions never needs the live timers (the 800ms composer poll, the refresh
	// scheduler), and leaving them armed would hold the test process open for ~24s at best.
	sandbox.releaseIntervals();

	const itemRows = registrations.filter((entry) => entry.desc.name === 'settings.dreamSkin.item');
	const orderedRows = itemRows.slice().sort((a, b) => (a.desc.order || 0) - (b.desc.order || 0));
	const section = registrations.find((entry) => entry.desc.name === 'settings.section') || null;

	const rowById = (id) => {
		const found = itemRows.filter((entry) => entry.desc.id === id);
		if (found.length !== 1) {
			throw new Error('expected exactly one registered row with id "' + id + '", found ' + found.length);
		}
		return found[0];
	};

	const rowProps = (row) => {
		// The host hands the row its injected action bag, the bound translator, the store's
		// `useStore` hook and the child-slot renderer. Nothing else is invented here.
		const props = Object.assign({}, row.actions || {});
		props.t = translator;
		props.useStore = (selector) => selector(row.state || {});
		props.renderSlot = renderSlot;
		return props;
	};

	/** The child slot as the host would render it: every item row, in `order`. */
	const renderSlot = (slotName) => {
		if (slotName !== 'settings.dreamSkin.item') return [];
		return orderedRows.map((row) => ({ __element: true, tag: row.Component, props: rowProps(row) }));
	};

	const renderRow = (id) => expand({ __element: true, tag: rowById(id).Component, props: rowProps(rowById(id)) }, render);

	const renderSection = () => {
		if (section === null) throw new Error('the bundle did not register a "settings.section"');
		return expand({ __element: true, tag: section.Component, props: { renderSlot } }, render);
	};

	/** Patch a row's slot-store state — the same door the host's `sync` action writes through. */
	const setState = (id, patch) => {
		const row = rowById(id);
		if (row.state === null) throw new Error('row "' + id + '" has no store state to patch');
		Object.assign(row.state, patch);
		return row.state;
	};

	return {
		plugin,
		sandbox,
		registrations,
		items: itemRows,
		orderedRows,
		section,
		dictionaries,
		rowById,
		stateOf: (id) => rowById(id).state,
		actionsOf: (id) => rowById(id).actions,
		setState,
		renderRow,
		renderSection,
		/** Every `setState` call the rendered components made, in order: `{ hook, value }`. */
		hookCalls,
		/** Every hook cell READ by the last render(s), as `owner#index` — whose hook list it landed on. */
		hookKeys,
		clearHookKeys() { hookKeys.length = 0; },
		clearHookCalls() { hookCalls.length = 0; },
		/** Every effect the rendered components asked for, in render order; RUNNING one is a case's job. */
		effects,
		/** The media query lists the bundle asked for (`media` / `matches` / `listeners`). */
		mediaQueries: sandbox.mediaQueries,
		/** Release the sandbox's disposers; cheap hygiene for a case that inspects them. */
		close() { for (const disposer of sandbox.disposers || []) disposer(); }
	};
}

module.exports = {
	buildSettingsPage,
	expand,
	walk,
	findAll,
	findOne,
	textOf,
	firstText,
	tagCounts,
	inputTypes,
	controls
};
