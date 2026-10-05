// ============================================================
// ЛОГИКА СТРАНИЦЫ ВХОДА / РЕГИСТРАЦИИ
// ============================================================

// Если уже залогинен — сразу на главную
if (API.loadToken()) {
  window.location.href = 'index.html';
}

// ============================================================
// ПЕРЕКЛЮЧЕНИЕ ТАБОВ
// ============================================================
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(target + 'Form').classList.add('active');
    clearErrors();
  });
});

// ============================================================
// ПОКАЗ ПАРОЛЯ
// ============================================================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ============================================================
// ОЧИСТКА ОШИБОК
// ============================================================
function clearErrors() {
  document.getElementById('loginError').textContent = '';
  document.getElementById('regError').textContent = '';
}

// ============================================================
// ФОРМА ВХОДА
// ============================================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const nickname = document.getElementById('loginNickname').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = e.target.querySelector('button[type="submit"]');

  if (!nickname || !password) {
    errorEl.textContent = 'Заполните все поля';
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const { token, user } = await API.login(nickname, password);
    API.setToken(token);
    errorEl.textContent = '';
    // Небольшая задержка для плавности
    setTimeout(() => window.location.href = 'index.html', 400);
  } catch (err) {
    errorEl.textContent = err.message || 'Ошибка входа';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// ============================================================
// ФОРМА РЕГИСТРАЦИИ
// ============================================================
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const nickname = document.getElementById('regNickname').value.trim();
  const password = document.getElementById('regPassword').value;
  const password2 = document.getElementById('regPassword2').value;
  const errorEl = document.getElementById('regError');
  const btn = e.target.querySelector('button[type="submit"]');

  // Валидация
  if (!nickname || !password || !password2) {
    errorEl.textContent = 'Заполните все поля';
    return;
  }
  if (nickname.length < 3 || nickname.length > 20) {
    errorEl.textContent = 'Ник: 3-20 символов';
    return;
  }
  if (password.length < 4) {
    errorEl.textContent = 'Пароль: минимум 4 символа';
    return;
  }
  if (password !== password2) {
    errorEl.textContent = 'Пароли не совпадают';
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const { token } = await API.register(nickname, password);
    API.setToken(token);
    errorEl.textContent = '';
    setTimeout(() => window.location.href = 'index.html', 400);
  } catch (err) {
    errorEl.textContent = err.message || 'Ошибка регистрации';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// ============================================================
// ENTER для переключения между полями (UX)
// ============================================================
document.getElementById('loginNickname').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('loginPassword').focus();
  }
});

document.getElementById('regNickname').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('regPassword').focus();
  }
});