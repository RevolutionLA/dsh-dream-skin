/**
 * dsh-dream-skin — plugin-list icon guard (issue #58).
 *
 * `readPluginMeta()` in @deepseek-ai/dsh-app-boot (0.1.7-alpha.1+) reads
 * `package.json: icon` through `iconOf()`, which throws on any of: absolute or
 * URL-looking path, extension outside SVG/PNG/JPEG/WebP, realpath escaping the
 * manifest directory, non-regular file, or a size above 256 KiB (checked on both
 * stat and the decoded bytes). A throw does not drop the icon only — it returns
 * `{ ...text, error }`, so the plugin list shows a diagnostic instead of an icon.
 * The icon is then base64-inlined as a data URL, so its raw size is paid on every
 * list render. These checks mirror the host's, and add our own 32 KiB budget.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pkg = require('../package.json');

// Mirror of the host's ICON_MEDIA_TYPES / MAX_ICON_BYTES.
const MEDIA_TYPES = new Map([
	['.svg', 'image/svg+xml'],
	['.png', 'image/png'],
	['.jpg', 'image/jpeg'],
	['.jpeg', 'image/jpeg'],
	['.webp', 'image/webp'],
]);
const HOST_MAX_ICON_BYTES = 256 * 1024;
// Ours: the host inlines the file as a data URL, so ~4/3 of these bytes are
// embedded in the plugin list payload.
const ICON_BUDGET_BYTES = 32 * 1024;

const icon = pkg.icon;
const iconPath = path.join(ROOT, icon);

test('icon: package.json declares a relative icon path the host will accept', () => {
	assert.equal(typeof icon, 'string', 'package.json "icon" must be a string');
	assert.ok(icon.trim().length > 0, 'an empty "icon" makes iconOf() throw and the whole entry loses its text');
	assert.ok(
		!path.isAbsolute(icon) && !path.win32.isAbsolute(icon) && !/^[A-Za-z][A-Za-z\d+.-]*:/u.test(icon),
		`"icon": ${JSON.stringify(icon)} must stay relative — absolute paths and URLs throw in iconOf()`,
	);
	assert.ok(
		MEDIA_TYPES.has(path.extname(icon).toLowerCase()),
		`"icon": ${icon} must use one of ${[...MEDIA_TYPES.keys()].join(', ')}`,
	);
});

test('icon: the file exists, stays inside the package directory, and is a regular file', () => {
	const directory = fs.realpathSync(ROOT);
	const file = fs.realpathSync(iconPath);
	const local = path.relative(directory, file);
	assert.ok(
		local !== '..' && !local.startsWith(`..${path.sep}`) && !path.isAbsolute(local),
		`realpath("${icon}") resolves outside the package (${file}); iconOf() rejects it`,
	);
	assert.ok(fs.statSync(file).isFile(), `${icon} must be a regular file`);
});

test('icon: size fits the host cap and our inline budget', () => {
	const bytes = fs.readFileSync(iconPath);
	assert.ok(bytes.length <= HOST_MAX_ICON_BYTES, `${icon} is ${bytes.length} B — iconOf() throws above ${HOST_MAX_ICON_BYTES} B`);
	assert.ok(
		bytes.length <= ICON_BUDGET_BYTES,
		`${icon} is ${bytes.length} B — over the ${ICON_BUDGET_BYTES} B budget for a data URL inlined into every plugin list render`,
	);
});

test('icon: ships in the tarball', () => {
	const target = path.normalize(icon);
	const owned = pkg.files.some((entry) => {
		const root = path.normalize(entry);
		return root === target || target.startsWith(`${root}${path.sep}`);
	});
	assert.ok(owned, `${icon} must be listed in package.json "files" or it never reaches the installed plugin`);
});

test('icon: an SVG is self-contained (a data URL cannot fetch external resources)', () => {
	if (path.extname(icon).toLowerCase() !== '.svg') return;
	const source = fs.readFileSync(iconPath, 'utf8');
	assert.ok(/^<svg[\s>]/u.test(source.trim()), `${icon} must start with an <svg> root`);
	assert.ok(!/<script|href\s*=\s*["'](?!#)[a-z]+:/iu.test(source), `${icon} must not reference external resources or scripts — a data-URL SVG cannot load them`);
});
