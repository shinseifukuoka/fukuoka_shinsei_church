/* ==========================================================================
   admin.js — 의견 관리 화면 (admin/index.html)
   Google 로그인 → feedback 컬렉션 실시간 표시, 상태 변경·메모·삭제·CSV
   ========================================================================== */
(async () => {
  const $ = (s) => document.querySelector(s);
  const ROOT = document.body.dataset.root || '../';
  const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STATUS = { new: '未対応', hold: '保留', done: '対応済み' };
  const DEVICE = { pc: 'PC', sp: 'スマホ' };
  let items = [];
  let filter = 'new';
  let unsubscribe = null;

  if (!window.isFirebaseReady()) {
    $('.js-login-msg').textContent = 'Firebase が未設定です。assets/js/config.js の FIREBASE_CONFIG を入力してください。';
    $('.js-login-btn').hidden = true;
    return;
  }

  const { fs, db, au, auth } = await window.loadFirebase({ auth: true });

  $('.js-login-btn').addEventListener('click', () =>
    au.signInWithPopup(auth, new au.GoogleAuthProvider()).catch((e) => alert('ログインに失敗しました: ' + e.message)));
  $('.js-logout').addEventListener('click', () => au.signOut(auth));

  au.onAuthStateChanged(auth, (user) => {
    unsubscribe && unsubscribe();
    $('.js-user').hidden = !user;
    $('.js-login').hidden = !!user;
    $('.js-board').hidden = true;
    if (!user) { $('.js-login-msg').textContent = '管理者アカウントでログインしてください。'; return; }
    $('.js-user-email').textContent = user.email;

    const q = fs.query(fs.collection(db, 'feedback'), fs.orderBy('createdAt', 'desc'));
    unsubscribe = fs.onSnapshot(q, (snap) => {
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      $('.js-board').hidden = false;
      render();
    }, () => {
      // 규칙에 등록되지 않은 계정
      $('.js-login').hidden = false;
      $('.js-login-msg').textContent = `${user.email} には閲覧権限がありません。管理者に追加を依頼してください。`;
    });
  });

  /* ---------- 렌더링 ---------- */
  const fmt = (ts) => (ts && ts.toDate ? ts.toDate().toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' }) : '送信中');
  const pageUrl = (it) => ROOT + it.page + (it.target ? `?fb-target=${encodeURIComponent(it.target.selector)}` : '');

  function render() {
    const count = (s) => items.filter((i) => s === 'all' || i.status === s).length;
    $('.js-tabs').innerHTML = ['new', 'hold', 'done', 'all'].map((s) =>
      `<button type="button" class="p-admin__tab${filter === s ? ' is-current' : ''}" data-filter="${s}">${STATUS[s] || 'すべて'}<b>${count(s)}</b></button>`).join('');

    const list = items.filter((i) => filter === 'all' || i.status === filter);
    if (!list.length) { $('.js-list').innerHTML = '<p class="p-admin__empty">該当するご意見はありません。</p>'; return; }

    const groups = list.reduce((g, it) => ((g[it.pageTitle || it.page] ||= []).push(it), g), {});
    $('.js-list').innerHTML = Object.entries(groups).map(([title, arr]) => `
      <section class="p-admin__group">
        <h2>${esc(title)}（${arr.length}）</h2>
        ${arr.map((it) => `
          <article class="p-admin__item" data-id="${it.id}" data-status="${it.status}">
            <p class="p-admin__meta">${fmt(it.createdAt)}｜${esc(it.name || '匿名')}｜${DEVICE[it.device] || ''}</p>
            <a class="p-admin__target" href="${pageUrl(it)}" target="_blank" rel="noopener">📍 ${it.target ? esc('「' + it.target.text + '」') : 'ページ全体'} を開く</a>
            <p class="p-admin__msg">${esc(it.message)}</p>
            <div class="p-admin__actions">
              ${Object.entries(STATUS).map(([k, v]) => `<button type="button" data-set="${k}" class="${it.status === k ? 'is-current' : ''}">${v}</button>`).join('')}
              <button type="button" data-del class="is-danger">削除</button>
            </div>
            <input class="p-admin__memo" data-memo placeholder="対応メモ（管理者のみ表示）" value="${esc(it.memo || '')}">
          </article>`).join('')}
      </section>`).join('');
  }

  /* ---------- 조작 ---------- */
  $('.js-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (b) { filter = b.dataset.filter; render(); }
  });
  $('.js-list').addEventListener('click', (e) => {
    const card = e.target.closest('[data-id]');
    if (!card) return;
    const ref = fs.doc(db, 'feedback', card.dataset.id);
    if (e.target.dataset.set) fs.updateDoc(ref, { status: e.target.dataset.set });
    if (e.target.hasAttribute('data-del') && confirm('このご意見を削除しますか？')) fs.deleteDoc(ref);
  });
  $('.js-list').addEventListener('change', (e) => {
    if (!e.target.hasAttribute('data-memo')) return;
    fs.updateDoc(fs.doc(db, 'feedback', e.target.closest('[data-id]').dataset.id), { memo: e.target.value.slice(0, 500) });
  });

  /* ---------- CSV 내보내기 (엑셀에서 바로 열림) ---------- */
  $('.js-csv').addEventListener('click', () => {
    const rows = [['日時', 'ページ', '場所', '内容', 'お名前', '端末', '状態', 'メモ'],
      ...items.map((i) => [fmt(i.createdAt), i.pageTitle, i.target ? i.target.text : '', i.message, i.name, DEVICE[i.device] || '', STATUS[i.status], i.memo || ''])];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `feedback_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  });
})();
