# Evidence — dockkit right panel / guide capsule compatibility

Captured on DSH Desktop 0.2.0-rc.2 (Windows), profile `desktop`, with
`dsh-better-sidebar` 0.24.1 and a wallpaper wash live. Both frames are the
reporter's own captures of one inconsistency in the right sidebar — the same
hover tint producing two different results side by side. They are **not** an
after-fix capture of this PR.

- `01-guide-capsule-hover-before.jpg` — hovering **文件** (`ui-sidebar-right`):
  `:hover` writes `background: var(--dsw-alias-interactive-bg-hover)`,
  *replacing* the fill with the translucent tint, so over a wallpaper the
  capsule loses its fill and reads as transparent.
- `02-terminal-guide-hover-reference.jpg` — hovering **新建终端** just below it
  (`ui-sidebar-terminal`): the fill stays `--dsw-alias-bg-layer-1` and the same
  tint is layered on top (`main { position: absolute; inset: 0 }`). Same token,
  visible fill.

PR3 makes the first behave like the second: keep the fill, layer the tint.

The after-state was measured on the same machine with a DOM probe instead of a
screenshot: `[data-sidebar-right-guide-entry]:hover` resolves to
`background-color: rgb(28, 26, 42)` (layer-1) plus the hover gradient, the
docked hosts resolve to `rgba(18, 16, 26, 0.67)` straight from
`--dsw-specific-sidebar-fill` — identical to the left column and the title
strip — and the 侧边栏透明度 slider moves all of them together.
