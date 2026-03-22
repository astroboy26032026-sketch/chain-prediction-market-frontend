/* ─── Club / Faction War — Mock Data ─── */

export type ClubCategory = 'token' | 'creator' | 'meme' | 'football' | 'anime' | 'shitpost';

export const CLUB_CATEGORIES: { value: ClubCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'token', label: 'Token Club' },
  { value: 'creator', label: 'Creator' },
  { value: 'meme', label: 'Meme' },
  { value: 'football', label: 'Football' },
  { value: 'anime', label: 'Anime' },
  { value: 'shitpost', label: 'Shitpost' },
];

export interface ClubMember {
  address: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'og' | 'member';
  points: number;
  joinedAt: string;
  streak: number;
  arenaWins: number;
}

export interface ClubMission {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'trade' | 'invite' | 'vote' | 'share' | 'hold' | 'create';
  progress: number;
  target: number;
  expiresAt: string;
}

export interface ClubArenaWar {
  id: string;
  opponentClub: string;
  opponentAvatar: string;
  status: 'live' | 'upcoming' | 'completed';
  startTime: string;
  endTime: string;
  myClubScore: number;
  opponentScore: number;
  totalBets: number;
  participants: number;
}

export interface ClubFeedItem {
  id: string;
  author: string;
  authorAvatar?: string;
  authorRole: 'owner' | 'admin' | 'og' | 'member';
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  type: 'post' | 'achievement' | 'war_result' | 'mission_complete';
}

export interface Club {
  id: string;
  name: string;
  tag: string;
  description: string;
  avatar: string;
  banner: string;
  category: ClubCategory;
  owner: string;
  ownerName: string;
  members: number;
  maxMembers: number;
  weeklyPoints: number;
  totalPoints: number;
  rank: number;
  level: number;
  winRate: number;
  arenaWins: number;
  arenaLosses: number;
  weeklyRank: number;
  streak: number;
  isPublic: boolean;
  linkedToken?: string;
  linkedTokenName?: string;
  createdAt: string;
  tags: string[];
  perks: string[];
}

const now = Date.now();
const past = (h: number) => new Date(now - h * 3_600_000).toISOString();
const future = (h: number) => new Date(now + h * 3_600_000).toISOString();

