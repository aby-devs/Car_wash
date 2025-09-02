const express = require('express');
const router = express.Router();
const { AuthLogic } = require('../controllers');

// Authentication routes
router.post('/login', AuthLogic.login);
router.post('/logout', AuthLogic.logout);
router.get('/verify', AuthLogic.verify_session);

// Settings routes
router.get('/settings', AuthLogic.get_settings);
router.put('/settings', AuthLogic.update_settings);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Car Wash API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
