// src/components/charts/TradingViewChart.tsx — Prediction Market dual-line chart
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createChart,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  Time,
  MouseEventParams,
  LineStyle,
} from 'lightweight-charts';
import SpaceLoader from '@/components/ui/SpaceLoader';
import { getTokenPrice } from '@/utils/api.index';
import { useTokenPriceStream } from '@/hooks/useTokenPriceStream';
import type { PredictionMarket } from '@/data/markets';

/* ═══════════════════ TYPES ═══════════════════ */

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type DisplayTF = '1H' | '6H' | '1D' | '1W' | '1M' | 'All';

interface TradingViewChartProps {
  liquidityEvents?: any;
  tokenInfo: any;
  market?: PredictionMarket;
}

/* ═══════════════════ CONSTANTS ═══════════════════ */

// Map display timeframes to API timeframes
const TF_MAP: Record<DisplayTF, Timeframe> = {
  '1H': '1m',
  '6H': '5m',
  '1D': '15m',
  '1W': '1h',
  '1M': '4h',
  'All': '1d',
};

const DISPLAY_TFS: DisplayTF[] = ['1H', '6H', '1D', '1W', '1M', 'All'];
const DEFAULT_TF: DisplayTF = '1D';
const CHART_H = 520;
const CHART_H_SM = 380;
const AUTO_REFRESH_MS = 15_000;

const TF_MIN: Record<Timeframe, number> = {
  '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440,
};

const OUTCOME_A_COLOR = '#3b82f6'; // blue
const OUTCOME_B_COLOR = '#ef4444'; // red/rose

/** Read a CSS custom property from :root */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function getThemeColors() {
  return {
    bg:         cssVar('--card', '#222521'),
    bgAlt:      cssVar('--card2', '#2A2E29'),
    border:     cssVar('--card-border', '#3C322C'),
    text:       cssVar('--foreground', '#F3EFEA'),
    textMuted:  cssVar('--foreground', '#F3EFEA') + '99',
    gridLine:   cssVar('--card2', '#2A2E29'),
    crosshair:  cssVar('--card-border', '#3C322C'),
  };
}

/* ═══════════════════ HELPERS ═══════════════════ */

interface PricePoint {
  time: number;
  value: number; // outcome A percentage (0-100)
}

function buildPricePoints(
  points: Array<{ timestamp: string; price: number }>,
  tfMin: number
): PricePoint[] {
  if (!points?.length) return [];
  const sorted = [...points].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  const bucket = tfMin * 60;
  const map = new Map<number, number[]>();

  for (const pt of sorted) {
    const ts = Math.floor(+new Date(pt.timestamp) / 1000);
    const key = Math.floor(ts / bucket) * bucket;
    if (!map.has(key)) map.set(key, []);
    // Convert price to percentage (0-100 range)
    let pct = Number(pt.price);
    if (pct > 0 && pct < 1) pct = pct * 100; // if price is 0.xx, treat as percentage
    if (pct > 100) pct = Math.min(pct / 10, 99); // cap at 99
    if (pct <= 0) pct = 50; // default
    map.get(key)!.push(pct);
  }

  const out: PricePoint[] = [];
  for (const key of [...map.keys()].sort((a, b) => a - b)) {
    const prices = map.get(key)!;
    const avg = prices.reduce((s, v) => s + v, 0) / prices.length;
    out.push({ time: key, value: Math.min(Math.max(avg, 1), 99) });
  }

  if (out.length === 1) {
    out.push({ ...out[0], time: out[0].time + bucket });
  }

  return out;
}

/* ═══════════════════ COMPONENT ═══════════════════ */

