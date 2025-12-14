'use client';

/**
 * Invoice Detail Panel V3 - Main Orchestration Component
 *
 * The main entry point that combines all sub-components for the V3 invoice panel.
 * Layout structure:
 * - Header: Invoice number, status badges, vendor info
 * - Hero: Financial stats, payment progress, due date
 * - Action Bar: Context-aware action buttons (right side)
 * - Tabs: Details, Payments, Attachments, Activity
 * - Footer: Close button
 */

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { PanelTabs, type TabItem } from '@/components/panels/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePanel } from '@/hooks/use-panel';
import { useApproveInvoiceV2, useRejectInvoiceV2 } from '@/hooks/use-invoices-v2';
import { ArchiveInvoiceDialog } from '@/components/invoices/archive-invoice-dialog';
import { DeleteInvoiceDialog } from '@/components/invoices/delete-invoice-dialog';
import type { PanelConfig } from '@/types/panel';
import { PANEL_WIDTH } from '@/types/panel';
import type { InvoiceStatus } from '@/types/invoice';
import { calculateTds } from '@/lib/utils/tds';

// V3 Sub-components
import { useInvoicePanelV3 } from './hooks/use-invoice-panel-v3';
import { PanelV3Header } from './panel-v3-header';
import { PanelV3Hero } from './panel-v3-hero';
import { PanelV3ActionBar } from './panel-v3-action-bar';

