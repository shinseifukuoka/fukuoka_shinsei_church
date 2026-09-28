/* ==========================================================================
   週報・暗誦聖句 — bulletins/{YYYY-MM-DD} + bulletinPages/{YYYY-MM-DD}_{n}
   ========================================================================== */
ADMIN.register({
  id: 'bulletin',
  label: '📄 週報・暗誦聖句',
  init(el, A) {
    const { fs, db, esc } = A;
    const MAX_PAGES = 4;
    let items = [];
    let editing = null;

    el.innerHTML = `
      <div class="a-cols">
        <form class="a-card js-form">
          <h2 class="js-form-title">週報・暗誦聖句を登録</h2>
          <p class="a-card__desc">毎週の週報画像と暗誦聖句を登録します。ホームページの「礼拝・集会」「メッセージ・週報」ページに自動で表示されます。</p>
          <div class="a-field">
            <label for="bDate">日付（主日）<em>必須</em></label>
            <input id="bDate" type="date" required>
          </div>
          <div class="a-field">
            <span class="a-label">週報の画像（最大${MAX_PAGES}枚・表→裏の順に選択）</span>
            <label class="a-drop js-drop">📷 ここを押して画像を選択<br><small>（ドラッグ＆ドロップも可）</small><input type="file" accept="image/*" multiple></label>
            <div class="a-previews"></div>
            <small class="js-keep" hidden>画像を選ばない場合は、登録済みの画像がそのまま残ります。</small>
          </div>
          <div class="a-field">
            <label for="bVerse">暗誦聖句（本文）</label>
            <textarea id="bVerse" placeholder="例）神は、実に、そのひとり子をお与えになったほどに世を愛された。"></textarea>
          </div>
          <div class="a-field">
            <label for="bRef">聖書箇所</label>
            <input id="bRef" type="text" placeholder="例）ヨハネの福音書 3章16節">
          </div>
          <div class="a-actions">
            <button type="submit" class="c-btn c-btn--navy js-save">登録する</button>
            <button type="button" class="c-btn c-btn--outline js-cancel" hidden>編集をやめる</button>
          </div>
          <p class="a-progress js-progress"></p>
        </form>

        <div class="a-card">
          <h2>登録済み（新しい順）</h2>
          <p class="a-card__desc">ホームページには、今日までの最新5週分が表示されます。</p>
          <div class="a-list js-list"><p class="a-empty">読み込み中…</p></div>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const picker = A.filePicker($('.js-drop'), { multiple: true });
    $('#bDate').value = A.nextSunday();

    const resetForm = () => {
      editing = null;
      $('.js-form').reset();
      picker.clear();
      $('#bDate').value = A.nextSunday();
      $('#bDate').disabled = false;
      $('.js-form-title').textContent = '週報・暗誦聖句を登録';
      $('.js-save').textContent = '登録する';
      $('.js-cancel').hidden = true;
      $('.js-keep').hidden = true;
      render();
    };
    $('.js-cancel').onclick = resetForm;

    async function load() {
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'bulletins'), fs.orderBy('date', 'desc'), fs.limit(30)));
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }

    function render() {
      const list = $('.js-list');
      if (!items.length) { list.innerHTML = '<p class="a-empty">まだ登録がありません。</p>'; return; }
      const today = A.today();
      list.innerHTML = items.map((b) => `
        <div class="a-item${editing === b.id ? ' is-editing' : ''}${b.date > today ? '' : ''}">
          ${b.thumb ? `<img class="a-item__img" src="${b.thumb}" alt="">` : '<div class="a-item__img"></div>'}
          <div class="a-item__body">
            <p class="a-item__title">${A.fmtDate(b.date)}${b.date > today ? ' <span class="c-tag c-tag--weekday">予約</span>' : ''}</p>
            <p class="a-item__meta">週報 ${b.pages || 0}枚</p>
            ${b.verse ? `<p class="a-item__text">📖 ${esc(b.verse)}${b.verseRef ? `（${esc(b.verseRef)}）` : ''}</p>` : '<p class="a-item__meta">暗誦聖句なし</p>'}
          </div>
          <div class="a-item__btns">
            <button type="button" class="c-btn c-btn--outline c-btn--sm" data-edit="${b.id}">編集</button>
            <button type="button" class="c-btn c-btn--danger c-btn--sm" data-del="${b.id}">削除</button>
          </div>
        </div>`).join('');
    }

    $('.js-list').addEventListener('click', async (e) => {
      const ed = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-del]');
      if (ed) {
        const b = items.find((x) => x.id === ed.dataset.edit);
        editing = b.id;
        $('#bDate').value = b.date;
        $('#bDate').disabled = true;
        $('#bVerse').value = b.verse || '';
        $('#bRef').value = b.verseRef || '';
        picker.clear();
        $('.js-form-title').textContent = `${A.fmtDate(b.date)} を編集`;
        $('.js-save').textContent = '更新する';
        $('.js-cancel').hidden = false;
        $('.js-keep').hidden = false;
        render();
        el.scrollIntoView({ behavior: 'smooth' });
      }
      if (del) {
        const b = items.find((x) => x.id === del.dataset.del);
        if (!confirm(`${A.fmtDate(b.date)} の週報・暗誦聖句を削除しますか？`)) return;
        try {
          const batch = fs.writeBatch(db);
          batch.delete(fs.doc(db, 'bulletins', b.id));
          for (let i = 1; i <= MAX_PAGES; i++) batch.delete(fs.doc(db, 'bulletinPages', `${b.id}_${i}`));
          await batch.commit();
          A.toast('削除しました');
          if (editing === b.id) resetForm();
          load();
        } catch (err) { A.fail(err); }
      }
    });

    $('.js-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = $('#bDate').value;
      const files = [...picker.input.files].slice(0, MAX_PAGES);
      const verse = $('#bVerse').value.trim();
      const verseRef = $('#bRef').value.trim();
      if (!date) return A.toast('日付を入力してください', true);
      const exists = items.find((x) => x.id === date);
      if (!editing && exists && !confirm(`${A.fmtDate(date)} はすでに登録されています。上書きしますか？`)) return;
      if (!files.length && !verse && !(editing || exists)) return A.toast('週報画像か暗誦聖句のどちらかを入力してください', true);

      const btn = $('.js-save'); const prog = $('.js-progress');
      btn.disabled = true;
      try {
        const data = { date, verse, verseRef, updatedAt: fs.serverTimestamp() };
        const batch = fs.writeBatch(db);
        if (files.length) {
          for (let i = 0; i < files.length; i++) {
            prog.textContent = `画像を圧縮中… ${i + 1} / ${files.length}`;
            const full = await A.resizeImage(files[i], { max: 1800, quality: 0.85 });
            batch.set(fs.doc(db, 'bulletinPages', `${date}_${i + 1}`), { data: full });
            if (i === 0) data.thumb = await A.resizeImage(files[i], { max: 360, quality: 0.7, maxBytes: 60000 });
          }
          for (let i = files.length + 1; i <= MAX_PAGES; i++) batch.delete(fs.doc(db, 'bulletinPages', `${date}_${i}`));
          data.pages = files.length;
        } else if (!exists) {
          data.pages = 0;
        }
        prog.textContent = '保存中…';
        batch.set(fs.doc(db, 'bulletins', date), data, { merge: true });
        await batch.commit();
        A.toast(editing ? '更新しました' : '登録しました');
        prog.textContent = '';
        resetForm();
        load();
      } catch (err) { prog.textContent = ''; A.fail(err); } finally { btn.disabled = false; }
    });

    load().catch(A.fail);
  },
});
