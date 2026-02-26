/**
 * error.middleware.js
 * ────────────────────
 * Day 2 — Task 7 — MA 1.2 — CPSA Lock
 *
 * Global error handler — must be attached AFTER all routes in index.js.
 *
 * Global error response contract (frozen):
 * {
 *   "success": false,
 *   "message": "Human readable message",
 *   "error":   "Machine readable code"
 * }
 *
 * Controllers forward errors via:
 *   next({ statusCode: 500, message: "...", code: "..." })
 *
 * Never expose:
 *   - err.stack
 *   - raw err.message from DB
 *   - internal implementation details
 */

module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log internally — never expose to client
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message || err);

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message  || 'Internal server error',
    error:   err.code     || 'SERVER_ERROR',
  });
};
