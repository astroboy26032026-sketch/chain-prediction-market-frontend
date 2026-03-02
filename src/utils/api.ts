// src/utils/api.ts
import axios from 'axios';
import {
  Token,
  PaginatedResponse,
  TokenHolder,
  TokenHoldersResponse,
  Transaction,
  CursorPaginatedResponse,

  // ✅ NEW BE API (Solana)
  TokenInfoResponse,
  TokenPriceResponse,
  TokenLiquidityResponse,
  TokenPriceTimeframe,
  TokenTradesResponse,

  // ✅ Chatroom types
  ChatMessagesResponse,
  ChatWriteRequest,
  ChatWriteResponse,

  // ✅ Referrals types
  ReferralSummary,
  ReferralLinkInfo,
  ReferralListResponse,
  ClaimReferralResponse,
  ClaimReferralRequest,

  // ✅ Trading types
  TradingBuyRequest,
  TradingBuyResponse,
  TradingSellRequest,
  TradingSellResponse,
  TradingPreviewBuyRequest,
  TradingPreviewBuyResponse,
  TradingPreviewSellRequest,
  TradingPreviewSellResponse,
  SubmitSignatureResponse,
  TradingTxStatusResponse,
} from '@/interface/types';

// =====================
// AUTH base & token helpers
// =====================
export const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'https://dev.pumpfunclone2025.win';

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
 */
export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

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
export type TokenCategory = 'trending' | 'marketcap' | 'new' | 'finalized' | 'pre-active' | 'all';

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
// Leaderboard (BE) types
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

const absProxy = (path: string) => (isServer ? `${SITE_URL}${PROXY_BASE}${path}` : `${PROXY_BASE}${path}`);

const getViaProxy = async <T = any>(path: string, params?: any, headers?: Record<string, string>) => {
  const url = absProxy(path);
  return axios.get<T>(url, { params, headers });
};

const postViaProxy = async <T = any>(path: string, body?: any, headers?: Record<string, string>) => {
  const url = absProxy(path);
  return axios.post<T>(url, body ?? {}, { headers });
};

const patchViaProxy = async <T = any>(path: string, body?: any, headers?: Record<string, string>) => {
  const url = absProxy(path);
  return axios.patch<T>(url, body ?? {}, { headers });
};

const clampLimit = (n: number, min = 1, max = 50) => Math.min(Math.max(n, min), max);

const toLegacyPaginated = <T>(items: T[], nextCursor: string | null | undefined): PaginatedResponse<T> => ({
  data: items,
  tokens: [], // compat
  totalCount: items.length,
  currentPage: 1,
  totalPages: 1,
  nextCursor: nextCursor ?? null,
});

const getAuthHeaders = (): Record<string, string> | undefined => {
  const t = getStoredToken();
  return t ? { Authorization: `Bearer ${t}` } : undefined;
};

// =====================
// Tracking endpoint normalizer
// =====================
function normalizeTrackingPath(input: string): string {
  let s = String(input ?? '').trim();
  if (!s) throw new Error('Missing tracking endpoint');

  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      s = `${u.pathname}${u.search || ''}`;
    }
  } catch {
    // ignore
  }

  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s*:\s*/i, '');
  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '');

  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s*:\s*/i, '');
  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '');

  if (!s.startsWith('/')) s = `/${s}`;
  s = s.replace(/\/{2,}/g, '/');

  return s;
}

// =====================
// Idempotency helpers
// =====================
export type IdempotencyOptions = { idempotencyKey?: string };

export function newIdempotencyKey(prefix?: string) {
  const rand =
    typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
      ? (crypto as any).randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  return prefix ? `${prefix}-${rand}` : rand;
}

function withIdempotencyHeader(headers?: Record<string, string>, key?: string): Record<string, string> | undefined {
  if (!key) return headers;
  return { ...(headers || {}), 'Idempotency-Key': key };
}

// =====================
// Validation helpers
// =====================
const assertNonEmpty = (v: any, msg: string) => {
  if (!String(v ?? '').trim()) throw new Error(msg);
};

