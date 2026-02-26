/**
 * validateEvent.middleware.js
 * ────────────────────────────
 * Day 2 — Task 2 — CPSA Lock
 *
 * Pre-controller guards only:
 * - Payload must be JSON (handled by express.json)
 * - events key must exist and be a non-empty array
 * - Batch size ≤ 100
 * - Metadata size ≤ 5KB per event
 *
 * Event-level schema/enum/timestamp validation lives in event.controller.js
 * to keep the validation path explicit, linear, and auditable in one place.
 */

const MAX_METADATA_BYTES = 5120; // 5 KB per event

function validateBatchEvents(req, res, next) {
  const { events } = req.body;

  if (events === undefined || events === null) {
    return res.status(400).json({
      success: false,
      error:   'Request body must contain "events" key',
      code:    'INVALID_SCHEMA',
    });
  }

  if (!Array.isArray(events)) {
    return res.status(400).json({
      success: false,
      error:   'events must be an array',
      code:    'INVALID_SCHEMA',
    });
  }

  if (events.length === 0) {
    return res.status(400).json({
      success: false,
      error:   'events array cannot be empty',
      code:    'INVALID_SCHEMA',
    });
  }

  if (events.length > 100) {
    return res.status(400).json({
      success: false,
      error:   'Batch limit exceeded — maximum 100 events per request',
      code:    'BATCH_LIMIT_EXCEEDED',
    });
  }

  // Metadata size check per event
  for (let i = 0; i < events.length; i++) {
    const meta = events[i]?.metadata;
    if (meta && JSON.stringify(meta).length > MAX_METADATA_BYTES) {
      return res.status(400).json({
        success: false,
        error:   `Metadata size exceeds 5KB limit at index ${i}`,
        code:    'INVALID_SCHEMA',
      });
    }
  }

  next();
}

module.exports = { validateBatchEvents };
