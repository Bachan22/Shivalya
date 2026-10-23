/**
 * server/config/env.js
 * Validates and exports environment variables.
 */
require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'shivalya_agrotech',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-secret-change-me',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  NOTIFY_EMAIL: process.env.NOTIFY_EMAIL || '',
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || '919950337442',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim()),
  isProd: process.env.NODE_ENV === 'production',
};

module.exports = env;
