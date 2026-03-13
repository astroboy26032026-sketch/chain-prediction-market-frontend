// src/pages/point/[address].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';

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
   UI Tier label (keep "plant vibe")
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
  SEED: '🌱✨',
  SPROUT: '🌿',
  SAPLING: '🌳',
  TREE: '🌴',
  BIG_TREE: '🌲',
};

const TIER_LABEL: Record<PlantTier, string> = {
  SEED: 'Seed',
  SPROUT: 'Sprout',
  SAPLING: 'Sapling',
  TREE: 'Tree',
  BIG_TREE: 'Big Tree',
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

  return (
    <Layout>
      <SEO title="Points" description="Earn points for doing stuff: trade, create, stake have fun!" />

      <div className="min-h-screen flex flex-col items-center py-8 sm:py-10">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-10 xl:px-16">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Points</h1>
              <p className="mt-2 text-sm opacity-80">Get points for doing stuff : trade, create, stake have fun!</p>
              {walletAddress ? <div className="mt-2 text-xs opacity-60 break-all">Wallet: {walletAddress}</div> : null}
            </div>

            {/* Counters */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-6">
                <div>
                  <div className="text-sm opacity-80">Points</div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                    {tierProg ? fmtNum(tierProg.points) : '—'}
                  </div>
                </div>

                <div>
                  <div className="text-sm opacity-80">Tickets</div>
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                    {overview ? fmtNum(overview.tickets) : '—'}
                  </div>
                </div>
              </div>

              {tierProg ? (
                <div className="mt-2 text-xs opacity-70">
                  Current tier benefit: {fmtNum(tierProg.currentTier.tickets)} tickets
                </div>
              ) : null}
            </div>
          </div>

          {/* Tier Progress */}
          <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TierBadge tierNum={tierProg?.currentTier.tier ?? 1} />
                <span className="opacity-80 text-sm">Progress (by points)</span>
              </div>

              <div className="text-xs opacity-70 text-right">
                {tierProg?.nextTier ? (
                  <div>
                    Next Tier {tierProg.nextTier.tier}: {fmtNum(tierProg.nextTier.minPoints)} pts
                  </div>
                ) : (
                  <div>Max tier</div>
                )}
              </div>
            </div>

            <div className="mt-3 h-2 rounded-full bg-[var(--card2)] border border-[var(--card-border)] overflow-hidden">
              <div className="h-full bg-[var(--primary)]" style={{ width: `${tierProg?.progressPercent ?? 0}%` }} />
            </div>

            <div className="mt-2 text-xs opacity-80 flex items-center justify-between gap-3">
              <div>
                {tierProg?.nextTier && tierProg.remainingPointsToNext != null
                  ? `${fmtNum(tierProg.remainingPointsToNext)} points away from ${nextTierLabel}`
                  : 'Max tier reached'}
              </div>

              {tierProg?.nextTier ? (
                <div className="opacity-70">
                  {fmtNum(tierProg.pointsIntoRange)} / {fmtNum(tierProg.rangeSize)} pts in this tier
                </div>
              ) : null}
            </div>
          </div>

          {/* History */}
          <div className="mt-6">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-0 overflow-hidden">
              <div className="px-4 sm:px-6 py-6">
                <div className="text-sm font-extrabold tracking-wide mb-1">POINT HISTORY</div>
              </div>

              <div className="border-t border-[var(--card-border)]">
                <div className="w-full overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--card)]">
                      <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-center [&>th]:font-extrabold [&>th]:text-xs">
                        <th className="min-w-[140px]">DATE</th>
                        <th className="min-w-[220px]">TYPE</th>
                        <th className="min-w-[160px]">POINTS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                      {loading ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center opacity-70">
                            Loading…
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center opacity-70">
                            You’ll see your point history here
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map((r, idx) => (
                          <tr key={`${r.dateISO}-${idx}`} className="hover:bg-[var(--card-hover)]">
                            <td className="px-4 py-3 text-center">{fmtDate(r.dateISO)}</td>
                            <td className="px-4 py-3 text-center">{r.type || '—'}</td>
                            <td className="px-4 py-3 text-center font-extrabold text-[var(--primary)]">
                              {fmtNum(r.points)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {!loading && hasMoreRows ? (
                <div className="flex justify-center py-5 border-t border-[var(--card-border)]">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => Math.min(prev + HISTORY_STEP, rows.length))}
                    className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                  >
                    Load more
                  </button>
                </div>
              ) : null}

              {!loading && rows.length === 0 ? (
                <div className="px-4 sm:px-6 py-6 text-center opacity-80">
                  Nothing yet? Switch wallets or trade to earn Seed Points.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PointsPage;