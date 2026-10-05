// ============================================================
// ГЛАВНЫЙ МОДУЛЬ ПРИЛОЖЕНИЯ
// ============================================================

let state = {
  user: null,
  matchmaking: { searching: false, timer: null },
  lobby: { active: false, players: [], teamT: [], teamCT: [], timer: null, timeLeft: 20, selectedMap: null, matchId: null },
  leaderboard: [],
};

async function initApp() {
  const user = await checkAuth();
  if (user) {
    state.user = user;
  }

  const stored = Storage.load();
  state.leaderboard = (stored && stored.leaderboard && stored.leaderboard.length)
    ? stored.leaderboard
    : generateFakeLeaderboard();

  updateUI();
  switchPage('home');
  setupTabs();

  // 🆕 Запускаем отслеживание реального онлайна
  if (typeof startOnlineTracking === 'function') {
    startOnlineTracking();
  } else {
    console.warn('⚠️ startOnlineTracking не найдена — онлайн не отслеживается');
  }

  console.log('%c⚔️ SO2 FACEIT запущен', 'color: #ff5500; font-size: 16px; font-weight: bold;');
  if (state.user) {
    console.log('Игрок:', state.user.name, '| Elo:', state.user.elo, '| Матчей:', state.user.matches);
  } else {
    console.log('Гость (не авторизован)');
  }
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchPage(tab.dataset.page));
  });
}

