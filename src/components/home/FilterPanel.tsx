// FilterPanel: Market cap and 24h volume filter dropdown for home page

import React from 'react';
import { FILTER_DEFAULTS, parseAbbrev, fmtAbbrev } from '@/utils/filterHelpers';

export interface PendingFilter {
  mcapMin: number;
  mcapMax: number;
  volMin: number;
  volMax: number;
  mcapMinText: string;
  mcapMaxText: string;
  volMinText: string;
  volMaxText: string;
}

interface FilterPanelProps {
  pending: PendingFilter;
  setPending: React.Dispatch<React.SetStateAction<PendingFilter>>;
  onApply: () => void;
  onClear: () => void;
}

const inputClass =
  'px-3 py-2 rounded-md bg-[var(--input)] border border-[var(--card-border)] focus:bg-[var(--accent)] focus:text-black focus:placeholder-black focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors';

const FilterPanel: React.FC<FilterPanelProps> = ({ pending, setPending, onApply, onClear }) => {
  return (
    <div className="absolute top-10 right-0 z-40 w-[420px] rounded-2xl border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Mcap */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Mcap</div>
          <div className="text-xs opacity-70">
            {fmtAbbrev(pending.mcapMin)} – {fmtAbbrev(pending.mcapMax)}
          </div>
        </div>

        <input
          type="range"
          min={FILTER_DEFAULTS.mcapMin}
          max={FILTER_DEFAULTS.mcapMax}
          value={pending.mcapMin}
          onChange={(e) =>
            setPending((p) => ({ ...p, mcapMin: Math.min(Number(e.target.value), p.mcapMax - 1) }))
          }
          className="w-full slider-accent"
          aria-label="Market cap minimum"
        />
        <input
          type="range"
          min={FILTER_DEFAULTS.mcapMin}
          max={FILTER_DEFAULTS.mcapMax}
          value={pending.mcapMax}
          onChange={(e) =>
            setPending((p) => ({ ...p, mcapMax: Math.max(Number(e.target.value), p.mcapMin + 1) }))
          }
          className="w-full -mt-2 slider-accent"
          aria-label="Market cap maximum"
        />

        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            placeholder="e.g., 10k, 1m"
            value={pending.mcapMinText}
            onChange={(e) => setPending((p) => ({ ...p, mcapMinText: e.target.value }))}
            onBlur={() => {
              const v = parseAbbrev(pending.mcapMinText);
              if (!Number.isNaN(v)) {
                setPending((p) => ({
                  ...p,
                  mcapMin: Math.min(Math.max(v, FILTER_DEFAULTS.mcapMin), p.mcapMax - 1),
                }));
              }
            }}
            className={inputClass}
            aria-label="Market cap min value"
          />
          <input
            placeholder="e.g., 10k, 1m"
            value={pending.mcapMaxText}
            onChange={(e) => setPending((p) => ({ ...p, mcapMaxText: e.target.value }))}
            onBlur={() => {
              const v = parseAbbrev(pending.mcapMaxText);
              if (!Number.isNaN(v)) {
                setPending((p) => ({
                  ...p,
                  mcapMax: Math.max(Math.min(v, FILTER_DEFAULTS.mcapMax), p.mcapMin + 1),
                }));
              }
            }}
            className={inputClass}
            aria-label="Market cap max value"
          />
        </div>
      </div>

      {/* Vol */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">24h Vol</div>
          <div className="text-xs opacity-70">
            {fmtAbbrev(pending.volMin)} – {fmtAbbrev(pending.volMax)}
          </div>
        </div>

        <input
          type="range"
          min={FILTER_DEFAULTS.volMin}
          max={FILTER_DEFAULTS.volMax}
          value={pending.volMin}
          onChange={(e) =>
            setPending((p) => ({ ...p, volMin: Math.min(Number(e.target.value), p.volMax - 1) }))
          }
          className="w-full slider-accent"
          aria-label="24h volume minimum"
        />
        <input
          type="range"
          min={FILTER_DEFAULTS.volMin}
          max={FILTER_DEFAULTS.volMax}
          value={pending.volMax}
          onChange={(e) =>
            setPending((p) => ({ ...p, volMax: Math.max(Number(e.target.value), p.volMin + 1) }))
          }
          className="w-full -mt-2 slider-accent"
          aria-label="24h volume maximum"
        />

        <div className="mt-2 grid grid-cols-2 gap-3">
          <input
            placeholder="e.g., 5k, 100k"
            value={pending.volMinText}
            onChange={(e) => setPending((p) => ({ ...p, volMinText: e.target.value }))}
            onBlur={() => {
              const v = parseAbbrev(pending.volMinText);
              if (!Number.isNaN(v)) {
                setPending((p) => ({
                  ...p,
                  volMin: Math.min(Math.max(v, FILTER_DEFAULTS.volMin), p.volMax - 1),
                }));
              }
            }}
            className={inputClass}
            aria-label="24h volume min value"
          />
          <input
            placeholder="e.g., 5k, 100k"
            value={pending.volMaxText}
            onChange={(e) => setPending((p) => ({ ...p, volMaxText: e.target.value }))}
            onBlur={() => {
              const v = parseAbbrev(pending.volMaxText);
              if (!Number.isNaN(v)) {
                setPending((p) => ({
                  ...p,
                  volMax: Math.max(Math.min(v, FILTER_DEFAULTS.volMax), p.volMin + 1),
                }));
              }
            }}
            className={inputClass}
            aria-label="24h volume max value"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button onClick={onClear} className="flex-1 px-4 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)]">
          Clear
        </button>
        <button onClick={onApply} className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-semibold hover:opacity-90">
          Apply
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
