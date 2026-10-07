// dsh-dream-skin — dependency-free color science for the skin design system.
//
// Why this exists: the preset skins are judged against a *measurable* quality
// bar (contrast, perceptual lightness ladders, hue purity), not against
// "looks nice to me". Every number below is computed the way a browser would
// actually resolve the CSS color, including alpha compositing over the canvas.
//
// Conversions follow Björn Ottosson's OKLab/OKLCH (the same space CSS
// `oklch()` uses), so lightness steps are perceptually even instead of the
// sRGB-ramp mush that makes most hand-tuned palettes read as "muddy".

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// ── parsing ────────────────────────────────────────────────────────────────
// The shapes the plugin authors, and nothing else:
//   #rgb   #rgba   #rrggbb   #rrggbbaa
//   rgb(r, g, b)              rgba(r, g, b, a)
//   rgb(r g b)                rgb(r g b / a)
// Percentages are accepted on channels (`50%`) and on alpha (`50%` = 0.5).
//
// Anything else throws — no silent fallbacks, ever. This function used to hand
// back `NaN` for about a dozen malformed shapes (issue #72), and NaN compares
// as "greater than every threshold", so an unparseable token graded as a
// perfect passes and even printed an invented number into the report.
const NUMERIC = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?%?$/i;

function reject(input, why) {
  throw new Error(`unparsable color ${JSON.stringify(input)}: ${why}`);
}

/** One colour channel (`0..255` numeric or `0%..100%`). */
function readChannel(part, input) {
  if (!NUMERIC.test(part)) reject(input, `bad channel ${JSON.stringify(part)}`);
  if (part.endsWith("%")) {
    const pct = parseFloat(part);
    if (!(pct >= 0 && pct <= 100)) reject(input, `percentage out of range: ${part}`);
    return (pct / 100) * 255;
  }
  const v = parseFloat(part);
  if (!(v >= 0 && v <= 255)) reject(input, `channel out of 0..255: ${part}`);
  return v;
}

/** Alpha slot. `50%` means 0.5 — reading it as `50` is how a tinted token
 *  turns fully opaque in the report while staying translucent in the browser. */
function readAlpha(part, input) {
  if (part === undefined) return 1;
  if (part === "") reject(input, "empty alpha");
  if (!NUMERIC.test(part)) reject(input, `bad alpha ${JSON.stringify(part)}`);
  const v = part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part);
  if (!(v >= 0 && v <= 1)) reject(input, `alpha out of 0..1: ${part}`);
  return v;
}

function parseHex(s) {
  const body = s.slice(1);
  if (!/[0-9a-f]+$/i.test(body)) reject(s, "bad hex");
  const full =
    body.length <= 4 ? body.split("").map((ch) => ch + ch).join("") : body;
  if (full.length !== 6 && full.length !== 8) reject(s, `bad hex length ${body.length}`);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1
  };
}

function parseRgb(s) {
  const fn = /^rgba?\(([^()]+)\)$/i.exec(s);
  if (!fn) reject(s, "not a recognised color");
  const body = fn[1].trim();
  if (body.includes("/") && body.includes(",")) reject(s, "mixed comma and slash syntax");

  const slash = body.indexOf("/");
  const heading = (slash >= 0 ? body.slice(0, slash) : body).trim();
  // `undefined` (not null) marks "no alpha slot at all"; every later check and
  // `readAlpha`'s early return agree on that sentinel.
  let tail = slash >= 0 ? body.slice(slash + 1).trim() : undefined;
  if (slash >= 0 && tail === "") reject(s, "empty alpha after `/`");

  // Comma form: slots may not be empty. A trailing comma (`rgba(1,2,3,)`) used
  // to filter down to three channels and silently read as alpha 1 — which is
  // exactly how a broken token earned a perfect score in the audit.
  const commaForm = heading.includes(",");
  const raw = commaForm ? heading.split(",") : heading.split(/\s+/);
  if (commaForm && raw.some((p) => p.trim() === "")) reject(s, "empty slot in rgb()");
  const parts = raw.map((p) => p.trim()).filter((p) => p !== "");

  if (parts.length < 3) reject(s, `needs 3 channels, got ${parts.length}`);
  if (parts.length > 3) {
    // `rgba(r, g, b, a)` — the alpha rode along in the comma list.
    if (tail !== undefined || parts.length !== 4) reject(s, `unexpected ${parts.length} channels`);
    tail = parts[3];
  }
  if (tail === "" ) reject(s, "empty alpha");

  return {
    r: readChannel(parts[0], s),
    g: readChannel(parts[1], s),
    b: readChannel(parts[2], s),
    a: readAlpha(tail, s)
  };
}

