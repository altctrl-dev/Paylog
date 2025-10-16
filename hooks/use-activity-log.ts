/**
 * React Query Hook: Activity Log Operations
 *
 * Client-side hook for fetching activity logs with filters and auto-refresh.
 * Sprint 7 Phase 7: Activity Log Viewer
 */

import { useQuery } from '@tanstack/react-query';
import { getActivityLog } from '@/app/actions/activity-log';
import type { ActivityLogFilters } from '@/types/activity-log';
import type { ActivityAction } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const activityLogKeys = {
  all: ['activity-logs'] as const,
  lists: () => [...activityLogKeys.all, 'list'] as const,
  list: (invoiceId: number, filters?: ActivityLogFilters) =>
    [...activityLogKeys.lists(), invoiceId, filters] as const,
};

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch activity log for an invoice with pagination and filters
 *
 * Features:
 * - Auto-refresh every 30 seconds for real-time updates
 * - Filter by action type, user, date range
 * - Pagination support
 * - Loading and error states
 *
 * @param invoiceId - Invoice ID
 * @param filters - Optional filters (action, userId, date range, pagination)
 * @returns React Query result with activity log entries and pagination
 *
 * @example
 * const { data, isLoading, error } = useActivityLog(123, {
 *   action: ACTIVITY_ACTION.INVOICE_UPDATED,
 *   page: 1,
 *   perPage: 20
 * });
 */
export function useActivityLog(
  invoiceId: number,
  filters?: ActivityLogFilters
) {
  return useQuery({
    queryKey: activityLogKeys.list(invoiceId, filters),
    queryFn: async () => {
      const result = await getActivityLog(invoiceId, filters);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // Consider data stale after 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: false, // Only refetch when tab is active
  });
}

// Note: Prefetching functionality would require useQueryClient from React Query
// This is not critical for Phase 7 and can be added later if needed
