# 桌面端兼容与支持矩阵（Desktop Support Matrix）

> 本文面向评估者（含官方团队）：说清楚 dsh-dream-skin 在哪些宿主上能跑、
> **靠什么机制跑**、**依赖宿主的哪些锚点**、宿主升级时会发生什么、以及
> 哪些结论已验证、哪些尚未。所有论断附代码位置（v9.26.1 起引用**符号名**而非行号——行号随补丁必然位移，符号名可 `grep` 直达）。

最后更新：2026-10-22（**10.22.0：低功耗模式把菜单变成「保鲜膜」，本版给菜单底色加下限（#115 / #116，@aurora-zl）**——10.21.1 清掉了磨砂却没动 `--dsw-menu-surface-fill` 的 0.46，菜单因此比正常时更透；本版只在低功耗开着时发 `max(滑杆, 0.92)` 覆盖并保留皮肤色相，关掉一行不发、拨开关当帧重发。新增 1 条用例 + 1 次反向破坏（门控改成 `if (false)` ⇒ 红），套件 568→**569**。上一版 **10.21.2：壁纸轮换（#113，@lisihao）**——一次最多 20 条图片链接，5 分钟到 7 天、顺序或随机；与 URL 刷新共用同一个 60 秒 tick 与可见性监听，一次唤醒最多一次拉取；每条链接每次读取都逐条过安全门，提交前预加载，死链保留当前壁纸；新键只增不改、无游标字段；默认关闭，隐藏页不切换、回前台补上。新增 18 条用例（smoke 16 / storage 2），PR 内附 44 次反向破坏与实机读数（`docs/evidence/wallpaper-rotation/`）。套件 550→**568**。上一版 **10.21.1：issue #110 的 GPU 报告有了一个可测的开关**——低功耗模式关掉全部 `backdrop-filter`、壁纸模糊与 `fit=blur` 的 bleed 层，默认关闭、外观不变；本机 Windows 复现不了 M4，所以**不把开关当成已证实的修复**，它是给报告人做 A/B 的测量工具。新增 1 条用例（默认两根模糊层都在 / 打开后只剩一层且 `filter:none` / 材质表确有该选择器 / 设置动作让存储、属性、渲染同帧翻转），两次反向破坏各自翻红，夹具补上 `documentElement` 与真实属性记录（此前 `setAttribute` 是空实现）。套件 549→**550**。上一版 **10.21.0：10.20.0 的降级链在真 cordis 上每个请求都抛错，本版改回 `ctx.get()`**——宿主 cordis 只允许按属性读 `inject` 里的服务，其余抛 `cannot get property "…" without inject`；而 `webStartup` / `webRuntime` 恰恰不能进 `inject`（#109 的病根），所以必须走 `ctx.get()`。10.20.0 用了属性访问：插件挂载成功，但每次持久化请求都抛错落成 500。**545 条用例没抓到，因为 `makeHarness()` 当时返回普通对象**——假世界里没有"注入规则"这条法律。本版把 harness 改成 **Proxy** 复刻三条规则（退回属性访问 → `host.persistence` **12 条翻红**，恢复后 18/18 绿），并新增 `tests/host.cordis.test.cjs` 把插件挂进**宿主自己的 cordis**（4 条；退回属性访问 → **3 条翻红**，见证规则那条保持绿；无宿主机器具名跳过）。**PR #111（@v2yy）的 `ctx.get()` 写法从一开始就是对的**，本版按他的方案改正；10.20.0 已发布且带此缺陷，npm 不可变，这里照实记录。套件 545→**549**。上一版 **10.20.0：DSH 0.2.1-rc.2 移除 `webRuntime` 服务导致宿主半边永久 pending，本版把它变成运行时降级链**——`lib/index.js` 的 `inject` 从 `["webServer", "webRuntime"]` 改成只依赖 `["webServer"]`，信任列表改为运行时动态获取：优先 `webStartup.trustedHosts`（DSH ≥ 0.2.1），回退 `webRuntime.trustedHosts`（DSH ≤ 0.2.0），两者皆无时返回空数组；环回地址仍由 `isTrustedApiRequest()` 的 `isLoopbackHostname` 守卫保护。新增 4 条测试用例验证降级链行为。套件 532→**545**。上一版 **10.16.0：对方收回了体积报告，本版收掉它留下的那句"扫描器证明不了有限调用集"**——DSH STORE #1411 的追评（2026-10-15）承认旧扫描器把单文件上限与总量上限混为一谈（`467,678 > 2,097,152` 那句自相矛盾一并作废），现行边界 4 MiB/文件、8 MiB/总量、512 源文件，**`lib/client.js`（对方扫描那一份 442,975 字节）无需压缩也无需拆分**（10.14.3 量清楚后拒绝做的事，本轮由对方更正；本版实测 **443,779** 字节，多出的全是注释行——仍不到 4 MiB 的九分之一。追评原文与正文 sha256 存档在 `docs/evidence/dsh-store-1411-followup-2026-10-15.md`，就地更正标注见 `docs/publishing-to-npm.md` §十一）。它仍开着的阻塞项是 `requireSeed()` 里的 `require(name)`，原文 "**the scanner does not prove its finite caller set**"。本版把浏览器半边唯一一条"值进入 `require`"的车道消掉：`requireSeed(load)` 只接受零参 thunk，四枚平台 seed 的说明符全部写成调用点字面量（原来的 `for (const seed of [...])` 换成两条字面量语句，那个循环变量正是车道本身）；**探测顺序、`null` 判据、`seedProbe.lastError` 覆盖次序一字未动**，`tests/client.smoke.test.cjs` 里那三条 seed 用例（#43 稳定版回退、无 seed 降级哑模块、缺 REACT 也降级）在本版**一行未改且仍绿**。新增下方「可审计能力面」一节与 `tests/client.audit_surface.test.cjs`（四把尺 + 运行时观察，9 例）：调用点必须全是字面量、文档表与调用点**同序双向核对**、每枚 seed 必须被 `package.json` 的 `peerDependencies` 覆盖、真启动记录"实际问了哪些模块"与"fetch 去了哪里"。本轮 **15 次反向破坏**（九条腿记为 L1–L9）：A1 整体退回 `require(name)` → L1 L2 L3 L4 红而 **L5 运行时腿绿**（形状与行为看守的是两件事）；B1 调用点传名字 → 同样四条；C1 文档多一行 / C2 文档换顺序 → L3 + L5；D1 去掉 peer 声明 → **只 L4**；E1 `HOST_API` 改带 origin 的绝对 URL → L6 L7，**其余 187 例全绿**（`smoke` 139 / `persistence` 25 / `storage` 16 / `fiber` 7，本机现数；目的地此前无人看守）；G2 `fetch` 的实参换成变量 → L6 L7；G3 URL spec 前面加斜杠（rooted，`.pathname` 仍成立）→ L6 L7（"没有 scheme"这一条运行时观察区分不开，必须核 spec 与宿主的 `API_PREFIX`）；H1 把矩阵里 `WebSocket` 写成"存在" → **只 L8**；H2 代码里冒出矩阵标为"不使用"的 API → **只 L8**；I1 改动存档正文一个字符 / I2 删掉存档指针 / J1 从 `files` 白名单删掉那份存档 → **只 L9**；J2 把说明符写成 `react/../jsx-runtime`（点段） → L1 点名非法模块 ID（另有 L3 L4 L5 L7 附带红；蓝军指出旧写法会让它**通过 peer 前缀规则**，现已由 `MODULE_ID` 拒掉）；G1 把 `require(userInput)` 藏进与代码同行的注释后面 → 五条腿红，**而我方第一版扫描器会整行漏掉**（对抗审查抓出后改成"剥注释段、保留其后代码"）。另 1 次门自守实验 F1 让扫描落空——**peer 腿当时恒绿**（它遍历空集合），补"字面量数==调用点数且 >=4"的自守后 L1 L3 L4 L6 一起转红（本仓库第三次"绿的是门不是代码"，前两次为 9.27.0 的 R-5 与 T-1）。**本轮的 🔴 在文档不在代码**：第一版这节写着"其余开口面只有这些"，漏了 `URL.createObjectURL` + `<a download>`、`navigator.clipboard` / `execCommand`、`FileReader` + `type: "file"` 三条真实页面能力，也没写清"壁纸图片本身就是用户填的 URL"——现在改成逐格核对的**能力矩阵**（L8）。**不承诺 catalog 变绿**：这改动把"有限调用集"从我方不可证变成可枚举且被门守住，对方是否放行仍取决于其审查流程，其追评同时写明未执行我方测试、未跑宿主。套件 532→**541**。上一版 **10.15.0：上一版写下的"那枚通配是承重的"，本版去读了宿主，发现那是推断**——DSH STORE #1411 报告里 `runtime artifact pattern requires review: ./locale/*.json` 这一条，10.14.3 给出的理由是"删掉 exports 里的通配，宿主解析语言文件会抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`"，**那句没被读过、只被推过**。本轮把宿主自己的 `readPluginMeta()`（装在 `@deepseek-ai/dsh@0.2.0-rc.1` 内的 `dsh-app-boot`）直接调起来跑 14 份 manifest + 11 枚文件名探测（25 次宿主调用），判定表落 `tests/fixtures/plugin_meta_readings.json`（生成器 `scripts/gen-plugin-meta-readings.cjs`：本机没装宿主 ⇒ exit 2 并说明"我方镜像不算见证"；跑不出两种失败形状 ⇒ 拒写全绿表）。读数（下表节选）：通配 **`outcome: localized`**（它从来不是坏的）／显式枚举同样 `localized` 且带 icon／**在场一枚 `ja.json` 没导出 ⇒ `error` + `ERR_PACKAGE_PATH_NOT_EXPORTED`，宿主接住错误、我方那一行同时失去标题、描述与图标**／**`en.json` 没导出 ⇒ `manifest-fallback`，不抛，静默退回 manifest 文本**。决定性的一条是：宿主**不猜语言码**——`dictionariesOf()` `readdir` 语言目录后把每个 `.json` 逐个解析，所以显式枚举覆盖的就是它将要请求的全部文件。于是 `exports` 改成 `"./locale/en.json"` + `"./locale/zh.json"`，**用户可见变化为零**（前后宿主返回同一份本地化文本），收益是那条 pattern 告警变成可枚举、且"加语言文件忘加导出"从静默失败变成红门：`tests/package.i18n.test.cjs` 3→6（在场↔导出双向、通配本身也点名、并与那张实测表**逐格比对**、另含"通配与陈旧导出在宿主侧都不改变读数"两条对照腿）。**过程中量出第二条失效车道**：宿主在解析之前先按 `LANGUAGE_ID` 校验文件名，11 枚候选名逐个实测（接受 `ab`/`abcdefgh`/`zh-CN`/`zh-CNA`/`zh-Hans-CN`/`en-US`，拒绝 `a`/`abcdefghi`/`e2`/`zh-CCCCCCCCC`/`zh_CN`），测试里那枚镜像正则由这张表约束（放宽一格即红），不是抄来的字符串；`duplicates locale` 那一支需要 `EN.json` 与 `en.json` 同目录共存，大小写不敏感的文件系统造不出夹具，所以**明确不建模也不假装建模**。同模型不同角色的对抗审查（`BLUE-10150`）又抓出一处 🔴：旧那版门只读 `exports` 的**键名**，评审造出一份枚举齐全却把 `./locale/zh.json` 指向别处的 manifest——**门 6/6 绿、宿主销毁整行**；现在改成**恒等映射**要求（`./locale/<x>.json` → `./locale/<x>.json`），四种坏目标形状、目录伪装与 `./package.json` 导出（图标）各有见证，符号链接那一支**明确记为未建模的洞**。15 条变异腿（M1–M15）逐条实跑后按字节复原，另把评审那六条攻击在临时副本重打一遍（六条全红、控制全绿）。同轮把 10.14.3 写在 README / `docs/publishing-to-npm.md` §十一 / 本文件 / CHANGELOG 里的那句因果**就地标注作废**（原文保留）。套件 528→**532**。上一版 **10.14.3：第三方目录的收录检查撞上了宿主的加载形态**——DSH STORE 的固定 Commit 自动检查（issue #1411）把 `lib/client.js` 442,975 字节标为超出其单文件 262,144 上限，另附"合计字节超限：467,678（上限 2,097,152）"这句**自相矛盾**的报告。先量再动：① 宿主用 combo 请求把所有插件的 client 拼成一个 URL 送进浏览器（`/plugins/??a/client.js,…,dsh-dream-skin/client.js&rev=…`），包内同级路径实测全 404 ⇒ **浏览器半边必须是单文件，"拆成 chunk"在 DSH 里不是选项**；② 同一台机器上 **8 个第三方插件的 client.js 也都超过那条上限**（最大 2,468,635 字节）⇒ 这是审核边界遇上宿主形态，不是我方特例。所以：**不 minify、不剥注释**（那个文件同时是本项目"可读原生 token 源码、无注入"承诺的审计面，仓库几十道门读的就是它的文本），改为把增长变成看得见的决定——新门 `tests/package.runtime_size.test.cjs` 给每个发货 JS 设**声明的天花板**（client 480 KiB / index 40 KiB）并要求"新增发货 .js 没设天花板"也红；**没有**把门写成"必须 < 262,144"，那在我方结构下是永不绿的灯（#98 刚为同一种灯写过撤回理由）。他们报告里唯一可修的通配 `./locale/*.json` **是承重的**：`tests/package.i18n.test.cjs` 记着删掉这个 exports 模式会让宿主抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`，所以保留并走人工审阅。**↑ 这句由 10.15.0 作废，原文保留**：实测里通配在宿主侧 `outcome: localized`、从来不是坏的，会坏的是"新增一枚语言文件没加导出"；本轮据此改成显式枚举 + 双向门，取证四条见本行开头。全过程与判据写在 `docs/publishing-to-npm.md` §十一，答复发在对方 issue 里。套件 524→**528**。上一版 **10.14.2：同日重发，修的是"教读者自己现读"的那条命令**——10.14.1 里它少了 `| tr -d '"'` 一节，而 `grep -o` 打出来的是**带引号的整段匹配**，拿去和状态文件里的裸键比会得到"当前版本 24 枚键一枚都不在这个文件里"这种**形状完全正确的假结论**（命令能跑、输出齐整、数字看着也对）。现在命令补全、**整条按字面量钉进门里**、并新增"只删 `tr -d` 那一节也必须红"的变异腿；两条读法约束的实测数字也写实了：bundle 认识 **24** 枚 / 文件在场 **17 枚设置 + 1 枚保留键** / **8 枚确实不在 durable 层**（`accent`、`appearance`、`builtin-last`、`factory-seeded`、`favorites`、`packs`、`wallpaper-refresh`、`wallpaper-url`），文件反多 1 枚 `material-memory`（来源仍未查明）。**配方 A/D 被当脚本真跑过一遍**（只读、不写用户文件）。套件与上一版同数 **524**。上一版 10.14.1：机读出口做成了四条配方 + 一道能失败的门**——`docs/desktop-support.md` 新增「机读出口」一节（三个来源各自能证明什么 / 键清单以一条 grep 现读而非抄表 / 配方 A 装了吗 · B 生效了吗 · C 换代打回精修了吗 · D 跨重启保得住吗，每条各附"它证明不了什么"）；`tests/docs.machine_readable.test.cjs` 把文档与代码双向核对：表格里的键 = bundle 常量认识的键（含保留键）**且行数相等**、"叫读者去 derive"那条命令在场、四条配方各自点到真字段、文档点名的每枚 `data-dsh-*` 标记都必须在 `lib/client.js` 有引号字面量。**写文档前先量**：真文件里有 **18** 枚键在场、bundle 认识 **24** 枚、**8 枚不在场**（读法：不在场 ≠ 用户没设过，推送只带本次写过的键）；同时文件里多出一枚本仓库从未写过的 `dsh-dream-skin:material-memory`（`git log --all -S` 现查为空、三个 profile 的实装 bundle 也搜不到 ⇒ **来源未查明**，作为现场反例挂在文档里）。生效标记逐个现读：`scheme="dark"` / `wash="1"` / `data-dsh-material="frosted"` / body 上 `--dsw-alias-bg-base = rgba(19, 17, 22, 0.4)` / 我方样式表恰好 2 张；`data-dsh-dream-skin-composer` 同页读到**不在场**，所以它被明确排除在"生效"的必要条件之外。门自己的第一版含一条 `replace("当前 `1`", "当前 `1`")` 的恒真腿——**跑不红的守卫是装饰**，已换成两条真会红的反向腿加一条结构性对照。套件 515→**524**（+9 全在新文件）。上一版 10.14.0：状态文件有了 schema 版本，而"前向兼容"第一次被真的演练**——`$DSH_HOME/dream-skin.json` 是**一个文件被两个可能不同版本的插件共用**的（web profile 与官方桌面壳指向同一个 `DSH_HOME`），所以格式有**我方控制不了的第二个读者**，这决定了形状不是 `{schema, state}` 信封（旧版本会把那个对象 `String()` 成 `[object Object]`）而是**扁平字符串映射 + 一枚保留键** `dsh-dream-skin:schema-version`（值 `"1"`，`lib/index.js` 导出 `STATE_SCHEMA_KEY` / `STATE_SCHEMA_VERSION`；戳**只升不降**，文件上若是更高的 `9` 我方写入后仍是 `9`——盖 `1` 就是对着字节撒谎；这枚键**不出现在 `get` 的回答里**）。演练拿的是**本机那份真文件**（17 键 / 122,777 字节）在临时目录的拷贝上跑、旧半边取 `git show HEAD:lib/index.js` 原样挂载：新半边写出的文件**零嵌套、值全字符串**，旧半边读它**17 条设置一条不少、值一字不改**（只多看见一枚字符串键），旧半边再写回设置照旧不掉、戳原样留着；原文件收尾 sha256 复核未动。**具名的两处不覆盖**：① 删掉加载期校验而版本常量仍合法时**没有任何用例红**（那道校验只守"下一次有人把常量写坏"，由 `M7` 那种形态证明）；② `set` 里原先那行"遇保留键就跳过"的特判**当变异跑什么都不红**（写盘的戳永远从文件重算并盖在展开之后），已删除——一道证明不了自己的守卫就是假门。**真机装载 0 次**：`lib/index.js` 是宿主半边、只在 DSH 启动时被读，本机正在跑的实例仍是改动前那一份（未经同意不重启）。顺带纠正一句**随包发布的失实文档**：`lib/index.js` 头注释一直写 `set` 是"整体替换"，实现一直是**合并**。**Roadmap C 组那条 S 已从 8 份 README 删除**（开放项 9→8）。套件 509→**515**（净 +6 全在 `tests/host.persistence.test.cjs`，8→14），变异 8 条腿逐条实跑并按 sha256 复原；改前那 6 条里有一条**空对空假绿**（比的是 `mod.STATE_SCHEMA_KEY` 与 `raw[undefined]`，两边都 `undefined`），补了"模块必须导出这个键"才转红——反向用例的前置条件不能靠兄弟腿代守。上一版 10.13.1：宿主 rc 预检固化成一条命令 + 一条能红的门**——`npm run host:preflight` 用**宿主自己那份** `evaluatePluginCompatibility()` 跑判定表（本机没装宿主时退回零依赖镜像实现，并把"这次是谁算的"印在第一行；两份都在时逐版本要求一致），`-- --profile-load` 再驱动宿主的 `loadProfileDirectory()` 读 `skippedBundles`（只读那半：宿主文档写明它跳过不兼容包时**不改 manifest**，会写的 `loadProfile()` 本文件永不调用）。今天实跑：31 个已发布宿主版本 / 26 个在窗内 / 按发布时间最新的 `0.2.1-alpha.2` 在窗内 ⇒ exit 0；真实 web profile 载入 **19 层、0 个跳过、我方挂载**。四个出口：0 同意 · 1 最新宿主在窗外或两把尺子打架 · 3 环境不给跑并点名哪一样（**不算通过**）· 4 严格模式下没跑成。**只有"按戳最新"那一个能判红**（窗外那 5 个是 `0.0.1-rc.*` / `0.1.0-rc.2-3` 的历史版本，让它们判红等于把门焊死在红上）；红了只有两条诚实出口：跑表 + 真实载入后抬窗并同轮重生成判定表，或把"不支持"写进 8 份 README 的兼容表。第一版栽过一次：`npm view` 把 `versions` 投影成数组、registry 给的是对象，按对象读会拿到 31 行下标并照样 `exit 0`——现在两种形状都接，并有一条腿要求两种形状逐行同判 + 任何一行不许是裸下标。**Roadmap A 组那条 S 已从 8 份 README 删除**（开放项 10→9），`0.3.x` 那条仍阻塞但它的验收句从此可执行。**没每日排程**：这条门只在有人跑时跑——本版消除的是"忘了怎么查"，不是"忘了查"。上一版 10.13.0（A1 的下半 + 判据搬家——todo 面板与队列坞那两处磨砂不再赌宿主构建哈希（宿主在**两条渠道上**都给这两个元素公布了稳定属性：`data-testid="todo-panel"` 打在 `<base>_root` 那一个元素上、`data-queue-dock` 打在队列坞外层而我们要的那面是它的**直接子元素**，全部现读自各自的发货字节），规则改成"无哈希锚点 + 原哈希"四支并存的并集；哈希仍留在探针池里报 `channelAbsent`，但 **`channelAbsent: []` 从 A1 的及格线里拿出来**——理由与 10.12.1 当初拒绝"只读 `drifted` 一空"是同一条：能被解释满足的判据等于没有判据，而这次连"解释"都不再是散文，是一条静态门（`tests/host.frosthooks.test.cjs`：每条还押哈希的规则必须在同一条选择器里带无哈希锚点，锚点必须真在规则里、且真在两渠道字节里；属性锚点还要实测"**只有登记表点名那个包在贴它、而且只贴了一次**"——现扫宿主树里每一个带 `lib/client.js` 的包（本机 71 个），`todo-panel` 与 `data-queue-dock` 各由恰 1 个包公布且就是 owner `dsh-client-ui-conversation`，两渠道各贴 1 次（旧字段那两个手抄的 1 现在每轮从字节里重数），14 条变异腿各自点名自己）。**这一版会改壳上的像素**：那两处从宿主自己的 `blur(40px) saturate(150%)`（实测 `--dsw-menu-backdrop-filter` 两渠道同值）变成我方的 `blur(20px) saturate(140%)`，与 npm 一致；npm 一侧前后不变。**状态照实**：锚点存在 = 两渠道字节实测；**"锚点在真引擎里命中谁" = `wash:check` 新增的 `frost` 组实测**（两个刻意重掷过基名的盒子 + 一个坞外 `_panel` 诱饵 + 一个把发货声明写进行内样式的参照盒：`blur(20px) saturate(1.4)` / `blur(20px) saturate(1.4)` / `blur(20px) saturate(1.4)` / `none`，三态不动；四条引擎变异各自只让该红的红，其中"把哈希那一支整支删掉、读数不动"就是 A1 这句话的实测形式）；**官方壳活页面上的观感仍 = 0 次目视、0 次读数**（两面按需挂载，且加载要用户本人重启——夹具页是我们自己搭的形状，别把两件事混成一句）。同轮还销掉一条老账：CLI 的 host 页判据组名单原本是手抄的 `['corner','fade']`，**10.12.0** 加 `side` 时那一版账本自己写着"新增一组必须改这里否则整组静默不跑"（那句钉的是测试里的名单门，不是 CLI 这份），于是 `side` 的引擎判据从 10.12.0 起从没被 `npm run wash:check` 评过——字段一直在读数行里，"采样字段在场"的 grep 看不见这种缺陷——现在名单从 `WASH_GROUPS` 现推导，OK 那句必须自报评了哪些组（`graded host[corner/fade/side/frost] …`），配源文本门 + CI 对该串的 grep。同日顺带销掉 Roadmap D 组一条**已随 10.12.0 发货却漏销**的条目（8 份同步，开放项 11→10，反向证据是只改英文版就让 `roadmap(en)` 点名翻红）。**10 月 12 日当天另有两笔，原文保留**：`10.12.1` 已装进桌面 profile（19:39 装入，装时应用正在跑 ⇒ 窗口里那个进程仍是 `10.12.0`），19:44 用「任何浏览器 → 壳自己 serve 的 `127.0.0.1:19387`」这条不必重启壳的通道，读到四池 `drifted: [] && notMounted: [] && pending: false` 加 `channelAbsent` 恰两组——这是 A1 那个组合的第一次活页读数，同轮还把该节第 ② 项的判据纠了（`data-plugin-css` 属宿主，139 张不是我方的；按 `id` 我方只有 2 张）。再往前一轮：**10.12.1 探针第四池 `channelAbsent` + 官方桌面壳渲染进程内的第一次机读**：把壳带 `--remote-debugging-port` 重启后经 CDP 在**那台 Electron 的页面里**读到 `__DSH_DREAM_SKIN_STATUS__ = {build:"10.12.0", status:"ready"}`，同次读到侧栏脚区三枚后缀锚点各恰 1 个、该面左右缘与宿主 `_regionArea` 逐缘相等、我方材质表在页面上**恰好 1 张**；也就是在那一次读到 `anchors.drifted` 非空——两组当时被算作漂移的哈希，本轮证明是**渠道分叉**（npm 与壳把同一张 `.module.css` 各掷了一次哈希），10.12.1 把它们移进新池并配一张**每轮从壳的字节重推导**的登记表。评级不上调，理由与仍未验的那一件（跨重启的 `localStorage` 持久化）见「官方 DSH Desktop」那一格的 2026-10-12 追记；通道与三条操作教训见「官方桌面壳的活页机读通道」一节）。上一次更新：2026-10-10（**10.9.3 的像素效果拿到第一次目视回执**：报告人在官方 DSH Desktop 的 desktop profile 上看那条带子，回执「现在好了，我看到已经正常了」；"看到的是 10.9.3"由落盘 mtime `2026-10-09T11:57:09Z` + 安装副本内 `PLUGIN_BUILD="10.9.3"` + 两层简写在场 + 依赖 `^9.29.0→^10.9.3` 对上进程启动 `2026-10-10 19:25:01`（晚约 23.5 小时）当场排除，但**这一格评级不变**——目视是人的读数，Electron 渲染进程内部仍 0 次机读。同轮收进本地待办的四条欠账（夹具 token 现读、固定 sleep 转等收敛、localStorage 配额出口、同页两代纤维的归属锁）与 Roadmap 重排见 CHANGELOG 10.10.0。以下 v10.9.3 轮原文保留，其中"0 次目视"的说法已被上面这条追记作废）——上一次更新：2026-10-09（v10.9.3 标题条带**第二轮**改判轮：10.9.2 在它自己那条判据下是绿的，而报告人回来的仍是同一句话——量出来的成因是**声明不等于像素**。水洗态下内容列把 `--dsw-alias-bg-base` 画了**三层**（`body` / `.centerCol` / 列内那层应用根，实测每层 α=0.4，对白色合成 ≈0.784），带子只有**两层**（`body` / `::before`，≈0.640），于是"两处计算底色逐字节相同"与"带子比它下面那一列亮"同时为真。本版把带子改成**同一枚 token 叠两层**（`background: linear-gradient(token, token) token !important`：仍是一条 `background` **简写**声明，几何与 `app-region` 一字未动；这个叠层形状先在壳 serve 的真实页面上用**等特异度探针**实测过——低特异度的第一次尝试输了层叠、读到 `background-image: none`），判据随之从"等于内容列的**声明**底色"换成**"等于内容列的合成结果"**（`caption-matches-content` → `caption-composites-like-content`），并补三条防空洞腿：`caption-stack-is-column-deep`（内容列必须真有 ≥3 层，否则相等是对着一张纸比）、`caption-comparison-is-alpha-sensitive`（那枚 token 必须真的半透明，实心之下三层与一层没有区别）、`caption-image-is-our-token`（带子上活下来的 `background-image` 必须是我们那层渐变，不是宿主的画）。夹具因此补了 `body` 与列内应用根两处 token 填充，并把 `:root` 的假 token 从实心改成 `rgba(16,16,24,.4)`，让"三层"是量出来的而不是假设。**同轮第一次哨兵实验读错了元素**：把 token 发在 `:root` 上得出"没有任何一层跟随"，而本插件是把 `--dsw-*` 发在 **`document.body` 的行内样式**里；挪对元素后各层照旧跟随——"改了没反应"不等于"没跟随"。**这是同一个决定第二次翻案，按一次记账**。上一轮 v10.9.2 标题条带改判轮：水洗态下那条 `::before` 不再透出壁纸，改画它下面那一列所使用的同一枚 token `--dsw-alias-bg-base`；判据从"必须透明"换成"必须等于内容列"（`caption-matches-content` + 防空洞腿 `center-column-paints`），并新增一条"把声明退回 10.9.1 的 transparent"的引擎变异门——它只翻那一处，其余四条读数照常绿，这就是上一版能带着错决定通过所有门的原因——**而这条判据本身在 v10.9.3 又被推翻**：它比的是两处各自的**声明**底色，页面画的却是**层**，见上。同轮第一次在壳自带宿主（`@deepseek-ai/dsh` 0.2.0-rc.2 / desktop profile）里读到 `__DSH_DREAM_SKIN_STATUS__ = build:"10.9.1" / status:"ready"`，并实测 `dsh plugin --profile desktop …` 被宿主 CLI **直接拒绝**（桌面 profile 由 Electron 应用独占管理），所以本文件与 README 里给桌面用户的命令行形状已改正。上一轮 v10.9.1 官方桌面壳外观轮：Windows 标题条那条 `::before` 补了它自己的水洗门控规则（伪元素拿不到元素上的 `background-color`），拖拽声明一字不动；计算样式门的 `corner` 组新增九读数 / 十判据（含标题条盒子的几何三件），工艺门那一半的伪元素判据从"四个属性黑名单"换成**白名单 + 声明条数**，判据读的字段改由 `requires` + 一道 CI 字符串门双重把关；同轮 11 处新变异、旧 8 处变异在白名单形态下全部重跑；夹具页最后两处手抄宿主类名改为现读推导（边界⑤ 关闭）；并追加官方 DSH Desktop（DeepSeek Harness 44.0.0 / 自带 dsh 0.2.0-rc.2）的锚点取证。上一轮 v10.9.0 为评审工单 #100–#105 整改；v10.6.0 为 dockkit 右侧栏对齐轮（PR #65：面板跟随侧栏滑杆 / 全屏不透对话 / 胶囊 hover 保底色，维护方独立 5 处变异抽查 + 真机命中面复测）；另含 rc.2 / alpha.1 整改轮的口径更正：会话字号区间 widened 到 10–22 px 而极值未测（issue #93）、底栏 `shell.bottom` 未挂载的事实（issue #90）、peer 判定面的边界（issue #91））

