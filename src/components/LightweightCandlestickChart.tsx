import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
} from 'lightweight-charts';

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
  timeframeLabel?: string;
  hmaLabel?: string;
  staticLines?: {
    price: number;
    color?: string;
    title?: string;
    lineStyle?: number;
  }[];
  markers?: {
    time: number;
    color: string;
    position?: 'aboveBar' | 'belowBar';
    shape?: 'arrowUp' | 'arrowDown';
    text?: string;
  }[];
}

export const LightweightCandlestickChart: React.FC<LightweightCandlestickChartProps> = ({
  data,
  title,
  showHMA = true,
  fibLevels = {},
  height = 500,
  timeframeLabel,
  hmaLabel = 'HMA 50',
  staticLines = [],
  markers = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const hmaSeriesRef = useRef<any>(null);
  const toolTipRef = useRef<HTMLDivElement | null>(null);
  const markersPluginRef = useRef<any>(null);
  const [localShowHMA, setLocalShowHMA] = useState(showHMA);
  const toEpochSeconds = (
    value: number | string | { year: number; month: number; day: number } | undefined,
  ): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return Math.floor(parsed / 1000);
      }
    }
    if (
      value &&
      typeof value === 'object' &&
      'year' in value &&
      'month' in value &&
      'day' in value
    ) {
      const date = new Date(Date.UTC(value.year, value.month - 1, value.day));
      return Math.floor(date.getTime() / 1000);
    }
    return 0;
  };

  const formatISTDate = (seconds: number) => {
    const date = new Date(seconds * 1000);
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      day: '2-digit',
      month: 'short',
    });
  };

  const formatISTTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatISTDateTime = (seconds: number) => `${formatISTDate(seconds)} • ${formatISTTime(seconds)}`;

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const container = chartContainerRef.current;
    container.style.position = 'relative';

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
        tickMarkFormatter: (time: number | string) => {
          const seconds = typeof time === 'number' ? time : toEpochSeconds(time as any);
          return formatISTDate(seconds);
        },
      },
      rightPriceScale: {
        borderColor: '#475569',
      },
      crosshair: {
        mode: 1,
      },
      localization: {
        locale: 'en-IN',
        timeFormatter: (time: number | string) => formatISTDate(typeof time === 'number' ? time : toEpochSeconds(time as any)),
        dateFormat: 'dd MMM YY',
      },
    });

    chartRef.current = chart;

    // Add candlestick series (v5 API)
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Convert data to lightweight-charts format and sort by time (ascending)
    const candlestickData: any[] = data
      .map(d => ({
        time: (typeof d.time === 'number' ? d.time : (d.timestamp ? d.timestamp : toEpochSeconds(d.time))),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
      .sort((a, b) => a.time - b.time); // Sort ascending by time
    
    // Remove duplicates - keep only the last entry for each timestamp
    const uniqueCandlestickData = candlestickData.reduce((acc, curr) => {
      const lastItem = acc[acc.length - 1];
      if (!lastItem || lastItem.time !== curr.time) {
        acc.push(curr);
      } else {
        // Replace with current (keeping the last one for duplicate timestamps)
        acc[acc.length - 1] = curr;
      }
      return acc;
    }, [] as any[]);

    candlestickSeries.setData(uniqueCandlestickData);

    // Add HMA line if enabled and data exists
    let uniqueHmaData: { time: number; value: number }[] = [];

    if (localShowHMA) {
      const hmaData = data
        .filter(d => d.hma != null)
        .map(d => ({
          time: (typeof d.time === 'number' ? d.time : (d.timestamp ? d.timestamp : toEpochSeconds(d.time))),
          value: d.hma!,
        }))
        .sort((a, b) => a.time - b.time); // Sort ascending by time
      
      // Remove duplicates for HMA data as well
      uniqueHmaData = hmaData.reduce((acc, curr) => {
        const lastItem = acc[acc.length - 1];
        if (!lastItem || lastItem.time !== curr.time) {
          acc.push(curr);
        } else {
          acc[acc.length - 1] = curr;
        }
        return acc;
      }, [] as { time: number; value: number }[]);

      if (uniqueHmaData.length > 0) {
        const hmaSeries = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 2,
          title: hmaLabel,
          priceLineVisible: false,
        });
        hmaSeriesRef.current = hmaSeries;
        hmaSeries.setData(uniqueHmaData as any);
      } else {
        hmaSeriesRef.current = null;
      }
    } else {
      hmaSeriesRef.current = null;
    }

    const toolTip = document.createElement('div');
    toolTipRef.current = toolTip;
    toolTip.style.position = 'absolute';
    toolTip.style.left = '12px';
    toolTip.style.top = '12px';
    toolTip.style.padding = '8px 12px';
    toolTip.style.borderRadius = '8px';
    toolTip.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
    toolTip.style.color = '#e2e8f0';
    toolTip.style.pointerEvents = 'none';
    toolTip.style.fontSize = '12px';
    toolTip.style.lineHeight = '1.4';
    toolTip.style.fontFamily = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    toolTip.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.35)';
    toolTip.style.zIndex = '2';
    toolTip.innerHTML = '';
    container.appendChild(toolTip);

    const formatNumber = (value: number | null | undefined) => {
      if (value === null || value === undefined || Number.isNaN(value)) return '—';
      return value.toFixed(2);
    };

    const lastCandle = uniqueCandlestickData[uniqueCandlestickData.length - 1];
    const lastHmaValue = localShowHMA && uniqueHmaData.length > 0
      ? uniqueHmaData[uniqueHmaData.length - 1].value
      : null;

    const setTooltipContent = (
      timeSeconds: number,
      ohlc: { open: number; high: number; low: number; close: number } | null,
      hmaValue?: number | null,
    ) => {
      if (!toolTipRef.current) return;
      if (!ohlc) {
        toolTipRef.current.innerHTML = '<div>No data</div>';
        return;
      }

      const dateTime = formatISTDateTime(timeSeconds);
      const lines = [
        `<div style="font-weight:600; margin-bottom:4px;">${dateTime}</div>`,
        `<div>O: ${formatNumber(ohlc.open)} H: ${formatNumber(ohlc.high)}</div>`,
        `<div>L: ${formatNumber(ohlc.low)} C: ${formatNumber(ohlc.close)}</div>`,
      ];

      if (localShowHMA) {
        lines.push(`<div>${hmaLabel}: ${formatNumber(hmaValue)}</div>`);
      }

      toolTipRef.current.innerHTML = lines.join('');
    };

    if (lastCandle) {
      setTooltipContent(lastCandle.time, lastCandle, lastHmaValue);
    }

    const crosshairHandler = (param: any) => {
      if (!toolTipRef.current || !container || !lastCandle) return;

      const point = param.point;
      if (
        !param.time ||
        !point ||
        point.x < 0 ||
        point.x > container.clientWidth ||
        point.y < 0 ||
        point.y > container.clientHeight
      ) {
        setTooltipContent(lastCandle.time, lastCandle, lastHmaValue);
        return;
      }

      const candleSeries = candlestickSeriesRef.current;
      const ohlc = candleSeries ? param.seriesData?.get(candleSeries) ?? null : null;
      if (!ohlc) {
        setTooltipContent(lastCandle.time, lastCandle, lastHmaValue);
        return;
      }

      const resolvedTime = toEpochSeconds(param.time as any);

      let hmaValue: number | null = null;
      if (localShowHMA && hmaSeriesRef.current) {
        const hmaPoint = param.seriesData?.get(hmaSeriesRef.current);
        if (hmaPoint && typeof hmaPoint.value === 'number') {
          hmaValue = hmaPoint.value;
        }
      }

      setTooltipContent(resolvedTime, ohlc, hmaValue);
    };

    chart.subscribeCrosshairMove(crosshairHandler);

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

    if (staticLines.length > 0) {
      staticLines.forEach(line => {
        candlestickSeries.createPriceLine({
          price: line.price,
          color: line.color || '#f97316',
          lineWidth: 1,
          lineStyle: line.lineStyle ?? 0,
          axisLabelVisible: true,
          title: line.title,
        });
      });
    }

    if (markersPluginRef.current) {
      markersPluginRef.current.detach();
      markersPluginRef.current = null;
    }

    if (markers.length > 0) {
      markersPluginRef.current = createSeriesMarkers(
        candlestickSeries,
        markers.map(marker => ({
          time: marker.time,
          position: marker.position ?? 'belowBar',
          color: marker.color,
          shape: marker.shape ?? 'arrowUp',
          text: marker.text,
        })) as any,
      );
    }

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
      chart.unsubscribeCrosshairMove(crosshairHandler);
      if (toolTipRef.current && container.contains(toolTipRef.current)) {
        container.removeChild(toolTipRef.current);
        toolTipRef.current = null;
      }
      if (markersPluginRef.current) {
        markersPluginRef.current.detach();
        markersPluginRef.current = null;
      }
      chart.remove();
    };
  }, [
    data,
    localShowHMA,
    fibLevels,
    height,
    hmaLabel,
    staticLines,
    markers,
  ]);

  const toggleHMA = () => {
    setLocalShowHMA(!localShowHMA);
  };

  return (
    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-slate-400">
            Times shown in IST (UTC+5:30)
            {timeframeLabel ? ` • ${timeframeLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={localShowHMA}
              onChange={toggleHMA}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <span className="text-slate-300">{hmaLabel}</span>
          </label>
        </div>
      </div>
      
      <div ref={chartContainerRef} className="w-full" />
      
      <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-slate-300">Bullish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-slate-300">Bearish</span>
        </div>
        {localShowHMA && (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-blue-500"></div>
            <span className="text-slate-300">HMA 50</span>
          </div>
        )}
        {Object.keys(fibLevels).length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 border-t border-dashed border-slate-400"></div>
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
