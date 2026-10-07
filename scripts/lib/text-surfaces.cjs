/**
 * dsh-dream-skin — THE TEXT-SURFACE LIST (single source of truth).
 *
 * Issue #76: the solver (`scripts/skin-system.cjs`) and the auditor
 * (`scripts/skin-audit.cjs`) each kept their own list of "surfaces a text
 * level can land on", and neither was derived from what the host actually
 * paints. The solver checked four surfaces for the hint level; the auditor
 * checked four DIFFERENT ones; the host paints hint text on a third set
 * (code-block line numbers, expanders, empty states — measured in
 * `dsh-client-ui-primitives/lib/markdown/*.module.css` and the web-frontend
 * bundle). The failure that follows is structural, not cosmetic: the docs can
 * truthfully say "every surface a level can land on" while eight real
 * skin/surface pairs sit below the floor.
 *
 * Both sides now import THESE lists. `tests/skin.quality.test.cjs` asserts the
 * auditor's set is a superset of the solver's, so the two can never drift
 * apart again — a surface added to one side and not the other reddens.
 *
 * Naming: every entry here has a token in SURFACE_TOKENS, and that token is
 * what the auditor measures (composited over the canvas, as the browser would
 * paint it).
 */

/** Surface name → the CSS custom property that paints it. */
const SURFACE_TOKENS = {
  canvas: '--dsw-alias-bg-base',
  modulePlatform: '--dsw-alias-bg-module-platform',
  sidebar: '--dsw-specific-sidebar-fill',
  layer1: '--dsw-alias-bg-layer-1',
  layer2: '--dsw-alias-bg-layer-2',
  layer3: '--dsw-alias-bg-layer-3',
  bubble: '--dsw-specific-bubble',
  tip: '--dsw-specific-tip',
  codeBlock: '--dsw-alias-markdown-code-block',
  inlineCode: '--dsw-alias-markdown-inline-code',
  selector: '--dsw-specific-selector',
  // ── host surfaces covered from issue #88 on ───────────────────────────
  // Named here, in the ONE map that says "this name is painted by this
  // token", so the audit's `menu-surfaces` check reads the token name from
  // here instead of keeping a third copy (the #76 lesson, and issue #89's
  // explicit instruction not to add another hand-kept list).
  //
  // They are deliberately NOT in TEXT_SURFACES below: the solver would then
  // re-solve every skin's text levels against the menu, which is a different
  // decision with its own evidence, and #88 is about COVERAGE, not about
  // re-tiering the text ladder. The `menu-surfaces` check grades the pair it
  // needs (primary on the stuck header) directly.
  menuSurface: '--dsw-menu-surface-fill',
  menuHeader: '--dsw-alias-menu-group-header-fill',
  focusRing: '--dsw-focus-ring-color',
  toolBar: '--dsw-alias-button-tool-bar-fill',
  toolBarHover: '--dsw-alias-button-tool-bar-hover',
  skeleton: '--dsw-alias-bg-skeleton',
  maskDrop: '--dsw-alias-bg-mask-drop',
  diffAdded: '--dsw-alias-file-diff-added-bg',
  diffDeleted: '--dsw-alias-file-diff-deleted-bg'
};

/**
 * Surfaces the solver resolves through its own elevation ramp. These are the
 * steps of the ladder the design system solves for, in order.
 */
const LADDER_SURFACES = ['canvas', 'modulePlatform', 'sidebar', 'layer1', 'bubble', 'layer3', 'tip', 'layer2'];

/**
 * Host-painted TINTED surfaces (issue #76). They are not rungs of our elevation
 * ladder — the host composes them from our markdown/selector tokens — but the
 * host really does paint text on them, so they belong in the constraint set.
 *
 * Evidence, host 0.2.0-rc.1 (see `scripts/data/host-token-census.json` for the
 * consumer counts and `docs/design-philosophy.md` for the citations):
 *   - `--dsw-alias-markdown-code-block` — 28 reads / 14 files. Code-block line
 *     numbers, gutter and expanders are painted `--dsw-alias-label-tertiary`.
 *   - `--dsw-alias-markdown-inline-code` — read by MarkdownText.module.css;
 *     inline code sits inside body/hint text, so it inherits the hint colour.
 *   - `--dsw-specific-selector` — the dropdown surface; its hint rows are
 *     tertiary.
 */
const TINTED_SURFACES = ['codeBlock', 'inlineCode', 'selector'];

/**
 * Surfaces a text level may be rendered on. One list, used by the solver AND
 * the auditor. `worst case drives the solve`, and the auditor grades the same
 * set — that is the whole point of the file.
 */
const TEXT_SURFACES = {
  // Hint/meta text lives on the canvas, panels, bubbles, the rail, and inside
  // the host's markdown/selector chrome. It is not spec'd for dialogs, where
  // host chrome uses the primary/secondary level.
  tertiary: ['canvas', 'layer1', 'bubble', 'sidebar', ...TINTED_SURFACES],
  secondary: ['canvas', 'layer1', 'bubble', 'sidebar', 'layer2', ...TINTED_SURFACES],
  primary: ['canvas', 'layer1', 'bubble', 'sidebar', 'layer2', 'tip', ...TINTED_SURFACES]
};

/**
 * The bar each level must clear, in two different roles:
 *   - `TEXT_FLOORS` is the AUDIT bar: below this the skin fails.
 *   - `TEXT_TARGETS` is what the SOLVER aims at, deliberately above the floor
 *     so rounding and compositing never land exactly on the line.
 * They are different numbers on purpose; the relationship (target > floor) is
 * asserted in the tests, which is what keeps "solved to a slightly higher bar"
 * from silently becoming "solved to the audit line".
 */
const TEXT_FLOORS = { primary: 7.0, secondary: 4.9, tertiary: 4.5 };
const TEXT_TARGETS = { primary: 7.2, secondary: 5.6, tertiary: 4.6 };

/** Every surface name mentioned anywhere (for coverage assertions). */
const ALL_SURFACES = [...new Set([...LADDER_SURFACES, ...Object.values(TEXT_SURFACES).flat()])];

module.exports = {
  SURFACE_TOKENS,
  LADDER_SURFACES,
  TINTED_SURFACES,
  TEXT_SURFACES,
  TEXT_FLOORS,
  TEXT_TARGETS,
  ALL_SURFACES
};
