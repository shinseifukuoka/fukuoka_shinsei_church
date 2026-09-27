/* ==========================================================================
   feedback.js — 교회원 의견·수정 요청 위젯
   - 화면 우측 하단 「ご意見」 버튼 → 입력창
   - 「場所を選ぶ」로 수정하고 싶은 부분을 직접 클릭해서 지정
   - Firestore `feedback` 컬렉션에 저장 (읽기는 관리자만 가능)
   - 관리 화면에서 ?fb-target=... 링크로 들어오면 해당 위치를 하이라이트
   layout.js 가 FEEDBACK.enabled 일 때 자동으로 불러옵니다.
   ========================================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const params = new URLSearchParams(location.search);

  /* ---------- 관리 화면에서 넘어온 경우: 위치 하이라이트 ---------- */
  const targetSel = params.get('fb-target');
  if (targetSel) {
    try {
      const el = document.querySelector(targetSel);
      if (el) {
        el.classList.add('is-fb-highlight');
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
      }
    } catch (e) { /* 잘못된 선택자는 무시 */ }
  }

  if (!window.isFirebaseReady()) return;

  /* ---------- 요소 → CSS 선택자 ---------- */
  const PICKABLE = 'h1,h2,h3,h4,p,li,dt,dd,img,iframe,blockquote,td,th,.c-tile,.c-person,.c-steps__item,.c-faq__item,.c-card,.p-home-link,.p-hero';
  const selectorOf = (el) => {
    const path = [];
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.id) { path.unshift('#' + CSS.escape(n.id)); break; }
      let i = 1;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === n.tagName) i++;
      path.unshift(`${n.tagName.toLowerCase()}:nth-of-type(${i})`);
    }
    return (path[0] && path[0].startsWith('#') ? '' : 'body > ') + path.join(' > ');
  };
  const snippet = (el) => (el.tagName === 'IMG' ? `［画像］${el.alt || ''}` : el.textContent.replace(/\s+/g, ' ').trim()).slice(0, 80);

  // 사이트 루트 기준 경로 (예: 'about/staff.html') — 저장소 이름·도메인이 바뀌어도 유지됨
  const sitePath = () => {
    const depth = ((document.body.dataset.root || '').match(/\.\.\//g) || []).length;
    return location.pathname.split('/').slice(-(depth + 1)).join('/');
  };

  /* ---------- UI ---------- */
  document.body.insertAdjacentHTML('beforeend', `
    <button type="button" class="c-fb-open js-fb-open" aria-haspopup="dialog">✏️ ご意見・修正依頼</button>
    <div class="c-fb-pickbar" hidden>
      <span>修正したい場所をタップしてください</span>
      <button type="button" class="js-fb-pick-cancel">キャンセル</button>
    </div>
    <div class="c-fb" hidden role="dialog" aria-modal="true" aria-labelledby="fbTitle">
      <form class="c-fb__panel js-fb-form">
        <div class="c-fb__head">
          <h2 id="fbTitle">ホームページへのご意見</h2>
          <button type="button" class="c-fb__close js-fb-close" aria-label="閉じる">×</button>
        </div>
        <p class="c-fb__note">誤字・情報の誤り・見づらい所など、お気づきの点をお知らせください。<br>送信内容は管理者のみが確認します。</p>

        <label class="c-fb__label">ページ</label>
        <p class="c-fb__page">${document.title.split('|')[0].trim()}</p>

        <label class="c-fb__label">場所（任意）</label>
        <div class="c-fb__target">
          <span class="c-fb__target-text js-fb-target-text">ページ全体</span>
          <button type="button" class="c-fb__pick js-fb-pick">📍 場所を選ぶ</button>
        </div>

        <label class="c-fb__label" for="fbMessage">内容 <em>必須</em></label>
        <textarea id="fbMessage" name="message" rows="5" maxlength="2000" required placeholder="例）礼拝時間が変わっています。夕礼拝は18:30からです。"></textarea>

        <label class="c-fb__label" for="fbName">お名前（任意）</label>
        <input id="fbName" name="name" maxlength="50" autocomplete="name">

        <button type="submit" class="c-btn c-btn--navy c-btn--block js-fb-submit">送信する</button>
        <p class="c-fb__status js-fb-status" role="status"></p>
      </form>
    </div>`);

  const modal = $('.c-fb');
  const form = $('.js-fb-form');
  const pickbar = $('.c-fb-pickbar');
  const status = $('.js-fb-status');
  const targetText = $('.js-fb-target-text');
  let target = null;
  let hoverEl = null;

  try { form.name.value = localStorage.getItem('fb-name') || ''; } catch (e) {}

  const open = () => { modal.hidden = false; form.message.focus(); };
  const close = () => { modal.hidden = true; };
  $('.js-fb-open').addEventListener('click', open);
  $('.js-fb-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => e.target === modal && close());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && !modal.hidden && close());

  /* ---------- 場所を選ぶ ---------- */
  const setHover = (el) => {
    hoverEl && hoverEl.classList.remove('is-fb-hover');
    hoverEl = el;
    hoverEl && hoverEl.classList.add('is-fb-hover');
  };
  const pickable = (node) => {
    const el = node && node.closest && node.closest(PICKABLE);
    return el && !el.closest('.c-fb, .c-fb-pickbar, .l-header, .l-drawer, .l-floatbar, .l-footer') ? el : null;
  };
  const onMove = (e) => setHover(pickable(e.target));
  const onPick = (e) => {
    if (e.target.closest('.c-fb-pickbar')) return;
    e.preventDefault(); e.stopPropagation();
    const el = pickable(e.target);
    if (!el) return;
    target = { selector: selectorOf(el), text: snippet(el) };
    targetText.textContent = `「${target.text || '（選択した場所）'}」`;
    endPick(); open();
  };
  const endPick = () => {
    document.body.classList.remove('is-fb-picking');
    pickbar.hidden = true;
    setHover(null);
    document.removeEventListener('mouseover', onMove, true);
    document.removeEventListener('click', onPick, true);
  };
  $('.js-fb-pick').addEventListener('click', () => {
    close();
    document.body.classList.add('is-fb-picking');
    pickbar.hidden = false;
    document.addEventListener('mouseover', onMove, true);
    document.addEventListener('click', onPick, true);
  });
  $('.js-fb-pick-cancel').addEventListener('click', () => { endPick(); open(); });

  /* ---------- 送信 ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = form.message.value.trim();
    if (!message) return;
    const btn = $('.js-fb-submit');
    btn.disabled = true;
    status.className = 'c-fb__status js-fb-status';
    status.textContent = '送信中…';
    try {
      const { fs, db } = await window.loadFirebase();
      const name = form.name.value.trim();
      await fs.addDoc(fs.collection(db, 'feedback'), {
        page: sitePath(),
        pageTitle: document.title.split('|')[0].trim().slice(0, 100),
        target,
        message,
        name,
        device: innerWidth <= 768 ? 'スマホ' : 'PC',
        status: 'new',
        createdAt: fs.serverTimestamp(),
      });
      try { localStorage.setItem('fb-name', name); } catch (err) {}
      status.classList.add('is-ok');
      status.textContent = '送信しました。ご協力ありがとうございます！';
      form.message.value = '';
      target = null;
      targetText.textContent = 'ページ全体';
      setTimeout(close, 1800);
    } catch (err) {
      console.error(err);
      status.classList.add('is-error');
      status.textContent = '送信できませんでした。時間をおいて再度お試しください。';
    } finally {
      btn.disabled = false;
    }
  });
})();
