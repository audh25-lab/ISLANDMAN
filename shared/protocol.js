/* ============================================================
   Island Man MMO – Network Protocol (Authoritative)
   File: shared/protocol.js
   Purpose:
     - Single source of truth for ALL networking
     - Deterministic message contracts
     - Versioned & forward compatible
     - Anti-cheat sanity validation
============================================================ */

/* =========================
   PROTOCOL VERSIONING
========================= */
export const PROTOCOL_VERSION = 1;

/* =========================
   MESSAGE TYPES
========================= */
export const MSG = Object.freeze({
  HANDSHAKE: "handshake",
  JOIN_QUEUE: "join_queue",
  MATCH_FOUND: "match_found",
  INPUT: "input",
  STATE: "state",
  SNAPSHOT: "snapshot",
  SPECTATE: "spectate",
  REPLAY_REQUEST: "replay_request",
  REPLAY_DATA: "replay_data",
  PING: "ping",
  PONG: "pong",
  ERROR: "error"
});

/* =========================
   INPUT CONSTRAINTS
   (Anti-cheat hard limits)
========================= */
export const INPUT_LIMITS = Object.freeze({
  MOVE_MIN: -1,
  MOVE_MAX: 1,
  MAX_RATE_HZ: 60,
  MAX_QUEUE_DELAY_FRAMES: 8
});

/* =========================
   WORLD CONSTANTS
========================= */
export const WORLD = Object.freeze({
  TICK_RATE: 60,
  MAX_PLAYERS_PER_SHARD: 64,
  SNAPSHOT_RATE: 10,
  WORLD_SIZE: 1024,
  MAX_SPEED: 6
});

/* =========================
   VALIDATORS
========================= */
export function validateHandshake(msg) {
  return (
    typeof msg === "object" &&
    msg.version === PROTOCOL_VERSION &&
    typeof msg.playerId === "string"
  );
}

export function validateInput(msg) {
  if (typeof msg !== "object") return false;

  const { dx, dz, frame } = msg;

  if (typeof frame !== "number") return false;
  if (typeof dx !== "number" || typeof dz !== "number") return false;

  if (dx < INPUT_LIMITS.MOVE_MIN || dx > INPUT_LIMITS.MOVE_MAX)
    return false;
  if (dz < INPUT_LIMITS.MOVE_MIN || dz > INPUT_LIMITS.MOVE_MAX)
    return false;

  return true;
}

/* =========================
   SNAPSHOT SANITY CHECK
========================= */
export function validateState(state) {
  if (typeof state !== "object") return false;

  for (const id in state) {
    const p = state[id];
    if (
      typeof p.x !== "number" ||
      typeof p.z !== "number" ||
      Math.abs(p.x) > WORLD.WORLD_SIZE ||
      Math.abs(p.z) > WORLD.WORLD_SIZE
    ) {
      return false;
    }
  }
  return true;
}

/* =========================
   SERIALIZATION
========================= */
export function encode(type, payload = {}) {
  return JSON.stringify({
    v: PROTOCOL_VERSION,
    t: type,
    d: payload
  });
}

export function decode(raw) {
  try {
    const msg = JSON.parse(raw);
    if (msg.v !== PROTOCOL_VERSION) return null;
    return msg;
  } catch {
    return null;
  }
}

/* =========================
   ERROR HELPERS
========================= */
export function error(code, reason) {
  return encode(MSG.ERROR, { code, reason });
}
