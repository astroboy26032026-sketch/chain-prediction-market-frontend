// src/utils/api.ts
import axios from 'axios';
import {
  Token,
  TokenHolder,
  TokenHoldersResponse,

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
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') || 'https://dev.zugar.app';

const AUTH_TOKEN_KEY = 'cx_token';

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

const API_TIMEOUT = 15_000; // 15s timeout
const MAX_RETRIES = 2;

const getViaProxy = async <T = any>(path: string, params?: any, headers?: Record<string, string>) => {
  const url = absProxy(path);
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await axios.get<T>(url, { params, headers, timeout: API_TIMEOUT });
    } catch (e: any) {
      lastErr = e;
      // Only retry on network/timeout errors, not 4xx
      const status = e?.response?.status;
      if (status && status >= 400 && status < 500) throw e;
      // Wait before retry (300ms, 800ms)
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
};

const UPLOAD_TIMEOUT = 60_000; // 60s for file uploads

const postViaProxy = async <T = any>(path: string, body?: any, headers?: Record<string, string>, timeout?: number) => {
  const url = absProxy(path);
  return axios.post<T>(url, body ?? {}, { headers, timeout: timeout ?? API_TIMEOUT });
};

const patchViaProxy = async <T = any>(path: string, body?: any, headers?: Record<string, string>) => {
  const url = absProxy(path);
  return axios.patch<T>(url, body ?? {}, { headers, timeout: API_TIMEOUT });
};

const clampLimit = (n: number, min = 1, max = 50) => Math.min(Math.max(n, min), max);


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
// ✅ NEW BE API (Solana): Token info / price / liquidity / trades / holders
// =====================
// BE should include `progressDex` (number 0-100, 2 decimals) in response
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
    headers,
    UPLOAD_TIMEOUT
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
// ✅ Reward API
// =====================
export type RewardSpinHistoryItem = {
  time: string;
  result: string[];
  payoutSol: number;
};

export type ConvertConfig = {
  options: number[];
  allowAll: boolean;
  maxTicketsConvertible: number;
  labelAll: string;
};

export type RewardInfoResponse = {
  walletAddress: string;
  tickets: number;
  points: number;
  claimableSol: number;
  unclaimedSol: number;
  cooldownUntil: string;
  recentSpins: RewardSpinHistoryItem[];
  convertConfig: ConvertConfig;
};

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

export type RewardConvertRequest = {
  walletAddress: string;
  tickets: number;
  mode: 'exact' | 'all';
};

export type RewardConvertResponse = {
  ticketsAdded: number;
  ticketsTotal: number;
  pointsLeft: number;
};

export type RewardMarqueeItem = {
  userId: string;
  payoutSol: number;
  timeAgo: string;
};

export type RewardMarqueeResponse = {
  items: RewardMarqueeItem[];
};

export type RewardSpinConfigResponse = {
  reels: number;
  symbols: string[];
  multiplier: Record<string, number>;
  rule: string;
};

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

function normalizeRewardSpinHistoryItem(input: any): RewardSpinHistoryItem {
  return {
    time: String(input?.time ?? ''),
    result: Array.isArray(input?.result) ? input.result.map(String) : [],
    payoutSol: Number(input?.payoutSol ?? 0),
  };
}

function normalizeConvertConfig(input: any): ConvertConfig {
  return {
    options: Array.isArray(input?.options) ? input.options.map(Number) : [],
    allowAll: Boolean(input?.allowAll ?? false),
    maxTicketsConvertible: Number(input?.maxTicketsConvertible ?? 0),
    labelAll: String(input?.labelAll ?? 'All'),
  };
}

function normalizeRewardInfo(input: any, walletAddress: string): RewardInfoResponse {
  return {
    walletAddress: String(input?.walletAddress ?? walletAddress ?? '').trim(),
    tickets: Number(input?.tickets ?? 0),
    points: Number(input?.points ?? 0),
    claimableSol: Number(input?.claimableSol ?? 0),
    unclaimedSol: Number(input?.unclaimedSol ?? 0),
    cooldownUntil: String(input?.cooldownUntil ?? ''),
    recentSpins: Array.isArray(input?.recentSpins)
      ? input.recentSpins.map(normalizeRewardSpinHistoryItem)
      : [],
    convertConfig: normalizeConvertConfig(input?.convertConfig),
  };
}

function normalizeRewardClaimResponse(input: any): RewardClaimResponse {
  return {
    claimedSol: Number(input?.claimedSol ?? 0),
    claimableSol: Number(input?.claimableSol ?? 0),
    transaction:
      input?.transaction == null || String(input?.transaction).trim() === ''
        ? null
        : String(input.transaction),
    pendingTierSol:
      input?.pendingTierSol == null ? undefined : Number(input.pendingTierSol ?? 0),
    message: input?.message == null ? undefined : String(input.message),
  };
}

function normalizeRewardConvertResponse(input: any): RewardConvertResponse {
  return {
    ticketsAdded: Number(input?.ticketsAdded ?? 0),
    ticketsTotal: Number(input?.ticketsTotal ?? 0),
    pointsLeft: Number(input?.pointsLeft ?? 0),
  };
}

function normalizeRewardMarqueeResponse(input: any): RewardMarqueeResponse {
  return {
    items: Array.isArray(input?.items)
      ? input.items.map((x: any) => ({
          userId: String(x?.userId ?? ''),
          payoutSol: Number(x?.payoutSol ?? 0),
          timeAgo: String(x?.timeAgo ?? ''),
        }))
      : [],
  };
}

function normalizeRewardSpinConfig(input: any): RewardSpinConfigResponse {
  const multiplierRaw = input?.multiplier ?? {};
  const multiplier: Record<string, number> = {};

  if (multiplierRaw && typeof multiplierRaw === 'object' && !Array.isArray(multiplierRaw)) {
    for (const [key, value] of Object.entries(multiplierRaw)) {
      multiplier[String(key)] = Number(value ?? 0);
    }
  }

  return {
    reels: Number(input?.reels ?? 0),
    symbols: Array.isArray(input?.symbols) ? input.symbols.map(String) : [],
    multiplier,
    rule: String(input?.rule ?? ''),
  };
}

function normalizeRewardSpinResponse(input: any): RewardSpinResponse {
  return {
    result: Array.isArray(input?.result) ? input.result.map(String) : [],
    payoutSol: Number(input?.payoutSol ?? 0),
    ticketsLeft: Number(input?.ticketsLeft ?? 0),
    claimableSol: Number(input?.claimableSol ?? 0),
    cooldownUntil: String(input?.cooldownUntil ?? ''),
  };
}

export async function getRewardInfo(walletAddress: string): Promise<RewardInfoResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const headers = getAuthHeaders();
  const { data } = await getViaProxy<RewardInfoResponse>('/reward/info', { walletAddress: addr }, headers);
  return normalizeRewardInfo(data, addr);
}

