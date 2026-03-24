import React from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Clock, Users, Gift, Trophy, Zap, Star, Sparkles, TrendingUp } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';

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

const SPACE_GRADIENT = 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0d1220 100%)';

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
    description: 'Compete with other traders to reach the highest trading volume this week. Top 100 traders will share a prize pool of 500 SOL. All trades on the platform count toward your total volume. Track your progress on the leaderboard!',
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
    description: 'Launch your own meme token during the event period! The most popular token (by holder count and trading volume) wins the grand prize. Extra rewards for creative token names and descriptions.',
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
    description: 'For one week only, all staking pools offer 2x APY! Stake your tokens now to maximize your earnings. Early stakers get an additional bonus of 0.5% extra APY.',
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
    description: 'Use your spin tickets earned from trading and daily quests to spin the Lucky Wheel for a chance to win instant SOL prizes! Higher tier tickets unlock bigger prize pools. Spin daily for bonus multipliers!',
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
    description: 'Track your weekly trading volume against other traders! Top performers unlock exclusive point multipliers for the following week. The higher your rank, the bigger your multiplier. Even small traders can earn rewards by hitting personal milestones.',
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

function formatDate(d: string) {
  const date = new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function daysLeft(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.ceil(diff / 86_400_000);
  return `${d}d left`;
}

export default function EventDetailPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();
  const { id } = router.query;

  const event = MOCK_EVENTS.find(e => e.id === id);

  if (!event) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">🌌</div>
            <p className="opacity-60">Promote not found</p>
            <button onClick={() => router.push('/events')} className="mt-4 btn btn-primary px-4 py-2 text-sm">Back to Promote</button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusColor = event.status === 'live' ? 'text-green-400' : event.status === 'upcoming' ? 'text-yellow-400' : 'text-gray-400';
  const statusLabel = event.status === 'live' ? '● Live Now' : event.status === 'upcoming' ? 'Coming Soon' : 'Ended';

  const handleJoin = () => {
    if (!event.joinRoute) return;
    const route = event.joinRoute;
    if (route === 'points' || route === 'points-trading') {
      if (!address) { toast.error('Please connect your wallet first'); return; }
      router.push(`/point/${address}${route === 'points-trading' ? '?tab=trading' : ''}`);
    } else if (route === 'reward') {
      if (!address) { toast.error('Please connect your wallet first'); return; }
      router.push(`/reward/${address}`);
    }
  };

  return (
    <Layout>
      <SEO title={event.title} description={event.subtitle} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button onClick={() => router.push('/events')} className="flex items-center gap-1.5 text-sm opacity-50 hover:opacity-80 transition-opacity mb-6">
          ← Back to Promote
        </button>

        {/* Header card */}
        <div className="rounded-2xl border border-white/10 overflow-hidden mb-6"
          style={{ background: SPACE_GRADIENT }}
        >
          <div className="px-6 py-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {event.icon}
              </div>
              <div>
                {event.badge && (
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white ${event.badgeColor} mb-2`}>
                    {event.badge}
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">{event.title}</h1>
                <p className="text-sm text-gray-400 mt-1">{event.subtitle}</p>
                <div className={`mt-2 text-xs font-semibold ${statusColor}`}>{statusLabel}</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 border-t border-white/5">
            <div className="px-5 py-4 border-r border-white/5 text-center">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Participants</div>
              <div className="text-lg font-extrabold" style={{ color: 'var(--primary)' }}>{event.participants.toLocaleString()}</div>
              {event.maxParticipants && <div className="text-[10px] opacity-40">/ {event.maxParticipants.toLocaleString()} max</div>}
            </div>
            <div className="px-5 py-4 border-r border-white/5 text-center">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Duration</div>
              <div className="text-xs font-semibold">{formatDate(event.startDate)}</div>
              <div className="text-[10px] opacity-40">→ {formatDate(event.endDate)}</div>
            </div>
            <div className="px-5 py-4 text-center">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Time Left</div>
              <div className={`text-lg font-extrabold ${statusColor}`}>
                {event.status === 'upcoming' ? 'Not yet' : daysLeft(event.endDate)}
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl border border-white/10 p-5 mb-4" style={{ background: SPACE_GRADIENT }}>
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">About</div>
          <p className="text-sm text-gray-300 leading-relaxed">{event.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/10 opacity-60">{tag}</span>
            ))}
          </div>
        </div>

        {/* Step cards: Rewards + Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Rewards */}
          <div className="rounded-2xl border border-white/10 p-5" style={{ background: SPACE_GRADIENT }}>
            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">Rewards</div>
            <div className="space-y-2.5">
              {event.rewards.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff' }}>
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-300 pt-0.5">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="rounded-2xl border border-white/10 p-5" style={{ background: SPACE_GRADIENT }}>
            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">Rules</div>
            <div className="space-y-2.5">
              {event.rules.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold border border-white/15 opacity-60">
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-400 pt-0.5">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
