
import express from "express";
import { getLoginUrl, generateSession, getAccessToken, logout, getKiteInstance } from "../services/kiteService.js";

const router = express.Router();

// Get live positions
router.get("/positions", async (req, res) => {
  try {
    const kite = getKiteInstance();
    const positions = await kite.getPositions();
    res.json(positions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get live holdings
router.get("/holdings", async (req, res) => {
  try {
    const kite = getKiteInstance();
    const holdings = await kite.getHoldings();
    res.json(holdings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Step 1: Get Kite login URL
router.get("/url", (req, res) => {
  const url = getLoginUrl();
  res.json({ url });
});

// Step 2: Handle Kite OAuth callback
router.get("/callback", async (req, res) => {
  const { request_token, status } = req.query;
  if (!request_token || status !== "success") {
    return res.redirect("/?auth=failed");
  }
  try {
    const session = await generateSession(request_token as string);
    req.session.accessToken = session.access_token;
    res.redirect("/?auth=success");
  } catch (err: any) {
    res.redirect("/?auth=failed&error=" + encodeURIComponent(err.message));
  }
});

// Step 3: Check authentication status
router.get("/status", (req, res) => {
  const token = getAccessToken();
  res.json({ authenticated: !!token });
});

// Step 4: Logout
router.post("/logout", (req, res) => {
  logout();
  req.session.accessToken = undefined;
  res.json({ success: true });
});

export default router;
