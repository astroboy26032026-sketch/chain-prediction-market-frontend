import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';

import Layout from '@/components/layout/Layout';
import TokenList from '@/components/tokens/TokenList';
import SearchFilter from '@/components/ui/SearchFilter';
import HowItWorksPopup from '@/components/notifications/HowItWorksPopup';
import SortOptions, { SortOption } from '@/components/ui/SortOptions';
import Marquee from '@/components/ui/Marquee';
import Spinner from '@/components/ui/Spinner';
import LoadingBar from '@/components/ui/LoadingBar';
import { Switch } from '@/components/ui/switch';
import SEO from '@/components/seo/SEO';

import { useWebSocket } from '@/components/providers/WebSocketProvider';
import {
  getAllTokensTrends,
  getRecentTokens,
  searchTokens,
  getTokensWithLiquidity,
} from '@/utils/api.index';

import { Token, TokenWithLiquidityEvents, PaginatedResponse } from '@/interface/types';

const TOKENS_PER_PAGE = 19;
const TOKEN_BASE_PATH = '/token';

// ===== Helpers for token linking =====
const isLikelySolanaAddress = (s: string): boolean =>
  /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(s);

const isLikelyEvmAddress = (s: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(s);

const normalizeCandidate = (raw: any): string | null => {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/^(sol|eth|bsc|arb|op|base|poly|matic|shibarium):/i, '');
  s = s.replace(/^\/+/, '');
  return s || null;
};

const getTokenIdentifier = (t: any): string | null => {
  const candidates = [
    t?.address,
    t?.mint,
    t?.tokenAddress,
    t?.ca,
    t?.id,
  ];

  for (const raw of candidates) {
    const normalized = normalizeCandidate(raw);
    if (!normalized) continue;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (isLikelyEvmAddress(normalized) || isLikelySolanaAddress(normalized))
      return normalized;
  }
  return null;
};

