/**
 * dsh-dream-skin — preview-image gates (issue #83).
 *
 * The README says "these are the skins you get". Eight PNGs in a table are the
 * single most persuasive thing this repo ships, and until now *nothing* watched
 * them. The one existing gate —
 * `tests/skin.quality.test.cjs: the README previews are projected from the same
 * numbers as the shipped bundle` — pins `scripts/skin-data.cjs`, an intermediate
 * projection object, to the shipped tokens. It is a good gate and it stays. It
 * is also, measured, blind to the pixels: re-roll a palette and the PNGs on
 * disk are byte-for-byte unchanged, because no gate ever asks for them to be
 * re-shot.
 *
 * Two holes, two fixes, both verified here:
 *
 *   1. `docs/previews/manifest.json` binds each image to the tokens that painted
 *      it, the markup that laid it out, and its own bytes and pixel size;
 *      `npm run previews --check` recomputes all four and names the skin.
 *   2. `npm run previews` used to exit 0 having produced nothing when it could
 *      not find a browser. Zero output is a failure, not a success.
 *
 * The PNGs are also no longer shipped: 2.26 MB of README decoration on every
 * `pnpm add`, more than six times the plugin itself. They are served from
 * GitHub, and the packaging decision is pinned here too — the two halves of
 * #83 are one decision, so a test that only covered the fingerprint would let
 * someone quietly put the bytes back.
 */

"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const {
	checkPreviews,
	findChrome,
	readPngSize,
	OUT_PNG,
	MANIFEST,
	W,
	H,
	SCALE
} = require("../scripts/generate-skin-mockups.cjs");
const { buildAll } = require("../scripts/skin-system.cjs");

const ROOT = path.join(__dirname, "..");
const README_RAW = "https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews";
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");

const manifest = () => JSON.parse(fs.readFileSync(MANIFEST, "utf8"));

/**
 * Issue #95-B: a preview reference is addressable when it is either
 * (a) an absolute raw.githubusercontent.com URL, or (b) a relative `docs/previews/…`
 * path AND the tarball actually ships `docs/previews` (i.e. it is in `files`).
 * Everything else is a 404 on the npm page or in the repo layout — that is the
 * hole the B1 mutation walked through: flipping a raw URL back to a relative
 * path used to stay green because nothing re-derived the shipping premise.
 */
function previewRefProblems(text, pkg) {
	const problems = [];
	const ships = JSON.stringify(pkg.files || []).includes("docs/previews");
	for (const m of text.matchAll(/(?:href|src)="([^"]*docs\/previews\/[^"]+)"/g)) {
		const ref = m[1];
		if (/^https?:\/\//.test(ref)) continue;
		if (ships) continue;
		problems.push(`"${ref}" is relative but the tarball does not ship docs/previews — npm renders it as a 404`);
	}
	return problems;
}

/** Every README that shows the eight preview cards. */
function readmes() {
	const out = [path.join(ROOT, "README.md")];
	for (const f of fs.readdirSync(path.join(ROOT, "docs", "i18n"))) {
		if (/^README\..*\.md$/.test(f)) out.push(path.join(ROOT, "docs", "i18n", f));
	}
	return out;
}

// ---------------------------------------------------------------------------
// 1. The gate on the images
// ---------------------------------------------------------------------------

test("#83: every preview is fingerprinted against the design system and its own pixels", () => {
	const verdict = checkPreviews();
	assert.deepEqual(verdict.problems, [], `previews must match their manifest:\n${verdict.problems.join("\n")}`);
	assert.equal(verdict.checked, 8, "eight skins, eight images");
	assert.ok(verdict.bytes > 1_000_000, `sanity: the PNGs on disk add up to real bytes, saw ${verdict.bytes}`);
});

test("#83: the previews are advertised from GitHub, not shipped in the tarball", () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
	const shipped = JSON.stringify(pkg.files);
	assert.doesNotMatch(
		shipped,
		/docs\/previews/,
		"`docs/previews` is back in `files`: 2.26 MB of README pictures on every install of a 350 kB plugin.\n" +
			"The READMEs point at raw.githubusercontent.com instead — see docs/publishing-to-npm.md."
	);
	assert.equal(pkg.scripts["previews:check"], "node scripts/generate-skin-mockups.cjs --check", "publish the check");

	const entry = manifest();
	const skins = Object.keys(entry.skins);
	assert.equal(skins.length, 8);

	for (const file of readmes()) {
		const rel = path.relative(ROOT, file);
		const text = fs.readFileSync(file, "utf8");

		// Issue #95-B: a relative `docs/previews/...` src only works if the
		// tarball actually ships it. Today `docs/previews` is out of `files`
		// (and must stay out — see the assertion above), so every relative
		// reference is a 404 both on the npm page and from `docs/i18n/`
		// (wrong depth, the 0.4.8 bug). But the rule is conditional, not a
		// blanket ban: if the images ever move back into `files`, relative
		// references become addressable again. `previewRefProblems` below
		// encodes that condition and its mutation test pins both directions.
		const problems = previewRefProblems(text, pkg);
		assert.deepEqual(problems, [], `${rel} has unaddressable preview references:\n${problems.join("\n")}`);

		for (const id of skins) {
			const url = `${README_RAW}/${id}.png`;
			assert.ok(text.includes(`src="${url}"`), `${rel} must show ${id} from ${url}`);
			// …and the URL has to resolve to the file the gate just fingerprinted.
			const onDisk = path.join(ROOT, "docs", "previews", `${id}.png`);
			assert.equal(
				sha256(fs.readFileSync(onDisk)),
				entry.skins[id].png.sha256,
				`docs/previews/${id}.png is the image the manifest fingerprints`
			);
		}
	}
});

