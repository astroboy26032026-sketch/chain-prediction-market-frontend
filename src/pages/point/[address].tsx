// src/pages/point/[address].tsx — Points page (fetches from Zugar API)
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { ExternalLink } from 'lucide-react';
import { getZugarPointsLeaderboard, type ZugarLeaderboardEntry } from '@/utils/zugarApi';

/* =========================
   Fallback Data
========================= */
const MOCK_HOW_TO_EARN = [
  {
    title: 'Invite & Earn Points',
    description: [
      'Generate your referral code',
      'Invite your friends to join via your referral code',
      'Earn points based on your referees trading volume',
    ],
    badge: 'Live',
    image: '/chats/noimg.svg',
    learnMore: '#',
    featured: true,
  },
  {
    title: 'Trading Rewards',
    description: ['Earn points when you trade on active markets. Higher-quality trading activity earns more points.'],
    badge: 'Live',
    image: '/chats/noimg.svg',
    learnMore: '#',
  },
  {
    title: 'Liquidity Rewards',
    description: ['Earn points for helping keep markets easy to trade. Keep liquidity near the market price on both outcomes.'],
    badge: 'Live',
    image: '/chats/noimg.svg',
    learnMore: '#',
  },
  {
    title: 'Open Interest',
    description: ['Earn points for holding active positions over time. Longer commitment signals stronger conviction, and earns more.'],
    badge: 'Live',
    image: '/chats/noimg.svg',
    learnMore: '#',
  },
];

const FALLBACK_LEADERBOARD: ZugarLeaderboardEntry[] = [
  { rank: 1, user: 'baibai', avatar: '🦊', points: 8930 },
  { rank: 2, user: 'ref_o1fht038', avatar: '🐱', points: 5540 },
  { rank: 3, user: 'earndrops', avatar: '🐻', points: 4670 },
  { rank: 4, user: 'userb0opxx', avatar: '🐸', points: 4470 },
  { rank: 5, user: 'useryc04kh', avatar: '🦁', points: 4400 },
  { rank: 6, user: 'userrcn0bt', avatar: '🐯', points: 4250 },
  { rank: 7, user: 'user6lOzwm', avatar: '🐨', points: 3730 },
  { rank: 8, user: 'userkpklzi', avatar: '🐼', points: 3730 },
  { rank: 9, user: '8899888', avatar: '🐵', points: 3560 },
  { rank: 10, user: 'usergh7yhr', avatar: '🦄', points: 3540 },
];

