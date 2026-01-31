// src/utils/api.ts
import axios from 'axios';
import {
  Token,
  TokenWithLiquidityEvents,
  PaginatedResponse,
  LiquidityEvent,
  TokenWithTransactions,
  PriceResponse,
  HistoricalPrice,
  USDHistoricalPrice,
  TokenHolder,
  TransactionResponse,
  CursorPaginatedResponse,

  // ✅ Referrals types
  ReferralSummary,
  ReferralLinkInfo,
  ReferralListResponse,
  ClaimReferralResponse,
} from '@/interface/types';
import { ethers } from 'ethers';

// =====================
// AUTH base & token helpers
// =====================
export const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ||
  'https://dev.pumpfunclone2025.win';

const AUTH_TOKEN_KEY = 'pf_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Axios instance for direct BE calls (NO proxy)
 * (Giữ lại cho các endpoint bạn thực sự muốn gọi thẳng,
 * nhưng browser gọi thẳng sẽ dính CORS nếu BE không allow)
 */
export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // withCredentials: true,
});

// (Optional) attach bearer automatically for direct calls
authApi.interceptors.request.use((config) => {
  try {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem(AUTH_TOKEN_KEY);
      if (t) {
        config.headers = {
          ...(config.headers || {}),
          Authorization: `Bearer ${t}`,
        } as any;
      }
    }
  } catch {
    // ignore
  }
  return config;
});

export function setAuthToken(token: string | null, persist = true) {
  if (persist) setStoredToken(token);

  if (token) authApi.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete authApi.defaults.headers.common.Authorization;
}

// Init token on client
if (typeof window !== 'undefined') {
  const token = getStoredToken();
  if (token) setAuthToken(token, false);
}

authApi.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

// =====================
// Token search (BE) types
// =====================
export type TokenCategory =
  | 'trending'
  | 'marketcap'
  | 'new'
  | 'finalized'
  | 'pre-active'
  | 'all';

export type TokenSearchFilters = {
  category?: TokenCategory;
  includeNsfw?: boolean | null;
  mcapMin?: number | null;
  mcapMax?: number | null;
  volMin?: number | null;
  volMax?: number | null;
};

type TokenSearchParams = {
  q?: string;
  category?: TokenCategory;
  includeNsfw?: boolean | null;

  mcapMin?: number | null;
  mcapMax?: number | null;
  volMin?: number | null;
  volMax?: number | null;

  limit?: number; // 1..50
  cursor?: string;
};

// =====================
// Leaderboard (BE) types (local to avoid touching interface/types.ts)
// =====================
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
};

export type LeaderboardListResponse = {
  items: LeaderboardListItem[];
};

// =====================
// Proxy helpers
// =====================
const PROXY_BASE = '/api/proxy';
const isServer = typeof window === 'undefined';

const computeSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};
const SITE_URL = computeSiteUrl();

const absProxy = (path: string) =>
  isServer ? `${SITE_URL}${PROXY_BASE}${path}` : `${PROXY_BASE}${path}`;

const getViaProxy = async <T = any>(path: string, params?: any, headers?: Record<string, string>) => {
  const url = absProxy(path);
  return axios.get<T>(url, { params, headers });
};

const clampLimit = (n: number, min = 1, max = 50) => Math.min(Math.max(n, min), max);

/**
 * Map cursor response -> legacy PaginatedResponse
 * (UI cũ vẫn dùng data/currentPage/totalPages)
 */
const toLegacyPaginated = <T>(
  items: T[],
  nextCursor: string | null | undefined
): PaginatedResponse<T> => ({
  data: items,
  tokens: [], // compat
  totalCount: items.length, // BE không trả total => tạm dùng length
  currentPage: 1,
  totalPages: 1,
  nextCursor: nextCursor ?? null,
});

// auth header (for proxy calls)
const getAuthHeaders = (): Record<string, string> | undefined => {
  const t = getStoredToken();
  return t ? { Authorization: `Bearer ${t}` } : undefined;
};

