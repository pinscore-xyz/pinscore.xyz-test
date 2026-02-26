const multer  = require('multer');
const cloudinary = require('../config/cloudinary.config');

const storage = multer.memoryStorage();
const upload  = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

module.exports = upload;
