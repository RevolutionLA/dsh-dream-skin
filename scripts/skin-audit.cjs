#!/usr/bin/env node
// dsh-dream-skin — skin quality audit.
//
// The presets are supposed to hold an award-grade bar, so "looks nice" is not
// an acceptable acceptance criterion. This tool measures every skin against a
// fixed rubric (perceptual lightness ladder, hue purity, solved contrast on
// every surface a token can land on, state separation, skin distinctiveness)
// and exits non-zero when anything regresses.
//
// Usage:
//   node scripts/skin-audit.cjs            # audit what lib/client.js ships
//   node scripts/skin-audit.cjs --system   # audit the design-system output
//   node scripts/skin-audit.cjs --json     # machine-readable report

const fs = require("fs");
const path = require("path");
const C = require("./lib/color.cjs");

/**
 * THE TEXT SURFACES — imported, not restated (issue #76).
 *
 * This file used to keep its own list, the solver kept a different one, and
 * neither was derived from what the host paints. Both now read
 * `scripts/lib/text-surfaces.cjs`; `text-surface-coverage` below asserts the
 * two agree, so a surface can never be solved-for-but-unmeasured again.
 */
const { SURFACE_TOKENS, TEXT_SURFACES, TEXT_FLOORS, TINTED_SURFACES } = require("./lib/text-surfaces.cjs");

const ROOT = path.join(__dirname, "..");
const CLIENT = path.join(ROOT, "lib", "client.js");

// ── rubric thresholds ──────────────────────────────────────────────────────
// Every number here is a decision, and each one is written down with why.
const T = {
  /** Max OKLCH chroma of a "neutral" surface. Above this a gray reads tinted. */
  maxNeutralChroma: { dark: 0.030, light: 0.026 },
  /** Max hue spread among neutral surfaces (degrees). One axis, not eight. */
  maxNeutralHueSpread: 32,
  /** Min perceptible step between adjacent elevation levels (OKL L). */
  minElevationStep: 0.0055,
  /** Max step — a jump bigger than this reads as a different material. */
  maxElevationStep: 0.14,
  /** Text contrast floors (WCAG 2.1) on every surface the level can land on. */
  text: TEXT_FLOORS,
  /**
   * APCA floors. WCAG 2 systematically under-rewards dark pairs (it treats
   * #333 on #000 as excellent), so both models must pass. The floors follow
   * the APCA usage bands: 85+ = comfortable body copy, 60+ = content text,
   * 45+ = incidental/secondary content.
   */
  apca: { primary: 85, secondary: 60, tertiary: 45 },
  /** Accent: legible as text/icon on the canvas and inside a card. */
  accentOnCanvas: 4.5,
  accentOnCard: 3.0,
  /** Label printed on a filled brand button. */
  brandTextOnAccent: 4.5,
  /**
   * A hairline must be clearly visible (>= ~2x the OKLab JND) without
   * becoming a drawn line. 0.020..0.110 is the band where a 1px edge reads as
   * "this panel is lifted" rather than "someone drew a rectangle".
   */
  borderMinDeltaE: 0.020,
  borderMaxDeltaE: 0.110,
  /** Semantic state colors must be tellable apart from the brand hue. */
  stateHueSeparation: 45,
  stateOnCanvas: 4.5,
  /** Canvas must not be dead gray, nor pure black / pure white. */
  minCanvasChroma: 0.0012,
  canvasL: { dark: [0.14, 0.24], light: [0.925, 0.978] },
  /** Two presets must not be the same skin in a different name. */
  minAccentHueSeparation: 18,
  /**
   * Brand tints (badge / tag / soft fill). Measured on every skin: a tint
   * lands at 0.052..0.124 deltaE over its base. Below ~0.035 it stops reading
   * as a tint at all; above ~0.16 it stops being a tint and becomes a block.
   */
  tintDeltaE: [0.035, 0.16],
  /** A brand tint must be the brand, not a colour that merely looks busy. */
  tintMaxHueDistance: 25,
  /** The elevated-button surface: lifted off the canvas, still a button. */
  elevatedDeltaE: [0.012, 0.09],
  /** Scrollbars: a thumb you can find, not a stripe you cannot unsee. */
  scrollbarDeltaE: [0.05, 0.22],
  scrollbarHoverMaxDeltaE: 0.32,
  /**
   * Edges (issue #88). The host paints FOUR levels plus a "thin" level 2, and
   * until #88 we shipped two of them. Levels 3 and 4 are heavier separators
   * than a hairline — a card outline that has to hold at 1px against a tinted
   * panel — so they get a wider ceiling than `borderMaxDeltaE`. The FLOOR is
   * shared: an edge below the JND is not an edge at any level.
   */
  borderStrongMaxDeltaE: 0.26,
  /** WCAG 1.4.11 non-text contrast: a focus indicator must clear 3:1. */
  focusRingOnCanvas: 3.0,
  /**
   * The menu body has to read as floating above the page. The host ships
   * 58%/45% alpha at layer-2's colour, which lands ~0.02-0.03 deltaE over the
   * canvas; below ~0.012 the popover is a rectangle of nothing.
   */
  menuMinDeltaE: 0.012,
  /**
   * A STUCK group header covers scrolled rows. The host chose 94% for that
   * reason (see `--dsw-alias-menu-group-header-fill` = `#f8f9faf0`): at 88% a
   * dark row behind a light header already reads through. This is a
   * functional floor, not a taste call.
   */
  menuHeaderMinAlpha: 0.88,
  /** Tool-bar chips: findable, and the hover must gain weight. */
  toolBarDeltaE: [0.020, 0.16],
  /**
   * Skeleton plates: visible enough to read as "loading", quiet enough not to
   * read as a filled panel. The ceiling is MEASURED, not invented: the host's
   * own placeholder (`--dsw-alias-bg-skeleton: #ffffff14` on its `#151517`
   * canvas) composites to dE 0.0783, while the host's own lightest panel rung
   * composites to 0.0600. The platform therefore puts its skeleton ABOVE a
   * panel on purpose, and a "must be fainter than layer-1" rule would have
   * been one the platform itself breaks. We grade against the platform's own
   * number.
   */
  skeletonDeltaE: [0.008, 0.080],
  /** The drag-drop scrim must actually hide what it covers. */
  maskDropMinAlpha: 0.55,
  /** A diff row must be a row; and its marker must be readable on it. */
  fileDiffRowDeltaE: 0.012,
  fileDiffMarkerContrast: 3.0,
  /**
   * A diff tint is thin by design, so compositing it over a warm canvas drags
   * its hue. 60deg is the band in which the strip still reads as "green" /
   * "red" rather than as "a slightly dirty stripe".
   */
  fileDiffMaxHueDistance: 60,
  /** The row wash must be the same hue as its own gutter. */
  fileDiffWashMaxHueDistance: 40,
  /** Added and deleted must be tellable apart at a glance. */
  fileDiffPairSeparation: 60
};

const SURFACES = ["canvas", "modulePlatform", "sidebar", "layer1", "bubble", "layer3", "tip", "layer2"];
const LADDER = {
  dark: ["sidebar", "canvas", "modulePlatform", "layer1", "bubble", "layer3", "tip", "layer2"],
  light: ["modulePlatform", "sidebar", "canvas", "layer1", "bubble", "layer3", "tip", "layer2"],
  glass: ["canvas", "modulePlatform", "sidebar", "layer1", "bubble", "layer3", "tip", "layer2"]
};
const LADDER_SKINS = { mist: "glass" };

const TEXT_LEVELS = {
  "--dsw-alias-label-primary": "primary",
  "--dsw-alias-label-secondary": "secondary",
  "--dsw-alias-label-tertiary": "tertiary"
};

