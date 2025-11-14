/**
 * Invoice Filter Utilities
 *
 * Helper functions for formatting filter labels, counting active filters,
 * and calculating date range presets.
 */

import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import type { InvoiceFilters } from '@/types/invoice';

interface FormatFilterOptions {
  vendors?: Array<{ id: number; name: string }>;
  categories?: Array<{ id: number; name: string }>;
}

/**
 * Format a filter key-value pair into a human-readable label
 * for display in active filter pills.
 *
 * @param key - The filter key (e.g., 'status', 'vendor_id')
 * @param value - The filter value
 * @param options - Optional lookup data for vendors and categories
 * @returns Human-readable label string
 */
export function formatFilterLabel(
  key: string,
  value: unknown,
  options: FormatFilterOptions = {}
): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }

  switch (key) {
    case 'search':
      return `Search: "${value}"`;

    case 'status':
      // Convert status enum to readable format
      return `Status: ${String(value).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`;

    case 'vendor_id':
      // Lookup vendor name if available
      if (options.vendors && typeof value === 'number') {
        const vendor = options.vendors.find((v) => v.id === value);
        return vendor ? `Vendor: ${vendor.name}` : `Vendor ID: ${value}`;
      }
      return `Vendor ID: ${value}`;

    case 'category_id':
      // Lookup category name if available
      if (options.categories && typeof value === 'number') {
        const category = options.categories.find((c) => c.id === value);
        return category ? `Category: ${category.name}` : `Category ID: ${value}`;
      }
      return `Category ID: ${value}`;

    case 'start_date':
      if (value instanceof Date) {
        return `From: ${format(value, 'MMM d, yyyy')}`;
      }
      return `From: ${value}`;

    case 'end_date':
      if (value instanceof Date) {
        return `To: ${format(value, 'MMM d, yyyy')}`;
      }
      return `To: ${value}`;

    case 'sort_by':
      if (value === '') return '';
      // Sort is handled differently (not shown as pill typically)
      return `Sort: ${String(value).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`;

    case 'sort_order':
      // Sort order is combined with sort_by
      return value === 'asc' ? 'Ascending' : 'Descending';

    default:
      return `${key}: ${value}`;
  }
}

/**
 * Count the number of active filters (excludes pagination and default sort).
 *
 * Active filters are those that differ from default state:
 * - search, status, vendor_id, category_id, start_date, end_date
 * - Excludes: page, per_page, sort_by (if ''), sort_order (if default 'desc')
 *
 * @param filters - Current filter state
 * @returns Number of active non-default filters
 */
export function getActiveFilterCount(filters: Partial<InvoiceFilters>): number {
  let count = 0;

  // Count search filter
  if (filters.search && filters.search.trim() !== '') {
    count++;
  }

  // Count status filter
  if (filters.status) {
    count++;
  }

  // Count vendor filter
  if (typeof filters.vendor_id === 'number') {
    count++;
  }

  // Count category filter
  if (typeof filters.category_id === 'number') {
    count++;
  }

  // Count date range filters (count as 1 if either is set)
  if (filters.start_date || filters.end_date) {
    count++;
  }

  // Count non-default sort (only if sort_by is set)
  if (filters.sort_by) {
    count++;
  }

  return count;
}

/**
 * Calculate date range for "This Month" preset.
 *
 * @returns Object with start and end Date objects
 */
export function getThisMonth(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

/**
 * Calculate date range for "Last Month" preset.
 *
 * @returns Object with start and end Date objects
 */
export function getLastMonth(): { start: Date; end: Date } {
  const lastMonth = subMonths(new Date(), 1);
  return {
    start: startOfMonth(lastMonth),
    end: endOfMonth(lastMonth),
  };
}

/**
 * Calculate date range for "This Year" preset.
 *
 * @returns Object with start and end Date objects
 */
export function getThisYear(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: startOfYear(now),
    end: endOfYear(now),
  };
}

/**
 * Calculate date range for "Last Year" preset.
 *
 * @returns Object with start and end Date objects
 */
export function getLastYear(): { start: Date; end: Date } {
  const lastYear = subYears(new Date(), 1);
  return {
    start: startOfYear(lastYear),
    end: endOfYear(lastYear),
  };
}
