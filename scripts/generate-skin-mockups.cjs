// Generate "mini-UI" previews for each skin.
//
// These are NOT mood boards. Every pixel of colour on the card is a token (or
// the skin's own glow string) pulled from scripts/skin-system.cjs — the same
// generator that writes the shipped SKINS block. So a card is a truthful,
// shrunken screenshot of what the user actually gets: real canvas, real
// sidebar, real bubbles, real composer, real accent, real hairlines.
//
// Screenshot via headless Chrome → docs/previews/*.png
//   node scripts/generate-skin-mockups.cjs            (writes html + png + manifest)
//   node scripts/generate-skin-mockups.cjs --html-only (cards only, no browser, no manifest)
//   node scripts/generate-skin-mockups.cjs --check    (verify fingerprints, no browser)
//
// Issue #83 — the PNGs are committed but they are NOT shipped in the npm
// tarball (see `files` in package.json), and they are now fingerprinted. Two
// separate holes were open:
//
//   1. `npm run previews` returned 0 when no headless browser was found, so a
//      machine that produced zero images reported success;
//   2. nothing connected the image bytes to the design system. The README
//      claimed "these are the skins you get" and a re-rolled palette left the
//      PNGs byte-identical — measured, not assumed.
//
// `docs/previews/manifest.json` closes (2): each entry carries a hash of the
// skin's shipped tokens, a hash of the rendered card markup, and the hash,
// byte-size and pixel size of the PNG on disk. `--check` recomputes all of
// them. Re-roll a colour in scripts/skin-system.cjs without re-shooting and the
// tokens hash no longer matches: red, by name.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { SKINS } = require('./skin-data.cjs');
const { buildAll } = require('./skin-system.cjs');

const ROOT = path.join(__dirname, '..');
const OUT_HTML = path.join(ROOT, 'tmp-skin-mockups');
const OUT_PNG = path.join(ROOT, 'docs', 'previews');
const MANIFEST = path.join(OUT_PNG, 'manifest.json');

const W = 720;
const H = 460;
const SCALE = 2;

/**
 * Where a browser habitually lives. Absolute paths on purpose: `PATH` is not a
 * reliable directory of browsers and an empty `PATH` must not read as "no
 * browser" on a machine that has one.
 */
