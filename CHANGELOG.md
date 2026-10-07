# Changelog

记录 `dsh-dream-skin` 的可观变更。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。从 `8.28.0` 起，版本号启用**日期式规则**：`M.D.X`（月.日.当日第几个版本），例如 8 月 28 日首个版本 `8.28.0`，当日再发 `8.28.1`，次日则为 `8.29.0`，以取代旧的 `0.4.x` 语义化版本（日期按维护者本地时区 UTC+8 计）。

## [10.6.1] - 2026-10-06

> **预设皮肤重设计轮（纯内部质量轮，无外部 PR）。** 8 套 Mirage 预设从「手调色值」整体迁移为**从一台 OKLCH 设计系统解算生成**（`scripts/skin-system.cjs` → `scripts/apply-skin-system.cjs` 写入 bundle），并首次引入**每皮肤专属默认参数**（弥散光浓度/模糊、侧栏与输入框透明度、弹窗透明度、玻璃材质）。改造前基线（**按当前这把尺重算**，即 27 项/皮肤 × 8 + 目录 1 = 217 调色门，加 9 工艺门 = 226 项；10.6.1 发版当时是 26 项/皮肤 = 209 + 9 = 218，更早的评审按那一版旧尺复算为 81/145，口径不同，本文件一律用当下的尺。重算方式是把 10.6.0 的 `lib/client.js` 直接喂给今天的 `scripts/skin-audit.cjs` / `scripts/craft-audit.cjs`——两个审计都是纯函数，不依赖工作树）：旧 8 套皮肤 **115/226**（调色 109/217 + 工艺 6/9；比改造前的 118/186 低，是因为尺子从 22 项/皮肤一路加到今天的 27 项，新增项里有 issue #88 那 17 枚「宿主会读、皮肤从未定义」的槽位 token——手调时代的皮肤不可能有它们。10.6.1 发版时的同一份重算是 107/218；后来加的第 27 项 `token-shape` 三套旧皮肤全过，因此分母 +8、分子也 +8），目录可区分性 FAIL（abyss/nebula/midnight 三者之间读作同一套皮肤），abyss 强调色在画布上仅 4.04:1，tertiary 文字在气泡上不达 AA。改造后：**226/226 全过**（调色 217/217 + 工艺 9/9），全套 `npm test` 172→**346 项全绿**（10.6.1 发版时为 302；本轮新增四个门文件共 38 项——`host.slots` 9、`hashes` 11、`desktop.claims` 6、`desktop.fontscale` 12，并扩充两个既有文件 +6 项——`package.host_compat` 4→8、`skin.quality` 40→42；10.6.1 那批九个门文件 111 项是 `skin.quality` 40、`craft.quality` 19、`docs.numbers` 9、`color.science` 9、`previews` 9、`repo.hygiene` 5、`generator.safety` 3、`compat.window.docs` 5、`host.gap` 12；其余 19 项是既有文件里的整改用例——`client.smoke` +15、`client.persistence` +4）。

> **这份 10.6.1 覆盖两件事**：① 皮肤系统重设计（下文「变更」起）；② 该轮**发布前评审的 15 条整改**（issue #70–#84，见下文「追加轮：发布前评审整改」）。评审的整改清单与三方记录是内部攻防材料，**只留在维护者本地**（不随仓库发布，仓库里没有那个目录，此处也不给链接），且不随本版修改。

### 变更
- **配色引擎**：新增 `scripts/lib/color.cjs`（零依赖 OKLab/OKLCH、WCAG 2.1、APCA 0.1.9、alpha 合成反解）与 `scripts/skin-system.cjs`（感知明度八层阶梯、文字三级对着最差表面双尺求解、强调色在约束内最大化色度、信号色带约束旋转、半透明表面二分法落点）。皮肤由每套四个设计意图（主色相/画布明度/强调色相/反弹光色相）生成，40 token 全部可证明。
- **每皮肤默认参数**：`SKINS` 新增 `glow`（弥散光渐变串，取代旧 `wallpapersSuggestionsFor` 里第二份会漂移的渐变表）与 `defaults`；`applySkinDefaults()` 只在值为出厂种子（factory 戳）时写入，**用户亲手调过的滑杆在换肤后不被覆盖**（有行为测试钉住）。
- **预览管线**：`scripts/skin-data.cjs` 不再手抄调色板（旧值已过期），改为从设计系统投影；`scripts/generate-skin-mockups.cjs` 重写为「迷你 UI」实感预览（真实 token 画的侧栏/气泡/输入框/信号色标签，`--html-only` 可只出 HTML），`docs/previews/*.png` 全部重照（720×460@2x，无头 Chrome）。
- **回归门**：新增 `tests/skin.quality.test.cjs`（bundle == 新鲜构建、全皮肤审计、目录可区分性、审计检查集钉死防静默删减、7 处变异证明可翻红、预览投影与发货 token 逐项比对）；`npm run skin:check / skin:audit / previews` 三个脚本入口。

### 追加轮：工艺层审计（回答「每个模块都验证了吗」）
- 上一版的 121 项只证明了**调色 token**。被追问后发现三层没验：**模块层**（token 合格 ≠ 每个模块取用的是合格 token）、**材质常量层**、**圆角/布局层**。新增 `scripts/craft-audit.cjs`（7 项门）+ `tests/craft.quality.test.cjs`（10 项，含 7 处变异）堵上：
  1. `module-coverage`：14 个模块（画布/左右侧栏/输入框/玻璃填充/弹窗/卡片/描边/悬停 + 宿主绘制的气泡/tip/代码块/选择器）逐一比对「消费的是不是被审计的 token」，且每套皮肤都发货。**结果：40 个 token 里有 6 个发货了却从没被审计**（品牌淡色、抬升按钮面、状态淡色、markdown 标签、滚动条两级）——这是上一版"121 项全过"里最大的空洞，已在调色审计中补齐 3 条新门（`tints` / `elevated-button` / `scrollbars`），145/145。
  2. `glass-scheme-aware`：抓到**真缺陷**——液态玻璃的描边/掠光/边缘是写死的 `rgba(255,255,255,…)`，只为一个 scheme 作过者。白描边压在 ivory/mist/rose 的浅画布上对比度约 1.03:1（等于消失），`mix-blend-mode: screen` 还会把整块面板洗白。已改为 4 个 CSS 变量，暗色取值逐字节不变，亮色另给一套（亮顶边 + 极淡暗底边、`normal` 混合）。
  3. `radius-inherit` / `layout-neutral`：覆盖层必须 `border-radius: inherit`（否则在宿主圆角卡上盖出方角），且不改动宿主盒子尺寸/定位（唯一放行的是那条侧栏接缝对齐规则）。
- 顺带修掉一个靠"拍脑袋定 alpha"的缺陷：`ivory` 的 markdown 标签在暖米色画布上被稀释到偏离品牌色相 **34.6°**，读起来是暖灰而不是品牌蓝。淡色 alpha 现在由约束**解算**（合成后色相偏差 ≤20° 的最小权重），暗皮肤反而更淡了（0.16→0.12，更克制）。
- **亮色玻璃常量是作者的，不是解算的，且未经真机复核**：亮色 rim 0.55/0.70、edge 0.10 由本仓带过的设计先例（顶部亮 catch light + 暗底边）推得，无头 Chrome 渲染确认"看得见、不刺眼"，但真机 DSH 上叠加宿主背景的最终观感仍待下一轮实机复核——这是本版诚实清单里最靠前的一条。

### 追加轮：发布前评审整改（issue #70–#84，15 条）
> 评审汇总在 #69（P0 8 / P1 5 / P2 2，判 NO-GO）。本节只记「改了什么、凭什么算改了」；三方评审与裁定原文属内部攻防材料，只留在维护者本地，不随仓库发布，本版也不改动它们。

**P0（8 条）**
- **#70 生成器就地直写 `lib/client.js`**：写入中断会留下截断 bundle。`scripts/apply-skin-system.cjs` 改为**临时文件 + 原子替换**，并做写后自检（重解析 `SKINS` 块与内存值深比对，不一致不落盘）；`--check` 只报告、不改文件。
- **#71 出厂弹窗种子 0.6 → 0.92 未作行为变更声明、R6「字面量钉」被改成派生式**：见上文「行为变更」；R6 恢复为**真字面量**，并新增「出厂皮肤的 `modalOpacity` 必须等于 R6 写下的那个字面量」的一致性门（两处只能同时改）。
- **#72 `parseColor` 静默放行非法颜色形状、非有限值不判负**：对非法形状严格化、`NaN`/`Infinity` 一律判负、补 `alpha = 1` 边界门——此前非法 token 能 18/18 全绿并打印凭空的对比度数字。
- **#73 `SKINS.defaults` 七键中四键无值域门**：表驱动值域门（每键给类型与区间）；`wallpaperBlur: 800`、`sidebarOpacity: 3.4`（alpha > 1）实测翻红。
- **#74 craft-audit 两项门是源码子串匹配**：去字符串化——按**语义**断言（比较两套玻璃常量的实际取值，以及该方案要求的方向），并按 **selector 定位**（不再「选择器字面量存在即通过」；两套常量整体互换对旧门全绿）。
- **#75 第二张注入表（nav-icon sheet）完全在工艺门之外**：工艺门覆盖全部注入表，并新增**漏表对账门**（`createElement('style')` 站点计数 vs 已解析表数，新增注入点即红）。
- **#76 文字对比的审计面 ≠ 求解面 ≠ 宿主消费面**：审计面单源化，并把**有宿主消费者的 tinted 面**纳入约束集；三套浅色皮肤 tertiary 在 markdown 内联代码上的 3.78–4.24 已修到自订 4.5 线以上。
- **#77 文档数字 6 处与实况不符且无任何机检**：数字逐处订正 + **机检门**（见下）；`glow` / `defaults` 不进主题包已在 `docs/themes-spec.md` 显式声明为 schema v1 边界。

**P1（5 条）**
- **#78 APCA 反极性分支误用正常极性算式**：改为 swap operands + 系数 1.13，并用 apca-w3@0.1.9 的参考向量（含反极性向量）钉住。
- **#79 glow 整体重掷使 `followsSkin()` 的 ≤0.4.0 兼容分支变死码**：新增**一次性迁移**——8 条旧内置渐变按「长度 + 64 字符前缀 + cyrb53」识别，命中即改存**当前皮肤**的 `glow` 并补 `wallpaper-follows-skin=1`。两条红线编进守卫而非写在注释里：用户自设壁纸不动（`kind` 必须是 `gradient`、串必须逐字命中、`follows=0` 一律退出——所有 `follows=0` 的写入点都是用户动作），旧出厂照片不以任何路径回来（只写渐变）。指纹常量由 `tests/client.persistence.test.cjs` 从 `tests/fixtures/legacy_skin_glows_10_6_0.json`（v10.6.0 真实串）**反算核对**，不是手抄。落地后的**第二遍「定态」重写是必需的**：factory 预写按设计可被宿主值覆盖，而 sealed 值不进宿主推送，少了它标记永远到不了 `dream-skin.json`（有变异钉住）。
- **#80 玻璃亮暗分套押宿主 `body[data-ds-dark-theme]`**：改挂插件**自有** scheme 属性——宿主 dispose 会擦掉该属性，且原注释里的兜底方向写反了。
- **#81 `--dsw-alias-brand-primary-soft` 在宿主侧 0 处消费（死 token）却参与 tints 门评级**：死 token 处置 + 新增**消费者对账门**（发货的 token 必须能指出真实消费者，或按声明进入豁免清单）。
- **#82 `npm run skin:check` 既不在 `npm test` 也不在 CI，且 `core.autocrlf` 下必先归一化**：新增 `.gitattributes`（`* text=auto eol=lf` + 各扩展名 + 资产 `binary`）、`scripts/normalize-eol.cjs`（一次性归一 + `--check`；问 git 自己哪些是文本文件，绝不静默重写孤立 CR）、`tests/repo.hygiene.test.cjs`；CI 里 `skin:check` **排在** `npm test` 之前（顺序有断言）。

**P2（2 条）**
- **#83 预览 PNG 使 npm tarball 从 930.6 kB 涨到 2.5 MB，且 PNG 内容无任何门覆盖**：`docs/previews` 移出 `package.json` 的 `files`（实测 **2.5 MB → 263.4 kB**，文件数 30 → 22），136 处文档图片引用改指 GitHub raw；新增每皮肤三指纹（tokens / card 标记 / PNG 字节 + 由 IHDR 解析出的像素尺寸）与 `--check`；脚本在无浏览器时**非零退出**并打印"拒绝报告成功"，堵掉「什么都没做却报绿」。
- **#84 换肤写入笔数三方口径互相矛盾**：见下节。

### 写入笔数口径：三个计数器，分别计量（#84）
评审给的三个数——「3 publish / 111 笔」「publish 2 → 3」「5 → 19」——**不是矛盾，是三个不同的计数器**，此前没人声明自己读的是哪一个。本版逐个声明并各自设上限：

| 计数 | 数的是什么 | 不该被读成 |
|---|---|---|
| `publish` | 向宿主请求 token 层的**次数** | 层里有多少 token |
| `setProperty` | `documentElement` 上的 CSS 自定义属性写入数 | 设计系统定义了多少 token |
| `setItem` | `localStorage.setItem` 次数（`skin`、7 个 authored 默认、provenance 快照各自独立键） | 有多少设置被改 |

`publish` 还会因**采样窗口**不同而不同（同步 2、定态 3——壁纸重着色落在定时器上），这就是两次诚实测量会不一致的原因。门因此钉**同步窗口**（确定性、无定时器），再单独要求**定态窗口停止增长**（单次采样看不见爬升，而失控 `overrideTokens` emit 在真机发生过一次）。

- **真缺陷**：`saveFactorySnapshot()` 序列化整张 provenance 表，却按被播种的键各调一次——一次换肤把同一个存储键重写 **7** 次。新增 `withFactorySnapshotBatch()`（`finally` 里兜底 flush，中途异常也不丢 provenance），实测 `setItem` **19 → 13**、单键重写 **7 → 1**，`publish` / `setProperty` 不变。
- **两个反向变异各自都能翻红**（去掉 `saveFactorySnapshot()` 的批内延迟 / 去掉使延迟生效的批作用域），都把计数推回 **19 / 7**——即评审报的那个 19。变异同时带一条守卫：变异后的写次数必须 `>= control`，因为「把被测代码删掉」的变异不是变异（这条守卫是被真实踩坑换来的：把批作用域换成裸 `(() => {` 会与尾部 `});` 配成一个**从未被调用**的括号箭头函数，循环被整体删掉、写次数从 13 掉到 5，看起来像"门失效"）。
- **侧栏联动问题用测量回答、不靠推理**：`applySkinDefaults()` 走普通 `writeStorage`，**换肤不释放** `sidebar-link`（用户拖滑杆才释放：0.5 → 0.4 且 link 1 → 0）；「从未碰过滑杆」与「调回出厂值」**故意不可区分**（provenance 按**值**记），但用户自己调过的值一定保住。
- 现行基线已写入 `docs/desktop-support.md`，并明确作废该文件里那条旧口径（它数的是层内槽位不是层数、测在 #84 修复前的构建上、且从未数 `setItem`）。

### 文档数字机检（#77）
新增 `tests/docs.numbers.test.cjs`：**现场调用** `scripts/skin-audit.cjs` 与 `scripts/craft-audit.cjs` 算出门数，再逐份比对 README / 7 份译文 / `docs/design-philosophy.md` / 本文件里陈述门数的那些行——改错任一处即红。`npm test` 的用例总数同理由该门**现场加载**整套件数出（`node:test` 被替换为记录器，只登记不执行；源文件正则数不准，`readme.roadmap.test.cjs` 的 22 条里有 21 条是在 locale 循环里生成的）。两道守护：门的**作用域消失**（段落被删）必须报错而不是静默通过；`docs/i18n/` 新增一份译文而未登记进门的比对清单时，必须红。

### 追加轮：rc.2 / alpha.1 适配（issue #85–#94）

> 评审把 DSH `0.2.0-rc.2`（`latest` + `next`）与 `0.2.1-alpha.1`（`alpha`）对照本机 `0.2.0-rc.1` 逐包比对，结论是**升级不会把插件打坏**（平台 token 值零漂移、锚点零位移、主题服务 API 未变、manifest 三版本全 PASS），欠账在覆盖面 / 口径 / 已到眼前的悬崖三类，汇总为 #85。**本轮 #86–#94 全部闭环**（#85 伞状条目保持开启，等评审复核后由评审方关闭），逐条状态如下。

- **#86 兼容窗口（已闭环）**。窗口上界 `0.3.0` 是刻意的（宁可拒绝，也不注入未测宿主），但此前只写了机制，没写**用户看到什么、怎么出来**。现在 `docs/desktop-support.md` 的闸门一节写明：到点不是报错而是**东西不见了**（皮肤回默认外观、设置里 `Theme / 外观` 整节消失，宿主只在日志留一行），并给出两条出路——等本插件对新宿主实测后放宽窗口（唯一被验证过的路径），或应急用 `dsh plugin allow-version dsh-dream-skin@<版本> <运行时版本>` 自行开豁免（显式标注为未验证组合、不背书）。
  新增常驻门 `tests/compat.window.docs.test.cjs`（5 项）补上"文档区间 = manifest 区间"这条**此前完全靠手抄、无任何机检**的缺口：窗口从 `package.json` 的 `@deepseek-ai/dsh*` peer 现场读出，逐个比对登记过的**活跃**声明点（README 兼容表行、`docs/desktop-support.md` 闸门节与 0.2.x 表行），并按区域（region，不是"出现次数"）定位。三条边界编码进门里：① **活跃声明被门看着，历史记录不被改写**——`CHANGELOG.md` 与 README 的按版本记事属冻结历史，改它们等于篡改记录（有"未登记文档不得声明窗口"的守护，逐条点名）；② 六个 peer **必须共用同一个区间**（某个 peer 自带区间就是窗口悄悄变两个的起点，实测该变异翻红）；③ 六个 peer **必须都是 optional**，否则"宿主跳过我们"会变成"npm 装不上"——那是另一种、更糟的症状，不能只差一次编辑。
  三个方向的变异实测全部翻红：改 manifest 不动文档、改文档不动 manifest、给单个 peer 单独区间。
