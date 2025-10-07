import express from 'express';
import { fyersService } from '../services/fyersService.js';

export const fyersAuthRouter = express.Router();

// In-memory session storage (use Redis in production)
let currentAccessToken: string | null = null;

// Get authentication URL
fyersAuthRouter.get('/url', (req, res) => {
  try {
    const authUrl = fyersService.getAuthUrl();
    res.json({ authUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Handle callback from Fyers
fyersAuthRouter.get('/callback', async (req, res) => {
  try {
    const { auth_code, state } = req.query;

    if (!auth_code) {
      return res.status(400).json({ error: 'Authorization code not received' });
    }

    const accessToken = await fyersService.getAccessToken(auth_code as string);
    currentAccessToken = accessToken;

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error: any) {
    console.error('Callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=failed&error=${encodeURIComponent(error.message)}`);
  }
});

// Exchange auth code for token (alternative method)
fyersAuthRouter.post('/token', async (req, res) => {
  try {
    const { authCode } = req.body;

    if (!authCode) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    const accessToken = await fyersService.getAccessToken(authCode);
    currentAccessToken = accessToken;

    res.json({ 
      success: true, 
      message: 'Authentication successful',
      accessToken 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check authentication status
fyersAuthRouter.get('/status', async (req, res) => {
  try {
    if (!currentAccessToken) {
      return res.json({ authenticated: false });
    }

    fyersService.setAccessToken(currentAccessToken);
    const profile = await fyersService.getProfile();

    res.json({ 
      authenticated: true,
      profile: profile.data 
    });
  } catch (error: any) {
    currentAccessToken = null;
    res.json({ authenticated: false, error: error.message });
  }
});

// Logout
fyersAuthRouter.post('/logout', async (req, res) => {
  try {
    if (currentAccessToken) {
      fyersService.setAccessToken(currentAccessToken);
      await fyersService.logout();
      currentAccessToken = null;
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current access token
export function getCurrentAccessToken(): string | null {
  return currentAccessToken;
}