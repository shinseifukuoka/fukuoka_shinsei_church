# 福岡新生キリスト教会 웹사이트

빌드 과정이 없는 정적 사이트입니다. GitHub Pages에 그대로 올리면 되고, 로컬에서는 `index.html`을 더블클릭해서 미리볼 수도 있습니다.

## 자주 하는 수정 — 이 파일들만 열면 됩니다

| 하고 싶은 일 | 수정할 파일 |
|---|---|
| **주보 이미지 · 암송성구 · 식당 일정 · 앨범 사진** | **관리 화면 `/admin/`** (코드 수정 불필요) → [`docs/ADMIN_SETUP.md`](docs/ADMIN_SETUP.md) |
| 매주 설교 · 새벽기도 본문 갱신 | `assets/js/data/weekly.js` (배열 맨 위에 추가) |
| 전화번호 · LINE · YouTube · 지도 링크 | `assets/js/config.js` → `SITE` |
| 예배 시간 변경 | `assets/js/config.js` → `SCHEDULE` |
| 헌금 계좌 안내 (礼拝・集会 페이지) | `assets/js/config.js` → `OFFERING` (실제 계좌 입력 후 `draft: false`) |
| 메뉴 추가·순서 변경 | `assets/js/config.js` → `NAV` |
| 스태프·선교사 사진 등록 | `assets/img/staff/`, `assets/img/mission/`에 정해진 파일명으로 업로드 |

헤더, 메뉴, 푸터, 하단 버튼 바는 `layout.js`가 모든 페이지에 자동으로 그려 줍니다. HTML 파일마다 따로 고칠 필요가 없습니다.

## 교회원 의견 수집 (Firebase)

사이트 우측 하단 「ご意見・修正依頼」 버튼 → 관리 화면 `/admin/`. 설정 방법은 [`docs/FEEDBACK_SETUP.md`](docs/FEEDBACK_SETUP.md)를 참고하세요.
`config.js`의 `FIREBASE_CONFIG`가 비어 있는 동안에는 버튼이 표시되지 않습니다.

## 규칙

네이밍 규칙과 코딩 규칙은 [`docs/NAMING.md`](docs/NAMING.md)에 정리되어 있습니다.

## 공개 전 체크리스트

- [ ] `weekly.js`의 `youtube` / `slides` / `bulletin`에 실제 링크 입력 (`youtube`가 비어 있으면 채널 페이지로 연결됩니다)
- [ ] 주임목사 인사말 정식 원고로 교체 (`about/staff.html`의 `u-draft` 안내 삭제)
- [ ] 스태프 이름·소개문(※紹介文仮) 확정
- [ ] 스태프 6명 · 선교사 5명 사진 업로드
- [ ] 竹田浩 목사 사진을 고해상도로 교체 (현재 원본이 119×155px)
