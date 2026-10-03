/* ==========================================================================
   献金口座 — settings/offering { draft, accounts[], note }
   ここで保存すると、config.js の OFFERING の代わりにこの内容がサイトに表示されます。
   ========================================================================== */
ADMIN.register({
  id: 'settings',
  label: '🙏 献金口座',
  async init(el, A) {
    const { fs, db, esc } = A;
    const ref = fs.doc(db, 'settings', 'offering');
    const MAX = 3;
    const blank = { label: '', bank: '', branch: '', type: '普通', number: '', holder: '' };

    let data;
    try {
      const s = await fs.getDoc(ref);
      data = s.exists() ? s.data() : (typeof OFFERING !== 'undefined' ? JSON.parse(JSON.stringify(OFFERING)) : { draft: true, accounts: [], note: '' });
    } catch (err) { A.fail(err); return; }

    const row = (a, i) => `
      <fieldset class="a-account" data-i="${i}">
        <legend>口座 ${i + 1}</legend>
        <div class="a-row">
          <div class="a-field"><label>見出し</label><input type="text" data-k="label" value="${esc(a.label)}" placeholder="例）銀行振込"></div>
          <div class="a-field"><label>金融機関</label><input type="text" data-k="bank" value="${esc(a.bank)}" placeholder="例）福岡銀行"></div>
        </div>
        <div class="a-row">
          <div class="a-field"><label>支店（記号）</label><input type="text" data-k="branch" value="${esc(a.branch)}" placeholder="例）大橋支店（123）"></div>
          <div class="a-field"><label>種別</label><input type="text" data-k="type" value="${esc(a.type)}" placeholder="普通 / 当座 / 番号"></div>
        </div>
        <div class="a-row">
          <div class="a-field"><label>口座番号</label><input type="text" data-k="number" value="${esc(a.number)}" inputmode="numeric"></div>
          <div class="a-field"><label>口座名義（カナ）</label><input type="text" data-k="holder" value="${esc(a.holder)}"></div>
        </div>
        <button type="button" class="c-btn c-btn--danger c-btn--sm" data-rm="${i}">この口座を削除</button>
      </fieldset>`;

    const render = () => {
      el.innerHTML = `
        <form class="a-card js-form">
          <h2>献金口座の案内</h2>
          <p class="a-card__desc">「礼拝・集会」ページの「献金について」に表示されます。最大${MAX}件まで登録できます。</p>
          <div class="a-field"><label><input type="checkbox" class="js-draft"${data.draft ? ' checked' : ''}> 「※現在は仮の情報です」と表示する（正式な口座を入力したら外してください）</label></div>
          <div class="js-rows">${data.accounts.map(row).join('')}</div>
          <button type="button" class="c-btn c-btn--outline c-btn--sm js-add"${data.accounts.length >= MAX ? ' hidden' : ''}>＋ 口座を追加</button>
          <div class="a-field a-hint"><label for="oNote">注意書き</label><textarea id="oNote">${esc(data.note || '')}</textarea></div>
          <div class="a-actions">
            <button type="submit" class="c-btn c-btn--navy">保存する</button>
            <a href="../worship/#offering" target="_blank" rel="noopener" class="c-btn c-btn--outline">サイトで確認 ↗</a>
          </div>
        </form>`;
    };
    const collect = () => {
      data.accounts = [...el.querySelectorAll('.a-account')].map((f) => {
        const a = {};
        f.querySelectorAll('[data-k]').forEach((i) => { a[i.dataset.k] = i.value.trim(); });
        return a;
      });
      data.draft = el.querySelector('.js-draft').checked;
      data.note = el.querySelector('#oNote').value.trim();
    };
    render();

    el.addEventListener('click', (e) => {
      if (e.target.closest('.js-add')) { collect(); data.accounts.push({ ...blank }); render(); }
      const rm = e.target.closest('[data-rm]');
      if (rm && confirm('この口座を削除しますか？（保存するまで反映されません）')) { collect(); data.accounts.splice(Number(rm.dataset.rm), 1); render(); }
    });
    el.addEventListener('submit', async (e) => {
      e.preventDefault();
      collect();
      try {
        await fs.setDoc(ref, { draft: data.draft, accounts: data.accounts, note: data.note, updatedAt: fs.serverTimestamp() });
        A.toast('保存しました');
      } catch (err) { A.fail(err); }
    });
  },
});