function parseColor(input) {
  const s = typeof input === "string" ? input.trim() : null;
  if (!s) reject(input, "not a string");
  // `transparent` is a CSS-wide colour KEYWORD the browser honours (it
  // computes to `rgba(0, 0, 0, 0)`), and the host itself ships it — it is the
  // default value of `--dsw-focus-ring-color`. Rejecting it would report a
  // perfectly legal token as malformed, which is the opposite of what the
  // strict parser exists for: issue #72 is about shapes the browser CANNOT
  // paint. Measured as a=0, the audit can then say "this ring is invisible"
  // instead of "this token is broken".
  if (s.toLowerCase() === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  if (s.startsWith("#")) return parseHex(s);
  return parseRgb(s);
}

// ── sRGB <-> linear ────────────────────────────────────────────────────────
const srgbToLinear = (c) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};
const linearToSrgb = (x) => {
  const v = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.round(clamp01(v) * 255);
};

// ── OKLab / OKLCH ──────────────────────────────────────────────────────────
function rgbToOklab({ r, g, b }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  };
}

function oklabToRgbRaw({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  };
}

const inGamut = ({ r, g, b }) => {
  const eps = 1e-4;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && b >= -eps && b <= 1 + eps;
};

/**
 * OKLCH -> 8-bit sRGB, reducing chroma (never lightness or hue) until the
 * color fits the gamut. Clamping channels instead would shift the hue — the
 * exact reason hand-mixed palettes drift brown/green at the dark end.
 */
function oklchToRgb(L, C, H) {
  const rad = (H * Math.PI) / 180;
  let lo = 0;
  let hi = C;
  const at = (c) => oklabToRgbRaw({ L, a: c * Math.cos(rad), b: c * Math.sin(rad) });
  if (!inGamut(at(C))) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(at(mid))) lo = mid;
      else hi = mid;
    }
  } else {
    lo = C;
  }
  const lin = at(lo);
  return { r: linearToSrgb(lin.r), g: linearToSrgb(lin.g), b: linearToSrgb(lin.b), a: 1 };
}

const rgbToOklch = (rgb) => {
  const { L, a, b } = rgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
};

const hex = ({ r, g, b }) =>
  `#${[r, g, b].map((c) => Math.round(clamp01(c / 255) * 255).toString(16).padStart(2, "0")).join("")}`;

/** OKLCH triple -> `#rrggbb` (gamut-mapped by chroma reduction). */
const oklchHex = (L, C, H) => hex(oklchToRgb(L, C, H));

/** Parse any authored color to its OKLCH triple (alpha kept separately). */
function toOklch(input) {
  const c = parseColor(input);
  const { L, C, H } = rgbToOklch(c);
  return { L, C, H, a: c.a, rgb: { r: c.r, g: c.g, b: c.b } };
}

// ── contrast ───────────────────────────────────────────────────────────────
const relativeLuminance = ({ r, g, b }) =>
  0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);

