/**
 * event.route.js
 * ───────────────
 * Day 2 Tasks 3 & 5 + Day 3 Task 3 — Routing Layer
 *
 * Route prefix : /api/events        (mounted in index.js)
 * Auth         : JWT required on all routes
 *
 * Middleware execution order (non-negotiable):
 *   POST /ingest  →  authMiddleware  →  validateBatchEvents  →  ingestEvents
 *   GET  /        →  authMiddleware  →  getEvents
 *   GET  /score   →  authMiddleware  →  getScore
 *
 * Pagination handled inside getEvents controller (not middleware).
 * Time filtering handled inside score service layer (not middleware).
 * creator_id always from JWT — never from query params.
 */

const express = require('express');
const router  = express.Router();

const authMiddleware          = require('../middleware/auth.middleware');
const { validateBatchEvents } = require('../middleware/validateEvent.middleware');
const { ingestEvents, getEvents } = require('../controllers/event.controller');
const { getScore }                = require('../controllers/score.controller');

// POST /api/events/ingest
// Pipeline: auth → batch validation → ingestion controller
router.post('/ingest', authMiddleware, validateBatchEvents, ingestEvents);

// GET /api/events/score   ← must be before GET / to avoid route shadowing
// Pipeline: auth → score controller
// Optional: ?startDate=ISO8601 &endDate=ISO8601
router.get('/score', authMiddleware, getScore);

// GET /api/events
// Pipeline: auth → fetch controller
router.get('/', authMiddleware, getEvents);

module.exports = router;