// ---------------------------------------------------------------------------
// 2. Mutations
// ---------------------------------------------------------------------------

test("#95-B: a relative preview reference reddens while the tarball does not ship docs/previews, and stays green once it does", () => {
	const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
	const relativeRef = 'src="docs/previews/abyss.png"';

	// Direction 1 (the B1 mutation): previews are NOT in `files`, so a relative
	// reference is a 404 on the npm page and must be rejected…
	const shipped = { files: pkg.files };
	assert.deepEqual(
		previewRefProblems(relativeRef, shipped).length,
		1,
		"the un-shipped relative reference must be a problem"
	);
	// …and absolute URLs are always fine.
	assert.deepEqual(
		previewRefProblems(`src="${README_RAW}/abyss.png"`, shipped),
		[]
	);

	// Direction 2 (the reverse case): if the images ever move back into `files`,
	// the same relative reference becomes addressable — the gate must NOT be a
	// blanket ban on relative paths.
	const unshipped = { files: [...pkg.files, "docs/previews"] };
	assert.deepEqual(previewRefProblems(relativeRef, unshipped), []);
});

test("mutation: re-rolling a palette colour without re-shooting reddens the previews", () => {
	// The issue's acceptance criterion, in-process: ONLY a design-system colour
	// changes. The manifest and the PNGs are untouched.
	const ivory = buildAll().find((s) => s.id === "ivory");
	const reRolled = {
		...ivory,
		tokens: { ...ivory.tokens, "--dsw-alias-brand-primary": "#123456" }
	};

	const verdict = checkPreviews({ skins: buildAll().map((s) => (s.id === "ivory" ? reRolled : s)) });

	assert.equal(verdict.ok, false, "a re-rolled palette with stale images is not a pass");
	assert.ok(
		verdict.problems.some((p) => p.startsWith("ivory:") && /palette changed/.test(p)),
		`and the robot names the skin and the cause, got:\n${verdict.problems.join("\n")}`
	);
	// The other seven are untouched — a gate that reddens everything tells you nothing.
	assert.equal(verdict.problems.filter((p) => p.startsWith("ivory:")).length, 1, "exactly one complaint for ivory");
});

