/**
 * Roadmap parity guard: README.md (zh, the source of truth) vs docs/i18n/README.*.md.
 *
 * Why this exists: the Roadmap is the one place in this repo where the same list is
 * written seven-plus times, and the documented failure mode of this project is exactly
 * "the same inventory kept in two places drifts". Before this guard, a translation could
 * keep shipped features marked `[x]` forever, or drop whole groups, and nothing noticed.
 *
 * What it checks (structure, not prose — translations must not be byte-compared to zh):
 *   1. exactly one Roadmap section per file, terminated by the `---` rule;
 *   2. zero `- [x]` items anywhere in any Roadmap (the table lists unfinished work only);
 *   3. open-item count, sub-group count, motivation-line count and "won't do" bullet
 *      count identical between zh and each translation;
 *   4. every open item in every language opens with an S/M/L size marker;
 *   5. `| PR-welcome` markers match zh;
 *   6. each translated README keeps a single consistent line-ending style (CRLF on the
 *      Windows maintenance box, LF on the Linux CI checkout — mixing them is the defect).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LOCALES = ['de', 'en', 'es', 'fr', 'ja', 'ko', 'ru'];
const PIN = String.fromCodePoint(0x1f4cc); // 📌 — the shared Roadmap marker across languages
const HEADER = new RegExp('^## ' + PIN + ' \\S');

function readLines(rel) {
	const file = path.join(ROOT, rel);
	assert.ok(fs.existsSync(file), `${rel} must exist`);
	return fs.readFileSync(file, 'utf8').split(/\r?\n/);
}

// The Roadmap block is the header line up to (not including) the next `---` thematic break.
function roadmapBlock(lines, rel) {
	const hits = lines
		.map((l, i) => (HEADER.test(l) ? i : -1))
		.filter((i) => i >= 0);
	assert.equal(hits.length, 1, `${rel} must contain exactly one "## ${PIN} ..." section, got ${hits.length}`);
	const start = hits[0];
	let end = -1;
	for (let i = start + 1; i < lines.length; i += 1) {
		if (lines[i] === '---') {
			end = i;
			break;
		}
	}
	assert.ok(end > start, `${rel} Roadmap is not terminated by a '---' rule — the block boundary would be ambiguous`);
	// A `---` glued to the previous text line is a setext heading, not a separator.
	assert.equal(
		lines[end - 1].trim(),
		'',
		`${rel} Roadmap needs a blank line before its closing '---', otherwise markdown re-reads the last bullet as a heading`
	);
	return lines.slice(start, end);
}

function shape(block) {
	const text = block.join('\n');
	return {
		done: (text.match(/^- \[x\]/gm) || []).length,
		open: (text.match(/^- \[ \]/gm) || []).length,
		groups: (text.match(/^### /gm) || []).length,
		motivations: (text.match(/^\*.+\*\s*$/gm) || []).length,
		wontDo: (block.filter((l) => /^- \*\*/.test(l)).length),
		prWelcome: (text.match(/PR-welcome/g) || []).length,
	};
}

const zh = roadmapBlock(readLines('README.md'), 'README.md');
const zhShape = shape(zh);

test('roadmap(zh): the source-of-truth table lists unfinished work only', () => {
	assert.equal(zhShape.done, 0, `README.md Roadmap must not ship any "[x]" item, found ${zhShape.done} — delivered features belong in 功能一览/CHANGELOG, and double-writing them is what drifts`);
	assert.ok(zhShape.open >= 5, `README.md Roadmap looks suspiciously empty (${zhShape.open} open items) — if the work really is done, delete the items, do not leave a hollow table`);
	assert.ok(zhShape.groups >= 4, `README.md Roadmap should still be grouped (${zhShape.groups} "### " groups)`);
	assert.ok(zhShape.wontDo >= 1, `README.md Roadmap lost its "won't do" section (${zhShape.wontDo} bullets) — declining work is as informative as scheduling it`);
});

for (const locale of LOCALES) {
	const rel = path.posix.join('docs/i18n', `README.${locale}.md`);

	test(`roadmap(${locale}): mirrors README.md structure instead of drifting from it`, () => {
		const block = roadmapBlock(readLines(rel), rel);
		const got = shape(block);
		assert.equal(got.done, 0, `${rel} Roadmap still lists ${got.done} shipped feature(s) as "[x]" items — README.md deleted them; keep this table unfinished-work-only`);
		assert.equal(got.open, zhShape.open, `${rel} Roadmap has ${got.open} open items but README.md has ${zhShape.open} — the tables are out of sync`);
		assert.equal(got.groups, zhShape.groups, `${rel} Roadmap has ${got.groups} groups vs README.md's ${zhShape.groups}`);
		assert.equal(got.motivations, zhShape.motivations, `${rel} Roadmap is missing its per-group motivation lines (${got.motivations} vs README.md's ${zhShape.motivations})`);
		assert.equal(got.wontDo, zhShape.wontDo, `${rel} Roadmap "won't do" section has ${got.wontDo} bullets vs README.md's ${zhShape.wontDo} — declining work is a claim to contributors, keep it synced`);
		assert.equal(got.prWelcome, zhShape.prWelcome, `${rel} Roadmap marks ${got.prWelcome} items PR-welcome vs README.md's ${zhShape.prWelcome}`);
	});

	test(`roadmap(${locale}): every open item states its size`, () => {
		const block = roadmapBlock(readLines(rel), rel);
		const unsized = block.filter((l) => /^- \[ \]/.test(l) && !/^- \[ \] \*\*[SLM]\*\*/.test(l));
		assert.deepEqual(unsized, [], `${rel} has ${unsized.length} open item(s) without an **S**/**M**/**L** size marker: ${JSON.stringify(unsized)}`);
	});

	test(`roadmap(${locale}): line endings stay one consistent style`, () => {
		const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
		const crlf = (raw.match(/\r\n/g) || []).length;
		const lf = (raw.match(/\n/g) || []).length;
		const cr = (raw.match(/\r/g) || []).length;
		const bareLF = lf - crlf;
		const loneCR = cr - crlf;
		// CI checks this repo out on Linux, where the blobs are pure LF; the maintenance machine
		// works in CRLF. Demanding CRLF specifically was wrong (it reddened CI on 2026-09-29).
		// What actually breaks files is a *mixed* document — a patch script leaking bare LF into
		// a CRLF file, which has happened here. One style only, either way.
		assert.ok(crlf === 0 || bareLF === 0, `${rel} mixes line endings: ${bareLF} bare LF next to ${crlf} CRLF — a patch script leaked them`);
		assert.equal(loneCR, 0, `${rel} has ${loneCR} lone CR character(s)`);
		assert.ok(/(\r\n|\n)$/.test(raw), `${rel} must end with a final newline`);
	});
}
