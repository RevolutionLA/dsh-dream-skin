# dsh-dream-skin — 项目说明 (PROJECT.md)

## 背景

GitHub 上 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 非常火：它用本机回环 CDP
向 Codex 桌面客户端注入 CSS，为开发者提供「换肤 / 换背景」的玩法。

**deepseek-harness (dsh)** 的用户也有同样的诉求。好消息是 dsh 本身就是一个 token 驱动的 Web GUI，官方在
`packages/client/ui-theme` 里提供了**第三方插件注册主题**的一等能力。所以本项目的路线是**做原生接入**，
而不是复制 Codex 的 CDP 注入方案：

- 不需要修改任何官方二进制 / 安装包。
- 不会因为客户端更新而失效。
- 皮肤选择、壁纸、透明度/模糊全部由 token + 浏览器侧状态完成。

## 目标

把「换肤 + 自定义壁纸」作为一套**独立开源、可分发（npm）的 dsh 插件**发布出去，让 DSH 用户一条命令装完就能换皮肤。

**品牌基调：优雅 · 设计感 · 高级感。** 与强调"题材 / 二次元萌系"的同类方案不同，本项目的差异化建立在**材质与配色的精细化**上——以 iOS / Linear 式的清透冷调、克制的用色、弥散光与毛玻璃质感为视觉语言，做「换肤界的 iOS」。这一基调贯穿 8 套内置皮肤、预览资产与全部对外文案。

## 能力范围

**v0.1（已完成）**
- 8 套主题预设（Mirage 幻梦），浅/深色兼顾，品牌锚点用 DeepSeek 蓝。
- 自选背景壁纸，含透明度和模糊调节。
- `localStorage` 持久化。
- 设置里出现「皮肤 / 背景图片」入口。

**v0.4 - 高级感材质升级（进行中）**
- 8 套内置皮肤 token 全面重构为 iOS / Linear 式清透冷调（克制用色 + 玻璃面板 + 弥散光）。
- 每皮肤内置弥散光渐变，选皮肤自动配背景。
- 设计哲学文档 [`docs/design-philosophy.md`](./design-philosophy.md)，作为品牌差异化宣言。

**v0.2 - P0 差异化（已完成）**
- **主题包格式 + 导入 / 导出 / 分享链接**（JSON + manifest + 校验）。
- **每用户强调色 Accent**（`overrideTokens` 叠加层）+ 随机 / 恢复。
- **壁纸 2.0**：URL / 渐变 / 每皮肤建议 / 自动弱化。
- **本地主题包库**（导入的自定义包）、一键应用 / 收藏 /「换一个试试」。
- 冒烟测试 `npm test`、示例主题包、`docs/themes-spec.md`。

> Codex-Dream-Skin 的「桌面托盘 / 主题库在线一键换肤 / 一键恢复」依赖桌面端 CDP 与原生托盘，DSH 是浏览器
> Web GUI，不在本插件范围；对应能力用「分享链接 + 本地主题包库 + 校验回滚」在纯前端实现。

## 技术要点

- 插件 = **双面插件**：host 半边插入 loader 入口；浏览器半边为 `dsh.client` bundle。
- 主题注册：`ctx.theme.register({ id, colorScheme, tokens })`，token 为**标量字符串**（每个色系一份）。
- 叠加层：`ctx.theme.overrideTokens(source, { '--token': { light, dark } })`，override 层要求**`{ light, dark }` 成对**
  字符串（与注册主题的标量 token 不同）。正式动态插件运行器会把同一 package 的 source 归一成一个来源，
  所以 accent、壁纸着色与弹窗透明度必须先在插件内合并，再提交为单个 appearance 覆盖层。
- 设置插槽：注册独立分节 `ctx.slots.inject('settings.section', ...)`（「Theme / 外观」），5 个功能行挂
  `settings.dreamSkin.item` 插槽下。
- 持久化边界：浏览器第三方只能用 `localStorage`（DSH `WEB_SETTINGS_NAMESPACES` 是硬编码白名单，第三方 namespace
  即使注册也答 `settings-not-exposed`）。
- 分享链接：主题包 base64 编码进 URL hash（`#dream-skin-pack=`），打开页面时自动导入。

## 目录结构

```
dsh-dream-skin/
├─ package.json            # dsh.bundle + dsh.client 清单、exports、test 脚本
├─ cordis.patch.yml        # 插入 dream-skin loader 入口
├─ lib/
│  ├─ index.js             # host 半边（no-op apply）
│  ├─ client.js            # 浏览器半边（__ModuleLoader__ bundle，含 P0）
│  └─ types/               # 类型声明（辅助，非运行时）
├─ tests/
│  └─ client.smoke.test.cjs# VM 冒烟测试（npm test）
├─ docs/
│  ├─ PROJECT.md           # 本文（项目说明）
│  ├─ design-philosophy.md # 设计哲学（品牌差异化宣言）
│  ├─ themes-spec.md       # 主题包 / 令牌契约
│  ├─ publishing-to-npm.md # npm / GitHub 发布指引
│  ├─ i18n/                # 多语言 README（en/ja/ko/es/fr/de/ru，主 README 只读中文版）
│  │  └─ README.*.md
│  └─ examples/            # 示例主题包
│     └─ sample-theme-pack.json
├─ .github/                # Issue / PR 模板
├─ README.md               # 主 README（中文）；英文/英译见 docs/i18n/
├─ CONTRIBUTING.md         # 贡献指南
├─ CODE_OF_CONDUCT.md      # 行为准则
├─ SECURITY.md             # 安全策略
├─ CHANGELOG.md
└─ LICENSE (MIT)
```

## 快速搭建 / 验证

```sh
# 1. 装入本地 web profile 并重启
dsh plugin --profile web add -w /path/to/dsh-dream-skin
dsh web

# 2. 无头验证 loader 是否进树
dsh --profile web --dump-config   # 应出现 `- id: dream-skin / name: dsh-dream-skin`

# 3. 语法自检
node --check lib/client.js && node --check lib/index.js
```

## 社区规范

- 想改代码：见 [CONTRIBUTING.md](../CONTRIBUTING.md)。
- 报安全漏洞：见 [SECURITY.md](../SECURITY.md)。
- 提交 Issue / PR 模板在 [`.github/`](../.github/)。

## 安全 / 版权说明

- 不直接修改 DSH 官方安装包或任何 `@deepseek-ai/*` 包的产物；本仓库仅依赖接口声明。
- 库内不包含任何需授权的图像素材；用户上传的背景仅保存在自己浏览器里。
- 如拟使用他人图像 / 主题，需自行确认授权。