## 支持状态总览

| 宿主 | 状态 | 依据 |
|------|------|------|
| DSH Web（`0.1.0-rc.6` ~ `0.1.x`） | ✅ 支持，回归测试覆盖 | 双代 seed 探测（`lib/client.js` 顶部 `seedProbe` / `requireSeed` 块），回归门 583 条用例（10.23.0 发布时 571/571，壁纸取景分支再 +12，未发布，1 项预算门未决；Node 18/20/22/24） |
| DSH Web（`0.2.0-rc.1` ~ `0.2.x`） | ✅ 支持：peer 闸门已放宽并离线钉死，本机 `0.2.0-rc.1` 实机复核已过（挂载 + 设置项 + 填充方式三档） | issue #62：0.2.0-rc.1 起宿主 boot 阶段校验 `@deepseek-ai/dsh*` peer 范围，不满足即整包跳过；本版 peer 收敛为 `>=0.1.0-rc.6 <0.3.0-0`，判定表由宿主真实 `evaluatePluginCompatibility()` 生成（`tests/package.host_compat.test.cjs` / `tests/fixtures/host_compat_verdicts.json`）；实机复核方法与"进程未重启"的口径限制见上「宿主 peer 兼容闸门」一节最后一条 |
| 第三方 DSH Desktop 壳（Electron，动态端口） | ✅ 支持，含桌面专属修复 | issue #50/#51/#55（v9.14.1 / 9.15.2 / 9.16.0），动态端口重启用例（`tests/client.persistence.test.cjs` 之 "blue-team B1" / "T-02" 系列） |
| **官方 DSH Desktop**（`0.2.0-rc.2`，2026-09-29 用户实机安装受阻后排查） | 🟡 证据支持「**预期可加载**」，不支持「已支持」；**运行期挂载与 profile 路径两项已于 2026-10-12 在渲染进程内读到**（这一格仍不上调，缺的是下面第 ③ 件），跨重启的 `localStorage` 持久性未验 | <!-- desktop-claim: load-expected-unverified -->用户侧报错的真实原因是 pnpm 冷静期把 `@latest` 静默退回 9.27.1（旧 peer 范围不含 0.2.x）而非桌面壳不兼容；显式写版本号即可装上 9.29.0，复现与对照实验见「已验证」清单最后一条。本机仅装到 `0.2.0-rc.1`，rc.2 桌面壳里插件是否真挂载、像素效果如何，均未在本机验证。**issue #87 把这条措辞降级到证据支持的程度**：正面证据只有 `dsh.client.platform = "web"` 与宿主自带 21 个客户端包一致这一条静态事实（且**不需要**新 platform 值），负面证据是宿主 CLI 的 shipped profile 模板里**没有**官方桌面版的名字 —— 完整判断依据见下节「官方桌面版待验条目」。**2026-10-09 追加两条静态事实，但上面这一格的评级不变**：① 该壳（DeepSeek Harness 44.0.0）自带的宿主是 `@deepseek-ai/dsh` **0.2.0-rc.2**，其 `app.asar` 里 `data-shell-overlay` / `data-windows-titlebar` / `--dsh-windows-content-radius` 三处锚点**全在**，类名自成一族（`BynINW_frame` / `BynINW_centerCol` / `_9lTDKa_fade`），而那条 fade 与 npm 宿主的 `bhn1Oq_fade` **只差哈希**——#97 的哈希无关锚点在它上面直接命中；② 一位用户在该壳上的截图显示皮肤与壁纸确实生效（跑的是 9.29.0）。**这两条都不足以把"预期可加载"升上去**：本机从未在那台 Electron 的渲染进程里读到 `__DSH_DREAM_SKIN_STATUS__`，10.9.1 在该壳上的像素效果同样是 0 次目视——本轮的验证方式是"读它发货的 CSS 原文 + 在真实引擎里重演"（`npm run wash:check` 的 `corner` 组），不是活页复核。**2026-10-09 v10.9.2 追加一条运行期事实，但这一格仍然不上调**：从壳自己起的服务（`http://127.0.0.1:19387`，desktop profile，宿主 0.2.0-rc.2）上第一次读到 `__DSH_DREAM_SKIN_STATUS__ = {build:"10.9.1", status:"ready", lastError:null, skin:"nebula"}`，并在活页 CSSOM 里读到宿主那条 `[data-windows-titlebar] .<hash>_frame::before{…background:var(--dsw-specific-sidebar-fill);app-region:drag…}` 与我方规则把它压成 `rgba(0, 0, 0, 0)` 的结果——**插件确实挂载并生效于该 profile**。为什么这不算"已支持"：读数来自**外部浏览器指向壳的服务器**（同一份 bundle、同一个 profile，但不是那台 Electron 的渲染进程），且 `data-windows-titlebar` 是壳自己写的、浏览器里没有，那一处是**手动加上属性之后**测的；像素判断仍由报告人截图供给。**2026-10-09 v10.9.3 追加一条同类事实，这一格仍不上调**：同一通道第二次读到运行期状态（`build:"10.9.2"`，用于排除"没送达"），并第一次在该页面上逐层量出 `--dsw-alias-bg-base` 的**层数与各层 α**（内容列三层 ≈0.784 / 标题条两层 ≈0.640）——本版把带子补到与内容列同深，靠的就是这组读数。仍未做的还是那两件：Electron 渲染进程内部 0 次读数，10.9.3 的像素当时 0 次目视。**2026-10-10 第三条追记（这一格依旧不上调）**：报告人在该壳的 desktop profile 上目视那条带子并回执「现在好了，我看到已经正常了」，这是 10.9.3 像素效果的**第一次目视**；"看到的是 10.9.3"当场排除——安装副本 mtime `2026-10-09T11:57:09Z`、`PLUGIN_BUILD="10.9.3"`、两层简写在安装副本里在场、profile 依赖 `^9.29.0 → ^10.9.3`，而 `DeepSeek Harness` 进程启动于 `2026-10-10 19:25:01`（晚于落盘约 23.5 小时）。**为什么这一眼仍不够**：它是人的读数，不是渲染进程里的机读——那件事发生了几次仍然是 **0**，与本格评级无关。细节见「已验证」清单 10.9.3 那一节的 2026-10-10 追记。**2026-10-12 第四条追记（这一格还是不上调，但上面两处"未验"到此作废）**：把壳带 `--remote-debugging-port` 重启后经 CDP 在**那台 Electron 的渲染进程里**第一次读到 `__DSH_DREAM_SKIN_STATUS__ = {build:"10.12.0", status:"ready"}`——**运行期挂载不再是推断**，同次读到侧栏脚区三枚后缀锚点各恰 1 个、该面左右缘与宿主 `_regionArea` 逐缘相等、我方材质表**恰好 1 张**；`~/.dsh/profiles/desktop` 里装的是 registry 取来的包且被这个渲染进程加载——**profile 路径与安装路径也不再是推断**（`docs/publishing-to-npm.md`「8.4 官方桌面 profile」两条路那条记的是同一件事）。**为什么这仍然不够"已支持"**：三件待验条目里的第 ③ 件——Electron 侧 `localStorage` 与本插件 `dsh-dream-skin:` 键前缀的假设是否一致、设置能否跨重启保住——**要连续两次重启才判得出来**，而每一次重启都要用户本人点头。在那之前 `<!-- desktop-claim: load-expected-unverified -->` 这个戳不动，README 8 份与本文同一口径（`tests/desktop.claims.test.cjs` 逐份核对措辞与戳，改强措辞不改戳会当场红） |
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

### 这三枚戳在**官方桌面壳**里实测 0 命中——所以 `isDesktopShell()` 在那台壳上返回 false 是**契约语义**，不是待修的缺陷（10.12.1，实测）

2026-10-12 直接读官方桌面壳的发货字节（`%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\app.asar`，121,348,951 字节，latin1 全文计数）：

| 判据字符串 | 在壳的 asar 里出现次数 |
|---|---|
| `data-dsh-desktop-mode` | **0** |
| `__DSH_DESKTOP_FILE_PATH__` | **0** |
| `dsh-desktop-mode`（含 URL 参数形态） | **0** |
| `dshDesktopSidebarSurface`（第 3 条探针组那一枚第三方壳侧边栏类） | **0** |

推论，逐条写明以免下一个人"顺手修好"：

