# Changelog

记录 `dsh-dream-skin` 的可观变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。从 `8.28.0` 起，版本号启用**日期式规则**：`M.D.X`（月.日.当日第几个版本），例如 8 月 28 日首个版本 `8.28.0`，当日再发 `8.28.1`，次日则为 `8.29.0`，以取代旧的 `0.4.x` 语义化版本。

## [8.30.0] - 2026-08-30

> **稳定版兼容修复（issue #43）。** `defineStore` 的宿主模块解析改为「先试 master 新名、落空回落稳定版旧名」的双目标 require，同一份预编译构建同时兼容 DSH 稳定版（≤ 0.1.1-rc.x）与 master，不再随宿主版本二选一。

### 修复
- **`require("@deepseek-ai/dsh-client-store") missed the module table（issue #43）**：8.29.0 为兼容 DSH master（`dsh-client-runtime` 已拆分为 `dsh-client-modules` / `dsh-client-store` / `dsh-client-locale`，平台模块表冻结为新 seed 名）把 require 目标改成了 `@deepseek-ai/dsh-client-store`，但稳定版（0.1.0-rc.6、0.1.1-rc.2 等）的模块表里没有这个名字——loader-entry 导入失败随即中止整个 shell 启动，浏览器侧全屏 `Failed to load plugins`（npm latest 当时已是 8.29.0，稳定版用户开箱即坏）。现把 `lib/client.js` 的该处 require 改为运行时双目标解析：先 `require("@deepseek-ai/dsh-client-store")`（master seed 命中），捕获落空错误后回落 `require("@deepseek-ai/dsh-client-runtime/client")`（稳定版 seed 命中，与 8.28.0 行为一致）；加载器查表落空抛的是普通 `Error`，可安全捕获。master 路径沿用 8.29.0 的实机验证，稳定版路径与 8.28.0 一致，`dsh.client.inject` 与 peerDependencies 双声明均不变。

### 完善
- **回归测试**：smoke 套件新增 issue #43 用例——模拟稳定版宿主（`dsh-client-store` require 抛表错、仅提供 `dsh-client-runtime/client`），断言 bundle 正常求值、表面完整且 `defineStore` 经回落模块注册成功。回归门 **35/35 通过**。
- **版本号**：按日期式规则，今天（8 月 30 日）首版为 `8.30.0`。

## [8.29.0] - 2026-08-29

> **DSH master 兼容修复（issue #41，PR #42，来自 @Max-Null）。** 把 `defineStore` 的 require 目标从 `@deepseek-ai/dsh-client-runtime/client`（master 上已拆分移除）改为 `@deepseek-ai/dsh-client-store`，修复新版 DSH 上 `Failed to load plugins` 的全壳启动失败。

### 修复
- **`require("@deepseek-ai/dsh-client-runtime/client")` missed the module table（issue #41，PR #42）**：DSH master（post-0.1.2-alpha.1）把旧 `dsh-client-runtime` 拆分为 `dsh-client-modules` / `dsh-client-store` / `dsh-client-locale` 等，冻结模块表（`PLATFORM_MODULES`）只剩 `react` / `@deepseek-ai/dsh-client-store` / `@deepseek-ai/dsh-client-ui-*` 等。预编译 bundle 对 `@deepseek-ai/dsh-client-runtime/client` 的裸 require 无法满足，浏览器侧直接报 `missed the module table`，并因任意 loader-entry 导入失败而中止整个 shell 启动（`Failed to load plugins`）。现把 `lib/client.js` 中 6 处 `defineStore` 的 require 目标改为 `@deepseek-ai/dsh-client-store`（导出同一 `defineStore` 契约）。`react` 等外部依赖在 master 上仍是平台 seed，无需改动。已由作者在 DSH master + `dsh web` 实机验证：shell 零错误启动、设置面板完整渲染 8 套皮肤 / 强调色 / 壁纸 / 主题包。

### 变更
- **peerDependencies**：新增 `@deepseek-ai/dsh-client-store`，同时保留 `@deepseek-ai/dsh-client-runtime`，兼顾 DSH master 与稳定版。
- **版本号**：按日期式规则，今天（8 月 29 日）首版为 `8.29.0`（覆盖 PR 中按 28 日计的 `8.28.1`）。

### 完善
- **测试适配**：smoke/persistence 的 `makeRequire` mock 改为匹配 `@deepseek-ai/dsh-client-store`，回归门保持 **34/34 通过**。

## [8.28.0] - 2026-08-28

> **版本号大变革 + 设置导航图标（PR #40）。** 正式切换为日期式版本号（`M.D.X`），并以社区同款方案把本插件「Theme/皮肤」设置行从默认齿轮替换为 Lucide palette（调色板）图标。

### 变更
- **版本号大变革**：由 `0.4.x`（语义化版本）改为 `M.D.X` 日期式版本——`M` 月、`D` 日、`X` 当日第几个版本。今天（8 月 28 日）首版 `8.28.0`；同日再发布按 `8.28.1`、`8.28.2` 递增；次日新版本从 `8.29.0` 起步。`package.json` / `package-lock.json` / `CHANGELOG.md` 同步更新，并新增本说明。
- **设置导航图标（PR #40）**：DSH 0.1.x 的 `settings.section` 无 icon 契约，外部插件 section 在设置页导航一律显示默认齿轮。以 MutationObserver 按当前本地化 label（zh/en）标记设置弹窗 nav 行（`data-dsh-dream-skin-nav`），再用 CSS mask 把图标替换为 Lucide palette（调色板 + 颜料点）。仅改 `lib/client.js`，无新增依赖，弹窗未打开时无副作用。

### 修复 / 完善
- **测试环境适配**：为 smoke/persistence 的 VM DOM mock 补齐 `document.head.append`、`document.querySelectorAll`、`MutationObserver`，使模块加载时的图标 IIFE 在回归门内正常执行，测试保持 **34/34 通过**。

## [0.4.15] - 2026-08-26

> **两处视觉/皮肤恢复的稳定性修复（PR #35、PR #37）。** 输入框卡片的毛玻璃模糊不再困住固定定位的 Tooltip（停止/发送按钮），页面布局不再被顶乱；同时修复了语言切换后皮肤被重置的问题——恢复保护额度改为「连续失败」预算而非「生命周期总次数」，成功恢复即清零，语言反复切换也能稳稳停留在第三方皮肤上。

### 修复
- **输入框 Tooltip 被毛玻璃困住、输入框被顶出布局（PR #35，来自 @wszhoho）**：`.uV2eYG_card`（输入框卡片）注入的 `backdrop-filter: blur()` 会让元素成为后代的**包含块**（containing block，与 `filter`/`transform` 同理）。停止/发送按钮的 Tooltip 是渲染在该卡片内部的 `position:fixed` 弹层，于是定位锚点从视口跳到了卡片——Tooltip 溢出到卡片右下角，并把输入框顶出页面布局。现将输入框卡片从 backdrop-filter 选择器中移除（保留半透明 token 填充，仍有玻璃质感），inline 警告卡片与 todo 弹层/坞站继续保留材质模糊。新增回归断言：输入框卡片不得成为 blur 目标。
- **语言切换后皮肤被重置为默认（issue #36，PR #37，来自 @yoshino-xiao7）**：DSH 切换语言并重新加载时会短暂把主题偏好恢复为内置 `system`，插件随即恢复用户保存的第三方皮肤。但 `skinRestoreCount` 统计的是插件生命周期内的**累计**恢复次数而从未在成功时清零——前 8 次语言切换都能正常恢复，第 9 次触发 `MAX_SKIN_RESTORES` 上限后插件不再恢复，界面永久回落到 Default/System（宿主持久化的 `dsh-dream-skin:skin` 其实仍是原皮肤，并非丢失）。现将恢复预算改为「连续失败」次数：在同步触发 `setTheme(savedSkin)` 之前记录本次尝试，当 `theme/change` 确认已恢复为保存的皮肤时清零计数。新增回归测试模拟同步 ThemeRuntime 事件及 12 次语言重载。

**34/34 测试通过**（新增 8 次以上成功语言重载的回归用例）。

## [0.4.14] - 2026-08-25

> **生产环境主题往返切换的壁纸/外观层修复（PR #34，来自 @yoshino-xiao7）。** 正式动态插件运行器下的皮肤往返切换（如 午夜黑 → Material 粉、液态玻璃 → Material 粉）不再残留上一套皮肤的背景/侧边栏洗色；同时把壁纸洗色、强调色、弹窗透明度合并为单个 appearance 覆盖层，修复它们互相覆盖的问题。

### 修复
- **正式动态运行器下往返切换皮肤残留旧皮肤洗色（PR #34）**：此前页面里独立提交壁纸、强调色、弹窗透明度三个 `overrideTokens()` 覆盖层，但正式动态客户端运行器会把同一 package 的所有 override source **归一成一个**，三者互相覆盖；且 v0.4.13 在 `theme/change` 侦听器内**同步**重算壁纸会再发一个内层 `theme/change`，后注册的呈现器可能用外层（未重算）的旧快照反向覆盖新快照，导致背景落后一个主题。现改为：
  - 把壁纸洗色、强调色、弹窗透明度**合并为单个 appearance token 覆盖层**，内部保留三张 token map、无交集，合并后一次 `overrideTokens()` 提交；
  - 新增 `rawActiveTheme()`，按 `preference`（system 时用 `active.id`）从注册定义解析**原始干净的主题 token**，彻底切断「把上一次已合成/已洗色的壁纸反馈进下一次」；
  - 把壁纸重算**延后到当前同步事件栈之后**（`setTimeout(0)` + 防重入 + 取消旧延迟任务，连续快速切换只应用最后一次）；
  - `setSkin()` 先 `writeSavedSkin(id)` 再 `setTheme(id)`，保证同步事件内延迟重算已读到新的选择；
  - 卸载时清理延迟定时器、清空三张 token map 并释放合并层。
- **README 英文版新增 growth-chart 章节（i18n，社区）**：`README.en` 补齐了英文成长图表说明。

**33/33 测试通过**（新增 production-facade 回归测试，覆盖「壁纸+强调色+弹窗透明度跨皮肤往返同时保留」「同 source 替换不发布中间未着色主题」「呈现器注册在插件之后最终仍收到壁纸快照」等场景）。

## [0.4.13] - 2026-08-25

> **壁纸遮罩自反馈循环修复（PR #33，来自 @yoshino-xiao7）。** 切换皮肤后「壁纸跟随皮肤」的遮罩不再被上一次写入的遮罩色污染，首次选 / 往返切换（如 默认→粉→午夜黑→粉）都能稳定用目标皮肤的原色着色。

### 修复
- **壁纸遮罩颜色被上一个皮肤污染 / 自反馈（issue #29 深化，PR #33）**：v0.4.11 虽已改为读取目标皮肤 token，但读取的是 `snapshot.active.tokens`——真实 ThemeRuntime 会把**所有 override 层合成进 `active.tokens`**，其中就包含本插件自己写入的壁纸覆盖层。于是插件算下一次遮罩时会把**上一次写入的遮罩色**当作输入，形成自反馈：首次从默认切到 Material 粉可能仍偏白，深色切回粉色可能残留深色。现改为按 `snapshot.active.id` 从 `snapshot.themes` 里取**原始注册主题**的干净 tokens 来计算主背景 / 侧边栏遮罩色，彻底切断自反馈；找不到对应主题时才回退 `active`（与旧行为一致，兼容旧版）。**32/32 测试通过**，新增针对真实 ThemeRuntime override 合成语义的回归测试（默认→粉、粉→午夜黑→粉两个往返，断言粉色遮罩为 `rgba(247,240,243,0.8)`）。

## [0.4.12] - 2026-08-21

> **通用 token 归位，修第三方插件界面可见性（issue #27）。** `--dsw-alias-bg-layer-1` 是 DSH 提供给所有 UI（含第三方插件）的通用语义 token，深色玻璃皮肤此前把它覆盖为近全透的白（`rgba(255,255,255,.04)`），导致第三方插件（如 dshmarket）的卡片背景近乎透明、背后内容透出造成文字视觉重叠；而「弹窗不透明度」滑块只覆盖 overlay/menu 两个 token，对它不生效。

### 修复
- **第三方插件界面文字叠在一起（issue #27 / PR #31）**：把 5 个深色皮肤的 `--dsw-alias-bg-layer-1` 从此前的近透明白改为**深色可读表面**（abyss `#1b1e28`、aurora `#162128`、nebula `#1c1a2a`、ember `#211a15`、midnight `#17171f`）。这样既挡住背后内容（消除文字重叠），又是深色底、浅色文字清晰（对比度 7.9~10.3:1）。
- **关于 PR #31 的取值说明**：原 PR 建议把 layer-1 抬到 `rgba(255,255,255,0.65)`。经对比度核算，65% 白会让 layer-1 变成中浅灰底，深色主题下的浅色文字（label 亮度约 245）与其对比降至 **1.03~1.42:1**（几乎同色、更看不清）。故本版采用**深色 layer-1** 而非亮白，语义上也更贴近 DSH 内置深色主题对 `layer-1` 的定位（深色内容面）。浅色皮肤（ivory/rose/mist，浅底深字）不受影响。

