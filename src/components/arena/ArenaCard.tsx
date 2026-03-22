import React, { useMemo } from 'react';
import Link from 'next/link';
import { Arena } from '@/interface/types';
import { Clock, LinkIcon } from 'lucide-react';

/* ================================================================
   ArenaCard — Probable-style prediction card
   Layout: image + title | progress bar | Yes/No buttons | $Liq + date
   ================================================================ */

function formatLiq(v: number, currency: string) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

function formatEndDate(end: string): string {
  const d = new Date(end);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

interface ArenaCardProps {
  arena: Arena;
}

const ArenaCard: React.FC<ArenaCardProps> = ({ arena }) => {
  const optA = arena.options[0];
  const optB = arena.options[1];

  const pctA = useMemo(() => {
    if (!optA || arena.totalPool <= 0) return 50;
    return Math.round((optA.totalBet / arena.totalPool) * 100);
  }, [optA, arena.totalPool]);
  const pctB = 100 - pctA;

  // For multi-option (3+), show YES/NO style per option
  const isMulti = arena.options.length > 2;
  const isBinary = arena.options.length === 2;

  return (
    <Link href={`/arena/${arena.id}`} className="block group">
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] hover:border-[var(--primary)]/50 transition-all p-4 h-full flex flex-col">
        {/* Top: image + title + link icon */}
        <div className="flex gap-3 mb-3">
          {arena.image ? (
            <img src={arena.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[var(--card2)] border border-[var(--card-border)] shrink-0 flex items-center justify-center text-gray-500 text-lg">
              ?
            </div>
          )}
          <h3 className="text-sm font-bold text-[var(--primary)] group-hover:text-white transition-colors line-clamp-2 flex-1 leading-snug">
            {arena.title}
          </h3>
          <LinkIcon size={14} className="text-gray-500 shrink-0 mt-0.5" />
        </div>

        {/* Binary: progress bar + Yes/No buttons */}
        {isBinary && optA && optB && (
          <div className="flex-1 flex flex-col justify-end">
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-blue-400">{pctA}%</span>
              <div className="flex-1 flex h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 rounded-l-full transition-all" style={{ width: `${pctA}%` }} />
                <div className="bg-red-400 rounded-r-full transition-all" style={{ width: `${pctB}%` }} />
              </div>
              <span className="text-xs font-semibold text-red-400">{pctB}%</span>
            </div>

            {/* Yes / No buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={e => e.preventDefault()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1"
              >
                <span className="text-gray-400 text-xs">–</span> {optA.label}
              </button>
              <button
                onClick={e => e.preventDefault()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-red-400/30 bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors flex items-center justify-center gap-1"
              >
                <span className="text-gray-400 text-xs">–</span> {optB.label}
              </button>
            </div>
          </div>
        )}

        {/* Multi-option: list with YES/NO tags */}
        {isMulti && (
          <div className="flex-1 flex flex-col justify-end">
            <div className="space-y-2 mb-3">
              {arena.options.slice(0, 4).map(opt => (
                <div key={opt.id} className="flex items-center justify-between text-sm">
                  <span className="text-white truncate flex-1">{opt.label}</span>
                  <span className="text-gray-400 mx-2">—</span>
                  <div className="flex gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">YES</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-400/20 text-red-400">NO</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: $Liq + date */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[var(--card-border)]">
          <span className="font-semibold">{formatLiq(arena.totalPool, arena.currency)} Liq</span>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{formatEndDate(arena.endTime)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ArenaCard;
