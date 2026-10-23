# 壁纸轮换：本地文件夹图源的实机与变异证据

只记录观察到的事实。未做的检查写在最后。

## 环境

- 宿主：`DeepSeek Harness.app` 0.2.1-rc.2 自带的 `dsh` CLI，`dsh --profile web`，**临时 `DSH_HOME`**，没有碰任何真实 profile。
- 插件：把工作区打包（`npm pack`，包版本号只在打包副本里加后缀）后用 `dsh plugin --profile web add` 装入。
- 照片：先用一个临时文件夹里的三张仓库自带壁纸（`八骏图.jpg`、`巴伐利亚  迷人的日落  作者 Jonathan Besler.jpg`——两处连续空格，`秋枫.jpg`）加一个 `README.md`；最终版重跑时直接用仓库的 `wallpapers/` 目录，路径写成 `~/Projects/dsh-dream-skin/wallpapers`（它同样含这三张图和一个 `README.md`），以此也走过 `~/` 展开。
- 浏览器：Claude 桌面应用内置浏览器（Chromium）。
- 两个构建：**A** 是宿主改成异步文件 API **之前**的构建；**B** 是这个 PR 最终提交的构建。下表每一行标明跑在哪个构建上。

## 观察到的

| 构建 | 操作 | 观察 |
|---|---|---|
| A | 选「图片链接」→「本地文件夹」，保存一个**不存在**的路径 | 路径框下出现「找不到这个文件夹」，路径已存下，轮换未开启 |
| A、B | 保存真实文件夹 | 显示「找到 3 张图片」（`README.md` 被忽略），出现「按顺序/随机」、间隔和「立即换下一张」；B 上用的是 `~/Projects/dsh-dream-skin/wallpapers` |
| A、B | 点「立即换下一张」两次 | `wallpaper-url` 依次是 `八骏图.jpg`、`巴伐利亚  迷人的日落…`（两处连续空格的文件名原样往返）的相对链接 `dream-skin/api/folder/file?name=<百分号编码>&v=<字节数>-<mtime>`；浏览器实际请求 `…/dream-skin/api/folder/file?name=…&v=…&t=<戳>`，A 上读到服务端 200；`wallpaper-history` 保持为空 |
| A | 间隔设 5 分钟并打开轮换，等到期（此时内置浏览器的页面处于**隐藏**状态） | 到期后没有轮换：窗口隐藏时不轮换，符合设计 |
| A | 把页面带到前台 | 补上了：壁纸变成 `秋枫.jpg`（顺序里「巴伐利亚」的下一张），`lastRotatedAt` 比开启时刻晚 **359989 ms** |
| A | 重启实例（同一临时 `DSH_HOME`） | 文件夹路径和轮换配置还在，页面恢复显示 `秋枫.jpg` |
| B | 重启实例（同一临时 `DSH_HOME`） | 宿主状态（`POST /dream-skin/api {"method":"get"}`）里有 `wallpaper-folder` 和文件夹图片的 `wallpaper-url`，`folder-list` 返回三个文件名，页面画出一张文件夹图片 |

## 截图

两张都是 B（最终构建）：

- `01-folder-default-width-zh.jpg`：中文，默认宽度，路径 `~/Projects/dsh-dream-skin/wallpapers`，显示「找到 3 张图片」。
- `02-folder-narrow-375-zh.jpg`：中文，视口 375 宽，路径框在这一列内收缩，不再比列宽。

## 46 次反向破坏（宿主 22 次、客户端 24 次）

每次只改动 `lib/index.js` 或 `lib/client.js` 的一处（在隔离副本上），跑 `client.smoke` + `client.storage` + `host.folder` 里的相关用例；下表是该次单独运行时翻红的用例，每一行都至少有一条。首轮有三处存活：C07 是我的破坏本身没有真正放行（后一个条件仍在拦），改成同时放行后翻红；C25 暴露了「过长或含控制字符的路径」没有用例，补了之后翻红；C09（把 `.then` 里「轮换是否已被放弃」的检查删掉）所有用例仍通过，所以我删掉了 `.then` 里的这一份检查——`begin()` 和 `giveUp()` 里各自还有同样的检查，它们保留。宿主部分后来从同步文件 API 改成了异步，并改成「先按名字过滤和排序、再逐个 `lstat` 直到凑够 2000 条」，宿主的 22 次破坏是在改完之后重跑的。