const CHROME_CANDIDATES = [
	'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
	'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

/**
 * An explicit CHROME_PATH is authoritative: if the user names a browser we use
 * that one or we fail. Falling through to auto-detection after being told
 * otherwise is how you get "I set CHROME_PATH and it still shot with the wrong
 * engine" — and it is also what made the no-browser path silent (issue #83).
 *
 * The candidate list is a parameter so the failure branch is reachable from a
 * test on a machine that has a browser installed (see tests/previews.test.cjs).
 */
function findChrome(env = process.env, candidates = CHROME_CANDIDATES) {
	if (env.CHROME_PATH) {
		return fs.existsSync(env.CHROME_PATH)
			? { path: env.CHROME_PATH, why: 'CHROME_PATH' }
			: { path: null, why: `CHROME_PATH is set to ${env.CHROME_PATH}, which does not exist` };
	}
	for (const p of candidates) {
		try {
			if (fs.existsSync(p)) return { path: p, why: 'auto-detected' };
		} catch {}
	}
	return { path: null, why: `no headless browser found; looked at ${candidates.length} known locations` };
}

// hex helpers — only used for the accent gradient / glow, never for a token
function hexToRgb(h) {
	h = String(h).replace('#', '');
	if (h.length === 3) h = h.split('').map((c) => c + c).join('');
	return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function lighten(h, amt = 0.28) {
	const [r, g, b] = hexToRgb(h);
	const m = (c) => Math.min(255, Math.round(c + (255 - c) * amt));
	return `rgb(${m(r)},${m(g)},${m(b)})`;
}
function shade(h, a) {
	const [r, g, b] = hexToRgb(h);
	return `rgba(${r},${g},${b},${a})`;
}

function card(s) {
	const dark = s.colorScheme === 'dark';
	// A translucent pane only reads as glass if something sits behind it; give
	// light skins a soft shadow instead of the dark skins' heavy one.
	const paneShadow = dark
		? `0 24px 60px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.055)`
		: `0 18px 44px rgba(15,23,42,.10), inset 0 1px 0 rgba(255,255,255,.72)`;
	const blur = s.defaults.material === 'liquid' ? 26 : 14;
	const navText = dark ? s.text2 : s.text2;

	return `<!DOCTYPE html>
<html lang="zh-CN" ${dark ? 'data-ds-dark-theme' : 'data-ds-light-theme'}>
<head>
<meta charset="utf-8"/>
<style>
	*{box-sizing:border-box;margin:0;padding:0}
	html,body{width:${W}px;height:${H}px;overflow:hidden}
	body{font-family:-apple-system,"SF Pro Text","Segoe UI",system-ui,sans-serif;
		-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
	.bg{position:absolute;inset:0;background:${s.bg}}

	.stage{position:absolute;left:40px;top:38px;width:640px;height:352px;
		display:flex;border-radius:16px;overflow:hidden;
		background:${s.panel2};
		border:1px solid ${s.panelBorder};
		box-shadow:${paneShadow};
		backdrop-filter:blur(${blur}px);-webkit-backdrop-filter:blur(${blur}px)}

	/* ---- sidebar: the skin's own sidebar fill, active item, hairline ---- */
	.rail{width:150px;flex:0 0 150px;background:${s.sidebar};
		border-right:1px solid ${s.hairline};padding:14px 11px;
		display:flex;flex-direction:column;gap:9px}
	.rail .mark{width:22px;height:22px;border-radius:7px;
		background:linear-gradient(140deg,${s.accent},${lighten(s.accent)});
		box-shadow:0 4px 12px ${shade(s.accent, dark ? .45 : .3)}}
	.rail .new{margin-top:6px;height:26px;border-radius:8px;
		background:${s.active};display:flex;align-items:center;padding:0 9px;gap:6px}
	.rail .new i{width:5px;height:5px;border-radius:50%;background:${s.accent};display:block}
	.rail .new span{font-size:9.5px;font-weight:600;color:${s.text1};letter-spacing:.2px}
	.rail .item{height:20px;border-radius:6px;background:${s.sidebarActive};opacity:.55}
	.rail .item.a{width:104px}.rail .item.b{width:88px}.rail .item.c{width:96px}
	.rail .spacer{flex:1}
	.rail .me{display:flex;align-items:center;gap:7px}
	.rail .me i{width:16px;height:16px;border-radius:50%;background:${s.accent};opacity:.9;display:block}
	.rail .me u{width:56px;height:6px;border-radius:3px;background:${s.text3};opacity:.5;text-decoration:none;display:block}

	/* ---- conversation ---- */
	.chat{flex:1;padding:18px 20px;display:flex;flex-direction:column;gap:11px;min-width:0}
	.chat .head{display:flex;align-items:center;justify-content:space-between;
		padding-bottom:10px;border-bottom:1px solid ${s.hairline}}
	.chat .head b{font-size:11.5px;font-weight:650;color:${s.text1};letter-spacing:.2px}
	.chat .head em{font-style:normal;font-size:9px;color:${s.text3};letter-spacing:.3px}

	.row{display:flex}
	.row.me{justify-content:flex-end}
	.row.me .bubble{width:206px}
	.bubble{width:318px;max-width:100%;border-radius:12px;padding:12px 14px;
		background:${s.bubble};
		border:1px solid ${s.hairline}}
	.bubble.slim{width:268px}
	.bubble .l{height:6px;border-radius:3px;background:${s.text1};opacity:.82}
	.bubble .l + .l{margin-top:6px}
	.bubble .l.s{width:88%;background:${s.text2};opacity:.62}
	.bubble .l.t{width:62%;background:${s.text3};opacity:.5}
	.row.me .bubble{background:${s.accent};border-color:transparent}
	.row.me .bubble .l{background:${s.brandText};opacity:.92}
	.row.me .bubble .l.s,.row.me .bubble .l.t{opacity:.7}

	.tags{display:flex;gap:6px;margin-top:2px}
	.tags u{text-decoration:none;font-size:8.5px;letter-spacing:.3px;padding:3px 8px;border-radius:999px}
	.tags .ok{color:${s.success};background:${dark ? 'rgba(110,216,137,.14)' : 'rgba(21,128,61,.10)'}}
	.tags .wn{color:${s.warn};background:${dark ? 'rgba(250,192,83,.14)' : 'rgba(180,120,8,.10)'}}
	.tags .er{color:${s.error};background:${dark ? 'rgba(239,103,92,.14)' : 'rgba(190,50,45,.10)'}}

	.spacer{flex:1}
	/* ---- composer: the skin's own input token ---- */
	.composer{display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:12px;
		background:${s.input};border:1px solid ${s.hairline}}
	.composer u{text-decoration:none;flex:1;height:7px;border-radius:4px;background:${s.text3};opacity:.42}
	.composer .send{width:24px;height:24px;border-radius:8px;background:${s.accent};
		display:flex;align-items:center;justify-content:center}
	.composer .send i{width:8px;height:8px;border-radius:2px;
		background:${s.brandText};display:block;transform:rotate(45deg)}

	/* ---- labels ---- */
	.name{position:absolute;left:42px;bottom:26px;font-size:13px;font-weight:700;
		color:${s.text1};letter-spacing:.3px}
	.hex{position:absolute;left:42px;bottom:12px;font-size:9.5px;color:${s.text3};
		letter-spacing:.6px;font-variant-numeric:tabular-nums}
	.zh{position:absolute;left:150px;bottom:22px;font-size:10px;color:${navText};
		letter-spacing:.4px;font-weight:600}
	.tag{position:absolute;right:42px;bottom:22px;font-size:9px;font-weight:700;letter-spacing:.7px;
		color:${s.accent};padding:4px 11px;border-radius:999px;background:${s.accentSoft}}
</style>
</head>
<body>
	<div class="bg"></div>
	<div class="stage">
		<div class="rail">
			<div class="mark"></div>
			<div class="new"><i></i><span>新对话</span></div>
			<div class="item a"></div>
			<div class="item b"></div>
			<div class="item c"></div>
			<div class="spacer"></div>
			<div class="me"><i></i><u></u></div>
		</div>
		<div class="chat">
			<div class="head"><b>${s.labels.en}</b><em>${s.labels.style}</em></div>
			<div class="row"><div class="bubble"><div class="l"></div><div class="l s"></div><div class="l t"></div></div></div>
			<div class="row me"><div class="bubble"><div class="l"></div><div class="l s"></div></div></div>
			<div class="row"><div class="bubble slim"><div class="l"></div><div class="l s"></div></div></div>
			<div class="tags"><u class="ok">成功</u><u class="wn">警告</u><u class="er">错误</u></div>
			<div class="spacer"></div>
			<div class="composer"><u></u><div class="send"><i></i></div></div>
		</div>
	</div>
	<div class="name">${s.labels.en}</div>
	<div class="zh">${s.zh}</div>
	<div class="hex">${s.accent} · ${s.base}</div>
	<div class="tag">${dark ? 'DARK' : 'LIGHT'} · ${s.defaults.material.toUpperCase()}</div>
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Fingerprints (issue #83)
// ---------------------------------------------------------------------------
//
// A PNG cannot be diffed and cannot be reviewed in a pull request, so the only
// way to know it still depicts the skins we ship is to bind it to the numbers
// that produced it. Two hashes per skin, because they fail for different
// reasons and want different fixes:
//
//   tokens  the shipped palette. A mismatch means a colour changed and nobody
//           re-shot the images — the README is now advertising an old skin.
//   card    the rendered markup. A mismatch means the LAYOUT changed (widths,
//           radii, which token paints which box, the label copy), so the same
//           palette is drawn differently.

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

/**
 * The design system's contribution: the shipped tokens, plus the glow and the
 * defaults, which the card also draws from. Taken from `buildAll()` — the same
 * source that writes the bundle — never from the `skin-data.cjs` projection.
 * The projection is pinned to these tokens by its own gate; hashing it here
 * would let a projection bug hide inside the preview fingerprint.
 */
function tokenFingerprint(designSkin) {
	const tokens = Object.entries(designSkin.tokens)
		.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
		.map(([k, v]) => `${k}=${v}`);
	const extras = [
		`colorScheme=${designSkin.colorScheme}`,
		`glow=${designSkin.glow}`,
		...Object.entries(designSkin.defaults)
			.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
			.map(([k, v]) => `default.${k}=${v}`)
	];
	return sha256([...tokens, ...extras].join('\n'));
}

/**
 * The renderer's contribution: the markup `card()` produces from the skin.
 * `card()` is a template literal, so its output inherits the newline style of
 * THIS FILE. Normalise before hashing — the fingerprint is about layout, and a
 * CRLF checkout must not read as a layout change. (`.gitattributes` pins LF as
 * well, see issue #82; this is the belt to that braces.)
 */
function cardFingerprint(projection) {
	return sha256(card(projection).replace(/\r\n/g, '\n'));
}

function previewFingerprint(designSkin, projection) {
	return { tokens: tokenFingerprint(designSkin), card: cardFingerprint(projection) };
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Pixel dimensions straight out of the IHDR chunk — no image library. */
function readPngSize(buf) {
	if (!buf || buf.length < 24) return null;
	if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
	if (buf.toString('latin1', 12, 16) !== 'IHDR') return null;
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Build the manifest from the current design system and what is on disk. */
function writeManifest() {
	const designs = new Map(buildAll().map((s) => [s.id, s]));
	const skins = {};
	for (const [id, projection] of Object.entries(SKINS)) {
		const design = designs.get(id);
		if (!design) throw new Error(`skin-data.cjs previews "${id}", but the design system does not define it`);
		const file = path.join(OUT_PNG, `${id}.png`);
		const bytes = fs.readFileSync(file);
		const size = readPngSize(bytes);
		const fp = previewFingerprint(design, projection);
		skins[id] = {
			tokens: fp.tokens,
			card: fp.card,
			png: {
				sha256: sha256(bytes),
				bytes: bytes.length,
				width: size ? size.width : null,
				height: size ? size.height : null
			}
		};
	}
	const manifest = {
		// No timestamp on purpose: `--check` compares this file to a fresh
		// computation, and a clock field would make every run look like drift.
		// The images' git history is the record of when they were taken.
		note: 'generated by scripts/generate-skin-mockups.cjs -- see issue #83; re-run `npm run previews` after any design-system change',
		generator: { width: W * SCALE, height: H * SCALE, scale: SCALE },
		skins
	};
	fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, '\t') + '\n', 'utf8');
	return manifest;
}

/**
 * Verify the committed previews against the design system and against their own
 * bytes. Pure: every input is a parameter, so `tests/previews.test.cjs` can
 * hand it a deliberately broken skin or directory and require a specific
 * complaint. Returns { ok, problems, checked, bytes }.
 */
function checkPreviews({
	skins = buildAll(),
	projections = SKINS,
	manifestPath = MANIFEST,
	pngDir = OUT_PNG
} = {}) {
	const problems = [];
	let manifest = null;
	try {
		manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	} catch (e) {
		return { ok: false, problems: [`manifest unreadable (${manifestPath}): ${e.message}`], checked: 0, bytes: 0 };
	}

	const expected = { width: W * SCALE, height: H * SCALE };
	const gen = manifest.generator || {};
	if (gen.width !== expected.width || gen.height !== expected.height) {
		problems.push(
			`generator: manifest was shot at ${gen.width}x${gen.height}, this script now shoots at ` +
				`${expected.width}x${expected.height} — re-run \`npm run previews\``
		);
	}

	let bytes = 0;
	let checked = 0;
	for (const design of skins) {
		const id = design.id;
		const projection = projections[id];
		if (!projection) {
			problems.push(`${id}: the design system ships this skin but scripts/skin-data.cjs has no preview for it`);
			continue;
		}
		const entry = manifest.skins && manifest.skins[id];
		if (!entry) {
			problems.push(`${id}: no manifest entry — run \`npm run previews\``);
			continue;
		}
		const fp = previewFingerprint(design, projection);
		if (entry.tokens !== fp.tokens) {
			problems.push(
				`${id}: the shipped palette changed since the preview was shot (tokens ${String(entry.tokens).slice(0, 12)} != ` +
					`${fp.tokens.slice(0, 12)}) — the README is advertising a skin we no longer ship; re-run \`npm run previews\``
			);
		}
		if (entry.card !== fp.card) {
			problems.push(`${id}: the card layout changed since the preview was shot — re-run \`npm run previews\``);
		}

		const file = path.join(pngDir, `${id}.png`);
		let buf;
		try {
			buf = fs.readFileSync(file);
		} catch {
			problems.push(`${id}: ${path.relative(ROOT, file)} is missing`);
			continue;
		}
		checked += 1;
		bytes += buf.length;

		if (sha256(buf) !== entry.png.sha256) {
			problems.push(`${id}: the PNG bytes do not match the manifest (edit the generator and re-shoot, not the image)`);
		} else if (buf.length !== entry.png.bytes) {
			problems.push(`${id}: the PNG is ${buf.length} bytes, the manifest says ${entry.png.bytes}`);
		}
		const size = readPngSize(buf);
		if (!size) {
			problems.push(`${id}: not a readable PNG`);
		} else if (size.width !== expected.width || size.height !== expected.height) {
			problems.push(
				`${id}: the PNG is ${size.width}x${size.height}, expected ${expected.width}x${expected.height} ` +
					`(${W}x${H} at ${SCALE}x) — a @1x image cannot sit in a @2x table`
			);
		}
	}

	const known = new Set(skins.map((s) => s.id));
	for (const id of Object.keys((manifest && manifest.skins) || {})) {
		if (!known.has(id)) problems.push(`${id}: the manifest lists a preview for a skin that no longer exists`);
	}
	for (const id of Object.keys(projections)) {
		if (!known.has(id)) problems.push(`${id}: scripts/skin-data.cjs projects a preview for a skin that no longer exists`);
	}

	return { ok: problems.length === 0, problems, checked, bytes };
}

