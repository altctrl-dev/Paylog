// ============================================================================
// Sprint 7: Activity Action Enum (Application Layer)
// ============================================================================
//
// SQLite has no native enum support, so actions are stored as strings.
// This TypeScript enum ensures consistency across the application.
//
// Usage:
// - Import: import { ACTIVITY_ACTION, ActivityAction } from '@/types/activity';
// - Create log: await createActivityLog({ action: ACTIVITY_ACTION.INVOICE_APPROVED, ... });
// - Type guard: if (log.action === ACTIVITY_ACTION.INVOICE_APPROVED) { ... }
//
// Database Storage: activity_logs.action (TEXT field)
// ============================================================================

export const ACTIVITY_ACTION = {
  // ============================================================================
  // INVOICE LIFECYCLE ACTIONS
  // ============================================================================

  /** Invoice created by user */
  INVOICE_CREATED: 'invoice_created',

  /** Invoice fields updated (not status change) */
  INVOICE_UPDATED: 'invoice_updated',

  /** Invoice approved by admin (status: pending_approval → unpaid) */
  INVOICE_APPROVED: 'invoice_approved',

  /** Invoice rejected by admin (status: pending_approval → rejected) */
  INVOICE_REJECTED: 'invoice_rejected',

  /** Invoice placed on hold by admin (status: pending_approval → on_hold) */
  INVOICE_HOLD_PLACED: 'invoice_hold_placed',

  /** Invoice released from hold by admin (status: on_hold → pending_approval) */
  INVOICE_HOLD_RELEASED: 'invoice_hold_released',

  /** Invoice archived by admin (moves files to Archived folder) */
  INVOICE_ARCHIVED: 'invoice_archived',

  /** Invoice duplicated by user (creates copy with new invoice_number) */
  INVOICE_DUPLICATED: 'invoice_duplicated',

  /** Invoice deleted by super_admin (hard delete, cascade to payments/attachments) */
  INVOICE_DELETED: 'invoice_deleted',

  /** Invoice recovered from deleted state by super_admin (within 30-day recovery window) */
  INVOICE_RECOVERED: 'invoice_recovered',

  // ============================================================================
  // PAYMENT ACTIONS
  // ============================================================================

  /** Payment added to invoice (may trigger status change to partial/paid) */
  PAYMENT_ADDED: 'payment_added',

  /** Payment approved by admin (status: pending → approved) */
  PAYMENT_APPROVED: 'payment_approved',

  /** Payment rejected by admin (status: pending → rejected) */
  PAYMENT_REJECTED: 'payment_rejected',

  /** Payment updated (amount, date, or payment type changed) */
  PAYMENT_UPDATED: 'payment_updated',

  /** Payment deleted from invoice (may trigger status change back to unpaid) */
  PAYMENT_DELETED: 'payment_deleted',

  // ============================================================================
  // COMMENT ACTIONS
  // ============================================================================

  /** Comment added to invoice */
  COMMENT_ADDED: 'comment_added',

  /** Comment edited by author (content updated, is_edited: true) */
  COMMENT_EDITED: 'comment_edited',

  /** Comment soft-deleted by author or admin (deleted_at timestamp set) */
  COMMENT_DELETED: 'comment_deleted',

  // ============================================================================
  // ATTACHMENT ACTIONS
  // ============================================================================

  /** File uploaded to invoice (PDF, image, etc.) */
  ATTACHMENT_UPLOADED: 'attachment_uploaded',

  /** Attachment soft-deleted by uploader or admin (deleted_at timestamp set) */
  ATTACHMENT_DELETED: 'attachment_deleted',

  // ============================================================================
  // BULK OPERATIONS (Sprint 7)
  // ============================================================================

  /** Bulk approve operation (multiple invoices approved at once) */
  BULK_APPROVE: 'bulk_approve',

  /** Bulk reject operation (multiple invoices rejected with same reason) */
  BULK_REJECT: 'bulk_reject',

  /** Bulk export operation (invoices exported to CSV) */
  BULK_EXPORT: 'bulk_export',

  /** Bulk delete operation (multiple invoices deleted by super_admin) */
  BULK_DELETE: 'bulk_delete',

  /** Bulk archive operation (multiple invoices archived or archive request created) */
  BULK_ARCHIVE: 'bulk_archive',

  /** Invoice permanently purged from database (after soft delete) */
  INVOICE_PURGED: 'invoice_purged',

} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Union type of all activity action values */
export type ActivityAction = typeof ACTIVITY_ACTION[keyof typeof ACTIVITY_ACTION];

