import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Token, TokenWithLiquidityEvents } from '@/interface/types';
import { useTokenLiquidity, formatTimestampV1 } from '@/utils/blockchainUtils';

interface TokenCardProps {
  token: Token | TokenWithLiquidityEvents;
  isEnded: boolean;
  onTokenClick: (address: string) => void;
  onLiquidityUpdate?: (liquidityAmount: bigint) => void;
}

const TokenCard: React.FC<TokenCardProps> = ({
  token,
  isEnded,
  onTokenClick,
  onLiquidityUpdate,
}) => {
  const [currentLiquidity, setCurrentLiquidity] = useState<string>('0');
  const tokenAddress = token.address as `0x${string}`;
  const shouldFetchLiquidity = !token._count?.liquidityEvents;

  const { data: liquidityData } = useTokenLiquidity(
    shouldFetchLiquidity ? tokenAddress : null
  );

  const resolveNumber = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n =
      typeof v === 'string'
        ? Number(v)
        : typeof v === 'bigint'
        ? Number(v)
        : v;
    return Number.isFinite(n) ? n : null;
  };

  const getVolume = (t: any): number | null =>
    resolveNumber(t.volume24h) ??
    resolveNumber(t.volume24hUsd) ??
    resolveNumber(t.vol24hUsd) ??
    resolveNumber(t.volume) ??
    null;

  const getMarketCap = (t: any): number | null =>
    resolveNumber(t.marketCap) ??
    resolveNumber(t.marketCapUsd) ??
    resolveNumber(t.mcapUsd) ??
    null;

  const formatUSD = (v: number | null) => {
    if (v === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(v);
  };

  const volume = getVolume(token);
  const marketCap = getMarketCap(token);
  const maxCap = resolveNumber(token.maxCap);

  useEffect(() => {
    if (
      shouldFetchLiquidity &&
      liquidityData &&
      liquidityData[2] &&
      liquidityData[2].toString() !== currentLiquidity
    ) {
      setCurrentLiquidity(liquidityData[2].toString());
      onLiquidityUpdate?.(liquidityData[2]);
    }
  }, [liquidityData, shouldFetchLiquidity, currentLiquidity, onLiquidityUpdate]);

  const calculateProgressByCap = (marketCap: number | null, maxCap: number | null): number => {
    if (!marketCap || !maxCap || maxCap <= 0) return 0;
    return Math.min((marketCap / maxCap) * 100, 100);
  };

  const apiProgress = resolveNumber(token.progressDex);
  const capProgress = calculateProgressByCap(marketCap, maxCap);
  const progress = apiProgress !== null ? apiProgress : capProgress;

  const isCompleted =
    (apiProgress !== null && apiProgress >= 100) ||
    (marketCap !== null && maxCap !== null && marketCap >= maxCap);

  const handleClick = () => onTokenClick(token.address);

  const shortAddress = (addr: string) => {
    if (!addr) return '';
    return addr.length > 8 ? addr.slice(0, 8) : addr;
  };

  const deployer =
    (token as any).deployer ||
    (token as any).creatorAddress ||
    (token as any).creator ||
    '';

  // Graduated view
  if (isEnded && isCompleted && 'liquidityEvents' in token) {
    const dexLink = process.env.NEXT_PUBLIC_DEX_SWAP_URL
      ? `${process.env.NEXT_PUBLIC_DEX_SWAP_URL}?outputCurrency=${token.address}`
      : `https://chewyswap.dog/swap/?outputCurrency=${token.address}&chain=shibarium`;

    return (
      <div onClick={handleClick} className="cursor-pointer">
        <CardShell
          token={token}
          deployer={deployer}
          shortAddress={shortAddress}
          volume={volume}
          marketCap={marketCap}
          formatUSD={formatUSD}
          progress={100}
          completed
          footer={
            <div className="flex gap-2 mt-3">
              <a
                href={dexLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-center py-2 text-sm bg-[var(--primary)] text-black rounded-xl font-semibold"
              >
                Trade
              </a>
              <Link
                href={`/token/${token.address}`}
                className="flex-1 text-center py-2 text-sm bg-[var(--card2)] text-white rounded-xl font-semibold"
              >
                View
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <CardShell
        token={token}
        deployer={deployer}
        shortAddress={shortAddress}
        volume={volume}
        marketCap={marketCap}
        formatUSD={formatUSD}
        progress={progress}
        completed={isCompleted}
      />
    </div>
  );
};

export default TokenCard;

// ============================================================================
// CardShell — new design matching reference image
// ============================================================================
const CardShell = ({
  token,
  deployer,
  shortAddress,
  volume,
  marketCap,
  formatUSD,
  progress,
  completed,
  footer,
}: any) => (
  <div className="token-card rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--primary)]/40 transition-all hover:shadow-lg hover:shadow-[var(--primary)]/10">
    {/* Image section */}
    <div className="relative w-full aspect-[2/1] overflow-hidden">
      <img
        src={token.logo || '/chats/noimg.svg'}
        alt={token.name}
        className="w-full h-full object-cover"
      />

      {/* Fire badge — top left */}
      <div className="absolute top-1.5 left-1.5 w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-md text-sm">
        🔥
      </div>

      {/* Circular refresh — top right */}
      <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white/80 border border-white/20">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      </div>

      {/* Bottom overlays */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        {deployer && (
          <div className="bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1 text-xs text-white/90">
            <span className="opacity-60">By: </span>
            <span className="font-medium">{shortAddress(deployer)}</span>
          </div>
        )}
        <div className="ml-auto bg-black/60 backdrop-blur-sm rounded-xl px-2.5 py-1 text-xs text-white/90">
          {formatTimestampV1(token.createdAt)}
        </div>
      </div>

      {/* Graduated badge */}
      {completed && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--primary)] text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          GRADUATED 🎓
        </div>
      )}
    </div>

    {/* Content below image */}
    <div className="p-2.5">
      <div className="font-extrabold text-sm text-[var(--foreground)] tracking-wide leading-tight">{token.name}</div>
      <div className="text-xs text-[var(--foreground)]/50 mt-0.5">{token.symbol}</div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        <div className="rounded-lg bg-[var(--card2)] px-2 py-1.5">
          <div className="text-[9px] text-[var(--foreground)]/50">Volume:</div>
          <div className="text-xs font-bold text-[var(--foreground)]">{formatUSD(volume)}</div>
        </div>
        <div className="rounded-lg bg-[var(--card2)] px-2 py-1.5">
          <div className="text-[9px] text-[var(--foreground)]/50">Market cap:</div>
          <div className="text-xs font-bold text-[var(--foreground)]">{formatUSD(marketCap)}</div>
        </div>
      </div>

      {/* Progress bar (only if not completed and not graduated) */}
      {!completed && (
        <div className="mt-2">
          <div className="w-full bg-[var(--card2)] rounded-full h-1.5">
            <div
              className="bg-[var(--primary)] h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[10px] text-[var(--foreground)]/40 mt-0.5 text-right">{Math.floor(progress)}% to DEX</div>
        </div>
      )}

      {footer}
    </div>
  </div>
);
