# 发布到 npm 与 GitHub

`dsh-dream-skin` 是一个标准的 dsh 插件包。如果希望用户能一条命令 `dsh plugin ... add dsh-dream-skin`
安装，需要把它发到 **npm 官方源**，并把源码托管到 **GitHub**。

> DSH (rc.6) **没有单独的插件市场**——插件分发渠道**就是 npm 源**。只要有 `dsh.bundle`（host patch 层）和
> `dsh.client`（浏览器 bundle）的包，就能被 `dsh plugin --profile web add <package>` 安装。

## 一、发布前检查

1. 包名全局唯一。scope 名更安全（如 `@你的账号/dsh-dream-skin`）——如需改 scope，改 `package.json` 里的
   `name` 即可。
2. 填好 `author`、`repository`、`description`、`keywords`（均已预留）。
3. 确认 `files` 里带上了这些文件（当前已配置：主 README + `docs/i18n/` 多语言 README + 兼容矩阵）：
   ```json
   "files": ["lib/index.js", "lib/client.js", "lib/types", "cordis.patch.yml",
             "README.md", "docs/i18n", "docs/examples",
             "docs/themes-spec.md", "docs/design-philosophy.md", "docs/desktop-support.md"]
   ```
   这样 npm 只会上传这些，不会带源码里不需要的东西。多语言 README（en/ja/ko/es/fr/de/ru）放在
   `docs/i18n/` 下（根目录只保留中文 `README.md`），同样会随包发布。
   注意：`docs/screenshots/` 与 `docs/previews/` **刻意不在白名单**（前者 v9.26.1 起、后者 10.6.1 起）——
   这两组图是 README 装饰，却要每个 `pnpm add` 的人下载：8 张 `docs/previews/*.png`（720×460@2x）合计 2.26 MB，
   把 tarball 从 930.6 kB 顶到 2.5 MB，而插件本体只有 ~350 kB（issue #83）。README 里的截图、成长图与
   预览色卡全部改指 GitHub 绝对 URL（`raw.githubusercontent.com/.../main/docs/...`），GitHub 与 npm 页面
   都仍可显示。移出白名单后实测：`package size` 2.5 MB → **263.4 kB**，`unpacked` 3.1 MB → **754.2 kB**。
   取舍：图片随 `main` 分支走而非随版本冻结（截图早已如此），代价是 npm 页面的图永远是最新一版的样子；
   反过来把 2.26 MB 塞进每个用户的安装里，是拿所有人的带宽换 npm 页面的离线可用性。`tests/previews.test.cjs`
   把这条策略钉死：`files` 里再出现 `docs/previews` 即红。
   另：预览图内容由 `docs/previews/manifest.json` 指纹守护（见第五节）；`package-lock.json` 的版本
   须与 `package.json`/`PLUGIN_BUILD` 同步（三方评审 T-07）。发布前跑 `npm pack --dry-run`
   核对产物清单。

## 二、GitHub 发布（开源）

```sh
# 1. 初始化 git（若还没有）
git init
git add .
git commit -m "feat: initial release of dsh-dream-skin"

# 2. 在 GitHub 新建空仓库（例如 dsh-dream-skin），然后：
git remote add origin git@github.com:<你的账号>/dsh-dream-skin.git
git push -u origin main
```

> 如果没配 SSH，也可用 HTTPS：`git remote add origin https://github.com/<你的账号>/dsh-dream-skin.git`，
> push 时会提示输入用户名 / token。

## 三、npm 发布

```sh
# 1. 登录 npm（只登录一次）
npm login

# 2. 发布到官方源。注意：如果本机默认源是镜像（如淘宝镜像），它不会真正发布到 npmjs
npm publish --registry https://registry.npmjs.org

# 3. 以后发新版本：改 vERSION（semver），再执行上面的 publish
```

> `npm publish` 退出 0 **不是发布的终点**：那只代表写侧收下了包。发布成功后走第八节，从公共源真装一次、
> 读三个数，再对外报版本号。

检查 publish 前先看本机 npm 源：
```sh
npm config get registry
```

## 四、用户安装

```sh
dsh plugin --profile web add dsh-dream-skin
# 重启 dsh web
```

