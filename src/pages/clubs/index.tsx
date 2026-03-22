import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { MOCK_CLUBS, CLUB_CATEGORIES, CLUBS_PER_PAGE, type ClubCategory } from '@/constants/clubs-mock';
import { Search, Users, Trophy, Flame, Shield, Lock, ChevronDown, Plus, Crown, Swords } from 'lucide-react';

/* ─── helpers ─── */
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type SortOption = 'rank' | 'members' | 'points' | 'winrate';
const SORT_LABELS: Record<SortOption, string> = {
  rank: 'Rank',
  members: 'Members',
  points: 'Weekly Points',
  winrate: 'Win Rate',
};

export default function ClubsPage() {
  const [category, setCategory] = useState<ClubCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rank');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CLUBS_PER_PAGE);

  const filteredClubs = useMemo(() => {
    let list = [...MOCK_CLUBS];

    // Category filter
    if (category !== 'all') {
      list = list.filter(c => c.category === category);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.tag.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case 'rank': list.sort((a, b) => a.rank - b.rank); break;
      case 'members': list.sort((a, b) => b.members - a.members); break;
      case 'points': list.sort((a, b) => b.weeklyPoints - a.weeklyPoints); break;
      case 'winrate': list.sort((a, b) => b.winRate - a.winRate); break;
    }

    return list;
  }, [category, sortBy, searchQuery]);

  const clubs = useMemo(() => filteredClubs.slice(0, visibleCount), [filteredClubs, visibleCount]);
  const hasMore = visibleCount < filteredClubs.length;

  const roleColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-500';
  };

  return (
    <Layout>
      <SEO title="Clubs" description="Join or create clubs, compete in faction wars" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--primary)]">Clubs</h1>
            <p className="text-sm text-gray-400 mt-1">{MOCK_CLUBS.length} clubs · {fmtNum(MOCK_CLUBS.reduce((s, c) => s + c.members, 0))} members</p>
          </div>
          <Link
            href="/clubs/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
            style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
          >
            <Plus size={16} /> Create Club
          </Link>
        </div>

        {/* Top 3 clubs showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {MOCK_CLUBS.slice(0, 3).map((club, i) => (
            <Link key={club.id} href={`/clubs/${club.id}`} className="block group">
              <div
                className="relative rounded-2xl overflow-hidden border border-[var(--card-border)] hover:border-[var(--primary)]/50 transition-all h-[140px]"
                style={{ background: club.banner }}
              >
                <div className="absolute inset-0 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{club.avatar}</span>
                      <div>
                        <div className="text-sm font-extrabold text-white group-hover:text-[var(--primary)] transition-colors">{club.name}</div>
                        <div className="text-[10px] text-gray-400">[{club.tag}]</div>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-lg font-extrabold ${roleColor(i + 1)}`}>
                      <Crown size={16} /> #{i + 1}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span className="flex items-center gap-1"><Users size={12} /> {fmtNum(club.members)}</span>
                    <span className="flex items-center gap-1"><Trophy size={12} /> {club.winRate}% WR</span>
                    <span className="flex items-center gap-1"><Flame size={12} /> {fmtNum(club.weeklyPoints)} pts/w</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Category tabs + Sort — same row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="inline-flex items-center px-1 py-1 rounded-full bg-[rgba(36,40,34,0.65)]/90 backdrop-blur-md border border-[rgba(255,255,255,0.06)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] select-none">
            <div className="relative z-[1] flex gap-1 flex-wrap justify-center">
              {CLUB_CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setVisibleCount(CLUBS_PER_PAGE); }}
                  className={`px-3 md:px-4 h-8 md:h-9 rounded-full font-semibold transition-colors duration-200 text-xs md:text-sm ${
                    category === cat.value
                      ? 'text-white bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] shadow-[0_6px_18px_rgba(201,142,107,0.35)]'
                      : 'text-[rgba(243,239,234,0.82)] hover:text-[var(--primary)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
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
                    onClick={() => { setSortBy(opt); setShowSortDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortBy === opt ? 'text-white font-semibold' : 'text-gray-400 hover:text-white hover:bg-[var(--card2)]'
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

        {/* Search */}
        <div className="relative flex items-center max-w-md mx-auto mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setVisibleCount(CLUBS_PER_PAGE); }}
            placeholder="Search clubs..."
            className="w-full py-2 pl-10 pr-4 text-sm bg-[var(--card)] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors duration-200"
          />
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Club list */}
        {clubs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-2">{searchQuery.trim() ? 'No clubs match your search' : 'No clubs found'}</div>
            <div className="text-xs text-gray-500">{searchQuery.trim() ? 'Try a different keyword' : 'Be the first to create one!'}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubs.map(club => (
              <Link key={club.id} href={`/clubs/${club.id}`} className="block group">
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] hover:border-[var(--primary)]/50 transition-all overflow-hidden h-full flex flex-col">
                  {/* Mini banner */}
                  <div className="h-16 relative" style={{ background: club.banner }}>
                    <div className="absolute -bottom-5 left-4">
                      <span className="text-4xl drop-shadow-lg">{club.avatar}</span>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {!club.isPublic && <Lock size={12} className="text-gray-400" />}
                      {club.streak >= 5 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 flex items-center gap-0.5">
                          <Flame size={10} /> {club.streak}W
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-8 flex-1 flex flex-col">
                    {/* Name + tag + rank */}
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-bold text-[var(--primary)] group-hover:text-white transition-colors">{club.name}</span>
                        <span className="text-[10px] text-gray-500 ml-1.5">[{club.tag}]</span>
                      </div>
                      <span className={`text-xs font-bold ${roleColor(club.rank)}`}>#{club.rank}</span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{club.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {club.tags.slice(0, 3).map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--card2)] text-gray-400 border border-[var(--card-border)]">
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-[var(--card2)] rounded-lg py-1.5 px-1">
                        <div className="text-[9px] text-gray-500">Members</div>
                        <div className="text-xs font-bold text-white">{fmtNum(club.members)}</div>
                      </div>
                      <div className="bg-[var(--card2)] rounded-lg py-1.5 px-1">
                        <div className="text-[9px] text-gray-500">Win Rate</div>
                        <div className="text-xs font-bold text-green-400">{club.winRate}%</div>
                      </div>
                      <div className="bg-[var(--card2)] rounded-lg py-1.5 px-1">
                        <div className="text-[9px] text-gray-500">Pts/Week</div>
                        <div className="text-xs font-bold text-[var(--primary)]">{fmtNum(club.weeklyPoints)}</div>
                      </div>
                      <div className="bg-[var(--card2)] rounded-lg py-1.5 px-1">
                        <div className="text-[9px] text-gray-500">Level</div>
                        <div className="text-xs font-bold text-yellow-400">Lv.{club.level}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setVisibleCount(v => v + CLUBS_PER_PAGE)}
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
