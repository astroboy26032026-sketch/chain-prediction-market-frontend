// src/utils/api.index.ts
import * as realApi from './api';
import * as mockApi from './api.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const impl = USE_MOCK ? (mockApi as any) : (realApi as any);

/**
 * ⚠️ RE-EXPORT NAMED FUNCTIONS
 * - switch implementation theo env
 * - giữ API cũ nơi cần thiết (đặc biệt getAllTokensTrends)
 */


export const getRecentTokens = (...args: Parameters<typeof realApi.getRecentTokens>) =>
  (impl as typeof realApi).getRecentTokens(...args);

export const searchTokens = (...args: Parameters<typeof realApi.searchTokens>) =>
  (impl as typeof realApi).searchTokens(...args);

export const getTokensWithLiquidity = (...args: Parameters<typeof realApi.getTokensWithLiquidity>) =>
  (impl as typeof realApi).getTokensWithLiquidity(...args);

export const getTokenInfoAndTransactions = (
  ...args: Parameters<typeof realApi.getTokenInfoAndTransactions>
) => (impl as typeof realApi).getTokenInfoAndTransactions(...args);

export const getTokenUSDPriceHistory = (
  ...args: Parameters<typeof realApi.getTokenUSDPriceHistory>
) => (impl as typeof realApi).getTokenUSDPriceHistory(...args);

export const getTokenHolders = (...args: Parameters<typeof realApi.getTokenHolders>) =>
  (impl as typeof realApi).getTokenHolders(...args);

export const getTokenLiquidityEvents = (...args: Parameters<typeof realApi.getTokenLiquidityEvents>) =>
  (impl as typeof realApi).getTokenLiquidityEvents(...args);

export const getChatMessages = (...args: Parameters<typeof realApi.getChatMessages>) =>
  (impl as typeof realApi).getChatMessages(...args);

export const addChatMessage = (...args: Parameters<typeof realApi.addChatMessage>) =>
  (impl as typeof realApi).addChatMessage(...args);
