/**
 * Invoice Approval with Vendor Modal
 *
 * Modal shown when admin attempts to approve invoice with pending vendor.
 * Provides streamlined approval for both vendor and invoice together.
 */

'use client';

import * as React from 'react';
import { AlertCircle, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface InvoiceApprovalWithVendorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: {
    id: number;
    name: string;
    status: string;
    address: string | null;
    gst_exemption: boolean;
    bank_details: string | null;
    created_by_user_id: number | null;
    created_at: Date;
  };
  onApproveBoth: () => Promise<void>;
  onViewVendorDetails?: () => void;
  isLoading?: boolean;
}

export function InvoiceApprovalWithVendorModal({
  open,
  onOpenChange,
  vendor,
  onApproveBoth,
  onViewVendorDetails,
  isLoading = false,
}: InvoiceApprovalWithVendorModalProps) {
  const [isApproving, setIsApproving] = React.useState(false);

  const handleApproveBoth = async () => {
    setIsApproving(true);
    try {
      await onApproveBoth();
      onOpenChange(false);
    } catch (error) {
      console.error('[InvoiceApprovalWithVendorModal] Approval failed:', error);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Vendor Pending Approval
          </DialogTitle>
          <DialogDescription>
            This invoice uses a vendor that has not been approved yet. You can approve both the vendor and invoice together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vendor Details Card */}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Vendor Information</h3>
                <Badge variant="outline" className="mt-1 text-xs">
                  {vendor.status}
                </Badge>
              </div>
              {onViewVendorDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewVendorDetails}
                  className="text-xs"
                >
                  View Full Details
                </Button>
              )}
            </div>

            {/* Simple divider instead of Separator */}
            <div className="my-3 h-px bg-border" />

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Name</dt>
                <dd className="mt-1 font-semibold">{vendor.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd className="mt-1">{new Date(vendor.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="col-span-2">
                <dt className="font-medium text-muted-foreground">Address</dt>
                <dd className="mt-1">{vendor.address || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">GST Exemption</dt>
                <dd className="mt-1">{vendor.gst_exemption ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Bank Details</dt>
                <dd className="mt-1">{vendor.bank_details ? 'Provided' : 'Not provided'}</dd>
              </div>
            </dl>
          </div>

          {/* Info Banner */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <p className="font-medium">What happens when you approve?</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>✓ Vendor status: PENDING_APPROVAL → APPROVED</li>
              <li>✓ Invoice status: PENDING_APPROVAL → UNPAID</li>
              <li>✓ Vendor becomes available for all users</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isApproving}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleApproveBoth}
            disabled={isApproving || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            {isApproving ? 'Approving...' : 'Approve Both'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
