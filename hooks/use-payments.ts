/**
 * React Query Hooks for Payment Operations
 *
 * Type-safe hooks with optimistic updates and automatic cache invalidation.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPaymentsByInvoiceId,
  getPaymentById,
  createPayment,
  getPaymentSummary,
} from '@/app/actions/payments';
import type {
  PaymentFormData,
  PaymentWithRelations,
  PaymentSummary,
} from '@/types/payment';
import { useToast } from '@/hooks/use-toast';
import { invoiceKeys } from '@/hooks/use-invoices';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (invoiceId: number) => [...paymentKeys.lists(), invoiceId] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: number) => [...paymentKeys.details(), id] as const,
  summaries: () => [...paymentKeys.all, 'summary'] as const,
  summary: (invoiceId: number) =>
    [...paymentKeys.summaries(), invoiceId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all payments for an invoice
 *
 * @param invoiceId - Invoice ID
 * @returns Query result with payment list
 *
 * @example
 * ```tsx
 * const { data: payments, isLoading } = usePayments(123);
 * ```
 */
export function usePayments(invoiceId: number | null) {
  return useQuery({
    queryKey: paymentKeys.list(invoiceId!),
    queryFn: async () => {
      const result = await getPaymentsByInvoiceId(invoiceId!);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: invoiceId !== null && invoiceId > 0,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch single payment by ID
 *
 * @param id - Payment ID
 * @returns Query result with payment details
 *
 * @example
 * ```tsx
 * const { data: payment, isLoading } = usePayment(456);
 * ```
 */
export function usePayment(id: number | null) {
  return useQuery({
    queryKey: paymentKeys.detail(id!),
    queryFn: async () => {
      const result = await getPaymentById(id!);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: id !== null && id > 0,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Fetch payment summary for an invoice
 *
 * @param invoiceId - Invoice ID
 * @returns Query result with payment summary (total paid, remaining balance, etc.)
 *
 * @example
 * ```tsx
 * const { data: summary } = usePaymentSummary(123);
 * // summary: { total_paid: 5000, remaining_balance: 3000, ... }
 * ```
 */
export function usePaymentSummary(invoiceId: number | null) {
  return useQuery({
    queryKey: paymentKeys.summary(invoiceId!),
    queryFn: async () => {
      const result = await getPaymentSummary(invoiceId!);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: invoiceId !== null && invoiceId > 0,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create new payment with optimistic update
 *
 * @returns Mutation hook with create function
 *
 * @example
 * ```tsx
 * const createPaymentMutation = useCreatePayment();
 *
 * const handleSubmit = async (invoiceId: number, data: PaymentFormData) => {
 *   await createPaymentMutation.mutateAsync({ invoiceId, data });
 * };
 * ```
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      data,
    }: {
      invoiceId: number;
      data: PaymentFormData;
    }) => {
      const result = await createPayment(invoiceId, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async ({ invoiceId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: paymentKeys.list(invoiceId) });

      // Snapshot previous value
      const previousPayments = queryClient.getQueryData<PaymentWithRelations[]>(
        paymentKeys.list(invoiceId)
      );

      return { previousPayments, invoiceId };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousPayments) {
        queryClient.setQueryData(
          paymentKeys.list(context.invoiceId),
          context.previousPayments
        );
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Payment of $${data.amount_paid.toFixed(2)} recorded successfully`,
      });
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate payment queries
      queryClient.invalidateQueries({
        queryKey: paymentKeys.list(variables.invoiceId),
      });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.summary(variables.invoiceId),
      });

      // Invalidate invoice queries (status may have changed)
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.invoiceId),
      });
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.lists(),
      });
    },
  });
}
