---
name: dsh-skin-install
description: 从 dsh-dream-skin 仓库安装或切换 DSH Web 换肤插件：定位并同步仓库、说明皮肤/壁纸/强调色/主题包能力与安装方式、询问用户确认后按官方 dsh plugin 流程安装并告知重启。当用户要求安装/更新/卸载本插件（dsh-dream-skin、dream skin、换肤插件）或"一键换肤"时使用。
---

# dsh-dream-skin 安装 / 切换

目标：帮用户把 dsh-dream-skin 装进 DSH Web profile，一次说清"装的是什么、怎么装、装完怎么生效"，然后按官方流程执行并验证。

**本技能只给流程指导，具体事实以现场读取为准**：仓库会更新（新版本、新功能），不要依赖本文件或记忆中的版本号，每一步都实时读仓库内容。

## 流程

### 1. 定位仓库并确认最新

- 用户可能已有本地克隆。优先在当前工作目录找 `package.json`（含 `"name": "dsh-dream-skin"` 特征）；找不到就问用户，或 `git clone https://github.com/RevolutionLA/dsh-dream-skin` 到临时目录。
- 确认最新：`git fetch origin` + `git status -sb`（无 behind 即最新；落后时 `git pull --ff-only`）。
- 也可以直接装 npm 正式包（推荐给普通用户，无需 clone）。

### 2. 向用户交代能力（安装前简短说明）

- **8 套原创主题**（Mirage 幻梦：深海渊/极光/星云/余烬/午夜/象牙暖/晨雾蓝/蔷薇粉，浅深兼顾）。
- **背景壁纸**：本地图（自动压缩 ≤2MB）/ 图片 URL / 渐变预设，透明度/模糊/自动弱化可调。
- **每用户强调色**：12 个预设色块 + 选色盘 + 随机 + 恢复主题色。
- **主题包**：导入/导出 `*.dsh-theme.json`、分享链接（URL hash 编码）、本地库收藏/移除/随机。
- 纯原生 `--dsw-*` token 实现：无注入、不改安装包、不因 DSH 更新失效。

### 3. 与用户交互：确认安装方式（必做）

用交互工具（如 `ask_user_question`）确认安装来源：

- **npm 正式包（推荐）**：`dsh plugin --profile web add dsh-dream-skin`
- **GitHub 固定提交**：`dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<commit>'`
- **本地克隆（开发迭代）**：`dsh plugin --profile web add <克隆路径>`

**不要跳过确认擅自安装。** 提供"不安装/保持现状"选项。

### 4. 执行安装

```sh
dsh plugin --profile web add <所选来源>
```

- 安装会更新 profile 的 `package.json` 依赖并把插件注册进 `dsh.profile.bundles`（无需手动改配置）。
- 若 pnpm 报 `ERR_PNPM_IGNORED_BUILDS` 等构建脚本审批类错误：这是环境既有策略，link 类依赖通常已生效；用
  `dsh --profile web --dump-config | grep -A2 dream-skin` 验证 loader 条目是否出现。
- **若报 `dsh: installation rejected: Plugin dsh-dream-skin@<旧版本> is incompatible with dsh <运行时>` 并紧跟
  `dsh: restored package.json, pnpm-lock.yaml, and node_modules.`**：先怀疑**静默降级**，不要当成"插件不支持该宿主"。
  pnpm 的 `minimumReleaseAge`（新版本冷静期）会把不带版本号的 `add` 解析成上一个成熟版本（输出里只有
  `+ dsh-dream-skin ^<旧版>` 和一行 `(<新版> is available)` 提示），而那个旧包的 peer 范围可能不覆盖当前运行时。
  处置：读 `package.json` 里的当前版本号，改用**显式版本号**重装 ——
  `dsh plugin --profile web add dsh-dream-skin@<该版本>`（显式版本会让 pnpm 自动把它写进 profile 的
  `pnpm-workspace.yaml` → `minimumReleaseAgeExclude`，实测即通过）。**不要**用 `dsh plugin allow-version` 给旧版开豁免：
  那只是让不兼容的旧 peer 范围强行装上，宿主换代损伤一个没修。

### 5. 验证与重启

- `dsh --profile web --dump-config` 应出现 `- id: dream-skin / name: dsh-dream-skin` 条目。
- 让用户重启 DSH Web（或征得同意后由 agent 终止旧进程再 `dsh web`）。重启会中断当前会话，但 DSH 会话有磁盘
  持久化，重启后可恢复。
- 重启后浏览器打开 **设置 → 外观（Theme）**，确认「皮肤」「强调色」「背景图片 / 高级壁纸」「主题包」出现。

### 6. 更新 / 卸载（用户要求时）

- 更新（npm 装）：`dsh plugin --profile web update dsh-dream-skin`，重启生效；若 pnpm 的 minimum-release-age
  策略挡住新版本，在 profile 目录执行 `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0`。
- 卸载：`dsh plugin --profile web remove dsh-dream-skin`，重启后恢复官方外观。

## 已知要点（判断用，非写死事实）

- 双面插件：host 半边（`cordis.patch.yml` 插入 dream-skin 入口）+ 浏览器半边（`lib/client.js`）。
- 持久化用 `localStorage`（键前缀 `dsh-dream-skin:`），只在当前浏览器生效。
- 不是官方产品；问题反馈走仓库 issue（https://github.com/RevolutionLA/dsh-dream-skin/issues）。
