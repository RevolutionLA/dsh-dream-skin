// Shared per-skin visual data for preview generation.
//
// GENERATED — do not hand-edit the colours.
//
// Every colour below is projected out of scripts/skin-system.cjs, which is the
// same generator that writes the SHIPPED SKINS block in lib/client.js. That is
// the whole point: the preview on the README and the pixels a user gets after
// "download → pick a skin" come from one source, so they cannot drift apart.
//
// The only hand-authored thing left here is the copy (Chinese name / one-line
// style note) — words, not colour.
const { buildAll } = require('./skin-system.cjs');

// Presentation-only. These are names and adjectives; if the palette changes,
// nothing here needs to change with it.
const COPY = {
	abyss: { zh: '沉静蓝 · 深海渊', style: '靛蓝 · iOS/Linear 清透冷调' },
	aurora: { zh: '极光青 · 冷冽清透', style: '青绿 → 天蓝低温系' },
	nebula: { zh: '星云紫 · 深邃漫射', style: '紫青 · 神秘弥漫' },
	ember: { zh: '余烬橙 · 暖光收敛', style: '暖橙 · 克制干净' },
	midnight: { zh: '午夜黑 · 极简 OLED', style: '中性纯黑 · 沉浸' },
	ivory: { zh: 'IOS 扁平 · 纸感清爽', style: '极简白 · iOS 系统灰 + 蓝' },
	mist: { zh: '液态玻璃 · 清透晨雾', style: '半透明毛玻璃 + 冷蓝光晕' },
	rose: { zh: '蔷薇粉 · Material 现代', style: '明快品牌粉 + 紫点缀' }
};

const T = {
	base: '--dsw-alias-bg-base',
	layer1: '--dsw-alias-bg-layer-1',
	layer2: '--dsw-alias-bg-layer-2',
	layer3: '--dsw-alias-bg-layer-3',
	borderL1: '--dsw-alias-border-l1',
	borderL2: '--dsw-alias-border-l2',
	text1: '--dsw-alias-label-primary',
	text2: '--dsw-alias-label-secondary',
	text3: '--dsw-alias-label-tertiary',
	accent: '--dsw-alias-brand-primary',
	brandText: '--dsw-alias-brand-text',
	hover: '--dsw-alias-interactive-bg-hover',
	active: '--dsw-alias-interactive-bg-active',
	sidebar: '--dsw-specific-sidebar-fill',
	sidebarActive: '--dsw-specific-sidebar-nav-item-active',
	bubble: '--dsw-specific-bubble',
	input: '--dsw-specific-input-major',
	tip: '--dsw-specific-tip'
};

const SKINS = Object.fromEntries(
	buildAll().map((skin) => {
		const t = skin.tokens;
		const dark = skin.colorScheme === 'dark';
		const copy = COPY[skin.id] || { zh: skin.id, style: '' };
		// The mockup card sits on the base canvas, so its panel must be a layer
		// that actually exists above the canvas — layer-3 for the floating
		// dialog, layer-1 for the inline pane.
		return [
			skin.id,
			{
				id: skin.id,
				colorScheme: skin.colorScheme,
				zh: copy.zh,
				labels: {
					en: skin.id,
					style: copy.style,
					tag: dark ? '暗' : '亮'
				},
				// --- projected from the design system -----------------------
				accent: t[T.accent],
				accentSoft: t['--dsw-alias-brand-primary-soft'],
				base: t[T.base],
				// The wallpaper is no longer a second, hand-tuned gradient map:
				// it is the skin's own glow, the same string the plugin writes.
				bg: skin.glow,
				sidebar: t[T.sidebar],
				sidebarActive: t[T.sidebarActive],
				panel: t[T.layer3],
				panel2: t[T.layer1],
				panelBorder: t[T.borderL2],
				hairline: t[T.borderL1],
				bubble: t[T.bubble],
				input: t[T.input],
				tip: t[T.tip],
				overlay: t[T.layer2],
				text1: t[T.text1],
				text2: t[T.text2],
				text3: t[T.text3],
				hover: t[T.hover],
				active: t[T.active],
				brandText: t[T.brandText],
				success: t['--dsw-alias-state-success-primary'],
				warn: t['--dsw-alias-state-warn-primary'],
				error: t['--dsw-alias-state-error-primary'],
				// Per-skin defaults, exactly as shipped — shown on the card so
				// the preview also tells the truth about glass / wash / dialog.
				defaults: skin.defaults
			}
		];
	})
);

module.exports = { SKINS, COPY };
