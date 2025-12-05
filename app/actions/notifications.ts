/**
 * Server Actions: Notification Operations
 *
 * Handles notification CRUD operations and role-based notification creation.
 */

'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_REFERENCE_TYPE,
  type Notification,
  type NotificationListResponse,
  type ServerActionResult,
  type NotificationType,
  type NotificationReferenceType,
} from '@/types/notification';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user
 */
async function getCurrentUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error('Unauthorized: You must be logged in');
  }

  return {
    id: parseInt(session.user.id),
    email: session.user.email!,
    role: session.user.role as string,
  };
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get notifications for current user
 *
 * @param limit - Number of notifications to fetch (default 20)
 * @param includeRead - Whether to include read notifications (default false)
 * @returns List of notifications with counts
 */
export async function getNotifications(
  limit: number = 20,
  includeRead: boolean = true
): Promise<ServerActionResult<NotificationListResponse>> {
  try {
    const user = await getCurrentUser();

    const whereClause = {
      user_id: user.id,
      ...(includeRead ? {} : { is_read: false }),
    };

    const [notifications, unreadCount, totalCount] = await Promise.all([
      db.notification.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        take: limit,
      }),
      db.notification.count({
        where: { user_id: user.id, is_read: false },
      }),
      db.notification.count({
        where: { user_id: user.id },
      }),
    ]);

    return {
      success: true,
      data: {
        notifications: notifications as Notification[],
        unread_count: unreadCount,
        total_count: totalCount,
      },
    };
  } catch (error) {
    console.error('getNotifications error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch notifications',
    };
  }
}

/**
 * Get unread notification count for current user
 */
