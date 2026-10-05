// ============================================================
// ЭКРАН КАРТЫ + ЧАТ ПЕРЕД МАТЧЕМ
// Только реальные игроки — ботов нет
// ============================================================

let mapRoom = {
  active: false,
  map: null,
  messages: [],
  chatInput: null,
  lobbyCreated: false,
  host: null,
  botChatTimers: [],
};

// ============================================================
// СТАРТ — плавный переход на экран карты
// ============================================================
function enterMapRoom(winnerMap) {
  mapRoom = {
    active: true,
    map: winnerMap,
    messages: [],
    chatInput: null,
    lobbyCreated: false,
    host: null,
    botChatTimers: [],
  };

  const banners = document.querySelectorAll('.voting-result-banner');
  banners.forEach(b => {
    b.classList.remove('show');
    setTimeout(() => b.remove(), 500);
  });

  showMapRoomTransition(winnerMap, () => {
    renderMapRoom();
  });
}

// ============================================================
// ПЛАВНЫЙ ПЕРЕХОД
// ============================================================
function showMapRoomTransition(map, onComplete) {
  let overlay = document.getElementById('mapTransitionOverlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'mapTransitionOverlay';
  overlay.className = 'transition-overlay';
  overlay.innerHTML =
    '<div class="transition-content">' +
      '<div class="transition-icon" style="font-size:6rem;">' + map.icon + '</div>' +
      '<div class="transition-title">' + map.name.toUpperCase() + '</div>' +
      '<div class="transition-sub">ЗАГРУЗКА КАРТЫ...</div>' +
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
  }, 2200);
}

// ============================================================
// РЕНДЕР ЭКРАНА КАРТЫ
// ============================================================
function renderMapRoom() {
  const map = mapRoom.map;

  let page = document.getElementById('page-map-room');
  if (!page) {
    page = document.createElement('div');
    page.id = 'page-map-room';
    page.className = 'page';
    const container = document.querySelector('.container');
    if (container) container.appendChild(page);
  }

  const teamT = state.lobby.teamT || [];
  const teamCT = state.lobby.teamCT || [];

  page.innerHTML =
    '<div class="map-room">' +

      // ЛЕВАЯ ЧАСТЬ
      '<div class="map-room-preview">' +
        '<div class="map-preview-big" style="background: linear-gradient(135deg, ' +
          getMapGradient(map.id) + ');">' +
          '<div class="map-preview-icon">' + map.icon + '</div>' +
          '<div class="map-preview-info">' +
            '<div class="map-preview-label">ВЫБРАННАЯ КАРТА</div>' +
            '<div class="map-preview-title">' + map.name + '</div>' +
            '<div class="map-preview-desc">' + (map.desc || '') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="map-room-teams">' +
          '<div class="map-team map-team-t">' +
            '<div class="map-team-header">' +
              '<span class="map-team-icon">💣</span>' +
              '<h4>ТЕРРОРИСТЫ</h4>' +
              '<span style="font-size:0.75rem;color:var(--text-muted);">' + teamT.length + '</span>' +
            '</div>' +
            '<div class="map-team-players">' +
              (teamT.length
                ? teamT.map(p => renderMapPlayerMini(p)).join('')
                : '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px;">Никого</div>') +
            '</div>' +
          '</div>' +

          '<div class="map-vs-mini">VS</div>' +

          '<div class="map-team map-team-ct">' +
            '<div class="map-team-header">' +
              '<span class="map-team-icon">🛡</span>' +
              '<h4>СПЕЦНАЗ</h4>' +
              '<span style="font-size:0.75rem;color:var(--text-muted);">' + teamCT.length + '</span>' +
            '</div>' +
            '<div class="map-team-players">' +
              (teamCT.length
                ? teamCT.map(p => renderMapPlayerMini(p)).join('')
                : '<div style="color:var(--text-muted);font-size:0.85rem;padding:8px;">Никого</div>') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // ПРАВАЯ ЧАСТЬ — ЧАТ + КНОПКА
      '<div class="map-room-side">' +

        '<div class="map-chat">' +
          '<div class="map-chat-header">' +
            '<div class="map-chat-title">' +
              '<span class="chat-online-dot"></span>' +
              '💬 ЧАТ ЛОББИ' +
            '</div>' +
            '<span style="font-size:0.75rem;color:var(--text-muted);">' +
              (state.lobby.players.length) + ' онлайн' +
            '</span>' +
          '</div>' +
          '<div class="map-chat-messages" id="mapChatMessages"></div>' +
          '<div class="map-chat-input">' +
            '<input type="text" id="mapChatInput" placeholder="Напиши сообщение..." maxlength="100" autocomplete="off">' +
            '<button onclick="sendMapChatMessage()">➤</button>' +
          '</div>' +
        '</div>' +

        '<div class="map-create-block">' +
          '<div class="map-create-status" id="mapCreateStatus">' +
            '⏳ Ожидание создания лобби...' +
          '</div>' +
          '<button class="map-create-btn" id="mapCreateBtn" onclick="createStandoffLobby()">' +
            '<span style="font-size:1.3rem;">🎮</span>' +
            ' СОЗДАТЬ ЛОББИ В STANDOFF 2' +
          '</button>' +
          '<div class="map-create-hint">' +
            'Один из игроков создаёт лобби и приглашает остальных' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  page.classList.add('active');

  const nav = document.querySelector('.hud-nav');
  if (nav) nav.style.display = 'none';

  const input = document.getElementById('mapChatInput');
  if (input) {
    input.focus();
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMapChatMessage();
      }
    });
  }

  addSystemMessage('Карта ' + map.name + ' выбрана. Обсудите, кто создаст лобби!');
}