export const MOCK_CLUBS: Club[] = [
  {
    id: 'club_pepe',
    name: 'PEPE Army',
    tag: 'PEPE',
    description: 'The ultimate PEPE holders club. Diamond hands only. We raid, we vote, we win arenas together. Join the frog revolution!',
    avatar: '🐸',
    banner: 'linear-gradient(135deg, #0a2e1a 0%, #1a5c34 50%, #2d8b4e 100%)',
    category: 'token',
    owner: '7xK9...mP3q',
    ownerName: 'PepeKing',
    members: 1245,
    maxMembers: 5000,
    weeklyPoints: 45200,
    totalPoints: 892000,
    rank: 1,
    level: 12,
    winRate: 72,
    arenaWins: 28,
    arenaLosses: 11,
    weeklyRank: 1,
    streak: 5,
    isPublic: true,
    linkedToken: 'pepe_mint_address',
    linkedTokenName: 'PEPE',
    createdAt: past(720),
    tags: ['Meme', 'OG', 'Diamond Hands'],
    perks: ['Free Arena entry weekly', '2x point boost', 'Exclusive chat', 'Club NFT badge'],
  },
  {
    id: 'club_doge',
    name: 'Doge Pack',
    tag: 'DOGE',
    description: 'Much wow. Very club. Such community. The original meme coin believers unite here for arena wars and meme supremacy.',
    avatar: '🐕',
    banner: 'linear-gradient(135deg, #2e1a00 0%, #5c3a0a 50%, #8b6b2d 100%)',
    category: 'token',
    owner: '4aB2...nR8x',
    ownerName: 'DogeWhale',
    members: 980,
    maxMembers: 5000,
    weeklyPoints: 38500,
    totalPoints: 756000,
    rank: 2,
    level: 10,
    winRate: 65,
    arenaWins: 22,
    arenaLosses: 12,
    weeklyRank: 2,
    streak: 3,
    isPublic: true,
    linkedToken: 'doge_mint_address',
    linkedTokenName: 'DOGE',
    createdAt: past(600),
    tags: ['Meme', 'OG', 'Moon'],
    perks: ['Free Arena entry weekly', '1.5x point boost', 'Exclusive chat'],
  },
  {
    id: 'club_sol_maxis',
    name: 'SOL Maxis',
    tag: 'SOLM',
    description: 'Solana believers only. We trade, stake, and dominate arenas on the fastest chain. Speed is our weapon.',
    avatar: '☀️',
    banner: 'linear-gradient(135deg, #1a0a2e 0%, #3d1a78 50%, #6b21a8 100%)',
    category: 'token',
    owner: '9zX1...kL5m',
    ownerName: 'SolMaxi',
    members: 856,
    maxMembers: 3000,
    weeklyPoints: 32100,
    totalPoints: 621000,
    rank: 3,
    level: 9,
    winRate: 68,
    arenaWins: 19,
    arenaLosses: 9,
    weeklyRank: 3,
    streak: 7,
    isPublic: true,
    linkedToken: 'sol_mint',
    linkedTokenName: 'SOL',
    createdAt: past(480),
    tags: ['L1', 'Speed', 'DeFi'],
    perks: ['2x point boost', 'Priority Arena slots', 'Staking bonus'],
  },
  {
    id: 'club_degen_trading',
    name: 'Degen Traders',
    tag: 'DEGEN',
    description: 'We ape in, we ape out. High risk, high reward. The most aggressive trading club on the platform. Not for the faint-hearted.',
    avatar: '🦍',
    banner: 'linear-gradient(135deg, #1a0000 0%, #4a0e0e 50%, #8b1a1a 100%)',
    category: 'creator',
    owner: '2mK8...pQ4r',
    ownerName: 'DegenAlpha',
    members: 678,
    maxMembers: 2000,
    weeklyPoints: 28900,
    totalPoints: 534000,
    rank: 4,
    level: 8,
    winRate: 58,
    arenaWins: 15,
    arenaLosses: 11,
    weeklyRank: 5,
    streak: 2,
    isPublic: true,
    createdAt: past(360),
    tags: ['Trading', 'Degen', 'Alpha'],
    perks: ['Trading signals channel', 'Arena booster', 'Exclusive mints'],
  },
  {
    id: 'club_meme_lords',
    name: 'Meme Lords',
    tag: 'MEME',
    description: 'We create the memes that move markets. If it goes viral, it started here. Join us to unleash your inner meme lord.',
    avatar: '👑',
    banner: 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 100%)',
    category: 'meme',
    owner: '5tR3...wE7n',
    ownerName: 'MemeLord420',
    members: 1520,
    maxMembers: 10000,
    weeklyPoints: 51000,
    totalPoints: 1020000,
    rank: 5,
    level: 14,
    winRate: 70,
    arenaWins: 35,
    arenaLosses: 15,
    weeklyRank: 4,
    streak: 4,
    isPublic: true,
    createdAt: past(900),
    tags: ['Meme', 'Viral', 'Culture'],
    perks: ['Meme creation tools', '3x point on meme tokens', 'Weekly meme contest', 'Club treasury share'],
  },
  {
    id: 'club_fc_degen',
    name: 'FC Degens',
    tag: 'FCD',
    description: 'Football meets crypto. We bet on matches, predict scores, and war with other football clubs in the arena. Champions League of degen.',
    avatar: '⚽',
    banner: 'linear-gradient(135deg, #001a0a 0%, #003d1a 50%, #006630 100%)',
    category: 'football',
    owner: '8nM4...jK2s',
    ownerName: 'FootballDegen',
    members: 432,
    maxMembers: 2000,
    weeklyPoints: 18500,
    totalPoints: 312000,
    rank: 6,
    level: 6,
    winRate: 62,
    arenaWins: 12,
    arenaLosses: 8,
    weeklyRank: 7,
    streak: 1,
    isPublic: true,
    createdAt: past(240),
    tags: ['Football', 'Sports', 'Betting'],
    perks: ['Match day predictions', 'Sports arena priority', 'Weekly prize pool'],
  },
  {
    id: 'club_anime_degens',
    name: 'Anime Degens',
    tag: 'WEEB',
    description: 'Otaku traders unite! We support anime-themed tokens, create anime memes, and battle in style. Nani?!',
    avatar: '🎌',
    banner: 'linear-gradient(135deg, #1a0020 0%, #3d0050 50%, #6b0088 100%)',
    category: 'anime',
    owner: '3qW6...hN9t',
    ownerName: 'NarutoTrader',
    members: 567,
    maxMembers: 3000,
    weeklyPoints: 22300,
    totalPoints: 423000,
    rank: 7,
    level: 7,
    winRate: 55,
    arenaWins: 10,
    arenaLosses: 8,
    weeklyRank: 6,
    streak: 2,
    isPublic: true,
    createdAt: past(300),
    tags: ['Anime', 'Culture', 'Art'],
    perks: ['Anime NFT airdrops', 'Themed arena battles', 'Art contest weekly'],
  },
  {
    id: 'club_shitpost_elite',
    name: 'Shitpost Elite',
    tag: 'SHIT',
    description: 'We post garbage and somehow make money. The most unhinged club on the platform. Warning: brain cells may be lost.',
    avatar: '💩',
    banner: 'linear-gradient(135deg, #1a1a00 0%, #3d3d0a 50%, #5c5c1a 100%)',
    category: 'shitpost',
    owner: '6pL2...mQ8w',
    ownerName: 'ShitpostKing',
    members: 890,
    maxMembers: 5000,
    weeklyPoints: 35600,
    totalPoints: 678000,
    rank: 8,
    level: 11,
    winRate: 52,
    arenaWins: 18,
    arenaLosses: 17,
    weeklyRank: 8,
    streak: 0,
    isPublic: true,
    createdAt: past(540),
    tags: ['Shitpost', 'Chaos', 'Fun'],
    perks: ['Chaos mode arena', 'Meme bounties', 'Weekly roast contest'],
  },
  {
    id: 'club_wif_gang',
    name: 'WIF Gang',
    tag: 'WIF',
    description: 'Dog wif hat holders assemble. We are the cutest and most profitable club. Every dog has its day.',
    avatar: '🐶',
    banner: 'linear-gradient(135deg, #0a1a2e 0%, #1a3a5c 50%, #2d5c8b 100%)',
    category: 'token',
    owner: '1xN7...rT4k',
    ownerName: 'WifHolder',
    members: 723,
    maxMembers: 3000,
    weeklyPoints: 26800,
    totalPoints: 489000,
    rank: 9,
    level: 8,
    winRate: 60,
    arenaWins: 14,
    arenaLosses: 10,
    weeklyRank: 9,
    streak: 3,
    isPublic: true,
    linkedToken: 'wif_mint',
    linkedTokenName: 'WIF',
    createdAt: past(400),
    tags: ['Meme', 'Dog', 'Solana'],
    perks: ['WIF holder bonus', 'Arena discount', 'Exclusive merch drops'],
  },
  {
    id: 'club_alpha_hunters',
    name: 'Alpha Hunters',
    tag: 'ALPHA',
    description: 'We find alpha before everyone else. Research-driven, data-backed, and always first. Private intel for members only.',
    avatar: '🔍',
    banner: 'linear-gradient(135deg, #001a1a 0%, #003d3d 50%, #006666 100%)',
    category: 'creator',
    owner: '7hJ3...bM6p',
    ownerName: 'AlphaHunter',
    members: 345,
    maxMembers: 500,
    weeklyPoints: 41200,
    totalPoints: 567000,
    rank: 10,
    level: 9,
    winRate: 78,
    arenaWins: 25,
    arenaLosses: 7,
    weeklyRank: 10,
    streak: 8,
    isPublic: false,
    createdAt: past(500),
    tags: ['Alpha', 'Research', 'Elite'],
    perks: ['Private alpha channel', '3x Arena rewards', 'Early token info', 'Revenue share'],
  },
  {
    id: 'club_bonk_squad',
    name: 'BONK Squad',
    tag: 'BONK',
    description: 'BONK! We bonk the haters and bonk the charts. The most bonkers community on Solana.',
    avatar: '🔨',
    banner: 'linear-gradient(135deg, #2e1a00 0%, #5c340a 50%, #8b4e1a 100%)',
    category: 'token',
    owner: '4mR9...xK2j',
    ownerName: 'BonkMaster',
    members: 612,
    maxMembers: 3000,
    weeklyPoints: 24500,
    totalPoints: 445000,
    rank: 11,
    level: 7,
    winRate: 57,
    arenaWins: 13,
    arenaLosses: 10,
    weeklyRank: 11,
    streak: 1,
    isPublic: true,
    linkedToken: 'bonk_mint',
    linkedTokenName: 'BONK',
    createdAt: past(350),
    tags: ['Meme', 'Bonk', 'Community'],
    perks: ['BONK airdrops', 'Community raids', 'Meme contests'],
  },
  {
    id: 'club_real_madrid_fc',
    name: 'Hala Madrid Crypto',
    tag: 'RMCF',
    description: 'Real Madrid fans who also trade crypto. We dominate both La Liga arenas and crypto arenas. Hala Madrid!',
    avatar: '⚪',
    banner: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3d 50%, #2d2d66 100%)',
    category: 'football',
    owner: '5kH8...nW3m',
    ownerName: 'MadridFan',
    members: 389,
    maxMembers: 2000,
    weeklyPoints: 16800,
    totalPoints: 287000,
    rank: 12,
    level: 5,
    winRate: 64,
    arenaWins: 11,
    arenaLosses: 6,
    weeklyRank: 12,
    streak: 4,
    isPublic: true,
    createdAt: past(200),
    tags: ['Football', 'Real Madrid', 'La Liga'],
    perks: ['Match prediction rewards', 'Fan token bonus', 'Watch party channel'],
  },
];

