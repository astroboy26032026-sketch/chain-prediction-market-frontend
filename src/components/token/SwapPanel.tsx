// SwapPanel: Buy/Sell swap UI used on token detail page (both mobile & desktop)

import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDownIcon, Settings2Icon } from 'lucide-react';
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
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings when clicking outside
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isSettingsOpen]);

  const isBuy = !isSwapped;

  return (
    <div className="card gradient-border p-4 relative">
      {/* Header: BUY/SELL tabs + Settings */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-1 bg-[var(--card)] rounded-xl p-1">
          <button
            onClick={() => onSetSwapped(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              isBuy ? 'text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={isBuy ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
            type="button"
          >
            Buy
          </button>
          <button
            onClick={() => onSetSwapped(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              !isBuy ? 'text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
            style={!isBuy ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
            type="button"
          >
            Sell
          </button>
        </div>

        {/* Settings button */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen((v) => !v)}
          className={`p-2 rounded-xl transition-all ${
            isSettingsOpen
              ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
              : 'bg-[var(--card)] text-gray-400 hover:text-white hover:bg-[var(--card-hover)]'
          }`}
          aria-label="Trading settings"
        >
          <Settings2Icon size={18} />
        </button>
      </div>

      {/* Slippage indicator */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] text-gray-500">Slippage: {slippagePct}%</span>
        {antiMEV && (
          <span className="text-[11px] text-[var(--primary)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] inline-block" />
            MEV Protected
          </span>
        )}
      </div>

      {/* From Token Input */}
      <div className="mb-2">
        <div className="flex justify-between text-[11px] mb-1.5 px-1">
          <span className="text-gray-500">You pay</span>
          <span className="text-gray-500">
            Balance: <span className="text-gray-400">{isSwapped ? tokenBalance : solBalance}</span>
          </span>
        </div>
        <div className="flex items-center bg-[var(--card)] rounded-xl p-3 transition-all focus-within:ring-1 focus-within:ring-[var(--primary)]/30">
          <input
            type="number"
            value={fromToken.amount}
            onChange={onFromAmountChange}
            className="w-full bg-transparent text-white outline-none text-base font-medium placeholder-gray-600"
            placeholder="0.00"
            disabled={isTransacting}
          />
          <div className="ml-2 flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-medium text-gray-300 bg-[var(--card2)] px-2 py-1 rounded-lg">
              {fromToken.symbol || 'SOL'}
            </span>
            <button
              onClick={onMaxClick}
              className="text-[10px] font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] px-1.5 py-1 rounded-md hover:bg-[var(--primary)]/10 transition-colors uppercase tracking-wide"
              type="button"
            >
              Max
            </button>
          </div>
        </div>
      </div>

      {/* Swap direction button */}
      <div className="flex justify-center -my-1 relative z-10">
        <button
          onClick={onSwap}
          className="p-2 rounded-xl bg-[var(--card2)] border border-[var(--card-border)] text-gray-400 hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all hover:rotate-180 duration-300"
          type="button"
          aria-label="Swap tokens"
        >
          <ArrowUpDownIcon size={16} />
        </button>
      </div>

      {/* To Token Output */}
      <div className="mb-4 mt-2">
        <div className="flex justify-between text-[11px] mb-1.5 px-1">
          <span className="text-gray-500">You receive</span>
          <span className="text-gray-500">
            Balance: <span className="text-gray-400">{isSwapped ? solBalance : tokenBalance}</span>
          </span>
        </div>
        <div className="flex items-center bg-[var(--card)] rounded-xl p-3">
          <input
            type="text"
            value={isCalculating ? '' : toToken.amount}
            readOnly
            className="w-full bg-transparent text-white outline-none text-base font-medium placeholder-gray-600"
            placeholder={isCalculating ? 'Calculating...' : '0.00'}
          />
          <span className="ml-2 text-xs font-medium text-gray-300 bg-[var(--card2)] px-2 py-1 rounded-lg flex-shrink-0">
            {toToken.symbol || tokenSymbol}
          </span>
        </div>
        {isCalculating && (
          <div className="mt-1.5 px-1">
            <div className="h-0.5 w-full bg-[var(--card)] rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-[var(--primary)]/60 rounded-full animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={onAction}
        disabled={!fromToken.amount || isCalculating || isTransacting}
        className="btn btn-primary w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        type="button"
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

      {/* Settings Panel Overlay */}
      {isSettingsOpen && (
        <>
          <div className="fixed inset-0 z-10" />
          <div
            ref={settingsRef}
            className="absolute right-0 sm:right-2 top-14 z-20 w-[calc(100vw-2rem)] sm:w-[300px] bg-[var(--card2)] border border-[var(--card-border)] rounded-xl shadow-2xl shadow-black/40 p-4"
          >
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
        </>
      )}
    </div>
  );
};

export default SwapPanel;
