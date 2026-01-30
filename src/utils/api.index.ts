// src/utils/api.index.ts
import * as realApi from './api';

/**
 * RE-EXPORT NAMED FUNCTIONS (REAL API ONLY)
 * - giữ API cũ để không phải sửa nơi import (đặc biệt getAllTokensTrends nếu có)
 */

export const getRecentTokens = (...args: Parameters<typeof realApi.getRecentTokens>) =>
  realApi.getRecentTokens(...args);

export const searchTokens = (...args: Parameters<typeof realApi.searchTokens>) =>
  realApi.searchTokens(...args);

export const getTokensWithLiquidity = (...args: Parameters<typeof realApi.getTokensWithLiquidity>) =>
  realApi.getTokensWithLiquidity(...args);

export const getTokenInfoAndTransactions = (
  ...args: Parameters<typeof realApi.getTokenInfoAndTransactions>
) => realApi.getTokenInfoAndTransactions(...args);

export const getTokenUSDPriceHistory = (
  ...args: Parameters<typeof realApi.getTokenUSDPriceHistory>
) => realApi.getTokenUSDPriceHistory(...args);

export const getTokenHolders = (...args: Parameters<typeof realApi.getTokenHolders>) =>
  realApi.getTokenHolders(...args);

export const getTokenLiquidityEvents = (...args: Parameters<typeof realApi.getTokenLiquidityEvents>) =>
  realApi.getTokenLiquidityEvents(...args);

export const getChatMessages = (...args: Parameters<typeof realApi.getChatMessages>) =>
  realApi.getChatMessages(...args);

export const addChatMessage = (...args: Parameters<typeof realApi.addChatMessage>) =>
  realApi.addChatMessage(...args);

// Nếu dự án bạn còn dùng các hàm khác từ ./api (vd getAllTokensTrends)
// thì export thêm ở đây theo cùng pattern để tránh breaking import.
