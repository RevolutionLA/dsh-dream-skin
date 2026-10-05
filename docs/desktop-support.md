# 桌面端兼容与支持矩阵（Desktop Support Matrix）

> 本文面向评估者（含官方团队）：说清楚 dsh-dream-skin 在哪些宿主上能跑、
> **靠什么机制跑**、**依赖宿主的哪些锚点**、宿主升级时会发生什么、以及
> 哪些结论已验证、哪些尚未。所有论断附代码位置（v9.26.1 起引用**符号名**而非行号——行号随补丁必然位移，符号名可 `grep` 直达）。

最后更新：2026-10-05（v10.5.0 可读性与幂等轮 + 对抗评审整改：三张卡片去哈希、`anchors.notMounted` 分栏、导航钩子生命周期）

## 支持状态总览

| 宿主 | 状态 | 依据 |
|------|------|------|
| DSH Web（`0.1.0-rc.6` ~ `0.1.x`） | ✅ 支持，回归测试覆盖 | 双代 seed 探测（`lib/client.js` 顶部 `seedProbe` / `requireSeed` 块），回归门 159/159（Node 18/20/22/24） |
| DSH Web（`0.2.0-rc.1` ~ `0.2.x`） | ✅ 支持：peer 闸门已放宽并离线钉死，本机 `0.2.0-rc.1` 实机复核已过（挂载 + 设置项 + 填充方式三档） | issue #62：0.2.0-rc.1 起宿主 boot 阶段校验 `@deepseek-ai/dsh*` peer 范围，不满足即整包跳过；本版 peer 收敛为 `>=0.1.0-rc.6 <0.3.0-0`，判定表由宿主真实 `evaluatePluginCompatibility()` 生成（`tests/package.host_compat.test.cjs` / `tests/fixtures/host_compat_verdicts.json`）；实机复核方法与"进程未重启"的口径限制见上「宿主 peer 兼容闸门」一节最后一条 |
| 第三方 DSH Desktop 壳（Electron，动态端口） | ✅ 支持，含桌面专属修复 | issue #50/#51/#55（v9.14.1 / 9.15.2 / 9.16.0），动态端口重启用例（`tests/client.persistence.test.cjs` 之 "blue-team B1" / "T-02" 系列） |
| **官方 DSH Desktop**（`0.2.0-rc.2`，2026-09-29 用户实机安装受阻后排查） | 🟡 peer 判定已离线+产品路径证实放行；**运行期挂载未验** | 用户侧报错的真实原因是 pnpm 冷静期把 `@latest` 静默退回 9.27.1（旧 peer 范围不含 0.2.x）而非桌面壳不兼容；显式写版本号即可装上 9.29.0，复现与对照实验见「已验证」清单最后一条。本机仅装到 `0.2.0-rc.1`，rc.2 桌面壳里插件是否真挂载、像素效果如何，均未在本机验证 |
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
- 逃生阀在宿主侧：`dsh plugin allow-version` 写的是 `name@version → [运行时版本]` 豁免表，属用户显式覆盖，我们不依赖它。
- **本机 `0.2.0-rc.1` 复核（v9.29.0）**：在同一台机器上直接调用宿主自身的 `loadProfileDirectory()`（读真实 profile、真实 `compatibility.json`、真实运行时版本）→ 19 个 bundle 全部载入、`skippedBundles` 为空、合成入口表确有 dream-skin 条目。关键在于**这份放行不可能是豁免带来的**：本机豁免表的键是精确版本 `dsh-dream-skin@9.27.1`，对 9.29.0 不生效；把同一份清单的 peer 写回 `^0.1.0-rc.6` 再跑宿主函数，立刻得到「6 个 peer 全不落 + `exempted=true`」，即修复前本机是靠显式豁免才挂着。**口径限制**：DSH 进程未重启，boot 期那一次调用是由同版本宿主代码在同机复现的，不是重启后的第二次观测（重启后走的是同一个函数）。浏览器半边则是在运行中的进程里直接读到的：`window.__DSH_DREAM_SKIN_STATUS__` 为 `build:"9.29.0"` / `status:"ready"`，漂移探针 `probed:6 / drifted` 四条与 `0.1.7-rc.2` 上记录的同一组选择器，console 仅一次 warn——**换代没有引入新的锚点损伤**。

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
    probed: 6,                  // 探针**组数**（非 DOM 元素数）：Web 6 组宿主哈希
                                // 锚；桌面壳下 7（+1 第三方壳侧边栏面）。
                                // 每组的逗号兜底成员数不等于计数（C-8）
    drifted: [],                // 元素恒为**合法原始选择器**（机读面不带装饰文案）
    notMounted: [],             // 10.5.0 起：宿主自己的 CSS 仍持有、只是对应面
                                // 当前未挂载（面板未开等）的组——与真漂移分栏。
                                // 分类器只读宿主发布的 style[data-plugin-css]
                                // 表；该表不可见时（<link> 形态 / 查不到）回落
                                // 为旧语义：全部 missing 组进 drifted（边界见下）
    pending: true               // 三态核心：true = "尚未可判定"（UI 未挂载完 /
                                // 宿主活跃度未被证明 / 阶梯未走完），消费方应
                                // 按"未检查"处理；false = 终局判定
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
| 玻璃材质类名（`.uV2eYG_*` 等 13 组，材质样式表见 `lib/client.js` 之 `ensureMaterialStyle()`，样式节点 id 常量 `MATERIAL_CSS_SOURCE`） | 构建哈希类名 | 仅玻璃精修**静默失效**（外观损失，功能无损） | 漂移探针 `warnOnMaterialSelectorDrift()`（v9.27.0 三态判定）+ 机读快照（`MATERIAL_SELECTOR_PROBES`）；规则本身选择器组冗余。**层叠位次不是承诺**：实机（宿主 `0.2.0-rc.1`）我方材质表在 `document.head.children` 的 index 131 / 共 217，其后仍跟着 85 个节点（多数是 `<style>`）——宿主在插件挂载之后持续注入样式。"把表移回末尾"（B9/M14）恢复的是**重挂那一刻**的末位，精修能站住靠的是特异度（`html[data-dsh-material=…]` 前缀 + 属性选择器），不是位置。10.5.0 起 missing 组按宿主归属分栏（`notMounted` / `drifted`）：本机 6 组现状——`uV2eYG` / `hHd-Xa` 命中；`bqrRRG` / `nArs4W` / `qDHVXG` 三组在宿主安装物与页面运行时样式里 **0 命中**（本代宿主上当前无载体，换稳定锚点属 Roadmap A 既定范围）；`lXshSW_*` 组宿主 CSS 仍在、面未挂载 |
| composer 输入框（`COMPOSER_ANCHOR_SELECTOR`：`data-composer-input` 主锚 + textarea/contenteditable 三级兜底） | Lexical DOM 形态 | 输入框透明度滑杆失效 | issue #50 三轮修复后改为稳定指纹优先 |
| `--dsw-alias-*` / `--dsw-specific-*` token 名（如 `--dsw-specific-sidebar-fill`） | 官方 token 契约 | 对应通道不上色 | token 契约已文档化（[themes-spec.md](./themes-spec.md)），这也是**建议官方承诺稳定的接口面** |
| 设置插槽 `settings.section` / `settings.dreamSkin.item`（`lib/client.js` 之 `SETTINGS_NS` / `renderSlot` 注册处） | 官方插槽名 | 设置 UI 不出现，皮肤仍生效 | 属公开插件 API；跟随官方命名 |
| 第三方壳类 `.dshDesktopSidebarSurface`（`lib/client.js` 之 `DESKTOP_SIDEBAR_SELECTOR`） | **非官方壳的类名** | 桌面侧边栏透明度不一致（issue #55 原型） | 桌面规则纳入漂移探针（`isDesktopShell()` 门控）；官方桌面版若提供语义属性可即刻切换契约 |
| `[role="dialog"]` 等 ARIA 契约（`COMPOSER_ANCHOR_SELECTOR` 兜底与 `isInDialog` 判定时使用） | 无障碍标准 | 理论不存在失效 | ARIA 是规范而非宿主私有物 |
| 设置导航图标（`lib/client.js` 尾部 IIFE：在 `[role="dialog"] nav button` 里匹配**我们自己注册的 section label**（`Theme / 外观`）里的 `Theme`，再打 `data-dsh-dream-skin-nav` 标记。10.5.0 实机后收紧：早先还匹配裸「皮肤」，而真机上那一行属于第三方插件 `web-ui-skin-center`——等于把别人的导航图标涂掉并隐藏其原 svg（越界装饰，非崩溃）。代价如实写明：宿主若把我们那一行渲染成不含 "Theme" 的字样，图标退回齿轮） | ARIA 结构 + **人类可读文案** | 图标退回默认齿轮（纯装饰损失，功能无损） | 比 CSS 哈希类名稳，但改文案或换语种即失配；10.5.0 起自检上报 `navIcon{dialogs,buttons,marked,armed}`：`armed=true && marked=0` 只说明面板没开，`armed=false && sheets<=1` 才可以说"这个构建没钩上"。漂移探针**不覆盖**这一条（探针只管材质精修）；10.5.0 起钩子有完整生命周期——fiber 卸载拆除（观察者 / 行标记 / 图标表三样）、同页重挂复臂，generation 令牌防旧代误杀新代，控制柄 `arm(gen)` / `dispose(gen)` 不可枚举 |

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

