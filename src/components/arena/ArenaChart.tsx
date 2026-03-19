// src/components/arena/ArenaChart.tsx
// Dual area chart showing probability (0–100%) for both sides of an arena
// Uses lightweight-charts (already installed v4.1.7)

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  MouseEventParams,
  CrosshairMode,
  ColorType,
} from 'lightweight-charts';

/* ═══════════════ TYPES ═══════════════ */

type ArenaTimeframe = '1H' | '6H' | '1D' | '1W' | '1M' | 'All';

interface ProbPoint {
  time: Time;
  value: number; // 0–100 (percent)
}

interface ArenaChartOption {
  label: string;
  chance: number; // 0–100
}

interface ArenaChartProps {
  arenaId: string;
  /** All options to display on chart */
  options: ArenaChartOption[];
  startTime: string;
  endTime: string;
  className?: string;
}

/* ═══════════════ CONSTANTS ═══════════════ */

const TIMEFRAMES: ArenaTimeframe[] = ['1H', '6H', '1D', '1W', '1M', 'All'];
const CHART_HEIGHT = 280;
const CHART_HEIGHT_SM = 220;

// Colors per side
const COLORS = [
  { line: '#3b82f6', areaTop: 'rgba(59, 130, 246, 0.35)', areaBottom: 'rgba(59, 130, 246, 0.02)', marker: '#3b82f6' },  // blue
  { line: '#ef4444', areaTop: 'rgba(239, 68, 68, 0.2)',   areaBottom: 'rgba(239, 68, 68, 0.02)',  marker: '#ef4444' },  // red
  { line: '#f59e0b', areaTop: 'rgba(245, 158, 11, 0.2)',  areaBottom: 'rgba(245, 158, 11, 0.02)', marker: '#f59e0b' },  // amber
  { line: '#10b981', areaTop: 'rgba(16, 185, 129, 0.2)',  areaBottom: 'rgba(16, 185, 129, 0.02)', marker: '#10b981' },  // green
];

const GRID_COLOR = 'rgba(255,255,255,0.04)';
const TEXT_COLOR = 'rgba(255,255,255,0.5)';
const CROSSHAIR_COLOR = 'rgba(255,255,255,0.15)';

/* ═══════════════ MOCK DATA GENERATOR ═══════════════ */

function generateMockData(
  startTime: string,
  endTime: string,
  targetChance: number,
  tf: ArenaTimeframe,
  seed: number,
): ProbPoint[] {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = Date.now();

  const tfIntervalMs: Record<ArenaTimeframe, number> = {
    '1H': 60_000, '6H': 5 * 60_000, '1D': 15 * 60_000,
    '1W': 60 * 60_000, '1M': 4 * 60 * 60_000, 'All': 24 * 60 * 60_000,
  };
  const tfWindowMs: Record<ArenaTimeframe, number> = {
    '1H': 60 * 60_000, '6H': 6 * 60 * 60_000, '1D': 24 * 60 * 60_000,
    '1W': 7 * 24 * 60 * 60_000, '1M': 30 * 24 * 60 * 60_000, 'All': end - start,
  };

  const windowStart = Math.max(start, now - tfWindowMs[tf]);
  const windowEnd = Math.min(end, now);
  if (windowStart >= windowEnd) return [];

  const totalSteps = Math.floor((windowEnd - windowStart) / tfIntervalMs[tf]);
  const steps = Math.min(totalSteps, 200);

  // Seeded random for consistent results per option
  let rng = seed;
  const rand = () => { rng = (rng * 16807 + 0) % 2147483647; return (rng % 1000) / 1000; };

  let value = 40 + rand() * 20;
  const drift = (targetChance - value) / Math.max(steps, 1);
  const points: ProbPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = windowStart + (i / steps) * (windowEnd - windowStart);
    const timestamp = Math.floor(t / 1000) as Time;
    const noise = (rand() - 0.5) * 6;
    value = value + drift + noise;
    value = Math.max(1, Math.min(99, value));
    if (i === steps) value = targetChance;
    points.push({ time: timestamp, value: Math.round(value * 10) / 10 });
  }

  return points;
}

/* ═══════════════ TOOLTIP ═══════════════ */

