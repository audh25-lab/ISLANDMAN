/* ============================================================
   Island Man MMO – Ranked Ladder Service
   File: services/ladder.js
   Purpose:
     - Maintain player MMR
     - Process match results
     - Provide leaderboards
============================================================ */

const DEFAULT_MMR = 1000;
const MIN_MMR = 100;
const MAX_MMR = 5000;
const K_FACTOR = 32;

/* =========================
   STORAGE
========================= */
// playerId -> mmr
const ladder = new Map();

/* =========================
   PUBLIC API
========================= */
export function getMMR(playerId) {
  if (!ladder.has(playerId)) {
    ladder.set(playerId, DEFAULT_MMR);
  }
  return ladder.get(playerId);
}

export function recordMatchResult(winnerId, loserId) {
  const winnerMMR = getMMR(winnerId);
  const loserMMR = getMMR(loserId);

  const expectedWin =
    1 / (1 + Math.pow(10, (loserMMR - winnerMMR) / 400));
  const expectedLose =
    1 / (1 + Math.pow(10, (winnerMMR - loserMMR) / 400));

  let newWinnerMMR = winnerMMR + K_FACTOR * (1 - expectedWin);
  let newLoserMMR = loserMMR + K_FACTOR * (0 - expectedLose);

  newWinnerMMR = clamp(newWinnerMMR, MIN_MMR, MAX_MMR);
  newLoserMMR = clamp(newLoserMMR, MIN_MMR, MAX_MMR);

  ladder.set(winnerId, Math.round(newWinnerMMR));
  ladder.set(loserId, Math.round(newLoserMMR));
}

export function getLeaderboard(limit = 100) {
  return [...ladder.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([playerId, mmr], rank) => ({
      rank: rank + 1,
      playerId,
      mmr
    }));
}

/* =========================
   UTIL
========================= */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}