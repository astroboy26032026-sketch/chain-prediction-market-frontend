// src/interface/types.ts

/* =========================================================
   Legacy / Shared types (some still named "eth" from old EVM)
   ========================================================= */

export interface LiquidityEvent {
  id: string;
  /** legacy naming (EVM) */
  ethAmount: string;
  tokenAmount: string;
  timestamp: string;
}

export interface Token {
  id: string;
  chainId: number;

  address: string;
  creatorAddress: string;

  name: string;
  symbol: string;

  logo: string;
  description: string;

  createdAt: string;
  updatedAt: string;

  website: string;
  telegram: string;
  discord: string;
  twitter: string;
  youtube: string;

  latestTransactionTimestamp: string;

  // ===== metrics =====
  marketCap: number;

  // optional vì một số môi trường/mock có thể chưa trả
  // (nhiều BE trả string) -> để an toàn:
  priceUsd?: number | string;

  // ✅ theo BE mới
  volume24h?: number;
  status?: string;
  isNSFW?: boolean;

  // BE có thể không trả _count ở endpoint search
  _count?: {
    liquidityEvents: number;
  };

  // ✅ allow extra fields từ BE (ví dụ: external_url, attributes...)
  [key: string]: any;
}

export interface TokenWithLiquidityEvents extends Token {
  liquidityEvents: LiquidityEvent[];
}

/**
 * Cursor pagination response từ BE mới
 * GET /token/search -> { items, nextCursor }
 */
export interface CursorPaginatedResponse<T> {
  items: T[];
  nextCursor?: string | null;
}

/**
 * FE cũ đang dùng PaginatedResponse kiểu page/pageSize.
 * BE mới dùng cursor-based và trả `{ items, nextCursor }`.
 *
 * => Để không vỡ FE: giữ fields cũ + thêm nextCursor.
 */
export interface PaginatedResponse<T> {
  tokens: T[];
  data: T[];
  totalCount: number;
  currentPage: number;
  totalPages: number;

  // ✅ cursor pagination
  nextCursor?: string | null;

  [key: string]: any;
}

export interface Transaction {
  id: string;
  type: string;
  senderAddress: string;
  recipientAddress: string;
  /** legacy naming (EVM) */
  ethAmount: string;
  tokenAmount: string;
  tokenPrice: string;
  txHash: string;
  timestamp: string;
}

export interface TokenWithTransactions extends Token {
  transactions: {
    data: Transaction[];
    pagination: {
      currentPage: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  };
}

export interface PriceResponse {
  price: string;
}

export interface HistoricalPrice {
  tokenPrice: string;
  timestamp: string;
}

export interface USDHistoricalPrice {
  tokenPriceUSD: string;
  timestamp: string;
}

/**
 * TransactionResponse: giữ logic cũ.
 */
export interface TransactionResponse extends Omit<PaginatedResponse<Transaction>, 'data' | 'tokens'> {
  transactions: Transaction[];
}

export interface PriceCache {
  price: string;
  timestamp: number;
}

/* =========================================================
   ✅ User Profile (NEW) - /profile/info + /profile/stats
   ========================================================= */

/**
 * GET /profile/info?walletAddress=...
 */
export type ProfileInfoResponse = {
  walletAddress: string;
  username: string;
  avatar: string;
  bio: string;
  joinedAt: string;
  totalTokensCreated: number;
  totalTokensBought: number;
  totalTokensSold: number;
};

/**
 * Recent activity item in GET /profile/stats
 */
export type ProfileRecentActivity = {
  type: string;
  tokenAddress: string;
  amount: number;
  timestamp: string;
};

/**
 * GET /profile/stats?walletAddress=...&limitActivities=20&limitFavoriteTokens=10
 * NOTE: rank hiện backend trả 0 theo doc.
 */
export type ProfileStatsResponse = {
  walletAddress: string;
  totalBuys: number;
  totalSells: number;
  totalVolumeSOL: number;
  totalPnL: number;
  rank: number;
  favoriteTokens: string[];
  recentActivities: ProfileRecentActivity[];
};

/* =========================================================
   ✅ Points (NEW) - /points/overview + /points/view + /points/history
   ========================================================= */

/**
 * GET /points/overview?walletAddress=...
 */
export type PointsOverviewResponse = {
  points: number;
  tickets: number;
};

/**
 * GET /points/view?walletAddress=...
 */
export type PointsViewResponse = {
  rank: {
    current: string;
    next: string;
    currentVolume: number;
    nextRankVolume: number;
    remainingVolume: number;
    progressPercent: number;
  };
};

/**
 * GET /points/history?walletAddress=...
 */
export type PointsHistoryItem = {
  type: string;
  points: number;
  timestamp: string; // ISO datetime string
};

export type PointsHistoryResponse = {
  items: PointsHistoryItem[];
};

/* =========================================================
   ✅ Reward (NEW) - /reward/*
   ========================================================= */

/**
 * 1 lượt quay gần nhất trong GET /reward/info
 */
export type RewardSpinHistoryItem = {
  time: string;
  result: string[];
  payoutSol: number;
};

/**
 * GET /reward/info?walletAddress=...
 */
export type RewardInfoResponse = {
  walletAddress: string;
  tickets: number;
  points: number;
  claimableSol: number;
  unclaimedSol: number;
  cooldownUntil: string;
  recentSpins: RewardSpinHistoryItem[];
};

/**
 * POST /reward/claim
 */
export type RewardClaimRequest = {
  walletAddress: string;
};

export type RewardClaimResponse = {
  claimedSol: number;
  claimableSol: number;
  transaction: string | null;
  pendingTierSol?: number;
  message?: string;
};

/**
 * POST /reward/convert
 */
export type RewardConvertRequest = {
  walletAddress: string;
  points: number;
};

export type RewardConvertResponse = {
  ticketsAdded: number;
  ticketsTotal: number;
  pointsLeft: number;
};

/**
 * GET /reward/marquee
 */
export type RewardMarqueeItem = {
  userId: string;
  payoutSol: number;
  timeAgo: string;
};

export type RewardMarqueeResponse = {
  items: RewardMarqueeItem[];
};

/**
 * GET /reward/spin-config
 */
export type RewardSpinConfigResponse = {
  reels: number;
  symbols: string[];
  multiplier: Record<string, number>;
  rule: string;
};

/**
 * POST /reward/spin
 */
export type RewardSpinRequest = {
  walletAddress: string;
};

export type RewardSpinResponse = {
  result: string[];
  payoutSol: number;
  ticketsLeft: number;
  claimableSol: number;
  cooldownUntil: string;
};

/* =========================================================
   ✅ Token Holders (Solana) - GET /token/holders
   ========================================================= */

export interface TokenHolder {
  /** ví nắm giữ token */
  walletAddress: string;

