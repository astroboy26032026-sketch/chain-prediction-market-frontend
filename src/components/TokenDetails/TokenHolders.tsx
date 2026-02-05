import React, { useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from 'lucide-react';
import { TokenHolder } from '@/interface/types';
import { shortenAddress } from '@/utils/blockchainUtils';

interface TokenHoldersProps {
  tokenHolders: TokenHolder[];
  currentPage: number;
  totalPages: number;
  tokenSymbol: string;
  creatorAddress: string;
  tokenAddress: string;
  onPageChange: (page: number) => void;
  allHolders: TokenHolder[];
}

const TokenHolders: React.FC<TokenHoldersProps> = ({
  tokenHolders, // compat
  currentPage,
  totalPages, // compat
  tokenSymbol, // compat
  creatorAddress,
  tokenAddress,
  onPageChange,
  allHolders,
}) => {
  // ✅ Solana explorer
  const solscanBase = process.env.NEXT_PUBLIC_SOLSCAN_URL || 'https://solscan.io';

  const tokenAddrLower = (tokenAddress || '').toLowerCase();
  const creatorAddrLower = (creatorAddress || '').toLowerCase();

  // ✅ BE mới trả: walletAddress + balance(number) + percentShare(number) + lastTransaction
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
      // loại trừ token contract nếu BE vô tình trả
      if (addr.toLowerCase() === tokenAddrLower) return false;
      return typeof (h as any).balance !== 'undefined';
    });
  }, [allHolders, tokenHolders, tokenAddrLower]);

  // sort theo balance giảm dần
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

  // ✅ percentShare từ API đã là %
  // const fmtPct = (pct?: number) => {
  //   const n = Number(pct ?? 0);
  //   if (!Number.isFinite(n) || n <= 0) return '0%';
  //   if (n < 0.001) return '<0.001%';
  //   if (n < 0.01) return `${n.toFixed(3)}%`;
  //   return `${n.toFixed(2)}%`;
  // };

  return (
    <div className="w-full">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[var(--card2)] border-thin">
            <th className="px-4 py-2 text-sm text-gray-400">Holder</th>
            <th className="px-4 py-2 text-sm text-gray-400">Balance</th>
            <th className="px-4 py-2 text-sm text-gray-400">Percent</th>
            <th className="px-4 py-2 text-sm text-gray-400">Last Tx</th>
          </tr>
        </thead>

        <tbody>
          {paginatedHolders.map((holder, index) => {
            const addr = (holder.walletAddress || holder.address || '').trim();
            const addrLower = addr.toLowerCase();
            const isCreator = !!addrLower && addrLower === creatorAddrLower;

            const balance = Number((holder as any).balance ?? 0);
            const pct = holder.percentShare; // ✅ API already provides %
            const lastTx = holder.lastTransaction ? new Date(holder.lastTransaction) : null;
            const lastTxText = lastTx && !Number.isNaN(lastTx.getTime()) ? lastTx.toLocaleString() : '—';

            return (
              <tr
                key={`${addr}-${index}`}
                className="border-b border-[var(--card-hover)] hover:bg-[var(--card-hover)] transition-colors"
              >
                <td className="px-4 py-2">
                  <a
                    // ✅ Solscan address page
                    href={`${solscanBase}/account/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-[var(--primary)] text-sm flex items-center gap-1 transition-colors"
                    title={addr}
                  >
                    {isCreator ? 'Creator' : shortenAddress(addr)} <ExternalLinkIcon size={14} />
                  </a>
                </td>

                <td className="px-4 py-2 text-gray-400 text-sm">
                  {Number.isFinite(balance) ? balance.toLocaleString() : '—'}
                </td>

                <td className="px-4 py-2 text-gray-400 text-sm">{pct} % </td>

                <td className="px-4 py-2 text-gray-400 text-sm">{lastTxText}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sortedHolders.length === 0 && (
        <div className="text-center py-8 text-gray-400">No token holder data available</div>
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
