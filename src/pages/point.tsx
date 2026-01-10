import React, { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';

/* =========================
   Types & Mock APIs
========================= */
type PlantTier =
  | 'SEED'
  | 'SPROUT'
  | 'SAPLING'
  | 'TREE'
  | 'BIG_TREE'
  | 'ANCIENT_TREE';

type LeagueInfo = {
  tier: PlantTier;
  awaySolToNext: number | null; // null nếu đã max tier
  seasonPoints: number;
  seasonTarget: number;
};

type PointEntry = {
  dateISO: string;
  tradingVolumeSol: number;
  points: number;
};

// Thứ tự các bậc (để tính "next tier")
const TIER_ORDER: PlantTier[] = [
  'SEED',
  'SPROUT',
  'SAPLING',
  'TREE',
  'BIG_TREE',
  'ANCIENT_TREE',
];

async function fetchLeagueInfo(): Promise<LeagueInfo> {
  // Mock theo ảnh nhưng thay hệ bậc cây: đang ở SEED, 0/1 point, còn 1.61 SOL tới bậc Sprout
  return {
    tier: 'SEED',
    awaySolToNext: 1.61,
    seasonPoints: 0,
    seasonTarget: 1,
  };
}

async function fetchPointHistory(): Promise<PointEntry[]> {
  return [];
}

/* =========================
   Helpers
========================= */
const fmtSOL = (n: number) =>
  `${(n ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })} SOL`;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

const getNextTier = (tier: PlantTier | null): PlantTier | null => {
  if (!tier) return null;
  const idx = TIER_ORDER.indexOf(tier);
  if (idx < 0 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
};

const TIER_EMOJI: Record<PlantTier, string> = {
  SEED: '🌱✨',
  SPROUT: '🌿',
  SAPLING: '🌳',
  TREE: '🌴',
  BIG_TREE: '🌲',
  ANCIENT_TREE: '🌳✨',
};

const TIER_LABEL: Record<PlantTier, string> = {
  SEED: 'Seed',
  SPROUT: 'Sprout',
  SAPLING: 'Sapling',
  TREE: 'Tree',
  BIG_TREE: 'Big Tree',
  ANCIENT_TREE: 'Ancient Tree',
};

const TierBadge: React.FC<{ tier: PlantTier }> = ({ tier }) => (
  <div className="flex items-center gap-2">
    <span className="text-xl leading-none">{TIER_EMOJI[tier]}</span>
    <span className="font-extrabold tracking-wide">{TIER_LABEL[tier]}</span>
  </div>
);

/* =========================
   Page
========================= */
const PointsPage: React.FC = () => {
  const [league, setLeague] = useState<LeagueInfo | null>(null);
  const [rows, setRows] = useState<PointEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [l, r] = await Promise.all([fetchLeagueInfo(), fetchPointHistory()]);
        setLeague(l);
        setRows(r);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const progressPct = useMemo(() => {
    if (!league) return 0;
    const pct = (league.seasonPoints / Math.max(1, league.seasonTarget)) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [league]);

  const nextTier = getNextTier(league?.tier ?? null);

  return (
    <Layout>
      <SEO
        title="Points"
        description="Earn points for doing stuff: trade, create, stake — have fun!"
      />

      <div className="min-h-screen flex flex-col items-center py-8 sm:py-10">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-10 xl:px-16">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Points</h1>
              <p className="mt-2 text-sm opacity-80">
                Get points for doing stuff : trade, create, stake have fun!
              </p>
            </div>

            {/* Points counter on the right */}
            <div className="text-right">
              <div className="text-sm opacity-80">Points</div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {league ? league.seasonPoints : '—'}
                <span className="opacity-70 text-base">
                  {' '}
                  / {league ? league.seasonTarget : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* League Row */}
          <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <TierBadge tier={league?.tier ?? 'SEED'} />
              <span className="opacity-80 text-sm">Progress through the ranks</span>
            </div>

            {/* Progress */}
            <div className="mt-3 h-2 rounded-full bg-[var(--card2)] border border-[var(--card-border)] overflow-hidden">
              <div className="h-full bg-[var(--primary)]" style={{ width: `${progressPct}%` }} />
            </div>

            {/* Away to next */}
            <div className="mt-2 text-xs opacity-80">
              {league?.awaySolToNext != null && nextTier
                ? `${league.awaySolToNext} SOL away from ${TIER_LABEL[nextTier]}`
                : 'Max tier reached'}
            </div>
          </div>

          {/* Season Section */}
          <div className="mt-6">
           

            {/* Empty State Card */}
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-0 overflow-hidden">
              <div className="px-4 sm:px-6 py-10 text-center">
                <div className="text-sm font-extrabold tracking-wide mb-2">NOTHING HERE</div>
                <div className="text-sm opacity-80">
                  Nothing yet? Switch wallets or trade to earn Seed Points.
                </div>
              </div>

              {/* Table */}
              <div className="border-t border-[var(--card-border)]">
                <div className="w-full overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--card)]">
                      <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-extrabold [&>th]:text-xs">
                        <th className="min-w-[140px]">DATE</th>
                        <th className="min-w-[200px]">TRADING VOLUME</th>
                        <th className="min-w-[160px]">POINTS EARNED</th>
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
                        rows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-[var(--card-hover)]">
                            <td className="px-4 py-3">{fmtDate(r.dateISO)}</td>
                            <td className="px-4 py-3">{fmtSOL(r.tradingVolumeSol)}</td>
                            <td className="px-4 py-3 font-extrabold">{r.points}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default PointsPage;
