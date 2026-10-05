// ============================================================
// АВТОРИЗАЦИЯ ЧЕРЕЗ API
// ============================================================

// ============================================================
// Проверка: залогинен ли пользователь
// ============================================================
async function checkAuth() {
  const token = API.loadToken();

  if (!token) {
    return null; // не залогинен
  }

  try {
    const { user, history } = await API.getMe();
    return {
      id: user.id,
      name: user.nickname,
      elo: user.elo,
      matches: user.matches,
      wins: user.wins,
      losses: user.losses,
      eloHistory: history.map(h => h.elo),
    };
  } catch (e) {
    // Токен невалиден — очищаем
    API.setToken(null);
    return null;
  }
}

// ============================================================
// ВХОД
// ============================================================
async function loginUser(nickname, password) {
  const { token, user } = await API.login(nickname, password);
  API.setToken(token);

  // Подтягиваем историю Elo
  let history = [];
  try {
    const me = await API.getMe();
    history = me.history.map(h => h.elo);
  } catch (e) {}

  state.user = {
    id: user.id,
    name: user.nickname,
    elo: user.elo,
    matches: user.matches,
    wins: user.wins,
    losses: user.losses,
    eloHistory: history.length ? history : [user.elo],
  };

  return true;
}

// ============================================================
// РЕГИСТРАЦИЯ
// ============================================================
async function registerUser(nickname, password) {
  const { token, user } = await API.register(nickname, password);
  API.setToken(token);

  state.user = {
    id: user.id,
    name: user.nickname,
    elo: user.elo,
    matches: user.matches || 0,
    wins: user.wins || 0,
    losses: user.losses || 0,
    eloHistory: [user.elo],
  };

  return true;
}

// ============================================================
// ВЫХОД
// ============================================================
async function logout() {
  // 🆕 Останавливаем отслеживание онлайна
  if (typeof stopOnlineTracking === 'function') {
    try {
      stopOnlineTracking();
    } catch (e) {
      console.warn('Ошибка остановки онлайна:', e.message);
    }
  }

  // Останавливаем другие фоновые процессы
  if (typeof stopMatchmaking === 'function') {
    try {
      stopMatchmaking(false);
    } catch (e) {}
  }

  if (typeof LobbyCode !== 'undefined' && LobbyCode && LobbyCode.current) {
    try {
      await LobbyCode.close();
    } catch (e) {}
  }

  // Выходим с сервера
  try {
    await API.logout();
  } catch (e) {}

  // Очищаем токен
  API.setToken(null);

  // Сбрасываем state
  state.user = null;
  state.lobby.active = false;
  state.lobby.players = [];
  state.lobby.teamT = [];
  state.lobby.teamCT = [];
  state.lobby.selectedMap = null;
  state.lobby.matchId = null;

  notify('Вы вышли из аккаунта');

  // Перезагружаем страницу
  setTimeout(() => location.reload(), 500);
}