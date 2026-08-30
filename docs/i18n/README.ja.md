<p align="center">
  <a href="../../README.md">中文</a> · <a href="./README.en.md">English</a> · <strong>日本語</strong> · <a href="./README.ko.md">한국어</a> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.ru.md">Русский</a>
</p>

<div align="center">

# dsh-dream-skin 🔮

**DeepSeek Harness に、落ち着いて澄んだ、質感のある「顔」を。**

ネイティブ・スキニング · 壁紙 · アクセントカラー · 共有可能なテーマパック — DSH 公式の `--dsw-*` トークンシステムだけで構築した、エレガントな実装です。一度インストールすれば、ずっと使い続けられます。

> **TL;DR：あなたのコーディング空間は、静かでいられます。**

| 🎨 オリジナルテーマ 8種 | 🖼️ 壁紙 + diffused glow | 🎯 控えめなアクセント | 📦 共有可能なテーマパック |
|---|---|---|---|

> 1行インストール · 完全ネイティブ（注入なし・インストーラーへのパッチなし）· DSH のアップデート後もそのまま動作

</div>

---

## 🎮 2つの遊び方、1つのプラグイン

<table>
  <tr>
    <td align="center" width="50%"><h3>🪄 方法 #1：箱から出してすぐエレガント</h3></td>
    <td align="center" width="50%"><h3>🧱 方法 #2：自分好みに DIY</h3></td>
  </tr>
  <tr>
    <td>デザイナーが調整した <b>プリセットスキン</b> 8種（Mirage シリーズ）をライト &amp; ダークで用意。それぞれ専用の diffused-glow 背景付き。<br/><b>選ぶだけで高級感 — 微調整は一切不要。</b></td>
    <td>どのプリセットにも <b>壁紙の差し替え（ローカル / URL / グラデーション）</b>、<b>アクセントカラーの重ね付け</b>、<b>テーマパックのインポート &amp; 共有</b>が可能 — 内部のトークンすべてに手が届きます。<br/><b>好きなように形を変えられます。</b></td>
  </tr>
</table>

2つの方法はレイヤー構造で、互いに独立しています。プリセットが「素材 &amp; ベーストーン」を決め、DIY は純粋なオーバーレイ（`overrideTokens`）— オン/オフの切り替えもワンクリック、元に戻すのもワンクリックです。

---

## 📸 スクリーンショット

> モックアップではなく実際のスクリーンショットです。左：スキン適用後の DSH。右：設定内の専用 **テーマ / 外観** セクション。

<p align="center">
  <img src="../../docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🎨 プレビュー — Mirage シリーズ

> **方法 #1 · 箱から出してすぐエレガント。** 下の 8 スキンは、各スキンの**実トークン + 専用の diffused-glow 背景**から生成しています — 見たままが得られます。クリックで拡大して、素材の細部をご確認ください。

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

### 📋 プリセット一覧

| id | style | trait |
|------|--------|------|
| `abyss` | 🕶️ Deep Blue | 落ち着いた深い藍色、控えめで静か |
| `aurora` | 🌌 Aurora Green | 澄んだ半透明のクールなティール、自然な冷色 |
| `nebula` | 🪐 Nebula Purple | 深く拡散した青紫、霞がかってミステリアス |
| `ember` | 🔥 Ember Amber | 温かみのある控えめな琥珀色 |
| `midnight` | 🌚 Midnight OLED | ミニマルな純黒、没入感のある OLED |
| `ivory` | 📐 iOS Flat | ミニマルなフラットホワイト、iOS システムグレー + 控えめなブルー |
| `mist` | 🧊 Liquid Glass | 澄んだすりガラス、半透明 + ぼかし |
| `rose` | 🌸 Material Pink | 明るく鮮やかなピンク、Google Material のフラットカラー |

---

## 🧱 本格的な DIY 空間（方法 #2）

> プリセットを超えて、dsh-dream-skin は完全なカスタマイズシステムを提供します。ここから始めて、あなただけのワークスペースを作り上げてください。