/**
 * Every token a skin must define for the audit to mean anything. A skin that
 * omits one is not "simpler", it is silently inheriting the host's built-in
 * palette for that role — which is how a preset ends up looking 80% designed.
 */
const REQUIRED_TOKENS = [
  "--dsw-alias-bg-base",
  "--dsw-alias-bg-layer-1",
  "--dsw-alias-bg-layer-2",
  "--dsw-alias-bg-layer-3",
  "--dsw-alias-bg-module-platform",
  "--dsw-alias-bg-overlay",
  "--dsw-alias-label-primary",
  "--dsw-alias-label-secondary",
  "--dsw-alias-label-tertiary",
  "--dsw-alias-brand-primary",
  "--dsw-alias-brand-text",
  "--dsw-alias-button-primary-fill",
  "--dsw-alias-button-primary-hover",
  "--dsw-alias-button-primary-dimmed",
  "--dsw-alias-border-l1",
  "--dsw-alias-border-l2",
  "--dsw-alias-interactive-bg-hover",
  "--dsw-alias-interactive-bg-active",
  "--dsw-alias-state-business-primary",
  "--dsw-alias-state-success-primary",
  "--dsw-alias-state-warn-primary",
  "--dsw-alias-state-error-primary",
  "--dsw-alias-markdown-code-block",
  "--dsw-alias-markdown-inline-code",
  "--dsw-alias-scrollbar-bg-l1",
  "--dsw-alias-scrollbar-hover-l1",
  "--dsw-specific-sidebar-fill",
  "--dsw-specific-sidebar-nav-item-active",
  "--dsw-specific-sidebar-nav-item-hover",
  "--dsw-specific-input-major",
  "--dsw-specific-tip",
  "--dsw-specific-selector",
  "--dsw-specific-bubble",
  "--dsw-specific-bubble-highlight",
  // Round-2 of the audit: these six shipped on every skin and were measured by
  // nobody. A token nobody grades is a module nobody graded.
  "--dsw-alias-brand-primary-soft",
  "--dsw-alias-state-business-tertiary",
  "--dsw-alias-markdown-tag",
  "--dsw-alias-button-elevated-fill",
  "--dsw-alias-scrollbar-bg-l2",
  "--dsw-alias-scrollbar-hover-l2",
  // Round-3 (issue #88): the host reads these and we shipped none of them, so
  // a skinned page still painted menu bodies, card outlines, tool-bar chips,
  // file-diff rows and the keyboard focus ring in the host's neutral grey.
  // `--dsw-alias-menu-group-header-fill` is the same defect found the other
  // way round (#89): a token the host ADDED in rc.2 that we had no value for.
  "--dsw-alias-border-l3",
  "--dsw-alias-border-l4",
  "--dsw-alias-border-l2-darkmode-thin",
  "--dsw-focus-ring-color",
  "--dsw-alias-interactive-bg-hover-danger",
  "--dsw-alias-bg-skeleton",
  "--dsw-menu-surface-fill",
  "--dsw-alias-menu-group-header-fill",
  "--dsw-alias-button-tool-bar-fill",
  "--dsw-alias-button-tool-bar-hover",
  "--dsw-alias-bg-mask-drop",
  "--dsw-alias-file-diff-added-bg",
  "--dsw-alias-file-diff-added-gutter",
  "--dsw-alias-file-diff-added-marker",
  "--dsw-alias-file-diff-deleted-bg",
  "--dsw-alias-file-diff-deleted-gutter",
  "--dsw-alias-file-diff-deleted-marker"
];

// ── consumer evidence (issue #81) ──────────────────────────────────────────
//
// A token a skin ships is a PROMISE: "something reads this and paints with it".
// When nothing reads it the promise is empty — and worse, every check that
// grades the token makes this audit look stricter than it is. The review's
// example was `--dsw-alias-brand-primary-soft`, which it counted as a dead
// token because the HOST has 0 consumers. It does not follow: reading the
// bundle, the plugin itself consumes that token twice (the settings row's
// badge background and a focus ring), so it is a real painted surface and
// belongs in the `tints` scoring surface.
//
// What the same method DOES find is four host slots that nobody consumes —
// not on the host side and not on ours. They are recorded below rather than
// deleted: the host declares them, so any consumer we cannot see (a desktop
// shell, a third-party plugin, a later host build) gets the skin's value
// instead of the host neutral. What must not happen is counting them among
// VERIFIED surfaces, and the check's report line says so out loud.
//
// `scripts/data/host-token-census.json` is the frozen host measurement
// (regenerate with `node scripts/host-consumers.cjs`); the plugin side is read
// live out of lib/client.js, so this gate never needs the host installed.
const CENSUS = require('./data/host-token-census.json');

/** Host slots the host declares but nobody consumes. Reason is mandatory. */
const UNCONSUMED_HOST_SLOTS = {
  '--dsw-alias-brand-text':
    'host declares it in both schemes and reads it nowhere (0 consumers / 1 file); kept so a consumer outside this census still gets the skin value',
  '--dsw-alias-button-primary-dimmed':
    'same measurement; graded by the `accent` check as the dimmed button fill',
  '--dsw-specific-tip':
    'the host paints tooltips from --dsw-alias-tooltip-bg instead; kept because it is a host-declared rung of the elevation ladder',
  '--dsw-specific-bubble-highlight':
    'host declares, nothing reads; shipped for palette completeness'
};

/**
 * Host slots we ship for a host NEWER than the frozen census (issue #88).
 *
 * The census is taken against the installed host, which is 0.2.0-rc.1 here.
 * `--dsw-alias-menu-group-header-fill` does not exist on rc.1 at all — it
 * arrives in 0.2.0-rc.2 (`#f8f9faf0` / `#303136f0`, measured by unpacking the
 * three published tarballs, see issue #89) — so the consumer check cannot
 * find a reader for it in the census and would call it dead. It is not dead;
 * it is EARLY.
 *
 * The `since` version is mandatory and the gate asserts two things about it:
 * the token really is absent from the frozen census (so this entry cannot be
 * used to smuggle a genuinely dead token past the check), and it really is
 * declared by that host version in the shipped token set. When the host is
 * upgraded and the census re-frozen, the entry becomes stale and the gate
 * says so instead of silently keeping a redundant excuse.
 */
const FORWARD_HOST_SLOTS = {
  '--dsw-alias-menu-group-header-fill': {
    since: '0.2.0-rc.2',
    reason:
      'the stuck menu group header. rc.2+ paints it with a hardcoded neutral (#f8f9faf0 / #303136f0) so it never follows a skin; shipped ahead of the upgrade so the upgrade cannot make it host-grey even for one session'
  }
};

let PLUGIN_SOURCE = null;
/** Count `var(--token …)` reads inside the shipped bundle (cached). */
function pluginConsumerCount(token, source = null) {
  const src = source != null ? source : (PLUGIN_SOURCE ??= fs.readFileSync(CLIENT, 'utf8'));
  const hits = src.match(new RegExp(`var\\(\\s*${token}(?![\\w-])`, 'g'));
  return hits ? hits.length : 0;
}