1. 在**官方**桌面壳里 `isDesktopShell()` 返回 `false`，快照 `shell` 读 `"web"`、`anchors.probed` 读 8 而不是 9。这不是漏判：这三枚戳是**别的桌面壳**（第三方 wrapper，例如 `dsh-better-sidebar` 也依赖同一契约）发布的，官方壳不发布它们。
2. **不要**改成 UA / `navigator.userAgent.includes("Electron")` 之类的嗅探来"让官方壳也认出来"。门一开，`probed` 立刻 +1 的那一组是 `.dshDesktopSidebarSurface`，而它在上表里同样是 **0 命中**——于是一枚**永远红的探针**和两条**永远画不到东西的 CSS 规则**（`lib/client.js` 里以该选择器为锚的材质规则与水洗规则）就一起被点亮。这正是 J1 那一轮已经写进本文的病灶的反向复发：把决定当成定理，造出一盏永远不会绿的灯。
3. 因此"官方壳上桌面专属分支不生效"是**有意结果**。官方壳上真正要紧的那些修正**不经过这道门**：侧栏脚区一族（10.12.0 起的 `[class$="_footArea"]` 后代规则）、水洗态、`channelAbsent` 判读，都是无条件的。它们在官方壳的活页上的实测读数见下节。

### 官方桌面壳的活页机读通道（10.12.0 / 10.12.1 实测所用）

壳是 Electron，可以带调试端口起来后用 CDP 直接读**计算值**，不必靠推演：`--remote-debugging-port=9222` 启动 → `fetch("http://127.0.0.1:9222/json")` 找到页面 target → 用 Node 24 内置的 `WebSocket` 连 `webSocketDebuggerUrl` → `Runtime.evaluate`。三条操作教训（都是本轮踩过才写下的）：

- 关窗 ≠ 退出：`taskkill` 不带 `/F` 只发关闭信号，窗口没了而 4 个进程与 9222 端口仍活着；必须 `taskkill /F /IM` 再确认端口关闭，否则第二次启动连的是**旧实例**的端口。
- 这是用户的实时会话：**征得同意再重启**，验完按原样（不带调试端口）启动回去。
- **计数要用可判别的具体串**。本轮第一版用宽松式 `/dsh-dream-skin|dsw-/` 数出"131 个 style 标签是我们的"，逐条核对后实况是 **138 张宿主自有表 + 恰好 1 张 `id=dsh-dream-skin:material:`**（读取时刻 `2026-10-12`，官方壳 desktop profile，插件 10.12.0；**这是一次性活页读数，会随页面状态漂**——宿主的表数取决于打开了哪些面，只有"我方那张恰好 1 张"是这条修正常年要核对的量）——`--dsw-` 是**宿主自己的 token 命名空间**，任何以它做判据的计数都会把宿主的表算成我们的。

**其实有两条通道，第二条不用重启壳**（2026-10-12 现证）：上节那条 CDP 路读的是**那台 Electron 的渲染进程**，代价是必须把用户的壳带调试端口重启一次；而壳自己 serve 的地址（本机 `http://127.0.0.1:19387`，desktop profile）**任何浏览器都能打开**，读的是同一份 profile、同一台服务器。用内置浏览器打开它当场得到两个结论：① **serve 层每次都从磁盘取包**——刚把 `10.12.1` 装进 profile、还没重启壳，这个新开的页面里 `__DSH_DREAM_SKIN_STATUS__.build` 就已经是 `10.12.1`，而窗口里那个进程仍是重启前的 `10.12.0`（"文件层 / serve 层 / 进程层"是三层，别把它们写成一层）；② 它的边界也要说清：`data-windows-titlebar` 这类**由壳自己写**的属性在这里缺席，桌面专属规则不火，所以**它不能当作 Electron 侧的证据**——本文"运行期挂载"那一格的机读次数只认真实渲染进程。

**四项必读的现读结果（2026-10-12 19:44，通道 = 内置浏览器 → 壳 serve 的 19387，插件 10.12.1）**：

| 项 | 读数 | 判读 |
|---|---|---|
| ① 四个池 | `probed: 8`、`drifted: []`、`notMounted: []`、`channelAbsent: [".lXshSW_root, ._7yHdaG_panel", ".uV2eYG_root"]`、`retired: 3`（`.bqrRRG_card` / `.nArs4W_*` / `.qDHVXG_fade`）、`pending: false`、`fadeMatches: 1` | **`drifted: [] && notMounted: [] && pending: false` 第一次在壳相关的活页上读到**（10.12.0 那次读到的 `drifted` 是两项非空）。Roadmap 那条 M 的验收还要求 `channelAbsent: []`，而这两组正是"壳渠道里真不存在的哈希"，未去哈希之前不可能为空 ⇒ **该条仍不达标，A1 不销账** |
| ② `style[data-plugin-css]` | **139** 张，而我方 `style[id^="dsh-dream-skin"]` **恰好 2 张**（`dsh-dream-skin-nav-icon` + `dsh-dream-skin:material:liquid-glass`），且这两张**都没有** `data-plugin-css` 属性 | 这条原本要补证"归属优先于登记表"，结果先把判据本身纠了：**`data-plugin-css` 是宿主的属性，不是我方的**——拿它数"我们的表"会把 139 张宿主表算成自己写的，与 `--dsw-` 那一族命名空间同一个坑。判据只能是 **id 前缀** |
| ③ build 对得上 | 页面 `build: "10.12.1"`、`status: "ready"`、`lastError: null`、`storageError: null`，与安装副本 `PLUGIN_BUILD = "10.12.1"` 一致 | "没送达"这一支排除（送达的是 serve 层；进程层要等重启） |
| ④ 跨重启 `localStorage` | **仍未测** | 这条通道是同一个进程里开的新页面，不是"两次重启之间"；第 ③ 件待验条目照旧悬着，`<!-- desktop-claim: load-expected-unverified -->` 那一格不动 |

**这条通道顺手量到的两件事，都算边界不算证据**：① 它**不写用户的宿主状态**——读取时刻（19:44）`~/.dsh` 下没有任何文件被改动（当轮唯一的新写入是 19:39 那次 `pnpm add` 留下的 `package.json` / `pnpm-lock.yaml` / `.pnpm-workspace-state-v1.json`），`%APPDATA%\@deepseek-ai\dsh-desktop\Local Storage` 里 0 个文件被写；② 也正因为如此，它**测不了第 ③ 件待验条目**：那个页面用的是内置浏览器自己的 origin 存储分区，插件的 `dsh-dream-skin:` 键落在浏览器侧，与 Electron 那份 `localStorage` 不是同一个桶。我在预览页里点开的"展开侧栏"因此只留在那个分区里，**没有改动用户自己那个窗口**。要判 ④ 只有一条路：用户本人把壳重启两次，第二次读回键值。

**"控制台 0 条告警"这句是先做过正向对照才写的**：空缓冲区与"真的没打印"是两种读数，`list_console_messages` 本身分不开。做法是在同一张页面上自己 `console.warn('dsh-probe-marker-42')` 一次，再列一遍——marker 确实被收为 `msgid=1`（且页面 `document.body` 行内带着 **58** 枚 `--dsw-*` token，说明插件的 `apply()` 在这张页上真跑过）。**观测通道能收到告警 ⇒ 收不到才是证据**。

**`notMounted` 会随页面状态出现又消失，这一条要单独记住**：首次读数时 `notMounted: ["[class$=\"_fade\"]"]`，而当时 `[class*="fade"]` 在全页 **0 个**元素、`BynINW_sidebarCol` 宽 **56px**（侧栏收起成轨、会话列表根本没渲染），宿主 CSS 里却声明着 `_9lTDKa_fade` ⇒ 归属判据为真、探针为 0，落进 `notMounted`。点开侧栏（`aria` 里那个"打开侧栏"按钮，宽变 280px）之后会话列表挂载，再读同一份状态：`notMounted: []`、`fadeMatches: 1`。**两点结论**：其一，`notMounted` 非空在首页/收起态下**是预期的挂载时序，不是缺陷**——消费方看到它先问"那个面在场吗"；其二，这是**晚修正路径（`armLateCorrection()`）第一次在活页上被观测到**（latch 因 `notMounted > 0` 触发 ⇒ 观察器挂上 ⇒ DOM 变化后重采样 ⇒ 该组从名单里退出），此前它只在夹具里演过。全程控制台 **0 条 warn/error**：打印门要求 `terminalDrift.length > 0`，而 `drifted` 一直为空，所以这张"已解释的缺席"页本来就轮不到它响——**"收不到"这话的分量由下面那条「正向对照」撑**（先证明观测通道收得到 `warn`，才有资格说没收到）。

**下一次复测（要用户本人重启并同意挂调试端口）必读的四项**：① `__DSH_DREAM_SKIN_STATUS__.anchors` 四个池各自的内容（预期 `drifted: []`、`channelAbsent` 恰点名两组）；② `document.querySelectorAll('style[data-plugin-css]').length` ——**这条是补一个未证的前提**：10.12.0 那次读数（`drifted` 两项）在"宿主自有表读得到"与"读不到"两种情形下形状相同，所以"归属优先于登记表"这条判决顺序在真壳上到底有没有被走到，至今没有证据；③ `__DSH_DREAM_SKIN_STATUS__.build` 与安装副本的 `PLUGIN_BUILD` 对得上（排除"没送达"）；④ 跨重启的 `localStorage` 键（`dsh-dream-skin:` 前缀）在两次重启之间是否保住——这一条同时决定「预期可加载」能不能升级成「已支持」。**① 与 ③ 已按上表现读勾掉（通道是浏览器 → 壳 serve，不是渲染进程）；② 换了判据；④ 仍欠，且只有"用户本人重启两次"这一条路。**


**一处已知的资源成本**：`scripts/lib/desktop-shell.cjs` 的 `readShellAsar()` 把整个 `app.asar`（本机 121,348,951 字节）按 latin1 一次性读成字符串并缓存。CI 上没有这个壳 → 返回 null，不发生；维护机上一次进程内一次。改成流式/窗口读会牺牲 `moduleClassesInShell()` 的整模块正则窗口，本轮判定性价比不成立，记为边界而不是缺陷。

 **本节不构成对"预期可加载"这条声明的升级。** 到 2026-10-12 为止，官方桌面壳这台机器上确实已经发生的事情是：`~/.dsh/profiles/desktop` 里装的是从公共 registry 取来的包（装到 `10.12.1`，`package.json` 依赖 `"dsh-dream-skin": "^10.12.1"`；更早那次由用户本人重启壳之后加载的是 `10.12.0`），活页上用 CDP 读到我方材质表**恰好 1 张**、脚区几何与宿主 `_regionArea` 逐缘相等；同日又用**浏览器 → 壳 serve 的 19387** 这条通道读到四池的 `drifted: [] && notMounted: [] && pending: false`（见上表的边界：那不是渲染进程）。**但 README 那一行的三件待验条目里，第 ③ 件（Electron 侧 `localStorage` 与本插件 `dsh-dream-skin:` 键前缀的假设是否一致）仍未测**——那要跨两次重启才能判，而每次重启都得用户本人同意；而戳 `<!-- desktop-claim: load-expected-unverified -->` 由 `tests/desktop.claims.test.cjs` 在 **8 份文档**上强制同值——升级这条声明必须连门带 8 份译文一起改，是一件独立的事，本版（只改读数字段的语义）**不顺手做**，以免把一次语义修正和一次兼容性升级混在同一个 diff 里。

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
- `set` 是**合并**而不是整体替换：补丁里的键被写（字符串）或删（`null`），补丁里没有的键原样保留——两个写入者（两个标签页，或 web profile 与桌面壳）不会互相抹掉无关设置。
- 文件里有一枚保留键 `dsh-dream-skin:schema-version`：它是这个文件的 schema 版本，当前 `1`，值始终是**字符串**（整张表保持"扁平的字符串映射"，因为共用同一个 `DSH_HOME` 的**旧版本插件**读到嵌套对象会把它 `String()` 成一条设置）。这枚键**不出现在 `get` 的回答里**，浏览器不会把它当成设置采纳；`set` 也写不动它（页面伪造不了自己的 schema）。版本号只升不降：文件上已有的戳若高于本构建，写入后**保持那枚更高的戳**，同时未知键原样透传——降级安装不会把新版本存的东西洗掉。
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
                                // 宿主归属分 drifted / notMounted 两池，
                                // 10.8.0 加 retired，10.12.1 加 channelAbsent，
                                // 四池见下判读）
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
    channelAbsent: [],          // 10.12.1 起（Roadmap A1 余下半）：**本仓库在 npm 渠道
                                // 实测存在、在官方桌面壳的 app.asar 里实测 0 命中**的哈希
                                // 锚点组。与 `retired` 的区别是这两半都是**当代实测**而不是
                                // 对旧宿主线的假设——两条渠道各自重掷 CSS-module 哈希，所以
                                // 这条规则在壳上"从来没有生效过"不是坏了，是分叉。继任基名
                                // 按 **CSS module 路径**（跨渠道稳定的键）登记，且每次跑门都
                                // 从壳的字节里**重新推导**一遍（`scripts/lib/desktop-shell.cjs`），
                                // 不是抄来的常量。读法与 `retired` 同：非空**不是**故障信号，
                                // 但也不是"什么都没发生"——它点名的是"这条渠道上这个面换了
                                // 名字，那边是它的新名字"。
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
  消费判读分两层，**别把它们混成一句**（10.12.1 起把口径写死；**10.13.0 改了第二层读什么，改动理由单列一条，不悄悄换**）：
  - **`drifted: [] && pending: false`** = "**没有未解释的锚点换代**"。它是唯一的"没有东西在静默坏掉"信号，`pending: true` 一律视为未检查，`drifted 非空 && pending: false` 是确定漂移告警（同时有一行带人类标签的 `console.warn`，机器字段与装饰文案分离，B-08）。**它不等于"皮肤在这台机器上处处生效"**——10.8.0 的 `retired` 与 10.12.1 的 `channelAbsent` 都会往这个绿灯里放"已解释的缺席"，这正是它们被单开一池的原因（把已查明的东西塞进告警，告警就再也无人读）。
  - **"这台机器上每一条精修都真的命中"** 自 10.13.0 起 = **静态配对门 `tests/host.frosthooks.test.cjs` 为绿** 且 `drifted: [] && notMounted: [] && pending: false`。**`channelAbsent` 从判据里拿出来，降级为"只读的事实"**。这不是一次放宽，恰恰相反：10.12.1 把 `channelAbsent: []` 写进验收，本意是防"用解释糊弄判据"，但那条判据的实际执行方式是"登记表里写一句散文 + 运行时看它空不空"——被解释满足的判据仍然是被解释满足的判据。现在承重的那一道是静态的：每一条还押宿主构建哈希的规则，**同一条选择器里**必须带一个无哈希锚点，而那个锚点要在**两条渠道各自的发货字节里实测存在**（npm 装作物 + 壳的 `app.asar`），摘掉锚点当场翻红，且在没有任何宿主、没有浏览器的机器上照样跑（配对那一半只读仓库自己的 bundle）。**属性锚点另有一条独立的失效车道**：它不飘移，但别人可以开始贴同一个属性、同一个组件也可以贴第二次——所以门把**宿主树里每一个带 `lib/client.js` 的包**都读成语料（本机 71 个），要求每个 hook 的公布者**恰好一个**且**就是登记表点名的 owner**，并要求每渠道每 token 的**贴次数等于登记表写的次数**（`carriedBy.hookOccurrences`，每轮从两渠道字节重数；登记表不声明期望次数也红，因为"字符串在场"证明不了"只贴了一次"）。第二个包贴上、唯一的贴它者换了包、宿主多贴一个元素 ⇒ 当场红（真语料那一半只在装过宿主的机器上跑，CI 上跑的是同一判据的合成语料版；无宿主时走具名跳过，不报成通过）。同时 `channelAbsent` **仍然照报**——"这枚哈希在这个渠道不存在"是事实，只是它不再充当及格线。
  `notMounted` 非空**不是**故障信号——它表示宿主 CSS 仍在、只是那个面（设置弹窗、todo 面板等）当前没挂载。`retired` / `channelAbsent` 非空同样**不是**故障信号，且这两池**永不进入告警**——它们点名的是"这里有一条精修在这台机器上没生效，原因与继任者已知"，而 10.13.0 之后"已知"两个字背后有门可查：登记表每一条都必须写 `carriedBy.anchors`，锚点必须真在规则里、真在两渠道字节里（`tests/hashes.test.cjs` 缺 `carriedBy` 就翻红）。
- **10.13.0 的像素账（诚实栏）**：todo 面板与队列坞那两处磨砂**在官方桌面壳上从今天起会生效**——此前那条规则只押 npm 渠道的哈希基名，在壳上匹配零个元素（10.12.1 的 `channelAbsent` 报的就是这件事）。宿主自己在这两处已经画了 `backdrop-filter: var(--dsw-menu-backdrop-filter)`，实测两渠道同形，值为 **`blur(40px) saturate(150%)`**；我方那条是 **`blur(20px) saturate(140%)`**。所以壳上的变化是"宿主的 40/150 → 我方的 20/140"，与 npm 渠道一致（npm 上这一版前后都不变，仍是我方值覆盖宿主值）。**这一格的状态**：锚点存在 = 两条渠道字节实测；**"这两条选择器在真引擎里命中谁" = 10.13.0 起由 `wash:check` 的 `frost` 组实测**（真 Chrome + 真发货 CSS + 两个刻意"重掷过基名"的盒子：`frostRef` / `frostTodoPanel` / `frostDockPanel` 同为 `blur(20px) saturate(1.4)`，坞外那个以 `_panel` 结尾的诱饵为 `none`，plain / wash / washed-again 三态一字不动；把规则里 `.lXshSW_root, ._7yHdaG_panel` 整支删掉读数不动——那条腿就是"承担规则的是锚点不是哈希"的实测形式）。**仍未量的那一半**：这些读数出自**我方构造的夹具页**（盒子形状按两渠道读到的宿主 DOM 搭），官方壳的**活页面**上这两处至今 **0 次目视、0 次读数**——那两面要真有待办列表 / 排队消息才挂得出来，且加载新代码要用户本人重启。谁要把"生效"写成"看到了"，先补一次活页读数或用户回执。
- **`notMounted` 的语义与分类器边界（10.5.0，T3）**：终局判定里的 missing 组按**宿主归属**分两池——某组的类名 token 出现在宿主自己发布的样式表（`style[data-plugin-css]`，宿主 css loader 给自家 chunk 盖的戳）里，归 `notMounted`（宿主仍持有，面未挂载）；否则归 `drifted`（真改名）。本插件的材质表不携带该属性，**不可能为我们自己的 token 担保**。**已知边界（如实声明）**：分类器只读该属性、**绝不 fetch `<link>` 样式**（零网络不变式优先于分类完备性）——模块 CSS 以 `<link>` 形态分发时，该组仍会被保守判成 `drifted`；宿主一张自有表都查不到时（连查询本身都抛异常也一样）全部回落为旧版语义（全 drifted），pre-T3 行为原样保留。告警只在 `drifted` 非空时发声（全 `notMounted` 的终局是静默的——未挂载不是故障）；晚修正观察者对**两个池子**做同一条单向撤回。
- **`channelAbsent` 的语义与它的准入条件（10.12.1，A1 余下半）**：一组成员选择器**当前页没命中**、宿主 CSS 里也查不到归属，但它已被本仓库**登记为通道分叉**——登记门槛比 `dead-hashes` 现有那条（"这枚哈希在宿主安装物里已死"）**更高，也更可查证**：必须同时给出 ① npm 渠道的**实测**基名（从本机宿主安装物读到）、② 官方桌面壳 `app.asar` 里**同一 CSS module 路径**下的继任基名（由 `scripts/lib/desktop-shell.cjs` 从壳的字节现读现推）、③ 失效面与后果。module 路径是这里唯一跨渠道稳定的键：两条渠道各自重掷哈希，所以"基名不同"是常态，而"同一条 `.module.css` 里同一个类名后缀"才是"同一个面"的证据。**为什么单开一池而不是并入 `retired`**：`retired` 说的是"为一条我们测不到的旧宿主线保留的假设"，`channelAbsent` 说的是"两条当代渠道各掷了一次哈希"——把后者塞进前者，读字段的人会以为那是一具尸体，而它其实是一个有名字、有位置、可以按模块路径查到的活物。`tests/hashes.test.cjs` 每轮从壳的字节**重推导**登记表，**七条变异腿各自点名自己**：bundle 与登记表不一致 / 登记了却从不探针 / npm 那半其实已死 / 壳里重新出现了这枚哈希 / 继任基名被重掷 / "无害"声明与 CSS 规则矛盾 / "无害"声明没有证据；另有结构性一条（任何机器都跑，不需要语料）与一条真语料重推导（**壳不在这台机器上时具名跳过**，跳过会打印是哪两半没读到）。**保守出口（与 `retired` 同款，且这是刻意设计成"报出来"而不是"消失"）**：宿主自有表一张都读不到、或读取本身抛异常时，无法判定归属，但**已登记的组仍按 `channelAbsent` 报出**（它的外部证据来自仓库之外，不依赖这一页的 CSS 能否读到），未登记的仍回落 `drifted`。晚修正观察者对 `channelAbsent` 做**再分类而非单向撤回**：一枚通道分叉的哈希若突然在本页命中，那是"测量本身变了"（壳把我们的哈希收了回去），不是"面晚挂了"，所以它从活的分类器重新发布，不写进锁存的终局列表。**反向用例**：`tests/client.smoke.test.cjs` 的壳形状夹具断言壳页终局 `drifted: []` 且 `channelAbsent` 恰好点名这两组（改前跑红——此前这两组一直躺在 `drifted` 里，本文承诺的正向信号在官方桌面壳上**永不可达**）。

