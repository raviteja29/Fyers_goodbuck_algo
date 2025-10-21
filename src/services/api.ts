const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3002/api';

import type { OptionChartResponse, OptionChainResponse, QuotesResponse, UserProfile } from '../types/market';

export interface AuthStatus {
  authenticated: boolean;
  profile?: UserProfile;
  error?: string;
} 

export interface NiftyRange {
  success: boolean;
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
  private async request<T>(path: string, options: RequestInit & { query?: Record<string, any> } = {}): Promise<T> {
    const { query, ...init } = options;
    let url = `${API_BASE_URL}${path}`;
    if (query) {
      const qs = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        qs.append(k, String(v));
      });
      const qsString = qs.toString();
      if (qsString) url += (url.includes('?') ? '&' : '?') + qsString;
    }
    try {
      const res = await fetch(url, {
        credentials: 'include',
        ...init
      });
      const contentType = res.headers.get('content-type');
      let body: any = null;
      if (contentType && contentType.includes('application/json')) {
        try { body = await res.json(); } catch { body = null; }
      } else {
        body = await res.text();
      }
      if (!res.ok) {
        const message = body?.error || body?.message || `Request failed (${res.status})`;
        throw new Error(message);
      }
      return body as T;
    } catch (err: any) {
      // Re-throw with normalized message
      throw new Error(err?.message || 'Network request failed');
    }
  }

  // Get auth URL
  async getAuthUrl(): Promise<string> {
    const data = await this.request<{ authUrl: string }>(`/auth/url`);
    return data.authUrl;
  }

  // Check authentication status
  async checkAuthStatus(): Promise<AuthStatus> {
    try {
      return await this.request<AuthStatus>(`/auth/status`);
    } catch (error) {
      return { authenticated: false, error: (error as Error).message };
    }
  }

  // Logout
  async logout(): Promise<void> {
    await this.request(`/auth/logout`, { method: 'POST' });
  }

  // Get NIFTY range for dates
  async getNiftyRange(rangeFrom: string, rangeTo: string): Promise<NiftyRange> {
    return this.request<NiftyRange>(`/data/nifty-range`, { query: { rangeFrom, rangeTo } });
  }

  // Get option chart data
  async getOptionChart(
    symbol: string,
    resolution: string,
    rangeFrom: string,
    rangeTo: string
  ): Promise<OptionChartResponse> {
    return this.request<OptionChartResponse>(`/data/option-chart`, { query: { symbol, resolution, rangeFrom, rangeTo } });
  }

  // Calculate strikes based on previous week
  async calculateStrikes(rangeFrom: string, rangeTo: string): Promise<CalculatedStrikes> {
    return this.request<CalculatedStrikes>(`/data/calculate-strikes`, { query: { rangeFrom, rangeTo } });
  }

  // Get option chain
  async getOptionChain(symbol: string, strikecount?: number): Promise<OptionChainResponse> {
    return this.request<OptionChainResponse>(`/data/option-chain`, { query: { symbol, strikecount } });
  }

  // Get quotes
  async getQuotes(symbols: string[]): Promise<QuotesResponse> {
    return this.request<QuotesResponse>(`/data/quotes`, { query: { symbols: symbols.join(',') } });
  }

  // Analyze weekly options (range -> strikes -> effective expiry -> 30d series)
  async analyzeWeekly(params: { from: string; to: string; expiry: string; resolution?: string }) {
    return this.request<any>(`/data/analyze-weekly`, { query: params });
  }
}

export const apiService = new ApiService();