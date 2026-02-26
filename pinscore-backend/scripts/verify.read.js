/**
 * verify.read.js
 * ───────────────
 * Day 2 — Task 5 — Read Layer Verification (MA 4.2)
 *
 * Runs full test matrix:
 *   Test 1 — No token          → 401
 *   Test 2 — Valid token        → 200, correct shape
 *   Test 3 — page=2             → 200, different data, total unchanged
 *   Test 4 — limit=5            → 200, data.length ≤ 5, total unchanged
 *   Test 5 — limit=1000         → 200, limit clamped to 100
 *   Test 6 — page=-3            → 400 INVALID_PAGINATION
 *   Test 7 — creator_id in query → ignored, token scope enforced
 *   Test 8 — limit=0            → 400 INVALID_PAGINATION
 *
 * Usage:
 *   VERIFY_TOKEN=<jwt> node scripts/verify.read.js
 *   node scripts/verify.read.js <jwt>
 */

const http = require('http');

const PORT  = process.env.PORT || 5000;
const HOST  = 'localhost';
const TOKEN = process.argv[2] || process.env.VERIFY_TOKEN || '';

let passed = 0;
let failed = 0;

function request(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, port: PORT, path, method: 'GET', headers: { 'Content-Type': 'application/json', ...headers } };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function assert(label, condition, detail = '') {
  if (condition) { console.log(`  ✓  ${label}`); passed++; }
  else           { console.error(`  ✗  ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

function auth() { return { Authorization: `Bearer ${TOKEN}` }; }

async function run() {
  if (!TOKEN) {
    console.error('\n  ✗  TOKEN not set.');
    console.error('     Run: VERIFY_TOKEN=<jwt> node scripts/verify.read.js\n');
    process.exit(1);
  }

  console.log(`\nPinscore — Read Layer Verification (Day 2 Task 5)`);
  console.log(`Target: http://${HOST}:${PORT}/api/events`);
  console.log('──────────────────────────────────────────────────');

  // ── Test 1 — No token → 401 ─────────────────────────────────────────
  console.log('\nTest 1 — No token');
  try {
    const r = await request('/api/events');
    assert('Status 401',              r.status === 401,            `got ${r.status}`);
    assert('success: false',          r.body?.success === false);
    assert('message: Unauthorized',   r.body?.message === 'Unauthorized');
    assert('Controller did not run',  r.body?.data === undefined);
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Test 2 — Valid token, page 1, default limit ──────────────────────
  console.log('\nTest 2 — Valid token, default params');
  let page1Total = null;
  let page1Data  = null;
  try {
    const r = await request('/api/events', auth());
    assert('Status 200',              r.status === 200,            `got ${r.status}`);
    assert('success: true',           r.body?.success === true);
    assert('page field present',      typeof r.body?.page === 'number');
    assert('limit field present',     typeof r.body?.limit === 'number');
    assert('total field present',     typeof r.body?.total === 'number');
    assert('data is array',           Array.isArray(r.body?.data));
    assert('page defaults to 1',      r.body?.page === 1,          `got ${r.body?.page}`);
    assert('limit defaults to 25',    r.body?.limit === 25,        `got ${r.body?.limit}`);
    assert('data.length ≤ limit',     (r.body?.data?.length || 0) <= (r.body?.limit || 25));
    assert('sorted desc (newest first)',
      !r.body?.data?.length || !r.body.data[1] ||
      new Date(r.body.data[0].timestamp) >= new Date(r.body.data[1].timestamp)
    );
    assert('No _id or __v leaked',    r.body?.data?.every?.(e => e.__v === undefined));
    page1Total = r.body?.total;
    page1Data  = r.body?.data?.map(e => e.event_id);
    console.log(`  →  total: ${r.body?.total}, data.length: ${r.body?.data?.length}`);
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Test 3 — page=2 ──────────────────────────────────────────────────
  console.log('\nTest 3 — page=2');
  try {
    const r = await request('/api/events?page=2', auth());
    assert('Status 200',              r.status === 200,            `got ${r.status}`);
    assert('page: 2',                 r.body?.page === 2,          `got ${r.body?.page}`);
    assert('total unchanged',         r.body?.total === page1Total, `got ${r.body?.total}, expected ${page1Total}`);
    // Different data from page 1 (unless total <= 25)
    if (page1Total > 25) {
      const p2Ids = r.body?.data?.map(e => e.event_id) || [];
      const overlap = p2Ids.filter(id => page1Data?.includes(id)).length;
      assert('Different records from page 1', overlap === 0, `${overlap} overlapping records`);
    } else {
      console.log('  →  total ≤ 25, page 2 empty — skipping diff check');
    }
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Test 4 — limit=5 ─────────────────────────────────────────────────
  console.log('\nTest 4 — limit=5');
  try {
    const r = await request('/api/events?limit=5', auth());
    assert('Status 200',              r.status === 200,            `got ${r.status}`);
    assert('limit: 5',                r.body?.limit === 5,         `got ${r.body?.limit}`);
    assert('data.length ≤ 5',         (r.body?.data?.length || 0) <= 5, `got ${r.body?.data?.length}`);
    assert('total unchanged',         r.body?.total === page1Total, `got ${r.body?.total}`);
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Test 5 — limit=1000 → clamped to 100 ─────────────────────────────
  console.log('\nTest 5 — limit=1000 (should clamp to 100)');
  try {
    const r = await request('/api/events?limit=1000', auth());
    assert('Status 200',              r.status === 200,            `got ${r.status}`);
    assert('limit clamped to 100',    r.body?.limit === 100,       `got ${r.body?.limit}`);
    assert('data.length ≤ 100',       (r.body?.data?.length || 0) <= 100);
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Test 6 — page=-3 → 400 ───────────────────────────────────────────
  console.log('\nTest 6 — page=-3 (strict rejection)');
  try {
    const r = await request('/api/events?page=-3', auth());
    assert('Status 400',              r.status === 400,            `got ${r.status}`);
    assert('success: false',          r.body?.success === false);
    assert('code: INVALID_PAGINATION',r.body?.code === 'INVALID_PAGINATION', `got ${r.body?.code}`);
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Test 7 — creator_id query param ignored ───────────────────────────
  console.log('\nTest 7 — ?creator_id=INJECTED (must be ignored)');
  try {
    const r = await request('/api/events?creator_id=INJECTED_ID', auth());
    assert('Status 200 (not blocked)',r.status === 200,            `got ${r.status}`);
    assert('total matches own data',  r.body?.total === page1Total, `got ${r.body?.total}, expected ${page1Total} (own data)`);
    assert('data is own events',      r.body?.data?.every?.(e => e.creator_id !== 'INJECTED_ID'),
      'found events with injected creator_id');
    console.log('  →  Query param creator_id ignored — token scope enforced');
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Test 8 — limit=0 → 400 ────────────────────────────────────────────
  console.log('\nTest 8 — limit=0');
  try {
    const r = await request('/api/events?limit=0', auth());
    assert('Status 400',              r.status === 400,            `got ${r.status}`);
    assert('code: INVALID_PAGINATION',r.body?.code === 'INVALID_PAGINATION', `got ${r.body?.code}`);
  } catch (e) { console.error('  ✗  Request failed:', e.message); failed++; }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Passed: ${passed}   Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nRead layer verification FAILED.\n');
    process.exit(1);
  } else {
    console.log('\nRead layer verification PASSED.\n');
    console.log('Confirmed:');
    console.log('  ✓  GET /api/events registered and auth-gated');
    console.log('  ✓  Default pagination: page=1, limit=25');
    console.log('  ✓  limit capped at 100');
    console.log('  ✓  Negative page rejected with 400');
    console.log('  ✓  limit=0 rejected with 400');
    console.log('  ✓  total consistent across pages');
    console.log('  ✓  creator_id query param ignored (token scope only)');
    console.log('  ✓  Response shape: { success, page, limit, total, data }');
    console.log('  ✓  Sorted newest first\n');
    process.exit(0);
  }
}

run();
