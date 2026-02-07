// src/utils/api.index.ts
import * as realApi from './api';

/**
 * RE-EXPORT NAMED FUNCTIONS (REAL API ONLY)
 * - Giữ API cũ để không phải sửa nơi import (khi cần)
 * - Tất cả logic nằm ở ./api.ts
 */

// =====================
// ✅ AUTH helpers
// =====================
export const AUTH_BASE_URL = realApi.AUTH_BASE_URL;

export const authApi = realApi.authApi;

export const getStoredToken = realApi.getStoredToken;
export const setStoredToken = realApi.setStoredToken;
export const setAuthToken = realApi.setAuthToken;

// =====================
// ✅ Idempotency helpers
// =====================
export type IdempotencyOptions = realApi.IdempotencyOptions;
export const newIdempotencyKey = realApi.newIdempotencyKey;

// =====================
// ✅ Token metadata update (STUB until BE is ready)
// =====================
export type UpdateTokenRequest = realApi.UpdateTokenRequest;
export const updateToken = (...args: Parameters<typeof realApi.updateToken>) => realApi.updateToken(...args);

// =====================
// ✅ Profile (STUB until BE is ready)
// =====================
export type ProfileInfoResponse = realApi.ProfileInfoResponse;
export const getProfileInfo = (...args: Parameters<typeof realApi.getProfileInfo>) => realApi.getProfileInfo(...args);

// =====================
// ✅ NEW BE API (Solana): Token Info / Price / Liquidity / Trades / Holders
// =====================
export const getTokenInfo = (...args: Parameters<typeof realApi.getTokenInfo>) => realApi.getTokenInfo(...args);

export const getTokenPrice = (...args: Parameters<typeof realApi.getTokenPrice>) => realApi.getTokenPrice(...args);

export const getTokenLiquidity = (...args: Parameters<typeof realApi.getTokenLiquidity>) =>
  realApi.getTokenLiquidity(...args);

export const getTokenTrades = (...args: Parameters<typeof realApi.getTokenTrades>) => realApi.getTokenTrades(...args);

export const getTokenHolders = (...args: Parameters<typeof realApi.getTokenHolders>) => realApi.getTokenHolders(...args);

// =====================
// ✅ Trading (Solana): Buy / Sell + submit-signature + status
// =====================
export const buyToken = (...args: Parameters<typeof realApi.buyToken>) => realApi.buyToken(...args);

export const sellToken = (...args: Parameters<typeof realApi.sellToken>) => realApi.sellToken(...args);

export const submitSignature = (...args: Parameters<typeof realApi.submitSignature>) =>
  realApi.submitSignature(...args);

export const getTradingStatus = (...args: Parameters<typeof realApi.getTradingStatus>) =>
  realApi.getTradingStatus(...args);

// =====================
// ✅ Chatroom
// =====================
export const getChatMessages = (...args: Parameters<typeof realApi.getChatMessages>) =>
  realApi.getChatMessages(...args);

export const addChatMessage = (...args: Parameters<typeof realApi.addChatMessage>) =>
  realApi.addChatMessage(...args);

// =====================
// ✅ Create Token Flow (Solana)
// =====================
export type PrepareMintRequest = realApi.PrepareMintRequest;
export type PrepareMintResponse = realApi.PrepareMintResponse;

export type ConfirmMintRequest = realApi.ConfirmMintRequest;
export type ConfirmMintResponse = realApi.ConfirmMintResponse;

export type UploadTokenImageRequest = realApi.UploadTokenImageRequest;
export type UploadTokenImageResponse = realApi.UploadTokenImageResponse;

export type CreateTokenDraftRequest = realApi.CreateTokenDraftRequest;
export type CreateTokenDraftResponse = realApi.CreateTokenDraftResponse;

export type PreviewInitialBuyRequest = realApi.PreviewInitialBuyRequest;
export type PreviewInitialBuyResponse = realApi.PreviewInitialBuyResponse;