## [0.4.11] - 2026-08-21

> **壁纸遮罩切换皮肤后的兜底色修复。** 从深色切回浅色皮肤时，壁纸遮罩不再误用 DSH 内置的白色兜底，刷新后也不会有差异。

### 修复
- **切换皮肤后壁纸遮罩使用内置兜底色（issue #29）**：`setSkin()` 里 `syncSkinWith(id)` 原先在 `ctx.theme.setTheme(id)` 之后**同步**调用 `applyWallpaper2`，但此刻主题快照的 `active` 尚未切换/就绪，`shadeTokens2` 里的 `resolveBase/sidebar` 找不到目标皮肤 token，就回退到 `BUILTIN_BASE[scheme]`——浅色主题的兜底是白色，于是写入 `rgba(255,255,255,.8)` 这类错误遮罩，且没有在 active 就绪后校正，一直保留到刷新才恢复。现将 `syncSkinWith` 改为只同步选中态、**不再立即 re-shade**；壁纸遮罩的正确着色委托给 `theme/change` 监听（`syncSkin`），此时 `snapshot.active` 已是对应目标皮肤，可用正确 token 着色。换渐变时由 `setWallpaperKind` 兜底 re-shade，无遗漏路径。**31/31 测试通过**，新增 `rose→midnight→rose` 回归测试断言遮罩用 rose token 而非白色兜底。

