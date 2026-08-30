<p align="center">
  <a href="../../README.md">中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <strong>Español</strong> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.ru.md">Русский</a>
</p>

<div align="center">

# dsh-dream-skin 🔮

**Dale a DeepSeek Harness una apariencia sobria, clara y con textura.**

Skinning nativo · wallpaper · color de acento · theme packs compartibles — una implementación elegante construida
íntegramente sobre el sistema de tokens `--dsw-*` oficial de DSH. Instálalo una vez, úsalo para siempre.

> **En resumen: tu espacio de trabajo puede ser tranquilo.**

| 🎨 8 temas originales | 🖼️ wallpaper + diffused glow | 🎯 acento sobrio | 📦 theme packs compartibles |
|---|---|---|---|

> Instalación en 1 línea · 100 % nativo (sin inyección, sin parches al instalador) · sobrevive a las actualizaciones de DSH

</div>

---

## 🎮 Dos formas de usarlo, un solo plugin

<table>
  <tr>
    <td align="center" width="50%"><h3>🪄 Forma #1: elegante listo para usar</h3></td>
    <td align="center" width="50%"><h3>🧱 Forma #2: hazlo tú mismo a tu manera</h3></td>
  </tr>
  <tr>
    <td>8 <b>skins predefinidas</b> ajustadas por diseñadores (la serie Mirage), claras y oscuras, cada una con su propio fondo de diffused glow.<br/><b>Pon una y ya es premium — cero ajustes.</b></td>
    <td>Sobre cualquier preset puedes <b>cambiar el wallpaper (local / URL / gradiente)</b>, <b>superponer un color Accent</b> o <b>importar y compartir un theme pack</b> — todos los tokens internos están a tu alcance.<br/><b>Dale la forma que quieras.</b></td>
  </tr>
</table>

Las dos formas se apilan y son independientes: un preset decide el «material y tono base»; el modo DIY es una capa pura
(`overrideTokens`), actívala o desactívala y revierte con un clic.

---

## 📸 Capturas de pantalla

> Capturas reales, no maquetas. Izquierda: DSH tras aplicar una skin; derecha: la sección dedicada **Theme / Appearance** en Settings.

<p align="center">
  <img src="../../docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🎨 Vista previa — la serie Mirage

> **Forma #1 · elegante listo para usar.** Las 8 skins de abajo se generan con los **tokens reales de cada skin + fondo
> dedicado de diffused glow** — lo que ves es lo que obtienes. Haz clic para ampliar el detalle fino del material.

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

### 📋 Los presets de un vistazo

| id | style | rasgo |
|------|--------|------|
| `abyss` | 🕶️ Deep Blue | índigo profundo y sereno, sobrio y silencioso |
| `aurora` | 🌌 Aurora Green | verde azulado frío, translúcido y nítido, tono frío natural |
| `nebula` | 🪐 Nebula Purple | azul violeta profundo y difuminado, brumoso y misterioso |
| `ember` | 🔥 Ember Amber | naranja ámbar cálido y sobrio |
| `midnight` | 🌚 Midnight OLED | negro puro minimalista, OLED inmersivo |
| `ivory` | 📐 iOS Flat | blanco plano minimalista, gris de sistema iOS + azul sobrio |
| `mist` | 🧊 Liquid Glass | vidrio esmerilado claro, translúcido + desenfocado |
| `rose` | 🌸 Material Pink | rosa vivo y brillante, colores planos de Google Material |

---

## 🧱 Espacio DIY serio (Forma #2)

> Más allá de los presets, dsh-dream-skin te ofrece un sistema de personalización completo; empieza aquí para crear un
> espacio de trabajo que sea exclusivamente tuyo.

