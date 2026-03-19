import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import ArenaCard from '@/components/arena/ArenaCard';
import { getMockArenas, ARENA_CATEGORIES, ARENAS_PER_PAGE, type ArenaCategory } from '@/constants/arena-mock';

// TODO: switch to getArenaList() from api.ts when BE is ready

export default function ArenaListPage() {
  const [tab, setTab] = useState<ArenaCategory>('Trending');
  const [visibleCount, setVisibleCount] = useState(ARENAS_PER_PAGE);

  const allArenas = useMemo(() => getMockArenas(tab), [tab]);
  const arenas = useMemo(() => allArenas.slice(0, visibleCount), [allArenas, visibleCount]);
  const hasMore = visibleCount < allArenas.length;

  // Reset visible count when switching tabs
  const handleTabChange = (cat: ArenaCategory) => {
    setTab(cat);
    setVisibleCount(ARENAS_PER_PAGE);
  };

  return (
    <Layout>
      <SEO title="Arena" description="Bet on token battles, meme wars, and sports events" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header — same style as other pages */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--primary)] mb-6">Arena</h1>

        {/* Category Tabs — same pill style as homepage */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center px-1 py-1 rounded-full bg-[rgba(36,40,34,0.65)]/90 backdrop-blur-md border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] select-none">
            <div className="relative z-[1] flex gap-1">
              {ARENA_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleTabChange(cat)}
                  className={`px-4 md:px-5 h-9 md:h-10 rounded-full font-semibold transition-colors duration-200 text-sm md:text-[15px] ${
                    tab === cat
                      ? 'text-white bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-[0_6px_18px_rgba(201,142,107,0.35)]'
                      : 'text-[rgba(243,239,234,0.82)] hover:text-[var(--primary)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        {arenas.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">No arenas found</div>
            <div className="text-xs text-gray-500">Check back later for new battles and events!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {arenas.map(a => (
              <ArenaCard key={a.id} arena={a} />
            ))}
          </div>
        )}

        {/* Load more — same style as token list */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setVisibleCount(v => v + ARENAS_PER_PAGE)}
              className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
