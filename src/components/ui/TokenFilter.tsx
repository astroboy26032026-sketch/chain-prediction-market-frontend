import React, { useState } from 'react';

export interface TokenFilterValue {
  mcapMin: number;
  mcapMax: number;
  volMin: number;
  volMax: number;
}

interface TokenFilterProps {
  defaults: TokenFilterValue;
  activeFilter: TokenFilterValue | null;
  onApply: (v: TokenFilterValue) => void;
  onClear: () => void;
}

/**
 * TokenFilter (UI-only)
 * --------------------------------------------------
 * - Chỉ xử lý UI + pending state
 * - KHÔNG fetch
 * - KHÔNG biết token là gì
 * - Emit filter value ra ngoài
 *
 * FUTURE (comment only):
 * - Có thể migrate filter sang BE
 * - Giữ nguyên component này
 * - onApply -> trigger refetch với query param
 */
const TokenFilter: React.FC<TokenFilterProps> = ({
  defaults,
  activeFilter,
  onApply,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState({
    ...defaults,
    mcapMinText: '',
    mcapMaxText: '',
    volMinText: '',
    volMaxText: '',
  });

  // ===== helpers (giữ nguyên logic cũ) =====
  const parseAbbrev = (s: string | number | null | undefined) => {
    if (s === null || s === undefined) return NaN;
    if (typeof s === 'number') return s;
    const raw = String(s).trim().toLowerCase().replace(/[\$,]/g, '');
    if (!raw) return NaN;
    const mult =
      raw.endsWith('k') ? 1e3 :
      raw.endsWith('m') ? 1e6 :
      raw.endsWith('b') ? 1e9 : 1;
    const num = parseFloat(raw.replace(/[kmb]$/, ''));
    return isNaN(num) ? NaN : num * mult;
  };

  const fmtAbbrev = (n: number) =>
    n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` :
    n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` :
    n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` :
    `$${Math.max(0, n | 0)}`;

  return (
    <div className="relative">
      {/* Filter button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`px-3 py-2 rounded-md border border-[var(--card-border)]
                    bg-[var(--card)] hover:shadow inline-flex items-center gap-2 text-sm
                    ${activeFilter ? 'ring-1 ring-[var(--primary)]' : ''}`}
        aria-expanded={isOpen}
      >
        Filter
        <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-80">
          <path fill="currentColor" d="M3 5h18l-7 8v6l-4-2v-4z" />
        </svg>
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className="absolute top-10 right-0 z-40 w-[420px] rounded-2xl
                     border border-[var(--card-border)]
                     bg-[var(--background)] text-[var(--foreground)]
                     p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          {/* ===== Mcap ===== */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Mcap</div>
              <div className="text-xs opacity-70">
                {fmtAbbrev(pending.mcapMin)} – {fmtAbbrev(pending.mcapMax)}
              </div>
            </div>

            <input
              type="range"
              min={defaults.mcapMin}
              max={defaults.mcapMax}
              value={pending.mcapMin}
              onChange={(e) =>
                setPending(p => ({
                  ...p,
                  mcapMin: Math.min(Number(e.target.value), p.mcapMax - 1),
                }))
              }
              className="w-full slider-accent"
            />

            <input
              type="range"
              min={defaults.mcapMin}
              max={defaults.mcapMax}
              value={pending.mcapMax}
              onChange={(e) =>
                setPending(p => ({
                  ...p,
                  mcapMax: Math.max(Number(e.target.value), p.mcapMin + 1),
                }))
              }
              className="w-full -mt-2 slider-accent"
            />
          </div>

          {/* ===== 24h Volume ===== */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">24h Vol</div>
              <div className="text-xs opacity-70">
                {fmtAbbrev(pending.volMin)} – {fmtAbbrev(pending.volMax)}
              </div>
            </div>

            <input
              type="range"
              min={defaults.volMin}
              max={defaults.volMax}
              value={pending.volMin}
              onChange={(e) =>
                setPending(p => ({
                  ...p,
                  volMin: Math.min(Number(e.target.value), p.volMax - 1),
                }))
              }
              className="w-full slider-accent"
            />

            <input
              type="range"
              min={defaults.volMin}
              max={defaults.volMax}
              value={pending.volMax}
              onChange={(e) =>
                setPending(p => ({
                  ...p,
                  volMax: Math.max(Number(e.target.value), p.volMin + 1),
                }))
              }
              className="w-full -mt-2 slider-accent"
            />
          </div>

          {/* ===== Actions ===== */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                onClear();
                setIsOpen(false);
              }}
              className="flex-1 px-4 py-2 rounded-lg
                         border border-[var(--card-border)]
                         bg-[var(--card)]"
            >
              Clear
            </button>

            <button
              onClick={() => {
                onApply({
                  mcapMin: pending.mcapMin,
                  mcapMax: pending.mcapMax,
                  volMin: pending.volMin,
                  volMax: pending.volMax,
                });
                setIsOpen(false);
              }}
              className="flex-1 px-4 py-2 rounded-lg
                         bg-[var(--primary)] text-white font-semibold hover:opacity-90"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenFilter;
