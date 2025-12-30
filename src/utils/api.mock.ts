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
const paginate = <T>(data: T[], page = 1, pageSize = 20): PaginatedResponse<T> => {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: data.slice(start, end),
    totalCount: data.length,
    currentPage: page,
    totalPages: Math.ceil(data.length / pageSize) || 1,
    tokens: [], // ✅ BẮT BUỘC PHẢI CÓ
  };
};

// ---------- HOME ----------
export async function getAllTokensTrends(): Promise<Token[]> {
  return mockTokens;
}

export async function getRecentTokens(page = 1, pageSize = 20): Promise<PaginatedResponse<Token>> {
  // mock: sắp theo createdAt desc
  const sorted = [...mockTokens].sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return paginate(sorted, page, pageSize);
}

export async function searchTokens(query: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Token>> {
  const q = query.trim().toLowerCase();
  const filtered = mockTokens.filter(
    (t) => t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q)
  );
  return paginate(filtered, page, pageSize);
}

export async function getTokensWithLiquidity(page = 1, pageSize = 20): Promise<PaginatedResponse<TokenWithLiquidityEvents>> {
  // mock: ai có marketCap > 200k xem như "finalized"
  const filtered = mockTokens
    .filter((t) => (t.marketCap ?? 0) > 200_000)
    .map((t) => ({ ...t, liquidityEvents: [] as LiquidityEvent[] }));

  return paginate(filtered, page, pageSize);
}

// ---------- DETAIL ----------
export async function getTokenInfoAndTransactions(
  address: string,
  transactionPage = 1,
  transactionPageSize = 10
): Promise<TokenWithTransactions> {
  const detail = getMockTokenDetail(address);

  // paginate transaction
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
  // mock 60 points (1h), timestamp ISO
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
  tokenId: string
): Promise<{ liquidityEvents: LiquidityEvent[] }> {
  return {
    liquidityEvents: [], // ✅ RỖNG → CHART HIỆN
  };
}

export async function getCurrentPrice(): Promise<string> {
  // mock BONE price (USD)
  return '0.65';
}

export async function getTokenHolders(tokenAddress: string): Promise<TokenHolder[]> {
  // mock 30 holders
  const holders: TokenHolder[] = Array.from({ length: 30 }).map((_, i) => ({
    address: `0xholder${i.toString().padStart(34, '0')}`,
    balance: String(10_000_000 - i * 123_456),
  }));
  return holders;
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
