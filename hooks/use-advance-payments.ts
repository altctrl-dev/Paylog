/**
 * React Query Hooks for Advance Payments
 *
 * Provides data fetching and mutation hooks for:
 * - Creating advance payments
 * - Linking/unlinking to invoices
 * - Listing and filtering
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdvancePaymentById,
  getAdvancePayments,
  getUnlinkedAdvancePayments,
  createAdvancePayment,
  updateAdvancePayment,
  linkAdvancePaymentToInvoice,
  unlinkAdvancePayment,
  deleteAdvancePayment,
} from '@/app/actions/advance-payments';
import type {
  AdvancePaymentWithRelations,
  AdvancePaymentFormData,
  AdvancePaymentFilters,
  AdvancePaymentListResponse,
} from '@/types/monthly-report';
import { monthlyReportKeys } from './use-monthly-reports';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const advancePaymentKeys = {
  all: ['advance-payments'] as const,
  lists: () => [...advancePaymentKeys.all, 'list'] as const,
  list: (filters: AdvancePaymentFilters) =>
    [...advancePaymentKeys.lists(), filters] as const,
  details: () => [...advancePaymentKeys.all, 'detail'] as const,
  detail: (id: number) => [...advancePaymentKeys.details(), id] as const,
  unlinked: (vendorId: number) =>
    [...advancePaymentKeys.all, 'unlinked', vendorId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch a single advance payment by ID
 *
 * @param id - Advance payment ID
 */
export function useAdvancePayment(id: number) {
  return useQuery<AdvancePaymentWithRelations | null, Error>({
    queryKey: advancePaymentKeys.detail(id),
    queryFn: async () => {
      const result = await getAdvancePaymentById(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: id > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch list of advance payments with filters
 *
 * @param filters - Filter options
 */
export function useAdvancePayments(filters: AdvancePaymentFilters) {
  return useQuery<AdvancePaymentListResponse, Error>({
    queryKey: advancePaymentKeys.list(filters),
    queryFn: async () => {
      const result = await getAdvancePayments(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch unlinked advance payments for a vendor
 *
 * @param vendorId - Vendor ID
 */
export function useUnlinkedAdvancePayments(vendorId: number) {
  return useQuery<AdvancePaymentWithRelations[], Error>({
    queryKey: advancePaymentKeys.unlinked(vendorId),
    queryFn: async () => {
      const result = await getUnlinkedAdvancePayments(vendorId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: vendorId > 0,
    staleTime: 30 * 1000,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create an advance payment
 */
export function useCreateAdvancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AdvancePaymentFormData) => {
      const result = await createAdvancePayment(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate lists and monthly reports
      queryClient.invalidateQueries({ queryKey: advancePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: monthlyReportKeys.all });
    },
  });
}

/**
 * Hook to update an advance payment
 */
export function useUpdateAdvancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<AdvancePaymentFormData>;
    }) => {
      const result = await updateAdvancePayment(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: advancePaymentKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: advancePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: monthlyReportKeys.all });
    },
  });
}

/**
 * Hook to link advance payment to invoice
 */
export function useLinkAdvancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      advancePaymentId,
      invoiceId,
    }: {
      advancePaymentId: number;
      invoiceId: number;
    }) => {
      const result = await linkAdvancePaymentToInvoice(advancePaymentId, invoiceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: advancePaymentKeys.detail(variables.advancePaymentId),
      });
      queryClient.invalidateQueries({ queryKey: advancePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: advancePaymentKeys.all });
      queryClient.invalidateQueries({ queryKey: monthlyReportKeys.all });
    },
  });
}

/**
 * Hook to unlink advance payment from invoice
 */
export function useUnlinkAdvancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (advancePaymentId: number) => {
      const result = await unlinkAdvancePayment(advancePaymentId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: advancePaymentKeys.detail(variables),
      });
      queryClient.invalidateQueries({ queryKey: advancePaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: advancePaymentKeys.all });
      queryClient.invalidateQueries({ queryKey: monthlyReportKeys.all });
    },
  });
}

/**
 * Hook to delete an advance payment
 */
export function useDeleteAdvancePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdvancePayment(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: advancePaymentKeys.all });
      queryClient.invalidateQueries({ queryKey: monthlyReportKeys.all });
    },
  });
}