## [0.4.10] - 2026-08-21

> **URL 壁纸安全加固。** 壁纸「图片链接」不再原样拼进 CSS：只放行 http/https/data:image 链接（javascript:/file:/data:text/html 等一律拒绝并提示），拼 CSS 时对引号和反斜杠转义，应用后对坏链做预载检查并提示；顺带清理三处低危项。

### 修复
- **URL 壁纸不校验不转义、坏链静默失败（issue #21）**：`readWallpaperUrl()` 此前只判断长度、`wallpaperBackgroundCss()` 把链接原样拼进 `url("...")`，链接带 `"`、`\`、换行或非法 scheme 时背景直接无效且无任何提示，设置的 javascript:/file: 等也会静默通过。现新增 scheme 白名单（仅 http/https/data:image）与 CSS 值转义，非法链接设置即拒绝并弹提示、输入框内即时红字反馈；历史遗留的非法值渲染时一律忽略，绝不上屏；应用后用 `new Image()` 预载，坏链给一次明确提示而非无声无息。
- **500 回显内部错误信息**：持久化 API 的 500 分支把 `error.message` 原样回显给浏览器，同源页面能看到文件路径等内部信息，现改为固定文案、细节只打 log。
- **状态文件权限过宽**：`~/.dsh/dream-skin.json` 存有壁纸 data URL（个人图片），`writeFileSync` 默认 0644 在 POSIX 共享机器上同机他人可读，现显式 `0600`（Windows 无影响）。
- **弃用 API 替换**：主题包分享链接编解码改用 `TextEncoder`/`TextDecoder`（替换弃用的 `escape`/`unescape`），UTF-8 字节完全一致、生成的 base64 与旧版相同，旧分享链接不受影响。
- **SECURITY.md 声明修正**：澄清 URL 壁纸是唯一会发起网络请求的功能（每次打开页面会向该地址请求图片），其余部分不主动发请求。

## [0.4.9] - 2026-08-21

> **左右侧栏皮肤一致。** 修复右侧工具面板（Files / 任务管理等）在深色主题下偏浅、与左侧导航栏不一致的问题。

### 修复
- **右侧工具面板偏浅、与左栏不一致**：DSH 的右侧工作区/工具面板（Files、任务管理等）背景使用
  `--dsw-alias-bg-module-platform` token，而插件皮肤此前**未覆盖**它，深色主题下它落到 DSH 默认的浅蓝灰
  （`--dsw-static-neutral-bluish-60`），于是右栏整块偏浅、与左侧深色导航栏对不上。现为 8 套皮肤各补充
  `--dsw-alias-bg-module-platform`：深色皮肤用与底色协调的深实色（abyss `#151821`、aurora `#131c20`、nebula
  `#171523`、ember `#1b1712`、midnight `#11111a`），浅色皮肤用近底浅色。此为 **token 级覆盖**，不依赖会随 DSH
  版本变化的类名，右栏自动跟随主题。已用亮度脚本校验 8 套皮肤该 token 与文字对比充足（差 207+），新增回归测试锁定。

