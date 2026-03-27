import React from 'react';
import type { MarketCategory } from '@/data/markets';

export type SortOption = MarketCategory;

interface SortOptionsProps {
  onSort: (option: SortOption) => void;
  currentSort: SortOption;
}

const TABS: { key: SortOption; emoji: string; label: string }[] = [
  { key: 'trending', emoji: '🔥', label: 'Trending' },
  { key: 'sports',   emoji: '⚽', label: 'Sports'   },
  { key: 'crypto',   emoji: '₿',  label: 'Crypto'   },
  { key: 'trump',    emoji: '🇺🇸', label: 'Trump'    },
  { key: 'others',   emoji: '🌐', label: 'Others'   },
];

const SortOptions: React.FC<SortOptionsProps> = ({ onSort, currentSort }) => (
  <div className="flex items-end gap-0 border-b border-[var(--card-border)]">
    {TABS.map(({ key, emoji, label }) => {
      const isActive = key === currentSort;
      return (
        <button
          key={key}
          onClick={() => onSort(key)}
          className={`
            relative flex items-center gap-1.5 px-4 py-2.5
            text-sm font-extrabold tracking-wide
            transition-colors duration-200 whitespace-nowrap
            focus:outline-none
            ${isActive
              ? 'text-[var(--primary)]'
              : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)]/80'}
          `}
        >
          <span className="text-base leading-none">{emoji}</span>
          <span>{label}</span>

          {isActive && (
            <span
              className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
              style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent))' }}
            />
          )}
        </button>
      );
    })}
  </div>
);

export default SortOptions;
