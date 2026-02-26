/**
 * event.controller.js
 * ─────────────────────
 * Day 2 — Tasks 2, 5 & 7 — CPSA Lock
 *
 * ── WRITE SECURITY RULE ──────────────────────────────────────────────
 * creator_id is ALWAYS derived from decoded JWT (req.user.creator_id).
 * Any creator_id in request body is stripped and overwritten.
 * req.body.creator_id is never read in code — body creator_id is always ignored.
 *
 * ── READ ACCESS CONTROL RULE ─────────────────────────────────────────
 * Events must ALWAYS be filtered by: creator_id = req.user.creator_id
 * Any query parameter attempting to override creator_id must be ignored.
 * No cross-creator visibility allowed in v1.
 * Never: Event.find({ creator_id: req.query.creator_id })
 * Only:  Event.find({ creator_id: req.user.creator_id })
 *
 * ── GLOBAL ERROR RESPONSE FORMAT (frozen) ────────────────────────────
 * All errors: { success: false, message: string, error: string }
 * DB failures forwarded via next() to global error handler.
 * No stack traces, no raw err.message exposed to client.
 *
 * ── CONTRACTS ────────────────────────────────────────────────────────
 * POST /ingest success: { success: true, inserted: number }
 * GET  /       success: { success: true, page, limit, total, data: [...] }
 */

const Event = require('../models/event.model');

// ── Enums (frozen for v1) ─────────────────────────────────────────────
const ALLOWED_EVENT_TYPES = [
  'like', 'comment', 'share', 'save', 'follow',
  'click', 'mention', 'view', 'profile_visit',
];

const ALLOWED_PLATFORMS = [
  'instagram', 'twitter', 'youtube', 'tiktok',
];

// ── Event-level validator ─────────────────────────────────────────────
// Returns null on success, error string on first failure.
// No Joi. No abstraction. Pure defensive checks.
function validateEvents(events) {
  for (let i = 0; i < events.length; i++) {
    const e = events[i];

    if (typeof e !== 'object' || e === null) {
      return `Event at index ${i} must be an object`;
    }

    if (!e.event_type)  return `Missing event_type at index ${i}`;
    if (!e.platform)    return `Missing platform at index ${i}`;
    if (!e.timestamp)   return `Missing timestamp at index ${i}`;

    if (!ALLOWED_EVENT_TYPES.includes(e.event_type)) {
      return `Invalid event_type at index ${i}`;
    }

    if (!ALLOWED_PLATFORMS.includes(e.platform)) {
      return `Invalid platform at index ${i}`;
    }

    const date = new Date(e.timestamp);
    if (isNaN(date.getTime())) {
      return `Invalid timestamp at index ${i}`;
    }

    // UTC timezone indicator required (Z or +HH:MM / -HH:MM)
    if (!e.timestamp.includes('Z') && !/[+-]\d{2}:\d{2}$/.test(e.timestamp)) {
      return `Timestamp must include timezone (UTC) at index ${i}`;
    }
  }

  return null;
}

// ── POST /api/events/ingest ───────────────────────────────────────────
async function ingestEvents(req, res, next) {
  // MA 2.1 — Guard against missing or malformed body (top-level, before destructure)
  if (!req.body || !Array.isArray(req.body.events)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid payload',
      error:   'INVALID_SCHEMA',
    });
  }

  const { events } = req.body;

  // Batch empty check
  if (events.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'events array cannot be empty',
      error:   'INVALID_SCHEMA',
    });
  }

  // Batch size guard
  if (events.length > 100) {
    return res.status(400).json({
      success: false,
      message: 'Batch limit exceeded — maximum 100 events per request',
      error:   'BATCH_LIMIT_EXCEEDED',
    });
  }

  // Structural + enum + timestamp validation
  const validationError = validateEvents(events);
  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
      error:   'INVALID_SCHEMA',
    });
  }

  try {
    // SECURITY: creator_id always from JWT — never from body
    const creatorId = req.user.creator_id;

    // Idempotency — reject entire batch on any duplicate event_id
    const incomingIds = events.map(e => e.event_id).filter(Boolean);
    if (incomingIds.length > 0) {
      const duplicates = await Event.find({ event_id: { $in: incomingIds } }, { event_id: 1 });
      if (duplicates.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Duplicate event_id detected — batch rejected',
          error:   'DUPLICATE_EVENT',
          errors:  duplicates.map(d => ({ event_id: d.event_id, reason: 'Duplicate event_id' })),
        });
      }
    }

    // Force creator ownership — strip any injected creator_id
    const enrichedEvents = events.map(e => ({
      ...e,
      creator_id: creatorId,
      timestamp:  new Date(e.timestamp),
    }));

    // Atomic insert (ordered: true — stop on first failure)
    const inserted = await Event.insertMany(enrichedEvents, { ordered: true });

    return res.status(201).json({
      success:  true,
      inserted: inserted.length,
    });

  } catch (err) {
    // MA 2.2 — DB failure: forward to global error handler, never expose err.message
    return next({
      statusCode: 500,
      message:    'Failed to ingest events',
      code:       'INGEST_FAILED',
    });
  }
}

// ── GET /api/events ───────────────────────────────────────────────────
// ACCESS CONTROL: creator_id ALWAYS from JWT. Query params never control scope.
async function getEvents(req, res, next) {
  // SECURITY: ownership from token only — query param creator_id is ignored
  const creatorId = req.user.creator_id;

  // MA 3.1 — Lenient pagination coercion (no 400 noise for harmless bad input)
  const page  = Math.max(parseInt(req.query.page)  || 1, 1);   // negative/0/nan → 1
  const parsedLimit = parseInt(req.query.limit);
  const limit = parsedLimit
    ? Math.min(Math.max(parsedLimit, 1), 100)  // clamp to [1, 100]
    : 25;                                        // default 25

  const skip = (page - 1) * limit;

  try {
    // MA 3.2 — Always return full contract shape, even on empty dataset
    // Both queries use identical filter — no divergence possible
    const [data, total] = await Promise.all([
      Event.find({ creator_id: creatorId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Event.countDocuments({ creator_id: creatorId }),
    ]);

    // Empty dataset = valid state — return full shape with data: []
    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      data,
    });

  } catch (err) {
    // Forward to global error handler — never expose internal error
    return next({
      statusCode: 500,
      message:    'Failed to fetch events',
      code:       'FETCH_FAILED',
    });
  }
}

module.exports = { ingestEvents, getEvents };
