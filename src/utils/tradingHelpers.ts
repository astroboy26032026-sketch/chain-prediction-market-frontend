// Trading utility functions extracted from token/[address].tsx

import type {
  TradingPreviewBuyResponse,
  TradingPreviewSellResponse,
} from '@/interface/types';
import { previewBuy, previewSell } from '@/utils/api.index';

export const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const POLL_INTERVAL_MS = 1000;
export const POLL_MAX_TRIES = 12;

/**
 * BE sometimes returns various endpoint formats. Normalize to a clean path.
 */
export const normalizeTrackingEndpoint = (v: any) => {
  let s = String(v ?? '').trim();
  if (!s) return '';

  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      s = `${u.pathname}${u.search || ''}`;
    }
  } catch {
    // ignore
  }

  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s*:\s*/i, '');
  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '');

  if (!s.startsWith('/')) s = `/${s}`;
  s = s.replace(/\/{2,}/g, '/');

  return s;
};

export const parseNumberInput = (v: string) => {
  const s = String(v ?? '').trim();
  if (!s) return 0;
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/**
 * Convert human token amount -> base units string (no float issues)
 */
export const toBaseUnitsString = (amountHumanInput: string, decimalsInput: number): string => {
  const raw = String(amountHumanInput ?? '').trim();
  if (!raw) return '0';

  if (/e/i.test(raw)) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return '0';
    return toBaseUnitsString(n.toFixed(18), decimalsInput);
  }

  if (!/^\d+(\.\d+)?$/.test(raw)) return '0';

  const d = clamp(Math.trunc(Number(decimalsInput) || 0), 0, 18);
  const [intsRaw, fracsRaw = ''] = raw.split('.');
  const ints = (intsRaw || '0').replace(/^0+(?=\d)/, '') || '0';
  const fracs = fracsRaw.replace(/[^\d]/g, '').slice(0, d).padEnd(d, '0');

  const joined = `${ints}${fracs}`.replace(/^0+(?=\d)/, '') || '0';
  return joined;
};

/**
 * Preview BUY: input SOL (human) -> output estimatedTokens (human)
 */
export async function estimateTokensFromSol({
  tokenAddr,
  solIn,
}: {
  tokenAddr: string;
  solIn: number;
}): Promise<{ tokenOutHuman: number; preview: TradingPreviewBuyResponse }> {
  const res = (await previewBuy({
    tokenAddress: tokenAddr,
    amountSol: solIn,
  })) as TradingPreviewBuyResponse;

  const tokenOutHuman = Number(res?.estimatedTokens ?? 0);
  if (!Number.isFinite(tokenOutHuman) || tokenOutHuman <= 0) {
    throw new Error('Amount too small');
  }

  return { tokenOutHuman, preview: res };
}

/**
 * Preview SELL: input TOKEN (human) -> output estimatedSol (human)
 */
export async function estimateSolFromTokens({
  tokenAddr,
  tokenInHuman,
}: {
  tokenAddr: string;
  tokenInHuman: number;
}): Promise<{ solOut: number; preview: TradingPreviewSellResponse }> {
  const res = (await previewSell({
    tokenAddress: tokenAddr,
    amountInToken: tokenInHuman,
  })) as TradingPreviewSellResponse;

  const solOut = Number(res?.estimatedSol ?? 0);
  if (!Number.isFinite(solOut) || solOut <= 0) throw new Error('Amount too small');

  return { solOut, preview: res };
}