| 機能 | できること |
|------|------|
| 🖼️ **Wallpaper 2.0** | ローカル画像 / **画像 URL** / **グラデーションプリセット**。さらに **不透明度 / ぼかし** も調整可能。各スキンはグラデーションを**提案**し、**自動減光**（集中時は邪魔を減らす）にも対応 |
| 🌈 **ユーザーごとの Accent** | アクティブなスキンの上に独自のブランドアクセントを重ね付け（`overrideTokens` レイヤー、スキン自体は変更なし）：**12色のワンクリックプリセットスウォッチ**、カラーピッカー、ランダム化、クリア / 復元オプション |
| 📦 **テーマパックのインポート / エクスポート / 共有** | `*.dsh-theme.json` = マニフェスト + 完全なトークン。ファイルをインポートしてワンクリック適用、または**共有リンク**（URL ハッシュにエンコード）をコピー |
| 🪟 **ポップアップの不透明度** | ドロップダウン / オーバーレイ / ダイアログの下部塗りの透明度を調整するスライダー。設定は永続化されます |
| 🧩 **ローカルパックライブラリ** | インポートしたパックを一箇所に集約。**適用 / お気に入り / 削除** をワンクリックで |
| 🎲 **おまかせ（Surprise me）** | ランダムに別のテーマへ切り替え。お気に入りに **スター** を付けると素早く切り替え |
| ✅ **検証 + ロールバック** | パックのインポート時に形式 / 必須トークン / 色の妥当性を検証。失敗や削除時も安全にフォールバック |

> すべてプリセットの上にレイヤーされます。**ワンクリックでオン/オフを切り替え、DSH 標準の外観にワンクリックで復元できます** — 気軽に試してください。壊れる心配はありません。

---

## ⚡ 1行インストール

**この一文を DSH にコピーするだけで、すべてをインストールしてくれます：**

> dsh-dream-skin スキンプラグイン（https://github.com/RevolutionLA/dsh-dream-skin、または npm パッケージ `dsh-dream-skin`）をインストールしてください。その後、DSH Web の再起動方法を教えてください。

CLI がお好みなら、コマンド1つで：

```sh
dsh plugin --profile web add dsh-dream-skin && dsh web
```

> 🚀 **npm でも公開中！** DSH をインストール済みなら、クローン不要でコマンド1つで追加できます。

> **[Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) へのオマージュ。** ただしアプローチは異なります：
> Codex は CDP 経由でデスクトップクライアントのレンダラーに CSS を注入しますが、DSH は「サードパーティプラグインによるテーマ登録」を第一級で備えた **トークン駆動の Web GUI** です。したがって本プラグインは **完全ネイティブ** — 注入もバイナリへのパッチもなく、クライアントのアップデートでも壊れません。
>
> **公式製品ではありません。** ただ、あなたの DeepSeek Harness ワークスペースを彩るためのものです。

---

## 🏆 スターを付けたくなる理由（他の選択肢との比較）

| 機能 | 当プラグイン | 他の DSH スキニング | Codex-Dream-Skin（デスクトップ） |
|------|:---:|:---:|:---:|
| ネイティブのトークンテーマ — 注入なし、インストーラーへのパッチなし | ✅ | ✅ | ❌（CDP 注入） |
| **iOS / Linear 風のクールな半透明マテリアル & カラー** | ✅ | ❌（アニメ風） | ❌ |
| **スキンごとの控えめで高級感のある diffused-glow** | ✅ | 一部対応 | ❌ |
| カスタム壁紙 + 不透明度 / ぼかし | ✅ | 一部対応 | ✅ |
| **テーマパックのインポート / エクスポート + 共有リンク** | ✅ | ❌ | ✅（zip パック） |
| **ユーザーごとの Accent オーバーライド** | ✅ | ❌ | 一部対応 |
| **Wallpaper 2.0（URL / グラデーション / スキンごとの提案 / 自動減光）** | ✅ | ❌ | ✅ |
| ローカルパックライブラリ + お気に入り + おまかせ | ✅ | ❌ | 一部対応 |
| 検証 + ロールバック | ✅ | 一部対応 | ✅ |
| **ブラウザベースの Web GUI、クロスプラットフォームにネイティブ対応** | ✅ | ✅ | ❌（デスクトップアプリが必要） |

