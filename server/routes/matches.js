// ============================================================
// МАТЧИ + ELO РАСЧЁТ
// ============================================================
const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const K_FACTOR = 32;

function calculateEloChange(myElo, enemyElo, result) {
  const expected = 1 / (1 + Math.pow(10, (enemyElo - myElo) / 400));
  const actual = result === 'win' ? 1 : result === 'lose' ? 0 : 0.5;
  return Math.round(K_FACTOR * (actual - expected));
}

// POST /api/matches/report
// { opponentId, result: 'win' | 'lose' }
router.post('/report', requireAuth, (req, res) => {
  const { opponentId, result } = req.body;
  if (!['win', 'lose'].includes(result)) {
    return res.status(400).json({ error: 'result: win или lose' });
  }

  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  const opponent = db.prepare('SELECT * FROM users WHERE id = ?').get(opponentId);
  if (!opponent) return res.status(404).json({ error: 'Противник не найден' });
  if (opponent.id === me.id) return res.status(400).json({ error: 'Нельзя играть с собой' });

  // Расчёт для обоих
  const myChange = calculateEloChange(me.elo, opponent.elo, result);
  const oppChange = calculateEloChange(opponent.elo, me.elo, result === 'win' ? 'lose' : 'win');

  const myNewElo = Math.max(0, me.elo + myChange);
  const oppNewElo = Math.max(0, opponent.elo + oppChange);

  // Транзакция
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE users SET
        elo = ?,
        matches = matches + 1,
        wins = wins + ?,
        losses = losses + ?
      WHERE id = ?
    `).run(myNewElo, result === 'win' ? 1 : 0, result === 'lose' ? 1 : 0, me.id);

    db.prepare(`
      UPDATE users SET
        elo = ?,
        matches = matches + 1,
        wins = wins + ?,
        losses = losses + ?
      WHERE id = ?
    `).run(oppNewElo, result === 'lose' ? 1 : 0, result === 'win' ? 1 : 0, opponent.id);

    const winnerId = result === 'win' ? me.id : opponent.id;
    const loserId = result === 'win' ? opponent.id : me.id;
    const winnerBefore = result === 'win' ? me.elo : opponent.elo;
    const loserBefore = result === 'win' ? opponent.elo : me.elo;
    const winnerAfter = result === 'win' ? myNewElo : oppNewElo;
    const loserAfter = result === 'win' ? oppNewElo : myNewElo;

    db.prepare(`
      INSERT INTO matches
        (winner_id, loser_id, winner_elo_before, loser_elo_before,
         winner_elo_after, loser_elo_after, elo_change)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(winnerId, loserId, winnerBefore, loserBefore,
           winnerAfter, loserAfter, Math.abs(myChange));

    db.prepare('INSERT INTO elo_history (user_id, elo) VALUES (?, ?)')
      .run(me.id, myNewElo);
    db.prepare('INSERT INTO elo_history (user_id, elo) VALUES (?, ?)')
      .run(opponent.id, oppNewElo);
  });

  tx();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(me.id);
  res.json({
    elo_change: myChange,
    new_elo: myNewElo,
    user: { ...updated, password_hash: undefined },
  });
});

// GET /api/matches/history — история матчей игрока
router.get('/history', requireAuth, (req, res) => {
  const matches = db.prepare(`
    SELECT m.*,
      w.nickname AS winner_name,
      l.nickname AS loser_name
    FROM matches m
    JOIN users w ON w.id = m.winner_id
    JOIN users l ON l.id = m.loser_id
    WHERE m.winner_id = ? OR m.loser_id = ?
    ORDER BY m.played_at DESC
    LIMIT 30
  `).all(req.userId, req.userId);

  res.json(matches);
});

module.exports = router;