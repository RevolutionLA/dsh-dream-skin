/**
 * dsh-dream-skin — fiber generations on one page (local debt ③, review items B9 / T5 / T8).
 *
 * THE BUG. Every page-scope handle the plugin owns — the material `<style>`, the wallpaper node,
 * the wash attribute on `<html>`, the dialog readability floor — lives at MODULE scope, and the
 * bundle can be evaluated twice in one long-lived page (measured in the 10.5.0 audit: two
 * `style#dsh-dream-skin-nav-icon` nodes in one DOM after hours of use). Two fibers means two
 * cleanup effects, and the host decides when each runs. When the order is "new apply() first, old
 * fiber unloads second", an unguarded teardown walks the wall and removes what the NEW generation
 * just installed — the page snaps to the stock host look until something repaints it. The 10.9.x
 * review recorded this as a boundary rather than fixing it because the fix touches the fiber
 * lifecycle.
 *
 * THE LOCK. T9 already solved the identical problem for the nav-icon hook: `arm(gen)` stamps an
 * owner, `dispose(gen)` refuses unless the caller still holds it. These cases apply the same lock
 * to everything else the fiber owns, and — because a guard that never lets anything through would
 * also pass a "the new sheet survived" assertion — the SECOND case asserts the owning generation
 * still tears the page down, while the THIRD re-runs the whole thing with the guard deleted so the
 * bug itself is pinned as an assertion, not as a paragraph.
 *
 * COVERAGE. The sheet alone would be a weak proxy: what the user sees as "the skin vanished" is
 * three separate page-scope states — the injected `<style>`, the wash attribute on `<html>`, and
 * the token layer carrying the canvas alpha plus the #98 dialog floor. Case two pins all three
 * under a seeded wallpaper; case four shows the same three DISAPPEAR when the guard is deleted, so
 * none of the wash/floor assertions is decoration.
 */
const { test, after } = require('node:test');
const assert = require('node:assert');
const { buildSandbox, makeRequire, makeApplyContext, CODE, releaseAllIntervals } = require('./fixtures/page-sandbox.cjs');

// The cases below deliberately leave the bundle's 800ms mark-poll running (that IS the assertion),
// so the file sweeps every sandbox's timers when it is done instead of idling ~24s.
after(releaseAllIntervals);

/**
 * The exact lines that make an old generation's cleanup a no-op. Each needle is paired with the call
 * under it rather than used bare, because a mutation keyed on a substring that matches elsewhere in
 * the bundle would hit whichever comes first and quietly test a different door than the one it names.
 */
const GUARD = 'if (!holdsPageOwner(owner)) return;\n\t\t\t\tteardownWallpaper();';
/** The same lock on the composer marker, whose stop was unguarded before this file existed. */
const MARKER_GUARD = 'if (holdsPageOwner(owner)) stopComposerMarker();';
/** The third door — the wallpaper-refresh tick + listener (blue B-A-01) — is generation-local
 *  rather than ownership-guarded, and lives in `client.fiber.page_scope.test.cjs`. */

/** How many times `needle` occurs in `hay` — every mutation below asserts this is exactly 1. */
const count = (hay, needle) => hay.split(needle).length - 1;

/**
 * Turn ONE door off without touching what it guards. Deleting the guard line together with the call
 * under it (the obvious way to write this mutation) would change two things at once and could go red
 * for the wrong reason; swapping the condition for a never-matching one leaves the teardown intact
 * and makes the ownership check the only variable.
 */
function unguard(source, needle, replacement) {
	assert.equal(count(source, needle), 1,
		`mutation target must occur exactly once in the bundle, found ${count(source, needle)}: ${needle}`);
	return source.replace(needle, replacement);
}
const NEGATIVE = 'if (!holdsPageOwner(owner)) return;';
/** @returns the same guard with its condition replaced by one that never fires. */
const unguardNegative = (needle) => needle.replace(NEGATIVE, 'if (false) return;');

