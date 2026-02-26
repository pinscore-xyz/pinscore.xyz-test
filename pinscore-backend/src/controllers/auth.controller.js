const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User     = require('../schema/user.schema');
const sendEmail = require('../utils/sendEmail.utils');

function generateToken(user) {
  return jwt.sign(
    { creator_id: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Register ──────────────────────────────────────────────────────────
async function register(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ success: false, error: 'All fields required' });

  const existing = await User.findOne({ email });
  if (existing)
    return res.status(409).json({ success: false, error: 'Email already registered' });

  const hashed = await bcrypt.hash(password, 10);
  const otp    = generateOtp();
  const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  const user = await User.create({ username, email, password: hashed, otp, otpExpiry });

  await sendEmail({
    to:      email,
    subject: 'Verify your Pinscore account',
    html:    `<p>Your OTP: <strong>${otp}</strong>. Expires in 15 minutes.</p>`,
  });

  return res.status(201).json({ success: true, message: 'OTP sent to email' });
}

// ── Verify OTP ────────────────────────────────────────────────────────
async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || user.otpExpiry < new Date())
    return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });

  user.isVerified = true;
  user.otp        = null;
  user.otpExpiry  = null;
  await user.save();

  const token = generateToken(user);
  return res.status(200).json({ success: true, token });
}

// ── Login ─────────────────────────────────────────────────────────────
async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.password)
    return res.status(401).json({ success: false, error: 'Invalid credentials' });

  if (!user.isVerified)
    return res.status(403).json({ success: false, error: 'Account not verified' });

  const match = await bcrypt.compare(password, user.password);
  if (!match)
    return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const token = generateToken(user);
  return res.status(200).json({ success: true, token });
}

// ── Forgot Password ───────────────────────────────────────────────────
async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(200).json({ success: true, message: 'If account exists, OTP sent' });

  const otp = generateOtp();
  user.otp       = otp;
  user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  await sendEmail({
    to:      email,
    subject: 'Reset your Pinscore password',
    html:    `<p>Your reset OTP: <strong>${otp}</strong>. Expires in 15 minutes.</p>`,
  });

  return res.status(200).json({ success: true, message: 'OTP sent' });
}

// ── Reset Password ────────────────────────────────────────────────────
async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });

  if (!user || user.otp !== otp || user.otpExpiry < new Date())
    return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });

  user.password  = await bcrypt.hash(newPassword, 10);
  user.otp       = null;
  user.otpExpiry = null;
  await user.save();

  return res.status(200).json({ success: true, message: 'Password reset successful' });
}

module.exports = { register, verifyOtp, login, forgotPassword, resetPassword };
