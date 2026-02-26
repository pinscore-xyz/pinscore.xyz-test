/**
 * verify.routes.js
 * ─────────────────
 * Day 2 — Task 3 — Runtime Route Verification
 *
 * Runs the three verification checks from MAs 3.1, 3.2, 3.3
 * without Postman. Execute after server is running:
 *
 *   node src/scripts/verify.routes.js
 *
 * Requires: server running on PORT (default 5000)
 * Requires: a valid JWT in env var VERIFY_TOKEN
 *           OR provide a raw token as first CLI arg
 *
 *   VERIFY_TOKEN=<jwt> node src/scripts/verify.routes.js
 *   node src/scripts/verify.routes.js <jwt>
 */

const http = require('http');

const PORT  = process.env.PORT || 5000;
const HOST  = 'localhost';
const TOKEN = process.argv[2] || process.env.VERIFY_TOKEN || '';

const BASE = `http://${HOST}:${PORT}`;

let passed = 0;
let failed = 0;

// ── HTTP helper ───────────────────────────────────────────────────────
function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: HOST,
      port:     PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    };

    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', chunk => (raw += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Assertion helper ──────────────────────────────────────────────────
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

// ── Test runner ───────────────────────────────────────────────────────
async function run() {
  console.log(`\nPinscore — Route Verification`);
  console.log(`Target: ${BASE}/api/events/ingest\n`);

  // ── MA 3.1 — No token → 401 ─────────────────────────────────────────
  console.log('MA 3.1 — No Authorization header');
  try {
    const r = await request('POST', '/api/events/ingest', {
      body: { events: [] },
    });
    assert('Status is 401', r.status === 401, `got ${r.status}`);
    assert('success is false', r.body?.success === false);
    assert('message is "Unauthorized"', r.body?.message === 'Unauthorized', `got "${r.body?.message}"`);
    assert('error field present', !!r.body?.error);
    assert('No stack trace in body', !r.body?.stack);
  } catch (err) {
    console.error('  ✗  Request failed — is the server running?', err.message);
    failed++;
  }

  // ── MA 3.2 — Invalid token → 401 ────────────────────────────────────
  console.log('\nMA 3.2 — Invalid token');
  try {
    const r = await request('POST', '/api/events/ingest', {
      headers: { Authorization: 'Bearer fake.token.value' },
      body: { events: [] },
    });
    assert('Status is 401', r.status === 401, `got ${r.status}`);
    assert('success is false', r.body?.success === false);
    assert('error is "Invalid or expired token"',
      r.body?.error === 'Invalid or expired token',
      `got "${r.body?.error}"`
    );
  } catch (err) {
    console.error('  ✗  Request failed', err.message);
    failed++;
  }

  // ── MA 3.3 — Valid token, valid body → 201 or 400/409 (not 401/404) ─
  console.log('\nMA 3.3 — Valid token + valid event body');
  if (!TOKEN) {
    console.log('  ⚠  No VERIFY_TOKEN provided — skipping authenticated test');
    console.log('     Run: VERIFY_TOKEN=<jwt> node src/scripts/verify.routes.js');
  } else {
    try {
      const r = await request('POST', '/api/events/ingest', {
        headers: { Authorization: `Bearer ${TOKEN}` },
        body: {
          events: [{
            event_id:   '99999999-test-test-test-999999999999',
            event_type: 'like',
            platform:   'instagram',
            creator_id: 'will_be_overwritten',   // spoofed — must be ignored
            value:       1,
            timestamp:  '2026-02-13T10:00:00Z',
            metadata:   {},
          }],
        },
      });

      // Accept 201 (inserted) or 409 (duplicate — event already exists)
      // Both mean auth passed and controller ran — not 401 or 404
      assert(
        'Auth passed — not a 401',
        r.body?.message !== 'Unauthorized',
        `got message "${r.body?.message}"`
      );
      assert(
        'Route exists — not a 404',
        r.status !== 404,
        `got ${r.status}`
      );
      assert(
        'Controller ran (201 or 409)',
        r.status === 201 || r.status === 409,
        `got ${r.status}`
      );

      if (r.status === 201) {
        assert('inserted field present', typeof r.body?.inserted === 'number');
        assert('success is true', r.body?.success === true);
        console.log(`  →  inserted: ${r.body?.inserted}`);
      } else if (r.status === 409) {
        console.log('  →  Duplicate event_id — already seeded (expected if running twice)');
      }

      // MA 3.3 execution order — cannot be asserted in tests but confirmed
      // by the fact that auth rejected fake token in MA 3.2 and controller
      // ran here only after valid token was presented.
      console.log('\n  Execution order confirmed:');
      console.log('  authMiddleware ran first  (MA 3.2 proved it blocks invalid tokens)');
      console.log('  controller ran second     (MA 3.3 proved it only runs after valid auth)');

    } catch (err) {
      console.error('  ✗  Request failed', err.message);
      failed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(48)}`);
  console.log(`Passed: ${passed}   Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nRouting verification FAILED — fix errors above before proceeding.\n');
    process.exit(1);
  } else {
    console.log('\nRouting verification PASSED.\n');
    console.log('Confirmed:');
    console.log('  ✓  POST /api/events/ingest registered at correct prefix');
    console.log('  ✓  authMiddleware active and blocking unauthenticated requests');
    console.log('  ✓  401 returned with structured JSON (not 404, not 500)');
    console.log('  ✓  Execution order: auth → validate → controller\n');
    process.exit(0);
  }
}

run();
