/**
 * server/services/email.js
 * Email notification service using Nodemailer.
 * Fails gracefully — quote/contact saves even if SMTP is down or unconfigured.
 */
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

// Only create transporter if SMTP is configured
if (env.SMTP_HOST && env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

/**
 * Send notification email. Returns true on success, false on failure.
 * Never throws — always logs errors silently.
 */
async function sendNotification({ subject, html }) {
  if (!transporter || !env.NOTIFY_EMAIL) {
    console.log('[EMAIL] SMTP not configured. Skipping email notification.');
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"Shivalya Agrotech" <${env.SMTP_USER}>`,
      to: env.NOTIFY_EMAIL,
      subject,
      html,
    });
    console.log(`[EMAIL] Notification sent: ${subject}`);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send notification: ${err.message}`);
    return false;
  }
}

/**
 * Notify about a new quote request.
 */
async function notifyQuote(quote) {
  return sendNotification({
    subject: `New Quote Request ${quote.reference_no}`,
    html: `
      <h3>New Quote Request: ${quote.reference_no}</h3>
      <p><b>Name:</b> ${quote.name}</p>
      <p><b>Phone:</b> ${quote.phone}</p>
      <p><b>Product:</b> ${quote.product_name_snapshot || 'Not specified'}</p>
      <p><b>Variant:</b> ${quote.variant_label_snapshot || '-'}</p>
      <p><b>Specification:</b> ${quote.specification || '-'}</p>
      <p><b>Quantity:</b> ${quote.quantity || '-'} ${quote.quantity_unit || ''}</p>
      <p><b>Message:</b> ${quote.message || '-'}</p>
    `,
  });
}

/**
 * Notify about a new contact message.
 */
async function notifyContact(msg) {
  return sendNotification({
    subject: `New Contact Message from ${msg.name}`,
    html: `
      <h3>New Contact Message</h3>
      <p><b>Name:</b> ${msg.name}</p>
      <p><b>Phone:</b> ${msg.phone}</p>
      <p><b>Email:</b> ${msg.email || '-'}</p>
      <p><b>Subject:</b> ${msg.subject || '-'}</p>
      <p><b>Message:</b> ${msg.message}</p>
    `,
  });
}

module.exports = { sendNotification, notifyQuote, notifyContact };