| # | 破坏 | 翻红的用例 |
|---|---|---|
| H01 | svg is served | folder file: names that are not a plain image basename are refused with a bodiless 404, and the neighbor is still served<br>folder list: images in human order, nothing else — dotfiles, svg, heic, subfolders, empty and oversize files and every s |
| H02 | dotfiles listed | folder list: images in human order, nothing else — dotfiles, svg, heic, subfolders, empty and oversize files and every s |
| H03 | dotfiles served | folder file: names that are not a plain image basename are refused with a bodiless 404, and the neighbor is still served |
| H04 | separators allowed in the name | folder file: names that are not a plain image basename are refused with a bodiless 404, and the neighbor is still served |
| H05 | symlinks listed | folder list: images in human order, nothing else — dotfiles, svg, heic, subfolders, empty and oversize files and every s |
| H06 | symlinks served | folder file: names that are not a plain image basename are refused with a bodiless 404, and the neighbor is still served |
| H07 | listing has no size cap | folder list: images in human order, nothing else — dotfiles, svg, heic, subfolders, empty and oversize files and every s |
| H08 | serving has no size cap | folder file: names that are not a plain image basename are refused with a bodiless 404, and the neighbor is still served |
| H09 | any extension is served | folder file: names that are not a plain image basename are refused with a bodiless 404, and the neighbor is still served |
| H10 | folder taken from the request | folder file: the folder is the persisted setting — a `folder` in the request changes nothing |
| H11 | no ~ expansion | folder: "~/" expands to the home directory and a symlinked folder is followed to its real path |
| H12 | relative folder accepted | folder list: unset, relative, missing and not-a-directory each answer a stable code and no path<br>folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |
| H13 | truncation not reported | folder list: a folder over the cap is cut and says so<br>folder list: a huge folder costs at most the cap in stats — names are sorted first, then stat'ed in order until the cap |
| H14 | listing not sorted | folder list: images in human order, nothing else — dotfiles, svg, heic, subfolders, empty and oversize files and every s<br>folder rotation: a due rotation lists the folder through the real host, shows the next image by its host link, and the l |
| H15 | nosniff dropped | folder file: serves the bytes with the hardening headers, including a Chinese name with a space |
| H16 | sandbox CSP dropped | folder file: serves the bytes with the hardening headers, including a Chinese name with a space |
| H17 | images cacheable | folder file: serves the bytes with the hardening headers, including a Chinese name with a space |
| H18 | error carries the path | folder list: unset, relative, missing and not-a-directory each answer a stable code and no path |
| H19 | folder-list leaves the fence | folder routes keep the trust fence and the method rules |
| H20 | folder-list ignores content-type | folder routes keep the trust fence and the method rules |
| H21 | non-directory accepted | folder list: unset, relative, missing and not-a-directory each answer a stable code and no path<br>folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |
| H22 | every name is stat'ed, cap applied late | folder list: a folder over the cap is cut and says so<br>folder list: a huge folder costs at most the cap in stats — names are sorted first, then stat'ed in order until the cap |
| C01 | any string is a folder link | folder rotation: switching source, long names, clearing the wallpaper and the sentinel key<br>folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it |
| C02 | folder link has no length cap | folder rotation: switching source, long names, clearing the wallpaper and the sentinel key<br>folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it |
| C03 | render gate refuses folder links | folder rotation: a due rotation lists the folder through the real host, shows the next image by its host link, and the l<br>folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it |
| C04 | adoption lets everything in | folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it |
| C05 | adoption refuses folder links | folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it |
| C06 | typed box accepts folder links | folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it |
| C07 | list entries accept folder links | folder rotation: the render gate, host adoption and the typed boxes accept exactly the folder shape and nothing near it |
| C08 | no flush before listing | folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |
| C10 | failed listing keeps the interval | folder rotation: a host that never answers is given up on after the deadline, the request is aborted, and the interval i<br>folder rotation: no host means no rotation, a spent interval and a stated reason — the wallpaper stays |
| C11 | changing source keeps the schedule on | folder rotation: switching source, long names, clearing the wallpaper and the sentinel key |
| C12 | source not whitelisted | folder rotation: switching source, long names, clearing the wallpaper and the sentinel key |
| C13 | folder switch-on skips the listing check | folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |
| C14 | shrunk folder leaves the schedule on | folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |
| C15 | folder link not validated when built | folder rotation: switching source, long names, clearing the wallpaper and the sentinel key |
| C16 | shown image not located by name | folder rotation: a due rotation lists the folder through the real host, shows the next image by its host link, and the l<br>folder rotation: a photo added to the folder joins the rotation with no setting change, and a removed one is gone<br>folder rotation: switching source, long names, clearing the wallpaper and the sentinel key |
| C17 | listing result not kept for the row | folder rotation: a host that never answers is given up on after the deadline, the request is aborted, and the interval i<br>folder rotation: no host means no rotation, a spent interval and a stated reason — the wallpaper stays<br>folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |
| C18 | error codes mis-mapped | folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an<br>the folder controls show for the folder source only, explain each failure code, and each control calls its own action |
| C19 | source switch on every kind | the folder controls show for the folder source only, explain each failure code, and each control calls its own action |
| C20 | link list shown for the folder source | the folder controls show for the folder source only, explain each failure code, and each control calls its own action |
| C21 | folder key not a sentinel | folder rotation: switching source, long names, clearing the wallpaper and the sentinel key |
| C22 | next-now skips the folder check | folder rotation: no host means no rotation, a spent interval and a stated reason — the wallpaper stays |
| C23 | listing never times out | folder rotation: a host that never answers is given up on after the deadline, the request is aborted, and the interval i |
| C24 | blank folder save not guarded | folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |
| C25 | over-long folder path accepted | folder rotation: saving a folder reaches the host before the listing is asked, and every unusable folder is explained an |

## 没有做 / 没有验证

- **没有在 Electron 桌面壳里跑过**。图片链接依赖 `dsh-app://app/` 协议把任意路径和查询串转发给宿主：我读了 0.2.1-rc.2 `app.asar` 里的 `protocol.handle` 和 `forwardWebRequest`，确认它对非静态路径转发任意方法、路径与查询串、保留 `content-type`、去掉 `content-length`，但没有在运行的桌面应用里实际加载过一张文件夹图片。
- `O_NOFOLLOW` 是 `lstat` 检查与打开之间那一小段竞争的加固，**没有用例钉住**（竞争无法确定地复现）。
- 只在 macOS、Chromium 上看过；Windows 路径、HEIC（Chromium 解不了，被排除在列表之外）、网络盘/外接盘上的文件夹没有试。
- 共用 `~/.dsh/dream-skin.json` 的旧版插件会拒收文件夹图片的相对链接（它们的渲染门不认），该实例此时不画壁纸；这是读代码得出的，没有启动旧版验证。
- 英文之外的 6 种语言界面没有截图，英文界面这一轮也没有重看。