**三条必须一起读的限定（对抗评审 10.12.1 B2 / T1 / T3 采纳）**：

1. **这个字段不区分两种成因**。"这枚哈希在本页缺席"既可能是**渠道分叉**（本页是官方壳，它自己掷了另一个基名），也可能是**npm 宿主把那枚哈希重掷了**（本页是 Web 渠道，登记表里的基名已经过期）——运行时**没有可用的渠道判据**：三枚桌面契约戳与 `.dshDesktopSidebarSurface` 在官方壳的 `app.asar` 里各 0 命中（实测见上「桌面壳检测」一节），`isDesktopShell()` 在那台壳上返回 false，所以不能拿它当"这是壳"的证据。误标的后果止于诊断字段（外观与功能都不受影响），而**真正过期会被发现的地方是门**：`tests/hashes.test.cjs` 有一条"npm 那半其实已死"的变异腿，登记表 npm 侧基名在实装安装物里查不到就点名翻红。所以这是"字段可能说错话、门会来纠正"的形状，不是无声失败。
2. **对新池的"再分类"不是随时发生**。`armLateCorrection()` 只在终局**点名了真漂移或未挂载**时被挂上（latch 条件 `drifted > 0 || notMounted > 0`，即 `lib/client.js` 里 `warnOnMaterialSelectorDrift()` 中那道 `if (conclusive && !verdictLatched && …)`）；一张只有 `channelAbsent` 非空、其余皆空的壳形状页**根本不会创建这个观察者**，于是那条再分类路径只在别的东西先触发 latch 时才可达。文档写"观察者对 `channelAbsent` 做再分类"描述的是**存在的代码路径**，不是"每次页面都会走一遍"。
3. **降级快照里没有这个字段可读**。`status: "degraded"` 走的是另一条内联字面量，`anchors` 整个是 **`null`**（四个池都是）——`tests/client.smoke.test.cjs` 的 B-3 守卫比的是**顶层键集**，`anchors` 这个键两边都在，所以子结构不同不会让它红。**消费方必须先判 `status !== "degraded"` 再读 `anchors.channelAbsent`**，直接读会在降级页上抛。
- **降级路径同样发布**（`status: "degraded"` + `reason` + `lastError`），且字段集与 ready/applying **完全一致**（测试守卫"snapshots expose EXACTLY the same key set"逐键核对，v9.27.0，B-3）——消费方永不撞 `undefined`，诊断方能区分"插件未安装"与"已安装但宿主 seed 换代"。
- 宿主采纳后自动重发布（`loadFromHost` 尾部 `publishStatus()`），`skin/shell` 反映的永远是生效值；后续任何重发布经 prev-merge 保住探针结果。`apply()` 对外从不抛错（B-4 约束）：`ready` 只在自然收尾时签署，`publishStatus` 自身包 try。
- **10.14.0 的 web 活页读数（2026-10-14 01:45–01:55，用户同意重启后现读；这是本文件那条"真机装载 0 次"作废的地方）**：`dsh --profile web --no-open` 起来后（PID 18476，监听 `127.0.0.1:3080`；起前 `tasklist`/`Get-CimInstance` 现读确认 **DSH 本来就没在跑**，所以没有代关任何进程），活页 `__DSH_DREAM_SKIN_STATUS__` = `{plugin:"dsh-dream-skin", build:"10.14.0", status:"ready", shell:"web", skin:"nebula", lastError:null, storageError:null, reason:null}`，`html[data-dsh-dream-skin-wash]="1"`，我方材质表与 nav 图标表各恰好 1 张。探针终局 `{probed:8, drifted:[], channelAbsent:[], retired:[3 组], pending:false, notMounted:[".lXshSW_root, ._7yHdaG_panel"], fadeMatches:1, fadeClasses:["bhn1Oq_fade"]}`——两点值得单独记：① **后缀锚点 `[class$="_fade"]` 在真页上抓到了这一代宿主重掷出的 `bhn1Oq_fade`**（此前只有夹具读数，这是 10.12.0 换后缀锚点时承诺的抗重掷第一次在活页上兑现）；② `notMounted` 只剩那一组**按需挂载面**，而它确实不在场（现读 `[data-testid="todo-panel"]` 0 个、`[data-queue-dock]` 0 个）——**所以 A1 在 web 通道上还差的不是漂移，是这一组**，正是下面 Roadmap A 那条 S 的形状。
- **状态文件被真宿主半边盖章（同一次）**：重启前备份 `~/.dsh/dream-skin.json`（`122,777 字节`），起页后经我方 loopback API 做一次**值完全相同的再 affirm**（`get` → 把现读到的同一个值 `set` 回 `dsh-dream-skin:sidebar-link`，返回 `{ok:true}`），落盘 **`122,813 字节`（+36 = 恰好那一枚键的长度）**；键集 = 原 17 条设置 + `dsh-dream-skin:schema-version:"1"`，**逐条值与备份逐字符相同**、所有值仍是字符串、`get` 的回答里**看不到那枚保留键**（写前写后同为 17 键、同值）。备份留在 `%TEMP%\dream-skin.json.bak-20261013T174541Z`。
- **给脚本消费方的一条时序限定（本轮实测，不是推测）**：内置/后台浏览器是 `visibilityState:"hidden"` 的页面，**`setTimeout(…, 300)` 实测被节流到 1112 ms（另一次 688 ms）**。晚修正观察者在这种页上**会到、但慢**：我打开侧栏后立刻读 `anchors`，`[class$="_fade"]` 还在 `notMounted` 里，隔几秒再读它已撤回、`fadeMatches` 从 `0` 变 `1`、`checkedAt` 往后走了约 3.4 秒。判读规则因此是：**"晚挂载是否已被撤回"不能拿一次读数当终局**——要么等 `anchors.checkedAt` 变化，要么多读一次；在可见页面上这个抖动不明显，在自动化/隐藏页面上明显。**顺带一条流程教训**：当时我面前摆着两个候选成因（观察者的 25 次唤醒预算被启动期 DOM 抖动耗光 / 隐藏页定时器被节流），直接命名前者就是错判——多因子时先量再判。
- 纯只读镜像：不新增网络请求、不写持久化、渲染失败被吞——诊断通道坏不了皮肤。它是**诊断镜像而非信任边界**：任何安全决策都不应依赖该全局的返回值（写入/渲染/采纳三道校验各自独立把关）。

- **`navIcon` 的判读与它为什么必须是页面级（10.5.0）**：这条装饰链跑在 loader 降级路径**之外**的 IIFE 里，任何异常都被吞掉，所以它坏不了皮肤、也**不会**出现在 `status: "degraded"` 的语义里——它有自己的一行状态。`sheets > 1` 是重复注入的信号（同一页面长生命周期里再评估一次 bundle 就会这样，实测过两次：两份相同的 `<style>` 加两个 body 观察者）；锁不能挂在 `<style>` 节点上，因为节点会被替换、替换后计数仍读 1。**但锁也不能只看节点**：在 `<body>` 还没解析时跑完的那一份会把自己标成"已接管"却什么都没挂，图标整场不换，而报表看起来和"设置面板没开"一模一样。因此 `armed` 只在观察者真的装上之后为 `true`，判读规则是：`armed === false` 且 `sheets <= 1` 才可以说"这个构建没有可钩的 nav"；`armed === true` 而 `marked === 0` 只说明面板没开。`checkedAt` 会合理地变旧——观察者只在 DOM 变更时唤醒，静默页面不再采样，rAF 定时器只是**首帧被饿死时的一次性兜底**（隐藏/完全遮挡的窗口拿不到帧），不是周期性复查。想让图标立刻重排就改一次 DOM。
  **两处读数不是同一个时刻（10.5.0 实机，L2）**：快照里的 `navIcon` 是**最后一次 `publishStatus()` 的镜像**——IIFE 自己重报不触发状态重发布。实测（宿主 `0.2.0-rc.1`，设置弹窗开着）：`__DSH_DREAM_SKIN_NAV__` = `{dialogs:1,buttons:15,marked:2,armed:true}`，而同一页 `__DSH_DREAM_SKIN_STATUS__.navIcon` 仍停在 boot 时的 `{dialogs:0,buttons:0,marked:0}`（两者非同一对象）。**因此上面那套判读规则要对实时全局用**；从快照读会把整场会话读成"面板没开"。快照字段的作用只是"一次 `apply()` 之后顺手带上钩子状态"，不是监控源。
- 插件在 `window` 上只挂**三个**全局：`__DSH_DREAM_SKIN_STATUS__`（本文档契约的只读诊断快照）、`__DSH_DREAM_SKIN_RENDER_GATE_SEEN__`（渲染告警去重的页面内 `Set`，见「安全边界」一节，不参与任何判定、可随时清空）与 `__DSH_DREAM_SKIN_NAV__`（10.5.0 起，上条所述的导航图标自检记录，同时是那把幂等锁的状态位）。宿主侧若要做全局命名审计，这三个即全部。前两者可随时清空且不影响功能；第三个被清空后若 bundle 再次评估，会重新接管并再挂一个观察者——这是有意取舍（用"删了就重新武装"换"节点被替换也不会失去钩子"），不是漏网。第三个之上另挂**不可枚举**的 `arm(gen)` / `dispose(gen)` 控制柄（10.5.0，T9）：fiber 卸载时经 `dispose(gen)` 拆除钩子全部三样残留（断开观察者、清除行标记、移除图标表），同页重挂经 `arm(gen)` 复臂；generation 令牌保证**迟到的旧代 dispose 不会误杀接棒的新代**。

## 机读出口：四条能让脚本判定的配方（10.14.1，Roadmap C 那条 M）

> 上一节讲的是**每个字段是什么意思**；这一节讲的是**一个脚本该怎么问**。两条互补，故本节刻意不重复字段语义（同一句宣称写两遍会削弱它的 claim site——本项目为这个漂过一次）。本节与代码的一致性由 `tests/docs.machine_readable.test.cjs` 核对：**键清单从 bundle 现读、与本文表格双向比对**（发一条新版本认识而本文没写的键 ⇒ 红；本文写了一条 bundle 里查无此键的 ⇒ 也红）。

### 三个来源，各自能证明什么

| 来源 | 怎么读 | 能证明 | **证明不了** |
|---|---|---|---|
| **状态文件** | `fs` 读 `$DSH_HOME/dream-skin.json`（`DSH_HOME` 未设 ⇒ `~/.dsh/`） | 用户设置的 **durable 值**（跨端口、跨重启、跨 origin 的那一份） | 装载、生效、有没有画到盒子上——它只是数据；也**不等于**"当前版本的全部键"（见下面 `material-memory`） |
| **页面全局** | 页面里读 `window.__DSH_DREAM_SKIN_STATUS__` | 装的是哪个 `build`、`apply()` 是否收尾、探针终局四池 | 别的 origin / 别的 profile / 别的机器 |
| **计算样式** | 真页 `getComputedStyle`（即 `wash:check` 那条通道） | 精修是否**真的画到了该画的盒子** | 需要浏览器与真宿主；夹具页读数只证形状（见「计算样式门」一节） |

### 键清单：**现读，不抄**

任何脚本要枚举"当前这个版本认识哪些设置"，都该跑这一条而不是背一份清单：

```sh
grep -oE '"dsh-dream-skin:[a-z-]+"' lib/client.js | tr -d '"' | sort -u
```

**别省掉 `tr -d '"'` 那一节**：`grep -o` 打出来的是**带引号的整段匹配**，拿它直接和文件里的键比较会得到"一枚都对不上"的结论——本轮写这一节时就是这样错的，第一次跑出来的"bundle 不认识文件里 17 枚键"完全是引号造成的假象。要么去引号，要么两边都带引号比。

本机维护机 2026-10-14 现读（用上面这条命令，去引号后与真文件比对）：**bundle 认识 24 枚**，真文件在场 **17 枚设置 + 1 枚保留键 = 18 枚**；**8 枚不在场**——`accent` / `appearance` / `builtin-last` / `factory-seeded` / `favorites` / `packs` / `wallpaper-refresh` / `wallpaper-url`（读法见本节末两条约束：不在场不等于用户没设过，只说明这台机器这个 origin 没在会话里写过、或它是按设计不推送的溯源位）；**文件里反过来多出一枚当前版本不认识的**（`material-memory`，见本节末）。

| 键（`dsh-dream-skin:` 前缀省略） | 代码里的常量 | 这一项是什么 |
|---|---|---|
| `skin` | `STORAGE_KEY` | 当前皮肤 id |
| `builtin-last` | `BUILTIN_LAST_KEY` | 上一次选过的内置皮肤（返回"上一个"用） |
| `appearance` | `COMBINED_OVERRIDE_SOURCE` | 明暗来源覆盖（`light` / `dark` / `system` 一族的取值以该常量旁边的读写为准） |
| `accent` | `ACCENT_KEY` | 每用户强调色：`#rrggbb` 或 `system` |
| `packs` | `PACKS_KEY` | 主题包库（JSON 数组的远端/手动包清单） |
| `favorites` | `FAVORITES_KEY` | 收藏的包 id（JSON 数组） |
| `wallpaper` | `WALLPAPER_KEY` | 本地图压缩后的 data URL（个人图片 ⇒ 文件权限 `0600` 的原因） |
| `wallpaper-url` | `WALLPAPER_URL_KEY` | 外链壁纸 URL |
| `wallpaper-gradient` | `WALLPAPER_GRADIENT_KEY` | 渐变预设串（受写入门的安全校验与渲染门双重把关） |
| `wallpaper-kind` | `WALLPAPER_KIND_KEY` | 壁纸来源类型：`image` / `url` / `gradient` |
| `wallpaper-fit` | `WALLPAPER_FIT_KEY` | 填充方式（issue #61 加的那一项） |
| `wallpaper-pos-x` | `WALLPAPER_POS_X_KEY` | 壁纸取景：水平偏移（视口宽度的百分比，-100..100，0 = 居中，可移出画面） |
| `wallpaper-pos-y` | `WALLPAPER_POS_Y_KEY` | 壁纸取景：垂直偏移（视口高度的百分比，-100..100，0 = 居中，可移出画面） |
| `wallpaper-zoom` | `WALLPAPER_ZOOM_KEY` | 壁纸取景：缩放（整数 50..300 %，默认 100 = 不缩放） |
| `wallpaper-opacity` | `WALLPAPER_OPACITY_KEY` | 壁纸层不透明度 |
| `wallpaper-blur` | `WALLPAPER_BLUR_KEY` | 壁纸模糊 |
| `wallpaper-autodim` | `WALLPAPER_AUTODIM_KEY` | 自动弱化开关（`1` / `0`） |
| `wallpaper-follows-skin` | `WALLPAPER_FOLLOWS_SKIN_KEY` | 壁纸是否跟随皮肤（`1` / `0`；所有 `0` 的写入点都是用户动作） |
| `wallpaper-refresh` | `WALLPAPER_REFRESH_KEY` | 外链壁纸的刷新策略 |
| `wallpaper-rotation` | `WALLPAPER_ROTATION_KEY` | 外链壁纸轮换（issue #61 的多链接观察）：JSON `{on, mode, minutes, urls, lastRotatedAt}`。**只增不改**：`wallpaper-url` 仍是“此刻在显示的那条”，列表单独存放，没有游标字段（位置 = 正在显示的那条在列表里的位置）；`urls` 每次读取都逐条过安全门，坏条目只丢它自己 |
| `wallpaper-history` | `WALLPAPER_HISTORY_KEY` | 最近用过的壁纸（JSON 数组，FIFO 淘汰 + 每键字节预算） |
| `sidebar-opacity` | `SIDEBAR_OPACITY_KEY` | 侧栏透明度 |
| `sidebar-link` | `SIDEBAR_LINK_KEY` | 侧栏与 dockkit 面板是否联动（`1` / `0`） |
| `modal-opacity` | `MODAL_OPACITY_KEY` | 弹窗层不透明度（**存的是 alpha 不是滑杆刻度**：`stored = 1 − 滑杆/100`，出厂种子 `0.6` = 滑杆 40） |
| `composer-opacity` | `COMPOSER_OPACITY_KEY` | 输入区不透明度（同上，alpha 语义） |
| `material-preset` | `MATERIAL_PRESET_KEY` | 材质预设 id（磨砂/液体一族） |
| `performance` | `PERFORMANCE_KEY` | 低功耗模式三态：`1` = 固定开、`0` = 固定关、**缺键 = 自动**（跟随系统 `prefers-reduced-transparency`）；开启时关闭全部 `backdrop-filter`、壁纸模糊与 bleed 层（issue #110） |
| `factory-applied` | `FACTORY_APPLIED_KEY` | "出厂外观是否已应用过"的那一位（出厂三态里的第一态） |
| `factory-seeded` | `FACTORY_SNAPSHOT_KEY` | 出厂溯源快照（跨刷新生效，迁移判定读它） |
| `schema-version` | `lib/index.js` 的 `STATE_SCHEMA_KEY` | **保留键**，不是设置：文件自己的 schema 版本；`get` 永不返回它，页面写不动它，只升不降（10.14.0 起） |

两条读法约束：**① 文件里没有某枚键 ≠ 用户没设过**——推送只带"本次会话真的写过"的键（`writtenKeys`），出厂溯源值按设计永不落进这个文件；**② 文件里有某枚键 ≠ 当前版本写的**——见本节末那条。

### 四条配方（每条附"它证明不了什么"）

**配方 A｜"这台机器上装了吗"** — 不需要浏览器：
1. `fs.existsSync($DSH_HOME/dream-skin.json)`；
2. 装载与否**别从文件推断**，用 `npm run host:preflight -- --profile-load` 那一半：它调宿主自己的 `loadProfileDirectory()`，打印 `dsh-dream-skin: mounted` 与 `19 bundle layers loaded, 0 skipped`（**只读**那半，会写 profile 的 `loadProfile()` 那条命令从不调用）。
- 证明不了：文件存在只说明"某个版本落过盘"；`skippedBundles` 为空说明"宿主没在兼容闸门处整包跳过我方"，**不等于**页面渲染正常。

