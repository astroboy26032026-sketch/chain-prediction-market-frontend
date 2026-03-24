// HomeToolbar: Sort options, NSFW toggle, Live toggle, Filter button + dropdown

import React, { useState } from 'react';
import SortOptions, { SortOption } from '@/components/ui/SortOptions';
import { Switch } from '@/components/ui/switch';
import FilterPanel, { PendingFilter } from './FilterPanel';
import { FILTER_DEFAULTS, ActiveFilter } from '@/utils/filterHelpers';
import SearchFilter from '@/components/ui/SearchFilter';

interface HomeToolbarProps {
  sort: SortOption;
  includeNsfw: boolean;
  activeFilter: ActiveFilter | null;
  onSort: (option: SortOption) => void;
  onToggleNsfw: () => void;
  onApplyFilter: (filter: ActiveFilter) => void;
  onClearFilter: () => void;
  onSearch: (query: string) => void;
}

const HomeToolbar: React.FC<HomeToolbarProps> = ({
  sort, includeNsfw, activeFilter,
  onSort, onToggleNsfw, onApplyFilter, onClearFilter, onSearch,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pending, setPending] = useState<PendingFilter>({
    mcapMin: FILTER_DEFAULTS.mcapMin,
    mcapMax: FILTER_DEFAULTS.mcapMax,
    volMin: FILTER_DEFAULTS.volMin,
    volMax: FILTER_DEFAULTS.volMax,
    mcapMinText: '',
    mcapMaxText: '',
    volMinText: '',
    volMaxText: '',
  });

  const handleApply = () => {
    onApplyFilter({
      mcapMin: pending.mcapMin,
      mcapMax: pending.mcapMax,
      volMin: pending.volMin,
      volMax: pending.volMax,
    });
    setIsFilterOpen(false);
  };

  const handleClear = () => {
    setPending({
      mcapMin: FILTER_DEFAULTS.mcapMin,
      mcapMax: FILTER_DEFAULTS.mcapMax,
      volMin: FILTER_DEFAULTS.volMin,
      volMax: FILTER_DEFAULTS.volMax,
      mcapMinText: '',
      mcapMaxText: '',
      volMinText: '',
      volMaxText: '',
    });
    onClearFilter();
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <SortOptions onSort={onSort} currentSort={sort} />

        <div className="flex items-center gap-3 justify-center md:justify-end relative flex-wrap">
          {/* Search bar — same row as tabs */}
          <SearchFilter onSearch={onSearch} className="w-48 lg:w-56" />
            {/* NSFW toggle */}
            <div className="flex items-center gap-2 ml-1">
              <span className="text-sm">NSFW</span>
              <Switch
                checked={includeNsfw}
                onCheckedChange={onToggleNsfw}
                className={`${
                  includeNsfw ? 'bg-[var(--primary)]' : 'bg-[var(--card-border)]'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
              >
                <span
                  className={`${
                    includeNsfw ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setIsFilterOpen((v) => !v)}
              className={`px-3 py-2 rounded-md border border-[var(--card-border)] bg-[var(--card)] hover:shadow inline-flex items-center gap-2 text-sm ${
                activeFilter ? 'ring-1 ring-[var(--primary)]' : ''
              }`}
              aria-expanded={isFilterOpen}
            >
              Filter
              <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-80">
                <path fill="currentColor" d="M3 5h18l-7 8v6l-4-2v-4z" />
              </svg>
            </button>

            {isFilterOpen && (
              <FilterPanel
                pending={pending}
                setPending={setPending}
                onApply={handleApply}
                onClear={handleClear}
              />
            )}
        </div>
      </div>
    </div>
  );
};

export default HomeToolbar;
