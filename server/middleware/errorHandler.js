/**
 * server/middleware/errorHandler.js
 * Centralized error handler. Never leaks stack traces in production.
 */
const env = require('../config/env');

function errorHandler(err, req, res, _next) {
  // Log the full error
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (!env.isProd) {
    console.error(err.stack);
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    const match = err.message.match(/Duplicate entry '(.+?)' for key '(.+?)'/);
    const field = match ? match[2].replace(/^uq_\w+_/, '') : 'field';
    return res.status(409).json({
      success: false,
      error: `A record with this ${field} already exists.`,
    });
  }

  // MySQL foreign key violation
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      error: 'This record is referenced by other data and cannot be modified.',
    });
  }

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large. Maximum size is 3 MB.',
    });
  }

  // Multer unexpected file
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: 'Unexpected file field.',
    });
  }

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    error: env.isProd && status === 500
      ? 'An internal error occurred. Please try again later.'
      : err.message || 'Internal server error.',
  });
}

module.exports = errorHandler;
