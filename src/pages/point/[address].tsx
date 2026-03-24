// src/pages/point/[address].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { COMMON, SEO as SEO_TEXT, POINTS } from '@/constants/ui-text';

import { getPointsOverview, getPointsHistory } from '@/utils/api.index';
import type { PointsHistoryItem, PointsOverviewResponse } from '@/interface/types';

/* =========================
   Tier config (Points -> Tickets)
========================= */
type TierConfig = {
  tier: number;
  minPoints: number;
  tickets: number;
};

const TIER_CONFIG: TierConfig[] = [
  { tier: 1, minPoints: 0, tickets: 0 },
  { tier: 2, minPoints: 500, tickets: 1 },
  { tier: 3, minPoints: 2000, tickets: 3 },
  { tier: 4, minPoints: 10000, tickets: 5 },
  { tier: 5, minPoints: 50000, tickets: 10 },
];

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

const getTierByPoints = (points: number): TierConfig => {
  const p = Number(points ?? 0);
  let current = TIER_CONFIG[0];
  for (const t of TIER_CONFIG) if (p >= t.minPoints) current = t;
  return current;
};

const getNextTierConfig = (tier: number): TierConfig | null => {
  const idx = TIER_CONFIG.findIndex((x) => x.tier === tier);
  if (idx < 0) return null;
  return idx === TIER_CONFIG.length - 1 ? null : TIER_CONFIG[idx + 1];
};

/* =========================
   UI Tier label (space theme)
========================= */
type PlantTier = 'SEED' | 'SPROUT' | 'SAPLING' | 'TREE' | 'BIG_TREE';

const TIER_PLANT_BY_NUM: Record<number, PlantTier> = {
  1: 'SEED',
  2: 'SPROUT',
  3: 'SAPLING',
  4: 'TREE',
  5: 'BIG_TREE',
};

const TIER_EMOJI: Record<PlantTier, string> = {
  SEED: '☄️',
  SPROUT: '🌙',
  SAPLING: '🪐',
  TREE: '⭐',
  BIG_TREE: '🌌',
};

const TIER_LABEL: Record<PlantTier, string> = {
  SEED: 'Comet',
  SPROUT: 'Moon',
  SAPLING: 'Planet',
  TREE: 'Star',
  BIG_TREE: 'Galaxy',
};

const TierBadge: React.FC<{ tierNum: number }> = ({ tierNum }) => {
  const plant = TIER_PLANT_BY_NUM[tierNum] ?? 'SEED';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl leading-none">{TIER_EMOJI[plant]}</span>
      <span className="font-extrabold tracking-wide">
        Tier {tierNum} · {TIER_LABEL[plant]}
      </span>
    </div>
  );
};

/* =========================
   Helpers
========================= */
const fmtNum = (n: number) => Number(n ?? 0).toLocaleString();

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

/* =========================
   Types for page state
========================= */
type TierProgress = {
  currentTier: TierConfig;
  nextTier: TierConfig | null;

  points: number;
  tickets: number;

  progressPercent: number;
  remainingPointsToNext: number | null;

  rangeStartPoints: number;
  rangeEndPoints: number | null;

  pointsIntoRange: number;
  rangeSize: number;
};

type HistoryRow = {
  dateISO: string;
  type: string;
  points: number;
};

function buildTierProgress(points: number, tickets: number): TierProgress {
  const currentTier = getTierByPoints(points);
  const nextTier = getNextTierConfig(currentTier.tier);

  const rangeStartPoints = currentTier.minPoints;
  const rangeEndPoints = nextTier?.minPoints ?? null;

  const pointsIntoRange = Math.max(0, points - rangeStartPoints);
  const rangeSize = rangeEndPoints == null ? 0 : Math.max(1, rangeEndPoints - rangeStartPoints);

  const progressPercent = rangeEndPoints == null ? 100 : clamp((pointsIntoRange / rangeSize) * 100, 0, 100);
  const remainingPointsToNext = rangeEndPoints == null ? null : Math.max(0, rangeEndPoints - points);

  return {
    currentTier,
    nextTier,
    points,
    tickets,
    progressPercent,
    remainingPointsToNext,
    rangeStartPoints,
    rangeEndPoints,
    pointsIntoRange,
    rangeSize,
  };
}

/* =========================
   Page
========================= */
const HISTORY_STEP = 10;

