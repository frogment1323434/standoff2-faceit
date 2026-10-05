// ============================================================
// ГОЛОСОВАНИЕ ЗА КАРТУ STANDOFF 2
// Только реальные игроки
// ============================================================

const MAPS = [
  { id: 'breeze',    name: 'Breeze',    desc: 'Open • Mid control', icon: '🌊' },
  { id: 'dune',      name: 'Dune',      desc: 'Desert • Long range', icon: '🏜' },
  { id: 'hanami',    name: 'Hanami',    desc: 'Japan • Tight',       icon: '🌸' },
  { id: 'prison',    name: 'Prison',    desc: 'Close • Corridors',   icon: '🔒' },
  { id: 'province',  name: 'Province',  desc: 'Village • Balanced',  icon: '🏘' },
  { id: 'rust',      name: 'Rust',      desc: 'Industrial • Dusty',  icon: '⚙️' },
  { id: 'sandstone', name: 'Sandstone', desc: 'Ancient • CT-sided',  icon: '🏛' }
];

const VOTE_TIME = 20;

let votingState = {
  active: false,
  selectedMap: null,
  votes: {},
  timer: null,
  timeLeft: VOTE_TIME,
  players: [],
  resolved: false,
};

// ============================================================
// СТАРТ ГОЛОСОВАНИЯ
// ============================================================
function startVoting() {
  const allPlayers = [
    ...(state.lobby.teamT || []),
    ...(state.lobby.teamCT || [])
  ];

  votingState = {
    active: true,
    selectedMap: null,
    votes: {},
    timer: null,
    timeLeft: VOTE_TIME,
    players: allPlayers,
    resolved: false,
  };

  MAPS.forEach(map => { votingState.votes[map.id] = []; });

  showTransitionThenVoting();
}

// ============================================================
// ПЛАВНЫЙ ПЕРЕХОД
// ============================================================
function showTransitionThenVoting() {
  let overlay = document.getElementById('transitionOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'transitionOverlay';
    overlay.className = 'transition-overlay';
    overlay.innerHTML =
      '<div class="transition-content">' +
        '<div class="transition-icon">🗺</div>' +
        '<div class="transition-title">ГОЛОСОВАНИЕ</div>' +
        '<div class="transition-sub">ПЕРЕХОД К ВЫБОРУ КАРТЫ</div>' +
        '<div class="transition-dots">' +
          '<span class="transition-dot"></span>' +
          '<span class="transition-dot"></span>' +
          '<span class="transition-dot"></span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  setTimeout(() => overlay.classList.add('active'), 50);

  setTimeout(() => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      renderVotingScreen();
    }, 500);
  }, 1800);
}

// ============================================================
// РЕНДЕР ЭКРАНА ГОЛОСОВАНИЯ
// ============================================================
function renderVotingScreen() {
  let page = document.getElementById('page-voting');
  if (!page) {
    page = document.createElement('div');
    page.id = 'page-voting';
    page.className = 'page';
    const container = document.querySelector('.container');
    if (container) container.appendChild(page);
  }

  page.innerHTML =
    '<div class="voting-screen">' +
      '<div class="voting-header">' +
        '<h1>ВЫБОР КАРТЫ</h1>' +
        '<div class="voting-subtitle">Проголосуй за карту для матча</div>' +
      '</div>' +

      '<div class="voting-timer" id="votingTimer">' +
        '<div class="timer-circle" id="timerCircle">' +
          '<svg viewBox="0 0 54 54">' +
            '<circle class="circle-bg" cx="27" cy="27" r="24"></circle>' +
            '<circle class="circle-progress" id="timerProgress" cx="27" cy="27" r="24" ' +
              'stroke-dasharray="150.8" stroke-dashoffset="0"></circle>' +
          '</svg>' +
          '<div class="timer-value" id="timerValue">' + VOTE_TIME + '</div>' +
        '</div>' +
        '<div class="timer-label">ДО КОНЦА ГОЛОСОВАНИЯ</div>' +
      '</div>' +

      '<div class="maps-grid" id="mapsGrid">' +
        MAPS.map(map =>
          '<div class="map-card" data-map="' + map.id + '" onclick="voteForMap(\'' + map.id + '\')">' +
            '<div class="map-preview ' + map.id + '">' +
              '<span class="map-icon">' + map.icon + '</span>' +
              '<div class="map-votes" id="votes-' + map.id + '">0</div>' +
            '</div>' +
            '<div class="map-info">' +
              '<div class="map-name">' + map.name + '</div>' +
              '<div class="map-desc">' + map.desc + '</div>' +
            '</div>' +
            '<div class="map-vote-bar">' +
              '<div class="map-vote-bar-fill" id="bar-' + map.id + '"></div>' +
            '</div>' +
          '</div>'
        ).join('') +
      '</div>' +

      '<div class="voting-footer">' +
        '<div class="voting-status">' +
          '<div class="status-icon">⏳</div>' +
          '<div class="status-text">' +
            '<strong id="votingStatusText">Ожидание голосов...</strong>' +
            '<span id="votingStatusSub">0 / ' + votingState.players.length + ' проголосовали</span>' +
          '</div>' +
        '</div>' +
        '<div class="voting-players" id="votingPlayers"></div>' +
      '</div>' +
    '</div>';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  page.classList.add('active');

  const nav = document.querySelector('.hud-nav');
  if (nav) nav.style.display = 'none';

  renderVotingPlayerDots();
  startVoteTimer();
}

