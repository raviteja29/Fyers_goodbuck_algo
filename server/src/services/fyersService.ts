import axios from 'axios';
import crypto from 'crypto';
import { buildWeeklyOptionSymbol, buildMonthlyOptionSymbol, buildFutureSymbol, buildNearestWeeklyOption, validateSymbol, weekMonthCodeMap } from './symbolUtils.js';

interface FyersConfig {
  appId: string;
  secretKey: string;
  redirectUri: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiry?: number; // epoch seconds (from JWT or refresh calc)
}

class FyersService {
  private config: FyersConfig;
  private apiHost: string; // api-t1.fyers.in (test) or api.fyers.in (prod)
  private baseURL: string;  // Will be derived from apiHost
  private dataBaseURL: string; // Data API base (history/quotes/depth etc.) per docs

  constructor() {
    this.config = {
      appId: process.env.FYERS_APP_ID || process.env.FYERS_CLIENT_ID || '',
      secretKey: process.env.FYERS_APP_SECRET || process.env.FYERS_SECRET_KEY || process.env.FYERS_CLIENT_SECRET || '',
      redirectUri: process.env.FYERS_REDIRECT_URI || ''
    };

    // Determine API host: allow explicit override first, else infer from appId suffix (-100 tends to be test IDs)
    const inferredHost = this.config.appId.endsWith('-100') ? 'api-t1.fyers.in' : 'api.fyers.in';
    this.apiHost = process.env.FYERS_API_HOST || inferredHost;
  this.baseURL = `https://${this.apiHost}/api/v3`;
  // Data API (market data & historical candles) lives under /data per official docs
  // Example: https://api-t1.fyers.in/data/history?symbol=...&resolution=...&date_format=1&range_from=2021-01-01&range_to=2021-01-02&cont_flag=1
  this.dataBaseURL = `https://${this.apiHost}/data`;
    
    // Debug logging and validation
    console.log('Fyers Service Configuration:', {
      appId: this.config.appId ? `${this.config.appId.substring(0, 5)}...` : 'MISSING',
      secretKey: this.config.secretKey ? 'SET' : 'MISSING',
      redirectUri: this.config.redirectUri || 'MISSING',
      apiHost: this.apiHost,
      envVars: {
        FYERS_APP_ID: process.env.FYERS_APP_ID ? 'SET' : 'MISSING',
        FYERS_SECRET_KEY: process.env.FYERS_SECRET_KEY ? 'SET' : 'MISSING',
        FYERS_REDIRECT_URI: process.env.FYERS_REDIRECT_URI ? 'SET' : 'MISSING'
      }
    });

    // Validate required configuration
    if (!this.config.appId) {
      throw new Error('FYERS_APP_ID is required but not set in environment variables');
    }
    if (!this.config.secretKey) {
      throw new Error('FYERS_SECRET_KEY is required but not set in environment variables');
    }
    if (!this.config.redirectUri) {
      throw new Error('FYERS_REDIRECT_URI is required but not set in environment variables');
    }
  }

