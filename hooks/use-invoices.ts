/**
 * React Query Hooks for Invoice Operations
 *
 * Type-safe hooks with optimistic updates and automatic cache invalidation.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  putInvoiceOnHold,
  approveInvoice,
  rejectInvoice,
  getInvoiceFormOptions,
} from '@/app/actions/invoices';
import type {
  InvoiceFilters,
  InvoiceFormData,
  InvoiceWithRelations,
  InvoiceListResponse,
} from '@/types/invoice';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters?: Partial<InvoiceFilters>) =>
    [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: number) => [...invoiceKeys.details(), id] as const,
  formOptions: () => [...invoiceKeys.all, 'form-options'] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch paginated invoice list with filters
 *
 * @param filters - Search, status, pagination parameters
 * @returns Query result with invoice list and pagination
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useInvoices({ search: 'INV', status: 'unpaid' });
 * ```
 */
export function useInvoices(filters?: Partial<InvoiceFilters>) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const result = await getInvoices(filters);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch single invoice by ID
 *
 * @param id - Invoice ID
 * @returns Query result with invoice details
 *
 * @example
 * ```tsx
 * const { data: invoice, isLoading } = useInvoice(123);
 * ```
 */
export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: invoiceKeys.detail(id!),
    queryFn: async () => {
      const result = await getInvoiceById(id!);
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
 * Fetch form dropdown options (vendors, categories, profiles)
 *
 * @returns Query result with form options
 *
 * @example
 * ```tsx
 * const { data: options } = useInvoiceFormOptions();
 * ```
 */
export function useInvoiceFormOptions() {
  return useQuery({
    queryKey: invoiceKeys.formOptions(),
    queryFn: async () => {
      const result = await getInvoiceFormOptions();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 300000, // 5 minutes (these change infrequently)
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create new invoice with optimistic update
 *
 * @returns Mutation hook with create function
 *
 * @example
 * ```tsx
 * const createMutation = useCreateInvoice();
 *
 * const handleSubmit = async (data: InvoiceFormData) => {
 *   await createMutation.mutateAsync(data);
 * };
 * ```
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const result = await createInvoice(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async (newInvoice) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.lists() });

      // Snapshot previous value
      const previousInvoices = queryClient.getQueryData<InvoiceListResponse>(
        invoiceKeys.list()
      );

      // Optimistically update cache (optional - can skip for creates)
      // We'll rely on invalidation instead for simplicity

      return { previousInvoices };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousInvoices) {
        queryClient.setQueryData(
          invoiceKeys.list(),
          context.previousInvoices
        );
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to create invoice',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Invoice ${data.invoice_number} created successfully`,
      });
    },
    onSettled: () => {
      // Invalidate all list queries to refetch
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

/**
 * Update existing invoice with optimistic update
 *
 * @returns Mutation hook with update function
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateInvoice();
 *
 * const handleSave = async (id: number, data: InvoiceFormData) => {
 *   await updateMutation.mutateAsync({ id, data });
 * };
 * ```
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: InvoiceFormData;
    }) => {
      const result = await updateInvoice(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.detail(id) });

      // Snapshot previous value
      const previousInvoice =
        queryClient.getQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id)
        );

      // Optimistically update detail cache
      if (previousInvoice) {
        queryClient.setQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id),
          {
            ...previousInvoice,
            ...data,
          }
        );
      }

      return { previousInvoice, id };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          invoiceKeys.detail(context.id),
          context.previousInvoice
        );
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Invoice ${data.invoice_number} updated successfully`,
      });
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

/**
 * Delete invoice (soft delete) with optimistic update
 *
 * @returns Mutation hook with delete function
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteInvoice();
 *
 * const handleDelete = async (id: number) => {
 *   await deleteMutation.mutateAsync(id);
 * };
 * ```
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteInvoice(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return { id };
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.lists() });

      // Snapshot previous value
      const previousInvoices = queryClient.getQueryData<InvoiceListResponse>(
        invoiceKeys.list()
      );

      // Optimistically remove from list
      if (previousInvoices) {
        queryClient.setQueryData<InvoiceListResponse>(invoiceKeys.list(), {
          ...previousInvoices,
          invoices: previousInvoices.invoices.filter((inv) => inv.id !== id),
        });
      }

      return { previousInvoices, id };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousInvoices) {
        queryClient.setQueryData(
          invoiceKeys.list(),
          context.previousInvoices
        );
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to delete invoice',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    },
    onSettled: () => {
      // Invalidate all list queries
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

/**
 * Put invoice on hold with optimistic update
 *
 * @returns Mutation hook with hold function
 *
 * @example
 * ```tsx
 * const holdMutation = usePutInvoiceOnHold();
 *
 * const handleHold = async (id: number, reason: string) => {
 *   await holdMutation.mutateAsync({ id, reason });
 * };
 * ```
 */
export function usePutInvoiceOnHold() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const result = await putInvoiceOnHold(id, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.detail(id) });

      // Snapshot previous value
      const previousInvoice =
        queryClient.getQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id)
        );

      // Optimistically update status
      if (previousInvoice) {
        queryClient.setQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id),
          {
            ...previousInvoice,
            status: 'on_hold',
          }
        );
      }

      return { previousInvoice, id };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          invoiceKeys.detail(context.id),
          context.previousInvoice
        );
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to put invoice on hold',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Invoice ${data.invoice_number} put on hold`,
      });
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

/**
 * Approve invoice (admin only) with optimistic update
 *
 * @returns Mutation hook with approve function
 *
 * @example
 * ```tsx
 * const approveMutation = useApproveInvoice();
 *
 * const handleApprove = async (id: number) => {
 *   await approveMutation.mutateAsync(id);
 * };
 * ```
 */
export function useApproveInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await approveInvoice(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.detail(id) });

      // Snapshot previous value
      const previousInvoice =
        queryClient.getQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id)
        );

      // Optimistically update status
      if (previousInvoice) {
        queryClient.setQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id),
          {
            ...previousInvoice,
            status: 'unpaid',
          }
        );
      }

      return { previousInvoice, id };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          invoiceKeys.detail(context.id),
          context.previousInvoice
        );
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to approve invoice',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Invoice ${data.invoice_number} approved successfully`,
      });
    },
    onSettled: (_data, _error, id) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

/**
 * Reject invoice with reason (admin only) with optimistic update
 *
 * @returns Mutation hook with reject function
 *
 * @example
 * ```tsx
 * const rejectMutation = useRejectInvoice();
 *
 * const handleReject = async (id: number, reason: string) => {
 *   await rejectMutation.mutateAsync({ id, reason });
 * };
 * ```
 */
export function useRejectInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const result = await rejectInvoice(id, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: invoiceKeys.detail(id) });

      // Snapshot previous value
      const previousInvoice =
        queryClient.getQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id)
        );

      // Optimistically update status
      if (previousInvoice) {
        queryClient.setQueryData<InvoiceWithRelations>(
          invoiceKeys.detail(id),
          {
            ...previousInvoice,
            status: 'rejected',
          }
        );
      }

      return { previousInvoice, id };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousInvoice) {
        queryClient.setQueryData(
          invoiceKeys.detail(context.id),
          context.previousInvoice
        );
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to reject invoice',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Invoice ${data.invoice_number} rejected`,
      });
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: invoiceKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}
