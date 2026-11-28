let authMode = 'login';

function switchAuthTab(mode) {
  authMode = mode;
  const isSignup = mode === 'signup';
  document.getElementById('authSlider').style.setProperty('--idx', isSignup ? 1 : 0);
  document.getElementById('authTabLogin').classList.toggle('active', !isSignup);
  document.getElementById('authTabSignup').classList.toggle('active', isSignup);
  document.getElementById('nameFieldWrap').classList.toggle('hidden', !isSignup);
  document.getElementById('nameInput').required = isSignup;
  document.getElementById('passInput').autocomplete = isSignup ? 'new-password' : 'current-password';
  document.getElementById('authSubmitBtn').textContent = isSignup ? 'Создать аккаунт' : 'Войти';
  document.getElementById('authMsg').textContent = '';
  document.getElementById('authNotice').classList.add('hidden');
}

function translateAuthError(message = '') {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль';
  if (m.includes('email not confirmed')) return 'Почта ещё не подтверждена — перейдите по ссылке из письма';
  if (m.includes('user already registered')) return 'Аккаунт с этим email уже существует. Попробуйте войти';
  if (m.includes('at least 6 characters')) return 'Пароль должен содержать минимум 6 символов';
  if (m.includes('invalid email')) return 'Введите корректный адрес электронной почты';
  return message;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  if (!db) return;
  const msg = document.getElementById('authMsg');
  const notice = document.getElementById('authNotice');
  const btn = document.getElementById('authSubmitBtn');
  msg.textContent = '';
  notice.classList.add('hidden');

  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passInput').value;
  const fullName = document.getElementById('nameInput').value.trim();

  if (authMode === 'signup' && !fullName) {
    msg.textContent = 'Введите имя';
    return;
  }

  btn.disabled = true;
  btn.textContent = authMode === 'signup' ? 'Создание...' : 'Вход...';

  try {
    if (authMode === 'login') {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) msg.textContent = translateAuthError(error.message);
    } else {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) {
        msg.textContent = translateAuthError(error.message);
      } else if (data?.user && !data?.session) {
        notice.innerHTML = `
          ${ICON.mail}
          <div>
            <strong>Подтвердите почту</strong>
            Мы отправили письмо со ссылкой на <b>${esc(email)}</b>. Откройте его (если не нашли — проверьте папку «Спам»), а затем войдите в аккаунт.
          </div>
        `;
        notice.classList.remove('hidden');
      }
    }
  } finally {
    btn.disabled = false;
    btn.textContent = authMode === 'signup' ? 'Создать аккаунт' : 'Войти';
  }
}

async function signOut() {
  closeModal();
  if (db) await db.auth.signOut();
}