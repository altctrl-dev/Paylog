/**
 * Filter Bar Component
 *
 * Main filter interface for invoice list.
 * Combines all filter components into a compact, responsive layout.
 *
 * Features:
 * - Inline search input
 * - Inline status dropdown
 * - Date range picker
 * - Sort dropdown
 * - More filters popover (vendor, category)
 * - Active filter pills (removable)
 * - Result count display
 * - Debounced search (300ms)
 * - URL sync via parent state
 */

'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { INVOICE_STATUS } from '@/types/invoice';
import type { InvoiceFilters, InvoiceStatus } from '@/types/invoice';
import { getActiveFilterCount } from '@/lib/utils/invoice-filters';
import { ActiveFilterPills } from './active-filter-pills';
import { SortFilter } from './sort-filter';
import { DateRangeFilter } from './date-range-filter';
import { MoreFiltersPopover } from './more-filters-popover';

export interface FilterBarProps {
  filters: Partial<InvoiceFilters>;
  onFilterChange: <K extends keyof InvoiceFilters>(key: K, value: InvoiceFilters[K] | undefined) => void;
  onClearFilters: () => void;
  formOptions: {
    vendors: Array<{ id: number; name: string }>;
    categories: Array<{ id: number; name: string }>;
  };
  totalCount: number;
}

/**
 * Main filter bar component for invoice list.
 * Provides comprehensive filtering UI with URL synchronization.
 */
export function FilterBar({
  filters,
  onFilterChange,
  onClearFilters,
  formOptions,
  totalCount,
}: FilterBarProps) {
  // Local state for search input (debounced)
  const [searchInput, setSearchInput] = React.useState(filters.search || '');
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync search input with filters prop (for URL changes)
  React.useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Debounced search handler
  const handleSearchChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchInput(value);

      // Debounce the filter update (300ms)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        onFilterChange('search', value || undefined);
      }, 300);
    },
    [onFilterChange]
  );

  // Status change handler
  const handleStatusChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value as InvoiceStatus | '';
      onFilterChange('status', value || undefined);
    },
    [onFilterChange]
  );

  // Date range change handler
  const handleDateChange = React.useCallback(
    (start: Date | null, end: Date | null) => {
      onFilterChange('start_date', start || undefined);
      onFilterChange('end_date', end || undefined);
    },
    [onFilterChange]
  );

  // Sort change handler
  const handleSortChange = React.useCallback(
    (sortBy: 'invoice_date' | 'due_date' | 'invoice_amount' | 'status' | 'created_at' | undefined, sortOrder: 'asc' | 'desc') => {
      onFilterChange('sort_by', sortBy);
      onFilterChange('sort_order', sortOrder);
    },
    [onFilterChange]
  );

  // Vendor change handler
  const handleVendorChange = React.useCallback(
    (vendorId: number | '') => {
      onFilterChange('vendor_id', vendorId === '' ? undefined : vendorId);
    },
    [onFilterChange]
  );

  // Category change handler
  const handleCategoryChange = React.useCallback(
    (categoryId: number | '') => {
      onFilterChange('category_id', categoryId === '' ? undefined : categoryId);
    },
    [onFilterChange]
  );

  // Remove single filter handler
  const handleRemoveFilter = React.useCallback(
    (key: string) => {
      // Special handling for date filters (remove both)
      if (key === 'start_date' || key === 'end_date') {
        onFilterChange('start_date', undefined);
        onFilterChange('end_date', undefined);
      } else {
        onFilterChange(key as keyof InvoiceFilters, undefined);
      }
    },
    [onFilterChange]
  );

  // Check if there are active filters (for conditional rendering)
  const hasActiveFilters = React.useMemo(() => {
    return getActiveFilterCount(filters) > 0;
  }, [filters]);

  // Cleanup debounce timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4" role="search" aria-label="Invoice filters">
      {/* Top row: Filter controls */}
      <div className="flex flex-wrap gap-2">
        {/* Search input (inline) */}
        <div className="flex-1 min-w-[200px]">
          <Input
            type="search"
            placeholder="Search invoices..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full"
            aria-label="Search invoices"
          />
        </div>

        {/* Status dropdown (inline) */}
        <div className="w-[160px]">
          <Select
            value={filters.status || ''}
            onChange={handleStatusChange}
            aria-label="Filter by status"
            className="w-full"
          >
            <option value="">All Statuses</option>
            {Object.values(INVOICE_STATUS).map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </Select>
        </div>

        {/* Date range filter */}
        <DateRangeFilter
          startDate={filters.start_date || null}
          endDate={filters.end_date || null}
          onDateChange={handleDateChange}
        />

        {/* Sort filter */}
        <SortFilter
          sortBy={filters.sort_by}
          sortOrder={filters.sort_order || 'desc'}
          onSortChange={handleSortChange}
        />

        {/* More filters popover */}
        <MoreFiltersPopover
          vendorId={filters.vendor_id || ''}
          categoryId={filters.category_id || ''}
          vendors={formOptions.vendors || []}
          categories={formOptions.categories || []}
          onVendorChange={handleVendorChange}
          onCategoryChange={handleCategoryChange}
        />
      </div>

      {/* Bottom row: Active filter pills (conditional) */}
      {hasActiveFilters && (
        <ActiveFilterPills
          filters={filters}
          vendors={formOptions.vendors || []}
          categories={formOptions.categories || []}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={onClearFilters}
        />
      )}

      {/* Result count */}
      <p className="text-sm text-muted-foreground">
        Showing {totalCount} {totalCount === 1 ? 'invoice' : 'invoices'}
      </p>
    </div>
  );
}
