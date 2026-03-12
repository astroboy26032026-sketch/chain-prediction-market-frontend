// Filter/sort helpers for home page token filtering

import type { SortOption } from '@/components/ui/SortOptions';
import type { TokenCategory } from '@/utils/api';

export const FILTER_DEFAULTS = {
  mcapMin: 1_000,
  mcapMax: 50_000_000,
  volMin: 0,
  volMax: 500_000,
};

export type ActiveFilter = {
  mcapMin: number;
  mcapMax: number;
  volMin: number;
  volMax: number;
};

export const parseAbbrev = (s: string | number | null | undefined): number => {
  if (s === null || s === undefined) return NaN;
  if (typeof s === 'number') return s;

  const raw = String(s).trim().toLowerCase().replace(/[\$,]/g, '');
  if (!raw) return NaN;

  const multiplier = raw.endsWith('k') ? 1e3 : raw.endsWith('m') ? 1e6 : raw.endsWith('b') ? 1e9 : 1;
  const num = parseFloat(raw.replace(/[kmb]$/i, ''));
  return Number.isNaN(num) ? NaN : num * multiplier;
};

export const fmtAbbrev = (n: number): string =>
  n >= 1e9
    ? `$${(n / 1e9).toFixed(1)}B`
    : n >= 1e6
      ? `$${(n / 1e6).toFixed(1)}M`
      : n >= 1e3
        ? `$${(n / 1e3).toFixed(1)}K`
        : `$${Math.max(0, Math.floor(n))}`;

export const getMcap = (t: any): number =>
  Number(
    t?.mcapUsd ??
      t?.marketcapUsd ??
      t?.marketCapUsd ??
      t?.marketcap ??
      t?.marketCap ??
      t?.mcap ??
      t?.mc ??
      0
  );

export const getVol24h = (t: any): number =>
  Number(t?.vol24hUsd ?? t?.volume24hUsd ?? t?.volume24h ?? t?.vol24h ?? t?.vol ?? 0);

export const mapSortToCategory = (sort: SortOption): TokenCategory => {
  switch (sort) {
    case 'trending':
      return 'trending';
    case 'marketcap':
      return 'marketcap';
    case 'new':
      return 'new';
    case 'finalized':
      return 'finalized';
    default:
      return 'trending';
  }
};