- **#87 桌面版兼容声称降级到证据支持的程度**。README 与 7 份译文里的官方桌面版一行此前写「预期可工作（Electron，同前端，**沿用插件机制**）」，句末那半句比字面窄得多，且没有任何测量在后面：宿主 CLI **没有 `desktop` 的 shipped profile 模板**，照某些第三方文档教的写法走，用户会落进一个空 profile、重启后什么都看不到。现在正面证据只留可检的一条——官方桌面版**不需要**新的 `dsh.client.platform` 值（`dsh-client-modules` 丢弃一切非 `"web"` 声明，而宿主自带的 21 个客户端包全部声明 `"web"`，实测于 `0.2.1-alpha.1`）；负面证据是 shipped profile 模板里没有官方桌面版的名字，`DEFAULT_PROFILE_BUNDLES` 只有 `["@deepseek-ai/dsh-base"]`（不含 `dsh-web-app`），所以**不能**教用户用某个 profile 名。措辞改成**机读戳记**：九份文档各带 `<!-- desktop-claim: load-expected-unverified -->`，只加强措辞而不改戳记即翻红。新增 `tests/desktop.claims.test.cjs`（6 项，4 处变异：删戳记 / 把 `--profile desktop` 写回任一份 README（`=` 与空格两种写法都拦）/ 改成 `desktop-claim: verified` / 删掉证据文档里的判断依据与"不需要新 platform 值"这条正面结论）。
- **#88 正向 token 缺口（并修掉两条从未跑到被测代码的旧变异）**。此前的普查只回答**反向**问题（「我们发货的 token，宿主有人读吗」，`scripts/host-consumers.cjs`）。本轮补上**正向**问题：宿主自己在 `design_platform_css_default` 里**声明**了哪些彩色 token，我们有没有定义？两把尺必须分开用——反向数的是 `--dsw-*` 的文本提及（`0.2.0-rc.1` 上 880 处），正向只数**在宿主默认表里声明且带色值**的 42 枚：42 声明 / 36 被读 / 我们 ship 57 → 扣掉已覆盖的余 **16 条缺口**，逐条写进 `scripts/data/host-gap-dispositions.cjs`，由 `scripts/lib/host-gap.cjs` + `tests/host.gap.test.cjs`（12 项）常驻看守。**顺带查到两条旧变异其实从没跑到被测代码**：它们指向的 `--dsw-alias-border-l3` / `--dsw-alias-bg-skeleton` 是 `cover` 分类，按构造**根本不在冻结缺口里**，于是断言要么崩在 `undefined` 上、要么永远为真。已把第一条重新指向 `--dsw-alias-bg-mask-1`（一个确实被测量的 `not-skinned` 条目），第二条改成 `delete` 该条目，逼规则 2 点名孤儿。
- **#89 `menu-group-header-fill` 收口（同批 `turn-trigger-*` 明确勿动）**。rc.2 新增三个 token，性质不同：`--dsw-alias-turn-trigger-bg` 与 `-hover` 是宿主**自己派生**的（`var(--dsw-…)` 指向我们已经发货的 token ⇒ 不干预），`--dsw-alias-menu-group-header-fill` 是**真缺口**（一颗色字面量），现在按 94% alpha 覆盖。判据与清单写进 `docs/themes-spec.md` 新增一节，机械判据是：`var(--dsw-…)` 指向已发货 token ⇒ 派生、勿动；色字面量 ⇒ 真缺口、必须处置。`scripts/skin-audit.cjs` 新增第 27 项检查 `token-shape`（R9b）——把**每一枚**发货 token 按 `/^(#[0-9a-f]{6}|rgba?\(…\))$/i` 判形态，读者清单**从 bundle 现场解析**（`POPUP_TOKENS`），不另抄一份。第一版把「`POPUP_TOKENS` 里有一枚没有皮肤发货」判成红——那等于和 #88 的 `computed` 分类自相矛盾（`--dsw-specific-menu` 由插件每次发布时自行推导，本就没有皮肤发货），已改为在 detail 里报「N shipped, M computed at runtime」。`tests/skin.quality.test.cjs` 补两处变异（空格分隔的 `--dsw-alias-menu-group-header-fill` 必须翻红，`#303136` / `rgb(48, 49, 54)` / `rgba(48, 49, 54, 0.94)` 作绿色对照；读不到的 `POPUP_TOKENS` 不得看起来像已检查的），用例数 40→42。
- **#90 alpha.1 `data-shell-bottom` 与壁纸水洗的交互**。把 `dsh-client-ui-layout` 在 rc.1 / rc.2 / alpha.1 三版解包实测：包体 31749 / 31749 / 32075 字节，`bottomRow` 0 / 0 / 3，`data-shell-bottom` 0 / 0 / 1，行轨道在 rc.1/rc.2 是 `grid-template-rows:100%`、alpha.1 是 `minmax(0, 1fr) auto`；**冻结语料里 `shell.bottom` 的注册方 = 0**。既然无注册方时 `renderSlot` 渲染空元素、而 alpha.1 那一行 `auto` 会塌成 0 高，当前**没有可上色的面**，所以本版不写代码、只记录边界（issue #90 三选一里的第二支）。分类真源 `scripts/lib/host-slots.cjs`（`SLOT_DISPOSITIONS` = `unmounted` / `skinned` / `out-of-scope`，`since: 0.2.1-alpha.1`，锚点 `data-shell-bottom`），`scripts/host-consumers.cjs` 新增 `measureSlots()` 把结果冻进普查，`tests/host.slots.test.cjs`（9 项，5 处变异：注册方出现 / 语料不可读或监视清单为空 / 未处置或自造分类或漏锚点 / 把 `since` 倒填且无注册方 / 给一个缺席的面判 `skinned`）看守。这条判断**自带到期条件**：注册方计数一旦非 0、或 `data-shell-bottom` 出现在语料里，门就翻红逼着重做决策。`docs/desktop-support.md` 的锚点依赖表新增该行，写明 0 计数与到期条件，并在未验证清单里记下「该底栏在活页面上一次都没看过」。
- **#91 cordis peer 覆盖不到 `4.0.5-alpha.1`，以及"哪些 peer 参与判定"文档未写**。两把尺此前被混用：宿主闸门用 `includePrerelease: true`，且只读名字带 `@deepseek-ai/dsh` 前缀的 peer；npm/pnpm 的 peer 解析用**默认**语义，预发布版本只在与比较集合**同一个 `major.minor.patch` 三元组**的轨道上才可能被放行。因此 `>=4.0.1` **覆盖不到** `4.0.5-alpha.1`——**评审在 issue 里建议的那条修法本身是错的**，只有 `>=4.0.5-0` 或并集才行。现取 `^4.0.1 || >=4.0.5-0 <5`。验证不靠自证：拿宿主**自己 ship 的 `semver 7.8.5`** 对 12 个范围 × 23 个版本跑出 **276 行**判定（`includePrerelease` 与 `_default` 两把尺各一列，落在 `tests/fixtures/peer_range_verdicts.json`），再要求一个**零依赖**的重写实现逐行同意。脱糖里最容易搞反的一点已单列：node-semver 只在开关打开时才把 `-0` 写进**它自己发明的**边界（`pr = options.includePrerelease ? '-0' : ''`），而展开的 x-range 上界两种情况下都自带 `-0`——反过来就会让 `>=5` 声称覆盖 `5.0.0-alpha.1`。`tests/package.host_compat.test.cjs` 4→8：新增「求值器复现 276 条真实判定」「cordis 区间覆盖 `4.0.5-alpha.1` 且仍有界，并**钉死** `>=4.0.1` 覆盖不到」「区间回退时翻红，而宿主闸门对 cordis 本来就是盲的」「README 与 `docs/desktop-support.md` 都写明哪两条 peer 不参与判定」。
- **#92 注释里的失锚哈希 + 同族扫描门**。扫描我们的发货面共得 **9 个不同哈希基**，其中 **4 个在装好的宿主上 0 命中**：issue 报的 `BynINW`（只出现在注释里），外加 `bqrRRG`、`nArs4W`、`qDHVXG`——后三个是材质表与 `MATERIAL_SELECTOR_PROBES` 里的**活选择器**。这正是 10.5.0 那轮第三方评审（T2）已经要求公开声明、却一直没发布的状态，所以本轮连同这个家族一起交代。处置：注释不再教一个死哈希（改成按结构描述——`APP_FRAME_SELECTOR`，即 `div:has(> [data-shell-overlay])`，由 `html[data-windows-titlebar]` 把关），三条活着的死选择器各领一条**带日期的豁免**（`scripts/data/dead-hashes.cjs`，`kind: legacy-host-line`、`since: 0.1.0-rc.6`，每条 why 约 400 字；理由是 README 仍声明支持 `0.1.0-rc.6 ~ 0.1.x` 而本仓库没有 0.1.x 语料——**这一半是假设，不是测量**），且每条豁免都作为 finding 在门的输出里露面，不静默通过。新增 `scripts/lib/hash-literals.cjs` + `tests/hashes.test.cjs`（11 项）：正则的作用域贪婪到**最后一个下划线**（否则 `pI_x6G_frame` 会被读成基名 `pI`），"混合大小写"才是排除 `SETTINGS_NAV`（全大写）与 `host_census`（蛇形）的判据；变异覆盖「死哈希塞回**注释**里也得被抓」（证明扫描器读注释、不只是选择器）、「宿主真有的哈希保持绿、未测量的基先被报告、补测后转绿」（要的是存在性，不是禁令）、「空语料 / 空扫描必须失败」、「过期 / 无用 / 无理由 / 未知分类的豁免」。
- **#93 会话字号 10–22 px：口径收窄 + 不假称已测**。宿主在 **`0.2.0-rc.2`（`latest`）** 把步进器区间从 `12–17 px` 放宽到 `10–22 px`（默认仍 `14 px`），**新装用户已经在新区间里**，而我们所有「可读」结论都是在 14 px 上测的。三版包内 README 原文实测还给出两条 issue 正文里没有的事实：① **这次放宽是纯边界变更，机制一字未动**——三版 `gradient-shadow-text.css` 的推导原文**逐字节相同**（唯一差异是一处 markdown 链接目标），步进器那句也只差区间数字；② 宿主自己的阶梯说明把谁算进去可以逐句引下来——用户气泡与 composer 草稿跟着走，flow-row 标题/摘要/表格低一档（宿主公式 `setting −1 at ≤14, setting −2 above` ⇒ **10 px 时次级档是 9 px**、22 px 时 20 px），而**小字与代码是固定字号**，这把暴露面砍掉一块。我们这侧实测：`lib/client.js` 里 `--dsh-content-font*` **0 次**、`fontSize:` **19 处**全部落在 `{10…14}` px 的本插件 UI 常量内、`font-size:` 声明 0 处；对比度门与 `scripts/lib/color.cjs` 的 `apcaContrast(textRgb, bgRgb)` 都**不接受字号入参**——所以极值改变的是**要求**，不是我们**测出的数**。**诚实结论：10 px / 22 px 各零次实测**（本机实装 rc.1 仍是 12–17，而为验证去升级实装属禁止操作）。口径收窄为「在宿主字号 10–22 区间内的默认值 14 px 下实测，极值未测」，写进 `docs/desktop-support.md` 的未验证清单（带日期 2026-10-06、按极值分别记）。新增 `tests/desktop.fontscale.test.cjs`（12 项，10 处变异）**只守三件事**：这段披露不被删、区间不与宿主包矛盾、我们没有偷偷去驱动宿主阶梯。**极值本身的实测仍靠人工，门不代替观测**——issue 允许的另一种写法是明确回一句"这条靠人工，无门"，我们选择做披露门、同时把那半如实标成人工。
- **#94 语料范围口径可枚举**。此前 #88 / #89 / #90 的「零变化」结论没有声明语料边界，读者无法判断 `dsh-client-ui-sidebar-browser` 这类包在不在里面。现把语料钉死为宿主**安装目录**（287 个包 / 1035 个代码文件），把 `packagesOnDisk` / `packagesWithCode` / `packagesWithoutCode` / `packagesScanned` 冻进普查，并新增纯函数 `corpusShortfall()` 点名语料缩水时丢了什么；扩展名过滤这个盲区也如实记账（`packagesWithoutCode`，本机实测 0）。一条教训记在案：早先一次临时探针用 `path.relative(...).split(/[\\/]/)` 数出荒谬的「1035 个包」，纠正后是 **287 个包、287 个带代码、0 个盲区包**——普查其实一直在扫全量安装，但**没有任何断言看着它**，这正是 #94 要补的那一块。
  另按 #85 的**显式作废**记录：上一轮"`--dsw-alias-bg-mask-1` 遮罩变深"结论作废（那是同版本内浅/深两套 scheme 各自的声明，版本间值变化实测为 0，错误来自逐行 diff 读含两套 scheme 的文件）；"三个新 token 与字号 10–22 归给 alpha.1"更正为**都发生在 rc.2**。

### 行为变更（显式声明）
- **新用户首启的弹窗不透明度种子：0.6 → 0.92。** 10.5.1 曾公开裁定「保留 0.94 / 0.6」，本版推翻该裁定，理由是本轮的目标是「下载即最佳观感」：`0.6` 的对话框会让身后的会话直接读穿，正是 issue #67 的观感来源。现在该种子取自**出厂皮肤 nebula 自己的 `defaults.modalOpacity`**（`FACTORY_SKIN_DEFAULTS` 派生，不再复述字面量）。影响面与边界：
  - **仅全新安装**（无 `factory-applied` 标记且无任何已存该键）会看到 0.6 → 0.92；
  - **动过该滑杆的老用户完全不受影响**——`applySkinDefaults()` 只写「出厂种子」或「从未存过」的键，用户自己调过的值一律不动（有行为测试钉住）；
  - 未动过滑杆的 existing 安装仍是 0.94（JS 回退值，本版未改）；
  - 每次换肤时，对话框不透明度会跟随该皮肤的 `defaults.modalOpacity`（8 套分别 0.90–0.96）。
- R6 的「字面量钉」恢复为**真字面量**（此前改成从 `skinById('nebula')` 反取，等于对设计系统改数值全盲），并新增一条一致性门：出厂皮肤的 `modalOpacity` 必须等于 R6 里写下的那个字面量，两处只能同时改（issue #71）。

### 文档
- README 与 7 份 i18n README：皮肤描述按新设计改写，补「每皮肤自带默认参数 + 用户值不被覆盖 + 226 项质量门（217 调色 + 9 工艺）」说明；这组数字不再手抄——`tests/docs.numbers.test.cjs` 现场调用两个审计脚本算出门数并逐份比对 README / 7 份译文 / `design-philosophy.md` / 本文件（改错任一处即红），`npm test` 用例总数同理由该门现场加载整套件数出；`docs/design-philosophy.md` 的配色逻辑一节重写为设计系统的实际规则（阶梯、双尺文字对比、信号色带、alpha 反解、glow 归属）。
- **收尾时改掉一处同族缺陷**：README 与 7 份 i18n README 的架构说明仍写着「皮肤 `colorScheme` 驱动 `body[data-ds-dark-theme]`」——正是 #80 要拆掉的那条链路，即「文档陈述与实况不符」，与本轮 #77 同类。8 份文档一并改写为自有根属性 `html[data-dsh-dream-skin-scheme]`，并写明宿主 `dispose()` 会擦除 `body[data-ds-dark-theme]`、该属性缺席的窗口里暗色皮肤会拿到亮档常量。`docs/review/` 是评审存档，按纪律**不改动**。

### 未验证 / 边界（如实记录）
- **真机像素复核未做**：本轮验证全部为无头 Chrome 渲染 + 数值审计 + 测试矩阵；皮肤在真实 DSH Web 上的实机观感（尤其 mist 的液态玻璃叠加宿主背景）仍待下一轮真机复核。
- 预览图为生成渲染而非真机截图，README「实机截图」一节（`docs/screenshots/`）仍是 10.6.0 的旧界面，与本轮 token 改动的差异不影响版式，仅配色深浅不同。
- `midnight` 画布明度 0.150 属刻意的 OLED 极暗，弱光环境外的可读性由三级文字双达标兜底，但非暗光爱好者的舒适区——保留为「极简沉浸」定位而非默认推荐。

## [10.6.0] - 2026-10-06

> 外部 PR 收口版（PR #65，@Waser750）：右侧栏（dockkit 面板）三处与左侧不一致——侧边栏透明度滑杆管不到右栏、右栏全屏时对话从面板背后透出、鼠标划过「文件」胶囊会失去底色而旁边的「新建终端」不会。本版把这三处对齐，全部挂在宿主自己发布的**稳定 data 属性**上，不碰构建哈希类名。本版的评审走的是 PR 复核轮（四条阻塞 + 合并前维护方独立变异抽查），**没有另起三方对抗评审**：改动面是 38 行 CSS + 3 条用例、且每条都有能翻红的门，按本仓验证预算口径处理（如实写明依据，不冒充更高强度）。

### 修复
- **右侧栏与左侧栏同 token、同滑杆**（PR #65 规则①）：宿主把 docked 面板与空面板画在 `--dsw-alias-bg-base`（会被壁纸洗成半透明的画布色）上，「侧边栏透明度」滑杆对它完全没有通路——不管拉多少都透。现在两条 dockkit 面改由 `--dsw-specific-sidebar-fill` 上色（与左栏、标题条同一枚 token、同一个滑杆），并**限定在 `[data-sidebar-right-panel]` 祖先之内**：dockkit 是宿主共享组件（`data-dockkit-host` 取 `float|dock` 并带列索引），第二列 dock 或将来居中列的 dock 不该继承一个从未为它测过的侧栏底色。
- **右栏全屏时不再透出对话**（PR #65 规则②）：全屏面板盖住主列，而画布水洗是半透明的，于是"全屏"读成了"透过面板看聊天"。水洗在时该面改取皮肤的**不透明基色** `--dsh-dream-skin-composer-base`（回退 `--dsw-alias-bg-layer-1`）。取舍如实写进规则上方注释：全屏态的不透明是硬性质，侧边栏滑杆在全屏面板内因此不再可达——这是"完全遮住对话"这一读法的必然结果，要给 alpha 设下限属另一次改动。
- **引导胶囊 hover 不再失去底色**（PR #65 规则③）：`dsh-client-ui-sidebar-right` 的 `:hover` 是**替换**底色（换成半透明 hover tint），隔壁终端胶囊却是**叠加**（在自己的 ghost button 之上再叠一层）——同一枚 token 两种行为，于是"文件"一划过去就变透明。现在保留底色、把 tint 叠上去（与终端胶囊一致），并用 `:not([data-sidebar-right-guide-entry=terminal])` **排除终端胶囊**：它本来就已经自己叠色，再上一层等于双重半透明。真机命中面实测：`files` / `dsh-context` 两枚被覆盖，`terminal` 被排除。
- **回归门补齐**：新增 3 条用例（docked 面 + 右栏作用域 + "不得被水洗门挂上"的反向断言、胶囊 hover 与"抹掉底色"旧写法不得回归、水洗标记生命周期）。其中那条**恒真守卫**是评审抓出来的原病灶：早先的断言从 `[data-dockkit-host=dock]` 起匹配，永远看不见前面的选择器，于是对"规则①被加上水洗门"完全无感；现在按**整条规则**断言（选择器列表含前缀 + 声明体，逐行剥注释）。

### 测试
- `npm test` **172 项全绿**（10.5.1 为 169 项，本版 +3 全部来自 PR #65）；`node --check lib/index.js lib/client.js` 与 `npm run typecheck`（tsc 5.6.3）同门通过。
- **合并前维护方自跑 5 处变异，逐条要求翻在指定断言原文上**（隔离副本、退出钩子还原、事后 md5 与改前一致）：X1 拆掉终端胶囊排除 → 翻红 `the hover rule excludes the capsule kind that overlays its own tint`；X2 拆掉规则①右栏作用域 → 翻红 `every docked surface is scoped to the right panel`；X3 把水洗门塞进规则①选择器（正是恒真守卫原病灶的反例形式）→ 翻红 `the docked-panel rule is not gated on the wallpaper`；X4 全屏两分支之一丢水洗门 → 翻红 `every fullscreen surface is gated on a live wash`；X5 拆掉水洗标记撤回 → 翻红 `and it is retracted with the wash layer`。贡献者侧另有 6 处反向验证（PR #65 正文）。
- **一条归因精度说明**：X3 若改用"前缀形式"（把水洗门加在整条选择器最前面），会先被作用域断言抓红而不是被反向断言抓红——两种形式都能翻红，但为了钉住"反向守卫本身可失败"，抽查用的是中缀形式。
- 四条阻塞（终端胶囊误涂 / 作用域缺失 / 恒真守卫 / 缺生命周期用例）与整改过程留在 PR #65 的公开评审记录里；重演到 10.5.1（`aecaa58`）之上 rebase 干净，合入提交 `75e42b3`，main 全矩阵 CI（Node 18/20/22/24）绿。

### 文档
- `docs/desktop-support.md`：锚点依赖清单新增「右侧栏 dockkit 面」一行（宿主稳定 data 属性；漂移探针**不覆盖**这些属性——探针只采哈希类名，属性改名同样静默，按 PR 正文记为已知盲区）；用例数 169→172 并记入本版 5 处变异与实机复核。

