// ============================================================
// ЛОББИ И МАТЧ — только реальные игроки, Elo через сервер
// ============================================================

function updateLobbyUI() {
  if (!state.lobby.active) return;

  const teamT = state.lobby.teamT || [];
  const teamCT = state.lobby.teamCT || [];

  const t1 = document.getElementById('team1');
  const t2 = document.getElementById('team2');
  if (t1) t1.innerHTML = teamT.map(playerSlotHTML).join('');
  if (t2) t2.innerHTML = teamCT.map(playerSlotHTML).join('');

  const avgT = teamT.length
    ? Math.round(teamT.reduce((s, p) => s + p.elo, 0) / teamT.length)
    : 0;
  const avgCT = teamCT.length
    ? Math.round(teamCT.reduce((s, p) => s + p.elo, 0) / teamCT.length)
    : 0;

  const avgTEl = document.getElementById('team1Avg');
  const avgCTEl = document.getElementById('team2Avg');
  if (avgTEl) avgTEl.textContent = '~' + avgT;
  if (avgCTEl) avgCTEl.textContent = '~' + avgCT;

  const readyCount = state.lobby.players.filter(p => p.ready).length;
  const total = state.lobby.players.length;

  const title = document.getElementById('lobbyTitle');
  const readyCountEl = document.getElementById('readyCount');

  if (title) title.textContent = 'Матч • ' + total + ' игроков';
  if (readyCountEl) readyCountEl.textContent = readyCount + ' / ' + total + ' готовы';
}

function playerSlotHTML(p) {
  if (!p) return '<div class="player-slot empty">Ожидание...</div>';

  const sideClass = p.team === 'T' ? 'slot-t' : 'slot-ct';
  const isUser = p.isUser ? ' is-user' : '';
  const readyClass = p.ready ? ' ready' : '';

  return '<div class="player-slot ' + sideClass + isUser + readyClass + '">' +
    '<div class="avatar">' + p.name[0].toUpperCase() + '</div>' +
    '<div class="info">' +
      '<div class="name">' + (p.isUser ? '👉 ' : '') + p.name + '</div>' +
      '<div class="elo">' + p.elo + ' Elo</div>' +
    '</div>' +
    (p.ready
      ? '<span class="ready-badge">✅</span>'
      : '<span class="wait-badge">⏳</span>'
    ) +
    '</div>';
}

function playerReady() {
  notify('В матчмейкинге все готовы автоматически', 'info');
}

async function leaveLobby() {
  if (typeof stopMatchmaking === 'function') {
    stopMatchmaking(false);
  }
  if (typeof LobbyCode !== 'undefined' && LobbyCode.current) {
    await LobbyCode.close();
  }

  state.lobby.active = false;
  state.lobby.players = [];
  state.lobby.teamT = [];
  state.lobby.teamCT = [];
  state.lobby.selectedMap = null;
  state.lobby.matchId = null;

  switchPage('play');
  notify('Вы покинули матч', 'error');
}