function formatTooltipTime(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${months[d.getMonth()]} ${d.getDate()}, ${hh}:${mm}`;
}

/* ═══════════════ COMPONENT ═══════════════ */

const ArenaChart: React.FC<ArenaChartProps> = ({
  arenaId,
  options,
  startTime,
  endTime,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const [tf, setTf] = useState<ArenaTimeframe>('1D');
  const [activeIdx, setActiveIdx] = useState(0); // which option is highlighted
  const [tooltip, setTooltip] = useState<{ x: number; y: number; values: { label: string; value: number; color: string }[]; time: number } | null>(null);
  const [chartHeight, setChartHeight] = useState(CHART_HEIGHT);

  // Responsive height
  useEffect(() => {
    const update = () => setChartHeight(window.innerWidth < 640 ? CHART_HEIGHT_SM : CHART_HEIGHT);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Generate data for all options
  const allData = useMemo(
    () => options.map((opt, i) =>
      generateMockData(startTime, endTime, opt.chance, tf, (i + 1) * 12345 + arenaId.charCodeAt(0)),
    ),
    [options, startTime, endTime, tf, arenaId],
  );

  // Create / update chart
  useEffect(() => {
    if (!containerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: TEXT_COLOR,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: GRID_COLOR },
        horzLines: { color: GRID_COLOR },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: CROSSHAIR_COLOR, width: 1, labelVisible: false },
        horzLine: { color: CROSSHAIR_COLOR, width: 1, labelBackgroundColor: COLORS[activeIdx]?.line ?? '#3b82f6' },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    // Add one area series per option
    const seriesList: ISeriesApi<'Area'>[] = [];
    allData.forEach((data, i) => {
      const c = COLORS[i % COLORS.length];
      const isActive = i === activeIdx;
      const series = chart.addAreaSeries({
        topColor: isActive ? c.areaTop : 'transparent',
        bottomColor: isActive ? c.areaBottom : 'transparent',
        lineColor: c.line,
        lineWidth: isActive ? 2 : 1,
        crosshairMarkerVisible: isActive,
        crosshairMarkerRadius: isActive ? 5 : 0,
        crosshairMarkerBorderColor: '#fff',
        crosshairMarkerBackgroundColor: c.marker,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price.toFixed(1)}%`,
        },
        lastValueVisible: true,
        priceLineVisible: false,
      });
      series.setData(data);
      seriesList.push(series);
    });

    chart.timeScale().fitContent();

    // Tooltip: show all option values
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.point || !param.time || !param.seriesData?.size) {
        setTooltip(null);
        return;
      }
      const values: { label: string; value: number; color: string }[] = [];
      seriesList.forEach((s, i) => {
        const val = param.seriesData.get(s);
        if (val && 'value' in val) {
          values.push({
            label: options[i]?.label ?? `Option ${i + 1}`,
            value: (val as any).value,
            color: COLORS[i % COLORS.length].line,
          });
        }
      });
      if (values.length > 0) {
        setTooltip({ x: param.point.x, y: param.point.y, values, time: param.time as number });
      }
    });

    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && chartRef.current) chartRef.current.resize(w, chartHeight);
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [allData, chartHeight, activeIdx, options]);

  return (
    <div className={`bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 ${className}`}>
      {/* Header row: option toggle pills + timeframe tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        {/* Option pills */}
        <div className="flex gap-1.5 flex-wrap">
          {options.map((opt, i) => {
            const c = COLORS[i % COLORS.length];
            const isAct = i === activeIdx;
            return (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isAct
                    ? 'bg-opacity-20 border'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={{
                  borderColor: isAct ? c.line : 'transparent',
                  backgroundColor: isAct ? `${c.line}20` : 'transparent',
                  color: c.line,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.line }} />
                {opt.label}
                <span className="font-bold">{opt.chance}%</span>
              </button>
            );
          })}
        </div>

        {/* Timeframe tabs */}
        <div className="flex gap-1">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                tf === t
                  ? 'bg-[var(--primary)]/20 text-[var(--primary)]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div className="relative" ref={containerRef}>
        {/* Multi-value tooltip */}
        {tooltip && (
          <div
            className="absolute z-10 pointer-events-none bg-[rgba(20,22,20,0.92)] border border-[var(--card-border)] rounded-lg px-3 py-2.5 shadow-lg min-w-[140px]"
            style={{
              left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 300) - 160),
              top: Math.max(tooltip.y - 60, 4),
            }}
          >
            <div className="text-[10px] text-gray-500 mb-1.5">{formatTooltipTime(tooltip.time)}</div>
            {tooltip.values.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: v.color }} />
                <span className="text-gray-400">{v.label}</span>
                <span className="ml-auto font-bold" style={{ color: v.color }}>
                  {v.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom stats */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
        <span>Click a label above to highlight</span>
        <span>Powered by Lightweight Charts</span>
      </div>
    </div>
  );
};

export default ArenaChart;
