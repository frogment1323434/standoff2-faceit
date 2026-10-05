// ============================================================
// API: ЛОББИ (реальные игроки)
// ============================================================
const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================================
// Генерация кода
// ============================================================
function generateLobbyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  let attempts = 0;

  do {
    code = 'SO2-';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    attempts++;
  } while (
    db.prepare('SELECT id FROM lobby_codes WHERE code = ?').get(code) &&
    attempts < 10
  );

  return code;
}

// ============================================================
// POST /api/lobby/create — создать лобби
// ============================================================
router.post('/create', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Не найден' });

  // Удаляем старые открытые лобби игрока
  db.prepare("DELETE FROM lobby_codes WHERE host_id = ? AND status = 'waiting'")
    .run(req.userId);

  const code = generateLobbyCode();

  const players = [{
    id: user.id,
    nickname: user.nickname,
    elo: user.elo,
    ready: false,
    isHost: true,
  }];

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString().replace('T', ' ').slice(0, 19);

  const result = db.prepare(`
    INSERT INTO lobby_codes (code, host_id, players, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(code, req.userId, JSON.stringify(players), expiresAt);

  res.json({
    id: result.lastInsertRowid,
    code,
    host_id: req.userId,
    players,
    status: 'waiting',
    max_players: 10,
    expires_at: expiresAt,
  });
});

// ============================================================
// GET /api/lobby/:code — получить состояние лобби
// ============================================================
router.get('/:code', requireAuth, (req, res) => {
  const lobby = db.prepare('SELECT * FROM lobby_codes WHERE code = ?')
    .get(req.params.code.toUpperCase());

  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });

  if (new Date(lobby.expires_at) < new Date()) {
    db.prepare("UPDATE lobby_codes SET status = 'closed' WHERE id = ?").run(lobby.id);
    return res.status(410).json({ error: 'Код истёк' });
  }

  res.json({
    id: lobby.id,
    code: lobby.code,
    host_id: lobby.host_id,
    status: lobby.status,
    players: JSON.parse(lobby.players),
    max_players: lobby.max_players,
    expires_at: lobby.expires_at,
  });
});

// ============================================================
// POST /api/lobby/:code/join — присоединиться
// ============================================================
router.post('/:code/join', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const lobby = db.prepare('SELECT * FROM lobby_codes WHERE code = ?')
    .get(req.params.code.toUpperCase());

  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });
  if (lobby.status !== 'waiting') return res.status(400).json({ error: 'Лобби закрыто' });

  const players = JSON.parse(lobby.players);

  if (players.find(p => p.id === req.userId)) {
    return res.json({ ok: true, lobby: { ...lobby, players } });
  }

  if (players.length >= lobby.max_players) {
    return res.status(400).json({ error: 'Лобби заполнено' });
  }

  players.push({
    id: user.id,
    nickname: user.nickname,
    elo: user.elo,
    ready: false,
    isHost: false,
  });

  db.prepare('UPDATE lobby_codes SET players = ? WHERE id = ?')
    .run(JSON.stringify(players), lobby.id);

  res.json({ ok: true, lobby: { ...lobby, players } });
});

// ============================================================
// POST /api/lobby/:code/ready — переключить готовность
// ============================================================
router.post('/:code/ready', requireAuth, (req, res) => {
  const lobby = db.prepare('SELECT * FROM lobby_codes WHERE code = ?')
    .get(req.params.code.toUpperCase());
  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });

  const players = JSON.parse(lobby.players);
  const me = players.find(p => p.id === req.userId);
  if (!me) return res.status(403).json({ error: 'Ты не в лобби' });

  me.ready = !me.ready;

  const allReady = players.length >= 2 && players.every(p => p.ready);
  const newStatus = allReady ? 'full' : 'waiting';

  db.prepare('UPDATE lobby_codes SET players = ?, status = ? WHERE id = ?')
    .run(JSON.stringify(players), newStatus, lobby.id);

  res.json({
    ok: true,
    players,
    status: newStatus,
    all_ready: allReady,
  });
});

// ============================================================
// DELETE /api/lobby/:code — закрыть лобби
// ============================================================
router.delete('/:code', requireAuth, (req, res) => {
  const lobby = db.prepare('SELECT * FROM lobby_codes WHERE code = ?')
    .get(req.params.code.toUpperCase());
  if (!lobby) return res.status(404).json({ error: 'Лобби не найдено' });

  if (lobby.host_id !== req.userId) {
    return res.status(403).json({ error: 'Только хост может закрыть' });
  }

  db.prepare("UPDATE lobby_codes SET status = 'closed' WHERE id = ?").run(lobby.id);
  res.json({ ok: true });
});

module.exports = router;