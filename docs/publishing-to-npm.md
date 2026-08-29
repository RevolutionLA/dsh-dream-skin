# 发布到 npm 与 GitHub

`dsh-dream-skin` 是一个标准的 dsh 插件包。如果希望用户能一条命令 `dsh plugin ... add dsh-dream-skin`
安装，需要把它发到 **npm 官方源**，并把源码托管到 **GitHub**。

> DSH (rc.6) **没有单独的插件市场**——插件分发渠道**就是 npm 源**。只要有 `dsh.bundle`（host patch 层）和
> `dsh.client`（浏览器 bundle）的包，就能被 `dsh plugin --profile web add <package>` 安装。

## 一、发布前检查

1. 包名全局唯一。scope 名更安全（如 `@你的账号/dsh-dream-skin`）——如需改 scope，改 `package.json` 里的
   `name` 即可。
2. 填好 `author`、`repository`、`description`、`keywords`（均已预留）。
3. 确认 `files` 里带上了这些文件（当前已配置：主 README + `docs/i18n/` 多语言 README）：
   ```json
   "files": ["lib/index.js", "lib/client.js", "lib/types", "cordis.patch.yml",
             "README.md", "docs/i18n", "docs/previews", "docs/screenshots",
             "docs/examples", "docs/themes-spec.md", "docs/design-philosophy.md"]
   ```
   这样 npm 只会上传这些，不会带源码里不需要的东西。多语言 README（en/ja/ko/es/fr/de/ru）放在
   `docs/i18n/` 下（根目录只保留中文 `README.md`），同样会随包发布。

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

## 五、常见注意事项

- **镜像源**：发布必须 `--registry https://registry.npmjs.org`。
- **版本号**：从 `8.28.0` 起改用**日期式版本** `M.D.X`（月.日.当日第几个版本）。例如 8 月 28 日首版 `8.28.0`、当日再发 `8.28.1`、次日 `8.29.0`。当前最新为 `8.30.0`（首发 0.2.0 → 0.4.15）。
- **peerDependencies**：以 `^0.1.0-rc.6` 对齐 DSH 当前版本；DSH 升级到正式版后记得跟进。
- **LICENSE / README**：npm 页会展示仓库提交的内容，建议发布前同步。
- **files 白名单**：已含主 README、`docs/i18n/` 多语言 README 与 `docs/previews`、`docs/screenshots`、`docs/examples`、`docs/themes-spec.md`，
  保证 npm 包页的 README 截图 / 预览色卡 / 示例链接不 404。

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

