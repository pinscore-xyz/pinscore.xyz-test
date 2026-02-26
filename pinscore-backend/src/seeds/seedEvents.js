/**
 * seedEvents.js
 * ──────────────
 * Day 1 — Task 4 — 20 canonical seed events
 * All enum values valid. All required fields present.
 * fan_id nullable where appropriate.
 * Covers all 9 event types and all 4 platforms.
 *
 * Usage: node src/seeds/seedEvents.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event    = require('../models/event.model');

const seedEvents = [
  { event_id: '11111111-1111-1111-1111-111111111111', platform: 'instagram', creator_id: 'creator_001', fan_id: 'fan_101', event_type: 'like',          value: 1, metadata: {},                timestamp: new Date('2026-02-13T10:00:00Z') },
  { event_id: '22222222-2222-2222-2222-222222222222', platform: 'instagram', creator_id: 'creator_001', fan_id: 'fan_102', event_type: 'comment',       value: 1, metadata: { length: 120 },   timestamp: new Date('2026-02-13T10:05:00Z') },
  { event_id: '33333333-3333-3333-3333-333333333333', platform: 'twitter',   creator_id: 'creator_001', fan_id: 'fan_103', event_type: 'share',         value: 1, metadata: {},                timestamp: new Date('2026-02-13T10:10:00Z') },
  { event_id: '44444444-4444-4444-4444-444444444444', platform: 'youtube',   creator_id: 'creator_002', fan_id: null,      event_type: 'view',          value: 1, metadata: { video_id: 'v1' }, timestamp: new Date('2026-02-13T11:00:00Z') },
  { event_id: '55555555-5555-5555-5555-555555555555', platform: 'tiktok',    creator_id: 'creator_003', fan_id: 'fan_104', event_type: 'follow',        value: 1, metadata: {},                timestamp: new Date('2026-02-13T11:10:00Z') },
  { event_id: '66666666-6666-6666-6666-666666666666', platform: 'twitter',   creator_id: 'creator_002', fan_id: 'fan_105', event_type: 'mention',       value: 1, metadata: {},                timestamp: new Date('2026-02-13T11:20:00Z') },
  { event_id: '77777777-7777-7777-7777-777777777777', platform: 'instagram', creator_id: 'creator_003', fan_id: 'fan_106', event_type: 'save',          value: 1, metadata: {},                timestamp: new Date('2026-02-13T11:30:00Z') },
  { event_id: '88888888-8888-8888-8888-888888888888', platform: 'youtube',   creator_id: 'creator_001', fan_id: null,      event_type: 'profile_visit', value: 1, metadata: {},                timestamp: new Date('2026-02-13T12:00:00Z') },
  { event_id: '99999999-9999-9999-9999-999999999999', platform: 'tiktok',    creator_id: 'creator_002', fan_id: 'fan_107', event_type: 'click',         value: 1, metadata: {},                timestamp: new Date('2026-02-13T12:15:00Z') },
  { event_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', platform: 'instagram', creator_id: 'creator_002', fan_id: 'fan_108', event_type: 'like',          value: 1, metadata: {},                timestamp: new Date('2026-02-13T12:30:00Z') },
  { event_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', platform: 'twitter',   creator_id: 'creator_003', fan_id: 'fan_109', event_type: 'comment',       value: 1, metadata: {},                timestamp: new Date('2026-02-13T12:45:00Z') },
  { event_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', platform: 'youtube',   creator_id: 'creator_001', fan_id: null,      event_type: 'view',          value: 1, metadata: {},                timestamp: new Date('2026-02-13T13:00:00Z') },
  { event_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', platform: 'tiktok',    creator_id: 'creator_003', fan_id: 'fan_110', event_type: 'share',         value: 1, metadata: {},                timestamp: new Date('2026-02-13T13:15:00Z') },
  { event_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', platform: 'instagram', creator_id: 'creator_001', fan_id: 'fan_111', event_type: 'follow',        value: 1, metadata: {},                timestamp: new Date('2026-02-13T13:30:00Z') },
  { event_id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', platform: 'twitter',   creator_id: 'creator_002', fan_id: 'fan_112', event_type: 'save',          value: 1, metadata: {},                timestamp: new Date('2026-02-13T13:45:00Z') },
  { event_id: '12345678-1234-1234-1234-123456789012', platform: 'youtube',   creator_id: 'creator_003', fan_id: null,      event_type: 'click',         value: 1, metadata: {},                timestamp: new Date('2026-02-13T14:00:00Z') },
  { event_id: '22345678-1234-1234-1234-123456789012', platform: 'tiktok',    creator_id: 'creator_001', fan_id: 'fan_113', event_type: 'profile_visit', value: 1, metadata: {},                timestamp: new Date('2026-02-13T14:15:00Z') },
  { event_id: '32345678-1234-1234-1234-123456789012', platform: 'instagram', creator_id: 'creator_002', fan_id: 'fan_114', event_type: 'mention',       value: 1, metadata: {},                timestamp: new Date('2026-02-13T14:30:00Z') },
  { event_id: '42345678-1234-1234-1234-123456789012', platform: 'twitter',   creator_id: 'creator_003', fan_id: 'fan_115', event_type: 'like',          value: 1, metadata: {},                timestamp: new Date('2026-02-13T14:45:00Z') },
  { event_id: '52345678-1234-1234-1234-123456789012', platform: 'youtube',   creator_id: 'creator_002', fan_id: null,      event_type: 'follow',        value: 1, metadata: {},                timestamp: new Date('2026-02-13T15:00:00Z') },
];

async function runSeed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Event.deleteMany({});
  console.log('Cleared existing events');

  await Event.insertMany(seedEvents);
  console.log(`Seeded ${seedEvents.length} events`);

  await mongoose.disconnect();
  console.log('Done');
  process.exit(0);
}

runSeed().catch(err => {
  console.error(err);
  process.exit(1);
});
