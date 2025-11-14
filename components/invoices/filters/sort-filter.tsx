/**
 * Sort Filter Component
 *
 * Dropdown for selecting sort field and direction.
 * Combines sort_by and sort_order into single user-friendly options.
 */

'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';

export interface SortFilterProps {
  sortBy?: 'invoice_date' | 'due_date' | 'invoice_amount' | 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'invoice_date' | 'due_date' | 'invoice_amount' | 'status' | 'created_at' | undefined, sortOrder: 'asc' | 'desc') => void;
}

/**
 * Sort options combining field + direction into single values
 */
const SORT_OPTIONS = [
  { value: 'default', label: 'Priority (Default)', sortBy: undefined as undefined, sortOrder: 'desc' as const },
  { value: 'invoice_date_desc', label: 'Invoice Date: Newest First', sortBy: 'invoice_date' as const, sortOrder: 'desc' as const },
  { value: 'invoice_date_asc', label: 'Invoice Date: Oldest First', sortBy: 'invoice_date' as const, sortOrder: 'asc' as const },
  { value: 'due_date_asc', label: 'Due Date: Soonest First', sortBy: 'due_date' as const, sortOrder: 'asc' as const },
  { value: 'due_date_desc', label: 'Due Date: Latest First', sortBy: 'due_date' as const, sortOrder: 'desc' as const },
  { value: 'invoice_amount_desc', label: 'Amount: Highest First', sortBy: 'invoice_amount' as const, sortOrder: 'desc' as const },
  { value: 'invoice_amount_asc', label: 'Amount: Lowest First', sortBy: 'invoice_amount' as const, sortOrder: 'asc' as const },
  { value: 'status_asc', label: 'Status (A-Z)', sortBy: 'status' as const, sortOrder: 'asc' as const },
  { value: 'status_desc', label: 'Status (Z-A)', sortBy: 'status' as const, sortOrder: 'desc' as const },
  { value: 'created_at_desc', label: 'Created: Newest First', sortBy: 'created_at' as const, sortOrder: 'desc' as const },
  { value: 'created_at_asc', label: 'Created: Oldest First', sortBy: 'created_at' as const, sortOrder: 'asc' as const },
];

/**
 * Renders a select dropdown for sorting invoices.
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
export const SortFilter = React.memo(function SortFilter({
  sortBy,
  sortOrder,
  onSortChange,
}: SortFilterProps) {
  // Compute current combined value from sortBy + sortOrder
  const currentValue = React.useMemo(() => {
    if (!sortBy) {
      return 'default';
    }
    return `${sortBy}_${sortOrder}`;
  }, [sortBy, sortOrder]);

  // Handle select change
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedValue = event.target.value;
      const option = SORT_OPTIONS.find((opt) => opt.value === selectedValue);
      if (option) {
        onSortChange(option.sortBy, option.sortOrder);
      }
    },
    [onSortChange]
  );

  return (
    <Select
      value={currentValue}
      onChange={handleChange}
      className="w-[200px]"
      aria-label="Sort invoices by"
    >
      {SORT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
});
