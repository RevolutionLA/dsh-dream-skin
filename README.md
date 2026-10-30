<p align="center">
  <strong>中文</strong> · <a href="https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/i18n/README.en.md">English</a> · <a href="https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/i18n/README.ja.md">日本語</a> · <a href="https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/i18n/README.ko.md">한국어</a> · <a href="https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/i18n/README.es.md">Español</a> · <a href="https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/i18n/README.fr.md">Français</a> · <a href="https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/i18n/README.de.md">Deutsch</a> · <a href="https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/i18n/README.ru.md">Русский</a>
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
| 🖼️ **自定义壁纸 2.0** | 本地图 / **图片 URL** / **渐变预设**；附带**透明度 / 模糊 / 填充方式**（裁剪填满 · 完整显示 · 模糊填充；后两档里竖图自动并排平铺），每套皮肤还**自动建议**一张渐变，可**自动弱化**（壁纸不透明度最高 45%） |
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
| 🔁 **壁纸轮换** | 高级壁纸选「图片链接」后，可在**链接列表**（最多 20 条 http/https 图片链接，每行一条）或**本地文件夹**（填文件夹路径，读这一层和往下最多三层真实子文件夹里的 jpg / png / webp / gif / avif / bmp，不含 HEIC、SVG、隐藏文件夹和符号链接；新放进去的照片自动加入）之间选一个图源，按 5 分钟到 7 天的间隔顺序或随机切换（文件夹图源下顺序即「按目录名字」：先播文件夹自己的图，再按名字逐个子文件夹播完），也可点「立即换下一张」。文件夹由插件的宿主部分读取，只能读到所选文件夹里的图片。坏链接或打不开的图片只丢它自己；窗口隐藏时不切换，回到前台补上；默认关闭（issue #61） |
| 🔤 **内层不透明** | 卡片、输入框、消息气泡不被壁纸盖住，可读性优先 |
| ↩️ **默认还原** | 一键回到 DSH 内置外观（跟随系统） |
| 💾 **三层持久化** | 皮肤与壁纸存 `localStorage` **+ 宿主侧 `dream-skin.json`**，刷新不丢；**桌面版每次换端口、重启也不丢** |

---

## 🔬 合成器预算（issue #110）

模糊不是"看着更重"——**每一块磨砂面都是一次离屏合成**，两块窗口同开就是两倍。所以这一项有数可查：

```sh
npm run compositor:audit        # 逐处：行号 / 模糊半径 / 所在选择器
```

（在仓库里跑——npm 包只带运行时，不含 scripts/）

当前发货的浏览器半边实测：**6 块 `backdrop-filter` 面板**（宿主的提问卡 24px、待办/队列坞 20px；我方的模态卡 14px、输入框 14px、`/` 命令面板 14px、液态玻璃 34px；另有 2 条 `none` 低功耗守卫，审计合计 8 条声明）、**40 处 radial-gradient**、**2 个 `requestAnimationFrame` 循环**，外加**壁纸层的全屏 `filter: blur()`**（"模糊填充"时还有一层更厚的 bleed 光晕）——最后这笔是最大的一层，它由 JS 写在行内样式上，**不在样式表里**，所以只读 CSS 的审计会把它漏掉（第一版就是这么漏的）。这些数字由 `tests/compositor_budget.test.cjs` 看住：多一块、厚一档，都要在 diff 里改预算表并写理由。

**它能证明什么**：这个版本**声明**了几块面板、每块多厚，以及低功耗开关是否真的覆盖了它们（含伪元素与壁纸层）。
**它不能证明什么**："你的机器此刻合成了几块"——那取决于窗口数、外接屏、驱动，以及当前挂了哪些面板。

**觉得卡，先开低功耗**（设置 → 玻璃效果）：它会把页面上**每一个** `backdrop-filter`（含 `*::before` / `*::after`）和壁纸那层模糊一起关掉。这是本插件为"两块窗口同开就掉帧"准备的唯一开关。

**报性能 issue 时最有用的三样**：① 开 / 关低功耗各一次的实际感受；② `chrome://gpu` 里 Compositing 那一段；③ 同时开了几个窗口、几块屏。维护者手上没有 M4 机器——静态那一半我们能自己量，动态那一半只能靠你那边。

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
> 步骤见 [docs/publishing-to-npm.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/publishing-to-npm.md) 第九节。

