// src/pages/point/[address].tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { COMMON, SEO as SEO_TEXT, POINTS } from '@/constants/ui-text';
import { Trophy, Gift, TrendingUp, Target, Award, Shield, Users, Swords, CheckCircle2, Circle, Clock } from 'lucide-react';

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

/* =========================
   Trading Volume Mock Data
========================= */
type VolumeLeaderRow = {
  rank: number;
  wallet: string;
  volume: number;
  trades: number;
  reward: string;
};

const MOCK_VOLUME_LEADERS: VolumeLeaderRow[] = [
  { rank: 1, wallet: '7xK9...mP3q', volume: 125840, trades: 342, reward: '100 SOL' },
  { rank: 2, wallet: 'AuEj...5Ryy', volume: 98200, trades: 289, reward: '50 SOL' },
  { rank: 3, wallet: '5u2B...jP8w', volume: 76500, trades: 201, reward: '25 SOL' },
  { rank: 4, wallet: '3kR7...nQ2e', volume: 54300, trades: 178, reward: '15 SOL' },
  { rank: 5, wallet: '9mW4...xL6t', volume: 43200, trades: 156, reward: '15 SOL' },
  { rank: 6, wallet: 'BpK3...dH9v', volume: 38100, trades: 134, reward: '15 SOL' },
  { rank: 7, wallet: 'Ck2F...rV5a', volume: 31500, trades: 112, reward: '15 SOL' },
  { rank: 8, wallet: 'D4nJ...wY8m', volume: 27800, trades: 98, reward: '15 SOL' },
  { rank: 9, wallet: 'E8pL...zK3b', volume: 24100, trades: 87, reward: '15 SOL' },
  { rank: 10, wallet: 'F2qN...uT7c', volume: 21600, trades: 76, reward: '15 SOL' },
];

type VolumeMilestone = {
  target: number;
  label: string;
  reward: string;
  completed: boolean;
};

const MOCK_MILESTONES: VolumeMilestone[] = [
  { target: 100, label: 'Starter', reward: '10 pts', completed: true },
  { target: 1000, label: 'Active Trader', reward: '50 pts', completed: true },
  { target: 5000, label: 'Power Trader', reward: '200 pts', completed: false },
  { target: 25000, label: 'Whale', reward: '1000 pts', completed: false },
  { target: 100000, label: 'Legend', reward: '5000 pts + NFT', completed: false },
];

/* =========================
   Club Mission Mock Data (fake — replace with BE/API when ready)
========================= */
const myClubPoints = 1250;       // fake — user's club mission points
const myClubMissions = 7;        // fake — completed missions count
const myClubName = 'PEPE Army';  // fake — user's current club
const myClubRank = 3;            // fake — club rank in mission leaderboard

type ClubMissionItem = {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'trade' | 'invite' | 'arena' | 'hold' | 'create';
  progress: number;
  target: number;
  expiresIn: string;
  completed: boolean;
};

const MOCK_CLUB_MISSIONS: ClubMissionItem[] = [
  { id: 'cm1', title: 'Club Trading Sprint', description: 'Club members trade $5K total volume this week', reward: 200, type: 'trade', progress: 3800, target: 5000, expiresIn: '2d 14h', completed: false },
  { id: 'cm2', title: 'Recruit New Blood', description: 'Invite 5 new members to your club', reward: 150, type: 'invite', progress: 5, target: 5, expiresIn: '—', completed: true },
  { id: 'cm3', title: 'Arena Dominators', description: 'Win 3 arena wars as a club', reward: 300, type: 'arena', progress: 2, target: 3, expiresIn: '4d 8h', completed: false },
  { id: 'cm4', title: 'Diamond Grip', description: 'All members hold linked token for 3 days', reward: 100, type: 'hold', progress: 3, target: 3, expiresIn: '—', completed: true },
  { id: 'cm5', title: 'Token Factory', description: 'Club members create 3 new tokens', reward: 250, type: 'create', progress: 1, target: 3, expiresIn: '5d 20h', completed: false },
  { id: 'cm6', title: 'Volume King', description: 'Reach $20K club trading volume', reward: 500, type: 'trade', progress: 12400, target: 20000, expiresIn: '6d 2h', completed: false },
  { id: 'cm7', title: 'Social Blitz', description: 'Share 20 club posts on social media', reward: 80, type: 'invite', progress: 20, target: 20, expiresIn: '—', completed: true },
  { id: 'cm8', title: 'Arena Streak', description: 'Win 5 arena wars in a row', reward: 800, type: 'arena', progress: 2, target: 5, expiresIn: '6d 22h', completed: false },
];

