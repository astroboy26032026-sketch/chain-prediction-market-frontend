import React, { useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { TokenHolder } from '@/interface/types';
import { shortenAddress } from '@/utils/blockchainUtils';
import { TOKEN } from '@/constants/ui-text';

interface TokenHoldersProps {
  tokenHolders: TokenHolder[];
  currentPage: number;
  totalPages: number;
  creatorAddress: string;
  tokenAddress: string;
  onPageChange: (page: number) => void;
  allHolders: TokenHolder[];
}

const fmtCompact = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
};

const fmtUsd = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(n);
};

const TokenHolders: React.FC<TokenHoldersProps> = ({
  tokenHolders,
  currentPage,
  creatorAddress,
  tokenAddress,
  onPageChange,
  allHolders,
}) => {
  const solscanBase = process.env.NEXT_PUBLIC_SOLSCAN_URL || 'https://solscan.io';
  const tokenAddrLower = (tokenAddress || '').toLowerCase();
  const creatorAddrLower = (creatorAddress || '').toLowerCase();

  const safeHolders: TokenHolder[] = useMemo(() => {
    const src =
      Array.isArray(allHolders) && allHolders.length
        ? allHolders
        : Array.isArray(tokenHolders)
          ? tokenHolders
          : [];

    return src.filter((h) => {
      const addr = (h?.walletAddress || h?.address || '').trim();
      if (!addr) return false;
      if (addr.toLowerCase() === tokenAddrLower) return false;
      return typeof (h as any).balance !== 'undefined';
    });
  }, [allHolders, tokenHolders, tokenAddrLower]);

  const sortedHolders = useMemo(() => {
    return [...safeHolders].sort((a, b) => {
      const ab = Number((a as any).balance ?? 0);
      const bb = Number((b as any).balance ?? 0);
      return bb - ab;
    });
  }, [safeHolders]);

  // Pagination (local)
  const holdersPerPage = 10;
  const actualTotalPages = Math.max(1, Math.ceil(sortedHolders.length / holdersPerPage));
  const safeCurrentPage = Math.min(Math.max(currentPage || 1, 1), actualTotalPages);
  const startIndex = (safeCurrentPage - 1) * holdersPerPage;
  const paginatedHolders = sortedHolders.slice(startIndex, startIndex + holdersPerPage);

  return (
    <div className="w-full">

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[360px]">
          <thead>
            <tr className="bg-[var(--card2)] border-thin">
              <th className="px-2 sm:px-4 py-2 text-xs text-gray-400">Wallet</th>
              <th className="px-2 sm:px-4 py-2 text-xs text-gray-400 text-right">Amount</th>
              <th className="px-2 sm:px-4 py-2 text-xs text-gray-400 text-right">USD Value</th>
            </tr>
          </thead>

          <tbody>
            {paginatedHolders.map((holder, index) => {
              const addr = (holder.walletAddress || holder.address || '').trim();
              const balance = Number((holder as any).balance ?? 0);
              const usdValue = Number((holder as any).usdValue ?? (holder as any).balanceUsd ?? 0);
              return (
                <tr
                  key={`${addr}-${index}`}
                  className="border-b border-[var(--card-hover)] hover:bg-[var(--card-hover)] transition-colors"
                >
                  <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">
                    <a
                      href={`${solscanBase}/account/${addr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[var(--primary)] transition-colors"
                      title={addr}
                    >
                      {shortenAddress(addr)}
                    </a>
                  </td>
                  <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-300 text-right font-medium">
                    {fmtCompact(balance)}
                  </td>
                  <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-gray-300 text-right">
                    {usdValue > 0 ? fmtUsd(usdValue) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedHolders.length === 0 && (
        <div className="text-center py-8 text-gray-400">{TOKEN.NO_HOLDER_DATA}</div>
      )}

      {actualTotalPages > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="btn-secondary p-1 rounded disabled:opacity-50"
          >
            <ChevronLeftIcon size={20} />
          </button>

          {Array.from({ length: actualTotalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                safeCurrentPage === page ? 'btn btn-primary' : 'btn-secondary'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === actualTotalPages}
            className="btn-secondary p-1 rounded disabled:opacity-50"
          >
            <ChevronRightIcon size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TokenHolders;
