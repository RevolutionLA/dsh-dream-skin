# 壁纸轮换：实机与变异证据

只记录观察到的事实。未做的检查写在最后。

## 环境

- 宿主：`DeepSeek Harness.app` 0.2.1-rc.2 自带的 `dsh` CLI，`dsh --profile web --port 3411`，**临时 `DSH_HOME`**（没有碰任何真实 profile）。
- 插件：用 `npm pack` 打出来的包（包版本号只在打包副本里加了 `-rotation.<sha>` 后缀），用 `dsh plugin --profile web add <tgz>` 装入。
- 图片：本机 `python3 -m http.server` 提供的三张纯色 PNG（`red` / `green` / `blue`）和一个不存在的 `missing.png`，所以服务器日志能直接看到插件发了哪些请求。
- 浏览器：Claude 桌面应用内置浏览器（Chromium）。

## 按顺序观察到的

列表：`red`、`javascript:alert(1)`、`green`、`missing`、`blue`。以下行为检查跑在这个 PR 功能提交的**前一版**打出的包上；与最终版的差别只有两处内联样式（间隔输入框宽度、列表框最小宽度），最终版重新打包后复核了布局与持久化（见下），之后只加了一条关闭开关的用例，没有改运行代码。

| 时间 | 操作 | 观察 |
|---|---|---|
| 14:31:45 | 手动「应用链接」`red.png` | 服务器收到 `GET /red.png` |
| 14:32 | 保存上面的混合列表 | 弹出「已忽略 1 行：不是有效的 http/https 图片链接」；存下 4 条（`javascript:` 那行被丢，其余 4 条保留） |
| 14:32:46 | 「立即换下一张」 | `wallpaper-url` 变为 `green.png`（干净链接）；渲染的 CSS 是 `url("…/green.png?t=1792564366208")`；`lastRotatedAt` 与 `wallpaper-refresh.lastFiredAt` 同为 `1792564366208`；服务器恰好一条 `GET /green.png?t=1792564366208`；`wallpaper-history` 只有手动应用的 `red.png` |
| 14:32:57 | 再按一次，下一条是死链接 | 服务器依次收到 `GET /missing.png?t=1792564377209`（404）和 `GET /blue.png?t=1792564377209`（200）；壁纸换到 `blue.png` |
| 14:33:23 | 间隔设 5 分钟并打开轮换 | `lastRotatedAt = 1792564403976`（开启时刻），壁纸不变 |
| 14:38:24 | 什么都不做，等 | 服务器收到 `GET /red.png?t=1792564703982`；`lastRotatedAt` 比开启时刻晚 **300006 ms**；`wallpaper-url` 变为 `red.png`（`blue` 之后回绕到第一条）；`lastFiredAt` 同为 `1792564703982`；`wallpaper-history` 仍只有 `red.png` 一条 |

重启 DSH 实例（最终版的包，同一端口、同一临时 `DSH_HOME`）后：`localStorage` 里的轮换配置完整保留，宿主状态文件（`POST /dream-skin/api {"method":"get"}`）的返回里含 `dsh-dream-skin:wallpaper-rotation`，`lib/index.js` 没有改。设置页复选框、列表、间隔都回到重启前的值。

## 截图

- `01-settings-default-width-zh.jpg`：中文，默认宽度。
- `02-settings-narrow-375-zh.jpg`：中文，视口 375 宽。设置对话框本身在这个宽度下就是单列挤压（「高级壁纸（URL / 渐变）」标题、既有的链接输入框也会换行或被截断），轮换的列表框在这一列内换行、不再比列宽。
- `03-settings-default-width-en.jpg`：英文，默认宽度。

## 44 次反向破坏

每次只改动 `lib/client.js` 的一处（在隔离副本上），跑 `client.smoke` + `client.storage` 里的轮换相关用例；下表是该次单独运行时翻红的用例。每一行都至少有一条翻红。

