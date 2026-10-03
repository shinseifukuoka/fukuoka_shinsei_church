/* ==========================================================================
   ハレルヤ食堂 — shokudo/{自動ID}  { date, time, menu, note, image }
   ========================================================================== */
ADMIN.register({
  id: 'shokudo',
  label: '🍛 ハレルヤ食堂',
  init(el, A) {
    const { fs, db, esc } = A;
    let items = [];
    let editing = null;

    el.innerHTML = `
      <div class="a-cols">
        <form class="a-card js-form">
          <h2 class="js-form-title">開催予定を登録</h2>
          <p class="a-card__desc">「ハレルヤ食堂」ページに、今日以降の予定が近い順に表示されます（過ぎた予定は自動で非表示）。</p>
          <div class="a-row">
            <div class="a-field">
              <label for="sDate">開催日 <em>必須</em></label>
              <input id="sDate" type="date" required>
            </div>
            <div class="a-field">
              <label for="sTime">時間</label>
              <input id="sTime" type="text" value="11:30〜13:30">
            </div>
          </div>
          <div class="a-field">
            <label for="sMenu">メニュー</label>
            <input id="sMenu" type="text" placeholder="例）ポークカレー・サラダ・フルーツ">
          </div>
          <div class="a-field">
            <label for="sNote">お知らせ・備考</label>
            <textarea id="sNote" placeholder="例）今回は先着40食です。食後に工作コーナーがあります。"></textarea>
          </div>
          <div class="a-field">
            <span class="a-label">画像（任意：メニュー写真・チラシなど1枚）</span>
            <label class="a-drop js-drop">📷 ここを押して画像を選択<input type="file" accept="image/*"></label>
            <div class="a-previews"></div>
            <label class="js-rm-wrap" hidden><input type="checkbox" class="js-rm"> 登録済みの画像を削除する</label>
          </div>
          <div class="a-actions">
            <button type="submit" class="c-btn c-btn--navy js-save">登録する</button>
            <button type="button" class="c-btn c-btn--outline js-cancel" hidden>編集をやめる</button>
          </div>
          <p class="a-progress js-progress"></p>
          <p class="a-card__desc a-hint">💡 食堂の写真は「🖼️ アルバム」タブでカテゴリ「ハレルヤ食堂」を選んでアップロードすると、食堂ページにも表示されます。</p>
        </form>

        <div>
        <div class="a-card">
          <h2>登録済みの予定</h2>
          <p class="a-card__desc">薄く表示されているのは終了した予定です（ホームページには出ません）。</p>
          <div class="a-list js-list"><p class="a-empty">読み込み中…</p></div>
        </div>

        <form class="a-card js-info">
          <h2>紹介文・ご利用案内</h2>
          <p class="a-card__desc">食堂ページの「ハレルヤ食堂とは」と「ご利用案内」の内容です。</p>
          <div class="a-field"><label for="iIntro">紹介文（空行で段落が分かれます）</label><textarea id="iIntro" rows="5"></textarea></div>
          <div class="js-info-rows"></div>
          <button type="button" class="c-btn c-btn--outline c-btn--sm js-info-add">＋ 項目を追加</button>
          <div class="a-actions a-hint"><button type="submit" class="c-btn c-btn--navy">保存する</button></div>
        </form>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const picker = A.filePicker($('.js-drop'));

    const resetForm = () => {
      editing = null;
      $('.js-form').reset();
      picker.clear();
      $('#sTime').value = '11:30〜13:30';
      $('.js-form-title').textContent = '開催予定を登録';
      $('.js-save').textContent = '登録する';
      $('.js-cancel').hidden = true;
      $('.js-rm-wrap').hidden = true;
      render();
    };
    $('.js-cancel').onclick = resetForm;

    async function load() {
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'shokudo'), fs.orderBy('date', 'desc'), fs.limit(40)));
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }

    function render() {
      const list = $('.js-list');
      if (!items.length) { list.innerHTML = '<p class="a-empty">まだ予定がありません。</p>'; return; }
      const today = A.today();
      list.innerHTML = items.map((s) => `
        <div class="a-item${s.date < today ? ' is-past' : ''}${editing === s.id ? ' is-editing' : ''}">
          ${s.image ? `<img class="a-item__img" src="${s.image}" alt="">` : ''}
          <div class="a-item__body">
            <p class="a-item__title">${A.fmtDate(s.date)} ${esc(s.time || '')}</p>
            ${s.menu ? `<p class="a-item__text">🍽️ ${esc(s.menu)}</p>` : ''}
            ${s.note ? `<p class="a-item__meta">${esc(s.note)}</p>` : ''}
          </div>
          <div class="a-item__btns">
            <button type="button" class="c-btn c-btn--outline c-btn--sm" data-edit="${s.id}">編集</button>
            <button type="button" class="c-btn c-btn--outline c-btn--sm" data-copy="${s.id}">複製</button>
            <button type="button" class="c-btn c-btn--danger c-btn--sm" data-del="${s.id}">削除</button>
          </div>
        </div>`).join('');
    }

    const fill = (s) => {
      $('#sDate').value = s.date || '';
      $('#sTime').value = s.time || '';
      $('#sMenu').value = s.menu || '';
      $('#sNote').value = s.note || '';
      picker.clear();
    };

    $('.js-list').addEventListener('click', async (e) => {
      const id = (e.target.closest('[data-edit],[data-copy],[data-del]') || {}).dataset || {};
      const s = items.find((x) => x.id === (id.edit || id.copy || id.del));
      if (!s) return;
      if (id.edit) {
        editing = s.id; fill(s);
        $('.js-form-title').textContent = `${A.fmtDate(s.date)} を編集`;
        $('.js-save').textContent = '更新する';
        $('.js-cancel').hidden = false;
        $('.js-rm-wrap').hidden = !s.image;
        render(); el.scrollIntoView({ behavior: 'smooth' });
      } else if (id.copy) {
        resetForm(); fill({ ...s, date: '' });
        A.toast('内容をコピーしました。日付を入れて登録してください');
        $('#sDate').focus();
      } else if (id.del) {
        if (!confirm(`${A.fmtDate(s.date)} の予定を削除しますか？`)) return;
        try { await fs.deleteDoc(fs.doc(db, 'shokudo', s.id)); A.toast('削除しました'); if (editing === s.id) resetForm(); load(); } catch (err) { A.fail(err); }
      }
    });

    $('.js-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('.js-save'); const prog = $('.js-progress');
      const data = {
        date: $('#sDate').value,
        time: $('#sTime').value.trim(),
        menu: $('#sMenu').value.trim(),
        note: $('#sNote').value.trim(),
        updatedAt: fs.serverTimestamp(),
      };
      if (!data.date) return A.toast('開催日を入力してください', true);
      btn.disabled = true;
      try {
        const file = picker.input.files[0];
        if (file) { prog.textContent = '画像を圧縮中…'; data.image = await A.resizeImage(file, { max: 1200, quality: 0.8, maxBytes: 600000 }); }
        else if (editing && $('.js-rm').checked) data.image = '';
        prog.textContent = '保存中…';
        if (editing) await fs.setDoc(fs.doc(db, 'shokudo', editing), data, { merge: true });
        else await fs.addDoc(fs.collection(db, 'shokudo'), { image: '', ...data });
        A.toast(editing ? '更新しました' : '登録しました');
        prog.textContent = '';
        resetForm(); load();
      } catch (err) { prog.textContent = ''; A.fail(err); } finally { btn.disabled = false; }
    });

    /* ---------- 紹介文・ご利用案内 (settings/shokudo) ---------- */
    const infoRef = fs.doc(db, 'settings', 'shokudo');
    const DEFAULT_INFO = [
      { label: '場所', value: '福岡新生キリスト教会 2階 親睦室' },
      { label: '対象', value: 'どなたでも（小学生・中学生を優先します）' },
      { label: '参加費', value: '子ども 無料／大人 300円' },
      { label: '予約', value: '不要（なくなり次第終了）' },
    ];
    let info = [];
    const infoRow = (r, i) => `<div class="a-row a-info-row">
        <div class="a-field"><input type="text" data-k="label" value="${esc(r.label)}" placeholder="項目（例：場所）"></div>
        <div class="a-field a-info-val"><input type="text" data-k="value" value="${esc(r.value)}" placeholder="内容"><button type="button" class="c-btn c-btn--danger c-btn--sm" data-info-rm="${i}">×</button></div>
      </div>`;
    const drawInfo = () => { $('.js-info-rows').innerHTML = info.map(infoRow).join(''); };
    const readInfo = () => { info = [...el.querySelectorAll('.a-info-row')].map((r) => ({ label: r.querySelector('[data-k=label]').value.trim(), value: r.querySelector('[data-k=value]').value.trim() })); };
    fs.getDoc(infoRef).then((s) => {
      const d = s.exists() ? s.data() : {};
      $('#iIntro').value = d.intro || 'ハレルヤ食堂は、福岡新生キリスト教会が地域の子どもたちのために開いている「こども食堂」です。温かい手作りごはんを囲みながら、子どもたちが安心して過ごせる居場所をつくりたいと願って始まりました。\n\n教会に通っていない方も、どなたでも大歓迎です。お友だちやご家族と一緒に、気軽にお越しください。';
      info = d.info && d.info.length ? d.info : DEFAULT_INFO.map((x) => ({ ...x }));
      drawInfo();
    }).catch(A.fail);
    $('.js-info-add').onclick = () => { readInfo(); info.push({ label: '', value: '' }); drawInfo(); };
    $('.js-info-rows').addEventListener('click', (e) => { const b = e.target.closest('[data-info-rm]'); if (b) { readInfo(); info.splice(Number(b.dataset.infoRm), 1); drawInfo(); } });
    $('.js-info').addEventListener('submit', async (e) => {
      e.preventDefault(); readInfo();
      try { await fs.setDoc(infoRef, { intro: $('#iIntro').value.trim(), info: info.filter((r) => r.label || r.value), updatedAt: fs.serverTimestamp() }); A.toast('保存しました'); } catch (err) { A.fail(err); }
    });

    load().catch(A.fail);
  },
});
