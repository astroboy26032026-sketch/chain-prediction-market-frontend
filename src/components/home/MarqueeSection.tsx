// MarqueeSection: Trending token marquee with logo fallback

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Marquee from '@/components/ui/Marquee';
import { getTokenHref } from '@/utils/tokenAddress';
import type { Token } from '@/interface/types';

const TOKEN_BASE_PATH = '/token';

const normalizeLogo = (raw: any): string => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return '';
};

const getSymbolText = (t: any): string => {
  const sym = String(t?.symbol || '').trim();
  const name = String(t?.name || '').trim();
  const base = sym || name || '??';
  return base.slice(0, 2).toUpperCase();
};

interface MarqueeSectionProps {
  marqueeTokens: Token[];
  marqueeLogoError: Record<string, boolean>;
  onLogoError: (key: string) => void;
  onTokenClick: () => void;
  onExternalNavigate: () => void;
}

const MarqueeSection: React.FC<MarqueeSectionProps> = ({
  marqueeTokens,
  marqueeLogoError,
  onLogoError,
  onTokenClick,
  onExternalNavigate,
}) => {
  return (
    <>
      <Marquee speed={30} height={96}>
        <div className="flex items-center gap-6 px-6">
          <span className="font-bold tracking-widest">
            PUMP FUN CLONE • MAKE MONEY ON THE MEMECONOMY • FAIR LAUNCH • NO BOT DRAMA
          </span>
        </div>
      </Marquee>

      <Marquee speed={130}>
        {(marqueeTokens ?? []).map((token, index) => {
          const rawAddr =
            (token as any)?.address || (token as any)?.mint || (token as any)?.tokenAddress || (token as any)?.ca || null;
          const addr = rawAddr ? encodeURIComponent(String(rawAddr)) : null;
          const href = addr ? `${TOKEN_BASE_PATH}/${addr}` : getTokenHref(token);
          const isExternal = /^https?:\/\//i.test(href);

          const handleClick = () => {
            onTokenClick();
            if (isExternal) setTimeout(onExternalNavigate, 300);
          };

          const key = String((token as any)?.id ?? (token as any)?.address ?? index);
          const logo = normalizeLogo((token as any)?.logo);
          const symbolText = getSymbolText(token);
          const showLogo = Boolean(logo) && !marqueeLogoError[key];

          return (
            <Link
              key={`${key}-${index}`}
              href={href || TOKEN_BASE_PATH}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              onClick={handleClick}
              className="inline-flex items-center gap-3 px-3 py-2 mr-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow-xl cursor-pointer"
              style={{ minWidth: 220 }}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[var(--card-border)] shrink-0 bg-[var(--card-border)] relative">
                {showLogo ? (
                  <Image
                    src={logo}
                    alt={symbolText}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => onLogoError(key)}
                    unoptimized={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                    {symbolText}
                  </div>
                )}
              </div>

              <div className="font-bold truncate">{(token as any)?.name || 'Unnamed'}</div>
            </Link>
          );
        })}
      </Marquee>
    </>
  );
};

export default MarqueeSection;
