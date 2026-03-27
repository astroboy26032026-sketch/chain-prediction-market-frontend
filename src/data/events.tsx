import React from 'react';

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  status: 'live' | 'upcoming';
  startDate: string;
  endDate: string;
  participants: number;
  maxParticipants?: number;
  rewards: string[];
  rules: string[];
  tags: string[];
  joinRoute?: string | null;
}

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt_quest',
    title: 'Candy Quest',
    subtitle: 'Complete daily sweet missions to earn candy points!',
    description: 'Log in daily, trade markets, and refer friends to earn candy points. Build streaks for bonus multipliers — 7-day streak gives 3x points! Candy points can be converted to tickets for sweet mystery box rewards.',
    icon: <span className="text-2xl">🍭</span>,
    badge: 'LIVE',
    badgeColor: 'bg-pink-500',
    status: 'live',
    startDate: '2026-03-01',
    endDate: '2026-06-30',
    participants: 12480,
    rewards: ['Login: 10 pts/day', 'Trade any market: 20 pts', 'Refer a friend: 50 pts', '7-day streak: 3x multiplier', '30-day streak: 500 bonus pts'],
    rules: ['Connect wallet to participate', 'One claim per mission per day', 'Streak resets if you miss a day', 'Points convertible to candy tickets'],
    tags: ['Daily', 'Missions', 'Candy'],
    joinRoute: 'points',
  },
  {
    id: 'evt_trading',
    title: 'Sugar Rush Showdown',
    subtitle: 'Top traders share a 500 SOL prize pool!',
    description: 'Compete on the weekly trading volume leaderboard. All buys and sells count toward your total. Top 100 traders share a 500 SOL prize pool. Track your rank in real-time on the leaderboard.',
    icon: <span className="text-2xl">🍬</span>,
    badge: 'HOT',
    badgeColor: 'bg-rose-500',
    status: 'live',
    startDate: '2026-03-15',
    endDate: '2026-04-30',
    participants: 3210,
    rewards: ['1st Place: 100 SOL', '2nd Place: 50 SOL', '3rd Place: 25 SOL', 'Top 10: 15 SOL each', 'Top 100: 2 SOL each'],
    rules: ['Minimum 0.1 SOL per trade', 'Buy and sell both count', 'Wash trading = disqualification', 'Winners announced within 48h'],
    tags: ['Trading', 'Leaderboard', 'SOL Prizes'],
    joinRoute: 'points-trading',
  },
  {
    id: 'evt_mystery',
    title: 'Candy Box Festival',
    subtitle: 'Unwrap candy boxes for instant sweet prizes!',
    description: 'Use candy tickets earned from missions and trading to open mystery candy boxes. Win instant SOL prizes from 0.01 to 10 SOL! Daily bonus: your first candy box each day has 2x chance for bigger prizes.',
    icon: <span className="text-2xl">🎀</span>,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-04-20',
    endDate: '2026-06-20',
    participants: 0,
    rewards: ['Golden Lollipop: 10 SOL', 'Sugar Rush: 5 SOL', 'Sweet Surprise: 1 SOL', 'Candy Drop: 0.1 SOL'],
    rules: ['1 ticket per candy box', 'Earn tickets from missions & trading', 'Prizes sent to wallet instantly', 'First box daily: 2x big-prize chance'],
    tags: ['Candy', 'Instant Rewards', 'SOL'],
    joinRoute: 'reward',
  },
  {
    id: 'evt_referral',
    title: 'Sweet Referral Boost',
    subtitle: 'Invite friends, earn bonus candy for both!',
    description: 'Share your referral link with friends. When they connect their wallet and make their first trade, both of you earn 100 bonus candy points. Top referrers also earn exclusive multiplier badges for the season.',
    icon: <span className="text-2xl">🍩</span>,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-05-01',
    endDate: '2026-06-30',
    participants: 0,
    rewards: ['Per referral: 100 pts each', 'Top 10 referrers: 2x season multiplier', 'Top 50: 1.5x season multiplier', 'All referrers: exclusive candy badge'],
    rules: ['Friend must connect wallet', 'Friend must complete 1 trade', 'Self-referral not allowed', 'Points credited within 24h'],
    tags: ['Referral', 'Bonus', 'Candy'],
    joinRoute: null,
  },
  {
    id: 'evt_prediction',
    title: 'Prediction Pro Contest',
    subtitle: 'Best predictors win a sweetened prize pool!',
    description: 'Make predictions on active markets. The most accurate predictors by profit percentage win from a 300 SOL prize pool. Track your prediction accuracy on the leaderboard.',
    icon: <span className="text-2xl">🍡</span>,
    badge: 'SOON',
    badgeColor: 'bg-yellow-500',
    status: 'upcoming',
    startDate: '2026-04-15',
    endDate: '2026-05-15',
    participants: 0,
    maxParticipants: 2000,
    rewards: ['Grand Prize: 100 SOL', 'Best Accuracy: 50 SOL', 'Most Volume: 50 SOL', 'Community Vote: 30 SOL'],
    rules: ['Must make at least 5 predictions', 'Ranked by profit %', 'No manipulation allowed', 'Judging period: 30 days'],
    tags: ['Prediction', 'Contest', 'SOL Prizes'],
    joinRoute: null,
  },
];
