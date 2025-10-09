/**
 * Invoice Detail Panel (Level 1)
 *
 * Read-only detail view for a single invoice.
 * Opens edit panel (Level 2) and hold confirmation (Level 3).
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useInvoice, useApproveInvoice, useRejectInvoice } from '@/hooks/use-invoices';
import { usePaymentSummary } from '@/hooks/use-payments';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { PaymentHistoryList } from '@/components/payments/payment-history-list';
import type { PanelConfig } from '@/types/panel';
import { INVOICE_STATUS } from '@/types/invoice';

interface InvoiceDetailPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function InvoiceDetailPanel({
  config,
  onClose,
  invoiceId,
}: InvoiceDetailPanelProps) {
  const { openPanel } = usePanel();
  const { data: invoice, isLoading, error } = useInvoice(invoiceId);
  const { data: paymentSummary } = usePaymentSummary(invoiceId);
  const approveMutation = useApproveInvoice();
  const rejectMutation = useRejectInvoice();

  // Get current session to check user role
  const [session, setSession] = React.useState<{user?: {role?: string}} | null>(null);
  React.useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => setSession(data))
      .catch(() => setSession(null));
  }, []);

  const handleOpenEdit = React.useCallback(() => {
    console.log('[InvoiceDetailPanel] Opening edit panel for invoice', invoiceId);
    openPanel('invoice-edit', { invoiceId }, { width: 700 });
  }, [openPanel, invoiceId]);

  const handleOpenHold = React.useCallback(() => {
    console.log('[InvoiceDetailPanel] Opening hold panel for invoice', invoiceId);
    openPanel('invoice-hold', { invoiceId }, { width: 500 });
  }, [openPanel, invoiceId]);

  const handleOpenPayment = React.useCallback(() => {
    console.log('[InvoiceDetailPanel] Opening payment panel', { invoice, paymentSummary });

    if (!invoice) {
      console.error('[InvoiceDetailPanel] Cannot open payment panel: invoice is null');
      return;
    }

    // Calculate remaining balance (full amount if no payments yet)
    const remainingBalance = paymentSummary
      ? paymentSummary.remaining_balance
      : invoice.invoice_amount;

    console.log('[InvoiceDetailPanel] Opening payment panel with', {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
      invoiceAmount: invoice.invoice_amount,
      remainingBalance,
    });

    openPanel(
      'payment-record',
      {
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        invoiceAmount: invoice.invoice_amount,
        remainingBalance,
      },
      { width: 600 }
    );
  }, [openPanel, invoiceId, invoice, paymentSummary]);

  const handleOpenReject = React.useCallback(() => {
    console.log('[InvoiceDetailPanel] Opening reject panel for invoice', invoiceId);
    if (!invoice) {
      console.error('[InvoiceDetailPanel] Cannot open reject panel: invoice is null');
      return;
    }
    openPanel('invoice-reject', { invoiceId, invoiceNumber: invoice.invoice_number }, { width: 500 });
  }, [openPanel, invoiceId, invoice]);

  const handleApprove = React.useCallback(() => {
    console.log('[InvoiceDetailPanel] Approving invoice', invoiceId);
    approveMutation.mutate(invoiceId);
  }, [approveMutation, invoiceId]);

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title="Loading..."
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-muted-foreground">
            Loading invoice details...
          </div>
        </div>
      </PanelLevel>
    );
  }

  if (error || !invoice) {
    return (
      <PanelLevel
        config={config}
        title="Error"
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-destructive">
            {error?.message || 'Invoice not found'}
          </div>
        </div>
      </PanelLevel>
    );
  }

  // Only admins can put invoices on hold
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';
  const canPutOnHold =
    isAdmin &&
    invoice.status !== INVOICE_STATUS.ON_HOLD &&
    invoice.status !== INVOICE_STATUS.PAID;

  // Only admins can approve/reject invoices in pending_approval status
  const canApproveReject =
    isAdmin && invoice.status === INVOICE_STATUS.PENDING_APPROVAL;

  // Payment can only be recorded for unpaid, partial, or overdue invoices
  const isFullyPaid = paymentSummary?.is_fully_paid ?? false;
  const canRecordPayment =
    !isFullyPaid &&
    (invoice.status === INVOICE_STATUS.UNPAID ||
      invoice.status === INVOICE_STATUS.PARTIAL ||
      invoice.status === INVOICE_STATUS.OVERDUE);

  return (
    <PanelLevel
      config={config}
      title={`Invoice ${invoice.invoice_number}`}
      onClose={onClose}
      headerActions={
        <Button variant="outline" size="sm" onClick={handleOpenEdit}>
          Edit Invoice
        </Button>
      }
      footer={
        <>
          {canPutOnHold && (
            <Button variant="outline" onClick={handleOpenHold}>
              Put On Hold
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button
                variant="destructive"
                onClick={handleOpenReject}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </Button>
            </>
          )}
          {canRecordPayment && (
            <Button onClick={handleOpenPayment}>
              Record Payment
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Status */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Status</h3>
            <div className="flex flex-wrap items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              {invoice.isOverdue && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Invoice Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Number:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">
                {formatCurrency(invoice.invoice_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Date:</span>
              <span className="font-medium">
                {formatDate(invoice.invoice_date)}
              </span>
            </div>
            {invoice.period_start && invoice.period_end && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Period:</span>
                <span className="font-medium">
                  {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date:</span>
              <span className="font-medium">{formatDate(invoice.due_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">TDS:</span>
              <span className="font-medium">
                {invoice.tds_applicable ? 'Applicable' : 'Not Applicable'}
              </span>
            </div>
          </div>
        </Card>

        {/* Payment Summary (if payments exist) */}
        {paymentSummary && paymentSummary.payment_count > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 font-semibold">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-medium text-primary">
                  {formatCurrency(paymentSummary.total_paid)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(paymentSummary.remaining_balance)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Count:</span>
                <span className="font-medium">{paymentSummary.payment_count}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Vendor, Category, Profile, Sub Entity */}
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Classification</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor:</span>
              <span className="font-medium">
                {invoice.vendor?.name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">
                {invoice.category?.name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profile:</span>
              <span className="font-medium">
                {invoice.profile?.name || 'N/A'}
              </span>
            </div>
            {invoice.sub_entity && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Entity:</span>
                <span className="font-medium">{invoice.sub_entity.name}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card className="p-4">
            <h3 className="mb-2 font-semibold">Notes</h3>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </Card>
        )}

        {/* Hold Information (if applicable) */}
        {invoice.status === INVOICE_STATUS.ON_HOLD && invoice.hold_reason && (
          <Card className="border-secondary p-4">
            <h3 className="mb-2 font-semibold text-secondary">Hold Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Reason:</span>
                <p className="mt-1 text-foreground">{invoice.hold_reason}</p>
              </div>
              {invoice.holder && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hold By:</span>
                  <span className="font-medium">
                    {invoice.holder.full_name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hold Date:</span>
                <span className="font-medium">
                  {formatDate(invoice.hold_at)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Rejection Information (if applicable) */}
        {invoice.status === INVOICE_STATUS.REJECTED && invoice.rejection_reason && (
          <Card className="border-destructive p-4">
            <h3 className="mb-2 font-semibold text-destructive">Rejection Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Reason:</span>
                <p className="mt-1 text-foreground">{invoice.rejection_reason}</p>
              </div>
              {invoice.rejector && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rejected By:</span>
                  <span className="font-medium">
                    {invoice.rejector.full_name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rejected At:</span>
                <span className="font-medium">
                  {formatDate(invoice.rejected_at)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Metadata */}
        <Card className="p-4">
          <h3 className="mb-3 font-semibold">Metadata</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created By:</span>
              <span className="font-medium">{invoice.creator.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created At:</span>
              <span className="font-medium">
                {formatDate(invoice.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated At:</span>
              <span className="font-medium">
                {formatDate(invoice.updated_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submissions:</span>
              <span className="font-medium">{invoice.submission_count}</span>
            </div>
          </div>
        </Card>

        {/* Payment History */}
        <div>
          <h3 className="mb-3 font-semibold text-lg">Payment History</h3>
          <PaymentHistoryList invoiceId={invoiceId} />
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Keyboard Shortcuts:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Press ESC to close this panel</li>
            <li>• Click overlay to close all panels</li>
          </ul>
        </div>
      </div>
    </PanelLevel>
  );
}