// ============================================================
// СТАРТ МАТЧА (после голосования за карту)
// ============================================================
function playMatch(selectedMap) {
  if (!selectedMap) {
    if (typeof startVoting === 'function') {
      startVoting();
    } else {
      playMatch({ name: 'Unknown', icon: '🗺' });
    }
    return;
  }

  const teamT = state.lobby.teamT || [];
  const teamCT = state.lobby.teamCT || [];

  if (!teamT.length || !teamCT.length) {
    notify('Недостаточно игроков в командах', 'error');
    leaveLobby();
    return;
  }

  state.lobby.selectedMap = selectedMap;

  const avgT = teamT.reduce((s, p) => s + p.elo, 0) / teamT.length;
  const avgCT = teamCT.reduce((s, p) => s + p.elo, 0) / teamCT.length;

  const expectedT = getExpectedScore(avgT, avgCT);
  const tWins = Math.random() < expectedT;

  const user = state.lobby.players.find(p => p.isUser);
  const userInT = user.team === 'T';
  const userWon = (userInT && tWins) || (!userInT && !tWins);

  const result = userWon ? 'win' : 'lose';
  const enemyAvg = userInT ? avgCT : avgT;

  const change = calculateEloChange(state.user.elo, Math.round(enemyAvg), result);
  const eloBefore = state.user.elo;

  // Отправляем результат на сервер (обновляет Elo у обоих игроков)
  if (state.lobby.matchId) {
    API.request('/matchmaking/report', {
      method: 'POST',
      body: JSON.stringify({
        match_id: state.lobby.matchId,
        result: result,
      })
    }).then(res => {
      console.log('✅ Elo обновлён на сервере:', res);
      state.user.elo = res.new_elo;
      state.user.matches = (state.user.matches || 0) + 1;
      if (userWon) state.user.wins = (state.user.wins || 0) + 1;
      else state.user.losses = (state.user.losses || 0) + 1;
      state.user.eloHistory.push(state.user.elo);
      updateUI();
    }).catch(e => {
      console.warn('⚠️ Ошибка отчёта на сервер:', e.message);
    });
  } else {
    // Fallback: локальный расчёт
    console.warn('⚠️ Нет matchId — Elo применяется только локально');
    state.user.elo = Math.max(0, state.user.elo + change);
    state.user.matches++;
    if (userWon) state.user.wins++; else state.user.losses++;
    state.user.eloHistory.push(state.user.elo);
  }

  // Запускаем фазу скриншота
  if (typeof startScreenshotPhase === 'function') {
    startScreenshotPhase({
      result: result,
      eloBefore: eloBefore,
      change: change,
      tWins: tWins,
      userInT: userInT,
      map: selectedMap,
    });
  } else {
    // Fallback: сразу показываем результат
    showMatchResult(result, change, eloBefore, tWins, userInT);
    updateLeaderboardWithUser();
  }
}

