/* ==========================================================================
   config.js — 사이트 공통 정보 (단일 관리 지점)
   전화번호·LINE·YouTube·메뉴·예배시간은 여기만 고치면 전 페이지에 반영됩니다.
   ========================================================================== */

const SITE = {
  name: '福岡新生キリスト教会',
  fullName: '日本バプテスト連盟 福岡新生キリスト教会',
  nameEn: 'Fukuoka Shinsei Baptist Church',
  zip: '〒811-1344',
  address: '福岡県福岡市南区三宅3-33-1',
  tel: '092-561-4232',
  telPastor: '092-561-6791',
  lineUrl: 'https://lin.ee/RZqsQOM',   // LINE 공식계정 (비우면 LINE 버튼이 자동으로 숨겨짐)
  youtubeUrl: 'https://www.youtube.com/@%E7%A6%8F%E5%B2%A1%E6%96%B0%E7%94%9F%E3%82%AD%E3%83%AA%E3%82%B9%E3%83%88%E6%95%99%E4%BC%9A',
  mapUrl: 'https://maps.app.goo.gl/bSomrzCEZq1gkn8bA',
  mapEmbed: 'https://maps.google.com/maps?q=33.5473298042147,130.43094711450982&hl=ja&z=17&output=embed',
};

/* 글로벌 메뉴 — path는 사이트 루트 기준. children이 있으면 드롭다운 + 서브 탭이 생깁니다. */
const NAV = [
  {
    id: 'about', label: '教会紹介', path: 'about/',
    children: [
      { id: 'about-top',      label: '教会について',   path: 'about/' },
      { id: 'about-history',  label: '歩みと証し',     path: 'about/history.html' },
      { id: 'about-staff',    label: '牧師・スタッフ', path: 'about/staff.html' },
      { id: 'about-facility', label: '会堂案内',       path: 'about/facility.html' },
    ],
  },
  {
    id: 'worship', label: '礼拝・集会', path: 'worship/',
    children: [
      { id: 'worship-top',     label: '礼拝・集会案内',   path: 'worship/' },
      { id: 'worship-sermons', label: 'メッセージ・週報', path: 'worship/sermons.html' },
    ],
  },
  { id: 'mission',     label: '世界宣教',     path: 'mission/' },
  { id: 'first-visit', label: '初めての方へ', path: 'first-visit/' },
  { id: 'access',      label: 'アクセス',     path: 'access/' },
];

/* 예배·집회 시간표 — 홈과 礼拝・集会 페이지에서 공통 사용
   type: sunday | weekday | morning (배지 색상 구분) */
const SCHEDULE = [
  { tag: '聖日',   type: 'sunday',  name: '合同 聖日礼拝',       time: '10:30' },
  { tag: 'CS',     type: 'sunday',  name: '教会学校（日曜）',     time: '09:00' },
  { tag: '多文化', type: 'sunday',  name: 'ネパール語礼拝',       time: '14:30' },
  { tag: '夕方',   type: 'sunday',  name: '夕礼拝（日曜）',       time: '19:00' },
  { tag: '平日',   type: 'weekday', name: '水曜 祈祷会',          time: '19:15' },
  { tag: '平日',   type: 'weekday', name: '金曜リバイバル祈祷会', time: '19:00' },
  { tag: '早朝',   type: 'morning', name: '早朝祈祷会（月〜土）', time: '05:00' },
];

/* 교회원 의견 수집 (Firebase) — 설정 방법은 docs/FEEDBACK_SETUP.md
   enabled: 검토 기간이 끝나면 false 로 바꾸면 버튼이 사라집니다. */
const FEEDBACK = {
  enabled: true,
  sdkVersion: '12.19.0',   // Firebase JS SDK 버전
};

/* Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) 의 firebaseConfig 를 그대로 붙여넣기
   ※ 이 값은 공개되어도 괜찮습니다. 보안은 firestore.rules 가 담당합니다. */
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAGLuRuGPzUr06ISvAoqi6_uW3PDer3X78",
    authDomain: "fukuoka-shinsei.firebaseapp.com",
    projectId: "fukuoka-shinsei",
    storageBucket: "fukuoka-shinsei.firebasestorage.app",
    messagingSenderId: "239669963912",
    appId: "1:239669963912:web:91ef00824b506b4146833d",
    measurementId: "G-6DFGT7GLWC"
};
