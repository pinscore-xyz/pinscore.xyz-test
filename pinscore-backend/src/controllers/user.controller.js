const User = require('../schema/user.schema');
const cloudinary = require('../config/cloudinary.config');

// GET /api/users/me
async function getMe(req, res) {
  const user = await User.findById(req.user.creator_id).select('-password -otp -otpExpiry');
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  return res.status(200).json({ success: true, user });
}

// PATCH /api/users/me
async function updateMe(req, res) {
  const allowed = ['username', 'bio', 'avatar'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(
    req.user.creator_id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-password -otp -otpExpiry');

  return res.status(200).json({ success: true, user });
}

// POST /api/users/avatar
async function uploadAvatar(req, res) {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'pinscore/avatars', resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    ).end(req.file.buffer);
  });

  const user = await User.findByIdAndUpdate(
    req.user.creator_id,
    { $set: { avatar: result.secure_url } },
    { new: true }
  ).select('-password -otp -otpExpiry');

  return res.status(200).json({ success: true, avatar: result.secure_url, user });
}

module.exports = { getMe, updateMe, uploadAvatar };