---

## ✨ 機能

| 機能 | 説明 |
|------------|-------------|
| 🎨 **プリセット8種を同梱（Mirage）** | **設定 → テーマ / 外観** で即座に切り替え、ライト & ダーク対応 |
| 🖼️ **カスタム壁紙** | ローカル画像を選択（自動圧縮 ≤2MB）、**不透明度 / ぼかし** を調整 |
| 🔤 **不透明な内部サーフェス** | カード、入力欄、メッセージバブルは常に読みやすい — 色褪せない |
| ↩️ **デフォルト復元** | ワンクリックで DSH 標準の外観（システム追従）に戻す |
| 💾 **ローカル永続化** | スキンと壁紙を `localStorage` に保存、リロード後も保持 |

---

## 🧩 これはどんなプラグインか

**標準的な両面構成（dual-face）の「すべてがプラグイン」`dsh-plugin` です — 公式の `ui-theme` パッケージとまったく同じように読み込まれ、使用されます。**

DeepSeek Harness のモットーは *everything is a plugin*（すべてがプラグイン）：モデル、ツール、サンドボックス、セッション、UI、そして Agent Loop 自体までもがプラグインです。`dsh-dream-skin` は、公式 UI パッケージと**同型（isomorphic）**の npm パッケージとしてスキニングを提供します：

```text
            ┌──────────── dsh-dream-skin (standard dsh-plugin / dual-face) ─────────────┐
            │  dsh.bundle   → cordis.patch.yml inserts the dream-skin entry  (host half)│
            │  dsh.client   → lib/client.js (browser bundle)                (browser half)│
            └───────────────────────────────────────────────────────────────────────────┘
```

- **インストールコマンドは公式と同じ**：`dsh plugin --profile web add dsh-dream-skin`
- **公式の拡張ポイントを使用**：`ctx.theme`（テーマの登録）、`ctx.theme.overrideTokens`（オーバーレイレイヤー）、`ctx.slots`（専用の **設定 → テーマ / 外観** セクションへの UI のマウント）。
- **マニフェスト契約は公式パッケージと一致**：`dsh.bundle` + `dsh.client` + `exports["./client"]`。

言い換えれば：あなたは無名のスクリプトをインストールしているのではありません — これは DSH 公式のプラグインシステムの中の、標準的なスキンプラグインです。

---

## ⚡ クイックスタート（3ステップ）

```sh
# 1. install
dsh plugin --profile web add dsh-dream-skin
# 2. restart
dsh web
# 3. open Settings → Theme / Appearance → pick a skin → done.
```

> 公開済みの npm パッケージをインストールします — クローン不要。`dsh plugin add` がワークスペースエラーを報告する場合は `-w` を追加してください。

## 📦 インストール

次の4つの方法のいずれかを選び、**DSH Web を再起動**してください（現在のセッションは中断されますが、DSH のセッションはディスクに保存されており、再起動後に復元されます）。

### オプションA：npm から（公開版、**推奨**）

```sh
dsh plugin --profile web add dsh-dream-skin
```

### オプションB：GitHub から（検証済みコミットに固定）

```sh
dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<40-char-commit>'
```

> リリースのコミットに固定しておけば、`main` の新しい変更がインストール済みのコピーを静かに変えてしまうことはありません。

### オプションC：Release の tarball から（オフライン / git なし）

