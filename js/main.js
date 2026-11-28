let currentPage = 'hw';
let appReady = false;
let toastTimer = null;

// --- Тема ---
const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

function isDarkActive(theme) {
  const t = theme || localStorage.getItem('diary_theme') || 'auto';
  return t === 'dark' || (t === 'auto' && darkMedia.matches);
}

function updateStatusBarAndIcon(theme) {
  const dark = isDarkActive(theme);
  const color = dark ? '#000000' : '#f2f2f7';

  const oldMeta = document.getElementById('themeColorMeta');
  if (oldMeta) oldMeta.remove();
  const newMeta = document.createElement('meta');
  newMeta.name = 'theme-color';
  newMeta.id = 'themeColorMeta';
  newMeta.content = color;
  document.head.appendChild(newMeta);

  document.documentElement.style.backgroundColor = color;
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';

  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.innerHTML = dark ? ICON.moon : ICON.sun;
    btn.title = dark ? 'Включить светлую тему' : 'Включить тёмную тему';
  }
}

function applyTheme(theme) {
  const val = theme || 'auto';
  localStorage.setItem('diary_theme', val);
  if (val === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', val);
  updateStatusBarAndIcon(val);
}

function toggleThemeQuick() {
  const dark = isDarkActive();
  applyTheme(dark ? 'light' : 'dark');
  try {
    sessionStorage.setItem('diary_restore_page', currentPage);
    sessionStorage.setItem('diary_restore_day', String(selectedDay));
  } catch (e) {}
  location.reload();
}

darkMedia.addEventListener('change', () => {
  if ((localStorage.getItem('diary_theme') || 'auto') === 'auto') {
    updateStatusBarAndIcon('auto');
  }
});
applyTheme(localStorage.getItem('diary_theme') || 'auto');

// --- Утилиты UI ---
function showToast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

function esc(str = '') {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function linkifyText(str = '') {
  return esc(str).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function safeFullName(profile) {
  return (profile?.full_name || profile?.email || 'Пользователь').trim();
}

function clearAnimClasses(el) {
  if (!el) return;
  el.classList.remove('tab-enter', 'day-slide-next', 'day-slide-prev');
}

function playAnim(el, cls) {
  if (!el) return;
  clearAnimClasses(el);
  clearTimeout(el._animTimer);
  requestAnimationFrame(() => {
    el.classList.add(cls);
    const onEnd = () => {
      clearAnimClasses(el);
      el.removeEventListener('animationend', onEnd);
    };
    el.addEventListener('animationend', onEnd, { once: true });
    el._animTimer = setTimeout(onEnd, 260);
  });
}

function openModal() {
  document.getElementById('modalBackdrop').classList.add('open');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
}

function openLightbox(url) {
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

// --- Навигация ---
function switchPage(page, animate = true) {
  if (currentPage === page && animate) return;
  currentPage = page;

  const pages = ['hw', 'members', 'profile'];
  const idx = Math.max(0, pages.indexOf(page));

  const pageHw = document.getElementById('pageHw');
  const pageMembers = document.getElementById('pageMembers');
  const pageProfile = document.getElementById('pageProfile');

  document.getElementById('navSlider').style.setProperty('--idx', idx);
  document.getElementById('navHw').classList.toggle('active', page === 'hw');
  document.getElementById('navMembers').classList.toggle('active', page === 'members');
  document.getElementById('navProfile').classList.toggle('active', page === 'profile');

  pageHw.classList.toggle('hidden', page !== 'hw');
  pageMembers.classList.toggle('hidden', page !== 'members');
  pageProfile.classList.toggle('hidden', page !== 'profile');

  const activeEl = page === 'hw' ? pageHw : page === 'members' ? pageMembers : pageProfile;
  if (animate) playAnim(activeEl, 'tab-enter');

  if (page === 'hw') loadHwData(true);
  else if (page === 'members') loadMembers(true);
  else renderProfilePage();
}

// --- Экран загрузки и инициализация ---
function showSplashError(text) {
  const sp = document.getElementById('splashSpinner');
  const errBox = document.getElementById('splashError');
  if (sp) sp.classList.add('hidden');
  if (!errBox) return;
  errBox.innerHTML = `
    <strong>Не удалось загрузить Diary</strong>
    <div>${esc(text)}</div>
    <div class="row" style="justify-content:center;">
      <button class="btn sm" onclick="location.reload()">Повторить</button>
      <button class="btn sm secondary" onclick="resetSessionAndReload()">Сбросить вход</button>
    </div>
  `;
  errBox.classList.remove('hidden');
}

function resetSessionAndReload() {
  try {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('sb-')) localStorage.removeItem(k);
    });
  } catch (e) {}
  location.reload();
}

function hideSplash() {
  const splash = document.getElementById('splashView');
  if (!splash || splash.classList.contains('fade-out')) return;
  splash.classList.add('fade-out');
  setTimeout(() => splash.classList.add('hidden'), 280);
}

async function enterApp(user) {
  currentUser = user;

  let restoredPage = 'hw';
  try {
    const savedPage = sessionStorage.getItem('diary_restore_page');
    const savedDay = Number(sessionStorage.getItem('diary_restore_day'));
    if (savedPage && ['hw', 'members', 'profile'].includes(savedPage)) restoredPage = savedPage;
    if (savedDay >= 1 && savedDay <= 5) selectedDay = savedDay;
    sessionStorage.removeItem('diary_restore_page');
    sessionStorage.removeItem('diary_restore_day');
  } catch (e) {}

  await loadMyProfile();
  initDaysBar();
  updateDaysUI();
  await loadHwData();
  renderProfilePage();
  await loadMembers(true);

  document.getElementById('authView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');

  if (restoredPage !== 'hw') {
    switchPage(restoredPage, false);
  }
}

function showAuthScreen() {
  currentUser = null;
  currentProfile = null;
  document.getElementById('appView').classList.add('hidden');
  document.getElementById('authView').classList.remove('hidden');
}

async function initApp() {
  try {
    await ensureSupabase();
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: (name, acquireTimeout, fn) => fn()
      }
    });

    db.auth.onAuthStateChange((event, session) => {
      if (!appReady) return;
      if (event === 'SIGNED_IN' && session?.user) {
        setTimeout(() => enterApp(session.user), 0);
      } else if (event === 'SIGNED_OUT') {
        showAuthScreen();
      }
    });

    const res = await withTimeout(
      db.auth.getSession(),
      7000,
      'Сервер Supabase не отвечает. Проверьте подключение к интернету.'
    );
    const session = res?.data?.session;

    if (session?.user) {
      await withTimeout(
        enterApp(session.user),
        8000,
        'Долгая загрузка данных. Нажмите «Повторить» или «Сбросить вход».'
      );
    } else {
      showAuthScreen();
    }

    appReady = true;
    hideSplash();
  } catch (err) {
    showSplashError(err?.message || 'Ошибка запуска приложения');
  }
}

initApp();