**配方 B｜"皮肤生效了吗"** — 需要页面，全部是可判等式：
```js
const s = window.__DSH_DREAM_SKIN_STATUS__;
const file = /* 读 $DSH_HOME/dream-skin.json */;
const ok = s.status === "ready"
  && s.skin === file["dsh-dream-skin:skin"]                       // 快照里的皮肤 == durable 里的那个
  && document.documentElement.hasAttribute("data-dsh-dream-skin-scheme")
  && getComputedStyle(document.body).getPropertyValue("--dsw-alias-bg-base").trim() !== "";
```
2026-10-14 活页实测形状（web 通道，`nebula`）：`scheme="dark"`、`data-dsh-dream-skin-wash="1"`、`data-dsh-material="frosted"`、`--dsw-alias-bg-base = rgba(19, 17, 22, 0.4)`、`style[id^="dsh-dream-skin"]` **恰好 2 张**。
- 证明不了：`ok` 说的是"token 层活着"，**不是**"每一处精修都画到了盒子"（那是配方 C 与计算样式门的事）；也别用 `data-dsh-dream-skin-composer` 判——本轮在同一页现读到它**不在场**（composer 一族按自身条件才挂），拿它当必要条件会误判成"没生效"。

**配方 C｜"宿主换代有没有把精修打回去"** — 顺序是硬要求：
1. `s.status !== "degraded"`（降级快照里 `anchors` 整个是 `null`，直接读子字段会抛）；
2. `s.anchors.pending === false`（`true` = 未检查，不是通过）；
3. `s.anchors.drifted.length === 0` = "没有**未解释**的锚点换代"；要判"每条精修真的命中"，还须 `notMounted.length === 0`，且**静态配对门 `tests/host.frosthooks.test.cjs` 为绿**（10.13.0 起的口径，`retired` / `channelAbsent` 只当事实读）。
4. **在隐藏页/自动化页上等 `checkedAt` 变化**：晚修正观察者会到但慢（实测 `setTimeout(…, 300)` 被节流到 1112 ms），单次读数不能当终局。
- 证明不了：`drifted: []` 不覆盖按需挂载面在**终局之后**才挂出来的情形以外的东西，也不覆盖提问卡/授权卡那一族（探针刻意不收它们——这正是 Roadmap A 那条 S）。

**配方 D｜"跨重启会不会保住"** — 只看 durable 侧：
1. `file["dsh-dream-skin:skin"]` 与配方 B 读到的当前值一致；
2. 你关心的每一枚设置键都在文件里在场（**不在场 ⇒ 那份设置只活在当前 origin 的 localStorage 里**，动态端口一换就丢，这是桌面端最容易踩的一条）；
3. `file["dsh-dream-skin:schema-version"]` 是十进制整数字符串——它描述"这盘字节是谁写的"，**不是**"这文件能被谁读"。
- 证明不了：文件里有一枚键，不能反推"当前版本认识它"（下面那条就是现场反例）。

### 现场反例一条（记下来，因为它改变读法）

本机真文件里有 `dsh-dream-skin:material-memory`，值 `{"frosted":{"opacity","blur","composer"},"liquid":{…}}`（一枚 per-material 的滑杆记忆）。**本仓库任何一次提交都没写过这个字面量**（`git log --all -S'material-memory'` 现查为空），本机三个 profile 的实装 bundle 与宿主的 npm 全局目录里也都搜不到 ⇒ **来源未查明**，作为待查项挂着；它不改外观、不参与任何判定，当前版本读不懂就原样保留（10.14.0 那条未知键透传的性质，在现场被验证了一次）。**要查清的方向**：是否存在同命名空间的第三方插件、或用户手工写入。

## 锚点依赖清单（宿主升级风险面）

**这是本文档存在的核心原因：如实列出插件对宿主 DOM/token 的每一处依赖、失效后果与已有对策。**

| 锚点 | 性质 | 若失效的后果 | 对策 |
|------|------|-------------|------|
| 玻璃材质类名（`.uV2eYG_*` 等 13 组，材质样式表见 `lib/client.js` 之 `ensureMaterialStyle()`，样式节点 id 常量 `MATERIAL_CSS_SOURCE`） | 构建哈希类名 | 仅玻璃精修**静默失效**（外观损失，功能无损） | 漂移探针 `warnOnMaterialSelectorDrift()`（v9.27.0 三态判定）+ 机读快照（`MATERIAL_SELECTOR_PROBES`）；规则本身选择器组冗余。**层叠位次不是承诺**：实机（宿主 `0.2.0-rc.1`）我方材质表在 `document.head.children` 的 index 131 / 共 217，其后仍跟着 85 个节点（多数是 `<style>`）——宿主在插件挂载之后持续注入样式。"把表移回末尾"（B9/M14）恢复的是**重挂那一刻**的末位，精修能站住靠的是特异度（`html[data-dsh-material=…]` 前缀 + 属性选择器），不是位置。10.5.0 起 missing 组按宿主归属分栏（`notMounted` / `drifted`）；10.8.0 起另加 2 组**属性锚点**（见下一行）。本机与官方桌面壳两组哈希现状——`uV2eYG` 命中；侧栏 foot 一族（`_footArea` / `_settingsArea` / `_footerActions`）自 10.12.0 起**不再押哈希**，改用 `[class$="_footArea"]` 及其下的后代选择器：这一族的基名两台宿主各不相同（npm 0.2.0-rc.1 与桌面壳 `app.asar` 各一枚，实测），所以旧的类名写法在桌面壳上**从来没有命中过**，那条「左侧栏底部断裂」对齐此前只在 Web 端生效过——Roadmap A1 查出并修好，锚点唯一性、`_footerActions` 与其他组件共用这一后缀、以及宿主 JSX 里 footArea>footerActions/settingsArea 的嵌套关系，三条都由 `tests/host.sidefoot.test.cjs` 对着实装宿主与壳的 `app.asar` 现测（壳不在这台机器上时具名跳过，不算通过也不算失败），像素侧由 `wash:check` 的 `side` 组九判据现测（夹具把宿主自己写给这三个类的规则、声明 `--dsh-sidebar-inline-padding` 的那条规则、以及宿主带负 margin 的 `._regionArea` 一起搬进页面；右缘与填充两条判据比的是**宿主现读的变量与同列兄弟的矩形**，不是我方写的数）；`bqrRRG` / `nArs4W` / `qDHVXG` 三组在宿主安装物与页面运行时样式里 **0 命中**，自 10.8.0 起进独立的 `retired` 池而不再挤 `drifted`（对抗评审 J1：它们只为未经测量的 0.1.x 线保留，在能量产的宿主上只能缺席，留在 `drifted` 里等于让本文承诺的正向信号永不可达；换稳定锚点属 Roadmap A 既定范围；其中 `qDHVXG_fade` 那个面在 10.8.0 已由哈希无关锚点接管——它此前就是"规则还写着、测试还绿、页面早已不生效"的活例子）；`lXshSW_*` 组宿主 CSS 仍在、面未挂载。**10.12.1 起的通道现状（两台都实测过，登记在 `scripts/data/dead-hashes.cjs` 的 `CHANNEL_DIVERGENT_GROUPS`，按 CSS module 路径而不是基名对齐，每轮由 `tests/hashes.test.cjs` 从壳的字节重推导）**：`.lXshSW_root, ._7yHdaG_panel`（todo 面板 + 队列坞的 `backdrop-filter` 磨砂）在 npm 渠道有效、在官方壳上**这条精修不生效**——壳把同两条 module 画成 `aSus8q_*` / `v1kfCW_*`，宿自己的 `--dsw-specific-menu` 底色还在，所以是外观差不是坏面；`.uV2eYG_root`（清掉 composer 那条底纹）在壳上同样不命中，但它**无害**：壳的 `RlGAzG_root` 那条声明块里根本没有 `background`，没有东西可 undo，而且这条规则本来就带着我方自有的 `[data-dsh-dream-skin-composer]` 选择器一起走。两组都在 `anchors.channelAbsent` 点名而不是 `drifted`。**已知未取的便宜**：没把 `.uV2eYG_root` 从探针组里删掉、也没让它因自有属性而算"命中"——自有属性是我们自己发的，不能替宿主的哈希担保（T1 那条纪律），诚实的说法是"这条哈希在这条渠道上没有"。 |
| 水洗态三处外观锚点（issue #96 / #97，v10.8.0；标题条伪元素那一处 v10.9.1）：`APP_FRAME_SELECTOR` = `div:has(> [data-shell-overlay])`（AppFrame，靠壳自己发布的稳定属性定位；**它的 `::before` 是第二个盒子**，`background-color` 传不进去，所以水洗态另有一条以 `…::before` 结尾的规则——那条带子是宿主的 Windows 标题条，画的是 `--dsw-specific-sidebar-fill` 且跨整幅窗宽，同时带着 `-webkit-app-region: drag`）与 `SESSION_FADE_SELECTOR` = `[class$="_fade"]`（会话列表末尾那条 fade，靠**类名后缀**而不是哈希） | 宿主自发布的稳定 data 属性 + 类名后缀形状，**不是构建哈希** | 翘角缺口回来、左栏底部渐变带回来（外观损失，功能无损） | 两条都进了漂移探针（Web 8 组、桌面 9 组），并为此给分类器补一条**属性锚点读法**：`[class$="V"]` 要求宿主自己的 CSS 里存在**以 V 结尾的类选择器**、`[data-x]` 要求宿主仍声明该属性名。取「结尾匹配」而不是子串，是为了让 `_fade` → `_fadeFoot` 这种改名报「漂移」而不是「健康，只是没挂载」——子串判定会放过唯一该告警的情形。 **#97 的遗留哈希并进了水洗门控的同一条规则**（`html[…wash] [class$="_fade"], html[…wash] .qDHVXG_fade`），表里不再有一条常驻的哈希 fade 规则；工艺门 `wash-fade-neutralised` 的候选集也扩成**任何提到 `_fade` 令牌的规则**（含哈希形态），并按**分支**判水洗门控（逗号列表里任一支单独生效）、按**整条规则**判是否带哈希无关锚点。评审实测过这件事为什么必要：旧候选集只吃属性形态，于是一张 11/11 全绿的审计旁边就躺着一条约常驻的哈希 fade 规则，任何门都看不见它。 圆角声明带 `!important`：我方特异度 (0,3,2) 已经胜过宿主的 `[data-windows-titlebar] .<hash>_frame` (0,2,0)，唯一还能压过我方的是宿主把该变量写进行内 `style`——那是字符串级门永远看不见的位置，所以按 issue #63 那条 `background-color` 的同款做法加一道保险。 **如实写明的五条边界**：① `data-shell-overlay` 在两台宿主的 CSS 里 0 命中（全树唯一命中是 JSX 里的 `querySelector` 字符串），故属性分支对它只能判 `drifted`，永远判不出 `notMounted`；② `_fade` 后缀形状被同机安装的第三方插件 `@linxin666/dsh-client-ui-skin-center` 同时使用（它写 `[data-slot="sidebar.workspaces"] [class*="_fade"]`）——**10.9.0 起这条不再靠推演**：普查（`scripts/host-consumers.cjs` 的 `fade` 一节，宿主语料 + profile 里 33 个插件包）实测**五个 owner、两个真会被我方后缀锚点命中**（宿主 workspace 与 skin-center），逐个包登记形态与可命中性并冻结进 `scripts/data/host-token-census.json`，由 `tests/fade.owners.test.cjs` 按包名看守（未登记的 owner / 与测量矛盾的处置 / 语料读不到，三种情形点名翻红）；**谁盖谁**由计算样式门的 `coexist` 组在真实引擎里量：把本机安装的 skin-center bundle 按它自己的 `scoped()` 语义还原成规则、与我们的规则放进同一页，用**行内哨兵**（`background: rgb(1,2,3)`）读计算值——我方规则下哨兵仍在（普通声明，压不过行内；`coexist-ours-not-important`），它们的 `!important` 一进场哨兵消失（**更强的车道是它们**，`coexist-their-lane-stronger`），而用户看到的那条带子在两种世界里都是 `none`（`coexist-user-result-agrees`）；它们更宽的 `[class*="_fade"]` 确实会罩到 chat 的 `_fadeTop`/`_fadeBottom`，但它们只写 background、那两个面靠 mask 说话，计算值三态不变（`coexist-chat-mask-untouched`，本机实测）；③ 该变量在两台宿主各有 2 个 `border-radius` 消费点（中间列 + 右侧全屏面板），钳 0 会一并抹平——同族缺口，视为有意结果而不是副作用失控；④ macOS 宿主在自己的 CSS 里对那一族 fade 直接打了 `display: none`（本轮在 npm 宿主的 CSS 串里量到，规则形如 `[data-platform=darwin] <hash>_fade`），所以 mac 上本来就没有这条可见的 fade，本版也无从在那台平台上目视；⑤ 计算样式门（`npm run wash:check`）的夹具页**不再有任何手抄宿主类名**：fade / chat 一族自 10.9.0 起由 `hostFadeClasses()` 从刚读到的宿主 CSS 推导，`pI_x6G_frame` / `centerCol` / `sidebarCol` 三枚自 **10.9.1** 起由 `hostLayoutClasses()` 同源推导（`docs` 这一条欠账至此关闭）。推导而不是抄，在 #96 这一族上不是整理：我方规则靠**结构**命中 frame，过期类名不会让我方规则失效，只会让**宿主**的规则失效——于是页面测的是一条没人画过的带子、照样读到"透明"、照样"通过"，正是 issue #97 的形状往上层复发。现在宿主重掷哈希会让夹具**拒绝构建**（"夹具会造一个它声称要读的类"），而换哈希本身（`AAA_frame` → `BBB_panel_frame`）由用例证明是**跟着走**的。<br>**10.9.1 新增的九处读数 / 十条判据**：标题条 `::before` 的计算底色、`background-image`、`content`（盒子是否仍在生成）、`-webkit-app-region`，再加**几何三件**`top` / `height` / `transform`，外加参照元素与侧栏列两条对照；判据按 id 点名为 `caption-paints` / `caption-composites-like-content` / `caption-stack-is-column-deep` / `caption-comparison-is-alpha-sensitive` / `center-column-paints` / `caption-image-is-our-token` / `caption-restored` / `caption-box-alive` / `caption-still-drags` / `caption-band-shaped` / `caption-band-anchored` / `sidebar-column-paints` / `sidebar-column-untouched`。水洗态 `rgba(17, 15, 20, 0.75) → 与内容列**合成后**同色（corner 夹具的颜色自 **10.10.0** 起从发货 bundle 现读、不再手抄：plain 态带子是 nebula 的 `--dsw-specific-sidebar-fill` = `rgba(17, 15, 20, 0.75)`，水洗态带子与内容列各自把 `rgba(19, 17, 22, 0.4)` 合成到 `rgb(70, 68, 72)`、各 3 层。数值随夹具取色而变——10.9.3 时代这一行写的是 `rgba(16, 16, 24, 0.75)` / `rgb(68, 68, 74)`，那是手抄颜色下的实测值；不变的是「两侧合成同色」这条判据，改的是取色来源）→ 回到 0.75`、`app-region` **严格等于** `drag`、`content` 两态都不为 `none`、侧栏列三态恒等，几何三件在 plain 态必须是"贴窗口顶 / 有真实高度 / 无位移"且水洗态与 plain 态逐字相同。**这里栽过一次，单独记**：`caption-still-drags` 的第一版写"含 drag"，蓝军 B1 用 `content: none`（取消伪元素盒子）实测出 **craft 11/11 + smoke 134/134 + `wash:check` exit 0 三门全绿**——因为 Chromium 把 `none` 规范化成 `no-drag`（子串正好放过），而**计算值在一个不再生成的盒子上照样是 `drag`**。现在三道门分别把：`content` 读数、`app-region` 严格等值、craft 的**白名单**（该规则必须**恰好一条声明**、属性名必须是 `background` 简写、值必须是 `transparent !important` 或 `none !important`，候选集是**全表每一条水洗门控的伪元素块**而不是"第一条匹配"）——黑名单式的"禁止声明 content / display / visibility / all"在 10.9.1 第一轮里是本机写下的形态，**同轮裁定（J1）把它换掉了**：往这条规则里加第二条声明 `transform: translateY(-34px)` 时，四个名字的黑名单与填充 / 图片 / `content` / `app-region` 四条读数**全部照常绿**，而用户能抓的那条带子已经不在窗口顶上（几何三条读数 + 条数白名单就是补这一处）。反向变异五条：删掉整条伪元素规则 → **只有** `caption-cleared`（10.9.2 起改名 `caption-matches-content`、判据从「必须透明」换成「等于内容列」；**10.9.3 起再改成 `caption-composites-like-content`、比的是合成值**——见下一组条目）翻红、圆角与 frame 填充与侧栏列三条不动；只去掉 `!important` → **仍然透明**，因为我方 (0,3,3) 本就压过宿主 (0,2,1)，那枚 flag 挡的是"宿主写行内 `style`"这一看不见的情形——**与 #99 的 `!important` 结论方向相反，两边都是量出来的**，不是把上一条的教训照抄；规则声明 `content: none` → craft + smoke + 活页三门一起翻红；把简写换成长手 → craft 与 smoke 翻红而**活页不翻**（今天的宿主画纯色，该处判据归 craft 管）。**裁定轮（J1/J4）另 11 处变异 + 上面八处旧变异在白名单形态下全部重跑**，逐条与预期一致：植第二条声明 `transform`（craft + smoke + 活页三门齐红）、声明换成 `inset`（同样三门）、在页面别处偷偷加一条水洗门控伪元素规则（只有 craft 红——如实记：这一处归 craft 管）、改锚点拼写并植入几何声明（craft 红）、**改锚点拼写而声明正确**（craft 绿 / smoke 红：smoke 是字符串门，它钉住我方拼写这件事照实写）、**同一条正确规则把 craft 的锚点图案换回严格版**（当场红——这条方向性测量说明放宽锚点买到的是"少一次假红"，不是放松检查）、判据丢掉 `requires`、夹具给字段改名、三条几何读数从夹具删掉、`requires` 字段名打错、**新字段门自己的锚点指错页**（给新门做的真空测试：指错就红，不会静默放过）。 |
| composer 输入框（`COMPOSER_ANCHOR_SELECTOR`：`data-composer-input` 主锚 + textarea/contenteditable 三级兜底） | Lexical DOM 形态 | 输入框透明度滑杆失效 | issue #50 三轮修复后改为稳定指纹优先 |
| `--dsw-alias-*` / `--dsw-specific-*` token 名（如 `--dsw-specific-sidebar-fill`） | 官方 token 契约 | 对应通道不上色 | token 契约已文档化（[themes-spec.md](./themes-spec.md)），这也是**建议官方承诺稳定的接口面** |
| 设置插槽 `settings.section` / `settings.dreamSkin.item`（`lib/client.js` 之 `SETTINGS_NS` / `renderSlot` 注册处） | 官方插槽名 | 设置 UI 不出现，皮肤仍生效 | 属公开插件 API；跟随官方命名 |
| 第三方壳的侧栏面（issue #55 原型 + issue #99，v10.8.1）：我方两条规则**都只读**类名 `.dshDesktopSidebarSurface`（`lib/client.js` 之 `DESKTOP_SIDEBAR_SELECTOR`），#99 那条再多挂一个**我方自己发布**的水洗标记 `html[data-dsh-dream-skin-wash]` | **非官方壳（`anywhere-labs/dsh-desktop`）的类名**——壳改版即失配，这是本行唯一的真实赌注。壳的模式/材质 `data-*` 标记只是**病灶成立的条件**（壳在自己那条 `material=off` 规则里画底），我方选择器并不读它们：它们变了不影响我方规则命中，它们还在也不代表我方规则被验证过 | 两条分开看：#55 那条（`--dsw-specific-sidebar-fill: inherit !important`）失效 → 桌面侧栏透明度不一致；#99 那条（水洗态 `background-color: transparent !important`）失效 → 滑杆"看着能动、像素不变"，因为壳在**同一个元素**上画了 `background: var(--dsw-alias-bg-layer-1)`，而 **Windows 上材质恒为 `off`**（`environment.ts:24` 只承认 off/transparent/acrylic/mica，`:51-53` 把 acrylic/mica 折成 off，`:58` 与 `:61` 对 `win32 + transparent` 直接 `throw`；两条 paint 规则在 `styles.ts:23` 与 `:24`，那一对声明在 v2.0.5→v2.0.17 md5 相同，**不是新版回归**） | 同一个类名锚点已被漂移探针覆盖（`isDesktopShell()` 门控，不新增无人监控的选择器）；机制取证走计算样式门的**第二个夹具**（`npm run wash:check` 的 `desktop` 组，**按皮肤从发货 bundle 现读 token**，没有手抄颜色）：abyss `rgb(26,28,33) → rgba(0,0,0,0) → 回到 rgb(26,28,33)`、mist `rgba(240,248,255,0.62) → rgba(0,0,0,0) → 回到 0.62`，外加三条读数是别的门看不见的——从壳面往上的**不透明阻断链**（水洗态必须为空）、`elementFromPoint` 命中的元素必须是侧栏本身（否则"透出壁纸"这个前提就是假的）、以及"写一个哨兵 token 看像素跟不跟"的**滑杆扫描**（壳的阴影值重新赢回来时这一条会翻红，也就是 #55 半边的回归门）。反向变异两条都跑过：删掉我方整条规则 → 水洗态仍画 layer-1；**只去掉 `!important`** → 壳以 (0,3,1) 压过我方 (0,2,1)、那层底重新画满。**我方选择器并不比壳更具体**，`!important` 是承重的，这一句现在是用例而不是说法。**如实降级**：夹具里的壳 CSS 是**按 tag 抄进来的快照**（provenance 记 `anywhere-labs/dsh-desktop v2.0.17 / styles.ts:13,14,22,23,24,38`；守卫按**声明级**核对 4 处被读的声明，用例还能递给它一份删减副本验证"少一处就拒绝构建"），壳改版**不会**让快照翻红——它证明的是"这条规则在该世代能赢这份层叠"，不是"真机上已复核"。**已知外溢（有意结果，不是失控）**：win32 + 增强模式下这块 aside 是 `grid-row: 1 / -1`（`styles.ts:38`），标题条下面那一条也跟着一起透——同属"壳的底压在壁纸上"这一族。**未验**：本机未装该第三方外壳，v2.0.17 真机目视 0 次 |
| `[role="dialog"]` 等 ARIA 契约（`COMPOSER_ANCHOR_SELECTOR` 兜底与 `isInDialog` 判定时使用） | 无障碍标准 | 理论不存在失效 | ARIA 是规范而非宿主私有物 |
| 设置导航图标（`lib/client.js` 尾部 IIFE：在 `[role="dialog"] nav button` 里匹配**我们自己注册的 section label**（`Theme / 外观`）里的 `Theme`，再打 `data-dsh-dream-skin-nav` 标记。10.5.0 实机后收紧：早先还匹配裸「皮肤」，而真机上那一行属于第三方插件 `web-ui-skin-center`——等于把别人的导航图标涂掉并隐藏其原 svg（越界装饰，非崩溃）。代价如实写明：宿主若把我们那一行渲染成不含 "Theme" 的字样，图标退回齿轮） | ARIA 结构 + **人类可读文案** | 图标退回默认齿轮（纯装饰损失，功能无损） | 比 CSS 哈希类名稳，但改文案或换语种即失配；10.5.0 起自检上报 `navIcon{dialogs,buttons,marked,armed}`：`armed=true && marked=0` 只说明面板没开，`armed=false && sheets<=1` 才可以说"这个构建没钩上"。漂移探针**不覆盖**这一条（探针只管材质精修）；10.5.0 起钩子有完整生命周期——fiber 卸载拆除（观察者 / 行标记 / 图标表三样）、同页重挂复臂，generation 令牌防旧代误杀新代，控制柄 `arm(gen)` / `dispose(gen)` 不可枚举 |
| 右侧栏 dockkit 面（PR #65 / v10.6.0：`[data-sidebar-right-panel]` 祖先门 + `[data-dockkit-host=dock] > section`、`[data-dockkit-empty]`、`[data-sidebar-right-guide-entry]`） | 宿主自己发布的**稳定 data 属性**（非哈希类名；分别由 `dsh-client-ui-sidebar-right` / `dsh-client-ui-sidebar-terminal` / frontend 共享 tab-cell 写入） | 三条规则静默失效：右栏底色不再跟随侧栏滑杆、全屏又透出对话、胶囊 hover 丢底色（外观损失，功能无损） | 属性名比构建哈希稳，**但漂移探针不覆盖**——探针只采哈希类名，宿主改这些 data 属性同样零信号（与「设置导航图标」同一类盲区，PR 正文已如实记为已知盲区）；作用域门与水洗门都有正反双向断言，合并前 5 处变异抽查逐条能翻红（含"把水洗门塞进规则①"这一恒真守卫反例形式） |
| alpha.1 底栏区域 `shell.bottom`（稳定属性 `data-shell-bottom`；哈希类名 `pI_x6G_bottomRow` 只作**证据**，不作选择器） | 宿主自发布插槽 + 稳定 data 属性，**0.2.1-alpha.1 起才有**（rc.1 / rc.2 里 `data-shell-bottom`、`bottomRow` 均 0 命中，实测三版 `dsh-client-ui-layout` 包内） | 若将来有注册方挂进来：宿主给这块用的底是 `background: var(--dsw-alias-bg-base)` —— **正是我们画布水洗写的那枚 token**，于是可能出现一条随壁纸滑杆一起变透的全宽条，滚到底时对话内容从底下透过来（与"右栏全屏透出"同族） | **本版不改代码、只记录边界**（issue #90 的三选一之第二支）：冻结语料里 `shell.bottom` 的注册方 **0** —— 无注册方时 `renderSlot` 渲染空元素，而 frame 的行轨道在 alpha.1 改为 `minmax(0, 1fr) auto`，空的那一行塌成 0 高，**当前没有可上色的面**。这条判断带**到期条件**：注册方计数由普查冻结、`tests/host.slots.test.cjs` 看守，计数一旦非 0 或 `data-shell-bottom` 在语料里出现，门就翻红并逼着重做决策；分类真源是 `scripts/lib/host-slots.cjs`（含 `since: 0.2.1-alpha.1`）。**未验证**：该底栏在活页面上一次都没看过（本机实装为 rc.1，不允许为验证升级实装） |

