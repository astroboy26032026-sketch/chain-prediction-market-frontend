import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Clock, Users, ChevronRight } from 'lucide-react';

const SPACE_GRADIENT = 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0d1220 100%)';

/* ─── Mock event data ─── */
interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  status: 'live' | 'upcoming' | 'ended';
  startDate: string;
  endDate: string;
  participants: number;
  maxParticipants?: number;
  rewards: string[];
  rules: string[];
  tags: string[];
  joinRoute?: string | null;
}

const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt_quest',
    title: 'Daily Quest',
    subtitle: 'Complete daily tasks: login, trade & earn points!',
    description: 'Earn bonus points every day by completing quests — not just logging in! Trade tokens, create memes, join arena battles, and more. Streak bonuses multiply your daily earnings — 7-day streak gives 3x points! Points can be converted to tickets and spun for SOL rewards.',
    icon: <span className="text-2xl">🌠</span>,
    badge: 'NEW',
    badgeColor: 'bg-green-500',
    status: 'live',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    participants: 8920,
    rewards: ['Login: 10 pts/day', 'Trade 1 token: 20 pts', 'Create token: 50 pts', '7-day streak: 3x multiplier', '30-day streak: Bonus 500 pts'],
    rules: ['Must connect wallet to claim', 'One claim per task per day', 'Streak resets if you miss a day', 'Points convertible to spin tickets'],
    tags: ['Daily', 'Quest', 'Points'],
    joinRoute: 'points',
  },
  {
    id: 'evt_trading',
    title: 'Trading Volume Challenge',
    subtitle: 'Trade more, climb the leaderboard & win big!',
    description: 'Compete with other traders to reach the highest trading volume this week. Top 100 traders will share a prize pool of 500 SOL.',
    icon: <span className="text-2xl">🚀</span>,
    badge: 'HOT',
    badgeColor: 'bg-red-500',
    status: 'live',
    startDate: '2026-03-15',
    endDate: '2026-03-29',
    participants: 1245,
    rewards: ['1st Place: 100 SOL', '2nd Place: 50 SOL', '3rd Place: 25 SOL', 'Top 10: 15 SOL each', 'Top 100: 2 SOL each'],
    rules: ['Minimum trade amount: 0.1 SOL per trade', 'Both buy and sell count toward volume', 'Wash trading will result in disqualification', 'Winners announced within 48h after event ends'],
    tags: ['Trading', 'Competition', 'Rewards'],
    joinRoute: 'points-trading',
  },
  {
    id: 'evt_meme',
    title: 'Meme Token Launch Party',
    subtitle: 'Create a token & win prizes — Coming Soon!',
    description: 'Launch your own meme token during the event period! The most popular token wins the grand prize.',
    icon: <span className="text-2xl">🪐</span>,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-04-01',
    endDate: '2026-04-15',
    participants: 0,
    maxParticipants: 1000,
    rewards: ['Grand Prize: 200 SOL', 'Best Name Award: 50 SOL', 'Most Holders: 50 SOL', 'Community Vote Winner: 30 SOL'],
    rules: ['Token must be created during event period', 'No NSFW content', 'Token must have valid description and logo', 'Judging based on holders, volume, and community votes'],
    tags: ['Creation', 'Meme', 'Launch'],
    joinRoute: null,
  },
  {
    id: 'evt_staking',
    title: 'Staking Boost Week',
    subtitle: 'Double APY on all staking pools',
    description: 'For one week only, all staking pools offer 2x APY! Stake your tokens now to maximize your earnings.',
    icon: <span className="text-2xl">⭐</span>,
    status: 'upcoming',
    startDate: '2026-04-05',
    endDate: '2026-04-12',
    participants: 0,
    rewards: ['2x APY on all pools', 'Early bird bonus: +0.5% APY', 'Random airdrop to 10 stakers'],
    rules: ['Minimum stake: 1 SOL', 'Must maintain stake for full week', 'Early unstake forfeits bonus', 'APY calculated at time of stake'],
    tags: ['Staking', 'APY', 'Boost'],
    joinRoute: null,
  },
  {
    id: 'evt_lucky_spin',
    title: 'Lucky Wheel Spin',
    subtitle: 'Spin the wheel & win instant SOL prizes!',
    description: 'Use your spin tickets earned from trading and daily quests to spin the Lucky Wheel for a chance to win instant SOL prizes!',
    icon: <span className="text-2xl">🌌</span>,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-04-15',
    endDate: '2026-05-15',
    participants: 0,
    rewards: ['Jackpot: 50 SOL', 'Grand: 10 SOL', 'Major: 5 SOL', 'Minor: 1 SOL', 'Consolation: 0.1 SOL'],
    rules: ['1 spin ticket per spin', 'Earn tickets from daily quests & trading', 'Prizes sent directly to wallet', 'Daily spin bonus: 2x chance on first spin'],
    tags: ['Spin', 'Lucky', 'Instant Reward'],
    joinRoute: 'reward',
  },
  {
    id: 'evt_volume_race',
    title: 'Weekly Volume Race',
    subtitle: 'Top traders earn bonus point multipliers',
    description: 'Track your weekly trading volume against other traders! Top performers unlock exclusive point multipliers for the following week.',
    icon: <span className="text-2xl">☄️</span>,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-04-07',
    endDate: '2026-04-14',
    participants: 0,
    rewards: ['Top 10: 5x point multiplier next week', 'Top 50: 3x point multiplier', 'Top 100: 2x point multiplier', 'All participants: 1.5x base multiplier'],
    rules: ['Volume resets every Monday 00:00 UTC', 'Min 0.01 SOL per trade counts', 'Wash trading is auto-detected', 'Multiplier applied automatically'],
    tags: ['Weekly', 'Volume', 'Multiplier'],
    joinRoute: 'points-trading',
  },
];

