// ============================================================
// МАТЧМЕЙКИНГ ПО ELO (глобальный поиск)
// ============================================================

let mmState = {
  searching: false,
  pollTimer: null,
  statusTimer: null,
  startTime: null,
  matchId: null,
};

// ============================================================
// КНОПКА «НАЙТИ МАТЧ»
// ============================================================
function toggleMatchmaking() {
  if (!state.user) {
    if (typeof openAuthModal === 'function') {
      openAuthModal(() => toggleMatchmaking());
    } else {
      notify('Войдите в аккаунт', 'warning');
      switchPage('profile');
    }
    return;
  }

  if (mmState.searching) {
    stopMatchmaking(true);
  } else {
    startMatchmaking();
  }
}

// ============================================================
// НАЧАТЬ ПОИСК
// ============================================================
async function startMatchmaking() {
  if (mmState.searching) return;

  mmState.searching = true;
  mmState.startTime = Date.now();
  mmState.matchId = null;

  const btn = document.getElementById('mmButton');
  const status = document.getElementById('mmStatus');
  const loader = document.getElementById('mmLoader');

  if (btn) {
    btn.textContent = '❌ ОТМЕНИТЬ ПОИСК';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-danger');
  }

  if (status) {
    status.textContent = 'Поиск игроков...';
    status.classList.add('searching');
  }

  if (loader) loader.classList.add('show');

  notify('Поиск матча (Elo ±200)...', 'info');

  try {
    const data = await API.request('/matchmaking/search', { method: 'POST' });

    if (data.status === 'matched') {
      handleMatchFound(data.match_id, data.opponent);
      return;
    }

    // Ищем дальше — поллинг
    startMatchStatusPolling();
    startSearchTimer();

  } catch (e) {
    notify('Ошибка поиска: ' + e.message, 'error');
    stopMatchmaking(false);
  }
}

// ============================================================
// ПОЛЛИНГ СТАТУСА
// ============================================================
function startMatchStatusPolling() {
  stopMatchStatusPolling();

  mmState.pollTimer = setInterval(async () => {
    if (!mmState.searching) return;

    try {
      const data = await API.request('/matchmaking/status');

      if (data.status === 'matched') {
        handleMatchFound(data.match_id, data.opponent);
        return;
      }

      if (data.status === 'timeout') {
        notify('Никто не найден. Попробуй позже.', 'warning');
        stopMatchmaking(false);
        return;
      }
    } catch (e) {
      console.warn('Ошибка статуса:', e.message);
    }
  }, 2000);
}

function stopMatchStatusPolling() {
  if (mmState.pollTimer) {
    clearInterval(mmState.pollTimer);
    mmState.pollTimer = null;
  }
}

// ============================================================
// ТАЙМЕР ПОИСКА (показывает сколько идёт)
// ============================================================
function startSearchTimer() {
  stopSearchTimer();

  const status = document.getElementById('mmStatus');

  mmState.statusTimer = setInterval(() => {
    if (!mmState.searching) return;

    const elapsed = Math.floor((Date.now() - mmState.startTime) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;

    if (status) {
      const timeStr = min > 0
        ? min + ':' + (sec < 10 ? '0' : '') + sec
        : sec + ' сек';
      status.textContent = 'Поиск... (' + timeStr + ')';
    }
  }, 1000);
}

function stopSearchTimer() {
  if (mmState.statusTimer) {
    clearInterval(mmState.statusTimer);
    mmState.statusTimer = null;
  }
}

// ============================================================
// МАТЧ НАЙДЕН!
// ============================================================
function handleMatchFound(matchId, opponent) {
  mmState.matchId = matchId;
  stopMatchmaking(false);

  console.log('⚔️ Матч найден!', opponent);

  notify('Матч найден! Соперник: ' + opponent.nickname + ' (' + opponent.elo + ' Elo)', 'success');

  // Показываем баннер с соперником
  showMatchFoundBanner(opponent, () => {
    // Заполняем лобби — я и соперник
    state.lobby.active = true;
    state.lobby.players = [
      {
        id: state.user.id,
        name: state.user.name,
        elo: state.user.elo,
        isUser: true,
        isBot: false,
        ready: true,
        team: 'T',
        side: '💣',
      },
      {
        id: opponent.id,
        name: opponent.nickname,
        elo: opponent.elo,
        isUser: false,
        isBot: false,
        ready: true,
        team: 'CT',
        side: '🛡',
      }
    ];
    state.lobby.teamT = [state.lobby.players[0]];
    state.lobby.teamCT = [state.lobby.players[1]];
    state.lobby.matchId = matchId;

    // Переход к голосованию
    startVoting();
  });
}

// ============================================================
// БАННЕР «МАТЧ НАЙДЕН»
// ============================================================
function showMatchFoundBanner(opponent, onComplete) {
  let banner = document.getElementById('matchFoundBanner');
  if (banner) banner.remove();

  banner = document.createElement('div');
  banner.id = 'matchFoundBanner';
  banner.className = 'match-found-banner';
  banner.innerHTML =
    '<div class="match-found-content">' +
      '<div class="match-found-title">⚔️ МАТЧ НАЙДЕН!</div>' +
      '<div class="match-found-vs">' +
        '<div class="match-found-player">' +
          '<div class="match-found-avatar">' + state.user.name[0].toUpperCase() + '</div>' +
          '<div class="match-found-name">' + state.user.name + '</div>' +
          '<div class="match-found-elo">' + state.user.elo + ' Elo</div>' +
        '</div>' +
        '<div class="match-found-vs-text">VS</div>' +
        '<div class="match-found-player">' +
          '<div class="match-found-avatar opponent">' + opponent.nickname[0].toUpperCase() + '</div>' +
          '<div class="match-found-name">' + opponent.nickname + '</div>' +
          '<div class="match-found-elo">' + opponent.elo + ' Elo</div>' +
        '</div>' +
      '</div>' +
      '<div class="match-found-hint">Переход к выбору карты...</div>' +
    '</div>';

  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('show'), 100);

  setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => {
      banner.remove();
      if (typeof onComplete === 'function') onComplete();
    }, 500);
  }, 2500);
}

// ============================================================
// ОСТАНОВИТЬ ПОИСК
// ============================================================
async function stopMatchmaking(cancelOnServer) {
  mmState.searching = false;

  stopMatchStatusPolling();
  stopSearchTimer();

  const btn = document.getElementById('mmButton');
  const status = document.getElementById('mmStatus');
  const loader = document.getElementById('mmLoader');

  if (btn) {
    btn.textContent = '🔍 НАЙТИ МАТЧ';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
  }

  if (status) {
    status.textContent = 'Готов к поиску';
    status.classList.remove('searching');
  }

  if (loader) loader.classList.remove('show');

  if (cancelOnServer) {
    try {
      await API.request('/matchmaking/cancel', { method: 'POST' });
      notify('Поиск отменён', 'info');
    } catch (e) {}
  }
}