/**
 * dsh-dream-skin — the fiber-generation lock, second round (blue team 10.10.0: B-A-01 / -03 / -04).
 *
 * This file exists because the first draft of the lock (`tests/client.fiber.test.cjs`) was reviewed
 * and the review found three holes in it. All three are the same underlying mistake seen from three
 * sides: the lock guarded SOME of the page-scope state, in ONE module scope, at a moment that was
 * always AFTER both generations had finished installing. Each case below keeps the fixture and the
 * ordering fixed and changes exactly one line of product code — the product is the only variable,
 * which is the difference between a test and a paragraph.
 *
 *   B-A-01  the wallpaper-refresh tick and its `visibilitychange` listener are page-scope handles
 *           too, and their cleanup went through a MODULE-scope variable that the newer apply had
 *           already overwritten. Cancelling a timer repaints nothing, which is why "the skin
 *           vanished" style assertions never saw it. The fix is per-generation handles, so these
 *           cases pin BOTH halves: the live tick survives a stale unload, and the stale tick does
 *           not.
 *   B-A-03  the premise is "the bundle may be evaluated twice", and a second evaluation is a SECOND
 *           MODULE SCOPE. A counter kept in module scope cannot arbitrate between two copies that
 *           share one `<html>` attribute — so the number lives on the page. (This repository already
 *           learned it for the nav hook in 10.5.x; the CHANGELOG entry says "page-level armed flag".)
 *   B-A-04  claiming the number must happen BEFORE anything is installed, because a host is allowed
 *           to tear the old slot down synchronously in the middle of the new `apply()`.
 */
const { test, after } = require('node:test');
const assert = require('node:assert');
const {
	buildSandbox, makeRequire, makeApplyContext, CODE, WASH_SEED, releaseAllIntervals
} = require('./fixtures/page-sandbox.cjs');

after(releaseAllIntervals);

const count = (hay, needle) => hay.split(needle).length - 1;

/** Assert the needle is unique, then swap it. A mutation that silently hits a different occurrence
 *  tests a different door than the one its name claims — that is a whole class of this repo's bugs. */
function mutate(needle, replacement, source = CODE) {
	assert.equal(count(source, needle), 1,
		`mutation target must occur exactly once in the bundle, found ${count(source, needle)}: ${needle}`);
	return source.replace(needle, replacement);
}

/**
 * The entry point is what `factory(require)` returns; `loadedFactories[i]` is the raw factory.
 * Calling `factory.apply(ctx)` therefore runs `Function.prototype.apply` on the factory (no
 * arguments, since a context object has no `length`) and installs NOTHING — every assertion that
 * follows would then be a paragraph about a page that was never painted.
 */
const entryOf = (factory) => factory(makeRequire());

/** Two applies on ONE module scope, the shape the sibling file tests. */
function sameScope(code = null) {
	const h = buildSandbox({ seed: WASH_SEED, code });
	const entry = entryOf(h.factory);
	const first = makeApplyContext(h);
	entry.apply(first);
	const second = makeApplyContext(h);
	entry.apply(second);
	return { h, entry, first, second };
}

/** Two applies on TWO module scopes: one DOM, one `window`, one set of page attributes. */
function twoScopes(code = null) {
	const h = buildSandbox({ seed: WASH_SEED, code });
	const ctxA = makeApplyContext(h);
	entryOf(h.factory).apply(ctxA);
	const entryB = entryOf(h.evaluate(code || CODE));
	const ctxB = makeApplyContext(h);
	entryB.apply(ctxB);
	return { h, ctxA, ctxB };
}

const wash = (h) => h.documentElement.getAttribute('data-dsh-dream-skin-wash');

/** Drive the host's "unload the old slot in the middle of the new apply" interleaving. */
function unloadFirstOnFirstTokenWrite(ctx, first) {
	ctx.theme.overrideTokens = (source, overrides) => {
		if (!ctx.unloadedEarly) {
			ctx.unloadedEarly = true;
			first.disposers.slice().forEach((dispose) => dispose());
		}
		const layer = { source, overrides, live: true };
		ctx.tokenLayers.push(layer);
		return () => { layer.live = false; };
	};
}

// ── B-A-01: the refresh tick, in both directions ──────────────────────────────────────────────

const ARM = 'stopArmedRefreshScheduler(armedRefresh);';

