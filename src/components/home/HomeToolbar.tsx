// HomeToolbar: Category tabs + Search + Sort

import React from 'react';
import SortOptions, { SortOption } from '@/components/ui/SortOptions';
import SearchFilter from '@/components/ui/SearchFilter';

type SortBy = 'volume' | 'ending_soon' | 'newest';

interface HomeToolbarProps {
  sort: SortOption;
  onSort: (option: SortOption) => void;
  onSearch: (query: string) => void;
  sortBy?: SortBy;
  onSortByChange?: (v: SortBy) => void;
}

const HomeToolbar: React.FC<HomeToolbarProps> = ({ sort, onSort, onSearch, sortBy, onSortByChange }) => (
  <div className="mb-4">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <SortOptions onSort={onSort} currentSort={sort} />
      <div className="flex items-center gap-3 justify-center md:justify-end">
        <SearchFilter onSearch={onSearch} className="w-48 lg:w-56" />
        {onSortByChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortBy)}
              className="px-3 py-2 rounded-xl text-sm font-semibold bg-[var(--card)] border border-[var(--card-border)] text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="volume">Volume</option>
              <option value="ending_soon">Ending Soon</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default HomeToolbar;