| Capacidad | Qué puedes hacer |
|------|------|
| 🖼️ **Wallpaper 2.0** | Imagen local / **URL de imagen** / **presets de gradiente**; además **opacidad / desenfoque**; cada skin incluso **sugiere** un gradiente y puede **atenuarse automáticamente** (reduce distracciones al enfocarte) |
| 🌈 **Accent por usuario** | Superpone un acento de marca personalizado sobre la skin activa (capa `overrideTokens`, la skin intacta): **12 muestras de un clic**, selector de color, aleatorizar y una opción para limpiar/restaurar |
| 📦 **Importar / exportar / compartir theme packs** | Un `*.dsh-theme.json` = manifest + tokens completos. Importa un archivo, aplícalo con un clic o copia un **enlace para compartir** (codificado en el hash de la URL) |
| 🪟 **Opacidad de popups** | Un deslizador que controla la transparencia del relleno inferior de desplegables / overlays / diálogos, con persistencia |
| 🧩 **Biblioteca local de packs** | Tus packs importados en un solo lugar; **aplicar / favorito / eliminar** con un clic |
| 🎲 **Sorpréndeme** | Cambia aleatoriamente a otro tema; **marca con estrella** tus favoritos para cambiar rápido |
| ✅ **Validación + rollback** | La importación valida el formato / los tokens obligatorios / la validez de los colores; los fallos o eliminaciones se revierten de forma segura |

> Todo se apila sobre un preset; **actívalo o desactívalo y vuelve al aspecto integrado de DSH con un clic** —
> experimenta sin miedo, nada puede romperse.

---

## ⚡ Instalación en una línea

**Copia esta frase en tu DSH y lo instala todo por ti:**

