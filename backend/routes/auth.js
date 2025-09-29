const express = require('express');
const router = express.Router();
const { AuthLogic } = require('../controllers');
const { verifyToken, verifyRefreshToken } = require('../middleware/auth');

// Authentication routes
router.post('/login', AuthLogic.login);
router.post('/signup', AuthLogic.signup);
router.post('/logout', AuthLogic.logout);
router.post('/refresh', AuthLogic.refreshToken);
router.get('/verify', verifyToken, AuthLogic.verifyToken);
router.post('/create-user', AuthLogic.createUser); // For manual user creation

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
