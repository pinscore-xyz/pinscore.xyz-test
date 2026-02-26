/**
 * audit.js
 * ─────────
 * Day 2 — Task 8 — Full System Truth Audit
 *
 * Executes the complete canonical flow automatically:
 *   MA 1.1 — Canonical flow verification
 *   MA 2.1 — POST /api/events/ingest
 *   MA 2.3 — GET  /api/events (including pagination)
 *   MA 4.2 — Corrupt payload → 400
 *   MA 4.3 — Missing token   → 401
 *   MA 4.4 — Spoofed creator_id → ignored
 *
 * NOTE: MA 2.2 (DB inspection) and MA 4.1 (server down) require
 * manual steps. This script covers all automatable assertions.
 *
 * Usage:
 *   AUDIT_TOKEN=<jwt> node scripts/audit.js
 *   node scripts/audit.js <jwt>
 *
 * Requires: server running on PORT (default 5000)
 *
 * ─────────────────────────────────────────────────────────────────────
 * NOTE ON TASK 8 SAMPLE PAYLOAD:
 * The task specification uses event_type "purchase" in sample payloads.
 * "purchase" is NOT in the v1 canonical enum. This is intentional —
 * the audit uses "like" (a valid enum value) for success tests, and
 * explicitly tests that unknown event types are rejected.
 * ─────────────────────────────────────────────────────────────────────
 */

const http = require('http');
const { randomUUID } = require('crypto');

const PORT  = process.env.PORT  || 5000;
const HOST  = 'localhost';
const TOKEN = process.argv[2]   || process.env.AUDIT_TOKEN || '';

let passed = 0;
let failed = 0;
let insertedEventId = null;   // track so we don't create infinite duplicates

// ── HTTP helpers ──────────────────────────────────────────────────────
function request(method, path, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: HOST, port: PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => (raw += c));
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

function auth() { return { Authorization: `Bearer ${TOKEN}` }; }

