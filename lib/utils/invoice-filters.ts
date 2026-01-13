/**
 * Invoice Filter Utilities
 *
 * Helper functions for formatting filter labels, counting active filters,
 * and calculating date range presets.
 */

import { format } from 'date-fns';
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
 * Uses local timezone to avoid off-by-one display issues.
 *
 * @returns Object with start and end Date objects
 */
export function getThisMonth(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

/**
 * Calculate date range for "Last Month" preset.
 * Uses local timezone to avoid off-by-one display issues.
 *
 * @returns Object with start and end Date objects
 */
export function getLastMonth(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

/**
 * Calculate date range for "This Year" preset.
 * Uses local timezone to avoid off-by-one display issues.
 *
 * @returns Object with start and end Date objects
 */
export function getThisYear(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear();
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

/**
 * Calculate date range for "Last Year" preset.
 * Uses local timezone to avoid off-by-one display issues.
 *
 * @returns Object with start and end Date objects
 */
export function getLastYear(): { start: Date; end: Date } {
  const now = new Date();
  const year = now.getFullYear() - 1;
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

/**
 * Calculate date range for "This Financial Year" preset.
 * Financial Year in India: April 1 - March 31
 * Uses local timezone to avoid off-by-one display issues.
 *
 * @returns Object with start and end Date objects and label
 */
export function getThisFinancialYear(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  // If Jan-Mar (0-2), FY started previous year
  // If Apr-Dec (3-11), FY started this year
  const fyStartYear = month < 3 ? year - 1 : year;
  const fyEndYear = fyStartYear + 1;

  return {
    start: new Date(fyStartYear, 3, 1, 0, 0, 0, 0), // April 1
    end: new Date(fyEndYear, 2, 31, 23, 59, 59, 999), // March 31
    label: `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`, // "FY 2025-26"
  };
}

/**
 * Calculate date range for "Last Financial Year" preset.
 * Financial Year in India: April 1 - March 31
 * Uses local timezone to avoid off-by-one display issues.
 *
 * @returns Object with start and end Date objects and label
 */
export function getLastFinancialYear(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();

  // Calculate current FY start year first
  const currentFyStartYear = month < 3 ? year - 1 : year;
  // Last FY is one year before current FY
  const fyStartYear = currentFyStartYear - 1;
  const fyEndYear = fyStartYear + 1;

  return {
    start: new Date(fyStartYear, 3, 1, 0, 0, 0, 0), // April 1
    end: new Date(fyEndYear, 2, 31, 23, 59, 59, 999), // March 31
    label: `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`, // "FY 2024-25"
  };
}

/**
 * Get date range for a specific month/year
 *
 * @param month - Month (0-11)
 * @param year - Year
 * @returns Object with start and end Date objects
 */
export function getMonthRange(month: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999), // Last day of month
  };
}

/**
 * Format a period for display
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Human-readable period label
 */
export function formatPeriodLabel(startDate: Date, endDate: Date): string {
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Same month and year
  if (startMonth === endMonth && startYear === endYear) {
    return `${monthNames[startMonth]} ${startYear}`;
  }

  // Same year
  if (startYear === endYear) {
    return `${monthNames[startMonth]} - ${monthNames[endMonth]} ${startYear}`;
  }

  // Different years
  return `${monthNames[startMonth]} ${startYear} - ${monthNames[endMonth]} ${endYear}`;
}
