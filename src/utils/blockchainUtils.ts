// src/utils/blockchainUtils.ts

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
  return `https://solscan.io/tx/${txHash}`;
}


