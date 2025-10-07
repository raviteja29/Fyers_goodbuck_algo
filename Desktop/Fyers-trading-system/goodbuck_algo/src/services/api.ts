const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface AuthStatus {
  authenticated: boolean;
  profile?: any;
  error?: string;
}

export interface NiftyRange {
  high: number;
  low: number;
  rawData?: any;
}

export interface CalculatedStrikes {
  weekRange: { high: number; low: number };
  strikes: { pe: number; ce: number };
  peSymbol: string;
  ceSymbol: string;
}

class ApiService {
  // Get auth URL
  async getAuthUrl(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/url`);
    const data = await response.json();
    return data.authUrl;
  }

  // Check authentication status
  async checkAuthStatus(): Promise<AuthStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/status`, {
        credentials: 'include'
      });
      return await response.json();
    } catch (error) {
      return { authenticated: false, error: 'Failed to check auth status' };
    }
  }

  // Logout
  async logout(): Promise<void> {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  }

  // Get NIFTY range for dates
  async getNiftyRange(rangeFrom: string, rangeTo: string): Promise<NiftyRange> {
    const response = await fetch(
      `${API_BASE_URL}/data/nifty-range?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch NIFTY range');
    }
    const data = await response.json();
    return data;
  }

  // Get option chart data
  async getOptionChart(
    symbol: string,
    resolution: string,
    rangeFrom: string,
    rangeTo: string
  ): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/data/option-chart?symbol=${symbol}&resolution=${resolution}&rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch option chart');
    }
    return await response.json();
  }

  // Calculate strikes based on previous week
  async calculateStrikes(rangeFrom: string, rangeTo: string): Promise<CalculatedStrikes> {
    const response = await fetch(
      `${API_BASE_URL}/data/calculate-strikes?rangeFrom=${rangeFrom}&rangeTo=${rangeTo}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      throw new Error('Failed to calculate strikes');
    }
    return await response.json();
  }

  // Get option chain
  async getOptionChain(symbol: string, strikecount?: number): Promise<any> {
    let url = `${API_BASE_URL}/data/option-chain?symbol=${symbol}`;
    if (strikecount) {
      url += `&strikecount=${strikecount}`;
    }
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to fetch option chain');
    }
    return await response.json();
  }

  // Get quotes
  async getQuotes(symbols: string[]): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/data/quotes?symbols=${symbols.join(',')}`,
      { credentials: 'include' }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch quotes');
    }
    return await response.json();
  }
}

export const apiService = new ApiService();