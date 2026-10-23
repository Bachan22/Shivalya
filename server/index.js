/**
 * server/index.js
 * Server entry point — starts the Express app with graceful shutdown.
 */
require('dotenv').config();
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./db/pool');

const server = app.listen(env.PORT, () => {
  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`  Shivalya Agrotech Server`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Port:        ${env.PORT}`);
  console.log(`  Frontend:    http://localhost:${env.PORT}`);
  console.log(`  Admin:       http://localhost:${env.PORT}/admin`);
  console.log(`  API:         http://localhost:${env.PORT}/api/v1/health`);
  console.log(`══════════════════════════════════════════════════\n`);
});

// ── Graceful shutdown ─────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log('Database pool closed.');
    } catch { /* ignore */ }
    process.exit(0);
  });
  // Force close after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
