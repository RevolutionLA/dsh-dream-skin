// dsh-dream-skin — the Mirage skin design system (authoring tool, not shipped).
//
// WHY A GENERATOR INSTEAD OF HAND-TUNED HEX
// -----------------------------------------
// The eight presets used to be hand-mixed hex. Hand-mixing sRGB ramps produces
// exactly the failure modes that separate "a theme" from "a designed system":
//   - lightness steps that are uneven in perception (a 6-unit sRGB step near
//     black is a huge visual jump; the same step near white is invisible);
//   - hue that drifts as the ramp darkens (cool gray -> brown -> green), which
//     reads as "dirty" no matter how good the accent is;
//   - text levels that pass contrast on the canvas but fail on the raised
//     surfaces they are actually rendered on.
// Every surface here is placed on ONE OKLCH hue axis with a lightness ladder
// measured in perceptual units, and every text level is SOLVED against the
// worst surface it can land on (see solveTextLevel).
//
// Output is plain `#rrggbb` / `rgba(...)` — the shapes the plugin has always
// authored — because `oklch()` in a token would defeat the popup-opacity
// slider's strict parser (documented in docs/themes-spec.md) and `hsl()` would
// lose the skin's hue on dialogs. Perceptual authoring, sRGB delivery.

const C = require("./lib/color.cjs");
const { validateDefaults } = require("./lib/skin-defaults.cjs");

// ── elevation ladder (perceptual, in OKL L) ────────────────────────────────
// Higher elevation = lighter in BOTH schemes. That is how light behaves: a
// panel lifted toward the viewer catches more of the ambient light. Material's
// tonal elevation and Apple's dark-mode surfaces both do this; a scheme that
// inverts direction between light and dark (the old `ivory` did — canvas
// #f4f4f6 but layer-3 #fafafc, i.e. the "highest" level was the *darkest*)
// reads as an accident.
//
// Steps are deliberately tight. Award-winning UI separates layers with a
// hairline plus a whisper of lightness — never with a second hue or a heavy
// fill. For the translucent skins the steps are a little wider, because a
// frosted pane has to be *seen* to read as glass.
const RAMP = {
  dark: {
    canvas: 0,
    // The rail recedes: it sits *behind* the content, not beside it. It is the
    // one step that goes DOWN, so it must be authored opaque — a translucent
    // fill can only ever be lighter than what is behind it.
    sidebar: -0.010,
    modulePlatform: 0.014,
    layer1: 0.042,
    bubble: 0.058,
    layer3: 0.074,
    tip: 0.082,
    layer2: 0.100
  },
  // On paper the whole ladder has to fit between the canvas and pure white, so
  // the steps are smaller and the count is the same. 0.007–0.012 OKL L is
  // about two sRGB steps near white: invisible alone, unmistakable next to a
  // hairline — which is exactly how paper separates layers.
  light: {
    canvas: 0,
    modulePlatform: -0.014,
    sidebar: -0.007,
    layer1: 0.008,
    bubble: 0.015,
    layer3: 0.022,
    tip: 0.029,
    layer2: 0.036
  },
  // The one skin whose surfaces are genuinely translucent gets a wider ladder
  // — a 0.008 step behind 62% white is invisible, and then "glass" is just a
  // slightly lighter gray.
  glass: {
    canvas: 0,
    modulePlatform: 0.007,
    sidebar: 0.014,
    layer1: 0.022,
    bubble: 0.029,
    layer3: 0.036,
    tip: 0.043,
    layer2: 0.050
  }
};

/**
 * How each surface is authored. `null` = opaque hex; a number = the alpha of a
 * translucent fill whose color is SOLVED so that compositing it over the canvas
 * lands exactly on the ramp target. That solve is what keeps `mist` (frosted
 * panes) and `ivory` (flat paper) on the same elevation ladder — otherwise the
 * glass skin's dialogs and cards silently swap places.
 */
const ALPHA = {
  dark: {
    canvas: null,
    modulePlatform: null,
    sidebar: null,
    layer1: null,
    layer3: null,
    bubble: 0.92,
    tip: 0.94,
    layer2: 0.92
  },
  light: {
    canvas: null,
    modulePlatform: null,
    sidebar: null,
    layer1: null,
    layer3: null,
    bubble: null,
    tip: null,
    layer2: 0.94
  },
  glass: {
    canvas: null,
    modulePlatform: 0.78,
    sidebar: 0.55,
    layer1: 0.62,
    layer3: 0.74,
    bubble: 0.72,
    tip: 0.96,
    layer2: 0.94
  }
};

/** Surfaces a text level may be rendered on — SINGLE SOURCED (issue #76). */
const { TEXT_SURFACES, TEXT_TARGETS } = require("./lib/text-surfaces.cjs");

/**
 * Chroma of a neutral surface at lightness L. Chroma grows slightly with
 * lightness — the same reason a white wall lit by a blue sky is bluer than its
 * own shadowed corner. Without this, deep surfaces read as dead gray.
 */
const neutralChroma = (chroma, L) => chroma * (0.55 + 1.5 * L);