// ── extraction ─────────────────────────────────────────────────────────────
/** Pull the `const SKINS = [ ... ]` literal out of the bundle and evaluate it. */
function extractSkins(source) {
  const marker = "const SKINS = [";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("SKINS array not found in lib/client.js");
  const open = start + marker.length - 1;
  let depth = 0;
  let i = open;
  let inStr = null;
  while (i < source.length) {
    const ch = source[i];
    if (inStr) {
      if (ch === "\\") i += 2;
      else if (ch === inStr) inStr = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; i += 1; continue; }
    if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
    i += 1;
  }
  const literal = source.slice(open, i + 1);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${literal}`)();
}

// ── helpers ────────────────────────────────────────────────────────────────
const rgbOf = (css) => C.parseColor(css);
const flat = (css, canvasRgb) => C.composite(rgbOf(css), canvasRgb);
const ok = (rgb) => C.rgbToOklch(rgb);
const r2 = (n) => Math.round(n * 1000) / 1000;
/** deltaE lives in the thousandths — 3 decimals to keep the report readable. */
const r3 = (n) => Math.round(n * 10000) / 10000;

/**
 * Soft fills / badges. The brand colour is allowed to cover AREA here, so these
 * are legitimately translucent — they are composited over their base before any
 * measurement. Shared so no other rule mistakes a fill for a foreground.
 */
const TINT_TOKENS = [
  "--dsw-alias-brand-primary-soft",
  "--dsw-alias-state-business-tertiary",
  "--dsw-alias-markdown-tag"
];

/**
 * Tokens the audit grades as INK (the dark side of a contrast pair). These are
 * the ones a translucent value would invalidate: the same token reads
 * differently on every surface it lands on, so the single number in the report
 * stops being true.
 */
const INK_TOKENS = [
  ...Object.keys(TEXT_LEVELS),
  "--dsw-alias-brand-text",
  "--dsw-alias-state-success-primary",
  "--dsw-alias-state-warn-primary",
  "--dsw-alias-state-error-primary"
];

const isForegroundToken = (name) =>
  !TINT_TOKENS.includes(name) &&
  (INK_TOKENS.includes(name) ||
    name.startsWith("--dsw-alias-label-") ||
    name.startsWith("--dsw-alias-interactive-text"));

function makeCheck(name, detail) {
  return { name, pass: true, detail };
}
/** The bundle, read once per process. `checkGap` uses the same lazy pattern. */
let bundleCache;
function readBundleSource() {
  if (bundleCache === undefined) {
    try { bundleCache = fs.readFileSync(CLIENT, "utf8"); } catch { bundleCache = null; }
  }
  return bundleCache;
}
function fail(check, detail) {
  check.pass = false;
  check.detail = detail;
}

/**
 * Audit one skin. `skin` = { id, colorScheme, tokens, ... }.
 * Returns { id, checks: [...], score }.
 */
function auditSkin(skin, options = {}) {
  const scheme = skin.colorScheme;
  const tokens = skin.tokens;
  const checks = [];
  const add = (c) => { checks.push(c); return c; };
  const pluginSrc = options.pluginSource != null ? options.pluginSource : null;

  // Coverage first: a missing token makes every later measurement a lie
  // (the host would silently fall back to its own built-in palette).
  const missing = REQUIRED_TOKENS.filter((t) => !tokens || typeof tokens[t] !== "string");
  add({
    name: "token-coverage",
    pass: missing.length === 0,
    detail: missing.length === 0
      ? `${REQUIRED_TOKENS.length} required tokens present`
      : `missing ${missing.join(", ")}`
  });
  /**
   * Run a check only if the tokens it measures exist. A skin missing one must
   * still be scored on everything else — stopping at the first hole would
   * hide the rest of the report exactly when it matters most.
   */
  const guard = (name, needed, fn) => {
    const miss = needed.filter((t) => typeof tokens[t] !== "string");
    if (miss.length) return add({ name, pass: false, detail: `missing ${miss.join(", ")}` });
    return add(fn(name));
  };

  // Parse gate: an unparseable token means every measurement below is
  // undefined, so it must be reported (and stop) rather than crash the audit
  // and take the whole report down with it.
  const unparseable = Object.keys(tokens || {}).filter((t) => {
    try { rgbOf(tokens[t]); return false; } catch { return true; }
  });
  add({
    name: "token-parse",
    pass: unparseable.length === 0,
    detail: unparseable.length === 0
      ? "every token parses as a CSS color"
      : `unparseable: ${unparseable.join(", ")}`
  });
  if (unparseable.length) return { id: skin.id, scheme, checks, score: 0 };

  // Foreground tokens must be opaque. A translucent label means the same token
  // reads differently on every surface it lands on, so a single "the contrast
  // is X" number cannot be true; the old code graded such labels against their
  // raw channels and reported 11.9:1 for something that painted at 2.05:1.
  {
    const c = add(makeCheck("foreground-opaque", ""));
    const translucent = Object.keys(tokens)
      .filter((t) => isForegroundToken(t))
      .filter((t) => rgbOf(tokens[t]).a < 1)
      .map((t) => `${t} a=${rgbOf(tokens[t]).a}`);
    if (translucent.length) fail(c, `translucent text/signal: ${translucent.join(", ")}`);
    else c.detail = "every label/brand-text/signal token is opaque";
  }

  // Consumer evidence (issue #81). Every token THIS skin ships — not just the
  // required set, so a skin that invents an extra token is caught too — must be
  // justified by a reader: on the host side (frozen census) or on ours (live
  // scan of the bundle), or be an explicitly declared unconsumed host slot.
  {
    const c = add(makeCheck("token-consumers", ""));
    const shipped = Object.keys(tokens || {});
    const hostRead = [];
    const pluginRead = [];
    const declared = [];
    const forward = [];
    const unjustified = [];
    for (const t of shipped) {
      const row = CENSUS.tokens[t];
      if (row && row.consumers > 0) hostRead.push(t);
      else if (pluginConsumerCount(t, pluginSrc) > 0) pluginRead.push(t);
      else if (UNCONSUMED_HOST_SLOTS[t]) declared.push(t);
      else if (FORWARD_HOST_SLOTS[t]) forward.push(t);
      else unjustified.push(t);
    }
    if (unjustified.length) {
      fail(c, `token(s) with no host consumer, no plugin consumer and no declaration: ${unjustified.join(", ")}`);
    } else {
      // Phrased so the line cannot be quoted as "N verified surfaces": the
      // declared slots are unverified by construction and are named.
      const bits = [`${hostRead.length} host-consumed`, `${pluginRead.length} plugin-owned`];
      if (declared.length) bits.push(`${declared.length} declared-unconsumed host slot(s) (${declared.join(", ")})`);
      if (forward.length) {
        bits.push(`${forward.length} declared for a newer host (${forward.map((t) => `${t}@${FORWARD_HOST_SLOTS[t].since}`).join(", ")})`);
      }
      c.detail = `${shipped.length} tokens justified — ${bits.join(", ")}`;
    }
  }

  // Resolve every surface to the color the browser actually paints. The eight
  // ladder rungs plus the host-painted tinted surfaces, all through the shared
  // SURFACE_TOKENS map so this cannot drift from the solver (issue #76).
  const canvasCss = tokens["--dsw-alias-bg-base"];
  const canvasRgb = rgbOf(canvasCss);
  const composed = {};
  const cssOf = {};
  for (const [name, token] of Object.entries(SURFACE_TOKENS)) cssOf[name] = tokens[token];
  for (const name of Object.keys(SURFACE_TOKENS)) {
    // A missing token is REPORTED (text-surface-coverage / token-coverage),
    // never measured: throwing here would take the whole report down, which is
    // the one thing this audit must not do when something is wrong.
    if (typeof cssOf[name] === "string") composed[name] = flat(cssOf[name], canvasRgb);
  }

  // R1 — neutral axis purity + hue coherence
  {
    const c = add(makeCheck("neutral-axis", ""));
    const bad = [];
    let hueMin = 360;
    let hueMax = 0;
    for (const name of SURFACES) {
      const o = ok(composed[name]);
      const limit = T.maxNeutralChroma[scheme];
      if (o.C > limit) bad.push(`${name} C=${r2(o.C)}>${limit}`);
      if (o.C >= 0.005) {
        hueMin = Math.min(hueMin, o.H);
        hueMax = Math.max(hueMax, o.H);
      }
    }
    const spread = hueMax >= hueMin ? C.hueDistance(hueMin, hueMax) : 0;
    if (bad.length) fail(c, `chroma over limit: ${bad.join(", ")}`);
    else if (spread > T.maxNeutralHueSpread) fail(c, `hue spread ${r2(spread)}deg > ${T.maxNeutralHueSpread}`);
    else c.detail = `chroma<=${r2(Math.max(...SURFACES.map((n) => ok(composed[n]).C)))}, spread ${r2(spread)}deg`;
  }

  // R2 — elevation ladder
  {
    const c = add(makeCheck("elevation-ladder", ""));
    const order = LADDER[LADDER_SKINS[skin.id] || scheme];
    const steps = [];
    let broken = null;
    for (let i = 1; i < order.length; i++) {
      const d = ok(composed[order[i]]).L - ok(composed[order[i - 1]]).L;
      steps.push(`${order[i - 1]}->${order[i]} ${r2(d)}`);
      if (d < T.minElevationStep) broken = broken || `${order[i - 1]}->${order[i]} step ${r2(d)} < ${T.minElevationStep}`;
      if (d > T.maxElevationStep) broken = broken || `${order[i - 1]}->${order[i]} step ${r2(d)} > ${T.maxElevationStep}`;
    }
    if (broken) fail(c, broken);
    else c.detail = steps.join(", ");
  }

  // R3 — text contrast (WCAG + APCA) on every surface the level can land on.
  // Text is composited onto the surface it is measured against, not onto the
  // canvas: grading a translucent label against its raw channels reports what
  // the color WOULD be over black-ish nothing (11.9:1 in one real case), while
  // the pixel the user reads is much worse (2.05:1). See `foreground-opaque`.
  for (const [token, level] of Object.entries(TEXT_LEVELS)) {
    const c = add(makeCheck(`text-${level}`, ""));
    const fg = rgbOf(tokens[token]);
    let minW = Infinity;
    let minA = Infinity;
    let where = "";
    let whereA = "";
    // APCA on the host-painted tinted surfaces is MEASURED and reported, not
    // gated (issue #76). The reasons, all measured rather than asserted:
    //   - those surfaces are not ours to design — the host composes them from
    //     our markdown/selector tokens, and its own light theme puts tertiary
    //     at WCAG 3.42-3.71 on them (below AA) while ours sits at 4.61+;
    //   - the Lc 85 floor is calibrated for the elevation rungs, where a level
    //     is the designed carrier. On a brand-tinted inline-code chip the LIGHT
    //     skins reach Lc 79-85, against APCA's published Lc 75 minimum for
    //     fluent body text — passing the standard, short of our own target.
    // The numbers are pinned per skin in tests/skin.quality.test.cjs, so they
    // can neither drift down silently nor be quietly forgotten.
    let tintedA = Infinity;
    let whereTinted = "";
    for (const surf of TEXT_SURFACES[level]) {
      // A surface whose token this skin does not ship is reported by
      // text-surface-coverage; skipping it here keeps the rest measurable.
      const bg = composed[surf];
      if (!bg) continue;
      const ink = fg.a >= 1 ? fg : C.composite(fg, bg);
      const w = C.contrastRatio(ink, bg);
      if (w < minW) { minW = w; where = surf; }
      const a = Math.abs(C.apcaContrast(ink, bg));
      if (TINTED_SURFACES.includes(surf)) {
        if (a < tintedA) { tintedA = a; whereTinted = surf; }
      } else if (a < minA) {
        minA = a;
        whereA = surf;
      }
    }
    const needW = T.text[level];
    const needA = T.apca[level];
    if (minW < needW) fail(c, `WCAG ${r2(minW)} < ${needW} on ${where}`);
    else if (minA < needA) fail(c, `APCA Lc ${r2(minA)} < ${needA} on ${whereA}`);
    else c.detail = `WCAG ${r2(minW)} (min ${where}), APCA Lc ${r2(minA)} (min ${whereA}); `
      + `host-painted tinted min Lc ${r2(tintedA)} (${whereTinted})`;
  }

  // R3b — the audit measures every surface the SOLVE constrained itself to
  // (issue #76). Both sides read lib/text-surfaces.cjs, so the only way this
  // can fail is if someone reintroduced a private copy on one side — which is
  // exactly the defect: the docs claimed "solved against every surface it can
  // land on" while the auditor measured four surfaces the solver never used.
  {
    const c = add(makeCheck("text-surface-coverage", ""));
    // The solver's set is what `TEXT_SURFACES` says; the auditor must cover it
    // for EVERY level, and every surface it grades must resolve to a token the
    // skin actually ships.
    const problems = [];
    for (const level of Object.keys(TEXT_FLOORS)) {
      const named = TEXT_SURFACES[level] || [];
      if (named.length === 0) problems.push(`${level}: no surfaces declared`);
      for (const name of named) {
        if (!SURFACE_TOKENS[name]) problems.push(`${level}: "${name}" has no token in SURFACE_TOKENS`);
        else if (typeof tokens[SURFACE_TOKENS[name]] !== "string") {
          problems.push(`${level}: "${name}" needs ${SURFACE_TOKENS[name]}, which this skin does not ship`);
        }
      }
      const missingFromMeasurement = named.filter((n) => composed[n] === undefined);
      if (missingFromMeasurement.length) {
        problems.push(`${level}: solved-for but not measured — ${missingFromMeasurement.join(", ")}`);
      }
    }
    if (problems.length) fail(c, problems.join("; "));
    else {
      const names = new Set(Object.values(TEXT_SURFACES).flat());
      const rungs = [...names].filter((n) => !TINTED_SURFACES.includes(n)).length;
      c.detail = `${names.size} surfaces per level (${rungs} elevation rungs + ${TINTED_SURFACES.length} host-painted tinted); `
        + "the solve and this audit read the same list";
    }
  }

  // R4 — accent legibility + button label
  {
    const c = add(makeCheck("accent", ""));
    const accent = rgbOf(tokens["--dsw-alias-brand-primary"]);
    const onCanvas = C.contrastRatio(accent, canvasRgb);
    const onCard = C.contrastRatio(accent, composed.layer1);
    const brandText = rgbOf(tokens["--dsw-alias-brand-text"]);
    const onButton = C.contrastRatio(brandText, accent);
    const hover = rgbOf(tokens["--dsw-alias-button-primary-hover"]);
    const hoverDelta = C.deltaEok(hover, accent);
    const hoverOk = C.contrastRatio(hover, canvasRgb) >= T.accentOnCanvas;
    const hoverLabel = C.contrastRatio(brandText, hover) >= T.brandTextOnAccent;
    const dimmed = C.deltaEok(flat(tokens["--dsw-alias-button-primary-dimmed"], composed.layer1), composed.layer1);
    if (onCanvas < T.accentOnCanvas) fail(c, `accent/canvas ${r2(onCanvas)} < ${T.accentOnCanvas}`);
    else if (onCard < T.accentOnCard) fail(c, `accent/card ${r2(onCard)} < ${T.accentOnCard}`);
    else if (onButton < T.brandTextOnAccent) fail(c, `brand-text/accent ${r2(onButton)} < ${T.brandTextOnAccent}`);
    else if (hoverDelta < 0.03) fail(c, `hover dE ${r2(hoverDelta)} < 0.03 (state invisible)`);
    else if (!hoverOk) fail(c, `hover loses contrast on canvas`);
    else if (!hoverLabel) fail(c, `brand-text on hover < ${T.brandTextOnAccent}`);
    else if (dimmed < 0.02) fail(c, `dimmed fill dE ${r2(dimmed)} < 0.02 (invisible)`);
    else c.detail = `canvas ${r2(onCanvas)}, card ${r2(onCard)}, on-button ${r2(onButton)}, hover dE ${r2(hoverDelta)}, dimmed dE ${r2(dimmed)}`;
  }

  // R5 — the hairline ladder. Four levels plus the host's "thin" level 2
  // (issue #88: we shipped two levels and every menu body, card outline and
  // tool-bar divider that asked for l3/l4 got the host's neutral alpha).
  {
    const c = add(makeCheck("hairlines", ""));
    // Measured over the CANVAS for all four so they are comparable — reading
    // l1 over a panel and l2 over the canvas (which the old check did) makes
    // "l3 is stronger than l2" a statement about two different backdrops.
    const levels = [
      ["l1", "--dsw-alias-border-l1"],
      ["l2", "--dsw-alias-border-l2"],
      ["l3", "--dsw-alias-border-l3"],
      ["l4", "--dsw-alias-border-l4"]
    ];
    const thin = "--dsw-alias-border-l2-darkmode-thin";
    const miss = [...levels.map(([, t]) => t), thin].filter((t) => typeof tokens[t] !== "string");
    if (miss.length) fail(c, `missing ${miss.join(", ")}`);
    else {
      const problems = [];
      const d = (t) => C.deltaEok(flat(tokens[t], canvasRgb), canvasRgb);
      const seen = levels.map(([name, t]) => [name, d(t)]);
      // Levels 1-2 keep the ORIGINAL ceiling (a hairline); 3-4 are the heavier
      // separators the host added later and get the wider one. Widening all
      // four to the new ceiling would have quietly loosened the two the audit
      // already had — the opposite of what a fix may do.
      for (const [i, [name, v]] of seen.entries()) {
        const max = i < 2 ? T.borderMaxDeltaE : T.borderStrongMaxDeltaE;
        if (v < T.borderMinDeltaE) problems.push(`${name} ${r2(v)} < ${T.borderMinDeltaE} (invisible)`);
        else if (v > max) problems.push(`${name} ${r2(v)} > ${max} (a drawn box, not an edge)`);
      }
      for (let i = 1; i < seen.length && !problems.length; i += 1) {
        if (seen[i][1] <= seen[i - 1][1]) {
          problems.push(`${seen[i][0]} (${r2(seen[i][1])}) is not heavier than ${seen[i - 1][0]} (${r2(seen[i - 1][1])}) — four weights, one direction`);
        }
      }
      // `l1` also lives on panels, which is the case the old check graded.
      const l1OnPanel = C.deltaEok(flat(tokens[levels[0][1]], composed.layer1), composed.layer1);
      if (!problems.length && l1OnPanel < T.borderMinDeltaE) problems.push(`l1 on a panel ${r2(l1OnPanel)} < ${T.borderMinDeltaE}`);
      // The "thin" variant is level 2 at a LIGHTER weight: it belongs between
      // l1 and l2, and a value outside that window means the name lies.
      const dThin = d(thin);
      if (!problems.length && (dThin < seen[0][1] || dThin > seen[1][1])) {
        problems.push(`l2-darkmode-thin ${r2(dThin)} outside [l1 ${r2(seen[0][1])}, l2 ${r2(seen[1][1])}] — it is a lighter l2, not a fifth rung`);
      }
      if (problems.length) fail(c, problems.join("; "));
      else {
        c.detail = `l1 ${r2(seen[0][1])} < l2 ${r2(seen[1][1])} < l3 ${r2(seen[2][1])} < l4 ${r2(seen[3][1])} on canvas `
          + `(l1 on a panel ${r2(l1OnPanel)}), thin ${r2(dThin)}`;
      }
    }
  }

  // R6 — interaction states escalate monotonically and stay readable
  {
    const c = add(makeCheck("interaction", ""));
    const hov = C.deltaEok(flat(tokens["--dsw-alias-interactive-bg-hover"], composed.canvas), composed.canvas);
    const act = C.deltaEok(flat(tokens["--dsw-alias-interactive-bg-active"], composed.canvas), composed.canvas);
    const primary = rgbOf(tokens["--dsw-alias-label-primary"]);
    const onActive = C.contrastRatio(primary, flat(tokens["--dsw-alias-interactive-bg-active"], composed.layer1));
    // Destructive hover (issue #88). It has to be visible, and it has to be
    // the skin's ERROR hue — a foreign fixed red on a warm skin reads as a
    // different product's red, which is exactly what the host default is.
    const dangerToken = "--dsw-alias-interactive-bg-hover-danger";
    let dangerNote = "";
    if (typeof tokens[dangerToken] !== "string") {
      fail(c, `missing ${dangerToken}`);
    } else {
      const danger = flat(tokens[dangerToken], composed.canvas);
      const dDanger = C.deltaEok(danger, composed.canvas);
      const errH = ok(rgbOf(tokens["--dsw-alias-state-error-primary"])).H;
      const brandH = ok(rgbOf(tokens["--dsw-alias-brand-primary"])).H;
      const toError = C.hueDistance(ok(danger).H, errH);
      const toBrand = C.hueDistance(ok(danger).H, brandH);
      if (act <= hov) fail(c, `active ${r2(act)} not stronger than hover ${r2(hov)}`);
      else if (dDanger < 0.012) fail(c, `danger hover invisible on the canvas (dE ${r3(dDanger)} < 0.012)`);
      else if (toError >= toBrand) {
        fail(c, `danger hover sits ${r2(toError)}deg from the error signal and ${r2(toBrand)}deg from the brand — it reads as a brand hover, not a destructive one`);
      } else if (onActive < T.text.primary) {
        fail(c, `primary on active ${r2(onActive)} < ${T.text.primary}`);
      } else {
        dangerNote = `, danger hover dE ${r3(dDanger)} at ${r2(toError)}deg off the error hue`;
        c.detail = `hover dE ${r2(hov)} < active dE ${r2(act)}, primary-on-active ${r2(onActive)}${dangerNote}`;
      }
    }
  }

  // R7 — semantic states distinct from the brand and legible
  guard("states", ["--dsw-alias-state-success-primary", "--dsw-alias-state-warn-primary", "--dsw-alias-state-error-primary"], (name) => {
    const c = makeCheck(name, "");
    const accentH = ok(rgbOf(tokens["--dsw-alias-brand-primary"])).H;
    const problems = [];
    for (const key of ["--dsw-alias-state-success-primary", "--dsw-alias-state-warn-primary", "--dsw-alias-state-error-primary"]) {
      const rgb = rgbOf(tokens[key]);
      const o = ok(rgb);
      const sep = C.hueDistance(o.H, accentH);
      const w = C.contrastRatio(rgb, canvasRgb);
      if (sep < T.stateHueSeparation) problems.push(`${key} hue ${r2(sep)}deg from accent < ${T.stateHueSeparation}`);
      if (w < T.stateOnCanvas) problems.push(`${key} contrast ${r2(w)} < ${T.stateOnCanvas}`);
    }
    if (problems.length) fail(c, problems.join("; "));
    else c.detail = "success/warn/error separated and legible";
    return c;
  });

  // R8 — canvas character (not dead gray, not pure black/white)
  {
    const c = add(makeCheck("canvas", ""));
    const o = ok(canvasRgb);
    const [lo, hi] = T.canvasL[scheme];
    if (o.L < lo || o.L > hi) fail(c, `L ${r2(o.L)} outside [${lo}, ${hi}]`);
    else if (o.C < T.minCanvasChroma) fail(c, `chroma ${r2(o.C)} < ${T.minCanvasChroma} (dead gray)`);
    else c.detail = `L ${r2(o.L)}, C ${r2(o.C)}, H ${r2(o.H)}`;
  }

  // R9 — layer-2 must survive the popup-opacity slider (hue-preserving shape)
  {
    const c = add(makeCheck("layer2-shape", ""));
    const v = tokens["--dsw-alias-bg-layer-2"].trim();
    const keepsHue = /^#[0-9a-f]{6}$/i.test(v) || /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(v);
    if (!keepsHue) fail(c, `"${v}" is not #hex or comma rgb(a) — the popup slider would drop the skin hue`);
    else c.detail = v.slice(0, 28);
  }

  // R9b — EVERY shipped token must be in the same two shapes (issue #89).
  //
  // The popup-opacity path re-derives its values from the ACTIVE skin's tokens
  // (`fillFor` reads `--dsw-alias-bg-layer-2` / `--dsw-alias-bg-base`, and
  // `toRgbaStrict` keeps the skin's hue for `#hex` and comma `rgb()/rgba()`
  // only). Anything else silently falls back to the scheme base colour — so a
  // token that parses on one surface and not on another is a token that
  // behaves differently depending on which slider the user touches.
  //
  // The reader list is PARSED FROM THE BUNDLE, not restated here: issue #76's
  // lesson was that a scoring surface copied by hand from the runtime drifts
  // away from it, and this check exists precisely to grade the runtime's own
  // list.
  {
    const c = add(makeCheck("token-shape", ""));
    const shape = /^(#[0-9a-f]{6}|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\))$/i;
    const bad = Object.entries(tokens || {}).filter(([, v]) => typeof v !== "string" || !shape.test(v.trim()));
    const src = pluginSrc != null ? pluginSrc : readBundleSource();
    const popup = src == null ? null : (src.match(/POPUP_TOKENS\s*=\s*\[([^\]]*)\]/) || [null, null])[1];
    const popupNames = popup == null ? null : [...popup.matchAll(/"(--[a-z0-9-]+)"/g)].map((m) => m[1]);
    if (bad.length) {
      fail(c, `${bad.length} token(s) are not #hex or comma rgb(a): ${bad.slice(0, 3).map(([n, v]) => `${n}="${v}"`).join(", ")} — the runtime's own parsers drop every other shape`);
    } else if (popupNames === null) {
      // "I could not read the runtime's list" must not look like "I checked it".
      fail(c, "could not read POPUP_TOKENS from lib/client.js — the shape rule's reader list is unverified");
    } else {
      // A POPUP_TOKENS entry no skin ships is legitimate — that is the
      // `computed` disposition (`--dsw-specific-menu` is re-derived by the
      // plugin on every publish; issue #88's gate owns that claim). What this
      // check owns is the SHAPE of every token the path does read.
      const shipped = popupNames.filter((n) => typeof tokens[n] === "string").length;
      c.detail = `${Object.keys(tokens).length} tokens are #hex/comma-rgb; the popup path reads ${popupNames.length} (${shipped} shipped, ${popupNames.length - shipped} computed at runtime)`;
    }
  }

  // R10 — the composer input must not be a hole in the page
  {
    const c = add(makeCheck("composer", ""));
    const input = flat(tokens["--dsw-specific-input-major"], canvasRgb);
    const w = C.contrastRatio(rgbOf(tokens["--dsw-alias-label-primary"]), input);
    if (w < T.text.primary) fail(c, `primary on input ${r2(w)} < ${T.text.primary}`);
    else c.detail = `primary on input ${r2(w)}`;
  }

  // R11 — bubbles carry body text
  {
    const c = add(makeCheck("bubble", ""));
    const w = C.contrastRatio(rgbOf(tokens["--dsw-alias-label-primary"]), composed.bubble);
    const w2 = C.contrastRatio(rgbOf(tokens["--dsw-alias-label-secondary"]), composed.bubble);
    if (w < T.text.primary) fail(c, `primary ${r2(w)} < ${T.text.primary}`);
    else if (w2 < T.text.secondary) fail(c, `secondary ${r2(w2)} < ${T.text.secondary}`);
    else c.detail = `primary ${r2(w)}, secondary ${r2(w2)}`;
  }

  // R12 — brand tints (badge / tag / soft fill)
  // A tint is the one place the brand colour is allowed to cover area, so it
  // must be the brand's hue, be visible against its base, and still carry text.
  {
    const c = add(makeCheck("tints", ""));
    const brandH = ok(rgbOf(tokens["--dsw-alias-brand-primary"])).H;
    const tintTokens = TINT_TOKENS;
    const miss = tintTokens.filter((t) => typeof tokens[t] !== "string");
    if (miss.length) { fail(c, `missing ${miss.join(", ")}`); }
    else {
      const [minD, maxD] = T.tintDeltaE;
      for (const t of tintTokens) {
        const onCanvas = flat(tokens[t], canvasRgb);
        const d = C.deltaEok(onCanvas, canvasRgb);
        if (d < minD) fail(c, `${t} invisible on canvas (dE ${r3(d)} < ${minD})`);
        else if (d > maxD) fail(c, `${t} is a block, not a tint (dE ${r3(d)} > ${maxD})`);
        else {
          const hd = C.hueDistance(ok(onCanvas).H, brandH);
          if (hd > T.tintMaxHueDistance) fail(c, `${t} hue ${r2(hd)}deg off the brand`);
          const w = C.contrastRatio(rgbOf(tokens["--dsw-alias-label-primary"]), onCanvas);
          if (w < T.text.primary) fail(c, `${t}: primary text ${r2(w)} < ${T.text.primary}`);
        }
      }
      if (c.pass) c.detail = `3 brand tints visible, on-hue and legible (dE ${r3(C.deltaEok(flat(tokens[tintTokens[0]], canvasRgb), canvasRgb))} on canvas)`;
    }
  }

  // R13 — the elevated-button surface
  {
    const c = add(makeCheck("elevated-button", ""));
    const css = tokens["--dsw-alias-button-elevated-fill"];
    if (typeof css !== "string") { fail(c, "missing --dsw-alias-button-elevated-fill"); }
    else {
      const surf = flat(css, canvasRgb);
      const d = C.deltaEok(surf, canvasRgb);
      const [minD, maxD] = T.elevatedDeltaE;
      const w = C.contrastRatio(rgbOf(tokens["--dsw-alias-label-primary"]), surf);
      if (d < minD) fail(c, `flat against the canvas (dE ${r3(d)} < ${minD})`);
      else if (d > maxD) fail(c, `too far off the canvas to be a button (dE ${r3(d)} > ${maxD})`);
      else if (w < T.text.primary) fail(c, `primary text ${r2(w)} < ${T.text.primary}`);
      else c.detail = `lifted dE ${r3(d)}, primary ${r2(w)}`;
    }
  }

  // R14 — scrollbars: findable, ordered, and not a stripe
  {
    const c = add(makeCheck("scrollbars", ""));
    const pairs = [
      ["--dsw-alias-scrollbar-bg-l1", "--dsw-alias-scrollbar-hover-l1"],
      ["--dsw-alias-scrollbar-bg-l2", "--dsw-alias-scrollbar-hover-l2"]
    ];
    const miss = pairs.flat().filter((t) => typeof tokens[t] !== "string");
    if (miss.length) { fail(c, `missing ${miss.join(", ")}`); }
    else {
      const [minD, maxD] = T.scrollbarDeltaE;
      const dOf = (t) => C.deltaEok(flat(tokens[t], canvasRgb), canvasRgb);
      for (const [idle, hover] of pairs) {
        const di = dOf(idle);
        const dh = dOf(hover);
        if (di < minD) fail(c, `${idle} invisible (dE ${r3(di)} < ${minD})`);
        else if (di > maxD) fail(c, `${idle} too loud (dE ${r3(di)} > ${maxD})`);
        else if (dh < di) fail(c, `${hover} (${r3(dh)}) is fainter than ${idle} (${r3(di)})`);
        else if (dh > T.scrollbarHoverMaxDeltaE) fail(c, `${hover} too loud (dE ${r3(dh)} > ${T.scrollbarHoverMaxDeltaE})`);
      }
      // A second-level track is the stronger one — otherwise the two levels
      // are decoration rather than information.
      const d1 = dOf(pairs[0][0]);
      const d2 = dOf(pairs[1][0]);
      if (d2 < d1) fail(c, `l2 track (${r3(d2)}) is fainter than l1 (${r3(d1)})`);
      if (c.pass) c.detail = `l1 ${r3(d1)} -> ${r3(dOf(pairs[0][1]))}, l2 ${r3(d2)} -> ${r3(dOf(pairs[1][1]))}`;
    }
  }

  // R15 — keyboard focus must be VISIBLE (issue #88)
  // The host's default for `--dsw-focus-ring-color` is the literal string
  // `transparent`. With no skin value, keyboard navigation has no focus
  // indicator anywhere in the product — a WCAG 2.4.7 failure, and the only
  // defect in this set that is accessibility rather than cosmetics.
  {
    const c = add(makeCheck("focus-ring", ""));
    const token = SURFACE_TOKENS.focusRing;
    if (typeof tokens[token] !== "string") fail(c, `missing ${token}`);
    else {
      const rgb = rgbOf(tokens[token]);
      const onCanvas = C.contrastRatio(rgb, canvasRgb);
      const onLayer = C.contrastRatio(rgb, composed.layer1);
      if (rgb.a < 1) fail(c, `${token} is translucent (a=${rgb.a}) — a ring that takes the surface's colour is not an indicator`);
      else if (onCanvas < T.focusRingOnCanvas) fail(c, `${r2(onCanvas)}:1 on the canvas < ${T.focusRingOnCanvas} (WCAG 1.4.11 non-text contrast)`);
      else c.detail = `${r2(onCanvas)}:1 on canvas, ${r2(onLayer)}:1 on a panel (the host default is \`transparent\`)`;
    }
  }

  // R16 — the menu surfaces (issues #88 and #89)
  // Two names, one surface family: the menu BODY and the group header that
  // sticks to the top of it. The host paints the stuck header at 94% opacity
  // with a hardcoded neutral (`#f8f9faf0` / `#303136f0`), which on a tinted
  // skin reads as a dirty band over a scrolled menu. The token names come from
  // `SURFACE_TOKENS` so this check cannot drift from the one map.
  {
    const c = add(makeCheck("menu-surfaces", ""));
    const bodyToken = SURFACE_TOKENS.menuSurface;
    const headToken = SURFACE_TOKENS.menuHeader;
    const miss = [bodyToken, headToken].filter((t) => typeof tokens[t] !== "string");
    if (miss.length) fail(c, `missing ${miss.join(", ")}`);
    else {
      const body = flat(tokens[bodyToken], canvasRgb);
      const head = flat(tokens[headToken], canvasRgb);
      const dBody = C.deltaEok(body, canvasRgb);
      const dHead = C.deltaEok(head, canvasRgb);
      const headAlpha = rgbOf(tokens[headToken]).a;
      const wHead = C.contrastRatio(rgbOf(tokens["--dsw-alias-label-primary"]), head);
      const hueOff = C.hueDistance(ok(body).H, ok(head).H);
      // The de-hue check, straight from issue #89's mutation 2: the host's own
      // value for this token is a NEUTRAL (`#303136f0`). Shipping that would
      // leave a grey band on a tinted skin, and "is it the same hue as the
      // menu body" can be true for two greys. So the pair must also sit on the
      // skin's own neutral axis.
      //
      // Guarded by the same chroma floor the `neutral-axis` check uses: a
      // deliberately achromatic skin (`midnight`, C 0.0022) has no axis to be
      // off, and a near-grey's hue angle is arithmetic noise. Measuring it
      // anyway is how a rule fires on the one skin it cannot mean anything for.
      const canvasOklch = ok(canvasRgb);
      const axisOff = canvasOklch.C >= 0.005 ? C.hueDistance(ok(head).H, canvasOklch.H) : 0;
      const axisNote = canvasOklch.C >= 0.005 ? `${r2(axisOff)}deg off the skin axis, ` : "achromatic skin (axis not measured), ";
      if (dBody < T.menuMinDeltaE) fail(c, `the menu body is flat on the canvas (dE ${r3(dBody)} < ${T.menuMinDeltaE})`);
      else if (dHead < dBody) fail(c, `the stuck group header (dE ${r3(dHead)}) is weaker than the menu body (${r3(dBody)}) — the header sits ON the menu`);
      else if (headAlpha < T.menuHeaderMinAlpha) {
        fail(c, `the stuck group header is ${headAlpha} opaque < ${T.menuHeaderMinAlpha}: scrolled rows read through it`);
      } else if (wHead < T.text.primary) fail(c, `primary on the stuck header ${r2(wHead)} < ${T.text.primary}`);
      else if (hueOff > T.tintMaxHueDistance) fail(c, `header and body are ${r2(hueOff)}deg apart — one surface, not two greys`);
      else if (axisOff > T.maxNeutralHueSpread) {
        fail(c, `the stuck group header sits ${r2(axisOff)}deg off the skin's neutral axis — a foreign grey on a tinted skin`);
      } else {
        c.detail = `menu dE ${r3(dBody)}, stuck header dE ${r3(dHead)} at ${headAlpha} alpha, ${axisNote}primary ${r2(wHead)}`;
      }
    }
  }

  // R17 — the rest of the host chrome (issue #88): tool-bar chips, skeleton
  // plates, and the drag-drop scrim.
  {
    const c = add(makeCheck("host-chrome", ""));
    const need = [SURFACE_TOKENS.toolBar, SURFACE_TOKENS.toolBarHover, SURFACE_TOKENS.skeleton, SURFACE_TOKENS.maskDrop];
    const miss = need.filter((t) => typeof tokens[t] !== "string");
    if (miss.length) fail(c, `missing ${miss.join(", ")}`);
    else {
      const [minBar, maxBar] = T.toolBarDeltaE;
      const dFill = C.deltaEok(flat(tokens[SURFACE_TOKENS.toolBar], canvasRgb), canvasRgb);
      const dHover = C.deltaEok(flat(tokens[SURFACE_TOKENS.toolBarHover], canvasRgb), canvasRgb);
      const dSkel = C.deltaEok(flat(tokens[SURFACE_TOKENS.skeleton], canvasRgb), canvasRgb);
      const [minSkel, maxSkel] = T.skeletonDeltaE;
      const dropAlpha = rgbOf(tokens[SURFACE_TOKENS.maskDrop]).a;
      if (dFill < minBar) fail(c, `tool-bar chip invisible (dE ${r3(dFill)} < ${minBar})`);
      else if (dFill > maxBar) fail(c, `tool-bar chip is a block (dE ${r3(dFill)} > ${maxBar})`);
      else if (dHover <= dFill) fail(c, `tool-bar hover (${r3(dHover)}) does not gain weight over the idle chip (${r3(dFill)})`);
      else if (dSkel < minSkel) fail(c, `skeleton plate invisible (dE ${r3(dSkel)} < ${minSkel})`);
      else if (dSkel > maxSkel) fail(c, `skeleton plate dE ${r3(dSkel)} > ${maxSkel} — louder than the platform's own placeholder (0.0783)`);
      else if (dropAlpha < T.maskDropMinAlpha) fail(c, `the drag-drop scrim is ${dropAlpha} opaque < ${T.maskDropMinAlpha}: content shows through what it is hiding`);
      else c.detail = `tool bar ${r3(dFill)} -> ${r3(dHover)}, skeleton ${r3(dSkel)}, drop scrim ${dropAlpha} alpha`;
    }
  }

  // R18 — file diffs (issue #88). A diff row carries meaning: added rows must
  // be the SUCCESS hue and deleted rows the ERROR hue, and the two markers
  // must be tellable apart without reading the code.
  {
    const c = add(makeCheck("file-diff", ""));
    const groups = [
      ["added", "--dsw-alias-file-diff-added-bg", "--dsw-alias-file-diff-added-gutter", "--dsw-alias-file-diff-added-marker", "--dsw-alias-state-success-primary"],
      ["deleted", "--dsw-alias-file-diff-deleted-bg", "--dsw-alias-file-diff-deleted-gutter", "--dsw-alias-file-diff-deleted-marker", "--dsw-alias-state-error-primary"]
    ];
    const miss = groups.flat().filter((t) => t.startsWith("--dsw-") && typeof tokens[t] !== "string");
    if (miss.length) fail(c, `missing ${[...new Set(miss)].join(", ")}`);
    else {
      const problems = [];
      const hueOf = {};
      for (const [name, bg, gutter, marker, state] of groups) {
        const bgRgb = flat(tokens[bg], canvasRgb);
        const gutRgb = flat(tokens[gutter], canvasRgb);
        const gd = C.deltaEok(gutRgb, canvasRgb);
        const rd = C.deltaEok(bgRgb, canvasRgb);
        const stateH = ok(rgbOf(tokens[state])).H;
        const label = name === "added" ? "success" : "error";
        hueOf[name] = ok(rgbOf(tokens[marker])).H;
        // The HUE is graded on the gutter — the semantic strip is where the
        // signal actually shows. The row wash is only 11-26% of the state
        // colour by design, so on a cool near-white canvas (`mist`) even a
        // correct wash measures 30deg off; requiring THAT to carry the hue
        // would force the rows heavy enough to stop being washes. The wash
        // still has to agree with its own strip, so a blue wash on a green
        // gutter is caught.
        const gutOff = C.hueDistance(ok(gutRgb).H, stateH);
        const washOff = C.hueDistance(ok(bgRgb).H, ok(gutRgb).H);
        if (rd < T.fileDiffRowDeltaE) problems.push(`${name} row invisible (dE ${r3(rd)} < ${T.fileDiffRowDeltaE})`);
        else if (gutOff > T.fileDiffMaxHueDistance) problems.push(`${name} gutter is ${r2(gutOff)}deg off its ${label} hue`);
        else if (washOff > T.fileDiffWashMaxHueDistance) problems.push(`${name} row wash is ${r2(washOff)}deg off its own gutter`);
        else if (gd <= rd) problems.push(`${name} gutter (${r3(gd)}) is not stronger than its row (${r3(rd)})`);
        const w = C.contrastRatio(rgbOf(tokens[marker]), bgRgb);
        if (w < T.fileDiffMarkerContrast) problems.push(`${name} marker ${r2(w)}:1 on its row < ${T.fileDiffMarkerContrast}`);
      }
      const sep = C.hueDistance(hueOf.added, hueOf.deleted);
      if (!problems.length && sep < T.fileDiffPairSeparation) {
        problems.push(`added and deleted markers are ${r2(sep)}deg apart < ${T.fileDiffPairSeparation}`);
      }
      if (problems.length) fail(c, problems.join("; "));
      else c.detail = `added/deleted rows on their state hues, markers separated by ${r2(sep)}deg`;
    }
  }

  // Meta-gate: no report line may contain a non-finite number. `parseColor`
  // now throws rather than returning NaN, but a future check that divides by a
  // zero ΔL would otherwise print "Infinity" where a measurement belongs — and
  // a number-shaped string in this report gets copied into documentation.
  {
    const poisoned = checks.filter((c) => /NaN|Infinity|undefined/.test(c.detail));
    add({
      name: "detail-finite",
      pass: poisoned.length === 0,
      detail: poisoned.length === 0
        ? `${checks.length} details are finite numbers`
        : `non-finite detail: ${poisoned.map((c) => `${c.name}="${c.detail}"`).join("; ")}`
    });
  }

  const passed = checks.filter((c) => c.pass).length;
  return { id: skin.id, scheme, checks, score: passed / checks.length };
}

