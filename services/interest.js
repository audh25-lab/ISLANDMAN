/* ============================================================
   Island Man MMO – Interest Management (AOI)
   File: services/interest.js
   Purpose:
     - Filter visible entities per player
     - Reduce bandwidth & CPU
     - Enable MMO-scale worlds
============================================================ */

import { WORLD } from "../shared/protocol.js";

/* =========================
   CONFIG
========================= */
const AOI_RADIUS = 40;        // World units
const AOI_RADIUS_SQ = AOI_RADIUS * AOI_RADIUS;

/* =========================
   PUBLIC API
========================= */

/**
 * Returns the subset of players visible to `playerId`
 * @param {string} playerId
 * @param {Map<string, {x:number,z:number}>} players
 * @returns {Object} filtered state snapshot
 */
export function getInterestSet(playerId, players) {
  const self = players.get(playerId);
  if (!self) return {};

  const visible = {};

  for (const [id, state] of players) {
    // Always include self
    if (id === playerId) {
      visible[id] = { x: state.x, z: state.z };
      continue;
    }

    if (inAOI(self, state)) {
      visible[id] = { x: state.x, z: state.z };
    }
  }

  return visible;
}

/* =========================
   AOI CHECK
========================= */
function inAOI(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;

  return (dx * dx + dz * dz) <= AOI_RADIUS_SQ;
}

/* =========================
   FUTURE EXTENSION NOTES
========================= */
/*
  This AOI system is intentionally simple and deterministic.

  Production MMOs upgrade this to:
   - Spatial grids
   - Quadtrees
   - ECS partitions
   - Interest groups (parties, raids)

  This file is designed to be swapped without touching:
   - shard.js
   - networking
   - replay system
*/