> Please install the dsh-dream-skin skin plugin (https://github.com/RevolutionLA/dsh-dream-skin, or the npm package `dsh-dream-skin`), then tell me how to restart DSH Web.

¿Prefieres la CLI? Un solo comando:

```sh
dsh plugin --profile web add dsh-dream-skin && dsh web
```

> 🚀 **¡Ahora en npm!** Con DSH instalado, añádelo con un solo comando — no hace falta clonar.

> **Un homenaje a [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).** Pero el enfoque es distinto:
> Codex inyecta CSS en el renderer del cliente de escritorio vía CDP, mientras que DSH es una **Web GUI basada en tokens**
> que ofrece de serie "plugins de terceros que registran themes". Así que este plugin es **100 % nativo** — sin inyección,
> sin parches binarios, y no se romperá con las actualizaciones del cliente.
>
> **No es un producto oficial.** Solo una forma de vestir tu espacio de trabajo de DeepSeek Harness.

---

## 🏆 Por qué merece una estrella (frente a las alternativas)

| Capacidad | El nuestro | Otros skinning de DSH | Codex-Dream-Skin (escritorio) |
|------|:---:|:---:|:---:|
| Temas nativos por tokens — sin inyección, sin parches al instalador | ✅ | ✅ | ❌ (inyección CDP) |
| **Material y color fríos translúcidos estilo iOS/Linear** | ✅ | ❌ (estilo anime) | ❌ |
| **Diffused glow premium y sobrio por skin** | ✅ | parcial | ❌ |
| Wallpaper personalizado + opacidad/desenfoque | ✅ | parcial | ✅ |
| **Importación/exportación de theme packs + enlaces para compartir** | ✅ | ❌ | ✅ (packs zip) |
| **Sobrescritura de Accent por usuario** | ✅ | ❌ | parcial |
| **Wallpaper 2.0 (URL / gradiente / sugerencia por skin / atenuación automática)** | ✅ | ❌ | ✅ |
| Biblioteca local de packs + favoritos + sorpréndeme | ✅ | ❌ | parcial |
| Validación + rollback | ✅ | parcial | ✅ |
| **Web GUI en el navegador, multiplataforma de forma nativa** | ✅ | ✅ | ❌ (necesita la App de escritorio) |

---

## ✨ Características

| Capacidad | Descripción |
|------------|-------------|
| 🎨 **8 presets incluidos (Mirage)** | Cambia al instante desde **Settings → Theme / Appearance**, claro y oscuro |
| 🖼️ **Wallpaper personalizado** | Elige una imagen local (autocomprimida ≤2MB), ajusta **opacidad / desenfoque** |
| 🔤 **Superficies internas opacas** | Tarjetas, campos de entrada y burbujas de mensaje siguen siendo legibles — nunca lavados |
| ↩️ **Restaurar el predeterminado** | Vuelve al aspecto integrado de DSH (sigue al sistema) con un clic |
| 💾 **Persistencia local** | Skin y wallpaper guardados en `localStorage`, sobrevive a la recarga |

---

## 🧩 Qué tipo de plugin es este

**Un `dsh-plugin` estándar de doble cara «todo es un plugin» — se carga y se usa exactamente igual que el paquete oficial `ui-theme`.**

El lema de DeepSeek Harness es *todo es un plugin*: los modelos, las herramientas, los sandboxes, las sesiones, la UI
e incluso el propio Agent Loop son plugins. `dsh-dream-skin` distribuye el skinning como un paquete npm que es
**isomorfo con los paquetes oficiales de UI**:

```text
            ┌──────────── dsh-dream-skin (standard dsh-plugin / dual-face) ─────────────┐
            │  dsh.bundle   → cordis.patch.yml inserts the dream-skin entry  (host half)│
            │  dsh.client   → lib/client.js (browser bundle)                (browser half)│
            └───────────────────────────────────────────────────────────────────────────┘
```

- **El comando de instalación = el oficial**: `dsh plugin --profile web add dsh-dream-skin`
- **Usa puntos de extensión oficiales**: `ctx.theme` (registrar themes), `ctx.theme.overrideTokens` (capas de
  sobrescritura), `ctx.slots` (montar la UI en una sección dedicada de **Settings → Theme / Appearance**).
- **El contrato del manifest coincide con los paquetes oficiales**: `dsh.bundle` + `dsh.client` + `exports["./client"]`.

En otras palabras: no estás instalando un script marginal — es un plugin de skin estándar dentro del sistema oficial de
plugins de DSH.

---

## ⚡ Inicio rápido (3 pasos)

```sh
# 1. instalar
dsh plugin --profile web add dsh-dream-skin
# 2. reiniciar
dsh web
# 3. abre Settings → Theme / Appearance → elige una skin → listo.
```

> Instala el paquete npm publicado — sin clonar. Si `dsh plugin add` informa de un error de workspace, añade `-w`.

## 📦 Instalación

Elige cualquiera de las cuatro opciones y luego **reinicia DSH Web** (la sesión actual se interrumpirá, pero las
sesiones de DSH se guardan en disco y se recuperan tras el reinicio).

### Opción A: Desde npm (publicado, **recomendado**)

```sh
dsh plugin --profile web add dsh-dream-skin
```

### Opción B: Desde GitHub (fijado a un commit verificado)

```sh
dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<40-char-commit>'
```

> Fijar el commit de un release significa que los nuevos cambios en `main` nunca alterarán silenciosamente tu copia
> instalada.

### Opción C: Desde un tarball de Release (sin conexión / sin git)

Descarga `dsh-dream-skin-<version>.tgz` desde la página de
[Releases](https://github.com/RevolutionLA/dsh-dream-skin/releases) (incluye el `lib/client.js` ya compilado, así que
no se ejecuta ningún script prepare al instalar), y luego:

```sh
dsh plugin --profile web add ./dsh-dream-skin-<version>.tgz
```

### Opción D: Clona e instala desde la ruta local (desarrollo)

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
dsh plugin --profile web add .
```

> `dsh plugin` ancla las rutas relativas al directorio **desde el que ejecutas el comando**, instalando una dependencia
> de enlace que apunta a tu clon: edita el código, guarda, reinicia DSH — no hace falta reinstalar.

**Reinicia y verifica:**

```sh
dsh web
dsh --profile web --dump-config | grep -A2 dream-skin   # debería aparecer una entrada del loader dream-skin
```

Abre **Settings → Theme / Appearance** para ver las filas **Skins**, **Accent**, **Wallpaper** / **Advanced Wallpaper**
y **Theme Packs**.

> La bandera `-w` (workspace) es necesaria en un `add` simple porque cada profile incluye un `pnpm-workspace.yaml`;
> pnpm trata el directorio del profile como raíz de workspace, así que un add simple falla con `ERR_PNPM_ADDING_TO_ROOT`.
> Si tu profile ya usa el workspace, no tendrás que repetirlo.

## 🔄 Actualizar / Desinstalar

**Actualiza a la última versión** (cuando se instaló desde el release de npm):

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # reinicia para aplicarlo
```

> ¿Te quedaste en una versión antigua tras una actualización? La política de minimum-release-age (supply-chain) de pnpm
> puede retener un release recién publicado. En el directorio del profile ejecuta:
> `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0` para forzarlo.

**Desinstalar:**

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # restaura el aspecto oficial
```

---

## 🧩 Compatibilidad

| Elemento | Valor |
|------|-------|
| DeepSeek Harness (`dsh`) | **Una compilación para dos generaciones de host**: estable `0.1.0-rc.6` / `0.1.1-rc.x` (peerDependencies fijadas a `^0.1.0-rc.6`) y DSH master (tabla de módulos tras la división) |
| Node.js | `>=18` |
| Navegador | Chromium / WebKit modernos (variables CSS nativas y `matchMedia`) |

> Al actualizar DSH, sube las peerDependencies en `package.json` en consecuencia.

---

## ⚙️ Cómo funciona

El sistema de themes de DSH se basa en tokens: el web shell incluye tokens de diseño `--dsw-*`, y `ThemeRuntime` permite
que los plugins de terceros registren themes que sobrescriben la capa de alias (`--dsw-alias-*`). Este paquete es un
plugin estándar de doble cara:

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

- **Mitad host** (`lib/index.js`) — una capa de parche `dsh.bundle` que inserta la entrada del loader `dream-skin`;
  `apply` es un no-op, exactamente como los paquetes `ui-*` incluidos.
- **Mitad navegador** (`lib/client.js`):
  1. registra las 8 skins vía `ctx.theme.register(...)`;
  2. restaura la skin guardada y la aplica con `ctx.theme.setTheme(...)`;
  3. renderiza el wallpaper como fondo fijo `z-index:-1` y apila `ctx.theme.overrideTokens(...)` haciendo
     translúcidos el lienzo principal (`--dsw-alias-bg-base`) y la barra lateral (`--dsw-specific-sidebar-fill`);
  4. escucha `theme/change` y re-tiñe el lavado del wallpaper al cambiar de skin / esquema;
  5. registra una sección dedicada **Settings → Theme / Appearance** (`settings.section`) y monta las cinco
     filas de funciones en el slot `settings.dreamSkin.item`.

Cada skin lleva su `colorScheme` (`light`/`dark`), que controla `body[data-ds-dark-theme]`; las sobrescrituras de
alias-tokens se aplican como custom properties inline en `<body>` a través del ThemePresenter de ui-layout.

## 💼 Notas sobre la persistencia

- La skin y el wallpaper se guardan en `localStorage` (claves con prefijo `dsh-dream-skin:`), **por navegador**.
- ¿Por qué no en los ajustes del Host? El cable de ajustes del Host solo expone un conjunto de namespaces en lista
  blanca a los clientes del navegador (`WEB_SETTINGS_NAMESPACES` en `dsh-host-apiproxy`), así que un namespace de
  terceros respondería `settings-not-exposed`; el propio producto mantiene las preferencias remotas del navegador a
  nivel local del proceso. `localStorage` respeta ese límite y sobrevive a las recargas.

---

## 🛠️ Desarrollo / cómo extender los themes

El bundle del cliente está escrito directamente en el formato `__ModuleLoader__` (la misma forma que tsdown emite para
los paquetes `ui-*` incluidos), por lo que **no se requiere ningún paso de build**. `lib/client.js` solo puede `require`
entidades de la tabla de módulos: seeds de plataforma (`react`, `react/jsx-runtime`, …) y bundles de cliente registrados
(`@deepseek-ai/dsh-client-runtime/client`, …).

- **Añadir una skin integrada**: añade un objeto (`id` + `colorScheme` + `tokens`) al array `SKINS` en `lib/client.js`;
  aparecerá automáticamente en Settings. Añade una clave `skin.<id>` a **los 8 diccionarios de idioma**
  (`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`).
- **Distribuir un theme pack (recomendado)**: sigue [`docs/examples/sample-theme-pack.json`](../../docs/examples/sample-theme-pack.json) —
  un solo `*.dsh-theme.json` es importable en Settings y se puede compartir mediante un enlace, sin necesidad de
  cambios de código.
- **Añadir tus propios wallpapers**: coloca imágenes en [`wallpapers/`](../../wallpapers/) (distribuye solo lo que
  tengas derecho a distribuir) y luego impórtalas desde la fila "Wallpaper" de DSH.
- **Regenerar las vistas previas**: las vistas previas las genera `scripts/generate-skin-mockups.cjs` (tokens reales +
  diffused glow) en maquetas HTML, que luego se capturan como `docs/previews/*.png` con Chrome headless — vuelve a
  ejecutarlo tras cambiar los tokens de una skin para mantener la vista previa sincronizada con la skin real.
- **Validar**: `npm test` (pruebas smoke de VM que cubren el factory eval, `apply()` y la importación/persistencia de
  packs).
- **Repintar**: consulta los tokens `--dsw-alias-*` (contrato completo en [`docs/themes-spec.md`](../../docs/themes-spec.md)).

## 📌 Hoja de ruta

- [x] v0.1: 8 themes + wallpaper personalizado (opacidad / desenfoque) + persistencia local
- [x] Formato de theme pack + importar / exportar / enlace para compartir (JSON + manifest + validación)
- [x] Accent por usuario + aleatorizar
- [x] Wallpaper 2.0 (URL / gradiente / sugerencia por skin / atenuación automática)
- [x] Biblioteca local de packs + aplicación con un clic / favoritos / sorpréndeme
- [x] Textos y docs i18n completos (zh / en / ja / ko / es / fr / de / ru)
- [ ] Studio online de paletas / vista previa de themes (frontend puro, verificador de contraste)
- [ ] Galería comunitaria de themes (envía packs al repo / a la galería online)
- [ ] Mejora del first-paint (FOUC)

---

## 🤝 Contribuciones

¡Issues y PRs bienvenidos! Por favor, lee la [Guía de contribución](../../CONTRIBUTING.md) y sigue el
[Código de conducta](../../CODE_OF_CONDUCT.md).

## ⭐ Apoya el proyecto

Si te gusta: dale una estrella **⭐** al repo, un pulgar arriba **👍** en npm, o compártelo con amigos de DSH — ayuda a
que el proyecto se descubra y se mantenga. ¿Quieres contribuir con themes / un Studio online / más skins? Únete.

## 🔒 Seguridad

¿Encontraste un problema de seguridad? No abras un issue público — consulta la [Política de seguridad](../../SECURITY.md).

## 📄 Licencia

[MIT](../../LICENSE)

## 🙏 Agradecimientos

- Referencia de arquitectura y API: el paquete de cliente
  [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) oficial de DeepSeek Harness.
- Homenaje conceptual: [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).

---

## 📈 Curva de crecimiento

> Actualizada automáticamente cada día (GitHub Actions). Eje izquierdo: **descargas acumuladas** (verde); eje derecho: **número de Stars** (púrpura) — magnitudes muy distintas, por eso cada uno tiene su propio eje Y independiente.

<p align="center">
  <img src="../../docs/stats.png?v=3" alt="Curva de crecimiento diario Star × descargas acumuladas de dsh-dream-skin" width="900"/>
</p>

*Los datos se recogen cada 24 horas: las descargas desde la [API oficial de npm](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin), y las Stars desde la [API de GitHub](https://github.com/RevolutionLA/dsh-dream-skin/stargazers).*
