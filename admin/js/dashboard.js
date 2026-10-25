/* ==========================================================================
   ホーム（ダッシュボード） — 今週やることと各コンテンツの状況をひと目で
   ========================================================================== */
ADMIN.register({
  id: 'home',
  label: '🏠 ホーム',
  async init(el, A) {
    const { fs, db, esc } = A;
    const sunday = A.nextSunday();
    el.innerHTML = `
      <div class="a-card">
        <h2>今週のチェックリスト</h2>
        <p class="a-card__desc">次の主日：${A.fmtDate(sunday)}　— ✅ は登録済み、⚠️ は未登録です。</p>
        <div class="a-dash js-todo"><p class="a-empty">確認中…</p></div>
      </div>
      <div class="a-dash a-dash--stats js-stats"></div>
      <div class="a-card">
        <h2>バックアップ</h2>
        <p class="a-card__desc">登録した内容（週報・メッセージ・食堂・人物紹介・献金口座・ご意見など）を1つのファイルに保存します。月に1回ほど保存しておくと安心です。<br>※アルバムと週報の「拡大用の大きな画像」は容量が大きいため含みません（一覧用の小さな画像は含みます）。</p>
        <button type="button" class="c-btn c-btn--outline js-backup">💾 バックアップをダウンロード</button>
        <p class="a-progress js-backup-msg"></p>
      </div>`;

    const count = async (col, ...cs) => (await fs.getDocs(fs.query(fs.collection(db, col), ...cs))).size;
    const latest = async (col) => {
      const s = await fs.getDocs(fs.query(fs.collection(db, col), fs.orderBy('date', 'desc'), fs.limit(1)));
      return s.empty ? null : s.docs[0].data();
    };

    try {
      const [bulletin, sermon, nextShokudo, fbNew, album, news] = await Promise.all([
        fs.getDoc(fs.doc(db, 'bulletins', sunday)),
        latest('sermons'),
        fs.getDocs(fs.query(fs.collection(db, 'shokudo'), fs.where('date', '>=', A.today()), fs.orderBy('date'), fs.limit(1))),
        count('feedback', fs.where('status', '==', 'new')),
        count('album'),
        latest('missionNews'),
      ]);
      const b = bulletin.exists() ? bulletin.data() : null;
      const shokudo = nextShokudo.empty ? null : nextShokudo.docs[0].data();

      const todo = [
        { ok: b && b.pages, tab: 'bulletin', title: '週報の画像', text: b && b.pages ? `${b.pages}枚 登録済み` : `${A.fmtDate(sunday)} の週報が未登録です` },
        { ok: b && b.verse, tab: 'bulletin', title: '暗誦聖句', text: b && b.verse ? `${esc(b.verse).slice(0, 30)}…` : '今週の暗誦聖句が未登録です' },
        { ok: sermon && sermon.date >= A.lastSunday(), tab: 'sermons', title: '礼拝メッセージ', text: sermon ? `最新：${A.fmtDate(sermon.date)}『${esc(sermon.title || '')}』` : 'まだ登録がありません' },
        { ok: !!shokudo, tab: 'shokudo', title: 'ハレルヤ食堂の次回予定', text: shokudo ? `${A.fmtDate(shokudo.date)} ${esc(shokudo.menu || '')}` : '今後の予定が登録されていません' },
      ];
      el.querySelector('.js-todo').innerHTML = todo.map((t) => `
        <button type="button" class="a-dash__item ${t.ok ? 'is-ok' : 'is-warn'}" data-go="${t.tab}">
          <span class="a-dash__icon">${t.ok ? '✅' : '⚠️'}</span>
          <span><b>${t.title}</b><small>${t.text}</small></span>
          <span class="a-dash__arrow">→</span>
        </button>`).join('');

      const stats = [
        { n: fbNew, label: '未対応のご意見', tab: 'feedback', warn: fbNew > 0 },
        { n: album, label: 'アルバムの写真', tab: 'album' },
        { n: news ? A.fmtDate(news.date) : '—', label: '最新の宣教ニュース', tab: 'mission' },
      ];
      el.querySelector('.js-stats').innerHTML = stats.map((s) => `
        <button type="button" class="a-stat${s.warn ? ' is-warn' : ''}" data-go="${s.tab}">
          <b>${s.n}</b><span>${s.label}</span>
        </button>`).join('');
    } catch (err) {
      el.querySelector('.js-todo').innerHTML = `<p class="a-empty">${A.isPerm(err) ? '⚠️ 読み込む権限がありません（画面上部の案内をご確認ください）' : '⚠️ 読み込みに失敗しました'}</p>`;
      A.fail(err);
    }

    el.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) A.go(b.dataset.go); });

    // バックアップ（JSON ファイルをダウンロード）
    el.querySelector('.js-backup').addEventListener('click', async (e) => {
      const btn = e.currentTarget; const msg = el.querySelector('.js-backup-msg');
      btn.disabled = true;
      try {
        const cols = ['bulletins', 'sermons', 'morning', 'shokudo', 'album', 'missionNews', 'people', 'settings', 'feedback'];
        const out = { exportedAt: new Date().toISOString(), by: A.user.email, data: {} };
        for (const c of cols) {
          msg.textContent = `読み込み中… ${c}`;
          const snap = await fs.getDocs(fs.collection(db, c));
          out.data[c] = Object.fromEntries(snap.docs.map((d) => {
            const v = d.data();
            Object.keys(v).forEach((k) => { if (v[k] && typeof v[k].toDate === 'function') v[k] = v[k].toDate().toISOString(); });
            return [d.id, v];
          }));
        }
        const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `shinsei-backup-${A.today()}.json`;
        a.click(); URL.revokeObjectURL(a.href);
        msg.textContent = `保存しました（${Math.round(blob.size / 1024)}KB）`;
      } catch (err) { msg.textContent = ''; A.fail(err); } finally { btn.disabled = false; }
    });
  },
});
