import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  fileType: string | null;
  dateRange: 'today' | 'week' | 'month' | 'all';
  tags: string[];
}

interface DocumentSearchProps {
  value: string;
  onChange: (value: string) => void;
  onFilterChange?: (filters: SearchFilters) => void;
}

const FILE_TYPE_OPTIONS = [
  { value: null, label: 'All Types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'image', label: 'Images' },
] as const;

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
] as const;

const AVAILABLE_TAGS = [
  'Contract',
  'Invoice',
  'Permit',
  'Blueprint',
  'Inspection',
  'Proposal',
  'Insurance',
  'Legal',
  'Financial',
  'Photo',
];

const DEFAULT_FILTERS: SearchFilters = {
  fileType: null,
  dateRange: 'all',
  tags: [],
};

export default function DocumentSearch({
  value,
  onChange,
  onFilterChange,
}: DocumentSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const updateFilters = useCallback(
    (patch: Partial<SearchFilters>) => {
      const next = { ...filters, ...patch };
      setFilters(next);
      onFilterChange?.(next);
    },
    [filters, onFilterChange],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      const next = filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag];
      updateFilters({ tags: next });
    },
    [filters.tags, updateFilters],
  );

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange?.(DEFAULT_FILTERS);
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.fileType !== null ||
    filters.dateRange !== 'all' ||
    filters.tags.length > 0;

  const activeFilterCount =
    (filters.fileType !== null ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0) +
    filters.tags.length;

  const getFileTypeLabel = (val: string | null): string => {
    return FILE_TYPE_OPTIONS.find((o) => o.value === val)?.label ?? 'All Types';
  };

  const getDateRangeLabel = (val: string): string => {
    return (
      DATE_RANGE_OPTIONS.find((o) => o.value === val)?.label ?? 'All Time'
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Search bar row */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search documents..."
            className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B3022]/20 focus:border-[#1B3022] transition-colors"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={cn(
              'relative inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              dropdownOpen || hasActiveFilters
                ? 'border-[#1B3022] bg-[#1B3022]/5 text-[#1B3022]'
                : 'border-border bg-white text-gray-600 hover:bg-gray-50',
            )}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-[#1B3022] px-1.5 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-border bg-white shadow-lg">
              <div className="p-4 space-y-5">
                {/* File type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    File Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FILE_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => updateFilters({ fileType: opt.value })}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          filters.fileType === opt.value
                            ? 'bg-[#1B3022] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Date Range
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DATE_RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          updateFilters({
                            dateRange: opt.value as SearchFilters['dateRange'],
                          })
                        }
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          filters.dateRange === opt.value
                            ? 'bg-[#1B3022] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          filters.tags.includes(tag)
                            ? 'bg-[#1B3022] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear all */}
                {hasActiveFilters && (
                  <div className="pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.fileType !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1B3022]/10 px-2.5 py-0.5 text-xs font-medium text-[#1B3022]">
              {getFileTypeLabel(filters.fileType)}
              <button
                type="button"
                onClick={() => updateFilters({ fileType: null })}
                className="rounded-full p-0.5 hover:bg-[#1B3022]/10"
                aria-label={`Remove ${getFileTypeLabel(filters.fileType)} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.dateRange !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1B3022]/10 px-2.5 py-0.5 text-xs font-medium text-[#1B3022]">
              {getDateRangeLabel(filters.dateRange)}
              <button
                type="button"
                onClick={() => updateFilters({ dateRange: 'all' })}
                className="rounded-full p-0.5 hover:bg-[#1B3022]/10"
                aria-label={`Remove ${getDateRangeLabel(filters.dateRange)} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#1B3022]/10 px-2.5 py-0.5 text-xs font-medium text-[#1B3022]"
            >
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="rounded-full p-0.5 hover:bg-[#1B3022]/10"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