| # | 破坏 | 翻红的用例 |
|---|---|---|
| M01 | stopArmed does not abandon | rotation: a preload still in flight when the plugin is torn down or re-armed must not write |
| M02 | stop (re-arm) does not abandon | rotation: a preload still in flight when the plugin is torn down or re-armed must not write |
| M03 | commit writes history | rotation: a due rotation shows the next link, keeps history and the stored URL clean, and writes one documente |
| M04 | commit skips refresh stamp | rotation: a due rotation shows the next link, keeps history and the stored URL clean, and writes one documente<br>rotation: one wake-up fetches at most once, and the URL refresh still runs when rotation is not due |
| M05 | entries skip the gate | rotation: every entry passes the gate on every path, and one bad entry never costs the others |
| M06 | one bad entry drops the list | rotation: every entry passes the gate on every path, and one bad entry never costs the others |
| M07 | data: admitted in lists | rotation: every entry passes the gate on every path, and one bad entry never costs the others |
| M08 | refresh also runs in a rotation tick | rotation: one wake-up fetches at most once, and the URL refresh still runs when rotation is not due |
| M09 | hidden window rotates | rotation: it waits for its interval, for a visible window, for the link kind, and for being switched on |
| M10 | kind not required | rotation: "next now" needs the link kind and two links, ignores the schedule, and re-phases it<br>rotation: it waits for its interval, for a visible window, for the link kind, and for being switched on |
| M11 | backwards clock freezes | rotation: it waits for its interval, for a visible window, for the link kind, and for being switched on |
| M12 | giveUp keeps the interval unspent | rotation: a dead link keeps the wallpaper, tries a bounded number of others, and spends the interval |
| M13 | attempts unbounded | rotation: a dead link keeps the wallpaper, tries a bounded number of others, and spends the interval |
| M14 | no watchdog | rotation: a preload that never answers is abandoned after the deadline and the due rotation retries |
| M15 | switch-on skips kind check | rotation: switching it on is validated before it is stored and starts a fresh interval |
| M16 | switch-on keeps the old phase | rotation: switching it on is validated before it is stored and starts a fresh interval |
| M17 | blank save not guarded | rotation: the list box ignores an empty save, switches rotation off when the list gets too short, and the cont |
| M18 | short list leaves rotation on | rotation: the list box ignores an empty save, switches rotation off when the list gets too short, and the cont |
| M19 | minutes not clamped | rotation: the list box ignores an empty save, switches rotation off when the list gets too short, and the cont |
| M20 | mode not whitelisted | rotation: the list box ignores an empty save, switches rotation off when the list gets too short, and the cont |
| M21 | setUrl does not re-phase | rotation: applying a link yourself keeps it for a full interval, and only touches the key when rotation is on |
| M22 | setUrl always writes the key | rotation: applying a link yourself keeps it for a full interval, and only touches the key when rotation is on |
| M23 | clearAll keeps schedule and phase | rotation: clearing the wallpaper switches the schedule off and resets its phase, but keeps the typed list (T3) |
| M24 | random may repeat the showing link | rotation: random never repeats the showing link and visits the others; low-power mode does not pause it |
| M25 | outside link starts mid-list | rotation: applying a link yourself keeps it for a full interval, and only touches the key when rotation is on |
| M26 | not a sentinel | rotation: the key is a sentinel — an upgrader whose only stored preference is a rotation list keeps their stat |
| M27 | factory default added | rotation: the key is a sentinel — an upgrader whose only stored preference is a rotation list keeps their stat |
| M28 | low-power pauses rotation | rotation: random never repeats the showing link and visits the others; low-power mode does not pause it |
| M29 | commit ignores a kind change | rotation: a preload that answers after the user picked another wallpaper kind does not bring the link back |
| M30 | refused lines not announced | rotation: every entry passes the gate on every path, and one bad entry never costs the others |
| M31 | stamp not stripped from entries | rotation: every entry passes the gate on every path, and one bad entry never costs the others |
| M32 | UI: checkbox on every kind | the rotation controls show on the link kind only, and each control calls its own action |
| M33 | UI: Save calls the wrong action | the rotation controls show on the link kind only, and each control calls its own action |
| M34 | UI: controls shown with one link | the rotation controls show on the link kind only, and each control calls its own action |
| M35 | ru dictionary lacks a rotation key | all eight settings dictionaries expose EXACTLY the same keys |
| M36 | enabling rotation does not re-arm | rotation: a preload still in flight when the plugin is torn down or re-armed must not write |
| M37 | rotateNow ignores the link kind | rotation: "next now" needs the link kind and two links, ignores the schedule, and re-phases it |
| M08b | in-flight rotation no longer owns the tick | rotation: one wake-up fetches at most once, and the URL refresh still runs when rotation is not due |
| M35b | ja dictionary lacks a rotation key | all eight settings dictionaries expose EXACTLY the same keys |
| M36b | list edit does not re-arm | rotation: a preload still in flight when the plugin is torn down or re-armed must not write |
| M38 | dictionary key renamed in all eight | every rotation string the page and its alerts use is defined in the dictionaries |
| M39 | page asks for a key nobody defines | every rotation string the page and its alerts use is defined in the dictionaries<br>the rotation controls show on the link kind only, and each control calls its own action |
| M40 | the schedule ignores the off switch | rotation: it waits for its interval, for a visible window, for the link kind, and for being switched on<br>rotation: switching it off stops the schedule — an overdue rotation does not happen, and switching back on sta<br>rotation: switching it on is validated before it is stored and starts a fresh interval |
| M41 | switching off is not stored | rotation: switching it off stops the schedule — an overdue rotation does not happen, and switching back on sta<br>rotation: switching it on is validated before it is stored and starts a fresh interval |

## 没有做 / 没有验证

- 只在 macOS 上、用 Chromium 内置浏览器看过；Windows、Safari、Firefox 没看。
- 英文之外的 6 种语言界面没有逐一截图（词典键由既有的八语言键集合相等用例和新增的「页面用到的轮换文案都有定义」用例守住）。
- 没有在 Desktop 应用（Electron 壳）里装过：以上都是同一套 Web 客户端在 `dsh --profile web` 里的表现。
- 多标签页同时打开时各自轮换，没有测。
