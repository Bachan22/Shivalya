/**
 * server/db/pool.js
 * MySQL connection pool using mysql2/promise.
 * All queries use prepared statements via pool.execute().
 */
const mysql = require('mysql2/promise');
const env = require('../config/env');

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Dates as strings to avoid timezone issues
  dateStrings: true,
});

/**
 * Health check — verifies the DB is reachable.
 */
async function checkHealth() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

/**
 * Run a callback inside a transaction.
 */
async function transaction(callback) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Record an audit log entry.
 */
async function auditLog(conn, { adminUserId, tableName, rowId, action, oldValues, newValues }) {
  const sql = `INSERT INTO audit_log (admin_user_id, table_name, row_id, action, old_values, new_values)
               VALUES (?, ?, ?, ?, ?, ?)`;
  const connOrPool = conn || pool;
  await connOrPool.execute(sql, [
    adminUserId || null,
    tableName,
    rowId || null,
    action,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
  ]);
}

module.exports = { pool, checkHealth, transaction, auditLog };
