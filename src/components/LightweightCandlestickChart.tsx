import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

interface CandleData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  hma?: number | null;
  timestamp?: number; // Optional epoch timestamp
}

interface LightweightCandlestickChartProps {
  data: CandleData[];
  title: string;
  showHMA?: boolean;
  fibLevels?: Record<string, number>;
  height?: number;
}

export const LightweightCandlestickChart: React.FC<LightweightCandlestickChartProps> = ({
  data,
  title,
  showHMA = true,
  fibLevels = {},
  height = 500
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const hmaSeriesRef = useRef<any>(null);
  const [localShowHMA, setLocalShowHMA] = useState(showHMA);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1e293b' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#475569',
      },
      rightPriceScale: {
        borderColor: '#475569',
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Convert data to lightweight-charts format
    const candlestickData: any[] = data.map(d => ({
      time: (typeof d.time === 'number' ? d.time : d.timestamp || Math.floor(new Date(d.time).getTime() / 1000)) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candlestickSeries.setData(candlestickData);

    // Add HMA line if enabled and data exists
    if (localShowHMA) {
      const hmaData = data
        .filter(d => d.hma != null)
        .map(d => ({
          time: (typeof d.time === 'number' ? d.time : d.timestamp || Math.floor(new Date(d.time).getTime() / 1000)) as any,
          value: d.hma!,
        }));

      if (hmaData.length > 0) {
        const hmaSeries = (chart as any).addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
          title: 'HMA 50',
          priceLineVisible: false,
        });
        hmaSeriesRef.current = hmaSeries;
        hmaSeries.setData(hmaData);
      }
    }

    // Add Fibonacci levels as price lines
    Object.entries(fibLevels).forEach(([level, price]) => {
      const colors: Record<string, string> = {
        '1.618': '#8b5cf6',
        '1.0': '#22c55e',
        '0.618': '#3b82f6',
        '0.5': '#f59e0b',
        '0': '#ef4444',
      };
      
      candlestickSeries.createPriceLine({
        price: price,
        color: colors[level] || '#94a3b8',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `Fib ${level}`,
      });
    });

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, localShowHMA, fibLevels, height]);

  const toggleHMA = () => {
    setLocalShowHMA(!localShowHMA);
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={localShowHMA}
              onChange={toggleHMA}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <span className="text-slate-300">HMA 50</span>
          </label>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="w-full" />
      
      <div className="mt-3 flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-slate-300">Bullish</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-slate-300">Bearish</span>
        </div>
        {localShowHMA && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500"></div>
            <span className="text-slate-300">HMA 50</span>
          </div>
        )}
        {Object.keys(fibLevels).length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t border-dashed border-slate-400"></div>
            <span className="text-slate-300">Fib Levels</span>
          </div>
        )}
        <div className="ml-auto text-xs text-slate-400">
          {data.length} candles
        </div>
      </div>
    </div>
  );
};
