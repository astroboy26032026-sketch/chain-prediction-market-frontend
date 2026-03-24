import React from 'react';

export type SortOption = 'trending' | 'marketcap' | 'new' | 'finalized';

interface SortOptionsProps {
  onSort: (option: SortOption) => void;
  currentSort: SortOption;
}

const TABS: { key: SortOption; emoji: string; label: string }[] = [
  { key: 'trending',  emoji: '🧭', label: 'DISCOVER'  },
  { key: 'new',       emoji: '✨', label: 'NEW'        },
  { key: 'finalized', emoji: '🎓', label: 'GRADUATED'  },
  { key: 'marketcap', emoji: '🔥', label: 'FAVORITES'  },
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

          {/* underline indicator */}
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
