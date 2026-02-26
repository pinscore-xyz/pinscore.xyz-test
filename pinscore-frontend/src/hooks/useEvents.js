/**
 * useEvents.js
 * ─────────────
 * Day 2 — Task 7 — MA 4.1 — CPSA Lock
 *
 * Custom hook for paginated event fetching.
 * Encapsulates fetch logic, loading state, error state, pagination.
 * Dashboard calls this hook — zero fetch logic in UI.
 *
 * Error containment:
 * - API failure captured in error state, never thrown into render tree
 * - Server down → error state set, component still renders safely
 * - 401 → axios interceptor handles redirect to /login
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchEvents } from '../services/event.service';

export function useEvents(initialPage = 1, initialLimit = 25) {
  const [events,  setEvents]  = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(initialPage);
  const [limit]               = useState(initialLimit);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async (targetPage) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvents(targetPage, limit);

      // Guard against malformed response shape
      if (!data || !Array.isArray(data.data)) {
        throw new Error('Unexpected response shape from server');
      }

      setEvents(data.data);
      setTotal(data.total ?? 0);
      setPage(data.page   ?? targetPage);
    } catch (err) {
      // MA 4.1 — capture error in state, never crash the component
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || 'Unable to fetch events. Please try again.');
      // Preserve stale data so UI does not blank out on refresh failure
    } finally {
      setLoading(false);
    }
  }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load on mount
  useEffect(() => {
    load(initialPage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (p) => load(p);
  const refresh  = ()  => load(page);
  const totalPages = Math.ceil(total / limit) || 1;

  return { events, total, page, limit, totalPages, loading, error, goToPage, refresh };
}
