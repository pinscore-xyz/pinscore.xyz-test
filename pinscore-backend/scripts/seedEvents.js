/**
 * seedEvents.js
 * ──────────────
 * Day 2 — Task 4 — CPSA Lock
 *
 * Seed Specification (frozen):
 *   - 75 events total
 *   - Platforms: instagram (~50%), twitter (~30%), youtube (~20%) — no tiktok
 *   - Event types: canonical enum only, weighted to reflect natural behavior
 *   - Timestamps: last 30 days, non-uniform, with one spike day (≥ 15 events)
 *   - fan_id: ~70% present, ~30% null
 *   - All events: value = 1, metadata = {}
 *   - creator_id: overridden server-side from JWT
 *
 * Realism rules:
 *   - views > likes > comments > shares > saves > clicks > profile_visits > follows > mentions
 *   - One spike day simulating viral/campaign cascade
 *   - No uniform distribution anywhere
 *
 * Transport: HTTP POST to /api/events/ingest (respects auth + validation)
 * Does NOT write directly to MongoDB.
 *
 * Usage:
 *   node scripts/seedEvents.js
 *
 * Requirements:
 *   - Server running on PORT (default 5000)
 *   - Set TOKEN env var or paste JWT below
 *   - npm install axios uuid  (if not already present)
 */

const axios  = require('axios');
const { v4: uuidv4 } = require('uuid');

// ── CONFIG — edit these two values ───────────────────────────────────
const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/events/ingest`;
const TOKEN    = process.env.SEED_TOKEN || 'PASTE_VALID_JWT_HERE';

// ── Enums (must match server frozen enum) ─────────────────────────────
const PLATFORMS   = ['instagram', 'twitter', 'youtube'];
const EVENT_TYPES = [
  'view', 'like', 'comment', 'share', 'save',
  'follow', 'click', 'mention', 'profile_visit',
];

// ── Weighted platform selector ────────────────────────────────────────
// instagram ~50%, twitter ~30%, youtube ~20%
function weightedPlatform() {
  const r = Math.random();
  if (r < 0.50) return 'instagram';
  if (r < 0.80) return 'twitter';
  return 'youtube';
}

// ── Weighted event type selector ──────────────────────────────────────
// Frequency reflects natural engagement behavior:
// views(30%) > likes(25%) > comments(15%) > shares(10%) > saves(7%)
// > clicks(6%) > profile_visits(4%) > follows(2%) > mentions(1%)
function weightedEventType() {
  const r = Math.random();
  if (r < 0.30) return 'view';
  if (r < 0.55) return 'like';
  if (r < 0.70) return 'comment';
  if (r < 0.80) return 'share';
  if (r < 0.87) return 'save';
  if (r < 0.93) return 'click';
  if (r < 0.97) return 'profile_visit';
  if (r < 0.99) return 'follow';
  return 'mention';
}

// ── Spike day event type — cascade: view → like → comment → share ─────
function spikeEventType(index) {
  // First few events in spike are views/likes, then cascade up
  const cascade = [
    'view', 'view', 'view', 'like', 'like', 'like',
    'comment', 'comment', 'share', 'save',
    'follow', 'like', 'view', 'comment', 'share',
  ];
  return cascade[index % cascade.length];
}

// ── fan_id — 70% present, 30% null ───────────────────────────────────
function randomFanId() {
  return Math.random() < 0.70
    ? `fan_${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
    : null;
}

// ── Timestamp helpers ─────────────────────────────────────────────────
const NOW = new Date('2026-02-23T00:00:00Z'); // Fixed reference = today

function daysAgo(n, hour = null, minute = null) {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour  !== null ? hour   : Math.floor(Math.random() * 24));
  d.setUTCMinutes(minute !== null ? minute : Math.floor(Math.random() * 60));
  d.setUTCSeconds(Math.floor(Math.random() * 60));
  d.setUTCMilliseconds(0);
  return d.toISOString();
}

