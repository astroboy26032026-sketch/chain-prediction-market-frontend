// Settings panel for swap trading (slippage, anti-MEV, tx speed, priority fee, bribe)

import React from 'react';

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

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  antiMEV, setAntiMEV,
  txSpeed, setTxSpeed,
  priorityFee, setPriorityFee,
  bribe, setBribe,
  slippagePct, setSlippagePct,
  onClose,
}) => {
  const activeBtn = 'px-3 py-1 rounded-md bg-[var(--primary)] text-white';
  const idleBtn = 'px-3 py-1 rounded-md bg-[var(--card)] text-gray-300 border-thin hover:text-white';

  return (
    <>
      <div className="space-y-3 text-sm">
        <div>
          <label className="text-gray-300 block mb-1">Slippage Tolerance (%)</label>
          <div className="flex items-center gap-2">
            {[0.5, 1, 2, 5].map((v) => (
              <button
                key={v}
                onClick={() => setSlippagePct(v)}
                className={slippagePct === v ? activeBtn : idleBtn}
                type="button"
              >
                {v}%
              </button>
            ))}
            <input
              type="number"
              min="0.1"
              max="50"
              step="0.1"
              value={slippagePct}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                if (Number.isFinite(n) && n > 0 && n <= 50) setSlippagePct(n);
              }}
              className="w-16 bg-[var(--card)] border-thin rounded-md px-2 py-1 text-white outline-none text-center"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Anti-MEV Protection</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setAntiMEV(true)} className={antiMEV ? activeBtn : idleBtn} type="button">
              ON
            </button>
            <button onClick={() => setAntiMEV(false)} className={!antiMEV ? activeBtn : idleBtn} type="button">
              OFF
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Transaction Speed</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setTxSpeed('auto')} className={txSpeed === 'auto' ? activeBtn : idleBtn} type="button">
              AUTO
            </button>
            <button onClick={() => setTxSpeed('manual')} className={txSpeed === 'manual' ? activeBtn : idleBtn} type="button">
              MANUAL
            </button>
          </div>
        </div>

        <div>
          <label className="text-gray-300 block mb-1">Priority Fee (SOL)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={priorityFee}
            onChange={(e) => setPriorityFee(e.target.value)}
            className="w-full bg-[var(--card)] border-thin rounded-md px-3 py-2 text-white outline-none"
            placeholder="0.002"
            disabled={txSpeed === 'auto'}
          />
        </div>

        <div>
          <label className="text-gray-300 block mb-1">Bribe (SOL)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={bribe}
            onChange={(e) => setBribe(e.target.value)}
            className="w-full bg-[var(--card)] border-thin rounded-md px-3 py-2 text-white outline-none"
            placeholder="0.01"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-md bg-[var(--card)] border-thin text-sm text-gray-300 hover:text-white"
          type="button"
        >
          Close
        </button>
      </div>
    </>
  );
};

export default SettingsPanel;
