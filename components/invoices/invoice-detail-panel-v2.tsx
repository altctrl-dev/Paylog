/**
 * Invoice V2 Detail Panel (Read-only)
 *
 * Displays full invoice details for V2 invoices (Sprint 13).
 * Supports both recurring and non-recurring invoices with inline payment tracking.
 */

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { FileText, Calendar, DollarSign, Building, Tag, Clock, Download, CheckCircle, XCircle, Pencil, Pause } from 'lucide-react';
import { PanelLevel } from '@/components/panels/panel-level';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { useInvoiceV2, useApproveInvoiceV2, useRejectInvoiceV2 } from '@/hooks/use-invoices-v2';
import { usePanel } from '@/hooks/use-panel';
import { formatCurrency, formatFileSize } from '@/lib/utils/format';
import { INVOICE_STATUS_CONFIG, INVOICE_STATUS } from '@/types/invoice';
import { VENDOR_STATUS_CONFIG } from '@/types/vendor';
import type { PanelConfig } from '@/types/panel';
import { PANEL_WIDTH } from '@/types/panel';

interface InvoiceDetailPanelV2Props {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  userRole?: string;
  userId?: string;
}

export function InvoiceDetailPanelV2({ config, onClose, invoiceId, userRole, userId }: InvoiceDetailPanelV2Props) {
  const { data: invoice, isLoading, error } = useInvoiceV2(invoiceId);
  const { openPanel } = usePanel();

  // Approval/Rejection state
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState('');

  // Mutations with close callback
  const approveInvoice = useApproveInvoiceV2(onClose);
  const rejectInvoice = useRejectInvoiceV2(onClose);

  // Handler functions
  const handleApprove = () => {
    approveInvoice.mutate(invoiceId);
  };

  const handleRejectClick = () => {
    setIsRejectDialogOpen(true);
  };

  const handleEdit = () => {
    // Open appropriate edit panel based on invoice type
    if (!invoice) return;

    if (invoice.is_recurring) {
      // Open recurring invoice edit panel
      openPanel('invoice-edit-recurring-v2', { invoiceId: invoice.id }, { width: PANEL_WIDTH.LARGE });
    } else {
      // Open non-recurring invoice edit panel
      openPanel('invoice-edit-non-recurring-v2', { invoiceId: invoice.id }, { width: PANEL_WIDTH.LARGE });
    }
  };

  const handlePutOnHold = () => {
    openPanel('invoice-hold', { invoiceId }, { width: PANEL_WIDTH.MEDIUM });
  };

  const handleRejectConfirm = () => {
    if (rejectionReason.trim().length < 10) {
      // Client-side validation feedback (server will also validate)
      return;
    }
    rejectInvoice.mutate({ invoiceId, reason: rejectionReason });
    setIsRejectDialogOpen(false);
    setRejectionReason('');
  };

  const handleRejectCancel = () => {
    setIsRejectDialogOpen(false);
    setRejectionReason('');
  };

  // Check permissions
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isOwner = invoice?.created_by === Number(userId);
  const isInvoicePending = invoice?.status === INVOICE_STATUS.PENDING_APPROVAL;

  const canApprove =
    invoice?.status === 'pending_approval' && isAdmin;
  const canPutOnHold =
    isAdmin &&
    invoice?.status !== INVOICE_STATUS.ON_HOLD &&
    invoice?.status !== INVOICE_STATUS.PAID;

  // Edit permission logic:
  // - Admins can always edit
  // - Standard users: can edit own invoices, but NOT while pending approval
  const canEdit = isAdmin || (isOwner && !isInvoicePending);

  const isMutationPending = approveInvoice.isPending || rejectInvoice.isPending;

  // Handle loading state
  if (isLoading) {
    return (
      <PanelLevel config={config} title="Loading..." onClose={onClose}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading invoice details...</p>
          </div>
        </div>
      </PanelLevel>
    );
  }

  // Handle error state
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

  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status as keyof typeof INVOICE_STATUS_CONFIG];
  const currencyCode = invoice.currency?.code || 'USD';

  return (
    <>
      <PanelLevel
        config={config}
        title={`Invoice ${invoice.invoice_number}`}
        onClose={onClose}
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            {/* Left side actions */}
            <div className="flex items-center gap-2">
              {isInvoicePending && !isAdmin ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  title="Cannot edit while invoice is pending approval"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit (Pending)
                </Button>
              ) : canEdit ? (
                <Button
                  variant="outline"
                  onClick={handleEdit}
                  size="sm"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : null}
              {canPutOnHold && (
                <Button
                  variant="outline"
                  onClick={handlePutOnHold}
                  size="sm"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Put On Hold
                </Button>
              )}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {canApprove ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRejectClick}
                    disabled={isMutationPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleApprove}
                    disabled={isMutationPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        }
      >
      <div className="space-y-6">
        {/* Header Section - Invoice Number, Status, Recurring Badge */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">{invoice.invoice_number}</h3>
              </div>
              {invoice.description && (
                <p className="text-sm text-muted-foreground">{invoice.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {statusConfig && (
                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              )}
              {invoice.is_recurring && (
                <Badge variant="outline" className="text-xs">
                  Recurring
                </Badge>
              )}
            </div>
          </div>
        </Card>

        {/* Basic Info Section - Dates and Amounts */}
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Invoice Details
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Invoice Date</Label>
              <p className="text-sm font-medium">
                {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>
            {invoice.invoice_received_date && (
              <div>
                <Label className="text-xs text-muted-foreground">Date Received</Label>
                <p className="text-sm font-medium">
                  {format(new Date(invoice.invoice_received_date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <p className="text-sm font-medium">
                {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'N/A'}
              </p>
            </div>
            {invoice.period_start && invoice.period_end && (
              <div>
                <Label className="text-xs text-muted-foreground">Billing Period</Label>
                <p className="text-sm font-medium">
                  {format(new Date(invoice.period_start), 'MMM dd')} - {format(new Date(invoice.period_end), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground">Invoice Amount</Label>
              <p className="text-sm font-semibold">
                {formatCurrency(invoice.invoice_amount, currencyCode)}
              </p>
            </div>
            {invoice.tds_applicable && invoice.tds_percentage && (
              <div>
                <Label className="text-xs text-muted-foreground">TDS</Label>
                <p className="text-sm font-medium">
                  {invoice.tds_percentage}% ({formatCurrency((invoice.invoice_amount * invoice.tds_percentage) / 100, currencyCode)})
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Profile Section (Recurring Invoices Only) */}
        {invoice.is_recurring && invoice.invoice_profile && (
          <Card className="p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Invoice Profile
            </h4>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Profile Name</Label>
                <p className="text-sm font-medium">{invoice.invoice_profile.name}</p>
              </div>
              {invoice.invoice_profile.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-muted-foreground">{invoice.invoice_profile.description}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Inline Payment Section (If Paid) */}
        {invoice.is_paid && (
          <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-700 dark:text-green-300">
              <DollarSign className="h-4 w-4" />
              Payment Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {invoice.paid_date && (
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Date</Label>
                  <p className="text-sm font-medium">
                    {format(new Date(invoice.paid_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              {invoice.paid_amount && (
                <div>
                  <Label className="text-xs text-muted-foreground">Amount Paid</Label>
                  <p className="text-sm font-semibold">
                    {formatCurrency(invoice.paid_amount, invoice.paid_currency || currencyCode)}
                  </p>
                </div>
              )}
              {invoice.payment_type && (
                <div>
                  <Label className="text-xs text-muted-foreground">Payment Method</Label>
                  <p className="text-sm font-medium">{invoice.payment_type.name}</p>
                </div>
              )}
              {invoice.payment_reference && (
                <div>
                  <Label className="text-xs text-muted-foreground">Reference</Label>
                  <p className="text-sm font-medium font-mono">{invoice.payment_reference}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Classification Section */}
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Building className="h-4 w-4" />
            Classification
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Vendor</Label>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{invoice.vendor.name}</p>
                {invoice.vendor.status && invoice.vendor.status !== 'APPROVED' && (
                  <Badge
                    variant={VENDOR_STATUS_CONFIG[invoice.vendor.status as keyof typeof VENDOR_STATUS_CONFIG]?.variant || 'outline'}
                    className="text-xs"
                  >
                    {VENDOR_STATUS_CONFIG[invoice.vendor.status as keyof typeof VENDOR_STATUS_CONFIG]?.label || invoice.vendor.status}
                  </Badge>
                )}
              </div>
            </div>
            {invoice.entity && (
              <div>
                <Label className="text-xs text-muted-foreground">Entity</Label>
                <p className="text-sm font-medium">{invoice.entity.name}</p>
              </div>
            )}
            {invoice.category && (
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <p className="text-sm font-medium">{invoice.category.name}</p>
              </div>
            )}
            {invoice.currency && (
              <div>
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <p className="text-sm font-medium">
                  {invoice.currency.code} ({invoice.currency.symbol})
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Attachments Section */}
        {invoice.attachments && invoice.attachments.length > 0 && (
          <Card className="p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Attachments ({invoice.attachments.length})
            </h4>
            <div className="space-y-2">
              {invoice.attachments.map((attachment: {
                id: string;
                file_name: string;
                original_name: string;
                file_size: number;
                mime_type: string;
                uploaded_at: Date;
              }) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 rounded-md border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.original_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)} • {format(new Date(attachment.uploaded_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement file download
                      console.log('Download attachment:', attachment.id);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Metadata Section */}
        <Card className="p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Metadata
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Created By</Label>
              <p className="text-sm font-medium">{invoice.creator.full_name}</p>
              <p className="text-xs text-muted-foreground">{invoice.creator.email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Created At</Label>
              <p className="text-sm font-medium">
                {format(new Date(invoice.created_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Last Updated</Label>
              <p className="text-sm font-medium">
                {format(new Date(invoice.updated_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </PanelLevel>

    {/* Rejection Dialog */}
    <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a reason for rejecting this invoice. This will be logged in the activity history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="rejection-reason" className="text-sm font-medium mb-2 block">
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
              Reason must be at least 10 characters ({rejectionReason.length}/10)
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleRejectCancel} disabled={isMutationPending}>
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
  </>
  );
}
