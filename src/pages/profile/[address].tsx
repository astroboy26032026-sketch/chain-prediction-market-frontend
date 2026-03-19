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

import { Check, Copy, Wallet } from 'lucide-react';

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

/* =========================
   Types
========================= */
type ProfileInfo = Awaited<ReturnType<typeof getProfileInfo>>;
type ProfileStats = Awaited<ReturnType<typeof getProfileStats>>;

type TabKey = 'profile' | 'holding' | 'created' | 'history';

type TokenMini = {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  marketCap?: number;
  holders?: number;
};

const LIST_STEP = 10;

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
    {title.toUpperCase()}
  </button>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden shadow-sm">
    <div className="px-4 sm:px-6 py-4 border-b border-[var(--card-border)] text-sm font-extrabold tracking-wide text-[var(--primary)]">
      {title.toUpperCase()}
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
      }));
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

                  {profileInfo?.bio ? <div className="mt-2 text-sm opacity-80">{String(profileInfo.bio)}</div> : null}
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
          </div>

          {/* Content */}
          <div className="mt-5 space-y-4">
            {tab === 'profile' && (
              <>
                <SectionCard title="Basic Information">
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs opacity-70">Username</div>
                      <div className="font-semibold">{username}</div>
                    </div>

                    <div>
                      <div className="text-xs opacity-70">Bio</div>
                      <div className="opacity-90">{profileInfo?.bio ? String(profileInfo.bio) : '—'}</div>
                    </div>

                    <div>
                      <div className="text-xs opacity-70">Member Since</div>
                      <div className="opacity-90">{memberSince}</div>
                    </div>
                  </div>
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
                      {visibleCreatedTokens.map((t) => (
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
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;