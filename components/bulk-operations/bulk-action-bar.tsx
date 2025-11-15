/**
 * Bulk Action Bar Component
 *
 * Sticky toolbar shown when invoices are selected.
 * Provides bulk approve, reject, and export actions.
 *
 * Sprint 7 Phase 8: Bulk Operations
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Download, X } from 'lucide-react';
import { ColumnSelectorDialog } from './column-selector-dialog';
import { RejectionReasonDialog } from './rejection-reason-dialog';
import { useBulkApprove, useBulkReject, useBulkExport } from '@/hooks/use-bulk-operations';

interface BulkActionBarProps {
  selectedInvoiceIds: number[];
  onClearSelection: () => void;
  currentUserRole: string;
}

/**
 * Check if user has admin privileges
 */
function isAdmin(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function BulkActionBar({
  selectedInvoiceIds,
  onClearSelection,
  currentUserRole,
}: BulkActionBarProps) {
  const [showColumnSelector, setShowColumnSelector] = React.useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = React.useState(false);

  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();
  const bulkExportMutation = useBulkExport();

  const isUserAdmin = isAdmin(currentUserRole);
  const selectedCount = selectedInvoiceIds.length;

  const handleBulkApprove = async () => {
    if (selectedCount === 0) return;

    try {
      await bulkApproveMutation.mutateAsync(selectedInvoiceIds);
      onClearSelection();
    } catch {
      // Error handling done in mutation hook
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedCount === 0) return;

    try {
      await bulkRejectMutation.mutateAsync({
        invoiceIds: selectedInvoiceIds,
        reason,
      });
      setShowRejectionDialog(false);
      onClearSelection();
    } catch {
      // Error handling done in mutation hook
    }
  };

  const handleBulkExport = async (columnIds: string[]) => {
    if (selectedCount === 0) return;

    try {
      await bulkExportMutation.mutateAsync({
        invoiceIds: selectedInvoiceIds,
        columnIds,
      });
      setShowColumnSelector(false);
    } catch {
      // Error handling done in mutation hook
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-3xl px-4">
        <div className="bg-card border rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Selection count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedCount} invoice{selectedCount !== 1 ? 's' : ''} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear selection</span>
              </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Export button (all users) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnSelector(true)}
                disabled={bulkExportMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Export to CSV
              </Button>

              {/* Admin-only actions */}
              {isUserAdmin && (
                <>
                  {/* Bulk Reject */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectionDialog(true)}
                    disabled={bulkRejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>

                  {/* Bulk Approve */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleBulkApprove}
                    disabled={bulkApproveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Loading indicator */}
          {(bulkApproveMutation.isPending ||
            bulkRejectMutation.isPending ||
            bulkExportMutation.isPending) && (
            <div className="mt-2 text-sm text-muted-foreground text-center">
              Processing...
            </div>
          )}
        </div>
      </div>

      {/* Column Selector Dialog */}
      <ColumnSelectorDialog
        open={showColumnSelector}
        onClose={() => setShowColumnSelector(false)}
        invoiceIds={selectedInvoiceIds}
        onExport={handleBulkExport}
        isLoading={bulkExportMutation.isPending}
      />

      {/* Rejection Reason Dialog */}
      <RejectionReasonDialog
        open={showRejectionDialog}
        onClose={() => setShowRejectionDialog(false)}
        invoiceIds={selectedInvoiceIds}
        onReject={handleBulkReject}
        isLoading={bulkRejectMutation.isPending}
      />
    </>
  );
}
