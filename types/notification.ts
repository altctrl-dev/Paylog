/**
 * Notification Types
 *
 * Type definitions for the notification system.
 */

// ============================================================================
// NOTIFICATION TYPES ENUM
// ============================================================================

export const NOTIFICATION_TYPE = {
  // Invoice notifications
  INVOICE_PENDING_APPROVAL: 'invoice_pending_approval',      // To admins: new invoice needs approval
  INVOICE_APPROVED: 'invoice_approved',                      // To requester: invoice was approved
  INVOICE_REJECTED: 'invoice_rejected',                      // To requester: invoice was rejected
  INVOICE_ON_HOLD: 'invoice_on_hold',                        // To requester: invoice placed on hold
  INVOICE_HOLD_RELEASED: 'invoice_hold_released',            // To requester: invoice released from hold

  // Master data request notifications
  MASTER_DATA_REQUEST_PENDING: 'master_data_request_pending', // To admins: new master data request
  MASTER_DATA_REQUEST_APPROVED: 'master_data_request_approved', // To requester: request approved
  MASTER_DATA_REQUEST_REJECTED: 'master_data_request_rejected', // To requester: request rejected

  // Archive request notifications
  ARCHIVE_REQUEST_PENDING: 'archive_request_pending',         // To admins: new archive request
  ARCHIVE_REQUEST_APPROVED: 'archive_request_approved',       // To requester: archive approved
  ARCHIVE_REQUEST_REJECTED: 'archive_request_rejected',       // To requester: archive rejected

  // Payment notifications
  PAYMENT_PENDING_APPROVAL: 'payment_pending_approval',  // To admins: new payment needs approval
  PAYMENT_APPROVED: 'payment_approved',                  // To requester: payment was approved
  PAYMENT_REJECTED: 'payment_rejected',                  // To requester: payment was rejected
} as const;

export type NotificationType = typeof NOTIFICATION_TYPE[keyof typeof NOTIFICATION_TYPE];

// ============================================================================
// REFERENCE TYPES
// ============================================================================

export const NOTIFICATION_REFERENCE_TYPE = {
  INVOICE: 'invoice',
  MASTER_DATA_REQUEST: 'master_data_request',
  VENDOR: 'vendor',
  CATEGORY: 'category',
  PAYMENT_TYPE: 'payment_type',
  INVOICE_PROFILE: 'invoice_profile',
  PAYMENT: 'payment',
} as const;

export type NotificationReferenceType = typeof NOTIFICATION_REFERENCE_TYPE[keyof typeof NOTIFICATION_REFERENCE_TYPE];

// ============================================================================
// NOTIFICATION INTERFACE
// ============================================================================

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  reference_type: NotificationReferenceType | null;
  reference_id: number | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}

export interface NotificationWithUser extends Notification {
  user: {
    id: number;
    full_name: string;
    email: string;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface NotificationListResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
}

export interface ServerActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
