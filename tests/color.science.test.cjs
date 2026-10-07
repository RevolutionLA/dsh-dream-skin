"use strict";
// Color-science gates for `scripts/lib/color.cjs`.
//
// Two failure modes live in this file and both are silent, which is why they
// get their own tests:
//
//  1. Hand-copied constants. The APCA numbers below used to be retyped from
//     memory; the reverse-polarity branch reused the normal branch's exponents
//     and every dark skin was graded with a bent ruler (issue #78). The vectors
//     here come from the OFFICIAL implementation, not from our own arithmetic.
//
//  2. Lenient parsing. `parseColor` used to return NaN for a dozen malformed
//     shapes. NaN loses every `>=` comparison, so unparseable tokens scored as
//     perfect and printed invented numbers into the report (issue #72).
//
// If either changes, this file must go red before anything else green.

const test = require("node:test");
const assert = require("node:assert");
const C = require("../scripts/lib/color.cjs");

// ── 1. APCA reference vectors ───────────────────────────────────────────────
// Source of truth: `apca-w3@0.1.9` (npm), function `calcAPCA(text, bg)`.
// Regenerate with, from a scratch directory:
//   npm install apca-w3
//   node -e 'const {calcAPCA}=require("apca-w3"); /* print each pair */'
// Entries are [textColor, backgroundColor, expectedLc]. Both polarities are
// covered: positive Lc is dark-on-light, negative is light-on-dark.
const APCA_VECTORS = [
  ["#ffffff", "#000000", -107.885],
  ["#000000", "#ffffff", 106.041],
  ["#767676", "#ffffff", 71.572],
  ["#ffffff", "#767676", -77.036],
  ["#8a8a8a", "#ffffff", 62.083],
  ["#767676", "#000000", -30.103],
  ["#000000", "#767676", 32.51],
  ["#111317", "#edf0f7", 96.184],
  ["#edf0f7", "#111317", -97.326],
  ["#1c1c1e", "#fbf7ee", 99.288],
  ["#fbf7ee", "#1c1c1e", -101.153],
  ["#8bacdb", "#101014", -55.751],
  ["#4b5563", "#f9fafb", 83.198],
  ["#ffffff", "#4b5563", -91.072],
  ["#e5e7eb", "#111827", -91.05],
  ["#111827", "#e5e7eb", 90.247]
];

const TOLERANCE = 0.05;

function lc(text, bg) {
  return C.apcaContrast(C.parseColor(text), C.parseColor(bg));
}

test("APCA matches the official apca-w3@0.1.9 reference vectors", () => {
  const wrong = [];
  for (const [text, bg, expected] of APCA_VECTORS) {
    const got = lc(text, bg);
    if (Math.abs(got - expected) > TOLERANCE) {
      wrong.push(`${text} on ${bg}: got ${got.toFixed(3)}, official ${expected}`);
    }
  }
  assert.deepEqual(wrong, [], `APCA diverged:\n${wrong.join("\n")}`);
});

test("every reference vector is finite and signed the way APCA signs things", () => {
  // A light-on-dark pair must come back NEGATIVE. A implementation that
  // flipped the operands (or forgot to) still produces plausible magnitudes.
  for (const [text, bg, expected] of APCA_VECTORS) {
    const got = lc(text, bg);
    assert.ok(Number.isFinite(got), `${text}/${bg} returned ${got}`);
    assert.ok(Math.sign(got) === Math.sign(expected) || expected === 0,
      `${text} on ${bg}: sign ${Math.sign(got)} != ${Math.sign(expected)}`);
  }
});

test("the reverse-polarity branch is exercised by at least three vectors", () => {
  // Guard the guard: if someone trims the vector list down to normal-polarity
  // pairs, the previous two tests would keep passing while the branch that was
  // actually broken goes unmeasured again.
  const reverse = APCA_VECTORS.filter(([, , v]) => v < 0);
  const normal = APCA_VECTORS.filter(([, , v]) => v > 0);
  assert.ok(reverse.length >= 3, `need >=3 reverse-polarity vectors, have ${reverse.length}`);
  assert.ok(normal.length >= 3, `need >=3 normal-polarity vectors, have ${normal.length}`);
});

test("the two polarity branches really are distinct code paths", () => {
  // If the branches were collapsed back into one shared formula these numbers
  // would not move: swapping exponents changes the reverse-polarity result by
  // several Lc while leaving the normal-polarity result untouched.
  const woB = lc("#fbf7ee", "#1c1c1e");
  const boW = lc("#1c1c1e", "#fbf7ee");
  assert.ok(Math.abs(woB) !== Math.abs(boW), "polarity must be asymmetric");
  assert.ok(Math.abs(woB) > 100 && boW > 95, `both sides should read high, got ${woB} / ${boW}`);
});

