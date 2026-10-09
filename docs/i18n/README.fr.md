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
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🎨 Voie n°1 : 8 skins prédéfinis (série Mirage)

> **Voie n°1 · élégant clé en main.** Basculez en un clic sous **Paramètres → Thème / Apparence**. Les 8 aperçus ci-dessous sont générés à partir des
> **vrais tokens + du fond diffused-glow dédié** de chaque skin — ce que vous voyez est ce que vous obtenez. Cliquez pour zoomer et admirer le détail du matériau.

<table>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/abyss.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/abyss.png" width="230" alt="abyss"/></a><br/><b>abyss</b> · 🕶️ Bleu profond<br/><sub>indigo profond et calme, sobre et paisible</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/aurora.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/aurora.png" width="230" alt="aurora"/></a><br/><b>aurora</b> · 🌌 Vert aurora<br/><sub>sarcelle froide translucide et nette, tonalité naturelle froide</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/nebula.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/nebula.png" width="230" alt="nebula"/></a><br/><b>nebula</b> · 🪐 Violet nébuleuse<br/><sub>violet-bleu diffus et profond, brumeux et mystérieux</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ember.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ember.png" width="230" alt="ember"/></a><br/><b>ember</b> · 🔥 Ambre braise<br/><sub>orange ambré chaud et sobre</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/midnight.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/midnight.png" width="230" alt="midnight"/></a><br/><b>midnight</b> · 🌚 Minuit OLED<br/><sub>noir pur minimaliste, OLED immersif</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ivory.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/ivory.png" width="230" alt="ivory"/></a><br/><b>ivory</b> · 📐 iOS Flat<br/><sub>blanc plat minimaliste, gris système iOS + bleu sobre</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/mist.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/mist.png" width="230" alt="mist"/></a><br/><b>mist</b> · 🧊 Clair net<br/><sub>rendu de verre net et lumineux, translucide + flouté</sub></td>
    <td align="center"><a href="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/rose.png"><img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/previews/rose.png" width="230" alt="rose"/></a><br/><b>rose</b> · 🌸 Rose Material<br/><sub>rose vif et éclatant, couleurs plates Google Material</sub></td>
  </tr>
</table>

> Clair / sombre : `mist`, `ivory` et `rose` sont des thèmes clairs, les autres sont sombres. Les presets ne vous plaisent pas ? Poursuivez avec la **Voie n°2**. Chaque preset embarque ses propres réglages par défaut (opacité/flou du halo, transparence de la barre latérale et du composer, opacité des dialogues, matériau verre) : changer de thème réajuste toutes les valeurs que vous n’avez pas définies vous-même, et les 8 presets passent 228 contrôles qualité mesurables (217 palette + 11 métier) (échelle d’élévation OKLCH, contraste WCAG 2.1 + APCA, séparation des teintes de signal, distinction entre presets).

---

## 🧱 Un vrai espace DIY (Voie n°2)

> Au-delà des presets, dsh-dream-skin vous offre un système de personnalisation complet : commencez ici pour façonner un espace de travail
> unique en son genre.

