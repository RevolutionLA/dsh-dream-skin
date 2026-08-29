<p align="center">
  <a href="../../README.md">中文</a> · <a href="./README.en.md">English</a> · <a href="./README.ja.md">日本語</a> · <strong>한국어</strong> · <a href="./README.es.md">Español</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.ru.md">Русский</a>
</p>

<div align="center">

# dsh-dream-skin 🔮

**DeepSeek Harness에 절제되고 맑고 질감 있는 얼굴을 입혀드립니다.**

네이티브 스키닝 · wallpaper · accent color · 공유 가능한 theme pack — 전적으로 DSH 공식 `--dsw-*` token 시스템 위에
구축된 우아한 구현체입니다. 한 번 설치하면 계속 사용할 수 있습니다.

> **TL;DR: 당신의 코딩 공간은 조용해질 수 있습니다.**

| 🎨 오리지널 테마 8종 | 🖼️ wallpaper + diffused glow | 🎯 절제된 accent | 📦 공유 가능한 theme pack |
|---|---|---|---|

> 1줄 설치 · 순수 네이티브 (injection 없음, 설치 프로그램 패치 없음) · DSH 업데이트에도 유지됨

</div>

---

## 🎮 하나의 플러그인, 두 가지 사용 방법

<table>
  <tr>
    <td align="center" width="50%"><h3>🪄 방법 #1: 설치하자마자 우아하게</h3></td>
    <td align="center" width="50%"><h3>🧱 방법 #2: 원하는 대로 DIY</h3></td>
  </tr>
  <tr>
    <td>디자이너가 다듬은 <b>preset skin</b> 8종 (Mirage 시리즈), light &amp; dark, 각각 고유의 diffused-glow 배경을 갖추고 있습니다.<br/><b>하나만 적용하면 바로 프리미엄 — 조정할 것이 없습니다.</b></td>
    <td>어떤 preset 위에서든 <b>wallpaper 교체 (로컬 / URL / gradient)</b>, <b>Accent 색상 쌓기</b>, <b>theme pack 가져오기 &amp; 공유</b>가 가능합니다 — 모든 내부 token에 접근할 수 있습니다.<br/><b>원하는 대로 만들어 보세요.</b></td>
  </tr>
</table>

두 방식은 겹겹이 쌓이면서도 서로 독립적입니다: preset이 "material &amp; 기본 톤"을 정하고, DIY는 순수 오버레이
(`overrideTokens`)이므로 한 번의 클릭으로 켜고 끄고 되돌릴 수 있습니다.

---

## 📸 스크린샷

> 목업이 아닌 실제 스크린샷입니다. 왼쪽: skin을 적용한 DSH 화면; 오른쪽: Settings의 전용 **Theme / Appearance** 섹션.

<p align="center">
  <img src="../../docs/screenshots/preview.png" alt="DSH skin preview" width="46%"/>
  &nbsp;&nbsp;
  <img src="../../docs/screenshots/settings.png" alt="Theme section in settings" width="46%"/>
</p>

---

## 🎨 미리보기 — Mirage 시리즈

> **방법 #1 · 설치하자마자 우아하게.** 아래 8종의 skin은 각 skin의 **실제 tokens + 전용 diffused-glow 배경**으로
> 생성되었습니다 — 보이는 그대로입니다. 클릭하면 정교한 material 디테일을 확대해서 볼 수 있습니다.

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

### 📋 preset 한눈에 보기

| id | 스타일 | 특징 |
|------|--------|------|
| `abyss` | 🕶️ Deep Blue | 차분한 딥 인디고, 절제되고 조용한 |
| `aurora` | 🌌 Aurora Green | 선명하고 반투명한 쿨 틸, 자연스러운 차가운 톤 |
| `nebula` | 🪐 Nebula Purple | 깊고 은은한 바이올렛-블루, 아련하고 신비로운 |
| `ember` | 🔥 Ember Amber | 따뜻하고 절제된 앰버 오렌지 |
| `midnight` | 🌚 Midnight OLED | 미니멀한 순수 블랙, 몰입감 있는 OLED |
| `ivory` | 📐 iOS Flat | 미니멀한 플랫 화이트, iOS 시스템 그레이 + 절제된 블루 |
| `mist` | 🧊 Liquid Glass | 맑은 프로스트 글라스, 반투명 + 블러 |
| `rose` | 🌸 Material Pink | 밝고 선명한 핑크, Google Material 플랫 컬러 |

