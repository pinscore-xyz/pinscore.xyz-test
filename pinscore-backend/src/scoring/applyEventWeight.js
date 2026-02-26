/**
 * applyEventWeight.js
 * ────────────────────
 * Day 1 — Task 3 — Deterministic weight lookup
 *
 * Returns the base weight for a given event_type.
 * Throws if event_type is not explicitly registered.
 * No fallbacks. No defaults. No hidden multipliers.
 */

const { eventWeights } = require('./weights.config');

function applyEventWeight(event) {
  if (!event || !event.event_type) {
    throw new Error('Invalid event object: missing event_type');
  }

  if (!Object.prototype.hasOwnProperty.call(eventWeights, event.event_type)) {
    throw new Error(`Unsupported event_type: ${event.event_type}`);
  }

  return eventWeights[event.event_type];
}

/**
 * computeScoreIncrement(event)
 * Returns: value × weight(event_type)
 */
function computeScoreIncrement(event) {
  const weight = applyEventWeight(event);
  return event.value * weight;
}

module.exports = { applyEventWeight, computeScoreIncrement };
