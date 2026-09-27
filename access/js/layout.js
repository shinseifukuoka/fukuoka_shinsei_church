/* ==========================================================================
   layout.js — 공통 레이아웃 렌더링 + 페이지 위젯
   <body data-root="../" data-page="about-staff"> 처럼 지정하면
   헤더·드로어·서브탭·푸터·하단 바가 자동으로 그려집니다. (수정 불필요)
   ========================================================================== */
(() => {
  const body = document.body;
  const ROOT = body.dataset.root || './';
  const PAGE = body.dataset.page || '';
  const IS_FILE = location.protocol === 'file:';
  const VER = (document.querySelector('script[src*="layout.js"]')?.src.match(/v=(\d+)/) || [])[1] || '';

  /* ---------- 앱 내 브라우저 → 기기 기본 브라우저로 열기 ----------
     LINE: URL에 openExternalBrowser=1 을 붙이면 LINE이 Safari/Chrome으로 넘겨 줌
     KakaoTalk: 전용 스킴으로 외부 브라우저 열기 */
  const UA = navigator.userAgent;
  if (/\bLine\//i.test(UA) && !/openExternalBrowser=1/.test(location.search)) {
    const u = new URL(location.href);
    u.searchParams.set('openExternalBrowser', '1');
    location.replace(u.href);
  } else if (/KAKAOTALK/i.test(UA) && !(() => { try { return sessionStorage.getItem('ext-tried'); } catch (e) { return 1; } })()) {
    try { sessionStorage.setItem('ext-tried', '1'); } catch (e) {}
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
  }

  /* ---------- helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  // 로컬(file://) 미리보기에서는 폴더 링크에 index.html을 붙여 줌
  const url = (path) => ROOT + path + (IS_FILE && path.endsWith('/') ? 'index.html' : '');
  const ext = (href) => (href ? `href="${href}" target="_blank" rel="noopener"` : '');
  const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  const fmtDate = (iso, withYear = true) => {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    const md = `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;
    return withYear ? `${d.getFullYear()}年${md}` : md;
  };

  const section = NAV.find((n) => n.id === PAGE || (n.children || []).some((c) => c.id === PAGE));
  const isCurrent = (item) => item.id === PAGE || item === section;

  /* ---------- Header / Drawer ---------- */
  const navHtml = NAV.map((item) => {
    const sub = item.children
      ? `<ul class="l-gnav__sub">${item.children
          .map((c) => `<li><a href="${url(c.path)}" class="l-gnav__sublink${c.id === PAGE ? ' is-current' : ''}">${c.label}</a></li>`)
          .join('')}</ul>`
      : '';
    return `<li class="l-gnav__item${item.children ? ' has-sub' : ''}">
      <a href="${url(item.path)}" class="l-gnav__link${isCurrent(item) ? ' is-current' : ''}">${item.label}</a>${sub}</li>`;
  }).join('');

  const drawerHtml = NAV.map((item) => {
    const kids = (item.children || []).slice(1)
      .map((c) => `<li><a href="${url(c.path)}" class="l-drawer__link l-drawer__link--child${c.id === PAGE ? ' is-current' : ''}">${c.label}</a></li>`)
      .join('');
    const self = item.children ? item.children[0].id === PAGE : item.id === PAGE;
    return `<li><a href="${url(item.path)}" class="l-drawer__link${self ? ' is-current' : ''}">${item.label}</a></li>${kids}`;
  }).join('');

  const lineBtn = (cls, label) => (SITE.lineUrl ? `<a ${ext(SITE.lineUrl)} class="c-btn c-btn--line ${cls}">${label}</a>` : '');

  body.insertAdjacentHTML('afterbegin', `
    <a href="#main" class="u-skip">本文へスキップ</a>
    <header class="l-header">
      <div class="l-header__inner">
        <a href="${url('')}${IS_FILE ? 'index.html' : ''}" class="l-header__logo">
          <img src="${ROOT}assets/img/common/logo-header.webp" alt="${SITE.fullName}" width="234" height="44">
        </a>
        <nav class="l-gnav" aria-label="グローバルメニュー"><ul class="l-gnav__list">${navHtml}</ul></nav>
        <button class="l-header__toggle js-drawer-toggle" aria-label="メニューを開く" aria-expanded="false" aria-controls="drawer">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>
    <div class="l-drawer-overlay js-drawer-close"></div>
    <aside class="l-drawer" id="drawer" aria-label="モバイルメニュー">
      <div class="l-drawer__head">${SITE.name}</div>
      <ul class="l-drawer__list">${drawerHtml}</ul>
      <div class="l-drawer__foot">${lineBtn('c-btn--block', 'LINE友だち追加・相談')}
        <a href="tel:${SITE.tel}" class="c-btn c-btn--outline c-btn--block">📞 ${SITE.tel}</a></div>
    </aside>`);

  /* ---------- Sub navigation (하위 페이지 탭) ---------- */
  const hero = $('.p-hero');
  if (section && section.children && hero) {
    hero.insertAdjacentHTML('afterend', `
      <nav class="l-subnav" aria-label="${section.label}"><ul class="l-subnav__list">${section.children
        .map((c) => `<li><a href="${url(c.path)}" class="l-subnav__link${c.id === PAGE ? ' is-current' : ''}"${c.id === PAGE ? ' aria-current="page"' : ''}>${c.label}</a></li>`)
        .join('')}</ul></nav>`);
  }

  /* ---------- Footer / Floating bar / Top button ---------- */
  body.insertAdjacentHTML('beforeend', `
    <footer class="l-footer">
      <div class="l-footer__inner">
        <ul class="l-footer__nav">${NAV.map((n) => `<li><a href="${url(n.path)}">${n.label}</a></li>`).join('')}</ul>
        <p class="l-footer__name">${SITE.fullName}</p>
        <p>${SITE.zip} ${SITE.address}｜TEL <a href="tel:${SITE.tel}">${SITE.tel}</a></p>
        <p class="l-footer__copy">© ${SITE.nameEn}. All Rights Reserved.</p>
      </div>
    </footer>
    <nav class="l-floatbar" aria-label="クイックメニュー">
      <a href="${url('access/')}" class="l-floatbar__btn l-floatbar__btn--map"><span>📍</span>アクセス</a>
      ${SITE.lineUrl ? `<a ${ext(SITE.lineUrl)} class="l-floatbar__btn l-floatbar__btn--line"><span>💬</span>LINE相談</a>`
        : `<a href="tel:${SITE.tel}" class="l-floatbar__btn l-floatbar__btn--tel"><span>📞</span>電話</a>`}
      <a ${ext(SITE.youtubeUrl)} class="l-floatbar__btn l-floatbar__btn--yt"><span>▶</span>礼拝中継</a>
    </nav>
    <a href="#" class="c-totop js-totop" aria-label="ページ上部へ戻る">↑</a>`);

  /* ---------- 공통 정보 바인딩 ----------
     <span data-site="tel"></span>        → 텍스트 삽입
     <a data-site-href="tel">             → 링크 삽입 (tel/line/youtube/map)
     LINE URL이 비어 있으면 data-site-href="line" 요소는 숨김 */
  $$('[data-site]').forEach((el) => { el.textContent = SITE[el.dataset.site] ?? ''; });
  const HREF = { tel: `tel:${SITE.tel}`, telPastor: `tel:${SITE.telPastor}`, line: SITE.lineUrl, youtube: SITE.youtubeUrl, map: SITE.mapUrl };
  $$('[data-site-href]').forEach((el) => {
    const href = HREF[el.dataset.siteHref];
    if (!href) { el.hidden = true; return; }
    el.href = href;
    if (!href.startsWith('tel:')) { el.target = '_blank'; el.rel = 'noopener'; }
  });
  $$('[data-site-src="mapEmbed"]').forEach((el) => { el.src = SITE.mapEmbed; });
  if (IS_FILE) $$('a[href$="/"]:not([href^="http"])').forEach((a) => { a.href = a.getAttribute('href') + 'index.html'; });

  /* ---------- 이미지 대체 (사진 미등록 시 기본 실루엣) ---------- */
  $$('img[data-fallback]').forEach((img) => {
    const swap = () => { img.onerror = null; img.src = ROOT + 'assets/img/common/placeholder-person.webp'; };
    img.onerror = swap;
    if (img.complete && img.naturalWidth === 0) swap();
  });

  /* ---------- Drawer / Top 버튼 동작 ---------- */
  const toggle = $('.js-drawer-toggle');
  const setDrawer = (open) => {
    body.classList.toggle('is-drawer-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  };
  toggle.addEventListener('click', () => setDrawer(!body.classList.contains('is-drawer-open')));
  $$('.js-drawer-close, .l-drawer a').forEach((el) => el.addEventListener('click', () => setDrawer(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setDrawer(false));

  const totop = $('.js-totop');
  window.addEventListener('scroll', () => totop.classList.toggle('is-show', scrollY > 400), { passive: true });

  /* ---------- 교회원 의견 위젯 (config.js 의 FEEDBACK.enabled) ---------- */
  if (typeof FEEDBACK !== 'undefined' && FEEDBACK.enabled) {
    document.head.insertAdjacentHTML('beforeend', `<link rel="stylesheet" href="${ROOT}assets/css/feedback.css?v=${VER}">`);
    const load = (src) => new Promise((ok) => { const s = document.createElement('script'); s.src = ROOT + src + '?v=' + VER; s.onload = ok; document.body.append(s); });
    load('assets/js/firebase.js').then(() => load('assets/js/feedback.js'));
  }

  /* ==========================================================================
     페이지 위젯 — 해당 컨테이너가 있는 페이지에서만 실행
     ========================================================================== */

  // 예배 시간표 <div class="js-schedule"></div>
  $$('.js-schedule').forEach((el) => {
    el.innerHTML = `<ul class="c-schedule">${SCHEDULE.map((s) => `
      <li class="c-schedule__row">
        <span class="c-schedule__name"><span class="c-tag c-tag--${s.type}">${s.tag}</span>${s.name}</span>
        <span class="c-schedule__time">${s.time}〜</span>
      </li>`).join('')}</ul>`;
  });

  // 자료 버튼 묶음
  const chips = (s, compact) => `<div class="c-chips">
      <a ${ext(s.youtube || SITE.youtubeUrl)} class="c-chip c-chip--yt">▶ ${compact ? '視聴' : 'YouTube 視聴'}</a>
      ${s.slides ? `<a ${ext(s.slides)} class="c-chip c-chip--slides">📊 ${compact ? 'PPT' : 'スライド (PPT)'}</a>` : ''}
      ${s.bulletin ? `<a ${ext(s.bulletin)} class="c-chip c-chip--pdf">📄 ${compact ? '週報' : '週報 (PDF)'}</a>` : ''}
    </div>`;

  // 최신 설교 <div class="js-sermon-latest"></div>
  const latest = typeof SERMONS !== 'undefined' ? SERMONS[0] : null;
  $$('.js-sermon-latest').forEach((el) => {
    if (!latest) return;
    el.innerHTML = `<article class="c-sermon-latest">
      <p class="c-sermon-latest__label">✨ 最新の礼拝メッセージ</p>
      <div class="c-sermon-latest__body">
        <p class="c-sermon__meta">${fmtDate(latest.date)}｜${esc(latest.speaker)}</p>
        <h3 class="c-sermon-latest__title">『${esc(latest.title)}』</h3>
        <p class="c-sermon__bible">📖 ${esc(latest.bible)}</p>
        ${chips(latest)}
      </div></article>`;
  });

  // 지난 설교 목록 <div class="js-sermon-list" data-limit="10"></div>
  $$('.js-sermon-list').forEach((el) => {
    const list = SERMONS.slice(1, 1 + Number(el.dataset.limit || 99));
    el.innerHTML = list.length ? `<ul class="c-sermon-list">${list.map((s) => `
      <li class="c-sermon">
        <div class="c-sermon__head">
          <div><p class="c-sermon__meta">${fmtDate(s.date)}｜📖 ${esc(s.bible)}</p>
          <h4 class="c-sermon__title">『${esc(s.title)}』</h4></div>
          <span class="c-sermon__speaker">${esc(s.speaker)}</span>
        </div>${chips(s, true)}
      </li>`).join('')}</ul>` : '';
  });

  // 주보 목록 (최근 5주) <ul class="js-bulletin-list"></ul>
  $$('.js-bulletin-list').forEach((el) => {
    const list = SERMONS.slice(0, 5);
    el.innerHTML = list.map((s, i) => `<li>${s.bulletin
      ? `<a ${ext(s.bulletin)} class="c-linklist__item">`
      : '<span class="c-linklist__item is-disabled">'}
        <span>${i === 0 ? '<span class="c-tag c-tag--new">最新</span>' : ''}${fmtDate(s.date)} 聖日週報</span>
        <span class="c-linklist__arrow">${s.bulletin ? 'PDF →' : '準備中'}</span>
      ${s.bulletin ? '</a>' : '</span>'}</li>`).join('');
  });

  // 새벽기도회 <ul class="js-morning-list"></ul>
  $$('.js-morning-list').forEach((el) => {
    el.innerHTML = MORNING_PRAYERS.map((m) => `
      <li class="c-linklist__item"><span class="c-linklist__date">${fmtDate(m.date, false)}</span><span>${esc(m.bible)}</span></li>`).join('');
  });
})();