## [0.4.8] - 2026-08-21

> **文档与注释修正（无运行逻辑变更）。** 修复多语言 README 图片断链、CHANGELOG 格式、代码注释/缩进问题。

### 修复
- **多语言 README 的 70 处图片断链**：`docs/i18n/` 下的 7 个多语言 README 在迁移时漏改了 `img src`，仍写成根目录相对路径
  `docs/screenshots/...`、`docs/previews/...`，从 `docs/i18n/` 解析会 404。已统一改为 `../../docs/...`，GitHub 与 npm 包内的
  截图/预览色卡均可正常显示。
- **CHANGELOG 0.2.2 标题同行拼接**：`## [0.2.2] - 2026-08-15### 修复` 中 `### 修复` 错误地拼在版本行末尾，已改独占一行。
- **代码注释 / 缩进清理**：`lib/client.js` 中「theme-spec.md→themes-spec.md」「wallp-paper→wallpaper」两处注释笔误，以及
  wallpaper store 两行缩进错位；纯格式修正，不影响任何运行逻辑。

## [0.4.7] - 2026-08-21

> **修正 0.4.6 的 layer-3 回归。** 深色主题下设置页出现浅灰「框」、浅色文字看不清的问题。

### 修复
- **深色皮肤设置页出现浅灰「框」、字看不清（0.4.6 回归）**：0.4.6 把深色皮肤的 `--dsw-alias-bg-layer-3` 抬到
  `rgba(255,255,255,0.5)`，而 layer-3 被 DSH 用于设置页的标签/卡片（agent 预设、插件库、插件设置等），这些卡片上的文字在
  深色主题下是浅色——深色底 + 50% 白 = 一块浅灰「框」，浅字压上去当然看不清。现将深色皮肤的 layer-3 改为**深色抬高实色**
  （abyss `#1a1d27`、aurora `#182128`、nebula `#1c1a28`、ember `#231b15`、midnight `#181820`）：既不透（修复 #18 的透视）、
  又是深色（浅字清晰）。浅色皮肤不受影响。若 0.4.6 已发布，请升级到 0.4.7。

## [0.4.6] - 2026-08-21

> **消息气泡与部分标签 / 选项卡补盖。** 修复未覆盖 `--dsw-specific-bubble` / `--dsw-specific-selector` 等语义 token、
> 导致消息气泡等仍用 DSH 默认蓝色的问题；同时抬高深色皮肤的 `--dsw-alias-bg-layer-3` 使标签卡片不再近乎透明。

### 修复
- **消息气泡 / 部分标签、选项卡仍用 DSH 默认蓝色（issue #18）**：DSH 把消息气泡背景映射到 `--dsw-specific-bubble`
  （默认 `--dsw-static-deepseek-50`，品牌浅蓝）、选项按钮到 `--dsw-specific-selector`（默认蓝灰），但插件皮肤此前未覆盖
  这两枚 token，导致在 ember / midnight / rose 等非蓝色主题下气泡与按钮仍是刺眼的蓝色、「未被覆盖」。现为 8 套皮肤各补充
  `--dsw-specific-bubble`、`--dsw-specific-bubble-highlight`、`--dsw-specific-selector`，映射到与各皮肤配色一致的可读表面。
- **深色皮肤标签卡片近乎透明**：DSH 把 agent 预设/插件库/插件设置等标签卡片背景映射到 `--dsw-alias-bg-layer-3`，而深色皮肤
  此前把它设到近似全透（`rgba(255,255,255,.085)`），这些标签卡片几乎看不见文字。现将深色皮肤的 layer-3 抬到可读的
  `rgba(255,255,255,0.5)`（磨砂玻璃），浅色皮肤不受影响。

## [0.4.5] - 2026-08-21

> **「弹窗不透明度」真正生效。** 修复 slider 只作用于个别选项卡卡片、对真实下拉 / 浮层 / 弹窗无效的问题。

### 修复
- **弹窗不透明度对菜单 / 浮层不生效（issue #9 复述）**：此前的设置只覆盖 `.Mbwy4a_card` 单一规则，对 DSH 实际的
  下拉菜单（模型选择器、输入触发、选项列表等）与浮层 / 对话框毫无影响，导致 0 与 100 看起来一样。现改为通过
  `ctx.theme.overrideTokens` 叠加一层覆盖，把滑块权重施加到 DSH 的语义 token `--dsw-specific-menu` 与
  `--dsw-alias-bg-overlay`（"overlay and popover background"）——0%＝全透、100%＝纯色，真实可见。同步更新 8 语言提示文案。

## [0.4.4] - 2026-08-21

> **下拉 / 弹层菜单可读性。** 修正部分皮肤下菜单（模型选择器、输入触发、选项列表等）近乎透明、文字难读的问题。

### 修复
- **下拉 / 弹层菜单过透明看不清**：DSH 把 `--dsw-specific-menu` 映射到 `--dsw-alias-bg-layer-3`，而皮肤为「清透」玻璃质感把
  layer-3 设成近透明的白色（深色皮肤约为 `rgba(255,255,255,.085)`），导致所有菜单几乎全透、文字难读。现将菜单重定向到
  皮肤保持不透明的可读抬高面 `--dsw-alias-bg-layer-2`（与对话框 / 设置面板同一填充），深浅色皮肤下菜单文字都清晰。

## [0.4.3] - 2026-08-21

> **内置主题（深色 / 跟随系统）在切换预设后失忆的补强。** 修复远端浏览器里内置 `dark` / `light` 主题偏好被 agent
> 预设重载冲回 `system` 的问题。

