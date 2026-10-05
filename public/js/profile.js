// ============================================================
// ПРОФИЛЬ — с формой входа/регистрации
// ============================================================

function renderProfile() {
  const container = document.getElementById('profileContainer');
  if (!container) return;

  if (!state.user) {
    // Не залогинен — показываем форму
    renderAuthForm(container);
  } else {
    // Залогинен — показываем профиль
    renderUserProfile(container);
  }
}

// ============================================================
// ФОРМА ВХОДА / РЕГИСТРАЦИИ
// ============================================================
function renderAuthForm(container) {
  container.innerHTML = `
    <div class="profile-auth-wrap">
      <div class="profile-auth-card">
        <div class="profile-auth-logo">⚔️</div>
        <h2 class="profile-auth-title">ВХОД В АККАУНТ</h2>
        <p class="profile-auth-sub">Войди, чтобы играть и сохранять прогресс</p>

        <div class="profile-auth-tabs">
          <button class="profile-auth-tab active" data-tab="login">ВХОД</button>
          <button class="profile-auth-tab" data-tab="register">РЕГИСТРАЦИЯ</button>
        </div>

        <!-- ФОРМА ВХОДА -->
        <form id="profileLoginForm" class="profile-auth-form">
          <div class="form-group">
            <label>Никнейм</label>
            <input type="text" id="profileLoginNick" placeholder="Введите ник" autocomplete="username">
          </div>
          <div class="form-group">
            <label>Пароль</label>
            <input type="password" id="profileLoginPass" placeholder="Введите пароль" autocomplete="current-password">
          </div>
          <div class="form-error" id="profileLoginError"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">
            <span class="btn-icon-inner">🔓</span> ВОЙТИ
          </button>
        </form>

        <!-- ФОРМА РЕГИСТРАЦИИ -->
        <form id="profileRegForm" class="profile-auth-form" style="display:none;">
          <div class="form-group">
            <label>Никнейм</label>
            <input type="text" id="profileRegNick" placeholder="3-20 символов" autocomplete="username">
          </div>
          <div class="form-group">
            <label>Пароль</label>
            <input type="password" id="profileRegPass" placeholder="Минимум 4 символа" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label>Повторите пароль</label>
            <input type="password" id="profileRegPass2" placeholder="Ещё раз" autocomplete="new-password">
          </div>
          <div class="form-error" id="profileRegError"></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg">
            <span class="btn-icon-inner">🚀</span> СОЗДАТЬ АККАУНТ
          </button>
        </form>
      </div>
    </div>
  `;

  // Переключение табов
  container.querySelectorAll('.profile-auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.profile-auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const login = container.querySelector('#profileLoginForm');
      const reg = container.querySelector('#profileRegForm');

      if (tab.dataset.tab === 'login') {
        login.style.display = 'block';
        reg.style.display = 'none';
      } else {
        login.style.display = 'none';
        reg.style.display = 'block';
      }

      container.querySelector('#profileLoginError').textContent = '';
      container.querySelector('#profileRegError').textContent = '';
    });
  });

  // Обработчик входа
  container.querySelector('#profileLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = container.querySelector('#profileLoginNick').value.trim();
    const pass = container.querySelector('#profileLoginPass').value;
    const err = container.querySelector('#profileLoginError');
    const btn = e.target.querySelector('button[type="submit"]');

    if (!nick || !pass) {
      err.textContent = 'Заполните все поля';
      return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
      await loginUser(nick, pass);
      notify('Добро пожаловать, ' + state.user.name + '!', 'success');
      updateUI();
      renderProfile();
    } catch (error) {
      err.textContent = error.message || 'Ошибка входа';
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  // Обработчик регистрации
  container.querySelector('#profileRegForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nick = container.querySelector('#profileRegNick').value.trim();
    const pass = container.querySelector('#profileRegPass').value;
    const pass2 = container.querySelector('#profileRegPass2').value;
    const err = container.querySelector('#profileRegError');
    const btn = e.target.querySelector('button[type="submit"]');

    if (!nick || !pass || !pass2) {
      err.textContent = 'Заполните все поля';
      return;
    }
    if (nick.length < 3 || nick.length > 20) {
      err.textContent = 'Ник: 3-20 символов';
      return;
    }
    if (pass.length < 4) {
      err.textContent = 'Пароль: минимум 4 символа';
      return;
    }
    if (pass !== pass2) {
      err.textContent = 'Пароли не совпадают';
      return;
    }

    btn.classList.add('loading');
    btn.disabled = true;

    try {
      await registerUser(nick, pass);
      notify('Аккаунт создан!', 'success');
      updateUI();
      renderProfile();
    } catch (error) {
      err.textContent = error.message || 'Ошибка регистрации';
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

// ============================================================
// ПРОФИЛЬ ЗАЛОГИНЕННОГО
// ============================================================
function renderUserProfile(container) {
  const user = state.user;
  const { current } = getRank(user.elo);
  const wr = user.matches > 0 ? Math.round((user.wins / user.matches) * 100) : 0;

  container.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="title-icon">👤</span> Настройки
          </div>
        </div>
        <label>Никнейм</label>
        <input type="text" id="profileName" value="${user.name}">
        <button class="btn btn-primary btn-block" onclick="updateProfile()">
          <span class="btn-icon-inner">💾</span> СОХРАНИТЬ
        </button>
        <button class="btn btn-danger btn-block" onclick="logout()" style="margin-top:12px;">
          <span class="btn-icon-inner">🚪</span> ВЫЙТИ ИЗ АККАУНТА
        </button>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span class="title-icon">📊</span> Статистика
          </div>
        </div>
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:3rem; filter: drop-shadow(0 0 20px ${current.color});">${current.icon}</div>
          <div style="font-size:1.3rem; font-weight:bold; color:${current.color}; margin-top:8px;">
            ${current.name}
          </div>
        </div>
        <div class="stat-row">
          <span>Elo:</span>
          <span>${user.elo}</span>
        </div>
        <div class="stat-row">
          <span>Матчей:</span>
          <span>${user.matches}</span>
        </div>
        <div class="stat-row">
          <span>Побед:</span>
          <span style="color:var(--green)">${user.wins}</span>
        </div>
        <div class="stat-row">
          <span>Поражений:</span>
          <span style="color:var(--red)">${user.losses}</span>
        </div>
        <div class="stat-row">
          <span>Winrate:</span>
          <span>${wr}%</span>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ОБНОВИТЬ НИКНЕЙМ
// ============================================================
async function updateProfile() {
  if (!state.user) return;

  const newName = document.getElementById('profileName').value.trim();

  if (newName.length < 3) {
    notify('Ник минимум 3 символа', 'error');
    return;
  }

  try {
    await API.updateNickname(newName);
    state.user.name = newName;
    updateUI();
    renderProfile();
    notify('Профиль сохранён!', 'success');
  } catch (e) {
    notify(e.message, 'error');
  }
}