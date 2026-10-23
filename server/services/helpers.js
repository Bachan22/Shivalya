/**
 * server/services/helpers.js
 * Shared utilities: reference number generator, WhatsApp link builder, IP hasher.
 */
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Generate a unique quote reference number: SAQ-YYYYMMDD-XXXX
 */
function generateReferenceNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `SAQ-${date}-${rand}`;
}

/**
 * Build a WhatsApp deep link with a prefilled message.
 */
function whatsappLink(message) {
  const num = env.WHATSAPP_NUMBER;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

/**
 * Hash an IP address for privacy (SHA-256, one-way).
 */
function hashIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + '_shivalya_salt').digest('hex');
}

/**
 * Escape HTML entities to prevent XSS when stored data is rendered.
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = { generateReferenceNo, whatsappLink, hashIP, escapeHtml };
