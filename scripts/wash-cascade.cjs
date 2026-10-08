/**
 * dsh-dream-skin — wash-cascade probe (issues #96 / #97, adversarial review 10.8.0).
 *
 * WHY THIS EXISTS. Every other check in this repository grades the sheet as TEXT:
 * `scripts/craft-audit.cjs` and `tests/client.smoke.test.cjs` read the CSS string the
 * bundle builds. A string is not a rendering. Issue #97 is the proof — a rule whose
 * selector matched nothing on any host sat in the sheet for four releases while every
 * string-level assertion stayed green. Issue #96 has the same hole from the other side:
 * the fix wins the cascade only on specificity, and "the declaration is present" cannot
 * see whether it reaches the element the host actually rounds. That is exactly what the
 * 10.8.0 review (A9 / B4 / P1-4) said, together with the sharper point that the
 * CHANGELOG claimed sampling in "a real CSS engine" while the shipped tree offered no way
 * to recompute the claim.
 *
 * So this file recomputes it. The page is built from THREE sources, none of them
 * hand-copied:
 *   1. the plugin's own material sheet, taken out of the shipped bundle by
 *      `scripts/craft-audit.cjs` — the same reader the craft gates use;
 *   2. the host's layout CSS, read out of the installed host package;
 *   3. the host's fade rule and the chat package's scroll masks, read the same way.
 * Headless Chrome then reports the COMPUTED values in three states: no wash / wash /
 * wash again. All three host packages are required by name: a fixture that quietly
 * omitted the rule under test would read the same value in every state and "prove" the
 * fix with a check that cannot fail (issue #83's lesson — zero output is a failure).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const { extractSheets } = require('./craft-audit.cjs');
const { findChrome } = require('./generate-skin-mockups.cjs');

const REPO = path.join(__dirname, '..');
const DEFAULT_HOST_ROOT = process.env.DSH_HOST_ROOT
	|| path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@deepseek-ai', 'dsh', 'node_modules', '@deepseek-ai');

/** The three host packages the fixture needs, and the token that identifies each one. */
const HOST_PACKAGES = [
	{ key: 'layout', pkg: 'dsh-client-ui-layout', must: '--dsh-windows-content-radius', why: 'the AppFrame fill and the content corner' },
	{ key: 'fade', pkg: 'dsh-client-ui-workspace', must: '_fade', why: 'the session-list foot fade the wash must neutralise' },
	{ key: 'chat', pkg: 'dsh-client-ui-chat', must: '_fadeTop', why: 'the chat scroll masks that must NOT be touched' }
];

/**
 * Read a package's CSS out of the install. Host CSS ships as one stringified literal in
 * the package's `lib/client.js`, so the quoted literal is parsed rather than grepped.
 * @returns {string|null} the CSS text, or null when the package or token is absent.
 */
function hostCss(root, pkg, contains) {
	const file = path.join(root, pkg, 'lib', 'client.js');
	if (!fs.existsSync(file)) return null;
	const src = fs.readFileSync(file, 'utf8');
	const re = /"(?:[^"\\]|\\.)*"/g;
	let m;
	while ((m = re.exec(src))) {
		if (!m[0].includes(contains)) continue;
		let blob;
		try { blob = JSON.parse(m[0]); } catch { continue; }
		if (blob.includes('{') && blob.includes(contains)) return blob;
	}
	return null;
}

/**
 * Remove ONE declaration (property and its value) from a CSS text, leaving the rest of
 * its rule intact. Used by the mutation half of the gate: if the readings do not change
 * when exactly this declaration goes away, the readings were never caused by it.
 */
function stripDeclaration(css, prop) {
	const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const re = new RegExp('\\n?\\s*' + escaped + '\\s*:[^;}]*;', 'g');
	const out = css.replace(re, ';');
	if (out === css) throw new Error(`declaration ${prop} not found in the sheet — nothing was mutated`);
	return out;
}

/** Assemble the three inputs. Missing inputs are errors, never thin fixtures. */
function buildFixture(opts = {}) {
	const root = opts.root || DEFAULT_HOST_ROOT;
	const source = opts.source || fs.readFileSync(path.join(REPO, 'lib', 'client.js'), 'utf8');
	const sheets = extractSheets(source);
	const material = sheets.find((s) => /material/.test(s.id));
	if (!material) throw new Error('the material sheet is not in the bundle — the probe has nothing to measure');
	const parts = { material: material.css, hostRoot: root };
	for (const spec of HOST_PACKAGES) {
		const css = hostCss(root, spec.pkg, spec.must);
		if (!css) {
			throw new Error(`host ${spec.key} CSS (${spec.pkg}, looking for ${spec.must}) unreadable in ${root} — `
				+ `the fixture would lose "${spec.why}" and the check could no longer fail`);
		}
		parts[spec.key] = css;
	}
	return parts;
}

