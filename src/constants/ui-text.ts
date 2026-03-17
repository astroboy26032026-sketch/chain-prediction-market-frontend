/**
 * Centralized UI text constants.
 * - Easy to update text in one place
 * - Ready for i18n later (swap this file with a translation loader)
 */

/* =========================
   Common / Shared
========================= */
export const COMMON = {
  LOADING: 'Loading…',
  LOAD_MORE: 'Load more',
  NO_DATA: 'No data',
  CONFIRM: 'Confirm',
  CANCEL: 'Cancel',
  BACK: 'Back',
  NEXT: 'Next',
  APPLY: 'Apply',
  CLEAR: 'Clear',
  ERROR: 'Error',
  COPY: 'Copy',
  SHARE: 'Share',
  UPDATE: 'Update',
  UPDATING: 'Updating...',
  BUY: 'Buy',
  SELL: 'Sell',
} as const;

/* =========================
   Navigation / Tabs
========================= */
export const NAV = {
  HOME: 'Home',
  LEADERBOARD: 'Leaderboard',
  REFERRALS: 'Referrals',
  POINTS: 'Points',
  REWARDS: 'Rewards',
  STAKING: 'Staking',
  CREATE: 'Create Token',
  DASHBOARD: 'Dashboard',
  PROFILE: 'User Profile',
} as const;

/* =========================
   SEO
========================= */
export const SEO = {
  HOME_TITLE: 'PumpFun Clone - Create and Trade Tokens with Bonding Curves',
  HOME_DESC: 'Launch and trade tokens effortlessly using innovative bonding curve technology. Experience fair, dynamic, and continuous liquidity on PumpFun Clone.',
  CREATE_TITLE: 'Create Your Own Token - PumpFun Clone',
  CREATE_DESC: 'Create and Trade Memecoins Easily',
  LEADERBOARD_TITLE: 'Leaderboard',
  LEADERBOARD_DESC: 'Top 15 trending tokens leaderboard',
  REFERRALS_TITLE: 'Referrals',
  REFERRALS_DESC: 'Your referral dashboard',
  POINTS_TITLE: 'Points',
  POINTS_DESC: 'Earn points for doing stuff: trade, create, stake have fun!',
  REWARDS_TITLE: 'Rewards',
  REWARDS_DESC: 'Spin to win SOL rewards',
  STAKING_TITLE: 'Staking',
  STAKING_DESC: 'Stake SEED to earn rewards',
  DASHBOARD_TITLE: 'Dashboard',
  DASHBOARD_DESC: 'Your token dashboard',
  PROFILE_TITLE: 'User Profile',
  PROFILE_DESC: 'User profile dashboard',
} as const;

/* =========================
   Reward Page
========================= */
export const REWARD = {
  SPIN: 'SPIN',
  SPINNING: 'SPINNING…',
  CLAIM: 'CLAIM',
  CLAIMING: 'CLAIMING…',
  CONVERT: 'CONVERT',
  CONVERTING: 'CONVERTING…',
  PROCESSING: 'PROCESSING…',

  // Modals
  WALLET_NOT_CONNECTED_TITLE: 'Wallet Not Connected',
  WALLET_NOT_CONNECTED_TEXT: 'Please connect your wallet before claiming SOL.',
  WALLET_UNSUPPORTED_TITLE: 'Wallet Unsupported',
  WALLET_UNSUPPORTED_TEXT: 'Your wallet does not support sending transactions.',
  NOTHING_TO_CLAIM_TITLE: 'Nothing To Claim',
  NOTHING_TO_CLAIM_TEXT: 'There is no pending SOL available to claim right now.',
  CLAIM_SUCCESS_TITLE: 'Claim Successful',
  TX_REJECTED_TITLE: 'Transaction Rejected',
  TX_REJECTED_TEXT: 'You rejected the wallet transaction, so your reward was not claimed.',
  CONVERT_SUCCESS_TITLE: 'Convert Successful',
  NOT_ENOUGH_TICKETS_TITLE: 'Not Enough Tickets',
  NOT_ENOUGH_TICKETS_TEXT: 'You do not have enough tickets to spin right now. Convert more points into tickets and try again.',
  SPIN_SUCCESS_TITLE: 'Spin Successful',
  SPIN_NO_REWARD_TITLE: 'Spin Completed',
  SPIN_NO_REWARD_TEXT: 'Your spin completed successfully, but this time there was no reward. Try again with your next ticket.',
  SPIN_INVALID_TITLE: 'Spin Request Invalid',
  LOAD_FAILED_TITLE: 'Load Failed',

  // Labels
  YOUR_TICKETS: 'Your Tickets',
  CURRENT_POINTS: 'Current points',
  CONVERT_POINTS: 'Convert Points',
  MULTIPLIERS: 'Multipliers',
  RULES: 'Rules',
  HISTORY: 'History',
  NO_SPINS: 'No spins yet.',
} as const;