**卸载**：

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # 重启后恢复官方外观
```

---

## 🧩 兼容性

| 项 | 值 |
|------|-----|
| DeepSeek Harness (`dsh`) | **同一构建兼容三代宿主**：`0.1.0-rc.6` ~ `0.1.x`（稳定版）与 `0.2.0-rc.1` / `0.2.x`（peer 已放宽为 `>=0.1.0-rc.6 <0.3.0-0`，宿主换代由运行时能力探测兜底）。**宿主升级后皮肤消失但插件显示已装？** 多半是 peer 窗口把整包跳过了——应急出路：`dsh plugin allow-version dsh-dream-skin@<版本> <宿主运行时版本>`（**用户自担风险的显式覆盖**，不是推荐做法），详见 [docs/desktop-support.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/desktop-support.md) |
| Node.js | `>=18` |
| 浏览器 | 现代 Chromium / WebKit（依赖原生 CSS 变量与 `matchMedia`） |
| 桌面端 | **第三方 DSH Desktop 壳**：已适配并实机复核（issue #50/#51/#55）。**官方 DSH Desktop**：证据只支持"**预期可加载**"，不支持"已支持"——profile 目录与"壳能加载本插件"这两件事本机已实测（装进 `~/.dsh/profiles/desktop`，用户重启壳后加载，活页读到过我方材质表；路径与读数见 `docs/publishing-to-npm.md` 8.4 与 `docs/desktop-support.md`），但**跨重启的设置持久化本机从未验证**，故本文档**不给**可复制的桌面安装命令。<!-- desktop-claim: load-expected-unverified -->`--profile` 取值必须用宿主**自带**的模板名，照抄第三方文档会装进空壳 profile；判断依据见 **[docs/desktop-support.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/desktop-support.md)** |

> **兼容机制**：插件把全部平台 seed 放在受控 `try` 内按候选顺序探测，宿主全部换代时降级为哑模块并打 `console.warn`，不会拖垮 DSH Web（issue #43 已根治）。`0.2.0-rc.1` 起宿主按 peer 范围在 boot 阶段**整包跳过**不兼容插件，peer 窗口即本插件的对外兼容窗口，由回归门强制与 manifest 一致。**但宿主闸门只认 `@deepseek-ai/dsh` 前缀的 peer**：`@deepseek-ai/cordis` 与 `react` **不参与**宿主兼容判定（由包管理器的 semver 解析单独把关）。判定细节与两把尺的对照表见 `tests/package.host_compat.test.cjs` 与 [docs/desktop-support.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/desktop-support.md)。

> **第三方目录（DSH-Store）现状**：`AI-Scarlett/DSH-Store#1411` 曾把本插件标为 catalog blocked。其中「`lib/client.js` 超过其审核面单文件上限」一条，已由对方 2026-10-15 的追评收回，原文与正文 sha256 存档在 [`docs/evidence/dsh-store-1411-followup-2026-10-15.md`](./docs/evidence/dsh-store-1411-followup-2026-10-15.md)；其追评留下的「扫描器证明不了 `require` 的有限调用集」由 10.16.0 处理（全文见 [docs/release-notes.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/release-notes.md)）。**本仓库不承诺收录状态会变绿**——是否放行取决于对方的审查流程。

<details>
<summary><b>📜 逐版本更新记录（10.31.0 → 9.9.0）</b></summary>

**版本 10.31.0（2026-10-31）**：**修 #131 评审顺带发现的三处 README 参考数字。** 设置行 **5→7**（`settings.dreamSkin.item` 实际注册 7 处）；合成器面板仍是 **6 块**，但枚举补齐第 6 块「`/` 命令面板」，并写清「另有 2 条 `none` 低功耗守卫，审计合计 8 条声明」；自动弱化文案改为「壁纸不透明度最高 45%」（与 10.30.1 的 UI 一致）。新增 `tests/docs.reference_counts.test.cjs`（3 条）把行数与面板/声明数钉在 bundle 和审计上。回归门 **646/646**（643→646），质量审计 **229/229**（217 调色 + 12 工艺）。**边界**：填充方式在 main 上仍是「裁剪填满」，与 UI 一致；#131 分支把它改成「裁剪填充」，合并那条时再同步。发版用确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.31.0`。

