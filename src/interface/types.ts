// src/interface/types.ts

export interface LiquidityEvent {
  id: string;
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

export interface TokenHolder {
  address: string;
  balance: string;
}

/**
 * TransactionResponse: giữ logic cũ.
 */
export interface TransactionResponse
  extends Omit<PaginatedResponse<Transaction>, 'data' | 'tokens'> {
  transactions: Transaction[];
}

export interface PriceCache {
  price: string;
  timestamp: number;
}

// ✅ Leader Board

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

// =====================
// ✅ Referrals
// =====================

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

// =====================
// ✅ NEW BE API (Solana): Token Info / Price / Liquidity
// =====================

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
