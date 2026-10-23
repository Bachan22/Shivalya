/**
 * server/routes/public/index.js
 * All public API endpoints under /api/v1
 */
const express = require('express');
const router = express.Router();
const { pool, checkHealth } = require('../../db/pool');
const { validateBody, quoteSchema, contactSchema } = require('../../middleware/validate');
const { generateReferenceNo, whatsappLink, hashIP } = require('../../services/helpers');
const { notifyQuote, notifyContact } = require('../../services/email');
const rateLimit = require('express-rate-limit');
const env = require('../../config/env');

// ── Rate limiter for form submissions ─────────────────────────
const formLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 500,
  message: { success: false, error: 'Too many submissions. Please try again in 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
});

// ── GET /health ───────────────────────────────────────────────
router.get('/health', async (_req, res) => {
  try {
    await checkHealth();
    res.json({ success: true, data: { status: 'ok', db: 'connected' } });
  } catch {
    res.status(503).json({ success: false, error: 'Database unreachable.' });
  }
});

// ── GET /categories ───────────────────────────────────────────
router.get('/categories', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, slug, name, short_description, image_path, sort_order FROM categories WHERE is_active = 1 ORDER BY sort_order'
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── GET /products ─────────────────────────────────────────────
router.get('/products', async (req, res, next) => {
  try {
    const { category, q, featured, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let where = ['p.is_active = 1'];
    let params = [];

    if (category) {
      where.push('c.slug = ?');
      params.push(category);
    }
    if (featured === '1' || featured === 'true') {
      where.push('p.is_featured = 1');
    }
    if (q && q.trim()) {
      const search = q.trim();
      // Use LIKE for partial matching (works better for short queries)
      where.push('(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ?)');
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) as total FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereClause}`;
    const [countRows] = await pool.execute(countSql, params);
    const total = countRows[0].total;

    const sql = `SELECT p.id, p.slug, p.name, p.short_description, p.image_path, p.price_unit, p.is_featured,
                        c.name as category_name, c.slug as category_slug
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 ${whereClause}
                 ORDER BY p.sort_order
                 LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);
    const [rows] = await pool.execute(sql, params);

    res.json({
      success: true,
      data: rows,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (err) { next(err); }
});

// ── GET /products/:slug ───────────────────────────────────────
router.get('/products/:slug', async (req, res, next) => {
  try {
    const [products] = await pool.execute(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_active = 1`,
      [req.params.slug]
    );
    if (!products.length) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    const product = products[0];

    const [variants] = await pool.execute(
      'SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY sort_order',
      [product.id]
    );
    const [images] = await pool.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [product.id]
    );

    res.json({ success: true, data: { ...product, variants, images } });
  } catch (err) { next(err); }
});

// ── GET /gallery ──────────────────────────────────────────────
router.get('/gallery', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, image_path, category, sort_order FROM gallery_items WHERE is_active = 1 ORDER BY sort_order'
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── GET /industries ───────────────────────────────────────────
router.get('/industries', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, slug, name, description, image_path, sort_order FROM industries WHERE is_active = 1 ORDER BY sort_order'
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── GET /settings/public ──────────────────────────────────────
router.get('/settings/public', async (_req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT setting_key, setting_value FROM site_settings WHERE is_public = 1'
    );
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, data: settings });
  } catch (err) { next(err); }
});

// ── GET /pages/:slug ──────────────────────────────────────────
router.get('/pages/:slug', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT section_key, title, body, image_path, sort_order FROM pages_content WHERE page_slug = ? AND is_active = 1 ORDER BY sort_order',
      [req.params.slug]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── POST /quotes ──────────────────────────────────────────────
router.post('/quotes', formLimiter, validateBody(quoteSchema), async (req, res, next) => {
  try {
    const d = req.validated;
    const referenceNo = generateReferenceNo();
    const ipHash = hashIP(req.ip);
    const ua = (req.headers['user-agent'] || '').slice(0, 500);

    // Look up product_id by name if not provided
    let productId = null;
    if (d.product_id && d.product_id !== '') {
      productId = parseInt(d.product_id, 10) || null;
    } else if (d.product_name) {
      const [found] = await pool.execute('SELECT id FROM products WHERE name = ? LIMIT 1', [d.product_name]);
      if (found.length) productId = found[0].id;
    }

    await pool.execute(
      `INSERT INTO quote_requests
       (reference_no, product_id, product_name_snapshot, variant_label_snapshot, specification,
        quantity, quantity_unit, name, phone, email, message, source_page, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        referenceNo, productId, d.product_name || null, d.variant_label || null,
        d.specification || null, d.quantity || null, d.quantity_unit || null,
        d.name, d.phone, d.email || null, d.message || null,
        d.source_page || null, ipHash, ua,
      ]
    );

    // Attempt email notification (non-blocking, never fails the request)
    notifyQuote({ reference_no: referenceNo, ...d }).catch(() => {});

    const waLink = whatsappLink(
      `Enquiry ${referenceNo}\nProduct: ${d.product_name || '-'}\nVariant: ${d.variant_label || '-'}\nSpec: ${d.specification || '-'}\nQty: ${d.quantity || '-'}\nName: ${d.name}\nPhone: ${d.phone}`
    );

    res.status(201).json({
      success: true,
      data: { reference_no: referenceNo, whatsapp_link: waLink },
    });
  } catch (err) { next(err); }
});

// ── POST /contact ─────────────────────────────────────────────
router.post('/contact', formLimiter, validateBody(contactSchema), async (req, res, next) => {
  try {
    const d = req.validated;
    const ipHash = hashIP(req.ip);

    const [result] = await pool.execute(
      `INSERT INTO contact_messages (name, phone, email, subject, message, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [d.name, d.phone, d.email || null, d.subject || null, d.message, ipHash]
    );

    notifyContact(d).catch(() => {});

    const waLink = whatsappLink(
      `Hello, I am ${d.name}.\nPhone: ${d.phone}\n${d.subject ? 'Subject: ' + d.subject + '\n' : ''}${d.message}`
    );

    res.status(201).json({
      success: true,
      data: { id: result.insertId, whatsapp_link: waLink },
    });
  } catch (err) { next(err); }
});

module.exports = router;
