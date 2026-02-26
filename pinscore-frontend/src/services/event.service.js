/**
 * src/services/event.service.js
 * ──────────────────────────────
 * Day 2 — Task 6 — MA 2.1 — CPSA Lock
 *
 * All event API calls go here.
 * No raw axios in components.
 * Returns res.data — not the full axios response.
 *
 * Backend contract shape:
 * {
 *   success: true,
 *   page:    number,
 *   limit:   number,
 *   total:   number,
 *   data:    Event[]
 * }
 *
 * Consumers use response.data for the event array.
 */

import api from '../lib/axios';

/**
 * fetchEvents(page, limit)
 * Returns: { success, page, limit, total, data: Event[] }
 */
export async function fetchEvents(page = 1, limit = 25) {
  const res = await api.get('/events', {
    params: { page, limit },
  });
  return res.data;
}

/**
 * ingestEvents(events[])
 * Returns: { success: true, inserted: number }
 */
export async function ingestEvents(events) {
  const res = await api.post('/events/ingest', { events });
  return res.data;
}