### 实机复核（本机 dsh `0.2.0-rc.1`，link 安装即工作树；2026-10-06，内置浏览器 `evaluate_script` 机读，**非像素目视**）
- 状态 `ready`、`lastError: null`；本插件只发那一条**预期**的漂移警告（含 10.5.0 加的"覆盖边界"那句）。页面其余报错逐条归属其它插件：`plugins.bundle.config` 卡片注册被拒（dsh-web）、`sidebar.footer.action` / `shell.overlay` 槽崩溃（非本插件注册的槽）、`/smooth-stream/settings.read` 405（dsh-smooth-stream 自己的端点）。
- 三条新规则都在注入表内，且**真命中活元素**：`[data-sidebar-right-panel] [data-dockkit-host=dock] > section` 命中 1；水洗 + 全屏规则命中 1；`:not(terminal)` hover 命中 2（`files` / `dsh-context`），`terminal` 被正确排除。
- **右栏此刻就是 `fullscreen` 且水洗在**：dock 面板计算底色 = `rgb(18, 16, 26)`（完全不透明；令牌链上该面继承到的 `--dsh-dream-skin-composer-base` 为 `#12101a`，即"规则生效"与"令牌可用"同步——两者由 `shadeTokens2` 同处发布，不存在拿不到基色的窗口期）。这就是"全屏透出对话"在真机被修掉。
- 10.5.1 的通路同时可见：`--dsw-alias-bg-layer-2 = rgba(30, 27, 44, 0.5)`（nebula 自身色相 + 滑杆 alpha 0.5）、overlay/menu `rgba(18, 16, 26, 0.5)`、composer fillVar `40%`、`::before` `color(srgb … / 0.4)`。样式注入幂等：material ×1、nav-icon ×1。
- **本轮没有写操作**：全部为只读探测，用户既有设置（皮肤 nebula / 材质 frosted / 弹窗 0.5 / composer 0.4 / 壁纸 0.4 / 侧栏联动开 0.14 / 填充 cover）逐项读回核对后保持原样。

### 未验证 / 有意推迟（本轮如实记录）
- **非全屏（`push`）态下规则①随侧栏滑杆变化**未真机切换验证——切换会改用户当前的面板布局；已验的是选择器真命中、`--dsw-specific-sidebar-fill` 可达、以及 X2/X3 变异能翻红。
- **真 hover 行为态**未触发（`:hover` 无法从页面 JS 强制），命中面与排除面已实测。
- **`dsh-better-sidebar` 未装本机**：该插件语境下的观感结论仍以贡献者真机证据为准；机制、选择器命中与令牌链由我们独立复现。
- 官方桌面壳（`0.2.0-rc.2`）运行期挂载仍未验；像素目视仍未做（内置浏览器 `visibilityState=hidden`，截图不可用）。
- 全屏不透明的硬性质是否要改成"带下限的 alpha 以保留滑杆通路"，属产品取舍，本版按贡献者与评审的"完全遮住对话"读法执行，改动另议。

## [10.5.1] - 2026-10-06

> 滑杆兑现轮（issue #67 + PR #68，@ltmroberthk915 报告并提案）：弹窗透明度滑杆此前只驱动窄卡片规则、对设置对话框等由 `--dsw-alias-bg-layer-2` 绘制的面无效；liquid 材质的输入框把滑杆拉到最实端仍透出内容。本版把滑杆接到第三枚 token，并把 composer 填充权重按材质重映射。本版经过蓝军→第三方→中立裁定三轮对抗评审——**同一模型分角色，非独立第三方**（三个角色本轮均由子代理分别担任，无 10.5.0 轮那类"裁定与整改同人"的降级；如实标注，全链不使用"独立复核 / 独立裁定"措辞）。评审记录为内部攻防材料，**不随仓库发布**（`docs/review/` 已 gitignore，且无任何公开文档链接指向它）。

### 修复
- **弹窗透明度滑杆驱动 `--dsw-alias-bg-layer-2`**（issue #67 主修复，来自 PR #68）：对话框 / 设置面板由第三枚语义 token `--dsw-alias-bg-layer-2` 绘制，而滑杆此前只覆盖 `--dsw-alias-bg-overlay` / `--dsw-specific-menu`——把滑杆拉到任何值，这些面都保持皮肤设计 alpha（内置深色皮肤 0.85）不变，报告者据此判定"滑杆没作用"。现在 `POPUP_TOKENS` 三枚同层覆盖：滑杆显示值 = 实际 alpha 值（0% 全透 ↔ 100% 全遮）；layer-2 保留皮肤自身色相、仅 alpha 随滑杆。纯 token 覆盖（无 backdrop-filter），不重新触发 fixed-modal containing-block bug（composer 侧的同族教训）。
- **layer-2 严格解析回落**（维护修订；裁定 B1-B）：pack 皮肤可合法声明 `hsl()` / `hsla()` / 空格分隔等形态（`docs/themes-spec.md` 颜色校验本就说它们合法），而结算路径会把这类值**原样透传**（设计 alpha 保持不变）——滑杆在这类皮肤的对话框上表现为"死的"。现在只有 `#rgb` / `#rrggbb` 与逗号分隔 `rgb()` / `rgba()` 保留皮肤色相，其余**一律回落该 scheme 基础色**——滑杆全程有效（0%↔100%），仅色相不取自皮肤。契约写入 `docs/themes-spec.md`；`lib/client.js` 的 docstring 与 Issue #67 注释同步改写（裁定 B3-1/B3-2：原文"两枚 token""scales to the ACTIVE base"已不成立）。
- **composer 在 liquid 材质下真正到达不透明**（PR #68 主体）：此前 CSS 端还要把填充权重再乘一次填充率（双重缩放），把输入框"透明度"滑杆拉到最实端，liquid 仍有 15% 透明残留——正是报告的另半。现在权重在 JS 侧按材质重映射：liquid 透明端 15% 地板 → 实端 100%（`::before` 计算色**无 alpha 分量**）；frosted 恒等（identity）；CSS 乘法删除。报废变量 `GLASS_FILL_SCALE_VAR` 随之移除（维护修订：其唯一消费者已不存在，负向断言"退役变量不得重返样式表"钉死）。厚度仍跟**原始**权重（0→0px、1→24px），不参与重映射。liquid 的 tint 从固定中性白改为皮肤自身基色（`--dsh-dream-skin-composer-base` 变量回退）。
- **换肤时 popup 覆盖层在守卫下延后重解析**（PR #68 的机制，本版补门）：`theme/change` 后（壁纸 wash 路径与无壁纸路径）经 `_applyingWallpaper` 守卫 + `setTimeout(0)` 单次重解析三枚 token——否则换肤会把 boot 时烘焙的旧皮肤调色板留在对话框上；而 `overrideTokens()` 的无条件 emit 若不设守卫有历史实机背书（CHANGELOG `[0.2.1]`）的死循环面（`applyWallpaper2 → overrideTokens → theme/change → syncSkin`，设置页卡死、栈溢出）。R1/R2 用例按仓库准入规则**双采样**（+500ms/+2500ms 计数相等且 <10）钉住收敛。

### 行为变更（显式声明，裁定 T1）
- 弹窗透明度滑杆的默认落点——**0.94**（未存过该键时的 JS 回退）与 **0.6**（出厂种子）——从本版起同时决定**由 `--dsw-alias-bg-layer-2` 绘制的所有面**（设置对话框 / 模态框等）的背景不透明度。此前这些面完全不受滑杆控制、保持皮肤设计值：内置 8 皮肤为 **0.85（五个深色）/ 1.0（两个 hex 不透明）/ 0.6（一个浅色）**。即：没动过滑杆的用户，对话框背景默认观感会变为 0.94 / 0.6。这是修复的必然语义——滑杆显示值必须等于 token 实际值（"滑杆诚实"红线），不存在"未动滑杆就不生效"的合法实现；属决策项，不是缺陷。
- **决策：保留 0.94 / 0.6**（0.6 是出厂观感、0.94 不改动 existing 安装；该键是耦合旋钮——它同时驱动 overlay / menu / 卡片全部弹窗面，为"设置对话框更实"单调字面量会连带改掉已调校的卡片 / 菜单观感；真要按面拆分默认值属代码级改动，另立议题）。
- 实机两态记录（2026-10-06，机读）：滑杆 6（=94% 不透明）→ 对话框 `rgba(30, 27, 44, 0.94)`；滑杆 40（=60%）→ `rgba(30, 27, 44, 0.6)`；随后恢复用户原值 0.5。（滑杆为"透明度"语义：stored alpha = 1 − 滑杆/100。实机观察到并记录的消费面为设置对话框；其余消费该 token 的面同样随之改变，本版写"由 layer-2 绘制的面"而不逐一枚举。）

### 测试
- `npm test` **169 项全绿**（10.5.0 为 159 项，本版 +10：PR #68 净 +2——新增 2 条 + 按新语义重写 1 条［"liquid 中性白"旧断言被"liquid 皮肤基色"取代］；维护修订 +2；裁定整改批 R1–R6 六条）；`node --check lib/index.js lib/client.js` 与 `npm run typecheck`（tsc 5.6.3）同门通过。
- **15 处变异全部翻红**（隔离副本树实测、逐条打印翻红断言原文、工作文件不受影响；harness 进入时对当前活动文件快照、退出钩子还原；每条先核对锚点唯一命中）：M1 `POPUP_TOKENS` 摘掉 layer-2、M2 严格解析门拆除（静默透传回归）、M3 liquid 地板移除、M4 CSS 乘法回归（双重缩放）、M5 材质 chip 切换不再重发重映射、M6 liquid tint 回中性白、M7 无壁纸重解析分支移除、M8 壁纸路径不重解析 popup、M9 厚度改跟重映射后的有效权重（liquid 0.5 时 12→14px）、E4 `fillFor` 的 scheme 门移除（light 条目泄漏 dark 色相）、E5/E6 两处回调 `_applyingWallpaper` 守卫移除（publish 链不收敛）、E7 dispose 的 `clearTimeout` 移除（卸载后在飞 timer 仍发布）、T2a 默认值 0.94→0.2、T2b 出厂种子 `"0.6"`→`"0.3"`。
- **六条"盲区"变异的双向证据**：E4–E7 / T2a / T2b 先在**已发运套件**（`691e7a2`，98/98 全绿）上实测六次 **STILL GREEN**（整改方在 `git archive` 全量树上跑全量套件、裁定方另写探针独立复跑四次全绿——两座隔离副本结论一致；这正是裁定把"补门"定为发版前 P0 的依据），补上 R1–R6 后全部翻红——"无门→有门"两侧证据齐备。对应关系：E5→R1、E6→R2、E7→R3、E4→R4、T2a→R5、T2b→R6；R1/R2 用 emitting mock 复现宿主同步 emit 形状，R3 断言卸载后 0 次 publish。
- T2 的"无断言"按实测修正口径：旧套件对两处默认值**有**触碰路径，但断言是派生式（`round(stored*100)%` 与 `notEqual '94%'`）——对 `0.94→0.2` 变异天然全盲，故修法是补**字面量**断言（R5/R6），而非"再走一遍路径"。
- P1（裁定可选加强，已采）：facade 换肤 round-trip 补 layer-2 light/dark **双边字面量**断言（E4 在该用例同样翻红）。

### 文档
- `docs/themes-spec.md` 颜色校验节补 pack 契约：滑杆只对 `#hex` 与逗号分隔 `rgb()/rgba()` 形态保留皮肤色相；其余（含前缀垃圾——任何解析器都兜不干净）回落 scheme 基色、滑杆全程有效（裁定 B1-B / CP3 的要求：写"凡 strict 无法解析一律回落"，不枚举语法）。
- `lib/client.js`：`applyModalOverlay` docstring 更新为"三枚 token；overlay/menu 缩放到 active base 色，layer-2 仅在可解析时保留皮肤自身色相、否则同回落"；Issue #67 注释补例外句（裁定 B3-1/B3-2）。
- 本文件与 README 版本段按裁定 T1 新增「行为变更」声明（含 layer-2 消费面与设计值对照）；`docs/desktop-support.md` 用例数 159→169 并记入本轮 15 处变异与实机复核。

### 实机复核（本机 dsh `0.2.0-rc.1`，link 安装即工作树；2026-10-06，内置浏览器 `evaluate_script` 机读，**非像素目视**）
- **裁定 CP1（"宿主同步 emit"前提）**：以真实 UI 色块切换皮肤 nebula→aurora→nebula，每切换恰好 3 次 publish（=111 笔 `--dsw-`/`--dsh-` token 写入，37 枚/次；1 次为点击同步、2 次为守卫下的延迟重解析），+500ms / +2500ms / +7000ms / +10500ms 四采样点计数全部停在 111——无 E5/E6 类失控增长（离线隔离副本里同类变异 +2500ms 已达 200+/400+ 且继续增长）。layer-2 覆盖随皮肤重解析并三态还原：nebula `rgba(30, 27, 44, 0.5)` → aurora `rgba(22, 32, 34, 0.5)` → nebula。计数为**代理指标**（包装 `CSSStyleDeclaration.setProperty` 计 token 写入，publish 次数按 37 枚/次推断）。**⚠ 此口径自 [10.6.1]（#84）起废止为「现行基线」**：它数的是层内槽位而非层数、测在 #84 修复前的构建上、且从未数 `setItem`；它保留在此仅作「定态不增长」的历史证据，现行写入基线见 [10.6.1] 与 `docs/desktop-support.md`。
- **弹窗两态**（裁定 T1）：见上「行为变更」。
- **composer 三点**：frosted 基线（stored 0.4）fillVar 40%、厚度 10px；liquid @滑杆 60（stored 0.4 → 重映射 49%）fillVar 49%、`::before` `color(srgb … / 0.49)`；liquid @实端（stored 1）fillVar 100%、`::before` 无 alpha 分量（完全不透明）、厚度 24px；liquid @透明端（stored 0）fillVar 15%（地板）、厚度 0px；验证后恢复 frosted 40%。所有写入的 localStorage 均已还原。

### 未验证 / 有意推迟（本轮如实记录）
- **实机数字均为机读复核，不是像素目视**（内置浏览器 `visibilityState=hidden`，截图不可用）；0.94 / 0.6 在真实观感下是否"好看"未经人眼确认——若日后目视改值，需常量 / 种子 / 测试字面量三处同步。
- **layer-2 的消费面未逐一枚举**（裁定 CP2）：本版改变的 alpha 覆盖"由 layer-2 绘制的所有面"，实机确认并记录的只有设置对话框；其它面按字面语义成立但未逐一核对。
- **pack 回落语义只有离线证据**：hsl / 空格语法 pack 的 layer-2 在真机弹窗面上的观感未验（本机 8 内置皮肤全为可解析语法，回落路径只在用例里跑过）。
- **B1 选项 A（扩宽解析器：hsl / 空格 / 百分号分量保留色相）**列为后续可选（裁定 P2）：需独立评审，且必须一并评估 wash / sidebar 两处 `toRgba` legacy 调用者的行为变更（前缀垃圾任何扩宽都兜不干净），本版不夹带。

## [10.5.0] - 2026-10-05

> 可读性与幂等轮：提问卡 / 审批卡 / 计划评审卡的去哈希失守、卡片填充的 alpha 复合、`<style>` 注入幂等、导航图标自检、漂移探针 `notMounted` 分栏、导航钩子随卸载拆除 / 同页重挂复臂。本版经过蓝军→第三方→中立裁定三轮对抗评审——**同一模型分角色，非独立第三方；其中裁定轮由整改方同一 agent 串行担任、独立性已降级**（如实标注，全链不使用"独立复核 / 独立裁定"措辞）。评审记录为内部攻防材料，**不随仓库发布**（`docs/review/` 已 gitignore，且无任何公开文档链接指向它）。

### 修复
- **三张卡片不再依赖构建哈希类名**（issue #50 锚点纪律，实测基线：本机 dsh `0.2.0-rc.1`）：可读性填充改挂宿主自己为这些面发布的稳定戳——提问卡 `[data-question-key] [aria-labelledby^="question-"]`（**两半都要**，使选择器永远不会收养一个无关的带 label 元素；遗留 `.Mbwy4a_card` 只作 OR 兜底保留）、审批卡 `[data-approval-key] > div`、计划评审卡 `[data-plan-review-key] > section`。其中审批卡与计划卡**此前根本没有规则**：无论换什么皮肤、把滑杆拉到多少，它们一直是宿主的中性灰。
- **卡片填充的 alpha 复合**：新增不透明基色令牌 `--dsh-dream-skin-modal-base`（当前皮肤的 base，**不带 alpha**），卡片的 `color-mix()` 用它作 FILL SOURCE，而不是被壁纸洗过的 `--dsw-alias-bg-base`（后者 = `rgba(base, canvasAlpha)`）。旧写法把两层 alpha 乘在一起（填充率 = 壁纸不透明度 × 弹窗不透明度），于是「弹窗不透明度 100%」仍然透出对话、浅色皮肤配深色壁纸时整片读不出来。composer 一侧的同族问题此前已由 `--dsh-dream-skin-composer-base` 修掉，本版把卡片纳入同一口径。
- **设置导航图标不再认领别人插件的那一行**：匹配式从「label 等于 `皮肤`，或含 `Theme`」收紧为**只含 `Theme`**。`Theme / 外观` 是本插件自己注册的 section label（`lib/client.js` 的 `settings.section` 声明），而裸「皮肤」在实机（宿主 `0.2.0-rc.1`）上属于**另一个已装插件**（`@linxin666/dsh-client-ui-skin-center`，`dsh --profile web --dump-config` 有该条目）——旧匹配把我们的调色板图标涂到了它那一行，并隐藏了它的原 `<svg>`。纯装饰、可逆，但属越界改动他人 UI。代价如实写明：若未来宿主把我们那一行渲染成不含 "Theme" 的字样，图标退回齿轮（装饰损失，自检上报为 `marked:0 && armed:1`），而不是去抢别人的行。回归门改为真机形状夹具（我方行 + 一个第三方「皮肤」行），并新增变异 M16（把 `皮肤` 分支加回去即翻红）。
- **无 `color-mix()` 浏览器的兜底行改成不透明基色优先**：`background: var(--dsh-dream-skin-modal-base, var(--dsw-alias-bg-overlay))` 落在混合行之前。此前兜底直接落 `--dsw-alias-bg-overlay`，而该令牌由**弹窗不透明度滑杆**驱动（实机：滑杆 50% 时读到 `rgba(18,16,26,0.5)`），等于旧浏览器上"卡片跟着滑杆变半透明"。混合行里的 `94%` 是 `MODAL_FILL_VAR` 未设时的 CSS 默认值，不是该令牌的实测值（此句为 10.5.0 实机复核后的更正，早先此处把蓝军转抄的 0.6/60% 写成了"实测"）；两条声明的先后顺序不变，只换取值。
- **`<style>` 注入幂等（长生命周期页面重复求值同一 bundle）**：材质表按 id 命中时改为 **STYLE 节点限定 + 移回 `<head>` 末尾**（是 MOVE 不是重复插入；冒用我们 id 的外来节点既不重写 `textContent`，卸载时也不会被 `remove()` 带走），导航图标表的查找从 `#id` 收紧为 `style#id`。导航钩子的**所有权锁**从"装钩之前声明 / 活在节点上"改为**页面级 `armed` 位、观察者真的装上之后才置位**——前者会造成两种静默失效：sheet 节点被替换后第二份 bundle 叠出第二个 `MutationObserver`（自报字段仍读 1，看不见），以及在 `<body>` 尚未解析时跑完的那一份宣称接管却什么都没挂，图标整场不替换而报表和"设置面板没开"一模一样。`<body>` 缺失时现在挂一次性 `DOMContentLoaded` 补装。
- **导航图标自检上报**：新增 `window.__DSH_DREAM_SKIN_NAV__`（`{sheets, dialogs, buttons, marked, armed, checkedAt}`），并由诊断快照的 `navIcon` 字段转发。`armed` 是「这套宿主没有可钩的 nav」与「面板只是没开」之间唯一能区分的依据，单看计数两者都是 0。采样除 rAF 合帧外**另加一次性 120ms 定时器**：Chromium 对隐藏或被完全遮挡的窗口不发帧，没有它，图标标记与自上报会冻结在最后一帧的状态。如实写明它**不是**周期性复检——DOM 零变更的页面不会再被唤醒（见「未验证」）。
- **漂移探针告警声明自己的覆盖边界**：`console.warn` 那句现在写明「本清单即探针覆盖的全部；按需挂载的提问 / 审批 / 计划卡填充**不在**其中，那三条锚点仍需人工核对」。此前那句 "harmless, cosmetic only" 只对**被探针覆盖的**装饰组成立，读者会把它当成对整个精修层的结论。
- **漂移探针把「宿主 CSS 仍在、面未挂载」与真漂移分栏**（对抗评审 T3）：机读契约 `anchors` 新增 `notMounted` 字段。归因先说实：本机 6 组锚点中 `lXshSW_*` 组**当代有效**（宿主安装物 22 处命中 + 页面有 `TodoPanel.module.css` 归属），它此前进 `drifted` 只因面板当时没开——旧行为把"未挂载"与"漂移"混进同一字段、同一句告警。分类器只读宿主自己发布的 `style[data-plugin-css]` 表（本插件的表没有该属性，天然不可自见），`<link>` 形态的模块 CSS 不在读法内（零网络不变式优先于分类完备性，列为已知边界）；晚修正观察者对两个池子做同一条单向撤回。
- **导航钩子随纤维卸载拆除、同页重挂复臂**（对抗评审 T9）：此前三样残留（自注入的 `<style>`、body 观察者、行标记）没有任何拆除路径，卸载后会存活到下一次整页加载。现在 `arm(gen)` / `dispose(gen)` 以 generation 令牌配对：卸载断开观察者、清除标记、移除我们自己的表；同页重挂自动复臂；迟到的旧代 dispose 不会误杀接棒的新代。控制柄挂在既有的 `window.__DSH_DREAM_SKIN_NAV__` 上且不可枚举。

