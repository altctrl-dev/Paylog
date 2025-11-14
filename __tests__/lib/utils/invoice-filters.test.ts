/**
 * Invoice Filter Utilities Test Suite
 *
 * Tests for formatFilterLabel, getActiveFilterCount, and date preset functions.
 * Sprint 14, Phase 5: Testing & Validation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  formatFilterLabel,
  getActiveFilterCount,
  getThisMonth,
  getLastMonth,
  getThisYear,
  getLastYear,
} from '@/lib/utils/invoice-filters';
import { INVOICE_STATUS } from '@/types/invoice';
import type { InvoiceFilters } from '@/types/invoice';

describe('Invoice Filter Utilities', () => {
  // ==========================================================================
  // formatFilterLabel Tests
  // ==========================================================================
  describe('formatFilterLabel', () => {
    it('should format search filter label', () => {
      const label = formatFilterLabel('search', 'INV-001');
      expect(label).toBe('Search: "INV-001"');
    });

    it('should format status filter label with proper capitalization', () => {
      const label = formatFilterLabel('status', INVOICE_STATUS.PENDING_APPROVAL);
      expect(label).toBe('Status: Pending Approval');
    });

    it('should format status filter label for single-word status', () => {
      const label = formatFilterLabel('status', INVOICE_STATUS.PAID);
      expect(label).toBe('Status: Paid');
    });

    it('should format vendor filter label with name lookup', () => {
      const vendors = [
        { id: 1, name: 'Acme Corp' },
        { id: 2, name: 'XYZ Inc' },
      ];
      const label = formatFilterLabel('vendor_id', 1, { vendors });
      expect(label).toBe('Vendor: Acme Corp');
    });

    it('should fallback to vendor ID when name not found', () => {
      const vendors = [{ id: 1, name: 'Acme Corp' }];
      const label = formatFilterLabel('vendor_id', 999, { vendors });
      expect(label).toBe('Vendor ID: 999');
    });

    it('should fallback to vendor ID when vendors list is empty', () => {
      const label = formatFilterLabel('vendor_id', 123, { vendors: [] });
      expect(label).toBe('Vendor ID: 123');
    });

    it('should fallback to vendor ID when vendors option not provided', () => {
      const label = formatFilterLabel('vendor_id', 123);
      expect(label).toBe('Vendor ID: 123');
    });

    it('should format category filter label with name lookup', () => {
      const categories = [
        { id: 1, name: 'Utilities' },
        { id: 2, name: 'Office Supplies' },
      ];
      const label = formatFilterLabel('category_id', 1, { categories });
      expect(label).toBe('Category: Utilities');
    });

    it('should fallback to category ID when name not found', () => {
      const categories = [{ id: 1, name: 'Utilities' }];
      const label = formatFilterLabel('category_id', 999, { categories });
      expect(label).toBe('Category ID: 999');
    });

    it('should fallback to category ID when categories list is empty', () => {
      const label = formatFilterLabel('category_id', 123, { categories: [] });
      expect(label).toBe('Category ID: 123');
    });

    it('should fallback to category ID when categories option not provided', () => {
      const label = formatFilterLabel('category_id', 123);
      expect(label).toBe('Category ID: 123');
    });

    it('should format start_date filter label with Date object', () => {
      const date = new Date('2025-01-15');
      const label = formatFilterLabel('start_date', date);
      expect(label).toBe('From: Jan 15, 2025');
    });

    it('should format end_date filter label with Date object', () => {
      const date = new Date('2025-01-31');
      const label = formatFilterLabel('end_date', date);
      expect(label).toBe('To: Jan 31, 2025');
    });

    it('should format start_date filter label with string fallback', () => {
      const label = formatFilterLabel('start_date', '2025-01-15');
      expect(label).toBe('From: 2025-01-15');
    });

    it('should format end_date filter label with string fallback', () => {
      const label = formatFilterLabel('end_date', '2025-01-31');
      expect(label).toBe('To: 2025-01-31');
    });

    it('should format sort_by filter label with proper capitalization', () => {
      const label = formatFilterLabel('sort_by', 'invoice_date');
      expect(label).toBe('Sort: Invoice Date');
    });

    it('should return empty string for empty sort_by value', () => {
      const label = formatFilterLabel('sort_by', '');
      expect(label).toBe('');
    });

    it('should format sort_order filter label', () => {
      const ascLabel = formatFilterLabel('sort_order', 'asc');
      expect(ascLabel).toBe('Ascending');

      const descLabel = formatFilterLabel('sort_order', 'desc');
      expect(descLabel).toBe('Descending');
    });

    it('should return empty string for undefined value', () => {
      const label = formatFilterLabel('search', undefined);
      expect(label).toBe('');
    });

    it('should return empty string for null value', () => {
      const label = formatFilterLabel('search', null);
      expect(label).toBe('');
    });

    it('should return empty string for empty string value', () => {
      const label = formatFilterLabel('search', '');
      expect(label).toBe('');
    });

    it('should format unknown filter key with default fallback', () => {
      const label = formatFilterLabel('unknown_key', 'some_value');
      expect(label).toBe('unknown_key: some_value');
    });
  });

  // ==========================================================================
  // getActiveFilterCount Tests
  // ==========================================================================
  describe('getActiveFilterCount', () => {
    it('should return 0 for empty filters', () => {
      const count = getActiveFilterCount({});
      expect(count).toBe(0);
    });

    it('should count search filter', () => {
      const filters: Partial<InvoiceFilters> = {
        search: 'INV-001',
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should not count empty search string', () => {
      const filters: Partial<InvoiceFilters> = {
        search: '',
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(0);
    });

    it('should not count whitespace-only search string', () => {
      const filters: Partial<InvoiceFilters> = {
        search: '   ',
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(0);
    });

    it('should count status filter', () => {
      const filters: Partial<InvoiceFilters> = {
        status: INVOICE_STATUS.UNPAID,
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should count vendor_id filter', () => {
      const filters: Partial<InvoiceFilters> = {
        vendor_id: 123,
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should count category_id filter', () => {
      const filters: Partial<InvoiceFilters> = {
        category_id: 456,
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should count date range as 1 filter when both dates set', () => {
      const filters: Partial<InvoiceFilters> = {
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should count date range as 1 filter when only start_date set', () => {
      const filters: Partial<InvoiceFilters> = {
        start_date: new Date('2025-01-01'),
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should count date range as 1 filter when only end_date set', () => {
      const filters: Partial<InvoiceFilters> = {
        end_date: new Date('2025-01-31'),
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should count sort_by filter', () => {
      const filters: Partial<InvoiceFilters> = {
        sort_by: 'invoice_date',
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(1);
    });

    it('should ignore page filter', () => {
      const filters: Partial<InvoiceFilters> = {
        page: 3,
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(0);
    });

    it('should ignore per_page filter', () => {
      const filters: Partial<InvoiceFilters> = {
        per_page: 50,
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(0);
    });

    it('should count multiple active filters correctly', () => {
      const filters: Partial<InvoiceFilters> = {
        search: 'INV-001',
        status: INVOICE_STATUS.UNPAID,
        vendor_id: 123,
        category_id: 456,
        start_date: new Date('2025-01-01'),
        end_date: new Date('2025-01-31'),
        sort_by: 'invoice_date',
        page: 2, // Should be ignored
        per_page: 50, // Should be ignored
      };
      const count = getActiveFilterCount(filters);
      // search + status + vendor + category + date range (1) + sort = 6
      expect(count).toBe(6);
    });

    it('should handle filters with only pagination (no active filters)', () => {
      const filters: Partial<InvoiceFilters> = {
        page: 2,
        per_page: 20,
      };
      const count = getActiveFilterCount(filters);
      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // Date Preset Functions Tests
  // ==========================================================================
  describe('getThisMonth', () => {
    it('should return first and last day of current month', () => {
      const { start, end } = getThisMonth();

      // Check that start is first day of month at 00:00:00
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);

      // Check that end is last day of month at 23:59:59.999
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      expect(end.getDate()).toBe(lastDay.getDate());
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);

      // Check same month
      expect(start.getMonth()).toBe(end.getMonth());
      expect(start.getFullYear()).toBe(end.getFullYear());
    });

    it('should return Date objects (not strings)', () => {
      const { start, end } = getThisMonth();
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
    });

    it('should return valid dates', () => {
      const { start, end } = getThisMonth();
      expect(isNaN(start.getTime())).toBe(false);
      expect(isNaN(end.getTime())).toBe(false);
    });

    it('should have end date after start date', () => {
      const { start, end } = getThisMonth();
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });
  });

  describe('getLastMonth', () => {
    it('should return first and last day of previous month', () => {
      const { start, end } = getLastMonth();

      // Check that start is first day of month at 00:00:00
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);

      // Check that end is last day of month at 23:59:59.999
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      expect(end.getDate()).toBe(lastDay.getDate());
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);

      // Check same month (for last month)
      expect(start.getMonth()).toBe(end.getMonth());

      // Check that it's one month before current
      const now = new Date();
      const expectedMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      expect(start.getMonth()).toBe(expectedMonth);
    });

    it('should handle year boundary (January -> December)', () => {
      // Mock current date to January
      const mockNow = new Date('2025-01-15');
      const RealDate = Date;
      global.Date = jest.fn((...args) =>
        args.length ? new RealDate(...args) : mockNow
      ) as any;
      global.Date.now = RealDate.now;
      global.Date.UTC = RealDate.UTC;
      global.Date.parse = RealDate.parse;

      const { start, end } = getLastMonth();

      // Should be December of previous year
      expect(start.getMonth()).toBe(11); // December
      expect(start.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getFullYear()).toBe(2024);

      global.Date = RealDate;
    });

    it('should return Date objects', () => {
      const { start, end } = getLastMonth();
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
    });

    it('should have end date after start date', () => {
      const { start, end } = getLastMonth();
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });
  });

  describe('getThisYear', () => {
    it('should return first and last day of current year', () => {
      const { start, end } = getThisYear();

      // Check that start is January 1 at 00:00:00
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);

      // Check that end is December 31 at 23:59:59.999
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);

      // Check same year
      expect(start.getFullYear()).toBe(end.getFullYear());

      // Check current year
      const now = new Date();
      expect(start.getFullYear()).toBe(now.getFullYear());
    });

    it('should return Date objects', () => {
      const { start, end } = getThisYear();
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
    });

    it('should have end date after start date', () => {
      const { start, end } = getThisYear();
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });
  });

  describe('getLastYear', () => {
    it('should return first and last day of previous year', () => {
      const { start, end } = getLastYear();
      const now = new Date();
      const lastYear = now.getFullYear() - 1;

      // Check that start is January 1 of last year at 00:00:00
      expect(start.getFullYear()).toBe(lastYear);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);

      // Check that end is December 31 of last year at 23:59:59.999
      expect(end.getFullYear()).toBe(lastYear);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);

      // Check same year (last year)
      expect(start.getFullYear()).toBe(end.getFullYear());
    });

    it('should return Date objects', () => {
      const { start, end } = getLastYear();
      expect(start).toBeInstanceOf(Date);
      expect(end).toBeInstanceOf(Date);
    });

    it('should have end date after start date', () => {
      const { start, end } = getLastYear();
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });

    it('should be exactly one year before this year', () => {
      const thisYear = getThisYear();
      const lastYear = getLastYear();

      expect(lastYear.start.getFullYear()).toBe(thisYear.start.getFullYear() - 1);
      expect(lastYear.end.getFullYear()).toBe(thisYear.end.getFullYear() - 1);
    });
  });
});
