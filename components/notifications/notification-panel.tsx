/**
 * Notification Panel Component
 *
 * Displays notifications in a popover with:
 * - Unread count badge on bell icon
 * - List of notifications with type icons
 * - Mark as read on click
 * - Mark all as read action
 * - Empty state when no notifications
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  FileText,
  Database,
  Archive,
  CheckCheck,
  Loader2,
  IndianRupee,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/use-notifications';
import {
  NOTIFICATION_TYPE,
  type Notification,
  type NotificationType,
} from '@/types/notification';

// ============================================================================
// Types & Constants
// ============================================================================

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: number) => void;
  onClick: (notification: Notification) => void;
}

// Map notification types to icons and styles
const notificationConfig: Record<
  NotificationType,
  { icon: React.ElementType; colorClass: string; label: string }
> = {
  [NOTIFICATION_TYPE.INVOICE_PENDING_APPROVAL]: {
    icon: FileText,
    colorClass: 'text-amber-500',
    label: 'Invoice Approval',
  },
  [NOTIFICATION_TYPE.INVOICE_APPROVED]: {
    icon: FileText,
    colorClass: 'text-green-500',
    label: 'Invoice Approved',
  },
  [NOTIFICATION_TYPE.INVOICE_REJECTED]: {
    icon: FileText,
    colorClass: 'text-red-500',
    label: 'Invoice Rejected',
  },
  [NOTIFICATION_TYPE.INVOICE_ON_HOLD]: {
    icon: FileText,
    colorClass: 'text-orange-500',
    label: 'Invoice On Hold',
  },
  [NOTIFICATION_TYPE.INVOICE_HOLD_RELEASED]: {
    icon: FileText,
    colorClass: 'text-blue-500',
    label: 'Invoice Released',
  },
  [NOTIFICATION_TYPE.MASTER_DATA_REQUEST_PENDING]: {
    icon: Database,
    colorClass: 'text-amber-500',
    label: 'Master Data Request',
  },
  [NOTIFICATION_TYPE.MASTER_DATA_REQUEST_APPROVED]: {
    icon: Database,
    colorClass: 'text-green-500',
    label: 'Request Approved',
  },
  [NOTIFICATION_TYPE.MASTER_DATA_REQUEST_REJECTED]: {
    icon: Database,
    colorClass: 'text-red-500',
    label: 'Request Rejected',
  },
  [NOTIFICATION_TYPE.ARCHIVE_REQUEST_PENDING]: {
    icon: Archive,
    colorClass: 'text-amber-500',
    label: 'Archive Request',
  },
  [NOTIFICATION_TYPE.ARCHIVE_REQUEST_APPROVED]: {
    icon: Archive,
    colorClass: 'text-green-500',
    label: 'Archive Approved',
  },
  [NOTIFICATION_TYPE.ARCHIVE_REQUEST_REJECTED]: {
    icon: Archive,
    colorClass: 'text-red-500',
    label: 'Archive Rejected',
  },
  // Payment notifications
  [NOTIFICATION_TYPE.PAYMENT_PENDING_APPROVAL]: {
    icon: IndianRupee,
    colorClass: 'text-purple-500',
    label: 'Payment Approval',
  },
  [NOTIFICATION_TYPE.PAYMENT_APPROVED]: {
    icon: IndianRupee,
    colorClass: 'text-green-500',
    label: 'Payment Approved',
  },
  [NOTIFICATION_TYPE.PAYMENT_REJECTED]: {
    icon: IndianRupee,
    colorClass: 'text-red-500',
    label: 'Payment Rejected',
  },
};

// ============================================================================
// Sub-components
// ============================================================================

function NotificationItem({ notification, onRead, onClick }: NotificationItemProps) {
  const config = notificationConfig[notification.type] || {
    icon: Bell,
    colorClass: 'text-muted-foreground',
    label: 'Notification',
  };
  const Icon = config.icon;

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 text-left transition-colors rounded-md',
        'hover:bg-muted/50',
        !notification.is_read && 'bg-muted/30'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 mt-0.5 p-1.5 rounded-full bg-muted',
          config.colorClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              !notification.is_read && 'text-foreground',
              notification.is_read && 'text-muted-foreground'
            )}
          >
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <Bell className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No notifications</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        You&apos;re all caught up!
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function NotificationPanel() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Queries
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notificationsData, isLoading } = useNotifications({
    limit: 20,
    includeRead: true,
  });

  // Mutations
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = notificationsData?.notifications || [];
  const hasUnread = unreadCount > 0;

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      setOpen(false);
      router.push(notification.link);
    }
  };

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="subtle" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span
              className={cn(
                'absolute flex items-center justify-center',
                'min-w-[18px] h-[18px] px-1 -top-0.5 -right-0.5',
                'text-[10px] font-medium text-white',
                'bg-red-500 rounded-full'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">
            Notifications {hasUnread && `(${unreadCount} unread)`}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <LoadingState />
          ) : notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleMarkAsRead}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground"
              onClick={() => {
                setOpen(false);
                router.push('/notifications');
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationPanel;
