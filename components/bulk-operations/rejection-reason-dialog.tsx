/**
 * Rejection Reason Dialog Component
 *
 * Dialog for entering bulk rejection reason.
 * Validates min/max character requirements.
 *
 * Sprint 7 Phase 8: Bulk Operations
 */

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle } from 'lucide-react';

interface RejectionReasonDialogProps {
  open: boolean;
  onClose: () => void;
  invoiceIds: number[];
  onReject: (reason: string) => void;
  isLoading?: boolean;
}

const MIN_LENGTH = 10;
const MAX_LENGTH = 500;

export function RejectionReasonDialog({
  open,
  onClose,
  invoiceIds,
  onReject,
  isLoading = false,
}: RejectionReasonDialogProps) {
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  // Validate reason in real-time
  React.useEffect(() => {
    const trimmed = reason.trim();

    if (reason.length === 0) {
      setError(null);
    } else if (trimmed.length < MIN_LENGTH) {
      setError(`Rejection reason must be at least ${MIN_LENGTH} characters (excluding whitespace)`);
    } else if (reason.length > MAX_LENGTH) {
      setError(`Rejection reason too long (max ${MAX_LENGTH} characters)`);
    } else {
      setError(null);
    }
  }, [reason]);

  const handleReject = () => {
    const trimmed = reason.trim();

    // Final validation
    if (trimmed.length < MIN_LENGTH) {
      setError(`Rejection reason must be at least ${MIN_LENGTH} characters (excluding whitespace)`);
      return;
    }

    if (reason.length > MAX_LENGTH) {
      setError(`Rejection reason too long (max ${MAX_LENGTH} characters)`);
      return;
    }

    onReject(reason);
  };

  const isValid = reason.trim().length >= MIN_LENGTH && reason.length <= MAX_LENGTH;
  const charCount = reason.length;
  const charRemaining = MAX_LENGTH - charCount;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Reject Invoices</DialogTitle>
          <DialogDescription>
            Enter a rejection reason for the selected invoices.
            {invoiceIds.length > 0 && (
              <span className="block mt-1 font-medium text-foreground">
                Rejecting {invoiceIds.length} invoice{invoiceIds.length !== 1 ? 's' : ''}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter the reason for rejecting these invoices..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={5}
              className={error ? 'border-destructive' : ''}
            />

            {/* Character counter */}
            <div className="flex items-center justify-between text-sm">
              <span className={charCount < MIN_LENGTH ? 'text-muted-foreground' : 'text-green-600'}>
                {reason.trim().length} / {MIN_LENGTH} characters minimum
              </span>
              <span className={charRemaining < 50 ? 'text-amber-600' : 'text-muted-foreground'}>
                {charRemaining} characters remaining
              </span>
            </div>

            {/* Error message */}
            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Validation hints */}
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Minimum {MIN_LENGTH} characters (excluding whitespace)</li>
              <li>Maximum {MAX_LENGTH} characters</li>
              <li>This reason will be applied to all selected invoices</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={!isValid || isLoading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Rejecting...' : 'Reject Invoices'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