## 会话字号区间：活页只测过 14 px，极值的计算样式已采样（issue #93）

宿主 `dsh-client-ui-theme` 的「会话正文字号」步进器区间在 **0.2.0-rc.2**（当前 `latest`）由 `12–17 px` 放宽为 **`10–22 px`**，默认值仍是 `14 px`。我们**不写**对话字号，所以这不是代码冲突；但**本仓库所有"可读"结论都是在原区间的默认值上测出来的**，两个新极值的**真机活页**一次都没看过（极值下的**计算样式**已在独立夹具里采过一轮，见本节末与文末未验证清单那条）。本节把这两件事分开钉住。

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

**因此这条的诚实表述分两半**：字号极值改变的是**要求**，不是我们**测出来的数**——我们的门没有能力发现"10 px 下这枚三级墨色不够读"，因为它压根不看字号。**这半分已经有了数**：2026-10-09 用 `scripts/font-extreme-sample.cjs` 在**独立夹具页**（不动本机实装，rc.1 仍是 12–17 且不允许为验证升级）把 `--dsh-content-font-size` 直设 10 / 22 px，三套皮肤 × 两个极值 × 三读数，对比度全格 ≥ 5.59、气泡填充 alpha 两档逐字相同，数据冻结在 `scripts/data/font-extreme-samples.json`。**另一半仍未验**：真机活页与像素观感——`10 px / 22 px` 的**目视**各 0 次，既不是"推测读不出来"，也不是"已验证"。

**措辞规则**（本文与 README 一并适用）：凡出现"在宿主默认字号下"一类表述，必须写成「**在宿主字号 10–22 区间内的默认值 14 px 下实测，极值未测**」，并且**紧跟一次限定**：这里的"极值未测"指**真机目视**未测，计算样式极值已采样（上一条）。别让读者以为验过整个区间，也别让"极值未测"被读成"根本没测过"——两半都得在句子里点名自己说的是哪一半。`tests/desktop.fontscale.test.cjs` 的门（#107.1 / #107.2）盯的就是这个：绝对化的"从没测过"句式若出现在还写着"计算样式已采样"的同一份文档里、又不说清是哪一半，判红。

**要补的实测**（属可牺牲环境的活页复核，**不在本机做**——升级本机实装会打扰用户运行实例；计算样式那一半已按同一清单在本机夹具里做过，剩下的正是目视不可替代的那部分）：字号 = 10 px 与 22 px 各一轮，每轮采样 `--dsw-specific-bubble` 计算色、composer 卡片 `::before` 的 alpha、`--dsw-alias-label-tertiary` 压在气泡 / 代码块上的计算前后景；皮肤至少覆盖最浅端与最深端各一套、弹窗滑杆两端各一次。**若 10 px + 最浅端确实读不出来，那才是产品问题**，处置（提高三级墨色最低 alpha、或给最小字号加保护）另立 issue，不在本验证条目里顺手改代码。

## 安全边界

## 安全边界

- `/dream-skin/api`：仅回环 Host（或显式配置的 trusted authority）+ `sec-fetch-site` / Origin 同源校验 + 严格 JSON 围栏 + 32 MiB 体积上限（`lib/index.js` 之 `isTrustedApiRequest()` / `readJsonBody()`）。防 DNS rebinding / 跨站打点。**无鉴权**——设计目标是本机单用户场景，文档如实声明。
- 壁纸 URL：仅 `http(s):` / `data:image/`，控制字符拒绝，出口转义（`lib/client.js` 之 `isSafeWallpaperUrl()`）。
- 渐变值：**先规范化、再判定**（v9.27.0，A-2.1）——`normalizeCssForInspection()` 剥 `/*…*/` 注释、解码 `\75 rl(` 一类 CSS 十六进制转义（最长 6 位 + 单空格 terminator）、`\c` 字面转义与 `\<换行>` 续行；解码出的换行/CR/FF 按 CSS 语义**删除而非插回**（round-2 R-1：`\a` 若插回串中会造出 `u\nrl(` 躲过 denylist 的 `url\s*\(`），NUL 解为替换符；规范化形还要**再过一次控制字符门**（解码本身可能引入控制符，原值一道+规范化形双门）。denylist（`url(` / `image-set(` / `element(` / `cross-fade(` / `expression(` / `@import` / `javascript:`）与前缀 allowlist 都跑在 CSSOM 解析器会看到的形态上；存的是原值、校验的是规范化形。遗留 `-webkit-linear-gradient` **策略性拒绝**（A-2.2 决策：运行面是常青 Chromium，旧版语法不同族的前缀变体不予放行——放一个就要考虑放一片，收紧是安全方向；若未来要改判，回归测试 "legacy -webkit- prefixes are a DECLINED policy" 必须同步显式翻转）。三道把关不变：写入、渲染、宿主采纳（`isSafeWallpaperGradient()`）；渲染层忽略被存下的不安全值时**不再静默消失**——`warnRenderGateSkip()` 每值一次 `console.warn` 说明原因；去重集合封顶 20 后**按 FIFO 淘汰最旧**而非永久静默（round-2 R-5），第 21 个新值照常出声；该集合是 **window 单例**（`window.__DSH_DREAM_SKIN_RENDER_GATE_SEEN__`，页面内纯状态，零网络零持久化）——「一页一个封顶」才是这条防洪水机制的真实语义，闭包私有 Set 会让每个模块实例各自计数、封顶几乎永不生效（也正是 R-5 首版回归用例压根不可能失败的根因，见下）。
- 主题包导入：本地文件 / URL hash base64，结构 + 十六进制色值校验，失败回滚，**不发起任何远程拉取**（`lib/client.js` 之 `tryImportFromHash()` / pack 校验路径）。
- 出厂壁纸：原创抽象弥散光壁纸，**内联 SVG**（3.4KB data URL，零远程请求）。v9.27.1 起改为矢量：壁纸层默认是 `background-size: cover` 的满屏节点（v9.29.0 起填充方式可由用户改选，出厂默认仍是 cover），此前那张 1200×678 位图在 2K 屏上被放大约 2.1×，JPEG 宏块变成肉眼可见的方格（Chromium 实测 2560×1440：旧位图 90.0% 相邻像素同色、最长纯色带 853px、中列仅 136 级明度台阶；矢量版同测点 1.7%／6px／1126 级，并带 128px 接缝对齐的抖动颗粒防色带）。
	  历史出厂图由一次性迁移自动替换（**三重指纹精确匹配才写入**：字符串长度 + 解码字节长度 + cyrb53，`LEGACY_FACTORY_WALLPAPERS` / `migrateLegacyFactoryWallpaper()`，两组三元组常量中 **entry 2 由真实资产反算钉死**（见下"已验证"清单），entry 1 只有字面量钉子 + 合成载荷算法用例、数值靠对 git 标签复算核对）：entry 1 = v9.13.0–v9.23.0 的真人照片（品牌与许可），entry 2 = v9.24.0–v9.27.0 的位图光晕（分辨率）。除这两条精确匹配外，任何自定义照片、已清除状态一律不动。
	  旧照片的处置：**代码与测试中只以三个数字指纹存在**；原图仍在 git 历史（维护者决定不重写）；曾含旧图的两张 `docs/screenshots/` 真机截图**自 v9.26.1 起已移出 npm 包 `files`**（此前随包分发，属失实暴露面），仓库内保留至真机重截后替换。插件运行期不分发该图像。
- 遥测：**无**。唯一第三方网络目标：可选开启的"必应每日壁纸"定时刷新（域名为第三方 uapis.cn 代理，默认关闭、显式开启，`lib/client.js` 之 `runScheduledWallpaperRefresh()` / `startWallpaperRefreshScheduler()`）。

### 可审计能力面：宿主模块说明符（`require` 的全部取值，10.16.0）

（外部 issue：`AI-Scarlett/DSH-Store#1411`，2026-10-15 追评。本节与下一节就是给这条审查项的答复。）

第三方目录的复核方提出：`require(name)` 这种写法**扫描器无法证明其调用集有限**（人也不能——闭包可以被任何值调用），因此列为收录阻塞项。原话存档在 `docs/evidence/dsh-store-1411-followup-2026-10-15.md`（含正文 sha256，`tests/client.audit_surface.test.cjs` 会重算）。处置不是解释，而是**把它变成可枚举、且被门守住的事实**：浏览器半边不再有任何值流进 `require`，全部说明符写在调用点上；下表与 `lib/client.js` 的调用点由门**双向、同序**核对（文档多一行 ⇒ 红，代码多一个 ⇒ 红，顺序被调换 ⇒ 红），每一枚还必须被 `package.json` 的 `peerDependencies` 覆盖（第三把尺）。

| 宿主模块说明符 | 用途 | 缺失时 |
|---|---|---|
| `react/jsx-runtime` | JSX 编译产物所需的运行时 | 降级为哑模块 |
| `react` | 组件与 hook | 降级为哑模块 |
| `@deepseek-ai/dsh-client-store` | master 代设置 store 工厂（`defineStore`） | 先试它，失败才试下一枚 |
| `@deepseek-ai/dsh-client-runtime/client` | 稳定版（≤ `0.1.1-rc.x`）的同能力 seed | 三枚必需 seed 全缺才降级 |

> 表下四行即**全部**取值，行序即探测顺序。门不抄这份名单：它从 bundle 现读、从文档现读，两边必须一模一样。

### 页面侧能力矩阵（同一节内，脚本双向核对）

复核方的另一条开放项是"真实文件/网络能力"。下面这张表就是回答，而且**不是一段散文**：`tests/client.audit_surface.test.cjs` 逐个 token 现扫 `lib/client.js`，与表里"存在/不存在"逐格比对——代码里冒出一枚表里写"不存在"的 API 会红，表里写了代码没有的也会红，代码用了而表里没有的同样会红。

| 能力 / API | 状态 | 边界 |
|---|---|---|
| `require("…")` | 存在 | 宿主模块解析。全部取值就是上表那四枚**字面量**，门核对调用点与表格同序相等 |
| `fetch(` | 存在 | 唯一实参是常量 `HOST_API`（见下）。目的地只能是**当前页面自己那台宿主**的路径，脚本里没有第二个 fetch 目标 |
| `localStorage` | 存在 | 本插件自己的 `dsh-dream-skin:*` 键（皮肤、历史、诊断缓存），不读别人的键 |
| `new FileReader` | 存在 | 读**用户主动选中**的本地图片/主题包文件（两处：壁纸导入与主题包导入） |
| `type: "file"` | 存在 | 文件选择入口，由用户点击触发；不是后台扫描目录 |
| `URL.createObjectURL` | 存在 | 导出主题包时给内存里的 JSON Blob 生成对象 URL（无服务器参与） |
| `a.download` | 存在 | 配合上一条把 Blob 交给浏览器保存对话框——写用户磁盘这个动作由用户发起 |
| `canvas.toDataURL` | 存在 | 把用户选中的图片本地压缩成 data URL（像素在本机处理，不外传） |
| `navigator.clipboard` | 存在 | 复制分享链接 |
| `document.execCommand` | 存在 | clipboard 不可用时的同能力回退（隐藏 textarea + `copy`） |
| `XMLHttpRequest` | 不存在 | 不使用 |
| `WebSocket` | 不存在 | 不使用 |
| `navigator.sendBeacon` | 不存在 | 不使用 |
| `EventSource` | 不存在 | 不使用 |
| `import(…)` | 不存在 | 不使用（没有动态导入，模块名无法由数据拼出） |
| `eval(…)` | 不存在 | 不使用 |
| `new Function` | 不存在 | 不使用 |
| `new Worker` | 不存在 | 不使用 |
| `SharedWorker` | 不存在 | 不使用 |
| `navigator.serviceWorker` | 不存在 | 不使用 |
| `indexedDB.open` | 不存在 | 不使用（浏览器侧持久化只有 `localStorage` 与宿主状态文件两条） |
| `sessionStorage` | 不存在 | 不使用 |
| `document.cookie` | 不存在 | 不使用、不读取 |

三条常被误读的事实，写清楚：

- **网络的两条通道性质不同**。`fetch` 只有 `HOST_API` 一个实参，其值是 `new URL("dream-skin/api", document.baseURI || "http://localhost/").pathname`——**只有路径、没有协议与主机**，因此只能是"当前页面自己那台宿主"注册的 `/dream-skin/api`（路径末段与 `lib/index.js` 之 `API_PREFIX` 由门逐字核对；页面若挂在路径前缀下，请求前缀随之改变，但**永远不离开该页自己的 origin**）。另一条是**壁纸图片本身**：用户在设置里填什么 URL，浏览器就按那个 URL 加载一张图——这是产品功能而不是插件的私设目的地，scheme 只允许 `http(s):` / `data:image/`（见「安全边界」）。**插件不代为发起任何后台第三方请求。**
- **必应每日壁纸**是一枚**出厂预填在输入框里的示例 URL**（`https://uapis.cn/api/v1/image/bing-daily`），预填不等于生效：`wallpaper-kind` 出厂不是图片档、定时刷新默认关闭需用户显式开启，因此首启不会产生对该域的请求（由 `tests/client.persistence.test.cjs` 的"first launch pre-fills … but never applies it"钉住）。
- **文件的读写**：浏览器半边**不直接碰文件系统**。选文件是用户点击 + `FileReader`（读到的内容进本机 data URL / localStorage / 宿主状态文件），导出是 `Blob` + `URL.createObjectURL` + `<a download>`（保存对话框由用户发起）。真正读写 `$DSH_HOME/dream-skin.json` 的代码全部在**宿主半边** `lib/index.js`，且只写它自己那一个路径（及其 `.tmp`）。

