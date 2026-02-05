// src/utils/api.ts
import axios from 'axios';
import {
  Token,
  PaginatedResponse,
  TokenHolder,
  TransactionResponse,
  CursorPaginatedResponse,

  // ✅ NEW BE API (Solana)
  TokenInfoResponse,
  TokenPriceResponse,
  TokenLiquidityResponse,
  TokenPriceTimeframe,
  TokenTradesResponse, // ✅ trades

  // ✅ Chatroom types
  ChatMessagesResponse,
  ChatWriteRequest,
  ChatWriteResponse,

  // ✅ Referrals types
  ReferralSummary,
  ReferralLinkInfo,
  ReferralListResponse,
  ClaimReferralResponse,
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
 * (Giữ lại cho các endpoint bạn thực sự muốn gọi thẳng,
 * nhưng browser gọi thẳng sẽ dính CORS nếu BE không allow)
 */
export const authApi = axios.create({
  baseURL: AUTH_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
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

const absProxy = (path: string) =>
  isServer ? `${SITE_URL}${PROXY_BASE}${path}` : `${PROXY_BASE}${path}`;

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

/**
 * Map cursor response -> legacy PaginatedResponse
 * (UI cũ vẫn dùng data/currentPage/totalPages)
 */
const toLegacyPaginated = <T>(items: T[], nextCursor: string | null | undefined): PaginatedResponse<T> => ({
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
// Validation helpers (NEW)
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

// =====================
// ✅ Symbol validation (SAFE: 2-10, uppercase alnum)
// =====================
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
  if (!SYMBOL_RE.test(s)) {
    throw new Error(`symbol must be uppercase alphanumeric, ${SYMBOL_MIN}-${SYMBOL_MAX} chars`);
  }
  return s;
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

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<CursorPaginatedResponse<Token>>('/token/search', safe, headers);

  return {
    items: data.items ?? [],
    nextCursor: data.nextCursor ?? null,
  };
}

// =====================
// ✅ NEW BE API (Solana): /token/info /token/price /token/liquidity /token/trades
// - VIA PROXY to avoid CORS
// =====================

export async function getTokenInfo(address: string): Promise<TokenInfoResponse> {
  const addr = (address || '').trim();
  if (!addr) throw new Error('Missing token address');

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<TokenInfoResponse>('/token/info', { address: addr }, headers);
  return data;
}

export async function getTokenPrice(
  address: string,
  timeframe: TokenPriceTimeframe = '5m'
): Promise<TokenPriceResponse> {
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

/**
 * ✅ GET /token/trades (cursor pagination)
 * Params: address (mint), limit (1..200), cursor?
 */
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
    {
      address: addr,
      limit,
      cursor: opts?.cursor ?? undefined,
    },
    headers
  );

  return {
    tokenAddress: data?.tokenAddress ?? addr,
    nextCursor: data?.nextCursor ?? null,
    trades: data?.trades ?? [],
  };
}

// =====================
// ✅ Chatroom API (Solana): /chat/messages /chat/write
// - VIA PROXY to avoid CORS
// =====================

/**
 * ✅ GET /chat/messages (cursor pagination)
 * Params: tokenAddress, limit (1..100), cursor?
 */
export async function getChatMessages(
  tokenAddress: string,
  opts?: { limit?: number; cursor?: string | null }
): Promise<ChatMessagesResponse> {
  const addr = (tokenAddress || '').trim();
  if (!addr) throw new Error('Missing tokenAddress');

  const limitRaw = opts?.limit ?? 30;
  const limit = Math.min(Math.max(Number(limitRaw) || 30, 1), 100);

  // spec không bắt buộc auth cho GET, nhưng nếu có token thì cứ gửi
  const headers = getAuthHeaders();
  const { data } = await getViaProxy<ChatMessagesResponse>(
    '/chat/messages',
    {
      tokenAddress: addr,
      limit,
      cursor: opts?.cursor ?? undefined,
    },
    headers
  );

  return {
    tokenAddress: data?.tokenAddress ?? addr,
    nextCursor: data?.nextCursor ?? null,
    messages: data?.messages ?? [],
  };
}

/**
 * ✅ POST /chat/write
 * Body: { tokenAddress, walletAddress, message }
 * ⚠️ Requires Bearer token
 */
export async function addChatMessage(payload: ChatWriteRequest): Promise<ChatWriteResponse> {
  const tokenAddress = String(payload?.tokenAddress ?? '').trim();
  const walletAddress = String(payload?.walletAddress ?? '').trim();
  const message = String(payload?.message ?? '').trim();

  if (!tokenAddress) throw new Error('tokenAddress is required');
  if (!walletAddress) throw new Error('walletAddress is required');
  if (!message) throw new Error('message is required');

  const headers = getAuthHeaders();
  if (!headers?.Authorization) {
    throw new Error('Unauthorized (Bearer token required)');
  }

  const { data } = await postViaProxy<ChatWriteResponse>(
    '/chat/write',
    { tokenAddress, walletAddress, message },
    headers
  );

  return data;
}

// =====================
// ✅ Create Token (NEW BE API) - VIA PROXY
// Spec: prepare-mint / upload-image / draft / preview-buy / finalize / confirm
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

export type UploadTokenImageRequest = {
  image: string; // base64 data URI OR URL
};

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

export type PreviewInitialBuyRequest = {
  draftId: string;
  amountSol: number;
};

export type PreviewInitialBuyResponse = {
  amountSol: number;
  estimatedTokens: number;
  price: number;
  note?: string;
};

// ✅ IMPORTANT: curveType is NUMBER on BE
// Convention: 0 = linear
export type FinalizeTokenRequest = {
  draftId: string;
  initialBuySol: number;
  decimals: number;
  curveType: number; // ✅ FIX
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

export type ConfirmMintRequest = {
  mint: string;
  symbol: string;
  name: string;
};

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

export async function uploadTokenImage(payload: UploadTokenImageRequest): Promise<UploadTokenImageResponse> {
  assertNonEmpty(payload?.image, 'image is required');
  const headers = getAuthHeaders();
  const { data } = await postViaProxy<UploadTokenImageResponse>(
    '/token/upload-image',
    { image: String(payload.image).trim() },
    headers
  );
  return data;
}

export async function createTokenDraft(payload: CreateTokenDraftRequest): Promise<CreateTokenDraftResponse> {
  assertNonEmpty(payload?.name, 'name is required');
  assertNonEmpty(payload?.symbol, 'symbol is required');
  assertNonEmpty(payload?.imageUrl, 'imageUrl is required');

  const headers = getAuthHeaders();
  const { data } = await postViaProxy<CreateTokenDraftResponse>(
    '/token/create/draft',
    {
      ...payload,
      name: String(payload.name).trim(),
      symbol: assertSymbol(payload.symbol), // ✅ enforce 2-10 + normalize
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
  if (!Number.isFinite(amountSol) || amountSol <= 0) {
    throw new Error('amountSol must be a number > 0');
  }

  const headers = getAuthHeaders();
  const { data } = await postViaProxy<PreviewInitialBuyResponse>(
    '/token/create/preview-buy',
    { draftId: String(payload.draftId).trim(), amountSol },
    headers
  );
  return data;
}

export async function finalizeTokenCreation(payload: FinalizeTokenRequest): Promise<FinalizeTokenResponse> {
  // ✅ validate + normalize to match BE
  assertNonEmpty(payload?.draftId, 'draftId is required');

  const decimals = toNonNegInt(payload.decimals, 'decimals');
  if (decimals > 18) throw new Error('decimals must be <= 18');

  const curveType = toNonNegInt(payload.curveType, 'curveType'); // 0 = linear
  const initialBuySol = Number(payload.initialBuySol ?? 0);
  if (!Number.isFinite(initialBuySol) || initialBuySol < 0) {
    throw new Error('initialBuySol must be a number >= 0');
  }

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

  const headers = getAuthHeaders();
  const { data } = await postViaProxy<FinalizeTokenResponse>('/token/create/finalize', body, headers);
  return data;
}

// =====================
// API calls (legacy + existing)
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
// Still-used existing APIs (not chart-related)
// =====================

export async function getAllTokenAddresses(): Promise<string[]> {
  const { data } = await getViaProxy<string[]>('/ports/getAllTokenAddresses');
  return data;
}

export async function getTokensByCreator(creator: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Token>> {
  const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/getTokensByCreator', { creator, page, pageSize });
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

// NOTE:
// Phần còn lại của file (updateToken/getTokenByAddress/getTransactionsByAddress/referrals/...) bạn giữ nguyên như code hiện tại.
// Bản này chỉ “gen lại” phần cần cho Trades + Chat.
