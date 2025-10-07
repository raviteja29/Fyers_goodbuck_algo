import express, { Request, Response } from 'express';
import { fyersService } from '../services/fyersService.js';
import { tokenStore } from '../services/tokenStore.js';

export const fyersAuthRouter = express.Router();

// Get authentication URL
fyersAuthRouter.get('/url', (req: Request, res: Response) => {
  try {
    const authUrl = fyersService.getAuthUrl();
    res.json({ authUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Handle callback from Fyers
fyersAuthRouter.get('/callback', async (req: Request, res: Response) => {
  try {
    const { auth_code, state } = req.query;

    if (!auth_code) {
      return res.status(400).json({ error: 'Authorization code not received' });
    }

  const accessToken = await fyersService.getAccessToken(auth_code as string);

  // Store token both in session and tokenStore (session ID acts as user key)
  req.session.accessToken = accessToken;
  tokenStore.set(req.sessionID, accessToken);

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
fyersAuthRouter.post('/token', async (req: Request, res: Response) => {
  try {
    const { authCode } = req.body;

    if (!authCode) {
      return res.status(400).json({ error: 'Authorization code required' });
    }

  const accessToken = await fyersService.getAccessToken(authCode);

  req.session.accessToken = accessToken;
  tokenStore.set(req.sessionID, accessToken);

    res.json({ 
      success: true, 
      message: 'Authentication successful'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check authentication status
fyersAuthRouter.get('/status', async (req: Request, res: Response) => {
  try {
  // Prefer tokenStore (multi-user); fallback to session
  const accessToken = tokenStore.get(req.sessionID) || req.session.accessToken;
    
    if (!accessToken) {
      return res.json({ authenticated: false });
    }

    fyersService.setAccessToken(accessToken);
    const profile = await fyersService.getProfile();

    res.json({ 
      authenticated: true,
      profile: profile.data 
    });
  } catch (error: any) {
    // Token might be expired
  req.session.accessToken = undefined;
  tokenStore.delete(req.sessionID);
    res.json({ authenticated: false, error: error.message });
  }
});

// Logout
fyersAuthRouter.post('/logout', async (req: Request, res: Response) => {
  try {
  const accessToken = tokenStore.get(req.sessionID) || req.session.accessToken;
    
    if (accessToken) {
  fyersService.setAccessToken(accessToken);
  await fyersService.logout();
    }
    
    // Destroy session
  req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to get current access token from session
export function getAccessTokenFromSession(req: express.Request): string | null {
  return tokenStore.get(req.sessionID) || req.session.accessToken || null;
}