/** The composer marker's observer, picked out by the contract in its own comment: it observes
 *  `document.documentElement` for added nodes only (NOT body, NOT characterData). */
const isComposerObserver = (h, o) => o.target === h.documentElement && o.options
	&& o.options.childList === true && o.options.subtree === true
	&& o.options.characterData === undefined;
const composerObservers = (h) => h.observers.filter((o) => isComposerObserver(h, o));
const liveComposerObservers = (h) => composerObservers(h).filter((o) => o.observing);

/**
 * A persisted wallpaper, seeded the way a real second boot would find it. A GRADIENT is the
 * cheapest value that still drives the real code path: the image kind would need a decoded
 * File (and the canvas the sandbox has no 2D context for), the url kind needs a network, but
 * `wallpaperBackgroundCss()` returns a gradient string directly — so `applyWallpaper2` reaches
 * `shadeTokens2()` and the wash publishes exactly the two channels the report says a stale
 * teardown eats: the root wash attribute and the floored dialog token layer.
 *
 * The opacities are chosen to be DISTINGUISHABLE rather than default: 0.5 for the canvas wash
 * (what the slider says) and the #98 floor for the dialog channel. Both are read back below,
 * so a teardown that only repainted one of them cannot pass.
 */
const WASH_SEED = {
	'dsh-dream-skin:wallpaper-kind': 'gradient',
	'dsh-dream-skin:wallpaper-gradient': 'linear-gradient(135deg, #101018, #2a2440)',
	'dsh-dream-skin:wallpaper-opacity': '0.5'
};

function runTwoFibers(code = null, seed = {}) {
	const h = buildSandbox({ code, seed });
	const entry = h.factory(makeRequire());
	const first = makeApplyContext(h);
	entry.apply(first);
	const sheetsAfterFirst = h.materialSheets().length;
	const second = makeApplyContext(h);
	entry.apply(second);
	const sheetsAfterSecond = h.materialSheets().length;
	return { h, entry, first, second, sheetsAfterFirst, sheetsAfterSecond };
}

test('an old fiber unloading AFTER a new one leaves the live page state alone', () => {
	const { h, first, second, sheetsAfterFirst, sheetsAfterSecond } = runTwoFibers();
	assert.equal(sheetsAfterFirst, 1, 'the first fiber installed the material sheet');
	assert.ok(sheetsAfterSecond >= 1, 'the second fiber has a sheet in the page');
	first.disposers.forEach((dispose) => dispose());
	assert.ok(h.materialSheets().length >= 1,
		'the old generation must not strip what the new one is using — this is the whole debt');
	// And the guard is not a disabled teardown: the generation that DOES own the page still gets
	// a clean exit. Without this half, "nothing ever tears down" would pass the assertion above.
	second.disposers.forEach((dispose) => dispose());
	assert.equal(h.materialSheets().length, 0,
		'the owning fiber still removes its own sheet — otherwise this is a leak, not a lock');
});