const PointsPage: React.FC = () => {
  const router = useRouter();
  const walletAddress = useMemo(() => {
    const v = router.query.address;
    return typeof v === 'string' ? v : '';
  }, [router.query.address]);

  const [overview, setOverview] = useState<PointsOverviewResponse | null>(null);
  const [tierProg, setTierProg] = useState<TierProgress | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(HISTORY_STEP);

  useEffect(() => {
    if (!router.isReady) return;

    (async () => {
      setLoading(true);
      setVisibleCount(HISTORY_STEP);

      try {
        if (!walletAddress) {
          const tp = buildTierProgress(0, 0);
          setOverview({ points: 0, tickets: 0 });
          setTierProg(tp);
          setRows([]);
          return;
        }

        const [ov, hs] = await Promise.all([getPointsOverview(walletAddress), getPointsHistory(walletAddress)]);
        setOverview(ov);

        const points = Number(ov?.points ?? 0);
        const tickets = Number(ov?.tickets ?? 0);
        setTierProg(buildTierProgress(points, tickets));

        const items: PointsHistoryItem[] = Array.isArray(hs?.items) ? hs.items : [];
        const mapped = items
          .map((x) => ({
            dateISO: String(x.timestamp ?? ''),
            type: String(x.type ?? ''),
            points: Number(x.points ?? 0),
          }))
          .filter((r) => !!r.dateISO);

        setRows(mapped);
      } catch {
        const tp = buildTierProgress(0, 0);
        setOverview({ points: 0, tickets: 0 });
        setTierProg(tp);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady, walletAddress]);

  const nextTierLabel = useMemo(() => {
    if (!tierProg?.nextTier) return null;
    const plant = TIER_PLANT_BY_NUM[tierProg.nextTier.tier] ?? 'SEED';
    return `Tier ${tierProg.nextTier.tier} · ${TIER_LABEL[plant]}`;
  }, [tierProg?.nextTier]);

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const hasMoreRows = visibleCount < rows.length;

  const plant = TIER_PLANT_BY_NUM[tierProg?.currentTier.tier ?? 1] ?? 'SEED';

  return (
    <Layout>
      <SEO title="Fuel" description={SEO_TEXT.POINTS_DESC} />

      <div className="min-h-screen flex flex-col items-center py-8 sm:py-10">
        <div className="w-full max-w-5xl px-4 sm:px-6">

          {/* Page heading */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Fuel</h1>
            <p className="mt-1 text-sm opacity-60">Earn points from quests, trading, and events!</p>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">

          {/* ── LEFT COLUMN: Cards ── */}
          <div className="flex flex-col gap-3">

          {/* ── Card 1: Points Earned ── */}
          <div className="rounded-2xl border border-[var(--card-border)] overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(var(--primary-rgb,124,111,255),0.18) 0%, rgba(var(--accent-rgb,80,200,200),0.10) 100%)' }}
          >
            <div className="px-5 pt-4 pb-1">
              <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase opacity-60">Points Earned</span>
            </div>
            <div className="px-5 pb-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-extrabold tracking-tight" style={{ color: 'var(--primary)' }}>
                      {tierProg ? fmtNum(tierProg.points) : '—'}
                    </span>
                    <span className="text-sm opacity-60 font-semibold">pts</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: 'var(--primary)', color: '#fff' }}
                    >
                      {TIER_EMOJI[plant]} {TIER_LABEL[plant]}
                    </span>
                    <span className="text-xs opacity-60">Tier {tierProg?.currentTier.tier ?? 1} · current level</span>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/reward/${walletAddress}`)}
                  className="flex items-center gap-1 text-sm font-bold whitespace-nowrap"
                  style={{ color: 'var(--primary)' }}
                >
                  Go to Rewards <span className="text-base">›</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── Card 2: Tier Status ── */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
            <div className="px-5 pt-4 pb-1">
              <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase opacity-60">Tier Status</span>
            </div>
            <div className="px-5 pb-5">
              <div className="flex items-start justify-between gap-3 mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(var(--primary-rgb,124,111,255),0.12)' }}
                  >
                    {TIER_EMOJI[plant]}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm">
                      {TIER_LABEL[plant]} · Tier {tierProg?.currentTier.tier ?? 1}
                    </div>
                    <div className="text-xs opacity-60 mt-0.5">
                      {tierProg?.nextTier && tierProg.remainingPointsToNext != null
                        ? `${fmtNum(tierProg.remainingPointsToNext)} pts away from ${nextTierLabel}`
                        : 'Max tier reached 🎉'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {tierProg?.nextTier ? (
                    <div className="text-xs opacity-50">Next: {fmtNum(tierProg.nextTier.minPoints)} pts</div>
                  ) : (
                    <div className="text-xs opacity-50">Max tier</div>
                  )}
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full overflow-hidden bg-[var(--card2)] border border-[var(--card-border)]">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${tierProg?.progressPercent ?? 0}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent))' }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border border-[var(--card-border)] bg-[var(--card2)]">
                  ⭐ {tierProg ? fmtNum(tierProg.pointsIntoRange) : 0} pts in tier
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border border-[var(--card-border)] bg-[var(--card2)]">
                  🎟️ {overview ? fmtNum(overview.tickets) : 0} Tickets
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border border-[var(--card-border)] bg-[var(--card2)]">
                  🎁 {tierProg ? fmtNum(tierProg.currentTier.tickets) : 0} tickets/tier
                </span>
              </div>
            </div>
          </div>

          {/* ── Card 3: Spin to Win ── */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
            <div className="px-5 pt-4 pb-1">
              <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase opacity-60">Spin to Win</span>
            </div>
            <div className="px-5 pb-5">
              <div className="flex items-start justify-between gap-3 mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: 'rgba(var(--accent-rgb,80,200,200),0.12)' }}
                  >
                    🚀
                  </div>
                  <div>
                    <div className="font-extrabold text-sm">Spin &amp; Win Rewards</div>
                    <div className="text-xs opacity-60 mt-0.5">Convert points → tickets → spin for SOL!</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/reward/${walletAddress}`)}
                  className="flex items-center gap-1 text-sm font-bold whitespace-nowrap"
                  style={{ color: 'var(--primary)' }}
                >
                  Spin Now <span className="text-base">›</span>
                </button>
              </div>
              <div className="mt-4 rounded-xl p-3 border border-[var(--card-border)]"
                style={{ background: 'rgba(var(--primary-rgb,124,111,255),0.07)' }}
              >
                <div className="text-[10px] font-extrabold tracking-[0.15em] uppercase opacity-60 mb-2">Your Tickets</div>
                <p className="text-xs opacity-70 mb-3">
                  Use your tickets to spin the cosmic wheel and win SOL prizes. More points = higher tier = more tickets per spin!
                </p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full"
                  style={{ background: 'var(--primary)', color: '#fff' }}
                >
                  🎟️ {overview ? fmtNum(overview.tickets) : 0} Tickets Available
                </span>
              </div>
            </div>
          </div>

          </div>{/* end left column */}

          {/* ── RIGHT COLUMN: History ── */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-[var(--card-border)]">
              <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase opacity-60">{POINTS.POINT_HISTORY}</span>
            </div>

            <div className="w-full overflow-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-center [&>th]:font-extrabold [&>th]:text-[10px] [&>th]:tracking-widest [&>th]:uppercase [&>th]:opacity-50 bg-[var(--card2)]">
                    <th>Date</th>
                    <th>Type</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center opacity-50 text-sm">Loading…</td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center opacity-50 text-sm">
                        {"You'll see your point history here"}
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((r, idx) => (
                      <tr key={`${r.dateISO}-${idx}`} className="hover:bg-[var(--card-hover)] transition-colors">
                        <td className="px-4 py-3 text-center opacity-70">{fmtDate(r.dateISO)}</td>
                        <td className="px-4 py-3 text-center">{r.type || '—'}</td>
                        <td className="px-4 py-3 text-center font-extrabold" style={{ color: 'var(--primary)' }}>
                          +{fmtNum(r.points)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && hasMoreRows && (
              <div className="flex justify-center py-4 border-t border-[var(--card-border)]">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + HISTORY_STEP, rows.length))}
                  className="px-5 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] text-sm font-semibold hover:opacity-80 transition-opacity"
                >
                  Load more
                </button>
              </div>
            )}

            {!loading && rows.length === 0 && (
              <div className="px-5 py-5 text-center text-sm opacity-60">
                {POINTS.EMPTY_ENCOURAGE}
              </div>
            )}
          </div>

          </div>{/* end grid */}

        </div>
      </div>
    </Layout>
  );
};

export default PointsPage;