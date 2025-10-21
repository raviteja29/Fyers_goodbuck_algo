// Shared market / option related types

export interface Candle {
  // epoch seconds for fyers; transformed to ISO/string in UI as needed
  time: number; // seconds since epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface OptionChartResponse {
  s: string; // status like "ok"
  candles?: number[][]; // raw numeric candles [epoch, o, h, l, c, volume?]
  message?: string;
}

export interface OptionChainLeg {
  strikePrice: number;
  optionType: 'CE' | 'PE';
  ltp: number; // last traded price
  volume?: number;
  oi?: number;
  change?: number;
  percentChange?: number;
  symbol?: string;
  [key: string]: any; // allow extra fields from API until fully modeled
}

export interface OptionChainResponse {
  underlying: string;
  expiry: string;
  updated: string | number;
  ce: OptionChainLeg[];
  pe: OptionChainLeg[];
  raw?: any;
}

export interface QuoteItem {
  symbol: string;
  ltp: number;
  ch?: number;
  chp?: number; // percent change
  volume?: number;
  bid?: number;
  ask?: number;
  [key: string]: any;
}

export interface QuotesResponse {
  success: boolean;
  data: QuoteItem[];
  error?: string;
}

export interface UserProfile {
  name?: string;
  email_id?: string;
  [key: string]: any;
}
