// dsh-dream-skin — browser half (client plugin bundle).
//
// Loaded by dsh-client-modules at /plugins/dsh-dream-skin/client.js and
// executed through the vendored cordis Loader's lazy-CJS module table
// (window.__ModuleLoader__.load). The factory body is plain CJS with
// require() resolved against the shell's module table — the same shape the
// shipped ui-* packages' tsdown bundles emit. Only platform seed words and
// registered client bundles may be required.
//
// Persistence note: the skin choice and wallpaper settings are stored in
// localStorage. DSH's Host settings wire only exposes an allowlisted set of
// namespaces to browser clients (dsh-host-apiproxy's WEB_SETTINGS_NAMESPACES),
// so a third-party namespace would answer `settings-not-exposed`; the product
// itself keeps remote browser preferences process-local, and localStorage
// matches that boundary for visual preferences while surviving reloads on the
// same origin.

window.__ModuleLoader__.load({
	id: "dsh-dream-skin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		/**
		 * Key of the machine-readable diagnostics snapshot published on `window`
		 * (see `publishStatus`). Read-only mirror for host/desktop tooling — it
		 * never affects rendering, and no data leaves the page (no telemetry).
		 */
		const STATUS_GLOBAL_KEY = "__DSH_DREAM_SKIN_STATUS__";
		/**
		 * Where the settings-nav icon hook (the IIFE at the very end of this file, which
		 * lives OUTSIDE this module's scope) publishes its self-check so the diagnostics
		 * snapshot can carry it. Read-only for the plugin.
		 */
		const NAV_STATUS_KEY = "__DSH_DREAM_SKIN_NAV__";
		/**
		 * Build reported in diagnostics. Must be bumped together with
		 * package.json `version` at release time (docs/publishing-to-npm.md
		 * checklist) — a stale value here misleads drift reports, so the
		 * release doc owns this line.
		 */
		const PLUGIN_BUILD = "10.9.1";
		// ── Platform seed resolution (defensive — blue-team R3/R4) ─────────────
		// The host does NOT isolate loader-entry factories: one throwing factory
		// aggregates into `entries did not activate` and takes the whole web
		// shell down ("Failed to load plugins" — the exact issue #43 blast
		// radius). So every platform seed is resolved inside a try. Seeds are
		// probed in candidate order and success is detected by the require
		// RETURNING — never by matching host-internal error wording (the old
		// `includes("missed the module table")` substring was an implementation
		// detail, not a contract — R4). On total failure the factory returns a
		// DUMB MODULE (no-op apply, empty surfaces): the plugin goes invisible
		// with one console warning instead of breaking DSH for every user. A
		// future seed rename can therefore never white-screen the host.
		const seedProbe = { lastError: null };
		const requireSeed = (name) => {
			try {
				return require(name);
			} catch (err) {
				seedProbe.lastError = err;
				return null;
			}
		};
		let react_jsx_runtime = requireSeed("react/jsx-runtime");
		let _react = requireSeed("react");
		// Settings-store factory host module (`defineStore`). One build must load
		// on both host generations: DSH master (post-0.1.2-alpha.1) split the old
		// `dsh-client-runtime` into `dsh-client-modules` / `dsh-client-store` /
		// `dsh-client-locale` and froze the platform module table to the new seed
		// names, while stable releases (≤ 0.1.1-rc.x) only provide
		// `@deepseek-ai/dsh-client-runtime/client` (issue #41 fixed master but
		// broke stable — issue #43). Master seed first, stable seed second.
		let _runtime_client = null;
		for (const seed of ["@deepseek-ai/dsh-client-store", "@deepseek-ai/dsh-client-runtime/client"]) {
			_runtime_client = requireSeed(seed);
			if (_runtime_client !== null) break;
		}
		if (react_jsx_runtime === null || _react === null || _runtime_client === null) {
			// A required platform seed is missing or broken on this host.
			// Degrade to "invisible but harmless": export a no-op surface so the
			// shell boots clean; keep the original error chain in the warning.
			const last = seedProbe.lastError;
			try {
				console.warn("[dsh-dream-skin] required host modules unavailable — plugin disabled for this session:", last && last.message);
			} catch {}
			exports.SETTINGS_NS = "settings.dreamSkin";
			exports.SKINS = [];
			exports.DEFAULT_SKIN = "system";
			exports.apply = () => {};
			exports.inject = [];
			// Publish a diagnostics snapshot even while disabled — this is exactly
			// when host/desktop tooling needs to see that the plugin is present but
			// degraded and why. Written inline (the full `publishStatus` lives below
			// the seed gate and never runs on this path).
			try {
				if (typeof window !== "undefined") {
					window[STATUS_GLOBAL_KEY] = {
						plugin: "dsh-dream-skin",
						build: PLUGIN_BUILD,
						status: "degraded",
						reason: "host-seeds-unavailable",
						lastError: (last && last.message) || null,
						// Same field set as the ready snapshot so consumers never
						// hit undefined members (9.26.1, B-09): values the
						// degraded path cannot know are null.
						shell: null,
						skin: null,
						anchors: null,
						checkedAt: null,
						navIcon: window[NAV_STATUS_KEY] || null,
						publishedAt: Date.now()
					};
				}
			} catch {}
			return module.exports;
		}

		//#region dsh-dream-skin: constants & presets
		/** The settings row's locale namespace. */
		const SETTINGS_NS = "settings.dreamSkin";
		/** localStorage key holding the selected skin id. */
		const STORAGE_KEY = "dsh-dream-skin:skin";
		/** localStorage key holding the wallpaper image (data URL). */
		const WALLPAPER_KEY = "dsh-dream-skin:wallpaper";
		/** localStorage key holding the wallpaper wash opacity (0..1). */
		const WALLPAPER_OPACITY_KEY = "dsh-dream-skin:wallpaper-opacity";
		/** localStorage key holding the wallpaper blur radius (px). */
		const WALLPAPER_BLUR_KEY = "dsh-dream-skin:wallpaper-blur";
		/** localStorage key holding recent wallpaper history (JSON array of {kind,value}). */
		const WALLPAPER_HISTORY_KEY = "dsh-dream-skin:wallpaper-history";
		/** Max wallpaper history entries kept. */
		const WALLPAPER_HISTORY_MAX = 5;
		/** Sentinel meaning "no custom skin — follow the built-in appearance". */
		const DEFAULT_SKIN = "system";
		/** Default wash opacity (0..1) applied to the translucent surfaces. */
		const DEFAULT_WALLPAPER_OPACITY = 0.8;
		/** Default wallpaper blur radius in px. */
		const DEFAULT_WALLPAPER_BLUR = 0;
		/** localStorage key holding the sidebar wash opacity (0..1). */
		const SIDEBAR_OPACITY_KEY = "dsh-dream-skin:sidebar-opacity";
		/** localStorage key: link sidebar opacity to the main-canvas wash. */
		const SIDEBAR_LINK_KEY = "dsh-dream-skin:sidebar-link";
		/**
		 * ONE source of truth for the two sidebar preferences (issue #55 review).
		 * They have two readers with different jobs:
		 *   - `readSidebarOpacity()` / `readSidebarLink()` fall back to these
		 *     numbers when a key is ABSENT (the upgrade path: profiles that
		 *     predate the key, or lost it);
		 *   - `FACTORY_DEFAULTS` seeds the very same numbers on a true first
		 *     install.
		 * The two used to drift apart (reader: opacity 1, link ON; seed: "0.28",
		 * link OFF), so a profile that kept one key but not the other silently
		 * rendered differently depending on which reader answered. A single
		 * table cannot drift.
		 *
		 * opacity 0.28 with the link OFF is the author's shipped look, and it is
		 * deliberately also the upgrade fallback: with the link ON the sidebar
		 * transparency slider is a no-op (`shadeTokens2()` follows the canvas
		 * alpha and ignores SIDEBAR_OPACITY_KEY), which is exactly the "有反馈、
		 * 无效果" report in issue #55 — absence must never resolve to it.
		 */
		const SIDEBAR_DEFAULTS = { opacity: 0.28, link: false };
		/** Default sidebar wash opacity (0..1). */
		const DEFAULT_SIDEBAR_OPACITY = SIDEBAR_DEFAULTS.opacity;
		/** Default link flag (1 = follow the canvas wash, 0 = own slider). */
		const DEFAULT_SIDEBAR_LINK = SIDEBAR_DEFAULTS.link ? 1 : 0;
		/** localStorage key holding the popup / option-card fill opacity (0..1). */
		const MODAL_OPACITY_KEY = "dsh-dream-skin:modal-opacity";
		/** Default fill opacity for popups & the user-options card (kept readable). */
		const DEFAULT_MODAL_OPACITY = 0.94;
		/** CSS variable carrying the current popup fill weight (a percentage). */
		const MODAL_FILL_VAR = "--dsh-dream-skin-modal-fill";
		/** localStorage key holding the composer (chat input) fill opacity (0..1). */
		const COMPOSER_OPACITY_KEY = "dsh-dream-skin:composer-opacity";
		/** Default composer fill opacity — readable, yet visibly glassy. */
		const DEFAULT_COMPOSER_OPACITY = 0.85;
		/** CSS variable carrying the composer fill weight (a percentage). */
		const COMPOSER_FILL_VAR = "--dsh-dream-skin-composer-fill";
		/**
		 * CSS variable carrying the live glass blur radius (px) for every
		 * backdrop-filter surface (composer card). Fed by the same 壁纸模糊
		 * slider, so ONE blur knob drives the whole material (user review
		 * round 2: sliders must not fight each other).
		 */
		const GLASS_BLUR_VAR = "--dsh-dream-skin-glass-blur";
		/**
		 * Live glass CHARACTER var (round-5): the material chip's personality —
		 * a ready-to-use `saturate() brightness()` filter tail. The chip sets
		 * it; the blur NUMBER stays owned by the 壁纸模糊 slider (GLASS_BLUR_VAR).
		 */
		const GLASS_TONE_VAR = "--dsh-dream-skin-glass-tone";
		/**
		 * Live glass TINT var (round-8): the glass FILL color. Frosted keeps the
		 * skin base color (tinted frost); liquid uses NEUTRAL WHITE — the Apple
		 * "clear glass" read. Without this the liquid glass mixed the warm skin
		 * base (nebula's violet) at high saturation and read as TEA-COLORED.
		 */
		const GLASS_TINT_VAR = "--dsh-dream-skin-glass-tint";
		/**
		 * Round-17: liquid glass thickness (px of extra backdrop blur). The
		 * composer slider drives it (0 → 0px, max → +24px) — "more opaque =
		 * thicker glass", the one refraction expression Chromium can actually
		 * render. Consumed only by the liquid ::before rule.
		 */
		const LIQUID_THICKNESS_VAR = "--dsh-dream-skin-liquid-thickness";
		/**
		 * The four LIQUID-GLASS CRAFT constants — rim, glint sweep, its blend
		 * mode, and the card edge.
		 *
		 * These used to be literal `rgba(255,255,255,…)` in the sheet, which
		 * means they were authored for ONE scheme and merely tolerated by the
		 * other: white-on-paper has ~1.03:1 contrast, so on `ivory` / `mist` /
		 * `rose` the rim simply vanished and `mix-blend-mode: screen` washed the
		 * whole pane brighter instead of catching light. A material is not a
		 * colour, it is a behaviour — so each constant is now declared twice,
		 * once per scheme, and the sheet only ever reads the variable.
		 *
		 * Declaration order matters: the dark values sit on bare `html` (the
		 * fallback), and the light values override on
		 * `html[data-dsh-dream-skin-scheme="light"]` — an attribute WE stamp,
		 * not the host's `body[data-ds-dark-theme]`.
		 *
		 * Round-18 (issue #80): the override used to hang off
		 * `body:not([data-ds-dark-theme])`, which was wrong three ways.
		 *  1. The fallback ran the wrong direction. With the attribute ABSENT
		 *     — which is what "the host stopped stamping it" looks like — the
		 *     `:not()` matched, so a dark skin got the LIGHT set (rim 0.55 /
		 *     0.70, sheen 0.55, blend `normal`) over a dark canvas. The old
		 *     comment here claimed the opposite. `html` is now the deliberate
		 *     dark fallback, so "unknown scheme" degrades to what dark users
		 *     have today.
		 *  2. The absent window was not just the first frame. The host's theme
		 *     presenter writes/erases `data-ds-dark-theme` on <body> and its
		 *     dispose() removes the attribute, so every theme-layer remount
		 *     reopened the window.
		 *  3. We never needed the host's channel: this plugin already stamps its
		 *     own root attributes (see `data-dsh-material`) and knows every
		 *     skin's `colorScheme`. The attribute is now written by
		 *     applySchemeAttr() in the SAME TICK as this stylesheet is
		 *     injected, and re-written on every theme/change.
		 */
		const GLASS_RIM_VAR = "--dsh-dream-skin-glass-rim";
		const GLASS_SHEEN_VAR = "--dsh-dream-skin-glass-sheen";
		const GLASS_SHEEN_BLEND_VAR = "--dsh-dream-skin-glass-sheen-blend";
		const GLASS_EDGE_VAR = "--dsh-dream-skin-glass-edge";
		/**
		 * Root attribute naming the scheme OUR craft constants are published
		 * for. See the GLASS_* note above for why it is ours and not the
		 * host's `body[data-ds-dark-theme]`.
		 */
		const SCHEME_ATTR = "data-dsh-dream-skin-scheme";
		const SCHEME_LIGHT = "light";
		const SCHEME_DARK = "dark";
		/** Fallback blur when nothing was persisted yet (frosted default). */
		const DEFAULT_GLASS_BLUR = 14;
		/** localStorage key holding the chosen glass material preset id. */
		const MATERIAL_PRESET_KEY = "dsh-dream-skin:material-preset";
		/** One-shot marker: factory defaults were already applied at first boot. */
		const FACTORY_APPLIED_KEY = "dsh-dream-skin:factory-applied";
		/**
		 * Persistent provenance snapshot (blue-team T1): a JSON map of every key
		 * the factory seeding wrote, with the value it seeded. Unlike the
		 * session-scoped factorySealed set this SURVIVES page reloads, so a
		 * same-origin reload (where applyFactoryDefaults early-returns and no
		 * factory write runs) can still tell "still the untouched factory
		 * value" from "the user changed this". Never pushed to the host file.
		 */
		const FACTORY_SNAPSHOT_KEY = "dsh-dream-skin:factory-seeded";
		/** Default material preset: frosted (毛玻璃) ships as the out-of-box look. */
		const DEFAULT_MATERIAL_PRESET = "frosted";
		/**
		 * Glass material presets (round-5): STYLE-ONLY choices. Each carries the
		 * material's glass CHARACTER as a backdrop filter tail (saturate/brighten)
		 * — no slider numbers anymore, so clicking a chip can never move any
		 * slider value (user decision). Exactly TWO materials:
		 *  - frosted (毛玻璃, the DEFAULT): milky frost — stronger saturation lift
		 *    + a slight brightness lift, the classic "frosted glass" read;
		 *  - liquid (液态玻璃): clearer and more glassy — higher saturation for
		 *    vivid refraction, no brightness lift so it stays truer to the
		 *    wallpaper behind.
		 * There is deliberately NO third "default/none" material: frosted IS the
		 * default. Legacy stored "default" ids from earlier builds read back as
		 * frosted. Popup (弹窗) opacity is intentionally untouched — it governs
		 * menu readability, not the glass material.
		 */
		const MATERIAL_PRESETS = [
			{
				id: "frosted", tone: "saturate(1.6) brightness(1.08)",
				// Tinted frost: fills with the skin base color (existing look).
				tint: "var(--dsh-dream-skin-composer-base, var(--dsw-alias-bg-base))",
				// Full slider weight — the tinted frost needs it for readability.
				fillScale: 1,
				// Full blur radius — frosted IS the thick glass.
				blurScale: 1,
				// Swatch = a REAL glass lens over a striped backdrop (round-9):
				// the backdrop stays sharp (it IS the "wallpaper"); the LENS on top
				// is an actual backdrop-filter pane you see the stripes THROUGH —
				// exactly how the real composer glass works.
				// frosted: thick milk — heavy blur, milky fill, soft rim.
				swatch: { blur: 5, filter: "saturate(1.3) brightness(1.12)", fill: "rgba(255,255,255,0.38)", rim: "rgba(255,255,255,0.35)", sheen: false }
			},
			{
				id: "liquid",
				// Apple recipe (WebTricks): low blur + HIGH saturation + a bare
				// brightness nudge. Round-8 (user): a gentle tone let the skin's
				// warm base read TEA-colored on the composer glass; the higher
				// saturation keeps the refraction vivid without coloring it.
				// (Blue-team B5: this object previously carried a duplicate `tone`
				// key — the earlier value silently lost to this one.)
				tone: "saturate(1.8) brightness(1.02) contrast(1.04)",
				// Fill color follows the skin base (issue #67 follow-up): the
				// neutral WHITE above was designed for the 15% fill cap, where a
				// breath of white reads as Apple "clear glass". Once the slider's
				// solid end is allowed to truly reach 100% (see applyComposerOpacity),
				// a white fill boards up as PURE WHITE — and on dark skins the
				// LIGHT input text turns invisible on it. The skin base keeps
				// dark-fill-on-dark-skins / light-fill-on-light-skins at every
				// weight, scheme-aware at use time; the liquid glass READ still
				// comes from the tone + sheen layers below, never the fill.
				tint: "var(--dsh-dream-skin-composer-base, var(--dsw-alias-bg-base))",
				// The floor for the fill-remap in applyComposerOpacity(): liquid
				// keeps a 15% clear-glass fill at the TRANSPARENT end of the slider
				// while the solid end now reaches 100%. No longer a hard cap — the
				// CSS multiply is gone (see the ::before fill rule).
				fillScale: 0.15,
				// THIN glass (round-10): liquid only gets a quarter of the blur
				// radius — heavy blur is what made it read as white FROSTED glass.
				// Refraction needs the backdrop mostly sharp underneath.
				// Scaling happens EXACTLY ONCE, in applyMaterialBlur() (blue-team
				// B3: the CSS rule used to multiply by 0.25 a second time).
				blurScale: 0.25,
				// liquid: CLEAR glass — minimal blur, vivid backdrop, thin bright
				// rim + a diagonal sheen (Apple's "thick lit pane" read).
				swatch: { blur: 1.5, filter: "saturate(1.9) brightness(1.06)", fill: "rgba(255,255,255,0.10)", rim: "rgba(255,255,255,0.5)", sheen: true }
			}
		];
		/**
		 * localStorage key holding the last user-committed concrete built-in theme
		 * preference (`light` or `dark`). DSH's own `ui-theme.preference` scope is
		 * only persisted in the host settings file for LOOPBACK browsers; a remote
		 * browser (e.g. served over HTTP) keeps it process-local, so a client
		 * reload / connection reset — such as switching the agent preset — resets a
		 * built-in `dark`/`light` choice back to the `system` default. We keep our
		 * own copy of the last concrete built-in preference here (surviving through
		 * the same 3-layer storage) and re-apply it when a reload falls back to
		 * `system`, mirroring the third-party skin restore. Absent when the user
		 * never left `system` or explicitly chose it.
		 */
		const BUILTIN_LAST_KEY = "dsh-dream-skin:builtin-last";
		/** Built-in base colors used when no skin token owns a scheme. */
		const BUILTIN_BASE = {
			light: "rgb(255, 255, 255)",
			dark: "rgb(21, 21, 23)"
		};

		/**
		 * The curated "Mirage" skin catalog. Every skin is a third-party theme
		 * for the built-in ThemeRuntime: an id, the base palette it builds on
		 * (colorScheme drives body[data-ds-dark-theme]), and --dsw-alias-*
		 * overrides applied as inline custom properties on <body> by ui-layout's
		 * ThemePresenter. Values are concrete CSS colors (no var() indirection),
		 * tuned per skin for contrast on both surface and text roles. Add your
		 * own entries here and they appear in the Settings picker automatically.
		 *
		 * GENERATED — do not hand-edit the values below.
		 *
		 * The eight presets are emitted by the design system in
		 * `scripts/skin-system.cjs`: one OKLCH hue axis per skin, one accent,
		 * an eight-step perceptual elevation ladder, and text levels SOLVED
		 * against every surface they can land on (see `scripts/skin-audit.cjs`,
		 * which fails the build when a skin regresses). Hand-tuned hex is how
		 * the old presets ended up with a tertiary label that cleared AA on the
		 * canvas but not on a message bubble, so the authoring loop now runs
		 * through the system instead of around it.
		 *
		 * Regenerate after editing the system:
		 *   node scripts/apply-skin-system.cjs
		 *
		 * Two extra fields ride along on each skin:
		 *   - `glow`: the skin's diffused-light background (also the suggested
		 *     gradient wallpaper) — one key light, one bounce, an ambient lift
		 *     and a vignette, so every preset is lit from the same direction.
		 *   - `defaults`: the authored slider/material numbers for that skin
		 *     (wash strength, glass weight, dialog opacity…). Applied on skin
		 *     switch, but only to keys the user has not made their own — see
		 *     `applySkinDefaults()`.
		 */
		const SKINS = [
			{
				id: "abyss",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#111317",
					"--dsw-alias-bg-layer-1": "#1a1c21",
					"--dsw-alias-bg-layer-2": "rgba(42, 44, 50, 0.92)",
					"--dsw-alias-bg-layer-3": "#212429",
					"--dsw-alias-bg-module-platform": "#14161a",
					"--dsw-alias-bg-overlay": "rgba(42, 44, 50, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.03)",
					"--dsw-menu-surface-fill": "rgba(39, 42, 48, 0.46)",
					"--dsw-alias-menu-group-header-fill": "rgba(39, 42, 48, 0.94)",
					"--dsw-alias-label-primary": "#edf0f7",
					"--dsw-alias-label-secondary": "#bec1c7",
					"--dsw-alias-label-tertiary": "#a1a4aa",
					"--dsw-alias-brand-primary": "#a093fb",
					"--dsw-alias-brand-primary-soft": "rgba(160, 147, 251, 0.12)",
					"--dsw-alias-brand-text": "#0d0f14",
					"--dsw-alias-button-primary-fill": "#a093fb",
					"--dsw-alias-button-primary-hover": "#b6aeff",
					"--dsw-alias-button-primary-dimmed": "rgba(160, 147, 251, 0.16)",
					"--dsw-alias-button-elevated-fill": "#1a1c21",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.062)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.098)",
					"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.142)",
					"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.196)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.078)",
					"--dsw-alias-interactive-bg-hover": "rgba(160, 147, 251, 0.15)",
					"--dsw-alias-interactive-bg-active": "rgba(160, 147, 251, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(239, 103, 92, 0.2)",
					"--dsw-focus-ring-color": "#a093fb",
					"--dsw-alias-button-tool-bar-fill": "rgba(255, 255, 255, 0.075)",
					"--dsw-alias-button-tool-bar-hover": "rgba(255, 255, 255, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(1, 2, 4, 0.72)",
					"--dsw-alias-file-diff-added-bg": "rgba(110, 216, 137, 0.115)",
					"--dsw-alias-file-diff-added-gutter": "rgba(110, 216, 137, 0.165)",
					"--dsw-alias-file-diff-added-marker": "#6ed889",
					"--dsw-alias-file-diff-deleted-bg": "rgba(239, 103, 92, 0.115)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(239, 103, 92, 0.165)",
					"--dsw-alias-file-diff-deleted-marker": "#ef675c",
					"--dsw-alias-state-business-primary": "#a093fb",
					"--dsw-alias-state-business-tertiary": "rgba(160, 147, 251, 0.12)",
					"--dsw-alias-state-success-primary": "#6ed889",
					"--dsw-alias-state-warn-primary": "#fac053",
					"--dsw-alias-state-error-primary": "#ef675c",
					"--dsw-alias-markdown-code-block": "rgba(1, 2, 4, 0.42)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-markdown-tag": "rgba(160, 147, 251, 0.18)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.09)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.14)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)",
					"--dsw-specific-sidebar-fill": "#0f1114",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.05)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.075)",
					"--dsw-specific-tip": "rgba(37, 39, 44, 0.94)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.09)",
					"--dsw-specific-bubble": "rgba(31, 33, 38, 0.92)",
					"--dsw-specific-bubble-highlight": "rgba(160, 147, 251, 0.16)"
				},
				glow: "radial-gradient(1180px 720px at 76% -14%, rgba(143, 131, 224, 0.32), transparent 64%), radial-gradient(900px 620px at 6% 108%, rgba(48, 138, 179, 0.2), transparent 60%), radial-gradient(1500px 950px at 50% 32%, rgba(34, 36, 41, 0.55), transparent 74%), radial-gradient(1400px 1000px at 50% 54%, transparent 44%, rgba(2, 2, 3, 0.42) 100%), linear-gradient(163deg, #15171b 0%, #0d0f13 55%, #121418 100%)",
				defaults: {
					wallpaperOpacity: 0.22,
					wallpaperBlur: 4,
					sidebarOpacity: 0.28,
					composerOpacity: 0.5,
					modalOpacity: 0.92,
					material: "frosted",
					autodim: true
				}
			},
			{
				id: "aurora",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#0f1415",
					"--dsw-alias-bg-layer-1": "#181e1f",
					"--dsw-alias-bg-layer-2": "rgba(39, 47, 47, 0.92)",
					"--dsw-alias-bg-layer-3": "#1f2627",
					"--dsw-alias-bg-module-platform": "#121818",
					"--dsw-alias-bg-overlay": "rgba(39, 47, 47, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.03)",
					"--dsw-menu-surface-fill": "rgba(37, 44, 45, 0.46)",
					"--dsw-alias-menu-group-header-fill": "rgba(37, 44, 45, 0.94)",
					"--dsw-alias-label-primary": "#eaf2f3",
					"--dsw-alias-label-secondary": "#bbc3c3",
					"--dsw-alias-label-tertiary": "#9ea6a6",
					"--dsw-alias-brand-primary": "#00bbc5",
					"--dsw-alias-brand-primary-soft": "rgba(0, 187, 197, 0.12)",
					"--dsw-alias-brand-text": "#0a1111",
					"--dsw-alias-button-primary-fill": "#00bbc5",
					"--dsw-alias-button-primary-hover": "#42d1db",
					"--dsw-alias-button-primary-dimmed": "rgba(0, 187, 197, 0.16)",
					"--dsw-alias-button-elevated-fill": "#181e1f",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.062)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.098)",
					"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.142)",
					"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.196)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.078)",
					"--dsw-alias-interactive-bg-hover": "rgba(0, 187, 197, 0.15)",
					"--dsw-alias-interactive-bg-active": "rgba(0, 187, 197, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(239, 103, 92, 0.2)",
					"--dsw-focus-ring-color": "#00bbc5",
					"--dsw-alias-button-tool-bar-fill": "rgba(255, 255, 255, 0.075)",
					"--dsw-alias-button-tool-bar-hover": "rgba(255, 255, 255, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(1, 3, 3, 0.72)",
					"--dsw-alias-file-diff-added-bg": "rgba(110, 216, 137, 0.115)",
					"--dsw-alias-file-diff-added-gutter": "rgba(110, 216, 137, 0.165)",
					"--dsw-alias-file-diff-added-marker": "#6ed889",
					"--dsw-alias-file-diff-deleted-bg": "rgba(239, 103, 92, 0.115)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(239, 103, 92, 0.165)",
					"--dsw-alias-file-diff-deleted-marker": "#ef675c",
					"--dsw-alias-state-business-primary": "#00bbc5",
					"--dsw-alias-state-business-tertiary": "rgba(0, 187, 197, 0.12)",
					"--dsw-alias-state-success-primary": "#6ed889",
					"--dsw-alias-state-warn-primary": "#fac053",
					"--dsw-alias-state-error-primary": "#ef675c",
					"--dsw-alias-markdown-code-block": "rgba(1, 3, 3, 0.42)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-markdown-tag": "rgba(0, 187, 197, 0.18)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.09)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.14)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)",
					"--dsw-specific-sidebar-fill": "#0d1213",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.05)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.075)",
					"--dsw-specific-tip": "rgba(35, 41, 42, 0.94)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.09)",
					"--dsw-specific-bubble": "rgba(29, 36, 36, 0.92)",
					"--dsw-specific-bubble-highlight": "rgba(0, 187, 197, 0.16)"
				},
				glow: "radial-gradient(1180px 720px at 76% -14%, rgba(0, 166, 175, 0.32), transparent 64%), radial-gradient(900px 620px at 6% 108%, rgba(86, 132, 179, 0.2), transparent 60%), radial-gradient(1500px 950px at 50% 32%, rgba(32, 38, 39, 0.55), transparent 74%), radial-gradient(1400px 1000px at 50% 54%, transparent 44%, rgba(1, 3, 3, 0.42) 100%), linear-gradient(163deg, #13191a 0%, #0c1111 55%, #101516 100%)",
				defaults: {
					wallpaperOpacity: 0.24,
					wallpaperBlur: 5,
					sidebarOpacity: 0.3,
					composerOpacity: 0.48,
					modalOpacity: 0.92,
					material: "frosted",
					autodim: true
				}
			},
			{
				id: "nebula",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#131116",
					"--dsw-alias-bg-layer-1": "#1d1b20",
					"--dsw-alias-bg-layer-2": "rgba(45, 43, 49, 0.92)",
					"--dsw-alias-bg-layer-3": "#242228",
					"--dsw-alias-bg-module-platform": "#161419",
					"--dsw-alias-bg-overlay": "rgba(45, 43, 49, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.03)",
					"--dsw-menu-surface-fill": "rgba(43, 40, 46, 0.46)",
					"--dsw-alias-menu-group-header-fill": "rgba(43, 40, 46, 0.94)",
					"--dsw-alias-label-primary": "#f1eff6",
					"--dsw-alias-label-secondary": "#c2bfc7",
					"--dsw-alias-label-tertiary": "#a5a2a9",
					"--dsw-alias-brand-primary": "#b48df5",
					"--dsw-alias-brand-primary-soft": "rgba(180, 141, 245, 0.12)",
					"--dsw-alias-brand-text": "#100e14",
					"--dsw-alias-button-primary-fill": "#b48df5",
					"--dsw-alias-button-primary-hover": "#c7a9ff",
					"--dsw-alias-button-primary-dimmed": "rgba(180, 141, 245, 0.16)",
					"--dsw-alias-button-elevated-fill": "#1d1b20",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.062)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.098)",
					"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.142)",
					"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.196)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.078)",
					"--dsw-alias-interactive-bg-hover": "rgba(180, 141, 245, 0.15)",
					"--dsw-alias-interactive-bg-active": "rgba(180, 141, 245, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(239, 103, 92, 0.2)",
					"--dsw-focus-ring-color": "#b48df5",
					"--dsw-alias-button-tool-bar-fill": "rgba(255, 255, 255, 0.075)",
					"--dsw-alias-button-tool-bar-hover": "rgba(255, 255, 255, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(2, 2, 3, 0.72)",
					"--dsw-alias-file-diff-added-bg": "rgba(110, 216, 137, 0.115)",
					"--dsw-alias-file-diff-added-gutter": "rgba(110, 216, 137, 0.165)",
					"--dsw-alias-file-diff-added-marker": "#6ed889",
					"--dsw-alias-file-diff-deleted-bg": "rgba(239, 103, 92, 0.115)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(239, 103, 92, 0.165)",
					"--dsw-alias-file-diff-deleted-marker": "#ef675c",
					"--dsw-alias-state-business-primary": "#b48df5",
					"--dsw-alias-state-business-tertiary": "rgba(180, 141, 245, 0.12)",
					"--dsw-alias-state-success-primary": "#6ed889",
					"--dsw-alias-state-warn-primary": "#fac053",
					"--dsw-alias-state-error-primary": "#ef675c",
					"--dsw-alias-markdown-code-block": "rgba(2, 2, 3, 0.42)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-markdown-tag": "rgba(180, 141, 245, 0.18)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.09)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.14)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)",
					"--dsw-specific-sidebar-fill": "#110f14",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.05)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.075)",
					"--dsw-specific-tip": "rgba(40, 37, 43, 0.94)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.09)",
					"--dsw-specific-bubble": "rgba(34, 32, 37, 0.92)",
					"--dsw-specific-bubble-highlight": "rgba(180, 141, 245, 0.16)"
				},
				glow: "radial-gradient(1180px 720px at 76% -14%, rgba(160, 125, 218, 0.32), transparent 64%), radial-gradient(900px 620px at 6% 108%, rgba(93, 128, 191, 0.2), transparent 60%), radial-gradient(1500px 950px at 50% 32%, rgba(36, 34, 40, 0.55), transparent 74%), radial-gradient(1400px 1000px at 50% 54%, transparent 44%, rgba(2, 2, 3, 0.42) 100%), linear-gradient(163deg, #17161b 0%, #0f0e12 55%, #141217 100%)",
				defaults: {
					wallpaperOpacity: 0.26,
					wallpaperBlur: 6,
					sidebarOpacity: 0.3,
					composerOpacity: 0.46,
					modalOpacity: 0.92,
					material: "frosted",
					autodim: true
				}
			},
			{
				id: "ember",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#15110e",
					"--dsw-alias-bg-layer-1": "#1f1b17",
					"--dsw-alias-bg-layer-2": "rgba(48, 43, 38, 0.92)",
					"--dsw-alias-bg-layer-3": "#27221e",
					"--dsw-alias-bg-module-platform": "#181411",
					"--dsw-alias-bg-overlay": "rgba(48, 43, 38, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.03)",
					"--dsw-menu-surface-fill": "rgba(45, 40, 36, 0.46)",
					"--dsw-alias-menu-group-header-fill": "rgba(45, 40, 36, 0.94)",
					"--dsw-alias-label-primary": "#f5efea",
					"--dsw-alias-label-secondary": "#c6c0bb",
					"--dsw-alias-label-tertiary": "#a9a39e",
					"--dsw-alias-brand-primary": "#eb8555",
					"--dsw-alias-brand-primary-soft": "rgba(235, 133, 85, 0.12)",
					"--dsw-alias-brand-text": "#130e0b",
					"--dsw-alias-button-primary-fill": "#eb8555",
					"--dsw-alias-button-primary-hover": "#ff9d71",
					"--dsw-alias-button-primary-dimmed": "rgba(235, 133, 85, 0.16)",
					"--dsw-alias-button-elevated-fill": "#1f1b17",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.062)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.098)",
					"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.142)",
					"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.196)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.078)",
					"--dsw-alias-interactive-bg-hover": "rgba(235, 133, 85, 0.15)",
					"--dsw-alias-interactive-bg-active": "rgba(235, 133, 85, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(230, 101, 158, 0.2)",
					"--dsw-focus-ring-color": "#eb8555",
					"--dsw-alias-button-tool-bar-fill": "rgba(255, 255, 255, 0.075)",
					"--dsw-alias-button-tool-bar-hover": "rgba(255, 255, 255, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(3, 2, 1, 0.72)",
					"--dsw-alias-file-diff-added-bg": "rgba(110, 216, 137, 0.115)",
					"--dsw-alias-file-diff-added-gutter": "rgba(110, 216, 137, 0.165)",
					"--dsw-alias-file-diff-added-marker": "#6ed889",
					"--dsw-alias-file-diff-deleted-bg": "rgba(230, 101, 158, 0.115)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(230, 101, 158, 0.165)",
					"--dsw-alias-file-diff-deleted-marker": "#e6659e",
					"--dsw-alias-state-business-primary": "#eb8555",
					"--dsw-alias-state-business-tertiary": "rgba(235, 133, 85, 0.12)",
					"--dsw-alias-state-success-primary": "#6ed889",
					"--dsw-alias-state-warn-primary": "#e7c952",
					"--dsw-alias-state-error-primary": "#e6659e",
					"--dsw-alias-markdown-code-block": "rgba(3, 2, 1, 0.42)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-markdown-tag": "rgba(235, 133, 85, 0.18)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.09)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.14)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)",
					"--dsw-specific-sidebar-fill": "#130f0c",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.05)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.075)",
					"--dsw-specific-tip": "rgba(42, 38, 33, 0.94)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.09)",
					"--dsw-specific-bubble": "rgba(36, 32, 28, 0.92)",
					"--dsw-specific-bubble-highlight": "rgba(235, 133, 85, 0.16)"
				},
				glow: "radial-gradient(1180px 720px at 76% -14%, rgba(210, 118, 75, 0.32), transparent 64%), radial-gradient(900px 620px at 6% 108%, rgba(179, 103, 104, 0.2), transparent 60%), radial-gradient(1500px 950px at 50% 32%, rgba(39, 34, 30, 0.55), transparent 74%), radial-gradient(1400px 1000px at 50% 54%, transparent 44%, rgba(3, 2, 1, 0.42) 100%), linear-gradient(163deg, #1a1612 0%, #110e0b 55%, #16120f 100%)",
				defaults: {
					wallpaperOpacity: 0.22,
					wallpaperBlur: 4,
					sidebarOpacity: 0.28,
					composerOpacity: 0.5,
					modalOpacity: 0.92,
					material: "frosted",
					autodim: true
				}
			},
			{
				id: "midnight",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#0b0b0c",
					"--dsw-alias-bg-layer-1": "#141415",
					"--dsw-alias-bg-layer-2": "rgba(35, 36, 37, 0.92)",
					"--dsw-alias-bg-layer-3": "#1b1b1c",
					"--dsw-alias-bg-module-platform": "#0e0e0f",
					"--dsw-alias-bg-overlay": "rgba(35, 36, 37, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(255, 255, 255, 0.03)",
					"--dsw-menu-surface-fill": "rgba(33, 34, 35, 0.46)",
					"--dsw-alias-menu-group-header-fill": "rgba(33, 34, 35, 0.94)",
					"--dsw-alias-label-primary": "#eff0f1",
					"--dsw-alias-label-secondary": "#c0c1c2",
					"--dsw-alias-label-tertiary": "#a3a4a5",
					"--dsw-alias-brand-primary": "#889ef6",
					"--dsw-alias-brand-primary-soft": "rgba(136, 158, 246, 0.12)",
					"--dsw-alias-brand-text": "#0f0f10",
					"--dsw-alias-button-primary-fill": "#889ef6",
					"--dsw-alias-button-primary-hover": "#a3b7ff",
					"--dsw-alias-button-primary-dimmed": "rgba(136, 158, 246, 0.16)",
					"--dsw-alias-button-elevated-fill": "#141415",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.062)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.098)",
					"--dsw-alias-border-l3": "rgba(255, 255, 255, 0.142)",
					"--dsw-alias-border-l4": "rgba(255, 255, 255, 0.196)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(255, 255, 255, 0.078)",
					"--dsw-alias-interactive-bg-hover": "rgba(136, 158, 246, 0.15)",
					"--dsw-alias-interactive-bg-active": "rgba(136, 158, 246, 0.24)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(239, 103, 92, 0.2)",
					"--dsw-focus-ring-color": "#889ef6",
					"--dsw-alias-button-tool-bar-fill": "rgba(255, 255, 255, 0.075)",
					"--dsw-alias-button-tool-bar-hover": "rgba(255, 255, 255, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(0, 0, 1, 0.72)",
					"--dsw-alias-file-diff-added-bg": "rgba(110, 216, 137, 0.115)",
					"--dsw-alias-file-diff-added-gutter": "rgba(110, 216, 137, 0.165)",
					"--dsw-alias-file-diff-added-marker": "#6ed889",
					"--dsw-alias-file-diff-deleted-bg": "rgba(239, 103, 92, 0.115)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(239, 103, 92, 0.165)",
					"--dsw-alias-file-diff-deleted-marker": "#ef675c",
					"--dsw-alias-state-business-primary": "#889ef6",
					"--dsw-alias-state-business-tertiary": "rgba(136, 158, 246, 0.12)",
					"--dsw-alias-state-success-primary": "#6ed889",
					"--dsw-alias-state-warn-primary": "#fac053",
					"--dsw-alias-state-error-primary": "#ef675c",
					"--dsw-alias-markdown-code-block": "rgba(0, 0, 1, 0.42)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-markdown-tag": "rgba(136, 158, 246, 0.18)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.09)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.14)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)",
					"--dsw-specific-sidebar-fill": "#09090a",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.05)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.075)",
					"--dsw-specific-tip": "rgba(30, 31, 32, 0.94)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.09)",
					"--dsw-specific-bubble": "rgba(25, 25, 26, 0.92)",
					"--dsw-specific-bubble-highlight": "rgba(136, 158, 246, 0.16)"
				},
				glow: "radial-gradient(1180px 720px at 76% -14%, rgba(121, 141, 219, 0.32), transparent 64%), radial-gradient(900px 620px at 6% 108%, rgba(84, 132, 181, 0.2), transparent 60%), radial-gradient(1500px 950px at 50% 32%, rgba(27, 28, 29, 0.55), transparent 74%), radial-gradient(1400px 1000px at 50% 54%, transparent 44%, rgba(0, 0, 0, 0.42) 100%), linear-gradient(163deg, #0f0f10 0%, #080809 55%, #0c0c0d 100%)",
				defaults: {
					wallpaperOpacity: 0.14,
					wallpaperBlur: 2,
					sidebarOpacity: 0.22,
					composerOpacity: 0.58,
					modalOpacity: 0.94,
					material: "frosted",
					autodim: true
				}
			},
			{
				id: "ivory",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#f3f0e7",
					"--dsw-alias-bg-layer-1": "#f6f2ea",
					"--dsw-alias-bg-layer-2": "rgba(255, 253, 246, 0.94)",
					"--dsw-alias-bg-layer-3": "#fbf7ee",
					"--dsw-alias-bg-module-platform": "#efebe3",
					"--dsw-alias-bg-overlay": "rgba(255, 255, 255, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(14, 13, 10, 0.04)",
					"--dsw-menu-surface-fill": "rgba(255, 252, 244, 0.58)",
					"--dsw-alias-menu-group-header-fill": "rgba(255, 252, 244, 0.94)",
					"--dsw-alias-label-primary": "#272623",
					"--dsw-alias-label-secondary": "#52504d",
					"--dsw-alias-label-tertiary": "#5e5d5a",
					"--dsw-alias-brand-primary": "#1d6cc1",
					"--dsw-alias-brand-primary-soft": "rgba(29, 108, 193, 0.17)",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-fill": "#1d6cc1",
					"--dsw-alias-button-primary-hover": "#0d5cab",
					"--dsw-alias-button-primary-dimmed": "rgba(29, 108, 193, 0.16)",
					"--dsw-alias-button-elevated-fill": "#fbf7ee",
					"--dsw-alias-border-l1": "rgba(14, 13, 10, 0.1)",
					"--dsw-alias-border-l2": "rgba(14, 13, 10, 0.14)",
					"--dsw-alias-border-l3": "rgba(14, 13, 10, 0.185)",
					"--dsw-alias-border-l4": "rgba(14, 13, 10, 0.235)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(14, 13, 10, 0.118)",
					"--dsw-alias-interactive-bg-hover": "rgba(29, 108, 193, 0.1)",
					"--dsw-alias-interactive-bg-active": "rgba(29, 108, 193, 0.17)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(182, 50, 45, 0.13)",
					"--dsw-focus-ring-color": "#1d6cc1",
					"--dsw-alias-button-tool-bar-fill": "rgba(14, 13, 10, 0.072)",
					"--dsw-alias-button-tool-bar-hover": "rgba(14, 13, 10, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(211, 207, 198, 0.6)",
					"--dsw-alias-file-diff-added-bg": "rgba(0, 121, 53, 0.115)",
					"--dsw-alias-file-diff-added-gutter": "rgba(0, 121, 53, 0.165)",
					"--dsw-alias-file-diff-added-marker": "#007935",
					"--dsw-alias-file-diff-deleted-bg": "rgba(182, 50, 45, 0.115)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(182, 50, 45, 0.165)",
					"--dsw-alias-file-diff-deleted-marker": "#b6322d",
					"--dsw-alias-state-business-primary": "#1d6cc1",
					"--dsw-alias-state-business-tertiary": "rgba(29, 108, 193, 0.17)",
					"--dsw-alias-state-success-primary": "#007935",
					"--dsw-alias-state-warn-primary": "#896100",
					"--dsw-alias-state-error-primary": "#b6322d",
					"--dsw-alias-markdown-code-block": "rgba(14, 13, 10, 0.045)",
					"--dsw-alias-markdown-inline-code": "rgba(29, 108, 193, 0.17)",
					"--dsw-alias-markdown-tag": "rgba(29, 108, 193, 0.17)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(14, 13, 10, 0.2)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(14, 13, 10, 0.28)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(14, 13, 10, 0.36)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(14, 13, 10, 0.36)",
					"--dsw-specific-sidebar-fill": "#f1ede5",
					"--dsw-specific-sidebar-nav-item-active": "rgba(14, 13, 10, 0.075)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(14, 13, 10, 0.045)",
					"--dsw-specific-input-major": "#f6f2ea",
					"--dsw-specific-tip": "#fdf9f0",
					"--dsw-specific-selector": "rgba(14, 13, 10, 0.055)",
					"--dsw-specific-bubble": "#f9f5ec",
					"--dsw-specific-bubble-highlight": "rgba(29, 108, 193, 0.1)"
				},
				glow: "radial-gradient(1120px 680px at 78% -12%, rgba(153, 193, 243, 0.3), transparent 62%), radial-gradient(860px 580px at 8% 106%, rgba(232, 184, 167, 0.22), transparent 58%), radial-gradient(1400px 900px at 50% 30%, rgba(255, 255, 255, 0.62), transparent 74%), radial-gradient(1300px 950px at 50% 56%, transparent 46%, rgba(228, 225, 217, 0.4) 100%), linear-gradient(168deg, #f5f2e9 0%, #f0ece4 55%, #f4f0e8 100%)",
				defaults: {
					wallpaperOpacity: 0.12,
					wallpaperBlur: 2,
					sidebarOpacity: 0.18,
					composerOpacity: 0.62,
					modalOpacity: 0.96,
					material: "frosted",
					autodim: true
				}
			},
			{
				id: "mist",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#e3edf4",
					"--dsw-alias-bg-layer-1": "rgba(240, 248, 255, 0.62)",
					"--dsw-alias-bg-layer-2": "rgba(252, 253, 255, 0.94)",
					"--dsw-alias-bg-layer-3": "rgba(248, 252, 255, 0.74)",
					"--dsw-alias-bg-module-platform": "rgba(229, 240, 247, 0.78)",
					"--dsw-alias-bg-overlay": "rgba(255, 255, 255, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(10, 14, 16, 0.04)",
					"--dsw-menu-surface-fill": "rgba(249, 252, 255, 0.58)",
					"--dsw-alias-menu-group-header-fill": "rgba(249, 252, 255, 0.94)",
					"--dsw-alias-label-primary": "#242729",
					"--dsw-alias-label-secondary": "#4f5356",
					"--dsw-alias-label-tertiary": "#5d6164",
					"--dsw-alias-brand-primary": "#006cb5",
					"--dsw-alias-brand-primary-soft": "rgba(0, 108, 181, 0.12)",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-fill": "#006cb5",
					"--dsw-alias-button-primary-hover": "#005c9b",
					"--dsw-alias-button-primary-dimmed": "rgba(0, 108, 181, 0.16)",
					"--dsw-alias-button-elevated-fill": "rgba(248, 252, 255, 0.74)",
					"--dsw-alias-border-l1": "rgba(10, 14, 16, 0.1)",
					"--dsw-alias-border-l2": "rgba(10, 14, 16, 0.14)",
					"--dsw-alias-border-l3": "rgba(10, 14, 16, 0.185)",
					"--dsw-alias-border-l4": "rgba(10, 14, 16, 0.235)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(10, 14, 16, 0.118)",
					"--dsw-alias-interactive-bg-hover": "rgba(0, 108, 181, 0.1)",
					"--dsw-alias-interactive-bg-active": "rgba(0, 108, 181, 0.17)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(182, 50, 45, 0.13)",
					"--dsw-focus-ring-color": "#006cb5",
					"--dsw-alias-button-tool-bar-fill": "rgba(10, 14, 16, 0.072)",
					"--dsw-alias-button-tool-bar-hover": "rgba(10, 14, 16, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(194, 204, 211, 0.6)",
					"--dsw-alias-file-diff-added-bg": "rgba(0, 117, 51, 0.195)",
					"--dsw-alias-file-diff-added-gutter": "rgba(0, 117, 51, 0.245)",
					"--dsw-alias-file-diff-added-marker": "#007533",
					"--dsw-alias-file-diff-deleted-bg": "rgba(182, 50, 45, 0.185)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(182, 50, 45, 0.235)",
					"--dsw-alias-file-diff-deleted-marker": "#b6322d",
					"--dsw-alias-state-business-primary": "#006cb5",
					"--dsw-alias-state-business-tertiary": "rgba(0, 108, 181, 0.12)",
					"--dsw-alias-state-success-primary": "#007533",
					"--dsw-alias-state-warn-primary": "#855e00",
					"--dsw-alias-state-error-primary": "#b6322d",
					"--dsw-alias-markdown-code-block": "rgba(10, 14, 16, 0.045)",
					"--dsw-alias-markdown-inline-code": "rgba(0, 108, 181, 0.1)",
					"--dsw-alias-markdown-tag": "rgba(0, 108, 181, 0.12)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(10, 14, 16, 0.2)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(10, 14, 16, 0.28)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(10, 14, 16, 0.36)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(10, 14, 16, 0.36)",
					"--dsw-specific-sidebar-fill": "rgba(235, 245, 253, 0.55)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.72)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.4)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.72)",
					"--dsw-specific-tip": "rgba(246, 251, 255, 0.96)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.72)",
					"--dsw-specific-bubble": "rgba(242, 250, 255, 0.72)",
					"--dsw-specific-bubble-highlight": "rgba(0, 108, 181, 0.1)"
				},
				glow: "radial-gradient(1120px 680px at 78% -12%, rgba(147, 195, 241, 0.3), transparent 62%), radial-gradient(860px 580px at 8% 106%, rgba(150, 209, 209, 0.22), transparent 58%), radial-gradient(1400px 900px at 50% 30%, rgba(255, 255, 255, 0.62), transparent 74%), radial-gradient(1300px 950px at 50% 56%, transparent 46%, rgba(212, 222, 229, 0.4) 100%), linear-gradient(168deg, #e5eff6 0%, #e0e9f1 55%, #e3edf5 100%)",
				defaults: {
					wallpaperOpacity: 0.3,
					wallpaperBlur: 8,
					sidebarOpacity: 0.34,
					composerOpacity: 0.36,
					modalOpacity: 0.9,
					material: "liquid",
					autodim: true
				}
			},
			{
				id: "rose",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#f8eced",
					"--dsw-alias-bg-layer-1": "#fbeeef",
					"--dsw-alias-bg-layer-2": "rgba(255, 251, 251, 0.94)",
					"--dsw-alias-bg-layer-3": "#fff3f4",
					"--dsw-alias-bg-module-platform": "#f3e7e8",
					"--dsw-alias-bg-overlay": "rgba(255, 255, 255, 0.92)",
					"--dsw-alias-bg-skeleton": "rgba(16, 12, 12, 0.04)",
					"--dsw-menu-surface-fill": "rgba(255, 250, 250, 0.58)",
					"--dsw-alias-menu-group-header-fill": "rgba(255, 250, 250, 0.94)",
					"--dsw-alias-label-primary": "#292526",
					"--dsw-alias-label-secondary": "#565151",
					"--dsw-alias-label-tertiary": "#666162",
					"--dsw-alias-brand-primary": "#a74693",
					"--dsw-alias-brand-primary-soft": "rgba(167, 70, 147, 0.12)",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-fill": "#a74693",
					"--dsw-alias-button-primary-hover": "#933881",
					"--dsw-alias-button-primary-dimmed": "rgba(167, 70, 147, 0.16)",
					"--dsw-alias-button-elevated-fill": "#fff3f4",
					"--dsw-alias-border-l1": "rgba(16, 12, 12, 0.1)",
					"--dsw-alias-border-l2": "rgba(16, 12, 12, 0.14)",
					"--dsw-alias-border-l3": "rgba(16, 12, 12, 0.185)",
					"--dsw-alias-border-l4": "rgba(16, 12, 12, 0.235)",
					"--dsw-alias-border-l2-darkmode-thin": "rgba(16, 12, 12, 0.118)",
					"--dsw-alias-interactive-bg-hover": "rgba(167, 70, 147, 0.1)",
					"--dsw-alias-interactive-bg-active": "rgba(167, 70, 147, 0.17)",
					"--dsw-alias-interactive-bg-hover-danger": "rgba(182, 50, 45, 0.13)",
					"--dsw-focus-ring-color": "#a74693",
					"--dsw-alias-button-tool-bar-fill": "rgba(16, 12, 12, 0.072)",
					"--dsw-alias-button-tool-bar-hover": "rgba(16, 12, 12, 0.125)",
					"--dsw-alias-bg-mask-drop": "rgba(215, 203, 204, 0.6)",
					"--dsw-alias-file-diff-added-bg": "rgba(0, 119, 52, 0.115)",
					"--dsw-alias-file-diff-added-gutter": "rgba(0, 119, 52, 0.165)",
					"--dsw-alias-file-diff-added-marker": "#007734",
					"--dsw-alias-file-diff-deleted-bg": "rgba(182, 50, 45, 0.115)",
					"--dsw-alias-file-diff-deleted-gutter": "rgba(182, 50, 45, 0.165)",
					"--dsw-alias-file-diff-deleted-marker": "#b6322d",
					"--dsw-alias-state-business-primary": "#a74693",
					"--dsw-alias-state-business-tertiary": "rgba(167, 70, 147, 0.12)",
					"--dsw-alias-state-success-primary": "#007734",
					"--dsw-alias-state-warn-primary": "#885f00",
					"--dsw-alias-state-error-primary": "#b6322d",
					"--dsw-alias-markdown-code-block": "rgba(16, 12, 12, 0.045)",
					"--dsw-alias-markdown-inline-code": "rgba(167, 70, 147, 0.1)",
					"--dsw-alias-markdown-tag": "rgba(167, 70, 147, 0.12)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(16, 12, 12, 0.2)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(16, 12, 12, 0.28)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(16, 12, 12, 0.36)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(16, 12, 12, 0.36)",
					"--dsw-specific-sidebar-fill": "#f6e9ea",
					"--dsw-specific-sidebar-nav-item-active": "rgba(16, 12, 12, 0.075)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(16, 12, 12, 0.045)",
					"--dsw-specific-input-major": "#fbeeef",
					"--dsw-specific-tip": "#fff6f7",
					"--dsw-specific-selector": "rgba(16, 12, 12, 0.055)",
					"--dsw-specific-bubble": "#fdf0f1",
					"--dsw-specific-bubble-highlight": "rgba(167, 70, 147, 0.1)"
				},
				glow: "radial-gradient(1120px 680px at 78% -12%, rgba(226, 169, 211, 0.3), transparent 62%), radial-gradient(860px 580px at 8% 106%, rgba(215, 183, 222, 0.22), transparent 58%), radial-gradient(1400px 900px at 50% 30%, rgba(255, 255, 255, 0.62), transparent 74%), radial-gradient(1300px 950px at 50% 56%, transparent 46%, rgba(233, 221, 222, 0.4) 100%), linear-gradient(168deg, #faeeef 0%, #f5e8e9 55%, #f9eced 100%)",
				defaults: {
					wallpaperOpacity: 0.14,
					wallpaperBlur: 2,
					sidebarOpacity: 0.2,
					composerOpacity: 0.6,
					modalOpacity: 0.96,
					material: "frosted",
					autodim: true
				}
			}
		];

		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"skin.title": "皮肤",
			"skin.default": "默认",
			"skin.abyss": "沉静蓝",
			"skin.aurora": "极光青",
			"skin.nebula": "星云紫",
			"skin.ember": "余烬橙",
			"skin.midnight": "午夜黑",
			"skin.ivory": "iOS 扁平",
			"skin.mist": "干净明亮",
			"skin.rose": "Material 粉",
			"background.title": "背景图片（壁纸）",
			"background.choose": "选择图片",
			"background.remove": "移除图片",
			"background.opacity": "壁纸透明度",
			"background.blur": "壁纸模糊",
			"background.sidebarOpacity": "侧边栏透明度",
			"background.sidebarLink": "侧边栏跟随壁纸透明度（关闭后可分别调节）",
			"background.sidebarOpacityHint": "拖动本滑块会自动关闭上面的「跟随壁纸」，改为单独调节侧边栏",
			"glass.title": "玻璃效果",
			"glass.help": "透明度滑杆：越往右越透明、越能透出壁纸；越往左越实、文字越清晰。模糊滑杆同时驱动壁纸与玻璃表面的模糊。材质（毛玻璃/液态玻璃）只切换玻璃的质感风格，不会改动任何滑杆数值。",
			"material.frosted": "毛玻璃",
			"material.liquid": "液态玻璃",
			"material.frosted.desc": "经典毛玻璃：奶霜质感，文字更清晰",
			"material.liquid.desc": "通透润泽，折射感更强，更显壁纸",
			"material.hint": "材质只切换玻璃质感（毛玻璃=奶霜清透，液态玻璃=润泽折射），不会改动任何滑杆数值；透明度与模糊始终以你手动设置的为准。",
			"composer.opacity": "输入框透明度",
			"composer.hint": "越往右拉输入框越透明、越能透出壁纸；越往左越实、文字越清晰。",
			"background.hint": "图片显示在主内容区与侧边栏的半透明底上，消息等内层表面保持不透明以保证可读性",
			"background.history": "最近使用",
			"background.historyApply": "点击换回这张壁纸",
			"accent.title": "强调色（Accent）",
			"accent.pick": "选色…",
			"accent.random": "随机",
			"accent.clear": "恢复主题色",
			"accent.hint": "为当前皮肤设置一个自定义强调色（叠加层，不影响皮肤本身）；点「恢复主题色」回到皮肤默认强调色",
			"packs.title": "主题包（本地库）",
			"packs.import": "导入主题包…",
			"packs.share": "复制分享链接",
			"packs.apply": "应用",
			"packs.surprise": "换一个试试",
			"packs.remove": "移除",
			"packs.empty": "还没有主题包。导入一个 JSON 主题包，或内置皮肤会显示在「皮肤」行。",
			"packs.imported": "已导入「{name}」✓",
			"packs.importFailed": "导入失败：{error}",
			"packs.rejected": "主题包被拒绝——\n{errors}",
			"packs.removed": "已移除「{name}」",
			"packs.shareCopied": "已复制 ✓",
			"packs.shareFailed": "复制失败，请手动复制：{url}",
			"packs.shareUnavailable": "当前是内置外观（默认/浅色/深色），没有可分享的主题——先在上方选择一个皮肤或主题包再分享",
			"packs.export": "导出主题包文件",
			"bg2.title": "高级壁纸（URL / 渐变）",
			"bg2.local": "本地图片",
			"bg2.url": "图片链接",
			"bg2.gradient": "渐变",
			"bg2.apply": "应用链接",
			"bg2.autodim": "自动弱化（聚焦任务时不喧宾夺主）",
			"bg2.fill": "填充方式",
			"bg2.fillCover": "裁剪填满",
			"bg2.fillContain": "完整显示",
			"bg2.fillBlur": "模糊填充",
			"bg2.urlInvalid": "链接不被支持：仅支持 http/https 或 data:image 图片链接",
			"bg2.urlLoadFailed": "图片加载失败，请检查链接是否有效",
			"bg2.refreshUrlOnly": "定时更新仅对“图片链接”壁纸生效，请先在上方选择“图片链接”",
			"bg2.refresh": "定时自动更新（按周期重拉此链接，适合每日壁纸 API）",
			"bg2.refreshHours": "更新间隔（小时）",
			"bg2.remove": "清除壁纸",
			"modal.title": "弹窗透明度",
			"modal.hint": "控制下拉菜单 / 浮层 / 弹窗的底填充透明度——越往右越透、越能透出背后的内容；越往左越实、文字越清晰。可读性下限只在「壁纸在场」时生效：壁纸会把身后内容垫到这些面下面，所以用「弹层底色」这枚令牌铺底的面（设置面板、插件管理、轨迹图 tooltip、卡片浮层等）与提问 / 审批 / 计划评审三张卡都不低于 92% 不透明，滑杆更透的那一端对它们不再起作用，数值旁边会标出「已到可读性下限」。没有壁纸时身后本就是不透明画布，这根滑杆走完整 0–100% 量程。下拉菜单与遮罩两层始终不受下限约束，永远是全量程。",
			"modal.floorMark": "已到可读性下限 92%",
		};

		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"skin.title": "Skins",
			"skin.default": "Default",
			"skin.abyss": "Deep Blue",
			"skin.aurora": "Aurora Green",
			"skin.nebula": "Nebula Purple",
			"skin.ember": "Ember Amber",
			"skin.midnight": "Midnight OLED",
			"skin.ivory": "iOS Flat",
			"skin.mist": "Clear Bright",
			"skin.rose": "Material Pink",
			"background.title": "Wallpaper",
			"background.choose": "Choose image",
			"background.remove": "Remove",
			"background.opacity": "Wallpaper transparency",
			"background.blur": "Wallpaper blur",
			"background.sidebarOpacity": "Sidebar transparency",
			"background.sidebarLink": "Link sidebar transparency to the wallpaper (turn off to control it separately)",
			"background.sidebarOpacityHint": "Dragging this slider turns the wallpaper link off and controls the sidebar on its own",
			"glass.title": "Glass effect",
			"glass.help": "Transparency sliders: right = more see-through, left = more solid (crisper text). The blur slider drives both the wallpaper and every glass surface. Materials (frosted / liquid) only switch the glass character — they never move any slider value.",
			"material.frosted": "Frosted glass",
			"material.liquid": "Liquid glass",
			"material.frosted.desc": "Classic frost: milky texture, crisper text",
			"material.liquid.desc": "Clearer and glossier, with stronger refraction",
			"material.hint": "Materials only switch the glass character (frosted = milky frost, liquid = glossy refraction) — no slider value ever changes; transparency and blur always follow your manual settings.",
			"composer.opacity": "Input box transparency",
			"composer.hint": "Slide right for a more see-through input box; slide left for a more solid one with crisper text.",
			"background.hint": "The image shows through the translucent main canvas and sidebar; inner surfaces stay opaque for readability",
			"background.history": "Recent",
			"background.historyApply": "Click to switch back",
			"accent.title": "Accent",
			"accent.pick": "Pick…",
			"accent.random": "Random",
			"accent.clear": "Reset to theme",
			"accent.hint": "Set a custom accent color for the active skin (an override layer — the skin itself is untouched). Reset to return to the skin's default accent.",
			"packs.title": "Theme Packs (local)",
			"packs.import": "Import pack…",
			"packs.share": "Copy share link",
			"packs.apply": "Apply",
			"packs.surprise": "Surprise me",
			"packs.remove": "Remove",
			"packs.empty": "No packs yet. Import a JSON theme pack, or pick a built-in skin from the Skins row.",
			"packs.imported": "Imported \"{name}\" ✓",
			"packs.importFailed": "Import failed: {error}",
			"packs.rejected": "Theme pack rejected —\n{errors}",
			"packs.removed": "Removed \"{name}\"",
			"packs.shareCopied": "Copied ✓",
			"packs.shareFailed": "Copy failed — copy it manually: {url}",
			"packs.shareUnavailable": "A built-in appearance (Default/light/dark) is active — nothing to share. Pick a skin or theme pack above first.",
			"packs.export": "Export theme file",
			"bg2.title": "Advanced Wallpaper (URL / gradient)",
			"bg2.local": "Local image",
			"bg2.url": "Image URL",
			"bg2.gradient": "Gradient",
			"bg2.apply": "Apply link",
			"bg2.autodim": "Auto-dim (gently fade while focusing tasks)",
			"bg2.fill": "Fill mode",
			"bg2.fillCover": "Cover",
			"bg2.fillContain": "Contain",
			"bg2.fillBlur": "Blurred fill",
			"bg2.urlInvalid": "Unsupported link — only http/https or data:image image URLs are supported",
			"bg2.urlLoadFailed": "Failed to load the image — please check the link",
			"bg2.refreshUrlOnly": "Scheduled refresh only works with Image URL wallpapers — pick “Image URL” above first",
			"bg2.refresh": "Auto refresh (re-fetch this link on a schedule — great for daily wallpaper APIs)",
			"bg2.refreshHours": "Refresh interval (hours)",
			"bg2.remove": "Clear wallpaper",
			"modal.title": "Popup transparency",
			"modal.hint": "Controls how see-through dropdown menus / overlays / popups are — slide right to let the content behind show through, left to keep text crisp. The readability floor only applies while a wallpaper is on screen: the wash puts page content behind these faces, so surfaces painted from the popup-base token (Settings, the plugin manager, trajectory tooltips, floating cards, and others) AND the question / approval / plan-review cards hold at 92% opacity, and the transparent end of this slider stops affecting them — the value then shows an \"at the 92% floor\" note. With no wallpaper the backdrop is already opaque, so the slider keeps its full 0–100% range. Dropdown menus and the scrim are never under the floor; they always keep the full range.",
			"modal.floorMark": "at the 92% floor",
		};

		/** JA dictionary (community translation). */
		const ja = {
			"skin.title": "スキン",
			"skin.default": "デフォルト",
			"skin.abyss": "ディープブルー",
			"skin.aurora": "オーロラグリーン",
			"skin.nebula": "星雲パープル",
			"skin.ember": "残り火アンバー",
			"skin.midnight": "ミッドナイトOLED",
			"skin.ivory": "iOSフラット",
			"skin.mist": "クリアブライト",
			"skin.rose": "マテリアルピンク",
			"background.title": "背景画像（壁紙）",
			"background.choose": "画像を選択",
			"background.remove": "画像を削除",
			"background.opacity": "壁紙の透明度",
			"background.blur": "壁紙のぼかし",
			"background.sidebarOpacity": "サイドバーの透明度",
			"background.sidebarLink": "サイドバーの透明度を壁紙に連動（オフで個別調整）",
			"background.sidebarOpacityHint": "このスライダーを動かすと壁紙との連動が自動で解除され、サイドバーを個別に調整できます",
			"glass.title": "ガラス効果",
			"glass.help": "透明度スライダー：右ほど透けて壁紙が見え、左ほど不透明で文字がくっきり。ぼかしスライダーは壁紙とすべてのガラス面のぼかしをまとめて調整します。素材（すりガラス／リキッドグラス）は質感だけを切り替え、スライダーの数値は一切変えません。",
			"material.frosted": "すりガラス",
			"material.liquid": "リキッドグラス",
			"material.frosted.desc": "定番のすりガラス：乳白色で文字がくっきり",
			"material.liquid.desc": "より透明で光沢があり、屈折感が強い",
			"material.hint": "素材はガラスの質感だけを切り替えます（すりガラス＝乳白、リキッド＝光沢ある屈折）。スライダーの数値は変わりません。透明度・ぼかしは常に手動設定どおりです。",
			"composer.opacity": "入力欄の透明度",
			"composer.hint": "右に動かすほど入力欄が透けて壁紙が見え、左ほど不透明で文字がくっきりします。",
			"background.hint": "画像は半透明のメイン表示領域とサイドバーの背面に表示されます。メッセージなど内側の面は読みやすさのため不透明のままです",
			"background.history": "最近使ったもの",
			"background.historyApply": "クリックでこの壁紙に戻る",
			"accent.title": "アクセントカラー",
			"accent.pick": "色を選ぶ…",
			"accent.random": "ランダム",
			"accent.clear": "テーマカラーに戻す",
			"accent.hint": "現在のスキンにカスタムのアクセントカラーを設定します（オーバーライド層であり、スキン自体には影響しません）。「テーマカラーに戻す」でスキン既定のアクセントカラーに戻ります",
			"packs.title": "テーマパック（ローカル）",
			"packs.import": "テーマパックを読み込む…",
			"packs.share": "共有リンクをコピー",
			"packs.apply": "適用",
			"packs.surprise": "おまかせ",
			"packs.remove": "削除",
			"packs.empty": "テーマパックはまだありません。JSON テーマパックを読み込むか、「スキン」の行から内蔵スキンを選んでください",
			"packs.imported": "「{name}」を読み込みました ✓",
			"packs.importFailed": "読み込みに失敗しました：{error}",
			"packs.rejected": "テーマパックが拒否されました——\n{errors}",
			"packs.removed": "「{name}」を削除しました",
			"packs.shareCopied": "コピーしました ✓",
			"packs.shareFailed": "コピーに失敗しました。手動でコピーしてください：{url}",
			"packs.shareUnavailable": "内蔵の外観（デフォルト/ライト/ダーク）が選択されているため、共有できるテーマがありません。先に上でスキンまたはテーマパックを選んでください",
			"packs.export": "テーマファイルをエクスポート",
			"bg2.title": "詳細壁紙（URL / グラデーション）",
			"bg2.local": "ローカル画像",
			"bg2.url": "画像 URL",
			"bg2.gradient": "グラデーション",
			"bg2.apply": "リンクを適用",
			"bg2.autodim": "自動ディム（タスクに集中している間は控えめに薄暗く）",
			"bg2.fill": "表示方法",
			"bg2.fillCover": "拡充（トリミング）",
			"bg2.fillContain": "全体表示",
			"bg2.fillBlur": "ぼかし埋め",
			"bg2.urlInvalid": "サポート外のリンクです：http/https または data:image の画像URLのみ利用できます",
			"bg2.urlLoadFailed": "画像の読み込みに失敗しました。リンクを確認してください",
			"bg2.refreshUrlOnly": "定期更新は「画像 URL」の壁紙でのみ動作します — 先に上で「画像 URL」を選択してください",
			"bg2.refresh": "定期自動更新（このリンクを定期的に再取得 — 日替わり壁紙 API に最適）",
			"bg2.refreshHours": "更新間隔（時間）",
			"bg2.remove": "壁紙をクリア",
			"modal.title": "ポップアップの透明度",
			"modal.hint": "ドロップダウンメニュー / オーバーレイ / ポップアップの透け方を調整します。右ほど背後が透け、左ほど文字がはっきりします。可読性の下限は「壁紙が表示されている間」だけ適用されます：壁紙はこれらの面の後ろにページ内容を敷くため、ポップアップ背景トークンで塗られた面（設定、プラグイン管理、軌跡のツールチップ、カード形の浮層など）と質問 / 承認 / 計画レビューの 3 枚のカードは不透明度 92% を下回らず、スライダーの透ける側はそれらに効かなくなります。その状態では数値の横に「可読下限 92% に到達」と表示されます。壁紙がない場合は背景がもとから不透明なので、スライダーは 0〜100% の全範囲に戻ります。ドロップダウンメニューとスクリーンは下限の外にあり、常に全範囲です。",
			"modal.floorMark": "可読下限 92% に到達",
		};

		/** KO dictionary (community translation). */
		const ko = {
			"skin.title": "스킨",
			"skin.default": "기본",
			"skin.abyss": "딥 블루",
			"skin.aurora": "오로라 그린",
			"skin.nebula": "성운 퍼플",
			"skin.ember": "잔불 앰버",
			"skin.midnight": "미드나잇 OLED",
			"skin.ivory": "iOS 플랫",
			"skin.mist": "클리어 브라이트",
			"skin.rose": "머티리얼 핑크",
			"background.title": "배경 이미지 (배경화면)",
			"background.choose": "이미지 선택",
			"background.remove": "이미지 제거",
			"background.opacity": "배경화면 투명도",
			"background.blur": "배경화면 흐림",
			"background.sidebarOpacity": "사이드바 투명도",
			"background.sidebarLink": "사이드바 투명도를 배경화면에 연동 (끄면 개별 조절)",
			"background.sidebarOpacityHint": "이 슬라이더를 움직이면 배경화면 연동이 자동으로 해제되어 사이드바를 따로 조절할 수 있습니다",
			"glass.title": "글래스 효과",
			"glass.help": "투명도 슬라이더: 오른쪽일수록 투명해 배경이 비치고, 왼쪽일수록 단단해져 글자가 선명합니다. 흐림 슬라이더는 배경화면과 모든 유리 표면의 흐림을 함께 조절합니다. 재질(새틴/리퀴드)은 질감만 바꾸며 슬라이더 값은 절대 변경하지 않습니다.",
			"material.frosted": "새틴 글래스",
			"material.liquid": "리퀴드 글래스",
			"material.frosted.desc": "클래식 새틴: 뿌연 질감, 더 선명한 글자",
			"material.liquid.desc": "더 투명하고 광택이 있으며 굴절감이 강함",
			"material.hint": "재질은 유리 질감만 바꿉니다(새틴=뿌연 유리, 리퀴드=광택 굴절). 슬라이더 값은 변하지 않으며 투명도·흐림은 항상 수동 설정을 따릅니다.",
			"composer.opacity": "입력창 투명도",
			"composer.hint": "오른쪽으로 올릴수록 입력창이 투명해져 배경이 비치고, 왼쪽일수록 단단해져 글자가 선명합니다.",
			"background.hint": "이미지가 메인 콘텐츠 영역과 사이드바의 반투명 배경에 표시됩니다. 메시지 같은 내부 표면은 가독성을 위해 불투명하게 유지됩니다.",
			"background.history": "최근 사용",
			"background.historyApply": "클릭하면 이 배경화면으로 되돌아갑니다",
			"accent.title": "강조색 (Accent)",
			"accent.pick": "색상 선택…",
			"accent.random": "랜덤",
			"accent.clear": "테마 색상으로 복원",
			"accent.hint": "현재 스킨에 사용자 지정 강조색을 설정합니다 (오버레이 레이어 — 스킨 자체는 그대로 유지). 「테마 색상으로 복원」을 누르면 스킨의 기본 강조색으로 돌아갑니다.",
			"packs.title": "테마 팩 (로컬 라이브러리)",
			"packs.import": "테마 팩 가져오기…",
			"packs.share": "공유 링크 복사",
			"packs.apply": "적용",
			"packs.surprise": "랜덤으로 바꾸기",
			"packs.remove": "제거",
			"packs.empty": "아직 테마 팩이 없습니다. JSON 테마 팩을 가져오거나, 내장 스킨은 「스킨」 행에서 선택하세요.",
			"packs.imported": "「{name}」을(를) 가져왔습니다 ✓",
			"packs.importFailed": "가져오기 실패: {error}",
			"packs.rejected": "테마 팩이 거부되었습니다:\n{errors}",
			"packs.removed": "「{name}」을(를) 제거했습니다",
			"packs.shareCopied": "복사했습니다 ✓",
			"packs.shareFailed": "복사에 실패했습니다. 수동으로 복사해 주세요: {url}",
			"packs.shareUnavailable": "내장 외관(기본/라이트/다크)이 선택되어 공유할 테마가 없습니다. 먼저 위에서 스킨 또는 테마 팩을 선택하세요",
			"packs.export": "테마 파일 내보내기",
			"bg2.title": "고급 배경화면 (URL / 그라데이션)",
			"bg2.local": "로컬 이미지",
			"bg2.url": "이미지 링크",
			"bg2.gradient": "그라데이션",
			"bg2.apply": "링크 적용",
			"bg2.autodim": "자동으로 은은해지기 (작업에 집중할 때 방해하지 않도록)",
			"bg2.fill": "채우기 방식",
			"bg2.fillCover": "잘라 채움",
			"bg2.fillContain": "전체 표시",
			"bg2.fillBlur": "흐림 채움",
			"bg2.urlInvalid": "지원하지 않는 링크입니다. http/https 또는 data:image 이미지 URL만 사용할 수 있습니다",
			"bg2.urlLoadFailed": "이미지를 불러오지 못했습니다. 링크를 확인해 주세요",
			"bg2.refreshUrlOnly": "정기 업데이트는 '이미지 URL' 배경화면에서만 작동합니다 — 먼저 위에서 '이미지 URL'을 선택하세요",
			"bg2.refresh": "정기 자동 업데이트 (이 링크를 주기적으로 다시 가져옴 — 매일 바뀌는 배경화면 API에 적합)",
			"bg2.refreshHours": "업데이트 간격 (시간)",
			"bg2.remove": "배경화면 지우기",
			"modal.title": "팝업 투명도",
			"modal.hint": "드롭다운 메뉴 / 오버레이 / 팝업의 투명도를 조절합니다. 오른쪽일수록 배경이 비치고, 왼쪽일수록 텍스트가 선명합니다. 가독성 하한은 「배경 그림이 떠 있을 때」만 적용됩니다: 배경 그림은 이 면들 뒤에 페이지 내용을 깔아 주므로, 팝업 바탕 토큰으로 칠해진 면(설정, 플러그인 관리자, 궤적 툴팁, 카드형 오버레이 등)과 질문 / 승인 / 계획 검토 세 장의 카드는 불투명도 92% 아래로 내려가지 않고, 슬라이더의 투명한 쪽은 그것들에 더 이상 영향을 주지 않습니다 — 이때 값 옆에 「가독성 하한 92% 도달」이 표시됩니다. 배경 그림이 없으면 뒤는 이미 불투명하므로 슬라이더는 0~100% 전 범위를 되찾습니다. 드롭다운 메뉴와 스크림은 하한의 밖에 있으며 항상 전 범위입니다.",
			"modal.floorMark": "가독성 하한 92% 도달",
		};

		/** ES dictionary (community translation). */
		const es = {
			"skin.title": "Pieles",
			"skin.default": "Por defecto",
			"skin.abyss": "Azul profundo",
			"skin.aurora": "Aurora verde",
			"skin.nebula": "Nebulosa púrpura",
			"skin.ember": "Ámbar",
			"skin.midnight": "OLED medianoche",
			"skin.ivory": "iOS Flat",
			"skin.mist": "Brillo limpio",
			"skin.rose": "Material rosa",
			"background.title": "Fondo de pantalla",
			"background.choose": "Elegir imagen",
			"background.remove": "Quitar imagen",
			"background.opacity": "Transparencia del fondo",
			"background.blur": "Desenfoque del fondo",
			"background.sidebarOpacity": "Transparencia de la barra lateral",
			"background.sidebarLink": "Vincular la transparencia de la barra lateral al fondo (apagar para ajustarla aparte)",
			"background.sidebarOpacityHint": "Al mover este control se desactiva el vínculo con el fondo y la barra lateral se ajusta por separado",
			"glass.title": "Efecto de cristal",
			"glass.help": "Deslizadores de transparencia: derecha = más transparente, izquierda = más sólido (texto más nítido). El desenfoque controla el fondo y todas las superficies de cristal. Los materiales (esmerilado/líquido) solo cambian el carácter del cristal: nunca mueven ningún valor.",
			"material.frosted": "Cristal esmerilado",
			"material.liquid": "Cristal líquido",
			"material.frosted.desc": "Esmerilado clásico: textura lechosa, texto más nítido",
			"material.liquid.desc": "Más transparente y brillante, con mayor refracción",
			"material.hint": "Los materiales solo cambian el carácter del cristal (esmerilado = escarcha lechosa, líquido = refracción brillante): ningún valor cambia; transparencia y desenfoque siguen tus ajustes manuales.",
			"composer.opacity": "Transparencia del cuadro de entrada",
			"composer.hint": "Desliza a la derecha para un cuadro más transparente; a la izquierda, más sólido y con texto más nítido.",
			"background.hint": "La imagen se muestra bajo el fondo translúcido del área de contenido principal y la barra lateral; las superficies internas (como los mensajes) permanecen opacas para garantizar la legibilidad",
			"background.history": "Recientes",
			"background.historyApply": "Haz clic para volver a este fondo",
			"accent.title": "Color de acento",
			"accent.pick": "Elegir…",
			"accent.random": "Aleatorio",
			"accent.clear": "Restablecer color del tema",
			"accent.hint": "Define un color de acento personalizado para la piel activa (es una capa de superposición: la piel en sí no se modifica). Pulsa «Restablecer color del tema» para volver al acento predeterminado de la piel.",
			"packs.title": "Paquetes de temas (locales)",
			"packs.import": "Importar paquete…",
			"packs.share": "Copiar enlace para compartir",
			"packs.apply": "Aplicar",
			"packs.surprise": "Sorpréndeme",
			"packs.remove": "Quitar",
			"packs.empty": "Aún no hay paquetes. Importa un paquete de temas JSON o elige una piel integrada en la fila «Pieles».",
			"packs.imported": "Se importó «{name}» ✓",
			"packs.importFailed": "Error al importar: {error}",
			"packs.rejected": "Paquete rechazado —\n{errors}",
			"packs.removed": "Se quitó «{name}»",
			"packs.shareCopied": "Copiado ✓",
			"packs.shareFailed": "No se pudo copiar — cópialo manualmente: {url}",
			"packs.shareUnavailable": "Hay una apariencia integrada activa (Predeterminado/claro/oscuro): no hay nada que compartir. Elige antes una piel o paquete arriba.",
			"packs.export": "Exportar archivo de tema",
			"bg2.title": "Fondo avanzado (URL / degradado)",
			"bg2.local": "Imagen local",
			"bg2.url": "URL de la imagen",
			"bg2.gradient": "Degradado",
			"bg2.apply": "Aplicar enlace",
			"bg2.autodim": "Atenuación automática (se desvanece suavemente mientras te concentras en las tareas)",
			"bg2.fill": "Modo de relleno",
			"bg2.fillCover": "Cubrir",
			"bg2.fillContain": "Ajustar",
			"bg2.fillBlur": "Relleno difuminado",
			"bg2.urlInvalid": "Enlace no admitido: solo se permiten URLs de imágenes http/https o data:image",
			"bg2.urlLoadFailed": "No se pudo cargar la imagen. Comprueba el enlace",
			"bg2.refreshUrlOnly": "La actualización automática solo funciona con fondos de URL de imagen — elige «URL de la imagen» arriba primero",
			"bg2.refresh": "Actualización automática (vuelve a cargar este enlace periódicamente — ideal para fondos diarios)",
			"bg2.refreshHours": "Intervalo de actualización (horas)",
			"bg2.remove": "Quitar fondo",
			"modal.title": "Transparencia de las ventanas emergentes",
			"modal.hint": "Controla la transparencia del relleno de menús / superposiciones / ventanas emergentes: hacia la derecha se ve el contenido de atrás; hacia la izquierda el texto queda nítido. El suelo de legibilidad solo se aplica mientras hay un fondo de pantalla activo: el fondo coloca contenido de la página detrás de estas superficies, así que las pintadas con el token de fondo emergente (Ajustes, el gestor de complementos, las ayudas de la trayectoria, las tarjetas flotantes y otras más) y las tres tarjetas de pregunta / aprobación / revisión del plan mantienen al menos un 92 % de opacidad, y el extremo transparente del deslizador deja de afectarlas; en ese estado el valor muestra la nota «en el suelo del 92 %». Sin fondo de pantalla la superficie de atrás ya es opaca, así que el deslizador recupera todo el recorrido 0–100 %. Los menús desplegables y el velo quedan siempre fuera del suelo y conservan todo el rango.",
			"modal.floorMark": "en el suelo del 92 %",
		};

		/** FR dictionary (community translation). */
		const fr = {
			"skin.title": "Apparence",
			"skin.default": "Par défaut",
			"skin.abyss": "Bleu profond",
			"skin.aurora": "Aurora vert",
			"skin.nebula": "Nébuleuse violette",
			"skin.ember": "Ambre",
			"skin.midnight": "OLED minuit",
			"skin.ivory": "iOS Flat",
			"skin.mist": "Clair net",
			"skin.rose": "Material rose",
			"background.title": "Fond d'écran",
			"background.choose": "Choisir une image",
			"background.remove": "Retirer l'image",
			"background.opacity": "Transparence du fond",
			"background.blur": "Flou du fond",
			"background.sidebarOpacity": "Transparence de la barre latérale",
			"background.sidebarLink": "Lier la transparence de la barre latérale au fond (désactiver pour régler séparément)",
			"background.sidebarOpacityHint": "Déplacer ce curseur désactive la liaison au fond d'écran et règle la barre latérale séparément",
			"glass.title": "Effet de verre",
			"glass.help": "Curseurs de transparence : droite = plus transparent, gauche = plus solide (texte plus net). Le flou pilote le fond et toutes les surfaces de verre. Les matières (dépoli/liquide) ne changent que le caractère du verre — elles ne déplacent aucune valeur.",
			"material.frosted": "Verre dépoli",
			"material.liquid": "Verre liquide",
			"material.frosted.desc": "Dépoli classique : texture laiteuse, texte plus net",
			"material.liquid.desc": "Plus transparent et brillant, réfraction plus forte",
			"material.hint": "Les matières ne changent que le caractère du verre (dépoli = givre laiteux, liquide = réfraction brillante) — aucune valeur ne bouge ; transparence et flou suivent vos réglages.",
			"composer.opacity": "Transparence de la zone de saisie",
			"composer.hint": "Glisse vers la droite pour plus de transparence ; vers la gauche, la zone devient plus solide et le texte plus net.",
			"background.hint": "L'image transparaît sous le canevas principal et la barre latérale translucides ; les surfaces intérieures (messages, etc.) restent opaques pour préserver la lisibilité.",
			"background.history": "Récents",
			"background.historyApply": "Clique pour revenir à ce fond d'écran",
			"accent.title": "Couleur d'accent",
			"accent.pick": "Choisir…",
			"accent.random": "Aléatoire",
			"accent.clear": "Rétablir la couleur du thème",
			"accent.hint": "Définis une couleur d'accent personnalisée pour l'apparence active (une surcouche — l'apparence elle-même reste intacte) ; « Rétablir la couleur du thème » revient à l'accent par défaut.",
			"packs.title": "Packs de thèmes (locaux)",
			"packs.import": "Importer un pack…",
			"packs.share": "Copier le lien de partage",
			"packs.apply": "Appliquer",
			"packs.surprise": "Surprends-moi",
			"packs.remove": "Retirer",
			"packs.empty": "Pas encore de packs. Importe un pack de thème JSON, ou retrouve les apparences intégrées dans la ligne « Apparence ».",
			"packs.imported": "Pack « {name} » importé ✓",
			"packs.importFailed": "Échec de l'import : {error}",
			"packs.rejected": "Pack rejeté —\n{errors}",
			"packs.removed": "« {name} » retiré",
			"packs.shareCopied": "Copié ✓",
			"packs.shareFailed": "Échec de la copie — copiez-le manuellement : {url}",
			"packs.shareUnavailable": "Une apparence intégrée est active (Par défaut/clair/sombre) — rien à partager. Choisissez d'abord un skin ou un pack ci-dessus.",
			"packs.export": "Exporter le fichier de thème",
			"bg2.title": "Fond d'écran avancé (URL / dégradé)",
			"bg2.local": "Image locale",
			"bg2.url": "URL de l'image",
			"bg2.gradient": "Dégradé",
			"bg2.apply": "Appliquer le lien",
			"bg2.autodim": "Atténuation auto (s'estompe en douceur pendant la concentration)",
			"bg2.fill": "Mode de remplissage",
			"bg2.fillCover": "Couvrir",
			"bg2.fillContain": "Contenir",
			"bg2.fillBlur": "Remplissage flouté",
			"bg2.urlInvalid": "Lien non pris en charge : seuls les URLs http/https ou data:image sont autorisés",
			"bg2.urlLoadFailed": "Échec du chargement de l'image. Vérifiez le lien",
			"bg2.refreshUrlOnly": "L'actualisation auto ne fonctionne qu'avec les fonds « URL d'image » — choisissez d'abord « URL de l'image » ci-dessus",
			"bg2.refresh": "Actualisation auto (recharge ce lien périodiquement — idéal pour les fonds quotidiens)",
			"bg2.refreshHours": "Intervalle de mise à jour (heures)",
			"bg2.remove": "Effacer le fond d'écran",
			"modal.title": "Transparence des fenêtres contextuelles",
			"modal.hint": "Règle la transparence du remplissage des menus / superpositions / fenêtres contextuelles : vers la droite le contenu derrière transparaît, vers la gauche le texte reste net. Le seuil de lisibilité ne s'applique que lorsqu'un fond d'écran est affiché : le fond place du contenu de page derrière ces surfaces, donc les surfaces peintes avec le jeton de fond des surfaces flottantes (Réglages, gestionnaire d'extensions, infobulles de trajectoire, cartes flottantes, entre autres) et les trois cartes de question / approbation / révision du plan restent à au moins 92 % d'opacité, et l'extrémité transparente du curseur cesse de les affecter — la valeur affiche alors la mention « au seuil de 92 % ». Sans fond d'écran, l'arrière-plan est déjà opaque, le curseur retrouve donc toute sa plage 0–100 %. Les menus déroulants et le voile échappent toujours au seuil et gardent toute la plage.",
			"modal.floorMark": "au seuil de 92 %",
		};

		/** DE dictionary (community translation). */
		const de = {
			"skin.title": "Skins",
			"skin.default": "Standard",
			"skin.abyss": "Tiefes Blau",
			"skin.aurora": "Aurora Grün",
			"skin.nebula": "Nebel Lila",
			"skin.ember": "Bernstein",
			"skin.midnight": "OLED Mitternacht",
			"skin.ivory": "iOS Flat",
			"skin.mist": "Klar hell",
			"skin.rose": "Material Pink",
			"background.title": "Hintergrundbild (Wallpaper)",
			"background.choose": "Bild auswählen",
			"background.remove": "Bild entfernen",
			"background.opacity": "Wallpaper-Transparenz",
			"background.blur": "Wallpaper-Unschärfe",
			"background.sidebarOpacity": "Transparenz der Seitenleiste",
			"background.sidebarLink": "Seitenleisten-Transparenz an Wallpaper koppeln (ausschalten für getrennte Regelung)",
			"background.sidebarOpacityHint": "Beim Ziehen dieses Reglers wird die Kopplung an das Wallpaper gelöst und die Seitenleiste separat eingestellt",
			"glass.title": "Glas-Effekt",
			"glass.help": "Transparenz-Regler: rechts = durchsichtiger, links = solider (schärferer Text). Die Unschärfe steuert Hintergrund und alle Glasflächen gemeinsam. Materialien (Milchglas/Flüssig) wechseln nur den Glas-Charakter – sie verändern keine Werte.",
			"material.frosted": "Milchglas",
			"material.liquid": "Flüssiges Glas",
			"material.frosted.desc": "Klassisches Milchglas: milchige Textur, schärferer Text",
			"material.liquid.desc": "Klarer und glänzender, mit stärkerer Brechung",
			"material.hint": "Materialien wechseln nur den Glas-Charakter (Milchglas = milchiger Frost, Flüssig = glänzende Brechung) – keine Werte ändern sich; Transparenz und Unschärfe folgen deinen manuellen Einstellungen.",
			"composer.opacity": "Eingabefeld-Transparenz",
			"composer.hint": "Nach rechts = durchsichtigeres Eingabefeld; nach links = solider mit klarerem Text.",
			"background.hint": "Das Bild scheint durch die halbtransparente Hauptfläche und die Seitenleiste; innere Flächen wie Nachrichten bleiben deckend, damit alles gut lesbar bleibt.",
			"background.history": "Zuletzt verwendet",
			"background.historyApply": "Klicken, um zurückzuwechseln",
			"accent.title": "Akzentfarbe (Accent)",
			"accent.pick": "Farbe wählen…",
			"accent.random": "Zufall",
			"accent.clear": "Auf Theme zurücksetzen",
			"accent.hint": "Legt eine eigene Akzentfarbe für den aktiven Skin fest (eine Überlagerung – der Skin selbst bleibt unberührt). Über »Auf Theme zurücksetzen« kehrst du zur Standard-Akzentfarbe des Skins zurück.",
			"packs.title": "Theme-Pakete (lokal)",
			"packs.import": "Theme-Paket importieren…",
			"packs.share": "Freigabelink kopieren",
			"packs.apply": "Anwenden",
			"packs.surprise": "Überrasch mich",
			"packs.remove": "Entfernen",
			"packs.empty": "Noch keine Theme-Pakete. Importiere ein JSON-Theme-Paket oder wähle einen integrierten Skin in der Zeile »Skins«.",
			"packs.imported": "»{name}« importiert ✓",
			"packs.importFailed": "Import fehlgeschlagen: {error}",
			"packs.rejected": "Theme-Paket abgelehnt —\n{errors}",
			"packs.removed": "»{name}« entfernt",
			"packs.shareCopied": "Kopiert ✓",
			"packs.shareFailed": "Kopieren fehlgeschlagen — bitte manuell kopieren: {url}",
			"packs.shareUnavailable": "Ein integriertes Erscheinungsbild ist aktiv (Standard/Hell/Dunkel) — nichts zu teilen. Wähle zuerst oben einen Skin oder ein Theme-Paket.",
			"packs.export": "Theme-Datei exportieren",
			"bg2.title": "Erweiterte Wallpaper (URL / Verlauf)",
			"bg2.local": "Lokales Bild",
			"bg2.url": "Bild-URL",
			"bg2.gradient": "Verlauf",
			"bg2.apply": "Link anwenden",
			"bg2.autodim": "Automatisch dimmen (sanft verblassen, während du dich auf Aufgaben konzentrierst)",
			"bg2.fill": "Füllmodus",
			"bg2.fillCover": "Füllen",
			"bg2.fillContain": "Einpassen",
			"bg2.fillBlur": "Unscharfer Rand",
			"bg2.urlInvalid": "Nicht unterstützter Link – nur http/https- oder data:image-Bild-URLs sind erlaubt",
			"bg2.urlLoadFailed": "Bild konnte nicht geladen werden. Bitte prüfe den Link",
			"bg2.refreshUrlOnly": "Die automatische Aktualisierung funktioniert nur bei Wallpapern per Bild-URL — wähle zuerst oben „Bild-URL“",
			"bg2.refresh": "Automatisch aktualisieren (diesen Link regelmäßig neu laden — ideal für tägliche Wallpaper-APIs)",
			"bg2.refreshHours": "Aktualisierungsintervall (Stunden)",
			"bg2.remove": "Wallpaper entfernen",
			"modal.title": "Transparenz von Popups",
			"modal.hint": "Regelt die Transparenz von Dropdown-Menüs / Overlays / Popups – nach rechts scheint der Hintergrund durch, nach links bleibt der Text klar. Die Lesbarkeits-Untergrenze gilt nur, solange ein Hintergrundbild zu sehen ist: Das Bild legt Seiteninhalt hinter diese Flächen, deshalb bleiben die mit dem Popup-Grund-Token gefüllten Flächen (Einstellungen, Plugin-Verwaltung, Trajektorien-Tooltips, schwebende Karten u. a.) UND die Frage-/Genehmigungs-/Planprüfungskarten bei mindestens 92 % Undurchsichtigkeit, und das transparente Ende des Reglers wirkt auf sie nicht mehr – der Wert zeigt dann den Hinweis „bei der Untergrenze 92 %“. Ohne Hintergrundbild ist der Grund bereits undurchsichtig, daher hat der Regler dort seine volle Spanne von 0–100 %. Dropdown-Menüs und Abdunklungs-Layer liegen immer außerhalb der Grenze und behalten die volle Spanne bei.",
			"modal.floorMark": "bei der Untergrenze 92 %",
		};

		/** RU dictionary (community translation). */
		const ru = {
			"skin.title": "Скины",
			"skin.default": "По умолчанию",
			"skin.abyss": "Глубокий синий",
			"skin.aurora": "Аврора зелёный",
			"skin.nebula": "Туманность фиолетовый",
			"skin.ember": "Янтарь",
			"skin.midnight": "OLED полночь",
			"skin.ivory": "iOS Flat",
			"skin.mist": "Чистая яркость",
			"skin.rose": "Material розовый",
			"background.title": "Обои",
			"background.choose": "Выбрать изображение",
			"background.remove": "Удалить",
			"background.opacity": "Прозрачность обоев",
			"background.blur": "Размытие обоев",
			"background.sidebarOpacity": "Прозрачность боковой панели",
			"background.sidebarLink": "Связать прозрачность боковой панели с обоями (выкл — для раздельной настройки)",
			"background.sidebarOpacityHint": "При перетаскивании этого ползунка связь с обоями отключается, и боковую панель можно настроить отдельно",
			"glass.title": "Эффект стекла",
			"glass.help": "Ползунки прозрачности: вправо — прозрачнее (фон виден), влево — плотнее (текст чётче). Ползунок размытия управляет фоном и всеми стеклянными поверхностями сразу. Материалы (матовое/жидкое) меняют только характер стекла — значения ползунков не трогают.",
			"material.frosted": "Матовое стекло",
			"material.liquid": "Жидкое стекло",
			"material.frosted.desc": "Классическое матовое: молочная текстура, чётче текст",
			"material.liquid.desc": "Прозрачнее и глянцевее, сильнее преломление",
			"material.hint": "Материалы меняют только характер стекла (матовое = молочный иней, жидкое = глянцевое преломление) — значения не меняются; прозрачность и размытие следуют вашим ручным настройкам.",
			"composer.opacity": "Прозрачность поля ввода",
			"composer.hint": "Вправо — поле ввода прозрачнее и фон виден; влево — плотнее и текст чётче.",
			"background.hint": "Изображение просвечивает сквозь полупрозрачный фон основной области и боковой панели; внутренние поверхности (сообщения и т. п.) остаются непрозрачными ради читабельности",
			"background.history": "Недавние",
			"background.historyApply": "Нажмите, чтобы вернуть эти обои",
			"accent.title": "Акцентный цвет",
			"accent.pick": "Выбрать цвет…",
			"accent.random": "Случайно",
			"accent.clear": "Вернуть цвет темы",
			"accent.hint": "Задайте свой акцентный цвет для активного скина (это наложение — сам скин не меняется). Нажмите «Вернуть цвет темы», чтобы вернуться к акцентному цвету скина по умолчанию.",
			"packs.title": "Пакеты тем (локальная библиотека)",
			"packs.import": "Импортировать пакет…",
			"packs.share": "Скопировать ссылку",
			"packs.apply": "Применить",
			"packs.surprise": "Удиви меня",
			"packs.remove": "Удалить",
			"packs.empty": "Пакетов тем пока нет. Импортируйте пакет в формате JSON — или выберите встроенный скин в разделе «Скины».",
			"packs.imported": "Импортировано: «{name}» ✓",
			"packs.importFailed": "Не удалось импортировать: {error}",
			"packs.rejected": "Пакет тем отклонён —\n{errors}",
			"packs.removed": "Удалено: «{name}»",
			"packs.shareCopied": "Скопировано ✓",
			"packs.shareFailed": "Не удалось скопировать — скопируйте вручную: {url}",
			"packs.shareUnavailable": "Активен встроенный внешний вид (По умолчанию/светлая/тёмная) — делиться нечем. Сначала выберите скин или пакет тем выше.",
			"packs.export": "Экспортировать файл темы",
			"bg2.title": "Расширенные обои (URL / градиент)",
			"bg2.local": "Локальное изображение",
			"bg2.url": "Ссылка на изображение",
			"bg2.gradient": "Градиент",
			"bg2.apply": "Применить ссылку",
			"bg2.autodim": "Автоприглушение (плавно затухает при фокусе на задачах)",
			"bg2.fill": "Режим заполнения",
			"bg2.fillCover": "Заполнение",
			"bg2.fillContain": "Вписать",
			"bg2.fillBlur": "Размытая подложка",
			"bg2.urlInvalid": "Неподдерживаемая ссылка — разрешены только URL http/https или data:image",
			"bg2.urlLoadFailed": "Не удалось загрузить изображение. Проверьте ссылку",
			"bg2.refreshUrlOnly": "Автообновление работает только с обоями «URL изображения» — сначала выберите «URL изображения» выше",
			"bg2.refresh": "Автообновление (периодически перезагружать эту ссылку — идеально для ежедневных обоев)",
			"bg2.refreshHours": "Интервал обновления (часы)",
			"bg2.remove": "Очистить обои",
			"modal.title": "Прозрачность всплывающих окон",
			"modal.hint": "Регулирует прозрачность заливки выпадающих меню / оверлеев / всплывающих окон: вправо — просвечивает фон, влево — текст чётче. Нижний порог читаемости действует только пока на экране обои: обои подкладывают содержимое страницы под эти поверхности, поэтому поверхности, залитые токеном базового фона всплывающих слоёв (Настройки, менеджер плагинов, подсказки траектории, плавающие карточки и другие) И три карточки (вопрос / подтверждение / обзор плана) остаются непрозрачными минимум на 92 %, и прозрачный конец ползунка на них больше не влияет — в этом состоянии рядом со значением появляется пометка «порог читаемости 92 %». Без обоев задний план и так непрозрачен, поэтому ползунок возвращает полный диапазон 0–100 %. Выпадающие меню и затемняющий слой вне порога всегда — у них полный диапазон.",
			"modal.floorMark": "порог читаемости 92 %",
		};

		//#endregion

		//#region dsh-dream-skin: persistence (host-backed, origin-independent)
		/**
		 * Persistence seam. Values live in three places:
		 *
		 *  1. an in-memory Map (`stateCache`) — the synchronous read/write
		 *     surface every feature uses;
		 *  2. localStorage — a same-origin fallback so a page reload on the
		 *     same origin still works, and so the first paint before the host
		 *     round-trip has correct values;
		 *  3. the host state file (`$DSH_HOME/dream-skin.json`, via the fenced
		 *     `/dream-skin/api` route) — the durable, origin-independent
		 *     source of truth that survives the desktop app's per-launch
		 *     random port (localStorage alone is lost because the origin —
		 *     scheme+host+port — changes every restart).
		 *
		 * Writes update the cache + localStorage immediately (sync), then are
		 * debounced and pushed to the host as a full-state replacement. On
		 * boot the host state is fetched once; keys not touched this session
		 * are adopted from it, and `onHostReady` re-applies the visual state.
		 */
		/**
		 * API endpoint, derived from `document.baseURI` so a deployment behind
		 * a gateway that serves the app under a sub-path (e.g. fnOS reverse
		 * proxy at `/dsh/`) resolves the route relative to that base —
		 * `<base href="./">` already makes asset URLs sub-path-safe, and this
		 * extends the same guarantee to the persistence API. On a root
		 * deployment (no `<base>`, no trailing path) this is exactly
		 * `/dream-skin/api`, unchanged.
		 */
		const HOST_API = new URL("dream-skin/api", document.baseURI || "http://localhost/").pathname;
		/** In-memory key -> string|null cache (null = cleared/absent). */
		const stateCache = new Map();
		/** Keys written (or cleared) this session — the host must not overwrite them. */
		const writtenKeys = new Set();
		/**
		 * Keys written by the factory-defaults seeding THIS SESSION. Those
		 * writes are PROVISIONAL: the durable host value must always win over
		 * them (blue-team B1). Cross-session provenance is tracked by the
		 * persistent FACTORY_SNAPSHOT_KEY (survives reloads — session seals
		 * do not), consumed by isFactorySeededValue().
		 */
		const factorySealed = new Set();
		/**
		 * In-memory mirror of the persistent provenance snapshot (key -> seeded
		 * value). Populated by loadFactorySnapshot() at boot, updated by the
		 * factory seeding, consumed by isFactorySeededValue()/hasUserState().
		 */
		const factorySnapshot = new Map();
		/**
		 * Host-push gate (blue-team B1 race): the boot-time factory seeding
		 * must never leak into a push, and the host GET may not have resolved
		 * when the first debounced push would fire — pushing before adoption
		 * would write the provisional factory state over the user's durable
		 * file. Factory writes are simply NEVER pushed (isFactorySeededValue
		 * filters them out of every patch); the gate additionally holds any
		 * user write that lands before the probe settles, then flushes it.
		 */
		let hostProbeSettled = false;
		let pendingHostSync = false;
		/** Debounce timer for host pushes. */
		let hostSyncTimer = null;
		/** Callback invoked after the host state is applied (set by apply). */
		let onHostReady = null;

		/** Schedule a debounced push of the USER state to the host. */
		function scheduleHostSync() {
			if (!hostProbeSettled) {
				// Boot probe in flight: stash the request, the settled handler
				// pushes once with the merged state.
				pendingHostSync = true;
				return;
			}
			if (hostSyncTimer !== null) return;
			hostSyncTimer = setTimeout(() => {
				hostSyncTimer = null;
				pushStateToHost();
			}, 200);
		}

		/** Push the USER state (factory provenance stripped) to the host file. */
		async function pushStateToHost() {
			const patch = {};
			for (const [key, value] of stateCache) {
				// Only keys actually WRITTEN this session may go out. A read caches
				// absent keys as null (readStorage); pushing those nulls would ERASE
				// the user's durable accent/packs/favorites/history on the host the
				// moment any late write flushes after a slow/failed probe
				// (post-release review 🟠-2). A deliberate user clear goes through
				// writeStorage(key, null) and IS in writtenKeys — still pushed.
				if (!writtenKeys.has(key)) continue;
				// Factory seeds and the provenance bookkeeping are never the
				// user's config — pushing them would bake the shipped look into
				// dream-skin.json (blue-team B1/A1) or leak internals.
				if (isFactorySeededValue(key, value)) continue;
				if (key === FACTORY_APPLIED_KEY || key === FACTORY_SNAPSHOT_KEY) continue;
				patch[key] = value;
			}
			// Nothing user-owned to persist (pure factory boot): skip the
			// round-trip entirely instead of pushing an empty/seed-only patch.
			if (Object.keys(patch).length === 0) return;
			try {
				await fetch(HOST_API, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ method: "set", patch })
				});
			} catch {
				// host unavailable — the cache + localStorage still hold the values
			}
		}

		/** Fetch the host state at boot and adopt keys not written this session. */
		async function loadFromHost() {
			// Blue-team T2/A4 + post-release review 🟠-1: the probe must not hang
			// forever — a stalled host (accepts the connection, never answers, or
			// delivers headers but stalls the body) would keep the push gate shut
			// for the whole session and silently defer every user write to the
			// next boot. The 4s cap covers BOTH fetch and res.json(); the losing
			// timer is always cleared below.
			const probe = (async () => {
				const res = await fetch(HOST_API, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ method: "get" })
				});
				return res.json();
			})();
			// If the timeout wins the race, a LATER probe failure (e.g. slow
			// connect error after 4s) must not surface as an unhandled rejection.
			probe.catch(() => {});
			let timeoutId = null;
			let parsed;
			try {
				parsed = await Promise.race([
					probe,
					new Promise((_, reject) => {
						timeoutId = setTimeout(() => reject(new Error("host probe timeout")), 4000);
					})
				]);
			} catch {
				// host unreachable / timed out — keep using localStorage
				clearTimeout(timeoutId);
				// A timed-out probe's rejection is already consumed by the race;
				// nothing else can observe it. Release the gate and bail.
				hostProbeSettled = true;
				// Issue #51: the probe is the wallpaper-seed gate's only trigger on
				// this path too — an unreachable host on a TRUE first install must
				// still get the shipped wallpaper (just later), and a dynamic-port
				// restart whose host is briefly unavailable must not be left
				// wallpaper-less forever. report=false = "no host decision seen".
				if (typeof seedDeferredFactoryWallpaper === "function") {
					try { seedDeferredFactoryWallpaper(false); } catch {}
				}
				if (pendingHostSync) {
					pendingHostSync = false;
					scheduleHostSync();
				}
				return;
			}
			clearTimeout(timeoutId);
			timeoutId = null;
			try {
				if (parsed === null || typeof parsed !== "object" || parsed.ok !== true || typeof parsed.value !== "object" || parsed.value === null) {
					// B-6 (external review): this is a "no usable host answer"
					// exit, exactly like the timeout catch — the deferred
					// factory seed must fire here too, or a true first install
					// whose host answers `{ok:false}` spends the whole session
					// without the shipped wallpaper. The call is one-shot
					// (self-nulling), so the finally/other exits cannot
					// double-seed.
					if (typeof seedDeferredFactoryWallpaper === "function") {
						try { seedDeferredFactoryWallpaper(false); } catch {}
					}
					return;
				}
				// The host answer has arrived and is about to be adopted: writes
				// from here on are user-state, not provisional. Set BEFORE the
				// deferred-seed / onHostReady re-run so the wallpaper migration
				// inside restorePersistedState pushes as a user-state write
				// (9.26.1 adjudication P0-4).
				hostProbeSettled = true;
				const hostKeys = Object.keys(parsed.value);
				let adopted = false;
				for (const [key, value] of Object.entries(parsed.value)) {
					// Factory-seeded keys are PROVISIONAL (blue-team B1): the durable
					// host value always wins over the "first paint" seed, otherwise a
					// desktop restart (fresh origin = empty localStorage = factory
					// seeding) would shadow AND then destroy the user's real config.
					if (writtenKeys.has(key) && !factorySealed.has(key)) continue;
					const str = value === null ? null : typeof value === "string" ? value : String(value);
					// Adoption is a write path too (9.26.1, third-party T-03): a
					// tampered or legacy state file must not smuggle a
					// resource-fetching gradient/URL past the setWallpaperKind
					// gate. Empty/null = "user cleared" — stays admissible; the
					// render gate already ignores junk values.
					if (key === WALLPAPER_GRADIENT_KEY && str !== null && str !== "" && !isSafeWallpaperGradient(str)) continue;
					if (key === WALLPAPER_URL_KEY && str !== null && str !== "" && !isSafeWallpaperUrl(str)) continue;
					// Adopting over a factory seed releases the seal AND the provenance:
					// the durable value is the user's, not the shipped look.
					factorySealed.delete(key);
					removeFactoryProvenance(key);
					stateCache.set(key, str);
					try {
						if (str === null) window.localStorage.removeItem(key);
						else window.localStorage.setItem(key, str);
					} catch {
						// storage unavailable — cache still holds the value
					}
					adopted = true;
				}
				// Migration: an empty host file means this is the first boot with
				// host persistence — seed it with whatever the local (same-origin)
				// state holds so previously set preferences survive origin changes.
				// A pure-factory boot (nothing durable yet) must NOT push: the
				// factory seed would then be written into the host file as if it
				// were the user's own config (blue-team B1). pushStateToHost now
				// filters factory provenance anyway, so this is belt-and-braces.
				if (hostKeys.length === 0 && hasUserState()) pushStateToHost();
				// Issue #51: the probe settled with a REAL host answer — consume
				// the deferred wallpaper seed now. Any wallpaper key present in
				// the host state (even null = user-cleared) means the host is
				// authoritative and the factory look must NOT resurrect; absent
				// means no wallpaper decision exists (true first install) — seed
				// the shipped look now, a few hundred ms into the session, so
				// first-install users still get it and dynamic-port restarts
				// never flash it over a durable value.
				let deferredWrote = false;
				if (typeof seedDeferredFactoryWallpaper === "function") {
					try {
						deferredWrote = seedDeferredFactoryWallpaper(
							DEFERRED_WALLPAPER_KEYS.some((k) => Object.prototype.hasOwnProperty.call(parsed.value, k))
						) === true;
					} catch {}
				}
				// Re-run the visual restore when the deferred seed ACTUALLY wrote
				// (adopted is false on a fresh install — nothing was adopted, but
				// the wallpaper just landed and the first paint needs it).
				if ((adopted || deferredWrote) && typeof onHostReady === "function") onHostReady();
				// Re-publish the diagnostics snapshot: the boot-time publish (apply
				// head) predates the host answer, so shell/skin must be refreshed
				// with the adopted values (9.26.1, blue-team B-01).
				publishStatus();
			} catch {
				// host unreachable / timed out — keep using localStorage
			} finally {
				// Release the push gate regardless of outcome (adopted / empty /
				// unreachable): user writes after this point push as usual.
				hostProbeSettled = true;
				if (pendingHostSync) {
					pendingHostSync = false;
					scheduleHostSync();
				}
			}
		}

		/** Load the persistent factory provenance snapshot into memory. */
		function loadFactorySnapshot() {
			try {
				const raw = window.localStorage.getItem(FACTORY_SNAPSHOT_KEY);
				const parsed = raw === null ? null : JSON.parse(raw);
				if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
					for (const [key, value] of Object.entries(parsed)) factorySnapshot.set(key, String(value));
				}
			} catch {
				// corrupt / unavailable storage — provenance falls back to empty
			}
		}

		/** Drop one key from the persistent provenance snapshot and persist it. */
		function removeFactoryProvenance(key) {
			if (!factorySnapshot.delete(key)) return;
			saveFactorySnapshot();
		}

		/**
		 * Write-volume control for the provenance snapshot (issue #84).
		 *
		 * `persistFactorySnapshot()` serialises the WHOLE map, and every
		 * factory-tagged write used to call it once. Seeding seven authored
		 * defaults therefore rewrote one storage key seven times: measured, 7 of
		 * the 19 `localStorage.setItem` calls a single skin switch cost. The
		 * count depends on how many keys that switch seeds, which is why it read
		 * as three mutually contradictory numbers across reviews — the write is
		 * real, only its *shape* was wrong.
		 *
		 * Inside a batch the in-memory map still updates immediately (so
		 * `isFactorySeededValue()` sees every key), and the serialisation
		 * happens once, on the way out. The `finally` makes an exception in the
		 * middle flush anyway rather than lose provenance.
		 */
		let snapshotBatchDepth = 0;
		let snapshotBatchDirty = false;

		function persistFactorySnapshot() {
			try {
				const obj = {};
				for (const [key, value] of factorySnapshot) obj[key] = value;
				window.localStorage.setItem(FACTORY_SNAPSHOT_KEY, JSON.stringify(obj));
			} catch {
				// storage unavailable / quota — provenance degrades gracefully
			}
		}

		/** Persist the provenance snapshot (best effort; never throws). */
		function saveFactorySnapshot() {
			if (snapshotBatchDepth > 0) {
				snapshotBatchDirty = true;
				return;
			}
			persistFactorySnapshot();
		}

		/** Run `fn` with every provenance write collapsed into one persistence. */
		function withFactorySnapshotBatch(fn) {
			snapshotBatchDepth += 1;
			try {
				return fn();
			} finally {
				snapshotBatchDepth -= 1;
				if (snapshotBatchDepth === 0 && snapshotBatchDirty) {
					snapshotBatchDirty = false;
					persistFactorySnapshot();
				}
			}
		}

		/**
		 * Whether the given key currently holds a value that traces back to the
		 * factory seeding rather than to the user. Cross-session safe: consults
		 * the PERSISTENT snapshot (value match), falling back to this session's
		 * seal set for writes that have not been snapshotted yet.
		 */
		function isFactorySeededValue(key, value) {
			if (value === null) return false;
			if (factorySnapshot.has(key)) return factorySnapshot.get(key) === value;
			if (factorySealed.has(key)) return true;
			// Snapshot not loaded (or lost): treat an exact current FACTORY_DEFAULT
			// value on a never-user-touched key as factory provenance — a user who
			// manually re-entered the identical shipped value is conservatively
			// treated as factory (harmless: the value is identical by definition).
			if (!writtenKeys.has(key)) {
				const factoryValue = Object.prototype.hasOwnProperty.call(FACTORY_DEFAULTS, key) ? FACTORY_DEFAULTS[key] : undefined;
				if (factoryValue !== undefined && value === factoryValue) return true;
			}
			return false;
		}

		/**
		 * Whether the cache holds ANY user-owned value (blue-team B1/T1): used
		 * to decide if an empty host file should be seeded from local state.
		 * Factory-seeded values — by session seal OR persistent provenance — do
		 * not count, so a same-origin reload after the one-shot seeding (where
		 * no factory write runs and the session seal set is empty) still cannot
		 * bake the shipped look into the host file.
		 */
		function hasUserState() {
			for (const [key, value] of stateCache) {
				if (value === null) continue;
				if (key === FACTORY_APPLIED_KEY || key === FACTORY_SNAPSHOT_KEY) continue;
				if (factorySealed.has(key)) continue;
				if (factorySnapshot.has(key) && factorySnapshot.get(key) === value) continue;
				return true;
			}
			return false;
		}

		/** Read a value (cache first, localStorage seed, null on absence). */
		function readStorage(key) {
			if (stateCache.has(key)) return stateCache.get(key);
			let value = null;
			try {
				value = window.localStorage.getItem(key);
			} catch {
				// storage unavailable
			}
			stateCache.set(key, value);
			return value;
		}

		/** Write (or remove with null) a value: cache + localStorage now, host later. */
		function writeStorage(key, value, opts = {}) {
			stateCache.set(key, value);
			writtenKeys.add(key);
			// Factory seeds are provisional (blue-team B1): tagged so the boot
			// host-probe can outrank them; any later user write unseals the key
			// and clears the persistent provenance (the user owns it now).
			if (opts.factory) {
				factorySealed.add(key);
				// Track provenance durably (blue-team T1): the value must still be
				// recognizable as factory-seeded after a same-origin reload, where
				// the session seal set is gone.
				factorySnapshot.set(key, value);
				saveFactorySnapshot();
			} else {
				factorySealed.delete(key);
				removeFactoryProvenance(key);
			}
			try {
				if (value === null) window.localStorage.removeItem(key);
				else window.localStorage.setItem(key, value);
			} catch {
				// storage unavailable / quota — the cache still holds the value
			}
			// Factory seeding must NEVER schedule a host push (blue-team A1):
			// the shipped look is first-paint sugar, not user config — pushing
			// it would bake it into dream-skin.json (and pendingHostSync would
			// flush it right after the boot probe settles).
			if (opts.factory) return;
			scheduleHostSync();
		}

		/** Saved skin id (may be unknown/absent). */
		function readSavedSkin() {
			return readStorage(STORAGE_KEY);
		}

		/** Whether a known (third-party) skin id is currently saved & not system. */
		function readSavedSkinValid() {
			const saved = readSavedSkin();
			if (typeof saved !== "string" || saved === DEFAULT_SKIN) return false;
			return SKINS.some((skinDefinition) => skinDefinition.id === saved) || importedPacks.some((p) => p.id === saved);
		}

		/** Persist a skin choice; DEFAULT_SKIN clears the stored value. */
		function writeSavedSkin(id) {
			writeStorage(STORAGE_KEY, id === DEFAULT_SKIN ? null : id);
			publishStatus();
		}

		/**
		 * Publish a read-only diagnostics snapshot on `window` for host/desktop
		 * tooling (issue-docs: docs/desktop-support.md). Official desktop
		 * diagnostics can read `window.__DSH_DREAM_SKIN_STATUS__` instead of
		 * scraping console output; Electron preload bridges can forward it without
		 * the plugin ever making a network request. Purely additive: every field
		 * is derived from state the plugin already keeps, the object is replaced
		 * (never mutated in place), and any failure is swallowed — a broken
		 * diagnostics channel must never take down the skin itself.
		 */
		// B-4 (external review): `ready` used to be signed at the HEAD of
		// apply(), so a mid-apply failure left the snapshot claiming health.
		// The token is now issued only when apply() ran to completion; until
		// then the snapshot honestly reads `applying`. This flag must never
		// make apply throw — the diagnostics accuracy is subordinate to the
		// 9.9.0-R3 guarantee that the plugin cannot take the shell down.
		let applyCompleted = false;
		function publishStatus(extra) {
			try {
				if (typeof window === "undefined") return;
				const prev = window[STATUS_GLOBAL_KEY] || {};
				const next = {
					plugin: "dsh-dream-skin",
					build: PLUGIN_BUILD,
					status: applyCompleted ? "ready" : "applying",
					// B-3 (external review): the READY snapshot carries the
					// same field set as the degraded one — strict consumers
					// may read `reason`/`lastError` unguarded on either side.
					// A schema key-set equality test pins both.
					reason: null,
					lastError: null,
					shell: isDesktopShell() ? "desktop" : "web",
					skin: readSavedSkin() || DEFAULT_SKIN,
					anchors: prev.anchors || null,
					checkedAt: prev.checkedAt || null,
					// Set by the settings-nav icon IIFE below (it cannot call this
					// function): how many icon sheets / marked buttons the hook sees.
					// Lets desktop tooling tell "hook is dead" from "the settings panel
					// simply is not open" — 0 markers with 0 dialogs is a design state.
					navIcon: window[NAV_STATUS_KEY] || null,
					publishedAt: Date.now()
				};
				if (extra) Object.assign(next, extra);
				window[STATUS_GLOBAL_KEY] = next;
			} catch {}
		}

		/** Wallpaper data URL (null when unset). */
		function readWallpaper() {
			const value = readStorage(WALLPAPER_KEY);
			return value !== null && value.length > 0 ? value : null;
		}

		/** Wash opacity 0..1 (clamped; default when unset). */
		function readWallpaperOpacity() {
			const raw = readStorage(WALLPAPER_OPACITY_KEY);
			if (raw === null) return DEFAULT_WALLPAPER_OPACITY;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_WALLPAPER_OPACITY;
		}

		/** Blur radius in px (clamped to 0..60; default when unset). */
		function readWallpaperBlur() {
			const raw = readStorage(WALLPAPER_BLUR_KEY);
			if (raw === null) return DEFAULT_WALLPAPER_BLUR;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(60, Math.max(0, value)) : DEFAULT_WALLPAPER_BLUR;
		}
		/** Sidebar wash opacity 0..1 (clamped; default when unset). */
		function readSidebarOpacity() {
			const raw = readStorage(SIDEBAR_OPACITY_KEY);
			if (raw === null) return DEFAULT_SIDEBAR_OPACITY;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_SIDEBAR_OPACITY;
		}

		/** Whether the sidebar wash opacity is linked to the main canvas (default: no — issue #55). */
		function readSidebarLink() {
			const raw = readStorage(SIDEBAR_LINK_KEY);
			if (raw === null) return DEFAULT_SIDEBAR_LINK !== 0;
			const n = Number(raw);
			return Number.isFinite(n) ? n !== 0 : (DEFAULT_SIDEBAR_LINK !== 0);
		}

		/**
		 * Whether a wallpaper wash is on screen right now. The sidebar fill is
		 * only overridden while one exists (`shadeTokens2()` is what publishes
		 * `--dsw-specific-sidebar-fill`), so this also decides whether the
		 * sidebar-transparency slider can change anything at all (issue #55
		 * review, P1-1/P1-2).
		 */
		function hasWallpaperWash() {
			return wallpaperBackgroundCss() !== null;
		}

		/**
		 * Persist the sidebar wash opacity AND release the canvas link, in the
		 * one order that keeps a drag honest (issue #55). While linked,
		 * `shadeTokens2()` uses the CANVAS alpha and ignores
		 * SIDEBAR_OPACITY_KEY, so storing the value without releasing the link
		 * would persist a number that never reaches a pixel — the "有反馈、无效果"
		 * complaint this issue is about.
		 *
		 * The release is skipped when no wash exists: with no wash on screen the
		 * sidebar fill is not overridden at all, so flipping the user's stored
		 * preference there would change a setting without changing anything
		 * visible. Shared by BOTH slider surfaces (wallpaper row + glass row) so
		 * they cannot drift apart.
		 *
		 * @returns {number} the clamped opacity that was stored.
		 */
		function writeSidebarOpacityForSlider(percent) {
			const value = Math.min(1, Math.max(0, Number(percent) / 100));
			writeStorage(SIDEBAR_OPACITY_KEY, String(value));
			if (hasWallpaperWash() && readSidebarLink()) writeStorage(SIDEBAR_LINK_KEY, "0");
			return value;
		}

		/** Popup / option-card fill opacity 0..1 (clamped; default when unset). */
		function readModalOpacity() {
			const raw = readStorage(MODAL_OPACITY_KEY);
			if (raw === null) return DEFAULT_MODAL_OPACITY;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_MODAL_OPACITY;
		}

		/** Persist the popup fill opacity (0..1, clamped) and cache it in-process. */
		function writeModalOpacity(value) {
			const clamped = Math.min(1, Math.max(0, Number(value)));
			writeStorage(MODAL_OPACITY_KEY, String(clamped));
			return clamped;
		}

		/** Composer (chat input) fill opacity 0..1 (clamped; default when unset). */
		function readComposerOpacity() {
			const raw = readStorage(COMPOSER_OPACITY_KEY);
			if (raw === null) return DEFAULT_COMPOSER_OPACITY;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_COMPOSER_OPACITY;
		}

		/** Persist the composer fill opacity (0..1, clamped). */
		function writeComposerOpacity(value) {
			const clamped = Math.min(1, Math.max(0, Number(value)));
			writeStorage(COMPOSER_OPACITY_KEY, String(clamped));
			return clamped;
		}

		/**
		 * Apply the persisted composer fill weight onto `:root` as COMPOSER_FILL_VAR.
		 * The injected material CSS mixes the active base color at this percentage
		 * into the composer card fill, so the chat input's translucency (and the
		 * legibility of what you type) becomes user-adjustable.
		 */
		function applyComposerOpacity() {
			// Issue #67 follow-up: the slider's promise is "leftmost = most solid",
			// but liquid's CSS-side multiply (fill% × fillScale 0.15) meant even a
			// 100% weight only ever painted a 15% fill — the window content bled
			// straight through the input area no matter how far left the slider
			// went, and 85% of the slider's travel did almost nothing. Publish the
			// EFFECTIVE weight, remapped per material instead:
			//   effective = raw + (1 − raw) × floor, floor = fillScale < 1 ? fillScale : 0
			// Frosted (scale 1 → floor 0): effective = raw — EXACTLY the old
			// behaviour. Liquid (floor 0.15): keeps its clear-glass floor at the
			// transparent end but climbs to a truly opaque 100% fill at the solid
			// end. (A naive s + raw×(1−s) would pin frosted at 100% forever — the
			// floor form is deliberate.) The ::before rule no longer multiplies.
			const rawWeight = readComposerOpacity();
			const preset = MATERIAL_PRESETS.find((p) => p.id === readMaterialPreset()) || MATERIAL_PRESETS[0];
			const fillScale = preset.fillScale != null ? preset.fillScale : 1;
			const floor = fillScale < 1 ? fillScale : 0;
			const weight = Math.round((rawWeight + (1 - rawWeight) * floor) * 100);
			try {
				document.documentElement.style.setProperty(COMPOSER_FILL_VAR, `${weight}%`);
				// Round-17: on liquid the slider means glass THICKNESS — more
				// opaque = more backdrop blur (+0..24px). The var is consumed
				// only by the liquid ::before rule, so frosted is unaffected;
				// the text behind stays fogged (real backdrop-filter), and the
				// wallpaper's own blur stacks naturally inside the sample.
				const thickness = Math.round(rawWeight * 24);
				document.documentElement.style.setProperty(LIQUID_THICKNESS_VAR, `${thickness}px`);
			} catch {
				// document null in a headless eval — the CSS fallback still applies
			}
		}

		/**
		 * Push the live glass blur radius onto `:root` as GLASS_BLUR_VAR.
		 * Round-5: the radius comes from the USER'S 壁纸模糊 slider — the ONE
		 * blur knob for everything (wallpaper layer, composer frost, popup
		 * frost). The material chip only switches the material CHARACTER
		 * (saturation/brightness of the glass); it never owns a blur number,
		 * so switching materials can never move any slider value (user decision:
		 * "切材质不许改数值"). Kept the DEFAULT_GLASS_BLUR fallback for profiles
		 * with no stored blur yet.
		 */
		/**
		 * Round-17: the SVG displacement-refraction experiment is REMOVED.
		 * Chromium does not support `backdrop-filter: url(#…)` (the rule was
		 * silently dropped whole), and the `filter: url()` wallpaper-replica
		 * replacement destroyed `background-attachment: fixed` alignment and
		 * erased the DOM text behind the pane (user screenshots round-16).
		 * Liquid glass now expresses "refraction" the one way Chromium CAN:
		 * backdrop-filter with a per-material blur thickness (round-17 below).
		 */

		function applyMaterialBlur() {
			// Null/empty storage must fall back to DEFAULT — Number(null)===0
			// would otherwise force every glass surface to 0px at boot.
			const rawStr = readStorage(WALLPAPER_BLUR_KEY);
			const raw = rawStr == null || rawStr === "" ? NaN : Number(rawStr);
			const blur = Number.isFinite(raw) ? Math.min(60, Math.max(0, raw)) : DEFAULT_GLASS_BLUR;
			// Tone = the ACTIVE material's character tail; frosted when unset.
			const preset = MATERIAL_PRESETS.find((p) => p.id === readMaterialPreset()) || MATERIAL_PRESETS[0];
			// Round-10: per-material BLUR scale — liquid is THIN glass (×0.25):
			// heavy blur is what made it read as white frosted glass; refraction
			// needs the backdrop mostly sharp underneath.
			const scale = preset.blurScale != null ? preset.blurScale : 1;
			const scaled = Math.round(blur * scale * 10) / 10;
			try {
				document.documentElement.style.setProperty(GLASS_BLUR_VAR, `${scaled}px`);
				document.documentElement.style.setProperty(GLASS_TONE_VAR, preset.tone || MATERIAL_PRESETS[0].tone);
				// Round-8 / 10.5.1: the glass FILL color per material (both
				// materials fill with the scheme-aware skin base — liquid's
				// old neutral white boarded up as PURE WHITE once the slider's
				// solid end truly reached 100%; see MATERIAL_PRESETS).
				document.documentElement.style.setProperty(GLASS_TINT_VAR, preset.tint || MATERIAL_PRESETS[0].tint);
				// Material marker (round-7 refraction boost): lets CSS key
				// material-specific refinements (the liquid glass edge highlight)
				// off the active material without extra plumbing.
				document.documentElement.setAttribute("data-dsh-material", preset.id);
			} catch {
				// document null in a headless eval — the CSS fallback still applies
			}
		}

		/**
		 * Read the chosen glass material preset id (frosted when unset/unknown;
		 * legacy "default" ids from earlier builds map onto frosted, which now
		 * IS the default material).
		 *
		 * Deliberately NO value migration at boot (blue-team D5, revised): the
		 * chip now means MATERIAL IDENTITY, not exact numbers — sliders are
		 * fine-tunes within the material, so a user's stored values "drifting"
		 * from the preset combo is by design, and overwriting them (the first
		 * migration attempt) clobbered real user preferences and broke the
		 * wallpaper-wash defaults. The glass blur cannot go dark on a fresh
		 * install regardless: applyMaterialBlur() always derives it from the
		 * active preset, never from the stored wallpaper blur.
		 */
		function readMaterialPreset() {
			const raw = readStorage(MATERIAL_PRESET_KEY);
			return MATERIAL_PRESETS.some((preset) => preset.id === raw) ? raw : DEFAULT_MATERIAL_PRESET;
		}

		/** Persist the glass material preset id. */
		function writeMaterialPreset(id) {
			writeStorage(MATERIAL_PRESET_KEY, MATERIAL_PRESETS.some((preset) => preset.id === id) ? id : null);
		}

		/** Read the last concrete built-in preference (`light`|`dark`|null). */
		function readBuiltinLast() {
			const raw = readStorage(BUILTIN_LAST_KEY);
			return raw === "light" || raw === "dark" ? raw : null;
		}

		/** Persist the last concrete built-in preference (or null to clear it). */
		function writeBuiltinLast(pref) {
			writeStorage(BUILTIN_LAST_KEY, pref === "light" || pref === "dark" ? pref : null);
		}
		//#endregion

		//#region dsh-dream-skin: wallpaper layer + token shading
		/** The fixed backdrop layer (z-index -1), created lazily. */
		let wallpaperEl = null;
		/**
		 * The bleed layer behind `wallpaperEl`, created only for the `blur` fill
		 * mode (issue #61). It carries the same image scaled to cover and heavily
		 * blurred, so a contained image never leaves hard-edged empty bands.
		 */
		let wallpaperBleedEl = null;
		/**
		 * Dynamic packages are assigned one token-override source by the production
		 * client runner, regardless of the source label passed by the package. Keep
		 * every Dream Skin contribution in one layer so wallpaper, popup opacity and
		 * accent do not replace one another there.
		 */
		const COMBINED_OVERRIDE_SOURCE = "dsh-dream-skin:appearance";
		let combinedOverrideDispose = null;
		let combinedOverrideApplying = false;
		let wallpaperTokenOverrides = {};
		let popupTokenOverrides = {};
		let accentTokenOverrides = {};

		function rawActiveTheme(snapshot) {
			// `preference` is the authoritative selected theme id. In the production
			// dynamic-package event facade, `snapshot.active` can already be the
			// composed presentation object (and has been observed without a usable
			// third-party id). Looking it up by `active.id` then falls through to the
			// composed tokens and feeds our previous wallpaper wash back into the next
			// skin. Prefer the registered definition selected by `preference`; only use
			// active.id for `system`, where it resolves to the concrete light/dark theme.
			const savedId = readSavedSkin();
			const selectedId = typeof savedId === "string" && savedId !== DEFAULT_SKIN
				? savedId
				: snapshot.preference === "system"
				? snapshot.active?.id
				: snapshot.preference;
			return snapshot.themes?.find((theme) => theme.id === selectedId)
				|| snapshot.themes?.find((theme) => theme.id === snapshot.active?.id)
				|| snapshot.active;
		}

		function applyCombinedTokenOverrides(ctx) {
			if (combinedOverrideApplying) return;
			combinedOverrideApplying = true;
			try {
				const overrides = {
					...popupTokenOverrides,
					...accentTokenOverrides,
					...wallpaperTokenOverrides
				};
				if (Object.keys(overrides).length > 0) {
					const previousDispose = combinedOverrideDispose;
					combinedOverrideDispose = ctx.theme.overrideTokens(COMBINED_OVERRIDE_SOURCE, overrides);
					previousDispose?.();
				} else {
					combinedOverrideDispose?.();
					combinedOverrideDispose = null;
				}
			} finally {
				combinedOverrideApplying = false;
			}
		}
		/** The injected liquid-glass <style> node (leaf-card backdrop blur). */
		let materialStyleEl = null;
		/**
		 * S-3 (external review 9.27.0 round 3): dispose handle for the ONE live
		 * late-correction observer (R-2). The probe chain is per-`apply()`, so
		 * without a module-scope handle a remount could leave a stale observer
		 * watching `document.body` after fiber teardown — the opposite of this
		 * project's "no residue on unload" tenet.
		 *
		 * T-2 (external review 9.27.0 round 4): this handle is FACTORY scope (one
		 * per module instance), NOT page scope. "At most one live observer" therefore
		 * holds per instance, and that is deliberate: R-5's warn-dedupe set went to
		 * `window` because "one cap per page" IS its semantics, whereas two live
		 * plugin instances on one page is already an abnormal double-load — not a
		 * state worth widening the public `window` contract for.
		 */
		let lateCorrectionDispose = null;
		/**
		 * T-1 (external review 9.27.0 round 4): dispose handle for the drift
		 * ladder's OWN pending setTimeout. S-3 disarmed the late-correction
		 * observer on unload, but the ladder was still invisible to teardown, so an
		 * unmount inside the ~4.3s window let the remaining rounds keep rewriting
		 * `checkedAt` — a consumer would then read a "fresh" snapshot from a plugin
		 * that no longer exists. Same factory scope and same single-owner rule.
		 */
		let driftLadderDispose = null;

		/**
		 * Parse a hex or rgb()/rgba() color into rgba() with the given alpha;
		 * null when the input is not one of those two syntaxes.
		 *
		 * 10.5.1: split out of toRgba so the layer-2 driver can DETECT the
		 * unparseable case instead of silently pinning the original value.
		 * Pack themes may legally declare hsl()/hsla() (docs/themes-spec.md
		 * accepts them via looksLikeColor), and the legacy fallback below
		 * ships such a value through UNCHANGED — alpha included — so the
		 * popup slider would read as "dead" on those skins.
		 */
		function toRgbaStrict(color, alpha) {
			const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
			if (hex !== null) {
				let digits = hex[1];
				if (digits.length === 3) digits = digits.split("").map((char) => char + char).join("");
				const n = parseInt(digits, 16);
				return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
			}
			const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(color.trim());
			if (rgb !== null) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
			return null;
		}

		/**
		 * Legacy wrapper: parse, or return the input trimmed on failure (the
		 * historical "silent pin" behaviour other callers rely on for built-in
		 * hex values that always parse anyway).
		 */
		function toRgba(color, alpha) {
			return toRgbaStrict(color, alpha) ?? color.trim();
		}

		/**
		 * The base color for one scheme: the active skin's `--dsw-alias-bg-base`
		 * when it owns that scheme, otherwise the built-in base. The wash always
		 * carries the active skin's tint (and re-shades on theme/change).
		 */
		function resolveBase(scheme, active) {
			if (active.colorScheme === scheme && typeof active.tokens["--dsw-alias-bg-base"] === "string") {
				return active.tokens["--dsw-alias-bg-base"];
			}
			return BUILTIN_BASE[scheme];
		}
		function resolveSidebar(scheme, active) {
			if (active.colorScheme === scheme && typeof active.tokens["--dsw-specific-sidebar-fill"] === "string") {
				return active.tokens["--dsw-specific-sidebar-fill"];
			}
			return resolveBase(scheme, active);
		}

		/** Remove the wallpaper layer and its token contribution. */
		function teardownWallpaper(ctx = null) {
			wallpaperEl?.remove();
			wallpaperEl = null;
			wallpaperBleedEl?.remove();
			wallpaperBleedEl = null;
			wallpaperTokenOverrides = {};
			// Retract the root wash marker together with the token layer it describes,
			// so the Windows frame rule above stops applying the moment it goes.
			const wasWashed = washActive;
			setWashActive(false);
			if (ctx !== null) applyCombinedTokenOverrides(ctx);
			// Issue #100: clearing the wallpaper drops the readability floor, and
			// removeWallpaper() reaches here WITHOUT going through applyWallpaper2 —
			// so this is the other half of the gate, not a leftover. Without it the
			// dialog stayed at 0.92 with no wash on screen (the smoke gate drives this
			// exact path through the Wallpaper row's clear action).
			if (wasWashed) republishFlooredChannels(ctx);
		}

		//#region dsh-dream-skin: liquid-glass material CSS
		/**
		 * Ingest a self-contained <style> that gives DSH's leaf "cards" a premium
		 * liquid-glass material: a semi-translucent fill (set per-skin via
		 * `--dsw-specific-input-major`) combined with `backdrop-filter: blur()`
		 * so the diffused-glow wallpaper frosts through. Two safety rules, learned
		 * from the earlier regression:
		 *   1. We only target LEAF cards that do NOT host a `position:fixed`
		 *      descendant. `backdrop-filter` (like `filter`/`transform`) turns
		 *      the element into a containing block, so a fixed-positioned child
		 *      is laid out relative to the card instead of the viewport. The
		 *      composer card (`.uV2eYG_card`) deliberately carries the stop /
		 *      send button Tooltips — fixed popovers — and blurring it made
		 *      them anchor to the card and spill to the bottom-right corner,
		 *      shoving the composer out of layout. So the material blur applies
		 *      to the inline-warning card (`.bqrRRG_card`) and the todo
		 *      popover/dock (`.lXshSW_root`, `._7yHdaG_panel`) but NOT to the
		 *      composer card; the composer keeps its translucent token fill.
		 *      (The earlier bug was blurring LARGE columns that contained the
		 *      fixed settings modal.)
		 *   2. `@supports` guards browsers without backdrop-filter; if a hashed
		 *      class name changes in a future DSH the selectors no-op (blur just
		 *      stops) without ever breaking layout.
		 * The settings modal is NOT blurred here — it already carries DSH's own
		 * mask blur and a high-opacity layer-2 fill so it stays readable.
		 */
		const MATERIAL_CSS_SOURCE = "dsh-dream-skin:material:liquid-glass";
		/**
		 * Root attribute meaning "a wallpaper wash is on screen right now". Set by
		 * shadeTokens2() together with the wash token layer it describes, cleared by
		 * teardownWallpaper(); read by the Windows title-bar frame rule below.
		 */
		const WASH_ACTIVE_ATTR = "data-dsh-dream-skin-wash";
		/**
		 * Mirror of that attribute for the JS side. The CSS can read the attribute;
		 * the token channels cannot, so the readability floor (issue #98) reads THIS
		 * instead of re-deriving "is there a wallpaper" from a second source. Only
		 * setWashActive() writes it, next to the attribute it describes, so the two
		 * can never disagree about which wash is on screen.
		 */
		let washActive = false;
		/**
		 * Set by apply() so a wash flip can re-render the opacity rows while the
		 * settings dialog is open (adding a wallpaper from the Wallpaper row must
		 * retune the 弹窗滑杆's floor marker without remounting the glass row).
		 */
		let onWashFlip = null;
		/**
		 * The Windows title-bar AppFrame, located by the shell's OWN stable stamp
		 * rather than by a re-rolled hash class: `[data-shell-overlay]` is a direct
		 * child of that frame element (the Electron preload anchors the caption
		 * menubar on the same stamp), so the rule survives DSH's build-hash churn.
		 * `:has()` is guaranteed in this mode — the host's own Windows CSS already
		 * relies on it (ui-sidebar: `html[data-windows-titlebar]:has(…)`).
		 */
		const APP_FRAME_SELECTOR = "div:has(> [data-shell-overlay])";
		/**
		 * The session list's foot fade, anchored WITHOUT a build hash (issue #97).
		 * The host renders `<span class="<hash>_fade">` with that single class
		 * token, so matching the end of the attribute survives the re-roll that has
		 * already outlived three hashes in this file (`qDHVXG_fade` is the one still
		 * written down below, and it measures 0 hits on every host this release
		 * ships against — which is how the band came back). It deliberately does
		 * NOT match the chat package's `*_fadeTop` / `*_fadeBottom` scroll hooks:
		 * those are different tokens and they mask instead of painting.
		 */
		const SESSION_FADE_SELECTOR = "[class$=\"_fade\"]";
		/**
		 * How many fade elements the snapshot names (issue #105). The COUNT is exact and
		 * unbounded; the class tokens are a sample, because this rides in a status object
		 * a tool may poll and a pathological page should not inflate it.
		 */
		const FADE_REPORT_LIMIT = 8;
		// Issue #50 (user on dsh 0.1.5-rc.2): every host hash class in MATERIAL_CSS
		// (`uV2eYG_card`, `Mbwy4a_card`, …) had been re-rolled away by the time
		// 0.1.5 shipped — the composer glass rules matched NOTHING, so the
		// 输入框透明度 slider moved a var no rule consumed. Hashes can never be a
		// stable contract, so the glass rules now ALSO match our own attribute,
		// and JS marks the composer card by DOM shape (textarea anchor → nearest
		// rounded ancestor) instead of by class name. Old hosts keep working via
		// the hashes; on them the marker preferentially tags the SAME element the
		// hash rules hit, so the two selector families never double-paint.
		const COMPOSER_CARD_ATTR = "data-dsh-dream-skin-composer";
		// Adversarial-review F6: only TRUE composer cards belong here. The user
		// question option card (`.Mbwy4a_card`) was mistakenly listed before —
		// its 1939 opaque no-bleed fill is a DELIBERATE readability fix, and any
		// [attr] glass rule that lands on it later in the sheet would punch a
		// transparent hole through that design. It must never be tagged.
		const COMPOSER_HASH_CARDS = ".uV2eYG_card";
		/**
		 * 10.5.0, read out of the host bundle actually installed on the machine this
		 * release was prepared against (dsh 0.2.0-rc.1, the generation issue #62
		 * reported). This block also CORRECTS a diagnosis written earlier in the same
		 * cycle and disproved by the blue-team pass: the question card's build hash was
		 * NOT re-rolled (`dsh-client-ui-user-questions` still ships `"card":
		 * "Mbwy4a_card"`, while `LVzXQa_card` belongs to a DIFFERENT component in that
		 * package, PlanReviewPanel), and the host's own card background
		 * `--dsw-specific-input-major` is opaque static (#fff light / #2c2c2e dark).
		 * "The rule matched nothing, so the conversation bled through" was therefore
		 * never the mechanism. What was actually wrong on these surfaces:
		 *   1. our own fill mixed the wallpaper-washed `--dsw-alias-bg-base`
		 *      (= rgba(base, canvasAlpha)), so the 壁纸不透明度 slider compounded into
		 *      the card and 「弹窗不透明度 100%」 still read translucent — fixed by the
		 *      opaque `--dsh-dream-skin-modal-base` (FILL SOURCE at the rule below);
		 *   2. the approval card and the plan-review card had NO rule at all, so both
		 *      kept the host's neutral grey whatever the skin or the slider said;
		 *   3. the question card was covered by a build hash and nothing else, which is
		 *      precisely the anchor class issue #50 forbids — the next host generation
		 *      CAN re-roll it, and the history of this very file shows how that reads
		 *      in hindsight.
		 *
		 * All three now anchor on stamps the HOST publishes for these surfaces:
		 *   questions — `<div data-question-key>` whose child `<section>` carries
		 *     `aria-labelledby="question-<key>-<index>"` (the id of its own <h2>);
		 *   approval  — `<div data-approval-key>`, whose only child `<div>` is the card;
		 *   plan      — `<div data-plan-review-key>`, whose only child `<section>` is
		 *     the card.
		 * Requiring both halves for questions keeps the selector from ever adopting an
		 * unrelated labelled element. The legacy question hash stays as the OR-branch
		 * for hosts predating those stamps; `.LVzXQa_card` deliberately does NOT join
		 * it — pinning a hash that belongs to another component than the one the old
		 * rule claimed would bake the misdiagnosis into the sheet.
		 */
		const QUESTION_CARD_SELECTOR = "[data-question-key] [aria-labelledby^=\"question-\"]";
		const APPROVAL_CARD_SELECTOR = "[data-approval-key] > div";
		const PLAN_CARD_SELECTOR = "[data-plan-review-key] > section";
		// Issue #50 round 3: on dsh 0.1.5-rc.2 (also what dsh-desktop pins) the
		// chat input is NOT a <textarea> at all — it is a Lexical contenteditable
		// div rendered with a stable data attribute (`data-composer-input`,
		// verified in @deepseek-ai/dsh-client-ui-conversation@0.1.5-rc.2). The
		// textarea-only anchor therefore never matched on those hosts and the
		// slider stayed dead regardless of retries. Anchor on the fingerprint
		// FIRST, then fall back to a plain textarea and a generic editable
		// textbox for other host generations.
		const COMPOSER_ANCHOR_SELECTOR = "[data-composer-input], textarea, [contenteditable='true'][role='textbox']";
		function isInDialog(el) {
			try { return el.closest('[role="dialog"]') !== null; } catch { return false; }
		}
		function findVisibleComposerAnchors() {
			if (typeof document.querySelectorAll !== "function") return [];
			try {
				const out = [];
				const list = document.querySelectorAll(COMPOSER_ANCHOR_SELECTOR);
				for (const el of list) {
					if (el.offsetWidth <= 0 || el.offsetHeight <= 0) continue;
					// Adversarial-review F1: the generic fallbacks (textarea /
					// contenteditable) would otherwise adopt ANY visible editable
					// element — e.g. an input inside a settings dialog — and the
					// glass rules would strip that surface's background. The chat
					// composer never lives inside a dialog, so exclude that subtree.
					if (isInDialog(el)) continue;
					out.push(el);
				}
				return out;
			} catch { return []; }
		}
		function nearestComposerCard(anchor) {
			let card = null;
			try { card = anchor.closest(COMPOSER_HASH_CARDS); } catch {}
			if (card !== null) return card;
			// Hashes gone (new host): climb to the nearest visibly rounded
			// ancestor — the composer card is the only rounded pane around
			// the chat input. Pass 1 wants a clear round (>=8px); pass 2
			// relaxes to >=4px for hosts that wrap the input in a flatter
			// card (dsh-desktop frame chrome).
			for (const min of [8, 4]) {
				let node = anchor.parentElement;
				for (let hops = 0; node !== null && hops < 6; hops += 1, node = node.parentElement) {
					let radius = 0;
					try {
						if (typeof getComputedStyle === "function") {
							// Adversarial-review F3: CSSOM reports percentage radii
							// verbatim ("50%"), and parseFloat would read that as
							// 50px — a pill-shaped ancestor would pass the ≥8px
							// gate. Percentage radii are decorative, reject them.
							const raw = String(getComputedStyle(node).borderTopLeftRadius || "");
							radius = raw.indexOf("%") !== -1 ? 0 : (parseFloat(raw) || 0);
						}
					} catch {}
					if (radius >= min) {
						// F3: first-hit-wins could adopt a huge rounded container
						// (sidebar pane, message column). The composer card hugs
						// the input's width — reject anything far wider.
						try {
							if (anchor.offsetWidth > 0 && node.offsetWidth > anchor.offsetWidth * 3) continue;
						} catch {}
						return node;
					}
				}
			}
			return null;
		}
		function markComposerCards() {
			try {
				const anchors = findVisibleComposerAnchors();
				let changed = false;
				for (const anchor of anchors) {
					const card = nearestComposerCard(anchor);
					if (card === null) continue;
					if (card.getAttribute(COMPOSER_CARD_ATTR) !== "1") {
						card.setAttribute(COMPOSER_CARD_ATTR, "1");
						changed = true;
					}
				}
				return changed;
			} catch { return false; }
		}
		let composerMarkerStarted = false;
		let composerMarkerDispose = null;
		function startComposerMarker() {
			if (composerMarkerStarted) return composerMarkerDispose;
			composerMarkerStarted = true;
			let marked = false;
			const run = () => { try { if (markComposerCards()) marked = true; } catch {} };
			run();
			const timers = [];
			// dsh-desktop mounts the conversation much later than the web host
			// (issue #50 follow-up): the first paint often has no textarea yet,
			// so a single mark-on-boot pass misses it. Poll cheaply until the
			// first successful mark, on top of the MutationObserver (which also
			// keeps re-marking after SPA re-renders discard the attribute).
			// Adversarial-review F4: the poll's job is to establish the FIRST
			// mark; stop as soon as anything is tagged (marked latches true and
			// is never reset) instead of idling out the full 30 tries.
			if (!marked && typeof setInterval === "function" && typeof clearInterval === "function") {
				let tries = 0;
				const timer = setInterval(() => {
					run();
					tries += 1;
					if (marked || tries > 30) { try { clearInterval(timer); } catch {} }
				}, 800);
				timers.push(timer);
			}
			if (typeof MutationObserver === "function") {
				try {
					let scheduled = false;
					const tick = () => { scheduled = false; run(); };
					// Adversarial-review F5: chat streaming mutates the DOM many
					// times a second; re-scanning on every mutation forces layout
					// (offsetWidth in the anchor filter) for no benefit. Only wake
					// when nodes were ADDED (a re-render that could carry a fresh,
					// untagged composer) — attribute tweaks and text streaming
					// cannot produce a new input.
					const mo = new MutationObserver((records) => {
						if (scheduled) return;
						let relevant = false;
						for (const r of records) {
							if (r.type === "childList" && r.addedNodes.length > 0) { relevant = true; break; }
						}
						if (!relevant) return;
						scheduled = true;
						if (typeof requestAnimationFrame === "function") {
							try { requestAnimationFrame(tick); } catch { setTimeout(tick, 100); }
						} else {
							setTimeout(tick, 100);
						}
					});
					// Observe documentElement, NOT body: the client bundle can be
					// injected before <body> parses (IIFE guard note at EOF), so
					// observing body throws there and the marker silently dies.
					mo.observe(document.documentElement, { childList: true, subtree: true });
					// Adversarial-review F4: the marker outlives the boot path —
					// hand back a teardown so the unload effect can stop polling
					// and disconnect the observer instead of leaking them.
					composerMarkerDispose = () => {
						for (const t of timers) { try { clearInterval(t); } catch {} }
						try { mo.disconnect(); } catch {}
					};
				} catch {}
			}
			return composerMarkerDispose;
		}
		/**
		 * The scheme our craft constants must be published for (issue #80).
		 *
		 * The source of truth is the ACTIVE THEME DEFINITION's own `colorScheme`
		 * — i.e. the skin the user selected — resolved through the same
		 * `rawActiveTheme` the wallpaper wash uses. Deliberately NOT the host's
		 * `body[data-ds-dark-theme]`: that attribute is written by the host's
		 * theme presenter, erased by its dispose(), and describes the HOST's
		 * scheme, which can differ from the plugin skin's (host `system` on a
		 * light OS + a dark skin). Our sheets answer "what material is this
		 * skin made of", so they must follow the skin.
		 *
		 * Unknown/unresolvable state degrades to `dark`, which is also the bare
		 * `html` fallback in the sheet — both halves of "unknown" agree.
		 */
		function schemeForContext(ctx, snapshot = null) {
			try {
				const current = snapshot
					|| (ctx && ctx.theme && typeof ctx.theme.getTheme === "function" ? ctx.theme.getTheme() : null);
				const active = current ? rawActiveTheme(current) : null;
				if (active && active.colorScheme === SCHEME_LIGHT) return SCHEME_LIGHT;
			} catch {}
			return SCHEME_DARK;
		}

		/**
		 * Publish `schemeForContext(ctx)` on <html>.
		 *
		 * Must be called in the SAME TICK as the stylesheet that reads it —
		 * ensureMaterialStyle() does exactly that. Stamping only on skin switch
		 * would leave a fresh window on every boot/theme-layer remount, i.e. we
		 * would have traded "follows the host attribute it cannot rely on" for
		 * "follows our own attribute, late".
		 */
		function applySchemeAttr(ctx, snapshot = null) {
			const scheme = schemeForContext(ctx, snapshot);
			try {
				if (document && document.documentElement) document.documentElement.setAttribute(SCHEME_ATTR, scheme);
			} catch {
				// document null in a headless eval — the bare `html` dark
				// fallback still applies, which is the same as this branch.
			}
			return scheme;
		}

		function ensureMaterialStyle(ctx) {
			// Issue #80: the scheme attribute is stamped HERE, synchronously, on
			// every entry — including the early return below, so a re-entry that
			// reuses the cached node still republishes the scheme. The sheet that
			// reads it is written further down in this same tick, so there is no
			// window in which the light override can be judged against a stale
			// attribute (the failure mode the old host-attribute binding had).
			applySchemeAttr(ctx);
			if (materialStyleEl !== null && document.head.contains(materialStyleEl)) return materialStyleEl;
			const parts = [
				// --- Liquid-glass craft constants, per scheme -------------------
				// Dark first: bare `html` IS the fallback (see GLASS_RIM_VAR) —
				// if the attribute below is ever missing, dark users see no
				// change instead of light constants over a dark canvas.
				"html {",
				"  " + GLASS_RIM_VAR + ": inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 0 0 rgba(255,255,255,0.18), inset 0 -1px 0 0 rgba(255,255,255,0.08);",
				"  " + GLASS_SHEEN_VAR + ": linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.01) 55%, rgba(255,255,255,0.04) 100%);",
				"  " + GLASS_SHEEN_BLEND_VAR + ": screen;",
				"  " + GLASS_EDGE_VAR + ": rgba(255,255,255,0.12);",
				"}",
				// Light: the same material read on paper. A white rim over a
				// .95-L canvas is invisible, so the edge becomes a bright top
				// catch light plus a barely-there dark bottom — the classic
				// light-glass edge — and `screen` (which would bleach the pane)
				// is swapped for plain alpha so the glint reads as a highlight.
				// Hung off our OWN root attribute (issue #80), stamped by
				// applySchemeAttr() in the same tick as this sheet.
				"html[" + SCHEME_ATTR + '="' + SCHEME_LIGHT + '"] {',
				"  " + GLASS_RIM_VAR + ": inset 0 0 0 1px rgba(255,255,255,0.55), inset 0 1px 0 0 rgba(255,255,255,0.70), inset 0 -1px 0 0 rgba(15,23,42,0.06);",
				"  " + GLASS_SHEEN_VAR + ": linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.02) 55%, rgba(255,255,255,0.16) 100%);",
				"  " + GLASS_SHEEN_BLEND_VAR + ": normal;",
				"  " + GLASS_EDGE_VAR + ": rgba(15,23,42,0.10);",
				"}",
				"@supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {",
				"  .bqrRRG_card {",
				"    -webkit-backdrop-filter: blur(24px) saturate(150%);",
				"    backdrop-filter: blur(24px) saturate(150%);",
				"  }",
				"  .lXshSW_root, ._7yHdaG_panel {",
				"    -webkit-backdrop-filter: blur(20px) saturate(140%);",
				"    backdrop-filter: blur(20px) saturate(140%);",
				"  }",
				"}",
				// A second rule (always applied, not @supports-gated) used to give the
				// composer root a bottom-scrim so a scrolled-up message / "turn N"
				// monitor row never shows through under the input. That scrim was a
				// full-rectangle gradient over the WIDER `.uV2eYG_root` (which is
				// wider than the rounded `.uV2eYG_card`), so on skins with a
				// wallpaper it painted a big sharp-cornered rectangle behind and
				// around the rounded input — the "外层尖角框" users disliked. The
				// composer card already carries its own translucent glass fill +
				// backdrop blur, so the frame is dropped: the root is now fully
				// transparent and only the rounded card reads. Readability is kept
				// by the card's own fill; nothing sharp frames the input anymore.
				".uV2eYG_root, [" + COMPOSER_CARD_ATTR + "] {",
				"  background: transparent;",
				"}",
				// --- Right file panel consistency (issue: left rail vs right panel) ---
				// The left sidebar reads the skin's `--dsw-specific-sidebar-fill`
				// (a translucent dark tint that matches the wallpaper wash), but the
				// right file panel (`nArs4W_panel`) fell back to DSH's default
				// near-white translucent fill, so the two halves rendered with
				// totally different tints. Give the right panel the very same
				// sidebar fill and a matching hairline so both sides look uniform.
				".nArs4W_panel {",
				"  background: var(--dsw-specific-sidebar-fill) !important;",
				"  border-left-color: var(--dsw-alias-border-l2);",
				"}",
				// The white default show-through can leak on nested panes that carry
				// their own translucent white; force them to inherit the sidebar fill.
				".nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody {",
				"  background: transparent;",
				"}",
				// --- Right sidebar (dockkit): a sidebar surface that behaves like one ---
				// 1) Docked right panel. The host paints the docked tab host and the empty
				//    host with `--dsw-alias-bg-base` (the CANVAS wash), so the 侧边栏透明度
				//    slider — which drives `--dsw-specific-sidebar-fill` — never reached it:
				//    the panel stayed see-through at every value. Painting the two dockkit
				//    surfaces with the sidebar fill makes it behave like the left column and
				//    the title strip (same token, same slider). Not wash-gated on purpose:
				//    the panel is a sidebar surface with or without a wallpaper. Both
				//    selectors are scoped through `[data-sidebar-right-panel]`: dockkit is a
				//    shared primitive (a second dock column, or a future centre-column dock)
				//    and those hosts were never measured against a sidebar fill.
				// 2) Fullscreen right panel. It covers the centre column and the canvas wash
				//    is translucent, so the conversation showed through it. While a wash is
				//    live the fullscreen surface goes OPAQUE in the same colour
				//    (`--dsh-dream-skin-composer-base` is this plugin's opaque base colour;
				//    layer-1 is the fallback for the pre-wash interval).
				// 3) Guide capsule hover. `ui-sidebar-right`'s guide entry is
				//    `background: var(--dsw-alias-bg-layer-1)` and its :hover REPLACES that
				//    with the translucent `--dsw-alias-interactive-bg-hover`, so over a
				//    wallpaper the capsule lost its fill (it read as transparent) while the
				//    terminal guide beside it OVERLAYS the same tint on its own fill. Same
				//    token, two behaviours: keep the fill and layer the tint, like the
				//    terminal one. `[data-sidebar-right-guide-entry]` is the host's own
				//    stable stamp on that button (GuideBody writes it with the kind), and the
				//    terminal capsule carries the same stamp while already overlaying its own
				//    tint through a ghost button, so kind=terminal is excluded here.
				"[data-sidebar-right-panel] [data-dockkit-host=dock] > section,",
				"[data-sidebar-right-panel] [data-dockkit-empty] {",
				"  background-color: var(--dsw-specific-sidebar-fill) !important;",
				"}",
				"html[data-dsh-dream-skin-wash] [data-sidebar-right-panel=fullscreen] [data-dockkit-host=dock] > section,",
				"html[data-dsh-dream-skin-wash] [data-sidebar-right-panel=fullscreen] [data-dockkit-empty] {",
				"  background-color: var(--dsh-dream-skin-composer-base, var(--dsw-alias-bg-layer-1)) !important;",
				"}",
				"[data-sidebar-right-guide-entry]:not([data-sidebar-right-guide-entry=terminal]):hover {",
				"  background-color: var(--dsw-alias-bg-layer-1) !important;",
				"  background-image: linear-gradient(var(--dsw-alias-interactive-bg-hover), var(--dsw-alias-interactive-bg-hover)) !important;",
				"}",
				// The `--dsw-specific-menu` / `--dsw-alias-bg-overlay` surfaces are now
				// driven by the popup-opacity override layer (applyModalOverlay) so the
				// user-adjustable「弹窗不透明度」slider actually tunes menu / popover /
				// dialog translucency — left per-skin otherwise.
				// --- Left sidebar foot/settings consistency (issue: settings area) ---
				// The workspace list region (`hHd-Xa_regionArea`) overhangs to the
				// column's left/right edges (margin-left:-4px / margin-right:-12px),
				// but the footer/settings region was a plain `width:100%` box stuck
				// at the inner padding, so it sat ~4px inset left and ~12px inset
				// right. At the seam between the scrolling list and the footer that
				// difference made a visible vertical step that read as a "断裂" —
				// the two planes looked misaligned/detached. Align the footer to the
				// exact same span as the list so the whole left column is one
				// continuous plane.
				".hHd-Xa_root .hHd-Xa_footArea, .hHd-Xa_root .hHd-Xa_settingsArea, .hHd-Xa_root .hHd-Xa_footerActions {",
				"  width: auto;",
				"  margin-right: calc(-1 * var(--dsh-sidebar-inline-padding, 12px));",
				"  margin-left: -4px;",
				"  padding-right: var(--dsh-sidebar-inline-padding, 12px);",
				"  padding-left: 4px;",
				"}",
				// Force a single uniform fill across the whole sidebar and remove any
				// leftover erase-band / divider right at the list-footer boundary.
				".hHd-Xa_footArea, .hHd-Xa_settingsArea, .hHd-Xa_footerActions {",
				"  background: transparent;",
				"  box-shadow: none;",
				"  border: none;",
				"}",
				// The conversation list ends with a fade so the left column does not hard
				// cut against the footer. Under a wallpaper wash that is the wrong effect:
				// the host paints the sidebar column with the translucent
				// `--dsw-specific-sidebar-fill`, and the fade paints a SECOND layer of the
				// same token (transparent → fill, 24px, inset from the right edge), so the
				// band reads as a lighter strip with a hard vertical end — issue #97.
				// Without a wash the column's own fill is opaque, the band is invisible and
				// the fade is doing its job, so the neutralisation is wash-gated.
				//
				// ANCHOR (the discipline issues #50 / #92 established): the element is
				// `<span class="<hash>_fade">` with that ONE class token, and the hash
				// re-rolls per build. Measured on the two hosts this release ships against:
				// npm 0.2.0-rc.1 uses `bhn1Oq_fade` (dsh-client-ui-workspace), the desktop
				// app.asar uses `_9lTDKa_fade`, and the legacy selector in the group below
				// names `qDHVXG_fade` — which measures 0 hits on BOTH, which is what
				// scripts/data/dead-hashes.cjs records. What is NOT claimed here: that the
				// legacy hash never worked anywhere. It has been in this sheet since 0.4.2
				// (`4ad4e29`), and the 0.1.x line the README still supports is a corpus this
				// repository does not have — that half is an assumption, not a measurement.
				// `[class$="_fade"]` is the hash-free form of the same anchor and is what
				// does the work now; the legacy hash stays as a second selector in the SAME
				// wash-gated group rather than as a rule of its own, so the 0.1.x line keeps
				// its fix without a wallpaper-less profile losing the host fade. No fade in
				// this sheet may be anchored on a hash alone any more — `wash-fade-neutralised`
				// in scripts/craft-audit.cjs grades EVERY `_fade`-shaped rule, hash form
				// included, which is the hole issue #97 hid in for four releases.
				// The chat package's `*_fadeTop` / `*_fadeBottom` scroll hooks are NOT hit:
				// different class tokens, and those mask rather than paint. Both paths are
				// neutralised here anyway — whichever mechanism a future host picks for an
				// element it names `_fade`, the wash state ends up with no band.
				"html[" + WASH_ACTIVE_ATTR + "] " + SESSION_FADE_SELECTOR + ",",
				"html[" + WASH_ACTIVE_ATTR + "] .qDHVXG_fade {",
				"  background: transparent;",
				"  -webkit-mask-image: none;",
				"  mask-image: none;",
				"}",
				// The question card, the approval card and the plan-review card are the three
				// "read this, then decide" surfaces that sit over the chat. ONE rule covers all
				// three families plus the legacy hash, so they cannot drift apart from each
				// other or from this sheet.
				//
				// FILL SOURCE: the mix uses the OPAQUE `--dsh-dream-skin-modal-base`, never the
				// wallpaper-washed `--dsw-alias-bg-base`. The washed token is
				// rgba(base, canvasAlpha), so mixing it at the slider weight COMPOUNDS the two
				// alphas — dragging 壁纸不透明度 silently thinned these cards and at a strong
				// wash 「弹窗不透明度 100%」 was still translucent. The opaque token carries no
				// alpha, so the popup slider alone decides the fill weight; without a wallpaper
				// the token is unpublished and the fallback (the plain skin hex) is opaque anyway.
				//
				// The weight itself is user-adjustable (Settings → 外观 → 弹窗不透明度) and
				// arrives through MODAL_FILL_VAR. Lower = more see-through, higher = nearly solid.
				//
				// backdrop-filter here is RECORDED RISK, not a containment proof: the 10.5.0
				// review FALSIFIED the earlier claim that these cards "contain nothing fixed".
				// The card packages themselves still render only Button / Icon* / MarkdownText
				// / StateDot, and the fixed-position primitives of dsh-client-ui-primitives
				// (Tooltip, Menu, MenuSurface, HoverCard, Modal, Toast, ImageLightbox — 7
				// modules with `position:fixed`) leave via `createPortal(…, document.body)`.
				// But BOTH cards are SLOT HOSTS: user-questions renders
				// `conversation.plan-review.actions`, approval renders
				// `conversation.approval.detail`, and the host's slot catalogue
				// (cordis-client-runner) lists the latter as a third-party injection point —
				// any plugin can mount ARBITRARY content, fixed surfaces included, inside this
				// subtree, where our filter would re-anchor it (the composer bug's failure
				// mode). The blur is kept as a visual, reversible trade-off, NOT as a
				// proven-containment fact; offline tests cannot see the injected shapes, so
				// the risk stands as recorded here.
				//
				// The plain token line first is the no-`color-mix()` fallback. Such a webview drops
				// only the color-mix declaration and keeps THIS one, so it has to resolve to something
				// the user can read: the OPAQUE modal base whenever a wallpaper wash publishes it,
				// otherwise the overlay token `--dsw-alias-bg-overlay` — which on a live plugin is
				// driven by OUR OWN applyModalOverlay to rgba(base, popup-slider alpha): factory seed
				// 0.6, measured live rgba(18, 16, 26, 0.5) at a 50% slider; where our layer is
				// inactive it carries what the active shipped theme wrote for it (0.86 on the dark
				// themes, 0.55 on the rose light pair, opaque #ffffff on the two bright pairs).
				// At the factory seed this degrades to a 60% soft skin panel — not a transparent
				// hole, but NOT an opaque fill either: do not describe it as one. (10.5.0 audit T4
				// corrected the earlier "0.94 at the factory defaults": 0.94 is only the JS default
				// when NO value is stored — and the `94%` fallback inside the mix line — never this
				// token's actual value.)
				QUESTION_CARD_SELECTOR + ",",
				APPROVAL_CARD_SELECTOR + ",",
				PLAN_CARD_SELECTOR + ",",
				// Legacy hash branch — hosts older than the stamps above (pre-0.2.x).
				".Mbwy4a_card {",
				"  background: var(--dsh-dream-skin-modal-base, var(--dsw-alias-bg-overlay));",
				"  background: color-mix(in srgb, var(--dsh-dream-skin-modal-base, var(--dsw-alias-bg-base)) var(" + MODAL_FILL_VAR + ", 94%), transparent);",
				// Same ONE blur knob as the composer ::before — every glass surface
				// moves in lock step (user review round 2, 举一反三). Tone tail
				// comes from the material chip (GLASS_TONE_VAR, round 5).
				"  -webkit-backdrop-filter: blur(var(" + GLASS_BLUR_VAR + ", " + DEFAULT_GLASS_BLUR + "px)) var(" + GLASS_TONE_VAR + ", " + MATERIAL_PRESETS[0].tone + ");",
				"  backdrop-filter: blur(var(" + GLASS_BLUR_VAR + ", " + DEFAULT_GLASS_BLUR + "px)) var(" + GLASS_TONE_VAR + ", " + MATERIAL_PRESETS[0].tone + ");",
				"}",
				// --- Composer (chat input) glass: REAL frosted glass via a ::before
				// isolation layer (catppuccin's technique). The old approach only
				// tinted the card fill — the wallpaper bled straight through and the
				// slider looked like "color got a bit darker", never like glass.
				// The pseudo-element is NOT an ancestor of the card's content, so
				// its backdrop-filter blurs the backdrop behind the input WITHOUT
				// becoming the containing block for the fixed-positioned stop/send
				// Tooltips (the reason blur was forbidden on this card before) —
				// they keep the viewport containing block and are never trapped.
				// isolation:isolate makes the CARD a stacking context so the
				// z-index:-1 ::before paints BETWEEN the card's own background and
				// its content — without it a negative-z child slides UNDER the
				// card background (opaque on ivory/rose skins) and the glass would
				// be invisible there (blue-team D2).
				// User review round 3: the card's own opaque token background sat
				// UNDER the glass layer and blocked the wallpaper entirely — the
				// glass then only tinted that flat token color, so the fill slider
				// looked like "slightly darker/lighter gray" and never changed the
				// see-through. Inside @supports (where the ::before recipe is
				// guaranteed to render) the card body goes TRANSPARENT so the glass
				// layer faces the wallpaper directly; unsupported webviews keep the
				// token fill as the whole fallback.
				// Recipe (wallpaper-engine's chain): blur from the material knob +
				// saturate to keep the glass alive + brightness lift for the frost.
				// The fill sits on the pseudo too, so fill + blur move together.
				// Fallback FIRST (token fill — keeps no-color-mix webviews legible),
				// then the @supports block transparents the card body where the
				// ::before glass recipe is guaranteed to render. The gate requires
				// BOTH color-mix AND backdrop-filter (blue-team B7): a webview with
				// color-mix but blur force-disabled would otherwise get a transparent
				// card with no frost — near-naked input on the wallpaper.
				// Issue #50: every selector below matches EITHER the legacy hash
				// class (old hosts) OR our own DOM-shape attribute (hosts ≥0.1.5,
				// where the hashes were re-rolled) — see markComposerCard().
				".uV2eYG_card, [" + COMPOSER_CARD_ATTR + "] {",
				"  background: var(--dsw-specific-input-major);",
				"  position: relative;",
				"  isolation: isolate;",
				"}",
				"@supports ((background: color-mix(in srgb, red 50%, transparent)) and (backdrop-filter: blur(1px))) {",
				"  .uV2eYG_card,",
				"  [" + COMPOSER_CARD_ATTR + "] {",
				"    background: transparent;",
				"  }",
				"}",
				".uV2eYG_card::before,",
				"[" + COMPOSER_CARD_ATTR + "]::before {",
				"  content: '';",
				"  position: absolute;",
				"  inset: 0;",
				"  border-radius: inherit;",
				// Fill from the OPAQUE composer-base token (NOT the alpha-washed
				// --dsw-alias-bg-base) so the fill weight is the composer slider's
				// alone and the wallpaper slider can't thin it behind the user's
				// back (blue-team B1). The washed token stays as the fallback for
				// hosts that don't set the opaque one.
				// Issue #67 follow-up: the material fillScale multiply is GONE —
				// applyComposerOpacity() now publishes the material-remapped
				// effective weight (liquid: 15% floor at the transparent end,
				// 100% at the solid end; frosted: the raw weight), so the slider's
				// leftmost position truly boards up the glass.
				"  background: color-mix(in srgb, var(" + GLASS_TINT_VAR + ", var(--dsh-dream-skin-composer-base, var(--dsw-alias-bg-base))) var(" + COMPOSER_FILL_VAR + ", 85%), transparent);",
				"  -webkit-backdrop-filter: blur(var(" + GLASS_BLUR_VAR + ", " + DEFAULT_GLASS_BLUR + "px)) var(" + GLASS_TONE_VAR + ", " + MATERIAL_PRESETS[0].tone + ");",
				"  backdrop-filter: blur(var(" + GLASS_BLUR_VAR + ", " + DEFAULT_GLASS_BLUR + "px)) var(" + GLASS_TONE_VAR + ", " + MATERIAL_PRESETS[0].tone + ");",
				"  z-index: -1;",
				"  pointer-events: none;",
				"}",
				// Liquid-glass edge catch light (round-7, tuned round-8 per user:
				// "太重了" — thinner, lighter, fainter). A hairline rim now:
				// 0.5px-ish via low-alpha 1px + barely-there top/bottom accents.
				'html[data-dsh-material="liquid"] .uV2eYG_card::before,',
				'html[data-dsh-material="liquid"] [' + COMPOSER_CARD_ATTR + ']::before {',
				"  box-shadow: var(" + GLASS_RIM_VAR + ");",
				"}",
				// Sheen layer (round-9, halved again round-14): the user still read
				// the pane as "too white" — the sweep is now a bare glint (0.10
				// peak); the glass read must come from the refraction, not light.
				'html[data-dsh-material="liquid"] .uV2eYG_card::after,',
				'html[data-dsh-material="liquid"] [' + COMPOSER_CARD_ATTR + ']::after {',
				"  content: '';",
				"  position: absolute;",
				"  inset: 0;",
				"  border-radius: inherit;",
				"  pointer-events: none;",
				"  background: var(" + GLASS_SHEEN_VAR + ");",
				"  mix-blend-mode: var(" + GLASS_SHEEN_BLEND_VAR + ");",
				"}",
				// Round-17 (user screenshots round-16): the wallpaper-replica +
				// filter:url() experiment is REMOVED — it erased the DOM text
				// behind the pane (a replica can only paint the wallpaper, not
				// the chat flowing under it) and broke background-attachment:
				// fixed alignment (element filter kills fixed attachment).
				// Liquid glass is real backdrop-filter again: the text behind
				// shows through FOGGED (never erased), and the wallpaper's own
				// blur is part of the sampled backdrop, so the two blurs stack
				// naturally. "Refraction" reads as glass THICKNESS: the composer
				// slider adds blur on top of the thin base (0px at max
				// transparency → +24px at max opacity). GLASS_BLUR_VAR arrives
				// ALREADY material-scaled (applyMaterialBlur ×0.25 on liquid,
				// blue-team B3: this rule must not halve it again).
				'html[data-dsh-material="liquid"] .uV2eYG_card::before,',
				'html[data-dsh-material="liquid"] [' + COMPOSER_CARD_ATTR + ']::before {',
				"  -webkit-backdrop-filter: blur(calc(var(" + GLASS_BLUR_VAR + ", " + DEFAULT_GLASS_BLUR + "px) + var(" + LIQUID_THICKNESS_VAR + ", 20px))) saturate(1.8) contrast(1.04) brightness(1.02);",
				"  backdrop-filter: blur(calc(var(" + GLASS_BLUR_VAR + ", " + DEFAULT_GLASS_BLUR + "px) + var(" + LIQUID_THICKNESS_VAR + ", 20px))) saturate(1.8) contrast(1.04) brightness(1.02);",
				"}",
				'html[data-dsh-material="liquid"] ' + QUESTION_CARD_SELECTOR + ',',
				'html[data-dsh-material="liquid"] ' + PLAN_CARD_SELECTOR + ',',
				'html[data-dsh-material="liquid"] .Mbwy4a_card,',
				// The approval card is deliberately NOT in this list (10.5.0): the host
				// gives it `border: 1px solid var(--dsw-alias-state-warn-secondary)`, a
				// semantic "needs your attention" ring, and our hairline at
				// `outline-offset: -1px` would paint exactly over it. It keeps the fill and
				// the frost, just not the glass rim. The question and plan cards both declare
				// `border: 0` in host CSS, so a rim there costs the host nothing.
				'html[data-dsh-material="liquid"] [' + COMPOSER_CARD_ATTR + '] {',
				// F5 (round-7 review): outline instead of box-shadow — a shadow rule
				// here would REPLACE whatever elevation shadow the host puts on this
				// card; outline overlays without touching it. Round-8: lighter.
				"  outline: 1px solid var(" + GLASS_EDGE_VAR + ");",
				"  outline-offset: -1px;",
				"}",
				// --- DSH Desktop: the shell shadows the sidebar fill token (issue #55) ---
				// In the Electron shell the upstream sidebar is rendered inside the
				// shell's own <aside class="dshDesktopSidebarSurface">, and that
				// element re-declares `--dsw-specific-sidebar-fill` on itself. A
				// custom property declared on an element shadows every :root / body
				// theme override for the WHOLE subtree, so the sidebar root's own
				// `background: var(--dsw-specific-sidebar-fill)` never saw the wash
				// we compute from the 侧边栏透明度 slider — dragging it moved
				// nothing, while the right file panel (outside that <aside>) kept
				// responding: the two halves visibly disagreed.
				//
				// VERIFIED IN UPSTREAM 2.0.0 (npm, lib/client.js:248): the
				// declaration is `--dsw-specific-sidebar-fill: transparent;`, it is
				// the ONLY declaration of that token in the package, and it uses a
				// plain (non-important) class selector. The issue #55 reporter, on a
				// 2.0.10 build that is NOT published to npm, additionally sees a
				// variant that branches on the window material —
				// `var(--dsw-alias-bg-layer-1)` when it is off (the Windows
				// default). That variant is now VERIFIED IN SOURCE (issue #99, read
				// out of the shell's own repository at tag v2.0.17,
				// dsh-plugin-desktop/src/client/styles.ts:24) — see the rule below,
				// which is what that second declaration actually needs. What this
				// rule relies on is only that both variants are non-important.
				//
				// `inherit` restores the inherited value for that subtree: the
				// shell's own theme presenter publishes the composed token set
				// (INCLUDING this plugin's overrideTokens layer) on the ancestors,
				// so the wash reaches the sidebar again. `!important` is what makes
				// it win: the shell's declaration is not important, and an
				// important declaration outranks a normal one regardless of
				// selector specificity. (The reporter's 2.0.10 variant uses a MORE
				// specific selector, which changes nothing while it stays
				// non-important.) If the shell ever marks its own declaration
				// important, the clean fix is on the shell side — it should use its
				// own private token instead of the shared skin token — not a
				// specificity war in here.
				//
				// SCOPE AND TRADE-OFF, stated plainly: this makes the skin own the
				// desktop sidebar's fill, exactly as it already does on plain DSH
				// Web. That includes the no-wallpaper case (the sidebar then paints
				// the skin's own sidebar token instead of the shell's transparent
				// frame fill), and it only applies where the shell actually renders
				// that <aside> — the shell mounts this frame in its "advanced"
				// mode, so other modes are untouched. Inert on plain DSH Web:
				// nothing carries .dshDesktopSidebarSurface there.
				DESKTOP_SIDEBAR_SELECTOR + " {",
				"  --dsw-specific-sidebar-fill: inherit !important;",
				"}",
				// --- DSH Desktop: the shell's opaque underlay eats the sidebar wash (issue #99) ---
				// The rule above fixes the TOKEN. It does not fix the shell's own PAINT, and
				// on Windows that is what makes the 侧边栏透明度 slider visibly do nothing.
				// Read out of the shell at tag v2.0.17 (`dsh-plugin-desktop/src/client/
				// styles.ts:23` is the base aside, `:24` the `material=off` pair — token AND
				// paint; both lines are byte-identical back to v2.0.5, so this is not a
				// regression we caused):
				//   body:is([data-dsh-desktop-mode="extended"],[data-dsh-desktop-mode="advanced"])
				//     [data-dsh-desktop-material="off"] .dshDesktopSidebarSurface
				//     { --dsw-specific-sidebar-fill: var(--dsw-alias-bg-layer-1);
				//       background: var(--dsw-alias-bg-layer-1); }
				// `material=off` is not a choice on Windows: `environment.ts:24` admits only
				// off/transparent/acrylic/mica, `:51-53` folds acrylic and mica down to off,
				// and `:58` plus `:61` THROW for win32 + transparent. So every Windows build in
				// extended/advanced mode paints that aside opaque. It is a `background`, not a
				// token, so the `inherit` fix above cannot reach it: the official sidebar
				// inside does follow the slider, but what shows through that translucent fill
				// is the shell's own layer-1 rather than the wallpaper.
				//
				// Wash-gated on purpose, unlike the token rule above. With no wallpaper the
				// opaque underlay is the shell's own decision (its material list offers Windows
				// nothing else) and this plugin does not undo it. With a wallpaper, the wallpaper
				// layer is painted in this same document — the shell keeps `body` transparent for
				// its own modes (styles.ts:14) — so the aside is one more surface sitting on top
				// of it, and clearing only the color component is what
				// `scripts/wash-cascade.cjs` now measures: three states, per skin, with a
				// paint-order walk from the aside up to the page background.
				// `!important` is load-bearing, not decorative, and the engine measured it:
				// this selector is (0,2,1) against the shell's (0,3,1), so removing ONLY the flag
				// lets the shell repaint the column — `tests/wash.cascade.test.cjs` has that
				// mutation as a shipped case. The flag also covers the one position a
				// string-level gate can never see: the shell writing the property inline.
				// Only `background-color` is touched — the shell's `border-right` and its layout
				// stay exactly as it shipped them (a check of its own, not a hope).
				"html[" + WASH_ACTIVE_ATTR + "] " + DESKTOP_SIDEBAR_SELECTOR + " {",
				"  background-color: transparent !important;",
				"}",
				// --- Windows title-bar AppFrame: the sidebar wash must not gate the
				// chat area's wallpaper (sidebar-transparency leak) ---
				// In the Electron shell's Windows layout the host paints the WHOLE frame
				// with the SIDEBAR fill and then cuts the content area out of it: an
				// outer frame element carries `background: var(--dsw-specific-sidebar-fill)`
				// and the centre column inside it carries `background: var(--dsw-alias-bg-base)`.
				// Anchor that by STRUCTURE, never by the host's build-hash class names —
				// which is exactly what this rule does below (`APP_FRAME_SELECTOR`, i.e.
				// `div:has(> [data-shell-overlay])`, gated by `html[data-windows-titlebar]`).
				// An earlier revision of this comment spelled the host's frame and centre
				// classes out as `.<hash>_frame` / `.<hash>_centerCol`; those hashes measure
				// 0 hits in every host build we support (0.2.0-rc.1 / rc.2 / 0.2.1-alpha.1).
				// Issue #92: a comment that teaches a dead hash teaches the wrong pattern.
				// With the stock opaque tokens that cut-out reads as a hard edge. With a
				// wallpaper wash BOTH tokens turn translucent, and the frame's fill — the
				// sidebar colour, never the canvas colour — shows through UNDER the chat
				// area: the 侧边栏透明度 slider then dims the chat wallpaper, and at 0%
				// transparency (sidebar alpha 1) the chat area goes flat black (the dark
				// skins' near-black base colour), which is the reported bug.
				//
				// While a wash is on screen the frame's own fill is therefore dropped:
				// every surface keeps exactly ONE translucent layer of its own (centre column, dock
				// panes) — exactly what plain DSH Web already renders with a wallpaper — so each slider
				// moves only what its name says. Without a wash (marker absent) the host's rule stands
				// untouched and the title strip keeps matching the sidebar.
				// CORRECTION (10.9.1, and this sentence was wrong as written): the list below the
				// original claim named the "title strip" as one of the surfaces that keeps one layer of
				// its own. It does not — the caption row is a separate box the declaration above cannot
				// reach, and the sidebar column is TWO layers of the same token, so "one layer each"
				// never described that page. The strip is answered by the rule immediately below; the
				// sidebar's double layer is left alone on purpose, because plain DSH Web paints that
				// column the same way and flattening it here would move the 侧边栏透明度 slider's
				// meaning between shells.
				//
				// Issue #96 — the SAME drop exposes the host's Windows content radius, so
				// it is answered in the same rule. The host publishes
				// `--dsh-windows-content-radius: 16px` on this frame element and paints
				// `border-radius: var(--dsh-windows-content-radius) 0 0 0` on the centre
				// column inside it (measured in the shipped CSS of both hosts this release
				// was built against — npm 0.2.0-rc.1's layout package and the desktop
				// shell's own app.asar build: the same `.<hash>_frame` / `.<hash>_centerCol`
				// declarations under two different hashes, which is exactly why the answer
				// below goes through the VARIABLE and not through either class name).
				// While the frame carried its own
				// paint, the quarter-circle that corner cut out was filled with the frame's
				// sidebar colour and read as continuous chrome; with the paint dropped, the
				// cut-out shows the title strip behind it — a dark rounded "lifted corner"
				// beside the logo that is invisible without a wallpaper, which is exactly
				// the report. Answering the host's OWN variable with 0px flattens the corner
				// for the wash case only, needs no build hash, and takes the right panel's
				// fullscreen corner with it (`dsh-client-ui-sidebar-right` consumes the same
				// variable for the same notch) — that half is a deliberate consequence, not
				// a side effect: under a wash it shows the identical artifact.
				// `!important` is for the one case the offline gates cannot see: our
				// selector (0,3,2) already outranks the host's `[data-windows-titlebar]
				// .<hash>_frame` (0,2,0) on this same element, so the only declaration that
				// could still beat us is the host stamping the variable into an INLINE
				// `style` attribute — which neither host does today, and which no string
				// level gate in this repository would ever notice. The neighbouring
				// `background-color` has carried the same belt since issue #63.
				"html[data-windows-titlebar][" + WASH_ACTIVE_ATTR + "] " + APP_FRAME_SELECTOR + " {",
				"  background-color: transparent !important;",
				"  --dsh-windows-content-radius: 0px !important;",
				"}",
				// --- The Windows caption row is a SECOND box, and the rule above cannot reach it ---
				// `background-color` does not inherit into a pseudo-element. Dropping the frame's own
				// fill therefore leaves the strip the host paints for its drag region still painted:
				// `[data-windows-titlebar] .<hash>_frame:before { content:""; height:var(--dsh-windows-
				// titlebar-height); background: var(--dsw-specific-sidebar-fill); -webkit-app-region:
				// drag; position:absolute; inset:0 0 auto }`. Measured in the shipped CSS of BOTH hosts
				// this release was built against — npm 0.2.0-rc.1's `dsh-client-ui-layout` and the
				// official DSH Desktop's own bundle (DeepSeek Harness 44.0.0 / app.asar, host
				// 0.2.0-rc.2) — where the declaration is byte-identical apart from the hash prefix,
				// which is why the rule below is anchored the same structural way as its neighbour.
				//
				// WHAT THAT LEAVES ON SCREEN, in the arithmetic the engine does: under the wash the
				// caption row is ONE layer of the sidebar token, the sidebar column below it is TWO
				// (`.sidebarCol` plus the sidebar's own root, both reading the same token), and the
				// centre column is one layer of a DIFFERENT token (the canvas). So the top 34-48px of
				// the window is a full-width band that is lighter than the column under it on the left
				// and differently hued on the right — and it exists on no other surface, because the
				// Web shell has no caption row at all. Reported as "设置了壁纸以后，顶上一条和页面
				// 主题的风格不一致".
				//
				// The fix drops the strip's paint, so the wallpaper reads through the top edge.
				// WHAT THAT DOES NOT CLAIM: it does not make the desktop look like plain DSH Web.
				// There is no caption row on Web — the sidebar column runs to y=0 there — so after
				// this drop the caption band is the ONE surface in the window with no tint of its
				// own, while the column under it keeps two layers of the sidebar token. Over a dark
				// wallpaper that reads as continuous chrome; over a bright one (a pale wall at the
				// top of a photo is exactly the case in the report) the strip reads LIGHTER than
				// everything under it — not lighter than it does today, but lighter STILL. That is
				// the cost of "the wallpaper is the window background", written here so nobody has
				// to rediscover it from a screenshot.
				//
				// The alternative was to retint the strip with `--dsw-alias-bg-base`, which matches
				// the centre column it mostly spans; it is rejected because it trades one mismatch
				// (against the sidebar) for another (against the sidebar's own, heavier column) and
				// puts a third material on the chrome that nothing else wears at that width. If the
				// report comes back saying the strip now reads as a bright band, that is the option
				// to take up — as a decision, not a silent swap.
				//
				// ONLY THE PAINT IS TOUCHED — and "the paint" means the COLOR, not the BOX. The drag
				// region lives on the pseudo-element's box, so a rule that also said `content: none`
				// (or `display: none`) would delete the box and the drag with it, while
				// `getComputedStyle(frame, '::before')` keeps answering `-webkit-app-region: drag` —
				// computed values survive a box that is no longer generated. That is not a hypothetical:
				// it is how this release's OWN first gate was broken (blue-team B1, measured — a
				// `content: none` added here slipped through craft, smoke AND wash:check, all green).
				// Three doors now: `wash-frame-flattened` forbids this rule from declaring content /
				// display / visibility / all at all, `npm run wash:check` reads the box's computed
				// `content` back in both states, and each of those is pinned by a mutation that has
				// actually been seen to redden.
				//
				// `!important` for the same reason as the rule above: this selector (0,3,3) already
				// outranks the host's (0,2,1), so the only declaration that could still beat us is the
				// host stamping the property into an inline `style` — a position no string-level gate
				// in this repository can see.
				//
				// The SHORTHAND (`background`), not the longhand: the longhand would leave a
				// `background-image` standing, and the one host declaration this rule answers is a flat colour
				// TODAY. The fade rule above learned the same lesson in #97 — a strip can be painted with a
				// gradient tomorrow, and `background-color: transparent` would clear nothing then.
				"html[data-windows-titlebar][" + WASH_ACTIVE_ATTR + "] " + APP_FRAME_SELECTOR + "::before {",
				"  background: transparent !important;",
				"}"
			];
			// 10.5.0 pre-release audit: the module-scope `materialStyleEl` cache only
			// remembers THIS copy of the module, and on a long-lived page the bundle can
			// be evaluated a second time (measured live: two
			// `style#dsh-dream-skin-nav-icon` nodes in one DOM after hours of use). The
			// old code appended a brand-new identical sheet every time, so the page ended
			// up with two copies of the whole rule set. Adopt by document id instead:
			// one sheet per page, and a remount re-texts it so a rebuilt rule set wins.
			let el = null;
			let foreignIdHolder = false;
			try {
				if (typeof document.getElementById === "function") {
					el = document.getElementById(MATERIAL_CSS_SOURCE);
					// Adopt a <style> and nothing else. A non-style node wearing our id is
					// somebody else's element: re-texting it here and removing it in
					// teardownMaterial() would be a real walk-on (10.5.0 audit B10).
					if (el !== null && String(el.tagName || "STYLE").toUpperCase() !== "STYLE") {
						foreignIdHolder = true;
						el = null;
					}
				}
			} catch {
				el = null;
			}
			if (el === null) {
				el = document.createElement("style");
				// In that hostile-name case inject WITHOUT the id: a second element with the
				// same id would confuse the next lookup, while an un-named sheet is simply
				// ours — and ensureMaterialStyle() reuses the cached node while it stays in
				// <head>, so this cannot accumulate.
				if (!foreignIdHolder) el.id = MATERIAL_CSS_SOURCE;
				(document.head || document.body).appendChild(el);
			} else {
				// B9: an adopted sheet keeps whatever position the first mount left it in, so a host
				// CSS chunk that landed later in <head> would outrank our equal-specificity
				// refinements until the next re-apply — the old "append a fresh copy" code
				// kept "ours is last" by accident, and adoption must not quietly lose it.
				// appendChild on a node that is already in the tree MOVES it (real DOM semantics),
				// which restores that position. Cosmetic-only, so the move stays inside try/catch.
				//
				// Do NOT read "last in <head>" as a guarantee: it is a property of the MOMENT we
				// (re)insert. Measured live on host 0.2.0-rc.1 our sheet sat at head index 131 of 217
				// with 85 nodes after it (mostly <style>) — the host keeps injecting CSS long after
				// we mount. What actually keeps these refinements winning is specificity (the
				// html[data-dsh-material=…] prefix and attribute selectors), not position; the move
				// just restores parity with the pre-adoption behaviour instead of losing it for free.
				try { (document.head || document.body).appendChild(el); } catch {}
			}
			el.textContent = parts.join("\n");
			materialStyleEl = el;
			warnOnMaterialSelectorDrift();
			return el;
		}

		/**
		 * Host class names in MATERIAL_CSS are BUILD HASHES that DSH re-rolls on
		 * release, so a subset of them inevitably stops matching (blue-team R15:
		 * three of eight were already dead on the host this was reviewed against,
		 * while every test stayed green — the old test only checked that the CSS
		 * *string* contains the names). Rule sets are harmless when their selector
		 * no longer matches, so this cannot break anyone; but a silent no-op hides
		 * a real visual regression. Verify each selector against the live DOM once
		 * per mount and warn — turning "silently broken" into "visibly degraded".
		 *
		 * A fresh probe also guards the dangerous half of the drift: if a hash is
		 * reused by a DIFFERENT component in a future build, a rule meant for one
		 * surface would repaint another (possibly a third-party plugin's panel).
		 */
		/**
		 * The desktop shell's sidebar wrapper class (issue #55). This is a
		 * THIRD-PARTY class, not a DSH host hash — it only exists under a desktop
		 * shell, which is why its drift probe is gated (see below).
		 */
		const DESKTOP_SIDEBAR_SELECTOR = ".dshDesktopSidebarSurface";
		/**
		 * Whether a third-party desktop shell is driving this page. Reads the
		 * shell's documented stamps only: `data-dsh-desktop-mode` on <body>, the
		 * preload marker, or the render-URL parameter — the same contract other
		 * plugins (e.g. dsh-better-sidebar) rely on. Never throws.
		 */
		function isDesktopShell() {
			try {
				if (typeof document !== "undefined" && document.body
					&& typeof document.body.getAttribute === "function"
					&& document.body.getAttribute("data-dsh-desktop-mode") !== null) return true;
				if (typeof window !== "undefined" && window.__DSH_DESKTOP_FILE_PATH__ !== undefined) return true;
				const search = typeof location !== "undefined" && typeof location.search === "string" ? location.search : "";
				return /[?&]dsh-desktop-mode=/.test(search);
			} catch {
				return false;
			}
		}
		// External review A-1 (9.26.x): the old probe sampled ONCE on the next
		// frame and reported every unmatched group as `drifted` — but "host UI
		// has not mounted yet" and "the host hashes really drifted" look
		// IDENTICAL from a querySelector. 9.26.0 promoted that verdict into the
		// machine-readable contract, so the noise became a false alarm aimed at
		// official desktop tooling. The probe is now a small state machine:
		// bounded checkpoint rounds, a liveness sentinel gate, and per-group
		// "hit at least once" memory.
		// Bounded checkpoint ladder: round 0 runs synchronously (the old probe
		// sampled "immediately" once the material style was in — rAF was never
		// available at that point on the tested paths either), later rounds
		// give async-mounted host surfaces a chance to appear before the
		// probe dares a conclusive `drifted`.
		// R-4 (external review 9.27.0 round 2): these are RELATIVE DELAYS
		// between rounds, not absolute checkpoints — each round schedules
		// its own fresh setTimeout. Cumulative sampling lands at
		// ~0/300/1300/4300ms, so the terminal verdict forms at ~4.3s after
		// boot (R-2 doc note: the snapshot is a settled verdict, NOT a live
		// view — consumers compare `checkedAt` to now before trusting
		// freshness).
		const DRIFT_RETRY_DELAYS_MS = [0, 300, 1000, 3000];
		/**
		 * Host-liveness gate: the probe may only conclude `drifted` once the
		 * host has PROVEN it mounted. NEVER body-childness — the plugin mounts
		 * its own dialogs into body, so its presence proves nothing about the
		 * host. The admissible evidence is host-side only: two probe groups
		 * matched (one alone could be a partial early paint), the composer
		 * fingerprint `data-composer-input` (a stable data attribute that
		 * survives hash drift by design, issue #50), or the documented desktop
		 * contract stamp. If none ever hits, the probe honestly stays
		 * `pending` — "we don't know" beats "your build failed to mount".
		 */
		function driftProbeLivenessProven(matchedCount) {
			try {
				if (matchedCount >= 2) return true;
				if (document.querySelector("[data-composer-input]") !== null) return true;
				if (isDesktopShell()) return true;
			} catch {
				// a throwing DOM stays undecidable — pending, never drifted
			}
			return false;
		}
		const MATERIAL_SELECTOR_PROBES = [
			".bqrRRG_card",
			".lXshSW_root, ._7yHdaG_panel",
			// T1 (adversarial review): probes must test ONLY the host hash — the
			// dual-selector rules match our own attribute too, so including it
			// here would let the marker's own tag satisfy the probe and silently
			// green-light a host whose hashes have all drifted away.
			".uV2eYG_root",
			".nArs4W_panel, .nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody",
			".hHd-Xa_root .hHd-Xa_footArea, .hHd-Xa_root .hHd-Xa_settingsArea, .hHd-Xa_root .hHd-Xa_footerActions",
			".qDHVXG_fade",
			// Issue #96/#97: the two anchors that are hash-free BY CONSTRUCTION, so a
			// re-roll cannot silently kill them — but the surface can still be renamed
			// or removed (`_fade` → something else, or the shell dropping its
			// `data-shell-overlay` stamp), and the frame / fade rules that read them
			// would go inert exactly the way `.qDHVXG_fade` went inert unnoticed. These
			// two groups are what the classifier's attribute branch exists for.
			APP_FRAME_SELECTOR,
			SESSION_FADE_SELECTOR
		];
		/**
		 * J1 (adversarial review 10.8.0): three of the groups above are anchored on
		 * hashes that scripts/data/dead-hashes.cjs records as 0-hit on the hosts this
		 * repository can measure (`bqrRRG`, `nArs4W`, `qDHVXG`). They are kept as
		 * OR-fallbacks for the `0.1.0-rc.6 ~ 0.1.x` line the README still claims, and
		 * that line is an ASSUMPTION — there is no 0.1.x corpus here. So on every
		 * healthy modern host these three can only ever be missing, which meant
		 * `anchors.drifted` was permanently non-empty while `desktop-support.md`
		 * teaches tooling that `drifted: [] && pending: false` is the ONLY positive
		 * "all refinements live" signal — a contract no real host could satisfy, i.e.
		 * a red light that never turns green is as useless as one that never turns red.
		 * They are therefore reported in their own pool. `tests/hashes.test.cjs` pins
		 * this list against the dead-hash registry, so a hash retired or revived there
		 * reddens here instead of drifting silently.
		 */
		const RETIRED_PROBE_GROUPS = [
			".bqrRRG_card",
			".nArs4W_panel, .nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody",
			".qDHVXG_fade"
		];
		function warnOnMaterialSelectorDrift() {
			// A-1 (external review, 9.26.x): sample once was wrong — an
			// async-mounted settings/workbench surface and a genuinely drifted
			// host hash both look like "querySelector returned null". Run a
			// bounded chain of checkpoint rounds, gate every conclusive verdict
			// on the liveness sentinel, and remember groups that matched at
			// ANY round (late mounts clear themselves from the drifted list).
			if (typeof document.querySelector !== "function") return;
			const matchedOnce = new Set();
			let round = 0;
			let terminalDrift = null;
			// T3 (adversarial review 10.5.0): the missing list now splits into TWO
			// machine pools — renamed host hashes (drifted) vs surfaces this page
			// never mounted (notMounted). terminalNotMounted is latched beside
			// terminalDrift and retracts through the same late-correction observer.
			let terminalNotMounted = [];
			let verdictLatched = false;
			// T-1: the ladder timer is a resource like the observer, so it is owned
			// (handle kept for teardown) and gated. The gate covers the narrow race
			// where the host unmounts in the same tick as a step that has ALREADY
			// fired: clearTimeout on a consumed handle is a no-op and that step would
			// re-arm the rest of the chain.
			let ladderTimer = null;
			let ladderClosed = false;
			const cancelLadder = () => {
				ladderClosed = true;
				if (ladderTimer !== null) {
					try { clearTimeout(ladderTimer); } catch {}
					ladderTimer = null;
				}
				if (driftLadderDispose === cancelLadder) driftLadderDispose = null;
			};
			// A fresh chain supersedes the previous one, mirroring
			// armLateCorrection(): a re-apply must not leave two ladders sampling.
			if (driftLadderDispose !== null) {
				try { driftLadderDispose(); } catch {}
			}
			driftLadderDispose = cancelLadder;
			// R-3 (external review 9.27.0 round 2): an earlier `driftChainClosed`
			// early-stop flag was dead logic (the round bound already ends the
			// chain, and early closure is exactly what the A-1 gates forbid) —
			// removed rather than documented around.
			const probeGroups = () => {
				const stillMissing = [];
				for (const sel of MATERIAL_SELECTOR_PROBES) {
					let hit = false;
					try { hit = document.querySelector(sel) !== null; } catch { hit = false; }
					if (hit) matchedOnce.add(sel);
					else stillMissing.push(sel);
				}
				// The desktop-shell rule (issue #55) keeps its OWN gate: its
				// `.dshDesktopSidebarSurface` is a third-party class, not a
				// host hash — probing it on plain DSH Web would be a
				// permanent false alarm. The gate is the HOST signal
				// (`isDesktopShell`), not the shell frame class.
				if (isDesktopShell()) {
					let hit = false;
					try { hit = document.querySelector(DESKTOP_SIDEBAR_SELECTOR) !== null; } catch { hit = false; }
					if (hit) matchedOnce.add(DESKTOP_SIDEBAR_SELECTOR);
					else stillMissing.push(DESKTOP_SIDEBAR_SELECTOR);
				}
				return stillMissing;
			};
			/**
			 * T3 (adversarial review 10.5.0): "0 hits" has TWO causes and the old
			 * merged `drifted` field mislabeled one of them — a healthy host that
			 * simply never mounted that surface (settings closed, todo panel absent)
			 * read exactly like a renamed hash. Host ownership is the discriminator:
			 * a missing group is `notMounted` when at least one of its class tokens
			 * appears in a stylesheet the HOST owns — `style[data-plugin-css]` is the
			 * attribute the host's css loader stamps on its own chunks. Our material
			 * sheet carries no such attribute, so our own stylesheet can never vouch
			 * for a token. Deliberately read ONLY that attribute and never fetch
			 * <link> stylesheets (the zero-network invariant outranks classifier
			 * completeness): module CSS shipped as <link> is a DOCUMENTED blind spot
			 * — such a group is conservatively judged drifted, as is any host where
			 * no owned stylesheet is visible at all (pre-T3 semantics preserved).
			 */
			/**
			 * Issue #96/#97 — the attribute branch of the classifier.
			 *
			 * A group anchored on an ATTRIBUTE (not a class) has no `.class` token for
			 * `hostTokens` to look up, so it needs its own reading of the host's CSS:
			 *   `[class$="V"]` → owned while some class SELECTOR in host CSS ends with
			 *     exactly V. The bare substring is deliberately not enough: a host that
			 *     renames `_fade` to `_fadeFoot` still contains "_fade" everywhere, so a
			 *     substring test would file our now-dead rule as "healthy, just not
			 *     mounted" — which is precisely the silent no-op this whole classifier
			 *     exists to catch (issue #97 is the bug that shape hides).
			 *   `[data-x]` → the stamp name itself is the anchor; owned while the host
			 *     still mentions it anywhere in its own CSS.
			 * Both read only sheets the host stamps `data-plugin-css`, so our own sheet
			 * can never vouch for a group (the T1 rule above).
			 */
			const attributeAnchorOwned = (sel, hostCss) => {
				for (const m of sel.matchAll(/\[class\$=(?:"([^"]*)"|'([^']*)')\]/g)) {
					const value = m[1] || m[2] || "";
					if (value === "") continue;
					const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
					if (new RegExp("\\.[-\\w]*" + escaped + "(?![\\w-])").test(hostCss)) return true;
				}
				for (const m of sel.matchAll(/\[(data-[a-z0-9-]+)\]/g)) {
					if (hostCss.includes(m[1])) return true;
				}
				return false;
			};
			const classifyMissing = (missing) => {
				// J1: pull the retired anchors out BEFORE classifying. They are missing by
				// construction on the hosts we can measure, so leaving them in the pool
				// would let them be filed as drift (a false alarm on every healthy host)
				// or as notMounted (a claim that the host still owns a token we measured
				// absent). Neither is true; they are a documented assumption about 0.1.x.
				const retired = missing.filter((sel) => RETIRED_PROBE_GROUPS.includes(sel));
				const live = missing.filter((sel) => !RETIRED_PROBE_GROUPS.includes(sel));
				const hostTokens = new Set();
				const hostSheets = [];
				let hostSeen = false;
				try {
					for (const sheet of document.querySelectorAll("style[data-plugin-css]")) {
						hostSeen = true;
						const text = sheet.textContent || "";
						hostSheets.push(text);
						const tokens = text.match(/\.[A-Za-z0-9_-]+/g);
						if (tokens !== null) for (const token of tokens) hostTokens.add(token);
					}
				} catch {
					// A throwing / absent lookup cannot vouch for anything either.
					return { drifted: live.slice(), notMounted: [], retired };
				}
				if (!hostSeen) return { drifted: live.slice(), notMounted: [], retired };
				const hostCss = hostSheets.join("\n");
				const drifted = [];
				const notMounted = [];
				for (const sel of live) {
					const tokens = sel.match(/\.[A-Za-z0-9_-]+/g) || [];
					let owned = false;
					for (const token of tokens) {
						if (hostTokens.has(token)) { owned = true; break; }
					}
					// No `.class` token at all ⇒ an attribute-anchored group; the token
					// set says nothing either way, so ask the attribute branch instead of
					// defaulting to `drifted` (a false alarm aimed at every healthy host
					// that has simply not mounted that surface yet — the T3 mistake).
					if (!owned && tokens.length === 0) owned = attributeAnchorOwned(sel, hostCss);
					(owned ? notMounted : drifted).push(sel);
				}
				return { drifted, notMounted, retired };
			};
			/**
			 * Issue #105 — what the broad hash-free fade anchor actually addresses, right now.
			 *
			 * `[class$="_fade"]` was chosen in #97 to survive a hash re-roll, and the price is
			 * scope: EVERY element whose class attribute ENDS in `_fade` is neutralised under a
			 * wash, whether the host drew it or another plugin did. Reasoning about that was not
			 * enough (the review round found a third-party theme pack writing the same family),
			 * so the snapshot reports it: a page with one host fade says 1, a page where a second
			 * plugin also renders one says 2, and `fadeClasses` names them so a machine with two
			 * skin plugins installed can self-attribute without a human counting elements.
			 *
			 * This is an OBSERVATION, not a verdict — it publishes even while the drift ladder is
			 * still undecided, and when the DOM cannot be read it reports `null` rather than 0
			 * ("nothing matches" and "I could not look" are different facts).
			 */
			function fadeObservation() {
				try {
					const nodes = document.querySelectorAll(SESSION_FADE_SELECTOR);
					const classes = [];
					for (const el of Array.prototype.slice.call(nodes, 0, FADE_REPORT_LIMIT)) {
						const cls = (el && typeof el.getAttribute === "function" ? el.getAttribute("class") : null)
							|| (el && typeof el.className === "string" ? el.className : "");
						if (cls) classes.push(String(cls).trim().slice(0, 80));
					}
					return { fadeMatches: nodes.length, fadeClasses: classes };
				} catch {
					return { fadeMatches: null, fadeClasses: [] };
				}
			}
			const publishVerdict = (conclusive, drifted, notMounted, retired) => {
				// Machine-readable verdict for host/desktop tooling:
				// `drifted: [] && pending: false` is the ONLY positive
				// "all refinements live" signal; `pending: true` means
				// "not yet decidable — treat as unchecked". `notMounted` (T3):
				// host-token groups this page never mounted — explicitly NOT
				// drift, retractable, and the reason it is a SEPARATE field is
				// that the old merged list mislabeled a healthy host that just
				// never showed the surface. `retired` (J1) is the third pool:
				// anchors kept only for an unmeasured legacy host line, which is
				// why they are excluded from `drifted` — otherwise the positive
				// signal above was unreachable on every host anyone can measure.
				publishStatus({
					anchors: {
						probed: MATERIAL_SELECTOR_PROBES.length + (isDesktopShell() ? 1 : 0),
						drifted: conclusive ? drifted : [],
						notMounted: conclusive ? notMounted : [],
						retired: conclusive ? retired : [],
						pending: !conclusive,
						...fadeObservation()
					},
					checkedAt: Date.now()
				});
			};
			const runRound = () => {
				try {
					const stillMissing = probeGroups();
					const decided = stillMissing.filter((sel) => !matchedOnce.has(sel));
					const liveness = driftProbeLivenessProven(matchedOnce.size);
					const final = round >= DRIFT_RETRY_DELAYS_MS.length;
					// Only the FINAL round with liveness proven may call anything
					// `drifted`; every earlier or undecidable round is `pending`.
					const conclusive = final && liveness;
					// T3: classify BEFORE publishing, so the machine contract always
					// carries the drifted / notMounted split; the warn below stays a
					// drift-only alarm (an unmounted surface is not a failure).
					const classified = conclusive
						? classifyMissing(decided)
						: { drifted: [], notMounted: [], retired: [] };
					publishVerdict(conclusive, classified.drifted, classified.notMounted, classified.retired);
					// console.warn stays on the DECORATED list (human label) — the
					// machine field above keeps exact raw selectors (B-08). A
					// conclusive round latches ONCE per probe lifetime; it warns only
					// when a renamed hash made the list (an all-notMounted round is
					// silent), and undecidable rounds stay silent so "UI not mounted
					// yet" never reads as drift.
					if (conclusive && !verdictLatched
						&& (classified.drifted.length > 0 || classified.notMounted.length > 0)) {
						verdictLatched = true;
						terminalDrift = classified.drifted.slice();
						terminalNotMounted = classified.notMounted.slice();
						if (terminalDrift.length > 0) {
							const decorate = (sel) => sel === DESKTOP_SIDEBAR_SELECTOR
								? sel + " (desktop shell sidebar surface)"
								: sel;
							console.warn(
							"[dsh-dream-skin] host class names drifted — these DECORATIVE material refinements are inactive on this DSH build (harmless, cosmetic only). This list is everything the probe covers; the on-demand question / approval / plan card fills are NOT probed, so those anchors still need a human look:",
								terminalDrift.map(decorate).join(" | ")
							);
						}
						armLateCorrection();
					}
				} catch {}
			};
			/**
			 * R-2 (external review 9.27.0 round 2): the ladder only remembers
			 * mounts inside its ~4.3s window, so a surface that appears LATER
			 * (slow boots, or settings opened a minute in) was permanently
			 * mis-judged drifted. After a terminal verdict that named either
			 * pool, a low-cost body observer re-samples (debounced) and lets
			 * the verdict improve in ONE direction only: groups that mount
			 * retract from `drifted` AND from `notMounted` (T3 — a surface that
			 * shows up late also stops reading as "never mounted here"). It
			 * never adds drift and never re-warns; it disarms as soon as BOTH
			 * lists empty, on observer failure, or after a bounded number of
			 * wakes so a busy DOM cannot keep it spinning.
			 */
			function armLateCorrection() {
				if (typeof MutationObserver !== "function" || !document.body) return;
				// S-3 (external review 9.27.0 round 3): at most ONE live observer
				// per page — a fresh probe chain supersedes whatever was still
				// armed, so a remount cannot stack independent samplers.
				if (lateCorrectionDispose !== null) {
					try { lateCorrectionDispose(); } catch {}
				}
				let timer = null;
				let wakes = 0;
				let mo = null;
				let disposed = false;
				const close = () => {
					disposed = true;
					if (timer !== null) { try { clearTimeout(timer); } catch {} timer = null; }
					try { mo?.disconnect(); } catch {}
					mo = null;
					if (lateCorrectionDispose === close) lateCorrectionDispose = null;
				};
				lateCorrectionDispose = close;
				const resample = () => {
					timer = null;
					try {
						// Re-sample: any late hit is recorded into matchedOnce.
						probeGroups();
						// T3: both pools improve in the same one-way direction — a
						// group that mounts late leaves whichever list named it.
						const remainingDrift = terminalDrift.filter((sel) => !matchedOnce.has(sel));
						const remainingNotMounted = terminalNotMounted.filter((sel) => !matchedOnce.has(sel));
						const improved = remainingDrift.length !== terminalDrift.length
							|| remainingNotMounted.length !== terminalNotMounted.length;
						if (!improved) {
							if (++wakes >= 25) close(); // never improved — stop spending
							return;
						}
						terminalDrift = remainingDrift;
						terminalNotMounted = remainingNotMounted;
						// J1: the retired pool is NOT one-way retractable in the same
						// sense — these anchors are expected to stay absent on the hosts
						// we can measure, and a late hit here would mean the assumption
						// itself broke (a 0.1.x-era hash reappeared), so it is re-published
						// from the live classifier rather than from the latched copy.
						publishVerdict(true, remainingDrift, remainingNotMounted,
							classifyMissing(probeGroups()).retired);
						if (remainingDrift.length === 0 && remainingNotMounted.length === 0) close();
					} catch { close(); }
				};
				try {
					mo = new MutationObserver(() => {
						// `disposed` is the ONE live gate and it is checked HERE only:
						// a second guard deeper in resample() would absorb a break of
						// this one and mutation testing could not see it (redundant
						// doors hide half-fixes — CONTRIBUTING admission rule 1). The
						// old `terminalDrift === null` bail-outs were dead branches
						// (an observer only exists once a terminal verdict named the
						// list) and are gone, per the R-3 precedent.
						if (disposed || timer !== null) return;
						try { timer = setTimeout(resample, 300); } catch { close(); }
					});
					mo.observe(document.body, { childList: true, subtree: true });
				} catch { close(); }
			}
			const scheduleNext = () => {
				if (round >= DRIFT_RETRY_DELAYS_MS.length) return;
				const delay = DRIFT_RETRY_DELAYS_MS[round];
				round += 1;
				const step = () => {
					ladderTimer = null;
					if (ladderClosed) return; // unloaded mid-flight: publish nothing, re-arm nothing
					runRound();
					scheduleNext();
				};
				// Round 1 rides the next animation frame like the old probe
				// (frame 1 may not have painted anything); later rounds are the
				// bounded retry ladder. The chain ENDS after the last delay:
				// if liveness was never proven, the snapshot honestly stays
				// `pending` (no timers spin, and a later re-apply re-arms it);
				// if it ended `drifted`, the late-correction observer above
				// keeps the verdict honest for the rest of the session.
				if (delay <= 0) { step(); return; }
				try { ladderTimer = setTimeout(step, delay); } catch { /* no timers — stay pending */ }
			};
			scheduleNext();
		}
		/** Remove the injected liquid-glass <style> node on fiber unload. */
		function teardownMaterial() {
			materialStyleEl?.remove();
			materialStyleEl = null;
			// S-3: the late-correction observer is part of the material/probe
			// residue — unload must disarm it too, not just drop the <style>.
			if (lateCorrectionDispose !== null) {
				try { lateCorrectionDispose(); } catch {}
			}
			// T-1: the ladder is residue too. Cancelling it is what makes "an
			// unloaded plugin publishes NOTHING" true for the whole 4.3s window
			// rather than only for the late-correction observer.
			if (driftLadderDispose !== null) {
				try { driftLadderDispose(); } catch {}
			}
		}
		/**
		 * T9 (adversarial review 10.5.0): the settings-nav icon hook is a page-scope
		 * IIFE OUTSIDE the loader's lifecycle (it swallows every failure and cannot
		 * be re-registered), so the fiber reaches it through the non-enumerable
		 * arm/dispose handles on the published nav snapshot. armNavHook claims the
		 * hook for THIS apply's generation token; disposeNavHook (teardown, below)
		 * tears it down — but only if this generation still owns it, so a hot
		 * reload whose new copy applied FIRST survives the old fiber's late unload.
		 * Both are no-ops when the hook is absent (script stripped, non-web shell)
		 * and never throw: this is cosmetics, not lifecycle.
		 */
		function armNavHook(navGeneration) {
			try {
				const api = typeof window !== "undefined" ? window[NAV_STATUS_KEY] : null;
				if (api !== null && typeof api.arm === "function") api.arm(navGeneration);
			} catch {}
		}
		function disposeNavHook(navGeneration) {
			try {
				const api = typeof window !== "undefined" ? window[NAV_STATUS_KEY] : null;
				if (api !== null && typeof api.dispose === "function") api.dispose(navGeneration);
			} catch {}
		}

		/**
		 * Apply the persisted popup-fill weight onto `:root` as MODAL_FILL_VAR, so
		 * every injected rule that references it (the user-options card fill) stays
		 * in sync without rebuilding the stylesheet. The weight is the base-color
		 * percentage (0..100): higher = more opaque/solid, lower = more transparent.
		 * Called at boot (so a saved value re-applies) and whenever the slider moves.
		 *
		 * Issues #100/#101: this channel goes through dialogAlpha(), the SAME floored
		 * reading the layer-2 leg uses. Before that, one slider meant two minimums —
		 * the settings dialog held at 92% while the question / approval / plan-review
		 * cards (the surfaces you must read BEFORE answering) could still reach 0%,
		 * i.e. the conversation showed straight through the thing asking you a
		 * question. The floor only exists while a wallpaper wash is on screen, so
		 * with no wallpaper this channel keeps the slider's full travel.
		 */
		function applyModalOpacity() {
			const weight = Math.round(readDialogAlpha() * 100);
			try {
				document.documentElement.style.setProperty(MODAL_FILL_VAR, `${weight}%`);
			} catch {
				// document null in a headless eval — the CSS fallback (94%) still applies
			}
		}

		/**
		 * Driver for DSH's elevated popup surfaces. The reporter found the slider
		 * "did nothing": it only ever affected the narrow `.Mbwy4a_card` rule. Real
		 * popups / dropdown menus / dialogs consume DSH's semantic tokens
		 * `--dsw-alias-bg-overlay` ("overlay and popover background"),
		 * `--dsw-specific-menu` (dropdown / popup menus) and `--dsw-alias-bg-layer-2`
		 * (modal dialogs / settings panels). We stack an override layer for all three
		 * at the slider's alpha, so 0% = fully see-through and 100% = solid — a real,
		 * visible change. Overlay and menu scale to the ACTIVE base color; layer-2
		 * keeps the skin's OWN hue only when it parses as #rgb/#rrggbb or
		 * comma-separated rgb()/rgba() and otherwise falls back to the same base
		 * color (adjudication 10.5.1; the pack-side contract lives in
		 * docs/themes-spec.md "颜色校验"). Pure token override (no backdrop-filter),
		 * so it cannot re-trigger the fixed-modal containing-block bug. Called at
		 * boot and on every slider move. The layer-2 channel carries a readability floor
		 * (DIALOG_ALPHA_FLOOR below — a floor on the CHANNEL, so every surface painted
		 * from layer-2 is covered, not the dialog alone), gated on the wallpaper wash
		 * and shared with the card channel (issues #100/#101); the other two follow the
		 * slider exactly.
		 */
		// Issue #67: modal dialogs / settings panels (`Modal.module.css`'s
		// `._dialog_*` etc.) paint from `--dsw-alias-bg-layer-2`, which the skins
		// hard-code at 0.85 alpha (mist 0.6) — the popup-opacity slider never
		// reached it, so even at the most-solid end the dialog stayed see-through
		// and the window content bled into the dialog's input area. Drive it from
		// the slider too, keeping each skin's OWN layer-2 hue and letting only
		// the alpha follow the weight: 0% transparency => rgba(..., 1) => full
		// occlusion.
		// Exception (adjudication 10.5.1): the own-hue guarantee holds only for
		// shapes toRgbaStrict parses (#rgb/#rrggbb, comma-separated rgb()/rgba());
		// any other legal CSS color (hsl/hsla, space-separated, percent
		// components, prefix junk) falls back to the scheme base instead, so the
		// slider keeps FULL range — only the hue is not taken from the skin.
		const POPUP_TOKENS = ["--dsw-alias-bg-overlay", "--dsw-specific-menu", "--dsw-alias-bg-layer-2"];
		/**
		 * Issue #98 — the readability floor on the FLOORED CHANNELS.
		 *
		 * Read the name as "the floor for the layer-2 leg", which is what it is: the
		 * weight applied to `--dsw-alias-bg-layer-2`, a token the host paints with far
		 * more than dialogs. Measured on the host install this release was built
		 * against: 20 background/box-shadow rules across 9 packages consume it directly
		 * (Settings panel, plugin manager, agent-preset cards, document-preview states,
		 * the directory picker's loading float, trajectory tooltips and plot) plus one
		 * derived alias (`--dsw-alias-settings-card-fill`, defined on `body`). The
		 * report in issue #98 was about the dialog; the lever available without betting
		 * on another DOM anchor is the channel, so the whole channel is floored and the
		 * slider's own hint says so in all 8 languages. Scoping the floor to dialog
		 * subtrees only is the next iteration's job and is NOT what this constant does.
		 *
		 * `--dsw-alias-bg-overlay` and `--dsw-specific-menu` are the two legs that keep
		 * the slider's full 0–1 range, because a see-through menu or scrim is a feature,
		 * not a defect.
		 *
		 * WHY 0.92 AND NOT A ROUND NUMBER: every shipped skin authors its own
		 * layer-2 at 0.92 (dark pair) or 0.94 (light pair), and that is the surface
		 * `scripts/skin-audit.cjs` solves and grades the three text levels against.
		 * Below that alpha the palette's guarantee simply stops applying — the audit
		 * never measured the state being rendered. The constant is therefore pinned
		 * to the MINIMUM authored layer-2 alpha in `tests/skin.quality.test.cjs`:
		 * re-roll the design system to a different elevation fill and that gate
		 * reddens instead of this number quietly going stale. (Measured, not assumed:
		 * compositing the fills over a white backdrop shows tertiary labels at
		 * WCAG 3.42 / Lc 39 even at 0.85, so this floor bounds how much of the page
		 * behind a layer-2 surface can be read THROUGH it — it is not, and must not be
		 * described as, a contrast certification.)
		 *
		 * Deliberately a floor on the ALPHA rather than a hardcoded fill on the dialog
		 * element: the token route keeps each skin's OWN layer-2 hue, survives hosts
		 * that re-roll their class hashes, and adds no `backdrop-filter` to a subtree
		 * that is a documented third-party slot host (the containing-block trap
		 * recorded in the 10.5.0 review for the question / approval cards).
		 *
		 * ISSUES #100/#101 — WHERE THIS FLOOR REACHES, AND WHEN:
		 *   1. TWO channels, not one. `applyModalOpacity()` (the card fill behind the
		 *      question / approval / plan-review cards) reads the same readDialogAlpha()
		 *      as the layer-2 leg. One slider with two minimums was the defect: the
		 *      settings dialog held at 92% while the cards you must read BEFORE
		 *      answering could still be dragged fully transparent.
		 *   2. Only while a wallpaper wash is on screen. The floor exists because the
		 *      wash puts readable page content BEHIND these surfaces; with no wallpaper
		 *      the host's own opaque canvas is back there, so clamping bought nothing
		 *      and cost 92% of the slider's travel (displayed 8%..100% transparency all
		 *      rendered the same). `washActive` is the single authority — the JS mirror
		 *      of WASH_ACTIVE_ATTR, the very attribute the CSS wash rules read, so the
		 *      floor and the wallpaper cannot disagree about what is on screen.
		 *   3. KNOWN, DELIBERATE DEVIATION (issue #103): mist seeds its own dialog fill
		 *      at 0.90, BELOW this 0.92 floor, so a fresh mist install renders the
		 *      floored surfaces slightly more solid than that skin's authored intent.
		 *      Raising mist to 0.92 means re-rolling the whole design-system output
		 *      (8 skins x 57 tokens), so the deviation stays: it is one step of one
		 *      slider on one skin. tests/client.smoke.test.cjs pins BOTH halves (the 0.90
		 *      seed AND 0.90 < floor) — move either side and that gate reddens and
		 *      forces the claim to be re-decided instead of silently reversed.
		 */
		const DIALOG_ALPHA_FLOOR = 0.92;
		/**
		 * The slider's authority over the two FLOORED channels: `max(slider, floor)`
		 * while a wallpaper wash is on screen, the raw slider value when there is none
		 * (issue #100). The `--dsw-alias-bg-overlay` / `--dsw-specific-menu` legs keep
		 * calling readModalOpacity() directly — a see-through menu or scrim is a feature.
		 */
		function readDialogAlpha() {
			const alpha = readModalOpacity();
			return washActive ? Math.max(alpha, DIALOG_ALPHA_FLOOR) : alpha;
		}
		function applyModalOverlay(ctx) {
			const alpha = readModalOpacity();
			const current = ctx.theme.getTheme();
			const active = rawActiveTheme(current);
			const baseFor = (scheme) => {
				if (active && active.colorScheme === scheme && typeof active.tokens["--dsw-alias-bg-base"] === "string") {
					return active.tokens["--dsw-alias-bg-base"];
				}
				return BUILTIN_BASE[scheme];
			};
			const fillFor = (name, scheme) => {
				if (name === "--dsw-alias-bg-layer-2" && active && active.colorScheme === scheme && typeof active.tokens["--dsw-alias-bg-layer-2"] === "string") {
					const raw = active.tokens["--dsw-alias-bg-layer-2"];
					// 10.5.1: only hand the skin's own layer-2 through when it
					// PARSES. Packs may legally declare hsl()/hsla() (themes-spec
					// accepts them), and toRgba's legacy fallback would ship such
					// a value through unchanged — alpha intact — so the slider
					// would silently stop affecting that skin's dialogs. Fall
					// back to the scheme base so the slider keeps full range.
					if (toRgbaStrict(raw, 1) !== null) return raw;
				}
				return baseFor(scheme);
			};
			const overrides = {};
			// Issue #98/#101: the floor belongs to the dialog/card channels; menus and
			// popovers keep the slider's full range, so 0% still means "see straight
			// through" there. Issue #100: readDialogAlpha() drops the floor entirely
			// while no wallpaper wash is on screen.
			for (const name of POPUP_TOKENS) {
				const weight = name === "--dsw-alias-bg-layer-2" ? readDialogAlpha() : alpha;
				overrides[name] = {
					light: toRgba(fillFor(name, "light"), weight),
					dark: toRgba(fillFor(name, "dark"), weight)
				};
			}
			popupTokenOverrides = overrides;
			applyCombinedTokenOverrides(ctx);
		}
		//#endregion

		//#region dsh-dream-skin: image compression
		/**
		 * Downscale an image onto a canvas and return a JPEG data URL, so a
		 * wallpaper stays well inside the localStorage quota (≤ ~2MB).
		 */
		function compressImage(image, maxSide, quality) {
			const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.round(image.width * scale));
			canvas.height = Math.max(1, Math.round(image.height * scale));
			const context = canvas.getContext("2d");
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			return canvas.toDataURL("image/jpeg", quality);
		}

		/** Read a picked file into a compressed data URL (null on failure). */
		function readImageAsDataUrl(file, onDone) {
			const reader = new FileReader();
			reader.onerror = () => onDone(null);
			reader.onload = () => {
				const image = new Image();
				image.onerror = () => onDone(null);
				image.onload = () => {
					try {
						let dataUrl = compressImage(image, 1600, 0.75);
						if (dataUrl.length > 2000000) dataUrl = compressImage(image, 1000, 0.6);
						if (dataUrl.length > 2000000) dataUrl = compressImage(image, 800, 0.5);
						onDone(dataUrl);
					} catch {
						onDone(null);
					}
				};
				image.src = reader.result;
			};
			reader.readAsDataURL(file);
		}
		//#endregion

		//#region dsh-dream-skin: settings row stores
		/**
		 * Skin row slot store: a mirror of the theme service snapshot. The
		 * plugin's apply-world change listener is the only writer; the row
		 * component reads via props.useStore.
		 */
		function createSkinStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({
					skin: "system",
					revision: -1
				}),
				actions: {
					sync: (d, skin, revision) => {
						if (revision <= d.revision) return;
						d.skin = skin;
						d.revision = revision;
					}
				}
			});
		}

		/** Wallpaper row store: url + opacity + blur, written only by this plugin. */
		function createWallpaperStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({
					url: null,
					opacity: DEFAULT_WALLPAPER_OPACITY,
					blur: DEFAULT_WALLPAPER_BLUR,
					sidebarOpacity: DEFAULT_SIDEBAR_OPACITY,
					history: [],
					revision: -1
				}),
				actions: {
					sync: (d, url, opacity, blur, sidebarOpacity, history, revision) => {
						if (revision <= d.revision) return;
						d.url = url;
						d.opacity = opacity;
						d.blur = blur;
						d.sidebarOpacity = sidebarOpacity;
						d.history = history;
						d.revision = revision;
					}
				}
			});
		}
		//#endregion

		//#region dsh-dream-skin: settings rows
		/** Inline style sheet for the rows (kept dependency-free). */
		const styles = {
			group: {
				borderBottom: "1px solid var(--dsw-alias-border-l2)",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				padding: "16px 0"
			},
			section: {
				display: "flex",
				flexDirection: "column",
				width: "100%"
			},
			title: {
				color: "var(--dsw-alias-label-primary)",
				fontSize: "14px",
				fontWeight: 400,
				lineHeight: "22px"
			},
			hint: {
				color: "var(--dsw-alias-label-tertiary)",
				fontSize: "12px",
				lineHeight: "18px"
			},
			grid: {
				display: "flex",
				flexWrap: "wrap",
				gap: "10px"
			},
			card: {
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "6px",
				width: "96px",
				padding: "3px",
				borderRadius: "10px",
				background: "transparent",
				border: "none",
				cursor: "pointer",
				font: "inherit",
				boxSizing: "border-box",
				position: "relative",
				outline: "none"
			},
			cardSelected: {
				boxShadow: "0 0 0 2px var(--dsw-alias-brand-primary)",
				background: "rgba(127, 127, 127, 0.10)"
			},
			cardCheck: {
				position: "absolute",
				top: "-4px",
				right: "-4px",
				width: "18px",
				height: "18px",
				borderRadius: "50%",
				background: "var(--dsw-alias-brand-primary)",
				color: "#ffffff",
				fontSize: "12px",
				lineHeight: "18px",
				textAlign: "center",
				fontWeight: 700
			},
			cardLabel: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "12px",
				lineHeight: "16px",
				whiteSpace: "nowrap"
			},
			cardLabelSelected: {
				color: "var(--dsw-alias-label-primary)"
			},
			swatch: {
				width: "100%",
				height: "52px",
				borderRadius: "8px",
				boxSizing: "border-box",
				padding: "8px",
				display: "flex",
				flexDirection: "column",
				justifyContent: "center",
				gap: "6px"
			},
			swatchLine: {
				height: "7px",
				borderRadius: "4px"
			},
			defaultSwatch: {
				width: "100%",
				height: "52px",
				borderRadius: "8px",
				boxSizing: "border-box",
				display: "flex",
				overflow: "hidden",
				border: "1px solid var(--dsw-alias-border-l2)"
			},
			button: {
				height: "32px",
				padding: "0 14px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "var(--dsw-alias-button-elevated-fill)",
				color: "var(--dsw-alias-label-primary)",
				cursor: "pointer",
				font: "inherit",
				fontSize: "13px",
				boxSizing: "border-box"
			},
			buttonDanger: {
				color: "var(--dsw-alias-state-error-primary)"
			},
			/**
			 * Small control (round-5 UI unification): the compact sibling of
			 * `button` — SAME radius (8px), SAME border token, SAME font stack,
			 * only smaller so secondary actions read as one family with the
			 * primary 32px buttons instead of a second design language.
			 */
			tinyButton: {
				height: "26px",
				padding: "0 10px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				cursor: "pointer",
				font: "inherit",
				fontSize: "12px",
				lineHeight: "24px",
				boxSizing: "border-box"
			},
			/**
			 * ONE selected language for every choice control (round-5): brand
			 * border + a subtle brand wash — used by segmented options, the
			 * share-copied state and any toggleable chip, matching the big
			 * material cards so "selected" looks the same everywhere. The wash
			 * is a var() with a static rgba fallback (blue-team R5-5) instead
			 * of color-mix, so webviews without color-mix keep the wash.
			 */
			tinyButtonActive: {
				color: "var(--dsw-alias-brand-primary)",
				borderColor: "var(--dsw-alias-brand-primary)",
				background: "var(--dsw-alias-brand-primary-soft, rgba(124, 92, 255, 0.12))"
			},
			urlInput: {
				flex: 1,
				minWidth: "220px",
				height: "32px",
				padding: "0 10px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "var(--dsw-alias-bg-layer-1)",
				color: "var(--dsw-alias-label-primary)",
				font: "inherit",
				fontSize: "13px",
				boxSizing: "border-box"
			},
			urlInvalidHint: {
				color: "var(--dsw-alias-state-error-primary)",
				fontSize: "12px",
				lineHeight: "18px"
			},
			presetswatches: {
				width: "48px",
				height: "32px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				cursor: "pointer",
				padding: 0
			},
			historyThumb: {
				width: "56px",
				height: "36px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				cursor: "pointer",
				padding: 0,
				boxSizing: "border-box",
				backgroundSize: "cover",
				backgroundPosition: "center"
			},
			accentPreset: {
				width: "24px",
				height: "24px",
				borderRadius: "50%",
				border: "1px solid rgba(128,128,128,0.4)",
				cursor: "pointer",
				padding: 0,
				boxSizing: "border-box"
			},
			accentDot: {
				width: "22px",
				height: "22px",
				borderRadius: "50%",
				border: "1px solid var(--dsw-alias-border-l2)",
				boxSizing: "border-box",
				flex: "none"
			},
			accentHex: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "13px",
				lineHeight: "20px",
				fontFamily: "ui-monospace, monospace"
			},
			checkbox: {
				accentColor: "var(--dsw-alias-brand-primary)",
				width: "16px",
				height: "16px"
			},
			preview: {
				width: "72px",
				height: "44px",
				objectFit: "cover",
				borderRadius: "6px",
				border: "1px solid var(--dsw-alias-border-l2)"
			},
			actionRow: {
				display: "flex",
				alignItems: "center",
				gap: "10px",
				flexWrap: "wrap"
			},
			sliderRow: {
				display: "flex",
				alignItems: "center",
				gap: "10px",
				minWidth: "240px"
			},
			sliderLabel: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "13px",
				whiteSpace: "nowrap",
				// F3 (round-7 review): auto width with a minimum — the fixed 90px
				// clipped the "?" help badge appended after longer labels
				// (输入框透明度/弹窗透明度) onto the slider track.
				minWidth: "90px",
				flex: "none"
			},
			slider: {
				flex: 1,
				accentColor: "var(--dsw-alias-brand-primary)"
			},
			sliderValue: {
				color: "var(--dsw-alias-label-secondary)",
				fontSize: "12px",
				whiteSpace: "nowrap",
				width: "44px",
				textAlign: "right"
			}
		};

		/** Mini palette preview driven by one skin's token table. */
		function Swatch({ tokens }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...styles.swatch,
					background: tokens["--dsw-alias-bg-layer-1"],
					border: `1px solid ${tokens["--dsw-alias-border-l2"]}`
				},
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: {
							...styles.swatchLine,
							width: "70%",
							background: tokens["--dsw-alias-label-primary"],
							opacity: 0.85
						}
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: {
							...styles.swatchLine,
							width: "45%",
							background: tokens["--dsw-alias-brand-primary"]
						}
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: {
							...styles.swatchLine,
							width: "55%",
							background: tokens["--dsw-alias-label-secondary"],
							opacity: 0.55
						}
					})
				]
			});
		}

		/** "Default" chip: follow the built-in appearance (light + dark halves). */
		function DefaultSwatch() {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.defaultSwatch,
				children: [
					(0, react_jsx_runtime.jsx)("div", { style: { flex: 1, background: "#f4f4f5" } }),
					(0, react_jsx_runtime.jsx)("div", { style: { flex: 1, background: "#1c1c20" } })
				]
			});
		}

		/** One selectable skin card. */
		function SkinCard({ skin, selected, onSelect, t }) {
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: onSelect,
				"aria-pressed": selected,
				style: {
					...styles.card,
					...(selected ? styles.cardSelected : {})
				},
				children: [
					selected ? (0, react_jsx_runtime.jsx)("span", {
						style: styles.cardCheck,
						children: "✓"
					}) : null,
					(0, react_jsx_runtime.jsx)(Swatch, { tokens: skin.tokens }),
					(0, react_jsx_runtime.jsx)("span", {
						style: {
							...styles.cardLabel,
							...(selected ? styles.cardLabelSelected : {})
						},
						children: t(`skin.${skin.id}`)
					})
				]
			});
		}

		/**
		 * Skin picker row registered into the Settings → General item slot,
		 * right after the built-in Appearance row: title + a "Default" chip and
		 * one swatch card per curated skin.
		 */
		function SkinRow({ t, setSkin, useStore }) {
			const skin = useStore((s) => s.skin);
			const selected = SKINS.some((candidate) => candidate.id === skin) ? skin : null;
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("skin.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.grid,
						children: [
							(0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSkin(DEFAULT_SKIN),
								"aria-pressed": selected === null,
								style: {
									...styles.card,
									...(selected === null ? styles.cardSelected : {})
								},
								children: [
									(0, react_jsx_runtime.jsx)(DefaultSwatch, {}),
									(0, react_jsx_runtime.jsx)("span", {
										style: {
											...styles.cardLabel,
											...(selected === null ? styles.cardLabelSelected : {})
										},
										children: t("skin.default")
									})
								]
							}),
							SKINS.map((skinDefinition) => (0, react_jsx_runtime.jsx)(SkinCard, {
								skin: skinDefinition,
								selected: selected === skinDefinition.id,
								onSelect: () => setSkin(skinDefinition.id),
								t
							}, skinDefinition.id))
						]
					})
				]
			});
		}

		/** One labeled slider (opacity or blur). */
		/**
		 * "?" help badge (round-6): hover reveals a native-title tooltip.
		 * ALL explanatory copy lives in these badges now — no persistent hint
		 * paragraphs, the settings page stays scannable (cognitive-cost review).
		 * Reachability (blue-team F2): the visible "?" carries aria-label, so
		 * screen-reader users get the full text; mouse users get the native
		 * tooltip. Chromium does NOT show a title tooltip on keyboard focus —
		 * the badge is still tabbable so SR focus rings announce it, but the
		 * copy itself is authored for hover/screen-reader consumption.
		 */
		function HelpDot({ text }) {
			return (0, react_jsx_runtime.jsx)("span", {
				title: text,
				"aria-label": text,
				role: "note",
				tabIndex: 0,
				style: {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					width: "15px",
					height: "15px",
					marginLeft: "5px",
					borderRadius: "50%",
					border: "1px solid var(--dsw-alias-border-l2, #666)",
					color: "var(--dsw-alias-label-secondary)",
					fontSize: "10px",
					lineHeight: "1",
					cursor: "help",
					userSelect: "none",
					flex: "none",
					verticalAlign: "middle"
				},
				children: "?"
			});
		}

		function Slider({ label, value, min, max, step, format, onChange, help }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.sliderRow,
				children: [
					(0, react_jsx_runtime.jsxs)("span", {
						style: styles.sliderLabel,
						children: [
							label,
							help ? (0, react_jsx_runtime.jsx)(HelpDot, { text: help }) : null
						]
					}),
					(0, react_jsx_runtime.jsx)("input", {
						type: "range",
						min,
						max,
						step,
						value,
						style: styles.slider,
						onChange: (event) => onChange(Number(event.target.value))
					}),
					(0, react_jsx_runtime.jsx)("span", {
						style: styles.sliderValue,
						children: format(value)
					})
				]
			});
		}

		/**
		 * Wallpaper row: choose (compressed to a data URL) and preview the
		 * wallpaper, plus the recent-history strip. All opacity/blur sliders
		 * live in the dedicated GlassRow below so every "how translucent is
		 * the glass" control sits in ONE group (cognitive-cost review).
		 */
		function WallpaperRow({ t, setWallpaper, applyFromHistory, useStore }) {
			const url = useStore((s) => s.url);
			const history = useStore((s) => s.history);
			const inputRef = (0, _react.useRef)(null);
			const onPick = () => inputRef.current?.click();
			const onFile = (event) => {
				const file = event.target.files?.[0];
				if (file === void 0) return;
				readImageAsDataUrl(file, (dataUrl) => {
					if (dataUrl !== null) setWallpaper(dataUrl);
					event.target.value = "";
				});
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: [
							t("background.title"),
							// Round-6: persistent hint paragraph collapsed into the "?"
							// badge — help on hover, page stays scannable.
							(0, react_jsx_runtime.jsx)(HelpDot, { text: t("background.hint") })
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							url !== null ? (0, react_jsx_runtime.jsx)("img", {
								src: url,
								alt: "",
								style: styles.preview
							}) : null,
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: onPick,
								children: t("background.choose")
							}),
							url !== null ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: {
									...styles.button,
									...styles.buttonDanger
								},
								onClick: () => setWallpaper(null),
								children: t("background.remove")
							}) : null,
							(0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								type: "file",
								accept: "image/*",
								style: { display: "none" },
								onChange: onFile
							})
						]
					}),
					history && history.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
						style: { padding: "0" },
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								style: styles.hint,
								children: t("background.history")
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								style: styles.actionRow,
								children: history.map((entry, i) => {
									// URL entries must be wrapped in url("...") too — a bare
									// URL string is not a valid CSS background value and would
									// render a blank thumbnail (gradients are fine as-is).
									const isImage = entry.kind !== "gradient" && entry.kind !== "url";
									const bg = isImage || entry.kind === "url"
										? `url("${cssUrlValue(entry.value)}") center/cover no-repeat`
										: entry.value;
									return (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										title: t("background.historyApply"),
										style: {
											...styles.historyThumb,
											background: bg
										},
										onClick: () => applyFromHistory(entry.kind, entry.value),
										children: null
									}, i);
								})
							})
						]
					}) : null
				]
			});
		}

		/**
		 * Glass-effect row: ONE group holding every translucency control —
		 * material preset (default / frosted / liquid glass), wallpaper
		 * opacity + blur, sidebar opacity (with its link toggle), composer
		 * (input box) opacity and popup opacity. Every slider reads as an
		 * opacity: higher = more solid, lower = more see-through.
		 * State is read through useStore (the host slot contract, same as every
		 * other row) — the injected bag only carries the action callbacks.
		 */
		function GlassRow({ t, setMaterialPreset, setOpacity, setBlur, setSidebarOpacity, setSidebarLink, setComposerOpacity, setModalOpacity, useStore }) {
			const materialPreset = useStore((s) => s.materialPreset);
			const opacity = useStore((s) => s.opacity);
			const blur = useStore((s) => s.blur);
			const sidebarOpacity = useStore((s) => s.sidebarOpacity);
			const composerOpacity = useStore((s) => s.composerOpacity);
			const modalOpacity = useStore((s) => s.modalOpacity);
			const [sidebarLink, setLink] = (0, _react.useState)(readSidebarLink());
			// Exactly TWO materials — frosted IS the factory default, liquid is
			// the upgrade. No third "default/none" chip (user review round 2).
			// Round 5: BIG preview cards (user: tiny chips "显不出来重要性")
			// — each card renders a live glass swatch showing the material's
			// own tone tail over the accent color, so the difference is
			// visible before clicking. The material is STYLE-ONLY: clicking
			// never moves any slider value. Tone strings are pulled from
			// MATERIAL_PRESETS (single source of truth, blue-team R5-4).
			const PRESETS = MATERIAL_PRESETS.map((p) => ({
				id: p.id,
				tone: p.tone,
				swatch: p.swatch,
				label: t(p.id === "frosted" ? "material.frosted" : "material.liquid"),
				desc: t(p.id === "frosted" ? "material.frosted.desc" : "material.liquid.desc")
			}));
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.title,
						children: [
							t("glass.title"),
							// "?" help badge (round 3): native title tooltip — zero
							// layout cost, works in every webview, no portal needed.
							(0, react_jsx_runtime.jsx)("span", {
								title: t("glass.help"),
								"aria-label": t("glass.help"),
								// Keyboard-reachable (blue-team B5): focus shows the native
								// tooltip in Chromium and lets SR users reach the text.
								tabIndex: 0,
								style: {
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: "16px",
									height: "16px",
									marginLeft: "6px",
									borderRadius: "50%",
									border: "1px solid var(--dsw-alias-border-l2, #666)",
									color: "var(--dsw-alias-label-secondary)",
									fontSize: "11px",
									lineHeight: "1",
									cursor: "help",
									userSelect: "none"
								},
								children: "?"
							})
						]
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: { ...styles.actionRow, gap: "10px" },
						children: PRESETS.map((preset) => {
							const active = materialPreset === preset.id;
							return (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								"aria-pressed": active,
								// Round-6: material.hint lives as the card's hover tooltip.
								title: t("material.hint"),
								style: {
									flex: "1 1 0",
									display: "flex",
									flexDirection: "column",
									alignItems: "stretch",
									gap: "8px",
									padding: "10px",
									borderRadius: "10px",
									border: active
										? "1.5px solid var(--dsw-alias-brand-primary, #7c5cff)"
										: "1px solid var(--dsw-alias-border-l2, #666)",
									background: "transparent",
									color: "inherit",
									cursor: "pointer",
									textAlign: "left",
									font: "inherit",
									// Selected card keeps a subtle brand wash so the active
									// state is unmistakable at a glance. var() + static
									// rgba fallback instead of color-mix (blue-team R5-5):
									// no-color-mix webviews keep the wash too.
									boxShadow: active ? "0 0 0 3px var(--dsw-alias-brand-primary-soft, rgba(124, 92, 255, 0.18))" : "none"
								},
								onClick: () => setMaterialPreset(preset.id),
								children: [
									// Live glass swatch (round-9 lens recipe): a SHARP striped
									// backdrop ("the wallpaper") + a REAL backdrop-filter
									// lens you see it through — same layering as the actual
									// composer glass. frosted = thick milk (blur melts the
									// stripes); liquid = clear pane (stripes stay readable)
									// with a bright rim + sheen. The difference is structural,
									// not a filter tint.
									(0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": true,
										style: {
											display: "block",
											height: "44px",
											borderRadius: "7px",
											overflow: "hidden",
											position: "relative",
											// Sharp spectrum ribbon backdrop (user round-10: keep the
											// old spectral band, drop the stripes) — NOT filtered;
											// the lens on top is what the glass does to it.
											background: "linear-gradient(120deg, #f43f5e, #f59e0b 35%, #10b981 70%, #3b82f6)"
										},
										children: (0, react_jsx_runtime.jsx)("span", {
											style: {
												position: "absolute",
												inset: "6px",
												borderRadius: "5px",
												overflow: "hidden",
												// The GLASS LENS: a real backdrop-filter pane.
												WebkitBackdropFilter: `blur(${preset.swatch.blur}px) ${preset.swatch.filter}`,
												backdropFilter: `blur(${preset.swatch.blur}px) ${preset.swatch.filter}`,
												background: preset.swatch.fill,
												boxShadow: `inset 0 0 0 1px ${preset.swatch.rim}`
											},
											children: preset.swatch.sheen ? (0, react_jsx_runtime.jsx)("span", {
												style: {
													position: "absolute",
													inset: 0,
													// Diagonal sheen — screen-blended light sweep.
													background: "linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.08) 35%, transparent 60%)",
													mixBlendMode: "screen"
												}
											}) : null
										})
									}),
									(0, react_jsx_runtime.jsx)("span", {
										style: { fontWeight: 600, fontSize: "13px" },
										children: preset.label
									}),
									(0, react_jsx_runtime.jsx)("span", {
										style: { fontSize: "11px", opacity: 0.72, lineHeight: 1.35 },
										children: preset.desc
									})
								]
							}, preset.id);
						})
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.opacity"),
						// UI semantic is TRANSPARENCY (round 3): the slider shows
						// 100 − stored opacity and re-inverts on change, so dragging
						// right = more see-through. Storage stays opacity-based.
						value: 100 - Math.round(opacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: (v) => setOpacity(100 - v)
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.blur"),
						value: blur,
						min: 0,
						max: 60,
						step: 1,
						format: (v) => `${v}px`,
						onChange: setBlur
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.sidebarOpacity"),
						value: 100 - Math.round(sidebarOpacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						// Issue #55: while "跟随壁纸" is checked, shadeTokens2() uses
						// the CANVAS alpha and ignores this slider's stored value —
						// yet the control still dragged and still printed a
						// percentage, so it read as plain broken (the most common
						// "no effect" report). A drag here IS the user asking to
						// control the sidebar separately, so the ACTION releases the
						// link (see writeSidebarOpacityForSlider); this line only
						// mirrors that release into the LOCAL checkbox state in the
						// same commit, guarded by the SAME precondition as the
						// action, so the checkbox can never claim "off" while
						// storage still says on.
						onChange: (v) => {
							if (sidebarLink && hasWallpaperWash()) setLink(false);
							setSidebarOpacity(100 - v);
						},
						// Dedicated wording: the checkbox label describes the
						// CHECKBOX, not this auto-release, so reusing it here made
						// all 8 locales read "turn IT off to adjust separately"
						// next to a control that turns it off by itself.
						help: t("background.sidebarOpacityHint")
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: sidebarLink,
								style: styles.checkbox,
								onChange: (event) => { setLink(event.target.checked); setSidebarLink(event.target.checked); }
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: { color: "var(--dsw-alias-label-secondary)", fontSize: "13px" },
								children: t("background.sidebarLink")
							})
						]
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("composer.opacity"),
						value: 100 - Math.round(composerOpacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: (v) => setComposerOpacity(100 - v),
						// Round-6: hint collapsed into the "?" badge (hover to read).
						help: t("composer.hint")
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("modal.title"),
						value: 100 - Math.round(modalOpacity * 100),
						min: 0,
						max: 100,
						step: 1,
						// Issue #100: while a wallpaper wash clamps this channel, the
						// displayed number is no longer what the floored faces render —
						// say so on the value itself instead of leaving the user to
						// conclude the slider broke (that is issue #67's failure mode,
						// reached from the opposite end).
						format: (v) => (washActive && (100 - v) / 100 < DIALOG_ALPHA_FLOOR
							? `${v}% · ${t("modal.floorMark")}`
							: `${v}%`),
						onChange: (v) => setModalOpacity(100 - v),
						help: t("modal.hint")
					})
				]
			});
		}

		/**
		 * Advanced wallpaper row (P0-3): a URL or gradient preset as the backdrop
		 * instead of a local image, plus an auto-dim toggle. Kept separate from
		 * the image row so the two workflows don't fight over the same preview.
		 */
		function WallpaperAdvancedRow({ t, useStore, setKind, setUrl, setGradient, setAutodim, setRefresh, setFit, clearAll }) {
			const kind = useStore((s) => s.kind);
			const url = useStore((s) => s.url);
			const gradient = useStore((s) => s.gradient);
			const autodim = useStore((s) => s.autodim);
			const refreshOn = useStore((s) => s.refreshOn);
			const refreshHours = useStore((s) => s.refreshHours);
			const fit = useStore((s) => s.fit);
			const urlState = (0, _react.useState)("");
			const urlValue = urlState[0];
			const setUrlValue = urlState[1];
			const KIND_OPTIONS = [
				{ id: "image", label: t("bg2.local") },
				{ id: "url", label: t("bg2.url") },
				{ id: "gradient", label: t("bg2.gradient") }
			];
			const FIT_OPTIONS = [
				{ id: "cover", label: t("bg2.fillCover") },
				{ id: "contain", label: t("bg2.fillContain") },
				{ id: "blur", label: t("bg2.fillBlur") }
			];
			const GRADS = [
				"linear-gradient(135deg, #0b1120 0%, #172554 55%, #1e3a8a 100%)",
				"linear-gradient(135deg, #022c22 0%, #0d9488 100%)",
				"linear-gradient(135deg, #1e1b4b 0%, #7e22ce 100%)",
				"linear-gradient(135deg, #251607 0%, #c2410c 100%)",
				"linear-gradient(135deg, #faf5eb 0%, #e7dfcb 100%)",
				"linear-gradient(135deg, #fdf2f6 0%, #f0d2dc 100%)"
			];
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("bg2.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: KIND_OPTIONS.map((opt) => (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							"aria-pressed": kind === opt.id,
							style: {
								...styles.tinyButton,
								...(kind === opt.id ? styles.tinyButtonActive : {})
							},
							onClick: () => setKind(opt.id),
							children: [opt.label]
						}, opt.id))
					}),
					// Fill mode (issue #61): a gradient has no intrinsic size, so the
					// control is offered only where it can change something.
					kind !== "gradient" ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.section,
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								style: styles.hint,
								children: t("bg2.fill")
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								style: styles.actionRow,
								children: FIT_OPTIONS.map((opt) => (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": fit === opt.id,
									style: {
										...styles.tinyButton,
										...(fit === opt.id ? styles.tinyButtonActive : {})
									},
									onClick: () => setFit(opt.id),
									children: [opt.label]
								}, opt.id))
							})
						]
					}) : null,
					kind === "url" ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								type: "url",
								placeholder: "https://example.com/wall.jpg",
								defaultValue: url || "",
								style: { ...styles.urlInput },
								onChange: (event) => setUrlValue(event.target.value)
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => setUrl(urlValue),
								children: t("bg2.apply")
							})
						]
					}) : null,
					kind === "url" && urlValue !== "" && !isSafeWallpaperUrl(urlValue) ? (0, react_jsx_runtime.jsx)("div", {
						style: styles.urlInvalidHint,
						children: t("bg2.urlInvalid")
					}) : null,
					kind === "url" ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: refreshOn,
								style: styles.checkbox,
								onChange: (event) => setRefresh(event.target.checked, refreshHours)
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: { color: "var(--dsw-alias-label-secondary)", fontSize: "13px" },
								children: t("bg2.refresh")
							})
						]
					}) : null,
					kind === "url" && refreshOn ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								style: { color: "var(--dsw-alias-label-secondary)", fontSize: "13px" },
								children: t("bg2.refreshHours")
							}),
							(0, react_jsx_runtime.jsx)("input", {
								type: "number",
								min: 1,
								max: 720,
								step: 1,
								// Reflect the clamped, persisted value so the box can
								// never disagree with storage (R7: typing 9999 used to
								// keep showing 9999 while 720 was saved).
								value: refreshHours,
								style: { ...styles.urlInput, maxWidth: 88 },
								onChange: (event) => {
									const next = event.target.value;
									// Ignore the transient empty state; re-arm on commit.
									if (next === "") return;
									const n = Number(next);
									if (Number.isFinite(n)) setRefresh(true, n);
								}
							})
						]
					}) : null,
					kind === "gradient" ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.grid,
						children: GRADS.map((g) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"aria-pressed": gradient === g,
							style: {
								...styles.presetswatches,
								background: g,
								...(gradient === g ? { outline: "2px solid var(--dsw-alias-brand-primary)" } : {})
							},
							onClick: () => setGradient(g),
							children: null
						}, g))
					}) : null,
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: autodim,
								style: styles.checkbox,
								onChange: (event) => setAutodim(event.target.checked)
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: { color: "var(--dsw-alias-label-secondary)", fontSize: "13px" },
								children: t("bg2.autodim")
							})
						]
					}),
					(0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: { ...styles.button, ...styles.buttonDanger },
						onClick: clearAll,
						children: t("bg2.remove")
					})
				]
			});
		}

		//#endregion

		//#region dsh-dream-skin: P0 shared utilities (packs, accent, persistence, random)
		/**
		 * P0 feature layer: theme-pack import/export, per-user accent override,
		 * wallpaper 2.0, dual persistence, a local theme-pack library with
		 * one-click apply + validation + rollback, and surprise-me / favorites.
		 *
		 * Constraint note: DSH's Host settings wire only exposes an allowlisted
		 * set of namespaces to browser clients (WEB_SETTINGS_NAMESPACES in
		 * dsh-host-apiproxy), so a third-party namespace answers
		 * `settings-not-exposed` even when registered. localStorage/IndexedDB are
		 * therefore the reliable persistence for third-party state; a host
		 * settings write is attempted best-effort and never depended on.
		 */

		/** Pack manifest format marker. */
		const PACK_FORMAT = "dsh-dream-skin/pack";
		/** Current pack manifest version. */
		const PACK_VERSION = 1;
		/** Size cap for an imported pack JSON (≈1 MiB). */
		const PACK_MAX_BYTES = 1024 * 1024;
		/** localStorage keys for P0 state. */
		const PACKS_KEY = "dsh-dream-skin:packs"; // JSON array of remote/manual pack manifests
		const ACCENT_KEY = "dsh-dream-skin:accent"; // hex accent (#rrggbb) or "system"
		const FAVORITES_KEY = "dsh-dream-skin:favorites"; // JSON array of theme/ pack ids
		const WALLPAPER_URL_KEY = "dsh-dream-skin:wallpaper-url";
		const WALLPAPER_KIND_KEY = "dsh-dream-skin:wallpaper-kind"; // 'image'|'url'|'gradient'
		const WALLPAPER_GRADIENT_KEY = "dsh-dream-skin:wallpaper-gradient";
		const WALLPAPER_AUTODIM_KEY = "dsh-dream-skin:wallpaper-autodim"; // '1'|'0'
		// '1' = the wallpaper is the active skin's built-in diffused-glow gradient
		//       and should follow when the user switches skins (auto-swap).
		// '0' (or absent) = the user set a wallpaper themselves (image / URL /
		//       custom gradient) and switching skins must NOT clobber it.
		const WALLPAPER_FOLLOWS_SKIN_KEY = "dsh-dream-skin:wallpaper-follows-skin";
		// Optional scheduled refresh for URL wallpapers (issue #45): JSON
		// `{"on":0|1,"hours":N}`. When enabled, the plugin re-fetches the URL
		// wallpaper every N hours (cache-busted) so "daily wallpaper" APIs
		// (Bing daily etc.) roll over automatically. Default off; only acts
		// while the active wallpaper kind is `url` with a valid URL.
		const WALLPAPER_REFRESH_KEY = "dsh-dream-skin:wallpaper-refresh";
		/**
		 * How the wallpaper image is fitted to the viewport (issue #61):
		 * `cover` (the historical behaviour, crops to fill) | `contain` (whole
		 * image visible, letterboxed) | `blur` (whole image contained, the
		 * leftover area filled with the same image scaled to cover and heavily
		 * blurred). Only meaningful for a raster wallpaper: a gradient has no
		 * intrinsic aspect ratio, so the gradient kind always paints `cover`.
		 */
		const WALLPAPER_FIT_KEY = "dsh-dream-skin:wallpaper-fit";
		const WALLPAPER_FIT_VALUES = ["cover", "contain", "blur"];
		const DEFAULT_WALLPAPER_FIT = "cover";
		/** Extra blur (px) on the bleed layer behind a `contain`-ed image. */
		const WALLPAPER_FIT_BLEED_BLUR = 48;
		/** Default refresh interval in hours (24 h = daily wallpaper). */
		const DEFAULT_REFRESH_HOURS = 24;
		/** Accepted refresh interval range (clamped). */
		const REFRESH_HOURS_MIN = 1;
		const REFRESH_HOURS_MAX = 24 * 30;
		/** How often the refresh scheduler checks whether a refresh is due. */
		const REFRESH_TICK_MS = 60 * 1000;
		/** Sentinel meaning "no accent override — follow the theme's own accent". */
		const DEFAULT_ACCENT = "system";
		/** Marker for a skin that is actually a user-imported pack. */
		const PACK_ID_PREFIX = "dream-pack:";

		/**
		 * Minimum token set a pack must define so it renders coherently.
		 * See docs/themes-spec.md for the full token contract. These are the
		 * core surfaces; missing others fall back to (or are shimmed from) these.
		 */
		const PACK_REQUIRED_TOKENS = [
			"--dsw-alias-bg-base",
			"--dsw-alias-bg-layer-1",
			"--dsw-alias-brand-primary",
			"--dsw-alias-label-primary",
			"--dsw-alias-label-secondary",
			"--dsw-alias-border-l1",
			"--dsw-alias-border-l2"
		];

		/** Regex for a 3/6-digit hex color. */
		const HEX_RE = /^#[\da-f]{3}(?:[\da-f]{3})?$/i;

		/** true when a value is a syntactically plausible CSS color. */
		function looksLikeColor(value) {
			return typeof value === "string" && (HEX_RE.test(value.trim()) || /^(rgb|rgba|hsl|hsla)\(/.test(value.trim()));
		}

		/** Normalize a hex to #rrggbb lowercase, or null. */
		function normalizeHex(value) {
			const m = HEX_RE.exec(String(value ?? "").trim());
			if (!m) return null;
			let hex = m[0].toLowerCase();
			if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
			return hex;
		}

		/**
		 * Validate a parsed pack manifest structure. Returns a { ok, errors }
		 * result WITHOUT mutating it. On ok, the caller receives a normalized copy
		 * with a guaranteed stable `id` and a merged full token table.
		 */
		function validatePack(data) {
			if (typeof data !== "object" || data === null) return { ok: false, errors: ["not an object"] };
			if (data.format !== PACK_FORMAT) return { ok: false, errors: [`format must be "${PACK_FORMAT}"`] };
			if (data.version !== PACK_VERSION) return { ok: false, errors: [`unsupported pack version ${data.version}`] };
			const manifest = data.manifest;
			if (typeof manifest !== "object" || manifest === null) return { ok: false, errors: ["missing manifest"] };
			if (typeof manifest.id !== "string" || !manifest.id.trim()) return { ok: false, errors: ["manifest.id is required"] };
			const id = PACK_ID_PREFIX + manifest.id;
			// Reserved-name check must run on the UNPREFIXED manifest id: with the
			// prefix prepended this comparison could never be true (a check that
			// looks like a defense but never fires).
			if (manifest.id === "system" || manifest.id === "light" || manifest.id === "dark") return { ok: false, errors: [`"${manifest.id}" collides with a reserved id`] };
			if (typeof manifest.name !== "string" || !manifest.name.trim()) return { ok: false, errors: ["manifest.name is required"] };
			if (manifest.colorScheme !== "light" && manifest.colorScheme !== "dark") return { ok: false, errors: [`colorScheme must be light|dark, got ${manifest.colorScheme}`] };
			if (typeof manifest.tokens !== "object" || manifest.tokens === null) return { ok: false, errors: ["manifest.tokens is required"] };
			const tokens = {};
			const errors = [];
			for (const name of PACK_REQUIRED_TOKENS) {
				const value = manifest.tokens[name];
				if (typeof value !== "string" || !looksLikeColor(value)) errors.push(`token ${name} is missing or not a color`);
				else tokens[name] = value;
			}
			// Copy the remaining user-supplied tokens (already owned/validated colors).
			for (const [name, value] of Object.entries(manifest.tokens)) {
				if (!(name in tokens) && typeof value === "string" && looksLikeColor(value)) tokens[name] = value;
			}
			const accent = manifest.accent ? normalizeHex(manifest.accent) : null;
			const pack = {
				format: PACK_FORMAT,
				version: PACK_VERSION,
				manifest: {
					id: manifest.id,
					name: manifest.name,
					nameZh: typeof manifest.nameZh === "string" ? manifest.nameZh : undefined,
					author: typeof manifest.author === "string" ? manifest.author : "anonymous",
					version: typeof manifest.version === "string" ? manifest.version : "1.0.0",
					description: typeof manifest.description === "string" ? manifest.description : "",
					colorScheme: manifest.colorScheme,
					tokens,
					accent
				}
			};
			if (errors.length) return { ok: false, errors };
			return { ok: true, id, pack };
		}

		/** Turn a validated pack manifest into a ThemeRegistration for the runtime. */
		function packToRegistration(pack) {
			return Object.freeze({
				id: PACK_ID_PREFIX + pack.manifest.id,
				colorScheme: pack.manifest.colorScheme,
				tokens: { ...pack.manifest.tokens }
			});
		}

		/**
		 * In-process registry of imported packs. Kept outside React/localStorage
		 * so a pack can be registered into ctx.theme immediately on import and
		 * re-registered on reload without waiting for a slot mount.
		 */
		const importedPacks = [];
		/** Disposers for every pack we registered into ctx.theme, keyed by id. */
		const packDisposers = new Map();

		/** Register or refresh one pack into the theme runtime (idempotent). */
		function applyPackToTheme(ctx, id, registration) {
			const existing = packDisposers.get(id);
			if (existing) {
				existing(); // dispose old layer → theme reset if it was active
				packDisposers.delete(id);
			}
			packDisposers.set(id, ctx.theme.register(registration));
		}

		/** Dispose all packs (on plugin unload). */
		function disposeAllPacks() {
			for (const dispose of packDisposers.values()) dispose();
			packDisposers.clear();
			importedPacks.length = 0;
		}

		/** Read the persisted pack-manifest list. */
		function readPacks() {
			const raw = readStorage(PACKS_KEY);
			if (raw === null) return [];
			try {
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed : [];
			} catch {
				return [];
			}
		}

		/** Persist the pack-manifest list (removing any entry whose id is empty). */
		function writePacks(packs) {
			writeStorage(PACKS_KEY, JSON.stringify(packs.filter((p) => p && p.id)));
		}

		/** Find a pack manifest by id. */
		function findPack(id) {
			return importedPacks.find((p) => p && p.id === id);
		}

		/** Import a validated pack: register it, add to the in-process + persisted list. */
		function importPack(ctx, result) {
			const { id, pack } = result;
			if (findPack(id)) return { ok: false, error: "a pack with this id is already imported" };
			const registration = packToRegistration(pack);
			try {
				applyPackToTheme(ctx, id, registration);
			} catch (e) {
				return { ok: false, error: "register failed: " + (e && e.message ? e.message : String(e)) };
			}
			const record = { id, manifest: pack.manifest };
			importedPacks.push({ ...record, registration });
			const packs = readPacks();
			packs.push({ id, manifest: pack.manifest });
			writePacks(packs);
			return { ok: true, id, name: pack.manifest.name, colorScheme: pack.manifest.colorScheme };
		}

		/** Remove an imported pack by id (falls back to built-in skin if it was active). */
		function unimportPack(ctx, id) {
			const idx = importedPacks.findIndex((p) => p && p.id === id);
			if (idx === -1) return;
			const [removed] = importedPacks.splice(idx, 1);
			const dispose = packDisposers.get(id);
			if (dispose) {
				dispose();
				packDisposers.delete(id);
			}
			const packs = readPacks().filter((p) => p.id !== id);
			writePacks(packs);
			// If the removed pack was active, fall back to the built-in appearance.
			if (ctx.theme.getTheme().preference === id) ctx.theme.setTheme(DEFAULT_SKIN);
			const favorites = readFavorites().filter((f) => f !== id);
			writeFavorites(favorites);
			return removed && removed.manifest ? removed.manifest.name : id;
		}

		/** Re-register persisted packs on (re)load, before restoring the saved skin. */
		function restorePacks(ctx) {
			for (const record of readPacks()) {
				if (!record || !record.manifest || !record.manifest.tokens) continue;
				const validate = validatePack({ format: PACK_FORMAT, version: PACK_VERSION, manifest: record.manifest });
				if (!validate.ok) continue;
				const regression = packToRegistration(validate.pack);
				try {
					applyPackToTheme(ctx, validate.id, regression);
					importedPacks.push({ id: validate.id, manifest: validate.pack.manifest, registration: regression });
				} catch {
					// skip a pack that fails to re-register
				}
			}
		}

		/** Export a pack as a downloadable JSON Blob (no server needed). */
		function exportPackAsFile(ctx, id) {
			// Built-in skins export their synthesized manifest (same shape the
			// share link produces) so "导出主题包文件" works for every theme —
			// this is the cross-machine path that does not bake the local
			// DSH origin (random port) into a URL.
			let manifest = null;
			const record = findPack(id);
			if (record) {
				manifest = { ...record.manifest };
			} else {
				const skin = SKINS.find((candidate) => candidate.id === id);
				if (skin) {
					manifest = {
						id: skin.id,
						name: skin.id,
						author: "dsh-dream-skin",
						version: "1.0.0",
						description: "",
						colorScheme: skin.colorScheme,
						tokens: { ...skin.tokens },
						accent: undefined
					};
				}
			}
			if (!manifest) return false;
			const source = { format: PACK_FORMAT, version: PACK_VERSION, manifest };
			const blob = new Blob([JSON.stringify(source, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = (source.manifest.name || id).toLowerCase().replace(/\s+/g, "-") + ".dsh-theme.json";
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
			return true;
		}

		/** UTF-8 string → standard base64 (same bytes as the old escape/unescape path). */
		function encodeBase64Utf8(value) {
			const bytes = new TextEncoder().encode(value);
			let binary = "";
			for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
			return btoa(binary);
		}

		/** Standard base64 → UTF-8 string (decodes links made by older versions too). */
		function decodeBase64Utf8(value) {
			const binary = atob(value);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
			return new TextDecoder().decode(bytes);
		}

		/** Encode a pack manifest into a shareable URL hash (fragment). */
		function packShareUrl(id) {
			// Built-in skins are shareable too: synthesize a pack manifest from the
			// skin's own token table so "复制分享链接" works for every visible theme,
			// not only imported packs (the silent no-op users read as "broken").
			let manifest = null;
			const record = findPack(id);
			if (record) {
				manifest = record.manifest;
			} else {
				const skin = SKINS.find((candidate) => candidate.id === id);
				if (skin) {
					manifest = {
						id: skin.id,
						name: skin.id,
						author: "dsh-dream-skin",
						version: "1.0.0",
						description: "",
						colorScheme: skin.colorScheme,
						tokens: { ...skin.tokens },
						accent: undefined
					};
				}
			}
			if (!manifest) return null;
			const payload = { format: PACK_FORMAT, version: PACK_VERSION, manifest };
			let encoded;
			try {
				encoded = encodeBase64Utf8(JSON.stringify(payload));
			} catch {
				return null;
			}
			return window.location.origin + window.location.pathname + "#dream-skin-pack=" + encoded;
		}

		/** Decode a shared pack from a URL hash; null when absent/invalid. */
		function decodeShareUrl(hash) {
			const prefix = "#dream-skin-pack=";
			const idx = hash ? hash.indexOf(prefix) : -1;
			if (idx === -1) return null;
			const raw = hash.slice(idx + prefix.length);
			if (!raw) return null;
			// Boot-path size gate (mirrors the file import's PACK_MAX_BYTES): a
			// pathological/malicious link must not run a giant base64+JSON.parse
			// synchronously during apply().
			if (raw.length > PACK_MAX_BYTES) return null;
			try {
				const json = decodeBase64Utf8(raw);
				const data = JSON.parse(json);
				const validate = validatePack(data);
				return validate.ok ? { id: validate.id, pack: validate.pack } : null;
			} catch {
				return null;
			}
		}

		/** Pull a desired accent from the active skin/registration + pack accent. */
		function resolveAccent(snapshot) {
			const active = snapshot.active;
			const brand = active && active.tokens ? active.tokens["--dsw-alias-brand-primary"] : null;
			return typeof brand === "string" && looksLikeColor(brand) ? brand : null;
		}

		//#region dsh-dream-skin: P0 favorites + surprise-me
		/** Read the favorites id list (built-in skins + imported pack ids). */
		function readFavorites() {
			const raw = readStorage(FAVORITES_KEY);
			if (raw === null) return [];
			try {
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
			} catch {
				return [];
			}
		}

		/** Persist the favorites list. */
		function writeFavorites(list) {
			writeStorage(FAVORITES_KEY, JSON.stringify(list));
		}

		/** Toggle a favorite id; returns true if it is now favorited. */
		function toggleFavorite(id) {
			const list = readFavorites();
			const idx = list.indexOf(id);
			if (idx === -1) {
				list.push(id);
				writeFavorites(list);
				return true;
			}
			list.splice(idx, 1);
			writeFavorites(list);
			return false;
		}

		/** All applyable theme ids (built-in skins + imported packs). */
		function allThemeIds() {
			const built = SKINS.map((s) => s.id);
			for (const p of importedPacks) if (p && p.id) built.push(p.id);
			return built;
		}

		/** Pick a different random theme id than the current one. */
		function randomThemeId(exclude) {
			const ids = allThemeIds().filter((id) => id !== exclude);
			if (ids.length === 0) return null;
			return ids[Math.floor(Math.random() * ids.length)];
		}
		//#endregion

		//#region dsh-dream-skin: P0 stores + module hooks
		/** Accent row slot store. */
		function createAccentStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ accent: DEFAULT_ACCENT, base: DEFAULT_ACCENT, revision: -1 }),
				actions: {
					sync: (d, accent, base, revision) => {
						if (revision <= d.revision) return;
						d.accent = accent;
						d.base = base;
						d.revision = revision;
					}
				}
			});
		}

		/** Pack library row slot store (ids + names + favorites + active + suggestion). */
		function createPackStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ ids: [], names: {}, favorites: [], active: null, suggestion: null, revision: -1 }),
				actions: {
					sync: (d, ids, names, favorites, active, suggestion, revision) => {
						if (revision <= d.revision) return;
						d.ids = ids;
						d.names = names;
						d.favorites = favorites;
						d.active = active;
						d.suggestion = suggestion;
						d.revision = revision;
					}
				}
			});
		}

		/**
		 * Suggested wallpaper gradient for a theme (P0-3 per-skin recommendation).
		 *
		 * Read straight off the skin's own `glow` field instead of a second
		 * hand-maintained map: the two used to drift, so the "suggested
		 * background" could show a different light than the skin it belongs to.
		 */
		function wallpapersSuggestionsFor(activeId) {
			const skin = SKINS.find((s) => s.id === activeId);
			return skin && typeof skin.glow === "string" ? skin.glow : null;
		}

		/**
		 * The authored slider / material numbers for a skin. One skin's wash
		 * strength is another skin's glare — `mist` wants a heavy wash behind
		 * real glass, `midnight` wants almost none — so the shipped look has to
		 * travel with the skin instead of being one global average.
		 */
		function skinDefaultsFor(activeId) {
			const skin = SKINS.find((s) => s.id === activeId);
			return skin && skin.defaults ? skin.defaults : null;
		}

		/**
		 * Storage keys a skin's authored look is allowed to set. Deliberately
		 * excludes anything the user *chose* (the skin id itself, the accent,
		 * the packs, favorites, history) and anything that is a wallpaper
		 * SOURCE (image / url / gradient): those follow the skin only through
		 * the existing `followsSkin()` path, which a user-set wallpaper turns
		 * off. Touching them here would resurrect the shipped wallpaper over a
		 * user's own picture — the exact bug this file already fixed twice.
		 */
		const SKIN_DEFAULT_KEYS = [
			WALLPAPER_OPACITY_KEY,
			WALLPAPER_BLUR_KEY,
			SIDEBAR_OPACITY_KEY,
			COMPOSER_OPACITY_KEY,
			MODAL_OPACITY_KEY,
			MATERIAL_PRESET_KEY,
			WALLPAPER_AUTODIM_KEY
		];

		/**
		 * Apply a skin's authored numbers to every key the user has NOT made
		 * their own.
		 *
		 * The ownership test is the existing factory-provenance machinery: a
		 * value that traces back to a factory seed (or still equals the shipped
		 * default on a key the user never touched) is ours to retune; anything
		 * the user moved belongs to them and is left alone. That is why this
		 * can be called on every skin switch without ever eating a setting.
		 *
		 * Writes are tagged `factory: true` — same rule as the boot seeding —
		 * so they are never pushed into the host's durable file. Re-tuning a
		 * slider for the user is not the user's configuration.
		 */
		function applySkinDefaults(id) {
			const defaults = skinDefaultsFor(id);
			if (!defaults) return;
			const values = {
				[WALLPAPER_OPACITY_KEY]: String(defaults.wallpaperOpacity),
				[WALLPAPER_BLUR_KEY]: String(defaults.wallpaperBlur),
				[SIDEBAR_OPACITY_KEY]: String(defaults.sidebarOpacity),
				[COMPOSER_OPACITY_KEY]: String(defaults.composerOpacity),
				[MODAL_OPACITY_KEY]: String(defaults.modalOpacity),
				[MATERIAL_PRESET_KEY]: String(defaults.material),
				[WALLPAPER_AUTODIM_KEY]: defaults.autodim ? "1" : "0"
			};
			// One batch for the whole retune: the provenance snapshot is a single
			// storage key holding every seeded value, so persisting it per key
			// rewrote it up to seven times for one skin switch (issue #84). The
			// gate in tests/client.smoke.test.cjs budgets the writes and reddens
			// on amplification.
			withFactorySnapshotBatch(() => {
				for (const key of SKIN_DEFAULT_KEYS) {
					const next = values[key];
					if (next === undefined || next === "undefined") continue;
					const current = readStorage(key);
					// A key the user owns is never retuned. `isFactorySeededValue`
					// also answers true for "never touched and still sitting on the
					// shipped default", which is exactly the upgrade path: an
					// existing user who never moved these sliders gets the new
					// authored look, and one who did keeps their numbers.
					if (current !== null && !isFactorySeededValue(key, current)) continue;
					if (current === next) continue;
					// Deliberately NOT `writeSidebarOpacityForSlider`: that path
					// releases the wallpaper link because a DRAG is the user asking
					// for separate control. A skin switch is not the user asking —
					// flipping their "跟随壁纸" checkbox as a side effect of picking
					// a colour would change a visible setting for no visible reason.
					// While linked the value is inert anyway (shadeTokens2 reads the
					// canvas alpha), and it is waiting for the moment they unlink.
					writeStorage(key, next, { factory: true });
				}
			});
		}

		/**
		 * Whether the user has explicitly set a wallpaper of any kind. When false
		 * (no wallpaper from the user), applying a skin can smart-attach that
		 * skin's recommended iOS diffused-glow gradient so the "material" side of
		 * the premium look appears automatically without clobbering a user choice.
		 */
		function userSetWallpaper() {
			const kind = readStorage(WALLPAPER_KIND_KEY);
			if (kind === "url" || kind === "gradient") return true;
			return readWallpaper() !== null;
		}

		/**
		 * Whether the current wallpaper is the active skin's built-in diffused-glow
		 * gradient and should follow when the user switches skins. When true, a skin
		 * switch swaps the wallpaper to the new skin's matching gradient; when the
		 * user has set their own wallpaper, this is false and switching skins leaves
		 * the wallpaper untouched.
		 * Compatibility: before the flag existed (≤0.4.0), a skin auto-attached its
		 * gradient without marking it. So if the current wallpaper is EXACTLY one of
		 * the built-in skin gradients, we still treat it as skin-following even when
		 * the flag is absent — fixing "switching skins didn't swap the background".
		 */
		function followsSkin() {
			if (readStorage(WALLPAPER_FOLLOWS_SKIN_KEY) === "1") return true;
			if (readStorage(WALLPAPER_KIND_KEY) !== "gradient") return false;
			const g = readStorage(WALLPAPER_GRADIENT_KEY);
			if (!g) return false;
			return SKINS.some((s) => wallpapersSuggestionsFor(s.id) === g);
		}

		/** Module-level hooks the PacksRow component uses to import/export/share. */
		let packsImportHandler = null;
		let packExporter = null;
		let packShare = null;

		/** Advanced wallpaper row store: kind + url + gradient + autodim + fill mode. */
		function createAdvancedWallpaperStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ kind: "image", url: null, gradient: null, autodim: false, refreshOn: false, refreshHours: DEFAULT_REFRESH_HOURS, fit: DEFAULT_WALLPAPER_FIT, revision: -1 }),
				actions: {
					sync: (d, kind, url, gradient, autodim, refreshOn, refreshHours, fit, revision) => {
						if (revision <= d.revision) return;
						d.kind = kind;
						d.url = url;
						d.gradient = gradient;
						d.autodim = autodim;
						d.refreshOn = refreshOn;
						d.refreshHours = refreshHours;
						d.fit = fit;
						d.revision = revision;
					}
				}
			});
		}

		/** Popup-opacity row store: the current fill weight (0..1) + revision. */
		function createModalOpacityStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ opacity: DEFAULT_MODAL_OPACITY, revision: -1 }),
				actions: {
					sync: (d, opacity, revision) => {
						if (revision <= d.revision) return;
						d.opacity = opacity;
						d.revision = revision;
					}
				}
			});
		}

		/**
		 * Glass-effect row store: every translucency value in ONE place — wallpaper
		 * opacity/blur, sidebar opacity, composer (input) opacity, popup opacity and
		 * the active material preset — written only by this plugin.
		 */
		function createGlassStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({
					opacity: DEFAULT_WALLPAPER_OPACITY,
					blur: DEFAULT_WALLPAPER_BLUR,
					sidebarOpacity: DEFAULT_SIDEBAR_OPACITY,
					composerOpacity: DEFAULT_COMPOSER_OPACITY,
					modalOpacity: DEFAULT_MODAL_OPACITY,
					materialPreset: DEFAULT_MATERIAL_PRESET,
					revision: -1
				}),
				actions: {
					sync: (d, opacity, blur, sidebarOpacity, composerOpacity, modalOpacity, materialPreset, revision) => {
						if (revision <= d.revision) return;
						d.opacity = opacity;
						d.blur = blur;
						d.sidebarOpacity = sidebarOpacity;
						d.composerOpacity = composerOpacity;
						d.modalOpacity = modalOpacity;
						d.materialPreset = materialPreset;
						d.revision = revision;
					}
				}
			});
		}
		//#endregion

		//#region dsh-dream-skin: P0 accent override
		/** Token names the accent override shades (brand + primary surfaces). */
		const ACCENT_TOKENS = [
			"--dsw-alias-brand-primary",
			"--dsw-alias-state-business-primary",
			"--dsw-alias-button-primary-fill",
			"--dsw-alias-button-primary-dimmed"
		];
		/** Cached accent currently applied (hex or null). */
		let appliedAccent = null;

		/**
		 * Read the persisted accent (`#rrggbb`, `${skinId}` to borrow a skin's
		 * accent, or `system` + null when unset).
		 */
		function readAccent() {
			const raw = readStorage(ACCENT_KEY);
			if (raw === null || raw === DEFAULT_ACCENT) return null;
			if (HEX_RE.test(raw.trim())) return raw.toLowerCase();
			const skin = SKINS.find((s) => s.id === raw.trim());
			return skin ? skin.tokens["--dsw-alias-brand-primary"] : null;
		}

		/** Apply (or clear) the accent override layer. Returns the accent used. */
		function applyAccent(ctx) {
			const accent = readAccent();
			if (accent === null) {
				accentTokenOverrides = {};
				applyCombinedTokenOverrides(ctx);
				appliedAccent = null;
				return null;
			}
			const pair = { light: accent, dark: accent };
			const overrides = {};
			for (const name of ACCENT_TOKENS) overrides[name] = pair;
			accentTokenOverrides = overrides;
			applyCombinedTokenOverrides(ctx);
			appliedAccent = accent;
			return accent;
		}

		/** Set (or clear with null) the accent override. */
		function setAccent(ctx, value) {
			writeStorage(ACCENT_KEY, value === null || value === DEFAULT_ACCENT ? null : String(value));
			return applyAccent(ctx);
		}
		//#endregion

		//#region dsh-dream-skin: P0 wallpaper 2.0 (url / gradient / auto-dim)
		/** Read wallpaper kind (image|url|gradient). */
		function readWallpaperKind() {
			const kind = readStorage(WALLPAPER_KIND_KEY);
			return kind === "url" || kind === "gradient" ? kind : "image";
		}

		/** Read the persistable wallpaper URL string (for url kind). */
		function readWallpaperUrl() {
			const raw = readStorage(WALLPAPER_URL_KEY);
			return raw && raw.length > 4 ? raw : null;
		}

		/**
		 * Whether a string is acceptable as a URL wallpaper. Only image schemes
		 * are allowed (http/https/data:image); javascript:, file:, vbscript: and
		 * friends are refused. Control characters (which would silently corrupt
		 * the CSS value) are rejected too. Quotes/backslashes are fine here —
		 * they are escaped later when the value is embedded into a CSS url().
		 */
		function isSafeWallpaperUrl(value) {
			if (typeof value !== "string" || value.trim().length < 5) return false;
			if (/[\u0000-\u001f\u007f]/.test(value)) return false;
			return /^(https?:|data:image\/)/i.test(value.trim());
		}

		/** Escape a wallpaper URL for embedding inside url("...") in a CSS value. */
		function cssUrlValue(value) {
			return value.replace(/[\\"]/g, (ch) => (ch === "\\" ? "\\\\" : "\\\""));
		}

		/**
		 * Whether a string is acceptable as a gradient wallpaper. The gradient is
		 * applied via `el.style.backgroundImage = …` (a CSSOM property write), so it
		 * cannot escape through `;` or `}` — but a gradient is still a CSS image
		 * value, and legitimate-looking `url()`, `image-set()`, `element()` and
		 * `cross-fade()` functions would make the page silently fetch an
		 * attacker-chosen endpoint (intranet probe / tracking beacon). Host state and
		 * third-party share links can write this value, so we refuse anything that is
		 * not a pure gradient stack.
		 */
		/**
		 * Normalise a CSS value for SECURITY inspection only (A-2.1): strip
		 * `/* *\/` comments, decode `\\XX…` hex escapes (`\75 rl(` IS `url(` to
		 * the CSSOM parser) and `\c` literal escapes. The denylist ran on the
		 * RAW string before, so any escape variant of `url(` walked straight
		 * through it — chasing variants with a bigger denylist never ends, so
		 * the check now runs on the normalised form instead.
		 */
		function normalizeCssForInspection(value) {
			let out = value.replace(/\/\*[\s\S]*?\*\//g, "");
			out = out.replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\n\r\f]?|(.))/g, (_m, hex, ch) => {
				if (hex) {
					const code = parseInt(hex, 16);
					if (code <= 0 || code > 0x10FFFF) return "\uFFFD";
					// R-1 (external review 9.27.0 round 2): CSS decodes escapes
					// FIRST, then a decoded newline/CR/FF outside a string is a
					// line continuation — DELETED, not kept. So `\a` must not
					// INSERT a newline into the inspected form (that produced
					// `u\nrl(`, which the denylist's `url\s*\(` cannot see).
					// NULL decodes to U+FFFD per the CSS spec.
					if (code === 0x0a || code === 0x0d || code === 0x0c) return "";
					if (code === 0) return "\uFFFD";
					return String.fromCodePoint(code);
				}
				return ch === "\n" || ch === "\r" || ch === "\f" ? "" : (ch ?? "");
			});
			return out;
		}

		function isSafeWallpaperGradient(value) {
			if (typeof value !== "string" || value.trim().length < 5) return false;
			const v = value.trim();
			if (/[\u0000-\u001f\u007f]/.test(v)) return false;
			// Inspect the NORMALISED form: escapes and comments are decoded
			// first, then the denylist and the prefix allowlist both run on
			// something the CSSOM parser would see. A value that only decodes
			// into junk fails the prefix test anyway — strictness is the safe
			// direction here (the raw value is what gets stored and applied).
			const n = normalizeCssForInspection(v).trim().toLowerCase();
			// R-1 double gate: decoding itself can introduce control characters
			// (e.g. `\2\0` → "2" + NUL). The normalized form must pass the same
			// control-char fence the raw value is checked against.
			if (/[\u0000-\u001f\u007f]/.test(n)) return false;
			// Refuse any image-fetching or legacy function, wherever it appears.
			if (/(url\s*\(|image-set\s*\(|element\s*\(|cross-fade\s*\(|-moz-element|expression\s*\(|@import|javascript:)/.test(n)) return false;
			// The value must be a gradient stack (a bare color or any other image
			// kind is out of scope here). Legacy vendor prefixes are deliberately
			// NOT admitted (A-2.2 decision): the runtime is evergreen Chromium,
			// `-webkit-linear-gradient` is a different (legacy) grammar, and
			// widening the allowlist invites widening the parser surface.
			return /^(?:linear|radial|conic)-gradient\(/.test(n);
		}

		// A-2.2: "visible degradation" (#50/#51 philosophy) — when the render
		// gate ignores a stored gradient, say so once per value in the console
		// instead of letting the wallpaper silently vanish.
		// R-5 (external review 9.27.0 round 2): the dedupe set is capped to
		// damp warning floods, but on FULL it now evicts the OLDEST entry
		// (insertion-order FIFO) instead of silencing every newer value —
		// Set iteration order is insertion order, so `keys().next()` is the
		// oldest. Silence-after-20 was exactly the phenomenon A-2.2 removed.
		// Window-scoped (not closure-local): one page = one cap across reloads
		// of the module, and the smoke test can fill the cap and watch the
		// eviction — a closure-local Set reset per factory call made the
		// first R-5 case unauditable (the cap could never engage, so the
		// case could never fail).
		const RENDER_GATE_WARN_CAP = 20;
		const renderGateWarned = (window.__DSH_DREAM_SKIN_RENDER_GATE_SEEN__ ??= new Set());
		function warnRenderGateSkip(what, value, reason) {
			try {
				const key = what + "\u0000" + (value || "");
				if (renderGateWarned.has(key)) return;
				if (renderGateWarned.size >= RENDER_GATE_WARN_CAP) {
					const oldest = renderGateWarned.keys().next().value;
					if (oldest !== undefined) renderGateWarned.delete(oldest);
				}
				renderGateWarned.add(key);
				console.warn(`[dsh-dream-skin] stored ${what} was ignored for safety (${reason}):`, String(value).slice(0, 80));
			} catch {}
		}

		/** Read the gradient CSS (for gradient kind). */
		function readWallpaperGradient() {
			const raw = readStorage(WALLPAPER_GRADIENT_KEY);
			return raw && raw.length > 4 ? raw : null;
		}

		/** Whether auto-dim wallpapers while a task is focused. */
		function readWallpaperAutodim() {
			return readStorage(WALLPAPER_AUTODIM_KEY) === "1";
		}

		/** Persist auto-dim. */
		function writeWallpaperAutodim(on) {
			writeStorage(WALLPAPER_AUTODIM_KEY, on ? "1" : "0");
		}

		/** Read the wallpaper fill mode; anything unrecognised falls back to `cover`. */
		function readWallpaperFit() {
			const raw = readStorage(WALLPAPER_FIT_KEY);
			return WALLPAPER_FIT_VALUES.includes(raw) ? raw : DEFAULT_WALLPAPER_FIT;
		}

		/**
		 * Strip our own cache-busting `t=<ms-epoch>` parameter from a URL.
		 * Idempotent, and leaves every other query parameter and the fragment
		 * untouched. Only a 13-digit (millisecond epoch) `t` value is treated as
		 * ours, so a user's own short `t=` parameter is never removed.
		 */
		function stripWallpaperBust(url) {
			if (typeof url !== "string" || url.indexOf("t=") === -1) return url;
			const hashIndex = url.indexOf("#");
			const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
			const body = hashIndex === -1 ? url : url.slice(0, hashIndex);
			const qIndex = body.indexOf("?");
			if (qIndex === -1) return url;
			const head = body.slice(0, qIndex);
			const kept = body.slice(qIndex + 1).split("&").filter((part) => part !== "" && !/^t=\d{13}$/.test(part));
			return head + (kept.length > 0 ? `?${kept.join("&")}` : "") + hash;
		}

		/**
		 * Read the scheduled-refresh config {on, hours, lastFiredAt}. The stored
		 * wallpaper URL always stays the user's clean URL — the cache-busting
		 * stamp lives only in `lastFiredAt` and is applied at render time, so a
		 * scheduled refresh can never pollute the persisted URL (blue-team R6).
		 */
		function readWallpaperRefreshConfig() {
			const raw = readStorage(WALLPAPER_REFRESH_KEY);
			if (raw !== null) {
				try {
					const parsed = JSON.parse(raw);
					if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
						const on = parsed.on === 1 || parsed.on === true;
						let hours = Number(parsed.hours);
						if (!Number.isFinite(hours)) hours = DEFAULT_REFRESH_HOURS;
						hours = Math.min(REFRESH_HOURS_MAX, Math.max(REFRESH_HOURS_MIN, Math.round(hours)));
						const lastFiredAt = Number(parsed.lastFiredAt);
						return { on, hours, lastFiredAt: Number.isFinite(lastFiredAt) && lastFiredAt > 0 ? lastFiredAt : 0 };
					}
				} catch { /* corrupt — fall through to default */ }
			}
			return { on: false, hours: DEFAULT_REFRESH_HOURS, lastFiredAt: 0 };
		}

		/** Persist the scheduled-refresh config, preserving lastFiredAt unless given. */
		function writeWallpaperRefreshConfig(cfg) {
			const prev = readWallpaperRefreshConfig();
			const lastFiredAt = Number(cfg.lastFiredAt);
			writeStorage(WALLPAPER_REFRESH_KEY, JSON.stringify({
				on: cfg.on ? 1 : 0,
				hours: Math.min(REFRESH_HOURS_MAX, Math.max(REFRESH_HOURS_MIN, Math.round(Number(cfg.hours) || DEFAULT_REFRESH_HOURS))),
				lastFiredAt: Number.isFinite(lastFiredAt) && lastFiredAt > 0 ? Math.round(lastFiredAt) : prev.lastFiredAt
			}));
		}

		/**
		 * Render-time cache-busting URL: the stored URL stays the user's clean
		 * URL and the stamp is appended only for the CSS value, so scheduled
		 * refreshes never accumulate `?t=` parameters in persisted state
		 * (blue-team R6). The stamp is the last refresh time, so the value is
		 * stable between refreshes (no needless re-downloads).
		 */
		function stampedWallpaperUrl(url, stamp) {
			const clean = stripWallpaperBust(url);
			// Split off any `#fragment` BEFORE appending: a query appended after
			// `#` lands inside the fragment, is never sent to the server, and the
			// browser keeps serving the cached image — i.e. scheduled refresh
			// silently becomes a no-op for every link carrying a fragment
			// (third-party review T1).
			const hashIndex = clean.indexOf("#");
			const hash = hashIndex === -1 ? "" : clean.slice(hashIndex);
			const body = hashIndex === -1 ? clean : clean.slice(0, hashIndex);
			return `${body}${body.includes("?") ? "&" : "?"}t=${stamp}${hash}`;
		}

		// ── scheduled URL-wallpaper refresh (issue #45; blue-team R5/R6) ───────
		// The scheduler lives at MODULE scope and is driven from apply(), never
		// from the settings row's mount callback: a closed (or future-virtualized)
		// settings panel must not be able to stop the schedule (R5). Due-ness is
		// computed from the persisted `lastFiredAt`, never from "when this page
		// happened to open" — so closing DSH overnight cannot reset a 24 h phase
		// (R5). The tick is only a wake-up; the boot catch-up and the
		// visibilitychange catch-up cover restarts, sleeping machines and tabs
		// that were closed for a day.
		let refreshTimer = null;
		let refreshVisibilityHandler = null;
		let refreshNotify = null;

		/** Run one scheduled refresh when due; true when a refresh was committed. */
		function runScheduledWallpaperRefresh(ctx) {
			const cfg = readWallpaperRefreshConfig();
			if (!cfg.on) return false;
			if (readWallpaperKind() !== "url") return false;
			const url = readWallpaperUrl();
			if (url === null || !isSafeWallpaperUrl(url)) return false;
			// One stamp, shared by the preload probe and the persisted value, so the
			// probe verifies exactly the URL that will be rendered (third-party
			// review P3: probe used raw Date.now() while persistence rounded it).
			const stamp = Math.round(Date.now());
			if (cfg.lastFiredAt > 0 && stamp - cfg.lastFiredAt < cfg.hours * 60 * 60 * 1000) return false;
			const clean = stripWallpaperBust(url);
			const commit = () => {
				writeWallpaperRefreshConfig({ on: true, hours: cfg.hours, lastFiredAt: stamp });
				writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
				applyWallpaper2(ctx);
				if (typeof refreshNotify === "function") refreshNotify();
			};
			// Preload before committing: a dead or blocked link keeps the current
			// wallpaper instead of silently blanking it (R6).
			if (typeof Image !== "function") {
				commit();
				return true;
			}
			try {
				const probe = new Image();
				probe.onload = () => { try { commit(); } catch {} };
				probe.onerror = () => {
					try { console.warn("[dsh-dream-skin] scheduled wallpaper refresh could not load the image — keeping the current wallpaper:", clean); } catch {}
				};
				probe.src = stampedWallpaperUrl(clean, stamp);
			} catch {
				commit();
			}
			return true;
		}

		/** (Re)arm the wake-up tick + visibility catch-up. Safe to call repeatedly. */
		function startWallpaperRefreshScheduler(ctx) {
			stopWallpaperRefreshScheduler();
			runScheduledWallpaperRefresh(ctx);
			if (typeof window.setInterval === "function") {
				refreshTimer = window.setInterval(() => {
					try { runScheduledWallpaperRefresh(ctx); } catch {}
				}, REFRESH_TICK_MS);
			}
			if (typeof document.addEventListener === "function") {
				refreshVisibilityHandler = () => {
					try {
						if (document.visibilityState !== "hidden") runScheduledWallpaperRefresh(ctx);
					} catch {}
				};
				document.addEventListener("visibilitychange", refreshVisibilityHandler);
			}
		}

		/** Stop the tick and detach the visibility listener (unmount / re-apply). */
		function stopWallpaperRefreshScheduler() {
			if (refreshTimer !== null) {
				try { window.clearInterval(refreshTimer); } catch {}
				refreshTimer = null;
			}
			if (refreshVisibilityHandler !== null && typeof document.removeEventListener === "function") {
				try { document.removeEventListener("visibilitychange", refreshVisibilityHandler); } catch {}
			}
			refreshVisibilityHandler = null;
		}

		/**
		 * Resolve the background-image CSS for the current wallpaper config, or
		 * null when no wallpaper is set.
		 */
		function wallpaperBackgroundCss() {
			const kind = readWallpaperKind();
			if (kind === "gradient") {
				const grad = readWallpaperGradient();
				// Mirror the URL kind's render-time guard: a stored gradient that
				// fails validation (older versions or a tampered state file accepted
				// anything) is ignored at render time — never applied. A-2.2: the
				// ignore is VISIBLE (one console.warn per value), not silent.
				if (grad === null || !isSafeWallpaperGradient(grad)) {
					if (grad !== null) warnRenderGateSkip("gradient wallpaper", grad, "not a plain linear/radial/conic gradient stack");
					return null;
				}
				return grad;
			}
			if (kind === "url") {
				const url = readWallpaperUrl();
				// A stored value that fails validation (older versions accepted
				// anything) is ignored at render time — never applied.
				if (url === null || !isSafeWallpaperUrl(url)) {
					if (url !== null) warnRenderGateSkip("url wallpaper", url, "scheme not in http(s)/data:image");
					return null;
				}
				// Scheduled-refresh cache-busting is a RENDER-layer concern: the
				// stored URL stays clean and the stamp comes from lastFiredAt.
				// Issue #61: the stamp is applied whenever one exists, not only while
				// the schedule is ON — `lastFiredAt` means "when this URL was last
				// (re)fetched", and a manual "apply link" bumps it too, which is what
				// makes re-applying the same URL actually hit the network again.
				const refresh = readWallpaperRefreshConfig();
				const rendered = refresh.lastFiredAt > 0 ? stampedWallpaperUrl(url, refresh.lastFiredAt) : stripWallpaperBust(url);
				return `url("${cssUrlValue(rendered)}")`;
			}
			// legacy / image
			const data = readWallpaper();
			return data ? `url("${cssUrlValue(data)}")` : null;
		}

		/** Guards against re-entrant wallpaper re-shading (overrideTokens emits theme/change). */
		let _applyingWallpaper = false;

		/** Re-render the wallpaper backdrop from the current config. */
		function applyWallpaper2(ctx, snapshot = null) {
			// Re-entrancy guard: overrideTokens() below emits `theme/change`, which our
			// syncSkin listener would answer by calling applyWallpaper2 again — that
			// recursion would overflow the stack. Applying while already applying is a
			// no-op; the first (outermost) call performs the shading.
			if (_applyingWallpaper) return;
			_applyingWallpaper = true;
			try {
				const bg = wallpaperBackgroundCss();
				const urlIsSet = bg !== null;
				if (!urlIsSet) {
					teardownWallpaper(ctx);
					return;
				}
				if (wallpaperEl === null || !document.body.contains(wallpaperEl)) {
					wallpaperEl = document.createElement("div");
					wallpaperEl.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;";
					document.body.prepend(wallpaperEl);
				}
				const blur = readWallpaperBlur();
				// A gradient has no intrinsic aspect ratio, so the fill mode is a
				// raster-only concern (issue #61).
				const fit = readWallpaperKind() === "gradient" ? "cover" : readWallpaperFit();
				wallpaperEl.style.backgroundImage = bg;
				wallpaperEl.style.backgroundSize = fit === "cover" ? "cover" : "contain";
				wallpaperEl.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
				if (fit === "blur") {
					// Bleed layer: the same image scaled to cover and heavily blurred
					// sits BEHIND the contained image, so the leftover bands read as a
					// halo instead of hard-edged empty strips. Both layers are fixed at
					// z-index -1, so tree order alone decides who paints on top — the
					// bleed must be inserted before `wallpaperEl`, not appended. The
					// overscale keeps the blur from eating a transparent ring into the
					// viewport edges.
					if (wallpaperBleedEl === null || !document.body.contains(wallpaperBleedEl)) {
						wallpaperBleedEl = document.createElement("div");
						wallpaperBleedEl.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;transform:scale(1.2);";
						document.body.insertBefore(wallpaperBleedEl, wallpaperEl);
					}
					wallpaperBleedEl.style.backgroundImage = bg;
					wallpaperBleedEl.style.filter = `blur(${blur + WALLPAPER_FIT_BLEED_BLUR}px)`;
				} else if (wallpaperBleedEl !== null) {
					wallpaperBleedEl.remove();
					wallpaperBleedEl = null;
				}
				// Auto-dim lowers the wash opacity when enabled.
				const baseFill = readWallpaperOpacity();
				const wash = readWallpaperAutodim() ? Math.min(baseFill, 0.45) : baseFill;
				shadeTokens2(ctx, wash, snapshot);
			} finally {
				_applyingWallpaper = false;
			}
		}

		/**
		 * Publish / retract the root attribute that tells the injected CSS a
		 * wallpaper wash is on screen (WASH_ACTIVE_ATTR). Owned by the only function
		 * that publishes — and the only one that clears — the wash token layer, so the
		 * marker can never describe a layer that is not there.
		 */
		function setWashActive(active) {
			let published = true;
			try {
				const root = document.documentElement;
				// No DOM, or a DOM without attribute support (headless eval / unit sandbox):
				// the token layer is still published, so the mirror follows it — nothing can
				// paint either way.
				if (root && typeof root.setAttribute === "function") {
					if (active) root.setAttribute(WASH_ACTIVE_ATTR, "1");
					else root.removeAttribute(WASH_ACTIVE_ATTR);
				}
			} catch {
				// Blue-team B5: the DOM REFUSED the write. The CSS wash rules cannot apply in
				// that state, so the mirror must not advance — otherwise the readability floor
				// clamps for a wallpaper nobody can see through. (Adjudication T4, stated
				// exactly: the wash TOKENS and the wallpaper element are already published by
				// this point, so the page is left with a wash whose floor is absent. That is the
				// honest outcome — the two disagree in the SAFE direction, toward less
				// clamping — and it is only reachable through a DOM that throws on
				// `setAttribute`, which no browser does; the unit harness is the realistic case.)
				published = false;
			}
			if (!published || washActive === active) return;
			washActive = active;
			onWashFlip?.();
		}

		/**
		 * Park an OPAQUE base colour under the wallpaper image(s). The image is what
		 * the user sees; the colour is only the backdrop while it decodes and the
		 * fallback when it is missing, broken or partly transparent. It is what makes
		 * the Windows frame rule safe: with the frame's own fill gone, something
		 * opaque has to sit behind the translucent surfaces.
		 *
		 * The colour goes on the BOTTOM layer of the stack — the `blur` fill mode's
		 * bleed layer, when one exists — so it can never hide that bleed, which is
		 * the entire point of the mode (issue #61).
		 */
		function applyWallpaperBackdrop(color) {
			try {
				const bottom = wallpaperBleedEl !== null ? wallpaperBleedEl : wallpaperEl;
				if (wallpaperEl !== null) wallpaperEl.style.backgroundColor = wallpaperEl === bottom ? color : "";
				if (wallpaperBleedEl !== null) wallpaperBleedEl.style.backgroundColor = wallpaperBleedEl === bottom ? color : "";
			} catch {
				// document null in a headless eval — the images still paint
			}
		}

		/** Apply the wallpaper's token override layer with a configurable canvas wash. */
		function shadeTokens2(ctx, canvasAlpha, snapshot = null) {
			const current = snapshot || ctx.theme.getTheme();
			// ThemeRuntime composes token override layers into snapshot.active. Reading
			// the active value here would feed our previous wallpaper wash back into the
			// next wash and hide the newly selected skin's raw base/sidebar colors.
			const active = rawActiveTheme(current);
			// When "link sidebar to main canvas" is on (default), the sidebar wash
			// uses the SAME color AND alpha as the main canvas so the two halves
			// don't look split — and, critically, the same value on both sliders
			// now produces the SAME visual result (user review round 2: the old
			// path used the sidebar's own fill token, a different base color, so
			// identical alphas still looked different). When off, the sidebar
			// keeps its own token color under the separately configured alpha.
			const linked = readSidebarLink();
			const sidebarAlpha = linked ? canvasAlpha : readSidebarOpacity();
			const sidebarColor = (scheme) => linked
				? resolveBase(scheme, active)
				: resolveSidebar(scheme, active);
			const overrides = {
				"--dsw-alias-bg-base": {
					light: toRgba(resolveBase("light", active), canvasAlpha),
					dark: toRgba(resolveBase("dark", active), canvasAlpha)
				},
				// OPAQUE base color for the composer glass fill (blue-team B1): the
				// ::before fill color-mixes this token at the user's fill weight.
				// Mixing the washed --dsw-alias-bg-base instead would compound the
				// alphas (fill = canvasAlpha × fill%), so dragging the wallpaper
				// slider secretly thinned the input box and light skins + dark
				// wallpapers became unreadable. This token carries NO alpha — the
				// fill weight is decided by the composer slider alone.
				"--dsh-dream-skin-composer-base": {
					light: resolveBase("light", active),
					dark: resolveBase("dark", active)
				},
				// Same OPAQUE value under the modal cards' own name (their readability fill):
				// question / approval card fills mix this instead of the washed
				// `--dsw-alias-bg-base`, so 弹窗不透明度 means what it says whatever the
				// wallpaper slider is doing.
				"--dsh-dream-skin-modal-base": {
					light: resolveBase("light", active),
					dark: resolveBase("dark", active)
				},
				"--dsw-specific-sidebar-fill": {
					light: toRgba(sidebarColor("light"), sidebarAlpha),
					dark: toRgba(sidebarColor("dark"), sidebarAlpha)
				}
			};
			wallpaperTokenOverrides = overrides;
			applyCombinedTokenOverrides(ctx);
			// The wash is live: publish the root marker the Windows frame rule reads
			// (sidebar-transparency leak) and park an OPAQUE base colour under the image, so
			// dropping that frame fill can never expose the document's boot canvas
			// (white on a light profile) through a missing or still-decoding image.
			applyWallpaperBackdrop(resolveBase(active.colorScheme === "light" ? "light" : "dark", active));
			const wasWashed = washActive;
			setWashActive(true);
			// Issue #100: this is one of the two places the wash gate flips, and both
			// floored channels are BAKED token values — nothing recomputes them on its
			// own. Only on the flip, because the wallpaper opacity slider runs this path
			// on every pixel of a drag.
			if (!wasWashed) republishFlooredChannels(ctx);
		}

		/**
		 * Recompute the two channels the wash gate controls (the layer-2 token and the
		 * card fill) after the gate changed under them. Safe from inside
		 * applyWallpaper2/shadeTokens2: the re-entrancy guard absorbs the `theme/change`
		 * this emit causes, exactly as the wallpaper publish above already does.
		 */
		function republishFlooredChannels(ctx) {
			applyModalOpacity();
			if (ctx !== null) applyModalOverlay(ctx);
		}

		// Wallpaper store bookkeeping lives at module scope so the module-level
		// helpers below (removeWallpaper / setWallpaperKind) can refresh the row
		// store. They are bound by apply() via wallpaperBound; before then the
		// optional chain makes syncWallpaper a safe no-op.
		let wallpaperRevision = 0;
		let wallpaperBound = null;
		/** Push the persisted wallpaper state into the Wallpaper row store (if bound). */
		function syncWallpaper() {
			wallpaperRevision += 1;
			// Store the raw data URL (not the CSS url(...) wrapper) so the
			// Wallpaper row can render an <img> preview and test `url !== null`.
			wallpaperBound?.sync(
				readWallpaper(),
				readWallpaperOpacity(),
				readWallpaperBlur(),
				readSidebarOpacity(),
				readWallpaperHistory(),
				wallpaperRevision
			);
		}

		/**
		 * Re-apply every persisted preference to the live UI: imported packs,
		 * the saved skin, the accent override and the wallpaper (including the
		 * sidebar wash opacity). Called once at boot from the localStorage seed
		 * (so the first paint is correct) and again when the host state arrives
		 * over /dream-skin/api (so the durable, origin-independent values win).
		 * Safe to call repeatedly: packs are disposed before re-registering,
		 * theme set is idempotent, and applyWallpaper2 has its own re-entrancy
		 * guard.
		 */
		/**
		 * Factory defaults (round-6): the author's shipped look - users get
		 * this exact setup on first launch (nebula skin, the bundled abstract
		 * diffused-glow wallpaper, tuned glass numbers, bing-daily timed URL).
		 * Applied ONLY when a key has no stored value yet: a user who changed
		 * anything keeps their own choice. Dynamic/trail keys (history,
		 * favorites, packs, builtin-last) are deliberately NOT defaulted.
		 *
		 * The slider / material numbers are read from the factory skin's own
		 * `defaults` block rather than restated here. They used to be a second
		 * copy of the same intent, which is how the seeded wash (0.19) and the
		 * skin's authored wash (0.26) ended up disagreeing — pick the skin from
		 * the picker and the look changed, boot fresh and it did not.
		 */
		const FACTORY_SKIN_ID = "nebula";
		const FACTORY_SKIN = SKINS.find((s) => s.id === FACTORY_SKIN_ID) || SKINS[0];
		const FACTORY_SKIN_DEFAULTS = FACTORY_SKIN && FACTORY_SKIN.defaults ? FACTORY_SKIN.defaults : {};
		const FACTORY_DEFAULTS = {
			[STORAGE_KEY]: FACTORY_SKIN_ID,
			[WALLPAPER_KIND_KEY]: "image",
			[WALLPAPER_KEY]: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIwIiBoZWlnaHQ9IjEwODAiIHZpZXdCb3g9IjAgMCAxOTIwIDEwODAiIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIHNsaWNlIj4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iYiIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiMwYTBjMTciLz48c3RvcCBvZmZzZXQ9Ii41NSIgc3RvcC1jb2xvcj0iIzA3MDgxMCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzA5MGIxMyIvPgo8L2xpbmVhckdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InYxIiBjeD0iLjc3IiBjeT0iLjE5IiByPSIuNDAiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2E0OTZlYSIgc3RvcC1vcGFjaXR5PSIwLjcyIi8+PHN0b3Agb2Zmc2V0PSIuMyIgc3RvcC1jb2xvcj0iI2E0OTZlYSIgc3RvcC1vcGFjaXR5PSIwLjQ4Ii8+PHN0b3Agb2Zmc2V0PSIuNTgiIHN0b3AtY29sb3I9IiNhNDk2ZWEiIHN0b3Atb3BhY2l0eT0iMC4yMSIvPjxzdG9wIG9mZnNldD0iLjgyIiBzdG9wLWNvbG9yPSIjYTQ5NmVhIiBzdG9wLW9wYWNpdHk9IjAuMDUiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNhNDk2ZWEiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0idjAiIGN4PSIuNzciIGN5PSIuMTkiIHI9IjAuMTUyMDAwMDAwMDAwMDAwMDIiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2NmYzZmZiIgc3RvcC1vcGFjaXR5PSIwLjM0Ii8+PHN0b3Agb2Zmc2V0PSIuMyIgc3RvcC1jb2xvcj0iI2NmYzZmZiIgc3RvcC1vcGFjaXR5PSIwLjE4NzAwMDAwMDAwMDAwMDAzIi8+PHN0b3Agb2Zmc2V0PSIuNTgiIHN0b3AtY29sb3I9IiNjZmM2ZmYiIHN0b3Atb3BhY2l0eT0iMC4wNjEyMDAwMDAwMDAwMDAwMDQiLz48c3RvcCBvZmZzZXQ9Ii44MiIgc3RvcC1jb2xvcj0iI2NmYzZmZiIgc3RvcC1vcGFjaXR5PSIwIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2ZjNmZmIiBzdG9wLW9wYWNpdHk9IjAiLz48L3JhZGlhbEdyYWRpZW50Pgo8cmFkaWFsR3JhZGllbnQgaWQ9InQxIiBjeD0iLjE2IiBjeT0iLjg4IiByPSIuNDIiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzQ4YWVjYiIgc3RvcC1vcGFjaXR5PSIwLjU0Ii8+PHN0b3Agb2Zmc2V0PSIuMyIgc3RvcC1jb2xvcj0iIzQ4YWVjYiIgc3RvcC1vcGFjaXR5PSIwLjM1Ii8+PHN0b3Agb2Zmc2V0PSIuNTgiIHN0b3AtY29sb3I9IiM0OGFlY2IiIHN0b3Atb3BhY2l0eT0iMC4xNSIvPjxzdG9wIG9mZnNldD0iLjgyIiBzdG9wLWNvbG9yPSIjNDhhZWNiIiBzdG9wLW9wYWNpdHk9IjAuMDQiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM0OGFlY2IiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0iYW0iIGN4PSIuNDgiIGN5PSIxLjA0IiByPSIuMzQiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Q5OWY2MyIgc3RvcC1vcGFjaXR5PSIwLjQ0Ii8+PHN0b3Agb2Zmc2V0PSIuMyIgc3RvcC1jb2xvcj0iI2Q5OWY2MyIgc3RvcC1vcGFjaXR5PSIwLjI4Ii8+PHN0b3Agb2Zmc2V0PSIuNTgiIHN0b3AtY29sb3I9IiNkOTlmNjMiIHN0b3Atb3BhY2l0eT0iMC4xMSIvPjxzdG9wIG9mZnNldD0iLjgyIiBzdG9wLWNvbG9yPSIjZDk5ZjYzIiBzdG9wLW9wYWNpdHk9IjAuMDMiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNkOTlmNjMiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+CjxyYWRpYWxHcmFkaWVudCBpZD0ibWlkIiBjeD0iLjM4IiBjeT0iLjUyIiByPSIuNTUiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzRiM2Y4ZiIgc3RvcC1vcGFjaXR5PSIwLjIiLz48c3RvcCBvZmZzZXQ9Ii4zIiBzdG9wLWNvbG9yPSIjNGIzZjhmIiBzdG9wLW9wYWNpdHk9IjAuMTEwMDAwMDAwMDAwMDAwMDEiLz48c3RvcCBvZmZzZXQ9Ii41OCIgc3RvcC1jb2xvcj0iIzRiM2Y4ZiIgc3RvcC1vcGFjaXR5PSIwLjA0MDAwMDAwMDAwMDAwMDAxIi8+PHN0b3Agb2Zmc2V0PSIuODIiIHN0b3AtY29sb3I9IiM0YjNmOGYiIHN0b3Atb3BhY2l0eT0iMCIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzRiM2Y4ZiIgc3RvcC1vcGFjaXR5PSIwIi8+PC9yYWRpYWxHcmFkaWVudD4KPHJhZGlhbEdyYWRpZW50IGlkPSJ2aWciIGN4PSIuNSIgY3k9Ii40NiIgcj0iLjgyIj4KPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMDAwIiBzdG9wLW9wYWNpdHk9IjAiLz48c3RvcCBvZmZzZXQ9Ii42IiBzdG9wLWNvbG9yPSIjMDAwIiBzdG9wLW9wYWNpdHk9IjAiLz48c3RvcCBvZmZzZXQ9Ii44OCIgc3RvcC1jb2xvcj0iIzAzMDQwYSIgc3RvcC1vcGFjaXR5PSIwLjIyIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMDMwNDBhIiBzdG9wLW9wYWNpdHk9IjAuNDgiLz4KPC9yYWRpYWxHcmFkaWVudD4KPGZpbHRlciBpZD0ibiIgeD0iMCIgeT0iMCIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyVW5pdHM9Im9iamVjdEJvdW5kaW5nQm94IiBwcmltaXRpdmVVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+CjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIuODIiIG51bU9jdGF2ZXM9IjEiIHNlZWQ9IjciIHN0aXRjaFRpbGVzPSJzdGl0Y2giIHJlc3VsdD0idCIvPgo8ZmVDb2xvck1hdHJpeCBpbj0idCIgdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgLjUgMCAwIDAgMCAuNSAwIDAgMCAwIC41IC4zMCAuMzAgLjMwIDAgMCIvPgo8L2ZpbHRlcj4KPHBhdHRlcm4gaWQ9ImdyYWluIiB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3Qgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbHRlcj0idXJsKCNuKSIvPjwvcGF0dGVybj4KPC9kZWZzPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSJ1cmwoI2IpIi8+CjxyZWN0IHdpZHRoPSIxOTIwIiBoZWlnaHQ9IjEwODAiIGZpbGw9InVybCgjbWlkKSIvPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSJ1cmwoI3YxKSIvPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSJ1cmwoI3YwKSIvPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSJ1cmwoI3QxKSIvPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSJ1cmwoI2FtKSIvPgo8cmVjdCB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSJ1cmwoI3ZpZykiLz4KPHJlY3Qgd2lkdGg9IjE5MjAiIGhlaWdodD0iMTA4MCIgZmlsbD0idXJsKCNncmFpbikiIG9wYWNpdHk9IjAuMiIvPgoKPC9zdmc+",
			[WALLPAPER_URL_KEY]: "https://uapis.cn/api/v1/image/bing-daily",
			[WALLPAPER_GRADIENT_KEY]: FACTORY_SKIN ? FACTORY_SKIN.glow : "",
			[WALLPAPER_OPACITY_KEY]: String(FACTORY_SKIN_DEFAULTS.wallpaperOpacity ?? 0.19),
			[WALLPAPER_BLUR_KEY]: String(FACTORY_SKIN_DEFAULTS.wallpaperBlur ?? 3),
			// Read from SIDEBAR_DEFAULTS, never restated: the reader fallbacks
			// and this seed share one table (issue #55 review). The skin's own
			// sidebar value is applied later by applySkinDefaults() on the
			// first skin switch; the rail's boot value stays the shared table
			// so a reader that never saw a skin switch still agrees.
			[SIDEBAR_OPACITY_KEY]: String(SIDEBAR_DEFAULTS.opacity),
			[SIDEBAR_LINK_KEY]: SIDEBAR_DEFAULTS.link ? "1" : "0",
			[WALLPAPER_AUTODIM_KEY]: FACTORY_SKIN_DEFAULTS.autodim === false ? "0" : "1",
			[WALLPAPER_FOLLOWS_SKIN_KEY]: "0",
			// Not deferred: on its own a fill mode paints nothing (it only matters
			// once a wallpaper exists), so it cannot cause the #51 flash.
			[WALLPAPER_FIT_KEY]: DEFAULT_WALLPAPER_FIT,
			[COMPOSER_OPACITY_KEY]: String(FACTORY_SKIN_DEFAULTS.composerOpacity ?? 0.4),
			[MODAL_OPACITY_KEY]: String(FACTORY_SKIN_DEFAULTS.modalOpacity ?? 0.94),
			[MATERIAL_PRESET_KEY]: String(FACTORY_SKIN_DEFAULTS.material ?? DEFAULT_MATERIAL_PRESET),
			// Factory refresh OFF (blue-team B7): polling a third-party API on the
			// user's behalf (even hourly) must be an explicit opt-in, never a
			// default. The URL field stays pre-filled; the user enables the
			// schedule themselves. DEFAULT_REFRESH_HOURS (24h) applies once on.
			[WALLPAPER_REFRESH_KEY]: "{\"on\":0,\"hours\":24}"
		};
		/**
		 * Issue #51 (dynamic-port desktop shell): the visible wallpaper keys
		 * are NOT seeded during the boot pass. On an Electron shell whose core
		 * listens on a fresh port every launch the origin changes each start,
		 * so localStorage is ALWAYS empty at boot — "empty storage" here means
		 * "dynamic-port restart", not "first install". Seeding the factory
		 * wallpaper immediately painted the shipped look for one frame before
		 * the host state arrived and overwrote it (the reported flash).
		 * applyFactoryDefaults() parks a callback here instead; loadFromHost
		 * invokes it once the host probe settles, with whether the host state
		 * mentions any wallpaper key AT ALL: present (even "" = user-cleared)
		 * means the host is authoritative and the factory look must not
		 * resurrect; absent (or host unreachable) means no wallpaper decision
		 * exists yet, so the shipped look is seeded then — a few hundred ms
		 * later on a true first install, without ever flashing over a user.
		 */
		let seedDeferredFactoryWallpaper = null;
		const DEFERRED_WALLPAPER_KEYS = [
			WALLPAPER_KIND_KEY, WALLPAPER_KEY, WALLPAPER_URL_KEY, WALLPAPER_GRADIENT_KEY
		];
		/**
		 * Write every factory default that has no stored value yet. Runs at
		 * boot before the persisted-state restore, so first launch paints the
		 * full shipped look; existing users (any stored value present) are
		 * never touched. ONE-SHOT via the factory-applied marker: without it a
		 * user who CLEARS their wallpaper would get the bundled one resurrected
		 * on the next boot (blue-team round-6 fix).
		 */
		function applyFactoryDefaults() {
			// Load the persistent provenance snapshot BEFORE anything reads it
			// (blue-team T1): isFactorySeededValue()/hasUserState() must see the
			// cross-session factory provenance, not just this session's seals.
			loadFactorySnapshot();
			// Blue-team F1: the marker key is new in this build, so EVERY upgrader
			// lacks it — the marker alone cannot distinguish "fresh install" from
			// "existing user who never touched X". Upgraders must keep exactly
			// what they have (an untouched URL-wallpaper user would otherwise get
			// the factory 1h refresh schedule silently switched on). True first
			// install = NO plugin storage at all — probed below; the marker then
			// guards the rare "user cleared a value but kept others" case after.
			// Sentinel-key probing works across the 3-layer storage AND test
			// mocks that don't implement localStorage.length/key().
			// Blue-team B2: the list must cover EVERY user-visible preference key,
			// not just the factory ones — a user who only ever touched the sidebar
			// opacity or the auto-dim switch is still an existing user and must
			// not be force-seeded with the full factory look.
			let hasAnyStoredValue = false;
			const SENTINEL_KEYS = [
				STORAGE_KEY, WALLPAPER_KEY, WALLPAPER_KIND_KEY, WALLPAPER_URL_KEY,
				WALLPAPER_OPACITY_KEY, WALLPAPER_BLUR_KEY, WALLPAPER_HISTORY_KEY,
				WALLPAPER_GRADIENT_KEY, WALLPAPER_AUTODIM_KEY, WALLPAPER_FOLLOWS_SKIN_KEY,
				WALLPAPER_REFRESH_KEY, SIDEBAR_OPACITY_KEY, SIDEBAR_LINK_KEY,
				WALLPAPER_FIT_KEY,
				ACCENT_KEY, PACKS_KEY, FAVORITES_KEY, BUILTIN_LAST_KEY,
				COMPOSER_OPACITY_KEY, MODAL_OPACITY_KEY, MATERIAL_PRESET_KEY
			];
			for (const sk of SENTINEL_KEYS) {
				if (readStorage(sk) != null) {
					hasAnyStoredValue = true;
					break;
				}
			}
			if (readStorage(FACTORY_APPLIED_KEY) != null || hasAnyStoredValue) {
				// factory:true keeps this bookkeeping write off the host push
				// schedule too (post-release review 🟡-2) — the marker is an
				// internal key and is filtered from patches anyway.
				if (readStorage(FACTORY_APPLIED_KEY) == null) writeStorage(FACTORY_APPLIED_KEY, "1", { factory: true });
				return;
			}
			// Issue #51: split the seeding. Non-visual defaults (skin, accent,
			// opacities, preset…) seed immediately — they are token changes and
			// produce no visible flash even when the host later overrides them.
			// The wallpaper keys park until the host probe settles (see
			// seedDeferredFactoryWallpaper above): on a dynamic-port desktop
			// restart empty localStorage is the NORM, and seeding the shipped
			// wallpaper right away painted it for one frame before the host's
			// durable (possibly cleared) value arrived — the reported flash.
			for (const key of Object.keys(FACTORY_DEFAULTS)) {
				if (DEFERRED_WALLPAPER_KEYS.includes(key)) continue;
				if (readStorage(key) == null) writeStorage(key, FACTORY_DEFAULTS[key], { factory: true });
			}
			seedDeferredFactoryWallpaper = (hostHasWallpaper) => {
				// One-shot: whichever path gets here first (probe success or a
				// subsequent boot pass) consumes the pending seed. Returns whether
				// anything was written, so the caller knows a re-apply is needed.
				seedDeferredFactoryWallpaper = null;
				if (hostHasWallpaper) {
					// The host state mentions a wallpaper key — including null from
					// a user who CLEARED their wallpaper (the push is a full-state
					// replacement, so the key survives with a null value). The host
					// is the durable authority (blue-team B1): seeding the factory
					// look here would resurrect the shipped wallpaper over the
					// user's explicit "no wallpaper" exactly like the round-6 bug.
					return false;
				}
				let wrote = false;
				for (const key of DEFERRED_WALLPAPER_KEYS) {
					if (readStorage(key) == null) {
						writeStorage(key, FACTORY_DEFAULTS[key], { factory: true });
						wrote = true;
					}
				}
				return wrote;
			};
			writeStorage(FACTORY_APPLIED_KEY, "1", { factory: true });
		}

		/**
		 * One-time replacement of wallpapers that earlier releases shipped as the
		 * factory default. Identity is the exact stored-string length + decoded
		 * byte length + cyrb53 of the image bytes, so a false positive against a
		 * user photo is not realistically possible, and the length pre-check
		 * avoids decoding anything on the common path. Idempotent: once replaced,
		 * the new value no longer matches. Write semantics follow the boot probe:
		 * BEFORE the host state settles the swap is PROVISIONAL (factory-sealed —
		 * a durable host value, including a user-cleared "" wallpaper, still
		 * outranks it, issue #51 semantics); AFTER settlement it is a normal
		 * user-state write, so the legacy copy living in
		 * `$DSH_HOME/dream-skin.json` gets replaced too and every origin
		 * converges on the new image.
		 *
		 * Entry 1 (v9.13.0–v9.23.0): a stock photo that does not fit the brand
		 * and carries no distribution license.
		 * Entry 2 (v9.24.0–v9.27.0): a 1200×678 raster of the abstract glow. The
		 * wallpaper layer is `background-size: cover`, so a 2K screen upscales
		 * that raster ~2.1× and its JPEG macroblocks read as visible squares
		 * (Chromium rasterisation of the shipped bytes at 2560×1440: 90% of
		 * horizontally adjacent pixels identical, longest flat run 853px). The
		 * current default is the same three-blob composition drawn as an inline
		 * SVG — smooth at any resolution, 3.4KB instead of 7.0KB.
		 *
		 * Entry 2's triple is RECOMPUTED from the real v9.27.0 bytes by
		 * tests/client.persistence.test.cjs (fixture under tests/fixtures/) —
		 * never retype it from a one-off probe: a hand-copied hash here once
		 * silently disabled the migration on every machine, and no test could
		 * tell, because every other case rewrites the triple to fit its own
		 * synthetic payload.
		 */
		const LEGACY_FACTORY_WALLPAPERS = [
			{ prefix: "data:image/jpeg;base64,", dataUrlLength: 115863, byteLength: 86879, hash: 1042845555783671 },
			{ prefix: "data:image/jpeg;base64,", dataUrlLength: 9619, byteLength: 7197, hash: 7481607271554265 }
		];

		/**
		 * cyrb53 — the identity hash both wallpaper migrations share.
		 *
		 * Shared on purpose: `migrateLegacyFactoryWallpaper()` hashes the DECODED
		 * image bytes (a binary string), `migrateLegacySkinGlow()` hashes the
		 * gradient text directly. Both are "a JS string of char codes", which is
		 * all this needs.
		 */
		function cyrb53(str) {
			let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
			for (let i = 0; i < str.length; i++) {
				const ch = str.charCodeAt(i);
				h1 = Math.imul(h1 ^ ch, 2654435761);
				h2 = Math.imul(h2 ^ ch, 1597334677);
			}
			h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
			h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
			h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
			h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
			return 4294967296 * (2097151 & h2) + (h1 >>> 0);
		}
		function migrateLegacyFactoryWallpaper() {
			try {
				const raw = readStorage(WALLPAPER_KEY);
				if (typeof raw !== "string") return;
				const legacy = LEGACY_FACTORY_WALLPAPERS.find(
					(f) => raw.length === f.dataUrlLength && raw.indexOf(f.prefix) === 0
				);
				if (!legacy) return;
				const bin = atob(raw.slice(legacy.prefix.length));
				if (bin.length !== legacy.byteLength) return;
				if (cyrb53(bin) !== legacy.hash) return;
				// Pre-settle: provisional (factory-sealed) so the arriving host
				// state stays authoritative; post-settle: user-state write that
				// pushes and replaces the legacy copy in the host file (9.26.1
				// adjudication T-02 — plain user write here could resurrect a
				// wallpaper the user had cleared on another origin).
				// ⚠ CONTROLLED EXCEPTION (external review B-5, 9.26.x): this is
				// the ONE place a factory-provenance value is written to the
				// host state file as a user-state push, overriding blue-team
				// B1's "factory never pushes" rule. Justification: the legacy
				// asset is the shipped image nobody actively chose (never a
				// user decision), the swap is triple-fingerprint gated, and
				// pushing is what converges stale copies in dream-skin.json so
				// every origin ends up on the new image. DO NOT "fix" this
				// back to a constant factory-provisional write — the host file
				// would keep the old photo forever and the convergence would
				// silently break. Pinned by a regression test (smoke: migration
				// post-settle push semantics).
				writeStorage(WALLPAPER_KEY, FACTORY_DEFAULTS[WALLPAPER_KEY], hostProbeSettled ? {} : { factory: true });
			} catch {}
		}

		/**
		 * One-time repair of the built-in skin gradients the 10.6.1 redesign
		 * replaced (issue #79).
		 *
		 * `followsSkin()` has a pre-0.4.0 compatibility branch: back then a skin
		 * auto-attached its gradient WITHOUT recording the follows flag, so the
		 * branch infers "this background is ours, follow the skin" from the
		 * stored string being EXACTLY one of the built-in gradients. The 10.6.1
		 * redesign re-rolled every `SKINS[].glow` (the old strings are 230–320
		 * characters, the new ones 399–409), so that branch stopped matching:
		 * a user whose background was still a pre-redesign built-in glow got a
		 * background that no longer follows the skin at all, silently. Measured
		 * before this migration: 0 of 8 old strings still matchable.
		 *
		 * Identity is the same shape as `migrateLegacyFactoryWallpaper()` —
		 * length + a cheap leading-characters filter + cyrb53 — minus the decode
		 * step, which does not apply to a plain gradient string. All eight
		 * 64-character prefixes are distinct, and the exact length plus a 53-bit
		 * hash makes a false positive on a hand-pasted gradient unrealistic.
		 * The hash is RECOMPUTED from the real v10.6.0 strings by
		 * tests/client.smoke.test.cjs (fixture under tests/fixtures/) — never
		 * retype one from a probe: a hand-copied constant already silently
		 * disabled the factory migration once, and no test could tell because
		 * every other case rewrote the triple to fit its own payload.
		 *
		 * Two red lines, both encoded here rather than left to intent:
		 *   - A user's own wallpaper is never touched. `wallpaper-kind` must be
		 *     `gradient`, the string must match a legacy built-in EXACTLY, and
		 *     `wallpaper-follows-skin` must not be `"0"` — the gradient picker
		 *     writes `0` when the user chooses a gradient themselves, so an
		 *     explicit choice is out of scope even when the bytes coincide.
		 *   - The legacy factory photo must never come back: this function only
		 *     ever writes a CURRENT `SKINS[].glow`, never an image.
		 *
		 * Idempotent: the replacement is a current glow, and the "already a
		 * current glow" guard below returns before the fingerprint is even
		 * consulted.
		 */
		/** Set by a provisional (pre-settle) glow repair, consumed post-settle. */
		let glowRepairPending = false;
		const LEGACY_SKIN_GLOWS = [
			{ id: "abyss", length: 314, prefix: "radial-gradient(1100px 620px at 82% -8%, rgba(94, 106, 210, 0.35", hash: 8811821537959957 },
			{ id: "aurora", length: 313, prefix: "radial-gradient(1100px 620px at 84% -8%, rgba(45, 212, 191, 0.30", hash: 2683305136156990 },
			{ id: "nebula", length: 315, prefix: "radial-gradient(1100px 620px at 82% -8%, rgba(139, 124, 246, 0.3", hash: 3162859727811859 },
			{ id: "ember", length: 312, prefix: "radial-gradient(1100px 620px at 84% -8%, rgba(245, 158, 91, 0.28", hash: 4852647481428614 },
			{ id: "midnight", length: 230, prefix: "radial-gradient(1000px 600px at 82% -8%, rgba(124, 140, 255, 0.2", hash: 2213938980548700 },
			{ id: "ivory", length: 319, prefix: "radial-gradient(1000px 560px at 84% -6%, rgba(196, 164, 120, 0.3", hash: 3302994096494149 },
			{ id: "mist", length: 320, prefix: "radial-gradient(1000px 560px at 84% -6%, rgba(159, 190, 245, 0.3", hash: 5350947715464924 },
			{ id: "rose", length: 320, prefix: "radial-gradient(1000px 560px at 84% -6%, rgba(214, 120, 160, 0.2", hash: 4126987134742479 }
		];
		function migrateLegacySkinGlow() {
			try {
				if (readStorage(WALLPAPER_KIND_KEY) !== "gradient") return;
				const raw = readStorage(WALLPAPER_GRADIENT_KEY);
				if (typeof raw !== "string" || raw === "") return;
				// `"0"` is ALWAYS a user action — every write site of it is one
				// (picking an image / URL / gradient, applying from history, the
				// sidebar drag, the committed scheduled refresh). An explicit
				// choice is the red line, so it ends the question here even when
				// the bytes coincide with a legacy built-in.
				if (readStorage(WALLPAPER_FOLLOWS_SKIN_KEY) === "0") return;
				const legacy = LEGACY_SKIN_GLOWS.find(
					(f) => raw.length === f.length && raw.indexOf(f.prefix) === 0 && cyrb53(raw) === f.hash
				);
				if (legacy) {
					// The stored string proves which skin wrote it; the SAVED skin
					// is what "follow the skin" has to mean now, so it wins when it
					// is a built-in that still ships a glow (a pack id has none).
					const saved = readSavedSkin();
					const target = SKINS.find((s) => s.id === saved && typeof s.glow === "string")
						|| SKINS.find((s) => s.id === legacy.id && typeof s.glow === "string");
					if (!target) return;
					// Pre-settle the swap stays PROVISIONAL (factory-sealed), so a
					// durable host value still outranks it; post-settle it is a
					// normal user-state write, which is what converges the stale
					// string sitting in $DSH_HOME/dream-skin.json. Without the
					// post-settle half the host probe would adopt the dead gradient
					// straight back and the background would stay broken forever.
					// ⚠ CONTROLLED EXCEPTION, like the factory-wallpaper migration's:
					// the state written IS the user's config ("this background
					// follows the skin"), it is reachable only through the
					// fingerprint plus the follows-marker gate, and never for a
					// gradient the user chose. Pinned by regression tests (smoke:
					// issue #79 block).
					writeStorage(WALLPAPER_GRADIENT_KEY, target.glow, hostProbeSettled ? {} : { factory: true });
					writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "1", hostProbeSettled ? {} : { factory: true });
					glowRepairPending = !hostProbeSettled;
					return;
				}
				// Second pass. `loadFromHost` adopts over factory-SEALED writes on
				// purpose ("the durable host value always wins"), so when
				// dream-skin.json still holds the dead string, the repair above is
				// adopted straight back and this pass runs on the restored legacy
				// value — the branch above fires again, unsealed. When the host had
				// no gradient key instead, the repaired value survived and what is
				// left is to re-assert the marker as USER state: sealed factory
				// values are never pushed, so without this the marker would never
				// reach dream-skin.json, a dynamic-port restart would re-seed
				// `follows = 0` from FACTORY_DEFAULTS, and the background would stop
				// following again — the exact bug this function exists to fix.
				if (glowRepairPending && hostProbeSettled) {
					glowRepairPending = false;
					if (SKINS.some((s) => wallpapersSuggestionsFor(s.id) === raw)) {
						writeStorage(WALLPAPER_GRADIENT_KEY, raw, {});
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "1", {});
					}
				}
			} catch {}
		}

		function restorePersistedState(ctx) {
			applyFactoryDefaults();
			// Swap the legacy factory photo before anything reads the wallpaper.
			migrateLegacyFactoryWallpaper();
			// …and the legacy built-in glows, or a pre-redesign background stops
			// following the skin with no way for the user to know why (issue #79).
			migrateLegacySkinGlow();
			// P0: re-register previously imported packs before restoring a skin,
			// then import any pack shared via URL hash.
			disposeAllPacks();
			restorePacks(ctx);
			tryImportFromHash(ctx);

			// Restore the saved skin (no-op when already current).
			const saved = readSavedSkin();
			if (typeof saved === "string" && saved !== DEFAULT_SKIN && (SKINS.some((skinDefinition) => skinDefinition.id === saved) || importedPacks.some((p) => p.id === saved))) {
				const current = ctx.theme.getTheme().preference;
				if (current !== saved) ctx.theme.setTheme(saved);
			} else {
				// No third-party skin active — restore the last concrete built-in
				// preference (dark/light) the user committed, so a remote browser's
				// process-local ui-theme scope being reset to `system` by a client
				// reload / agent-preset change (issue #11) is corrected here too.
				const builtinLast = readBuiltinLast();
				if (builtinLast !== null) {
					const current = ctx.theme.getTheme().preference;
					if (current !== builtinLast) ctx.theme.setTheme(builtinLast);
				}
			}
			// P0: apply the persisted per-user accent override.
			applyAccent(ctx);

			// Apply + push the wallpaper state (includes the sidebar opacity).
			applyWallpaper2(ctx);
			syncWallpaper();

			// Apply the persisted popup-fill weight so saved modal opacity re-applies.
			applyModalOpacity();
			// Apply the persisted composer (chat input) fill weight so the saved
			// input-box translucency re-applies on boot too.
			applyComposerOpacity();
			// Issue #50: mark the composer card by DOM shape so the glass rules
			// survive host class-hash re-rolls (dsh 0.1.5+).
			startComposerMarker();
			// Apply the persisted glass blur so the composer's backdrop-filter
			// picks up the saved 壁纸模糊 value on boot too.
			applyMaterialBlur();
			// Scale DSH's popup/overlay/menu backgrounds so saved popup opacity takes
			// effect on the real popovers & dropdowns (issue #9 follow-up).
			applyModalOverlay(ctx);
			// Issue #80: `restorePersistedState` runs BEFORE the theme/change
			// listener below is registered (it is called at the top of apply()),
			// so the skin it just restored would otherwise not republish the
			// scheme attribute until the next unrelated theme event. Stamp the
			// settled scheme here as well.
			applySchemeAttr(ctx);
		}

		/** Clear wallpaper (all kinds) and its overrides. */
		function removeWallpaper(ctx) {
			writeStorage(WALLPAPER_KEY, null);
			writeStorage(WALLPAPER_URL_KEY, null);
			writeStorage(WALLPAPER_GRADIENT_KEY, null);
			writeStorage(WALLPAPER_KIND_KEY, null);
			teardownWallpaper(ctx);
			syncWallpaper();
		}

		/** Read recent wallpaper history entries [{kind,value}]. */
		function readWallpaperHistory() {
			const raw = readStorage(WALLPAPER_HISTORY_KEY);
			if (raw === null) return [];
			try {
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.value === "string") : [];
			} catch {
				return [];
			}
		}

		/** Persist the wallpaper history list. */
		function writeWallpaperHistory(list) {
			writeStorage(WALLPAPER_HISTORY_KEY, JSON.stringify(list.slice(0, WALLPAPER_HISTORY_MAX)));
		}

		/** Record a wallpaper setting into history (dedupe by kind+value, newest first). */
		function pushWallpaperHistory(kind, value) {
			if (value === null || value === undefined || value === "") return;
			const list = readWallpaperHistory();
			const deduped = list.filter((e) => !(e.kind === kind && e.value === value));
			deduped.unshift({ kind, value });
			writeWallpaperHistory(deduped);
		}

		/** Set a wallpaper by kind and value. Returns false when the value was refused. */
		function setWallpaperKind(ctx, kind, value) {
			// The URL kind accepts only validated image URLs; anything else is
			// refused before it can reach storage (history entries, state file
			// or an older session's localStorage all pass through here).
			if (kind === "url" && value !== null && !isSafeWallpaperUrl(value)) return false;
			// The gradient kind is validated the same way — a share link or host
			// state that smuggles a resource-fetching function is refused here and
			// re-checked at render time.
			if (kind === "gradient" && value !== null && !isSafeWallpaperGradient(value)) return false;
			writeStorage(WALLPAPER_KIND_KEY, kind);
			if (kind === "gradient") {
				writeStorage(WALLPAPER_GRADIENT_KEY, value);
			} else if (kind === "url") {
				writeStorage(WALLPAPER_URL_KEY, value);
			} else {
				writeStorage(WALLPAPER_KEY, value);
			}
			pushWallpaperHistory(kind, value);
			applyWallpaper2(ctx);
			syncWallpaper();
			return true;
		}
		//#endregion

		//#region dsh-dream-skin: P0 share-url import
		/** Try to import a pack shared via URL hash; true when one was imported. */
		function tryImportFromHash(ctx) {
			const decoded = decodeShareUrl(window.location.hash);
			if (!decoded) return false;
			// A share whose manifest is a BUILT-IN skin (packShareUrl synthesizes
			// those) must NOT be imported as a pack: that would create a frozen
			// `dream-pack:<id>` duplicate that silently diverges from the real skin
			// on plugin updates. The skin is already registered locally — just
			// select it and clear the hash.
			if (SKINS.some((skin) => skin.id === decoded.pack.manifest.id)) {
				const skinId = decoded.pack.manifest.id;
				try {
					if (ctx.theme.getTheme().preference !== skinId) ctx.theme.setTheme(skinId);
					writeSavedSkin(skinId);
				} catch {
					return false;
				}
				try {
					window.history.replaceState(null, "", window.location.pathname + window.location.search);
				} catch {
					// no-op
				}
				return true;
			}
			try {
				// A pack id already in the local library wins: do NOT let a share link
				// silently overwrite the registration (the library card would then show
				// the old manifest while the runtime uses the new tokens). Keep the
				// existing pack and just record the visit.
				const exists = importedPacks.some((p) => p && p.id === decoded.id);
				if (!exists) {
					applyPackToTheme(ctx, decoded.id, packToRegistration(decoded.pack));
					importedPacks.push({ id: decoded.id, manifest: decoded.pack.manifest, registration: packToRegistration(decoded.pack) });
				}
				const packs = readPacks();
				if (!packs.some((p) => p.id === decoded.id)) packs.push({ id: decoded.id, manifest: decoded.pack.manifest });
				writePacks(packs);
			} catch {
				// A bad import at boot must NOT consume the share link: keep the hash
				// so the user can retry (or notice the failure) on the next load.
				return false;
			}
			// Clear the hash so it doesn't re-import on every reload.
			try {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			} catch {
				// no-op
			}
			return true;
		}
		//#endregion

		//#endregion

		//#region dsh-dream-skin: P0 UI rows (accent + packs)
		/** Curated accent presets users can pick with one click. */
		const ACCENT_PRESETS = [
			"#4f83f2", "#2563eb", "#34d399", "#22d3ee", "#a78bfa",
			"#fb923c", "#f87171", "#fbbf24", "#e879f9", "#f472b6",
			"#2dd4bf", "#a3e635"
		];

		/**
		 * Accent row: pick an arbitrary brand-accent color (or clear to follow
		 * the active theme). Uses an `<input type="color">` + the current accent
		 * preview swatch, stacked as an override layer via ctx.theme.
		 */
		function AccentRow({ t, setAccent, clearAccent, useStore }) {
			const accent = useStore((s) => s.accent);
			const base = useStore((s) => s.base);
			const activeValue = accent !== DEFAULT_ACCENT ? accent : base;
			const inputValue = normalizeHex(activeValue) || "#4f83f2";
			const accentPickerRef = (0, _react.useRef)(null);
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: [
							t("accent.title"),
							// Round-6: hint collapsed into the "?" badge (hover to read).
							(0, react_jsx_runtime.jsx)(HelpDot, { text: t("accent.hint") })
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								style: { ...styles.accentDot, background: inputValue },
								children: null
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: styles.accentHex,
								children: inputValue
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => {
									if (accentPickerRef.current) accentPickerRef.current.click();
								},
								children: t("accent.pick")
							}),
							(0, react_jsx_runtime.jsx)("input", {
								ref: accentPickerRef,
								type: "color",
								value: inputValue,
								style: { display: "none" },
								onChange: (event) => setAccent(event.target.value)
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => {
									const next = randomAccent();
									setAccent(next);
								},
								children: t("accent.random")
							}),
							accent !== DEFAULT_ACCENT ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: { ...styles.button, ...styles.buttonDanger },
								onClick: clearAccent,
								children: t("accent.clear")
							}) : null
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: ACCENT_PRESETS.map((hex) => (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							title: hex,
							"aria-pressed": activeValue === hex,
							style: {
								...styles.accentPreset,
								background: hex,
								...(activeValue === hex ? { outline: "2px solid var(--dsw-alias-label-primary)", outlineOffset: "1px" } : {})
							},
							onClick: () => setAccent(hex),
							children: null
						}, hex))
					})
				]
			});
		}

		/** Pick a pleasant palette accent that differs from the current one. */
		function randomAccent() {
			const pool = ["#4f83f2", "#34d399", "#a78bfa", "#fb923c", "#f87171", "#22d3ee", "#fbbf24", "#e879f9", "#2dd4bf", "#f472b6", "#60a5fa", "#a3e635"];
			const current = readAccent();
			const candidates = pool.filter((c) => c !== current);
			return candidates[Math.floor(Math.random() * candidates.length)] || "#4f83f2";
		}

		/**
		 * Packs row: import a theme-pack JSON, apply / favorite themes in the
		 * library, export/share the current pack, and "surprise me".
		 */
		function PacksRow({ t, applyId, toggleFavorite, removePack, surprise, useStore }) {
			const packExport = typeof packExporter === "function" ? packExporter : null;
			const ids = useStore((s) => s.ids);
			const names = useStore((s) => s.names);
			const favorites = useStore((s) => s.favorites);
			const active = useStore((s) => s.active);
			const shareCopiedState = (0, _react.useState)(false);
			const shareCopied = shareCopiedState[0];
			const setShareCopied = shareCopiedState[1];
			const fileInput = (0, _react.useRef)(null);
			const importFile = () => { if (fileInput.current) fileInput.current.click(); };

			const onFile = (event) => {
				const file = event.target.files?.[0];
				if (file === void 0) return;
				if (file.size > PACK_MAX_BYTES) {
					event.target.value = "";
					return;
				}
				const reader = new FileReader();
				reader.onerror = () => {
					event.target.value = "";
				};
				reader.onload = () => {
					let data = null;
					try {
						data = JSON.parse(String(reader.result));
					} catch {
						data = null;
					}
					if (data !== null && packsImportHandler) {
						packsImportHandler(null, data); // handler wraps validatePack + importPack
					}
					event.target.value = "";
				};
				reader.readAsText(file);
			};

			/**
			 * Copy the share link with a guaranteed user-visible outcome. Three
			 * layers, because "no reaction" was the reported bug:
			 *   1. nothing shareable active → an alert explains WHY (was: silence);
			 *   2. navigator.clipboard works → the button label flashes "已复制 ✓";
			 *   3. clipboard unavailable / rejected (http remote origins, older
			 *      webviews) → fallback to a hidden textarea + document.execCommand
			 *      copy, and if THAT fails too, an alert shows the URL to copy by hand.
			 */
			const doShare = () => {
				const activeId = (active && ids.indexOf(active) !== -1)
					? active
					// A built-in skin is active (not in the pack ids list): still
					// shareable via its synthesized manifest — unless it is one of
					// the host's own built-in preferences (system/light/dark), which
					// have no tokens of ours to share.
					: (active && SKINS.some((skin) => skin.id === active) ? active : null);
				if (!activeId || !packShare) {
					try { window.alert(localeT("packs.shareUnavailable")); } catch {}
					return;
				}
				const url = packShare(activeId);
				if (!url) {
					try { window.alert(localeT("packs.shareUnavailable")); } catch {}
					return;
				}
				const flashCopied = () => {
					setShareCopied(true);
					setTimeout(() => setShareCopied(false), 1600);
				};
				const legacyCopy = () => {
					try {
						const textarea = document.createElement("textarea");
						textarea.value = url;
						textarea.setAttribute("readonly", "");
						textarea.style.position = "fixed";
						textarea.style.opacity = "0";
						document.body.appendChild(textarea);
						textarea.select();
						const ok = document.execCommand("copy");
						textarea.remove();
						return ok;
					} catch {
						return false;
					}
				};
				let finished = false;
				const succeed = () => {
					if (finished) return;
					finished = true;
					flashCopied();
				};
				const fail = () => {
					if (finished) return;
					finished = true;
					try { window.alert(localeT("packs.shareFailed", { url })); } catch {}
				};
				// Single finished gate: late callbacks after a fallback already ran
				// (or a late success after the failure alert) are ignored, so the
				// button never flashes contradictory feedback twice.
				const fallback = () => {
					if (finished) return;
					if (legacyCopy()) succeed();
					else fail();
				};
				try {
					if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
						// A hung clipboard promise (permission prompt swallowed by some
						// webviews) must not leave the click without ANY reaction — race
						// it against a short timeout that falls back to legacyCopy.
						finished = false;
						Promise.race([
							navigator.clipboard.writeText(url).then(() => { succeed(); }),
							new Promise((resolve) => setTimeout(() => { resolve(); }, 2000))
						]).then(() => {
							fallback();
						}).catch(() => {
							fallback();
						});
					} else {
						fallback();
					}
				} catch {
					fallback();
				}
			};

			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("packs.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: styles.actionRow,
						children: [
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: importFile,
								children: t("packs.import")
							}),
							(0, react_jsx_runtime.jsx)("input", {
								ref: fileInput,
								type: "file",
								accept: ".json,.dsh-theme.json,.dsh-theme,application/json",
								style: { display: "none" },
								onChange: onFile
							}),
							(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => surprise(),
								children: t("packs.surprise")
							}),
							active && packShare ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: {
									...styles.button,
									...(shareCopied ? styles.tinyButtonActive : {})
								},
								onClick: doShare,
								children: shareCopied ? t("packs.shareCopied") : t("packs.share")
							}) : null,
							// Cross-machine sharing path: a theme FILE does not bake the
							// local DSH origin (random port) into the payload, unlike the
							// share link. Works for imported packs AND built-in skins.
							active && packExport ? (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: styles.button,
								onClick: () => {
									// Host built-in preferences (system/light/dark) have no
									// manifest to export — never leave the click silent
									// (blue-team F1): mirror the share button's alert.
									if (!packExport(active)) {
										try { window.alert(localeT("packs.shareUnavailable")); } catch {}
									}
								},
								children: t("packs.export")
							}) : null
						]
					}),
					ids.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
						style: styles.grid,
						children: ids.map((id) => {
							const fav = favorites.indexOf(id) !== -1;
							const label = names[id] || id;
							return (0, react_jsx_runtime.jsxs)("button", {
								key: id,
								type: "button",
								"aria-pressed": active === id,
								style: {
									...styles.card,
									...(active === id ? styles.cardSelected : {})
								},
								children: [
									(0, react_jsx_runtime.jsx)("span", {
										style: styles.cardLabel,
										children: label
									}),
									(0, react_jsx_runtime.jsxs)("div", {
										style: styles.actionRow,
										children: [
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: { ...styles.tinyButton },
												onClick: () => applyId(id),
												children: t("packs.apply")
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: { ...styles.tinyButton, ...(fav ? styles.tinyButtonActive : {}) },
												onClick: () => toggleFavorite(id),
												children: fav ? "★" : "☆"
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: { ...styles.tinyButton, ...styles.buttonDanger },
												onClick: () => removePack(id),
												children: t("packs.remove")
											})
										]
									})
								]
							});
						})
					}) : (0, react_jsx_runtime.jsx)("div", {
						style: styles.hint,
						children: t("packs.empty")
					})
				]
			});
		}
		//#endregion

		//#region dsh-dream-skin: Appearance settings section
		/**
		 * A dedicated "Theme / 外观" settings section. Hosts the skin, wallpaper,
		 * advanced wallpaper, accent and theme-pack rows — instead of flat rows in
		 * the General section, they live under their own category in the settings
		 * left nav.
		 */
		function DreamSkinSection({ renderSlot }) {
			return (0, react_jsx_runtime.jsx)("div", {
				style: styles.section,
				children: renderSlot("settings.dreamSkin.item", {})
			});
		}
		//#endregion
		//#region dsh-dream-skin: client plugin body
		/**
		 * Required services: theme runtime (skins, switching, token override
		 * layers), slots/locale (the settings rows). Persistence is
		 * localStorage, so no settings transport is needed.
		 */
		const inject = [
			"slots",
			"locale",
			"theme"
		];

		/**
		 * Client plugin body: register the curated skins into the theme runtime,
		 * restore the saved skin and wallpaper, keep the rows' stores in sync
		 * with theme/change, and register both rows into Settings → General.
		 * @param ctx - client cordis context.
		 */
		function apply(ctx) {
			// Boot diagnostics snapshot first, before anything can fail: host/desktop
			// tooling always finds `window.__DSH_DREAM_SKIN_STATUS__` once apply ran
			// (the drift probe later fills in `anchors`; skin switches refresh it).
			publishStatus();
			// Register the curated skins, YIELDING on an id collision instead of
			// throwing (blue-team R19). The host's ThemeRuntime.register throws on a
			// duplicate id (`theme "x" is already registered`), and our ids are
			// common words (mist, rose, ember, ivory…) that a third-party theme
			// plugin can plausibly take first. This call is NOT covered by the
			// factory-level dumb-module fallback (that only guards seed resolution),
			// so an unguarded throw here would escape apply(). Yielding degrades the
			// worst case to "one skin missing" — and the user still keeps their own
			// selection, since we only skip registration.
			const takenThemeIds = new Set(
				((ctx.theme.getTheme() || {}).themes || []).map((themeDefinition) => themeDefinition && themeDefinition.id)
			);
			const disposers = [];
			for (const skinDefinition of SKINS) {
				if (takenThemeIds.has(skinDefinition.id)) {
					try { console.warn(`[dsh-dream-skin] skin id "${skinDefinition.id}" is already registered by another plugin — skipping it`); } catch {}
					continue;
				}
				try {
					disposers.push(ctx.theme.register(skinDefinition));
				} catch (err) {
					// Defensive: a host that throws for another reason must not take
					// down the whole shell either.
					try { console.warn(`[dsh-dream-skin] could not register skin "${skinDefinition.id}":`, err && err.message); } catch {}
				}
			}
			ctx.effect(() => () => {
				for (const dispose of disposers) dispose();
			}, "dsh-dream-skin: theme registration");

			// Give DSH's leaf cards (composer, inline warnings, small popovers) a
			// premium liquid-glass material. Safe: these are not ancestors of any
			// fixed dialog, so it cannot re-trigger the settings-modal trapping bug.
			ensureMaterialStyle(ctx);

			// T9: claim the page-scope nav-icon hook for THIS generation of the
			// fiber. `navGeneration` is an identity token, not a value — teardown
			// hands the same token back to disposeNavHook. See armNavHook /
			// disposeNavHook above and the generation note in the nav IIFE.
			const navGeneration = {};
			armNavHook(navGeneration);

			// Restore every persisted preference (packs, skin, accent,
			// wallpaper) from the localStorage seed so the first paint is
			// correct; the host state fetched at the end of apply() re-runs
			// this via onHostReady so the durable values win.
			restorePersistedState(ctx);
			// The host ui-theme.preference scope only persists system/light/dark and is
			// adopted asynchronously after load — and RE-adopted on connection reset /
			// settings reload — which can reset a third-party skin restored above.
			// A once-only reassert cannot cover adoptions arriving later or repeated
			// re-adoptions, so use a sticky restore: whenever a saved third-party skin
			// survives while the host falls back to a built-in preference, re-apply it.
			// Writing the saved skin's own theme/change sets preference to the skin id
			// (not built-in), so this never self-triggers. A hard cap stops any
			// pathological adopt-loop. A deliberate Default selection clears the id
			// (via writeSavedSkin -> writeStorage key=null) before the deferred
			// callback reads it, so nothing is restored after an explicit reset.
			let skinRestoreCount = 0;
			const MAX_SKIN_RESTORES = 8;
			let restoreTimer = null;
			const restoreSavedSkin = () => {
				if (skinRestoreCount >= MAX_SKIN_RESTORES) return;
				const savedSkin = readSavedSkin();
				if (typeof savedSkin !== "string" || savedSkin === DEFAULT_SKIN) return;
				const known = SKINS.some((skinDefinition) => skinDefinition.id === savedSkin) || importedPacks.some((p) => p.id === savedSkin);
				if (!known) return;
				const current = ctx.theme.getTheme().preference;
				if (current === savedSkin) {
					// already in effect — reset the budget so an isolated adoption
					// later is still honored; the count is about consecutive failures.
					skinRestoreCount = 0;
					return;
				}
				if (current === "system" || current === "light" || current === "dark") {
					skinRestoreCount += 1;
					// Count the attempt before setTheme(): ThemeRuntime publishes the
					// successful saved-skin theme/change synchronously, and that event
					// resets this consecutive-failure budget below.
					ctx.theme.setTheme(savedSkin);
				}
			};
			const scheduleSkinRestore = () => {
				if (restoreTimer !== null) clearTimeout(restoreTimer);
				restoreTimer = setTimeout(restoreSavedSkin, 0);
			};
			restoreSavedSkin();
			// Built-in preference durability (issue #11): DSH persists the built-in
			// theme only to the host settings file for LOOPBACK browsers; a remote
			// browser keeps `ui-theme.preference` process-local, so a client reload /
			// agent-preset change resets a concrete `dark`/`light` choice back to
			// `system`. We keep our own copy (BUILTIN_LAST_KEY) and re-apply it on a
			// fallback to `system` that arrives in the boot/reset window right after
			// this plugin (re)mounts — the agent-preset-reload shape — while treating
			// a `system` switch that happens later, in a settled session, as an
			// explicit user choice that clears the record.
			let builtinSettled = false;
			let builtinSettleTimer = null;
			const BUILTIN_SETTLE_MS = 2000;
			// A `connection/reset` (which DSH fires when the client transport
			// re-adopts settings, e.g. after an agent-preset change) re-loads the
			// ui-theme scope and can reset a remote browser's process-local built-in
			// preference. Treat a `system` fallback that lands shortly after a reset
			// as a reset, not a deliberate choice.
			let resetPending = false;
			let resetTimer = null;
			const RESET_GRACE_MS = 2000;
			const settleBuiltin = () => {
				if (builtinSettleTimer !== null) clearTimeout(builtinSettleTimer);
				builtinSettleTimer = setTimeout(() => {
					builtinSettleTimer = null;
					builtinSettled = true;
				}, BUILTIN_SETTLE_MS);
			};
			const disarmReset = () => {
				resetPending = false;
				if (resetTimer !== null) { clearTimeout(resetTimer); resetTimer = null; }
			};
			const onBuiltinChange = (snapshot) => {
				const pref = snapshot.preference;
				if (pref === "light" || pref === "dark") {
					// A concrete built-in preference is a deliberate choice (the default
					// is `system`) — record it so a later reload can restore it.
					writeBuiltinLast(pref);
					settleBuiltin();
					return;
				}
				// pref === "system"
				if (readSavedSkinValid()) return; // third-party skin active
				const builtinLast = readBuiltinLast();
				if (builtinLast === null) return;
				if (!builtinSettled || resetPending) {
					// Reset/boot window — this `system` is an adoption reset, not a user
					// choice. Re-apply the recorded concrete preference.
					if (ctx.theme.getTheme().preference !== builtinLast) {
						ctx.theme.setTheme(builtinLast);
						disarmReset();
						settleBuiltin();
					}
				} else {
					// Settled, no reset — the user explicitly chose "system"/"follow OS";
					// drop the stale record so a future reload stays on `system`.
					writeBuiltinLast(null);
				}
			};
			// connection/reset re-arms the "this is a reset" window. Guarded: older /
			// test contexts may not provide the `connection` service, so only subscribe
			// when the event channel exists.
			try {
				ctx.on("connection/reset", () => {
					disarmReset();
					resetPending = true;
					resetTimer = setTimeout(disarmReset, RESET_GRACE_MS);
				});
			} catch {
				// connection service absent — fall back to the settle-window heuristic only
			}
			ctx.on("theme/change", (snapshot) => {
				const savedSkin = readSavedSkin();
				const builtIn = snapshot.preference === "system" || snapshot.preference === "light" || snapshot.preference === "dark";
				if (typeof savedSkin === "string" && savedSkin !== DEFAULT_SKIN) {
					if (snapshot.preference === savedSkin) {
						// A successful restore ends the failure streak. Without this reset,
						// ordinary locale reloads consume the lifetime cap and the ninth
						// reload permanently falls back to Default (issue #36).
						skinRestoreCount = 0;
					} else if (builtIn) {
						scheduleSkinRestore();
					}
				}
				onBuiltinChange(snapshot);
			});
			settleBuiltin();
			disarmReset();
			scheduleSkinRestore();
			ctx.effect(() => () => {
				if (restoreTimer !== null) clearTimeout(restoreTimer);
				if (builtinSettleTimer !== null) clearTimeout(builtinSettleTimer);
				if (resetTimer !== null) clearTimeout(resetTimer);
				// Adversarial-review F4: stop the composer marker's poll timer and
				// disconnect its MutationObserver on teardown instead of leaking.
				if (typeof composerMarkerDispose === "function") {
					try { composerMarkerDispose(); } catch {}
				}
			}, "dsh-dream-skin: sticky skin + built-in restore");
			// Wallpaper bookkeeping. The store revision counter and the sync
			// function live at module scope (see above) so module-level helpers
			// (removeWallpaper / setWallpaperKind) can refresh the row store too;
			// here we only create the store — the persisted wallpaper itself was
			// already applied by restorePersistedState() above.
			const wallpaperStore = createWallpaperStore();
			ctx.effect(() => () => {
				teardownWallpaper();
				teardownMaterial();
				// T9: release the nav-icon hook if this generation still owns it.
				disposeNavHook(navGeneration);
				disposeAllPacks();
				popupTokenOverrides = {};
				accentTokenOverrides = {};
				wallpaperTokenOverrides = {};
				combinedOverrideDispose?.();
				combinedOverrideDispose = null;
			}, "dsh-dream-skin: wallpaper + material + nav + packs cleanup");

			const skinStore = createSkinStore();
			let skinBound;
			// Monotonic revision for the skin slot store. Using a locally incrementing
			// counter (instead of the host theme revision) guarantees the store ALWAYS
			// updates on every click — even if theme/change timing races or the host
			// revision doesn't bump as expected — so the selected card follows instantly.
			let skinRevision = 0;
			let wallpaperReshadeTimer = null;
			// Issue #67: deferred popup-fill re-resolve timer for the no-wallpaper
			// path of syncSkin below.
			let popupReshadeTimer = null;
			const syncSkinWith = (id) => {
				skinBound?.sync(id, ++skinRevision);
				// Do NOT re-shade the wallpaper here (issue #29): right after
				// ctx.theme.setTheme(id), the theme snapshot's `active` is not yet the
				// target skin, so shadeTokens2 -> resolveBase/sidebar cannot find the
				// target tokens and falls back to BUILTIN_BASE[scheme] (white for light),
				// writing a wrong wash (e.g. rgba(255,255,255,.8)) that persists until
				// refresh. The correct re-shade is deferred to the theme/change listener
				// (syncSkin), whose snapshot.active is already the settled target skin.
				// When this skin also swaps in a built-in glow gradient, setWallpaperKind
				// re-applies the wallpaper right after, so nothing is left stale.
			};
			const syncSkin = (snapshot) => {
				skinBound?.sync(snapshot.preference, ++skinRevision);
				// Issue #80: the glass constants follow the SKIN's scheme, so the
				// root attribute has to move on every theme/change. Synchronous and
				// FIRST — the deferred wallpaper re-shade below would otherwise
				// leave one frame painting the new skin with the old scheme's rim.
				applySchemeAttr(ctx, snapshot);
				// Theme events are synchronous. Re-shading inside this listener publishes a
				// nested theme/change; a presenter registered after us can then apply the
				// outer (pre-shade) snapshot last, leaving the wallpaper one skin behind.
				// Run after the current event stack instead. Events emitted by our own
				// override happen while _applyingWallpaper is true and must not enqueue a
				// second pass.
				// Issue #67: re-resolve the popup fills for the SETTLED skin here too —
				// applyModalOverlay bakes the active skin's colors (incl. layer-2) into
				// popupTokenOverrides, and without this a skin switch left the dialogs on
				// the previous skin's palette until the next slider move or reload. Both
				// re-resolves publish under the _applyingWallpaper guard: the host's
				// overrideTokens() emits theme/change on EVERY publish, so an unguarded
				// publish would re-enter syncSkin and loop forever.
				if (wallpaperBackgroundCss() !== null && !_applyingWallpaper) {
					if (wallpaperReshadeTimer !== null) clearTimeout(wallpaperReshadeTimer);
					wallpaperReshadeTimer = setTimeout(() => {
						wallpaperReshadeTimer = null;
						applyWallpaper2(ctx, ctx.theme.getTheme());
						_applyingWallpaper = true;
						try { applyModalOverlay(ctx); } finally { _applyingWallpaper = false; }
					}, 0);
				} else if (wallpaperBackgroundCss() === null && !_applyingWallpaper) {
					// No wash live: still re-resolve, deferred like the reshade above so
					// a later-registered presenter never re-applies the outer (pre-
					// override) snapshot after ours.
					if (popupReshadeTimer !== null) clearTimeout(popupReshadeTimer);
					popupReshadeTimer = setTimeout(() => {
						popupReshadeTimer = null;
						_applyingWallpaper = true;
						try { applyModalOverlay(ctx); } finally { _applyingWallpaper = false; }
					}, 0);
				}
			};
			ctx.on("theme/change", syncSkin);
			ctx.effect(() => () => {
				if (wallpaperReshadeTimer !== null) clearTimeout(wallpaperReshadeTimer);
				if (popupReshadeTimer !== null) clearTimeout(popupReshadeTimer);
			}, "dsh-dream-skin: deferred wallpaper re-shade");
			// Keep the Accent row's base color (the active theme's brand color) in
			// sync when the skin/scheme changes — otherwise a row with no custom
			// accent keeps showing the PREVIOUS skin's brand color until remount.
			ctx.on("theme/change", (snapshot) => {
				accentBound?.sync(
					readAccent() || DEFAULT_ACCENT,
					resolveAccent(snapshot) || DEFAULT_ACCENT,
					++accentRevision
				);
			});

			ctx.effect(() => ctx.locale.register(SETTINGS_NS, {
				zh,
				en,
				ja,
				ko,
				es,
				fr,
				de,
				ru
			}), "dsh-dream-skin: settings row dictionaries");

			// Bound translator for non-React code paths (import/remove alerts), so
			// user-facing messages follow the active locale instead of hardcoded text.
			// Fall back to an identity translator when the locale service has no
			// bind() (or registered dictionaries arrive later) — alerts must never
			// take the whole settings section down.
			const localeT = typeof ctx.locale?.bind === "function"
				? ctx.locale.bind(SETTINGS_NS)
				: (key) => key;

			const skinInjected = (actions) => {
				skinBound = actions;
				syncSkin(ctx.theme.getTheme());
				return {
					setSkin: (id) => {
						// Persist first: theme/change is synchronous. Wallpaper re-shading
						// must see the new selection (and Default must already have cleared
						// the old skin) while that event is being handled.
						writeSavedSkin(id);
						ctx.theme.setTheme(id);
						// Deterministically push the new preference into the slot store AND
						// re-shade the wallpaper so the selected card follows immediately,
						// independent of theme/change emission timing.
						syncSkinWith(id);
						// Every skin carries its own matching diffused-glow background.
						// When the wallpaper "follows the skin" (either it's already the
						// built-in glow, or the user has not set a custom wallpaper yet),
						// swapping skins swaps the background to the new skin's gradient.
						// A user-set custom wallpaper is never clobbered.
						const gradient = wallpapersSuggestionsFor(id);
						if (gradient && (followsSkin() || !userSetWallpaper())) {
							setWallpaperKind(ctx, "gradient", gradient);
							writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "1");
						}
						// Each skin ships its own wash / glass / dialog numbers.
						// Retune only the ones the user has not made their own,
						// then repaint: the new numbers are invisible until the
						// wallpaper, the glass blur, the composer fill and the
						// dialog fill are all re-published.
						applySkinDefaults(id);
						applyWallpaper2(ctx);
						applyMaterialBlur();
						applyComposerOpacity();
						applyModalOpacity();
						syncWallpaper();
						syncGlass();
					}
				};
			};
			// Register our own "Theme / 外观" settings section. It appears in the
			// settings left-nav and hosts all skin features (skin, wallpaper,
			// advanced wallpaper, accent, theme packs) under a single category.
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "dream-skin",
				order: 10,
				label: "Theme / 外观",
				locale: SETTINGS_NS,
				children: { "settings.dreamSkin.item": {
					kind: "list",
					scope: "root"
				} }
			}, DreamSkinSection));

			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin",
				order: 20,
				store: skinStore,
				locale: SETTINGS_NS,
				inject: skinInjected
			}, SkinRow));

			const wallpaperInjected = (actions) => {
				wallpaperBound = actions;
				syncWallpaper();
				return {
					setWallpaper: (url) => {
						// A locally picked image switches the wallpaper back to the image
						// kind — otherwise a previously set gradient/URL would keep
						// winning in wallpaperBackgroundCss() and the preview would lie.
						writeStorage(WALLPAPER_KIND_KEY, "image");
						writeStorage(WALLPAPER_KEY, url);
						// A user-picked image is a custom wallpaper: it no longer follows
						// the skin, so switching skins must not swap it away.
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
						pushWallpaperHistory("image", url);
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setWallpaperUrl: (url) => {
						setWallpaperKind(ctx, "url", url && url.length > 4 ? url : null);
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
					},
					setWallpaperGradient: (gradient) => {
						setWallpaperKind(ctx, "gradient", gradient && gradient.length > 4 ? gradient : null);
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
					},
					setWallpaperKind,
					setOpacity: (percent) => {
						const value = Math.min(1, Math.max(0, percent / 100));
						writeStorage(WALLPAPER_OPACITY_KEY, String(value));
						// A slider move is a fine-tune WITHIN the chosen material —
						// same rule as GlassRow: the material chips stay put.
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setSidebarOpacity: (percent) => {
						writeSidebarOpacityForSlider(percent);
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setSidebarLink: (linked) => {
						writeStorage(SIDEBAR_LINK_KEY, linked ? "1" : "0");
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setBlur: (px) => {
						const value = Math.min(60, Math.max(0, px));
						writeStorage(WALLPAPER_BLUR_KEY, String(value));
						applyWallpaper2(ctx);
						// Keep the glass surfaces in step with the wallpaper slider
						// (the blur key feeds the wallpaper filter AND GLASS_BLUR_VAR
						// via applyMaterialBlur — refresh it so both stay live).
						applyMaterialBlur();
						syncWallpaper();
					},
					setAutodim: (on) => {
						writeWallpaperAutodim(!!on);
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					applyFromHistory: (kind, value) => {
						const resolvedKind = kind === "gradient" || kind === "url" ? kind : "image";
						if (value && value.length > 4) {
							setWallpaperKind(ctx, resolvedKind, value);
							// Applying from recent history is a user choice, so it does
							// not follow the skin on later switches.
							writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
						} else {
							syncWallpaper();
						}
					},
					clearWallpaper: () => {
						removeWallpaper(ctx);
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-wallpaper",
				order: 30,
				store: wallpaperStore,
				locale: SETTINGS_NS,
				inject: wallpaperInjected
			}, WallpaperRow));

			// P0: advanced wallpaper row (kind url / gradient / autodim).
			const advWallpaperStore = createAdvancedWallpaperStore();
			let advWallpaperBound;
			let advWallpaperRevision = 0;
			const syncAdvWallpaper = () => {
				advWallpaperBound?.sync(
					readWallpaperKind(),
					readWallpaperUrl(),
					readWallpaperGradient(),
					readWallpaperAutodim(),
					readWallpaperRefreshConfig().on,
					readWallpaperRefreshConfig().hours,
					readWallpaperFit(),
					++advWallpaperRevision
				);
			};
			const advWallpaperInjected = (actions) => {
				advWallpaperBound = actions;
				syncAdvWallpaper();
				// Scheduled refresh (issue #45) is owned by the module-scope
				// scheduler (see startWallpaperRefreshScheduler) so it survives a
				// closed settings panel; these actions only (re)arm it.
				return {
					setKind: (kind) => {
						if (kind !== "image" && kind !== "url" && kind !== "gradient") return;
						writeStorage(WALLPAPER_KIND_KEY, kind);
						applyWallpaper2(ctx);
						syncAdvWallpaper();
						startWallpaperRefreshScheduler(ctx);
					},
					setUrl: (url) => {
						const raw = typeof url === "string" ? url.trim() : "";
						// Mis-click guard (R13): the URL box is uncontrolled (defaultValue),
						// so a stray "Apply" click sends "". Nothing to apply must change
						// NOTHING — not the stored URL, not the kind. This branch used to
						// write kind="url" with a null value when no URL was stored yet, and
						// the url kind paints nothing without a value. What the author
						// actually observed on his own machine was that end state: a blank
						// background, because the kind had been left on「图片链接」with an
						// empty box — not a wallpaper that got deleted. Clearing has its own
						// button (clearAll / "清除壁纸").
						if (raw === "" || raw.length <= 4) return;
						if (!isSafeWallpaperUrl(raw)) {
							try { window.alert(localeT("bg2.urlInvalid")); } catch {}
							return;
						}
						// Store the clean URL: any `t=<ms>` stamp (from this plugin
						// or a pasted link) is stripped so persisted state never
						// carries cache-busting noise (R6).
						const clean = stripWallpaperBust(raw);
						// Issue #61: an explicit "apply link" is a request to fetch that
						// link NOW. Without a fresh stamp the rendered CSS is byte-identical
						// to the previous one and the browser answers from cache, so
						// re-applying (e.g. a daily-wallpaper API that has just rolled over)
						// did nothing until a page reload. Bumping `lastFiredAt` also
						// re-phases the schedule, which is the honest reading: we just
						// fetched, so the next automatic one is a full interval away.
						// ORDER MATTERS: `setWallpaperKind` is what paints, and the paint
						// reads `lastFiredAt` to decide the cache-buster — stamping after it
						// would leave the click rendering the very request the cache already
						// holds (the shape of the original bug, caught by the smoke test).
						const prev = readWallpaperRefreshConfig();
						const stamp = Math.round(Date.now());
						writeWallpaperRefreshConfig({ on: prev.on, hours: prev.hours, lastFiredAt: stamp });
						setWallpaperKind(ctx, "url", clean);
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
						syncAdvWallpaper();
						startWallpaperRefreshScheduler(ctx);
						// Best-effort preload check: a dead link gets a one-shot
						// notice instead of silently showing nothing. Probe the exact
						// URL that will render (same rule as the scheduler, review P3).
						const probe = new Image();
						probe.onerror = () => { try { window.alert(localeT("bg2.urlLoadFailed")); } catch {} };
						probe.src = stampedWallpaperUrl(clean, stamp);
					},
					setGradient: (gradient) => {
						setWallpaperKind(ctx, "gradient", gradient && gradient.length > 4 ? gradient : null);
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
						syncAdvWallpaper();
					},
					setAutodim: (on) => {
						writeWallpaperAutodim(!!on);
						applyWallpaper2(ctx);
						syncAdvWallpaper();
					},
					setFit: (fit) => {
						// Whitelist before persisting: a hand-edited state file must not
						// be able to smuggle an arbitrary CSS value into background-size.
						if (!WALLPAPER_FIT_VALUES.includes(fit)) return;
						writeStorage(WALLPAPER_FIT_KEY, fit);
						applyWallpaper2(ctx);
						syncAdvWallpaper();
					},
					setRefresh: (on, hours) => {
						const cfg = readWallpaperRefreshConfig();
						const hoursNext = Number.isFinite(Number(hours)) ? Number(hours) : cfg.hours;
						// Validate BEFORE persisting (third-party review T2): the alert
						// used to fire after the config was already written, so a refused
						// toggle still landed as `on:1` in storage.
						if (on && readWallpaperKind() !== "url") {
							// Nothing to refresh yet — the user must pick a URL kind first.
							try { window.alert(localeT("bg2.refreshUrlOnly")); } catch {}
							syncAdvWallpaper();
							return;
						}
						writeWallpaperRefreshConfig({ on: !!on, hours: hoursNext });
						startWallpaperRefreshScheduler(ctx);
						syncAdvWallpaper();
					},
					clearAll: () => {
						removeWallpaper(ctx);
						stopWallpaperRefreshScheduler();
						// "Clear wallpaper" returns the whole feature to its default
						// state: dropping the stored config (rather than writing a
						// default one) also sidesteps the writer's "keep previous
						// lastFiredAt" rule, so a NEW wallpaper can never inherit the
						// deleted one's phase and fire immediately (third-party T3).
						writeStorage(WALLPAPER_REFRESH_KEY, null);
						syncAdvWallpaper();
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-wallpaper-advanced",
				order: 32,
				store: advWallpaperStore,
				locale: SETTINGS_NS,
				inject: advWallpaperInjected
			}, WallpaperAdvancedRow));

			// Glass-effect row (统一「玻璃效果」组): material presets + every
			// opacity/blur slider in ONE group so the translucency controls are
			// never scattered across the section (cognitive-cost review).
			const glassStore = createGlassStore();
			let glassBound;
			let glassRevision = 0;
			const syncGlass = () => {
				glassBound?.sync(
					readWallpaperOpacity(),
					readWallpaperBlur(),
					readSidebarOpacity(),
					readComposerOpacity(),
					readModalOpacity(),
					readMaterialPreset(),
					++glassRevision
				);
			};
			const glassInjected = (actions) => {
				glassBound = actions;
				syncGlass();
				return {
					setMaterialPreset: (id) => {
						const preset = MATERIAL_PRESETS.find((p) => p.id === id);
						if (!preset) return;
						// Round-5 semantics (user decision): the material chip is a PURE
						// STYLE switch — it only changes the material character (the
						// glass look / blur character). It must NEVER touch the slider
						// numbers: whatever the user tuned stays until they tune it.
						// The blur knob owns the blur; the material just applies its
						// character on top (applyMaterialBlur reads the slider value).
						writeMaterialPreset(id);
						applyMaterialBlur();
						// Issue #67 follow-up: the published composer fill weight is
						// material-remapped now, so re-publish it when the material
						// identity changes. Slider numbers stay put (round-5
						// semantics — the chip never touches them).
						applyComposerOpacity();
						syncGlass();
					},
					setOpacity: (percent) => {
						const value = Math.min(1, Math.max(0, percent / 100));
						writeStorage(WALLPAPER_OPACITY_KEY, String(value));
						// A slider move is a fine-tune WITHIN the chosen material — the
						// material chips stay put (frosted remains frosted); only the
						// numbers drift. Two materials, no third "clear" state.
						applyWallpaper2(ctx);
						syncWallpaper();
						syncGlass();
					},
					setBlur: (px) => {
						const value = Math.min(60, Math.max(0, px));
						writeStorage(WALLPAPER_BLUR_KEY, String(value));
						applyWallpaper2(ctx);
						// Blur also feeds the live glass blur (composer / popups).
						applyMaterialBlur();
						syncWallpaper();
						syncGlass();
					},
					setSidebarOpacity: (percent) => {
						writeSidebarOpacityForSlider(percent);
						applyWallpaper2(ctx);
						syncWallpaper();
						syncGlass();
					},
					setSidebarLink: (linked) => {
						writeStorage(SIDEBAR_LINK_KEY, linked ? "1" : "0");
						applyWallpaper2(ctx);
						syncWallpaper();
						syncGlass();
					},
					setComposerOpacity: (percent) => {
						writeComposerOpacity(percent / 100);
						applyComposerOpacity();
						syncGlass();
					},
					setModalOpacity: (percent) => {
						const clamped = writeModalOpacity(percent / 100);
						applyModalOpacity();
						applyModalOverlay(ctx);
						modalOpacityBound?.sync(clamped, ++modalOpacityRevision);
						syncGlass();
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-glass",
				order: 31,
				store: glassStore,
				locale: SETTINGS_NS,
				inject: glassInjected
			}, GlassRow));

			// Popup / option-card fill opacity row (legacy slot): the slider lives in
			// the glass row above; this keeps the modal store binding alive so the
			// shared setModalOpacity action can refresh it without remounting.
			const modalOpacityStore = createModalOpacityStore();
			let modalOpacityBound;
			let modalOpacityRevision = 0;
			const syncModalOpacity = () => {
				modalOpacityBound?.sync(readModalOpacity(), ++modalOpacityRevision);
			};
			// Issue #100: the wash, not the slider, decides whether the readability floor
			// is clamping this channel — so adding or removing a wallpaper has to re-render
			// the row. Both rows are otherwise only synced by their own actions, which means
			// a wallpaper cleared from the Wallpaper row would leave the 弹窗滑杆 still
			// claiming the floor applies.
			const washFlipHook = () => { syncGlass(); syncModalOpacity(); };
			onWashFlip = washFlipHook;
			// Clear only if the hook is still OURS: a re-`apply()` replaces it with the new
			// generation's closures, and an old generation tearing down afterwards must not
			// disarm the live one (the same identity discipline the nav hook uses).
			ctx.effect(() => () => { if (onWashFlip === washFlipHook) onWashFlip = null; }, "dsh-dream-skin: wash-flip hook");
			const modalOpacityInjected = (actions) => {
				modalOpacityBound = actions;
				syncModalOpacity();
				return {
					// Legacy action kept for compatibility (older tests / external
					// callers): forwards to the same shared logic the glass row uses,
					// INCLUDING the glass-store sync so both sliders stay in step.
					setOpacity: (percent) => {
						const clamped = writeModalOpacity(percent / 100);
						applyModalOpacity();
						applyModalOverlay(ctx);
						modalOpacityBound?.sync(clamped, ++modalOpacityRevision);
						syncGlass();
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-modal-opacity",
				order: 33,
				store: modalOpacityStore,
				locale: SETTINGS_NS,
				inject: modalOpacityInjected
			}, () => null));

			// P0: per-user accent override row.
			const accentStore = createAccentStore();
			let accentBound;
			let accentRevision = 0;
			const accentInjected = (actions) => {
				accentBound = actions;
				const base = resolveAccent(ctx.theme.getTheme()) || DEFAULT_ACCENT;
				// First sync must pass the store guard (`revision <= d.revision` rejects
				// when init revision is -1), so use the same monotonic counter as the
				// user actions — otherwise a saved accent never reaches the row UI on reload.
				accentBound?.sync(readAccent() || DEFAULT_ACCENT, base, ++accentRevision);
				return {
					setAccent: (value) => {
						const applied = setAccent(ctx, value === DEFAULT_ACCENT ? null : value);
						accentBound?.sync(
							applied || DEFAULT_ACCENT,
							resolveAccent(ctx.theme.getTheme()) || DEFAULT_ACCENT,
							++accentRevision
						);
					},
					clearAccent: () => {
						setAccent(ctx, null);
						accentBound?.sync(
							DEFAULT_ACCENT,
							resolveAccent(ctx.theme.getTheme()) || DEFAULT_ACCENT,
							++accentRevision
						);
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-accent",
				order: 25,
				store: accentStore,
				locale: SETTINGS_NS,
				inject: accentInjected
			}, AccentRow));

			// P0: theme-pack library + favorites + surprise-me row.
			const packStore = createPackStore();
			let packBound;
			let packRevision = 0;
			const syncPack = () => {
				const current = ctx.theme.getTheme().preference;
				// Carry a name lookup so the pack library renders manifest.name instead
				// of the raw `dream-pack:` id on each card.
				const names = {};
				for (const p of importedPacks) if (p && p.id) names[p.id] = p.manifest?.name || p.id;
				packBound?.sync(importedPacks.map((p) => p.id), names, readFavorites(), current, wallpapersSuggestionsFor(current), ++packRevision);
			};
			const refreshSurprise = () => {
				const id = randomThemeId(ctx.theme.getTheme().preference);
				if (id !== null) {
					ctx.theme.setTheme(id);
					writeSavedSkin(id);
				}
				syncPack();
				syncSkin(ctx.theme.getTheme());
			};
			const packInjected = (actions) => {
				packBound = actions;
				syncPack();
				return {
					applyId: (id) => {
						ctx.theme.setTheme(id);
						writeSavedSkin(id);
						syncPack();
						syncSkin(ctx.theme.getTheme());
					},
					toggleFavorite: (id) => {
						toggleFavorite(id);
						syncPack();
					},
					removePack: (id) => {
						const name = unimportPack(ctx, id);
						syncPack();
						syncSkin(ctx.theme.getTheme());
						if (name) { try { window.alert(localeT("packs.removed", { name })); } catch {} }
					},
					surprise: refreshSurprise
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-packs",
				order: 40,
				store: packStore,
				locale: SETTINGS_NS,
				inject: packInjected
			}, PacksRow));

			// Wire the shared "import a file" handler exposed to PacksRow via a
			// small module-level hook (the file input lives in the row component).
			packsImportHandler = (_ignoredCtx, data) => {
				const validate = (typeof data === "object" && data !== null) ? validatePack(data) : { ok: false, errors: ["invalid JSON or empty pack"] };
				if (!validate.ok) {
					try { window.alert(localeT("packs.rejected", { errors: (validate.errors || []).join("\n") })); } catch {}
					return { ok: false };
				}
				// A manifest whose id is a BUILT-IN skin (typical source: our own
				// "导出主题包文件" for a built-in skin) must NOT be imported as a
				// frozen dream-pack:<id> copy — same rule as the hash path. The
				// skin is already registered locally: just select it.
				if (validate.manifest && SKINS.some((skin) => skin.id === validate.manifest.id)) {
					const skinId = validate.manifest.id;
					// Switch OUTSIDE the try: a failed setTheme must not be reported
					// as a successful import (blue-team F2).
					let switched = false;
					try {
						if (ctx.theme.getTheme().preference !== skinId) ctx.theme.setTheme(skinId);
						writeSavedSkin(skinId);
						syncSkin(ctx.theme.getTheme());
						syncPack();
						switched = true;
					} catch {}
					try { window.alert(localeT("packs.imported", { name: skinId })); } catch {}
					return switched ? { ok: true, name: skinId } : { ok: false, error: "theme switch failed" };
				}
				const result = importPack(ctx, validate);
				try {
					if (!result.ok) window.alert(localeT("packs.importFailed", { error: result.error }));
					else { syncPack(); window.alert(localeT("packs.imported", { name: result.name })); }
				} catch {}
				return result;
			};
			packExporter = (id) => exportPackAsFile(ctx, id);
			packShare = (id) => packShareUrl(id);

			// Scheduled URL-wallpaper refresh (issue #45): armed from apply() so it
			// is independent of whether the settings panel is open (blue-team R5),
			// and torn down with the fiber on unmount / plugin re-apply.
			refreshNotify = () => { try { syncAdvWallpaper(); } catch {} };
			startWallpaperRefreshScheduler(ctx);
			ctx.effect(() => () => {
				stopWallpaperRefreshScheduler();
				refreshNotify = null;
			}, "dsh-dream-skin: wallpaper refresh scheduler");

			// Host-backed persistence: fetch the durable state ($DSH_HOME/
			// dream-skin.json) and re-apply it once it arrives, so the saved
			// skin / wallpaper / accent / packs survive the desktop app's
			// per-launch random port (which changes the origin and would
			// otherwise orphan the localStorage copy).
			onHostReady = () => restorePersistedState(ctx);
			loadFromHost();
			// B-4: apply() ran to completion — only now may the snapshot say
			// "ready". The async host adoption re-publishes later and inherits
			// this flag (publishStatus merges, never retracts).
			applyCompleted = true;
			publishStatus();
		}
		//#endregion

		exports.SETTINGS_NS = SETTINGS_NS;
		exports.SKINS = SKINS;
		exports.DEFAULT_SKIN = DEFAULT_SKIN;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

/* [调色板/绘画板 (Lucide palette classic)] settings nav 齿轮替换 — 与 dsh-memory/dsh-achievements 同款图标库方案 */
/* Blue-team B4: this IIFE sits OUTSIDE the loader's downgrade path — a throw
 * here would surface as "entries did not activate" and take down the web
 * shell. It is cosmetic, so ANY failure is swallowed: head/body may not exist
 * yet (script injected before <body> parses), MutationObserver may be
 * unavailable in stripped webviews. */
;(function () {
  try {
  var MARKER = "data-dsh-dream-skin-nav"
  var SHEET_ID = "dsh-dream-skin-nav-icon"
  var NAV_STATUS_KEY = "__DSH_DREAM_SKIN_NAV__"
  // T7 (adversarial review 10.5.0): the ONLY nav row this hook may paint is the
  // settings section THIS plugin registers — keyed by its FULL label string
  // (`label: "Theme / 外观"`, see the settings.section registration in the
  // factory). Substring/marker games painted rows we never declared; see the
  // matcher's own comment below for the measured walk-ons.
  var NAV_ROW_LABEL = "Theme / 外观"
  var mask = "%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'24'%20height%3D'24'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'black'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Ccircle%20cx%3D%2213.5%22%20cy%3D%226.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%2217.5%22%20cy%3D%2210.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%228.5%22%20cy%3D%227.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%226.5%22%20cy%3D%2212.5%22%20r%3D%221.05%22%2F%3E%3Cpath%20d%3D'M12%202C6.5%202%202%206.5%202%2012s4.5%2010%2010%2010c.926%200%201.648-.746%201.648-1.688%200-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64%201.64%200%200%201%201.668-1.668h1.996c3.051%200%205.555-2.503%205.555-5.554C21.965%206.012%2017.461%202%2012%202z'%2F%3E%3C%2Fsvg%3E"
  var css = "[" + MARKER + "] > svg:first-child{display:none}" +
    "[" + MARKER + "]::before{content:\"\";flex:none;width:16px;height:16px;background:currentColor;" +
    "-webkit-mask:url(\"data:image/svg+xml," + mask + "\") center/contain no-repeat;" +
    "mask:url(\"data:image/svg+xml," + mask + "\") center/contain no-repeat}"
  // Idempotent + self-reporting (10.5.0 pre-release audit, hardened by the
  // blue-team pass). A bundle evaluated twice on a long-lived page used to append a
  // SECOND identical sheet and install a SECOND body observer (measured live: two
  // style#dsh-dream-skin-nav-icon nodes). The lock cannot live on the sheet node:
  // node-scoped flags broke in both directions — replace the node and the next copy
  // armed a second observer while `sheets` still read 1 (B3), and a copy that ran
  // before <body> existed claimed the flag WITHOUT arming anything, so the icon
  // stayed un-replaced for the rest of the page's life while the report looked
  // exactly like "settings panel closed" (B1). The lock is therefore the published
  // `armed` flag on the window-level report, and it is set only once an observer is
  // really installed — the owning copy watches document.body, so it keeps working
  // even when our sheet node gets replaced.
  var owned = false
  // T9 (adversarial review 10.5.0): teardown / re-arm control for the fiber.
  // `generation` is the identity of the copy currently claiming the hook —
  // arm(gen) stamps it (first line, before ANY early return), dispose(gen)
  // refuses to tear down unless the caller still holds it. That is what keeps
  // a hot reload's order B ("new copy applied first, old fiber unloads
  // second") from killing a live hook: the new generation's arm() call lands
  // on the surviving copy (through the published handles) and re-stamps it, so
  // the old copy's stale dispose no-ops. dclHandler/mo/sheetEl/markedEls are
  // the residue handles dispose needs; all page-scope, none exported.
  var generation = null
  var dclHandler = null
  var mo = null
  var sheetEl = null
  var markedEls = []
  function publishedState() {
    try { return window[NAV_STATUS_KEY] || null } catch { return null }
  }
  function report(dialogs, buttons, marked) {
    try {
      var sheets = 0
      try { sheets = document.querySelectorAll("style#" + SHEET_ID).length; } catch {}
      var snapshot = {
        sheets: sheets, dialogs: dialogs, buttons: buttons, marked: marked,
        // `armed` is what separates "this page has no hook" from "the panel is
        // simply closed"; the counts alone cannot tell those apart.
        armed: owned === true, checkedAt: Date.now()
      }
      // T9: the fiber lifecycle needs to dispose (unload) and re-arm (re-apply)
      // this page-scope hook. The control handles ride THIS published object as
      // NON-ENUMERABLE members: no fourth window global to spend, and
      // Object.keys(…) stays exactly the six counters above, so existing
      // consumers see no change. Both are function declarations below —
      // hoisted, so report() may run before their source position.
      Object.defineProperty(snapshot, "arm", { value: arm, enumerable: false, configurable: true })
      Object.defineProperty(snapshot, "dispose", { value: dispose, enumerable: false, configurable: true })
      window[NAV_STATUS_KEY] = snapshot
    } catch {}
  }
  // The sheet is adopted by id, style elements only, so a foreign node wearing our
  // id is never rewritten (same rule as the material sheet). Extracted into a
  // function (T9) so a dispose→re-arm on one page re-adopts the SAME node instead
  // of stacking a second sheet, and so a re-apply can heal a sheet a host head
  // rebuild removed underneath us.
  function ensureSheet() {
    var style = null
    try {
      var existingSheets = document.querySelectorAll("style#" + SHEET_ID)
      style = existingSheets && existingSheets.length ? existingSheets[0] : null
    } catch { style = null }
    if (style === null) {
      style = document.createElement("style")
      style.id = SHEET_ID
      ;(document.head || document.body).append(style)
    }
    style.textContent = css
    sheetEl = style
  }
  ensureSheet()
  var scheduled = false
  var sync = function () {
    // T9: the ONE live gate of the wake path. A wake queued (rAF or the 120ms
    // fallback) just before dispose must not re-mark or re-report for a dead
    // fiber — and the gate lives HERE only, because a second guard deeper in
    // would absorb a break of this one and mutation testing could not see it
    // (same redundant-door rule as the late-correction observer).
    if (!owned) return
    // Streaming chat mutates the DOM many times a second; a full nav scan per
    // mutation batch was pure cost. Coalesce into one wake per frame.
    scheduled = false
    try {
      var dialogs = 0
      var buttons = 0
      var marked = 0
      var nextMarked = []
      for (var b of document.querySelectorAll("[role=\"dialog\"] nav button")) {
        buttons++
        var label = (b.textContent || "").trim()
        // The match key is the FULL label WE declare for our own settings row —
        // `label: "Theme / 外观"` (see the settings.section registration in the
        // factory; NAV_ROW_LABEL above). Two earlier clauses were walk-ons (L1,
        // re-adjudicated by 10.5.0 T7): a substring test for "Theme" alone also
        // painted rows we never declared — measured live, a third-party
        // `Theme Shop` row — and a bare 「皮肤」 is not ours either: on host
        // 0.2.0-rc.1 that row belongs to another plugin
        // (@linxin666/dsh-client-ui-skin-center, `dsh --profile web --dump-config`).
        // Both painted OUR palette over SOMEONE ELSE'S nav icon and hid their
        // original <svg>. Full-string containment keeps host decorations around
        // our row tolerable while refusing anything that merely shares a word.
        // Trade-off stated plainly: if a future host renders our row without the
        // exact label, we lose the icon (decorative loss, visible as marked:0 &&
        // armed:1) — we never gain a foreign row.
        var mm = label.indexOf(NAV_ROW_LABEL) !== -1
        if (mm) { b.setAttribute(MARKER, ""); marked++; nextMarked.push(b) }
        else b.removeAttribute(MARKER)
      }
      markedEls = nextMarked
      try { dialogs = document.querySelectorAll("[role=\"dialog\"]").length; } catch {}
      report(dialogs, buttons, marked)
    } catch {}
  }
  var wake = function () {
    if (scheduled) return
    scheduled = true
    var run = function () {
      if (!scheduled) return
      scheduled = false
      sync()
    }
    // Paint-synchronous when the page actually gets frames...
    if (typeof requestAnimationFrame === "function") {
      try { requestAnimationFrame(run); } catch {}
    }
    // ... and a timer on top of it, because Chromium stops handing out frames to a
    // hidden or fully occluded window: without this the icon marking AND the
    // self-report would freeze at whatever the last painted frame saw. Note what
    // this does NOT do — it is not a periodic re-check. A page with zero DOM
    // mutations never wakes, so `checkedAt` can legitimately age; that is what the
    // timestamp and `armed` are for. Whichever of the two arrives first clears the
    // flag and the other becomes a no-op.
    try { setTimeout(run, 120); } catch {}
  }
  // T9 teardown: remove everything this copy put on the page — observer, the
  // one-shot DCL recovery, our marks, our sheet — and republish a final
  // `armed:false` snapshot so tooling reads "hook gone", never a stale live
  // count. The generation gate makes stale disposes no-ops (see the state
  // comment at the top of this IIFE); the surviving copy re-stamps `generation`
  // on every arm(gen), so exactly one dispose — the newest generation's — wins.
  function dispose(gen) {
    try {
      if (gen !== generation) return
      generation = null
      owned = false
      if (mo !== null) {
        try { mo.disconnect() } catch {}
        mo = null
      }
      if (dclHandler !== null) {
        try { document.removeEventListener("DOMContentLoaded", dclHandler) } catch {}
        dclHandler = null
      }
      for (var i = 0; i < markedEls.length; i++) {
        try { markedEls[i].removeAttribute(MARKER) } catch {}
      }
      markedEls = []
      if (sheetEl !== null) {
        try { sheetEl.remove() } catch {}
        sheetEl = null
      }
      report(0, 0, 0)
    } catch {}
  }
  function arm(gen) {
    try {
      // Stamp FIRST: even the early-return paths (already-armed page, body
      // missing) must leave THIS generation as the current claim — otherwise
      // the matching dispose would be refused forever and the hook stuck.
      if (gen !== undefined) generation = gen
      if (owned) {
        // Same page, same copy, re-applied (the host can re-enter apply()):
        // just refresh — and heal the sheet in case a head rebuild removed it.
        ensureSheet()
        sync()
        return
      }
      var st = publishedState()
      if (st && st.armed === true) return
      if (!document.body) { report(0, 0, 0); return }
      var moNew = null
      try {
        moNew = new MutationObserver(wake)
        moNew.observe(document.body, { subtree: true, childList: true, characterData: true })
      } catch { moNew = null }
      if (moNew === null) { report(0, 0, 0); return }
      mo = moNew
      owned = true
      ensureSheet()
      sync()
    } catch {}
  }
  arm()
  // A copy that ran before <body> parsed still has to hook the page later, instead
  // of leaving the icon un-replaced for the whole session (the 9.29.0 behaviour).
  // The handle is kept so dispose can DETACH it (T9) — a pending recovery that
  // fired after teardown used to re-arm the hook of an unmounted fiber.
  if (!owned && !document.body) {
    dclHandler = function () { dclHandler = null; arm() }
    try {
      document.addEventListener("DOMContentLoaded", dclHandler, { once: true })
    } catch {}
  }
  } catch {}
})()