// ============================================================
// МОДАЛКА РЕЗУЛЬТАТА МАТЧА
// ============================================================
function showMatchResult(result, change, eloBefore, tWins, userInT) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modalContent');

  const matchesPlayed = state.user.matches || 0;
  const calibrating = matchesPlayed < CONFIG.CALIBRATION_MATCHES;
  const justFinishedCalibration = matchesPlayed === CONFIG.CALIBRATION_MATCHES;

  const rankBefore = getRank(eloBefore).current;
  const rankAfter = getRank(state.user.elo).current;
  const changeStr = change > 0 ? '+' + change : String(change);
  const changeClass = change > 0 ? 'positive' : 'negative';
  const isWin = result === 'win';

  const mapInfo = state.lobby.selectedMap || { name: 'Unknown', icon: '🗺' };
  const winnerSide = tWins ? '💣 ТЕРРОРИСТЫ' : '🛡 СПЕЦНАЗ';
  const winnerClass = tWins ? 'win-t' : 'win-ct';

  let rankHTML = '';

  if (calibrating) {
    // Идёт калибровка
    rankHTML = '<div style="margin-top:15px;padding:14px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.3);border-radius:10px;">' +
      '<div style="font-size:0.85rem;color:var(--text-muted);letter-spacing:1.5px;margin-bottom:8px;">КАЛИБРОВКА</div>' +
      '<div style="font-family:Orbitron,sans-serif;font-size:1.6rem;color:var(--accent-2);">' +
        matchesPlayed + ' / ' + CONFIG.CALIBRATION_MATCHES +
      '</div>' +
      '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:8px;">' +
        'Осталось: ' + (CONFIG.CALIBRATION_MATCHES - matchesPlayed) + ' матчей' +
      '</div>' +
      '</div>';
  } else if (justFinishedCalibration) {
    // Только что закончил калибровку
    const level = getCalibrationLevel(state.user.elo);
    rankHTML = '<div style="margin-top:20px;padding:20px;background:linear-gradient(135deg, ' + level.color + '22, ' + level.color + '08);border:2px solid ' + level.color + ';border-radius:14px;text-align:center;">' +
      '<div style="font-size:0.85rem;color:var(--text-muted);letter-spacing:2px;margin-bottom:10px;">КАЛИБРОВКА ЗАВЕРШЕНА</div>' +
      '<div style="font-size:3rem;margin-bottom:8px;">' + level.icon + '</div>' +
      '<div style="font-family:Orbitron,sans-serif;font-size:2rem;font-weight:900;color:' + level.color + ';margin-bottom:6px;">УРОВЕНЬ ' + level.level + '</div>' +
      '<div style="font-size:1rem;color:' + level.color + ';font-weight:700;">' + level.name + '</div>' +
      '<div style="font-family:Orbitron,sans-serif;font-size:1.3rem;color:var(--accent-2);margin-top:12px;">' + state.user.elo + ' Elo</div>' +
      '</div>';
  } else if (rankBefore.name !== rankAfter.name) {
    // Обычные матчи — повышение/понижение
    const up = state.user.elo > eloBefore;
    rankHTML = '<div style="margin-top:15px;padding:12px;background:' +
      (up ? 'rgba(0,214,143,0.15)' : 'rgba(255,61,113,0.15)') +
      ';border-radius:8px;font-weight:bold;">' +
      (up ? '⬆️ Повышение ранга!' : '⬇️ Понижение ранга!') + '<br>' +
      '<span style="color:' + rankAfter.color + '">' + rankAfter.icon + ' ' + rankAfter.name + '</span>' +
      '</div>';
  }

  const eloSection = calibrating
    ? '<div style="color:var(--text-muted); margin:12px 0;">Elo скрыт до конца калибровки</div>'
    : '<div class="elo-change ' + changeClass + '">' + changeStr + ' Elo</div>' +
      '<div style="color:var(--text-muted);">Новый Elo: <strong style="color:var(--text)">' +
        state.user.elo + '</strong></div>';

  content.innerHTML =
    '<h2>' + (isWin ? '🏆 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ') + '</h2>' +
    '<div class="match-map-info">' +
      '<span class="match-map-icon">' + mapInfo.icon + '</span>' +
      '<span class="match-map-name">КАРТА: ' + mapInfo.name.toUpperCase() + '</span>' +
    '</div>' +
    '<div class="result-side ' + winnerClass + '">' +
      'Победа: <strong>' + winnerSide + '</strong>' +
    '</div>' +
    '<div class="result-big ' + (isWin ? 'result-win' : 'result-lose') + '">' +
      (isWin ? 'WIN' : 'LOSE') +
    '</div>' +
    '<div style="color:var(--text-muted); margin-bottom:12px;">' +
      'Ты играл за: <strong style="color:' +
      (userInT ? 'var(--accent-2)' : 'var(--cyan)') + '">' +
      (userInT ? '💣 Террористы' : '🛡 Спецназ') +
      '</strong>' +
    '</div>' +
    eloSection +
    rankHTML +
    '<button class="btn btn-primary btn-block" style="margin-top:20px;" onclick="closeMatchModal()">ПРОДОЛЖИТЬ</button>';

  modal.classList.add('show');

  // Очищаем лобби
  state.lobby.active = false;
  state.lobby.players = [];
  state.lobby.teamT = [];
  state.lobby.teamCT = [];
  state.lobby.selectedMap = null;
  state.lobby.matchId = null;

  updateUI();
}

// ============================================================
// ЗАКРЫТИЕ МОДАЛКИ
// ============================================================
function closeMatchModal() {
  document.getElementById('modal').classList.remove('show');
  switchPage('home');
}

// ============================================================
// ОБНОВЛЕНИЕ ЛИДЕРБОРДА
// ============================================================
function updateLeaderboardWithUser() {
  const idx = state.leaderboard.findIndex(p => p.name === state.user.name);
  const entry = {
    name: state.user.name,
    elo: state.user.elo,
    matches: state.user.matches,
    wins: state.user.wins,
  };
  if (idx >= 0) state.leaderboard[idx] = entry;
  else state.leaderboard.push(entry);
  state.leaderboard.sort((a, b) => b.elo - a.elo);
  saveState();
}