export type FinalizeTokenRequest = realApi.FinalizeTokenRequest;
export type FinalizeTokenResponse = realApi.FinalizeTokenResponse;

export const prepareMint = (...args: Parameters<typeof realApi.prepareMint>) => realApi.prepareMint(...args);

export const confirmMint = (...args: Parameters<typeof realApi.confirmMint>) => realApi.confirmMint(...args);

export const uploadTokenImage = (...args: Parameters<typeof realApi.uploadTokenImage>) =>
  realApi.uploadTokenImage(...args);

export const createTokenDraft = (...args: Parameters<typeof realApi.createTokenDraft>) =>
  realApi.createTokenDraft(...args);

export const previewInitialBuy = (...args: Parameters<typeof realApi.previewInitialBuy>) =>
  realApi.previewInitialBuy(...args);

export const finalizeTokenCreation = (...args: Parameters<typeof realApi.finalizeTokenCreation>) =>
  realApi.finalizeTokenCreation(...args);

// =====================
// ✅ Legacy exports still used by FE
// =====================
export type TokenCategory = realApi.TokenCategory;
export type TokenSearchFilters = realApi.TokenSearchFilters;

export type LeaderboardTopItem = realApi.LeaderboardTopItem;
export type LeaderboardListItem = realApi.LeaderboardListItem;
export type LeaderboardListResponse = realApi.LeaderboardListResponse;

export const getAllTokens = (...args: Parameters<typeof realApi.getAllTokens>) => realApi.getAllTokens(...args);

export const getAllTokensWithoutLiquidity = (...args: Parameters<typeof realApi.getAllTokensWithoutLiquidity>) =>
  realApi.getAllTokensWithoutLiquidity(...args);

export const getTotalVolume = (...args: Parameters<typeof realApi.getTotalVolume>) => realApi.getTotalVolume(...args);

export const getVolumeRange = (...args: Parameters<typeof realApi.getVolumeRange>) => realApi.getVolumeRange(...args);

export const getTotalTokenCount = (...args: Parameters<typeof realApi.getTotalTokenCount>) =>
  realApi.getTotalTokenCount(...args);

export const getRecentTokens = (...args: Parameters<typeof realApi.getRecentTokens>) => realApi.getRecentTokens(...args);

export const searchTokens = (...args: Parameters<typeof realApi.searchTokens>) => realApi.searchTokens(...args);

export const getLeaderboardTop = (...args: Parameters<typeof realApi.getLeaderboardTop>) =>
  realApi.getLeaderboardTop(...args);

export const getLeaderboardList = (...args: Parameters<typeof realApi.getLeaderboardList>) =>
  realApi.getLeaderboardList(...args);

// =====================
// ✅ Referrals
// =====================
export const getReferralSummary = (...args: Parameters<typeof realApi.getReferralSummary>) =>
  realApi.getReferralSummary(...args);

export const getReferralLinkInfo = (...args: Parameters<typeof realApi.getReferralLinkInfo>) =>
  realApi.getReferralLinkInfo(...args);

// ✅ BACKWARD COMPAT ALIAS (FE đang import getReferralLink)
export const getReferralLink = (...args: Parameters<typeof realApi.getReferralLinkInfo>) =>
  realApi.getReferralLinkInfo(...args);

export const getReferralList = (...args: Parameters<typeof realApi.getReferralList>) => realApi.getReferralList(...args);

export const claimReferralRewards = (...args: Parameters<typeof realApi.claimReferralRewards>) =>
  realApi.claimReferralRewards(...args);

// =====================
// ✅ Dashboard helpers (legacy)
// =====================
export const getTokensByCreator = (...args: Parameters<typeof realApi.getTokensByCreator>) =>
  realApi.getTokensByCreator(...args);

export const getAllTokenAddresses = (...args: Parameters<typeof realApi.getAllTokenAddresses>) =>
  realApi.getAllTokenAddresses(...args);

export const getTransactionsByAddress = (...args: Parameters<typeof realApi.getTransactionsByAddress>) =>
  realApi.getTransactionsByAddress(...args);