### 修复
- **内置深色 / 浅色在切换 agent 预设后变回默认（issue #11 复述）**：DSH 只在 loopback 浏览器把 `ui-theme.preference` 写进
  `$DSH_HOME/settings.yaml`；远端浏览器（如经 HTTP 访问的浏览器）的该偏好仅保存在进程内，一旦客户端重载 /
  `connection/reset`（切换 agent 预设会触发）就回到 `system` 默认。现插件同样记录最近一次的内置
  `dark` / `light` 选择（走本插件三层持久化），在「重载 / 连接重置」回落到 `system` 的窗口内重新套用；用户在稳定会话里
  显式选「跟随系统」则清空记录。针对内置偏好的专项回归测试已补齐，全部 28 项测试通过。

## [0.4.2] - 2026-08-21

> **弹窗可调 + 刷新持久化加固 + 材质一致性打磨 + 根目录精简。** 新增「弹窗不透明度」调节；为「刷新后主题失效」补充回归测试并加固还原路径；输入框去掉尖角外框、左右面板与侧边栏统一质感；多语言 README 迁入 `docs/i18n/`，根目录只留中文 README。

### 新增
- **弹窗不透明度（issue #9）**：设置 → 外观 新增「弹窗不透明度」滑块（0–100%，默认 94%），控制选项弹窗 /
  选项卡卡片（`.Mbwy4a_card`）的底填充透明度——调高更不透明、文字更清晰，调低更能透出背后内容。通过
  `--dsh-dream-skin-modal-fill` CSS 变量在启动与拖动时即时应用，并跟随现有三层持久化（缓存 / localStorage /
  host 文件）保存，8 语言文案同步。

### 修复
- **刷新后主题失效（issue #8）**：为「保存的第三方皮肤在页面刷新后仍能从 localStorage 还原」补充回归测试，
  覆盖刷新（全新模块 + 空缓存 + 从 `system` 起步）这一此前未显式验证的路径。刷新还原、跨重启 host 采纳、多次
  重采纳 sticky restore 三条路径现在均有自动化覆盖。
- **输入框「外层尖角框」**：旧的输入框底部全宽 scrim 渐变会在一张更宽的 `.uV2eYG_root` 上画出一个大矩形带，
  在有壁纸的皮肤下于圆角输入框外留下生硬的直角框。现根节点改 `background: transparent`，只保留圆角卡片的
  液态玻璃，可读性由卡片自身填充保证。
- **左右面板质感不统一**：右侧文件面板（`.nArs4W_panel`）此前回退到 DSH 默认近白半透明填充，与左侧栏的
  半透明暗色 `--dsw-specific-sidebar-fill` 明显不同。现右侧面板沿用与左侧一致的同款填充与发丝线；嵌套窗格
  显式透明以消除白色透底。
- **左侧栏固定区错位（「断裂」）**：工作区列表区有负外边距齐到栏边缘，但底部设置/操作区仍是内边距内的普通
  盒，二者接缝处产生一条竖缝。现让固定区与列表区对齐到同一边缘跨度，并去除接缝处分隔带/底框，使整个左栏为
  一个连续平面。

### 其他
- **根目录精简**：8 个多语言 README（en/ja/ko/es/fr/de/ru）从根目录迁入 `docs/i18n/`，根目录只保留中文
  `README.md`；主 README 语言切换链接同步更新，`docs/PROJECT.md`、`docs/publishing-to-npm.md` 与
  `package.json` 的 `files` 白名单对应调整。

## [0.4.1] - 2026-08-18

> **材质分层回归修复 + 输入体验打磨。** 修复设置面板/输入框的透明度问题，并为输入框区域引入安全的不透明遮罩。

### 修复
- **设置面板被「挤」进左侧边栏（严重回归）**：0.4.0 引入的毛玻璃材质注入给 DSH 侧边栏 / 主列**大容器**叠加了
  `backdrop-filter: blur()`，但 `backdrop-filter` 会创建新的包含块（containing block），导致 DSH 内
  `position: fixed` 的设置模态弹窗定位失效、被「困」在侧边栏里。已移除对大容器的毛玻璃注入；仅保留对
  **叶子卡片**（输入框/告警卡/小浮层）的安全液态玻璃。23/23 测试通过。
- **深色设置面板过透明，背后文字透出看不清**：`--dsw-alias-bg-layer-2`（设置面板用）从近全透的
  `rgba(255,255,255,0.06)` 提升为各色系高不透明（`rgba(带色深,0.85)`），模态层可读。
- **亮色设置面板过实、显土**：`--dsw-alias-bg-layer-2` 从 `0.95` 改为 `0.92` 清透玻璃（配合自带 blur），
  三个亮色主题（ivory / mist / rose）的设置面板、输入框统一 0.92 档——清爽利落又不闷、弥散光被柔化。
- **用户选项弹窗看不清文字**：选项弹窗 `.Mbwy4a_card` 与输入框共用 `--dsw-specific-input-major`，而输入框刻意
  很透明（深色液态玻璃），导致选项弹窗也过透、底字透出。现注入 CSS 以 `color-mix(base 94%)` 单独把它覆盖为
  高不透明——深浅色都保证选项文字清晰。
- **切换皮肤时背景不跟随**（注册回归）：每套皮肤都有自己的默认弥散光背景，但切换皮肤时若 localStorage 里
  已存过渐变，旧背景不会换走、仍停在上一个皮肤的图（如从液态玻璃切到星云紫，背景还是蓝白）。
  现新增 `wallpaper-follows-skin` 标记——皮肤自动配的弥散光标为「跟随皮肤」，切换时自动换成新皮肤的渐变；
  用户自定义壁纸（图片 / URL / 自定义渐变 / 历史）标为「不跟随」，切换皮肤绝不动它。兼容识别旧版无标记的状态文件。