const toInt = (v: any, field: string) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`${field} must be a number`);
  return Math.trunc(n);
};

const toNonNegInt = (v: any, field: string) => {
  const n = toInt(v, field);
  if (n < 0) throw new Error(`${field} must be >= 0`);
  return n;
};

const toNumericString = (v: any, field: string) => {
  const s = String(v ?? '').trim();
  if (!/^\d+$/.test(s)) throw new Error(`${field} must be a numeric string`);
  return s;
};

// ✅ Symbol validation
const SYMBOL_MIN = 2;
const SYMBOL_MAX = 10;
const SYMBOL_RE = new RegExp(`^[A-Z0-9]{${SYMBOL_MIN},${SYMBOL_MAX}}$`);

const normalizeSymbol = (v: any) =>
  String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, SYMBOL_MAX);

const assertSymbol = (v: any) => {
  const s = normalizeSymbol(v);
  if (!SYMBOL_RE.test(s)) throw new Error(`symbol must be uppercase alphanumeric, ${SYMBOL_MIN}-${SYMBOL_MAX} chars`);
  return s;
};

// =====================
// ✅ STUB: Update Token (Backend chưa implement)
// =====================
export type UpdateTokenRequest = {
  address: string;

  name?: string;
  symbol?: string;
  description?: string;
  imageUrl?: string;

  socials?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    youtube?: string;
  };
};

export async function updateToken(_payload: UpdateTokenRequest): Promise<Token> {
  throw new Error('updateToken API is not implemented on backend yet.');
}

// =====================
// ✅ Profile (NEW DOC IMPLEMENTATION)
// - GET /profile/info?walletAddress=...
// - GET /profile/stats?walletAddress=...&limitActivities=20&limitFavoriteTokens=10
// =====================

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

export type ProfileStatsResponse = {
  walletAddress: string;
  totalBuys: number;
  totalSells: number;
  totalVolumeSOL: number;
  totalPnL: number;
  rank: number; // backend note: currently 0
  favoriteTokens: string[];
  recentActivities: Array<{
    type: string;
    tokenAddress: string;
    amount: number;
    timestamp: string;
  }>;
};

function normalizeProfileInfo(input: any, walletAddress: string): ProfileInfoResponse {
  // đảm bảo không crash UI khi backend trả null/undefined field
  return {
    walletAddress: String(input?.walletAddress ?? walletAddress ?? '').trim(),
    username: String(input?.username ?? ''),
    avatar: String(input?.avatar ?? ''),
    bio: String(input?.bio ?? ''),
    joinedAt: String(input?.joinedAt ?? ''),
    totalTokensCreated: Number(input?.totalTokensCreated ?? 0),
    totalTokensBought: Number(input?.totalTokensBought ?? 0),
    totalTokensSold: Number(input?.totalTokensSold ?? 0),
  };
}

function normalizeProfileStats(input: any, walletAddress: string): ProfileStatsResponse {
  return {
    walletAddress: String(input?.walletAddress ?? walletAddress ?? '').trim(),
    totalBuys: Number(input?.totalBuys ?? 0),
    totalSells: Number(input?.totalSells ?? 0),
    totalVolumeSOL: Number(input?.totalVolumeSOL ?? 0),
    totalPnL: Number(input?.totalPnL ?? 0),
    rank: Number(input?.rank ?? 0),
    favoriteTokens: Array.isArray(input?.favoriteTokens) ? input.favoriteTokens.map(String) : [],
    recentActivities: Array.isArray(input?.recentActivities)
      ? input.recentActivities.map((x: any) => ({
          type: String(x?.type ?? ''),
          tokenAddress: String(x?.tokenAddress ?? ''),
          amount: Number(x?.amount ?? 0),
          timestamp: String(x?.timestamp ?? ''),
        }))
      : [],
  };
}

/**
 * Get user profile information
 * GET /profile/info?walletAddress=...
 */
