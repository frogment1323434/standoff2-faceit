// ============================================================
// ЛИДЕРБОРД
// ============================================================
const express = require('express');
const db = require('../database');

const router = express.Router();

// GET /api/leaderboard?limit=50
router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const players = db.prepare(`
    SELECT
      id, nickname, elo, matches, wins, losses,
      CASE WHEN matches > 0
        THEN ROUND(CAST(wins AS FLOAT) / matches * 100)
        ELSE 0
      END AS winrate
    FROM users
    WHERE matches >= 0
    ORDER BY elo DESC
    LIMIT ?
  `).all(limit);

  res.json(players);
});

module.exports = router;