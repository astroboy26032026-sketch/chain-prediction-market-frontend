import React, { useMemo, useState } from 'react';
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

/**
 * Props cho TokenList
 * - tokens: danh sách token (raw hoặc đã có liquidity events)
 * - currentPage / totalPages: pagination state (controlled từ parent)
 * - isFullList: nếu true → pagination xử lý tại đây
 */
interface TokenListProps {
  tokens: (Token | TokenWithLiquidityEvents)[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isEnded: boolean;
  sortType: SortOption;
  itemsPerPage: number;
  isFullList?: boolean;
}

/**
 * TokenList
 * - Render grid token
 * - Sort theo liquidity nếu chọn marketcap
 * - Pagination (client-side)
 */
const TokenList: React.FC<TokenListProps> = ({
  tokens,
  currentPage,
  totalPages,
  onPageChange,
  isEnded,
  sortType,
  itemsPerPage,
  isFullList
}) => {
  const router = useRouter();

  // Loading overlay khi navigate sang token detail
  const [isLoading, setIsLoading] = useState(false);

  // Cache liquidity từng token (key = address)
  const [liquidityData, setLiquidityData] = useState<TokenLiquidityData>({});

  /**
   * Khi click token → chuyển trang
   * Có loading overlay để tránh spam click
   */
  const handleTokenClick = async (tokenAddress: string) => {
    setIsLoading(true);
    try {
      await router.push(`/token/${tokenAddress}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Callback cho TokenCard
   * Mỗi card fetch xong liquidity sẽ update vào đây
   */
  const updateLiquidityData = (tokenAddress: string, amount: bigint) => {
    setLiquidityData(prev => ({
      ...prev,
      [tokenAddress]: amount
    }));
  };

  /**
   * useMemo để:
   * - Sort token (nếu sortType = marketcap)
   * - Paginate nếu isFullList = true
   */
  const displayTokens = useMemo(() => {
    const sortedTokens = [...tokens];

    // Sort theo liquidity (marketcap proxy)
    if (sortType === 'marketcap') {
      sortedTokens.sort((a, b) => {
        const liquidityA = liquidityData[a.address] || BigInt(0);
        const liquidityB = liquidityData[b.address] || BigInt(0);

        if (liquidityA === liquidityB) return 0;
        return liquidityB > liquidityA ? 1 : -1;
      });
    }

    // Pagination chỉ áp dụng khi là full list
    if (isFullList) {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return sortedTokens.slice(startIndex, endIndex);
    }

    return sortedTokens;
  }, [tokens, sortType, liquidityData, currentPage, itemsPerPage, isFullList]);

  return (
    <>
      {/* Grid token */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
        {displayTokens.map(token => (
          <TokenCard
            key={token.id}
            token={token}
            isEnded={isEnded}
            onTokenClick={handleTokenClick}
            onLiquidityUpdate={(amount) =>
              updateLiquidityData(token.address, amount)
            }
          />
        ))}
      </div>

      {/* Loading overlay khi chuyển trang */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <LoadingBar size="large" />
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-8">
          {/* Prev */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn-secondary p-2 rounded-md disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={
                  currentPage === page
                    ? 'btn btn-primary'
                    : 'btn-secondary'
                }
              >
                {page}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
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
