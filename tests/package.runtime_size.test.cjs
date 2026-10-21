"use strict";
/**
 * Runtime-artifact size budget — why this file exists.
 *
 * The host serves the browser half through a COMBO url:
 *   /plugins/??pkgA/client.js,…,dsh-dream-skin/client.js&rev=…
 * i.e. every plugin contributes exactly ONE file to one concatenated request,
 * and sibling paths inside the package are 404 (measured on a live DSH, 2026-10-14).
 * So "the browser half is one file" is a property of the host's loader, not a
 * habit of ours: it cannot be split into chunks the way an app bundle could.
 *
 * Third-party marketplaces bound their automated source review by the SAME
 * single-file dimension — DSH STORE's published contract is 240 runtime files /
 * 262,144 bytes per file / 2,097,152 bytes total, and it fails closed when a
 * bound is exceeded (then also reporting "scan incomplete"). Our entry is over
 * that per-file bound and so is most of the plugin ecosystem on this machine
 * (measured: 8 peer client.js files above 262,144, up to 2,468,635).
 *
 * Two honest responses, and this gate is the second one:
 *   - we do NOT minify or comment-strip the runtime entry to slip under a
 *     reviewer's byte budget. That file is the audit surface (the whole trust
 *     story is "readable native-token source, no injection"), their contract
 *     treats 混淆 as a signal, and every gate in this repo reads its text.
 *   - what we DO keep under control is growth: each runtime artifact gets a
 *     declared ceiling, so getting bigger is a decision with a line in the
 *     diff, not something a listing scan discovers first.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = require('../package.json');

/**
 * Budgets in bytes. `ceiling` is what this repo commits to not exceeding;
 * `marketBound` is the third-party auto-review bound we knowingly sit above
 * (kept visible so nobody "discovers" it in a listing report).
 */
const MARKET_FILE_BOUND = 262144;
const BUDGETS = [
	// 480 -> 512 KiB on purpose: wallpaper rotation took the bundle from 449 KB to 476 KB, and its
	// local-folder source (the settings controls, the host listing client and 12 strings in each of
	// the 8 dictionaries) to 498 KB. The file stays unminified: it is the audit surface.
	{ rel: 'lib/client.js', ceiling: 512 * 1024, reason: 'browser half; one combo-served file by host design' },
	{ rel: 'lib/index.js', ceiling: 40 * 1024, reason: 'host half' }
];

function declaredRuntimeFiles() {
	const out = [];
	for (const entry of pkg.files) {
		const p = path.join(ROOT, entry);
		if (fs.existsSync(p) && fs.statSync(p).isFile()) out.push(entry);
	}
	return out.sort();
}

function overBudget() {
	return BUDGETS
		.map((b) => ({ ...b, bytes: fs.statSync(path.join(ROOT, b.rel)).size }))
		.filter((b) => b.bytes > b.ceiling);
}

test('budget: every runtime artifact stays inside its declared byte ceiling', () => {
	const bad = overBudget();
	assert.deepEqual(bad, [], 'a runtime file grew past its ceiling — raise the ceiling on purpose (with a reason in the diff), do not let it drift');
});

test('budget: the ceiling is stated as headroom, not as an achieved pass', () => {
	// A budget that is already over the bound must say so; a gate that prints
	// "under 262144" while sitting at 442975 is how a false assurance ships.
	const client = fs.statSync(path.join(ROOT, 'lib/client.js')).size;
	assert.ok(client > MARKET_FILE_BOUND, 'this premise is the whole point of the file: if the entry ever fits, delete this gate and say so in the CHANGELOG');
	for (const b of BUDGETS) {
		assert.ok(b.ceiling > 0 && Number.isFinite(b.ceiling), `${b.rel} needs a real ceiling`);
		assert.ok(b.reason && b.reason.length > 4, `${b.rel} needs a reason in words`);
	}
});

test('budget: every declared runtime file is either budgeted or a non-code asset', () => {
	const budgeted = new Set(BUDGETS.map((b) => b.rel));
	const js = declaredRuntimeFiles().filter((f) => f.endsWith('.js'));
	const unbudgeted = js.filter((f) => !budgeted.has(f));
	assert.deepEqual(unbudgeted, [], 'a JS file shipped in `files` with no ceiling — add it to BUDGETS (this is how a second runtime entry would hide)');
});

test('mutation: each leg can actually fail — a new JS artifact and a grown file', () => {
	// Ceiling leg: pretend the budget for the browser half were absurdly small.
	const shrunk = [{ rel: 'lib/client.js', ceiling: 100, reason: 'x', bytes: fs.statSync(path.join(ROOT, 'lib/client.js')).size }];
	assert.equal(shrunk.filter((b) => b.bytes > b.ceiling).length, 1, 'the ceiling comparison must be able to fail');
	// Membership leg: a second shipped JS file with no budget must surface by name.
	const withFake = ['lib/client.js', 'lib/index.js', 'lib/second-entry.js'];
	const unbudgeted = withFake.filter((f) => !BUDGETS.some((b) => b.rel === f));
	assert.deepEqual(unbudgeted, ['lib/second-entry.js']);
	// And the same predicate over the REAL list must be empty — otherwise the leg
	// above proves nothing about this repo.
	assert.deepEqual(declaredRuntimeFiles().filter((f) => f.endsWith('.js')).filter((f) => !BUDGETS.some((b) => b.rel === f)), []);
});
