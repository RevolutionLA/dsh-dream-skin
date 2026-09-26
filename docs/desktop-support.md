# 桌面端兼容与支持矩阵（Desktop Support Matrix）

> 本文面向评估者（含官方团队）：说清楚 dsh-dream-skin 在哪些宿主上能跑、
> **靠什么机制跑**、**依赖宿主的哪些锚点**、宿主升级时会发生什么、以及
> 哪些结论已验证、哪些尚未。所有论断附代码位置（以 v9.26.0 为准）。

最后更新：2026-09-26

## 支持状态总览

| 宿主 | 状态 | 依据 |
|------|------|------|
| DSH Web（稳定 `0.1.0-rc.6` / master 新模块表） | ✅ 支持，回归测试覆盖 | 双代 seed 探测（`lib/client.js:24-73`），回归门 66/66 |
| 第三方 DSH Desktop 壳（Electron，动态端口） | ✅ 支持，含桌面专属修复 | issue #50/#51/#55（v9.14.1 / 9.15.2 / 9.16.0），动态端口重启用例（`tests/client.persistence.test.cjs:152,321`） |
| **官方 DSH Desktop 预览版**（2026-09-25 发布） | 🟡 预期兼容，**真机验证进行中** | 官方报道确认桌面端为 Electron、平移 Web 前端并**继承既有插件运行机制**；未在本机安装官方包逐项验证前不作像素级承诺 |
| 宿主未来任意版本 | 🟢 安全降级 | 全 seed 换代时降级为哑模块 + `console.warn`，绝不拖垮 shell（issue #43 根治，`lib/client.js:24-73`） |

## 接入方式：为什么不需要"注入"

- 宿主半边：`cordis.patch.yml` 向官方 loader 树插入一行，挂载 `/dream-skin/api` 路由（`lib/index.js:42-47`）——**官方一等插件机制，不修改任何安装包二进制**。
- 浏览器半边：注册进 `__ModuleLoader__`，通过 `ctx.theme.register` / `ctx.theme.overrideTokens` 走 **`--dsw-*` token 通道**上色（`lib/client.js:1721`），外加一段自有 `<style>` 玻璃材质规则（`lib/client.js:1837`）。
- 结论：皮肤效果完全由官方主题 token 系统表达；卸载 = 移除插件行，不留残留样式（持久化状态文件见下文"卸载"）。

## 桌面壳检测（契约式，非 UA 嗅探）

按以下任一信号判定桌面壳（`lib/client.js:2296-2307`）：

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
| **宿主文件** | `$DSH_HOME/dream-skin.json`，经 `/dream-skin/api` 读写 | **跨端口/跨重启的权威状态**（`lib/index.js:37-42`） |

- 端点路径在运行时由 `document.baseURI` 解析（`lib/client.js:1172`，v9.23.0 / issue #56），对动态端口与子路径挂载免疫。
- 原子写入（tmp + rename，Windows 直写回退，`lib/index.js:68-83`），文件权限 `0o600`。
- 出厂播种永不反向覆写宿主持久文件（issue #51 修复 + v9.13.0 溯源快照）。

## 机读诊断通道（v9.26.0+）

插件在 `window.__DSH_DREAM_SKIN_STATUS__` 发布只读诊断快照，宿主/桌面端工具无需 scrape console 即可判定兼容状态：

```js
{
  plugin: "dsh-dream-skin",
  build: "9.26.0",            // 与 package.json 版本由测试守卫对齐
  status: "ready",            // 或 "degraded"（宿主 seed 换代 → 哑模块禁用）
  shell: "desktop" | "web",   // 桌面壳检测结果
  skin: "<当前皮肤 id>",
  anchors: {                  // 漂移探针结果（探针帧执行后填充）
    probed: 6,                // 本次检测的锚点组数（桌面壳下 +1 侧边栏面）
    drifted: []               // 空数组 = 全部精修在本构建上生效
  },
  checkedAt / publishedAt     // epoch ms
}
```

- **降级路径同样发布**（`status: "degraded"` + `reason` + `lastError`）——诊断方能区分"插件未安装"与"已安装但宿主 seed 换代"。
- 纯只读镜像：不新增网络请求、不写持久化、渲染失败被吞——诊断通道坏不了皮肤。

## 锚点依赖清单（宿主升级风险面）

**这是本文档存在的核心原因：如实列出插件对宿主 DOM/token 的每一处依赖、失效后果与已有对策。**

