// src/components/charts/TradingViewChart.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createChart, CrosshairMode, IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import Spinner from '@/components/ui/Spinner';
import { getTokenPrice } from '@/utils/api.index';

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface ChartDataPoint {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TradingViewChartProps {
  liquidityEvents?: any; // giữ prop để không phá nơi gọi, nhưng chart sẽ không bị chặn nữa
  tokenInfo: any;
}

function enhanceSmallCandles(data: ChartDataPoint[]): ChartDataPoint[] {
  const minCandleSize = 1e-9;
  return data.map((item) => {
    const bodySize = Math.abs(item.open - item.close);
    if (bodySize < minCandleSize) {
      const midPoint = (item.open + item.close) / 2;
      const adjustment = minCandleSize / 2;
      return {
        ...item,
        open: midPoint - adjustment,
        close: midPoint + adjustment,
        high: Math.max(item.high, midPoint + adjustment),
        low: Math.min(item.low, midPoint - adjustment),
      };
    }
    return item;
  });
}

function formatPriceLabel(price: number): string {
  const abs = Math.abs(price);
  if (abs >= 1) return price.toFixed(4);
  if (abs >= 0.1) return price.toFixed(5);
  if (abs >= 0.01) return price.toFixed(6);
  if (abs >= 0.001) return price.toFixed(7);
  return price.toFixed(8);
}

function buildOhlcFromPoints(points: Array<{ timestamp: string; price: number }>): ChartDataPoint[] {
  if (!Array.isArray(points) || points.length === 0) return [];

  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const out: ChartDataPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1] ?? cur;

    const open = Number(prev?.price ?? 0);
    const close = Number(cur?.price ?? 0);
    const t = Math.floor(new Date(cur.timestamp).getTime() / 1000);

    out.push({
      time: t,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
    });
  }

  // unique by time
  const unique = out.reduce((acc: ChartDataPoint[], curr) => {
    const last = acc[acc.length - 1];
    if (!last || last.time !== curr.time) acc.push(curr);
    return acc;
  }, []);

  // nếu chỉ 1 point thì nhân đôi để lightweight-charts render
  if (unique.length === 1) {
    const one = unique[0];
    unique.push({ ...one, time: one.time + 1 });
  }

  return enhanceSmallCandles(unique);
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
const DEFAULT_TIMEFRAME: Timeframe = '1d';

const TradingViewChart: React.FC<TradingViewChartProps> = ({ tokenInfo }) => {
  const tokenAddress = tokenInfo?.address as string | undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // request guard
  const reqIdRef = useRef(0);

  const fetchChart = useCallback(async () => {
    if (!tokenAddress) return;

    const myReq = ++reqIdRef.current;
    setLoading(true);
    setErr(null);

    try {
      const res = await getTokenPrice(tokenAddress, timeframe);
      if (myReq !== reqIdRef.current) return;

      const ohlc = buildOhlcFromPoints(res?.chart ?? []);
      setChartData(ohlc);
    } catch (e) {
      console.error('getTokenPrice failed:', e);
      if (myReq !== reqIdRef.current) return;
      setChartData([]);
      setErr('Failed to load chart data');
    } finally {
      if (myReq !== reqIdRef.current) return;
      setLoading(false);
    }
  }, [tokenAddress, timeframe]);

  // fetch whenever timeframe changes
  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  // create chart ONCE (when container ready)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // nếu parent chưa layout xong, width có thể = 0 → delay 1 frame
    const raf = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth || 600;

      const chart = createChart(containerRef.current, {
        width,
        height: 500,
        layout: { background: { color: 'transparent' }, textColor: '#d7e1ec' },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.08)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.08)' },
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.14)',
          visible: true,
          borderVisible: true,
          alignLabels: true,
          entireTextOnly: true,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.14)',
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: { mode: CrosshairMode.Normal },
        watermark: {
          color: 'rgba(255, 255, 255, 0.06)',
          visible: true,
          text: 'Bondle.xyz',
          fontSize: 28,
          horzAlign: 'center',
          vertAlign: 'center',
        },
      });

      const series = chart.addCandlestickSeries({
        upColor: '#7dd3fc',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#7dd3fc',
        wickDownColor: '#ef5350',
      });

      series.applyOptions({
        priceFormat: { type: 'custom', formatter: formatPriceLabel, minMove: 1e-9 },
      });

      chartRef.current = chart;
      seriesRef.current = series;
    });

    return () => {
      cancelAnimationFrame(raf);
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // update series data when chartData changes
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    if (!Array.isArray(chartData) || chartData.length < 2) return;

    const sorted = [...chartData].sort((a, b) => a.time - b.time);
    series.setData(
      sorted.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    chart.timeScale().setVisibleRange({
      from: sorted[0].time as Time,
      to: sorted[sorted.length - 1].time as Time,
    });
  }, [chartData]);

  // resize observer (chắc ăn hơn window.resize)
  useEffect(() => {
    const el = containerRef.current;
    const chart = chartRef.current;
    if (!el || !chart) return;

    const ro = new ResizeObserver(() => {
      const c = chartRef.current;
      const node = containerRef.current;
      if (!c || !node) return;
      const w = node.clientWidth;
      if (w > 0) c.applyOptions({ width: w });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const header = (
    <div className="flex items-center justify-between gap-3 mb-2">
      <div className="flex items-center gap-2 flex-wrap">
        {TIMEFRAMES.map((tf) => {
          const active = tf === timeframe;
          return (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border-thin transition-colors
                ${active ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'}`}
            >
              {tf}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-gray-400 whitespace-nowrap">
        {loading ? 'Loading…' : err ? 'Error' : chartData.length >= 2 ? `${timeframe} data` : 'No data'}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {header}

      <div className="w-full h-[500px] card gradient-border rounded-lg overflow-visible relative">
        {/* container chart */}
        <div ref={containerRef} className="w-full h-full" />

        {/* overlay loading/empty */}
        {(loading || chartData.length < 2) && (
          <div className="absolute inset-0 flex items-center justify-center">
            {loading ? (
              <Spinner size="medium" />
            ) : (
              <div className="flex flex-col items-center">
                <p className="text-white/90 text-lg">Not enough data to display chart</p>
                {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
    </div>
  );
};

export default TradingViewChart;
