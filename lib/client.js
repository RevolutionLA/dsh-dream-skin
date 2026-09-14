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
		/** Default sidebar wash opacity (0..1) - solid by default for layering. */
		const DEFAULT_SIDEBAR_OPACITY = 1;
		/** localStorage key: link sidebar opacity to the main-canvas wash (default on). */
		const SIDEBAR_LINK_KEY = "dsh-dream-skin:sidebar-link";
		/** Default: sidebar wash opacity follows the main canvas (avoids a split look). */
		const DEFAULT_SIDEBAR_LINK = 1;
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
		 * Fill WEIGHT scale (round-9): the composer slider's fill percentage is
		 * multiplied by this per-material factor. Apple's glass reads "white" via
		 * LIGHT (brightness + a sheen layer), not via fill — a full-weight white
		 * fill just paints a white board. Frosted keeps 1 (tinted skin base wants
		 * the user's full weight); liquid caps at 0.15 so even "0% transparency"
		 * stays a translucent pane.
		 */
		const GLASS_FILL_SCALE_VAR = "--dsh-dream-skin-glass-fill-scale";
		/**
		 * Round-17: liquid glass thickness (px of extra backdrop blur). The
		 * composer slider drives it (0 → 0px, max → +24px) — "more opaque =
		 * thicker glass", the one refraction expression Chromium can actually
		 * render. Consumed only by the liquid ::before rule.
		 */
		const LIQUID_THICKNESS_VAR = "--dsh-dream-skin-liquid-thickness";
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
				// Neutral WHITE fill at a LOW cap (round-12: 0.45 still board-white
				// once the user lowers transparency — three white layers stacked:
				// fill + sheen + brightness lift buried the refraction). 0.15 keeps
				// just a breath of white; the glass READ comes from the refraction.
				tint: "#ffffff",
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
		 */
		const SKINS = [
			{
				id: "abyss",
				colorScheme: "dark",
				tokens: {
					// iOS/Linear 清透冷调重构：干净中性深灰底 + 白色低透明浮升玻璃面板 + 鲜亮靛蓝强调
					"--dsw-alias-bg-base": "#101014",
					"--dsw-alias-bg-layer-1": "#1b1e28",
					"--dsw-alias-bg-layer-2": "rgba(26, 30, 42, 0.85)",
					"--dsw-alias-bg-layer-3": "#1a1d27",
					"--dsw-alias-bg-module-platform": "#151821",
					"--dsw-alias-bg-overlay": "rgba(24, 24, 30, 0.86)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.08)",
					"--dsw-specific-tip": "rgba(30, 33, 46, 0.9)",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.07)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.13)",
					"--dsw-alias-label-primary": "#f4f5f7",
					"--dsw-alias-label-secondary": "#a5adb8",
					"--dsw-alias-label-tertiary": "#7b838f",
					"--dsw-alias-brand-primary": "#5e6ad2",
					"--dsw-specific-bubble": "rgba(37, 42, 58, 0.9)",
					"--dsw-specific-bubble-highlight": "rgba(94, 106, 210, 0.16)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.10)",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#6f7be0",
					"--dsw-alias-button-primary-dimmed": "rgba(94, 106, 210, 0.16)",
					"--dsw-alias-state-business-primary": "#5e6ad2",
					"--dsw-alias-state-business-tertiary": "rgba(94, 106, 210, 0.16)",
					"--dsw-alias-interactive-bg-hover": "rgba(94, 106, 210, 0.16)",
					"--dsw-alias-interactive-bg-active": "rgba(94, 106, 210, 0.26)",
					"--dsw-alias-markdown-code-block": "rgba(0, 0, 0, 0.35)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.09)",
					"--dsw-specific-sidebar-fill": "rgba(16, 16, 20, 0.92)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.09)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.05)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.09)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.14)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)"
				}
			},
			{
				id: "aurora",
				colorScheme: "dark",
				tokens: {
					// iOS/Linear 清透冷调重构：青绿→天蓝低温系
					"--dsw-alias-bg-base": "#0e1316",
					"--dsw-alias-bg-layer-1": "#162128",
					"--dsw-alias-bg-layer-2": "rgba(22, 32, 34, 0.85)",
					"--dsw-alias-bg-layer-3": "#182128",
					"--dsw-alias-bg-module-platform": "#131c20",
					"--dsw-alias-bg-overlay": "rgba(18, 24, 27, 0.86)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.08)",
					"--dsw-specific-tip": "rgba(24, 35, 36, 0.9)",
					"--dsw-alias-border-l1": "rgba(110, 231, 183, 0.10)",
					"--dsw-alias-border-l2": "rgba(110, 231, 183, 0.18)",
					"--dsw-alias-label-primary": "#eefaf4",
					"--dsw-alias-label-secondary": "#9fc9b8",
					"--dsw-alias-label-tertiary": "#74a494",
					"--dsw-alias-brand-primary": "#2dd4bf",
					"--dsw-specific-bubble": "rgba(30, 42, 44, 0.9)",
					"--dsw-specific-bubble-highlight": "rgba(45, 212, 191, 0.14)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.10)",
					"--dsw-alias-brand-text": "#03211b",
					"--dsw-alias-button-primary-hover": "#45e0cd",
					"--dsw-alias-button-primary-dimmed": "rgba(45, 212, 191, 0.14)",
					"--dsw-alias-state-business-primary": "#2dd4bf",
					"--dsw-alias-state-business-tertiary": "rgba(45, 212, 191, 0.14)",
					"--dsw-alias-interactive-bg-hover": "rgba(45, 212, 191, 0.14)",
					"--dsw-alias-interactive-bg-active": "rgba(45, 212, 191, 0.22)",
					"--dsw-alias-markdown-code-block": "rgba(0, 0, 0, 0.32)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-fill": "rgba(14, 19, 22, 0.92)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.045)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.13)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)"
				}
			},
			{
				id: "nebula",
				colorScheme: "dark",
				tokens: {
					// iOS/Linear 清透冷调重构：紫青低温系
					"--dsw-alias-bg-base": "#12101a",
					"--dsw-alias-bg-layer-1": "#1c1a2a",
					"--dsw-alias-bg-layer-2": "rgba(30, 27, 44, 0.85)",
					"--dsw-alias-bg-layer-3": "#1c1a28",
					"--dsw-alias-bg-module-platform": "#171523",
					"--dsw-alias-bg-overlay": "rgba(22, 20, 30, 0.86)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.08)",
					"--dsw-specific-tip": "rgba(32, 28, 46, 0.9)",
					"--dsw-alias-border-l1": "rgba(196, 181, 253, 0.10)",
					"--dsw-alias-border-l2": "rgba(196, 181, 253, 0.18)",
					"--dsw-alias-label-primary": "#f3f0fb",
					"--dsw-alias-label-secondary": "#b6a8d9",
					"--dsw-alias-label-tertiary": "#8a7cb0",
					"--dsw-alias-brand-primary": "#8b7cf6",
					"--dsw-specific-bubble": "rgba(40, 36, 56, 0.9)",
					"--dsw-specific-bubble-highlight": "rgba(139, 124, 246, 0.14)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.10)",
					"--dsw-alias-brand-text": "#0d0a1c",
					"--dsw-alias-button-primary-hover": "#9d90f8",
					"--dsw-alias-button-primary-dimmed": "rgba(139, 124, 246, 0.14)",
					"--dsw-alias-state-business-primary": "#8b7cf6",
					"--dsw-alias-state-business-tertiary": "rgba(139, 124, 246, 0.14)",
					"--dsw-alias-interactive-bg-hover": "rgba(139, 124, 246, 0.14)",
					"--dsw-alias-interactive-bg-active": "rgba(139, 124, 246, 0.22)",
					"--dsw-alias-markdown-code-block": "rgba(0, 0, 0, 0.32)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-fill": "rgba(18, 16, 26, 0.92)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.045)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.13)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)"
				}
			},
			{
				id: "ember",
				colorScheme: "dark",
				tokens: {
					// iOS/Linear 清透冷调重构：暖橙但干净克制
					"--dsw-alias-bg-base": "#16110d",
					"--dsw-alias-bg-layer-1": "#211a15",
					"--dsw-alias-bg-layer-2": "rgba(36, 28, 20, 0.85)",
					"--dsw-alias-bg-layer-3": "#231b15",
					"--dsw-alias-bg-module-platform": "#1b1712",
					"--dsw-alias-bg-overlay": "rgba(28, 20, 15, 0.86)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.08)",
					"--dsw-specific-tip": "rgba(38, 28, 20, 0.9)",
					"--dsw-alias-border-l1": "rgba(253, 186, 116, 0.10)",
					"--dsw-alias-border-l2": "rgba(253, 186, 116, 0.18)",
					"--dsw-alias-label-primary": "#fdf0e6",
					"--dsw-alias-label-secondary": "#d0a98a",
					"--dsw-alias-label-tertiary": "#a48266",
					"--dsw-alias-brand-primary": "#f59e5b",
					"--dsw-specific-bubble": "rgba(48, 38, 28, 0.9)",
					"--dsw-specific-bubble-highlight": "rgba(245, 158, 91, 0.14)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.10)",
					"--dsw-alias-brand-text": "#1f0f06",
					"--dsw-alias-button-primary-hover": "#f8b06f",
					"--dsw-alias-button-primary-dimmed": "rgba(245, 158, 91, 0.14)",
					"--dsw-alias-state-business-primary": "#f59e5b",
					"--dsw-alias-state-business-tertiary": "rgba(245, 158, 91, 0.14)",
					"--dsw-alias-interactive-bg-hover": "rgba(245, 158, 91, 0.14)",
					"--dsw-alias-interactive-bg-active": "rgba(245, 158, 91, 0.22)",
					"--dsw-alias-markdown-code-block": "rgba(0, 0, 0, 0.32)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-fill": "rgba(22, 17, 13, 0.92)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.045)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.13)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)"
				}
			},
			{
				id: "midnight",
				colorScheme: "dark",
				tokens: {
					// iOS/Linear 清透冷调重构：中性纯黑（保留 OLED 但清透）
					"--dsw-alias-bg-base": "#0b0b0e",
					"--dsw-alias-bg-layer-1": "#17171f",
					"--dsw-alias-bg-layer-2": "rgba(22, 22, 28, 0.85)",
					"--dsw-alias-bg-layer-3": "#181820",
					"--dsw-alias-bg-module-platform": "#11111a",
					"--dsw-alias-bg-overlay": "rgba(20, 20, 25, 0.86)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.08)",
					"--dsw-specific-tip": "rgba(26, 26, 32, 0.9)",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.12)",
					"--dsw-alias-label-primary": "#f2f2f6",
					"--dsw-alias-label-secondary": "#a4a4b2",
					"--dsw-alias-label-tertiary": "#787884",
					"--dsw-alias-brand-primary": "#7c8cff",
					"--dsw-specific-bubble": "rgba(30, 30, 38, 0.9)",
					"--dsw-specific-bubble-highlight": "rgba(124, 140, 255, 0.14)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.10)",
					"--dsw-alias-brand-text": "#05050f",
					"--dsw-alias-button-primary-hover": "#93a1ff",
					"--dsw-alias-button-primary-dimmed": "rgba(124, 140, 255, 0.14)",
					"--dsw-alias-state-business-primary": "#7c8cff",
					"--dsw-alias-state-business-tertiary": "rgba(124, 140, 255, 0.14)",
					"--dsw-alias-interactive-bg-hover": "rgba(124, 140, 255, 0.12)",
					"--dsw-alias-interactive-bg-active": "rgba(124, 140, 255, 0.20)",
					"--dsw-alias-markdown-code-block": "rgba(0, 0, 0, 0.4)",
					"--dsw-alias-markdown-inline-code": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-fill": "rgba(11, 11, 14, 0.92)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.085)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.045)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(255, 255, 255, 0.085)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(255, 255, 255, 0.13)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(255, 255, 255, 0.2)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(255, 255, 255, 0.2)"
				}
			},
			{
				id: "ivory",
				colorScheme: "light",
				tokens: {
					// iOS 扁平化：极简白、平色分层、克制系统灰，无半透明浑浊层
					"--dsw-alias-bg-base": "#f4f4f6",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#ffffff",
					"--dsw-alias-bg-layer-3": "#fafafc",
					"--dsw-alias-bg-module-platform": "#ededf0",
					"--dsw-alias-bg-overlay": "#ffffff",
					"--dsw-specific-input-major": "#ffffff",
					"--dsw-specific-tip": "#ffffff",
					"--dsw-alias-border-l1": "rgba(0, 0, 0, 0.08)",
					"--dsw-alias-border-l2": "rgba(0, 0, 0, 0.14)",
					"--dsw-alias-label-primary": "#1c1c1e",
					"--dsw-alias-label-secondary": "#6e6e73",
					"--dsw-alias-label-tertiary": "#86868b",
					"--dsw-alias-brand-primary": "#0071e3",
					"--dsw-specific-bubble": "#ffffff",
					"--dsw-specific-bubble-highlight": "rgba(0, 113, 227, 0.08)",
					"--dsw-specific-selector": "rgba(0, 0, 0, 0.04)",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#3395ff",
					"--dsw-alias-button-primary-dimmed": "rgba(0, 113, 227, 0.12)",
					"--dsw-alias-state-business-primary": "#0071e3",
					"--dsw-alias-state-business-tertiary": "rgba(0, 113, 227, 0.12)",
					"--dsw-alias-interactive-bg-hover": "rgba(0, 113, 227, 0.10)",
					"--dsw-alias-interactive-bg-active": "rgba(0, 113, 227, 0.16)",
					"--dsw-alias-markdown-code-block": "#f2f2f4",
					"--dsw-alias-markdown-inline-code": "rgba(0, 113, 227, 0.10)",
					"--dsw-specific-sidebar-fill": "#f4f4f6",
					"--dsw-specific-sidebar-nav-item-active": "#e4e4e8",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(0, 0, 0, 0.04)",
					"--dsw-alias-scrollbar-bg-l1": "#d1d1d6",
					"--dsw-alias-scrollbar-bg-l2": "#c0c0c6",
					"--dsw-alias-scrollbar-hover-l1": "#a6a6ad",
					"--dsw-alias-scrollbar-hover-l2": "#a6a6ad"
				}
			},
			{
				id: "mist",
				colorScheme: "light",
				tokens: {
					// 液态玻璃：真正的清透半透明白 + blur，冷蓝光晕透出，面板浮于其上
					"--dsw-alias-bg-base": "#e9eef6",
					"--dsw-alias-bg-layer-1": "rgba(255, 255, 255, 0.5)",
					"--dsw-alias-bg-layer-2": "rgba(255, 255, 255, 0.6)",
					"--dsw-alias-bg-layer-3": "rgba(255, 255, 255, 0.68)",
					"--dsw-alias-bg-module-platform": "rgba(243, 247, 252, 0.9)",
					"--dsw-alias-bg-overlay": "rgba(255, 255, 255, 0.55)",
					"--dsw-specific-input-major": "rgba(255, 255, 255, 0.45)",
					"--dsw-specific-tip": "rgba(255, 255, 255, 0.5)",
					"--dsw-alias-border-l1": "rgba(30, 41, 59, 0.10)",
					"--dsw-alias-border-l2": "rgba(30, 41, 59, 0.16)",
					"--dsw-alias-label-primary": "#0f1b33",
					"--dsw-alias-label-secondary": "#3d5270",
					"--dsw-alias-label-tertiary": "#6b80a0",
					"--dsw-alias-brand-primary": "#2196f3",
					"--dsw-specific-bubble": "rgba(255, 255, 255, 0.7)",
					"--dsw-specific-bubble-highlight": "rgba(33, 150, 243, 0.12)",
					"--dsw-specific-selector": "rgba(255, 255, 255, 0.5)",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#42a5f5",
					"--dsw-alias-button-primary-dimmed": "rgba(33, 150, 243, 0.14)",
					"--dsw-alias-state-business-primary": "#2196f3",
					"--dsw-alias-state-business-tertiary": "rgba(33, 150, 243, 0.14)",
					"--dsw-alias-interactive-bg-hover": "rgba(33, 150, 243, 0.12)",
					"--dsw-alias-interactive-bg-active": "rgba(33, 150, 243, 0.20)",
					"--dsw-alias-markdown-code-block": "rgba(255, 255, 255, 0.6)",
					"--dsw-alias-markdown-inline-code": "rgba(33, 150, 243, 0.12)",
					"--dsw-specific-sidebar-fill": "rgba(255, 255, 255, 0.5)",
					"--dsw-specific-sidebar-nav-item-active": "rgba(255, 255, 255, 0.72)",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(255, 255, 255, 0.35)",
					"--dsw-alias-scrollbar-bg-l1": "rgba(30, 41, 59, 0.18)",
					"--dsw-alias-scrollbar-bg-l2": "rgba(30, 41, 59, 0.24)",
					"--dsw-alias-scrollbar-hover-l1": "rgba(30, 41, 59, 0.34)",
					"--dsw-alias-scrollbar-hover-l2": "rgba(30, 41, 59, 0.34)"
				}
			},
			{
				id: "rose",
				colorScheme: "light",
				tokens: {
					// Google Material 扁平彩色：明快的品牌粉 + 紫点缀，干净扁平，无浑浊
					"--dsw-alias-bg-base": "#f7f0f3",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#fffdfd",
					"--dsw-alias-bg-layer-3": "#fdeef3",
					"--dsw-alias-bg-module-platform": "#f6e9ef",
					"--dsw-alias-bg-overlay": "#ffffff",
					"--dsw-specific-input-major": "#ffffff",
					"--dsw-specific-tip": "#fff7fa",
					"--dsw-alias-border-l1": "rgba(154, 55, 118, 0.12)",
					"--dsw-alias-border-l2": "rgba(154, 55, 118, 0.20)",
					"--dsw-alias-label-primary": "#3a1424",
					"--dsw-alias-label-secondary": "#8a4a63",
					"--dsw-alias-label-tertiary": "#a86b82",
					"--dsw-alias-brand-primary": "#e91e63",
					"--dsw-specific-bubble": "#ffffff",
					"--dsw-specific-bubble-highlight": "rgba(233, 30, 99, 0.10)",
					"--dsw-specific-selector": "rgba(233, 30, 99, 0.06)",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#f06292",
					"--dsw-alias-button-primary-dimmed": "rgba(233, 30, 99, 0.12)",
					"--dsw-alias-state-business-primary": "#e91e63",
					"--dsw-alias-state-business-tertiary": "rgba(233, 30, 99, 0.12)",
					"--dsw-alias-interactive-bg-hover": "rgba(233, 30, 99, 0.10)",
					"--dsw-alias-interactive-bg-active": "rgba(233, 30, 99, 0.18)",
					"--dsw-alias-markdown-code-block": "#fdeef3",
					"--dsw-alias-markdown-inline-code": "rgba(233, 30, 99, 0.10)",
					"--dsw-specific-sidebar-fill": "#f6e9ef",
					"--dsw-specific-sidebar-nav-item-active": "#f5d4e2",
					"--dsw-specific-sidebar-nav-item-hover": "rgba(233, 30, 99, 0.06)",
					"--dsw-alias-scrollbar-bg-l1": "#e5c7d4",
					"--dsw-alias-scrollbar-bg-l2": "#d9b3c4",
					"--dsw-alias-scrollbar-hover-l1": "#c392ab",
					"--dsw-alias-scrollbar-hover-l2": "#c392ab"
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
			"bg2.urlInvalid": "链接不被支持：仅支持 http/https 或 data:image 图片链接",
			"bg2.urlLoadFailed": "图片加载失败，请检查链接是否有效",
			"bg2.refreshUrlOnly": "定时更新仅对“图片链接”壁纸生效，请先在上方选择“图片链接”",
			"bg2.refresh": "定时自动更新（按周期重拉此链接，适合每日壁纸 API）",
			"bg2.refreshHours": "更新间隔（小时）",
			"bg2.remove": "清除壁纸",
			"modal.title": "弹窗透明度",
			"modal.hint": "控制下拉菜单 / 浮层 / 弹窗的底填充透明度——越往右越透、越能透出背后的内容；越往左越实、文字越清晰。"
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
			"bg2.urlInvalid": "Unsupported link — only http/https or data:image image URLs are supported",
			"bg2.urlLoadFailed": "Failed to load the image — please check the link",
			"bg2.refreshUrlOnly": "Scheduled refresh only works with Image URL wallpapers — pick “Image URL” above first",
			"bg2.refresh": "Auto refresh (re-fetch this link on a schedule — great for daily wallpaper APIs)",
			"bg2.refreshHours": "Refresh interval (hours)",
			"bg2.remove": "Clear wallpaper",
			"modal.title": "Popup transparency",
			"modal.hint": "Controls how see-through dropdown menus / overlays / popups are — slide right to let the content behind show through, left to keep text crisp."
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
			"bg2.urlInvalid": "サポート外のリンクです：http/https または data:image の画像URLのみ利用できます",
			"bg2.urlLoadFailed": "画像の読み込みに失敗しました。リンクを確認してください",
			"bg2.refreshUrlOnly": "定期更新は「画像 URL」の壁紙でのみ動作します — 先に上で「画像 URL」を選択してください",
			"bg2.refresh": "定期自動更新（このリンクを定期的に再取得 — 日替わり壁紙 API に最適）",
			"bg2.refreshHours": "更新間隔（時間）",
			"bg2.remove": "壁紙をクリア",
			"modal.title": "ポップアップの透明度",
			"modal.hint": "ドロップダウンメニュー / オーバーレイ / ポップアップの透け方を調整します。右ほど背後が透け、左ほど文字がはっきりします。"
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
			"bg2.urlInvalid": "지원하지 않는 링크입니다. http/https 또는 data:image 이미지 URL만 사용할 수 있습니다",
			"bg2.urlLoadFailed": "이미지를 불러오지 못했습니다. 링크를 확인해 주세요",
			"bg2.refreshUrlOnly": "정기 업데이트는 '이미지 URL' 배경화면에서만 작동합니다 — 먼저 위에서 '이미지 URL'을 선택하세요",
			"bg2.refresh": "정기 자동 업데이트 (이 링크를 주기적으로 다시 가져옴 — 매일 바뀌는 배경화면 API에 적합)",
			"bg2.refreshHours": "업데이트 간격 (시간)",
			"bg2.remove": "배경화면 지우기",
			"modal.title": "팝업 투명도",
			"modal.hint": "드롭다운 메뉴 / 오버레이 / 팝업의 투명도를 조절합니다. 오른쪽일수록 배경이 비치고, 왼쪽일수록 텍스트가 선명합니다."
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
			"bg2.urlInvalid": "Enlace no admitido: solo se permiten URLs de imágenes http/https o data:image",
			"bg2.urlLoadFailed": "No se pudo cargar la imagen. Comprueba el enlace",
			"bg2.refreshUrlOnly": "La actualización automática solo funciona con fondos de URL de imagen — elige «URL de la imagen» arriba primero",
			"bg2.refresh": "Actualización automática (vuelve a cargar este enlace periódicamente — ideal para fondos diarios)",
			"bg2.refreshHours": "Intervalo de actualización (horas)",
			"bg2.remove": "Quitar fondo",
			"modal.title": "Transparencia de las ventanas emergentes",
			"modal.hint": "Controla la transparencia del relleno de menús / superposiciones / ventanas emergentes: hacia la derecha se ve el contenido de atrás; hacia la izquierda el texto queda nítido."
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
			"bg2.urlInvalid": "Lien non pris en charge : seuls les URLs http/https ou data:image sont autorisés",
			"bg2.urlLoadFailed": "Échec du chargement de l'image. Vérifiez le lien",
			"bg2.refreshUrlOnly": "L'actualisation auto ne fonctionne qu'avec les fonds « URL d'image » — choisissez d'abord « URL de l'image » ci-dessus",
			"bg2.refresh": "Actualisation auto (recharge ce lien périodiquement — idéal pour les fonds quotidiens)",
			"bg2.refreshHours": "Intervalle de mise à jour (heures)",
			"bg2.remove": "Effacer le fond d'écran",
			"modal.title": "Transparence des fenêtres contextuelles",
			"modal.hint": "Contrôle la transparence du remplissage des menus / superpositions / fenêtres contextuelles : vers la droite, le contenu derrière transparaît ; vers la gauche, le texte reste net."
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
			"bg2.urlInvalid": "Nicht unterstützter Link – nur http/https- oder data:image-Bild-URLs sind erlaubt",
			"bg2.urlLoadFailed": "Bild konnte nicht geladen werden. Bitte prüfe den Link",
			"bg2.refreshUrlOnly": "Die automatische Aktualisierung funktioniert nur bei Wallpapern per Bild-URL — wähle zuerst oben „Bild-URL“",
			"bg2.refresh": "Automatisch aktualisieren (diesen Link regelmäßig neu laden — ideal für tägliche Wallpaper-APIs)",
			"bg2.refreshHours": "Aktualisierungsintervall (Stunden)",
			"bg2.remove": "Wallpaper entfernen",
			"modal.title": "Transparenz von Popups",
			"modal.hint": "Regelt die Transparenz von Dropdown-Menüs / Overlays / Popups – nach rechts scheint der Hintergrund durch, nach links bleibt der Text klar."
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
			"bg2.urlInvalid": "Неподдерживаемая ссылка — разрешены только URL http/https или data:image",
			"bg2.urlLoadFailed": "Не удалось загрузить изображение. Проверьте ссылку",
			"bg2.refreshUrlOnly": "Автообновление работает только с обоями «URL изображения» — сначала выберите «URL изображения» выше",
			"bg2.refresh": "Автообновление (периодически перезагружать эту ссылку — идеально для ежедневных обоев)",
			"bg2.refreshHours": "Интервал обновления (часы)",
			"bg2.remove": "Очистить обои",
			"modal.title": "Прозрачность всплывающих окон",
			"modal.hint": "Регулирует прозрачность заливки выпадающих меню / оверлеев / всплывающих окон: вправо — просвечивает фон, влево — текст чётче."
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
		const HOST_API = "/dream-skin/api";
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
				if (pendingHostSync) {
					pendingHostSync = false;
					scheduleHostSync();
				}
				return;
			}
			clearTimeout(timeoutId);
			timeoutId = null;
			try {
				if (parsed === null || typeof parsed !== "object" || parsed.ok !== true || typeof parsed.value !== "object" || parsed.value === null) return;
				const hostKeys = Object.keys(parsed.value);
				let adopted = false;
				for (const [key, value] of Object.entries(parsed.value)) {
					// Factory-seeded keys are PROVISIONAL (blue-team B1): the durable
					// host value always wins over the "first paint" seed, otherwise a
					// desktop restart (fresh origin = empty localStorage = factory
					// seeding) would shadow AND then destroy the user's real config.
					if (writtenKeys.has(key) && !factorySealed.has(key)) continue;
					const str = value === null ? null : typeof value === "string" ? value : String(value);
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
				if (adopted && typeof onHostReady === "function") onHostReady();
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

		/** Persist the provenance snapshot (best effort; never throws). */
		function saveFactorySnapshot() {
			try {
				const obj = {};
				for (const [key, value] of factorySnapshot) obj[key] = value;
				window.localStorage.setItem(FACTORY_SNAPSHOT_KEY, JSON.stringify(obj));
			} catch {
				// storage unavailable / quota — provenance degrades gracefully
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

		/** Whether the sidebar wash opacity is linked to the main canvas (default: yes). */
		function readSidebarLink() {
			const raw = readStorage(SIDEBAR_LINK_KEY);
			if (raw === null) return DEFAULT_SIDEBAR_LINK !== 0;
			const n = Number(raw);
			return Number.isFinite(n) ? n !== 0 : (DEFAULT_SIDEBAR_LINK !== 0);
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
			const weight = Math.round(readComposerOpacity() * 100);
			try {
				document.documentElement.style.setProperty(COMPOSER_FILL_VAR, `${weight}%`);
				// Round-17: on liquid the slider means glass THICKNESS — more
				// opaque = more backdrop blur (+0..24px). The var is consumed
				// only by the liquid ::before rule, so frosted is unaffected;
				// the text behind stays fogged (real backdrop-filter), and the
				// wallpaper's own blur stacks naturally inside the sample.
				const thickness = Math.round(readComposerOpacity() * 24);
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
				// Round-8: the glass FILL color per material (liquid = neutral white,
				// frosted = skin base). Set alongside the tone so the composer glass
				// never reads tea-colored on liquid again.
				document.documentElement.style.setProperty(GLASS_TINT_VAR, preset.tint || MATERIAL_PRESETS[0].tint);
				// Round-9: per-material fill WEIGHT factor (liquid caps the slider
				// weight at 15% so a white fill can never board up the glass).
				document.documentElement.style.setProperty(GLASS_FILL_SCALE_VAR, String(preset.fillScale != null ? preset.fillScale : 1));
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

		/** Parse a hex or rgb()/rgba() color into rgba() with the given alpha. */
		function toRgba(color, alpha) {
			const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
			if (hex !== null) {
				let digits = hex[1];
				if (digits.length === 3) digits = digits.split("").map((char) => char + char).join("");
				const n = parseInt(digits, 16);
				return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
			}
			const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(color.trim());
			if (rgb !== null) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
			return color.trim();
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
			wallpaperTokenOverrides = {};
			if (ctx !== null) applyCombinedTokenOverrides(ctx);
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
		const COMPOSER_HASH_CARDS = ".uV2eYG_card, .Mbwy4a_card";
		function findVisibleTextareas() {
			if (typeof document.querySelectorAll !== "function") return [];
			try {
				const out = [];
				const list = document.querySelectorAll("textarea");
				for (const ta of list) {
					if (ta.offsetWidth > 0 && ta.offsetHeight > 0) out.push(ta);
				}
				return out;
			} catch { return []; }
		}
		function nearestComposerCard(ta) {
			let card = null;
			try { card = ta.closest(COMPOSER_HASH_CARDS); } catch {}
			if (card !== null) return card;
			// Hashes gone (new host): climb to the nearest visibly rounded
			// ancestor — the composer card is the only rounded pane around
			// the chat textarea. Pass 1 wants a clear round (>=8px); pass 2
			// relaxes to >=4px for hosts that wrap the input in a flatter
			// card (dsh-desktop frame chrome).
			for (const min of [8, 4]) {
				let node = ta.parentElement;
				for (let hops = 0; node !== null && hops < 6; hops += 1, node = node.parentElement) {
					let radius = 0;
					try {
						if (typeof getComputedStyle === "function") {
							radius = parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
						}
					} catch {}
					if (radius >= min) return node;
				}
			}
			return null;
		}
		function markComposerCards() {
			try {
				const tas = findVisibleTextareas();
				let changed = false;
				for (const ta of tas) {
					const card = nearestComposerCard(ta);
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
		function startComposerMarker() {
			if (composerMarkerStarted) return;
			composerMarkerStarted = true;
			let marked = false;
			const run = () => { try { if (markComposerCards()) marked = true; } catch {} };
			run();
			// dsh-desktop mounts the conversation much later than the web host
			// (issue #50 follow-up): the first paint often has no textarea yet,
			// so a single mark-on-boot pass misses it. Poll cheaply until the
			// first successful mark, on top of the MutationObserver (which also
			// keeps re-marking after SPA re-renders discard the attribute).
			if (!marked && typeof setInterval === "function" && typeof clearInterval === "function") {
				let tries = 0;
				const timer = setInterval(() => {
					run();
					tries += 1;
					if (marked || tries > 30) { try { clearInterval(timer); } catch {} }
				}, 800);
			}
			if (typeof MutationObserver !== "function") return;
			try {
				let scheduled = false;
				const tick = () => { scheduled = false; run(); };
				const mo = new MutationObserver(() => {
					if (scheduled) return;
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
			} catch {}
		}
		function ensureMaterialStyle() {
			if (materialStyleEl !== null && document.head.contains(materialStyleEl)) return materialStyleEl;
			const parts = [
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
				// The conversation list ends with a fade (`.qDHVXG_fade`) so the whole
				// left column fades uniformly into the sidebar fill — no seam at the
				// foot.
				".qDHVXG_fade {",
				"  background: transparent;",
				"}",
				// The user-questions option card (`.Mbwy4a_card`) shares `--dsw-specific-input-major`
				// with the composer, which is intentionally very translucent for the liquid-glass
				// input. On its own that makes the option modal illegible (background text bleeds
				// through). Override it with a high-opacity fill derived from the active base color,
				// so the options stay readable in BOTH deep and light skins while still carrying a
				// subtle glass blur. This is a leaf card, so backdrop-filter here is safe.
				//
				// The fill weight (what % of the base color the block carries) is user-adjustable
				// via Settings → 外观 → 弹窗不透明度, held in the MODAL_FILL_VAR custom property.
				// Lower weight = more transparent (content shows through); higher = nearly solid.
				// The plain token line first is a deliberate fallback for webviews without
				// color-mix(): they drop only the color-mix declaration and keep an opaque
				// token fill, so the popup slider degrades instead of leaving the card
				// transparent with text bleeding through.
				".Mbwy4a_card {",
				"  background: var(--dsw-alias-bg-overlay);",
				"  background: color-mix(in srgb, var(--dsw-alias-bg-base) var(" + MODAL_FILL_VAR + ", 94%), transparent);",
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
				// Fill weight = slider% × material fillScale (round-9): the liquid
				// material scales the user's slider down (×0.15) so even "0%
				// transparency" stays a translucent pane — the white READ comes
				// from the tone + sheen layer below, never from a board of fill.
				"  background: color-mix(in srgb, var(" + GLASS_TINT_VAR + ", var(--dsh-dream-skin-composer-base, var(--dsw-alias-bg-base))) calc(var(" + COMPOSER_FILL_VAR + ", 85%) * var(" + GLASS_FILL_SCALE_VAR + ", 1)), transparent);",
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
				"  box-shadow:",
				"    inset 0 0 0 1px rgba(255,255,255,0.14),",
				"    inset 0 1px 0 0 rgba(255,255,255,0.18),",
				"    inset 0 -1px 0 0 rgba(255,255,255,0.08);",
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
				"  background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.01) 55%, rgba(255,255,255,0.04) 100%);",
				"  mix-blend-mode: screen;",
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
				'html[data-dsh-material="liquid"] .Mbwy4a_card,',
				'html[data-dsh-material="liquid"] [' + COMPOSER_CARD_ATTR + '] {',
				// F5 (round-7 review): outline instead of box-shadow — a shadow rule
				// here would REPLACE whatever elevation shadow the host puts on this
				// card; outline overlays without touching it. Round-8: lighter.
				"  outline: 1px solid rgba(255,255,255,0.12);",
				"  outline-offset: -1px;",
				"}"
			];
			const el = document.createElement("style");
			el.id = MATERIAL_CSS_SOURCE;
			el.textContent = parts.join("\n");
			(document.head || document.body).appendChild(el);
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
		const MATERIAL_SELECTOR_PROBES = [
			".bqrRRG_card",
			".lXshSW_root, ._7yHdaG_panel",
			".uV2eYG_root, [" + COMPOSER_CARD_ATTR + "]",
			".nArs4W_panel, .nArs4W_pane, .nArs4W_paneContent, .nArs4W_workbench, .nArs4W_explorerBody",
			".hHd-Xa_root .hHd-Xa_footArea, .hHd-Xa_root .hHd-Xa_settingsArea, .hHd-Xa_root .hHd-Xa_footerActions",
			".qDHVXG_fade",
			".Mbwy4a_card, [" + COMPOSER_CARD_ATTR + "]"
		];
		function warnOnMaterialSelectorDrift() {
			// Frame 1 may not have painted the workbench/settings surfaces yet, so
			// defer one frame; keep it cheap and fully guarded.
			if (typeof document.querySelector !== "function") return;
			const check = () => {
				try {
					const missed = MATERIAL_SELECTOR_PROBES.filter((sel) => {
						try { return document.querySelector(sel) === null; } catch { return true; }
					});
					if (missed.length > 0) {
						console.warn(
							"[dsh-dream-skin] host class names drifted — these material refinements are inactive on this DSH build (harmless, cosmetic only):",
							missed.join(" | ")
						);
					}
				} catch {}
			};
			if (typeof requestAnimationFrame === "function") {
				try { requestAnimationFrame(check); return; } catch {}
			}
			check();
		}
		/** Remove the injected liquid-glass <style> node on fiber unload. */
		function teardownMaterial() {
			materialStyleEl?.remove();
			materialStyleEl = null;
		}

		/**
		 * Apply the persisted popup-fill weight onto `:root` as MODAL_FILL_VAR, so
		 * every injected rule that references it (the user-options card fill) stays
		 * in sync without rebuilding the stylesheet. The weight is the base-color
		 * percentage (0..100): higher = more opaque/solid, lower = more transparent.
		 * Called at boot (so a saved value re-applies) and whenever the slider moves.
		 */
		function applyModalOpacity() {
			const weight = Math.round(readModalOpacity() * 100);
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
		 * `--dsw-alias-bg-overlay` ("overlay and popover background") and
		 * `--dsw-specific-menu` (dropdown / popup menus). We stack an override layer
		 * that scales those two surfaces to the ACTIVE base color at the slider's
		 * alpha, so 0% = fully see-through and 100% = solid — a real, visible change.
		 * Pure token override (no backdrop-filter), so it cannot re-trigger the
		 * fixed-modal containing-block bug. Called at boot and on every slider move.
		 */
		const POPUP_TOKENS = ["--dsw-alias-bg-overlay", "--dsw-specific-menu"];
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
			const overrides = {};
			for (const name of POPUP_TOKENS) {
				overrides[name] = {
					light: toRgba(baseFor("light"), alpha),
					dark: toRgba(baseFor("dark"), alpha)
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
						onChange: (v) => setSidebarOpacity(100 - v)
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
						format: (v) => `${v}%`,
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
		function WallpaperAdvancedRow({ t, useStore, setKind, setUrl, setGradient, setAutodim, setRefresh, clearAll }) {
			const kind = useStore((s) => s.kind);
			const url = useStore((s) => s.url);
			const gradient = useStore((s) => s.gradient);
			const autodim = useStore((s) => s.autodim);
			const refreshOn = useStore((s) => s.refreshOn);
			const refreshHours = useStore((s) => s.refreshHours);
			const urlState = (0, _react.useState)("");
			const urlValue = urlState[0];
			const setUrlValue = urlState[1];
			const KIND_OPTIONS = [
				{ id: "image", label: t("bg2.local") },
				{ id: "url", label: t("bg2.url") },
				{ id: "gradient", label: t("bg2.gradient") }
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

		/** Suggested wallpaper gradient for a theme (P0-3 per-skin recommendation). */
		function wallpapersSuggestionsFor(activeId) {
			// iOS 弥散光高级感：多层 radial-gradient 表达柔和光斑 + 同色系暗部分层。
			// 每套皮肤对应一套与配色呼应的弥散光背景（而非生硬的 3 段线性渐变）。
			const suggestions = {
				abyss: [
					"radial-gradient(1100px 620px at 82% -8%, rgba(94, 106, 210, 0.35), transparent 60%)",
					"radial-gradient(820px 520px at 10% 110%, rgba(56, 189, 248, 0.18), transparent 55%)",
					"radial-gradient(1300px 820px at 48% 44%, rgba(30, 34, 48, 0.5), transparent 72%)",
					"linear-gradient(165deg, #121216 0%, #0d0d11 55%, #101016 100%)"
				].join(", "),
				aurora: [
					"radial-gradient(1100px 620px at 84% -8%, rgba(45, 212, 191, 0.30), transparent 60%)",
					"radial-gradient(820px 520px at 8% 110%, rgba(56, 189, 248, 0.14), transparent 55%)",
					"radial-gradient(1300px 820px at 50% 44%, rgba(16, 32, 32, 0.5), transparent 72%)",
					"linear-gradient(165deg, #0f151a 0%, #0c1212 55%, #0e1518 100%)"
				].join(", "),
				nebula: [
					"radial-gradient(1100px 620px at 82% -8%, rgba(139, 124, 246, 0.32), transparent 60%)",
					"radial-gradient(820px 520px at 12% 110%, rgba(126, 96, 220, 0.16), transparent 55%)",
					"radial-gradient(1300px 820px at 48% 44%, rgba(28, 24, 44, 0.5), transparent 72%)",
					"linear-gradient(165deg, #18141f 0%, #120f1c 55%, #14111e 100%)"
				].join(", "),
				ember: [
					"radial-gradient(1100px 620px at 84% -8%, rgba(245, 158, 91, 0.28), transparent 60%)",
					"radial-gradient(820px 520px at 8% 110%, rgba(200, 96, 40, 0.14), transparent 55%)",
					"radial-gradient(1300px 820px at 50% 44%, rgba(34, 24, 16, 0.5), transparent 72%)",
					"linear-gradient(165deg, #1c1712 0%, #161210 55%, #191310 100%)"
				].join(", "),
				midnight: [
					"radial-gradient(1000px 600px at 82% -8%, rgba(124, 140, 255, 0.20), transparent 60%)",
					"radial-gradient(1300px 800px at 48% 44%, rgba(24, 24, 30, 0.5), transparent 74%)",
					"linear-gradient(165deg, #0e0e12 0%, #08080c 55%, #0c0c10 100%)"
				].join(", "),
				ivory: [
					"radial-gradient(1000px 560px at 84% -6%, rgba(196, 164, 120, 0.30), transparent 60%)",
					"radial-gradient(780px 500px at 10% 110%, rgba(210, 190, 235, 0.22), transparent 58%)",
					"radial-gradient(1200px 780px at 50% 44%, rgba(255, 255, 255, 0.9), transparent 74%)",
					"linear-gradient(170deg, #faf7f1 0%, #f5f1e8 55%, #f8f4ec 100%)"
				].join(", "),
				mist: [
					"radial-gradient(1000px 560px at 84% -6%, rgba(159, 190, 245, 0.32), transparent 60%)",
					"radial-gradient(780px 500px at 10% 110%, rgba(140, 196, 220, 0.20), transparent 58%)",
					"radial-gradient(1200px 780px at 50% 44%, rgba(255, 255, 255, 0.92), transparent 74%)",
					"linear-gradient(170deg, #f6f8fb 0%, #f1f5fa 55%, #f5f8fc 100%)"
				].join(", "),
				rose: [
					"radial-gradient(1000px 560px at 84% -6%, rgba(214, 120, 160, 0.26), transparent 60%)",
					"radial-gradient(780px 500px at 10% 110%, rgba(230, 180, 205, 0.18), transparent 58%)",
					"radial-gradient(1200px 780px at 50% 44%, rgba(255, 255, 255, 0.92), transparent 74%)",
					"linear-gradient(170deg, #f8f4f6 0%, #f4eef2 55%, #f7f2f5 100%)"
				].join(", ")
			};
			return suggestions[activeId] || null;
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

		/** Advanced wallpaper row store: kind + url + gradient + autodim. */
		function createAdvancedWallpaperStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ kind: "image", url: null, gradient: null, autodim: false, refreshOn: false, refreshHours: DEFAULT_REFRESH_HOURS, revision: -1 }),
				actions: {
					sync: (d, kind, url, gradient, autodim, refreshOn, refreshHours, revision) => {
						if (revision <= d.revision) return;
						d.kind = kind;
						d.url = url;
						d.gradient = gradient;
						d.autodim = autodim;
						d.refreshOn = refreshOn;
						d.refreshHours = refreshHours;
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
				return grad ? grad : null;
			}
			if (kind === "url") {
				const url = readWallpaperUrl();
				// A stored value that fails validation (older versions accepted
				// anything) is ignored at render time — never applied.
				if (url === null || !isSafeWallpaperUrl(url)) return null;
				// Scheduled-refresh cache-busting is a RENDER-layer concern: the
				// stored URL stays clean and the stamp comes from lastFiredAt.
				const refresh = readWallpaperRefreshConfig();
				const rendered = refresh.on && refresh.lastFiredAt > 0 ? stampedWallpaperUrl(url, refresh.lastFiredAt) : stripWallpaperBust(url);
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
				wallpaperEl.style.backgroundImage = bg;
				wallpaperEl.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
				// Auto-dim lowers the wash opacity when enabled.
				const baseFill = readWallpaperOpacity();
				const wash = readWallpaperAutodim() ? Math.min(baseFill, 0.45) : baseFill;
				shadeTokens2(ctx, wash, snapshot);
			} finally {
				_applyingWallpaper = false;
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
				"--dsw-specific-sidebar-fill": {
					light: toRgba(sidebarColor("light"), sidebarAlpha),
					dark: toRgba(sidebarColor("dark"), sidebarAlpha)
				}
			};
			wallpaperTokenOverrides = overrides;
			applyCombinedTokenOverrides(ctx);
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
		 * this exact setup on first launch (nebula skin, the bundled horse
		 * painting wallpaper, tuned glass numbers, bing-daily timed URL).
		 * Applied ONLY when a key has no stored value yet: a user who changed
		 * anything keeps their own choice. Dynamic/trail keys (history,
		 * favorites, packs, builtin-last) are deliberately NOT defaulted.
		 */
		const FACTORY_DEFAULTS = {
			[STORAGE_KEY]: "nebula",
			[WALLPAPER_KIND_KEY]: "image",
			[WALLPAPER_KEY]: "data:image/jpeg;base64,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",
			[WALLPAPER_URL_KEY]: "https://uapis.cn/api/v1/image/bing-daily",
			[WALLPAPER_GRADIENT_KEY]: "radial-gradient(1100px 620px at 82% -8%, rgba(139, 124, 246, 0.32), transparent 60%), radial-gradient(820px 520px at 12% 110%, rgba(126, 96, 220, 0.16), transparent 55%), radial-gradient(1300px 820px at 48% 44%, rgba(28, 24, 44, 0.5), transparent 72%), linear-gradient(165deg, #18141f 0%, #120f1c 55%, #14111e 100%)",
			[WALLPAPER_OPACITY_KEY]: "0.19",
			[WALLPAPER_BLUR_KEY]: "3",
			[SIDEBAR_OPACITY_KEY]: "0.28",
			[SIDEBAR_LINK_KEY]: "0",
			[WALLPAPER_AUTODIM_KEY]: "1",
			[WALLPAPER_FOLLOWS_SKIN_KEY]: "0",
			[COMPOSER_OPACITY_KEY]: "0.4",
			[MODAL_OPACITY_KEY]: "0.6",
			[MATERIAL_PRESET_KEY]: "frosted",
			// Factory refresh OFF (blue-team B7): polling a third-party API on the
			// user's behalf (even hourly) must be an explicit opt-in, never a
			// default. The URL field stays pre-filled; the user enables the
			// schedule themselves. DEFAULT_REFRESH_HOURS (24h) applies once on.
			[WALLPAPER_REFRESH_KEY]: "{\"on\":0,\"hours\":24}",
		};
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
			for (const key of Object.keys(FACTORY_DEFAULTS)) {
				if (readStorage(key) == null) writeStorage(key, FACTORY_DEFAULTS[key], { factory: true });
			}
			writeStorage(FACTORY_APPLIED_KEY, "1", { factory: true });
		}

		function restorePersistedState(ctx) {
			applyFactoryDefaults();
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
			ensureMaterialStyle();

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
				disposeAllPacks();
				popupTokenOverrides = {};
				accentTokenOverrides = {};
				wallpaperTokenOverrides = {};
				combinedOverrideDispose?.();
				combinedOverrideDispose = null;
			}, "dsh-dream-skin: wallpaper + material + packs cleanup");

			const skinStore = createSkinStore();
			let skinBound;
			// Monotonic revision for the skin slot store. Using a locally incrementing
			// counter (instead of the host theme revision) guarantees the store ALWAYS
			// updates on every click — even if theme/change timing races or the host
			// revision doesn't bump as expected — so the selected card follows instantly.
			let skinRevision = 0;
			let wallpaperReshadeTimer = null;
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
				// Theme events are synchronous. Re-shading inside this listener publishes a
				// nested theme/change; a presenter registered after us can then apply the
				// outer (pre-shade) snapshot last, leaving the wallpaper one skin behind.
				// Run after the current event stack instead. Events emitted by our own
				// override happen while _applyingWallpaper is true and must not enqueue a
				// second pass.
				if (wallpaperBackgroundCss() !== null && !_applyingWallpaper) {
					if (wallpaperReshadeTimer !== null) clearTimeout(wallpaperReshadeTimer);
					wallpaperReshadeTimer = setTimeout(() => {
						wallpaperReshadeTimer = null;
						applyWallpaper2(ctx, ctx.theme.getTheme());
					}, 0);
				}
			};
			ctx.on("theme/change", syncSkin);
			ctx.effect(() => () => {
				if (wallpaperReshadeTimer !== null) clearTimeout(wallpaperReshadeTimer);
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
						const value = Math.min(1, Math.max(0, percent / 100));
						writeStorage(SIDEBAR_OPACITY_KEY, String(value));
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
						// Mis-click guard (R13): pressing "Apply" on an untouched
						// (empty) input must not wipe an existing URL wallpaper —
						// clearing has its own button (clearAll / "清除壁纸").
						if (raw === "" || raw.length <= 4) {
							if (readWallpaperUrl() !== null) return;
							setWallpaperKind(ctx, "url", null);
							writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
							syncAdvWallpaper();
							startWallpaperRefreshScheduler(ctx);
							return;
						}
						if (!isSafeWallpaperUrl(raw)) {
							try { window.alert(localeT("bg2.urlInvalid")); } catch {}
							return;
						}
						// Store the clean URL: any `t=<ms>` stamp (from this plugin
						// or a pasted link) is stripped so persisted state never
						// carries cache-busting noise (R6).
						const clean = stripWallpaperBust(raw);
						setWallpaperKind(ctx, "url", clean);
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
						syncAdvWallpaper();
						startWallpaperRefreshScheduler(ctx);
						// Best-effort preload check: a dead link gets a one-shot
						// notice instead of silently showing nothing.
						const probe = new Image();
						probe.onerror = () => { try { window.alert(localeT("bg2.urlLoadFailed")); } catch {} };
						probe.src = clean;
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
						const value = Math.min(1, Math.max(0, percent / 100));
						writeStorage(SIDEBAR_OPACITY_KEY, String(value));
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
  var mask = "%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'24'%20height%3D'24'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'black'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Ccircle%20cx%3D%2213.5%22%20cy%3D%226.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%2217.5%22%20cy%3D%2210.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%228.5%22%20cy%3D%227.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%226.5%22%20cy%3D%2212.5%22%20r%3D%221.05%22%2F%3E%3Cpath%20d%3D'M12%202C6.5%202%202%206.5%202%2012s4.5%2010%2010%2010c.926%200%201.648-.746%201.648-1.688%200-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64%201.64%200%200%201%201.668-1.668h1.996c3.051%200%205.555-2.503%205.555-5.554C21.965%206.012%2017.461%202%2012%202z'%2F%3E%3C%2Fsvg%3E"
  var css = "[" + MARKER + "] > svg:first-child{display:none}" +
    "[" + MARKER + "]::before{content:\"\";flex:none;width:16px;height:16px;background:currentColor;" +
    "-webkit-mask:url(\"data:image/svg+xml," + mask + "\") center/contain no-repeat;" +
    "mask:url(\"data:image/svg+xml," + mask + "\") center/contain no-repeat}"
  var style = document.createElement("style")
  style.id = "dsh-dream-skin-nav-icon"
  style.textContent = css
  ;(document.head || document.body).append(style)
  if (document.body) {
    var sync = function () {
      try {
        for (var b of document.querySelectorAll("[role=\"dialog\"] nav button")) {
          var label = (b.textContent || "").trim()
          var mm = label === "皮肤" || label === "Theme" || label.indexOf("Theme") !== -1
          if (mm) b.setAttribute(MARKER, "")
          else b.removeAttribute(MARKER)
        }
      } catch {}
    }
    sync()
    var mo = new MutationObserver(sync)
    mo.observe(document.body, { subtree: true, childList: true, characterData: true })
  }
  } catch {}
})()
