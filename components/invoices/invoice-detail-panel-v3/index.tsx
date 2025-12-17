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
import { useIsMobile } from '@/hooks/use-media-query';
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
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArchiveInvoiceDialog } from '@/components/invoices/archive-invoice-dialog';
import { DeleteInvoiceDialog } from '@/components/invoices/delete-invoice-dialog';
import type { PanelConfig } from '@/types/panel';
import { PANEL_WIDTH } from '@/types/panel';
import type { InvoiceStatus } from '@/types/invoice';
import { calculateTds } from '@/lib/utils/tds';
import {
  Pencil,
  IndianRupee,
  Pause,
  Check,
  X,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const isMobile = useIsMobile();

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
  const [isVendorPendingDialogOpen, setIsVendorPendingDialogOpen] = React.useState(false);
  // Two-step dialog: 'details' shows vendor info, 'confirm' shows final confirmation
  const [vendorDialogStep, setVendorDialogStep] = React.useState<'details' | 'confirm'>('details');

  // BUG-007: Check vendor status before approval
  const vendorPendingData = React.useRef<{
    vendor: {
      id: number;
      name: string;
      address: string | null;
      bank_details: string | null;
      gst_exemption: boolean;
      status: string;
    };
  } | null>(null);

  // React Query client for cache invalidation
  const queryClient = useQueryClient();

  // Mutations with close callback
  const approveInvoice = useApproveInvoiceV2(onClose);
  const rejectInvoice = useRejectInvoiceV2(onClose);

  // BUG-007: Track vendor+invoice approval state
  const [isApprovingVendorAndInvoice, setIsApprovingVendorAndInvoice] = React.useState(false);

  const isMutationPending = approveInvoice.isPending || rejectInvoice.isPending || isApprovingVendorAndInvoice;

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
        invoiceName: invoice.is_recurring
          ? invoice.invoice_profile?.name
          : invoice.invoice_name || invoice.description,
        invoiceStatus: invoice.status,
        invoiceAmount: invoice.invoice_amount,
        remainingBalance,
        tdsApplicable: invoice.tds_applicable,
        tdsPercentage: invoice.tds_percentage,
        tdsRounded: invoice.tds_rounded ?? false,
        vendorName: invoice.vendor?.name,
        currencyCode: invoice.currency?.code,
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

  // BUG-007: Check vendor status before approving invoice
  const handleApprove = React.useCallback(async () => {
    // First check if vendor is pending approval
    const { checkInvoiceApprovalEligibility } = await import('@/app/actions/invoices-v2');
    const result = await checkInvoiceApprovalEligibility(invoiceId);

    if (result.success && result.data) {
      if (result.data.vendorPending && result.data.vendor) {
        // Vendor is pending - show warning dialog
        vendorPendingData.current = { vendor: result.data.vendor };
        setIsVendorPendingDialogOpen(true);
      } else {
        // Vendor is approved - proceed with invoice approval
        approveInvoice.mutate(invoiceId);
      }
    } else {
      // Error checking - still try to approve (will fail server-side if needed)
      approveInvoice.mutate(invoiceId);
    }
  }, [approveInvoice, invoiceId]);

  /**
   * Proceed to confirmation step in the two-step dialog
   */
  const handleProceedToConfirm = React.useCallback(() => {
    setVendorDialogStep('confirm');
  }, []);

  /**
   * Go back to details step in the two-step dialog
   */
  const handleBackToDetails = React.useCallback(() => {
    setVendorDialogStep('details');
  }, []);

  /**
   * Handle "Approve Vendor & Invoice" from the confirmation step
   * Approves both vendor and invoice in sequence using direct server actions
   * BUG-007 FIX: Uses direct async/await pattern to ensure both approvals happen reliably
   */
  const handleApproveVendorAndInvoice = React.useCallback(async () => {
    if (!vendorPendingData.current?.vendor?.id) return;

    const vendorName = vendorPendingData.current.vendor.name;
    const vendorId = vendorPendingData.current.vendor.id;

    setIsApprovingVendorAndInvoice(true);
    try {
      // Step 1: Approve the vendor using direct server action
      const { approveVendorRequest } = await import('@/app/actions/admin/master-data-approval');
      const vendorResult = await approveVendorRequest(vendorId);

      if (!vendorResult.success) {
        toast.error(vendorResult.error || 'Failed to approve vendor');
        setIsApprovingVendorAndInvoice(false);
        return;
      }

      toast.success(`Vendor "${vendorName}" has been approved`);

      // Step 2: Approve the invoice using direct server action
      const { approveInvoiceV2 } = await import('@/app/actions/invoices-v2');
      const invoiceResult = await approveInvoiceV2(invoiceId);

      if (invoiceResult.success) {
        toast.success(`Invoice ${invoice?.invoice_number || ''} has been approved`);
        // Invalidate caches
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['invoices-v2'] });
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
        // Close dialog and panel
        setIsVendorPendingDialogOpen(false);
        setVendorDialogStep('details');
        vendorPendingData.current = null;
        onClose();
      } else {
        toast.error(invoiceResult.error || 'Failed to approve invoice. Please try approving the invoice manually.');
      }
    } catch (error) {
      console.error('Error in approval flow:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsApprovingVendorAndInvoice(false);
    }
  }, [invoiceId, invoice?.invoice_number, queryClient, onClose]);

  /**
   * Handle "Edit Invoice" from the dialog
   * Opens the edit panel for the current invoice
   */
  const handleEditInvoiceFromDialog = React.useCallback(() => {
    setIsVendorPendingDialogOpen(false);
    setVendorDialogStep('details');
    vendorPendingData.current = null;
    handleEdit();
  }, [handleEdit]);

  const handleCloseVendorDialog = React.useCallback(() => {
    setIsVendorPendingDialogOpen(false);
    setVendorDialogStep('details');
    vendorPendingData.current = null;
  }, []);

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

  // Derive the display name for the panel title
  const invoiceDisplayName = invoice.is_recurring
    ? invoice.invoice_profile?.name
    : invoice.invoice_name || invoice.description || invoice.invoice_number;

  // Get tooltip for blocked payment actions
  const getRecordPaymentTooltip = (): string | undefined => {
    switch (recordPaymentBlockedReason) {
      case 'pending_payment':
        return 'Payment pending approval';
      case 'pending_approval':
        return 'Invoice pending approval';
      case 'already_paid':
        return 'Invoice is fully paid';
      case 'rejected':
        return 'Invoice is rejected';
      default:
        return undefined;
    }
  };

  // Mobile footer action button component
  const MobileActionButton = ({
    icon,
    label,
    onClick,
    disabled,
    destructive,
    tooltip,
  }: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    tooltip?: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={`h-9 w-9 ${destructive ? 'text-destructive hover:text-destructive' : ''}`}
        >
          <span className="h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {tooltip || label}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <>
      <PanelLevel
        config={config}
        title={`Invoice - ${invoiceDisplayName}`}
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            {/* Mobile Action Bar */}
            {isMobile && (
              <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-1">
                  {/* Primary Actions */}
                  {permissions.canEdit && (
                    <MobileActionButton
                      icon={<Pencil className="h-4 w-4" />}
                      label="Edit"
                      onClick={handleEdit}
                      disabled={isMutationPending}
                    />
                  )}
                  {hasRemainingBalance && (
                    <MobileActionButton
                      icon={<IndianRupee className="h-4 w-4" />}
                      label="Record Payment"
                      onClick={handleRecordPayment}
                      disabled={isMutationPending || !permissions.canRecordPayment}
                      tooltip={getRecordPaymentTooltip()}
                    />
                  )}
                  {permissions.canPutOnHold && (
                    <MobileActionButton
                      icon={<Pause className="h-4 w-4" />}
                      label="Put On Hold"
                      onClick={handlePutOnHold}
                      disabled={isMutationPending}
                    />
                  )}
                  {permissions.canApprove && (
                    <MobileActionButton
                      icon={<Check className="h-4 w-4 text-green-600" />}
                      label="Approve"
                      onClick={handleApprove}
                      disabled={isMutationPending}
                    />
                  )}
                  {permissions.canReject && (
                    <MobileActionButton
                      icon={<X className="h-4 w-4" />}
                      label="Reject"
                      onClick={handleReject}
                      disabled={isMutationPending}
                      destructive
                    />
                  )}

                  {/* Secondary Actions Overflow Menu */}
                  {(permissions.canArchive || permissions.canDelete) && (
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          disabled={isMutationPending}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="top" className="z-[100]">
                        {permissions.canArchive && (
                          <DropdownMenuItem onSelect={handleArchive}>
                            Archive
                          </DropdownMenuItem>
                        )}
                        {permissions.canDelete && (
                          <DropdownMenuItem
                            onSelect={handleDelete}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </TooltipProvider>
            )}

            {/* Spacer for desktop (to push Close to right) */}
            {!isMobile && <div />}

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
            <div className="px-6 py-2 border-b">
              <PanelV3Header
                invoiceNumber={invoice.invoice_number}
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
                currencyCode={invoice.currency?.code}
              />
            </div>

            {/* Tabs + Content */}
            <div className="flex-1 overflow-hidden">
              <PanelTabs tabs={tabs} className="h-full" />
            </div>
          </div>

          {/* Action Bar (right side) - hidden on mobile */}
          {!isMobile && (
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
          )}
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

      {/* BUG-007: Vendor Pending Approval Dialog - Two-Step */}
      <AlertDialog open={isVendorPendingDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseVendorDialog();
      }}>
        <AlertDialogContent>
          {/* Step 1: Vendor Details */}
          {vendorDialogStep === 'details' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <span className="text-amber-600">⚠️ Vendor Pending Approval</span>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  The associated vendor is still waiting for approval and approving
                  will add a new vendor to the list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {vendorPendingData.current?.vendor && (
                <div className="bg-muted p-3 rounded-md space-y-2 text-sm my-2">
                  <div className="font-medium text-foreground">
                    {vendorPendingData.current.vendor.name}
                  </div>
                  {vendorPendingData.current.vendor.address && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Address:</span>{' '}
                      {vendorPendingData.current.vendor.address}
                    </div>
                  )}
                  {vendorPendingData.current.vendor.bank_details && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Bank Details:</span>{' '}
                      {vendorPendingData.current.vendor.bank_details}
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    <span className="font-medium">GST Exemption:</span>{' '}
                    {vendorPendingData.current.vendor.gst_exemption ? 'Yes' : 'No'}
                  </div>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleEditInvoiceFromDialog}>
                  Edit Invoice
                </AlertDialogCancel>
                <Button
                  onClick={handleProceedToConfirm}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Continue
                </Button>
              </AlertDialogFooter>
            </>
          )}

          {/* Step 2: Confirmation */}
          {vendorDialogStep === 'confirm' && vendorPendingData.current?.vendor && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Approval</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to approve both the vendor and the invoice.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3 my-4">
                <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-sm">Approve Vendor</p>
                    <p className="text-sm text-muted-foreground">
                      &quot;{vendorPendingData.current.vendor.name}&quot; will be added to your vendor list
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-sm">Approve Invoice</p>
                    <p className="text-sm text-muted-foreground">
                      Invoice {invoice?.invoice_number} will be approved and ready for payment
                    </p>
                  </div>
                </div>
              </div>
              <AlertDialogFooter>
                <Button
                  variant="outline"
                  onClick={handleBackToDetails}
                  disabled={isApprovingVendorAndInvoice}
                >
                  Back
                </Button>
                <AlertDialogAction
                  onClick={handleApproveVendorAndInvoice}
                  disabled={isApprovingVendorAndInvoice}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {isApprovingVendorAndInvoice ? 'Approving...' : 'Approve Both'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default InvoiceDetailPanelV3;
