/* ==========================================================================
   admin/js/core.js — 관리 화면 공통 (로그인 · 탭 · 이미지 압축 · 유틸)
   각 기능은 ADMIN.register({ id, label, init }) 로 탭을 추가합니다.
   ========================================================================== */
window.ADMIN = (() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const tabs = [];
  const A = {
    $, $$, tabs,
    register(tab) { tabs.push(tab); },
    esc: (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  };

  /* ---------- 날짜 ---------- */
  const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
  A.iso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  A.today = () => A.iso();
  A.nextSunday = () => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return A.iso(d); };
  A.fmtDate = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? (iso || '') : `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
  };

  /* ---------- 알림 ---------- */
  let toastTimer;
  A.toast = (msg, isError = false) => {
    const t = $('.js-toast');
    t.textContent = msg;
    t.classList.toggle('is-error', isError);
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 5000 : 2500);
  };
  A.fail = (e) => {
    console.error(e);
    const perm = /permission|insufficient/i.test(e && (e.code || e.message));
    A.toast(perm ? '権限がありません（管理者に登録されていないアカウントです）' : '保存できませんでした：' + (e.message || e), true);
  };

  /* ---------- 이미지 압축 ----------
     스마트폰 사진도 자동으로 줄여서 저장 (Firestore 문서 1MB 제한 대응)
     max: 긴 변 픽셀 / quality: 0~1 / maxBytes: 최대 크기 */
  A.resizeImage = (file, { max = 1600, quality = 0.82, maxBytes = 850000 } = {}) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth, h = img.naturalHeight;
      let scale = Math.min(1, max / Math.max(w, h));
      const encode = (s, q) => {
        const c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        let out = c.toDataURL('image/webp', q);
        if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q);
        return out;
      };
      let q = quality;
      let out = encode(scale, q);
      while (out.length > maxBytes && (q > 0.45 || scale > 0.3)) {
        if (q > 0.45) q -= 0.1; else scale *= 0.85;
        out = encode(scale, q);
      }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした（' + file.name + '）')); };
    img.src = url;
  });

  /* 파일 선택 + 미리보기 + 드래그앤드롭 */
  A.filePicker = (label, { multiple = false, onChange } = {}) => {
    const input = label.querySelector('input[type="file"]');
    const previews = label.nextElementSibling && label.nextElementSibling.classList.contains('a-previews') ? label.nextElementSibling : null;
    const show = () => {
      if (previews) previews.innerHTML = [...input.files].map((f) => `<img src="${URL.createObjectURL(f)}" alt="">`).join('');
      onChange && onChange(input.files);
    };
    input.addEventListener('change', show);
    label.addEventListener('dragover', (e) => { e.preventDefault(); label.classList.add('is-over'); });
    label.addEventListener('dragleave', () => label.classList.remove('is-over'));
    label.addEventListener('drop', (e) => {
      e.preventDefault(); label.classList.remove('is-over');
      const dt = new DataTransfer();
      [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')).slice(0, multiple ? 99 : 1).forEach((f) => dt.items.add(f));
      input.files = dt.files; show();
    });
    return { input, clear() { input.value = ''; if (previews) previews.innerHTML = ''; } };
  };

  A.lastSunday = () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return A.iso(d); };

  /* ---------- 로그인 · 시작 ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    const msgEl = $('.js-login-msg');
    const msg = { set textContent(t) { msgEl.textContent = t; }, set className(c) { msgEl.className = c + ' js-login-msg'; } };
    if (!window.hasFirebase()) {
      msg.textContent = 'Firebase が未設定です（assets/js/config.js）';
      msg.className = 'a-msg is-error';
      return;
    }
    let fb;
    try { fb = await window.loadFirebase({ auth: true }); } catch (e) {
      msg.textContent = '読み込みに失敗しました。通信環境を確認してください。';
      msg.className = 'a-msg is-error';
      return;
    }
    Object.assign(A, fb);
    const { au, auth } = fb;

    $('.js-login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      msg.className = 'a-msg'; msg.textContent = 'ログイン中…';
      try {
        await au.signInWithEmailAndPassword(auth, $('#loginEmail').value.trim(), $('#loginPass').value);
        msg.textContent = '';
      } catch (err) {
        msg.className = 'a-msg is-error';
        msg.textContent = /invalid|wrong|not-found|credential/i.test(err.code || '')
          ? 'メールアドレスまたはパスワードが違います。'
          : /too-many/i.test(err.code || '') ? 'しばらく時間をおいてから再度お試しください。' : 'ログインできませんでした：' + err.code;
      } finally { btn.disabled = false; }
    });

    $('.js-reset').addEventListener('click', async () => {
      const email = $('#loginEmail').value.trim();
      if (!email) { msg.className = 'a-msg is-error'; msg.textContent = 'メールアドレスを入力してから押してください。'; return; }
      try {
        await au.sendPasswordResetEmail(auth, email);
        msg.className = 'a-msg is-ok'; msg.textContent = 'パスワード再設定のメールを送信しました。';
      } catch (err) { msg.className = 'a-msg is-error'; msg.textContent = '送信できませんでした：' + err.code; }
    });

    $('.js-logout').addEventListener('click', () => au.signOut(auth));

    let started = false;
    au.onAuthStateChanged(auth, (user) => {
      A.user = user;
      $('.js-login-view').hidden = !!user;
      $('.js-admin-view').hidden = !user;
      if (!user) return;
      $('.js-user').textContent = user.email;
      if (!started) { started = true; start(); }
    });
  });

  function start() {
    const tabBox = $('.js-tabs');
    const panels = $('.js-panels');
    tabBox.innerHTML = tabs.map((t) => `<button type="button" class="a-tabs__btn" data-tab="${t.id}">${t.label}<b hidden></b></button>`).join('');
    panels.innerHTML = tabs.map((t) => `<section class="a-panel" data-panel="${t.id}" hidden></section>`).join('');
    const inited = new Set();
    const show = (id) => {
      $$('.a-tabs__btn', tabBox).forEach((b) => b.classList.toggle('is-current', b.dataset.tab === id));
      $$('.a-panel', panels).forEach((p) => { p.hidden = p.dataset.panel !== id; });
      if (!inited.has(id)) {
        inited.add(id);
        const tab = tabs.find((t) => t.id === id);
        tab.init($(`[data-panel="${id}"]`, panels), A);
      }
      history.replaceState(null, '', '#' + id);
    };
    tabBox.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
    A.go = (id) => { show(id); scrollTo(0, 0); };
    A.badge = (id, n) => { const b = $(`[data-tab="${id}"] b`, tabBox); if (b) { b.hidden = !n; b.textContent = n; } };
    const first = tabs.find((t) => t.id === location.hash.slice(1)) || tabs[0];
    show(first.id);
    // 의견 미처리 건수 배지는 처음부터 표시
    tabs.filter((t) => t.badge).forEach((t) => t.badge(A));
  }

  return A;
})();