### 新增
- `__DSH_DREAM_SKIN_STATUS__` 增补 `navIcon` 字段（ready / degraded 两条路径同键集，逐键同构守卫不变）；`anchors` 增补 `notMounted` 字段（三值判读：`drifted` / `notMounted` / `pending`，规则见 `docs/desktop-support.md`）。

### 更正（先前陈述作废，按纪律显式标注而不是悄悄改掉）
- **本周期早先写下的诊断被推翻**：「提问卡的构建哈希被重洗，且宿主 `--dsw-specific-input-major` 是 8% alpha，所以对话从卡片透出」——安装到本机的宿主 bundle 实测：`dsh-client-ui-user-questions` 仍导出 `"card": "Mbwy4a_card"`（哈希**没有**重洗），`LVzXQa_card` 属同包另一组件 `PlanReviewPanel`，而 `--dsw-specific-input-major` 亮/暗两处定义都是**不透明 hex**（`#fff` / `#2c2c2e`）。真实机制是上面「三张卡的去哈希」与「alpha 复合」两条。代码注释已按实测重写并保留这段证伪记录。
- **「弹窗填充权重取自出厂滑杆」这条自述归因不实**：该行为来自既有 `FACTORY_DEFAULTS`（`MODAL_OPACITY_KEY: "0.6"`），本 diff 对它**没有任何实现改动**，只新增了把它钉住的测试。发布说明里把既有行为记成新版变更，会让下一个读 CHANGELOG 的人去找不存在的改动。
- **「材质表移回 `<head>` 末尾」不是一条层叠保证**（实机复核 L3）：先前注释与用例把它写成恢复了 "ours is last" 不变式。实测（宿主 `0.2.0-rc.1`）我方材质表落在 `document.head.children` 的 index 131 / 共 217，其后仍跟着 85 个节点（多数是 `<style>`）——宿主在插件挂载之后持续注入样式。该移动恢复的是**重挂那一刻**的末位（与旧"追加新副本"路径等价的瞬时性质）；精修能站住靠的是特异度（`html[data-dsh-material=…]` 前缀 + 属性选择器），不是位置。
- **控制台崩溃错误的口径收紧**：宿主日志里的 React #130 一类错误来自其它插件的 `sidebar.footer.action` / `shell.overlay` 槽位，只能说「**不可归因于本插件**」，不再写成"与本插件无关"以外的更强结论。
- **「近不透明 0.94」这句注释里的数字对不上任何一层实测**（对抗评审 T4）：出厂种子 `FACTORY_DEFAULTS` 是 0.6、出厂主题 token 上限 0.86、真机滑杆 50% 时读到 `rgba(18,16,26,0.5)`；`0.94` 只是**没有存过值**时 JS 一侧的默认值（也是混合行里 `94%` 兜底的来源），从来不是该令牌的实际值。本次只改注释（`lib/client.js` 与冒烟用例各一处），不动任何取值。
- **「卡片内只会出现 Button / Icon* / MarkdownText / StateDot」这句自述被证伪**（对抗评审 T5）：两张卡都是**槽宿主**——宿主槽目录把 `conversation.approval.detail` 明列为第三方注入口，任何插件都能在这棵子树里挂任意内容（含 `position:fixed` 面），而本插件的 `backdrop-filter` 会把它重新锚定（composer 那个 bug 的失效模式）。注释已改为**记录在案的风险**而非"已证明的围栏"：模糊效果作为可逆的视觉取舍保留，注入形状离线测试看不见，风险按注释所记维持。

### 测试
- `npm test` 159 项全绿（9.29.0 为 122 项，本版 +37：可读性 / 幂等批 32 项 + 对抗评审整改批 5 项——`notMounted` 分类器 2 项、导航钩子生命周期 3 项）；`node --check lib/index.js lib/client.js` 与 `npm run typecheck`（tsc 5.6.3）同门通过。
- **26 处变异验证全部翻红**（隔离副本树实测、逐条打印翻红断言原文、工作文件不受影响；harness 进入时对当前活动文件快照、退出钩子还原，每条用例先核对锚点唯一命中）：M1 计划卡锚点改回哈希类名 `.LVzXQa_card`、M2 填充选择器列表重新混入一处哈希类名、M3 审批卡戳记改名使填充不再覆盖它、M4 液面描边把计划卡换成审批卡、M5 alpha 混合改画在半透明 `--dsw-alias-bg-base` 上、M6 不透明基色换了变量键名（等于不再发布）、M7 导航表查找去掉 `style#` 限定、M8 `arm()` 不再读页面级 `armed`、M9 `<body>` 未解析时照样宣称接管、M10 材质表收养不再限定 STYLE 节点、M11 拆掉 rAF 之外的 120ms 兜底、M12 卸载时额外按 id 移除、M13 无 `color-mix()` 的兜底退回半透明 overlay、M14 收养后不再把材质表移回 `<head>` 末尾、M15 漂移告警不再声明覆盖边界、M16 导航图标匹配式退回「含裸 `皮肤` 分支」（实机上那一行属于第三方插件 `web-ui-skin-center`；实测翻红的是**行级**负向控制「the third-party 皮肤 row is not marked」——此前的"标记数由 1 变 2"归因在整改后的夹具下不再成立，已按实测更正）、M17 审批卡戳选择器收窄成 `:nth-child(2)`（结构性命中断言翻红——旧的字符串包含式 pin 对同一变异全员常绿，这正是整改前守门测试失效的实证）、M18 导航表计数改成恒值 1、M19 匹配式退回子串 `Theme`（把 `Theme Shop` 行标记出来的断言翻红）、M20 分类器短路成全部 drifted、M21 分类器丢掉 `style[data-plugin-css]` 限定、M22 卸载不再拆除钩子、M23 apply 不再复臂钩子、M24 dispose 丢掉 generation 门（旧代误杀新代）、M25 钩子不再持有 sheet 句柄（卸载时移除不走自己的表）、M26 同步门拆除（卸载后排队唤醒仍能重标记）。
- **两条"看不见"是靠测试台自身修好才变得可观测的**：`makeEl()` 的 `appendChild/append/prepend/insertBefore` 此前不维护 children 顺序也不实现移动语义，"收养是 MOVE 而不是重复插入"这一断言**不可能失败**；现在按真实 DOM 维护顺序并真正把节点从旧父摘除。导航幂等用例另外还依赖 mock 同时应答 `style#id` 与裸 `#id` 两种查找，否则"去掉 `style#` 限定"（M7）在假 DOM 里没有后果。
- **变异工具链自身的一次翻车按 finding 记录**：早先的 harness 从 part-C 之前的备份恢复 `lib/client.js`，把已应用的一半修复**静默回退**了，而当时的"15 处全红"是在被回退的文件上跑出来的。现改为对**当前活动文件**做快照、退出钩子还原。教训与「验证纪律」同源：检查器自己也要有能失败的证据，否则它会把破坏当成通过。

### 文档
- `docs/desktop-support.md`：`window` 全局由「两个」更正为「三个」（新增 `__DSH_DREAM_SKIN_NAV__`，并写明它是幂等锁的状态位——清空后若 bundle 再次评估会重新接管，这是有意取舍）；机读 schema 增补 `navIcon` 及其判读规则；锚点依赖清单补入「设置导航图标」（依赖 ARIA 结构 + **人类可读文案**，改文案或换语种即失配，且漂移探针**不覆盖**这一条）；「已验证」一节的用例数 122 → 159 并记入本轮 26 处变异；机读 schema 补 `anchors.notMounted` 三值判读与分类器边界（只读宿主 `style[data-plugin-css]`、`<link>` 形态不覆盖）；导航钩子条目补卸载拆除 / 复臂语义与控制柄说明；锚点表首行补记「三组哈希在宿主侧当前无载体」的现状。
- `docs/desktop-support.md` 与 `lib/client.js` 注释按实机复核降级两处过度陈述（L2/L3）：快照里的 `navIcon` 是**最后一次 `publishStatus()` 的镜像**，判读规则要对着实时全局 `window.__DSH_DREAM_SKIN_NAV__` 用；「材质表移回 `<head>` 末尾」明确为**重挂那一刻的位次**，不是层叠保证。
- README 与 7 份译文 Roadmap 同步：nav-icon 幂等 + 自检一条按已交付移除；新增「漂移探针盖不到按需挂载的功能面（提问卡 / 审批卡只在真的发起提问时才进 DOM，启动期采样必然恒报漂移）」，验收写成"一次真实提问后 `anchors` 能报命中/漏中，且刚打开的页面仍是 `drifted: []`"；A 段动机行按整改后读数改写（6 组里 3 组哈希换代、1 组是宿主 CSS 仍在的未挂载面，`notMounted` 与漂移分栏），8 份同一轮全部同步。

### 未验证 / 有意推迟（本轮如实记录）
- **空闲页没有任何周期性复检**（蓝军 B6，按设计保留）：导航钩子的观察者在 DOM 零变更时不会被唤醒，`checkedAt` 会合理地变旧；120ms 定时器只在一次唤醒之后补首帧被饿死的情况。判据是 `armed` + `checkedAt` 而不是"永远新鲜"，文档已这样承诺；改成轮询要为一个装饰功能买常驻定时器，不值。
- **`sync()` 每次做 3 次全文档查询**（蓝军 B7，接受的成本）：rAF 合帧下最坏约 60Hz×3，纯诊断统计与标记同频确实没有必要；未做实测即不构成"必须修"，且这条链只在设置弹窗打开时才有命中对象。若后续真机观测到卡顿，优先把 `dialogs`/`sheets` 统计降频到"终局一次"。
- **卡片填充的可读性只有离线证据**：探针不覆盖按需挂载面（这是本版有意的设计边界，见 Roadmap），因此"改宿主 `aria-labelledby` 值或审批卡子节点形态会静默失效、零信号"这一残留风险仍在，靠 warn 文案声明边界 + 人工核对兜住。
- **三组哈希在宿主侧当前没有任何载体**（对抗评审 T2，现状如实记录）：`bqrRRG` / `nArs4W` / `qDHVXG` 在本机宿主安装物与页面全部 `<style>` 归属扫描中均 **0 命中**（唯一载体是本插件自己的材质表）——即这三组精修规则在本代宿主上是空转的。补稳定锚点属 Roadmap A 的既定范围（公开验收判据：探针给出 `drifted: [] && pending: false`），本版不夹带。
- **审批卡第三方注入口的后果未在真机复现**（对抗评审 T5）：本机没有占用该槽的插件，注入内容（尤其 `position:fixed` 面）在 `backdrop-filter` 下被重新锚定的实际影响只停在注释里，归为记录风险；出现真实占用槽的插件后应第一步复现。
- **导航图标、卡片填充、兜底取值、材质表位次已按整改后的真机读数复核**（内置浏览器 `evaluate_script`，`visibilityState=hidden`，**机读复核而非像素目视**）：设置弹窗 15 行 nav button 中仅 `Theme / 外观` 带标记（`markerCount=1`、`style#dsh-dream-skin-nav-icon` 恰 1 份），第三方「皮肤」行的原 `<svg>` 计算样式回到 `display:block`，我方行 `display:none` 且 `::before` 16×16 蒙版生效；三类卡片（合成锚点）填充 alpha 恰等于弹窗权重。仍未做：像素目视、其它 7 套皮肤下的观感、浅色皮肤 + 深色壁纸组合的对比度。

## [9.29.0] - 2026-09-29

> 宿主换代兼容轮（issue #62）+ 壁纸填充方式（issue #61）。DSH `0.2.0-rc.1` 发布后，本插件在 0.2.x 上会被宿主整包跳过——先修这条，再收 issue #61 的两条观察。

### 修复
- **peer 范围与宿主 0.2.x 兼容**（issue #62，P0）：宿主 `@deepseek-ai/dsh-app-boot` 自 0.2.0-rc.1 新增 `evaluatePluginCompatibility()`，boot 阶段用 `semver.satisfies(宿主运行时版本, 范围, { includePrerelease: true })` 逐个校验 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*` peer，**任一不满足即整包跳过该插件**（客户端不注入、`/dream-skin/api` 不启、诊断全局量不存在，日志仅一行）。原先以 `^0.1.0-rc.6`（等价 `>=0.1.0-rc.6 <0.2.0-0`）对齐的六个 `dsh-client-*` peer 在 `0.2.0-rc.1` 上全部落空，用户侧表现为"换肤与设置项整体消失"而非报错。本版统一为 `>=0.1.0-rc.6 <0.3.0-0`：覆盖 0.1.x 与 0.2.x，把尚未验证的 0.3.x 明确挡在窗口外。peer 声明自此是**载荷声明**而非装饰，README 与 `docs/desktop-support.md` 的相应表述同步改写（"不声明 engines.dsh" 的立场不变，但 peer 已成为安装期硬约束）。
- **`package-lock.json` 的 peer 曾与 `package.json` 静默漂移**（本轮自查）：lock 里 `dsh-client-store` 仍是 `^0.1.0-rc.6` 而 manifest 已是宽范围——与 9.27.0 那次"版本号漂移"同一类。新增 deepEqual 门（peer + `peerDependenciesMeta` 两组），漂移即翻红。
- **手动"应用链接"不再被浏览器缓存挡回旧图**（issue #61 第二条观察）：`lastFiredAt` 的语义收敛为"这张图最近一次（重）拉取的时刻"，渲染层**有戳即 bust**（此前只在定时刷新开启时才拼 `?t=`），手动应用会写入新的 13 位毫秒戳、重排定时相位，并让预加载探针校验与实际渲染逐字节同一条 URL。**这条修复的缺陷在代码里，而不是在报告里**：首版把戳写在 `setWallpaperKind()` 之后，而正是那次调用负责渲染，于是点击仍然渲染旧 URL——新增用例先把实现打回原形（红），调整写入顺序后才绿。

### 新增
- **壁纸填充方式**（issue #61）：本地图与图片 URL 新增三档——`裁剪填满`（cover，出厂默认，与历史行为逐字节一致）、`完整显示`（contain）、`模糊填充`（contain + 背后一层同图放大 1.2 倍、额外 48px 模糊的溢出层，让两侧留白读成光晕而不是硬边空带）。渐变无固有宽高比，故该档对渐变**不生效且不显示**；溢出层与图片层同为 `z-index:-1` 的 fixed 节点，靠 **DOM 树顺序**（`insertBefore`，非 append）压在图片之下。值经**写入门 + 渲染门两道白名单**才进 CSSOM：`setFit` 拒绝任何非三 literals 的输入，`readWallpaperFit()` 对状态文件里手改的值回落到默认，因此 `contain; background-image:url(…)` 一类既写不进、也渲染不出。

### 变更
- **空链接框点"应用链接"改为彻底无操作**（本轮补测时发现的残留分支）：R13 门只挡住了"覆盖已有 URL"那一半，另一半在没有存过链接时仍会重写 `wallpaper-kind`/`wallpaper-url`，并把**壁纸跟随主题**强制置 `0`——一次误点就静默改掉另一项偏好。现收成 `if (raw === "" || raw.length <= 4) return;`，一次"没有东西可应用"的点击不留任何写入。新增用例先红后绿，变异 M15 只让它一条翻红（归属唯一）。

### 测试
- `npm test` 122 项全绿（9.27.1 为 110 项，本版 +12：宿主兼容门 4 项、lock 一致性 1 项、填充方式 6 项、空链接误点门 1 项）。
- **宿主兼容判定表来自独立数据源**：`tests/fixtures/host_compat_verdicts.json` 由 0.2.0-rc.1 **真实的 `evaluatePluginCompatibility()`** 对修复前/修复后两份 manifest × 9 个运行时版本逐个跑出来（`dsh plugin allow-version` 的豁免表路径不参与），测试内实现只重放同一循环并与该表逐格比对；另含"0.2.0-rc.1 修复前必须整片红"与"0.3.x 修复后仍必须拒"两条方向性用例，防止范围被放宽成永真式（自证探针）。测试内那份 mini-semver 在与宿主 node-semver 的 11 范围 × 15 版本交叉比对中 195/195 一致。
- **15 处变异验证全部翻红**（隔离副本树实测，工作文件不受影响）：渲染写死 cover、溢出层改 `appendChild`、渐变档守卫拆除、写入门白名单拆除、渲染门白名单拆除、离开模糊档不断开溢出层、溢出层少 48px、store 漏传 fit、手动应用戳写在渲染之后、手动应用完全不落戳、渲染只在定时开启时 bust、teardown 漏掉溢出层、`FACTORY_DEFAULTS` 丢该键、`SENTINEL_KEYS` 丢该键、空链接误点恢复成修复前的分支——其中 13 处各自只让一条用例变红（归属唯一），渲染写死 cover 与不断开溢出层各命中 2 条。**变异脚本本身也要验**：M15 第一版把恢复的分支写在 `return` 之后（等价于没改），却把"不安全链接被拒"那条用例打红了——顺着查才发现那处注入实际把 `wallpaper-kind` 改成了 `url`，不是空操作；重写为逐字还原修复前分支后，M15 精确命中 1 条。一次"翻红"若归因不清，就不能算验证。
- **测试台本身修了两处"看不见"**：`makeEl()` 的 `contains()` 此前恒为"只有自己也算包含"，导致壁纸层每次都重建、**树的顺序不可观测**——现按真实 DOM 维护 children 顺序、`remove()` 真正脱父；`buildSandbox()` 此前在测试传入 `document:` 覆盖时返回的是**内部那份没用上的默认 mock**，凡经 `h.document` 打补丁（createElement 拦截、head 摘除）都会静默落空，现返回 bundle 实际使用的那份。后一处修好后，两条漂移探针用例（S-3 / T-1 取代链）暴露出它们原先依赖的是 mock 假象：真实宿主里 `ensureMaterialStyle()` 认出 `<style>` 仍在 head 便不重挂，用例改为**先把样式节点从 head 摘掉**（模拟宿主重建 head）再 `apply()`，前提陈述同步如实改写。

### 文档
- README 兼容性表与"关于 peer"注释改写；`docs/desktop-support.md` 新增「宿主 peer 兼容闸门（dsh 0.2.0-rc.1 起，issue #62）」一节，并更新支持状态总览、出厂壁纸的 cover 表述与诚实清单。

