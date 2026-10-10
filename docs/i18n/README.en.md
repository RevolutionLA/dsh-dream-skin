<p align="center">
  <a href="../../README.md">中文</a> · <strong>English</strong> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.ru.md">Русский</a>
</p>

<div align="center">

# dsh-dream-skin 🔮

**Give DeepSeek Harness a face that's restrained, clear and textured.**

Native skinning · wallpaper · accent color · shareable theme packs — an elegant implementation built entirely on DSH's
official `--dsw-*` token system. Install once, use forever.

> **TL;DR: your coding space can be quiet.**

| 🎨 8 original themes | 🖼️ wallpaper + diffused glow | 🎯 restrained accent | 📦 shareable theme packs |
|---|---|---|---|

> 1-line install · purely native (no injection, no installer patches) · survives DSH updates

</div>

---

## 🎮 Two ways to play, one plugin

<table>
  <tr>
    <td align="center" width="50%"><h3>🪄 Way #1: elegant out of the box</h3></td>
    <td align="center" width="50%"><h3>🧱 Way #2: DIY on your terms</h3></td>
  </tr>
  <tr>
    <td>8 designer-tuned <b>preset skins</b> (the Mirage series), light &amp; dark, each with its own diffused-glow background.<br/><b>Put one on and it's premium — zero tuning.</b></td>
    <td>On top of any preset you can <b>swap the wallpaper (local / URL / gradient)</b>, <b>stack an Accent color</b>, or <b>import &amp; share a theme pack</b> — every internal token is within reach.<br/><b>Shape it however you like.</b></td>
  </tr>
</table>

The two ways are layered and independent: a preset decides the "material &amp; base tone"; DIY is a pure overlay
(`overrideTokens`), toggle it on/off and revert in one click.

---

## 📸 Screenshots

> Real screenshots, not mockups. Left: DSH after applying a skin; right: the dedicated **Theme / Appearance** section in Settings.

<p align="center">
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🎨 Preview — the Mirage series

> **Way #1 · elegant out of the box.** The 8 skins below are generated from each skin's **real tokens + dedicated
> diffused-glow background** — what you see is what you get. Click to zoom for the fine material detail.

<table>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/abyss.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/abyss.png" width="230" alt="abyss"/></a><br/><b>abyss</b> · 🕶️ Deep Blue<br/><sub>calm deep indigo, restrained and quiet</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/aurora.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/aurora.png" width="230" alt="aurora"/></a><br/><b>aurora</b> · 🌌 Aurora Green<br/><sub>crisp translucent cool teal, natural cold tone</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/nebula.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/nebula.png" width="230" alt="nebula"/></a><br/><b>nebula</b> · 🪐 Nebula Purple<br/><sub>deep diffused violet-blue, hazy and mysterious</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ember.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ember.png" width="230" alt="ember"/></a><br/><b>ember</b> · 🔥 Ember Amber<br/><sub>warm restrained amber orange</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/midnight.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/midnight.png" width="230" alt="midnight"/></a><br/><b>midnight</b> · 🌚 Midnight OLED<br/><sub>minimal pure black, immersive OLED</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ivory.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ivory.png" width="230" alt="ivory"/></a><br/><b>ivory</b> · 📐 iOS Flat<br/><sub>minimal flat white, iOS system gray + restrained blue</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/mist.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/mist.png" width="230" alt="mist"/></a><br/><b>mist</b> · 🧊 Clear Bright<br/><sub>crisp, bright glass feel, translucent + blurred</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/rose.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/rose.png" width="230" alt="rose"/></a><br/><b>rose</b> · 🌸 Material Pink<br/><sub>bright vivid pink, Google Material flat colors</sub></td>
  </tr>
</table>