---

## 🧱 진지한 DIY 공간 (방법 #2)

> preset을 넘어, dsh-dream-skin은 완전한 커스터마이징 시스템을 제공합니다. 여기서 시작해
> 당신만의 작업 공간을 만들어 보세요.

| 기능 | 할 수 있는 일 |
|------|------|
| 🖼️ **Wallpaper 2.0** | 로컬 이미지 / **이미지 URL** / **gradient preset**; 여기에 **opacity / blur**까지; 각 skin은 심지어 gradient를 **추천**하고 **자동으로 어둡게**(집중할 때 방해 요소 줄이기) 할 수 있습니다 |
| 🌈 **사용자별 Accent** | 활성 skin 위에 나만의 브랜드 accent를 쌓을 수 있습니다 (`overrideTokens` 레이어, skin은 그대로): **클릭 한 번으로 적용되는 preset 스와치 12종**, color picker, 랜덤, 그리고 초기화/복원 옵션 |
| 📦 **Theme pack 가져오기 / 내보내기 / 공유** | `*.dsh-theme.json` = manifest + 전체 tokens. 파일을 가져오거나, 한 번의 클릭으로 적용하거나, **공유 링크**(URL hash에 인코딩)를 복사할 수 있습니다 |
| 🪟 **Popup 투명도** | dropdown / overlay / dialog의 하단 채움 투명도를 조절하는 슬라이더, 설정이 유지됩니다 |
| 🧩 **로컬 pack 라이브러리** | 가져온 pack을 한곳에 모아둡니다; **적용 / 즐겨찾기 / 삭제**를 한 번의 클릭으로 |
| 🎲 **Surprise me** | 랜덤으로 다른 테마로 전환합니다; 즐겨찾기에 **별표(star)**를 붙이면 빠르게 전환할 수 있습니다 |
| ✅ **검증 + 롤백** | pack 가져오기 시 형식 / 필수 tokens / 색상 유효성을 검증합니다; 실패하거나 삭제해도 안전하게 되돌아갑니다 |

> 모든 것은 preset 위에 겹쳐집니다. **한 번의 클릭으로 켜고 끄고 DSH 기본 모습으로 되돌릴 수 있으니** — 마음껏
> 실험해 보세요, 아무것도 망가지지 않습니다.

---

## ⚡ 한 줄 설치

**이 문장을 DSH에 붙여넣으면 모든 것이 자동으로 설치됩니다:**

