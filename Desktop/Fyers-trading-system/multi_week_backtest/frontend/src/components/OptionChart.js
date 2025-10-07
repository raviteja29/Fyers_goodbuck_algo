import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import api from '../services/api';
import './OptionChart.css';

const OptionChart = ({ symbol, underlying, expiry, onDataUpdate }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chartType, setChartType] = useState('line');
  const [timeframe, setTimeframe] = useState('1day');
  const [selectedMetrics, setSelectedMetrics] = useState(['ltp', 'volume']);
  const [optionChain, setOptionChain] = useState([]);
  const [selectedStrikes, setSelectedStrikes] = useState([]);
  const [viewMode, setViewMode] = useState('historical'); // 'historical', 'live', 'chain'
  
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (symbol && viewMode === 'historical') {
      fetchHistoricalData();
    } else if (underlying && expiry && viewMode === 'chain') {
      fetchOptionChain();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, underlying, expiry, timeframe, viewMode]);

  const fetchHistoricalData = async () => {
    if (!symbol) return;

    try {
      setLoading(true);
      setError('');

      const endTime = new Date();
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - 30); // Last 30 days

      const response = await api.get(`/options/historical/${symbol}`, {
        params: {
          fromTime: startTime.toISOString(),
          toTime: endTime.toISOString(),
          interval: timeframe
        }
      });

      const formattedData = response.data.data.map(item => ({
        timestamp: new Date(item.timestamp).toLocaleString(),
        time: new Date(item.timestamp).getTime(),
        ltp: item.ltp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        oi: item.oi,
        iv: item.impliedVolatility,
        delta: item.delta,
        gamma: item.gamma,
        theta: item.theta,
        vega: item.vega
      }));

      setChartData(formattedData);
      
      if (onDataUpdate) {
        onDataUpdate(formattedData);
      }
    } catch (error) {
      console.error('Error fetching historical data:', error);
      setError('Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptionChain = async () => {
    if (!underlying || !expiry) return;

    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/options/chain/${underlying}/${expiry}`);
      
      const chainData = response.data.optionChain.map(option => ({
        strike: option.strike,
        type: option.optionType,
        symbol: option.symbol,
        ltp: option.ltp,
        volume: option.volume,
        oi: option.oi,
        iv: option.impliedVolatility,
        delta: option.delta,
        gamma: option.gamma,
        theta: option.theta,
        vega: option.vega,
        bid: option.bid,
        ask: option.ask
      }));

      setOptionChain(chainData);
    } catch (error) {
      console.error('Error fetching option chain:', error);
      setError('Failed to fetch option chain');
    } finally {
      setLoading(false);
    }
  };

  const startLiveData = () => {
    if (!symbol) return;

    setViewMode('live');
    
    // Simulate live data updates (replace with actual WebSocket connection)
    intervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/options/live/${symbol}`);
        const liveData = response.data.data;
        
        const newDataPoint = {
          timestamp: new Date().toLocaleString(),
          time: Date.now(),
          ltp: liveData.ltp,
          volume: liveData.volume,
          oi: liveData.oi,
          iv: liveData.impliedVolatility,
          delta: liveData.delta,
          gamma: liveData.gamma,
          theta: liveData.theta,
          vega: liveData.vega
        };

        setChartData(prev => [...prev.slice(-100), newDataPoint]); // Keep last 100 points
      } catch (error) {
        console.error('Error fetching live data:', error);
      }
    }, 5000); // Update every 5 seconds
  };

  const stopLiveData = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setViewMode('historical');
  };

  const handleMetricToggle = (metric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const handleStrikeSelection = (strike) => {
    setSelectedStrikes(prev => 
      prev.includes(strike)
        ? prev.filter(s => s !== strike)
        : [...prev, strike]
    );
  };

  const renderChart = () => {
    if (loading) {
      return <div className="chart-loading">Loading chart data...</div>;
    }

    if (error) {
      return <div className="chart-error">{error}</div>;
    }

    if (viewMode === 'chain') {
      return renderOptionChainTable();
    }

    if (chartData.length === 0) {
      return <div className="chart-empty">No data available</div>;
    }

    const ChartComponent = chartType === 'area' ? AreaChart : 
                          chartType === 'bar' ? BarChart : LineChart;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          
          {selectedMetrics.includes('ltp') && (
            chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="ltp"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
                name="LTP"
              />
            ) : chartType === 'bar' ? (
              <Bar dataKey="ltp" fill="#8884d8" name="LTP" />
            ) : (
              <Line
                type="monotone"
                dataKey="ltp"
                stroke="#8884d8"
                strokeWidth={2}
                name="LTP"
              />
            )
          )}
          
          {selectedMetrics.includes('volume') && (
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#82ca9d"
              strokeWidth={1}
              name="Volume"
              yAxisId="right"
            />
          )}
          
          {selectedMetrics.includes('oi') && (
            <Line
              type="monotone"
              dataKey="oi"
              stroke="#ffc658"
              strokeWidth={1}
              name="Open Interest"
              yAxisId="right"
            />
          )}
          
          {selectedMetrics.includes('iv') && (
            <Line
              type="monotone"
              dataKey="iv"
              stroke="#ff7300"
              strokeWidth={1}
              name="IV"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  const renderOptionChainTable = () => {
    const calls = optionChain.filter(option => option.type === 'CE');
    const puts = optionChain.filter(option => option.type === 'PE');
    const strikes = [...new Set(optionChain.map(option => option.strike))].sort((a, b) => a - b);

    return (
      <div className="option-chain-table">
        <table>
          <thead>
            <tr>
              <th colSpan="5">CALLS</th>
              <th>STRIKE</th>
              <th colSpan="5">PUTS</th>
            </tr>
            <tr>
              <th>LTP</th>
              <th>Volume</th>
              <th>OI</th>
              <th>IV</th>
              <th>Delta</th>
              <th>Price</th>
              <th>Delta</th>
              <th>IV</th>
              <th>OI</th>
              <th>Volume</th>
              <th>LTP</th>
            </tr>
          </thead>
          <tbody>
            {strikes.map(strike => {
              const call = calls.find(c => c.strike === strike);
              const put = puts.find(p => p.strike === strike);
              
              return (
                <tr key={strike} className={selectedStrikes.includes(strike) ? 'selected' : ''}>
                  <td>{call?.ltp?.toFixed(2) || '-'}</td>
                  <td>{call?.volume || '-'}</td>
                  <td>{call?.oi || '-'}</td>
                  <td>{call?.iv?.toFixed(2) || '-'}</td>
                  <td>{call?.delta?.toFixed(3) || '-'}</td>
                  <td 
                    className="strike-price"
                    onClick={() => handleStrikeSelection(strike)}
                  >
                    {strike}
                  </td>
                  <td>{put?.delta?.toFixed(3) || '-'}</td>
                  <td>{put?.iv?.toFixed(2) || '-'}</td>
                  <td>{put?.oi || '-'}</td>
                  <td>{put?.volume || '-'}</td>
                  <td>{put?.ltp?.toFixed(2) || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="option-chart">
      <div className="chart-controls">
        <div className="control-group">
          <label>View Mode:</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="historical">Historical</option>
            <option value="live">Live Data</option>
            <option value="chain">Option Chain</option>
          </select>
        </div>

        {viewMode !== 'chain' && (
          <>
            <div className="control-group">
              <label>Chart Type:</label>
              <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                <option value="line">Line</option>
                <option value="area">Area</option>
                <option value="bar">Bar</option>
              </select>
            </div>

            <div className="control-group">
              <label>Timeframe:</label>
              <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                <option value="1min">1 Minute</option>
                <option value="5min">5 Minutes</option>
                <option value="15min">15 Minutes</option>
                <option value="1hour">1 Hour</option>
                <option value="1day">1 Day</option>
              </select>
            </div>

            <div className="control-group">
              <label>Metrics:</label>
              <div className="metric-toggles">
                {['ltp', 'volume', 'oi', 'iv'].map(metric => (
                  <label key={metric} className="metric-toggle">
                    <input
                      type="checkbox"
                      checked={selectedMetrics.includes(metric)}
                      onChange={() => handleMetricToggle(metric)}
                    />
                    {metric.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {viewMode === 'live' ? (
          <button onClick={stopLiveData} className="live-btn stop">
            Stop Live Data
          </button>
        ) : viewMode === 'historical' && (
          <button onClick={startLiveData} className="live-btn start">
            Start Live Data
          </button>
        )}
      </div>

      <div className="chart-container">
        {renderChart()}
      </div>

      {viewMode === 'chain' && selectedStrikes.length > 0 && (
        <div className="selected-strikes">
          <h4>Selected Strikes: {selectedStrikes.join(', ')}</h4>
          <button onClick={() => setSelectedStrikes([])}>Clear Selection</button>
        </div>
      )}
    </div>
  );
};

export default OptionChart;