export async function getProfileInfo(walletAddress: string): Promise<ProfileInfoResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  // thống nhất đi qua proxy giống các endpoint khác
  const headers = getAuthHeaders();
  const { data } = await getViaProxy<ProfileInfoResponse>('/profile/info', { walletAddress: addr }, headers);

  return normalizeProfileInfo(data, addr);
}

/**
 * Get user trading statistics
 * GET /profile/stats?walletAddress=...&limitActivities=20&limitFavoriteTokens=10
 */
export async function getProfileStats(
  walletAddress: string,
  opts?: { limitActivities?: number; limitFavoriteTokens?: number }
): Promise<ProfileStatsResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const limitActivities = opts?.limitActivities == null ? 20 : toNonNegInt(opts.limitActivities, 'limitActivities');
  const limitFavoriteTokens =
    opts?.limitFavoriteTokens == null ? 10 : toNonNegInt(opts.limitFavoriteTokens, 'limitFavoriteTokens');

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<ProfileStatsResponse>(
    '/profile/stats',
    { walletAddress: addr, limitActivities, limitFavoriteTokens },
    headers
  );

  return normalizeProfileStats(data, addr);
}

// =====================
// ✅ Points (NEW DOC IMPLEMENTATION)
// - GET /points/overview?walletAddress=...
// - GET /points/view?walletAddress=...
// - GET /points/history?walletAddress=...
// =====================

export type PointsOverviewResponse = {
  points: number;
  tickets: number;
};

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

export type PointsHistoryResponse = {
  items: Array<{
    type: string;
    points: number;
    timestamp: string;
  }>;
};

function normalizePointsOverview(input: any): PointsOverviewResponse {
  return {
    points: Number(input?.points ?? 0),
    tickets: Number(input?.tickets ?? 0),
  };
}

function normalizePointsView(input: any): PointsViewResponse {
  const r = input?.rank ?? {};
  return {
    rank: {
      current: String(r?.current ?? ''),
      next: String(r?.next ?? ''),
      currentVolume: Number(r?.currentVolume ?? 0),
      nextRankVolume: Number(r?.nextRankVolume ?? 0),
      remainingVolume: Number(r?.remainingVolume ?? 0),
      progressPercent: Number(r?.progressPercent ?? 0),
    },
  };
}

function normalizePointsHistory(input: any): PointsHistoryResponse {
  const items = Array.isArray(input?.items) ? input.items : [];
  return {
    items: items.map((x: any) => ({
      type: String(x?.type ?? ''),
      points: Number(x?.points ?? 0),
      timestamp: String(x?.timestamp ?? ''),
    })),
  };
}

/**
 * Get points summary (points, tickets)
 * GET /points/overview?walletAddress=...
 */
export async function getPointsOverview(walletAddress: string): Promise<PointsOverviewResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<PointsOverviewResponse>('/points/overview', { walletAddress: addr }, headers);
  return normalizePointsOverview(data);
}

/**
 * Get tier progress (rank by points)
 * GET /points/view?walletAddress=...
 */
export async function getPointsView(walletAddress: string): Promise<PointsViewResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<PointsViewResponse>('/points/view', { walletAddress: addr }, headers);
  return normalizePointsView(data);
}

/**
 * Get points earning history
 * GET /points/history?walletAddress=...
 */
export async function getPointsHistory(walletAddress: string): Promise<PointsHistoryResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<PointsHistoryResponse>('/points/history', { walletAddress: addr }, headers);
  return normalizePointsHistory(data);
}

