const { admin, service_db } = require('../configs/firebase_db');

// Simple authentication for demo purposes
// In production, you would implement proper JWT authentication or Firebase Auth

// Login endpoint (simplified for demo)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Simple validation for demo
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // For demo purposes, accept any username/password
    // In production, you would validate against a user database
    if (username && password) {
      // Create or get user session
      const userData = {
        username: username.trim(),
        loginTime: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      };

      // Store session in Firestore
      const sessionRef = await service_db.collection('sessions').add(userData);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          sessionId: sessionRef.id,
          username: userData.username,
          loginTime: new Date().toISOString()
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

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
    const { sessionId } = req.body;

    if (sessionId) {
      // Update session to inactive
      await service_db.collection('sessions').doc(sessionId).update({
        isActive: false,
        logoutTime: admin.firestore.FieldValue.serverTimestamp()
      });
    }

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

// Verify session endpoint
exports.verify_session = async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const sessionDoc = await service_db.collection('sessions').doc(sessionId).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const sessionData = sessionDoc.data();

    if (!sessionData.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Session expired'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Session is valid',
      data: {
        sessionId: sessionDoc.id,
        username: sessionData.username,
        loginTime: sessionData.loginTime
      }
    });

  } catch (error) {
    console.error('Error verifying session:', error);
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
