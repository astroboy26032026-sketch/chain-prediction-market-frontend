// src/utils/api.mock.ts
import {
  Token,
  TokenWithLiquidityEvents,
  TokenWithTransactions,
  PaginatedResponse,
  LiquidityEvent,
  USDHistoricalPrice,
  TokenHolder,
} from '@/interface/types';
import { mockTokens } from '@/mock/token';
import { getMockTokenDetail } from '@/mock/factories/tokenDetail.factory';

// ---------- helpers ----------
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const toNumOrNull = (v: any): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Cursor mock:
 * - cursor là offset dạng string: "0", "20", ...
 * - nextCursor = String(offset + limit) nếu còn data
 */
const parseCursorOffset = (cursor?: string): number => {
  if (!cursor) return 0;
  const n = parseInt(String(cursor), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const makeNextCursor = (offset: number, limit: number, total: number): string | null => {
  const next = offset + limit;
  return next < total ? String(next) : null;
};

const normalizeCategory = (s?: string) => (s ?? '').trim().toLowerCase();

type SearchFilters = {
  category?: string; // trending | marketcap | new | finalized | pre-active | all
  includeNsfw?: boolean | null;
  mcapMin?: number | null;
  mcapMax?: number | null;
  volMin?: number | null;
  volMax?: number | null;
};

type TrendsOpts = {
  includeNsfw?: boolean | null;
  limit?: number;
  cursor?: string;
  mcapMin?: number | null;
  mcapMax?: number | null;
  volMin?: number | null;
  volMax?: number | null;
};

// build list theo filters chung
const applyCommonFilters = (input: Token[], filters?: SearchFilters | TrendsOpts) => {
  let list = [...input];

  // includeNsfw
  const includeNsfw = (filters as any)?.includeNsfw ?? false;
  if (!includeNsfw) list = list.filter((t) => !t.isNSFW);

  // mcap range
  const mcapMin = toNumOrNull((filters as any)?.mcapMin);
  const mcapMax = toNumOrNull((filters as any)?.mcapMax);
  if (mcapMin !== null) list = list.filter((t) => (t.marketCap ?? 0) >= mcapMin);
  if (mcapMax !== null) list = list.filter((t) => (t.marketCap ?? 0) <= mcapMax);

  // volume range
  const volMin = toNumOrNull((filters as any)?.volMin);
  const volMax = toNumOrNull((filters as any)?.volMax);
  if (volMin !== null) list = list.filter((t) => (t.volume24h ?? 0) >= volMin);
  if (volMax !== null) list = list.filter((t) => (t.volume24h ?? 0) <= volMax);

  return list;
};

// sort theo category
const sortByCategory = (input: Token[], category?: string) => {
  const c = normalizeCategory(category);

  const list = [...input];

  switch (c) {
    case 'marketcap':
      list.sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
      return list;

    case 'new':
      list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      return list;

    case 'finalized':
      // mock finalized: marketCap > 200k
      return list
        .filter((t) => (t.marketCap ?? 0) > 200_000)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));

    case 'pre-active':
      // mock pre-active: marketCap <= 200k và có volume (hoặc mới tạo)
      return list
        .filter((t) => (t.marketCap ?? 0) <= 200_000)
        .sort((a, b) => {
          const av = (a.volume24h ?? 0) * 0.7 + (a.marketCap ?? 0) * 0.3;
          const bv = (b.volume24h ?? 0) * 0.7 + (b.marketCap ?? 0) * 0.3;
          return bv - av;
        });

    case 'all':
      // all: giữ thứ tự "trending-ish" cho đẹp
      list.sort((a, b) => {
        const av = (a.volume24h ?? 0) * 0.6 + (a.marketCap ?? 0) * 0.4;
        const bv = (b.volume24h ?? 0) * 0.6 + (b.marketCap ?? 0) * 0.4;
        return bv - av;
      });
      return list;

    case 'trending':
    default:
      // trending: kết hợp volume + marketcap
      list.sort((a, b) => {
        const av = (a.volume24h ?? 0) * 0.6 + (a.marketCap ?? 0) * 0.4;
        const bv = (b.volume24h ?? 0) * 0.6 + (b.marketCap ?? 0) * 0.4;
        return bv - av;
      });
      return list;
  }
};

// map cursor list -> legacy paginated response (compat UI)
const toLegacyPaginatedCursor = <T>(
  items: T[],
  nextCursor: string | null
): PaginatedResponse<T> => {
  return {
    data: items,
    tokens: [], // compat UI cũ
    totalCount: items.length, // mock (BE thật không trả total)
    currentPage: 1,
    totalPages: 1,
    nextCursor,
  };
};

// ---------- HOME ----------
/**
 * ✅ Align với real api.ts (Hướng B):
 * getAllTokensTrends(opts?) => { items, nextCursor }
 *
 * Note: real đang set category='trending' trong api.ts.
 */
export async function getAllTokensTrends(
  opts?: TrendsOpts
): Promise<{ items: Token[]; nextCursor: string | null }> {
  const limit = clamp(opts?.limit ?? 20, 1, 50);
  const offset = parseCursorOffset(opts?.cursor);

  // trending + common filters
  let list = applyCommonFilters(mockTokens, opts);
  list = sortByCategory(list, 'trending');

  const sliced = list.slice(offset, offset + limit);
  const nextCursor = makeNextCursor(offset, limit, list.length);

  return { items: sliced, nextCursor };
}

