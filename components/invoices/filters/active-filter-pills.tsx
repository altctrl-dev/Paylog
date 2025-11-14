/**
 * Active Filter Pills Component
 *
 * Displays active filters as removable pill badges.
 * Each pill shows a human-readable label and an X button to remove the filter.
 * Shows "Clear All" button when 2+ filters are active.
 * Hidden when no filters are active.
 */

'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFilterLabel } from '@/lib/utils/invoice-filters';
import type { InvoiceFilters } from '@/types/invoice';

export interface ActiveFilterPillsProps {
  filters: Partial<InvoiceFilters>;
  vendors?: Array<{ id: number; name: string }>;
  categories?: Array<{ id: number; name: string }>;
  onRemoveFilter: (key: string) => void;
  onClearAll: () => void;
}

/**
 * Renders active filter pills with remove buttons.
 * Automatically hidden when no active filters.
 */
export const ActiveFilterPills = React.memo(function ActiveFilterPills({
  filters,
  vendors = [],
  categories = [],
  onRemoveFilter,
  onClearAll,
}: ActiveFilterPillsProps) {
  // Build list of active filter pills (exclude pagination/default sort)
  const activeFilters = React.useMemo(() => {
    const pills: Array<{ key: string; label: string }> = [];

    // Search filter
    if (filters.search && filters.search.trim() !== '') {
      pills.push({
        key: 'search',
        label: formatFilterLabel('search', filters.search, { vendors, categories }),
      });
    }

    // Status filter
    if (filters.status) {
      pills.push({
        key: 'status',
        label: formatFilterLabel('status', filters.status, { vendors, categories }),
      });
    }

    // Vendor filter
    if (typeof filters.vendor_id === 'number') {
      pills.push({
        key: 'vendor_id',
        label: formatFilterLabel('vendor_id', filters.vendor_id, { vendors, categories }),
      });
    }

    // Category filter
    if (typeof filters.category_id === 'number') {
      pills.push({
        key: 'category_id',
        label: formatFilterLabel('category_id', filters.category_id, { vendors, categories }),
      });
    }

    // Date range filters (show both separately if set)
    if (filters.start_date) {
      pills.push({
        key: 'start_date',
        label: formatFilterLabel('start_date', filters.start_date, { vendors, categories }),
      });
    }
    if (filters.end_date) {
      pills.push({
        key: 'end_date',
        label: formatFilterLabel('end_date', filters.end_date, { vendors, categories }),
      });
    }

    // Sort filter (only if not default)
    if (filters.sort_by) {
      pills.push({
        key: 'sort_by',
        label: formatFilterLabel('sort_by', filters.sort_by, { vendors, categories }),
      });
    }

    return pills;
  }, [filters, vendors, categories]);

  // Hide if no active filters
  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="region"
      aria-label="Active filters"
    >
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="gap-1 pr-1"
        >
          <span className="text-xs">{filter.label}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={() => onRemoveFilter(filter.key)}
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {/* Show "Clear All" button when 2+ filters */}
      {activeFilters.length >= 2 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={onClearAll}
        >
          Clear All
        </Button>
      )}
    </div>
  );
});
