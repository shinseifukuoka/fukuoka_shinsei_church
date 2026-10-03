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
      <div class="a-dash a-dash--stats js-stats"></div>`;

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
    } catch (err) { A.fail(err); }

    el.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) A.go(b.dataset.go); });
  },
});
