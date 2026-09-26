# 桌面端兼容与支持矩阵（Desktop Support Matrix）

> 本文面向评估者（含官方团队）：说清楚 dsh-dream-skin 在哪些宿主上能跑、
> **靠什么机制跑**、**依赖宿主的哪些锚点**、宿主升级时会发生什么、以及
> 哪些结论已验证、哪些尚未。所有论断附代码位置（v9.26.1 起引用**符号名**而非行号——行号随补丁必然位移，符号名可 `grep` 直达）。

最后更新：2026-09-26

## 支持状态总览

| 宿主 | 状态 | 依据 |
|------|------|------|
| DSH Web（稳定 `0.1.0-rc.6` / master 新模块表） | ✅ 支持，回归测试覆盖 | 双代 seed 探测（`lib/client.js` 顶部 `seedProbe` / `requireSeed` 块），回归门 77/77（Node 18/20/22/24） |
| 第三方 DSH Desktop 壳（Electron，动态端口） | ✅ 支持，含桌面专属修复 | issue #50/#51/#55（v9.14.1 / 9.15.2 / 9.16.0），动态端口重启用例（`tests/client.persistence.test.cjs` 之 "blue-team B1" / "T-02" 系列） |
| **官方 DSH Desktop 预览版**（2026-09-25 发布） | 🟡 预期兼容，**真机验证进行中** | 官方报道确认桌面端为 Electron、平移 Web 前端并**继承既有插件运行机制**；未在本机安装官方包逐项验证前不作像素级承诺 |
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

不匹配 UA、不嗅探宿主版本号。README「关于 `engines.dsh`」一节解释了为何主动放弃版本声明字段。

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

## 机读诊断通道（v9.26.0+，schema 于 v9.26.1 定稿）

插件在 `window.__DSH_DREAM_SKIN_STATUS__` 发布只读诊断快照，宿主/桌面端工具无需 scrape console 即可判定兼容状态：

```js
{
  plugin: "dsh-dream-skin",
  build: PLUGIN_BUILD,          // 与 package.json 版本由测试守卫对齐
  status: "ready",              // 或 "degraded"（宿主 seed 换代 → 哑模块禁用）
  shell: "desktop" | "web",     // 桌面壳检测结果（isDesktopShell()）
  skin: "<当前皮肤 id>",
  anchors: {                    // 漂移探针结果（warnOnMaterialSelectorDrift 帧执行后填充）
    probed: 6,                  // Web 6 组宿主哈希锚；桌面壳下 7（+1 侧边栏面）
    drifted: []                 // 空数组 = 全部精修在本构建上生效；元素恒为**合法原始选择器**
  },
  checkedAt / publishedAt       // epoch ms
}
```

- **降级路径同样发布**（`status: "degraded"` + `reason` + `lastError`），且字段集与 ready 完全一致、不可知项显式为 `null`——消费方永不撞 `undefined`，诊断方能区分"插件未安装"与"已安装但宿主 seed 换代"。
- 宿主采纳后自动重发布（`loadFromHost` 尾部 `publishStatus()`），`skin/shell` 反映的永远是生效值；后续任何重发布经 prev-merge 保住探针结果。
- 纯只读镜像：不新增网络请求、不写持久化、渲染失败被吞——诊断通道坏不了皮肤。它是**诊断镜像而非信任边界**：任何安全决策都不应依赖该全局的返回值（写入/渲染/采纳三道校验各自独立把关）。

## 锚点依赖清单（宿主升级风险面）

**这是本文档存在的核心原因：如实列出插件对宿主 DOM/token 的每一处依赖、失效后果与已有对策。**

| 锚点 | 性质 | 若失效的后果 | 对策 |
|------|------|-------------|------|
| 玻璃材质类名（`.uV2eYG_*` 等 13 组，材质样式表见 `lib/client.js` 之 `ensureMaterialStyle()`，样式节点 id 常量 `MATERIAL_CSS_SOURCE`） | 构建哈希类名 | 仅玻璃精修**静默失效**（外观损失，功能无损） | 漂移探针 `warnOnMaterialSelectorDrift()` + 机读快照（`MATERIAL_SELECTOR_PROBES`）；规则本身选择器组冗余 |
| composer 输入框（`COMPOSER_ANCHOR_SELECTOR`：`data-composer-input` 主锚 + textarea/contenteditable 三级兜底） | Lexical DOM 形态 | 输入框透明度滑杆失效 | issue #50 三轮修复后改为稳定指纹优先 |
| `--dsw-alias-*` / `--dsw-specific-*` token 名（如 `--dsw-specific-sidebar-fill`） | 官方 token 契约 | 对应通道不上色 | token 契约已文档化（[themes-spec.md](./themes-spec.md)），这也是**建议官方承诺稳定的接口面** |
| 设置插槽 `settings.section` / `settings.dreamSkin.item`（`lib/client.js` 之 `SETTINGS_NS` / `renderSlot` 注册处） | 官方插槽名 | 设置 UI 不出现，皮肤仍生效 | 属公开插件 API；跟随官方命名 |
| 第三方壳类 `.dshDesktopSidebarSurface`（`lib/client.js` 之 `DESKTOP_SIDEBAR_SELECTOR`） | **非官方壳的类名** | 桌面侧边栏透明度不一致（issue #55 原型） | 桌面规则纳入漂移探针（`isDesktopShell()` 门控）；官方桌面版若提供语义属性可即刻切换契约 |
| `[role="dialog"]` 等 ARIA 契约（`COMPOSER_ANCHOR_SELECTOR` 兜底与 `isInDialog` 判定时使用） | 无障碍标准 | 理论不存在失效 | ARIA 是规范而非宿主私有物 |

