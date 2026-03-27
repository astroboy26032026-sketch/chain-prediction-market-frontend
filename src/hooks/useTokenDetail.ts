// Hook: manages token detail data (info, liquidity, holders)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import {
  getTokenInfo,
  getTokenLiquidity,
  getTokenHolders,
} from '@/utils/api.index';
import type { Token, TokenHolder } from '@/interface/types';
import { getMarketByAddress } from '@/data/markets';

export function useTokenDetail(initialTokenInfo: Token | null) {
  const router = useRouter();
  const { address } = router.query;

  const tokenAddr = useMemo(() => {
    const a = Array.isArray(address) ? address[0] : address;
    return (a || '').trim() || undefined;
  }, [address]);

  const [tokenInfo, setTokenInfo] = useState<Token | null>(initialTokenInfo);
  const [liquidityEvents, setLiquidityEvents] = useState<any[]>([]);

  // holders
  const [holdersAll, setHoldersAll] = useState<TokenHolder[]>([]);
  const [holdersNextCursor, setHoldersNextCursor] = useState<string | null>(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersError, setHoldersError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [refreshCounter, setRefreshCounter] = useState(0);
  const refresh = useCallback(() => setRefreshCounter((c) => c + 1), []);

  // Race condition guard
  const reqIdRef = useRef(0);

  // Check if this is a mock prediction market — skip real API calls
  const isMockMarket = useMemo(() => {
    if (!tokenAddr) return false;
    return !!getMarketByAddress(tokenAddr);
  }, [tokenAddr]);

  const fetchTokenInfo = useCallback(async () => {
    if (!tokenAddr || isMockMarket) return;
    const myReq = ++reqIdRef.current;
    try {
      const info = await getTokenInfo(tokenAddr);
      if (myReq !== reqIdRef.current) return;
      setTokenInfo(info as any);
    } catch (e) {
      console.error('Error fetching /token/info:', e);
    }
  }, [tokenAddr, isMockMarket]);

  const fetchLiquidity = useCallback(async () => {
    if (!tokenAddr || isMockMarket) return;
    const myReq = ++reqIdRef.current;
    try {
      const lq = await getTokenLiquidity(tokenAddr);
      if (myReq !== reqIdRef.current) return;
      setLiquidityEvents(lq?.events ?? []);
    } catch (e) {
      console.error('Error fetching /token/liquidity:', e);
      if (myReq !== reqIdRef.current) return;
      setLiquidityEvents([]);
    }
  }, [tokenAddr, isMockMarket]);

  const fetchHolders = useCallback(
    async (opts?: { reset?: boolean }) => {
      if (!tokenAddr || isMockMarket) return;
      const reset = !!opts?.reset;
      const cursor = reset ? null : holdersNextCursor;
      if (!reset && cursor === null) return;

      setHoldersLoading(true);
      setHoldersError(null);

      try {
        const res = await getTokenHolders(tokenAddr, { limit: 200, cursor });
        const incoming = Array.isArray(res?.holders) ? res.holders : [];
        setHoldersNextCursor(res?.nextCursor ?? null);
        setHoldersAll((prev) => (reset ? incoming : [...prev, ...incoming]));
      } catch (e: any) {
        console.error('Error fetching /token/holders:', e);
        setHoldersError(e?.message || 'Failed to load holders');
        if (reset) {
          setHoldersAll([]);
          setHoldersNextCursor(null);
        }
      } finally {
        setHoldersLoading(false);
      }
    },
    [tokenAddr, holdersNextCursor, isMockMarket]
  );

  // Initial fetch when token changes
  useEffect(() => {
    if (!tokenAddr) return;
    setCurrentPage(1);
    setHoldersAll([]);
    setHoldersNextCursor(null);
    setHoldersError(null);
    fetchTokenInfo();
    fetchLiquidity();
    fetchHolders({ reset: true });
  }, [tokenAddr, fetchTokenInfo, fetchLiquidity, fetchHolders]);

  const tokenSymbol = String((tokenInfo as any)?.symbol ?? '').trim();

  const decimals = useMemo(() => {
    const d = Number((tokenInfo as any)?.decimals ?? 9);
    const clamped = Math.min(Math.max(Math.trunc(Number.isFinite(d) ? d : 9), 0), 18);
    return clamped;
  }, [tokenInfo]);

  return {
    tokenAddr,
    tokenInfo,
    tokenSymbol,
    decimals,
    liquidityEvents,
    holdersAll,
    holdersNextCursor,
    holdersLoading,
    holdersError,
    currentPage,
    setCurrentPage,
    refreshCounter,
    refresh,
    fetchLiquidity,
    fetchHolders,
  };
}
