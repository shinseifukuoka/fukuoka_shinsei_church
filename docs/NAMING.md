# 네이밍 규칙 · 코딩 규칙

福岡新生キリスト教会 사이트의 이름 짓는 규칙과 코드 작성 규칙입니다. 새 페이지나 부품을 추가할 때 이 문서를 기준으로 작업해 주세요.

---

## 1. 폴더 · 파일

| 대상 | 규칙 | 예시 |
|---|---|---|
| 폴더 | 영문 소문자 + 하이픈(kebab-case) | `first-visit/` |
| 섹션 대표 페이지 | 폴더 안의 `index.html` → 주소가 `/about/`처럼 깔끔해짐 | `about/index.html` |
| 하위 페이지 | `섹션폴더/내용.html` | `about/staff.html`, `worship/sermons.html` |
| CSS | `assets/css/style.css` 1개로 통합 | |
| JS | 역할별로 분리 | `config.js`(설정), `layout.js`(동작), `data/weekly.js`(매주 갱신 데이터) |

**금지**: 대문자(`Headerlogo.png`), 공백(`unnamed (2).webp`), 의미 없는 이름(`c.png`), 한글·일본어 파일명

### 사이트 구조

```
/
├─ index.html                 トップ
├─ about/                     教会紹介
│  ├─ index.html              教会について
│  ├─ history.html            歩みと証し
│  ├─ staff.html              牧師・スタッフ   (구 pastor.html 통합)
│  └─ facility.html           会堂案内
├─ worship/                   礼拝・集会
│  ├─ index.html              礼拝・集会案内
│  └─ sermons.html            メッセージ・週報・早天祈祷会
├─ hallelujah/index.html      ハレルヤ食堂   (教会の活動)
├─ album/index.html           フォトアルバム (教会の活動)
├─ mission/index.html         世界宣教       (단독 메뉴 · 핵심 비전)
├─ first-visit/index.html     初めての方へ     (구 faq.html + 처음 오신 분 안내 통합)
├─ access/index.html          アクセス
├─ admin/                     管理画面 (관리자 전용, 메뉴에 없음)
│  ├─ index.html · admin.css
│  └─ js/core.js · dashboard.js · bulletin.js · sermons.js · shokudo.js
│        album.js · mission.js · settings.js · feedback.js   (탭 1개 = 파일 1개)
├─ firestore.rules            Firestore 보안 규칙
├─ assets/
│  ├─ css/style.css · feedback.css
│  ├─ js/config.js · layout.js · data/weekly.js
│  │    firebase.js · content.js · feedback.js  (Firebase 연동)
│  └─ img/{common,hero,facility,staff,mission}/
└─ docs/NAMING.md
```

---

## 2. 이미지

**형식**: `assets/img/{분류}/{분류}-{대상}[-{구분}].webp`

| 분류 폴더 | 파일명 예시 |
|---|---|
| `common/` 로고·공통 | `logo-header.webp`, `favicon.png`, `placeholder-person.webp` |
| `hero/` 메인 비주얼 | `hero-top.webp` |
| `facility/` 시설 (층 표기) | `facility-sanctuary-2f.webp`, `facility-prayer-room-1f.webp` |
| `staff/` 교역자·스태프 (성-이름 로마자) | `staff-takeda-junsei.webp`, `staff-noguchi-kazuko.webp` |
| `mission/` 선교사 | `missionary-kandel-janak.webp`, `mission-wall.webp` |

- 형식은 **WebP**, 가로 최대 1600px(인물은 600px)
- 인물 사진은 **세로 3:4** 비율 권장
- 스태프·선교사 사진은 파일이 없으면 기본 실루엣이 자동으로 표시됩니다. 정해진 파일명으로 올리기만 하면 바로 반영됩니다.

---

## 3. CSS 클래스 — FLOCSS + BEM

### 접두어 (역할)

| 접두어 | 의미 | 예시 |
|---|---|---|
| `l-` | Layout: 사이트 골격 (페이지당 1개) | `l-header`, `l-gnav`, `l-drawer`, `l-footer`, `l-main` |
| `c-` | Component: 어디서나 재사용하는 부품 | `c-card`, `c-btn`, `c-tag`, `c-profile`, `c-faq` |
| `p-` | Project: 특정 페이지 전용 | `p-hero`, `p-home-quick`, `p-facility__img` |
| `a-` | Admin: 관리 화면 전용 (`admin/admin.css`) | `a-card`, `a-field`, `a-photo` |
| `u-` | Utility: 한 가지 역할만 하는 보조 | `u-center`, `u-mt-0`, `u-draft` |
| `is-` | 상태 (JS가 붙였다 뗐다 함) | `is-current`, `is-show`, `is-drawer-open` |
| `js-` | JS 연결 전용 (**스타일 지정 금지**) | `js-schedule`, `js-drawer-toggle` |

### BEM 표기

```
블록__요소--변형
.c-card               블록
.c-card__title        요소 (언더바 2개)
.c-card--accent       변형 (하이픈 2개)
```

### 주요 컴포넌트

