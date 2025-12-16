/* ============================================================
   Island Man MMO – Replay Service
   File: services/replay.js
   Purpose:
     - Record authoritative shard states
     - Provide deterministic replays
     - Support spectator & playback clients
============================================================ */

/* =========================
   CONFIG
========================= */
const MAX_REPLAY_FRAMES = 60 * 60 * 10; // 10 minutes @ 60fps

/* =========================
   STORAGE
========================= */
// shardId -> [{ frame, state }]
const replays = new Map();

/* =========================
   RECORDING
========================= */
export function recordFrame(shardId, frame, state) {
  if (!replays.has(shardId)) {
    replays.set(shardId, []);
  }

  const buffer = replays.get(shardId);

  buffer.push({
    frame,
    state: deepClone(state)
  });

  // Prevent unbounded memory growth
  if (buffer.length > MAX_REPLAY_FRAMES) {
    buffer.shift();
  }
}

/* =========================
   RETRIEVAL
========================= */
export function getReplay(shardId) {
  const data = replays.get(shardId);
  if (!data) return null;

  // Return copy so consumers cannot mutate
  return data.map(f => ({
    frame: f.frame,
    state: deepClone(f.state)
  }));
}

/* =========================
   CLEAR / CLEANUP
========================= */
export function clearReplay(shardId) {
  replays.delete(shardId);
}

/* =========================
   UTIL
========================= */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}