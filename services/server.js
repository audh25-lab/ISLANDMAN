/* ============================================================
   Island Man MMO – Server Bootstrap
   File: services/server.js
   Purpose:
     - Start and wire backend services
     - Provide clean shutdown
     - Cloud / Docker entry point
============================================================ */

import "./gateway.js";        // WebSocket entry point
import "./matchmaking.js";    // Queue + match creation
import "./ladder.js";         // Ranked ladder
import "./replay.js";         // Replay storage
import "./interest.js";       // AOI logic
import "./antiCheat.js";      // Server-side validation

/* =========================
   ENVIRONMENT
========================= */
const ENV = process.env.NODE_ENV || "development";
const PID = process.pid;

console.log(`
========================================
 Island Man MMO Server
 Environment : ${ENV}
 PID         : ${PID}
========================================
`);

/* =========================
   GRACEFUL SHUTDOWN
========================= */
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[Server] Shutting down (${signal})...`);

  // In production, you would:
  // - Stop accepting new connections
  // - Flush replays to disk / S3
  // - Persist ladder to DB
  // - Notify orchestrator (K8s / Fly.io)

  setTimeout(() => {
    console.log("[Server] Shutdown complete.");
    process.exit(0);
  }, 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", err => {
  console.error("[FATAL]", err);
  shutdown("uncaughtException");
});
process.on("unhandledRejection", err => {
  console.error("[FATAL PROMISE]", err);
  shutdown("unhandledRejection");
});

/* =========================
   HEARTBEAT
========================= */
setInterval(() => {
  if (ENV === "development") {
    console.log("[Server] Heartbeat OK");
  }
}, 30000);