/** Cross-skin: the eight presets must be eight choices, not two. */
function auditCatalog(skins) {
  const rows = [];
  const accented = skins.map((s) => ({
    id: s.id,
    hue: ok(rgbOf(s.tokens["--dsw-alias-brand-primary"])).H,
    canvasH: ok(rgbOf(s.tokens["--dsw-alias-bg-base"])).H,
    canvasC: ok(rgbOf(s.tokens["--dsw-alias-bg-base"])).C
  }));
  for (let i = 0; i < accented.length; i++) {
    for (let j = i + 1; j < accented.length; j++) {
      const a = accented[i];
      const b = accented[j];
      const d = C.hueDistance(a.hue, b.hue);
      const axis = C.hueDistance(a.canvasH, b.canvasH);
      // Two skins are allowed to share an accent hue only if their neutral
      // axes are clearly different places.
      if (d < T.minAccentHueSeparation && axis < T.minAccentHueSeparation) {
        rows.push({
          pair: `${a.id}/${b.id}`,
          pass: false,
          detail: `accent ${r2(d)}deg and axis ${r2(axis)}deg — the two read as one skin`
        });
      }
    }
  }
  return {
    name: "catalog-distinctiveness",
    pass: rows.length === 0,
    rows
  };
}

// ── main ───────────────────────────────────────────────────────────────────
if (require.main !== module) {
	// Imported by tests/skin.quality.test.cjs, which needs the rubric as a
	// library (and a way to prove the rubric can actually fail).
	module.exports = { auditSkin, auditCatalog, extractSkins, T, REQUIRED_TOKENS, CLIENT, CENSUS, UNCONSUMED_HOST_SLOTS, FORWARD_HOST_SLOTS, pluginConsumerCount };
	return;
}

