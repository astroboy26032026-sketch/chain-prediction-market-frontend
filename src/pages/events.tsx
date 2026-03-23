import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Clock, Users, Gift, Trophy, Zap, ChevronRight, X, Star, Target, Flame, Swords, Sparkles, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

/* ─── Mock event data ─── */
interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  bannerGradient: string;
  iconBg: string;
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
  /** Where the Join button navigates: 'referrals' | 'points' | 'points-trading' | 'reward' | null */
  joinRoute?: string | null;
}

const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt_quest',
    title: 'Daily Quest',
    subtitle: 'Complete daily tasks: login, trade & earn points!',
    description: 'Earn bonus points every day by completing quests — not just logging in! Trade tokens, create memes, join arena battles, and more. Streak bonuses multiply your daily earnings — 7-day streak gives 3x points! Points can be converted to tickets and spun for SOL rewards.',
    bannerGradient: 'linear-gradient(135deg, #1a0a00 0%, #4a2800 50%, #7c4a1a 100%)',
    iconBg: 'bg-orange-500/20',
    icon: <Gift size={28} className="text-orange-400" />,
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
    id: 'evt_referrals',
    title: 'Daily Referrals',
    subtitle: 'Invite friends & receive SOL directly!',
    description: 'Share your referral link and earn SOL directly to your wallet for every friend who joins and trades. No points, no waiting — real SOL rewards sent immediately when your referral makes their first trade. The more you refer, the more you earn!',
    bannerGradient: 'linear-gradient(135deg, #1a0a2e 0%, #3d1a78 50%, #6b21a8 100%)',
    iconBg: 'bg-purple-500/20',
    icon: <Users size={28} className="text-purple-400" />,
    badge: 'HOT',
    badgeColor: 'bg-red-500',
    status: 'live',
    startDate: '2026-03-10',
    endDate: '2026-04-10',
    participants: 3420,
    rewards: ['0.05 SOL per referral (direct)', '5x bonus week: 0.25 SOL/ref', 'Extra 10 SOL for 10+ referrals', 'Top referrer: Exclusive badge'],
    rules: ['Referred users must complete at least 1 trade', 'Self-referrals are not allowed', 'SOL sent directly to your wallet', 'No limit on referral earnings'],
    tags: ['Referral', 'SOL', 'Direct Reward'],
    joinRoute: 'referrals',
  },
  {
    id: 'evt_trading',
    title: 'Trading Volume Challenge',
    subtitle: 'Trade more, climb the leaderboard & win big!',
    description: 'Compete with other traders to reach the highest trading volume this week. Top 100 traders will share a prize pool of 500 SOL. All trades on the platform count toward your total volume. Track your progress on the leaderboard!',
    bannerGradient: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
    iconBg: 'bg-blue-500/20',
    icon: <Trophy size={28} className="text-blue-400" />,
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
    id: 'evt_club_mission',
    title: 'Club Mission Challenge',
    subtitle: 'Complete club missions & earn exclusive rewards!',
    description: 'Join your club and complete weekly missions together! Each mission earns Club Mission Points that can be redeemed for exclusive rewards. Missions range from trading volume targets to recruiting new members and winning arena wars. The top clubs with the most completed missions unlock bonus prize pools and exclusive club perks.',
    bannerGradient: 'linear-gradient(135deg, #0a1a2e 0%, #1a3a5e 40%, #2a5a8e 100%)',
    iconBg: 'bg-cyan-500/20',
    icon: <Target size={28} className="text-cyan-400" />,
    badge: 'NEW',
    badgeColor: 'bg-green-500',
    status: 'live',
    startDate: '2026-03-15',
    endDate: '2026-04-15',
    participants: 2180,
    rewards: ['Complete 5 missions: 500 Club Points', 'Complete 10 missions: 1500 Club Points + Spin Ticket', 'Top Club: 200 SOL prize pool', 'All participants: 2x point booster for 1 week'],
    rules: ['Must be a club member to participate', 'Missions reset weekly', 'Club Points are separate from Daily Points', 'Points can be redeemed in Rewards page'],
    tags: ['Club', 'Mission', 'Points', 'Rewards'],
    joinRoute: 'club-missions',
  },
  {
    id: 'evt_meme',
    title: 'Meme Token Launch Party',
    subtitle: 'Create a token & win prizes — Coming Soon!',
    description: 'Launch your own meme token during the event period! The most popular token (by holder count and trading volume) wins the grand prize. Extra rewards for creative token names and descriptions.',
    bannerGradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a2a 50%, #2d5016 100%)',
    iconBg: 'bg-green-500/20',
    icon: <Zap size={28} className="text-green-400" />,
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
    id: 'evt_arena',
    title: 'Arena Prediction Tournament',
    subtitle: 'Predict & win big in the Arena',
    description: 'Join the special Arena tournament with boosted prize pools! Make predictions on featured markets and compete for the top spot on the leaderboard. Top predictors win exclusive rewards.',
    bannerGradient: 'linear-gradient(135deg, #1a0000 0%, #4a0e0e 50%, #8b1a1a 100%)',
    iconBg: 'bg-red-500/20',
    icon: <Target size={28} className="text-red-400" />,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-04-01',
    endDate: '2026-04-15',
    participants: 0,
    rewards: ['Prize Pool: 1000 SOL', 'Best Accuracy: Exclusive NFT', 'Top 50: Share 200 SOL', 'Participation reward: 1 SOL each (first 500)'],
    rules: ['Must have Arena account', 'Minimum 5 predictions to qualify', 'Only featured markets count', 'Results verified on-chain'],
    tags: ['Arena', 'Tournament', 'Prediction'],
    joinRoute: null,
  },
  {
    id: 'evt_club_war',
    title: 'Club Faction War',
    subtitle: 'Rally your club & dominate the battlefield!',
    description: 'Clubs go head-to-head in weekly faction wars! Each club competes through trading volume, arena wins, and member activity. The winning club earns exclusive rewards, boosted point multipliers, and bragging rights. Recruit members, coordinate strategies, and climb the global club ranking!',
    bannerGradient: 'linear-gradient(135deg, #1a0520 0%, #3a0a30 40%, #6b1050 100%)',
    iconBg: 'bg-pink-500/20',
    icon: <Swords size={28} className="text-pink-400" />,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-04-07',
    endDate: '2026-04-28',
    participants: 0,
    rewards: ['Winning Club: 300 SOL pool', 'Top Club MVP: 50 SOL', 'All members of top 3 clubs: 2x point booster', 'Participation: Club XP badge'],
    rules: ['Must be a club member to participate', 'All member activities contribute to club score', 'War resets weekly', 'Inactive clubs are auto-removed from ranking'],
    tags: ['Club', 'War', 'Faction'],
    joinRoute: 'clubs',
  },
  {
    id: 'evt_staking',
    title: 'Staking Boost Week',
    subtitle: 'Double APY on all staking pools',
    description: 'For one week only, all staking pools offer 2x APY! Stake your tokens now to maximize your earnings. Early stakers get an additional bonus of 0.5% extra APY.',
    bannerGradient: 'linear-gradient(135deg, #001a1a 0%, #003d3d 50%, #006666 100%)',
    iconBg: 'bg-teal-500/20',
    icon: <Star size={28} className="text-teal-400" />,
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
    bannerGradient: 'linear-gradient(135deg, #1a1000 0%, #4a3500 40%, #7c5a1a 100%)',
    iconBg: 'bg-yellow-500/20',
    icon: <Sparkles size={28} className="text-yellow-400" />,
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
    bannerGradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a2a4a 50%, #2a4a7a 100%)',
    iconBg: 'bg-indigo-500/20',
    icon: <TrendingUp size={28} className="text-indigo-400" />,
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
  {
    id: 'evt_art',
    title: 'Community Art Contest',
    subtitle: 'Design the next platform mascot',
    description: 'Submit your best crypto/meme artwork for a chance to become the official platform mascot! Community voting will decide the winner. The winning design will be featured across the platform.',
    bannerGradient: 'linear-gradient(135deg, #1a0a20 0%, #2d1b4e 50%, #4a2c7a 100%)',
    iconBg: 'bg-pink-500/20',
    icon: <Flame size={28} className="text-pink-400" />,
    badge: 'ENDED',
    badgeColor: 'bg-gray-500',
    status: 'ended',
    startDate: '2026-02-01',
    endDate: '2026-03-01',
    participants: 342,
    rewards: ['Winner: 150 SOL + Featured on platform', 'Runner-up: 50 SOL', 'Top 10: 10 SOL each', 'All participants: Exclusive badge'],
    rules: ['Original artwork only', 'Must be crypto/meme themed', 'Submission via platform upload', 'Community voting for top 10, judges pick winner'],
    tags: ['Community', 'Art', 'Contest'],
    joinRoute: null,
  },
];