### 实机复核（本机 dsh `0.2.0-rc.1`，2026-09-29）
- **放行不再依赖豁免表**：在子进程里直接调用宿主自身的 `loadProfileDirectory()`，读真实的 web profile、真实的 `compatibility.json`、真实的运行时版本 → 19 个 bundle 全部载入、`skippedBundles` 为空、合成入口表里确有 dream-skin 条目。本机豁免表里那条 `dsh-dream-skin@9.27.1` 是按**精确版本**匹配的键，对 9.29.0 不生效，因此放行只能来自放宽后的 peer；同进程内再用宿主 `evaluatePluginCompatibility()` 跑一份"同样构建但 peer 写回 `^0.1.0-rc.6`"的清单，结果为 6 个 peer 全不落 + `exempted=true`（即修复前本机靠豁免才挂着）。**注意口径**：DSH 进程本身未重启，boot 期那次调用是同版本宿主代码在同机复现，不是进程重启后的第二次观测；下次重启走的是同一个函数。
- **浏览器半边**：`window.__DSH_DREAM_SKIN_STATUS__` 读到 `build:"9.29.0"`、`status:"ready"`、`shell:"web"`、`skin:"nebula"`；漂移探针 `anchors.probed=6`、`drifted` 四条与 `0.1.7-rc.2` 上记录的**完全同一组**选择器（`.bqrRRG_card` 等），console 只 warn 一次——换代没有引入新的锚点损伤，也没有新增缺口。
- **设置项与填充方式**：皮肤 / 强调色 / 壁纸三档 / 填充方式 / 应用链接 / 清除壁纸 全部正常渲染；点选实测 `background-size` 随 `cover→contain` 变化并落库，`模糊填充` 时 `document.body` 多出第二层（子节点 index 0，`cover` + `blur(51px)` = 用户 3px + 48px）压在图片层之下，切回 `裁剪填满` 后溢出层被摘除；选中"渐变"时填充方式整行消失、切回"本地图片"又出现。
- **本机背景此前为空**：实机查明是选中"图片链接"档但尚未粘贴链接（该档没有值就不画），切回"本地图片"即恢复出厂内联光晕；这一状态**没有提示文案**，已作为 Roadmap 未决项记录（不开公开 issue）。
- 控制台仍有其它插件的 React #130（`sidebar.footer.action` / `shell.overlay`）与 `plugins.bundle.config` 槽位拒绝，与本插件无关（沿用 9.27.1 的 grep 结论）。

### 未验证（本轮如实记录）
- 内置浏览器仍截不到图（`visibilityState=hidden`），上述为**计算样式 + DOM 树序 + `aria-pressed` 的机读复核**，不等于像素目视；模糊填充 48px 光晕强度的观感取舍仍未拍板。
- 「渐变档不显示填充方式控件」由 JSX 门控（`kind !== "gradient"`），本套假 DOM 的 `jsx()` 桩不建树，**离线门覆盖不到它**——本轮靠实机点视确认，但回归保护缺失照旧记录。
- **npm 正式包的安装期路径**未复测：本机是 `link:` 工作区安装，`dsh plugin add` 走 `dsh-plugin-manager` 自己的判定入口（与 boot 期不是同一份调用点），本轮未在实机跑一次"卸载后从 npm 装 9.29.0"。
- `ja/ko/es/fr/de/ru` 界面下的显示元数据仍取决于宿主界面语言集合（沿用 9.27.0 结论，本轮未动）。

## [9.27.1] - 2026-09-27

> 用户实机反馈轮：出厂壁纸在大屏上"一块一块"的分辨率问题。

### 变更
- **出厂壁纸改为内联矢量图**：壁纸层是 `background-size: cover` 的满屏节点，而 9.24.0 起随包的抽象弥散光图是一张 **1200×678 位图**——2560×1440 屏要放大约 2.1×，JPEG 的 8×8 宏块被放大成约 17px 的可见方格。新默认图用**同一套构图**（右上紫、左下青、底部暖光 + 近黑底）改写为内联 SVG：任意分辨率下都是连续渐变，体积 7197B → 3468B（data URL 9619 → 4650 字符）。量化对比由 Chromium 光栅化实测取证（2560×1440，采样 120 条扫描线）：相邻像素同色占比 **90.0% → 1.7%**、最长纯色带 **853px → 6px**、中列明度台阶 **136 → 1126**。暗部另加一层 `stitchTiles="stitch"` 的 128px 抖动颗粒（约 1.6 灰阶）防止近黑渐变在 8 位面板上色带化。
- **出厂壁纸迁移表支持多条历史资产**：`LEGACY_FACTORY_WALLPAPER` → `LEGACY_FACTORY_WALLPAPERS`，新增 entry 2 精确匹配 9.24.0–9.27.0 的出厂位图（沿用同一套三重指纹纪律：字符串长度 + 解码字节长度 + cyrb53，长度预检在常见路径上不触发任何解码）。**只替换从未被用户改动过的出厂资产**：自定义照片、已清除壁纸、以及任何同长度不同内容的串都不动。B-5 受控例外（post-settle 以用户态写入，让 `$DSH_HOME/dream-skin.json` 里的旧副本一并收敛）语义不变，现覆盖两条 entry。
- **首装守卫**：新增回归测试钉死"预填 ≠ 生效"——出厂把必应每日壁纸的 URL **留在输入框里**（用户不必自己去找链接），但 `wallpaper-kind` 出厂仍是 `image`、定时刷新仍是关闭，首屏只画随包的内联图，绝不向第三方发请求。

### 测试
- `npm test` 110 项全绿（9.27.0 为 105 项，本版 +5）。新增：矢量资产不变量（必须是内联 SVG、带 `xmlns`、16:9 内在尺寸、抖动瓦片必须 stitch、每个光斑衰减到 0 透明度、<5KB 预算）、entry 2 迁移的正向与"同长度不同内容"反向用例、entry 2 假阳性用例（同长度不同内容 / 同字节长度零载荷）、"同 origin 重启、本地与宿主两侧都仍是旧图"的真实形态收敛用例、以及"出厂默认不得再退回位图"的源码钉子。
- **本轮最重要的一条不是新功能，而是一道能失败的检查**：首版 entry 2 的哈希是**手抄**的，而当时所有正向用例都在 patched 副本里把三元组改写成合成载荷自己的值——常量数值只与自身比对，**没有任何用例可能翻红**（自证式探针）。真机验证时迁移静默不生效才暴露：`8528750363090137` 与真实资产不符，正确值 `7481607271554265`。修法是把 v9.27.0 标签**实际随包的那张位图串**存进 `tests/fixtures/legacy_factory_raster_9_27_0.txt`（tests/ 不在 `package.json` 的 `files` 里，不随包分发；这张图是本项目自生成图，无旧照片的品牌/许可问题），测试用独立实现重算三重指纹并与源码字面量比对。entry 1 的照片字节仍不进仓库，其数值本轮改为对 git 标签（v9.14.2…v9.16.0、v9.23.0）与本机历史串复算核对，结果一致。
- 变异验证（在**隔离副本树**里逐条实测，工作文件不受影响；每条都必须翻红）：删除 entry 2 → 4 项红；**entry 2 哈希末位改一位 → 4 项红（含新增的真实资产反算门与收敛用例，正是首版会漏的那类）**；出厂默认图媒体类型退回位图（svg→png）→ 3 项红；去掉 `stitchTiles` → 1 项红；把 B-5 受控例外改回"永远 factory-provisional" → 2 项红（T-02 B 与本轮新增的同 origin 收敛用例）。副本树缺 `CHANGELOG.md`/`README.md` 导致 `text hygiene` 在**含对照组 M0 的每一次运行**里都红，属环境噪声而非变异结论，已从上述计数中剔除。
- 真机复核（`dsh@0.1.7-rc.2` + 本机 link 安装，9.27.1）：宿主 `~/.dsh/dream-skin.json`、浏览器 localStorage、DOM 壁纸层三处均收敛为矢量图；用户的 opacity 0.39 / blur 10px / 皮肤 nebula 未被迁移改动；壁纸图元在本页 Chromium 内以 2560×1440 cover **另起一套采样参数**（每 8 行取一条扫描线、不计 CSS blur）复测，得相邻同色占比 9.5%、最长纯色带 15px——与选型轮那套脚本口径下的 1.7%／6px 不可互换，两次测量共同支撑的结论只有一条：位图那种数百像素级的纯色平台（853px）在矢量版上不再出现。控制台无本插件报错（侧栏 `sidebar.footer.action` 的 React #130 崩溃属其它插件）。

### 文档
- `docs/desktop-support.md` 出厂壁纸条目改写：说明矢量化的量化依据、两条迁移 entry 各自的理由，以及"除精确匹配外不动用户状态"的边界。

## [9.27.0] - 2026-09-27

> **外部评审整改轮**（评审方独立出具 `docs/review-findings-9.26.x.md`，基线 9493fcd，8 条整改全部核实为真、全部采纳；发版前评审方**第二轮复核**确认 8/8 真落地，另报 6 条新问题 `docs/review-findings-9.27.0-round2.md`，同样全部核实为真、当日一并收进本版）。逐条回应见 `docs/review-findings-response-9.26.x.md` 与 `docs/review-findings-response-9.27.0-round2.md`。
>
> 档案说明：本版的评审报告与逐条回应报告（`docs/review-findings-*.md`，共 8 份）与 9.26.1 的 `docs/review/` 同例，**只存本地、不进版本库、不随 npm 包分发**；下文对这些路径的引用是本地档案名，不是仓库内链接。

### 修复
- **漂移探针三态化**（A-1，P1）：探针从"下一帧采样一次、未命中即报漂移"改为**有界检查点阶梯 + 宿主活跃度哨兵 + 每组命中记忆**（`DRIFT_RETRY_DELAYS_MS` / `driftProbeLivenessProven()` / `matchedOnce`；第一轮落地时该常量名为 `DRIFT_CHECKPOINTS_MS`，本版 R-4 条记录了更名——S-2 纠正的就是发版说明里引用已改名符号）。机读快照新增 `anchors.pending`：`drifted:[] && pending:false` 是唯一的"全部精修生效"正向信号；"UI 未挂载"（活跃度未证明）与"阶梯未走完"一律诚实 `pending`，绝不误报漂移——9.26.0 把探针结论提升为官方要消费的机读契约后，这条噪音就是误报，本轮消除。哨兵**不用 body 子节点判定**（插件自己也在 body 挂对话框，其存在不证明宿主挂载）。终局 `drifted` 与 console 人类标签维持机读/人读分离（B-08 语义不变）。
- **渐变守卫先规范化再判定**（A-2.1，P1）：新增 `normalizeCssForInspection()`——剥 `/*…*/` 注释、解码 CSS 十六进制转义（`\75 rl(` 在 CSSOM 解析器眼里就是 `url(`，1–6 位 + 可选单空格 terminator）、`\c` 字面转义与 `\<换行>` 续行；denylist 与前缀 allowlist 改跑在规范化形上。此前 denylist 跑在原始串上，任何 `url(` 的转义变体直通。存原值、校验规范化形。
- **`-webkit-linear-gradient` 策略性拒绝**（A-2.2）：明确决策**不予放行**（运行面为常青 Chromium，legacy 前缀是另一族语法；放宽 allowlist 会连带放宽解析面），决策由回归测试与 `docs/desktop-support.md` 双向钉死——未来若改判，测试必须显式同步翻转。渲染层忽略不安全存储值时新增 `warnRenderGateSkip()` 可见告警（每值一次、页面级封顶 20 并 FIFO 淘汰，见 R-5），壁纸不再静默消失。
- **ready 快照补齐 `reason`/`lastError` 恒 `null` 字段**（B-3）：文档承诺"字段集完全一致、消费方永不撞 undefined"，此前 ready 侧确实缺这两个键。新增 **schema 守卫测试**逐键比对 degraded 内联快照与 ready 快照的键集——单边加/删字段即翻红（文档承诺首次有执行检查背书）。
- **`status:"ready"` 改为尾部签署**（B-4）：此前 `apply()` 中途抛错时快照仍自述 ready。新增 `applyCompleted` 标志，只在 `apply()` 自然收尾时置真，之后的重发布继承该标志（prev-merge 只进不退）；apply 未完成期间的快照为 `applying`。`apply()` 对外不抛错的既有约束不变。
- **迁移受控例外显式标注**（B-5）：出厂壁纸迁移的 post-settle 写入是"出厂值永不反向覆写宿主持久文件"纪律的**唯一有意例外**（旧图因品牌/许可必须离场，各 origin 需收敛），代码注释与 `docs/desktop-support.md` 均已标注并警告不得"顺手修回"；源码正则钉子进回归门，注释删除即翻红。
- **宿主 `ok:false` 出口补延迟播种**（B-6）：`loadFromHost()` 三个"无可用答案"出口（网络失败 / 非 JSON / `ok:false`）此前只有前两个触发 `seedDeferredFactoryWallpaper(false)`——真机首装遇宿主侧拒绝会永久无壁纸。三出口语义收敛一致，且不产生任何回写。
- **`probed` 计数语义澄清**（C-8）：文档与代码注释明确 `probed` 是**探针组数**（Web 6 / 桌面 7），不是 DOM 元素数，逗号兜底成员不计入。

**第二轮复核整改（R-1..R-6，评审方确认 8/8 真落地后新报的 6 条，全部核实为真、当日收进本版）：**

- **`\a` 换行转义走私面封堵**（R-1，P2，安全面）：`normalizeCssForInspection()` 此前把 `\a`/`\A` 解码成的换行**插入**结果串，`u\nrl(` 因此躲开 denylist 的 `url\s*\(` 匹配——发版前实测复现确证走私仍在。改为按 CSS 真实语义**删除**（`\<newline>` 在字符串外是续行，不产生字符），并补第二道零成本门：规范化**之后**重查控制字符（解码本身可引入 `\a`/`\28` 等，只查原始值管不住解码形）。两道门**互为冗余、由不同向量分别钉死**：变异验证显示只拆"删除"或只拆"新门"各自都还有向量翻红，而**整体退回修复前状态**会让 `\75\a rl(` 走私向量直接转红。走私向量表同步扩到 14 条（补评审原文的 `\<CR>` / `\<FF>` 字面续行与 `\d`/`\c` 解码形）。过严方向对合法渐变零影响，并新增两条**反过度拒绝**断言（`\28`、`\a\a` 合法值必须照常采纳）。同时**公开作废**上一份回应报告 §1 的失实论证（"续行变体同时被两道门管住"——规范化之后当时并无第二道门）。
- **晚挂载漂移的自我撤回**（R-2，P2）：命中记忆只在阶梯窗口（终局约 4.3 秒）内有效，窗口外才挂载的面此前会被**永久**误报漂移且无人纠正。新增 `armLateCorrection()`——终局仍有 `drifted` 时挂一个 `MutationObserver` 补一次探针，结论允许**单向向好修正**（撤回 drifted / 重发布清零），不重复 console 告警；干净收敛即 disconnect，不常驻定时器。诚实边界（窗口外晚挂载无法在首次终局即正确、"永不误报"只能靠事后修正兑现）写入 `docs/desktop-support.md` 未验证清单。
- **删除死逻辑 `driftChainClosed`**（R-3）：该标志只在 `final` 轮后置真，而该轮 `scheduleNext()` 本就已终止——置与不置行为完全相同，徒留"存在提前封口路径"的误导（且与变异验证证明的"中途不得提前终局"矛盾）。
- **阶梯改名澄清相对间隔**（R-4）：`DRIFT_CHECKPOINTS_MS` → `DRIFT_RETRY_DELAYS_MS`——数组是**相对上一轮的间隔**而非绝对时刻，实际采样 0/300/1300/4300ms、终局约 **4.3 秒**（文档此前写 3 秒，差 43%）。常量名与文档同步纠正，消费方据 `checkedAt` 判新鲜度的指引补进文档。
- **渲染告警封顶改 FIFO 淘汰**（R-5）：`renderGateWarned` 满 20 后**新的**危险值永久静默——正是 A-2.2 要消灭的现象换了个位置复发。改为达上限时淘汰最旧条目，告警洪水仍被封顶拦住，第 21 个被忽略的值不再静默消失。去重集同时从**闭包私有**改为 **window 单例**（`window.__DSH_DREAM_SKIN_RENDER_GATE_SEEN__`，纯页面内状态、零网络零持久化）：一是"一页一个封顶"才是真实语义，二是本轮第一版 R-5 用例正是栽在这里——21 个值走 21 个各自持有空 Set 的独立实例，封顶从未启动，**该用例压根不可能失败**，靠变异验证（拆掉淘汰逻辑仍全绿）才抓出来，与 §A-1 是同一类事故的第二次复发。
- **源码钉子先折叠空白**（R-6）：T-02 B 的 B-5 钉子精确匹配空格与换行形态，将来 Prettier/重排会造成**假红**。改为 `CODE.replace(/\s+/g, " ")` 归一化后子串匹配——"永远绿"与"易脆红"是同一枚硬币的两面，都要防。

**第三轮复核整改（S-1..S-3，评审方确认 6/6 真落地、0 条阻塞，另报 3 条轻微项 + 1 条数字口径；四条全部核实为真）：**

- **归因陈述反身复查**（S-1，测试与文本层）：上一轮回应报告写「两条反过度拒绝断言都只在"删除"语义下才通过」——实测**只有诚实值 B 成立**。诚实值 A（`\28`）在 R-1a 插回变异下照样通过，它真正钉的是另一件事（**规范化确实被应用**：旁路规范化后原始串过不了前缀 allowlist，该变异本轮记为 N-B）。更糟的是两条断言原先与走私向量同在一条用例里，**先失败者遮蔽后位断言**，错误归因因此躲过一整轮。修法：两条断言拆为独立用例 `gradient guard (R-1/S-1)`，注释与报告各自写清"谁钉哪一半、谁是谁唯一可见的红"，评审方"归因陈述与用例同等受审"的建议补进 `CONTRIBUTING.md` 准入规则。
- **发版说明里的陈旧符号**（S-2）：本版 A-1 条目仍写改名前的 `DRIFT_CHECKPOINTS_MS`——发版说明里出现了 shipped 代码中不存在的符号名，正是本仓库"只引符号名"规矩要防的腐烂。改用现名并注明更名出处。（历史评审记录 `docs/review-findings-9.27.0-round2.md`、`…-response-9.26.x.md` 里的原名按评审方意见**保留不动**。）
- **晚修正观察者的卸载残留与叠加**（S-3，代码层）：`teardownMaterial()` 此前只摘材质 `<style>`，不断开 `armLateCorrection()` 挂上的观察者；每次 `apply()` 又各自持有独立闭包，多个观察者可并存（各最多再跑 ~7.5 秒）。与"失败可回退、不留残留"的调性不符。改为模块级**单一持有句柄** `lateCorrectionDispose`：新链**取代**旧链、卸载时一并断开，`close()` 后回调由 `disposed` 门拦住（**故意只在这一处**判 `disposed`——两处互为冗余会让变异拆掉其中一处时被另一处托住，正是准入规则记的第二条死法）。评审方建议的"用闭包内已有的 `terminalDrift !== null` 当已挂判据"**未采纳，且已把它当变异跑过一遍**：唯一调用点就在 `terminalDrift === null` 分支内、赋值之后，进门即恒真——采用它等于**永不挂观察者**，实测全量 3 条用例翻红（R-2 撤回 + 两条 S-3），即把上一轮的 R-2 修复整个关掉。改用模块级单一持有句柄后，"一页至多一个存活观察者"才成为可断言的性质（`terminalDrift` 是每次 apply 的闭包变量，跨不了 apply）。
- **自查出的三件事**（不在评审方清单内，用同一把尺量出来的）：① **R-4 只有名字没有语义钉**——把数组按"绝对时刻"解释（`delay = ARR[i]-ARR[i-1]`，字面量一字不动）时**全量用例照样绿**，说明上一轮记的"R-4 变异让 4 条探针用例翻红"其实全来自 `FAST_DRIFT_CODE` 锚点抛错（文本钉，不是行为钉）。补 `drift probe (R-4)`：以 3×400ms 间隔跑阶梯，**中间态 ~700ms 必须仍 `pending`**、终态 ~1.2s 才点名漂移（绝对时刻解释会在 ~450ms 就终局 → 中间态断言翻红，实测已红）；② **`resample()` 与回调里的 `terminalDrift === null` 判空是死分支**——拆掉后变异**不翻红**（这一次"绿"证明的是代码已死，不是用例失效），按 R-3 先例删除而非注释解释；③ **本轮自己的文档写入把转义示例写成了真实控制字节**——多层字符串转义吃掉一层反斜杠，CHANGELOG 里的转义示例变成它所指的字节本身，后果之一是含 NUL 的文件被 git 判为二进制（一次 44 行文档改动在 diff 里显示成整文件重写）。已逐字节修回，并新增 `text hygiene` 门（对外文本禁 C0 控制字节：Tab/LF 允许、CR 只允许作为 CRLF 的一半）。两次反向破坏（注控制字节 / 注孤立 CR）**各自只让这一条翻红**；该用例写完 30 秒内就抓到同类复发（编辑 CHANGELOG 时又打进一个孤立 CR，当场翻红），是"无测试覆盖的修复必复发"的反面证据。
- **数字口径**（评审方附加提示）：走私向量实测 **14 条**，上一轮回应报告与本版 CHANGELOG 记的"13 条"是漏计，已统一改为 14。

