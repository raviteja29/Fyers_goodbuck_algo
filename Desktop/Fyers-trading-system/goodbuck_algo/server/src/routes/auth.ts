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
    console.log('OAuth callback received raw query:', req.query);
    const { auth_code, code, state } = req.query as any;

    // Fyers should return auth_code; log if only code is present (just in case of API variation)
    const effectiveCode = auth_code || code;

    if (!effectiveCode) {
      return res.status(400).json({ error: 'Authorization code (auth_code) not received' });
    }

    const accessToken = await fyersService.getAccessToken(String(effectiveCode));

    // Store token both in session and tokenStore (session ID acts as user key)
    req.session.accessToken = accessToken;
    tokenStore.set(req.sessionID, accessToken);

    // Force save the session before redirect to ensure Set-Cookie is flushed
    console.log('About to save session (pre-redirect)', { sessionID: req.sessionID, hasAccessToken: !!req.session.accessToken });
    req.session.save(err => {
      if (err) {
        console.error('Session save error:', err);
      }
      console.log('Auth callback success', {
        sessionID: req.sessionID,
        hasAccess: !!req.session.accessToken
      });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}?auth=success&sid=${encodeURIComponent(req.sessionID.substring(0,8))}`);
    });
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
    console.log('STATUS request', {
      sessionID: req.sessionID.substring(0,8),
      hasSession: !!req.session.accessToken,
      hasStore: !!tokenStore.get(req.sessionID),
      cookieHeader: req.headers.cookie
    });
    
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

// Quick ping to check auth without profile fetch
fyersAuthRouter.get('/ping', (req: Request, res: Response) => {
  const accessToken = tokenStore.get(req.sessionID) || req.session.accessToken;
  console.log('PING request', {
    sessionID: req.sessionID.substring(0,8),
    hasSession: !!req.session.accessToken,
    hasStore: !!tokenStore.get(req.sessionID)
  });
  res.json({ 
    authenticated: !!accessToken,
    sessionID: req.sessionID.substring(0, 8),
    hasSessionToken: !!req.session.accessToken,
    hasStoreToken: !!tokenStore.get(req.sessionID)
  });
});

// Debug: view raw session / headers (DO NOT enable in production)
fyersAuthRouter.get('/debug/session', (req: Request, res: Response) => {
  res.json({
    sessionID: req.sessionID,
    hasSessionAccessToken: !!req.session.accessToken,
    tokenStoreHas: !!tokenStore.get(req.sessionID),
    cookieHeader: req.headers['cookie'],
    cookiesParsed: (req as any).cookies,
    sessionKeys: Object.keys(req.session || {})
  });
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