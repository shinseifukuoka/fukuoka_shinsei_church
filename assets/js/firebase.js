/* ==========================================================================
   firebase.js — Firebase SDK 로더 (공개 페이지 · 관리 화면 공용)
   CDN에서 필요한 모듈만 동적으로 불러옵니다. 설치·빌드 불필요.
   ========================================================================== */
window.hasFirebase = () => typeof FIREBASE_CONFIG !== 'undefined' && !!FIREBASE_CONFIG.projectId;

// 의견 위젯 표시 여부 (config.js 의 FEEDBACK.enabled)
window.isFirebaseReady = () =>
  window.hasFirebase() && typeof FEEDBACK !== 'undefined' && FEEDBACK.enabled;

window.loadFirebase = (() => {
  let base = null;
  let authP = null;
  const sdk = () => `https://www.gstatic.com/firebasejs/${(typeof FEEDBACK !== 'undefined' && FEEDBACK.sdkVersion) || '12.19.0'}/`;

  const loadBase = () => base || (base = (async () => {
    const [{ initializeApp, getApps }, fs] = await Promise.all([
      import(sdk() + 'firebase-app.js'),
      import(sdk() + 'firebase-firestore.js'),
    ]);
    const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
    return { app, fs, db: fs.getFirestore(app) };
  })());

  return async ({ auth = false } = {}) => {
    const b = await loadBase();
    if (!auth) return b;
    authP = authP || import(sdk() + 'firebase-auth.js').then((au) => ({ au, auth: au.getAuth(b.app) }));
    return { ...b, ...(await authP) };
  };
})();
