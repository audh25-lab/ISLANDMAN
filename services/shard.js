/* ============================================================
   Island Man MMO – Shard Service (Authoritative World)
   File: services/shard.js
   Purpose:
     - Owns one world instance
     - Runs authoritative simulation
     - Handles inputs, physics, snapshots
============================================================ */

import {
  MSG,
  WORLD,
  validateInput,
  encode
} from "../shared/protocol.js";
import { recordFrame } from "./replay.js";
import { getInterestSet } from "./interest.js";
import { validateMovement } from "./antiCheat.js";

/* =========================
   SHARD REGISTRY
========================= */
const shards = new Map();

/* =========================
   PUBLIC API
========================= */
export function spawnShard(shardId, players) {
  const shard = new Shard(shardId, players);
  shards.set(shardId, shard);
  shard.start();
}

/* =========================
   SHARD CLASS
========================= */
class Shard {
  constructor(id, players) {
    this.id = id;
    this.players = new Map(); // playerId -> state
    this.sockets = new Map(); // playerId -> ws
    this.inputBuffer = new Map(); // playerId -> frame -> input
    this.frame = 0;
    this.interval = null;

    for (const p of players) {
      this.players.set(p.playerId, {
        x: 0,
        z: 0,
        vx: 0,
        vz: 0
      });
      this.sockets.set(p.playerId, p.ws);
      this.inputBuffer.set(p.playerId, new Map());

      p.ws.on("message", data => this.onMessage(p.playerId, data));
      p.ws.on("close", () => this.removePlayer(p.playerId));
    }
  }

  /* =========================
     START / STOP
  ========================= */
  start() {
    this.interval = setInterval(
      () => this.tick(),
      1000 / WORLD.TICK_RATE
    );
  }

  stop() {
    clearInterval(this.interval);
    shards.delete(this.id);
  }

  /* =========================
     NETWORK INPUT
  ========================= */
  onMessage(playerId, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.t !== MSG.INPUT) return;
    if (!validateInput(msg.d)) return;

    const buffer = this.inputBuffer.get(playerId);
    buffer.set(msg.d.frame, msg.d);
  }

  /* =========================
     SIMULATION TICK
  ========================= */
  tick() {
    this.simulate();
    this.broadcast();
    recordFrame(this.id, this.frame, this.snapshot());
    this.frame++;
  }

  /* =========================
     SIMULATION STEP
  ========================= */
  simulate() {
    for (const [id, state] of this.players) {
      const buffer = this.inputBuffer.get(id);
      const input = buffer.get(this.frame) || { dx: 0, dz: 0 };

      // Anti-cheat validation
      if (!validateMovement(state, input)) continue;

      // Simple deterministic physics
      state.vx = input.dx * WORLD.MAX_SPEED;
      state.vz = input.dz * WORLD.MAX_SPEED;

      state.x += state.vx / WORLD.TICK_RATE;
      state.z += state.vz / WORLD.TICK_RATE;

      // World bounds
      state.x = Math.max(-WORLD.WORLD_SIZE, Math.min(WORLD.WORLD_SIZE, state.x));
      state.z = Math.max(-WORLD.WORLD_SIZE, Math.min(WORLD.WORLD_SIZE, state.z));
    }
  }

  /* =========================
     SNAPSHOT
  ========================= */
  snapshot() {
    const snap = {};
    for (const [id, s] of this.players) {
      snap[id] = { x: s.x, z: s.z };
    }
    return snap;
  }

  /* =========================
     BROADCAST (INTEREST MGMT)
  ========================= */
  broadcast() {
    for (const [id, ws] of this.sockets) {
      if (ws.readyState !== 1) continue;

      const visible = getInterestSet(
        id,
        this.players
      );

      ws.send(encode(MSG.SNAPSHOT, {
        frame: this.frame,
        state: visible
      }));
    }
  }

  /* =========================
     PLAYER REMOVAL
  ========================= */
  removePlayer(playerId) {
    this.players.delete(playerId);
    this.sockets.delete(playerId);
    this.inputBuffer.delete(playerId);

    if (this.players.size === 0) {
      this.stop();
    }
  }
}