**这张表的边界**：门核对的是这份**词汇表**里的 token，词汇表本身由人列——它覆盖"能带来文件/网络后果"的 API，不等于"所有 Web API"。文档里若出现词汇表之外的行，门判红（防止两边各写各的）；真正的盲区是"我们没想到要列进去的新 API"，这条诚实边界写在下面「已验证 / 未验证」。

## 已验证 / 未验证（诚实清单）

**已自动化验证**（`npm test`，583 用例（10.23.0 发布时 571；壁纸取景分支 **+12**：9 条取景行为 + 低功耗 × 取景 + 取景只重绘不改布局 + 轮换不归位取景；**1 项预算门未决**（`lib/client.js` 越过 480 KiB 天花板，见 PR #108）；571 那一版的 **+2** 全在 `tests/client.smoke.test.cjs`（issue #110 自动低功耗：三态解析 / OS 翻转 / 固定选择压过系统 / 交还给自动 一条，监听器按 fiber 归属与遗留卸载一条），10 次反向破坏里 **8 次各自点名翻红、2 次故意留绿并把原因写在 CHANGELOG 里**——store 的 init 值与 `restorePersistedState()` 的重发在假世界里不可观测）；上一轮 +1 是低功耗菜单下限的 #115 回归；再上一版 +18 全在壁纸轮换：`tests/client.smoke.test.cjs` +16、`tests/client.storage.test.cjs` +2），Node 18/20/22/24 CI；用例总数由 `tests/docs.numbers.test.cjs` 现场加载整套件数出并与此处比对，不是手抄；本轮 **+1** 在 `tests/client.smoke.test.cjs`（issue #110 低功耗模式：默认两根模糊层都在 / 打开后只剩一层且 `filter:none` / 材质表确有该规则 / 设置动作三层同帧翻转；两次反向破坏各自翻红），上一版 10.21.0 的 **+4** 全在新文件 `tests/host.cordis.test.cjs`（把插件挂进宿主自己的 cordis：框架注入规则见证 1 + 0.2.1 形态 1 + 0.2.0 形态 1 + 无信任服务 1；无宿主机器具名跳过），起因是 10.20.0 的降级链用属性访问读未 inject 的服务、在真 cordis 上每个请求抛错——同轮把 `tests/host.persistence.test.cjs` 的 harness 改成 Proxy 复刻注入规则（退回属性访问 → 12 条翻红）；上一版 10.16.0 的 **+9** 全在新文件 `tests/client.audit_surface.test.cjs`（九条腿：L1 `require` 实参必须是字面量 + L2 `requireSeed` 只吃 thunk + L3 文档表与调用点同序双向核对 + L4 每枚 seed 被 `peerDependencies` 覆盖 + L5 真启动记录实际问到的说明符（两种宿主代） + L6 `fetch` 只能是 `HOST_API` 且其 spec 与宿主 `API_PREFIX` 对齐 + L7 有/无 `document.baseURI` 两种页面下目的地必须无 scheme 无 authority + L8 能力矩阵逐格双向比对 + L9 追评原文存档与 sha256 相符），起因是 DSH STORE #1411 的追评收回体积报告后留下的那句"扫描器证明不了有限调用集"，处置见上「可审计能力面」一节与 `docs/publishing-to-npm.md` §十一；上一版 10.15.0 的 **+4** 在 `tests/package.i18n.test.cjs` 3→6 与 `tests/package.icon.test.cjs` 5→6（后者补"图标经 `./package.json` 才可达"那条，见 CHANGELOG §四 BL-03）；前者（3→6：在场↔导出双向枚举一条、与宿主实测判定表逐格比对一条含"见证必须有两种失败形状"与陈旧见证点名，另把原有通配断言重写为两条"宿主侧读数不变"的对照腿），起因是把 10.14.3 写在发货文档里的那句因果拿去实测——结果是**推断**：通配 `outcome: localized`、从来不是坏的；上一版 10.14.3 的 **+4** 全在新文件 `tests/package.runtime_size.test.cjs`（运行时产物字节天花板 1 + "天花板是余量而不是已通过"1 + 每个发货 JS 必须有预算 1 + 两条腿各自可失败 1），起因是 DSH STORE 的固定 Commit 检查把 `lib/client.js` 442,975 字节标为超出其单文件 262,144 上限——处置见 `docs/publishing-to-npm.md` §十一；上一版 10.14.1 的 **+9** 全在新文件 `tests/docs.machine_readable.test.cjs`（键清单双向核对 1 + 保留键跨源核对 1 + "整节被摘掉必须只报一条"的结构性反向对照 1 + 变异腿 6），且 `repo:eol` 随新文件 120→**121**；上一版 10.14.0 的 **+6** 全在 `tests/host.persistence.test.cjs`（8 → 14：盖章且不外泄 / 遗留文件读法不变并补齐戳 / 更高戳不被降级且未知键存活 / 伪造与删除都不动戳 / 13 行归一化**整表**断言 / 文档在场门），其中"遗留文件"那条**改前是空对空假绿**（比 `mod.STATE_SCHEMA_KEY` 与 `raw[undefined]`，两边都 `undefined`），每条新用例开头补一句"模块必须导出这个键"才转红；上一版 10.13.1 的 **+13** 全在新文件 `tests/host.preflight.test.cjs`（宿主 rc 预检：判定表 6 + 夹具事实 1 + CLI 出口 4 + 清单门 1 + 真载入与它的降级各 1）；上一版 10.13.0 的 **+8 分两笔**（新文件 `tests/host.frosthooks.test.cjs` **+4**（配对一条、磨砂锚点具名一条、变异腿一条、双渠道实测一条），`tests/wash.cascade.test.cjs` **+4**（frost 判决表一条、夹具拒绝面一条、CLI 组名单源文本门一条、引擎变异一条）与 10.13.0 自己的构成口径一并保留；登记表的 carriedBy 两条腿是**加在既有那条变异用例内部**的，所以 `hashes` 仍是 15 条而不是 17 条——这正是"门只核对总数、逐文件构成靠人读"的那个口径的现例。构成用**同一台加载器**现场数出（10.15.0 收尾这轮读到 `client.smoke` 139 / `hashes` 15 / `host.frosthooks` 4 / `host.preflight` 13 / `host.persistence` 14 / `docs.machine_readable` 9 / `package.runtime_size` 4 / `package.i18n` 6 / `package.icon` 6 / `wash.cascade` 43 / `docs.numbers` 13），但要说清门钉的是哪一半：**门只核对总数**，逐文件构成是本轮用同一个 `liveSuiteCount()` 手工读出来的，不是每轮自动守的——写在这里是为了下次能对账，不构成一条检查；漂移探针的通道分叉夹具 4 枚 + 通道分叉登记表的结构性一条、七腿变异一条、真语料重推导一条，再加 `docs.numbers` 自己 1 枚（这道门过去把自己**要看哪个版本块**写成两枚手抄的版本字面量，现在改成从文档自己的标题形状推导；而"我读下来的是不是当前这一版"本身新配了一条反向用例——删掉当前块标题 ⇒ 历史块升上来当当前块 ⇒ 点名红。这条用例一落地就把套件总数往上推了一枚（本轮先按旧数写完文档，是这道门自己报的数不对），正是"改门要回头重算门自己数出来的那个数"的现例）；修复类用例经**变异验证**——逐条反向破坏对应修复，10.12.1 轮（A1 余下半：通道分叉池）另有 **7 腿**登记表面向造假变异（bundle 与登记表不一致 / 登记了却从不探针 / npm 那半其实已死 / 壳里重新画了这枚哈希 / 继任基名被重掷 / "无害"声明与 CSS 规则矛盾 / "无害"声明拿不出证据），每条只在**它自己该抓的那一腿**翻红，且七腿都跑在合成世界上——**没有宿主、没有壳的机器也照跑**，因为登记表如果是被人编出来的，就不该依赖任何一台机器来发现；加 1 条**归属优先于登记**的判决顺序用例（同一组既是宿主自有又已登记时，必须落 `notMounted` 而不是 `channelAbsent`，否则"登记"会变成一条能把任何缺席洗白的橡皮）与 1 条**保守出口**用例（宿主自有表读不到时，已登记的组仍点名在 `channelAbsent`、绝不从四池里消失）；10.8.1 轮（issue #99 整改）另有计算级变异 2 处（删掉桌面水洗门控整条规则 / **只去掉那条的 `!important`**，都在真实 CSS 引擎里重跑后当场翻红）与三组"门自己会失败"的反向用例（壳快照的 4 处被读声明逐处删减必须拒绝构建、`groups` 传空数组或旧的单字符串必须判成检查器故障、等收敛的轮询助手遇到永不收敛必须判红）；10.6.0 轮 5 处（对 PR #65 三条 dockkit 规则：X1 终端胶囊排除拆除、X2 右栏作用域拆除、X3 把水洗门塞进规则①选择器——正是评审抓出的"恒真守卫"病灶的反例形式、X4 全屏两分支之一丢水洗门、X5 水洗标记撤回拆除；另有贡献者侧 6 处反向验证）在隔离副本树逐条打印翻红断言后才写记录；10.5.1 轮 15 处（M1–M9 对 PR #68 面：`POPUP_TOKENS` 摘 layer-2 / 严格解析门 / liquid 地板 / CSS 乘法 / chip 不重发 / liquid tint / 无壁纸重解析分支 / 壁纸路径不重解析 / 厚度基准；E4–E7/T2a/T2b 对本轮新增机制：`fillFor` 的 scheme 门 / 两处回调 `_applyingWallpaper` 守卫 / dispose 清理 / 0.94 与 0.6 两个默认值——**其中六条先在已发运套件（`691e7a2`，98/98 全绿）上实测六次全绿**（裁定方与整改方在两座隔离副本分别复跑证实；这正是裁定把"补门"列为发版前 P0 的依据），加 R1–R6 门后全部翻红，"无门→有门"两侧证据齐备）在隔离副本树逐条打印翻红断言后才写记录；10.5.0 轮 26 处（M1 计划卡锚点改回哈希类名 `.LVzXQa_card`、M2 填充选择器列表里重新混入一处哈希类名、M3 审批卡戳记改名使填充不再覆盖它、M4 液面描边把计划卡换成审批卡、M5 alpha 混合改画在半透明 `--dsw-alias-bg-base` 上、M6 不透明基色换了变量键名（等于不再发布）、M7 导航表查找去掉 `style#` 限定、M8 `arm()` 不再读页面级 `armed`（bundle 重跑即叠出第二个观察者）、M9 `<body>` 尚未解析时照样宣称接管、M10 材质表收养不再限定 STYLE 节点、M11 拆掉 rAF 之外的 120ms 兜底、M12 卸载时额外按 id 移除（连带删掉冒用我们 id 的外来节点）、M13 无 `color-mix()` 的兜底退回半透明 overlay、M14 收养后不再把材质表移回 `<head>` 末尾、M15 漂移告警不再声明"卡片填充不在探针覆盖内"、M16 导航图标匹配式退回「含裸 `皮肤`」分支（那一行在实机属第三方插件 `web-ui-skin-center`；实测翻红的是行级负向控制「the third-party 皮肤 row is not marked」）、对抗评审整改批 M17–M26（M17 审批卡戳选择器收窄成 `:nth-child(2)`——旧的字符串包含式 pin 对同一变异全员常绿、M18 导航表计数恒值 1、M19 匹配式退回子串 `Theme`、M20 分类器短路成全部 drifted、M21 分类器丢掉 `style[data-plugin-css]` 限定、M22 卸载不拆钩子、M23 apply 不复臂、M24 dispose 丢 generation 门、M25 钩子不持有 sheet 句柄、M26 同步门拆除））在隔离副本树逐条打印翻红断言后才写记录；v9.29.0 轮另 15 处（渲染写死 cover、溢出层改 append、渐变档守卫拆除、写入门白名单拆除、渲染门白名单拆除、离开模糊档不断开溢出层、溢出层少 48px、store 漏传 fit、手动应用戳写在渲染之后、手动应用完全不落戳、渲染只在定时开启时 bust、teardown 漏掉溢出层、FACTORY_DEFAULTS 丢该键、SENTINEL_KEYS 丢该键、空链接误点门恢复成修复前的分支）在隔离副本树逐条打印翻红断言后才写记录（M15 的第一次注入把恢复的分支落在 `return` 之后、等价于没改，却打红了「不安全链接被拒」那条——顺藤查到那次注入其实改写了 `wallpaper-kind`，归因不清的翻红不算验证，重写后才精确命中 1 条）；9.27.0 轮含四轮复核整改共 **27 处变异**——第一轮 10 处（A-1 两道门控、A-2.1 规范化旁路、A-2.2 告警静音、B-3 单边加字段、B-4 标志移除、B-6 出口不播种，及 9.26.1 沿用 3 处）、第二轮 7 处（R-1a 换行插回、R-1b 拆除规范化后控制字符门、R-1c 整体退回修复前状态、R-2 解除晚修正观察者、R-4 间隔改绝对、R-5 封顶回退为永久静默、R-6 受控例外分支翻转）、第三轮 6 处（R-4b 数组按"绝对时刻"解释而字面量不变、S-3a 卸载不再断开观察者、S-3b 回调丢掉 `disposed` 门、S-3c 新链不取代旧链，以及文本卫生两处：往 `CHANGELOG.md` 注入控制字节 / 往 `README.md` 注入孤立 CR）、第四轮 4 处（T-1a 拆掉阶梯定时器的取消动作、T-1b 拆掉 `ladderClosed` 门槛、T-1c 整体退回修复前状态即卸载不再处置阶梯、T-1d 新链不取代旧链）全部有用例翻红。本轮把与归因陈述有关的 **6 次既有变异**（R-1a/R-1b/R-1c/R-2/R-5/规范化旁路）连同第三轮新增 6 次，在**隔离副本树**里重跑（变异只作用于副本，绝不触碰工作文件）并**逐条打印翻红断言原文**后才写进记录；其余 11 次沿用上一轮实测，第三轮未重跑；第四轮新增 4 次同样在隔离副本树里实测并打印翻红断言原文，**第四轮未重跑前三轮的 23 次**。此外另做四件**反身检查**（第三轮 3 件 + 第四轮 1 件）：① 把上一轮"归因陈述"（哪条变异由哪条断言抓出）逐条重跑，据此更正了 R-1a 与 R-4 两处记录（见上守卫一节与 CHANGELOG）；② 评审方建议的"已挂判据"（`terminalDrift !== null`）单独反证过一次——采用它会让 3 条用例翻红，等于把 R-2 的修复整个关掉，故改用模块级单一持有句柄；③ 故意保留一次"变异不翻红"作为证据——拆掉 `resample()` 里 `terminalDrift === null` 判空后用例全绿，这一次**绿证明的是代码是死的**（该分支永不可达），据此删除死分支而不是给用例补断言，不虚报为"变异已覆盖"；④ 第四轮补一次**门槛位置的形状实验**（T-1e，不计入破坏数）——把 `ladderClosed` 从 `step()` 入口按评审方建议的形状挪进 `runRound()`，实测唯一翻红的是 `and the slipped step arms NOTHING further — the chain died with the fiber`，"什么都不发布"那条照样绿：两种写法都不发布，只有"是否还挂后续轮次"能分辨门放对了没有）；**rc.2 / alpha.1 整改轮（issue #87–#94）另 24 处命名变异**——`desktop.claims` 4（#87）、`desktop.fontscale` 10（#93）、`hashes` 5（#92）、`host.slots` 5（#90），逐条在隔离副本树跑翻红后才写记录；另修掉 #88 那两条**指错 token、从未跑到被测代码**的旧变异（它们指向 `cover` 分类的 `--dsw-alias-border-l3` / `--dsw-alias-bg-skeleton`，按构造不在冻结缺口里，于是崩在 `undefined` 上而不是翻红——"没跑到代码"与"跑到了没翻红"是两件事，不能记账为已覆盖），重新指向确实被测量的 `--dsw-alias-bg-mask-1`）：
- **10.9.3 轮（标题条带第二轮改判：把"声明相等"换成"像素相等"）**：
  - **先证明送达，再动产品**：桌面 profile 的 `node_modules/dsh-dream-skin/lib/client.js` 落盘 18:39、应用在 18:49 启动、壳的 HTTP 缓存目录里查不到插件资产的任何副本，且从壳自己 serve 的页面（`http://127.0.0.1:19387`，宿主 `@deepseek-ai/dsh` 0.2.0-rc.2）现读 `__DSH_DREAM_SKIN_STATUS__ = {build:"10.9.2", status:"ready"}` ⇒ 报告人看到的就是 10.9.2 的结果，不是缓存、也不是没命中。这一步在 10.9.1 / 10.9.2 两轮各救过一次误判，本轮仍是第一件事。**边界照旧**：读数来自外部浏览器指向壳的服务器，不是那台 Electron 的渲染进程。
  - **层数普查（本轮的真实发现）**：在活页上从被着色元素沿 `parentElement` 走到 `<html>`，逐层读 `backgroundColor` 的 α 再自下而上合成——内容列 = `body` 0.4 + `.centerCol` 0.4 + 列内应用根 0.4（0.784），带子 = `body` 0.4 + `::before` 0.4（0.640），侧栏列同样三层。把 token 改成可辨认的颜色做**哨兵实验**后确认：内容列那三层都随 `--dsw-alias-bg-base` 走，而**侧栏列的第三层不跟**它（读的是另一枚 token，只是当前值恰好相同）。这条决定了本版的边界：带子能精确跟住内容列，跟不住侧栏那一段。第一次实验写在 `:root` 上"一个都没动"，是元素选错——本插件把 token 发布在 **`document.body` 的行内样式**。普查之外另有一份**不由本仓库生成**的证据交叉核对：把报告人那张 3000×1904 的截图按 400px 宽取平均色沿 y 竖切，带子内 `R149–160`、紧贴其下的内容列 `R98`、侧栏 `R104–115`，按"每多一层 α=0.4"反解层数差恰好是**一层**；绝对值受照片自身竖直明暗渐变影响，所以本版承诺的是"补回少掉的那一层"，不是"顶部与页面完全一致"。
  - **修复**：水洗态下 `html[data-windows-titlebar][data-dsh-dream-skin-wash] div:has(> [data-shell-overlay])::before` 仍只有**一条** `background` 简写声明，值改为 `linear-gradient(var(--dsw-alias-bg-base), var(--dsw-alias-bg-base)) var(--dsw-alias-bg-base) !important`（同一盒子内叠两层 token，加上 `body` 那层就是三层、与内容列同深）。`app-region: drag` 与盒子的 `top`/`height`/`transform` 一字未动。语法先在真实页面用等特异度探针实测再写进发货代码。craft 的伪元素白名单相应收成**四种**带 flag 形态（`transparent` / `none` / 单层 token / 双层 token），**硬写颜色照旧判红**；单层形态仍被放行是有意的——craft 管形状，层数对不对归引擎管。
  - **判据换形状（比颜色本身更重要）**：`caption-matches-content`（比两处各自的声明底色）→ **`caption-composites-like-content`**（沿祖先链合成每层 α 后比 `rgb(...)`），并补 `caption-stack-is-column-deep` / `caption-comparison-is-alpha-sensitive` / `caption-image-is-our-token` 三条腿；`stackOf` 修了一处读法错误（伪元素的祖先链从父元素开始走，漏掉宿主元素自己的背景，plain 态少算一层）。本轮变异逐条实测（活页半边在真实引擎里重演、夹具只在内存改；形状半边在**隔离副本树**改 `lib/client.js` 后跑 craft + smoke，工作文件不动）：**① 换回 10.9.1 的 `transparent`** → 引擎只有合成那条红，craft + smoke 也红；**② 换回 10.9.2 的单层写法** → 引擎只有合成那条红，且同一次读数当场证明 `stripFill === centerColFill` 在这个坏页面上**成立**（旧判据全绿而像素错，这条是断言不是段落）；**craft 对这一条是绿的**（白名单故意放行单层，层数不是形状问题），smoke 虽红但**理由是错的**（它比整条声明字符串，任何改动都红，不是"少一层"）——**全仓库只有引擎那一行是"因为少一层"而红的**；**③ 整条规则删掉** → 引擎只有合成那条红，craft + smoke 各自红；**④ 两侧同时退平一层**（带子画一层 + 列内 root 撤掉，两处合成值重新相等）→ 等式照样成立、**只有**深度那条红；**⑤ token 换回实心** → **只有**敏感性那条红；**⑥ 三条形状变异分别记**：加第二条声明（`border-radius`）→ craft + smoke 红、活页全绿；加 `content: none` → craft + smoke 红，活页红在 `caption-box-alive`（盒子不再生成）而不是合成那条；摘掉 `!important` → craft + smoke 红、活页照常绿（我方 (0,3,3) 压过宿主 (0,2,1)，flag 挡的是行内 `style`）。**负向对照：把 token 换成硬写颜色** → craft + smoke 红，这是白名单唯一真正的功能。
  - **未验证（照实写）**：10.9.3 的像素效果仍是 **0 次目视**，本轮依据是"合成值相等"这条量出来的关系 + 真机层数普查，不是"我看过了"。桌面 profile 装上后需要用户本人看一眼。若带子与侧栏那一段的明暗差成为新回执，出路是**分侧**（一条带子两种底）或做成设置项，不是第三次猜默认值。层数是**量出来的常量**：宿主哪天撤掉列内那层 root，深度判据会红——那时重做普查，不许把判据改松。
  - **2026-10-10 追记：上一条的"0 次目视"已过期**（保留原文，因为它是那一轮状态的记录）。报告人在官方 DSH Desktop（desktop profile）上目视那条带子，回执「现在好了，我看到已经正常了」——10.9.3 像素效果的第一次目视。**"看到的是 10.9.3"这一步当场排除**：安装副本 `node_modules/dsh-dream-skin/lib/client.js` 落盘 `2026-10-09T11:57:09Z`（本地 19:57:09）、`PLUGIN_BUILD = "10.9.3"`、**两层简写在该安装副本里在场**、profile 依赖范围 `^9.29.0 → ^10.9.3`；`DeepSeek Harness` 进程启动于 `2026-10-10 19:25:01`，比落盘晚约 23.5 小时——**进程比文件新**，所以那一眼不是旧版残影。**这一格仍不上调**，理由与 v10.9.2/v10.9.3 那两条追记一样：目视是**人的读数**，Electron 渲染进程内部至今 0 次机读。可复现性分两半：进程时刻取自当晚那一次运行、撰写本条时应用已关闭，无法重取；落盘那一半（mtime / `PLUGIN_BUILD` / 声明在场 / 依赖范围）任何时候都能复核。
