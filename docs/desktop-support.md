# 桌面端兼容与支持矩阵（Desktop Support Matrix）

> 本文面向评估者（含官方团队）：说清楚 dsh-dream-skin 在哪些宿主上能跑、
> **靠什么机制跑**、**依赖宿主的哪些锚点**、宿主升级时会发生什么、以及
> 哪些结论已验证、哪些尚未。所有论断附代码位置（v9.26.1 起引用**符号名**而非行号——行号随补丁必然位移，符号名可 `grep` 直达）。

最后更新：2026-10-09（v10.9.1 官方桌面壳外观轮：Windows 标题条那条 `::before` 补了它自己的水洗门控规则（伪元素拿不到元素上的 `background-color`），拖拽声明一字不动；计算样式门的 `corner` 组新增四读数 + 两条反向变异；夹具页最后两处手抄宿主类名改为现读推导（边界⑤ 关闭）；并追加官方 DSH Desktop（DeepSeek Harness 44.0.0 / 自带 dsh 0.2.0-rc.2）的锚点取证。上一轮 v10.9.0 为评审工单 #100–#105 整改；v10.6.0 为 dockkit 右侧栏对齐轮（PR #65：面板跟随侧栏滑杆 / 全屏不透对话 / 胶囊 hover 保底色，维护方独立 5 处变异抽查 + 真机命中面复测）；另含 rc.2 / alpha.1 整改轮的口径更正：会话字号区间 widened 到 10–22 px 而极值未测（issue #93）、底栏 `shell.bottom` 未挂载的事实（issue #90）、peer 判定面的边界（issue #91））

## 支持状态总览

| 宿主 | 状态 | 依据 |
|------|------|------|
| DSH Web（`0.1.0-rc.6` ~ `0.1.x`） | ✅ 支持，回归测试覆盖 | 双代 seed 探测（`lib/client.js` 顶部 `seedProbe` / `requireSeed` 块），回归门 404/404（Node 18/20/22/24） |
| DSH Web（`0.2.0-rc.1` ~ `0.2.x`） | ✅ 支持：peer 闸门已放宽并离线钉死，本机 `0.2.0-rc.1` 实机复核已过（挂载 + 设置项 + 填充方式三档） | issue #62：0.2.0-rc.1 起宿主 boot 阶段校验 `@deepseek-ai/dsh*` peer 范围，不满足即整包跳过；本版 peer 收敛为 `>=0.1.0-rc.6 <0.3.0-0`，判定表由宿主真实 `evaluatePluginCompatibility()` 生成（`tests/package.host_compat.test.cjs` / `tests/fixtures/host_compat_verdicts.json`）；实机复核方法与"进程未重启"的口径限制见上「宿主 peer 兼容闸门」一节最后一条 |
| 第三方 DSH Desktop 壳（Electron，动态端口） | ✅ 支持，含桌面专属修复 | issue #50/#51/#55（v9.14.1 / 9.15.2 / 9.16.0），动态端口重启用例（`tests/client.persistence.test.cjs` 之 "blue-team B1" / "T-02" 系列） |
| **官方 DSH Desktop**（`0.2.0-rc.2`，2026-09-29 用户实机安装受阻后排查） | 🟡 证据支持「**预期可加载**」，不支持「已支持」；**运行期挂载未验**，profile 路径未验 | <!-- desktop-claim: load-expected-unverified -->用户侧报错的真实原因是 pnpm 冷静期把 `@latest` 静默退回 9.27.1（旧 peer 范围不含 0.2.x）而非桌面壳不兼容；显式写版本号即可装上 9.29.0，复现与对照实验见「已验证」清单最后一条。本机仅装到 `0.2.0-rc.1`，rc.2 桌面壳里插件是否真挂载、像素效果如何，均未在本机验证。**issue #87 把这条措辞降级到证据支持的程度**：正面证据只有 `dsh.client.platform = "web"` 与宿主自带 21 个客户端包一致这一条静态事实（且**不需要**新 platform 值），负面证据是宿主 CLI 的 shipped profile 模板里**没有**官方桌面版的名字 —— 完整判断依据见下节「官方桌面版待验条目」。**2026-10-09 追加两条静态事实，但上面这一格的评级不变**：① 该壳（DeepSeek Harness 44.0.0）自带的宿主是 `@deepseek-ai/dsh` **0.2.0-rc.2**，其 `app.asar` 里 `data-shell-overlay` / `data-windows-titlebar` / `--dsh-windows-content-radius` 三处锚点**全在**，类名自成一族（`BynINW_frame` / `BynINW_centerCol` / `_9lTDKa_fade`），而那条 fade 与 npm 宿主的 `bhn1Oq_fade` **只差哈希**——#97 的哈希无关锚点在它上面直接命中；② 一位用户在该壳上的截图显示皮肤与壁纸确实生效（跑的是 9.29.0）。**这两条都不足以把"预期可加载"升上去**：本机从未在那台 Electron 的渲染进程里读到 `__DSH_DREAM_SKIN_STATUS__`，10.9.1 在该壳上的像素效果同样是 0 次目视——本轮的验证方式是"读它发货的 CSS 原文 + 在真实引擎里重演"（`npm run wash:check` 的 `corner` 组），不是活页复核 |
| 宿主未来任意版本 | 🟢 安全降级 | 全 seed 换代时降级为哑模块 + `console.warn` + 机读 degraded 快照，绝不拖垮 shell（issue #43 根治，`requireSeed` 全失败后的哑模块返回路径） |

## 接入方式：为什么不需要"注入"

- 宿主半边：`cordis.patch.yml` 向官方 loader 树插入一行，挂载 `/dream-skin/api` 路由（`lib/index.js` 之 `apply(ctx)` / `handleApi`）——**官方一等插件机制，不修改任何安装包二进制**。
- 浏览器半边：注册进 `__ModuleLoader__`，通过 `ctx.theme.register` / `ctx.theme.overrideTokens` 走 **`--dsw-*` token 通道**上色，外加一段自有 `<style>` 玻璃材质规则（`lib/client.js` 之 `MATERIAL_CSS_SOURCE` / `ensureMaterialStyle()`）。
- 结论：皮肤效果完全由官方主题 token 系统表达；卸载 = 移除插件行，不留残留样式（持久化状态文件见下文"卸载"）。

## 桌面壳检测（契约式，非 UA 嗅探）

按以下任一信号判定桌面壳（`lib/client.js` 之 `isDesktopShell()`）：

1. `<body data-dsh-desktop-mode>` 属性；
2. `window.__DSH_DESKTOP_FILE_PATH__` 全局量；
3. URL 参数 `?dsh-desktop-mode=`。

不匹配 UA、不嗅探宿主版本号（运行期路径全部靠能力探测）。**注意语义已在 v9.29.0 变化**：不声明 `engines.dsh` 这一点不变（README 解释了原因），但自宿主 `0.2.0-rc.1` 起 `@deepseek-ai/dsh*` 的 **peer 范围成为安装期硬约束**——它不再只是装饰性的生态信号，而是本插件对外声明的兼容窗口，见下节。

## 宿主 peer 兼容闸门（dsh 0.2.0-rc.1 起，issue #62）

- 宿主 `@deepseek-ai/dsh-app-boot` 新增 `evaluatePluginCompatibility(manifest, exemptions, runtimeVersion)`：只挑名字为 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头的 peer，用 `semver.satisfies(runtimeVersion, 范围, { includePrerelease: true })` 拿**宿主自己的运行时版本**去套；`workspace:^ / ~ / *` 视为当前运行时；任一 peer 不满足 → **整个 profile bundle 被跳过**（客户端不注入路由、`/dream-skin/api` 不启、诊断全局量不存在，日志仅一行）。
- 直接后果：原先以 `^0.1.0-rc.6` 对齐的六个 `dsh-client-*` peer 在 `0.2.0-rc.1` 上全部落空（`^0.1.0-rc.6` 等价 `>=0.1.0-rc.6 <0.2.0-0`，而 `0.2.0-rc.1 > 0.2.0-0`），换肤在用户侧表现为「全部消失」而非报错——这正是 issue #62 的现象。本版把六个 peer 统一为 `>=0.1.0-rc.6 <0.3.0-0`：覆盖 0.1.x 与 0.2.x，并把尚未验证过的 0.3.x 明确挡在窗口外（宁可让闸门拒绝，也不要注入一个未测宿主）。
- 这条声明由**离线门**把关，且判定值不由我们自己算：`tests/fixtures/host_compat_verdicts.json` 是对 9 个运行时版本、分别对修复前/修复后两份 manifest **调用宿主真实的 `evaluatePluginCompatibility()`** 生成的判定表；`tests/package.host_compat.test.cjs` 用测试内实现重放同一循环并与该表逐格比对（含「0.2.0-rc.1 修复前必须整片红」「0.3.x 修复后仍必须拒」两条方向性用例），避免出现「测试自己证明自己的范围」这类自证式探针。`package-lock.json` 的 peer 亦由 deepEqual 门强制与 manifest 一致（上一版两者曾静默漂移）。
- **哪些 peer 不参与这条判定（issue #91）**：宿主闸门只挑名字为 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头的 peer，其余一律 `continue` —— 也就是说 `@deepseek-ai/cordis` 与 `react` **两条不参与**宿主兼容判定，它们既不救你也不害你。二者由**包管理器的 peer 解析**单独把关，那是**另一把尺**：默认 semver 语义（**不开** `includePrerelease`），预发布版本只在同 `major.minor.patch` 轨道上放行。两把尺的同一张真假值表在 `tests/fixtures/peer_range_verdicts.json`（由宿主自带 node-semver 现场生成），`tests/package.host_compat.test.cjs` 用测试内实现重放并逐格比对。**本轮据 #91 改了一处**：`@deepseek-ai/cordis` 由 `^4.0.1` 改为 `^4.0.1 || >=4.0.5-0 <5` —— 宿主 0.2.1-alpha.1 把自身 cordis 提到 `~4.0.5-alpha.1`，而 `^4.0.1` 与 `>=4.0.1` **都**覆盖不到它（默认语义的预发布排除规则），所以声明与实况对不上；`cordis` 仍是 `optional`，这条的严重度是"信号不准 + 安装期噪声"，**不是**"装不上"。`5.0.0` 依旧被拒（未测通道不放行）。
- 逃生阀在宿主侧：`dsh plugin allow-version` 写的是 `name@version → [运行时版本]` 豁免表，属用户显式覆盖，我们不依赖它。
- **到点会发生什么，以及你该怎么办（issue #86）。** 窗口上界是刻意的：`0.3.0` 尚未对过本插件，我们宁可让闸门拒绝，也不要把皮肤注入一个没测过的宿主。真到那天你看到的**不是报错**，而是**东西不见了**——皮肤全回到宿主的默认外观，设置里的 `Theme / 外观` 一节整块消失（宿主只在日志留一行，界面上没有任何提示）。这是宿主 peer 闸门的设计，不是插件崩了。
  两条出路，按优先级：
  1. **等本插件发新版**——窗口会在对新宿主实测之后放宽。这是唯一被验证过的路径。
  2. **自己开豁免**（应急）：`dsh plugin allow-version dsh-dream-skin@<你的版本> <运行时版本>`，把本插件加进宿主的豁免表后重启。**这是把未经测试的组合强行放行**，我们不背书：豁免表是用户显式覆盖，出了问题先去掉豁免再复现。
