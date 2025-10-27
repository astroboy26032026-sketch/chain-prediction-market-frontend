import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLinkIcon, Copy } from 'lucide-react';
import { TokenWithTransactions, PriceCache } from '@/interface/types';
import { formatTimestamp, shortenAddress, formatAddressV2, formatAmount } from '@/utils/blockchainUtils';
import { Globe, Twitter, Send as Telegram, Youtube, MessageCircle as Discord } from 'lucide-react';
import { useTokenLiquidity, useCurrentTokenPrice, useMarketCap } from '@/utils/blockchainUtils';
import { formatUnits } from 'viem';
import { toast } from 'react-toastify';
import { getCurrentPrice } from '@/utils/api';
import Image from 'next/image';

interface TokenInfoProps {
  tokenInfo: TokenWithTransactions;
  showHeader?: boolean;
  refreshTrigger?: number;
  liquidityEvents?: any;
}

// cache duration constant (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
let priceCache: PriceCache | null = null;

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

const TokenInfo: React.FC<TokenInfoProps> = ({
  tokenInfo,
  showHeader = false,
  refreshTrigger = 0,
  liquidityEvents,
}) => {
  const [flrPrice, setFlrPrice] = useState<string>('0');

  const tokenAddress = tokenInfo?.address as `0x${string}`;
  const shouldFetchLiquidity = !liquidityEvents?.liquidityEvents?.length;

  const { data: liquidityData, refetch: refetchLiquidity } =
    useTokenLiquidity(shouldFetchLiquidity ? tokenAddress : null);

  const { data: currentPrice, refetch: refetchPrice } =
    useCurrentTokenPrice(tokenAddress);

  // Giữ hook để không phá logic, nhưng không render Market Cap theo yêu cầu
  const { refetch: refetchMarketCap } = useMarketCap(tokenAddress);

  // ======== Fetch base token (FLR/BONE) USD price with cache ========
  useEffect(() => {
    const fetchFlrPrice = async () => {
      try {
        if (priceCache && Date.now() - priceCache.timestamp < CACHE_DURATION) {
          setFlrPrice(priceCache.price);
          return;
        }
        const price = await getCurrentPrice();
        priceCache = { price, timestamp: Date.now() };
        setFlrPrice(price);
      } catch (err) {
        console.error('Error fetching FLR price:', err);
      }
    };
    fetchFlrPrice();
    const id = setInterval(fetchFlrPrice, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (shouldFetchLiquidity) refetchLiquidity();
    refetchPrice();
    refetchMarketCap();
  }, [refreshTrigger, refetchLiquidity, refetchPrice, refetchMarketCap, shouldFetchLiquidity]);

  const isCompleted = liquidityEvents?.liquidityEvents?.length > 0;

  const targetEth = useMemo(() => {
    const t = Number(process.env.NEXT_PUBLIC_DEX_TARGET);
    return Number.isFinite(t) && t > 0 ? t : 0;
  }, []);

  const currentEth = useMemo(() => {
    const rawLiq = liquidityData?.[2];
    // ✅ Tránh BigInt literal (0n) để build khi target < ES2020
    const liq: bigint = typeof rawLiq === 'bigint' ? rawLiq : BigInt(rawLiq ?? 0);
    try {
      return Number(formatUnits(liq, 18));
    } catch {
      return 0;
    }
  }, [liquidityData]);

  const progressPct = useMemo(() => {
    if (isCompleted) return 100;
    if (!targetEth) return 0;
    const pct = (currentEth / targetEth) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }, [currentEth, targetEth, isCompleted]);

  const priceNum = parseFloat(flrPrice || '0');
  const currentUsd = currentEth * priceNum;
  const targetUsd = targetEth * priceNum;

  const truncateDescription = (description: string, maxLength: number = 100) => {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength)}...`;
  };

  const TokenDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Contract"
          value={tokenInfo?.address ? formatAddressV2(tokenInfo.address) : 'Loading...'}
          link={`https://shibariumscan.io/address/${tokenInfo?.address}`}
          isExternal={true}
        />
        <InfoItem
          label="Deployer"
          value={tokenInfo?.creatorAddress ? shortenAddress(tokenInfo.creatorAddress) : 'Loading...'}
          link={`/profile/${tokenInfo?.creatorAddress}`}
          isExternal={false}
          copyValue={tokenInfo?.creatorAddress}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Created"
          value={tokenInfo?.createdAt ? formatTimestamp(tokenInfo.createdAt) : 'Loading...'}
        />
        <InfoItem
          label="Current Price"
          value={currentPrice ? `${formatAmount(currentPrice.toString())} BONE` : 'Loading...'}
        />
      </div>

      {/* ⛔ Market Cap đã xóa theo yêu cầu */}
    </div>
  );

  if (showHeader) {
    return (
      <div className="space-y-6">
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-col">
          <div className="w-full h-[200px] mb-4 bg-[var(--card2)] rounded-b-xl overflow-hidden">
            <img
              src={tokenInfo.logo || '/chats/noimg.svg'}
              alt={tokenInfo.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="px-4">
            {/* Tên ở trên, symbol dưới tên */}
            <div className="text-center mb-3">
              <h1 className="text-2xl font-bold text-white">{tokenInfo.name}</h1>
              {tokenInfo.symbol && (
                <p className="text-xs text-gray-400 mt-1">{tokenInfo.symbol}</p>
              )}
            </div>

            <p className="text-sm text-gray-400 text-center mb-4">
              {truncateDescription(tokenInfo.description)}
            </p>

            {/* Socials */}
            <div className="flex justify-center gap-4 mb-6">
              {tokenInfo.website && (
                <a href={tokenInfo.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Globe size={24} />
                </a>
              )}
              {tokenInfo.twitter && (
                <a href={tokenInfo.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Twitter size={24} />
                </a>
              )}
              {tokenInfo.telegram && (
                <a href={tokenInfo.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Telegram size={24} />
                </a>
              )}
              {tokenInfo.discord && (
                <a href={tokenInfo.discord} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Discord size={24} />
                </a>
              )}
              {tokenInfo.youtube && (
                <a href={tokenInfo.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Youtube size={24} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="flex items-start gap-4">
            <img
              src={tokenInfo.logo || '/chats/noimg.svg'}
              alt={tokenInfo.name}
              className="w-24 h-24 rounded-lg"
            />
            <div className="flex-1">
              <div className="flex items-start gap-2">
                <div>
                  <h1 className="text-xl font-bold text-white">{tokenInfo.name}</h1>
                  {tokenInfo.symbol && (
                    <p className="text-xs text-gray-400 mt-1">{tokenInfo.symbol}</p>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2">
                {truncateDescription(tokenInfo.description)}
              </p>

              <div className="flex gap-3 mt-4">
                {tokenInfo.website && (
                  <a href={tokenInfo.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Globe size={20} />
                  </a>
                )}
                {tokenInfo.twitter && (
                  <a href={tokenInfo.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Twitter size={20} />
                  </a>
                )}
                {tokenInfo.telegram && (
                  <a href={tokenInfo.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Telegram size={20} />
                  </a>
                )}
                {tokenInfo.discord && (
                  <a href={tokenInfo.discord} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Discord size={20} />
                  </a>
                )}
                {tokenInfo.youtube && (
                  <a href={tokenInfo.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Youtube size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress to DEX (Market Cap) — hiển thị tiền + progress bar */}
        <div className="bg-[var(--card2)] p-4 rounded-lg border-thin">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300 font-medium">Progress to DEX (Market Cap)</span>
            <span className="text-white">
              {fmtUSD(currentUsd)} <span className="text-gray-400">/ {fmtUSD(targetUsd)}</span>
            </span>
          </div>
          <div className="w-full bg-[var(--card-boarder)] rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[var(--primary)] h-2.5 rounded-full transition-all duration-500"
              style={{ width: isCompleted ? '100%' : `${progressPct || 0}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-gray-400">
            {isCompleted ? '100%' : `${(progressPct || 0).toFixed(2)}%`}
          </div>
        </div>

        {/* Token Details */}
        <TokenDetails />
      </div>
    );
  }

  // showHeader === false
  return <TokenDetails />;
};

const InfoItem: React.FC<{
  label: string;
  value?: string;
  link?: string;
  isExternal?: boolean;
  copyValue?: string;
}> = ({ label, value, link, isExternal, copyValue }) => (
  <div className="bg-[var(--card2)] p-3 rounded-lg border-thin">
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className="text-sm text-white flex items-center gap-2">
      {link ? (
        <div className="flex items-center gap-2 flex-grow">
          <a
            href={link}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            className="hover:text-[var(--primary)] transition-colors flex items-center gap-1"
          >
            {value}
            {isExternal && <ExternalLinkIcon size={12} />}
          </a>
          {copyValue && (
            <button
              onClick={() => copyToClipboard(copyValue)}
              className="text-gray-400 hover:text-[var(--primary)] transition-colors"
              title="Copy"
            >
              <Copy size={12} />
            </button>
          )}
        </div>
      ) : (
        value
      )}
    </div>
  </div>
);

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('Address copied to clipboard!', {
      position: 'top-right',
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  });
};

export default TokenInfo;
