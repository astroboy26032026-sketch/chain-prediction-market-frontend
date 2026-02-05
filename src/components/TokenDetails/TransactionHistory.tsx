// src/components/TokenDetails/TransactionHistory.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTokenTrades } from '@/utils/api.index';
import type { TokenTrade } from '@/interface/types';
import LoadingBar from '@/components/ui/LoadingBar';

type Props = {
  tokenAddress: string;
};

const PAGE_LIMIT = 10;

const fmtUsd = (v: any, digits = 6) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return `$${n.toFixed(digits)}`;
};

const fmtNumber = (v: any, digits?: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return typeof digits === 'number' ? n.toFixed(digits) : n.toLocaleString();
};

const fmtTime = (t: number) => {
  // BE schema: time: number (thường là epoch seconds; fallback ms)
  const ms = t > 1e12 ? t : t * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(); // show date + time cho rõ
};

const TransactionHistory: React.FC<Props> = ({ tokenAddress }) => {
  const [trades, setTrades] = useState<TokenTrade[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // tránh setState sau unmount / tránh race condition
  const reqIdRef = useRef(0);

  const canLoadMore = useMemo(() => hasMore && !loading, [hasMore, loading]);

  const loadTrades = useCallback(
    async (isLoadMore = false) => {
      const addr = (tokenAddress || '').trim();
      if (!addr) return;
      if (loading) return;

      const myReqId = ++reqIdRef.current;

      try {
        setLoading(true);
        setError(null);

        const res = await getTokenTrades(addr, {
          limit: PAGE_LIMIT,
          cursor: isLoadMore ? cursor ?? undefined : undefined,
        });

        // drop stale response
        if (reqIdRef.current !== myReqId) return;

        const next = res?.nextCursor ?? null;
        const list = res?.trades ?? [];

        setTrades((prev) => (isLoadMore ? [...prev, ...list] : list));
        setCursor(next);
        setHasMore(Boolean(next));
      } catch (e: any) {
        if (reqIdRef.current !== myReqId) return;
        setError(e?.message || 'Failed to load trades');
      } finally {
        if (reqIdRef.current !== myReqId) return;
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [tokenAddress, cursor, loading]
  );

  // initial load + reset when token changes
  useEffect(() => {
    const addr = (tokenAddress || '').trim();
    if (!addr) return;

    // reset state khi đổi token
    setTrades([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
    setInitialLoading(true);

    loadTrades(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress]);

  if (initialLoading) return <LoadingBar />;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        {loading && <span className="text-xs text-gray-400">Loading…</span>}
      </div>

      {error && <div className="text-red-500 text-sm mb-3">{error}</div>}

      {trades.length === 0 && !loading && (
        <div className="text-sm text-gray-400">No trades yet</div>
      )}

      {trades.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800 text-gray-400">
              <tr>
                <th className="py-2 text-left">Type</th>
                <th className="py-2 text-left">Price (USD)</th>
                <th className="py-2 text-left">Amount</th>
                <th className="py-2 text-left">SOL</th>
                <th className="py-2 text-left">Total (USD)</th>
                <th className="py-2 text-left">Time</th>
              </tr>
            </thead>

            <tbody>
              {trades.map((t, idx) => {
                // signature có thể trùng hiếm; fallback idx để tránh key warning
                const key = t.signature ? `${t.signature}-${idx}` : `${t.publicKey}-${t.time}-${idx}`;

                return (
                  <tr key={key} className="border-b border-gray-900">
                    <td className={`py-2 font-medium ${t.isBuy ? 'text-green-400' : 'text-red-400'}`}>
                      {t.isBuy ? 'BUY' : 'SELL'}
                    </td>

                    <td className="py-2">{fmtUsd(t.price, 6)}</td>

                    <td className="py-2">{fmtNumber(t.amount)}</td>

                    <td className="py-2">{fmtNumber(t.solAmount, 4)}</td>

                    <td className="py-2">
                      {(() => {
                        const n = Number(t.totalUsd);
                        if (!Number.isFinite(n)) return '-';
                        return `$${n.toLocaleString()}`;
                      })()}
                    </td>

                    <td className="py-2 text-gray-400">{fmtTime(t.time)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <button
            disabled={!canLoadMore}
            onClick={() => loadTrades(true)}
            className="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-sm disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
