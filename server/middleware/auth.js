// middleware/auth.js — JWT verification + role guard
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'gameguide_super_secret_2024';

/**
 * requireAuth — verifies Bearer token and attaches req.user.
 * Also works as a standalone middleware (no role check).
 */
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * requireRole(...roles) — factory middleware that gates a route to specific roles.
 * Must be used AFTER requireAuth in the middleware chain.
 * Example: router.delete('/:id', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