export async function getUnreadCount(): Promise<ServerActionResult<number>> {
  try {
    const user = await getCurrentUser();

    const count = await db.notification.count({
      where: {
        user_id: user.id,
        is_read: false,
      },
    });

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get unread count',
    };
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: number
): Promise<ServerActionResult<void>> {
  try {
    const user = await getCurrentUser();

    // Verify notification belongs to user
    const notification = await db.notification.findFirst({
      where: {
        id: notificationId,
        user_id: user.id,
      },
    });

    if (!notification) {
      return {
        success: false,
        error: 'Notification not found',
      };
    }

    await db.notification.update({
      where: { id: notificationId },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('markAsRead error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark notification as read',
    };
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllAsRead(): Promise<ServerActionResult<void>> {
  try {
    const user = await getCurrentUser();

    await db.notification.updateMany({
      where: {
        user_id: user.id,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('markAllAsRead error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark all as read',
    };
  }
}

// ============================================================================
// CREATE OPERATIONS (Internal use)
// ============================================================================

interface CreateNotificationParams {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  referenceType?: NotificationReferenceType;
  referenceId?: number;
}

/**
 * Create a notification for a specific user (internal use)
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<ServerActionResult<Notification>> {
  try {
    const notification = await db.notification.create({
      data: {
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        reference_type: params.referenceType || null,
        reference_id: params.referenceId || null,
      },
    });

    return {
      success: true,
      data: notification as Notification,
    };
  } catch (error) {
    console.error('createNotification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create notification',
    };
  }
}

/**
 * Create notifications for all admins (for pending requests)
 */
export async function notifyAdmins(
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<ServerActionResult<number>> {
  try {
    // Get all admin and super_admin users
    const admins = await db.user.findMany({
      where: {
        role: { in: ['admin', 'super_admin'] },
        is_active: true,
      },
      select: { id: true },
    });

    if (admins.length === 0) {
      return { success: true, data: 0 };
    }

    // Create notifications for all admins
    await db.notification.createMany({
      data: admins.map((admin) => ({
        user_id: admin.id,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        reference_type: params.referenceType || null,
        reference_id: params.referenceId || null,
      })),
    });

    return {
      success: true,
      data: admins.length,
    };
  } catch (error) {
    console.error('notifyAdmins error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to notify admins',
    };
  }
}

// ============================================================================
// NOTIFICATION HELPER FUNCTIONS (for use in other actions)
// ============================================================================

/**
 * Notify admins about a new invoice pending approval
 */
export async function notifyInvoicePendingApproval(
  invoiceId: number,
  invoiceNumber: string,
  requesterName: string
): Promise<void> {
  await notifyAdmins({
    type: NOTIFICATION_TYPE.INVOICE_PENDING_APPROVAL,
    title: 'New Invoice Pending Approval',
    message: `${requesterName} submitted invoice ${invoiceNumber} for approval`,
    link: `/invoices?highlight=${invoiceId}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
    referenceId: invoiceId,
  });
}

/**
 * Notify user about invoice approval
 */
export async function notifyInvoiceApproved(
  userId: number,
  invoiceId: number,
  invoiceNumber: string
): Promise<void> {
  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.INVOICE_APPROVED,
    title: 'Invoice Approved',
    message: `Your invoice ${invoiceNumber} has been approved`,
    link: `/invoices?highlight=${invoiceId}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
    referenceId: invoiceId,
  });
}

/**
 * Notify user about invoice rejection
 */
export async function notifyInvoiceRejected(
  userId: number,
  invoiceId: number,
  invoiceNumber: string,
  reason?: string
): Promise<void> {
  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.INVOICE_REJECTED,
    title: 'Invoice Rejected',
    message: reason
      ? `Your invoice ${invoiceNumber} was rejected: ${reason}`
      : `Your invoice ${invoiceNumber} was rejected`,
    link: `/invoices?highlight=${invoiceId}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
    referenceId: invoiceId,
  });
}

/**
 * Notify user about invoice placed on hold
 */
export async function notifyInvoiceOnHold(
  userId: number,
  invoiceId: number,
  invoiceNumber: string,
  reason?: string
): Promise<void> {
  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.INVOICE_ON_HOLD,
    title: 'Invoice On Hold',
    message: reason
      ? `Your invoice ${invoiceNumber} was placed on hold: ${reason}`
      : `Your invoice ${invoiceNumber} was placed on hold`,
    link: `/invoices?highlight=${invoiceId}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.INVOICE,
    referenceId: invoiceId,
  });
}

/**
 * Notify admins about a new master data request
 */
export async function notifyMasterDataRequestPending(
  requestId: number,
  entityType: string,
  requesterName: string
): Promise<void> {
  const entityLabel = entityType.replace(/_/g, ' ');
  await notifyAdmins({
    type: NOTIFICATION_TYPE.MASTER_DATA_REQUEST_PENDING,
    title: `New ${entityLabel} Request`,
    message: `${requesterName} submitted a new ${entityLabel} request`,
    link: `/admin?tab=master-data&subtab=requests&highlight=${requestId}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.MASTER_DATA_REQUEST,
    referenceId: requestId,
  });
}

/**
 * Notify user about master data request approval
 */
export async function notifyMasterDataRequestApproved(
  userId: number,
  requestId: number,
  entityType: string
): Promise<void> {
  const entityLabel = entityType.replace(/_/g, ' ');
  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.MASTER_DATA_REQUEST_APPROVED,
    title: `${entityLabel} Request Approved`,
    message: `Your ${entityLabel} request has been approved`,
    link: `/admin?tab=master-data&subtab=requests`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.MASTER_DATA_REQUEST,
    referenceId: requestId,
  });
}

/**
 * Notify user about master data request rejection
 */
export async function notifyMasterDataRequestRejected(
  userId: number,
  requestId: number,
  entityType: string,
  reason?: string
): Promise<void> {
  const entityLabel = entityType.replace(/_/g, ' ');
  await createNotification({
    userId,
    type: NOTIFICATION_TYPE.MASTER_DATA_REQUEST_REJECTED,
    title: `${entityLabel} Request Rejected`,
    message: reason
      ? `Your ${entityLabel} request was rejected: ${reason}`
      : `Your ${entityLabel} request was rejected`,
    link: `/admin?tab=master-data&subtab=requests`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.MASTER_DATA_REQUEST,
    referenceId: requestId,
  });
}

/**
 * Notify admins about a new archive request
 */
export async function notifyArchiveRequestPending(
  requestId: number,
  invoiceNumber: string,
  requesterName: string
): Promise<void> {
  await notifyAdmins({
    type: NOTIFICATION_TYPE.ARCHIVE_REQUEST_PENDING,
    title: 'New Archive Request',
    message: `${requesterName} requested to archive invoice ${invoiceNumber}`,
    link: `/admin?tab=master-data&subtab=requests&highlight=${requestId}`,
    referenceType: NOTIFICATION_REFERENCE_TYPE.MASTER_DATA_REQUEST,
    referenceId: requestId,
  });
}
