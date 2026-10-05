// ============================================================
// МОДАЛЬНОЕ ОКНО ВХОДА / РЕГИСТРАЦИИ
// ============================================================

let _afterAuthCallback = null;

function openAuthModal(afterAuth) {
  _afterAuthCallback = afterAuth || null;

  const overlay = document.getElementById('authModalOverlay');
  if (!overlay) {
    console.error('❌ authModalOverlay не найден в HTML');
    return;
  }

  overlay.classList.add('show');

  setTimeout(() => {
    const nick = document.getElementById('authModalLoginNick');
    if (nick) nick.focus();
  }, 100);
}

function closeAuthModal() {
  const overlay = document.getElementById('authModalOverlay');
  if (overlay) overlay.classList.remove('show');
  _afterAuthCallback = null;

  document.querySelectorAll('.auth-modal-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.auth-modal-form input').forEach(input => input.value = '');
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('authModalOverlay');
  if (!overlay) {
    console.warn('⚠️ authModalOverlay не найден — модалка входа не подключена');
    return;
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAuthModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) {
      closeAuthModal();
    }
  });

  overlay.querySelectorAll('.auth-modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.auth-modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const loginForm = overlay.querySelector('#authModalLoginForm');
      const regForm = overlay.querySelector('#authModalRegForm');

      if (tab.dataset.tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
      } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
      }

      overlay.querySelectorAll('.auth-modal-error').forEach(el => el.textContent = '');
    });
  });

  const loginForm = overlay.querySelector('#authModalLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nick = overlay.querySelector('#authModalLoginNick').value.trim();
      const pass = overlay.querySelector('#authModalLoginPass').value;
      const err = overlay.querySelector('#authModalLoginError');
      const btn = loginForm.querySelector('button[type="submit"]');

      if (!nick || !pass) {
        err.textContent = 'Заполните все поля';
        return;
      }

      btn.disabled = true;
      btn.textContent = '⏳ ВХОД...';
      err.textContent = '';

      try {
        await loginUser(nick, pass);
        notify('Добро пожаловать, ' + state.user.name + '!', 'success');
        updateUI();
        closeAuthModal();

        if (typeof _afterAuthCallback === 'function') {
          const cb = _afterAuthCallback;
          _afterAuthCallback = null;
          setTimeout(cb, 300);
        }
      } catch (error) {
        err.textContent = error.message || 'Ошибка входа';
        btn.disabled = false;
        btn.textContent = '🔓 ВОЙТИ';
      }
    });
  }

  const regForm = overlay.querySelector('#authModalRegForm');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nick = overlay.querySelector('#authModalRegNick').value.trim();
      const pass = overlay.querySelector('#authModalRegPass').value;
      const pass2 = overlay.querySelector('#authModalRegPass2').value;
      const err = overlay.querySelector('#authModalRegError');
      const btn = regForm.querySelector('button[type="submit"]');

      if (!nick || !pass || !pass2) { err.textContent = 'Заполните все поля'; return; }
      if (nick.length < 3 || nick.length > 20) { err.textContent = 'Ник: 3-20 символов'; return; }
      if (pass.length < 4) { err.textContent = 'Пароль: минимум 4 символа'; return; }
      if (pass !== pass2) { err.textContent = 'Пароли не совпадают'; return; }

      btn.disabled = true;
      btn.textContent = '⏳ СОЗДАНИЕ...';
      err.textContent = '';

      try {
        await registerUser(nick, pass);
        notify('Аккаунт создан!', 'success');
        updateUI();
        closeAuthModal();

        if (typeof _afterAuthCallback === 'function') {
          const cb = _afterAuthCallback;
          _afterAuthCallback = null;
          setTimeout(cb, 300);
        }
      } catch (error) {
        err.textContent = error.message || 'Ошибка регистрации';
        btn.disabled = false;
        btn.textContent = '🚀 СОЗДАТЬ АККАУНТ';
      }
    });
  }

  const closeBtn = overlay.querySelector('.auth-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
});