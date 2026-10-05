// ============================================================
// КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
// ============================================================

const CONFIG = {
  K_FACTOR: 32,
  START_ELO: 1500,
  MATCH_SIZE: 5,
  LOBBY_TIME: 20,
  ELO_SEARCH_RANGE: 200,
  CALIBRATION_MATCHES: 10,       // 🆕 Первые 10 матчей — калибровка
  STORAGE_KEY: 'so2_faceit_data',
  SESSION_KEY: 'so2_faceit_session',
};

// ============================================================
// УРОВНИ КАЛИБРОВКИ (1-10)
// ============================================================
const CALIBRATION_LEVELS = [
  { level: 1,  minElo: 0,    maxElo: 799,   name: 'Серебро I',    icon: '🥈', color: '#a0a0a0' },
  { level: 2,  minElo: 800,  maxElo: 1099,  name: 'Серебро III',  icon: '🥈', color: '#c0c0c0' },
  { level: 3,  minElo: 1100, maxElo: 1349,  name: 'Золото I',     icon: '🥇', color: '#ffd700' },
  { level: 4,  minElo: 1350, maxElo: 1599,  name: 'Золото III',   icon: '🥇', color: '#ffb800' },
  { level: 5,  minElo: 1600, maxElo: 1849,  name: 'Мастер I',     icon: '💠', color: '#4da6ff' },
  { level: 6,  minElo: 1850, maxElo: 2099,  name: 'Мастер III',   icon: '💠', color: '#2d72ff' },
  { level: 7,  minElo: 2100, maxElo: 2349,  name: 'Легенда I',    icon: '🔥', color: '#9d4dff' },
  { level: 8,  minElo: 2350, maxElo: 2649,  name: 'Легенда III',  icon: '🔥', color: '#7d2dff' },
  { level: 9,  minElo: 2650, maxElo: 2999,  name: 'Бог Войны',    icon: '👑', color: '#ff2d55' },
  { level: 10, minElo: 3000, maxElo: 9999,  name: 'Топ-500',      icon: '⭐', color: '#ff0044' }
];

const BOT_NAMES = [
  'ShadowKiller', 'NoScope_Pro', 'Rush_B_King', 'HeadshotGod', 'AwpMaster',
  'FlickShot', 'SmokeNinja', 'FlashBang', 'EcoWarrior', 'ClutchKing',
  'DustDevil', 'MirageAce', 'InfernoPro', 'NukeTactician', 'Overpass',
  'LurkerX', 'AWPer_777', 'OneTap', 'SprayControl', 'PeekAdvantage',
  'WallBang', 'PreFire', 'FastRotate', 'BombPlant', 'DefuseMaster'
];