**第四轮复核整改（T-1/T-2，评审方确认 4/4 真落地、0 条阻塞，并主动否决了它自己上一轮给出的一条判据；新报 1 条轻微 + 1 条注释级，两条全部核实为真）：**

- **漂移阶梯自身的定时器在卸载后继续发布快照**（T-1，代码层）：S-3 把"卸载即断开、判定冻结"写成了不变式，但 `teardownMaterial()` 只断开晚修正观察者——`scheduleNext()` 里 `setTimeout(step, delay)` 的句柄**从未被保存**，全文件也没有对应的 `clearTimeout`。后果：在阶梯窗口（真机约 4.3 秒）内卸载（换主题、禁用插件、fiber 重启）时剩余轮次照样触发 `runRound()` → `publishVerdict()`，用新的 `checkedAt` 重写机读快照——消费方会看到一份"刚检查过"的快照，而插件已经不存在了。这**直接违反本轮刚写进用例的那句断言**："an unloaded plugin publishes NOTHING"。修法（`driftLadderDispose`，与 `lateCorrectionDispose` 同级的单一持有句柄 + 链入口取代旧链）分两半，各有**只属于自己的红**：① `cancelLadder()` 保存并 `clearTimeout` 在飞的阶梯定时器；② `step()` 入口的 `ladderClosed` 门——它不是 ① 的冗余：定时器一旦开跑，句柄即被消费，同一 tick 内的卸载 `clearTimeout` 是空操作，而那一步仍会跑完并**重新挂上后续轮次**。**为什么前三轮的用例抓不到**（本轮最有价值的教训）：S-3 的两条用例走 `FAST_DRIFT_CODE`（阶梯压到 ~160ms），卸载动作落在终局**之后**，那一刻已经没有在飞的阶梯定时器——是**测试时钟**把真机的 4.3 秒窗口藏了起来。这条已升为 `CONTRIBUTING.md` 准入规则 (1) 死法清单的第五种。新增 3 例：`drift probe (T-1)` 三条（卸载取消在飞的阶梯定时器 / 抢先跑出队列的那一步被手动补跑后既不发布、也不再挂上后续轮次 / 重新 apply 取代旧链而非叠链），并把两条断言分置于不同用例，避免重演 S-1 的"先失败者遮蔽后位"。
- **单一持有句柄是实例级、不是页面级**（T-2，注释层）：评审方指出 `lateCorrectionDispose` 与本轮的 `driftLadderDispose` 都在**工厂作用域**，因此"至多一个存活观察者/阶梯"只在"一页一个模块实例"的前提下成立，与 R-5 特意做成 window 单例的取舍不同。已在声明处写明作用域与其理由（R-5 的"一页一个封顶"就是它的语义本身，而两个实例并存已是异常加载态，不值得为此再开第三个 `window` 键、把公开契约扩宽）；两处均**不**改为页面级——评审方同样倾向不改，理由一致。

### 构建
- CI typecheck 的 TypeScript 补丁版本钉死 `typescript@5.6.3`（C-7，此前 `@5.6` 浮动，toolchain 漂移会让 CI 与本地结论不一致）。

### 回归门
- **95/95**（77→85→87→92→95，累计 +18 例）：第一轮 8 例——A-1 四情形（空 DOM 恒 pending、全命中终局清零、单组缺失精确点名、晚挂载自我撤回）+ 中途轮次不得提前终局 + 桌面壳 pending 收敛；B-3 schema 逐键守卫；A-2.1 转义/注释走私在写入门翻红；A-2.2 `-webkit-` 策略拒绝 + 渲染拒绝可见告警；B-6 `ok:false` 播种且零回写；B-5 受控例外源码钉子。第二轮 2 例——R-2 终局后晚挂载经晚修正观察者**单向撤回**（并断言 console 告警不重复、观察者不留常驻）；R-5 共享 window 单例下 21 个各别危险值全部获警 + 容量恰好停在封顶（淘汰真的发生）+ 重复值不刷告警（证明确实共享而非"够不着的封顶"）。第三轮 5 例——`text hygiene`（本轮自查事故的门：自有文本禁 C0 控制字节）、`gradient guard (R-1/S-1)`（反过度拒绝断言独立成例，A/B 各钉一半）、`drift probe (R-4)`（阶梯"相对间隔"语义的行为钉，中间态 + 终态双采样）、`drift probe (S-3)` 两条（卸载断连且快照冻结 / 至多一个存活观察者）。第四轮 3 例——`drift probe (T-1)` 三条：卸载取消在飞的阶梯定时器（用被放慢成 4321/5432/6543ms 的阶梯，卸载时确有定时器待触发）、抢先跑出队列的那一步被手动补跑后**快照对象引用都没换**（发布即违反不变式，与 `checkedAt` 的毫秒精度无关）、重新 apply 取代旧链而非叠两条阶梯。A-2.1 走私向量表在第一轮 9 条的基础上扩到 **14 条**（补 `\d`/`\c` 解码形与 `\<CR>`/`\<FF>` 字面续行），并新增 2 条**反过度拒绝**断言（第三轮拆成独立用例，见下 S-1）。
- **变异验证**：四轮共 **27 次反向破坏**，**每一次都有用例翻红**；此外另做 **4 次辅助反证实验**（不计入破坏数，见下；第三轮 3 次、第四轮 1 次）。第一轮 10 次（A-1 两道门控各拆一次、规范化旁路、A-2.2 告警静音、degraded 单边加字段、`applyCompleted` 移除、`ok:false` 不播种，以及 9.26.1 轮沿用的 3 次持久化破坏）；第二轮 7 次（R-1a 解码换行"插回"、R-1b 拆除规范化后控制字符门、**R-1c 整体退回修复前状态**、R-2 不挂晚修正观察者、R-4 相对间隔改成绝对时刻、R-5 封顶退回永久静默、R-6 受控例外分支翻转），第三轮 6 次（R-4b 数组按绝对时刻解释而字面量不变、S-3a 卸载不再断开观察者、S-3b 回调丢掉 `disposed` 门、S-3c 新链不取代旧链、H-a 往 `CHANGELOG.md` 注入一个控制字节、H-b 往 `README.md` 注入一个孤立 `\r`），第四轮 4 次（T-1a 拆掉阶梯定时器的取消动作、T-1b 拆掉 `ladderClosed` 门槛、T-1c 整体退回修复前状态即 `teardownMaterial()` 不再处置阶梯、T-1d 新链不取代旧链）。第三轮把**与归因陈述有关的 6 次既有变异**（R-1a、R-1b、R-1c、R-2、R-5，以及第一轮记过的"规范化旁路"）连同第三轮新增 6 次，在同一个**隔离副本树**（绝不触碰工作文件；上一轮的变异脚本因内存快照回写吞掉过一次在改的测试文件，这一轮换成交换目录）里重跑，并**逐条打印翻红断言原文**；其余 11 次（第一轮余下 9 次、第二轮的 R-4——那版改动字面量并连带移动锚点，与本轮 R-4b"字面量一字不动"不是同一靶子——与 R-6）第三轮未重跑，记录沿用上一轮实测——归因不再凭记忆书写。第三轮六条的实测落点：R-4b 红在 `MID: round 3 of 4 has not run yet under the gap reading`、S-3a 红在 `unload disconnects the late-correction observer`、S-3b 红在 `an unloaded plugin publishes NOTHING - the verdict is frozen, not improved`（注意它红的**不是**"断开"那条而是"冻结"那条——断开断言由 `close()` 的另一半把住）、S-3c 红在 `at most ONE live late-correction observer per page`；H-a 与 H-b 各自**只**让 `text hygiene` 一条翻红（全量 `fail=1`）——控制字节与孤立 CR 两种腐形各有断言，且该用例同时守住"扫描确实覆盖全树"（`targets.length >= 10`，防止将来改成扫一个空列表变成永远绿）。第四轮四次的实测落点（同样在隔离副本树里跑，工作文件不触碰；**本版本第四轮未重跑前三轮的 23 次**，那批记录沿用第三轮的重跑结果）：T-1a 红 2 条且**不含**"抢先补跑"那条用例——`unload CANCELS the armed drift-ladder timer (S-3 was only half done)` 与 `and its pending timer was cancelled at the new chain, not left to fire`；T-1b 红 2 条且**不含**"取消"那条——`an unloaded plugin publishes NOTHING through the ladder either`（该断言比的是快照**对象引用都没换**：发布必然分配新对象，因此与 `checkedAt` 的毫秒精度无关）与 `the superseded chain publishes NOTHING`；T-1c（整体退回）红在"取消"与"抢先补跑"两条；T-1d 只红 `the superseded chain publishes NOTHING` 一条——同一用例后半的"取消"断言被它遮蔽（正是 S-1 记的那种遮蔽形态），但取消这一半在 T-1a 下有自己独立可见的红，所以没有哪条断言是"只会被遮蔽、永远没人能红"的。两组"不含"正是本轮要的证明：**取消动作与门槛各自都有只属于自己的红**，不是互为冗余的两道门（准入规则 (1) 第二条死法的主动规避）；而 `drift probe (T-1)` 取代用例内部两条断言的分摊同样清楚——行为断言由 T-1b/T-1d 抓到、取消断言由 T-1a 抓到。四次辅助反证（第三轮 3 件 + 第四轮 1 件）：① **归因陈述逐条重跑**（R-1a/R-1b/R-1c/规范化旁路各一次，打印唯一翻红断言）——据此更正 R-1a 的归因（S-1：R-1a 下**只有**诚实值 B 红，全量 `fail=1`；诚实值 A 在四种实现形态下都通过，它红的是规范化旁路变异）与 R-4 的红来源（见上）；② **评审方建议判据的反证**——按 round-3 S-3 建议把"是否已挂"改写成 `terminalDrift !== null`，实测**全量 3 条用例翻红**（R-2 撤回 + 两条 S-3），即该判据会把 R-2 的修复**整个关掉**，故未采纳、改用模块级单一持有句柄；③ **故意留下的"变异不翻红"**——拆掉 `resample()` 的 `terminalDrift === null` 判空后用例全绿，这一次的绿证明的是**代码是死的**（该分支永不可达），据此删除死分支而不是给用例补断言（R-3 同族）；④ **门槛位置的形状实验（第四轮 T-1e，不计入破坏数）**——按评审方建议的形状把 `ladderClosed` 从 `step()` 入口挪进 `runRound()`，实测 `fail=1`、唯一翻红的是 `and the slipped step arms NOTHING further — the chain died with the fiber`，而"什么都不发布"那条**照样绿**（被拦住的 `runRound` 确实没发布）。这条实验是"门槛位置有语义"这一说法的唯一依据：只看结果的话两种写法都不发布任何东西，谁也不会发现门放错了地方——准入规则 (3)（语义翻转不可观测＝没有钉住）在生命周期面上的一次落地。R-1 的三次变异证明两道门**互为冗余**：单独拆任一道都仍有向量翻红（R-1a 由诚实值 B 抓到、R-1b 由 `\2\0` NUL 向量抓到），整体退回则由 `\75\a rl(` 走私向量抓到——正是评审方复现的那条。R-3（死逻辑删除）行为不可观测，以全量用例背书。**第三轮把这一条规则反身用在评审方与本仓库自己的归因陈述上**（见下 S-1 与"R-4 语义钉"）。
- **"永远绿"与"假归因"事故的处置**（三次永远绿，全部由准入规则 (1) 抓出）：第一轮是两个只断言终态的探针用例（补中途 + 终态双采样后翻红）；第二轮是 R-5 的第一版用例（21 个独立实例各持私有 Set，封顶永不触发，拆掉淘汰逻辑也不翻红——重写为共享 window 单例后才会真红）。前两次教训合并升级为 `CONTRIBUTING.md` 的**仓库级测试准入规则**（评审方第二轮点名要求固化），第三轮再把"归因陈述本身也要过反向检查"与"语义翻转不可观测＝没有钉住"补进同一条规则。`tsc -p tsconfig.json` 通过。

### 文档
- `docs/desktop-support.md`：诊断通道 schema 重写（三态 pending / applying / 受控例外 / probed 语义）、渐变守卫机制与 `-webkit-` 决策、持久化"无可用答案"三出口语义、已验证清单 77→87 与两轮变异验证数字更新、WebKit/Firefox 未验证项措辞随实现如实收窄。第二轮增量：守卫补"\a 删除语义 + 双重控制字符门"、探针补 `DRIFT_RETRY_DELAYS_MS` 相对间隔与终局约 4.3 秒、晚修正观察者机制、消费方新鲜度指引、R-1 浏览器解析行为与 R-2 窗口限制列入未验证清单。第三轮增量：守卫的**反过度拒绝断言归因改正**（A 钉"规范化被应用"、B 才是"删除语义"唯一的红，两条已拆成独立用例）、晚修正观察者补**生命周期约束**（`teardownMaterial()` 断开、同页至多一个存活实例、卸载后判定"冻结"而非"变好"）、向量数 13→14、已验证清单 87→92 与三轮 23 次变异（含"隔离副本树重跑并打印翻红断言原文"的方法变更）。第四轮增量：漂移探针的**生命周期**补全（阶梯定时器同样归 `teardownMaterial()` 处置、"卸载后不再发布任何东西"覆盖整个 4.3 秒窗口而非只有晚修正观察者）、单一持有句柄的**作用域如实标注为实例级**（与 R-5 的 window 单例作对比并说明为什么不跟进）、已验证清单 92→95 与四轮 27 次变异、"测试时钟把真机时间窗藏起来"这一类漏检写入未验证/局限清单的同侧说明。
- `CONTRIBUTING.md`：新增**测试准入规则**——每条新用例须过两关：(1) 变异验证（反向破坏必须能让用例如实翻红，"永远绿"的检查等于没有检查）；(2) 状态机/异步收敛类用例必须同时断言**中间态与终态**两个采样点（本仓库 9.27.0 第一轮变异实测抓出的两个漏红变异即此规则的来源，评审方第二轮建议固化为仓库纪律）。规则 (1) 在本轮又抓出第二起事故（R-5 首版用例的私有 Set），出处与两起事故一并写进条目正文。第三轮把**两关扩到四关**：新增 (3)"语义翻转后行为不可观测＝没有钉住"（更名/文档类修复必须做"字面量不变的反向解释"变异）与 (4)"报告里的归因陈述与用例同等受审"（写了"X 由 Y 翻红"就要隔离重跑一次）；规则 (1) 的死法清单同时补进本轮新观察到的两种：**先失败者遮蔽后位断言**、**死分支恒绿（该删的是代码）**；第四轮再补第五种：**测试时钟把真机的时间窗藏起来**（生命周期用例若在被压缩的时序上运行，卸载可能落在资源已消失之后，"卸载不留残留"因此只做了一半却没被任何用例检查）。`tests/client.smoke.test.cjs` 文件头的镜像细则同步改写为"以 CONTRIBUTING 为准 + 摘两条最贴用例作者的"。
- 逐条回应报告 `docs/review-findings-response-9.27.0-round3.md`（S-1/S-2/S-3 与数字口径 4/4 采纳；S-3 未照评审方给的判据实现——那条判据在唯一调用点上恒为真，理由见该报告 §3——已把它当变异跑过一遍：采用该判据会让 3 条用例翻红）；本轮把评审方"归因陈述也要反身检查"的建议同时用在对方与自己身上，共查出 5 处上一轮没看见的问题（评审方 2 处：S-1 归因、§4 的 `ul\a rl(` 非真走私；我们自己 3 处：R-4 缺行为钉、一处死分支恒绿、以及本轮自己的文档转义腐形）。
- 逐条回应报告 `docs/review-findings-response-9.27.0-round4.md`（T-1/T-2 2/2 采纳；T-1 的修法比评审方的建议多做一步——`clearTimeout` 与阶梯门槛**不是**互为冗余的两道门，门槛管的是"定时器已经开跑、句柄已被消费"那一 tick，取消管的是"还在队列里"那一 tick，两者各有只属于自己的红；并把评审方指出"为什么前三轮的用例抓不到"升为准入规则的死法第五种。该报告同时**收下评审方对第三轮建议的自我否决**，并把 92→95、23→27 的口径同步进行内的补记头）。
- 逐条回应报告 `docs/review-findings-response-9.26.x.md`（8/8 采纳，含每条的落点符号、验收测试名与两处对评审原文的微调；其中 §1 一处论证被第二轮实测证伪，已显式标注**作废**而非静默改写）与 `docs/review-findings-response-9.27.0-round2.md`（6/6 采纳，R-2 取评审方三案中成本的观察者方案；**第三轮又在该文件内就地标注了两处被证伪的归因并加了补记头**，含 13→14、87→95、17→27 的口径更正（第三轮记为 92/23，第四轮再更新至 95/27），未静默改写任何历史结论）。

## [9.26.1] - 2026-09-26

> **三方对抗评审整改轮**（蓝军 → 第三方独立复核 → 中立裁定，基线 89f97ec）。报告存于 `docs/review/`（本地保留，不进版本库）。本条发布前无新能力，全部是正确性、包装与文档如实性。

### 修复
- **诊断快照跟随宿主采纳**（B-01）：boot 期发布早于 host GET 落定，采纳后的 `skin/shell` 此前不会回写——`loadFromHost` 采纳分支尾部补 `publishStatus()`（prev-merge 保住漂移探针结果）。
- **出厂壁纸迁移 × 宿主采纳的语义倒挂**（T-02，三方评审唯一的持久化语义新缺陷）：迁移写入改为按 `hostProbeSettled` 分支——探针落定**前**为 provisional（工厂封存，宿主持久值含"用户清空"恒赢，issue #51 语义）；落定**后**为普通用户态写入（会推送，把 `$DSH_HOME/dream-skin.json` 里的旧图一并替换，各 origin 收敛）。配套把 `hostProbeSettled = true` 提前到采纳循环之前，使 `onHostReady` 重跑内的迁移即为用户态写（朴素 `factory:true` 修法会被推送过滤器挡掉、永远无法收敛——裁定方实测否决，两方原始建议均未采纳）。
- **宿主采纳旁路写入校验**（T-03）：篡改/陈旧的宿主状态文件此前可把带 `url()` 的渐变或非法协议 URL 直接灌进存储，绕过 `setWallpaperKind` 写入门。采纳循环对 wallpaper 族键补同一对 `isSafeWallpaperGradient/isSafeWallpaperUrl` 守卫（空/`null` = 用户清空，照常放行）。渲染层守卫原本就在，双层格局恢复完整。
- **漂移探针机读输出**（B-07/B-08/B-09）：`anchors.drifted` 只含合法原始选择器（人读后缀移到 console 行）；`probed` 改按 `isDesktopShell()` 计数（桌面命中不再少计）；degraded 内联快照补齐与 ready 相同的字段集（不可知项显式 `null`），消费方永不撞 `undefined`。
- **发布包装配**（B-04/B-06）：`files` 移除 `docs/screenshots/`（两张旧真人照片截图不得再随 npm 包分发；真机重截后回补）、补入 `docs/desktop-support.md`（旗舰交付物此前不进包）；README 的截图/成长图相对链接改指 GitHub 绝对 URL（包内文件已不存在，防死链）。`package-lock.json` 版本同步。
- **CI/typecheck**（T-05/B-13）：`typecheck` 脚本改 `npx -y -p typescript@5.6`（原脚本引用未安装依赖，本地必失败）；矩阵补 Node 24。

