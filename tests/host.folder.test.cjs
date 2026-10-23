/**
 * dsh-dream-skin — host half: the wallpaper-folder routes (issue #61, rotation
 * over local photos).
 *
 * The page reaches a local folder through two things only: `POST
 * {method:"folder-list"}` and `GET /dream-skin/api/folder/file?name=…`. The
 * folder comes from the persisted setting, never from a request, so these cases
 * run against a real HTTP server wrapping the real route handler and a real
 * directory tree (symlinks included): what a path-handling bug looks like on
 * disk is not something a mocked `fs` can show.
 *
 * The attacks are written as attacks: each refusal below has a reverse leg in
 * the same case that proves the route still serves the legitimate neighbor, so
 * "everything is refused" cannot pass as "the fence works".
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');

// Count the stats the host makes (patched BEFORE lib/index.js is first imported, so its binding is the counting one).
const fsPromises = require('node:fs/promises');
const realLstat = fsPromises.lstat;
let lstatCalls = 0;
fsPromises.lstat = (...args) => { lstatCalls++; return realLstat(...args); };

let mod;
async function loadIndex() {
	if (!mod) mod = await import('../lib/index.js');
	return mod;
}

const FOLDER_KEY = 'dsh-dream-skin:wallpaper-folder';

/** A valid 1x1 PNG whose pixel is `shade`, so two files differ byte-for-byte. */
function png(shade) {
	const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
	const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
	const chunk = (type, data) => {
		const t = Buffer.from(type);
		const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
		const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(Buffer.concat([t, data])));
		return Buffer.concat([len, t, data, sum]);
	};
	const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 0;
	return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.from([0, shade]))), chunk('IEND', Buffer.alloc(0))]);
}

/** A throwaway DSH_HOME plus a throwaway photo folder, and a server around the real handler. */
async function fixture(t, { folder } = {}) {
	const { apply } = await loadIndex();
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-folder-'));
	const home = path.join(root, 'home');
	const photos = path.join(root, 'photos');
	const outside = path.join(root, 'outside');
	for (const d of [home, photos, outside]) fs.mkdirSync(d);
	const realHome = process.env.DSH_HOME;
	const realHomeDir = process.env.HOME;
	process.env.DSH_HOME = home;
	let captured = null;
	apply({ effect: (fn) => fn(), get: () => undefined, webServer: { register: (route) => { captured = route; return () => {}; } } });
	const server = http.createServer((req, res) => { captured.handler(req, res); });
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const port = server.address().port;
	const setFolder = (value) => fs.writeFileSync(path.join(home, 'dream-skin.json'), JSON.stringify(value === undefined ? {} : { [FOLDER_KEY]: value }));
	setFolder(folder === undefined ? photos : folder);
	t.after(() => {
		server.close();
		server.closeAllConnections?.();
		if (realHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = realHome;
		if (realHomeDir === undefined) delete process.env.HOME; else process.env.HOME = realHomeDir;
		fs.rmSync(root, { recursive: true, force: true });
	});
	/** One request with explicit headers (fetch will not let a test choose Host). */
	const call = (opts) => new Promise((resolve, reject) => {
		const req = http.request({ host: '127.0.0.1', port, method: opts.method || 'GET', path: opts.path, headers: { host: `127.0.0.1:${port}`, ...(opts.headers || {}) } }, (res) => {
			const chunks = [];
			res.on('data', (c) => chunks.push(c));
			res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
		});
		req.on('error', reject);
		if (opts.body) req.write(opts.body);
		req.end();
	});
	const list = async () => JSON.parse((await call({ method: 'POST', path: '/dream-skin/api', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'folder-list' }) })).body.toString());
	const file = (name) => call({ path: `/dream-skin/api/folder/file?name=${encodeURIComponent(name)}` });
	return { root, home, photos, outside, port, call, list, file, setFolder };
}