> 若裸 `add` 报 `ERR_PNPM_ADDING_TO_ROOT`，补 `-w`：`dsh plugin --profile web add -w dsh-dream-skin`。
> 本地开发测试同理：`dsh plugin --profile web add -w /path/to/dsh-dream-skin`。
>
> 刚发出去的那 24 小时内，上面这条裸 `add` 会**静默装到上一个成熟版本**（无报错、退出码 0），成因与实测
> 输出见第八节 8.3(a)；给用户抄的命令一律带确切版本号（`README.md:178-181`、`README.md:213-218` 同口径）。

## 五、常见注意事项

- **镜像源**：发布必须 `--registry https://registry.npmjs.org`。
- **版本号**：从 `8.28.0` 起改用**日期式版本** `M.D.X`（月.日.当日第几个版本）。例如 8 月 28 日首版 `8.28.0`、当日再发 `8.28.1`、次日 `8.29.0`。当前版本号以 `package.json` 为准（此处刻意不抄录，防陈旧；演进脉络：0.2.0 → 0.4.15 → 8.28.0 → 日期式）。
- **PLUGIN_BUILD 同步**：改版本号时同步 `lib/client.js` 顶部的 `PLUGIN_BUILD` 常量（桌面诊断通道 `window.__DSH_DREAM_SKIN_STATUS__` 上报的构建号）。冒烟测试里有一条断言会拿它比对 package.json 版本——漏改会红。
- **peerDependencies**：以 `^0.1.0-rc.6` 对齐 DSH 当前版本；DSH 升级到正式版后记得跟进。平台客户端包的 peer 均为 `optional`（宿主运行时供给）；`dsh-client-store`（自 2026-08-30 起已在 npm 发布）用宽范围声明以适配宿主换代。
- **engines.dsh（刻意不声明）**：semver 只在候选版本与自身 `major.minor.patch` 相同的轨道放行预发布版本，任何单一范围都无法同时覆盖 `0.1.1-rc.x` 与 `0.1.2-rc.x`；声明反而会广播错误的「不兼容」信号，且宿主不读取该字段。兼容性以 README 兼容矩阵 + 客户端运行时能力探测（平台 seed 全量降级兜底）为准。
- **发布顺序**：先打 tag 并在 GitHub 建 Release（Release notes 引用 CHANGELOG 条目与 npm 链接），再执行 `npm publish`；三处（tag / Release / npm）版本号必须一致。
- **LICENSE / README**：npm 页会展示仓库提交的内容，建议发布前同步。
- **files 白名单**：以 `package.json` 的 `files` 字段为准；除代码与多语言 README 外含
  `docs/examples`、`docs/themes-spec.md`、`docs/desktop-support.md`，保证 npm 包页的示例 / 兼容矩阵链接
  不 404。`docs/screenshots/` 与 `docs/previews/` **刻意排除**（前者 v9.26.1 起、后者 10.6.1 起，真机/无头
  重截图不随包分发），根 README 的截图、成长图与预览色卡已全部改用 GitHub 绝对 URL 渲染。每次发布前
  `npm pack --dry-run` 核对产物清单。
- **预览图指纹**：`docs/previews/manifest.json` 由 `npm run previews` 生成，逐皮肤记录「发货 token 哈希 +
  卡片版式哈希 + PNG 字节哈希/尺寸」。`npm run previews --check` 只读校验（不需要浏览器），`npm test`
  会跑它。改了设计系统颜色却不重照 ⇒ 红，并在报错里点名是哪套皮肤；这一层以前完全无人看守
  （issue #83：实测重掷调色板后 PNG 逐字节不变）。无头浏览器缺失时 `npm run previews` **非零退出**，
  不再把「0 产出」当成功。

## 六、让社区发现你（.dsh-plugin topic / awesome / dsh-market）