const TradingViewChart: React.FC<TradingViewChartProps> = ({ tokenInfo, market }) => {
  const tokenAddress = tokenInfo?.address as string | undefined;
  const tokenName = market?.outcomeA || tokenInfo?.name || tokenInfo?.symbol || 'YES';
  const outcomeB = market?.outcomeB || 'NO';

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const areaARef = useRef<ISeriesApi<'Area'> | null>(null);
  const areaBRef = useRef<ISeriesApi<'Area'> | null>(null);

  const [displayTf, setDisplayTf] = useState<DisplayTF>(DEFAULT_TF);
  const tf = TF_MAP[displayTf];
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isFS, setIsFS] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [chartH, setChartH] = useState(CHART_H);
  const [hoverValues, setHoverValues] = useState<{ a: number; b: number } | null>(null);
  const reqIdRef = useRef(0);

  // Responsive
  useEffect(() => {
    const u = () => setChartH(window.innerWidth < 640 ? CHART_H_SM : CHART_H);
    u(); window.addEventListener('resize', u); return () => window.removeEventListener('resize', u);
  }, []);

  // Current values
  const lastA = data.length > 0 ? Math.round(data[data.length - 1].value) : 50;
  const lastB = 100 - lastA;
  const displayA = hoverValues ? Math.round(hoverValues.a) : lastA;
  const displayB = hoverValues ? Math.round(hoverValues.b) : lastB;

  /* ─── fetch ─── */
  const fetchChart = useCallback(async (silent = false) => {
    // Use mock chart data from prediction market if available
    if (market?.chartData?.length) {
      const myReq = ++reqIdRef.current;
      if (!silent) setLoading(true);
      // Simulate async
      await new Promise((r) => setTimeout(r, 200));
      if (myReq !== reqIdRef.current) return;
      setData(buildPricePoints(market.chartData, TF_MIN[tf]));
      if (!silent) setLoading(false);
      return;
    }

    if (!tokenAddress) return;
    const myReq = ++reqIdRef.current;
    if (!silent) { setLoading(true); setErr(null); }
    try {
      const res = await getTokenPrice(tokenAddress, tf);
      if (myReq !== reqIdRef.current) return;
      setData(buildPricePoints(res?.chart ?? [], TF_MIN[tf]));
    } catch (e) {
      console.error('getTokenPrice failed:', e);
      if (myReq !== reqIdRef.current) return;
      if (!silent) { setData([]); setErr('Failed to load chart data'); }
    } finally {
      if (myReq !== reqIdRef.current) return;
      if (!silent) setLoading(false);
    }
  }, [tokenAddress, tf, market]);

  useEffect(() => { fetchChart(); }, [fetchChart]);
  useEffect(() => {
    if (!autoRefresh || !tokenAddress) return;
    const id = setInterval(() => {
      if (!document.hidden) fetchChart(true);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchChart, tokenAddress]);

  /* ─── WebSocket real-time ─── */
  useTokenPriceStream(tokenAddress, (tick) => {
    const areaA = areaARef.current;
    const areaB = areaBRef.current;
    if (!areaA || !areaB) return;

    const ts = Math.floor(new Date(tick.timestamp).getTime() / 1000) as Time;
    let p = tick.price;
    if (p > 0 && p < 1) p = p * 100;
    p = Math.min(Math.max(p, 1), 99);

    areaA.update({ time: ts, value: p });
    areaB.update({ time: ts, value: 100 - p });
  });

  /* ─── create chart ─── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || 600;
      const tc = getThemeColors();
      const chart = createChart(containerRef.current, {
        width: w,
        height: chartH,
        layout: { background: { color: tc.bg }, textColor: tc.textMuted },
        grid: {
          vertLines: { color: tc.gridLine },
          horzLines: { color: tc.gridLine },
        },
        rightPriceScale: {
          borderColor: tc.border,
          visible: true,
          borderVisible: true,
          alignLabels: true,
          entireTextOnly: true,
          scaleMargins: { top: 0.05, bottom: 0.05 },
        },
        timeScale: {
          borderColor: tc.border,
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { labelVisible: true, style: LineStyle.Solid, width: 1, color: tc.crosshair },
          horzLine: { labelVisible: true, style: LineStyle.Solid, width: 1, color: tc.crosshair },
        },
      });

      // Percentage formatter
      const pctFormat = {
        type: 'custom' as const,
        formatter: (price: number) => `${price.toFixed(1)}%`,
        minMove: 0.1,
      };

      // Outcome A (YES) — blue area
      const areaA = chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.25)',
        bottomColor: 'rgba(59, 130, 246, 0.02)',
        lineColor: OUTCOME_A_COLOR,
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        priceLineColor: OUTCOME_A_COLOR,
      });
      areaA.applyOptions({ priceFormat: pctFormat });

      // Outcome B (NO) — red area
      const areaB = chart.addAreaSeries({
        topColor: 'rgba(239, 68, 68, 0.15)',
        bottomColor: 'rgba(239, 68, 68, 0.01)',
        lineColor: OUTCOME_B_COLOR,
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        priceLineColor: OUTCOME_B_COLOR,
      });
      areaB.applyOptions({ priceFormat: pctFormat });

      chartRef.current = chart;
      areaARef.current = areaA;
      areaBRef.current = areaB;

      // Crosshair hover
      chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (!param.time || !param.seriesData) {
          setHoverValues(null);
          return;
        }
        const dA = param.seriesData.get(areaA) as any;
        if (dA?.value != null) {
          setHoverValues({ a: dA.value, b: 100 - dA.value });
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      chartRef.current?.remove();
      chartRef.current = null;
      areaARef.current = null;
      areaBRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chartRef.current?.applyOptions({ height: chartH }); }, [chartH]);

  /* ─── update data ─── */
  useEffect(() => {
    const chart = chartRef.current;
    const areaA = areaARef.current;
    const areaB = areaBRef.current;
    if (!chart || !areaA || !areaB) return;
    if (data.length < 2) return;

    const sorted = [...data].sort((a, b) => a.time - b.time);

    const dataA = sorted.map((d) => ({ time: d.time as Time, value: d.value }));
    const dataB = sorted.map((d) => ({ time: d.time as Time, value: 100 - d.value }));

    areaA.setData(dataA);
    areaB.setData(dataB);

    chart.timeScale().fitContent();
  }, [data]);

  /* ─── resize ─── */
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = containerRef.current?.clientWidth; if (!w || w <= 0) return;
      chartRef.current?.applyOptions({ width: w });
    });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  /* ─── fullscreen ─── */
  const toggleFS = useCallback(() => {
    const el = wrapperRef.current; if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().then(() => setIsFS(true)).catch(() => {});
    else document.exitFullscreen?.().then(() => setIsFS(false)).catch(() => {});
  }, []);
  useEffect(() => { const h = () => setIsFS(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);

  /* ═════ RENDER ═════ */
  return (
    <div ref={wrapperRef} className={`w-full rounded-lg overflow-hidden ${isFS ? 'fixed inset-0 z-50 bg-[var(--card)]' : ''}`}>

      {/* ══ TOP HEADER BAR ══ */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--card2)] border-b border-[var(--card-border)] text-xs">
        {/* Outcome legend badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-blue-500/40 bg-blue-500/10">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-semibold text-blue-400">{tokenName} {displayA}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-rose-500/30 bg-rose-500/5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-medium text-rose-400">{outcomeB} {displayB}%</span>
          </div>
        </div>

        {/* Timeframe + controls */}
        <div className="flex items-center gap-2">
          {DISPLAY_TFS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDisplayTf(t)}
              className={`px-2 py-0.5 rounded transition-colors font-medium ${
                t === displayTf
                  ? 'text-white bg-[var(--primary)]/30'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}

          <span className="text-[var(--card-border)]">|</span>

          {/* Auto refresh */}
          <button type="button" onClick={() => setAutoRefresh(!autoRefresh)} title={autoRefresh ? 'Live (15s)' : 'Paused'}
            className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />

          {/* Fullscreen */}
          <button type="button" onClick={toggleFS} title="Fullscreen" className="text-gray-500 hover:text-gray-300 p-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,5 1,1 5,1"/><polyline points="9,1 13,1 13,5"/><polyline points="13,9 13,13 9,13"/><polyline points="5,13 1,13 1,9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ══ CHART STATS BAR ══ */}
      {market && (
        <div className="flex items-center gap-4 px-3 py-1.5 bg-[var(--card)] border-b border-[var(--card-border)] text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Vol 24h:</span>
            <span className="font-semibold text-gray-300">${market.volume24h >= 1000 ? `${(market.volume24h / 1000).toFixed(1)}K` : market.volume24h}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Liquidity:</span>
            <span className="font-semibold text-gray-300">${market.liquidity >= 1000 ? `${(market.liquidity / 1000).toFixed(1)}K` : market.liquidity}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Total Vol:</span>
            <span className="font-semibold text-gray-300">${market.totalVolume >= 1000 ? `${(market.totalVolume / 1000).toFixed(1)}K` : market.totalVolume}</span>
          </div>
        </div>
      )}

      {/* ══ CHART CONTAINER ══ */}
      <div className="relative" style={{ height: chartH }}>
        <div ref={containerRef} className="w-full h-full" />
        {(loading || data.length < 2) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--card)]">
            {loading ? <SpaceLoader size="medium" /> : (
              <div className="flex flex-col items-center">
                <p className="text-gray-400 text-sm">Not enough data to display chart</p>
                {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ FOOTER ══ */}
      <div className="flex items-center justify-between px-3 py-1 bg-[var(--card2)] border-t border-[var(--card-border)] text-[10px] text-gray-500">
        <span>Click a label above to highlight</span>
        <span>Powered by Lightweight Charts</span>
      </div>

      {err && !loading && <div className="text-xs text-red-400 mt-2 px-3">{err}</div>}
    </div>
  );
};

export default TradingViewChart;
