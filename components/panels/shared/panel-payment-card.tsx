'use client';

/**
 * Panel Payment Card Component
 *
 * Displays a payment item with status badge and optional admin actions.
 * Used in payment lists within sidepanels for approving/rejecting pending payments.
 */

import * as React from 'react';
import { Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface PaymentCardPayment {
  id: number;
  amount_paid: number;
  payment_date: Date | string;
  status: 'pending' | 'approved' | 'rejected';
  payment_type?: { name: string } | null;
  tds_amount_applied?: number | null;
  payment_reference?: string | null;
}

export interface PanelPaymentCardProps {
  payment: PaymentCardPayment;
  onApprove?: (paymentId: number) => void;
  onReject?: (paymentId: number) => void;
  showActions?: boolean;
  isProcessing?: boolean;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

// ============================================================================
// Status Badge Configuration
// ============================================================================

const statusBadgeVariants: Record<
  PaymentCardPayment['status'],
  'outline' | 'success' | 'destructive'
> = {
  pending: 'outline',
  approved: 'success',
  rejected: 'destructive',
};

const statusLabels: Record<PaymentCardPayment['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ============================================================================
// Main Component
// ============================================================================

export function PanelPaymentCard({
  payment,
  onApprove,
  onReject,
  showActions = false,
  isProcessing = false,
  className,
}: PanelPaymentCardProps) {
  const {
    id,
    amount_paid,
    payment_date,
    status,
    payment_type,
    tds_amount_applied,
    payment_reference,
  } = payment;

  const showAdminActions = showActions && status === 'pending';

  return (
    <Card className={cn('p-4 transition-colors', className)}>
      <div className="space-y-3">
        {/* Header: Date and Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {formatDate(payment_date)}
          </span>
          <Badge variant={statusBadgeVariants[status]}>
            {statusLabels[status]}
          </Badge>
        </div>

        {/* Amount */}
        <div className="text-lg font-bold tracking-tight">
          {formatCurrency(amount_paid)}
        </div>

        {/* Payment Details */}
        <div className="space-y-1 text-sm">
          {payment_type && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{payment_type.name}</span>
            </div>
          )}

          {tds_amount_applied != null && tds_amount_applied > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TDS Applied</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {formatCurrency(tds_amount_applied)}
              </span>
            </div>
          )}

          {payment_reference && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-medium truncate max-w-[180px]">
                {payment_reference}
              </span>
            </div>
          )}
        </div>

        {/* Admin Actions */}
        {showAdminActions && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onApprove?.(id)}
              disabled={isProcessing}
              className="flex-1 text-green-600 hover:text-green-700 hover:border-green-300 dark:text-green-400 dark:hover:text-green-300"
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReject?.(id)}
              disabled={isProcessing}
              className="flex-1 text-red-600 hover:text-red-700 hover:border-red-300 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default PanelPaymentCard;