test("mutation: replacing a PNG reddens the previews even when the design system is unchanged", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-prev-bytes-"));
	try {
		for (const f of fs.readdirSync(OUT_PNG)) {
			fs.copyFileSync(path.join(OUT_PNG, f), path.join(dir, f));
		}
		const png = path.join(dir, "abyss.png");
		const buf = fs.readFileSync(png);
		// Flip one byte inside the compressed stream: same size, same header,
		// different pixels. Nothing but the hash can notice this.
		buf[buf.length - 40] ^= 0xff;
		fs.writeFileSync(png, buf);

		const verdict = checkPreviews({ pngDir: dir });
		assert.equal(verdict.ok, false, "a hand-edited image is not a pass");
		assert.ok(
			verdict.problems.some((p) => p.startsWith("abyss:") && /bytes do not match/.test(p)),
			`and it says which image: ${verdict.problems.join(" / ")}`
		);
		assert.equal(verdict.problems.filter((p) => p.startsWith("abyss:")).length, 1, "same byte count, so only the hash fires");
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("mutation: a @1x image in a @2x table reddens the previews", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-prev-scale-"));
	try {
		for (const f of fs.readdirSync(OUT_PNG)) {
			fs.copyFileSync(path.join(OUT_PNG, f), path.join(dir, f));
		}
		// Patch the IHDR to @1x AND bring the manifest's hash and byte count in
		// line with it, so the ONLY thing left that can notice is the pixel-size
		// check. Without this isolation the hash would cover for it.
		const png = path.join(dir, "mist.png");
		const buf = fs.readFileSync(png);
		buf.writeUInt32BE(W, 16);
		buf.writeUInt32BE(H, 20);
		fs.writeFileSync(png, buf);
		assert.deepEqual(readPngSize(buf), { width: W, height: H }, "the patched header really says @1x");

		const mf = path.join(dir, "manifest.json");
		const parsed = JSON.parse(fs.readFileSync(mf, "utf8"));
		parsed.skins.mist.png = { ...parsed.skins.mist.png, sha256: sha256(buf), bytes: buf.length, width: W, height: H };
		fs.writeFileSync(mf, JSON.stringify(parsed), "utf8");

		const verdict = checkPreviews({ pngDir: dir, manifestPath: mf });
		assert.equal(verdict.ok, false, "a lower-resolution image in the table is not a pass");
		assert.ok(
			verdict.problems.some((p) => p.startsWith("mist:") && /expected 1440x920/.test(p)),
			`and it states the expected size: ${verdict.problems.join(" / ")}`
		);
		assert.equal(verdict.problems.filter((p) => p.startsWith("mist:")).length, 1, "only the size check can fire here");
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

test("mutation: a missing image, and a manifest for a skin that no longer exists, both redden", () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-prev-missing-"));
	try {
		for (const f of fs.readdirSync(OUT_PNG)) {
			fs.copyFileSync(path.join(OUT_PNG, f), path.join(dir, f));
		}
		fs.rmSync(path.join(dir, "rose.png"));

		const gone = checkPreviews({ pngDir: dir });
		assert.equal(gone.ok, false);
		assert.ok(gone.problems.some((p) => p.startsWith("rose:") && /missing/.test(p)), gone.problems.join(" / "));

		// And the other direction: an image nobody ships any more.
		const stale = buildAll().filter((s) => s.id !== "rose");
		const orphan = checkPreviews({ skins: stale });
		assert.ok(
			orphan.problems.some((p) => /no longer exists/.test(p)),
			`a retired skin must not keep its README entry: ${orphan.problems.join(" / ")}`
		);
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

// ---------------------------------------------------------------------------
// 3. The CLI the maintainer actually runs
// ---------------------------------------------------------------------------

test("#83: npm run previews reddens when a colour changes and nobody re-shoots (end to end)", () => {
	// Same shape as the in-process case, through the real command line, because
	// that is what a maintainer or CI runs. A scratch tree carries scripts/ and
	// the committed previews; a `-r` preload swaps the design system's build for
	// one whose ivory accent moved, leaving the manifest and the PNGs alone.
	const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-prev-cli-"));
	try {
		fs.cpSync(path.join(ROOT, "scripts"), path.join(cwd, "scripts"), { recursive: true });
		fs.cpSync(OUT_PNG, path.join(cwd, "docs", "previews"), { recursive: true });

		const hook = path.join(cwd, "re-roll.cjs");
		fs.writeFileSync(
			hook,
			[
				'const path = require("node:path");',
				'const mod = require(path.join(process.cwd(), "scripts", "skin-system.cjs"));',
				"const real = mod.buildAll;",
				"mod.buildAll = () => real().map((s) =>",
				'  s.id === "mist" ? { ...s, tokens: { ...s.tokens, "--dsw-alias-brand-primary": "#123456" } } : s);'
			].join("\n"),
			"utf8"
		);

		const args = ["-r", hook, path.join(cwd, "scripts", "generate-skin-mockups.cjs"), "--check"];
		const res = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
		assert.equal(res.status, 1, `a stale preview must fail the check, got status ${res.status}\n${res.stdout}`);
		assert.match(res.stderr, /mist: the shipped palette changed/, "the failure names the skin");
		assert.match(res.stderr, /npm run previews/, "the failure says what to do about it");

		// Control: without the preload the same scratch tree is green, so the
		// case above is testing the drift and not the scratch copy.
		const clean = spawnSync(process.execPath, [path.join(cwd, "scripts", "generate-skin-mockups.cjs"), "--check"], {
			cwd,
			encoding: "utf8"
		});
		assert.equal(clean.status, 0, `the control run must pass: ${clean.stderr}`);
	} finally {
		fs.rmSync(cwd, { recursive: true, force: true });
	}
});

test("#83: npm run previews refuses to report success without a browser", () => {
	// `CHROME_PATH` is authoritative: naming a browser we cannot use is an error,
	// not a reason to fall back to auto-detection. That is also what makes this
	// case testable on a machine that HAS a browser.
	assert.deepEqual(
		findChrome({ CHROME_PATH: path.join(os.tmpdir(), "definitely-not-a-browser") }),
		{ path: null, why: `CHROME_PATH is set to ${path.join(os.tmpdir(), "definitely-not-a-browser")}, which does not exist` }
	);
	assert.deepEqual(findChrome({ CHROME_PATH: process.execPath }), { path: process.execPath, why: "CHROME_PATH" });
	// Nothing installed anywhere: the reason has to be usable. The candidate list
	// is injected so this branch is reachable on a machine that HAS a browser.
	const none = findChrome({}, [path.join(os.tmpdir(), "no-browser-here"), path.join(os.tmpdir(), "nor-here")]);
	assert.equal(none.path, null);
	assert.match(none.why, /no headless browser found; looked at 2 known locations/);
	// PATH is not a directory of browsers: an empty PATH must not hide one that
	// is installed in a known location. (Proved with an injected candidate, so
	// this holds on a machine with no browser at all, like CI.)
	assert.deepEqual(findChrome({ PATH: "" }, [process.execPath]), { path: process.execPath, why: "auto-detected" });

	const res = spawnSync(process.execPath, [path.join(ROOT, "scripts", "generate-skin-mockups.cjs")], {
		cwd: ROOT,
		encoding: "utf8",
		env: { ...process.env, CHROME_PATH: path.join(os.tmpdir(), "definitely-not-a-browser") }
	});
	assert.equal(res.status, 1, "zero images produced must not exit 0 — that was the bug");
	assert.match(res.stderr, /refusing to report success/, res.stderr);

	// …and the PNGs were not touched by the refused run.
	const verdict = checkPreviews();
	assert.equal(verdict.ok, true, `the refused run left the committed previews alone: ${verdict.problems.join(" / ")}`);
});

test("#83: the manifest describes itself and matches the script's own geometry", () => {
	const entry = manifest();
	assert.equal(entry.generator.width, W * SCALE, "each PNG is W*SCALE wide");
	assert.equal(entry.generator.height, H * SCALE, "each PNG is H*SCALE tall");
	assert.equal(entry.generator.scale, SCALE);
	assert.match(entry.note, /issue #83/, "the manifest says what put it there");
	assert.ok(!("generatedAt" in entry), "no clock field: `--check` compares this file to a fresh computation");

	for (const [id, s] of Object.entries(entry.skins)) {
		assert.match(s.tokens, /^[0-9a-f]{64}$/, `${id}: token fingerprint is a sha256`);
		assert.match(s.card, /^[0-9a-f]{64}$/, `${id}: card fingerprint is a sha256`);
		assert.match(s.png.sha256, /^[0-9a-f]{64}$/, `${id}: png fingerprint is a sha256`);
		assert.equal(s.png.width, W * SCALE, `${id}: recorded width`);
		assert.equal(s.png.height, H * SCALE, `${id}: recorded height`);
		assert.ok(s.png.bytes > 100_000, `${id}: recorded byte count is a real image`);
	}
});