test('the guard covers the wash attribute and the dialog floor, not only the <style> node', () => {
	// The report framed this debt as "the old fiber撤掉新代的 washed look" — the sheet is the most
	// visible symptom but NOT the mechanism. What the user actually sees is the wash marker on
	// <html> (which the frame/desktop rules read) and the token layer the host composes into
	// :root (canvas alpha + the #98 dialog floor). Both are module-scope state that a stale
	// teardown walks through, so both are asserted here.
	const { h, first, second } = runTwoFibers(null, WASH_SEED);
	const wash = () => h.documentElement.getAttribute('data-dsh-dream-skin-wash');

	// Precondition, checked before the ordering matters: the wash really is on screen, and the
	// dialog channel really carries the floor. Without this the three assertions below could be
	// green because nothing was ever published.
	assert.equal(wash(), '1', 'the seeded wallpaper published the root wash marker');
	const live = second.liveTokenLayers();
	assert.equal(live.length, 1, 'exactly one combined token layer is live after the second apply');
	const layer = live[0].overrides;
	assert.equal(layer['--dsw-alias-bg-base'].dark, 'rgba(21, 21, 23, 0.5)',
		'the canvas channel carries the wash alpha the user set, not the skin default');
	assert.match(layer['--dsw-alias-bg-layer-2'].dark, /0\.94\)$/,
		'the dialog channel is at the readability floor the wash gate raised it to');

	first.disposers.forEach((dispose) => dispose());
	assert.equal(wash(), '1', 'a stale generation must not retract the marker the new one is using');
	assert.equal(second.liveTokenLayers().length, 1, 'nor dispose the token layer it composes from');
	assert.equal(second.liveTokenLayers()[0].overrides['--dsw-alias-bg-layer-2'].dark, layer['--dsw-alias-bg-layer-2'].dark,
		'the floor value is still the one the live generation published');
	assert.ok(h.body.children.length >= 1, 'the wallpaper node itself is still mounted');

	// Same non-vacuity leg as the sheet case: owning generation still tears all of this down.
	second.disposers.forEach((dispose) => dispose());
	assert.equal(wash(), null, 'the owning fiber does retract the marker');
	assert.equal(second.liveTokenLayers().length, 0, 'and disposes its token layer');
});


test('the reverse order (old unloads BEFORE new applies) still tears the page down', () => {
	// The other hot-reload order, which the guard must NOT change: if the old fiber is the only
	// owner at the time it unloads, it owns the teardown.
	const h = buildSandbox({ seed: WASH_SEED });
	const entry = h.factory(makeRequire());
	const first = makeApplyContext(h);
	entry.apply(first);
	assert.equal(h.materialSheets().length, 1, 'sheet present');
	assert.equal(h.documentElement.getAttribute('data-dsh-dream-skin-wash'), '1', 'wash marker present');
	first.disposers.forEach((dispose) => dispose());
	assert.equal(h.materialSheets().length, 0, 'a sole owner still cleans up after itself');
	assert.equal(h.documentElement.getAttribute('data-dsh-dream-skin-wash'), null,
		'and it retracts the wash marker too — the guard must not turn into a leak');
});

test('mutation: delete the ownership guard and the old fiber really does eat the new page', () => {
	const mutated = unguard(CODE, GUARD, unguardNegative(GUARD));
	const { h, first, second, sheetsAfterSecond } = runTwoFibers(mutated, WASH_SEED);
	assert.ok(sheetsAfterSecond >= 1, 'the new fiber did install its sheet');
	assert.equal(h.documentElement.getAttribute('data-dsh-dream-skin-wash'), '1', 'and the wash marker');
	assert.equal(second.liveTokenLayers().length, 1, 'and one live token layer');
	first.disposers.forEach((dispose) => dispose());
	assert.equal(h.materialSheets().length, 0,
		'without the guard the stale cleanup removes the live sheet — the reported boundary, kept as an assertion that can fail');
	// The other two symptoms are asserted HERE, in the mutated build, so the wash/floor legs above
	// are pinned as load-bearing rather than decoration: a stale teardown really does retract the
	// marker and really does dispose the layer the new generation composes from.
	assert.equal(h.documentElement.getAttribute('data-dsh-dream-skin-wash'), null,
		'without the guard the wash marker is retracted from under the live generation');
	assert.equal(second.liveTokenLayers().length, 0,
		'without the guard the wash / dialog-floor token layer is disposed');
});

