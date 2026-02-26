const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username:   { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, default: null },
    googleId:   { type: String, default: null },
    avatar:     { type: String, default: '' },
    bio:        { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    otp:        { type: String, default: null },
    otpExpiry:  { type: Date,   default: null },
    platforms:  { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', UserSchema);
