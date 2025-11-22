/**
 * React Query Hooks for Vendor Operations
 *
 * Type-safe hooks with optimistic updates and automatic cache invalidation.
 * Follows patterns from hooks/use-invoices.ts
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVendors,
  searchVendors,
  createVendor,
  updateVendor,
  archiveVendor,
  restoreVendor,
} from '@/app/actions/master-data';
import type { VendorFormData, VendorFilters } from '@/lib/validations/master-data';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (filters?: Partial<VendorFilters>) =>
    [...vendorKeys.lists(), filters] as const,
  search: (query: string) => [...vendorKeys.all, 'search', query] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch paginated vendor list with filters
 */
export function useVendors(filters?: Partial<VendorFilters>) {
  return useQuery({
    queryKey: vendorKeys.list(filters),
    queryFn: async () => {
      const result = await getVendors(filters);
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
 * Search vendors for autocomplete (fast, limited results)
 */
export function useSearchVendors(query: string, enabled = true) {
  return useQuery({
    queryKey: vendorKeys.search(query),
    queryFn: async () => {
      const result = await searchVendors(query);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    enabled: enabled && query.length >= 0, // Allow empty query for initial list
    staleTime: 30000, // 30 seconds
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create new vendor (admin only)
 */
export function useCreateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: VendorFormData) => {
      const result = await createVendor(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create vendor',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      // Show different toast message based on status
      if ((data as any).status === 'PENDING_APPROVAL') { // eslint-disable-line @typescript-eslint/no-explicit-any
        toast({
          title: 'Vendor submitted for approval',
          description: `"${data.name}" will be available after admin approval`,
        });
      } else {
        toast({
          title: 'Success',
          description: `Vendor "${data.name}" created successfully`,
        });
      }
    },
    onSettled: () => {
      // Invalidate all vendor queries
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      // Also invalidate invoice form options
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Update vendor (admin only)
 */
export function useUpdateVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VendorFormData }) => {
      const result = await updateVendor(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vendor',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Vendor "${data.name}" updated successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Archive vendor (soft delete, admin only)
 */
export function useArchiveVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await archiveVendor(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return { id };
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive vendor',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Vendor archived successfully',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Restore archived vendor (admin only)
 */
export function useRestoreVendor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await restoreVendor(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore vendor',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Vendor "${data.name}" restored successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      queryClient.invalidateQueries({ queryKey: vendorKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}
