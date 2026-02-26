/**
 * src/lib/axios.js
 * ─────────────────
 * Day 2 — Task 6 — MA 1.1 & 1.2 — CPSA Lock
 *
 * Single axios instance. All API calls go through this.
 * Never use raw axios inside components.
 * Never hardcode URLs inside components.
 *
 * JWT is injected automatically via request interceptor.
 * No manual Authorization header management in components.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,  // http://localhost:5000/api
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — auto-inject JWT ─────────────────────────────
// Every api.get/post/etc automatically includes Authorization header
// if a valid token exists in localStorage.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  // Guard: skip if token is missing or a stringified null/undefined
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ── Response interceptor — handle global auth failures ────────────────
// If backend returns 401, clear stale token and redirect to login.
// This prevents the app from remaining in a broken auth state.
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
