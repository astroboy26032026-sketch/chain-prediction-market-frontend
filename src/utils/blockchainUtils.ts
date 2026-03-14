// src/utils/blockchainUtils.ts
/**
 * Solana migration note:
 * - Project hiện đã chuyển sang Solana wallet-adapter + Auth API mới.
 * - Các hooks EVM (wagmi/viem) đã bị loại khỏi runtime để tránh:
 *   WagmiProviderNotFoundError
 *
 * ✅ IMPORTANT:
 * - Các hook EVM cũ sẽ được giữ dạng "disabled" để không crash UI nếu còn import.
 * - Nhưng Create Token flow mới (Solana) sẽ dùng hook `useCreateTokenSolana()`.
 */

import { useCallback, useMemo, useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';

import {
  prepareMint,
  confirmMint,
  type PrepareMintRequest,
  type PrepareMintResponse,
  type ConfirmMintResponse,
} from '@/utils/api';

/* =========================
   Common helpers (SAFE)
========================= */

// ✅ no BigInt literals (0n / 10n), no bigint exponentiation (**)
const BI_0 = BigInt(0);
const BI_10 = BigInt(10);

function pow10BigInt(decimals: number): bigint {
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

  if (str.includes('.') || str.includes('e') || str.includes('E')) {
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }

  try {
    const n = Number(formatUnitsSafe(BigInt(str), decimals));
    return Number.isFinite(n) ? n : null;
  } catch {
    const n = Number(str);
    return Number.isFinite(n) ? n : null;
  }
}

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

/** Compact: 2 decimals, k/M/B/T, smart small-number precision. Used in dashboard. */
export const formatAmountV3 = (amount: string | number, decimals: number = 18) => {
  const n = parseAmountToNumber(amount, decimals);
  if (n === null) return '0';

  const format = (value: number, maxDecimals: number) => {
    const rounded = value.toFixed(maxDecimals);
    return Number(rounded).toString();
  };

  const abs = Math.abs(n);

  if (abs >= 1e12) return `${format(n / 1e12, 2)}T`;
  if (abs >= 1e9) return `${format(n / 1e9, 2)}B`;
  if (abs >= 1e6) return `${format(n / 1e6, 2)}M`;
  if (abs >= 1e3) return `${format(n / 1e3, 2)}k`;
  if (abs >= 1) return format(n, 2);

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

/** Single-unit short format (e.g. "5m", "3hr"). Used in TokenCard. */
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

/** Full precision: 4-8 decimals. Used in TokenInfo price display. */
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

/** Medium precision: 1-3 decimals. Used in notifications & liquidity display. */
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

// ✅ FIX: guard null/undefined/short string
export function formatAddressV2(address?: string | null): string {
  const a = String(address ?? '').trim();
  if (!a) return '';
  if (a.length <= 6) return a;
  return a.slice(-6);
}

export function shortenAddress(address: string): string {
  if (!address) return '';
  if (address.startsWith('0x') && address.length >= 10) return address.slice(2, 8);
  return address.length > 8 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
}

export function getExplorerUrl(txHash: string): string {
  // legacy
  return `https://shibariumscan.io/tx/${txHash}`;
}

/* =========================
   ✅ Solana Create Token Hook (NEW)
========================= */

export type CreateMintResult = {
  mint: string;
  ata: string;
  txBase64: string;
  signature: string;
  confirmed?: ConfirmMintResponse;
  prepared: PrepareMintResponse;
};

export function useCreateTokenSolana() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [isLoading, setIsLoading] = useState(false);

  const canSign = useMemo(() => !!publicKey && !!signTransaction, [publicKey, signTransaction]);

  const createMint = useCallback(
    async (payload: PrepareMintRequest): Promise<CreateMintResult> => {
      if (!publicKey) throw new Error('Wallet not connected');
      if (!sendTransaction) throw new Error('Wallet adapter does not support sendTransaction');

      setIsLoading(true);
      try {
        // 1) call BE: prepare mint (unsigned tx base64)
        const prepared = await prepareMint(payload);

        // 2) decode base64 -> VersionedTransaction (with validation)
        const txBytes = Buffer.from(prepared.txBase64, 'base64');
        if (txBytes.length === 0 || txBytes.length > 1232) {
          throw new Error('Invalid transaction: unexpected size');
        }
        const tx = VersionedTransaction.deserialize(txBytes);

        // Security: basic sanity checks on the transaction
        if (tx.message.staticAccountKeys.length === 0) {
          throw new Error('Invalid transaction: no account keys');
        }

        // 3) send tx (wallet signs + sends)
        const signature = await sendTransaction(tx, connection);

        // 4) optional: confirm transaction on chain (safe)
        try {
          await connection.confirmTransaction(signature, 'confirmed');
        } catch {
          // ignore: still allow backend confirm
        }

        // 5) confirm mint in BE (persist)
        const confirmed = await confirmMint({
          mint: prepared.mint,
          symbol: prepared.symbol,
          name: prepared.name,
        });

        return {
          mint: prepared.mint,
          ata: prepared.ata,
          txBase64: prepared.txBase64,
          signature,
          confirmed,
          prepared,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [publicKey, sendTransaction, connection]
  );

  return {
    createMint,
    isLoading,
    canSign,
  };
}

/* =========================
   @deprecated EVM Hooks: disabled stubs returning safe defaults.
   Still imported by PriceLiquidity.tsx & TokenCard.tsx.
   TODO: remove these stubs once those components are migrated to Solana API.
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

export const getBondingCurveAddress = (_tokenAddress: any): any => undefined;

export function useCurrentTokenPrice(_tokenAddress: any): DisabledReadHook<bigint> {
  return { disabled: true, data: undefined, refetch: async () => {} };
}
export function useTotalSupply(_tokenAddress: any): DisabledReadHook<bigint> {
  return { disabled: true, data: undefined, refetch: async () => {} };
}
export function useMarketCap(_tokenAddress: any): DisabledReadHook<bigint> {
  return { disabled: true, data: undefined, refetch: async () => {} };
}

type TransformedLiquidityData = [string, bigint, bigint, boolean] | undefined;
export const useTokenLiquidity = (_tokenAddress: any): DisabledQueryHook<TransformedLiquidityData> => {
  return { disabled: true, data: undefined, isError: false, isLoading: false, refetch: async () => {} };
};

export function useCalcBuyReturn(_tokenAddress: any, _ethAmount: any) {
  return { disabled: true as const, data: undefined as bigint | undefined, isLoading: false as const };
}
export function useCalcSellReturn(_tokenAddress: any, _tokenAmount: any) {
  return { disabled: true as const, data: undefined as bigint | undefined, isLoading: false as const };
}
export function useUserBalance(_userAddress: any, _tokenAddress: any) {
  return {
    disabled: true as const,
    ethBalance: undefined as bigint | undefined,
    tokenBalance: undefined as bigint | undefined,
    refetch: () => {},
  };
}
export function useERC20Balance(_tokenAddress: any, _walletAddress: any) {
  return {
    disabled: true as const,
    data: undefined as bigint | undefined,
    balance: undefined as bigint | undefined,
    refetch: async () => {},
  };
}
export function useTokenAllowance(_tokenAddress: any, _owner: any, _spender: any) {
  return { disabled: true as const, data: undefined as bigint | undefined };
}

// ❌ REMOVE old hook name to prevent new code from using it by accident
export function useCreateToken(): DisabledHookBase & {
  createToken: (..._args: any[]) => Promise<never>;
  isLoading: false;
  UserRejectedRequestError: any;
} {
  return {
    disabled: true,
    createToken: async () => {
      throw new Error('[EVM_DISABLED] useCreateToken is removed. Use useCreateTokenSolana() or API create-token flow.');
    },
    isLoading: false,
    UserRejectedRequestError: undefined,
  };
}

export function useBuyTokens(_tokenAddress?: any): DisabledWriteHook & { buyTokens: (..._args: any[]) => Promise<never> } {
  return {
    disabled: true,
    isPending: false,
    buyTokens: async () => {
      throw new Error('[EVM_DISABLED] buyTokens is not available on Solana setup.');
    },
  };
}
export function useSellTokens(
  _tokenAddress?: any
): DisabledWriteHook & { sellTokens: (..._args: any[]) => Promise<never> } {
  return {
    disabled: true,
    isPending: false,
    sellTokens: async () => {
      throw new Error('[EVM_DISABLED] sellTokens is not available on Solana setup.');
    },
  };
}
export function useApproveTokens(): DisabledWriteHook & { approveTokens: (..._args: any[]) => Promise<never> } {
  return {
    disabled: true,
    isPending: false,
    approveTokens: async () => {
      throw new Error('[EVM_DISABLED] approveTokens is not available on Solana setup.');
    },
  };
}
