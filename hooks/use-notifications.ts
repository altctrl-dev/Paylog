/**
 * React Query Hooks for Notification Operations
 *
 * Type-safe hooks for fetching and managing notifications with real-time polling.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/app/actions/notifications';
import type { NotificationListResponse } from '@/types/notification';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (params?: { limit?: number; includeRead?: boolean }) =>
    [...notificationKeys.lists(), params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch notifications for current user with polling
 *
 * @param limit - Number of notifications to fetch (default 20)
 * @param includeRead - Whether to include read notifications (default true)
 * @returns Query result with notifications and counts
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useNotifications({ limit: 10 });
 * ```
 */
export function useNotifications(params?: { limit?: number; includeRead?: boolean }) {
  const { limit = 20, includeRead = true } = params || {};

  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const result = await getNotifications(limit, includeRead);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Poll every 60 seconds for new notifications
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch unread notification count for badge display
 *
 * @returns Query result with unread count
 *
 * @example
 * ```tsx
 * const { data: unreadCount } = useUnreadNotificationCount();
 * ```
 */
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const result = await getUnreadCount();
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Mark a notification as read
 *
 * @returns Mutation hook with markAsRead function
 *
 * @example
 * ```tsx
 * const markReadMutation = useMarkNotificationAsRead();
 * await markReadMutation.mutateAsync(notificationId);
 * ```
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const result = await markAsRead(notificationId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return { id: notificationId };
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData<NotificationListResponse>(
        notificationKeys.list()
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationKeys.unreadCount()
      );

      // Optimistically update notifications list
      if (previousNotifications) {
        queryClient.setQueryData<NotificationListResponse>(notificationKeys.list(), {
          ...previousNotifications,
          notifications: previousNotifications.notifications.map((n) =>
            n.id === notificationId ? { ...n, is_read: true, read_at: new Date() } : n
          ),
          unread_count: Math.max(0, previousNotifications.unread_count - 1),
        });
      }

      // Optimistically update unread count
      if (typeof previousUnreadCount === 'number') {
        queryClient.setQueryData<number>(
          notificationKeys.unreadCount(),
          Math.max(0, previousUnreadCount - 1)
        );
      }

      return { previousNotifications, previousUnreadCount };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.list(), context.previousNotifications);
      }
      if (typeof context?.previousUnreadCount === 'number') {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnreadCount);
      }
    },
    onSettled: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

/**
 * Mark all notifications as read
 *
 * @returns Mutation hook with markAllAsRead function
 *
 * @example
 * ```tsx
 * const markAllReadMutation = useMarkAllNotificationsAsRead();
 * await markAllReadMutation.mutateAsync();
 * ```
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const result = await markAllAsRead();
      if (!result.success) {
        throw new Error(result.error);
      }
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount() });

      // Snapshot previous values
      const previousNotifications = queryClient.getQueryData<NotificationListResponse>(
        notificationKeys.list()
      );
      const previousUnreadCount = queryClient.getQueryData<number>(
        notificationKeys.unreadCount()
      );

      // Optimistically update notifications list
      if (previousNotifications) {
        queryClient.setQueryData<NotificationListResponse>(notificationKeys.list(), {
          ...previousNotifications,
          notifications: previousNotifications.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.read_at || new Date(),
          })),
          unread_count: 0,
        });
      }

      // Optimistically update unread count
      queryClient.setQueryData<number>(notificationKeys.unreadCount(), 0);

      return { previousNotifications, previousUnreadCount };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationKeys.list(), context.previousNotifications);
      }
      if (typeof context?.previousUnreadCount === 'number') {
        queryClient.setQueryData(notificationKeys.unreadCount(), context.previousUnreadCount);
      }

      toast({
        title: 'Error',
        description: error.message || 'Failed to mark all as read',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    },
    onSettled: () => {
      // Invalidate queries to refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}
