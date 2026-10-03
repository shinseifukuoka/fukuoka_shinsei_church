/* ==========================================================================
   ご意見 — 教会員がサイトの「ご意見・修正依頼」ボタンから送った意見
   ========================================================================== */
ADMIN.register({
  id: 'feedback',
  label: '💬 ご意見',
  // ログイン直後に未対応の件数をタブに表示
  badge(A) {
    A.fs.getDocs(A.fs.query(A.fs.collection(A.db, 'feedback'), A.fs.where('status', '==', 'new')))
      .then((s) => A.badge('feedback', s.size)).catch(() => {});
  },
  init(el, A) {
    const { fs, db, esc } = A;
    const STATUS = { new: '未対応', hold: '保留', done: '対応済み' };
    const DEVICE = { pc: 'PC', sp: 'スマホ' };
    const ROOT = '../';
    let items = [];
    let filter = 'new';

    el.innerHTML = `
      <div class="a-card">
        <h2>ご意見・修正依頼</h2>
        <p class="a-card__desc">「場所を開く」を押すと、該当ページのその場所が黄色い枠で表示されます。</p>
        <div class="a-fb-tabs js-tabs"></div>
        <div class="a-list js-list"><p class="a-empty">読み込み中…</p></div>
        <p class="u-center a-hint"><button type="button" class="c-btn c-btn--outline c-btn--sm js-csv">CSVでダウンロード</button></p>
      </div>`;
    const $ = (s) => el.querySelector(s);
    const fmt = (ts) => (ts && ts.toDate ? ts.toDate().toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' }) : '');

    fs.onSnapshot(fs.query(fs.collection(db, 'feedback'), fs.orderBy('createdAt', 'desc')), (snap) => {
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      A.badge('feedback', items.filter((i) => i.status === 'new').length);
      render();
    }, A.fail);

    function render() {
      const n = (s) => items.filter((i) => s === 'all' || i.status === s).length;
      $('.js-tabs').innerHTML = ['new', 'hold', 'done', 'all'].map((s) =>
        `<button type="button" class="c-btn c-btn--sm ${filter === s ? 'c-btn--navy' : 'c-btn--outline'}" data-f="${s}">${STATUS[s] || 'すべて'} ${n(s)}</button>`).join('');
      const list = items.filter((i) => filter === 'all' || i.status === filter);
      $('.js-list').innerHTML = list.length ? list.map((it) => `
        <div class="a-item a-fb-item" data-id="${it.id}" data-status="${it.status}">
          <div class="a-item__body">
            <p class="a-item__meta">${fmt(it.createdAt)}｜${esc(it.pageTitle || it.page)}｜${esc(it.name || '匿名')}｜${DEVICE[it.device] || ''}</p>
            <a class="a-item__meta" href="${ROOT}${esc(it.page || '')}${it.target ? `?fb-target=${encodeURIComponent(it.target.selector)}` : ''}" target="_blank" rel="noopener">📍 ${it.target ? esc('「' + it.target.text + '」') : 'ページ全体'} を開く</a>
            <p class="a-item__text">${esc(it.message)}</p>
            <textarea data-memo placeholder="対応メモ（管理者のみ）">${esc(it.memo || '')}</textarea>
          </div>
          <div class="a-item__btns">
            ${Object.entries(STATUS).map(([k, v]) => `<button type="button" class="c-btn c-btn--sm ${it.status === k ? 'c-btn--navy' : 'c-btn--outline'}" data-set="${k}">${v}</button>`).join('')}
            <button type="button" class="c-btn c-btn--danger c-btn--sm" data-del>削除</button>
          </div>
        </div>`).join('') : '<p class="a-empty">該当するご意見はありません。</p>';
    }

    $('.js-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; render(); } });
    $('.js-list').addEventListener('click', (e) => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const ref = fs.doc(db, 'feedback', card.dataset.id);
      const set = e.target.closest('[data-set]');
      if (set) fs.updateDoc(ref, { status: set.dataset.set }).catch(A.fail);
      if (e.target.closest('[data-del]') && confirm('このご意見を削除しますか？')) fs.deleteDoc(ref).catch(A.fail);
    });
    $('.js-list').addEventListener('change', (e) => {
      if (!e.target.hasAttribute('data-memo')) return;
      fs.updateDoc(fs.doc(db, 'feedback', e.target.closest('[data-id]').dataset.id), { memo: e.target.value.slice(0, 500) })
        .then(() => A.toast('メモを保存しました')).catch(A.fail);
    });
    $('.js-csv').addEventListener('click', () => {
      const rows = [['日時', 'ページ', '場所', '内容', 'お名前', '端末', '状態', 'メモ'],
        ...items.map((i) => [fmt(i.createdAt), i.pageTitle, i.target ? i.target.text : '', i.message, i.name, DEVICE[i.device] || '', STATUS[i.status], i.memo || ''])];
      const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
      a.download = `feedback_${A.today()}.csv`;
      a.click();
    });
  },
});