| Capacité | Ce que vous pouvez faire |
|------|------|
| 🖼️ **Wallpaper 2.0** | Image locale / **URL d'image** / **presets de gradient** ; plus **opacité / flou** ; chaque skin **suggère** même un gradient et peut **s'assombrir automatiquement** (moins de distractions en mode concentration) |
| 🌈 **Accent par utilisateur** | Empilez un accent de marque personnalisé par-dessus le skin actif (couche `overrideTokens`, le skin reste intact) : **12 nuanciers prédéfinis en un clic**, sélecteur de couleur, aléatoire, et une option d'effacement / restauration |
| 📦 **Import / export / partage de packs de thèmes** | Un `*.dsh-theme.json` = manifest + tokens complets. Importez un fichier, appliquez-le en un clic, ou copiez un **lien de partage** (encodé dans le hash de l'URL) |
| 🪟 **Opacité des popups** | Un curseur qui contrôle la transparence du fond des menus déroulants / overlays / boîtes de dialogue, persisté ; toutes les surfaces peintes avec le jeton de fond flottant (Réglages, gestionnaire d’extensions, infobulles de trajectoire, cartes flottantes) partagent un seuil de lisibilité à 92 % d’opacité —la surface surélevée du thème elle-même—, tandis que les voies menu et voile restent en pleine amplitude |
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

## 🏆 Pourquoi il mérite une étoile (vs les plugins de thème DSH)

> Changez de piste et regardez : les plugins du même genre, c'est soit un portage d'une palette toute prête (jolie, mais un seul réglage),
> soit une édition verrouillée sur une esthétique unique, soit un pont dédié aux wallpapers externes. Nous, nous faisons du skinning un
> **véritable système réglable de matériaux et de couleurs** — l'ambition n'est pas « plus clinquant », mais « plus juste, plus sobre,
> plus durable à l'œil », comme un verre longuement repensé. **Le goût + la réglabilité, c'est notre rempart.**

| Capacité | Le nôtre | [dsh-catppuccin-theme](https://github.com/NoNameLeGo/dsh-catppuccin-theme) (palette portée) | [dsh-theme-mineradio](https://github.com/dhicoc/dsh-theme-mineradio) (esthétique unique) | [dsh-wallpaper-engine](https://github.com/elysia395/dsh-wallpaper-engine) (moteur de wallpapers + UI en verre liquide) |
|------|:---:|:---:|:---:|:---:|
| **8 designs originaux** (pas un portage de palette : tokens originaux + diffused glow) | ✅ | ❌ (4 palettes Catppuccin officielles) | ❌ (1 esthétique or champagne) | ❌ |
| **Double matériau verre dépoli / verre liquide** en un clic | ✅ | partiel (rendu de verre figé) | ❌ | ❌ |
| **Curseurs d'opacité indépendants pour la saisie / les popups** | ✅ | ❌ | ❌ | partiel (fenêtre de réglages / fenêtres flottantes / barre latérale gauche / barre de titre ont opacité et flou indépendants ; les cartes de saisie et les bulles se voient attribuer couleur et fidélité séparément, l'opacité suit le réglage global) |
| **Apparence prête à l'installation** (redémarrez et c'est déjà réglé) | ✅ | ❌ | ✅ (un produit fini en soi) | partiel (réglages verre d'usine + 7 presets de verre ; pas de wallpaper / skins d'usine) |
| Wallpaper personnalisé + opacité/flou | ✅ | ❌ | ❌ | ✅ (cœur du produit) |
| **Wallpaper 2.0** (URL / presets de gradient / suggestion par skin / auto-assombrissement / photo du jour Bing + rafraîchissement programmé) | ✅ | ❌ | ❌ | partiel (téléversement local d'images / vidéos + rotation programmée + modes d'adaptation ; pas d'URL / presets de gradient / Bing quotidien) |
| **Accent par utilisateur** (couche de surcharge, le skin reste intact) | ✅ | ❌ | ❌ | partiel (6 presets + couleur de thème personnalisée pilotant boutons / interrupteurs / liens / sélection de navigation / curseurs / reflet du verre ; pas de concept de « couche sur le skin ») |
| **Import / export de packs de thèmes + liens de partage** (JSON, distribution sans code) | ✅ | ❌ | ❌ | partiel (jeux de polices et presets de verre exportables / importables en JSON ; pas de liens de partage) |
| Bibliothèque locale de packs + favoris + surprise-moi | ✅ | ❌ | ❌ | ❌ |
| **Compatibilité deux générations d'hôte + détection de capacités à l'exécution** (dégradation propre sans erreur quand l'hôte change) | ✅ | inconnu | inconnu | partiel (une seule plage peer ouverte couvre les lignes d'hôte 0.1.5-rc.1+ et 0.2.x ; détection de forme / capacités de l'hôte avec replis locaux ; le plancher du noyau 0.1.5-rc.1 est une exigence stricte) |
| Validation + restauration (aucune modification destructive) | ✅ | partiel | — | partiel |

> **En une phrase** : vous voulez la palette Catppuccin ou l'atmosphère mineradio ? Le système de packs de ce plugin sait les recréer
> ou les superposer — l'inverse n'est pas vrai.

---

## ✨ Fonctionnalités

| Capacité | Description |
|------------|-------------|
| 🎨 **8 presets inclus (Mirage)** | Changez instantanément sous **Paramètres → Thème / Apparence**, clair & sombre |
| 🖼️ **Wallpaper personnalisé** | Choisissez une image locale (compressée automatiquement ≤2 Mo), réglez **opacité / flou** |
| 🧊 **Matériaux de verre (Dépoli / Liquide)** | Un clic change le caractère du verre ; les curseurs de transparence se lisent **droite = plus transparent** ; UN réglage de flou pilote le fond et toutes les surfaces de verre |
| 🖼️ **Apparence prête à l'installation** | La première installation arrive déjà habillée : thème Nebula + fond intégré + valeurs ajustées — redémarrez et c'est prêt |
| 🌤️ **Photo du jour Bing (pré-remplie)** | Le fond avancé est pré-rempli avec l'API photo du jour de Bing : cliquez « Appliquer » et c'est actif ; toute URL d'image + rafraîchissement automatique fonctionne aussi |
| 🔤 **Surfaces internes opaques** | Cartes, champs de saisie, bulles de message restent lisibles — jamais délavés |
| ↩️ **Restauration par défaut** | Revenir à l'apparence native de DSH (suivre le système) en un clic |
| 💾 **Persistance à trois niveaux** | Skin & wallpaper dans `localStorage` **et un fichier côté hôte** — survivent au rechargement et au nouveau port que DSH Desktop reçoit à chaque lancement |

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
| DeepSeek Harness (`dsh`) | **Un seul build pour deux générations d'hôte** : stable `0.1.0-rc.6` / `0.1.1-rc.x` (peerDependencies épinglées sur `^0.1.0-rc.6`) et DSH master (table de modules post-division). **Le skin a disparu après une mise à niveau de l'hôte alors que le plugin s'affiche comme installé ?** La fenêtre de peers a très probablement fait sauter tout le bundle — issue de secours : `dsh plugin allow-version dsh-dream-skin@<version> <version de runtime de l'hôte>` (une **dérogation explicite à vos propres risques** qui force une combinaison non testée — pas une pratique recommandée) ; diagnostic du symptôme et étapes complètes dans [docs/desktop-support.md](../desktop-support.md) |
| Node.js | `>=18` |
| Navigateur | Chromium / WebKit moderne (variables CSS natives & `matchMedia`) |
| Bureau | **Shell DSH Desktop tiers :** adapté et vérifié sur matériel réel (issues #50/#51/#55). **DSH Desktop officiel :** les preuves soutiennent « **devrait charger** », pas « pris en charge » — elles reposent sur deux faits statiques (même front-end Electron ; le `dsh.client.platform = "web"` que nous déclarons correspond aux 21 paquets clients livrés par l'hôte). Son répertoire de profil et sa commande d'installation n'ont **jamais** été vérifiés sur cette machine, donc ce document ne donne **aucune** commande d'installation bureau à copier. <!-- desktop-claim: load-expected-unverified -->Lors de l'ajout, la valeur de `--profile` doit être un nom de modèle que l'hôte **fournit lui-même** ; le profil qu'enseignent certains documents tiers n'y existe pas, et le copier installe dans un profil vide (après redémarrage, on ne voit rien). Preuves dans **[docs/desktop-support.md](../desktop-support.md)** → « bureau officiel : points à vérifier ». Liste complète des ancres / périmètre de sécurité / matrice vérifié-non vérifié : ce même document |

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

Chaque skin porte son `colorScheme` (`light`/`dark`) ; ce plugin l'appose sur son propre élément racine `<html>`
(`data-dsh-dream-skin-scheme`) et ne s'appuie **pas** sur le `body[data-ds-dark-theme]` de l'hôte — cet attribut
appartient au ThemePresenter de ui-layout, dont le `dispose()` l'efface, et dans cette fenêtre d'absence un skin
sombre récupérait les constantes claires. Les surcharges de tokens d'alias sont appliquées comme propriétés
personnalisées inline sur `<body>` par le ThemePresenter de ui-layout.

## 💼 Notes de persistance

- Skin et wallpaper sont enregistrés sur **trois niveaux** : cache mémoire (première image correcte), `localStorage` du navigateur (préfixe `dsh-dream-skin:`) et **fichier côté hôte** `$DSH_HOME/dream-skin.json`, lu/écrit via l'`/dream-skin/api` loopback du plugin.
- C'est le fichier hôte qui sauve **le desktop** : DSH Desktop reçoit un nouveau port à chaque lancement, donc l'origin change, et le `localStorage` seul tout oublierait. Le fichier côté hôte survit aux changements de port et aux redémarrages.
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
  tokens d'un skin pour garder l'aperçu synchronisé avec le vrai skin. `docs/previews/manifest.json` lie chaque image à trois empreintes — jetons livrés, balisage de la carte, octets et taille en pixels du PNG — et `npm run previews --check` (sans navigateur) passe au rouge quand une palette change sans nouvelle capture, en nommant le skin ; `npm run previews` se termine avec un code non nul si aucun navigateur headless n'est trouvé, au lieu de considérer une sortie vide comme un succès. Ces PNG **ne sont pas livrés dans le paquet** : 2,26 Mo de décoration de README ne doivent pas être téléchargés par chaque installation, `npm pack` passe de 2,5 Mo à 263 ko, et le README sert les images depuis GitHub.
- **Valider** : `npm test` (tests de fumée VM couvrant l'évaluation de la factory, `apply()`, et l'import/persistance des packs).
- **Repeindre** : référencez les tokens `--dsw-alias-*` (contrat complet dans [`docs/themes-spec.md`](../../docs/themes-spec.md)).

## 📌 Feuille de route

> **Ce tableau ne liste que l'inachevé.** Ce qui est déjà livré se trouve dans la section Fonctionnalités ci-dessus et dans [CHANGELOG.md](../../CHANGELOG.md) — dupliquer le même inventaire à deux endroits finit toujours par diverger, et ce projet a déjà divergé une fois. Ce tableau traduit la feuille de route du `README.md` chinois, qui reste la référence.
> Chaque entrée porte trois choses : la **motivation** (issue d'un vrai ticket ou de mesures réelles, jamais d'un besoin imaginaire), la **taille** (S ≈ une soirée, M ≈ une version fonctionnelle, L ≈ une conception préalable), le **critère d'acceptation** (une vérification qui **peut échouer** — pas « c'est fini quand je le dis »). Une entrée terminée est retirée de ce tableau. La section « On ne fera pas » compte autant que la liste des tâches : elle évite à un contributeur un tour à vide.

### A. Fiabilité — survivre au changement de génération de l'hôte

*Motivation : mesuré sur `0.2.0-rc.1`, 4 des 6 groupes d'ancres de l'hôte ont dérivé — 3 re-tirages de hash confirmés, plus 1 (le groupe `lXshSW_*`) qui est du CSS hôte toujours présent, dont la surface n'est simplement pas montée (séparé en `notMounted` depuis 10.5.0) ; côté utilisateur, le ticket #62 ressemblait à « mes skins ont tous disparu du jour au lendemain ».*

- [ ] **M** Abandonner les derniers noms de classe hachés de l'hôte : migrer les règles décoratives restantes (barre latérale / panneau de fichiers) vers nos propres marqueurs `data-dsh-dream-skin-*` — composer et nav-icon ont déjà prouvé que cette voie fonctionne
      — acceptation : la sonde de dérive renvoie `drifted: [] && pending: false` sur 0.2.x
- [ ] **S** Ancrer le « pré-test contre une rc de l'hôte » dans la publication : le jour d'une nouvelle rc, lancer une fois la table de compatibilité et un vrai chargement de profil
- [ ] **M** Faire glisser la fenêtre peer jusqu'à `0.3.x` — **seulement après vérification** ; si elle reste fermée, écrire « non pris en charge » dans la documentation au lieu de laisser un saut silencieux
- [ ] **S** La sonde de dérive ne peut pas couvrir les surfaces montées à la demande : la carte de questions et la carte d'approbation n'entrent dans le DOM que lorsque la conversation pose réellement une question ; un échantillonnage au démarrage les signalerait donc comme dérivées en permanence — 10.5.0 les laisse volontairement hors de la sonde
      — critère d'acceptation : après une vraie question, `anchors` rapporte touché / raté pour les deux ancrages fonctionnels, tandis qu'une page fraîchement ouverte conserve `drifted: []`
- [ ] **M** Faire passer la preuve de mécanisme dans la CI : la porte « styles calculés » (`npm run wash:check`) dépend du Chrome de la machine de maintenance et du CSS de l'hôte installé en local, donc ses quatre cas calculés sont sautés dans la CI — aujourd'hui une seule personne peut recalculer cette moitié de la preuve (« le mécanisme agit vraiment ») ; en passant, remplacer dans le fixture les noms de classes de l'hôte recopiés à la main par des ancres fournies par le DOM réel / le recensement `scripts/host-consumers.cjs`
      — critère : les journaux de la CI affichent les **lectures** des quatre cas au lieu d'un motif de saut ; sans navigateur ou sans hôte, l'échec est un code non nul qui nomme ce qui manque, jamais un passage silencieux

### B. Publication et canal d'installation

*Motivation : le 2026-09-29, des installations ont été refusées sur le Desktop officiel `0.2.0-rc.2` ; or la machine de maintenance est en installation `link:` workspace — **ce type de problème est invisible sous une installation link**.*

- [ ] **S** Ajouter à la checklist de publication « installer vraiment une fois depuis le registry » (nouveau profil + version exacte + `--dump-config` pour contrôler l'entrée du loader) → l'écrire dans `docs/publishing-to-npm.md`
- [ ] **S** Mettre la version exacte dans toute commande d'installation / mise à jour (trois endroits : README, skill, doc desktop) et expliquer le délai de 24 h de pnpm
- [ ] **M** Documenter un chemin de distribution intranet / hors ligne (le mécanisme de tarball Release existe déjà ; les étapes copiables manquent) | PR-welcome

### C. Volet exploitation du Desktop

*Motivation : depuis la sortie du Desktop officiel, un nouveau profil d'utilisateur apparaît — une personne qui gère une flotte de machines. Les contacts réels avec ce profil sont encore rares, donc on commence par les deux points les moins chers, sans tout couvrir d'un coup.*

- [ ] **S** Ajouter un champ de version de schéma au fichier d'état (les montées de version reposent aujourd'hui sur une lecture tolérante ; aucun exercice de compatibilité ascendante n'a été fait)
- [ ] **M** Une sortie lisible par machine pour « le skin est-il réellement appliqué » : guide de lecture champ par champ de `$DSH_HOME/dream-skin.json` et de `__DSH_DREAM_SKIN_STATUS__`, pour qu'un script tranche au lieu d'un humain ouvrant la console
- [ ] **M** Guide de déploiement en série (arborescence des profils, différence entre installation `link:` et registry, sémantique des clés d'exemption de `compatibility.json`, ports dynamiques)
- [ ] **L** Préconfiguration / distribution de politique (l'administrateur dépose un skin par défaut, actif au premier lancement) — placeholder, très probablement jamais fait

### D. Expérience produit

*Motivation : c'est ce que l'utilisateur voit en premier. Mais les retours réels reçus ces deux jours (#61 / #62) portaient sur la fiabilité, pas sur l'expérience, donc tout ce groupe passe après A et B.*

- [ ] **M** Premier rendu sans scintillement (FOUC) : **mesurer d'abord** — la fenêtre réelle entre la première image affichée et la fin de `apply()` décide de l'approche ; pas de mesure, pas de travaux
- [ ] **S** Message d'état vide pour le fond d'écran par lien : quand « URL de l'image » est sélectionné sans lien collé, ce mode ne dessine aucun fond, et l'interface n'a pas la ligne qui explique « où est passé mon fond » (une ligne par langue sur les 8, à glisser dans la prochaine version fonctionnelle)
- [ ] **S** Mesurer le quota `localStorage` : l'accumulation de l'historique des fonds d'écran peut-elle évincer silencieusement la persistance (un échec d'écriture est aujourd'hui **une dégradation silencieuse**)
- [ ] **M** Galerie communautaire de thèmes — **figer les règles de gouvernance avant d'écrire du code**. Vérifié : un pack de thème ne contient aucun champ image (tokens + couleur d'accentuation + métadonnées seulement), les contributions ne portent donc structurellement aucun risque de droit d'auteur sur l'image ; tout le coût est dans la charge de relecture | PR-welcome

### E. On ne fera pas / PR seulement

- **Rotation de plusieurs liens de fond d'écran** (observation annexe du ticket #61) : la solution serveur du rapporteur (une image aléatoire par requête + pré-composée au ratio de l'écran) obtient déjà le même effet, tandis que le faire dans le plugin est le changement le plus coûteux de ce tableau et le plus lourd en dette sémantique.
- **Palette en ligne / Studio de prévisualisation de thèmes** : c'est un site autonome, pas une capacité du plugin, et cela recouvre la galerie communautaire de thèmes en plus cher.
- **Toute injection modifiant le paquet d'installation ou le binaire de l'hôte** : contradiction directe avec le positionnement « uniquement les points d'extension officiels » — **jamais**.

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
  <img src="https://raw.githubusercontent.com/RevolutionLA/dsh-dream-skin/main/docs/stats.png?v=3" alt="Courbe de croissance quotidienne Star × téléchargements cumulés de dsh-dream-skin" width="900"/>
</p>

*Les données sont collectées toutes les 24 h : téléchargements via l'[API officielle npm](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin), étoiles via l'[API GitHub](https://github.com/RevolutionLA/dsh-dream-skin/stargazers).*
