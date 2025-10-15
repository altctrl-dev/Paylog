/**
 * React Query Hooks: Invoice Comments
 *
 * Client-side hooks for comment operations with optimistic updates.
 * Sprint 7 Phase 6: Comments Feature
 *
 * Features:
 * - Automatic cache invalidation on mutations
 * - Optimistic updates for create/delete
 * - Toast notifications for success/error states
 * - Loading and error state management
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from '@/app/actions/comments';
import type { InvoiceCommentWithRelations, CommentsListResponse } from '@/types/comment';

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Generate query key for comments list
 * Used for cache invalidation and refetching
 */
function commentsQueryKey(invoiceId: number, page?: number) {
  return page ? ['comments', invoiceId, page] : ['comments', invoiceId];
}

// ============================================================================
// READ HOOK
// ============================================================================

/**
 * Fetch paginated comments for an invoice
 *
 * @param invoiceId - Invoice ID
 * @param page - Page number (default 1)
 * @returns Query result with comments list and pagination
 */
export function useComments(invoiceId: number, page: number = 1) {
  return useQuery({
    queryKey: commentsQueryKey(invoiceId, page),
    queryFn: async () => {
      const result = await getComments(invoiceId, page);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes (formerly cacheTime)
  });
}

// ============================================================================
// CREATE HOOK
// ============================================================================

/**
 * Create new comment mutation
 * Includes optimistic update and automatic refetch
 *
 * @param invoiceId - Invoice ID
 * @returns Mutation object with mutate function
 */
export function useCreateComment(invoiceId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (content: string) => {
      const result = await createComment(invoiceId, content);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onMutate: async (content: string) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: commentsQueryKey(invoiceId) });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<CommentsListResponse>(
        commentsQueryKey(invoiceId, 1)
      );

      // Optimistically update to new value
      if (previousComments) {
        queryClient.setQueryData<CommentsListResponse>(
          commentsQueryKey(invoiceId, 1),
          {
            ...previousComments,
            comments: [
              {
                id: `temp-${Date.now()}`,
                invoice_id: invoiceId,
                user_id: 0, // Will be replaced with real data
                content,
                is_edited: false,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
                deleted_by: null,
                invoice: {
                  id: invoiceId,
                  invoice_number: '',
                },
                author: {
                  id: 0,
                  full_name: 'You',
                  email: '',
                },
              } as InvoiceCommentWithRelations,
              ...previousComments.comments,
            ],
            pagination: {
              ...previousComments.pagination,
              total: previousComments.pagination.total + 1,
            },
          }
        );
      }

      return { previousComments };
    },
    onError: (error, _content, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          commentsQueryKey(invoiceId, 1),
          context.previousComments
        );
      }

      toast({
        title: 'Failed to add comment',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted successfully',
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(invoiceId) });
    },
  });
}

// ============================================================================
// UPDATE HOOK
// ============================================================================

/**
 * Update comment mutation
 * Refetches comments after successful update
 *
 * @returns Mutation object with mutate function
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
      invoiceId,
    }: {
      commentId: string;
      content: string;
      invoiceId: number;
    }) => {
      const result = await updateComment(commentId, content);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { data: result.data, invoiceId };
    },
    onError: (error) => {
      toast({
        title: 'Failed to update comment',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: (_result, variables) => {
      toast({
        title: 'Comment updated',
        description: 'Your changes have been saved',
      });

      // Invalidate comments for the invoice
      queryClient.invalidateQueries({
        queryKey: commentsQueryKey(variables.invoiceId),
      });
    },
  });
}

// ============================================================================
// DELETE HOOK
// ============================================================================

/**
 * Delete comment mutation (soft delete)
 * Includes optimistic update and automatic refetch
 *
 * @returns Mutation object with mutate function
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      invoiceId,
    }: {
      commentId: string;
      invoiceId: number;
    }) => {
      const result = await deleteComment(commentId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { invoiceId, commentId };
    },
    onMutate: async ({ commentId, invoiceId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: commentsQueryKey(invoiceId) });

      // Snapshot previous value
      const previousComments = queryClient.getQueryData<CommentsListResponse>(
        commentsQueryKey(invoiceId, 1)
      );

      // Optimistically remove the comment
      if (previousComments) {
        queryClient.setQueryData<CommentsListResponse>(
          commentsQueryKey(invoiceId, 1),
          {
            ...previousComments,
            comments: previousComments.comments.filter((c) => c.id !== commentId),
            pagination: {
              ...previousComments.pagination,
              total: previousComments.pagination.total - 1,
            },
          }
        );
      }

      return { previousComments };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousComments) {
        queryClient.setQueryData(
          commentsQueryKey(variables.invoiceId, 1),
          context.previousComments
        );
      }

      toast({
        title: 'Failed to delete comment',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: (_result, variables) => {
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed',
      });

      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: commentsQueryKey(variables.invoiceId),
      });
    },
  });
}
