/**
 * Archive Invoice Dialog
 *
 * Confirmation dialog for archiving an invoice.
 * Moves invoice files to Archived folder and marks invoice as archived.
 * Available to admin and super_admin users only.
 */

'use client';

import * as React from 'react';
import { Archive, AlertTriangle } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { archiveInvoice } from '@/app/actions/invoices';
import { toast } from 'sonner';

interface ArchiveInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  invoiceNumber: string;
  onSuccess?: () => void;
}

export function ArchiveInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  onSuccess,
}: ArchiveInvoiceDialogProps) {
  const [reason, setReason] = React.useState('');
  const [isPending, setIsPending] = React.useState(false);

  const handleArchive = async () => {
    setIsPending(true);
    try {
      const result = await archiveInvoice(invoiceId, reason || undefined);
      if (result.success) {
        toast.success(`Invoice ${invoiceNumber} has been archived`);
        onOpenChange(false);
        setReason('');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to archive invoice');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Archive invoice error:', error);
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setReason('');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <span className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Archive Invoice
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive invoice <strong>{invoiceNumber}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 mt-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium">This will:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Move associated files to the Archived folder</li>
              <li>Hide the invoice from the main list</li>
              <li>Preserve the invoice data for audit purposes</li>
            </ul>
          </div>
        </div>
        <div className="py-4">
          <Label htmlFor="archive-reason" className="text-sm font-medium mb-2 block">
            Reason (optional)
          </Label>
          <Textarea
            id="archive-reason"
            placeholder="Enter reason for archiving..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
            disabled={isPending}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isPending ? 'Archiving...' : 'Archive Invoice'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
