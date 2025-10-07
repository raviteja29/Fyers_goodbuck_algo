import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Clock, GitCompare } from 'lucide-react';
import { apiService } from '../services/api';
import type { OptionChartResponse } from '../types/market';
import { FyersLogin } from './FyersLogin';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  idx: number;
  hma: number | null;
}

interface FibLevels {
  [key: string]: number;
}

interface CandlestickChartProps {
  data: CandleData[];
  fibLevels: FibLevels;
  title: string;
}

const CandlestickChart = ({ data, fibLevels, title }: CandlestickChartProps) => {
  // Handle empty data to prevent NaN values
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-96 text-slate-400">
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2" />
            <p>No data available. Please authenticate with Fyers to load historical data.</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter out invalid data points
  const validData = data.filter(d => 
    d && 
    typeof d.low === 'number' && 
    typeof d.high === 'number' && 
    !isNaN(d.low) && 
    !isNaN(d.high) &&
    !isNaN(d.open) &&
    !isNaN(d.close)
  );

  if (validData.length === 0) {
    return (
      <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-96 text-slate-400">
          <div className="text-center">
            <p>Invalid data format. Please check your data source.</p>
          </div>
        </div>
      </div>
    );
  }

  const yMin = Math.min(...validData.map(d => d.low)) - 20;
  const yMax = Math.max(...validData.map(d => d.high)) + 20;
  const yRange = yMax - yMin;
  
  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="relative" style={{ height: '450px' }}>
        <svg width="100%" height="100%" viewBox="0 0 1000 450" preserveAspectRatio="xMidYMid meet">
          {Object.entries(fibLevels).map(([level, price]) => {
            // Ensure price is a valid number
            if (!price || isNaN(price) || yRange <= 0) return null;
            const y = 400 - ((price - yMin) / yRange) * 380;
            // Ensure y coordinate is valid
            if (isNaN(y)) return null;
            return (
              <g key={level}>
                <line x1="50" y1={y} x2="950" y2={y} stroke="#475569" strokeDasharray="3,3" strokeWidth="1"/>
                <text x="960" y={y + 5} fill="#94a3b8" fontSize="12">{price.toFixed(0)}</text>
              </g>
            );
          }).filter(g => g !== null)}
          
          {validData.map((candle, i) => {
            const x = 50 + (i / validData.length) * 900;
            const wickTop = 400 - ((candle.high - yMin) / yRange) * 380;
            const wickBottom = 400 - ((candle.low - yMin) / yRange) * 380;
            const bodyTop = 400 - ((Math.max(candle.open, candle.close) - yMin) / yRange) * 380;
            const bodyBottom = 400 - ((Math.min(candle.open, candle.close) - yMin) / yRange) * 380;
            const isGreen = candle.close >= candle.open;
            const candleWidth = Math.max(3, 900 / validData.length - 2);
            
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
          
          <polyline
            points={validData.map((d, i) => {
              if (d.hma === null || isNaN(d.hma)) return null;
              const x = 50 + (i / validData.length) * 900;
              const y = 400 - ((d.hma - yMin) / yRange) * 380;
              // Ensure y coordinate is valid
              if (isNaN(y)) return null;
              return x + ',' + y;
            }).filter(p => p !== null).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          
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

const NiftyFibStrategy = () => {
  const [selectedView, setSelectedView] = useState('pe_chart');
  const [timeframe, setTimeframe] = useState('60');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pe1hrData, setPe1hrData] = useState<CandleData[]>([]);
  const [pe15minData, setPe15minData] = useState<CandleData[]>([]);
  const [ce1hrData, setCe1hrData] = useState<CandleData[]>([]);
  const [ce15minData, setCe15minData] = useState<CandleData[]>([]);

  const prevWeekRange = { high: 25149.85, low: 24587.70 };
  const strikes = { pe: 25150, ce: 24550 };

  const calculateHMA = (data: CandleData[], period = 50): (number | null)[] => {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
      // Only calculate HMA after we have enough data points (period)
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

  // Helper function to transform API candle data to component format
  const transformApiData = (candles: number[][]): CandleData[] => {
    return candles.map((candle, idx) => ({
      time: new Date(candle[0] * 1000).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      }),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      idx,
      hma: null // Will be calculated separately
    }));
  };

  // Fetch historical data for 3 months (200+ candles)
  const fetchHistoricalData = async () => {
    if (!isAuthenticated) {
      setError('Please login to Fyers first to fetch historical data');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Calculate date range for 3 months (200 candles at 1-hour resolution)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90); // 90 days ago
      
      const rangeFrom = Math.floor(startDate.getTime() / 1000).toString();
      const rangeTo = Math.floor(endDate.getTime() / 1000).toString();

      // Define option symbols based on strikes
      const peSymbol = `NSE:NIFTY25OCT${strikes.pe}PE`;
      const ceSymbol = `NSE:NIFTY25OCT${strikes.ce}CE`;

      // Fetch data for all timeframes and both options
      const [pe1hrResponse, pe15minResponse, ce1hrResponse, ce15minResponse] = await Promise.all([
        apiService.getOptionChart(peSymbol, '60', rangeFrom, rangeTo),   // PE 1-hour
        apiService.getOptionChart(peSymbol, '15', rangeFrom, rangeTo),   // PE 15-min
        apiService.getOptionChart(ceSymbol, '60', rangeFrom, rangeTo),   // CE 1-hour
        apiService.getOptionChart(ceSymbol, '15', rangeFrom, rangeTo)    // CE 15-min
      ]);

      // Transform and set data
      if (pe1hrResponse.s === 'ok' && pe1hrResponse.candles) {
        const data = transformApiData(pe1hrResponse.candles);
        const hma = calculateHMA(data, 50);
        setPe1hrData(data.map((d, i) => ({ ...d, hma: hma[i] })));
      }

      if (pe15minResponse.s === 'ok' && pe15minResponse.candles) {
        const data = transformApiData(pe15minResponse.candles);
        const hma = calculateHMA(data, 50);
        setPe15minData(data.map((d, i) => ({ ...d, hma: hma[i] })));
      }

      if (ce1hrResponse.s === 'ok' && ce1hrResponse.candles) {
        const data = transformApiData(ce1hrResponse.candles);
        const hma = calculateHMA(data, 50);
        setCe1hrData(data.map((d, i) => ({ ...d, hma: hma[i] })));
      }

      if (ce15minResponse.s === 'ok' && ce15minResponse.candles) {
        const data = transformApiData(ce15minResponse.candles);
        const hma = calculateHMA(data, 50);
        setCe15minData(data.map((d, i) => ({ ...d, hma: hma[i] })));
      }

    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch historical data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchHistoricalData();
    }
  }, [isAuthenticated]);

  // Handle authentication state change
  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    if (authenticated) {
      setError(null);
      fetchHistoricalData();
    } else {
      // Clear data when logged out
      setPe1hrData([]);
      setPe15minData([]);
      setCe1hrData([]);
      setCe15minData([]);
    }
  };

  const pePrevWeekData = pe1hrData.filter((d, i) => i < 30);
  const peHigh = pePrevWeekData.length > 0 ? Math.max(...pePrevWeekData.map(d => d.high)) : 0;
  const peLow = pePrevWeekData.length > 0 ? Math.min(...pePrevWeekData.map(d => d.low)) : 0;
  const peRange = peHigh - peLow;
  const peFibLevels = {'1.618': peLow + peRange * 1.618, '1.0': peHigh, '0.618': peLow + peRange * 0.618, '0.5': peLow + peRange * 0.5, '0': peLow};

  const cePrevWeekData = ce1hrData.filter((d, i) => i < 19);
  const ceHigh = cePrevWeekData.length > 0 ? Math.max(...cePrevWeekData.map(d => d.high)) : 0;
  const ceLow = cePrevWeekData.length > 0 ? Math.min(...cePrevWeekData.map(d => d.low)) : 0;
  const ceRange = ceHigh - ceLow;
  const ceFibLevels = {'1.618': ceLow + ceRange * 1.618, '1.0': ceHigh, '0.618': ceLow + ceRange * 0.618, '0.5': ceLow + ceRange * 0.5, '0': ceLow};

  const getCurrentData = (): CandleData[] => {
    if (selectedView === 'pe_chart') return timeframe === '60' ? pe1hrData : pe15minData;
    if (selectedView === 'ce_chart') return timeframe === '60' ? ce1hrData : ce15minData;
    return [];
  };

  const getCurrentFib = (): FibLevels => {
    return selectedView.includes('pe') ? peFibLevels : ceFibLevels;
  };

  // Create unified data for compare chart with FULL historical data (no artificial filling)
  const compareData = useMemo(() => {
    if (!pe1hrData || !ce1hrData || pe1hrData.length === 0 || ce1hrData.length === 0) {
      return [];
    }

    // Create time-based mapping with FULL historical data points
    const timeMap = new Map<string, { time: string; peClose: number | null; ceClose: number | null }>();
    
    // Add all PE data points (up to 200 candles of historical data)
    pe1hrData.forEach(point => {
      if (point?.time && point?.close !== undefined) {
        timeMap.set(point.time, { 
          time: point.time, 
          peClose: point.close, 
          ceClose: null 
        });
      }
    });
    
    // Add all CE data points (up to 200 candles of historical data), merging with existing PE data
    ce1hrData.forEach(point => {
      if (point?.time && point?.close !== undefined) {
        if (timeMap.has(point.time)) {
          // Merge with existing PE data
          const existing = timeMap.get(point.time)!;
          existing.ceClose = point.close;
        } else {
          // Create new entry with only CE data
          timeMap.set(point.time, { 
            time: point.time, 
            peClose: null, 
            ceClose: point.close 
          });
        }
      }
    });
    
    // Convert to array and sort by time - FULL HISTORICAL RANGE
    const unified = Array.from(timeMap.values()).sort((a, b) => {
      // Parse time strings for proper sorting
      const timeA = new Date(a.time);
      const timeB = new Date(b.time);
      return timeA.getTime() - timeB.getTime();
    });
    
    console.log('Compare data (full history):', {
      pePoints: pe1hrData.length,
      cePoints: ce1hrData.length,
      unifiedPoints: unified.length,
      timeRange: unified.length > 0 ? `${unified[0].time} to ${unified[unified.length - 1].time}` : 'No data',
      firstPE: unified.find(p => p.peClose !== null)?.time,
      firstCE: unified.find(p => p.ceClose !== null)?.time,
      lastPE: unified.slice().reverse().find(p => p.peClose !== null)?.time,
      lastCE: unified.slice().reverse().find(p => p.ceClose !== null)?.time
    });
    
    return unified;
  }, [pe1hrData, ce1hrData]);

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          NIFTY Fibonacci Options Strategy
        </h1>
        <p className="text-slate-400">Week: Sept 24-30 to Oct 7 Expiry | 3 Months Historical Data</p>
      </div>

      {/* Authentication Section */}
      <div className="mb-6">
        <FyersLogin onAuthChange={handleAuthChange} />
      </div>

      {/* Authentication Required Message */}
      {!isAuthenticated && !loading && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-3">🔐 Authentication Required</h3>
            <p className="text-slate-400 mb-4">
              Please login to Fyers above to access 3 months of historical option data and HMA 50 analysis.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-700 p-3 rounded">
                <div className="text-slate-400">PE 1H Data</div>
                <div className="font-semibold text-yellow-400">Login Required</div>
              </div>
              <div className="bg-slate-700 p-3 rounded">
                <div className="text-slate-400">CE 1H Data</div>
                <div className="font-semibold text-yellow-400">Login Required</div>
              </div>
              <div className="bg-slate-700 p-3 rounded">
                <div className="text-slate-400">PE 15M Data</div>
                <div className="font-semibold text-yellow-400">Login Required</div>
              </div>
              <div className="bg-slate-700 p-3 rounded">
                <div className="text-slate-400">CE 15M Data</div>
                <div className="font-semibold text-yellow-400">Login Required</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mb-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-lg">Fetching 3 months of historical data...</span>
          </div>
          <p className="text-center text-slate-400 mt-2">
            Loading ~200 candles each for PE & CE options with HMA 50 calculations
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg mb-6">
          <div className="flex items-center">
            <span className="text-red-400 font-semibold">❌ Data Loading Error:</span>
            <span className="ml-2 text-red-300">{error}</span>
          </div>
          <button
            onClick={fetchHistoricalData}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
          >
            Retry Loading Data
          </button>
        </div>
      )}

      {/* Data Status */}
      {!loading && !error && isAuthenticated && (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400">PE 1H Data</div>
              <div className="font-semibold text-green-400">{pe1hrData.length} candles</div>
            </div>
            <div>
              <div className="text-slate-400">CE 1H Data</div>
              <div className="font-semibold text-green-400">{ce1hrData.length} candles</div>
            </div>
            <div>
              <div className="text-slate-400">PE 15M Data</div>
              <div className="font-semibold text-green-400">{pe15minData.length} candles</div>
            </div>
            <div>
              <div className="text-slate-400">CE 15M Data</div>
              <div className="font-semibold text-green-400">{ce15minData.length} candles</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            HMA 50 values shown only after 50+ data points | Compare chart uses full historical timeline
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Previous Week Range</div>
          <div className="text-2xl font-bold text-green-400">H: {prevWeekRange.high.toFixed(2)}</div>
          <div className="text-2xl font-bold text-red-400">L: {prevWeekRange.low.toFixed(2)}</div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Selected Strikes</div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xl font-bold">{strikes.pe} PE</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xl font-bold">{strikes.ce} CE</span>
          </div>
        </div>

        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Current Status (Oct 7)</div>
          <div className="text-lg font-bold text-blue-400 mb-1">NIFTY: 25,197.10</div>
          <div className="text-sm text-green-400">25150 PE: ₹7.65</div>
          <div className="text-sm text-green-400">24550 CE: ₹656.85</div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setSelectedView('pe_chart')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !isAuthenticated 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
              : selectedView === 'pe_chart' 
                ? 'bg-red-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          25150 PE Chart
        </button>
        <button
          onClick={() => setSelectedView('ce_chart')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !isAuthenticated 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
              : selectedView === 'ce_chart' 
                ? 'bg-green-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          24550 CE Chart
        </button>
        <button
          onClick={() => setSelectedView('compare')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !isAuthenticated 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
              : selectedView === 'compare' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <GitCompare className="w-4 h-4 inline mr-2" />
          Compare
        </button>
        <button
          onClick={() => setSelectedView('pe_fib')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !isAuthenticated 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
              : selectedView === 'pe_fib' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          PE Fib Levels
        </button>
        <button
          onClick={() => setSelectedView('ce_fib')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !isAuthenticated 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
              : selectedView === 'ce_fib' 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          CE Fib Levels
        </button>
      </div>

      {(selectedView === 'pe_chart' || selectedView === 'ce_chart') && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTimeframe('60')}
            className={`px-3 py-1 rounded text-sm ${timeframe === '60' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            1 Hour
          </button>
          <button
            onClick={() => setTimeframe('15')}
            className={`px-3 py-1 rounded text-sm ${timeframe === '15' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            <Clock className="w-3 h-3 inline mr-1" />
            15 Min
          </button>
        </div>
      )}

      {(selectedView === 'pe_chart' || selectedView === 'ce_chart') && (
        <CandlestickChart 
          data={getCurrentData()} 
          fibLevels={getCurrentFib()} 
          title={`${selectedView === 'pe_chart' ? '25150 PE' : '24550 CE'} - ${timeframe === '60' ? '1 Hour' : '15 Min'} with HMA 50`}
        />
      )}

      {selectedView === 'compare' && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">Compare: 25150 PE vs 24550 CE (3 Months Historical Data)</h3>
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={compareData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval="preserveStartEnd"
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#f9fafb'
                }}
                labelFormatter={(value) => `Time: ${value}`}
                formatter={(value, name) => [
                  typeof value === 'number' ? `₹${value.toFixed(2)}` : 'No data',
                  name === 'peClose' ? '25150 PE' : '24550 CE'
                ]}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => value === 'peClose' ? '25150 PE' : '24550 CE'}
              />
              <Line 
                type="monotone" 
                dataKey="peClose" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name="peClose"
              />
              <Line 
                type="monotone" 
                dataKey="ceClose" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name="ceClose"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(selectedView === 'pe_fib' || selectedView === 'ce_fib') && (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold mb-4">
            {selectedView === 'pe_fib' ? '25150 PE' : '24550 CE'} Fibonacci Levels
          </h3>
          <div className="space-y-3">
            {Object.entries(getCurrentFib()).reverse().map(([level, price]) => (
              <div key={level} className="flex justify-between items-center p-3 bg-slate-700 rounded-lg">
                <span className="font-medium">Fib {level}</span>
                <span className="font-bold text-lg">₹{price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 bg-slate-800 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold mb-4">Strategy Steps</h3>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">1</div>
            <div>
              <div className="font-medium">Identify Previous Week NIFTY Range</div>
              <div className="text-sm text-slate-400">High: 25,149.85 | Low: 24,587.70</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">2</div>
            <div>
              <div className="font-medium">Select Option Strikes</div>
              <div className="text-sm text-slate-400">Round HIGH up for PE (25150) | Round LOW down for CE (24550)</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">3</div>
            <div>
              <div className="font-medium">Lay Fibonacci on Option Charts</div>
              <div className="text-sm text-slate-400">Apply Fib levels from previous week range on option prices</div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">4</div>
            <div>
              <div className="font-medium">Monitor with HMA 50</div>
              <div className="text-sm text-slate-400">Track price action using HMA 50 at Fib levels for entry/exit</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NiftyFibStrategy;