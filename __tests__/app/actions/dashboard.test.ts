/**
 * Dashboard Server Actions Test Suite
 *
 * Comprehensive tests for all 6 server actions with RBAC, date filtering,
 * and error handling coverage.
 *
 * Sprint 12, Phase 4: Testing (2 SP)
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  getDashboardKPIs,
  getInvoiceStatusBreakdown,
  getPaymentTrends,
  getTopVendorsBySpending,
  getMonthlyInvoiceVolume,
  getRecentActivity,
} from '@/app/actions/dashboard';
import { auth, isAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { DATE_RANGE } from '@/types/dashboard';
import { INVOICE_STATUS } from '@/types/invoice';
import { PAYMENT_STATUS } from '@/types/payment';
import {
  mockSessions,
  mockInvoices,
  mockPayments,
  mockVendors,
  mockActivityLogs,
} from '../../fixtures/dashboard-fixtures';

// Mock modules
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
  isAdmin: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  db: {
    invoice: {
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    vendor: {
      findMany: jest.fn(),
    },
    activityLog: {
      findMany: jest.fn(),
    },
  },
}));
jest.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn, // Pass-through for testing
  revalidatePath: jest.fn(),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockIsAdmin = isAdmin as jest.MockedFunction<typeof isAdmin>;
const mockDb = db as any;

describe('Dashboard Server Actions', () => {
  // Fixed date for consistent testing
  const fixedDate = new Date('2024-10-30T12:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ==========================================================================
  // getDashboardKPIs Tests
  // ==========================================================================
  describe('getDashboardKPIs', () => {
    it('should return correct KPIs for standard users (only their invoices)', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      // Mock count queries
      mockDb.invoice.count
        .mockResolvedValueOnce(10) // total invoices
        .mockResolvedValueOnce(2) // pending approvals
        .mockResolvedValueOnce(3) // overdue
        .mockResolvedValueOnce(1); // on hold

      // Mock aggregate queries
      mockDb.invoice.aggregate.mockResolvedValueOnce({
        _sum: { invoice_amount: 5000 }, // unpaid
      });

      mockDb.payment.aggregate.mockResolvedValueOnce({
        _sum: { amount_paid: 2000 }, // paid this month
      });

      const result = await getDashboardKPIs(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.totalInvoices).toBe(10);
      expect(result.data.pendingApprovals).toBe(2);
      expect(result.data.totalUnpaid).toBe(5000);
      expect(result.data.totalPaidCurrentMonth).toBe(2000);
      expect(result.data.overdueInvoices).toBe(3);
      expect(result.data.onHoldInvoices).toBe(1);

      // Verify RBAC filter was applied (created_by = 1)
      expect(mockDb.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_by: 1,
            is_hidden: false,
          }),
        })
      );
    });

    it('should return correct KPIs for admins (all invoices, no RBAC filter)', async () => {
      mockAuth.mockResolvedValue(mockSessions.admin as any);
      mockIsAdmin.mockResolvedValue(true);

      mockDb.invoice.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(8) // pending
        .mockResolvedValueOnce(5) // overdue
        .mockResolvedValueOnce(2); // on hold

      mockDb.invoice.aggregate.mockResolvedValueOnce({
        _sum: { invoice_amount: 25000 },
      });

      mockDb.payment.aggregate.mockResolvedValueOnce({
        _sum: { amount_paid: 10000 },
      });

      const result = await getDashboardKPIs(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.totalInvoices).toBe(50);
      expect(result.data.pendingApprovals).toBe(8);

      // Verify NO created_by filter for admins
      expect(mockDb.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            created_by: expect.anything(),
          }),
        })
      );
    });

    it('should filter by date range correctly (1 month)', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.count.mockResolvedValue(5);
      mockDb.invoice.aggregate.mockResolvedValue({ _sum: { invoice_amount: 0 } });
      mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount_paid: 0 } });

      await getDashboardKPIs(DATE_RANGE.ONE_MONTH);

      // Verify date filter is applied (30 days ago)
      const expectedDate = new Date(fixedDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      expect(mockDb.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice_date: {
              gte: expectedDate,
            },
          }),
        })
      );
    });

    it('should filter by date range correctly (3 months)', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.count.mockResolvedValue(5);
      mockDb.invoice.aggregate.mockResolvedValue({ _sum: { invoice_amount: 0 } });
      mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount_paid: 0 } });

      await getDashboardKPIs(DATE_RANGE.THREE_MONTHS);

      const expectedDate = new Date(fixedDate.getTime() - 90 * 24 * 60 * 60 * 1000);

      expect(mockDb.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice_date: {
              gte: expectedDate,
            },
          }),
        })
      );
    });

    it('should not filter by date for ALL_TIME range', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.count.mockResolvedValue(5);
      mockDb.invoice.aggregate.mockResolvedValue({ _sum: { invoice_amount: 0 } });
      mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount_paid: 0 } });

      await getDashboardKPIs(DATE_RANGE.ALL_TIME);

      // Verify NO invoice_date filter
      expect(mockDb.invoice.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            invoice_date: expect.anything(),
          }),
        })
      );
    });

    it('should return 0 values when no invoices exist', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.count.mockResolvedValue(0);
      mockDb.invoice.aggregate.mockResolvedValue({ _sum: { invoice_amount: null } });
      mockDb.payment.aggregate.mockResolvedValue({ _sum: { amount_paid: null } });

      const result = await getDashboardKPIs(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.totalInvoices).toBe(0);
      expect(result.data.pendingApprovals).toBe(0);
      expect(result.data.totalUnpaid).toBe(0);
      expect(result.data.totalPaidCurrentMonth).toBe(0);
      expect(result.data.overdueInvoices).toBe(0);
      expect(result.data.onHoldInvoices).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.count.mockRejectedValue(new Error('Database connection failed'));

      const result = await getDashboardKPIs(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Database connection failed');
    });

    it('should handle unauthorized users', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await getDashboardKPIs(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(false);
      if (result.success) return;

      expect(result.error).toContain('Unauthorized');
    });
  });

  // ==========================================================================
  // getInvoiceStatusBreakdown Tests
  // ==========================================================================
  describe('getInvoiceStatusBreakdown', () => {
    it('should return correct status breakdown data', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.groupBy.mockResolvedValue([
        {
          status: INVOICE_STATUS.PAID,
          _count: { id: 50 },
          _sum: { invoice_amount: 75000 },
        },
        {
          status: INVOICE_STATUS.UNPAID,
          _count: { id: 20 },
          _sum: { invoice_amount: 30000 },
        },
        {
          status: INVOICE_STATUS.PENDING_APPROVAL,
          _count: { id: 5 },
          _sum: { invoice_amount: 8000 },
        },
      ]);

      const result = await getInvoiceStatusBreakdown(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(3);
      expect(result.data[0]).toEqual({
        status: INVOICE_STATUS.PAID,
        count: 50,
        value: 75000,
      });
      expect(result.data[1]).toEqual({
        status: INVOICE_STATUS.UNPAID,
        count: 20,
        value: 30000,
      });
    });

    it('should apply RBAC filtering for standard users', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.groupBy.mockResolvedValue([]);

      await getInvoiceStatusBreakdown(DATE_RANGE.SIX_MONTHS);

      expect(mockDb.invoice.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_by: 1,
          }),
        })
      );
    });

    it('should handle empty result set', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.groupBy.mockResolvedValue([]);

      const result = await getInvoiceStatusBreakdown(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toEqual([]);
    });

    it('should handle null amounts in breakdown', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.groupBy.mockResolvedValue([
        {
          status: INVOICE_STATUS.PAID,
          _count: { id: 10 },
          _sum: { invoice_amount: null }, // null amount
        },
      ]);

      const result = await getInvoiceStatusBreakdown(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data[0].value).toBe(0);
    });
  });

  // ==========================================================================
  // getPaymentTrends Tests
  // ==========================================================================
  describe('getPaymentTrends', () => {
    it('should group payments by month correctly', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.payment.findMany.mockResolvedValue([
        {
          payment_date: new Date('2024-08-15'),
          amount_paid: 1000,
        },
        {
          payment_date: new Date('2024-08-20'),
          amount_paid: 1500,
        },
        {
          payment_date: new Date('2024-09-10'),
          amount_paid: 2000,
        },
        {
          payment_date: new Date('2024-09-25'),
          amount_paid: 2500,
        },
      ]);

      const result = await getPaymentTrends(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        date: '2024-08',
        amount: 2500, // 1000 + 1500
        count: 2,
      });
      expect(result.data[1]).toEqual({
        date: '2024-09',
        amount: 4500, // 2000 + 2500
        count: 2,
      });
    });

    it('should return data in ascending date order', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.payment.findMany.mockResolvedValue([
        { payment_date: new Date('2024-10-10'), amount_paid: 1000 },
        { payment_date: new Date('2024-08-10'), amount_paid: 1000 },
        { payment_date: new Date('2024-09-10'), amount_paid: 1000 },
      ]);

      const result = await getPaymentTrends(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.map((d) => d.date)).toEqual(['2024-08', '2024-09', '2024-10']);
    });

    it('should apply date range filter', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.payment.findMany.mockResolvedValue([]);

      await getPaymentTrends(DATE_RANGE.ONE_MONTH);

      const expectedDate = new Date(fixedDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      expect(mockDb.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            payment_date: {
              gte: expectedDate,
            },
          }),
        })
      );
    });

    it('should apply RBAC filtering through invoice relation', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.payment.findMany.mockResolvedValue([]);

      await getPaymentTrends(DATE_RANGE.SIX_MONTHS);

      expect(mockDb.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: {
              created_by: 1,
              is_hidden: false,
            },
          }),
        })
      );
    });

    it('should handle months with no payments', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.payment.findMany.mockResolvedValue([]);

      const result = await getPaymentTrends(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toEqual([]);
    });
  });

  // ==========================================================================
  // getTopVendorsBySpending Tests
  // ==========================================================================
  describe('getTopVendorsBySpending', () => {
    it('should return top 10 vendors sorted by total amount', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      // Mock 12 vendors - groupBy will return only top 10 due to take: 10
      const vendorSpending = Array.from({ length: 10 }, (_, i) => ({
        vendor_id: i + 1,
        _sum: { invoice_amount: 10000 - i * 500 },
        _count: { id: 10 - i },
      }));

      mockDb.invoice.groupBy.mockResolvedValue(vendorSpending);

      const vendorData = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Vendor ${i + 1}`,
      }));

      mockDb.vendor.findMany.mockResolvedValue(vendorData);

      const result = await getTopVendorsBySpending(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Should return exactly 10
      expect(result.data).toHaveLength(10);

      // Should be sorted by amount descending
      expect(result.data[0].total_amount).toBeGreaterThan(result.data[9].total_amount);

      // Verify take: 10 was used in the query
      expect(mockDb.invoice.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should include invoice count per vendor', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.groupBy.mockResolvedValue([
        {
          vendor_id: 1,
          _sum: { invoice_amount: 50000 },
          _count: { id: 25 },
        },
      ]);

      mockDb.vendor.findMany.mockResolvedValue([
        { id: 1, name: 'Test Vendor' },
      ]);

      const result = await getTopVendorsBySpending(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data[0].invoice_count).toBe(25);
    });

    it('should handle edge case with fewer than 10 vendors', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.groupBy.mockResolvedValue([
        {
          vendor_id: 1,
          _sum: { invoice_amount: 5000 },
          _count: { id: 5 },
        },
        {
          vendor_id: 2,
          _sum: { invoice_amount: 3000 },
          _count: { id: 3 },
        },
      ]);

      mockDb.vendor.findMany.mockResolvedValue([
        { id: 1, name: 'Vendor A' },
        { id: 2, name: 'Vendor B' },
      ]);

      const result = await getTopVendorsBySpending(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(2);
    });

    it('should handle unknown vendor (vendor deleted)', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.groupBy.mockResolvedValue([
        {
          vendor_id: 999, // Non-existent vendor
          _sum: { invoice_amount: 5000 },
          _count: { id: 5 },
        },
      ]);

      mockDb.vendor.findMany.mockResolvedValue([]); // Vendor not found

      const result = await getTopVendorsBySpending(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data[0].vendor_name).toBe('Unknown Vendor');
    });
  });

  // ==========================================================================
  // getMonthlyInvoiceVolume Tests
  // ==========================================================================
  describe('getMonthlyInvoiceVolume', () => {
    it('should group invoices by month correctly', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.findMany.mockResolvedValue([
        { invoice_date: new Date('2024-08-05') },
        { invoice_date: new Date('2024-08-15') },
        { invoice_date: new Date('2024-08-25') },
        { invoice_date: new Date('2024-09-10') },
        { invoice_date: new Date('2024-09-20') },
      ]);

      const result = await getMonthlyInvoiceVolume(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        date: '2024-08',
        count: 3,
      });
      expect(result.data[1]).toEqual({
        date: '2024-09',
        count: 2,
      });
    });

    it('should return data in ascending date order', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.findMany.mockResolvedValue([
        { invoice_date: new Date('2024-10-01') },
        { invoice_date: new Date('2024-08-01') },
        { invoice_date: new Date('2024-09-01') },
      ]);

      const result = await getMonthlyInvoiceVolume(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data.map((d) => d.date)).toEqual(['2024-08', '2024-09', '2024-10']);
    });

    it('should apply date range filter', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.findMany.mockResolvedValue([]);

      await getMonthlyInvoiceVolume(DATE_RANGE.THREE_MONTHS);

      const expectedDate = new Date(fixedDate.getTime() - 90 * 24 * 60 * 60 * 1000);

      expect(mockDb.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice_date: {
              gte: expectedDate,
            },
          }),
        })
      );
    });

    it('should handle invoices with null invoice_date', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.invoice.findMany.mockResolvedValue([
        { invoice_date: new Date('2024-08-01') },
        { invoice_date: null }, // Should be ignored
        { invoice_date: new Date('2024-08-02') },
      ]);

      const result = await getMonthlyInvoiceVolume(DATE_RANGE.SIX_MONTHS);

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data).toHaveLength(1);
      expect(result.data[0].count).toBe(2); // null date ignored
    });
  });

  // ==========================================================================
  // getRecentActivity Tests
  // ==========================================================================
  describe('getRecentActivity', () => {
    it('should return last 10 activities only', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      const activities = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        action: 'invoice_created',
        invoice_id: i + 1,
        user_id: 1,
        created_at: new Date(`2024-10-${30 - i}T10:00:00Z`),
        invoice: {
          invoice_number: `INV-${i + 1}`,
          status: INVOICE_STATUS.UNPAID,
          is_hidden: false,
          created_by: 1,
        },
        user: {
          full_name: 'Test User',
        },
      }));

      mockDb.activityLog.findMany.mockResolvedValue(activities);

      const result = await getRecentActivity();

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Should be limited by take: 10 in the query
      expect(mockDb.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should map activity actions to correct types', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.activityLog.findMany.mockResolvedValue([
        {
          id: '1',
          action: 'invoice_created',
          invoice_id: 1,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-1', status: INVOICE_STATUS.UNPAID },
          user: { full_name: 'User' },
        },
        {
          id: '2',
          action: 'payment_approved',
          invoice_id: 2,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-2', status: INVOICE_STATUS.PAID },
          user: { full_name: 'User' },
        },
        {
          id: '3',
          action: 'invoice_rejected',
          invoice_id: 3,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-3', status: INVOICE_STATUS.REJECTED },
          user: { full_name: 'User' },
        },
        {
          id: '4',
          action: 'invoice_status_changed',
          invoice_id: 4,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-4', status: INVOICE_STATUS.PENDING_APPROVAL },
          user: { full_name: 'User' },
        },
      ]);

      const result = await getRecentActivity();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data[0].type).toBe('created');
      expect(result.data[1].type).toBe('paid');
      expect(result.data[2].type).toBe('rejected');
      expect(result.data[3].type).toBe('status_change');
    });

    it('should exclude hidden invoices', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.activityLog.findMany.mockResolvedValue([]);

      await getRecentActivity();

      expect(mockDb.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              is_hidden: false,
            }),
          }),
        })
      );
    });

    it('should apply RBAC filtering for standard users', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.activityLog.findMany.mockResolvedValue([]);

      await getRecentActivity();

      expect(mockDb.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoice: expect.objectContaining({
              created_by: 1,
            }),
          }),
        })
      );
    });

    it('should return activities sorted by date DESC', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.activityLog.findMany.mockResolvedValue([]);

      await getRecentActivity();

      expect(mockDb.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            created_at: 'desc',
          },
        })
      );
    });

    it('should filter out paid status changes (handled separately)', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.activityLog.findMany.mockResolvedValue([
        {
          id: '1',
          action: 'invoice_status_changed',
          invoice_id: 1,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-1', status: INVOICE_STATUS.PAID },
          user: { full_name: 'User' },
        },
        {
          id: '2',
          action: 'invoice_status_changed',
          invoice_id: 2,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-2', status: INVOICE_STATUS.UNPAID },
          user: { full_name: 'User' },
        },
      ]);

      const result = await getRecentActivity();

      expect(result.success).toBe(true);
      if (!result.success) return;

      // First activity (paid status) should be filtered out
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe('status_change');
      expect(result.data[0].invoice_number).toBe('INV-2');
    });

    it('should skip unknown actions', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.activityLog.findMany.mockResolvedValue([
        {
          id: '1',
          action: 'unknown_action',
          invoice_id: 1,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-1', status: INVOICE_STATUS.UNPAID },
          user: { full_name: 'User' },
        },
        {
          id: '2',
          action: 'invoice_created',
          invoice_id: 2,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-2', status: INVOICE_STATUS.UNPAID },
          user: { full_name: 'User' },
        },
      ]);

      const result = await getRecentActivity();

      expect(result.success).toBe(true);
      if (!result.success) return;

      // Unknown action should be filtered out
      expect(result.data).toHaveLength(1);
      expect(result.data[0].invoice_number).toBe('INV-2');
    });

    it('should handle missing user (display System)', async () => {
      mockAuth.mockResolvedValue(mockSessions.associate as any);
      mockIsAdmin.mockResolvedValue(false);

      mockDb.activityLog.findMany.mockResolvedValue([
        {
          id: '1',
          action: 'invoice_created',
          invoice_id: 1,
          created_at: new Date(),
          invoice: { invoice_number: 'INV-1', status: INVOICE_STATUS.UNPAID },
          user: null, // No user
        },
      ]);

      const result = await getRecentActivity();

      expect(result.success).toBe(true);
      if (!result.success) return;

      expect(result.data[0].user_name).toBe('System');
    });
  });
});
