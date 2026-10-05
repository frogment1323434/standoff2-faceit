// ============================================================
// ELO СИСТЕМА
// ============================================================

function getExpectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function calculateEloChange(myElo, enemyElo, result) {
  const expected = getExpectedScore(myElo, enemyElo);
  let actual;
  if (result === 'win') actual = 1;
  else if (result === 'lose') actual = 0;
  else actual = 0.5;
  return Math.round(CONFIG.K_FACTOR * (actual - expected));
}