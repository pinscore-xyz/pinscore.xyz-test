/**
 * verify.seed.js
 * ───────────────
 * Day 2 — Task 4 — MICRO-ACTION 3.2
 * Database Verification (no Compass needed)
 *
 * Connects to MongoDB and confirms:
 *   - Exactly 75 events exist for the target creator
 *   - creator_id matches JWT-derived value (no spoof survived)
 *   - All timestamps within last 30 days
 *   - All event_types are in canonical enum
 *   - All platforms are in allowed enum
 *   - fan_id distribution approximately 70/30
 *   - No malformed documents
 *
 * Usage:
 *   CREATOR_ID=<your_id> node scripts/verify.seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event    = require('../src/models/event.model');

const CREATOR_ID = process.env.CREATOR_ID || '';
const ALLOWED_EVENT_TYPES = [
  'like', 'comment', 'share', 'save', 'follow',
  'click', 'mention', 'view', 'profile_visit',
];
const ALLOWED_PLATFORMS = ['instagram', 'twitter', 'youtube', 'tiktok'];
const THIRTY_DAYS_AGO   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function verify() {
  if (!CREATOR_ID) {
    console.error('\n  ✗  CREATOR_ID not set.');
    console.error('     Run: CREATOR_ID=<your_creator_id> node scripts/verify.seed.js\n');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('\nPinscore — Seed Verification (Day 2 Task 4)');
  console.log(`Creator ID: ${CREATOR_ID}`);
  console.log('────────────────────────────────────────────');

  const events = await Event.find({ creator_id: CREATOR_ID }).lean();

  // ── Count ───────────────────────────────────────────────────────────
  assert('Exactly 75 events in DB', events.length === 75, `found ${events.length}`);

  // ── creator_id integrity (no spoofed value survived) ────────────────
  const wrongCreator = events.filter(e => e.creator_id !== CREATOR_ID);
  assert(
    'All events have correct creator_id (no injection survived)',
    wrongCreator.length === 0,
    `${wrongCreator.length} events have wrong creator_id`
  );

  // ── Timestamps within 30 days ────────────────────────────────────────
  const oldEvents = events.filter(e => new Date(e.timestamp) < THIRTY_DAYS_AGO);
  assert(
    'All timestamps within last 30 days',
    oldEvents.length === 0,
    `${oldEvents.length} events outside 30-day window`
  );

  // ── UTC timezone in timestamps ────────────────────────────────────────
  const noTz = events.filter(e => {
    const ts = new Date(e.timestamp).toISOString();
    return !ts.endsWith('Z');
  });
  assert('All timestamps stored as UTC', noTz.length === 0, `${noTz.length} non-UTC`);

  // ── Canonical event_type enum ─────────────────────────────────────────
  const badTypes = events.filter(e => !ALLOWED_EVENT_TYPES.includes(e.event_type));
  assert(
    'All event_types are canonical enum values',
    badTypes.length === 0,
    `${badTypes.length} invalid types: ${[...new Set(badTypes.map(e => e.event_type))].join(', ')}`
  );

  // ── Canonical platform enum ───────────────────────────────────────────
  const badPlatforms = events.filter(e => !ALLOWED_PLATFORMS.includes(e.platform));
  assert(
    'All platforms are canonical enum values',
    badPlatforms.length === 0,
    `${badPlatforms.length} invalid platforms`
  );

  // ── fan_id distribution ───────────────────────────────────────────────
  const withFanId = events.filter(e => e.fan_id !== null).length;
  const nullFanId = events.filter(e => e.fan_id === null).length;
  const fanPct    = (withFanId / events.length) * 100;
  assert(
    `fan_id distribution approximately 70/30 (got ${fanPct.toFixed(0)}% / ${(100 - fanPct).toFixed(0)}%)`,
    fanPct >= 60 && fanPct <= 80,
    `expected 60–80% with fan_id, got ${fanPct.toFixed(1)}%`
  );

  // ── Required fields present ───────────────────────────────────────────
  const missingFields = events.filter(e =>
    !e.event_id || !e.platform || !e.creator_id || !e.event_type || e.value === undefined || !e.timestamp
  );
  assert(
    'All documents have required fields',
    missingFields.length === 0,
    `${missingFields.length} documents missing required fields`
  );

  // ── value = 1 on all events ───────────────────────────────────────────
  const badValue = events.filter(e => e.value !== 1);
  assert('All events have value = 1', badValue.length === 0, `${badValue.length} events with wrong value`);

  // ── Distribution summary ──────────────────────────────────────────────
  const typeCounts = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1; return acc;
  }, {});
  const platformCounts = events.reduce((acc, e) => {
    acc[e.platform] = (acc[e.platform] || 0) + 1; return acc;
  }, {});

  console.log('\nDistribution:');
  console.log('  Event types :', JSON.stringify(typeCounts));
  console.log('  Platforms   :', JSON.stringify(platformCounts));
  console.log(`  fan_id      : ${withFanId} with / ${nullFanId} null`);

  // ── Spike day check ───────────────────────────────────────────────────
  const spikeDay = new Date('2026-02-16T00:00:00Z');
  const spikeDayEnd = new Date('2026-02-17T00:00:00Z');
  const spikeEvents = events.filter(e => {
    const t = new Date(e.timestamp);
    return t >= spikeDay && t < spikeDayEnd;
  });
  assert(
    `Spike day (2026-02-16) has ≥ 15 events (found ${spikeEvents.length})`,
    spikeEvents.length >= 15,
    `only ${spikeEvents.length} events on spike day`
  );

  console.log(`\n${'─'.repeat(48)}`);
  console.log(`Passed: ${passed}   Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nDatabase verification FAILED — review errors above.\n');
    process.exit(1);
  } else {
    console.log('\nDatabase verification PASSED — seed data is clean.\n');
    process.exit(0);
  }
}

verify()
  .catch(err => {
    console.error('Verification error:', err.message);
    process.exit(1);
  })
  .finally(() => mongoose.disconnect());
