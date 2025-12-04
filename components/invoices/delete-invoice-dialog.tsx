/**
 * Delete Invoice Dialog
 *
 * Confirmation dialog for permanently deleting an invoice.
 * Moves invoice files to Deleted folder and removes from database.
 * Available to super_admin users only.
 */

'use client';

import * as React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { permanentDeleteInvoice } from '@/app/actions/invoices';
import { toast } from 'sonner';

interface DeleteInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  invoiceNumber: string;
  onSuccess?: () => void;
}

export function DeleteInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  onSuccess,
}: DeleteInvoiceDialogProps) {
  const [reason, setReason] = React.useState('');
  const [confirmText, setConfirmText] = React.useState('');
  const [isPending, setIsPending] = React.useState(false);

  const isConfirmed = confirmText === invoiceNumber;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsPending(true);
    try {
      const result = await permanentDeleteInvoice(invoiceId, reason || undefined);
      if (result.success) {
        toast.success(`Invoice ${invoiceNumber} has been permanently deleted`);
        onOpenChange(false);
        setReason('');
        setConfirmText('');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to delete invoice');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      console.error('Delete invoice error:', error);
    } finally {
      setIsPending(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setReason('');
    setConfirmText('');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <span className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Permanently Delete Invoice
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to permanently delete invoice <strong>{invoiceNumber}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 mt-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-sm text-destructive">
            <p className="font-medium">Warning: This action cannot be undone!</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Invoice record will be removed from the database</li>
              <li>All payments, comments, and attachments will be deleted</li>
              <li>Files will be moved to the Deleted folder (not permanently removed from storage)</li>
            </ul>
          </div>
        </div>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="delete-reason" className="text-sm font-medium mb-2 block">
              Reason (optional)
            </Label>
            <Textarea
              id="delete-reason"
              placeholder="Enter reason for deletion..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[60px]"
              disabled={isPending}
            />
          </div>
          <div>
            <Label htmlFor="confirm-delete" className="text-sm font-medium mb-2 block">
              Type <strong className="font-mono">{invoiceNumber}</strong> to confirm
            </Label>
            <Input
              id="confirm-delete"
              placeholder="Enter invoice number to confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
              disabled={isPending}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!isConfirmed || isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? 'Deleting...' : 'Delete Permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
