/**
 * dsh-dream-skin — FORWARD TOKEN GAP: the dispositions (issue #88).
 *
 * `scripts/host-consumers.cjs` measures the INVERSE question ("we ship it,
 * nobody reads it", issue #81). This file answers the FORWARD one: **the host
 * reads this colour token and our skins do not define it**, so a skinned page
 * still paints that surface in the host's neutral grey.
 *
 * Every measured gap must carry exactly one of four dispositions, and each one
 * is checked mechanically by `tests/host.gap.test.cjs`:
 *
 *   cover         the skin ships the token. Checked: it is in `buildAll()`.
 *   computed      the plugin derives it at runtime from skin tokens, so a
 *                 static skin value would be overwritten. Checked: the named
 *                 `anchor` really appears in `lib/client.js`.
 *   derived       the host declares it as `var(--base)` and inherits whatever
 *                 the base resolves to — overriding it would duplicate a
 *                 decision that already belongs to the base (issue #89's rule,
 *                 and the reason `turn-trigger-*` needs no action).
 *                 Checked: `base` really is one of the token's own var() bases.
 *   not-skinned   deliberately left to the host. `reason` is mandatory.
 *                 Checked BOTH ways: the token must NOT appear in our skins,
 *                 so nobody can "helpfully" cover it later and quietly
 *                 invalidate the reasoning.
 *
 * The list is keyed by token and must be COMPLETE for the installed host: a
 * measured gap with no entry here fails the gate by name, which is the whole
 * point (a new host token cannot slip in undispositioned).
 */

