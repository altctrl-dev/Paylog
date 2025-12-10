/**
 * Custom Hook for Invoice Panel V3
 *
 * Combines data fetching with permission logic for the invoice panel.
 * Centralizes all invoice-related state and computed values.
 */

'use client';

import { useMemo } from 'react';
import { useInvoiceV2 } from '@/hooks/use-invoices-v2';
import { usePaymentSummary } from '@/hooks/use-payments';
import { INVOICE_STATUS } from '@/types/invoice';
import type { PaymentSummary } from '@/types/payment';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Infer the invoice type from the useInvoiceV2 hook return
 * This ensures type compatibility with the actual Prisma-generated types
 */
type InvoiceV2Data = NonNullable<ReturnType<typeof useInvoiceV2>['data']>;

/**
 * Re-export the inferred invoice type for external use
 */
export type { InvoiceV2Data as InvoicePanelData };

export interface UseInvoicePanelV3Props {
  invoiceId: number;
  userRole?: string;
  userId?: string;
}

export interface InvoicePanelPermissions {
  canEdit: boolean;
  canRecordPayment: boolean;
  canPutOnHold: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canReject: boolean;
}

export interface UseInvoicePanelV3Return {
  // Data
  invoice: InvoiceV2Data | undefined;
  paymentSummary: PaymentSummary | undefined;
  isLoading: boolean;
  error: Error | null;

  // Permissions
  permissions: InvoicePanelPermissions;

  // Computed values
  hasRemainingBalance: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Custom hook for Invoice Panel V3
 *
 * Provides:
 * - Invoice data fetching via useInvoiceV2
 * - Payment summary fetching via usePaymentSummary
 * - Permission calculations based on user role and invoice state
 * - Computed values for UI logic
 *
 * @param props - Hook configuration
 * @returns Combined data, permissions, and computed values
 *
 * @example
 * ```tsx
 * const {
 *   invoice,
 *   paymentSummary,
 *   isLoading,
 *   error,
 *   permissions,
 *   hasRemainingBalance,
 *   isAdmin,
 * } = useInvoicePanelV3({ invoiceId: 123, userRole: 'admin', userId: '1' });
 *
 * if (permissions.canApprove) {
 *   // Show approve button
 * }
 * ```
 */
export function useInvoicePanelV3({
  invoiceId,
  userRole,
  userId,
}: UseInvoicePanelV3Props): UseInvoicePanelV3Return {
  // Data fetching
  const {
    data: invoice,
    isLoading: isInvoiceLoading,
    error: invoiceError,
  } = useInvoiceV2(invoiceId);

  const {
    data: paymentSummary,
    isLoading: isPaymentLoading,
  } = usePaymentSummary(invoiceId);

  // Role-based flags (memoized to prevent recalculation)
  const isAdmin = useMemo(
    () => userRole === 'admin' || userRole === 'super_admin',
    [userRole]
  );

  const isSuperAdmin = useMemo(
    () => userRole === 'super_admin',
    [userRole]
  );

  const isOwner = useMemo(
    () => invoice?.created_by === Number(userId),
    [invoice?.created_by, userId]
  );

  // Invoice state flags
  const isInvoicePending = useMemo(
    () => invoice?.status === INVOICE_STATUS.PENDING_APPROVAL,
    [invoice?.status]
  );

  // Computed: has remaining balance to pay
  // Falls back to status check if payment summary not yet loaded
  const hasRemainingBalance = useMemo(() => {
    if (paymentSummary) {
      return paymentSummary.remaining_balance > 0;
    }
    // Fallback: assume balance exists if status indicates unpaid/partial/overdue
    return (
      invoice?.status === INVOICE_STATUS.UNPAID ||
      invoice?.status === INVOICE_STATUS.PARTIAL ||
      invoice?.status === INVOICE_STATUS.OVERDUE
    );
  }, [paymentSummary, invoice?.status]);

  // Permission calculations (memoized)
  const permissions = useMemo<InvoicePanelPermissions>(() => {
    // Edit: Admins always can edit, owners can edit if not pending approval
    const canEdit = isAdmin || (isOwner && !isInvoicePending);

    // Approve/Reject: Admin only, invoice must be pending approval
    const canApprove =
      invoice?.status === INVOICE_STATUS.PENDING_APPROVAL && isAdmin;
    const canReject =
      invoice?.status === INVOICE_STATUS.PENDING_APPROVAL && isAdmin;

    // Put On Hold: Admin only, not already on hold or paid
    const canPutOnHold =
      isAdmin &&
      invoice?.status !== INVOICE_STATUS.ON_HOLD &&
      invoice?.status !== INVOICE_STATUS.PAID;

    // Archive: Anyone can request archive (standard users create request, admins instant)
    // Except: cannot archive if already archived or rejected
    const canArchive =
      !invoice?.is_archived && invoice?.status !== INVOICE_STATUS.REJECTED;

    // Delete: Super admin only
    const canDelete = isSuperAdmin;

    // Record Payment: Can record if balance > 0, not pending approval, not paid, not rejected
    const canRecordPayment =
      invoice?.status !== INVOICE_STATUS.PENDING_APPROVAL &&
      invoice?.status !== INVOICE_STATUS.PAID &&
      invoice?.status !== INVOICE_STATUS.REJECTED &&
      hasRemainingBalance;

    return {
      canEdit,
      canRecordPayment,
      canPutOnHold,
      canArchive,
      canDelete,
      canApprove,
      canReject,
    };
  }, [
    isAdmin,
    isSuperAdmin,
    isOwner,
    isInvoicePending,
    hasRemainingBalance,
    invoice?.status,
    invoice?.is_archived,
  ]);

  // Combined loading state
  const isLoading = isInvoiceLoading || isPaymentLoading;

  // Error handling (invoice error takes precedence)
  const error = invoiceError ? (invoiceError as Error) : null;

  return {
    // Data
    invoice,
    paymentSummary,
    isLoading,
    error,

    // Permissions
    permissions,

    // Computed values
    hasRemainingBalance,
    isAdmin,
    isSuperAdmin,
    isOwner,
  };
}
