import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { OptionChartResponse } from '../types/market';

export interface LiveDataConfig {
  enabled: boolean;
  rangeFrom: string;
  rangeTo: string;
  refreshInterval?: number; // in milliseconds
  resolution?: string; // timeframe like '1','5','15','60','240','D'
}

export interface LiveData {
  niftyRange: { high: number; low: number } | null;
  strikes: { pe: number; ce: number } | null;
  peData: CandlePoint[] | null;
  ceData: CandlePoint[] | null;
  loading: boolean;
  error: string | null;
}

interface CandlePoint {
  time: string; // localized string
  timestamp: number; // epoch seconds
  open: number; high: number; low: number; close: number; idx: number;
}

export const useLiveData = (config: LiveDataConfig) => {
  const [data, setData] = useState<LiveData>({
    niftyRange: null,
    strikes: null,
    peData: null,
    ceData: null,
    loading: false,
    error: null
  });

  const fetchData = useCallback(async () => {
    if (!config.enabled) return;

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get actual next expiry from option chain instead of calculating
      // This avoids issues with holidays, weekends, or incorrect expiry day assumptions
      const resolution = config.resolution || '60';
      
      // Use today's date as a reasonable default expiry for the analyze endpoint
      // The backend will fetch the option chain and correct it to the nearest valid expiry
      const todayExpiry = config.rangeTo; // Let backend correct this via option chain
      
      const analysis = await apiService.analyzeWeekly({
        from: config.rangeFrom,
        to: config.rangeTo,
        expiry: todayExpiry, // Backend will suggest correct expiry from chain
        resolution
      });

      // Transform helper
      const transformData = (candles: number[][]): CandlePoint[] => candles.map((candle, idx) => ({
        time: new Date(candle[0] * 1000).toLocaleString(),
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        idx
      }));

      const peCandles = analysis?.series?.pe?.candles || [];
      const ceCandles = analysis?.series?.ce?.candles || [];

      setData(prev => ({
        ...prev,
        niftyRange: analysis?.range ? { high: analysis.range.high, low: analysis.range.low } : null,
        strikes: analysis?.strikes || null,
        peData: peCandles.length ? transformData(peCandles) : null,
        ceData: ceCandles.length ? transformData(ceCandles) : null,
        loading: false
      }));

    } catch (error: any) {
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  }, [config.enabled, config.rangeFrom, config.rangeTo, config.resolution]);

  useEffect(() => {
    fetchData();

    // Set up auto-refresh if interval is provided
    if (config.enabled && config.refreshInterval) {
      const interval = setInterval(fetchData, config.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, config.refreshInterval]);

  return { ...data, refetch: fetchData };
};