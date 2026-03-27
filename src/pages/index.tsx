// pages/index.tsx — Prediction Markets home page
import React, { useMemo, useState, useCallback } from 'react';
import Layout from '@/components/layout/Layout';
import TokenList from '@/components/tokens/TokenList';
import HowItWorksPopup from '@/components/notifications/HowItWorksPopup';
import SEO from '@/components/seo/SEO';
import HomeToolbar from '@/components/home/HomeToolbar';

import type { SortOption } from '@/components/ui/SortOptions';
import type { MarketCategory } from '@/data/markets';
import { getMarketsByCategory, marketsAsTokens, PREDICTION_MARKETS } from '@/data/markets';

const INITIAL_COUNT = 10;

type SortBy = 'volume' | 'ending_soon' | 'newest';

const Home: React.FC = () => {
  const [category, setCategory] = useState<MarketCategory>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('volume');

  const handleCategory = useCallback((opt: SortOption) => {
    setCategory(opt);
    setShowAll(false);
    setSearchQuery('');
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const allTokens = useMemo(() => {
    const markets = getMarketsByCategory(category);

    // Sort markets
    const sorted = [...markets].sort((a, b) => {
      if (sortBy === 'volume') return b.volume24h - a.volume24h;
      if (sortBy === 'ending_soon') return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    let tokens = marketsAsTokens(sorted);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tokens = tokens.filter(
        (t: any) =>
          t.name?.toLowerCase().includes(q) ||
          t.symbol?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }

    return tokens;
  }, [category, searchQuery, sortBy]);

  const displayedTokens = useMemo(
    () => (showAll ? allTokens : allTokens.slice(0, INITIAL_COUNT)),
    [allTokens, showAll]
  );

  const hasMore = !showAll && allTokens.length > INITIAL_COUNT;

  return (
    <Layout>
      <SEO
        title="Prediction Markets — Zugar"
        description="Trade on prediction markets. Sports, crypto, politics and more."
        image="seo/home.jpg"
      />

      <HowItWorksPopup isVisible={showHowItWorks} onClose={() => setShowHowItWorks(false)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="text-center mb-4">
          <HomeToolbar
            sort={category}
            onSort={handleCategory}
            onSearch={handleSearch}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />

          {displayedTokens.length > 0 ? (
            <>
              <TokenList
                tokens={displayedTokens}
                isEnded={false}
                sortType={category}
                itemsPerPage={displayedTokens.length}
                isFullList={false}
                pagination={{
                  mode: 'page',
                  currentPage: 1,
                  totalPages: 1,
                  onPageChange: () => {},
                }}
              />
              {hasMore && (
                <button
                  onClick={() => setShowAll(true)}
                  className="mt-6 px-6 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--card-hover)] text-sm font-semibold transition-colors"
                >
                  Load More
                </button>
              )}
            </>
          ) : (
            <div className="text-center text-gray-400 text-sm mt-10">
              No markets found.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Home;
