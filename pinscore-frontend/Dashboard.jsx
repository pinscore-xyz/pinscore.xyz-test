/**
 * Dashboard.jsx
 * ──────────────
 * Day 2 — Task 7 — MA 4.2 — CPSA Lock
 *
 * Render order (MA 4.2):
 * 1. Loading
 * 2. Error
 * 3. Empty
 * 4. Data
 *
 * Error containment:
 * - Backend down → error state rendered, no crash
 * - 401 → axios interceptor redirects to /login before component renders
 * - Malformed response → useEvents captures, sets error string
 *
 * Total from backend (not events.length) — MA 3.1
 * Loading guard prevents empty-state flicker — MA 3.2
 */

import { useAuth }         from '../context/AuthContext';
import { useEvents }       from '../hooks/useEvents';
import EventTypeBadge      from '../components/events/EventTypeBadge';
import Pagination          from '../components/ui/Pagination';

const PLATFORM_ICONS = {
  instagram: '📸',
  twitter:   '🐦',
  youtube:   '▶️',
  tiktok:    '🎵',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const {
    events, total, page, limit, totalPages,
    loading, error, goToPage, refresh,
  } = useEvents(1, 25);

  // ── MA 4.2 render order ───────────────────────────────────────────────

  // 1. Loading (initial load only — suppress flicker)
  if (loading && events.length === 0) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner} />
        <p style={{ color: '#888', marginTop: '16px' }}>Loading events…</p>
      </div>
    );
  }

  // 2. Error (backend down, network failure, unexpected shape)
  if (error && events.length === 0) {
    return (
      <div style={styles.centered}>
        <div style={styles.errorCard}>
          <h3 style={{ color: '#FF8888', marginBottom: '8px' }}>Something went wrong</h3>
          <p style={{ color: '#AAA', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
          <button onClick={refresh} style={styles.btnPrimary}>
            ↻ Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pinscore</h1>
          {user && <p style={styles.subtitle}>creator: {user.creator_id}</p>}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={refresh} style={styles.btnSecondary} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button onClick={logout} style={styles.btnDanger}>Log out</button>
        </div>
      </div>

      {/* ── Inline error (refresh failure — stale data preserved) ──── */}
      {error && events.length > 0 && (
        <div style={styles.errorBanner}>⚠ {error}</div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────── */}
      <div style={styles.statsRow}>
        {/* MA 3.1 — total from backend, not events.length */}
        <StatCard label="Total Events" value={total} />
        <StatCard label="This Page"    value={events.length} />
        <StatCard label="Page"         value={`${page} / ${totalPages}`} />
        <StatCard label="Page Size"    value={limit} />
      </div>

      {/* 3. Empty (after load, no error, no data) */}
      {!loading && events.length === 0 && !error && (
        <div style={styles.emptyState}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No events yet.</p>
          <p style={{ color: '#666', fontSize: '13px' }}>
            Run: <code style={{ color: '#4ECDC4' }}>SEED_TOKEN=&lt;jwt&gt; npm run seed</code>
          </p>
        </div>
      )}

      {/* 4. Data table */}
      {events.length > 0 && (
        <>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Platform', 'Event Type', 'Fan ID', 'Value', 'Timestamp'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((event, i) => (
                  <tr
                    key={event.event_id || event._id || i}
                    style={{ background: i % 2 === 0 ? '#0D1117' : '#0A1520' }}
                  >
                    <td style={styles.td}>
                      {PLATFORM_ICONS[event.platform] || ''} {event.platform}
                    </td>
                    <td style={styles.td}>
                      <EventTypeBadge type={event.event_type} />
                    </td>
                    <td style={{
                      ...styles.td,
                      color:     event.fan_id ? '#CCC' : '#444',
                      fontStyle: event.fan_id ? 'normal' : 'italic',
                    }}>
                      {event.fan_id || 'null'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{event.value}</td>
                    <td style={{ ...styles.td, color: '#888', fontSize: '12px', fontFamily: 'monospace' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color: '#4ECDC4', fontSize: '26px', fontWeight: '700' }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh', background: '#0A0F1A', color: '#FFF',
    padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  centered: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: '#0A0F1A',
  },
  spinner: {
    width: '32px', height: '32px', border: '3px solid #1E2D40',
    borderTop: '3px solid #4ECDC4', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorCard: {
    background: '#0D1117', border: '1px solid #AA2222', borderRadius: '10px',
    padding: '32px 40px', textAlign: 'center', maxWidth: '400px',
  },
  errorBanner: {
    background: '#2A0A0A', border: '1px solid #AA2222', borderRadius: '6px',
    padding: '12px 16px', marginBottom: '16px', color: '#FF8888',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #1E2D40',
  },
  title:    { margin: 0, fontSize: '28px', fontWeight: '700', color: '#FFF' },
  subtitle: { margin: '4px 0 0', color: '#4ECDC4', fontSize: '13px', fontFamily: 'monospace' },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px', marginBottom: '24px',
  },
  statCard: {
    background: '#0D1117', border: '1px solid #1E2D40',
    borderRadius: '8px', padding: '16px',
  },
  tableWrapper: {
    overflowX: 'auto', background: '#0D1117',
    border: '1px solid #1E2D40', borderRadius: '8px',
  },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    padding: '12px 16px', textAlign: 'left', background: '#111820',
    color: '#888', fontSize: '12px', fontWeight: '600',
    letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #1E2D40',
  },
  td:       { padding: '10px 16px', borderBottom: '1px solid #111820', color: '#DDD' },
  emptyState: { textAlign: 'center', padding: '60px', color: '#666' },
  btnPrimary:   { padding: '10px 20px', background: '#2C4770', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' },
  btnSecondary: { padding: '8px 16px', background: '#1A2E4A', color: '#CCC', border: '1px solid #2C4770', borderRadius: '6px', cursor: 'pointer' },
  btnDanger:    { padding: '8px 16px', background: '#2A0A0A', color: '#FF8888', border: '1px solid #AA2222', borderRadius: '6px', cursor: 'pointer' },
};
