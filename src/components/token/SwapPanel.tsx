// SwapPanel: Buy/Sell swap UI used on token detail page (both mobile & desktop)

import React from 'react';
import { Info } from 'lucide-react';

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

const PRESETS = ['0.1', '0.5', '1'];

const SwapPanel: React.FC<SwapPanelProps> = ({
  fromToken, toToken,
  isSwapped, isCalculating, isTransacting,
  solBalance, tokenBalance, tokenSymbol,
  actionButtonText,
  slippagePct,
  onFromAmountChange, onMaxClick, onAction, onSetSwapped,
}) => {
  const isBuy = !isSwapped;

  const handlePreset = (val: string) => {
    onFromAmountChange({ target: { value: val } } as React.ChangeEvent<HTMLInputElement>);
  };

  const balance = isSwapped ? tokenBalance : solBalance;
  const fromSymbol = fromToken.symbol || (isBuy ? 'SOL' : tokenSymbol);
  const toSymbol = toToken.symbol || (isBuy ? tokenSymbol : 'SOL');

  return (
    <div className="flex flex-col gap-3">

      {/* ── BUY / SELL tabs ── */}
      <div className="flex gap-2">
        <button
          onClick={() => onSetSwapped(false)}
          type="button"
          className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all border"
          style={isBuy
            ? { background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderColor: 'transparent', color: '#fff' }
            : { background: 'transparent', borderColor: 'var(--card-border)', color: 'var(--foreground)', opacity: 0.6 }
          }
        >
          BUY
        </button>
        <button
          onClick={() => onSetSwapped(true)}
          type="button"
          className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all border"
          style={!isBuy
            ? { background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderColor: 'transparent', color: '#fff' }
            : { background: 'transparent', borderColor: 'var(--card-border)', color: 'var(--foreground)', opacity: 0.6 }
          }
        >
          SELL
        </button>
      </div>

      {/* ── Input Card ── */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] px-4 pt-3 pb-4">

        {/* Token + Balance row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-[var(--card2)] flex items-center justify-center text-xs">
              {isBuy ? '◎' : '🪙'}
            </div>
            <span className="text-sm font-bold">{fromSymbol}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs opacity-60">
            <span>{balance}</span>
          </div>
        </div>

        {/* Big amount input */}
        <input
          type="number"
          value={fromToken.amount}
          onChange={onFromAmountChange}
          disabled={isTransacting}
          placeholder="0.00"
          className="w-full bg-transparent text-center outline-none font-extrabold placeholder-[var(--foreground)]/20"
          style={{ fontSize: '2.25rem', lineHeight: 1.1, color: fromToken.amount ? 'var(--foreground)' : undefined }}
        />

        {/* Output equivalent */}
        <div className="flex items-center justify-center gap-1.5 mt-2 mb-3 min-h-[20px]">
          {isCalculating ? (
            <div className="h-0.5 w-16 bg-[var(--primary)]/40 rounded-full animate-pulse" />
          ) : (
            <>
              <span className="text-sm opacity-50">{toToken.amount || '0'}</span>
              <span className="text-sm opacity-40">{toSymbol}</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--card-border)] mb-3" />

        {/* Preset buttons */}
        <div className="flex items-center gap-1.5">
          {PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => handlePreset(v)}
              disabled={isTransacting}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-[var(--card-border)] bg-[var(--card2)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] transition-colors disabled:opacity-40"
            >
              {v}
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

      {/* ── Slippage row ── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-sm opacity-60">
          <span>Slippage (%)</span>
          <Info size={13} className="opacity-70" />
        </div>
        <span className="text-sm font-bold">{slippagePct}</span>
      </div>

      {/* ── Action Button ── */}
      <button
        onClick={onAction}
        disabled={!fromToken.amount || isCalculating || isTransacting}
        type="button"
        className="w-full py-3.5 rounded-2xl text-sm font-extrabold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff' }}
      >
        {isTransacting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          actionButtonText
        )}
      </button>

    </div>
  );
};

export default SwapPanel;
