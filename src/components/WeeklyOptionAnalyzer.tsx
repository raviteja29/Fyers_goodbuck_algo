import React, { useState, useMemo } from 'react';
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

  const disabled = !isAuthenticated || !from || !to || !expiry || loading;

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

  // Convert raw candles to chart format with HMA
  const processedPeData = useMemo(() => {
    if (!result?.series?.pe?.candles) return null;
    const candles = result.series.pe.candles.map((c: any) => ({
      time: c[0],
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
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
    }));
    const hma = calculateHMA(candles, 50);
    return candles.map((c: any, i: number) => ({ ...c, hma: hma[i] }));
  }, [result]);

  const onAnalyze = async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiService.analyzeWeekly({ from, to, expiry, resolution });
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded p-4 space-y-4">
      <h2 className="text-lg font-semibold text-slate-200">Weekly Option Analyzer</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-slate-300 text-sm mb-1">From (YYYY-MM-DD)</label>
          <input className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1" value={from} onChange={e=>setFrom(e.target.value)} placeholder="2025-10-01" />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1">To (YYYY-MM-DD)</label>
          <input className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1" value={to} onChange={e=>setTo(e.target.value)} placeholder="2025-10-14" />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1">Expiry (YYYY-MM-DD)</label>
          <input className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1" value={expiry} onChange={e=>setExpiry(e.target.value)} placeholder="2025-10-20" />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-1">Resolution</label>
          <select className="w-full bg-slate-800 text-slate-100 border border-slate-700 rounded px-2 py-1" value={resolution} onChange={e=>setResolution(e.target.value)}>
            <option value="1">1m</option>
            <option value="5">5m</option>
            <option value="15">15m</option>
            <option value="60">60m</option>
            <option value="D">Daily</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white px-4 py-2 rounded" disabled={disabled} onClick={onAnalyze}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
        {!isAuthenticated && <span className="text-amber-400 text-sm">Login first to analyze</span>}
      </div>

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="mt-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <div className="text-slate-200 text-sm space-y-1">
                <div><span className="text-slate-400">Effective Expiry:</span> <span className="font-mono">{result?.inputs?.effectiveExpiry}</span></div>
                <div><span className="text-slate-400">Requested:</span> <span className="font-mono">{result?.inputs?.expiry}</span></div>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded p-3">
              <div className="text-slate-200 text-sm space-y-1">
                <div><span className="text-slate-400">High / Low:</span> {result?.range?.high} / {result?.range?.low}</div>
                <div><span className="text-slate-400">Strikes:</span> PE {result?.strikes?.pe}, CE {result?.strikes?.ce}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded p-3">
            <div className="text-slate-200 text-sm space-y-1">
              <div><span className="text-slate-400">PE Symbol:</span> <span className="font-mono text-xs">{result?.symbols?.pe}</span></div>
              <div><span className="text-slate-400">CE Symbol:</span> <span className="font-mono text-xs">{result?.symbols?.ce}</span></div>
            </div>
          </div>

          {/* Candlestick Charts */}
          {processedPeData && processedPeData.length > 0 && (
            <LightweightCandlestickChart
              data={processedPeData}
              title={`${result?.strikes?.pe} PE - Weekly Option`}
              showHMA={true}
              height={400}
            />
          )}

          {processedCeData && processedCeData.length > 0 && (
            <LightweightCandlestickChart
              data={processedCeData}
              title={`${result?.strikes?.ce} CE - Weekly Option`}
              showHMA={true}
              height={400}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default WeeklyOptionAnalyzer;
