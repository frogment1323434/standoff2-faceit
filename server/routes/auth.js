// ============================================================
// РЕГИСТРАЦИЯ И ЛОГИН
// ============================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { createToken, destroyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { nickname, password } = req.body;

  if (!nickname || nickname.length < 3 || nickname.length > 20) {
    return res.status(400).json({ error: 'Ник: 3-20 символов' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Пароль: минимум 4 символа' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE nickname = ?').get(nickname);
  if (existing) {
    return res.status(409).json({ error: 'Ник занят' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (nickname, password_hash) VALUES (?, ?)'
  ).run(nickname, hash);

  db.prepare('INSERT INTO elo_history (user_id, elo, reason) VALUES (?, ?, ?)')
    .run(result.lastInsertRowid, 1500, 'register');

  const token = createToken(result.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

  res.json({ token, user: sanitize(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) {
    return res.status(400).json({ error: 'Введи ник и пароль' });
  }

  const user = db.prepare('SELECT * FROM users WHERE nickname = ?').get(nickname);
  if (!user) return res.status(401).json({ error: 'Игрок не найден' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный пароль' });
  }

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  const token = createToken(user.id);
  res.json({ token, user: sanitize(user) });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) destroyToken(token);
  res.json({ ok: true });
});

function sanitize(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

module.exports = router;