// =====================
// Core helper: /token/search  (✅ VIA PROXY to avoid CORS)
// =====================
async function tokenSearch(params: TokenSearchParams): Promise<CursorPaginatedResponse<Token>> {
  const safe: TokenSearchParams = {
    ...params,
    includeNsfw: params.includeNsfw ?? false,
    limit: clampLimit(params.limit ?? 20),
  };

  // Không gửi q rỗng
  if (safe.q !== undefined && !String(safe.q).trim()) delete safe.q;

  // Optional: forward bearer token qua proxy (nếu BE có auth)
  const headers = getAuthHeaders();

  // ✅ IMPORTANT: gọi qua proxy thay vì authApi trực tiếp
  // => FE gọi same-origin => không dính CORS
  const { data } = await getViaProxy<CursorPaginatedResponse<Token>>('/token/search', safe, headers);

  return {
    items: data.items ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}

// =====================
// API calls
// =====================

export async function getAllTokens(page = 1, pageSize = 13): Promise<PaginatedResponse<Token>> {
  const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/getAllTokens', { page, pageSize });
  return data;
}

export async function getAllTokensWithoutLiquidity(): Promise<Token[]> {
  const { data } = await getViaProxy<Token[]>('/ports/getAllTokensWithoutLiquidity');
  return data;
}

export async function getTotalVolume(): Promise<{ totalVolume: number }> {
  const { data } = await getViaProxy<{ totalVolume: number }>('/ports/getTotalVolume');
  return data;
}

export async function getVolumeRange(hours: number): Promise<{ totalVolume: number }> {
  const { data } = await getViaProxy<{ totalVolume: number }>('/ports/getVolumeRange', { hours });
  return data;
}

export async function getTotalTokenCount(): Promise<{ totalTokens: number }> {
  const { data } = await getViaProxy<{ totalTokens: number }>('/ports/getTotalTokenCount');
  return data;
}

/**
 * legacy: giữ cho các trang khác (nếu có)
 */
export async function getRecentTokens(
  page = 1,
  pageSize = 20,
  hours = 24
): Promise<PaginatedResponse<Token> | null> {
  try {
    const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/getRecentTokens', {
      page,
      pageSize,
      hours,
    });
    return data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/**
 * ✅ Search dùng BE mới (/token/search?q=...)
 * Return legacy PaginatedResponse để UI cũ dùng `data` + `nextCursor`.
 */
export async function searchTokens(
  query: string,
  page = 1,
  pageSize = 20,
  cursor?: string,
  filters?: TokenSearchFilters
): Promise<PaginatedResponse<Token>> {
  const limit = clampLimit(pageSize);

  // page>1 mà không đưa cursor => không map chuẩn được
  if (page > 1 && !cursor) return toLegacyPaginated<Token>([], null);

  const res = await tokenSearch({
    q: query,
    category: filters?.category,
    includeNsfw: filters?.includeNsfw ?? false,
    mcapMin: filters?.mcapMin ?? undefined,
    mcapMax: filters?.mcapMax ?? undefined,
    volMin: filters?.volMin ?? undefined,
    volMax: filters?.volMax ?? undefined,
    limit,
    cursor,
  });

  return toLegacyPaginated<Token>(res.items ?? [], res.nextCursor ?? null);
}

/**
 * ✅ Leaderboard (NEW BE API)
 * - Dùng proxy để né CORS luôn cho chắc
 */
export async function getLeaderboardTop(limit = 3): Promise<LeaderboardTopItem[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 10);
  const { data } = await getViaProxy<LeaderboardTopItem[]>('/leaderboard/top', { limit: safeLimit });
  return data ?? [];
}

export async function getLeaderboardList(params?: {
  limit?: number;
  sort?: 'marketCap' | 'volume24h';
  order?: 'asc' | 'desc';
}): Promise<LeaderboardListResponse> {
  const limit = Math.min(Math.max(params?.limit ?? 50, 1), 200);
  const sort = params?.sort ?? 'marketCap';
  const order = params?.order ?? 'desc';

  const { data } = await getViaProxy<LeaderboardListResponse>('/leaderboard/list', {
    limit,
    sort,
    order,
  });

  return { items: data?.items ?? [] };
}

/**
 * legacy: giữ cho token detail/old page
 */
