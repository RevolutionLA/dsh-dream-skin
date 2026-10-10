# 计算样式门在 CI 里跑（`npm run wash:check` × GitHub Actions）

> 对应 README Roadmap 的 M 项：**"把机制级取证搬进 CI"**。
> 代码在 `scripts/wash-cascade.cjs` 与 `.github/workflows/ci.yml` 的 `wash-gate` job；
> 分支逻辑的用例在 `tests/wash.ci_strict.test.cjs`。

## 〇、为什么这条门不能只在维护机上跑

仓库里其它所有检查都把 CSS 当**字符串**打分（`scripts/craft-audit.cjs`、
`tests/client.smoke.test.cjs` 读的是 bundle 里的文本）。字符串不是渲染：issue #97 那条永不命中的
选择器在四个发布里一直"绿"，就是因为没有任何东西去问引擎"这条声明到底落到了哪个元素上"。
`scripts/wash-cascade.cjs` 是那一问——它把**发货 bundle 里的材质表**与**本机安装的宿主 CSS**拼成一页，
驱动真实 headless Chrome，在 plain / wash / washed-again 三态读**计算值**。

问题是它有两个环境前提：一个能 spawn 的浏览器，和一份能读的宿主安装物。CI 两者都没有，于是
`tests/wash.cascade.test.cjs` 里那四条计算样式用例在 CI 一律 skip——"机制真的生效"这半边证据
只有维护者的笔记本能复算。`wash-gate` job 把这两个前提搬进了流水线。

## 一、退出码：四种事实，不合并

| 退出码 | 含义 | 谁会给 |
| --- | --- | --- |
| `0` | 跑成了，且读数与文档一致（三段夹具都跑） | 本地 / CI |
| `1` | 跑成了，但**不一致**（判据点名 id） | 本地 / CI |
| `3` | **没跑成**：这台机器缺浏览器或缺宿主安装物——打印 skip 与原因，既不算通过也不算失败 | 本地默认 |
| `4` | **严格模式没跑成**：`DSH_WASH_STRICT=1` 却遇到环境缺失，逐件点名"缺的是哪一件" | CI |

这条区分是仓库的硬规则（issue #102）：**"这台机器没法检查"与"检查发现问题"是两件不同的事实**。
严格模式不改变事实，只是**拒绝接受**它——CI 已经承诺备齐了前提，还 skip 就说明流水线坏了，
而不是层叠坏了。所以严格模式用 `4` 而不是 `1`：把两者合成一个码，就是把 #102 存在的理由删掉了。

反向同样成立：**严格模式不会把 `1` 改写成 `4`**（真有层叠问题时，仍然是"引擎跑了并不同意"），
也**永远不会把 skip 变成 `0`**。

## 二、CI 装了什么（以及为什么是这样）

`wash-gate` job（`ubuntu-latest`，Node 22，单跑一次，不进 4 个 Node 版本的矩阵——它要验的是引擎与
宿主 CSS，不是 Node 的兼容窗口）：

1. **浏览器**：优先用 runner 镜像自带的 `/usr/bin/google-chrome`（零下载、共享库齐全），
   找不到才 `npx -y @puppeteer/browsers install chrome@stable`。两种方式都通过 `CHROME_PATH`
   交给门——`CHROME_PATH` **说一不二**，不会在被指定后静默换成别的引擎（issue #83 的规则）。
2. **宿主包**：版本从 `scripts/data/host-token-census.json` 的 `host.dshVersion` 读出来（不在 workflow
   里第二次手抄，否则语料与门可能各测一个宿主），把
   `@deepseek-ai/dsh-client-ui-{layout,workspace,chat,sidebar}` 装进 `$RUNNER_TEMP` 的一次性目录，
   再用 `DSH_HOST_ROOT` 指向那里的 `node_modules/@deepseek-ai`。装法带 `--ignore-scripts`：
   这些包是拿来**读 CSS** 的，不是拿来执行的。
3. **共存夹具的第三方插件**：`npm pack @linxin666/dsh-client-ui-skin-center@0.4.4` + `tar` 展开，
   `DSH_SKIN_CENTER` 指向 `lib/client.js`（不装它的 500 包依赖树）。钉 0.4.4 是刻意的：夹具按它自己
   `scoped()` 的语义还原那条 `_fade` 规则，而 0.4.4 的 scope 列表是三条 `html[…]`；0.4.5 掉了一条，
   门**拒绝猜**被改掉的那半边（宁红不编），所以这个 pin 就是"下次重读它们 bundle"的工作项。
4. **严格模式**：`DSH_WASH_STRICT=1`。
5. **兜底步骤（防"CI 步骤被改回空转"）**：门跑完之后，再逐字读一遍它自己的输出——
   - 出现 `SKIPPED (environment)` → 红（严格模式还 skip，说明这一步已经不测任何东西了）；
   - 三张夹具各自的采样字段 `"corner"` / `"surfaceBg"` / `"probeBg"` 必须都出现在读数行里
     （一张页跑了三遍不算三段夹具都跑）；
   - 必须出现 `wash cascade OK`。
   这一层存在是因为退出码的正确性依赖脚本**继续**尊重 `DSH_WASH_STRICT`；将来有人删掉那个分支，
   这一步还会红，而不是绿。

