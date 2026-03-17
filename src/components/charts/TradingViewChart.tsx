// src/components/charts/TradingViewChart.tsx
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
import Spinner from '@/components/ui/Spinner';
import { getTokenPrice } from '@/utils/api.index';
import { useTokenPriceStream } from '@/hooks/useTokenPriceStream';

/* ═══════════════════ TYPES ═══════════════════ */

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
type ChartType = 'candle' | 'line' | 'area';
type Indicator = 'MA7' | 'MA25' | 'EMA9' | 'BOLL' | 'RSI' | 'MACD';
type DrawingTool = 'none' | 'hline' | 'trendline';

interface OhlcvPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingViewChartProps {
  liquidityEvents?: any;
  tokenInfo: any;
}

/* ═══════════════════ CONSTANTS ═══════════════════ */

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];
const DEFAULT_TF: Timeframe = '5m';
const CHART_H = 520;
const CHART_H_SM = 380;
const RSI_H = 100;
const MACD_H = 100;
const SIDEBAR_W = 40;
const AUTO_REFRESH_MS = 15_000;

const TF_MIN: Record<Timeframe, number> = {
  '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440,
};

const UP = '#26a69a';
const DN = '#ef5350';

/* ═══════════════════ MATH HELPERS ═══════════════════ */

function fmtPrice(p: number): string {
  const a = Math.abs(p);
  if (a >= 1) return p.toFixed(4);
  if (a >= 0.1) return p.toFixed(5);
  if (a >= 0.01) return p.toFixed(6);
  if (a >= 0.001) return p.toFixed(7);
  return p.toFixed(8);
}


function enhanceSmall(data: OhlcvPoint[]): OhlcvPoint[] {
  const min = 1e-9;
  return data.map((d) => {
    if (Math.abs(d.open - d.close) < min) {
      const mid = (d.open + d.close) / 2, adj = min / 2;
      return { ...d, open: mid - adj, close: mid + adj, high: Math.max(d.high, mid + adj), low: Math.min(d.low, mid - adj) };
    }
    return d;
  });
}

function buildOhlcv(points: Array<{ timestamp: string; price: number }>, tfMin: number): OhlcvPoint[] {
  if (!points?.length) return [];
  const sorted = [...points].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
  const bucket = tfMin * 60;
  const map = new Map<number, number[]>();
  for (const pt of sorted) {
    const ts = Math.floor(+new Date(pt.timestamp) / 1000);
    const key = Math.floor(ts / bucket) * bucket;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(Number(pt.price));
  }
  const out: OhlcvPoint[] = [];
  let prevClose: number | null = null;
  for (const key of [...map.keys()].sort((a, b) => a - b)) {
    const pr = map.get(key)!;
    // Use previous candle's close as this candle's open (creates visible body even with 1 price per bucket)
    const o = prevClose ?? pr[0];
    const c = pr[pr.length - 1];
    const h = Math.max(o, ...pr);
    const l = Math.min(o, ...pr);
    out.push({ time: key, open: o, high: h, low: l, close: c, volume: pr.length * Math.abs(h - l || c * 0.001) });
    prevClose = c;
  }
  if (out.length === 1) out.push({ ...out[0], time: out[0].time + bucket });
  return enhanceSmall(out);
}

function calcMA(d: OhlcvPoint[], p: number) {
  const r: Array<{ time: number; value: number }> = [];
  for (let i = p - 1; i < d.length; i++) {
    let s = 0; for (let j = i - p + 1; j <= i; j++) s += d[j].close;
    r.push({ time: d[i].time, value: s / p });
  }
  return r;
}

function calcEMA(d: OhlcvPoint[], p: number) {
  if (!d.length) return [];
  const k = 2 / (p + 1);
  const r: Array<{ time: number; value: number }> = [];
  let e = d[0].close; r.push({ time: d[0].time, value: e });
  for (let i = 1; i < d.length; i++) { e = d[i].close * k + e * (1 - k); r.push({ time: d[i].time, value: e }); }
  return r;
}

