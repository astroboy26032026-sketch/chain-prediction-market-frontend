// src/components/ui/SearchFilter.tsx
import React, { useEffect, useMemo, useState, forwardRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useDebounce } from 'use-debounce';

export type SearchFilterProps = {
  className?: string;
  placeholder?: string;
  debounceMs?: number;

  /** ✅ Controlled mode */
  value?: string;
  onChange?: (value: string) => void;

  /** ✅ Legacy mode (debounced callback) */
  onSearch?: (query: string) => void;
};

const SearchFilter = forwardRef<HTMLInputElement, SearchFilterProps>(
  (
    {
      className,
      placeholder = 'Search tokens...',
      debounceMs = 500,
      value,
      onChange,
      onSearch,
    },
    ref
  ) => {
    const isControlled = typeof value === 'string' && typeof onChange === 'function';

    const [inner, setInner] = useState<string>(value ?? '');
    const displayValue = isControlled ? (value as string) : inner;

    // keep inner in sync if parent changes value (even if not controlled)
    useEffect(() => {
      if (typeof value === 'string') setInner(value);
    }, [value]);

    const [debounced] = useDebounce(displayValue, debounceMs);

    // legacy: call onSearch with debounced value
    useEffect(() => {
      if (!onSearch) return;
      onSearch(debounced);
    }, [debounced, onSearch]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (isControlled) onChange!(v);
      else setInner(v);
    };

    return (
      <div className={['relative flex items-center max-w-md mx-auto mb-6', className].filter(Boolean).join(' ')}>
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          className="w-full py-2 pl-10 pr-4 text-sm bg-[var(--card)] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-colors duration-200"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>
    );
  }
);

SearchFilter.displayName = 'SearchFilter';
export default SearchFilter;
