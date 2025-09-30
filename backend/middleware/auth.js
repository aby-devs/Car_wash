const jwt = require('jsonwebtoken');
const { admin, service_db } = require('../configs/firebase_db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from cookie instead of header
    const token = req.cookies.accessToken;
    
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists in Firebase Realtime Database
    const userRef = admin.database().ref(`users/${decoded.userId}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userSnapshot.val();

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      ...userData
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed',
      error: error.message
    });
  }
};

// Middleware to verify refresh token
const verifyRefreshToken = async (req, res, next) => {
  try {
    // Get refresh token from cookie instead of body
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    // Check if user exists in Firebase Realtime Database
    const userRef = admin.database().ref(`users/${decoded.userId}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userSnapshot.val();
    
    // Check if refresh token exists in separate node
    const refreshTokenRef = admin.database().ref(`refreshTokens/${decoded.userId}`);
    const tokenSnapshot = await refreshTokenRef.once('value');
    
    if (!tokenSnapshot.exists()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    const tokenData = tokenSnapshot.val();
    
    // Check if token matches and hasn't expired
    if (tokenData.token !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if token has expired
    if (Date.now() > tokenData.expiresAt) {
      // Remove expired token
      await refreshTokenRef.remove();
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired'
      });
    }

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      ...userData
    };

    next();
  } catch (error) {
    console.error('Refresh token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Middleware to check if user has manager role
const requireManager = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Manager role required for this action'
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Role verification failed',
      error: error.message
    });
  }
};

module.exports = {
  verifyToken,
  verifyRefreshToken,
  requireManager,
  JWT_SECRET
};