/* ─── helpers ─── */
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

/* ─── Event Detail Modal ─── */
const EventModal: React.FC<{ event: EventItem; onClose: () => void; onNavigate?: (event: EventItem) => void }> = ({ event, onClose, onNavigate }) => {
  const statusColor = event.status === 'live' ? 'text-green-400' : event.status === 'upcoming' ? 'text-yellow-400' : 'text-gray-400';
  const statusLabel = event.status === 'live' ? 'Live Now' : event.status === 'upcoming' ? 'Coming Soon' : 'Ended';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner header */}
        <div className="relative h-40 rounded-t-2xl overflow-hidden" style={{ background: event.bannerGradient }}>
          <div className="absolute inset-0 flex items-center justify-between px-6">
            <div>
              <div className={`text-xs font-bold ${statusColor} mb-1 flex items-center gap-1.5`}>
                {event.status === 'live' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                {statusLabel}
              </div>
              <h2 className="text-2xl font-extrabold text-white">{event.title}</h2>
              <p className="text-sm text-gray-300 mt-1">{event.subtitle}</p>
            </div>
            <div className={`w-16 h-16 rounded-2xl ${event.iconBg} flex items-center justify-center`}>
              {event.icon}
            </div>
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--card2)] rounded-xl p-3 text-center">
              <div className="text-[11px] text-gray-500 mb-1">Participants</div>
              <div className="text-lg font-bold text-[var(--primary)]">{event.participants.toLocaleString()}</div>
              {event.maxParticipants && (
                <div className="text-[10px] text-gray-500">/ {event.maxParticipants.toLocaleString()} max</div>
              )}
            </div>
            <div className="bg-[var(--card2)] rounded-xl p-3 text-center">
              <div className="text-[11px] text-gray-500 mb-1">Duration</div>
              <div className="text-sm font-bold text-white">{formatDate(event.startDate)}</div>
              <div className="text-[10px] text-gray-500">→ {formatDate(event.endDate)}</div>
            </div>
            <div className="bg-[var(--card2)] rounded-xl p-3 text-center">
              <div className="text-[11px] text-gray-500 mb-1">Time Left</div>
              <div className={`text-lg font-bold ${event.status === 'live' ? 'text-green-400' : event.status === 'upcoming' ? 'text-yellow-400' : 'text-gray-500'}`}>
                {event.status === 'upcoming' ? 'Not started' : daysLeft(event.endDate)}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="text-sm font-bold text-[var(--foreground)] block mb-2">About</span>
            <p className="text-sm text-gray-400 leading-relaxed">{event.description}</p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {event.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--card2)] text-gray-400 border border-[var(--card-border)]">
                {tag}
              </span>
            ))}
          </div>

          {/* Rewards */}
          <div>
            <span className="text-sm font-bold text-[var(--foreground)] block mb-2">Rewards</span>
            <div className="space-y-2">
              {event.rewards.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Gift size={14} className="text-[var(--primary)] shrink-0" />
                  <span className="text-gray-300">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div>
            <span className="text-sm font-bold text-[var(--foreground)] block mb-2">Rules</span>
            <div className="space-y-2">
              {event.rules.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 shrink-0 mt-0.5">•</span>
                  <span className="text-gray-400">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Join button */}
          {event.status !== 'ended' && (
            <button
              className="btn btn-primary w-full py-3 text-sm font-bold"
              onClick={() => {
                onClose();
                onNavigate?.(event);
              }}
            >
              {event.status === 'upcoming' ? 'Notify Me' : 'Join Event'}
            </button>
          )}
        </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
      </div>
    </div>
  );
};

