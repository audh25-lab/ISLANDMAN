/* ============================================================
   Island Man MMO – Gateway Service
   File: services/gateway.js
   Purpose:
     - Entry point for all clients
     - Handshake & protocol validation
     - Rate limiting
     - Routes players into matchmaking
============================================================ */

import { WebSocketServer } from "ws";
import {
  MSG,
  PROTOCOL_VERSION,
  decode,
  encode,
  validateHandshake
} from "../shared/protocol.js";
import { enqueuePlayer } from "./matchmaking.js";

/* =========================
   SERVER CONFIG
========================= */
const PORT = process.env.PORT || 8080;
const MAX_MSGS_PER_SEC = 120;

/* =========================
   WEBSOCKET SERVER
========================= */
const wss = new WebSocketServer({
  port: PORT,
  maxPayload: 1024
});

console.log(`[Gateway] Listening on :${PORT}`);

/* =========================
   CONNECTION STATE
========================= */
const connections = new Map();

/* =========================
   RATE LIMITING
========================= */
function rateLimit(ws) {
  const now = Date.now();
  const c = connections.get(ws);
  if (!c) return false;

  if (now - c.lastTick >= 1000) {
    c.lastTick = now;
    c.msgCount = 0;
  }

  c.msgCount++;
  return c.msgCount > MAX_MSGS_PER_SEC;
}

/* =========================
   CONNECTION HANDLING
========================= */
wss.on("connection", ws => {
  connections.set(ws, {
    handshake: false,
    playerId: null,
    msgCount: 0,
    lastTick: Date.now()
  });

  ws.on("message", raw => {
    if (rateLimit(ws)) {
      ws.send(encode(MSG.ERROR, {
        code: "RATE_LIMIT",
        reason: "Too many messages"
      }));
      ws.close();
      return;
    }

    const msg = decode(raw);
    if (!msg) {
      ws.close();
      return;
    }

    const state = connections.get(ws);

    /* =========================
       HANDSHAKE PHASE
    ========================= */
    if (!state.handshake) {
      if (msg.t !== MSG.HANDSHAKE || !validateHandshake(msg.d)) {
        ws.send(encode(MSG.ERROR, {
          code: "BAD_HANDSHAKE",
          reason: "Invalid handshake"
        }));
        ws.close();
        return;
      }

      state.handshake = true;
      state.playerId = msg.d.playerId;

      ws.send(encode(MSG.HANDSHAKE, {
        ok: true,
        version: PROTOCOL_VERSION
      }));

      return;
    }

    /* =========================
       POST-HANDSHAKE ROUTING
    ========================= */
    switch (msg.t) {
      case MSG.JOIN_QUEUE:
        enqueuePlayer(ws, state.playerId);
        break;

      default:
        ws.send(encode(MSG.ERROR, {
          code: "UNKNOWN_MESSAGE",
          reason: msg.t
        }));
    }
  });

  ws.on("close", () => {
    connections.delete(ws);
  });

  ws.on("error", () => {
    connections.delete(ws);
  });
});