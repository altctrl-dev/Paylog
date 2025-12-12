/**
 * Sort Filter Component
 *
 * Dropdown for selecting sort field and direction.
 * Combines sort_by and sort_order into single user-friendly options.
 */

'use client';

import * as React from 'react';
import { Select } from '@/components/ui/select';

/** Sort field type - matches InvoiceFilters.sort_by */
export type SortByField = 'invoice_date' | 'due_date' | 'invoice_amount' | 'status' | 'created_at' | 'remaining_balance';

export interface SortFilterProps {
  sortBy?: SortByField;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: SortByField | undefined, sortOrder: 'asc' | 'desc') => void;
}

/**
 * Sort options combining field + direction into single values
 */
const SORT_OPTIONS: Array<{ value: string; label: string; sortBy: SortByField | undefined; sortOrder: 'asc' | 'desc' }> = [
  { value: 'default', label: 'Priority (Default)', sortBy: undefined, sortOrder: 'desc' },
  { value: 'invoice_date_desc', label: 'Invoice Date: Newest First', sortBy: 'invoice_date', sortOrder: 'desc' },
  { value: 'invoice_date_asc', label: 'Invoice Date: Oldest First', sortBy: 'invoice_date', sortOrder: 'asc' },
  { value: 'due_date_asc', label: 'Due Date: Soonest First', sortBy: 'due_date', sortOrder: 'asc' },
  { value: 'due_date_desc', label: 'Due Date: Latest First', sortBy: 'due_date', sortOrder: 'desc' },
  { value: 'invoice_amount_desc', label: 'Amount: Highest First', sortBy: 'invoice_amount', sortOrder: 'desc' },
  { value: 'invoice_amount_asc', label: 'Amount: Lowest First', sortBy: 'invoice_amount', sortOrder: 'asc' },
  { value: 'remaining_balance_desc', label: 'Remaining: Highest First', sortBy: 'remaining_balance', sortOrder: 'desc' },
  { value: 'remaining_balance_asc', label: 'Remaining: Lowest First', sortBy: 'remaining_balance', sortOrder: 'asc' },
  { value: 'status_asc', label: 'Status (A-Z)', sortBy: 'status', sortOrder: 'asc' },
  { value: 'status_desc', label: 'Status (Z-A)', sortBy: 'status', sortOrder: 'desc' },
  { value: 'created_at_desc', label: 'Created: Newest First', sortBy: 'created_at', sortOrder: 'desc' },
  { value: 'created_at_asc', label: 'Created: Oldest First', sortBy: 'created_at', sortOrder: 'asc' },
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