// Tab components
import { DetailsTab } from './tabs/details-tab';
import { PaymentsTab } from './tabs/payments-tab';
import { AttachmentsTab } from './tabs/attachments-tab';
import { ActivityTab } from './tabs/activity-tab';

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceDetailPanelV3Props {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  userRole?: string;
  userId?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoiceDetailPanelV3({
  config,
  onClose,
  invoiceId,
  userRole,
  userId,
}: InvoiceDetailPanelV3Props) {
  const { openPanel } = usePanel();

  // Data and permissions from custom hook
  const {
    invoice,
    paymentSummary,
    isLoading,
    error,
    permissions,
    hasRemainingBalance,
    hasPendingPayment,
    recordPaymentBlockedReason,
    isAdmin,
  } = useInvoicePanelV3({ invoiceId, userRole, userId });

  // Dialog states
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Mutations with close callback
  const approveInvoice = useApproveInvoiceV2(onClose);
  const rejectInvoice = useRejectInvoiceV2(onClose);

  const isMutationPending = approveInvoice.isPending || rejectInvoice.isPending;

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleEdit = React.useCallback(() => {
    if (!invoice) return;

    if (invoice.is_recurring) {
      openPanel(
        'invoice-edit-recurring-v2',
        { invoiceId: invoice.id },
        { width: PANEL_WIDTH.LARGE }
      );
    } else {
      openPanel(
        'invoice-edit-non-recurring-v2',
        { invoiceId: invoice.id },
        { width: PANEL_WIDTH.LARGE }
      );
    }
  }, [invoice, openPanel]);

  const handleRecordPayment = React.useCallback(() => {
    if (!invoice) return;

    // Calculate remaining balance (full payable amount if no payments yet)
    // For TDS invoices, we use the payable amount (after TDS deduction)
    // Uses invoice's tds_rounded preference for consistent calculation
    const invoicePayableAmount =
      invoice.tds_applicable && invoice.tds_percentage
        ? calculateTds(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false).payableAmount
        : invoice.invoice_amount;

    const remainingBalance = paymentSummary
      ? paymentSummary.remaining_balance
      : invoicePayableAmount;

    openPanel(
      'payment-record',
      {
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        invoiceAmount: invoice.invoice_amount,
        remainingBalance,
        tdsApplicable: invoice.tds_applicable,
        tdsPercentage: invoice.tds_percentage,
        tdsRounded: invoice.tds_rounded ?? false,
      },
      { width: PANEL_WIDTH.MEDIUM }
    );
  }, [invoice, invoiceId, paymentSummary, openPanel]);

  const handlePutOnHold = React.useCallback(() => {
    openPanel('invoice-hold', { invoiceId }, { width: PANEL_WIDTH.MEDIUM });
  }, [invoiceId, openPanel]);

  const handleArchive = React.useCallback(() => {
    setIsArchiveDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
  }, []);

  const handleApprove = React.useCallback(() => {
    approveInvoice.mutate(invoiceId);
  }, [approveInvoice, invoiceId]);

  const handleReject = React.useCallback(() => {
    setIsRejectDialogOpen(true);
  }, []);

  const handleRejectConfirm = React.useCallback(() => {
    if (rejectionReason.trim().length < 10) {
      return;
    }
    rejectInvoice.mutate({ invoiceId, reason: rejectionReason });
    setIsRejectDialogOpen(false);
    setRejectionReason('');
  }, [rejectInvoice, invoiceId, rejectionReason]);

  const handleRejectCancel = React.useCallback(() => {
    setIsRejectDialogOpen(false);
    setRejectionReason('');
  }, []);

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <PanelLevel config={config} title="Loading..." onClose={onClose}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Loading invoice details...
            </p>
          </div>
        </div>
      </PanelLevel>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error || !invoice) {
    return (
      <PanelLevel config={config} title="Error" onClose={onClose}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load invoice'}
            </p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        </div>
      </PanelLevel>
    );
  }

  // ============================================================================
  // TAB CONFIGURATION
  // ============================================================================

  const tabs: TabItem[] = [
    {
      id: 'details',
      label: 'Details',
      content: (
        <div className="p-4">
          <DetailsTab invoice={invoice} />
        </div>
      ),
    },
    {
      id: 'payments',
      label: 'Payments',
      badge: paymentSummary?.payment_count,
      content: (
        <div className="p-4">
          <PaymentsTab invoiceId={invoiceId} isAdmin={isAdmin} />
        </div>
      ),
    },
    {
      id: 'attachments',
      label: 'Attachments',
      badge: invoice.attachments?.length,
      content: (
        <div className="p-4">
          <AttachmentsTab attachments={invoice.attachments || []} />
        </div>
      ),
    },
    {
      id: 'activity',
      label: 'Activity',
      content: (
        <div className="p-4">
          <ActivityTab invoiceId={invoiceId} userRole={userRole} />
        </div>
      ),
    },
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <PanelLevel
        config={config}
        title={`Invoice ${invoice.invoice_number}`}
        onClose={onClose}
        footer={
          <div className="flex items-center justify-end w-full">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="flex h-full">
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b">
              <PanelV3Header
                invoiceNumber={invoice.invoice_number}
                invoiceName={
                  invoice.is_recurring
                    ? invoice.invoice_profile?.name
                    : invoice.invoice_name || invoice.description
                }
                vendorName={invoice.vendor.name}
                status={invoice.status as InvoiceStatus}
                isRecurring={invoice.is_recurring}
                isArchived={invoice.is_archived}
                hasPendingPayment={hasPendingPayment}
              />
            </div>

            {/* Hero */}
            <div className="px-6 py-4 border-b bg-muted/30">
              <PanelV3Hero
                invoiceAmount={invoice.invoice_amount}
                totalPaid={paymentSummary?.total_paid ?? 0}
                remainingBalance={
                  paymentSummary?.remaining_balance ?? invoice.invoice_amount
                }
                tdsApplicable={invoice.tds_applicable}
                tdsPercentage={invoice.tds_percentage}
                tdsRounded={invoice.tds_rounded} // BUG-003: Pass invoice's TDS rounding preference
                dueDate={invoice.due_date}
                status={invoice.status}
                currencyCode={invoice.currency?.code}
              />
            </div>

            {/* Tabs + Content */}
            <div className="flex-1 overflow-hidden">
              <PanelTabs tabs={tabs} className="h-full" />
            </div>
          </div>

          {/* Action Bar (right side) */}
          <div className="border-l">
            <PanelV3ActionBar
              permissions={permissions}
              hasRemainingBalance={hasRemainingBalance}
              hasPendingPayment={hasPendingPayment}
              recordPaymentBlockedReason={recordPaymentBlockedReason}
              onEdit={handleEdit}
              onRecordPayment={handleRecordPayment}
              onPutOnHold={handlePutOnHold}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onApprove={handleApprove}
              onReject={handleReject}
              isProcessing={isMutationPending}
            />
          </div>
        </div>
      </PanelLevel>

      {/* Rejection Dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this invoice. This will be
              logged in the activity history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label
              htmlFor="rejection-reason"
              className="text-sm font-medium mb-2 block"
            >
              Rejection Reason *
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter reason for rejection (minimum 10 characters)..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[100px]"
              disabled={isMutationPending}
            />
            {rejectionReason.length > 0 && rejectionReason.length < 10 && (
              <p className="text-xs text-destructive mt-1">
                Reason must be at least 10 characters ({rejectionReason.length}
                /10)
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleRejectCancel}
              disabled={isMutationPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={rejectionReason.trim().length < 10 || isMutationPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isMutationPending ? 'Rejecting...' : 'Reject Invoice'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      {invoice && (
        <ArchiveInvoiceDialog
          open={isArchiveDialogOpen}
          onOpenChange={setIsArchiveDialogOpen}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          onSuccess={onClose}
        />
      )}

      {/* Delete Dialog */}
      {invoice && (
        <DeleteInvoiceDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          onSuccess={onClose}
        />
      )}
    </>
  );
}

export default InvoiceDetailPanelV3;
