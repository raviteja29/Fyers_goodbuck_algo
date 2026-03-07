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

    // Auth routes will be implemented for Kite API integration