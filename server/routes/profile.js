// ============================================================
// ПРОФИЛЬ
// ============================================================
const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Не найден' });

  const history = db.prepare(
    'SELECT elo, created_at FROM elo_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
  ).all(req.userId);

  const { password_hash, ...safe } = user;
  res.json({ user: safe, history: history.reverse() });
});

// PUT /api/profile/me — обновить ник
router.put('/me', requireAuth, (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.length < 3 || nickname.length > 20) {
    return res.status(400).json({ error: 'Ник: 3-20 символов' });
  }
  const taken = db.prepare('SELECT id FROM users WHERE nickname = ? AND id != ?')
    .get(nickname, req.userId);
  if (taken) return res.status(409).json({ error: 'Ник занят' });

  db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const { password_hash, ...safe } = user;
  res.json(safe);
});

module.exports = router;