/* ==========================================================================
   content.js — 관리 화면에서 올린 콘텐츠를 공개 페이지에 표시
   (Firestore: bulletins / bulletinPages / shokudo / album / albumFull)

   <div class="js-fs-verse" hidden></div>                  今週の暗誦聖句
   <div class="js-fs-bulletin"></div>                      週報 画像 (最近5週)
   <div class="js-fs-shokudo"></div>                       ハレルヤ食堂 次回の予定
   <div class="js-fs-photos" data-cat="shokudo" data-limit="6"></div>  写真プレビュー
   <div class="js-fs-album"></div>                         フォトアルバム (全体)
   <div class="js-fs-mission-news"></div>                  宣教ニュース・祈りの課題
   <div class="js-fs-people" data-page data-group></div>   人物紹介（牧師・スタッフ・宣教師）
   + .js-sermon-* / .js-morning-list / .js-offering は 관리 화면 데이터가 있으면 덮어씀
   layout.js 가 위 컨테이너가 있는 페이지에서만 자동으로 불러옵니다.
   ========================================================================== */
(async () => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nl2br = (s = '') => esc(s).replace(/\n/g, '<br>');
  const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  const fmtDate = (iso, year = true) => {
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return esc(iso || '');
    const md = `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`;
    return year ? `${d.getFullYear()}年${md}` : md;
  };
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const CATS = {
    worship: '礼拝・賛美', fellowship: '交わり', kids: '子ども', shokudo: 'ハレルヤ食堂',
    event: '行事', mission: '宣教', facility: '会堂', other: 'その他',
  };
  window.ALBUM_CATS = CATS;

  const empty = (el, msg) => { el.innerHTML = `<p class="c-empty">${msg}</p>`; };
  const loading = (el) => { el.innerHTML = '<p class="c-empty is-loading">読み込み中…</p>'; };

  if (!window.hasFirebase()) {
    $$('.js-fs-bulletin, .js-fs-shokudo, .js-fs-photos, .js-fs-album, .js-fs-mission-news').forEach((el) => empty(el, '準備中です。'));
    return;
  }

  $$('.js-fs-bulletin, .js-fs-shokudo, .js-fs-photos, .js-fs-album, .js-fs-mission-news').forEach(loading);
  let fs, db;
  try {
    ({ fs, db } = await window.loadFirebase());
  } catch (e) {
    console.error(e);
    $$('.js-fs-bulletin, .js-fs-shokudo, .js-fs-photos, .js-fs-album, .js-fs-mission-news').forEach((el) => empty(el, '読み込めませんでした。時間をおいて再度お試しください。'));
    return;
  }
  const { collection, doc, getDoc, getDocs, query, orderBy, where, limit, startAfter } = fs;
  const safe = async (el, fn) => {
    try { await fn(); } catch (e) { console.error(e); if (el) empty(el, '読み込めませんでした。'); }
  };

  /* ==========================================================================
     라이트박스 (사진 크게 보기) — items: [{ thumb, title, sub, load: async () => src }]
     ========================================================================== */
  const lb = (() => {
    let box, items = [], idx = 0;
    const build = () => {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="c-lightbox" hidden role="dialog" aria-modal="true" aria-label="画像の拡大表示">
          <button type="button" class="c-lightbox__close" aria-label="閉じる">×</button>
          <button type="button" class="c-lightbox__prev" aria-label="前へ">‹</button>
          <img alt="">
          <p class="c-lightbox__cap"></p>
          <button type="button" class="c-lightbox__next" aria-label="次へ">›</button>
        </div>`);
      box = $('.c-lightbox');
      box.querySelector('.c-lightbox__close').onclick = close;
      box.querySelector('.c-lightbox__prev').onclick = () => show(idx - 1);
      box.querySelector('.c-lightbox__next').onclick = () => show(idx + 1);
      box.addEventListener('click', (e) => e.target === box && close());
      document.addEventListener('keydown', (e) => {
        if (box.hidden) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(idx - 1);
        if (e.key === 'ArrowRight') show(idx + 1);
      });
      let x0 = null;
      box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      box.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
        x0 = null;
      });
    };
    const show = async (i) => {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      const img = box.querySelector('img');
      img.src = it.thumb || '';
      img.alt = it.title || '';
      box.querySelector('.c-lightbox__cap').innerHTML =
        `${esc(it.title || '')}<span>${esc(it.sub || '')}${items.length > 1 ? `　${idx + 1} / ${items.length}` : ''}</span>`;
      const multi = items.length > 1;
      box.querySelector('.c-lightbox__prev').hidden = !multi;
      box.querySelector('.c-lightbox__next').hidden = !multi;
      if (it.load) {
        const mine = idx;
        try { const src = await it.load(); if (mine === idx && src) img.src = src; } catch (e) { console.error(e); }
      }
    };
    const close = () => { box.hidden = true; document.body.style.overflow = ''; };
    return {
      open(list, i) {
        if (!box) build();
        items = list;
        box.hidden = false;
        document.body.style.overflow = 'hidden';
        show(i);
      },
    };
  })();

  // 원본 이미지 캐시
  const fullCache = new Map();
  const loadFull = (col, id) => async () => {
    const key = col + '/' + id;
    if (!fullCache.has(key)) {
      fullCache.set(key, getDoc(doc(db, col, id)).then((s) => (s.exists() ? s.data().data : '')));
    }
    return fullCache.get(key);
  };

  /* ==========================================================================
     今週の暗誦聖句 + 週報
     ========================================================================== */
  const needBulletin = $('.js-fs-verse') || $('.js-fs-bulletin');
  if (needBulletin) {
    await safe($('.js-fs-bulletin'), async () => {
      const snap = await getDocs(query(collection(db, 'bulletins'), where('date', '<=', today()), orderBy('date', 'desc'), limit(5)));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 암송성구 (최신 주)
      $$('.js-fs-verse').forEach((el) => {
        const v = list.find((b) => b.verse);
        if (!v) return;
        el.innerHTML = `
          <section class="c-verse">
            <p class="c-verse__label">今週の暗誦聖句<span>${fmtDate(v.date, false)}</span></p>
            <blockquote class="c-verse__text">${nl2br(v.verse)}</blockquote>
            ${v.verseRef ? `<cite class="c-verse__ref">${esc(v.verseRef)}</cite>` : ''}
          </section>`;
        el.hidden = false;
      });

      // 주보 이미지
      $$('.js-fs-bulletin').forEach((el) => {
        if (!list.length) return empty(el, '週報は準備中です。');
        el.innerHTML = `
          <div class="c-bulletin__tabs" role="tablist">${list.map((b, i) =>
            `<button type="button" role="tab" data-i="${i}" class="${i === 0 ? 'is-current' : ''}">${i === 0 ? '<span class="c-tag c-tag--new">最新</span>' : ''}${fmtDate(b.date, false)}</button>`).join('')}</div>
          <div class="c-bulletin__pages"></div>`;
        const pagesEl = $('.c-bulletin__pages', el);
        const showWeek = (i) => {
          const b = list[i];
          $$('.c-bulletin__tabs button', el).forEach((btn) => btn.classList.toggle('is-current', Number(btn.dataset.i) === i));
          const n = b.pages || 0;
          if (!n) return empty(pagesEl, 'この週の週報画像はありません。');
          const items = Array.from({ length: n }, (_, k) => ({
            title: `${fmtDate(b.date)} 週報`, sub: `${k + 1}ページ`, thumb: k === 0 ? b.thumb : '',
            load: loadFull('bulletinPages', `${b.id}_${k + 1}`),
          }));
          pagesEl.innerHTML = items.map((it, k) =>
            `<button type="button" class="c-bulletin__page" data-k="${k}" aria-label="${k + 1}ページを拡大"><img alt="週報 ${k + 1}ページ" ${it.thumb ? `src="${it.thumb}"` : ''}></button>`).join('');
          items.forEach(async (it, k) => {
            const src = await it.load();
            const img = $(`[data-k="${k}"] img`, pagesEl);
            if (img && src) img.src = src;
          });
          pagesEl.onclick = (e) => {
            const btn = e.target.closest('[data-k]');
            if (btn) lb.open(items, Number(btn.dataset.k));
          };
        };
        el.querySelector('.c-bulletin__tabs').onclick = (e) => {
          const btn = e.target.closest('[data-i]');
          if (btn) showWeek(Number(btn.dataset.i));
        };
        showWeek(0);
      });
    });
  }

  /* ==========================================================================
     ハレルヤ食堂 — 次回の予定・メニュー
     ========================================================================== */
  for (const el of $$('.js-fs-shokudo')) {
    await safe(el, async () => {
      const snap = await getDocs(query(collection(db, 'shokudo'), where('date', '>=', today()), orderBy('date'), limit(Number(el.dataset.limit || 4))));
      if (snap.empty) return empty(el, '次回の予定は準備中です。決まり次第お知らせします。');
      const items = [];
      el.innerHTML = `<div class="c-event-list">${snap.docs.map((d, i) => {
        const e = d.data();
        if (e.image) items.push({ title: `${fmtDate(e.date)} ${e.menu || ''}`, thumb: e.image, key: i });
        return `
          <article class="c-event${i === 0 ? ' c-event--next' : ''}">
            ${i === 0 ? '<span class="c-event__badge">次回</span>' : ''}
            ${e.image ? `<button type="button" class="c-event__img" data-img="${items.length - 1}"><img src="${e.image}" alt="${esc(e.menu || '')}"></button>` : ''}
            <div class="c-event__body">
              <p class="c-event__date">${fmtDate(e.date)}${e.time ? `<span>${esc(e.time)}</span>` : ''}</p>
              ${e.menu ? `<h3 class="c-event__menu">🍽️ ${esc(e.menu)}</h3>` : ''}
              ${e.note ? `<p class="c-event__note">${nl2br(e.note)}</p>` : ''}
            </div>
          </article>`;
      }).join('')}</div>`;
      el.onclick = (ev) => {
        const b = ev.target.closest('[data-img]');
        if (b) lb.open(items, Number(b.dataset.img));
      };
    });
  }

  /* ==========================================================================
     メッセージ・早天祈祷会・献金口座 — 관리 화면 데이터가 있으면 덮어쓰기
     (없으면 weekly.js / config.js 내용 그대로)
     ========================================================================== */
  const R = window.SITE_RENDER || {};
  if (R.sermons && ($('.js-sermon-latest') || $('.js-sermon-list'))) {
    await safe(null, async () => {
      const snap = await getDocs(query(collection(db, 'sermons'), where('date', '<=', today()), orderBy('date', 'desc'), limit(10)));
      if (!snap.empty) R.sermons(snap.docs.map((d) => d.data()));
    });
  }
  if (R.morning && $('.js-morning-list')) {
    await safe(null, async () => {
      const snap = await getDocs(query(collection(db, 'morning'), where('date', '<=', today()), orderBy('date', 'desc'), limit(7)));
      if (!snap.empty) R.morning(snap.docs.map((d) => d.data()));
    });
  }
  if (R.offering && $('.js-offering')) {
    await safe(null, async () => {
      const s = await getDoc(doc(db, 'settings', 'offering'));
      if (s.exists() && (s.data().accounts || []).length) R.offering(s.data());
    });
  }

  /* ==========================================================================
     宣教ニュース・祈りの課題
     ========================================================================== */
  for (const el of $$('.js-fs-mission-news')) {
    await safe(el, async () => {
      const snap = await getDocs(query(collection(db, 'missionNews'), orderBy('date', 'desc'), limit(Number(el.dataset.limit || 6))));
      if (snap.empty) return empty(el, '宣教地からのお便りは準備中です。');
      const items = [];
      el.innerHTML = `<div class="c-news-list">${snap.docs.map((d) => {
        const n = d.data();
        if (n.image) items.push({ title: n.title, sub: `${n.missionary || ''} ${fmtDate(n.date)}`, thumb: n.image });
        return `
          <article class="c-news">
            ${n.image ? `<button type="button" class="c-news__img" data-img="${items.length - 1}"><img src="${n.image}" alt="" loading="lazy"></button>` : ''}
            <div class="c-news__body">
              <p class="c-news__meta">${fmtDate(n.date)}${n.missionary ? `｜<b>${esc(n.missionary)}</b>` : ''}${n.prayer ? '<span class="c-tag c-tag--green">祈りの課題</span>' : ''}</p>
              <h3 class="c-news__title">${esc(n.title || '')}</h3>
              <p class="c-news__text">${nl2br(n.body || '')}</p>
            </div>
          </article>`;
      }).join('')}</div>`;
      el.onclick = (ev) => { const b = ev.target.closest('[data-img]'); if (b) lb.open(items, Number(b.dataset.img)); };
    });
  }

  /* ==========================================================================
     人物紹介（牧師・スタッフ／宣教師） — people/{id}
     등록 데이터가 있으면 HTML에 적힌 기본 내용을 대체합니다.
     ========================================================================== */
  const ROOT = document.body.dataset.root || './';
  const PH = ROOT + 'assets/img/common/placeholder-person.webp';
  const paras = (t = '') => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${nl2br(x)}</p>`).join('');
  const lines = (t = '') => t.split('\n').map((x) => x.trim()).filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('');
  const draft = (p) => (p.draft ? '<span class="u-draft">【※こちらの内容は現在準備中です。後日正式な内容に差し替えられます。】</span>' : '');
  const PEOPLE_VIEW = {
    pastor: (p) => `
      <article class="c-card c-profile">
        <div class="c-profile__img"><img src="${p.image || PH}" alt="${esc(p.role)} ${esc(p.name)}" width="220" height="293"></div>
        <div class="c-profile__body">
          <div class="c-profile__head">
            <span class="c-profile__role">${esc(p.role)}</span>
            <h3 class="c-profile__name">${esc(p.name)}${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</h3>
          </div>
          ${draft(p)}
          <div class="c-profile__text">
            ${p.title ? `<h4>${esc(p.title)}</h4>` : ''}
            ${p.quote ? `<blockquote class="c-quote c-quote--blue">${nl2br(p.quote)}${p.quoteRef ? `<cite>${esc(p.quoteRef)}</cite>` : ''}</blockquote>` : ''}
            ${paras(p.body)}
          </div>
        </div>
      </article>`,
    member: (p) => `
      <article class="c-person">
        <div class="c-person__img"><img src="${p.image || PH}" alt="${esc(p.role)} ${esc(p.name)}" loading="lazy"></div>
        <div>
          <span class="c-person__role">${esc(p.role)}</span>
          <h3 class="c-person__name">${esc(p.name)}</h3>
          <p class="c-person__text">${nl2br(p.body)}${p.draft ? '（※紹介文準備中）' : ''}</p>
        </div>
      </article>`,
    missionary: (p) => `
      <article class="c-card c-profile c-profile--s">
        <div class="c-profile__img"><img src="${p.image || PH}" alt="${esc(p.name)}" loading="lazy"></div>
        <div class="c-profile__body">
          <div class="c-profile__head">
            <span class="c-tag c-tag--green">${esc(p.role || '宣教師')}</span>
            <h3 class="c-profile__name">${esc(p.name)}${p.sub ? `<small>${esc(p.sub)}</small>` : ''}</h3>
            ${p.field ? `<p class="c-profile__field">${esc(p.field)}</p>` : ''}
          </div>
          ${draft(p)}
          <ul class="c-list">${lines(p.body)}</ul>
        </div>
      </article>`,
  };
  const peopleEls = $$('.js-fs-people');
  const greetEl = $('.js-fs-greeting');
  if (peopleEls.length || greetEl) {
    const pages = [...new Set(peopleEls.map((el) => el.dataset.page).concat(greetEl ? ['staff'] : []))];
    for (const page of pages) {
      await safe(null, async () => {
        const snap = await getDocs(query(collection(db, 'people'), where('page', '==', page)));
        const all = snap.docs.map((d) => d.data()).sort((a, b) => (a.order || 0) - (b.order || 0));
        if (!all.length) return;
        peopleEls.filter((el) => el.dataset.page === page).forEach((el) => {
          const g = el.dataset.group;
          const list = all.filter((p) => p.group === g);
          if (!list.length) return;
          const html = list.map(PEOPLE_VIEW[g]).join('');
          el.innerHTML = g === 'member' ? `<div class="c-grid" style="--grid-min: 340px">${html}</div>` : html;
        });
        // 홈의 주임목사 인사 (목회자 첫 번째)
        const head = all.find((p) => p.group === 'pastor');
        if (greetEl && page === 'staff' && head) {
          const img = $('img', greetEl);
          if (head.image) img.src = head.image;
          img.alt = `${head.role} ${head.name}`;
          $('.p-home-pastor__name', greetEl).textContent = `${(head.role || '').replace(/[（(].*$/, '').trim()} ${head.name}`;
          const first = (head.body || '').split(/\n\s*\n/).slice(0, 2).join('\n');
          if (first) $('p', greetEl).innerHTML = nl2br(first);
        }
      });
    }
  }

  /* ハレルヤ食堂 — 紹介文・ご利用案内 (settings/shokudo) */
  if ($('.js-fs-shokudo-info') || $('.js-fs-shokudo-intro')) {
    await safe(null, async () => {
      const s = await getDoc(doc(db, 'settings', 'shokudo'));
      if (!s.exists()) return;
      const d = s.data();
      $$('.js-fs-shokudo-intro').forEach((el) => { if (d.intro) el.innerHTML = paras(d.intro); });
      $$('.js-fs-shokudo-info').forEach((el) => {
        const rows = (d.info || []).filter((r) => r.label && r.value);
        if (rows.length) el.innerHTML = rows.map((r) => `<dt>${esc(r.label)}</dt><dd>${nl2br(r.value)}</dd>`).join('');
      });
    });
  }

  /* ==========================================================================
     앨범 공통
     ========================================================================== */
  const albumItem = (p) => ({
    id: p.id, cat: p.cat, thumb: p.thumb,
    title: p.title || CATS[p.cat] || '',
    sub: [CATS[p.cat], p.date ? fmtDate(p.date) : ''].filter(Boolean).join('｜'),
    load: loadFull('albumFull', p.id),
  });
  const tile = (it, i) => `
    <figure class="c-photo-tile"><button type="button" data-i="${i}">
      <img src="${it.thumb}" alt="${esc(it.title)}" loading="lazy">
      <figcaption>${esc(it.title)}<span>${esc(it.sub)}</span></figcaption>
    </button></figure>`;

  // 사진 미리보기 (예: 식당 페이지)
  for (const el of $$('.js-fs-photos')) {
    await safe(el, async () => {
      const cat = el.dataset.cat;
      const snap = await getDocs(query(collection(db, 'album'), orderBy('date', 'desc'), limit(120)));
      const items = snap.docs.map((d) => albumItem({ id: d.id, ...d.data() }))
        .filter((p) => !cat || p.cat === cat).slice(0, Number(el.dataset.limit || 6));
      if (!items.length) return empty(el, '写真は準備中です。');
      el.innerHTML = `<div class="c-photo-grid c-photo-grid--compact">${items.map(tile).join('')}</div>`;
      el.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) lb.open(items, Number(b.dataset.i)); };
    });
  }

  // 앨범 전체 페이지
  for (const el of $$('.js-fs-album')) {
    await safe(el, async () => {
      const PAGE = 48;
      let all = [];
      let last = null;
      let done = false;
      let cat = CATS[location.hash.slice(1)] ? location.hash.slice(1) : 'all';

      el.innerHTML = `
        <div class="c-filter js-filter"></div>
        <div class="c-photo-grid js-grid"></div>
        <div class="u-center"><button type="button" class="c-btn c-btn--outline js-more" hidden>もっと見る</button></div>`;
      const grid = $('.js-grid', el);
      const more = $('.js-more', el);

      const fetchPage = async () => {
        const q = last
          ? query(collection(db, 'album'), orderBy('date', 'desc'), startAfter(last), limit(PAGE))
          : query(collection(db, 'album'), orderBy('date', 'desc'), limit(PAGE));
        const snap = await getDocs(q);
        if (snap.docs.length) last = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < PAGE) done = true;
        all = all.concat(snap.docs.map((d) => albumItem({ id: d.id, ...d.data() })));
      };
      const render = () => {
        const counts = all.reduce((m, p) => ((m[p.cat] = (m[p.cat] || 0) + 1), m), {});
        $('.js-filter', el).innerHTML = [['all', 'すべて', all.length], ...Object.entries(CATS).filter(([k]) => counts[k]).map(([k, v]) => [k, v, counts[k]])]
          .map(([k, v, n]) => `<button type="button" data-cat="${k}" class="${k === cat ? 'is-current' : ''}">${v}<b>${n}</b></button>`).join('');
        const list = all.filter((p) => cat === 'all' || p.cat === cat);
        grid.innerHTML = list.length ? list.map(tile).join('') : '<p class="c-empty">写真は準備中です。</p>';
        grid.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) lb.open(list, Number(b.dataset.i)); };
        more.hidden = done;
      };
      $('.js-filter', el).onclick = (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        cat = b.dataset.cat;
        history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat);
        render();
      };
      more.onclick = async () => { more.disabled = true; await fetchPage(); more.disabled = false; render(); };
      await fetchPage();
      render();
    });
  }
})();
