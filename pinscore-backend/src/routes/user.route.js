const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { getMe, updateMe, uploadAvatar } = require('../controllers/user.controller');

router.get('/me',       authMiddleware, getMe);
router.patch('/me',     authMiddleware, updateMe);
router.post('/avatar',  authMiddleware, upload.single('avatar'), uploadAvatar);

module.exports = router;
