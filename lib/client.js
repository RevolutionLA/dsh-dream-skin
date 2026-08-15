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
		let _runtime_client = require("@deepseek-ai/dsh-client-runtime/client");

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
		/** Source identity for the wallpaper's token override layer. */
		const OVERRIDE_SOURCE = "dsh-dream-skin:wallpaper";
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
					"--dsw-alias-bg-base": "#060a14",
					"--dsw-alias-bg-layer-1": "#0d1424",
					"--dsw-alias-bg-layer-2": "#141e36",
					"--dsw-alias-bg-layer-3": "#1a2744",
					"--dsw-alias-bg-overlay": "#1b2947",
					"--dsw-alias-border-l1": "rgba(148, 168, 210, 0.13)",
					"--dsw-alias-border-l2": "rgba(148, 168, 210, 0.24)",
					"--dsw-alias-label-primary": "#eef2fa",
					"--dsw-alias-label-secondary": "#9fb2d4",
					"--dsw-alias-label-tertiary": "#788eb6",
					"--dsw-alias-brand-primary": "#4f83f2",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#6f9af6",
					"--dsw-alias-button-primary-dimmed": "#141e36",
					"--dsw-alias-state-business-primary": "#4f83f2",
					"--dsw-alias-state-business-tertiary": "#141e36",
					"--dsw-alias-interactive-bg-hover": "rgba(79, 131, 242, 0.13)",
					"--dsw-alias-interactive-bg-active": "rgba(79, 131, 242, 0.22)",
					"--dsw-alias-markdown-code-block": "#0b1120",
					"--dsw-alias-markdown-inline-code": "#141e36",
					"--dsw-specific-sidebar-fill": "#0b1120",
					"--dsw-specific-sidebar-nav-item-active": "#141e36",
					"--dsw-specific-sidebar-nav-item-hover": "#101828",
					"--dsw-alias-scrollbar-bg-l1": "#1a2744",
					"--dsw-alias-scrollbar-bg-l2": "#1f2f52",
					"--dsw-alias-scrollbar-hover-l1": "#26375f",
					"--dsw-alias-scrollbar-hover-l2": "#26375f"
				}
			},
			{
				id: "aurora",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#04120f",
					"--dsw-alias-bg-layer-1": "#0a1d18",
					"--dsw-alias-bg-layer-2": "#102a23",
					"--dsw-alias-bg-layer-3": "#16372e",
					"--dsw-alias-bg-overlay": "#183a31",
					"--dsw-alias-border-l1": "rgba(110, 231, 183, 0.12)",
					"--dsw-alias-border-l2": "rgba(110, 231, 183, 0.22)",
					"--dsw-alias-label-primary": "#eafaf2",
					"--dsw-alias-label-secondary": "#92d5b8",
					"--dsw-alias-label-tertiary": "#6fb398",
					"--dsw-alias-brand-primary": "#34d399",
					"--dsw-alias-brand-text": "#03211a",
					"--dsw-alias-button-primary-hover": "#57e0b0",
					"--dsw-alias-button-primary-dimmed": "#102a23",
					"--dsw-alias-state-business-primary": "#34d399",
					"--dsw-alias-state-business-tertiary": "#102a23",
					"--dsw-alias-interactive-bg-hover": "rgba(52, 211, 153, 0.13)",
					"--dsw-alias-interactive-bg-active": "rgba(52, 211, 153, 0.22)",
					"--dsw-alias-markdown-code-block": "#081712",
					"--dsw-alias-markdown-inline-code": "#102a23",
					"--dsw-specific-sidebar-fill": "#081712",
					"--dsw-specific-sidebar-nav-item-active": "#102a23",
					"--dsw-specific-sidebar-nav-item-hover": "#0c231c",
					"--dsw-alias-scrollbar-bg-l1": "#16372e",
					"--dsw-alias-scrollbar-bg-l2": "#1b4438",
					"--dsw-alias-scrollbar-hover-l1": "#225344",
					"--dsw-alias-scrollbar-hover-l2": "#225344"
				}
			},
			{
				id: "nebula",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#0f0a1c",
					"--dsw-alias-bg-layer-1": "#17102b",
					"--dsw-alias-bg-layer-2": "#1f1638",
					"--dsw-alias-bg-layer-3": "#271c46",
					"--dsw-alias-bg-overlay": "#291e49",
					"--dsw-alias-border-l1": "rgba(216, 180, 254, 0.12)",
					"--dsw-alias-border-l2": "rgba(216, 180, 254, 0.22)",
					"--dsw-alias-label-primary": "#f4eefc",
					"--dsw-alias-label-secondary": "#c6aee6",
					"--dsw-alias-label-tertiary": "#a28dc7",
					"--dsw-alias-brand-primary": "#a78bfa",
					"--dsw-alias-brand-text": "#150c26",
					"--dsw-alias-button-primary-hover": "#bca7fd",
					"--dsw-alias-button-primary-dimmed": "#1f1638",
					"--dsw-alias-state-business-primary": "#a78bfa",
					"--dsw-alias-state-business-tertiary": "#1f1638",
					"--dsw-alias-interactive-bg-hover": "rgba(167, 139, 250, 0.14)",
					"--dsw-alias-interactive-bg-active": "rgba(167, 139, 250, 0.24)",
					"--dsw-alias-markdown-code-block": "#130c22",
					"--dsw-alias-markdown-inline-code": "#1f1638",
					"--dsw-specific-sidebar-fill": "#130c22",
					"--dsw-specific-sidebar-nav-item-active": "#1f1638",
					"--dsw-specific-sidebar-nav-item-hover": "#191230",
					"--dsw-alias-scrollbar-bg-l1": "#271c46",
					"--dsw-alias-scrollbar-bg-l2": "#312356",
					"--dsw-alias-scrollbar-hover-l1": "#3a2c66",
					"--dsw-alias-scrollbar-hover-l2": "#3a2c66"
				}
			},
			{
				id: "ember",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#120a08",
					"--dsw-alias-bg-layer-1": "#1b120e",
					"--dsw-alias-bg-layer-2": "#241913",
					"--dsw-alias-bg-layer-3": "#2d1f18",
					"--dsw-alias-bg-overlay": "#2f211a",
					"--dsw-alias-border-l1": "rgba(253, 186, 116, 0.12)",
					"--dsw-alias-border-l2": "rgba(253, 186, 116, 0.22)",
					"--dsw-alias-label-primary": "#fdf1e7",
					"--dsw-alias-label-secondary": "#d6ab8c",
					"--dsw-alias-label-tertiary": "#b68a6c",
					"--dsw-alias-brand-primary": "#fb923c",
					"--dsw-alias-brand-text": "#24110a",
					"--dsw-alias-button-primary-hover": "#fdad6a",
					"--dsw-alias-button-primary-dimmed": "#241913",
					"--dsw-alias-state-business-primary": "#fb923c",
					"--dsw-alias-state-business-tertiary": "#241913",
					"--dsw-alias-interactive-bg-hover": "rgba(251, 146, 60, 0.14)",
					"--dsw-alias-interactive-bg-active": "rgba(251, 146, 60, 0.24)",
					"--dsw-alias-markdown-code-block": "#160e0a",
					"--dsw-alias-markdown-inline-code": "#241913",
					"--dsw-specific-sidebar-fill": "#160e0a",
					"--dsw-specific-sidebar-nav-item-active": "#241913",
					"--dsw-specific-sidebar-nav-item-hover": "#1e1510",
					"--dsw-alias-scrollbar-bg-l1": "#2d1f18",
					"--dsw-alias-scrollbar-bg-l2": "#3a281d",
					"--dsw-alias-scrollbar-hover-l1": "#473225",
					"--dsw-alias-scrollbar-hover-l2": "#473225"
				}
			},
			{
				id: "midnight",
				colorScheme: "dark",
				tokens: {
					"--dsw-alias-bg-base": "#000000",
					"--dsw-alias-bg-layer-1": "#0b0b0f",
					"--dsw-alias-bg-layer-2": "#141419",
					"--dsw-alias-bg-layer-3": "#1c1c23",
					"--dsw-alias-bg-overlay": "#1d1d24",
					"--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
					"--dsw-alias-border-l2": "rgba(255, 255, 255, 0.12)",
					"--dsw-alias-label-primary": "#e8e8ee",
					"--dsw-alias-label-secondary": "#9d9daa",
					"--dsw-alias-label-tertiary": "#7c7c88",
					"--dsw-alias-brand-primary": "#7c8cff",
					"--dsw-alias-brand-text": "#05050a",
					"--dsw-alias-button-primary-hover": "#9aa7ff",
					"--dsw-alias-button-primary-dimmed": "#141419",
					"--dsw-alias-state-business-primary": "#7c8cff",
					"--dsw-alias-state-business-tertiary": "#141419",
					"--dsw-alias-interactive-bg-hover": "rgba(124, 140, 255, 0.13)",
					"--dsw-alias-interactive-bg-active": "rgba(124, 140, 255, 0.22)",
					"--dsw-alias-markdown-code-block": "#08080b",
					"--dsw-alias-markdown-inline-code": "#141419",
					"--dsw-specific-sidebar-fill": "#08080b",
					"--dsw-specific-sidebar-nav-item-active": "#141419",
					"--dsw-specific-sidebar-nav-item-hover": "#0e0e13",
					"--dsw-alias-scrollbar-bg-l1": "#1c1c23",
					"--dsw-alias-scrollbar-bg-l2": "#26262f",
					"--dsw-alias-scrollbar-hover-l1": "#31313c",
					"--dsw-alias-scrollbar-hover-l2": "#31313c"
				}
			},
			{
				id: "ivory",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#f7f4ee",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#f0ead8",
					"--dsw-alias-bg-layer-3": "#e7dfcb",
					"--dsw-alias-bg-overlay": "#fffdf8",
					"--dsw-alias-border-l1": "rgba(122, 96, 44, 0.1)",
					"--dsw-alias-border-l2": "rgba(122, 96, 44, 0.18)",
					"--dsw-alias-label-primary": "#2e2920",
					"--dsw-alias-label-secondary": "#6f6656",
					"--dsw-alias-label-tertiary": "#8d8373",
					"--dsw-alias-brand-primary": "#a16207",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#c67c0f",
					"--dsw-alias-button-primary-dimmed": "#f0ead8",
					"--dsw-alias-state-business-primary": "#a16207",
					"--dsw-alias-state-business-tertiary": "#f0ead8",
					"--dsw-alias-interactive-bg-hover": "rgba(161, 98, 7, 0.08)",
					"--dsw-alias-interactive-bg-active": "rgba(161, 98, 7, 0.14)",
					"--dsw-alias-markdown-code-block": "#f0ead8",
					"--dsw-alias-markdown-inline-code": "#ece5d2",
					"--dsw-specific-sidebar-fill": "#f0ead8",
					"--dsw-specific-sidebar-nav-item-active": "#e7dfcb",
					"--dsw-specific-sidebar-nav-item-hover": "#ece4d0",
					"--dsw-alias-scrollbar-bg-l1": "#e0d6bd",
					"--dsw-alias-scrollbar-bg-l2": "#d8ccb0",
					"--dsw-alias-scrollbar-hover-l1": "#cdbfa0",
					"--dsw-alias-scrollbar-hover-l2": "#cdbfa0"
				}
			},
			{
				id: "mist",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#f0f3f7",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#e7edf4",
					"--dsw-alias-bg-layer-3": "#dbe4ee",
					"--dsw-alias-bg-overlay": "#ffffff",
					"--dsw-alias-border-l1": "rgba(51, 65, 85, 0.1)",
					"--dsw-alias-border-l2": "rgba(51, 65, 85, 0.18)",
					"--dsw-alias-label-primary": "#1e293b",
					"--dsw-alias-label-secondary": "#64748b",
					"--dsw-alias-label-tertiary": "#94a3b8",
					"--dsw-alias-brand-primary": "#2563eb",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#3b82f6",
					"--dsw-alias-button-primary-dimmed": "#e7edf4",
					"--dsw-alias-state-business-primary": "#2563eb",
					"--dsw-alias-state-business-tertiary": "#e7edf4",
					"--dsw-alias-interactive-bg-hover": "rgba(37, 99, 235, 0.08)",
					"--dsw-alias-interactive-bg-active": "rgba(37, 99, 235, 0.14)",
					"--dsw-alias-markdown-code-block": "#e7edf4",
					"--dsw-alias-markdown-inline-code": "#dbe4ee",
					"--dsw-specific-sidebar-fill": "#e7edf4",
					"--dsw-specific-sidebar-nav-item-active": "#dbe4ee",
					"--dsw-specific-sidebar-nav-item-hover": "#e2e9f2",
					"--dsw-alias-scrollbar-bg-l1": "#cbd5e1",
					"--dsw-alias-scrollbar-bg-l2": "#c1ccda",
					"--dsw-alias-scrollbar-hover-l1": "#b4c0d0",
					"--dsw-alias-scrollbar-hover-l2": "#b4c0d0"
				}
			},
			{
				id: "rose",
				colorScheme: "light",
				tokens: {
					"--dsw-alias-bg-base": "#fbf3f5",
					"--dsw-alias-bg-layer-1": "#ffffff",
					"--dsw-alias-bg-layer-2": "#f7e4ea",
					"--dsw-alias-bg-layer-3": "#f0d2dc",
					"--dsw-alias-bg-overlay": "#fffdfd",
					"--dsw-alias-border-l1": "rgba(190, 90, 120, 0.1)",
					"--dsw-alias-border-l2": "rgba(190, 90, 120, 0.18)",
					"--dsw-alias-label-primary": "#3a2230",
					"--dsw-alias-label-secondary": "#90647a",
					"--dsw-alias-label-tertiary": "#a47d92",
					"--dsw-alias-brand-primary": "#e11d78",
					"--dsw-alias-brand-text": "#ffffff",
					"--dsw-alias-button-primary-hover": "#ec4a96",
					"--dsw-alias-button-primary-dimmed": "#f7e4ea",
					"--dsw-alias-state-business-primary": "#e11d78",
					"--dsw-alias-state-business-tertiary": "#f7e4ea",
					"--dsw-alias-interactive-bg-hover": "rgba(225, 29, 120, 0.08)",
					"--dsw-alias-interactive-bg-active": "rgba(225, 29, 120, 0.15)",
					"--dsw-alias-markdown-code-block": "#f7e4ea",
					"--dsw-alias-markdown-inline-code": "#f0d2dc",
					"--dsw-specific-sidebar-fill": "#f7e4ea",
					"--dsw-specific-sidebar-nav-item-active": "#f0d2dc",
					"--dsw-specific-sidebar-nav-item-hover": "#f4dae2",
					"--dsw-alias-scrollbar-bg-l1": "#eccfd9",
					"--dsw-alias-scrollbar-bg-l2": "#e5c0cd",
					"--dsw-alias-scrollbar-hover-l1": "#d9afbf",
					"--dsw-alias-scrollbar-hover-l2": "#d9afbf"
				}
			}
		];

		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"skin.title": "皮肤",
			"skin.default": "默认",
			"skin.abyss": "深海渊",
			"skin.aurora": "极光",
			"skin.nebula": "星云",
			"skin.ember": "余烬",
			"skin.midnight": "午夜",
			"skin.ivory": "象牙暖",
			"skin.mist": "晨雾蓝",
			"skin.rose": "蔷薇粉",
			"background.title": "背景图片（壁纸）",
			"background.choose": "选择图片",
			"background.remove": "移除图片",
			"background.opacity": "透明度",
			"background.blur": "模糊",
			"background.sidebarOpacity": "侧边栏透明度",
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
			"packs.empty": "还没有主题包。导入一个 JSON 主题包，或内置皮肤/主题包自动显示在这里。",
			"bg2.title": "高级壁纸（URL / 渐变）",
			"bg2.local": "本地图片",
			"bg2.url": "图片链接",
			"bg2.gradient": "渐变",
			"bg2.apply": "应用链接",
			"bg2.autodim": "自动弱化（聚焦任务时不喧宾夺主）",
			"bg2.remove": "清除壁纸"
		};

		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"skin.title": "Skins",
			"skin.default": "Default",
			"skin.abyss": "Abyss",
			"skin.aurora": "Aurora",
			"skin.nebula": "Nebula",
			"skin.ember": "Ember",
			"skin.midnight": "Midnight",
			"skin.ivory": "Ivory",
			"skin.mist": "Mist",
			"skin.rose": "Rose",
			"background.title": "Wallpaper",
			"background.choose": "Choose image",
			"background.remove": "Remove",
			"background.opacity": "Opacity",
			"background.blur": "Blur",
			"background.sidebarOpacity": "Sidebar opacity",
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
			"packs.empty": "No packs yet. Import a JSON theme pack, or built-in skins appear here.",
			"bg2.title": "Advanced Wallpaper (URL / gradient)",
			"bg2.local": "Local image",
			"bg2.url": "Image URL",
			"bg2.gradient": "Gradient",
			"bg2.apply": "Apply link",
			"bg2.autodim": "Auto-dim (gently fade while focusing tasks)",
			"bg2.remove": "Clear wallpaper"
		};
		//#endregion

		//#region dsh-dream-skin: persistence
		/** Read a localStorage string value (null on absence or error). */
		function readStorage(key) {
			try {
				const value = window.localStorage.getItem(key);
				return typeof value === "string" ? value : null;
			} catch {
				return null;
			}
		}

		/** Write (or remove with null) a localStorage value. */
		function writeStorage(key, value) {
			try {
				if (value === null) window.localStorage.removeItem(key);
				else window.localStorage.setItem(key, value);
			} catch {
				// storage unavailable / quota — the preference stays process-local
			}
		}

		/** Saved skin id (may be unknown/absent). */
		function readSavedSkin() {
			return readStorage(STORAGE_KEY);
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
		//#endregion

		//#region dsh-dream-skin: wallpaper layer + token shading
		/** The fixed backdrop layer (z-index -1), created lazily. */
		let wallpaperEl = null;
		/** Disposer for the current token-override layer. */
		let wallpaperOverrideDispose = null;

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

		/**
		 * Stack the wallpaper's token override layer: the main canvas
		 * (--dsw-alias-bg-base) and the sidebar (--dsw-specific-sidebar-fill)
		 * become translucent at the configured opacity, so the fixed backdrop
		 * shows through while inner surfaces (cards, inputs, bubbles) stay
		 * opaque and readable. Re-calling with the same source replaces the
		 * whole layer (per the ThemeRuntime contract — note override tokens must
		 * be { light, dark } pairs, unlike registered-theme tokens which are
		 * scalar strings).
		 */
		function shadeTokens(ctx) {
			const snapshot = ctx.theme.getTheme();
			const alpha = readWallpaperOpacity();
			const sidebarAlpha = readSidebarOpacity();
			const overrides = {
				"--dsw-alias-bg-base": {
					light: toRgba(resolveBase("light", snapshot.active), alpha),
					dark: toRgba(resolveBase("dark", snapshot.active), alpha)
				},
				"--dsw-specific-sidebar-fill": {
					light: toRgba(resolveSidebar("light", snapshot.active), sidebarAlpha),
					dark: toRgba(resolveSidebar("dark", snapshot.active), sidebarAlpha)
				}
			};
			wallpaperOverrideDispose?.();
			wallpaperOverrideDispose = ctx.theme.overrideTokens(OVERRIDE_SOURCE, overrides);
		}

		/** Apply (or clear) the wallpaper layer and its token shading. */
		function applyWallpaper(ctx) {
			const url = readWallpaper();
			if (url === null) {
				wallpaperEl?.remove();
				wallpaperEl = null;
				wallpaperOverrideDispose?.();
				wallpaperOverrideDispose = null;
				return;
			}
			if (wallpaperEl === null || !document.body.contains(wallpaperEl)) {
				wallpaperEl = document.createElement("div");
				wallpaperEl.style.cssText = "position:fixed;inset:0;z-index:-1;pointer-events:none;background-size:cover;background-position:center;background-repeat:no-repeat;";
				document.body.prepend(wallpaperEl);
			}
			const blur = readWallpaperBlur();
			wallpaperEl.style.backgroundImage = `url("${url}")`;
			wallpaperEl.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
			shadeTokens(ctx);
		}

		/** Remove the wallpaper layer and its token overrides (fiber unload). */
		function teardownWallpaper() {
			wallpaperEl?.remove();
			wallpaperEl = null;
			wallpaperOverrideDispose?.();
			wallpaperOverrideDispose = null;
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
				fontSize: "13px",
				font: "inherit",
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
		function WallpaperRow({ t, setWallpaper, setOpacity, setBlur, setSidebarOpacity, applyFromHistory, useStore }) {
			const url = useStore((s) => s.url);
			const opacity = useStore((s) => s.opacity);
			const blur = useStore((s) => s.blur);
			const sidebarOpacity = useStore((s) => s.sidebarOpacity);
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
					(0, react_jsx_runtime.jsx)(Slider, {
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
									const isImage = entry.kind !== "gradient" && entry.kind !== "url";
									return (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										title: t("background.historyApply"),
										style: {
											...styles.historyThumb,
											background: isImage ? `url("${entry.value}") center/cover no-repeat` : entry.value
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
		/** Sentinel meaning "no accent override — follow the theme's own accent". */
		const DEFAULT_ACCENT = "system";
		/** Marker for a skin that is actually a user-imported pack. */
		const PACK_ID_PREFIX = "dream-pack:";

		/**
		 * Minimum token set a pack must define so it renders coherently.
		 * See docs/theme-spec.md for the full token contract. These are the
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

		/** Encode a pack manifest into a shareable URL hash (fragment). */
		function packShareUrl(id) {
			const record = findPack(id);
			if (!record) return null;
			const payload = { format: PACK_FORMAT, version: PACK_VERSION, manifest: record.manifest };
			let encoded;
			try {
				encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
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
				const json = decodeURIComponent(escape(atob(raw)));
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

		/** Pack library row slot store (ids + favorites + active + suggestion). */
		function createPackStore() {
			return (0, _runtime_client.defineStore)({
				init: () => ({ ids: [], favorites: [], active: null, suggestion: null, revision: -1 }),
				actions: {
					sync: (d, ids, favorites, active, suggestion, revision) => {
						if (revision <= d.revision) return;
						d.ids = ids;
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
			const suggestions = {
				abyss: "linear-gradient(135deg, #0b1120 0%, #172554 55%, #1e3a8a 100%)",
				aurora: "linear-gradient(135deg, #022c22 0%, #065f46 60%, #0d9488 100%)",
				nebula: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #7e22ce 100%)",
				ember: "linear-gradient(135deg, #251607 0%, #7c2d12 60%, #c2410c 100%)",
				midnight: "linear-gradient(135deg, #030712 0%, #0f172a 100%)",
				ivory: "linear-gradient(135deg, #faf5eb 0%, #e7dfcb 100%)",
				mist: "linear-gradient(135deg, #f0f3f7 0%, #dbe4ee 100%)",
				rose: "linear-gradient(135deg, #fdf2f6 0%, #f0d2dc 100%)"
			};
			return suggestions[activeId] || null;
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
		//#endregion

		//#region dsh-dream-skin: P0 accent override
		/** Source identity for the per-user accent override layer. */
		const ACCENT_OVERRIDE_SOURCE = "dsh-dream-skin:accent";
		/** Token names the accent override shades (brand + primary surfaces). */
		const ACCENT_TOKENS = [
			"--dsw-alias-brand-primary",
			"--dsw-alias-state-business-primary",
			"--dsw-alias-button-primary-fill",
			"--dsw-alias-button-primary-dimmed"
		];
		/** Disposer for the active accent override layer. */
		let accentOverrideDispose = null;
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
				accentOverrideDispose?.();
				accentOverrideDispose = null;
				appliedAccent = null;
				return null;
			}
			const pair = { light: accent, dark: accent };
			const overrides = {};
			for (const name of ACCENT_TOKENS) overrides[name] = pair;
			accentOverrideDispose?.();
			accentOverrideDispose = ctx.theme.overrideTokens(ACCENT_OVERRIDE_SOURCE, overrides);
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
		/** Unique source identity for the wallpaper (already composited) layer. */
		const WALLPAPER_OVERRIDE_SOURCE = "dsh-dream-skin:wallpaper";
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
				return url ? `url("${url}")` : null;
			}
			// legacy / image
			const data = readWallpaper();
			return data ? `url("${data}")` : null;
		}

		/** Guards against re-entrant wallp-paper re-shading (overrideTokens emits theme/change). */
		let _applyingWallpaper = false;

		/** Re-render the wallpaper backdrop from the current config. */
		function applyWallpaper2(ctx) {
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
					teardownWallpaper();
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
				shadeTokens2(ctx, wash, wash);
			} finally {
				_applyingWallpaper = false;
			}
		}

		/** Like the original shadeTokens but with configurable alphas for the wash. */
		function shadeTokens2(ctx, canvasAlpha, sidebarAlpha) {
			const snapshot = ctx.theme.getTheme();
			const overrides = {
				"--dsw-alias-bg-base": {
					light: toRgba(resolveBase("light", snapshot.active), canvasAlpha),
					dark: toRgba(resolveBase("dark", snapshot.active), canvasAlpha)
				},
				"--dsw-specific-sidebar-fill": {
					light: toRgba(resolveSidebar("light", snapshot.active), readSidebarOpacity()),
					dark: toRgba(resolveSidebar("dark", snapshot.active), readSidebarOpacity())
				}
			};
			wallpaperOverrideDispose?.();
			wallpaperOverrideDispose = ctx.theme.overrideTokens(WALLPAPER_OVERRIDE_SOURCE, overrides);
		}

		/** Clear wallpaper (all kinds) and its overrides. */
		function removeWallpaper(ctx) {
			writeStorage(WALLPAPER_KEY, null);
			writeStorage(WALLPAPER_URL_KEY, null);
			writeStorage(WALLPAPER_GRADIENT_KEY, null);
			writeStorage(WALLPAPER_KIND_KEY, null);
			teardownWallpaper();
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

		/** Set a wallpaper by kind and value. */
		function setWallpaperKind(ctx, kind, value) {
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
		}
		//#endregion

		//#region dsh-dream-skin: P0 share-url import
		/** Try to import a pack shared via URL hash; true when one was imported. */
		function tryImportFromHash(ctx) {
			const decoded = decodeShareUrl(window.location.hash);
			if (!decoded) return false;
			try {
				applyPackToTheme(ctx, decoded.id, packToRegistration(decoded.pack));
				importedPacks.push({ id: decoded.id, manifest: decoded.pack.manifest, registration: packToRegistration(decoded.pack) });
				const packs = readPacks();
				if (!packs.some((p) => p.id === decoded.id)) packs.push({ id: decoded.id, manifest: decoded.pack.manifest });
				writePacks(packs);
			} catch {
				// ignore a bad import at boot
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
							const label = id;
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
												children: "移除"
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

			// P0: re-register previously imported packs before restoring a skin,
			// then import any pack shared via URL hash.
			restorePacks(ctx);
			let importedPackShare = tryImportFromHash(ctx);

			// Restore the saved skin once (before any user interaction).
			const saved = readSavedSkin();
			if (typeof saved === "string" && saved !== DEFAULT_SKIN && (SKINS.some((skinDefinition) => skinDefinition.id === saved) || importedPacks.some((p) => p.id === saved))) {
				const current = ctx.theme.getTheme().preference;
				if (current !== saved) ctx.theme.setTheme(saved);
			}
			// The host ui-theme.preference scope only persists system/light/dark and is
			// adopted asynchronously after load, which resets a third-party skin restored
			// above. Re-assert the saved skin once when that adoption lands.
			let reassertSkin = false;
			ctx.on("theme/change", () => {
				if (reassertSkin) return;
				const savedSkin = readSavedSkin();
				if (typeof savedSkin !== "string" || savedSkin === DEFAULT_SKIN) return;
				const current = ctx.theme.getTheme().preference;
				if (current !== savedSkin && (current === "system" || current === "light" || current === "dark")) {
					const known = SKINS.some((skinDefinition) => skinDefinition.id === savedSkin) || importedPacks.some((p) => p.id === savedSkin);
					if (known) {
						reassertSkin = true;
						ctx.theme.setTheme(savedSkin);
					}
				}
			});
			// P0: apply the persisted per-user accent override.
			applyAccent(ctx);

			// Wallpaper bookkeeping.
			let wallpaperRevision = 0;
			const wallpaperStore = createWallpaperStore();
			let wallpaperBound;
			const syncWallpaper = () => {
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
			};
			applyWallpaper2(ctx);
			syncWallpaper();
			ctx.effect(() => () => {
				teardownWallpaper();
				disposeAllPacks();
			}, "dsh-dream-skin: wallpaper + packs cleanup");

			const skinStore = createSkinStore();
			let skinBound;
			// Monotonic revision for the skin slot store. Using a locally incrementing
			// counter (instead of the host theme revision) guarantees the store ALWAYS
			// updates on every click — even if theme/change timing races or the host
			// revision doesn't bump as expected — so the selected card follows instantly.
			let skinRevision = 0;
			const syncSkinWith = (id) => {
				skinBound?.sync(id, ++skinRevision);
				// A skin/scheme switch changes the base color; re-shade the wash.
				if (wallpaperBackgroundCss() !== null) applyWallpaper2(ctx);
			};
			const syncSkin = (snapshot) => {
				skinBound?.sync(snapshot.preference, ++skinRevision);
				// A skin/scheme switch changes the base color; re-shade the wash.
				if (wallpaperBackgroundCss() !== null) applyWallpaper2(ctx);
			};
			ctx.on("theme/change", syncSkin);

			ctx.effect(() => ctx.locale.register(SETTINGS_NS, {
				zh,
				en
			}), "dsh-dream-skin: settings row dictionaries");

			const skinInjected = (actions) => {
				skinBound = actions;
				syncSkin(ctx.theme.getTheme());
				return {
					setSkin: (id) => {
						ctx.theme.setTheme(id);
						writeSavedSkin(id);
						// Deterministically push the new preference into the slot store AND
						// re-shade the wallpaper so the selected card follows immediately,
						// independent of theme/change emission timing.
						syncSkinWith(id);
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
						writeStorage(WALLPAPER_KEY, url);
						applyWallpaper2(ctx);
						syncWallpaper();
					},
					setWallpaperUrl: (url) => {
						setWallpaperKind(ctx, "url", url && url.length > 4 ? url : null);
					},
					setWallpaperGradient: (gradient) => {
						setWallpaperKind(ctx, "gradient", gradient && gradient.length > 4 ? gradient : null);
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
					advWallpaperRevision++
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
						setWallpaperKind(ctx, "url", url && url.length > 4 ? url : null);
						syncAdvWallpaper();
					},
					setGradient: (gradient) => {
						setWallpaperKind(ctx, "gradient", gradient && gradient.length > 4 ? gradient : null);
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

			// P0: per-user accent override row.
			const accentStore = createAccentStore();
			let accentBound;
			let accentRevision = 0;
			const accentInjected = (actions) => {
				accentBound = actions;
				const base = resolveAccent(ctx.theme.getTheme()) || DEFAULT_ACCENT;
				accentBound?.sync(readAccent() || DEFAULT_ACCENT, base, -1);
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
				packBound?.sync(importedPacks.map((p) => p.id), readFavorites(), current, wallpapersSuggestionsFor(current), ++packRevision);
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
						if (name) { try { window.alert("dsh-dream-skin: removed \"" + name + "\""); } catch {} }
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
					try { window.alert("dsh-dream-skin: theme pack rejected —\n" + (validate.errors || []).join("\n")); } catch {}
					return { ok: false };
				}
				const result = importPack(ctx, validate);
				try {
					if (!result.ok) window.alert("dsh-dream-skin: import failed —\n" + result.error);
					else { syncPack(); window.alert("dsh-dream-skin: imported \"" + result.name + "\" ✓"); }
				} catch {}
				return result;
			};
			packExporter = (id) => exportPackAsFile(ctx, id);
			packShare = (id) => packShareUrl(id);
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
