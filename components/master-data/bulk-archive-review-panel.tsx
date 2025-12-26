/**
 * Bulk Archive Review Panel
 *
 * Level 2 panel for admins to review bulk invoice archive requests.
 * Supports cherry-pick approval - admins can select which invoices to approve/reject.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { usePanel } from '@/hooks/use-panel';
import { useToast } from '@/hooks/use-toast';
import {
  getBulkArchiveRequestDetails,
  cherryPickBulkArchive,
  approveRequest,
  rejectRequest,
} from '@/app/actions/admin/master-data-approval';
import type { PanelConfig } from '@/types/panel';
import { Archive, Check, X, AlertCircle } from 'lucide-react';

interface BulkArchiveReviewPanelProps {
  config: PanelConfig;
  onClose: () => void;
  requestId: number;
}

interface InvoiceItem {
  id: number;
  invoice_number: string;
  vendor_name: string;
  amount: number;
  is_archived: boolean;
}

interface RequestDetails {
  request: {
    id: number;
    status: string;
    reason: string;
    totalCount: number;
    totalAmount: number;
    requester: { full_name: string; email: string };
    created_at: Date;
  };
  invoices: InvoiceItem[];
}

export function BulkArchiveReviewPanel({ config, onClose, requestId }: BulkArchiveReviewPanelProps) {
  const [details, setDetails] = React.useState<RequestDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [adminNotes, setAdminNotes] = React.useState('');
  const [selectedInvoices, setSelectedInvoices] = React.useState<Set<number>>(new Set());
  const [approvalMode, setApprovalMode] = React.useState<'all' | 'cherry-pick'>('all');

  const { closePanel } = usePanel();
  const { toast } = useToast();

  const loadDetails = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getBulkArchiveRequestDetails(requestId);

      if (result.success) {
        setDetails(result.data);
        // Initially select all invoices that aren't already archived
        const eligibleInvoices = result.data.invoices
          .filter((inv) => !inv.is_archived)
          .map((inv) => inv.id);
        setSelectedInvoices(new Set(eligibleInvoices));
      } else {
        setError(result.error || 'Failed to load request details');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load request';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  React.useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const handleToggleInvoice = (invoiceId: number) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!details) return;
    const eligibleInvoices = details.invoices
      .filter((inv) => !inv.is_archived)
      .map((inv) => inv.id);
    setSelectedInvoices(new Set(eligibleInvoices));
  };

  const handleDeselectAll = () => {
    setSelectedInvoices(new Set());
  };

  const handleApproveAll = async () => {
    if (!details) return;
    setIsSaving(true);

    try {
      const result = await approveRequest(requestId, undefined, adminNotes || undefined);

      if (result.success) {
        toast({
          title: 'Success',
          description: `All ${details.request.totalCount} invoices archived successfully`,
        });
        closePanel(config.id);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to approve request',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCherryPickApprove = async () => {
    if (!details) return;
    if (selectedInvoices.size === 0) {
      toast({
        title: 'No invoices selected',
        description: 'Please select at least one invoice to approve',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const approvedIds = Array.from(selectedInvoices);
      const rejectedIds = details.invoices
        .filter((inv) => !inv.is_archived && !selectedInvoices.has(inv.id))
        .map((inv) => inv.id);

      const result = await cherryPickBulkArchive(
        requestId,
        approvedIds,
        rejectedIds,
        adminNotes || undefined
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: `${result.data.approvedCount} invoice(s) archived, ${result.data.rejectedCount} rejected`,
        });
        closePanel(config.id);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to process request',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectAll = async () => {
    if (!details) return;
    setIsSaving(true);

    try {
      const result = await rejectRequest(
        requestId,
        adminNotes || 'Bulk archive request rejected'
      );

      if (result.success) {
        toast({
          title: 'Request Rejected',
          description: 'The bulk archive request has been rejected',
        });
        closePanel(config.id);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to reject request',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isPending = details?.request.status === 'pending_approval';
  const eligibleInvoices = details?.invoices.filter((inv) => !inv.is_archived) ?? [];
  const allSelected = eligibleInvoices.length > 0 && selectedInvoices.size === eligibleInvoices.length;

  return (
    <PanelLevel
      config={config}
      title="Review Bulk Archive Request"
      onClose={onClose}
      footer={
        !isLoading && details && isPending ? (
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectAll} disabled={isSaving}>
              Reject All
            </Button>
            {approvalMode === 'all' ? (
              <Button onClick={handleApproveAll} disabled={isSaving}>
                {isSaving ? 'Approving...' : 'Approve All'}
              </Button>
            ) : (
              <Button onClick={handleCherryPickApprove} disabled={isSaving}>
                {isSaving ? 'Processing...' : `Approve ${selectedInvoices.size} Selected`}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Loading request details...</p>
        </div>
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-destructive font-medium">Failed to load request</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={loadDetails} variant="outline">
            Retry
          </Button>
        </div>
      ) : !details ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Request not found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Request Summary Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Bulk Archive Request</h3>
              <Badge variant={details.request.status === 'pending_approval' ? 'default' : 'secondary'}>
                {details.request.status === 'pending_approval' ? 'Pending' : details.request.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Requester:</span>{' '}
                {details.request.requester.full_name}
              </div>
              <div>
                <span className="text-muted-foreground">Request ID:</span>{' '}
                <span className="font-mono">#{details.request.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Invoices:</span>{' '}
                {details.request.totalCount}
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount:</span>{' '}
                {formatCurrency(details.request.totalAmount)}
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Submitted:</span>{' '}
                {formatDate(details.request.created_at)}
              </div>
            </div>

            {details.request.reason && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground">Archive Reason:</span>
                <p className="text-sm mt-1">{details.request.reason}</p>
              </div>
            )}
          </Card>

          {/* Approval Mode Toggle */}
          {isPending && (
            <Card className="p-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Approval Mode:</span>
                <div className="flex gap-2">
                  <Button
                    variant={approvalMode === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApprovalMode('all')}
                  >
                    Approve All
                  </Button>
                  <Button
                    variant={approvalMode === 'cherry-pick' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApprovalMode('cherry-pick')}
                  >
                    Cherry-Pick
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Invoice List */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Invoices ({details.invoices.length})</h3>
              {approvalMode === 'cherry-pick' && isPending && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={allSelected}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={selectedInvoices.size === 0}>
                    Deselect All
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {details.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className={`flex items-center gap-3 p-2 rounded border ${
                    invoice.is_archived
                      ? 'bg-muted/50 opacity-60'
                      : selectedInvoices.has(invoice.id)
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-background'
                  }`}
                >
                  {approvalMode === 'cherry-pick' && isPending && !invoice.is_archived && (
                    <Checkbox
                      checked={selectedInvoices.has(invoice.id)}
                      onCheckedChange={() => handleToggleInvoice(invoice.id)}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {invoice.invoice_number}
                      </span>
                      {invoice.is_archived && (
                        <Badge variant="secondary" className="text-xs">
                          Already Archived
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {invoice.vendor_name}
                    </div>
                  </div>

                  <div className="text-sm font-medium text-right">
                    {formatCurrency(invoice.amount)}
                  </div>

                  {approvalMode === 'cherry-pick' && isPending && !invoice.is_archived && (
                    <div className="flex items-center">
                      {selectedInvoices.has(invoice.id) ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {approvalMode === 'cherry-pick' && isPending && (
              <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedInvoices.size}</span> of{' '}
                <span className="font-medium text-foreground">{eligibleInvoices.length}</span>{' '}
                invoices selected for approval
              </div>
            )}
          </Card>

          {/* Admin Notes */}
          {isPending && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Admin Notes (Optional)</h3>
              <Textarea
                placeholder="Add notes about this approval/rejection..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </Card>
          )}
        </div>
      )}
    </PanelLevel>
  );
}
