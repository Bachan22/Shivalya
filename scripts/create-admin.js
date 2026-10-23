/**
 * scripts/create-admin.js
 * Creates the initial admin user from ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD
 * in the .env file. Password is hashed with bcrypt (cost 12).
 * The user is flagged with must_change_password = 1.
 * Safe to run multiple times (updates existing admin if email matches).
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email || !password) {
    console.error('✗ Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD in your .env file.');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('✗ ADMIN_INITIAL_PASSWORD must be at least 6 characters.');
    process.exit(1);
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'shivalya_agrotech',
    });

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await conn.execute(
      `INSERT INTO admin_users (full_name, email, password_hash, role, must_change_password, is_active)
       VALUES (?, ?, ?, 'admin', 1, 1)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         must_change_password = 1`,
      ['Admin', email, hash]
    );

    console.log('\n══════════════════════════════════════════');
    console.log('  ✓ Admin user created/updated!');
    console.log(`  Email:    ${email}`);
    console.log('  Password: (as set in ADMIN_INITIAL_PASSWORD)');
    console.log('  Note:     You will be asked to change your');
    console.log('            password on first login.');
    console.log('══════════════════════════════════════════\n');
  } catch (err) {
    console.error(`✗ Failed to create admin: ${err.message}`);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