  /** fallback / legacy field nếu BE trả thêm */
  address?: string;

  /** số lượng token */
  balance: number;

  /** % ownership (0 -> 100) */
  percentShare: number;

  /** thời điểm giao dịch gần nhất (ISO string) */
  lastTransaction: string | null;
}

export interface TokenHoldersResponse {
  tokenAddress: string;
  totalHolders: number;
  nextCursor?: string | null;
  holders: TokenHolder[];
}

/* =========================================================
   ✅ NEW: Token Trades (Solana) - GET /token/trades
   ========================================================= */

export interface TokenTrade {
  publicKey: string;
  isBuy: boolean;
  time: number; // BE trả number (epoch / ms)
  price: string; // BE trả string
  amount: number;
  totalUsd: string; // BE trả string
  signature: string;
  solAmount: number;
}

export interface TokenTradesResponse {
  tokenAddress: string;
  nextCursor?: string | null;
  trades: TokenTrade[];
}

/* =========================================================
   ✅ Leader Board
   ========================================================= */

export type LeaderboardTopItem = {
  rank: number;
  tokenAddress: string;
  name: string;
  symbol: string;
  subtitle?: string;
  creatorAddress: string;
  marketCap: number;
  marketCapChange24h: number;
  volume24h: number;
  volumeChange24h: number;
  createdAt: string;
  logo: string;
};

export type LeaderboardListItem = {
  rank: number;
  tokenAddress: string;
  name: string;
  symbol: string;
  creatorAddress: string;
  holders: number;
  marketCap: number;
  marketCapChange24h: number;
  logo: string;
};

export type LeaderboardListResponse = {
  items: LeaderboardListItem[];
};

/* =========================================================
   ✅ Referrals
   ========================================================= */

export type ReferralSummary = {
  totalReferrals: number;
  totalVolumeSol: number;
  unclaimedRewardsSol: number;
};

export type ReferralLinkInfo = {
  referralCode: string;
  referralLink: string;
  rewardRate: number; // BE có thể trả 0.2 (=20%) hoặc 20 (=20%)
};

export type ReferralListItem = {
  walletAddress: string;
  joinedAt: string; // ISO datetime string
  tradingVolumeSol: number;
  rewardSol: number;
};

export type ReferralListResponse = {
  items: ReferralListItem[];
};

export type ClaimReferralRequest = {
  amountSol: number;
};

export type ClaimReferralResponse = {
  claimedAmountSol: number;
  txId: string;
  message: string;
};

/* =========================================================
   ✅ NEW BE API (Solana): Token Info / Price / Liquidity
   ========================================================= */

/**
 * Trạng thái bonding curve theo BE mới
 * (để string fallback cho môi trường dev / mở rộng sau)
 */
export type BondingCurveStatus = 'ACTIVE' | 'FINISHED' | 'GRADUATED' | string;

/**
 * GET /token/info
 */
export interface TokenInfoResponse {
  address: string;

  name: string;
  symbol: string;
  logo: string;
  description: string;

  creatorAddress: string;

  marketCap: number;
  supply: number;
  liquidity: number;
  volume24h: number;
  holders: number;