### 文档如实性（勘误，见 9.26.0 段内两处显式标注）
- 撤回"漂移探针自纠"失实条（该 bug 从未存在于任何提交，按 9.15.3 先例公开作废而非静默改写）；壁纸体积数字校正（277KB / -25.9% / 图 7.0KB）；`docs/desktop-support.md` 行号引用改引**符号名**（行号随整改必然位移，符号名不会）、66/66→77/77、"旧照片仅存于 git 历史与工作区截图"改如实（曾同时是 npm 包组成，现已移出）；"写入层覆盖全部路径"的措辞随 T-03 修复兑现。

### 回归门
- **77/77**（+8 例）：合成 fixture 正向迁移（指纹三元组命中即换、同长度异哈希不换）+ 指纹常量钉死例；桌面壳探针 `probed=7`/原始选择器/console 标签例；anchors prev-merge 存活例；degraded 全 schema 例；渲染守卫"未应用"正断言（原 `doesNotThrow` 空断言补强，B-05）；宿主采纳后 status 刷新例；迁移×采纳两个方向性用例（宿主清空不复活 / 宿主旧图收敛推送）；采纳守卫例（走私拒绝 + 合法值照常采纳）。
- **变异验证**：对以上 8 例逐条反向破坏对应修复（10 处变异，含删早置 `hostProbeSettled`、迁移改回恒定 provisional/user-state、删 `publishStatus()`、删采纳守卫、探针计数/装饰串、degraded 字段、渲染守卫、迁移接线），**每一处变异都有用例翻红**，无"永远绿"的门禁。

### 未验证项 / 刻意推迟（如实记录）
- P2 卫生轮未做：渐变字符串层 `\75 rl(` 转义检测（Chromium CSSOM 已在渲染层拦截，实测；WebKit/Firefox 行为未实测，故 denylist 补强推迟到真机矩阵轮）、壁纸 history 列表的迁移同步过滤、image 种类写入校验、atob mock 浏览器语义化。
- 官方 DSH Desktop **真机像素级验证**仍缺（用户排期）；`docs/screenshots/` 两张含旧图的截图**已从 npm 包移出**但仓库内仍在，待真机重截后回补；
- 旧照片仍存在于 git 历史（维护者已决定不重写）；新出厂图的生成记录与权属留档见 `docs/review/`（不进包）。

## [9.26.0] - 2026-09-26

> **官方桌面版对齐 + 尽调加固**（面向 2026-09-25 官方 DSH Desktop 预览版）。

### 新增
- **桌面诊断通道 `window.__DSH_DREAM_SKIN_STATUS__`**：漂移探针从"只能 scrape console.warn"升级为机读快照——官方桌面端工具/preload 桥可直接读取 `{ status: ready|degraded, build, shell, skin, anchors: {probed, drifted}, checkedAt }`；降级路径（issue #43 的哑模块）也内联发布 `degraded + reason + lastError`，让诊断方能区分"插件没装"与"宿主 seed 换代"。**纯只读、零网络请求、零持久化改动**（不触碰三层同步层——真机验证前的刻意取舍）。新增 `PLUGIN_BUILD` 常量并由测试守卫与 package.json 版本对齐。
- **docs/desktop-support.md**：桌面端兼容与支持矩阵——支持状态总览、桌面壳检测契约、三层持久化、**锚点依赖清单（逐条列失效后果与对策）**、安全边界、已验证/未验证诚实清单、对官方的三条兼容契约建议。README 兼容性表与 docs/PROJECT.md 已互链。
- **CI typecheck job**：`.d.ts` 声明文件首次纳入编译校验（strict；`typecheck/cordis-stub.d.ts` 为私有包 `@deepseek-ai/cordis` 的仅类型桩，保证自包含）。发布包维持零依赖（TypeScript 只在 CI 内按需拉取，不进 `files` 白名单）。

### 变更
- **出厂壁纸替换 + 一次性迁移**：旧出厂壁纸为一张真人照片（84.8KB），不适合充当生产力工具的默认视觉，也是官方尽调视角下的首要减分项。替换为**原创生成的抽象弥散光图**（1200×678，7.0KB），`lib/client.js` 374KB → 277KB（-25.9%，base64 载荷 113KB → 9.4KB。本组数字经 9.26.1 勘误：原记 "276KB / 7.2KB" 系发布时手算偏差，实测以 89f97ec 内嵌资源为准）。同时新增 `migrateLegacyFactoryWallpaper()`：对仍停留在旧出厂壁纸的用户，在启动恢复阶段以**三重内容指纹**（data URL 长度 + 解码字节长度 + cyrb53 哈希，全部对上才写入）识别旧图并一次性换成新出厂图——用户自设壁纸、任何非旧图内容均不可能被误写；迁移挂在 `restorePersistedState`（首启与 host 接管后都会经过），不触碰三层同步层。**负向路径**（短图 / 同长度走私 / 同字节数空白载荷 / 当前出厂图幂等）进 CI 回归门；**正向路径**经一次性离线测试确认命中后替换，旧图素材本体不进仓库。注意：旧照片仍存在于 **git 历史**（是否重写历史由维护者决定），且 `docs/screenshots/` 两张截图仍含旧图，**待真机重截**。
- ~~**漂移探针桌面锚点修正**（本会话自纠）：桌面壳侧边栏探针此前把带注释的字符串直接喂给 `querySelector`（非法选择器 → 桌面端恒判漂移），已改为查询原始选择器、注释只出现在报告文案中。~~ **⚠️ 本条作废（9.26.1 勘误，按 9.15.3 先例公开更正而非静默改写）**：经三方评审逐提交核验，"注释串喂给 `querySelector`" 的 bug **从未存在于任何提交**（`git log --all -S` 零命中；探针一直是 `querySelector(DESKTOP_SIDEBAR_SELECTOR)` 纯常量）。真实缺陷有二，均已修于 9.26.1 并配回归用例：机读 `anchors.drifted` 列表混入带人读后缀的装饰串（不是合法选择器），以及桌面命中时 `probed` 少计 1。

### 加固
- **渐变壁纸注入校验**：渐变值经 `el.style.backgroundImage`（CSSOM）写入，无法借 `;`/`}` 逃逸，但 `url()` / `image-set()` / `element()` / `cross-fade()` 等合法图像函数仍可让页面静默拉取第三方端点（内网探测/埋点）。新增 `isSafeWallpaperGradient()`（仅放行 linear/radial/conic-gradient、拒绝一切资源拉取函数与控制字符），**写入（`setWallpaperKind`，覆盖导入/分享链接/恢复全部路径）与渲染（`wallpaperBackgroundCss`）双层把关**——与既有 URL 壁纸的"出口拒绝"模式对齐。合法预设/弥散光渐变不受影响。
- docs/PROJECT.md 失实修正：host 半边早已不是 "no-op apply"（现为状态文件 + 围栏路由）；v0.x 里程碑标注为历史、v0.4 补"已完成"。

### 回归门
- **69/69**（新增：渐变注入 4 例——`url()` 走私拒绝、裸色值拒绝、多层弥散光放行、被篡改存储渲染期忽略；诊断通道 2 例——ready 快照与 degraded 内联发布；壁纸迁移负向 1 例——三类走私 + 出厂图幂等）。`tsc -p tsconfig.json` 通过。

### 未验证项（如实记录）
- 官方 DSH Desktop 预览版真机像素级验证尚未执行（矩阵中该行标注"预期兼容"）；
- **`docs/screenshots/preview.png` 与 `settings.png` 仍展示旧出厂壁纸，需真机重截**（不拿合成图冒充真机截图）。

## [9.23.0] - 2026-09-23

> **子路径部署支持**（issue #56，报告者 shuangji66）。

### 变更
- 浏览器半身持久化 API 地址不再硬编码 `/dream-skin/api`，改为从 `document.baseURI` 相对解析（`new URL("dream-skin/api", document.baseURI).pathname`）——与页面 `<base href="./">` 的子路径保证对齐，经网关子路径反代（如飞牛 OS：`/dsh/ → 宿主根`）访问时持久化通道可正常命中；根路径部署解析结果与原来完全一致，行为不变。
- host 半身路由本身以 `kind: "prefix"` 相对注册，网关剥掉子路径后宿主收到的仍是 `/dream-skin/api`，无需改动；信任栅栏只比对 Host/Origin，与路径无关。

## [9.16.0] - 2026-09-16

> **DSH Desktop 侧边栏透明度修复版**（issue #55）。发布前经**蓝军 → 第三方独立复核 → 中立裁定**三方对抗评审，本条目已按裁定结论整改；评审报告存于 `docs/review/`（本地保留，不进版本库）。

### 根因
- **A（决定性，桌面壳遮蔽）**：第三方桌面壳 `dsh-plugin-desktop` 把上游侧边栏渲染在自己的 `<aside class="dshDesktopSidebarSurface">` 里，并在该元素上**就近重新声明**了 `--dsw-specific-sidebar-fill`。CSS 自定义属性一旦在祖先元素上就近声明，就遮蔽 `:root` / `body` 上的主题覆盖值——该子树内所有 `var(--dsw-specific-sidebar-fill)` 都解析成壳自己的值，`shadeTokens2()` 按滑杆算出的 wash 永远到不了像素。右侧文件面板不在这个 `<aside>` 内，因此照常响应：**左右不一致**正是这条根因的现场特征。
  - **独立复核过的部分**：`dsh-plugin-desktop@2.0.0`（npm 上唯一的 2.x）`lib/client.js:248` 是全包**唯一**一处该 token 声明，值为 `transparent`，普通类选择器、不带 `!important`；该包内不存在 `data-dsh-desktop-material` 之类的材质分支。
  - **未能独立复核的部分**：报告者在 `dsh-plugin-desktop@2.0.10` 上还观测到材质分支（材质关 = `var(--dsw-alias-bg-layer-1)`，Windows 默认即关）。该版本不在 npm 上，本机亦无该壳，**故材质分支只能转述、无法从源码证实**；两种变体都不带 `!important`，这正是修复所依赖的全部前提。
- **B（次因，linked 静默忽略）**：跟随壁纸打开时 `shadeTokens2()` 用画布 alpha 并忽略 `SIDEBAR_OPACITY_KEY`，而滑杆既不置灰也不自动解绑——「有反馈、无效果」。
- **C（附带，默认值分叉）**：同一偏好在读取回退与出厂播种两处默认值不一致（读取：透明度 1 / 跟随开；播种：0.28 / 关闭）。

### 修复
- **A**：材质样式表新增 `.dshDesktopSidebarSurface { --dsw-specific-sidebar-fill: inherit !important; }`——让该子树重回继承链。壳自己的主题呈现器把**含本插件 overrideTokens 层**的合成 token 发布在祖先上，wash 因此重新抵达侧边栏（该链路经第三方与中立裁定方分别从源码复核确认；**非像素实测**）。`!important` 之所以够用，是因为壳的声明**不带** important：important 高于普通声明，与特异性无关。
- **B**：拖动「侧边栏透明度」滑杆 = 用户明确要求单独控制侧边栏 → **释放「跟随壁纸」**，随后写入的值才真正生效。释放逻辑下沉到滑杆 action（两个滑杆共用同一函数，不会各写各的），勾选框在同一渲染帧内同步为未勾选；**仅当画面确有壁纸 wash 时才释放**——没有 wash 时侧边栏填充本就未被接管，此时改偏好属于「改了设置却没有可见效果」。滑杆改用专用提示文案（8 语言新增 `background.sidebarOpacityHint`），不再复用勾选框的说明。
- **C**：提取 `SIDEBAR_DEFAULTS` 单点真源（`opacity: 0.28` / `link: false`），读取回退与出厂播种由同一张表派生——两处不可能再漂移；缺键档案与出厂档案因此产出完全相同的侧边栏 token。
- **可观测性**：桌面端规则纳入漂移探针，且探针锚点是**宿主信号** `data-dsh-desktop-mode`（而非壳自己的 frame 类名——用后者会在壳改名时把门闩和目标一起改掉，探针永远不响）。

### 已知取舍与未验证项（如实记录）
- 该规则让**皮肤接管桌面壳侧边栏填充**，与原生 DSH Web 一致；包含无壁纸 / 清空壁纸后的情形（此时侧边栏画皮肤的侧边栏色而不是壳的透明底色）。壳若在 `advanced` 之外的模式渲染侧边栏，则不存在这个 `<aside>`，规则不匹配（此时也无遮蔽，滑杆本就正常）。
- **像素级未验证**：本机未安装 DSH Desktop，`inherit` 让 wash 抵达侧边栏目前是源码级链路推理 + 沙箱行为测试，**没有真机截图为证**。
- 侧边栏滑杆只在存在壁纸 wash 时改变画面；无壁纸时它不会覆盖侧边栏填充（该限制未在本次改动）。
- 全量回归 **65/65**（issue #55 用例：桌面规则的存在性与限定性 / 滑杆端到端行为——unlinked·linked 拖动解绑·缺键回退·无 wash 不解绑）。

## [9.15.3] - 2026-09-16（未发布，条目作废）

> ⚠️ **该版本未发布，条目已作废**。它是本页 9.16.0 的整改前草稿，含两处失实记述，按三方评审裁定公开更正：
> 1. 声称上游行为"经代码验证完全属实"并引用 `body:is([data-dsh-desktop-mode=…]) [data-dsh-desktop-material=…] .dshDesktopSidebarSurface` 等选择器——这些**不属于** npm 上唯一可得的 `dsh-plugin-desktop@2.0.0`（该包内 `material` 零命中），实为报告者在未发布的 2.0.10 上的观测；
> 2. 声称修复"零副作用"并称"滑杆自动解绑"——前者对无壁纸/清空壁纸场景不成立（见 9.16.0 的取舍说明），后者的"源码级契约"测试可被死注释假冒（第三方与裁定方均已实测复现）。
>
> 版本号本身也违反本文件第 3 行的 `M.D.X` 规则（当日首个版本应为 `9.16.0`）。


## [9.15.2] - 2026-09-15

> **动态端口桌面壳壁纸闪烁修复版**（issue #51，报告者 Max-Null 的机制分析经代码验证完全属实）。

### 根因（已代码实锤）
- `applyFactoryDefaults()` 的「是否首次安装」判定完全基于页面 localStorage（哨兵键探测，`lib/client.js` 哨兵循环）。localStorage 按 origin（scheme+host+port）隔离，而 Electron 壳（如 SSiD）内核监听 `--port 0` 随机端口——**每次启动 origin 都变，localStorage 恒为空 → 每次启动都被判成首次安装**；
- 于是首帧按工厂默认画出（含出厂壁纸），随后 `/dream-skin/api` 的 host 持久状态到达并覆盖 —— 表现为「工厂壁纸闪一帧后被用户配置替换」。固定端口（origin 稳定，`factory-applied` 标记可命中）不复现，与报告者的对照组一致。

### 修复（采用报告者方案 A）
- **壁纸项延后播种**：`FACTORY_DEFAULTS` 中的 4 个可视壁纸键（kind/wallpaper/url/gradient）不再在启动时立即写入——改为挂起回调，等 host 探针落定后分流：
  - host 状态**含任意壁纸键**（含 `null` = 用户清空过）→ 视 host 为权威，工厂壁纸**永不播种**（同时杜绝「清空壁纸被出厂壁纸复活」的回归）；
  - host 状态**无壁纸键**（真·首次安装）或 **host 不可达/超时** → 照常播种出厂壁纸（只晚几百毫秒，真首装仍开箱即用）；
- 其余非可视工厂项（皮肤、强调色、透明度、材质预设等）保持同步播种——它们是 token 变化，即使被 host 覆盖也不产生可见闪烁；
- 延后播种**真正写入**时补一次视觉重绘（真首装场景 `adopted` 为 false，首次绘制需要这笔壁纸）。
- 回归门 **63/63**（新增 3 条 issue #51 场景用例：清空壁纸不闪不复活 / 真首装延后拿到壁纸 / host 不可达仍播种；`round-6` 首装用例适配延后时序）。

## [9.15.1] - 2026-09-15

> **对抗审查整改版**（adversarial-review：蓝军 → 第三方复核 → 裁定 → 整改，针对 issue #50 三轮修复的二次加固）。

### 背景
- 对 9.14.0–9.15.0 三轮修复做完整对抗评审：蓝军 7 条发现 + 第三方 1 条新发现，逐条验证后合并为 P0–P2 执行清单。

### 修复
- **误标防护（P0）**：锚点选择器加语境闸门——排除 `[role="dialog"]` 后代，设置弹窗内的编辑框不再被误标上漆（玻璃规则会把误标表面的背景剥成透明）；
- **防透底冲突消除（P0）**：`COMPOSER_HASH_CARDS` 移除 `.Mbwy4a_card`（用户提问选项卡）——它的不透明防透底填充是刻意设计，后置玻璃规则同特异性会击穿它；该卡从未应该被打标；
- **圆角判据修正（P1）**：百分比圆角（如 `50%`）不再被 `parseFloat` 误读成 50px；新增宽度守卫——候选祖先不得比锚点宽 3 倍以上，防止玻璃上漆到侧栏/消息列等错误大容器；
- **生命周期清理（P1）**：标记器的轮询 interval 与 MutationObserver 在插件卸载时统一释放（此前泄漏）；轮询达成首次标记后立即自停；
- **流式输出性能（P2）**：observer 只在「新增节点」时重扫——纯文本流式输出与属性变化不再触发全量 `querySelectorAll` + 强制 layout；
- **漂移探针去污染（P2）**：探针选择器移除自家 `[data-dsh-dream-skin-composer]` 兜底——此前标记器一旦打标（哪怕误标），探针永久绿灯，宿主哈希漂移告警被静默吞掉；
- **测试有效性（P2）**：新增**行为级**回归用例——假 DOM 驱动真实标记器，断言 contenteditable 锚点成功打标、dialog 内锚点被拒绝、`50%` 圆角被拒收（此前只有源码字符串自匹配断言）。回归门 **60/60**。

## [9.15.0] - 2026-09-15

> **composer 标记器换锚点版**（issue #50 第三轮，彻底修复）。

### 根因（实锤，非猜测）
- 下载并解包了 `@deepseek-ai/dsh-client-ui-conversation@0.1.5-rc.2`（真正的聊天 UI 包，宿主 `dsh-web-frontend` 只是入口壳）：**0.1.5-rc.2 的聊天输入框根本不是 `<textarea>`，而是 Lexical contenteditable div**，带稳定 data 属性 `data-composer-input`；
- 9.14.0/9.14.1 的标记器锚点全是「找 textarea」——在 0.1.5-rc.2 上从第一秒就永远找不到对象，轮询 30 次也只是把错误动作重复 30 次。此前 dsh-web 旧版有 textarea 所以一直没暴露。

### 修复
- 锚点选择器改为三级兜底：`[data-composer-input]`（Lexical 指纹，0.1.5-rc.2 主锚点）→ `textarea`（旧宿主）→ `[contenteditable='true'][role='textbox']`（通用兜底）；后续的圆角祖先爬升、轮询、observer 逻辑全部复用；
- 新增防回归断言：锚点选择器必须包含 `data-composer-input` 指纹（直接校验源码，不允许软通过）。回归门 **59/59**。

## [9.14.2] - 2026-09-14

> **npm 元数据版**（无代码变更，提升插件在目录与 npm 搜索中的可发现性）。

