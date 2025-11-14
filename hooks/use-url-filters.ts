/**
 * useUrlFilters Hook
 *
 * Bidirectional synchronization between URL query parameters and filter state.
 *
 * Features:
 * - Parse comma-separated values: ?status=unpaid,overdue → ['unpaid', 'overdue']
 * - Backward compatibility: ?status=unpaid → ['unpaid']
 * - Update URL without page reload (Next.js router)
 * - Handle browser back/forward navigation (popstate events)
 * - Debounce rapid filter changes (100ms)
 * - Type-safe with InvoiceFilters interface
 *
 * URL Format:
 * - String arrays: ?status=unpaid,overdue,partial
 * - Number arrays: ?vendor_id=1,5,10
 * - Single values: ?page=2
 * - Empty (remove param): ?status= → remove param entirely
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { InvoiceFilters, InvoiceStatus } from '@/types/invoice';

/**
 * Format a date to YYYY-MM-DD in local timezone
 * Avoids toISOString() which converts to UTC
 */
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface UseUrlFiltersOptions {
  defaultFilters?: Partial<InvoiceFilters>;
}

export interface UseUrlFiltersReturn {
  filters: Partial<InvoiceFilters>;
  setFilter: <K extends keyof InvoiceFilters>(
    key: K,
    value: InvoiceFilters[K] | undefined
  ) => void;
  clearFilters: () => void;
}

/**
 * Hook to sync filters with URL query parameters
 *
 * @param options - Configuration options
 * @returns Filter state and setter functions
 *
 * @example
 * ```tsx
 * const { filters, setFilter, clearFilters } = useUrlFilters({
 *   defaultFilters: { page: 1, per_page: 20 }
 * });
 *
 * // Update single filter
 * setFilter('status', ['unpaid', 'overdue']);
 *
 * // Clear all filters
 * clearFilters();
 * ```
 */
