/**
 * dsh-dream-skin — the computed-style gate for issues #96 / #97 (10.8.0).
 *
 * WHY THIS FILE EXISTS. Everything else in this repository grades the sheet as TEXT.
 * The 10.8.0 adversarial review put its finger on the exact hole (A9: "#96's acceptance
 * criterion is a computed `border-radius` of 0, and the gate that shipped checks a
 * declaration string — if the host stops reading the variable, the gate stays green";
 * B4: "the radius declaration has no `!important` and the offline gates cannot see the
 * cascade"; release gate: "the CHANGELOG claims sampling in a real CSS engine while the
 * shipped tree contains no way to recompute that claim"). All three are fair, and this
 * file answers all three: it builds a page out of the SHIPPED sheet and the INSTALLED
 * host's own CSS, asks headless Chrome what the computed values are in three states, and
 * then proves the answer is caused by our declaration by removing exactly that one
 * declaration and re-measuring.
 *
 * Honesty rule borrowed from issue #83 (the preview gate): a missing browser or a missing
 * host install is reported as SKIPPED with its reason — never as a pass — while the pure
 * halves of this file still run everywhere.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const os = require('os');
const path = require('path');

const { measure, buildFixture, stripDeclaration, checkReadings, WASH_CHECKS } = require('../scripts/wash-cascade.cjs');
const { findChrome } = require('../scripts/generate-skin-mockups.cjs');

const browser = findChrome();
let hostError = null;
try { buildFixture(); } catch (e) { hostError = e.message; }
const hostReadable = hostError === null;
// Two independent preconditions, each declared by name in the skip reason. CI has
// neither a browser nor an installed host, so the computed halves skip there.
const RUN = browser.path !== null && hostReadable;
const skipWhy = !browser.path
	? `no headless browser: ${browser.why}`
	: `no installed DSH host to read CSS from: ${hostError}`;

// ── the pure halves: run everywhere, including CI ─────────────────────────

test('the probe refuses a fixture that could not fail', () => {
	// The failure mode guarded here is not "the host is missing" — it is subtler. A
	// fixture that omits the rule under test reads the SAME value in every state, so
	// "the wash neutralised the fade" gets "proved" by a page that never painted one.
	// buildFixture therefore requires all three host packages BY NAME and aborts on any.
	assert.throws(
		() => buildFixture({ root: path.join(os.tmpdir(), 'definitely-not-a-dsh-install') }),
		/host (layout|fade|chat) CSS .* unreadable/,
		'a host we cannot read must abort the probe, not silently thin it'
	);
	const err = (() => {
		try { buildFixture({ root: path.join(os.tmpdir(), 'definitely-not-a-dsh-install') }); return ''; }
		catch (e) { return e.message; }
	})();
	assert.match(err, /layout/, `the first missing package has to be named, got: ${err}`);
	// The message must carry the reason the package matters, or a future edit can delete
	// the requirement and the error will read like an environment complaint.
	assert.match(err, /would lose|no longer/, `the error has to say what thins, got: ${err}`);
});

test('stripDeclaration removes one declaration and nothing else', () => {
	// The mutation half below depends on this helper cutting exactly ONE line out of the
	// shipped sheet. Sloppy here means the "the gate can fail" evidence measures the
	// helper rather than the CSS.
	const css = 'html[a][b] div:has(> [c]) {\n  background-color: transparent !important;\n  --dsh-windows-content-radius: 0px !important;\n}';
	const stripped = stripDeclaration(css, '--dsh-windows-content-radius');
	assert.ok(!stripped.includes('--dsh-windows-content-radius'), 'the declaration is gone');
	assert.ok(stripped.includes('background-color: transparent !important'), 'its sibling survives');
	assert.ok(stripped.includes('div:has(> [c])'), 'the selector survives');
	// A property that is not there is an error, not a silent no-op: the alternative is a
	// mutation test that measures an unchanged sheet and reports success.
	assert.throws(() => stripDeclaration(css, '--never-authored'), /nothing was mutated/);
});

test('the verdict table claims every reading, and each claim is in a named issue group', () => {
	// checkReadings is now the single source of the expected numbers (the CLI and both
	// live tests grade it). That only helps if no check can fall between the two groups:
	// an unclaimed id would be graded by `npm run wash:check` and by NEITHER test — the
	// split-brain this table exists to prevent, in a new costume.
	const groups = new Set(WASH_CHECKS.map((c) => c.group));
	assert.deepEqual([...groups].sort(), ['corner', 'fade'], 'the two groups are #96 (corner) and #97 (fade), nothing else');
	for (const check of WASH_CHECKS) {
		assert.ok(['corner', 'fade'].includes(check.group), `${check.id} claims an unknown group ${check.group}`);
		assert.ok(typeof check.ok === 'function' && check.msg, `${check.id} needs both a predicate and a message`);
	}
});

test('checkReadings is falsifiable, and reads the state each check means', () => {
	// The whole point of giving `npm run wash:check` an exit code is that it CAN fail, so
	// the checker gets its own negative cases — synthetic readings, which is exactly what
	// lets them run in CI where the browser half skips.
	//
	// The pair is deliberate: one fixture where only the WASH state is wrong, one where only
	// the PLAIN state is. A predicate written as `ok: (w) => …` really receives the plain
	// sample (the call passes plain/wash/again positionally), and that bug is invisible if
	// both fixtures are uniform. Split the two halves and the arg order is pinned.
	const UNWASHED = { corner: '16px', frameFill: 'rgba(16, 16, 24, 0.75)', fadeBg: 'linear-gradient(a, b)', chatMask: 'linear-gradient(c)' };
	const WASHED = { corner: '0px', frameFill: 'rgba(0, 0, 0, 0)', fadeBg: 'none', chatMask: 'linear-gradient(c)' };
	const ids = (problems) => problems.map((p) => p.split(':')[0]).sort();

	assert.deepEqual(ids(checkReadings([UNWASHED, UNWASHED, UNWASHED])),
		['corner-flattened', 'fade-neutralised', 'frame-fill-dropped'],
		'a wash that changes nothing must report exactly the three wash-side checks');

	assert.deepEqual(ids(checkReadings([WASHED, WASHED, UNWASHED])),
		['corner-host-own', 'fade-paints', 'frame-fill-kept'],
		'a plain state that already looks washed must report the three plain-side checks instead — and proves no wash check is quietly reading the plain sample');

	// The restore half is its own sample: if `washed-again` is not read, a rule that
	// permanently restyles the host would pass as "the wash works".
	assert.deepEqual(ids(checkReadings([UNWASHED, WASHED, WASHED])), ['corner-restored'],
		'a corner stuck at 0px after the wash leaves is the only new complaint');
	assert.deepEqual(checkReadings([UNWASHED, WASHED, UNWASHED]), [], 'the healthy trio reads no problems at all');
	assert.deepEqual(checkReadings([]), ['expected the three states plain/wash/washed-again, got 0'],
		'a short sampling is a problem, not an empty pass');
});

// ── the computed halves: need a browser AND an installed host ─────────────

test('a real CSS engine flattens the Windows content corner under a wash', { skip: RUN ? false : skipWhy }, () => {
	const r = measure();
	assert.ok(!r.error, `the probe produced no readings: ${r.error}\n${(r.dom || '').slice(0, 300)}`);
	assert.deepEqual(r.readings.map((x) => x.state), ['plain', 'wash', 'washed-again'], 'all three states sampled');
	// #96 in computed values instead of in a declaration string — the acceptance
	// criterion the issue itself asked for. The numbers themselves live in WASH_CHECKS so
	// `npm run wash:check` and this test cannot drift apart; the group filter keeps the
	// two named tests aimed at their own issue.
	assert.deepEqual(checkReadings(r.readings, 'corner'), [], 'issue #96: the corner must flatten under a wash and come back without one');
});

test('the hash-free anchor neutralises the real host fade while chat masks survive', { skip: RUN ? false : skipWhy }, () => {
	// #97, against the hash the INSTALLED host actually ships (`bhn1Oq_fade`) rather than
	// the retired `qDHVXG_fade` the old rule named: painted without a wash, gone with one —
	// while the chat package's scroll masks (the "there is more content" affordance) are
	// untouched, which is the non-collateral claim, read off the engine rather than
	// inferred from the selector text.
	assert.deepEqual(checkReadings(measure().readings, 'fade'), [], 'issue #97: the band goes under a wash, the chat masks never do');
});

test('mutation: the same engine proves the readings are caused by our declaration', { skip: RUN ? false : skipWhy }, () => {
	// A computed-style gate nobody has broken is still a hypothesis. Take ONE declaration
	// out of the shipped sheet and re-run the identical fixture: if the corner survives the
	// wash, then the 0px above really was our doing.
	const parts = buildFixture();
	const mutated = { ...parts, material: stripDeclaration(parts.material, '--dsh-windows-content-radius') };
	assert.notEqual(mutated.material, parts.material, 'the mutation must change the sheet');
	const r = measure({ parts: mutated });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.equal(wash.corner, '16px', 'without our declaration the host corner survives the wash');
	// And the fade half must STILL be neutralised — the two fixes are independent, so a
	// mutation aimed at one must not disturb the other.
	assert.equal(wash.fadeBg, 'none', 'removing the radius line does not touch the fade neutralisation');
});

test('mutation: removing the fade rule brings the band back in the same engine', { skip: RUN ? false : skipWhy }, () => {
	// The symmetric proof for #97: without the wash-gated `[class$="_fade"]` block the
	// host gradient paints under a wallpaper too — which is precisely what the sheet used
	// to do invisibly. Written as a second mutation rather than folded into the one above,
	// so a failure here cannot be masked by an earlier assertion.
	const parts = buildFixture();
	// The extracted sheet is already concatenated CSS, so the mutation removes the RULE
	// whose selector carries the hash-free anchor — both branches of it, since they share
	// one declaration block.
	const material = parts.material.replace(/html\[data-dsh-dream-skin-wash\][^{}]*_fade[^{]*\{[^}]*\}/g, '');
	assert.notEqual(material, parts.material, 'the mutation must change the sheet');
	assert.ok(!/\[class\$="_fade"\]/.test(material), 'the hash-free rule really went away');
	const r = measure({ parts: { ...parts, material } });
	assert.ok(!r.error, `the mutated probe failed: ${r.error}`);
	const wash = r.readings.find((x) => x.state === 'wash');
	assert.match(wash.fadeBg, /linear-gradient/, 'without the hash-free rule the band survives the wash — so the `none` above was our rule');
});
