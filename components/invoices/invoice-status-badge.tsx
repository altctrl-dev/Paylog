/**
 * Invoice Status Badge Component
 *
 * Displays invoice status with appropriate color coding.
 *
 * Color scheme:
 * - Invoice Pending Approval: Amber/Yellow (warning variant)
 * - Payment Pending: Purple (purple variant)
 * - Paid: Green (success variant)
 * - Overdue/Rejected: Red (destructive variant)
 * - Partial: Blue (info variant)
 * - Unpaid: Red (destructive variant)
 * - On Hold: Gray (secondary variant)
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUS_CONFIG, INVOICE_STATUS, type InvoiceStatus } from '@/types/invoice';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  /** When true, shows "Payment Pending" badge (purple) instead of invoice status */
  hasPendingPayment?: boolean;
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  hasPendingPayment,
  className,
}: InvoiceStatusBadgeProps) {
  // Payment pending takes precedence over invoice status (when invoice is approved but has pending payment)
  if (hasPendingPayment && status !== INVOICE_STATUS.PENDING_APPROVAL) {
    return (
      <Badge variant="purple" className={className}>
        Payment Pending
      </Badge>
    );
  }

  const config = INVOICE_STATUS_CONFIG[status];

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        Unknown
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
