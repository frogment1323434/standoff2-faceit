// ============================================================
// ГЛАВНЫЙ ФАЙЛ СЕРВЕРА
// ============================================================
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API роуты
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/matches',     require('./routes/matches'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/profile',     require('./routes/profile'));
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/matches',     require('./routes/matches'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/profile',     require('./routes/profile'));
app.use('/api/lobby',       require('./routes/lobby'));  // 🆕 ДОБАВИТЬ
app.use('/api/lobby',       require('./routes/lobby'));
app.use('/api/matchmaking', require('./routes/matchmaking'));
app.use('/api/online',      require('./routes/online'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// SPA fallback — все не-API запросы отдают index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Запуск
app.listen(PORT, () => {
  console.log('========================================');
  console.log('⚔️  SO2 FACEIT SERVER');
  console.log('========================================');
  app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 http://localhost:${PORT}`);
  console.log(`📱 http://192.168.1.100:${PORT}  ← для телефона`);
});
  console.log(`📡 API:    http://localhost:${PORT}/api/health`);
  console.log('========================================');
});