const getTokenHref = (t: any): string => {
  const identifier = getTokenIdentifier(t);
  if (!identifier) return TOKEN_BASE_PATH;
  if (/^https?:\/\//i.test(identifier)) return identifier;
  return `${TOKEN_BASE_PATH}/${encodeURIComponent(identifier)}`;
};

// ===== Filter helpers =====
const DEFAULTS = {
  mcapMin: 1_000,
  mcapMax: 50_000_000,
  volMin: 0,
  volMax: 500_000,
};

const parseAbbrev = (s: string | number | null | undefined): number => {
  if (s === null || s === undefined) return NaN;
  if (typeof s === 'number') return s;

  const raw = String(s).trim().toLowerCase().replace(/[\$,]/g, '');
  if (!raw) return NaN;

  const multiplier = raw.endsWith('k')
    ? 1e3
    : raw.endsWith('m')
      ? 1e6
      : raw.endsWith('b')
        ? 1e9
        : 1;

  const num = parseFloat(raw.replace(/[kmb]$/i, ''));
  return isNaN(num) ? NaN : num * multiplier;
};

const fmtAbbrev = (n: number): string =>
  n >= 1e9
    ? `$${(n / 1e9).toFixed(1)}B`
    : n >= 1e6
      ? `$${(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `$${(n / 1e3).toFixed(1)}K`
        : `$${Math.max(0, Math.floor(n))}`;

const getMcap = (t: any): number =>
  Number(
    t?.mcapUsd ??
      t?.marketcapUsd ??
      t?.marketCapUsd ??
      t?.marketcap ??
      t?.marketCap ??
      t?.mcap ??
      t?.mc ??
      0
  );

const getVol24h = (t: any): number =>
  Number(
    t?.vol24hUsd ?? t?.volume24hUsd ?? t?.volume24h ?? t?.vol24h ?? t?.vol ?? 0
  );

const Home: React.FC = () => {
  const router = useRouter();
  const { newTokens } = useWebSocket();

  const [tokens, setTokens] = useState<
    PaginatedResponse<Token | TokenWithLiquidityEvents> | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<SortOption>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [noRecentTokens, setNoRecentTokens] = useState(false);
  const [noLiquidityTokens, setNoLiquidityTokens] = useState(false);
  const [showNewTokens, setShowNewTokens] = useState(false);
  const [newTokensBuffer, setNewTokensBuffer] = useState<Token[]>([]);
  const [displayedNewTokens, setDisplayedNewTokens] = useState<Token[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [allTrendingTokens, setAllTrendingTokens] = useState<Token[]>([]);
  const [isMarqueeLoading, setIsMarqueeLoading] = useState(false);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pending, setPending] = useState({
    mcapMin: DEFAULTS.mcapMin,
    mcapMax: DEFAULTS.mcapMax,
    volMin: DEFAULTS.volMin,
    volMax: DEFAULTS.volMax,
    mcapMinText: '',
    mcapMaxText: '',
    volMinText: '',
    volMaxText: '',
  });
  const [activeFilter, setActiveFilter] = useState<{
    mcapMin: number;
    mcapMax: number;
    volMin: number;
    volMax: number;
  } | null>(null);

  // Handle marquee loading overlay on route change
  useEffect(() => {
    const handleRouteComplete = () => setIsMarqueeLoading(false);
    const handleRouteError = () => setIsMarqueeLoading(false);

    router.events.on('routeChangeComplete', handleRouteComplete);
    router.events.on('routeChangeError', handleRouteError);

    return () => {
      router.events.off('routeChangeComplete', handleRouteComplete);
      router.events.off('routeChangeError', handleRouteError);
    };
  }, [router.events]);

  // Fetch tokens when page, sort, or search changes
  useEffect(() => {
    fetchTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sort, searchQuery]);

  // Handle incoming new tokens via WebSocket
  useEffect(() => {
    if (!newTokens?.length) return;

    if (showNewTokens) {
      setTokens((prev) => {
        if (!prev) return null;

        const toAdd = newTokens.filter(
          (n) =>
            !prev.data.some((e: any) => e?.id === n.id) &&
            !displayedNewTokens.some((d) => d.id === n.id)
        );

        if (!toAdd.length) return prev;

        setDisplayedNewTokens((p) => [...p, ...toAdd]);

        return {
          ...prev,
          data: [...toAdd, ...prev.data],
          totalCount: (prev.totalCount || 0) + toAdd.length,
        };
      });
    } else {
      setNewTokensBuffer((prev) => {
        const toAdd = newTokens.filter((n) => !prev.some((p) => p.id === n.id));
        return toAdd.length ? [...toAdd, ...prev] : prev;
      });
    }
  }, [newTokens, showNewTokens, displayedNewTokens]);

  const fetchTokens = async () => {
    setIsLoading(true);
    setNoRecentTokens(false);
    setNoLiquidityTokens(false);
    setError(null);

    try {
      let fetched: any;

      if (searchQuery.trim()) {
        fetched = await searchTokens(searchQuery, currentPage, TOKENS_PER_PAGE);
      } else {
        switch (sort) {
          case 'trending':
          case 'marketcap': {
            if (!allTrendingTokens.length) {
              const trending = await getAllTokensTrends();
              setAllTrendingTokens(trending);

              const start = (currentPage - 1) * TOKENS_PER_PAGE;
              const end = start + TOKENS_PER_PAGE;

              fetched = {
                data: sort === 'marketcap' ? trending : trending.slice(start, end),
                totalCount: trending.length,
                currentPage,
                totalPages: Math.ceil(trending.length / TOKENS_PER_PAGE),
                fullList: sort === 'marketcap',
              };
            } else {
              const start = (currentPage - 1) * TOKENS_PER_PAGE;
              const end = start + TOKENS_PER_PAGE;

              fetched = {
                data:
                  sort === 'marketcap'
                    ? allTrendingTokens
                    : allTrendingTokens.slice(start, end),
                totalCount: allTrendingTokens.length,
                currentPage,
                totalPages: Math.ceil(allTrendingTokens.length / TOKENS_PER_PAGE),
                fullList: sort === 'marketcap',
              };
            }
            break;
          }

          case 'new': {
            const result = await getRecentTokens(currentPage, TOKENS_PER_PAGE, 1);
            if (result === null) {
              setNoRecentTokens(true);
              fetched = { data: [], totalCount: 0, currentPage: 1, totalPages: 1 };
            } else {
              fetched = result;
            }
            break;
          }

          case 'finalized': {
            try {
              fetched = await getTokensWithLiquidity(currentPage, TOKENS_PER_PAGE);
            } catch (e: any) {
              if (e?.response?.status === 404) {
                setNoLiquidityTokens(true);
                fetched = { data: [], totalCount: 0, currentPage: 1, totalPages: 1 };
              } else {
                throw e;
              }
            }
            break;
          }

          default:
            fetched = { data: [], totalCount: 0, currentPage: 1, totalPages: 1 };
        }
      }

      const adjusted: PaginatedResponse<Token | TokenWithLiquidityEvents> = {
        data: fetched?.data || fetched?.tokens || [],
        totalCount: fetched?.totalCount ?? 0,
        currentPage: fetched?.currentPage || 1,
        totalPages: fetched?.totalPages || 1,
        tokens: [],
        fullList: fetched?.fullList,
      };

      setTokens(adjusted);
    } catch (e) {
      console.error('fetchTokens error:', e);
      setError('Failed to fetch tokens. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter handlers
  const clearFilter = () => {
    setPending({
      mcapMin: DEFAULTS.mcapMin,
      mcapMax: DEFAULTS.mcapMax,
      volMin: DEFAULTS.volMin,
      volMax: DEFAULTS.volMax,
      mcapMinText: '',
      mcapMaxText: '',
      volMinText: '',
      volMaxText: '',
    });
    setActiveFilter(null);
  };

  const applyFilter = () => {
    setActiveFilter({
      mcapMin: pending.mcapMin,
      mcapMax: pending.mcapMax,
      volMin: pending.volMin,
      volMax: pending.volMax,
    });
    setIsFilterOpen(false);
  };

  // Computed filtered token list
  const filteredTokens = useMemo(() => {
    let list = tokens?.data ?? [];
    if (!list.length) return [];

    const query = searchQuery.toLowerCase();
    if (query) {
      list = list.filter((t: any) =>
        (t?.name || '').toLowerCase().includes(query) ||
        (t?.symbol || '').toLowerCase().includes(query)
      );
    }

    if (activeFilter) {
      const { mcapMin, mcapMax, volMin, volMax } = activeFilter;
      list = list.filter((t: any) => {
        const mcap = getMcap(t);
        const vol = getVol24h(t);
        return mcap >= mcapMin && mcap <= mcapMax && vol >= volMin && vol <= volMax;
      });
    }

    return list;
  }, [tokens, searchQuery, activeFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) setCurrentPage(1);
  };

  const handleSort = (option: SortOption) => {
    setSort(option);
    setCurrentPage(1);
    setSearchQuery('');
  };

  // Top 5 trending tokens for marquee
  const top5Trending = useMemo(() => {
    const source = allTrendingTokens.length
      ? allTrendingTokens
      : (tokens?.data as Token[]) || [];
    return source.slice(0, 5);
  }, [allTrendingTokens, tokens]);

  return (
    <Layout>
      <SEO
        title="Create and Trade Memecoins Easily"
        description="The best platform for launching and trading memecoins. Fair launch, anti-bot, community-driven."
        image="seo/home.jpg"
      />

      {isMarqueeLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <LoadingBar size="large" />
        </div>
      )}

      <HowItWorksPopup
        isVisible={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      {/* Container căn giữa */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="text-center mb-4">
          {/* Banner Marquee 1 */}
          <Marquee speed={18} height={96}>
            <div className="flex items-center gap-6 px-6">
              <span className="font-bold tracking-widest">
                PUMP FUN CLONE • MAKE MONEY ON THE MEMECONOMY • FAIR LAUNCH • NO BOT DRAMA
              </span>
            </div>
          </Marquee>

          {/* Trending Marquee 2 */}
          <Marquee speed={22}>
            {top5Trending.map((token, index) => {
              const rawAddr =
                (token as any)?.address ||
                (token as any)?.mint ||
                (token as any)?.tokenAddress ||
                (token as any)?.ca ||
                null;

              const addr = rawAddr ? encodeURIComponent(String(rawAddr)) : null;
              const href = addr
                ? `${TOKEN_BASE_PATH}/${addr}`
                : getTokenHref(token);
              const isExternal = /^https?:\/\//i.test(href);

              const handleClick = () => {
                setIsMarqueeLoading(true);
                if (isExternal) setTimeout(() => setIsMarqueeLoading(false), 300);
              };

              return (
                <Link
                  key={`${(token as any)?.id ?? 'token'}-${index}`}
                  href={href || TOKEN_BASE_PATH}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  onClick={handleClick}
                  className="inline-flex items-center gap-3 px-3 py-2 mr-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow-xl cursor-pointer"
                  style={{ minWidth: 220 }}
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--card-border)] shrink-0">
                    <Image
                      src={
                        (token as any)?.image ||
                        (token as any)?.logo ||
                        '/placeholder-token.png'
                      }
                      alt={(token as any)?.name || 'token'}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-bold truncate">
                    {(token as any)?.name || 'Unnamed'}
                  </div>
                </Link>
              );
            })}
          </Marquee>

          {/* Search, Sort, Switches & Filter */}
          <div className="mb-4">
            <SearchFilter onSearch={handleSearch} />

            <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <SortOptions onSort={handleSort} currentSort={sort} />

              <div className="flex items-center gap-3 justify-center md:justify-end relative">
                <span className="text-sm">NSFW</span>
                <Switch
                  checked={showNewTokens}
                  onCheckedChange={() => setShowNewTokens((v) => !v)}
                  className={`${
                    showNewTokens
                      ? 'bg-[var(--primary)]'
                      : 'bg-[var(--card-border)]'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                >
                  <span
                    className={`${
                      showNewTokens ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>

                {!showNewTokens && newTokensBuffer.length > 0 && (
                  <span className="text-xs text-[var(--primary)]">
                    {newTokensBuffer.length} new{' '}
                    {newTokensBuffer.length === 1 ? 'token' : 'tokens'}
                  </span>
                )}

                {/* Filter Button */}
                <button
                  onClick={() => setIsFilterOpen((v) => !v)}
                  className={`px-3 py-2 rounded-md border border-[var(--card-border)] bg-[var(--card)] hover:shadow inline-flex items-center gap-2 text-sm ${
                    activeFilter ? 'ring-1 ring-[var(--primary)]' : ''
                  }`}
                  aria-expanded={isFilterOpen}
                >
                  Filter
                  <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-80">
                    <path fill="currentColor" d="M3 5h18l-7 8v6l-4-2v-4z" />
                  </svg>
                </button>

                {/* Filter Popover */}
                {isFilterOpen && (
                  <div className="absolute top-10 right-0 z-40 w-[420px] rounded-2xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                    {/* Market Cap Filter */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">Mcap</div>
                        <div className="text-xs opacity-70">
                          {fmtAbbrev(pending.mcapMin)} – {fmtAbbrev(pending.mcapMax)}
                        </div>
                      </div>

                      <input
                        type="range"
                        min={DEFAULTS.mcapMin}
                        max={DEFAULTS.mcapMax}
                        value={pending.mcapMin}
                        onChange={(e) =>
                          setPending((p) => ({
                            ...p,
                            mcapMin: Math.min(Number(e.target.value), p.mcapMax - 1),
                          }))
                        }
                        className="w-full slider-accent"
                      />
                      <input
                        type="range"
                        min={DEFAULTS.mcapMin}
                        max={DEFAULTS.mcapMax}
                        value={pending.mcapMax}
                        onChange={(e) =>
                          setPending((p) => ({
                            ...p,
                            mcapMax: Math.max(Number(e.target.value), p.mcapMin + 1),
                          }))
                        }
                        className="w-full -mt-2 slider-accent"
                      />

                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <input
                          placeholder="e.g., 10k, 1m"
                          value={pending.mcapMinText}
                          onChange={(e) =>
                            setPending((p) => ({ ...p, mcapMinText: e.target.value }))
                          }
                          onBlur={() => {
                            const v = parseAbbrev(pending.mcapMinText);
                            if (!isNaN(v)) {
                              setPending((p) => ({
                                ...p,
                                mcapMin: Math.min(
                                  Math.max(v, DEFAULTS.mcapMin),
                                  p.mcapMax - 1
                                ),
                              }));
                            }
                          }}
                          className="px-3 py-2 rounded-md bg-[var(--input)] border border-[var(--card-border)] focus:bg-[var(--accent)] focus:text-black focus:placeholder-black focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                        />
                        <input
                          placeholder="e.g., 10k, 1m"
                          value={pending.mcapMaxText}
                          onChange={(e) =>
                            setPending((p) => ({ ...p, mcapMaxText: e.target.value }))
                          }
                          onBlur={() => {
                            const v = parseAbbrev(pending.mcapMaxText);
                            if (!isNaN(v)) {
                              setPending((p) => ({
                                ...p,
                                mcapMax: Math.max(
                                  Math.min(v, DEFAULTS.mcapMax),
                                  p.mcapMin + 1
                                ),
                              }));
                            }
                          }}
                          className="px-3 py-2 rounded-md bg-[var(--input)] border border-[var(--card-border)] focus:bg-[var(--accent)] focus:text-black focus:placeholder-black focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                        />
                      </div>
                    </div>

                    {/* 24h Volume Filter */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">24h Vol</div>
                        <div className="text-xs opacity-70">
                          {fmtAbbrev(pending.volMin)} – {fmtAbbrev(pending.volMax)}
                        </div>
                      </div>

                      <input
                        type="range"
                        min={DEFAULTS.volMin}
                        max={DEFAULTS.volMax}
                        value={pending.volMin}
                        onChange={(e) =>
                          setPending((p) => ({
                            ...p,
                            volMin: Math.min(Number(e.target.value), p.volMax - 1),
                          }))
                        }
                        className="w-full slider-accent"
                      />
                      <input
                        type="range"
                        min={DEFAULTS.volMin}
                        max={DEFAULTS.volMax}
                        value={pending.volMax}
                        onChange={(e) =>
                          setPending((p) => ({
                            ...p,
                            volMax: Math.max(Number(e.target.value), p.volMin + 1),
                          }))
                        }
                        className="w-full -mt-2 slider-accent"
                      />

                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <input
                          placeholder="e.g., 5k, 100k"
                          value={pending.volMinText}
                          onChange={(e) =>
                            setPending((p) => ({ ...p, volMinText: e.target.value }))
                          }
                          onBlur={() => {
                            const v = parseAbbrev(pending.volMinText);
                            if (!isNaN(v)) {
                              setPending((p) => ({
                                ...p,
                                volMin: Math.min(
                                  Math.max(v, DEFAULTS.volMin),
                                  p.volMax - 1
                                ),
                              }));
                            }
                          }}
                          className="px-3 py-2 rounded-md bg-[var(--input)] border border-[var(--card-border)] focus:bg-[var(--accent)] focus:text-black focus:placeholder-black focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                        />
                        <input
                          placeholder="e.g., 5k, 100k"
                          value={pending.volMaxText}
                          onChange={(e) =>
                            setPending((p) => ({ ...p, volMaxText: e.target.value }))
                          }
                          onBlur={() => {
                            const v = parseAbbrev(pending.volMaxText);
                            if (!isNaN(v)) {
                              setPending((p) => ({
                                ...p,
                                volMax: Math.max(
                                  Math.min(v, DEFAULTS.volMax),
                                  p.volMin + 1
                                ),
                              }));
                            }
                          }}
                          className="px-3 py-2 rounded-md bg-[var(--input)] border border-[var(--card-border)] focus:bg-[var(--accent)] focus:text-black focus:placeholder-black focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={clearFilter}
                        className="flex-1 px-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)]"
                      >
                        Clear
                      </button>
                      <button
                        onClick={applyFilter}
                        className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-semibold hover:opacity-90"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Token List or States */}
          {isLoading ? (
            <div className="flex justify-center items-center mt-10">
              <Spinner size="medium" />
            </div>
          ) : error ? (
            <div className="text-center text-[var(--primary)] text-xl mt-10">
              {error}
            </div>
          ) : noRecentTokens ? (
            <div className="text-center text-[var(--primary)] text-xs mt-10">
              No tokens created in the last 24 hours. Check back soon.
            </div>
          ) : noLiquidityTokens ? (
            <div className="text-center text-[var(--primary)] text-xs mt-10">
              No tokens Listed Yet.
            </div>
          ) : (tokens?.totalPages || 1) > 0 ? (
            <TokenList
              tokens={filteredTokens}
              currentPage={currentPage}
              totalPages={tokens?.totalPages || 1}
              onPageChange={setCurrentPage}
              isEnded={sort === 'finalized'}
              sortType={sort}
              itemsPerPage={TOKENS_PER_PAGE}
              isFullList={tokens?.fullList}
            />
          ) : (
            <div className="text-center text-[var(--primary)] text-xs mt-10">
              No tokens found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Custom slider styles */}
      <style jsx>{`
        .slider-accent {
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          background: transparent;
        }

        .slider-accent::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
        }

        .slider-accent::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          margin-top: -5px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid var(--accent);
          cursor: pointer;
        }

        .slider-accent::-moz-range-track {
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
        }

        .slider-accent::-moz-range-progress {
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
        }

        .slider-accent::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid var(--accent);
          cursor: pointer;
        }

        .slider-accent::-ms-fill-lower,
        .slider-accent::-ms-fill-upper {
          background: var(--accent);
        }

        .slider-accent::-ms-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid var(--accent);
        }
      `}</style>
    </Layout>
  );
};

export default Home;