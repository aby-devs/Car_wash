# Authentication & Settings System Implementation Guide

This guide explains how to implement a robust authentication system with settings-based signup control, based on the car-wash application architecture.

## 🏗️ Architecture Overview

The system uses a **Firebase + JWT** hybrid approach:
- **Firebase Auth** for user authentication (signup/login)
- **Firebase Firestore** for settings storage
- **JWT tokens** for session management
- **HTTP-only cookies** for secure token storage

## 🔐 Authentication Flow

### 1. Login Process
```javascript
// backend/controllers/auth.js
const login = async (req, res) => {
  try {
    // 1. Verify Firebase Auth credentials using REST API
    const response = await fetch(FIREBASE_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 2. Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(data.localId, data.email);

    // 3. Store user data in Firebase Realtime Database
    await realtime_db.ref(`users/${data.localId}`).set({
      email: data.email,
      displayName: data.displayName || email.split('@')[0],
      role: 'supervisor', // default role
      createdAt: admin.database.ServerValue.TIMESTAMP,
      isActive: true
    });

    // 4. Set HTTP-only cookies
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
      data: { user: { userId, email, name, role } }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
```

### 2. Signup Process with Settings Check
```javascript
// backend/controllers/auth.js
const signup = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Check if signup is enabled
    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();
    
    let settings = { signupEnabled: true }; // Default to enabled
    if (settingsDoc.exists) {
      settings = { ...settings, ...settingsDoc.data() };
    }

    if (!settings.signupEnabled) {
      return res.status(403).json({
        success: false,
        message: 'User registration is currently disabled'
      });
    }

    // 2. Create user with Firebase Auth REST API
    const FIREBASE_SIGNUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
    
    const response = await fetch(FIREBASE_SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error(data.error?.message || 'Signup failed');
    }

    // 3. Store user data in Firebase Realtime Database
    await realtime_db.ref(`users/${data.localId}`).set({
      email: data.email,
      displayName: email.split('@')[0],
      role: role || 'supervisor',
      createdAt: admin.database.ServerValue.TIMESTAMP,
      isActive: false
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
```

## ⚙️ Settings Management System

### Backend Settings API

#### 1. Get Settings
```javascript
// backend/controllers/auth.js
exports.get_settings = async (req, res) => {
  try {
    const settingsRef = service_db.collection('settings').doc('app');
    const settingsDoc = await settingsRef.get();

    let settings = {
      businessName: 'Your App Name',
      currency: 'USD',
      paymentMethods: ['Cash', 'Card'],
      defaultServices: ['Service 1', 'Service 2'],
      workingHours: {
        open: '08:00',
        close: '18:00'
      },
      signupEnabled: true // Default value
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
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
```

#### 2. Update Settings
```javascript
// backend/controllers/auth.js
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
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
```

#### 3. Routes
```javascript
// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { AuthLogic } = require('../controllers');
const { verifyToken } = require('../middleware/auth');

// Authentication routes
router.post('/login', AuthLogic.login);
router.post('/signup', AuthLogic.signup);
router.post('/logout', AuthLogic.logout);
router.post('/refresh', AuthLogic.refreshToken);
router.get('/verify', verifyToken, AuthLogic.verifyToken);

// Settings routes
router.get('/settings', AuthLogic.get_settings);
router.put('/settings', verifyToken, AuthLogic.update_settings);

module.exports = router;
```

### Frontend Settings Management

#### 1. API Service
```typescript
// frontend/src/services/api.ts
class ApiService {
  // Settings API
  async getSettings(): Promise<ApiResponse<any>> {
    return this.request('/settings', { baseURL: AUTH_BASE_URL });
  }

  async updateSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
      baseURL: AUTH_BASE_URL,
    });
  }
}
```

#### 2. Settings Page Component
```typescript
// frontend/src/pages/SettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiService } from '@/services/api';

interface AppSettings {
  signupEnabled: boolean;
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    signupEnabled: true
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSettings();
      
      if (response.success && response.data) {
        setSettings({
          signupEnabled: response.data.signupEnabled !== undefined ? response.data.signupEnabled : true
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupToggle = async (enabled: boolean) => {
    try {
      setError('');
      
      const newSettings = { signupEnabled: enabled };
      const response = await apiService.updateSettings(newSettings);
      
      if (response.success) {
        setSettings(newSettings);
        // Show success toast
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="signup-enabled" className="text-sm font-semibold">
              Allow New Registrations
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable/disable new user signups
            </p>
          </div>
          <Switch
            id="signup-enabled"
            checked={settings.signupEnabled}
            onCheckedChange={handleSignupToggle}
          />
        </div>
        
        {!settings.signupEnabled && (
          <Alert>
            <AlertDescription>
              Registration is disabled. New users cannot create accounts.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
```

