/**
 * auth.middleware.js
 * ───────────────────
 * Day 2 — Task 1 — CPSA Lock
 *
 * JWT verification middleware.
 *
 * SECURITY RULE:
 * creator_id is always derived from decoded JWT (req.user.creator_id).
 * Any creator_id in request body must be ignored or stripped.
 * Impersonation via body injection is explicitly blocked.
 */

const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error:   'Missing token',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Enforce creator_id presence in payload
    if (!decoded.creator_id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
        error:   'Invalid token payload — creator_id missing',
      });
    }

    req.user = decoded;
    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
      error:   'Invalid or expired token',
    });
  }
};