## 三、四个可调开关（本地与 CI 同一条路）

| 变量 | 作用 | 未设置时 |
| --- | --- | --- |
| `DSH_HOST_ROOT` | 宿主 CSS 从哪里读（CI 指一次性安装物） | 本机全局 npm 安装物里的 `@deepseek-ai/dsh/node_modules/@deepseek-ai` |
| `CHROME_PATH` | 用哪个引擎，指定后不回退候选表 | 自动探测已知安装位置，逐个尝试 |
| `DSH_SKIN_CENTER` | 共存夹具读那份第三方 `lib/client.js` 的路径 | `~/.dsh/profiles/{web,desktop}/node_modules/...` |
| `DSH_WASH_STRICT` | `1/true/yes/on` 才开；`0`、空、未设都是关 | 关（开发者照旧拿 skip + 原因） |

指到一个**空目录**当 `DSH_HOST_ROOT` 是环境缺失（skip / 严格模式点名 `host install`）；指到一个
**有目录但那个包没了**的宿主是**判红**（`1`），因为包被改名或删除正是这门要盯的漂移（蓝队 B4）。

## 四、本地复现（四条命令与期望）

```bash
# 1. 真环境 + 严格模式 → 0，并打印三态读数
DSH_WASH_STRICT=1 npm run wash:check

# 2. 严格模式 + 指向不存在的浏览器 → 4，点名 browser 与那条路径
DSH_WASH_STRICT=1 CHROME_PATH=/no/such/chrome npm run wash:check

# 3. 严格模式 + 空的宿主目录 → 4，点名 host install
mkdir -p /tmp/empty-host
DSH_WASH_STRICT=1 DSH_HOST_ROOT=/tmp/empty-host npm run wash:check

# 4. 同样两个坏路径，但不带严格模式 → 仍是 3（skip + 原因），既不假绿也不假红
CHROME_PATH=/no/such/chrome npm run wash:check
DSH_HOST_ROOT=/tmp/empty-host npm run wash:check
```

第 2/3 条的退出码在 `tests/wash.ci_strict.test.cjs` 里是**子进程实测**的（不依赖本机有没有浏览器），
所以"CI 缺东西会红、开发机缺东西不会红"这条分工本身也是一道会翻红的门。

## 五、仍未验证的（如实记）

- **runner 镜像里到底有没有 Chrome**：第一次 CI run 已见分晓（run `38061953959`，2026-10-10）——
  作业日志里是 `Using the runner image browser: /usr/bin/google-chrome`，13 行读数与
  `wash cascade OK` 都在，整个 job 9 秒跑完。**所以 `@puppeteer/browsers` 那条下载支路仍然没有被
  CI 真实走过**：镜像若改了（不再预装 `/usr/bin/google-chrome`），就落到那条支路，它依赖 Ubuntu 的
  共享库齐全；两个引擎都不来时，严格模式会 exit 4 点名 `browser`，不会静默变绿。这条从"未知"
  降级为"已知未覆盖"，覆盖它需要一个不带 Chrome 的镜像，本仓库不为此排 Windows/自定义 runner。
- **`--disable-dev-shm-usage` 之外没有再为容器加别的旗**：门自己那份 Chrome 参数只在
  维护机（Windows + Chrome）与本次的 Ubuntu 复现路径上验证过；Windows/Edge 那条候选路径
  **没有在 CI 里跑过**（本 job 不跑 Windows runner）。
- **宿主版本 pin 跟着 census 走**：census 一旦升到某个还没发布的版本，或者宿主把
  `--dsh-windows-content-radius` / `_fade` / `_fadeTop` 任一条挪走，CI 会**判红（1）**并点名是哪条
  声明没了。这是设计的方向，但意味着第一次 CI run 有可能红——那一次红要当成"宿主漂了"来读，
  而不是流水线坏了（4 才是流水线坏了）。**实际的第一次红两者都不是**：`aa6c36c` 那次 `wash-gate`
  自己绿了，红的是 `test` 矩阵——本仓库一条新写的用例在没有宿主安装的机器上抛了环境错误而不是
  skip（1 与 4 的分工同样适用于套件自己，见 CHANGELOG 10.10.0 §八）。下一次真红才轮到按上面那句
  去读。
- **第三方插件的 0.4.4 钉版会过期**：上游改 `scoped()` 形状时，共存夹具拒绝构建，`wash-gate` 判红；
  修法是重读它们的 bundle 并更新夹具，不是把夹具改成能猜。
- **`test` job 里那四条引擎用例仍然是 skip**：那个 job 不装浏览器也不装宿主（它测的是 Node 18/20/22/24
  的纯字符串面），计算样式取证只在 `wash-gate` 这一个 job 里发生。两个门各管一件事，不要以为
  `npm test` 的输出里出现了引擎用例。
- **套件总数变了**：本文件对应的 `tests/wash.ci_strict.test.cjs` 新增用例会计入 `npm test` 总数，
  而 `tests/docs.numbers.test.cjs` 要求文档里写的总数与实数一致——由文档负责人同步口径。
