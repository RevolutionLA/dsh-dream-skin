/**
 * dsh-dream-skin — WHO ELSE ADDRESSES `_fade` (issue #105).
 *
 * Issue #97 replaced a build-hash anchor (`.qDHVXG_fade`) with a hash-FREE one,
 * `[class$="_fade"]`, so the session-list foot fade keeps being neutralised when DSH
 * re-rolls its class names. That choice buys durability and pays for it in SCOPE: every
 * element whose class attribute ENDS in `_fade` is neutralised under a wallpaper wash,
 * whoever drew it. The 10.8.1 review round established the host half by reasoning
 * (`bhn1Oq_fade` is the only such class in the host install; `*_fadeTop`/`*_fadeBottom`
 * are different tokens and they mask rather than paint) and then found the sentence that
 * reasoning cannot settle: a third-party theme pack installed on the SAME machine writes
 * `[data-slot="sidebar.workspaces"] [class*="_fade"]` too, and "which of the two rules
 * wins" was left in a comment with no measurement, no field, and no issue attached —
 * issue #95's exact failure shape.
 *
 * So this measures it, from the bytes that are actually installed:
 *   - every package in the host corpus AND in the third-party plugin corpus that mentions
 *     `_fade` gets a row, with the token shapes it uses and whether our suffix anchor can
 *     address the element it targets;
 *   - `hitByUs` is derived from the TOKEN, not from a hope: a class token that ends exactly
 *     at `_fade` is addressable by `[class$="_fade"]`; `_fadeTop` / `_fade-in` are not. The
 *     `keyframes` shape is called out separately because the review round mistook the host's
 *     `@keyframes BInVoG_fade-in` for a second hit — that mistake is now a classification.
 *   - every owner needs a DISPOSITION (a decision with a date), and an owner with no
 *     disposition reddens the gate by name. That is what makes "we share this face with
 *     somebody else" a claim a future run has to re-decide instead of a paragraph.
 */
"use strict";

const FADE_RULER =
	'An owner is any package in the scanned corpora whose code mentions `_fade`. Each occurrence is ' +
	'classified by the token that FOLLOWS it (`_fade` exactly vs `_fadeTop`, `_fade-in`, …) and by the ' +
	'shape it sits in: an attribute selector (`[class$=…]` / `[class*=…]`), a class token (`.hash_fade`), ' +
	'a @keyframes / animation name (NOT addressable as a class, and NOT a coexistence risk), or other text. ' +
	'`suffixAddressable` is true only when a selector-shaped occurrence ends exactly at `_fade` — that is the ' +
	'condition under which our `[class$="_fade"]` rule can reach an element that package draws. Occurrences ' +
	'are counted per package, samples are truncated, and a corpus root that is absent here is recorded as ' +
	'absent rather than as "nobody else uses it".';

/** Our own anchor, kept as text so the census can say who shares it. */
const OUR_FADE_ANCHOR = '[class$="_fade"]';

/**
 * A class name being written from JavaScript, immediately before the token:
 * `classList.add("shop_` / `className = "shop_` / `class: "shop_`. Requires the opening
 * quote, so `data-class="` style attribute names do not match.
 */
