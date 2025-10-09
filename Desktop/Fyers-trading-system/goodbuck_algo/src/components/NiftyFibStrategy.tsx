import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Clock, GitCompare, RefreshCw } from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';

const CandlestickChart = ({ data, fibLevels, title }: any) => {
  const yMin = Math.min(...data.map((d: any) => d.low)) - 20;
  const yMax = Math.max(...data.map((d: any) => d.high)) + 20;
  const yRange = yMax - yMin;
  
  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="relative" style={{ height: '450px' }}>
        <svg width="100%" height="100%" viewBox="0 0 1000 450" preserveAspectRatio="xMidYMid meet">
          {Object.entries(fibLevels).map(([level, price]: any) => {
            const y = 400 - ((price - yMin) / yRange) * 380;
            return (
              <g key={level}>
                <line x1="50" y1={y} x2="950" y2={y} stroke="#475569" strokeDasharray="3,3" strokeWidth="1"/>
                <text x="960" y={y + 5} fill="#94a3b8" fontSize="12">{price.toFixed(0)}</text>
              </g>
            );
          })}
          
          {data.map((candle: any, i: number) => {
            const x = 50 + (i / data.length) * 900;
            const wickTop = 400 - ((candle.high - yMin) / yRange) * 380;
            const wickBottom = 400 - ((candle.low - yMin) / yRange) * 380;
            const bodyTop = 400 - ((Math.max(candle.open, candle.close) - yMin) / yRange) * 380;
            const bodyBottom = 400 - ((Math.min(candle.open, candle.close) - yMin) / yRange) * 380;
            const isGreen = candle.close >= candle.open;
            const candleWidth = Math.max(3, 900 / data.length - 2);
            
            return (
              <g key={i}>
                <line x1={x} y1={wickTop} x2={x} y2={wickBottom} stroke={isGreen ? '#22c55e' : '#ef4444'} strokeWidth="1.5"/>
                <rect 
                  x={x - candleWidth/2} 
                  y={bodyTop} 
                  width={candleWidth} 
                  height={Math.max(bodyBottom - bodyTop, 1)} 
                  fill={isGreen ? '#22c55e' : '#ef4444'}
                  opacity="0.8"
                />
              </g>
            );
          })}
          
          {candle.hma && (
            <polyline
              points={data.map((d: any, i: number) => {
                if (d.hma === null) return null;
                const x = 50 + (i / data.length) * 900;
                const y = 400 - ((d.hma - yMin) / yRange) * 380;
                return x + ',' + y;
              }).filter((p: any) => p !== null).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}
          
          <text x="500" y="440" fill="#94a3b8" fontSize="12" textAnchor="middle">Time</text>
          <text x="20" y="225" fill="#94a3b8" fontSize="12" textAnchor="middle" transform="rotate(-90 20 225)">Price</text>
        </svg>
      </div>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500"></div>
          <span>Bullish</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500"></div>
          <span>Bearish</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-blue-500"></div>
          <span>HMA 50</span>
        </div>
      </div>
    </div>
  );
};

interface NiftyFibStrategyProps {
  isAuthenticated: boolean;
}

const NiftyFibStrategy: React.FC<NiftyFibStrategyProps> = ({ isAuthenticated }) => {
  const [selectedView, setSelectedView] = useState('pe_chart');
  const [timeframe, setTimeframe] = useState('60');
  
  // Date range for historical data - 3 months back
  const [dateRange] = useState({
    from: '2025-07-01',  // 3 months of data for HMA 50
    to: '2025-10-07'
  });

  // Fetch live data from Fyers API
  const { niftyRange, strikes, peData, ceData, loading, error, refetch } = useLiveData({
    enabled: isAuthenticated,
    rangeFrom: dateRange.from,
    rangeTo: dateRange.to,
    refreshInterval: 60000  // Refresh every minute
  });

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

  // Process data with HMA
  const processedPeData = useMemo(() => {
    if (!peData) return null;
    const hma = calculateHMA(peData, 50);
    return peData.map((d, i) => ({ ...d, hma: hma[i] }));
  }, [peData]);

  const processedCeData = useMemo(() => {
    if (!ceData) return null;
    const hma = calculateHMA(ceData, 50);
    return ceData.map((d, i) => ({ ...d, hma: hma[i] }));
  }, [ceData]);

  // Calculate Fibonacci levels
  const peFibLevels = useMemo(() => {
    if (!processedPeData) return {};
    const highs = processedPeData.map(d => d.high);
    const lows = processedPeData.map(d => d.low);
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const range = high - low;
    return {
      '1.618': low + range * 1.618,
      '1.0': high,
      '0.618': low + range * 0.618,
      '0.5': low + range * 0.5,
      '0': low
    };
  }, [processedPeData]);

  const ceFibLevels = useMemo(() => {
    if (!processedCeData) return {};
    const highs = processedCeData.map(d => d.high);
    const lows = processedCeData.map(d => d.low);
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    const range = high - low;
    return {
      '1.618': low + range * 1.618,
      '1.0': high,
      '0.618': low + range * 0.618,
      '0.5': low + range * 0.5,
      '0': low
    };
  }, [processedCeData]);

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-slate-400">Please login to Fyers to view live option data and charts.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading historical data from Fyers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-900/30 p-8 rounded-lg border border-red-700 text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Error Loading Data</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getCurrentData = () => {
    if (selectedView === 'pe_chart') return processedPeData;
    if (selectedView === 'ce_chart') return processedCeData;
    return [];
  };

  const getCurrentFib = () => {
    return selectedView.includes('pe') ? peFibLevels : ceFibLevels;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          NIFTY Fibonacci Options Strategy - Live Data
        </h1>
        <p className="text-slate-400">Data Range: {dateRange.from} to {dateRange.to}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">NIFTY Range</div>
          {niftyRange && (
            <>
              <div className="text-2xl font-bold text-green-400">H: {niftyRange.high.toFixed(2)}</div>
              <div className="text-2xl font-bold text-red-400">L: {niftyRange.low.toFixed(2)}</div>
            </>
          )}
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Calculated Strikes</div>
          {strikes && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-xl font-bold">{strikes.pe} PE</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xl font-bold">{strikes.ce} CE</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Data Points</div>
          <div className="text-lg font-bold text-blue-400">
            PE: {processedPeData?.length || 0} candles
          </div>
          <div className="text-lg font-bold text-blue-400">
            CE: {processedCeData?.length || 0} candles
          </div>
          <button
            onClick={refetch}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedView('pe_chart')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedView === 'pe_chart' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          {strikes?.pe} PE Chart
        </button>
        <button
          onClick={() => setSelectedView('ce_chart')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedView === 'ce_chart' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          {strikes?.ce} CE Chart
        </button>
        <button
          onClick={() => setSelectedView('compare')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedView === 'compare' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          <GitCompare className="w-4 h-4 inline mr-2" />
          Compare
        </button>
        <button
          onClick={() => setSelectedView('pe_fib')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedView === 'pe_fib' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          PE Fib Levels
        </button>
        <button
          onClick={() => setSelectedView('ce_fib')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedView === 'ce_fib' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
        >
          CE Fib Levels
        </button>
      </div>

      {(selectedView === 'pe_chart' || selectedView === 'ce_chart') && getCurrentData() && (
        <CandlestickChart 
          data={getCurrentData()} 
          fibLevels={getCurrentFib()} 
          title={`${selectedView === 'pe_chart' ? `${strikes?.pe} PE` : `${strikes?.ce} CE`} - Live Data with HMA 50`}
        />
      )}

      {selectedView === 'compare' && processedPeData && processedCeData && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Compare: {strikes?.pe} PE vs {strikes?.ce} CE</h3>
          <ResponsiveContainer width="100%" height={450}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Legend />
              <Line data={processedPeData} type="monotone" dataKey="close" stroke="#ef4444" strokeWidth={2} dot={false} name={`${strikes?.pe} PE`} />
              <Line data={processedCeData} type="monotone" dataKey="close" stroke="#22c55e" strokeWidth={2} dot={false} name={`${strikes?.ce} CE`} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(selectedView === 'pe_fib' || selectedView === 'ce_fib') && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">
            {selectedView === 'pe_fib' ? `${strikes?.pe} PE` : `${strikes?.ce} CE`} Fibonacci Levels
          </h3>
          <div className="space-y-3">
            {Object.entries(getCurrentFib()).reverse().map(([level, price]: any) => (
              <div key={level} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                <span className="font-medium">Fib {level}</span>
                <span className="font-bold text-lg">₹{price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NiftyFibStrategy;