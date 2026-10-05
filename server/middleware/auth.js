// ============================================================
// JWT-АВТОРИЗАЦИЯ (токены живут после перезапуска)
// ============================================================
const jwt = require('jsonwebtoken');

// В реальном проекте — в .env файле, а не в коде!
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const EXPIRES_IN = '7d';

function createToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: EXPIRES_IN });
}

function getUserId(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    return payload.userId;
  } catch (e) {
    return null;
  }
}

function destroyToken(token) {
  // JWT не хранится на сервере — удаление только на клиенте
  // Токен истечёт сам через EXPIRES_IN
}

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const userId = getUserId(token);
  if (!userId) {
    return res.status(401).json({ error: 'Не авторизован' });
  }
  req.userId = userId;
  req.token = token;
  next();
}

module.exports = { createToken, getUserId, destroyToken, requireAuth };