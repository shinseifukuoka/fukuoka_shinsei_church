/* ==========================================================================
   メッセージ・早天祈祷会 — sermons/{YYYY-MM-DD} · morning/{YYYY-MM-DD}
   （登録データがあれば、サイトでは weekly.js の代わりにこちらを表示）
   ========================================================================== */
ADMIN.register({
  id: 'sermons',
  label: '🎥 メッセージ',
  init(el, A) {
    const { fs, db, esc } = A;
    let sermons = [];
    let mornings = [];
    let editing = null;

    el.innerHTML = `
      <div class="a-cols">
        <div>
          <form class="a-card js-form">
            <h2 class="js-form-title">礼拝メッセージを登録</h2>
            <p class="a-card__desc">「礼拝・集会」「メッセージ・週報」ページに、新しい順に表示されます。</p>
            <div class="a-row">
              <div class="a-field"><label for="mDate">日付 <em>必須</em></label><input id="mDate" type="date" required></div>
              <div class="a-field"><label for="mSpeaker">説教者</label><input id="mSpeaker" type="text" placeholder="例）竹田 殉聖 牧師"></div>
            </div>
            <div class="a-field"><label for="mTitle">説教題 <em>必須</em></label><input id="mTitle" type="text" required></div>
            <div class="a-field"><label for="mBible">聖書箇所</label><input id="mBible" type="text" placeholder="例）マタイによる福音書 5章1〜12節"></div>
            <div class="a-field"><label for="mYoutube">YouTube のURL</label><input id="mYoutube" type="text" placeholder="https://youtube.com/live/…">
              <small>空欄の場合は、教会のYouTubeチャンネルにつながります。</small></div>
            <div class="a-field"><label for="mSlides">スライド（PPT）のURL</label><input id="mSlides" type="text" placeholder="Google ドライブなどの共有リンク"></div>
            <div class="a-actions">
              <button type="submit" class="c-btn c-btn--navy js-save">登録する</button>
              <button type="button" class="c-btn c-btn--outline js-cancel" hidden>編集をやめる</button>
            </div>
          </form>

          <form class="a-card js-mform">
            <h2>早天祈祷会の聖書箇所</h2>
            <p class="a-card__desc">直近7日分がホームページに表示されます。</p>
            <div class="a-row">
              <div class="a-field"><label for="pDate">日付</label><input id="pDate" type="date" required></div>
              <div class="a-field"><label for="pBible">聖書箇所</label><input id="pBible" type="text" placeholder="例）マタイによる福音書 22章" required></div>
            </div>
            <button type="submit" class="c-btn c-btn--navy">追加する</button>
            <div class="a-list js-mlist a-hint"></div>
          </form>
        </div>

        <div class="a-card">
          <h2>登録済みのメッセージ</h2>
          <div class="js-import"></div>
          <div class="a-list js-list"><p class="a-empty">読み込み中…</p></div>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const F = ['date', 'speaker', 'title', 'bible', 'youtube', 'slides'];
    const field = (k) => $('#m' + k[0].toUpperCase() + k.slice(1));
    $('#mDate').value = A.lastSunday();
    $('#pDate').value = A.today();

    const resetForm = () => {
      editing = null;
      $('.js-form').reset();
      $('#mDate').value = A.lastSunday();
      $('#mDate').disabled = false;
      $('.js-form-title').textContent = '礼拝メッセージを登録';
      $('.js-save').textContent = '登録する';
      $('.js-cancel').hidden = true;
      render();
    };
    $('.js-cancel').onclick = resetForm;

    async function load() {
      const [s, m] = await Promise.all([
        fs.getDocs(fs.query(fs.collection(db, 'sermons'), fs.orderBy('date', 'desc'), fs.limit(30))),
        fs.getDocs(fs.query(fs.collection(db, 'morning'), fs.orderBy('date', 'desc'), fs.limit(14))),
      ]);
      sermons = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      mornings = m.docs.map((d) => ({ id: d.id, ...d.data() }));
      render();
    }

    function render() {
      // 初回のみ：weekly.js の既存データを取り込む
      const legacy = typeof SERMONS !== 'undefined' ? SERMONS : [];
      $('.js-import').innerHTML = !sermons.length && legacy.length
        ? `<p class="a-empty">これまでのメッセージ（${legacy.length}件）が weekly.js にあります。<br>
            <button type="button" class="c-btn c-btn--outline c-btn--sm a-hint js-do-import">管理画面に取り込む</button></p>` : '';
      $('.js-list').innerHTML = sermons.length ? sermons.map((s) => `
        <div class="a-item${editing === s.id ? ' is-editing' : ''}">
          <div class="a-item__body">
            <p class="a-item__title">『${esc(s.title)}』</p>
            <p class="a-item__meta">${A.fmtDate(s.date)}｜${esc(s.speaker || '')}｜${esc(s.bible || '')}</p>
            <p class="a-item__meta">${s.youtube ? '▶ YouTube あり' : '▶ チャンネルへ'}${s.slides ? '　📊 スライドあり' : ''}</p>
          </div>
          <div class="a-item__btns">
            <button type="button" class="c-btn c-btn--outline c-btn--sm" data-edit="${s.id}">編集</button>
            <button type="button" class="c-btn c-btn--danger c-btn--sm" data-del="${s.id}">削除</button>
          </div>
        </div>`).join('') : '<p class="a-empty">まだ登録がありません。</p>';
      $('.js-mlist').innerHTML = mornings.map((m) => `
        <div class="a-item"><div class="a-item__body"><b>${A.fmtDate(m.date)}</b>　${esc(m.bible)}</div>
        <button type="button" class="c-btn c-btn--danger c-btn--sm" data-mdel="${m.id}">削除</button></div>`).join('');
    }

    el.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('.js-do-import')) {
        try {
          const batch = fs.writeBatch(db);
          SERMONS.forEach((s) => batch.set(fs.doc(db, 'sermons', s.date), { date: s.date, title: s.title || '', bible: s.bible || '', speaker: s.speaker || '', youtube: s.youtube || '', slides: s.slides || '' }));
          (typeof MORNING_PRAYERS !== 'undefined' ? MORNING_PRAYERS : []).forEach((m) => batch.set(fs.doc(db, 'morning', m.date), { date: m.date, bible: m.bible }));
          await batch.commit();
          A.toast('取り込みました'); load();
        } catch (err) { A.fail(err); }
      }
      const ed = t.closest('[data-edit]');
      if (ed) {
        const s = sermons.find((x) => x.id === ed.dataset.edit);
        editing = s.id;
        F.forEach((k) => { field(k).value = s[k] || ''; });
        $('#mDate').disabled = true;
        $('.js-form-title').textContent = `${A.fmtDate(s.date)} を編集`;
        $('.js-save').textContent = '更新する';
        $('.js-cancel').hidden = false;
        render(); el.scrollIntoView({ behavior: 'smooth' });
      }
      const del = t.closest('[data-del]');
      if (del && confirm('このメッセージを削除しますか？')) {
        try { await fs.deleteDoc(fs.doc(db, 'sermons', del.dataset.del)); A.toast('削除しました'); if (editing === del.dataset.del) resetForm(); load(); } catch (err) { A.fail(err); }
      }
      const md = t.closest('[data-mdel]');
      if (md) { try { await fs.deleteDoc(fs.doc(db, 'morning', md.dataset.mdel)); load(); } catch (err) { A.fail(err); } }
    });

    $('.js-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {};
      F.forEach((k) => { data[k] = field(k).value.trim(); });
      if (!data.date || !data.title) return A.toast('日付と説教題を入力してください', true);
      const exists = sermons.find((x) => x.id === data.date);
      if (!editing && exists && !confirm(`${A.fmtDate(data.date)} はすでに登録されています。上書きしますか？`)) return;
      try {
        await fs.setDoc(fs.doc(db, 'sermons', data.date), { ...data, updatedAt: fs.serverTimestamp() });
        A.toast(editing ? '更新しました' : '登録しました');
        resetForm(); load();
      } catch (err) { A.fail(err); }
    });

    $('.js-mform').addEventListener('submit', async (e) => {
      e.preventDefault();
      const date = $('#pDate').value, bible = $('#pBible').value.trim();
      if (!date || !bible) return;
      try {
        await fs.setDoc(fs.doc(db, 'morning', date), { date, bible });
        $('#pBible').value = '';
        A.toast('追加しました'); load();
      } catch (err) { A.fail(err); }
    });

    load().catch(A.fail);
  },
});