export async function getTokensWithLiquidity(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<TokenWithLiquidityEvents>> {
  const { data } = await getViaProxy<PaginatedResponse<TokenWithLiquidityEvents>>(
    '/ports/getTokensWithLiquidity',
    { page, pageSize }
  );
  return data;
}

export async function getTokenByAddress(address: string): Promise<Token> {
  const { data } = await getViaProxy<Token>('/ports/getTokenByAddress', { address });
  return data;
}

export async function getTokenLiquidityEvents(
  tokenId: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<LiquidityEvent>> {
  const { data } = await getViaProxy<PaginatedResponse<LiquidityEvent>>('/ports/getTokenLiquidityEvents', {
    tokenId,
    page,
    pageSize,
  });
  return data;
}

export async function getTokenInfoAndTransactions(
  address: string,
  transactionPage = 1,
  transactionPageSize = 10
): Promise<TokenWithTransactions> {
  const { data } = await getViaProxy<TokenWithTransactions>('/ports/getTokenInfoAndTransactions', {
    address,
    transactionPage,
    transactionPageSize,
  });
  return data;
}

export async function getHistoricalPriceData(address: string): Promise<Token> {
  const { data } = await getViaProxy<Token>('/ports/getHistoricalPriceData', { address });
  return data;
}

export async function getCurrentPrice(): Promise<string> {
  const { data } = await getViaProxy<PriceResponse>('/ports/getCurrentPrice');
  return data.price;
}

export async function getTokenUSDPriceHistory(address: string): Promise<USDHistoricalPrice[]> {
  try {
    const [ethPrice, historicalPrices] = await Promise.all([getCurrentPrice(), getHistoricalPriceData(address)]);

    return (historicalPrices as any as HistoricalPrice[]).map((price) => {
      const tokenPriceInWei = ethers.BigNumber.from(price.tokenPrice);
      const tokenPriceInETH = ethers.utils.formatEther(tokenPriceInWei);
      const tokenPriceUSD = parseFloat(tokenPriceInETH) * parseFloat(ethPrice);
      return {
        tokenPriceUSD: tokenPriceUSD.toFixed(9),
        timestamp: price.timestamp,
      };
    });
  } catch (error) {
    console.error('Error calculating USD price history:', error);
    throw new Error('Failed to calculate USD price history');
  }
}

export async function getAllTokenAddresses(): Promise<string[]> {
  const { data } = await getViaProxy<string[]>('/ports/getAllTokenAddresses');
  return data;
}

export async function getTokensByCreator(
  creator: string,
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<Token>> {
  const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/getTokensByCreator', {
    creator,
    page,
    pageSize,
  });
  return data;
}

type TokenomicsUpdate = {
  initialSupply?: number | string;
  distribution?: {
    creator?: number;
    community?: number;
    liquidity?: number;
  };
  mintAuthority?: string | null;
  renounceMint?: boolean;
  freezeEnabled?: boolean | null;
  lpLockMonths?: number;
  lockedUntil?: string | null;
  trustBadge?: 'Bronze' | 'Silver' | 'Gold';
};

export async function updateToken(
  address: string,
  dataUpdate: {
    logo?: string;
    description?: string;
    website?: string;
    telegram?: string;
    discord?: string;
    twitter?: string;
    youtube?: string;
    tokenomics?: TokenomicsUpdate;
  }
): Promise<Token> {
  const url = absProxy('/ports/updateToken');
  const { data } = await axios.patch(url, { address, data: dataUpdate });
  return data;
}

export async function getTransactionsByAddress(
  address: string,
  page = 1,
  pageSize = 10
): Promise<TransactionResponse> {
  const { data } = await getViaProxy<TransactionResponse>('/ports/getTransactionsByAddress', {
    address,
    page,
    pageSize,
  });
  return data;
}

export async function addChatMessage(
  user: string,
  token: string,
  message: string,
  replyTo?: number
): Promise<{ id: number }> {
  const url = absProxy('/ports/addChatMessage');
  const { data } = await axios.post(url, { user, token, message, reply_to: replyTo });
  return data;
}

export async function getChatMessages(
  token: string
): Promise<
  Array<{
    id: number;
    user: string;
    token: string;
    message: string;
    reply_to: number | null;
    timestamp: string;
  }>
> {
  const { data } = await getViaProxy('/ports/getChatMessages', { token });
  return data as any;
}

/**
 * NOTE:
 * Đây là call THẲNG sang shibariumscan.
 * Nếu chỗ này cũng dính CORS ở browser, cách fix là cho đi qua proxy tương tự.
 */
export async function getTokenHolders(tokenAddress: string): Promise<TokenHolder[]> {
  try {
    const response = await axios.get(`https://www.shibariumscan.io/api/v2/tokens/${tokenAddress}/holders`);
    const data = response.data;
    return data.items.map((item: any) => ({
      address: item.address.hash,
      balance: item.value,
    }));
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw new Error('Failed to fetch token holders');
  }
}

// =====================
// ✅ Referrals API (AUTH) - VIA PROXY (avoid CORS)
// =====================

export async function getReferralSummary(): Promise<ReferralSummary> {
  const url = absProxy('/referrals/summary');
  const { data } = await axios.get<ReferralSummary>(url, { headers: getAuthHeaders() });
  return data;
}

export async function getReferralLink(): Promise<ReferralLinkInfo> {
  const url = absProxy('/referrals/link');
  const { data } = await axios.get<ReferralLinkInfo>(url, { headers: getAuthHeaders() });
  return data;
}

export async function getReferralList(): Promise<ReferralListResponse> {
  const url = absProxy('/referrals/list');
  const { data } = await axios.get<ReferralListResponse>(url, { headers: getAuthHeaders() });
  return { items: data?.items ?? [] };
}

export async function claimReferralRewards(amountSol: number): Promise<ClaimReferralResponse> {
  const url = absProxy('/referrals/claim');
  const { data } = await axios.post<ClaimReferralResponse>(
    url,
    { amountSol },
    { headers: getAuthHeaders() }
  );
  return data;
}

/**
 * System endpoint: Track referral join / update volume
 * (Thường gọi ở join flow hoặc backend job; Referrals page không cần gọi)
 */
export async function trackReferral(payload: {
  walletAddress: string;
  tradingVolumeSol?: number;
}): Promise<{ ok: boolean }> {
  const url = absProxy('/referrals/track');
  const { data } = await axios.post<{ ok: boolean }>(
    url,
    {
      walletAddress: payload.walletAddress,
      tradingVolumeSol: payload.tradingVolumeSol ?? 0,
    },
    { headers: getAuthHeaders() }
  );
  return data;
}