[Releases](https://github.com/RevolutionLA/dsh-dream-skin/releases) ページから `dsh-dream-skin-<version>.tgz` をダウンロードします（ビルド済みの `lib/client.js` が同梱されているため、インストール時に prepare スクリプトは実行されません）。次に：

```sh
dsh plugin --profile web add ./dsh-dream-skin-<version>.tgz
```

### オプションD：クローンしてローカルパスからインストール（開発用）

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
dsh plugin --profile web add .
```

> `dsh plugin` は相対パスを **コマンドを実行したディレクトリ** 基準に解決し、クローンを指すリンク依存関係をインストールします：ソースを編集して保存し、DSH を再起動するだけで、再インストールは不要です。

**再起動して確認：**

```sh
dsh web
dsh --profile web --dump-config | grep -A2 dream-skin   # a dream-skin loader entry should appear
```

**設定 → テーマ / 外観** を開くと、**スキン**、**アクセント**、**壁紙** / **詳細壁紙**、**テーマパック** の行が表示されます。

> 素の `add` には `-w`（ワークスペース）フラグが必要です。すべてのプロファイルに `pnpm-workspace.yaml` が同梱されており、pnpm はプロファイルディレクトリをワークスペースルートとみなすため、素の add は `ERR_PNPM_ADDING_TO_ROOT` で失敗します。プロファイルがすでにワークスペースを使用している場合は、繰り返す必要はありません。

## 🔄 アップデート / アンインストール

**最新版にアップデート**（npm リリースからインストールした場合）：

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # restart to pick it up
```

> アップデート後も古いバージョンのまま？ pnpm の minimum-release-age（サプライチェーン）ポリシーが、公開直後のリリースを保留することがあります。プロファイルディレクトリで
> `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0` を実行して強制してください。

**アンインストール：**

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # restores the official appearance
```

---

## 🧩 互換性

| 項目 | 値 |
|------|-------|
| DeepSeek Harness（`dsh`） | **同一ビルドで両世代のホストに対応**：安定版 `0.1.0-rc.6` / `0.1.1-rc.x`（peerDependencies は `^0.1.0-rc.6` に固定）と DSH master（分割後のモジュールテーブル） |
| Node.js | `>=18` |
| ブラウザ | モダンな Chromium / WebKit（ネイティブ CSS 変数 & `matchMedia`） |

> DSH をアップグレードするときは、`package.json` の peerDependencies もそれに合わせて更新してください。

---

## ⚙️ 仕組み

DSH のテーマシステムはトークンベースです：Web シェルは `--dsw-*` デザイントークンを提供し、`ThemeRuntime` はサードパーティプラグインがエイリアスレイヤー（`--dsw-alias-*`）をオーバーライドするテーマを登録できるようにします。このパッケージは標準の両面構成プラグインです：

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

- **ホスト側**（`lib/index.js`）— `dsh.bundle` パッチレイヤーで `dream-skin` ローダーエントリを挿入します。`apply` は no-op で、同梱の `ui-*` パッケージとまったく同じです。
- **ブラウザ側**（`lib/client.js`）：
  1. `ctx.theme.register(...)` で 8 つのスキンを登録；
  2. 保存済みのスキンを復元し、`ctx.theme.setTheme(...)` で適用；
  3. 壁紙を `z-index:-1` の固定バックドロップとして描画し、`ctx.theme.overrideTokens(...)` を重ねることで、メインキャンバス（`--dsw-alias-bg-base`）とサイドバー（`--dsw-specific-sidebar-fill`）を半透明に；
  4. `theme/change` をリッスンし、スキン / 配色の切り替え時に壁紙の色調を再調整；
  5. 専用の **設定 → テーマ / 外観** セクション（`settings.section`）を登録し、`settings.dreamSkin.item` スロットに 5 つの機能行をマウントします。

各スキンは `colorScheme`（`light`/`dark`）を持ち、`body[data-ds-dark-theme]` を駆動します。エイリアストークンのオーバーライドは、ui-layout の ThemePresenter によって `<body>` にインラインのカスタムプロパティとして適用されます。

## 💼 永続化のメモ

- スキンと壁紙は `localStorage`（キーは `dsh-dream-skin:` 接頭辞）に保存されます — **ブラウザごと**です。
- なぜ Host 設定にしないのか？ Host 設定の配線は、ブラウザクライアントに許可リスト化された名前空間のみを公開するため（`dsh-host-apiproxy` の `WEB_SETTINGS_NAMESPACES`）、サードパーティの名前空間は `settings-not-exposed` を返します。製品自体もリモートブラウザの設定をプロセスローカルに保持します。`localStorage` はその境界に一致し、リロード後も保持されます。

---

## 🛠️ 開発 / テーマの拡張

クライアントバンドルは `__ModuleLoader__` 形式で直接記述されています（同梱の `ui-*` パッケージが tsdown で生成するのと同じ形）ので、**ビルドステップは不要**です。`lib/client.js` が `require` できるのはモジュールテーブルのエンティティのみです：プラットフォームシード（`react`、`react/jsx-runtime`、…）と登録済みクライアントバンドル（`@deepseek-ai/dsh-client-runtime/client`、…）。

- **内蔵スキンの追加**：`lib/client.js` の `SKINS` 配列にオブジェクト（`id` + `colorScheme` + `tokens`）を追加するだけで、自動的に設定に表示されます。**8 つのロケール辞書すべて**（`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`）に `skin.<id>` キーを追加してください。
- **テーマパックの配布（推奨）**：[`docs/examples/sample-theme-pack.json`](../../docs/examples/sample-theme-pack.json) に従ってください — `*.dsh-theme.json` 1つを設定からインポートでき、リンクで共有も可能。コード変更は不要です。
- **独自の壁紙を追加**：[`wallpapers/`](../../wallpapers/) に画像を置いて（配布するのは権利を持つものだけにしてください）、DSH の「壁紙」行からインポートします。
- **プレビューの再生成**：プレビューは `scripts/generate-skin-mockups.cjs`（実トークン + diffused glow）で HTML モックアップを生成し、ヘッドレス Chrome で `docs/previews/*.png` としてキャプチャします — スキンのトークンを変更したら再実行して、プレビューを実際のスキンと同期させてください。
- **検証**：`npm test`（ファクトリーの評価、`apply()`、パックのインポート / 永続化をカバーする VM スモークテスト）。
- **再ペイント**：`--dsw-alias-*` トークンを参照してください（完全な契約は [`docs/themes-spec.md`](../../docs/themes-spec.md)）。

## 📌 ロードマップ

- [x] v0.1：8テーマ + カスタム壁紙（不透明度 / ぼかし）+ ローカル永続化
- [x] テーマパック形式 + インポート / エクスポート / 共有リンク（JSON + マニフェスト + 検証）
- [x] ユーザーごとの Accent + ランダム化
- [x] Wallpaper 2.0（URL / グラデーション / スキンごとの提案 / 自動減光）
- [x] ローカルパックライブラリ + ワンクリック適用 / お気に入り / おまかせ
- [x] 完全な i18n コピー & ドキュメント（zh / en / ja / ko / es / fr / de / ru）
- [ ] オンラインのパレット / テーマプレビュー Studio（純フロントエンド、コントラストチェッカー）
- [ ] コミュニティテーマギャラリー（パックをリポジトリ / オンラインギャラリーに投稿）
- [ ] 初回描画（FOUC）の改善

---

## 🤝 コントリビューション

Issue と PR は大歓迎です！[コントリビューションガイド](../../CONTRIBUTING.md) と [行動規範](../../CODE_OF_CONDUCT.md) をお読みください。

## ⭐ プロジェクトを支援する

気に入っていただけたら：リポジトリにスター **⭐**、npm で高評価 **👍**、または DSH の仲間にシェアしてください — プロジェクトの発見につながり、メンテナンスの支えになります。テーマ / オンライン Studio / その他のスキンに貢献したいですか？ぜひ参加してください。

## 🔒 セキュリティ

セキュリティの問題を発見しましたか？公開 Issue は開かないでください — [セキュリティポリシー](../../SECURITY.md) をご覧ください。

## 📄 ライセンス

[MIT](../../LICENSE)

## 🙏 謝辞

- アーキテクチャ & API リファレンス：公式 DeepSeek Harness の [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) クライアントパッケージ。
- コンセプトのオマージュ：[Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)。

---

## 📈 成長カーブ

> 毎日自動更新（GitHub Actions）。左軸：**累計ダウンロード数**（青）；右軸：**Star 数**（紫）——桁が大きく異なるため、それぞれ独立した双軸を使用しています。

<p align="center">
  <img src="../../docs/stats.png?v=3" alt="dsh-dream-skin 毎日の Star × 累計ダウンロード数 成長カーブ" width="900"/>
</p>

*データは 24 時間ごとに自動取得：ダウンロード数は [npm 公式API](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin)、Star 数は [GitHub API](https://github.com/RevolutionLA/dsh-dream-skin/stargazers) から取得しています。*
