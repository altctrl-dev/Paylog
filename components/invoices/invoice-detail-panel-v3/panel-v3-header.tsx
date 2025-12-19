'use client';

import * as React from 'react';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { INVOICE_STATUS_CONFIG, INVOICE_STATUS, type InvoiceStatus } from '@/types/invoice';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';

export interface PanelV3HeaderProps {
  /** Invoice number to display (e.g., "INV-2025-001") */
  invoiceNumber: string;
  /** Vendor name (e.g., "IOE Access") */
  vendorName: string;
  /** Invoice status */
  status: InvoiceStatus;
  /** Whether the invoice is recurring - NOTE: Recurring badge removed per UX decision */
  isRecurring: boolean;
  /** Whether the invoice is archived */
  isArchived: boolean;
  /** Whether the invoice has a pending payment awaiting approval */
  hasPendingPayment?: boolean;
  /** Whether user can approve this invoice */
  canApprove?: boolean;
  /** Callback when approve button is clicked */
  onApprove?: () => void;
  /** Whether an approval action is in progress */
  isApproving?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function PanelV3Header({
  invoiceNumber,
  vendorName,
  status,
  isArchived,
  hasPendingPayment,
  canApprove,
  onApprove,
  isApproving,
  className,
}: PanelV3HeaderProps) {
  const isMobile = useIsMobile();
  const statusConfig = INVOICE_STATUS_CONFIG[status];

  // For pending approval invoices with approval permission: show Approve button instead of badge
  const showApproveButton = status === INVOICE_STATUS.PENDING_APPROVAL && canApprove;

  // Determine which status badge to show when not showing approve button:
  // - If invoice has pending payment (and not pending_approval), show "Payment Pending" (purple)
  // - Otherwise, show the normal status badge
  const showPaymentPendingBadge = hasPendingPayment && status !== INVOICE_STATUS.PENDING_APPROVAL;

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {/* Left side: Invoice number and vendor */}
      <div className="space-y-0.5 min-w-0">
        <p className="text-sm font-medium text-foreground">{invoiceNumber}</p>
        <p className="text-sm text-muted-foreground">{vendorName}</p>
      </div>

      {/* Right side: Approve button for pending invoices, or status badges */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {showApproveButton ? (
          <Button
            variant="success"
            size="sm"
            onClick={onApprove}
            disabled={isApproving}
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            {isMobile ? 'Approve' : 'Approve Invoice'}
          </Button>
        ) : (
          <>
            {showPaymentPendingBadge ? (
              <Badge variant="purple">Payment Pending</Badge>
            ) : (
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            )}
          </>
        )}
        {/* Recurring badge removed per UX decision - will be placed elsewhere later */}
        {isArchived && <Badge variant="muted">Archived</Badge>}
      </div>
    </div>
  );
}