DeepSeek Harness「一切皆插件」，社区通过 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
与 [dsh-market](https://github.com/dsh-market/dsh-market)（DSH 内的插件市场）发现插件。

1. **给 GitHub 仓库打 topic**（建仓后），至少包括：
   ```
   dsh-plugin
   dsh-plugin-theme
   deepseek-harness
   dsh
   theme
   skin
   ```
2. **提 PR 收录进 awesome-dsh-plugin**：在 `README.md` 和 `README.zh.md` 的 **「主题与外观」** 分类各加一行：
   ```markdown
   - [RevolutionLA/dsh-dream-skin](https://github.com/RevolutionLA/dsh-dream-skin) — 一句话中文/英文描述
   ```
   收录后会自动出现在 dsh-market 的 **主题 Tab**；主题类插件保持**安装即生效、切换即时、选择跨重启保留**。
3. **合入后挂「awesome 已收录」徽章**（README 顶部徽章区加上）：
   ```markdown
   [![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
   ```
4. 主题类插件保持**安装即生效、切换即时、选择跨重启保留**——我们已经是这种体验。

## 七、（可选）manifest 契约自检

想确认自己的 `dsh` manifest 符合官方契约，可用社区只读检查器（无需授权）：

```sh
dsh plugin --profile web add dsh-plugin-check
```

## 八、发布后：从公共 registry 真装一次（临时 profile）

**为什么必须有这一步**：本机此前每一次"已验证安装"都是 `link:` 工作区安装——`docs/desktop-support.md:272`
把这条欠账写得很清楚（"本机是 `link:` 工作区安装……这一条已在 2026-09-29 实机跑到"）。`link:` 装的是磁盘上的
工作树，它**结构上**碰不到三样东西：npm 的 tarball 与 `files` 白名单（第一节）、registry 的读写同步、
pnpm 的发布冷静期（8.3）。所以"本地装好了 + `npm test` 绿 + publish 退出 0"这三件事加起来，仍然推不出
"用户 `pnpm add dsh-dream-skin@<新版本>` 能拿到正确的东西"。

**这一节的定位（先把没验证的部分说清楚）**：这是一份**人工**发布流程。CI 不跑它——`.github/workflows/` 里没有任何
"从公共源装本包"的步骤（可复现：`grep -rn "registry.npmjs\|pnpm add dsh-dream-skin" .github/` 无输出）；
`tests/` 里也没有任何用例钉住本节的读数（`tests/previews.test.cjs:96-104` 只钉住 `docs/previews` 不得回到 `files`，
`tests/client.smoke.test.cjs:863` 只比对**工作树**里的 `status.build === pkg.version`）。
下面每条都写着产生它的命令，发布人自己跑；跑不了（没有第二个 profile、没有网络）就不要对外说"发布已验证"。

**8.1 registry 读侧的同步延迟：404 不等于发布失败**

```sh
npm view dsh-dream-skin@<版本号> version --registry https://registry.npmjs.org --prefer-online
```

- registry 自己的发布戳（可复现）：`npm view dsh-dream-skin time --json` → `"10.9.3": "2026-10-09T11:54:34.720Z"`，
  同一次输出的 `"modified"` 是 `2026-10-09T11:54:34.886Z`。
- 2026-10-09 发 10.9.3 时的一次性网络观测（**不可复现复核，只能这样记账**）：发布动作 11:53Z 起，读侧此后约
  **90 秒**仍回 404，约 **3 分钟**后可读。两个时刻不冲突：上面那条 404 观测用的是本地钟，registry 自己记的戳
  （11:54:34.720Z）落在"约 90 秒仍 404"与"约 3 分钟可读"之间——**所以对外报发布时间以 `time` 里那条为准**。
  404 时的错误形状与"版本号打错了"完全同形（对照实验：
  `npm view dsh-dream-skin@10.9.99 version` → `npm error code E404` / `404 No match found for version 10.9.99`）。
- 因此规则是：**publish 后立刻按版本号验会出假警报**。按 `--prefer-online` 重试（每 15 秒一次、上限 10 分钟——
  这两个间隔是本流程的规定，不是测出来的数），超时才回头核对 `npm publish` 的输出与 npm 网页的 versions 面板；
  判据用 `npm view dsh-dream-skin time --json` 里有没有那条时间戳——那是 registry 的记录，比本地缓存诚实。

**8.2 在临时 profile 里装（别拿日常 profile 当试验场）**

`~/.dsh/profiles/` 下本机实存 `web` / `desktop` / `lark` 三个真 profile；`web` 是日常在用的，`desktop` 由
Electron 应用独占（8.4）。验证用一次性目录：

```sh
P="$(mktemp -d)/profile"; mkdir -p "$P" && cd "$P"
printf 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n' > pnpm-workspace.yaml
printf '{"name":"throwaway-profile","private":true}\n' > package.json
pnpm add dsh-dream-skin@<确切版本号>          # 24 小时窗口内还要带 8.3 的那个 flag
```

（`nodeLinker: hoisted` + `autoInstallPeers: false` 是照真 profile 的形状抄的：`~/.dsh/profiles/desktop/pnpm-workspace.yaml`。
本机 pnpm 11.6.0。）

**8.3 pnpm 的 24 小时冷静期：两种行为，报错形状和处置都不一样**

pnpm 11 的默认冷静期是 24 小时（这个数记在 `README.md:268`；本机**没有**单独验默认值，下面的复现都是把窗口
显式拉大，见每条括号里的分钟数）。`pnpm config get minimumReleaseAge` 返回 `undefined`（2026-10-10 本机复测）
**不影响**策略生效——"我没配过这个策略"不是排除理由（这条与 `docs/desktop-support.md:265`
同口径，那里还钉着 `.npmrc` 写 `minimum-release-age=0` **无效**、只有 CLI 形态被证实）。下面 (a)(b) 两次都在
一次性目录里实跑过，差别必须分清：

复现配方（不必等新版本发布）：临时目录照 8.2 建好，在 `pnpm-workspace.yaml` 里写 `minimumReleaseAge: <分钟>`，
选一个**已发布但被这个窗口盖住**的版本当"新版"——本插件 10.9.1 / 10.9.2 / 10.9.3 三条的发布戳
`npm view dsh-dream-skin time --json` 现场可查，选窗口大过它们即可。

**(a) 不带版本号 ⇒ 静默装到旧版，不报错。** 把窗口拉到 48 小时（`minimumReleaseAge: 2880`）后：

```
$ pnpm add dsh-dream-skin
dependencies:
+ dsh-dream-skin ^10.8.1            ← 10.9.3 仍在窗口内，pnpm 退回上一个成熟版本
Done in 4.8s using pnpm v11.6.0
$ node -p "require('./node_modules/dsh-dream-skin/package.json').version"
10.8.1                               ← 退出码 0，无 error 行
```

**这就是每一条发布出去的安装命令都必须写死确切版本号的原因**（`README.md:178-181`、`README.md:268-274`）。
写死版本号之后，默认策略下 pnpm 会自己把它记进豁免表并装对（实测输出：`Added 1 entry to minimumReleaseAgeExclude
in pnpm-workspace.yaml (set minimumReleaseAgeStrict to true to gate these updates with a prompt)` + `+ dsh-dream-skin 10.9.3`，
`Done in 2.3s`）；**pnpm 在什么条件下写这张表本机没有定位**，带 `--config.minimumReleaseAge=0` 的那几次它就没写
（`pnpm-workspace.yaml` 逐字节未变），所以不能把"pnpm 会自动豁免"当成 8.3(b) 的解法。

**(b) 锁文件已经钉住一条仍在窗口内的版本 ⇒ 报错点名的是"旧的那条"。** 先装 10.9.2 生成 `pnpm-lock.yaml`
（那一步要带 `--config.minimumReleaseAge=0`，否则装不上），再把窗口改成 `minimumReleaseAge: 1000000`
（≈1.9 年，把 10.9.2 一起盖进去）、`minimumReleaseAgeExclude` 此时只列着要装的 10.9.3：

```
$ pnpm add dsh-dream-skin@10.9.3
✗ Lockfile failed supply-chain policy check (1 entry in 2.4s)
[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION] 1 lockfile entries failed verification:
  dsh-dream-skin@10.9.2 was published at 2026-10-09T10:36:24.134Z, within the minimumReleaseAge cutoff (…)
exit=1                              ← 装不进去，node_modules 停在 10.9.2
```

点名的是 **10.9.2**（锁文件里那条旧 entry），不是你要装的 10.9.3——**看报错找新版本是找错了对象**。
此时往 profile 的 `pnpm-workspace.yaml → minimumReleaseAgeExclude` 里追加版本号**救不了这一步**：实测把
`10.9.2` 与 `10.9.3` 两条**都**写进豁免表后，裸 `pnpm install` 的锁文件校验确实过了（`Lockfile is up to date`），
但 `pnpm add dsh-dream-skin@10.9.3` 仍拒绝，错误换成
`[ERR_PNPM_NO_MATURE_MATCHING_VERSION] … dsh-dream-skin@10.9.3 was published at 2026-10-09T11:54:34.720Z,
within the minimumReleaseAge cutoff (…)` —— `add` 的解析步骤不读那张表。跑通的只有一条：

```sh
pnpm add dsh-dream-skin@<确切版本号> --config.minimumReleaseAge=0
```

→ `+ dsh-dream-skin 10.9.3`、退出码 0、8.5 的三读数全对（2026-10-10 本机实跑）。这条与 `docs/desktop-support.md:265`
记的"对照实验：`--config.minimumReleaseAge=0` 同样放行（备选手段）"一致。

**8.4 官方桌面 profile：命令行指过去会被硬拒，只有两条路**

官方 DSH Desktop 的 profile 在 `~/.dsh/profiles/desktop`（宿主把 profile 放在 `$DSH_HOME/profiles` 下——这是
`--profile <name>` 选项自己的说明文字；本机实装 `@deepseek-ai/dsh` 0.2.0-rc.1）。这个目录**由 Electron 应用独占管理**：
把 `dsh plugin` 的 profile 参数指向那个名字，宿主 CLI 在动作分派前就拒（`lib/bin.js` 里 `rejectElectronProfile()`
挂在 `--profile` 的处理路径上，早于任何一次 pnpm 调用），用户看到的原样一句是
`error: profile "desktop" is managed exclusively by the Electron application`——本机在
`%APPDATA%\npm\node_modules\@deepseek-ai\dsh\lib\bin.js` 读到该分支
（`if (profile.toLowerCase() === "desktop") program.error(…)`）。**本文件不给出那条命令的形状**：照着敲只会得到
同一句拒绝，而拒绝里没有任何信息告诉用户该走哪条路。完整的成因、证据与告警写法在 `docs/desktop-support.md:243`；
README 侧同一事实见 `README.md:327`。走得通的两条，装完都要按 8.5 验：

1. 应用内的插件管理界面（该 profile 目录下的 `.plugin-manager/logs` 是它的痕迹，本机实存）；
2. 在该 profile 目录里手工 `pnpm add dsh-dream-skin@<确切版本号>`。本机现状即这条的产物：
   `~/.dsh/profiles/desktop/package.json` 依赖为 `^10.9.3`、`pnpm-lock.yaml` 钉 `10.9.3`（该条的 `resolution` 是
   registry 的 `integrity: sha512-…` 而不是 `link:`，这正是它与工作区安装的区别所在）、
   `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude` 列着 `10.9.1/10.9.2/10.9.3`、
   `node_modules/dsh-dream-skin` 是 22 个文件的 registry 安装物。刚发出去的那 24 小时内走这条会撞上 8.3(b)：
   2026-10-09 在该目录里遇到的就是它，本机 2026-10-10 在临时目录里用"把窗口拉大到覆盖已装版本"的办法复现了同一条
   报错，当时实测只有 `--config.minimumReleaseAge=0` 通。

**8.5 验"到底加载了什么"，三个读数 + 一条装载计划**

前三条命令跑在**临时目录**里（文件层，不需要宿主）；第四条 `npm pack --dry-run` 跑在**仓库**里，它给的是对照基准。
宿主页面上的那条（下面那段 `--dump-config`）才需要对**真 profile** 动手——别为了验它把新包塞进日常在用的那个：

```sh
node -p "require('./node_modules/dsh-dream-skin/package.json').version"
grep -o 'PLUGIN_BUILD = "[^"]*"' node_modules/dsh-dream-skin/lib/client.js
find node_modules/dsh-dream-skin -type f | wc -l
npm pack --dry-run          # 在仓库里跑，拿它的 total files 跟上一条比
```

对照物（都不许凭记忆）：仓库 `package.json` 的 `version`、`lib/client.js` 里 `const PLUGIN_BUILD = "…"` 那一行（**别写行号**——这一节自己就改过它几次）、`npm pack --dry-run` 的 `total files`。2026-10-10 本机实跑：`npm pack --dry-run` 报 `total files: 22`，registry 安装物
三个读数 = `10.9.3` / `PLUGIN_BUILD = "10.9.3"` / `22`，逐项一致；安装物里 `scripts/`、`tests/`、`CHANGELOG.md`、
`docs/screenshots/`、`docs/previews/` 全部不存在
（前三个被 `package.json` 的 `files` 白名单挡在外面，后两个是 issue #83 起刻意排除，见第一节与第五节）。
**同一命令在 10.10.0 的工作树上重跑是 `total files: 24`**——多出的两个是本轮 B-04 补进 `files` 的
`docs/publishing-to-npm.md` 与 `docs/computed-style-gate-in-ci.md`（这两份是"访客要能自己复算门"的说明，
不发出去就等于让人来问）。所以上面那组 22 是 **10.9.3 安装物的实测读数**，不是当前仓库的对照基准；发版时
三个读数都要现取，别拿这一节的历史数字当基准。
**只比 `total files`，别比体积**：第一节那对 `263.4 kB / 754.2 kB` 是 issue #83 那轮改排版时记下的**当时**读数，
本次同一条命令报的是 `344.3 kB / 947.5 kB`——两个数不同只是量于不同轮次，本文件不去解释差从哪来（要盯体积就每次
现读 `npm pack --dry-run` 的两栏，与**上一次发布**的读数比，而不是与文档里的历史数比）。
**为什么 `PLUGIN_BUILD` 不能省**：`package.json` 只是包的元数据，它的版本号对了，并不说明浏览器真正加载的
那份 `lib/client.js` 是新的——两者不同步就意味着"包装上了、跑的是旧 bundle"，而 registry 侧没有任何门会为此翻红
（仓库侧的同步断言见第五节 PLUGIN_BUILD 条目与 `tests/client.smoke.test.cjs:863`）。

装载计划半边（真 profile 上）：

```sh
dsh --profile web --dump-config | grep -A2 dream-skin
```
```
# == dsh-dream-skin
- id: dream-skin
  name: dsh-dream-skin
```
（第二段是本机实跑输出，逐字。）

这条只证明**宿主打算载它**，不证明渲染进程里真挂载了——口径见 `docs/desktop-support.md:273`（"验证止于安装期放行
+ `--dump-config` 里出现 `- id: dream-skin` 条目"）。运行期证据是页面里的 `window.__DSH_DREAM_SKIN_STATUS__`
（其 `build` 就是 `lib/client.js` 顶部的 `PLUGIN_BUILD`），官方桌面壳上读到过 `build:"10.9.1"` / `"10.9.2"`，
但那属于第九节的分诊材料，不是本文件能替下一次发布担保的东西。

## 九、桌面用户报"修复没生效"：先分诊他实装的版本，再讨论修复

老 profile 的依赖范围若是 `^9.29.0`，10.x **按 semver 就到不了**——拿宿主自带的那份 semver 现场判
（本机实装是 `@deepseek-ai/dsh` 0.2.0-rc.1，它自带 `semver` 7.8.5，路径用 `%APPDATA%` 展开，换机器不用改命令）：

```sh
node -e "const s=require(process.env.APPDATA+'/npm/node_modules/@deepseek-ai/dsh/node_modules/semver');console.log(s.satisfies('10.9.3','^9.29.0'), s.satisfies('10.9.3','^10.9.0'))"
# false true     ← 2026-10-10 本机实跑：^9.29.0 收不到 10.9.3，^10.9.0 收得到
```

`dsh plugin update` 会不会跨大版本把它抬上去——**这一半本机未证**，`CHANGELOG.md:147` 写得很明白（"本机 0.2.0-rc.1
的 CLI 里没定位到可复核的实现，蓝军同样没定位到，本版不替它背书"），`CHANGELOG.md:88` 与 `docs/desktop-support.md:246`
只是那样记的。所以处置顺序是：**先读用户那份 `node_modules/dsh-dream-skin/package.json` 的版本号**（8.5 的第一条
读数），再谈修复有没有效——10.9.1 / 10.9.2 两轮里报告人看到的那两处旧缺陷正是"版本没到"，而 `CHANGELOG.md:88`、
`docs/desktop-support.md:246` 都记着"本版对它们没有改代码"：那种报告按第八节的安装路径送达新版即可结案，
不该开新的修复轮。
