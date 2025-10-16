/**
 * React Query Hooks for Category Operations
 *
 * Type-safe hooks with optimistic updates and automatic cache invalidation.
 * Follows patterns from hooks/use-invoices.ts
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCategories,
  searchCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
} from '@/app/actions/master-data';
import type { CategoryFormData, CategoryFilters } from '@/lib/validations/master-data';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// TYPES
// ============================================================================

type CategoryWithCount = {
  id: number;
  name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  invoiceCount: number;
};

type CategoryListResponse = {
  categories: CategoryWithCount[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
};

// ============================================================================
// QUERY KEYS
// ============================================================================

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: Partial<CategoryFilters>) =>
    [...categoryKeys.lists(), filters] as const,
  search: (query: string) => [...categoryKeys.all, 'search', query] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch paginated category list with filters
 */
export function useCategories(filters?: Partial<CategoryFilters>) {
  return useQuery({
    queryKey: categoryKeys.list(filters),
    queryFn: async () => {
      const result = await getCategories(filters);
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
 * Search categories for autocomplete (fast, limited results)
 */
export function useSearchCategories(query: string, enabled = true) {
  return useQuery({
    queryKey: categoryKeys.search(query),
    queryFn: async () => {
      const result = await searchCategories(query);
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
 * Create new category (admin only)
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const result = await createCategory(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create category',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Category "${data.name}" created successfully`,
      });
    },
    onSettled: () => {
      // Invalidate all category queries
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      // Also invalidate invoice form options
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Update category (admin only)
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormData }) => {
      const result = await updateCategory(id, data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update category',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Category "${data.name}" updated successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Archive category (soft delete, admin only)
 */
export function useArchiveCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await archiveCategory(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return { id };
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive category',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category archived successfully',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}

/**
 * Restore archived category (admin only)
 */
export function useRestoreCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await restoreCategory(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore category',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: `Category "${data.name}" restored successfully`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'form-options'] });
    },
  });
}
