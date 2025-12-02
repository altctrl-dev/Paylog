/**
 * React Query Hooks for Invoice V2 Operations (Sprint 13)
 *
 * Type-safe hooks for the new invoice workflow system.
 * Supports recurring and non-recurring invoice creation.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRecurringInvoice,
  createNonRecurringInvoice,
  updateRecurringInvoice,
  updateNonRecurringInvoice,
  getInvoiceV2,
  getInvoiceProfiles,
  getEntities,
  getCategories,
  getCurrencies,
  getPaymentTypes,
} from '@/app/actions/invoices-v2';
import {
  RecurringInvoiceSerializedData,
  NonRecurringInvoiceSerializedData,
  UpdateRecurringInvoiceSerializedData,
  UpdateNonRecurringInvoiceSerializedData,
} from '@/lib/validations/invoice-v2';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const invoiceV2Keys = {
  all: ['invoices-v2'] as const,
  detail: (id: number) => [...invoiceV2Keys.all, 'detail', id] as const,
  profiles: () => [...invoiceV2Keys.all, 'profiles'] as const,
  entities: () => [...invoiceV2Keys.all, 'entities'] as const,
  categories: () => [...invoiceV2Keys.all, 'categories'] as const,
  currencies: () => [...invoiceV2Keys.all, 'currencies'] as const,
  paymentTypes: () => [...invoiceV2Keys.all, 'payment-types'] as const,
};

// ============================================================================
// QUERY HOOKS (Data Fetching)
// ============================================================================

/**
 * Fetch single Invoice V2 by ID with all relations
 * Includes RBAC filtering
 *
 * @param id - Invoice ID
 * @returns Query result with invoice data
 *
 * @example
 * ```tsx
 * const { data: invoice, isLoading, error } = useInvoiceV2(123);
 * ```
 */
