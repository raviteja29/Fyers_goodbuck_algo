const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const fyersService = require('../services/fyersService');

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists with this email or username'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fyersConnected: user.isFyersTokenValid()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        tradingSettings: user.tradingSettings,
        fyersConnected: user.isFyersTokenValid(),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update trading settings
router.put('/trading-settings', auth, async (req, res) => {
  try {
    const { maxRiskPerTrade, paperTrading, autoTrade } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.tradingSettings = {
      maxRiskPerTrade: maxRiskPerTrade || user.tradingSettings.maxRiskPerTrade,
      paperTrading: paperTrading !== undefined ? paperTrading : user.tradingSettings.paperTrading,
      autoTrade: autoTrade !== undefined ? autoTrade : user.tradingSettings.autoTrade
    };

    await user.save();

    res.json({
      message: 'Trading settings updated successfully',
      tradingSettings: user.tradingSettings
    });
  } catch (error) {
    console.error('Trading settings update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fyers OAuth flow - Get authorization URL
router.get('/fyers/auth-url', auth, async (req, res) => {
  try {
    const authUrl = await fyersService.getAuthorizationUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Fyers auth URL error:', error);
    res.status(500).json({ message: 'Error generating Fyers auth URL' });
  }
});

// Fyers OAuth callback
router.post('/fyers/callback', auth, async (req, res) => {
  try {
    const { authCode } = req.body;
    
    if (!authCode) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    const tokenData = await fyersService.getAccessToken(authCode);
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fyersCredentials = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      clientId: tokenData.client_id,
      expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
    };

    await user.save();

    res.json({
      message: 'Fyers account connected successfully',
      fyersConnected: true
    });
  } catch (error) {
    console.error('Fyers callback error:', error);
    res.status(500).json({ message: 'Error connecting Fyers account' });
  }
});

// Disconnect Fyers account
router.delete('/fyers/disconnect', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fyersCredentials = {};
    await user.save();

    res.json({ message: 'Fyers account disconnected successfully' });
  } catch (error) {
    console.error('Fyers disconnect error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;