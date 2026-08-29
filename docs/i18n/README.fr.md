<p align="center">
  <a href="../../README.md">中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <strong>Français</strong> · <a href="./README.de.md">Deutsch</a> · <a href="./README.ru.md">Русский</a>
</p>

<div align="center">

# dsh-dream-skin 🔮

**Donnez à DeepSeek Harness un visage sobre, clair et texturé.**

Skinning natif · wallpaper · couleur d'accent · packs de thèmes partageables — une implémentation élégante, entièrement bâtie sur le
système officiel de tokens `--dsw-*` de DSH. Installez une fois, utilisez pour toujours.

> **En résumé : votre espace de code peut être calme.**

| 🎨 8 thèmes originaux | 🖼️ wallpaper + diffused glow | 🎯 accent sobre | 📦 packs de thèmes partageables |
|---|---|---|---|

> Installation en 1 ligne · purement natif (aucune injection, aucun patch d'installation) · survit aux mises à jour de DSH

</div>

---

## 🎮 Deux façons de jouer, un seul plugin

<table>
  <tr>
    <td align="center" width="50%"><h3>🪄 Voie n°1 : élégant clé en main</h3></td>
    <td align="center" width="50%"><h3>🧱 Voie n°2 : DIY à votre façon</h3></td>
  </tr>
  <tr>
    <td>8 <b>skins prédéfinis</b> peaufinés par des designers (la série Mirage), clairs &amp; sombres, chacun avec son propre fond diffused-glow.<br/><b>Appliquez-en un et c'est premium — zéro réglage.</b></td>
    <td>Par-dessus n'importe quel preset, vous pouvez <b>changer le wallpaper (local / URL / gradient)</b>, <b>empiler une couleur d'Accent</b>, ou <b>importer &amp; partager un pack de thèmes</b> — chaque token interne est à portée de main.<br/><b>Façonnez-le comme vous voulez.</b></td>
  </tr>
</table>

Les deux voies sont superposables et indépendantes : un preset décide du « matériau &amp; de la teinte de base » ; le DIY est une pure surcouche
(`overrideTokens`), activez-la/désactivez-la et revenez en arrière en un clic.

---

## 📸 Captures d'écran

> De vraies captures d'écran, pas des maquettes. À gauche : DSH après application d'un skin ; à droite : la section dédiée **Thème / Apparence** dans les Paramètres.

<p align="center">
  <img src="../../docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🎨 Aperçu — la série Mirage

> **Voie n°1 · élégant clé en main.** Les 8 skins ci-dessous sont générés à partir des **vrais tokens + du fond diffused-glow dédié** de
> chaque skin — ce que vous voyez est ce que vous obtenez. Cliquez pour zoomer et admirer le détail du matériau.

<table>
  <tr>
    <td align="center"><a href="../../docs/previews/abyss.png"><img src="../../docs/previews/abyss.png" width="230" alt="abyss"/></a><br/><b>abyss</b> · Bleu profond</td>
    <td align="center"><a href="../../docs/previews/aurora.png"><img src="../../docs/previews/aurora.png" width="230" alt="aurora"/></a><br/><b>aurora</b> · Vert aurora</td>
    <td align="center"><a href="../../docs/previews/nebula.png"><img src="../../docs/previews/nebula.png" width="230" alt="nebula"/></a><br/><b>nebula</b> · Violet nébuleuse</td>
    <td align="center"><a href="../../docs/previews/ember.png"><img src="../../docs/previews/ember.png" width="230" alt="ember"/></a><br/><b>ember</b> · Ambre braise</td>
  </tr>
  <tr>
    <td align="center"><a href="../../docs/previews/midnight.png"><img src="../../docs/previews/midnight.png" width="230" alt="midnight"/></a><br/><b>midnight</b> · Minuit OLED</td>
    <td align="center"><a href="../../docs/previews/ivory.png"><img src="../../docs/previews/ivory.png" width="230" alt="ivory"/></a><br/><b>ivory</b> · iOS Flat</td>
    <td align="center"><a href="../../docs/previews/mist.png"><img src="../../docs/previews/mist.png" width="230" alt="mist"/></a><br/><b>mist</b> · Verre liquide</td>
    <td align="center"><a href="../../docs/previews/rose.png"><img src="../../docs/previews/rose.png" width="230" alt="rose"/></a><br/><b>rose</b> · Rose Material</td>
  </tr>
</table>

### 📋 Les presets en un coup d'œil

| id | style | caractéristique |
|------|--------|------|
| `abyss` | 🕶️ Bleu profond | indigo profond et calme, sobre et paisible |
| `aurora` | 🌌 Vert aurora | sarcelle froide translucide et nette, tonalité naturelle froide |
| `nebula` | 🪐 Violet nébuleuse | violet-bleu diffus et profond, brumeux et mystérieux |
| `ember` | 🔥 Ambre braise | orange ambré chaud et sobre |
| `midnight` | 🌚 Minuit OLED | noir pur minimaliste, OLED immersif |
| `ivory` | 📐 iOS Flat | blanc plat minimaliste, gris système iOS + bleu sobre |
| `mist` | 🧊 Verre liquide | verre dépoli transparent, translucide + flouté |
| `rose` | 🌸 Rose Material | rose vif et éclatant, couleurs plates Google Material |

---

## 🧱 Un vrai espace DIY (Voie n°2)

> Au-delà des presets, dsh-dream-skin vous offre un système de personnalisation complet : commencez ici pour façonner un espace de travail
> unique en son genre.

| Capacité | Ce que vous pouvez faire |
|------|------|
| 🖼️ **Wallpaper 2.0** | Image locale / **URL d'image** / **presets de gradient** ; plus **opacité / flou** ; chaque skin **suggère** même un gradient et peut **s'assombrir automatiquement** (moins de distractions en mode concentration) |
| 🌈 **Accent par utilisateur** | Empilez un accent de marque personnalisé par-dessus le skin actif (couche `overrideTokens`, le skin reste intact) : **12 nuanciers prédéfinis en un clic**, sélecteur de couleur, aléatoire, et une option d'effacement / restauration |
| 📦 **Import / export / partage de packs de thèmes** | Un `*.dsh-theme.json` = manifest + tokens complets. Importez un fichier, appliquez-le en un clic, ou copiez un **lien de partage** (encodé dans le hash de l'URL) |
| 🪟 **Opacité des popups** | Un curseur qui contrôle la transparence du fond des menus déroulants / overlays / boîtes de dialogue, persisté |
| 🧩 **Bibliothèque locale de packs** | Vos packs importés au même endroit ; **appliquer / mettre en favori / supprimer** en un clic |
| 🎲 **Surprenez-moi** | Passez aléatoirement à un autre thème ; **étoilez** vos favoris pour changer rapidement |
| ✅ **Validation + restauration** | L'import d'un pack valide le format / les tokens requis / la validité des couleurs ; en cas d'échec ou de suppression, retour arrière sécurisé |

> Tout se superpose sur un preset, **activez/désactivez et revenez à l'apparence native de DSH en un clic** — n'hésitez pas à expérimenter,
> rien ne peut casser.

---

## ⚡ Installation en une ligne

**Copiez cette phrase dans votre DSH et il installe tout pour vous :**

> Veuillez installer le plugin de skin dsh-dream-skin (https://github.com/RevolutionLA/dsh-dream-skin, ou le package npm `dsh-dream-skin`), puis dites-moi comment redémarrer DSH Web.

Vous préférez la CLI ? Une seule commande :

```sh
dsh plugin --profile web add dsh-dream-skin && dsh web
```

> 🚀 **Maintenant sur npm !** Avec DSH installé, ajoutez-le en une seule commande — aucun clonage nécessaire.

> **Hommage à [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).** Mais l'approche est différente :
> Codex injecte du CSS dans le rendu du client desktop via CDP, alors que DSH est une **Web GUI pilotée par tokens** qui embarque
> en natif des « plugins tiers enregistrant des thèmes ». Ce plugin est donc **purement natif** — aucune injection, aucun patch
> binaire, et il ne cassera pas lors des mises à jour du client.
>
> **Pas un produit officiel.** Juste une façon d'habiller votre espace de travail DeepSeek Harness.

---

## 🏆 Pourquoi il mérite une étoile (vs les alternatives)

| Capacité | Le nôtre | Autre skinning DSH | Codex-Dream-Skin (desktop) |
|------|:---:|:---:|:---:|
| Thèmes natifs par tokens — aucune injection, aucun patch d'installation | ✅ | ✅ | ❌ (injection CDP) |
| **Matériau translucide froid &amp; couleur, style iOS/Linear** | ✅ | ❌ (style anime) | ❌ |
| **Diffused glow premium et sobre par skin** | ✅ | partiel | ❌ |
| Wallpaper personnalisé + opacité/flou | ✅ | partiel | ✅ |
| **Import/export de packs de thèmes + liens de partage** | ✅ | ❌ | ✅ (packs zip) |
| **Surcharge d'Accent par utilisateur** | ✅ | ❌ | partiel |
| **Wallpaper 2.0 (URL / gradient / suggestion par skin / auto-assombrissement)** | ✅ | ❌ | ✅ |
| Bibliothèque locale de packs + favoris + surprise-moi | ✅ | ❌ | partiel |
| Validation + restauration | ✅ | partiel | ✅ |
| **Web GUI navigateur, multiplateforme nativement** | ✅ | ✅ | ❌ (nécessite l'App desktop) |

---

## ✨ Fonctionnalités

| Capacité | Description |
|------------|-------------|
| 🎨 **8 presets inclus (Mirage)** | Changez instantanément sous **Paramètres → Thème / Apparence**, clair & sombre |
| 🖼️ **Wallpaper personnalisé** | Choisissez une image locale (compressée automatiquement ≤2 Mo), réglez **opacité / flou** |
| 🔤 **Surfaces internes opaques** | Cartes, champs de saisie, bulles de message restent lisibles — jamais délavés |
| ↩️ **Restauration par défaut** | Revenir à l'apparence native de DSH (suivre le système) en un clic |
| 💾 **Persistance locale** | Skin & wallpaper stockés dans `localStorage`, survivent au rechargement |

---

## 🧩 Quel type de plugin est-ce

**Un `dsh-plugin` standard « tout est un plugin » à double face (dual-face) — chargé et utilisé exactement comme le package officiel `ui-theme`.**

La devise de DeepSeek Harness est *tout est un plugin* : modèles, outils, sandboxes, sessions, UI, même l'Agent Loop
lui-même sont des plugins. `dsh-dream-skin` fournit le skinning sous forme de package npm **isomorphe aux packages UI
officiels** :

```text
            ┌──────────── dsh-dream-skin (standard dsh-plugin / dual-face) ─────────────┐
            │  dsh.bundle   → cordis.patch.yml inserts the dream-skin entry  (host half)│
            │  dsh.client   → lib/client.js (browser bundle)                (browser half)│
            └───────────────────────────────────────────────────────────────────────────┘
```

- **Commande d'installation = celle officielle** : `dsh plugin --profile web add dsh-dream-skin`
- **Utilise les points d'extension officiels** : `ctx.theme` (enregistrer des thèmes), `ctx.theme.overrideTokens` (couches de surcharge),
  `ctx.slots` (monter l'UI dans une section dédiée **Paramètres → Thème / Apparence**).
- **Le contrat du manifest correspond aux packages officiels** : `dsh.bundle` + `dsh.client` + `exports["./client"]`.

En d'autres termes : vous n'installez pas un script marginal — c'est un plugin de skin standard au sein du système de plugins
officiel de DSH.

---

## ⚡ Démarrage rapide (3 étapes)

```sh
# 1. install
dsh plugin --profile web add dsh-dream-skin
# 2. restart
dsh web
# 3. open Settings → Theme / Appearance → pick a skin → done.
```

> Installe le package npm publié — aucun clonage. Si `dsh plugin add` signale une erreur de workspace, ajoutez `-w`.

## 📦 Installation

Choisissez l'une des quatre options, puis **redémarrez DSH Web** (la session en cours sera interrompue, mais les sessions DSH sont
persistées sur disque et se récupèrent après le redémarrage).

### Option A : Depuis npm (publié, **recommandé**)

```sh
dsh plugin --profile web add dsh-dream-skin
```

### Option B : Depuis GitHub (épinglé sur un commit vérifié)

```sh
dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<40-char-commit>'
```

> Épingler au commit d'une release signifie que les nouveaux changements de `main` ne modifient jamais silencieusement votre copie installée.

### Option C : Depuis une archive tarball de Release (hors ligne / sans git)

Téléchargez `dsh-dream-skin-<version>.tgz` depuis la page [Releases](https://github.com/RevolutionLA/dsh-dream-skin/releases)
(elle contient le `lib/client.js` compilé, donc aucun script prepare ne s'exécute à l'installation), puis :

```sh
dsh plugin --profile web add ./dsh-dream-skin-<version>.tgz
```

### Option D : Cloner et installer depuis le chemin local (développement)

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
dsh plugin --profile web add .
```

> `dsh plugin` ancre les chemins relatifs au répertoire **dans lequel vous exécutez la commande**, en installant une dépendance de lien
> pointant vers votre clone : modifiez la source, enregistrez, redémarrez DSH — aucune réinstallation nécessaire.

**Redémarrez et vérifiez :**

```sh
dsh web
dsh --profile web --dump-config | grep -A2 dream-skin   # a dream-skin loader entry should appear
```

Ouvrez **Paramètres → Thème / Apparence** pour voir les lignes **Skins**, **Accent**, **Wallpaper** / **Advanced Wallpaper**, et **Theme Packs**.

> Le flag `-w` (workspace) est nécessaire sur un `add` simple car chaque profil embarque un `pnpm-workspace.yaml` ; pnpm traite
> le répertoire du profil comme une racine de workspace, donc un add simple échoue avec `ERR_PNPM_ADDING_TO_ROOT`. Si votre profil déjà
> utilise le workspace, vous n'aurez pas à le répéter.

## 🔄 Mise à jour / Désinstallation

**Mettez à jour vers la dernière version** (lorsqu'installé depuis la release npm) :

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # restart to pick it up
```

> Bloqué sur une ancienne version après une mise à jour ? La politique de minimum-release-age (supply-chain) de pnpm peut retenir une
> release fraîchement publiée. Dans le répertoire du profil, exécutez :
> `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0` pour forcer.

**Désinstallation :**

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # restores the official appearance
```

---

## 🧩 Compatibilité

| Élément | Valeur |
|------|-------|
| DeepSeek Harness (`dsh`) | **Un seul build pour deux générations d'hôte** : stable `0.1.0-rc.6` / `0.1.1-rc.x` (peerDependencies épinglées sur `^0.1.0-rc.6`) et DSH master (table de modules post-division) |
| Node.js | `>=18` |
| Navigateur | Chromium / WebKit moderne (variables CSS natives & `matchMedia`) |

> Lors d'une mise à jour de DSH, incrémentez les peerDependencies dans `package.json` en conséquence.

---

## ⚙️ Comment ça marche

Le système de thèmes de DSH est basé sur des tokens : la coque web embarque des design tokens `--dsw-*`, et `ThemeRuntime` permet aux plugins
tiers d'enregistrer des thèmes qui surchargent la couche d'alias (`--dsw-alias-*`). Ce package est un plugin dual-face standard :

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

- **Moitié hôte (Host half)** (`lib/index.js`) — une couche de patch `dsh.bundle` qui insère l'entrée de loader `dream-skin` ; `apply` est un
  no-op, exactement comme les packages `ui-*` fournis.
- **Moitié navigateur (Browser half)** (`lib/client.js`) :
  1. enregistre les 8 skins via `ctx.theme.register(...)` ;
  2. restaure le skin enregistré et l'applique avec `ctx.theme.setTheme(...)` ;
  3. rend le wallpaper comme un arrière-plan fixe en `z-index:-1` et empile `ctx.theme.overrideTokens(...)` pour rendre le
     canevas principal (`--dsw-alias-bg-base`) et la barre latérale (`--dsw-specific-sidebar-fill`) translucides ;
  4. écoute `theme/change` et réajuste la teinte du wallpaper lors du changement de skin / de schéma ;
  5. enregistre une section dédiée **Paramètres → Thème / Apparence** (`settings.section`) et monte les cinq lignes de
     fonctionnalités sous le slot `settings.dreamSkin.item`.

Chaque skin porte son `colorScheme` (`light`/`dark`), qui pilote `body[data-ds-dark-theme]` ; les surcharges de tokens d'alias
sont appliquées comme propriétés personnalisées inline sur `<body>` par le ThemePresenter de ui-layout.

## 💼 Notes de persistance

- Skin & wallpaper sont stockés dans `localStorage` (clés préfixées `dsh-dream-skin:`), **par navigateur**.
- Pourquoi pas les paramètres Host ? Le câblage des paramètres Host n'expose qu'un ensemble de namespaces autorisés (allowlist) aux clients
  navigateur (`WEB_SETTINGS_NAMESPACES` dans `dsh-host-apiproxy`), donc un namespace tiers répondrait `settings-not-exposed` ; le produit
  lui-même garde les préférences navigateur distantes locales au processus. `localStorage` respecte cette frontière et survit aux rechargements.

---

## 🛠️ Développement / extension des thèmes

Le bundle client est écrit directement au format `__ModuleLoader__` (la même forme que tsdown émet pour les packages
`ui-*` fournis), donc **aucune étape de build** n'est requise. `lib/client.js` ne peut `require` que des entités de la table de modules : des
seeds de plateforme (`react`, `react/jsx-runtime`, …) et des bundles client enregistrés (`@deepseek-ai/dsh-client-runtime/client`, …).

- **Ajouter un skin intégré** : ajoutez un objet (`id` + `colorScheme` + `tokens`) au tableau `SKINS` dans `lib/client.js` ;
  il apparaît alors automatiquement dans les Paramètres. Ajoutez une clé `skin.<id>` aux **8 dictionnaires de locales**
  (`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`).
- **Fournir un pack de thèmes (recommandé)** : suivez [`docs/examples/sample-theme-pack.json`](../../docs/examples/sample-theme-pack.json) —
  un `*.dsh-theme.json` est importable dans les Paramètres et partageable via un lien, sans modification de code.
- **Ajouter vos propres wallpapers** : déposez des images dans [`wallpapers/`](../../wallpapers/) (ne distribuez que ce dont vous avez les droits
  à), puis importez-les via la ligne « Wallpaper » de DSH.
- **Régénérer les aperçus** : les aperçus sont générés par `scripts/generate-skin-mockups.cjs` (vrais tokens + diffused
  glow) en maquettes HTML, puis capturés en `docs/previews/*.png` avec Chrome headless — relancez-le après avoir modifié les
  tokens d'un skin pour garder l'aperçu synchronisé avec le vrai skin.
- **Valider** : `npm test` (tests de fumée VM couvrant l'évaluation de la factory, `apply()`, et l'import/persistance des packs).
- **Repeindre** : référencez les tokens `--dsw-alias-*` (contrat complet dans [`docs/themes-spec.md`](../../docs/themes-spec.md)).

## 📌 Feuille de route

- [x] v0.1 : 8 thèmes + wallpaper personnalisé (opacité / flou) + persistance locale
- [x] Format de pack de thèmes + import / export / lien de partage (JSON + manifest + validation)
- [x] Accent par utilisateur + aléatoire
- [x] Wallpaper 2.0 (URL / gradient / suggestion par skin / auto-assombrissement)
- [x] Bibliothèque locale de packs + application en un clic / favoris / surprise-moi
- [x] Contenu & documentation i18n complets (zh / en / ja / ko / es / fr / de / ru)
- [ ] Palette en ligne / Studio d'aperçu de thèmes (frontend pur, vérificateur de contraste)
- [ ] Galerie de thèmes communautaire (soumettre des packs au dépôt / galerie en ligne)
- [ ] Amélioration du premier rendu (FOUC)

---

## 🤝 Contribuer

Issues et PR bienvenus ! Veuillez lire le [Guide de contribution](../../CONTRIBUTING.md) et respecter le
[Code de conduite](../../CODE_OF_CONDUCT.md).

## ⭐ Soutenir le projet

Si vous l'aimez : mettez une étoile **⭐** au dépôt, un pouce **👍** sur npm, ou partagez-le avec vos amis DSH — cela aide le projet
à être découvert et le maintient en vie. Envie de contribuer des thèmes / un Studio en ligne / plus de skins ? Rejoignez-nous.

## 🔒 Sécurité

Vous avez trouvé un problème de sécurité ? N'ouvrez pas d'issue publique — consultez la [Politique de sécurité](../../SECURITY.md).

## 📄 Licence

[MIT](../../LICENSE)

## 🙏 Remerciements

- Référence d'architecture & d'API : le package client
  [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) officiel de DeepSeek Harness.
- Hommage conceptuel : [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).

---

## 📈 Courbe de croissance

> Mise à jour automatique chaque jour (GitHub Actions). Axe gauche : **téléchargements cumulés** (turquoise) ; axe droit : **nombre d'étoiles** (violet) — des ordres de grandeur très différents, d'où deux axes Y indépendants.

<p align="center">
  <img src="../../docs/stats.png?v=2" alt="Courbe de croissance quotidienne Star × téléchargements cumulés de dsh-dream-skin" width="900"/>
</p>

*Les données sont collectées toutes les 24 h : téléchargements via l'[API officielle npm](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin), étoiles via l'[API GitHub](https://github.com/RevolutionLA/dsh-dream-skin/stargazers).*