const JS_CLASS_CONTEXT = /(?:classList\s*\.\s*(?:add|toggle|remove)\s*\(\s*|className\s*[:=]\s*|class\s*[:=]\s*)["'`][^"'`]*$/;

/**
 * What each shape of occurrence means for the suffix anchor.
 * `attr` / `class` are selector positions; `keyframes` is an animation name; `other` is
 * prose or an identifier that is not a selector at all.
 */
/**
 * Two independent questions, because the 10.8.1 review round confused them and drew a
 * wrong conclusion from it:
 *   - is this occurrence ADDRESSING AN ELEMENT (a CSS selector), or is it a JS identifier /
 *     an animation name that merely contains the text `_fade`?
 *   - does the class TOKEN end exactly at `_fade`, which is what makes our
 *     `[class$="_fade"]` able to reach it?
 * `dsh-client-ui-chat` is the first: `.O_Ebla_fadeTop{mask-image:…}` IS a selector, but the
 * token ends at `fadeTop`, so we never touch it. `dsh-pet`'s `this._fadeInSeconds = …` and
 * the host's `@keyframes BInVoG_fade-in` are neither — and a rule that called those
 * "selectors" would demand dispositions for faces that do not exist.
 */
function classifyOccurrence(text, at) {
	// The token that follows `_fade` (empty when the attribute/identifier ends right there).
	const tail = /^[_a-zA-Z0-9-]*/.exec(text.slice(at + 5))[0];
	const before = text.slice(Math.max(0, at - 160), at + 5 + tail.length);
	const rest = text.slice(at + 5 + tail.length, at + 5 + tail.length + 8);
	const window = before + rest;
	let shape = "identifier";
	// ANIMATION, not "an animation appeared somewhere in the last 160 characters" (blue-team
	// B1): the NAME position has to end at the token. The loose form read
	// `.btn{animation:pulse 1s}.skinshop_fade{bottom:0}` as a keyframes name, which then
	// skipped the class rule below AND the disposition requirement with it.
	if (/@keyframes\s+[A-Za-z0-9_-]*$/.test(before) || /animation(?:-name)?:\s*[A-Za-z0-9_-]*$/.test(before)) {
		shape = "keyframes";
	} else if (/class[*$^]?=[\\'"]/.test(before)) {
		shape = "attr";
	} else {
		// A CSS rule head or any selector position: `.x_fadeTop{`, `.x_fade, .y{`, `.x_fade:hover{`,
		// `.x_fade>span`, `:is(.x_fade)`. Three guards keep JS out, each earned by measuring:
		//   - the dot must be a SELECTOR dot: `this._fadeTimeSeconds,a>1` is a comma operator in the
		//     Live2D vendor, and without this it reads as a selector list (4 false selectors, then 1);
		//   - the token must be followed by a selector-ish continuation, not `=`/`;`/`)`-then-code;
		//   - EVERY candidate in the window is tried, not just the first, so a rejected member
		//     access cannot hide a real selector later in the same window.
		// (Third-party 10.9.0, T3: the first version demanded `,`/`{` immediately after the token,
		// so `.x_fade:hover{` — a plain class selector — was filed as an identifier and its owner
		// needed no disposition at all.)
		for (const m of window.matchAll(/[.][A-Za-z0-9_-]*_fade[A-Za-z0-9_-]*/g)) {
			const prev = m.index > 0 ? window[m.index - 1] : "";
			const after = window.slice(m.index + m[0].length, m.index + m[0].length + 1);
			// A `.` preceded by an identifier character is normally JS member access
			// (`this._fadeInSeconds`). It is a CHAINED TYPE SELECTOR (`div.shop_fade{`,
			// `.a.shop_fade{`) only when a rule body opens immediately after the token — in JS
			// that sequence cannot occur, which is what makes this decidable without a parser.
			// (Adjudication 10.9.0 R1: the flat "prev must not be identifier-ish" rule read both
			// as identifiers, so a whole class of real selectors needed no disposition.)
			const chained = prev !== "" && /[A-Za-z0-9_$)\]'"`.]/.test(prev);
			if (chained && after !== "{") continue;
			if (after !== "" && !/[,{>+~:(.\[\s)]/.test(after)) continue;
			shape = "class";
			break;
		}
		if (shape === "identifier" && JS_CLASS_CONTEXT.test(before)) {
			// A class name that only ever appears in JS (blue-team B8): `classList.add("shop_fade")`
			// paints an element our suffix anchor can reach, yet no CSS text in that bundle names
			// it. Its own shape, so the gate demands a decision instead of filing it under
			// "identifiers, no overlap".
			shape = "js-class";
		}
	}
	return { token: "_fade" + tail, shape };
}

/**
 * Count every `_fade` occurrence in the corpus, grouped by package.
 * @param {string[]} files absolute paths
 * @param {(f: string) => string} readFile
 * @param {(f: string) => string} packageOf
 */
function measureFade(files, readFile, packageOf) {
	const owners = new Map();
	for (const file of files) {
		let text;
		try { text = readFile(file); } catch { continue; }
		let i = -1;
		while ((i = text.indexOf("_fade", i + 1)) !== -1) {
			const pkg = packageOf(file);
			const row = owners.get(pkg) || { occurrences: 0, tokens: {}, shapes: {}, files: new Set(), samples: [], exactSelector: 0 };
			const { token, shape } = classifyOccurrence(text, i);
			row.occurrences += 1;
			row.tokens[token] = (row.tokens[token] || 0) + 1;
			row.shapes[shape] = (row.shapes[shape] || 0) + 1;
			// BLUE-TEAM PRECISION: "can our anchor reach it" is not "this package mentions the
			// token somewhere" — it is "a SELECTOR-SHAPED occurrence ends exactly at `_fade`".
			// Counting them here keeps a row with `.x_fadeTop{…}` AND an unrelated `_fade`
			// identifier from being read as addressable.
			if (token === "_fade" && (shape === "attr" || shape === "class" || shape === "js-class")) row.exactSelector += 1;
			row.files.add(file);
			if (row.samples.length < 5) {
				row.samples.push(text.slice(Math.max(0, i - 90), i + 40).replace(/\s+/g, " "));
			}
			owners.set(pkg, row);
		}
	}
	const out = {};
	for (const [pkg, row] of owners.entries()) {
		const selectorShapes = (row.shapes.attr || 0) + (row.shapes.class || 0) + (row.shapes["js-class"] || 0);
		out[pkg] = {
			occurrences: row.occurrences,
			tokens: Object.fromEntries(Object.entries(row.tokens).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
			shapes: row.shapes,
			files: row.files.size,
			// Can OUR `[class$="_fade"]` address anything this package draws? Only a token that
			// ends exactly at `_fade`, and only where it appears as a selector (CSS rule head,
			// attribute selector, or a class name written from JS).
			suffixAddressable: row.exactSelector > 0,
			selectorOccurrences: selectorShapes,
			exactSelectorOccurrences: row.exactSelector,
			samples: row.samples
		};
	}
	return out;
}

/**
 * Recorded decisions, one per SELECTOR-SHAPED owner. Kinds:
 *   `host-target` — the face our anchor exists for, drawn by the host;
 *   `coexistent`  — another plugin addresses the same family; the overlap is accepted and
 *                   its shape is described, so a change forces the sentence to be retaken;
 *   `no-impact`   — it does write `_fade`-shaped class selectors, but the tokens never END at
 *                   `_fade`, so our suffix anchor cannot reach what it draws;
 *   `ours`        — reserved for this plugin's own bundle (excluded from the corpus by name,
 *                   so the census never confirms itself).
 * An owner that only mentions `_fade` in identifiers or animation names needs no row at all:
 * demanding a decision about a face that is not addressed would train people to dismiss the
 * gate, which is the failure mode issue #95 was about.
 */
const FADE_DISPOSITIONS = {
	"@deepseek-ai/dsh-client-ui-workspace": { kind: "host-target", since: "10.8.0", note: "the session-list foot fade our anchor exists for (`<hash>_fade`)" },
	"@deepseek-ai/dsh-client-ui-chat": { kind: "no-impact", since: "10.9.0", note: "`<hash>_fadeTop` / `<hash>_fadeBottom` scroll masks — selector-shaped, but the tokens do not END in `_fade`, so [class$=\"_fade\"] cannot address them" },
	"@linxin666/dsh-client-ui-skin-center": { kind: "coexistent", since: "10.9.0", note: "writes [data-slot=\"sidebar.workspaces\"] [class*=\"_fade\"] { background: none !important } — the same goal as #97 with a broader operator, higher specificity and !important; who-covers-whom is measured by the wash:check coexistence stage, not argued" }
};

/**
 * The gate. Pure over (measured owners, dispositions, which corpora were actually read),
 * so a test can hand it a synthetic census and watch it redden — the acceptance criterion
 * issue #105 sets: a new `_fade` owner must be named, not absorbed.
 */
function checkFade({ owners, dispo, corpora, known }) {
	const problems = [];
	const notices = [];
	if (!owners || Object.keys(owners).length === 0) {
		return { problems: ["the fade census found no owner at all — a corpus that empty is not evidence of coexistence, it is a corpus that did not scan"], notices, counts: { owners: 0, addressable: 0 } };
	}
	if (!Array.isArray(corpora) || corpora.length === 0) {
		return { problems: ["checkFade needs the corpus list (which roots were read, which were absent)"], notices, counts: { owners: 0, addressable: 0 } };
	}
	for (const [pkg, row] of Object.entries(owners)) {
		// A package that only mentions `_fade` inside JS identifiers (a Live2D timer field, an
		// animation name) shares nothing with a class anchor; demanding a decision about it
		// would train whoever reads the gate to dismiss the noise. Only SELECTOR-shaped
		// occurrences — where the token is used to address an element — need a disposition.
		const inSelector = (row.selectorOccurrences || 0) > 0;
		const d = dispo[pkg];
		if (!d) {
			if (!inSelector) continue;
			problems.push(`owner "${pkg}" (${row.occurrences} occurrence(s), ${row.selectorOccurrences} in selector position, suffixAddressable=${row.suffixAddressable}) has no disposition — decide what the overlap means and record it`);
			continue;
		}
		// A disposition must match the measurement: claiming `no-impact` for a package whose
		// token IS addressable is the silent-green shape this gate exists to refuse.
		if (d.kind === "no-impact" && row.suffixAddressable) {
			problems.push(`owner "${pkg}" is dispositioned no-impact but our ${OUR_FADE_ANCHOR} can address its class — re-decide`);
		}
		if (d.kind === "host-target" && !row.suffixAddressable) {
			problems.push(`owner "${pkg}" is dispositioned host-target but nothing it draws is addressable any more — the face moved`);
		}
		// Blue-team B6: `coexistent` used to be the one kind with no measurement attached to it
		// at all — pre-registering a package name that does not exist, or filing an
		// unaddressable owner under it, both kept the gate green. The whole point of the kind is
		// "somebody else CAN hit this face", so that claim has to hold.
		if (d.kind === "coexistent" && !row.suffixAddressable) {
			problems.push(`owner "${pkg}" is dispositioned coexistent but our ${OUR_FADE_ANCHOR} cannot address anything it draws — coexistence that cannot happen is not an accepted cost, it is a stale claim`);
		}
		if (d.kind === "no-impact" && !inSelector) {
			problems.push(`owner "${pkg}" is dispositioned no-impact but no occurrence sits in a selector any more — the claim describes a face that is gone`);
		}
	}
	// Third-party 10.9.0 (T2): the roster of packages the corpora ACTUALLY contained. Without
	// it, "this plugin is not installed here" arrived as "the recorded claim is stale" and
	// `host:census:check` exited 1 on a machine that simply had a different plugin set — the
	// same conflation the host/fade split above exists to avoid, one level down.
	const roster = new Set();
	for (const c of corpora) for (const n of c.names || []) roster.add(n);
	// `known` = the packages the FROZEN census has an owner row for. It is what separates the
	// two "no owner today" cases (blue-team B6 vs third-party T2):
	//   a package the census measured, just not installed HERE -> notice ("cannot re-verify")
	//   a package the census never measured at all             -> red (a claim with no basis)
	const measured = new Set(known || []);
	for (const [pkg, d] of Object.entries(dispo)) {
		if (owners[pkg] || d.kind === "ours") continue;
		const notInstalledHere = roster.size > 0 && !roster.has(pkg);
		if (notInstalledHere && (measured.size === 0 || measured.has(pkg))) {
			notices.push(`NOT RE-VERIFIED here: "${pkg}" is not among the ${roster.size} scanned packages — the frozen claim stands unverified on this machine`);
			continue;
		}
		problems.push(`disposition "${pkg}" (${d.kind}) has no measured owner — the face it describes is gone from the corpus; delete the claim or find where it moved`);
	}
	const absent = corpora.filter((c) => !c.exists);
	if (absent.length) {
		// Declared, not hidden, and NOT a red: a machine without the plugin corpus cannot
		// re-measure the third-party half, which is a fact about that machine rather than a
		// disagreement with the census. It has to be printed, because "no other owner was
		// found" must never be the default reading of "we did not look". Named per ROOT with
		// the ones that WERE read alongside, so a single missing profile cannot look like the
		// whole plugin half went unscanned.
		const read = corpora.filter((c) => c.exists).map((c) => `${c.kind}=${c.packages}`);
		notices.push(`NOT RE-MEASURED here: ${absent.map((c) => `${c.kind} ${c.path}`).join(', ')} — the frozen owners from those roots are unverified on this machine; re-measured: ${read.join(', ') || '(nothing)'}`);
	}
	return {
		problems,
		notices,
		counts: { owners: Object.keys(owners).length, addressable: Object.values(owners).filter((r) => r.suffixAddressable).length }
	};
}

module.exports = { FADE_RULER, OUR_FADE_ANCHOR, FADE_DISPOSITIONS, measureFade, classifyOccurrence, checkFade };
