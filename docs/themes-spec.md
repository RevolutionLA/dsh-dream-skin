# 主题包规格 (Theme Pack Spec)

`dsh-dream-skin` 里，一套可分发 / 可导入 / 可分享的主题称为一个**主题包（theme pack）**。本文件定义它的
格式与令牌契约。

## 一个主题包长什么样

```jsonc
{
  "format": "dsh-dream-skin/pack", // 固定
  "version": 1,                    // 格式版本，当前为 1
  "manifest": {
    "id": "aurora-test",           // 唯一 id（小写字母数字与 `-`）
    "name": "Aurora Test",         // 显示名（英文）
    "nameZh": "极光测试",          // 可选：中文名
    "author": "RevolutionLA",
    "version": "1.0.0",
    "description": "A calm aurora dark theme.",
    "colorScheme": "dark",         // "light" | "dark"
    "accent": "#34d399",           // 可选：默认强调色
    "tokens": {
      "--dsw-alias-bg-base": "#04120f",
      "--dsw-alias-bg-layer-1": "#0a1d18",
      "--dsw-alias-brand-primary": "#34d399",
      "--dsw-alias-label-primary": "#eafaf2",
      "--dsw-alias-label-secondary": "#92d5b8",
      "--dsw-alias-border-l1": "#0f2a22",
      "--dsw-alias-border-l2": "#1a3a30"
    }
  }
}
```

参考真实样例：[`docs/examples/sample-theme-pack.json`](./examples/sample-theme-pack.json)。

## 导入 / 应用 / 分享

- **导入**：在 **设置 → 外观（Theme）→ 主题包** 点「导入主题包…」选择 `.dsh-theme.json` 文件；会校验结构，成功后
  立即注册并出现在库里。
- **一键应用**：库里的任意皮肤 / 主题包点「应用」即切换。
- **分享链接**：点「复制分享链接」，得到一个 `#dream-skin-pack=<base64>` 的 URL；拿到链接的人打开后会在
  启动时自动导入该主题包。
- **收藏 / 换一个试试**：星标收藏；「换一个试试」随机挑一个与当前不同的主题。

## 必填 token（最少要实现这些，否则渲染不完整）

| 组 | Token |
|----|-------|
| 背景 | `--dsw-alias-bg-base`、`--dsw-alias-bg-layer-1` |
| 文字 | `--dsw-alias-label-primary`、`--dsw-alias-label-secondary` |
| 品牌 | `--dsw-alias-brand-primary` |
| 边框 | `--dsw-alias-border-l1`、`--dsw-alias-border-l2` |

导入精灵会校验这些 token 存在且是合法颜色。其余 `--dsw-alias-*` / `--dsw-specific-*` 为**推荐**，越完整体验越好。

## 推荐 token（更完整的语义层）

| 组 | Token |
|----|-------|
| 层级 | `--dsw-alias-bg-layer-2`、`--dsw-alias-bg-layer-3`、`--dsw-alias-bg-overlay` |
| 文字 | `--dsw-alias-label-tertiary` |
| 品牌/状态 | `--dsw-alias-state-business-primary`、`--dsw-alias-state-success-primary`、`--dsw-alias-state-warn-primary`、`--dsw-alias-state-error-primary` |
| 交互 | `--dsw-alias-interactive-bg-hover`、`--dsw-alias-interactive-bg-active`、`--dsw-alias-button-primary-fill`、`--dsw-alias-button-primary-hover` |
| 代码 | `--dsw-alias-markdown-code-block`、`--dsw-alias-markdown-inline-code`、`--dsw-alias-markdown-tag` |
| 滚动条 | `--dsw-alias-scrollbar-bg-l1`、`--dsw-alias-scrollbar-hover-l1` |
| 侧栏 | `--dsw-specific-sidebar-fill`、`--dsw-specific-sidebar-nav-item-active` |

## 颜色校验

导入时对必填 token 与 `accent` 做颜色合法性检查，支持 `#rgb` / `#rrggbb` / `rgb()` / `rgba()` / `hsl()` / `hsla()`。

注意：校验只保证「值被接受为颜色」。弹窗不透明度滑杆会把自身 alpha 应用到 `--dsw-alias-bg-layer-2`，但只有
`#rgb` / `#rrggbb` 与**逗号分隔**的 `rgb()` / `rgba()` 形态能保留皮肤自身色相；凡 strict 解析不了的值
（`hsl()` / `hsla()`、空格分隔、百分号分量等）在弹窗面上回落到该 scheme 的基础色——滑块本身仍全程有效
（0% 全透 ↔ 100% 全遮），仅色相不取自皮肤。

## 命名约定

- `id` 使用小写字母、数字与 `-`；导入后自动加 `dream-pack:` 前缀以避免与内置 `light`/`dark` 冲突。
- 不要把 `accent` 依赖在 `tokens["--dsw-alias-brand-primary"]` 之外——`accent` 是可选的「默认强调色」提示，
  实际渲染始终以 `tokens` 里的品牌色兜底。

## 持久化边界

第三方主题包默认存于 `localStorage`（键 `dsh-dream-skin:packs`）。DSH 的 Host settings 线路只对浏览器暴露
**白名单**命名空间（`WEB_SETTINGS_NAMESPACES`），第三方命名空间即使注册也答 `settings-not-exposed`，因此
`localStorage` 是当前可靠且跨刷新存活的持久化方式。
