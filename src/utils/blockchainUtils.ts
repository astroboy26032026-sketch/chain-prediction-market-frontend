// src/utils/blockchainUtils.ts
/**
 * Solana migration note:
 * - Project hiện đã chuyển sang Solana wallet-adapter + Auth API mới.
 * - Các hooks EVM (wagmi/viem) đã bị loại khỏi runtime để tránh:
 *   WagmiProviderNotFoundError
 *
 * - Để app không crash nếu còn component nào lỡ gọi các hook EVM cũ,
 *   tất cả EVM hooks dưới đây sẽ trả về object "disabled" thay vì throw.
 *
 * Khi bạn migrate xong, hãy xóa hẳn các exports EVM này hoặc tách sang file evm riêng.
 */

/* =========================
   Common helpers (SAFE)
========================= */

// ✅ no BigInt literals (0n / 10n), no bigint exponentiation (**)
const BI_0 = BigInt(0);
const BI_10 = BigInt(10);

function pow10BigInt(decimals: number): bigint {
  // handle weird inputs safely
  const d = Number.isFinite(decimals) ? Math.max(0, Math.floor(decimals)) : 0;
  let out = BigInt(1);
  for (let i = 0; i < d; i++) out = out * BI_10;
  return out;
}

// Safe formatUnits for bigint (thay cho viem formatUnits)
export function formatUnitsSafe(value: bigint, decimals = 18): string {
  const neg = value < BI_0;
  const v = neg ? -value : value;

  const base = pow10BigInt(decimals);
  const i = v / base;
  const f = v % base;

  if (decimals === 0) return `${neg ? '-' : ''}${i.toString()}`;

  const frac = f.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${i.toString()}${frac ? '.' + frac : ''}`;
}
/**
 * Parse amount safely for both:
 * - EVM integer string (wei-like): "1000000000000000000"
 * - Solana/BE decimal string: "9856.875140477"
 * - number input
 *
 * Returns a finite number or null.
 */
export function parseAmountToNumber(amount: string | number, decimals = 18): number | null {
  if (amount === null || amount === undefined) return null;

  const str = String(amount).trim();
  if (!str) return null;

  // If it's already a normal decimal representation => parse directly
  // (Solana / BE new)
  if (str.includes('.') || str.includes('e') || str.includes('E')) {
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }

  // Integer string case (EVM wei-like). BigInt can handle it.
  try {
    const n = Number(formatUnitsSafe(BigInt(str), decimals));
    return Number.isFinite(n) ? n : null;
  } catch {
    // Fallback: parseFloat as last resort (never crash)
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }
}

/**
 * Generic compact formatter used by formatAmount* helpers.
 * - k/M/B/T for large
 * - variable decimals for small
 */
export function formatCompactNumber(value: number): string {
  const format = (v: number, maxDecimals: number) => {
    const rounded = v.toFixed(maxDecimals);
    return rounded.replace(/\.?0+$/, '');
  };

  const abs = Math.abs(value);

  if (abs >= 1e12) return `${format(value / 1e12, 2)}T`;
  if (abs >= 1e9) return `${format(value / 1e9, 2)}B`;
  if (abs >= 1e6) return `${format(value / 1e6, 2)}M`;
  if (abs >= 1e3) return `${format(value / 1e3, 2)}k`;
  if (abs >= 1) return format(value, 4);
  if (abs >= 0.01) return format(value, 6);
  return format(value, 8);
}

/* =========================
   Amount/time formatting (SAFE)
========================= */

/**
 * ✅ FIXED for Solana:
 * - Accepts decimal string OR integer string
 * - Never BigInt(decimal)
 * - Never throws
 */
export const formatAmountV3 = (amount: string | number, decimals: number = 18) => {
  const n = parseAmountToNumber(amount, decimals);
  if (n === null) return '0';

  const format = (value: number, maxDecimals: number) => {
    const rounded = value.toFixed(maxDecimals);
    // Keep same behavior as your old code: parseFloat(toString()) removes trailing zeros
    const withoutTrailingZeros = Number(rounded).toString();
    return withoutTrailingZeros;
  };

  const abs = Math.abs(n);

  if (abs >= 1e12) return `${format(n / 1e12, 2)}T`;
  if (abs >= 1e9) return `${format(n / 1e9, 2)}B`;
  if (abs >= 1e6) return `${format(n / 1e6, 2)}M`;
  if (abs >= 1e3) return `${format(n / 1e3, 2)}k`;
  if (abs >= 1) return format(n, 2);

  // Small number: dynamic decimals similar to your logic, but safe for n=0
  const safe = abs > 0 ? abs : 1e-9;
  const dec = Math.min(6, Math.max(2, 3 - Math.floor(Math.log10(safe))));
  return format(n, dec);
};

export function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const seconds = diffInSeconds % 60;
  const minutes = Math.floor((diffInSeconds / 60) % 60);
  const hours = Math.floor((diffInSeconds / 3600) % 24);
  const days = Math.floor((diffInSeconds / 86400) % 30);
  const months = Math.floor((diffInSeconds / (86400 * 30)) % 12);
  const years = Math.floor(diffInSeconds / (86400 * 365));

  let result = '';
  let unitCount = 0;

  if (years > 0 && unitCount < 2) {
    result += `${years}yr `;
    unitCount++;
  }
  if (months > 0 && unitCount < 2) {
    result += `${months}mo `;
    unitCount++;
  }
  if (days > 0 && unitCount < 2) {
    result += `${days}d `;
    unitCount++;
  }
  if (hours > 0 && unitCount < 2) {
    result += `${hours}h `;
    unitCount++;
  }
  if (minutes > 0 && unitCount < 2) {
    result += `${minutes}m `;
    unitCount++;
  }
  if (seconds > 0 && unitCount === 0) {
    result += `${seconds}s `;
  }

  return result.trim() + ' ago';
}

export function formatTimestampV1(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}hr`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo`;
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears}yr`;
}