export async function getRecentTokens(page = 1, pageSize = 20): Promise<PaginatedResponse<Token>> {
  const limit = clamp(pageSize, 1, 50);

  const sorted = [...mockTokens].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  // page-based cũ (giữ lại vì một số screen vẫn gọi)
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: sorted.slice(start, end),
    totalCount: sorted.length,
    currentPage: page,
    totalPages: Math.ceil(sorted.length / limit) || 1,
    tokens: [],
    nextCursor: null,
  };
}

/**
 * ✅ signature align với real api.ts:
 * searchTokens(query, page, pageSize, cursor?, filters?)
 *
 * - Cursor mock thật: cursor = offset string.
 * - category hỗ trợ: trending, marketcap, new, finalized, pre-active, all
 */
export async function searchTokens(
  query: string,
  page = 1,
  pageSize = 20,
  cursor?: string,
  filters?: SearchFilters
): Promise<PaginatedResponse<Token>> {
  const limit = clamp(pageSize, 1, 50);

  // Nếu code cũ gọi page>1 mà không đưa cursor -> không map chuẩn (giống real)
  if (page > 1 && !cursor) {
    return toLegacyPaginatedCursor<Token>([], null);
  }

  const q = (query ?? '').trim().toLowerCase();
  const offset = parseCursorOffset(cursor);

  let list = [...mockTokens];

  // keyword filter (name, symbol, address, creatorAddress)
  if (q) {
    list = list.filter((t) => {
      const name = (t.name ?? '').toLowerCase();
      const symbol = (t.symbol ?? '').toLowerCase();
      const address = (t.address ?? '').toLowerCase();
      const creator = (t.creatorAddress ?? '').toLowerCase();
      return name.includes(q) || symbol.includes(q) || address.includes(q) || creator.includes(q);
    });
  }

  // common filters
  list = applyCommonFilters(list, filters);

  // category
  const category = normalizeCategory(filters?.category);
  list = sortByCategory(list, category);

  const sliced = list.slice(offset, offset + limit);
  const nextCursor = makeNextCursor(offset, limit, list.length);

  return toLegacyPaginatedCursor<Token>(sliced, nextCursor);
}

export async function getTokensWithLiquidity(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<TokenWithLiquidityEvents>> {
  const limit = clamp(pageSize, 1, 50);

  const filtered = mockTokens
    .filter((t) => (t.marketCap ?? 0) > 200_000)
    .map((t) => ({ ...t, liquidityEvents: [] as LiquidityEvent[] }));

  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: filtered.slice(start, end),
    totalCount: filtered.length,
    currentPage: page,
    totalPages: Math.ceil(filtered.length / limit) || 1,
    tokens: [],
    nextCursor: null,
  };
}

// ---------- DETAIL ----------
export async function getTokenInfoAndTransactions(
  address: string,
  transactionPage = 1,
  transactionPageSize = 10
): Promise<TokenWithTransactions> {
  const detail = getMockTokenDetail(address);

  const tx = detail.transactions.data;
  const start = (transactionPage - 1) * transactionPageSize;
  const end = start + transactionPageSize;
  const sliced = tx.slice(start, end);

  return {
    ...detail,
    transactions: {
      data: sliced,
      pagination: {
        currentPage: transactionPage,
        pageSize: transactionPageSize,
        totalCount: tx.length,
        totalPages: Math.ceil(tx.length / transactionPageSize) || 1,
      },
    },
  };
}

export async function getTokenUSDPriceHistory(address: string): Promise<USDHistoricalPrice[]> {
  const base = Number(getMockTokenDetail(address).priceUsd || '0.000001');
  const now = Date.now();

  return Array.from({ length: 60 }).map((_, i) => {
    const t = now - (59 - i) * 60_000;
    const drift = Math.sin(i / 7) * base * 0.05;
    const val = Math.max(base + drift, base * 0.6);
    return {
      tokenPriceUSD: val.toFixed(9),
      timestamp: new Date(t).toISOString(),
    };
  });
}

export async function getTokenLiquidityEvents(
  _tokenId: string
): Promise<{ liquidityEvents: LiquidityEvent[] }> {
  return { liquidityEvents: [] };
}

export async function getCurrentPrice(): Promise<string> {
  return '0.65';
}

export async function getTokenHolders(_tokenAddress: string): Promise<TokenHolder[]> {
  return Array.from({ length: 30 }).map((_, i) => ({
    address: `0xholder${i.toString().padStart(34, '0')}`,
    balance: String(10_000_000 - i * 123_456),
  }));
}

// ---------- CHAT (in-memory) ----------
type ChatMessage = {
  id: number;
  user: string;
  token: string;
  message: string;
  reply_to: number | null;
  timestamp: string;
};

const chatStore: Record<string, ChatMessage[]> = {};

export async function getChatMessages(token: string): Promise<ChatMessage[]> {
  if (!chatStore[token]) {
    chatStore[token] = Array.from({ length: 6 }).map((_, i) => ({
      id: i + 1,
      user: `0xchatuser${i.toString().padStart(32, '0')}`,
      token,
      message: `Mock chat message #${i + 1}`,
      reply_to: i === 3 ? 2 : null,
      timestamp: new Date(Date.now() - (6 - i) * 120_000).toISOString(),
    }));
  }
  return chatStore[token];
}

export async function addChatMessage(
  user: string,
  token: string,
  message: string,
  replyTo?: number
): Promise<{ id: number }> {
  const list = (chatStore[token] ||= []);
  const id = (list[list.length - 1]?.id ?? 0) + 1;
  list.push({
    id,
    user,
    token,
    message,
    reply_to: replyTo ?? null,
    timestamp: new Date().toISOString(),
  });
  return { id };
}
