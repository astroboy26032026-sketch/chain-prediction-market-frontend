// SwapPanel: Prediction Market — Yes/No betting panel

import React, { useState } from 'react';

interface SwapPanelProps {
  fromToken: { symbol: string; amount: string };
  toToken: { symbol: string; amount: string };
  isSwapped: boolean;
  isCalculating: boolean;
  isTransacting: boolean;
  solBalance: string;
  tokenBalance: string;
  tokenSymbol: string;
  actionButtonText: string;
  slippagePct: number;
  // handlers
  onSwap: () => void;
  onFromAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMaxClick: () => void;
  onAction: () => void;
  onSetSwapped: (v: boolean) => void;
}

const PRESETS = [
  { label: '+$1', value: '1' },
  { label: '+$10', value: '10' },
  { label: '+$100', value: '100' },
];

const SwapPanel: React.FC<SwapPanelProps> = ({
  fromToken, toToken,
  isSwapped, isCalculating, isTransacting,
  solBalance, tokenBalance, tokenSymbol,
  actionButtonText,
  slippagePct,
  onFromAmountChange, onMaxClick, onAction, onSetSwapped,
}) => {
  const isBuy = !isSwapped;
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');

  // Derive outcome names from token symbol
  const outcomeA = tokenSymbol || 'Yes';
  const outcomeB = 'No';

  // Derive prices (cents) from existing data
  const priceACents = toToken.amount && fromToken.amount
    ? Math.min(Math.round(Number(toToken.amount) / Math.max(Number(fromToken.amount), 1) * 100), 99)
    : 64;
  const priceBCents = 100 - priceACents;

  const handlePreset = (val: string) => {
    onFromAmountChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>);
  };

  const balance = isSwapped ? tokenBalance : solBalance;

  return (
    <div className="flex flex-col gap-3">

      {/* Market / Limit toggle + Balance */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['Market', 'Limit'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setOrderType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                orderType === type
                  ? 'bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/40'
                  : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)] border border-transparent'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--foreground)]/40">
          <span>Balance:</span>
          <span className="font-medium text-[var(--foreground)]/60">${balance}</span>
        </div>
      </div>

      {/* Yes / No outcome buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSetSwapped(false)}
          className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all border-2 ${
            isBuy
              ? 'border-blue-500 bg-blue-500/15 text-blue-400 shadow-sm shadow-blue-500/10'
              : 'border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)]/60 hover:border-blue-500/40'
          }`}
        >
          Yes {priceACents}&cent;
        </button>
        <button
          type="button"
          onClick={() => onSetSwapped(true)}
          className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all border-2 ${
            !isBuy
              ? 'border-rose-500 bg-rose-500/15 text-rose-400 shadow-sm shadow-rose-500/10'
              : 'border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)]/60 hover:border-rose-500/40'
          }`}
        >
          No {priceBCents}&cent;
        </button>
      </div>

      {/* Amount input */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 pt-3 pb-4">
        <div className="text-xs text-[var(--foreground)]/50 mb-2">Amount</div>

        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-[var(--foreground)]/30">$</span>
          <input
            type="number"
            value={fromToken.amount}
            onChange={onFromAmountChange}
            disabled={isTransacting}
            placeholder="0"
            className="flex-1 bg-transparent outline-none font-extrabold placeholder-[var(--foreground)]/20"
            style={{ fontSize: '2rem', lineHeight: 1.1, color: fromToken.amount ? 'var(--foreground)' : undefined }}
          />
        </div>

        {/* Output equivalent */}
        <div className="flex items-center gap-1.5 mt-2 mb-3 min-h-[20px]">
          {isCalculating ? (
            <div className="h-0.5 w-16 bg-[var(--primary)]/40 rounded-full animate-pulse" />
          ) : (
            <span className="text-sm opacity-40">
              {toToken.amount ? `${toToken.amount} shares` : '0 shares'}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--card-border)] mb-3" />

        {/* Preset buttons */}
        <div className="flex items-center gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handlePreset(p.value)}
              disabled={isTransacting}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-[var(--card-border)] bg-[var(--card2)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors disabled:opacity-40"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onMaxClick}
            disabled={isTransacting}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold border border-[var(--card-border)] bg-[var(--card2)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors disabled:opacity-40"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Action Button — Buy Yes / Buy No */}
      <button
        onClick={onAction}
        disabled={!fromToken.amount || isCalculating || isTransacting}
        type="button"
        className="w-full py-3.5 rounded-2xl text-sm font-extrabold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{
          background: isBuy
            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
            : 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: '#fff',
        }}
      >
        {isTransacting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          `Buy ${isBuy ? outcomeA : outcomeB}`
        )}
      </button>

    </div>
  );
};

export default SwapPanel;