test('folder list: images in human order, nothing else — dotfiles, svg, heic, subfolders, empty and oversize files and every symlink stay out', async (t) => {
	const f = await fixture(t);
	for (const [name, shade] of [['img10.png', 10], ['img2.png', 2], ['IMG1.JPG', 1], ['a b.webp', 4], ['八骏图 final.jpeg', 5], ['x.gif', 6], ['y.avif', 7], ['z.bmp', 8]]) fs.writeFileSync(path.join(f.photos, name), png(shade));
	for (const name of ['.hidden.png', 'vector.svg', 'phone.heic', 'notes.txt', 'noext']) fs.writeFileSync(path.join(f.photos, name), png(9));
	fs.writeFileSync(path.join(f.photos, 'empty.png'), '');
	fs.writeFileSync(path.join(f.photos, 'huge.png'), '');
	fs.truncateSync(path.join(f.photos, 'huge.png'), 41 * 1024 * 1024);
	fs.mkdirSync(path.join(f.photos, 'album'));
	fs.writeFileSync(path.join(f.photos, 'album', 'nested.png'), png(3));
	fs.writeFileSync(path.join(f.outside, 'secret.png'), png(99));
	fs.symlinkSync(path.join(f.outside, 'secret.png'), path.join(f.photos, 'escape.png'));
	fs.symlinkSync(path.join(f.photos, 'img2.png'), path.join(f.photos, 'alias.png'));
	const answer = await f.list();
	assert.equal(answer.ok, true);
	assert.deepEqual(answer.value.files.map((x) => x.name), ['a b.webp', 'IMG1.JPG', 'img2.png', 'img10.png', 'x.gif', 'y.avif', 'z.bmp', '八骏图 final.jpeg'], 'sorted like a person sorts, only real image files');
	assert.equal(answer.value.truncated, false);
	for (const entry of answer.value.files) assert.deepEqual(Object.keys(entry).sort(), ['mtimeMs', 'name', 'size'], 'the entry carries exactly name, size and mtimeMs');
	assert.ok(!JSON.stringify(answer).includes(f.photos), 'no path leaks into the answer');
});

test('folder list: a folder over the cap is cut and says so', async (t) => {
	const f = await fixture(t);
	const one = png(1);
	for (let i = 0; i < 2003; i++) fs.writeFileSync(path.join(f.photos, `p${String(i).padStart(4, '0')}.png`), one);
	const answer = await f.list();
	assert.equal(answer.value.files.length, 2000, 'sample 1: the listing is capped');
	assert.equal(answer.value.truncated, true, 'sample 2: and the answer admits it');
	assert.equal(answer.value.files[0].name, 'p0000.png');
});

test('folder list: unset, relative, missing and not-a-directory each answer a stable code and no path', async (t) => {
	const f = await fixture(t);
	const code = async () => { const a = await f.list(); assert.equal(a.ok, false); assert.ok(!JSON.stringify(a).includes(f.root), 'no path in the error'); return a.error.code; };
	f.setFolder(undefined);
	assert.equal(await code(), 'folder-unset');
	f.setFolder('   ');
	assert.equal(await code(), 'folder-unset');
	f.setFolder('photos/relative');
	assert.equal(await code(), 'folder-not-absolute');
	f.setFolder(path.join(f.root, 'nope'));
	assert.equal(await code(), 'folder-missing');
	fs.writeFileSync(path.join(f.root, 'plain.txt'), 'x');
	f.setFolder(path.join(f.root, 'plain.txt'));
	assert.equal(await code(), 'folder-not-directory');
	// Reverse leg: the same server answers once the setting is sane again.
	fs.writeFileSync(path.join(f.photos, 'a.png'), png(1));
	f.setFolder(f.photos);
	assert.equal((await f.list()).value.files.length, 1);
});

