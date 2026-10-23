/**
 * tests/api.test.js
 * Comprehensive API & Database test suite using Node.js built-in test runner.
 * Run with: npm test
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shivalya_agrotech',
};

let dbConn;
let adminCookie = '';
let csrfToken = '';

before(async () => {
  dbConn = await mysql.createConnection(DB_CONFIG);
});

after(async () => {
  if (dbConn) await dbConn.end();
});

describe('A. Database Verification', () => {
  test('Seed matches exact 5 Mulching Film variants & prices', async () => {
    const [rows] = await dbConn.execute(`
      SELECT pv.thickness_micron, pv.width_ft, pv.length_m, pv.weight_kg, pv.price 
      FROM product_variants pv 
      JOIN products p ON pv.product_id = p.id 
      WHERE p.slug = 'mulching-film' 
      ORDER BY pv.price ASC
    `);

    assert.equal(rows.length, 5, 'Must have exactly 5 mulching film variants');

    const expected = [
      { thickness_micron: 20, width_ft: '3.25', weight_kg: '7.00', price: '750.00' },
      { thickness_micron: 20, width_ft: '4.00', weight_kg: '7.50', price: '900.00' },
      { thickness_micron: 25, width_ft: '3.25', weight_kg: '8.50', price: '1050.00' },
      { thickness_micron: 25, width_ft: '4.00', weight_kg: '9.50', price: '1250.00' },
      { thickness_micron: 30, width_ft: '4.00', weight_kg: '10.50', price: '1550.00' },
    ];

    for (let i = 0; i < expected.length; i++) {
      assert.equal(Number(rows[i].thickness_micron), expected[i].thickness_micron);
      assert.equal(Number(rows[i].width_ft).toFixed(2), expected[i].width_ft);
      assert.equal(Number(rows[i].weight_kg).toFixed(2), expected[i].weight_kg);
      assert.equal(Number(rows[i].price).toFixed(2), expected[i].price);
    }
  });

  test('Seed matches exact 3 Jute Thread variants & prices', async () => {
    const [rows] = await dbConn.execute(`
      SELECT pv.ply, pv.price, pv.includes_transport 
      FROM product_variants pv 
      JOIN products p ON pv.product_id = p.id 
      WHERE p.slug = 'jute-thread' 
      ORDER BY pv.ply ASC
    `);

    assert.equal(rows.length, 3, 'Must have exactly 3 jute thread variants');
    assert.equal(rows[0].ply, 6);
    assert.equal(Number(rows[0].price), 130);
    assert.equal(rows[1].ply, 7);
    assert.equal(Number(rows[1].price), 140);
    assert.equal(rows[2].ply, 8);
    assert.equal(Number(rows[2].price), 150);
  });

  test('Foreign key cascade deletes variants when product is deleted', async () => {
    // Insert a temp product
    const [cat] = await dbConn.execute('SELECT id FROM categories LIMIT 1');
    const [res] = await dbConn.execute(
      'INSERT INTO products (category_id, slug, name, is_active) VALUES (?, ?, ?, 1)',
      [cat[0].id, 'temp-cascade-test', 'Temp Product']
    );
    const tempId = res.insertId;

    // Insert a variant
    await dbConn.execute(
      'INSERT INTO product_variants (product_id, label, price, is_active) VALUES (?, ?, 500, 1)',
      [tempId, 'Temp Variant']
    );

    // Delete product
    await dbConn.execute('DELETE FROM products WHERE id = ?', [tempId]);

    // Check variant was cascaded
    const [vRows] = await dbConn.execute('SELECT * FROM product_variants WHERE product_id = ?', [tempId]);
    assert.equal(vRows.length, 0, 'Variants must be automatically deleted on CASCADE');
  });

  test('Duplicate product slug is rejected by unique constraint', async () => {
    const [cat] = await dbConn.execute('SELECT id FROM categories LIMIT 1');
    let rejected = false;
    try {
      await dbConn.execute(
        'INSERT INTO products (category_id, slug, name, is_active) VALUES (?, "mulching-film", "Duplicate", 1)',
        [cat[0].id]
      );
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.message.includes('Duplicate entry')) {
        rejected = true;
      }
    }
    assert.ok(rejected, 'Must reject duplicate slug with unique constraint');
  });
});

describe('B. Public API Endpoints', () => {
  test('GET /api/v1/health returns 200 and DB status', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'ok');
    assert.equal(body.data.db, 'connected');
  });

  test('GET /api/v1/categories returns list of categories', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/categories`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3);
  });

  test('GET /api/v1/products returns products list with pagination', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/products`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.length >= 6);
    assert.ok(body.pagination);
  });

  test('GET /api/v1/products?q=mulch searches case-insensitively', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/products?q=mUlCh`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.some(p => p.slug === 'mulching-film'));
  });

  test('GET /api/v1/products/:slug returns product with variants', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/products/mulching-film`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'Mulching Film');
    assert.equal(body.data.variants.length, 5);
  });

  test('GET /api/v1/products/:slug returns 404 for unknown product', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/products/unknown-item-404`);
    assert.equal(res.status, 404);
  });

  test('GET /api/v1/settings/public returns company contact details', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/settings/public`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.phone);
    assert.ok(body.data.email);
    assert.ok(body.data.gstin);
  });

  test('GET /api/v1/pages/about returns sections', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/pages/about`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.length >= 1);
  });

  test('POST /api/v1/quotes validation rejects invalid phone numbers', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: 'Mulching Film',
        name: 'Test',
        phone: '12345', // invalid
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.errors.some(e => e.field === 'phone'));
  });

  test('POST /api/v1/quotes honeypot blocks automated bot without DB write', async () => {
    const initialCountRes = await dbConn.execute('SELECT COUNT(*) as cnt FROM quote_requests');
    const beforeCount = initialCountRes[0][0].cnt;

    const res = await fetch(`${BASE_URL}/api/v1/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: 'Mulching Film',
        name: 'Spam Bot',
        phone: '9876543210',
        website: 'http://spam.com', // Honeypot filled
      }),
    });
    // Rejected with 400 Bot detected
    assert.equal(res.status, 400);

    const afterCountRes = await dbConn.execute('SELECT COUNT(*) as cnt FROM quote_requests');
    const afterCount = afterCountRes[0][0].cnt;
    assert.equal(afterCount, beforeCount, 'Honeypot request must NOT write to database');
  });

  test('POST /api/v1/quotes saves valid enquiry, returns ref no & WhatsApp link', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/quotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: 'Mulching Film',
        specification: '25 micron, 4 ft',
        quantity: '50 rolls',
        name: 'Harpreet Singh',
        phone: '+91 98765 43210',
        source_page: 'index.html',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.reference_no.startsWith('SAQ-'));
    assert.ok(body.data.whatsapp_link.includes('wa.me'));

    // Verify row in database
    const [rows] = await dbConn.execute(
      'SELECT * FROM quote_requests WHERE reference_no = ?',
      [body.data.reference_no]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, 'Harpreet Singh');
    assert.equal(rows[0].status, 'new');
  });

  test('POST /api/v1/contact saves contact message & returns WhatsApp link', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rajesh Sharma',
        phone: '9950337442',
        email: 'rajesh@example.com',
        subject: 'Dealership Enquiry',
        message: 'Interested in becoming a distributor for Haryana.',
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.whatsapp_link);
  });

  test('SQL Injection payloads are safely handled', async () => {
    const sqli = "' OR 1=1; DROP TABLE products; --";
    const res = await fetch(`${BASE_URL}/api/v1/products?q=${encodeURIComponent(sqli)}`);
    assert.equal(res.status, 200);
    // Verify products table still exists
    const [tables] = await dbConn.execute("SHOW TABLES LIKE 'products'");
    assert.equal(tables.length, 1, 'Products table must not be dropped by SQL injection');
  });
});

describe('C. Admin Security & Operations', () => {
  test('Unauthenticated user cannot access /admin static dashboard (redirects to /admin/login.html)', async () => {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/admin/login.html');
  });

  test('Unauthenticated user cannot access /api/v1/admin/products (401)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/products`);
    assert.equal(res.status, 401);
  });

  test('Admin login with wrong password returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@shivalya.com',
        password: 'WrongPassword123',
      }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.ok(body.error.includes('Invalid password'));
  });

  test('Admin login with correct password returns session and CSRF token', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@shivalya.com',
        password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.csrf_token);
    csrfToken = body.data.csrf_token;

    // Extract all set cookies
    const cookies = res.headers.getSetCookie();
    assert.ok(cookies.length >= 1);
    adminCookie = cookies.map(c => c.split(';')[0]).join('; ');
  });

  test('State-changing admin request without CSRF token returns 403', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        // No X-CSRF-Token
      },
      body: JSON.stringify({
        category_id: 1,
        name: 'CSRF Test Product',
        slug: 'csrf-test-product',
      }),
    });
    assert.equal(res.status, 403);
  });

  let createdProductId = null;

  test('Authenticated admin can create product (with CSRF token)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        category_id: 1,
        name: 'Automated Test Mulch',
        slug: 'auto-test-mulch-' + Date.now(),
        short_description: 'Test short description',
        description: 'Test full description',
        is_active: 1,
        is_featured: 0,
        sort_order: 99,
      }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    createdProductId = body.data.id;

    // Verify audit log has recorded creation
    const [audit] = await dbConn.execute(
      'SELECT * FROM audit_log WHERE table_name = "products" AND row_id = ? AND action = "create"',
      [createdProductId]
    );
    assert.equal(audit.length, 1);
  });

  test('Authenticated admin can hide and edit product', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie,
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        is_active: 0, // Hide
      }),
    });
    assert.equal(res.status, 200);

    // Verify in public API that hidden product is not returned
    const pubRes = await fetch(`${BASE_URL}/api/v1/products`);
    const pubBody = await pubRes.json();
    assert.ok(!pubBody.data.some(p => p.id === createdProductId), 'Hidden product must not appear on public API');
  });

  test('Authenticated admin can delete product', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/products/${createdProductId}`, {
      method: 'DELETE',
      headers: {
        'Cookie': adminCookie,
        'X-CSRF-Token': csrfToken,
      },
    });
    assert.equal(res.status, 200);

    const [rows] = await dbConn.execute('SELECT * FROM products WHERE id = ?', [createdProductId]);
    assert.equal(rows.length, 0);
  });

  test('Authenticated admin can export quotes to CSV', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/quotes/export/csv`, {
      headers: { 'Cookie': adminCookie },
    });
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('content-type').includes('text/csv'));
    const csv = await res.text();
    assert.ok(csv.includes('Reference,Product,Variant,Specification'));
  });

  test('Admin logout destroys session & clears cookies', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/auth/logout`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie },
    });
    assert.equal(res.status, 200);

    // Next request with same cookie should be 401
    const meRes = await fetch(`${BASE_URL}/api/v1/admin/auth/me`, {
      headers: { 'Cookie': adminCookie },
    });
    assert.equal(meRes.status, 401);
  });
});