**版本 10.30.1（2026-10-30）**：**修 #129 / #130 两条反馈。** #129 是标签误导：自动弱化的代码方向正确（滑杆是透明度，`Math.min(opacity, 0.45)` 把壁纸不透明度封顶在 45%），旧文案「聚焦任务时」与实际「始终生效」不符，8 种语言已改成「壁纸不透明度最高 45%」；不要改成 `Math.max`，那会让淡壁纸反而变浓。#130 给宿主新的插件管理页补上表面：官方 `@deepseek-ai/dsh-client-ui-plugin-manager@0.2.1-rc.5` 的 `data-plugin-group` / `-item-detail` / `-detail` / `-rows` 加入同一条弹窗玻璃规则（跟随「弹窗透明度」，不新增模糊声明），页面根在壁纸激活时透明。回归门 **643/643**（640→643：新文件 `tests/client.plugin_page.test.cjs` +3），质量审计 **229/229**（217 调色 + 12 工艺）。**边界**：#130 的视觉未在 0.2.1-rc.5 活页目视（本机 0.2.0-rc.1 没有该页），规则按官方包 DOM 编写，请报告者回填。发版用确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.30.1`。

**版本 10.30.0（2026-10-30）**：**采纳外部贡献者 @ppy-web 的 PR #128 —— 8 个设置滑杆统一成同一套自绘 Range（透明原生 `input[type=range]` + 自绘轨道/填充/拇指）。** 保留 `type=range`、min/max/step、键盘方向键/Home/End、`aria-valuetext`、`prefers-reduced-motion` 与 focus-visible 轮廓；轨道点击按位置跳转，拇指拖拽不跳动，预览仍只由指针触发。我们补了 6 条组件级回归测试（`tests/client.slider.test.cjs`）。回归门 **640/640**（10.29.0 为 634，+6），质量审计 **229/229**（217 调色 + 12 工艺）。**边界**：测试是组件级不是浏览器级；`touch-action:none` 会让触屏在滑杆区域起手的纵向滚动被吞掉；没有 forced-colors 兜底；bundle 538,272 B，距 544 KiB 预算余量 18,784 B。发版用确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.30.0`。

**版本 10.29.0（2026-10-29）**：**采纳外部贡献者 @ppy-web 的实时预览（PR #126）—— 拖「壁纸透明度 / 壁纸模糊」时，设置面板让出画面。** 调壁纸的时候，设置弹窗和遮罩正好压在对话框上，想确认"这张图会不会影响文字可读性"只能反复开关设置；他的做法是拖动这两个滑杆期间把面板和遮罩藏起来、只把**正在拖的那一行**做成一块浮起的芯片留在画面上，松手/取消/切窗口/`Escape` 都恢复。实现用的是自有属性标记三层节点（`root` / `path` / `row`），**原生滑杆自始至终没被移动或重新挂载**（那会打断正在进行的拖动）；遮罩是弹窗的**兄弟节点**（本机宿主 `0.2.0-rc.1` 的设置页是 `div[role="presentation"]` 里并排放 `mask` 与 `role="dialog"`），所以隐藏范围向上爬到那层包装——只藏弹窗会留下一层压暗的罩子。我复核后去掉了一处：**预览只由指针触发**，不再由方向键触发（给含焦点的子树加 `visibility: hidden` 会让里面获得焦点的元素失焦，键盘用户会"按一下闪一下、再也调不动"）。PR 里第二半（自制滑块外观）这一版**没有采纳**：它只作用于这两行，同一面板另外 6 个滑杆仍是原生控件，一个面板两套样式是设计语言的倒退——已把"要换就 8 行一起换、并去掉与气泡重复的常驻数值"写回 PR 邀请他再来。回归门 **634/634**（10.28.1 为 631，+3 是这条的守卫），质量审计 **229/229**（217 调色 + 12 工艺）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.29.0`。

**版本 10.28.1（2026-10-28）**：**修 #124 —— 聊天输入框里打 `/` 弹出的命令菜单没有自己的背景。** 量了两条渠道的宿主字节：命令菜单（`dsh-client-ui-input-trigger` 的 `MenuView`）的类只声明布局，**没有任何 background / backdrop-filter**，而它渲染进的槽位 `[data-composer-overlay]` 也是 `height:0; position:absolute`——宿主用不透明主题时被输入框挡住，我们的输入框是玻璃，聊天文字就直接透上来了。所以现在由插件给这个面**上色**：`[data-composer-overlay] > *` 用我们自己的变量（跟着「弹窗透明度」滑杆走），模糊跟同一个玻璃旋钮；低功耗下模糊被全局关掉，这条通道也随之抬到低功耗地板，不会变成"既平又透"。**旧宿主（0.2.0-rc.1）不盖这个属性 ⇒ 规则在那条线上是空转，不是回归**（新属性在 0.2.1-rc.3 才有）。回归门 **631/631**（10.28.0 为 628，+3 是这条的守卫），质量审计 **229/229**（217 调色 + 12 工艺）。合成器预算随之 **6 → 7 块面板**（真多了一次离屏合成，理由写在预算表里）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.28.1`。

