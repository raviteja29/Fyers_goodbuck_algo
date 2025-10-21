import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Clock, GitCompare, RefreshCw } from 'lucide-react';
import { useLiveData } from '../hooks/useLiveData';
import { LightweightCandlestickChart } from './LightweightCandlestickChart';

interface NiftyFibStrategyProps {
  isAuthenticated: boolean;
}

const NiftyFibStrategy: React.FC<NiftyFibStrategyProps> = ({ isAuthenticated }) => {
  const [selectedView, setSelectedView] = useState('pe_chart');
  const [timeframe, setTimeframe] = useState<'15' | '60'>('60'); // Default to 1Hr
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data has been loaded
  
  // Date range for historical data - 3 months back (editable)
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);
    return {
      from: threeMonthsAgo.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0]
    };
  });

  // Fetch live data from Fyers API - DISABLED auto-load on login
  // Data will only load when user manually triggers it
  const { niftyRange, strikes, peData, ceData, loading, error, refetch } = useLiveData({
    enabled: false, // Changed from isAuthenticated to false - no auto-load
    rangeFrom: dateRange.from,
    rangeTo: dateRange.to,
    refreshInterval: 60000,  // Refresh every minute
    resolution: timeframe  // Pass the selected timeframe
  });

  // Track when data is loaded
  React.useEffect(() => {
    if (peData || ceData) {
      setDataLoaded(true);
    }
  }, [peData, ceData]);

  // Auto-refetch when timeframe changes if data is already loaded
  React.useEffect(() => {
    if (dataLoaded && !loading) {
      refetch();
    }
  }, [timeframe]); // Only depend on timeframe, not dataLoaded or refetch

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
  const peFibLevels = useMemo((): Record<string, number> => {
    if (!processedPeData || processedPeData.length === 0) return {};
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

  const ceFibLevels = useMemo((): Record<string, number> => {
    if (!processedCeData || processedCeData.length === 0) return {};
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

  const hasData = niftyRange && strikes && (processedPeData?.length || processedCeData?.length);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl shadow-2xl border border-slate-700/50">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
          NIFTY Fibonacci Options Strategy
        </h1>
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <p className="text-slate-400">Market: 9:15 AM - 3:30 PM IST</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 bg-slate-800/50 border border-slate-600/50 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 text-sm mb-2 font-medium">From Date</label>
            <input 
              type="date"
              className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={dateRange.from} 
              onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm mb-2 font-medium">To Date</label>
            <input 
              type="date"
              className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              value={dateRange.to} 
              onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <button
          onClick={refetch}
          disabled={!isAuthenticated || loading}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-none flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading Live Data...' : 'Load Live Data'}
        </button>
        {!isAuthenticated && <span className="ml-3 text-amber-400 text-sm">Login first to load data</span>}
        
        {/* Timeframe Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-slate-400 text-sm font-medium">Timeframe:</span>
          <div className="flex gap-1 bg-slate-800 p-1 rounded-lg border border-slate-600">
            <button
              onClick={() => setTimeframe('15')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                timeframe === '15'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              15 Min
            </button>
            <button
              onClick={() => setTimeframe('60')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                timeframe === '60'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1 Hour
            </button>
          </div>
        </div>
      </div>

      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-lg border border-slate-600/50 backdrop-blur-sm shadow-lg">
            <div className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">NIFTY Range</div>
            {niftyRange && (
              <div className="space-y-1">
                <div className="text-2xl font-bold text-emerald-400">H: {niftyRange.high.toFixed(2)}</div>
                <div className="text-2xl font-bold text-rose-400">L: {niftyRange.low.toFixed(2)}</div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-lg border border-slate-600/50 backdrop-blur-sm shadow-lg">
            <div className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Calculated Strikes</div>
            {strikes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                  <span className="text-xl font-bold text-rose-400">{strikes.pe} PE</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-xl font-bold text-emerald-400">{strikes.ce} CE</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 rounded-lg border border-slate-600/50 backdrop-blur-sm shadow-lg">
            <div className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">Data Points</div>
            <div className="space-y-1">
              <div className="text-lg font-bold text-indigo-400">
                PE: {processedPeData?.length || 0} candles
              </div>
              <div className="text-lg font-bold text-indigo-400">
                CE: {processedCeData?.length || 0} candles
              </div>
            </div>
            <button
              onClick={refetch}
              disabled={loading}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>
      )}

      {hasData && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setSelectedView('pe_chart')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg ${
                selectedView === 'pe_chart' 
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-500/50' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-2" />
              {strikes?.pe} PE Chart
            </button>
            <button
              onClick={() => setSelectedView('ce_chart')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg ${
                selectedView === 'ce_chart' 
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-emerald-500/50' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              {strikes?.ce} CE Chart
            </button>
            <button
              onClick={() => setSelectedView('compare')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg ${
                selectedView === 'compare' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/50' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
              }`}
            >
              <GitCompare className="w-4 h-4 inline mr-2" />
              Compare
            </button>
            <button
              onClick={() => setSelectedView('pe_fib')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg ${
                selectedView === 'pe_fib' 
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-purple-500/50' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
              }`}
            >
              PE Fib Levels
            </button>
            <button
              onClick={() => setSelectedView('ce_fib')}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg ${
                selectedView === 'ce_fib' 
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-purple-500/50' 
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
              }`}
            >
              CE Fib Levels
            </button>
          </div>
        </>
      )}

      {hasData && (selectedView === 'pe_chart' || selectedView === 'ce_chart') && getCurrentData() && getCurrentData()!.length > 0 && (
        <LightweightCandlestickChart 
          data={getCurrentData()!} 
          fibLevels={getCurrentFib()} 
          title={`${selectedView === 'pe_chart' ? `${strikes?.pe} PE` : `${strikes?.ce} CE`} - Live Data`}
          showHMA={true}
          height={500}
        />
      )}

      {hasData && selectedView === 'compare' && processedPeData && processedCeData && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-lg border border-slate-600/50 backdrop-blur-sm shadow-xl">
          <h3 className="text-xl font-semibold mb-5 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Compare: {strikes?.pe} PE vs {strikes?.ce} CE
          </h3>
          <ResponsiveContainer width="100%" height={450}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }} />
              <Legend />
              <Line data={processedPeData} type="monotone" dataKey="close" stroke="#f43f5e" strokeWidth={2} dot={false} name={`${strikes?.pe} PE`} />
              <Line data={processedCeData} type="monotone" dataKey="close" stroke="#10b981" strokeWidth={2} dot={false} name={`${strikes?.ce} CE`} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasData && (selectedView === 'pe_fib' || selectedView === 'ce_fib') && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-lg border border-slate-600/50 backdrop-blur-sm shadow-xl">
          <h3 className="text-xl font-semibold mb-5 bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
            {selectedView === 'pe_fib' ? `${strikes?.pe} PE` : `${strikes?.ce} CE`} Fibonacci Levels
          </h3>
          <div className="space-y-3">
            {Object.entries(getCurrentFib()).reverse().map(([level, price]: any) => (
              <div key={level} className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg border border-slate-600/30 hover:border-purple-500/50 transition-all">
                <span className="font-semibold text-purple-300">Fib {level}</span>
                <span className="font-bold text-xl text-white">₹{price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NiftyFibStrategy;