// ============================================================
// МИНИ-КАРТОЧКА ИГРОКА
// ============================================================
function renderMapPlayerMini(p) {
  return '<div class="map-player-mini' + (p.isUser ? ' is-me' : '') + '">' +
    '<div class="map-player-avatar">' + p.name[0].toUpperCase() + '</div>' +
    '<span>' + (p.isUser ? '👉 ' : '') + p.name + '</span>' +
    '</div>';
}

// ============================================================
// ГРАДИЕНТ ДЛЯ КАРТЫ
// ============================================================
function getMapGradient(mapId) {
  const gradients = {
    breeze:    '#5bc0de 0%, #2a6496 100%',
    dune:      '#ffcc66 0%, #cc8844 100%',
    hanami:    '#ff99cc 0%, #cc3388 100%',
    prison:    '#888888 0%, #333333 100%',
    province:  '#99cc99 0%, #447744 100%',
    rust:      '#cc8844 0%, #663300 100%',
    sandstone: '#ddbb88 0%, #886644 100%',
    mirage:    '#ffaa00 0%, #cc6600 100%',
    dust2:     '#e0a050 0%, #8b5a2b 100%',
    inferno:   '#ff5500 0%, #cc2200 100%',
    train:     '#88a0c0 0%, #404860 100%',
    overpass:  '#00d4ff 0%, #0066a0 100%'
  };
  return gradients[mapId] || '#ff5500 0%, #cc2200 100%';
}

// ============================================================
// ЧАТ — ОТПРАВКА
// ============================================================
function sendMapChatMessage() {
  const input = document.getElementById('mapChatInput');
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  addMyMessage(text);
  input.value = '';

  // Ботов нет — никто не отвечает
}

// ============================================================
// ДОБАВЛЕНИЕ СООБЩЕНИЙ
// ============================================================
function addMyMessage(text) {
  mapRoom.messages.push({
    author: state.user.name,
    text: text,
    isMe: true,
    isSystem: false,
    time: new Date()
  });
  renderMapChatMessages();
}

function addSystemMessage(text) {
  mapRoom.messages.push({
    author: 'system',
    text: text,
    isMe: false,
    isSystem: true,
    time: new Date()
  });
  renderMapChatMessages();
}

// ============================================================
// РЕНДЕР СООБЩЕНИЙ
// ============================================================
function renderMapChatMessages() {
  const container = document.getElementById('mapChatMessages');
  if (!container) return;

  container.innerHTML = mapRoom.messages.map(msg => {
    if (msg.isSystem) {
      return '<div class="chat-message is-system">' + msg.text + '</div>';
    }

    const time = msg.time.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return '<div class="chat-message ' + (msg.isMe ? 'is-me' : '') + '">' +
      '<div class="chat-msg-author">' + msg.author + '</div>' +
      '<div class="chat-msg-text">' + escapeHtml(msg.text) + '</div>' +
      '<div class="chat-msg-time">' + time + '</div>' +
      '</div>';
  }).join('');

  container.scrollTop = container.scrollHeight;
}

// ============================================================
// ЗАЩИТА ОТ XSS
// ============================================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// СОЗДАНИЕ ЛОББИ (игрок)
// ============================================================
function createStandoffLobby() {
  if (mapRoom.lobbyCreated) return;

  mapRoom.lobbyCreated = true;
  mapRoom.host = state.user.name;

  const btn = document.getElementById('mapCreateBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span style="font-size:1.3rem;">✅</span> ЛОББИ СОЗДАНО';
  }

  const status = document.getElementById('mapCreateStatus');
  if (status) {
    status.textContent = '🎮 Ты создал лобби!';
    status.classList.add('host-me');
  }

  addSystemMessage('🎮 ' + state.user.name + ' создал лобби в Standoff 2!');

  showLobbyCreatedBanner(state.user.name);

  // Через 3 секунды — стартуем матч
  setTimeout(() => {
    mapRoom.active = false;

    const banner = document.querySelector('.map-lobby-created');
    if (banner) banner.remove();

    const nav = document.querySelector('.hud-nav');
    if (nav) nav.style.display = '';

    playMatch(mapRoom.map);
  }, 3000);
}

// ============================================================
// БАННЕР «ЛОББИ СОЗДАНО»
// ============================================================
function showLobbyCreatedBanner(hostName) {
  let banner = document.querySelector('.map-lobby-created');
  if (banner) banner.remove();

  banner = document.createElement('div');
  banner.className = 'map-lobby-created';
  banner.innerHTML =
    '<div class="lobby-created-icon">🎮</div>' +
    '<div class="lobby-created-title">ЛОББИ СОЗДАНО</div>' +
    '<div class="lobby-created-host">Хост: <strong>' + hostName + '</strong></div>' +
    '<div class="lobby-created-host" style="margin-top:8px;font-size:0.85rem;">' +
      'Матч начинается через 3 секунды...' +
    '</div>';
  document.body.appendChild(banner);

  setTimeout(() => banner.classList.add('show'), 100);
}

// ============================================================
// ЗАГЛУШКИ (для совместимости с voting.js)
// ============================================================
function scheduleBotHostIfIdle() {
  // Ботов нет — никто не создаст лобби за тебя
}