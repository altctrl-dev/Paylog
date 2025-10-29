/**
 * Dashboard Type Definitions
 *
 * Type-safe contracts for dashboard data operations.
 * Sprint 12, Phase 1: Data Layer & Server Actions
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Date range options for dashboard filters
 */
export const DATE_RANGE = {
  ONE_MONTH: '1M',
  THREE_MONTHS: '3M',
  SIX_MONTHS: '6M',
  ONE_YEAR: '1Y',
  ALL_TIME: 'ALL',
} as const;

export type DateRange = (typeof DATE_RANGE)[keyof typeof DATE_RANGE];

/**
 * Activity types for recent activity feed
 */
export const ACTIVITY_TYPE = {
  CREATED: 'created',
  PAID: 'paid',
  STATUS_CHANGE: 'status_change',
  REJECTED: 'rejected',
} as const;

export type ActivityType = (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE];

// ============================================================================
// KPI TYPES
// ============================================================================

/**
 * Dashboard KPI metrics
 */
export interface DashboardKPIs {
  totalInvoices: number;
  pendingApprovals: number;
  totalUnpaid: number;
  totalPaidCurrentMonth: number;
  overdueInvoices: number;
  onHoldInvoices: number;
}

// ============================================================================
// CHART DATA TYPES
// ============================================================================

/**
 * Invoice status breakdown (pie chart)
 */
export interface StatusBreakdownItem {
  status: string;
  count: number;
  value: number;
}

/**
 * Payment trends over time (line chart)
 */
export interface PaymentTrendItem {
  date: string; // ISO 8601 date string (YYYY-MM)
  amount: number;
  count: number;
}

/**
 * Top vendors by spending (bar chart)
 */
export interface VendorSpendingItem {
  vendor_name: string;
  total_amount: number;
  invoice_count: number;
}

/**
 * Monthly invoice volume (line chart)
 */
export interface InvoiceVolumeItem {
  date: string; // ISO 8601 date string (YYYY-MM)
  count: number;
}

// ============================================================================
// ACTIVITY FEED TYPES
// ============================================================================

/**
 * Recent activity item
 */
export interface RecentActivityItem {
  id: string;
  type: ActivityType;
  invoice_id: number;
  invoice_number: string;
  description: string;
  user_name: string;
  timestamp: Date;
}

// ============================================================================
// SERVER ACTION RESULT TYPE
// ============================================================================

/**
 * Generic server action result type
 * Reuses pattern from types/invoice.ts
 */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
