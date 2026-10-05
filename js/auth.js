// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================

function loginUser(nickname) {
  if (!nickname || nickname.length < 3) {
    notify('Ник минимум 3 символа', 'error');
    return false;
  }
  const existing = Storage.load();
  if (existing && existing.user && existing.user.name === nickname) {
    Storage.saveSession(existing.user);
    notify('С возвращением, ' + nickname + '!', 'success');
    return true;
  }
  const newUser = {
    name: nickname,
    elo: CONFIG.START_ELO,
    matches: 0, wins: 0, losses: 0,
    eloHistory: [CONFIG.START_ELO],
    createdAt: Date.now(),
  };
  Storage.save({ user: newUser, leaderboard: [] });
  Storage.saveSession(newUser);
  notify('Аккаунт создан!', 'success');
  return true;
}

function logout() {
  Storage.clearSession();
  notify('Вы вышли');
  setTimeout(() => location.reload(), 500);
}

function requireAuth() {
  const session = Storage.loadSession();
  if (!session) {
    const name = prompt('Введите ваш никнейм (мин. 3 символа):');
    if (name) return loginUser(name.trim());
    return false;
  }
  return true;
}