// ── 2. Parsing strictness ──────────────────────────────────────────────────
const VALID = [
  ["#abc", { r: 170, g: 187, b: 204, a: 1 }],
  ["#aabbcc", { r: 170, g: 187, b: 204, a: 1 }],
  ["#aabbcc80", { r: 170, g: 187, b: 204, a: 128 / 255 }],
  ["rgb(170, 187, 204)", { r: 170, g: 187, b: 204, a: 1 }],
  ["rgba(170, 187, 204, 0.5)", { r: 170, g: 187, b: 204, a: 0.5 }],
  ["rgb(170 187 204)", { r: 170, g: 187, b: 204, a: 1 }],
  ["rgb(170 187 204 / 0.5)", { r: 170, g: 187, b: 204, a: 0.5 }],
  ["rgb(170 187 204 / 50%)", { r: 170, g: 187, b: 204, a: 0.5 }],
  ["rgba(255, 255, 255, 50%)", { r: 255, g: 255, b: 255, a: 0.5 }]
];

const INVALID = [
  undefined,
  null,
  "",
  "   ",
  "#gggggg",
  "#12345",
  "#",
  "rgb(170, 187)",
  "rgba(255, 255, 255, )",
  "rgba(255, 255, 255, 50)", // unqualified number: cannot mean 0.5
  "rgb(170, 187, 204, )",
  "rgb(300, 187, 204)",
  "rgb(170px, 187, 204)",
  "blue",
  "var(--x)",
  "rgb(170 187 204 / )",
  "#ffffff00ff"
];

test("parseColor accepts every shape the plugin authors", () => {
  for (const [input, expected] of VALID) {
    const got = C.parseColor(input);
    assert.ok(got, `${input} should parse`);
    for (const k of ["r", "g", "b", "a"]) {
      assert.ok(Math.abs(got[k] - expected[k]) < 1e-9,
        `${input}: ${k} = ${got[k]}, expected ${expected[k]}`);
      assert.ok(Number.isFinite(got[k]), `${input}: ${k} must be finite, got ${got[k]}`);
    }
  }
});

test("parseColor rejects every malformed shape instead of returning NaN", () => {
  const leaked = [];
  for (const input of INVALID) {
    let got;
    try {
      got = C.parseColor(input);
    } catch (e) {
      continue; // rejected — correct
    }
    const finite = got && ["r", "g", "b", "a"].every((k) => Number.isFinite(got[k]));
    leaked.push(`${JSON.stringify(input)} -> ${JSON.stringify(got)}${finite ? "" : " (non-finite!)"}`);
  }
  assert.deepEqual(leaked, [], `accepted a malformed color:\n${leaked.join("\n")}`);
});

test("parseColor reports `50%` alpha as 0.5, not 50", () => {
  // The specific trap: a percentage alpha that lands as a raw number reads as
  // fully opaque in the audit while staying translucent in the browser.
  const v = C.parseColor("rgba(255, 255, 255, 50%)");
  assert.equal(v.a, 0.5, "percentage alpha converts");
  assert.throws(() => C.parseColor("rgba(255, 255, 255, 50)"), /alpha out of 0\.\.1/);
});

// ── 3. Contrast primitives ─────────────────────────────────────────────────
test("WCAG 2.1 contrast matches the textbook anchors", () => {
  const cr = (a, b) => C.contrastRatio(C.parseColor(a), C.parseColor(b));
  assert.ok(Math.abs(cr("#ffffff", "#000000") - 21) < 0.01);
  assert.ok(Math.abs(cr("#ffffff", "#ffffff") - 1) < 0.01);
  // The canonical "threshold grey": #767676 is the darkest grey meeting 4.5:1
  // on white, and #949494 the darkest meeting 3:1.
  assert.ok(Math.abs(cr("#767676", "#ffffff") - 4.54) < 0.02, `${cr("#767676", "#ffffff")}`);
  assert.ok(cr("#949494", "#ffffff") > 2.95 && cr("#949494", "#ffffff") < 3.05);
});

test("no contrast function can return a non-finite number", () => {
  // Downstream code formats these into report strings; a NaN there looks like
  // a measurement and gets copied into documentation as fact.
  const pairs = [["#000000", "#ffffff"], ["#ffffff", "#000000"], ["#808080", "#808080"]];
  for (const [a, b] of pairs) {
    const ca = C.parseColor(a);
    const cb = C.parseColor(b);
    for (const v of [C.contrastRatio(ca, cb), C.apcaContrast(ca, cb), C.deltaEok(ca, cb)]) {
      assert.ok(Number.isFinite(v), `${a}/${b} produced ${v}`);
    }
  }
});
