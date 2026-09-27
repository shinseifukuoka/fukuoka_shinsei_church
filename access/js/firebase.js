/* ==========================================================================
   firebase.js — Firebase SDK 로더 (feedback.js / admin.js 공용)
   CDN에서 필요한 모듈만 동적으로 불러옵니다. 설치·빌드 불필요.
   ========================================================================== */
window.loadFirebase = (() => {
  let cache;
  return ({ auth = false } = {}) => {
    if (cache && (!auth || cache.auth)) return cache.promise;
    const base = `https://www.gstatic.com/firebasejs/${FEEDBACK.sdkVersion}/`;
    const promise = (async () => {
      const [{ initializeApp, getApps }, fs] = await Promise.all([
        import(base + 'firebase-app.js'),
        import(base + 'firebase-firestore.js'),
      ]);
      const app = getApps()[0] || initializeApp(FIREBASE_CONFIG);
      const out = { fs, db: fs.getFirestore(app) };
      if (auth) {
        const au = await import(base + 'firebase-auth.js');
        Object.assign(out, { au, auth: au.getAuth(app) });
      }
      return out;
    })();
    cache = { promise, auth };
    return promise;
  };
})();

window.isFirebaseReady = () =>
  typeof FEEDBACK !== 'undefined' && FEEDBACK.enabled && !!(FIREBASE_CONFIG && FIREBASE_CONFIG.projectId);
