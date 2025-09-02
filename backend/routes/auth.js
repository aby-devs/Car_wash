const express = require('express');
const router = express.Router();
const { AuthLogic } = require('../controllers');

// Authentication routes
router.post('/auth/login', AuthLogic.login);
router.post('/auth/logout', AuthLogic.logout);
router.get('/auth/verify', AuthLogic.verify_session);

// Settings routes
router.get('/settings', AuthLogic.get_settings);
router.put('/settings', AuthLogic.update_settings);

module.exports = router;