## 🚫 Signup Page Control Logic

### 1. Signup Page with Settings Check
```typescript
// frontend/src/pages/SignupPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Loader2 } from 'lucide-react';
import { apiService } from '@/services/api';

const SignupPage: React.FC = () => {
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [checkingSignupStatus, setCheckingSignupStatus] = useState(true);
  const navigate = useNavigate();

  // Check if signup is enabled
  useEffect(() => {
    const checkSignupStatus = async () => {
      try {
        const response = await apiService.getSettings();
        if (response.success && response.data) {
          setSignupEnabled(response.data.signupEnabled !== false);
        }
      } catch (err) {
        console.error('Failed to check signup status:', err);
        setSignupEnabled(false); // Default to disabled if we can't check
      } finally {
        setCheckingSignupStatus(false);
      }
    };

    checkSignupStatus();
  }, []);

  // Show loading while checking signup status
  if (checkingSignupStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Checking registration status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show disabled message if signup is not enabled
  if (!signupEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Disabled</h2>
              <p className="text-gray-600 mb-4">
                User registration is currently disabled. Please contact your administrator for account access.
              </p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Regular signup form when enabled
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your signup form here */}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupPage;
```

### 2. Login Page Integration
```typescript
// frontend/src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '@/services/api';

export function LoginPage() {
  const [signupEnabled, setSignupEnabled] = useState(true);

  // Check if signup is enabled
  useEffect(() => {
    const checkSignupStatus = async () => {
      try {
        const response = await apiService.getSettings();
        if (response.success && response.data) {
          setSignupEnabled(response.data.signupEnabled !== false);
        }
      } catch (err) {
        console.error('Failed to check signup status:', err);
        setSignupEnabled(false);
      }
    };

    checkSignupStatus();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Your login form here */}
          
          {/* Sign Up Link - Only show if signup is enabled */}
          {signupEnabled && (
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  to="/signup" 
                  className="text-primary hover:text-primary-hover font-medium"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

## 🗄️ Database Structure

### Firebase Firestore
```
settings/
  └── app/
      ├── signupEnabled: boolean
      ├── businessName: string
      ├── currency: string
      ├── paymentMethods: string[]
      ├── defaultServices: string[]
      ├── workingHours: object
      └── updatedAt: timestamp
```

### Firebase Realtime Database
```
users/
  └── {userId}/
      ├── email: string
      ├── displayName: string
      ├── role: string
      ├── createdAt: timestamp
      ├── isActive: boolean
      └── lastLogin: timestamp
```

## 🔧 Implementation Checklist

### Backend Setup
- [ ] Install required packages: `firebase-admin`, `jsonwebtoken`, `bcryptjs`
- [ ] Set up Firebase configuration
- [ ] Create authentication middleware
- [ ] Implement JWT token generation/verification
- [ ] Create settings API endpoints
- [ ] Add settings validation to signup endpoint
- [ ] Set up proper error handling

### Frontend Setup
- [ ] Create API service for settings
- [ ] Build settings management page
- [ ] Implement signup page with settings check
- [ ] Update login page to conditionally show signup link
- [ ] Add proper loading states and error handling
- [ ] Implement toast notifications for user feedback

### Security Considerations
- [ ] Use HTTP-only cookies for token storage
- [ ] Implement proper CORS settings
- [ ] Add rate limiting for authentication endpoints
- [ ] Validate all input data
- [ ] Use environment variables for sensitive configuration
- [ ] Implement proper error logging

## 🚀 Usage Example

1. **Admin enables/disables signup**:
   - Go to Settings page
   - Toggle "Allow New Registrations" switch
   - Setting is saved to Firebase Firestore

2. **User tries to signup**:
   - Signup page checks settings on load
   - If disabled, shows "Registration Disabled" message
   - If enabled, shows normal signup form
   - Backend validates setting before creating account

3. **Login page behavior**:
   - Checks settings to determine if signup link should be shown
   - Hides signup link when registration is disabled

This system provides a clean, centralized way to control user registration while maintaining a good user experience with proper error handling and UI feedback.

