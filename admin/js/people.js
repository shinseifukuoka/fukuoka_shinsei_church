/* ==========================================================================
   人物紹介 — people/{id}
   { page: 'staff'|'mission', group: 'pastor'|'member'|'missionary', order,
     role, name, sub, field, title, quote, quoteRef, body, image, draft }
   登録データがあると、公開ページの HTML に書かれた内容の代わりに表示されます。
   ========================================================================== */
ADMIN.register({
  id: 'people',
  label: '👥 人物紹介',
  init(el, A) {
    const { fs, db, esc } = A;
    const GROUPS = {
      pastor: { page: 'staff', label: '牧会者（大きいカード）' },
      member: { page: 'staff', label: '教役者・働き人（小さいカード）' },
      missionary: { page: 'mission', label: '宣教師' },
    };
    let view = 'staff';   // staff | mission
    let items = [];
    let editing = null;

    el.innerHTML = `
      <div class="a-seg js-seg">
        <button type="button" data-view="staff" class="is-current">牧師・スタッフ</button>
        <button type="button" data-view="mission">宣教師</button>
      </div>
      <div class="a-cols">
        <form class="a-card js-form">
          <h2 class="js-form-title">人物を追加</h2>
          <p class="a-card__desc js-form-desc"></p>
          <div class="a-field"><label for="pGroup">区分</label><select id="pGroup"></select></div>
          <div class="a-row">
            <div class="a-field"><label for="pRole">役職</label><input id="pRole" type="text" placeholder="例）副牧師（Associate Pastor）"></div>
            <div class="a-field"><label for="pName">お名前 <em>必須</em></label><input id="pName" type="text" required></div>
          </div>
          <div class="a-row">
            <div class="a-field js-only-big"><label for="pSub">ふりがな・ローマ字</label><input id="pSub" type="text" placeholder="例）Takeda Junsei"></div>
            <div class="a-field js-only-mission"><label for="pField">宣教地・働き</label><input id="pField" type="text" placeholder="例）中央アジア宣教"></div>
          </div>
          <div class="a-field js-only-pastor"><label for="pTitle">見出し（任意）</label><input id="pTitle" type="text" placeholder="例）《愛は、恨みを抱かない》"></div>
          <div class="a-row js-only-pastor">
            <div class="a-field"><label for="pQuote">聖句（任意）</label><textarea id="pQuote" rows="2"></textarea></div>
            <div class="a-field"><label for="pRef">聖句の箇所</label><input id="pRef" type="text" placeholder="例）（Ⅰコリント 13：5）"></div>
          </div>
          <div class="a-field">
            <label for="pBody" class="js-body-label">本文</label>
            <textarea id="pBody" rows="8"></textarea>
            <small class="js-body-help"></small>
          </div>
          <div class="a-field">
            <span class="a-label">写真（縦長がおすすめ）</span>
            <label class="a-drop js-drop">📷 ここを押して写真を選択<input type="file" accept="image/*"></label>
            <div class="a-previews"></div>
            <label class="js-rm-wrap" hidden><input type="checkbox" class="js-rm"> 登録済みの写真を削除する</label>
          </div>
          <div class="a-field"><label><input type="checkbox" id="pDraft"> 「準備中」と表示する（仮の文章のとき）</label></div>
          <div class="a-actions">
            <button type="submit" class="c-btn c-btn--navy js-save">追加する</button>
            <button type="button" class="c-btn c-btn--outline js-cancel" hidden>編集をやめる</button>
          </div>
          <p class="a-progress js-progress"></p>
        </form>

        <div class="a-card">
          <h2 class="js-list-title"></h2>
          <p class="a-card__desc">▲▼ で表示順を変えられます。</p>
          <div class="js-import"></div>
          <div class="a-list js-list"><p class="a-empty">読み込み中…</p></div>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);
    const picker = A.filePicker($('.js-drop'));
    const groupsOf = (v) => Object.entries(GROUPS).filter(([, g]) => g.page === v);

    const syncFields = () => {
      const g = $('#pGroup').value;
      el.querySelectorAll('.js-only-pastor').forEach((x) => { x.hidden = g !== 'pastor'; });
      el.querySelectorAll('.js-only-mission').forEach((x) => { x.hidden = g !== 'missionary'; });
      el.querySelectorAll('.js-only-big').forEach((x) => { x.hidden = g === 'member'; });
      $('.js-body-label').textContent = g === 'missionary' ? '経歴・紹介（1行ずつ）' : g === 'pastor' ? '挨拶文・メッセージ' : '紹介文';
      $('.js-body-help').textContent = g === 'missionary' ? '改行ごとに「・」付きの箇条書きになります。' : g === 'pastor' ? '空行（1行あける）で段落が分かれます。' : '';
    };
    $('#pGroup').addEventListener('change', syncFields);

    const resetForm = () => {
      editing = null;
      $('.js-form').reset(); picker.clear();
      $('#pGroup').innerHTML = groupsOf(view).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('');
      $('.js-form-title').textContent = view === 'staff' ? '牧師・スタッフを追加' : '宣教師を追加';
      $('.js-form-desc').textContent = view === 'staff' ? '「牧師・スタッフ」ページに表示されます。牧会者の1番目の方は、ホームの挨拶欄にも表示されます。' : '「世界宣教」ページの宣教師紹介に表示されます。';
      $('.js-list-title').textContent = view === 'staff' ? '牧師・スタッフ一覧' : '宣教師一覧';
      $('.js-save').textContent = '追加する';
      $('.js-cancel').hidden = true;
      $('.js-rm-wrap').hidden = true;
      syncFields();
      render();
    };
    $('.js-cancel').onclick = resetForm;

    el.querySelector('.js-seg').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (!b) return;
      view = b.dataset.view;
      el.querySelectorAll('.js-seg button').forEach((x) => x.classList.toggle('is-current', x === b));
      resetForm(); load();
    });

    async function load() {
      const snap = await fs.getDocs(fs.query(fs.collection(db, 'people'), fs.where('page', '==', view)));
      items = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
      render();
    }

    function render() {
      $('.js-import').innerHTML = items.length ? '' : `
        <p class="a-empty">まだ登録がありません。<br>現在ホームページに表示されている内容（文章・写真）を取り込んで、そこから編集できます。<br>
        <button type="button" class="c-btn c-btn--navy c-btn--sm a-hint js-do-import">現在のページ内容を取り込む</button></p>`;
      const html = groupsOf(view).map(([k, g]) => {
        const list = items.filter((p) => p.group === k);
        if (!list.length) return '';
        return `<p class="a-label a-hint">${g.label}</p>` + list.map((p, i) => `
          <div class="a-item${editing === p.id ? ' is-editing' : ''}">
            <img class="a-item__img" src="${p.image || '../assets/img/common/placeholder-person.webp'}" alt="">
            <div class="a-item__body">
              <p class="a-item__title">${esc(p.name)} ${p.draft ? '<span class="c-tag c-tag--morning">準備中</span>' : ''}</p>
              <p class="a-item__meta">${esc(p.role || '')}${p.field ? '｜' + esc(p.field) : ''}</p>
              <p class="a-item__meta">${esc((p.body || '').replace(/\n/g, ' ').slice(0, 50))}…</p>
            </div>
            <div class="a-item__btns">
              <div class="a-photo__row">
                <button type="button" class="c-btn c-btn--outline c-btn--sm" data-up="${p.id}"${i === 0 ? ' disabled' : ''} aria-label="上へ">▲</button>
                <button type="button" class="c-btn c-btn--outline c-btn--sm" data-down="${p.id}"${i === list.length - 1 ? ' disabled' : ''} aria-label="下へ">▼</button>
              </div>
              <button type="button" class="c-btn c-btn--outline c-btn--sm" data-edit="${p.id}">編集</button>
              <button type="button" class="c-btn c-btn--danger c-btn--sm" data-del="${p.id}">削除</button>
            </div>
          </div>`).join('');
      }).join('');
      $('.js-list').innerHTML = html || '';
    }

    /* ---------- 현재 공개 페이지에서 가져오기 ---------- */
    const toDataURL = async (src) => {
      if (!src || /placeholder/.test(src)) return '';
      try {
        const r = await fetch(src);
        if (!r.ok) return '';
        const blob = await r.blob();
        return await A.resizeImage(new File([blob], 'img', { type: blob.type }), { max: 700, quality: 0.85, maxBytes: 300000 });
      } catch (e) { return ''; }
    };
    const txt = (n) => (n ? n.textContent.replace(/\s+/g, ' ').trim() : '');
    async function importFromPage() {
      const url = view === 'staff' ? '../about/staff.html' : '../mission/';
      const html = await (await fetch(url)).text();
      const dom = new DOMParser().parseFromString(html, 'text/html');
      const base = new URL(url, location.href);
      const abs = (img) => (img ? new URL(img.getAttribute('src'), base).href : '');
      const out = [];
      if (view === 'staff') {
        dom.querySelectorAll('[data-group="pastor"] .c-profile').forEach((c) => {
          const nameEl = c.querySelector('.c-profile__name');
          const small = nameEl.querySelector('small');
          const q = c.querySelector('blockquote');
          const cite = q && q.querySelector('cite');
          out.push({
            group: 'pastor', role: txt(c.querySelector('.c-profile__role')),
            name: [...nameEl.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(),
            sub: txt(small), title: txt(c.querySelector('.c-profile__text h4')),
            quote: q ? [...q.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim() : '',
            quoteRef: txt(cite), body: [...c.querySelectorAll('.c-profile__text > p')].map(txt).join('\n\n'),
            draft: !!c.querySelector('.u-draft'), img: abs(c.querySelector('img')),
          });
        });
        dom.querySelectorAll('.c-person').forEach((c) => {
          const body = txt(c.querySelector('.c-person__text'));
          out.push({ group: 'member', role: txt(c.querySelector('.c-person__role')), name: txt(c.querySelector('.c-person__name')),
            body: body.replace(/（※紹介文仮）/, '').trim(), draft: /仮/.test(body), img: abs(c.querySelector('img')) });
        });
      } else {
        dom.querySelectorAll('[data-group="missionary"] .c-profile').forEach((c) => {
          const nameEl = c.querySelector('.c-profile__name');
          out.push({ group: 'missionary', role: txt(c.querySelector('.c-tag')),
            name: [...nameEl.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(),
            sub: txt(nameEl.querySelector('small')), field: txt(c.querySelector('.c-profile__field')),
            body: [...c.querySelectorAll('.c-list li')].map(txt).join('\n'), img: abs(c.querySelector('img')) });
        });
      }
      const prog = $('.js-progress');
      for (let i = 0; i < out.length; i++) {
        prog.textContent = `取り込み中… ${i + 1} / ${out.length}`;
        const { img, ...p } = out[i];
        p.image = await toDataURL(img);
        await fs.addDoc(fs.collection(db, 'people'), { page: view, order: i + 1, sub: '', field: '', title: '', quote: '', quoteRef: '', draft: false, ...p });
      }
      prog.textContent = '';
      A.toast(`${out.length}件 取り込みました`);
    }

    el.addEventListener('click', async (e) => {
      const t = e.target;
      if (t.closest('.js-do-import')) {
        t.disabled = true;
        try { await importFromPage(); await load(); } catch (err) { A.fail(err); } finally { t.disabled = false; }
        return;
      }
      const ed = t.closest('[data-edit]'), del = t.closest('[data-del]'), up = t.closest('[data-up]'), down = t.closest('[data-down]');
      if (ed) {
        const p = items.find((x) => x.id === ed.dataset.edit);
        editing = p.id;
        $('#pGroup').value = p.group; syncFields();
        $('#pRole').value = p.role || ''; $('#pName').value = p.name || ''; $('#pSub').value = p.sub || '';
        $('#pField').value = p.field || ''; $('#pTitle').value = p.title || ''; $('#pQuote').value = p.quote || '';
        $('#pRef').value = p.quoteRef || ''; $('#pBody').value = p.body || ''; $('#pDraft').checked = !!p.draft;
        picker.clear();
        $('.js-form-title').textContent = `${p.name} を編集`;
        $('.js-save').textContent = '更新する';
        $('.js-cancel').hidden = false;
        $('.js-rm-wrap').hidden = !p.image;
        render(); el.scrollIntoView({ behavior: 'smooth' });
      }
      if (del) {
        const p = items.find((x) => x.id === del.dataset.del);
        if (!confirm(`${p.name} を削除しますか？`)) return;
        try { await fs.deleteDoc(fs.doc(db, 'people', p.id)); A.toast('削除しました'); if (editing === p.id) resetForm(); load(); } catch (err) { A.fail(err); }
      }
      if (up || down) {
        const id = (up || down).dataset.up || (up || down).dataset.down;
        const p = items.find((x) => x.id === id);
        const list = items.filter((x) => x.group === p.group);
        const i = list.indexOf(p), j = up ? i - 1 : i + 1;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        try {
          const batch = fs.writeBatch(db);
          list.forEach((x, k) => { x.order = k + 1; batch.update(fs.doc(db, 'people', x.id), { order: k + 1 }); });
          await batch.commit();
          items.sort((a, b) => a.order - b.order); render();
        } catch (err) { A.fail(err); }
      }
    });

    $('.js-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('.js-save'), prog = $('.js-progress');
      const g = $('#pGroup').value;
      const data = {
        page: GROUPS[g].page, group: g,
        role: $('#pRole').value.trim(), name: $('#pName').value.trim(), sub: $('#pSub').value.trim(),
        field: $('#pField').value.trim(), title: $('#pTitle').value.trim(), quote: $('#pQuote').value.trim(),
        quoteRef: $('#pRef').value.trim(), body: $('#pBody').value.trim(), draft: $('#pDraft').checked,
        updatedAt: fs.serverTimestamp(),
      };
      if (!data.name) return A.toast('お名前を入力してください', true);
      btn.disabled = true;
      try {
        const file = picker.input.files[0];
        if (file) { prog.textContent = '写真を圧縮中…'; data.image = await A.resizeImage(file, { max: 700, quality: 0.85, maxBytes: 300000 }); }
        else if (editing && $('.js-rm').checked) data.image = '';
        prog.textContent = '保存中…';
        if (editing) await fs.setDoc(fs.doc(db, 'people', editing), data, { merge: true });
        else {
          data.order = Math.max(0, ...items.filter((x) => x.group === g).map((x) => x.order || 0)) + 1;
          await fs.addDoc(fs.collection(db, 'people'), { image: '', ...data });
        }
        A.toast(editing ? '更新しました' : '追加しました');
        prog.textContent = ''; resetForm(); load();
      } catch (err) { prog.textContent = ''; A.fail(err); } finally { btn.disabled = false; }
    });

    resetForm();
    load().catch(A.fail);
  },
});
