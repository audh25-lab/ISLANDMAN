/* ============================================================
   Island Man MMO – Matchmaking Service
   File: services/matchmaking.js
   Purpose:
     - Queue players
     - Group by MMR
     - Spawn shards
     - Reserve spectator slots
============================================================ */

import { MSG, encode } from "../shared/protocol.js";
import { spawnShard } from "./shard.js";

/* =========================
   CONFIG
========================= */
const PLAYERS_PER_MATCH = 2;
const INITIAL_MMR = 1000;
const MMR_RANGE = 200;

/* =========================
   QUEUES
========================= */
const queue = [];

/* =========================
   PLAYER MODEL
========================= */
class QueuedPlayer {
  constructor(ws, playerId) {
    this.ws = ws;
    this.playerId = playerId;
    this.mmr = INITIAL_MMR;
    this.enqueuedAt = Date.now();
  }
}

/* =========================
   PUBLIC API
========================= */
export function enqueuePlayer(ws, playerId) {
  const qp = new QueuedPlayer(ws, playerId);
  queue.push(qp);

  ws.send(encode(MSG.JOIN_QUEUE, {
    ok: true,
    mmr: qp.mmr
  }));

  tryMatch();
}

/* =========================
   MATCHMAKING LOGIC
========================= */
function tryMatch() {
  if (queue.length < PLAYERS_PER_MATCH) return;

  // Simple MMR-based grouping
  queue.sort((a, b) => a.mmr - b.mmr);

  for (let i = 0; i <= queue.length - PLAYERS_PER_MATCH; i++) {
    const group = queue.slice(i, i + PLAYERS_PER_MATCH);

    const minMMR = group[0].mmr;
    const maxMMR = group[group.length - 1].mmr;

    if (maxMMR - minMMR <= MMR_RANGE) {
      queue.splice(i, PLAYERS_PER_MATCH);
      createMatch(group);
      return;
    }
  }
}

/* =========================
   MATCH CREATION
========================= */
function createMatch(players) {
  const shardId = `shard-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  players.forEach(p => {
    p.ws.send(encode(MSG.MATCH_FOUND, {
      shardId,
      players: players.map(x => x.playerId)
    }));
  });

  spawnShard(shardId, players);
}

/* =========================
   CLEANUP
========================= */
export function removePlayer(ws) {
  const index = queue.findIndex(p => p.ws === ws);
  if (index !== -1) queue.splice(index, 1);
}