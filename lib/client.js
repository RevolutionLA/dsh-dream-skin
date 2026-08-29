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
		let react_jsx_runtime = require("react/jsx-runtime");
		let _react = require("react");
		let _runtime_client = require("@deepseek-ai/dsh-client-store");

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
			"skin.mist": "液态玻璃",
			"skin.rose": "Material 粉",
			"background.title": "背景图片（壁纸）",
			"background.choose": "选择图片",
			"background.remove": "移除图片",
			"background.opacity": "透明度",
			"background.blur": "模糊",
			"background.sidebarOpacity": "侧边栏透明度",
			"background.sidebarLink": "侧边栏跟随主背景透明度（关闭后可分别调节侧边栏）",
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
			"bg2.title": "高级壁纸（URL / 渐变）",
			"bg2.local": "本地图片",
			"bg2.url": "图片链接",
			"bg2.gradient": "渐变",
			"bg2.apply": "应用链接",
			"bg2.autodim": "自动弱化（聚焦任务时不喧宾夺主）",
			"bg2.urlInvalid": "链接不被支持：仅支持 http/https 或 data:image 图片链接",
			"bg2.urlLoadFailed": "图片加载失败，请检查链接是否有效",
			"bg2.remove": "清除壁纸",
			"modal.title": "弹窗不透明度",
			"modal.hint": "控制下拉菜单 / 浮层 / 弹窗的底填充透明度——越高越不透明、文字越清晰；越低越能透出背后的内容。"
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
			"skin.mist": "Liquid Glass",
			"skin.rose": "Material Pink",
			"background.title": "Wallpaper",
			"background.choose": "Choose image",
			"background.remove": "Remove",
			"background.opacity": "Opacity",
			"background.blur": "Blur",
			"background.sidebarOpacity": "Sidebar opacity",
			"background.sidebarLink": "Link sidebar opacity to the main canvas (turn off to control it separately)",
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
			"bg2.title": "Advanced Wallpaper (URL / gradient)",
			"bg2.local": "Local image",
			"bg2.url": "Image URL",
			"bg2.gradient": "Gradient",
			"bg2.apply": "Apply link",
			"bg2.autodim": "Auto-dim (gently fade while focusing tasks)",
			"bg2.urlInvalid": "Unsupported link — only http/https or data:image image URLs are supported",
			"bg2.urlLoadFailed": "Failed to load the image — please check the link",
			"bg2.remove": "Clear wallpaper",
			"modal.title": "Popup opacity",
			"modal.hint": "Controls how opaque dropdown menus / overlays / popups are — higher keeps text crisp, lower lets the content behind show through."
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
			"skin.mist": "リキッドグラス",
			"skin.rose": "マテリアルピンク",
			"background.title": "背景画像（壁紙）",
			"background.choose": "画像を選択",
			"background.remove": "画像を削除",
			"background.opacity": "不透明度",
			"background.blur": "ぼかし",
			"background.sidebarOpacity": "サイドバーの不透明度",
			"background.sidebarLink": "サイドバーの不透明度をメイン表示領域に連動（オフで個別調整）",
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
			"bg2.title": "詳細壁紙（URL / グラデーション）",
			"bg2.local": "ローカル画像",
			"bg2.url": "画像 URL",
			"bg2.gradient": "グラデーション",
			"bg2.apply": "リンクを適用",
			"bg2.autodim": "自動ディム（タスクに集中している間は控えめに薄暗く）",
			"bg2.urlInvalid": "サポート外のリンクです：http/https または data:image の画像URLのみ利用できます",
			"bg2.urlLoadFailed": "画像の読み込みに失敗しました。リンクを確認してください",
			"bg2.remove": "壁紙をクリア",
			"modal.title": "ポップアップの不透明度",
			"modal.hint": "ドロップダウンメニュー / オーバーレイ / ポップアップの塗り不透明度を調整します。高いほど不透明で文字がはっきりし、低いと背後が透けます。"
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
			"skin.mist": "리퀴드 글래스",
			"skin.rose": "머티리얼 핑크",
			"background.title": "배경 이미지 (배경화면)",
			"background.choose": "이미지 선택",
			"background.remove": "이미지 제거",
			"background.opacity": "투명도",
			"background.blur": "흐림",
			"background.sidebarOpacity": "사이드바 투명도",
			"background.sidebarLink": "사이드바 투명도를 메인 캔버스에 연동 (끄면 개별 조절)",
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
			"bg2.title": "고급 배경화면 (URL / 그라데이션)",
			"bg2.local": "로컬 이미지",
			"bg2.url": "이미지 링크",
			"bg2.gradient": "그라데이션",
			"bg2.apply": "링크 적용",
			"bg2.autodim": "자동으로 은은해지기 (작업에 집중할 때 방해하지 않도록)",
			"bg2.urlInvalid": "지원하지 않는 링크입니다. http/https 또는 data:image 이미지 URL만 사용할 수 있습니다",
			"bg2.urlLoadFailed": "이미지를 불러오지 못했습니다. 링크를 확인해 주세요",
			"bg2.remove": "배경화면 지우기",
			"modal.title": "팝업 불투명도",
			"modal.hint": "드롭다운 메뉴 / 오버레이 / 팝업 채우기 불투명도를 조절합니다. 높을수록 불투명해져 텍스트가 선명하고, 낮으면 배경이 비쳐 보입니다."
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
			"skin.mist": "Vidrio líquido",
			"skin.rose": "Material rosa",
			"background.title": "Fondo de pantalla",
			"background.choose": "Elegir imagen",
			"background.remove": "Quitar imagen",
			"background.opacity": "Opacidad",
			"background.blur": "Desenfoque",
			"background.sidebarOpacity": "Opacidad de la barra lateral",
			"background.sidebarLink": "Vincular la opacidad de la barra lateral al lienzo principal (apagar para ajustarla aparte)",
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
			"bg2.title": "Fondo avanzado (URL / degradado)",
			"bg2.local": "Imagen local",
			"bg2.url": "URL de la imagen",
			"bg2.gradient": "Degradado",
			"bg2.apply": "Aplicar enlace",
			"bg2.autodim": "Atenuación automática (se desvanece suavemente mientras te concentras en las tareas)",
			"bg2.urlInvalid": "Enlace no admitido: solo se permiten URLs de imágenes http/https o data:image",
			"bg2.urlLoadFailed": "No se pudo cargar la imagen. Comprueba el enlace",
			"bg2.remove": "Quitar fondo",
			"modal.title": "Opacidad de las ventanas emergentes",
			"modal.hint": "Controla la opacidad del relleno de menús desplegables / superposiciones / ventanas emergentes: más alta mantiene el texto nítido, más baja deja ver el contenido de atrás."
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
			"skin.mist": "Verre liquide",
			"skin.rose": "Material rose",
			"background.title": "Fond d'écran",
			"background.choose": "Choisir une image",
			"background.remove": "Retirer l'image",
			"background.opacity": "Opacité",
			"background.blur": "Flou",
			"background.sidebarOpacity": "Opacité de la barre latérale",
			"background.sidebarLink": "Lier l'opacité de la barre latérale au canevas principal (désactiver pour régler séparément)",
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
			"bg2.title": "Fond d'écran avancé (URL / dégradé)",
			"bg2.local": "Image locale",
			"bg2.url": "URL de l'image",
			"bg2.gradient": "Dégradé",
			"bg2.apply": "Appliquer le lien",
			"bg2.autodim": "Atténuation auto (s'estompe en douceur pendant la concentration)",
			"bg2.urlInvalid": "Lien non pris en charge : seuls les URLs http/https ou data:image sont autorisés",
			"bg2.urlLoadFailed": "Échec du chargement de l'image. Vérifiez le lien",
			"bg2.remove": "Effacer le fond d'écran",
			"modal.title": "Opacité des fenêtres contextuelles",
			"modal.hint": "Contrôle l'opacité du remplissage des menus déroulants / superpositions / fenêtres contextuelles : plus élevée, le texte reste net ; plus basse, le contenu derrière transparaît."
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
			"skin.mist": "Flüssiges Glas",
			"skin.rose": "Material Pink",
			"background.title": "Hintergrundbild (Wallpaper)",
			"background.choose": "Bild auswählen",
			"background.remove": "Bild entfernen",
			"background.opacity": "Deckkraft",
			"background.blur": "Unschärfe",
			"background.sidebarOpacity": "Deckkraft der Seitenleiste",
			"background.sidebarLink": "Seitenleisten-Deckkraft an Hauptfläche koppeln (ausschalten für getrennte Regelung)",
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
			"bg2.title": "Erweiterte Wallpaper (URL / Verlauf)",
			"bg2.local": "Lokales Bild",
			"bg2.url": "Bild-URL",
			"bg2.gradient": "Verlauf",
			"bg2.apply": "Link anwenden",
			"bg2.autodim": "Automatisch dimmen (sanft verblassen, während du dich auf Aufgaben konzentrierst)",
			"bg2.urlInvalid": "Nicht unterstützter Link – nur http/https- oder data:image-Bild-URLs sind erlaubt",
			"bg2.urlLoadFailed": "Bild konnte nicht geladen werden. Bitte prüfe den Link",
			"bg2.remove": "Wallpaper entfernen",
			"modal.title": "Deckkraft von Popups",
			"modal.hint": "Regelt die Fülldeckkraft von Dropdown-Menüs / Overlays / Popups – höher hält den Text klar, niedriger lässt den Hintergrund durchscheinen."
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
			"skin.mist": "Жидкое стекло",
			"skin.rose": "Material розовый",
			"background.title": "Обои",
			"background.choose": "Выбрать изображение",
			"background.remove": "Удалить",
			"background.opacity": "Прозрачность",
			"background.blur": "Размытие",
			"background.sidebarOpacity": "Прозрачность боковой панели",
			"background.sidebarLink": "Связать прозрачность боковой панели с основным полотном (выкл — для раздельной настройки)",
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
			"bg2.title": "Расширенные обои (URL / градиент)",
			"bg2.local": "Локальное изображение",
			"bg2.url": "Ссылка на изображение",
			"bg2.gradient": "Градиент",
			"bg2.apply": "Применить ссылку",
			"bg2.autodim": "Автоприглушение (плавно затухает при фокусе на задачах)",
			"bg2.urlInvalid": "Неподдерживаемая ссылка — разрешены только URL http/https или data:image",
			"bg2.urlLoadFailed": "Не удалось загрузить изображение. Проверьте ссылку",
			"bg2.remove": "Очистить обои",
			"modal.title": "Непрозрачность всплывающих окон",
			"modal.hint": "Регулирует непрозрачность заливки выпадающих меню / оверлеев / всплывающих окон: выше — текст чётче, ниже — просвечивает фон."
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
		/** Set once the host state has been fetched at boot. */
		let hostReady = false;
		/** Debounce timer for host pushes. */
		let hostSyncTimer = null;
		/** Callback invoked after the host state is applied (set by apply). */
		let onHostReady = null;

		/** Schedule a debounced full-state push to the host. */
		function scheduleHostSync() {
			if (hostSyncTimer !== null) return;
			hostSyncTimer = setTimeout(() => {
				hostSyncTimer = null;
				pushStateToHost();
			}, 200);
		}

		/** Push the whole cache (including null clears) to the host file. */
		async function pushStateToHost() {
			const patch = {};
			for (const [key, value] of stateCache) patch[key] = value;
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
			try {
				const res = await fetch(HOST_API, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ method: "get" })
				});
				const parsed = await res.json();
				if (parsed === null || typeof parsed !== "object" || parsed.ok !== true || typeof parsed.value !== "object" || parsed.value === null) return;
				const hostKeys = Object.keys(parsed.value);
				let adopted = false;
				for (const [key, value] of Object.entries(parsed.value)) {
					if (writtenKeys.has(key)) continue;
					const str = value === null ? null : typeof value === "string" ? value : String(value);
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
				if (hostKeys.length === 0 && stateCache.size > 0) pushStateToHost();
				hostReady = true;
				if (adopted && typeof onHostReady === "function") onHostReady();
			} catch {
				// host unreachable — keep using localStorage
			}
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
		function writeStorage(key, value) {
			stateCache.set(key, value);
			writtenKeys.add(key);
			try {
				if (value === null) window.localStorage.removeItem(key);
				else window.localStorage.setItem(key, value);
			} catch {
				// storage unavailable / quota — the cache still holds the value
			}
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
				".uV2eYG_root {",
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
				".Mbwy4a_card {",
				"  background: color-mix(in srgb, var(--dsw-alias-bg-base) var(" + MODAL_FILL_VAR + ", 94%), transparent);",
				"  -webkit-backdrop-filter: blur(24px) saturate(150%);",
				"  backdrop-filter: blur(24px) saturate(150%);",
				"}"
			];
			const el = document.createElement("style");
			el.id = MATERIAL_CSS_SOURCE;
			el.textContent = parts.join("\n");
			(document.head || document.body).appendChild(el);
			materialStyleEl = el;
			return el;
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
			tinyButton: {
				height: "22px",
				padding: "0 8px",
				borderRadius: "6px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "transparent",
				color: "var(--dsw-alias-label-secondary)",
				cursor: "pointer",
				font: "inherit",
				fontSize: "11px",
				lineHeight: "16px"
			},
			tinyButtonActive: {
				color: "var(--dsw-alias-brand-primary)",
				borderColor: "var(--dsw-alias-brand-primary)"
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
				width: "90px"
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
		function Slider({ label, value, min, max, step, format, onChange }) {
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.sliderRow,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						style: styles.sliderLabel,
						children: label
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
		 * Wallpaper row: choose (compressed to a data URL), preview, tune the
		 * wash opacity and blur, and remove the wallpaper.
		 */
		function WallpaperRow({ t, setWallpaper, setOpacity, setBlur, setSidebarOpacity, setSidebarLink, applyFromHistory, useStore }) {
			const url = useStore((s) => s.url);
			const opacity = useStore((s) => s.opacity);
			const blur = useStore((s) => s.blur);
			const sidebarOpacity = useStore((s) => s.sidebarOpacity);
			const [sidebarLink, setLink] = (0, _react.useState)(readSidebarLink());
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
						children: t("background.title")
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
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.opacity"),
						value: Math.round(opacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: setOpacity
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
					sidebarLink ? null : (0, react_jsx_runtime.jsx)(Slider, {
						label: t("background.sidebarOpacity"),
						value: Math.round(sidebarOpacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: setSidebarOpacity
					}),
					history && history.length > 0 ? (0, react_jsx_runtime.jsxs)("div", {
						style: { ...styles.group, padding: "8px 0", borderBottom: "none" },
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								style: styles.title,
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
										? `url("${entry.value}") center/cover no-repeat`
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
					}) : null,
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.hint,
						children: t("background.hint")
					})
				]
			});
		}

		/**
		 * Advanced wallpaper row (P0-3): a URL or gradient preset as the backdrop
		 * instead of a local image, plus an auto-dim toggle. Kept separate from
		 * the image row so the two workflows don't fight over the same preview.
		 */
		function WallpaperAdvancedRow({ t, useStore, setKind, setUrl, setGradient, setAutodim, clearAll }) {
			const kind = useStore((s) => s.kind);
			const url = useStore((s) => s.url);
			const gradient = useStore((s) => s.gradient);
			const autodim = useStore((s) => s.autodim);
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

		/**
		 * Popup-opacity row: a slider for how opaque the popup / option-card fill
		 * is. Uses the shared Slider component; the injected modal CSS reads the
		 * persisted value through MODAL_FILL_VAR (see applyModalOpacity), so moving
		 * the slider re-applies immediately and persists across reloads.
		 */
		function ModalOpacityRow({ t, setOpacity, useStore }) {
			const opacity = useStore((s) => s.opacity);
			return (0, react_jsx_runtime.jsxs)("div", {
				style: styles.group,
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.title,
						children: t("modal.title")
					}),
					(0, react_jsx_runtime.jsx)(Slider, {
						label: t("modal.title"),
						value: Math.round(opacity * 100),
						min: 0,
						max: 100,
						step: 1,
						format: (v) => `${v}%`,
						onChange: setOpacity
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.hint,
						children: t("modal.hint")
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
			if (id === "system" || id === "light" || id === "dark") return { ok: false, errors: [`"${manifest.id}" collides with a reserved id`] };
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
			const record = findPack(id);
			const source = record ? { format: PACK_FORMAT, version: PACK_VERSION, manifest: { ...record.manifest } }
				: null;
			if (!source) return false;
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
			const record = findPack(id);
			if (!record) return null;
			const payload = { format: PACK_FORMAT, version: PACK_VERSION, manifest: record.manifest };
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
				init: () => ({ kind: "image", url: null, gradient: null, autodim: false, revision: -1 }),
				actions: {
					sync: (d, kind, url, gradient, autodim, revision) => {
						if (revision <= d.revision) return;
						d.kind = kind;
						d.url = url;
						d.gradient = gradient;
						d.autodim = autodim;
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
				return url && isSafeWallpaperUrl(url) ? `url("${cssUrlValue(url)}")` : null;
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
			// uses the same alpha as the main canvas so the two halves don't look
			// split; when off, it uses the separately configured sidebar opacity.
			const sidebarAlpha = readSidebarLink() ? canvasAlpha : readSidebarOpacity();
			const overrides = {
				"--dsw-alias-bg-base": {
					light: toRgba(resolveBase("light", active), canvasAlpha),
					dark: toRgba(resolveBase("dark", active), canvasAlpha)
				},
				"--dsw-specific-sidebar-fill": {
					light: toRgba(resolveSidebar("light", active), sidebarAlpha),
					dark: toRgba(resolveSidebar("dark", active), sidebarAlpha)
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
		function restorePersistedState(ctx) {
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
						children: t("accent.title")
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
					}),
					(0, react_jsx_runtime.jsx)("div", {
						style: styles.hint,
						children: t("accent.hint")
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
			const ids = useStore((s) => s.ids);
			const names = useStore((s) => s.names);
			const favorites = useStore((s) => s.favorites);
			const active = useStore((s) => s.active);
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

			const doShare = () => {
				const activeId = active && ids.indexOf(active) !== -1 ? active : null;
				if (activeId && packShare) {
					const url = packShare(activeId);
					if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(url).then(() => {}).catch(() => {});
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
								style: styles.button,
								onClick: doShare,
								children: t("packs.share")
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
			const disposers = SKINS.map((skinDefinition) => ctx.theme.register(skinDefinition));
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
					++advWallpaperRevision
				);
			};
			const advWallpaperInjected = (actions) => {
				advWallpaperBound = actions;
				syncAdvWallpaper();
				return {
					setKind: (kind) => {
						if (kind !== "image" && kind !== "url" && kind !== "gradient") return;
						writeStorage(WALLPAPER_KIND_KEY, kind);
						applyWallpaper2(ctx);
						syncAdvWallpaper();
					},
					setUrl: (url) => {
						const trimmed = url && url.length > 4 ? url : null;
						if (trimmed !== null && !isSafeWallpaperUrl(trimmed)) {
							try { window.alert(localeT("bg2.urlInvalid")); } catch {}
							return;
						}
						setWallpaperKind(ctx, "url", trimmed);
						writeStorage(WALLPAPER_FOLLOWS_SKIN_KEY, "0");
						syncAdvWallpaper();
						// Best-effort preload check: a dead link gets a one-shot
						// notice instead of silently showing nothing.
						if (trimmed !== null) {
							const probe = new Image();
							probe.onerror = () => { try { window.alert(localeT("bg2.urlLoadFailed")); } catch {} };
							probe.src = trimmed;
						}
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
					clearAll: () => {
						removeWallpaper(ctx);
						syncAdvWallpaper();
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-wallpaper-advanced",
				order: 31,
				store: advWallpaperStore,
				locale: SETTINGS_NS,
				inject: advWallpaperInjected
			}, WallpaperAdvancedRow));

			// Popup / option-card fill opacity row.
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
					setOpacity: (percent) => {
						const clamped = writeModalOpacity(percent / 100);
						applyModalOpacity();
						applyModalOverlay(ctx);
						modalOpacityBound?.sync(clamped, ++modalOpacityRevision);
					}
				};
			};
			ctx.slots.inject("settings.dreamSkin.item", () => ctx.slots.register({
				name: "settings.dreamSkin.item",
				id: "dream-skin-modal-opacity",
				order: 32,
				store: modalOpacityStore,
				locale: SETTINGS_NS,
				inject: modalOpacityInjected
			}, ModalOpacityRow));

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
				const result = importPack(ctx, validate);
				try {
					if (!result.ok) window.alert(localeT("packs.importFailed", { error: result.error }));
					else { syncPack(); window.alert(localeT("packs.imported", { name: result.name })); }
				} catch {}
				return result;
			};
			packExporter = (id) => exportPackAsFile(ctx, id);
			packShare = (id) => packShareUrl(id);

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
;(function () {
  var MARKER = "data-dsh-dream-skin-nav"
  var mask = "%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'24'%20height%3D'24'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'black'%20stroke-width%3D'2'%20stroke-linecap%3D'round'%20stroke-linejoin%3D'round'%3E%3Ccircle%20cx%3D%2213.5%22%20cy%3D%226.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%2217.5%22%20cy%3D%2210.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%228.5%22%20cy%3D%227.5%22%20r%3D%221.05%22%2F%3E%3Ccircle%20cx%3D%226.5%22%20cy%3D%2212.5%22%20r%3D%221.05%22%2F%3E%3Cpath%20d%3D'M12%202C6.5%202%202%206.5%202%2012s4.5%2010%2010%2010c.926%200%201.648-.746%201.648-1.688%200-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64%201.64%200%200%201%201.668-1.668h1.996c3.051%200%205.555-2.503%205.555-5.554C21.965%206.012%2017.461%202%2012%202z'%2F%3E%3C%2Fsvg%3E"
  var css = "[" + MARKER + "] > svg:first-child{display:none}" +
    "[" + MARKER + "]::before{content:\"\";flex:none;width:16px;height:16px;background:currentColor;" +
    "-webkit-mask:url(\"data:image/svg+xml," + mask + "\") center/contain no-repeat;" +
    "mask:url(\"data:image/svg+xml," + mask + "\") center/contain no-repeat}"
  var style = document.createElement("style")
  style.id = "dsh-dream-skin-nav-icon"
  style.textContent = css
  document.head.append(style)
  var sync = function () {
    for (var b of document.querySelectorAll("[role=\"dialog\"] nav button")) {
      var label = (b.textContent || "").trim()
      var mm = label === "皮肤" || label === "Theme" || label.indexOf("Theme") !== -1
      if (mm) b.setAttribute(MARKER, "")
      else b.removeAttribute(MARKER)
    }
  }
  sync()
  var mo = new MutationObserver(sync)
  mo.observe(document.body, { subtree: true, childList: true, characterData: true })
})()
