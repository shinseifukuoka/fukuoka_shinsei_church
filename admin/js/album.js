/* ==========================================================================
   アルバム — album/{id} { cat, title, date, thumb }  +  albumFull/{id} { data }
   목록은 작은 썸네일만 읽고, 크게 볼 때만 원본(albumFull)을 불러옵니다.
   ========================================================================== */
ADMIN.register({
  id: 'album',
  label: '🖼️ アルバム',
  init(el, A) {
    const { fs, db, esc } = A;
    const CATS = {
      worship: '礼拝・賛美', fellowship: '交わり', kids: '子ども', shokudo: 'ハレルヤ食堂',
      event: '行事', mission: '宣教', facility: '会堂', other: 'その他',
    };
    const catOptions = (sel) => Object.entries(CATS).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v}</option>`).join('');
    let items = [];
    let filter = 'all';

    el.innerHTML = `
      <div class="a-cols">
        <form class="a-card js-form">
          <h2>写真をアップロード</h2>
          <p class="a-card__desc">複数枚まとめて選べます。スマホの写真も自動で軽くしてから保存します。</p>
          <div class="a-field">
            <span class="a-label">写真</span>
            <label class="a-drop js-drop">📷 ここを押して写真を選択（複数可）<br><small>（ドラッグ＆ドロップも可）</small><input type="file" accept="image/*" multiple></label>
            <div class="a-previews"></div>
          </div>
          <div class="a-row">
            <div class="a-field">
              <label for="aCat">カテゴリ</label>
              <select id="aCat">${catOptions('worship')}</select>
            </div>
            <div class="a-field">
              <label for="aDate">撮影日</label>
              <input id="aDate" type="date">
            </div>
          </div>
          <div class="a-field">
            <label for="aTitle">タイトル（任意・選んだ写真すべてに付きます）</label>
            <input id="aTitle" type="text" placeholder="例）秋のバザー">
          </div>
          <button type="submit" class="c-btn c-btn--navy c-btn--block js-save">アップロード</button>
          <p class="a-progress js-progress"></p>
        </form>

        <div class="a-card">
          <h2>登録済みの写真 <small class="js-count"></small></h2>
          <p class="a-card__desc">タイトル・カテゴリ・日付を直して「保存」を押すと反映されます。</p>
          <div class="a-filter js-filter"></div>
          <div class="a-photos js-list"><p class="a-empty">読み込み中…</p></div>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const picker = A.filePicker($('.js-drop'), { multiple: true });
    $('#aDate').value = A.today();

    async function load() {
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'album'), fs.orderBy('date', 'desc'), fs.limit(400)));
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }

    function render() {
      $('.js-count').textContent = `（${items.length}枚）`;
      const counts = items.reduce((m, p) => ((m[p.cat] = (m[p.cat] || 0) + 1), m), {});
      $('.js-filter').innerHTML = [['all', 'すべて'], ...Object.entries(CATS).filter(([k]) => counts[k])]
        .map(([k, v]) => `<button type="button" data-f="${k}" class="${filter === k ? 'is-current' : ''}">${v} ${k === 'all' ? items.length : counts[k]}</button>`).join('');
      const list = items.filter((p) => filter === 'all' || p.cat === filter);
      $('.js-list').innerHTML = list.length ? list.map((p) => `
        <div class="a-photo" data-id="${p.id}">
          <img src="${p.thumb}" alt="" loading="lazy">
          <div class="a-photo__body">
            <input type="text" data-k="title" value="${esc(p.title || '')}" placeholder="タイトル">
            <select data-k="cat">${catOptions(p.cat)}</select>
            <input type="date" data-k="date" value="${esc(p.date || '')}">
            <div class="a-photo__row">
              <button type="button" class="c-btn c-btn--outline c-btn--sm" data-save>保存</button>
              <button type="button" class="c-btn c-btn--danger c-btn--sm" data-del>削除</button>
            </div>
          </div>
        </div>`).join('') : '<p class="a-empty">写真はまだありません。</p>';
    }

    $('.js-filter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (b) { filter = b.dataset.f; render(); }
    });

    $('.js-list').addEventListener('click', async (e) => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const id = card.dataset.id;
      if (e.target.closest('[data-save]')) {
        const data = {};
        card.querySelectorAll('[data-k]').forEach((i) => { data[i.dataset.k] = i.value.trim(); });
        try {
          await fs.updateDoc(fs.doc(db, 'album', id), data);
          Object.assign(items.find((p) => p.id === id), data);
          A.toast('保存しました');
        } catch (err) { A.fail(err); }
      }
      if (e.target.closest('[data-del]')) {
        if (!confirm('この写真を削除しますか？')) return;
        try {
          const batch = fs.writeBatch(db);
          batch.delete(fs.doc(db, 'album', id));
          batch.delete(fs.doc(db, 'albumFull', id));
          await batch.commit();
          items = items.filter((p) => p.id !== id);
          render();
          A.toast('削除しました');
        } catch (err) { A.fail(err); }
      }
    });

    $('.js-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const files = [...picker.input.files];
      if (!files.length) return A.toast('写真を選んでください', true);
      const btn = $('.js-save'); const prog = $('.js-progress');
      const cat = $('#aCat').value, date = $('#aDate').value || A.today(), title = $('#aTitle').value.trim();
      btn.disabled = true;
      let ok = 0;
      for (let i = 0; i < files.length; i++) {
        prog.textContent = `アップロード中… ${i + 1} / ${files.length}`;
        try {
          const [thumb, full] = await Promise.all([
            A.resizeImage(files[i], { max: 520, quality: 0.72, maxBytes: 90000 }),
            A.resizeImage(files[i], { max: 1600, quality: 0.82 }),
          ]);
          const ref = fs.doc(fs.collection(db, 'album'));
          const batch = fs.writeBatch(db);
          batch.set(ref, { cat, date, title, thumb, createdAt: fs.serverTimestamp() });
          batch.set(fs.doc(db, 'albumFull', ref.id), { data: full });
          await batch.commit();
          ok++;
        } catch (err) { A.fail(err); if (/permission/i.test(err.code || '')) break; }
      }
      btn.disabled = false;
      prog.textContent = '';
      if (ok) {
        A.toast(`${ok}枚アップロードしました`);
        picker.clear();
        $('#aTitle').value = '';
        filter = 'all';
        load();
      }
    });

    load().catch(A.fail);
  },
});