## 安全边界

- `/dream-skin/api`：仅回环 Host（或显式配置的 trusted authority）+ `sec-fetch-site` / Origin 同源校验 + 严格 JSON 围栏 + 32 MiB 体积上限（`lib/index.js` 之 `isTrustedApiRequest()` / `readJsonBody()`）。防 DNS rebinding / 跨站打点。**无鉴权**——设计目标是本机单用户场景，文档如实声明。
- 壁纸 URL：仅 `http(s):` / `data:image/`，控制字符拒绝，出口转义（`lib/client.js` 之 `isSafeWallpaperUrl()`）。
- 渐变值：拒绝 `url()` / `image-set()` / `element()` 等资源拉取函数（`isSafeWallpaperGradient()`），**写入、渲染、宿主采纳三道把关**（v9.26.0 写入+渲染；v9.26.1 补采纳旁路，第三方评审 T-03）。
- 主题包导入：本地文件 / URL hash base64，结构 + 十六进制色值校验，失败回滚，**不发起任何远程拉取**（`lib/client.js` 之 `tryImportFromHash()` / pack 校验路径）。
- 出厂壁纸：原创生成的抽象弥散光图（约 7KB data URL 内嵌，零远程请求）；替换自旧版真人照片，旧图用户由一次性迁移自动换为新图（内容三重指纹精确匹配才写入：`LEGACY_FACTORY_WALLPAPER` / `migrateLegacyFactoryWallpaper()`，三元组常量由测试钉死）。旧照片的处置：**代码与测试中只以三个数字指纹存在**；原图仍在 git 历史（维护者决定不重写）；曾含旧图的两张 `docs/screenshots/` 真机截图**自 v9.26.1 起已移出 npm 包 `files`**（此前随包分发，属失实暴露面），仓库内保留至真机重截后替换。插件运行期不分发该图像。
- 遥测：**无**。唯一第三方网络目标：可选开启的"必应每日壁纸"定时刷新（域名为第三方 uapis.cn 代理，默认关闭、显式开启，`lib/client.js` 之 `runScheduledWallpaperRefresh()` / `startWallpaperRefreshScheduler()`）。

## 已验证 / 未验证（诚实清单）

**已自动化验证**（`npm test`，77 用例，Node 18/20/22/24 CI；修复类用例经**变异验证**——逐条反向破坏对应修复，10 处变异全部有用例翻红）：
- 双代宿主 seed 探测与全量降级（哑模块路径 + degraded 全 schema 快照）；
- 动态端口重启 + 清壁纸后无出厂壁纸闪现；
- 桌面侧边栏规则的存在性与作用域限定；桌面壳下漂移探针两态（`probed=7`、`drifted` 只含合法原始选择器）；
- 宿主 API 的类型围栏 / 方法围栏 / 体积围栏 / 超大体不泄漏栈；
- URL 与渐变壁纸的注入拒绝（写入 + 渲染 + **宿主采纳**三道）；
- 出厂壁纸迁移：负向路径（同长度走私 / 同字节数空白载荷 / 同三元组差一哈希 / 当前出厂图幂等）与**正向路径**（合成 fixture 命中三元组即替换，旧图素材本体仍不进仓库）；迁移 × 宿主采纳的双向语义（宿主"已清空"不被工厂写复活；宿主持有旧图的会话迁移后以用户态推送、host 文件收敛）；
- 诊断快照跟随宿主采纳刷新，重发布经 prev-merge 保住探针结果。

**未验证 / 无法承诺**：
- 官方 Desktop 预览版的像素级真机效果（假 DOM 测试无法替代，需装官方包逐项截图核对）；
- `docs/screenshots/` 两张截图仍是旧出厂壁纸时期的真机图（已移出 npm 包，仓库内待真机重截为新壁纸版本，不用合成图冒充）；
- 渐变守卫在 WebKit/Firefox 的 CSSOM 转义行为（Chromium 已实测渲染层拦截 `\75 rl(` 类转义走私；denylist 的字符串层补强排在真机矩阵轮之后）；
- 玻璃材质类名在任意未来构建上的命中率（漂移探针只能报告失效，不能预防）；
- 状态文件无 schema 版本字段——旧版格式升级兼容靠宽容读取（`lib/index.js` 之 `readState()`），未做前向演练。

**卸载残留**：`$DSH_HOME/dream-skin.json` 保留（用户数据，插件不主动删除），其余状态在浏览器侧可被官方"一键还原"清除。

## 对官方的三条兼容契约建议

若官方桌面版/插件体系愿意提供以下任一稳定面，本插件承诺第一时间从哈希类名迁移到契约：

1. 语义 data 属性（如 `data-dsh-sidebar-surface`）替代构建哈希类名——消灭上表第一行全部风险；
2. `--dsw-*` token 名单进入官方 CHANGELOG 的"公开契约"节（本仓库 `themes-spec.md` 可作为初稿素材）；
3. loader 工厂异常隔离（宿主侧 try/catch 每个插件工厂）——目前由插件单方面保证不抛错，宿主加一道门对所有第三方插件都好。