### 新增
- **皮肤风格化命名**：8 套皮肤全面改名以体现设计取向，一眼看出风格——沉静蓝 / 极光青 / 星云紫 / 余烬橙 /
  午夜黑 / iOS 扁平 / 液态玻璃 / Material 粉；同步到 8 种语言字典与 README 预览卡。
- **输入框液态玻璃**：新增每皮肤 `--dsw-specific-input-major` 半透明 + `backdrop-filter: blur`，深色输入框
  保持 `rgba(255,255,255,0.08)` 液态玻璃、亮色 `rgba(255,255,255,0.92)`。
- **输入框底部 scrim 遮罩**：给输入框根容器一条「透明 → 高不透明 tip 色」渐变，把滚动上来的消息 / 
  「第 N 轮」监控行遮在输入框下方，杜绝与输入框文字重叠、画面杂乱。
- 新增安全回归测试：仅对叶子卡片 blur、绝不对大容器 blur（防止再触发设置弹窗错位），并断言选项弹窗被
  单独覆盖为可读高不透明。

## [0.4.0] - 2026-08-18

> **本次升级的主题：让换肤有「高级感」。** 8 套皮肤全面重构为 iOS / Linear 式清透冷调，配套弥散光渐变与品牌设计哲学——做「换肤界的 iOS」。

### 新增
- **8 套内置皮肤全面升级为 iOS / Linear 清透冷调高级感**（差异化壁垒）：重绘全部 Mirage 皮肤 token——
  底色改为干净的中性深灰 / 冷白而非墨黑 / 暖黄；面板玻璃改用「白色低透明浮升在深层上」的 Linear 式质感
  （半透明 layer + 同色系低透明描边）；强调色换成鲜亮纯净的青 / 靛蓝 /暖橘 / 蔷薇（弃用发灰旧色）。
  亮暗色各 4 套：暗色（abyss 靛蓝 / aurora 青绿 / nebula 紫青 / ember 暖橘 / midnight 纯黑）、
  亮色（ivory / mist / rose 清透冷白）。纯 token 生态内实现，不改 DSH 源码，测试全绿。
- **每皮肤内置 iOS 弥散光渐变**：8 套皮肤各配一套与配色呼应的多层 radial-gradient 高级光斑背景
  （柔和冷光 / 暖光弥散 + 同色系暗部分层），替代旧的生硬 3 段线性渐变；在「高级壁纸」推荐与
  「主题包」建议中即时可用。
- **选皮肤智能配背景**（premium material 联动）：用户尚未设置任何壁纸时，点选一套皮肤会自动挂载该皮肤
  的推荐弥散光渐变，让「材质高级感」一选即现；用户已自定义壁纸则完全不受影响。新增对应单测。
- **设计哲学文档**（`docs/design-philosophy.md`）：一份关于「什么算高级」的品牌差异化声明——六条准则
  （克制用色 / 清透材质 / 边界分层 / 留白 / 排版 / 细节光泽）+ 8 套配色逻辑 + 弥散光材质说明。README
  顶部品牌区重构为这套定位语，突出与「二次元题材全家桶」的差异。

### 修复
- **DSH Desktop 重启后主题 / 壁纸 / 设置全部丢失（严重）**：桌面端每次启动把 webserver 绑到
  OS 随机端口（`profile.js` 强制 `port: 0`），GUI 的 origin（scheme + host + port）因此每次重启都变，
  而浏览器 localStorage 按 origin 隔离——旧数据其实还在 leveldb 里，只是散落在上次端口对应的 origin
  下，于是「看起来全丢了」。官方 Web 的 origin 固定，不受影响；只有随机端口的环境（DSH Desktop）会触发。
  现为浏览器半身新增宿主持久化通道：
  - host 半身挂载 fenced JSON API `/dream-skin/api`（POST `get` / `set`），把状态原子写入
    `$DSH_HOME/dream-skin.json`（默认 `~/.dsh/`，跟随 `DSH_HOME` 环境变量），独立于 origin；
  - 浏览器半身改为三层持久化：内存缓存（同步读写面）→ localStorage（同 origin 兜底、首帧渲染）
    → host 文件（跨重启权威源），写入防抖 200ms 全量推送，启动时拉取并重放；host 通道不可用时
    静默降级回纯 localStorage，固定 origin 环境（官方 Web 等）行为与原版完全一致；
  - 首次启用时若 host 文件为空，自动把本地 localStorage 已有值迁移过去，升级不丢老设置。
- 新增测试：host API 单测 8 项（get/set/merge 多写者安全/null 清除/type fence/415/413/405/404/400/403 端点到
  状态文件）与 client 三层持久化单测 3 项（host 启动采纳 / 防抖推送 / 不可用降级），连同既有回归共 20 项。

### 新增
- **侧边栏透明度可统一 / 分别设置**（issue #7）：新增「侧边栏跟随主背景透明度」开关（默认开启，让侧边栏与
  聊天背景透明度一致、不再割裂）；关闭后显示独立的「侧边栏透明度」滑块供分别调节。8 语言文案同步。

### 修复
- **第三方皮肤多次被宿主重采纳后回退**（PR #6）：ThemeRuntime 只在 host 作用域持久化 system/light/dark，
  异步/多次采纳会把已保存的第三方皮肤（如 midnight）冲回默认；改为持续但有条件的 sticky restore（带次数上限，防
  极端回环；用户选「默认」后不再恢复）。修 CSS 简写顺序。

## [0.3.0] - 2026-08-17

### 新增
- **多语言（i18n）**：设置 UI 词典新增 **日本語 / 한국어 / Español / Français / Deutsch / Русский** 六种语言
  （与既有中/英共 8 种），跟随浏览器语言自动生效；README 同步提供 8 种语言版本，顶部含语言切换导航。
  新增测试强制所有语言词典 key 与占位符完整性。