export function useUrlFilters(
  options?: UseUrlFiltersOptions
): UseUrlFiltersReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { defaultFilters = {} } = options || {};

  // Parse filters from URL
  const parseFiltersFromUrl = useCallback((): Partial<InvoiceFilters> => {
    const filters: Partial<InvoiceFilters> = { ...defaultFilters };

    // Parse search param (string)
    const searchParam = searchParams.get('search');
    if (searchParam) {
      filters.search = searchParam;
    }

    // Parse status param (single value only)
    const statusParam = searchParams.get('status');
    if (statusParam) {
      filters.status = statusParam as InvoiceStatus;
    }

    // Parse vendor_id param (single number only)
    const vendorParam = searchParams.get('vendor_id');
    if (vendorParam) {
      const vendorId = parseInt(vendorParam, 10);
      if (!isNaN(vendorId)) {
        filters.vendor_id = vendorId;
      }
    }

    // Parse category_id param (single number only)
    const categoryParam = searchParams.get('category_id');
    if (categoryParam) {
      const categoryId = parseInt(categoryParam, 10);
      if (!isNaN(categoryId)) {
        filters.category_id = categoryId;
      }
    }

    // Parse profile_id param (single number only)
    const profileParam = searchParams.get('profile_id');
    if (profileParam) {
      const profileId = parseInt(profileParam, 10);
      if (!isNaN(profileId)) {
        filters.profile_id = profileId;
      }
    }

    // Parse page param (number)
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const pageNum = parseInt(pageParam, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        filters.page = pageNum;
      }
    }

    // Parse per_page param (number)
    const perPageParam = searchParams.get('per_page');
    if (perPageParam) {
      const perPageNum = parseInt(perPageParam, 10);
      if (!isNaN(perPageNum) && perPageNum > 0) {
        filters.per_page = perPageNum;
      }
    }

    // Parse start_date param (ISO date string → Date)
    const startDateParam = searchParams.get('start_date');
    if (startDateParam) {
      const date = new Date(startDateParam);
      if (!isNaN(date.getTime())) {
        filters.start_date = date;
      }
    }

    // Parse end_date param (ISO date string → Date)
    const endDateParam = searchParams.get('end_date');
    if (endDateParam) {
      const date = new Date(endDateParam);
      if (!isNaN(date.getTime())) {
        filters.end_date = date;
      }
    }

    // Parse sort_by param
    const sortByParam = searchParams.get('sort_by');
    if (sortByParam) {
      filters.sort_by = sortByParam as 'invoice_date' | 'due_date' | 'invoice_amount' | 'status' | 'created_at';
    }

    // Parse sort_order param (asc/desc)
    const sortOrderParam = searchParams.get('sort_order');
    if (sortOrderParam === 'asc' || sortOrderParam === 'desc') {
      filters.sort_order = sortOrderParam;
    }

    return filters;
  }, [searchParams, defaultFilters]);

  // State to hold current filters
  const [filters, setFilters] = useState<Partial<InvoiceFilters>>(() =>
    parseFiltersFromUrl()
  );

  // Debounce timeout ref
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update URL from filters
  const updateUrl = useCallback(
    (newFilters: Partial<InvoiceFilters>) => {
      const params = new URLSearchParams();

      // Add search param
      if (newFilters.search) {
        params.set('search', newFilters.search);
      }

      // Add status param (single value only)
      if (newFilters.status) {
        params.set('status', newFilters.status);
      }

      // Add vendor_id param (single number only)
      if (newFilters.vendor_id !== undefined) {
        params.set('vendor_id', String(newFilters.vendor_id));
      }

      // Add category_id param (single number only)
      if (newFilters.category_id !== undefined) {
        params.set('category_id', String(newFilters.category_id));
      }

      // Add profile_id param (single number only)
      if (newFilters.profile_id !== undefined) {
        params.set('profile_id', String(newFilters.profile_id));
      }

      // Add page param
      if (newFilters.page) {
        params.set('page', String(newFilters.page));
      }

      // Add per_page param
      if (newFilters.per_page) {
        params.set('per_page', String(newFilters.per_page));
      }

      // Add start_date param (Date → local date string YYYY-MM-DD)
      if (newFilters.start_date instanceof Date && !isNaN(newFilters.start_date.getTime())) {
        params.set('start_date', formatDateLocal(newFilters.start_date));
      }

      // Add end_date param (Date → local date string YYYY-MM-DD)
      if (newFilters.end_date instanceof Date && !isNaN(newFilters.end_date.getTime())) {
        params.set('end_date', formatDateLocal(newFilters.end_date));
      }

      // Add sort_by param
      if (newFilters.sort_by) {
        params.set('sort_by', newFilters.sort_by);
      }

      // Add sort_order param
      if (newFilters.sort_order) {
        params.set('sort_order', newFilters.sort_order);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `?${queryString}` : window.location.pathname;

      // Update URL without page reload
      router.replace(newUrl, { scroll: false });
    },
    [router]
  );

  // Set a single filter
  const setFilter = useCallback(
    <K extends keyof InvoiceFilters>(
      key: K,
      value: InvoiceFilters[K] | undefined
    ) => {
      setFilters((prev) => {
        const newFilters = { ...prev };

        // Remove filter if value is undefined
        if (value === undefined) {
          delete newFilters[key];
        } else {
          newFilters[key] = value;
        }

        // Reset page to 1 when non-pagination filters change
        if (key !== 'page' && key !== 'per_page') {
          newFilters.page = 1;
        }

        // Debounce URL update (100ms)
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          updateUrl(newFilters);
        }, 100);

        return newFilters;
      });
    },
    [updateUrl]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    updateUrl(defaultFilters);
  }, [defaultFilters, updateUrl]);

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setFilters(parseFiltersFromUrl());
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update filters when searchParams change (direct URL change)
  useEffect(() => {
    setFilters(parseFiltersFromUrl());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    filters,
    setFilter,
    clearFilters,
  };
}
