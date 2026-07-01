const { admin, service_db, realtime_db } = require('../configs/firebase_db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { JWT_SECRET } = require('../middleware/auth');

// Firebase Auth REST API configuration
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'your-firebase-api-key';
const FIREBASE_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

const isProduction = process.env.NODE_ENV === 'production';

const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

const clearAuthCookies = (res) => {
  const clearOptions = { path: '/', secure: isProduction, sameSite: 'lax' };
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
};

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
      if (data.error?.message === 'INVALID_PASSWORD' || data.error?.message === 'EMAIL_NOT_FOUND' || data.error?.message === 'INVALID_LOGIN_CREDENTIALS') {
        return { success: false, message: 'Invalid email or password' };
      }
      return { success: false, message: data.error?.message || 'Authentication failed' };
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
    
    let userRole = 'supervisor'; // Default role
    
    if (!userSnapshot.exists()) {
      // Create user in Realtime Database if they don't exist
      await userRef.set({
        userId,
        email: userEmail,
        name: displayName || userEmail.split('@')[0],
        role: 'supervisor', // Default role for new users
        createdAt: admin.database.ServerValue.TIMESTAMP,
        firebaseUid: uid
      });
    } else {
      // Get the user's role from the database
      const userData = userSnapshot.val();
      userRole = userData.role || 'supervisor';
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
    res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          userId,
          email: userEmail,
          name: displayName || userEmail.split('@')[0],
          role: userRole
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

    clearAuthCookies(res);

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
    const userRole = userData.role || 'supervisor';

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(userData.userId, decoded.email);

    // Update refresh token in separate node
    await refreshTokenRef.update({
      token: newRefreshToken,
      lastActivity: admin.database.ServerValue.TIMESTAMP,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
    });

    // Set new cookies
    res.cookie('accessToken', accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie('refreshToken', newRefreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

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
    // Get user data from database to include role
    const userId = req.user.userId;
    const userRef = realtime_db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    
    let userData = req.user;
    if (userSnapshot.exists()) {
      const dbUserData = userSnapshot.val();
      userData = {
        ...req.user,
        role: dbUserData.role || 'supervisor'
      };
    }
    
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        user: userData
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

// Signup endpoint using Firebase Auth
exports.signup = async (req, res) => {
  try {
    const { email, password, role = 'supervisor' } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate role
    if (role && !['manager', 'supervisor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be either manager or supervisor'
      });
    }

    // Create user with Firebase Auth REST API
    const FIREBASE_SIGNUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
    
    const response = await fetch(FIREBASE_SIGNUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
        displayName: email.split('@')[0]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.message === 'EMAIL_EXISTS') {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists'
        });
      }
      if (data.error?.message === 'WEAK_PASSWORD') {
        return res.status(400).json({
          success: false,
          message: 'Password is too weak'
        });
      }
      throw new Error(data.error?.message || 'Registration failed');
    }

    const { localId: uid, email: userEmail } = data;

    // Create user in Realtime Database
    const userId = uid;
    const userRef = realtime_db.ref(`users/${userId}`);
    
    const userData = {
      userId,
      email: userEmail,
      name: email.split('@')[0],
      role: role || 'supervisor',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      firebaseUid: uid,
      isActive: false
    };

    await userRef.set(userData);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          userId,
          email: userEmail,
          name: email.split('@')[0],
          role: role || 'supervisor'
        }
      }
    });

  } catch (error) {
    console.error('Error during signup:', error);
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
      availableServices: [
        'Engine Steam Wash',
        'Under Wash',
        'Executive Wash',
        'Vacuum',
        'Vacuum and shampoo',
        'Leather Care Cleaner',
        'Dashboard Shine',
        'Executive Machine Polish',
        'Executive Buffing',
        'Air-con Refill',
        'Water Marks',
        'Rim Restoration',
        'Engine Wash'
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

// Add a new service to available services
exports.add_service = async (req, res) => {
  try {
    const { serviceName } = req.body;

    if (!serviceName || typeof serviceName !== 'string' || serviceName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Service name is required and must be a non-empty string'
      });
    }

    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();

    let settings = {
      availableServices: [
        'Engine Steam Wash',
        'Under Wash',
        'Executive Wash',
        'Vacuum',
        'Vacuum and shampoo',
        'Leather Care Cleaner',
        'Dashboard Shine',
        'Executive Machine Polish',
        'Executive Buffing',
        'Air-con Refill',
        'Water Marks',
        'Rim Restoration',
        'Engine Wash'
      ]
    };

    if (settingsDoc.exists) {
      settings = { ...settings, ...settingsDoc.data() };
    }

    // Check if service already exists
    if (settings.availableServices && settings.availableServices.includes(serviceName.trim())) {
      return res.status(409).json({
        success: false,
        message: 'Service already exists'
      });
    }

    // Add the new service
    if (!settings.availableServices) {
      settings.availableServices = [];
    }
    settings.availableServices.push(serviceName.trim());
    settings.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update settings
    await settingsRef.set(settings, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Service added successfully',
      data: { availableServices: settings.availableServices }
    });

  } catch (error) {
    console.error('Error adding service:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Remove a service from available services
exports.remove_service = async (req, res) => {
  try {
    const { serviceName } = req.body;

    if (!serviceName || typeof serviceName !== 'string' || serviceName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Service name is required and must be a non-empty string'
      });
    }

    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Settings not found'
      });
    }

    const settings = settingsDoc.data();

    if (!settings.availableServices || !settings.availableServices.includes(serviceName.trim())) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Remove the service
    settings.availableServices = settings.availableServices.filter(service => service !== serviceName.trim());
    settings.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update settings
    await settingsRef.set(settings, { merge: true });

    res.status(200).json({
      success: true,
      message: 'Service removed successfully',
      data: { availableServices: settings.availableServices }
    });

  } catch (error) {
    console.error('Error removing service:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Test realtime database connection
exports.testRealtimeDB = async (req, res) => {
  try {
    console.log('Testing realtime database connection...');
    
    // Test basic connection
    const testRef = realtime_db.ref('test');
    await testRef.set({ message: 'Test connection', timestamp: Date.now() });
    
    const testSnapshot = await testRef.once('value');
    const testData = testSnapshot.val();
    
    console.log('Realtime DB test data:', testData);
    
    // Clean up test data
    await testRef.remove();
    
    res.status(200).json({
      success: true,
      message: 'Realtime database connection successful',
      data: testData
    });
  } catch (error) {
    console.error('Realtime database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Realtime database connection failed',
      error: error.message
    });
  }
};

// Get all users (manager only)
exports.getUsers = async (req, res) => {
  try {
    console.log('Fetching users from realtime database...');
    
    // First, let's check if we can access the database at all
    try {
      const testRef = realtime_db.ref('test');
      await testRef.set({ test: true });
      await testRef.remove();
      console.log('Realtime database connection is working');
    } catch (dbError) {
      console.error('Realtime database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: dbError.message
      });
    }
    
    const usersSnapshot = await realtime_db.ref('users').once('value');
    const users = [];
    
    console.log('Users snapshot exists:', usersSnapshot.exists());
    console.log('Users snapshot size:', usersSnapshot.numChildren());
    
    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((childSnapshot) => {
        const userData = childSnapshot.val();
        console.log('User data:', childSnapshot.key, userData);
        users.push({
          userId: childSnapshot.key,
          ...userData
        });
      });
    } else {
      console.log('No users found in database. This might be because:');
      console.log('1. No users have logged in yet');
      console.log('2. Users are stored in a different location');
      console.log('3. Database URL is not configured properly');
    }

    console.log('Total users found:', users.length);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update user role (manager only)
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['manager', 'supervisor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (manager or supervisor) is required'
      });
    }

    // Check if user exists
    const userRef = realtime_db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user role
    await userRef.update({
      role,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    res.status(200).json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete user (manager only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userRef = realtime_db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (userId === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const userData = userSnapshot.val();
    const userEmail = userData.email;

    // Delete user from Firebase Authentication
    try {
      if (userEmail) {
        // Get user by email from Firebase Auth
        const userRecord = await admin.auth().getUserByEmail(userEmail);
        if (userRecord) {
          await admin.auth().deleteUser(userRecord.uid);
          console.log(`User ${userEmail} deleted from Firebase Authentication`);
        }
      }
    } catch (authError) {
      console.error('Error deleting user from Firebase Auth:', authError);
      // Continue with database deletion even if auth deletion fails
    }

    // Delete user from Realtime Database
    await userRef.remove();

    // Delete user's refresh tokens
    const refreshTokenRef = realtime_db.ref(`refreshTokens/${userId}`);
    await refreshTokenRef.remove();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully from both database and authentication'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Export all functions
module.exports = {
  login: exports.login,
  signup: exports.signup,
  logout: exports.logout,
  refreshToken: exports.refreshToken,
  verifyToken: exports.verifyToken,
  createUser: exports.createUser,
  get_settings: exports.get_settings,
  update_settings: exports.update_settings,
  add_service: exports.add_service,
  remove_service: exports.remove_service,
  getUsers: exports.getUsers,
  updateUserRole: exports.updateUserRole,
  deleteUser: exports.deleteUser,
  testRealtimeDB: exports.testRealtimeDB
};