/* =========================
   Referrals Page
========================= */
export const REFERRAL = {
  CLAIM_REWARD: 'CLAIM REWARD',
  GENERATE_LINK: 'GENERATE LINK',
  GENERATING: 'GENERATING…',
  TOTAL_REFERRALS: 'Total Referrals',
  TOTAL_VOLUME: 'Total Volume',
  UNCLAIMED_REWARDS: 'Unclaimed Rewards',
  REFERRAL_LINK: 'REFERRAL LINK',
  HOW_IT_WORKS: 'How it works?',
  YOUR_LINK: 'Your referral link:',
  EMPTY_TABLE: 'Share your referral link to start earning',
  DATE_JOINED: 'DATE JOINED',
  WALLET: 'WALLET',
  TRADING_VOLUME: 'TRADING VOLUME',
  YOUR_REWARDS: 'YOUR REWARDS',
} as const;

/* =========================
   Profile Page
========================= */
export const PROFILE = {
  PORTFOLIO_VALUE: 'Portfolio Value',
  TOKENS_CREATED: 'Tokens Created',
  TOTAL_TRADES: 'Total Trades',
  MEMBER_SINCE: 'Member Since',
  TAB_PROFILE: 'Profile Info',
  TAB_HOLDING: 'Holding Tokens',
  TAB_CREATED: 'Created Tokens',
  TAB_HISTORY: 'Transaction History',
  NO_HOLDING: 'No holding tokens.',
  NO_CREATED: 'No created tokens.',
  NO_HISTORY: 'No recent activities.',
} as const;

/* =========================
   Leaderboard Page
========================= */
export const LEADERBOARD = {
  TOKEN_HEADER: 'token',
} as const;

/* =========================
   Points Page
========================= */
export const POINTS = {
  POINT_HISTORY: 'POINT HISTORY',
  EMPTY_HISTORY: "You'll see your point history here",
  EMPTY_ENCOURAGE: 'Nothing yet? Switch wallets or trade to earn Seed Points.',
  DATE: 'DATE',
  TYPE: 'TYPE',
  POINTS_COL: 'POINTS',
} as const;

/* =========================
   Token / Trade
========================= */
export const TOKEN = {
  CONTRACT: 'Contract',
  DEPLOYER: 'Deployer',
  CREATED: 'Created',
  CURRENT_PRICE: 'Current Price',
  MARKET_CAP: 'Market Cap',
  VOLUME: 'Volume',
  PROGRESS_TO_DEX: 'Progress to DEX',
  COMPLETED: 'Completed',
  NO_HOLDER_DATA: 'No token holder data available',
} as const;

/* =========================
   Holders
========================= */
export const HOLDERS = {
  TOTAL_HOLDERS: 'Total Holders',
  TOP_10_CONC: 'Top 10 concentration %',
  AVG_HOLDING: 'Avg Holding',
  NEW_24H: 'New (24h)',
  RANK: '#',
  HOLDER: 'Holder',
  BALANCE: 'Balance',
  PERCENT_SUPPLY: '% Supply',
  BADGE: 'Badge',
} as const;

/* =========================
   Create Token
========================= */
export const CREATE = {
  STEP1_TITLE: 'Create New Token',
  STEP2_TITLE: 'Curve Settings',
  STEP3_TITLE: 'Finalize',
  TOKEN_NAME: 'Token Name',
  TOKEN_NAME_PLACEHOLDER: 'Enter token name',
  TOKEN_SYMBOL: 'Token Symbol',
  TOKEN_SYMBOL_PLACEHOLDER: 'A-Z0-9, 2-10 chars',
  TOKEN_DESC: 'Token Description',
  TOKEN_DESC_PLACEHOLDER: 'Describe your token',
  TOKEN_IMAGE: 'Token Image',
  UPLOAD_FILE: 'Upload a file',
  DRAG_DROP: 'or drag and drop',
  FILE_HINT: 'PNG, JPG, GIF up to 1MB',
  NSFW: 'Mark as NSFW',
  SOCIAL_LINKS: 'Social Media Links (Optional)',
  PREVIEW_BUY: 'Preview Buy',
  PREVIEWING: 'Previewing...',
  CREATE_WITHOUT_BUY: 'Create Without Buying',
  CREATING_DRAFT: 'Creating Draft...',
  FINALIZING: 'Finalizing...',
} as const;

/* =========================
   Staking
========================= */
export const STAKING = {
  YOUR_STAKE: 'Your Stake',
  YOUR_STAKED_SEED: 'Your Staked SEED',
  SEED_IN_WALLET: 'SEED in wallet',
  STAKING_REWARDS: 'your staking rewards',
  FEES: 'fees',
  CLAIMED_TO_DATE: 'claimed to date',
  AIRDROPS: 'airdrops',
  UNCLAIMED: 'unclaimed',
  EMPTY: 'nothing here…',
  EMPTY_CTA: 'stake SEED to get airdrops, dummy',
  GLOBAL_STATS: 'global stats',
  STAKE_MORE: 'stake more',
  CONNECT: 'connect',
  CLAIM: 'claim',
  VIEW: 'view',
} as const;

/* =========================
   Wallet / Auth
========================= */
export const WALLET = {
  CONNECT_WALLET: 'Connect Wallet',
  DISCONNECT: 'Disconnect',
} as const;

/* =========================
   Chat
========================= */
export const CHAT = {
  PLACEHOLDER: 'Type a message...',
} as const;

/* =========================
   Filter Panel
========================= */
export const FILTER = {
  MCAP_MIN: 'Market cap minimum',
  MCAP_MAX: 'Market cap maximum',
  VOL_MIN: '24h volume minimum',
  VOL_MAX: '24h volume maximum',
} as const;