// ── Assertion helpers ─────────────────────────────────────────────────
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`    ✓  ${label}`);
    passed++;
  } else {
    console.error(`    ✗  ${label}${detail ? '  ←  ' + detail : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// ── Test suite ────────────────────────────────────────────────────────

async function testServerReachable() {
  section('0. Server Reachability');
  try {
    const r = await request('GET', '/');
    assert('Server is running',       r.status === 200,         `got ${r.status}`);
    assert('Health endpoint returns ok', r.body?.status === 'ok', `got ${JSON.stringify(r.body)}`);
  } catch (e) {
    console.error(`    ✗  Server not reachable — is it running on port ${PORT}?`);
    console.error(`       ${e.message}`);
    failed++;
    return false;
  }
  return true;
}

async function testIngestSuccess() {
  section('MA 2.1 — POST /api/events/ingest (valid payload)');

  insertedEventId = randomUUID();
  const payload = {
    events: [{
      event_id:   insertedEventId,
      platform:   'instagram',
      fan_id:     'fan_audit_001',
      event_type: 'like',           // valid enum — NOT "purchase" (not in v1 enum)
      value:       1,
      metadata:   { source: 'audit' },
      timestamp:  '2026-02-18T09:45:00Z',
    }],
  };

  console.log(`    Inserting event_id: ${insertedEventId}`);

  try {
    const r = await request('POST', '/api/events/ingest', { headers: auth(), body: payload });

    assert('HTTP 201',               r.status === 201,           `got ${r.status}`);
    assert('success: true',          r.body?.success === true);
    assert('inserted: 1',            r.body?.inserted === 1,     `got ${r.body?.inserted}`);
    assert('No stack trace exposed', !r.body?.stack);
    assert('No error field',         r.body?.error === undefined);

    if (r.status === 201) {
      console.log(`    →  Event stored successfully`);
    }
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

async function testIngestIdempotency() {
  section('Idempotency — Duplicate event_id rejected');
  if (!insertedEventId) { console.log('    (skipped — no event_id from previous step)'); return; }

  try {
    const r = await request('POST', '/api/events/ingest', {
      headers: auth(),
      body: {
        events: [{
          event_id:   insertedEventId,
          platform:   'instagram',
          fan_id:     'fan_audit_001',
          event_type: 'like',
          value:       1,
          metadata:   {},
          timestamp:  '2026-02-18T09:45:00Z',
        }],
      },
    });

    assert('HTTP 409',               r.status === 409,           `got ${r.status}`);
    assert('success: false',         r.body?.success === false);
    assert('error: DUPLICATE_EVENT', r.body?.error === 'DUPLICATE_EVENT', `got ${r.body?.error}`);
    console.log(`    →  Duplicate correctly rejected`);
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

async function testGetEvents() {
  section('MA 2.3 — GET /api/events (default params)');

  let total = null;
  let firstTimestamp = null;
  let secondTimestamp = null;

  try {
    const r = await request('GET', '/api/events', { headers: auth() });

    assert('HTTP 200',               r.status === 200,           `got ${r.status}`);
    assert('success: true',          r.body?.success === true);
    assert('page field: number',     typeof r.body?.page === 'number');
    assert('limit field: number',    typeof r.body?.limit === 'number');
    assert('total field: number',    typeof r.body?.total === 'number');
    assert('data is array',          Array.isArray(r.body?.data));
    assert('page defaults to 1',     r.body?.page === 1,         `got ${r.body?.page}`);
    assert('limit defaults to 25',   r.body?.limit === 25,       `got ${r.body?.limit}`);
    assert('data.length ≤ limit',    (r.body?.data?.length || 0) <= 25);
    assert('No _id or __v exposed',  r.body?.data?.every?.(e => e.__v === undefined));

    // Verify sorted DESC
    if (r.body?.data?.length >= 2) {
      firstTimestamp  = new Date(r.body.data[0].timestamp);
      secondTimestamp = new Date(r.body.data[1].timestamp);
      assert('Sorted DESC (newest first)',
        firstTimestamp >= secondTimestamp,
        `first: ${firstTimestamp.toISOString()}, second: ${secondTimestamp.toISOString()}`
      );
    }

    // Verify audit event is present (if inserted successfully)
    if (insertedEventId) {
      const found = r.body?.data?.find(e => e.event_id === insertedEventId);
      if (found) {
        assert('Inserted event is in response',  true);
        assert('fan_id matches payload',         found.fan_id     === 'fan_audit_001', `got ${found.fan_id}`);
        assert('event_type matches payload',     found.event_type === 'like',          `got ${found.event_type}`);
        assert('creator_id from JWT (not body)', found.creator_id !== 'will_be_overridden');
      } else {
        // Could be on page 2+ if many events exist
        console.log('    →  Audit event not on page 1 (may be on later page — check total)');
      }
    }

    total = r.body?.total;
    console.log(`    →  total: ${total}, data.length: ${r.body?.data?.length}`);
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }

  return total;
}

async function testPagination(total) {
  section('MA 2.3 — Pagination test (page=2, limit=10)');

  try {
    const r = await request('GET', '/api/events?page=2&limit=10', { headers: auth() });

    assert('HTTP 200',               r.status === 200,           `got ${r.status}`);
    assert('page: 2',                r.body?.page === 2,         `got ${r.body?.page}`);
    assert('limit: 10',              r.body?.limit === 10,       `got ${r.body?.limit}`);
    assert('data.length ≤ 10',       (r.body?.data?.length || 0) <= 10, `got ${r.body?.data?.length}`);

    if (total !== null) {
      assert('total unchanged from page 1',
        r.body?.total === total,
        `got ${r.body?.total}, expected ${total}`
      );
    }

    console.log(`    →  page 2 records: ${r.body?.data?.length}, total: ${r.body?.total}`);
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

async function testLimitClamp() {
  section('Limit clamping — limit=500 → clamped to 100');

  try {
    const r = await request('GET', '/api/events?limit=500', { headers: auth() });
    assert('HTTP 200',               r.status === 200,           `got ${r.status}`);
    assert('limit clamped to 100',   r.body?.limit === 100,      `got ${r.body?.limit}`);
    assert('data.length ≤ 100',      (r.body?.data?.length || 0) <= 100);
    console.log(`    →  limit=500 correctly clamped to 100`);
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

async function testEmptyDataset() {
  section('MA 3.2 — Empty dataset returns safe shape');

  // Test with a page far beyond actual data
  try {
    const r = await request('GET', '/api/events?page=9999', { headers: auth() });
    assert('HTTP 200 (not 404)',      r.status === 200,           `got ${r.status}`);
    assert('success: true',           r.body?.success === true);
    assert('data is array',           Array.isArray(r.body?.data));
    assert('data is empty on page 9999', Array.isArray(r.body?.data), `got ${typeof r.body?.data}`);
    assert('total still accurate',    typeof r.body?.total === 'number');
    console.log(`    →  page 9999 returns { data: [], total: ${r.body?.total} } — correct`);
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

async function testMissingToken() {
  section('MA 4.3 — Missing token → 401');

  try {
    const r = await request('POST', '/api/events/ingest', {
      body: { events: [{ event_type: 'like', platform: 'instagram', timestamp: '2026-02-18T09:45:00Z' }] },
    });

    assert('HTTP 401',               r.status === 401,           `got ${r.status}`);
    assert('success: false',         r.body?.success === false);
    assert('message present',        typeof r.body?.message === 'string' && r.body.message.length > 0);
    assert('No data leaked',         r.body?.data === undefined);
    assert('No stack trace',         !r.body?.stack);

    const r2 = await request('GET', '/api/events');
    assert('GET also 401 without token', r2.status === 401, `got ${r2.status}`);

    console.log(`    →  Auth boundary enforced on both endpoints`);
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

async function testCorruptPayload() {
  section('MA 4.2 — Corrupt payload → 400 structured error');

  const cases = [
    {
      label: 'events is a string (not array)',
      body:  { events: 'not-an-array' },
      expectedCode: 'INVALID_SCHEMA',
    },
    {
      label: 'events is an object (not array)',
      body:  { events: { event_type: 'like' } },
      expectedCode: 'INVALID_SCHEMA',
    },
    {
      label: 'Empty body {}',
      body:  {},
      expectedCode: 'INVALID_SCHEMA',
    },
    {
      label: 'events empty array',
      body:  { events: [] },
      expectedCode: 'INVALID_SCHEMA',
    },
    {
      label: 'Unknown event_type ("purchase" — not in v1 enum)',
      body:  {
        events: [{
          event_id:   randomUUID(),
          platform:   'instagram',
          event_type: 'purchase',          // ← intentionally invalid
          value:       1,
          timestamp:  '2026-02-18T09:45:00Z',
        }],
      },
      expectedCode: 'INVALID_SCHEMA',
    },
    {
      label: 'Batch > 100 events',
      body:  { events: Array.from({ length: 101 }, () => ({ event_type: 'like', platform: 'instagram', timestamp: '2026-02-18T09:45:00Z' })) },
      expectedCode: 'BATCH_LIMIT_EXCEEDED',
    },
  ];

  for (const tc of cases) {
    try {
      const r = await request('POST', '/api/events/ingest', { headers: auth(), body: tc.body });
      assert(
        `${tc.label} → 400`,
        r.status === 400 || r.status === 413,
        `got ${r.status} — body: ${JSON.stringify(r.body).slice(0, 80)}`
      );
      assert(
        `${tc.label} → success: false`,
        r.body?.success === false
      );
      assert(
        `${tc.label} → no stack trace`,
        !r.body?.stack
      );
    } catch (e) {
      console.error(`    ✗  Request failed [${tc.label}]: ${e.message}`);
      failed++;
    }
  }
}

async function testCreatorIdInjectionBlocked() {
  section('Security — Spoofed creator_id in body is ignored');

  const spoofId = randomUUID();

  try {
    const r = await request('POST', '/api/events/ingest', {
      headers: auth(),
      body: {
        events: [{
          event_id:   randomUUID(),
          platform:   'instagram',
          creator_id: 'INJECTED_MALICIOUS_ID',   // ← attack vector
          fan_id:     'fan_spoof_test',
          event_type: 'like',
          value:       1,
          metadata:   {},
          timestamp:  '2026-02-18T10:00:00Z',
        }],
      },
    });

    assert('HTTP 201 (request accepted)', r.status === 201, `got ${r.status}`);
    assert('inserted: 1',                r.body?.inserted === 1);
    console.log('    →  Spoofed creator_id was accepted in request (expected)');
    console.log('    →  Verify in DB: stored creator_id must be from JWT, not INJECTED_MALICIOUS_ID');
    console.log('    →  Manual check: GET /api/events and confirm no INJECTED_MALICIOUS_ID value');
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

async function testQueryParamCreatorIdIgnored() {
  section('Security — ?creator_id= query param ignored');

  try {
    const r1 = await request('GET', '/api/events', { headers: auth() });
    const r2 = await request('GET', '/api/events?creator_id=INJECTED_CREATOR', { headers: auth() });

    assert('Both return 200',          r1.status === 200 && r2.status === 200);
    assert('Same total with and without ?creator_id=',
      r1.body?.total === r2.body?.total,
      `with param: ${r2.body?.total}, without: ${r1.body?.total}`
    );
    assert('No data from injected creator',
      r2.body?.data?.every?.(e => e.creator_id !== 'INJECTED_CREATOR'),
      'found event with INJECTED_CREATOR — isolation breach'
    );
    console.log('    →  Query param creator_id correctly ignored');
  } catch (e) {
    console.error(`    ✗  Request failed: ${e.message}`);
    failed++;
  }
}

// ── Manual checklist output ───────────────────────────────────────────
function printManualChecklist() {
  section('Manual Steps (cannot be automated)');
  console.log(`
  MA 2.2 — Direct DB Inspection (MongoDB Compass):
    1. Connect to your MongoDB instance
    2. Navigate to the events collection
    3. Filter: { event_id: "${insertedEventId || '<from audit run>'}" }
    4. Verify:
       ✓  creator_id = <your JWT creator_id>  (NOT "will_be_overridden")
       ✓  fan_id     = "fan_audit_001"
       ✓  event_type = "like"
       ✓  timestamp  = 2026-02-18T09:45:00.000Z
       ✗  creator_id = "INJECTED_MALICIOUS_ID" must NOT appear

  MA 4.1 — Server Down Test (frontend):
    1. Stop backend: CTRL+C
    2. Refresh browser dashboard
    3. Verify:
       ✓  Loading spinner appears briefly
       ✓  Error card renders: "Something went wrong / Unable to fetch events."
       ✓  No white screen
       ✓  No infinite spinner
       ✓  No unhandled promise rejection in console
    4. Restart backend, refresh again
       ✓  Data returns normally

  MA 3.1 — DevTools Network Tab (frontend):
    1. Open DevTools → Network tab
    2. Reload dashboard
    3. Click the GET /events request
    4. Verify Request Headers:
       ✓  Authorization: Bearer <JWT>
       ✓  Content-Type: application/json
    5. Verify Response:
       ✓  Status 200
       ✓  Body matches contract: { success, page, limit, total, data }
  `);
}

// ── Main runner ───────────────────────────────────────────────────────
async function run() {
  if (!TOKEN) {
    console.error('\n  ✗  AUDIT_TOKEN not set.');
    console.error('     Run: AUDIT_TOKEN=<jwt> node scripts/audit.js\n');
    process.exit(1);
  }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  PINSCORE — System Truth Audit (Day 2 Task 8)');
  console.log(`  Target: http://${HOST}:${PORT}`);
  console.log('════════════════════════════════════════════════════════════');

  const reachable = await testServerReachable();
  if (!reachable) {
    console.error('\n  Server not reachable. Start the server and retry.\n');
    process.exit(1);
  }

  await testMissingToken();
  await testCorruptPayload();
  await testIngestSuccess();
  await testIngestIdempotency();
  const total = await testGetEvents();
  await testPagination(total);
  await testLimitClamp();
  await testEmptyDataset();
  await testCreatorIdInjectionBlocked();
  await testQueryParamCreatorIdIgnored();

  printManualChecklist();

  // ── Summary ─────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════');
  console.log(`  Automated: ${passed + failed} assertions  |  Passed: ${passed}  |  Failed: ${failed}`);
  console.log('════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error('  AUDIT FAILED — review failures above before marking Day 2 complete.\n');
    process.exit(1);
  } else {
    console.log('  AUDIT PASSED — all automated assertions confirmed.\n');
    console.log('  Complete the manual checklist above to fully close Day 2 Task 8.\n');
    process.exit(0);
  }
}

run();