- **10.9.2 轮（标题条带改判 + 第一次在壳自带宿主上读到运行期状态 + 一条改正本文件自己的命令形状）**：
  - **先排除"没送达 / 没命中"再改判**：从壳自己起的服务（`http://127.0.0.1:19387`，desktop profile，宿主 `@deepseek-ai/dsh` 0.2.0-rc.2）现读 `__DSH_DREAM_SKIN_STATUS__ = {build:"10.9.1", status:"ready", lastError:null, skin:"nebula"}`，水洗标记在场；活页 CSSOM 里读到宿主原文 `[data-windows-titlebar] .<hash>_frame::before{content:"";height:var(--dsh-windows-titlebar-height);background:var(--dsw-specific-sidebar-fill);app-region:drag;position:absolute;inset:0 0 auto}`，而我方规则把它压成 `rgba(0, 0, 0, 0)` ⇒ 10.9.1 的修复**在那台壳的宿主上确实生效**，报告人截图里那条带子是"透出壁纸"这个方案的后果，不是残留缺陷。**边界照实写**：这条读数来自**外部浏览器指向壳的服务器**（同一份 bundle、同一个 profile，但不是那台 Electron 的渲染进程），且 `data-windows-titlebar` 由壳自己写、浏览器里没有，那一处是**手动加上属性之后**测的——所以上表那一格**不上调**。
  - **改判**：水洗态下标题条 `::before` 由 `transparent` 改为 **`var(--dsw-alias-bg-base)`**（它下面那一列所使用的同一枚 token；frame 自己的填充已按 #96 清掉，于是两处都是"一层 canvas 覆在壁纸上"，本机现读同为 `rgba(19, 17, 22, 0.4)`）。**代价**：侧栏比 canvas 重的那一段，带子会比侧栏本体浅——一个平涂盒子跟不了两列。**未验证**：10.9.2 的像素效果 0 次目视，本轮依据是"与内容列计算值相等"这条量出来的关系 + 报告人对上一版的回执；若侧栏那一段的明暗差成为新问题，下一步是做成设置项，而不是再换一次默认值。
  - **判据换形状（这件事比颜色本身更重要）**：`caption-cleared`（断言"必须透明"，等于把上一轮的决定写成定理）→ **`caption-matches-content`**（断言"带子的计算底色等于内容列的计算底色"，比较对象是量出来的邻居，不是手抄颜色）+ **`center-column-paints`** 防空洞。新增一条引擎变异：**把声明换回 10.9.1 的 `transparent`** → 只有 `caption-matches-content` 翻红，盒子 / 拖拽 / 几何 / 复原四条照常绿——这份清单就是"上一版为什么能带着错决定通过所有门"的答案。craft 白名单相应收成 `transparent` / `none` / `var(--dsw-alias-bg-base)` 三种带 flag 的形态，**硬写颜色判红**。
  - **本文件此前给桌面用户写的命令是错的形状**：`dsh plugin --profile desktop update …` 会被宿主 CLI **直接拒绝**（`dsh/lib/bin.js`：`profile.toLowerCase() === "desktop"` ⇒ `error: profile "desktop" is managed exclusively by the Electron application`，本机由用户的报错原文定位到该分支）。走得通的两条：① 应用内的插件管理界面；② 在该 profile 目录里手工 `pnpm add dsh-dream-skin@<确切版本号>`——**本机实测走通**：`package.json` 从 `^9.29.0` 抬到 `^10.9.1`、pnpm 自行把该版本追加进 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`、2.3 秒完成，装完的 `node_modules` 里 `PLUGIN_BUILD="10.9.1"` 且伪元素规则在场。兼容预检用壳自带宿主的 `evaluatePluginCompatibility()` 现场判：`0.2.0-rc.2 / 0.1.0-rc.6` 放行，`0.3.0 / 0.3.0-rc.1` 拒（我们自写的上界 `<0.3.0-0`）。
- **10.9.1 轮（官方桌面壳三处壁纸态外观，逐条留了可失败的检查）**：
  - **标题条是第二个盒子（红圈）**：#96 那条规则清的是 AppFrame **元素**，而 Windows 标题条由宿主的 `::before` 单独绘制，元素的 `background-color` 传不进伪元素——水洗态下整幅窗宽最上面那条带子仍由**侧栏** token 上色，左边压着两层侧栏色、右边压着一层 canvas 色，三处互相不一致（DSH Web 没有这一条）。本版补**它自己的**水洗门控规则，清的是 `background` **简写**（长手会放过一条渐变，而 #97 就是一条渐变）。计算样式实测：`rgba(16, 16, 24, 0.75) → rgba(0, 0, 0, 0) → 回到 0.75`（**这个颜色是夹具 `:root` 手写的那枚 token，不是八套皮肤里任何一套的发货值**——判据一律写成"与参照元素的计算值相等 / 不等"；corner 组整体改成按 bundle 现读仍是 F14 那族的遗留欠账），**两态 `-webkit-app-region` 严格等于 `drag`**、**伪元素两态都仍在生成盒子（`content` 读数）**、侧栏列计算底色三态恒等（没有越界到用户滑杆管的那个面）。工艺门 `wash-frame-flattened` 的判据从"元素规则"扩成**四件事**（元素规则 / 伪元素规则 / 该规则不得声明 content·display·visibility·all / 全表不得声明任何 `app-region`），**八处变异逐条实测翻红**（伪元素形状丢掉、声明删掉、flag 摘掉、选择器不再指向伪元素、水洗门控丢掉、把透明换成 canvas 色、该规则加 `content: none`、简写换成长手），基线在同一棵树上先跑绿。反向变异**五条**：删整条伪元素规则 → **只有** `caption-cleared`（10.9.2 起这条已改名 `caption-matches-content`，判据也从「必须透明」换成「等于内容列」，见下一组条目）翻红（圆角 / frame 填充 / 侧栏列三条不动）；只去 `!important` → **引擎仍判透明**（我方 (0,3,3) 本就压过 (0,2,1)，与 #99 那条方向相反，两边都是量出来的）；规则声明 `-webkit-app-region: none` → 活页翻红点名 `caption-still-drags`；规则声明 `content: none` → craft + smoke + 活页**三门一起**翻红；简写换长手 → craft + smoke 翻红而**活页不翻**（今天宿主画纯色，这一处判据归 craft 管，如实写明）。**这一轮自己栽过一次**：`caption-still-drags` 第一版写"含 drag"，而 Chromium 把 `none` 规范化成 **`no-drag`**、且**计算值在一个不再生成的盒子上照样是 `drag`**——蓝军用 `content: none` 实测出"三门全绿而拖拽已死"。所以"drag 还在"现在由 `content` 读数 + `app-region` 严格等值 + craft 属性禁令三道门分别把，各配一条实测翻红的变异。
  - **圆角与 fade 带（绿圈 / 蓝圈）是 10.8.0 已修、但没送达**：报告所在的官方桌面 profile 依赖写的是 `dsh-dream-skin: ^9.29.0`，`^9.29.0` 按 semver 覆盖不到 10.x，`dsh plugin update` 也不会跨大版本抬上去——所以那一版仍然看得见这两处。本版对它们**没有改代码**，只把两处旧修复的读数**并进同一份 `corner` 夹具**（圆角 `16px → 0px → 16px`、fade `linear-gradient → none → linear-gradient`、聊天滚动遮罩三态不变），并在文档与 README 里把"旧修复没送达"与"新缺陷"分开记账。**出处如实标注（评审 B3）**：这份夹具读的是**本机 npm 安装物里那份 layout CSS**（`pI_x6G_` 世代），**不是官方桌面壳的 `app.asar`**；壳那两份声明是另外逐字读出来对照的，两处同形、只差哈希。**未验证**：10.9.1 在该壳上 0 次真机目视（见上表"官方 DSH Desktop"那一格）。
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
- 漂移探针三态（v9.27.0，A-1 验收四情形）：空 DOM 恒 `pending`（阶梯走完也不判漂移）、全命中收敛为 `drifted: [] && pending: false`、单组缺失在活跃度证明后的终局点名**恰好那一组**、晚挂载面凭命中记忆自我撤回；10.5.0 增补 `notMounted` 分栏——宿主 CSS 仍持有的未挂载组不混入 `drifted`（且该轮不告警）、晚挂载后经同一观察者从 `notMounted` 撤回（分类器短路 / 丢 `style[data-plugin-css]` 限定 / 双池撤回各有用例或变异钉，M20/M21）；**阶梯窗口外**晚挂载的面由 late-correction 观察者单向撤回（round-2 R-2，含"撤回不再告警"断言）；桌面壳两态（Web `probed=8`、桌面 `probed=9`，10.8.0 起含 #96/#97 两组哈希无关锚点；`drifted` 只含合法原始选择器、人类标签只在 console 行）；**10.8.0 J1 的退役锚点分池**——`.bqrRRG_card` / `.nArs4W_*` / `.qDHVXG_fade` 在可测量的宿主上恒 0 命中，若留在 `drifted` 里，本文承诺的唯一正向信号（`drifted: [] && pending: false`）将永不可达，故它们进 `anchors.retired`（用例 `drift probe (J1)` 断言健康宿主 `drifted` 为空、退役三组点名在 `retired`，且退役组**不得**出现在 console 告警里；名单与 `scripts/data/dead-hashes.cjs` 的双向一致性由 `tests/hashes.test.cjs` 钉）；**10.12.1 A1 的通道分叉分池**——官方桌面壳的活页终局里 `.lXshSW_root, ._7yHdaG_panel` 与 `.uV2eYG_root` 点名在 `anchors.channelAbsent` 而**不再**躺在 `drifted` 里（用例 `drift probe (A1)` 用壳形状夹具断言 `drifted: []` 且新池恰好这两组；改前跑红——这是本文那句"正向信号在官方壳上永不可达"的实证）；中途轮次即使活跃度已证明也**不得**提前终局（变异 `conclusive = liveness` 由该断言翻红）；**阶梯数组按"相对间隔"解释**这一语义有独立行为钉（round-3 自查补，`drift probe (R-4)`：3×400ms 间隔下 ~700ms 必须仍 `pending`、终态才点名漂移，按"绝对时刻"解释会提前终局 → 中间态断言翻红）；晚修正观察者的**卸载断开**与**至多一个存活实例**（round-3 S-3）各一条用例，并断言卸载后快照**冻结**（既不改好也不变坏）；**阶梯定时器在卸载时被取消**、**已跑出队列的那一步补跑后快照连对象引用都不换**、**重新 `apply()` 取代旧链而非叠出第二条阶梯**（round-4 T-1 三条用例；"取消"与"门槛"分置两用例，避免先失败者遮蔽后一位）；
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
- **「可审计能力面」/「页面侧能力矩阵」的两条固有边界（10.16.0）**：① 词汇表由人列——门保证"列出的每个 token，文档与代码的判定一致"，**不**保证"某天出现一枚没想到要列进来的新 Web API"也会被抓住（那要先有人把名字加进词汇表，文档与测试两边不一致会立刻红，所以两边不会各写各的，但"完全没想到"这件事门管不了）；② L1/L2/L6/L8 是**文本级**检测，能发现"源码里出现了这串字符"，发现不了"用计算出来的属性名调用 API"（`window[key]` 一类）。我方没有那种写法，这句话只能说"没有"，不能说"门证明了没有"。另：L7 观察的是合成沙箱里实际发起的 URL（有/无 `document.baseURI` 两种页面各采一次），真机 Chromium 下 `<base>` 改写 baseURI 的完整链路未经 DSH 实测——可承诺的是"目的地不含协议与主机"，不是"路径恒等于 `/dream-skin/api`"。
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
- **会话字号极值：计算样式已采样，真机活页与像素观感未验（issue #93，采样日期 2026-10-09）**。宿主 `0.2.0-rc.2`（`latest`）起步进器区间由 `12–17 px` 放宽为 `10–22 px`（默认仍 14 px），**新装用户已经在用新区间**。本机实装是 rc.1（12–17），且为了这条验证去升级实装属禁止操作；采样走**独立夹具页**：在 headless 引擎里把宿主阶梯变量 `--dsh-content-font-size` 直接设为 10 / 22 px（不动本机实装），皮肤 token 从发货 bundle 现读，三套（最浅端 `ivory`、深端 `abyss` / `midnight`）× 两个极值 × 三读数，数据冻结在 `scripts/data/font-extreme-samples.json`（重跑：`node scripts/font-extreme-sample.cjs`）。结果：
  - **对比度在全格通过**：三级墨色压在气泡上的对比度 `ivory 6.05 / abyss 6.45 / midnight 7.04`，压在代码块上 `6.47 / 5.59 / 6.23`（WCAG 比，全部 ≥ 4.5）；10 px 与 22 px 两档数值相同——墨色与底色都不随字号变，**这两个极值没有产生新的可读性缺口**（对比度门不看字号，这正是当初的担忧点，现在有了实测数）。
  - **气泡填充 alpha 不随字号变**：`abyss rgba(31,33,38,0.92)`、`midnight rgba(25,25,26,0.92)`、`ivory` 不透明 hex——两档极值下计算值逐字相同。
  - **composer `::before`**：其声明是 `color-mix(...)` 变量链（`--dsh-dream-skin-composer-fill` 权重 + `--dsh-dream-skin-glass-tint`），不含任何字号耦合；夹具验证字号确实生效（`textComputedPx` 10px/22px 逐格核对）。
  - **仍未验证、如实分列**：① 真机活页复核（Electron 渲染进程内的观测，与 #87 同一欠账）；② **22 px 的观感**——像素目视不可由计算样式替代，气泡 / 覆盖层的视觉权重与留白是否合理仍 0 次目视；③ 弹窗滑杆两端 × 极值组合未采样；④ 次级档 9 px / 20 px（宿主公式派生）未单独采样。
  - 口径收窄后的完整表述是「**在宿主字号 10–22 区间内的默认值 14 px 下实测，极值未测**」——「极值未测」指**真机目视**，计算样式极值采样已有（本条）。若后续真机复核发现 10 px + 最浅端读不出来，处置（提高三级墨色最低 alpha、给最小字号加保护）另立 issue。

**卸载残留**：`$DSH_HOME/dream-skin.json` 保留（用户数据，插件不主动删除），其余状态在浏览器侧可被官方"一键还原"清除；浏览器侧的定时器与观察者在 fiber 卸载时全部撤除（材质 `<style>`、晚修正观察者、漂移阶梯定时器——round-4 起三者同归 `teardownMaterial()` 处置；设置导航钩子的 body 观察者 / 行标记 / 图标表自 10.5.0 起经 `disposeNavHook` 同链拆除，同页重挂时 `apply()` 自动复臂——generation 令牌保证迟到的旧代 dispose 不会误杀接棒的新代）。**10.10.0 把这把锁从导航钩子扩到了其余全部页作用域句柄**：`apply()` 第一句认领页权（号写在 `window.__DSH_DREAM_SKIN_PAGE_OWNER__` 上而不是模块里——两份模块作用域没法仲裁同一个 `<html>` 属性），材质表、壁纸节点、`<html>` 上的水洗标记、对话框 alpha 地板、composer 标记的观察器都只在**仍持有页权**的那一代卸载时才被拆除；壁纸刷新的 60s 定时器与 `visibilitychange` 监听**不走这把锁**，走"每代释放自己创建的那两个句柄"（所有权门控只会把"旧代停掉新代的"换成"旧代的永远停不下来"）；composer 那一处还额外补了"停止时把 `started` 闩一并交还"，否则旧代一停就把这一页余生的输入框标记永久锁死。**仍未验（新增两条，如实分列）**：① 这条锁改的是 fiber 生命周期路径，**没有在真页面上做过热重载**——真机是否会出现两代重叠不由我们决定，所以证明全在沙箱（两代实例 + 两份 bundle 实例 + 7 条相关变异）；② `wash-gate` CI 作业已在 run `38061953959` 上随整条 workflow 全绿，日志交出 13 行读数与 `wash cascade OK`、零 skip 行——Roadmap 那条已销账（残留欠账见 `docs/computed-style-gate-in-ci.md`：没有每日排程，且"镜像真缺 Chrome"那条下载路尚未被真实运行过）。

## 对官方的三条兼容契约建议

若官方桌面版/插件体系愿意提供以下任一稳定面，本插件承诺第一时间从哈希类名迁移到契约：

1. 语义 data 属性（如 `data-dsh-sidebar-surface`）替代构建哈希类名——消灭上表第一行全部风险；
2. `--dsw-*` token 名单进入官方 CHANGELOG 的"公开契约"节（本仓库 `themes-spec.md` 可作为初稿素材）；
3. loader 工厂异常隔离（宿主侧 try/catch 每个插件工厂）——目前由插件单方面保证不抛错，宿主加一道门对所有第三方插件都好。