/* ─── Event Banner Card ─── */
const EventBanner: React.FC<{ event: EventItem; onJoin: () => void; onNavigate?: (event: EventItem) => void }> = ({ event, onJoin, onNavigate }) => {
  const tLeft = daysLeft(event.endDate);

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group border border-[var(--card-border)] hover:border-[var(--primary)]/50 transition-all"
      onClick={onJoin}
    >
      {/* Banner background */}
      <div className="relative h-[160px] sm:h-[180px]" style={{ background: event.bannerGradient }}>
        {/* Decorative glow */}
        <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity"
          style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 60%)' }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex items-center px-5 sm:px-8">
          <div className="flex-1 min-w-0">
            {/* Badge */}
            {event.badge && (
              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-extrabold text-white ${event.badgeColor} mb-2 shadow-lg`}>
                {event.badge}
              </span>
            )}

            <h3 className="text-lg sm:text-xl font-extrabold text-white mb-1 leading-tight group-hover:text-[var(--primary)] transition-colors">
              {event.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-300/80 mb-3 line-clamp-1">{event.subtitle}</p>

            {/* Stats */}
            <div className="flex items-center gap-4 text-[11px] text-gray-400">
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
              {event.status === 'ended' && (
                <span className="text-gray-500 font-semibold">Ended</span>
              )}
              <span className="flex items-center gap-1">
                <Users size={12} /> {event.participants.toLocaleString()} joined
              </span>
              {event.status === 'live' && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {tLeft}
                </span>
              )}
            </div>
          </div>

          {/* Icon + Join button */}
          <div className="flex flex-col items-center gap-3 shrink-0 ml-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${event.iconBg} flex items-center justify-center backdrop-blur-sm border border-white/10`}>
              {event.icon}
            </div>
            {event.status === 'upcoming' && !event.joinRoute ? (
              <span className="px-4 py-1.5 rounded-lg text-xs font-bold text-yellow-300 bg-yellow-500/15 border border-yellow-500/30">
                Soon
              </span>
            ) : (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (event.joinRoute && onNavigate) {
                    onNavigate(event);
                  } else {
                    onJoin();
                  }
                }}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                {event.status === 'ended' ? 'View' : 'Join'} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Events Page ─── */
export default function EventsPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

  const filteredEvents = MOCK_EVENTS.filter(e => filter === 'all' || e.status === filter);

  const liveCount = MOCK_EVENTS.filter(e => e.status === 'live').length;
  const upcomingCount = MOCK_EVENTS.filter(e => e.status === 'upcoming').length;

  const handleNavigate = (event: EventItem) => {
    if (!event.joinRoute) return;

    const route = event.joinRoute;
    if (route === 'referrals') {
      router.push('/referrals');
    } else if (route === 'points' || route === 'points-trading') {
      if (!address) { toast.error('Please connect your wallet first'); return; }
      router.push(`/point/${address}${route === 'points-trading' ? '?tab=trading' : ''}`);
    } else if (route === 'reward') {
      if (!address) { toast.error('Please connect your wallet first'); return; }
      router.push(`/reward/${address}`);
    } else if (route === 'clubs') {
      router.push('/clubs');
    } else if (route === 'club-missions') {
      if (!address) { toast.error('Please connect your wallet first'); return; }
      router.push(`/point/${address}?tab=club`);
    }
  };

  return (
    <Layout>
      <SEO title="Events" description="Join exciting events and earn rewards" />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--primary)]">Events</h1>
            <p className="text-sm text-gray-400 mt-1">{liveCount} live · {upcomingCount} upcoming</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6">
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

        {/* Banner list */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-2">No events found</div>
            <div className="text-xs text-gray-500">Check back later for new events!</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map(event => (
              <EventBanner key={event.id} event={event} onJoin={() => setSelectedEvent(event)} onNavigate={handleNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onNavigate={handleNavigate} />
      )}
    </Layout>
  );
}