/**
 * ✅ FIXED: do not BigInt(decimal)
 * (giữ output style cũ)
 */
export const formatAmount = (amount: string | number, decimals: number = 18) => {
  const n = parseAmountToNumber(amount, decimals);
  if (n === null) return '0';

  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(4)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(4)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(4)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(4)}k`;
  return n.toFixed(8);
};

/**
 * ✅ FIXED: do not BigInt(decimal)
 * (giữ output style cũ)
 */
export const formatAmountV2 = (amount: string | number, decimals: number = 18) => {
  const n = parseAmountToNumber(amount, decimals);
  if (n === null) return '0';

  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}k`;
  return n.toFixed(3);
};

export function formatAddressV2(address: string): string {
  const lastSix = address.slice(-6);
  return `${lastSix}`;
}

/**
 * Legacy helper: UI cũ dùng shortenAddress cho EVM (0x..).
 * Với Solana address, fallback sẽ rút gọn kiểu 4...4.
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  if (address.startsWith('0x') && address.length >= 10) return address.slice(2, 8);
  return address.length > 8 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
}

/**
 * Explorer URL (legacy).
 * Bạn có thể đổi sang Solana explorer sau:
 * https://explorer.solana.com/tx/<sig>?cluster=devnet
 */
export function getExplorerUrl(txHash: string): string {
  return `https://shibariumscan.io/tx/${txHash}`;
}

/* =========================
   EVM Hooks: NO-THROW disabled stubs
========================= */

type DisabledHookBase = { disabled: true };

type DisabledReadHook<T> = DisabledHookBase & {
  data: T | undefined;
  refetch: () => Promise<void>;
};

type DisabledQueryHook<T> = DisabledHookBase & {
  data: T | undefined;
  isError: false;
  isLoading: false;
  refetch: () => Promise<void>;
};

type DisabledWriteHook = DisabledHookBase & {
  data?: undefined;
  error?: undefined;
  isPending?: false;
};

