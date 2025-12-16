/* ============================================================
   Island Man MMO – Anti-Cheat Service (Server-Side)
   File: services/antiCheat.js
   Purpose:
     - Detect and prevent impossible movement
     - Enforce speed and frame sanity
     - Reject malicious client input
============================================================ */

import { WORLD, INPUT_LIMITS } from "../shared/protocol.js";

/* =========================
   CONFIG
========================= */
const MAX_FRAME_DESYNC = 12;     // Max tolerated frame offset
const TELEPORT_EPSILON = 0.01;   // Floating-point tolerance

/* =========================
   PLAYER TRACKING
========================= */
// playerId -> { lastX, lastZ, lastFrame }
const history = new Map();

/* =========================
   PUBLIC API
========================= */

/**
 * Validates a movement input against authoritative rules.
 * Returns true if movement is allowed.
 */
export function validateMovement(state, input) {
  if (!input) return true;

  // Input bounds already validated in protocol
  if (
    input.dx < INPUT_LIMITS.MOVE_MIN ||
    input.dx > INPUT_LIMITS.MOVE_MAX ||
    input.dz < INPUT_LIMITS.MOVE_MIN ||
    input.dz > INPUT_LIMITS.MOVE_MAX
  ) {
    return false;
  }

  return true;
}

/**
 * Validates frame consistency and detects speed hacks.
 */
export function validateState(playerId, frame, state) {
  if (!history.has(playerId)) {
    history.set(playerId, {
      lastX: state.x,
      lastZ: state.z,
      lastFrame: frame
    });
    return true;
  }

  const h = history.get(playerId);

  const frameDelta = frame - h.lastFrame;
  if (frameDelta <= 0 || frameDelta > MAX_FRAME_DESYNC) {
    return false;
  }

  const dx = state.x - h.lastX;
  const dz = state.z - h.lastZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const maxDist =
    (WORLD.MAX_SPEED * frameDelta) / WORLD.TICK_RATE +
    TELEPORT_EPSILON;

  if (dist > maxDist) {
    return false;
  }

  h.lastX = state.x;
  h.lastZ = state.z;
  h.lastFrame = frame;

  return true;
}

/* =========================
   ADMIN / HOOKS
========================= */

/**
 * Called when a cheat is detected.
 * Stubbed for logging / banning.
 */
export function onCheatDetected(playerId, reason = "UNKNOWN") {
  console.warn(
    `[ANTI-CHEAT] Player ${playerId} flagged: ${reason}`
  );

  // Production extensions:
  // - Disconnect player
  // - Increment strike counter
  // - Persist ban to database
}