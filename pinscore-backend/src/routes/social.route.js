const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { getConnectedAccounts, connectAccount } = require('../controllers/social.controller');

router.get('/',      authMiddleware, getConnectedAccounts);
router.post('/connect', authMiddleware, connectAccount);

module.exports = router;
