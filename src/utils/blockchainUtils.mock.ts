/**
 * Mock blockchain hooks & utils
 * ES2020-safe: KHÔNG dùng BigInt literal (0n)
 * Dùng cho local / mock mode
 */

// =====================
// Price & Liquidity
// =====================

export const useCurrentTokenPrice = () => ({
  // ~0.001 BONE (wei)
  data: BigInt('1000000000000000'),
  refetch: () => {},
});

export const useTokenLiquidity = () => ({
  // [tokenReserve, ethReserve, totalLiquidity]
  data: [
    BigInt(0),
    BigInt(0),
    BigInt('50000000000000000'), // 0.05 ETH
  ],
  refetch: () => {},
});

// =====================
// Buy / Sell calculator
// =====================

export const useCalcBuyReturn = () => ({
  data: BigInt('100000000000000000'), // 0.1 token (wei)
  isLoading: false,
});

export const useCalcSellReturn = () => ({
  data: BigInt('50000000000000000'), // 0.05 token (wei)
  isLoading: false,
});

// =====================
// User balances
// =====================

export const useUserBalance = () => ({
  ethBalance: BigInt('10000000000000000000'), // 10 ETH
  tokenBalance: BigInt('1000000000000000000000000'), // 1,000,000 token
  refetch: () => {},
});

// =====================
// Allowance
// =====================

export const useTokenAllowance = () => ({
  data: BigInt(1),
});

// =====================
// Transactions (mock tx hash)
// =====================

export const useBuyTokens = () => ({
  buyTokens: async () => '0xtxhash_buy_mock',
});

export const useSellTokens = () => ({
  sellTokens: async () => '0xtxhash_sell_mock',
});

export const useApproveTokens = () => ({
  approveTokens: async () => '0xtxhash_approve_mock',
});

// =====================
// Utils
// =====================

export const getBondingCurveAddress = () =>
  '0xbondingcurve00000000000000000000000001';