| 클래스 | 용도 | 변형 |
|---|---|---|
| `c-card` | 흰 박스 | `--accent`(상단 파란 선), `--flush`(여백 없음, 사진용) |
| `c-heading` | 섹션 제목 | `--center`, `--section`(박스 밖 큰 제목) |
| `c-btn` | 버튼 | `--primary`, `--ghost`, `--line`, `--outline`, `--navy`, `--block` |
| `c-tag` | 작은 배지 | `--weekday`, `--morning`, `--new`, `--label`, `--green` |
| `c-quote` | 성구·인용 | `--blue` |
| `c-profile` | 사진 + 본문 (목사) | `--s` (선교사용 작은 크기) |
| `c-person` | 스태프 작은 카드 | |
| `c-list` | 불릿 목록 | `--check`, `--pin`, `--plain` |
| `c-grid` | 자동 그리드 | `style="--grid-min: 340px"`로 최소 폭 조정 |
| `c-faq`, `c-steps`, `c-schedule`, `c-linklist`, `c-chips`, `c-contact`, `c-map` | 각 용도 전용 | |

### 작성 규칙

1. **인라인 `style=""` 금지.** 예외는 CSS 변수를 넘길 때(`--grid-min`)뿐입니다.
2. 색상·그림자·둥근 모서리는 `:root` 변수(`--c-navy`, `--radius-m` 등)만 사용합니다. 새 색이 필요하면 변수부터 추가하세요.
3. 새 부품을 만들기 전에 기존 `c-` 컴포넌트와 변형으로 해결되는지 먼저 확인합니다.
4. 한 페이지에서만 쓰는 스타일은 `p-{페이지}-{이름}`으로 만들어 style.css의 `4. Project` 구역에 넣습니다.
5. 반응형 기준점은 `1024px`(태블릿), `900px`(메뉴 전환), `768px`(모바일) 3개입니다.

---

## 4. JavaScript

| 대상 | 규칙 | 예시 |
|---|---|---|
| 설정 상수 | 대문자 스네이크 | `SITE`, `NAV`, `SCHEDULE`, `SERMONS`, `MORNING_PRAYERS` |
| 변수·함수 | camelCase | `fmtDate`, `setDrawer` |
| 데이터 키 | camelCase 영문 | `youtube`, `slides`, `bulletin` |
| 날짜 | `'YYYY-MM-DD'` 문자열 | `'2026-08-16'` → 「2026年8月16日（日）」 자동 변환 |

### HTML과 JS 연결 방법

```html
<body data-root="../" data-page="about-staff">   <!-- 루트 경로 + 현재 페이지 ID(NAV의 id) -->
<span data-site="tel"></span>                    <!-- SITE.tel 텍스트 삽입 -->
<a data-site-href="line">LINE</a>                <!-- 링크 삽입 (URL이 비어 있으면 자동으로 숨김) -->
<div class="js-schedule"></div>                  <!-- 예배시간표 자동 생성 -->
<img ... data-fallback>                          <!-- 사진이 없으면 기본 실루엣 -->
```

---

## 5. 새 하위 페이지 추가 순서

1. 같은 섹션의 기존 페이지를 복사합니다. (예: `about/history.html` → `about/newpage.html`)
2. `<title>`, `<meta name="description">`, `data-page="about-newpage"`, hero 문구를 수정합니다.
3. `assets/js/config.js`의 `NAV`에서 해당 섹션 `children`에 한 줄을 추가합니다.
   → 글로벌 메뉴, 드롭다운, 모바일 메뉴, 서브 탭에 자동으로 반영됩니다.

---

## 6. 캐시 대책 (버전 번호)

HTML에서 CSS·JS를 불러올 때 `style.css?v=20260927`처럼 버전 번호를 붙입니다.
CSS나 JS를 수정했는데 스마트폰에서 예전 화면이 보이면, 모든 HTML의 `?v=` 숫자를 오늘 날짜로 바꿔 주세요.
(`feedback.css` · `firebase.js` · `feedback.js`는 `layout.js`의 번호를 자동으로 따라갑니다.)

---

## 7. Firestore 컬렉션 이름

| 컬렉션 | 문서 ID | 내용 |
|---|---|---|
| `bulletins` | `YYYY-MM-DD` | 주보 메타 + 암송성구 `{date, verse, verseRef, pages, thumb}` |
| `bulletinPages` | `YYYY-MM-DD_1` … | 주보 이미지 1장씩 `{data}` |
| `shokudo` | 자동 ID | 식당 일정 `{date, time, menu, note, image}` |
| `album` | 자동 ID | 사진 목록용 `{cat, title, date, thumb}` |
| `albumFull` | album과 같은 ID | 확대용 원본 `{data}` |
| `sermons` | `YYYY-MM-DD` | 설교 `{date, title, bible, speaker, youtube, slides}` |
| `morning` | `YYYY-MM-DD` | 새벽기도 본문 `{date, bible}` |
| `missionNews` | 자동 ID | 선교 소식 `{date, missionary, title, body, prayer, image}` |
| `settings` | `offering` | 헌금 계좌 `{draft, accounts[], note}` |
| `feedback` | 자동 ID | 교회원 의견 |

공개 페이지에서 불러올 자리는 `js-fs-` 접두어 클래스로 표시합니다 (`js-fs-verse`, `js-fs-bulletin`, `js-fs-shokudo`, `js-fs-photos`, `js-fs-album`).
