# 교회원 의견 수집 — Firebase 설정 방법

> ⚠️ 관리자 로그인은 이제 **이메일/비밀번호 방식**입니다. 로그인·관리자 설정은 [`ADMIN_SETUP.md`](ADMIN_SETUP.md)를 따라 주세요. (아래 5번의 Google 로그인은 더 이상 사용하지 않습니다)

별도의 서버 없이 Firebase(Firestore + Google 로그인)만으로 작동합니다.
교회원 규모라면 무료 요금제(Spark)로 충분합니다.

## 작동 방식

```
교회원 (로그인 불필요)                     관리자 (Google 로그인)
 사이트 우측 하단 「ご意見・修正依頼」      /admin/  ご意見管理
   └ 場所を選ぶ → 수정할 부분 클릭            ├ 페이지별 목록 (실시간 반영)
   └ 내용 · 이름(선택) 입력 → 전송            ├ 未対応 / 保留 / 対応済み 상태 변경 · 메모
            │                                 ├ 「を開く」→ 해당 위치가 하이라이트된 페이지
            ▼                                 └ CSV 내보내기 (엑셀)
      Firestore `feedback` 컬렉션  ◀──── 읽기·수정은 관리자만 (firestore.rules)
```

---

## 설정 순서 (약 10분)

### 1. 프로젝트 만들기
1. <https://console.firebase.google.com> 에 접속 → **프로젝트 추가**
2. 이름 예: `fukuoka-shinsei-church` / Google 애널리틱스는 **사용 안 함**

### 2. 웹 앱 등록 → 설정값 복사
1. 프로젝트 개요 → **웹(`</>`) 아이콘** → 앱 닉네임 입력 → 등록 (Hosting 체크 불필요)
2. 화면에 나오는 `firebaseConfig`의 값을 `assets/js/config.js`의 `FIREBASE_CONFIG`에 붙여넣기

```js
const FIREBASE_CONFIG = {
  apiKey: 'AIza....',
  authDomain: 'fukuoka-shinsei-church.firebaseapp.com',
  projectId: 'fukuoka-shinsei-church',
  ...
};
```
> 이 값들은 공개되어도 괜찮습니다. 데이터 보호는 4번의 보안 규칙이 담당합니다.

### 3. Firestore 데이터베이스 만들기
1. 빌드 → **Firestore Database** → 데이터베이스 만들기
2. 위치: **`asia-northeast1 (Tokyo)`** ← 나중에 변경할 수 없습니다
3. **프로덕션 모드**로 시작

### 4. 보안 규칙 등록
1. Firestore → **규칙** 탭
2. 저장소의 `firestore.rules` 내용을 전부 붙여넣기
3. `ADMIN_EMAILS` 부분에 관리자 Google 계정을 추가·수정 → **게시**

### 5. Google 로그인 켜기
1. 빌드 → **Authentication** → 시작하기
2. 로그인 방법 → **Google** → 사용 설정 → 저장
3. Authentication → 설정 → **승인된 도메인**에 사이트 주소 추가
   - 예: `아이디.github.io`
   - 독자 도메인을 쓰면 그 도메인도 추가

### 6. 확인
1. 변경한 `config.js`를 GitHub에 올리기
2. 사이트에서 「ご意見・修正依頼」 버튼으로 테스트 전송
3. `https://…/admin/` 접속 → Google 로그인 → 목록에 나타나면 완료

---

## 운영

| 하고 싶은 일 | 방법 |
|---|---|
| 관리자 추가 | `firestore.rules`의 이메일 목록에 추가 → 콘솔에서 다시 **게시** |
| 검토 기간 종료 (버튼 숨김) | `config.js` → `FEEDBACK.enabled: false` |
| 결과 공유 | 관리 화면의 **CSV** 버튼 → 엑셀·구글 시트에서 열기 |

## 참고

- 관리 화면(`/admin/`)은 메뉴에 나오지 않고 검색엔진에도 노출되지 않습니다(noindex). 주소를 알더라도 규칙에 등록된 계정이 아니면 내용을 볼 수 없습니다.
- 교회원은 의견을 **쓰기만** 할 수 있습니다. 다른 사람의 의견은 볼 수 없고, 내용 길이와 형식은 규칙에서 검사합니다.
- 장난 전송이 문제가 되면 Firebase **App Check**(reCAPTCHA)를 추가로 켤 수 있습니다.
- 「場所を選ぶ」는 페이지 구조를 기준으로 위치를 기억합니다. 이후 페이지 내용을 크게 고치면 예전 의견의 하이라이트 위치가 어긋날 수 있습니다. 그래도 선택한 부분의 문구는 함께 저장되므로 어느 부분인지는 알 수 있습니다.