const rampFor = (spec) => RAMP[spec.glass ? "glass" : spec.scheme];
const alphaFor = (spec) => ALPHA[spec.glass ? "glass" : spec.scheme];
const surfaceColor = (spec, L) => C.oklchToRgb(L, neutralChroma(spec.chroma, L), spec.hue);

/** Opaque color of a named elevation step. */
const colorAt = (spec, name) => surfaceColor(spec, spec.l0 + rampFor(spec)[name]);

const num = (n) => String(Math.round(n * 1000) / 1000);

/**
 * Author one elevation step. Returns a CSS string and the composited color the
 * browser will actually paint (used by the audit to verify the ladder).
 */
function surfaceToken(spec, name) {
  const target = spec.l0 + rampFor(spec)[name];
  const alpha = alphaFor(spec)[name];
  const canvas = colorAt(spec, "canvas");
  if (alpha === null) {
    const rgb = surfaceColor(spec, target);
    return { css: C.hex(rgb), composed: rgb };
  }
  // Solve the authored color: composite(rgba(c, alpha), canvas) must land on
  // the ramp target in perceptual lightness. Compositing happens in sRGB but
  // is monotonic in L, so a bisection is exact enough (1e-4 OKL L).
  const chroma = neutralChroma(spec.chroma, Math.min(0.99, target + 0.02));
  let lo = spec.l0;
  let hi = 1.15;
  const at = (L) => {
    const c = C.oklchToRgb(Math.min(1.1, L), chroma, spec.hue);
    return C.rgbToOklch(C.composite({ ...c, a: alpha }, canvas)).L;
  };
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) < target) lo = mid;
    else hi = mid;
  }
  const solved = C.oklchToRgb(Math.min(1.1, hi), chroma, spec.hue);
  const composed = C.composite({ ...solved, a: alpha }, canvas);
  return {
    css: `rgba(${solved.r}, ${solved.g}, ${solved.b}, ${num(alpha)})`,
    composed
  };
}

/**
 * Solve a text level's lightness. Direction matters:
 *  - on DARK skins we want the *dimmest* value that still passes, because
 *    brighter-than-necessary text is glare;
 *  - on LIGHT skins we want the *lightest* value that still passes, because
 *    darker-than-necessary text turns the UI into a wall of ink.
 * The result is a floor/ceiling; the designed ladder then offsets from it so
 * the three levels stay visually distinct instead of collapsing onto it.
 */
/**
 * `surfaces` is a list of BACKGROUND COLORS (not names): the caller resolves
 * ladder rungs through colorAt() and host-painted tinted surfaces through their
 * own token colors, so the solver and the auditor can be handed the same set
 * without the solver needing to know where a surface comes from (issue #76).
 */
function solveTextLevel(spec, bgs, target) {
  const worst = (L) => {
    const fg = C.oklchToRgb(L, spec.chroma * 0.9, spec.hue);
    let min = Infinity;
    for (const bg of bgs) min = Math.min(min, C.contrastRatio(fg, bg));
    return min;
  };
  if (spec.scheme === "dark") {
    let lo = 0.35;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (worst(mid) >= target) hi = mid;
      else lo = mid;
    }
    return hi;
  }
  let lo = 0;
  let hi = 0.9;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (worst(mid) >= target) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Pick the accent lightness.
 *
 * The objective is VIVIDNESS, not brightness: maximise the chroma the accent
 * actually achieves in sRGB, then break ties toward a lightness anchor. (An
 * earlier version maximised lightness for dark skins and produced `#edecff` —
 * a near-white "indigo" that technically passes contrast and looks like
 * nothing. The most saturated passing colour is the one that reads as an
 * accent.)
 *
 * Constraints, both hard: the accent must clear 4.6:1 on the canvas (it is
 * used as link/icon text) and `brand-text` must clear 4.5:1 on it (filled
 * button labels). A white-on-pastel button is the most common accessibility
 * failure in shipped themes and it stays invisible until someone reads the
 * label.
 */
function solveAccent(spec, canvasRgb) {
  const anchor = spec.scheme === "dark" ? 0.72 : 0.55;
  const ink = spec.scheme === "dark"
    ? C.oklchToRgb(0.17, spec.chroma, spec.hue)
    : { r: 255, g: 255, b: 255 };
  let best = null;
  for (let L = 0.3; L <= 0.98; L += 0.002) {
    const c = C.oklchToRgb(L, spec.accentChroma, spec.accentHue);
    if (C.contrastRatio(c, canvasRgb) < 4.6) continue;
    if (C.contrastRatio(c, ink) < 4.5) continue;
    const achieved = C.rgbToOklch(c).C;
    const score = achieved - 0.5 * Math.abs(L - anchor);
    if (best === null || score > best.score) best = { L, score };
  }
  return best === null ? anchor : best.L;
}

/**
 * Semantic hues must be tellable apart from the brand — "is that green a
 * success badge or just my accent?" is a live question on `aurora`, whose
 * accent is cyan-green, and on `ember`, whose accent is amber. When a
 * canonical hue collides with the accent we rotate the SEMANTIC and never the
 * brand: the brand is the skin's identity, the state color is a signal. The
 * rotation picks whichever side of the accent lands nearer the canonical hue,
 * so success stays green and error stays red.
 */
