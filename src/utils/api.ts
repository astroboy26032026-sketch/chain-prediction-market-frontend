// api.ts
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
  TransactionResponse
} from '@/interface/types';
import { ethers } from 'ethers';

// =====================
// Base & helpers
// =====================
const PROXY_BASE = '/api/proxy';
const isServer = typeof window === 'undefined';
// Dùng biến môi trường này khi SSR (nhớ tạo .env.local)
// NEXT_PUBLIC_SITE_URL=http://localhost:3000
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Trả về URL đầy đủ. SSR cần absolute, CSR để nguyên relative.
const absProxy = (path: string) =>
  isServer ? `${SITE_URL}${PROXY_BASE}${path}` : `${PROXY_BASE}${path}`;

const getViaProxy = async <T = any>(path: string, params?: any) => {
  const url = absProxy(path);
  return axios.get<T>(url, { params });
};

// =====================
// API calls (qua proxy)
// =====================
export async function getAllTokens(page = 1, pageSize = 13): Promise<PaginatedResponse<Token>> {
  const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/getAllTokens', { page, pageSize });
  return data;
}

export async function getAllTokensTrends(): Promise<Token[]> {
  const { data } = await getViaProxy<Token[]>('/ports/getAllTokensTrends');
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

export async function getRecentTokens(
  page = 1,
  pageSize = 20,
  hours = 24
): Promise<PaginatedResponse<Token> | null> {
  try {
    const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/getRecentTokens', {
      page,
      pageSize,
      hours
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
  pageSize = 20
): Promise<PaginatedResponse<Token>> {
  const { data } = await getViaProxy<PaginatedResponse<Token>>('/ports/searchTokens', {
    q: query,
    page,
    pageSize
  });
  return data;
}

export async function getTokensWithLiquidity(
  page = 1,
  pageSize = 20
): Promise<PaginatedResponse<TokenWithLiquidityEvents>> {
  const { data } = await getViaProxy<PaginatedResponse<TokenWithLiquidityEvents>>('/ports/getTokensWithLiquidity', {
    page,
    pageSize
  });
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
    pageSize
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
    transactionPageSize
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
    const [ethPrice, historicalPrices] = await Promise.all([
      getCurrentPrice(),
      getHistoricalPriceData(address)
    ]);

    return (historicalPrices as any as HistoricalPrice[]).map((price) => {
      const tokenPriceInWei = ethers.BigNumber.from(price.tokenPrice);
      const tokenPriceInETH = ethers.utils.formatEther(tokenPriceInWei);
      const tokenPriceUSD = parseFloat(tokenPriceInETH) * parseFloat(ethPrice);
      return {
        tokenPriceUSD: tokenPriceUSD.toFixed(9),
        timestamp: price.timestamp
      };
    });
  } catch (error) {
    console.error('Error calculating USD price history:', error);
    throw new Error('Failed to calculate USD price history');
  }
}

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
    pageSize
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

export async function getChatMessages(token: string): Promise<Array<{
  id: number;
  user: string;
  token: string;
  message: string;
  reply_to: number | null;
  timestamp: string;
}>> {
  const { data } = await getViaProxy('/ports/getChatMessages', { token });
  return data as any;
}

// Gọi thẳng block explorer (không qua proxy)
export async function getTokenHolders(tokenAddress: string): Promise<TokenHolder[]> {
  try {
    const response = await axios.get(`https://www.shibariumscan.io/api/v2/tokens/${tokenAddress}/holders`);
    const data = response.data;
    return data.items.map((item: any) => ({
      address: item.address.hash,
      balance: item.value
    }));
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw new Error('Failed to fetch token holders');
  }
}
