import axios from 'axios';

interface FyersConfig {
  appId: string;
  secretKey: string;
  redirectUri: string;
  accessToken?: string;
}

class FyersService {
  private config: FyersConfig;
  private baseURL = 'https://api-t1.fyers.in/api/v3';

  constructor() {
    this.config = {
      appId: process.env.FYERS_APP_ID || '',
      secretKey: process.env.FYERS_SECRET_KEY || '',
      redirectUri: process.env.FYERS_REDIRECT_URI || ''
    };
  }

  // Generate authentication URL
  getAuthUrl(): string {
    const authUrl = `https://api-t1.fyers.in/api/v3/generate-authcode`;
    const params = new URLSearchParams({
      client_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      state: 'sample_state'
    });
    return `${authUrl}?${params.toString()}`;
  }

  // Exchange auth code for access token
  async getAccessToken(authCode: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseURL}/validate-authcode`, {
        grant_type: 'authorization_code',
        appIdHash: this.generateAppIdHash(),
        code: authCode
      });

      if (response.data.s === 'ok') {
        this.config.accessToken = response.data.access_token;
        return response.data.access_token;
      }
      throw new Error(response.data.message || 'Failed to get access token');
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Generate app ID hash (appId:secretKey in base64)
  private generateAppIdHash(): string {
    const hash = `${this.config.appId}:${this.config.secretKey}`;
    return Buffer.from(hash).toString('base64');
  }

  // Set access token
  setAccessToken(token: string) {
    this.config.accessToken = token;
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
      const queryParams = new URLSearchParams({
        symbol: params.symbol,
        resolution: params.resolution,
        date_format: params.dateFormat || '1',
        range_from: params.rangeFrom,
        range_to: params.rangeTo,
        cont_flag: '1'
      });

      const response = await axios.get(`${this.baseURL}/history?${queryParams.toString()}`, {
        headers: {
          'Authorization': `${this.config.appId}:${this.config.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch chart data: ${error.message}`);
    }
  }

  // Get option chain
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

      const response = await axios.get(`${this.baseURL}/optionchain?${queryParams.toString()}`, {
        headers: {
          'Authorization': `${this.config.appId}:${this.config.accessToken}`
        }
      });

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch option chain: ${error.message}`);
    }
  }

  // Get quotes (current market data)
  async getQuotes(symbols: string[]) {
    if (!this.config.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    try {
      const response = await axios.get(`${this.baseURL}/quotes`, {
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
}

export const fyersService = new FyersService();