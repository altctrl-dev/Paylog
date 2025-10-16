/**
 * React Query Hooks for Bulk Operations
 *
 * Type-safe hooks for bulk invoice operations with automatic cache invalidation.
 * Sprint 7 Phase 8: Bulk Operations Implementation
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bulkApproveInvoices,
  bulkRejectInvoices,
  bulkExportInvoices,
} from '@/app/actions/bulk-operations';
import { useToast } from '@/hooks/use-toast';
import { invoiceKeys } from '@/hooks/use-invoices';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Download CSV file to user's device
 */
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate filename for CSV export
 */
function generateCsvFilename(): string {
  const date = new Date().toISOString().split('T')[0];
  return `invoices-export-${date}.csv`;
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Bulk approve invoices (admin only)
 *
 * @returns Mutation hook with approve function
 *
 * @example
 * ```tsx
 * const approveMutation = useBulkApprove();
 *
 * const handleBulkApprove = async (invoiceIds: number[]) => {
 *   await approveMutation.mutateAsync(invoiceIds);
 * };
 * ```
 */
export function useBulkApprove() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      const result = await bulkApproveInvoices(invoiceIds);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve invoices',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      const count = data?.successCount || 0;
      toast({
        title: 'Success',
        description: `Successfully approved ${count} invoice${count !== 1 ? 's' : ''}`,
      });
    },
    onSettled: () => {
      // Invalidate invoice list queries to refetch
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

/**
 * Bulk reject invoices with reason (admin only)
 *
 * @returns Mutation hook with reject function
 *
 * @example
 * ```tsx
 * const rejectMutation = useBulkReject();
 *
 * const handleBulkReject = async (invoiceIds: number[], reason: string) => {
 *   await rejectMutation.mutateAsync({ invoiceIds, reason });
 * };
 * ```
 */
export function useBulkReject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      invoiceIds,
      reason,
    }: {
      invoiceIds: number[];
      reason: string;
    }) => {
      const result = await bulkRejectInvoices(invoiceIds, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject invoices',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      const count = data?.successCount || 0;
      toast({
        title: 'Success',
        description: `Successfully rejected ${count} invoice${count !== 1 ? 's' : ''}`,
      });
    },
    onSettled: () => {
      // Invalidate invoice list queries to refetch
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

/**
 * Bulk export invoices to CSV
 * Automatically downloads the file after successful export
 *
 * @returns Mutation hook with export function
 *
 * @example
 * ```tsx
 * const exportMutation = useBulkExport();
 *
 * const handleBulkExport = async (invoiceIds: number[], columnIds: string[]) => {
 *   await exportMutation.mutateAsync({ invoiceIds, columnIds });
 * };
 * ```
 */
export function useBulkExport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      invoiceIds,
      columnIds,
    }: {
      invoiceIds: number[];
      columnIds: string[];
    }) => {
      const result = await bulkExportInvoices(invoiceIds, columnIds);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export invoices',
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables) => {
      // Download CSV file
      if (data?.csvContent) {
        const filename = generateCsvFilename();
        downloadCSV(data.csvContent, filename);

        toast({
          title: 'Success',
          description: `Exported ${variables.invoiceIds.length} invoice${variables.invoiceIds.length !== 1 ? 's' : ''} to ${filename}`,
        });
      }
    },
  });
}