function switchPage(page) {
  if (!state.user && (page === 'play' || page === 'lobby')) {
    if (typeof openAuthModal === 'function') {
      openAuthModal(() => switchPage(page));
    } else {
      notify('Войдите в аккаунт', 'warning');
      page = 'profile';
    }
    if (page !== 'profile') return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  const tabEl = document.querySelector('.tab[data-page="' + page + '"]');

  if (pageEl) pageEl.classList.add('active');
  if (tabEl) tabEl.classList.add('active');

  if (page === 'lobby' && state.lobby.active && typeof updateLobbyUI === 'function') {
    updateLobbyUI();
  }
  if (page === 'leaderboard' && typeof renderLeaderboard === 'function') {
    renderLeaderboard();
  }
  if (page === 'ranks' && typeof renderRanks === 'function') {
    renderRanks();
  }
  if (page === 'profile' && typeof renderProfile === 'function') {
    renderProfile();
  }
}

// ============================================================
// ОБНОВЛЕНИЕ UI
// ============================================================
function updateUI() {
  // ============================================================
  // ГОСТЬ
  // ============================================================
  if (!state.user) {
    setText('userName', 'Гость');
    setText('userElo', 'Не авторизован');
    setText('userAvatar', '?');
    setText('welcomeName', 'Гость');
    setText('playElo', '—');
    setText('statElo', '—');
    setText('statRank', 'Не авторизован');
    setText('statMatches', '0');
    setText('statWinrate', '0%');

    const calibBlock = document.getElementById('calibrationBlock');
    if (calibBlock) calibBlock.remove();

    return;
  }

  // ============================================================
  // ИДЁТ КАЛИБРОВКА?
  // ============================================================
  const calibrating = isInCalibration(state.user);
  const matchesPlayed = state.user.matches || 0;
  const matchesLeft = matchesLeftToCalibrate(state.user);

  if (calibrating) {
    setText('userName', state.user.name);
    setText('userElo', 'Калибровка ' + matchesPlayed + '/' + CONFIG.CALIBRATION_MATCHES);
    setText('userAvatar', state.user.name[0].toUpperCase());
    setText('welcomeName', state.user.name);

    setText('playElo', '—');
    setText('statElo', '???');
    setText('statRank', 'Калибровка ' + matchesPlayed + '/' + CONFIG.CALIBRATION_MATCHES);
    setText('statMatches', matchesPlayed);

    const rankEl = document.getElementById('statRank');
    if (rankEl) rankEl.style.color = 'var(--accent-2)';

    const headerRankIcon = document.getElementById('headerRankIcon');
    if (headerRankIcon) headerRankIcon.textContent = '❓';

    const homeRankIcon = document.getElementById('homeRankIcon');
    if (homeRankIcon) homeRankIcon.textContent = '❓';

    const wr = matchesPlayed > 0
      ? Math.round(((state.user.wins || 0) / matchesPlayed) * 100) : 0;
    setText('statWinrate', wr + '%');

    renderCalibrationChart(matchesPlayed);
    renderCalibrationProgress(matchesPlayed);

    saveState();
    return;
  }

  // ============================================================
  // КАЛИБРОВКА ЗАВЕРШЕНА
  // ============================================================
  const { current } = getRank(state.user.elo);

  setText('userName', state.user.name);
  setText('userElo', state.user.elo + ' Elo');
  setText('userAvatar', state.user.name[0].toUpperCase());
  setText('welcomeName', state.user.name);
  setText('playElo', state.user.elo);

  setText('statElo', state.user.elo);
  setText('statRank', current.name);
  setText('statMatches', state.user.matches);

  const rankEl = document.getElementById('statRank');
  if (rankEl) rankEl.style.color = current.color;

  const headerRankIcon = document.getElementById('headerRankIcon');
  if (headerRankIcon) headerRankIcon.textContent = current.icon;

  const homeRankIcon = document.getElementById('homeRankIcon');
  if (homeRankIcon) homeRankIcon.textContent = current.icon;

  const wr = state.user.matches > 0
    ? Math.round((state.user.wins / state.user.matches) * 100) : 0;
  setText('statWinrate', wr + '%');

  const calibBlock = document.getElementById('calibrationBlock');
  if (calibBlock) calibBlock.remove();

  renderEloChart();
  saveState();
}

// ============================================================
// ПРОГРЕСС-БАР КАЛИБРОВКИ
// ============================================================
function renderCalibrationProgress(played) {
  let block = document.getElementById('calibrationBlock');
  const statsGrid = document.querySelector('.stats-grid');

  if (!statsGrid) return;

  if (!block) {
    block = document.createElement('div');
    block.id = 'calibrationBlock';
    block.className = 'calibration-block';
    statsGrid.parentNode.insertBefore(block, statsGrid);
  }

  const percent = Math.round((played / CONFIG.CALIBRATION_MATCHES) * 100);
  const left = CONFIG.CALIBRATION_MATCHES - played;

  block.innerHTML =
    '<div class="calibration-content">' +
      '<div class="calibration-icon">🎯</div>' +
      '<div class="calibration-info">' +
        '<div class="calibration-title">КАЛИБРОВКА</div>' +
        '<div class="calibration-sub">' +
          'Сыграно: <strong>' + played + ' / ' + CONFIG.CALIBRATION_MATCHES + '</strong>' +
          ' • Осталось: <strong>' + left + '</strong>' +
        '</div>' +
        '<div class="calibration-bar">' +
          '<div class="calibration-fill" style="width:' + percent + '%"></div>' +
        '</div>' +
        '<div class="calibration-hint">' +
          'Сыграй ещё ' + left + ' матчей, чтобы получить уровень (1-10)' +
        '</div>' +
      '</div>' +
    '</div>';
}

// ============================================================
// ГРАФИК КАЛИБРОВКИ (замазанный)
// ============================================================
function renderCalibrationChart(played) {
  const chart = document.getElementById('eloChart');
  if (!chart) return;

  const total = CONFIG.CALIBRATION_MATCHES;
  let html = '';

  for (let i = 0; i < total; i++) {
    if (i < played) {
      const height = 30 + Math.random() * 50;
      html += '<div style="flex:1;background:linear-gradient(to top,var(--accent),var(--accent-2));border-radius:3px 3px 0 0;height:' + height + '%;min-height:5px;opacity:0.6;position:relative;" title="Скрыто">' +
        '<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.7rem;color:rgba(0,0,0,0.5);font-weight:900;">?</span>' +
        '</div>';
    } else {
      html += '<div style="flex:1;background:rgba(255,255,255,0.05);border-radius:3px 3px 0 0;height:20%;min-height:5px;"></div>';
    }
  }

  chart.innerHTML = html;
}

// ============================================================
// ОБЫЧНЫЙ ГРАФИК ELO
// ============================================================
function renderEloChart() {
  const chart = document.getElementById('eloChart');
  if (!chart) return;

  if (!state.user) {
    chart.innerHTML = '<div style="color:var(--text-muted); margin:auto;">Войдите в аккаунт, чтобы увидеть прогресс</div>';
    return;
  }

  const history = state.user.eloHistory.slice(-30);
  if (!history.length) {
    chart.innerHTML = '<div style="color:var(--text-muted); margin:auto;">Нет данных</div>';
    return;
  }

  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;

  chart.innerHTML = history.map(elo => {
    const h = ((elo - min) / range) * 100 + 10;
    return '<div style="flex:1;background:linear-gradient(to top,var(--accent),var(--accent-2));border-radius:3px 3px 0 0;height:' + h + '%;min-height:5px;" title="' + elo + ' Elo"></div>';
  }).join('');
}

// ============================================================
// УТИЛИТЫ
// ============================================================
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function saveState() {
  if (!state.user) return;
  const stored = Storage.load() || {};
  stored.user = state.user;
  stored.leaderboard = state.leaderboard;
  Storage.save(stored);
}

function generateFakeLeaderboard() {
  const lb = [];
  for (let i = 0; i < 20; i++) {
    const matches = Math.floor(Math.random() * 500) + 50;
    lb.push({
      name: BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? i : ''),
      elo: 3000 - i * 80 + Math.floor(Math.random() * 50),
      matches: matches,
      wins: Math.floor(matches * (0.45 + Math.random() * 0.25)),
    });
  }
  return lb.sort((a, b) => b.elo - a.elo);
}

document.addEventListener('DOMContentLoaded', initApp);