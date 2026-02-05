// src/utils/api.index.ts
import * as realApi from './api';

/**
 * RE-EXPORT NAMED FUNCTIONS (REAL API ONLY)
 * - Giữ API cũ để không phải sửa nơi import (khi cần)
 * - Nhưng: legacy liên quan chart/price/liquidity/token-detail sẽ comment để không gọi nhầm API cũ
 */

// =====================
// ✅ NEW BE API (Solana): Token Info / Price / Liquidity / Trades
// =====================

export const getTokenInfo = (...args: Parameters<typeof realApi.getTokenInfo>) =>
  realApi.getTokenInfo(...args);

export const getTokenPrice = (...args: Parameters<typeof realApi.getTokenPrice>) =>
  realApi.getTokenPrice(...args);

export const getTokenLiquidity = (...args: Parameters<typeof realApi.getTokenLiquidity>) =>
  realApi.getTokenLiquidity(...args);

export const getTokenTrades = (...args: Parameters<typeof realApi.getTokenTrades>) =>
  realApi.getTokenTrades(...args);

// =====================
// ✅ NEW BE API (Solana): Create Token Flow
// =====================

export const prepareMint = (...args: Parameters<typeof realApi.prepareMint>) =>
  realApi.prepareMint(...args);

export const confirmMint = (...args: Parameters<typeof realApi.confirmMint>) =>
  realApi.confirmMint(...args);

export const uploadTokenImage = (...args: Parameters<typeof realApi.uploadTokenImage>) =>
  realApi.uploadTokenImage(...args);

export const createTokenDraft = (...args: Parameters<typeof realApi.createTokenDraft>) =>
  realApi.createTokenDraft(...args);

export const previewInitialBuy = (...args: Parameters<typeof realApi.previewInitialBuy>) =>
  realApi.previewInitialBuy(...args);

export const finalizeTokenCreation = (...args: Parameters<typeof realApi.finalizeTokenCreation>) =>
  realApi.finalizeTokenCreation(...args);

// =====================
// Existing exports (still used)
// =====================

export const getRecentTokens = (...args: Parameters<typeof realApi.getRecentTokens>) =>
  realApi.getRecentTokens(...args);

export const searchTokens = (...args: Parameters<typeof realApi.searchTokens>) =>
  realApi.searchTokens(...args);

// export const getChatMessages = (...args: Parameters<typeof realApi.getChatMessages>) =>
//   realApi.getChatMessages(...args);

// export const addChatMessage = (...args: Parameters<typeof realApi.addChatMessage>) =>
//   realApi.addChatMessage(...args);

export const getLeaderboardTop = (...args: Parameters<typeof realApi.getLeaderboardTop>) =>
  realApi.getLeaderboardTop(...args);

export const getLeaderboardList = (...args: Parameters<typeof realApi.getLeaderboardList>) =>
  realApi.getLeaderboardList(...args);

// =====================
// ✅ Referrals exports
// =====================

// export const getReferralSummary = (...args: Parameters<typeof realApi.getReferralSummary>) =>
//   realApi.getReferralSummary(...args);

// export const getReferralLink = (...args: Parameters<typeof realApi.getReferralLink>) =>
//   realApi.getReferralLink(...args);

// export const getReferralList = (...args: Parameters<typeof realApi.getReferralList>) =>
//   realApi.getReferralList(...args);

// export const claimReferralRewards = (...args: Parameters<typeof realApi.claimReferralRewards>) =>
//   realApi.claimReferralRewards(...args);

// export const trackReferral = (...args: Parameters<typeof realApi.trackReferral>) =>
//   realApi.trackReferral(...args);

// =====================
// ✅ Profile exports (NEW)
// =====================

// export const getProfileInfo = (...args: Parameters<typeof realApi.getProfileInfo>) =>
//   realApi.getProfileInfo(...args);

// =====================
// Still-used existing APIs (non-chart)
// (Bạn có thể comment nếu muốn “khóa” hết /ports)
// =====================

// export const getTransactionsByAddress = (...args: Parameters<typeof realApi.getTransactionsByAddress>) =>
//   realApi.getTransactionsByAddress(...args);

export const getTokensByCreator = (...args: Parameters<typeof realApi.getTokensByCreator>) =>
  realApi.getTokensByCreator(...args);

export const getAllTokenAddresses = (...args: Parameters<typeof realApi.getAllTokenAddresses>) =>
  realApi.getAllTokenAddresses(...args);

// Nếu còn page nào update metadata kiểu cũ thì giữ, còn không thì comment.
// export const updateToken = (...args: Parameters<typeof realApi.updateToken>) =>
//   realApi.updateToken(...args);

// =====================================================================
// ⚠️ LEGACY CHART / PRICE / LIQUIDITY / TOKEN DETAIL APIs (DISABLED)
// Comment hết để không vô tình gọi API cũ (/ports/...) trong Solana setup.
// Bạn sẽ xoá sau.
// =====================================================================

// export const getTokensWithLiquidity = (...args: Parameters<typeof realApi.getTokensWithLiquidity>) =>
//   realApi.getTokensWithLiquidity(...args);

// export const getTokenInfoAndTransactions = (
//   ...args: Parameters<typeof realApi.getTokenInfoAndTransactions>
// ) => realApi.getTokenInfoAndTransactions(...args);

// export const getTokenUSDPriceHistory = (
//   ...args: Parameters<typeof realApi.getTokenUSDPriceHistory>
// ) => realApi.getTokenUSDPriceHistory(...args);

// export const getTokenHolders = (...args: Parameters<typeof realApi.getTokenHolders>) =>
//   realApi.getTokenHolders(...args);

// export const getTokenLiquidityEvents = (...args: Parameters<typeof realApi.getTokenLiquidityEvents>) =>
//   realApi.getTokenLiquidityEvents(...args);