function calcBoll(d: OhlcvPoint[], p = 20, m = 2) {
  const up: Array<{ time: number; value: number }> = [], mid: Array<{ time: number; value: number }> = [], lo: Array<{ time: number; value: number }> = [];
  for (let i = p - 1; i < d.length; i++) {
    let s = 0; for (let j = i - p + 1; j <= i; j++) s += d[j].close;
    const avg = s / p; let v = 0; for (let j = i - p + 1; j <= i; j++) v += (d[j].close - avg) ** 2;
    const std = Math.sqrt(v / p);
    mid.push({ time: d[i].time, value: avg }); up.push({ time: d[i].time, value: avg + m * std }); lo.push({ time: d[i].time, value: avg - m * std });
  }
  return { upper: up, mid, lower: lo };
}

function calcRSI(d: OhlcvPoint[], p = 14) {
  const r: Array<{ time: number; value: number }> = [];
  if (d.length < p + 1) return r;
  let g = 0, l = 0;
  for (let i = 1; i <= p; i++) { const df = d[i].close - d[i - 1].close; if (df > 0) g += df; else l -= df; }
  let ag = g / p, al = l / p;
  r.push({ time: d[p].time, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
  for (let i = p + 1; i < d.length; i++) {
    const df = d[i].close - d[i - 1].close;
    ag = (ag * (p - 1) + (df > 0 ? df : 0)) / p;
    al = (al * (p - 1) + (df < 0 ? -df : 0)) / p;
    r.push({ time: d[i].time, value: al === 0 ? 100 : 100 - 100 / (1 + ag / al) });
  }
  return r;
}

function calcMACD(d: OhlcvPoint[]) {
  const e12 = calcEMA(d, 12), e26 = calcEMA(d, 26);
  if (!e26.length) return { macd: [], signal: [], histogram: [] as Array<{ time: number; value: number; color: string }> };
  const e26m = new Map(e26.map((x) => [x.time, x.value]));
  const ml: Array<{ time: number; value: number }> = [];
  for (const x of e12) { const v = e26m.get(x.time); if (v !== undefined) ml.push({ time: x.time, value: x.value - v }); }
  const k = 2 / 10, sig: Array<{ time: number; value: number }> = [];
  if (ml.length) { let e = ml[0].value; sig.push({ time: ml[0].time, value: e }); for (let i = 1; i < ml.length; i++) { e = ml[i].value * k + e * (1 - k); sig.push({ time: ml[i].time, value: e }); } }
  const sm = new Map(sig.map((x) => [x.time, x.value]));
  const hist: Array<{ time: number; value: number; color: string }> = [];
  for (const x of ml) { const s = sm.get(x.time) ?? 0; const df = x.value - s; hist.push({ time: x.time, value: df, color: df >= 0 ? 'rgba(38,166,154,0.5)' : 'rgba(239,83,80,0.5)' }); }
  return { macd: ml, signal: sig, histogram: hist };
}

function createSub(el: HTMLDivElement, h: number, w: number): IChartApi {
  return createChart(el, {
    width: w, height: h,
    layout: { background: { color: 'transparent' }, textColor: '#d7e1ec' },
    grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.05)' } },
    rightPriceScale: { borderColor: 'rgba(255,255,255,0.14)', scaleMargins: { top: 0.1, bottom: 0.1 } },
    timeScale: { visible: false, borderColor: 'rgba(255,255,255,0.14)' },
    crosshair: { mode: CrosshairMode.Normal, vertLine: { visible: false, labelVisible: false }, horzLine: { style: LineStyle.Dashed, width: 1, color: 'rgba(255,255,255,0.15)', labelVisible: true } },
  });
}

/* ═══════════════════ COMPONENT ═══════════════════ */

const TradingViewChart: React.FC<TradingViewChartProps> = ({ tokenInfo }) => {
  const tokenAddress = tokenInfo?.address as string | undefined;
  const tokenName = tokenInfo?.name || '';
  const tokenSymbol = tokenInfo?.symbol || '';

  const containerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ma7Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ma25Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema9Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const bollUpRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollMidRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bollLoRef = useRef<ISeriesApi<'Line'> | null>(null);

  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const macdLRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const hLinesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const trendLinesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const trendClickRef = useRef<{ time: Time; value: number } | null>(null);

  const [tf, setTf] = useState<Timeframe>(DEFAULT_TF);
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [data, setData] = useState<OhlcvPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<Set<Indicator>>(new Set());
  const [legend, setLegend] = useState<OhlcvPoint | null>(null);
  const [isFS, setIsFS] = useState(false);
  const [drawTool, setDrawTool] = useState<DrawingTool>('none');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [priceMode, setPriceMode] = useState<'price' | 'mcap'>('price');
  const [chartH, setChartH] = useState(CHART_H);
  const [utcTime, setUtcTime] = useState('');
  const reqIdRef = useRef(0);

  // responsive
  useEffect(() => {
    const u = () => setChartH(window.innerWidth < 640 ? CHART_H_SM : CHART_H);
    u(); window.addEventListener('resize', u); return () => window.removeEventListener('resize', u);
  }, []);

  // UTC clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setUtcTime(d.toISOString().slice(11, 19) + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ─── fetch ─── */
  const fetchChart = useCallback(async (silent = false) => {
    if (!tokenAddress) return;
    const myReq = ++reqIdRef.current;
    if (!silent) { setLoading(true); setErr(null); }
    try {
      const res = await getTokenPrice(tokenAddress, tf);
      if (myReq !== reqIdRef.current) return;
      setData(buildOhlcv(res?.chart ?? [], TF_MIN[tf]));
    } catch (e) {
      console.error('getTokenPrice failed:', e);
      if (myReq !== reqIdRef.current) return;
      if (!silent) { setData([]); setErr('Failed to load chart data'); }
    } finally {
      if (myReq !== reqIdRef.current) return;
      if (!silent) setLoading(false);
    }
  }, [tokenAddress, tf]);

  useEffect(() => { fetchChart(); }, [fetchChart]);
  useEffect(() => {
    if (!autoRefresh || !tokenAddress) return;
    const id = setInterval(() => fetchChart(true), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, fetchChart, tokenAddress]);

  /* ─── WebSocket real-time price stream ─── */
  useTokenPriceStream(tokenAddress, (tick) => {
    const candle = candleRef.current;
    const vol = volumeRef.current;
    if (!candle || !vol) return;

    const ts = Math.floor(new Date(tick.timestamp).getTime() / 1000) as Time;
    const p = tick.price;

    // Update last candle in real-time (lightweight-charts merges by time)
    candle.update({ time: ts, open: p, high: p, low: p, close: p });

    if (tick.volume != null) {
      vol.update({ time: ts, value: tick.volume, color: 'rgba(38,166,154,0.25)' });
    }
  });

  /* ─── create main chart ─── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || 600;
      const chart = createChart(containerRef.current, {
        width: w, height: chartH,
        layout: { background: { color: '#131722' }, textColor: '#787b86' },
        grid: { vertLines: { color: '#1e222d' }, horzLines: { color: '#1e222d' } },
        rightPriceScale: { borderColor: '#2a2e39', visible: true, borderVisible: true, alignLabels: true, entireTextOnly: true, scaleMargins: { top: 0.08, bottom: 0.2 } },
        timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
        crosshair: { mode: CrosshairMode.Normal, vertLine: { labelVisible: true, style: LineStyle.Solid, width: 1, color: '#363a45' }, horzLine: { labelVisible: true, style: LineStyle.Solid, width: 1, color: '#363a45' } },
      });

      const pf = { type: 'custom' as const, formatter: fmtPrice, minMove: 1e-9 };

      const candle = chart.addCandlestickSeries({ upColor: UP, downColor: DN, borderVisible: false, wickUpColor: UP, wickDownColor: DN });
      candle.applyOptions({ priceFormat: pf });
      const line = chart.addLineSeries({ color: UP, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false });
      line.applyOptions({ priceFormat: pf });
      const area = chart.addAreaSeries({ topColor: 'rgba(38,166,154,0.3)', bottomColor: 'rgba(38,166,154,0.01)', lineColor: UP, lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: false });
      area.applyOptions({ priceFormat: pf });
      const vol = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '' });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

      const ma7 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      const ma25 = chart.addLineSeries({ color: '#8b5cf6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      const ema9 = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      const bUp = chart.addLineSeries({ color: '#e879f9', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      const bMid = chart.addLineSeries({ color: '#e879f9', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      const bLo = chart.addLineSeries({ color: '#e879f9', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

      chartRef.current = chart; candleRef.current = candle; lineRef.current = line; areaRef.current = area;
      volumeRef.current = vol; ma7Ref.current = ma7; ma25Ref.current = ma25; ema9Ref.current = ema9;
      bollUpRef.current = bUp; bollMidRef.current = bMid; bollLoRef.current = bLo;

      chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (!param.time || !param.seriesData) { setLegend(null); return; }
        const cd = param.seriesData.get(candle) as any;
        if (cd?.open != null) {
          const vd = param.seriesData.get(vol) as any;
          setLegend({ time: param.time as number, open: cd.open, high: cd.high, low: cd.low, close: cd.close, volume: vd?.value ?? 0 });
        } else {
          const ld = (param.seriesData.get(line) ?? param.seriesData.get(area)) as any;
          if (ld?.value != null) setLegend({ time: param.time as number, open: ld.value, high: ld.value, low: ld.value, close: ld.value, volume: 0 });
        }
      });

      chart.subscribeClick((param: MouseEventParams) => {
        if (!param.time || !param.point) return;
        const price = candle.coordinateToPrice(param.point.y);
        if (price == null) return;
        if (drawTool === 'hline') {
          const hl = chart.addLineSeries({ color: '#fbbf24', lineWidth: 1, lineStyle: LineStyle.LargeDashed, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
          hl.applyOptions({ priceFormat: { type: 'custom' as const, formatter: fmtPrice, minMove: 1e-9 } });
          const tr = chart.timeScale().getVisibleRange();
          if (tr) hl.setData([{ time: tr.from as Time, value: price as number }, { time: tr.to as Time, value: price as number }]);
          hLinesRef.current.push(hl);
        }
        if (drawTool === 'trendline') {
          if (!trendClickRef.current) {
            trendClickRef.current = { time: param.time as Time, value: price as number };
          } else {
            const tl = chart.addLineSeries({ color: '#60a5fa', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
            tl.setData([
              { time: trendClickRef.current.time, value: trendClickRef.current.value },
              { time: param.time as Time, value: price as number },
            ]);
            trendLinesRef.current.push(tl);
            trendClickRef.current = null;
          }
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      chartRef.current?.remove(); chartRef.current = null;
      candleRef.current = null; lineRef.current = null; areaRef.current = null; volumeRef.current = null;
      ma7Ref.current = null; ma25Ref.current = null; ema9Ref.current = null;
      bollUpRef.current = null; bollMidRef.current = null; bollLoRef.current = null;
      hLinesRef.current = []; trendLinesRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── RSI sub ─── */
  useEffect(() => {
    if (!indicators.has('RSI')) { rsiChartRef.current?.remove(); rsiChartRef.current = null; rsiRef.current = null; return; }
    const el = rsiContainerRef.current; if (!el || rsiChartRef.current) return;
    const w = el.clientWidth || 600;
    const ch = createSub(el, RSI_H, w);
    const s = ch.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    const ob = ch.addLineSeries({ color: 'rgba(239,83,80,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const os = ch.addLineSeries({ color: 'rgba(38,166,154,0.3)', lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    if (data.length >= 2) {
      ob.setData([{ time: data[0].time as Time, value: 70 }, { time: data[data.length - 1].time as Time, value: 70 }]);
      os.setData([{ time: data[0].time as Time, value: 30 }, { time: data[data.length - 1].time as Time, value: 30 }]);
    }
    rsiChartRef.current = ch; rsiRef.current = s;
    return () => { ch.remove(); rsiChartRef.current = null; rsiRef.current = null; };
  }, [indicators.has('RSI'), data.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── MACD sub ─── */
  useEffect(() => {
    if (!indicators.has('MACD')) { macdChartRef.current?.remove(); macdChartRef.current = null; macdLRef.current = null; macdSRef.current = null; macdHRef.current = null; return; }
    const el = macdContainerRef.current; if (!el || macdChartRef.current) return;
    const w = el.clientWidth || 600;
    const ch = createSub(el, MACD_H, w);
    const ml = ch.addLineSeries({ color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const sg = ch.addLineSeries({ color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const ht = ch.addHistogramSeries({ priceFormat: { type: 'price', precision: 10, minMove: 1e-10 }, priceScaleId: '' });
    ht.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    macdChartRef.current = ch; macdLRef.current = ml; macdSRef.current = sg; macdHRef.current = ht;
    return () => { ch.remove(); macdChartRef.current = null; macdLRef.current = null; macdSRef.current = null; macdHRef.current = null; };
  }, [indicators.has('MACD')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { chartRef.current?.applyOptions({ height: chartH }); }, [chartH]);

  /* ─── update data ─── */
  useEffect(() => {
    const chart = chartRef.current, candle = candleRef.current, line = lineRef.current, area = areaRef.current, vol = volumeRef.current;
    if (!chart || !candle || !line || !area || !vol) return;
    if (data.length < 2) return;
    const sorted = [...data].sort((a, b) => a.time - b.time);
    const td = sorted.map((d) => ({ time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close }));
    const ld = sorted.map((d) => ({ time: d.time as Time, value: d.close }));
    candle.applyOptions({ visible: chartType === 'candle' }); line.applyOptions({ visible: chartType === 'line' }); area.applyOptions({ visible: chartType === 'area' });
    candle.setData(td); line.setData(ld); area.setData(ld);
    vol.setData(sorted.map((d) => ({ time: d.time as Time, value: d.volume, color: d.close >= d.open ? 'rgba(38,166,154,0.25)' : 'rgba(239,83,80,0.25)' })));
    const tt = (a: Array<{ time: number; value: number }>) => a.map((x) => ({ time: x.time as Time, value: x.value }));
    ma7Ref.current?.setData(indicators.has('MA7') ? tt(calcMA(sorted, 7)) : []);
    ma25Ref.current?.setData(indicators.has('MA25') ? tt(calcMA(sorted, 25)) : []);
    ema9Ref.current?.setData(indicators.has('EMA9') ? tt(calcEMA(sorted, 9)) : []);
    if (indicators.has('BOLL')) { const b = calcBoll(sorted); bollUpRef.current?.setData(tt(b.upper)); bollMidRef.current?.setData(tt(b.mid)); bollLoRef.current?.setData(tt(b.lower)); }
    else { bollUpRef.current?.setData([]); bollMidRef.current?.setData([]); bollLoRef.current?.setData([]); }
    if (indicators.has('RSI') && rsiRef.current) { rsiRef.current.setData(tt(calcRSI(sorted))); rsiChartRef.current?.timeScale().fitContent(); }
    if (indicators.has('MACD') && macdLRef.current && macdSRef.current && macdHRef.current) {
      const m = calcMACD(sorted);
      macdLRef.current.setData(tt(m.macd)); macdSRef.current.setData(tt(m.signal));
      macdHRef.current.setData(m.histogram.map((x) => ({ time: x.time as Time, value: x.value, color: x.color })));
      macdChartRef.current?.timeScale().fitContent();
    }
    chart.timeScale().fitContent();
  }, [data, indicators, chartType]);

  /* ─── sync time ─── */
  useEffect(() => {
    const main = chartRef.current; if (!main) return;
    const subs = [rsiChartRef.current, macdChartRef.current].filter(Boolean) as IChartApi[];
    if (!subs.length) return;
    const h = () => { const r = main.timeScale().getVisibleLogicalRange(); if (r) subs.forEach((s) => s.timeScale().setVisibleLogicalRange(r)); };
    main.timeScale().subscribeVisibleLogicalRangeChange(h);
    return () => main.timeScale().unsubscribeVisibleLogicalRangeChange(h);
  }, [indicators]);

  /* ─── resize ─── */
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = containerRef.current?.clientWidth; if (!w || w <= 0) return;
      chartRef.current?.applyOptions({ width: w }); rsiChartRef.current?.applyOptions({ width: w }); macdChartRef.current?.applyOptions({ width: w });
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

  const clearDrawings = useCallback(() => {
    const c = chartRef.current; if (!c) return;
    for (const s of hLinesRef.current) try { c.removeSeries(s); } catch {}
    for (const s of trendLinesRef.current) try { c.removeSeries(s); } catch {}
    hLinesRef.current = []; trendLinesRef.current = []; trendClickRef.current = null;
  }, []);

  const toggleInd = (i: Indicator) => setIndicators((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  const last = data.length >= 2 ? data[data.length - 1] : null;
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const pct = last && prev && prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : null;
  const dl = legend || last;

  const IND_LIST: { key: Indicator; label: string; color: string }[] = [
    { key: 'MA7', label: 'MA 7', color: '#f59e0b' }, { key: 'MA25', label: 'MA 25', color: '#8b5cf6' },
    { key: 'EMA9', label: 'EMA 9', color: '#3b82f6' }, { key: 'BOLL', label: 'BOLL', color: '#e879f9' },
    { key: 'RSI', label: 'RSI', color: '#f59e0b' }, { key: 'MACD', label: 'MACD', color: '#3b82f6' },
  ];

  /* ═════ RENDER ═════ */
  return (
    <div ref={wrapperRef} className={`w-full rounded-lg overflow-hidden ${isFS ? 'fixed inset-0 z-50 bg-[#131722]' : ''}`}>

      {/* ══ TOP HEADER BAR ══ */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#1e222d] border-b border-[#2a2e39] text-xs">
        <div className="flex items-center gap-3">
          {/* Timeframe selector */}
          <span className="text-white font-semibold">{tf}</span>

          {/* Chart type icons */}
          <button type="button" onClick={() => setChartType('candle')} title="Candlestick"
            className={`p-1 rounded ${chartType === 'candle' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="7" y="1" width="2" height="14" rx="0.5"/><rect x="5" y="4" width="6" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
          <button type="button" onClick={() => setChartType('line')} title="Line"
            className={`p-1 rounded ${chartType === 'line' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="1,12 5,6 9,9 15,3"/></svg>
          </button>
          <button type="button" onClick={() => setChartType('area')} title="Area"
            className={`p-1 rounded ${chartType === 'area' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" opacity="0.3"><polygon points="1,12 5,6 9,9 15,3 15,14 1,14"/><polyline points="1,12 5,6 9,9 15,3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="1"/></svg>
          </button>

          <span className="text-[#363a45]">|</span>

          {/* Price / MarketCap toggle */}
          <button type="button" onClick={() => setPriceMode('price')}
            className={`px-1 ${priceMode === 'price' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            SOL/USD
          </button>
          <button type="button" onClick={() => setPriceMode('mcap')}
            className={`px-1 ${priceMode === 'mcap' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
            MarketCap/Price
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Indicators dropdown area */}
          {IND_LIST.map(({ key, label, color }) => (
            <button key={key} type="button" onClick={() => toggleInd(key)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${indicators.has(key) ? '' : 'text-gray-500 hover:text-gray-300'}`}
              style={indicators.has(key) ? { color, textDecoration: 'underline' } : undefined}>
              {label}
            </button>
          ))}

          <span className="text-[#363a45]">|</span>

          {/* Auto refresh */}
          <button type="button" onClick={() => setAutoRefresh(!autoRefresh)} title={autoRefresh ? 'Live (15s)' : 'Paused'}
            className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-[#26a69a] animate-pulse' : 'bg-gray-600'}`} />

          {/* Screenshot placeholder */}
          <button type="button" title="Screenshot" className="text-gray-500 hover:text-gray-300 p-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1" y="3" width="12" height="9" rx="1.5"/><circle cx="7" cy="7.5" r="2.5"/></svg>
          </button>

          {/* Fullscreen */}
          <button type="button" onClick={toggleFS} title="Fullscreen" className="text-gray-500 hover:text-gray-300 p-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,5 1,1 5,1"/><polyline points="9,1 13,1 13,5"/><polyline points="13,9 13,13 9,13"/><polyline points="5,13 1,13 1,9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ══ OHLCV LEGEND (overlay on chart) ══ */}
      <div className="relative">
        {dl && data.length >= 2 && (
          <div className="absolute top-2 left-12 z-10 flex items-center gap-2 text-[11px] font-mono pointer-events-none">
            <span className="text-gray-300 font-semibold">{tokenName || tokenSymbol} · {tf}</span>
            <span className="text-gray-500">O</span><span className="text-white">{fmtPrice(dl.open)}</span>
            <span className="text-gray-500">H</span><span className="text-white">{fmtPrice(dl.high)}</span>
            <span className="text-gray-500">L</span><span className="text-white">{fmtPrice(dl.low)}</span>
            <span className="text-gray-500">C</span>
            <span className={dl.close >= dl.open ? 'text-[#26a69a]' : 'text-[#ef5350]'}>{fmtPrice(dl.close)}</span>
            {pct !== null && (
              <span className={pct >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'}>
                ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
              </span>
            )}
          </div>
        )}

        {/* ══ MAIN AREA: Sidebar + Chart ══ */}
        <div className="flex">
          {/* LEFT SIDEBAR */}
          <div className="flex flex-col items-center py-2 gap-1 bg-[#1e222d] border-r border-[#2a2e39] shrink-0 hidden sm:flex" style={{ width: SIDEBAR_W }}>
            {/* Cursor */}
            <button type="button" onClick={() => { setDrawTool('none'); trendClickRef.current = null; }}
              title="Cursor" className={`w-7 h-7 flex items-center justify-center rounded text-sm ${drawTool === 'none' ? 'bg-[#2a2e39] text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M2,1 L2,11 L5,8 L8,13 L10,12 L7,7 L11,7 Z"/></svg>
            </button>

            {/* Trendline */}
            <button type="button" onClick={() => setDrawTool(drawTool === 'trendline' ? 'none' : 'trendline')}
              title="Trend Line" className={`w-7 h-7 flex items-center justify-center rounded text-sm ${drawTool === 'trendline' ? 'bg-[#2a2e39] text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="12" x2="12" y2="2"/></svg>
            </button>

            {/* Horizontal line */}
            <button type="button" onClick={() => setDrawTool(drawTool === 'hline' ? 'none' : 'hline')}
              title="Horizontal Line" className={`w-7 h-7 flex items-center justify-center rounded text-sm ${drawTool === 'hline' ? 'bg-[#2a2e39] text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="1" y1="7" x2="13" y2="7"/></svg>
            </button>

            <div className="w-5 border-t border-[#2a2e39] my-1" />

            {/* Eraser */}
            <button type="button" onClick={clearDrawings}
              title="Clear Drawings" className="w-7 h-7 flex items-center justify-center rounded text-sm text-gray-500 hover:text-red-400">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2,12 L12,2 M12,12 L2,2"/></svg>
            </button>

            <div className="flex-1" />

            {/* Zoom in/out */}
            <button type="button" onClick={() => chartRef.current?.timeScale().fitContent()}
              title="Fit" className="w-7 h-7 flex items-center justify-center rounded text-sm text-gray-500 hover:text-gray-300">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6" cy="6" r="4.5"/><line x1="9.5" y1="9.5" x2="13" y2="13"/>
              </svg>
            </button>
          </div>

          {/* CHART CONTAINER */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="relative" style={{ height: chartH }}>
              <div ref={containerRef} className="w-full h-full" style={{ cursor: drawTool !== 'none' ? 'crosshair' : undefined }} />
              {(loading || data.length < 2) && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#131722]">
                  {loading ? <Spinner size="medium" /> : (
                    <div className="flex flex-col items-center">
                      <p className="text-gray-400 text-sm">Not enough data to display chart</p>
                      {err && <p className="text-xs text-red-400 mt-2">{err}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RSI */}
            {indicators.has('RSI') && (
              <div className="border-t border-[#2a2e39]">
                <div className="text-[10px] text-gray-600 px-2 py-0.5 bg-[#131722]">RSI 14</div>
                <div ref={rsiContainerRef} className="w-full" style={{ height: RSI_H }} />
              </div>
            )}

            {/* MACD */}
            {indicators.has('MACD') && (
              <div className="border-t border-[#2a2e39]">
                <div className="text-[10px] text-gray-600 px-2 py-0.5 bg-[#131722]">MACD 12, 26, 9</div>
                <div ref={macdContainerRef} className="w-full" style={{ height: MACD_H }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ BOTTOM BAR ══ */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#1e222d] border-t border-[#2a2e39] text-[11px]">
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((t) => (
            <button key={t} type="button" onClick={() => setTf(t)}
              className={`px-2 py-0.5 rounded transition-colors ${t === tf ? 'text-white bg-[#2a2e39]' : 'text-gray-500 hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-gray-500">
          <span className={autoRefresh ? 'text-[#ef5350]' : 'text-gray-600'}>{utcTime}</span>
          <span className="text-gray-600">|</span>
          <button type="button" className="text-gray-500 hover:text-white">%</button>
          <button type="button" className="text-gray-500 hover:text-white">log</button>
          <button type="button" className="text-gray-500 hover:text-white">auto</button>
        </div>
      </div>

      {err && !loading && <div className="text-xs text-red-400 mt-2 px-3">{err}</div>}
    </div>
  );
};

export default TradingViewChart;