- **本机 `0.2.0-rc.1` 复核（v9.29.0）**：在同一台机器上直接调用宿主自身的 `loadProfileDirectory()`（读真实 profile、真实 `compatibility.json`、真实运行时版本）→ 19 个 bundle 全部载入、`skippedBundles` 为空、合成入口表确有 dream-skin 条目。关键在于**这份放行不可能是豁免带来的**：本机豁免表的键是精确版本 `dsh-dream-skin@9.27.1`，对 9.29.0 不生效；把同一份清单的 peer 写回 `^0.1.0-rc.6` 再跑宿主函数，立刻得到「6 个 peer 全不落 + `exempted=true`」，即修复前本机是靠显式豁免才挂着。**口径限制**：DSH 进程未重启，boot 期那一次调用是由同版本宿主代码在同机复现的，不是重启后的第二次观测（重启后走的是同一个函数）。浏览器半边则是在运行中的进程里直接读到的：`window.__DSH_DREAM_SKIN_STATUS__` 为 `build:"9.29.0"` / `status:"ready"`，漂移探针 `probed:6 / drifted` 四条与 `0.1.7-rc.2` 上记录的同一组选择器，console 仅一次 warn——**换代没有引入新的锚点损伤**。

## 官方桌面版：待验条目与判断依据（issue #87）

<!-- desktop-claim: load-expected-unverified -->**「预期可加载」这句话的证据在这里，别把它改强。** 正面与负面各一条，都是静态事实：

