/**
 * dsh-dream-skin — the README's reference counts must match the code.
 *
 * PR #131's follow-up list found three drifted claims in README: the number of
 * `settings.dreamSkin.item` rows (said 5, actually 7), the compositor pane list
 * (six panes, but the enumeration named only five), and a fill-mode label that
 * only drift on that branch. This gate pins the two that were true on main:
 *
 *   - the row count is derived from the bundle, not typed here;
 *   - the compositor pane count is derived from `scripts/compositor-audit.cjs`,
 *     and the sentence must also name the sixth surface and the declaration
 *     count (6 panes + 2 `none` low-power guards = 8 declarations).
 *
 * The seven translations are checked by their own number word; a count change
 * that updates only the Chinese README reddens here.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { auditSource } = require('../scripts/compositor-audit.cjs');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const CODE = read('lib/client.js');

const I18N = ['de', 'en', 'es', 'fr', 'ja', 'ko', 'ru'];
const ROW_WORDS = {
	de: ['fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'],
	en: ['five', 'six', 'seven', 'eight', 'nine', 'ten'],
	es: ['cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'],
	fr: ['cinq', 'six', 'sept', 'huit', 'neuf', 'dix'],
	ja: ['5', '6', '7', '8', '9', '10'],
	ko: ['다섯', '여섯', '일곱', '여덟', '아홉', '열'],
	ru: ['пять', 'шесть', 'семь', 'восемь', 'девять', 'десять']
};

function rowCount(text) {
	return (text.match(/ctx\.slots\.inject\("settings\.dreamSkin\.item"/g) || []).length;
}

/** The sentence that names the slot is the last mention in the architecture section. */
function sentenceAroundSlot(text) {
	const i = text.lastIndexOf('settings.dreamSkin.item');
	return i < 0 ? '' : text.slice(Math.max(0, i - 300), i + 80);
}

function rowProblems(readFile, count) {
	const problems = [];
	// Address the sentence by its phrase, not by the last mention of the slot:
	// the README's version notes also name `settings.dreamSkin.item`.
	for (const rel of ['README.md', 'docs/PROJECT.md']) {
		const phrase = `${count} 个功能行`;
		const i = readFile(rel).indexOf(phrase);
		if (i < 0) {
			problems.push(`${rel}: no "${phrase}"`);
			continue;
		}
		const window = readFile(rel).slice(Math.max(0, i - 120), i + phrase.length + 200);
		if (!window.includes('settings.dreamSkin.item')) problems.push(`${rel}: "${phrase}" is not next to settings.dreamSkin.item`);
	}
	if (count - 5 < 0 || count - 5 >= 6) {
		problems.push(`row count ${count} is outside the word table (5..10) — extend it deliberately`);
		return problems;
	}
	for (const lang of I18N) {
		const rel = `docs/i18n/README.${lang}.md`;
		const word = ROW_WORDS[lang][count - 5];
		if (!sentenceAroundSlot(readFile(rel)).includes(word)) {
			problems.push(`${rel}: the row sentence does not state "${word}" (${count})`);
		}
	}
	return problems;
}

function compositorNumbers() {
	const audit = auditSource(CODE, 'lib/client.js');
	const standard = audit.backdropFilters.filter((d) => d.property === 'backdrop-filter' && !d.webkit);
	const blurPanes = standard.filter((d) => typeof d.value === 'string' && d.value.includes('blur(') && !d.value.includes('none')).length;
	return { blurPanes, declarations: audit.counts.backdropFilterDeclarations };
}

function compositorSection(text) {
	const start = text.indexOf('## 🔬 合成器预算');
	if (start < 0) return '';
	const end = text.indexOf('\n## ', start + 1);
	return text.slice(start, end < 0 ? text.length : end);
}

function compositorProblems(text, numbers) {
	const problems = [];
	const section = compositorSection(text);
	if (!section) return ['README.md: the compositor-budget section moved'];
	if (!section.includes(`${numbers.blurPanes} 块 \`backdrop-filter\` 面板`)) {
		problems.push(`README.md: the section does not state ${numbers.blurPanes} 块 backdrop-filter 面板`);
	}
	if (!section.includes(`${numbers.declarations} 条声明`)) {
		problems.push(`README.md: the section does not state ${numbers.declarations} 条声明 (panes + none guards)`);
	}
	if (!section.includes('命令面板')) {
		problems.push('README.md: the pane list no longer names the `/` command menu (the sixth pane)');
	}
	return problems;
}

test('reference counts: the README row count and compositor pane list match the code', () => {
	const count = rowCount(CODE);
	assert.equal(count, 7, `the bundle registers ${count} settings rows — the word table assumes 5..10`);
	const numbers = compositorNumbers();
	assert.ok(numbers.blurPanes > 0, 'the audit found no blur-bearing panes — the parser broke');
	assert.ok(numbers.declarations > numbers.blurPanes, 'the declaration count must include the none guards');
	assert.deepEqual(rowProblems(read, count), []);
	assert.deepEqual(compositorProblems(read('README.md'), numbers), []);
});

test('mutation: a stale row count in README or PROJECT reddens by name', () => {
	const count = rowCount(CODE);
	for (const rel of ['README.md', 'docs/PROJECT.md']) {
		const stale = read(rel).replace(`${count} 个功能行`, `${count - 2} 个功能行`);
		const problems = rowProblems((r) => (r === rel ? stale : read(r)), count);
		assert.ok(problems.some((p) => p.startsWith(rel)), `a stale count in ${rel} must be named`);
	}
});

test('mutation: a wrong pane count, a missing command menu, or a wrong declaration count reddens', () => {
	const numbers = compositorNumbers();
	const readme = read('README.md');
	const wrongPanes = readme.replace(`${numbers.blurPanes} 块`, `${numbers.blurPanes - 1} 块`);
	assert.notEqual(wrongPanes, readme, 'the pane count anchor moved');
	assert.ok(compositorProblems(wrongPanes, numbers).some((p) => p.includes('块')), 'a wrong pane count must be named');

	const noMenu = readme.replace('命令面板', '');
	assert.notEqual(noMenu, readme, 'the command-menu anchor moved');
	assert.ok(compositorProblems(noMenu, numbers).some((p) => p.includes('command menu')), 'a missing sixth pane must be named');

	const wrongDecl = readme.replace(`${numbers.declarations} 条声明`, `${numbers.declarations - 2} 条声明`);
	assert.notEqual(wrongDecl, readme, 'the declaration-count anchor moved');
	assert.ok(compositorProblems(wrongDecl, numbers).some((p) => p.includes('条声明')), 'a wrong declaration count must be named');
});