const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}K` : n.toLocaleString());

/* =========================
   Page
========================= */
const PointsPage: React.FC = () => {
  const router = useRouter();
  const walletAddress = useMemo(() => {
    const v = router.query.address;
    return typeof v === 'string' ? v.trim() : '';
  }, [router.query.address]);

  const [currentPage, setCurrentPage] = useState(1);
  const [leaderboard, setLeaderboard] = useState<ZugarLeaderboardEntry[]>(FALLBACK_LEADERBOARD);
  const [totalPages, setTotalPages] = useState(20);

  // Fetch leaderboard from Zugar API when page changes
  useEffect(() => {
    getZugarPointsLeaderboard(currentPage)
      .then((res) => {
        setLeaderboard(res.entries);
        setTotalPages(res.totalPages);
      })
      .catch(() => setLeaderboard(FALLBACK_LEADERBOARD));
  }, [currentPage]);

  const pageRange = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <Layout>
      <SEO title="Candy Points" description="Earn sweet points from trading, referrals, and more." />

      <div className="min-h-screen flex flex-col items-center">

        <div className="w-full max-w-5xl px-4 sm:px-6 py-8">

          {/* Page Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-6">🍭 Sweet Point</h1>

          {/* ── Connect Wallet CTA ── */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 mb-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">Connect your wallet, predict, refer and earn candy points</h2>
              <p className="text-sm text-gray-400">Collect sweet points every week, don&apos;t miss out</p>
              <button
                onClick={() => router.push(`/referral/${walletAddress || 'connect'}`)}
                className="mt-4 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                Connect wallet to generate Referral Code
              </button>
            </div>
            <div className="text-6xl">🍬</div>
          </div>

          {/* ── How to Earn Points ── */}
          <h2 className="text-xl font-bold mb-4">🍭 How to earn candy points</h2>

          {/* Featured card */}
          {MOCK_HOW_TO_EARN.filter((c) => c.featured).map((card, i) => (
            <div key={i} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 mb-4 flex flex-col sm:flex-row gap-5">
              <div className="w-full sm:w-48 h-32 rounded-xl bg-[var(--card2)] flex items-center justify-center text-5xl relative overflow-hidden">
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  {card.badge}
                </span>
                🍭
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">{card.title}</h3>
                <div className="space-y-1">
                  {card.description.map((step, j) => (
                    <p key={j} className="text-sm text-gray-400">
                      <span className="text-[var(--primary)] font-bold mr-1">Step {j + 1}</span>
                      {step}
                    </p>
                  ))}
                </div>
                <a href={card.learnMore} className="inline-flex items-center gap-1 text-sm text-[var(--primary)] font-semibold mt-3 hover:opacity-80">
                  Learn more <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}

          {/* Smaller cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {MOCK_HOW_TO_EARN.filter((c) => !c.featured).map((card, i) => (
              <div key={i} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <div className="w-full h-28 rounded-xl bg-[var(--card2)] flex items-center justify-center text-4xl mb-3 relative">
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {card.badge}
                  </span>
                  {i === 0 ? '🍬' : i === 1 ? '🍩' : '🎀'}
                </div>
                <h3 className="text-sm font-bold mb-1">{card.title}</h3>
                <p className="text-xs text-gray-400 mb-2">{card.description[0]}</p>
                <a href={card.learnMore} className="inline-flex items-center gap-1 text-xs text-[var(--primary)] font-semibold hover:opacity-80">
                  Learn more <ExternalLink size={11} />
                </a>
              </div>
            ))}
          </div>

          {/* ── Points Leaderboard ── */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-lg font-bold">Points Leaderboard</h3>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[60px_1fr_100px] px-5 py-2 text-xs font-semibold text-gray-400 border-b border-[var(--card-border)]">
              <span>Rank</span>
              <span>User</span>
              <span className="text-right">Points</span>
            </div>

            {/* Rows */}
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className="grid grid-cols-[60px_1fr_100px] px-5 py-3 items-center hover:bg-[var(--card-hover)] transition-colors border-b border-[var(--card-border)] last:border-b-0"
              >
                <span className={`font-bold text-sm ${entry.rank <= 3 ? 'text-[var(--primary)]' : 'text-gray-400'}`}>
                  {entry.rank}
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-[var(--card2)] flex items-center justify-center text-sm">
                    {entry.avatar}
                  </span>
                  <span className="text-sm font-medium">{entry.user}</span>
                </div>
                <span className="text-right text-sm font-semibold text-[var(--primary)]">{fmtK(entry.points)}</span>
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-center gap-1 py-4 border-t border-[var(--card-border)]">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-400 hover:bg-[var(--card2)] disabled:opacity-30 transition-colors"
              >
                &laquo;
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-400 hover:bg-[var(--card2)] disabled:opacity-30 transition-colors"
              >
                &lsaquo;
              </button>

              {pageRange.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-500">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      currentPage === p
                        ? 'text-white'
                        : 'text-gray-400 hover:bg-[var(--card2)]'
                    }`}
                    style={currentPage === p ? { background: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-400 hover:bg-[var(--card2)] disabled:opacity-30 transition-colors"
              >
                &rsaquo;
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="w-8 h-8 rounded-lg text-xs font-semibold text-gray-400 hover:bg-[var(--card2)] disabled:opacity-30 transition-colors"
              >
                &raquo;
              </button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default PointsPage;
