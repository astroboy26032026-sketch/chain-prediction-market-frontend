import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLinkIcon,
  Copy,
  Globe,
  Twitter,
  Send as Telegram,
  Youtube,
  MessageCircle as Discord,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-toastify';

import { formatTimestamp, shortenAddress, formatAddressV2, formatAmount } from '@/utils/blockchainUtils';
import type { Token } from '@/interface/types';

// =====================
// Types
// =====================
interface TokenInfoProps {
  tokenInfo: Token & {
    // compat fields (nếu BE trả khác)
    creatorAddress?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    youtube?: string;
    logo?: string;
    createdAt?: string | number;
    description?: string;
    symbol?: string;
    name?: string;
    address?: string;

    // optional: nếu BE có trả current price (base coin)
    price?: number | string;
    currentPrice?: number | string;
  };
  showHeader?: boolean;
  refreshTrigger?: number;
  liquidityEvents?: any; // [] | {events: []} | {liquidityEvents: []} | null
}

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

function normalizeLiquidityList(liquidityEvents: any): any[] {
  if (!liquidityEvents) return [];
  if (Array.isArray(liquidityEvents)) return liquidityEvents;

  const le = (liquidityEvents as any).liquidityEvents;
  if (Array.isArray(le)) return le;

  const ev = (liquidityEvents as any).events;
  if (Array.isArray(ev)) return ev;

  return [];
}