/** @type {Record<string, {disposition: string, reason?: string, anchor?: string, base?: string, since?: string}>} */
const DISPOSITIONS = {
	// ── cover: the skin defines them ──────────────────────────────────────
	'--dsw-alias-border-l3': {
		disposition: 'cover',
		reason: '27 host packages read it (chat, conversation, deliverables, layout, plan, primitives, settings-*, sidebar-*, tool, trajectory, …) — the menu/card/tool-bar outline we shipped no value for'
	},
	'--dsw-alias-border-l4': {
		disposition: 'cover',
		reason: '24 packages; continues our own hairline ladder instead of falling back to the host neutral'
	},
	'--dsw-alias-border-l2-darkmode-thin': {
		disposition: 'cover',
		reason: '6 packages (attachment, primitives, settings-account, trajectory, user-questions, web-frontend); the third edge weight the host defines'
	},
	'--dsw-focus-ring-color': {
		disposition: 'cover',
		reason: 'the host default is the literal `transparent`, so with no skin value keyboard focus has NO visible indicator anywhere (WCAG 2.4.7) — the only accessibility defect in this set'
	},
	'--dsw-alias-interactive-bg-hover-danger': {
		disposition: 'cover',
		reason: '8 packages paint destructive hovers with it; the host value is a fixed foreign red'
	},
	'--dsw-alias-bg-skeleton': {
		disposition: 'cover',
		reason: '6 packages; the loading plate under a skinned page was host-grey'
	},
	'--dsw-menu-surface-fill': {
		disposition: 'cover',
		reason: 'the menu BODY (primitives/MenuSurface.module.css). The host value is a hardcoded near-white/near-dark neutral'
	},
	'--dsw-alias-button-tool-bar-fill': { disposition: 'cover' },
	'--dsw-alias-button-tool-bar-hover': { disposition: 'cover' },
	'--dsw-alias-bg-mask-drop': {
		disposition: 'cover',
		reason: 'the drag-and-drop scrim; the host value is a fixed light/dark wash'
	},
	'--dsw-alias-file-diff-added-bg': { disposition: 'cover' },
	'--dsw-alias-file-diff-added-gutter': { disposition: 'cover' },
	'--dsw-alias-file-diff-added-marker': { disposition: 'cover' },
	'--dsw-alias-file-diff-deleted-bg': { disposition: 'cover' },
	'--dsw-alias-file-diff-deleted-gutter': { disposition: 'cover' },
	'--dsw-alias-file-diff-deleted-marker': { disposition: 'cover' },
	'--dsw-alias-menu-group-header-fill': {
		disposition: 'cover',
		since: '0.2.0-rc.2',
		reason: 'issue #89: the stuck group header of a scrolled menu. rc.2+ paints it at 94% with a hardcoded neutral (#f8f9faf0 / #303136f0). Shipped ahead of the upgrade'
	},

	// ── computed: the plugin owns it at runtime ───────────────────────────
	'--dsw-specific-menu': {
		disposition: 'computed',
		anchor: 'POPUP_TOKENS',
		reason: 'the plugin recomputes it on every publish from the skin\'s own canvas and the popup-opacity slider; a static skin value would be overwritten immediately'
	},

	// ── derived: the host derives it from a base we do or do not ship ─────
	'--dsw-alias-tooltip-key-bg': {
		disposition: 'derived',
		base: '--dsw-alias-tooltip-bg',
		reason: 'color-mix of the host tooltip background; follows it'
	},
	'--dsw-alias-label-shimmer': {
		disposition: 'derived',
		base: '--dsw-static-neutral-1000',
		reason: 'shimmer ink mixed from the host static neutral ramp — the statics are host-only values we do not (and should not) re-declare'
	},
	'--dsw-alias-label-deep-diving': {
		disposition: 'derived',
		base: '--dsw-static-deepseek-500',
		reason: 'the "deep diving" label ramp is a host static brand gradient, not a skin surface'
	},
	'--dsw-alias-label-deep-diving-shimmer': {
		disposition: 'derived',
		base: '--dsw-static-deepseek-500',
		reason: 'shimmer variant of the same host static ramp'
	},
	'--dsw-alias-onboarding-card-fill': {
		disposition: 'derived',
		base: '--dsw-static-neutral-bluish-00',
		reason: 'mixed from host statics; also covered by the onboarding exemption below'
	},
	'--dsw-alias-onboarding-checkbox-border': {
		disposition: 'derived',
		base: '--dsw-static-neutral-bluish-1000',
		reason: 'mixed from host statics; also covered by the onboarding exemption below'
	},
	'--dsw-alias-bg-document-selection': {
		disposition: 'derived',
		base: '--dsw-static-blue-500',
		reason: 'the document-preview text selection tint mixed from a host static blue'
	},

	// ── not-skinned: deliberately the host's ──────────────────────────────
	'--dsw-alias-bg-mask-1': {
		disposition: 'not-skinned',
		reason: 'the modal dimming mask. It is the host saying "the page behind this dialog is inert" — a dimming layer whose opacity tracks the skin would weaken a readability guarantee the skin is supposed to keep, and its two values are the light/dark halves of one host decision'
	},
	'--dsw-alias-border-inverted': {
		disposition: 'not-skinned',
		reason: 'an INVERTED edge (`#0000` / white wash) used on top of already-inverted surfaces; a skin that re-colours it stops it being the inverse of anything'
	},
	'--dsw-alias-brand-primary-new-colorprimary-new-color': {
		disposition: 'not-skinned',
		reason: 'the token NAME is malformed in the host itself (`new-colorprimary-new-color` is a concatenation accident) and its value (#4176e6) differs from the brand blue. Following it would mean following a bug; the skins define `--dsw-alias-brand-primary`, which is what the host reads everywhere else'
	},
	'--dsw-alias-onboarding-accent': {
		disposition: 'not-skinned',
		reason: 'first-run onboarding is a one-shot host flow carrying the HOST\'s brand gradients; re-tinting it per skin makes the product\'s own first impression skin-dependent'
	},
	'--dsw-alias-onboarding-secondary-fill': {
		disposition: 'not-skinned',
		reason: 'same onboarding exemption'
	},
	'--dsw-gradient-onboarding-blue-stops': {
		disposition: 'not-skinned',
		reason: 'same onboarding exemption — a brand gradient stop list, not a skin surface'
	},
	'--dsw-gradient-onboarding-cyan-stops': {
		disposition: 'not-skinned',
		reason: 'same onboarding exemption'
	},
	'--dsw-gradient-onboarding-violet-stops': {
		disposition: 'not-skinned',
		reason: 'same onboarding exemption'
	}
};

/** The four legal dispositions. Anything else is a typo, not a policy. */
const DISPOSITION_KINDS = ['cover', 'computed', 'derived', 'not-skinned'];

module.exports = { DISPOSITIONS, DISPOSITION_KINDS };
