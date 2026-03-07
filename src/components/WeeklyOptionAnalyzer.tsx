import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { LightweightCandlestickChart } from './LightweightCandlestickChart';


export function WeeklyOptionAnalyzer({ isAuthenticated }: { isAuthenticated: boolean }) {
  // Instrument quick select
  const [instrument, setInstrument] = useState<'NIFTY' | 'BANKNIFTY' | 'FINNIFTY' | 'GIFTNIFTY'>('NIFTY');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [resolution, setResolution] = useState('15');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const prevResolutionRef = useRef(resolution);

  const disabled = !isAuthenticated || !from || !to || !expiry || loading;
  const HMA_PERIOD = 50;

  const resolutionLabel = (value: string) => {
    if (value === '60') return '1 Hour';
    if (value === '1') return '1 Min';
    if (value === '5') return '5 Min';
    if (value === '15') return '15 Min';
    if (value === 'D') return 'Daily';
    return `${value} Min`;
  };

  const formatPrice = (value?: number | null) => {
    if (value === undefined || value === null) return '--';
    return value.toFixed(2);
  };

  // Calculate HMA 50
  const calculateHMA = (data: any[], period = HMA_PERIOD) => {
    if (!data.length || period <= 0) return [];

    const typicalPrices = data.map((c) => (c.high + c.low + c.close) / 3);

    const weightedMovingAverage = (series: (number | null)[], length: number) => {
      const result = Array(series.length).fill(null) as (number | null)[];
      if (length <= 0) return result;
      const weightSum = (length * (length + 1)) / 2;

      for (let i = length - 1; i < series.length; i++) {
        let acc = 0;
        let valid = true;
        for (let j = 0; j < length; j++) {
          const value = series[i - j];
          if (value === null || value === undefined) {
            valid = false;
            break;
          }
          acc += value * (length - j);
        }
        result[i] = valid ? acc / weightSum : null;
      }

      return result;
    };

    const halfLength = Math.max(1, Math.round(period / 2));
    const sqrtLength = Math.max(1, Math.round(Math.sqrt(period)));

    const wmaHalf = weightedMovingAverage(typicalPrices, halfLength);
    const wmaFull = weightedMovingAverage(typicalPrices, period);

    const diffSeries = typicalPrices.map((_, idx) => {
      const shortVal = wmaHalf[idx];
      const longVal = wmaFull[idx];
      if (shortVal === null || shortVal === undefined || longVal === null || longVal === undefined) {
        return null;
      }
      return 2 * shortVal - longVal;
    });

    const hma = weightedMovingAverage(diffSeries, sqrtLength);
    return hma;
  };

  const computeMarkers = (series: any[] | null | undefined) => {
    if (!series || series.length === 0) return [] as {
      time: number;
      color: string;
      position?: 'aboveBar' | 'belowBar';
      shape?: 'arrowUp' | 'arrowDown';
      text?: string;
    }[];

    const markers: {
      time: number;
      color: string;
      position?: 'aboveBar' | 'belowBar';
      shape?: 'arrowUp' | 'arrowDown';
      text?: string;
    }[] = [];

    let prevSlope: number | null = null;

    for (let i = 1; i < series.length; i++) {
      const curr = series[i];
      const prev = series[i - 1];
      if (!curr || !prev) continue;
      if (curr.hma == null || prev.hma == null) continue;

      const currSlope = curr.hma - prev.hma;
      if (prevSlope === null) {
        prevSlope = currSlope;
        continue;
      }

      if (currSlope > 0 && prevSlope <= 0) {
        markers.push({
          time: typeof curr.time === 'number' ? curr.time : curr.timestamp,
          color: '#22c55e',
          position: 'belowBar',
          shape: 'arrowUp',
          text: 'HMA↑',
        });
      } else if (currSlope < 0 && prevSlope >= 0) {
        markers.push({
          time: typeof curr.time === 'number' ? curr.time : curr.timestamp,
          color: '#ef4444',
          position: 'aboveBar',
          shape: 'arrowDown',
          text: 'HMA↓',
        });
      }

      prevSlope = currSlope;
    }

    return markers;
  };

  // Convert raw candles to chart format with HMA and IST timezone
  const processedPeData = useMemo(() => {
    if (!result?.series?.pe?.candles) return null;
    const sorted = [...result.series.pe.candles].sort((a: any, b: any) => a[0] - b[0]);
    const candles = sorted.map((c: any) => ({
      time: c[0],
      timestamp: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
    }));
    const hma = calculateHMA(candles, 50);
    return candles.map((c: any, i: number) => ({ ...c, hma: hma[i] }));
  }, [result]);

  const processedCeData = useMemo(() => {
    if (!result?.series?.ce?.candles) return null;
    const sorted = [...result.series.ce.candles].sort((a: any, b: any) => a[0] - b[0]);
    const candles = sorted.map((c: any) => ({
      time: c[0],
      timestamp: c[0],
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
    }));
    const hma = calculateHMA(candles, 50);
    return candles.map((c: any, i: number) => ({ ...c, hma: hma[i] }));
  }, [result]);

  const peLines = useMemo(() => {
    const peRange = result?.optionRange?.pe;
    if (!peRange) return [];
    const lines = [] as {
      price: number;
      color?: string;
      title?: string;
      lineStyle?: number;
    }[];
    if (typeof peRange.high === 'number') {
      lines.push({ price: peRange.high, color: '#22c55e', title: 'PE High' });
    }
    if (typeof peRange.low === 'number') {
      lines.push({ price: peRange.low, color: '#ef4444', title: 'PE Low' });
    }
    if (typeof peRange.high === 'number' && typeof peRange.low === 'number') {
      const mid = (peRange.high + peRange.low) / 2;
      lines.push({ price: mid, color: '#0ea5e9', title: 'PE Mid', lineStyle: 2 });
    }
    return lines;
  }, [result]);

  const ceLines = useMemo(() => {
    const ceRange = result?.optionRange?.ce;
    if (!ceRange) return [];
    const lines = [] as {
      price: number;
      color?: string;
      title?: string;
      lineStyle?: number;
    }[];
    if (typeof ceRange.high === 'number') {
      lines.push({ price: ceRange.high, color: '#22c55e', title: 'CE High' });
    }
    if (typeof ceRange.low === 'number') {
      lines.push({ price: ceRange.low, color: '#ef4444', title: 'CE Low' });
    }
    if (typeof ceRange.high === 'number' && typeof ceRange.low === 'number') {
      const mid = (ceRange.high + ceRange.low) / 2;
      lines.push({ price: mid, color: '#0ea5e9', title: 'CE Mid', lineStyle: 2 });
    }
    return lines;
  }, [result]);

  const peMarkers = useMemo(() => computeMarkers(processedPeData), [processedPeData]);
  const ceMarkers = useMemo(() => computeMarkers(processedCeData), [processedCeData]);

  const runAnalysis = useCallback(async () => {
    if (!isAuthenticated || !from || !to || !expiry) return;
    setLoading(true);
    setError(null);
    try {
      // Pass instrument to backend
      const data = await apiService.analyzeWeekly({ instrument, from, to, expiry, resolution });
      setResult(data);
      setHasAnalyzed(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, instrument, from, to, expiry, resolution]);

  useEffect(() => {
    if (!hasAnalyzed) {
      prevResolutionRef.current = resolution;
      return;
    }
    if (prevResolutionRef.current === resolution) return;
    prevResolutionRef.current = resolution;
    if (!isAuthenticated || !from || !to || !expiry) return;
    if (loading) return;
    runAnalysis();
  }, [hasAnalyzed, isAuthenticated, from, to, expiry, resolution, loading, runAnalysis]);

  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-600/50 rounded-lg p-4 space-y-4 shadow-xl backdrop-blur-sm">
      <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Weekly Option Analyzer</h2>

      {/* Instrument Quick Select */}
      <div className="mb-2 flex flex-wrap gap-2">
        {['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'GIFTNIFTY'].map((inst) => (
          <button
            key={inst}
            className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all border-2
              ${instrument === inst ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
            onClick={() => setInstrument(inst as any)}
          >
            {inst === 'GIFTNIFTY' ? 'GIFT NIFTY' : inst}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-slate-300 text-sm mb-1.5 font-medium">From Date</label>
          <input 
            type="date"
            className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={from} 
            onChange={e=>setFrom(e.target.value)} 
            placeholder="2025-10-01" 
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1.5 font-medium">To Date</label>
          <input 
            type="date"
            className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={to} 
            onChange={e=>setTo(e.target.value)} 
            placeholder="2025-10-14" 
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1.5 font-medium">Expiry Date</label>
          <input 
            type="date"
            className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            value={expiry} 
            onChange={e=>setExpiry(e.target.value)} 
            placeholder="2025-10-20" 
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1.5 font-medium">Timeframe</label>
          <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-600">
            <button
              onClick={() => setResolution('15')}
              className={`flex-1 px-2 py-1.5 rounded-md font-medium text-xs transition-all ${
                resolution === '15'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              15m
            </button>
            <button
              onClick={() => setResolution('60')}
              className={`flex-1 px-2 py-1.5 rounded-md font-medium text-xs transition-all ${
                resolution === '60'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1h
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
  <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-none" disabled={disabled} onClick={runAnalysis}>
          {loading ? 'Analyzing…' : 'Analyze Weekly Options'}
        </button>
        {!isAuthenticated && <span className="text-amber-400 text-sm">Login first to analyze</span>}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {result && (
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-slate-200 text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Effective Expiry:</span> 
                  <span className="font-mono text-blue-400 font-semibold">{result?.inputs?.effectiveExpiry}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Requested:</span> 
                  <span className="font-mono text-slate-300">{result?.inputs?.expiry}</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-slate-200 text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">High / Low:</span> 
                  <span className="font-semibold">
                    <span className="text-emerald-400">{result?.range?.high}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-rose-400">{result?.range?.low}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Strikes:</span> 
                  <span className="font-semibold">
                    <span className="text-rose-400">PE {result?.strikes?.pe}</span>
                    <span className="text-slate-500 mx-1">|</span>
                    <span className="text-emerald-400">CE {result?.strikes?.ce}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/50 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-slate-200 text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Data Window:</span> 
                  <span className="font-semibold text-indigo-400">{result?.dataWindow?.days || 30} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Candles:</span> 
                  <span className="font-semibold">
                    <span className="text-blue-400">PE: {result?.series?.pe?.candles?.length || 0}</span>
                    <span className="text-slate-500 mx-1">|</span>
                    <span className="text-emerald-400">CE: {result?.series?.ce?.candles?.length || 0}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">PE High / Low:</span>
                  <span className="font-semibold">
                    <span className="text-emerald-400">{formatPrice(result?.optionRange?.pe?.high)}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-rose-400">{formatPrice(result?.optionRange?.pe?.low)}</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">CE High / Low:</span>
                  <span className="font-semibold">
                    <span className="text-emerald-400">{formatPrice(result?.optionRange?.ce?.high)}</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-rose-400">{formatPrice(result?.optionRange?.ce?.low)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/50 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-slate-200 text-sm space-y-2">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">PE Symbol</span>
                <span className="font-mono text-xs text-blue-300 bg-slate-900/50 px-2 py-1 rounded">{result?.symbols?.pe}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">CE Symbol</span>
                <span className="font-mono text-xs text-emerald-300 bg-slate-900/50 px-2 py-1 rounded">{result?.symbols?.ce}</span>
              </div>
            </div>
          </div>

          {/* Candlestick Charts - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {processedPeData && processedPeData.length > 0 && (
              <LightweightCandlestickChart
                data={processedPeData}
                title={`${result?.strikes?.pe} PE - Weekly Option`}
                timeframeLabel={resolutionLabel(resolution)}
                hmaLabel={`HMA 50 (${resolutionLabel(resolution)})`}
                showHMA={true}
                height={450}
                staticLines={peLines}
                markers={peMarkers}
              />
            )}

            {processedCeData && processedCeData.length > 0 && (
              <LightweightCandlestickChart
                data={processedCeData}
                title={`${result?.strikes?.ce} CE - Weekly Option`}
                timeframeLabel={resolutionLabel(resolution)}
                hmaLabel={`HMA 50 (${resolutionLabel(resolution)})`}
                showHMA={true}
                height={450}
                staticLines={ceLines}
                markers={ceMarkers}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyOptionAnalyzer;
