// ============================================================
// РЕАЛЬНЫЙ ОНЛАЙН — пингер + счётчик
// ============================================================

let onlineState = {
  pingTimer: null,
  updateTimer: null,
  pingInterval: 30,     // секунд (получим от сервера)
  updateInterval: 15,   // как часто обновлять счётчик
  lastPing: 0,
};

// ============================================================
// СТАРТ — вызывается из initApp
// ============================================================
function startOnlineTracking() {
  // Не отправляем пинг для гостя
  if (!state.user) {
    updateOnlineCounter(); // только счётчик
    return;
  }

  // Первый пинг сразу
  sendPing();

  // Запускаем периодические пинги
  startPingTimer();

  // Запускаем обновление счётчика
  startCounterTimer();

  // Пинг при возврате на вкладку
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.user) {
      sendPing();
    }
  });

  // Пинг при закрытии (best-effort)
  window.addEventListener('beforeunload', () => {
    if (state.user && API.token) {
      navigator.sendBeacon('/api/online/leave', '');
    }
  });
}

// ============================================================
// ПИНГ — отметить себя онлайн
// ============================================================
async function sendPing() {
  if (!state.user) return;

  try {
    const res = await API.request('/online/ping', { method: 'POST' });
    onlineState.lastPing = Date.now();

    if (res && res.next_ping_in) {
      onlineState.pingInterval = res.next_ping_in;
    }
  } catch (e) {
    // Тихо игнорируем — пинг не критичен
    console.warn('Ping error:', e.message);
  }
}

// ============================================================
// ТАЙМЕР ПИНГОВ
// ============================================================
function startPingTimer() {
  stopPingTimer();

  onlineState.pingTimer = setInterval(() => {
    if (!state.user) return;
    sendPing();
  }, onlineState.pingInterval * 1000);
}

function stopPingTimer() {
  if (onlineState.pingTimer) {
    clearInterval(onlineState.pingTimer);
    onlineState.pingTimer = null;
  }
}

// ============================================================
// ТАЙМЕР ОБНОВЛЕНИЯ СЧЁТЧИКА
// ============================================================
function startCounterTimer() {
  stopCounterTimer();

  // Обновляем сразу
  updateOnlineCounter();

  onlineState.updateTimer = setInterval(() => {
    updateOnlineCounter();
  }, onlineState.updateInterval * 1000);
}

function stopCounterTimer() {
  if (onlineState.updateTimer) {
    clearInterval(onlineState.updateTimer);
    onlineState.updateTimer = null;
  }
}

// ============================================================
// ОБНОВИТЬ СЧЁТЧИК ОНЛАЙНА
// ============================================================
async function updateOnlineCounter() {
  try {
    // Публичный endpoint — без токена
    const res = await fetch('/api/online/count');
    const data = await res.json();

    if (data && typeof data.online === 'number') {
      setOnlineCount(data.online);
    }
  } catch (e) {
    // Оставляем старое значение
  }
}

// ============================================================
// ОТОБРАЗИТЬ ЧИСЛО
// ============================================================
function setOnlineCount(count) {
  const el = document.getElementById('onlineCount');
  if (!el) return;

  // Форматируем: 12847 → 12 847
  const formatted = String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const prev = el.textContent;
  el.textContent = formatted;

  // Анимация «подпрыгивания», если число изменилось
  if (prev !== formatted) {
    el.style.transition = 'transform 0.3s, color 0.3s';
    el.style.transform = 'scale(1.3)';
    el.style.color = 'var(--accent-2)';

    setTimeout(() => {
      el.style.transform = 'scale(1)';
      el.style.color = '';
    }, 300);
  }
}

// ============================================================
// ОСТАНОВИТЬ (при logout)
// ============================================================
function stopOnlineTracking() {
  stopPingTimer();
  stopCounterTimer();

  if (state.user && API.token) {
    API.request('/online/leave', { method: 'POST' }).catch(() => {});
  }
}