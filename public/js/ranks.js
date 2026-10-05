// ============================================================
// СИСТЕМА РАНГОВ STANDOFF 2
// ============================================================

const RANKS = [
  { name: 'Серебро I',    elo: 0,    color: '#a0a0a0', icon: '🥈' },
  { name: 'Серебро II',   elo: 800,  color: '#b0b0b0', icon: '🥈' },
  { name: 'Серебро III',  elo: 1000, color: '#c0c0c0', icon: '🥈' },
  { name: 'Серебро IV',   elo: 1150, color: '#d0d0d0', icon: '🥈' },
  { name: 'Золото I',     elo: 1300, color: '#ffd700', icon: '🥇' },
  { name: 'Золото II',    elo: 1450, color: '#ffc800', icon: '🥇' },
  { name: 'Золото III',   elo: 1600, color: '#ffb800', icon: '🥇' },
  { name: 'Золото IV',    elo: 1750, color: '#ffa800', icon: '🥇' },
  { name: 'Мастер I',     elo: 1900, color: '#4da6ff', icon: '💠' },
  { name: 'Мастер II',    elo: 2050, color: '#3d8cff', icon: '💠' },
  { name: 'Мастер III',   elo: 2200, color: '#2d72ff', icon: '💠' },
  { name: 'Мастер IV',    elo: 2350, color: '#1d58ff', icon: '💠' },
  { name: 'Легенда I',    elo: 2500, color: '#9d4dff', icon: '🔥' },
  { name: 'Легенда II',   elo: 2700, color: '#8d3dff', icon: '🔥' },
  { name: 'Легенда III',  elo: 2900, color: '#7d2dff', icon: '🔥' },
  { name: 'Легенда IV',   elo: 3100, color: '#6d1dff', icon: '🔥' },
  { name: 'Бог Войны',    elo: 3400, color: '#ff2d55', icon: '👑' },
  { name: 'Топ-500',      elo: 3700, color: '#ff0044', icon: '⭐' },
];

function getRank(elo) {
  let current = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) {
    if (elo >= RANKS[i].elo) {
      current = RANKS[i];
      next = RANKS[i + 1] || null;
    }
  }
  return { current, next };
}

function renderRanks() {
  const list = document.getElementById('ranksList');
  if (!list) return;
  list.innerHTML = RANKS.map((rank, i) => {
    const next = RANKS[i + 1];
    const range = next ? rank.elo + ' – ' + (next.elo - 1) : rank.elo + '+';
    return '<div class="rank-item" style="border-color:' + rank.color + '">' +
      '<div><div class="rank-name" style="color:' + rank.color + '">' +
      rank.icon + ' ' + rank.name + '</div>' +
      '<div class="rank-elo">' + range + ' Elo</div></div>' +
      '</div>';
  }).join('');
}

// ============================================================
// УРОВЕНЬ КАЛИБРОВКИ (1-10)
// ============================================================
function getCalibrationLevel(elo) {
  for (const level of CALIBRATION_LEVELS) {
    if (elo >= level.minElo && elo <= level.maxElo) {
      return level;
    }
  }
  // Если Elo выше 3000
  return CALIBRATION_LEVELS[CALIBRATION_LEVELS.length - 1];
}

// ============================================================
// ПРОВЕРКА — ИДЁТ ЛИ КАЛИБРОВКА
// ============================================================
function isInCalibration(user) {
  if (!user) return false;
  const matches = user.matches || 0;
  return matches < CONFIG.CALIBRATION_MATCHES;
}

// ============================================================
// ОСТАЛОСЬ МАТЧЕЙ ДО КОНЦА КАЛИБРОВКИ
// ============================================================
function matchesLeftToCalibrate(user) {
  if (!user) return CONFIG.CALIBRATION_MATCHES;
  const played = user.matches || 0;
  return Math.max(0, CONFIG.CALIBRATION_MATCHES - played);
}