- **正面（也是这一节唯一的好消息）：官方桌面版不需要一个新的 `dsh.client.platform` 值，改它是错的。** `@deepseek-ai/dsh-client-modules/lib/index.js` 对不含 `platform: "web"` 的声明是硬判定丢弃（`if (decl === void 0 || decl.platform !== "web") { … return null; }`），而宿主自己带的 21 个含 `dsh.client` 的包**全部**是 `"web"`（0.2.1-alpha.1 实测枚举，无一例外）。我们声明 `platform: "web"`，与宿主自身一致 —— 所以**不要**为了"支持桌面版"去动这个字段，动了会被那一行直接丢掉。
- **负面：宿主 CLI 的 shipped profile 模板里没有官方桌面版的名字。** `@deepseek-ai/dsh-app-boot/lib/index.js`（0.2.0-rc.1 / rc.2 / 0.2.1-alpha.1 三版本一致）：
  ```js
  const PROFILE_TEMPLATES = {
    acp: { … }, web: { … }, headless: { … }, sdk: { … }, "sdk-minimal": { … }
  };
  const DEFAULT_PROFILE_BUNDLES = ["@deepseek-ai/dsh-base"];  // a `dsh plugin` init uses for a name with no shipped template
  ```
  `resolveProfileDir()`（同文件）只拒 `""`、含 `/` 或 `\`、`.`、`..`、`node_modules` —— 也就是说一个不存在的 profile 名**不会被拒**，它只是安静地建一个目录，bundle 列表取 `DEFAULT_PROFILE_BUNDLES`，**不含 `dsh-web-app`**。**因此本仓库在任何文档里都不教 `--profile desktop` 这个写法**（竞品 `dsh-catppuccin-theme` 的 README 里正是在教它）：照抄它，装进去的很可能是一个**空壳 profile**，用户重启后什么都看不到，而锅会算在"DSH 换肤插件"这个品类头上。要用哪个 profile 名，请自己 `dsh --help` / 读宿主 CLI 的模板表确认。
- **待验条目（本机做不了，要一台可牺牲的机器或官方桌面版发布后）：** ① 官方桌面版的 profile 目录是否就是 `~/.dsh/profiles/<name>`；② 它是否读同一份 `dsh.profile.bundles`；③ Electron 侧的 `localStorage` 是否与我们 `dsh-dream-skin:` 键前缀的假设一致。**这三条在验掉之前，"预期可加载"不得升级为"已支持"**；`README` 与 7 份译文里那一行带一个机器可读的声明戳 `<!-- desktop-claim: load-expected-unverified -->`，`tests/desktop.claims.test.cjs` 要求 8 份文档与本文档都带同一个戳——把措辞改强的同时不换戳，那道门会翻红。

## 持久化：为什么在桌面端反而更可靠

DSH Desktop 每次启动绑定 OS 分配端口（`--port 0`）→ 浏览器 origin 每次变化 → localStorage"失忆"。本插件的三层持久化解决这一点：

| 层 | 位置 | 作用 |
|----|------|------|
| 内存缓存 | 插件内 | 首帧正确 |
| localStorage | 浏览器 | 同 origin 快速恢复 |
| **宿主文件** | `$DSH_HOME/dream-skin.json`，经 `/dream-skin/api` 读写 | **跨端口/跨重启的权威状态**（`lib/index.js` 之 `statePath()` / `readState()` / `writeState()`） |

- 端点路径在运行时由 `document.baseURI` 解析（`lib/client.js` 之 `HOST_API`，v9.23.0 / issue #56），对动态端口与子路径挂载免疫。
- 原子写入（tmp + rename，Windows 直写回退，`lib/index.js` 之 `writeState()`），文件权限 `0o600`。
- 出厂播种永不反向覆写宿主持久文件（issue #51 修复 + v9.13.0 溯源快照；写入语义按 `hostProbeSettled` 分支，见 `migrateLegacyFactoryWallpaper()` 注释）。
- **唯一受控例外（v9.27.0，B-5）**：出厂壁纸迁移——宿主文件里仍持旧真人照片的会话，在探针落定后经 `loadFromHost` 采纳为**用户态**再推送新图（`hostProbeSettled ? {} : { factory: true }` 分支）。这是"播种永不回写"纪律的有意破例，动机是旧图因品牌/许可必须离场；代码注释已显式标注该例外并警告不得"顺手修回"成工厂态写入。除这一条迁移路径外，任何出厂默认都不会写入宿主文件。
- 宿主探针的三个"无可用答案"出口（网络失败 / 非 JSON / **`ok: false` 拒绝**）语义一致，均视为"宿主侧尚无壁纸决策"并触发延迟播种（v9.27.0，B-6 收敛：此前 `ok: false` 出口漏播种，真机首装遇宿主侧拒绝会永久无壁纸）。

## 机读诊断通道（v9.26.0 引入；schema 经 v9.26.1 / v9.27.0 两轮收敛，10.5.0 增补 `navIcon` 与 `anchors.notMounted`，当前定稿如下）

插件在 `window.__DSH_DREAM_SKIN_STATUS__` 发布只读诊断快照，宿主/桌面端工具无需 scrape console 即可判定兼容状态：

```js
{
  plugin: "dsh-dream-skin",
  build: PLUGIN_BUILD,          // 与 package.json 版本由测试守卫对齐
  status: "ready" | "applying" | "degraded",
                                // ready = apply() 已完整跑完（v9.27.0，B-4：
                                // "ready" 令牌在 apply 尾部签署，不再自述提前）；
                                // applying = 快照已可见但 apply() 尚未收尾；
                                // degraded = 宿主 seed 换代 → 哑模块禁用
  reason / lastError,           // 三种状态都显式携带（ready/applying 时为 null，
                                // 永不 undefined——B-3 字段集对齐）
  shell: "desktop" | "web" | null,
  skin: "<当前皮肤 id>" | null,
  anchors: {                    // 漂移探针结果（warnOnMaterialSelectorDrift 的
                                // 有界检查点阶梯填充；10.5.0 起 missing 组按
                                // 宿主归属分 drifted / notMounted 两池，见下判读）
    probed: 8,                  // 探针**组数**（非 DOM 元素数）：Web 8 组锚点
                                // （6 组宿主哈希类名 + 10.8.0 的 #96/#97 两组
                                // 哈希无关锚点）。桌面壳下 9（+1 第三方壳侧边栏面）。
                                // 每组的逗号兜底成员数不等于计数（C-8）
    drifted: [],                // 元素恒为**合法原始选择器**（机读面不带装饰文案）
    notMounted: [],             // 10.5.0 起：宿主自己的 CSS 仍持有、只是对应面
                                // 当前未挂载（面板未开等）的组——与真漂移分栏。
                                // 分类器只读宿主发布的 style[data-plugin-css]
                                // 表；该表不可见时（<link> 形态 / 查不到）回落
                                // 为旧语义：全部 missing 组进 drifted（边界见下）
    retired: [],                // 10.8.0 起（对抗评审 J1）：只为**未经测量的 0.1.x
                                // 宿主线**保留的退役锚点。`.bqrRRG_card` /
                                // `.nArs4W_*` / `.qDHVXG_fade` 在本仓库能读到的每一台
                                // 宿主上实测 0 命中，因此它们在健康宿主上**只能缺席**——
                                // 若继续计入 `drifted`，本文档承诺的"正向信号"
                                // （`drifted: [] && pending: false`）就永远不可达，
                                // 等于一盏永远不会绿的红灯。名单与
                                // `scripts/data/dead-hashes.cjs` 由 `tests/hashes.test.cjs`
                                // 双向钉住（两侧集合不一致即翻红），不是手抄。
    pending: true               // 三态核心：true = "尚未可判定"（UI 未挂载完 /
                                // 宿主活跃度未被证明 / 阶梯未走完），消费方应
                                // 按"未检查"处理；false = 终局判定
    fadeMatches: 1,             // 10.9.0 起（issue #105）：`[class$="_fade"]` 这根
                                // **后缀锚点**当前实际罩住几个元素。它换来了抗哈希
                                // 重掷，代价是作用域变宽（任何 class 属性以 `_fade`
                                // 结尾的元素都会被水洗态中和），所以装了两个皮肤插件的
                                // 机器需要能自证：一台只有宿主 fade 的机器报 1，另一台
                                // 上有第三方插件也画一条时报 2。**它是观测不是判据**：
                                // 阶梯未走完（pending:true）时照样发布；
                                // DOM 读不到时报 **null**，绝不报 0——"一个都没有"
                                // 与"我没能看"是两件不同的事实（兜底不许伪造观测值）
    fadeClasses: ["bhn1Oq_fade"] // 那批元素的 class 属性（最多 8 条、每条截断 80 字符），
                                // 让消费方能归因"是谁在共享这根锚点"，而不是只拿到个数
  },
  navIcon: {                    // 设置导航图标（palette 替换齿轮那条装饰链）的
                                // 自检记录，10.5.0 起；由该 IIFE 自己发布，
                                // 插件只读转发。插件从未跑到那里 / IIFE 被
                                // 环境挡掉时整个字段为 null。
                                // **这里是镜像不是实时视图**：转发只发生在
                                // publishStatus() 里，nav IIFE 自己重报时不会
                                // 触发重发布。实时值读 
                                // window.__DSH_DREAM_SKIN_NAV__（下条）
    sheets: 1,                  // 页面上 style#dsh-dream-skin-nav-icon 节点数
                                // （>1 = 重复注入，幂等锁失守的信号）
    dialogs: 0,                 // [role="dialog"] 计数
    buttons: 0,                 // 弹窗内 nav button 计数
    marked: 0,                  // 已打 data-dsh-dream-skin-nav 标记的行数
    armed: true,                // 本页是否真的挂了 body 观察者。这是
                                // 「这套宿主没有可钩的 nav」与「设置面板只
                                // 是没开」之间唯一的区分依据：单看计数两者
                                // 都是 0/0/0
    checkedAt: 0                // epoch ms，最后一次**采样**时刻（不是本页
                                // 最后一次变更时刻，见下）
  },
  checkedAt / publishedAt       // epoch ms
}
```

- **`drifted` 的语义（v9.27.0，A-1）**：探针不再"下一帧采样一次、把全部未命中组报成 drifted"——"宿主 UI 还没挂载"与"哈希真的换代了"从 `querySelector` 看是同一个形状。现在是**有界重试阶梯**（`DRIFT_RETRY_DELAYS_MS`，**相对间隔** 0/300/1000/3000ms，累计采样时刻约 **0/300/1300/4300ms**）+ **宿主活跃度哨兵**（`driftProbeLivenessProven()`：至少两组锚命中、或 composer 稳定指纹 `data-composer-input`、或桌面契约戳——**绝不用 body 有子节点判定**，插件自己也在 body 挂对话框）+ **每组"曾命中"记忆**（晚挂载的面会自行从 drifted 撤回）。终局 `drifted` 只可能在**最后一轮且活跃度已证明**时发布；否则快照诚实停在 `pending: true`。
  **快照是"已定型的判定"，不是实时视图**：终局约在启动后 **4.3 秒**形成，消费方请对照 `checkedAt` 判断新鲜度（round-2 R-2/R-4）。终局点名漂移后，一个低频 body `MutationObserver`（`armLateCorrection`）给**单向修正**兜底——阶梯窗口之外晚挂载的面（如用户一分钟后才打开设置）会从 `drifted` 撤回并刷新快照，但**永不反向添加漂移、永不重复告警**，列表清空或唤醒耗尽即自行解除。
  **该观察者的生命周期约束（round-3 S-3）**：它是**卸载可清理**的残留物——`teardownMaterial()`（宿主卸载插件材质时）一并断开它，且同一页面**至多一个存活实例**（新的探针链**取代**旧链，重复 `apply()` 不会叠加出多个采样器）。卸载之后判定**冻结**：不再有任何观察者会把快照"改好"，也不会有第二次告警——这是"不留残留"的语义，不是缺陷。
  **同一不变式在 round-4 补上了另一半**：晚修正观察者断了，但**漂移阶梯自己的 `setTimeout` 当时仍是无人处置的残留**（`scheduleNext()` 从不保存句柄），在阶梯窗口内卸载会让剩余轮次继续用新的 `checkedAt` 重发布快照——一份来自已卸载插件的"刚检查过"。现在阶梯定时器与观察者一样归 `teardownMaterial()` 处置（`driftLadderDispose`），并在 `step()` 入口加一道 `ladderClosed` 门：它**不是** `clearTimeout` 的冗余——定时器一旦开跑其句柄即被消费，同一 tick 内的卸载取消是空操作，而那一步仍会跑完并重新挂上后续轮次。取消与门槛**各有只属于自己的变异红**（T-1a 只红"取消"类断言、T-1b 只红"发布"类断言），因此不构成"两道互为冗余的门"。另如实标注：`lateCorrectionDispose` / `driftLadderDispose` 是**工厂（实例）作用域**而非页面作用域——"至多一个存活实例"在"一页一个模块实例"的前提下成立，刻意**不**为此再开 `window` 键（与 R-5 的"一页一个封顶"不同，那里页面级就是语义本身；两个实例并存本身即异常加载态）。
  消费判读：`drifted: [] && pending: false` 是唯一的"全部精修在本构建生效"正向信号；`pending: true` 一律视为未检查；`drifted 非空 && pending: false` 是确定漂移告警（同时有一行带人类标签的 `console.warn`，机器字段与装饰文案分离，B-08）。`notMounted` 非空**不是**故障信号——它表示宿主 CSS 仍在、只是那个面（设置弹窗、todo 面板等）当前没挂载。
- **`notMounted` 的语义与分类器边界（10.5.0，T3）**：终局判定里的 missing 组按**宿主归属**分两池——某组的类名 token 出现在宿主自己发布的样式表（`style[data-plugin-css]`，宿主 css loader 给自家 chunk 盖的戳）里，归 `notMounted`（宿主仍持有，面未挂载）；否则归 `drifted`（真改名）。本插件的材质表不携带该属性，**不可能为我们自己的 token 担保**。**已知边界（如实声明）**：分类器只读该属性、**绝不 fetch `<link>` 样式**（零网络不变式优先于分类完备性）——模块 CSS 以 `<link>` 形态分发时，该组仍会被保守判成 `drifted`；宿主一张自有表都查不到时（连查询本身都抛异常也一样）全部回落为旧版语义（全 drifted），pre-T3 行为原样保留。告警只在 `drifted` 非空时发声（全 `notMounted` 的终局是静默的——未挂载不是故障）；晚修正观察者对**两个池子**做同一条单向撤回。
- **降级路径同样发布**（`status: "degraded"` + `reason` + `lastError`），且字段集与 ready/applying **完全一致**（测试守卫"snapshots expose EXACTLY the same key set"逐键核对，v9.27.0，B-3）——消费方永不撞 `undefined`，诊断方能区分"插件未安装"与"已安装但宿主 seed 换代"。
- 宿主采纳后自动重发布（`loadFromHost` 尾部 `publishStatus()`），`skin/shell` 反映的永远是生效值；后续任何重发布经 prev-merge 保住探针结果。`apply()` 对外从不抛错（B-4 约束）：`ready` 只在自然收尾时签署，`publishStatus` 自身包 try。
- 纯只读镜像：不新增网络请求、不写持久化、渲染失败被吞——诊断通道坏不了皮肤。它是**诊断镜像而非信任边界**：任何安全决策都不应依赖该全局的返回值（写入/渲染/采纳三道校验各自独立把关）。
- **`navIcon` 的判读与它为什么必须是页面级（10.5.0）**：这条装饰链跑在 loader 降级路径**之外**的 IIFE 里，任何异常都被吞掉，所以它坏不了皮肤、也**不会**出现在 `status: "degraded"` 的语义里——它有自己的一行状态。`sheets > 1` 是重复注入的信号（同一页面长生命周期里再评估一次 bundle 就会这样，实测过两次：两份相同的 `<style>` 加两个 body 观察者）；锁不能挂在 `<style>` 节点上，因为节点会被替换、替换后计数仍读 1。**但锁也不能只看节点**：在 `<body>` 还没解析时跑完的那一份会把自己标成"已接管"却什么都没挂，图标整场不换，而报表看起来和"设置面板没开"一模一样。因此 `armed` 只在观察者真的装上之后为 `true`，判读规则是：`armed === false` 且 `sheets <= 1` 才可以说"这个构建没有可钩的 nav"；`armed === true` 而 `marked === 0` 只说明面板没开。`checkedAt` 会合理地变旧——观察者只在 DOM 变更时唤醒，静默页面不再采样，rAF 定时器只是**首帧被饿死时的一次性兜底**（隐藏/完全遮挡的窗口拿不到帧），不是周期性复查。想让图标立刻重排就改一次 DOM。
  **两处读数不是同一个时刻（10.5.0 实机，L2）**：快照里的 `navIcon` 是**最后一次 `publishStatus()` 的镜像**——IIFE 自己重报不触发状态重发布。实测（宿主 `0.2.0-rc.1`，设置弹窗开着）：`__DSH_DREAM_SKIN_NAV__` = `{dialogs:1,buttons:15,marked:2,armed:true}`，而同一页 `__DSH_DREAM_SKIN_STATUS__.navIcon` 仍停在 boot 时的 `{dialogs:0,buttons:0,marked:0}`（两者非同一对象）。**因此上面那套判读规则要对实时全局用**；从快照读会把整场会话读成"面板没开"。快照字段的作用只是"一次 `apply()` 之后顺手带上钩子状态"，不是监控源。
- 插件在 `window` 上只挂**三个**全局：`__DSH_DREAM_SKIN_STATUS__`（本文档契约的只读诊断快照）、`__DSH_DREAM_SKIN_RENDER_GATE_SEEN__`（渲染告警去重的页面内 `Set`，见「安全边界」一节，不参与任何判定、可随时清空）与 `__DSH_DREAM_SKIN_NAV__`（10.5.0 起，上条所述的导航图标自检记录，同时是那把幂等锁的状态位）。宿主侧若要做全局命名审计，这三个即全部。前两者可随时清空且不影响功能；第三个被清空后若 bundle 再次评估，会重新接管并再挂一个观察者——这是有意取舍（用"删了就重新武装"换"节点被替换也不会失去钩子"），不是漏网。第三个之上另挂**不可枚举**的 `arm(gen)` / `dispose(gen)` 控制柄（10.5.0，T9）：fiber 卸载时经 `dispose(gen)` 拆除钩子全部三样残留（断开观察者、清除行标记、移除图标表），同页重挂经 `arm(gen)` 复臂；generation 令牌保证**迟到的旧代 dispose 不会误杀接棒的新代**。

## 锚点依赖清单（宿主升级风险面）

**这是本文档存在的核心原因：如实列出插件对宿主 DOM/token 的每一处依赖、失效后果与已有对策。**

| 锚点 | 性质 | 若失效的后果 | 对策 |
|------|------|-------------|------|
| 玻璃材质类名（`.uV2eYG_*` 等 13 组，材质样式表见 `lib/client.js` 之 `ensureMaterialStyle()`，样式节点 id 常量 `MATERIAL_CSS_SOURCE`） | 构建哈希类名 | 仅玻璃精修**静默失效**（外观损失，功能无损） | 漂移探针 `warnOnMaterialSelectorDrift()`（v9.27.0 三态判定）+ 机读快照（`MATERIAL_SELECTOR_PROBES`）；规则本身选择器组冗余。**层叠位次不是承诺**：实机（宿主 `0.2.0-rc.1`）我方材质表在 `document.head.children` 的 index 131 / 共 217，其后仍跟着 85 个节点（多数是 `<style>`）——宿主在插件挂载之后持续注入样式。"把表移回末尾"（B9/M14）恢复的是**重挂那一刻**的末位，精修能站住靠的是特异度（`html[data-dsh-material=…]` 前缀 + 属性选择器），不是位置。10.5.0 起 missing 组按宿主归属分栏（`notMounted` / `drifted`）；10.8.0 起另加 2 组**属性锚点**（见下一行）。本机 6 组哈希现状——`uV2eYG` / `hHd-Xa` 命中；`bqrRRG` / `nArs4W` / `qDHVXG` 三组在宿主安装物与页面运行时样式里 **0 命中**，自 10.8.0 起进独立的 `retired` 池而不再挤 `drifted`（对抗评审 J1：它们只为未经测量的 0.1.x 线保留，在能量产的宿主上只能缺席，留在 `drifted` 里等于让本文承诺的正向信号永不可达；换稳定锚点属 Roadmap A 既定范围；其中 `qDHVXG_fade` 那个面在 10.8.0 已由哈希无关锚点接管——它此前就是"规则还写着、测试还绿、页面早已不生效"的活例子）；`lXshSW_*` 组宿主 CSS 仍在、面未挂载 |
| 水洗态三处外观锚点（issue #96 / #97，v10.8.0；标题条伪元素那一处 v10.9.1）：`APP_FRAME_SELECTOR` = `div:has(> [data-shell-overlay])`（AppFrame，靠壳自己发布的稳定属性定位；**它的 `::before` 是第二个盒子**，`background-color` 传不进去，所以水洗态另有一条以 `…::before` 结尾的规则——那条带子是宿主的 Windows 标题条，画的是 `--dsw-specific-sidebar-fill` 且跨整幅窗宽，同时带着 `-webkit-app-region: drag`）与 `SESSION_FADE_SELECTOR` = `[class$="_fade"]`（会话列表末尾那条 fade，靠**类名后缀**而不是哈希） | 宿主自发布的稳定 data 属性 + 类名后缀形状，**不是构建哈希** | 翘角缺口回来、左栏底部渐变带回来（外观损失，功能无损） | 两条都进了漂移探针（Web 8 组、桌面 9 组），并为此给分类器补一条**属性锚点读法**：`[class$="V"]` 要求宿主自己的 CSS 里存在**以 V 结尾的类选择器**、`[data-x]` 要求宿主仍声明该属性名。取「结尾匹配」而不是子串，是为了让 `_fade` → `_fadeFoot` 这种改名报「漂移」而不是「健康，只是没挂载」——子串判定会放过唯一该告警的情形。 **#97 的遗留哈希并进了水洗门控的同一条规则**（`html[…wash] [class$="_fade"], html[…wash] .qDHVXG_fade`），表里不再有一条常驻的哈希 fade 规则；工艺门 `wash-fade-neutralised` 的候选集也扩成**任何提到 `_fade` 令牌的规则**（含哈希形态），并按**分支**判水洗门控（逗号列表里任一支单独生效）、按**整条规则**判是否带哈希无关锚点。评审实测过这件事为什么必要：旧候选集只吃属性形态，于是一张 11/11 全绿的审计旁边就躺着一条约常驻的哈希 fade 规则，任何门都看不见它。 圆角声明带 `!important`：我方特异度 (0,3,2) 已经胜过宿主的 `[data-windows-titlebar] .<hash>_frame` (0,2,0)，唯一还能压过我方的是宿主把该变量写进行内 `style`——那是字符串级门永远看不见的位置，所以按 issue #63 那条 `background-color` 的同款做法加一道保险。 **如实写明的五条边界**：① `data-shell-overlay` 在两台宿主的 CSS 里 0 命中（全树唯一命中是 JSX 里的 `querySelector` 字符串），故属性分支对它只能判 `drifted`，永远判不出 `notMounted`；② `_fade` 后缀形状被同机安装的第三方插件 `@linxin666/dsh-client-ui-skin-center` 同时使用（它写 `[data-slot="sidebar.workspaces"] [class*="_fade"]`）——**10.9.0 起这条不再靠推演**：普查（`scripts/host-consumers.cjs` 的 `fade` 一节，宿主语料 + profile 里 33 个插件包）实测**五个 owner、两个真会被我方后缀锚点命中**（宿主 workspace 与 skin-center），逐个包登记形态与可命中性并冻结进 `scripts/data/host-token-census.json`，由 `tests/fade.owners.test.cjs` 按包名看守（未登记的 owner / 与测量矛盾的处置 / 语料读不到，三种情形点名翻红）；**谁盖谁**由计算样式门的 `coexist` 组在真实引擎里量：把本机安装的 skin-center bundle 按它自己的 `scoped()` 语义还原成规则、与我们的规则放进同一页，用**行内哨兵**（`background: rgb(1,2,3)`）读计算值——我方规则下哨兵仍在（普通声明，压不过行内；`coexist-ours-not-important`），它们的 `!important` 一进场哨兵消失（**更强的车道是它们**，`coexist-their-lane-stronger`），而用户看到的那条带子在两种世界里都是 `none`（`coexist-user-result-agrees`）；它们更宽的 `[class*="_fade"]` 确实会罩到 chat 的 `_fadeTop`/`_fadeBottom`，但它们只写 background、那两个面靠 mask 说话，计算值三态不变（`coexist-chat-mask-untouched`，本机实测）；③ 该变量在两台宿主各有 2 个 `border-radius` 消费点（中间列 + 右侧全屏面板），钳 0 会一并抹平——同族缺口，视为有意结果而不是副作用失控；④ macOS 宿主在自己的 CSS 里对那一族 fade 直接打了 `display: none`（本轮在 npm 宿主的 CSS 串里量到，规则形如 `[data-platform=darwin] <hash>_fade`），所以 mac 上本来就没有这条可见的 fade，本版也无从在那台平台上目视；⑤ 计算样式门（`npm run wash:check`）的夹具页**不再有任何手抄宿主类名**：fade / chat 一族自 10.9.0 起由 `hostFadeClasses()` 从刚读到的宿主 CSS 推导，`pI_x6G_frame` / `centerCol` / `sidebarCol` 三枚自 **10.9.1** 起由 `hostLayoutClasses()` 同源推导（`docs` 这一条欠账至此关闭）。推导而不是抄，在 #96 这一族上不是整理：我方规则靠**结构**命中 frame，过期类名不会让我方规则失效，只会让**宿主**的规则失效——于是页面测的是一条没人画过的带子、照样读到"透明"、照样"通过"，正是 issue #97 的形状往上层复发。现在宿主重掷哈希会让夹具**拒绝构建**（"夹具会造一个它声称要读的类"），而换哈希本身（`AAA_frame` → `BBB_panel_frame`）由用例证明是**跟着走**的。<br>**10.9.1 新增的第四处读数**：标题条 `::before` 的计算底色与**它的 `-webkit-app-region`**——水洗态 `rgba(16, 16, 24, 0.75) → rgba(0, 0, 0, 0) → 回到 0.75`，两态 `app-region` 恒为 `drag`（清漆不许把拖拽一起清掉，这一条字符串门看不见），侧栏列计算底色三态恒等（证明没有越界去改用户滑杆管的那个面）。反向变异两条：删掉整条伪元素规则 → **只有** `caption-cleared` 翻红、圆角与 frame 填充与侧栏列三条不动；只去掉 `!important` → **仍然透明**，因为我方 (0,3,3) 本就压过宿主 (0,2,1)，那枚 flag 挡的是"宿主写行内 `style`"这一看不见的情形。**与 #99 的 `!important` 结论方向相反，两边都是量出来的**，不是把上一条的教训照抄。 |
| composer 输入框（`COMPOSER_ANCHOR_SELECTOR`：`data-composer-input` 主锚 + textarea/contenteditable 三级兜底） | Lexical DOM 形态 | 输入框透明度滑杆失效 | issue #50 三轮修复后改为稳定指纹优先 |
| `--dsw-alias-*` / `--dsw-specific-*` token 名（如 `--dsw-specific-sidebar-fill`） | 官方 token 契约 | 对应通道不上色 | token 契约已文档化（[themes-spec.md](./themes-spec.md)），这也是**建议官方承诺稳定的接口面** |
| 设置插槽 `settings.section` / `settings.dreamSkin.item`（`lib/client.js` 之 `SETTINGS_NS` / `renderSlot` 注册处） | 官方插槽名 | 设置 UI 不出现，皮肤仍生效 | 属公开插件 API；跟随官方命名 |
| 第三方壳的侧栏面（issue #55 原型 + issue #99，v10.8.1）：我方两条规则**都只读**类名 `.dshDesktopSidebarSurface`（`lib/client.js` 之 `DESKTOP_SIDEBAR_SELECTOR`），#99 那条再多挂一个**我方自己发布**的水洗标记 `html[data-dsh-dream-skin-wash]` | **非官方壳（`anywhere-labs/dsh-desktop`）的类名**——壳改版即失配，这是本行唯一的真实赌注。壳的模式/材质 `data-*` 标记只是**病灶成立的条件**（壳在自己那条 `material=off` 规则里画底），我方选择器并不读它们：它们变了不影响我方规则命中，它们还在也不代表我方规则被验证过 | 两条分开看：#55 那条（`--dsw-specific-sidebar-fill: inherit !important`）失效 → 桌面侧栏透明度不一致；#99 那条（水洗态 `background-color: transparent !important`）失效 → 滑杆"看着能动、像素不变"，因为壳在**同一个元素**上画了 `background: var(--dsw-alias-bg-layer-1)`，而 **Windows 上材质恒为 `off`**（`environment.ts:24` 只承认 off/transparent/acrylic/mica，`:51-53` 把 acrylic/mica 折成 off，`:58` 与 `:61` 对 `win32 + transparent` 直接 `throw`；两条 paint 规则在 `styles.ts:23` 与 `:24`，那一对声明在 v2.0.5→v2.0.17 md5 相同，**不是新版回归**） | 同一个类名锚点已被漂移探针覆盖（`isDesktopShell()` 门控，不新增无人监控的选择器）；机制取证走计算样式门的**第二个夹具**（`npm run wash:check` 的 `desktop` 组，**按皮肤从发货 bundle 现读 token**，没有手抄颜色）：abyss `rgb(26,28,33) → rgba(0,0,0,0) → 回到 rgb(26,28,33)`、mist `rgba(240,248,255,0.62) → rgba(0,0,0,0) → 回到 0.62`，外加三条读数是别的门看不见的——从壳面往上的**不透明阻断链**（水洗态必须为空）、`elementFromPoint` 命中的元素必须是侧栏本身（否则"透出壁纸"这个前提就是假的）、以及"写一个哨兵 token 看像素跟不跟"的**滑杆扫描**（壳的阴影值重新赢回来时这一条会翻红，也就是 #55 半边的回归门）。反向变异两条都跑过：删掉我方整条规则 → 水洗态仍画 layer-1；**只去掉 `!important`** → 壳以 (0,3,1) 压过我方 (0,2,1)、那层底重新画满。**我方选择器并不比壳更具体**，`!important` 是承重的，这一句现在是用例而不是说法。**如实降级**：夹具里的壳 CSS 是**按 tag 抄进来的快照**（provenance 记 `anywhere-labs/dsh-desktop v2.0.17 / styles.ts:13,14,22,23,24,38`；守卫按**声明级**核对 4 处被读的声明，用例还能递给它一份删减副本验证"少一处就拒绝构建"），壳改版**不会**让快照翻红——它证明的是"这条规则在该世代能赢这份层叠"，不是"真机上已复核"。**已知外溢（有意结果，不是失控）**：win32 + 增强模式下这块 aside 是 `grid-row: 1 / -1`（`styles.ts:38`），标题条下面那一条也跟着一起透——同属"壳的底压在壁纸上"这一族。**未验**：本机未装该第三方外壳，v2.0.17 真机目视 0 次 |
| `[role="dialog"]` 等 ARIA 契约（`COMPOSER_ANCHOR_SELECTOR` 兜底与 `isInDialog` 判定时使用） | 无障碍标准 | 理论不存在失效 | ARIA 是规范而非宿主私有物 |
| 设置导航图标（`lib/client.js` 尾部 IIFE：在 `[role="dialog"] nav button` 里匹配**我们自己注册的 section label**（`Theme / 外观`）里的 `Theme`，再打 `data-dsh-dream-skin-nav` 标记。10.5.0 实机后收紧：早先还匹配裸「皮肤」，而真机上那一行属于第三方插件 `web-ui-skin-center`——等于把别人的导航图标涂掉并隐藏其原 svg（越界装饰，非崩溃）。代价如实写明：宿主若把我们那一行渲染成不含 "Theme" 的字样，图标退回齿轮） | ARIA 结构 + **人类可读文案** | 图标退回默认齿轮（纯装饰损失，功能无损） | 比 CSS 哈希类名稳，但改文案或换语种即失配；10.5.0 起自检上报 `navIcon{dialogs,buttons,marked,armed}`：`armed=true && marked=0` 只说明面板没开，`armed=false && sheets<=1` 才可以说"这个构建没钩上"。漂移探针**不覆盖**这一条（探针只管材质精修）；10.5.0 起钩子有完整生命周期——fiber 卸载拆除（观察者 / 行标记 / 图标表三样）、同页重挂复臂，generation 令牌防旧代误杀新代，控制柄 `arm(gen)` / `dispose(gen)` 不可枚举 |
| 右侧栏 dockkit 面（PR #65 / v10.6.0：`[data-sidebar-right-panel]` 祖先门 + `[data-dockkit-host=dock] > section`、`[data-dockkit-empty]`、`[data-sidebar-right-guide-entry]`） | 宿主自己发布的**稳定 data 属性**（非哈希类名；分别由 `dsh-client-ui-sidebar-right` / `dsh-client-ui-sidebar-terminal` / frontend 共享 tab-cell 写入） | 三条规则静默失效：右栏底色不再跟随侧栏滑杆、全屏又透出对话、胶囊 hover 丢底色（外观损失，功能无损） | 属性名比构建哈希稳，**但漂移探针不覆盖**——探针只采哈希类名，宿主改这些 data 属性同样零信号（与「设置导航图标」同一类盲区，PR 正文已如实记为已知盲区）；作用域门与水洗门都有正反双向断言，合并前 5 处变异抽查逐条能翻红（含"把水洗门塞进规则①"这一恒真守卫反例形式） |
| alpha.1 底栏区域 `shell.bottom`（稳定属性 `data-shell-bottom`；哈希类名 `pI_x6G_bottomRow` 只作**证据**，不作选择器） | 宿主自发布插槽 + 稳定 data 属性，**0.2.1-alpha.1 起才有**（rc.1 / rc.2 里 `data-shell-bottom`、`bottomRow` 均 0 命中，实测三版 `dsh-client-ui-layout` 包内） | 若将来有注册方挂进来：宿主给这块用的底是 `background: var(--dsw-alias-bg-base)` —— **正是我们画布水洗写的那枚 token**，于是可能出现一条随壁纸滑杆一起变透的全宽条，滚到底时对话内容从底下透过来（与"右栏全屏透出"同族） | **本版不改代码、只记录边界**（issue #90 的三选一之第二支）：冻结语料里 `shell.bottom` 的注册方 **0** —— 无注册方时 `renderSlot` 渲染空元素，而 frame 的行轨道在 alpha.1 改为 `minmax(0, 1fr) auto`，空的那一行塌成 0 高，**当前没有可上色的面**。这条判断带**到期条件**：注册方计数由普查冻结、`tests/host.slots.test.cjs` 看守，计数一旦非 0 或 `data-shell-bottom` 在语料里出现，门就翻红并逼着重做决策；分类真源是 `scripts/lib/host-slots.cjs`（含 `since: 0.2.1-alpha.1`）。**未验证**：该底栏在活页面上一次都没看过（本机实装为 rc.1，不允许为验证升级实装） |

## 会话字号区间：我们只测过 14 px（issue #93）

宿主 `dsh-client-ui-theme` 的「会话正文字号」步进器区间在 **0.2.0-rc.2**（当前 `latest`）由 `12–17 px` 放宽为 **`10–22 px`**，默认值仍是 `14 px`。我们**不写**对话字号，所以这不是代码冲突；但**本仓库所有"可读"结论都是在原区间的默认值上测出来的**，两个新极值一次都没看过。本节把这件事如实钉住。

**宿主三版实测**（`npm pack` 三个版本、读包内 `README.md` 原文，2026-10-06；夹具 `tests/fixtures/host_font_scale.json`，由 `tests/desktop.fontscale.test.cjs` 与本文件逐项比对）：

| 版本 | 步进器区间（原文） | 默认 |
|------|------------------|------|
| `0.2.0-rc.1`（本机实装） | `from 12 through 17 px` | `14 px` |
| `0.2.0-rc.2`（`latest`，**新装用户已在用**） | `from 10 to 22 px` | `14 px` |
| `0.2.1-alpha.1` | `from 10 to 22 px` | `14 px` |

**这次放宽是纯边界变更，机制一字未动**：三版都由 `gradient-shadow-text.css` 从 `--dsh-content-font-size` 派生 `--dsh-content-font-delta` 再平移标题与正文阶梯，那段推导原文**逐字节相同**（唯一差异是一处 markdown 链接目标），步进器那句也只差区间数字。也就是说，我们在 rc.1 上读懂的那套阶梯，就是现在跑到 10 / 22 上的同一套阶梯——**未知的是极值下的结果，不是机器**。

**宿主的阶梯把谁算进去**（rc.2 README 原话，逐句引用）：

- 「It changes conversation headings and base text by the same increment, **including the user bubble and composer draft**」→ 跟着走的两块正好是我们上过色的面：`--dsw-specific-bubble`（用户气泡）与 composer 草稿（`--dsh-dream-skin-composer-base` 一族）。
- 「flow-row titles, summaries, and tables follow one step under the body size」→ 次级档是 `--dsh-content-font-size-secondary`，宿主自己写明「setting −1 at ≤14, setting −2 above; 13px at the default」。**按这条规则**：`10 px` 时次级档是 **9 px**，`22 px` 时是 **20 px**，`14 px` 时是 13 px（宿主原文）。
- 「while **small text and code keep fixed sizes**」／「Dense small and code variants stay fixed.」→ **小字与代码是固定字号，不随步进器动**。这条把暴露面砍掉一块：凡落在宿主"小字 / 代码"档上的结论（含代码块上的三级墨色）**不受 10 px 极值影响**。但用户气泡与 composer 草稿**跟着动**，那两处不在此列。

**我们这侧的实测**（`lib/client.js`，可机检）：

- `--dsh-content-font*` 出现 **0 次**——我们不驱动宿主字号阶梯，也不反推宿主字号（本仓库既有纪律：不动宿主布局 / 排版）。
- `fontSize:` 共 **19 处**，取值去重后为 `{10, 11, 12, 13, 14}` px，全部是**本插件设置面板 UI 的固定常量**，最大值 14 px；`font-size:` CSS 声明 **0 处**。
- 对比度门（`scripts/skin-audit.cjs` 之 `apca: { primary: 85, secondary: 60, tertiary: 45 }`）与 APCA 实现（`scripts/lib/color.cjs` 之 `apcaContrast(textRgb, bgRgb)`）**都不接受字号 / 字重入参**——判据是"给定墨色与底色算出的 Lc"，与字号无关。

**因此这条的诚实表述是**：字号极值改变的是**要求**，不是我们**测出来的数**。我们的门没有能力发现"10 px 下这枚三级墨色不够读"，因为它压根不看字号。**10 px / 22 px 各零次实测**——既不是"推测读不出来"，也不是"已验证"。

**措辞规则**（本文与 README 一并适用）：凡出现"在宿主默认字号下"一类表述，必须写成"**在宿主字号 10–22 区间内的默认值 14 px 下实测，极值未测**"。别让读者以为验过整个区间。

**要补的实测**（属可牺牲环境的活页复核，**不在本机做**——升级本机实装会打扰用户运行实例）：字号 = 10 px 与 22 px 各一轮，每轮采样 `--dsw-specific-bubble` 计算色、composer 卡片 `::before` 的 alpha、`--dsw-alias-label-tertiary` 压在气泡 / 代码块上的计算前后景；皮肤至少覆盖最浅端与最深端各一套、弹窗滑杆两端各一次。**若 10 px + 最浅端确实读不出来，那才是产品问题**，处置（提高三级墨色最低 alpha、或给最小字号加保护）另立 issue，不在本验证条目里顺手改代码。

## 安全边界

- `/dream-skin/api`：仅回环 Host（或显式配置的 trusted authority）+ `sec-fetch-site` / Origin 同源校验 + 严格 JSON 围栏 + 32 MiB 体积上限（`lib/index.js` 之 `isTrustedApiRequest()` / `readJsonBody()`）。防 DNS rebinding / 跨站打点。**无鉴权**——设计目标是本机单用户场景，文档如实声明。
- 壁纸 URL：仅 `http(s):` / `data:image/`，控制字符拒绝，出口转义（`lib/client.js` 之 `isSafeWallpaperUrl()`）。
- 渐变值：**先规范化、再判定**（v9.27.0，A-2.1）——`normalizeCssForInspection()` 剥 `/*…*/` 注释、解码 `\75 rl(` 一类 CSS 十六进制转义（最长 6 位 + 单空格 terminator）、`\c` 字面转义与 `\<换行>` 续行；解码出的换行/CR/FF 按 CSS 语义**删除而非插回**（round-2 R-1：`\a` 若插回串中会造出 `u\nrl(` 躲过 denylist 的 `url\s*\(`），NUL 解为替换符；规范化形还要**再过一次控制字符门**（解码本身可能引入控制符，原值一道+规范化形双门）。denylist（`url(` / `image-set(` / `element(` / `cross-fade(` / `expression(` / `@import` / `javascript:`）与前缀 allowlist 都跑在 CSSOM 解析器会看到的形态上；存的是原值、校验的是规范化形。遗留 `-webkit-linear-gradient` **策略性拒绝**（A-2.2 决策：运行面是常青 Chromium，旧版语法不同族的前缀变体不予放行——放一个就要考虑放一片，收紧是安全方向；若未来要改判，回归测试 "legacy -webkit- prefixes are a DECLINED policy" 必须同步显式翻转）。三道把关不变：写入、渲染、宿主采纳（`isSafeWallpaperGradient()`）；渲染层忽略被存下的不安全值时**不再静默消失**——`warnRenderGateSkip()` 每值一次 `console.warn` 说明原因；去重集合封顶 20 后**按 FIFO 淘汰最旧**而非永久静默（round-2 R-5），第 21 个新值照常出声；该集合是 **window 单例**（`window.__DSH_DREAM_SKIN_RENDER_GATE_SEEN__`，页面内纯状态，零网络零持久化）——「一页一个封顶」才是这条防洪水机制的真实语义，闭包私有 Set 会让每个模块实例各自计数、封顶几乎永不生效（也正是 R-5 首版回归用例压根不可能失败的根因，见下）。
- 主题包导入：本地文件 / URL hash base64，结构 + 十六进制色值校验，失败回滚，**不发起任何远程拉取**（`lib/client.js` 之 `tryImportFromHash()` / pack 校验路径）。
- 出厂壁纸：原创抽象弥散光壁纸，**内联 SVG**（3.4KB data URL，零远程请求）。v9.27.1 起改为矢量：壁纸层默认是 `background-size: cover` 的满屏节点（v9.29.0 起填充方式可由用户改选，出厂默认仍是 cover），此前那张 1200×678 位图在 2K 屏上被放大约 2.1×，JPEG 宏块变成肉眼可见的方格（Chromium 实测 2560×1440：旧位图 90.0% 相邻像素同色、最长纯色带 853px、中列仅 136 级明度台阶；矢量版同测点 1.7%／6px／1126 级，并带 128px 接缝对齐的抖动颗粒防色带）。
	  历史出厂图由一次性迁移自动替换（**三重指纹精确匹配才写入**：字符串长度 + 解码字节长度 + cyrb53，`LEGACY_FACTORY_WALLPAPERS` / `migrateLegacyFactoryWallpaper()`，两组三元组常量中 **entry 2 由真实资产反算钉死**（见下"已验证"清单），entry 1 只有字面量钉子 + 合成载荷算法用例、数值靠对 git 标签复算核对）：entry 1 = v9.13.0–v9.23.0 的真人照片（品牌与许可），entry 2 = v9.24.0–v9.27.0 的位图光晕（分辨率）。除这两条精确匹配外，任何自定义照片、已清除状态一律不动。
	  旧照片的处置：**代码与测试中只以三个数字指纹存在**；原图仍在 git 历史（维护者决定不重写）；曾含旧图的两张 `docs/screenshots/` 真机截图**自 v9.26.1 起已移出 npm 包 `files`**（此前随包分发，属失实暴露面），仓库内保留至真机重截后替换。插件运行期不分发该图像。
- 遥测：**无**。唯一第三方网络目标：可选开启的"必应每日壁纸"定时刷新（域名为第三方 uapis.cn 代理，默认关闭、显式开启，`lib/client.js` 之 `runScheduledWallpaperRefresh()` / `startWallpaperRefreshScheduler()`）。

## 已验证 / 未验证（诚实清单）

**已自动化验证**（`npm test`，404 用例，Node 18/20/22/24 CI；用例总数由 `tests/docs.numbers.test.cjs` 现场加载整套件数出并与此处比对，不是手抄；修复类用例经**变异验证**——逐条反向破坏对应修复，10.8.1 轮（issue #99 整改）另有计算级变异 2 处（删掉桌面水洗门控整条规则 / **只去掉那条的 `!important`**，都在真实 CSS 引擎里重跑后当场翻红）与三组"门自己会失败"的反向用例（壳快照的 4 处被读声明逐处删减必须拒绝构建、`groups` 传空数组或旧的单字符串必须判成检查器故障、等收敛的轮询助手遇到永不收敛必须判红）；10.6.0 轮 5 处（对 PR #65 三条 dockkit 规则：X1 终端胶囊排除拆除、X2 右栏作用域拆除、X3 把水洗门塞进规则①选择器——正是评审抓出的"恒真守卫"病灶的反例形式、X4 全屏两分支之一丢水洗门、X5 水洗标记撤回拆除；另有贡献者侧 6 处反向验证）在隔离副本树逐条打印翻红断言后才写记录；10.5.1 轮 15 处（M1–M9 对 PR #68 面：`POPUP_TOKENS` 摘 layer-2 / 严格解析门 / liquid 地板 / CSS 乘法 / chip 不重发 / liquid tint / 无壁纸重解析分支 / 壁纸路径不重解析 / 厚度基准；E4–E7/T2a/T2b 对本轮新增机制：`fillFor` 的 scheme 门 / 两处回调 `_applyingWallpaper` 守卫 / dispose 清理 / 0.94 与 0.6 两个默认值——**其中六条先在已发运套件（`691e7a2`，98/98 全绿）上实测六次全绿**（裁定方与整改方在两座隔离副本分别复跑证实；这正是裁定把"补门"列为发版前 P0 的依据），加 R1–R6 门后全部翻红，"无门→有门"两侧证据齐备）在隔离副本树逐条打印翻红断言后才写记录；10.5.0 轮 26 处（M1 计划卡锚点改回哈希类名 `.LVzXQa_card`、M2 填充选择器列表里重新混入一处哈希类名、M3 审批卡戳记改名使填充不再覆盖它、M4 液面描边把计划卡换成审批卡、M5 alpha 混合改画在半透明 `--dsw-alias-bg-base` 上、M6 不透明基色换了变量键名（等于不再发布）、M7 导航表查找去掉 `style#` 限定、M8 `arm()` 不再读页面级 `armed`（bundle 重跑即叠出第二个观察者）、M9 `<body>` 尚未解析时照样宣称接管、M10 材质表收养不再限定 STYLE 节点、M11 拆掉 rAF 之外的 120ms 兜底、M12 卸载时额外按 id 移除（连带删掉冒用我们 id 的外来节点）、M13 无 `color-mix()` 的兜底退回半透明 overlay、M14 收养后不再把材质表移回 `<head>` 末尾、M15 漂移告警不再声明"卡片填充不在探针覆盖内"、M16 导航图标匹配式退回「含裸 `皮肤`」分支（那一行在实机属第三方插件 `web-ui-skin-center`；实测翻红的是行级负向控制「the third-party 皮肤 row is not marked」）、对抗评审整改批 M17–M26（M17 审批卡戳选择器收窄成 `:nth-child(2)`——旧的字符串包含式 pin 对同一变异全员常绿、M18 导航表计数恒值 1、M19 匹配式退回子串 `Theme`、M20 分类器短路成全部 drifted、M21 分类器丢掉 `style[data-plugin-css]` 限定、M22 卸载不拆钩子、M23 apply 不复臂、M24 dispose 丢 generation 门、M25 钩子不持有 sheet 句柄、M26 同步门拆除））在隔离副本树逐条打印翻红断言后才写记录；v9.29.0 轮另 15 处（渲染写死 cover、溢出层改 append、渐变档守卫拆除、写入门白名单拆除、渲染门白名单拆除、离开模糊档不断开溢出层、溢出层少 48px、store 漏传 fit、手动应用戳写在渲染之后、手动应用完全不落戳、渲染只在定时开启时 bust、teardown 漏掉溢出层、FACTORY_DEFAULTS 丢该键、SENTINEL_KEYS 丢该键、空链接误点门恢复成修复前的分支）在隔离副本树逐条打印翻红断言后才写记录（M15 的第一次注入把恢复的分支落在 `return` 之后、等价于没改，却打红了「不安全链接被拒」那条——顺藤查到那次注入其实改写了 `wallpaper-kind`，归因不清的翻红不算验证，重写后才精确命中 1 条）；9.27.0 轮含四轮复核整改共 **27 处变异**——第一轮 10 处（A-1 两道门控、A-2.1 规范化旁路、A-2.2 告警静音、B-3 单边加字段、B-4 标志移除、B-6 出口不播种，及 9.26.1 沿用 3 处）、第二轮 7 处（R-1a 换行插回、R-1b 拆除规范化后控制字符门、R-1c 整体退回修复前状态、R-2 解除晚修正观察者、R-4 间隔改绝对、R-5 封顶回退为永久静默、R-6 受控例外分支翻转）、第三轮 6 处（R-4b 数组按"绝对时刻"解释而字面量不变、S-3a 卸载不再断开观察者、S-3b 回调丢掉 `disposed` 门、S-3c 新链不取代旧链，以及文本卫生两处：往 `CHANGELOG.md` 注入控制字节 / 往 `README.md` 注入孤立 CR）、第四轮 4 处（T-1a 拆掉阶梯定时器的取消动作、T-1b 拆掉 `ladderClosed` 门槛、T-1c 整体退回修复前状态即卸载不再处置阶梯、T-1d 新链不取代旧链）全部有用例翻红。本轮把与归因陈述有关的 **6 次既有变异**（R-1a/R-1b/R-1c/R-2/R-5/规范化旁路）连同第三轮新增 6 次，在**隔离副本树**里重跑（变异只作用于副本，绝不触碰工作文件）并**逐条打印翻红断言原文**后才写进记录；其余 11 次沿用上一轮实测，第三轮未重跑；第四轮新增 4 次同样在隔离副本树里实测并打印翻红断言原文，**第四轮未重跑前三轮的 23 次**。此外另做四件**反身检查**（第三轮 3 件 + 第四轮 1 件）：① 把上一轮"归因陈述"（哪条变异由哪条断言抓出）逐条重跑，据此更正了 R-1a 与 R-4 两处记录（见上守卫一节与 CHANGELOG）；② 评审方建议的"已挂判据"（`terminalDrift !== null`）单独反证过一次——采用它会让 3 条用例翻红，等于把 R-2 的修复整个关掉，故改用模块级单一持有句柄；③ 故意保留一次"变异不翻红"作为证据——拆掉 `resample()` 里 `terminalDrift === null` 判空后用例全绿，这一次**绿证明的是代码是死的**（该分支永不可达），据此删除死分支而不是给用例补断言，不虚报为"变异已覆盖"；④ 第四轮补一次**门槛位置的形状实验**（T-1e，不计入破坏数）——把 `ladderClosed` 从 `step()` 入口按评审方建议的形状挪进 `runRound()`，实测唯一翻红的是 `and the slipped step arms NOTHING further — the chain died with the fiber`，"什么都不发布"那条照样绿：两种写法都不发布，只有"是否还挂后续轮次"能分辨门放对了没有）；**rc.2 / alpha.1 整改轮（issue #87–#94）另 24 处命名变异**——`desktop.claims` 4（#87）、`desktop.fontscale` 10（#93）、`hashes` 5（#92）、`host.slots` 5（#90），逐条在隔离副本树跑翻红后才写记录；另修掉 #88 那两条**指错 token、从未跑到被测代码**的旧变异（它们指向 `cover` 分类的 `--dsw-alias-border-l3` / `--dsw-alias-bg-skeleton`，按构造不在冻结缺口里，于是崩在 `undefined` 上而不是翻红——"没跑到代码"与"跑到了没翻红"是两件事，不能记账为已覆盖），重新指向确实被测量的 `--dsw-alias-bg-mask-1`）：
- **10.9.1 轮（官方桌面壳三处壁纸态外观，逐条留了可失败的检查）**：
  - **标题条是第二个盒子（红圈）**：#96 那条规则清的是 AppFrame **元素**，而 Windows 标题条由宿主的 `::before` 单独绘制，`background-color` 传不进伪元素——水洗态下整幅窗宽最上面那条带子仍由**侧栏** token 上色，左边压着两层侧栏色、右边压着一层 canvas 色，三处互相不一致（DSH Web 没有这一条）。本版补**它自己的**水洗门控规则，只清颜色分量。计算样式实测：`rgba(16, 16, 24, 0.75) → rgba(0, 0, 0, 0) → 回到 0.75`，**两态 `-webkit-app-region` 恒为 `drag`**（清漆不许把拖窗口一起清掉），侧栏列计算底色三态恒等（没有越界到用户滑杆管的那个面）。工艺门 `wash-frame-flattened` 的判据从"元素规则"扩成"元素规则 / 伪元素规则 / 全表不得声明任何 `app-region`"三件事，六处变异逐条翻红（伪元素形状丢掉、声明删掉、flag 摘掉、选择器不再指向伪元素、水洗门控丢掉、把透明换成 canvas 色）。反向变异两条在同一引擎里跑过：**删掉整条伪元素规则** → 水洗态标题条重新画满，且**只有** `caption-cleared` 一条翻红（圆角 / frame 填充 / 侧栏列三条判据不受影响）；**只去掉 `!important`** → 计算值仍为透明，即我方 (0,3,3) 本就压过宿主 (0,2,1)，flag 挡的是行内 `style` 那一种看不见的情形——**这一条与 #99 的 `!important` 结论方向相反，两边都是量出来的**，不是把上一条的教训照抄。
  - **圆角与 fade 带（绿圈 / 蓝圈）是 10.8.0 已修、但没送达**：报告所在的官方桌面 profile 依赖写的是 `dsh-dream-skin: ^9.29.0`，`^9.29.0` 按 semver 覆盖不到 10.x，`dsh plugin update` 也不会跨大版本抬上去——所以那一版仍然看得见这两处。本版对它们**没有改代码**，只把两处旧修复的读数**并进官方桌面壳的同一份夹具**（`corner` 组：圆角 `16px → 0px → 16px`、fade `linear-gradient → none → linear-gradient`、聊天滚动遮罩三态不变），并在文档与 README 里把"旧修复没送达"与"新缺陷"分开记账。**未验证**：10.9.1 在该壳上 0 次真机目视（见上表"官方 DSH Desktop"那一格）。
  - **夹具不再手抄宿主类名（边界⑤ 关闭）**：`hostLayoutClasses()` 从本机安装物的 layout CSS 现读 `frame` / `centerCol` / `sidebarCol` 三枚，缺任一即**拒绝构建**；同时用例证明"换哈希"（`AAA_` → `BBB_panel_`）是**跟着走**的。这件事的必要性写在上表边界⑤ 那一格：我方规则靠结构命中，过期类名只会让**宿主**规则失效，于是"测一条没人画的带子"照样读透明、照样通过。
  - **本轮如实记下的两处自我订正**：① #96 的注释曾写"每个面各自保留一层半透明"并把"标题条"列进名单——它从未描述过这个页面（侧栏列是两层、标题条是另一个盒子），现按实测改写并保留订正痕迹；② `docs/desktop-support.md` 的"最后更新"行自 v10.6.0 起就没再动过，等于文档自称的时效比实际旧了三轮，本轮一并补回（这条与代码无关，但它正是本文件反复告诫的那种"看起来还新"的陈述）。
- **10.9.0 轮（评审工单 #100–#105 整改，逐条留了可失败的检查）**：
  - **可读性地板的适用范围（#100 / #101）**：地板改为由**水洗标记**单点授权（`readDialogAlpha()`：有壁纸 `max(滑杆, 0.92)`、无壁纸原值），并且**卡片通道读同一个函数**——一条滑杆一个下限。用例 `issue #100/#101: the readability floor is a WASH state…` 按**五点采样**（显示透明度 0/25/50/75/100）在**两种水洗状态**下断言：无壁纸时两条腿都是 `[1, 0.75, 0.5, 0.25, 0]`（全量程）、有壁纸时 `[1, 0.92, 0.92, 0.92, 0.92]`（钳住）且**菜单/遮罩两条豁免腿在两态都保持全量程**；另有用例断言"加/清壁纸会立刻重发两条被钳通道、而滑杆自己的存储值一位不动"（`removeWallpaper()` 不经过 `applyWallpaper2`，第一版实现漏了这条路径，是这条用例把它抓出来的）。变异 M1（去掉水洗门控）/M2（卡片通道改回未钳读数）各自翻红。
  - **"有浏览器但起不来"是第三种状态（#102）**：`runChrome()` 吸收 spawn 级失败并返回 `{ran:false, why}`；`npm run wash:check` 退出码 **0 / 1 / 3** 三档（跑过且干净 / 跑过且不一致 / 没跑成）；宿主安装缺失=环境 skip、装了但声明没了=判红，两者用**带 `environment` 标记的异常对象**区分。变异 M3（把 spawn 失败重新抛出）翻红 `issue #102: a browser that exists but cannot be spawned is a SKIP, not a red`；同一夹具还断言 skip 输出里必须出现"not a pass"。
  - **mist 出厂种子偏差登记（#103）**：用例同时钉住 `mist.defaults.modalOpacity === 0.90` 与 `0.90 < DIALOG_ALPHA_FLOOR`，并断言 mist 是唯一一套落在地板下的皮肤。变异 M4（把断言里的 0.90 改成 0.94）翻红。
  - **J1 偶发翻红（#104）**：本机**连跑 20 次整文件 + 4 次全量，0 次复现**（评审样本是 10.8.0 工作树 4 次里 1 次）；用例补**中间态 + 终态双采样**（中间态在 `apply()` 返回后同步读，不含计时器）与一条反向用例（活页证据不成立的宿主永远不许到达正向信号）。变异 M5（让轮询助手不再在超时时判红）翻红。
  - **`_fade` 作用域与"谁盖谁"（#105）**：普查新增 `fade` 一节（宿主语料 + profile 第三方插件语料，本机 33 个插件包），实测 **5 个 owner、2 个可被我方后缀锚点命中**；处置表按包名登记，`tests/fade.owners.test.cjs`（9 件）在"未登记 owner / 处置与测量矛盾 / 语料读不到 / 声称 no-impact 却可命中"四种情形翻红，并钉死两个分类陷阱（`@keyframes BInVoG_fade-in`、`this._fadeInSeconds`）。诊断快照新增 `anchors.fadeMatches` / `fadeClasses`（读不到 DOM 报 `null`）。计算样式门新增 `coexist` 组：把**本机安装的** skin-center bundle 按它自己的 `scoped()` 语义还原成规则、与我们的规则同页，用**行内哨兵**读计算值——我方规则下哨兵在（普通声明）、它们的 `!important` 进场后哨兵消失（更强的车道是它们）、用户看到的带子两态都是 `none`、chat 的两个 mask 三态不变；另有一条反向变异（删掉我方 `background` 声明 → 带子回来、而哨兵仍被它们按住，顺带证明归因读的是它们的车道）。夹具里最后两处手抄类名（fade / chat）改为**从宿主 CSS 推导**，宿主重掷即拒绝构建。变异 M6（`fadeMatches` 写死 0）/M7（分类器放行 JS 标识符）/M8（未登记 owner 不再翻红）各自翻红。
  - **仍未验证 / 已知边界（本轮新增，含三方评审的裁定结论）**：`coexist` 组量的是"它们发货 bundle 里那条规则"在真实引擎里的层叠结果，**不是"两个插件真的同时跑在活页面上"**——它们的规则由自己的 JS 打标记才生效，本机没有在同一页里同时跑过两个皮肤插件；`fadeMatches` 的"真机恰为 1"目前只有夹具读数（静态扫描支持"至多一个"的结构性推论）；`#100` 的滑杆标记是 React 渲染值，只做了字符串/渲染路径的离线断言，**没有在真机上目视**；#103 的观感描述（"mist 新装首启对话框略实于出厂种子"）仍是推导 + 门；**同页两代纤维重叠**时旧代卸载会撤掉当前水洗与地板（毫秒级瞬态、随后自愈；修法涉及纤维生命周期，裁定结论是记录待修）；DOM 在 `setAttribute` 上抛异常时水洗 token 已发布而地板缺席（方向是少钳，只有合成 DOM 可达）。
- 双代宿主 seed 探测与全量降级（哑模块路径 + degraded 全 schema 快照）；
- 动态端口重启 + 清壁纸后无出厂壁纸闪现；
- 漂移探针三态（v9.27.0，A-1 验收四情形）：空 DOM 恒 `pending`（阶梯走完也不判漂移）、全命中收敛为 `drifted: [] && pending: false`、单组缺失在活跃度证明后的终局点名**恰好那一组**、晚挂载面凭命中记忆自我撤回；10.5.0 增补 `notMounted` 分栏——宿主 CSS 仍持有的未挂载组不混入 `drifted`（且该轮不告警）、晚挂载后经同一观察者从 `notMounted` 撤回（分类器短路 / 丢 `style[data-plugin-css]` 限定 / 双池撤回各有用例或变异钉，M20/M21）；**阶梯窗口外**晚挂载的面由 late-correction 观察者单向撤回（round-2 R-2，含"撤回不再告警"断言）；桌面壳两态（Web `probed=8`、桌面 `probed=9`，10.8.0 起含 #96/#97 两组哈希无关锚点；`drifted` 只含合法原始选择器、人类标签只在 console 行）；**10.8.0 J1 的退役锚点分池**——`.bqrRRG_card` / `.nArs4W_*` / `.qDHVXG_fade` 在可测量的宿主上恒 0 命中，若留在 `drifted` 里，本文承诺的唯一正向信号（`drifted: [] && pending: false`）将永不可达，故它们进 `anchors.retired`（用例 `drift probe (J1)` 断言健康宿主 `drifted` 为空、退役三组点名在 `retired`，且退役组**不得**出现在 console 告警里；名单与 `scripts/data/dead-hashes.cjs` 的双向一致性由 `tests/hashes.test.cjs` 钉）；中途轮次即使活跃度已证明也**不得**提前终局（变异 `conclusive = liveness` 由该断言翻红）；**阶梯数组按"相对间隔"解释**这一语义有独立行为钉（round-3 自查补，`drift probe (R-4)`：3×400ms 间隔下 ~700ms 必须仍 `pending`、终态才点名漂移，按"绝对时刻"解释会提前终局 → 中间态断言翻红）；晚修正观察者的**卸载断开**与**至多一个存活实例**（round-3 S-3）各一条用例，并断言卸载后快照**冻结**（既不改好也不变坏）；**阶梯定时器在卸载时被取消**、**已跑出队列的那一步补跑后快照连对象引用都不换**、**重新 `apply()` 取代旧链而非叠出第二条阶梯**（round-4 T-1 三条用例；"取消"与"门槛"分置两用例，避免先失败者遮蔽后一位）；
- ready/applying/degraded 三种快照逐键同构（B-3 schema 守卫，单边加字段即翻红）；
- 宿主 API 的类型围栏 / 方法围栏 / 体积围栏 / 超大体不泄漏栈；
- URL 与渐变壁纸的注入拒绝（写入 + 渲染 + **宿主采纳**三道；CSS 转义/注释走私 14 个向量（含 `\a`/`\A`/`\a\a`/`\2\0`/`\d`/`\c` 与「反斜杠 + 真实 CR/FF」的字面续行）在写入门翻红，另有 2 条**反过度拒绝**断言（`\28`、`,\a\a ` 合法值必须照常采纳。**归因经 round-3 反向检查更正**：两条各钉一半、不可互换——`,\a\a `（诚实值 B）才是唯一能区分「删除语义」与「插回」的那条，`\28`（诚实值 A）在两种实现下都通过，它钉的是"规范化是否被应用"（由规范化旁路变异抓到）；两条已拆为独立用例 `gradient guard (R-1/S-1)` 以免先失败者遮蔽后一位），渲染拒绝带可见告警，`-webkit-` 策略拒绝单独钉死）；
- 出厂壁纸迁移：负向路径（同长度走私 / 同字节数空白载荷 / 同三元组差一哈希 / 当前出厂图幂等）与**正向路径**；**v9.27.1 起 entry 2 改走真实资产反算**——`tests/fixtures/legacy_factory_raster_9_27_0.txt` 保存 v9.27.0 标签实际随包的那张位图串，测试用独立实现重算三重指纹再与源码字面量比对。此前所有正向用例都在 patched 副本里把三元组改写成合成载荷自己的值，**常量数值没有任何检查能翻红**（自证式探针），首版手写的 entry 2 哈希因此错了也无人报，真机上迁移静默不生效——发版前实机自查发现并改正；entry 1 的照片字节仍不进仓库，只有字面量钉子 + 合成载荷算法用例，其数值由本轮对 git 标签（v9.14.2…v9.16.0、v9.23.0）与本机历史串复算核对一致；迁移 × 宿主采纳的双向语义（宿主"已清空"不被工厂写复活；宿主持有旧图的会话迁移后以用户态推送、host 文件收敛，含"同 origin 重启、本地与宿主两侧都仍是旧图"的真实形态用例）；真机复核（`dsh@0.1.7-rc.2`，9.27.1）：宿主 `dream-skin.json`、localStorage、DOM 壁纸层三处均收敛为矢量图，用户既有的 opacity/模糊/皮肤未被迁移改动；受控例外（B-5）由源码正则钉子守卫，注释删除即翻红；
- 宿主 `ok: false` 拒绝出口与网络失败出口同语义播种（B-6），且不产生任何回写；
- 诊断快照跟随宿主采纳刷新，重发布经 prev-merge 保住探针结果。
- **安装期闸门实机复现与规避（2026-09-29，本机 dsh `0.2.0-rc.1`，pnpm 11.6.0）**：宿主自身的 `evaluatePluginCompatibility()` 在 rc.2 代码上对 9.27.1 判**拒**（5 个 peer 不落）、对 9.29.0 判**放行**——与本插件无关，纯粹是 peer 范围。产品路径复现：`dsh plugin --profile <p> add dsh-dream-skin`（不带版本号）→ pnpm 输出 `+ dsh-dream-skin ^9.27.1`（旁注 `(9.29.0 is available)`）→ 宿主 `dsh: installation rejected: Plugin dsh-dream-skin@9.27.1 is incompatible with dsh …` → `dsh: restored package.json, pnpm-lock.yaml, and node_modules.`。`dsh plugin --profile <p> add dsh-dream-skin@9.29.0`（显式版本）→ pnpm 自动把该版本写进 profile 的 `pnpm-workspace.yaml` 之 `minimumReleaseAgeExclude` → `+ dsh-dream-skin 9.29.0`，`package.json` 记 `"dsh-dream-skin": "9.29.0"`，`dsh --profile <p> --dump-config` 出现 `- id: dream-skin` 条目。对照实验：`--config.minimumReleaseAge=0` 同样放行（备选手段）；把 `.npmrc` 里写 `minimum-release-age=0` **无效**（仍装旧版），即只有 CLI 形态被证实；`pnpm config get minimumReleaseAge` 返回 `undefined` 也拦不住默认行为，所以"我没配过这个策略"不是排除理由。
- **实机复核（v9.29.0，本机 dsh `0.2.0-rc.1`，走访客同款通道=内置浏览器 `evaluate_script` 读计算样式/DOM 树序/`aria-pressed`）**：宿主 profile 载入 19/19 不跳过、入口含本插件；`__DSH_DREAM_SKIN_STATUS__` = `9.29.0` / `ready`；皮肤 / 强调色 / 壁纸三档 / 填充方式 / 应用链接 / 清除壁纸 设置行齐全；填充方式点选后 `background-size` 与落库值同步变化，`模糊填充` 溢出层确实排在图片层**之前**（`body` 子节点 index 0）且 `filter` 为 `blur(51px)`（用户 3px + 48px），切回 `裁剪填满` 后溢出层摘除；选中「渐变」时整行填充方式消失、切回「本地图片」又出现。**这是机读复核，不是像素目视**——内置浏览器仍截不到图（`visibilityState=hidden`）。
- **实机复核（v10.5.1，本机 dsh `0.2.0-rc.1`，2026-10-06，内置浏览器 `evaluate_script` 机读、非像素目视）**：裁定 CP1 的「宿主同步 emit」前提复测——真实 UI 色块切换皮肤 nebula→aurora→nebula，**定态窗口**内恰好 3 次 publish、共 111 笔 `--dsw-`/`--dsh-` token 写入（37 枚/层；计数为包装 `CSSStyleDeclaration.setProperty` 的**代理指标**），+500ms / +2500ms / +7000ms / +10500ms 四采样点全部停在 111（离线隔离副本里同类变异 E5/E6 在 +2500ms 已达 200+/400+ 且继续增长——守卫确有承重）。**⚠ 本条不得当作现行写入基线沿用（#84 明确要求）**：① 它数的是「层内槽位写入」，不是层数，三个计数在此口径不同；② 它测在 **#84 修复之前**的构建上，而 #84 改的正是写入形状；③ 它根本没数 `setItem`。它唯一的合法用途是证明**定态不增长**。现行基线见下条；layer-2 覆盖随皮肤重解析并三态还原（`rgba(30, 27, 44, 0.5)` → `rgba(22, 32, 34, 0.5)` → 恢复）。弹窗两态（裁定 T1）：滑杆 6 → 对话框 `rgba(30, 27, 44, 0.94)`、滑杆 40 → `rgba(30, 27, 44, 0.6)`、恢复 0.5（滑杆为「透明度」语义，stored alpha = 1 − 滑杆/100；实机确认的消费面为设置对话框，其余消费该 token 的面未逐一枚举）。composer liquid 三点：实端 fillVar 100% 且 `::before` 计算色无 alpha 分量、透明端 15% 地板 + 厚度 0px、frosted 恒等 40%；所有写入随后还原。
- **写入基线（#84 之后，离线可复现、双门锁定）**：一次皮肤切换（既有用户）的**同步窗口** {publish 2、层内槽位 14、`documentElement.style.setProperty` 6、`localStorage.setItem` 13}，**定态窗口**（+2500ms，与 +500ms 逐项相等）{publish 3、槽位 21、6、13}；全新安装的定态窗口 `setItem` 为 17（引导探测仍在落盘）。三个量**分别计量、各有上限**（同步 4 / 8 / 15，且单键重写上限 2；定态 5 / 8 / 22），任一处放大即翻红。两处反向变异——去掉 `saveFactorySnapshot()` 的批内延迟、去掉使延迟生效的批作用域——都把 `setItem` 与单键重写数推回 **19 / 7**：即评审报的「5 → 19」那个 19，也是 #84 要消灭的形状（`saveFactorySnapshot()` 序列化整张 provenance 表，却按被播种的键各调一次）。`publish` 与层内槽位之比在同步与定态两个窗口恒定（离线 7 枚/层、真机 37 枚/层——离线宿主题桩不供 token，故门只钉**比值**不钉枚数）；判据与失败文案在 `tests/client.smoke.test.cjs` 的 #84 块，预算常量名 `WRITE_BUDGET`。**仍未做**：#84 之后未再上真机复测这三个计数（真机口径仍是上一条 v10.5.1），因此「`setItem` 真机 19 → 13」「单键重写真机 7 → 1」目前只有离线证据。
- **实机复核（v10.6.0，本机 dsh `0.2.0-rc.1`，2026-10-06，内置浏览器机读、非像素目视，全程只读）**：PR #65 三条 dockkit 规则都在注入表内且**真命中活元素**（`[data-sidebar-right-panel] [data-dockkit-host=dock] > section` 命中 1；水洗+全屏规则命中 1；`:not(terminal)` hover 命中 2 = `files` / `dsh-context`，`terminal` 被正确排除）；右栏当时就是 `fullscreen` 且水洗在，dock 面板计算底色 = `rgb(18, 16, 26)` **完全不透明**（"全屏透出对话"被修掉），该面继承到的 `--dsh-dream-skin-composer-base` 为 `#12101a`，与水洗标记同处发布、无取不到基色的窗口期；10.5.1 通路同时可见（`--dsw-alias-bg-layer-2 = rgba(30, 27, 44, 0.5)` 随滑杆、composer fillVar 40%）；样式注入仍幂等（material ×1、nav-icon ×1），本插件只发那条预期漂移警告，页面其余报错逐条归属其它插件（含 `/smooth-stream/settings.read` 405）。**未做**：非全屏（`push`）态切换（会改用户面板布局）、真 `:hover` 触发（JS 无法强制伪类）、`dsh-better-sidebar` 语境观感（本机未装，仍以贡献者实测为准）。

**未验证 / 无法承诺**：
- **npm 正式包的安装期闸门路径**：本机是 `link:` 工作区安装，`dsh plugin add` 的判定入口在 `dsh-plugin-manager`（与 boot 期 `dsh-app-boot` 不是同一处调用点）。**这一条已在 2026-09-29 实机跑到**（见上"已验证"清单最后一条），但它带出一个新的、与兼容窗口无关的失败模式：pnpm 11 的 `minimumReleaseAge`（新版本冷静期）会把不带版本号的 `add`/`update` **静默解析成上一个成熟版本**，于是"发版后 24 小时内的全新安装"必然装到旧包、再被宿主的 peer 闸门拒——错误信息长得像"插件不兼容"，实际是没装上最新兼容版。规避方式已在 README 写明（显式写版本号）。
- 官方桌面版（`0.2.0-rc.2`）**运行期**是否真的挂载本插件：本机只装到 `0.2.0-rc.1`，验证止于"安装期放行 + `--dump-config` 里出现 `- id: dream-skin` 条目"，**没有**在 rc.2 桌面壳里读到 `__DSH_DREAM_SKIN_STATUS__`。
- 「渐变档不显示填充方式控件」是 JSX 条件渲染（`kind !== "gradient"`），本套假 DOM 不建树、**离线门覆盖不到**——v9.29.0 已实机点视确认，但回归保护仍缺一条（同「无头渲染 React 树」这一既有欠账）。
- **卡片是槽宿主、第三方可注入（10.5.0，T5 记录风险）**：提问卡与审批卡都是宿主槽的宿主节点，槽目录把 `conversation.approval.detail` 明列为第三方注入口（`dsh-client-ui-approval/lib/client.js` 渲染它）。本插件的 `backdrop-filter` 会把注入内容里**新出现的 `position:fixed` 面**重新锚定（composer 那个 bug 的失效模式）；"卡片内只会出现 Button/MarkdownText"这类断言已被证伪，不能再当包含性证明。本机无占用该槽的插件、后果未复现——风险按代码注释记录，出现真实占用槽的插件后应第一步复现。
- 官方 Desktop 预览版的像素级真机效果（假 DOM 测试无法替代，需装官方包逐项截图核对）；
- `docs/screenshots/` 两张截图仍是旧出厂壁纸时期的真机图（已移出 npm 包，仓库内待真机重截为新壁纸版本，不用合成图冒充）；
- 渐变规范化的**浏览器解析行为**（round-2 R-1 尾巴）：字符串层已与 CSS 解码语义对齐（换行转义删除、双控门），但「标识符中插入字面换行时浏览器是否真的发起请求」仍未经真机确认——修复方向是过严（只会多拦不会放行），对合法渐变零影响；非 Chromium 引擎行为同样不在承诺范围（官方桌面与 DSH Web 均为 Electron/Chromium）；
- 漂移探针的**终局时效性**：判定在约 4.3s 定型，late-correction 观察者只做单向撤回、有唤醒上限（25 次）且随页面安静而解除——它防的是"永久误报"，不是实时视图；消费方请始终对照 `checkedAt`。**三个未验证边界**：① 若窗口外晚挂载之后页面**再无任何 DOM 变更**，观察者不会被唤醒，该条 `drifted` 会停留到下次变更或下次 `apply()`（这是案 2 的固有边界，不是零误报保证）；② 真机上"面板挂载 → 观察者唤醒 → 快照撤回"的完整链路未经 DSH 实测，回归门里由 `MutationObserver` 桩手工唤醒；③ round-4 T-1 的"阶梯定时器已开跑、却在同一 tick 被卸载"这一竞态，用例是靠**手动补跑那一步**来钉住"发布必须为零"，真机上 Electron/React 的定时器任务与卸载任务的真实交错顺序未经 DSH 实测；
- 玻璃材质类名在任意未来构建上的命中率（漂移探针只能报告失效，不能预防）；
- 状态文件无 schema 版本字段——旧版格式升级兼容靠宽容读取（`lib/index.js` 之 `readState()`），未做前向演练。
- **会话字号极值：两条分开记，各零次实测（issue #93，记录日期 2026-10-06）**。宿主 `0.2.0-rc.2`（`latest`）起步进器区间由 `12–17 px` 放宽为 `10–22 px`（默认仍 14 px），**新装用户已经在用新区间**，而我们一次采样都没有——本机实装是 rc.1（12–17），且为了这条验证去升级实装属禁止操作。分列：
  - **下界 10 px：0 次实测。** 这是更严格的一端——字号越小时同一对墨色/底色的可读要求越高，而我们的对比度门**不接受字号入参**，所以它没有能力在下界上判负。已知会跟着动的是用户气泡（`--dsw-specific-bubble`）与 composer 草稿；按宿主公式，次级档在此处是 **9 px**（`setting −1 at ≤14`）。已知**不**跟着动的是宿主声明的「small text and code keep fixed sizes」，即小字 / 代码档，含代码块上的三级墨色——这一半的结论不受下界影响。
  - **上界 22 px：0 次实测。** 要求随字号放宽，风险方向不同（不是"读不出来"，而是 22 px 下气泡 / 覆盖层的视觉权重与盒子留白是否仍然合理）。按同一公式，次级档在此处是 **20 px**。`grep` 只能证明我们没有硬编码高度，**不能**证明观感可接受。
  - 口径收窄后的完整表述是「**在宿主字号 10–22 区间内的默认值 14 px 下实测，极值未测**」。我们这侧不写宿主字号（`lib/client.js` 里 `--dsh-content-font*` 0 次、`fontSize` 19 处全在 10–14 px 的本插件 UI 常量内），所以这条改变的是**要求**，不是我们**测出的数**。
  - **门只守三件事**（`tests/desktop.fontscale.test.cjs`）：这段披露不被删、区间不与宿主包矛盾、我们没有偷偷去驱动宿主阶梯；**极值本身的实测仍靠人工补，门不代替观测**。要补的采样口径与"若下界 + 最浅端确实读不出来则另立 issue、不在此顺手改代码"的边界，见上节「会话字号区间：我们只测过 14 px」。

**卸载残留**：`$DSH_HOME/dream-skin.json` 保留（用户数据，插件不主动删除），其余状态在浏览器侧可被官方"一键还原"清除；浏览器侧的定时器与观察者在 fiber 卸载时全部撤除（材质 `<style>`、晚修正观察者、漂移阶梯定时器——round-4 起三者同归 `teardownMaterial()` 处置；设置导航钩子的 body 观察者 / 行标记 / 图标表自 10.5.0 起经 `disposeNavHook` 同链拆除，同页重挂时 `apply()` 自动复臂——generation 令牌保证迟到的旧代 dispose 不会误杀接棒的新代）。

## 对官方的三条兼容契约建议

若官方桌面版/插件体系愿意提供以下任一稳定面，本插件承诺第一时间从哈希类名迁移到契约：

1. 语义 data 属性（如 `data-dsh-sidebar-surface`）替代构建哈希类名——消灭上表第一行全部风险；
2. `--dsw-*` token 名单进入官方 CHANGELOG 的"公开契约"节（本仓库 `themes-spec.md` 可作为初稿素材）；
3. loader 工厂异常隔离（宿主侧 try/catch 每个插件工厂）——目前由插件单方面保证不抛错，宿主加一道门对所有第三方插件都好。
