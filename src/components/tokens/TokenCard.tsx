import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Token, TokenWithLiquidityEvents } from '@/interface/types';
import { useTokenLiquidity, formatTimestampV1 } from '@/utils/blockchainUtils';
import { useRouter } from 'next/router';
import { Clock } from 'lucide-react';

interface TokenCardProps {
  token: Token | TokenWithLiquidityEvents;
  isEnded: boolean;
  onTokenClick: (address: string) => void;
  onLiquidityUpdate?: (liquidityAmount: bigint) => void;
}

const TokenCard: React.FC<TokenCardProps> = ({ token, isEnded, onTokenClick, onLiquidityUpdate }) => {
  const [currentLiquidity, setCurrentLiquidity] = useState<string>('0');
  const tokenAddress = token.address as `0x${string}`;
  const shouldFetchLiquidity = !token._count?.liquidityEvents;
  const { data: liquidityData } = useTokenLiquidity(shouldFetchLiquidity ? tokenAddress : null);
  const router = useRouter();

  // ---------- Helper ----------
  const resolveNumber = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'string' ? Number(v) : typeof v === 'bigint' ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  };

  const getVolume = (t: any): number | null => {
    return (
      resolveNumber(t.volume) ??
      resolveNumber(t.volumeUsd) ??
      resolveNumber(t.volume24h) ??
      resolveNumber(t.volumeUsd24h) ??
      resolveNumber(t.volume_24h) ??
      null
    );
  };

  const getSupply = (t: any): number | null => {
    return (
      resolveNumber(t.circulatingSupply) ??
      resolveNumber(t.supply) ??
      resolveNumber(t.totalSupply) ??
      resolveNumber(t.maxSupply) ??
      null
    );
  };

  const getMarketCap = (t: any): number | null => {
    const mc =
      resolveNumber(t.marketCap) ??
      resolveNumber(t.marketcap) ??
      resolveNumber(t.fullyDilutedValuation) ??
      resolveNumber(t.fdmc) ??
      null;
    if (mc !== null) return mc;

    const price = resolveNumber(t.price) ?? resolveNumber(t.priceUsd) ?? resolveNumber(t.price_usd);
    const s = getSupply(t);
    if (price !== null && s !== null) return price * s;
    return null;
  };

  const formatUSD = (v: number | null) => {
    if (v === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      notation: 'compact',
    }).format(v);
  };

  const volume = getVolume(token);
  const marketCap = getMarketCap(token);

  // ---------- Liquidity progress ----------
  useEffect(() => {
    if (
      shouldFetchLiquidity &&
      liquidityData &&
      liquidityData[2] &&
      liquidityData[2].toString() !== currentLiquidity
    ) {
      const newLiquidity = liquidityData[2].toString();
      setCurrentLiquidity(newLiquidity);
      if (onLiquidityUpdate) onLiquidityUpdate(liquidityData[2]);
    }
  }, [liquidityData, shouldFetchLiquidity, onLiquidityUpdate, currentLiquidity, token.address]);

  const calculateProgress = (liquidity: string): number => {
    if (token._count?.liquidityEvents > 0) return 100;
    const currentValue = Number(liquidity) / 10 ** 18;
    const target = Number(process.env.NEXT_PUBLIC_DEX_TARGET);
    return Math.min((currentValue / target) * 100, 100);
  };

  const progress = calculateProgress(currentLiquidity);
  const isCompleted = token._count?.liquidityEvents > 0;

  const handleClick = () => {
    onTokenClick(token.address);
  };

  // ---------- Graduated ----------
  if (isEnded && 'liquidityEvents' in token && token.liquidityEvents.length > 0) {
    const uniswapLink = `https://chewyswap.dog/swap/?outputCurrency=${token.address}&chain=shibarium`;
    return (
      <div onClick={handleClick} className="cursor-pointer">
        <div className="bg-[var(--card)] rounded-lg overflow-hidden hover:bg-[var(--card-hover)] transition-colors duration-200">
          <div className="p-4">
            <div className="flex gap-4 mb-4">
              <div className="w-24 h-24 flex-shrink-0">
                <img
                  src={token.logo || '/chats/noimg.svg'}
                  alt={token.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-orange mb-1">{token.name}</h3>
                <div className="text-sm text-gray-400 -mt-1">{token.symbol}</div>

                {/* Volume & Market Cap */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-[var(--card-boarder)]/60 rounded-md px-3 py-2">
                    <div className="text-gray-400">Volume</div>
                    <div className="font-semibold text-white">{formatUSD(volume)}</div>
                  </div>
                  <div className="bg-[var(--card-boarder)]/60 rounded-md px-3 py-2">
                    <div className="text-gray-400">Market Cap</div>
                    <div className="font-semibold text-white">{formatUSD(marketCap)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Progress to DEX</span>
                <span className="text-[var(--primary)]">Completed</span>
              </div>
              <div className="w-full bg-[var(--card-boarder)] rounded-full h-2">
                <div className="bg-[var(--primary)] h-2 rounded-full transition-all duration-500 w-full" />
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={uniswapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center py-2 text-sm bg-[var(--primary)] text-black rounded-md hover:bg-[var(--primary-hover)] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Trade
              </a>
              <Link
                href={`/token/${token.address}`}
                className="flex-1 text-center py-2 text-sm bg-[var(--card-boarder)] text-white rounded-md hover:bg-[#444444] transition-colors"
              >
                View
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Default ----------
  return (
    <div onClick={handleClick} className="cursor-pointer">
      <div className="bg-[var(--card)] rounded-lg overflow-hidden hover:bg-[var(--card-hover)] transition-colors duration-200 relative">
        <div className="p-4">
          <div className="flex gap-4 mb-4">
            <div className="w-24 h-24 flex-shrink-0">
              <img
                src={token.logo || '/chats/noimg.svg'}
                alt={token.name}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-orange mb-1">{token.name}</h3>
              <div className="text-sm text-gray-400 -mt-1">{token.symbol}</div>

              {/* Volume & Market Cap */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-[var(--card-boarder)]/60 rounded-md px-3 py-2">
                  <div className="text-gray-400">Volume</div>
                  <div className="font-semibold text-white">{formatUSD(volume)}</div>
                </div>
                <div className="bg-[var(--card-boarder)]/60 rounded-md px-3 py-2">
                  <div className="text-gray-400">Market Cap</div>
                  <div className="font-semibold text-white">{formatUSD(marketCap)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center text-sm text-gray-400">
              <Clock size={16} className="mr-2" />
              <span>{formatTimestampV1(token.createdAt)}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Progress to DEX</span>
                <span className={`${isCompleted ? 'text-[var(--primary)]' : 'text-white'}`}>
                  {isCompleted
                    ? 'Completed'
                    : liquidityData && liquidityData[2]
                      ? `${calculateProgress(liquidityData[2].toString()).toFixed(2)}%`
                      : '0%'}
                </span>
              </div>
              <div className="w-full bg-[var(--card-boarder)] rounded-full h-2">
                <div
                  className="bg-[var(--primary)] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenCard;