> dsh-dream-skin 스킨 플러그인을 설치해 주세요 (https://github.com/RevolutionLA/dsh-dream-skin 또는 npm 패키지 `dsh-dream-skin`), 그리고 DSH Web을 재시작하는 방법을 알려주세요.

CLI를 선호하시나요? 명령어 하나면 됩니다:

```sh
dsh plugin --profile web add dsh-dream-skin && dsh web
```

> 🚀 **이제 npm에서 제공됩니다!** DSH가 설치되어 있다면 클론 없이 명령어 하나로 추가하세요.

> [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)에 대한 오마주. 다만 접근 방식은 다릅니다:
> Codex는 CDP를 통해 데스크톱 클라이언트의 renderer에 CSS를 주입하지만, DSH는 "서드파티 플러그인이 테마를 등록하는"
> 일급 기능을 탑재한 **token 기반 Web GUI**입니다. 따라서 이 플러그인은 **순수 네이티브**입니다 — injection도, 바이너리
> 패치도 없고, 클라이언트 업데이트로 깨지지 않습니다.
>
> **공식 제품이 아닙니다.** DeepSeek Harness 작업 공간을 꾸미는 하나의 방법일 뿐입니다.

---

## 🏆 별 하나를 받을 만한 이유 (대안과의 비교)

| 기능 | 당사 제품 | 기타 DSH 스키닝 | Codex-Dream-Skin (데스크톱) |
|------|:---:|:---:|:---:|
| 네이티브 token 테마 — injection 없음, 설치 프로그램 패치 없음 | ✅ | ✅ | ❌ (CDP injection) |
| **iOS/Linear 스타일의 쿨한 반투명 material & color** | ✅ | ❌ (애니메이션풍) | ❌ |
| **skin마다 절제된 프리미엄 diffused-glow** | ✅ | 일부 | ❌ |
| 커스텀 wallpaper + opacity/blur | ✅ | 일부 | ✅ |
| **Theme pack 가져오기/내보내기 + 공유 링크** | ✅ | ❌ | ✅ (zip pack) |
| **사용자별 Accent 오버라이드** | ✅ | ❌ | 일부 |
| **Wallpaper 2.0 (URL / gradient / skin별 추천 / auto-dim)** | ✅ | ❌ | ✅ |
| 로컬 pack 라이브러리 + 즐겨찾기 + surprise-me | ✅ | ❌ | 일부 |
| 검증 + 롤백 | ✅ | 일부 | ✅ |
| **브라우저 Web GUI, 크로스 플랫폼 네이티브** | ✅ | ✅ | ❌ (데스크톱 App 필요) |

---

## ✨ 주요 기능

| 기능 | 설명 |
|------------|-------------|
| 🎨 **기본 내장 preset 8종 (Mirage)** | **Settings → Theme / Appearance**에서 즉시 전환, light & dark |
| 🖼️ **커스텀 wallpaper** | 로컬 이미지 선택 (자동 압축 ≤2MB), **opacity / blur** 조절 |
| 🔤 **불투명한 내부 표면** | 카드, 입력창, 메시지 버블이 항상 읽기 쉽게 유지됩니다 — 바랜 느낌 없음 |
| ↩️ **기본값 복원** | 한 번의 클릭으로 DSH 기본 모습 (시스템 팔로우)으로 복귀 |
| 💾 **로컬 저장** | skin & wallpaper가 `localStorage`에 저장되어 새로고침 후에도 유지됩니다 |

---

## 🧩 어떤 종류의 플러그인인가요

**표준 dual-face "everything-is-a-plugin" `dsh-plugin` — 공식 `ui-theme` 패키지와 똑같이 로드되고 사용됩니다.**

DeepSeek Harness의 모토는 *everything is a plugin*입니다: models, tools, sandboxes, sessions, UI, 심지어 Agent Loop
자체도 플러그인입니다. `dsh-dream-skin`은 공식 UI 패키지와 **동형(isomorphic)**인 npm 패키지로 스키닝을 제공합니다:

```text
            ┌──────────── dsh-dream-skin (standard dsh-plugin / dual-face) ─────────────┐
            │  dsh.bundle   → cordis.patch.yml inserts the dream-skin entry  (host half)│
            │  dsh.client   → lib/client.js (browser bundle)                (browser half)│
            └───────────────────────────────────────────────────────────────────────────┘
```

- **설치 명령어 = 공식 명령어**: `dsh plugin --profile web add dsh-dream-skin`
- **공식 확장 포인트 사용**: `ctx.theme` (테마 등록), `ctx.theme.overrideTokens` (오버라이드 레이어),
  `ctx.slots` (전용 **Settings → Theme / Appearance** 섹션에 UI 마운트).
- **Manifest 계약이 공식 패키지와 일치**: `dsh.bundle` + `dsh.client` + `exports["./client"]`.

즉, 변두리 스크립트를 설치하는 것이 아닙니다 — DSH 공식 플러그인 시스템 안의 표준 skin 플러그인입니다.

---

## ⚡ 빠른 시작 (3단계)

```sh
# 1. install
dsh plugin --profile web add dsh-dream-skin
# 2. restart
dsh web
# 3. open Settings → Theme / Appearance → pick a skin → done.
```

> 게시된 npm 패키지를 설치합니다 — 클론 없음. `dsh plugin add`가 workspace 오류를 보고하면 `-w`를 추가하세요.

## 📦 설치

네 가지 옵션 중 하나를 선택한 뒤 **DSH Web을 재시작**하세요 (현재 세션은 중단되지만, DSH 세션은 디스크에 저장되어
재시작 후 복구됩니다).

### 옵션 A: npm에서 (게시 버전, **권장**)

```sh
dsh plugin --profile web add dsh-dream-skin
```

### 옵션 B: GitHub에서 (검증된 commit에 고정)

```sh
dsh plugin --profile web add 'github:RevolutionLA/dsh-dream-skin#<40-char-commit>'
```

> 릴리스의 commit에 고정하면 `main`의 새로운 변경 사항이 설치된 복사본을 조용히 바꾸지 않습니다.

### 옵션 C: Release tarball에서 (오프라인 / git 없음)

[Releases](https://github.com/RevolutionLA/dsh-dream-skin/releases) 페이지에서 `dsh-dream-skin-<version>.tgz`를
다운로드하세요 (빌드된 `lib/client.js`가 포함되어 있어 설치 시 prepare 스크립트가 실행되지 않습니다), 그런 다음:

```sh
dsh plugin --profile web add ./dsh-dream-skin-<version>.tgz
```

### 옵션 D: 클론 후 로컬 경로에서 설치 (개발용)

```sh
git clone https://github.com/RevolutionLA/dsh-dream-skin.git
cd dsh-dream-skin
dsh plugin --profile web add .
```

> `dsh plugin`은 상대 경로를 **명령어를 실행한 디렉터리** 기준으로 해석해, 클론을 가리키는 link 의존성을 설치합니다:
> 소스를 수정하고, 저장하고, DSH를 재시작하면 됩니다 — 재설치 불필요.

**재시작 및 확인:**

```sh
dsh web
dsh --profile web --dump-config | grep -A2 dream-skin   # a dream-skin loader entry should appear
```

**Settings → Theme / Appearance**를 열면 **Skins**, **Accent**, **Wallpaper** / **Advanced Wallpaper**, **Theme Packs** 행이 보입니다.

> 단독 `add`에는 `-w` (workspace) 플래그가 필요합니다. 모든 profile이 `pnpm-workspace.yaml`을 포함하고 있어
> pnpm이 profile 디렉터리를 workspace root로 취급하기 때문에, 단독 add는 `ERR_PNPM_ADDING_TO_ROOT` 오류로 실패합니다.
> profile이 이미 workspace를 사용 중이라면 다시 추가할 필요가 없습니다.

## 🔄 업데이트 / 제거

**최신 버전으로 업데이트** (npm 릴리스에서 설치한 경우):

```sh
dsh plugin --profile web update dsh-dream-skin
dsh web   # restart to pick it up
```

> 업데이트 후에도 예전 버전에 머물러 있나요? pnpm의 minimum-release-age (공급망) 정책이 방금 게시된 릴리스를
> 보류할 수 있습니다. profile 디렉터리에서 `pnpm add dsh-dream-skin@latest --config.minimumReleaseAge=0`를
> 실행해 강제하세요.

**제거:**

```sh
dsh plugin --profile web remove dsh-dream-skin
dsh web   # restores the official appearance
```

---

## 🧩 호환성

| 항목 | 값 |
|------|-------|
| DeepSeek Harness (`dsh`) | **하나의 빌드로 두 세대의 호스트 모두 지원**: 안정版 `0.1.0-rc.6` / `0.1.1-rc.x` (peerDependencies가 `^0.1.0-rc.6`으로 고정됨) 및 DSH master (분할 후 모듈 테이블) |
| Node.js | `>=18` |
| 브라우저 | 최신 Chromium / WebKit (네이티브 CSS variables & `matchMedia`) |

> DSH를 업그레이드할 때 `package.json`의 peerDependencies도 그에 맞게 올려주세요.

---

## ⚙️ 동작 방식

DSH의 테마 시스템은 token 기반입니다: web shell이 `--dsw-*` 디자인 tokens를 제공하고, `ThemeRuntime`은 서드파티
플러그인이 alias 레이어(`--dsw-alias-*`)를 오버라이드하는 테마를 등록할 수 있게 합니다. 이 패키지는 표준 dual-face
플러그인입니다:

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

- **Host half** (`lib/index.js`) — `dream-skin` loader 항목을 삽입하는 `dsh.bundle` 패치 레이어; `apply`는
  no-op입니다. 제공되는 `ui-*` 패키지와 정확히 동일합니다.
- **Browser half** (`lib/client.js`):
  1. `ctx.theme.register(...)`로 8종의 skin을 등록합니다;
  2. 저장된 skin을 복원하고 `ctx.theme.setTheme(...)`로 적용합니다;
  3. wallpaper를 `z-index:-1` 고정 배경으로 렌더링하고 `ctx.theme.overrideTokens(...)`를 쌓아
     메인 캔버스(`--dsw-alias-bg-base`)와 사이드바(`--dsw-specific-sidebar-fill`)를 반투명하게 만듭니다;
  4. `theme/change`를 수신해 skin / scheme 전환 시 wallpaper wash를 다시 칠합니다;
  5. 전용 **Settings → Theme / Appearance** 섹션(`settings.section`)을 등록하고 다섯 가지 기능 행을
     `settings.dreamSkin.item` 슬롯 아래에 마운트합니다.

각 skin은 `colorScheme` (`light`/`dark`)을 지니고 `body[data-ds-dark-theme]`를 구동합니다; alias-token 오버라이드는
ui-layout의 ThemePresenter가 `<body>`에 인라인 커스텀 프로퍼티로 적용합니다.

## 💼 저장(persistence) 참고 사항

- Skin & wallpaper는 `localStorage`에 저장됩니다 (키 접두사 `dsh-dream-skin:`), **브라우저별로**.
- 왜 Host 설정을 사용하지 않나요? Host 설정 채널은 브라우저 클라이언트에 허용 목록(allowlist)에 있는 네임스페이스만
  노출합니다 (`dsh-host-apiproxy`의 `WEB_SETTINGS_NAMESPACES`), 따라서 서드파티 네임스페이스는
  `settings-not-exposed`로 응답합니다; 제품 자체도 원격 브라우저 환경설정을 프로세스 로컬로 유지합니다.
  `localStorage`는 그 경계와 일치하며 새로고침 후에도 유지됩니다.

---

## 🛠️ 개발 / 테마 확장

클라이언트 번들은 `__ModuleLoader__` 형식으로 직접 작성되어 있습니다 (제공되는 `ui-*` 패키지에 대해 tsdown이
출력하는 것과 동일한 형태), 따라서 **빌드 단계가 필요 없습니다**. `lib/client.js`는 module-table 항목만
`require`할 수 있습니다: 플랫폼 seeds (`react`, `react/jsx-runtime`, …)와 등록된 클라이언트 번들
(`@deepseek-ai/dsh-client-runtime/client`, …).

- **기본 내장 skin 추가**: `lib/client.js`의 `SKINS` 배열에 객체(`id` + `colorScheme` + `tokens`)를 추가하면
  Settings에 자동으로 나타납니다. **8개 로케일 사전 모두**(`zh`/`en`/`ja`/`ko`/`es`/`fr`/`de`/`ru`)에
  `skin.<id>` 키를 추가하세요.
- **Theme pack 배포 (권장)**: [`docs/examples/sample-theme-pack.json`](../../docs/examples/sample-theme-pack.json)을
  참고하세요 — `*.dsh-theme.json` 하나면 Settings에서 가져올 수 있고 링크로 공유할 수 있으며, 코드 변경이 필요 없습니다.
- **나만의 wallpaper 추가**: [`wallpapers/`](../../wallpapers/)에 이미지를 넣고 (배포 권한이 있는 것만), DSH의
  "Wallpaper" 행에서 가져오세요.
- **미리보기 재생성**: 미리보기는 `scripts/generate-skin-mockups.cjs`가 (실제 tokens + diffused glow) HTML 목업으로
  생성한 뒤, headless Chrome으로 `docs/previews/*.png`로 캡처합니다 — skin의 tokens를 변경한 뒤 다시 실행해
  미리보기를 실제 skin과 동기화하세요.
- **검증**: `npm test` (factory eval, `apply()`, pack import/저장을 포함한 VM smoke 테스트).
- **리페인트**: `--dsw-alias-*` tokens를 참조하세요 (전체 계약은 [`docs/themes-spec.md`](../../docs/themes-spec.md)에).

## 📌 로드맵

- [x] v0.1: 테마 8종 + 커스텀 wallpaper (opacity / blur) + 로컬 저장
- [x] Theme pack 형식 + 가져오기 / 내보내기 / 공유 링크 (JSON + manifest + 검증)
- [x] 사용자별 Accent + 랜덤
- [x] Wallpaper 2.0 (URL / gradient / skin별 추천 / auto-dim)
- [x] 로컬 pack 라이브러리 + 한 번 클릭 적용 / 즐겨찾기 / surprise-me
- [x] 완전한 i18n 문구 & 문서 (zh / en / ja / ko / es / fr / de / ru)
- [ ] 온라인 팔레트 / 테마 미리보기 Studio (순수 프론트엔드, 대비 검사기)
- [ ] 커뮤니티 테마 갤러리 (저장소 / 온라인 갤러리에 pack 제출)
- [ ] 첫 페인트 (FOUC) 개선

---

## 🤝 기여하기

Issues와 PR을 환영합니다! [기여 가이드](../../CONTRIBUTING.md)를 읽고 [행동 강령](../../CODE_OF_CONDUCT.md)을
준수해 주세요.

## ⭐ 프로젝트 지원하기

마음에 드신다면: 저장소에 star **⭐**, npm에 thumbs-up **👍**, 또는 DSH 친구들에게 공유해 주세요 — 프로젝트가 더
많이 발견되고 유지되는 데 도움이 됩니다. 테마 / 온라인 Studio / 더 많은 skin에 기여하고 싶으신가요? 함께해 주세요.

## 🔒 보안

보안 문제를 발견하셨나요? 공개 이슈를 열지 말고 [보안 정책](../../SECURITY.md)을 확인해 주세요.

## 📄 라이선스

[MIT](../../LICENSE)

## 🙏 감사의 말

- 아키텍처 & API 참고: 공식 DeepSeek Harness
  [ui-theme](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client/ui-theme) 클라이언트 패키지.
- 컨셉 오마주: [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin).

---

## 📈 성장 곡선

> 매일 자동 업데이트(GitHub Actions). 왼쪽 축: **누적 다운로드 수**(청록); 오른쪽 축: **Star 수**(보라) — 규모가 크게 달라 각각 독립된 이중 축을 사용합니다.

<p align="center">
  <img src="../../docs/stats.png?v=2" alt="dsh-dream-skin 매일 Star × 누적 다운로드 수 성장 곡선" width="900"/>
</p>

*데이터는 24시간마다 자동 수집됩니다: 다운로드 수는 [npm 공식 API](https://api.npmjs.org/downloads/range/2026-08-15:2026-12-31/dsh-dream-skin), Star 수는 [GitHub API](https://github.com/RevolutionLA/dsh-dream-skin/stargazers)에서 가져옵니다.*