export function useInvoiceV2(id: number) {
  return useQuery({
    queryKey: invoiceV2Keys.detail(id),
    queryFn: async () => {
      const result = await getInvoiceV2(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch all active invoice profiles with relations
 * Filtered by user permissions (RBAC)
 *
 * @returns Query result with invoice profiles
 *
 * @example
 * ```tsx
 * const { data: profiles, isLoading } = useInvoiceProfiles();
 * ```
 */
export function useInvoiceProfiles() {
  return useQuery({
    queryKey: invoiceV2Keys.profiles(),
    queryFn: async () => {
      const result = await getInvoiceProfiles();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch all active entities
 *
 * @returns Query result with entities
 *
 * @example
 * ```tsx
 * const { data: entities, isLoading } = useEntities();
 * ```
 */
export function useEntities() {
  return useQuery({
    queryKey: invoiceV2Keys.entities(),
    queryFn: async () => {
      const result = await getEntities();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 300000, // 5 minutes (master data changes rarely)
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch all active categories
 *
 * @returns Query result with categories
 *
 * @example
 * ```tsx
 * const { data: categories, isLoading } = useCategories();
 * ```
 */
export function useCategories() {
  return useQuery({
    queryKey: invoiceV2Keys.categories(),
    queryFn: async () => {
      const result = await getCategories();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch all active currencies
 *
 * @returns Query result with currencies
 *
 * @example
 * ```tsx
 * const { data: currencies, isLoading } = useCurrencies();
 * ```
 */
export function useCurrencies() {
  return useQuery({
    queryKey: invoiceV2Keys.currencies(),
    queryFn: async () => {
      const result = await getCurrencies();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch all active payment types
 *
 * @returns Query result with payment types
 *
 * @example
 * ```tsx
 * const { data: paymentTypes, isLoading } = usePaymentTypes();
 * ```
 */
export function usePaymentTypes() {
  return useQuery({
    queryKey: invoiceV2Keys.paymentTypes(),
    queryFn: async () => {
      const result = await getPaymentTypes();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// MUTATION HOOKS (Data Modification)
// ============================================================================

/**
 * Create recurring invoice mutation
 *
 * Automatically invalidates invoice caches and shows toast notifications.
 * Redirects to invoice detail page on success.
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * const createInvoice = useCreateRecurringInvoice();
 *
 * const handleSubmit = async (formData: FormData) => {
 *   createInvoice.mutate(formData);
 * };
 * ```
 */
export function useCreateRecurringInvoice(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: RecurringInvoiceSerializedData) => {
      console.log('[useCreateRecurringInvoice] Wrapper function called with data:', data);
      const result = await createRecurringInvoice(data);
      console.log('[useCreateRecurringInvoice] Server Action returned:', result);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate invoice caches
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: invoiceV2Keys.all });

        // Show success toast with custom message if vendor is pending
        const title = result.data.successMessage || 'Invoice created successfully';
        const description = result.data.successMessage
          ? 'The invoice will be available for approval once the vendor is approved.'
          : 'Your recurring invoice has been submitted for processing.';

        toast({
          title,
          description,
        });

        // Redirect to invoices list page (detail page for v2 system doesn't exist yet)
        router.push('/invoices');

        // Call optional success callback (e.g., close panel)
        onSuccess?.();
      } else {
        // Show error toast
        toast({
          title: 'Failed to create invoice',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Failed to create invoice',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Create non-recurring invoice mutation
 *
 * Automatically invalidates invoice caches and shows toast notifications.
 * Redirects to invoice detail page on success.
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * const createInvoice = useCreateNonRecurringInvoice();
 *
 * const handleSubmit = async (formData: FormData) => {
 *   createInvoice.mutate(formData);
 * };
 * ```
 */
export function useCreateNonRecurringInvoice(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: NonRecurringInvoiceSerializedData) => {
      console.log('[useCreateNonRecurringInvoice] Wrapper function called with data:', data);
      const result = await createNonRecurringInvoice(data);
      console.log('[useCreateNonRecurringInvoice] Server Action returned:', result);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate invoice caches
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: invoiceV2Keys.all });

        // Show success toast with custom message if vendor is pending
        const title = result.data.successMessage || 'Invoice created successfully';
        const description = result.data.successMessage
          ? 'The invoice will be available for approval once the vendor is approved.'
          : 'Your invoice has been submitted for processing.';

        toast({
          title,
          description,
        });

        // Redirect to invoices list page (detail page for v2 system doesn't exist yet)
        router.push('/invoices');

        // Call optional success callback (e.g., close panel)
        onSuccess?.();
      } else {
        // Show error toast
        toast({
          title: 'Failed to create invoice',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Failed to create invoice',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update recurring invoice mutation
 *
 * Automatically invalidates invoice caches and shows toast notifications.
 * Closes panel on success.
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * const updateInvoice = useUpdateRecurringInvoice(invoiceId);
 *
 * const handleSubmit = async (formData: FormData) => {
 *   updateInvoice.mutate(formData);
 * };
 * ```
 */
export function useUpdateRecurringInvoice(invoiceId: number, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateRecurringInvoiceSerializedData) => {
      console.log('[useUpdateRecurringInvoice] Wrapper function called with data:', data);
      const result = await updateRecurringInvoice(invoiceId, data);
      console.log('[useUpdateRecurringInvoice] Server Action returned:', result);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate invoice caches
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: invoiceV2Keys.all });
        queryClient.invalidateQueries({ queryKey: invoiceV2Keys.detail(invoiceId) });

        // Show success toast
        toast({
          title: 'Invoice updated successfully',
          description: 'Your recurring invoice has been updated.',
        });

        // Call optional success callback (e.g., close panel)
        onSuccess?.();
      } else {
        // Show error toast
        toast({
          title: 'Failed to update invoice',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Failed to update invoice',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update non-recurring invoice mutation
 *
 * Automatically invalidates invoice caches and shows toast notifications.
 * Closes panel on success.
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * const updateInvoice = useUpdateNonRecurringInvoice(invoiceId);
 *
 * const handleSubmit = async (formData: FormData) => {
 *   updateInvoice.mutate(formData);
 * };
 * ```
 */
export function useUpdateNonRecurringInvoice(invoiceId: number, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateNonRecurringInvoiceSerializedData) => {
      console.log('[useUpdateNonRecurringInvoice] Wrapper function called with data:', data);
      const result = await updateNonRecurringInvoice(invoiceId, data);
      console.log('[useUpdateNonRecurringInvoice] Server Action returned:', result);
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate invoice caches
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: invoiceV2Keys.all });
        queryClient.invalidateQueries({ queryKey: invoiceV2Keys.detail(invoiceId) });

        // Show success toast
        toast({
          title: 'Invoice updated successfully',
          description: 'Your invoice has been updated.',
        });

        // Call optional success callback (e.g., close panel)
        onSuccess?.();
      } else {
        // Show error toast
        toast({
          title: 'Failed to update invoice',
          description: result.error || 'An unknown error occurred',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Failed to update invoice',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Approve invoice mutation (Admin only)
 *
 * Changes status from 'pending_approval' to 'unpaid'.
 * Automatically invalidates invoice caches and shows toast notifications.
 * Closes panel on success.
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * const approveInvoice = useApproveInvoiceV2();
 *
 * const handleApprove = () => {
 *   approveInvoice.mutate(invoiceId);
 * };
 * ```
 */
export function useApproveInvoiceV2(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const { approveInvoiceV2 } = await import('@/app/actions/invoices-v2');
      const result = await approveInvoiceV2(invoiceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate invoice caches
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: invoiceV2Keys.all });

      // Show success toast
      toast({
        title: 'Invoice approved',
        description: 'The invoice status has been updated to Unpaid.',
      });

      // Call optional success callback (e.g., close panel)
      onSuccess?.();
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Failed to approve invoice',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reject invoice mutation (Admin only)
 *
 * Changes status from 'pending_approval' to 'rejected'.
 * Automatically invalidates invoice caches and shows toast notifications.
 * Closes panel on success.
 *
 * @returns Mutation object with mutate function
 *
 * @example
 * ```tsx
 * const rejectInvoice = useRejectInvoiceV2();
 *
 * const handleReject = (reason: string) => {
 *   rejectInvoice.mutate({ invoiceId, reason });
 * };
 * ```
 */
export function useRejectInvoiceV2(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, reason }: { invoiceId: number; reason: string }) => {
      const { rejectInvoiceV2 } = await import('@/app/actions/invoices-v2');
      const result = await rejectInvoiceV2(invoiceId, reason);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate invoice caches
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: invoiceV2Keys.all });

      // Show success toast
      toast({
        title: 'Invoice rejected',
        description: 'The invoice has been rejected with the provided reason.',
      });

      // Call optional success callback (e.g., close panel)
      onSuccess?.();
    },
    onError: (error: Error) => {
      // Show error toast
      toast({
        title: 'Failed to reject invoice',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// COMBINED HOOKS (Multiple Resources)
// ============================================================================

/**
 * Fetch all form options at once
 *
 * Useful for initializing form dropdowns with all master data.
 *
 * @returns Combined query results
 *
 * @example
 * ```tsx
 * const {
 *   profiles,
 *   entities,
 *   categories,
 *   currencies,
 *   paymentTypes,
 *   isLoading,
 * } = useInvoiceFormOptions();
 * ```
 */
export function useInvoiceFormOptions() {
  const profilesQuery = useInvoiceProfiles();
  const entitiesQuery = useEntities();
  const categoriesQuery = useCategories();
  const currenciesQuery = useCurrencies();
  const paymentTypesQuery = usePaymentTypes();

  return {
    profiles: profilesQuery.data || [],
    entities: entitiesQuery.data || [],
    categories: categoriesQuery.data || [],
    currencies: currenciesQuery.data || [],
    paymentTypes: paymentTypesQuery.data || [],
    isLoading:
      profilesQuery.isLoading ||
      entitiesQuery.isLoading ||
      categoriesQuery.isLoading ||
      currenciesQuery.isLoading ||
      paymentTypesQuery.isLoading,
    isError:
      profilesQuery.isError ||
      entitiesQuery.isError ||
      categoriesQuery.isError ||
      currenciesQuery.isError ||
      paymentTypesQuery.isError,
    error:
      profilesQuery.error ||
      entitiesQuery.error ||
      categoriesQuery.error ||
      currenciesQuery.error ||
      paymentTypesQuery.error,
  };
}
