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
import type { InvoiceFilters } from '@/types/invoice';

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

    // Parse status param (string or array)
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statusValues = statusParam.split(',').filter(Boolean);
      // If single value, keep as string for backward compatibility
      // If multiple values, convert to array (future multi-select support)
      filters.status = statusValues.length === 1 ? statusValues[0] as any : statusValues as any;
    }

    // Parse vendor_id param (number or array)
    const vendorParam = searchParams.get('vendor_id');
    if (vendorParam) {
      const vendorValues = vendorParam
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n));
      // If single value, keep as number for backward compatibility
      // If multiple values, convert to array (future multi-select support)
      filters.vendor_id = vendorValues.length === 1 ? vendorValues[0] : vendorValues as any;
    }

    // Parse category_id param (number or array)
    const categoryParam = searchParams.get('category_id');
    if (categoryParam) {
      const categoryValues = categoryParam
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n));
      // If single value, keep as number for backward compatibility
      // If multiple values, convert to array (future multi-select support)
      filters.category_id = categoryValues.length === 1 ? categoryValues[0] : categoryValues as any;
    }

    // Parse profile_id param (number or array)
    const profileParam = searchParams.get('profile_id');
    if (profileParam) {
      const profileValues = profileParam
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n));
      // If single value, keep as number for backward compatibility
      // If multiple values, convert to array (future multi-select support)
      filters.profile_id = profileValues.length === 1 ? profileValues[0] : profileValues as any;
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

      // Add status param (handle both single and array)
      if (newFilters.status) {
        const statusValue = Array.isArray(newFilters.status)
          ? newFilters.status.join(',')
          : newFilters.status;
        params.set('status', statusValue);
      }

      // Add vendor_id param (handle both single and array)
      if (newFilters.vendor_id !== undefined) {
        const vendorValue = Array.isArray(newFilters.vendor_id)
          ? newFilters.vendor_id.join(',')
          : String(newFilters.vendor_id);
        params.set('vendor_id', vendorValue);
      }

      // Add category_id param (handle both single and array)
      if (newFilters.category_id !== undefined) {
        const categoryValue = Array.isArray(newFilters.category_id)
          ? newFilters.category_id.join(',')
          : String(newFilters.category_id);
        params.set('category_id', categoryValue);
      }

      // Add profile_id param (handle both single and array)
      if (newFilters.profile_id !== undefined) {
        const profileValue = Array.isArray(newFilters.profile_id)
          ? newFilters.profile_id.join(',')
          : String(newFilters.profile_id);
        params.set('profile_id', profileValue);
      }

      // Add page param
      if (newFilters.page) {
        params.set('page', String(newFilters.page));
      }

      // Add per_page param
      if (newFilters.per_page) {
        params.set('per_page', String(newFilters.per_page));
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

        // Remove filter if value is undefined or empty array
        if (
          value === undefined ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete newFilters[key];
        } else {
          newFilters[key] = value;
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
    [updateUrl, debounceTimeoutRef]
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
  }, [parseFiltersFromUrl]);

  // Update filters when searchParams change (direct URL change)
  useEffect(() => {
    setFilters(parseFiltersFromUrl());
  }, [parseFiltersFromUrl]);

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
