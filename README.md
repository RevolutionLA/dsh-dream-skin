<p align="center">
  <strong>中文</strong> · <a href="./docs/i18n/README.en.md">English</a> · <a href="./docs/i18n/README.ja.md">日本語</a> · <a href="./docs/i18n/README.ko.md">한국어</a> · <a href="./docs/i18n/README.es.md">Español</a> · <a href="./docs/i18n/README.fr.md">Français</a> · <a href="./docs/i18n/README.de.md">Deutsch</a> · <a href="./docs/i18n/README.ru.md">Русский</a>
</p>

<div align="center">

# dsh-dream-skin 🔮
[![DSH Insights health](https://dsh-insights.com/badge/RevolutionLA/dsh-dream-skin.svg)](https://dsh-insights.com/p/RevolutionLA/dsh-dream-skin/)

**为 DeepSeek Harness 换上一张克制、清透、有质感的「脸」。**

原生换肤 · 背景壁纸 · 强调色 · 主题包 —— 一条 `--dsw-*` token 生态内的优雅实现。装一次，用很久。

> **写代码的地方，可以很安静。**

| 🎨 8 套原创主题 | 🖼️ 壁纸 + 弥散光 | 🎯 克制的强调色 | 📦 主题包可分享 |
|---|---|---|---|

> 1 行安装 · 纯原生（无注入/不改安装包）· 不因 DSH 更新失效

</div>

---

## 🎮 两种玩法，一条插件都给你

<table>
  <tr>
    <td align="center" width="50%"><h3>🪄 玩法一：开箱即用的优雅</h3></td>
    <td align="center" width="50%"><h3>🧱 玩法二：随你掌控的 DIY</h3></td>
  </tr>
  <tr>
    <td>内置 <b>8 套设计师调校的预设皮肤</b>（Mirage 幻梦系列），浅色 / 深色兼顾，每套自带专属弥散光背景。<br/><b>戴上即高级，不用任何调参。</b></td>
    <td>在预设之上，你还能 <b>换壁纸（本地图 / URL / 渐变）</b>、<b>叠加强调色 Accent</b>、<b>拖入或分享一个主题包</b>，内部每个 token 都能摸到。<br/><b>想要的样子，自己捏。</b></td>
  </tr>
</table>

两种玩法分层独立、互不干扰：预设皮肤决定「材质与底色」，DIY 一层是纯叠加（`overrideTokens`），随开随关、一键还原。

---

## 📸 实机截图

> 真机效果，非概念图。左：应用皮肤后的 DSH 界面；右：设置里的「外观 / Theme」分节。

<p align="center">
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/screenshots/preview.png" alt="DSH 皮肤实机预览" width="46%"/>
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/screenshots/settings.png" alt="设置中的外观分节" width="46%"/>
</p>

---

## 🎨 玩法一：8 套预设皮肤（Mirage 幻梦系列）

> **开箱即用的优雅。** 在 **设置 → 外观（Theme）** 一键切换。下列预览由各皮肤的**真实 token + 专属弥散光背景**生成——所见即所得，点开可放大查看精致材质。

<table>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/abyss.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/abyss.png" width="230" alt="abyss"/></a><br/><b>abyss</b> · 🕶️ 沉静蓝<br/><sub>深海蓝黑底，唯一一束靛蓝高光；弥散光取深水反弹</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/aurora.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/aurora.png" width="230" alt="aurora"/></a><br/><b>aurora</b> · 🌌 极光青<br/><sub>冷青主调，强调色转出成功绿带，信号色永不撞车</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/nebula.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/nebula.png" width="230" alt="nebula"/></a><br/><b>nebula</b> · 🪐 星云紫<br/><sub>星云尘埃紫，弹层与气泡同源渐变，朦胧而有序</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ember.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ember.png" width="230" alt="ember"/></a><br/><b>ember</b> · 🔥 余烬橙<br/><sub>唯一暖色暗皮肤：焦琥珀 + 深可可底，暖而不脏</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/midnight.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/midnight.png" width="230" alt="midnight"/></a><br/><b>midnight</b> · 🌚 午夜黑<br/><sub>刻意消色差的 OLED 纯黑，最克制的沉浸</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ivory.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ivory.png" width="230" alt="ivory"/></a><br/><b>ivory</b> · 📐 iOS 扁平<br/><sub>暖纸感画布 + iOS 蓝，白阶梯精排不刺眼</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/mist.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/mist.png" width="230" alt="mist"/></a><br/><b>mist</b> · 🧊 干净明亮<br/><sub>唯一真半透明液态玻璃：六层 alpha 表面，模糊 8px</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/rose.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/rose.png" width="230" alt="rose"/></a><br/><b>rose</b> · 🌸 Material 粉<br/><sub>玫瑰纸感 + 品牌洋红，红色信号仍归红色</sub></td>
  </tr>
</table>

> 浅色 / 深色兼顾：`mist`、`ivory`、`rose` 为浅色系，其余为深色系。
>
> **每套皮肤自带专属默认参数**（弥散光浓度 / 模糊 / 侧栏与输入框透明度 / 弹窗透明度 / 玻璃材质）——
> 切到哪套，哪套就是它的最佳状态；你自己调过的参数不会被覆盖。8 套皮肤全部通过 229 项可测质量门（217 项调色门 + 12 项工艺门）
> （OKLCH 感知明度阶梯、三级文字对比度 WCAG 2.1 + APCA 双达标、信号色相分离、跨皮肤可区分度）。
> 不喜欢预设？往下看**玩法二**。

---

## 🧱 强大 DIY 空间（玩法二）

> 预设皮肤之外，dsh-dream-skin 还给你一套完整的自定义体系——想捏出独一无二的工作区，从这里开始。

| 能力 | 玩法二 · 你能做什么 |
|------|------|
| 🖼️ **自定义壁纸 2.0** | 本地图 / **图片 URL** / **渐变预设**；附带**透明度 / 模糊 / 填充方式**（裁剪填满 · 完整显示 · 模糊填充），每套皮肤还**自动建议**一张渐变，可**自动弱化**（聚焦任务时降低干扰） |
| 🌈 **每用户强调色 Accent** | 为当前皮肤叠加自定义品牌强调色（`overrideTokens` 层，不动皮肤本身），**12 个典型色块一键选色** + 选色盘 + 随机 + 恢复主题色 |
| 📦 **主题包导入 / 导出 / 分享** | 一个 `*.dsh-theme.json` = manifest + 全套 tokens，可**导入文件**、**一键应用**、**复制分享链接**（编码进 URL hash） |
| 🪟 **弹窗不透明度** | 滑块控制下拉菜单 / 浮层 / 弹窗的底填充透明度，跟随持久化保存；凡用「弹层底色」令牌铺底的面（设置面板、插件管理、轨迹图 tooltip、卡片浮层等）共享一层 92% 可读性下限，滑杆拉到底也不读穿；下拉菜单与遮罩两条腿仍是全量程 |
| 🧩 **本地主题包库** | 导入的主题包集中展示，**应用 / 收藏 / 移除** 一键完成 |
| 🎲 **换一个试试（surprise me）** | 随机换一个和你当前不同的主题；**收藏**喜欢的皮肤快速切换 |
| ✅ **校验 + 回滚** | 导入时校验格式 / 必填 token / 颜色合法性；失败或移除时安全回退，不做破坏性更改 |

> 一切都叠加在预设之上，**随开随关、一键还原**到 DSH 内置外观——大胆去试，不会弄坏什么。

---

## ⚡ 一句话安装

**复制下面这句话给你的 DSH，它自己会装好一切：**

> 请帮我安装 dsh-dream-skin 换肤插件（https://github.com/RevolutionLA/dsh-dream-skin 或 npm 的 dsh-dream-skin），装完告诉我如何重启 DSH Web。

不想麻烦 Agent？命令行一条：

```sh
dsh plugin --profile web add dsh-dream-skin && dsh web
```

> 🚀 **现已发布到 npm！** 装好 DSH 后，一条命令即可安装，无需 clone。

> **致敬 [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)。** 但实现路径不同：Codex 是往桌面客户端渲染进程
> 注入 CSS（CDP），而 DSH 本身是 **token 驱动的 Web GUI**，官方就提供了「第三方插件注册主题」的能力——所以本插件是
> **纯原生接入**，无注入、不改二进制、不因客户端更新失效。
>
> **不是官方产品。** 仅供美化你的 DeepSeek Harness 工作区。

---

## 🏆 为什么值得用（vs 同类 DSH 主题插件）

> 换个赛道看：同类插件要么是把一套现成色板移植过来（好看，但配置只有一个开关）、要么是锁死单一美学的定制款、
> 要么专注把外部壁纸搬进来。我们把换肤做成**一整套可调的材质与配色系统**——追求的不是「更花」，
> 而是「更准、更克制、更耐看」，像一块反复推敲的玻璃。**审美 + 可调性是我们的护城河。**

| 能力 | 本插件 | [dsh-catppuccin-theme](https://github.com/NoNameLeGo/dsh-catppuccin-theme)（色板移植） | [dsh-theme-mineradio](https://github.com/dhicoc/dsh-theme-mineradio)（单一美学定制） | [dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine)（壁纸引擎 + 液态玻璃 UI） |
|------|:---:|:---:|:---:|:---:|
| **8 套原创设计**（非现成色板移植，原创 token + 弥散光） | ✅ | ❌ (4 套 Catppuccin 官方色板) | ❌ (1 套香槟金美学) | ❌ |
| **毛玻璃 / 液态玻璃双材质**一键切换 | ✅ | 部分（固定玻璃质感） | ❌ | ❌ |
| **输入框 / 弹窗独立透明度滑杆** | ✅ | ❌ | ❌ | 部分（设置窗口 / 浮层 / 左侧栏 / 标题栏各有独立透明度与模糊；输入卡片与气泡可独立配颜色与保真度，透明度走全局） |
| **开箱即用的出厂配置**（装完重启就是调好的样子） | ✅ | ❌ | ✅（本身即成品） | 部分（出厂玻璃默认 + 7 份玻璃预设；无出厂壁纸 / 皮肤） |
| 自定义壁纸 + 透明度/模糊 | ✅ | ❌ | ❌ | ✅（核心能力） |
| **壁纸 2.0**（URL / 渐变预设 / 每皮肤建议 / 自动弱化 / 必应每日 + 定时更新） | ✅ | ❌ | ❌ | 部分（本地图片 / 视频上传 + 自动轮播定时切换 + 适配模式；无 URL / 渐变预设 / 必应每日） |
| **每用户强调色 Accent**（叠加层，不动皮肤本身） | ✅ | ❌ | ❌ | 部分（6 预设 + 自定义主题色，驱动按钮 / 开关 / 链接 / 导航选中 / 滑块 / 玻璃高光；无「皮肤叠加层」概念） |
| **主题包导入/导出 + 分享链接**（JSON，无代码分发） | ✅ | ❌ | ❌ | 部分（字体集与玻璃预设可导出 / 导入 JSON；无分享链接） |
| 本地主题包库 + 收藏 + 随机换 | ✅ | ❌ | ❌ | ❌ |
| **两代宿主兼容 + 运行时能力探测**（宿主换代自动降级不报错） | ✅ | 未知 | 未知 | 部分（单一开放 peer 区间覆盖 0.1.5-rc.1+ 与 0.2.x 两条宿主线；有宿主形态 / 能力探测与局部降级；内核下限 0.1.5-rc.1 为硬要求） |
| 校验 + 回滚（不做破坏性更改） | ✅ | 部分 | — | 部分 |

> **一句话**：想要 Catppuccin 的品牌色、mineradio 的氛围感？本插件的主题包系统都能做出来或叠出来——
> 反过来不成立。

---

## ✨ 功能一览

| 能力 | 说明 |
|------|------|
| 🎨 **8 套主题预设（Mirage 幻梦）** | 在 **设置 → 外观（Theme）** 一键切换，浅色 / 深色兼顾 |
| 🖼️ **自定义壁纸** | 上传本地图（自动压缩 ≤2MB），调节**透明度 / 模糊 / 填充方式**（裁剪填满 / 完整显示 / 模糊填充）；选中图片后可再调**取景**（水平/垂直偏移 ±100%、缩放 50–300%，偏移以视口为单位，图片可以整张移出画面） |
| 🧊 **玻璃材质（毛玻璃 / 液态玻璃）** | 一键切换玻璃质感，透明度滑杆**越右越透**；模糊一个旋钮同时驱动壁纸与玻璃表面 |
| 🪫 **低功耗模式** | 设置 → 玻璃效果里一个勾选：关闭全部玻璃模糊与壁纸模糊，把大块半透明面变成平涂。给「两块窗口同开就掉帧 / GPU 占用高」的机器一个开关（issue #110）；**三态**：没动过勾选 = 自动跟随系统的「减少透明度」（macOS 辅助功能 → 显示 → 减少透明度），勾过 = 固定住你的选择，行上可「交还给自动」。#110 的 M4 实测：空闲 GPU 23% → 11%，快速滚动 75-80% → 60-65% |
| 🖼️ **开箱即用的出厂配置** | 首次安装即带完整美化配置：星云皮肤 + 内置壁纸 + 调好的玻璃数值，装完重启就能用 |
| 🌤️ **必应每日壁纸（预置）** | 高级壁纸预填必应每日一图接口，点「应用链接」即可（重复点会**强制重新拉图**，不会被浏览器缓存挡回旧图）；也支持任意图片 URL + 定时自动更新 |
| 🔁 **壁纸轮换** | 高级壁纸选「图片链接」后，可贴入最多 20 条 http/https 图片链接（每行一条），按 5 分钟到 7 天的间隔顺序或随机切换，也可点「立即换下一张」。坏链接只丢它自己、不阻断其他条目；窗口隐藏时不切换，回到前台补上；默认关闭（issue #61） |
| 🔤 **内层不透明** | 卡片、输入框、消息气泡不被壁纸盖住，可读性优先 |
| ↩️ **默认还原** | 一键回到 DSH 内置外观（跟随系统） |
| 💾 **三层持久化** | 皮肤与壁纸存 `localStorage` **+ 宿主侧 `dream-skin.json`**，刷新不丢；**桌面版每次换端口、重启也不丢** |

---

## 🧩 它是什么形式的插件

**它是 DeepSeek Harness 的标准「双面插件」（`dsh-plugin`）——加载和用法与官方 `ui-theme` 完全一致。**

DeepSeek Harness 的口号是「一切皆插件」：模型、工具、沙箱、会话、UI，乃至 Agent Loop 本身都是插件。
`dsh-dream-skin` 的本质就是把「换肤」做成一个和官方 UI 包**同构**的 npm 包：

```text
            ┌────────────── dsh-dream-skin（标准 dsh-plugin / 双面插件）──────────────┐
            │  dsh.bundle   → cordis.patch.yml 插入 dream-skin 入口   (host 半边)     │
            │  dsh.client   → lib/client.js（浏览器 bundle）          (浏览器半边)     │
            └─────────────────────────────────────────────────────────────────────────┘
```

- **安装命令 = 官方唯一安装命令**：`dsh plugin --profile web add dsh-dream-skin`
- **官方桌面版（DSH Desktop）不能用命令行装**：宿主 CLI 里写死了 `profile === "desktop"` 直接报错
  （`error: profile "desktop" is managed exclusively by the Electron application`，本机在 `dsh/lib/bin.js` 读到该分支）。
  两条走得通的路：① 在应用内的插件管理界面装；② 在该 profile 目录里手工
  `pnpm add dsh-dream-skin@<确切版本号>`（实测 2.3 秒通过，pnpm 会自行把该版本追加进 `minimumReleaseAgeExclude`）。
  **版本号必须写死**：老 profile 的 `^9.x` 按 semver 覆盖不到 10.x，而发布 24 小时内不带版本号的命令会被 pnpm 冷静期退回旧版。
- **调用的是官方扩展点**：`ctx.theme`（注册主题）、`ctx.theme.overrideTokens`（叠加层）、
  `ctx.slots`（把 UI 挂进独立的 **设置 → 外观 / Theme** 分节）。
- **manifest 契约与官方一致**：`dsh.bundle` + `dsh.client` + `exports["./client"]`。

也就是说：**你装的不是一个旁门左道的脚本，而是 DSH 官方插件体系里的标准皮肤插件。**

---

## ⚡ 快速开始（3 步）

```sh
# 1. 安装
dsh plugin --profile web add dsh-dream-skin
# 2. 重启
dsh web
# 3. 打开 设置 → 外观（Theme）→ 皮肤，挑一套 → 完。
```

> 装的是 npm 已完成发布的正式包，无需 clone。若 `dsh plugin add` 报 workspace 相关错误，补一个 `-w` 即可。
> 两种情况下请把版本号写死（`npm view dsh-dream-skin version` 当场查号）：**刚发版的 24 小时内**（pnpm 冷静期会静默装上旧版），
> 以及**从 9.x 升上来的老 profile**（`^9.29.0` 覆盖不到 10.x）——见下文「安装」与「更新」。

## 📦 安装

四种方式任选其一，装完**重启 DSH Web** 即生效（当前会话会中断，但 DSH 会话有磁盘持久化，重启后可以恢复）。

### 方式一：npm 正式包（**推荐**，最简单）

```sh
dsh plugin --profile web add dsh-dream-skin
```

> **刚发版的那 24 小时内，请把版本号写死**：`dsh plugin --profile web add dsh-dream-skin@<最新版本>`（版本号当场查：`npm view dsh-dream-skin version`）。
> 原因是 pnpm 的 `minimumReleaseAge`（新版本冷静期）会把不带版本号的 `add`/`update` **静默解析成上一个"成熟"版本**，
> 并在输出里只留一行提示（如 `+ dsh-dream-skin ^9.27.1` / `(9.29.0 is available)`）。若那个旧版本的主机 peer 范围
> 不覆盖你当前的 dsh 运行时（例如 9.27.x 声明 `^0.1.0-rc.6`，不含 0.2.x），宿主会在安装期直接拒绝并回滚
> `package.json` / `pnpm-lock.yaml` / `node_modules`，报错看起来像"插件不兼容"，实际是**没装上最新兼容版**。
> 显式写版本号会让 pnpm 自动把该版本加入 profile 的 `minimumReleaseAgeExclude`，不再退回旧版。
> 等冷静期过了（发布时刻 +24h）用不带版本号的命令效果相同。桌面版同理，把 `--profile web` 换成你实际的 profile 名
> （在 `%USERPROFILE%\.dsh\profiles\` 下看目录名）；**桌面 profile 由 Electron 应用独占管理，CLI 会硬拒**，
> 走 `docs/desktop-support.md` 里那条走得通的路。

### 方式二：从 GitHub 安装（固定到已验证的提交）

```sh
dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<40位commit>'
```

> 固定到 release 对应的 commit，之后 `main` 的新改动不会静默改变已安装代码。

### 方式三：从 Release tarball 安装（离线 / 不便走 git 的环境）

从本仓库 [Releases](https://github.com/RevolutionLA/dsh-dream-skin/releases) 下载 `dsh-dream-skin-<版本>.tgz`（内含构建好的 `lib/client.js`，安装时无需执行任何 prepare 脚本），然后：

```sh
dsh plugin --profile web add ./dsh-dream-skin-<版本>.tgz
```

### 方式四：克隆后从本地路径安装（开发迭代）

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
dsh plugin --profile web add .
```

> `dsh plugin` 会把相对路径锚定到你**运行命令的目录**，装的是指向克隆目录的 link 依赖：改完源码保存，重启 DSH 即生效，无需重新安装。

**重启并验证**：

```sh
dsh web
dsh --profile web --dump-config | grep -A2 dream-skin   # 应出现 dream-skin loader 条目
```

打开 **设置 → 外观（Theme）**，即可看到「皮肤」「强调色」「壁纸 / 高级壁纸」与「主题包」等行。

> `-w` 标志在裸 `add` 时必需：每个 profile 自带 `pnpm-workspace.yaml`，pnpm 会把它当作 workspace 根，裸加报错
> `ERR_PNPM_ADDING_TO_ROOT`。若已加过 `-w`，后续用现有 workspace 即无需重复。

## 🔄 更新 / 卸载

**更新到最新版**（装的是 npm 正式包时）：

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # 重启生效
```

> **刚发版的那 24 小时内，请把版本号写死。** pnpm 的「新版本冷静期」（`minimumReleaseAge`，默认 24 小时）会把
> 不带版本号的 `add` / `update` **静默解析成上一个"成熟"版本**——不报错，只在输出里留一行
> `(x.y.z is available)` 提示。若那个旧版本的主机 peer 范围不覆盖你当前的 dsh 运行时，宿主会在安装期直接拒绝并
> 回滚 `package.json` / `pnpm-lock.yaml` / `node_modules`，**看起来像"插件不兼容"，实际是没装上新版**。改用：
>
> ```sh
> dsh plugin --profile web add dsh-dream-skin@<最新版本>   # 显式版本会让 pnpm 把它加进 profile 的 minimumReleaseAgeExclude
> ```
>
> 桌面版同理，把 `--profile web` 换成实际 profile 名（`%USERPROFILE%\.dsh\profiles\` 下的目录名）。
> 完整说明与对照实验见 [issue #62](https://github.com/RevolutionLA/dsh-dream-skin/issues/62) 的补充更正。

> **老 profile 请直接用带版本号的 `add`，别指望 `update`**：`update` 沿用 `package.json` 里**已有的依赖范围**，
> 而 9.x 时代写下的 `dsh-dream-skin: ^9.29.0` 按 semver 永远覆盖不到 10.x（caret 只在同一个主版本内浮动），
> 于是 `update` 报"已是最新"、界面却还是旧版。改写这条依赖要用：
>
> ```sh
> dsh plugin --profile web add dsh-dream-skin@<最新版本>   # npm view dsh-dream-skin version 当场查号
> ```
>
> 这不是新缺陷，是**旧修复没送达**——排查这类"我明明更新了却没变化"请先核对实装版本号，
> 步骤见 [docs/publishing-to-npm.md](./docs/publishing-to-npm.md) 第九节。

**卸载**：

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # 重启后恢复官方外观
```

---

## 🧩 兼容性

| 项 | 值 |
|------|-----|
| DeepSeek Harness (`dsh`) | **同一构建兼容三代宿主**：`0.1.0-rc.6` ~ `0.1.x`（稳定版）与 `0.2.0-rc.1` / `0.2.x`（peer 已放宽为 `>=0.1.0-rc.6 <0.3.0-0`，宿主换代由运行时能力探测兜底）。**宿主升级后皮肤消失但插件显示已装？** 多半是 peer 窗口把整包跳过了——应急出路：`dsh plugin allow-version dsh-dream-skin@<版本> <宿主运行时版本>`（**用户自担风险的显式覆盖**，不是推荐做法），详见 [docs/desktop-support.md](./docs/desktop-support.md) |
| Node.js | `>=18` |
| 浏览器 | 现代 Chromium / WebKit（依赖原生 CSS 变量与 `matchMedia`） |
| 桌面端 | **第三方 DSH Desktop 壳**：已适配并实机复核（issue #50/#51/#55）。**官方 DSH Desktop**：证据只支持"**预期可加载**"，不支持"已支持"——profile 目录与"壳能加载本插件"这两件事本机已实测（装进 `~/.dsh/profiles/desktop`，用户重启壳后加载，活页读到过我方材质表；路径与读数见 `docs/publishing-to-npm.md` 8.4 与 `docs/desktop-support.md`），但**跨重启的设置持久化本机从未验证**，故本文档**不给**可复制的桌面安装命令。<!-- desktop-claim: load-expected-unverified -->`--profile` 取值必须用宿主**自带**的模板名，照抄第三方文档会装进空壳 profile；判断依据见 **[docs/desktop-support.md](./docs/desktop-support.md)** |

> **兼容机制**：插件把全部平台 seed 放在受控 `try` 内按候选顺序探测，宿主全部换代时降级为哑模块并打 `console.warn`，不会拖垮 DSH Web（issue #43 已根治）。`0.2.0-rc.1` 起宿主按 peer 范围在 boot 阶段**整包跳过**不兼容插件，peer 窗口即本插件的对外兼容窗口，由回归门强制与 manifest 一致。**但宿主闸门只认 `@deepseek-ai/dsh` 前缀的 peer**：`@deepseek-ai/cordis` 与 `react` **不参与**宿主兼容判定（由包管理器的 semver 解析单独把关）。判定细节与两把尺的对照表见 `tests/package.host_compat.test.cjs` 与 [docs/desktop-support.md](./docs/desktop-support.md)。

<details>
<summary><b>📜 逐版本更新记录（10.15.0 → 9.9.0，点开查看）</b></summary>

**版本 10.23.0（2026-10-23）**：**#110 的 A/B 读数回来了，低功耗从「一个开关」升级成「三态：自动 / 固定开 / 固定关」。** 报告人（M4，同机同分辨率同两窗口，10.22.0）实测：停用插件 空闲 0% / 快速滚动 40–45%；默认（玻璃开）23% / 75–80%；低功耗 11% / 60–65%。三条结论：**模糊是最大单项成本**（空闲 −52%，10.21.1 的方向是对的）、**剩下的 11% 不是模糊**（属壁纸层自身，再往下压需要一份 Performance 录制，不靠猜改结构）、**滚动的宿主基线是 40–45%**（插件负责的是那 +15~35 点）。按 10.21.1 里写下的承诺，这一版把它做成正式方案，而不是等人先听说有开关：`dsh-dream-skin:performance` **缺键 = 自动**，读系统的「减少透明度」（`prefers-reduced-transparency: reduce`，Chromium 118 起的媒体特性，DevTools → Rendering 可仿真）；`1` / `0` = 用户固定，永远压过系统；行上「交还给自动」是**删掉这枚键**而不是写第三个哨兵值，所以文件形状与旧构建的读法都不变，也不给 `FACTORY_DEFAULTS` 添东西。系统没开偏好的机器**外观一字不变**（自动解析为「关」），连 `matchMedia` 都没有的 DOM 也照样挂载（守卫，不是抛错）。三处工程细节：① 系统偏好能在页面开着时改变，所以订阅它的 `change`——监听器**声明在 `apply()` 的 fiber 作用域、由该 fiber 的 `ctx.effect` 释放**，不放模块作用域：退休的一代不能拿着活的一代的闭包重绘（与 nav hook / wash-flip 同一条身份纪律，两条用例分别钉「stale dispose 只撤自己的」与「live unload 不遗留」）；② 一次翻转同时重发 CSS 开关、菜单底色通道、壁纸层与设置行，抽成 `rerenderLowPower()`——10.21.1 的 #115 正是「只动了一半」的现例；③ **固定住的选择不重绘**：OS 翻转时 store 的 revision 不动（用例钉住），否则用户每动一次辅助功能设置页面就闪一下。新增 2 条用例，**10 次反向破坏：8 次各自点名翻红，2 次故意留绿并把原因写在这里**（store 的 init 值一定被首次 sync 覆盖，真正的决策在 sync 那一维、已由另一条破坏覆盖；`restorePersistedState()` 里那次重发在假世界不可观测——fixture 在求值前就把 localStorage 灌满，boot 与 restore 的解析值必然相同，它是给桌面壳「localStorage 空 / 宿主文件已有值」那条路准备的，真机读数待取）。回归门 **583 用例**（10.23.0 发布时 571/571，壁纸取景分支再 +12，未发布；**1 项预算门未决**），质量审计 **229/229**。bundle 478,503 → **485,394 B**（+6,891 B；`lib/client.js` 的 480 KiB 天花板未动，余量 13,017 → 6,126 B）。**边界**：macOS 的「减少透明度」是否真被这个 Electron 壳转发给页面层，要报告人在 M4 上读 `matchMedia('(prefers-reduced-transparency: reduce)').matches` 的开 / 关各一次——DevTools 仿真只证明接线，不证明壳转发。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.23.0`。

**版本 10.22.0（2026-10-22）**：**修一个我在 10.21.1 写出来的缺陷——低功耗模式关掉了磨砂，却没动菜单底色 46% 的 alpha，结果菜单比正常时更透（#115）。** 菜单本来靠模糊承担可读性，磨砂一没，同一块 46% 就成了能读穿背后聊天的「保鲜膜」。#116（@aurora-zl）只在低功耗开着时给 `--dsw-menu-surface-fill` 发一条 `max(滑杆, 0.92)` 的覆盖，并保留皮肤自己的菜单色相；开关关着一行都不发，磨砂玻璃原样保留；拨开关当帧重发，不残留。新增 1 条用例（两个配色方案都 ≥0.92、激活方案色相不变、正常模式完全不碰该通道、拨开关能加能撤）与 1 次反向破坏（把门控改成 `if (false)` ⇒ 红）；恢复后 157/157 绿。回归门 **569/569**（568→569），质量审计 **229/229**。**边界**：本版只给菜单这一条通道加了下限，composer / 侧栏等其他玻璃面在低功耗下仍会失去模糊；判据是计算值，真机观感以 #115 的回执为准。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.22.0`。

**版本 10.21.2（2026-10-21）**：**壁纸轮换：一次贴最多 20 条图片链接，按 5 分钟到 7 天的间隔顺序或随机切换。** 这是 README §E「只接受 PR」里那条「壁纸多条链接轮换」，来自 #61 的顺带观察；@lisihao 的实现把四个阻碍逐条处理：每条链接在**每次读取时**逐条过安全门（坏条目只丢它自己，`data:` 被拒以免撑爆配额）、提交前先用 `Image` 预加载（死链保留当前壁纸，最多试 3 条，一个周期只重试一次）、与 URL 刷新**共用**同一个 60 秒 tick 与可见性监听（没有第二个定时器，一次唤醒最多一次拉取）、新键 `wallpaper-rotation` 只增不改（`wallpaper-url` 仍是「此刻显示的那条」，无游标字段）。默认关闭；窗口隐藏时不切换、回到前台补上；低功耗模式不暂停轮换（一次图片解码/周期，与模糊无关）。新增 18 条用例（`client.smoke` 16 / `client.storage` 2），PR 内附 **44 次反向破坏**与实机读数（`docs/evidence/wallpaper-rotation/`）。回归门 **568/568**（550→568），质量审计 **229/229**。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.21.2`。

**版本 10.21.1（2026-10-21）**：**issue #110 的 GPU 报告有了一个可测的开关：低功耗模式。** 静态读数能确定的只有两条：bundle **没有任何 CSS 动画**，成本集中在**合成**——全屏壁纸的 `filter: blur()` 加上多处 `backdrop-filter: blur(14–24px)` 的大面积半透明面。报告人（macOS M4）空闲 >50%、两窗口同开卡死，**但本机是 Windows，无法复现**。所以本版只给开关、不动默认：设置 →「玻璃效果」里新增「低功耗模式（关闭玻璃模糊）」，打开后所有 `backdrop-filter` 置 `none`、壁纸不再模糊、`fit=blur` 的 bleed 层不再创建；关掉逐项恢复、无需重启，卸载时根属性一并撤掉。新增 1 条用例（默认两根模糊层都在；打开后只剩一层且 `filter:none`；材质表确有该规则；设置动作让存储、属性、渲染同帧翻转），**两次反向破坏**（删壁纸分支 / 删 CSS 两行）各自翻红，恢复后 140/140 绿。同轮把测试夹具补成更真实的 DOM：`buildSandbox` 有了 `documentElement`，`makeEl` 真的记录属性——此前 `setAttribute` 是空实现，功能整段删掉都不会有红。回归门 **550/550**，质量审计 **229/229**。**没有**证明它能让 #110 的 GPU 下降——那要报告人在同一台 M4 上做 A/B（同页面、同窗口数，勾选前后各读一次 GPU）；开关是测量工具，不是已完成的修复。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.21.1`。

**版本 10.21.0（2026-10-21）**：**10.20.0 的降级链在真 cordis 上每个请求都抛错，本版改回 `ctx.get()`，并让"假 ctx"再也不能把这类缺陷藏起来。** 宿主 cordis 有一条规则：只有写进 `inject` 的服务才能按属性读，其余一律抛 `cannot get property "…" without inject`；而 `webStartup` / `webRuntime` 恰恰**不能**进 `inject`（那正是 #109 的病根），所以必须走 `ctx.get()`。10.20.0 用了属性访问，插件看起来挂载成功，但每次持久化请求都在降级链处抛错落成 500——症状与 #109 相同（设置不持久化），只是失败点上移了一层。**为什么 545 条用例没抓到**：`makeHarness()` 当时返回普通对象，测试建模的世界里没有"注入规则"这条法律。本版做两件事：① 把 `tests/host.persistence.test.cjs` 的 harness 改成 **Proxy**，复刻真 cordis 的三条规则（退回属性访问会让该文件 12 条用例当场翻红，恢复后 18/18 全绿）；② 新增 `tests/host.cordis.test.cjs`，把插件挂进**宿主自己的 cordis**，由兄弟 fiber 提供 `webServer` / `webStartup` / `webRuntime`，覆盖 0.2.1 形态、0.2.0 形态、两者皆缺三种宿主（退回属性访问时这 4 条里 3 条翻红，见证规则那条保持绿）。无宿主的机器上四条具名跳过，合成契约腿仍在 `host.persistence` 里跑。**PR #111（@v2yy）的 `ctx.get()` 写法从一开始就是对的**，本版按他的方案改正——10.20.0 是我把正确方案改错的版本，已发布、npm 不可变，这里照实记录。回归门 **549/549**（545→549，+4 全在新文件），质量审计 **229/229**（217 调色 + 12 工艺）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.21.0`。

**版本 10.20.0（2026-10-20）**：**DSH 0.2.1-rc.2 移除 `webRuntime` 服务导致宿主半边永久 pending，本版把它变成运行时降级链。** 插件的 `lib/index.js` 原先硬依赖该服务（`inject: ["webServer", "webRuntime"]`），在 0.2.1+ 上入口永远等不到 `webRuntime`，`apply()` 不执行，`/dream-skin/api` 不挂载，设置无法跨重启持久化（issue #109）。本版把 `inject` 改成只依赖 `webServer`，信任列表改为运行时动态获取：优先 `webStartup.trustedHosts`（DSH ≥ 0.2.1），回退 `webRuntime.trustedHosts`（DSH ≤ 0.2.0），两者皆无时返回空数组——环回地址仍由 `isTrustedApiRequest()` 的 `isLoopbackHostname` 守卫保护，配置授权纯属可选。新增 4 条测试用例验证降级链（优先 webStartup、回退 webRuntime、两者皆无时空数组但环回仍通、null 服务容错）。回归门 **545/545**（10.16.0 为 532），质量审计 **229/229**（217 调色 + 12 工艺）。**↑ 本版含一处缺陷，由 10.21.0 更正**：降级链用了属性访问，真 cordis 上每个请求抛错。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.20.0`。

**版本 10.16.0（2026-10-16）**：**第三方目录收回了它那条体积报告，本版处理它留下的那句"扫描器证明不了有限调用集"。** `AI-Scarlett/DSH-Store#1411` 的追评（2026-10-15，原文与正文 sha256 存档在 `docs/evidence/dsh-store-1411-followup-2026-10-15.md`）承认旧扫描器把单文件上限与总量上限混为一谈（`467,678 > 2,097,152` 那句自相矛盾一并作废），现行边界 4 MiB/文件、8 MiB/总量，**`lib/client.js`（对方那一份 442,975 字节；本版实测 443,779）无需压缩也无需拆分**——正是 10.14.3 量清楚后拒绝做的事，本轮由对方更正。它留下的阻塞项是 `requireSeed()` 里的 `require(name)`：**"the scanner does not prove its finite caller set"**。本版把浏览器半边唯一一个"值进入 `require`"的车道消掉——helper 只吃零参 thunk，四枚平台 seed 的说明符全部写成调用点字面量；**探测顺序、`null` 判据、`lastError` 覆盖次序一字未动**，`tests/client.smoke.test.cjs` 里那三条 seed 用例（#43 稳定版回退、无 seed 降级哑模块、缺 REACT 也降级）在本版**一行未改且仍绿**。新增 `docs/desktop-support.md`「可审计能力面」一节（宿主模块能开口的一切 + `fetch` 目的地只有路径没有 origin + 状态文件归宿主半边），并由新文件 `tests/client.audit_surface.test.cjs` 用**四把尺**守住：调用点字面量形状、文档两张表与代码**同序双向核对**、每枚 seed 被 `peerDependencies` 覆盖且路由与宿主的 `API_PREFIX` 对齐，再加运行时观察（真启动记录"实际问了哪些模块"、有/无 `document.baseURI` 两种页面下"fetch 去了哪里"）。**本轮的 🔴 在文档不在代码**：第一版那节写着"其余开口面只有这些"，却漏了 `URL.createObjectURL` + `<a download>`、`navigator.clipboard` / `execCommand`、`FileReader` + `type: "file"` 三条真实页面能力，也没说清"壁纸图片本身就是用户填的 URL"；现在改成 23 个 token 的**逐格能力矩阵**，代码冒出文档写"不存在"的 API 即红，文档写了代码没有的同样即红。回归门 **541/541**（532→541，+9 全在新文件，九条腿 L1–L9），本轮 **15 次反向破坏**逐条打印翻红断言：整体退回 `require(name)` 红 4 条腿而**运行时腿绿**（形状与行为看守的是两件事），去掉 peer 声明只红覆盖腿，把 `HOST_API` 改成带 origin 的绝对 URL 或 rooted 路径**只红新加的腿、其余 187 例全绿**（`smoke` 139 / `persistence` 25 / `storage` 16 / `fiber` 7；说明目的地此前无人看守），把 `require(userInput)` 藏进与代码同行的注释后面**红 5 条腿**（我方第一版扫描器确实漏这种形状，由对抗审查抓出后改对）。另做 1 次门自守实验：让扫描落空时 peer 腿当时**恒绿**，补自守计数后才转红——本仓库第三次"绿的是门不是代码"。**不承诺 catalog 变绿**：这改动把"有限调用集"从我方不可证变成可枚举且能被门守住，但对方是否放行取决于其审查流程，其追评同时写明未执行我方测试、未跑宿主。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.16.0`。

**版本 10.15.0（2026-10-15）**：**上一版说"`exports` 里那枚 `./locale/*.json` 通配是承重的、删了宿主会抛"——这一版去读了一遍，那句是推断不是读数。** 直接把宿主自己的 `readPluginMeta()` 调起来跑 **14 份 manifest + 11 枚文件名探测**（判定表落在 `tests/fixtures/plugin_meta_readings.json`，生成器 `scripts/gen-plugin-meta-readings.cjs`）：宿主**不猜语言码**，它 `readdir` 语言目录后把里面每个 `.json` 逐个解析，所以**通配从来不是坏的**（实测 `outcome: localized`）；真正会坏的是"新增一枚语言文件却忘了加导出"——那让宿主整个解析失败，**它不崩，我方插件列表那一行同时失去标题、描述与图标**（实测点名 `./locale/ja.json`）。于是改成显式枚举 `./locale/en.json` + `./locale/zh.json`，`tests/package.i18n.test.cjs` 3→6 换成双向门并**与那份实测逐格比对**（镜像算错任一形状即红，另含"通配与陈旧导出在宿主侧都不改变读数"两条对照腿）。过程中量到**第二条与 `exports` 无关的失效车道**：宿主先按 `LANGUAGE_ID` 校验文件名，`zh_CN.json` 这种名字即使导出齐全也让整行失去标题、描述与图标——11 枚候选名逐个实测（接受 `ab`/`abcdefgh`/`zh-CN`/`zh-Hans-CN`，拒绝 `a`/`abcdefghi`/`e2`/`zh_CN`），测试里那枚镜像正则由这张表约束而不是抄源码。**过程中同模型不同角色的对抗审查（`BLUE-10150`）又抓出一个真的 🔴**：旧那版门只看 `exports` 的**键名**，评审造出一份"枚举报满、但 `./locale/zh.json` 指向别处"的 manifest——**门 6/6 全绿，宿主把整行销毁**。现在要求**恒等映射**（`./locale/<x>.json` 必须指向 `./locale/<x>.json`），并补上四种坏目标形状的见证（不存在 / 指向别处 / `{require: …}` / `null`）、"每个 locale 条目必须是常规文件"，以及"图标与文本是两条契约"的对照腿。15 条变异腿（M1–M15）逐条实跑；评审那六条攻击在临时副本里重打：六条全红、控制全绿。回归门 **532/532**（10.14.3 为 528），质量审计 **229/229**（217 调色 + 12 工艺）。**本版不改一个像素，用户可见变化为零**（改动前后宿主返回同一份本地化文本）；10.14.3 写在 README、`docs/publishing-to-npm.md`、`docs/desktop-support.md` 与 CHANGELOG 里的那句因果已**就地标注作废**（原文保留），取证与自纠写在 `docs/publishing-to-npm.md` §十一。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.15.0`。

**版本 10.14.3（2026-10-14）**：**第三方目录的收录检查撞上宿主的加载形态——这一版记录的是"量清楚之后决定不改什么"。** DSH STORE 的固定 Commit 自动检查（[issue #1411](https://github.com/AI-Scarlett/DSH-Store/issues/1411)）把本插件标为 catalog blocked，四条原因里唯一有硬数字的是：`lib/client.js` **442,975 字节 > 其自动审核面的单文件上限 262,144**。回归门 **528/528**（10.14.2 为 524），质量审计 **229/229**（217 调色 + 12 工艺）。本版不改一个像素、不改任何用户可见行为。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.14.3`。

**先量的两条决定性事实**：① **浏览器半边在 DSH 里必须是单文件**——活页 `performance.getEntriesByType('resource')` 读到宿主把 19 个插件的 client 拼成**一个** combo 请求 `/plugins/??…&dsh-dream-skin/client.js&rev=…`，而对包内同级路径的探测（`types/index.d.ts` / `index.js` / `locale/zh.json`）**全部 404** ⇒ "拆成几个 chunk"不是可选项；② **这条上限对生态普遍被超**——同一台机器上 8 个第三方插件的 `client.js` 都 > 262,144，最大 2,468,635 字节（约 9.4 倍）⇒ 这是"审核边界遇上宿主形态"，不是我方缺陷。

**处置**：不把运行时入口 minify 或剥注释——那个文件同时是本项目"**可读的原生 token 源码、无注入**"承诺的审计面，仓库里几十道门读的就是它的文本；他们自己的契约也把混淆列为信号。改为**把增长变成看得见的决定**：新门 `tests/package.runtime_size.test.cjs` 给每个发货的 JS 运行时产物设一个**声明的天花板**（client 480 KiB / index 40 KiB），超了红；"新增一个发货 `.js` 却没设天花板"也红（第二运行时入口就藏在这儿）；另有一条断言钉住**天花板是余量、不是"已通过第三方上限"**——如果哪天它真掉到 262,144 以下，那条会红并要求删门说明。刻意**没有**把门写成"必须 < 262,144"：那在我方结构下是一盏永不绿的灯，而 10.8.1 那一轮刚为同一种灯写过撤回理由。全过程与判据写进 `docs/publishing-to-npm.md` §十一。

> 10.14.3 原话（逐字保留，由 10.15.0 作废）：
> **他们报告里唯一可修的那处我们不动**：`runtime artifact pattern requires review: ./locale/*.json` 指的是 `exports` 里那枚通配，而它是**承重的**——`tests/package.i18n.test.cjs` 记着删掉这个模式后宿主解析语言文件会抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`。没有"宿主到底会请求哪些语言码"的证据之前，保留通配、走他们的人工审阅：为消掉一条模式告警去动插件列表的多语言解析，等于拿用户看得见的功能换一次自动批准。

**他们报告里的通配那一处，10.14.3 说"不动"、10.15.0 动了**。`runtime artifact pattern requires review: ./locale/*.json` 指的是 `exports` 里那枚通配。10.14.3 当时的理由是"它承重——删掉宿主解析语言文件会抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`"，**那句是推断而不是读数**：直接调用宿主自己的 `readPluginMeta()` 实测（判定表落在 `tests/fixtures/plugin_meta_readings.json`）得到的是——宿主不猜语言码，它 `readdir` 那枚 `locale/` 目录、把里面每个 `.json` 逐个解析，所以**显式枚举覆盖的就是它将要请求的全部文件**；通配本身在宿主侧照旧解析成功，从来不是坏的。真正会坏的是"新增一枚语言文件却忘了加导出"：那枚文件让 `readPluginMeta` 整个失败，**宿主不崩，我方插件列表那一行同时失去标题、描述与图标**（而 English 单独缺导出时更安静——不抛错，只退回 manifest 文本）。所以现在改成显式 `./locale/en.json` + `./locale/zh.json`，并把 `tests/package.i18n.test.cjs` 换成双向门（在场↔导出两个方向、通配本身也点名）**且与那份宿主实测逐格比对**。判据与取证过程写在 `docs/publishing-to-npm.md` §十一。

**照实说**：我们的答复不承诺 catalog 变绿——如果他们的自动策略只认字节数，blocked 会保持；这一点连同"合计 467,678 字节 < 上限 2,097,152 却被写成 exceeds"的自相矛盾，都已在该 issue 里向对方指出并请澄清。另把一条容易混的事写清：活页 `build` 现在读到 `10.14.2`（浏览器半边每次加载从宿主取新 bundle），而**宿主半边**仍是进程启动时那一份——"界面已是新版"与"服务端半边已是新版"是两件事。

**版本 10.14.2（2026-10-14）**：**同日重发，一次纯文档修正**——10.14.1 的包里有句话会把脚本使用者带错路，而那句话是**发出去的**（`docs/desktop-support.md` 在 npm `files` 白名单里），只能在下一个包里改对。回归门 **524/524**（用例数与上一版相同，本版只动文档与一条命令常量），质量审计 **229/229**（217 调色 + 12 工艺）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.14.2`。

**错在哪**：那一节教读者"别背清单，自己现读"，命令写的是 `grep -oE '"dsh-dream-skin:[a-z-]+"' lib/client.js | sort -u`——而 `grep -o` 打出来的是**带引号的整段匹配**。拿它去和状态文件里的裸键比，得到的是"当前版本 24 枚键里一枚都不在这个文件里"。**命令能跑、输出齐整、数字看着也对，结论却完全假**（本项目第 24 条自纠形状的第三次实例，这次栽在管道中间一段输出格式上；上一版它栽在"npm 把数组投影成什么"，再上一次栽在"命名空间被当成我方写入"）。修法三件：命令补上 `| tr -d '"'` 并在文档里明写别省掉这一节 + **整条命令按字面量钉进门里**、新增一条"只删 `tr -d` 那一节也必须红"的变异腿（原来那条只兜"整条命令被换掉"）、把两条读法约束的实测数字写实。

**顺带跑了一遍自己写的配方**（只读，不动用户文件）：文件存在 ✓、去引号后 derive 出 **24** 枚 ✓、保留键 `"1"` 是十进制整数字符串 ✓、**8 枚键在维护机上确实不在 durable 层**（`accent` / `appearance` / `builtin-last` / `factory-seeded` / `favorites` / `packs` / `wallpaper-refresh` / `wallpaper-url`）——这正是配方 D 那句"不在场 ⇒ 只活在当前 origin 的 localStorage 里，动态端口一换就丢"的现场形状。`material-memory` 的来源仍未查明，作为待查项挂在文档里。

**版本 10.14.1（2026-10-14）**：**Roadmap C 组那条 M 落地**——"皮肤到底生效没有"现在有一个**脚本能问**的形状，不再只能人开 console。回归门 **524/524**（10.14.0 为 515），质量审计 **229/229**（217 调色 + 12 工艺）。本版**不改一个像素**，改的是一份文档与一道盯那份文档的门。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.14.1`（刚发版 24 小时内 pnpm 的冷静期会把不带版本号的命令静默退回旧版）。

**先测再写**（这一步决定了文档里哪些话能写）：持久面现读——`lib/client.js` 认识 **24 枚键**，维护机真文件在场 **18 枚**（含上一版那枚保留键），**8 枚不在场**；**文件里还多出一枚当前版本不认识的** `dsh-dream-skin:material-memory`——`git log --all -S` 现查本仓库**任何一次提交都没写过它**，本机三个 profile 的实装 bundle 与宿主全局目录也搜不到 ⇒ **来源未查明**，写成为什么"别把文件的键集合当成当前版本的自我陈述"的现场反例，而不是含糊过去。生效标记也是逐个现读的：`<html>` 上 `data-dsh-dream-skin-scheme="dark"` / `data-dsh-dream-skin-wash="1"` / `data-dsh-material="frosted"`、`<body>` 上 `--dsw-alias-bg-base = rgba(19, 17, 22, 0.4)`、我方样式表按 `id` 恰好 2 张；同一次读到 `data-dsh-dream-skin-composer` **不在场**——所以它**不能**进"生效"的必要条件，否则脚本会把正常页面判成坏页（这条是量出来的，不是从代码推的）。另有一条时序事实：隐藏页上 `setTimeout(…, 300)` 实测被节流到 1112 ms，所以配方里明写"晚撤回要等 `checkedAt` 变，单次读数不是终局"。

**新增的门**（`tests/docs.machine_readable.test.cjs`，9 条）：文档表格里的键清单与 bundle 常量**双向核对**，且**行数与键数相等**（成员相同数量不同正是重复行/漏行的藏身处，形状门数不出来）；"叫读者去 derive、别信这张表"的那条 grep 必须在场；四条配方各自必须点到它真正依赖的字段；文档点名的每一枚 `data-dsh-*` 标记都必须在 `lib/client.js` 里有引号字面量。变异 6 条各自点名自己：删一行键 / 塞一行代码里没有的键（**同时**红在"查无此键"与"行数不等"）/ 换掉那条命令 / 改坏一个标记名 / 把 `status !== "degraded"` 磨圆 / 删掉"只升不降"。**门自己的第一版也栽了**：我起初放了一条 `replace("当前 \`1\`", "当前 \`1\`")` 的恒真腿——**跑不红的守卫是装饰**（上一版刚为同一课删过一道 `set` 特判），于是换成两条真会红的反向腿，并另加一条"整节从文档里摘掉 ⇒ 门必须只报一条'这一节没了'"的结构性对照。**同轮还抓到一条同族不同载体的错**：文档叫读者用一条 grep 自己枚举键，而 `grep -o` 打出的是**带引号的整段匹配**——直接拿去和文件里的裸键比，第一次得到的结论是"当前版本一枚都不认识这个文件"。命令能跑、输出齐整、数字看着也对，而结论假到极点。现在命令补上 `| tr -d '"'`，**整条命令按字面量钉进门里**（只删 `tr -d` 那一节也要红），文档里明写别省掉这一节。

**照实说的未验证**：门**读文本不读浏览器**——它证明文档还在点名代码真有的东西，不证明配方的**语义**仍然对（那半靠本轮那一次活页读数：一台机器、一个宿主版本、一个时刻，加上快照字段集既有的把关）；配方 B 判的是"token 层活着"，不是"每处精修都画到盒子"；`material-memory` 的来源仍待查；那 8 枚"版本认识、文件没有"的键没被逐枚造访问票。桌面 profile 照旧停在 10.12.1，web profile 正在跑的实例载的还是 10.14.0 那一份。**Roadmap 同步**：C 组那条 M 从 8 份 README 一起删除（开放项 8→7）。

**版本 10.14.0（2026-10-14）**：**Roadmap C 组那条 S 落地**——`$DSH_HOME/dream-skin.json` 有了一枚 schema 版本保留键，而"新版写的文件旧版还能不能读"这句话第一次被**真的演练**，不再是"靠宽容读取"这句口头保证。回归门 **515/515**（10.13.1 为 509），质量审计 **229/229**（217 调色 + 12 工艺）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.14.0`（刚发版的 24 小时内 pnpm 的冷静期会把不带版本号的命令静默退回旧版）。

**为什么这事值得做**：同一个 `DSH_HOME` 下的这个文件，**web profile 与官方桌面壳可能各挂着一个不同版本的插件**，谁最后写谁决定另一侧下一次读到什么。所以文件格式有一个**我方无法先升级的第二读者**。这决定了形状：不是 `{schema, state}` 那层信封（旧版本会把那个对象 `String()` 成 `[object Object]` 塞进设置），而是**扁平字符串映射 + 一枚保留键** `dsh-dream-skin:schema-version`（当前 `1`）。戳**只升不降**：文件上若是更高版本的 `9`，我方写入后仍是 `9`——盖个 `1` 上去就是对着字节撒谎，下一轮升级会拿"1→N 迁移"去套已经迁过的数据。这枚键**不出现在 `get` 的回答里**，浏览器不会把它当设置采纳。

**先测的证据**（拿本机那份真文件——**17 个键 / 122,777 字节**——在临时目录的拷贝上跑，原文件收尾 sha256 复核未动；旧半边取 `git show HEAD:lib/index.js` 原样挂载）：新半边写出的文件**零嵌套、值全是字符串**；旧半边读它，**17 条设置一条不少、值一字不改**，只是多看见一枚值为 `"1"` 的保留键；旧半边再写回（降级那一趟）设置照旧不掉、戳原样留着。顺带纠正了一句**随包发布的失实文档**：`lib/index.js` 头注释一直写 `set` 是"整体替换"，而实现一直是**合并**（两个写入者互不抹掉，这条早有用例守着）——按实现改写。

**门与变异**：净 **+6 条用例**，全在 `tests/host.persistence.test.cjs`（8 → 14），其中一条是 13 行的**归一化整表**（缺失 / 空串 / `abc` / `-3` / `1.5` / `1e9` / 数字 / null / 对象 / `0` / 本版本 / `007`→`7` / `99`→`99`，整组断言）。**改前先跑红**：6 条里 5 条红，而"遗留文件"那条当时**假绿**——它比的是 `mod.STATE_SCHEMA_KEY`（那时是 `undefined`）与 `raw[undefined]`，**空对空也算对**；于是每条新用例开头加一句"模块必须导出这个键"，那一行才从绿转红。变异 **8 条腿**逐条实跑并按 sha256 复原：不盖章 ⇒ 5 条红；总是写自己的版本 ⇒ "更高戳"与整表红；`get` 不剥保留键 ⇒ 泄露被抓；展开顺序反过来 ⇒ 恰好"伪造"那条红；戳不做数字校验 ⇒ 整表红；文档里的版本号漂 ⇒ 文档在场门红；版本常量写成空串 ⇒ **模块加载即抛**。**具名的不覆盖**：删掉加载期校验而常量仍合法时**没有任何用例红**——那道校验守的是"下一次有人把常量写坏"，今天的字节里它不参与判定，只能由"常量真坏了"那种形态证明。另一处收口：先前写在 `set` 里的"遇保留键就跳过"特判**当变异跑什么都不红**（戳的覆盖已经赢了），因此删掉——一道证明不了自己的守卫就是假门。

**照实说的未验证**：**真机装载 0 次**（**此句在发布之后作废**：用户同意重启，web 活页实测 `build:"10.14.0"` / `status:"ready"`，状态文件被真半边盖章、+36 字节恰好那一枚键、17 条设置逐字符不变——完整读数见 CHANGELOG 10.14.0 §六 与 `docs/desktop-support.md`）——`lib/index.js` 是宿主半边，只在 DSH 启动时被读，本机正在跑的实例仍是改动前那一份（未经同意不重启），上面所有读数来自把新旧两份模块分别挂进临时 `DSH_HOME` 亲跑，它们证的是文件语义；旧浏览器半边会多采纳一条字符串键，其唯一下游 `hasUserState()` 只在 `hostKeys.length === 0` 那支被调用、而这枚键存在时不可能为 0，**这条推理是读代码读出来的，不是在真旧版本运行时里跑出来的**；只含戳不含设置的文件我方客户端永不写（空补丁直接 return），只有手工请求能造出来。**Roadmap 同步**：C 组那条 S 从 8 份 README 一起删除（开放项 9→8）。桌面 profile 仍停在 10.12.1（本版不改像素，也没必要为它单独动一次 profile）。

**版本 10.13.1（2026-10-13）**：**Roadmap A 组那条 S 落地**——"宿主出新 rc 的那天要查一次兼容"从一句提醒变成一条命令。issue #62 的根因从来不是缺工具，是**缺重复**：`0.2.0-rc.1` 起宿主在 boot 阶段读我方 `@deepseek-ai/dsh*` peer 范围，不满足就**整包跳过**（用户看到的是"皮肤一夜全消失"），而宿主持续发 rc / alpha，于是"最新那个宿主在不在窗内"会自己过期。回归门 **509/509**（10.13.0 为 496），质量审计 **229/229**（217 调色 + 12 工艺）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.13.1`（刚发版的 24 小时内 pnpm 的冷静期会把不带版本号的命令静默退回旧版）。

**本机今天跑出来的读数**（`npm run host:preflight -- --profile-load`，2026-10-13）：registry 上 `@deepseek-ai/dsh` 共 **31 个已发布版本**、**26 个在窗内**，按发布时间最新的是 `0.2.1-alpha.2`（2026-10-09），**在窗内** ⇒ 退出码 0；`--profile-load` 那半读真实 web profile：**19 层 bundle 载入、0 个被跳过、我方那份挂在里面**。判定值**来自宿主自己那份 `evaluatePluginCompatibility()`**（从被检宿主包自己的 `node_modules` 解析 app-boot，不让机器上另一份副本替它回答），本机没装宿主时才退回零依赖镜像实现——**并且把"这次是谁算的"印在第一行**；两份都在时逐版本要求一致，不一致就红在"重生成那份从宿主 checker 抓下来的判定表"上。

**四个出口，别混**（与 `wash:check` 同一套纪律）：`0` 跑了且同意 · `1` 跑了但**最新**宿主落在窗外，或两把尺子打架 · `3` 环境不给跑并**点名缺哪一样**（`registry` / `host install` / `profile`），**不算通过** · `4` 要了 `DSH_PREFLIGHT_STRICT=1` 却没跑成（流水线坏了，不是判定）。**只有"按发布时间最新的那一个"能判红**：窗外那 5 个全是 `0.0.1-rc.*` / `0.1.0-rc.2-3` 的历史版本，让它们判红等于把门从第一天就焊死在红上。红了只有两条诚实出口：① 对着那个版本跑表 + 真实载入，通过才抬窗并**同轮**重生成判定表；② 不抬，就把"不支持"写进 8 份 README 的兼容表。第三条（原样留着、群里说一句"新版可能不兼容"）就是 #62 当时的形状。

**这条门自己栽过的第一版，照实记**：`npm view <pkg> --json` 把 `versions` 投影成**数组**，registry 自己给的是**以版本为键的对象**。第一版按对象读，真机上跑出的是 **31 行下标 `0..30` 的"版本"**——照样打印、照样算"几个在窗内"、照样 `exit 0`。门读错了主语时不会喊，它只会安静给出一个形状正确的答案。现在两种形状都接，并有一条腿把两种形状喂进同一份判定要求逐行一致，另加一条"任何一行的版本号都不许是裸下标"。

**Roadmap 与同步**：A 组那条 S 从 **8 份 README** 一起删除（删条目而不是打勾，开放项 10→9；少删一份 `roadmap(...)` 镜像门当场点名）；同时把**仍被上游阻塞**的 `0.3.x` 那条的验收句改成点名这条命令——它依旧阻塞（registry 至今没有 `0.3.x`，实测），但从今天起它的验收是**可执行**的。**照实说的未验证**：这条门**没有每日排程**——它只在有人跑时跑，所以本版消除的是"忘了怎么查"，**不是**"忘了查"（挂 cron / 定时 workflow 仍欠，记在这里而不是记成已完成）；`--profile-load` 读的是本机 profile 现状（web profile 是 `link:` 工作树），它证明不了任何用户机器上的装载；官方桌面壳那条活页通道照旧要用户本人重启（见 10.13.0 那一节）。

**版本 10.13.0（2026-10-13）**：**A1 的下半**——todo 面板与队列坞那两处磨砂不再赌宿主构建哈希，A1 的"及格线"从运行时字段搬进了一道静态门，并且**第一次把这两条锚点在真引擎里命中谁读成了像素**。回归门 **496/496**（10.12.1 为 488），质量审计 **229/229**（217 调色 + 12 工艺）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.13.0`（刚发版的 24 小时内 pnpm 的冷静期会把不带版本号的命令静默退回旧版）。

**先测再说（两条渠道各自的发货字节，不抄常量）**：宿主在**两条渠道上**都给这两处表面公布了稳定属性——todo 面板的根元素带 `data-testid="todo-panel"`（与 `<base>_root` 同一个元素，npm / 壳各 1 次），队列坞的 `data-queue-dock` 打在外层 `<base>_dock` 上、要磨砂的那面是它的**直接子元素** `<base>_panel`。裸后缀不可用：`_panel` 在 npm 有 **12** 个基名、在壳上也有 **12** 个，不加限定就是拿别人的面板下手（issue L1 同形）。所以队列坞那一半写成 `[data-queue-dock] > [class$="_panel"]`。另外量到一条要紧的：**宿主自己就在给这两处画磨砂**，两渠道同形——`background: var(--dsw-specific-menu)` + `backdrop-filter: var(--dsw-menu-backdrop-filter)`，而那枚 token 的真值是 **`blur(40px) saturate(150%)`**；我方这条写的是 `blur(20px) saturate(140%)`。

**哈希没删，降级成并集里的一支**：规则现在同时列 `[data-testid="todo-panel"]`、`[data-queue-dock] > [class$="_panel"]` 和原来那两枚哈希。宿主哪天撤了 testid，哈希那支还在；哪天重掷哈希，testid 那支还在。探针池一字未改，`anchors.channelAbsent` 仍然照报"这枚哈希在这个渠道不存在"——那是事实，只是不再是及格条件。

**判据换了位置（对 10.12.1 那半句的显式作废）**：上一版写下"每一条精修都真的命中 = `drifted: [] && notMounted: [] && channelAbsent: [] && pending: false`"。本版把 `channelAbsent: []` 从判据里拿掉，理由正是那一版自己写的："一条能被'解释'满足的判据等于没有判据"——而 `channelAbsent` 空不空，取决于登记表里那句散文说不说"这条已查明"。新的及格线是两道：① **静态配对门 `tests/host.frosthooks.test.cjs` 为绿**（每一条还押哈希的规则必须在**同一条选择器里**带一个无哈希锚点，且登记表 `carriedBy.anchors` 指名的锚点要**真在规则里**、**真在两条渠道各自的发货字节里实测存在**；属性锚点还多一条实测——门把宿主树里**每一个带 `lib/client.js` 的包**读成语料（本机 71 个），要求 `todo-panel` / `data-queue-dock` 的公布者**恰好一个**且就是登记表点名的 owner，并要求每渠道的**贴次数等于登记表声明的次数**；第二个包贴上、唯一的贴它者换了包、宿主多贴一个元素、或登记表不再声明次数 ⇒ 当场红）；② 运行时 `drifted: [] && notMounted: [] && pending: false`。**这不是放宽**：被删掉的是"用解释填空"的那条，换上来的那道需要两条渠道的字节同时点头，而且在没有宿主、没有浏览器的机器上照跑。代价也写清：静态门看不见运行时——若宿主留着属性却把元素换成了别的东西，绿的仍是配对门，那时能抓它的只剩 `channelAbsent` 这行事实和人的眼睛。

**把"锚点命中"读成像素（`wash:check` 新增 `frost` 组）**：静态门证的是文本——锚点在表里、在两渠道字节里；它证不了**选择器匹配**。所以夹具页新增两个盒子：一个带 `data-testid="todo-panel"`、一个是 `[data-queue-dock]` 的**直接子** `_panel`，两者都穿**这张表从不提及的基名**（`fixtureRolled_*`，即"宿主重掷了哈希"在页面这边的形状），外加一个同样以 `_panel` 结尾但**不在任何坞里**的诱饵，和一个把**发货声明原样写进行内样式**的参照盒（期望值由引擎回答那句话，不是我抄进文件的数）。真 Chrome 实测：参照 / todo 盒 / 坞内板同算 `blur(20px) saturate(1.4)`，坞外诱饵 `none`，三态（plain / wash / washed-again）一字不动。四条引擎变异各自只让该红的红，其中一条直接演 A1 这句话——**把规则里 `.lXshSW_root, ._7yHdaG_panel` 那一整支删掉，引擎读数一个字都不动**。**顺带抓到一条老账**：CLI 里 host 页的判据组名单原本是手抄的 `['corner','fade']`，**10.12.0** 加 `side` 组时那一版账本自己写着"新增一组必须改这里否则整组静默不跑"（那句指的是测试里的名单门），而 CLI 那份名单没被改——`side` 的引擎判据**从 10.12.0 起从没被 `npm run wash:check` 评过分**（字段一直在读数里，CI 的字段 grep 看不出这种缺陷；CI 的 `test` 作业既没浏览器也没宿主，那几腿在那里走跳过）。现在名单**从 `WASH_GROUPS` 现推导**，OK 那句改成报它到底评了哪些组（`graded host[corner/fade/side/frost] …`），并配源文本门 + CI 对该串的 grep。

**顺带清了一条 Roadmap 卫生**：D 组挂着「外链壁纸空值态提示」，其实**已随 10.12.0 发货**（那一支渲染分支在代码里，8 语言文案在包内），重排那轮漏销。按既定纪律删除而不是打勾，8 份 README 同步，开放条目 11→10；反向证据是把这一条只塞回英文版，`roadmap(en)` 当场点名翻红。

**照实说的未验证**：**官方壳的活页面上观感 0 次目视、0 次读数**。本版新增的是**夹具页**的引擎读数（见上一段）——它证的是"这两条选择器在真引擎里命中该命中的盒子、不命中隔壁"，**不等于**"壳上那两面看起来对了"：盒子是我方按读到的宿主 DOM 形状搭的，真实观感只有用户本人重启后才看得见。这一版确实会让官方壳上那两处磨砂从宿主的 40/150 变成我方的 20/140（与 npm 一致；npm 那一侧前后不变）。另外：宿主若在生产构建里剥掉 `data-testid`，配对门会红（运行时的 `channelAbsent` 不会，它报的是哈希）；"只有 owner 在贴这个属性、且只贴一次"那半条**要装过宿主才有真语料**，CI 上跑的是同一判据的合成语料版，没宿主的机器走具名跳过而不是报成通过；todo 面板 / 队列坞属按需挂载，与提问卡、授权卡同一类，探针池刻意不收。Roadmap A1 的验收句已按新口径改写（8 语言同步）。

**版本 10.12.1（2026-10-12）**：这一版**不改一个像素**，改的是探针的一句话。A1 的上半（10.12.0）把侧栏脚区从哈希里救出来之后，剩下的哈希锚点里有一族**根本不是漂移**：npm 渠道与官方桌面壳把同一张 `.module.css` **各自重掷了一次哈希**，基名必然不同。旧探针把这种已查明的分叉报进 `drifted`，结果是**官方壳上那盏灯永远红**——而一种永远不消的红色等于没有信息。机读契约加第四池 `anchors.channelAbsent`，登记表**每轮从壳的发货字节重推导**（对齐键是 CSS module 路径，不是基名）。回归门 **488/488**（10.12.0 为 480，本轮 **+8**：`client.smoke` 4 枚判决用例（壳形状页终局 `drifted: []` / 归属优先于登记表 / 宿主 CSS 读不到时已登记的组仍被点名 / **真告警 firing 时名单里不许夹带已解释的缺席**）+ `hashes` 3 枚（结构性一条 / 七腿变异一条 / 真语料重推导一条）+ `docs.numbers` 1 枚（那道门自己指向哪个版本块，过去是手抄的两枚版本字面量，现在从文档自己的标题形状推导，并配一条反向用例：删掉当前块标题必须点名红）；**新增与换形状分开记**）。质量审计 **229/229**（217 调色 + 12 工艺，两池改动不碰调色与工艺，门数不变）。

**两台宿主各是什么（本轮现读，不是手抄）**：`.lXshSW_root, ._7yHdaG_panel` 在 npm `0.2.0-rc.1` 有 2 / 4 处命中，在官方壳的 121,348,951 字节 `app.asar` 里**各 0 处**——同两条 module（`skeleton/TodoPanel.module.css`、`queue/QueueDock.module.css`）在壳上画成 `aSus8q_*` / `v1kfCW_*`；`.uV2eYG_root` 同理，壳上是 `RlGAzG_*`。**后果不一样，分开写**：前者那条 `backdrop-filter` 磨砂在壳上**确实没生效**（宿自己仍画 `--dsw-specific-menu` 底色，是外观差不是坏面）；后者是 `background: transparent`，而现读壳的 `RlGAzG_root` 声明块里**根本没有 `background` 可撤**，所以无害——"无害"不是嘴上说的，`harmlessBecause` 把"该模块 `root` 的声明块不得出现 `background`"写成判据，壳里一出现就翻红。

**为什么不并进 `retired`**：`retired` 的语义是"为我们**量不到**的旧宿主线保留的假设"，这两组是**两条当代渠道各量到了一次**；塞进去会让人以为那是尸体，而它其实有名字、有住址（module 路径）、查得到。**准入条件比现有那条 dead-hash 豁免更严**：npm 半的实测基名与命中数 + 壳里同模块的继任基名 + 失效面与后果，三样缺一即红；"npm 那半其实已经死了"（那是 `legacy-host-line`，不是通道分叉）、"登记了却从不进探针"、"bundle 与登记表不一致"、"继任基名被重掷"、"壳里重新画了这枚哈希"、"声称无害却拿不出证据"、"无害声明与 CSS 规则矛盾"——**七腿各自只在它该抓的那一腿翻红**，且七腿都跑在合成世界上：没有宿主、没有壳的机器照跑（登记表若是编出来的，不该靠某台机器才发现）。判决顺序是**归属 > 登记 > 漂移**（反过来的话登记表就成了能把任何缺席洗白的橡皮，有用例专钉）；保守出口按仓库纪律写成"报出来"而不是"消失"——宿主自有表读不到时，已登记的组仍点名在 `channelAbsent`，因为它的证据来自仓库之外。

**一处对旧承诺的更正（显式标注，不悄悄改掉）**：`docs/desktop-support.md` 过去把 `drifted: [] && pending: false` 写成"**全部精修在本构建生效**"的正向信号——**这句在本版作废**，它被 `retired`（10.8.0）与 `channelAbsent`（本版）两次"把已解释的缺席移出告警"逐步掏空，留着就等于让绿灯说谎。现在分两层：`drifted: [] && pending: false` = **没有未解释的锚点换代**；"每条精修在这台机器上真的命中" = `drifted: [] && notMounted: [] && channelAbsent: [] && pending: false`；`retired` 不参与第二条（它在任何能量产的宿主上恒为非空，算进"全绿"就是再造一次那盏永远不会绿的灯）。

**顺带撤回一条我自己开错的缺陷单**：本轮一度把"官方壳上 `isDesktopShell()` 返回 false"当成缺陷准备开工。先测之后撤回——三枚判定戳（`data-dsh-desktop-mode` / `__DSH_DESKTOP_FILE_PATH__` / URL 参数）在官方壳的 asar 里**各 0 命中**，而桌面专属那第 9 组探针的锚点 `.dshDesktopSidebarSurface` **也是 0 命中**：门一开，多出来的就是一盏**永远红灯**加两条永远画不到东西的规则，正是 J1 那轮写进文档的病灶反向复发。已在 `docs/desktop-support.md` 写明"不要改成 UA / Electron 嗅探"。官方壳上要紧的那些修正本来就不经过这道门。**Roadmap A1 仍不销账**：todo 面板与队列坞在壳上的磨砂还没修，且不能图省事用 `[class$="_dock"]`——现读壳上该后缀有 3 个基名，其中 `RlGAzG_dock` 就在 composer 那个模块里，而材质模糊注释里那条规则 1（原文 "the composer card … deliberately carries the stop / send button Tooltips — fixed popovers — and blurring it made them anchor to the card"）记着的回归成因正是"给 composer 一族加 `backdrop-filter`"。可用路径已量到：**用 module 内唯一后缀反推前缀**（现读到 `RlGAzG_cardWorkspaceTrigger` 这类只属单模块的类名）。**未验证**：这张表是**一台壳、一个时刻**的读数（`measuredAt: 2026-10-12`，壳内宿主字符串 `0.2.0-rc.2`）——壳升级后基名会再掷，那时门会红在"继任基名被重掷"这一腿，红得有名字，但"更新后这张表仍成立"这件事本身没被追过；`channelAbsent` 在壳上的观感 0 次目视（它不改任何声明，目视能证明的只有"页面没坏"）；分类器仍**绝不 fetch `<link>` 样式**（零网络不变式，边界一字未变）；宿主自有表只看**类名 token 是否出现**、不看它属于哪个模块——本机两台宿主今天没有跨模块同名复用（本轮逐模块列过），但这是**已知的宽松**不是验过的性质。更新：`dsh plugin --profile web add dsh-dream-skin@10.12.1`。

**版本 10.12.0（2026-10-12）**：一条**用户看得见的缺陷**修好了——「左侧栏底部断裂」那条对齐规则一直写着 npm 宿主那一代的构建哈希类名，而官方桌面壳的同族基名**不是**它，所以这条修正在桌面壳上**从来没有生效过**。回归门 **480/480**（10.10.0 为 461，本轮 **+19**：`host.sidefoot` 9 枚现测锚点 + `craft` 变异 1 + `wash.cascade` 引擎用例 5（对齐族四条变异 + 层叠与关系式六条 + 提取账目 + 注入面拒绝 + 几何腿的前置条件）+ `client.storage` 的 D2 渲染门 1 + `host.gap` 的「空目录不是宿主」入口拒绝 1 + `docs.numbers` 的 CHANGELOG 块门与 scope 边界对照 2；**新增与换形状分开记**）。质量审计 **229/229**（217 调色 + 12 工艺）。

**A1 是怎么从「预防」变成「缺陷」的**：本轮按 Roadmap 开工去哈希依赖，先测再说——两台宿主逐个后缀现数：npm `0.2.0-rc.1` 与官方壳 `app.asar`（宿主 `0.2.0-rc.2`）对 `_footArea` 各用**不同基名**（npm `hHd-Xa` 6 处 / 壳 `_2H3hWW` 6 处，而 `hHd-Xa` 在壳那 1.2 亿字节的 asar 里出现 **0** 次），因此类名写法只可能命中一台。同时 `_footerActions` **不是这族独占**：提问卡用 `Mbwy4a_footerActions`，壳的语料里还有第二枚——所以裸后缀写法会去改别人的页脚（issue L1 同形）。锚点因此写成 `[class$="_footArea"]` + 两条**后代**选择器：唯一性、共用后缀、以及宿主 JSX 里 `footArea > {footerActions, settingsArea}` 的嵌套关系，三件事都由 `tests/host.sidefoot.test.cjs` 对着实装宿主与壳的 `app.asar` 现测（纯函数 + 合成语料在 CI 必跑，真宿主/真壳不在时**具名跳过**——「环境不具备」与「检查失败」是两个出口）。像素侧由 `wash:check` 新增的 `side` 组**九**判据现测：夹具把宿主**自己写给这三个类的规则**也搬进页面（`.hHd-Xa_footArea{display:flex;flex-direction:column}` 那一族，逐条从宿主 CSS 抽出，读不到就拒绝建页），因为我方地标分支只有 `(0,1,0)`——**与宿主自己那条同特异度**，谁赢由文档顺序决定，而不是由我方 bundle 里的任何东西决定。于是补两条：`side-host-foot-css-in-play` 读 `display` / `flex-direction`（这两个属性我方一个字都不写，只可能来自宿主），`side-erase-wins-over-host-sheet` 是金丝雀（宿主给这个面加更硬的绘制、或把自己那张表排到我方之后，它就红）。没有这两条时当时那五条测的是"我方规则作用在一张白纸上"——**夹具相等≠页面相等**，是 10.9.2 那课的另一层。宿主自己不给 `_footArea` 写 margin，所以 `-4px` 这个读数**只可能**来自我方规则真的命中了真的盒子；页面上另放一个类名同样以 `_footerActions` 结尾、但**不在** footArea 里的诱饵元素，脱掉 scoping 就立刻丢边距、丢填充、丢描边。**第二轮补的是判据自己的口径**：右边缘那条原本把实测的 `-12px` 跟**我方规则里的兜底值**比，而声明该变量的宿主规则根本不在夹具页上——于是变量解析到我们自己写的 `12px`，那条判据是"我方写的数等于我方写的数"。现在 `hostSideInsets()` 把宿主**声明 `--dsh-sidebar-inline-padding` 的那条规则**和**宿主自己写了负 margin 的 `._regionArea`** 一起搬进页面（现读到：宿主的 region 写的就是 `margin-left:-4px;margin-right:calc(-1 * var(…));padding-left:4px`——我方这组数值是**对齐到宿主对同列兄弟的既有约定**，不是发明的），并新增三条关系式判据：右 margin 等于该盒子上现读的负变量、左右负 margin 各被同侧 padding 补回、这个面的矩形左右缘与四条 margin 逐项等于那个我方一条规则都不写的兄弟。成对变异把关系式与字面量的分水岭钉住：**把宿主的 `12px` 改成 `9px` ⇒ 整组仍绿**（实测我方读到 `-9px`，跟着动）；在同一个 `9px` 的宿主上把我方写成死数 `-12px` ⇒ 恰好三条右缘判据红。另有四条**具名的不覆盖**（`background` / `box-shadow` / `border` / `width` 删掉今天不产生任何红，因为宿主不抢这个面）写成用例留在套件里，而不是算进"九判据全绿"的口径。五条引擎变异各自只让该红的那几条红（其中"宿主块换成一条不碰这个面的规则"只让 `side-host-foot-css-in-play` 红、其余五条读数一字不动——这正是缺了这条腿会全绿的实证）。工艺门新加 `side-foot-hash-free`：候选集**同时**收类名写法与后缀写法（只审后缀就是 issue #97 藏身的那道洞），并要求**恰好两条规则**、属性走**白名单**而不是黑名单——10.9.1 的教训是黑名单只拦得住有人想到的名字，`transform` 当时径直走了过去。

**顺带量到的一条**：文件面板那族 `.nArs4W_panel/_pane/_paneContent/_workbench/_explorerBody` 与 `.bqrRRG_card` 在**两台宿主上都是 0 命中**（不是漂移，是整套词汇没了：现代文件面板是 `dsh-client-ui-sidebar-files`，自带 `data-files-root` / `data-files-body` 稳定戳，且它的 root/body/row **自己不画背景**——现读它的 CSS）。它原本的意图（右栏与左栏同色）已由 `[data-sidebar-right-panel] [data-dockkit-*]` 那条**宿主稳定戳**规则承担，那条在壳上 7 处命中。所以这一半不是「换锚点」而是「确认已被覆盖 + 把死锚点留在带日期的豁免里」，删掉会让 Roadmap 仍声称支持的 `0.1.x` 线静掉。Roadmap A1 **不销账**：卡片一族（`Mbwy4a_card` / `lXshSW_root` / `_7yHdaG_panel`）仍有押哈希的写法。

**D2（你批的「直接优化」项）**：选中「图片链接」而框里还没有链接时，这一档**不画任何背景**，而界面此前一个字都不说。现在补一行「这一档还没有链接：它不画背景，所以画面保持空白。粘贴一条链接后点「应用」」，8 语言各一行。措辞只说**用户此刻该知道的那半**——壁纸没有被删掉，是这一档从来没有值。该行由 `client.storage` 的渲染用例断言**双向**：恒假（行不出现）与丢掉空值判定（有链接也报警）两种实现都要红，只钉前者会放过一条永远显示的警告。

**本轮踩到的八处自己的坑（照实记）**：① `docs.numbers` 的探针组计数是按「行看起来像字符串还是标识符」数的，把选择器改成常量拼接后它读成 7 而 bundle 实际 8 ——**门把自己的实现细节当成了事实**，现在按数组元素数；② 我第一版的 `hostNestsFootAreas` 用固定长度 lookahead，把一棵**已扁平化**的树读成「仍然嵌套」——是本文件那条反面用例抓出来的，改成按括号深度只读该元素自己的 children 数组；③ 把**空的** `DSH_HOST_ROOT` 当成一份宿主语料——那会把「这台机器没有宿主」报成「检查失败」，正是 10.10.0 首轮 CI 刚记过的那一课，本轮在**两个实例**上各复现一次：新门第一版的 `hostRoot()`（要求侧栏包真在场才算语料可用），以及收口时整套件在「没有宿主」形态下重跑才抓到的**共享** `scripts/host-consumers.cjs:findHostRoot()`（它过去只判 `isDirectory()`，空目录直接通过，于是各文件那句 `try { findHostRoot() } catch { skip }` 根本不触发，3 条用例死在 60 行之外的 `ENOENT`；现在要求主题包的 `lib/client.js` 真在场，且**显式覆盖被拒时不再回落到别的安装**，配一条把这三种蒙混各堵一遍的反向用例）；④ `side` 组第一版只把宿主的**类名**搬进夹具、没把宿主**写给这些类的规则**搬进去，于是五条引擎读数全在测"我方规则作用在一张白纸上"，而真实页面上我方地标分支与宿主自己那条同为 `(0,1,0)`、胜负在文档顺序——是本轮自查层叠时发现的，补了两条读数（其一专门读我方从不写的 `display`/`flex-direction`）与两条各自只让该红的红的变异；⑤ census 的 `ruler` 说自己扫的是 "shipped surface (lib/ + the published docs)"，而真正的扫描集还包含 `CHANGELOG.md`——**门的文案把自己描述小了**，现已按 `scanTargets()` 逐项点名，并写明「一个基名可能是被日期化引文带进表的」；⑥ `side` 组的右缘判据把实测的 `-12px` 跟**我方规则自己写的兜底值**比，而声明 `--dsh-sidebar-inline-padding` 的那条宿主规则根本不在夹具页上——变量于是解析到我们写的 `12px`，于是那条判据的内容是"我方写的数等于我方写的数"。补法是让**宿主**进入分母：`hostSideInsets()` 现读宿主声明该变量的规则与宿主自己写了负 margin 的 `._regionArea`，三条判据改成关系式，成对变异钉住差别（宿主动到 `9px` ⇒ 整组仍绿；同一宿主上把我方写成死数 ⇒ 恰好三条右缘判据红）。这是本仓库那条老纪律（**手抄常量必须由独立数据源反算**）第一次砸在**判据**上，前三次砸的都是常量。⑦ 给「选择器被悄悄丢掉」补门时撞出来的第三处：提取器用的是平铺的 `[^{}]+{[^{}]*}` 扫描，**结构性地看不见 `@media` 嵌套**——于是把宿主一条 `prefers-reduced-motion` 下的脚规则当成无条件规则复现进夹具。现读到它今天无害（夹具页没有 `_railIn` 祖先，`transition` / `animation` 也没有判据在读），但「今天无害」必须是量出来的而不是默认：换成带深度的块扫描后，条件块**不复现、只记账**，被跳过的声明只要碰到判据读的十个属性之一就**拒绝建页**。这是「夹具相等≠页面相等」的第三条来路（前两条：只放类名不放规则、拿我方兜底值当宿主的值）。⑧ 三方对抗评审（本轮按用户要求**不派生子代理**，三角色同一 agent 串行扮演，故报告首行显式声明"降级模式"）在**共同前提审查**这一步抓到的：关系式判据有一类等式判据没有的洞——**两个数都读不到时它们相等**。探针在元素缺失时回答字符串 `MISSING`，所以"脚区与宿主的兄弟面在同一条线上"这条判据在两个盒子都不在场时为真。同组另两条腿会因 `-4px` 对不上而红，整组不会假绿，**但一条判据不能靠兄弟腿替自己守前置条件**。两条关系式判据各加了前置条件，并配一条不需要浏览器的合成读数用例，把"健康 / 双双缺失 / 单侧缺失 / 差 4px"四种形状钉死。报告落盘在已 gitignore 的 `docs/review/`，本文与 CHANGELOG 都不引用它们。

**未验证**：真实页面上仍**没有**跑过热重载去证明页权锁（同形由 `page-sandbox` 的「同一 vm context 求值两次」演过）；`wash:check` 的 `side` 组在真浏览器里对着真宿主编过，但**这条修正在桌面壳上的观感 0 次目视**（壳需要用户本人重启才加载新代码）；`anchors.drifted: [] && pending: false` 这条 Roadmap 验收**未在活页面上读到过**，所以 A1 不销账。**2026-10-12 追记（上面这半句到此作废）**：同日 19:44 用「任何浏览器 → 壳自己 serve 的 `127.0.0.1:19387`」这条不必重启壳的通道，读到 `drifted: [] && notMounted: [] && pending: false`（`channelAbsent` 恰两组、`retired` 三组按设计排除在外）——**这个组合此前从未在壳相关页面上出现过**（10.12.0 那次 `drifted` 是两项非空）。三条边界照实写：那条 Roadmap 项要的是 `… && channelAbsent: []`，两组磨砂去哈希之前不可能为空，**所以 A1 仍不销账**；这条通道**不是** Electron 渲染进程（`data-windows-titlebar` 一类由壳自写的属性在此缺席，桌面专属规则不火），对 `10.12.1` 的渲染进程机读仍是 0 次；判据本身也在同轮被纠了一次——`style[data-plugin-css]` 数出 139 张，而我方按 `id` 前缀只有 2 张，**那个属性是宿主的**。完整读数见 `docs/desktop-support.md` 的「官方桌面壳的活页机读通道」。更新：`dsh plugin --profile web add dsh-dream-skin@10.12.0`。

**版本 10.10.0（2026-10-10）**：证据版——**没有新的视觉决定**，这一轮把上一轮的"我看到了"变成可复算的东西，并清掉评审留在本地待办里的四条欠账。

**10.9.3 的像素效果拿到第一次目视**：报告人在官方 DSH Desktop 上看那条带子，回执「现在好了，我看到已经正常了」。"看到的是 10.9.3"当场排除——安装副本落盘 `2026-10-09T11:57:09Z`、其中 `PLUGIN_BUILD="10.9.3"` 且两层简写在场、profile 依赖 `^9.29.0 → ^10.9.3`，而 `DeepSeek Harness` 进程启动于 `2026-10-10 19:25:01`（**比文件新约 23.5 小时**）。**这一格评级不变**：目视是人的读数，Electron 渲染进程内部机读仍为 0 次。

**四条欠账**：① 计算样式门的 `corner` 夹具**不再手抄颜色**（改由 `cornerTokens()` 从发货 bundle 现读，读不到就拒绝构建，绝不补默认值）+ 一条活页变异（换掉 nebula 的 canvas token → 带子与内容列两处读数**一起**搬，plain 态仍读侧栏 token）——这条变异把 10.9.3 的哨兵结论从"一段话"变成"每次跑套件都重演的一次改写"；同一条口径随后也套到 `coexist` 夹具（那里的两行写死颜色同样换成现读）；② 持久化一族 `sleep(400)` 改成**轮询到终局判据**，轮询器自身配"永不收敛必须判红"的反向门，且这两份逐字重复的助手收进共享夹具 `tests/fixtures/converge.cjs`（同一份超时契约只有一处能修）；③ **同页两代纤维的归属锁**：材质表 / 壁纸节点 / 水洗标记 / 对话框地板全在模块作用域，bundle 被求值两次就有两份 cleanup，旧代晚一步卸载会拆掉新代刚装好的东西——现在 `apply()` **一进门先认领页权**、cleanup 只在持有时动手（与 T9 给 nav-icon 的锁同形状）。页权号**存在 `window` 上而不是模块里**：两份模块作用域没法仲裁同一个 `<html>` 属性，这一点有一条"把读回改成模块私有"的变异专门钉住。写这条时抓到**同债务的第二个实例且更坏**：composer 标记的观察器不仅没门控，它的 `started` 闩从不复位，旧代一停就**永久**不再打标记，所以除了门控还补了闩的交还 + "第三代必须能重新 arm"这一腿；壁纸刷新那条**没用门控解决**——它的 tick / `visibilitychange` 监听也是模块句柄，门控只会把"旧代停掉新代的 tick"换成"旧代的 tick 永远停不下来"（页面上留下一个永远停不下来的旧定时器，而它读的壁纸配置是共享的 `localStorage`，于是每小时仍能通过自己那份已经没人认的 `ctx` 重贴一次壁纸），所以改成**每代释放自己创建的那两个句柄**，两个方向各有变异；④ **localStorage 写不进去不再只掉进黑洞**：所有本地写入走同一道门，失败键名 / 错误名 / 时刻进 `__DSH_DREAM_SKIN_STATUS__.storageError` 并立刻重发快照，**后续任何一次写入成功就把这条撤掉**（否则字段名、提示行和工具读的是"现在坏了"，而它记的是"曾经坏过"），壁纸历史补**字节**上限（5 条 × 2MB 照片 base64 ≈13MB，早爆配额；维护机现读 5 条合计 122,117 字符）并配"一条自身超预算的壁纸也不许被剪空"的下限，设置页多一行条件提示（8 语言各一条，键集 parity 现在是一条会失败的门；这一行**现在真的被渲染出来了**——测试夹具第一次能把 `jsx()` 记账成节点树，健康页不显示、被拒后显示，两个方向各一条变异）。

**Roadmap 与通道**：`wash:check` 认 `DSH_WASH_STRICT`（缺浏览器 / 缺宿主 → **exit 4 点名缺哪一样**，不再静默 skip），`ci.yml` 新增 `wash-gate` 作业（宿主版本从 census 现读、共签插件版本钉死、回读日志确认无 skip 行）——**配置好 ≠ 跑过**：这一条在 2026-10-10 的一次完整绿 workflow（run 38061953959，四份 `test` + `wash-gate` + `typecheck` 全绿）里拿到了 **13 行读数 + `wash cascade OK`、零 skip 行**，于是从 Roadmap 上删除；那条 CI 第一次跑时是红的，红在我方套件自己（见下），不是流水线没铺好。发布清单补「从 registry 真装一次」与「桌面用户先分诊实装版本」两节；8 份 README 与安装技能写清版本号形态（`npm view dsh-dream-skin version` 现查、24h 冷静期静默装旧版、**老 profile 的 `^9.29.0` 按 semver 到不了 10.x 而 `update` 沿用既有范围**）；A3（peer 滚到 `0.3.x`）标**上游阻塞**——registry 上 `@deepseek-ai/dsh` 止于 `0.2.1-alpha.2`，`0.3.x` 从未发布。

回归门 **461/461**（10.9.3 为 413，本轮 **+48 = 四个文件 41（fiber 7 / fiber.page_scope 7 / storage 15 / wash.ci_strict 12）+ `wash.cascade` 3（bundle 现读 / 拒绝面 / 活页变异）+ `desktop.fontscale` 2（#107 的口径互斥门与它的反向腿）+ 两份 `waitFor` 反向门各 1（现已合并为共享夹具里的一份）**；"新增"与"既有断言换形状"分开记）。质量审计 **228/228**（217 调色 + 11 工艺，门数不变）。**变异账本**（逐条实跑，每条红在哪写清楚）：删页权门 → 旧代吃掉新代（材质表 / 水洗标记 / token 层三处同时被拆，都写成断言）；标记门换成无条件停止 → 唯一那个观察器被旧代断开；删闩复位 → 第二代不再建观察器、`live` 恒 0（**永久失效那一半单独钉**）；页权号从 `window` 收回模块私有 → 跨副本那一腿照旧被拆（材质表 2→0、水洗标记回到无），而 token 层原地不动——这份不对称正是"该上页面的状态就该放页面上"的实测理由；`claimPageOwner()` 换成 `readPageOwner()`（迟认领）→ 宿主在 apply 中途卸载旧代时新代的材质表被拆；刷新调度器的释放改走模块句柄（= 修复前的形状）→ 新代的 tick 与 `visibilitychange` 监听被旧代停掉（实测 2→1、1→0）；把它改成"什么都不释放" → 两代各自的 tick 与监听全留在页面上，连 owning 那次也一起漏；`lastStorageError ?` 换成恒假 → 提示行永不出现（静默降级复现），换成恒真 → 健康页面也报警；`keep.length > 1` 改成 `> 0` → 一条自身超预算的壁纸被剪成 `[]`；删掉成功写入后的归零块 → 之后的写入全部落地、快照仍报"这一页坏了"；从 `ja` 一个字典删 `storage.hint` → 只有八字典 parity 红；删错误记录 / 留记录但不重发快照 / `writeStorage` 绕过单门 → 三条都由"被拒写入必须被点名"翻红；预算抬到 999999999 → 只有字节上限红；#107 那条口径互斥门做了**双向**腿——把改过的"各零次实测"原样注入回去必须红，同一句加上"真机目视下"限定后必须绿（只禁字面的门是禁词表，不是口径检查）。**未验证**：`wash-gate` 已在 runner 上跑出 13 行读数并打印 `wash cascade OK`（严格模式，零 skip 行），Roadmap 那条随之删除——但**它第一次跑是红的，红在我方**：一条新写的用例把"这台机器没有宿主安装"当成了"检查失败"，四份 `test` 作业同时红而本机全绿，拆成"只需 bundle 文本的半条 + 按本文件约定 skip 门控的半条"后才绿（run 38061953959 全绿）。**"环境不具备"与"检查失败"必须是两个出口**，这条纪律轮到套件自己的加载期违反它。浏览器端配额触发未实测（失败路径是 VM 沙箱里用真会抛的 `setItem` 驱动的）；归属锁改的是 fiber 生命周期路径，**没在真页面做过热重载**；`refreshNotify` 那句"只有还是我的时候才置空"没有独立变异门（沙箱里观测不到它的出口——面板同步不经过任何被记录的句子），与它同形的两条已门控。更新：`dsh plugin --profile web add dsh-dream-skin@10.10.0`（老 profile 请用 `add` 而不是 `update`，见上文「更新」一节）。

**版本 10.9.3（2026-10-09）**：同一个红圈的**第二次改判**，以及"计算值相等"为什么不等于"看起来一样"。

**回执：装了 10.9.2、重启之后，顶部那条还是比下面浅。** 先按老规矩排除"没送达"——桌面 profile 的 10.9.2 落盘 18:39、应用在 18:49 启动、壳的 HTTP 缓存里查不到旧副本、从壳自己 serve 的页面现读 `build:"10.9.2"` ⇒ **10.9.2 确实在跑**。所以这一次坏的不是送达，是**判据**。

**真机层数普查**（在壳 serve 的那个真实页面上，从被着色的元素一路走到 `<html>`，把每一层非透明底读出来）：内容列 = `body(0.4)` + `.centerCol(0.4)` + **列内那层 app root(0.4)** → 合成 alpha **0.784**；侧栏列同样 3 层；而标题条 = `body(0.4)` + `::before(0.4)` → **0.640**。10.9.2 的判据比的是两个元素**各自的 `backgroundColor`**，那两个值确实逐字相等（都是 `rgba(19, 17, 22, 0.4)`），于是 412 条用例全绿，而屏幕上是一条**少一层**的带子。**声明不是像素**——这就是本轮的病灶。这条结论还有一份不是本仓库生成的证据：把报告人那张截图按 400px 宽取平均色沿 y 竖切，带子 `R149–160`、紧贴其下的内容列 `R98`，按"每多一层 α=0.4"反解正好差**一层**。

**修法**：标题条把同一枚 token **画两层**（仍是一条 `background` 简写：一层实心渐变叠在颜色层上），合成后与它下面那一列同为 0.784；一条声明、简写、拖拽区与盒子几何照旧不变。

**门跟着换形状**：`caption-matches-content` → **`caption-composites-like-content`**（比合成结果，不比声明），另加两条新的防空洞——**`caption-stack-is-column-deep`**（夹具的内容列必须真有 3 层，即真机量到的深度；"把夹具改浅让等式好过"这条路被钉死）与 **`caption-comparison-is-alpha-sensitive`**（token 必须半透明，否则任何层数都合成成同一个颜色，等式失去意义），并把原来的图片判据换成 **`caption-image-is-our-token`**（带子上活下来的那层 `background-image` 必须是我们自己的渐变）。夹具本身也补了它先前漏掉的那一层并把 token 从实心改成半透明：**这两处都是让夹具更像真页面，不是让判据更好过**。变异新增一条命名用例——**把声明换回 10.9.2 的单层写法** → 引擎那一侧只有合成那条翻红，且同一次读数当场证明 `stripFill === centerColFill` 在这个坏页面上**成立**（把"上一版为什么全绿"写成断言，而不是写成一段话）；形状门兜不住这一条是**有意的**：craft 的白名单放行单层（层数不是形状问题），smoke 虽然红、但它比的是整条声明字符串而不是层数——**全仓库只有引擎那一行是"因为少一层"而红的**。夹具退平 → 只有深度那条红；token 换回实心 → 只有敏感性那条红。回归门 **413/413**，质量审计 **228/228**（217 调色 + 11 工艺，门数不变）。

**边界照实写**：侧栏列的第三层**不跟随** `--dsw-alias-bg-base`（哨兵实测：改写 canvas token 时内容列三层都动、侧栏那层不动），所以滑杆推到极端时带子左端约 15% 仍可能与侧栏本体有轻微明暗差；本版仍然选择跟内容列（宽度约 85%，且这是报告人两次回执指向的方向）。**10.9.3 的像素效果同样 0 次目视**——依据是量出来的合成关系，不是"我看过了"。更新：`dsh plugin --profile web update dsh-dream-skin@10.9.3`。

**2026-10-10 补记 —— 上面那句"0 次目视"到此为止**。报告人在**官方 DSH Desktop** 上看了那一条带子，回执原文是「现在好了，我看到已经正常了」，这是 10.9.3 像素效果的**第一次目视**，也是这个红圈第一次在真机上被确认抹平。"看到的是不是 10.9.3"这一步是当场排除的，不是假设的：桌面 profile 里 `node_modules/dsh-dream-skin/lib/client.js` 落盘时刻 `2026-10-09T11:57:09Z`（本地 19:57:09）、该文件 `PLUGIN_BUILD="10.9.3"`、**两层写法在安装副本里在场**、profile 依赖范围已从 `^9.29.0` 抬到 `^10.9.3`；而 `DeepSeek Harness` 进程启动于 `2026-10-10 19:25:01`，**比落盘晚约 23.5 小时**——进程比文件新，所以那一眼读到的就是 10.9.3。**两句边界**：① 这是**人的目视**，Electron 渲染进程内部至今 0 次机读，这一格的评价仍是"预期可加载"而不是"已支持"（理由见 `docs/desktop-support.md`）；② 进程时刻取自应用当晚在跑的那一次，撰写本条时它已关闭、无法复现该次查询——但**落盘那一半（mtime / `PLUGIN_BUILD` / 两层声明在场 / 依赖范围）任何时刻可复现**。侧栏那一段约 15% 的明暗差是本版**有意保留**的代价：若它成为新回执，出路是分侧（一条带子两种底）或做成设置项，不是第三次猜默认值。



**版本 10.9.2（2026-10-09）**：标题条那一条带子的**方向反转轮**——同一个问题，第二种答案，以及第一次在壳自己的宿主上量到"上一版确实生效了"。**→ 本版那条"合成结果按构造相同"是错的，判据已被 10.9.3 换掉**：它比的是两个元素各自的 `backgroundColor`，而真页面上内容列把同一枚 token 画了三层、带子只有两层，于是"相等"与"偏浅"同时为真，412 条用例全绿。下面整段保留原文（含那句错话），是为了让"当时是怎么量的、错在哪一层"可追溯。

**回执说：还是不行。** 10.9.1 把 Windows 标题条的计算底色清成透明（让壁纸成为窗口背景），报告人重新设了壁纸、装了 10.9.1，截图回来的仍然是同一句话——"顶上一条和页面主题不一致"。**这次的成因不是版本没到，也不是规则没命中**：在壳自带的宿主（`@deepseek-ai/dsh` 0.2.0-rc.2，desktop profile）里现读，我方规则确实把那条 `::before` 压成了 `rgba(0, 0, 0, 0)`，宿主的 `[data-windows-titlebar] .<hash>_frame::before { background: var(--dsw-specific-sidebar-fill); app-region: drag }` 已经不再着色——**剩下的是那个方案自己的代价**：这张照片的顶部是一面浅色墙，透出壁纸之后，那 40px 比它下面所有内容都亮，于是"与主题不一致"以另一种形式复现了。这正是 10.9.1 代码注释里预写下来的那句"亮壁纸上这条带子会更亮而不是消失"。

**本版改判**：水洗态下标题条不再透出壁纸，而是**画它下面那一列所使用的同一枚 token**——`var(--dsw-alias-bg-base)`（canvas 填充，随主画布滑杆）。因为 #96 已经把 frame 自己的填充清掉了，两者于是都是"一层 canvas 覆在壁纸上"，合成结果按构造相同（本机 desktop profile / nebula 现读：带子与内容列同为 `rgba(19, 17, 22, 0.4)`）。**代价照实写**：侧栏比 canvas 重（同一 token 画两层）的那一段，带子会比侧栏本体浅——一个平涂盒子跟不了两列，能选的只是跟谁，本版按"宽度上约 85% 是内容列 + 报告人的回执"跟内容列。要退回"透出壁纸"那一版，只需要把这条声明换回 `transparent`，但**必须看着下面那条判据翻红来做**，不许悄悄改。

**判据跟着换形状，这是本轮最重要的一件事**：`corner` 组原来的 `caption-cleared` 断言的是"带子必须透明"——**把上一轮的决定写死成了定理**，所以它对"决定本身错了"完全无感。现在换成 `caption-matches-content`：水洗态带子的计算底色必须**等于内容列的计算底色**（比较对象是量出来的邻居，不是手抄的颜色，10.8.1 的 F14 同族），外加 `center-column-paints` 作防空洞（内容列确实着色，否则"相等"是一句关于空白页的真话）。新增一条引擎变异：**把声明换回 10.9.1 的 `transparent`** → 只有 `caption-matches-content` 一条翻红，盒子是否生成 / 拖拽声明 / 几何三件 / 撤水洗复原**全部照常绿**——这张清单就是"为什么上一版能带着一个错的决定通过所有门"的答案。工艺门的白名单相应收成三种允许值（`transparent` / `none` / `var(--dsw-alias-bg-base)`，都必须带 `!important`），**硬写颜色判红**：那会在机壳上引入第四种材质，没有任何一套皮肤拥有它、也没有任何一道门追得回它。回归门 **412/412**（10.9.1 为 405，本轮 +1：那条"退回 bare 形状"的引擎变异门；`caption-cleared` 改名并换判据、`center-column-paints` 是既有用例长出来的新腿，不计新增；**再 +6：与本版同批发度的 issue #95 门批次**——#95-A 的 CHANGELOG 头版块数字登记、#95-B 的预览图引用可寻址双向用例、#95-C 的字号逐版本对账三条变异、#95-D 的措辞门两条变异、#95-E 的出路口门两条变异），质量审计 **228/228**（217 调色 + 11 工艺，门数不变）。

**第一次在壳自己的宿主上读到运行期状态**（此前本仓库对那台壳只有静态取证）：`http://127.0.0.1:19387`（desktop profile，宿主 0.2.0-rc.2）上 `__DSH_DREAM_SKIN_STATUS__` 读到 `build:"10.9.1" / status:"ready" / lastError:null / skin:"nebula"`，水洗标记在场，活页 CSSOM 里能读到宿主那条 `::before` 声明原文。**如实边界**：读数来自**外部浏览器指向壳的服务器**——同一份 bundle、同一个 profile，但 `data-windows-titlebar` 是壳自己写的，浏览器里没有，所以那一处是**手动加上属性后**测的；Electron 渲染进程内部仍是 **0 次读数**，像素判断仍由报告人的截图供给。`docs/desktop-support.md` 那一格的评级**依旧不上调**。

**一条会挡住所有人的安装路径事实（本机实测）**：宿主 CLI 写死了**不接受把插件命令指向桌面壳那个 profile 名**——`dsh/lib/bin.js` 里 `if (profile.toLowerCase() === "desktop") program.error(...)`，用户侧看到的是原样一句 `error: profile "desktop" is managed exclusively by the Electron application`（完整的成因、证据与正确的告警写法在 `docs/desktop-support.md`，本 README 故意不把那条命令拼出来教给用户）。所以桌面 profile 只有两条路：① 在应用内的插件管理界面里装；② 在该 profile 目录里手工 `pnpm add dsh-dream-skin@<确切版本号>`（本机走通了这条：`package.json` 从 `^9.29.0` 抬到 `^10.9.1`、pnpm 自己把该版本追加进 `pnpm-workspace.yaml` 的 `minimumReleaseAgeExclude`，2.3 秒完成）。**命令必须带确切版本号**——`^9.29.0` 按 semver 覆盖不到 10.x，而发布 24 小时内不带版本号的命令会被 pnpm 冷静期静默退回旧版。

**版本 10.9.1（2026-10-09）**：官方桌面壳的三处壁纸态外观轮。报告来自一张 **DeepSeek Harness 44.0.0**（官方 DSH Desktop，profile `desktop`）上设了照片壁纸的截图，圈了三处：顶部一条与页面主题不一致的色带（红）、logo 右侧一个不合理的圆角（绿）、左栏底部头像上方一条不合理的渐变（蓝）。**逐条取证后的结论分两类，两类都如实写**：

- **绿圈与蓝圈是 10.8.0 已经修掉的两处**（issue #96 的内容圆角、#97 的会话列表底部 fade 带）。它们在这台机器上仍然可见的原因是**版本没到**：该 profile 的依赖写的是 `dsh-dream-skin: ^9.29.0`，而 `^9.29.0` 按 semver 覆盖不到 10.x——`dsh plugin update` 也不会把它抬进 10.x。**这不是新缺陷，是旧修复没送达**，本版对这两处只补了回归门（见下），没有改代码。
- **红圈是 10.9.0 仍然存在的缺陷**，而且是一个"规则写对了盒子写错了"的形状：#96 那条水洗门控规则清的是 AppFrame **元素**的 `background-color`，而 Windows 标题条由宿主的 **`::before` 伪元素**单独绘制（`[data-windows-titlebar] .<hash>_frame:before { background: var(--dsw-specific-sidebar-fill); -webkit-app-region: drag; inset: 0 0 auto }`）——**`background-color` 不会传进伪元素**。于是水洗态下整幅窗宽的最上面 34–48px 仍由**侧栏**那枚 token 上色：它左边压着侧栏（同一 token 在真机画了**两层**）、右边压着内容列（另一枚 canvas token），三处互相不一致，而 DSH Web 根本没有这一条。本版给伪元素补**它自己的**水洗门控规则，清的是 `background` 简写（不是 `background-color` 长手——长手会放过一条渐变，而 #97 就是一条渐变），而 `-webkit-app-region: drag` 一字不动——**那条带子是拖窗口的地方，壁纸不该让用户丢掉拖拽**。**代价如实写明**：清掉之后顶部 34–48px 就是壁纸本身，它是全窗口**唯一不着色**的一带（侧栏列在它下面仍画两层），所以在**亮壁纸**上这条带子会**更亮**而不是消失，深色壁纸上才读起来像连续的机壳。这是"让水洗态的壁纸成为窗口背景"这一立场的必然结果，不是修坏了；备选方案（把带子改涂 canvas 色）记在代码注释里，等回执再判要不要做成选项。**→ 回执已回，且这一判已被改：见上方 10.9.2。本段保留原文（包括"唯一证据"这一措辞在 J2 里已被降级、以及 `caption-cleared` 这个已被改名换判据的 id），是为了让"当时是怎么想的"可追溯，而不是因为它还对。**同轮订正一处旧陈述：#96 的注释当时写"每个面各自保留一层半透明"，并把"标题条"列进那张名单——它并没有只保留一层，那句话从未描述过这个页面，现在按实测改写并留下订正记录。

**机制取证跑在真实引擎里**（`npm run wash:check` 的 `corner` 组——**这份夹具读的是本机 npm 安装物里那份 layout CSS（`pI_x6G_` 世代），不是官方桌面壳的 `app.asar`**；壳那份是另外逐字读出来对照的，两处声明同形只差哈希。这条区分是评审 B3 抓的：把"读了壳的 CSS"写成"夹具跑在壳上"是失实的出处标注。**该门在仓库里，npm 包不含 `scripts/`**，所以它是维护方与贡献者的复现通道，不是装完包就能跑的命令）。标题条计算底色三态实测 **`rgba(16, 16, 24, 0.75)` → `rgba(0, 0, 0, 0)` → 回到 0.75**（这个颜色是**夹具 `:root` 自己手写的那枚 `--dsw-specific-sidebar-fill`**，不是八套皮肤里任何一套的发货值——判据全部写成"与参照元素的计算值相等/不等"，不写死颜色；把夹具内常量当真实皮肤读数引用是 10.8.1 的 F14 同族错误，评审 B8 点名后在此标明），且**两态的 `-webkit-app-region` 都仍是 `drag`**（这条读数是"没顺手把拖拽改掉"的**必要但不充分**证据——它只有引擎能给，字符串门看不见；但它单独不够，见下面 B1 那一段：盒子被删掉时这条读数照样写 `drag`）；**同一轮补上几何读数**：标题条盒子的 `top` / `height` / `transform` 在 plain 态必须是"贴着窗口顶、有真实高度、没被位移"，水洗态必须与 plain 态逐字相同。加这三条不是因为审美：把那条声明换成 `transform: translateY(-34px)` 或 `inset: -9999px`，填充、图片、`content`、`app-region` **四条读数全部照常**，而用户能抓的那条带子已经不在窗口顶上了（裁定 J1，签名是量出来的）。侧栏列的计算底色三态恒等，证明这次只削掉了 frame 那一层、没有越界去改用户用滑杆调的那个面。反向变异五条：**删掉整条伪元素规则** → 水洗态标题条重新画满侧栏色，且**只有** `caption-cleared` 一条翻红（圆角、frame 填充、侧栏列三条判据不受影响，说明这条修复是独立的一块）；**只去掉 `!important`** → 计算值仍为透明，因为我方特异度 (0,3,3) 已压过宿主 (0,2,1)——**这条与 #99 的 `!important` 结论方向相反，两边都是量出来的，不是照抄**（那条是 (0,2,1) 对 (0,3,1)，flag 承重）；**让我方规则声明 `-webkit-app-region: none`** → 活页当场翻红并点名 `caption-still-drags`；**让我方规则声明 `content: none`** → craft、smoke、活页三门一起翻红（`caption-box-alive`）；**把简写换成 `background-color` 长手** → craft 与 smoke 翻红，而**活页引擎不翻**——今天的宿主在这条带子上画的是纯色，长手与简写算出来一样，这一处的判据本来就归 craft 与合成表管，如实这么记。**中间两条是评审 B1 逼出来的**：它用 `content: none` 实测出"拖拽盒子被删掉、而计算值仍写 `drag`、三门全绿"，也就是说**"两态都读到 drag"这条自证式证据其实是假的**。改判据时顺手把"含 drag"换成严格等值（Chromium 把 `none` 规范化成 `no-drag`，子串判据正好放过它）。工艺门 `wash-frame-flattened` 这一轮把伪元素那一半**从"取第一条匹配块 + 四个属性黑名单"换成白名单**：候选集是**全表每一条水洗门控的伪元素块**（不再依赖我方选择器保持某一种拼写，也不再只看第一条命中），每条必须**恰好一条声明**、属性名必须是 `background` 简写、值必须是 `transparent !important` 或 `none !important`。这不是整理：黑名单只禁得到"有人想到的那四个名字"，而上面那条几何形状（往这条规则里加第二声明 `transform`）在黑名单形态下**照样绿**。八处旧变异在白名单形态下逐条重跑仍翻红（伪元素形状丢掉、声明删掉、flag 摘掉、选择器不再指向伪元素、水洗门控丢掉、把透明换成 canvas 色、加 `content: none`、简写换成长手——最后两条现在分别由"声明数=2"与"属性名不是 background"抓住）；本轮另加 **11 处变异，逐条与预期一致**：植第二条声明（craft + smoke + 活页三门齐红）、声明换成 `inset`、**在页面别处偷偷加一条水洗门控伪元素规则**（只有 craft 红，如实记：这一处归 craft 管）、改锚点拼写并植入几何声明（craft 红）、**改锚点拼写但声明正确**（craft 绿 / smoke 红——smoke 是字符串门，它钉住我方拼写这件事本身照实写出来，不藏）、**同一条正确规则把 craft 的锚点图案换回严格版再测**（当场红：这条方向性测量说明放宽锚点买到的是"少一次假红"，而不是放松检查）、判据丢掉 `requires`、夹具给字段改名、三条几何读数从夹具删掉、`requires` 里字段名打错、**新字段门自己的锚点指错页**（给新门做的真空测试：指错就红，不会静默放过）。门数仍是 11（判据变厚，不加门）。

**判据读的字段必须真的被夹具取到**，这件事钉成两道门：引擎侧每条判据声明自己的 `requires`，字段缺失时报 **`checker:`（检查器坏了）**而不是判绿——`undefined === undefined` 是一句关于"没人采样过"的真话，正是 issue #97 的形状再往上一层；CI 侧再跑一道**字符串门**（`tests/wash.cascade.test.cjs` 直接读 `wash-cascade.cjs` 里那两处 `sample()` 的字面量，按组对上正确的夹具），因为 CI 的形态是 **393 pass / 11 skip**，引擎那道守卫在那台机器上根本不会开火。

**顺手关掉一条文档欠账**：夹具页里最后两处手抄宿主类名（`pI_x6G_frame` / `pI_x6G_centerCol`，`docs/desktop-support.md` 边界⑤）现在与 fade/chat 一样**从宿主 CSS 现读推导**，并新增 `sidebarCol` 一枚。这件事不是整理：我方规则靠**结构**（`div:has(> [data-shell-overlay])`）命中 frame，所以一个过期的手抄类名**不会**让我方规则失效——它会让**宿主**的规则失效，于是页面测的是一条根本没人画的带子、照样读到"透明"、照样"通过"。这正是 issue #97 的形状往上层复发。现在宿主重掷即**拒绝构建夹具**。

**关于官方桌面壳的新事实（此前本仓库只静态读过它，运行期一条都没验过）**：它的 `app.asar` 里 `data-shell-overlay`、`data-windows-titlebar`、`--dsh-windows-content-radius` 三处锚点**全在**，宿主是自带的 **`@deepseek-ai/dsh` 0.2.0-rc.2**，类名自成一族（`BynINW_frame` / `BynINW_centerCol` / `_9lTDKa_fade`），且那条 fade 与我们在 npm 宿主上量的 `bhn1Oq_fade` 只差哈希——**#97 的哈希无关锚点在这台壳上直接命中**。诚实边界照旧写明：本机的验证是**从该 app.asar 读出 CSS 原文 + 在真实引擎里重演**，不是在那台 Electron 里读 `__DSH_DREAM_SKIN_STATUS__`；报告人截图里皮肤与壁纸确实生效，但那是 9.29.0 的观测。**没有 10.9.1 在该壳上的真机目视**。

回归门 **405/405**（10.9.0 为 401，本轮 **+4 条新用例**：① 删掉伪元素规则的反向变异门、② `!important` 方向性门（证明这条与 #99 那条方向相反）、③ `hostLayoutClasses` 类名推导与拒绝面门、④ **判据 `requires` × 夹具取样字段门**（CI 可跑，本轮 J4 补）；**另有两处既有用例被加厚而非新增**——#96 那条 smoke 用例多了 5 条伪元素断言（规则存在 / 是简写不是长手 / 不得 un-generate 盒子 / 反向 ungated / 与元素规则不合并），其中后三条在 J1 里**换成"数声明条数 + 白名单"形式**（黑名单式断言删掉，因为它们在旧形状下会照样绿），`checkReadings` 的合成反向表 10.9.0 为 4 条、第一轮扩到 **7 条**、本轮扩到 **10 条 caption 断言各红各的**（含三条几何），另加两条"检查器本身"的用例（缺字段报 `checker:`、空 `requires` 直接拒绝）。"新增几条"与"哪几条是既有用例长出来的"分开记，是评审 B4 抓的：把加厚说成新增，等于让套件数字自己解释自己）；质量审计 **228/228**（217 调色 + 11 工艺，门数不变、`wash-frame-flattened` 判据变厚）。更新命令一律带版本号，**尤其是老 profile**：`dsh plugin --profile web update dsh-dream-skin@10.9.1`（桌面 profile 若依赖仍是 `^9.x`，必须先显式写版本号，`update` 不会跨大版本抬上去）。

**版本 10.9.0（2026-10-08）**：评审工单批次轮（issue #100 / #101 / #102 / #103 / #104 / #105，同日提交、同日整改）。六条里四条是"声明没有门看着"，两条是真实观感与可用性缺陷，逐条如下。

**#100（P1，观感 + 量程）——可读性地板原本在**没有壁纸**时也生效**：地板是为了"壁纸把页面内容垫在对话框后面"，可 10.8.0 那一版不看这个前提，于是**没有壁纸**时它照样把 92% 的滑杆行程钳掉（显示 8%–100% 透明度渲染结果完全相同），却换不来任何可读性收益。现在地板由**水洗标记**（`html[data-dsh-dream-skin-wash]`，也就是 CSS 水洗规则读的同一个属性）单点授权：有壁纸时地板在场、滑杆的透端对"由弹层底色绘制的面"不再变化；**没有壁纸时滑杆恢复 0–100% 全量程**。死行程还在的那一半也不再让用户猜：滑杆数值旁会实时标出「已到可读性下限 92%」（滑杆值进入被接管的区间时才出现，8 语言全译），明确告诉用户"这一段不动是因为地板，不是滑杆坏了"——这正是 issue #67 那族"滑杆不动"从另一头重新长出来的地方。加壁纸/清壁纸那一刻会**主动重算并重发**两条被钳的通道（`removeWallpaper()` 走的是不经过 `applyWallpaper2` 的路径，第一版实现漏了它，是自测用例当场抓出来的）。

**#101（P2）——同一根滑杆两个下限**：提问卡 / 审批卡 / 计划评审卡（"读了再决定"的三张）此前跟着滑杆一路到**全透**，而同一个滑杆驱动的对话框恒 ≥92%。现在两条通道读**同一个** `readDialogAlpha()`：一条滑杆一个下限，且同样受 #100 的水洗门控。

**#102（P2）——"有浏览器但起不来"是第三种状态，过去落进抛栈**：`runChrome()` 只在"找不到浏览器"时 skip，`EBUSY`/`EPERM`/`EACCES`（企业策略、浏览器自更新、受限容器——评审机自己就是这台机器）会让整套件 exit 1，看起来跟"层叠真的坏了"一模一样。现在 spawn 失败与"没浏览器"走同一条**skip**通路，并且 `npm run wash:check` 的退出码分三档：**0 = 跑过且干净 / 1 = 跑过且不一致 / 3 = 没跑成**（"没法检查"不许和"检查干净"共用一个出口；**0 只在三段夹具全部跑成时给出**——本机没装第三方 skin-center 时 coexist 段会 skip，退出码就是 3 而不是 0，这是有意的："我这两段干净"不等于"整套检查通过"）。宿主安装缺失同理：**没有宿主**是 skip（环境），**装有宿主但那条声明没了或那个包被改名了**是判红（真漂移）——两者用一个**带标记的异常对象**区分，不靠字符串匹配。

**#103（P3）——mist 出厂种子 0.90 < 地板 0.92 是**有意保留**的偏差**：抬到 0.92 等于重掷整套设计系统产物（8 套 × 57 枚 token），代价不成比例，所以偏差留着、但**钉进门**：用例同时断言 `0.90` 这个种子值与 `0.90 < 地板` 这个关系，任一侧被改动都必须重新做一次声明；另断言 mist 是**唯一**一套落在地板下的皮肤（出现第二套是新的决定，不是新的数据）。

**#104（P3）——J1 漂移探针偶发翻红**：评审样本是 10.8.0 工作树 4 次全量里 1 次（当时没留住断言原文）。本轮**连跑 20 次整文件 + 4 次全量，0 次复现**；那条用例另按仓库规则补了**中间态 + 终态双采样**（中间态在 `apply()` 返回后**同步**读取——不带任何计时器，所以它不可能竞争；终态仍按轮询等收敛），并补一条反向用例：**活页证据无法成立的宿主永远不许到达正向信号**（否则"改成等待条件"就等于把门变成常绿）。

**#105（P3）——`[class$="_fade"]` 的作用域现在是被量出来的**：后缀锚点换来了抗哈希重掷，代价是作用域变宽。普查（`scripts/host-consumers.cjs`）新增 `fade` 一节，扫**宿主语料 + 装了第三方插件的 profile 语料**（33 个插件包），逐个包记录 `_fade` 出现的**形态**（属性选择器 / 类选择器 / @keyframes / 普通标识符）与"是否会被我方后缀锚点命中"，并冻结进 `scripts/data/host-token-census.json`。实测五个 owner、**两个真会被命中**：宿主 `dsh-client-ui-workspace`（就是我们想中和的那条）与第三方 **`@linxin666/dsh-client-ui-skin-center`**（它写 `[data-slot="sidebar.workspaces"] [class*="_fade"]`）——后者从此由 `tests/fade.owners.test.cjs` 按**包名**看守：没登记的 owner、与测量矛盾的处置（比如把一个仍可命中的包标成"无影响"）、语料整个读不到，三种情形都会点名翻红。评审专家自己踩过的两个分类陷阱也钉成了数据：`@keyframes BInVoG_fade-in`（动画名，不是类）与 `this._fadeInSeconds`（Live2D 的 JS 字段，连逗号运算符都会骗过粗糙的正则）现在各有用例。**"谁盖谁"不再是注释里的一句话**：计算样式门新增第三个夹具（`coexist` 组），把**本机安装的** skin-center bundle 里的规则按它自己的 `scoped()` 语义还原、与我们的规则放进同一页，用**行内哨兵**（`background: rgb(1,2,3)` 行内样式）当石蕊试纸读计算值——我方规则下哨兵**还在**（我们是普通声明，压不过行内），它们的 `!important` 一进场哨兵就**没了**（更强的车道是它们，在 `background` 这个属性上），而**用户会看到的那条带子在两种世界里都是 `none`**：重合的代价是零。谁盖谁有答案了、且这个答案是用真实 CSS 引擎量出来的。另外顺手把夹具里最后两处**手抄的宿主类名**（fade / chat 的类 token）改成**从刚读到的宿主 CSS 推导**：宿主重掷哈希时夹具会**响亮地拒绝构建**，而不是继续测一个没人渲染的类还照样"通过"。诊断快照新增 **`anchors.fadeMatches` / `fadeClasses`**——"这根锚点现在到底罩住几个元素、都是谁"，装了第二个皮肤插件的机器可以自证；读不到 DOM 时上报 **`null`** 而不是 0（"一个都没有"和"我没能看"是两件不同的事实）。

回归门 **401/401**（10.8.1 为 375，本轮 +26：地板五点采样门（有/无壁纸两态，两条腿 + 两条豁免腿）、卡片通道同口径门、加/清壁纸重发门、mist 偏差门、J1 正向双采样 + 反向门、`fadeMatches` 活页门、`settleDrift` 反向门、`#102` 三件（吸收 spawn 失败 / 三档判级 / CLI exit 3）、`fade.owners` 九件（含四条命名变异）、`wash:check` coexist 四件（判据表可失败性 / 宿主类名推导与拒绝面 / 第三方规则提取的逐件拒绝 / 活页与反向变异））；质量审计 **228/228**（217 调色 + 11 工艺，门数不变）。更新命令一律带版本号：`dsh plugin --profile web update dsh-dream-skin@10.9.0`。

**版本 10.8.1（2026-10-08）**：桌面外壳侧栏透明度补丁轮（issue #99，第三方外壳 `anywhere-labs/dsh-desktop` v2.0.17「增强模式」）。该外壳把官方侧栏装进它自己的 `<aside class="dshDesktopSidebarSurface">`，并在**窗口材质为 `off`** 时于同一元素上再画一层 `background: var(--dsw-alias-bg-layer-1)`；而 Windows 上材质**不可能是别的值**（`environment.ts:24` 只承认 off/transparent/acrylic/mica，`:51-53` 把 acrylic/mica 折成 `off`，`:58` 与 `:61` 对 `win32 + transparent` 直接 `throw`）。9.16.0 的 `--dsw-specific-sidebar-fill: inherit !important` 能救回 **token**，救不了压在上面的那层 **paint**：报告人的原话是"使用窗口模式为增强模式下，侧边栏无法调整不透明度"——侧栏里层确实跟着滑杆走，可透过它看见的是壳的那层底、不是壁纸。本版在**同一条水洗门控**下只清掉颜色分量（`html[data-dsh-dream-skin-wash] .dshDesktopSidebarSurface { background-color: transparent !important; }`，整条规则**只此一个声明**，由门数着）：没有壁纸时不改（那层底是壳在 Windows 上的默认态，不在这个缺陷的范围内），壳的 `border-right` 与布局一位不动。机制取证这一轮被评审重写过：桌面夹具不再有任何手抄颜色（`skinTokens()` 从发货 bundle 现读 token），补上壳的真实祖先链 `#root > .dshDesktopFrame > aside`、一层代表壁纸的底层、一条从壳面往上的不透明阻断链，以及"把 token 写成哨兵值看像素跟不跟"的滑杆扫描。实测两套皮肤三态：abyss `rgb(26, 28, 33) → rgba(0, 0, 0, 0) → 回到 rgb(26, 28, 33)`、mist `rgba(240, 248, 255, 0.62) → rgba(0, 0, 0, 0) → 回到 0.62`，水洗态阻断链为空且 `elementFromPoint` 命中侧栏本身，官方侧栏填充与壳的 `1px solid` 边框三态不变。**反向变异跑过并各自翻红**：删掉我方整条规则 → 水洗态仍画 layer-1（就是 issue #99 本身）；**只去掉 `!important`** → 壳以 (0,3,1) 压过我方 (0,2,1)、那层底重新画满——这条 `!important` 是承重的，写成了随套件跑的用例而不是注释里的断言。门本身也补了牙齿：`checkReadings()` 的 `groups` 必须是**非空数组**（空数组与旧的单字符串都判"检查器坏了"，不再零检查判通过）、CLI 两段各自独立（夹具拒绝构建只点名该段，不吞掉另一段已算出的判据）、壳快照按**声明级**守卫 4 处且用例可以递给它一份删减副本证明它会拒。评审专家同日复核 #96/#97/#98 时另报两点，本版一并修：`drift probe (J1)` 在满载并行下偶发翻红（病灶是拿固定 `sleep(250)` 等一条被压快的阶梯——13 处改成**轮询到终局判据**，并给轮询本身补"永不收敛必须判红"的反向用例），以及计算样式门在别人机器上 `spawn EBUSY` 完全跑不起来（改为**自带临时 user-data-dir + 逐个候选引擎重试**；`CHROME_PATH` 依然说一不二，绝不静默换成别的引擎）。诚实边界：本机没装该第三方外壳，**没有在 v2.0.17 上真机目视**；夹具里的壳 CSS 是**按 tag 抄进来的快照**（provenance 记 `anywhere-labs/dsh-desktop v2.0.17 / styles.ts:13,14,22,23,24,38`，侧栏那一对声明在 v2.0.5 / v2.0.10 / v2.0.17 md5 相同），壳改版不会让快照翻红——它证明的是"这条规则在该世代能赢这份层叠"，不是"真机上已复核"；win32 + 增强模式下这块 aside 还同时承担标题条下面那一条（`styles.ts:38`），水洗态一并透，这是同族缺口的有意结果。真机回执口径（三条 `getComputedStyle` 读数 + 水洗标记在场与否）会随发版贴进 issue #99，本条不写成已完成。回归门 **375/375**（10.8.0 为 364，本轮 +11：#99 字符串级行为门 / 桌面夹具不可空洞化 / 桌面三态计算门 / 桌面反向变异各 1，整改轮再加分皮肤可失败判决、分皮肤记分器、颜色取自 bundle 的拒绝面、快照声明级守卫、`!important` 承重变异、浏览器候选与 `CHROME_PATH` 权威门、轮询收敛反向门）；质量审计 **228/228**（217 调色 + 11 工艺，本轮工艺门数不变）。更新命令一律带版本号：`dsh plugin --profile web update dsh-dream-skin@10.8.1`。

**版本 10.8.0（2026-10-08）**：壁纸态外观轮（issue #96 / #97 / #98）——三处「设了壁纸才出现」的缺陷一次收掉：标题条旁那个像画布翘起一角的**圆角缺口**、左栏底部头像上方常驻的**渐变带**、以及部分壁纸下把主页**读穿**的设置面板。

**这一轮的共同病灶不是三个 bug，是一个**：插件的规则挂在宿主的构建哈希类名上，而哈希每次发版重掷。#97 最典型——10.5.0 就"修过"这条渐变带，规则写的是 `.qDHVXG_fade`，而本版对的两台宿主上它**都是 0 命中**（npm 0.2.0-rc.1 是 `bhn1Oq_fade`，桌面端 app.asar 是 `_9lTDKa_fade`），当时的测试断言的又是「CSS 字符串里含那个类名」，所以规则在这两台可测宿主上从未生效、测试一直绿（0.1.x 一代没有语料，本版不作全称陈述）。现两条规则都换成哈希无关锚点（`[class$="_fade"]` 走宿主渲染的单一类令牌；圆角走宿主自己发布的 `--dsh-windows-content-radius` 变量，顺带把右侧全屏面板的同款缺口一起收掉），并且**只在水洗态生效**——没设壁纸时侧栏填充不透明，那条 fade 与那枚圆角都是宿主该有的样子。漂移探针新增这两组属性锚点，并补一条分类器读法：`_fade` 改名成 `_fadeFoot` 时报「漂移」而不是「健康但没挂载」（子串判定会放过唯一该告警的情形）。

**行为变更（显式声明）**：`--dsw-alias-bg-layer-2` 一枚令牌同时伺候小浮层与大面板，而「弹窗透明度」是两者共用的一把尺——停在低值的档案（本机实测 0.5，更早版本的出厂种子是 0.6）于是把设置窗画成能读穿的皮肤玻璃。现给 **layer-2 整条通道**加可读性地板 **0.92**——如实写明作用面：地板钳的是令牌而不是元素，所以凡以 layer-2 铺底的面一起被抬（本版在宿主安装物里量到 20 条 background/box-shadow 规则、跨 9 个包：设置面板、插件管理、agent-preset 卡片、文档预览状态、目录选择器加载浮标、轨迹图 tooltip 与绘图区，外加一枚派生别名）；保留 0–1 全量程的是**遮罩与下拉菜单两条腿**（`--dsw-alias-bg-overlay` / `--dsw-specific-menu`）。"只钳对话框子树"是下一版的作用域收窄，不是本版行为。0.92 不是拍的：8 套皮肤自带 layer-2 的 alpha 是 0.92（暗）/ 0.94（亮），调色审计正是拿那层面求解三级文字，低于它就是渲染进一台从没量过的尺子；该推导由 `tests/skin.quality.test.cjs` 双向钉住。**你的存储值不会被改写**——地板是渲染期钳制，不是又一次静默 retune；提示文案已按 8 语言说明该下限。

回归门 **364/364**（10.6.1 为 346，本轮 +18：#96 圆角与其无壁纸反向门、#97 fade 与 ungated 反向门、#98 双端采样、探针属性分支的 notMounted/drifted 双判定、地板与出厂填充的双向推导门（+6）；评审整改轮再加 J1 退役锚点两枚（bundle 侧 + `tests/hashes.test.cjs` 与 dead-hash 登记表的双向钉）、hash 形态 fade 规则的 craft 变异一枚（+3）；新增 `tests/wash.cascade.test.cjs` 八枚（计算样式门本体两枚、夹具不可空洞化、单声明删除器、两条同引擎反向变异、判据表分组自洽、判据表的合成反向用例，另有跳过理由的自述）；另有 6 处既有 layer-2 断言把滑杆种子从 0.6 抬到 0.95——它们要验的是色相归属而不是地板，生产门面用例改为同时断言「对话框在 0.92、菜单仍在 0.5」；该数字由 `tests/docs.numbers.test.cjs` 现场加载整套件数出并核对文档，不是手抄）；质量审计 **228/228**（217 调色 + 11 工艺，工艺门本轮 +2：`wash-frame-flattened` / `wash-fade-neutralised`，各配可翻红变异，其中一条变异就是「把 fade 锚点换回 `qDHVXG_fade`」——复现的正是 issue #97 本身）。**计算样式门**（`npm run wash:check`）：把发货 bundle 里抽出的材质表 + 本机安装宿主的 layout / workspace / chat CSS 拼成一页喂给无头 Chrome，读**计算样式**三态——圆角 `16px→0px→16px`、宿主 fade `linear-gradient→none→linear-gradient`、聊天滚动遮罩三态不变；期望值只有**一张表**（`WASH_CHECKS`，每条一个 id 并归属 #96/#97 其中一组），CLI 与用例读同一张表，判红即点名 id 并 exit 1（一个名为 `check` 却永不判红的门就是本版要消灭的那种门）；这张表自身另有合成反向用例（三份假读数各让**恰好**对应的几条 id 翻红），因此它在 CI 里也不是纯装饰。另有两条反向变异在同一引擎里跑过（删掉半径声明 → 水洗态回到 16px；删掉 `[class$="_fade"]` 规则 → 渐变带回来）。没浏览器 / 没装宿主时该门显式 skip 并打印原因，不算通过。**未验证**：桌面端壁纸态的真机目视待复测（本版经 `link:` 安装，需重启 DSH Desktop 才加载新代码，而维护者的实时会话不在被擅自重启的范围内）；侧栏其余装饰规则（`.hHd-Xa_*` 一族）仍押哈希，属 Roadmap「去哈希类名依赖」未完成项。完整诚实清单见 **[docs/desktop-support.md](./docs/desktop-support.md)**。

**版本 10.6.1（2026-10-06）**：Mirage 皮肤系统重设计轮 + **评审整改收口**（同版内的两件事：先是 8 套预设从手调 hex 迁到 OKLCH 设计系统解算生成，随后按发布前评审的 15 条 issue #70–#84 逐条整改）。皮肤由每套四个设计意图生成、每个 token 可证明；**每套预设自带一份调好的默认参数**（弥散光浓度/模糊、侧栏与输入框透明度、弹窗透明度、玻璃材质），换肤会重调你**没亲手改过**的那些值，你调过的一律不动。

**这一轮真正修掉的三个"看得见的"问题**：① 新装的弹窗透明度种子从 `0.6` 改成 `0.92`（**行为变更，显式声明**）——`0.6` 的对话框会让身后的会话读穿，这正是 issue #67 的观感来源；动过该滑杆的老用户完全不受影响。② 液态玻璃的描边/掠光此前是写死的白色，只为一个亮暗档作过者：白描边压在浅色画布上对比度约 1.03:1（等于消失），现在亮暗两档各有一套、并挂在本插件**自己的** scheme 属性上（此前押宿主 `body[data-ds-dark-theme]`，宿主 dispose 会擦掉它）。③ 随包分发的预览 PNG 已移出 npm 包：tarball **2.5 MB → 263.4 kB**（图片改由 GitHub raw 提供，代价是它跟 `main` 而非冻结版本，已写明）。

回归门 **346/346**（10.6.0 为 172 项；10.6.1 发版时为 302，本轮 rc.2 / alpha.1 整改追加 **+44**：四个新门文件 38 项——`host.slots` 9、`hashes` 11、`desktop.claims` 6、`desktop.fontscale` 12，另扩充两个既有文件 +6 项——`package.host_compat` 4→8、`skin.quality` 40→42；10.6.1 那批九个门文件 111 项——skin.quality 40、craft.quality 19、docs.numbers 9、color.science 9、previews 9、repo.hygiene 5、generator.safety 3、compat.window.docs 5、host.gap 12——与其余 19 项既有文件整改用例仍在其中；该数字由 `tests/docs.numbers.test.cjs` 现场加载整套件数出并核对文档，不是手抄）；质量审计 **226/226**（217 调色 + 9 工艺，同一份门现场计算并核对 10 份文档，改错一个数字就翻红）。**归零的写入放大**：`saveFactorySnapshot()` 原先序列化整张 provenance 表却按被播种的键各调一次，一次换肤把同一个存储键重写 7 次——现在批内合并，`localStorage.setItem` **19 → 13**、单键重写 **7 → 1**，并有双采样写入预算门（任一处放大即红）。评审给的「3 publish / 111 笔」「publish 2→3」「5→19」不是矛盾，是**三个不同计数器**，现已逐个声明、分别计量、各有上限。**未验证**：本版之后未再上真机复测写入计数（真机口径仍是 10.5.1 那次）；预览图为生成渲染而非真机截图；主题包**不含**皮肤自带的弥散光与调好的滑杆值（载荷是白名单式的 40 枚 token，属 schema v2 议题，已在 `docs/themes-spec.md` 声明）。完整诚实清单见 **[docs/desktop-support.md](./docs/desktop-support.md)**。

**版本 10.6.0（2026-10-06）**：右侧栏对齐轮（外部 PR #65，@Waser750 报告并提案；本版评审走 PR 复核轮——四条阻塞 + 合并前维护方独立跑 5 处变异抽查，**未另起三方对抗评审**，依据如实写明）。

**三处"右侧栏和左边不一样"一起修掉**：① 宿主把 docked 面板画在会被壁纸洗成半透明的画布色上，「侧边栏透明度」滑杆此前对右栏完全没有通路（拉多少都透）——现在两条 dockkit 面改由 `--dsw-specific-sidebar-fill` 上色，与左栏、标题条同 token 同滑杆，并**限定在 `[data-sidebar-right-panel]` 之内**（dockkit 是宿主共享组件，别的列不该继承这层底色）；② 右栏**全屏**时对话从面板背后透出来（画布水洗半透明），现在水洗在时该面取皮肤的不透明基色，实测计算底色 `rgb(18, 16, 26)`——完全遮住；如实写明取舍：全屏态不透明是硬性质，侧栏滑杆在全屏面板内因此不再可达；③ 鼠标划过「文件」胶囊会**失去**底色（宿主那条 `:hover` 是替换），而隔壁「新建终端」是叠加——同一枚 token 两种行为；现在保留底色、把 hover tint 叠上去，并用 `:not([data-sidebar-right-guide-entry=terminal])` 排除终端胶囊（它已自己叠色，再一层等于双重半透明）。三条全部挂宿主稳定 data 属性，不碰构建哈希类名；真机命中面实测 `files` / `dsh-context` 被覆盖、`terminal` 被排除。

回归门 **172/172**（10.5.1 为 169 项，本版 +3）；**5 处变异抽查全部翻在指定断言原文上**（终端胶囊排除、右栏作用域、水洗门塞进规则①——正是评审抓出的那条"恒真守卫"的反例形式、全屏分支丢门、水洗标记撤回），另有贡献者侧 6 处反向验证。**实机复核（本机 dsh `0.2.0-rc.1`，机读、非像素目视）**：状态 ready、注入表内三条规则各自真命中活元素、样式注入仍幂等（material ×1、nav-icon ×1）、10.5.1 的通路同时可见（`--dsw-alias-bg-layer-2 = rgba(30,27,44,0.5)` 随滑杆）。**未验证**：非全屏（push）态下规则①随滑杆变化未切换实测、真 `:hover` 行为态无法从 JS 触发、`dsh-better-sidebar` 未装本机（该语境的观感以贡献者实测为准）。完整锚点依赖清单与诚实清单见 **[docs/desktop-support.md](./docs/desktop-support.md)**。

**版本 10.5.1（2026-10-06）**：滑杆兑现轮（issue #67 + PR #68，@ltmroberthk915 报告并提案；本版经蓝军→第三方→中立裁定三轮对抗评审——同一模型分角色，非独立第三方，三个角色均由子代理分别担任；评审记录是内部攻防材料，不随仓库发布，公开文档里也没有指向它的链接）。

**弹窗透明度滑杆现在真正驱动对话框**（issue #67）：宿主把设置对话框等面画在第三枚语义 token `--dsw-alias-bg-layer-2` 上，而此前滑杆只覆盖 `--dsw-alias-bg-overlay` / `--dsw-specific-menu`——把滑杆拉到任何值，对话框背景都保持皮肤设计 alpha（内置深色皮肤 0.85）不变，报告者据此判定"滑杆没作用"。现在三枚 token 同层覆盖：滑杆显示值 = 实际 alpha 值（0% 全透 ↔ 100% 全遮），layer-2 保留皮肤自身色相、仅 alpha 随滑杆；换肤时在守卫下延后重解析（`overrideTokens` 无守卫 emit 有过实机死循环史），离线回归门按仓库准入规则双采样钉住收敛。**行为变更（显式声明）**：该滑杆的默认落点 **0.94**（未存过该键时的 JS 回退）/ **0.6**（出厂种子）现在同时决定**由 layer-2 绘制的所有面**的背景不透明度——没动过滑杆的用户，对话框背景默认观感会从皮肤设计值（0.85（五个深色）/ 1.0（两个 hex）/ 0.6（一个浅色））变为 0.94 / 0.6。这是修复的必然语义（"滑杆显示值 = token 实际值"红线），不存在"未动滑杆就不生效"的合法实现；本版决策保留 0.94 / 0.6（0.6 是出厂观感、0.94 不改动 existing；该键同时驱动卡片 / 菜单全部弹窗面，单调它必连带改观感，分面默认值另立议题）。pack 皮肤的契约同时写明：滑杆只对 `#hex` 与逗号分隔 `rgb()/rgba()` 形态保留皮肤色相，其余合法形态（hsl/hsla、空格分隔、百分号分量等）在弹窗面上回落 scheme 基础色——滑杆仍全程有效，仅色相不取自皮肤（契约见 [docs/themes-spec.md](./docs/themes-spec.md) 颜色校验节）。

**liquid 材质的输入框在最实端真正不透明**（issue #67 同轮）：此前 CSS 端把填充权重再乘一次填充率，liquid 把输入框"透明度"滑杆拉到最实端仍有 15% 透明残留。现在权重在 JS 侧按材质重映射：liquid 透明端 15% 地板 → 实端 100%（`::before` 计算色完全无 alpha 分量）；frosted 恒等；CSS 乘法删除，报废变量 `GLASS_FILL_SCALE_VAR` 随之移除。liquid 的 tint 从固定中性白改为皮肤自身基色；厚度仍按原始权重（0→0px、1→24px）。

回归门 **169/169**（159 → +10：PR 净 +2、维护修订 +2、裁定整改 R1–R6 六条）；**15 处变异全部翻红**，其中六条（两处 `_applyingWallpaper` 回调守卫、dispose 的 `clearTimeout`、layer-2 的 scheme 门、0.94/0.6 两个默认值）先在**已发运套件**上实测六次全绿（盲区由裁定方与整改方两座隔离副本分别复跑证实），补门后全部翻红——"无门→有门"两侧证据齐备。**实机复核（本机 dsh `0.2.0-rc.1`，机读，非像素目视）**：换肤每次恰好 3 次 publish（=111 笔 token 写入），+500ms/+2500ms/+7000ms/+10500ms 四采样恒 111（无重建风暴）；弹窗两态 alpha 0.94 → `rgba(30,27,44,0.94)`、0.6 → `rgba(30,27,44,0.6)`；composer liquid 实端 100% 且无 alpha 分量、透明端 15% 地板。**未验证**：两态与观感为机读复核而非像素目视；layer-2 全部消费面未逐一枚举（写"由 layer-2 绘制的面"而非"设置对话框"）；hsl pack 的回落观感未在真机验证。完整诚实清单见 **[docs/desktop-support.md](./docs/desktop-support.md)**。

**版本 10.5.0（2026-10-05）**：可读性与幂等轮（本版经蓝军→第三方→中立裁定三轮对抗评审——同一模型分角色，非独立第三方，裁定轮由整改方同一 agent 串行、独立性已降级；评审记录是内部攻防材料，不随仓库发布，公开文档里也没有指向它的链接）。

**三张卡片不再依赖构建哈希类名**（issue #50 的锚点纪律）：提问 / 审批 / 计划评审卡的可读性填充改挂宿主自己为这些面发布的**稳定戳**——提问卡 `[data-question-key] [aria-labelledby^="question-"]`（**两半同时命中**，所以这条选择器永远不会收养一个无关的带 label 元素；遗留 `.Mbwy4a_card` 只作 OR 兜底保留）、审批卡 `[data-approval-key] > div`、计划评审卡 `[data-plan-review-key] > section`。其中审批卡与计划卡**此前根本没有规则**：无论换哪套皮肤、把弹窗滑杆拉到多少，它们一直是宿主的中性灰。

**卡片填充的 alpha 不再复合**：新增不透明基色令牌 `--dsh-dream-skin-modal-base`（当前皮肤的 base，**不带 alpha**）作为 `color-mix()` 的填充来源，替代被壁纸洗过的 `--dsw-alias-bg-base`（后者 = `rgba(base, canvasAlpha)`）。旧写法把两层 alpha 乘在一起（填充率 = 壁纸不透明度 × 弹窗不透明度），实机读到的正是这件事：壁纸 40% + 弹窗 50% 时卡片实际 alpha 只有 0.4×0.5=0.2，于是「弹窗不透明度 100%」仍然透出对话、浅色皮肤配深色壁纸时整片读不出来。修复后同一页的卡片 alpha **恰等于弹窗权重**（0.5）。composer 一侧的同族问题此前已由 `--dsh-dream-skin-composer-base` 修掉，本版把卡片纳入同一口径。

**`<style>` 注入幂等**（同一次页面生命周期里 bundle 被重复求值）：材质表按 id 命中时改为 **STYLE 节点限定 + 移回 `<head>` 末尾**（是 MOVE 不是重复插入；冒用我们 id 的外来节点既不会被重写 `textContent`，也不会在卸载时被 `remove()` 带走），导航图标表的查找从 `#id` 收紧为 `style#id`。导航钩子的**所有权锁**从"装钩之前声明 / 活在节点上"改为**页面级 `armed` 位、观察者真的装上之后才置位**——旧写法会造成两种静默失效：sheet 节点被替换后第二份 bundle 叠出第二个 `MutationObserver`（自报字段仍读 1，看不见），以及在 `<body>` 尚未解析时跑完的那一份宣称接管却什么都没挂，图标整场不替换而报表和"设置面板没开"一模一样。`<body>` 缺失时现在挂一次性 `DOMContentLoaded` 补装。钩子随纤维卸载完整拆除（观察者断开、标记清除、表移除），同页重挂自动复臂；拆除带 generation 令牌，迟到的旧卸载不会误杀接棒的新代。

**导航图标自检上报**：新增 `window.__DSH_DREAM_SKIN_NAV__`（`{sheets, dialogs, buttons, marked, armed, checkedAt}`），并由诊断快照的 `navIcon` 字段转发。`armed` 是「这套宿主没有可钩的 nav」与「设置面板只是没开」之间唯一能区分的依据——单看计数两者都是 0。快照里的 `navIcon` 是**最后一次状态发布的镜像**，实时值请读那个全局（文档已按此声明）。采样除 rAF 合帧外**另加一次性 120ms 定时器**：Chromium 对隐藏或被完全遮挡的窗口不发帧，没有它，图标标记与自上报会冻结在最后一帧的状态（真机在 `visibilityState=hidden` 下实测这条兜底是承重的）。它**不是**周期性复检——DOM 零变更的页面不会再被唤醒，`checkedAt` 会合理地变旧。

**导航图标不再认领别人插件的那一行**（实机发现）：匹配式从「label 等于 `皮肤`，或含 `Theme`」收紧为**只含 `Theme`**。`Theme / 外观` 是本插件自己注册的 section label（代码里声明的字符串），而裸「皮肤」在实机属于**另一个已装插件**（`@linxin666/dsh-client-ui-skin-center`）——旧匹配把我们的调色板图标涂到了它的导航行，还隐藏了它的原 `<svg>`。纯装饰、可逆，但属越界改动他人 UI。代价如实写明：若未来宿主把我们那一行渲染成不含 "Theme" 的字样，图标退回齿轮（装饰损失，自检会上报 `marked:0 && armed:1`），而不是去抢别人的行。

**漂移探针把「宿主 CSS 仍在、面未挂载」与真漂移分栏**：`anchors` 新增 `notMounted` 字段——本机实测 6 组里 3 组哈希确认换代（真漂移）、1 组（`lXshSW_*`）宿主 CSS 仍在只是面未挂载，此前两类混在同一个 `drifted` 字段里齐声告警。分类器只读宿主自己发布的 `style[data-plugin-css]` 表；`<link>` 形态的模块 CSS 不在读法内（零网络不变式优先，列为已知边界）。晚修正观察者对两个池子做同一条单向撤回。

**漂移探针告警声明自己的覆盖边界**：那句 `console.warn` 现在写明「本清单即探针覆盖的全部；按需挂载的提问 / 审批 / 计划卡填充**不在**其中，那三条锚点仍需人工核对」。此前那句 "harmless, cosmetic only" 只对**被探针覆盖的**装饰组成立，读者会把它当成对整个精修层的结论。

回归门 **159/159**（9.29.0 为 122 项，本版 +37）；`node --check lib/index.js lib/client.js` 与 `npm run typecheck`（tsc 5.6.3）同门通过。本轮 **26 处变异验证全部翻红**（隔离副本树实测、逐条打印翻红断言原文；其中 M16 就是把 `皮肤` 分支加回去——第三方行被标记的那条断言即翻红）。测试台自身也修好了两处"看不见"：`makeEl()` 的 `appendChild/append/prepend/insertBefore` 此前既不维护 children 顺序也没有移动语义，"收养是 MOVE 而不是重复插入"那条断言**不可能失败**；导航幂等用例还需 mock 同时应答 `style#id` 与裸 `#id` 两种查找，否则"去掉 `style#` 限定"（M7）在假 DOM 里毫无后果。**另按 finding 记录一次工具链翻车**：早先的变异 harness 从一份**旧备份**恢复 `lib/client.js`，把已应用的一半修复静默回退了，而当时那轮"全红"正是在被回退的文件上跑出来的；现在它进入时对**当前活动文件**做快照、退出钩子还原。检查器自己也要有能失败的证据，否则它会把破坏当成通过。

**实机复核（本机 dsh `0.2.0-rc.1`，link 安装即工作树；内置浏览器机读，非像素目视）**：`build:"10.5.0"` / `status:"ready"`；三类卡片按宿主源码形状合成锚点后读到 `color(srgb … / 0.5)` + `blur(5px) saturate(1.6) brightness(1.08)`，无 `color-mix()` 的兜底行解析到**不透明基色**；`style[id^="dsh-dream-skin"]` 各 1 份；设置弹窗 15 行 nav button 中**仅** `Theme / 外观` 带标记，第三方「皮肤」行的 `<svg>` 计算样式回到 `display:block`（导航表的隐藏规则本就是标记作用域的，取消标记即自动恢复）；120ms 兜底在隐藏页把 `checkedAt` 推进并把计数归零（rAF 不发帧，只能来自定时器）。**发布前宿主兼容预检**用宿主自己的 `evaluatePluginCompatibility()` 跑三态：当前 manifest 在 `0.2.0-rc.1` 放行（六个 peer 全落，不依赖豁免表）、把 peer 退回 9.27.1 的 `^0.1.0-rc.6` **必须翻红**（`{peers:6, exempted:false}`，证明这条检查能失败）、runtime `0.3.0` 仍被有意挡在窗口外。

**本周期早先写下的诊断被本版推翻，证伪记录保留在代码注释里**：「提问卡的构建哈希被重洗，且宿主 `--dsw-specific-input-major` 是 8% alpha，所以对话从卡片透出」——安装到本机的宿主 bundle 实测：`dsh-client-ui-user-questions` 仍导出 `"card": "Mbwy4a_card"`（哈希**没有**重洗），`LVzXQa_card` 属同包另一组件 `PlanReviewPanel`，而 `--dsw-specific-input-major` 亮/暗两处定义都是**不透明 hex**。真实机制是上面「三张卡的去哈希」与「alpha 复合」两条。**另有两处过度陈述按实测降级**：「材质表移回 `<head>` 末尾」不是一条层叠保证，它是**重挂那一刻**的位次（实测我方材质表落在 `document.head.children` 的 index 131 / 共 217，其后仍跟着 85 个节点，多数是 `<style>`——宿主在插件挂载之后持续注入样式；精修能站住靠的是特异度，不是位置）；「弹窗填充权重取自出厂滑杆」是既有 `FACTORY_DEFAULTS` 行为，本 diff 对它没有任何实现改动，只新增了钉住它的测试。

**未验证 / 有意推迟**：真实对话里发起一次提问 / 审批的完整路径未跑（合成锚点已验，会话态未造）；空闲页没有任何周期性复检（为装饰功能买常驻定时器不值，判据是 `armed` + `checkedAt`）；`sync()` 每次做 3 次全文档查询未降频（未实测卡顿即不构成必修，且这条链只在设置弹窗打开时有命中对象）；像素目视、其它 7 套皮肤下的观感、浅色皮肤 + 深色壁纸组合的对比度仍未做。完整锚点依赖清单与已验证 / 未验证清单见 **[docs/desktop-support.md](./docs/desktop-support.md)**。

**版本 9.29.0（2026-09-29）**：宿主换代兼容 + 壁纸填充方式轮（issue #62 / #61）——**DSH `0.2.0-rc.1` 起宿主新增 peer 兼容闸门**：boot 阶段用 `semver.satisfies(宿主运行时版本, peer 范围, { includePrerelease: true })` 逐个校验 `@deepseek-ai/dsh*` peer，任一不满足即**整包跳过该插件**（客户端不注入、宿主接口不启、只在日志留一行），因此原先以 `^0.1.0-rc.6` 对齐的 peer 声明在 0.2.x 上会把插件整体判死（issue #62 的「换肤全部消失、设置项也不出现」）；本版把六个 `dsh-client-*` peer 收敛为 `>=0.1.0-rc.6 <0.3.0-0`，并新增**离线兼容门**：判定表由 0.2.0-rc.1 真实的 `evaluatePluginCompatibility()` 对修复前/修复后两份 manifest 各跑一遍生成（独立数据源反算，不让测试自己证明自己的范围），门内含「0.2.x 必须翻红、0.3.x 必须仍拒」的双向用例；`package.json` 与 `package-lock.json` 的 peer/`peerDependenciesMeta` 改为 deepEqual 强一致（上一版两处漂移就是靠肉眼发现的）。**壁纸填充方式**（issue #61：壁纸层写死 `background-size:cover`，非 16:9 图必被裁）：本地图与图片 URL 新增「裁剪填满 / 完整显示 / 模糊填充」三档，模糊填充在完整显示的同图背后压一层放大 1.2 倍、额外 48px 模糊的同图溢出层，让两侧留白读成光晕而非硬边空带；渐变无固有宽高比故忽略该档，值在**写入门与渲染门两道白名单**后才进 CSSOM（手改状态文件也塞不进声明）。issue #61 第二条观察同时修掉：手动「应用链接」此前渲染出的 CSS 与上一次逐字节相同，浏览器直接回缓存 → 刚换日的必应每日图看起来「点了没反应」；现在 `lastFiredAt` 语义收敛为「这张图最近一次（重）拉取的时刻」，渲染层**有戳即 bust**（不再只在定时开启时），手动应用会带上新的 13 位毫秒戳、同步重排定时相位，且预加载探针校验的 URL 与实际渲染逐字节一致。回归门 **122/122**，本轮 15 次变异验证全部翻红（其中「手动应用不重拉」的**时序**缺陷正是新用例先把实现打回原形才被查出：戳写在渲染之后，点了仍不刷新）。同轮补测还收掉一处残留分支：空着的链接框点「应用链接」过去会重写壁纸档位并把**壁纸跟随主题**静默置关，现在改为彻底无操作。**实机复核（本机 `0.2.0-rc.1`）**：宿主 profile 载入 19/19 不跳过、诊断快照读到 `build:"9.29.0"` / `ready`、设置项齐全、填充方式三档点选后计算样式与落库值同步（模糊填充的溢出层确实压在图片层之前、`blur(51px)`=用户 3px+48px），渐变档下填充方式整行消失——详见 `docs/desktop-support.md` 的实机复核条目（机读复核，非像素目视）。

**版本 9.27.0（2026-09-27）**：外部评审整改轮（`docs/review-findings-9.26.x.md` 8 条全采纳；发版前评审方**第二轮复核**确认 8/8 真落地，另报 6 条新问题 `docs/review-findings-9.27.0-round2.md`，同样全采纳、当日收进本版；**第三轮复核**（`docs/review-findings-9.27.0-round3.md`）确认 6/6 真落地、另报 3 条轻微项 + 1 条数字口径（S-1 归因失实 / S-2 发版说明里的陈旧符号 / S-3 晚修正观察者未随卸载 teardown / 向量表 13→14），4/4 采纳、仍收进同一版；**第四轮复核**（`docs/review-findings-9.27.0-round4.md`）确认 4/4 真落地并**主动否决了评审方自己第三轮给出的那条判据**，另报 T-1（"卸载不留残留"当时只做了一半：观察者断了，**漂移阶梯自己的 setTimeout 没被取消**，卸载后仍会用新的 `checkedAt` 重发布快照）与 T-2（单一持有句柄是实例级而非页面级，只需注释如实），2/2 采纳、仍收进同一版；逐条回应见本地档案（与 9.26.1 的 `docs/review/` 同例，不进版本库）`docs/review-findings-response-9.26.x.md`、`…-response-9.27.0-round2.md`、`…-response-9.27.0-round3.md` 与 `…-response-9.27.0-round4.md`）——**漂移探针三态化**：机读快照新增 `anchors.pending`，"宿主 UI 未挂载"不再被误报成"类名漂移"（有界重试阶梯 + 宿主活跃度哨兵 + 每组命中记忆；`drifted:[] && pending:false` 是唯一正向信号），终局后晚挂载的面另由**晚修正观察者单向撤回**误报；**渐变守卫先规范化再判定**（CSS 转义 `\75 rl(` / 注释走私在写入门即被解码识破；第二轮实测发现 `\a` 换行转义此前被"插入"而非"删除"、仍是走私面，已按 CSS 续行语义改为删除并补解码后控制字符第二道门），`-webkit-` 前缀变体策略性拒绝并测试钉死，渲染层忽略危险值时改为**可见告警**（封顶改 FIFO 淘汰，第 21 个危险值不再静默消失）；ready 快照补齐 `reason/lastError` 并新增逐键 schema 守卫（文档承诺首次有执行检查背书）；`status:"ready"` 改为 apply 尾部签署（中途失败前为 `applying`）；壁纸迁移的"出厂写永不推送"唯一受控例外显式标注；宿主 `ok:false` 拒绝出口补齐延迟播种（三个"无可用答案"出口语义一致，真机首装不再可能永久无壁纸）；探针阶梯常量更名 `DRIFT_RETRY_DELAYS_MS`（数组是相对间隔，终局实际约 4.3 秒，文档同步纠正，消费方可据 `checkedAt` 判新鲜度）。回归门 **95/95**，四轮 27 次变异验证全部翻红（其中"永远绿"的用例事故三次都是被变异验证抓出来的）；"每条用例必须能通过变异验证 + 状态机用例须断言中间态与终态双采样"已升级为 `CONTRIBUTING.md` 仓库级测试准入规则，第三轮又补进三条同源细则：**报告里"变异 X 由断言 Y 翻红"的归因陈述要与用例同等受审**（评审方与我们各有一处错误归因被这样查出），**"语义翻转后行为不可观测"等于没有钉住**（R-4 的更名当时就缺一条行为钉，第三轮补上）、**"死分支恒绿"该删的是代码不是补断言**；本轮还给自己补了一道文本门（`text hygiene`：对外文本禁 C0 控制字节——写文档时转义示例被降级成它所指的真实控制字节，含 NUL 的文件会被 git 判为二进制、diff 长成整文件重写），该门写完 30 秒内就抓到了一次同类复发。S-3 的修法未照评审方建议的判据实现——把该判据当变异跑了一遍，采用它会让 3 条用例翻红（等于把 R-2 的修复整个关掉），改用模块级单一持有句柄，反证记录在 round-3 回应报告 §3（评审方第四轮已独立核对代码并**收回该建议**）。第四轮 T-1 补上"卸载不留残留"漏掉的另一半：阶梯定时器与晚修正观察者同归 `teardownMaterial()` 处置，并在 `step()` 入口加一道门槛管住"定时器已开跑、同一 tick 被卸载"那种取消不到的情形——取消与门槛**各有只属于自己的变异红**（不是互为冗余的两道门）。该缺陷之所以前三轮 92 条用例全测不到：S-3 的用例跑在被压缩的测试时钟上，卸载恰好落在阶梯终局**之后**，那一刻已无在飞的阶梯定时器——**测试时钟把真机的 4.3 秒窗口藏了起来**，这一类漏检已升为 `CONTRIBUTING.md` 准入规则死法清单的第五种。

**版本 9.26.1（2026-09-26）**：三方对抗评审整改轮——诊断快照跟随宿主采纳刷新、degraded 快照字段集与 ready 对齐；出厂壁纸迁移改为按 host 探针落定分支（落定前 provisional 不复活用户已清空的壁纸，落定后以用户态推送、把宿主状态文件里的旧图一并收敛）；宿主采纳路径补渐变/URL 注入守卫（写入+渲染+采纳三道把关）；漂移探针机读输出改合法原始选择器、桌面壳下计数修正；旧真人照片截图移出 npm 发布包、兼容矩阵进包；新增 8 个回归用例并全部经变异验证（反向破坏每处修复均有用例翻红）。回归门 **77/77**。

**版本 9.26.0（2026-09-26）**：官方桌面版支持轮——新增**机读诊断通道** `window.__DSH_DREAM_SKIN_STATUS__`（ready/degraded + 锚点漂移快照，纯只读、零网络、零持久化改动），发布 **[docs/desktop-support.md](./docs/desktop-support.md)** 兼容支持矩阵（锚点依赖清单/安全边界/已验证-未验证诚实清单），CI 首次编译校验 `.d.ts`；渐变壁纸新增资源拉取函数注入拒绝（写入+渲染双层）；**出厂壁纸换为原创抽象弥散光图**（7.0KB，bundle -26%），仍用旧出厂图的用户由内容三重指纹精确匹配一次性迁移（自设壁纸不受影响）。回归门 **69/69**。

**版本 9.16.0（2026-09-16）**：DSH Desktop 侧边栏透明度修复（issue #55，经蓝军→第三方→中立裁定三方评审整改）——桌面壳在自己的 `<aside class="dshDesktopSidebarSurface">` 上就近声明 `--dsw-specific-sidebar-fill`，遮蔽主题覆盖值，侧边栏透明度滑杆在桌面端无视觉通路（右侧文件面板不受影响，故左右不一致）；现让该子树重新继承（`inherit !important`，原生 Web 不匹配任何元素）。同时：拖动侧边栏透明度滑杆会释放「跟随壁纸」（仅在有壁纸 wash 时），两处默认值收敛到单点真源，桌面端规则纳入以宿主信号为锚点的漂移探针。回归门 **65/65**。

**版本 9.15.3（2026-09-16，未发布）**：该版本未发布，条目已作废——见 CHANGELOG 中的更正说明（上游行为描述失实、版本号违反日期式规则）。

**版本 9.15.2（2026-09-15）**：动态端口桌面壳壁纸闪烁修复（issue #51）——Electron 壳每次启动换端口 → origin 变化 → localStorage 恒空 → 每次启动被判「首次安装」，出厂壁纸闪一帧后被 host 配置覆盖。现壁纸项延后到 host 探针落定再播种：host 有壁纸决定（含用户清空）则不出厂壁纸，真首装/host 不可达照常播种（只晚几百毫秒）。回归门 **63/63**。

**版本 9.15.1（2026-09-15）**：对抗审查整改版——对 issue #50 三轮修复做蓝军→第三方→裁定完整评审后加固：锚点排除弹窗内编辑框（防误标上漆）、选项卡防透底与玻璃规则冲突消除、百分比圆角误判修正 + 宽度守卫、标记器轮询/observer 生命周期清理、流式输出期不再高频重扫、漂移探针去自家属性污染；新增**行为级**回归用例（假 DOM 驱动真实标记器）。回归门 **60/60**。

**版本 9.15.0（2026-09-15）**：composer 标记器换锚点（issue #50 第三轮，彻底修复）——0.1.5-rc.2 的聊天输入框实为 Lexical contenteditable（非 textarea），旧锚点永远落空；现以稳定指纹 `data-composer-input` 为主锚点、textarea/contenteditable 三级兜底。回归门 **59/59**。

**版本 9.14.2（2026-09-14）**：npm 元数据版（无代码变更）——description 双语化、keywords 9→15（含 `dsh-desktop`），提升 npm 搜索与插件目录可发现性。

**版本 9.14.1（2026-09-14）**：DSH Desktop（第三方桌面端）适配——composer 标记器自愈化：启动轮询直到首次标记成功、observer 改挂 `documentElement`、标记所有可见输入框、圆角阈值两段放宽。修复桌面端「输入框透明度」滑杆仍失效的问题（issue #50 续报）。回归门 **59/59**。

**版本 9.14.0（2026-09-14）**：修复 dsh 0.1.5+ 上「输入框透明度」滑杆失效（issue #50）——宿主发版重掷了插件引用的哈希类名，玻璃规则全部落空；现改用 DOM 形态标记（自有属性 `data-dsh-dream-skin-composer`）+ 双选择器，新旧宿主通吃，不再赌类名。README 同步重构（预览合一、真实竞品对比、Roadmap 刷新，7 语言全量同步）。回归门 **59/59**。

**版本 9.13.1（2026-09-14）**：发布后二次复查修复版。修复 2 个低概率高危害的持久化缺陷（均需宿主通道慢/挂起才触发）：宿主探测超时未覆盖响应体解析导致推送门可能永久关闭；推送补丁可能以 null **擦除**宿主的强调色/皮肤包/收藏等持久配置。另顺手修正壁纸历史缩略图转义等 3 处小问题。回归门 **59/59**。

**版本 9.13.0（2026-09-13）**：**玻璃材质系统**发布——毛玻璃/液态玻璃双材质一键切换（纯样式选择，不动任何滑杆数值）、composer 输入框独立透明度、**开箱即用的出厂配置**（星云皮肤 + 内置壁纸 + 调好的玻璃数值）。发布前经三方对抗评审闭环，修掉全部评审发现——最关键的一条：出厂配置在桌面端重启场景下可能反向覆写宿主持久文件、销毁用户配置（现已结构性杜绝：出厂写永不推送宿主 + 持久溯源快照）。同时出厂不再默认开启第三方 API 定时轮询（必应壁纸定时更新改为显式开启）。回归门 **50/50**。

**版本 9.10.0（2026-09-10）**：三方评审（蓝军 → 第三方独立复核 → 蓝军采纳裁定）闭环版。修复第三方复核发现的 3 处整改缺陷——带 `#fragment` 的链接上定时刷新静默失效、被拒开关仍落盘、清壁纸后新壁纸继承旧刷新相位；并补上**皮肤 id 撞名让位**加固（第三方主题插件先注册同名主题时不再让 `apply()` 抛错）。回归门 **44/44**。

**版本 9.9.0（2026-09-09）**：显著加固了「宿主升级绝不报错」的保障（平台模块全量降级兜底）；高级壁纸「图片链接」新增可选的**定时自动更新**（按周期刷新，必应每日壁纸等自动滚动，支持关机重开后的补触发）；修复定时刷新 UI 与空输入误清壁纸等问题。详见 [CHANGELOG](CHANGELOG.md)。

</details>

---

<details>
<summary><b>⚙️ 工作原理 / 💼 持久化说明 / 🛠️ 开发、扩展主题（点开查看）</b></summary>

## ⚙️ 工作原理

DSH 的主题系统是 token 化的：web 外壳内置 `--dsw-*` 设计令牌，`ThemeRuntime` 允许第三方插件注册主题去
覆盖别名层（`--dsw-alias-*`）。本插件是标准的「双面」插件：

```text
                ┌─────────────────────────────────────────────┐
                │            dsh-dream-skin (双面插件)          │
                ├────────────────────────────┬────────────────┤
    Host 半边   │  lib/index.js              │  浏览器半边      │
                │  cordis.patch.yml 插入      │  lib/client.js │
                │  dream-skin loader 入口     │  __ModuleLoader__│
                └────────────────────────────┴────────────────┘
                             │                         │
                        profile 树加载              /plugins/dsh-dream-skin/client.js
                                                         │
        ┌────────────────────────────────┬────────────────┐
        │                                │                │
   ctx.theme.register(8套皮肤)      ctx.theme.overrideTokens(壁纸半透明)   ctx.slots.inject('settings.section' + 'settings.dreamSkin.item')
```

- **Host 半边**（`lib/index.js`）：`dsh.bundle` patch 层，插入 `dream-skin` loader 入口；`apply` 为空操作，
  与官方 `ui-*` 包同构。
- **浏览器半边**（`lib/client.js`）：
  1. `ctx.theme.register(...)` 注册 8 套皮肤；
  2. 恢复上次保存的皮肤并 `ctx.theme.setTheme(...)` 应用；
  3. 壁纸渲染为 `z-index:-1` 固定背景层（「模糊填充」档在其后再插一层同图放大溢出层，靠 DOM
     树顺序而非 z-index 压在图片层之下），叠加 `ctx.theme.overrideTokens(...)` 让主画布
     （`--dsw-alias-bg-base`）与侧边栏（`--dsw-specific-sidebar-fill`）半透明；
  4. 监听 `theme/change`，切皮肤 / 深浅色时自动重新着色壁纸洗色层；
  5. 注册独立的 **设置 → 外观 / Theme** 分节（`settings.section`），5 个功能行挂在
     `settings.dreamSkin.item` 插槽下。

每套皮肤携带自己的 `colorScheme`（`light`/`dark`）；本插件把它打在自己的根元素 `<html>` 上
（`data-dsh-dream-skin-scheme`），**不**押宿主的 `body[data-ds-dark-theme]`——那个属性归 ui-layout 的
ThemePresenter 所有，宿主 `dispose()` 会把它擦掉，于是"属性缺席"的窗口里暗色皮肤会拿到亮档常量。
别名 token 覆盖作为 `<body>` 内联自定义属性由 ui-layout 的 ThemePresenter 应用。

## 💼 持久化说明

- **三层**：内存缓存（保证首帧正确）→ 浏览器 `localStorage`（键前缀 `dsh-dream-skin:`，同 origin 快速恢复）→
  **宿主文件** `$DSH_HOME/dream-skin.json`（经本插件自建的回环 `/dream-skin/api` 读写，见 `lib/index.js` 之
  `statePath()` / `readState()` / `writeState()`）。
- **为什么桌面端必须有第三层**：DSH Desktop 每次启动由 OS 分配端口 → 浏览器 origin 每次都变 → 只靠
  `localStorage` 会"失忆"。宿主文件层才是跨端口、跨重启的权威状态，所以**桌面版换端口或重启都不会丢皮肤与壁纸**。
- 为何不用 Host settings？DSH 的 Host settings 线路只向浏览器暴露一份白名单命名空间
  （`dsh-host-apiproxy` 的 `WEB_SETTINGS_NAMESPACES`），第三方命名空间会返回 `settings-not-exposed`；
  产品本身也把远程浏览器偏好进程化。上面那层宿主文件走的是**插件自己的回环 HTTP 接口**，不经过那条白名单，
  所以既拿到了文件持久化，也没有碰任何非官方通道。

---

## 🛠️ 开发 / 扩展主题

客户端 bundle 直接以 `__ModuleLoader__` 格式编写（即 tsdown 为官方 `ui-*` 包输出的形态），**免构建**。
`lib/client.js` 只能 `require` 模块表实体：平台种子词（`react`、`react/jsx-runtime`、…）与已注册客户端
bundle（`@deepseek-ai/dsh-client-runtime/client`、…）。

- **新增一套内置皮肤**：在 `lib/client.js` 的 `SKINS` 数组加一个对象（`id` + `colorScheme` + `tokens`），
  它即自动出现在设置里；记得在**全部 8 种语言词典**（`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`）补 `skin.<id>` 文案。
- **做一个主题包（推荐分发方式）**：参考 [`docs/examples/sample-theme-pack.json`](./docs/examples/sample-theme-pack.json)，
  一个 `*.dsh-theme.json` 即可在设置里导入或通过分享链接分发给别人，无需改代码。
- **放你自己的壁纸**：把图片丢进 [`wallpapers/`](./wallpapers/)（注意只在你有权限的前提下分发），再在
  DSH 的「背景图片」里导入即可。
- **更新预览图**：预览由 `scripts/generate-skin-mockups.cjs`（真实 token + 弥散光）生成 HTML mockup，
  用无头 Chrome 截图即得 `docs/previews/*.png`，改皮肤 token 后重跑即可保持预览与真实 skin 同步。`docs/previews/manifest.json` 把每张图钉在三重指纹上（发货 token、卡片版式、图片字节与像素尺寸），`npm run previews --check`（不需要浏览器）在「只改配色、没重照图」时翻红并点名是哪套皮肤；找不到无头浏览器时 `npm run previews` 非零退出，不再把 0 产出当成功。这些 PNG **不随包发布**：2.26 MB 的 README 装饰不该由每个使用者下载，`npm pack` 从 2.5 MB 降到 263 kB，README 里的预览图改指 GitHub 绝对地址。
- **跑校验**：`npm test`（VM 冒烟测试，覆盖 factory 求值、`apply` 挂载、主题包导入/持久化）。
- **换配色**：参考 `--dsw-alias-*` 令牌（完整契约见 [`docs/themes-spec.md`](./docs/themes-spec.md)）。

</details>

## 📌 Roadmap

> **这张表只列未完成项。** 已交付能力见上文「功能一览」与 [CHANGELOG](CHANGELOG.md)，不在两处留存量——双写必然漂移，本项目已经漂过一次。
> 每条必须带三样东西：**动机**（来自真实 issue 或实测数据，不写想象中的需求）、**规模**（S ≈ 一个晚上，M ≈ 一个功能版，L ≈ 需要先设计）、
> **验收判据**（一条**能失败**的检查，不是"做完就好"）。完成即从本表删除。「不做」区与待办同等重要——它替贡献者省掉白跑的一轮。

### A. 可靠性：宿主换代不再翻车

*动机：`0.2.0-rc.1` 实测 6 组宿主锚点漂 4 组——其中 3 组哈希确认换代（真漂移），1 组（含 `lXshSW_*`）宿主 CSS 仍在、只是面未挂载（10.5.0 起以 `notMounted` 与漂移分栏）；issue #62 用户侧表现为"皮肤一夜全消失"。*

- [ ] **M** 剩余装饰规则去哈希类名依赖（侧栏 / 文件面板改用自有 `data-dsh-dream-skin-*` 标记；composer 与 nav-icon 已证明这条路走得通）
      — 验收：**两道都过**——① 静态配对门 `tests/host.frosthooks.test.cjs` 为绿：每一条还押宿主构建哈希的规则，同一条选择器里必须带一个无哈希锚点，且该锚点要在两条渠道各自的发货字节里实测存在；② 运行时探针在 0.2.x 上给出 `drifted: [] && notMounted: [] && pending: false`。**10.13.0 把 `channelAbsent` 从判据里拿出来，只当事实读出**：一条每个缺席都能被「解释」满足的判据等于用散文当判据；换成静态门之后「把锚点摘掉」当场翻红，而哈希在某渠道缺席这件事仍然写在 `anchors` 里。**只读 `drifted` 一空仍不算达标**（10.8.0 的 `retired` 与 10.12.1 的 `channelAbsent` 都会把「已解释的缺席」移出 `drifted`）。判读口径见 `docs/desktop-support.md` 的「消费判读」
- [ ] **M** peer 窗口滚动到 `0.3.x` —— **阻塞在上游，不在我方**：截至 2026-10-10，registry 上 `@deepseek-ai/dsh` 的 `latest` 是 `0.2.0-rc.2`、版本列表止于 `0.2.1-alpha.2`，`0.3.x` 从未发布过（`npm view @deepseek-ai/dsh versions --json`）。没有可对齐的目标版本，这条既无法开工也无法验证；上文兼容性表里那条现行 peer 窗口已覆盖宿主至今发布过的**每一个**版本。
      — 验收：宿主真的放出 0.3.x 之后，先跑 `npm run host:preflight -- --profile-load`（那张兼容判定表与那次真实 profile 载入，如今正是这条命令的两半），通过才放宽；不放开就在文档写明"不支持"，绝不留静默跳过
- [ ] **S** 漂移探针盖不到「按需挂载」的功能面：提问卡 / 授权卡只在对话真的发起提问时才进 DOM，启动期的梯度采样必然把它们恒报为漂移，所以 10.5.0 有意把它们留在探针之外
      — 验收：一次真实提问后，`anchors` 能报出这两组功能锚点的命中 / 漏中，而刚打开的页面仍是 `drifted: []`

### B. 发布与安装通道

*动机：2026-09-29 官方桌面版 `0.2.0-rc.2` 上安装被拒；而维护机器是 `link:` 工作区安装——**这类问题在 link 安装下永远看不见**。*

- [ ] **M** 内网 / 离线分发路径文档化（Release tarball 机制已有，缺可照抄的步骤）｜PR-welcome

### C. 桌面版运维面

*动机：官方 Desktop 发布后开始出现"一个人管一批机器"的用户。这个画像目前真实接触点还少，所以先做便宜的两条，不一次铺满。*

- [ ] **M** 批量部署指南（profile 目录布局、`link:` 与 registry 安装的差别、`compatibility.json` 豁免键语义、动态端口）

### D. 产品体验

*动机：用户第一眼看得见的东西。但这两天收到的真实反馈（#61 / #62）全是可靠性而非体验问题，所以整组排在 A、B 之后。*

- [ ] **M** 首帧无闪烁（FOUC）：**先测**"首帧 → `apply()` 完成"的实际时间窗再决定做法，不测不动手
- [ ] **M** 社区主题库 —— **先定治理规则再写代码**。已核实主题包载荷不含任何图片字段（只有 token + 强调色 + 元信息），所以投稿天然不带图像版权风险，成本全在审核负担｜PR-welcome

### E. 不做 / 只接受 PR

- **在线色板 / 主题预览 Studio**：那是独立站点，不是插件能力，且与「社区主题库」作用重叠、更贵。
- **配置预置 / 策略下发**（管理员放一套默认皮肤，首启即生效；原 C 组占位，2026-10-10 判定后移入本节）：这条要动的是持久化的**写入优先级**——出厂种子现在必须让位于用户的 durable 文件（10.6.1 的 B1 门就是钉这个的），再加一层"管理员默认值"等于在一个刚被测试锁死的三态里塞第四个来源。而"一个人管一批机器"的画像目前还没有真实接触点，先不做；出现批量用户再重开。
- **任何注入式改宿主安装包 / 二进制的做法**：与"只走官方扩展点"的定位直接冲突，**永远不做**。

---

## 🤝 贡献

欢迎提交 Issue 与 PR！请先阅读 [贡献指南](./CONTRIBUTING.md)，并遵循 [Code of Conduct](./CODE_OF_CONDUCT.md)。

## ⭐ 支持这个项目

喜欢的话，给仓库点个 **Star ⭐**、在 npm 上点个 **👍**，或把它转发给你的 DSH 朋友——这会让更多人发现它，
也能激励持续维护。想一起做主题库 / 在线 Studio / 更多主题？欢迎来贡献。

## 🔒 安全

发现安全问题？请勿直接开公开 Issue——参见 [安全策略](./SECURITY.md)。

## 📄 开源协议

[MIT](./LICENSE)

## 🙏 致谢

- 架构与 API 参考：DeepSeek Harness 官方
  [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) 客户端包。
- 概念致敬：[Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)。

---

## 🧰 同作者的其他项目

- **[adversarial-review](https://github.com/RevolutionLA/adversarial-review)** —— 三方对抗式代码评审 Agent Skill。蓝军（敌意审查）→ 第三方（独立审计）→ 中立裁定，给 AI coding agent 的结构化对抗评审闭环。**写插件、发版前把关时特别有用。**
- **[AscendMate](https://github.com/RevolutionLA/AscendMate)** —— 昇腾智算服务器的环境搭建、模型微调、推理部署、算子开发手册。
- **[ascend-assistant](https://github.com/RevolutionLA/ascend-assistant)** —— 昇腾服务器助手 Agent Skill，与 AscendMate 深度联动。

---

## 📈 成长曲线

> 每天自动更新（GitHub Actions）。左轴：**累计下载量**（青色）；右轴：**Star 数**（紫色）——两个量级不同，因此使用独立的双纵轴。

<p align="center">
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/stats.png?v=3" alt="dsh-dream-skin 每日 Star × 累计下载量成长曲线" width="900"/>
</p>

*数据每 24 小时自动采集一次：下载量来自 [npm 官方 API](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin)，Star 来自 [GitHub API](https://github.com/RevolutionLA/dsh-dream-skin/stargazers)。*

