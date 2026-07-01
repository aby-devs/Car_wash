const jwt = require('jsonwebtoken');
const { admin, realtime_db } = require('../configs/firebase_db');
const { JWT_SECRET } = require('../middleware/auth');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_SIGN_IN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

const formatPublicUser = (profile) => ({
  userId: profile.userId,
  email: profile.email,
  name: profile.name || profile.email?.split('@')[0] || 'User',
  role: profile.role || 'supervisor',
});

const generateTokens = (userId, email) => {
  const accessToken = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, email, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  res.cookie('refreshToken', refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
};

const clearAuthCookies = (res) => {
  const clearOptions = { path: '/', secure: isProduction, sameSite: 'lax' };
  res.clearCookie('accessToken', clearOptions);
  res.clearCookie('refreshToken', clearOptions);
};

const getUserProfile = async (userId) => {
  const snapshot = await realtime_db.ref(`users/${userId}`).once('value');
  return snapshot.exists() ? snapshot.val() : null;
};

const saveRefreshToken = async (userId, email, refreshToken) => {
  await realtime_db.ref(`refreshTokens/${userId}`).set({
    token: refreshToken,
    userId,
    email,
    createdAt: admin.database.ServerValue.TIMESTAMP,
    expiresAt: Date.now() + REFRESH_TOKEN_MAX_AGE_MS,
  });
};

const revokeRefreshToken = async (userId) => {
  await realtime_db.ref(`refreshTokens/${userId}`).remove();
};

const validateStoredRefreshToken = async (userId, refreshToken) => {
  const snapshot = await realtime_db.ref(`refreshTokens/${userId}`).once('value');
  if (!snapshot.exists()) {
    return { valid: false, message: 'Session not found' };
  }

  const tokenData = snapshot.val();
  if (tokenData.token !== refreshToken) {
    return { valid: false, message: 'Invalid session' };
  }
  if (Date.now() > tokenData.expiresAt) {
    await revokeRefreshToken(userId);
    return { valid: false, message: 'Session expired' };
  }

  return { valid: true };
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

const createSession = async (res, userId, email, profile) => {
  const { accessToken, refreshToken } = generateTokens(userId, email);
  await saveRefreshToken(userId, email, refreshToken);
  setAuthCookies(res, accessToken, refreshToken);
  return formatPublicUser(profile);
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

const verifyAccessToken = (token) => {
  try {
    return { valid: true, decoded: jwt.verify(token, JWT_SECRET) };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, expired: true };
    }
    return { valid: false, expired: false };
  }
};

const rotateSession = async (res, refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET);
  } catch {
    return null;
  }

  if (decoded.type !== 'refresh') {
    return null;
  }

  const validation = await validateStoredRefreshToken(decoded.userId, refreshToken);
  if (!validation.valid) {
    return null;
  }

  const profile = await getUserProfile(decoded.userId);
  if (!profile) {
    return null;
  }

  return createSession(res, decoded.userId, decoded.email, profile);
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
    const user = await createSession(res, userId, userEmail, profile);

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

    const user = await createSession(res, firebaseUser.uid, trimmedEmail, profile);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        await revokeRefreshToken(decoded.userId);
        await realtime_db.ref(`users/${decoded.userId}`).update({
          isActive: false,
          lastLogout: admin.database.ServerValue.TIMESTAMP,
        });
      } catch {
        // Ignore invalid tokens during logout
      }
    }

    clearAuthCookies(res);
    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getSession = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (accessToken) {
      const verification = verifyAccessToken(accessToken);
      if (verification.valid) {
        const profile = await getUserProfile(verification.decoded.userId);
        if (profile) {
          return res.status(200).json({
            success: true,
            message: 'Session active',
            data: { user: formatPublicUser(profile) },
          });
        }
      }
    }

    if (refreshToken) {
      const user = await rotateSession(res, refreshToken);
      if (user) {
        return res.status(200).json({
          success: true,
          message: 'Session refreshed',
          data: { user },
        });
      }
    }

    return res.status(401).json({ success: false, message: 'Not authenticated' });
  } catch (error) {
    console.error('Session error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.clearAuthCookies = clearAuthCookies;
exports.formatPublicUser = formatPublicUser;
exports.getUserProfile = getUserProfile;