/* ─── helpers ─── */
function daysLeft(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.ceil(diff / 86_400_000);
  return `${d}d left`;
}

/* ─── Event Banner Card ─── */
const EventBanner: React.FC<{ event: EventItem }> = ({ event }) => {
  const router = useRouter();
  const tLeft = daysLeft(event.endDate);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/10 hover:border-[var(--primary)]/40 transition-all"
      style={{ background: SPACE_GRADIENT }}
      onClick={() => router.push(`/events/${event.id}`)}
    >
      <div className="relative h-[140px]">
        {/* Glow */}
        <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(124,111,255,0.3) 0%, transparent 60%)' }}
        />

        <div className="absolute inset-0 flex items-center px-4">
          <div className="flex-1 min-w-0">
            {event.badge && (
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white ${event.badgeColor} mb-1.5 shadow-lg`}>
                {event.badge}
              </span>
            )}
            <h3 className="text-sm font-extrabold text-white mb-0.5 leading-tight group-hover:text-[var(--primary)] transition-colors line-clamp-2">
              {event.title}
            </h3>
            <p className="text-[11px] text-gray-400 mb-2 line-clamp-1">{event.subtitle}</p>

            <div className="flex items-center gap-4 text-[11px] text-gray-500">
              {event.status === 'live' && (
                <span className="flex items-center gap-1 text-green-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                </span>
              )}
              {event.status === 'upcoming' && (
                <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                  <Clock size={12} /> Coming Soon
                </span>
              )}
              {event.status === 'ended' && <span className="text-gray-500 font-semibold">Ended</span>}
              <span className="flex items-center gap-1">
                <Users size={12} /> {event.participants.toLocaleString()} joined
              </span>
              {event.status === 'live' && (
                <span className="flex items-center gap-1"><Clock size={12} /> {tLeft}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 shrink-0 ml-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              {event.icon}
            </div>
            <button
              onClick={e => { e.stopPropagation(); router.push(`/events/${event.id}`); }}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
            >
              View <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Promote Page ─── */
export default function PromotePage() {
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

  const filteredEvents = MOCK_EVENTS.filter(e => filter === 'all' || e.status === filter);
  const liveCount = MOCK_EVENTS.filter(e => e.status === 'live').length;
  const upcomingCount = MOCK_EVENTS.filter(e => e.status === 'upcoming').length;

  return (
    <Layout>
      <SEO title="Promote" description="Join exciting promotions and earn rewards" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--primary)]">Promote</h1>
          <p className="text-sm text-gray-400 mt-1">{liveCount} live · {upcomingCount} upcoming</p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['all', 'live', 'upcoming', 'ended'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
                filter === f
                  ? 'text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 bg-[var(--card)] border border-[var(--card-border)]'
              }`}
              style={filter === f ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
            >
              {f}
              {f === 'live' && liveCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-green-500/20 text-green-400">{liveCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Banner grid — 3 per row */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-2">No promotions found</div>
            <div className="text-xs text-gray-500">Check back later!</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(event => (
              <EventBanner key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