test('the refresh tick and its visibilitychange listener answer to their own generation', () => {
	const { h, first, second } = sameScope();
	try {
		// Preconditions: the scheduler really armed. The bundle arms the tick only when
		// `typeof window.setInterval === "function"`, so a sandbox without window timers used to skip
		// this whole path and make the case vacuous (part of blue-team B-A-07). Re-arming replaces
		// the previous tick instead of stacking a second one, which is why two applies leave TWO
		// timers (composer poll + tick) and ONE listener, not four and two.
		assert.equal(h.openIntervals(), 2, 'one composer poll and one 60s refresh tick after two applies');
		assert.equal(h.documentListeners('visibilitychange').length, 1,
			'the second apply replaced the visibilitychange handler rather than adding one');
		const armed = h.documentListeners('visibilitychange')[0];

		first.disposers.forEach((dispose) => dispose());
		assert.equal(h.documentListeners('visibilitychange').length, 1,
			'a stale generation must not detach the listener the live generation depends on');
		assert.equal(h.documentListeners('visibilitychange')[0], armed,
			'and the surviving handler must still be the one the live scheduler armed');
		assert.equal(h.openIntervals(), 2, 'nor cancel the tick issue #45 refreshes the URL wallpaper on');

		second.disposers.forEach((dispose) => dispose());
		assert.equal(h.documentListeners('visibilitychange').length, 0, 'the owning fiber detaches it');
		assert.equal(h.openIntervals(), 0, 'and stops every timer — no residue after unload');
	} finally {
		h.releaseIntervals();
	}
});

test('mutation: a teardown that clears "the" timer through the module handle kills the live tick', () => {
	// This is the pre-fix shape, not a strawman: `stopWallpaperRefreshScheduler()` releases whatever
	// the module-scope `refreshTimer` points at, and after a re-apply that variable names the NEW
	// generation's timer. The page still looks right (the sheet is re-published on the next apply, so
	// no "skin vanished" symptom), which is exactly why nobody noticed a timer was being eaten.
	const mutated = mutate(ARM, 'stopWallpaperRefreshScheduler();');
	const { h, first, second } = sameScope(mutated);
	try {
		assert.equal(h.openIntervals(), 2, 'poll + tick armed before the unload');
		assert.equal(h.documentListeners('visibilitychange').length, 1, 'listener armed before the unload');
		first.disposers.forEach((dispose) => dispose());
		assert.equal(h.documentListeners('visibilitychange').length, 0,
			'unguarded, the old generation detaches the listener the new page is relying on');
		assert.equal(h.openIntervals(), 1,
			'and the live tick is gone with it — issue #45 stops refreshing until the next apply');
	} finally {
		h.releaseIntervals();
	}
});

// ── B-A-03: two module scopes, one page ───────────────────────────────────────────────────────

test('a second evaluation of the bundle in one page cannot retract what the newer copy owns', () => {
	const { h, ctxA, ctxB } = twoScopes();
	try {
		// Same context, same DOM, two module scopes. This is what "the bundle was evaluated twice"
		// actually means, and it is the case a per-module counter structurally cannot pass.
		assert.equal(h.loadedFactories.length, 2, 'the page really holds two module scopes');
		assert.equal(h.pageOwner(), 2, 'and ONE page-level ownership number counts them');
		assert.equal(wash(h), '1', 'the wash marker is on');
		assert.ok(ctxB.liveTokenLayers().length >= 1, 'the newer copy owns a token layer');
		// Four timers, two listeners: each copy armed its own, because `start…` reaches for the
		// module-scope handle its own copy wrote. The stale unload therefore has to clean up after
		// itself (case below) as well as leave the live one alone.
		assert.equal(h.openIntervals(), 4, 'both copies armed a poll and a tick');
		assert.equal(h.documentListeners('visibilitychange').length, 2, 'both attached a listener');

		ctxA.disposers.forEach((dispose) => dispose());
		assert.equal(wash(h), '1',
			'the older COPY (different module scope) must not retract the attribute the newer one uses');
		assert.ok(ctxB.liveTokenLayers().length >= 1, 'nor dispose the newer copy token layer');
		assert.ok(h.materialSheets().length >= 1, 'nor remove the sheet it injected');
		assert.equal(h.openIntervals(), 3, 'but it does stop its OWN tick');
		assert.equal(h.documentListeners('visibilitychange').length, 1, 'and detaches its OWN listener');

		ctxB.disposers.forEach((dispose) => dispose());
		assert.equal(wash(h), null, 'the newer copy does tear down its own page state');
		assert.equal(h.materialSheets().length, 0, 'including the sheets');
		// One timer survives on purpose: copy A's composer-marker poll is guarded by the ownership
		// lock like the marker observer, and it stops itself after 30 tries (~24s). A 60s tick that
		// never stops is why this file does not extend the same reasoning to the scheduler.
		assert.equal(h.openIntervals(), 1, 'only A self-limiting composer poll is left running');
		assert.equal(h.documentListeners('visibilitychange').length, 0, 'and no visibility listener');
	} finally {
		h.releaseIntervals();
	}
});

