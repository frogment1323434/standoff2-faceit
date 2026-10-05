// ============================================================
// ЭКРАН ОТПРАВКИ СКРИНШОТА + ИЗМЕНЕНИЕ ELO
// Только реальные игроки + система калибровки
// ============================================================

let screenshotState = {
  active: false,
  matchData: null,
  file: null,
  uploadedPlayers: {},
  autoTimer: null,
  resolved: false,
};

// ============================================================
// СТАРТ — после матча
// ============================================================
function startScreenshotPhase(matchData) {
  screenshotState = {
    active: true,
    matchData: matchData,
    file: null,
    uploadedPlayers: {},
    autoTimer: null,
    resolved: false,
  };

  showMatchEndedBanner();

  setTimeout(() => {
    const banner = document.querySelector('.match-ended-banner');
    if (banner) {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 500);
    }

    showScreenshotTransition(() => {
      renderScreenshotScreen();
    });
  }, 3200);
}

// ============================================================
// БАННЕР «МАТЧ ЗАВЕРШЁН»
// ============================================================
function showMatchEndedBanner() {
  let banner = document.querySelector('.match-ended-banner');
  if (banner) banner.remove();

  banner = document.createElement('div');
  banner.className = 'match-ended-banner';
  banner.innerHTML =
    '<div class="match-ended-icon">📸</div>' +
    '<div class="match-ended-title">МАТЧ ЗАВЕРШЁН</div>' +
    '<div class="match-ended-text">' +
      'Чтобы начислить <strong>Elo</strong>, нужно прислать <strong>скриншот</strong> матча.' +
    '</div>' +
    '<div class="match-ended-hint">' +
      '⏳ Переход к загрузке через 3 секунды...' +
    '</div>';
  document.body.appendChild(banner);

  setTimeout(() => banner.classList.add('show'), 100);
}

// ============================================================
// ПЛАВНЫЙ ПЕРЕХОД
// ============================================================
function showScreenshotTransition(onComplete) {
  let overlay = document.getElementById('screenshotTransition');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'screenshotTransition';
  overlay.className = 'transition-overlay';
  overlay.innerHTML =
    '<div class="transition-content">' +
      '<div class="transition-icon" style="font-size:6rem;">📸</div>' +
      '<div class="transition-title">ЗАГРУЗКА СКРИНА</div>' +
      '<div class="transition-sub">ПОДГОТОВКА ЭКРАНА...</div>' +
      '<div class="transition-dots">' +
        '<span class="transition-dot"></span>' +
        '<span class="transition-dot"></span>' +
        '<span class="transition-dot"></span>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  setTimeout(() => overlay.classList.add('active'), 50);

  setTimeout(() => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      if (typeof onComplete === 'function') onComplete();
    }, 500);
  }, 1800);
}

// ============================================================
// РЕНДЕР ЭКРАНА СКРИНШОТА
// ============================================================
function renderScreenshotScreen() {
  const players = state.lobby.players || [];
  const match = screenshotState.matchData;

  let page = document.getElementById('page-screenshot');
  if (!page) {
    page = document.createElement('div');
    page.id = 'page-screenshot';
    page.className = 'page';
    const container = document.querySelector('.container');
    if (container) container.appendChild(page);
  }

  page.innerHTML =
    '<div class="screenshot-screen">' +
      '<div class="screenshot-header">' +
        '<h1>📸 ОТПРАВЬ СКРИНШОТ</h1>' +
        '<div class="screenshot-sub">' +
          'Карта: <strong>' + (match.map ? match.map.name : 'Unknown') + '</strong>' +
          ' • Результат: <strong>' +
          (match.result === 'win' ? '🏆 Победа' : '💀 Поражение') +
          '</strong>' +
        '</div>' +
      '</div>' +

      '<div class="screenshot-container">' +

        '<div class="upload-zone" id="uploadZone">' +
          renderUploadZoneContent() +
        '</div>' +

        '<div class="screenshot-side">' +

          '<div class="screenshot-progress-card">' +
            '<div class="screenshot-progress-title">ЗАГРУЗИЛИ СКРИН</div>' +
            '<div class="screenshot-progress-value">' +
              '<span id="uploadedCount">1</span>' +
              '<small>/ ' + players.length + '</small>' +
            '</div>' +
            '<div class="screenshot-progress-bar">' +
              '<div class="screenshot-progress-fill" id="uploadProgressFill"></div>' +
            '</div>' +
          '</div>' +

          '<div class="screenshot-players-card">' +
            '<div class="screenshot-players-header">' +
              '<span>👥</span> ИГРОКИ' +
            '</div>' +
            '<div class="screenshot-players-list" id="screenshotPlayersList"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  page.classList.add('active');

  const nav = document.querySelector('.hud-nav');
  if (nav) nav.style.display = 'none';

  screenshotState.uploadedPlayers[state.user.name] = true;

  setupUploadZone();
  renderScreenshotPlayers();
  updateScreenshotProgress();

  // Авто-расчёт через 30 секунд
  screenshotState.autoTimer = setTimeout(() => {
    if (!screenshotState.resolved) {
      console.log('⏰ Время вышло — автоматический расчёт Elo');
      resolveElo();
    }
  }, 30000);
}

