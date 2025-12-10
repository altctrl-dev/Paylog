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
import { Loader2 } from 'lucide-react';

interface RejectionReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  title?: string;
  description?: string;
  itemName?: string;
}

export function RejectionReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Reject Request',
  description = 'Please provide a reason for rejection. This will be shared with the requester.',
  itemName,
}: RejectionReasonDialogProps) {
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } catch {
      setError('Failed to reject. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {itemName && <span className="font-medium">{itemName}</span>}
              {itemName && <br />}
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">
                Reason for Rejection <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                className="min-h-[100px]"
                disabled={isSubmitting}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !reason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
