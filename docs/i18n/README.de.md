<p align="center">
  <a href="../../README.md">中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <strong>Deutsch</strong> · <a href="./README.ru.md">Русский</a>
</p>

<div align="center">

# dsh-dream-skin 🔮

**Verleihe DeepSeek Harness ein Gesicht, das zurückhaltend, klar und strukturiert ist.**

Natives Skin-System · Wallpaper · Akzentfarbe · teilbare Theme-Packs — eine elegante Implementierung, die vollständig auf DSHs
offiziellem `--dsw-*`-Token-System aufbaut. Einmal installiert, dauerhaft nutzbar.

> **TL;DR: Dein Coding-Arbeitsplatz kann ruhig sein.**

| 🎨 8 Original-Themes | 🖼️ Wallpaper + diffused glow | 🎯 zurückhaltender Akzent | 📦 teilbare Theme-Packs |
|---|---|---|---|

> 1-Zeilen-Installation · rein nativ (keine Injection, keine Installer-Patches) · übersteht DSH-Updates

</div>

---

## 🎮 Zwei Wege, ein Plugin

<table>
  <tr>
    <td align="center" width="50%"><h3>🪄 Weg #1: elegant sofort einsatzbereit</h3></td>
    <td align="center" width="50%"><h3>🧱 Weg #2: DIY nach deinen Regeln</h3></td>
  </tr>
  <tr>
    <td>8 designer-feinabgestimmte <b>Preset-Skins</b> (die Mirage-Serie), hell &amp; dunkel, jeder mit eigenem diffused-glow-Hintergrund.<br/><b>Anlegen und fertig — Premium-Look ohne Feintuning.</b></td>
    <td>Über jedem Preset kannst du <b>das Wallpaper tauschen (lokal / URL / Gradient)</b>, <b>eine Accent-Farbe stapeln</b> oder <b>ein Theme-Pack importieren &amp; teilen</b> — jedes interne Token ist erreichbar.<br/><b>Gestalte es ganz nach deinem Geschmack.</b></td>
  </tr>
</table>

Die beiden Wege sind geschichtet und unabhängig: Ein Preset bestimmt die „Material- &amp; Grundstimmung"; DIY ist eine reine
Overlay-Ebene (`overrideTokens`), per Klick ein-/ausschaltbar und mit einem Klick rückgängig zu machen.

---

## 📸 Screenshots

> Echte Screenshots, keine Mockups. Links: DSH nach dem Anwenden eines Skins; rechts: der eigene Bereich **Theme / Appearance** in den Einstellungen.

<p align="center">
  <img src="../../docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🎨 Vorschau — die Mirage-Serie

> **Weg #1 · elegant sofort einsatzbereit.** Die 8 Skins unten werden aus den **echten Tokens + dediziertem diffused-glow-Hintergrund**
> jedes Skins generiert — was du siehst, ist, was du bekommst. Zum Vergrößern klicken, um die feinen Materialdetails zu sehen.

<table>
  <tr>
    <td align="center"><a href="../../docs/previews/abyss.png"><img src="../../docs/previews/abyss.png" width="230" alt="abyss"/></a><br/><b>abyss</b> · Deep Blue</td>
    <td align="center"><a href="../../docs/previews/aurora.png"><img src="../../docs/previews/aurora.png" width="230" alt="aurora"/></a><br/><b>aurora</b> · Aurora Green</td>
    <td align="center"><a href="../../docs/previews/nebula.png"><img src="../../docs/previews/nebula.png" width="230" alt="nebula"/></a><br/><b>nebula</b> · Nebula Purple</td>
    <td align="center"><a href="../../docs/previews/ember.png"><img src="../../docs/previews/ember.png" width="230" alt="ember"/></a><br/><b>ember</b> · Ember Amber</td>
  </tr>
  <tr>
    <td align="center"><a href="../../docs/previews/midnight.png"><img src="../../docs/previews/midnight.png" width="230" alt="midnight"/></a><br/><b>midnight</b> · Midnight OLED</td>
    <td align="center"><a href="../../docs/previews/ivory.png"><img src="../../docs/previews/ivory.png" width="230" alt="ivory"/></a><br/><b>ivory</b> · iOS Flat</td>
    <td align="center"><a href="../../docs/previews/mist.png"><img src="../../docs/previews/mist.png" width="230" alt="mist"/></a><br/><b>mist</b> · Liquid Glass</td>
    <td align="center"><a href="../../docs/previews/rose.png"><img src="../../docs/previews/rose.png" width="230" alt="rose"/></a><br/><b>rose</b> · Material Pink</td>
  </tr>
