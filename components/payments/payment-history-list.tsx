/**
 * Payment History List Component
 *
 * Displays all payments for an invoice in a table format.
 * Shows chronological payment records with running balance.
 * Admins can approve/reject pending payments.
 */

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { usePayments, usePaymentSummary } from '@/hooks/use-payments';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { approvePayment, rejectPayment } from '@/app/actions/payments';
import { PAYMENT_STATUS_CONFIG, PAYMENT_STATUS } from '@/types/payment';
import type { PaymentStatus } from '@/types/payment';
import { toast } from 'sonner';

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
 * Get payment type label from payment_type relation
 */
function getPaymentTypeLabel(paymentType: { name: string } | null | undefined): string {
  if (!paymentType?.name) return 'N/A';
  return paymentType.name;
}

export function PaymentHistoryList({ invoiceId }: PaymentHistoryListProps) {
  const { data: session } = useSession();
  const { data: payments, isLoading, error, refetch } = usePayments(invoiceId);
  const { data: summary, refetch: refetchSummary } = usePaymentSummary(invoiceId);
  const [processingId, setProcessingId] = React.useState<number | null>(null);

  // Check if user is admin
  const userRole = session?.user?.role as string;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Handle approve payment
  const handleApprove = async (paymentId: number) => {
    setProcessingId(paymentId);
    try {
      const result = await approvePayment(paymentId);
      if (result.success) {
        toast.success('Payment approved successfully');
        refetch();
        refetchSummary();
      } else {
        toast.error(result.error || 'Failed to approve payment');
      }
    } catch (err) {
      toast.error('An error occurred while approving payment');
      console.error('Approve payment error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject payment
  const handleReject = async (paymentId: number) => {
    setProcessingId(paymentId);
    try {
      const result = await rejectPayment(paymentId);
      if (result.success) {
        toast.success('Payment rejected');
        refetch();
        refetchSummary();
      } else {
        toast.error(result.error || 'Failed to reject payment');
      }
    } catch (err) {
      toast.error('An error occurred while rejecting payment');
      console.error('Reject payment error:', err);
    } finally {
      setProcessingId(null);
    }
  };

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
                {isAdmin && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                )}
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
                      {getPaymentTypeLabel(payment.payment_type)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={statusConfig?.variant || 'default'}>
                        {statusConfig?.label || payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      {formatCurrency(payment.balanceAfter)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-center">
                        {payment.status === PAYMENT_STATUS.PENDING ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                              onClick={() => handleApprove(payment.id)}
                              disabled={processingId === payment.id}
                              title="Approve Payment"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => handleReject(payment.id)}
                              disabled={processingId === payment.id}
                              title="Reject Payment"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
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
