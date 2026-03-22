import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Clock, Users, Gift, Trophy, Zap, ChevronRight, X, Star, Target, Flame } from 'lucide-react';

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
}

const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt_1',
    title: 'Trading Volume Challenge',
    subtitle: 'Trade more, earn more rewards!',
    description: 'Compete with other traders to reach the highest trading volume this week. Top 100 traders will share a prize pool of 500 SOL. All trades on the platform count toward your total volume.',
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
  },
  {
    id: 'evt_2',
    title: 'Refer & Earn Bonus',
    subtitle: 'Invite friends, get 5x referral rewards',
    description: 'During this limited-time event, all referral rewards are multiplied by 5x! Invite your friends to join the platform and earn bonus SOL for every successful referral. No limit on earnings.',
    bannerGradient: 'linear-gradient(135deg, #1a0a2e 0%, #3d1a78 50%, #6b21a8 100%)',
    iconBg: 'bg-purple-500/20',
    icon: <Users size={28} className="text-purple-400" />,
    badge: '5X',
    badgeColor: 'bg-purple-500',
    status: 'live',
    startDate: '2026-03-10',
    endDate: '2026-04-10',
    participants: 3420,
    rewards: ['5x referral bonus on all invites', 'Extra 10 SOL for 10+ referrals', 'Exclusive NFT badge for top referrers'],
    rules: ['Referred users must complete at least 1 trade', 'Self-referrals are not allowed', 'Rewards distributed weekly'],
    tags: ['Referral', 'Bonus', 'Social'],
  },
  {
    id: 'evt_3',
    title: 'Meme Token Launch Party',
    subtitle: 'Create a token & win prizes',
    description: 'Launch your own meme token during the event period! The most popular token (by holder count and trading volume) wins the grand prize. Extra rewards for creative token names and descriptions.',
    bannerGradient: 'linear-gradient(135deg, #0a1628 0%, #1a3a2a 50%, #2d5016 100%)',
    iconBg: 'bg-green-500/20',
    icon: <Zap size={28} className="text-green-400" />,
    badge: 'NEW',
    badgeColor: 'bg-green-500',
    status: 'live',
    startDate: '2026-03-18',
    endDate: '2026-04-01',
    participants: 567,
    maxParticipants: 1000,
    rewards: ['Grand Prize: 200 SOL', 'Best Name Award: 50 SOL', 'Most Holders: 50 SOL', 'Community Vote Winner: 30 SOL'],
    rules: ['Token must be created during event period', 'No NSFW content', 'Token must have valid description and logo', 'Judging based on holders, volume, and community votes'],
    tags: ['Creation', 'Meme', 'Launch'],
  },
  {
    id: 'evt_4',
    title: 'Daily Login Rewards',
    subtitle: 'Log in every day for bonus points',
    description: 'Connect your wallet and visit the platform daily to earn bonus points. Streak bonuses multiply your daily earnings — 7-day streak gives 3x points! Points can be redeemed for SOL rewards.',
    bannerGradient: 'linear-gradient(135deg, #1a0a00 0%, #4a2800 50%, #7c4a1a 100%)',
    iconBg: 'bg-orange-500/20',
    icon: <Gift size={28} className="text-orange-400" />,
    status: 'live',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    participants: 8920,
    rewards: ['Day 1-3: 10 points/day', 'Day 4-6: 25 points/day', 'Day 7+: 50 points/day (3x streak)', '30-day streak: Bonus 500 points'],
    rules: ['Must connect wallet to claim', 'One claim per day per wallet', 'Streak resets if you miss a day', 'Points redeemable at end of month'],
    tags: ['Daily', 'Points', 'Streak'],
  },
  {
    id: 'evt_5',
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
  },
  {
    id: 'evt_6',
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
  },
  {
    id: 'evt_7',
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
const EventModal: React.FC<{ event: EventItem; onClose: () => void }> = ({ event, onClose }) => {
  const statusColor = event.status === 'live' ? 'text-green-400' : event.status === 'upcoming' ? 'text-yellow-400' : 'text-gray-400';
  const statusLabel = event.status === 'live' ? 'Live Now' : event.status === 'upcoming' ? 'Coming Soon' : 'Ended';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--card)] border border-[var(--card-border)] rounded-2xl shadow-2xl"
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
                // TODO: integrate with BE when ready
              }}
            >
              {event.status === 'upcoming' ? 'Notify Me' : 'Join Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Event Banner Card ─── */
const EventBanner: React.FC<{ event: EventItem; onJoin: () => void }> = ({ event, onJoin }) => {
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
            <button
              onClick={e => { e.stopPropagation(); onJoin(); }}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
            >
              {event.status === 'ended' ? 'View' : 'Join'} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Events Page ─── */
export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all');

  const filteredEvents = MOCK_EVENTS.filter(e => filter === 'all' || e.status === filter);

  const liveCount = MOCK_EVENTS.filter(e => e.status === 'live').length;
  const upcomingCount = MOCK_EVENTS.filter(e => e.status === 'upcoming').length;

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
              <EventBanner key={event.id} event={event} onJoin={() => setSelectedEvent(event)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </Layout>
  );
}
