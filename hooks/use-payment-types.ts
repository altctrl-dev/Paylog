/**
 * React Query Hooks for Payment Type Operations
 *
 * Type-safe hooks with optimistic updates and automatic cache invalidation.
 * Follows patterns from hooks/use-categories.ts
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPaymentTypes,
  searchPaymentTypes,
  createPaymentType,
  updatePaymentType,
  archivePaymentType,
  restorePaymentType,
} from '@/app/actions/payment-types';
import type { PaymentTypeFormData, PaymentTypeFilters } from '@/lib/validations/master-data';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const paymentTypeKeys = {
  all: ['payment-types'] as const,
  lists: () => [...paymentTypeKeys.all, 'list'] as const,
  list: (filters?: Partial<PaymentTypeFilters>) =>
    [...paymentTypeKeys.lists(), filters] as const,
  search: (query: string) => [...paymentTypeKeys.all, 'search', query] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch paginated payment type list with filters
 */
export function usePaymentTypes(filters?: Partial<PaymentTypeFilters>) {
  return useQuery({
    queryKey: paymentTypeKeys.list(filters),
    queryFn: async () => {
      const result = await getPaymentTypes(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute (master data changes infrequently)
    refetchOnWindowFocus: false,
  });
}

/**
 * Search payment types for autocomplete (fast, limited results)
 */
export function useSearchPaymentTypes(query: string, enabled = true) {
  return useQuery({
    queryKey: paymentTypeKeys.search(query),
    queryFn: async () => {
      const result = await searchPaymentTypes(query);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: enabled && query.length >= 0, // Allow empty query for initial list
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch active payment types for filter/form dropdowns
 * Returns simplified format with just id and name
 *
 * @returns Query result with simplified payment type list
 *
 * @example
 * ```tsx
 * const { data: paymentTypes, isLoading } = useActivePaymentTypes();
 * // Returns: [{ id: 1, name: 'Bank Transfer' }, { id: 2, name: 'Cash' }]
 * ```
 */
export function useActivePaymentTypes() {
  return useQuery({
    queryKey: [...paymentTypeKeys.all, 'active-simple'],
    queryFn: async () => {
      const result = await getPaymentTypes({
        is_active: true,
        per_page: 100,
      });
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data.paymentTypes.map((pt) => ({
        id: pt.id,
        name: pt.name,
      }));
    },
    staleTime: 300000, // 5 minutes (master data changes infrequently)
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create new payment type (admin only)
 */
export function useCreatePaymentType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: PaymentTypeFormData) => {
      const result = await createPaymentType(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment type',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Payment type "${data.name}" created successfully`,
      });
    },
    onSettled: () => {
      // Invalidate all payment type queries
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.all });
      // Also invalidate invoice form options
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Update payment type (admin only)
 */
export function useUpdatePaymentType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PaymentTypeFormData }) => {
      const result = await updatePaymentType(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update payment type',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Payment type "${data.name}" updated successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Archive payment type (soft delete, admin only)
 */
export function useArchivePaymentType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await archivePaymentType(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return { id };
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive payment type',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Payment type archived successfully',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Restore archived payment type (admin only)
 */
export function useRestorePaymentType() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await restorePaymentType(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore payment type',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Payment type "${data.name}" restored successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentTypeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}