  createdAt: string; // ISO datetime
  bondingCurveStatus: BondingCurveStatus;
}

/**
 * Timeframe cho price chart
 */
export type TokenPriceTimeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

/**
 * 1 điểm giá trong chart
 */
export interface TokenPricePoint {
  timestamp: string; // ISO datetime
  price: number;
}

/**
 * GET /token/price
 */
export interface TokenPriceResponse {
  tokenAddress: string;

  price: number;
  priceSource: 'CURVE' | 'DEX' | string;

  curvePrice?: number;
  dexPrice?: number;

  timeframe: TokenPriceTimeframe | string;
  chart: TokenPricePoint[];
}

/**
 * Liquidity event (Solana)
 */
export interface TokenLiquidityEvent {
  type: 'BUY' | 'SELL' | string;
  from: string;

  solAmount: number;
  tokenAmount: number;
  price: number;

  timestamp: string; // ISO datetime
}

/**
 * GET /token/liquidity
 */
export interface TokenLiquidityResponse {
  tokenAddress: string;

  isCurveFinished: boolean;
  reserveBalance: number;
  totalVolume: number;

  lpMigration?: {
    migrated: boolean;
    destinationDex?: string;
    lpLockedUntil?: string; // ISO datetime
  };

  events: TokenLiquidityEvent[];
}

/* =========================================================
   ✅ Chatroom (Solana) - /chat/messages + /chat/write
   ========================================================= */

export type ChatMessage = {
  messageId: string;
  walletAddress: string;
  message: string;
  timestamp: string; // ISO datetime
};

export type ChatMessagesResponse = {
  tokenAddress: string;
  nextCursor?: string | null;
  messages: ChatMessage[];
};

export type ChatWriteRequest = {
  tokenAddress: string;
  walletAddress: string;
  message: string;
};

export type ChatWriteResponse = {
  messageId: string;
  tokenAddress: string;
  walletAddress: string;
  message: string;
  timestamp: string;
};

/* =========================================================
   ✅ Trading (Solana)
   - POST /trading/buy + /trading/sell
   - POST /trading/preview-buy + /trading/preview-sell  (bonding curve)
   - submit-signature + status
   ========================================================= */

export type UUIDv4 = string;

/**
 * Buy request:
 * - FE gửi tokenAddress (mint)
 * - gửi 1 trong 2:
 *   - amountInToken: số token muốn mua (smallest units)
 *   - amountInSol: số SOL muốn dùng (lamports)
 */
export type TradingBuyRequest = {
  tokenAddress: string;
  amountInSol?: string; // lamports as string
  amountInToken?: string; // smallest units as string
  slippageBps?: number;
  referrer?: string;
};

export type TradingSellRequest = {
  tokenAddress: string;
  amountInToken: string; // smallest units as string
  slippageBps?: number;
  referrer?: string;
};

export type TradingTracking = {
  submitSignatureEndpoint: string;
  statusEndpoint: string;
  statusBySignatureEndpoint: string;
};

export type TradingBuyResponse = {
  tokenAddress: string;
  txBase64: string;
  transactionId: string;

  amountInSol: number;
  amountOutToken: number;
  executionPrice: number;

  slippageBps: number;
  feePlatform: number;
  feeReferral: number;

  tracking: TradingTracking;
};

export type TradingSellResponse = {
  tokenAddress: string;
  txBase64: string;
  transactionId: string;

  amountInToken: number;
  amountOutSol: number;
  executionPrice: number;

  slippageBps: number;
  feePlatform: number;
  feeReferral: number;

  tracking: TradingTracking;
};

/**
 * ✅ NEW: Preview buy (bonding curve)
 * POST /trading/preview-buy
 */
export type TradingPreviewBuyRequest = {
  tokenAddress: string;
  amountSol: number;
};

export type TradingPreviewBuyResponse = {
  tokenAddress: string;
  amountSol: number;

  estimatedTokens: number;
  price: number;

  quoteLamports: string;
  feeLamports: string;

  totalSol: number;

  firstBuyFeeSol: number;
  isFirstBuy: boolean;

  note?: string;
};

/**
 * ✅ NEW: Preview sell (bonding curve)
 * POST /trading/preview-sell
 */
export type TradingPreviewSellRequest = {
  tokenAddress: string;
  amountInToken: number;
};

export type TradingPreviewSellResponse = {
  tokenAddress: string;
  amountInToken: number;

  estimatedSol: number;
  lamportsOut: string;

  price: number;
  note?: string;
};

/**
 * Submit signature (generic)
 *
 * NOTE:
 * - FE đang gọi: submitSignature(endpoint, { id, txSignature })
 * => type support cả 2 naming.
 */
export type SubmitSignatureRequest = {
  /** base58 signature string */
  signature?: string;
  /** alias */
  txSignature?: string;

  /** optional if BE wants it in body */
  transactionId?: string;
  /** alias */
  id?: string;
};

export type SubmitSignatureResponse = {
  transactionId: string;
  signature: string;
  status: 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | string;
  message?: string;
};

/**
 * Status polling (generic)
 */
export type TradingTxStatusResponse = {
  transactionId: string;
  status: 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | string;
  signature?: string;
  error?: string | null;
  updatedAt?: string; // ISO
};