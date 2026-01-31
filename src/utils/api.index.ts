// src/utils/api.index.ts
import * as realApi from './api';

/**
 * RE-EXPORT NAMED FUNCTIONS (REAL API ONLY)
 * - giữ API cũ để không phải sửa nơi import
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

export const getLeaderboardTop = (...args: Parameters<typeof realApi.getLeaderboardTop>) =>
  realApi.getLeaderboardTop(...args);

export const getLeaderboardList = (...args: Parameters<typeof realApi.getLeaderboardList>) =>
  realApi.getLeaderboardList(...args);

// =====================
// ✅ Referrals exports
// =====================

export const getReferralSummary = (...args: Parameters<typeof realApi.getReferralSummary>) =>
  realApi.getReferralSummary(...args);

export const getReferralLink = (...args: Parameters<typeof realApi.getReferralLink>) =>
  realApi.getReferralLink(...args);

export const getReferralList = (...args: Parameters<typeof realApi.getReferralList>) =>
  realApi.getReferralList(...args);

export const claimReferralRewards = (...args: Parameters<typeof realApi.claimReferralRewards>) =>
  realApi.claimReferralRewards(...args);

export const trackReferral = (...args: Parameters<typeof realApi.trackReferral>) =>
  realApi.trackReferral(...args);

// Nếu dự án bạn còn dùng các hàm khác từ ./api
// thì export thêm ở đây theo cùng pattern để tránh breaking import.