**版本 10.28.0（2026-10-28）**：**出厂外观换成维护者自己那套参数 —— 新装用户第一次打开看到的就是它。** 壁纸透明度 60%（= `wallpaper-opacity 0.4`，滑杆显示的是 `1 − opacity`）、壁纸模糊 5px、侧边栏 60% + 开启「跟随壁纸」、输入框 60%、毛玻璃——与生成器里的星云默认值逐项对齐。**弹窗保持 0.92 不降到 50%**：一是 `modalOpacity` 的域下限 0.8 来自 issue #67「低于 0.8 的弹窗不再遮住身后页面」，二是这一项在有壁纸时本来就会被抬到 0.92（设置里那句「已到可读性地板」说的就是这件事），发 0.5 与发 0.92 在当前外观上像素等价、只对没有壁纸的用户生效。**壁纸图像不随包发**（那是维护者的私人照片，出厂仍用内置光晕壁纸）。**已有用户一个键都不会被改写**（出厂种子只在键缺席时写入）。其余 7 套皮肤在皮肤选择器里仍用各自调好的数值。回归门 **628/628**（10.27.1 为 627），质量审计 **229/229**（217 调色 + 12 工艺）。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.28.0`。

**版本 10.27.1（2026-10-27）**：**给 #110 一个能复算的静态坐标——并把提出这个想法的评审里三处未经实测的前提纠正过来。** 新脚本 `scripts/compositor-audit.cjs` 逐处列出 `backdrop-filter`、模糊半径、渐变层与 rAF 循环（带行号，注释不计），新门 `tests/compositor_budget.test.cjs` 把这些数字钉在声明的天花板上（6 块面板 / 静态半径 ≤40px / 40 处渐变 / 2 个 rAF / 2 处受低功耗守卫的行内模糊）。评审引用的 "40 处 backdrop-filter、31 处 blur()" 是把注释也算进去的计数（实测：6 条标准声明 + 6 条 `-webkit-` 孪生；17 处 `blur(`）；它写的"低功耗只降透明度、不减 blur"**方向是反的**——低功耗关掉的正是页面上全部 `backdrop-filter`。回归门 **627/627**（10.27.0 为 620），质量审计 **229/229**（217 调色 + 12 工艺）。本版**不改一个像素**：新增的是审计、门与 8 份 README 的「合成器预算」一节。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.27.1`。

**版本 10.27.0**：**发布包瘦身——随包文档撤出 npm：25→14 个文件、解包 1.11→0.59 MiB（-47%）、压缩包 412→196 KiB（-53%），同时把 README 在 npm 页面上的相对链接死链改成 GitHub 绝对 URL。** 回归门 **620/620**（617→620：新文件 `tests/package.links.test.cjs` +3，钉「随包文档里的相对链接必须指向随包文件或 npm 总是发布的文件」），质量审计 **229/229**（217 调色 + 12 工艺）。完整文档仍在仓库 `docs/`；npm 包只带运行时、README、主题包规范与 Store 存证。发版用确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.27.0`。

**版本 10.26.1（2026-10-26）**：**本地文件夹图源现在往下读三层子文件夹，并按「目录名字」轮换——一个文件夹播完再进下一个。** 回归门 **617/617**（610→617：`tests/host.folder.test.cjs` +4、`tests/client.smoke.test.cjs` +2、`tests/client.storage.test.cjs` +1），质量审计 **229/229**（217 调色 + 12 工艺）。列表与取图共用同一条路径段规则；每一级目录都 `lstat` 确认是真目录，软链目录两侧都拒；**Windows 的目录联接（junction）我在本机实测也被跳过**（读数的边界写在 CHANGELOG）。**已知边界**：客户端链接上限 700 字符，编码后超长的名字不参与轮换（有专门用例钉住）。发版用确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.26.1`。

**版本 10.26.0（2026-10-26）**：回归门 **610/610**（609→610）：三笔已合入主干的功能一次发出（本地文件夹图源、竖图平铺、壁纸取景）+ 宿主侧不变式「列表返回的每个名字都必须可服务」。全文见 [CHANGELOG.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/CHANGELOG.md) 的 10.26.0 条。

**版本 10.23.0（2026-10-23）**：回归门 **571/571**（569→571）；低功耗三态（`performance` 缺键 = 自动跟随系统「减少透明度」）。全文见 [docs/release-notes.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/release-notes.md) 的 10.23.0 条。

