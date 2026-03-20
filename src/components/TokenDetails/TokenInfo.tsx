// src/components/TokenDetails/TokenInfo.tsx
import React, { useEffect, useMemo } from 'react';
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

    // address compat
    address?: string;
    tokenAddress?: string;
    mint?: string;

    // optional: nếu BE có trả current price (base coin)
    price?: number | string;
    currentPrice?: number | string;
    priceUsd?: number | string;

    // extra stats
    marketCap?: number;
    mcapUsd?: number;
    marketcapUsd?: number;
    marketCapUsd?: number;
    volume24h?: number;
    vol24h?: number;
    vol24hUsd?: number;
    volume24hUsd?: number;
    holders?: number;
    holderCount?: number;
    liquidity?: number;
    totalSupply?: number | string;
    supply?: number | string;
    progressDex?: number;
  };
  showHeader?: boolean;
  refreshTrigger?: number;
  liquidityEvents?: any; // [] | {events: []} | {liquidityEvents: []} | null
}

const fmtNum = (n: number, digits = 4) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  return v.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

const ensureHttp = (url?: string) => {
  const s = String(url ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  return `https://${s}`;
};

const getTokenAddressAny = (t: any) =>
  String(t?.address ?? t?.tokenAddress ?? t?.mint ?? t?.token ?? '').trim();

// Bạn có thể đổi sang explorer khác nếu muốn
const explorerAddressUrl = (addr: string) => `https://solscan.io/account/${addr}`;

const TokenInfo: React.FC<TokenInfoProps> = ({
  tokenInfo,
  showHeader = false,
  refreshTrigger = 0,
}) => {
  // giữ state để UI/UX không đổi (nếu nơi khác đang set refreshTrigger)
  useEffect(() => {
    // nothing required — liquidityEvents / tokenInfo sẽ tự update từ parent
  }, [refreshTrigger]);

  const progressPct = useMemo(() => {
    // Only use progressDex from API — no guessing
    const apiProg = Number(tokenInfo?.progressDex ?? 0);
    if (Number.isFinite(apiProg) && apiProg > 0) return Math.min(apiProg, 100);
    return 0;
  }, [tokenInfo?.progressDex]);

  const truncateDescription = (description: string, maxLength: number = 120) => {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return `${description.slice(0, maxLength)}...`;
  };

  // current price: try multiple field names
  const currentPriceValue = tokenInfo?.price ?? tokenInfo?.currentPrice ?? tokenInfo?.priceUsd ?? null;

  // market stats — try multiple field names
  const marketCapValue = Number(tokenInfo?.marketCap ?? tokenInfo?.mcapUsd ?? tokenInfo?.marketcapUsd ?? tokenInfo?.marketCapUsd ?? 0) || 0;
  const volume24hValue = Number(tokenInfo?.volume24h ?? tokenInfo?.vol24h ?? tokenInfo?.vol24hUsd ?? tokenInfo?.volume24hUsd ?? 0) || 0;
  const holdersValue = Number(tokenInfo?.holders ?? tokenInfo?.holderCount ?? 0) || 0;
  const liquidityValue = Number(tokenInfo?.liquidity ?? 0) || 0;
  const totalSupplyValue = Number(tokenInfo?.totalSupply ?? tokenInfo?.supply ?? 0) || 0;

  const addr = useMemo(() => getTokenAddressAny(tokenInfo), [tokenInfo]);
  const logo = tokenInfo?.logo || '/chats/noimg.svg';
  const name = tokenInfo?.name || tokenInfo?.symbol || 'Token';

  const socials = useMemo(
    () => ({
      website: ensureHttp(tokenInfo?.website),
      twitter: ensureHttp(tokenInfo?.twitter),
      telegram: ensureHttp(tokenInfo?.telegram),
      discord: ensureHttp(tokenInfo?.discord),
      youtube: ensureHttp(tokenInfo?.youtube),
    }),
    [tokenInfo?.website, tokenInfo?.twitter, tokenInfo?.telegram, tokenInfo?.discord, tokenInfo?.youtube]
  );

  const TokenDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Contract"
          value={addr ? formatAddressV2(addr) : '—'}
          link={addr ? explorerAddressUrl(addr) : undefined}
          isExternal={true}
          copyValue={addr || undefined}
        />
        <InfoItem
          label="Deployer"
          value={tokenInfo?.creatorAddress ? shortenAddress(tokenInfo.creatorAddress) : '—'}
          link={tokenInfo?.creatorAddress ? `/profile/${tokenInfo.creatorAddress}` : undefined}
          isExternal={false}
          copyValue={tokenInfo?.creatorAddress}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Created"
          value={tokenInfo?.createdAt ? formatTimestamp(tokenInfo.createdAt as any) : '—'}
        />
        <InfoItem
          label="Current Price"
          value={
            currentPriceValue != null && String(currentPriceValue).trim() !== '' && Number(currentPriceValue) > 0
              ? `$${formatAmount(String(currentPriceValue))}`
              : '—'
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Market Cap"
          value={marketCapValue > 0 ? `$${fmtNum(marketCapValue, 2)}` : '—'}
        />
        <InfoItem
          label="24h Volume"
          value={volume24hValue > 0 ? `$${fmtNum(volume24hValue, 2)}` : '—'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoItem
          label="Liquidity"
          value={liquidityValue > 0 ? `$${fmtNum(liquidityValue, 2)}` : '—'}
        />
        <InfoItem
          label="Total Supply"
          value={totalSupplyValue > 0 ? fmtNum(totalSupplyValue, 0) : '—'}
        />
      </div>
    </div>
  );

  if (showHeader) {
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
              {socials.website && (
                <a href={socials.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Globe size={24} />
                </a>
              )}
              {socials.twitter && (
                <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Twitter size={24} />
                </a>
              )}
              {socials.telegram && (
                <a href={socials.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Telegram size={24} />
                </a>
              )}
              {socials.discord && (
                <a href={socials.discord} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
                  <Discord size={24} />
                </a>
              )}
              {socials.youtube && (
                <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)] transition-colors">
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
                {socials.website && (
                  <a href={socials.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Globe size={20} />
                  </a>
                )}
                {socials.twitter && (
                  <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Twitter size={20} />
                  </a>
                )}
                {socials.telegram && (
                  <a href={socials.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Telegram size={20} />
                  </a>
                )}
                {socials.discord && (
                  <a href={socials.discord} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Discord size={20} />
                  </a>
                )}
                {socials.youtube && (
                  <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]">
                    <Youtube size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress to DEX — always show, 0% if no data, progress bar only when > 0 */}
        <div className="bg-[var(--card2)] p-4 rounded-lg border-thin">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-300 font-medium">Progress to DEX</span>
            <span className="text-white">
              {progressPct % 1 === 0 ? `${progressPct}%` : `${progressPct.toFixed(2)}%`}
            </span>
          </div>
          {progressPct > 0 && (
            <div className="w-full bg-[var(--card-boarder)] rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-[var(--primary)] h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
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
        <span>{value}</span>
      )}
    </div>
  </div>
);

const copyToClipboard = async (text: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    toast.success('Copied!', {
      position: 'top-right',
      autoClose: 1200,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
    });
  } catch {
    toast.error('Copy failed');
  }
};

export default TokenInfo;
