// pages/index.tsx — Home page (refactored: hooks + components extracted)
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

import Layout from '@/components/layout/Layout';
import TokenList from '@/components/tokens/TokenList';
import HowItWorksPopup from '@/components/notifications/HowItWorksPopup';
import Spinner from '@/components/ui/Spinner';
import LoadingBar from '@/components/ui/LoadingBar';
import SEO from '@/components/seo/SEO';

import MarqueeSection from '@/components/home/MarqueeSection';
import HomeToolbar from '@/components/home/HomeToolbar';

import { useTokenList } from '@/hooks/useTokenList';
import { useMarqueeTokens } from '@/hooks/useMarqueeTokens';
import { useNewTokensStream } from '@/hooks/useNewTokensStream';
import ArenaCard from '@/components/arena/ArenaCard';
import { getMockArenas } from '@/constants/arena-mock';

import { ActiveFilter, getMcap, getVol24h } from '@/utils/filterHelpers';
import type { SortOption } from '@/components/ui/SortOptions';

const TOKENS_PER_PAGE = 19;

const Home: React.FC = () => {
  const router = useRouter();

  // UI states
  const [sort, setSort] = useState<SortOption>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeNsfw, setIncludeNsfw] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isMarqueeLoading, setIsMarqueeLoading] = useState(false);

  // Hooks
  const {
    tokens, setTokens, hasMore, isLoading, isLoadingMore, error, fetchMore, resetCursor,
  } = useTokenList({ sort, searchQuery, includeNsfw, activeFilter });

  const { marqueeTokens, marqueeLogoError, onLogoError } = useMarqueeTokens(includeNsfw);
  const { showNewTokens, setShowNewTokens, newTokensBuffer } = useNewTokensStream(setTokens);

  // Arena: show top 12 trending on homepage
  const arenaItems = useMemo(() => getMockArenas('Trending').slice(0, 12), []);

  // Handle marquee loading overlay on route change
  useEffect(() => {
    const handleDone = () => setIsMarqueeLoading(false);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);
    return () => {
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router.events]);

  // Handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    resetCursor();
  }, [resetCursor]);

  const handleSort = useCallback((option: SortOption) => {
    setSort(option);
    resetCursor();
    setSearchQuery('');
  }, [resetCursor]);

  const handleToggleNsfw = useCallback(() => {
    setIncludeNsfw((v) => !v);
    resetCursor();
  }, [resetCursor]);

  const handleApplyFilter = useCallback((filter: ActiveFilter) => {
    setActiveFilter(filter);
    resetCursor();
  }, [resetCursor]);

  const handleClearFilter = useCallback(() => {
    setActiveFilter(null);
    resetCursor();
  }, [resetCursor]);

  // Derived filtered list
  const filteredTokens = useMemo(() => {
    let list = tokens?.data ?? [];
    if (!list.length) return [];

    if (activeFilter) {
      const { mcapMin, mcapMax, volMin, volMax } = activeFilter;
      list = list.filter((t: any) => {
        const mcap = getMcap(t);
        const vol = getVol24h(t);
        return mcap >= mcapMin && mcap <= mcapMax && vol >= volMin && vol <= volMax;
      });
    }

    return list;
  }, [tokens, activeFilter]);

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

      <HowItWorksPopup isVisible={showHowItWorks} onClose={() => setShowHowItWorks(false)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="text-center mb-4">
          <MarqueeSection
            marqueeTokens={marqueeTokens}
            marqueeLogoError={marqueeLogoError}
            onLogoError={onLogoError}
            onTokenClick={() => setIsMarqueeLoading(true)}
            onExternalNavigate={() => setIsMarqueeLoading(false)}
          />

          <HomeToolbar
            sort={sort}
            includeNsfw={includeNsfw}
            showNewTokens={showNewTokens}
            newTokensBufferCount={newTokensBuffer.length}
            activeFilter={activeFilter}
            onSearch={handleSearch}
            onSort={handleSort}
            onToggleNsfw={handleToggleNsfw}
            onToggleLive={() => setShowNewTokens((v) => !v)}
            onApplyFilter={handleApplyFilter}
            onClearFilter={handleClearFilter}
          />

          {/* Content: Arena or Token List based on sort tab */}
          {sort === 'arena' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {arenaItems.map(a => <ArenaCard key={a.id} arena={a} />)}
              </div>
              <div className="flex justify-center mt-8">
                <Link
                  href="/arena"
                  className="inline-block px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow text-sm text-[var(--foreground)]"
                >
                  Load more
                </Link>
              </div>
            </>
          ) : isLoading ? (
            <div className="flex justify-center items-center mt-10">
              <Spinner size="medium" />
            </div>
          ) : error ? (
            <div className="text-center text-[var(--primary)] text-xl mt-10">{error}</div>
          ) : (tokens?.data?.length ?? 0) > 0 ? (
            <TokenList
              tokens={filteredTokens}
              isEnded={sort === 'finalized'}
              sortType={sort}
              itemsPerPage={TOKENS_PER_PAGE}
              isFullList={false}
              pagination={{
                mode: 'cursor',
                hasMore,
                isLoadingMore,
                onLoadMore: fetchMore,
                autoLoad: false,
              }}
            />
          ) : (
            <div className="text-center text-[var(--primary)] text-xs mt-10">No tokens found matching your criteria.</div>
          )}
        </div>
      </div>

    </Layout>
  );
};

export default Home;
