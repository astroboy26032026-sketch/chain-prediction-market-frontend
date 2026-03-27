// src/components/TokenDetails/TokenInfo.tsx — Prediction Market Info Header
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
import { toastSuccess, toastError } from '@/utils/customToast';
import { formatTimestamp, shortenAddress, formatAddressV2 } from '@/utils/blockchainUtils';
import type { Token } from '@/interface/types';
import type { PredictionMarket } from '@/data/markets';

interface TokenInfoProps {
  tokenInfo: Token & Record<string, any>;
  showHeader?: boolean;
  refreshTrigger?: number;
  liquidityEvents?: any;
  market?: PredictionMarket;
}

const fmtUSD = (v: number) => {
  if (!Number.isFinite(v) || v === 0) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
  }).format(v);
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

const explorerAddressUrl = (addr: string) => `https://solscan.io/account/${addr}`;

const TokenInfo: React.FC<TokenInfoProps> = ({
  tokenInfo,
  showHeader = false,
  refreshTrigger = 0,
  market,
}) => {
  useEffect(() => {}, [refreshTrigger]);

  // Use market data if available
  const chancePercent = market?.outcomeAPercent ?? (() => {
    const apiProg = Number(tokenInfo?.progressDex ?? 0);
    if (Number.isFinite(apiProg) && apiProg > 0) return Math.min(Math.round(apiProg), 99);
    return 50;
  })();

  const volumeValue = market?.volume24h ?? (Number(tokenInfo?.volume24h ?? tokenInfo?.vol24hUsd ?? 0) || 0);
  const outcomeA = market?.outcomeA || 'Yes';
  const outcomeB = market?.outcomeB || 'No';

  const expiryDate = useMemo(() => {
    if (market?.expiresAt) {
      return new Date(market.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (!tokenInfo?.createdAt) return '';
    const created = new Date(tokenInfo.createdAt as string);
    const expiry = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [market, tokenInfo?.createdAt]);

  const addr = useMemo(() => market?.address || getTokenAddressAny(tokenInfo), [market, tokenInfo]);
  const logo = tokenInfo?.logo || '/chats/noimg.svg';
  const name = market?.question || tokenInfo?.name || tokenInfo?.symbol || 'Market';

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

  const SocialLinks: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <div className="flex gap-3">
      {socials.website && <a href={socials.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]"><Globe size={size} /></a>}
      {socials.twitter && <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]"><Twitter size={size} /></a>}
      {socials.telegram && <a href={socials.telegram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]"><Telegram size={size} /></a>}
      {socials.discord && <a href={socials.discord} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]"><Discord size={size} /></a>}
      {socials.youtube && <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[var(--primary)]"><Youtube size={size} /></a>}
    </div>
  );

  const StatsRow: React.FC = () => (
    <div className="flex items-center gap-3 text-xs text-gray-400">
      <span className="flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        {fmtUSD(volumeValue)} Vol.
      </span>
      <span className="flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {expiryDate}
      </span>
      <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold text-[10px] flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        LIVE
      </span>
    </div>
  );

  const MarketDetails = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoItem label="Volume (24h)" value={fmtUSD(volumeValue)} />
        <InfoItem label="Liquidity" value={fmtUSD(market?.liquidity ?? Number(tokenInfo?.marketCap ?? 0))} />
      </div>
    </div>
  );

  if (showHeader) {
    return (
      <div className="space-y-5">
        {/* Mobile Header */}
        <div className="lg:hidden flex flex-col">
          <div className="px-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="relative w-12 h-12 min-w-[48px] rounded-lg overflow-hidden bg-[var(--card2)]">
                <Image src={logo} alt={name} fill className="object-cover" sizes="48px" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white leading-tight">{name}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-4xl font-black text-white">{chancePercent}%</div>
              <div className="text-sm text-gray-400">Chance</div>
            </div>
            <div className="mb-4"><StatsRow /></div>
            <div className="mb-4"><SocialLinks size={20} /></div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <div className="flex items-start gap-4">
            <div className="relative w-14 h-14 min-w-[56px] rounded-lg overflow-hidden">
              <Image src={logo} alt={name} fill className="object-cover" sizes="56px" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white leading-tight">{name}</h1>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">{chancePercent}%</span>
                  <span className="text-sm text-gray-400">Chance</span>
                </div>
                <div className="ml-4"><StatsRow /></div>
              </div>
              <div className="mt-3"><SocialLinks /></div>
            </div>
          </div>
        </div>

        {/* Outcome probability bar */}
        <div className="bg-[var(--card2)] p-4 rounded-lg border-thin">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-sm font-semibold text-blue-400">{outcomeA} {chancePercent}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-rose-400">{outcomeB} {100 - chancePercent}%</span>
              <span className="w-3 h-3 rounded-sm bg-rose-500" />
            </div>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            <div className="bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${chancePercent}%` }} />
            <div className="bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${100 - chancePercent}%` }} />
          </div>
        </div>

        <MarketDetails />
      </div>
    );
  }

  return <MarketDetails />;
};

const InfoItem: React.FC<{
  label: string; value?: string; link?: string; isExternal?: boolean; copyValue?: string;
}> = ({ label, value, link, isExternal, copyValue }) => (
  <div className="bg-[var(--card2)] p-3 rounded-lg border-thin">
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className="text-sm text-white flex items-center gap-2">
      {link ? (
        <div className="flex items-center gap-2 flex-grow">
          <a href={link} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}
            className="hover:text-[var(--primary)] transition-colors flex items-center gap-1">
            {value}{isExternal && <ExternalLinkIcon size={12} />}
          </a>
          {copyValue && (
            <button onClick={() => copyToClipboard(copyValue)} className="text-gray-400 hover:text-[var(--primary)] transition-colors" title="Copy" type="button">
              <Copy size={12} />
            </button>
          )}
        </div>
      ) : (<span>{value}</span>)}
    </div>
  </div>
);

const copyToClipboard = async (text: string) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    toastSuccess('Copied!');
  } catch { toastError('Copy failed'); }
};

export default TokenInfo;