/** Hue bands each signal is allowed to live in, or it stops reading as itself. */
const STATE_BANDS = {
  success: [[125, 175]],
  warn: [[55, 105]],
  error: [[340, 360], [0, 45]]
};
const inBand = (hue, bands) => bands.some(([lo, hi]) => (lo <= hi ? hue >= lo && hue <= hi : hue >= lo || hue <= hi));

function stateHue(canonical, accentHue, minSep, bands) {
  const d = (((canonical - accentHue) % 360) + 540) % 360 - 180;
  if (Math.abs(d) >= minSep) return canonical;
  const up = (accentHue + minSep + 360) % 360;
  const down = (accentHue - minSep + 360) % 360;
  // Prefer whichever side keeps the signal inside its own band — a "warning"
  // at hue 350 is a red, and an "error" at hue 95 is a lime, and both are
  // worse than the hue wobble. Band first, then nearest to canonical.
  const upIn = inBand(up, bands);
  const downIn = inBand(down, bands);
  if (upIn !== downIn) return upIn ? up : down;
  return C.hueDistance(up, canonical) <= C.hueDistance(down, canonical) ? up : down;
}

/**
 * Lightness for a semantic color: the boundary that clears 4.5:1 on the canvas
 * (minimum on dark skins, maximum on light skins), nudged toward `preferred`
 * so the three states keep their familiar "green / amber / red" weight.
 */
function solveState(spec, hue, chroma, preferred) {
  const canvas = colorAt(spec, "canvas");
  const passes = (L) => C.contrastRatio(C.oklchToRgb(L, chroma, hue), canvas) >= 4.5;
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  if (spec.scheme === "dark") {
    // Darkest passing value (= most saturated), then lifted toward the
    // familiar weight of the signal colour. Without the lift the solver
    // returns the contrast floor and every state turns into a dark muddy dot;
    // without the floor it drifts to near-white pastel (the first bug here).
    let boundary = 0.98;
    for (let L = 0.3; L <= 0.98; L += 0.002) if (passes(L)) { boundary = L; break; }
    return clamp(preferred, boundary + 0.02, 0.90);
  }
  let boundary = 0.3;
  for (let L = 0.98; L >= 0.3; L -= 0.002) if (passes(L)) { boundary = L; break; }
  return clamp(preferred, 0.40, boundary - 0.02);
}

/** One semantic color: hue rotated clear of the brand, lightness solved. */
function stateColor(spec, canonical, chroma, preferred) {
  const hue = stateHue(canonical, spec.accentHue, 50, STATE_BANDS[canonical === 150 ? "success" : canonical === 80 ? "warn" : "error"]);
  return C.hex(C.oklchToRgb(solveState(spec, hue, chroma, preferred), chroma, hue));
}

/** Build the per-skin diffused-light background (the "material" layer). */
function buildGlow(spec) {
  const s = spec.scheme;
  const lift = (d) => spec.l0 + d;
  const keyHue = spec.glowHue ?? spec.accentHue;
  const bounceHue = spec.bounceHue ?? (spec.accentHue + 150) % 360;
  const at = (L, c, h, a) => {
    const { r, g, b } = C.oklchToRgb(L, c, h);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };
  const layers = [];
  if (s === "dark") {
    // One key light (upper right), one cool bounce (lower left), a soft
    // ambient lift through the middle, and a vignette closing the frame.
    // Together they are what make a flat wash read as *depth* rather than as
    // a gradient someone dragged in.
    layers.push(`radial-gradient(1180px 720px at 76% -14%, ${at(0.66, spec.accentChroma * 0.92, keyHue, 0.32)}, transparent 64%)`);
    layers.push(`radial-gradient(900px 620px at 6% 108%, ${at(0.60, spec.accentChroma * 0.7, bounceHue, 0.20)}, transparent 60%)`);
    layers.push(`radial-gradient(1500px 950px at 50% 32%, ${at(lift(0.075), neutralChroma(spec.chroma, lift(0.075)), spec.hue, 0.55)}, transparent 74%)`);
    layers.push(`radial-gradient(1400px 1000px at 50% 54%, transparent 44%, ${at(Math.max(0.02, lift(-0.10)), neutralChroma(spec.chroma, lift(-0.10)), spec.hue, 0.42)} 100%)`);
    layers.push(
      `linear-gradient(163deg, ${C.hex(surfaceColor(spec, lift(0.020)))} 0%, ${C.hex(surfaceColor(spec, lift(-0.016)))} 55%, ${C.hex(surfaceColor(spec, lift(0.004)))} 100%)`
    );
  } else {
    layers.push(`radial-gradient(1120px 680px at 78% -12%, ${at(0.80, spec.accentChroma * 0.55, keyHue, 0.30)}, transparent 62%)`);
    layers.push(`radial-gradient(860px 580px at 8% 106%, ${at(0.82, spec.accentChroma * 0.4, bounceHue, 0.22)}, transparent 58%)`);
    layers.push(`radial-gradient(1400px 900px at 50% 30%, rgba(255, 255, 255, 0.62), transparent 74%)`);
    layers.push(`radial-gradient(1300px 950px at 50% 56%, transparent 46%, ${at(lift(-0.045), neutralChroma(spec.chroma, lift(-0.045)), spec.hue, 0.40)} 100%)`);
    layers.push(
      `linear-gradient(168deg, ${C.hex(surfaceColor(spec, lift(0.006)))} 0%, ${C.hex(surfaceColor(spec, lift(-0.010)))} 55%, ${C.hex(surfaceColor(spec, lift(0.002)))} 100%)`
    );
  }
  return layers.join(", ");
}

