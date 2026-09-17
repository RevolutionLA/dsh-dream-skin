# 贡献指南

> 写代码的地方，可以很安静。谢谢愿意来添一块砖。

## 开发环境

- Node.js `>=18`，pnpm
- 客户端 bundle 免构建：直接以 `__ModuleLoader__` 格式编写 `lib/client.js`

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
npm install
npm test        # VM 冒烟测试（factory 求值、apply 挂载、主题包导入/持久化）
```

本地迭代：`dsh plugin --profile web add .`（link 依赖，改完保存重启 DSH 即生效）。

## 分支规范

- `main`：稳定分支，保持可安装、回归门全绿
- 功能 / 修复请从 `main` 切出：`feat/<主题>`、`fix/<主题>`、`docs/<主题>`

## 提交 Issue

- Bug 请附：版本号、重现步骤、预期 / 实际、截图（有模板）
- 安全问题**不要**开公开 issue，参见 [SECURITY.md](./SECURITY.md)

## PR 流程

1. Fork（或直接切分支）→ 改动 → `npm test`
2. Commit message 遵循 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)（`feat:` / `fix:` / `docs:` / `chore:`）
3. Push 并开 PR，使用 PR 模板，勾完自查清单
4. 等待 review；通过后 squash merge 进 `main`

## 几条约定

- 新增皮肤 / 文案需同步**全部 8 种语言词典**（`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`）
- 改皮肤 token 后重跑 `scripts/generate-skin-mockups.cjs`，保持预览与真实皮肤一致
- 纯原生接入：无注入、不改安装包、不做破坏性更改，失败可回退
- 主题 token 契约见 [docs/themes-spec.md](./docs/themes-spec.md)

---

欢迎一起来做主题库、在线 Studio、更多主题。开始之前，不妨先在 Discussions 里打个招呼。