test('folder: "~/" expands to the home directory and a symlinked folder is followed to its real path', async (t) => {
	const f = await fixture(t);
	process.env.HOME = f.root;
	fs.writeFileSync(path.join(f.photos, 'a.png'), png(1));
	f.setFolder('~/photos');
	assert.deepEqual((await f.list()).value.files.map((x) => x.name), ['a.png'], '~/photos resolves under HOME');
	const link = path.join(f.root, 'photos-link');
	fs.symlinkSync(f.photos, link);
	f.setFolder(link);
	assert.deepEqual((await f.list()).value.files.map((x) => x.name), ['a.png'], 'a folder that is itself a symlink is allowed: the user chose it');
	assert.equal((await f.file('a.png')).status, 200, 'and its images are served');
});

test('folder file: serves the bytes with the hardening headers, including a Chinese name with a space', async (t) => {
	const f = await fixture(t);
	const bytes = png(42);
	fs.writeFileSync(path.join(f.photos, '八骏图 final.png'), bytes);
	const res = await f.file('八骏图 final.png');
	assert.equal(res.status, 200);
	assert.ok(res.body.equals(bytes), 'the response is the file, byte for byte');
	assert.equal(res.headers['content-type'], 'image/png');
	assert.equal(res.headers['content-length'], String(bytes.length));
	assert.equal(res.headers['x-content-type-options'], 'nosniff');
	assert.equal(res.headers['content-security-policy'], "sandbox; default-src 'none'");
	assert.equal(res.headers['cache-control'], 'no-store');
	assert.equal(res.headers['content-disposition'], 'inline');
});

test('folder file: names that are not a plain image basename are refused with a bodiless 404, and the neighbor is still served', async (t) => {
	const f = await fixture(t);
	fs.writeFileSync(path.join(f.photos, 'ok.png'), png(1));
	fs.writeFileSync(path.join(f.outside, 'secret.png'), png(99));
	fs.writeFileSync(path.join(f.photos, '.hidden.png'), png(2));
	fs.writeFileSync(path.join(f.photos, 'vector.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>');
	fs.writeFileSync(path.join(f.photos, 'notes.txt'), 'x');
	fs.mkdirSync(path.join(f.photos, 'album'));
	fs.writeFileSync(path.join(f.photos, 'album', 'nested.png'), png(3));
	fs.mkdirSync(path.join(f.photos, 'dir.png'));
	fs.symlinkSync(path.join(f.outside, 'secret.png'), path.join(f.photos, 'escape.png'));
	fs.symlinkSync(path.join(f.photos, 'ok.png'), path.join(f.photos, 'alias.png'));
	fs.writeFileSync(path.join(f.photos, 'huge.png'), '');
	fs.truncateSync(path.join(f.photos, 'huge.png'), 41 * 1024 * 1024);
	const refused = ['../outside/secret.png', '..%2Foutside%2Fsecret.png', 'album/nested.png', 'album\\nested.png', path.join(f.outside, 'secret.png'), '.hidden.png', '..', '.', '', 'vector.svg', 'notes.txt', 'dir.png', 'escape.png', 'alias.png', 'huge.png', 'missing.png', 'ok.png\u0000.txt', 'ok.png\n', 'a'.repeat(300) + '.png'];
	for (const name of refused) {
		const res = await f.file(name);
		assert.equal(res.status, 404, `${JSON.stringify(name)} is refused`);
		assert.equal(res.body.length, 0, `${JSON.stringify(name)}: no body, so nothing to learn from the refusal`);
	}
	assert.equal((await f.call({ path: '/dream-skin/api/folder/file' })).status, 404, 'no name at all');
	assert.equal((await f.file('ok.png')).status, 200, 'reverse leg: the legitimate neighbor is served after all that');
});

test('folder file: the folder is the persisted setting — a `folder` in the request changes nothing', async (t) => {
	const f = await fixture(t);
	fs.writeFileSync(path.join(f.outside, 'elsewhere.png'), png(7));
	fs.writeFileSync(path.join(f.photos, 'here.png'), png(8));
	for (const q of [`folder=${encodeURIComponent(f.outside)}`, `dir=${encodeURIComponent(f.outside)}`, `root=/`]) {
		assert.equal((await f.call({ path: `/dream-skin/api/folder/file?name=elsewhere.png&${q}` })).status, 404, `${q} is ignored`);
	}
	assert.equal((await f.call({ path: `/dream-skin/api/folder/file?name=here.png&folder=${encodeURIComponent(f.outside)}` })).status, 200, 'reverse leg: the configured folder still answers');
	const answer = await (async () => JSON.parse((await f.call({ method: 'POST', path: '/dream-skin/api', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method: 'folder-list', folder: f.outside }) })).body.toString()))();
	assert.deepEqual(answer.value.files.map((x) => x.name), ['here.png'], 'folder-list ignores a folder in the body too');
});

