const mongoose = require('mongoose');

// ── Enums (frozen for v1) ─────────────────────────────────────────────
const PLATFORM_ENUM = [
  'instagram',
  'twitter',
  'youtube',
  'tiktok',
];

const EVENT_TYPE_ENUM = [
  'like',
  'comment',
  'share',
  'save',
  'follow',
  'click',
  'mention',
  'view',
  'profile_visit',
];

const EventSchema = new mongoose.Schema(
  {
    event_id: {
      type:     String,
      required: true,
      unique:   true,
      match:    /^[0-9a-fA-F-]{36}$/,  // UUID v4 format
    },
    platform: {
      type:     String,
      required: true,
      enum:     PLATFORM_ENUM,
    },
    creator_id: {
      type:     String,
      required: true,
      trim:     true,
    },
    fan_id: {
      type:    String,
      default: null,
      trim:    true,
    },
    event_type: {
      type:     String,
      required: true,
      enum:     EVENT_TYPE_ENUM,
    },
    value: {
      type:     Number,
      required: true,
      default:  1,
    },
    metadata: {
      type:    Object,
      default: {},
    },
    timestamp: {
      type:     Date,
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

// ── Pre-validate hook ─────────────────────────────────────────────────
EventSchema.pre('validate', function (next) {
  if (!this.event_id)              return next(new Error('event_id is required'));
  if (!this.creator_id)            return next(new Error('creator_id is required'));
  if (typeof this.value !== 'number') return next(new Error('value must be a number'));
  if (!this.timestamp)             return next(new Error('timestamp is required'));
  next();
});

module.exports = mongoose.model('Event', EventSchema);
module.exports.PLATFORM_ENUM   = PLATFORM_ENUM;
module.exports.EVENT_TYPE_ENUM = EVENT_TYPE_ENUM;