### 变更
- npm `description` 改为双语（补充英文能力摘要，明确支持原生 DSH Web 与 DSH Desktop 等第三方桌面端）；
- `keywords` 从 9 个扩到 15 个：新增 `deepseek`、`dsh-desktop`（第三方桌面端用户的搜索入口）、`theme-pack`、`glassmorphism`、`主题`、`美化`——DSH Community Market 的目录 adapter 与 dshfind 均从 npm `latest` 抓取结构化字段，元数据即分发。

## [9.14.1] - 2026-09-14

> **DSH Desktop（第三方桌面端）适配备忘**（issue #50 用户续报）。

### 修复
- **composer 标记器自愈化（dsh-desktop 适配）**：9.14.0 的 DOM 形态标记只在启动时跑一次、且 `MutationObserver` 挂在 `document.body` 上——dsh-desktop（Electron 壳，固定上游 0.1.5-rc.2）挂载会话区更晚，首帧常无输入框，单次标记落空后滑杆依然失效。现改为：启动轮询（每 0.8s，最多 30 次）直到首次标记成功 + observer 改挂 `documentElement`（客户端 bundle 可在 `<body>` 解析前注入，挂 body 会静默抛错死亡）+ 标记**所有**可见 textarea（不再只挑最大的一个）+ 圆角阈值两段放宽（≥8px → ≥4px 二次尝试，适配桌面端更扁平的卡片 chrome）。
- 全量回归 **59/59**（修正沙箱守卫：`setInterval` 可用性检查）。

## [9.14.0] - 2026-09-14

> **输入框透明度在 dsh 0.1.5+ 失效修复版**（issue #50）。

### 修复
- **composer 玻璃规则全面去哈希类名依赖（issue #50）**：dsh 0.1.5 重掷了全部宿主哈希类名（`uV2eYG_card`、`Mbwy4a_card` 等），玻璃 CSS 一条都匹配不上 → 「输入框透明度」滑杆在任何主题下都不生效。现 JS 以可见 `<textarea>` 为锚点、向上找最近圆角祖先，给输入框卡片打自有属性 `data-dsh-dream-skin-composer`（MutationObserver 节流补标，SPA 重渲染后自动恢复）；全部 composer 玻璃规则改「旧哈希类名 + 自有属性」双选择器——旧宿主零变化，0.1.5+ 恢复生效，两族选择器不会双重上漆（标记优先命中哈希规则所对的同一元素）。漂移警告探针同步更新，不再误报。
- 新增回归断言：玻璃规则必须同时携带旧哈希与自有属性选择器（防止未来退回只挂哈希的写法）；composer 叶卡测试断言随双选择器更新。回归门 **59/59**。

### 文档
- README 重构：八图预览与预设一览合并为「玩法一」单区（信息密度更高）；对比表改写为与同类 DSH 主题插件（catppuccin-theme / mineradio / wallpaper-engine）的真实五列对比；Roadmap 补入玻璃材质 / 出厂配置 / 宿主兼容加固等已完成项；7 语言 i18n 全量同步。

## [9.13.1] - 2026-09-14

> **发布后二次复查修复版。** 9.13.0 发布后按「第二双眼睛」原则再做一轮独立复查（正确性 + 安全/回归两路），发现并修复 2 个低概率高危害的持久化缺陷——均需宿主通道慢/挂起才触发，但后果是宿主数据被擦除，故立即发版。

### 修复
- **宿主探测超时未覆盖响应体解析（🟠-1）**：4s 超时原本只罩住 `fetch()`，`res.json()` 挂起时推送门仍会永久关闭——整个会话的用户写入被静默扣压到下次启动。现探测（fetch+json）整体纳入超时 race，超时后门必定释放；落败的探测 Promise 显式吞掉，不再产生 unhandled rejection。
- **推送补丁可能以 null 擦除宿主数据（🟠-2）**：启动时的读取会把「宿主文件里不存在的键」以 null 缓存；原实现在探测慢/失败后的一次用户写入会把这批 null 一起推给宿主，**擦除**用户的强调色/皮肤包/收藏/壁纸历史等持久配置。现推送补丁只收录本会话真正写入过的键（`writtenKeys`），用户主动清除（writeStorage null）仍正常推送。
- **顺手修正**：壁纸历史缩略图 `url()` 未走 `cssUrlValue` 转义；`factory-applied` 标记写不再触发宿主推送调度；液态玻璃厚度 CSS 兜底值 10px → 20px（与 JS 侧 50% 透明度 → 12px 厚度的映射基线一致）。

### 新增
- 回归测试 +1（59/59 通过）：宿主探测永久挂起 → 超时释放推送门 → 用户写入恰好推送一次、且补丁中无任何 null 擦除。

## [9.13.0] - 2026-09-13

> **玻璃材质系统 + 出厂配置发布版。** 新增毛玻璃/液态玻璃双材质、composer 独立透明度、出厂配置；发布前经又一轮三方对抗评审（蓝军 → 第三方独立复核 → 蓝军裁定），修掉评审发现的全部问题——其中最严重的一类是「出厂配置可能反向覆写宿主持久文件」。评审往来记录为内部资料，不随包发布。

### 新增
- **玻璃材质系统（毛玻璃 / 液态玻璃）**：composer 卡片改为真实 `backdrop-filter` 玻璃（`::before` 隔离层 + `isolation:isolate`，不劫持 fixed 定位——沿用 9.10.0 的 Tooltip 修复结论）。材质 chip 为**纯样式选择**：只切换色调/着色/填充权重/模糊缩放，永不改动任何滑杆数值。液态玻璃的透明度滑杆映射为玻璃「厚度」（+0~24px 额外背景模糊）。
- **composer（输入框）独立透明度**：与弹窗透明度、壁纸透明度分开的第三条滑杆，独立持久化。
- **出厂配置**：首次安装即带完整美化外观（星云皮肤 + 内置壁纸 + 调好的玻璃数值 + 预填必应每日壁纸 URL）。
- **回归测试 +9（42 + 8 = 50 通过）**：覆盖出厂一次性语义、升级者保护、桌面重启持久化语义、材质缩放、液态厚度等。

### 修复（发布前评审闭环）
- **出厂配置绝不覆写宿主持久文件（蓝军 B1 → 第三方 T1 → 蓝军裁定升级 P0）**：桌面端每次重启 origin 变化、localStorage 清空，出厂播种原实现存在三条路径会把「出厂外观」写入宿主文件 `dream-skin.json`（探测前竞态推送、空文件迁移推送、同源刷新后的二次播种判定失效），随后宿主文件反向「固化」出厂值——用户配置被物理销毁且出厂默认升级永远到不了该用户。现改为：出厂写**永不**触发宿主推送（推送补丁过滤一切出厂溯源值）；持久化出厂溯源快照（跨刷新生效）供迁移判定；宿主探测加 4s 超时防推送门永久关闭。
- **升级者哨兵键补全（蓝军 B2）**：「是否老用户」探测原漏 6 个键（侧边栏透明度/联动、渐变、自动弱化、跟随皮肤、定时刷新）——只动过侧边栏滑杆的升级用户会被强灌整套出厂配置。现补齐全部 20 个偏好键。
- **液态玻璃模糊双重缩放（蓝军 B3）**：JS 侧已按材质 ×0.25，CSS 规则又乘一次 0.25（实际 ≈1/16），「模糊一个旋钮驱动壁纸与玻璃」在液态玻璃下名存实亡。现只保留 JS 侧单次缩放。
- **尾部图标 IIFE 无防护（蓝军 B4）**：位于 loader 降级路径之外的裸代码，`document.body` 为 null 时抛 TypeError 会拖垮整个 web shell。现整体 try/catch + body 判空。
- **liquid 材质重复 `tone` 键 + 出厂材质口径矛盾（蓝军 B5）**：对象字面量重复键后值静默胜出；出厂材质写 liquid 与「frosted 默认」的注释/README 三方打架。现删死键、出厂统一为 frosted。
- **出厂默认静默开启第三方 API 每小时轮询（蓝军 B7）**：原出厂值 `{"on":1,"hours":1}` 会让首装用户每小时请求 uapis.cn。现出厂默认关闭，由用户显式开启（URL 仍预填）。

### 完善
- 注释漂移清理（liquid fillScale 0.45→0.15 三处）、死变量 `hostReady` 删除。

## [9.10.0] - 2026-09-10

> **三方评审闭环版。** 9.9.0 的整改经第三方独立复核与对抗性评审采纳裁定后发现：P0 十项整改全部真实落地，但**整改自身引入了 3 处新缺陷**（集中在 #45 新增路径上），且我方先前对「皮肤 id 撞名」一项的推迟理由**判读有误**。本版修完全部新缺陷、补上撞名让位加固、补齐 5 个回归用例。评审往来记录为内部资料，不随包发布。

### 修复
- **带 `#fragment` 的壁纸链接上定时刷新完全失效（第三方 T1）**：`stampedWallpaperUrl` 在追加缓存破坏参数前**没有先切下 `#fragment`**，导致 `?t=` 落进 fragment 内部——按 URL 规范 fragment 不参与请求发送，浏览器继续命中缓存，**对任何带 `#` 的图片链接，定时刷新是静默 no-op**（且因 `commit()` 仍会推进 `lastFiredAt`，还会把下次到期时间推后一整个周期，用户侧毫无异常信号）。现改为先切 hash、把 `t=` 拼在 query 上、再拼回 fragment。
- **被拒绝的刷新开关仍被持久化（第三方 T2）**：`setRefresh` 原先**先写存储再校验 kind**，导致「弹出『仅对图片链接生效』提示」的同时 `on:1` 已经落盘，提示与实际状态矛盾。现改为校验通过后才落盘，被拒时提示后直接返回。
- **清除壁纸后新壁纸继承旧刷新相位（第三方 T3）**：`clearAll` 原先只移除壁纸与定时器，持久化的 `{on, hours, lastFiredAt}` 原样残留；贴入新链接并开启刷新时会读到已删壁纸的旧时间戳、判定为「早已到期」而**在装入瞬间立即触发**。现改为清除整条刷新配置（直接 `writeStorage(..., null)`，同时规避 writer 的「保留旧 `lastFiredAt`」语义），新排期从零开始。
- **皮肤 id 撞名会让 `apply()` 抛错（蓝军 R19 最小加固）**：宿主 `ThemeRuntime.register` 对重复 id 直接 `throw`，而该调用**不在工厂级哑模块兜底范围内**（兜底只覆盖 seed 解析阶段，撞名发生在 `apply()` 运行期），此前是裸 `SKINS.map(register)`。内置 id（`mist`/`rose`/`ember`/`ivory` 等）均为常用词，第三方主题插件先注册同名主题即会命中。现改为**撞名让位**——已存在的 id 跳过并 `console.warn`，最坏后果从「`apply()` 抛错」降为「少一套皮肤」。完整方案（`dream:` 前缀 + localStorage 旧值迁移）留待 P1。

### 完善
- **探针与持久化共用同一时间戳（第三方 P3）**：`runScheduledWallpaperRefresh` 内改为 `const stamp = Math.round(Date.now())` 计算一次，预载探针与持久化值共用，消除「探针验证的 URL」与「实际渲染的 URL」理论上的不一致。
- **回归测试 +5（44/44 通过）**：
  - **react seed 缺失的哑模块孪生用例**（蓝军升级为必补）——覆盖 R3 的**核心场景**（旧代码 `react`/`react/jsx-runtime` 正是 try 之外的裸 require）；此前只有 store seed 失败被测，这道最重要的防线没有覆盖；
  - **fragment URL 的 `t=` 位置断言**（T1 无测试必复发）：断言戳记位于 query 内、`#` 之前，且 fragment 原样保留、存储层保持干净；
  - **清壁纸后新排期不继承旧相位**（T3）；
  - **被拒开关不落盘**（T2）；
  - **皮肤 id 撞名让位不抛错**（R19）。
- **文档**：本条目为 9.9.0 的接续版本；9.9.0 条目保留其在当日评审语境下的原始记述，其「R19 推迟理由」的判读已在 9.10.0 中纠正。

## [9.9.0] - 2026-09-09

> **发布前对抗性评审整改版。** 本版在 8.30.1「同一构建兼容稳定版（≤ 0.1.1-rc.x）与 master」的基础上，完成了发布前对抗性评审指出的必修项：把「宿主升级绝不导致报错」从**承诺**变为**结构性保障**（宿主模块解析全量降级兜底），重构了 #45 定时壁纸的生命周期与数据模型，并撤回了一处会广播错误兼容信号的声明。评审往来记录为内部资料，不随包发布。

### 新增
- **URL 壁纸定时自动更新（issue #45）**：高级壁纸「图片链接」模式新增可选的「定时自动更新」开关 + 更新间隔（小时，默认 24，范围 1–720），让必应每日壁纸等「每日轮换 API」自动滚动到当日新图。默认关闭、仅对 URL 壁纸生效。
  - **到期判定基于持久化的 `lastFiredAt`**，而非「本次页面打开后计时」：白天用、晚上关机的用户不会因为每次重启都重置 24 小时相位而永远等不到更新；启动时与标签页重新可见时都会补触发已到期的刷新。
  - **调度器归 `apply()` 所有**（模块作用域），不依赖设置面板是否展开，卸载时随 fiber 一并清理。
  - **缓存破坏只作用于渲染层**：持久化的壁纸 URL 始终是用户输入的干净链接（`?t=` 时间戳仅用于 CSS 值），因此不再出现 `?t=` 参数逐次叠加污染、也不再有「原始链接无法恢复」的问题。
  - **刷新前预加载校验**：链接失效时保留当前壁纸并给出 console 警告，不再静默黑屏；自动刷新不写入壁纸历史。

### 变更
- **撤销 `engines.dsh` 声明**：9.9.0 草案曾声明 `"dsh": ">=0.1.0-rc.6"`。但按 semver 规范，comparator 只在候选版本与自身 `major.minor.patch` 三元组相同时才放行**预发布**版本——该范围经宿主自带 semver 库实测，把 `0.1.1-rc.1` / `0.1.1-rc.2` / `0.1.2-alpha.2` / `0.1.2-rc.1`（含本项目日常使用的版本）**全部判为不兼容**，等于向生态广播「本插件与当前稳定版不兼容」的错误信号。任何有限的 OR 范围都无法表达「任意未来预发布代际」，需逐代回补；而宿主当前并不读取该字段（全树检索无消费点）。故**移除**是对用户零影响、且不产生误导的最诚实选择——兼容区间以 README 兼容矩阵 + 运行时能力探测（见下）为准。
- **`dsh-client-store` peer 改为 `"*"`**：该包**自 2026-08-30 起已发布到 npm**（首个版本 `0.1.2-alpha.2`，当前 `latest=0.1.2-alpha.2`；9.9.0 草案中「从未发布到 npm」的说法已失实并在此更正）。草案写的 `^0.1.2-alpha.2` 因同样的预发布规则无法匹配后来的 `0.1.3-alpha.2` / `0.1.5-alpha.2`，故改为宽范围——该 peer 本就是 `optional`，由宿主运行时按 seed 名供给。

### 修复（发布前评审 P0 项）
- **宿主模块解析全量降级兜底（蓝军 R3，最高优先级）**：宿主对 loader-entry 工厂**不做隔离**——任一工厂抛错会聚合为 `entries did not activate`，导致整个 DSH Web 全屏 `Failed to load plugins`（这正是 issue #43 的故障机理）。此前只有 store 的 require 在 try 内，而 `react` / `react/jsx-runtime` 两枚**顶层裸 require 在 try 之外**，seed 名再换代一次即重现全站故障；且跨代回退依赖宿主内部错误文案子串（`missed the module table`，非 API 契约，R4）。现改为：**三枚平台 seed 全部在受控 try 内按候选顺序探测**（以「require 成功返回」判定，不再匹配错误文案），**全部失败时工厂导出一个哑模块**（空 `apply`、空 `SKINS`，并 `console.warn` 一条说明），把爆炸半径从「全站崩溃」降到「本插件本次会话隐身」。**这是本版对「宿主升级绝不报错」诉求的根本保障，优先级高于任何新功能。**
- **误触「应用」清空壁纸（蓝军 R13）**：URL 输入框为非受控且初值为空，切到「图片链接」后不输入任何内容直接点「应用」曾把当前 URL 壁纸清空。现空输入为 no-op（清空仍走「清除壁纸」按钮）。
- **定时刷新 UI 三处硬伤（蓝军 R7）**：修正间隔单位文案在同一行重复渲染两遍；间隔输入改为受控并回显**钳制后的持久化值**（输入 9999 后不再显示 9999 而存储 720）；移除纯本地 state，改由宿主状态驱动回填。
- **hash 选择器漂移可见化（蓝军 R15）**：内置材质样式依赖 8 组宿主**构建哈希类名**，评审实测其中 3 组在当时的宿主版本上已失效，而旧测试只断言 CSS 字符串「包含」这些名字、永不发现（假安全感）。现于注入后按选择器做一次运行时命中自检，未命中的规则**逐条 `console.warn`**——规则失配本身无害（选择器不命中即 no-op），但用户与维护者能从「静默变丑」变为「可见降级」。

### 完善
- **文档**：README 兼容矩阵更新（含撤销 `engines.dsh` 的说明与 9.9.0 新增能力）；本条 CHANGELOG 更正了草案中对 `docs/i18n/*` 与 `docs/PROJECT.md` 的失实声明（草案声称已更新各语言 README 与 PROJECT.md，实际未改动——本版如实按已落地内容记述）。
- **回归测试**：smoke 套件新增/改写用例——issue #43 平台 seed 全失败时降级为哑模块（不再抛错）、#45 到期判定与 URL 不污染、R13 空输入保护；测试 mock 的 `ctx.effect` 改为**符合真实宿主语义**（延迟到卸载才执行清理，此前立即执行会掩盖生命周期缺陷）、`Image` 桩改为 `src` 赋值即回调 `onload`（使刷新预加载路径可测）。回归门 **39/39 通过**。

## [8.30.1] - 2026-08-30

> **8.30.0 的健壮性与声明修复（蓝军审查跟进）。** 行为与 8.30.0 完全兼容，建议所有用户直接升级本版。

### 修复
- **peerDependenciesMeta 全量 `optional`**：`@deepseek-ai/dsh-client-store` 只存在于 master 宿主内部、从未发布到 npm（实测 404），在 `auto-install-peers=true` 的包管理器环境下会导致安装失败；其余 peer 平台包在 npm 上的版本也与 `^0.1.0-rc.6` 区间不匹配（如 `dsh-client-runtime@0.0.1-rc.1`）。现全部声明为 optional——它们本就由宿主在运行时供给（浏览器模块表 / cordis），npm 侧无需安装，语义更诚实。

### 完善
- **fallback 收紧**：`defineStore` 的双目标解析现在只在 require 错误消息含 `missed the module table`（各代宿主表 miss 的稳定文案）时才回落稳定版旧名；其他错误（如未来 master 上 store 工厂自身崩溃）原样抛出，不再被静默吞掉后报误导性的 "runtime/client 找不到"。新增回归用例：非表 miss 错误必须 rethrow。
- **persistence 对称覆盖**：持久化套件新增稳定版宿主（store seed 缺失）路径用例，boot 采纳宿主键值经回落模块照常工作。
- **文档**：README（中文 + 7 语言）兼容性表格更新为「同一构建兼容稳定版（≤ 0.1.1-rc.x）与 master」，并注明双目标解析机制与 optional peers。
- **已知契约假设（记录备查）**：`dsh.client.inject` 中的 `@deepseek-ai/dsh-client-runtime` 在 master 宿主上不存在，当前被宿主宽容忽略（8.29.0 起实测）；移除它会破坏稳定版注入，保留是权衡后的决定——宿主若收紧该宽容，需按宿主版本拆分 manifest。
- **版本日期规则澄清**：日期按维护者本地时区（UTC+8）计。8.30.0 的 npm 时间戳 `2026-08-29T18:01Z` 即本地 8 月 30 日凌晨，规则未失守；本版 8.30.1 为 8 月 30 日第二版。

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