/** Kept for TS compatibility. */
export const getBondingCurveAddress = (_tokenAddress: any): any => {
  // return undefined but do not throw
  return undefined;
};

export function useCurrentTokenPrice(_tokenAddress: any): DisabledReadHook<bigint> {
  return {
    disabled: true,
    data: undefined,
    refetch: async () => {},
  };
}

export function useTotalSupply(_tokenAddress: any): DisabledReadHook<bigint> {
  return {
    disabled: true,
    data: undefined,
    refetch: async () => {},
  };
}

export function useMarketCap(_tokenAddress: any): DisabledReadHook<bigint> {
  return {
    disabled: true,
    data: undefined,
    refetch: async () => {},
  };
}

// Liquidity transform types from your old code:
type TransformedLiquidityData = [string, bigint, bigint, boolean] | undefined;

export const useTokenLiquidity = (_tokenAddress: any): DisabledQueryHook<TransformedLiquidityData> => {
  return {
    disabled: true,
    data: undefined,
    isError: false,
    isLoading: false,
    refetch: async () => {},
  };
};

export function useCalcBuyReturn(
  _tokenAddress: any,
  _ethAmount: any
): DisabledHookBase & { data: bigint | undefined; isLoading: false } {
  return {
    disabled: true,
    data: undefined,
    isLoading: false,
  };
}

export function useCalcSellReturn(
  _tokenAddress: any,
  _tokenAmount: any
): DisabledHookBase & { data: bigint | undefined; isLoading: false } {
  return {
    disabled: true,
    data: undefined,
    isLoading: false,
  };
}

export function useUserBalance(
  _userAddress: any,
  _tokenAddress: any
): DisabledHookBase & {
  ethBalance: bigint | undefined;
  tokenBalance: bigint | undefined;
  refetch: () => void;
} {
  return {
    disabled: true,
    ethBalance: undefined,
    tokenBalance: undefined,
    refetch: () => {},
  };
}

export function useERC20Balance(
  _tokenAddress: any,
  _walletAddress: any
): DisabledReadHook<bigint> & { balance: bigint | undefined } {
  return {
    disabled: true,
    data: undefined,
    balance: undefined,
    refetch: async () => {},
  };
}

export function useTokenAllowance(_tokenAddress: any, _owner: any, _spender: any): DisabledHookBase & { data: bigint | undefined } {
  return {
    disabled: true,
    data: undefined,
  };
}

export function useCreateToken(): DisabledHookBase & {
  createToken: (..._args: any[]) => Promise<never>;
  isLoading: false;
  UserRejectedRequestError: any;
} {
  return {
    disabled: true,
    // Calling this should clearly fail, but not crash on import/render.
    createToken: async () => {
      throw new Error('[EVM_DISABLED] createToken is not available on Solana setup.');
    },
    isLoading: false,
    UserRejectedRequestError: undefined,
  };
}

export function useBuyTokens(_tokenAddress?: any): DisabledWriteHook & {
  buyTokens: (..._args: any[]) => Promise<never>;
} {
  return {
    disabled: true,
    isPending: false,
    buyTokens: async () => {
      throw new Error('[EVM_DISABLED] buyTokens is not available on Solana setup.');
    },
  };
}

export function useSellTokens(_tokenAddress?: any): DisabledWriteHook & {
  sellTokens: (..._args: any[]) => Promise<never>;
} {
  return {
    disabled: true,
    isPending: false,
    sellTokens: async () => {
      throw new Error('[EVM_DISABLED] sellTokens is not available on Solana setup.');
    },
  };
}

export function useApproveTokens(): DisabledWriteHook & {
  approveTokens: (..._args: any[]) => Promise<never>;
} {
  return {
    disabled: true,
    isPending: false,
    approveTokens: async () => {
      throw new Error('[EVM_DISABLED] approveTokens is not available on Solana setup.');
    },
  };
}
