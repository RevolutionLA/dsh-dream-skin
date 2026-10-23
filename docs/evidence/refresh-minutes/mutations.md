# 10.22.1 refresh-minutes — reverse mutations

Each mutation applied to `lib/client.js` alone, then `node --test tests/client.refreshminutes.test.cjs`; restored afterwards (11/11 green).

| # | Mutation | Result |
|---|---|---|
| M1 | `refreshIntervalMinutes` trusts `minutes` without the `mirrorHours === hours` check | red: AC17 (1 fail / 9 pass) |
| M2 | `REFRESH_MINUTES_MIN = 1` | red: AC19 boundaries (1 fail / 9 pass) |
| M3 | due check uses `hours * 3600000` instead of `refreshIntervalMs()` | red: AC20 scheduling (1 fail / 9 pass) |
| M4 | migration moved to the start of `loadFromHost` (before the probe settles) | red: AC18 host-first (1 fail / 9 pass) |
| M5 | `null` / blank input coerced by `Number()` (→0→5) instead of ignored | red: AC19 boundaries + AC19 null/blank (2 fail / 9 pass) |