- **自带安装技能**：`.agents/skills/dsh-skin-install/`（SKILL.md）——dsh 在仓库目录内运行时自动发现，
  用户说「安装一下这个皮肤包」即可由 agent 完成定位、确认、安装与验证全流程（借鉴 dsh-deep-whale 的
  `dsh-skin-install` 模式）。
- **README 全面重构**：顶部新增「⚡ 一句话安装」区块（复制一句话给 DSH 或一条 CLI 命令即可安装）；
  安装章节扩展为 **npm / GitHub 固定 commit / Release tarball / 本地克隆** 四种方式，附验证命令。
- **皮肤市场收录**：dsh-skin-market 的 `registry/skins/RevolutionLA__dsh-dream-skin.yml` 条目已更新到
  0.3.0（固定 commit 安装目标 + 新描述），收录 PR 见 dsh-skin-market #2。

### 文档
- README 多语言：`README.ja.md` / `README.ko.md` / `README.es.md` / `README.fr.md` / `README.de.md` /
  `README.ru.md`（社区翻译）。
- README / README.en 同步修正过时的插槽名：`settings.general.item` → `settings.section` +
  `settings.dreamSkin.item`（与 0.2.4 独立「外观 / Theme」分节的实现一致）。
- CONTRIBUTING.md：修正「`npm version` 会自动同步 README 徽章」的错误说法（徽章是动态的，无需同步）；
  新增「自带技能」章节说明维护规范。

## [0.2.6] - 2026-08-17

### 修复
- **高级壁纸 / 清除壁纸操作抛 `ReferenceError`（严重）**：`removeWallpaper` 与 `setWallpaperKind` 是模块级
  函数，却调用定义在 `apply()` 内部的 `syncWallpaper` 局部变量——每次点「应用链接 / 渐变」或「清除壁纸」
  都会抛错，设置页 store 不刷新、UI 停在旧状态。已将壁纸 store 的 bookkeeping（`syncWallpaper` 与其
  revision/绑定）提升到模块作用域，未绑定时安全空操作。
- **先设渐变/URL 后再选本地图片无效**：`setWallpaper` 现在会先把 kind 重置为 `image`，否则
  `wallpaperBackgroundCss()` 仍返回旧的渐变/URL，背景不变而预览显示新图。
- **本地图片不进入「最近使用」**：`setWallpaper` 现在会 `pushWallpaperHistory("image", …)`，与 URL/渐变一致。
- **URL 历史缩略图空白**：URL 项缩略图现在也包 `url("…")`（裸 URL 不是合法 CSS background 值）。
- **分享链接冲突覆盖 / 失败消费链接**：`tryImportFromHash` 对已存在于库中的包 id 不再静默覆盖注册
  （避免库显示旧 manifest 而运行时用新 tokens）；注册失败时保留 hash，下次加载可重试。
- **Accent 行的基准色不随换肤刷新**：`theme/change` 现在同步 accent store 的 `base`（品牌色），
  无自定义强调色时不再显示上一个皮肤的颜色。
- **`ctx.locale.bind` 无兜底**：`localeT` 现在在 locale 服务缺 `bind` 时回退为恒等翻译，alert 不再可能
  拖垮整个设置分节。
- **刷新后强调色 UI 不恢复**：`accentInjected` 首次同步写死 `revision: -1`，被 store 守卫
  （`revision <= d.revision`）永远拒绝，导致已保存的强调色在重载后不在设置页显示。改为与用户操作
  同款递增计数器，首次同步即可通过守卫。
- **分享链接重复导入**：`tryImportFromHash` 在 `importedPacks` 未查重，同一链接反复打开可能重复
  注册同一主题包；现在与 `importPack` 一致去重。
- **主题包卡片显示技术 id**：包库卡片改显示 `manifest.name`（包名），不再裸露 `dream-pack:` 前缀 id。
- **本地化补齐**：「移除」按钮与导入/移除提示（alert）从硬编码中/英文改为走 `t()` 词典，
  跟随当前界面语言（`ctx.locale.bind`）。

### 清理
- 删除无调用者的旧版 `applyWallpaper` / `shadeTokens` 与专属常量（合并后已由 `applyWallpaper2` /
  `shadeTokens2` 取代），消除死代码。
- `shadeTokens2` 移除已不再使用的 `sidebarAlpha` 参数（侧边栏透明度统一读 `readSidebarOpacity()`）。
- `syncAdvWallpaper` 的 revision 改为前置 `++`，与其它 store 风格一致。

### 文档
- README / README.en / PROJECT.md 与 `packs.empty` 文案同步：主题包库只展示**导入的包**，
  内置 8 套皮肤在「皮肤」行选择。

## [0.2.5] - 2026-08-15

### 🎉 里程碑
- **已被 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 收录**（PR #354 merged）。
- README 顶部新增 **"Awesome DSH Plugin"** 徽章。
- 插件会**自动出现在 dsh-market 的主题 Tab**（数据源 `awesome-dsh-plugin.com/plugins.json` 已含 `dsh-dream-skin`）。

## [0.2.4] - 2026-08-15

### 变更
- **设置里新增独立的「外观 / Theme」分节**：皮肤、强调色、背景图片、高级壁纸、主题包全部收进这一个分类，
  不再平铺在「常规」页面（更干净、更像一个完整「皮肤」入口）。
- **皮肤选中态优化**：选中的皮肤卡片用「品牌色光圈 + ✓ 徽标」唯一高亮，切换皮肤时即时跟随，
  不再残留白色高亮框；点击皮肤同步刷新 store（单调 revision）。
- **强调色显示优化**：当前强调色改为「小圆点 + hex 文本 + 「选色…」按钮」，取代原先难看的
  「圆角矩形套矩形」取色块；保留 12 个典型色块点选与「随机 / 恢复主题色」。

