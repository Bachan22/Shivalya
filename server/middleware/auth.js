/**
 * server/middleware/auth.js
 * Session-based authentication middleware for admin routes.
 */

/**
 * Require authentication — checks session for admin user.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminUser) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }
  // Attach admin info to request
  req.adminUser = req.session.adminUser;
  next();
}

/**
 * Require specific role (e.g., 'admin').
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.adminUser || !roles.includes(req.adminUser.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions.' });
    }
    next();
  };
}

/**
 * CSRF protection for state-changing requests.
 * Uses double-submit cookie pattern:
 * - A csrf_token cookie is set on login.
 * - State-changing requests must include X-CSRF-Token header matching the cookie.
 */
function csrfProtection(req, res, next) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const cookieToken = req.cookies && req.cookies.csrf_token;
  const headerToken = req.headers['x-csrf-token'];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, error: 'Invalid CSRF token.' });
  }
  next();
}

module.exports = { requireAuth, requireRole, csrfProtection };
