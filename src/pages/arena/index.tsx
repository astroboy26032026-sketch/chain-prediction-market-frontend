import React, { useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import ArenaCard from '@/components/arena/ArenaCard';
import { getMockArenas, ARENA_CATEGORIES, ARENAS_PER_PAGE, type ArenaCategory } from '@/constants/arena-mock';
import { Search, ChevronDown } from 'lucide-react';

// TODO: switch to getArenaList() from api.ts when BE is ready

type SortOption = 'volume' | 'newest' | 'ending_soon';

const SORT_LABELS: Record<SortOption, string> = {
  volume: 'Volume',
  newest: 'Newest',
  ending_soon: 'Ending Soon',
};

export default function ArenaListPage() {
  const [tab, setTab] = useState<ArenaCategory>('Trending');
  const [visibleCount, setVisibleCount] = useState(ARENAS_PER_PAGE);
  const [sortBy, setSortBy] = useState<SortOption>('volume');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const allArenas = useMemo(() => {
    let list = getMockArenas(tab);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        a =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.options.some(o => o.label.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case 'volume':
        list = [...list].sort((a, b) => b.totalPool - a.totalPool);
        break;
      case 'newest':
        list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'ending_soon':
        list = [...list].sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
        break;
    }

    return list;
  }, [tab, sortBy, searchQuery]);

  const arenas = useMemo(() => allArenas.slice(0, visibleCount), [allArenas, visibleCount]);
  const hasMore = visibleCount < allArenas.length;

  // Reset visible count when switching tabs/sort/search
  const handleTabChange = (cat: ArenaCategory) => {
    setTab(cat);
    setVisibleCount(ARENAS_PER_PAGE);
  };

  return (
    <Layout>
      <SEO title="Arena" description="Bet on token battles, meme wars, and sports events" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--primary)] mb-6">Arena</h1>

        {/* Category Tabs + Sort — same row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Category pills */}
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

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              onBlur={() => setTimeout(() => setShowSortDropdown(false), 150)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--card-border)] text-sm text-gray-300 hover:text-white hover:border-[var(--primary)] transition-colors min-w-[160px] justify-between"
            >
              <span className="text-gray-500 text-xs mr-1">Sort:</span>
              <span className="font-semibold">{SORT_LABELS[sortBy]}</span>
              <ChevronDown size={14} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSortDropdown && (
              <div className="absolute right-0 top-full mt-1 w-full bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-lg overflow-hidden z-20">
                {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSortBy(opt);
                      setVisibleCount(ARENAS_PER_PAGE);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortBy === opt
                        ? 'text-white font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-[var(--card2)]'
                    }`}
                    style={sortBy === opt ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
                  >
                    {SORT_LABELS[opt]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search — same width as token search (max-w-md, centered) */}
        <div className="relative flex items-center max-w-md mx-auto mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setVisibleCount(ARENAS_PER_PAGE);
            }}
            placeholder="Search arenas..."
            className="w-full py-2 pl-10 pr-4 text-sm bg-[var(--card)] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors duration-200"
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Grid */}
        {arenas.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">
              {searchQuery.trim() ? 'No arenas match your search' : 'No arenas found'}
            </div>
            <div className="text-xs text-gray-500">
              {searchQuery.trim() ? 'Try a different keyword' : 'Check back later for new battles and events!'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {arenas.map(a => (
              <ArenaCard key={a.id} arena={a} />
            ))}
          </div>
        )}

        {/* Load more */}
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
