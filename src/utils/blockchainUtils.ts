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

// Safe formatUnits for bigint (thay cho viem formatUnits)
export function formatUnitsSafe(value: bigint, decimals = 18): string {
  const neg = value < 0n;
  const v = neg ? -value : value;

  const base = 10n ** BigInt(decimals);
  const i = v / base;
  const f = v % base;

  if (decimals === 0) return `${neg ? '-' : ''}${i.toString()}`;

  const frac = f.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${i.toString()}${frac ? '.' + frac : ''}`;
}

/* =========================
   Amount/time formatting (SAFE)
========================= */

export const formatAmountV3 = (amount: string, decimals: number = 18) => {
  const formattedAmount = parseFloat(formatUnitsSafe(BigInt(amount), decimals));

  const format = (value: number, maxDecimals: number) => {
    const rounded = value.toFixed(maxDecimals);
    const withoutTrailingZeros = parseFloat(rounded).toString();
    return withoutTrailingZeros;
  };

  if (formattedAmount >= 1e12) {
    return `${format(formattedAmount / 1e12, 2)}T`;
  } else if (formattedAmount >= 1e9) {
    return `${format(formattedAmount / 1e9, 2)}B`;
  } else if (formattedAmount >= 1e6) {
    return `${format(formattedAmount / 1e6, 2)}M`;
  } else if (formattedAmount >= 1e3) {
    return `${format(formattedAmount / 1e3, 2)}k`;
  } else if (formattedAmount >= 1) {
    return format(formattedAmount, 2);
  } else {
    const dec = Math.min(6, Math.max(2, 3 - Math.floor(Math.log10(formattedAmount || 1e-9))));
    return format(formattedAmount, dec);
  }
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

export const formatAmount = (amount: string, decimals: number = 18) => {
  const formattedAmount = parseFloat(formatUnitsSafe(BigInt(amount), decimals));
  if (formattedAmount >= 1e12) return `${(formattedAmount / 1e12).toFixed(4)}T`;
  if (formattedAmount >= 1e9) return `${(formattedAmount / 1e9).toFixed(4)}B`;
  if (formattedAmount >= 1e6) return `${(formattedAmount / 1e6).toFixed(4)}M`;
  if (formattedAmount >= 1e3) return `${(formattedAmount / 1e3).toFixed(4)}k`;
  return formattedAmount.toFixed(8);
};

export const formatAmountV2 = (amount: string, decimals: number = 18) => {
  const formattedAmount = parseFloat(formatUnitsSafe(BigInt(amount), decimals));
  if (formattedAmount >= 1e12) return `${(formattedAmount / 1e12).toFixed(1)}T`;
  if (formattedAmount >= 1e9) return `${(formattedAmount / 1e9).toFixed(2)}B`;
  if (formattedAmount >= 1e6) return `${(formattedAmount / 1e6).toFixed(2)}M`;
  if (formattedAmount >= 1e3) return `${(formattedAmount / 1e3).toFixed(2)}k`;
  return formattedAmount.toFixed(3);
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

export function useCalcBuyReturn(_tokenAddress: any, _ethAmount: any): DisabledHookBase & { data: bigint | undefined; isLoading: false } {
  return {
    disabled: true,
    data: undefined,
    isLoading: false,
  };
}

export function useCalcSellReturn(_tokenAddress: any, _tokenAmount: any): DisabledHookBase & { data: bigint | undefined; isLoading: false } {
  return {
    disabled: true,
    data: undefined,
    isLoading: false,
  };
}

export function useUserBalance(_userAddress: any, _tokenAddress: any): DisabledHookBase & {
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

export function useERC20Balance(_tokenAddress: any, _walletAddress: any): DisabledReadHook<bigint> & { balance: bigint | undefined } {
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