/* ─── Mock feed data ─── */
export const MOCK_FEED: ClubFeedItem[] = [
  { id: 'f1', author: 'PepeKing', authorRole: 'owner', content: 'LFG! We just won 5 arena wars in a row! 🔥 Club streak is insane right now. Keep grinding soldiers!', timestamp: past(1), likes: 89, replies: 23, type: 'post' },
  { id: 'f2', author: 'System', authorRole: 'admin', content: '🏆 PEPE Army defeated Doge Pack in Arena War — Score: 1,250 vs 980! All participants earned 2x points!', timestamp: past(3), likes: 145, replies: 45, type: 'war_result' },
  { id: 'f3', author: 'DiamondFrog', authorRole: 'og', content: 'Just completed the "Hold 10K PEPE for 7 days" mission. Easy 500 points. Who else is stacking?', timestamp: past(5), likes: 56, replies: 12, type: 'mission_complete' },
  { id: 'f4', author: 'NewFrog', authorRole: 'member', content: 'Just joined the club! Excited to be part of the PEPE Army. What missions should I start with?', timestamp: past(8), likes: 34, replies: 18, type: 'post' },
  { id: 'f5', author: 'PepeKing', authorRole: 'owner', content: '📢 New Arena War starting tomorrow vs SOL Maxis! Everyone prepare your bets and votes. War meeting in 2 hours.', timestamp: past(12), likes: 112, replies: 67, type: 'post' },
  { id: 'f6', author: 'System', authorRole: 'admin', content: '🎯 Club Achievement Unlocked: "500 Active Members" — All members receive 100 bonus points!', timestamp: past(24), likes: 234, replies: 89, type: 'achievement' },
];

