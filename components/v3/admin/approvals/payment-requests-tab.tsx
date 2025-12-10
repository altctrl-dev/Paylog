'use client';

import * as React from 'react';
import { useFilteredPayments, type ApprovalStatusFilter } from '@/hooks/use-approvals';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, IndianRupee, Check, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { approvePayment, rejectPayment } from '@/app/actions/payments';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/format';
import { ApprovalStatusFilterSelect } from './approval-status-filter';
import { RejectionReasonDialog } from './rejection-reason-dialog';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import type { PaymentWithRelations } from '@/types/payment';

const STATUS_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-purple-600 border-purple-300' },
  approved: { label: 'Approved', className: 'text-green-600 border-green-300 bg-green-50' },
  rejected: { label: 'Rejected', className: 'text-red-600 border-red-300 bg-red-50' },
};

export function PaymentRequestsTab() {
  const [statusFilter, setStatusFilter] = React.useState<ApprovalStatusFilter>('pending');
  const { data: payments, isLoading, error, refetch } = useFilteredPayments(statusFilter);
  const queryClient = useQueryClient();
  const { openPanel } = usePanel();
  const [processingId, setProcessingId] = React.useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectingPayment, setRejectingPayment] = React.useState<{
    id: number;
    amount: number;
    invoiceNumber?: string;
  } | null>(null);

  const handleApprove = async (paymentId: number) => {
    setProcessingId(paymentId);
    try {
      const result = await approvePayment(paymentId);
      if (result.success) {
        toast.success('Payment approved');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
      } else {
        toast.error(result.error || 'Failed to approve payment');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (payment: { id: number; amount_paid: number; invoice?: { invoice_number?: string } | null }) => {
    setRejectingPayment({
      id: payment.id,
      amount: payment.amount_paid,
      invoiceNumber: payment.invoice?.invoice_number,
    });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingPayment) return;

    setProcessingId(rejectingPayment.id);
    try {
      const result = await rejectPayment(rejectingPayment.id, reason);
      if (result.success) {
        toast.success('Payment rejected');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
      } else {
        toast.error(result.error || 'Failed to reject payment');
        throw new Error(result.error || 'Failed to reject payment');
      }
    } finally {
      setProcessingId(null);
      setRejectingPayment(null);
    }
  };

  const handleViewInvoice = (invoiceId: number) => {
    openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGE_CONFIG[status] || { label: status, className: '' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const emptyMessage = statusFilter === 'pending'
    ? 'All payment requests have been reviewed'
    : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}payments found`;

  const isPending = statusFilter === 'pending';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ApprovalStatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
        <span className="text-sm text-muted-foreground">
          {payments?.length ?? 0} payment{(payments?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-destructive">
          Failed to load payments
        </Card>
      )}

      {!isLoading && !error && (!payments || payments.length === 0) && (
        <Card className="p-8 text-center">
          <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-muted-foreground">No payments</h3>
          <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>
        </Card>
      )}

      {!isLoading && !error && payments && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((payment: PaymentWithRelations) => (
            <Card key={payment.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{formatCurrency(payment.amount_paid, 'INR')}</span>
                    {getStatusBadge(payment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Invoice #{payment.invoice?.invoice_number}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recorded on {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                    {payment.payment_type && ` • ${payment.payment_type.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isPending ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(payment.id)}
                        disabled={processingId === payment.id}
                      >
                        {processingId === payment.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRejectClick(payment)}
                        disabled={processingId === payment.id}
                      >
                        {processingId === payment.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => payment.invoice?.id && handleViewInvoice(payment.invoice.id)}
                      disabled={!payment.invoice?.id}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Invoice
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RejectionReasonDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleRejectConfirm}
        title="Reject Payment"
        description="Please provide a reason for rejecting this payment. The requester will be notified."
        itemName={rejectingPayment ? `${formatCurrency(rejectingPayment.amount, 'INR')}${rejectingPayment.invoiceNumber ? ` for Invoice #${rejectingPayment.invoiceNumber}` : ''}` : undefined}
      />
    </div>
  );
}

export default PaymentRequestsTab;