// ── Event generator ───────────────────────────────────────────────────
function generateEvents() {
  const events = [];

  // ── SPIKE DAY: day 7 ago — 16 events (≥20% of 75) ──────────────────
  // Simulate campaign spike: cascade from views → likes → comments → shares
  // Concentrated between 17:00–21:00 UTC (peak engagement window)
  for (let i = 0; i < 16; i++) {
    const spikeHour   = 17 + Math.floor(i / 4);  // 17, 18, 19, 20
    const spikeMinute = (i * 7) % 60;
    events.push({
      event_id:   uuidv4(),
      platform:   i < 9 ? 'instagram' : i < 13 ? 'twitter' : 'youtube',
      creator_id: 'will_be_overridden',
      fan_id:     randomFanId(),
      event_type: spikeEventType(i),
      value:      1,
      metadata:   {},
      timestamp:  daysAgo(7, spikeHour, spikeMinute),
    });
  }

  // ── Normal distribution: remaining 59 events across last 30 days ────
  // Deliberately non-uniform day selection — cluster around recent days
  const dayWeights = [];
  for (let d = 1; d <= 30; d++) {
    // Recent days are more likely (recency bias)
    if (d === 7) continue;          // spike day already filled
    const weight = d <= 7 ? 3 : d <= 14 ? 2 : 1;
    for (let w = 0; w < weight; w++) dayWeights.push(d);
  }

  for (let i = 0; i < 59; i++) {
    const day = dayWeights[Math.floor(Math.random() * dayWeights.length)];

    // Small burst clusters: 25% chance of event falling within 10min window
    const isBurst  = Math.random() < 0.25;
    const hour     = isBurst ? 18 : Math.floor(Math.random() * 24);
    const minute   = isBurst ? Math.floor(Math.random() * 10) : Math.floor(Math.random() * 60);

    events.push({
      event_id:   uuidv4(),
      platform:   weightedPlatform(),
      creator_id: 'will_be_overridden',
      fan_id:     randomFanId(),
      event_type: weightedEventType(),
      value:      1,
      metadata:   {},
      timestamp:  daysAgo(day, hour, minute),
    });
  }

  // Sort chronologically so insertMany ordering is clean
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return events;
}

// ── Seed runner — sends in one batch of 75 ───────────────────────────
async function seed() {
  if (TOKEN === 'PASTE_VALID_JWT_HERE') {
    console.error('\n  ✗  TOKEN not set.');
    console.error('     Run: SEED_TOKEN=<your_jwt> node scripts/seedEvents.js\n');
    process.exit(1);
  }

  const events = generateEvents();

  // Verify counts before sending
  const withFanId = events.filter(e => e.fan_id !== null).length;
  const nullFanId = events.filter(e => e.fan_id === null).length;
  const platformCounts = events.reduce((acc, e) => {
    acc[e.platform] = (acc[e.platform] || 0) + 1; return acc;
  }, {});
  const typeCounts = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1; return acc;
  }, {});

  console.log('\nPinscore — Seed Script (Day 2 Task 4)');
  console.log('──────────────────────────────────────');
  console.log(`Total events   : ${events.length}`);
  console.log(`With fan_id    : ${withFanId} (${((withFanId/75)*100).toFixed(0)}%)`);
  console.log(`Null fan_id    : ${nullFanId} (${((nullFanId/75)*100).toFixed(0)}%)`);
  console.log('Platforms      :', JSON.stringify(platformCounts));
  console.log('Event types    :', JSON.stringify(typeCounts));
  console.log('Spike day      : 2026-02-16 — 16 events (campaign cascade)');
  console.log(`\nSending to     : ${BASE_URL}`);

  try {
    const response = await axios.post(
      BASE_URL,
      { events },
      {
        headers: {
          Authorization:  `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('\n  ✓  Seed successful');
    console.log(`     Inserted: ${response.data.inserted}`);
    console.log(`     Status:   ${response.status}\n`);

  } catch (err) {
    if (err.response) {
      const { status, data } = err.response;
      console.error(`\n  ✗  Seed failed — HTTP ${status}`);
      console.error('     Response:', JSON.stringify(data, null, 2));

      if (status === 401) console.error('\n     → Token expired or invalid. Get a fresh JWT.');
      if (status === 400) console.error('\n     → Schema violation. Check event structure.');
      if (status === 404) console.error('\n     → Route not found. Check BASE_URL and server is running.');
      if (status === 409) console.error('\n     → Duplicate event_ids. Clear events collection and retry.');
    } else {
      console.error('\n  ✗  Network error:', err.message);
      console.error('     → Is the server running? Check BASE_URL port.\n');
    }
    process.exit(1);
  }
}

seed();
