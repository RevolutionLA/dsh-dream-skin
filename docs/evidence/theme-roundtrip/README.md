# 主题往返切换问题复现证据

以下证据采集自 macOS 上正式打包的 DeepSeek YukiRyou 桌面应用。测试期间，
插件市场安装的正式版 `dsh-dream-skin` 始终保持停用，仅加载 fork 中指定提交。

## 问题复现

1. 安装 fork 提交 `69a22c5cd5894130f121f06afeb117813f5a6521`
   （测试版本 `0.4.13-yukiryou.3`）。
2. 重启正式打包的桌面应用。
3. 打开「设置 → Theme / 外观」。
4. 先选择另一套皮肤，再切换回「Material 粉」。

复现结果：Material 粉卡片和强调色会立即切换，但背景与侧边栏的壁纸洗色仍然
停留在上一次选择的皮肤，形成同一界面同时使用两套主题令牌的错误状态。

真实运行时自动化复现中，从「液态玻璃」切换到「Material 粉」后读取到：

```text
--dsw-alias-bg-base:          rgba(233, 238, 246, 0.8)
--dsw-specific-sidebar-fill:  rgba(255, 255, 255, 0.8)
--dsw-alias-brand-primary:    #e91e63
```

其中 `#e91e63` 是当前 Material 粉的强调色，但背景仍是上一套液态玻璃的灰蓝色
洗色。这组数据证明问题不是主观色差，而是背景主题状态确实落后一次切换。

### 复现截图

- `bug-material-selected-stale-liquid-glass.jpeg`：界面已经选中 Material 粉，
  但仍残留上一套液态玻璃的背景洗色。
- `bug-main-stale-liquid-glass-after-material-selection.jpeg`：在相同错误状态下
  关闭设置窗口后的主界面。
- `bug-material-selected-stale-midnight.jpeg`：使用已知有问题的版本执行
  「午夜黑 → Material 粉」往返切换后的画面。

## 修复后对照

安装 fork 提交 `19292fda31c70ce22dca2c6e7e0711ea9cc12f9f`
（测试版本 `0.4.13-yukiryou.4`），重启同一正式应用，并重复完全相同的
「午夜黑 → Material 粉」操作。

- `fixed-material-after-midnight.jpeg`：修复后 Material 粉的背景、侧边栏、
  设置弹窗和强调色能够在同一次切换中一起正确生效。

## 原因与修复

根因是 `theme/change` 采用同步派发。插件原先在主题事件监听器中立即重算壁纸
令牌，这会嵌套发布一次新的主题快照；当外层事件继续派发时，呈现器又把旧的、
尚未重算壁纸的快照应用到界面，最终造成背景落后一个主题。

修复方案是把壁纸重着色延后到当前同步 `theme/change` 事件栈结束后执行，并在
插件自身发布令牌覆盖事件时跳过重复调度。这样最后交给呈现器的一定是当前皮肤
对应的完整快照，不会再被外层旧快照反向覆盖。