// ============================================================
// ТОЧКИ ИГРОКОВ
// ============================================================
function renderVotingPlayerDots() {
  const container = document.getElementById('votingPlayers');
  if (!container) return;

  container.innerHTML = votingState.players.map((p, i) =>
    '<div class="voting-player-dot' +
      (p.isUser ? ' is-me' : '') +
      '" id="votedot-' + i + '" title="' + p.name + '">' +
      p.name[0].toUpperCase() +
    '</div>'
  ).join('');
}

// ============================================================
// ТАЙМЕР
// ============================================================
function startVoteTimer() {
  updateTimerUI();

  votingState.timer = setInterval(() => {
    votingState.timeLeft--;
    updateTimerUI();

    if (votingState.timeLeft <= 5) {
      const timer = document.getElementById('votingTimer');
      const circle = document.getElementById('timerCircle');
      if (timer) timer.classList.add('warning');
      if (circle) circle.classList.add('warning');
    }

    if (votingState.timeLeft <= 0) {
      clearInterval(votingState.timer);
      resolveVoting();
      return;
    }

    const totalVoted = Object.values(votingState.votes).reduce((s, arr) => s + arr.length, 0);

    // Все проголосовали → ускоряем
    if (votingState.players.length >= 2 && totalVoted >= votingState.players.length && !votingState.resolved) {
      votingState.resolved = true;
      clearInterval(votingState.timer);
      setTimeout(resolveVoting, 800);
    }
  }, 1000);
}

function updateTimerUI() {
  const value = document.getElementById('timerValue');
  const progress = document.getElementById('timerProgress');

  if (value) value.textContent = votingState.timeLeft;

  if (progress) {
    const total = 150.8;
    const offset = total * (1 - votingState.timeLeft / VOTE_TIME);
    progress.setAttribute('stroke-dashoffset', offset);
  }
}