| 锚点 | 性质 | 若失效的后果 | 对策 |
|------|------|-------------|------|
| 玻璃材质类名（`.uV2eYG_*` 等 13 组，材质样式表 `lib/client.js:2074-2350`） | 构建哈希类名 | 仅玻璃精修**静默失效**（外观损失，功能无损） | 漂移探针检测并 `console.warn` + 机读快照（`lib/client.js:2366-2425`）；规则本身选择器组冗余 |
| composer 输入框（`data-composer-input` 主锚 + textarea/contenteditable 三级兜底，`lib/client.js:1905-1920`） | Lexical DOM 形态 | 输入框透明度滑杆失效 | issue #50 三轮修复后改为稳定指纹优先 |
| `--dsw-alias-*` / `--dsw-specific-*` token 名（如 `--dsw-specific-sidebar-fill`） | 官方 token 契约 | 对应通道不上色 | token 契约已文档化（[themes-spec.md](./themes-spec.md)），这也是**建议官方承诺稳定的接口面** |
| 设置插槽 `settings.section` / `settings.dreamSkin.item`（`lib/client.js:5206,5526`） | 官方插槽名 | 设置 UI 不出现，皮肤仍生效 | 属公开插件 API；跟随官方命名 |
| 第三方壳类 `.dshDesktopSidebarSurface`（`lib/client.js:2347`） | **非官方壳的类名** | 桌面侧边栏透明度不一致（issue #55 原型） | 桌面规则纳入漂移探针；官方桌面版若提供语义属性可即刻切换契约 |
| `[role="dialog"]` 等 ARIA 契约（`lib/client.js:1922,6043`） | 无障碍标准 | 理论不存在失效 | ARIA 是规范而非宿主私有物 |

## 安全边界

- `/dream-skin/api`：仅回环 Host（或显式配置的 trusted authority）+ `sec-fetch-site` / Origin 同源校验 + 严格 JSON 围栏 + 32 MiB 体积上限（`lib/index.js:88-158`）。防 DNS rebinding / 跨站打点。**无鉴权**——设计目标是本机单用户场景，文档如实声明。
- 壁纸 URL：仅 `http(s):` / `data:image/`，控制字符拒绝，出口转义（`lib/client.js:4171-4176`）。
- 渐变值：拒绝 `url()` / `image-set()` / `element()` 等资源拉取函数，写入与渲染双重校验（v9.26.0+，`lib/client.js:4192-4204`）。
- 主题包导入：本地文件 / URL hash base64，结构 + 十六进制色值校验，失败回滚，**不发起任何远程拉取**（`lib/client.js:3591-3637,3695-3710`）。
- 出厂壁纸：原创生成的抽象弥散光图（7.2KB data URL 内嵌，零远程请求）；替换自旧版真人照片，旧图用户由一次性迁移自动换为新图（内容三重指纹精确匹配才写入，`lib/client.js:4671`）。旧照片仅存于 git 历史与工作区截图（`docs/screenshots/` 待真机重截），插件运行期不再分发该图像。
- 遥测：**无**。唯一第三方网络目标：可选开启的"必应每日壁纸"定时刷新（域名为第三方 uapis.cn 代理，默认关闭、显式开启，`lib/client.js:4244-4262,4527`）。

## 已验证 / 未验证（诚实清单）

**已自动化验证**（`npm test`，69 用例，Node 18/20/22 CI）：
- 双代宿主 seed 探测与全量降级（哑模块路径）；
- 动态端口重启 + 清壁纸后无出厂壁纸闪现；
- 桌面侧边栏规则的存在性与作用域限定；
- 宿主 API 的类型围栏 / 方法围栏 / 体积围栏 / 超大体不泄漏栈；
- URL 与渐变壁纸的注入拒绝（写入 + 渲染双层）；
- 出厂壁纸迁移的负向路径（同长度走私 / 同字节数空白载荷 / 当前出厂图幂等——任何一步指纹不匹配都不写入）；正向路径经一次性离线测试确认后，旧图素材不进仓库。

**未验证 / 无法承诺**：
- 官方 Desktop 预览版的像素级真机效果（假 DOM 测试无法替代，需装官方包逐项截图核对）；
- `docs/screenshots/` 两张截图仍是旧出厂壁纸时期的真机图，待真机重截为新壁纸版本（不用合成图冒充）；
- 玻璃材质类名在任意未来构建上的命中率（漂移探针只能报告失效，不能预防）；
- 状态文件无 schema 版本字段——旧版格式升级兼容靠宽容读取（`lib/index.js:58-65`），未做前向演练。

**卸载残留**：`$DSH_HOME/dream-skin.json` 保留（用户数据，插件不主动删除），其余状态在浏览器侧可被官方"一键还原"清除。

## 对官方的三条兼容契约建议

若官方桌面版/插件体系愿意提供以下任一稳定面，本插件承诺第一时间从哈希类名迁移到契约：

1. 语义 data 属性（如 `data-dsh-sidebar-surface`）替代构建哈希类名——消灭上表第一行全部风险；
2. `--dsw-*` token 名单进入官方 CHANGELOG 的"公开契约"节（本仓库 `themes-spec.md` 可作为初稿素材）；
3. loader 工厂异常隔离（宿主侧 try/catch 每个插件工厂）——目前由插件单方面保证不抛错，宿主加一道门对所有第三方插件都好。
