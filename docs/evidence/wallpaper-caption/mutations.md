# 10.22.2 wallpaper caption — reverse mutations

Each mutation applied to `lib/client.js` alone, then `node --test tests/client.caption.test.cjs`; restored afterwards (10/10 green).

| # | Mutation | Result |
|---|---|---|
| M1 | `captionTextEl.textContent = …` → `innerHTML = …` | red: AC27 (1 fail / 9 pass) |
| M2 | font whitelist removed (`typeof src.font === "string" ? src.font`) | red: AC26 (1 fail / 9 pass) |
| M3 | caption node rebuilt on every `applyCaption()` (image change) | red: AC25 (1 fail / 9 pass) |
| M4 | caption inserted with `document.body.prepend` instead of `wallpaperEl.after` | red: AC24 + AC25 (2 fail / 8 pass) |
| M5 | truncation by UTF-16 `slice` instead of code points | red: AC27 surrogate pair (1 fail / 9 pass) |

AC33 / AC34 (boss key / bootVeil suppression) are N/A on this branch: `isCaptionSuppressed()` is a stub that returns false, owned by whichever of T2/T4 lands later.
