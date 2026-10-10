/**
 * dsh-dream-skin — the convergence poll shared by the client test files (blue team B-05).
 *
 * WHY THIS EXISTS. The same helper was copied into `client.smoke.test.cjs` and
 * `client.persistence.test.cjs` byte-for-byte. A fix to one copy (the fail-loudly timeout message,
 * the `label` in it, the "not usable for absence assertions" boundary) leaves the other silently
 * asserting the old contract — which is how a test helper turns into two different tests that share
 * a name. The rule is the one this repository already applies to the page sandbox: harness code
 * lives in one place, the cases live next to the thing they pin.
 */
const assert = require('node:assert');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * General convergence poll — the `settleDrift`/`waitFor` shape, and the issue #104 precedent: a
 * fixed sleep replaced by "wait until the observable converges". `converge()` returns
 * `{ done, observed }`; `waitFor` resolves with `observed` the moment `done` flips and FAILS LOUDLY
 * naming the label (plus the last observed value) on timeout — a timeout can never read as a pass.
 *
 * NOT usable for absence assertions ("nothing landed, and nothing ever will"): a poll for
 * "unchanged" converges on the first sample and proves nothing. Those sites keep an honest clock
 * (see the `diagnostics` and `S-3` cases) — the same boundary `settleDrift` states: "no amount of
 * polling can prove a 'not yet'".
 */
async function waitFor(converge, { timeoutMs = 4000, stepMs = 10, label = 'unnamed condition' } = {}) {
	const deadline = Date.now() + timeoutMs;
	let last;
	for (;;) {
		last = converge();
		if (last && last.done) return last.observed;
		if (Date.now() >= deadline) {
			assert.fail(`waitFor("${label}") never converged within ${timeoutMs}ms `
				+ `(last observed value=${JSON.stringify(last && last.observed)}) — the awaited state never arrived; `
				+ 'do not paper over this by sleeping longer');
		}
		await sleep(stepMs);
	}
}

module.exports = { sleep, waitFor };
