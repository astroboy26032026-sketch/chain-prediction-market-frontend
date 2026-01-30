import React, { useEffect, useMemo, useRef, useState } from 'react';
import TokenCard from './TokenCard';
import { Token, TokenWithLiquidityEvents } from '@/interface/types';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import LoadingBar from '@/components/ui/LoadingBar';
import { SortOption } from '../ui/SortOptions';

/**
 * Lưu liquidity theo token address
 * Dùng để sort marketcap/liquidity mà không cần refetch lại toàn list
 */
interface TokenLiquidityData {
  [key: string]: bigint;
}

type Mode = 'page' | 'cursor';

interface CursorPaginationProps {
  mode: 'cursor';
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void> | void;

  /**
   * Auto-load khi scroll tới cuối list.
   * Nếu false -> hiển thị nút "Load more".
   */
  autoLoad?: boolean;
}

interface PagePaginationProps {
  mode?: 'page'; // default
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface TokenListProps {
  tokens: (Token | TokenWithLiquidityEvents)[];
  isEnded: boolean;
  sortType: SortOption;

  itemsPerPage: number;
  isFullList?: boolean;

  pagination: CursorPaginationProps | PagePaginationProps;
}

const TokenList: React.FC<TokenListProps> = ({
  tokens,
  isEnded,
  sortType,
  itemsPerPage,
  isFullList,
  pagination,
}) => {
  const router = useRouter();

  // Loading overlay khi navigate sang token detail
  const [isLoading, setIsLoading] = useState(false);

  // Cache liquidity từng token (key = address)
  const [liquidityData, setLiquidityData] = useState<TokenLiquidityData>({});

  const mode: Mode = (pagination as any)?.mode ?? 'page';

  const handleTokenClick = async (tokenAddress: string) => {
    setIsLoading(true);
    try {
      await router.push(`/token/${tokenAddress}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateLiquidityData = (tokenAddress: string, amount: bigint) => {
    setLiquidityData((prev) => ({
      ...prev,
      [tokenAddress]: amount,
    }));
  };

  const displayTokens = useMemo(() => {
    const sortedTokens = [...tokens];

    // Sort theo liquidity (marketcap proxy) — giữ logic cũ
    if (sortType === 'marketcap') {
      sortedTokens.sort((a, b) => {
        const liquidityA = liquidityData[(a as any).address] || BigInt(0);
        const liquidityB = liquidityData[(b as any).address] || BigInt(0);
        if (liquidityA === liquidityB) return 0;
        return liquidityB > liquidityA ? 1 : -1;
      });
    }

    if (mode === 'page' && isFullList) {
      const p = (pagination as PagePaginationProps).currentPage ?? 1;
      const startIndex = (p - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return sortedTokens.slice(startIndex, endIndex);
    }

    return sortedTokens;
  }, [tokens, sortType, liquidityData, itemsPerPage, isFullList, mode, pagination]);

  // =====================
  // Cursor infinite scroll support
  // =====================
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);

  const cursor = mode === 'cursor' ? (pagination as CursorPaginationProps) : null;
  const canAutoLoad = mode === 'cursor' && cursor?.autoLoad !== false;

  const hasMore = mode === 'cursor' ? Boolean(cursor?.hasMore) : false;
  const isLoadingMore = mode === 'cursor' ? Boolean(cursor?.isLoadingMore) : false;

  // ✅ Sentinel chỉ tồn tại khi hasMore=true (để tránh gọi hoài)
  const shouldRenderSentinel = mode === 'cursor' && canAutoLoad && hasMore;

  useEffect(() => {
    if (mode !== 'cursor') return;
    if (!canAutoLoad) return;
    if (!hasMore) return; // ✅ hết dữ liệu thì không observe nữa
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;

    const io = new IntersectionObserver(
      async (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        if (loadingMoreRef.current) return;
        if (!cursor) return;

        // ✅ đọc state mới nhất từ cursor
        if (!cursor.hasMore || cursor.isLoadingMore) return;

        loadingMoreRef.current = true;
        try {
          await cursor.onLoadMore();
        } finally {
          loadingMoreRef.current = false;
        }
      },
      { root: null, rootMargin: '300px', threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [mode, canAutoLoad, hasMore, cursor]);

  // =====================
  // Render
  // =====================
  const pageCurrent = mode === 'page' ? (pagination as PagePaginationProps).currentPage : 1;
  const pageTotal = mode === 'page' ? (pagination as PagePaginationProps).totalPages : 1;
  const showPagePagination = mode === 'page' && pageTotal > 1;

  // ✅ cursor mode: nếu autoLoad=true => không show button
  const showManualLoadMoreButton = mode === 'cursor' && !canAutoLoad && hasMore;
  const showManualNoMore = mode === 'cursor' && !canAutoLoad && !hasMore && !isLoadingMore;

  // ✅ cursor mode + autoLoad: chỉ show loader nhỏ khi đang load
  const showAutoLoadSpinner = mode === 'cursor' && canAutoLoad && isLoadingMore;

  return (
    <>
      {/* Grid token */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
        {displayTokens.map((token) => (
          <TokenCard
            key={(token as any).id ?? (token as any).address}
            token={token}
            isEnded={isEnded}
            onTokenClick={handleTokenClick}
            onLiquidityUpdate={(amount) => updateLiquidityData((token as any).address, amount)}
          />
        ))}
      </div>

      {/* ✅ Sentinel (auto load) - chỉ render khi hasMore=true */}
      {shouldRenderSentinel && <div ref={sentinelRef} className="h-10 w-full" />}

      {/* Loading overlay khi chuyển trang */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <LoadingBar size="large" />
        </div>
      )}

      {/* ✅ Auto-load spinner (nhẹ) */}
      {showAutoLoadSpinner && (
        <div className="flex justify-center mt-8">
          <div className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] opacity-80">
            Loading...
          </div>
        </div>
      )}

      {/* ✅ Manual load more (chỉ khi autoLoad=false) */}
      {showManualLoadMoreButton && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => cursor?.onLoadMore()}
            disabled={!hasMore || isLoadingMore}
            className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {/* ✅ Manual no more (ẩn hẳn khi autoLoad=true) */}
      {showManualNoMore && (
        <div className="flex justify-center mt-8">
          <div className="text-sm opacity-70">No more tokens</div>
        </div>
      )}

      {/* Page-based Pagination (cũ) */}
      {showPagePagination && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          {/* Prev */}
          <button
            onClick={() => (pagination as PagePaginationProps).onPageChange(pageCurrent - 1)}
            disabled={pageCurrent === 1}
            className="btn-secondary p-2 rounded-md disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: pageTotal }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => (pagination as PagePaginationProps).onPageChange(page)}
                className={pageCurrent === page ? 'btn btn-primary' : 'btn-secondary'}
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => (pagination as PagePaginationProps).onPageChange(pageCurrent + 1)}
            disabled={pageCurrent === pageTotal}
            className="btn-secondary p-2 rounded-md disabled:opacity-50"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
};

export default TokenList;
