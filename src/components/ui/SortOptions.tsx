import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

export type SortOption = 'trending' | 'marketcap' | 'new' | 'finalized';

interface SortOptionsProps {
  onSort: (option: SortOption) => void;
  currentSort: SortOption;
}

const SortOptions: React.FC<SortOptionsProps> = ({ onSort, currentSort }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const activeKey = currentSort;

  const setBtnRef = useCallback(
    (key: SortOption) => (node: HTMLButtonElement | null) => {
      btnRefs.current[key] = node;
    },
    []
  );

  const items = useMemo(
    () =>
      [
        { key: 'trending', label: 'Trending', onClick: () => onSort('trending') },
        { key: 'marketcap', label: 'Market Cap', onClick: () => onSort('marketcap') },
        { key: 'new', label: 'New', onClick: () => onSort('new') },
        { key: 'finalized', label: 'Finalized', onClick: () => onSort('finalized') },
      ] as const,
    [onSort]
  );

  const recalcIndicator = useCallback(() => {
    const el = btnRefs.current[activeKey];
    const wrap = containerRef.current;
    if (!el || !wrap) return;

    const elRect = el.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    setIndicator({ left: elRect.left - wrapRect.left, width: elRect.width });
  }, [activeKey]);

  useEffect(() => {
    recalcIndicator();
  }, [recalcIndicator, items.length]);

  useEffect(() => {
    window.addEventListener('resize', recalcIndicator);
    return () => window.removeEventListener('resize', recalcIndicator);
  }, [recalcIndicator]);

  return (
    <div
      ref={containerRef}
      className="
        relative inline-flex items-center
        px-1 py-1 rounded-full
        bg-[rgba(36,40,34,0.65)]/90
        backdrop-blur-md
        border border-[rgba(255,255,255,0.06)]
        shadow-[0_8px_24px_rgba(0,0,0,0.35)]
        select-none
      "
      role="tablist"
      aria-label="Sort options"
    >
      <span
        className="absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-out will-change-transform"
        style={{
          left: indicator.left,
          width: indicator.width,
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          boxShadow: '0 6px 18px rgba(201,142,107,0.35), inset 0 0 6px rgba(255,255,255,0.12)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-[1] flex gap-1">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              ref={setBtnRef(item.key)}
              onClick={item.onClick}
              role="tab"
              aria-selected={isActive}
              className={[
                'px-4 md:px-5 h-9 md:h-10 rounded-full font-semibold',
                'transition-colors duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/70',
                'text-sm md:text-[15px]',
                isActive ? 'text-white' : 'text-[rgba(243,239,234,0.82)] hover:text-[var(--primary)]',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <style jsx>{`
        div[role='tablist']:hover {
          box-shadow: 0 10px 28px rgba(201, 142, 107, 0.12), 0 8px 24px rgba(0, 0, 0, 0.35);
        }
      `}</style>
    </div>
  );
};

export default SortOptions;
