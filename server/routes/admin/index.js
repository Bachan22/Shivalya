/**
 * server/routes/admin/index.js
 * Admin API endpoints under /api/v1/admin
 * All routes require authentication (session-based).
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { pool, transaction, auditLog } = require('../../db/pool');
const { requireAuth, requireRole, csrfProtection } = require('../../middleware/auth');
const { validateBody, loginSchema, changePasswordSchema, z } = require('../../middleware/validate');
const upload = require('../../middleware/upload');
const rateLimit = require('express-rate-limit');

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

// ── Rate limiter for login ────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 500 : 10,
  message: { success: false, error: 'Too many login attempts. Try again later.' },
  keyGenerator: (req) => req.ip,
});

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════

// ── POST /auth/login ──────────────────────────────────────────
router.post('/auth/login', loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated;
    const [users] = await pool.execute(
      'SELECT * FROM admin_users WHERE email = ?', [email]
    );

    if (!users.length) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const user = users[0];

    // Check lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({
        success: false,
        error: `Account locked. Try again in ${mins} minute(s).`,
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account is disabled.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      // Increment failed count
      let lockUntil = null;
      const newCount = user.failed_login_count + 1;
      if (newCount >= MAX_FAILED_LOGINS) {
        lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      }
      await pool.execute(
        'UPDATE admin_users SET failed_login_count = ?, locked_until = ? WHERE id = ?',
        [newCount, lockUntil, user.id]
      );
      const remaining = MAX_FAILED_LOGINS - newCount;
      const msg = remaining > 0
        ? `Invalid password. ${remaining} attempt(s) remaining.`
        : `Account locked for ${LOCKOUT_MINUTES} minutes.`;
      return res.status(401).json({ success: false, error: msg });
    }

    // Success — reset failed count, update last login
    await pool.execute(
      'UPDATE admin_users SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Set session
    req.session.adminUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      must_change_password: user.must_change_password,
    };

    // Set CSRF token cookie
    const csrfToken = crypto.randomBytes(32).toString('hex');
    req.session.csrfToken = csrfToken;
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false, // JS needs to read it for the header
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({
      success: true,
      data: {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        must_change_password: !!user.must_change_password,
        csrf_token: csrfToken,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /auth/logout ─────────────────────────────────────────
router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('shivalya.sid');
    res.clearCookie('csrf_token');
    res.json({ success: true, data: { message: 'Logged out.' } });
  });
});

// ── GET /auth/me ──────────────────────────────────────────────
router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, data: req.adminUser });
});

// ── POST /auth/change-password ────────────────────────────────
router.post('/auth/change-password', requireAuth, csrfProtection, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    const { current_password, new_password } = req.validated;
    const [users] = await pool.execute('SELECT password_hash FROM admin_users WHERE id = ?', [req.adminUser.id]);
    if (!users.length) return res.status(404).json({ success: false, error: 'User not found.' });

    const match = await bcrypt.compare(current_password, users[0].password_hash);
    if (!match) return res.status(401).json({ success: false, error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.execute(
      'UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [hash, req.adminUser.id]
    );

    // Update session
    req.session.adminUser.must_change_password = false;

    res.json({ success: true, data: { message: 'Password changed successfully.' } });
  } catch (err) { next(err); }
});

// Apply auth + CSRF to all routes below
router.use(requireAuth);
router.use(csrfProtection);

// ══════════════════════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════════════════════

// ── GET /products ─────────────────────────────────────────────
router.get('/products', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.sort_order`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── POST /products ────────────────────────────────────────────
router.post('/products', async (req, res, next) => {
  try {
    const b = req.body;
    const slug = (b.slug || b.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [result] = await pool.execute(
      `INSERT INTO products (slug, category_id, name, short_description, description, image_path, price_unit, is_active, is_featured, sort_order, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, b.category_id || null, b.name, b.short_description || null, b.description || null,
       b.image_path || null, b.price_unit || null, b.is_active !== undefined ? b.is_active : 1,
       b.is_featured !== undefined ? b.is_featured : 1, b.sort_order || 0,
       b.seo_title || null, b.seo_description || null]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'products', rowId: result.insertId, action: 'create', newValues: b });
    res.status(201).json({ success: true, data: { id: result.insertId, slug } });
  } catch (err) { next(err); }
});

// ── PUT /products/:id ─────────────────────────────────────────
router.put('/products/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const id = req.params.id;

    // Fetch old values for audit
    const [old] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Product not found.' });

    const slug = b.slug || old[0].slug;
    await pool.execute(
      `UPDATE products SET slug=?, category_id=?, name=?, short_description=?, description=?,
       image_path=?, price_unit=?, is_active=?, is_featured=?, sort_order=?, seo_title=?, seo_description=?
       WHERE id=?`,
      [slug, b.category_id !== undefined ? b.category_id : old[0].category_id,
       b.name || old[0].name, b.short_description !== undefined ? b.short_description : old[0].short_description,
       b.description !== undefined ? b.description : old[0].description,
       b.image_path !== undefined ? b.image_path : old[0].image_path,
       b.price_unit !== undefined ? b.price_unit : old[0].price_unit,
       b.is_active !== undefined ? b.is_active : old[0].is_active,
       b.is_featured !== undefined ? b.is_featured : old[0].is_featured,
       b.sort_order !== undefined ? b.sort_order : old[0].sort_order,
       b.seo_title !== undefined ? b.seo_title : old[0].seo_title,
       b.seo_description !== undefined ? b.seo_description : old[0].seo_description,
       id]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'products', rowId: id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Product updated.' } });
  } catch (err) { next(err); }
});

// ── DELETE /products/:id ──────────────────────────────────────
router.delete('/products/:id', async (req, res, next) => {
  try {
    const [old] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Product not found.' });

    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'products', rowId: req.params.id, action: 'delete', oldValues: old[0] });
    res.json({ success: true, data: { message: 'Product deleted.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  VARIANTS
// ══════════════════════════════════════════════════════════════

router.get('/variants/:productId', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY sort_order',
      [req.params.productId]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/variants', async (req, res, next) => {
  try {
    const b = req.body;
    const [result] = await pool.execute(
      `INSERT INTO product_variants (product_id, label, thickness_micron, length_m, width_ft, weight_kg, ply, price, price_unit, includes_transport, is_active, sort_order, extra_attributes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.product_id, b.label, b.thickness_micron || null, b.length_m || null, b.width_ft || null,
       b.weight_kg || null, b.ply || null, b.price || null, b.price_unit || 'per unit',
       b.includes_transport || 0, b.is_active !== undefined ? b.is_active : 1,
       b.sort_order || 0, b.extra_attributes ? JSON.stringify(b.extra_attributes) : null]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'product_variants', rowId: result.insertId, action: 'create', newValues: b });
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) { next(err); }
});

router.put('/variants/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const [old] = await pool.execute('SELECT * FROM product_variants WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Variant not found.' });

    await pool.execute(
      `UPDATE product_variants SET label=?, thickness_micron=?, length_m=?, width_ft=?, weight_kg=?,
       ply=?, price=?, price_unit=?, includes_transport=?, is_active=?, sort_order=?, extra_attributes=?
       WHERE id=?`,
      [b.label !== undefined ? b.label : old[0].label,
       b.thickness_micron !== undefined ? b.thickness_micron : old[0].thickness_micron,
       b.length_m !== undefined ? b.length_m : old[0].length_m,
       b.width_ft !== undefined ? b.width_ft : old[0].width_ft,
       b.weight_kg !== undefined ? b.weight_kg : old[0].weight_kg,
       b.ply !== undefined ? b.ply : old[0].ply,
       b.price !== undefined ? b.price : old[0].price,
       b.price_unit !== undefined ? b.price_unit : old[0].price_unit,
       b.includes_transport !== undefined ? b.includes_transport : old[0].includes_transport,
       b.is_active !== undefined ? b.is_active : old[0].is_active,
       b.sort_order !== undefined ? b.sort_order : old[0].sort_order,
       b.extra_attributes !== undefined ? JSON.stringify(b.extra_attributes) : old[0].extra_attributes,
       req.params.id]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'product_variants', rowId: req.params.id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Variant updated.' } });
  } catch (err) { next(err); }
});

router.delete('/variants/:id', async (req, res, next) => {
  try {
    const [old] = await pool.execute('SELECT * FROM product_variants WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Variant not found.' });
    await pool.execute('DELETE FROM product_variants WHERE id = ?', [req.params.id]);
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'product_variants', rowId: req.params.id, action: 'delete', oldValues: old[0] });
    res.json({ success: true, data: { message: 'Variant deleted.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  CATEGORIES
// ══════════════════════════════════════════════════════════════

router.get('/categories', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM categories ORDER BY sort_order');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/categories', async (req, res, next) => {
  try {
    const b = req.body;
    const slug = (b.slug || b.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [result] = await pool.execute(
      'INSERT INTO categories (slug, name, short_description, image_path, sort_order, is_active) VALUES (?,?,?,?,?,?)',
      [slug, b.name, b.short_description || null, b.image_path || null, b.sort_order || 0, b.is_active !== undefined ? b.is_active : 1]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'categories', rowId: result.insertId, action: 'create', newValues: b });
    res.status(201).json({ success: true, data: { id: result.insertId, slug } });
  } catch (err) { next(err); }
});

router.put('/categories/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const [old] = await pool.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Category not found.' });
    await pool.execute(
      'UPDATE categories SET slug=?, name=?, short_description=?, image_path=?, sort_order=?, is_active=? WHERE id=?',
      [b.slug || old[0].slug, b.name || old[0].name, b.short_description !== undefined ? b.short_description : old[0].short_description,
       b.image_path !== undefined ? b.image_path : old[0].image_path, b.sort_order !== undefined ? b.sort_order : old[0].sort_order,
       b.is_active !== undefined ? b.is_active : old[0].is_active, req.params.id]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'categories', rowId: req.params.id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Category updated.' } });
  } catch (err) { next(err); }
});

router.delete('/categories/:id', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'categories', rowId: req.params.id, action: 'delete' });
    res.json({ success: true, data: { message: 'Category deleted.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  GALLERY
// ══════════════════════════════════════════════════════════════

router.get('/gallery', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM gallery_items ORDER BY sort_order');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/gallery', async (req, res, next) => {
  try {
    const b = req.body;
    const [result] = await pool.execute(
      'INSERT INTO gallery_items (title, image_path, category, sort_order, is_active) VALUES (?,?,?,?,?)',
      [b.title, b.image_path, b.category || null, b.sort_order || 0, b.is_active !== undefined ? b.is_active : 1]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'gallery_items', rowId: result.insertId, action: 'create', newValues: b });
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) { next(err); }
});

router.put('/gallery/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const [old] = await pool.execute('SELECT * FROM gallery_items WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Gallery item not found.' });
    await pool.execute(
      'UPDATE gallery_items SET title=?, image_path=?, category=?, sort_order=?, is_active=? WHERE id=?',
      [b.title || old[0].title, b.image_path || old[0].image_path, b.category !== undefined ? b.category : old[0].category,
       b.sort_order !== undefined ? b.sort_order : old[0].sort_order, b.is_active !== undefined ? b.is_active : old[0].is_active, req.params.id]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'gallery_items', rowId: req.params.id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Gallery item updated.' } });
  } catch (err) { next(err); }
});

router.delete('/gallery/:id', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM gallery_items WHERE id = ?', [req.params.id]);
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'gallery_items', rowId: req.params.id, action: 'delete' });
    res.json({ success: true, data: { message: 'Gallery item deleted.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  INDUSTRIES
// ══════════════════════════════════════════════════════════════

router.get('/industries', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM industries ORDER BY sort_order');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post('/industries', async (req, res, next) => {
  try {
    const b = req.body;
    const slug = (b.slug || b.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [result] = await pool.execute(
      'INSERT INTO industries (slug, name, description, image_path, sort_order, is_active) VALUES (?,?,?,?,?,?)',
      [slug, b.name, b.description || null, b.image_path || null, b.sort_order || 0, b.is_active !== undefined ? b.is_active : 1]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'industries', rowId: result.insertId, action: 'create', newValues: b });
    res.status(201).json({ success: true, data: { id: result.insertId, slug } });
  } catch (err) { next(err); }
});

router.put('/industries/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const [old] = await pool.execute('SELECT * FROM industries WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Industry not found.' });
    await pool.execute(
      'UPDATE industries SET slug=?, name=?, description=?, image_path=?, sort_order=?, is_active=? WHERE id=?',
      [b.slug || old[0].slug, b.name || old[0].name, b.description !== undefined ? b.description : old[0].description,
       b.image_path || old[0].image_path, b.sort_order !== undefined ? b.sort_order : old[0].sort_order,
       b.is_active !== undefined ? b.is_active : old[0].is_active, req.params.id]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'industries', rowId: req.params.id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Industry updated.' } });
  } catch (err) { next(err); }
});

router.delete('/industries/:id', async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM industries WHERE id = ?', [req.params.id]);
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'industries', rowId: req.params.id, action: 'delete' });
    res.json({ success: true, data: { message: 'Industry deleted.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  PAGES CONTENT
// ══════════════════════════════════════════════════════════════

router.get('/pages', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM pages_content ORDER BY page_slug, sort_order');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.put('/pages/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const [old] = await pool.execute('SELECT * FROM pages_content WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Page section not found.' });
    await pool.execute(
      'UPDATE pages_content SET title=?, body=?, image_path=?, sort_order=?, is_active=? WHERE id=?',
      [b.title !== undefined ? b.title : old[0].title, b.body !== undefined ? b.body : old[0].body,
       b.image_path !== undefined ? b.image_path : old[0].image_path,
       b.sort_order !== undefined ? b.sort_order : old[0].sort_order,
       b.is_active !== undefined ? b.is_active : old[0].is_active, req.params.id]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'pages_content', rowId: req.params.id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Page content updated.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  SITE SETTINGS
// ══════════════════════════════════════════════════════════════

router.get('/settings', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM site_settings ORDER BY setting_key');
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.put('/settings/:key', async (req, res, next) => {
  try {
    const { value } = req.body;
    const [old] = await pool.execute('SELECT * FROM site_settings WHERE setting_key = ?', [req.params.key]);
    await pool.execute(
      'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      [req.params.key, value, value]
    );
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'site_settings', rowId: null, action: 'update',
      oldValues: old.length ? { [req.params.key]: old[0].setting_value } : null,
      newValues: { [req.params.key]: value } });
    res.json({ success: true, data: { message: 'Setting updated.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  QUOTES
// ══════════════════════════════════════════════════════════════

router.get('/quotes', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = [];
    let params = [];
    if (status) { where.push('status = ?'); params.push(status); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM quote_requests ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT * FROM quote_requests ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: rows, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
});

router.put('/quotes/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const [old] = await pool.execute('SELECT * FROM quote_requests WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Quote not found.' });

    const fields = [];
    const vals = [];
    if (b.status !== undefined) { fields.push('status = ?'); vals.push(b.status); }
    if (b.admin_notes !== undefined) { fields.push('admin_notes = ?'); vals.push(b.admin_notes); }
    if (!fields.length) return res.status(400).json({ success: false, error: 'Nothing to update.' });

    vals.push(req.params.id);
    await pool.execute(`UPDATE quote_requests SET ${fields.join(', ')} WHERE id = ?`, vals);
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'quote_requests', rowId: req.params.id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Quote updated.' } });
  } catch (err) { next(err); }
});

// CSV export
router.get('/quotes/export/csv', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM quote_requests ORDER BY created_at DESC');
    const header = 'Reference,Product,Variant,Specification,Quantity,Name,Phone,Email,Status,Notes,Date\n';
    const csvRows = rows.map(r =>
      `"${r.reference_no}","${r.product_name_snapshot || ''}","${r.variant_label_snapshot || ''}","${r.specification || ''}","${r.quantity || ''}","${r.name}","${r.phone}","${r.email || ''}","${r.status}","${(r.admin_notes || '').replace(/"/g, '""')}","${r.created_at}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=quotes.csv');
    res.send(header + csvRows);
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  CONTACT MESSAGES
// ══════════════════════════════════════════════════════════════

router.get('/contact-messages', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = [];
    let params = [];
    if (status) { where.push('status = ?'); params.push(status); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const [countRows] = await pool.execute(`SELECT COUNT(*) as total FROM contact_messages ${whereClause}`, params);
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT * FROM contact_messages ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: rows, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (err) { next(err); }
});

router.put('/contact-messages/:id', async (req, res, next) => {
  try {
    const b = req.body;
    const [old] = await pool.execute('SELECT * FROM contact_messages WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ success: false, error: 'Message not found.' });
    if (b.status) {
      await pool.execute('UPDATE contact_messages SET status = ? WHERE id = ?', [b.status, req.params.id]);
    }
    await auditLog(null, { adminUserId: req.adminUser.id, tableName: 'contact_messages', rowId: req.params.id, action: 'update', oldValues: old[0], newValues: b });
    res.json({ success: true, data: { message: 'Message updated.' } });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════
//  IMAGE UPLOAD
// ══════════════════════════════════════════════════════════════

router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }
  const imagePath = `uploads/products/${req.file.filename}`;
  res.json({ success: true, data: { image_path: imagePath, filename: req.file.filename } });
});

// ── GET /audit-log ────────────────────────────────────────────
router.get('/audit-log', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const [rows] = await pool.execute(
      `SELECT a.*, u.full_name as admin_name, u.email as admin_email 
       FROM audit_log a 
       LEFT JOIN admin_users u ON a.admin_user_id = u.id 
       ORDER BY a.created_at DESC LIMIT ${limit}`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

module.exports = router;

