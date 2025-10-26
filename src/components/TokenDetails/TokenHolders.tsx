import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from 'lucide-react';
import { TokenHolder } from '@/interface/types';
import { shortenAddress, getBondingCurveAddress } from '@/utils/blockchainUtils';

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
  tokenHolders,
  currentPage,
  totalPages,
  tokenSymbol,
  creatorAddress,
  tokenAddress,
  onPageChange,
  allHolders,
}) => {
  // Safe inputs
  const safeAllHolders: TokenHolder[] = Array.isArray(allHolders)
    ? allHolders.filter((h) => !!h && typeof h.address === 'string' && typeof h.balance !== 'undefined')
    : [];

  const tokenAddrLower = typeof tokenAddress === 'string' ? tokenAddress.toLowerCase() : '';
  const creatorAddrLower = typeof creatorAddress === 'string' ? creatorAddress.toLowerCase() : '';

  const bondingCurveRaw = getBondingCurveAddress(tokenAddress as `0x${string}`) || '';
  const bondingCurveLower = bondingCurveRaw ? bondingCurveRaw.toLowerCase() : '';

  const blockscoutBase =
    process.env.NEXT_PUBLIC_BLOCKSCOUT_URL || 'https://www.shibariumscan.io';

  // Tổng supply: loại trừ chính contract token
  const totalSupply = safeAllHolders.reduce((sum, holder) => {
    const addrLower = holder.address?.toLowerCase?.() || '';
    if (!addrLower || addrLower === tokenAddrLower) return sum; // bỏ qua token contract hoặc holder không hợp lệ

    // holder.balance có thể là string/number/bigint -> chuyển sang BigInt an toàn
    try {
      const b = typeof holder.balance === 'bigint'
        ? holder.balance
        : BigInt(holder.balance as any);
      return sum + b;
    } catch {
      return sum;
    }
  }, BigInt(0));

  const calculatePercentage = (balance: string | number | bigint, address: string): string => {
    const addrLower = address?.toLowerCase?.() || '';
    if (!addrLower || addrLower === tokenAddrLower) return '0%';
    if (totalSupply === BigInt(0)) return '0%';

    let bal: bigint;
    try {
      bal = typeof balance === 'bigint' ? balance : BigInt(balance as any);
    } catch {
      return '0%';
    }

    const pctTimes100 = (bal * BigInt(10000)) / totalSupply; // x100 để giữ 2 chữ số
    const pct = Number(pctTimes100) / 100;

    if (pct < 0.001) return '<0.001%';
    if (pct < 0.01) return pct.toFixed(3) + '%';
    if (pct < 0.1) return pct.toFixed(2) + '%';
    return pct.toFixed(2) + '%';
  };

  // Tìm holder là Bonding Curve (nếu có)
  const bondingCurveHolder = bondingCurveLower
    ? safeAllHolders.find(
        (h) => h.address?.toLowerCase?.() === bondingCurveLower
      )
    : undefined;

  // Lọc bỏ token contract + bonding curve
  const filteredHolders = safeAllHolders.filter((h) => {
    const addrLower = h.address?.toLowerCase?.() || '';
    if (!addrLower) return false;
    if (addrLower === tokenAddrLower) return false;
    if (bondingCurveLower && addrLower === bondingCurveLower) return false;
    return true;
  });

  // Phân trang
  const holdersPerPage = 10;
  const startIndex = (currentPage - 1) * holdersPerPage;
  const endIndex = startIndex + holdersPerPage;
  const paginatedHolders = filteredHolders.slice(startIndex, endIndex);
  const actualTotalPages = Math.ceil(filteredHolders.length / holdersPerPage) || 1;

  return (
    <div className="w-full">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[var(--card2)] border-thin">
            <th className="px-4 py-2 text-sm text-gray-400">Holder</th>
            <th className="px-4 py-2 text-sm text-gray-400">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {/* Bonding Curve Manager ở trên cùng (nếu có địa chỉ) */}
          {bondingCurveLower && (
            <tr className="border-b border-[var(--card-hover)] hover:bg-[var(--card-hover)] transition-colors">
              <td className="px-4 py-2">
                <a
                  href={`${blockscoutBase}/address/${bondingCurveRaw}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[var(--primary)] text-sm flex items-center gap-1 transition-colors"
                >
                  Bonding Curve <ExternalLinkIcon size={14} />
                </a>
              </td>
              <td className="px-4 py-2 text-gray-400 text-sm">
                {bondingCurveHolder
                  ? calculatePercentage(bondingCurveHolder.balance, bondingCurveHolder.address)
                  : '0%'}
              </td>
            </tr>
          )}

          {paginatedHolders.map((holder, index) => {
            const addr = holder.address || '';
            const isCreator = addr.toLowerCase?.() === creatorAddrLower;

            return (
              <tr
                key={`${addr}-${index}`}
                className="border-b border-[var(--card-hover)] hover:bg-[var(--card-hover)] transition-colors"
              >
                <td className="px-4 py-2">
                  <a
                    href={`${blockscoutBase}/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-[var(--primary)] text-sm flex items-center gap-1 transition-colors"
                  >
                    {isCreator ? 'Creator' : shortenAddress(addr)} <ExternalLinkIcon size={14} />
                  </a>
                </td>
                <td className="px-4 py-2 text-gray-400 text-sm">
                  {calculatePercentage(holder.balance, addr)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {filteredHolders.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No token holder data available
        </div>
      )}

      {actualTotalPages > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn-secondary p-1 rounded disabled:opacity-50"
          >
            <ChevronLeftIcon size={20} />
          </button>
          {Array.from({ length: actualTotalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm ${
                currentPage === page ? 'btn btn-primary' : 'btn-secondary'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === actualTotalPages}
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
