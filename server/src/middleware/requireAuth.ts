import { Request, Response, NextFunction } from 'express';
import { fyersService } from '../services/fyersService.js';
import { tokenStore } from '../services/tokenStore.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.session.accessToken;
  const storeToken = tokenStore.get(req.sessionID);
  const token = storeToken || sessionToken;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please login first.' });
  }
  fyersService.setAccessToken(token);
  next();
}