// ============================================================
// СОДЕРЖИМОЕ ЗОНЫ ЗАГРУЗКИ
// ============================================================
function renderUploadZoneContent() {
  if (!screenshotState.file) {
    return '<div class="upload-preview">' +
      '<div class="upload-icon">📸</div>' +
      '<div class="upload-title">Загрузи скриншот</div>' +
      '<div class="upload-hint">' +
        'Перетащи файл сюда или нажми кнопку ниже<br>' +
        'Форматы: <strong>PNG, JPG</strong> • Максимум 5 МБ' +
      '</div>' +
      '<button class="upload-btn" onclick="document.getElementById(\'screenshotFileInput\').click()">' +
        '📁 ВЫБРАТЬ ФАЙЛ' +
      '</button>' +
      '<input type="file" id="screenshotFileInput" accept="image/*" style="display:none;">' +
    '</div>';
  }

  return '<div class="upload-preview">' +
    '<img src="' + screenshotState.file + '" alt="Скриншот матча">' +
    '<div class="upload-preview-info">' +
      '<span class="check">✅</span>' +
      'Скриншот готов к отправке' +
    '</div>' +
    '<div class="upload-actions">' +
      '<button class="upload-replace" onclick="replaceScreenshot()">🔄 Заменить</button>' +
      '<button class="upload-submit" onclick="submitScreenshot()">✅ ОТПРАВИТЬ</button>' +
    '</div>' +
  '</div>';
}

// ============================================================
// НАСТРОЙКА ЗОНЫ ЗАГРУЗКИ
// ============================================================
function setupUploadZone() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;

  const input = document.getElementById('screenshotFileInput');

  zone.addEventListener('click', (e) => {
    if (e.target.closest('.upload-btn') || e.target.closest('.upload-actions')) return;
    if (screenshotState.file) return;
    const inp = document.getElementById('screenshotFileInput');
    if (inp) inp.click();
  });

  if (input) {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileSelect(file);
    });
  }

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    } else {
      notify('Только изображения (PNG, JPG)', 'error');
    }
  });
}

