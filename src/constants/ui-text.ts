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
  POINTS: 'Points',
  REWARDS: 'Rewards',
  STAKING: 'Staking',
  CREATE: 'Create Market',
  DASHBOARD: 'Dashboard',
  MARKETS: 'Markets',
} as const;

/* =========================
   SEO
========================= */
export const SEO = {
  HOME_TITLE: 'Zugar - Create and Trade Tokens with Bonding Curves',
  HOME_DESC: 'Launch and trade tokens effortlessly using innovative bonding curve technology. Experience fair, dynamic, and continuous liquidity on Zugar.',
  CREATE_TITLE: 'Create Your Own Token - Zugar',
  CREATE_DESC: 'Create and Trade Memecoins Easily',
POINTS_TITLE: 'Point System',
  POINTS_DESC: 'Earn points for doing stuff: trade, create, stake have fun!',
  REWARDS_TITLE: 'Reward',
  REWARDS_DESC: 'Spin to win SOL rewards',
  STAKING_TITLE: 'Staking',
  STAKING_DESC: 'Stake SEED to earn rewards',
  DASHBOARD_TITLE: 'Dashboard',
  DASHBOARD_DESC: 'Your token dashboard',
} as const;


/* =========================
   Token / Trade / Prediction Market
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
   Prediction Market
========================= */
export const PREDICTION = {
  YES: 'Yes',
  NO: 'No',
  CHANCE: 'Chance',
  LIVE: 'LIVE',
  LIQUIDITY: 'Liq.',
  VOLUME: 'Vol.',
  ORDER_BOOK: 'Order Book',
  TRADE_YES: 'Trade Yes',
  TRADE_NO: 'Trade No',
  PRICE: 'Price',
  SHARES: 'Shares',
  TOTAL: 'Total',
  SPREAD: 'Spread',
  BUY: 'Buy',
  SELL: 'Sell',
  MARKET: 'Market',
  LIMIT: 'Limit',
  AMOUNT: 'Amount',
  BALANCE: 'Balance',
  RULES_SUMMARY: 'Rules Summary',
  TIMELINE_PAYOUT: 'Timeline & Payout',
  MARKET_CREATED: 'Market Created',
  BETTING_STARTS: 'Betting Starts',
  BETTING_ENDS: 'Betting Ends',
  RESOLUTION_PAYOUT: 'Resolution & Payout',
  PENDING: 'Pending',
  BACK_TO_MARKETS: 'Back to Markets',
  RELATED: 'Related',
  TRENDING: 'Trending',
  POPULAR: 'Popular',
  NEWEST: 'Newest',
  TOP_VOLUME: 'Top Volume',
  PLATFORM_FEE_NOTE: 'Payouts are distributed automatically to winners after resolution. Platform fee: 2%.',
  MARKET_ID: 'Market ID',
  CREATOR: 'Creator',
  EXPIRES: 'Expires',
} as const;


/* =========================
   Create Coin
========================= */
export const CREATE = {
  STEP1_TITLE: 'Create New Coin',
  STEP2_TITLE: 'Curve Settings',
  STEP3_TITLE: 'Finalize',
  TOKEN_NAME: 'Coin Name',
  TOKEN_NAME_PLACEHOLDER: 'Enter coin name',
  TOKEN_SYMBOL: 'Coin Symbol',
  TOKEN_SYMBOL_PLACEHOLDER: 'A-Z0-9, 2-10 chars',
  TOKEN_DESC: 'Coin Description',
  TOKEN_DESC_PLACEHOLDER: 'Describe your coin',
  TOKEN_IMAGE: 'Coin Image',
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
   Chat
========================= */
export const CHAT = {
  PLACEHOLDER: 'Type a message...',
} as const;