function loadSkins(argv) {
  if (argv.includes("--system")) return require("./skin-system.cjs").buildAll();
  const source = fs.readFileSync(CLIENT, "utf8");
  return extractSkins(source);
}

function main() {
  const argv = process.argv.slice(2);
  const skins = loadSkins(argv);
  const reports = skins.map(auditSkin);
  const catalog = auditCatalog(skins);
  const failed = reports.filter((r) => r.checks.some((c) => !c.pass));

  if (argv.includes("--json")) {
    console.log(JSON.stringify({ skins: reports, catalog }, null, 2));
  } else {
    const pad = (s, n) => String(s).padEnd(n);
    console.log("dsh-dream-skin · skin quality audit");
    console.log("=".repeat(78));
    for (const r of reports) {
      const bad = r.checks.filter((c) => !c.pass);
      const mark = bad.length === 0 ? "PASS" : "FAIL";
      console.log(`\n[${mark}] ${pad(r.id, 10)} ${r.scheme.padEnd(5)} ${r.checks.filter((c) => c.pass).length}/${r.checks.length}`);
      for (const c of r.checks) {
        console.log(`   ${c.pass ? "·" : "✗"} ${pad(c.name, 22)} ${c.detail}`);
      }
    }
    console.log(`\n${catalog.pass ? "PASS" : "FAIL"} ${catalog.name}`);
    for (const row of catalog.rows) console.log(`   ✗ ${row.pair}: ${row.detail}`);
    const total = reports.reduce((n, r) => n + r.checks.length, 0) + 1;
    const pass = reports.reduce((n, r) => n + r.checks.filter((c) => c.pass).length, 0) + (catalog.pass ? 1 : 0);
    console.log(`\n${pass}/${total} checks passed across ${skins.length} skins.`);
  }
  if (failed.length || !catalog.pass) process.exitCode = 1;
}

main();
