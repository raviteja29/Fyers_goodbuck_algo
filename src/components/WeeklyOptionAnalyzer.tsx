import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import { LightweightCandlestickChart } from './LightweightCandlestickChart';

export function WeeklyOptionAnalyzer({ isAuthenticated }: { isAuthenticated: boolean }) {
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

  const resolutionLabel = (value: string) => {
    if (value === '60') return '1 Hour';
    if (value === '1') return '1 Min';
    if (value === '5') return '5 Min';
    if (value === '15') return '15 Min';
    if (value === 'D') return 'Daily';
    return `${value} Min`;
  };

  // Calculate HMA 50
  const calculateHMA = (data: any[], period = 50) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const prices = data.slice(i - period + 1, i + 1).map(d => d.close);
        const sum = prices.reduce((a, b) => a + b, 0);
        result.push(sum / prices.length);
      }
    }
    return result;
  };

  // Convert raw candles to chart format with HMA and IST timezone
  const processedPeData = useMemo(() => {
    if (!result?.series?.pe?.candles) return null;
    const candles = result.series.pe.candles.map((c: any) => ({
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
    const candles = result.series.ce.candles.map((c: any) => ({
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

  const runAnalysis = useCallback(async () => {
    if (!isAuthenticated || !from || !to || !expiry) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.analyzeWeekly({ from, to, expiry, resolution });
      setResult(data);
      setHasAnalyzed(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, from, to, expiry, resolution]);

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
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklyOptionAnalyzer;
