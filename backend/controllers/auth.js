const { admin, service_db, realtime_db } = require('../configs/firebase_db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/auth');

// Firebase Auth REST API configuration
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'your-firebase-api-key';
const FIREBASE_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

// Generate JWT tokens
const generateTokens = (userId, email) => {
  const accessToken = jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Verify Firebase Auth credentials using REST API
const verifyFirebaseCredentials = async (email, password) => {
  try {
    const response = await fetch(FIREBASE_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.message === 'INVALID_PASSWORD' || data.error?.message === 'EMAIL_NOT_FOUND') {
        return { success: false, message: 'Invalid email or password' };
      }
      throw new Error(data.error?.message || 'Authentication failed');
    }

    return { 
      success: true, 
      data: {
        uid: data.localId,
        email: data.email,
        displayName: data.displayName || email.split('@')[0]
      }
    };
  } catch (error) {
    console.error('Firebase Auth verification error:', error);
    return { success: false, message: 'Authentication failed' };
  }
};

// Login endpoint with Firebase Authentication
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Verify credentials with Firebase Auth
    const authResult = await verifyFirebaseCredentials(email, password);
    
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message
      });
    }

    const { uid, email: userEmail, displayName } = authResult.data;

    // Generate our own JWT tokens
    const userId = uid;
    const { accessToken, refreshToken } = generateTokens(userId, userEmail);

    // Check if user exists in Realtime Database, if not create them
    const userRef = realtime_db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      // Create user in Realtime Database if they don't exist
      await userRef.set({
        userId,
        email: userEmail,
        name: displayName || userEmail.split('@')[0],
        role: 'user', // Default role, you can customize this
        createdAt: admin.database.ServerValue.TIMESTAMP,
        firebaseUid: uid
      });
    }

    // Store refresh token in separate node
    const refreshTokenRef = realtime_db.ref(`refreshTokens/${userId}`);
    await refreshTokenRef.set({
      token: refreshToken,
      userId,
      email: userEmail,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    // Update user session data in Realtime Database
    await userRef.update({
      lastLogin: admin.database.ServerValue.TIMESTAMP,
      isActive: true
    });

    // Login session tracking removed for simplicity

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          userId,
          email: userEmail,
          name: displayName || userEmail.split('@')[0],
          role: 'user'
        }
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Logout endpoint
exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        // Decode token to get user info
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        const userId = decoded.userId;
        
        // Remove refresh token from separate node
        const refreshTokenRef = realtime_db.ref(`refreshTokens/${userId}`);
        await refreshTokenRef.remove();

        // Update user status
        const userRef = realtime_db.ref(`users/${userId}`);
        await userRef.update({
          isActive: false,
          lastLogout: admin.database.ServerValue.TIMESTAMP
        });

        // Logout session tracking removed for simplicity
      } catch (tokenError) {
        // Token might be invalid, but we still want to return success
        // Token validation failed during logout (expected for invalid tokens)
      }
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Check if refresh token exists in separate node
    const userId = decoded.userId;
    const refreshTokenRef = realtime_db.ref(`refreshTokens/${userId}`);
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

    // Get user data
    const userRef = realtime_db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');

    if (!userSnapshot.exists()) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userSnapshot.val();

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(userData.userId, decoded.email);

    // Update refresh token in separate node
    await refreshTokenRef.update({
      token: newRefreshToken,
      lastActivity: admin.database.ServerValue.TIMESTAMP,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    // Set new cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully'
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// Verify token endpoint
exports.verifyToken = async (req, res) => {
  try {
    // This endpoint is protected by the verifyToken middleware
    // If we reach here, the token is valid
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user
      }
    });

  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Helper function to create a user (for manual user creation)
exports.createUser = async (req, res) => {
  try {
    const { email, password, name, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const userRef = realtime_db.ref(`users/${email.replace(/[.#$[\]]/g, '_')}`);
    const userSnapshot = await userRef.once('value');

    if (userSnapshot.exists()) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user in Firebase Realtime Database
    const userData = {
      userId,
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      role,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      isActive: false
    };

    await userRef.set(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        userId,
        email,
        name: userData.name,
        role
      }
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get system settings (for demo purposes)
exports.get_settings = async (req, res) => {
  try {
    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();

    let settings = {
      businessName: 'AutoWash Pro',
      currency: 'KSh',
      paymentMethods: ['Cash', 'Mpesa'],
      defaultServices: [
        'Exterior wash',
        'Interior cleaning',
        'Waxing',
        'Tire cleaning',
        'Engine bay cleaning'
      ],
      workingHours: {
        open: '08:00',
        close: '18:00'
      }
    };

    if (settingsDoc.exists) {
      settings = { ...settings, ...settingsDoc.data() };
    } else {
      // Create default settings if they don't exist
      await settingsRef.set(settings);
    }

    res.status(200).json({
      success: true,
      message: 'Settings retrieved successfully',
      data: settings
    });

  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update system settings
exports.update_settings = async (req, res) => {
  try {
    const settingsData = req.body;

    // Validate required fields
    if (!settingsData.businessName) {
      return res.status(400).json({
        success: false,
        message: 'Business name is required'
      });
    }

    // Add update timestamp
    settingsData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update settings
    await service_db.collection('settings').doc('app').set(settingsData, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settingsData
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