export async function claimReward(walletAddress: string): Promise<RewardClaimResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const headers = getAuthHeaders();
  const { data } = await postViaProxy<RewardClaimResponse>('/reward/claim', { walletAddress: addr }, headers);
  return normalizeRewardClaimResponse(data);
}

export async function convertRewardPoints(
  walletAddress: string,
  tickets: number,
  mode: 'exact' | 'all'
): Promise<RewardConvertResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const safeTickets = Number(tickets);
  if (!Number.isFinite(safeTickets) || safeTickets < 0) {
    throw new Error('tickets must be a number >= 0');
  }

  const headers = getAuthHeaders();
  const { data } = await postViaProxy<RewardConvertResponse>(
    '/reward/convert',
    { walletAddress: addr, tickets: safeTickets, mode },
    headers
  );
  return normalizeRewardConvertResponse(data);
}

export async function getRewardMarquee(): Promise<RewardMarqueeResponse> {
  const headers = getAuthHeaders();
  const { data } = await getViaProxy<RewardMarqueeResponse>('/reward/marquee', {}, headers);
  return normalizeRewardMarqueeResponse(data);
}

export async function getRewardSpinConfig(): Promise<RewardSpinConfigResponse> {
  const headers = getAuthHeaders();
  const { data } = await getViaProxy<RewardSpinConfigResponse>('/reward/spin-config', {}, headers);
  return normalizeRewardSpinConfig(data);
}

export async function spinReward(walletAddress: string): Promise<RewardSpinResponse> {
  const addr = String(walletAddress ?? '').trim();
  if (!addr) throw new Error('Missing walletAddress');

  const headers = getAuthHeaders();
  const { data } = await postViaProxy<RewardSpinResponse>('/reward/spin', { walletAddress: addr }, headers);
  return normalizeRewardSpinResponse(data);
}

