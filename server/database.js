// ============================================================
// ИНИЦИАЛИЗАЦИЯ SQLITE БАЗЫ ДАННЫХ
// ============================================================
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ============================================================
// СОЗДАНИЕ ТАБЛИЦ
// ============================================================
db.exec(`
  -- ============================================================
  -- ПОЛЬЗОВАТЕЛИ
  -- ============================================================
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    elo           INTEGER DEFAULT 1500,
    matches       INTEGER DEFAULT 0,
    wins          INTEGER DEFAULT 0,
    losses        INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- ============================================================
  -- МАТЧИ (исторические)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS matches (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    winner_id     INTEGER NOT NULL,
    loser_id      INTEGER NOT NULL,
    winner_elo_before INTEGER,
    loser_elo_before  INTEGER,
    winner_elo_after  INTEGER,
    loser_elo_after   INTEGER,
    elo_change    INTEGER,
    played_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (winner_id) REFERENCES users(id),
    FOREIGN KEY (loser_id)  REFERENCES users(id)
  );

  -- ============================================================
  -- ИСТОРИЯ ELO
  -- ============================================================
  CREATE TABLE IF NOT EXISTS elo_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    elo        INTEGER NOT NULL,
    reason     TEXT DEFAULT 'match',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- ============================================================
  -- ЛОББИ-КОДЫ (для совместимости, не используется в матчмейкинге)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS lobby_codes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    code         TEXT UNIQUE NOT NULL,
    host_id      INTEGER NOT NULL,
    status       TEXT DEFAULT 'waiting',
    players      TEXT DEFAULT '[]',
    max_players  INTEGER DEFAULT 10,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at   DATETIME,
    FOREIGN KEY (host_id) REFERENCES users(id)
  );

  -- ============================================================
  -- ОЧЕРЕДЬ МАТЧМЕЙКИНГА
  -- ============================================================
  CREATE TABLE IF NOT EXISTS match_queue (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL UNIQUE,
    elo          INTEGER NOT NULL,
    status       TEXT DEFAULT 'searching',
    match_id     INTEGER DEFAULT NULL,
    joined_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- ============================================================
  -- АКТИВНЫЕ МАТЧИ
  -- ============================================================
  CREATE TABLE IF NOT EXISTS matches_active (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    player1_id   INTEGER NOT NULL,
    player2_id   INTEGER NOT NULL,
    player1_elo  INTEGER,
    player2_elo  INTEGER,
    status       TEXT DEFAULT 'waiting',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player1_id) REFERENCES users(id),
    FOREIGN KEY (player2_id) REFERENCES users(id)
  );

  -- ============================================================
  -- ОНЛАЙН (активные сессии)
  -- ============================================================
  CREATE TABLE IF NOT EXISTS online_sessions (
    user_id      INTEGER PRIMARY KEY,
    nickname     TEXT,
    elo          INTEGER,
    last_seen    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- ============================================================
  -- ИНДЕКСЫ
  -- ============================================================
  CREATE INDEX IF NOT EXISTS idx_users_elo ON users(elo DESC);
  CREATE INDEX IF NOT EXISTS idx_history_user ON elo_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_id);
  CREATE INDEX IF NOT EXISTS idx_matches_loser ON matches(loser_id);
  CREATE INDEX IF NOT EXISTS idx_lobby_code ON lobby_codes(code);
  CREATE INDEX IF NOT EXISTS idx_lobby_status ON lobby_codes(status);
  CREATE INDEX IF NOT EXISTS idx_queue_elo ON match_queue(elo);
  CREATE INDEX IF NOT EXISTS idx_queue_status ON match_queue(status);
  CREATE INDEX IF NOT EXISTS idx_matches_active_status ON matches_active(status);
  CREATE INDEX IF NOT EXISTS idx_online_last_seen ON online_sessions(last_seen);
`);

console.log('✅ SQLite база готова');

module.exports = db;