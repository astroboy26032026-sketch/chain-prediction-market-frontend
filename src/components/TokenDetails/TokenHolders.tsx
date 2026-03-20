import React, { useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from 'lucide-react';
import { TokenHolder } from '@/interface/types';
import { shortenAddress } from '@/utils/blockchainUtils';
import { TOKEN } from '@/constants/ui-text';

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

const fmtCompact = (n: number): string => {
  if (!Number.isFinite(n) || n === 0) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
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

  // Stats
  const totalHolders = sortedHolders.length;

  const top10Conc = useMemo(() => {
    const top10 = sortedHolders.slice(0, 10);
    const sum = top10.reduce((acc, h) => acc + Number(h.percentShare ?? 0), 0);
    return sum;
  }, [sortedHolders]);

  const avgHolding = useMemo(() => {
    if (!sortedHolders.length) return 0;
    const total = sortedHolders.reduce((acc, h) => acc + Number((h as any).balance ?? 0), 0);
    return total / sortedHolders.length;
  }, [sortedHolders]);

  // Pagination (local)
  const holdersPerPage = 10;
  const actualTotalPages = Math.max(1, Math.ceil(sortedHolders.length / holdersPerPage));
  const safeCurrentPage = Math.min(Math.max(currentPage || 1, 1), actualTotalPages);
  const startIndex = (safeCurrentPage - 1) * holdersPerPage;
  const paginatedHolders = sortedHolders.slice(startIndex, startIndex + holdersPerPage);

  // Badge logic
  const getBadges = (addr: string, rank: number) => {
    const addrLower = addr.toLowerCase();
    const isCreator = !!creatorAddrLower && addrLower === creatorAddrLower;
    const badges: Array<{ emoji: string; label: string }> = [];

    if (isCreator) badges.push({ emoji: '👑', label: 'Creator' });
    if (rank <= 2 && !isCreator) badges.push({ emoji: '🐋', label: 'Whale' });

    // Diamond Hands: check if holder has high balance relative to others
    const balance = sortedHolders.find(h => (h.walletAddress || h.address || '').toLowerCase() === addrLower);
    if (balance) {
      const pct = Number(balance.percentShare ?? 0);
      if (pct >= 3 && !isCreator && rank > 2) badges.push({ emoji: '💎', label: 'Diamond Hands' });
    }

    return badges;
  };

  return (
    <div className="w-full">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-[var(--card2)] rounded-lg p-3 border border-[var(--card-border)]">
          <div className="text-[11px] text-gray-500 mb-1">Total Holders</div>
          <div className="text-sm font-semibold text-white">{totalHolders > 0 ? totalHolders.toLocaleString() : '—'}</div>
        </div>
        <div className="bg-[var(--card2)] rounded-lg p-3 border border-[var(--card-border)]">
          <div className="text-[11px] text-gray-500 mb-1">Top 10 Conc.</div>
          <div className="text-sm font-semibold text-[var(--primary)]">{top10Conc > 0 ? `${top10Conc.toFixed(1)}%` : '—'}</div>
        </div>
        <div className="bg-[var(--card2)] rounded-lg p-3 border border-[var(--card-border)]">
          <div className="text-[11px] text-gray-500 mb-1">Avg Holding</div>
          <div className="text-sm font-semibold text-white">{avgHolding > 0 ? fmtCompact(avgHolding) : '—'}</div>
        </div>
        <div className="bg-[var(--card2)] rounded-lg p-3 border border-[var(--card-border)]">
          <div className="text-[11px] text-gray-500 mb-1">New (24h)</div>
          <div className="text-sm font-semibold text-[var(--accent)]">—</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[420px]">
          <thead>
            <tr>
              <th className="px-3 py-2.5 text-xs text-gray-500 font-medium">Rank</th>
              <th className="px-3 py-2.5 text-xs text-gray-500 font-medium">Holder</th>
              <th className="px-3 py-2.5 text-xs text-gray-500 font-medium text-right">Balance</th>
              <th className="px-3 py-2.5 text-xs text-gray-500 font-medium text-right">% Supply</th>
            </tr>
          </thead>

          <tbody>
            {paginatedHolders.map((holder, index) => {
              const addr = (holder.walletAddress || holder.address || '').trim();
              const globalRank = startIndex + index + 1;
              const balance = Number((holder as any).balance ?? 0);
              const pct = Number(holder.percentShare ?? 0);
              const badges = getBadges(addr, globalRank);

              return (
                <tr
                  key={`${addr}-${index}`}
                  className="hover:bg-[var(--card-hover)] transition-colors"
                >
                  <td className="px-3 py-2.5 text-sm text-gray-400">{globalRank}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <a
                        href={`${solscanBase}/account/${addr}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-[var(--primary)] text-sm transition-colors"
                        title={addr}
                      >
                        {shortenAddress(addr)}
                      </a>
                      {badges.map((b, i) => (
                        <span key={i} className="text-sm" title={b.label}>{b.emoji}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-300 text-right">
                    {Number.isFinite(balance) ? balance.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-300 text-right">
                    {pct > 0 ? `${pct.toFixed(1)}%` : '—'}
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