// The composer marker turned out to be a SECOND instance of the same debt, found while writing
// the cases above — and a worse one. Its observer and poll timers are module-scope, and so is the
// `composerMarkerStarted` latch that keeps a re-mount from building a second observer. An
// unguarded stop therefore did not merely blind the live generation: the latch stayed TRUE, the
// next `startComposerMarker()` returned at its first line, and the composer card was never tagged
// again for the rest of the page's life (issue #50's rules silently stop applying after the first
// re-render that drops the attribute). Two separate mutations pin the two halves.
test('the composer marker survives a stale teardown and re-arms once the owner leaves', () => {
	const { h, entry, first, second } = runTwoFibers(null, WASH_SEED);
	try {
		// Precondition: exactly ONE marker observer for two generations (the latch doing its job)
		// and it is live. It also explains why the stale stop was never harmless — there is only
		// one observer to lose.
		assert.equal(composerObservers(h).length, 1, 'two generations share one marker observer');
		assert.equal(liveComposerObservers(h).length, 1, 'and that observer is watching documentElement');

		first.disposers.forEach((dispose) => dispose());
		assert.equal(liveComposerObservers(h).length, 1,
			'a stale generation must not disconnect the observer the live page depends on');
		assert.ok(h.openIntervals() >= 1, 'nor cancel the poll that is still waiting for the first mark');

		second.disposers.forEach((dispose) => dispose());
		assert.equal(liveComposerObservers(h).length, 0, 'the owning fiber does disconnect it');
		assert.equal(h.openIntervals(), 0, 'and stops its poll — no residue after unload');

		// The re-arm leg, which the ownership guard alone would not buy: a fresh generation on the
		// same page must get a WORKING marker, meaning a NEW observer instance rather than the
		// disconnected one being re-observed.
		const third = makeApplyContext(h);
		entry.apply(third);
		assert.equal(composerObservers(h).length, 2, 'the next generation builds a second observer instead of inheriting a dead latch');
		assert.equal(liveComposerObservers(h).length, 1, 'and the new one is the live one');
		third.disposers.forEach((dispose) => dispose());
		assert.equal(liveComposerObservers(h).length, 0, 'which its own unload then releases');
	} finally {
		h.releaseIntervals();
	}
});

test('mutation: unguard the marker stop and a stale teardown blinds the live page', () => {
	const mutated = CODE.replace(MARKER_GUARD, 'stopComposerMarker();');
	assert.notEqual(mutated, CODE, 'the marker guard line has to exist for this to be a mutation');
	const { h, first } = runTwoFibers(mutated, WASH_SEED);
	try {
		assert.equal(liveComposerObservers(h).length, 1, 'the marker was up before the stale unload');
		first.disposers.forEach((dispose) => dispose());
		assert.equal(liveComposerObservers(h).length, 0,
			'unguarded, the old generation disconnects the ONE observer the new page is relying on');
	} finally {
		h.releaseIntervals();
	}
});

test('mutation: keep the started latch set on stop and the marker never comes back', () => {
	// The half the ownership guard does NOT fix: even a correctly OWNED teardown must hand the
	// latch back, or the page runs the rest of its life untagged.
	const LATCH = 'composerMarkerStarted = false;\n\t\t\tconst dispose = composerMarkerDispose;';
	assert.ok(CODE.includes(LATCH), 'stopComposerMarker has to reset the latch for this to be a mutation');
	const mutated = CODE.replace(LATCH, 'const dispose = composerMarkerDispose;');
	const h = buildSandbox({ seed: WASH_SEED, code: mutated });
	try {
		const entry = h.factory(makeRequire());
		const first = makeApplyContext(h);
		entry.apply(first);
		assert.equal(composerObservers(h).length, 1, 'the first generation armed the marker');
		first.disposers.forEach((dispose) => dispose());
		assert.equal(liveComposerObservers(h).length, 0, 'the owned teardown disconnected it');
		const second = makeApplyContext(h);
		entry.apply(second);
		assert.equal(composerObservers(h).length, 1,
			'mutation expected: the stale latch stops a NEW observer from ever being built');
		assert.equal(liveComposerObservers(h).length, 0,
			'so the page keeps NO composer marker for the rest of its life — permanent, not transient');
	} finally {
		h.releaseIntervals();
	}
});