/** Type guard to check if a string is a valid activity action */
export function isValidActivityAction(action: string): action is ActivityAction {
  return Object.values(ACTIVITY_ACTION).includes(action as ActivityAction);
}

/** Human-readable labels for activity actions (for UI display) */
export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  [ACTIVITY_ACTION.INVOICE_CREATED]: 'Created invoice',
  [ACTIVITY_ACTION.INVOICE_UPDATED]: 'Updated invoice',
  [ACTIVITY_ACTION.INVOICE_APPROVED]: 'Approved invoice',
  [ACTIVITY_ACTION.INVOICE_REJECTED]: 'Rejected invoice',
  [ACTIVITY_ACTION.INVOICE_HOLD_PLACED]: 'Placed invoice on hold',
  [ACTIVITY_ACTION.INVOICE_HOLD_RELEASED]: 'Released invoice from hold',
  [ACTIVITY_ACTION.INVOICE_ARCHIVED]: 'Archived invoice',
  [ACTIVITY_ACTION.INVOICE_DUPLICATED]: 'Duplicated invoice',
  [ACTIVITY_ACTION.INVOICE_DELETED]: 'Deleted invoice',
  [ACTIVITY_ACTION.INVOICE_RECOVERED]: 'Recovered invoice',
  [ACTIVITY_ACTION.PAYMENT_ADDED]: 'Added payment',
  [ACTIVITY_ACTION.PAYMENT_APPROVED]: 'Approved payment',
  [ACTIVITY_ACTION.PAYMENT_REJECTED]: 'Rejected payment',
  [ACTIVITY_ACTION.PAYMENT_UPDATED]: 'Updated payment',
  [ACTIVITY_ACTION.PAYMENT_DELETED]: 'Deleted payment',
  [ACTIVITY_ACTION.COMMENT_ADDED]: 'Added comment',
  [ACTIVITY_ACTION.COMMENT_EDITED]: 'Edited comment',
  [ACTIVITY_ACTION.COMMENT_DELETED]: 'Deleted comment',
  [ACTIVITY_ACTION.ATTACHMENT_UPLOADED]: 'Uploaded attachment',
  [ACTIVITY_ACTION.ATTACHMENT_DELETED]: 'Deleted attachment',
  [ACTIVITY_ACTION.BULK_APPROVE]: 'Bulk approved invoices',
  [ACTIVITY_ACTION.BULK_REJECT]: 'Bulk rejected invoices',
  [ACTIVITY_ACTION.BULK_EXPORT]: 'Exported invoices to CSV',
  [ACTIVITY_ACTION.BULK_DELETE]: 'Bulk deleted invoices',
  [ACTIVITY_ACTION.BULK_ARCHIVE]: 'Bulk archived invoices',
  [ACTIVITY_ACTION.INVOICE_PURGED]: 'Permanently purged invoice',
};