// =====================
// Core helper: /token/search
// =====================
async function tokenSearch(params: TokenSearchParams): Promise<CursorPaginatedResponse<Token>> {
  const safe: TokenSearchParams = {
    ...params,
    includeNsfw: params.includeNsfw ?? false,
    limit: clampLimit(params.limit ?? 20),
  };

  if (safe.q !== undefined && !String(safe.q).trim()) delete safe.q;

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<CursorPaginatedResponse<Token>>('/token/search', safe, headers);

  return {
    items: data.items ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}

// =====================
// ✅ NEW BE API (Solana): Token info / price / liquidity / trades / holders
// =====================
export async function getTokenInfo(address: string): Promise<TokenInfoResponse> {
  const addr = (address || '').trim();
  if (!addr) throw new Error('Missing token address');
  const headers = getAuthHeaders();
  const { data } = await getViaProxy<TokenInfoResponse>('/token/info', { address: addr }, headers);
  return data;
}

export async function getTokenPrice(address: string, timeframe: TokenPriceTimeframe = '5m'): Promise<TokenPriceResponse> {
  const addr = (address || '').trim();
  if (!addr) throw new Error('Missing token address');
  const headers = getAuthHeaders();
  const { data } = await getViaProxy<TokenPriceResponse>('/token/price', { address: addr, timeframe }, headers);
  return data;
}

export async function getTokenLiquidity(address: string): Promise<TokenLiquidityResponse> {
  const addr = (address || '').trim();
  if (!addr) throw new Error('Missing token address');
  const headers = getAuthHeaders();
  const { data } = await getViaProxy<TokenLiquidityResponse>('/token/liquidity', { address: addr }, headers);
  return data;
}

export async function getTokenTrades(
  address: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<TokenTradesResponse> {
  const addr = (address || '').trim();
  if (!addr) throw new Error('Missing token address');

  const limitRaw = opts?.limit ?? 50;
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<TokenTradesResponse>(
    '/token/trades',
    { address: addr, limit, cursor: opts?.cursor ?? undefined },
    headers
  );

  return {
    tokenAddress: data?.tokenAddress ?? addr,
    nextCursor: data?.nextCursor ?? null,
    trades: data?.trades ?? [],
  };
}

export async function getTokenHolders(
  address: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<TokenHoldersResponse> {
  const addr = (address || '').trim();
  if (!addr) throw new Error('Missing token address');

  const limitRaw = opts?.limit ?? 50;
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<TokenHoldersResponse>(
    '/token/holders',
    { address: addr, limit, cursor: opts?.cursor ?? undefined },
    headers
  );

  return {
    tokenAddress: data?.tokenAddress ?? addr,
    totalHolders: Number(data?.totalHolders ?? (data?.holders?.length ?? 0)),
    nextCursor: data?.nextCursor ?? null,
    holders: (data?.holders ?? []) as TokenHolder[],
  };
}

// =====================
// ✅ Trading API (Solana)
// =====================
export async function buyToken(payload: TradingBuyRequest, opts?: IdempotencyOptions): Promise<TradingBuyResponse> {
  const tokenAddress = String(payload?.tokenAddress ?? '').trim();
  if (!tokenAddress) throw new Error('tokenAddress is required');

  const amountInSol = payload?.amountInSol != null ? String(payload.amountInSol).trim() : '';
  const amountInToken = payload?.amountInToken != null ? String(payload.amountInToken).trim() : '';

  const hasSol = !!amountInSol;
  const hasToken = !!amountInToken;

  if (!hasSol && !hasToken) throw new Error('Provide amountInToken (smallest units) or amountInSol (lamports)');
  if (hasSol && hasToken) throw new Error('Provide only one: amountInToken OR amountInSol');

  if (hasToken) toNumericString(amountInToken, 'amountInToken');
  if (hasSol) toNumericString(amountInSol, 'amountInSol');

  const slippageBps = payload?.slippageBps == null ? undefined : toNonNegInt(payload.slippageBps, 'slippageBps');
  if (slippageBps != null && slippageBps > 10_000) throw new Error('slippageBps must be <= 10000');

  const referrer = payload?.referrer != null ? String(payload.referrer).trim() : undefined;

  const idk = opts?.idempotencyKey ?? newIdempotencyKey('buy');
  const headers = withIdempotencyHeader(getAuthHeaders(), idk);

  const { data } = await postViaProxy<TradingBuyResponse>(
    '/trading/buy',
    {
      tokenAddress,
      amountInToken: hasToken ? amountInToken : undefined,
      amountInSol: hasSol ? amountInSol : undefined,
      slippageBps,
      referrer: referrer || undefined,
    },
    headers
  );

  return data;
}

export async function sellToken(payload: TradingSellRequest, opts?: IdempotencyOptions): Promise<TradingSellResponse> {
  const tokenAddress = String(payload?.tokenAddress ?? '').trim();
  if (!tokenAddress) throw new Error('tokenAddress is required');

  const amountInToken = String(payload?.amountInToken ?? '').trim();
  if (!amountInToken) throw new Error('amountInToken is required');
  toNumericString(amountInToken, 'amountInToken');

  const slippageBps = payload?.slippageBps == null ? undefined : toNonNegInt(payload.slippageBps, 'slippageBps');
  if (slippageBps != null && slippageBps > 10_000) throw new Error('slippageBps must be <= 10000');

  const referrer = payload?.referrer != null ? String(payload.referrer).trim() : undefined;

  const idk = opts?.idempotencyKey ?? newIdempotencyKey('sell');
  const headers = withIdempotencyHeader(getAuthHeaders(), idk);

  const { data } = await postViaProxy<TradingSellResponse>(
    '/trading/sell',
    {
      tokenAddress,
      amountInToken,
      slippageBps,
      referrer: referrer || undefined,
    },
    headers
  );

  return data;
}

// =====================
// ✅ Trading Preview API (Solana) - bonding curve preview (NO auth required)
// =====================
export async function previewBuy(payload: TradingPreviewBuyRequest): Promise<TradingPreviewBuyResponse> {
  const tokenAddress = String(payload?.tokenAddress ?? '').trim();
  if (!tokenAddress) throw new Error('tokenAddress is required');

  const amountSol = Number(payload?.amountSol ?? 0);
  if (!Number.isFinite(amountSol) || amountSol <= 0) throw new Error('amountSol must be a number > 0');

  const headers = getAuthHeaders();

  const { data } = await postViaProxy<TradingPreviewBuyResponse>(
    '/trading/preview-buy',
    { tokenAddress, amountSol },
    headers
  );

  return data;
}

export async function previewSell(payload: TradingPreviewSellRequest): Promise<TradingPreviewSellResponse> {
  const tokenAddress = String(payload?.tokenAddress ?? '').trim();
  if (!tokenAddress) throw new Error('tokenAddress is required');

  const amountInToken = Number(payload?.amountInToken ?? 0);
  if (!Number.isFinite(amountInToken) || amountInToken <= 0) throw new Error('amountInToken must be a number > 0');

  const headers = getAuthHeaders();

  const { data } = await postViaProxy<TradingPreviewSellResponse>(
    '/trading/preview-sell',
    { tokenAddress, amountInToken },
    headers
  );

  return data;
}

export async function submitSignature(
  endpointOrPath: string,
  payload: { id: string; txSignature: string },
  opts?: IdempotencyOptions
): Promise<SubmitSignatureResponse> {
  const epRaw = String(endpointOrPath ?? '').trim();
  if (!epRaw) throw new Error('submitSignature endpoint is required');

  const id = String(payload?.id ?? '').trim();
  const txSignature = String(payload?.txSignature ?? '').trim();

  if (!id) throw new Error('id is required');
  if (!txSignature) throw new Error('txSignature is required');

  const idk = opts?.idempotencyKey ?? newIdempotencyKey('submit-sig');
  const headers = withIdempotencyHeader(getAuthHeaders(), idk);

  const path = normalizeTrackingPath(epRaw);

  const { data } = await postViaProxy<SubmitSignatureResponse>(path, { id, txSignature }, headers);
  return data;
}

export async function getTradingStatus(endpointOrPath: string): Promise<TradingTxStatusResponse> {
  const epRaw = String(endpointOrPath ?? '').trim();
  if (!epRaw) throw new Error('status endpoint is required');

  const headers = getAuthHeaders();
  const path = normalizeTrackingPath(epRaw);

  const { data } = await getViaProxy<TradingTxStatusResponse>(path, {}, headers);
  return data;
}

// =====================
// ✅ Chatroom API
// =====================
export async function getChatMessages(
  tokenAddress: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<ChatMessagesResponse> {
  const addr = (tokenAddress || '').trim();
  if (!addr) throw new Error('Missing tokenAddress');

  const limitRaw = opts?.limit ?? 30;
  const limit = Math.min(Math.max(Number(limitRaw) || 30, 1), 100);

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<ChatMessagesResponse>(
    '/chat/messages',
    { tokenAddress: addr, limit, cursor: opts?.cursor ?? undefined },
    headers
  );

  return {
    tokenAddress: data?.tokenAddress ?? addr,
    nextCursor: data?.nextCursor ?? null,
    messages: data?.messages ?? [],
  };
}

export async function addChatMessage(payload: ChatWriteRequest): Promise<ChatWriteResponse> {
  const tokenAddress = String(payload?.tokenAddress ?? '').trim();
  const walletAddress = String(payload?.walletAddress ?? '').trim();
  const message = String(payload?.message ?? '').trim();

  if (!tokenAddress) throw new Error('tokenAddress is required');
  if (!walletAddress) throw new Error('walletAddress is required');
  if (!message) throw new Error('message is required');

  const headers = getAuthHeaders();
  if (!headers?.Authorization) throw new Error('Unauthorized (Bearer token required)');

  const { data } = await postViaProxy<ChatWriteResponse>(
    '/chat/write',
    { tokenAddress, walletAddress, message },
    headers
  );
  return data;
}

// =====================
// ✅ Create Token (NEW BE API) - VIA PROXY
// =====================
export type PrepareMintRequest = {
  seed: string;
  decimals: number;
  initialAmount: string;
  symbol: string;
  name: string;
};

export type PrepareMintResponse = {
  mint: string;
  ata: string;
  txBase64: string;
  symbol: string;
  name: string;
  note?: string;
};

export type UploadTokenImageRequest = { image: string };

export type UploadTokenImageResponse = {
  imageUrl: string;
  ipfsUri: string;
  note?: string;
};

export type CreateTokenDraftRequest = {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  isNSFW: boolean;
  socials?: {
    twitter?: string;
    telegram?: string;
    website?: string;
    discord?: string;
    youtube?: string;
  };
};

export type CreateTokenDraftResponse = {
  draftId: string;
  status: string;
  expiresAt: string;
  note?: string;
};

export type PreviewInitialBuyRequest = { draftId: string; amountSol: number };

export type PreviewInitialBuyResponse = {
  amountSol: number;
  estimatedTokens: number;
  price: number;
  note?: string;
};

export type FinalizeTokenRequest = {
  draftId: string;
  initialBuySol: number;
  decimals: number;
  curveType: number;
  basePriceLamports: number;
  slopeLamports: number;
  bondingCurveSupply: string;
  graduateTargetLamports: string;
};

export type FinalizeTokenResponse = {
  tokenAddress: string;
  marketAddress: string;
  txId: string;
  createdAt: string;
  initialBuyNote?: string;
};

export type ConfirmMintRequest = { mint: string; symbol: string; name: string };

export type ConfirmMintResponse = {
  ok: true;
  token: {
    mint: string;
    symbol: string;
    name: string;
    creator: string;
    status: 'pending' | 'active' | string;
    createdAt: string;
  };
};

export async function prepareMint(payload: PrepareMintRequest): Promise<PrepareMintResponse> {
  const headers = getAuthHeaders();
  const { data } = await postViaProxy<PrepareMintResponse>('/api/v1/tokens/prepare-mint', payload, headers);
  return data;
}

export async function confirmMint(payload: ConfirmMintRequest): Promise<ConfirmMintResponse> {
  const headers = getAuthHeaders();
  const { data } = await postViaProxy<ConfirmMintResponse>('/api/v1/tokens/confirm', payload, headers);
  return data;
}

export async function uploadTokenImage(
  payload: UploadTokenImageRequest,
  opts?: IdempotencyOptions
): Promise<UploadTokenImageResponse> {
  assertNonEmpty(payload?.image, 'image is required');
  const idk = opts?.idempotencyKey ?? newIdempotencyKey('upload-image');
  const headers = withIdempotencyHeader(getAuthHeaders(), idk);

  const { data } = await postViaProxy<UploadTokenImageResponse>(
    '/token/upload-image',
    { image: String(payload.image).trim() },
    headers
  );
  return data;
}

export async function createTokenDraft(
  payload: CreateTokenDraftRequest,
  opts?: IdempotencyOptions
): Promise<CreateTokenDraftResponse> {
  assertNonEmpty(payload?.name, 'name is required');
  assertNonEmpty(payload?.symbol, 'symbol is required');
  assertNonEmpty(payload?.imageUrl, 'imageUrl is required');

  const idk = opts?.idempotencyKey ?? newIdempotencyKey('create-draft');
  const headers = withIdempotencyHeader(getAuthHeaders(), idk);

  const { data } = await postViaProxy<CreateTokenDraftResponse>(
    '/token/create/draft',
    {
      ...payload,
      name: String(payload.name).trim(),
      symbol: assertSymbol(payload.symbol),
      description: String(payload.description ?? ''),
      imageUrl: String(payload.imageUrl).trim(),
      isNSFW: Boolean(payload.isNSFW),
    },
    headers
  );
  return data;
}

export async function previewInitialBuy(payload: PreviewInitialBuyRequest): Promise<PreviewInitialBuyResponse> {
  assertNonEmpty(payload?.draftId, 'draftId is required');
  const amountSol = Number(payload?.amountSol ?? 0);
  if (!Number.isFinite(amountSol) || amountSol <= 0) throw new Error('amountSol must be a number > 0');

  const headers = getAuthHeaders();
  const { data } = await postViaProxy<PreviewInitialBuyResponse>(
    '/token/create/preview-buy',
    { draftId: String(payload.draftId).trim(), amountSol },
    headers
  );
  return data;
}

export async function finalizeTokenCreation(
  payload: FinalizeTokenRequest,
  opts?: IdempotencyOptions
): Promise<FinalizeTokenResponse> {
  assertNonEmpty(payload?.draftId, 'draftId is required');

  const decimals = toNonNegInt(payload.decimals, 'decimals');
  if (decimals > 18) throw new Error('decimals must be <= 18');

  const curveType = toNonNegInt(payload.curveType, 'curveType');
  const initialBuySol = Number(payload.initialBuySol ?? 0);
  if (!Number.isFinite(initialBuySol) || initialBuySol < 0) throw new Error('initialBuySol must be a number >= 0');

  const basePriceLamports = toNonNegInt(payload.basePriceLamports, 'basePriceLamports');
  const slopeLamports = toNonNegInt(payload.slopeLamports, 'slopeLamports');

  const bondingCurveSupply = toNumericString(payload.bondingCurveSupply, 'bondingCurveSupply');
  const graduateTargetLamports = toNumericString(payload.graduateTargetLamports, 'graduateTargetLamports');

  const body: FinalizeTokenRequest = {
    draftId: String(payload.draftId).trim(),
    initialBuySol,
    decimals,
    curveType,
    basePriceLamports,
    slopeLamports,
    bondingCurveSupply,
    graduateTargetLamports,
  };

  const idk = opts?.idempotencyKey ?? newIdempotencyKey(`finalize-${body.draftId}`);
  const headers = withIdempotencyHeader(getAuthHeaders(), idk);

  const { data } = await postViaProxy<FinalizeTokenResponse>('/token/create/finalize', body, headers);
  return data;
}

// =====================
// Existing exports (still used) - legacy /ports & existing
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

export async function getRecentTokens(page = 1, pageSize = 20, hours = 24): Promise<PaginatedResponse<Token> | null> {
  try {
    const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/getRecentTokens', { page, pageSize, hours });
    return data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function searchTokens(
  query: string,
  page = 1,
  pageSize = 20,
  cursor?: string,
  filters?: TokenSearchFilters
): Promise<PaginatedResponse<Token>> {
  const limit = clampLimit(pageSize);
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
  const { data } = await getViaProxy<LeaderboardListResponse>('/leaderboard/list', { limit, sort, order });
  return { items: data?.items ?? [] };
}

// =====================
// ✅ Referrals API (Solana)
// =====================
export async function getReferralSummary(): Promise<ReferralSummary> {
  const headers = getAuthHeaders();
  if (!headers?.Authorization) throw new Error('Unauthorized (Bearer token required)');
  const { data } = await getViaProxy<ReferralSummary>('/referrals/summary', {}, headers);
  return data;
}

export async function getReferralLinkInfo(): Promise<ReferralLinkInfo> {
  const headers = getAuthHeaders();
  if (!headers?.Authorization) throw new Error('Unauthorized (Bearer token required)');
  const { data } = await getViaProxy<ReferralLinkInfo>('/referrals/link', {}, headers);
  return data;
}

export async function getReferralList(opts?: { limit?: number; cursor?: string | null }): Promise<ReferralListResponse> {
  const headers = getAuthHeaders();
  if (!headers?.Authorization) throw new Error('Unauthorized (Bearer token required)');

  const limitRaw = opts?.limit ?? 50;
  const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);

  const { data } = await getViaProxy<ReferralListResponse>(
    '/referrals/list',
    { limit, cursor: opts?.cursor ?? undefined },
    headers
  );

  return { items: data?.items ?? [] };
}

export async function claimReferralRewards(payload: ClaimReferralRequest | number): Promise<ClaimReferralResponse> {
  const headers = getAuthHeaders();
  if (!headers?.Authorization) {
    throw new Error('Unauthorized (Bearer token required)');
  }

  const amountSol = typeof payload === 'number' ? payload : Number(payload?.amountSol ?? 0);

  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    throw new Error('amountSol must be a number > 0');
  }

  const { data } = await postViaProxy<ClaimReferralResponse>('/referrals/claim', { amountSol }, headers);

  return data;
}

// =====================
// ✅ ADD BACK: functions used by Dashboard (to avoid TS error)
// =====================
export async function getTokensByCreator(
  creatorAddress: string,
  page = 1,
  limit = 20
): Promise<{ tokens: Token[]; totalPages: number }> {
  const creator = String(creatorAddress ?? '').trim();
  if (!creator) return { tokens: [], totalPages: 1 };

  try {
    const headers = getAuthHeaders();
    const { data } = await getViaProxy<{ tokens?: Token[]; totalPages?: number }>(
      '/token/by-creator',
      { creator, page, limit },
      headers
    );

    return {
      tokens: data?.tokens ?? [],
      totalPages: Number(data?.totalPages ?? 1),
    };
  } catch {
    return { tokens: [], totalPages: 1 };
  }
}

export async function getAllTokenAddresses(): Promise<string[]> {
  try {
    const headers = getAuthHeaders();
    const { data } = await getViaProxy<any>('/token/addresses', {}, headers);
    if (Array.isArray(data)) return data.filter(Boolean).map(String);
    if (Array.isArray(data?.addresses)) return data.addresses.filter(Boolean).map(String);
    return [];
  } catch {
    return [];
  }
}

export async function getTransactionsByAddress(
  userAddress: string,
  page = 1,
  limit = 20
): Promise<{ transactions: Transaction[]; totalPages: number }> {
  const addr = String(userAddress ?? '').trim();
  if (!addr) return { transactions: [], totalPages: 1 };

  try {
    const headers = getAuthHeaders();
    const { data } = await getViaProxy<any>('/wallet/transactions', { address: addr, page, limit }, headers);

    return {
      transactions: (data?.transactions ?? data?.items ?? []) as Transaction[],
      totalPages: Number(data?.totalPages ?? 1),
    };
  } catch {
    return { transactions: [], totalPages: 1 };
  }
}