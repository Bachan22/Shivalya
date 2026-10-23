/**
 * server/app.js
 * Express application setup — middleware, routes, static files, error handling.
 */
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const env = require('./config/env');
const { pool } = require('./db/pool');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts in frontend
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.ALLOWED_ORIGINS,
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// ── Session (MySQL-backed) ────────────────────────────────────
const sessionStore = new MySQLStore({
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000, // 15 min
  expiration: 24 * 60 * 60 * 1000, // 24 hours
  createDatabaseTable: false, // We create the table in schema
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data',
    },
  },
}, pool);

app.use(session({
  store: sessionStore,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.isProd,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  name: 'shivalya.sid',
}));

// ── Request logging ───────────────────────────────────────────
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// ── Static files ──────────────────────────────────────────────
// Serve frontend (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  extensions: ['html'],
}));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Admin panel auth guard ────────────────────────────────────
// Unauthenticated users cannot open admin pages
app.use('/admin', (req, res, next) => {
  const p = req.path;
  if (p === '/login.html' || p === '/login' || p.startsWith('/css/') || p.startsWith('/js/') || p.startsWith('/img/')) {
    return next();
  }
  if (!req.session || !req.session.adminUser) {
    return res.redirect('/admin/login.html');
  }
  next();
});

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), {
  extensions: ['html'],
}));

// ── API routes ────────────────────────────────────────────────
app.use('/api/v1', publicRoutes);
app.use('/api/v1/admin', adminRoutes);

// ── SPA fallback for admin ────────────────────────────────────
app.get('/admin/*', (req, res) => {
  if (!req.session || !req.session.adminUser) {
    return res.redirect('/admin/login.html');
  }
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