/**
 * Turn one design spec into a concrete theme: token map + per-skin defaults +
 * the matching diffused-light background.
 *
 * `defaults` are the numbers an author would hand-tune after installing the
 * skin — wash strength, glass weight, dialog opacity — so a user who just
 * picks a skin gets the *authored* look instead of a global average.
 */
function buildSkin(spec) {
  const s = spec.scheme;
  const isGlass = spec.glass === true;
  const S = (name) => surfaceToken(spec, name);
  const surface = {};
  for (const name of Object.keys(rampFor(spec))) surface[name] = S(name);

  const canvasRgb = surface.canvas.composed;
  const accentL = solveAccent(spec, canvasRgb);
  const accentRgb = C.oklchToRgb(accentL, spec.accentChroma, spec.accentHue);
  const accent = C.hex(accentRgb);
  const accentRgba = (a) => `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${num(a)})`;

  const whiteA = (a) => `rgba(255, 255, 255, ${num(a)})`;
  const ink = C.oklchToRgb(0.16, spec.chroma, spec.hue);
  const inkA = (a) => `rgba(${ink.r}, ${ink.g}, ${ink.b}, ${num(a)})`;
  const deep = C.oklchToRgb(Math.max(0.02, spec.l0 - 0.10), neutralChroma(spec.chroma, spec.l0), spec.hue);
  const scrimA = (a) => `rgba(${deep.r}, ${deep.g}, ${deep.b}, ${num(a)})`;

  /**
   * A brand tint is the brand colour at an alpha — and the alpha is not a
   * taste call, it is a constraint. Composite the tint on the canvas and the
   * warm canvas drags the hue: at 0.12 on ivory's cream the markdown tag came
   * out 34.6deg off the brand blue, i.e. a warm grey smudge wearing the
   * brand's job title. So the alpha is SOLVED: the smallest weight in the
   * band whose composite still reads as the brand, and never so heavy that
   * the tint becomes a block.
   */
  const tintRgba = (minA = 0.12, maxA = 0.34) => {
    const accentRgb = C.parseColor(accent);
    const brandH = C.rgbToOklch(accentRgb).H;
    const canvasRgb = C.parseColor(surface.canvas.css);
    let best = null;
    for (let a = minA; a <= maxA + 1e-9; a += 0.01) {
      const composited = C.composite({ ...accentRgb, a }, canvasRgb);
      const hueOff = C.hueDistance(C.rgbToOklch(composited).H, brandH);
      if (hueOff <= 20) { best = a; break; }
    }
    // No weight in the band could hold the hue (a very low-chroma accent on a
    // far-off canvas): take the heaviest one rather than ship a tint that
    // lies about which brand it is.
    return accentRgba(best == null ? maxA : best);
  };

  // ── host-painted tinted surfaces (issue #76) ──────────────────────────
  // These three are declared ONCE, here, and then used TWICE: as the values of
  // their tokens, and as constraints in the text solve below. Splitting the
  // two — which is what the audit and the solver did before — is how a skin
  // could be "solved against every surface" and still fail on the surface a
  // code block's line numbers sit on.
  const TINTED_SURFACE_CSS = {
    codeBlock: s === "dark" ? scrimA(0.42) : inkA(0.045),
    inlineCode: s === "dark" ? whiteA(0.085) : tintRgba(0.10, 0.30),
    selector: s === "dark" ? whiteA(0.09) : isGlass ? whiteA(0.72) : inkA(0.055)
  };
  const canvasForTint = C.parseColor(surface.canvas.css);
  /** The color the browser paints, which is what a contrast ratio is measured on. */
  const tintedSurfaceColors = Object.fromEntries(
    Object.entries(TINTED_SURFACE_CSS).map(([name, css]) => [
      name,
      C.composite(C.parseColor(css), canvasForTint)
    ])
  );

  // Ladder rungs resolve through the elevation ramp; tinted surfaces come from
  // the composited token above. Same name list both sides (lib/text-surfaces).
  const surfaceColors = (names) =>
    names.map((name) => (name in tintedSurfaceColors ? tintedSurfaceColors[name] : colorAt(spec, name)));

  const pFloor = solveTextLevel(spec, surfaceColors(TEXT_SURFACES.primary), TEXT_TARGETS.primary);
  const sFloor = solveTextLevel(spec, surfaceColors(TEXT_SURFACES.secondary), TEXT_TARGETS.secondary);
  const tFloor = solveTextLevel(spec, surfaceColors(TEXT_SURFACES.tertiary), TEXT_TARGETS.tertiary);
  let primaryL;
  let secondaryL;
  let tertiaryL;
  if (s === "dark") {
    primaryL = Math.max(pFloor, 0.955);
    secondaryL = Math.max(sFloor, primaryL - 0.145);
    tertiaryL = Math.max(tFloor, secondaryL - 0.092);
  } else {
    primaryL = Math.min(pFloor, 0.27);
    secondaryL = Math.min(sFloor, primaryL + 0.17);
    tertiaryL = Math.min(tFloor, secondaryL + 0.10);
  }
  const label = (L) => C.hex(C.oklchToRgb(L, spec.chroma * 0.9, spec.hue));

  const brandText = (() => {
    if (s === "dark") return C.hex(C.oklchToRgb(0.17, spec.chroma, spec.hue));
    const white = { r: 255, g: 255, b: 255 };
    return C.contrastRatio(white, accentRgb) >= 4.5
      ? "#ffffff"
      : C.hex(C.oklchToRgb(0.18, spec.chroma * 0.4, spec.accentHue));
  })();

  // The composer: a glass input on dark skins (white wash over the deep
  // canvas), a pane on the frosted skin, plain paper on the flat ones.
  const inputMajor = s === "dark" ? whiteA(0.075) : isGlass ? whiteA(0.72) : surface.layer1.css;

  // ── the covered host surfaces (issue #88) ───────────────────────────────
  //
  // The forward half of the census: 32 host colour tokens are read by the
  // shipping UI and we defined none of them, so a skinned page still painted
  // menu bodies, card outlines, tool-bar chips, file-diff rows and keyboard
  // focus in the host's neutral grey. They are declared here, ONCE, and reused
  // by both the skin and the audit (`scripts/skin-audit.cjs` sources the same
  // names from `lib/text-surfaces.cjs`), because the #76 lesson is that two
  // hand-kept lists drift.
  //
  // The three semantic state colours are hoisted out of the token literal
  // below so the danger hover and the diff rows can tint with the SAME hue the
  // state check grades — a second `stateColor` call with a different lightness
  // would silently be a different colour with the same name.
  const stateSuccess = stateColor(spec, 150, 0.15, s === "dark" ? 0.80 : 0.56);
  const stateWarn = stateColor(spec, 80, 0.14, s === "dark" ? 0.84 : 0.62);
  const stateError = stateColor(spec, 27, 0.17, s === "dark" ? 0.68 : 0.52);
  const rgbaOf = (css, a) => {
    const c = C.parseColor(css);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${num(a)})`;
  };
  /**
   * A ramp step's colour at an alpha of our choosing. `surfaceToken` publishes
   * each rung at the alpha the CASCADE wants; the host surfaces below want the
   * same colour at a different opacity (a menu is more see-through than a
   * dialog), so the colour is taken from the ramp and the alpha is the call.
   */
  const fillAt = (name, alpha) => {
    const L = spec.l0 + rampFor(spec)[name];
    const c = C.oklchToRgb(L, neutralChroma(spec.chroma, Math.min(0.99, L + 0.02)), spec.hue);
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${num(alpha)})`;
  };
  /**
   * The opacity the host itself gives a stuck menu group header (`#f8f9faf0`,
   * i.e. 94%): high enough that scrolled content cannot read through it. It is
   * a FUNCTIONAL floor, not a taste call, so it is named rather than inlined.
   */
  const MENU_HEADER_OPACITY = 0.94;
  /** Menu body: the host ships 58% (light) / 45% (dark). */
  const MENU_FILL_OPACITY = s === "dark" ? 0.46 : 0.58;
  /**
   * A semantic tint whose alpha is SOLVED, exactly like `tintRgba` above — and
   * for the same measured reason. A diff row's job is to read as "added" or
   * "deleted", and the composite is what the eye sees: on `mist` (a cool,
   * near-white canvas) a 10% red lands 70deg away from the error hue, i.e. a
   * mauve stripe that says nothing. Raising the alpha until the composite sits
   * within `maxOff` degrees of the signal restores the meaning, and the solve
   * keeps the light skins' rows as light as that constraint allows.
   */
  const stateTint = (stateCss, minA, maxA, maxOff = 30) => {
    const rgb = C.parseColor(stateCss);
    const stateH = C.rgbToOklch(rgb).H;
    const canvas = C.parseColor(surface.canvas.css);
    for (let a = minA; a <= maxA + 1e-9; a += 0.01) {
      if (C.hueDistance(C.rgbToOklch(C.composite({ ...rgb, a }, canvas)).H, stateH) <= maxOff) return a;
    }
    return maxA;
  };
  // The gutter's floor is DERIVED from the row it belongs to, not chosen
  // beside it: solving both in parallel let `mist` land with a heavier row
  // (0.30) than its own gutter (0.145), so the "gutter strip" was the fainter
  // of the two — an inversion the audit caught (`deleted gutter is not
  // stronger than its row`). The strip is a stronger weight of the row by
  // definition, so it starts above it.
  const diffAlpha = (stateCss) => {
    const bg = stateTint(stateCss, 0.115, 0.26);
    return { bg, gutter: stateTint(stateCss, Math.min(0.34, bg + 0.05), 0.40) };
  };
  const ADDED_TINT = diffAlpha(stateSuccess);
  const DELETED_TINT = diffAlpha(stateError);

  const tokens = {
    // ── surfaces ────────────────────────────────────────────────────────
    "--dsw-alias-bg-base": surface.canvas.css,
    "--dsw-alias-bg-layer-1": surface.layer1.css,
    "--dsw-alias-bg-layer-2": surface.layer2.css,
    "--dsw-alias-bg-layer-3": surface.layer3.css,
    "--dsw-alias-bg-module-platform": surface.modulePlatform.css,
    "--dsw-alias-bg-overlay": s === "dark" ? surface.layer2.css : whiteA(0.92),
    // The host's skeleton loader plate. A loading row must read as "a plate
    // being filled", never as a filled panel — and on the dark skins the
    // host's own 7.8% white lands *stronger* than the layer-1 rung, so a
    // loading list would read as a stack of cards. The audit's ceiling is
    // relative for that reason (`<=` the layer-1 step), and these alphas sit
    // under it with room to spare.
    "--dsw-alias-bg-skeleton": s === "dark" ? whiteA(0.030) : inkA(0.040),
    // A menu floats above the page, so its body is the layer-2 colour at a
    // menu's opacity. `--dsw-specific-menu` is NOT set from here — the plugin
    // recomputes it every publish from the skin's canvas and the popup slider
    // (see POPUP_TOKENS in lib/client.js), which is why the census classifies
    // it `computed` rather than `core`.
    "--dsw-menu-surface-fill": fillAt("layer2", MENU_FILL_OPACITY),
    "--dsw-alias-menu-group-header-fill": fillAt("layer2", MENU_HEADER_OPACITY),
    // ── text ────────────────────────────────────────────────────────────
    "--dsw-alias-label-primary": label(primaryL),
    "--dsw-alias-label-secondary": label(secondaryL),
    "--dsw-alias-label-tertiary": label(tertiaryL),
    // ── brand ───────────────────────────────────────────────────────────
    "--dsw-alias-brand-primary": accent,
    "--dsw-alias-brand-primary-soft": tintRgba(),
    "--dsw-alias-brand-text": brandText,
    "--dsw-alias-button-primary-fill": accent,
    // Hover goes TOWARD emphasis: lighter on dark skins (the button lights
    // up), deeper on light skins (the button gains weight). Doing it the same
    // way in both schemes is why so many light themes have a hover state that
    // looks like the button faded out.
    "--dsw-alias-button-primary-hover": C.hex(
      C.oklchToRgb(
        s === "dark" ? Math.min(0.98, accentL + 0.070) : Math.max(0.2, accentL - 0.055),
        spec.accentChroma * 0.95,
        spec.accentHue
      )
    ),
    "--dsw-alias-button-primary-dimmed": accentRgba(0.16),
    "--dsw-alias-button-elevated-fill": s === "dark" ? surface.layer1.css : surface.layer3.css,
    // ── edges ───────────────────────────────────────────────────────────
    // Hairlines do the separating. ~9% is where a border reads as an edge on a
    // dark panel without turning into a drawn line.
    //
    // The host paints FOUR levels plus a "thin" variant of level 2, and we
    // shipped two — so every menu body, card outline and tool-bar divider that
    // asked for l3/l4 fell back to the host's neutral black/white alpha, i.e.
    // a grey hairline through a colour-tinted skin (issue #88). Levels 3 and 4
    // continue OUR ladder: same hue, monotonically stronger, so the whole edge
    // family reads as one material instead of "ours + the host's".
    "--dsw-alias-border-l1": s === "dark" ? whiteA(0.062) : inkA(0.10),
    "--dsw-alias-border-l2": s === "dark" ? whiteA(0.098) : inkA(0.14),
    "--dsw-alias-border-l3": s === "dark" ? whiteA(0.142) : inkA(0.185),
    "--dsw-alias-border-l4": s === "dark" ? whiteA(0.196) : inkA(0.235),
    // The host's third weight: "level 2, thinner". It sits BETWEEN l1 and l2
    // by construction — it is the same level at a lighter weight, not a fifth
    // rung, and a value above l2 would make the thin variant heavier than the
    // border it is a thin version of.
    "--dsw-alias-border-l2-darkmode-thin": s === "dark" ? whiteA(0.078) : inkA(0.118),
    // ── interaction ─────────────────────────────────────────────────────
    "--dsw-alias-interactive-bg-hover": accentRgba(s === "dark" ? 0.15 : 0.10),
    "--dsw-alias-interactive-bg-active": accentRgba(s === "dark" ? 0.24 : 0.17),
    // Destructive hover. The host's default is a fixed red at ~5% / ~15%
    // alpha; ours is the skin's OWN error colour, so a "delete" hover belongs
    // to the same red the error signal uses instead of a foreign one.
    "--dsw-alias-interactive-bg-hover-danger": rgbaOf(stateError, s === "dark" ? 0.20 : 0.13),
    // ── keyboard focus ──────────────────────────────────────────────────
    // The host's default is literally `transparent`: with no skin value,
    // keyboard focus has NO visible ring anywhere in the product. This is the
    // one gap in the set that is an accessibility defect rather than a
    // cosmetic one, so it is the brand accent at full strength (>= 3:1 on the
    // canvas, asserted by the audit's `focus-ring` check).
    "--dsw-focus-ring-color": accent,
    // ── tool bar ────────────────────────────────────────────────────────
    // Icon-only buttons in a tool bar: a translucent chip of our ink, with a
    // hover that gains weight rather than changing hue.
    "--dsw-alias-button-tool-bar-fill": s === "dark" ? whiteA(0.075) : inkA(0.072),
    "--dsw-alias-button-tool-bar-hover": s === "dark" ? whiteA(0.125) : inkA(0.125),
    // The drop overlay while a file is dragged over a target. It has to HIDE
    // what it covers, so it is a heavy scrim of the deep end of our ramp.
    "--dsw-alias-bg-mask-drop": scrimA(s === "dark" ? 0.72 : 0.60),
    // ── file diffs ──────────────────────────────────────────────────────
    // A diff row is a semantics carrier: added rows must read as the success
    // hue and deleted rows as the error hue, at a tint light enough to keep
    // the code legible on it and heavy enough that the row is a row. The
    // alphas are SOLVED (`stateTint`) against the skin's own canvas.
    "--dsw-alias-file-diff-added-bg": rgbaOf(stateSuccess, ADDED_TINT.bg),
    "--dsw-alias-file-diff-added-gutter": rgbaOf(stateSuccess, ADDED_TINT.gutter),
    "--dsw-alias-file-diff-added-marker": stateSuccess,
    "--dsw-alias-file-diff-deleted-bg": rgbaOf(stateError, DELETED_TINT.bg),
    "--dsw-alias-file-diff-deleted-gutter": rgbaOf(stateError, DELETED_TINT.gutter),
    "--dsw-alias-file-diff-deleted-marker": stateError,
    // ── state ───────────────────────────────────────────────────────────
    "--dsw-alias-state-business-primary": accent,
    "--dsw-alias-state-business-tertiary": tintRgba(),
    // Canonical hues are placed where the sRGB gamut actually puts those
    // signals in OKLCH: ~150 is leaf green, ~80 is amber, ~27 is true red
    // (verified against #cf222e). The lightness weight is what keeps a dark
    // skin's error from drifting into bubblegum pink — at L 0.74 a red IS a
    // pink, so the dark weight sits lower and lets the hue read.
    "--dsw-alias-state-success-primary": stateSuccess,
    "--dsw-alias-state-warn-primary": stateWarn,
    "--dsw-alias-state-error-primary": stateError,
    // ── code ────────────────────────────────────────────────────────────
    "--dsw-alias-markdown-code-block": TINTED_SURFACE_CSS.codeBlock,
    "--dsw-alias-markdown-inline-code": TINTED_SURFACE_CSS.inlineCode,
    "--dsw-alias-markdown-tag": tintRgba(s === "dark" ? 0.18 : 0.12),
    // ── scrollbar ───────────────────────────────────────────────────────
    "--dsw-alias-scrollbar-bg-l1": s === "dark" ? whiteA(0.09) : inkA(0.20),
    "--dsw-alias-scrollbar-bg-l2": s === "dark" ? whiteA(0.14) : inkA(0.28),
    "--dsw-alias-scrollbar-hover-l1": s === "dark" ? whiteA(0.20) : inkA(0.36),
    "--dsw-alias-scrollbar-hover-l2": s === "dark" ? whiteA(0.20) : inkA(0.36),
    // ── host-specific surfaces ──────────────────────────────────────────
    "--dsw-specific-sidebar-fill": surface.sidebar.css,
    "--dsw-specific-sidebar-nav-item-active": s === "dark" ? whiteA(0.085) : isGlass ? whiteA(0.72) : inkA(0.075),
    "--dsw-specific-sidebar-nav-item-hover": s === "dark" ? whiteA(0.05) : isGlass ? whiteA(0.40) : inkA(0.045),
    "--dsw-specific-input-major": inputMajor,
    "--dsw-specific-tip": surface.tip.css,
    "--dsw-specific-selector": TINTED_SURFACE_CSS.selector,
    "--dsw-specific-bubble": surface.bubble.css,
    "--dsw-specific-bubble-highlight": accentRgba(s === "dark" ? 0.16 : 0.10)
  };

  return {
    id: spec.id,
    colorScheme: s,
    tokens,
    glow: buildGlow(spec),
    defaults: spec.defaults,
    accent
  };
}