</table>

### 📋 Die Presets auf einen Blick

| id | Stil | Charakter |
|------|--------|------|
| `abyss` | 🕶️ Deep Blue | ruhiges, tiefes Indigo, zurückhaltend und leise |
| `aurora` | 🌌 Aurora Green | knackiges, transluzentes kühles Petrol, natürlicher kalter Ton |
| `nebula` | 🪐 Nebula Purple | tiefes, weiches Violettblau, dunstig und geheimnisvoll |
| `ember` | 🔥 Ember Amber | warmes, zurückhaltendes Amber-Orange |
| `midnight` | 🌚 Midnight OLED | minimalistisches reines Schwarz, immersives OLED |
| `ivory` | 📐 iOS Flat | minimalistisches flaches Weiß, iOS-Systemgrau + zurückhaltendes Blau |
| `mist` | 🧊 Liquid Glass | klares Milchglas, transluzent + unscharf |
| `rose` | 🌸 Material Pink | helles, leuchtendes Pink, flache Google-Material-Farben |

---

## 🧱 Der ernsthafte DIY-Bereich (Weg #2)

> Über die Presets hinaus bietet dsh-dream-skin ein vollständiges Anpassungssystem — starte hier, um einen Arbeitsbereich zu gestalten,
> der einzigartig deiner ist.

| Fähigkeit | Was du tun kannst |
|------|------|
| 🖼️ **Wallpaper 2.0** | Lokales Bild / **Bild-URL** / **Gradient-Presets**; dazu **Deckkraft / Unschärfe**; jeder Skin **schlägt** sogar einen Gradient vor und kann **automatisch abdunkeln** (weniger Ablenkung beim Fokussieren) |
| 🌈 **Accent pro Nutzer** | Lege eine eigene Marken-Akzentfarbe über den aktiven Skin (`overrideTokens`-Ebene, der Skin bleibt unangetastet): **12 Preset-Farbfelder per Klick**, Farbwähler, Zufallsfunktion und eine Option zum Entfernen/Wiederherstellen |
| 📦 **Theme-Pack importieren / exportieren / teilen** | Eine `*.dsh-theme.json` = Manifest + vollständige Tokens. Datei importieren, per Klick anwenden oder einen **Freigabelink** kopieren (im URL-Hash kodiert) |
| 🪟 **Popup-Deckkraft** | Ein Regler für die Transparenz von Dropdowns / Overlays / Dialog-Hintergrundfüllung, dauerhaft gespeichert |
| 🧩 **Lokale Pack-Bibliothek** | Deine importierten Packs an einem Ort; **anwenden / favorisieren / entfernen** per Klick |
| 🎲 **Überrasch mich** | Wechsle zufällig zu einem anderen Theme; **markiere** Favoriten mit einem Stern, um schnell zu wechseln |
| ✅ **Validierung + Rollback** | Beim Pack-Import werden Format / Pflicht-Tokens / Farbgültigkeit geprüft; Fehler oder Entfernungen fallen sicher auf den Ausgangszustand zurück |

> Alles liegt als Schicht über einem Preset — **per Klick ein-/ausschalten und zum eingebauten DSH-Look zurückkehren** — experimentiere
> ruhig, es kann nichts kaputtgehen.

---

## ⚡ Installation mit einer Zeile

**Kopiere diesen Satz in deine DSH und sie installiert alles für dich:**

