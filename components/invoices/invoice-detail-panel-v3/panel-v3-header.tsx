'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { INVOICE_STATUS_CONFIG, INVOICE_STATUS, type InvoiceStatus } from '@/types/invoice';
import { cn } from '@/lib/utils';

export interface PanelV3HeaderProps {
  /** Invoice number to display (e.g., "INV-2025-001") */
  invoiceNumber: string;
  /** Vendor name (e.g., "IOE Access") */
  vendorName: string;
  /** Invoice status */
  status: InvoiceStatus;
  /** Whether the invoice is recurring */
  isRecurring: boolean;
  /** Whether the invoice is archived */
  isArchived: boolean;
  /** Whether the invoice has a pending payment awaiting approval */
  hasPendingPayment?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PanelV3Header({
  invoiceNumber,
  vendorName,
  status,
  isRecurring,
  isArchived,
  hasPendingPayment,
  className,
}: PanelV3HeaderProps) {
  const statusConfig = INVOICE_STATUS_CONFIG[status];

  // Determine which status badge to show:
  // - If invoice is pending approval, show "Pending Approval" (amber/warning)
  // - If invoice is approved but has pending payment, show "Payment Pending" (purple)
  // - Otherwise, show the normal status badge
  const showPaymentPendingBadge = hasPendingPayment && status !== INVOICE_STATUS.PENDING_APPROVAL;

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {/* Left side: Invoice number and vendor */}
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium text-foreground">{invoiceNumber}</p>
        <p className="text-sm text-muted-foreground">{vendorName}</p>
      </div>

      {/* Right side: Badges stacked vertically */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {showPaymentPendingBadge ? (
          <Badge variant="purple">Payment Pending</Badge>
        ) : (
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        )}
        {isRecurring && <Badge variant="outline">Recurring</Badge>}
        {isArchived && <Badge variant="muted">Archived</Badge>}
      </div>
    </div>
  );
}