// ============================================================
// ГОЛОС ИГРОКА
// ============================================================
function voteForMap(mapId) {
  if (!votingState.active || votingState.resolved) return;

  const myIndex = votingState.players.findIndex(p => p.isUser);
  if (myIndex === -1) return;

  const alreadyVoted = Object.values(votingState.votes).some(arr => arr.includes(myIndex));
  if (alreadyVoted) {
    notify('Ты уже проголосовал', 'warning');
    return;
  }

  document.querySelectorAll('.map-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector('.map-card[data-map="' + mapId + '"]');
  if (card) card.classList.add('selected');

  votingState.selectedMap = mapId;
  addVote(mapId, myIndex);

  const map = MAPS.find(m => m.id === mapId);
  notify('Голос за ' + map.name, 'success');
}

// ============================================================
// ДОБАВИТЬ ГОЛОС
// ============================================================
function addVote(mapId, playerIndex) {
  if (!votingState.votes[mapId]) votingState.votes[mapId] = [];
  if (votingState.votes[mapId].includes(playerIndex)) return;

  votingState.votes[mapId].push(playerIndex);

  updateVoteUI();

  const dot = document.getElementById('votedot-' + playerIndex);
  if (dot) dot.classList.add('voted');

  const totalVoted = Object.values(votingState.votes).reduce((s, arr) => s + arr.length, 0);
  if (votingState.players.length >= 2 &&
      totalVoted >= votingState.players.length &&
      !votingState.resolved) {
    votingState.resolved = true;
    setTimeout(resolveVoting, 800);
  }
}

// ============================================================
// ОБНОВИТЬ UI
// ============================================================
function updateVoteUI() {
  const totalVoted = Object.values(votingState.votes).reduce((s, arr) => s + arr.length, 0);

  MAPS.forEach(map => {
    const count = (votingState.votes[map.id] || []).length;
    const votesEl = document.getElementById('votes-' + map.id);
    const barEl = document.getElementById('bar-' + map.id);

    if (votesEl) {
      const prev = parseInt(votesEl.textContent) || 0;
      votesEl.textContent = count;

      if (count > prev) {
        votesEl.classList.add('bump');
        setTimeout(() => votesEl.classList.remove('bump'), 500);
      }

      if (count > 0) votesEl.classList.add('has-votes');
      else votesEl.classList.remove('has-votes');
    }

    if (barEl) {
      const percent = votingState.players.length > 0
        ? (count / votingState.players.length) * 100
        : 0;
      barEl.style.width = percent + '%';
    }
  });

  const statusText = document.getElementById('votingStatusText');
  const statusSub = document.getElementById('votingStatusSub');

  if (statusText && statusSub) {
    statusSub.textContent = totalVoted + ' / ' + votingState.players.length + ' проголосовали';
    statusText.textContent = totalVoted >= votingState.players.length
      ? 'Все проголосовали!'
      : 'Ожидание голосов...';
  }
}

// ============================================================
// ЗАВЕРШЕНИЕ ГОЛОСОВАНИЯ
// ============================================================
function resolveVoting() {
  if (!votingState.active && votingState.resolved) return;

  votingState.active = false;
  votingState.resolved = true;

  if (votingState.timer) {
    clearInterval(votingState.timer);
    votingState.timer = null;
  }

  let winner = null;
  let maxVotes = -1;
  let tiedMaps = [];

  MAPS.forEach(map => {
    const count = (votingState.votes[map.id] || []).length;
    if (count > maxVotes) {
      maxVotes = count;
      winner = map;
      tiedMaps = [map];
    } else if (count === maxVotes) {
      tiedMaps.push(map);
    }
  });

  if (maxVotes === 0 || !winner) {
    winner = MAPS[Math.floor(Math.random() * MAPS.length)];
  } else if (tiedMaps.length > 1) {
    winner = tiedMaps[Math.floor(Math.random() * tiedMaps.length)];
  }

  console.log('🗺 Голосование завершено. Победила карта:', winner.name, '(голосов:', maxVotes + ')');

  showVotingResult(winner);
}

// ============================================================
// ПОКАЗ РЕЗУЛЬТАТА
// ============================================================
function showVotingResult(winnerMap) {
  document.querySelectorAll('.map-card').forEach(card => {
    card.style.pointerEvents = 'none';
    if (card.dataset.map === winnerMap.id) {
      card.classList.add('selected');
    } else {
      card.style.opacity = '0.3';
      card.style.filter = 'grayscale(0.8)';
    }
  });

  const banner = document.createElement('div');
  banner.className = 'voting-result-banner';
  banner.innerHTML =
    '<div class="voting-result-icon">' + winnerMap.icon + '</div>' +
    '<div class="voting-result-label">КАРТА ВЫБРАНА</div>' +
    '<div class="voting-result-name">' + winnerMap.name + '</div>' +
    '<div class="voting-result-sub">Переход к лобби...</div>';
  document.body.appendChild(banner);

  setTimeout(() => banner.classList.add('show'), 100);

  setTimeout(() => {
    banner.classList.remove('show');
    setTimeout(() => {
      banner.remove();

      state.lobby.selectedMap = winnerMap;

      if (typeof enterMapRoom === 'function') {
        enterMapRoom(winnerMap);
      } else {
        playMatch(winnerMap);
      }
    }, 500);
  }, 2200);
}