**已自动化验证**（`npm test`，159 用例，Node 18/20/22/24 CI；修复类用例经**变异验证**——逐条反向破坏对应修复，10.5.0 轮 26 处（M1 计划卡锚点改回哈希类名 `.LVzXQa_card`、M2 填充选择器列表里重新混入一处哈希类名、M3 审批卡戳记改名使填充不再覆盖它、M4 液面描边把计划卡换成审批卡、M5 alpha 混合改画在半透明 `--dsw-alias-bg-base` 上、M6 不透明基色换了变量键名（等于不再发布）、M7 导航表查找去掉 `style#` 限定、M8 `arm()` 不再读页面级 `armed`（bundle 重跑即叠出第二个观察者）、M9 `<body>` 尚未解析时照样宣称接管、M10 材质表收养不再限定 STYLE 节点、M11 拆掉 rAF 之外的 120ms 兜底、M12 卸载时额外按 id 移除（连带删掉冒用我们 id 的外来节点）、M13 无 `color-mix()` 的兜底退回半透明 overlay、M14 收养后不再把材质表移回 `<head>` 末尾、M15 漂移告警不再声明"卡片填充不在探针覆盖内"、M16 导航图标匹配式退回「含裸 `皮肤`」分支（那一行在实机属第三方插件 `web-ui-skin-center`；实测翻红的是行级负向控制「the third-party 皮肤 row is not marked」）、对抗评审整改批 M17–M26（M17 审批卡戳选择器收窄成 `:nth-child(2)`——旧的字符串包含式 pin 对同一变异全员常绿、M18 导航表计数恒值 1、M19 匹配式退回子串 `Theme`、M20 分类器短路成全部 drifted、M21 分类器丢掉 `style[data-plugin-css]` 限定、M22 卸载不拆钩子、M23 apply 不复臂、M24 dispose 丢 generation 门、M25 钩子不持有 sheet 句柄、M26 同步门拆除））在隔离副本树逐条打印翻红断言后才写记录；v9.29.0 轮另 15 处（渲染写死 cover、溢出层改 append、渐变档守卫拆除、写入门白名单拆除、渲染门白名单拆除、离开模糊档不断开溢出层、溢出层少 48px、store 漏传 fit、手动应用戳写在渲染之后、手动应用完全不落戳、渲染只在定时开启时 bust、teardown 漏掉溢出层、FACTORY_DEFAULTS 丢该键、SENTINEL_KEYS 丢该键、空链接误点门恢复成修复前的分支）在隔离副本树逐条打印翻红断言后才写记录（M15 的第一次注入把恢复的分支落在 `return` 之后、等价于没改，却打红了「不安全链接被拒」那条——顺藤查到那次注入其实改写了 `wallpaper-kind`，归因不清的翻红不算验证，重写后才精确命中 1 条）；9.27.0 轮含四轮复核整改共 **27 处变异**——第一轮 10 处（A-1 两道门控、A-2.1 规范化旁路、A-2.2 告警静音、B-3 单边加字段、B-4 标志移除、B-6 出口不播种，及 9.26.1 沿用 3 处）、第二轮 7 处（R-1a 换行插回、R-1b 拆除规范化后控制字符门、R-1c 整体退回修复前状态、R-2 解除晚修正观察者、R-4 间隔改绝对、R-5 封顶回退为永久静默、R-6 受控例外分支翻转）、第三轮 6 处（R-4b 数组按"绝对时刻"解释而字面量不变、S-3a 卸载不再断开观察者、S-3b 回调丢掉 `disposed` 门、S-3c 新链不取代旧链，以及文本卫生两处：往 `CHANGELOG.md` 注入控制字节 / 往 `README.md` 注入孤立 CR）、第四轮 4 处（T-1a 拆掉阶梯定时器的取消动作、T-1b 拆掉 `ladderClosed` 门槛、T-1c 整体退回修复前状态即卸载不再处置阶梯、T-1d 新链不取代旧链）全部有用例翻红。本轮把与归因陈述有关的 **6 次既有变异**（R-1a/R-1b/R-1c/R-2/R-5/规范化旁路）连同第三轮新增 6 次，在**隔离副本树**里重跑（变异只作用于副本，绝不触碰工作文件）并**逐条打印翻红断言原文**后才写进记录；其余 11 次沿用上一轮实测，第三轮未重跑；第四轮新增 4 次同样在隔离副本树里实测并打印翻红断言原文，**第四轮未重跑前三轮的 23 次**。此外另做四件**反身检查**（第三轮 3 件 + 第四轮 1 件）：① 把上一轮"归因陈述"（哪条变异由哪条断言抓出）逐条重跑，据此更正了 R-1a 与 R-4 两处记录（见上守卫一节与 CHANGELOG）；② 评审方建议的"已挂判据"（`terminalDrift !== null`）单独反证过一次——采用它会让 3 条用例翻红，等于把 R-2 的修复整个关掉，故改用模块级单一持有句柄；③ 故意保留一次"变异不翻红"作为证据——拆掉 `resample()` 里 `terminalDrift === null` 判空后用例全绿，这一次**绿证明的是代码是死的**（该分支永不可达），据此删除死分支而不是给用例补断言，不虚报为"变异已覆盖"；④ 第四轮补一次**门槛位置的形状实验**（T-1e，不计入破坏数）——把 `ladderClosed` 从 `step()` 入口按评审方建议的形状挪进 `runRound()`，实测唯一翻红的是 `and the slipped step arms NOTHING further — the chain died with the fiber`，"什么都不发布"那条照样绿：两种写法都不发布，只有"是否还挂后续轮次"能分辨门放对了没有）：
- 双代宿主 seed 探测与全量降级（哑模块路径 + degraded 全 schema 快照）；
- 动态端口重启 + 清壁纸后无出厂壁纸闪现；
- 漂移探针三态（v9.27.0，A-1 验收四情形）：空 DOM 恒 `pending`（阶梯走完也不判漂移）、全命中收敛为 `drifted: [] && pending: false`、单组缺失在活跃度证明后的终局点名**恰好那一组**、晚挂载面凭命中记忆自我撤回；10.5.0 增补 `notMounted` 分栏——宿主 CSS 仍持有的未挂载组不混入 `drifted`（且该轮不告警）、晚挂载后经同一观察者从 `notMounted` 撤回（分类器短路 / 丢 `style[data-plugin-css]` 限定 / 双池撤回各有用例或变异钉，M20/M21）；**阶梯窗口外**晚挂载的面由 late-correction 观察者单向撤回（round-2 R-2，含"撤回不再告警"断言）；桌面壳两态（`probed=7`、`drifted` 只含合法原始选择器、人类标签只在 console 行）；中途轮次即使活跃度已证明也**不得**提前终局（变异 `conclusive = liveness` 由该断言翻红）；**阶梯数组按"相对间隔"解释**这一语义有独立行为钉（round-3 自查补，`drift probe (R-4)`：3×400ms 间隔下 ~700ms 必须仍 `pending`、终态才点名漂移，按"绝对时刻"解释会提前终局 → 中间态断言翻红）；晚修正观察者的**卸载断开**与**至多一个存活实例**（round-3 S-3）各一条用例，并断言卸载后快照**冻结**（既不改好也不变坏）；**阶梯定时器在卸载时被取消**、**已跑出队列的那一步补跑后快照连对象引用都不换**、**重新 `apply()` 取代旧链而非叠出第二条阶梯**（round-4 T-1 三条用例；"取消"与"门槛"分置两用例，避免先失败者遮蔽后一位）；
- ready/applying/degraded 三种快照逐键同构（B-3 schema 守卫，单边加字段即翻红）；
- 宿主 API 的类型围栏 / 方法围栏 / 体积围栏 / 超大体不泄漏栈；
- URL 与渐变壁纸的注入拒绝（写入 + 渲染 + **宿主采纳**三道；CSS 转义/注释走私 14 个向量（含 `\a`/`\A`/`\a\a`/`\2\0`/`\d`/`\c` 与「反斜杠 + 真实 CR/FF」的字面续行）在写入门翻红，另有 2 条**反过度拒绝**断言（`\28`、`,\a\a ` 合法值必须照常采纳。**归因经 round-3 反向检查更正**：两条各钉一半、不可互换——`,\a\a `（诚实值 B）才是唯一能区分「删除语义」与「插回」的那条，`\28`（诚实值 A）在两种实现下都通过，它钉的是"规范化是否被应用"（由规范化旁路变异抓到）；两条已拆为独立用例 `gradient guard (R-1/S-1)` 以免先失败者遮蔽后一位），渲染拒绝带可见告警，`-webkit-` 策略拒绝单独钉死）；
- 出厂壁纸迁移：负向路径（同长度走私 / 同字节数空白载荷 / 同三元组差一哈希 / 当前出厂图幂等）与**正向路径**；**v9.27.1 起 entry 2 改走真实资产反算**——`tests/fixtures/legacy_factory_raster_9_27_0.txt` 保存 v9.27.0 标签实际随包的那张位图串，测试用独立实现重算三重指纹再与源码字面量比对。此前所有正向用例都在 patched 副本里把三元组改写成合成载荷自己的值，**常量数值没有任何检查能翻红**（自证式探针），首版手写的 entry 2 哈希因此错了也无人报，真机上迁移静默不生效——发版前实机自查发现并改正；entry 1 的照片字节仍不进仓库，只有字面量钉子 + 合成载荷算法用例，其数值由本轮对 git 标签（v9.14.2…v9.16.0、v9.23.0）与本机历史串复算核对一致；迁移 × 宿主采纳的双向语义（宿主"已清空"不被工厂写复活；宿主持有旧图的会话迁移后以用户态推送、host 文件收敛，含"同 origin 重启、本地与宿主两侧都仍是旧图"的真实形态用例）；真机复核（`dsh@0.1.7-rc.2`，9.27.1）：宿主 `dream-skin.json`、localStorage、DOM 壁纸层三处均收敛为矢量图，用户既有的 opacity/模糊/皮肤未被迁移改动；受控例外（B-5）由源码正则钉子守卫，注释删除即翻红；
- 宿主 `ok: false` 拒绝出口与网络失败出口同语义播种（B-6），且不产生任何回写；
- 诊断快照跟随宿主采纳刷新，重发布经 prev-merge 保住探针结果。
- **安装期闸门实机复现与规避（2026-09-29，本机 dsh `0.2.0-rc.1`，pnpm 11.6.0）**：宿主自身的 `evaluatePluginCompatibility()` 在 rc.2 代码上对 9.27.1 判**拒**（5 个 peer 不落）、对 9.29.0 判**放行**——与本插件无关，纯粹是 peer 范围。产品路径复现：`dsh plugin --profile <p> add dsh-dream-skin`（不带版本号）→ pnpm 输出 `+ dsh-dream-skin ^9.27.1`（旁注 `(9.29.0 is available)`）→ 宿主 `dsh: installation rejected: Plugin dsh-dream-skin@9.27.1 is incompatible with dsh …` → `dsh: restored package.json, pnpm-lock.yaml, and node_modules.`。`dsh plugin --profile <p> add dsh-dream-skin@9.29.0`（显式版本）→ pnpm 自动把该版本写进 profile 的 `pnpm-workspace.yaml` 之 `minimumReleaseAgeExclude` → `+ dsh-dream-skin 9.29.0`，`package.json` 记 `"dsh-dream-skin": "9.29.0"`，`dsh --profile <p> --dump-config` 出现 `- id: dream-skin` 条目。对照实验：`--config.minimumReleaseAge=0` 同样放行（备选手段）；把 `.npmrc` 里写 `minimum-release-age=0` **无效**（仍装旧版），即只有 CLI 形态被证实；`pnpm config get minimumReleaseAge` 返回 `undefined` 也拦不住默认行为，所以"我没配过这个策略"不是排除理由。
- **实机复核（v9.29.0，本机 dsh `0.2.0-rc.1`，走访客同款通道=内置浏览器 `evaluate_script` 读计算样式/DOM 树序/`aria-pressed`）**：宿主 profile 载入 19/19 不跳过、入口含本插件；`__DSH_DREAM_SKIN_STATUS__` = `9.29.0` / `ready`；皮肤 / 强调色 / 壁纸三档 / 填充方式 / 应用链接 / 清除壁纸 设置行齐全；填充方式点选后 `background-size` 与落库值同步变化，`模糊填充` 溢出层确实排在图片层**之前**（`body` 子节点 index 0）且 `filter` 为 `blur(51px)`（用户 3px + 48px），切回 `裁剪填满` 后溢出层摘除；选中「渐变」时整行填充方式消失、切回「本地图片」又出现。**这是机读复核，不是像素目视**——内置浏览器仍截不到图（`visibilityState=hidden`）。

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

**卸载残留**：`$DSH_HOME/dream-skin.json` 保留（用户数据，插件不主动删除），其余状态在浏览器侧可被官方"一键还原"清除；浏览器侧的定时器与观察者在 fiber 卸载时全部撤除（材质 `<style>`、晚修正观察者、漂移阶梯定时器——round-4 起三者同归 `teardownMaterial()` 处置；设置导航钩子的 body 观察者 / 行标记 / 图标表自 10.5.0 起经 `disposeNavHook` 同链拆除，同页重挂时 `apply()` 自动复臂——generation 令牌保证迟到的旧代 dispose 不会误杀接棒的新代）。

## 对官方的三条兼容契约建议

若官方桌面版/插件体系愿意提供以下任一稳定面，本插件承诺第一时间从哈希类名迁移到契约：

1. 语义 data 属性（如 `data-dsh-sidebar-surface`）替代构建哈希类名——消灭上表第一行全部风险；
2. `--dsw-*` token 名单进入官方 CHANGELOG 的"公开契约"节（本仓库 `themes-spec.md` 可作为初稿素材）；
3. loader 工厂异常隔离（宿主侧 try/catch 每个插件工厂）——目前由插件单方面保证不抛错，宿主加一道门对所有第三方插件都好。