/** Icon names for activity actions (for UI display with icon libraries like Lucide) */
export const ACTIVITY_ACTION_ICONS: Record<ActivityAction, string> = {
  [ACTIVITY_ACTION.INVOICE_CREATED]: 'FileText',
  [ACTIVITY_ACTION.INVOICE_UPDATED]: 'Edit',
  [ACTIVITY_ACTION.INVOICE_APPROVED]: 'CheckCircle',
  [ACTIVITY_ACTION.INVOICE_REJECTED]: 'XCircle',
  [ACTIVITY_ACTION.INVOICE_HOLD_PLACED]: 'Pause',
  [ACTIVITY_ACTION.INVOICE_HOLD_RELEASED]: 'Play',
  [ACTIVITY_ACTION.INVOICE_ARCHIVED]: 'Archive',
  [ACTIVITY_ACTION.INVOICE_DUPLICATED]: 'Copy',
  [ACTIVITY_ACTION.INVOICE_DELETED]: 'Trash2',
  [ACTIVITY_ACTION.INVOICE_RECOVERED]: 'RotateCcw',
  [ACTIVITY_ACTION.PAYMENT_ADDED]: 'DollarSign',
  [ACTIVITY_ACTION.PAYMENT_APPROVED]: 'CheckCircle',
  [ACTIVITY_ACTION.PAYMENT_REJECTED]: 'XCircle',
  [ACTIVITY_ACTION.PAYMENT_UPDATED]: 'DollarSign',
  [ACTIVITY_ACTION.PAYMENT_DELETED]: 'DollarSign',
  [ACTIVITY_ACTION.COMMENT_ADDED]: 'MessageSquare',
  [ACTIVITY_ACTION.COMMENT_EDITED]: 'MessageSquare',
  [ACTIVITY_ACTION.COMMENT_DELETED]: 'MessageSquare',
  [ACTIVITY_ACTION.ATTACHMENT_UPLOADED]: 'Paperclip',
  [ACTIVITY_ACTION.ATTACHMENT_DELETED]: 'Paperclip',
  [ACTIVITY_ACTION.BULK_APPROVE]: 'CheckSquare',
  [ACTIVITY_ACTION.BULK_REJECT]: 'XSquare',
  [ACTIVITY_ACTION.BULK_EXPORT]: 'Download',
  [ACTIVITY_ACTION.BULK_DELETE]: 'Trash',
  [ACTIVITY_ACTION.BULK_ARCHIVE]: 'Archive',
  [ACTIVITY_ACTION.INVOICE_PURGED]: 'Trash2',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get human-readable label for activity action
 * @param action Activity action enum value
 * @returns Human-readable label (e.g., "Created invoice")
 */
export function getActivityActionLabel(action: ActivityAction): string {
  return ACTIVITY_ACTION_LABELS[action] || action;
}

/**
 * Get icon name for activity action
 * @param action Activity action enum value
 * @returns Icon name compatible with Lucide (e.g., "FileText")
 */
export function getActivityActionIcon(action: ActivityAction): string {
  return ACTIVITY_ACTION_ICONS[action] || 'Info';
}

/**
 * Format activity action for display with user name
 * @param action Activity action enum value
 * @param userName User who performed action (e.g., "John Doe")
 * @returns Formatted string (e.g., "John Doe approved invoice")
 */
export function formatActivityAction(action: ActivityAction, userName: string): string {
  const label = getActivityActionLabel(action).toLowerCase();
  return `${userName} ${label}`;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

/*
// Creating activity log entry:
import { ACTIVITY_ACTION } from '@/lib/constants/activity';
import { createActivityLog } from '@/app/actions/activity-log';

await createActivityLog({
  invoice_id: 123,
  user_id: 456,
  action: ACTIVITY_ACTION.INVOICE_APPROVED,
  old_data: JSON.stringify({ status: 'pending_approval' }),
  new_data: JSON.stringify({ status: 'unpaid' }),
  ip_address: req.ip,
  user_agent: req.headers['user-agent']
});

// Displaying activity log entry:
import { getActivityActionLabel, getActivityActionIcon } from '@/lib/constants/activity';
import { FileText, CheckCircle } from 'lucide-react';

const iconName = getActivityActionIcon(log.action); // 'CheckCircle'
const label = getActivityActionLabel(log.action); // 'Approved invoice'

<div>
  <CheckCircle className="h-4 w-4" />
  <span>{label}</span>
</div>
*/

// ============================================================================
// VALIDATION SCHEMA (for use with Zod)
// ============================================================================

/*
import { z } from 'zod';

// Zod schema for activity action validation
export const activityActionSchema = z.enum([
  ACTIVITY_ACTION.INVOICE_CREATED,
  ACTIVITY_ACTION.INVOICE_UPDATED,
  ACTIVITY_ACTION.INVOICE_APPROVED,
  ACTIVITY_ACTION.INVOICE_REJECTED,
  ACTIVITY_ACTION.INVOICE_HOLD_PLACED,
  ACTIVITY_ACTION.INVOICE_HOLD_RELEASED,
  ACTIVITY_ACTION.INVOICE_ARCHIVED,
  ACTIVITY_ACTION.INVOICE_DUPLICATED,
  ACTIVITY_ACTION.INVOICE_DELETED,
  ACTIVITY_ACTION.PAYMENT_ADDED,
  ACTIVITY_ACTION.PAYMENT_APPROVED,
  ACTIVITY_ACTION.PAYMENT_REJECTED,
  ACTIVITY_ACTION.PAYMENT_UPDATED,
  ACTIVITY_ACTION.PAYMENT_DELETED,
  ACTIVITY_ACTION.COMMENT_ADDED,
  ACTIVITY_ACTION.COMMENT_EDITED,
  ACTIVITY_ACTION.COMMENT_DELETED,
  ACTIVITY_ACTION.ATTACHMENT_UPLOADED,
  ACTIVITY_ACTION.ATTACHMENT_DELETED,
  ACTIVITY_ACTION.BULK_APPROVE,
  ACTIVITY_ACTION.BULK_REJECT,
  ACTIVITY_ACTION.BULK_EXPORT,
  ACTIVITY_ACTION.BULK_DELETE,
]);

// Usage in server action validation
const createActivityLogSchema = z.object({
  invoice_id: z.number().int().positive(),
  user_id: z.number().int().positive().nullable(),
  action: activityActionSchema,
  old_data: z.string().optional(),
  new_data: z.string().optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().optional(),
});
*/