test('folder routes keep the trust fence and the method rules', async (t) => {
	const f = await fixture(t);
	fs.writeFileSync(path.join(f.photos, 'a.png'), png(1));
	const p = '/dream-skin/api/folder/file?name=a.png';
	assert.equal((await f.call({ path: p })).status, 200, 'sample 1: a loopback same-origin GET is served');
	assert.equal((await f.call({ path: p, headers: { host: 'evil.example.com' } })).status, 403, 'a foreign Host is refused (DNS rebinding)');
	assert.equal((await f.call({ path: p, headers: { 'sec-fetch-site': 'cross-site' } })).status, 403, 'a cross-site request is refused');
	assert.equal((await f.call({ path: p, headers: { origin: 'http://evil.example.com' } })).status, 403, 'a foreign Origin is refused');
	assert.equal((await f.call({ path: p, headers: { 'sec-fetch-site': 'same-origin' } })).status, 200, 'sample 2: a same-origin browser request still passes');
	const posted = await f.call({ method: 'POST', path: '/dream-skin/api/folder/file?name=a.png', headers: { 'content-type': 'application/json' }, body: '{}' });
	assert.equal(posted.status, 400, 'a POST on the image path is just a malformed API call');
	assert.ok(!String(posted.headers['content-type']).startsWith('image/'), 'and never answers an image');
	assert.equal((await f.call({ path: '/dream-skin/api' })).status, 405, 'a GET anywhere else on the API is still a method error');
	assert.equal((await f.call({ path: '/dream-skin/api/folder/other?name=a.png' })).status, 405, 'and so is a GET on any other subpath');
	assert.equal((await f.call({ method: 'POST', path: '/dream-skin/api', headers: { 'content-type': 'text/plain' }, body: '{"method":"folder-list"}' })).status, 415, 'folder-list needs a JSON body like every method');
});

test('folder file: a client that hangs up mid-download does not hurt the next request', async (t) => {
	const f = await fixture(t);
	const big = Buffer.concat([png(1), Buffer.alloc(8 * 1024 * 1024, 7)]);
	fs.writeFileSync(path.join(f.photos, 'big.png'), big);
	fs.writeFileSync(path.join(f.photos, 'small.png'), png(2));
	await new Promise((resolve) => {
		const req = http.request({ host: '127.0.0.1', port: f.port, path: '/dream-skin/api/folder/file?name=big.png', headers: { host: `127.0.0.1:${f.port}` } }, (res) => {
			res.once('data', () => { req.destroy(); setTimeout(resolve, 150); });
		});
		req.on('error', () => {});
		req.end();
	});
	const res = await f.file('small.png');
	assert.equal(res.status, 200, 'the route survived the aborted stream');
	assert.ok(res.body.equals(png(2)));
});

test('folder list: a huge folder costs at most the cap in stats — names are sorted first, then stat\'ed in order until the cap', async (t) => {
	const f = await fixture(t);
	const one = png(1);
	for (let i = 0; i < 3000; i++) fs.writeFileSync(path.join(f.photos, `p${String(i).padStart(4, '0')}.png`), one);
	lstatCalls = 0;
	const answer = await f.list();
	assert.equal(answer.value.files.length, 2000, 'sample 1: the cap holds');
	assert.equal(answer.value.truncated, true, 'and the answer admits it');
	assert.ok(lstatCalls <= 2000 + 2, `sample 2: at most the cap in stats (+ the folder itself), saw ${lstatCalls}`);
});
