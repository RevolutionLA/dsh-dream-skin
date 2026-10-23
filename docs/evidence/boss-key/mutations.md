# 老板键反向破坏记录（10.23.0）

每次只改 `lib/client.js` 的一处，跑 `node --test tests/client.bosskey.test.cjs`，记下翻红的用例，再恢复原文件。

| 破坏 | 翻红用例（节选） |
|---|---|
| M1 去掉渲染门 | AC2+AC33 enter；AC4 a rotation probe in flight at entry lands later；AC5+AC33 exit；AC6 pressing during RESTORING voids the decode and returns to boss; the late decode paints nothing；AC7 five presses inside 120ms = one press; no url( frame while boss；AC8 restart onRestart=restore-last with boss-active=1 ⇒ boss；AC8 restart onRestart=always-boss with boss-active=0 ⇒ boss；AC8 host-only state (empty localStorage) under default solid-first；AC14+AC34 solid-first |
| M2 进入时不 abandon 在飞轮换 | AC4 a rotation probe in flight at entry lands later |
| M3 去掉 bootVeil | AC8 host-only state (empty localStorage) under default solid-first；AC14+AC34 solid-first |
| M4 去掉 storage 事件里的 stateCache.set | AC15 B leaves boss on A's exit and a re-apply of B reads the fresh value (stateCache updated) |
| M5 标语不随老板模式隐藏 | AC2+AC33 enter；AC5+AC33 exit；AC6 pressing during RESTORING voids the decode and returns to boss; the late decode paints nothing |
| M6 标语不随 bootVeil 隐藏 | AC14+AC34 solid-first |
| M7 去掉 120ms 防抖 | AC7 five presses inside 120ms = one press; no url( frame while boss |
| M8 去掉 RESTORING 的 epoch 校验 | AC6 pressing during RESTORING voids the decode and returns to boss; the late decode paints nothing |
| M9 BOSS 期间 tick 不停 | AC3 boss freezes rotation；AC21 refresh during boss never fires; restart-interval waits a full period after exit; keep-phase fires on the first tick; lastFiredAt untouched by the key |
| M10 restart-interval 不推迟刷新 | AC21 refresh during boss never fires; restart-interval waits a full period after exit; keep-phase fires on the first tick; lastFiredAt untouched by the key |

全部 10 处都至少有一条用例翻红；M2（abandon）与 M1（渲染门）各自独立让 AC4 翻红。M4、M7 最初没翻红，补强了 AC15（两窗口都以 boss 启动）与 AC7（20ms 后第二次按下必须被丢弃）之后才翻红。

## 与分钟间隔合并后的集成点（10.23.0 合集分支）

`exitBossMode` 的 restart-interval 改用 `refreshIntervalMs()`（分钟键，10.22.1）。AC21 改为 5 分钟间隔：退出后 4 分 30 秒不刷新，满 5 分钟后刷新。

| 编号 | 破坏 | 结果 |
|---|---|---|
| S1 | `now + refreshIntervalMs()` 退回 `now + readWallpaperRefreshConfig().hours * 3600000` | AC21 翻红 |
| S2 | 删除 `runScheduledWallpaperRefresh` 里的 `bossRefreshNotBefore` 门 | AC21 翻红 |
| S3 | `refreshIntervalMs() / 60`（单位错） | AC21 翻红 |

三次都已恢复，恢复后 `tests/client.bosskey.test.cjs` 25/25 通过。

## 默认键 ⌘⌥V / Ctrl+Alt+V 反向破坏（4 次，均被 `tests/client.bosskey.test.cjs` 抓住）
| # | 破坏 | 结果 |
|---|---|---|
| D1 | 保留黑名单去掉 `!phys.alt` 例外（Ctrl+Alt+V 被当成粘贴拒收） | fail 1 |
| D2 | 宿主注册改回 `defaults: {}` | fail 1 |
| D3 | 关掉旧默认 Ctrl+Alt+Shift+B 的迁移 | fail 1 |
| D4 | 宿主拒收默认时不再以 `{}` 重注册 | fail 1 |
