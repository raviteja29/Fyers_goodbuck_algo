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
      // Calculate strikes based on previous week
      const strikeData = await apiService.calculateStrikes(
        config.rangeFrom,
        config.rangeTo
      );

      setData(prev => ({
        ...prev,
        niftyRange: strikeData.weekRange,
        strikes: strikeData.strikes
      }));

      // Fetch PE option data
      const resolution = config.resolution || '60';
      const peChartData: OptionChartResponse = await apiService.getOptionChart(
        strikeData.peSymbol,
        resolution,
        config.rangeFrom,
        config.rangeTo
      );

      // Fetch CE option data
      const ceChartData: OptionChartResponse = await apiService.getOptionChart(
        strikeData.ceSymbol,
        resolution,
        config.rangeFrom,
        config.rangeTo
      );

      // Transform candle data to component format
      const transformData = (candles: number[][]): CandlePoint[] => candles.map((candle, idx) => ({
        time: new Date(candle[0] * 1000).toLocaleString(),
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        idx
      }));

      setData(prev => ({
        ...prev,
        peData: peChartData.candles ? transformData(peChartData.candles) : null,
        ceData: ceChartData.candles ? transformData(ceChartData.candles) : null,
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