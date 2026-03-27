import React, { useMemo } from 'react';
import { Token, TokenWithLiquidityEvents } from '@/interface/types';
import { PREDICTION_MARKETS, type PredictionMarket } from '@/data/markets';

interface TokenCardProps {
  token: Token | TokenWithLiquidityEvents;
  isEnded: boolean;
  onTokenClick: (address: string) => void;
  onLiquidityUpdate?: (liquidityAmount: bigint) => void;
}

// Try to find matching prediction market mock data
function findMarket(token: Token | TokenWithLiquidityEvents): PredictionMarket | undefined {
  return PREDICTION_MARKETS.find((m) => m.address === token.address);
}

const fmtUSD = (v: number) => {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};

const TokenCard: React.FC<TokenCardProps> = ({
  token,
  isEnded,
  onTokenClick,
}) => {
  const market = findMarket(token);

  // Use prediction market data if available, otherwise derive from token
  const question = market?.question || token.description || token.name;
  const yesPercent = market?.outcomeAPercent ?? 50;
  const noPercent = market?.outcomeBPercent ?? 50;
  const liquidity = market ? fmtUSD(market.liquidity) : '$0';
  const image = market?.image || token.logo || '/chats/noimg.svg';

  const expiryDate = useMemo(() => {
    const dateStr = market?.expiresAt || token.createdAt;
    if (!dateStr) return '';
    const d = new Date(market?.expiresAt || '');
    if (isNaN(d.getTime())) {
      const created = new Date(token.createdAt);
      const expiry = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
      return expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [market, token.createdAt]);

  const handleClick = () => onTokenClick(token.address);

  const displayQuestion = question && question.length > 60 ? question.slice(0, 57) + '...' : question;

  // Check if it's a multi-outcome market (not Yes/No)
  const isMultiOutcome = market && market.outcomeA !== 'Yes' && market.outcomeB !== 'No';

  return (
    <div onClick={handleClick} className="cursor-pointer">
      <div className="prediction-card rounded-2xl overflow-hidden bg-[var(--card)] border border-[var(--card-border)] hover:border-[var(--primary)]/40 transition-all hover:shadow-lg hover:shadow-[var(--primary)]/10 p-4 flex flex-col gap-3">

        {/* Header: Image + Title + Link */}
        <div className="flex items-start gap-3">
          <div className="relative w-10 h-10 min-w-[40px] rounded-lg overflow-hidden bg-[var(--card2)]">
            <img
              src={image}
              alt={token.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/chats/noimg.svg'; }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-[var(--foreground)] leading-tight line-clamp-2">
              {displayQuestion}
            </h3>
          </div>
          <div className="min-w-[24px] w-6 h-6 rounded-full bg-[var(--card2)] flex items-center justify-center text-[var(--foreground)]/40 hover:text-[var(--primary)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
        </div>

        {/* Percentage Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-blue-400">{yesPercent}%</span>
            <span className="font-semibold text-rose-400">{noPercent}%</span>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
            <div className="bg-blue-500 rounded-full transition-all" style={{ width: `${yesPercent}%` }} />
            <div className="bg-rose-500 rounded-full transition-all" style={{ width: `${noPercent}%` }} />
          </div>
        </div>

        {/* Outcome Buttons */}
        {isMultiOutcome ? (
          /* Multi-outcome: show name + YES/NO badges */
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground)]/80 font-medium truncate">{market.outcomeA}</span>
              <div className="flex items-center gap-1">
                <span className="text-[var(--foreground)]/40">—</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">YES</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400">NO</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--foreground)]/80 font-medium truncate">{market.outcomeB}</span>
              <div className="flex items-center gap-1">
                <span className="text-[var(--foreground)]/40">—</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">YES</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400">NO</span>
              </div>
            </div>
          </div>
        ) : (
          /* Yes/No buttons */
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 border-blue-500/30 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all"
            >
              - Yes
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all"
            >
              - No
            </button>
          </div>
        )}

        {/* Footer: Liquidity + Expiry */}
        <div className="flex items-center justify-between text-xs text-[var(--foreground)]/50">
          <span>{liquidity} Liq.</span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {expiryDate}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TokenCard;
