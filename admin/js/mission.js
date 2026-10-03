/* ==========================================================================
   宣教ニュース・祈りの課題 — missionNews/{自動ID}
   { date, missionary, title, body, prayer(bool), image }
   ========================================================================== */
ADMIN.register({
  id: 'mission',
  label: '🌏 宣教ニュース',
  init(el, A) {
    const { fs, db, esc } = A;
    const MISSIONARIES = ['李 聖徳 宣教師', 'チョウライ 宣教師', '河端 真理子 宣教師', 'ジャナク・カンデル 宣教師', '野口 日宇満 宣教師'];
    let items = [];
    let editing = null;

    el.innerHTML = `
      <div class="a-cols">
        <form class="a-card js-form">
          <h2 class="js-form-title">宣教ニュースを登録</h2>
          <p class="a-card__desc">「世界宣教」ページの「宣教地からのお便り・祈りの課題」に新しい順で表示されます。</p>
          <div class="a-row">
            <div class="a-field"><label for="nDate">日付 <em>必須</em></label><input id="nDate" type="date" required></div>
            <div class="a-field"><label for="nWho">宣教師</label>
              <input id="nWho" type="text" list="nWhoList" placeholder="選択または入力">
              <datalist id="nWhoList">${MISSIONARIES.map((m) => `<option value="${m}">`).join('')}</datalist></div>
          </div>
          <div class="a-field"><label for="nTitle">タイトル <em>必須</em></label><input id="nTitle" type="text" required placeholder="例）ケニアの新しい会堂の基礎工事が始まりました"></div>
          <div class="a-field"><label for="nBody">本文</label><textarea id="nBody" rows="6" placeholder="近況や、具体的な祈りの課題をお書きください。"></textarea></div>
          <div class="a-field"><label><input type="checkbox" id="nPrayer"> 「祈りの課題」として表示する</label></div>
          <div class="a-field">
            <span class="a-label">写真（任意・1枚）</span>
            <label class="a-drop js-drop">📷 ここを押して写真を選択<input type="file" accept="image/*"></label>
            <div class="a-previews"></div>
            <label class="js-rm-wrap" hidden><input type="checkbox" class="js-rm"> 登録済みの写真を削除する</label>
          </div>
          <div class="a-actions">
            <button type="submit" class="c-btn c-btn--navy js-save">登録する</button>
            <button type="button" class="c-btn c-btn--outline js-cancel" hidden>編集をやめる</button>
          </div>
          <p class="a-progress js-progress"></p>
          <p class="a-card__desc a-hint">⚠️ 宣教地によっては、地名・人物写真の公開に配慮が必要です。宣教師の先生に確認した内容のみ掲載してください。</p>
        </form>

        <div class="a-card">
          <h2>登録済みのニュース</h2>
          <div class="a-list js-list"><p class="a-empty">読み込み中…</p></div>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const picker = A.filePicker($('.js-drop'));
    $('#nDate').value = A.today();

    const resetForm = () => {
      editing = null;
      $('.js-form').reset(); picker.clear();
      $('#nDate').value = A.today();
      $('.js-form-title').textContent = '宣教ニュースを登録';
      $('.js-save').textContent = '登録する';
      $('.js-cancel').hidden = true;
      $('.js-rm-wrap').hidden = true;
      render();
    };
    $('.js-cancel').onclick = resetForm;

    async function load() {
      const s = await fs.getDocs(fs.query(fs.collection(db, 'missionNews'), fs.orderBy('date', 'desc'), fs.limit(40)));
      items = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }

    function render() {
      $('.js-list').innerHTML = items.length ? items.map((n) => `
        <div class="a-item${editing === n.id ? ' is-editing' : ''}">
          ${n.image ? `<img class="a-item__img" src="${n.image}" alt="">` : ''}
          <div class="a-item__body">
            <p class="a-item__title">${esc(n.title)}</p>
            <p class="a-item__meta">${A.fmtDate(n.date)}｜${esc(n.missionary || '')}${n.prayer ? '｜🙏 祈りの課題' : ''}</p>
            <p class="a-item__text">${esc((n.body || '').slice(0, 80))}${(n.body || '').length > 80 ? '…' : ''}</p>
          </div>
          <div class="a-item__btns">
            <button type="button" class="c-btn c-btn--outline c-btn--sm" data-edit="${n.id}">編集</button>
            <button type="button" class="c-btn c-btn--danger c-btn--sm" data-del="${n.id}">削除</button>
          </div>
        </div>`).join('') : '<p class="a-empty">まだ登録がありません。</p>';
    }

    $('.js-list').addEventListener('click', async (e) => {
      const ed = e.target.closest('[data-edit]');
      const del = e.target.closest('[data-del]');
      if (ed) {
        const n = items.find((x) => x.id === ed.dataset.edit);
        editing = n.id;
        $('#nDate').value = n.date || ''; $('#nWho').value = n.missionary || '';
        $('#nTitle').value = n.title || ''; $('#nBody').value = n.body || ''; $('#nPrayer').checked = !!n.prayer;
        picker.clear();
        $('.js-form-title').textContent = 'ニュースを編集';
        $('.js-save').textContent = '更新する';
        $('.js-cancel').hidden = false;
        $('.js-rm-wrap').hidden = !n.image;
        render(); el.scrollIntoView({ behavior: 'smooth' });
      }
      if (del && confirm('このニュースを削除しますか？')) {
        try { await fs.deleteDoc(fs.doc(db, 'missionNews', del.dataset.del)); A.toast('削除しました'); if (editing === del.dataset.del) resetForm(); load(); } catch (err) { A.fail(err); }
      }
    });

    $('.js-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('.js-save'); const prog = $('.js-progress');
      const data = {
        date: $('#nDate').value, missionary: $('#nWho').value.trim(), title: $('#nTitle').value.trim(),
        body: $('#nBody').value.trim(), prayer: $('#nPrayer').checked, updatedAt: fs.serverTimestamp(),
      };
      if (!data.date || !data.title) return A.toast('日付とタイトルを入力してください', true);
      btn.disabled = true;
      try {
        const file = picker.input.files[0];
        if (file) { prog.textContent = '写真を圧縮中…'; data.image = await A.resizeImage(file, { max: 1400, quality: 0.8, maxBytes: 600000 }); }
        else if (editing && $('.js-rm').checked) data.image = '';
        prog.textContent = '保存中…';
        if (editing) await fs.setDoc(fs.doc(db, 'missionNews', editing), data, { merge: true });
        else await fs.addDoc(fs.collection(db, 'missionNews'), { image: '', ...data });
        A.toast(editing ? '更新しました' : '登録しました');
        prog.textContent = ''; resetForm(); load();
      } catch (err) { prog.textContent = ''; A.fail(err); } finally { btn.disabled = false; }
    });

    load().catch(A.fail);
  },
});
