// ============================================================
// ЛИДЕРБОРД
// ============================================================

function renderLeaderboard() {
  const body = document.getElementById('leaderboardBody');
  if (!body) return;

  const lb = state.leaderboard.slice(0, 50);
  body.innerHTML = lb.map((p, i) => {
    const { current } = getRank(p.elo);
    const wr = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;
    const isUser = state.user && p.name === state.user.name;  // ← проверка на null
    return '<tr' + (isUser ? ' style="background:rgba(255,85,0,0.1);"' : '') + '>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (isUser ? '👉 ' : '') + p.name + '</td>' +
      '<td><span style="color:' + current.color + '">' + current.icon + ' ' + current.name + '</span></td>' +
      '<td><strong>' + p.elo + '</strong></td>' +
      '<td>' + p.matches + '</td>' +
      '<td>' + wr + '%</td>' +
      '</tr>';
  }).join('');
}