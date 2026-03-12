// SwapPanel: Buy/Sell swap UI used on token detail page (both mobile & desktop)

import React, { useState } from 'react';
import { ArrowUpDownIcon } from 'lucide-react';
import SettingsPanel from './SettingsPanel';

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
  // settings
  antiMEV: boolean;
  setAntiMEV: (v: boolean) => void;
  txSpeed: 'auto' | 'manual';
  setTxSpeed: (v: 'auto' | 'manual') => void;
  priorityFee: string;
  setPriorityFee: (v: string) => void;
  bribe: string;
  setBribe: (v: string) => void;
  slippagePct: number;
  setSlippagePct: (v: number) => void;
  // handlers
  onSwap: () => void;
  onFromAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMaxClick: () => void;
  onAction: () => void;
  onSetSwapped: (v: boolean) => void;
}

const PRICE_UNIT: 'SOL' = 'SOL';

const SwapPanel: React.FC<SwapPanelProps> = ({
  fromToken, toToken,
  isSwapped, isCalculating, isTransacting,
  solBalance, tokenBalance, tokenSymbol,
  actionButtonText,
  antiMEV, setAntiMEV,
  txSpeed, setTxSpeed,
  priorityFee, setPriorityFee,
  bribe, setBribe,
  slippagePct, setSlippagePct,
  onSwap, onFromAmountChange, onMaxClick, onAction, onSetSwapped,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="card gradient-border p-4 relative">
      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-400">Slippage (%)</label>
        <button
          type="button"
          onClick={() => setIsSettingsOpen((v) => !v)}
          className="rounded-md bg-[var(--card)] border-thin px-2 py-1 text-sm text-gray-300 hover:text-white"
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => onSetSwapped(false)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin ${
            !isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'
          }`}
          type="button"
        >
          BUY
        </button>
        <button
          onClick={() => onSetSwapped(true)}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin ${
            isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'
          }`}
          type="button"
        >
          SELL
        </button>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">From</span>
          <span className="text-gray-400">Balance: {isSwapped ? tokenBalance : solBalance}</span>
        </div>
        <div className="flex items-center bg-[var(--card)] rounded-lg p-3 border-thin">
          <input
            type="number"
            value={fromToken.amount}
            onChange={onFromAmountChange}
            className="w-full bg-transparent text-white outline-none text-sm"
            placeholder="0.00"
            disabled={isTransacting}
          />
          <div className="ml-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">{fromToken.symbol || 'SOL'}</span>
            <button
              onClick={onMaxClick}
              className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium px-2 py-1 rounded transition-colors"
              type="button"
            >
              MAX
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={onSwap}
        className="w-full flex justify-center p-2 text-gray-400 hover:text-[var(--primary)]"
        type="button"
        aria-label="Swap tokens"
      >
        <ArrowUpDownIcon size={20} />
      </button>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">To</span>
          <span className="text-gray-400">Balance: {isSwapped ? solBalance : tokenBalance}</span>
        </div>
        <div className="flex items-center bg-[var(--card)] rounded-lg p-3 border-thin">
          <input
            type="text"
            value={isCalculating ? 'Calculating...' : toToken.amount}
            readOnly
            className="w-full bg-transparent text-white outline-none text-sm"
            placeholder={isSwapped ? '0.000000' : '0.000'}
          />
          <span className="ml-2 text-xs text-gray-400">{toToken.symbol || tokenSymbol}</span>
        </div>
        {!isSwapped && PRICE_UNIT === 'SOL' && (
          <div className="mt-2 text-xs text-gray-500">Input SOL → estimated token out (rounded 3 decimals).</div>
        )}
        {isSwapped && PRICE_UNIT === 'SOL' && (
          <div className="mt-2 text-xs text-gray-500">Input TOKEN → estimated SOL out (rounded 6 decimals).</div>
        )}
      </div>

      <button
        onClick={onAction}
        disabled={!fromToken.amount || isCalculating || isTransacting}
        className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        type="button"
      >
        {isTransacting ? 'Processing...' : actionButtonText}
      </button>

      {isSettingsOpen && (
        <div className="absolute right-4 top-20 z-20 w-[320px] bg-[var(--card2)] border-thin rounded-xl shadow-xl p-4">
          <SettingsPanel
            antiMEV={antiMEV}
            setAntiMEV={setAntiMEV}
            txSpeed={txSpeed}
            setTxSpeed={setTxSpeed}
            priorityFee={priorityFee}
            setPriorityFee={setPriorityFee}
            bribe={bribe}
            setBribe={setBribe}
            slippagePct={slippagePct}
            setSlippagePct={setSlippagePct}
            onClose={() => setIsSettingsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default SwapPanel;