type ClubLeaderRow = {
  rank: number;
  club: string;
  avatar: string;
  missions: number;
  points: number;
  members: number;
};

const MOCK_CLUB_LEADERS: ClubLeaderRow[] = [
  { rank: 1, club: 'Meme Lords', avatar: '👑', missions: 42, points: 8500, members: 1520 },
  { rank: 2, club: 'Degen Traders', avatar: '🦍', missions: 38, points: 7200, members: 678 },
  { rank: 3, club: 'PEPE Army', avatar: '🐸', missions: 35, points: 6800, members: 1245 },
  { rank: 4, club: 'SOL Maxis', avatar: '☀️', missions: 31, points: 5900, members: 856 },
  { rank: 5, club: 'Doge Pack', avatar: '🐕', missions: 28, points: 5200, members: 980 },
  { rank: 6, club: 'Anime Degens', avatar: '🎌', missions: 24, points: 4500, members: 567 },
  { rank: 7, club: 'FC Degens', avatar: '⚽', missions: 20, points: 3800, members: 432 },
  { rank: 8, club: 'Shitpost Elite', avatar: '💩', missions: 18, points: 3200, members: 345 },
];

const MISSION_ICON: Record<string, string> = {
  trade: '📊',
  invite: '📢',
  arena: '⚔️',
  hold: '💎',
  create: '🚀',
};

const PointsPage: React.FC = () => {
  const router = useRouter();
  const walletAddress = useMemo(() => {
    const v = router.query.address;
    return typeof v === 'string' ? v : '';
  }, [router.query.address]);

  // Tab from query param (?tab=trading|club)
  const activeTab = useMemo(() => {
    const t = router.query.tab;
    if (t === 'trading') return 'trading';
    if (t === 'club') return 'club';
    return 'daily';
  }, [router.query.tab]);

  const setTab = (tab: 'daily' | 'trading' | 'club') => {
    router.replace({ pathname: router.pathname, query: { ...router.query, tab } }, undefined, { shallow: true });
  };

  const [overview, setOverview] = useState<PointsOverviewResponse | null>(null);
  const [tierProg, setTierProg] = useState<TierProgress | null>(null);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(HISTORY_STEP);

  // Fake trading volume data (comment: remove when BE/API ready)
  const myVolume = 1580;  // fake — user's total trading volume in USD
  const myTrades = 23;    // fake — user's total trade count
  const myRank = 87;      // fake — user's leaderboard rank
  const myTradingPoints = 320; // fake — points earned from trading

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

  const fmtVol = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v}`;
  };

  return (
    <Layout>
      <SEO title={SEO_TEXT.POINTS_TITLE} description={SEO_TEXT.POINTS_DESC} />

      <div className="min-h-screen flex flex-col items-center py-8 sm:py-10">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-10 xl:px-16">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{SEO_TEXT.POINTS_TITLE}</h1>
              <p className="mt-2 text-sm opacity-80">Earn points from quests, trading, and events!</p>
              {walletAddress ? <div className="mt-2 text-xs opacity-60 break-all">Wallet: {walletAddress}</div> : null}
            </div>

            {/* Counters — different per tab */}
            <div className="text-right">
              {activeTab === 'daily' ? (
                <>
                  <div className="flex items-center justify-end gap-6">
                    <div>
                      <div className="text-sm opacity-80">Daily Points</div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                        {tierProg ? fmtNum(tierProg.points) : '\u2014'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm opacity-80">Tickets</div>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                        {overview ? fmtNum(overview.tickets) : '\u2014'}
                      </div>
                    </div>
                  </div>
                  {tierProg ? (
                    <div className="mt-2 text-xs opacity-70">
                      Current tier benefit: {fmtNum(tierProg.currentTier.tickets)} tickets
                    </div>
                  ) : null}
                </>
              ) : activeTab === 'trading' ? (
                <div className="flex items-center justify-end gap-6">
                  <div>
                    <div className="text-sm opacity-80">Trading Points</div>
                    <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                      {fmtNum(myTradingPoints)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Volume</div>
                    <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                      {fmtVol(myVolume)}
                    </div>
                  </div>
                </div>
              ) : (
                /* Club Mission counters — fake data (comment: replace with BE/API when ready) */
                <div className="flex items-center justify-end gap-6">
                  <div>
                    <div className="text-sm opacity-80">Club Points</div>
                    <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                      {fmtNum(myClubPoints)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">Missions</div>
                    <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--primary)]">
                      {myClubMissions}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ Tabs: Daily Point / Trading Volume Challenge ═══ */}
          <div className="flex bg-[var(--card2)] rounded-xl p-1 mb-6">
            {([
              { key: 'daily' as const, label: 'Daily Point', icon: <Gift size={16} /> },
              { key: 'trading' as const, label: 'Trading Volume', icon: <Trophy size={16} /> },
              { key: 'club' as const, label: 'Club Mission', icon: <Shield size={16} /> },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === key
                    ? 'text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                style={activeTab === key ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* ═══ Daily Point Tab ═══ */}
          {activeTab === 'daily' && (
            <>
              {/* Tier Progress */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
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

              {/* Go to Reward Spin */}
              <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <Gift size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--foreground)]">Spin to Win Rewards</span>
                    <p className="text-xs text-gray-400">Convert points → tickets → spin for SOL!</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/reward/${walletAddress}`)}
                  className="btn btn-primary px-4 py-2 text-sm font-semibold"
                >
                  Go to Rewards
                </button>
              </div>

              {/* History */}
              <div className="mt-6">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-0 overflow-hidden">
                  <div className="px-4 sm:px-6 py-6">
                    <div className="text-sm font-extrabold tracking-wide mb-1">{POINTS.POINT_HISTORY}</div>
                  </div>

                  <div className="border-t border-[var(--card-border)]">
                    <div className="w-full overflow-auto">
                      <table className="min-w-full text-xs sm:text-sm">
                        <thead className="bg-[var(--card)]">
                          <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-center [&>th]:font-extrabold [&>th]:text-xs">
                            <th className="min-w-[90px] sm:min-w-[140px]">DATE</th>
                            <th className="min-w-[120px] sm:min-w-[220px]">TYPE</th>
                            <th className="min-w-[80px] sm:min-w-[160px]">POINTS</th>
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
                                {"You'll see your point history here"}
                              </td>
                            </tr>
                          ) : (
                            visibleRows.map((r, idx) => (
                              <tr key={`${r.dateISO}-${idx}`} className="hover:bg-[var(--card-hover)]">
                                <td className="px-2 sm:px-4 py-3 text-center">{fmtDate(r.dateISO)}</td>
                                <td className="px-2 sm:px-4 py-3 text-center">{r.type || '—'}</td>
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
                      {POINTS.EMPTY_ENCOURAGE}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}

          {/* ═══ Trading Volume Challenge Tab ═══ */}
          {activeTab === 'trading' && (
            <>
              {/* My stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">My Volume</div>
                  <div className="text-2xl font-extrabold text-[var(--primary)]">{fmtVol(myVolume)}</div>
                </div>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">My Trades</div>
                  <div className="text-2xl font-extrabold text-[var(--primary)]">{myTrades}</div>
                </div>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">My Rank</div>
                  <div className="text-2xl font-extrabold text-[var(--primary)]">#{myRank}</div>
                </div>
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
                  <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Trading Points</div>
                  <div className="text-2xl font-extrabold text-[var(--primary)]">{fmtNum(myTradingPoints)}</div>
                </div>
              </div>

              {/* Milestones */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-[var(--primary)]" />
                  <span className="text-sm font-bold text-[var(--foreground)]">Volume Milestones</span>
                </div>
                <div className="space-y-3">
                  {MOCK_MILESTONES.map((m, i) => {
                    const pct = Math.min(100, (myVolume / m.target) * 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          m.completed ? 'bg-green-500/20' : 'bg-[var(--card2)]'
                        }`}>
                          {m.completed ? (
                            <Award size={14} className="text-green-400" />
                          ) : (
                            <span className="text-[10px] text-gray-500">{i + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={m.completed ? 'text-green-400 font-semibold' : 'text-gray-300'}>
                              {m.label} — {fmtVol(m.target)}
                            </span>
                            <span className="text-[var(--primary)] font-bold">{m.reward}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--card2)] border border-[var(--card-border)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundImage: m.completed
                                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                  : 'linear-gradient(90deg, var(--primary), var(--accent))',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Go to Reward Spin */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <Trophy size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--foreground)]">Lucky Wheel Spin</span>
                    <p className="text-xs text-gray-400">Spin the lucky wheel with your trading rewards!</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/reward/${walletAddress}?tab=wheel`)}
                  className="btn btn-primary px-4 py-2 text-sm font-semibold"
                >
                  Go to Wheel
                </button>
              </div>

              {/* Leaderboard */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-0 overflow-hidden">
                <div className="px-4 sm:px-6 py-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[var(--primary)]" />
                    <span className="text-sm font-extrabold tracking-wide">Volume Leaderboard</span>
                  </div>
                </div>

                <div className="border-t border-[var(--card-border)]">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="bg-[var(--card)]">
                        <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-center [&>th]:font-extrabold [&>th]:text-xs">
                          <th className="min-w-[50px]">RANK</th>
                          <th className="min-w-[120px]">WALLET</th>
                          <th className="min-w-[100px]">VOLUME</th>
                          <th className="min-w-[70px]">TRADES</th>
                          <th className="min-w-[80px]">REWARD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--card-border)]">
                        {MOCK_VOLUME_LEADERS.map((r) => (
                          <tr key={r.rank} className="hover:bg-[var(--card-hover)]">
                            <td className="px-2 sm:px-4 py-3 text-center">
                              {r.rank <= 3 ? (
                                <span className={`font-extrabold ${
                                  r.rank === 1 ? 'text-yellow-400' : r.rank === 2 ? 'text-gray-300' : 'text-orange-400'
                                }`}>
                                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'} #{r.rank}
                                </span>
                              ) : (
                                <span className="text-gray-400">#{r.rank}</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-center font-mono text-gray-300">{r.wallet}</td>
                            <td className="px-2 sm:px-4 py-3 text-center font-extrabold text-[var(--primary)]">{fmtVol(r.volume)}</td>
                            <td className="px-2 sm:px-4 py-3 text-center text-gray-400">{r.trades}</td>
                            <td className="px-2 sm:px-4 py-3 text-center text-green-400 font-semibold">{r.reward}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-center py-5 border-t border-[var(--card-border)]">
                  <button className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow">
                    Load more
                  </button>
                </div>
              </div>

              {/* Trading Point History (fake data — comment: remove when BE/API ready) */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-0 overflow-hidden mt-6">
                <div className="px-4 sm:px-6 py-5">
                  <div className="text-sm font-extrabold tracking-wide">Trading Point History</div>
                </div>
                <div className="border-t border-[var(--card-border)]">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="bg-[var(--card)]">
                        <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-center [&>th]:font-extrabold [&>th]:text-xs">
                          <th className="min-w-[90px]">DATE</th>
                          <th className="min-w-[120px]">ACTION</th>
                          <th className="min-w-[80px]">VOLUME</th>
                          <th className="min-w-[80px]">POINTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--card-border)]">
                        {/* fake rows — comment: replace with real API data */}
                        {[
                          { date: '2026-03-22', action: 'Buy DOGE', vol: '$120', pts: 24 },
                          { date: '2026-03-22', action: 'Sell PEPE', vol: '$85', pts: 17 },
                          { date: '2026-03-21', action: 'Buy BONK', vol: '$200', pts: 40 },
                          { date: '2026-03-21', action: 'Buy WIF', vol: '$150', pts: 30 },
                          { date: '2026-03-20', action: 'Sell DOGE', vol: '$95', pts: 19 },
                          { date: '2026-03-20', action: 'Buy SHIB', vol: '$310', pts: 62 },
                          { date: '2026-03-19', action: 'Sell BONK', vol: '$175', pts: 35 },
                          { date: '2026-03-19', action: 'Buy PEPE', vol: '$60', pts: 12 },
                          { date: '2026-03-18', action: 'Buy MEME', vol: '$250', pts: 50 },
                          { date: '2026-03-17', action: 'Sell WIF', vol: '$135', pts: 27 },
                        ].map((r, i) => (
                          <tr key={i} className="hover:bg-[var(--card-hover)]">
                            <td className="px-2 sm:px-4 py-3 text-center">{r.date}</td>
                            <td className="px-2 sm:px-4 py-3 text-center">{r.action}</td>
                            <td className="px-2 sm:px-4 py-3 text-center text-gray-300">{r.vol}</td>
                            <td className="px-4 py-3 text-center font-extrabold text-[var(--primary)]">+{r.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ═══ Club Mission Tab (fake data — comment: replace with BE/API when ready) ═══ */}
          {activeTab === 'club' && (
            <>
              {/* Club info banner */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🐸</span>
                    <div>
                      <div className="text-sm font-bold text-white">{myClubName}</div>
                      <div className="text-xs text-gray-400">Club Rank #{myClubRank} in Mission Leaderboard</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Points</div>
                      <div className="text-lg font-extrabold text-[var(--primary)]">{fmtNum(myClubPoints)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase">Completed</div>
                      <div className="text-lg font-extrabold text-green-400">{myClubMissions}/{MOCK_CLUB_MISSIONS.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Missions */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-[var(--primary)]" />
                  <span className="text-sm font-bold text-[var(--foreground)]">Weekly Missions</span>
                  <span className="ml-auto text-[10px] text-gray-500 flex items-center gap-1">
                    <Clock size={10} /> Resets weekly
                  </span>
                </div>
                <div className="space-y-3">
                  {MOCK_CLUB_MISSIONS.map((m) => {
                    const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                    return (
                      <div key={m.id} className={`rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-4 ${m.completed ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{MISSION_ICON[m.type] ?? '📋'}</span>
                            {m.completed
                              ? <CheckCircle2 size={14} className="text-green-400" />
                              : <Circle size={14} className="text-gray-500" />
                            }
                            <span className="text-sm font-bold text-white">{m.title}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary)]/20 text-[var(--primary)]">
                            +{m.reward} pts
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3 ml-8">{m.description}</p>
                        <div className="ml-8">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>{m.progress.toLocaleString()} / {m.target.toLocaleString()}</span>
                            <span>{m.completed ? 'Completed' : m.expiresIn + ' left'}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--card)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundImage: m.completed
                                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                  : 'linear-gradient(90deg, var(--primary), var(--accent))',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Go to Club Rewards */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <Trophy size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--foreground)]">Redeem Club Rewards</span>
                    <p className="text-xs text-gray-400">Use your club mission points for exclusive rewards!</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/reward/${walletAddress}?tab=club`)}
                  className="btn btn-primary px-4 py-2 text-sm font-semibold"
                >
                  Go to Rewards
                </button>
              </div>

              {/* Go to Club Page */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <Users size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[var(--foreground)]">View Club Missions</span>
                    <p className="text-xs text-gray-400">See all missions and progress in your club page</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/clubs/club_pepe')}
                  className="btn btn-primary px-4 py-2 text-sm font-semibold"
                >
                  Go to Club
                </button>
              </div>

              {/* Club Mission Leaderboard */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-0 overflow-hidden">
                <div className="px-4 sm:px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Swords size={16} className="text-[var(--primary)]" />
                    <span className="text-sm font-extrabold tracking-wide">Club Mission Leaderboard</span>
                  </div>
                </div>

                <div className="border-t border-[var(--card-border)]">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="bg-[var(--card)]">
                        <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-center [&>th]:font-extrabold [&>th]:text-xs">
                          <th className="min-w-[50px]">RANK</th>
                          <th className="min-w-[140px]">CLUB</th>
                          <th className="min-w-[80px]">MISSIONS</th>
                          <th className="min-w-[80px]">POINTS</th>
                          <th className="min-w-[80px]">MEMBERS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--card-border)]">
                        {MOCK_CLUB_LEADERS.map((r) => (
                          <tr key={r.rank} className={`hover:bg-[var(--card-hover)] ${r.club === myClubName ? 'bg-[var(--primary)]/5' : ''}`}>
                            <td className="px-2 sm:px-4 py-3 text-center">
                              {r.rank <= 3 ? (
                                <span className={`font-extrabold ${
                                  r.rank === 1 ? 'text-yellow-400' : r.rank === 2 ? 'text-gray-300' : 'text-orange-400'
                                }`}>
                                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'} #{r.rank}
                                </span>
                              ) : (
                                <span className="text-gray-400">#{r.rank}</span>
                              )}
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-center">
                              <span className="mr-1">{r.avatar}</span>
                              <span className={`font-semibold ${r.club === myClubName ? 'text-[var(--primary)]' : 'text-gray-300'}`}>{r.club}</span>
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-center font-bold text-green-400">{r.missions}</td>
                            <td className="px-2 sm:px-4 py-3 text-center font-extrabold text-[var(--primary)]">{fmtNum(r.points)}</td>
                            <td className="px-2 sm:px-4 py-3 text-center text-gray-400">{r.members.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Club Point History (fake data) */}
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-0 overflow-hidden mt-6">
                <div className="px-4 sm:px-6 py-5">
                  <div className="text-sm font-extrabold tracking-wide">Club Point History</div>
                </div>
                <div className="border-t border-[var(--card-border)]">
                  <div className="w-full overflow-auto">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="bg-[var(--card)]">
                        <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-center [&>th]:font-extrabold [&>th]:text-xs">
                          <th className="min-w-[90px]">DATE</th>
                          <th className="min-w-[150px]">MISSION</th>
                          <th className="min-w-[80px]">STATUS</th>
                          <th className="min-w-[80px]">POINTS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--card-border)]">
                        {/* fake rows — comment: replace with real API data */}
                        {[
                          { date: '2026-03-22', mission: 'Recruit New Blood', status: 'Completed', pts: 150 },
                          { date: '2026-03-21', mission: 'Diamond Grip', status: 'Completed', pts: 100 },
                          { date: '2026-03-21', mission: 'Social Blitz', status: 'Completed', pts: 80 },
                          { date: '2026-03-20', mission: 'Club Trading Sprint', status: 'Completed', pts: 200 },
                          { date: '2026-03-19', mission: 'Arena Streak (Partial)', status: 'Bonus', pts: 50 },
                          { date: '2026-03-18', mission: 'Token Factory', status: 'Completed', pts: 250 },
                          { date: '2026-03-17', mission: 'Volume King', status: 'Completed', pts: 500 },
                          { date: '2026-03-16', mission: 'Weekly Bonus', status: 'Bonus', pts: 120 },
                        ].map((r, i) => (
                          <tr key={i} className="hover:bg-[var(--card-hover)]">
                            <td className="px-2 sm:px-4 py-3 text-center">{r.date}</td>
                            <td className="px-2 sm:px-4 py-3 text-center text-gray-300">{r.mission}</td>
                            <td className="px-2 sm:px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'Completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-extrabold text-[var(--primary)]">+{r.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PointsPage;