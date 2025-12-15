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
        // Pending vendors count (from master data requests + direct pending vendors)
        // BUG-007 FIX: Include vendors created directly with PENDING_APPROVAL status
        (async () => {
          try {
            const { getAdminRequests, getPendingVendorsDirectCount } = await import(
              '@/app/actions/admin/master-data-approval'
            );

            // Get both: MasterDataRequest vendors and direct pending vendors
            const [requestsResult, directResult] = await Promise.all([
              getAdminRequests({
                entity_type: 'vendor',
                status: 'pending_approval',
              }),
              getPendingVendorsDirectCount(),
            ]);

            const requestsCount = requestsResult.success && requestsResult.data ? requestsResult.data.length : 0;
            const directCount = directResult.success && directResult.data ? directResult.data : 0;

            return requestsCount + directCount;
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
 * Normalized vendor data for admin approval view
 * BUG-007 FIX: Supports both MasterDataRequest vendors and direct pending vendors
 */
export interface NormalizedVendorRequest {
  id: number;
  type: 'request' | 'direct'; // 'request' = MasterDataRequest, 'direct' = Vendor table
  status: string;
  created_at: Date;
  request_data: {
    name: string;
    address?: string | null;
  };
  requester: {
    id: number;
    full_name: string;
    email: string;
  } | null;
  // Original IDs for actions
  requestId?: number; // For MasterDataRequest
  vendorId?: number;  // For direct vendors
}

/**
 * Fetch vendor requests with status filter
 *
 * Returns list of vendor requests filtered by approval status.
 * Supports 'pending', 'approved', 'rejected', or 'all'.
 *
 * BUG-007 FIX: Now includes both MasterDataRequest vendors AND direct pending vendors
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
    queryFn: async (): Promise<NormalizedVendorRequest[]> => {
      const { getAdminRequests, getPendingVendorsDirect } = await import(
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

      // Fetch both MasterDataRequest vendors and direct pending vendors
      const [requestsResult, directResult] = await Promise.all([
        getAdminRequests({
          entity_type: 'vendor',
          status: status as 'pending_approval' | 'approved' | 'rejected' | undefined,
        }),
        getPendingVendorsDirect(statusFilter),
      ]);

      const normalized: NormalizedVendorRequest[] = [];

      // Add MasterDataRequest vendors
      if (requestsResult.success && requestsResult.data) {
        for (const req of requestsResult.data) {
          const reqData = req.request_data as { name: string; address?: string };
          normalized.push({
            id: req.id,
            type: 'request',
            status: req.status,
            created_at: req.created_at,
            request_data: {
              name: reqData.name,
              address: reqData.address || null,
            },
            requester: req.requester,
            requestId: req.id,
          });
        }
      }

      // Add direct pending vendors
      if (directResult.success && directResult.data) {
        for (const vendor of directResult.data) {
          // Map vendor status to request status format
          const mappedStatus = vendor.status === 'PENDING_APPROVAL' ? 'pending_approval'
            : vendor.status === 'APPROVED' ? 'approved'
            : vendor.status === 'REJECTED' ? 'rejected'
            : 'pending_approval';

          normalized.push({
            id: vendor.id + 100000, // Offset to avoid ID collision with requests
            type: 'direct',
            status: mappedStatus,
            created_at: vendor.created_at,
            request_data: {
              name: vendor.name,
              address: vendor.address,
            },
            requester: vendor.requester,
            vendorId: vendor.id,
          });
        }
      }

      // Sort by created_at descending
      normalized.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return normalized;
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
