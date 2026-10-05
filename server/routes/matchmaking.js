// ============================================================
// API: МАТЧМЕЙКИНГ ПО ELO
// ============================================================
const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ELO_RANGE = 200;      // ±200 Elo
const QUEUE_TIMEOUT = 60;   // 60 секунд

// ============================================================
// POST /api/matchmaking/search — встать в очередь
// ============================================================
router.post('/search', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  // Проверяем, не в очереди ли уже
  const existing = db.prepare('SELECT * FROM match_queue WHERE user_id = ?').get(req.userId);

  // Убираем старые записи
  db.prepare("DELETE FROM match_queue WHERE joined_at < datetime('now', '-' || ? || ' seconds')")
    .run(QUEUE_TIMEOUT);

  if (existing) {
    // Уже в очереди — проверяем, есть ли матч
    if (existing.status === 'matched' && existing.match_id) {
      const match = db.prepare('SELECT * FROM matches_active WHERE id = ?').get(existing.match_id);
      if (match) {
        return res.json({ status: 'matched', match_id: match.id });
      }
    }
    return res.json({ status: 'searching', queue_id: existing.id });
  }

  // Добавляем в очередь
  const result = db.prepare(`
    INSERT INTO match_queue (user_id, elo, status)
    VALUES (?, ?, 'searching')
  `).run(req.userId, user.elo);

  // Ищем соперника
  const opponent = db.prepare(`
    SELECT * FROM match_queue
    WHERE user_id != ?
      AND status = 'searching'
      AND ABS(elo - ?) <= ?
    ORDER BY ABS(elo - ?) ASC, joined_at ASC
    LIMIT 1
  `).get(req.userId, user.elo, ELO_RANGE, user.elo);

  if (opponent) {
    const opponentUser = db.prepare('SELECT * FROM users WHERE id = ?').get(opponent.user_id);

    // Создаём матч
    const matchResult = db.prepare(`
      INSERT INTO matches_active (player1_id, player2_id, player1_elo, player2_elo, status)
      VALUES (?, ?, ?, ?, 'waiting')
    `).run(req.userId, opponent.user_id, user.elo, opponentUser.elo);

    const matchId = matchResult.lastInsertRowid;

    // Обновляем оба
    db.prepare("UPDATE match_queue SET status = 'matched', match_id = ? WHERE user_id = ?")
      .run(matchId, req.userId);
    db.prepare("UPDATE match_queue SET status = 'matched', match_id = ? WHERE user_id = ?")
      .run(matchId, opponent.user_id);

    console.log(`⚔️ Матч создан: ${user.nickname} (${user.elo}) vs ${opponentUser.nickname} (${opponentUser.elo})`);

    return res.json({
      status: 'matched',
      match_id: matchId,
      opponent: {
        id: opponentUser.id,
        nickname: opponentUser.nickname,
        elo: opponentUser.elo,
      }
    });
  }

  res.json({ status: 'searching', queue_id: result.lastInsertRowid });
});

// ============================================================
// GET /api/matchmaking/status — проверить статус очереди
// ============================================================
router.get('/status', requireAuth, (req, res) => {
  const entry = db.prepare('SELECT * FROM match_queue WHERE user_id = ?').get(req.userId);

  if (!entry) {
    return res.json({ status: 'idle' });
  }

  // Проверка таймаута
  const age = Math.floor((Date.now() - new Date(entry.joined_at).getTime()) / 1000);
  if (age > QUEUE_TIMEOUT && entry.status === 'searching') {
    db.prepare('DELETE FROM match_queue WHERE id = ?').run(entry.id);
    return res.json({ status: 'timeout' });
  }

  if (entry.status === 'matched' && entry.match_id) {
    const match = db.prepare('SELECT * FROM matches_active WHERE id = ?').get(entry.match_id);
    if (match) {
      const opponentId = match.player1_id === req.userId ? match.player2_id : match.player1_id;
      const opponent = db.prepare('SELECT id, nickname, elo FROM users WHERE id = ?').get(opponentId);

      return res.json({
        status: 'matched',
        match_id: match.id,
        opponent: opponent,
        my_elo: db.prepare('SELECT elo FROM users WHERE id = ?').get(req.userId).elo,
      });
    }
  }

  res.json({ status: 'searching', time_in_queue: age });
});

// ============================================================
// POST /api/matchmaking/cancel — отменить поиск
// ============================================================
router.post('/cancel', requireAuth, (req, res) => {
  db.prepare('DELETE FROM match_queue WHERE user_id = ?').run(req.userId);
  res.json({ ok: true });
});

// ============================================================
// POST /api/matchmaking/report — сообщить о результате
// ============================================================
router.post('/report', requireAuth, (req, res) => {
  const { match_id, result } = req.body;
  if (!['win', 'lose'].includes(result)) {
    return res.status(400).json({ error: 'result: win или lose' });
  }

  const match = db.prepare('SELECT * FROM matches_active WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'Матч не найден' });

  const opponentId = match.player1_id === req.userId ? match.player2_id : match.player1_id;
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const opponent = db.prepare('SELECT * FROM users WHERE id = ?').get(opponentId);

  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponent.elo - me.elo) / 400));
  const actual = result === 'win' ? 1 : 0;
  const change = Math.round(K * (actual - expected));

  const myNewElo = Math.max(0, me.elo + change);
  const oppChange = -change;
  const oppNewElo = Math.max(0, opponent.elo + oppChange);

  db.prepare('UPDATE users SET elo = ?, matches = matches + 1, wins = wins + ?, losses = losses + ? WHERE id = ?')
    .run(myNewElo, result === 'win' ? 1 : 0, result === 'lose' ? 1 : 0, req.userId);

  db.prepare('UPDATE users SET elo = ?, matches = matches + 1, wins = wins + ?, losses = losses + ? WHERE id = ?')
    .run(oppNewElo, result === 'lose' ? 1 : 0, result === 'win' ? 1 : 0, opponentId);

  db.prepare("UPDATE matches_active SET status = 'finished' WHERE id = ?").run(match_id);
  db.prepare('DELETE FROM match_queue WHERE user_id IN (?, ?)').run(req.userId, opponentId);

  res.json({
    elo_change: change,
    new_elo: myNewElo,
  });
});

module.exports = router;