**版本 10.22.0（2026-10-22）**：**修一个我在 10.21.1 写出来的缺陷——低功耗模式关掉了磨砂，却没动菜单底色 46% 的 alpha，结果菜单比正常时更透（#115）。** 菜单本来靠模糊承担可读性，磨砂一没，同一块 46% 就成了能读穿背后聊天的「保鲜膜」。#116（@aurora-zl）只在低功耗开着时给 `--dsw-menu-surface-fill` 发一条 `max(滑杆, 0.92)` 的覆盖，并保留皮肤自己的菜单色相；开关关着一行都不发，磨砂玻璃原样保留；拨开关当帧重发，不残留。新增 1 条用例（两个配色方案都 ≥0.92、激活方案色相不变、正常模式完全不碰该通道、拨开关能加能撤）与 1 次反向破坏（把门控改成 `if (false)` ⇒ 红）；恢复后 157/157 绿。回归门 **569/569**（568→569），质量审计 **229/229**。**边界**：本版只给菜单这一条通道加了下限，composer / 侧栏等其他玻璃面在低功耗下仍会失去模糊；判据是计算值，真机观感以 #115 的回执为准。更新请写确切版本号：`dsh plugin --profile web add dsh-dream-skin@10.22.0`。

留在 README 的只有三条口径：

- **当前版本**：以 [CHANGELOG.md](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/CHANGELOG.md) 顶部条目为准，`package.json` 与 release tag 强制一致（由回归门守着）。
- **本版读数**：回归门 / 质量审计的通过数写在各版 CHANGELOG 条目里，不在 README 维护第二份数字。
- **历史为什么这么写**：每条都带当时的实测证据与「反向破坏后是否翻红」的记录，读它是为了判断某条边界今天是否仍然成立。

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
  5. 注册独立的 **设置 → 外观 / Theme** 分节（`settings.section`），7 个功能行挂在
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
- **放你自己的壁纸**：把图片丢进 [`wallpapers/`](https://github.com/RevolutionLA/dsh-dream-skin/tree/main/wallpapers)（注意只在你有权限的前提下分发），再在
  DSH 的「背景图片」里导入即可。
- **更新预览图**：预览由 `scripts/generate-skin-mockups.cjs`（真实 token + 弥散光）生成 HTML mockup，
  用无头 Chrome 截图即得 `docs/previews/*.png`，改皮肤 token 后重跑即可保持预览与真实 skin 同步。`docs/previews/manifest.json` 把每张图钉在三重指纹上（发货 token、卡片版式、图片字节与像素尺寸），`npm run previews --check`（不需要浏览器）在「只改配色、没重照图」时翻红并点名是哪套皮肤；找不到无头浏览器时 `npm run previews` 非零退出，不再把 0 产出当成功。这些 PNG **不随包发布**：2.26 MB 的 README 装饰不该由每个使用者下载，`npm pack` 从 2.5 MB 降到 263 kB，README 里的预览图改指 GitHub 绝对地址。
- **跑校验**：`npm test`（VM 冒烟测试，覆盖 factory 求值、`apply` 挂载、主题包导入/持久化）。
- **换配色**：参考 `--dsw-alias-*` 令牌（完整契约见 [`docs/themes-spec.md`](./docs/themes-spec.md)）。

</details>

## 工程案例

- [拒绝测试全绿，为什么 `IMG_2340.JPG` 还是打不开？](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/docs/case-study-listed-not-served.md)——从一次合并前拦截，看两个接口如何发生契约漂移，以及怎样用“列表中的每个名字都必须可服务”这条不变式防止复发。

## 📌 Roadmap

> **这张表只列未完成项。** 已交付能力见上文「功能一览」与 [CHANGELOG](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/CHANGELOG.md)，不在两处留存量——双写必然漂移，本项目已经漂过一次。
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

欢迎提交 Issue 与 PR！请先阅读 [贡献指南](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/CONTRIBUTING.md)，并遵循 [Code of Conduct](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/CODE_OF_CONDUCT.md)。

## ⭐ 支持这个项目

喜欢的话，给仓库点个 **Star ⭐**、在 npm 上点个 **👍**，或把它转发给你的 DSH 朋友——这会让更多人发现它，
也能激励持续维护。想一起做主题库 / 在线 Studio / 更多主题？欢迎来贡献。

## 🔒 安全

发现安全问题？请勿直接开公开 Issue——参见 [安全策略](https://github.com/RevolutionLA/dsh-dream-skin/blob/main/SECURITY.md)。

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