/** WCAG 2.1 contrast ratio, 1..21. */
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * APCA — Accessible Perceptual Contrast Algorithm, `0.0.98G-4g` constants,
 * i.e. the set shipped by `apca-w3@0.1.9`. Returns Lc, roughly -108..106;
 * |Lc| >= 75 is "body text comfortable", >= 60 for large/secondary content.
 * WCAG 2 contrast is a poor model for dark UI (it over-rewards near-black
 * pairs), so the audit reports both and requires both to pass.
 *
 * Two things this implementation got wrong before, both worth naming because
 * both were silent and both erred "conservatively" (under-reporting):
 *   1. Y must be the straight `(c/255)^2.4` power form, not the piecewise sRGB
 *      EOTF. Applying the transfer curve twice under-reports every dark pair.
 *   2. The reverse-polarity branch uses its OWN exponents (revBG 0.65 on the
 *      background, revTXT 0.62 on the text), not the normal ones. Reusing the
 *      normal branch's exponents warped all five dark skins (issue #78).
 * The constants below are pinned against the official package by
 * `tests/color.science.test.cjs`; regenerate rather than retype them.
 */
const APCA_CONSTANTS = Object.freeze({
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revBG: 0.65,
  revTXT: 0.62,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  loClip: 0.1,
  deltaYmin: 0.0005
});

function apcaContrast(textRgb, bgRgb) {
  const K = APCA_CONSTANTS;
  const y = (c) => Math.pow(clamp01(c / 255), K.mainTRC);
  let Ytxt = K.sRco * y(textRgb.r) + K.sGco * y(textRgb.g) + K.sBco * y(textRgb.b);
  let Ybg = K.sRco * y(bgRgb.r) + K.sGco * y(bgRgb.g) + K.sBco * y(bgRgb.b);
  // Soft-clamp only the dark end; bright values pass through untouched.
  if (Ytxt < K.blkThrs) Ytxt += Math.pow(K.blkThrs - Ytxt, K.blkClmp);
  if (Ybg < K.blkThrs) Ybg += Math.pow(K.blkThrs - Ybg, K.blkClmp);
  if (Math.abs(Ybg - Ytxt) < K.deltaYmin) return 0;
  let lc;
  if (Ybg > Ytxt) {
    // Normal polarity: dark text on a lighter background. Positive Lc.
    const sapc = (Math.pow(Ybg, K.normBG) - Math.pow(Ytxt, K.normTXT)) * K.scaleBoW;
    lc = sapc < K.loClip ? 0 : sapc - K.loBoWoffset;
  } else {
    // Reverse polarity: light text on a darker background. Negative Lc.
    // NOTE: revBG/revTXT, not normBG/normTXT — this is the bug that was here.
    const sapc = (Math.pow(Ybg, K.revBG) - Math.pow(Ytxt, K.revTXT)) * K.scaleWoB;
    lc = sapc > -K.loClip ? 0 : sapc + K.loWoBoffset;
  }
  return lc * 100;
}

// ── compositing ────────────────────────────────────────────────────────────
/** Source-over composite of `fg` (may carry alpha) onto opaque `bg`. */
function composite(fg, bg) {
  const a = fg.a === undefined ? 1 : fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1
  };
}

/** Perceptual OKLab distance (roughly "how different do these look"). */
function deltaEok(a, b) {
  const la = rgbToOklab(a);
  const lb = rgbToOklab(b);
  const dl = la.L - lb.L;
  const da = la.a - lb.a;
  const db = la.b - lb.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

/** Smallest signed angular distance between two hues (0..180). */
function hueDistance(h1, h2) {
  const d = Math.abs(((h1 - h2) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

module.exports = {
  clamp01,
  parseColor,
  srgbToLinear,
  linearToSrgb,
  rgbToOklab,
  oklabToRgbRaw,
  oklchToRgb,
  rgbToOklch,
  hex,
  oklchHex,
  toOklch,
  relativeLuminance,
  contrastRatio,
  apcaContrast,
  APCA_CONSTANTS,
  composite,
  deltaEok,
  hueDistance,
  inGamut
};
