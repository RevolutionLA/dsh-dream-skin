/**
 * dsh-dream-skin — DSH plugin-list display metadata guard (PR #57).
 *
 * The host only localises the plugin list entry when `locale/en.json` sits next
 * to `locale/zh.json`, and it resolves those files through the package
 * `exports` map. Every one of those three requirements can be broken by an
 * unrelated edit to package.json with zero test coverage — the plugin would
 * just silently fall back to English (or to a blank row). These tests are the
 * canary for that convention; see the discussion in PR #57.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = require('../package.json');

// Display languages for the plugin list. Not the 8-language *settings*
// dictionary (registered at runtime in lib/client.js) nor docs/i18n (README
// translations) — this file only guards the plugin-list metadata.
const DISPLAY_LOCALES = ['en', 'zh'];

function readMeta(locale) {
	const file = path.join(ROOT, 'locale', `${locale}.json`);
	assert.ok(
		fs.existsSync(file),
		`locale/${locale}.json must exist: without locale/en.json the host never reads any language file`
	);
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('i18n: every display locale ships a non-empty meta.title and meta.description', () => {
	for (const locale of DISPLAY_LOCALES) {
		const doc = readMeta(locale);
		assert.ok(doc.meta && typeof doc.meta === 'object', `locale/${locale}.json needs a "meta" object`);
		for (const key of ['title', 'description']) {
			const value = doc.meta[key];
			assert.equal(typeof value, 'string', `locale/${locale}.json meta.${key} must be a string`);
			assert.ok(
				value.trim().length > 0,
				`locale/${locale}.json meta.${key} must not be empty — an empty meta can blank the entry out on the other UI language`
			);
		}
	}
});

test('i18n: package.json keeps locale/*.json both resolvable and published', () => {
	assert.equal(
		pkg.exports && pkg.exports['./locale/*.json'],
		'./locale/*.json',
		'dropping the "./locale/*.json" exports pattern makes the host throw ERR_PACKAGE_PATH_NOT_EXPORTED'
	);
	assert.ok(pkg.files.includes('locale'), 'locale/ must stay in the files allowlist or it never ships in the tarball');
});

test('i18n: display copy does not overclaim an instant effect (install needs a DSH restart)', () => {
	const zh = readMeta('zh');
	assert.ok(
		!/装完即生效|立即生效|无需重启|不用重启/.test(zh.meta.description),
		'restart is required after `dsh plugin add` — README says "装完重启 DSH Web 即生效", the plugin list must match'
	);
});
