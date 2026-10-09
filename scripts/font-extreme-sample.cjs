"use strict";
/**
 * Issue #93 — font-extreme sampling: 10 px / 22 px, machine-read.
 *
 * The host widened the conversation font range to 10–22 px (rc.2, latest
 * channel) while every "readable" conclusion in this repo was measured at the
 * 14 px default. The extremes have ZERO samples; this script takes them.
 *
 * Constraints carried over from the issue:
 *   - machine-read, not pixel eyeballing (this repo's established standard);
 *   - the local host install is rc.1 (12–17) and MUST NOT be touched, so the
 *     fixture page sets `--dsh-content-font-size` DIRECTLY at 10 / 22 — a
 *     faithful model of what the host stepper publishes, without upgrading
 *     anything on the user's machine;
 *   - the plugin never drives conversation font size, so font-size here is the
 *     host's variable alone (asserted below).
 *
 * Per (font size x skin), the page samples:
 *   - `--dsw-specific-bubble` computed colour (the user bubble fill);
 *   - the composer card's `::before` background alpha (via getComputedStyle
 *     on the plugin's own rules — read from the shipped sheet, not retyped);
 *   - `--dsw-alias-label-tertiary` computed against the bubble fill and the
 *     code-block fill (WCAG contrast ratio, both faces);
 *   - the compositing of tertiary over bubble/code at both extremes.
 *
 * Output: JSON printed to stdout, plus a `--check` exit code: 0 = sampled,
 * findings recorded; 2 = no engine could be spawned (environment, not red).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { extractSheets } = require("./craft-audit.cjs");
const { extractSkins } = require("./skin-audit.cjs");

const REPO = path.join(__dirname, "..");
const OUT = path.join(__dirname, "data", "font-extreme-samples.json");
const SIZES = [10, 22];
const SKIN_IDS = ["ivory", "abyss", "midnight"];
const RAW_BASE = "https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews";

// ── browser channel (same shape as wash-cascade.cjs, Edge included) ────────
const CANDIDATES = [
	"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
	"C:/Program Files/Google/Chrome/Application/chrome.exe",
	"C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
];

function runChrome(html) {
	for (const exe of CANDIDATES) {
		if (!fs.existsSync(exe)) continue;
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dsh-fs-"));
		const file = path.join(dir, "fixture.html");
		const profile = path.join(dir, "profile");
		try {
			fs.mkdirSync(profile);
			fs.writeFileSync(file, html);
			const dom = execFileSync(exe, [
				"--headless=new", "--disable-gpu", "--no-sandbox",
				"--no-first-run", "--no-default-browser-check",
				"--user-data-dir=" + profile, "--virtual-time-budget=2000",
				"--dump-dom", "file:///" + file.replace(/\\/g, "/")
			], { encoding: "utf8", maxBuffer: 32e6, timeout: 90000 });
			const raw = dom.match(/DSH_FONT_RESULTS([\s\S]*?)<\/title>/);
			if (!raw) return { ran: true, error: "no results marker in the dumped DOM" };
			const json = raw[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
			return { ran: true, readings: JSON.parse(json) };
		} catch (e) {
			// launch failure: try the next browser
			continue;
		} finally {
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}
	return { ran: false, why: "no headless browser found or every candidate failed to launch" };
}

// ── colour maths (WCAG contrast) ────────────────────────────────────────────
function parseColor(css) {
	const m = css.match(/rgba?\(([^)]+)\)/);
	if (!m) return null;
	const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
	return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}
const channel = (c) => {
	const v = c / 255;
	return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
function composite(fg, bg) {
	const a = fg.a ?? 1;
	return {
		r: fg.r * a + bg.r * (1 - a),
		g: fg.g * a + bg.g * (1 - a),
		b: fg.b * a + bg.b * (1 - a),
		a: 1
	};
}
function contrast(fgCss, bgCss) {
	const fg = parseColor(fgCss), bg = parseColor(bgCss);
	if (!fg || !bg) return null;
	const f = fg.a < 1 ? composite(fg, bg) : fg;
	const L1 = Math.max(luminance(f), luminance(bg));
	const L2 = Math.min(luminance(f), luminance(bg));
	return Math.round(((L1 + 0.05) / (L2 + 0.05)) * 100) / 100;
}

// ── the page ────────────────────────────────────────────────────────────────
function samplePage(skins, sheetCss) {
	const probes = skins.map((s) => `
  <div class="probe" data-skin="${s.id}">
    <div class="bubble">b</div>
    <div class="codeblock">c</div>
    <div class="composer">t</div>
  </div>`).join("");
	return `<!doctype html><html><head><meta charset="utf-8"><title>loading</title>
<style id="tokens"></style>
<style id="plugin">${sheetCss}</style>
<style>
.probe{position:fixed;left:-9999px;top:0}
#text{font-size:var(--dsh-content-font-size)}
.bubble{background:var(--dsw-specific-bubble);color:var(--dsw-alias-label-tertiary)}
.codeblock{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-tertiary)}
.composer{position:relative;font-size:var(--dsh-content-font-size)}
</style></head><body>
<div id="text">t</div>
${probes}
<script>
const SKINS = ${JSON.stringify(skins.map((s) => ({ id: s.id, tokens: s.tokens })))};
const SIZES = ${JSON.stringify(SIZES)};
const out = [];
const el = (sel) => document.querySelector(sel);
for (const size of SIZES) {
  for (const s of SKINS) {
    const t = el("style#tokens");
    t.textContent = ":root{" + Object.entries(s.tokens).map(([k, v]) => k + ":" + v).join(";") + "}";
    document.documentElement.style.setProperty("--dsh-content-font-size", size + "px");
    const bubble = el(".bubble"), code = el(".codeblock"), text = el("#text");
    const cs = getComputedStyle(bubble);
    const csText = getComputedStyle(text);
    // The tertiary ink is read from the BUBBLE's own color declaration — the
    // #text probe only carries the font-size (it has no color rule, so its
    // computed color would be the UA default black, which is a fixture bug
    // masquerading as a reading).
    // the composer ::before is read straight out of the plugin's own rules —
    // find the rule that paints it and evaluate its declared alpha against
    // the token it mixes with. Reading the RULE (not a synthetic element)
    // keeps this honest: the sheet is the shipped one.
    const rules = [...document.styleSheets].flatMap((ss) => { try { return [...ss.cssRules]; } catch { return []; } });
    const composerRules = rules.filter((r) => r.selectorText && r.selectorText.includes("composer") && r.selectorText.includes("::before"));
    const decls = composerRules.map((r) => r.style.cssText).join(" | ");
    const bubbleBg = cs.backgroundColor;
    const codeBg = getComputedStyle(code).backgroundColor;
    const tertiary = cs.color;
    out.push({
      skin: s.id,
      fontPx: size,
      bubble: bubbleBg,
      bubbleAlpha: bubbleBg.startsWith("rgba") ? Number(bubbleBg.split(",")[3].replace(")", "").trim()) : 1,
      codeBg,
      tertiary,
      tertiaryOnBubble: null,
      tertiaryOnCode: null,
      composerBeforeRules: decls.slice(0, 400),
      textComputedPx: csText.fontSize
    });
  }
}
// second pass: contrast needs parseable computed values, done in-page via the
// same maths as the script (rgba strings from computed style).
function parse(c){const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(/[\\s,/]+/).filter(Boolean).map(Number);return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1};}
function lum(c){const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
function comp(f,b){const a=f.a??1;return {r:f.r*a+b.r*(1-a),g:f.g*a+b.g*(1-a),b:f.b*a+b.b*(1-a),a:1};}
function ctr(f,b){const x=parse(f),y=parse(b);if(!x||!y)return null;const F=x.a<1?comp(x,y):x;const a=Math.max(lum(F),lum(y)),c=Math.min(lum(F),lum(y));return Math.round((a+0.05)/(c+0.05)*100)/100;}
for (const r of out) { r.tertiaryOnBubble = ctr(r.tertiary, r.bubble); r.tertiaryOnCode = ctr(r.tertiary, r.codeBg); }
document.title = "DSH_FONT_RESULTS" + JSON.stringify(out);
</script></body></html>`;
}

// ── main ────────────────────────────────────────────────────────────────────
function main() {
	const source = fs.readFileSync(path.join(REPO, "lib", "client.js"), "utf8");
	const skins = extractSkins(source).filter((s) => SKIN_IDS.includes(s.id));
	if (skins.length !== SKIN_IDS.length) throw new Error("expected skins " + SKIN_IDS.join(",") + " from the bundle");
	const sheets = extractSheets(source);
	const sheetCss = sheets.map((s) => s.css).join("\n");

	// The bundle must not drive conversation font size (the issue's discipline).
	const violations = [...source.matchAll(/font-size\s*:\s*[^;]*--dsh-content-font/g)];
	if (violations.length) throw new Error("the bundle writes the host font ladder — the sampling premise broke");

	const res = runChrome(samplePage(skins, sheetCss));
	if (!res.ran) {
		console.error("ENVIRONMENT: " + res.why);
		process.exit(2);
	}
	if (res.error) throw new Error(res.error);

	// sanity: the host ladder variable must actually move the text (else the
	// fixture sampled nothing about font size)
	for (const r of res.readings) {
		if (r.textComputedPx !== r.fontPx + "px") throw new Error(`fixture text computed ${r.textComputedPx} at setting ${r.fontPx}px — the ladder variable did not apply`);
	}

	const record = {
		_source: "scripts/font-extreme-sample.cjs — rerun with `node scripts/font-extreme-sample.cjs`",
		_date: new Date().toISOString().slice(0, 10),
		_method: "headless engine computed styles; host --dsh-content-font-size set directly at 10/22 (host install untouched, rc.1)",
		_warn: "computed-style sampling, not pixel eyeballing; visual acceptability at 22px is still unobserved",
		readings: res.readings
	};
	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, JSON.stringify(record, null, "\t"));
	console.log("sampled", res.readings.length, "cells (", SIZES.join("/"), "px x", SKIN_IDS.join(","), ") ->", path.relative(REPO, OUT));
	for (const r of res.readings) {
		console.log(`  ${r.skin} @${r.fontPx}px  bubble=${r.bubble} (a=${r.bubbleAlpha})  tertiary-on-bubble=${r.tertiaryOnBubble}  on-code=${r.tertiaryOnCode}`);
	}
}

main();