/** The page: host chrome on top, plugin sheet above it, three samples taken in one task. */
function fixtureHtml(parts) {
	return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>:root{--dsw-alias-bg-base:#101018;--dsw-specific-sidebar-fill:rgba(16,16,24,.75);--dsw-alias-bg-layer-2:rgba(22,22,28,.92);--dsh-session-list-edge-inset:8px;--dsh-windows-titlebar-height:34px}</style>
<style>${parts.layout}
${parts.fade}
${parts.chat}</style>
<style id="plugin-material">${parts.material}</style>
</head><body>
<div class="pI_x6G_frame" data-shell-frame>
  <div data-shell-overlay>titlebar</div>
  <div class="pI_x6G_centerCol">
    <span class="bhn1Oq_fade">fade</span>
    <div class="O_Ebla_scroll O_Ebla_fadeTop">chat scroll mask</div>
  </div>
</div>
<script>
(function () {
  var frame = document.querySelector('[data-shell-frame]');
  var col = document.querySelector('.pI_x6G_centerCol');
  var fade = document.querySelector('.bhn1Oq_fade');
  var chat = document.querySelector('.O_Ebla_fadeTop');
  var WASH = 'data-dsh-dream-skin-wash';
  var out = [];
  function sample(label) {
    out.push({
      state: label,
      corner: getComputedStyle(col).borderTopLeftRadius,
      frameFill: getComputedStyle(frame).backgroundColor,
      fadeBg: fade ? getComputedStyle(fade).backgroundImage : null,
      fadeMask: fade ? getComputedStyle(fade).maskImage : null,
      chatMask: chat ? getComputedStyle(chat).maskImage : null
    });
  }
  document.documentElement.setAttribute('data-windows-titlebar', '');
  sample('plain');
  document.documentElement.setAttribute(WASH, '');
  sample('wash');
  document.documentElement.removeAttribute(WASH);
  document.documentElement.setAttribute(WASH, '');
  document.documentElement.removeAttribute(WASH);
  sample('washed-again');
  document.title = 'DSH_RESULTS' + JSON.stringify(out);
})();
<\/script></body></html>`;
}

/**
 * Run the fixture through headless Chrome and return the computed readings.
 * @param {{parts?: object, env?: object}} opts `parts` lets a caller probe a MUTATED
 *        sheet; by default the shipped bundle and the installed host are used.
 */
function measure(opts = {}) {
	const chrome = findChrome(opts.env);
	if (!chrome.path) return { ran: false, why: chrome.why };
	const parts = opts.parts || buildFixture(opts);
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-wash-'));
	const file = path.join(dir, 'fixture.html');
	try {
		fs.writeFileSync(file, fixtureHtml(parts));
		const dom = execFileSync(chrome.path, [
			'--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
			'--virtual-time-budget=2000', '--dump-dom', 'file:///' + file.replace(/\\/g, '/')
		], { encoding: 'utf8', maxBuffer: 32e6, timeout: 90000 });
		// The page publishes into <title>; `--dump-dom` escapes the quotes, so decode
		// before parsing. A page that produced no marker is an error, not an empty pass.
		const raw = dom.match(/DSH_RESULTS([\s\S]*?)<\/title>/);
		if (!raw) return { ran: true, error: 'no results marker in the dumped DOM', dom: dom.slice(0, 500) };
		const json = raw[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
		try {
			return { ran: true, readings: JSON.parse(json) };
		} catch (e) {
			return { ran: true, error: 'readings did not parse: ' + e.message, dom: json.slice(0, 500) };
		}
	} finally {
		fs.rmSync(dir, { recursive: true, force: true });
	}
}

/**
 * The verdict: what the three states MUST read for #96 and #97 to be satisfied.
 *
 * This lives here rather than inline in the CLI because `tests/wash.cascade.test.cjs`
 * grades the same list — expected values written twice, once for the script and once for
 * the test, means two gates whose numbers can disagree, and only one of them can be seen
 * breaking. Issue #97 is the lesson: a check whose readings were never compared to
 * anything reports success forever.
 *
 * Each check carries a GROUP (`corner` = issue #96, `fade` = issue #97) so the two named
 * tests can each claim their own half without re-stating the numbers, and so
 * `tests/hashes.test.cjs`-style partitioning can prove no check is claimed by neither.
 *
 * Every predicate is called `ok(plain, wash, again)` — the three samples in order — so a
 * check that means to read the wash state must take the SECOND parameter. Writing
 * `ok: (w) => …` against a single-parameter signature silently reads the plain state, and
 * because the first two states differ in every real sample the mistake reports itself as
 * the opposite of the truth.
 */
const WASH_CHECKS = [
	{ id: 'corner-host-own', group: 'corner', msg: 'plain: the host corner must stay its own 16px', ok: (plain) => plain.corner === '16px' },
	{ id: 'corner-flattened', group: 'corner', msg: 'wash: issue #96 wants the content corner flattened', ok: (plain, wash) => wash.corner === '0px' },
	{ id: 'corner-restored', group: 'corner', msg: 'washed-again: removing the wash must restore 16px', ok: (plain, wash, again) => again.corner === '16px' },
	{ id: 'frame-fill-dropped', group: 'corner', msg: 'wash: the frame fill must be dropped', ok: (plain, wash) => wash.frameFill === 'rgba(0, 0, 0, 0)' },
	{ id: 'frame-fill-kept', group: 'corner', msg: 'plain: without a wash the frame must keep its own fill', ok: (plain) => plain.frameFill !== 'rgba(0, 0, 0, 0)' },
	{ id: 'fade-paints', group: 'fade', msg: 'plain: the host fade must really paint, else the check below is vacuous', ok: (plain) => /linear-gradient/.test(plain.fadeBg || '') },
	{ id: 'fade-neutralised', group: 'fade', msg: 'wash: issue #97 wants the foot-fade band neutralised', ok: (plain, wash) => wash.fadeBg === 'none' },
	{ id: 'chat-mask-present', group: 'fade', msg: 'plain: the chat scroll mask must exist in the page', ok: (plain) => /linear-gradient/.test(plain.chatMask || '') },
	{ id: 'chat-mask-untouched', group: 'fade', msg: 'wash: the chat scroll mask is collateral damage', ok: (plain, wash) => wash.chatMask === plain.chatMask }
];

/**
 * @param {Array<object>} readings the three samples, in order plain / wash / washed-again.
 * @param {string} [group] only run the checks in this group.
 * @returns {string[]} problems; empty means the states read as documented.
 */
function checkReadings(readings, group) {
	const [plain, wash, again] = readings || [];
	if (!plain || !wash || !again) {
		return [`expected the three states plain/wash/washed-again, got ${(readings || []).length}`];
	}
	const problems = [];
	for (const check of WASH_CHECKS) {
		if (group && check.group !== group) continue;
		let held = false;
		try {
			held = check.ok(plain, wash, again);
		} catch (e) {
			problems.push(`${check.id}: the check itself threw (${e.message})`);
			continue;
		}
		if (!held) problems.push(`${check.id}: ${check.msg} (plain.corner=${plain.corner} wash.corner=${wash.corner} `
			+ `plain.frameFill=${plain.frameFill} wash.frameFill=${wash.frameFill} plain.fadeBg=${plain.fadeBg} `
			+ `wash.fadeBg=${wash.fadeBg} plain.chatMask=${plain.chatMask} wash.chatMask=${wash.chatMask})`);
	}
	return problems;
}

module.exports = { measure, buildFixture, fixtureHtml, stripDeclaration, checkReadings, WASH_CHECKS, hostCss, HOST_PACKAGES, DEFAULT_HOST_ROOT };

if (require.main === module) {
	const r = measure();
	if (!r.ran) { console.error('! ' + r.why); process.exitCode = 1; }
	else if (r.error) { console.error('! ' + r.error + '\n' + (r.dom || '')); process.exitCode = 1; }
	else {
		for (const x of r.readings) console.log(JSON.stringify(x));
		const problems = checkReadings(r.readings);
		if (problems.length > 0) {
			for (const p of problems) console.error('! ' + p);
			console.error(`wash cascade: ${problems.length} problem(s).`);
			process.exitCode = 1;
		} else {
			console.log(`wash cascade OK (${r.readings.length} states: corner 16px -> 0px -> 16px, host fade gradient -> none -> gradient, chat mask untouched).`);
		}
	}
}
