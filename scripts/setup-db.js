/**
 * scripts/setup-db.js
 * Creates the database, runs schema, indexes and seed SQL files in order.
 * Usage:
 *   npm run db:setup       — runs all 4 files (create, schema, indexes, seed)
 *   npm run db:seed        — runs only 003_seed.sql
 *   npm run db:reset       — drops and recreates the database, then runs all files
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

const DB_NAME = process.env.DB_NAME || 'shivalya_agrotech';

async function runSqlFile(conn, filename) {
  const filePath = path.join(DB_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ File not found: ${filename}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`  → Running ${filename}...`);
  await conn.query(sql);
  console.log(`  ✓ ${filename} completed.`);
}

async function main() {
  const args = process.argv.slice(2);
  const seedOnly = args.includes('--seed-only');
  const reset = args.includes('--reset');

  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log(`\n✓ Connected to MySQL at ${config.host}:${config.port}\n`);

    if (reset) {
      console.log(`  ⚠ Dropping database ${DB_NAME}...`);
      await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
      console.log(`  ✓ Database dropped.\n`);
    }

    if (seedOnly) {
      await conn.query(`USE \`${DB_NAME}\``);
      await runSqlFile(conn, '003_seed.sql');
    } else {
      await runSqlFile(conn, '000_create_database.sql');
      await runSqlFile(conn, '001_schema.sql');
      await runSqlFile(conn, '002_indexes.sql');
      await runSqlFile(conn, '003_seed.sql');
    }

    console.log('\n══════════════════════════════════════════');
    console.log('  ✓ Database setup completed successfully!');
    console.log('══════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n✗ Database setup failed:\n');
    console.error(`  Error: ${err.message}`);
    if (err.code === 'ECONNREFUSED') {
      console.error('  → Is MySQL running? Check: net start MySQL80');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  → Check DB_USER and DB_PASSWORD in your .env file.');
    }
    console.error('');
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
