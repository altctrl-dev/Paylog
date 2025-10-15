/**
 * Activity Log Type Definitions
 *
 * Type-safe contracts for invoice activity logging.
 * Sprint 7: Activity Logging Foundation
 */

import type { ActivityAction } from '@/docs/SPRINT7_ACTIVITY_ACTIONS';

// ============================================================================
// DATABASE MODEL TYPES
// ============================================================================

/**
 * Base activity log type (from Prisma schema)
 */
export interface ActivityLog {
  id: string;
  invoice_id: number;
  user_id: number | null;
  action: ActivityAction;
  old_data: string | null; // JSON string
  new_data: string | null; // JSON string
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

/**
 * Activity log with relations (for detail views)
 */
export interface ActivityLogWithRelations extends ActivityLog {
  invoice: {
    id: number;
    invoice_number: string;
  };
  user: {
    id: number;
    full_name: string;
    email: string;
  } | null;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/**
 * Create activity log input
 * Used internally by server actions to create log entries
 */
export type ActivityLogInput = {
  invoice_id: number;
  user_id: number | null;
  action: ActivityAction;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
};

// ============================================================================
// FILTER TYPES
// ============================================================================

/**
 * Activity log filters for querying
 */
export type ActivityLogFilters = {
  page?: number;
  perPage?: number;
  action?: ActivityAction;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Paginated activity log list response
 */
export type ActivityLogListResponse = {
  entries: ActivityLogWithRelations[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Server action result type
 */
export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Parsed old/new data structure for display
 */
export type ActivityLogData = Record<string, any>;

/**
 * Activity log export format
 */
export type ActivityLogExportRow = {
  timestamp: string;
  user: string;
  action: string;
  invoice_number: string;
  changes: string;
};