test('mutation: a cleanup that releases nothing leaves the stale copy driving a 60s tick', () => {
	// The other half of B-A-01, and the reason the answer is per-generation handles rather than
	// "refuse to clean up unless you own the page". A refused cleanup is not neutral: the dead copy's
	// tick keeps firing for the life of the page, and `runScheduledWallpaperRefresh` reads the SHARED
	// localStorage config, so the stale copy can commit a wallpaper refresh through its own dead
	// `ctx` every hour.
	const mutated = mutate(ARM, 'void armedRefresh;');
	const { h, ctxA, ctxB } = twoScopes(mutated);
	try {
		assert.equal(h.openIntervals(), 4, 'both copies armed a poll and a tick');
		assert.equal(h.documentListeners('visibilitychange').length, 2, 'both attached a listener');
		ctxA.disposers.forEach((dispose) => dispose());
		assert.equal(h.openIntervals(), 4, 'mutation expected: the stale tick survives its own unload');
		assert.equal(h.documentListeners('visibilitychange').length, 2,
			'and so does its listener, so a background-tab wake-up runs both');
		assert.equal(wash(h), '1', 'the marker the live copy uses is untouched either way');
		ctxB.disposers.forEach((dispose) => dispose());
		assert.equal(h.openIntervals(), 3,
			'the mutation is not scoped to the stale copy: the owning unload leaks its own tick too, '
			+ 'so the page ends with two 60s refresh drivers and never stops them');
		assert.equal(h.documentListeners('visibilitychange').length, 2,
			'and both visibility handlers outlive the plugin');
	} finally {
		h.releaseIntervals();
	}
});

test('mutation: a module-scope ownership number loses the cross-instance case', () => {
	// The reverse leg for the case above: read the claim from this module's fallback instead of the
	// page, and the protection vanishes while every SAME-instance case in the sibling file stays
	// green. If someone re-scopes the counter back to module level, this is the one that goes red.
	const WINDOW_READ = 'try { value = Number(window[PAGE_OWNER_KEY]); } catch { value = NaN; }';
	const mutated = mutate(WINDOW_READ, '/* mutated: module-private counter only */ value = NaN;');
	const { h, ctxA, ctxB } = twoScopes(mutated);
	try {
		assert.equal(h.loadedFactories.length, 2, 'two module scopes on the page');
		assert.equal(wash(h), '1', 'wash marker on');
		assert.equal(h.materialSheets().length, 2, 'and one sheet per copy (each adopts its own handle)');
		ctxA.disposers.forEach((dispose) => dispose());
		assert.equal(wash(h), null,
			'mutation expected: with a private counter, copy A really does strip copy B marker');
		assert.equal(h.materialSheets().length, 0, 'and the sheets, so the page snaps to the stock look');
		// What the private counter DOES protect is nothing shared: the token layer lives in copy B's
		// own module scope, so copy A has no handle on it either way. That asymmetry is the argument
		// for putting the number on the page — only page-scope state is at risk, and that is exactly
		// the state a per-module counter cannot arbitrate.
		assert.equal(ctxB.liveTokenLayers().length, 1, 'the newer copy token layer survives regardless');
	} finally {
		h.releaseIntervals();
	}
});

// ── B-A-04: the claim has to precede the install ──────────────────────────────────────────────

test('claiming the page before installing survives a host that unloads the old slot mid-apply', () => {
	const h = buildSandbox({ seed: WASH_SEED });
	const entry = entryOf(h.factory);
	const first = makeApplyContext(h);
	entry.apply(first);
	const second = makeApplyContext(h);
	unloadFirstOnFirstTokenWrite(second, first);
	entry.apply(second);
	try {
		assert.equal(second.unloadedEarly, true,
			'the mid-apply unload really fired — otherwise these three assertions prove nothing');
		assert.ok(h.materialSheets().length >= 1,
			'the new generation sheet survived a teardown that ran DURING its own apply');
		assert.equal(wash(h), '1', 'and so did the wash marker it publishes');
		assert.ok(second.liveTokenLayers().length >= 1, 'and the token layer installed after that point');
	} finally {
		second.disposers.forEach((dispose) => dispose());
		h.releaseIntervals();
	}
});

test('mutation: adopting the current number instead of claiming one loses the sheet to the same unload', () => {
	const mutated = mutate('const owner = claimPageOwner();', 'const owner = readPageOwner();');
	const h = buildSandbox({ seed: WASH_SEED, code: mutated });
	try {
		const entry = entryOf(h.factory);
		const first = makeApplyContext(h);
		entry.apply(first);
		const second = makeApplyContext(h);
		unloadFirstOnFirstTokenWrite(second, first);
		entry.apply(second);
		assert.equal(second.unloadedEarly, true, 'the mid-apply unload fired');
		assert.equal(h.materialSheets().length, 0,
			'mutation expected: without the early claim the stale teardown strips the live sheet');
		// Measured, not assumed: the wash marker reads back "1" here, because the apply re-publishes
		// it AFTER the point the unload was injected at. So the damage from a late claim is partial
		// and per-channel — the sheet is what stays gone. Saying "everything is lost" would be a
		// stronger claim than this fixture supports.
		assert.equal(wash(h), '1', 'the marker is republished later in the same apply');
		assert.equal(second.liveTokenLayers().length, 1, 'and so is the token layer');
	} finally {
		h.releaseIntervals();
	}
});