function checkCli() {
	const verdict = checkPreviews();
	if (verdict.ok) {
		console.log(
			`preview fingerprints match the design system (${verdict.checked} skins, ${verdict.bytes} bytes of PNG)`
		);
		return;
	}
	console.error(`preview fingerprints: ${verdict.problems.length} problem(s)`);
	for (const p of verdict.problems) console.error(`  ${p}`);
	process.exitCode = 1;
}

function main() {
	const argv = process.argv.slice(2);
	if (argv.includes('--check')) return checkCli();

	const htmlOnly = argv.includes('--html-only');
	fs.mkdirSync(OUT_HTML, { recursive: true });
	fs.mkdirSync(OUT_PNG, { recursive: true });

	const ids = Object.keys(SKINS);
	for (const id of ids) {
		fs.writeFileSync(path.join(OUT_HTML, `${id}.html`), card(SKINS[id]), 'utf8');
	}
	console.log('wrote', ids.length, 'mini-UI mockups ->', OUT_HTML);
	if (htmlOnly) {
		// Deliberately no manifest: the PNGs on disk are still the old ones, so
		// writing new hashes here would make the gate agree with a half-done run.
		console.log('--html-only: manifest untouched (the PNGs were not re-shot)');
		return;
	}

	const chrome = findChrome();
	if (!chrome.path) {
		console.error(`! ${chrome.why}`);
		console.error('  refusing to report success: this run produced no preview images.');
		console.error('  install Chrome/Chromium, or point CHROME_PATH at a browser binary.');
		process.exitCode = 1;
		return;
	}
	console.log('browser:', chrome.path, `(${chrome.why})`);
	for (const id of ids) {
		const file = path.join(OUT_HTML, `${id}.html`);
		execFileSync(
			chrome.path,
			[
				'--headless=new',
				'--disable-gpu',
				'--hide-scrollbars',
				'--force-device-scale-factor=' + SCALE,
				'--window-size=' + W + ',' + H,
				'--screenshot=' + path.join(OUT_PNG, `${id}.png`),
				'--default-background-color=00000000',
				'file:///' + file.replace(/\\/g, '/')
			],
			{ stdio: ['ignore', 'ignore', 'ignore'] }
		);
		console.log('  shot', id + '.png');
	}

	writeManifest();
	console.log('wrote', ids.length, 'previews + manifest ->', OUT_PNG);

	// Self-check the run before claiming success: a screenshot that silently
	// produced a wrong-sized or truncated file is worse than a failed run.
	const verdict = checkPreviews();
	if (!verdict.ok) {
		console.error('! the previews just written do not pass their own gate:');
		for (const p of verdict.problems) console.error(`  ${p}`);
		process.exitCode = 1;
		return;
	}
	console.log(`manifest verified (${verdict.checked} skins, ${verdict.bytes} bytes of PNG)`);
}

if (require.main === module) main();

module.exports = {
	card,
	previewFingerprint,
	tokenFingerprint,
	cardFingerprint,
	checkPreviews,
	writeManifest,
	readPngSize,
	findChrome,
	OUT_PNG,
	MANIFEST,
	W,
	H,
	SCALE
};
