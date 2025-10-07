import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, ReferenceLine } from 'recharts';
import { Download, Calendar, TrendingUp, Target, BarChart3 } from 'lucide-react';

const MultiWeekBacktest = () => {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [viewMode, setViewMode] = useState('candlestick');
  const [timeframe, setTimeframe] = useState('1H');
  const [selectedOption, setSelectedOption] = useState('PE');

  const weeks = [
    {
      id: 0,
      predictionWeek: 'Sept 24-30, 2025',
      expiryDate: 'Oct 7, 2025',
      indexHigh: 25095.95,
      indexLow: 24587.7,
      peStrike: 25100,
      ceStrike: 24550,
      pe1H_count: 35,
      ce1H_count: 24,
      pe15M_count: 140,
      ce15M_count: 96,
      fibLevels: {
        high: 481,
        low: 113.2,
        mid: 297.1,
        fib1618: 708.46,
        range: 367.8
      },
      status: 'Complete'
    },
    {
      id: 1,
      predictionWeek: 'Sept 17-23, 2025',
      expiryDate: 'Sept 24, 2025',
      indexHigh: 25448.55,
      indexLow: 25084.65,
      peStrike: 25450,
      ceStrike: 25050,
      status: 'Pending - Need to fetch option data'
    },
    {
      id: 2,
      predictionWeek: 'Sept 10-16, 2025',
      expiryDate: 'Sept 17, 2025',
      indexHigh: null,
      indexLow: null,
      peStrike: null,
      ceStrike: null,
      status: 'Pending - Need index data'
    }
  ];

  const week = weeks[selectedWeek];

  const exportAllData = () => {
    let csv = 'Week,Prediction_Period,Expiry_Date,Index_High,Index_Low,PE_Strike,CE_Strike,Fib_High,Fib_Low,Fib_Mid,Fib_1618,Status\n';
    weeks.forEach((w, idx) => {
      csv += `${idx + 1},${w.predictionWeek},${w.expiryDate},${w.indexHigh || 'N/A'},${w.indexLow || 'N/A'},${w.peStrike || 'N/A'},${w.ceStrike || 'N/A'},${w.fibLevels?.high || 'N/A'},${w.fibLevels?.low || 'N/A'},${w.fibLevels?.mid || 'N/A'},${w.fibLevels?.fib1618 || 'N/A'},${w.status}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nifty_options_backtest_dataset.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">NIFTY Options Multi-Week Backtest System</h1>
              <p className="text-gray-600">Comprehensive historical analysis with Fibonacci levels and HMA50</p>
            </div>
            <button 
              onClick={exportAllData}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              <Download className="w-4 h-4" />
              Export Dataset
            </button>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2 text-blue-900">Strategy Overview</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Step 1:</strong> Calculate HIGH/LOW from prediction week (e.g., Sept 24-30)</li>
              <li><strong>Step 2:</strong> Determine strikes - PE from HIGH (round up to 50), CE from LOW (round down to 50)</li>
              <li><strong>Step 3:</strong> Calculate Fibonacci levels (HIGH, LOW, MID, 1.618) from prediction week</li>
              <li><strong>Step 4:</strong> Use these levels to trade next week expiry options (e.g., Oct 7)</li>
              <li><strong>Step 5:</strong> Analyze price action relative to Fib levels and HMA50 for entry/exit</li>
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {weeks.map((w, idx) => (
            <div
              key={w.id}
              onClick={() => setSelectedWeek(idx)}
              className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all ${
                selectedWeek === idx ? 'ring-2 ring-indigo-500 shadow-lg' : 'hover:shadow-xl'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold">Week {idx + 1}</h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  w.status === 'Complete' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {w.status === 'Complete' ? '✓ Complete' : '⏳ Pending'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Prediction Week</p>
                  <p className="font-semibold">{w.predictionWeek}</p>
                </div>
                <div>
                  <p className="text-gray-600">For Expiry</p>
                  <p className="font-semibold text-indigo-600">{w.expiryDate}</p>
                </div>

                {w.peStrike && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-green-50 rounded p-2">
                      <p className="text-xs text-gray-600">PE Strike</p>
                      <p className="font-bold text-green-700">{w.peStrike}</p>
                    </div>
                    <div className="bg-red-50 rounded p-2">
                      <p className="text-xs text-gray-600">CE Strike</p>
                      <p className="font-bold text-red-700">{w.ceStrike}</p>
                    </div>
                  </div>
                )}

                {w.fibLevels && (
                  <div className="mt-3 bg-purple-50 rounded p-2">
                    <p className="text-xs text-gray-600 mb-1">Fib Levels</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div>H: ₹{w.fibLevels.high}</div>
                      <div>L: ₹{w.fibLevels.low}</div>
                      <div>M: ₹{w.fibLevels.mid}</div>
                      <div>1.618: ₹{w.fibLevels.fib1618}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Selected Week Details</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-indigo-900">Prediction Week Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Period:</span>
                  <span className="font-semibold">{week.predictionWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Index HIGH:</span>
                  <span className="font-semibold text-red-600">{week.indexHigh || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Index LOW:</span>
                  <span className="font-semibold text-green-600">{week.indexLow || 'N/A'}</span>
                </div>
                {week.indexHigh && week.indexLow && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-700">Range:</span>
                    <span className="font-semibold">{(week.indexHigh - week.indexLow).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-emerald-900">Trading Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Expiry Date:</span>
                  <span className="font-semibold">{week.expiryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">PE Strike:</span>
                  <span className="font-semibold text-green-600">{week.peStrike || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">CE Strike:</span>
                  <span className="font-semibold text-red-600">{week.ceStrike || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-700">Data Status:</span>
                  <span className={`font-semibold ${week.status === 'Complete' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {week.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {week.fibLevels ? (
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-3 text-purple-900 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Fibonacci Levels for Trading
              </h3>
              <div className="grid md:grid-cols-5 gap-3">
                <div className="bg-white rounded p-3 border-l-4 border-red-500">
                  <p className="text-xs text-gray-600">HIGH (Resistance)</p>
                  <p className="text-xl font-bold text-red-700">₹{week.fibLevels.high}</p>
                </div>
                <div className="bg-white rounded p-3 border-l-4 border-blue-500">
                  <p className="text-xs text-gray-600">MID (50% Pivot)</p>
                  <p className="text-xl font-bold text-blue-700">₹{week.fibLevels.mid}</p>
                </div>
                <div className="bg-white rounded p-3 border-l-4 border-green-500">
                  <p className="text-xs text-gray-600">LOW (Support)</p>
                  <p className="text-xl font-bold text-green-700">₹{week.fibLevels.low}</p>
                </div>
                <div className="bg-white rounded p-3 border-l-4 border-purple-500">
                  <p className="text-xs text-gray-600">1.618 Extension</p>
                  <p className="text-xl font-bold text-purple-700">₹{week.fibLevels.fib1618}</p>
                </div>
                <div className="bg-white rounded p-3 border-l-4 border-gray-500">
                  <p className="text-xs text-gray-600">Range</p>
                  <p className="text-xl font-bold text-gray-700">₹{week.fibLevels.range}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>Data Not Available:</strong> {week.status}
              </p>
            </div>
          )}

          {week.status === 'Complete' ? (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h3 className="font-semibold mb-2 text-green-900">Next Steps</h3>
              <p className="text-sm text-green-800 mb-3">
                This week has complete data with candlestick charts, HMA50 indicator, and Fibonacci levels. 
                You can view detailed analysis in the previous chart (option_data_fetcher artifact).
              </p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✓ PE {week.peStrike} - 1H data ({week.pe1H_count} candles)</li>
                <li>✓ PE {week.peStrike} - 15M data ({week.pe15M_count} candles)</li>
                <li>✓ CE {week.ceStrike} - 1H data ({week.ce1H_count} candles)</li>
                <li>✓ CE {week.ceStrike} - 15M data ({week.ce15M_count} candles)</li>
                <li>✓ Fibonacci levels calculated and ready for trading analysis</li>
              </ul>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold mb-2 text-blue-900">To Complete This Week</h3>
              <p className="text-sm text-blue-800 mb-3">
                Follow these steps to add this week to the backtest dataset:
              </p>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Fetch NIFTY index data for {week.predictionWeek} to calculate strikes</li>
                <li>Construct option symbols: PE {week.peStrike || '[TBD]'} and CE {week.ceStrike || '[TBD]'}</li>
                <li>Fetch PE 1H candle data</li>
                <li>Fetch PE 15M candle data</li>
                <li>Fetch CE 1H candle data</li>
                <li>Fetch CE 15M candle data</li>
                <li>Calculate Fibonacci levels from the data</li>
                <li>Calculate HMA50 for all timeframes</li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
          <h3 className="font-semibold mb-3 text-indigo-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Building Complete Backtest Dataset
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded p-3">
              <p className="font-semibold text-green-700 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {weeks.filter(w => w.status === 'Complete').length}
              </p>
              <p className="text-xs text-gray-600">weeks ready</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="font-semibold text-yellow-700 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {weeks.filter(w => w.status !== 'Complete').length}
              </p>
              <p className="text-xs text-gray-600">weeks to fetch</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="font-semibold text-indigo-700 mb-1">Target</p>
              <p className="text-2xl font-bold text-indigo-600">52</p>
              <p className="text-xs text-gray-600">weeks (1 year)</p>
            </div>
          </div>
          <p className="text-sm text-indigo-800 mt-4">
            <strong>Note:</strong> To build a complete 1-year backtest dataset, we need to systematically fetch data for all 52 weekly expiries. 
            Each week requires 5 API calls (index + 4 option datasets). This will provide comprehensive data for backtesting various option strategies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiWeekBacktest;