// src/pages/profile/[address].tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { useWallet } from '@solana/wallet-adapter-react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import LoadingBar from '@/components/ui/LoadingBar';

import { getProfileInfo, getProfileStats, getTokenInfo, getTokensByCreator } from '@/utils/api.index';
import { formatAddressV2 } from '@/utils/blockchainUtils';

import { Check, Copy, Wallet, Twitter, Send as TelegramIcon, Facebook, Pencil, X, Lock, Camera, Mail, Swords, Bell, TrendingUp, TrendingDown, Trophy, Clock, Gift, AlertCircle, CheckCircle2, Info } from 'lucide-react';

import { COMMON, SEO as SEO_TEXT, PROFILE } from '@/constants/ui-text';

/* =========================
   Helpers
========================= */
function getQueryAddress(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0] ?? '';
  return '';
}

function normalizeImageUrl(input?: string | null): string {
  const s = (input || '').trim();
  if (!s) return '';
  if (s.startsWith('/')) return s;

  if (s.startsWith('ipfs://')) {
    const rest = s.replace('ipfs://', '');
    const cid = rest.startsWith('ipfs/') ? rest.slice('ipfs/'.length) : rest;
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return s;
}

function formatMonthYear(input?: string | null) {
  const s = String(input ?? '').trim();
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function timeAgo(input?: string | null) {
  const s = String(input ?? '').trim();
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;

  const diff = Date.now() - d.getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day} day${day > 1 ? 's' : ''} ago`;
  if (hr > 0) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  if (min > 0) return `${min} min${min > 1 ? 's' : ''} ago`;
  return 'just now';
}

function fmtCompact(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '$0';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

/* =========================
   Types
========================= */
type ProfileInfo = Awaited<ReturnType<typeof getProfileInfo>>;
type ProfileStats = Awaited<ReturnType<typeof getProfileStats>>;

type TabKey = 'profile' | 'holding' | 'created' | 'history' | 'arena' | 'notifications';

type TokenMini = {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  marketCap?: number;
  holders?: number;
  volume24h?: number;
  createdAt?: string;
  status?: string; // 'active' | 'graduated' etc.
};

const LIST_STEP = 10;

/* =========================
   Fake Arena History Data
   // fake — replace with BE/API when ready
========================= */
const MOCK_ARENA_HISTORY = [
  { id: 'a1', arena: 'BTC vs ETH — Weekly Showdown', pick: 'BTC', result: 'win', amount: 0.5, payout: 0.95, date: '2026-03-21T14:30:00Z', status: 'settled' },
  { id: 'a2', arena: 'SOL Pump or Dump?', pick: 'Pump', result: 'win', amount: 1.2, payout: 2.16, date: '2026-03-20T09:15:00Z', status: 'settled' },
  { id: 'a3', arena: 'DOGE to $1 This Month?', pick: 'No', result: 'loss', amount: 0.3, payout: 0, date: '2026-03-19T18:00:00Z', status: 'settled' },
  { id: 'a4', arena: 'Memecoin Madness — PEPE vs BONK', pick: 'PEPE', result: 'pending', amount: 0.8, payout: 0, date: '2026-03-22T10:00:00Z', status: 'live' },
  { id: 'a5', arena: 'ETH Merge Anniversary Pump?', pick: 'Yes', result: 'win', amount: 2.0, payout: 3.6, date: '2026-03-18T12:00:00Z', status: 'settled' },
  { id: 'a6', arena: 'NFT Market Recovery Bet', pick: 'Bullish', result: 'loss', amount: 0.4, payout: 0, date: '2026-03-17T16:45:00Z', status: 'settled' },
  { id: 'a7', arena: 'SOL vs AVAX — 24h Volume', pick: 'SOL', result: 'win', amount: 1.5, payout: 2.7, date: '2026-03-16T08:30:00Z', status: 'settled' },
  { id: 'a8', arena: 'BTC $100K Before April?', pick: 'Yes', result: 'pending', amount: 3.0, payout: 0, date: '2026-03-22T06:00:00Z', status: 'live' },
  { id: 'a9', arena: 'AI Token Battle — FET vs RNDR', pick: 'FET', result: 'loss', amount: 0.6, payout: 0, date: '2026-03-15T20:00:00Z', status: 'settled' },
  { id: 'a10', arena: 'Weekend Pump Challenge', pick: 'PUMP', result: 'win', amount: 0.25, payout: 0.5, date: '2026-03-14T22:00:00Z', status: 'settled' },
  { id: 'a11', arena: 'Layer 2 Wars — ARB vs OP', pick: 'ARB', result: 'win', amount: 1.0, payout: 1.85, date: '2026-03-13T11:00:00Z', status: 'settled' },
  { id: 'a12', arena: 'Stablecoin Depeg Scare', pick: 'No Depeg', result: 'win', amount: 5.0, payout: 7.5, date: '2026-03-12T07:00:00Z', status: 'settled' },
];

/* =========================
   Fake Notification Data
   // fake — replace with BE/API when ready
========================= */
const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'reward' as const, title: 'Spin Reward Claimed!', message: 'You claimed 0.05 SOL from the Lucky Wheel.', date: '2026-03-22T11:30:00Z', read: false },
  { id: 'n2', type: 'arena' as const, title: 'Arena Bet Won!', message: 'Your bet on "BTC vs ETH" settled — you won 0.95 SOL!', date: '2026-03-21T14:35:00Z', read: false },
  { id: 'n3', type: 'system' as const, title: 'New Event: Meme Token Showdown', message: 'A new arena event is starting soon. Join now to earn bonus points!', date: '2026-03-21T10:00:00Z', read: false },
  { id: 'n4', type: 'trade' as const, title: 'Buy Order Filled', message: 'Your buy order for 1,000 PEPE tokens has been filled.', date: '2026-03-20T16:20:00Z', read: true },
  { id: 'n5', type: 'points' as const, title: 'Daily Points Earned', message: 'You earned 50 Seed Points for today\'s trading activity.', date: '2026-03-20T09:00:00Z', read: true },
  { id: 'n6', type: 'arena' as const, title: 'Arena Bet Lost', message: 'Your bet on "DOGE to $1" did not win. Better luck next time!', date: '2026-03-19T18:05:00Z', read: true },
  { id: 'n7', type: 'reward' as const, title: 'Tickets Converted', message: 'You converted 500 points into 5 spin tickets.', date: '2026-03-19T12:00:00Z', read: true },
  { id: 'n8', type: 'system' as const, title: 'Profile Updated', message: 'Your profile information has been updated successfully.', date: '2026-03-18T15:30:00Z', read: true },
  { id: 'n9', type: 'trade' as const, title: 'Sell Order Filled', message: 'Your sell order for 500 BONK tokens has been filled.', date: '2026-03-18T10:45:00Z', read: true },
  { id: 'n10', type: 'points' as const, title: 'Trading Volume Milestone!', message: 'You reached $1,000 trading volume — 100 bonus points!', date: '2026-03-17T14:00:00Z', read: true },
  { id: 'n11', type: 'arena' as const, title: 'Arena Bet Won!', message: 'Your bet on "SOL vs AVAX" settled — you won 2.7 SOL!', date: '2026-03-16T08:35:00Z', read: true },
  { id: 'n12', type: 'system' as const, title: 'Welcome to Pumpfun Clone!', message: 'Thanks for joining! Explore Arena, Spin the Wheel, and start trading.', date: '2026-03-10T00:00:00Z', read: true },
];

// fake — unread count for navbar badge
export const UNREAD_NOTIFICATION_COUNT = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

const NOTIF_ICON_MAP = {
  reward: Gift,
  arena: Swords,
  system: Info,
  trade: TrendingUp,
  points: Trophy,
} as const;

const NOTIF_COLOR_MAP = {
  reward: 'text-yellow-400',
  arena: 'text-[var(--primary)]',
  system: 'text-blue-400',
  trade: 'text-[var(--accent)]',
  points: 'text-purple-400',
} as const;

const StatTile: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex-1 min-w-[180px] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5 shadow-sm">
    <div className="text-xs opacity-80">{label}</div>
    <div className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--primary)]">{value}</div>
  </div>
);

const TabButton: React.FC<{ active: boolean; title: string; onClick: () => void }> = ({
  active,
  title,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide transition-colors border ${
      active
        ? 'btn btn-primary border-transparent text-white'
        : 'btn btn-primary border-transparent text-white opacity-85 hover:opacity-100'
    }`}
  >
    {title}
  </button>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden shadow-sm">
    <div className="px-4 sm:px-6 py-4 border-b border-[var(--card-border)] text-sm font-extrabold tracking-wide text-[var(--primary)]">
      {title}
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { publicKey } = useWallet();

  const connectedAddress = useMemo(() => publicKey?.toBase58() || '', [publicKey]);
  const profileAddress = getQueryAddress(router.query.address);
  const addressToUse = (profileAddress || connectedAddress || '').trim();

  const isOwner =
    !!connectedAddress && !!addressToUse && connectedAddress.toLowerCase() === addressToUse.toLowerCase();

  const [tab, setTab] = useState<TabKey>('profile');

  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [loadingHeader, setLoadingHeader] = useState(false);

  const [copied, setCopied] = useState(false);

  const [holdingTokens, setHoldingTokens] = useState<TokenMini[]>([]);
  const [loadingHolding, setLoadingHolding] = useState(false);

  const [createdTokens, setCreatedTokens] = useState<TokenMini[]>([]);
  const [loadingCreated, setLoadingCreated] = useState(false);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [tokenMetaMap, setTokenMetaMap] = useState<Record<string, TokenMini>>({});

  const [visibleHoldingCount, setVisibleHoldingCount] = useState(LIST_STEP);
  const [visibleCreatedCount, setVisibleCreatedCount] = useState(LIST_STEP);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(LIST_STEP);
  const [visibleArenaCount, setVisibleArenaCount] = useState(LIST_STEP);
  const [visibleNotifCount, setVisibleNotifCount] = useState(LIST_STEP);

  const [showEditModal, setShowEditModal] = useState(false);
  // Track arena opt-in per token address
  const [arenaMap, setArenaMap] = useState<Record<string, boolean>>({});
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    twitter: '',
    telegram: '',
    email: '',
    isPublic: true,
  });

  const avatarSrc = useMemo(() => {
    const raw = (profileInfo as any)?.avatarUrl || (profileInfo as any)?.avatar || '';
    return normalizeImageUrl(raw);
  }, [profileInfo]);

  const username = profileInfo?.username ? String(profileInfo.username) : 'Anonymous';
  const joinedAt = (profileInfo as any)?.joinedAt ?? '';
  const memberSince = formatMonthYear(joinedAt);

  const tokensCreatedTile = useMemo(() => {
    const value = Number((profileInfo as any)?.totalTokensCreated ?? 0);
    return Number.isFinite(value) ? value.toLocaleString() : '0';
  }, [profileInfo]);

  const totalTrades = useMemo(() => {
    const infoBought = Number((profileInfo as any)?.totalTokensBought ?? 0);
    const infoSold = Number((profileInfo as any)?.totalTokensSold ?? 0);
    const infoSum = infoBought + infoSold;
    if (Number.isFinite(infoSum) && infoSum > 0) return infoSum;

    const buys = Number((profileStats as any)?.totalBuys ?? 0);
    const sells = Number((profileStats as any)?.totalSells ?? 0);
    const sum = buys + sells;
    return Number.isFinite(sum) ? sum : 0;
  }, [profileInfo, profileStats]);

  const portfolioValue = '—';

  const onCopyAddress = async () => {
    if (!addressToUse) return;
    try {
      await navigator.clipboard.writeText(addressToUse);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const fetchHeaderData = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;

    setLoadingHeader(true);
    try {
      const [info, stats] = await Promise.all([getProfileInfo(walletAddress), getProfileStats(walletAddress)]);
      console.log('[Profile] info:', JSON.stringify(info));
      console.log('[Profile] stats:', JSON.stringify(stats));
      const avatarRaw = (info as any)?.avatar || '';
      setProfileInfo({
        ...info,
        avatar: normalizeImageUrl(avatarRaw),
        avatarUrl: normalizeImageUrl(avatarRaw),
      } as any);
      setProfileStats(stats as any);
    } catch (e) {
      console.error('Error fetching profile:', e);
      toast.error('Failed to load profile data');
      setProfileInfo(null);
      setProfileStats(null);
    } finally {
      setLoadingHeader(false);
    }
  }, []);

  const fetchHolding = useCallback(async (stats: any) => {
    const addrs: string[] = Array.isArray(stats?.favoriteTokens) ? stats.favoriteTokens.filter(Boolean).map(String) : [];
    if (addrs.length === 0) {
      setHoldingTokens([]);
      return;
    }

    setLoadingHolding(true);
    try {
      const unique = Array.from(new Set(addrs)).slice(0, 100);
      const infos = await Promise.allSettled(unique.map((a) => getTokenInfo(a)));

      const list: TokenMini[] = infos
        .map((r, i) => {
          if (r.status !== 'fulfilled') return null;
          const d: any = r.value;
          return {
            address: unique[i],
            name: String(d?.name ?? 'Unknown'),
            symbol: String(d?.symbol ?? '—'),
            logo: normalizeImageUrl(d?.logo),
            marketCap: typeof d?.marketCap === 'number' ? d.marketCap : undefined,
            holders: typeof d?.holders === 'number' ? d.holders : undefined,
          } as TokenMini;
        })
        .filter(Boolean) as TokenMini[];

      setHoldingTokens(list);
    } catch (e) {
      console.error('holding hydrate failed', e);
      setHoldingTokens([]);
    } finally {
      setLoadingHolding(false);
    }
  }, []);

  const fetchCreated = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    setLoadingCreated(true);
    try {
      const res = await getTokensByCreator(walletAddress, 1, 100);
      const list: TokenMini[] = (res.tokens || []).map((t: any) => ({
        address: String(t.address ?? ''),
        name: String(t.name ?? 'Unknown'),
        symbol: String(t.symbol ?? '—'),
        logo: normalizeImageUrl(t.logo),
        marketCap: typeof t.marketCap === 'number' ? t.marketCap : undefined,
        holders: typeof t.holders === 'number' ? t.holders : (typeof t.holderCount === 'number' ? t.holderCount : undefined),
        volume24h: typeof t.volume24h === 'number' ? t.volume24h : (typeof t.vol24h === 'number' ? t.vol24h : undefined),
        createdAt: t.createdAt ? String(t.createdAt) : undefined,
        status: t.status ? String(t.status) : undefined,
      }));
      // TODO: Remove mock data when BE returns real created tokens
      if (list.length === 0) {
        list.push({
          address: 'MockToken111111111111111111111111111111111',
          name: 'My First Token',
          symbol: 'MFT',
          logo: '',
          marketCap: 45200,
          holders: 234,
          volume24h: 12800,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Active',
        });
      }
      // END mock data
      setCreatedTokens(list);
    } catch (e) {
      console.error('created tokens fetch failed', e);
      setCreatedTokens([]);
    } finally {
      setLoadingCreated(false);
    }
  }, []);

  const fetchHistoryMeta = useCallback(async (stats: any) => {
    const acts: any[] = Array.isArray(stats?.recentActivities) ? stats.recentActivities : [];
    const addrs = acts.map((a) => String(a?.tokenAddress ?? '').trim()).filter(Boolean);
    const unique = Array.from(new Set(addrs)).slice(0, 100);

    if (unique.length === 0) {
      setTokenMetaMap({});
      return;
    }

    setHistoryLoading(true);
    try {
      const infos = await Promise.allSettled(unique.map((a) => getTokenInfo(a)));

      const map: Record<string, TokenMini> = {};
      infos.forEach((r, idx) => {
        const addr = unique[idx];
        if (r.status !== 'fulfilled') return;
        const d: any = r.value;
        map[addr] = {
          address: addr,
          name: String(d?.name ?? 'Unknown'),
          symbol: String(d?.symbol ?? '—'),
          logo: normalizeImageUrl(d?.logo),
          marketCap: typeof d?.marketCap === 'number' ? d.marketCap : undefined,
          holders: typeof d?.holders === 'number' ? d.holders : undefined,
        };
      });

      setTokenMetaMap(map);
    } catch (e) {
      console.error('history hydrate failed', e);
      setTokenMetaMap({});
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!addressToUse) return;
    fetchHeaderData(addressToUse);
    fetchCreated(addressToUse);
  }, [addressToUse, fetchHeaderData, fetchCreated]);

  useEffect(() => {
    if (!profileStats) return;
    fetchHolding(profileStats);
    fetchHistoryMeta(profileStats);
  }, [profileStats, fetchHolding, fetchHistoryMeta]);

  useEffect(() => {
    setTab('profile');
    setVisibleHoldingCount(LIST_STEP);
    setVisibleCreatedCount(LIST_STEP);
    setVisibleHistoryCount(LIST_STEP);
  }, [addressToUse]);

  // Populate edit form when modal opens
  useEffect(() => {
    if (showEditModal && profileInfo) {
      setEditForm({
        displayName: String((profileInfo as any)?.displayName ?? (profileInfo as any)?.name ?? ''),
        bio: String(profileInfo?.bio ?? ''),
        twitter: String((profileInfo as any)?.twitter ?? ''),
        telegram: String((profileInfo as any)?.telegram ?? ''),
        email: String((profileInfo as any)?.email ?? ''),
        isPublic: (profileInfo as any)?.isPublic !== false,
      });
    }
  }, [showEditModal, profileInfo]);

  const recentActivities: any[] = useMemo(() => {
    const acts: any[] = Array.isArray((profileStats as any)?.recentActivities) ? (profileStats as any).recentActivities : [];
    return acts;
  }, [profileStats]);

  const visibleHoldingTokens = useMemo(
    () => holdingTokens.slice(0, visibleHoldingCount),
    [holdingTokens, visibleHoldingCount]
  );

  const visibleRecentActivities = useMemo(
    () => recentActivities.slice(0, visibleHistoryCount),
    [recentActivities, visibleHistoryCount]
  );

  const visibleCreatedTokens = useMemo(
    () => createdTokens.slice(0, visibleCreatedCount),
    [createdTokens, visibleCreatedCount]
  );

  const hasMoreHolding = visibleHoldingCount < holdingTokens.length;
  const hasMoreCreated = visibleCreatedCount < createdTokens.length;
  const hasMoreHistory = visibleHistoryCount < recentActivities.length;

  return (
    <Layout>
      <SEO
        title={`${addressToUse ? `${SEO_TEXT.PROFILE_TITLE}: ${formatAddressV2(addressToUse)}` : SEO_TEXT.PROFILE_TITLE} - PumpFun Clone`}
        description={SEO_TEXT.PROFILE_DESC}
        image="seo/profile.jpg"
      />

      <div className="min-h-screen flex flex-col items-center justify-start py-10">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
          <div className="w-full mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-left text-[var(--primary)]">
              {SEO_TEXT.PROFILE_TITLE}
            </h1>
          </div>

          {/* Header */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm">
            {loadingHeader ? (
              <div className="flex justify-center py-6">
                <LoadingBar size="medium" />
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[var(--card2)] border border-[var(--card-border)] flex items-center justify-center shrink-0">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt="avatar"
                      fill
                      sizes="56px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-sm font-extrabold opacity-80">
                      {String(username || 'A').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl font-extrabold tracking-tight truncate">
                    {username}
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-sm opacity-80 min-w-0">
                    <Wallet className="w-4 h-4 opacity-70 shrink-0" />
                    <span className="font-mono truncate">{addressToUse ? formatAddressV2(addressToUse) : '—'}</span>

                    {addressToUse ? (
                      <button
                        onClick={onCopyAddress}
                        className="ml-1 px-2.5 py-1 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] hover:bg-[var(--card-hover)] transition-colors"
                        title="Copy address"
                      >
                        {copied ? <Check className="w-4 h-4 text-[var(--accent)]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    ) : null}
                  </div>

                  {profileInfo?.bio ? (
                      <div className="mt-2 text-sm opacity-80 break-words overflow-hidden" title={String(profileInfo.bio)}>
                        {String(profileInfo.bio).length > 50
                          ? `${String(profileInfo.bio).slice(0, 50)}...`
                          : String(profileInfo.bio)}
                      </div>
                    ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5 mt-5">
            <StatTile label={PROFILE.PORTFOLIO_VALUE} value={portfolioValue} />
            <StatTile label={PROFILE.TOKENS_CREATED} value={loadingHeader ? '—' : tokensCreatedTile} />
            <StatTile label={PROFILE.TOTAL_TRADES} value={loadingHeader ? '—' : String(totalTrades)} />
            <StatTile label={PROFILE.MEMBER_SINCE} value={loadingHeader ? '—' : memberSince} />
          </div>

          {/* Tabs */}
          <div className="mt-5 flex flex-wrap gap-2">
            <TabButton active={tab === 'profile'} title={PROFILE.TAB_PROFILE} onClick={() => setTab('profile')} />
            <TabButton active={tab === 'holding'} title={PROFILE.TAB_HOLDING} onClick={() => setTab('holding')} />
            <TabButton active={tab === 'created'} title={PROFILE.TAB_CREATED} onClick={() => setTab('created')} />
            <TabButton active={tab === 'history'} title={PROFILE.TAB_HISTORY} onClick={() => setTab('history')} />
            <TabButton active={tab === 'arena'} title="Arena History" onClick={() => setTab('arena')} />
            <button
              onClick={() => setTab('notifications')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold tracking-wide transition-colors border flex items-center gap-2 ${
                tab === 'notifications'
                  ? 'btn btn-primary border-transparent text-white'
                  : 'btn btn-primary border-transparent text-white opacity-85 hover:opacity-100'
              }`}
            >
              Notifications
              {UNREAD_NOTIFICATION_COUNT > 0 && (
                <span className="relative flex items-center">
                  <Bell className="w-4 h-4 notification-bell-shake" />
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold leading-none">
                    {UNREAD_NOTIFICATION_COUNT}
                  </span>
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="mt-5 space-y-4">
            {tab === 'profile' && (
              <>
                <SectionCard title="Basic Information">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs opacity-70">Username</div>
                      <div className="font-semibold mt-1">{username}</div>
                    </div>

                    <div>
                      <div className="text-xs opacity-70">Member Since</div>
                      <div className="opacity-90 mt-1">{memberSince}</div>
                    </div>
                  </div>

                  {profileInfo?.bio && (
                    <div className="mt-4 pt-4 border-t border-[var(--card-border)] text-sm">
                      <div className="text-xs opacity-70 mb-1">Bio</div>
                      <div className="opacity-90 leading-relaxed whitespace-pre-line break-words overflow-hidden">
                        {String(profileInfo.bio).length > 200
                          ? `${String(profileInfo.bio).slice(0, 200)}...`
                          : String(profileInfo.bio)}
                      </div>
                    </div>
                  )}

                  {/* Social Links */}
                  <div className="mt-4 pt-4 border-t border-[var(--card-border)] text-sm">
                    <div className="text-xs opacity-70 mb-2">Social Links</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card2)]">
                        <Twitter className="w-4 h-4 text-[var(--primary)] shrink-0" />
                        <span className="text-sm truncate">
                          {(profileInfo as any)?.twitter ? (
                            <a href={String((profileInfo as any).twitter)} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)] transition-colors">
                              {String((profileInfo as any).twitter).replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                          ) : (
                            <span className="opacity-40">Not set</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card2)]">
                        <TelegramIcon className="w-4 h-4 text-[var(--primary)] shrink-0" />
                        <span className="text-sm truncate">
                          {(profileInfo as any)?.telegram ? (
                            <a href={String((profileInfo as any).telegram)} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)] transition-colors">
                              {String((profileInfo as any).telegram).replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                          ) : (
                            <span className="opacity-40">Not set</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card2)]">
                        <Facebook className="w-4 h-4 text-[var(--primary)] shrink-0" />
                        <span className="text-sm truncate">
                          {(profileInfo as any)?.facebook ? (
                            <a href={String((profileInfo as any).facebook)} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)] transition-colors">
                              {String((profileInfo as any).facebook).replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                          ) : (
                            <span className="opacity-40">Not set</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Privacy */}
                  <div className="mt-4 pt-4 border-t border-[var(--card-border)] text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Privacy</div>
                        <div className="text-xs opacity-70 mt-0.5">
                          {(profileInfo as any)?.isPublic !== false ? 'Anyone can view your profile' : 'Your profile is private'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium opacity-70">
                          {(profileInfo as any)?.isPublic !== false ? 'Public' : 'Private'}
                        </span>
                        <div className="relative shrink-0 cursor-default" style={{ width: 36, height: 20 }}>
                          <span
                            className="absolute inset-0 rounded-full"
                            style={(profileInfo as any)?.isPublic !== false
                              ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }
                              : { backgroundColor: 'var(--card2)', border: '1px solid var(--card-border)' }}
                          />
                          <span
                            className="absolute rounded-full bg-white shadow"
                            style={{
                              width: 16,
                              height: 16,
                              top: 2,
                              left: (profileInfo as any)?.isPublic !== false ? 18 : 2,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Edit button */}
                  {isOwner && (
                    <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(true)}
                        className="btn btn-primary w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-4 h-4" />
                        Edit Profile
                      </button>
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Wallet Information">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs opacity-70">Wallet Address</div>
                        <div className="font-mono truncate">{addressToUse || '—'}</div>
                      </div>
                      {addressToUse ? (
                        <button
                          onClick={onCopyAddress}
                          className="px-4 py-2.5 rounded-xl font-extrabold border border-[var(--card-border)] bg-[var(--card2)] hover:bg-[var(--card-hover)] transition-colors"
                        >
                          {copied ? 'COPIED' : 'COPY'}
                        </button>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3">
                        <div className="text-xs opacity-70">Total Buys</div>
                        <div className="font-extrabold">{String((profileStats as any)?.totalBuys ?? (profileInfo as any)?.totalTokensBought ?? 0)}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3">
                        <div className="text-xs opacity-70">Total Sells</div>
                        <div className="font-extrabold">{String((profileStats as any)?.totalSells ?? (profileInfo as any)?.totalTokensSold ?? 0)}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3">
                        <div className="text-xs opacity-70">Total Volume (SOL)</div>
                        <div className="font-extrabold">{String((profileStats as any)?.totalVolumeSOL ?? 0)}</div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </>
            )}

            {tab === 'holding' && (
              <SectionCard title={PROFILE.TAB_HOLDING}>
                {/* Portfolio Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-4">
                    <div className="text-xs opacity-70">Total Value</div>
                    <div className="mt-2 text-xl font-extrabold text-[var(--primary)]">
                      {(profileStats as any)?.totalValue != null ? `$${Number((profileStats as any).totalValue).toLocaleString()}` : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-4">
                    <div className="text-xs opacity-70">24h Change</div>
                    <div className="mt-2 text-xl font-extrabold text-[var(--primary)]">
                      {(profileStats as any)?.change24h != null
                        ? `${Number((profileStats as any).change24h) >= 0 ? '+' : ''}$${Math.abs(Number((profileStats as any).change24h)).toLocaleString()}`
                        : '—'}
                    </div>
                    {(profileStats as any)?.change24hPct != null && (
                      <div className="text-xs text-[var(--accent)] mt-0.5">
                        {Number((profileStats as any).change24hPct) >= 0 ? '+' : ''}{Number((profileStats as any).change24hPct).toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-4">
                    <div className="text-xs opacity-70">Total P&L</div>
                    <div className="mt-2 text-xl font-extrabold text-[var(--primary)]">
                      {(profileStats as any)?.totalPnl != null
                        ? `${Number((profileStats as any).totalPnl) >= 0 ? '+' : ''}$${Math.abs(Number((profileStats as any).totalPnl)).toLocaleString()}`
                        : '—'}
                    </div>
                    {(profileStats as any)?.totalPnlPct != null && (
                      <div className="text-xs text-[var(--accent)] mt-0.5">
                        {Number((profileStats as any).totalPnlPct) >= 0 ? '+' : ''}{Number((profileStats as any).totalPnlPct).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {loadingHolding ? (
                  <div className="flex justify-center py-6">
                    <LoadingBar size="medium" />
                  </div>
                ) : holdingTokens.length === 0 ? (
                  <div className="text-sm opacity-70 text-center py-4">{PROFILE.NO_HOLDING}</div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {visibleHoldingTokens.map((t) => (
                        <button
                          key={t.address}
                          onClick={() => router.push(`/token/${t.address}`)}
                          className="w-full text-left rounded-2xl border border-[var(--card-border)] bg-[var(--card2)] hover:bg-[var(--card-hover)] transition-colors p-4 flex items-center gap-4"
                        >
                          <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)] shrink-0">
                            {t.logo ? (
                              <Image
                                src={t.logo}
                                alt={t.symbol}
                                fill
                                sizes="48px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : null}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-extrabold truncate">{t.name}</div>
                            <div className="text-xs opacity-70 truncate">{t.symbol}</div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs opacity-70">Market Cap</div>
                            <div className="font-extrabold">
                              {typeof t.marketCap === 'number' ? `$${t.marketCap.toLocaleString()}` : '—'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {hasMoreHolding ? (
                      <div className="flex justify-center mt-8">
                        <button
                          type="button"
                          onClick={() => setVisibleHoldingCount((prev) => Math.min(prev + LIST_STEP, holdingTokens.length))}
                          className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                        >
                          Load more
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </SectionCard>
            )}

            {tab === 'created' && (
              <SectionCard title={PROFILE.TAB_CREATED}>
                {loadingCreated ? (
                  <div className="flex justify-center py-6">
                    <LoadingBar size="medium" />
                  </div>
                ) : createdTokens.length === 0 ? (
                  <div className="text-sm opacity-70 text-center py-4">{PROFILE.NO_CREATED}</div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {visibleCreatedTokens.map((t) => {
                        const statusLabel = t.status || '';
                        const isGraduated = statusLabel.toLowerCase() === 'graduated';
                        return (
                          <div
                            key={t.address}
                            className="rounded-2xl border border-[var(--card-border)] bg-[var(--card2)] hover:bg-[var(--card-hover)] transition-colors p-4"
                          >
                            <div className="flex items-center gap-4">
                              {/* Logo */}
                              <button
                                type="button"
                                onClick={() => router.push(`/token/${t.address}`)}
                                className="relative w-12 h-12 rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)] shrink-0"
                              >
                                {t.logo ? (
                                  <Image src={t.logo} alt={t.symbol} fill sizes="48px" className="object-cover" unoptimized />
                                ) : null}
                              </button>

                              {/* Info */}
                              <button
                                type="button"
                                onClick={() => router.push(`/token/${t.address}`)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <div className="font-extrabold truncate">{t.name}</div>
                                <div className="text-xs opacity-70 truncate">{t.symbol}</div>
                                <div className="text-xs opacity-50 mt-0.5">
                                  {t.createdAt ? `Created: ${timeAgo(t.createdAt)}` : ''}
                                  {statusLabel && (
                                    <span className={`ml-2 font-semibold ${isGraduated ? 'text-[var(--primary)]' : 'text-[var(--accent)]'}`}>
                                      • {statusLabel}
                                    </span>
                                  )}
                                </div>
                              </button>

                              {/* Stats */}
                              <div className="text-right shrink-0 space-y-0.5">
                                <div className="font-extrabold text-sm">
                                  MC: {typeof t.marketCap === 'number' ? fmtCompact(t.marketCap) : '—'}
                                </div>
                                <div className="text-xs opacity-70">
                                  {typeof t.holders === 'number' ? `${t.holders.toLocaleString()} holders` : ''}
                                </div>
                                <div className="text-xs opacity-70">
                                  {typeof t.volume24h === 'number' ? `Vol: ${fmtCompact(t.volume24h)}` : ''}
                                </div>
                              </div>
                            </div>

                            {/* Join Arena toggle */}
                            <div className="mt-3 pt-3 border-t border-[var(--card-border)] flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold">Join Arena</div>
                                <div className="text-xs opacity-50">
                                  {arenaMap[t.address] ? 'Available for arena matching' : 'Not participating in arena'}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setArenaMap((prev) => ({ ...prev, [t.address]: !prev[t.address] }));
                                  // TODO: integrate with Arena API when available
                                  toast.info(arenaMap[t.address] ? 'Left arena matching' : 'Joined arena matching');
                                }}
                                className="relative shrink-0"
                                style={{ width: 36, height: 20 }}
                              >
                                <span
                                  className="absolute inset-0 rounded-full transition-colors"
                                  style={arenaMap[t.address]
                                    ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }
                                    : { backgroundColor: 'var(--card)', border: '1px solid var(--card-border)' }}
                                />
                                <span
                                  className="absolute rounded-full bg-white shadow transition-transform"
                                  style={{
                                    width: 16,
                                    height: 16,
                                    top: 2,
                                    left: arenaMap[t.address] ? 18 : 2,
                                  }}
                                />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hasMoreCreated ? (
                      <div className="flex justify-center mt-8">
                        <button
                          type="button"
                          onClick={() => setVisibleCreatedCount((prev) => Math.min(prev + LIST_STEP, createdTokens.length))}
                          className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                        >
                          Load more
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </SectionCard>
            )}

            {tab === 'history' && (
              <SectionCard title={PROFILE.TAB_HISTORY}>
                {historyLoading ? (
                  <div className="flex justify-center py-6">
                    <LoadingBar size="medium" />
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="text-sm opacity-70 text-center py-4">{PROFILE.NO_HISTORY}</div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {visibleRecentActivities.map((a, idx) => {
                        const typeRaw = String(a?.type ?? '').toUpperCase();
                        const isBuy = typeRaw.includes('BUY');
                        const badgeText = isBuy ? 'BUY' : 'SELL';

                        const tokenAddress = String(a?.tokenAddress ?? '').trim();
                        const meta = tokenMetaMap[tokenAddress];

                        const tokenName = meta?.name ?? 'Unknown';
                        const tokenSymbol = meta?.symbol ?? '—';
                        const logo = meta?.logo;

                        return (
                          <button
                            key={`${tokenAddress}-${idx}`}
                            onClick={() => (tokenAddress ? router.push(`/token/${tokenAddress}`) : null)}
                            className="w-full text-left rounded-2xl border border-[var(--card-border)] bg-[var(--card2)] hover:bg-[var(--card-hover)] transition-colors p-4 flex items-center gap-4"
                          >
                            <div
                              className={`px-3 py-1 rounded-xl text-xs font-extrabold border border-[var(--card-border)] ${
                                isBuy ? 'bg-[var(--card)] text-[var(--accent)]' : 'bg-[var(--card)] text-red-400'
                              }`}
                            >
                              {badgeText}
                            </div>

                            <div className="relative w-10 h-10 rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)] shrink-0">
                              {logo ? (
                                <Image
                                  src={logo}
                                  alt={tokenSymbol}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : null}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold truncate">{tokenName}</div>
                              <div className="text-xs opacity-70 truncate">{tokenSymbol}</div>
                              <div className="text-xs opacity-70">{timeAgo(a?.timestamp)}</div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-extrabold">
                                {isBuy ? '+' : '-'}
                                {Number(a?.amount ?? 0).toLocaleString()}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {hasMoreHistory ? (
                      <div className="flex justify-center mt-8">
                        <button
                          type="button"
                          onClick={() =>
                            setVisibleHistoryCount((prev) => Math.min(prev + LIST_STEP, recentActivities.length))
                          }
                          className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                        >
                          Load more
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </SectionCard>
            )}

            {/* ===== Arena History Tab ===== */}
            {tab === 'arena' && (
              <SectionCard title="Arena History">
                {MOCK_ARENA_HISTORY.length === 0 ? (
                  <div className="text-center py-10 opacity-60">No arena bets yet.</div>
                ) : (
                  <>
                    {/* Summary stats — fake */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3 text-center">
                        <div className="text-xs opacity-70">Total Bets</div>
                        <div className="text-lg font-extrabold text-[var(--primary)] mt-1">{MOCK_ARENA_HISTORY.length}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3 text-center">
                        <div className="text-xs opacity-70">Wins</div>
                        <div className="text-lg font-extrabold text-green-400 mt-1">{MOCK_ARENA_HISTORY.filter((a) => a.result === 'win').length}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3 text-center">
                        <div className="text-xs opacity-70">Losses</div>
                        <div className="text-lg font-extrabold text-red-400 mt-1">{MOCK_ARENA_HISTORY.filter((a) => a.result === 'loss').length}</div>
                      </div>
                      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3 text-center">
                        <div className="text-xs opacity-70">Total Payout</div>
                        <div className="text-lg font-extrabold text-[var(--accent)] mt-1">
                          {MOCK_ARENA_HISTORY.reduce((s, a) => s + a.payout, 0).toFixed(2)} SOL
                        </div>
                      </div>
                    </div>

                    {/* Arena bet list */}
                    <div className="space-y-3">
                      {MOCK_ARENA_HISTORY.slice(0, visibleArenaCount).map((bet) => {
                        const isWin = bet.result === 'win';
                        const isLoss = bet.result === 'loss';
                        return (
                          <div
                            key={bet.id}
                            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] hover:bg-[var(--card-hover)] transition-colors"
                          >
                            {/* Status icon */}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isWin ? 'bg-green-500/15' : isLoss ? 'bg-red-500/15' : 'bg-yellow-500/15'
                            }`}>
                              {isWin ? <TrendingUp className="w-5 h-5 text-green-400" /> :
                               isLoss ? <TrendingDown className="w-5 h-5 text-red-400" /> :
                               <Clock className="w-5 h-5 text-yellow-400" />}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="font-extrabold text-sm truncate">{bet.arena}</div>
                              <div className="text-xs opacity-70 mt-0.5">
                                Pick: <span className="font-semibold text-[var(--primary)]">{bet.pick}</span>
                                <span className="mx-1.5">·</span>
                                {timeAgo(bet.date)}
                              </div>
                            </div>

                            {/* Amount & result */}
                            <div className="text-right shrink-0">
                              <div className="text-xs opacity-70">Bet: {bet.amount} SOL</div>
                              <div className={`font-extrabold text-sm mt-0.5 ${
                                isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                                {isWin ? `+${bet.payout.toFixed(2)} SOL` : isLoss ? `-${bet.amount} SOL` : 'Pending'}
                              </div>
                            </div>

                            {/* Status badge */}
                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                              bet.status === 'live'
                                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                : isWin
                                  ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
                            }`}>
                              {bet.status === 'live' ? 'Live' : isWin ? 'Won' : 'Lost'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {visibleArenaCount < MOCK_ARENA_HISTORY.length && (
                      <div className="flex justify-center mt-8">
                        <button
                          type="button"
                          onClick={() => setVisibleArenaCount((prev) => Math.min(prev + LIST_STEP, MOCK_ARENA_HISTORY.length))}
                          className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                        >
                          Load more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </SectionCard>
            )}

            {/* ===== Notifications Tab ===== */}
            {tab === 'notifications' && (
              <SectionCard title="Notifications">
                {MOCK_NOTIFICATIONS.length === 0 ? (
                  <div className="text-center py-10 opacity-60">No notifications yet.</div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {MOCK_NOTIFICATIONS.slice(0, visibleNotifCount).map((notif) => {
                        const IconComp = NOTIF_ICON_MAP[notif.type] || Info;
                        const colorClass = NOTIF_COLOR_MAP[notif.type] || 'text-gray-400';
                        return (
                          <div
                            key={notif.id}
                            className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border transition-colors ${
                              notif.read
                                ? 'border-[var(--card-border)] bg-[var(--card2)]'
                                : 'border-[var(--primary)]/30 bg-[var(--primary)]/5'
                            }`}
                          >
                            {/* Icon */}
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[var(--card)] border border-[var(--card-border)]`}>
                              <IconComp className={`w-4 h-4 ${colorClass}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm truncate">{notif.title}</span>
                                {!notif.read && (
                                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                )}
                              </div>
                              <div className="text-xs opacity-70 mt-0.5 leading-relaxed">{notif.message}</div>
                              <div className="text-[10px] opacity-50 mt-1">{timeAgo(notif.date)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {visibleNotifCount < MOCK_NOTIFICATIONS.length && (
                      <div className="flex justify-center mt-8">
                        <button
                          type="button"
                          onClick={() => setVisibleNotifCount((prev) => Math.min(prev + LIST_STEP, MOCK_NOTIFICATIONS.length))}
                          className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                        >
                          Load more
                        </button>
                      </div>
                    )}
                  </>
                )}
              </SectionCard>
            )}
          </div>
        </div>
      </div>
      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--background)] shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)] bg-[var(--background)]">
              <span className="text-lg font-bold">Edit Profile</span>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar */}
              <div>
                <div className="text-sm font-semibold mb-3">Avatar</div>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[var(--card2)] border border-[var(--card-border)] flex items-center justify-center shrink-0">
                    {avatarSrc ? (
                      <Image src={avatarSrc} alt="avatar" fill sizes="64px" className="object-cover" unoptimized />
                    ) : (
                      <span className="text-xl font-extrabold opacity-80">
                        {String(username || 'A').slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                    onClick={() => toast.info('Avatar upload API not available yet')}
                  >
                    <Camera className="w-4 h-4" />
                    Change Avatar
                  </button>
                  <span className="text-xs opacity-50">Max 5MB, JPG/PNG/GIF</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left column */}
                <div className="space-y-5">
                  {/* Username (locked) */}
                  <div>
                    <div className="text-sm font-semibold mb-1.5">Username <span className="text-xs opacity-50">(One-time only)</span></div>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] opacity-70">
                      <span className="text-sm flex-1">{username}</span>
                      <Lock className="w-3.5 h-3.5 opacity-50" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs opacity-50">
                      <Lock className="w-3 h-3" />
                      Cannot be changed
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <div className="text-sm font-semibold mb-1.5">Bio</div>
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => {
                        if (e.target.value.length <= 200) setEditForm((f) => ({ ...f, bio: e.target.value }));
                      }}
                      placeholder="Tell us about yourself"
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] text-sm outline-none focus:ring-1 focus:ring-[var(--primary)]/40 transition-shadow placeholder-gray-500 resize-none"
                    />
                    <div className="text-right text-xs opacity-50 mt-1">{editForm.bio.length} / 200</div>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-5">
                  {/* Twitter/X */}
                  <div>
                    <div className="text-sm font-semibold mb-1.5">Twitter/X</div>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                      <Twitter className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      <input
                        type="text"
                        value={editForm.twitter}
                        onChange={(e) => setEditForm((f) => ({ ...f, twitter: e.target.value }))}
                        placeholder="https://twitter.com/username"
                        className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Telegram */}
                  <div>
                    <div className="text-sm font-semibold mb-1.5">Telegram</div>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                      <TelegramIcon className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      <input
                        type="text"
                        value={editForm.telegram}
                        onChange={(e) => setEditForm((f) => ({ ...f, telegram: e.target.value }))}
                        placeholder="@username or URL"
                        className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <div className="text-sm font-semibold mb-1.5">Email</div>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
                      <Mail className="w-4 h-4 text-[var(--primary)] shrink-0" />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="flex-1 bg-transparent text-sm outline-none placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Wallet Address (locked) */}
                  <div>
                    <div className="text-sm font-semibold mb-1.5">Wallet Address</div>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] opacity-70">
                      <Wallet className="w-4 h-4 shrink-0" />
                      <span className="text-sm flex-1 truncate font-mono">{addressToUse ? formatAddressV2(addressToUse) : '—'}</span>
                      <Lock className="w-3.5 h-3.5 opacity-50" />
                    </div>
                    <div className="text-xs opacity-50 mt-1.5">Cannot be changed</div>
                  </div>

                  {/* Privacy Settings */}
                  <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card2)] p-3">
                    <div className="text-sm font-semibold mb-2">Privacy Settings</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{editForm.isPublic ? 'Public' : 'Private'}</div>
                        <div className="text-xs opacity-50">
                          {editForm.isPublic ? 'Anyone can view your profile' : 'Your profile is hidden'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                        className="relative shrink-0"
                        style={{ width: 36, height: 20 }}
                      >
                        <span
                          className="absolute inset-0 rounded-full transition-colors"
                          style={editForm.isPublic
                            ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }
                            : { backgroundColor: 'var(--card)', border: '1px solid var(--card-border)' }}
                        />
                        <span
                          className="absolute rounded-full bg-white shadow transition-transform"
                          style={{
                            width: 16,
                            height: 16,
                            top: 2,
                            left: editForm.isPublic ? 18 : 2,
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 px-6 py-4 border-t border-[var(--card-border)] bg-[var(--background)]">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--card)] text-sm font-semibold hover:bg-[var(--card-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.info('Edit Profile API not available yet');
                    setShowEditModal(false);
                  }}
                  className="flex-1 btn btn-primary py-2.5 rounded-xl text-sm font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProfilePage;