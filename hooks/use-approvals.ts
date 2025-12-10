/**
 * React Query Hooks for Approval Data
 *
 * Provides hooks for fetching approval counts and pending items across
 * invoices, payments, and vendors. Used by the admin approval dashboard.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

export interface ApprovalCounts {
  invoices: number;
  payments: number;
  vendors: number;
  archives: number;
}

// ============================================================================
// TYPES
// ============================================================================

export type ApprovalStatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const approvalKeys = {
  all: ['approvals'] as const,
  counts: () => [...approvalKeys.all, 'counts'] as const,
  pendingInvoices: () => [...approvalKeys.all, 'pending-invoices'] as const,
  pendingPayments: () => [...approvalKeys.all, 'pending-payments'] as const,
  pendingVendors: () => [...approvalKeys.all, 'pending-vendors'] as const,
  invoices: (status: ApprovalStatusFilter) => [...approvalKeys.all, 'invoices', status] as const,
  payments: (status: ApprovalStatusFilter) => [...approvalKeys.all, 'payments', status] as const,
  vendors: (status: ApprovalStatusFilter) => [...approvalKeys.all, 'vendors', status] as const,
  archives: (status: ApprovalStatusFilter) => [...approvalKeys.all, 'archives', status] as const,
};

// ============================================================================
// APPROVAL COUNTS HOOK
// ============================================================================

/**
 * Fetch approval counts for all pending items
 *
 * Aggregates pending counts from invoices, payments, vendors, and archives.
 * Auto-refreshes every 30 seconds to keep badge counts current.
 *
 * @returns Query result with approval counts
 *
 * @example
 * ```tsx
 * const { data: counts, isLoading } = useApprovalCounts();
 * // counts = { invoices: 5, payments: 3, vendors: 2, archives: 1 }
 * ```
 */
export function useApprovalCounts() {
  return useQuery<ApprovalCounts | null>({
    queryKey: approvalKeys.counts(),
    queryFn: async () => {
      // Fetch counts from individual sources in parallel
      const [invoicesResult, paymentsResult, vendorsResult] = await Promise.all([
        // Pending invoices count
        (async () => {
          try {
            const { getInvoices } = await import('@/app/actions/invoices');
            const result = await getInvoices({
              status: 'pending_approval',
              page: 1,
              per_page: 1,
              show_archived: false,
            });
            return result.success && result.data ? result.data.pagination.total : 0;
          } catch {
            return 0;
          }
        })(),
        // Pending payments count
        (async () => {
          try {
            const { getPendingPayments } = await import('@/app/actions/payments');
            const result = await getPendingPayments();
            return result.success && result.data ? result.data.length : 0;
          } catch {
            return 0;
          }
        })(),
        // Pending vendors count (from master data requests)
        (async () => {
          try {
            const { getAdminRequests } = await import(
              '@/app/actions/admin/master-data-approval'
            );
            const result = await getAdminRequests({
              entity_type: 'vendor',
              status: 'pending_approval',
            });
            return result.success && result.data ? result.data.length : 0;
          } catch {
            return 0;
          }
        })(),
      ]);

      // Pending archives count (from master data requests)
      let archivesCount = 0;
      try {
        const { getAdminRequests } = await import(
          '@/app/actions/admin/master-data-approval'
        );
        const result = await getAdminRequests({
          entity_type: 'invoice_archive',
          status: 'pending_approval',
        });
        archivesCount = result.success && result.data ? result.data.length : 0;
      } catch {
        archivesCount = 0;
      }

      return {
        invoices: invoicesResult,
        payments: paymentsResult,
        vendors: vendorsResult,
        archives: archivesCount,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider stale after 10 seconds
  });
}

// ============================================================================
// PENDING INVOICES HOOK
// ============================================================================

/**
 * Fetch pending invoices awaiting approval
 *
 * Returns list of invoices with status 'pending_approval'.
 * Can be disabled via options for conditional fetching.
 *
 * @param options - Query options (enabled)
 * @returns Query result with pending invoices
 *
 * @example
 * ```tsx
 * const { data: invoices, isLoading } = usePendingInvoices({ enabled: isAdmin });
 * ```
 */
export function usePendingInvoices(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: approvalKeys.pendingInvoices(),
    queryFn: async () => {
      const { getInvoices } = await import('@/app/actions/invoices');
      const result = await getInvoices({
        status: 'pending_approval',
        page: 1,
        per_page: 100,
        show_archived: false,
      });
      if (result.success && result.data) {
        return result.data.invoices;
      }
      return [];
    },
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// PENDING PAYMENTS HOOK
// ============================================================================

/**
 * Fetch pending payments awaiting approval
 *
 * Returns list of payments with status 'pending'.
 * Can be disabled via options for conditional fetching.
 *
 * @param options - Query options (enabled)
 * @returns Query result with pending payments
 *
 * @example
 * ```tsx
 * const { data: payments, isLoading } = usePendingPayments({ enabled: isAdmin });
 * ```
 */
export function usePendingPayments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: approvalKeys.pendingPayments(),
    queryFn: async () => {
      const { getPendingPayments } = await import('@/app/actions/payments');
      const result = await getPendingPayments();
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    },
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// PENDING VENDORS HOOK
// ============================================================================

/**
 * Fetch pending vendor requests awaiting approval
 *
 * Returns list of vendor master data requests with status 'pending_approval'.
 * Can be disabled via options for conditional fetching.
 *
 * @param options - Query options (enabled)
 * @returns Query result with pending vendor requests
 *
 * @example
 * ```tsx
 * const { data: vendors, isLoading } = usePendingVendors({ enabled: isAdmin });
 * ```
 */
export function usePendingVendors(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: approvalKeys.pendingVendors(),
    queryFn: async () => {
      const { getAdminRequests } = await import(
        '@/app/actions/admin/master-data-approval'
      );
      const result = await getAdminRequests({
        entity_type: 'vendor',
        status: 'pending_approval',
      });
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    },
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// FILTERED INVOICES HOOK
// ============================================================================

/**
 * Fetch invoices with status filter
 *
 * Returns list of invoices filtered by approval status.
 * Supports 'pending', 'approved', 'rejected', or 'all'.
 *
 * @param statusFilter - Filter by approval status
 * @param options - Query options (enabled)
 * @returns Query result with filtered invoices
 */
export function useFilteredInvoices(
  statusFilter: ApprovalStatusFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: approvalKeys.invoices(statusFilter),
    queryFn: async () => {
      const { getInvoices } = await import('@/app/actions/invoices');

      // Map filter to invoice status
      // Note: Invoices don't have an 'approved' status - after approval they become 'unpaid'
      // For 'approved', we fetch 'unpaid' (recently approved invoices)
      type InvoiceStatusFilter = 'pending_approval' | 'on_hold' | 'unpaid' | 'partial' | 'paid' | 'overdue' | 'rejected' | undefined;
      const statusMap: Record<ApprovalStatusFilter, InvoiceStatusFilter> = {
        pending: 'pending_approval',
        approved: 'unpaid', // Recently approved invoices are in 'unpaid' status
        rejected: 'rejected',
        all: undefined,
      };

      const status = statusMap[statusFilter];

      const result = await getInvoices({
        status,
        page: 1,
        per_page: 100,
        show_archived: false,
      });
      if (result.success && result.data) {
        // If 'all', filter to only show approval-related statuses
        if (statusFilter === 'all') {
          return result.data.invoices.filter((inv) =>
            ['pending_approval', 'unpaid', 'rejected'].includes(inv.status)
          );
        }
        return result.data.invoices;
      }
      return [];
    },
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// FILTERED PAYMENTS HOOK
// ============================================================================

/**
 * Fetch payments with status filter
 *
 * Returns list of payments filtered by approval status.
 * Supports 'pending', 'approved', 'rejected', or 'all'.
 *
 * @param statusFilter - Filter by approval status
 * @param options - Query options (enabled)
 * @returns Query result with filtered payments
 */
export function useFilteredPayments(
  statusFilter: ApprovalStatusFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: approvalKeys.payments(statusFilter),
    queryFn: async () => {
      const { getPayments } = await import('@/app/actions/payments');

      // Map filter to payment status
      const statusMap: Record<ApprovalStatusFilter, string | undefined> = {
        pending: 'pending',
        approved: 'approved',
        rejected: 'rejected',
        all: undefined,
      };

      const status = statusMap[statusFilter];

      const result = await getPayments({ status });
      if (result.success && result.data) {
        // If 'all', filter to only show approval-related statuses
        if (statusFilter === 'all') {
          return result.data.filter((p) =>
            ['pending', 'approved', 'rejected'].includes(p.status)
          );
        }
        return result.data;
      }
      return [];
    },
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// FILTERED VENDORS HOOK
// ============================================================================

/**
 * Fetch vendor requests with status filter
 *
 * Returns list of vendor requests filtered by approval status.
 * Supports 'pending', 'approved', 'rejected', or 'all'.
 *
 * @param statusFilter - Filter by approval status
 * @param options - Query options (enabled)
 * @returns Query result with filtered vendor requests
 */
export function useFilteredVendors(
  statusFilter: ApprovalStatusFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: approvalKeys.vendors(statusFilter),
    queryFn: async () => {
      const { getAdminRequests } = await import(
        '@/app/actions/admin/master-data-approval'
      );

      // Map filter to request status
      const statusMap: Record<ApprovalStatusFilter, string | undefined> = {
        pending: 'pending_approval',
        approved: 'approved',
        rejected: 'rejected',
        all: undefined,
      };

      const status = statusMap[statusFilter];

      const result = await getAdminRequests({
        entity_type: 'vendor',
        status: status as 'pending_approval' | 'approved' | 'rejected' | undefined,
      });
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    },
    enabled: options?.enabled !== false,
  });
}

// ============================================================================
// FILTERED ARCHIVES HOOK
// ============================================================================

/**
 * Fetch archive requests with status filter
 *
 * Returns list of archive requests filtered by approval status.
 * Supports 'pending', 'approved', 'rejected', or 'all'.
 *
 * @param statusFilter - Filter by approval status
 * @param options - Query options (enabled)
 * @returns Query result with filtered archive requests
 */
export function useFilteredArchives(
  statusFilter: ApprovalStatusFilter,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: approvalKeys.archives(statusFilter),
    queryFn: async () => {
      const { getAdminRequests } = await import(
        '@/app/actions/admin/master-data-approval'
      );

      // Map filter to request status
      const statusMap: Record<ApprovalStatusFilter, string | undefined> = {
        pending: 'pending_approval',
        approved: 'approved',
        rejected: 'rejected',
        all: undefined,
      };

      const status = statusMap[statusFilter];

      const result = await getAdminRequests({
        entity_type: 'invoice_archive',
        status: status as 'pending_approval' | 'approved' | 'rejected' | undefined,
      });
      if (result.success && result.data) {
        return result.data;
      }
      return [];
    },
    enabled: options?.enabled !== false,
  });
}
