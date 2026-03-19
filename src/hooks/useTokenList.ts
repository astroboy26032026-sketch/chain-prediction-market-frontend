// Hook: manages token list with cursor pagination, search, sort, and filtering

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchTokens } from '@/utils/api.index';
import type { TokenSearchFilters } from '@/utils/api';
import type { Token, TokenWithLiquidityEvents, PaginatedResponse } from '@/interface/types';
import type { SortOption } from '@/components/ui/SortOptions';
import { ActiveFilter, mapSortToCategory } from '@/utils/filterHelpers';

const TOKENS_PER_PAGE = 19;

export function useTokenList({
  sort,
  searchQuery,
  includeNsfw,
  activeFilter,
}: {
  sort: SortOption;
  searchQuery: string;
  includeNsfw: boolean;
  activeFilter: ActiveFilter | null;
}) {
  const [tokens, setTokens] = useState<PaginatedResponse<Token | TokenWithLiquidityEvents> | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastCursorRef = useRef<string | null>(null);
  const reqIdRef = useRef(0);

  const buildFilters = useCallback((): TokenSearchFilters => {
    const f: TokenSearchFilters = {
      includeNsfw,
      category: mapSortToCategory(sort),
    };
    if (activeFilter) {
      f.mcapMin = activeFilter.mcapMin;
      f.mcapMax = activeFilter.mcapMax;
      f.volMin = activeFilter.volMin;
      f.volMax = activeFilter.volMax;
    }
    return f;
  }, [includeNsfw, sort, activeFilter]);

  const fetchFirst = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    lastCursorRef.current = null;
    const myReq = ++reqIdRef.current;

    try {
      const filters = buildFilters();
      const q = searchQuery.trim();
      const fetched = await searchTokens(q, 1, TOKENS_PER_PAGE, undefined, filters);
      if (myReq !== reqIdRef.current) return;

      const data = (fetched?.data ?? []) as any[];
      const nc = (fetched?.nextCursor ?? null) as string | null;

      setTokens({
        data,
        tokens: [],
        totalCount: data.length,
        currentPage: 1,
        totalPages: 1,
        nextCursor: nc,
      });
      setNextCursor(nc);
      setHasMore(Boolean(nc));
    } catch (e) {
      console.error('fetchFirst error:', e);
      // Only show error + clear data if there's no existing data to display
      setTokens((prev) => {
        if (prev && (prev.data?.length ?? 0) > 0) {
          // Keep existing data visible — just show a subtle error
          return prev;
        }
        return { data: [], tokens: [], totalCount: 0, currentPage: 1, totalPages: 1, nextCursor: null };
      });
      setError(
        tokens?.data?.length
          ? 'Connection lost. Showing cached data.'
          : 'Failed to fetch tokens. Please try again later.'
      );
      setNextCursor(null);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [buildFilters, searchQuery]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    const cur = nextCursor ?? null;
    if (!cur) { setHasMore(false); return; }
    if (lastCursorRef.current === cur) return;
    lastCursorRef.current = cur;

    setIsLoadingMore(true);
    setError(null);
    const myReq = ++reqIdRef.current;

    try {
      const filters = buildFilters();
      const q = searchQuery.trim();
      const fetched = await searchTokens(q, 1, TOKENS_PER_PAGE, cur, filters);
      if (myReq !== reqIdRef.current) return;

      const items = (fetched?.data ?? []) as any[];
      const nc = (fetched?.nextCursor ?? null) as string | null;

      if (items.length === 0 || !nc || nc === cur) {
        setHasMore(false);
        setNextCursor(null);
        return;
      }

      setTokens((prev) => {
        const prevData = prev?.data ?? [];
        const seen = new Set(prevData.map((t: any) => t?.id ?? t?.address));
        const merged = [...prevData];
        for (const it of items) {
          const key = (it as any)?.id ?? (it as any)?.address;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          merged.push(it);
        }
        return {
          ...(prev ?? { tokens: [], totalCount: 0, currentPage: 1, totalPages: 1 }),
          data: merged,
          totalCount: merged.length,
          nextCursor: nc,
        };
      });
      setNextCursor(nc);
      setHasMore(true);
    } catch (e) {
      console.error('fetchMore error:', e);
      // Allow retry: reset cursor lock so user can click Load More again
      lastCursorRef.current = null;
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, buildFilters, searchQuery, nextCursor]);

  const resetCursor = useCallback(() => {
    lastCursorRef.current = null;
    setNextCursor(null);
    setHasMore(true);
  }, []);

  // refetch when user-facing dependencies change
  // NOTE: do NOT include fetchFirst/resetCursor in deps — they are stable-by-intent
  // but their useCallback deps overlap with these primitives, causing double-fires.
  useEffect(() => {
    resetCursor();
    fetchFirst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, searchQuery, includeNsfw, activeFilter]);

  return {
    tokens,
    setTokens,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    fetchMore,
    resetCursor,
  };
}