// ── the eight atmospheres ──────────────────────────────────────────────────
// Each skin is ONE hue axis + ONE accent. `hue` is the neutral axis — the
// "air" of the interface, the tint carried by every gray in it — not a
// background color. That is what makes a skin feel like a place instead of a
// palette swap.
const SPECS = [
  {
    id: "abyss",
    scheme: "dark",
    hue: 264, // deep water: blue-violet
    chroma: 0.0105,
    l0: 0.185,
    accentHue: 288, // indigo — the single saturated note
    accentChroma: 0.148,
    bounceHue: 232, // deep-water bounce, not a warm one
    defaults: { wallpaperOpacity: 0.22, wallpaperBlur: 4, sidebarOpacity: 0.28, composerOpacity: 0.50, modalOpacity: 0.92, material: "frosted", autodim: true }
  },
  {
    id: "aurora",
    scheme: "dark",
    hue: 205, // cold air: teal-blue
    chroma: 0.0098,
    l0: 0.188,
    // 202 keeps the aurora cyan clear of the success-green hue (150): at 186
    // the two sat 36deg apart and the success badge read as "more accent".
    accentHue: 202,
    accentChroma: 0.125,
    bounceHue: 250,
    defaults: { wallpaperOpacity: 0.24, wallpaperBlur: 5, sidebarOpacity: 0.30, composerOpacity: 0.48, modalOpacity: 0.92, material: "frosted", autodim: true }
  },
  {
    id: "nebula",
    scheme: "dark",
    hue: 302, // nebula dust: violet
    chroma: 0.0115,
    l0: 0.183,
    accentHue: 300,
    accentChroma: 0.150,
    bounceHue: 262,
    defaults: { wallpaperOpacity: 0.26, wallpaperBlur: 6, sidebarOpacity: 0.30, composerOpacity: 0.46, modalOpacity: 0.92, material: "frosted", autodim: true }
  },
  {
    id: "ember",
    scheme: "dark",
    hue: 62, // the only warm dark: amber-brown
    chroma: 0.0108,
    l0: 0.182,
    // Burnt amber. Placed at 45 so the error signal can rotate DOWN to a
    // crimson instead of up into lime — on an orange skin both neighbours of
    // the accent are occupied by warn and error.
    accentHue: 45,
    accentChroma: 0.140,
    bounceHue: 20,
    defaults: { wallpaperOpacity: 0.22, wallpaperBlur: 4, sidebarOpacity: 0.28, composerOpacity: 0.50, modalOpacity: 0.92, material: "frosted", autodim: true }
  },
  {
    id: "midnight",
    scheme: "dark",
    hue: 270,
    chroma: 0.0022, // achromatic on purpose — OLED purity IS the concept
    l0: 0.150,
    accentHue: 272,
    accentChroma: 0.130,
    bounceHue: 250,
    defaults: { wallpaperOpacity: 0.14, wallpaperBlur: 2, sidebarOpacity: 0.22, composerOpacity: 0.58, modalOpacity: 0.94, material: "frosted", autodim: true }
  },
  {
    id: "ivory",
    scheme: "light",
    hue: 88, // paper: warm cream
    chroma: 0.0062,
    // The ladder above must fit between here and pure white; 0.955 leaves
    // room for eight steps without the top one clipping to #ffffff.
    l0: 0.955,
    accentHue: 254, // iOS blue — cool against warm paper
    accentChroma: 0.152,
    bounceHue: 40,
    defaults: { wallpaperOpacity: 0.12, wallpaperBlur: 2, sidebarOpacity: 0.18, composerOpacity: 0.62, modalOpacity: 0.96, material: "frosted", autodim: true }
  },
  {
    id: "mist",
    scheme: "light",
    hue: 240, // morning glass: cool blue-white
    chroma: 0.0075,
    l0: 0.940, // deeper than the paper skins: the panes need somewhere to float
    accentHue: 248,
    accentChroma: 0.150,
    bounceHue: 196,
    glass: true, // the one skin whose surfaces are genuinely translucent
    defaults: { wallpaperOpacity: 0.30, wallpaperBlur: 8, sidebarOpacity: 0.34, composerOpacity: 0.36, modalOpacity: 0.90, material: "liquid", autodim: true }
  },
  {
    id: "rose",
    scheme: "light",
    hue: 12, // blush paper
    chroma: 0.0070,
    l0: 0.952,
    // 336, not 356: a true pink accent sits 29deg from the error hue and
    // forces the error signal to rotate into rust. Moving the accent toward
    // magenta buys the red back, and magenta-on-blush is a stronger pairing
    // anyway.
    accentHue: 336,
    accentChroma: 0.158,
    bounceHue: 320,
    defaults: { wallpaperOpacity: 0.14, wallpaperBlur: 2, sidebarOpacity: 0.20, composerOpacity: 0.60, modalOpacity: 0.96, material: "frosted", autodim: true }
  }
];

/**
 * Build every preset, refusing to emit one that breaks the defaults domain.
 *
 * The check lives here rather than only in the tests on purpose: issue #73 was
 * reproducible by editing this file and regenerating, so the generator itself
 * has to be the thing that says no.
 */
const buildAll = () =>
  SPECS.map((spec) => {
    const skin = buildSkin(spec);
    const problems = validateDefaults(skin.defaults, skin.id);
    if (problems.length) {
      throw new Error(`skin "${skin.id}" ships defaults outside their domain:\n  ${problems.join("\n  ")}`);
    }
    return skin;
  });

module.exports = {
  SPECS,
  buildAll,
  buildSkin,
  RAMP,
  ALPHA,
  TEXT_SURFACES,
  TEXT_TARGETS,
  neutralChroma,
  surfaceToken,
  colorAt
};