/* ─── Mock missions ─── */
export const MOCK_MISSIONS: ClubMission[] = [
  { id: 'm1', title: 'Trade Volume King', description: 'Club members trade $10K total volume', reward: 500, type: 'trade', progress: 7200, target: 10000, expiresAt: future(48) },
  { id: 'm2', title: 'Recruit 10 Soldiers', description: 'Invite 10 new members to the club', reward: 300, type: 'invite', progress: 6, target: 10, expiresAt: future(120) },
  { id: 'm3', title: 'Arena Domination', description: 'Win 3 arena wars this week', reward: 800, type: 'vote', progress: 2, target: 3, expiresAt: future(72) },
  { id: 'm4', title: 'Social Raid', description: 'Share 50 club posts on social media', reward: 200, type: 'share', progress: 32, target: 50, expiresAt: future(96) },
  { id: 'm5', title: 'Diamond Hands', description: 'Hold linked token for 7 days straight', reward: 400, type: 'hold', progress: 5, target: 7, expiresAt: future(48) },
  { id: 'm6', title: 'Token Creator', description: 'Club members create 5 new tokens', reward: 600, type: 'create', progress: 2, target: 5, expiresAt: future(168) },
];

/* ─── Mock arena wars ─── */
export const MOCK_WARS: ClubArenaWar[] = [
  { id: 'w1', opponentClub: 'Doge Pack', opponentAvatar: '🐕', status: 'live', startTime: past(2), endTime: future(22), myClubScore: 1580, opponentScore: 1320, totalBets: 450, participants: 312 },
  { id: 'w2', opponentClub: 'SOL Maxis', opponentAvatar: '☀️', status: 'upcoming', startTime: future(24), endTime: future(48), myClubScore: 0, opponentScore: 0, totalBets: 120, participants: 85 },
  { id: 'w3', opponentClub: 'Meme Lords', opponentAvatar: '👑', status: 'completed', startTime: past(48), endTime: past(24), myClubScore: 2100, opponentScore: 1890, totalBets: 680, participants: 445 },
  { id: 'w4', opponentClub: 'Shitpost Elite', opponentAvatar: '💩', status: 'completed', startTime: past(96), endTime: past(72), myClubScore: 1450, opponentScore: 1680, totalBets: 520, participants: 380 },
];

