// Kite authentication and session management service
import { KiteConnect } from "kiteconnect";

const apiKey = "mt23bk4vqz8uryv2";
const apiSecret = "38oqwj6yq222ek0w5svl6ww7ex43nqmi";
const redirectUri = process.env.KITE_REDIRECT_URI || "http://localhost:3002/api/kite/callback";

const kite = new KiteConnect({
  api_key: apiKey,
});

let accessToken: string | null = null;

export function getLoginUrl() {
  return kite.getLoginURL();
}

export async function generateSession(requestToken: string) {
  const session = await kite.generateSession(requestToken, apiSecret);
  accessToken = session.access_token;
  kite.setAccessToken(accessToken);
  return session;
}

export function getKiteInstance() {
  if (!accessToken) throw new Error("Not authenticated with Kite");
  return kite;
}

export function getAccessToken() {
  return accessToken;
}

export function logout() {
  accessToken = null;
}
