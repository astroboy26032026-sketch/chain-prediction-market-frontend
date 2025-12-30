// src/utils/api.index.ts

import * as realApi from './api';
import * as mockApi from './api.mock';

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const impl = USE_MOCK ? mockApi : realApi;

/**
 * ⚠️ RE-EXPORT NAMED FUNCTIONS
 * giữ nguyên API cũ
 * nhưng switch implementation theo env
 */

export const getAllTokensTrends = (...args: Parameters<typeof realApi.getAllTokensTrends>) =>
  impl.getAllTokensTrends(...args);

export const getRecentTokens = (...args: Parameters<typeof realApi.getRecentTokens>) =>
  impl.getRecentTokens(...args);

export const searchTokens = (...args: Parameters<typeof realApi.searchTokens>) =>
  impl.searchTokens(...args);

export const getTokensWithLiquidity = (...args: Parameters<typeof realApi.getTokensWithLiquidity>) =>
  impl.getTokensWithLiquidity(...args);

export const getTokenInfoAndTransactions = (
  ...args: Parameters<typeof realApi.getTokenInfoAndTransactions>
) => impl.getTokenInfoAndTransactions(...args);

export const getTokenUSDPriceHistory = (
  ...args: Parameters<typeof realApi.getTokenUSDPriceHistory>
) => impl.getTokenUSDPriceHistory(...args);

export const getTokenHolders = (
  ...args: Parameters<typeof realApi.getTokenHolders>
) => impl.getTokenHolders(...args);

export const getTokenLiquidityEvents = (
  ...args: Parameters<typeof realApi.getTokenLiquidityEvents>
) => impl.getTokenLiquidityEvents(...args);

export const getChatMessages = (
  ...args: Parameters<typeof realApi.getChatMessages>
) => impl.getChatMessages(...args);

export const addChatMessage = (
  ...args: Parameters<typeof realApi.addChatMessage>
) => impl.addChatMessage(...args);