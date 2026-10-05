// ============================================================
// API: РЕАЛЬНЫЙ ОНЛАЙН
// ============================================================
const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Игрок считается онлайн, если был активен за последние 5 минут
const ONLINE_WINDOW = 5 * 60;   // секунд
const PING_INTERVAL = 30;        // рекомендуемый интервал пинга (секунд)

// ============================================================
// POST /api/online/ping — отметить себя онлайн
// ============================================================
router.post('/ping', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, nickname, elo FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Не найден' });

  // Upsert: если есть — обновляем, если нет — вставляем
  db.prepare(`
    INSERT INTO online_sessions (user_id, nickname, elo, last_seen)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      nickname = excluded.nickname,
      elo = excluded.elo,
      last_seen = CURRENT_TIMESTAMP
  `).run(user.id, user.nickname, user.elo);

  // Удаляем старые сессии (>5 мин)
  db.prepare("DELETE FROM online_sessions WHERE last_seen < datetime('now', '-' || ? || ' seconds')")
    .run(ONLINE_WINDOW);

  res.json({
    ok: true,
    next_ping_in: PING_INTERVAL,
  });
});

// ============================================================
// GET /api/online/count — сколько игроков онлайн (публичный)
// ============================================================
router.get('/count', (req, res) => {
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM online_sessions WHERE last_seen >= datetime('now', '-' || ? || ' seconds')"
  ).get(ONLINE_WINDOW);

  res.json({
    online: row ? row.count : 0,
    window_seconds: ONLINE_WINDOW,
  });
});

// ============================================================
// GET /api/online/list — список онлайн-игроков (опционально)
// ============================================================
router.get('/list', requireAuth, (req, res) => {
  const players = db.prepare(`
    SELECT user_id, nickname, elo, last_seen
    FROM online_sessions
    WHERE last_seen >= datetime('now', '-' || ? || ' seconds')
    ORDER BY last_seen DESC
    LIMIT 50
  `).all(ONLINE_WINDOW);

  res.json(players);
});

// ============================================================
// POST /api/online/leave — выйти (закрыл вкладку)
// ============================================================
router.post('/leave', requireAuth, (req, res) => {
  db.prepare('DELETE FROM online_sessions WHERE user_id = ?').run(req.userId);
  res.json({ ok: true });
});

module.exports = router;