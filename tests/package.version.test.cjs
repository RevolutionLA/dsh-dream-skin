/**
 * dsh-dream-skin — release version-sync guard (publishing-to-npm.md T-07).
 *
 * The runbook requires `package.json`, `package-lock.json` and `PLUGIN_BUILD` to
 * carry the same version. The last two releases each missed the lock file once,
 * and nothing failed: the shipped tarball was correct, only the repo's own
 * install metadata lied. This is the check that makes that mistake red.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = require('../package.json');

function lock() {
	const file = path.join(ROOT, 'package-lock.json');
	assert.ok(fs.existsSync(file), 'package-lock.json must exist: the runbook pins its version alongside package.json');
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('release: package-lock.json carries the same version as package.json', () => {
	const l = lock();
	assert.equal(l.version, pkg.version, `lock root "version" is ${l.version}, package.json is ${pkg.version} — bump both at release time`);
	assert.equal(l.packages[''].version, pkg.version, `lock packages[""].version is ${l.packages[''].version}, package.json is ${pkg.version}`);
});

test('release: package-lock.json keeps the package name (a renamed lock means it was regenerated elsewhere)', () => {
	const l = lock();
	assert.equal(l.name, pkg.name, `lock name ${l.name} != package name ${pkg.name}`);
});