> Bitte installiere das Skin-Plugin dsh-dream-skin (https://github.com/RevolutionLA/dsh-dream-skin, oder das npm-Paket `dsh-dream-skin`) und sage mir dann, wie ich DSH Web neu starten kann.

Lieber die CLI? Ein Befehl:

```sh
dsh plugin --profile web add dsh-dream-skin && dsh web
```

> 🚀 **Jetzt auf npm!** Bei installierter DSH reicht ein Befehl — kein Klonen nötig.

> **Hommage an [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).** Aber der Ansatz ist anders:
> Codex injiziert CSS über CDP in den Renderer des Desktop-Clients, während DSH eine **token-getriebene Web-GUI** ist, die
> erstklassige „Plugins von Drittanbietern zur Registrierung von Themes" mitliefert. Dieses Plugin ist daher **rein nativ** — keine
> Injection, keine Binär-Patches, und es bricht bei Client-Updates nicht.
>
> **Kein offizielles Produkt.** Nur eine Möglichkeit, deinen DeepSeek-Harness-Arbeitsbereich aufzuhübschen.

---

## 🏆 Warum es einen Stern verdient (im Vergleich zu Alternativen)

| Fähigkeit | Unser | Anderes DSH-Skinning | Codex-Dream-Skin (Desktop) |
|------|:---:|:---:|:---:|
| Native Token-Themes — keine Injection, keine Installer-Patches | ✅ | ✅ | ❌ (CDP-Injection) |
| **Kühles transluzentes Material & Farben im iOS/Linear-Stil** | ✅ | ❌ (Anime-lastig) | ❌ |
| **Zurückhaltender Premium-diffused-glow pro Skin** | ✅ | teilweise | ❌ |
| Benutzerdefiniertes Wallpaper + Deckkraft/Unschärfe | ✅ | teilweise | ✅ |
| **Theme-Pack-Import/-Export + Freigabelinks** | ✅ | ❌ | ✅ (Zip-Packs) |
| **Accent-Override pro Nutzer** | ✅ | ❌ | teilweise |
| **Wallpaper 2.0 (URL / Gradient / Vorschlag pro Skin / Auto-Abdunkeln)** | ✅ | ❌ | ✅ |
| Lokale Pack-Bibliothek + Favoriten + Überrasch-mich | ✅ | ❌ | teilweise |
| Validierung + Rollback | ✅ | teilweise | ✅ |
| **Browser-Web-GUI, plattformübergreifend nativ** | ✅ | ✅ | ❌ (Desktop-App nötig) |

---

## ✨ Funktionen

| Fähigkeit | Beschreibung |
|------------|-------------|
| 🎨 **8 enthaltene Presets (Mirage)** | Sofort umschalten unter **Settings → Theme / Appearance**, hell & dunkel |
| 🖼️ **Benutzerdefiniertes Wallpaper** | Wähle ein lokales Bild (automatisch komprimiert ≤2MB), stelle **Deckkraft / Unschärfe** ein |
| 🔤 **Undurchsichtige innere Flächen** | Karten, Eingabefelder und Nachrichtenblasen bleiben lesbar — nie ausgewaschen |
| ↩️ **Standard-Wiederherstellung** | Mit einem Klick zurück zum eingebauten DSH-Erscheinungsbild (System folgen) |
| 💾 **Lokale Speicherung** | Skin & Wallpaper werden in `localStorage` gespeichert und überleben ein Neuladen |

---

## 🧩 Was für ein Plugin ist das

**Ein standardmäßiges Dual-Face-„Everything-is-a-Plugin"-`dsh-plugin` — wird genau wie das offizielle Paket `ui-theme` geladen und verwendet.**

Das Motto von DeepSeek Harness lautet *everything is a plugin*: Modelle, Tools, Sandboxes, Sessions, die UI und sogar der Agent Loop
selbst sind Plugins. `dsh-dream-skin` liefert das Skin-System als npm-Paket, das **isomorph zu den offiziellen UI-Paketen** ist:

```text
            ┌──────────── dsh-dream-skin (standard dsh-plugin / dual-face) ─────────────┐
            │  dsh.bundle   → cordis.patch.yml inserts the dream-skin entry  (host half)│
            │  dsh.client   → lib/client.js (browser bundle)                (browser half)│
            └───────────────────────────────────────────────────────────────────────────┘
```

- **Installationsbefehl = der offizielle**: `dsh plugin --profile web add dsh-dream-skin`
- **Nutzt offizielle Erweiterungspunkte**: `ctx.theme` (Themes registrieren), `ctx.theme.overrideTokens` (Override-Ebenen),
  `ctx.slots` (UI in einen eigenen **Settings → Theme / Appearance**-Bereich einhängen).
- **Manifest-Vertrag entspricht den offiziellen Paketen**: `dsh.bundle` + `dsh.client` + `exports["./client"]`.

Mit anderen Worten: Du installierst kein obskures Skript — dies ist ein Standard-Skin-Plugin innerhalb des offiziellen Plugin-Systems
von DSH.

---

## ⚡ Schnellstart (3 Schritte)

```sh
# 1. install
dsh plugin --profile web add dsh-dream-skin
# 2. restart
dsh web
# 3. open Settings → Theme / Appearance → pick a skin → done.
```

> Installiert das veröffentlichte npm-Paket — kein Klonen. Wenn `dsh plugin add` einen Workspace-Fehler meldet, `-w` anhängen.

## 📦 Installation

Wähle eine der vier Optionen und starte dann **DSH Web neu** (die aktuelle Sitzung wird unterbrochen, aber DSH-Sitzungen werden
auf der Festplatte gespeichert und nach dem Neustart wiederhergestellt).

### Option A: Von npm (veröffentlicht, **empfohlen**)

```sh
dsh plugin --profile web add dsh-dream-skin
```

### Option B: Von GitHub (auf einen verifizierten Commit gepinnt)

```sh
dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<40-char-commit>'
```

> Auf den Commit eines Releases zu pinnen bedeutet, dass neue Änderungen auf `main` deine installierte Kopie nie stillschweigend verändern.

### Option C: Vom Release-Tarball (offline / ohne git)

Lade `dsh-dream-skin-<version>.tgz` von der Seite [Releases](https://github.com/RevolutionLA/dsh-dream-skin/releases)
herunter (sie enthält das gebaute `lib/client.js`, sodass beim Installieren kein prepare-Skript läuft), dann:

```sh
dsh plugin --profile web add ./dsh-dream-skin-<version>.tgz
```

### Option D: Klonen und vom lokalen Pfad installieren (Entwicklung)

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
dsh plugin --profile web add .
```

> `dsh plugin` verankert relative Pfade im Verzeichnis, **in dem du den Befehl ausführst**, und installiert eine Link-Abhängigkeit,
> die auf deinen Klon zeigt: Quelle bearbeiten, speichern, DSH neu starten — kein Neuinstallieren nötig.

**Neu starten und prüfen:**

```sh
dsh web
dsh --profile web --dump-config | grep -A2 dream-skin   # a dream-skin loader entry should appear
```

Öffne **Settings → Theme / Appearance**, um die Zeilen **Skins**, **Accent**, **Wallpaper** / **Advanced Wallpaper** und **Theme Packs** zu sehen.

> Das `-w`-Flag (Workspace) wird bei einem nackten `add` benötigt, weil jedes Profil eine `pnpm-workspace.yaml` mitliefert; pnpm
> behandelt das Profilverzeichnis als Workspace-Root, sodass ein nacktes add mit `ERR_PNPM_ADDING_TO_ROOT` fehlschlägt. Wenn dein Profil
> den Workspace bereits nutzt, musst du es nicht wiederholen.

## 🔄 Update / Deinstallation

**Auf die neueste Version aktualisieren** (wenn aus dem npm-Release installiert):

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # restart to pick it up
```

> Nach einem Update bei einer alten Version hängen geblieben? Die Minimum-Release-Age-Richtlinie (Supply-Chain) von pnpm kann ein
> frisch veröffentlichtes Release zurückhalten. Im Profilverzeichnis ausführen:
> `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0`, um es zu erzwingen.

**Deinstallation:**

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # restores the official appearance
```

---

## 🧩 Kompatibilität

| Punkt | Wert |
|------|-------|
| DeepSeek Harness (`dsh`) | **Ein Build für zwei Host-Generationen**: stabil `0.1.0-rc.6` / `0.1.1-rc.x` (peerDependencies gepinnt auf `^0.1.0-rc.6`) und DSH master (Modultabelle nach der Aufteilung) |
| Node.js | `>=18` |
| Browser | modernes Chromium / WebKit (native CSS-Variablen & `matchMedia`) |

> Beim Aktualisieren von DSH die peerDependencies in `package.json` entsprechend erhöhen.

---

## ⚙️ So funktioniert es

DSHs Theme-System ist token-basiert: Die Web-Shell liefert `--dsw-*`-Design-Tokens, und `ThemeRuntime` erlaubt Plugins von
Drittanbietern, Themes zu registrieren, die die Alias-Ebene (`--dsw-alias-*`) überschreiben. Dieses Paket ist ein standardmäßiges
Dual-Face-Plugin:

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

- **Host-Hälfte** (`lib/index.js`) — eine `dsh.bundle`-Patch-Ebene, die den `dream-skin`-Loader-Eintrag einfügt; `apply` ist ein
  No-op, genau wie bei den mitgelieferten `ui-*`-Paketen.
- **Browser-Hälfte** (`lib/client.js`):
  1. registriert die 8 Skins über `ctx.theme.register(...)`;
  2. stellt den gespeicherten Skin wieder her und wendet ihn mit `ctx.theme.setTheme(...)` an;
  3. rendert das Wallpaper als festen Hintergrund (`z-index:-1`) und stapelt `ctx.theme.overrideTokens(...)`, wodurch die
     Hauptfläche (`--dsw-alias-bg-base`) und die Seitenleiste (`--dsw-specific-sidebar-fill`) transluzent werden;
  4. lauscht auf `theme/change` und färbt den Wallpaper-Überzug beim Skin-/Scheme-Wechsel neu;
  5. registriert einen eigenen **Settings → Theme / Appearance**-Bereich (`settings.section`) und hängt die fünf
     Funktionszeilen in den `settings.dreamSkin.item`-Slot ein.

Jeder Skin trägt sein `colorScheme` (`light`/`dark`), das `body[data-ds-dark-theme]` steuert; die Alias-Token-Overrides
werden vom ThemePresenter von ui-layout als Inline-Custom-Properties auf `<body>` angewendet.

## 💼 Hinweise zur Speicherung

- Skin & Wallpaper werden in `localStorage` gespeichert (Schlüssel mit Präfix `dsh-dream-skin:`), **pro Browser**.
- Warum nicht Host-Einstellungen? Die Host-Einstellungsleitung legt Browser-Clients nur einen Allowlist-Satz von Namespaces offen
  (`WEB_SETTINGS_NAMESPACES` in `dsh-host-apiproxy`), sodass ein Namespace von Drittanbietern mit `settings-not-exposed` antworten
  würde; das Produkt selbst hält entfernte Browser-Präferenzen prozesslokal. `localStorage` entspricht dieser Grenze und
  übersteht Neuladevorgänge.

---

## 🛠️ Entwicklung / Themes erweitern

Das Client-Bundle ist direkt im `__ModuleLoader__`-Format geschrieben (derselben Form, die tsdown für die mitgelieferten
`ui-*`-Pakete erzeugt), daher ist **kein Build-Schritt** erforderlich. `lib/client.js` darf nur Modul-Tabellen-Einträge per
`require` laden: Plattform-Seeds (`react`, `react/jsx-runtime`, …) und registrierte Client-Bundles
(`@deepseek-ai/dsh-client-runtime/client`, …).

- **Einen eingebauten Skin hinzufügen**: Füge dem `SKINS`-Array in `lib/client.js` ein Objekt hinzu (`id` + `colorScheme` + `tokens`);
  es erscheint dann automatisch in den Einstellungen. Füge einen `skin.<id>`-Schlüssel zu **allen 8 Sprachwörterbüchern** hinzu
  (`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`).
- **Ein Theme-Pack ausliefern (empfohlen)**: Folge [`docs/examples/sample-theme-pack.json`](../../docs/examples/sample-theme-pack.json) —
  eine `*.dsh-theme.json` ist in den Einstellungen importierbar und über einen Link teilbar, keine Codeänderungen nötig.
- **Eigene Wallpapers hinzufügen**: Lege Bilder in [`wallpapers/`](../../wallpapers/) ab (verbreite nur, wofür du die Rechte
  hast) und importiere sie dann über die Zeile „Wallpaper" in DSH.
- **Vorschauen neu generieren**: Vorschauen werden von `scripts/generate-skin-mockups.cjs` (echte Tokens + diffused
  glow) in HTML-Mockups erzeugt und dann mit headless Chrome als `docs/previews/*.png` aufgenommen — führe es nach Änderungen an
  den Tokens eines Skins erneut aus, damit die Vorschau mit dem echten Skin synchron bleibt.
- **Validieren**: `npm test` (VM-Smoke-Tests für Factory-Eval, `apply()` und Pack-Import/Persistenz).
- **Neu einfärben**: Referenziere die `--dsw-alias-*`-Tokens (vollständiger Vertrag in [`docs/themes-spec.md`](../../docs/themes-spec.md)).

## 📌 Roadmap

- [x] v0.1: 8 Themes + benutzerdefiniertes Wallpaper (Deckkraft / Unschärfe) + lokale Speicherung
- [x] Theme-Pack-Format + Import / Export / Freigabelink (JSON + Manifest + Validierung)
- [x] Accent pro Nutzer + Zufallsfunktion
- [x] Wallpaper 2.0 (URL / Gradient / Vorschlag pro Skin / Auto-Abdunkeln)
- [x] Lokale Pack-Bibliothek + Anwenden per Klick / Favoriten / Überrasch-mich
- [x] Vollständige i18n-Texte & Doku (zh / en / ja / ko / es / fr / de / ru)
- [ ] Online-Farbpaletten- / Theme-Vorschau-Studio (reines Frontend, Kontrastprüfer)
- [ ] Community-Theme-Galerie (Packs zum Repo / zur Online-Galerie beitragen)
- [ ] Verbesserung des First-Paint (FOUC)

---

## 🤝 Mitwirken

Issues und PRs sind willkommen! Bitte lies den [Contributing Guide](../../CONTRIBUTING.md) und folge dem
[Code of Conduct](../../CODE_OF_CONDUCT.md).

## ⭐ Unterstütze das Projekt

Wenn es dir gefällt: Gib dem Repo einen Stern **⭐**, einen Daumen hoch **👍** auf npm oder teile es mit DSH-Freunden — das hilft
dem Projekt, entdeckt zu werden, und hält es gepflegt. Du möchtest Themes / ein Online-Studio / weitere Skins beitragen? Mach mit.

## 🔒 Sicherheit

Ein Sicherheitsproblem gefunden? Öffne kein öffentliches Issue — siehe die [Security Policy](../../SECURITY.md).

## 📄 Lizenz

[MIT](../../LICENSE)

## 🙏 Danksagungen

- Architektur- & API-Referenz: das offizielle Client-Paket [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) von DeepSeek Harness.
- Konzept-Hommage: [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).

---

## 📈 Wachstumskurve

> Täglich automatisch aktualisiert (GitHub Actions). Linke Achse: **kumulierte Downloads** (türkis); rechte Achse: **Sternezahl** (violett) — sehr unterschiedliche Größenordnungen, daher zwei unabhängige Y-Achsen.

<p align="center">
  <img src="../../docs/stats.png?v=2" alt="Tägliche Wachstumskurve Star × kumulierte Downloads von dsh-dream-skin" width="900"/>
</p>

*Die Daten werden alle 24 Stunden gesammelt: Downloads über die [offizielle npm-API](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin), Sterne über die [GitHub-API](https://github.com/RevolutionLA/dsh-dream-skin/stargazers).*
