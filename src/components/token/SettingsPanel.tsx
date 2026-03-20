// Settings panel for swap trading (slippage, anti-MEV, tx speed, priority fee, bribe)

import React from 'react';
import { XMarkIcon, ShieldCheckIcon, BoltIcon } from '@heroicons/react/24/outline';

interface SettingsPanelProps {
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
  onClose: () => void;
}

const SLIPPAGE_PRESETS = [0.5, 1, 2, 5];

// gradient giống btn-primary (Create Token button)
const activeCls = 'text-white shadow-sm';
const activeStyle: React.CSSProperties = {
  backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))',
};
const idleCls = 'bg-[var(--card)] text-gray-400 hover:text-white hover:bg-[var(--card-hover)]';

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  antiMEV, setAntiMEV,
  txSpeed, setTxSpeed,
  priorityFee, setPriorityFee,
  bribe, setBribe,
  slippagePct, setSlippagePct,
  onClose,
}) => {
  const isCustomSlippage = !SLIPPAGE_PRESETS.includes(slippagePct);

  return (
    <div className="space-y-4">
      {/* Header — Settings + X on same line */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Settings</span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          type="button"
          aria-label="Close settings"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Slippage Tolerance */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Slippage Tolerance</span>
          <span className="text-xs font-semibold text-[var(--accent)]">{slippagePct}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          {SLIPPAGE_PRESETS.map((v) => {
            const isActive = slippagePct === v && !isCustomSlippage;
            return (
              <button
                key={v}
                onClick={() => setSlippagePct(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive ? activeCls : idleCls}`}
                style={isActive ? activeStyle : undefined}
                type="button"
              >
                {v}%
              </button>
            );
          })}
          <div className="relative flex-1">
            <input
              type="number"
              min="0.1"
              max="50"
              step="0.1"
              value={isCustomSlippage ? slippagePct : ''}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                if (Number.isFinite(n) && n > 0 && n <= 50) setSlippagePct(n);
              }}
              placeholder="Custom"
              className={`w-full py-1.5 rounded-lg text-xs font-medium text-center outline-none transition-all ${
                isCustomSlippage ? activeCls : 'bg-[var(--card)] text-gray-400 placeholder-gray-500 hover:bg-[var(--card-hover)]'
              }`}
              style={isCustomSlippage ? activeStyle : undefined}
            />
          </div>
        </div>
        {slippagePct > 5 && (
          <p className="mt-1.5 text-[10px] text-yellow-500/80">High slippage — you may receive fewer tokens.</p>
        )}
      </div>

      {/* MEV Protection */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className={`w-4 h-4 ${antiMEV ? 'text-[var(--accent)]' : 'text-gray-500'}`} />
          <span className="text-xs font-medium text-gray-300">MEV Protection</span>
        </div>
        <button
          onClick={() => setAntiMEV(!antiMEV)}
          className="relative w-9 h-5 rounded-full transition-colors"
          style={antiMEV ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
          type="button"
          aria-label={`MEV protection ${antiMEV ? 'on' : 'off'}`}
        >
          {!antiMEV && <span className="absolute inset-0 rounded-full bg-[var(--card)] border border-[var(--card-border)]" />}
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              antiMEV ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Transaction Speed */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BoltIcon className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-medium text-gray-300">Transaction Speed</span>
        </div>
        <div className="flex gap-1.5">
          {(['auto', 'manual'] as const).map((v) => {
            const isActive = txSpeed === v;
            return (
              <button
                key={v}
                onClick={() => setTxSpeed(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${isActive ? activeCls : idleCls}`}
                style={isActive ? activeStyle : undefined}
                type="button"
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* Priority Fee & Bribe — only visible on Manual mode */}
      {txSpeed === 'manual' && (
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Priority Fee (SOL)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={priorityFee}
              onChange={(e) => setPriorityFee(e.target.value)}
              className="w-full bg-[var(--card)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[var(--accent)]/40 transition-shadow placeholder-gray-500"
              placeholder="0.002"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-400 block mb-1.5">Bribe (SOL)</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={bribe}
              onChange={(e) => setBribe(e.target.value)}
              className="w-full bg-[var(--card)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-[var(--accent)]/40 transition-shadow placeholder-gray-500"
              placeholder="0.01"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
