/**
 * Invoice Filter Integration Test Suite
 *
 * End-to-end tests for complete filter workflow including URL synchronization,
 * pagination reset, and browser navigation.
 * Sprint 14, Phase 5: Testing & Validation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { INVOICE_STATUS } from '@/types/invoice';
import type { InvoiceFilters } from '@/types/invoice';

// Mock Next.js router
const mockReplace = jest.fn();
const mockSearchParams = new Map<string, string>();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
    toString: () => {
      const params = new URLSearchParams();
      mockSearchParams.forEach((value, key) => params.set(key, value));
      return params.toString();
    },
  }),
}));

// Mock window.location and window.history for popstate tests
let mockLocation = {
  pathname: '/invoices',
  search: '',
};

describe('Invoice Filter Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.clear();
    mockLocation = {
      pathname: '/invoices',
      search: '',
    };

    // Mock window.location (delete and redefine to avoid "cannot redefine" error)
    delete (window as any).location;
    (window as any).location = mockLocation;
  });

  // ==========================================================================
  // Complete Filter Workflow Tests
  // ==========================================================================
  describe('Complete Filter Workflow', () => {
    it('should apply search filter and update URL', async () => {
      const { result } = renderHook(() => useUrlFilters());

      // Apply search filter
      act(() => {
        result.current.setFilter('search', 'INV-001');
      });

      // Verify local state updated immediately
      expect(result.current.filters.search).toBe('INV-001');

      // Verify URL update called after debounce (100ms)
      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
          const callArg = mockReplace.mock.calls[0][0];
          expect(callArg).toContain('search=INV-001');
        },
        { timeout: 200 }
      );
    });

    it('should apply status filter and update URL', async () => {
      const { result } = renderHook(() => useUrlFilters());

      act(() => {
        result.current.setFilter('status', INVOICE_STATUS.UNPAID);
      });

      expect(result.current.filters.status).toBe(INVOICE_STATUS.UNPAID);

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
          const callArg = mockReplace.mock.calls[0][0];
          expect(callArg).toContain('status=unpaid');
        },
        { timeout: 200 }
      );
    });

    it('should apply date range filter and update URL with ISO format', async () => {
      const { result } = renderHook(() => useUrlFilters());

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      act(() => {
        result.current.setFilter('start_date', startDate);
      });

      act(() => {
        result.current.setFilter('end_date', endDate);
      });

      expect(result.current.filters.start_date).toEqual(startDate);
      expect(result.current.filters.end_date).toEqual(endDate);

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
          const lastCallArg = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0];
          expect(lastCallArg).toContain('start_date=2025-01-01');
          expect(lastCallArg).toContain('end_date=2025-01-31');
        },
        { timeout: 200 }
      );
    });

    it('should apply multiple filters and update URL correctly', async () => {
      const { result } = renderHook(() => useUrlFilters());

      act(() => {
        result.current.setFilter('search', 'INV-001');
      });

      act(() => {
        result.current.setFilter('status', INVOICE_STATUS.UNPAID);
      });

      act(() => {
        result.current.setFilter('vendor_id', 123);
      });

      expect(result.current.filters.search).toBe('INV-001');
      expect(result.current.filters.status).toBe(INVOICE_STATUS.UNPAID);
      expect(result.current.filters.vendor_id).toBe(123);

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
          const lastCallArg = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0];
          expect(lastCallArg).toContain('search=INV-001');
          expect(lastCallArg).toContain('status=unpaid');
          expect(lastCallArg).toContain('vendor_id=123');
        },
        { timeout: 200 }
      );
    });

    it('should clear all filters and update URL to base path', async () => {
      // Set initial filters
      mockSearchParams.set('search', 'INV-001');
      mockSearchParams.set('status', 'unpaid');

      const { result } = renderHook(() => useUrlFilters());

      // Initial state should have filters from URL
      expect(result.current.filters.search).toBe('INV-001');
      expect(result.current.filters.status).toBe(INVOICE_STATUS.UNPAID);

      // Clear all filters
      act(() => {
        result.current.clearFilters();
      });

      // Verify local state cleared
      expect(result.current.filters.search).toBeUndefined();
      expect(result.current.filters.status).toBeUndefined();

      // Verify URL cleared
      expect(mockReplace).toHaveBeenCalledWith(
        window.location.pathname,
        expect.objectContaining({ scroll: false })
      );
    });
  });

  // ==========================================================================
  // Pagination Reset Tests
  // ==========================================================================
  describe('Pagination Reset', () => {
    it('should reset page to 1 when search filter changes', async () => {
      const { result } = renderHook(() =>
        useUrlFilters({ defaultFilters: { page: 3, per_page: 20 } })
      );

      // Verify initial page
      expect(result.current.filters.page).toBe(3);

      // Change search filter
      act(() => {
        result.current.setFilter('search', 'INV-001');
      });

      // Verify page reset to 1
      expect(result.current.filters.page).toBe(1);
    });

    it('should reset page to 1 when status filter changes', async () => {
      const { result } = renderHook(() =>
        useUrlFilters({ defaultFilters: { page: 5, per_page: 20 } })
      );

      act(() => {
        result.current.setFilter('status', INVOICE_STATUS.PAID);
      });

      expect(result.current.filters.page).toBe(1);
    });

    it('should reset page to 1 when vendor filter changes', async () => {
      const { result } = renderHook(() =>
        useUrlFilters({ defaultFilters: { page: 2, per_page: 20 } })
      );

      act(() => {
        result.current.setFilter('vendor_id', 123);
      });

      expect(result.current.filters.page).toBe(1);
    });

    it('should reset page to 1 when date range changes', async () => {
      const { result } = renderHook(() =>
        useUrlFilters({ defaultFilters: { page: 4, per_page: 20 } })
      );

      act(() => {
        result.current.setFilter('start_date', new Date('2025-01-01'));
      });

      expect(result.current.filters.page).toBe(1);
    });

    it('should NOT reset page when changing page itself', async () => {
      const { result } = renderHook(() =>
        useUrlFilters({ defaultFilters: { page: 1, per_page: 20 } })
      );

      act(() => {
        result.current.setFilter('page', 3);
      });

      expect(result.current.filters.page).toBe(3);
    });

    it('should NOT reset page when changing per_page', async () => {
      const { result } = renderHook(() =>
        useUrlFilters({ defaultFilters: { page: 2, per_page: 20 } })
      );

      act(() => {
        result.current.setFilter('per_page', 50);
      });

      expect(result.current.filters.page).toBe(2);
    });
  });

  // ==========================================================================
  // URL Synchronization Tests
  // ==========================================================================
  describe('URL Synchronization', () => {
    it('should parse filters from URL on mount', () => {
      mockSearchParams.set('search', 'INV-001');
      mockSearchParams.set('status', 'unpaid');
      mockSearchParams.set('vendor_id', '123');
      mockSearchParams.set('page', '2');

      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.search).toBe('INV-001');
      expect(result.current.filters.status).toBe(INVOICE_STATUS.UNPAID);
      expect(result.current.filters.vendor_id).toBe(123);
      expect(result.current.filters.page).toBe(2);
    });

    it('should parse date filters from URL on mount', () => {
      mockSearchParams.set('start_date', '2025-01-01');
      mockSearchParams.set('end_date', '2025-01-31');

      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.start_date).toEqual(new Date('2025-01-01'));
      expect(result.current.filters.end_date).toEqual(new Date('2025-01-31'));
    });

    it('should fallback to default filters when URL is empty', () => {
      const defaultFilters = {
        page: 1,
        per_page: 20,
        sort_order: 'desc' as const,
      };

      const { result } = renderHook(() => useUrlFilters({ defaultFilters }));

      expect(result.current.filters.page).toBe(1);
      expect(result.current.filters.per_page).toBe(20);
      expect(result.current.filters.sort_order).toBe('desc');
    });

    it('should handle invalid URL parameters gracefully', () => {
      mockSearchParams.set('page', 'invalid'); // Not a number
      mockSearchParams.set('vendor_id', 'abc'); // Not a number
      mockSearchParams.set('start_date', 'not-a-date'); // Invalid date

      const { result } = renderHook(() => useUrlFilters());

      // Invalid values should be ignored, not crash
      expect(result.current.filters.page).toBeUndefined();
      expect(result.current.filters.vendor_id).toBeUndefined();
      expect(result.current.filters.start_date).toBeUndefined();
    });

    it('should handle negative page numbers by ignoring them', () => {
      mockSearchParams.set('page', '-1');

      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.page).toBeUndefined();
    });

    it('should handle zero page number by ignoring it', () => {
      mockSearchParams.set('page', '0');

      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.page).toBeUndefined();
    });
  });

  // ==========================================================================
  // Browser Navigation Tests
  // ==========================================================================
  describe('Browser Navigation', () => {
    it('should update filters when popstate event fires (back button)', () => {
      const { result } = renderHook(() => useUrlFilters());

      // Initial state: no filters
      expect(result.current.filters.search).toBeUndefined();

      // Simulate browser back navigation (popstate event)
      mockSearchParams.set('search', 'INV-001');
      mockSearchParams.set('status', 'paid');

      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      // Filters should update from URL
      expect(result.current.filters.search).toBe('INV-001');
      expect(result.current.filters.status).toBe(INVOICE_STATUS.PAID);
    });

    it('should update filters when popstate event fires (forward button)', () => {
      mockSearchParams.set('search', 'INV-001');
      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.search).toBe('INV-001');

      // Simulate forward navigation
      mockSearchParams.delete('search');
      mockSearchParams.set('status', 'unpaid');

      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(result.current.filters.search).toBeUndefined();
      expect(result.current.filters.status).toBe(INVOICE_STATUS.UNPAID);
    });

    it('should clean up popstate listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useUrlFilters());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('popstate', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Debouncing Tests
  // ==========================================================================
  describe('Debouncing', () => {
    it('should debounce rapid filter changes (100ms)', async () => {
      const { result } = renderHook(() => useUrlFilters());

      // Rapid changes
      act(() => {
        result.current.setFilter('search', 'I');
      });

      act(() => {
        result.current.setFilter('search', 'IN');
      });

      act(() => {
        result.current.setFilter('search', 'INV');
      });

      act(() => {
        result.current.setFilter('search', 'INV-001');
      });

      // Should only call router.replace once with final value
      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalledTimes(1);
          const callArg = mockReplace.mock.calls[0][0];
          expect(callArg).toContain('search=INV-001');
        },
        { timeout: 200 }
      );
    });

    it('should debounce each filter key independently', async () => {
      const { result } = renderHook(() => useUrlFilters());

      // Change different filters
      act(() => {
        result.current.setFilter('search', 'INV-001');
      });

      act(() => {
        result.current.setFilter('status', INVOICE_STATUS.UNPAID);
      });

      act(() => {
        result.current.setFilter('vendor_id', 123);
      });

      // Each should trigger its own debounced update
      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
        },
        { timeout: 200 }
      );
    });

    it('should cleanup debounce timeout on unmount', () => {
      const { result, unmount } = renderHook(() => useUrlFilters());

      act(() => {
        result.current.setFilter('search', 'test');
      });

      // Unmount before debounce fires
      unmount();

      // Should not throw error
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('Edge Cases', () => {
    it('should handle removing a filter by passing undefined', async () => {
      mockSearchParams.set('search', 'INV-001');
      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.search).toBe('INV-001');

      act(() => {
        result.current.setFilter('search', undefined);
      });

      expect(result.current.filters.search).toBeUndefined();

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
          const callArg = mockReplace.mock.calls[0][0];
          expect(callArg).not.toContain('search=');
        },
        { timeout: 200 }
      );
    });

    it('should handle comma-separated values for future multi-select support', () => {
      mockSearchParams.set('status', 'unpaid,overdue');

      const { result } = renderHook(() => useUrlFilters());

      // Should parse as array (future multi-select)
      expect(result.current.filters.status).toEqual(['unpaid', 'overdue']);
    });

    it('should handle comma-separated vendor IDs', () => {
      mockSearchParams.set('vendor_id', '1,2,3');

      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.vendor_id).toEqual([1, 2, 3]);
    });

    it('should handle single value as non-array (backward compatibility)', () => {
      mockSearchParams.set('status', 'unpaid');

      const { result } = renderHook(() => useUrlFilters());

      // Single value should be string, not array
      expect(result.current.filters.status).toBe('unpaid');
      expect(Array.isArray(result.current.filters.status)).toBe(false);
    });

    it('should filter out invalid numbers in comma-separated lists', () => {
      mockSearchParams.set('vendor_id', '1,abc,3,xyz,5');

      const { result } = renderHook(() => useUrlFilters());

      expect(result.current.filters.vendor_id).toEqual([1, 3, 5]);
    });

    it('should handle empty comma-separated list', () => {
      mockSearchParams.set('status', ',,,');

      const { result } = renderHook(() => useUrlFilters());

      // Empty values should be filtered out
      expect(result.current.filters.status).toBeUndefined();
    });

    it('should preserve other URL params when updating filters', async () => {
      const { result } = renderHook(() => useUrlFilters({ defaultFilters: { page: 1 } }));

      act(() => {
        result.current.setFilter('search', 'INV-001');
      });

      await waitFor(
        () => {
          expect(mockReplace).toHaveBeenCalled();
          const callArg = mockReplace.mock.calls[0][0];
          // Should have both search and page params
          expect(callArg).toContain('search=INV-001');
          expect(callArg).toContain('page=1');
        },
        { timeout: 200 }
      );
    });
  });

  // ==========================================================================
  // Complete User Journey Test
  // ==========================================================================
  describe('Complete User Journey', () => {
    it('should handle a realistic user workflow', async () => {
      const { result } = renderHook(() =>
        useUrlFilters({ defaultFilters: { page: 1, per_page: 20 } })
      );

      // Step 1: User searches for an invoice
      act(() => {
        result.current.setFilter('search', 'INV-001');
      });

      expect(result.current.filters.search).toBe('INV-001');
      expect(result.current.filters.page).toBe(1); // Reset to page 1

      await waitFor(() => expect(mockReplace).toHaveBeenCalled(), { timeout: 200 });

      // Step 2: User adds status filter
      act(() => {
        result.current.setFilter('status', INVOICE_STATUS.UNPAID);
      });

      expect(result.current.filters.status).toBe(INVOICE_STATUS.UNPAID);
      expect(result.current.filters.page).toBe(1); // Still page 1

      await waitFor(() => expect(mockReplace.mock.calls.length).toBeGreaterThan(0), { timeout: 200 });

      // Step 3: User navigates to page 2
      act(() => {
        result.current.setFilter('page', 2);
      });

      expect(result.current.filters.page).toBe(2);

      await waitFor(() => expect(mockReplace.mock.calls.length).toBeGreaterThan(1), { timeout: 200 });

      // Step 4: User adds date range (should reset to page 1)
      act(() => {
        result.current.setFilter('start_date', new Date('2025-01-01'));
      });

      expect(result.current.filters.page).toBe(1); // Reset to page 1

      // Step 5: User clears all filters
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.search).toBeUndefined();
      expect(result.current.filters.status).toBeUndefined();
      expect(result.current.filters.start_date).toBeUndefined();
      expect(result.current.filters.page).toBe(1); // Default page
      expect(result.current.filters.per_page).toBe(20); // Default per_page preserved
    });
  });
});
