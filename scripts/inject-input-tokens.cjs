// Inject per-skin --dsw-specific-input-major and --dsw-specific-tip tokens.
// Deep skins get a translucent glassy input whose blur comes from the CSS
// injector; their tip/panel is a tinted dark. Light skins get semi-transparent
// white glass. Inserts after each skin's --dsw-alias-bg-overlay if not present.
const fs = require('node:fs');
const path = require('node:path');
const f = path.join(__dirname, '..', 'lib', 'client.js');
let src = fs.readFileSync(f, 'utf8');

// per-skin (by base bg) -> { inputMajor, tip }
const plan = {
	'#101014': { inputMajor: 'rgba(255, 255, 255, 0.08)', tip: 'rgba(30, 33, 46, 0.9)' },  // abyss
	'#0e1316': { inputMajor: 'rgba(255, 255, 255, 0.08)', tip: 'rgba(24, 35, 36, 0.9)' },  // aurora
	'#12101a': { inputMajor: 'rgba(255, 255, 255, 0.08)', tip: 'rgba(32, 28, 46, 0.9)' },  // nebula
	'#16110d': { inputMajor: 'rgba(255, 255, 255, 0.08)', tip: 'rgba(38, 28, 20, 0.9)' },  // ember
	'#0b0b0e': { inputMajor: 'rgba(255, 255, 255, 0.08)', tip: 'rgba(26, 26, 32, 0.9)' },  // midnight
	'#f7f8fa': { inputMajor: 'rgba(255, 255, 255, 0.72)', tip: 'rgba(255, 255, 255, 0.82)' }, // ivory
	'#f3f6fa': { inputMajor: 'rgba(255, 255, 255, 0.72)', tip: 'rgba(255, 255, 255, 0.82)' }, // mist
	'#f7f2f5': { inputMajor: 'rgba(255, 255, 255, 0.72)', tip: 'rgba(255, 255, 255, 0.82)' }  // rose
};

let changed = 0;
for (const [base, p] of Object.entries(plan)) {
	// find this skin's tokens block: the `--dsw-alias-bg-base": "<base>"` line,
	// then insert after its --dsw-alias-bg-overlay line.
	const baseIdx = src.indexOf(`"--dsw-alias-bg-base": "${base}"`);
	if (baseIdx === -1) { console.log('MISS base', base); continue; }
	// locate the bg-overlay line within this token object (next ~15 lines)
	const block = src.slice(baseIdx, baseIdx + 900);
	const overlayMatch = /("--dsw-alias-bg-overlay": "[^"]*",)/.exec(block);
	if (!overlayMatch) { console.log('MISS overlay for', base); continue; }
	const insertAfter = baseIdx + overlayMatch.index + overlayMatch[0].length;
	const existing = block.slice(overlayMatch.index);
	if (/--dsw-specific-input-major/.test(existing.slice(0, 200))) {
		console.log('SKIP already has input-major', base);
		continue;
	}
	const addon = `\n\t\t\t\t\t"--dsw-specific-input-major": "${p.inputMajor}",\n\t\t\t\t\t"--dsw-specific-tip": "${p.tip}",`;
	src = src.slice(0, insertAfter) + addon + src.slice(insertAfter);
	changed += 1;
	console.log('injected', base);
}
fs.writeFileSync(f, src, 'utf8');
console.log('done, changed', changed);
