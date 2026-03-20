// TrustLevel: Trust score card with badge + category breakdowns
// Data will come from BE API later; currently uses defaults (0 scores, bronze badge)

import React from 'react';

/* ═══════ TYPES ═══════ */

export interface TrustScoreData {
  liquidity?: number;       // 0–40
  distribution?: number;    // 0–35  (holder concentration)
  creator?: number;         // 0–25
}

interface TrustLevelProps {
  data?: TrustScoreData | null;
}

/* ═══════ CONSTANTS ═══════ */

const MAX_LIQUIDITY = 40;
const MAX_DISTRIBUTION = 35;
const MAX_CREATOR = 25;
const MAX_TOTAL = MAX_LIQUIDITY + MAX_DISTRIBUTION + MAX_CREATOR; // 100

type Badge = 'bronze' | 'silver' | 'gold';
type Level = 'good' | 'normal' | 'low';

function getBadge(total: number): Badge {
  if (total >= 75) return 'gold';
  if (total >= 40) return 'silver';
  return 'bronze';
}

function getLevel(score: number, max: number): Level {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.65) return 'good';
  if (pct >= 0.35) return 'normal';
  return 'low';
}

/* ═══════ BADGE ICONS ═══════ */

const BadgeIcon: React.FC<{ badge: Badge }> = ({ badge }) => {
  const colors: Record<Badge, { outer: string; inner: string; shine: string }> = {
    bronze: { outer: '#CD7F32', inner: '#A0522D', shine: '#DDA15E' },
    silver: { outer: '#C0C0C0', inner: '#A8A8A8', shine: '#E8E8E8' },
    gold:   { outer: '#FFD700', inner: '#DAA520', shine: '#FFF0A0' },
  };
  const c = colors[badge];

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield shape */}
      <path
        d="M20 4L6 10V20C6 28.5 12 35.5 20 37C28 35.5 34 28.5 34 20V10L20 4Z"
        fill={c.inner}
        stroke={c.outer}
        strokeWidth="1.5"
      />
      {/* Shine */}
      <path
        d="M20 7L10 11.5V20C10 26.5 14.5 32 20 33.5V7Z"
        fill={c.shine}
        opacity="0.25"
      />
      {/* Star */}
      <path
        d="M20 13L22.2 17.5L27 18.2L23.5 21.6L24.4 26.3L20 24L15.6 26.3L16.5 21.6L13 18.2L17.8 17.5L20 13Z"
        fill={c.shine}
        stroke={c.outer}
        strokeWidth="0.5"
      />
    </svg>
  );
};

/* ═══════ LEVEL INDICATOR ═══════ */

const LEVEL_CONFIG: Record<Level, { label: string; color: string; bg: string }> = {
  good:   { label: 'Good',   color: '#4ade80', bg: 'rgba(74, 222, 128, 0.12)' },
  normal: { label: 'Normal', color: '#facc15', bg: 'rgba(250, 204, 21, 0.12)' },
  low:    { label: 'Low',    color: '#f87171', bg: 'rgba(248, 113, 113, 0.12)' },
};

const LevelBadge: React.FC<{ level: Level }> = ({ level }) => {
  const cfg = LEVEL_CONFIG[level];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
};

/* ═══════ SCORE BAR ═══════ */

const ScoreBar: React.FC<{ score: number; max: number; level: Level }> = ({ score, max, level }) => {
  const pct = max > 0 ? Math.min((score / max) * 100, 100) : 0;
  const cfg = LEVEL_CONFIG[level];
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--card)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: cfg.color }}
      />
    </div>
  );
};

/* ═══════ MAIN COMPONENT ═══════ */

const TrustLevel: React.FC<TrustLevelProps> = ({ data }) => {
  const liquidity = data?.liquidity ?? 0;
  const distribution = data?.distribution ?? 0;
  const creator = data?.creator ?? 0;
  const total = liquidity + distribution + creator;

  const badge = getBadge(total);
  const liqLevel = getLevel(liquidity, MAX_LIQUIDITY);
  const distLevel = getLevel(distribution, MAX_DISTRIBUTION);
  const creatorLevel = getLevel(creator, MAX_CREATOR);

  const categories = [
    { label: 'Liquidity',    score: liquidity,    max: MAX_LIQUIDITY,    level: liqLevel },
    { label: 'Distribution', score: distribution, max: MAX_DISTRIBUTION, level: distLevel },
    { label: 'Creator',      score: creator,      max: MAX_CREATOR,      level: creatorLevel },
  ];

  return (
    <div className="card gradient-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Trust Score</span>
        <span className="text-xs text-gray-500">{total} / {MAX_TOTAL}</span>
      </div>

      {/* Badge icons */}
      <div className="flex items-center gap-2 mb-4">
        {(['bronze', 'silver', 'gold'] as Badge[]).map((b) => (
          <div
            key={b}
            className={`rounded-full p-0.5 transition-opacity ${badge === b ? 'opacity-100 ring-1 ring-[var(--primary)]' : 'opacity-30'}`}
          >
            <BadgeIcon badge={b} />
          </div>
        ))}
      </div>

      {/* Category breakdowns */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{cat.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">{cat.score}/{cat.max}</span>
                <LevelBadge level={cat.level} />
              </div>
            </div>
            <ScoreBar score={cat.score} max={cat.max} level={cat.level} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustLevel;