// ============================================================
// ОБРАБОТКА ФАЙЛА
// ============================================================
function handleFileSelect(file) {
  if (file.size > 5 * 1024 * 1024) {
    notify('Файл слишком большой (макс 5 МБ)', 'error');
    return;
  }

  if (!file.type.startsWith('image/')) {
    notify('Только изображения', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    screenshotState.file = e.target.result;

    const zone = document.getElementById('uploadZone');
    if (zone) {
      zone.classList.add('has-file');
      zone.innerHTML = renderUploadZoneContent();
    }

    notify('Скриншот загружен, нажми «Отправить»', 'success');
  };
  reader.readAsDataURL(file);
}

// ============================================================
// ЗАМЕНИТЬ СКРИНШОТ
// ============================================================
function replaceScreenshot() {
  screenshotState.file = null;
  const zone = document.getElementById('uploadZone');
  if (zone) {
    zone.classList.remove('has-file');
    zone.innerHTML = renderUploadZoneContent();
    setupUploadZone();
  }
}

// ============================================================
// ОТПРАВИТЬ СКРИНШОТ
// ============================================================
function submitScreenshot() {
  if (!screenshotState.file) {
    notify('Сначала загрузи скриншот', 'warning');
    return;
  }

  if (screenshotState.uploadedPlayers[state.user.name]) {
    notify('Ты уже отправил скриншот', 'warning');
    return;
  }

  screenshotState.uploadedPlayers[state.user.name] = true;

  const zone = document.getElementById('uploadZone');
  if (zone) {
    zone.innerHTML =
      '<div class="upload-preview">' +
        '<div class="upload-icon" style="font-size:6rem;">✅</div>' +
        '<div class="upload-title" style="color:var(--green);">СКРИНШОТ ОТПРАВЛЕН</div>' +
        '<div class="upload-hint">' +
          'Обработка результата...' +
        '</div>' +
      '</div>';
  }

  notify('✅ Скриншот отправлен!', 'success');

  renderScreenshotPlayers();
  updateScreenshotProgress();

  setTimeout(() => resolveElo(), 1500);
}

// ============================================================
// СПИСОК ИГРОКОВ
// ============================================================
function renderScreenshotPlayers() {
  const container = document.getElementById('screenshotPlayersList');
  if (!container) return;

  const players = state.lobby.players || [];

  container.innerHTML = players.map(p => {
    const uploaded = screenshotState.uploadedPlayers[p.name];
    return '<div class="screenshot-player ' +
      (uploaded ? 'uploaded ' : '') +
      (p.isUser ? 'is-me' : '') +
      '">' +
      '<div class="screenshot-player-avatar">' + p.name[0].toUpperCase() + '</div>' +
      '<div class="screenshot-player-name">' +
        (p.isUser ? '👉 ' : '') + p.name +
      '</div>' +
      '<div class="screenshot-player-status">' +
        (uploaded ? '✅' : '⏳') +
      '</div>' +
    '</div>';
  }).join('');
}

// ============================================================
// ОБНОВИТЬ ПРОГРЕСС
// ============================================================
function updateScreenshotProgress() {
  const count = Object.keys(screenshotState.uploadedPlayers).length;
  const total = (state.lobby.players || []).length;

  const countEl = document.getElementById('uploadedCount');
  const fillEl = document.getElementById('uploadProgressFill');

  if (countEl) countEl.textContent = count;
  if (fillEl) {
    fillEl.style.width = (total > 0 ? (count / total) * 100 : 0) + '%';
  }
}

// ============================================================
// РАСЧЁТ ELO
// ============================================================
function resolveElo() {
  if (screenshotState.resolved) return;
  screenshotState.resolved = true;
  screenshotState.active = false;

  if (screenshotState.autoTimer) {
    clearTimeout(screenshotState.autoTimer);
    screenshotState.autoTimer = null;
  }

  const match = screenshotState.matchData;
  if (!match) {
    console.error('Нет данных матча');
    return;
  }

  const eloBefore = match.eloBefore;
  const change = match.change;

  state.user.elo = Math.max(0, state.user.elo + change);
  state.user.matches = (state.user.matches || 0) + 1;
  if (match.result === 'win') state.user.wins = (state.user.wins || 0) + 1;
  else state.user.losses = (state.user.losses || 0) + 1;
  state.user.eloHistory.push(state.user.elo);

  updateLeaderboardWithUser();
  updateUI();

  showEloResultModal(eloBefore, state.user.elo, change);
}

// ============================================================
// МОДАЛКА С ИЗМЕНЕНИЕМ ELO (с калибровкой)
// ============================================================
function showEloResultModal(eloBefore, eloAfter, change) {
  const modal = document.createElement('div');
  modal.className = 'elo-result-modal';
  modal.id = 'eloResultModal';

  const changeStr = change > 0 ? '+' + change : String(change);
  const changeClass = change > 0 ? 'positive' : 'negative';
  const isWin = screenshotState.matchData.result === 'win';

  const matchesPlayed = state.user.matches || 0;
  const calibrating = matchesPlayed < CONFIG.CALIBRATION_MATCHES;
  const justFinished = matchesPlayed === CONFIG.CALIBRATION_MATCHES;

  let mainContent = '';

  // ============================================================
  // ИДЁТ КАЛИБРОВКА (1-9 матчей)
  // ============================================================
  if (calibrating) {
    const progressPercent = Math.round((matchesPlayed / CONFIG.CALIBRATION_MATCHES) * 100);
    const matchesLeft = CONFIG.CALIBRATION_MATCHES - matchesPlayed;

    mainContent =
      '<div class="elo-result-icon">🎯</div>' +
      '<div class="elo-result-title">КАЛИБРОВКА</div>' +

      '<div style="font-size:1.1rem;color:var(--text-secondary);margin-bottom:20px;">' +
        'Матч <strong style="color:var(--accent-2);">' + matchesPlayed + '</strong>' +
        ' из <strong>' + CONFIG.CALIBRATION_MATCHES + '</strong>' +
      '</div>' +

      '<div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:20px;margin-bottom:16px;">' +
        '<div style="font-size:0.8rem;color:var(--text-muted);letter-spacing:2px;margin-bottom:12px;text-transform:uppercase;font-weight:700;">' +
          'ПРОГРЕСС КАЛИБРОВКИ' +
        '</div>' +

        '<div style="height:10px;background:rgba(0,0,0,0.5);border-radius:5px;overflow:hidden;margin-bottom:12px;">' +
          '<div style="height:100%;background:linear-gradient(90deg, var(--accent), var(--accent-2));border-radius:5px;width:' +
            progressPercent + '%;transition:width 0.8s;box-shadow:0 0 15px var(--accent);"></div>' +
        '</div>' +

        '<div style="display:flex;justify-content:space-between;font-size:0.9rem;">' +
          '<span style="color:var(--accent-2);font-weight:700;">' +
            '✅ ' + matchesPlayed + ' сыграно' +
          '</span>' +
          '<span style="color:var(--text-muted);font-weight:700;">' +
            '⏳ ' + matchesLeft + ' осталось' +
          '</span>' +
        '</div>' +
      '</div>' +

      '<div style="color:var(--text-muted);font-size:0.9rem;line-height:1.6;">' +
        'Сыграй ещё <strong style="color:var(--accent-2);">' + matchesLeft + '</strong> ' +
        (matchesLeft === 1 ? 'матч' : matchesLeft < 5 ? 'матча' : 'матчей') +
        ', чтобы получить уровень <strong style="color:var(--accent-2);">1-10</strong>' +
      '</div>';
  }

  // ============================================================
  // ТОЛЬКО ЧТО ЗАВЕРШИЛ КАЛИБРОВКУ (10-й матч)
  // ============================================================
  else if (justFinished) {
    const level = getCalibrationLevel(eloAfter);

    mainContent =
      '<div class="elo-result-icon">🏆</div>' +
      '<div class="elo-result-title">КАЛИБРОВКА ЗАВЕРШЕНА!</div>' +

      '<div style="margin:24px 0;padding:28px 24px;background:linear-gradient(135deg, ' +
        level.color + '22, ' + level.color + '05);border:2px solid ' + level.color +
        ';border-radius:18px;animation:pulseGlow 2s infinite;">' +

        '<div style="font-size:4.5rem;margin-bottom:14px;filter:drop-shadow(0 0 30px ' + level.color + ');">' +
          level.icon +
        '</div>' +

        '<div style="font-family:Orbitron,sans-serif;font-size:0.85rem;letter-spacing:3px;color:var(--text-muted);margin-bottom:8px;">' +
          'ТВОЙ УРОВЕНЬ' +
        '</div>' +

        '<div style="font-family:Orbitron,sans-serif;font-size:3rem;font-weight:900;color:' +
          level.color + ';text-shadow:0 0 30px ' + level.color + ';margin-bottom:8px;">' +
          level.level +
        '</div>' +

        '<div style="font-size:1.3rem;color:' + level.color + ';font-weight:700;letter-spacing:1px;margin-bottom:16px;">' +
          level.name +
        '</div>' +

        '<div style="padding-top:16px;border-top:1px solid ' + level.color + '40;">' +
          '<div style="font-size:0.75rem;color:var(--text-muted);letter-spacing:2px;margin-bottom:6px;">' +
            'ФИНАЛЬНЫЙ ELO' +
          '</div>' +
          '<div style="font-family:Orbitron,sans-serif;font-size:2rem;font-weight:900;color:var(--accent-2);text-shadow:0 0 20px var(--accent-2);">' +
            eloAfter +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div style="color:var(--text-muted);font-size:0.9rem;">' +
        'С этого момента твои матчи влияют на Elo напрямую' +
      '</div>';
  }

  // ============================================================
  // ОБЫЧНЫЙ МАТЧ (после калибровки)
  // ============================================================
  else {
    const rankBefore = getRank(eloBefore).current;
    const rankAfter = getRank(eloAfter).current;

    let rankHTML = '';
    if (rankBefore.name !== rankAfter.name) {
      const up = eloAfter > eloBefore;
      rankHTML = '<div class="elo-result-rank ' + (up ? 'up' : 'down') + '">' +
        (up ? '⬆️ Повышение ранга!' : '⬇️ Понижение ранга!') + '<br>' +
        '<span style="color:' + rankAfter.color + ';font-size:1.1rem;">' +
          rankAfter.icon + ' ' + rankAfter.name +
        '</span>' +
      '</div>';
    }

    mainContent =
      '<div class="elo-result-icon">' + (isWin ? '🏆' : '💀') + '</div>' +
      '<div class="elo-result-title">' + (isWin ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ') + '</div>' +

      '<div class="elo-result-row">' +
        '<div class="elo-result-box">' +
          '<div class="elo-result-box-label">БЫЛО</div>' +
          '<div class="elo-result-box-value">' + eloBefore + '</div>' +
        '</div>' +
        '<div class="elo-result-arrow">→</div>' +
        '<div class="elo-result-box">' +
          '<div class="elo-result-box-label">СТАЛО</div>' +
          '<div class="elo-result-box-value" style="color:var(--accent-2);">' + eloAfter + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="elo-result-change ' + changeClass + '">' + changeStr + ' Elo</div>' +

      '<div style="color:var(--text-muted);font-size:0.9rem;margin-bottom:8px;">' +
        'Ранг: <strong style="color:' + rankAfter.color + ';">' + rankAfter.icon + ' ' + rankAfter.name + '</strong>' +
      '</div>' +

      rankHTML;
  }

  modal.innerHTML =
    '<div class="elo-result-content">' +
      mainContent +
      '<button class="elo-result-btn" onclick="closeEloModal()">ПРОДОЛЖИТЬ</button>' +
    '</div>';

  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('show'), 100);
}

// ============================================================
// ЗАКРЫТИЕ МОДАЛКИ
// ============================================================
function closeEloModal() {
  const modal = document.getElementById('eloResultModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 500);
  }

  screenshotState = {
    active: false,
    matchData: null,
    file: null,
    uploadedPlayers: {},
    autoTimer: null,
    resolved: false,
  };

  state.lobby.active = false;
  state.lobby.players = [];
  state.lobby.teamT = [];
  state.lobby.teamCT = [];
  state.lobby.selectedMap = null;
  state.lobby.matchId = null;

  const nav = document.querySelector('.hud-nav');
  if (nav) nav.style.display = '';

  switchPage('home');
}

// ============================================================
// ЗАГЛУШКИ (для совместимости)
// ============================================================
function scheduleBotUploads() {
  // Ботов нет
}

function allPlayersUploaded() {
  const players = state.lobby.players || [];
  return players.every(p => screenshotState.uploadedPlayers[p.name]);
}