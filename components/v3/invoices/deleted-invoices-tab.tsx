'use client';

/**
 * Deleted Invoices Tab Component (Super Admin Only)
 *
 * Displays soft-deleted invoices with recovery options.
 * - Shows deleted invoice details with recovery deadline
 * - Allows recovery (restore) or permanent purge
 * - Color-coded urgency based on days until permanent deletion
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { RefreshCw, RotateCcw, Trash2, AlertTriangle, Clock, Search, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ConfirmationDialog,
  ConfirmationContentRow,
} from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  getDeletedInvoices,
  recoverInvoice,
  permanentPurgeInvoice,
  type DeletedInvoice,
} from '@/app/actions/invoices';
import {
  getSoftDeleteRetentionDays,
  updateSoftDeleteRetentionDays,
} from '@/app/actions/system-settings';
import { formatCurrency } from '@/lib/utils/format';

// ============================================================================
// Helper Functions
// ============================================================================

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
 * Calculate days remaining until recovery deadline
 */
function getDaysRemaining(deadline: Date | string | null): number {
  if (!deadline) return 30; // Default if no deadline
  const d = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get urgency variant based on days remaining
 */
function getUrgencyVariant(daysRemaining: number): 'success' | 'warning' | 'destructive' {
  if (daysRemaining > 14) return 'success';
  if (daysRemaining > 7) return 'warning';
  return 'destructive';
}

// ============================================================================
// Main Component
// ============================================================================

export function DeletedInvoicesTab() {
  const [invoices, setInvoices] = useState<DeletedInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Retention days settings
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [editingRetention, setEditingRetention] = useState(false);
  const [newRetentionDays, setNewRetentionDays] = useState<string>('30');
  const [isSavingRetention, setIsSavingRetention] = useState(false);

  // Dialog states
  const [recoverDialog, setRecoverDialog] = useState<DeletedInvoice | null>(null);
  const [purgeDialog, setPurgeDialog] = useState<DeletedInvoice | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch retention days setting
  const fetchRetentionDays = async () => {
    try {
      const result = await getSoftDeleteRetentionDays();
      if (result.success) {
        setRetentionDays(result.data);
        setNewRetentionDays(String(result.data));
      }
    } catch (err) {
      console.error('fetchRetentionDays error:', err);
    }
  };

  // Save retention days setting
  const handleSaveRetention = async () => {
    const days = parseInt(newRetentionDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error('Please enter a valid number between 1 and 365');
      return;
    }

    setIsSavingRetention(true);
    try {
      const result = await updateSoftDeleteRetentionDays(days);
      if (result.success) {
        setRetentionDays(days);
        setEditingRetention(false);
        toast.success(`Auto-purge period updated to ${days} days`);
      } else {
        toast.error(result.error || 'Failed to update setting');
      }
    } catch (err) {
      toast.error('Failed to update setting');
      console.error('handleSaveRetention error:', err);
    } finally {
      setIsSavingRetention(false);
    }
  };

  // Fetch deleted invoices
  const fetchInvoices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getDeletedInvoices();
      if (result.success) {
        setInvoices(result.data);
      } else {
        setError(result.error || 'Failed to fetch deleted invoices');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch deleted invoices';
      setError(errorMessage);
      console.error('fetchDeletedInvoices error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchRetentionDays();
  }, []);

  // Filter invoices by search term
  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(term) ||
      inv.vendor.name.toLowerCase().includes(term) ||
      inv.invoice_name?.toLowerCase().includes(term)
    );
  });

  // Handle recover invoice
  const handleRecover = async () => {
    if (!recoverDialog) return;

    setIsProcessing(true);
    try {
      const result = await recoverInvoice(recoverDialog.id);
      if (result.success) {
        toast.success(`Invoice ${recoverDialog.invoice_number} recovered successfully`);
        setRecoverDialog(null);
        fetchInvoices();
      } else {
        toast.error(result.error || 'Failed to recover invoice');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      console.error('recoverInvoice error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle permanent purge
  const handlePurge = async () => {
    if (!purgeDialog) return;

    setIsProcessing(true);
    try {
      const result = await permanentPurgeInvoice(purgeDialog.id);
      if (result.success) {
        toast.success(`Invoice ${purgeDialog.invoice_number} permanently deleted`);
        setPurgeDialog(null);
        fetchInvoices();
      } else {
        toast.error(result.error || 'Failed to purge invoice');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
      console.error('permanentPurgeInvoice error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive p-6">
        <div className="flex items-center gap-3 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInvoices}
          className="mt-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search, Settings, and Refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Auto-purge Setting */}
        <div className="flex items-center gap-2 ml-auto">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm text-muted-foreground whitespace-nowrap">
            Auto-purge after:
          </Label>
          {editingRetention ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="365"
                value={newRetentionDays}
                onChange={(e) => setNewRetentionDays(e.target.value)}
                className="w-20 h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRetention();
                  if (e.key === 'Escape') {
                    setEditingRetention(false);
                    setNewRetentionDays(String(retentionDays));
                  }
                }}
                autoFocus
              />
              <span className="text-sm text-muted-foreground">days</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveRetention}
                disabled={isSavingRetention}
                className="h-8 px-2"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingRetention(false);
                  setNewRetentionDays(String(retentionDays));
                }}
                disabled={isSavingRetention}
                className="h-8 px-2"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRetention(true)}
              className="h-8"
            >
              {retentionDays} days
            </Button>
          )}
        </div>

        <Button variant="outline" size="icon" onClick={fetchInvoices} className="h-8 w-8">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Empty State */}
      {filteredInvoices.length === 0 ? (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <Trash2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-muted-foreground">No deleted invoices</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm
                ? 'No invoices match your search criteria'
                : 'Deleted invoices will appear here'}
            </p>
          </div>
        </Card>
      ) : (
        /* Deleted Invoices Table */
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-center">Days Left</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const daysRemaining = getDaysRemaining(invoice.recovery_deadline);
                const urgencyVariant = getUrgencyVariant(daysRemaining);

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        {invoice.invoice_name && (
                          <p className="text-xs text-muted-foreground">
                            {invoice.invoice_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.vendor.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.invoice_amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.deleted_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.deleter?.full_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-[200px] truncate text-sm text-muted-foreground" title={invoice.deleted_reason || undefined}>
                        {invoice.deleted_reason || '-'}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={urgencyVariant}
                        className={cn(
                          'gap-1',
                          urgencyVariant === 'destructive' && 'animate-pulse'
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {daysRemaining}d
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRecoverDialog(invoice)}
                          className="h-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                          title="Recover Invoice"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPurgeDialog(invoice)}
                          className="h-8 text-destructive hover:bg-destructive/10"
                          title="Permanently Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Summary */}
      {filteredInvoices.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {filteredInvoices.length} deleted invoice(s)
        </p>
      )}

      {/* Recover Confirmation Dialog */}
      <ConfirmationDialog
        open={!!recoverDialog}
        onOpenChange={(open) => !open && setRecoverDialog(null)}
        title="Recover Invoice"
        description="This will restore the invoice to its previous state."
        variant="default"
        confirmLabel={isProcessing ? 'Recovering...' : 'Recover'}
        cancelLabel="Cancel"
        onConfirm={handleRecover}
        isLoading={isProcessing}
      >
        {recoverDialog && (
          <div className="space-y-2">
            <ConfirmationContentRow
              label="Invoice"
              value={recoverDialog.invoice_number}
            />
            <ConfirmationContentRow
              label="Vendor"
              value={recoverDialog.vendor.name}
            />
            <ConfirmationContentRow
              label="Amount"
              value={formatCurrency(recoverDialog.invoice_amount)}
            />
          </div>
        )}
      </ConfirmationDialog>

      {/* Purge Confirmation Dialog */}
      <ConfirmationDialog
        open={!!purgeDialog}
        onOpenChange={(open) => !open && setPurgeDialog(null)}
        title="Permanently Delete Invoice"
        description="This action cannot be undone. The invoice will be permanently removed from the database."
        variant="destructive"
        confirmLabel={isProcessing ? 'Deleting...' : 'Delete Permanently'}
        cancelLabel="Cancel"
        onConfirm={handlePurge}
        isLoading={isProcessing}
      >
        {purgeDialog && (
          <div className="space-y-2">
            <ConfirmationContentRow
              label="Invoice"
              value={purgeDialog.invoice_number}
            />
            <ConfirmationContentRow
              label="Vendor"
              value={purgeDialog.vendor.name}
            />
            <ConfirmationContentRow
              label="Amount"
              value={formatCurrency(purgeDialog.invoice_amount)}
            />
            <div className="mt-3 p-3 bg-destructive/10 rounded-md">
              <p className="text-xs text-destructive font-medium">
                Warning: This will permanently delete the invoice, all payments,
                attachments, and comments associated with it.
              </p>
            </div>
          </div>
        )}
      </ConfirmationDialog>
    </div>
  );
}

export default DeletedInvoicesTab;