/* ─── Mock members ─── */
export const MOCK_MEMBERS: ClubMember[] = [
  { address: '7xK9...mP3q', name: 'PepeKing', role: 'owner', points: 45200, joinedAt: past(720), streak: 30, arenaWins: 28 },
  { address: '3qW6...hN9t', name: 'DiamondFrog', role: 'admin', points: 32100, joinedAt: past(600), streak: 22, arenaWins: 20 },
  { address: '5tR3...wE7n', name: 'PepeSoldier', role: 'og', points: 28500, joinedAt: past(500), streak: 18, arenaWins: 15 },
  { address: '8nM4...jK2s', name: 'FrogArmy', role: 'og', points: 21300, joinedAt: past(400), streak: 14, arenaWins: 12 },
  { address: '2mK8...pQ4r', name: 'GreenCandle', role: 'member', points: 18200, joinedAt: past(300), streak: 10, arenaWins: 8 },
  { address: '6pL2...mQ8w', name: 'MemeSniper', role: 'member', points: 15800, joinedAt: past(200), streak: 7, arenaWins: 6 },
  { address: '1xN7...rT4k', name: 'NewFrog', role: 'member', points: 8500, joinedAt: past(48), streak: 2, arenaWins: 1 },
  { address: '4aB2...nR8x', name: 'CryptoFrog', role: 'member', points: 6200, joinedAt: past(24), streak: 1, arenaWins: 0 },
];

export const CLUBS_PER_PAGE = 12;