const TokenInfo: React.FC<TokenInfoProps> = ({
  tokenInfo,
  showHeader = false,
  refreshTrigger = 0,
  liquidityEvents,
}) => {
  const liqList = useMemo(() => normalizeLiquidityList(liquidityEvents), [liquidityEvents]);

  // giữ state để UI/UX không đổi (nếu nơi khác đang set refreshTrigger)
  useEffect(() => {
    // nothing required — liquidityEvents / tokenInfo sẽ tự update từ parent
  }, [refreshTrigger]);

  const isCompleted = liqList.length > 0;

  // target base coin (SOL/BONE/FLR tuỳ dự án) từ env
  const targetBase = useMemo(() => {
    const t = Number(process.env.NEXT_PUBLIC_DEX_TARGET);
    return Number.isFinite(t) && t > 0 ? t : 0;
  }, []);

  // current base coin: đọc từ liquidity events
  // Hỗ trợ nhiều field name khác nhau: ethAmount / solAmount / baseAmount / amount
  const currentBase = useMemo(() => {
    if (!liqList.length) return 0;

    const e0 = liqList[0] || {};
    const candidates = [e0?.ethAmount, e0?.solAmount, e0?.baseAmount, e0?.amount, e0?.quoteAmount];

    for (const v of candidates) {
      const n = Number(v ?? 0);
      if (Number.isFinite(n) && n > 0) return n;
    }

    // fallback: sum all events
    const sum = liqList.reduce((acc, e) => {
      const n =
        Number(e?.ethAmount ?? 0) ||
        Number(e?.solAmount ?? 0) ||
        Number(e?.baseAmount ?? 0) ||
        Number(e?.amount ?? 0) ||
        0;
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);

    return sum;
  }, [liqList]);

  const progressPct = useMemo(() => {
    if (isCompleted) return 100;
    if (!targetBase) return 0;
    const pct = (currentBase / targetBase) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }, [currentBase, targetBase, isCompleted]);

  // ✅ CÁCH A: không fetch USD nữa
  const usd = 0;
  const currentUsd = currentBase * usd;
  const targetUsd = targetBase * usd;

  const truncateDescription = (description: string, maxLength: number = 100) => {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength)}...`;
  };

  // current price label (nếu BE có trả)
  const currentPriceValue = tokenInfo?.price ?? tokenInfo?.currentPrice ?? null;

  const TokenDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Contract"
          value={tokenInfo?.address ? formatAddressV2(tokenInfo.address) : 'Loading...'}
          link={tokenInfo?.address ? `https://shibariumscan.io/address/${tokenInfo.address}` : undefined}
          isExternal={true}
        />
        <InfoItem
          label="Deployer"
          value={tokenInfo?.creatorAddress ? shortenAddress(tokenInfo.creatorAddress) : 'Loading...'}
          link={tokenInfo?.creatorAddress ? `/profile/${tokenInfo.creatorAddress}` : undefined}
          isExternal={false}
          copyValue={tokenInfo?.creatorAddress}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Created"
          value={tokenInfo?.createdAt ? formatTimestamp(tokenInfo.createdAt as any) : 'Loading...'}
        />
        <InfoItem
          label="Current Price"
          value={currentPriceValue != null ? `${formatAmount(String(currentPriceValue))} BONE` : '—'}
        />
      </div>

      {/* ⛔ Market Cap đã xóa theo yêu cầu */}
    </div>
  );

  if (showHeader) {
    const logo = tokenInfo?.logo || '/chats/noimg.svg';
    const name = tokenInfo?.name || tokenInfo?.symbol || 'Token';

    return (
      <div className="space-y-6">
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-col">
          <div className="w-full h-[200px] mb-4 bg-[var(--card2)] rounded-b-xl overflow-hidden relative">
            <Image src={logo} alt={name} fill className="object-cover" sizes="100vw" priority={false} />
          </div>

          <div className="px-4">
            <div className="text-center mb-3">
              <h1 className="text-2xl font-bold text-white">{name}</h1>
              {tokenInfo?.symbol && <p className="text-xs text-gray-400 mt-1">{tokenInfo.symbol}</p>}
            </div>

            <p className="text-sm text-gray-400 text-center mb-4">
              {truncateDescription(tokenInfo?.description || '')}
            </p>

            <div className="flex justify-center gap-4 mb-6">
              {tokenInfo?.website && (
                <a
                  href={tokenInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[var(--primary)] transition-colors"
                >
                  <Globe size={24} />
                </a>
              )}
              {tokenInfo?.twitter && (
                <a
                  href={tokenInfo.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[var(--primary)] transition-colors"
                >
                  <Twitter size={24} />
                </a>
              )}
              {tokenInfo?.telegram && (
                <a
                  href={tokenInfo.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[var(--primary)] transition-colors"
                >
                  <Telegram size={24} />
                </a>
              )}
              {tokenInfo?.discord && (
                <a
                  href={tokenInfo.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[var(--primary)] transition-colors"
                >
                  <Discord size={24} />
                </a>
              )}
              {tokenInfo?.youtube && (
                <a
                  href={tokenInfo.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-[var(--primary)] transition-colors"
                >
                  <Youtube size={24} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="flex items-start gap-4">
            <div className="relative w-24 h-24">
              <Image src={logo} alt={name} fill className="rounded-lg object-cover" sizes="96px" />
            </div>

            <div className="flex-1">
              <div className="flex items-start gap-2">
                <div>
                  <h1 className="text-xl font-bold text-white">{name}</h1>
                  {tokenInfo?.symbol && <p className="text-xs text-gray-400 mt-1">{tokenInfo.symbol}</p>}
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2">{truncateDescription(tokenInfo?.description || '')}</p>

              <div className="flex gap-3 mt-4">
                {tokenInfo?.website && (
                  <a href={tokenInfo.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Globe size={20} />
                  </a>
                )}
                {tokenInfo?.twitter && (
                  <a href={tokenInfo.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Twitter size={20} />
                  </a>
                )}
                {tokenInfo?.telegram && (
                  <a href={tokenInfo.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Telegram size={20} />
                  </a>
                )}
                {tokenInfo?.discord && (
                  <a href={tokenInfo.discord} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Discord size={20} />
                  </a>
                )}
                {tokenInfo?.youtube && (
                  <a href={tokenInfo.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Youtube size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress to DEX (Market Cap) — giữ UI tiền + progress bar (USD=0) */}
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

        <TokenDetails />
      </div>
    );
  }

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
              type="button"
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