> Light & dark both covered: `mist`, `ivory` and `rose` are light themes, the rest are dark. Not into presets? See **Way #2** below. Each preset also ships its own tuned defaults (glow opacity / blur, sidebar & composer transparency, dialog opacity, glass material): switching skins retunes every value you have not set yourself, and all 8 presets pass 228 measurable quality gates (217 palette + 11 craft) (OKLCH elevation ladder, WCAG 2.1 + APCA text contrast, signal-hue separation, cross-skin distinctiveness).

---

## 🧱 Serious DIY space (Way #2)

> Beyond the presets, dsh-dream-skin gives you a full customization system, start here to craft a workspace that's
> uniquely yours.

| Capability | What you can do |
|------|------|
| 🖼️ **Wallpaper 2.0** | Local image / **image URL** / **gradient presets**; plus **opacity / blur**; each skin even **suggests** a gradient and can **auto-dim** (lower distraction when focusing) |
| 🌈 **Per-user Accent** | Stack a custom brand-accent over the active skin (`overrideTokens` layer, the skin untouched): **12 one-click preset swatches**, color picker, randomize, and a clear/restore option |
| 📦 **Theme-pack import / export / share** | A `*.dsh-theme.json` = manifest + full tokens. Import a file, one-click apply, or copy a **share link** (encoded in the URL hash) |
| 🪟 **Popup opacity** | A slider that controls dropdown / overlay / dialog bottom-fill transparency, persisted; every surface painted from the popup-base token (Settings, the plugin manager, trajectory tooltips, floating cards) shares a readability floor at 92% opaque — the skin's own elevation fill — while the menu and scrim legs stay full-range |
| 🧩 **Local pack library** | Your imported packs in one place; **apply / favorite / remove** in a click |
| 🎲 **Surprise me** | Randomly switch to a different theme; **star** favorites to switch fast |
| ✅ **Validation + rollback** | Pack import validates format / required tokens / color legality; failures or removals fall back safely |

> Everything layers on top of a preset, **toggle it on/off and revert to DSH's built-in look in one click** — go ahead
> and experiment, nothing can break.

---

## ⚡ One-line install

**Copy this sentence to your DSH and it installs everything for you:**

