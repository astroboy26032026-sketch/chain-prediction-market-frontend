// src/components/TokenDetails/TransactionHistory.tsx — Order Book view (Prediction Market)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTokenTrades } from '@/utils/api.index';
import type { TokenTrade } from '@/interface/types';
import SpaceLoader from '@/components/ui/SpaceLoader';
import { COMMON } from '@/constants/ui-text';
import { getMarketByAddress } from '@/data/markets';

type Props = {
  tokenAddress: string;
};

const PAGE_LIMIT = 10;

const fmtSol = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return n.toFixed(4);
};

const fmtPrice = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '$0.00';
  return `$${n.toFixed(3)}`;
};

const fmtShares = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toString();
};

const fmtTotal = (v: any) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '$0';
  return `$${n.toFixed(0)}`;
};

const TransactionHistory: React.FC<Props> = ({ tokenAddress }) => {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'yes' | 'no'>('yes');

  const reqIdRef = useRef(0);
  const canLoadMore = useMemo(() => hasMore && !loading, [hasMore, loading]);

  const isMockMarket = useMemo(() => !!getMarketByAddress(tokenAddress), [tokenAddress]);

  const loadTrades = useCallback(
    async (isLoadMore = false) => {
      const addr = (tokenAddress || '').trim();
      if (!addr || isMockMarket) return;
      if (loading) return;

      const myReqId = ++reqIdRef.current;

      try {
        setLoading(true);
        setError(null);

        const res = await getTokenTrades(addr, {
          limit: PAGE_LIMIT,
          cursor: isLoadMore ? cursor ?? undefined : undefined,
        });

        if (reqIdRef.current !== myReqId) return;

        const next = res?.nextCursor ?? null;
        const list = res?.trades ?? [];

        setTrades((prev) => (isLoadMore ? [...prev, ...list] : list));
        setCursor(next);
        setHasMore(Boolean(next));
      } catch (e: any) {
        if (reqIdRef.current !== myReqId) return;
        setError(e?.message || 'Failed to load order book');
      } finally {
        if (reqIdRef.current !== myReqId) return;
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [tokenAddress, cursor, loading, isMockMarket]
  );

  useEffect(() => {
    const addr = (tokenAddress || '').trim();
    if (!addr) return;

    if (isMockMarket) {
      setInitialLoading(false);
      return;
    }

    setTrades([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
    setInitialLoading(true);

    loadTrades(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress, isMockMarket]);

  // Split trades into buy (yes) and sell (no) sides
  const buyOrders = useMemo(() => trades.filter((t) => t.isBuy), [trades]);
  const sellOrders = useMemo(() => trades.filter((t) => !t.isBuy), [trades]);

  const activeOrders = activeTab === 'yes' ? buyOrders : sellOrders;

  // Calculate spread
  const spread = useMemo(() => {
    const bestBuy = buyOrders.length > 0 ? Math.max(...buyOrders.map((t) => Number(t.price))) : 0;
    const bestSell = sellOrders.length > 0 ? Math.min(...sellOrders.map((t) => Number(t.price))) : 0;
    if (bestBuy === 0 || bestSell === 0) return null;
    return Math.abs(bestSell - bestBuy).toFixed(3);
  }, [buyOrders, sellOrders]);

  if (initialLoading) return <SpaceLoader variant="overlay" />;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--foreground)]">Order Book</h3>
        {loading && <span className="text-xs text-gray-400">Loading...</span>}
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      {/* Yes/No tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('yes')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'yes'
              ? 'bg-green-500/15 text-green-400 border border-green-500/40'
              : 'bg-[var(--card2)] text-gray-400 border border-transparent hover:text-gray-200'
          }`}
        >
          Trade Yes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('no')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'no'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
              : 'bg-[var(--card2)] text-gray-400 border border-transparent hover:text-gray-200'
          }`}
        >
          Trade No
        </button>
      </div>

      {/* Order Book Table */}
      {activeOrders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[300px]">
            <thead>
              <tr className="bg-[var(--card2)] border-thin">
                <th className="px-3 py-2 text-xs text-gray-400">Price</th>
                <th className="px-3 py-2 text-xs text-gray-400 text-center">Shares</th>
                <th className="px-3 py-2 text-xs text-gray-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((t, idx) => {
                const key = t.signature ? `${t.signature}-${idx}` : `${t.publicKey}-${t.time}-${idx}`;
                const price = Number(t.price);
                const shares = t.amount;
                const total = Number(t.solAmount);

                return (
                  <tr
                    key={key}
                    className="border-b border-[var(--card-hover)] hover:bg-[var(--card-hover)] transition-colors"
                  >
                    <td className={`px-3 py-2 text-xs sm:text-sm font-medium ${
                      activeTab === 'yes' ? 'text-green-400' : 'text-rose-400'
                    }`}>
                      {fmtPrice(price)}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-gray-300 text-center">
                      {fmtShares(shares)}
                    </td>
                    <td className="px-3 py-2 text-xs sm:text-sm text-gray-300 text-right font-medium">
                      {fmtTotal(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Spread indicator */}
      {spread !== null && (
        <div className="flex items-center justify-center my-3 text-xs text-gray-500">
          <span className="px-3 py-1 bg-[var(--card2)] rounded-full">
            Spread: {spread}
          </span>
        </div>
      )}

      {activeOrders.length === 0 && !loading && (
        <div className="text-center text-sm text-gray-500 py-6">No orders yet</div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            disabled={!canLoadMore}
            onClick={() => loadTrades(true)}
            className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
          >
            {loading ? COMMON.LOADING : COMMON.LOAD_MORE}
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
