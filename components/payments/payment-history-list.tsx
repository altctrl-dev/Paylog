/**
 * Payment History List Component
 *
 * Displays all payments for an invoice in a table format.
 * Shows chronological payment records with running balance.
 */

'use client';

import * as React from 'react';
import { usePayments, usePaymentSummary } from '@/hooks/use-payments';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PAYMENT_STATUS_CONFIG } from '@/types/payment';
import type { PaymentStatus } from '@/types/payment';

interface PaymentHistoryListProps {
  invoiceId: number;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get payment method label
 */
function getPaymentMethodLabel(method: string | null): string {
  if (!method) return 'N/A';

  const labels: Record<string, string> = {
    cash: 'Cash',
    check: 'Check',
    wire_transfer: 'Wire Transfer',
    card: 'Card',
    upi: 'UPI',
    other: 'Other',
  };

  return labels[method] || method;
}

export function PaymentHistoryList({ invoiceId }: PaymentHistoryListProps) {
  const { data: payments, isLoading, error } = usePayments(invoiceId);
  const { data: summary } = usePaymentSummary(invoiceId);

  // Calculate running balance for each payment (must be before early returns)
  const paymentsWithBalance = React.useMemo(() => {
    if (!payments || !summary) return [];

    let runningBalance = summary.invoice_amount;

    return payments.map((payment) => {
      const balanceAfter = runningBalance - payment.amount_paid;
      const result = {
        ...payment,
        balanceAfter: Math.max(0, balanceAfter),
      };
      runningBalance = balanceAfter;
      return result;
    });
  }, [payments, summary]);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading payments...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive p-4">
        <div className="text-sm text-destructive">
          Failed to load payment history: {error.message}
        </div>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No payments recorded yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click &quot;Record Payment&quot; to add the first payment
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment Summary Card */}
      {summary && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Payment Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-semibold text-primary">
                {formatCurrency(summary.total_paid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-semibold text-destructive">
                {formatCurrency(summary.remaining_balance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payments</p>
              <p className="font-semibold">{summary.payment_count}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Payment History Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Method
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                  Balance After
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paymentsWithBalance.map((payment) => {
                const statusConfig =
                  PAYMENT_STATUS_CONFIG[payment.status as PaymentStatus];

                return (
                  <tr
                    key={payment.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatCurrency(payment.amount_paid)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusConfig?.variant || 'default'}>
                        {statusConfig?.label || payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      {formatCurrency(payment.balanceAfter)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer Note */}
      <p className="text-xs text-muted-foreground">
        Payments are listed in chronological order (newest first)
      </p>
    </div>
  );
}