> Please install the dsh-dream-skin skin plugin (https://github.com/RevolutionLA/dsh-dream-skin, or the npm package `dsh-dream-skin`), then tell me how to restart DSH Web.

Prefer the CLI? One command:

```sh
dsh plugin --profile web add dsh-dream-skin && dsh web
```

> 🚀 **Now on npm!** With DSH installed, add it in one command — no cloning needed.

> **Homage to [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).** But the approach is different:
> Codex injects CSS into the desktop client's renderer via CDP, whereas DSH is a **token-driven Web GUI** that ships
> first-class "third-party plugins registering themes". So this plugin is **purely native** — no injection, no binary
> patches, and it won't break on client updates.
>
> **Not an official product.** Just a way to dress up your DeepSeek Harness workspace.

---

## 🏆 Why it earns a star (vs similar DSH skinning plugins)

> A look across the lane: similar plugins either port over an existing palette (pretty, but a single on/off switch),
> lock themselves to a single aesthetic, or focus on bridging external wallpapers in. We built skinning as a
> **complete, tunable material & color system** — the goal isn't "flashier", it's "more precise, more restrained,
> more durable to look at", like a pane of glass polished over and over. **Taste + tunability is our moat.**

| Capability | Ours | [dsh-catppuccin-theme](https://github.com/NoNameLeGo/dsh-catppuccin-theme) (palette port) | [dsh-theme-mineradio](https://github.com/dhicoc/dsh-theme-mineradio) (single-aesthetic custom) | [dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine) (wallpaper engine + liquid glass UI) |
|------|:---:|:---:|:---:|:---:|
| **8 original designs** (not a palette port: original tokens + diffused glow) | ✅ | ❌ (4 official Catppuccin palettes) | ❌ (1 champagne-gold aesthetic) | ❌ |
| **Frosted / Liquid glass dual-material** one-click switch | ✅ | partial (fixed glass feel) | ❌ | ❌ |
| **Independent opacity sliders for input box / popups** | ✅ | ❌ | ❌ | partial (settings window / floaters / left sidebar / titlebar each have independent opacity & blur; input cards & bubbles get independent color & fidelity, opacity follows the global slider) |
| **Ready-tuned factory config** (restart after install and it just looks right) | ✅ | ❌ | ✅ (itself a finished product) | partial (factory glass defaults + 7 glass presets; no factory wallpaper / skins) |
| Custom wallpaper + opacity/blur | ✅ | ❌ | ❌ | ✅ (core ability) |
| **Wallpaper 2.0** (URL / gradient presets / per-skin suggestion / auto-dim / Bing daily + scheduled refresh) | ✅ | ❌ | ❌ | partial (local image / video upload + timed rotation + fit modes; no URL / gradient presets / Bing daily) |
| **Per-user Accent** (overlay layer, the skin untouched) | ✅ | ❌ | ❌ | partial (6 presets + custom accent driving buttons / switches / links / nav selection / sliders / glass highlight; no "skin overlay" concept) |
| **Theme-pack import/export + share links** (JSON, code-free distribution) | ✅ | ❌ | ❌ | partial (font sets & glass presets export / import JSON; no share links) |
| Local pack library + favorites + surprise-me | ✅ | ❌ | ❌ | ❌ |
| **Two host generations compatible + runtime capability detection** (degrades gracefully across host upgrades, no errors) | ✅ | unknown | unknown | partial (a single open peer range covers both the 0.1.5-rc.1+ and 0.2.x host lines; host-shape / capability detection with local fallbacks; the kernel floor 0.1.5-rc.1 is a hard requirement) |
| Validation + rollback (no destructive changes) | ✅ | partial | — | partial |

> **In one sentence**: want Catppuccin's brand colors or mineradio's vibe? This plugin's theme-pack system can build
> or layer them — not the other way around.

---

## ✨ Features

| Capability | Description |
|------------|-------------|
| 🎨 **8 bundled presets (Mirage)** | Switch instantly under **Settings → Theme / Appearance**, light & dark |
| 🖼️ **Custom wallpaper** | Pick a local image (auto-compressed ≤2MB), tune **opacity / blur** |
| 🧊 **Glass materials (Frosted / Liquid)** | One click switches the glass character; transparency sliders read **right = more see-through**; ONE blur knob drives both the wallpaper and every glass surface |
| 🖼️ **Shipped look out of the box** | First install comes fully styled: Nebula skin + bundled wallpaper + tuned glass numbers — restart and it is ready |
| 🌤️ **Bing daily wallpaper (pre-filled)** | Advanced wallpaper ships with the Bing daily photo API pre-filled — hit "Apply" to use; any image URL + auto-refresh works too |
| 🔤 **Opaque inner surfaces** | Cards, inputs, message bubbles stay readable — never washed out |
| ↩️ **Default restore** | Back to DSH's built-in appearance (follow system) in one click |
| 💾 **Three-layer persistence** | Skin & wallpaper live in `localStorage` **and a host-side file** — survives reload, and survives the new port DSH Desktop gets on every launch |

---

## 🧩 What kind of plugin is this

**A standard dual-face "everything-is-a-plugin" `dsh-plugin` — loaded and used exactly like the official `ui-theme` package.**

DeepSeek Harness's motto is *everything is a plugin*: models, tools, sandboxes, sessions, UI, even the Agent Loop
itself are plugins. `dsh-dream-skin` ships skinning as an npm package that is **isomorphic with the official UI
packages**:

```text
            ┌──────────── dsh-dream-skin (standard dsh-plugin / dual-face) ─────────────┐
            │  dsh.bundle   → cordis.patch.yml inserts the dream-skin entry  (host half)│
            │  dsh.client   → lib/client.js (browser bundle)                (browser half)│
            └───────────────────────────────────────────────────────────────────────────┘
```

- **Install command = the official one**: `dsh plugin --profile web add dsh-dream-skin`
- **Uses official extension points**: `ctx.theme` (register themes), `ctx.theme.overrideTokens` (override layers),
  `ctx.slots` (mount UI into a dedicated **Settings → Theme / Appearance** section).
- **Manifest contract matches official packages**: `dsh.bundle` + `dsh.client` + `exports["./client"]`.

In other words: you are not installing a fringe script — this is a standard skin plugin inside DSH's official plugin
system.

---

## ⚡ Quick start (3 steps)

```sh
# 1. install
dsh plugin --profile web add dsh-dream-skin
# 2. restart
dsh web
# 3. open Settings → Theme / Appearance → pick a skin → done.
```

> Installs the published npm package — no cloning. If `dsh plugin add` reports a workspace error, append `-w`.
> Write the version number out in two situations (`npm view dsh-dream-skin version` gives it to you on the spot): **within 24 hours of a release**
> (pnpm's cooldown silently installs an older build), and **when upgrading an old profile from the 9.x era** (`^9.29.0` can never reach 10.x)
> — see the "Install" and "Update" sections below.

## 📦 Install

Pick any of the four options, then **restart DSH Web** (the current session will be interrupted, but DSH sessions are
persisted to disk and recover after restart).

### Option A: From npm (published, **recommended**)

```sh
dsh plugin --profile web add dsh-dream-skin
```

> **Within 24 hours of a release, pin the version number explicitly**: `dsh plugin --profile web add dsh-dream-skin@<latest version>`
> (look the number up on the spot with `npm view dsh-dream-skin version`). The desktop is a separate case: its profile is managed
> **exclusively by the Electron app** and the CLI hard-rejects it — the path that actually works is in [docs/desktop-support.md](../desktop-support.md).

### Option B: From GitHub (pinned to a verified commit)

```sh
dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<40-char-commit>'
```

> Pinning to the commit of a release means new `main` changes never silently alter your installed copy.

### Option C: From a Release tarball (offline / no git)

Download `dsh-dream-skin-<version>.tgz` from the [Releases](https://github.com/RevolutionLA/dsh-dream-skin/releases)
page (it ships the built `lib/client.js`, so no prepare script runs on install), then:

```sh
dsh plugin --profile web add ./dsh-dream-skin-<version>.tgz
```

### Option D: Clone and install from the local path (development)

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
dsh plugin --profile web add .
```

> `dsh plugin` anchors relative paths to the directory **you run the command in**, installing a link dependency
> pointing at your clone: edit the source, save, restart DSH — no reinstall needed.

**Restart and verify:**

```sh
dsh web
dsh --profile web --dump-config | grep -A2 dream-skin   # a dream-skin loader entry should appear
```

Open **Settings → Theme / Appearance** to see the **Skins**, **Accent**, **Wallpaper** / **Advanced Wallpaper**, and **Theme Packs** rows.

> The `-w` (workspace) flag is needed on a bare `add` because every profile ships a `pnpm-workspace.yaml`; pnpm treats
> the profile directory as a workspace root, so a bare add fails with `ERR_PNPM_ADDING_TO_ROOT`. If your profile already
> uses the workspace, you won't need to repeat it.

## 🔄 Update / Uninstall

**Update to the latest** (when installed from the npm release):

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # restart to pick it up
```

> Stuck on an old version after an update? pnpm's minimum-release-age (supply-chain) policy can hold back a
> freshly published release. In the profile dir run:
> `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0` to force it.

> **On an old profile, use `add` with an explicit version instead of counting on `update`**: `update` reuses the **dependency range already written in
> `package.json`**, and a `dsh-dream-skin: ^9.29.0` from the 9.x era can never reach 10.x under semver (a caret only floats inside one major version),
> so `update` reports "already up to date" while the UI stays old. To rewrite that dependency:
>
> ```sh
> dsh plugin --profile web add dsh-dream-skin@<latest version>   # npm view dsh-dream-skin version looks the number up on the spot
> ```
>
> This is not a new defect, it is **an old fix that never arrived** — when triaging "I clearly updated but nothing changed", first check the version
> actually installed; the steps are in [docs/publishing-to-npm.md](../publishing-to-npm.md), section 9.

**Uninstall:**

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # restores the official appearance
```

---

## 🧩 Compatibility

| Item | Value |
|------|-------|
| DeepSeek Harness (`dsh`) | **One build for two host generations**: stable `0.1.0-rc.6` / `0.1.1-rc.x` (peers pinned to `^0.1.0-rc.6`) and DSH master (post-split module table). **Skin vanished after a host upgrade while the plugin still shows as installed?** The peer window most likely made the host skip the whole bundle — emergency escape: `dsh plugin allow-version dsh-dream-skin@<version> <host runtime version>` (an **explicit override at your own risk** that force-admits an untested combination, not a recommended practice); symptom triage and full steps in [docs/desktop-support.md](../desktop-support.md) |
| Node.js | `>=18` |
| Browser | modern Chromium / WebKit (native CSS variables & `matchMedia`) |
| Desktop | **Third-party DSH Desktop shell:** adapted and verified on real hardware (issues #50/#51/#55). **Official DSH Desktop:** the evidence supports "**expected to load**", not "supported" — it rests on two static facts (same Electron front-end; the `dsh.client.platform = "web"` we declare matches all 21 client packages the host ships). Its profile directory and install command have **never** been verified on this machine, so this document gives **no** copy-pasteable desktop install command. <!-- desktop-claim: load-expected-unverified -->When adding the plugin, the `--profile` value must be a template name the host **itself** ships; the profile some third-party docs teach does not exist there, and copying it installs into an empty shell profile (you see nothing after a restart). Evidence in **[docs/desktop-support.md](../desktop-support.md)** → "official desktop: pending verification". Full anchor list / security boundary / verified-unverified matrix: same document |

> When upgrading DSH, bump the peerDependencies in `package.json` accordingly.

---


<details>
<summary><b>How it works / Persistence notes / Developing, extending themes (click to expand)</b></summary>
## ⚙️ How it works

DSH's theme system is token-based: the web shell ships `--dsw-*` design tokens, and `ThemeRuntime` lets third-party
plugins register themes that override the alias layer (`--dsw-alias-*`). This package is a standard dual-face plugin:

```text
                ┌─────────────────────────────────────────────┐
                │          dsh-dream-skin (dual-face plugin)    │
                ├────────────────────────────┬────────────────┤
    Host half   │  lib/index.js              │  Browser half  │
                │  cordis.patch.yml inserts  │  lib/client.js │
                │  dream-skin loader entry   │  __ModuleLoader__│
                └────────────────────────────┴────────────────┘
                             │                         │
                     profile tree loaded      /plugins/dsh-dream-skin/client.js
                                                          │
        ┌────────────────────────────────┬────────────────┐
        │                                │                │
   ctx.theme.register(8 skins)     ctx.theme.overrideTokens(wallpaper)   ctx.slots.inject('settings.section' + 'settings.dreamSkin.item')
```

- **Host half** (`lib/index.js`) — a `dsh.bundle` patch layer inserting the `dream-skin` loader entry; `apply` is a
  no-op, exactly like the shipped `ui-*` packages.
- **Browser half** (`lib/client.js`):
  1. registers the 8 skins via `ctx.theme.register(...)`;
  2. restores the saved skin and applies it with `ctx.theme.setTheme(...)`;
  3. renders the wallpaper as a `z-index:-1` fixed backdrop and stacks `ctx.theme.overrideTokens(...)` making the
     main canvas (`--dsw-alias-bg-base`) and sidebar (`--dsw-specific-sidebar-fill`) translucent;
  4. listens for `theme/change` and re-shades the wallpaper wash on skin / scheme switch;
  5. registers a dedicated **Settings → Theme / Appearance** section (`settings.section`) and mounts the five
     feature rows under the `settings.dreamSkin.item` slot.

Each skin carries its `colorScheme` (`light`/`dark`); this plugin stamps it on its own root element `<html>`
(`data-dsh-dream-skin-scheme`) and does **not** lean on the host's `body[data-ds-dark-theme]` — that attribute
belongs to ui-layout's ThemePresenter, whose `dispose()` erases it, and in that absent window a dark skin used to
pick up the light constants. The alias-token overrides are applied as inline custom properties on `<body>` by
ui-layout's ThemePresenter.

## 💼 Persistence notes

- Skin & wallpaper live in **three layers**: an in-memory cache (correct first frame), browser `localStorage` (keys prefixed `dsh-dream-skin:`), and a **host-side file** `$DSH_HOME/dream-skin.json`, read/written over this plugin's own loopback `/dream-skin/api`.
- The file layer is what makes **desktop** survive: DSH Desktop gets a new OS-assigned port on every launch, so the browser origin changes and `localStorage` alone would forget everything. The host file is the authoritative state across port changes and restarts.
- Why not Host settings? The Host settings wire only exposes an allowlisted set of namespaces to browser clients
  (`WEB_SETTINGS_NAMESPACES` in `dsh-host-apiproxy`), so a third-party namespace would answer `settings-not-exposed`;
  the product itself keeps remote browser preferences process-local. `localStorage` matches that boundary and
  survives reloads.

---

## 🛠️ Development / extending themes

The client bundle is written directly in the `__ModuleLoader__` format (the same shape tsdown emits for the shipped
`ui-*` packages), so **no build step** is required. `lib/client.js` may `require` only module-table entities: platform
seeds (`react`, `react/jsx-runtime`, …) and registered client bundles (`@deepseek-ai/dsh-client-runtime/client`, …).

- **Add a built-in skin**: append an object (`id` + `colorScheme` + `tokens`) to the `SKINS` array in `lib/client.js`;
  it then appears in Settings automatically. Add a `skin.<id>` key to **all 8 locale dictionaries**
  (`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`).
- **Ship a theme pack (recommended)**: follow [`docs/examples/sample-theme-pack.json`](../../docs/examples/sample-theme-pack.json) —
  one `*.dsh-theme.json` is importable in Settings and shareable via a link, no code changes needed.
- **Add your own wallpapers**: drop images into [`wallpapers/`](../../wallpapers/) (distribute only what you have rights
  to), then import them via DSH's "Wallpaper" row.
- **Regenerate the previews**: previews are generated by `scripts/generate-skin-mockups.cjs` (real tokens + diffused
  glow) into HTML mockups, then captured as `docs/previews/*.png` with headless Chrome — re-run it after changing a
  skin's tokens to keep the preview in sync with the real skin. `docs/previews/manifest.json` pins each image to three fingerprints — shipped tokens, card markup, PNG bytes and pixel size — and `npm run previews --check` (no browser needed) reddens when a palette changes without a re-shoot, naming the skin; `npm run previews` exits non-zero when no headless browser is found, instead of treating zero output as success. These PNGs are **not shipped in the package**: 2.26 MB of README decoration should not be downloaded by every installer, `npm pack` drops from 2.5 MB to 263 kB, and the README serves the images from GitHub.
- **Validate**: `npm test` (VM smoke tests covering factory eval, `apply()`, and pack import/persistence).
- **Repaint**: reference the `--dsw-alias-*` tokens (full contract in [`docs/themes-spec.md`](../../docs/themes-spec.md)).


</details>
## 📌 Roadmap

> **This table lists unfinished work only.** Anything already shipped lives in the Features section above and in [CHANGELOG.md](../../CHANGELOG.md) — keeping it in two places always drifts, and this project has already drifted once. This table translates the Roadmap of the Chinese `README.md`, which stays the source of truth.
> Every entry carries three things: **why** (from a real issue or measured data, never imagined demand), **size** (S ≈ one evening, M ≈ one feature release, L ≈ needs design before code), **acceptance check** (a check that **can fail** — not "done when I say it is"). Once an item ships, it is deleted from this table. The "won't do" section matters as much as the to-do list: it saves a contributor one wasted round.

### A. Reliability — surviving a host generation change

*Why: measured on `0.2.0-rc.1`, 4 of the 6 host anchor groups drifted — 3 confirmed hash re-rolls, plus 1 (the `lXshSW_*` group) that is host CSS which still exists and whose surface simply is not mounted (split out as `notMounted` since 10.5.0); from the user's side, issue #62 looked like "my skins all disappeared overnight".*

- [ ] **M** Drop the last host hashed class names: move the remaining decorative rules (sidebar / file panel) onto our own `data-dsh-dream-skin-*` markers — composer and nav-icon already prove that path works
      — acceptance: the drift probe reports `drifted: [] && pending: false` on 0.2.x
- [ ] **S** Turn "pre-check against a host rc" into a fixed release step: the day a new rc lands, run the compatibility table once and one real profile load
- [ ] **M** Roll the peer window up to `0.3.x` — **blocked upstream, not on our side**: as of 2026-10-10 the registry's `latest` for `@deepseek-ai/dsh` is `0.2.0-rc.2` and the version list ends at `0.2.1-alpha.2`; `0.3.x` has never been published (`npm view @deepseek-ai/dsh versions --json`). With no target version to align to, this item can be neither started nor verified — the current peer window, exactly as stated in the compatibility table above, already covers **every** host version published to date.
      — acceptance: only once the host really ships 0.3.x, run the compatibility table plus one real profile load, and widen the window only if both pass; if it stays closed, write "not supported" in the docs instead of leaving a silent skip
- [ ] **M** Move the mechanism-level evidence into CI — **laid this round, and it only closes after one real green run**: `wash:check` honours `DSH_WASH_STRICT` (a missing browser or missing host no longer skips but exits 4 and names which one), and `ci.yml` gained a `wash-gate` job (host version read live from the census, third-party co-signed plugins pinned by version, and the log re-read afterwards to confirm no skip line survived). **Configured ≠ ran**: the acceptance check is still "those four computed-style checks show **readings** in the CI log", and until the first green run this item is not done. Full write-up in [docs/computed-style-gate-in-ci.md](../computed-style-gate-in-ci.md)
- [ ] **S** The drift probe cannot cover mount-on-demand surfaces: the question and approval cards only enter the DOM once a conversation actually asks something, so a boot-time sampling ladder would report them as permanently drifted — 10.5.0 keeps them out of the probe on purpose
      — acceptance: after one real question, `anchors` reports hit / miss for both functional anchors, while a freshly opened page still reads `drifted: []`

### B. Publishing and the install channel

*Why: on 2026-09-29 installs were rejected on the official Desktop `0.2.0-rc.2`, while the maintenance machine uses a `link:` workspace install — **this class of problem is invisible under a link install**.*

- [ ] **M** Document an intranet / offline distribution path (the Release tarball mechanism already exists; the copy-pasteable steps don't) | PR-welcome

### C. Desktop operations

*Why: after the official Desktop release a new kind of user showed up — one person looking after a batch of machines. Real contact with that profile is still thin, so take the two cheap items first instead of paving the whole road at once.*

- [ ] **S** Add a schema version field to the state file (upgrades currently rely on tolerant reading; a forward-compatibility drill has never been run)
- [ ] **M** A machine-readable answer to "did the skin actually take effect": a field-by-field reading guide for `$DSH_HOME/dream-skin.json` and `__DSH_DREAM_SKIN_STATUS__`, so a script can decide instead of a person opening the console
- [ ] **M** A batch deployment guide (profile directory layout, `link:` vs registry installs, the semantics of `compatibility.json` exemption keys, dynamic ports)

### D. Product experience

*Why: this is what users see first. But every real report from these two days (#61 / #62) was about reliability, not experience, so the whole group sits behind A and B.*

- [ ] **M** Flicker-free first paint (FOUC): **measure first** — the real window from the first frame to `apply()` completing decides the approach. No measurement, no work.
- [ ] **S** An empty-state hint for linked wallpapers: when "Image URL" is selected but no link has been pasted yet, that mode paints no background, and nothing in the UI explains "why did my background disappear" (one line per language across all 8 — slip it into the next feature release)
- [ ] **M** Community theme gallery — **settle the governance rules before writing code**. Verified: a theme pack payload contains no image fields whatsoever (tokens + accent colour + metadata only), so submissions carry no image-copyright risk by construction; the entire cost is review burden | PR-welcome

### E. Won't do / pull requests only

- **Rotating several wallpaper URLs** (a side observation from issue #61): the reporter's server-side setup (a random image per request, pre-composited to the screen ratio) already reaches the same effect, while doing it inside the plugin is the most expensive change on this table and the one that leaves the deepest semantic debt.
- **An online palette / theme-preview Studio**: that is a standalone site, not a plugin capability, and it overlaps with the community theme gallery while costing more.
- **Config presets / policy push** (an admin drops in a default skin that is active on first launch; this was the placeholder in group C and moved here after the 2026-10-10 decision): what this item would change is the **write precedence** of persistence — the factory seed now has to yield to the user's durable file (the B1 gate from 10.6.1 exists to pin exactly that), and bolting on one more "admin defaults" layer means cramming a fourth source into a three-state behaviour that tests only just locked down. And the "one person managing a batch of machines" profile still has no real contact point, so we don't do it; it reopens once batch users appear.
- **Anything that injects into or patches the host installer / binary**: it contradicts the "official extension points only" positioning head-on — **never**.

---

## 🤝 Contributing

Issues and PRs welcome! Please read the [Contributing Guide](../../CONTRIBUTING.md) and follow the
[Code of Conduct](../../CODE_OF_CONDUCT.md).

## ⭐ Support the project

If you like it: star **⭐** the repo, thumbs-up **👍** on npm, or share it with DSH friends — it helps the project
get discovered and keeps it maintained. Want to contribute themes / an online Studio / more skins? Join in.

## 🔒 Security

Found a security issue? Don't open a public issue — see the [Security Policy](../../SECURITY.md).

## 📄 License

[MIT](../../LICENSE)

## 🙏 Acknowledgments

- Architecture & API reference: the official DeepSeek Harness
  [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) client package.
- Concept homage: [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).

---

## 🧰 More from the same author

- **[adversarial-review](https://github.com/RevolutionLA/adversarial-review)** — Tri-role adversarial code review skill for AI coding agents: Blue Team (hostile audit) → Third Party (independent audit) → neutral adjudication. **Especially useful before writing a plugin or cutting a release.**
- **[AscendMate](https://github.com/RevolutionLA/AscendMate)** — Handbook for Ascend NPU servers: environment setup, fine-tuning, inference deployment, operator development.
- **[ascend-assistant](https://github.com/RevolutionLA/ascend-assistant)** — Agent Skill for operating and troubleshooting Ascend servers.

---

## 📈 Growth chart

> Updated automatically every day (GitHub Actions). Left axis: **cumulative downloads** (teal); right axis:
> **Star count** (purple) — two very different magnitudes, so each has its own independent Y-axis.

<p align="center">
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/stats.png?v=3" alt="dsh-dream-skin daily Stars × cumulative downloads growth chart" width="900"/>
</p>

*Data is collected every 24 hours: downloads from the [npm API](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin), Stars from the [GitHub API](https://github.com/RevolutionLA/dsh-dream-skin/stargazers).*
