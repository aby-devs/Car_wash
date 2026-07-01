const { admin, realtime_db } = require('../configs/firebase_db');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

const formatPublicUser = (profile) => ({
  userId: profile.userId,
  email: profile.email,
  name: profile.name || profile.email?.split('@')[0] || 'User',
  role: profile.role || 'supervisor',
});

const getUserProfile = async (userId) => {
  const snapshot = await realtime_db.ref(`users/${userId}`).once('value');
  return snapshot.exists() ? snapshot.val() : null;
};

const ensureUserProfile = async (userId, { email, name, role = 'supervisor' }) => {
  const userRef = realtime_db.ref(`users/${userId}`);
  const snapshot = await userRef.once('value');

  if (!snapshot.exists()) {
    const profile = {
      userId,
      email,
      name: name || email.split('@')[0],
      role,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      firebaseUid: userId,
      isActive: true,
    };
    await userRef.set(profile);
    return profile;
  }

  const profile = snapshot.val();
  await userRef.update({
    lastLogin: admin.database.ServerValue.TIMESTAMP,
    isActive: true,
  });

  return { ...profile, email: profile.email || email };
};

const signInWithFirebase = async (email, password) => {
  if (!FIREBASE_API_KEY) {
    throw new Error('FIREBASE_API_KEY is not configured');
  }

  const response = await fetch(FIREBASE_SIGN_IN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await response.json();

  if (!response.ok) {
    const code = data.error?.message;
    if (['INVALID_PASSWORD', 'EMAIL_NOT_FOUND', 'INVALID_LOGIN_CREDENTIALS'].includes(code)) {
      return { success: false, message: 'Invalid email or password' };
    }
    return { success: false, message: data.error?.message || 'Authentication failed' };
  }

  return {
    success: true,
    data: {
      userId: data.localId,
      email: data.email,
      name: data.displayName || email.split('@')[0],
    },
  };
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const authResult = await signInWithFirebase(email.trim(), password);
    if (!authResult.success) {
      return res.status(401).json({ success: false, message: authResult.message });
    }

    const { userId, email: userEmail, name } = authResult.data;
    const profile = await ensureUserProfile(userId, { email: userEmail, name });
    const user = formatPublicUser(profile);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.signup = async (req, res) => {
  try {
    const { email, password, role = 'supervisor' } = req.body;
    const trimmedEmail = email?.trim();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }
    if (!['manager', 'supervisor'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const displayName = trimmedEmail.split('@')[0];

    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email: trimmedEmail,
        password,
        displayName,
      });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }
      if (error.code === 'auth/weak-password') {
        return res.status(400).json({ success: false, message: 'Password is too weak' });
      }
      console.error('Firebase signup error:', error);
      return res.status(500).json({ success: false, message: 'Failed to create account' });
    }

    const profile = await ensureUserProfile(firebaseUser.uid, {
      email: trimmedEmail,
      name: displayName,
      role,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user: formatPublicUser(profile) },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (userId) {
      await realtime_db.ref(`users/${userId}`).update({
        isActive: false,
        lastLogout: admin.database.ServerValue.TIMESTAMP,
      });
    }

    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSession = async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const profile = await getUserProfile(userId);
    if (!profile) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Session active',
      data: { user: formatPublicUser(profile) },
    });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.formatPublicUser = formatPublicUser;
exports.getUserProfile = getUserProfile;