### 新增
- 新的壁纸示例（`wallpapers/`）与 README 实机截图（`docs/screenshots/`）。
- README 补充「安装 / 更新 / 卸载」新手指引与「支持本项目」号召。

## [0.2.3] - 2026-08-15

### 新增 / 改进
- **皮肤选中态更清晰**：选中的皮肤卡片现在带**右上角 ✓ 徽标** + 稳定的中性选中背景（不再依赖可能发白的 `interactive-bg-hover`），切换皮肤时选中框/✓ **立即跟随**（`setSkin` 直接同步 store + 重着色，不依赖事件时序）。
- **强调色提供 12 个典型色块预设**：点击即选（蓝色系/绿色/青色/紫/橙/红/黄/粉等），同时保留选色盘与「随机」。选中色块有描边高亮。
- **壁纸「最近使用」历史**：最近最多 5 张壁纸（本地图 / URL / 渐变）以缩略图展示，点击即可换回。

### 说明
- 若你在**旧版崩溃（递归栈溢出）后的同一浏览器会话**里看不到皮肤/强调色生效，请**完整重启 `dsh web` 并 Ctrl+Shift+R 强刷**——DSH 会把崩溃过的设置项标记为「待重载」，重启后即恢复正常。

## [0.2.2] - 2026-08-15

### 修复
- **强调色的「随机 / 恢复主题色」无响应**：`accentInjected` 每次 `sync` 传固定 `revision=0`，而 store 的 revision 防抖
  （`revision <= d.revision`）会在第一次更新后（`d.revision=0`）拒绝后续更新 → 点第二次之后没反应。改为维护递增的
  `accentRevision`。
- **高级壁纸的渐变预设小框显示灰色**：渐变按钮只设置了 `presetswatches`（尺寸/边框）而**没有背景**，导致按钮显示
  默认灰/白。改为 `background: g`（直接使用渐变值）。
- **皮肤设置标题去掉括号系列名**：`皮肤（Mirage 幻梦）` → `皮肤`（中英同步），避免观感怪异。
- 说明：皮肤/强调色等设置在**旧版崩溃（递归栈溢出）后的 session** 里会被 DSH 标记为「崩溃剔除」（abdicated）导致
  点选无响应/选择框不移动；0.2.1 已修复递归，**升级后请完整重启 DSH 并强刷**，使被剔除的入口重新加载。

## [0.2.1] - 2026-08-15

### 修复（重要）
- **修复壁纸叠加导致的无限递归 / 设置页卡死**：`applyWallpaper2 → overrideTokens` 会触发 `theme/change`，
  我们的 `syncSkin` 又去重新应用壁纸 → `overrideTokens` → 死循环，导致浏览器 `Maximum call stack size exceeded`，
  DSH 的 slot 机制把受影响入口当「崩溃」剔除（表现为预置主题色不显示、透明度/模糊拉杆按不动）。
  改为在 `applyWallpaper2` 里加重入保护（re-entrancy guard），每次着色只调一次 `overrideTokens`。
- **修复壁纸预览图 URL 错误**：`syncWallpaper` 之前把 CSS 包装的 `url("data:...")` 存进 store 的 `url`，
  用于 `<img>` 预览时产生非法请求（431）。改为存储纯 data URL。
- **移除 `AccentRow` JXS 属性里对 `useMemo` 的调用**（改为普通计算），避免 Hooks 用法的潜在隐患。

### 新增
- 回归测试：`apply()` 在 `overrideTokens` 同步触发 `theme/change` 时不会栈溢出（`tests/client.smoke.test.cjs`）。

## [0.2.0] - 2026-08-14

### 新增（P0 差异化能力）
- **主题包格式 + 导入 / 导出**：`*.dsh-theme.json` = 格式标记 + 版本 + manifest（id/name/作者/色系/accent/tokens）；支持导入文件、一键应用、复制分享链接（编码进 URL hash，拿到链接的人打开即自动导入）。
- **每用户强调色 Accent**：为当前皮肤叠加自定义品牌强调色（`overrideTokens` 层，不动皮肤本身），支持「随机」与「恢复主题色」。
- **壁纸 2.0**：支持图片 URL 与渐变预设、每皮肤建议渐变、自动弱化（聚焦任务时降低干扰）。
- **本地主题包库**：内置皮肤 + 导入的主题包集中展示，一键应用 / 收藏。
- **换一个试试（surprise me）** 与 **收藏**。
- **校验 + 回滚**：导入时校验格式 / 必填 token / 颜色合法性；失败或移除时安全回退。
- **冒烟测试**：`npm test`（VM 测试覆盖 factory 求值、`apply` 挂载、主题包导入/持久化）。
- 示例主题包：[`docs/examples/sample-theme-pack.json`](./docs/examples/sample-theme-pack.json)；规格见 [`docs/themes-spec.md`](./docs/themes-spec.md)。

### 修正
- 统一 `window.location` / `window.history` 引用，避免依赖全局单字。

## [0.1.0] - 2026-08-14

### 新增
- 首个可用版本：向 DSH web GUI 注册 **Mirage 幻梦** 系列 8 套主题预设。
- 在 **设置 → 常规** 新增两行：
  - **皮肤 / Skins**：8 套预设 + 「默认」（跟随系统）。
  - **背景图片 / Wallpaper**：上传本地图片 + 透明度 + 模糊 + 移除。
- 壁纸以 `z-index: -1` 背景层 + `overrideTokens` 半透明叠加实现，内层表面保持不透明可读。
- 皮肤 / 壁纸设置通过 `localStorage` 持久化，跨刷新存活。
- 双插件结构（host `lib/index.js` + 浏览器 `lib/client.js`），支持 `dsh plugin --profile web add -w <path>` 安装。

### 说明
- 与 Codex-Dream-Skin 不同，本插件原生接入 DSH 的 `--dsw-*` token 主题系统，无需 CDP 注入、不改安装包。