  // Generate authentication URL
  getAuthUrl(): string {
    // Validate configuration before generating URL
    if (!this.config.appId) {
      throw new Error('App ID is not configured. Please check FYERS_APP_ID environment variable.');
    }
    if (!this.config.redirectUri) {
      throw new Error('Redirect URI is not configured. Please check FYERS_REDIRECT_URI environment variable.');
    }

  const authUrl = `https://${this.apiHost}/api/v3/generate-authcode`;
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state: 'sample_state'
    });
    
    const fullAuthUrl = `${authUrl}?${params.toString()}`;
    console.log('Generated Fyers Auth URL:', {
      baseUrl: authUrl,
      clientId: this.config.appId,
      redirectUri: this.config.redirectUri,
      fullUrl: fullAuthUrl
    });
    
    return fullAuthUrl;
  }

  // Exchange auth code for access token
  async getAccessToken(authCode: string): Promise<string> {
    try {
      const appIdHash = this.generateAppIdHash();
      const payload = {
        grant_type: 'authorization_code',
        appIdHash,
        code: authCode
      } as const;

      console.log('Token exchange request:', {
        url: `${this.baseURL}/validate-authcode`,
        apiHost: this.apiHost,
        hashLength: appIdHash.length,
        hashPreview: appIdHash.substring(0, 16) + '...',
        grant_type: payload.grant_type,
        codePreview: authCode.substring(0, 20) + '...'
      });

      const response = await axios.post(`${this.baseURL}/validate-authcode`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Token exchange response:', {
        status: response.status,
        success: response.data.s,
        hasToken: !!response.data.access_token
      });

      if (response.data.s === 'ok') {
        this.config.accessToken = response.data.access_token;
        this.config.refreshToken = response.data.refresh_token;
        this.extractAndStoreExpiry(response.data.access_token);
        console.log('Access token obtained successfully', {
          hasRefresh: !!this.config.refreshToken,
          expiry: this.config.accessTokenExpiry
        });
        return response.data.access_token;
      }
      throw new Error(response.data.message || 'Failed to get access token');
    } catch (error: any) {
      const status = error.response?.status;
      const responseData = error.response?.data;
      console.error('Token exchange error:', {
        message: error.message,
        status,
        responseData,
        responseHeaders: error.response?.headers,
        apiHost: this.apiHost,
        expectedHashLength: 64,
        actualHashLength: this.generateAppIdHash().length,
        hint: this.generateAppIdHash().length !== 64 ? 'appIdHash length is not 64 (SHA-256 hex). Ensure hashing algorithm is SHA-256 over "appId:secret".' : undefined
      });
      const apiMessage = responseData?.message || error.message;
      // Provide actionable remediation in thrown error
      throw new Error(`Authentication failed (status ${status || 'n/a'} on ${this.apiHost}): ${apiMessage}`);
    }
  }

  // Generate appIdHash per docs: SHA-256 hex digest of `${appId}:${secretKey}`
  private generateAppIdHash(): string {
    const raw = `${this.config.appId}:${this.config.secretKey}`;
    return crypto.createHash('sha256').update(raw).digest('hex'); // 64-char lowercase hex
  }

  // Set access token
  setAccessToken(token: string) {
    this.config.accessToken = token;
  }

  // Attempt to decode JWT (header.payload.signature) to extract exp
  private extractAndStoreExpiry(jwt: string) {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) return;
      const payloadJson = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      if (typeof payload.exp === 'number') {
        this.config.accessTokenExpiry = payload.exp; // seconds
      }
    } catch {
      // ignore decode errors
    }
  }

  // Refresh access token using refresh_token
  async refreshAccessToken(pin?: string): Promise<string> {
    if (!this.config.refreshToken) {
      throw new Error('No refresh token available. Perform full login.');
    }
    const appIdHash = this.generateAppIdHash();
    const body: Record<string, string> = {
      grant_type: 'refresh_token',
      appIdHash,
      refresh_token: this.config.refreshToken
    };
    if (pin || process.env.FYERS_PIN) {
      body.pin = pin || process.env.FYERS_PIN as string;
    }
    console.log('Refreshing access token', { apiHost: this.apiHost, hasPin: !!body.pin });
    try {
      const resp = await axios.post(`${this.baseURL}/validate-refresh-token`, body, { headers: { 'Content-Type': 'application/json' } });
      if (resp.data.s !== 'ok') {
        throw new Error(resp.data.message || 'Refresh failed');
      }
      this.config.accessToken = resp.data.access_token;
      this.extractAndStoreExpiry(resp.data.access_token);
      console.log('Token refreshed', { expiry: this.config.accessTokenExpiry });
  return this.config.accessToken!;
    } catch (e: any) {
      console.error('Refresh token error', { status: e.response?.status, data: e.response?.data });
      throw new Error(`Refresh failed: ${e.response?.data?.message || e.message}`);
    }
  }

  // Helper: ensure token valid, refresh if expiring within thresholdSecs
  async ensureValidToken(thresholdSecs = 60): Promise<void> {
    if (!this.config.accessTokenExpiry) return;
    const now = Math.floor(Date.now() / 1000);
    if (this.config.accessTokenExpiry - now < thresholdSecs) {
      await this.refreshAccessToken();
    }
  }

  // Get chart data (historical OHLC)
  async getChartData(params: {
    symbol: string;
    resolution: string;
    rangeFrom: string;
    rangeTo: string;
    dateFormat?: string;
  }) {
    if (!this.config.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      // Pre-validate option symbols to fail fast with descriptive feedback
      const validation = this.symbol.validate(params.symbol);
      // If symbol looks like option (weekly/monthly classification) then enforce validity; otherwise allow pass-through
      if ((validation.classification === 'weekly' || validation.classification === 'monthly') && !validation.valid) {
        throw new Error(`Symbol validation failed: ${validation.issues.join('; ')}`);
      }
      // Per official Data API docs, historical endpoint is: GET /data/history
      // We previously tried /api/v3/history which returned 404 (plain text). Switching to documented path.
      const primaryResolution = process.env.FYERS_HISTORY_RESOLUTION || params.resolution;
      const altResolution = primaryResolution === 'D' ? '1D' : 'D';

      const attemptResolution = async (resolution: string) => {
        const qp = new URLSearchParams({
          symbol: params.symbol,
          resolution,
          date_format: params.dateFormat || '1',
          range_from: params.rangeFrom,
          range_to: params.rangeTo,
          cont_flag: '1'
        });
        const url = `${this.dataBaseURL}/history?${qp.toString()}`;
        const started = Date.now();
        try {
          const resp = await axios.get(url, {
            headers: { 'Authorization': `${this.config.appId}:${this.config.accessToken}` }
          });
          const elapsed = Date.now() - started;
          if (resp.data?.s !== 'ok') {
            console.warn('History API non-ok status', { resolution, statusField: resp.data?.s, keys: Object.keys(resp.data || {}) });
          }
          return { data: resp.data, elapsed, url, resolution };
        } catch (e: any) {
          const elapsed = Date.now() - started;
          const eresp = e.response;
          console.error('History API error', {
            resolution,
            url,
            status: eresp?.status,
            statusText: eresp?.statusText,
            elapsed,
            responseData: eresp?.data,
            headers: eresp?.headers,
            message: e.message
          });
          throw e;
        }
      };

      try {
        const first = await attemptResolution(primaryResolution);
        return first.data;
      } catch (e: any) {
        const status1 = e.response?.status;
        const code = e.response?.data?.code;
        if (code === -300) {
          // Invalid symbol: provide actionable hints based on symbology rules.
          // Option symbols format examples:
          // Monthly: NSE:NIFTY25OCT25650PE => {UNDERLYING}{YY}{MMM}{Strike}{CE|PE}
          // Weekly:  NSE:NIFTY25O0925650PE => {UNDERLYING}{YY}{M}{dd}{Strike}{CE|PE} where month code: 1..9,O,N,D
          // Your symbol appears as: params.symbol
          // Check list:
          // 1. Underlying correct (NIFTY / BANKNIFTY etc.)
          // 2. Year two digits after underlying
          // 3. Month: for weekly single char code not full month letter sequence
          // 4. Weekly day (dd) present for weekly contracts
          // 5. Strike integer matches lot increment
          // 6. Suffix CE/PE
          const symbolHint = 'Verify symbol against symbol master CSV/JSON (e.g. NSE_FO_sym_master.json). For weekly options use month code (1..9,O,N,D) + two-digit day. Example weekly: NSE:NIFTY25O0225600CE (Oct 02 2025). Example monthly: NSE:NIFTY25OCT25600CE.';
          throw new Error(`History fetch failed: Invalid symbol (-300). ${symbolHint}`);
        }
        if ((primaryResolution === 'D' || primaryResolution === '1D') && status1 === 404) {
          console.log('Retrying history with alternate resolution', { from: primaryResolution, to: altResolution });
          try {
            const second = await attemptResolution(altResolution);
            return second.data;
          } catch (e2: any) {
            const status2 = e2.response?.status;
            throw new Error(`History fetch failed (primary+alt resolutions) statuses=[${status1},${status2}]`);
          }
        }
        throw e;
      }
    } catch (error: any) {
      // Add upstream status / body if present
      const status = error.response?.status;
      const body = error.response?.data;
      const detail = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : error.message;
      throw new Error(`Failed to fetch chart data: ${detail}${status ? ` (HTTP ${status})` : ''}`);
    }
  }

  // Get option chain (Data API: /data/options-chain-v3)
  async getOptionChain(params: {
    symbol: string;
    strikecount?: number;
    timestamp?: number;
  }) {
    if (!this.config.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const queryParams = new URLSearchParams({
        symbol: params.symbol
      });

      if (params.strikecount) {
        queryParams.append('strikecount', params.strikecount.toString());
      }
      if (params.timestamp) {
        queryParams.append('timestamp', params.timestamp.toString());
      }

      const response = await axios.get(`${this.dataBaseURL}/options-chain-v3?${queryParams.toString()}`, {
        headers: {
          'Authorization': `${this.config.appId}:${this.config.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch option chain: ${error.message}`);
    }
  }

  // Get quotes (Data API: /data/quotes)
  async getQuotes(symbols: string[]) {
    if (!this.config.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(`${this.dataBaseURL}/quotes`, {
        params: { symbols: symbols.join(',') },
        headers: {
          'Authorization': `${this.config.appId}:${this.config.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch quotes: ${error.message}`);
    }
  }

  // Get user profile
  async getProfile() {
    if (!this.config.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(`${this.baseURL}/profile`, {
        headers: {
          'Authorization': `${this.config.appId}:${this.config.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
  }

  // Logout
  async logout() {
    if (!this.config.accessToken) {
      return;
    }

    try {
      await axios.delete(`${this.baseURL}/token`, {
        headers: {
          'Authorization': `${this.config.appId}:${this.config.accessToken}`
        }
      });
      this.config.accessToken = undefined;
    } catch (error: any) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // ---- Symbol helper exposure ----
  symbol = {
    buildWeekly: buildWeeklyOptionSymbol,
    buildMonthly: buildMonthlyOptionSymbol,
    buildFuture: buildFutureSymbol,
    buildNearestWeekly: buildNearestWeeklyOption,
    validate: validateSymbol,
    weeklyMonthCodes: weekMonthCodeMap
  };
}

export const fyersService = new FyersService();