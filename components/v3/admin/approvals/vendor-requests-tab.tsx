'use client';

/**
 * Vendor Requests Tab Component (v3)
 *
 * Displays vendor approval requests for admin review with status filtering.
 *
 * BUG-007 FIX: Now supports two types of vendor requests:
 * 1. MasterDataRequest vendors - submitted through the master data request workflow
 * 2. Direct pending vendors - created via invoice form with PENDING_APPROVAL status
 *
 * Features:
 * - Lists vendor requests from both MasterDataRequest table and Vendor table
 * - Status filter (Pending/Approved/Rejected/All)
 * - Approve/reject actions with appropriate feedback
 * - Auto-refreshes approval counts after actions
 */

import * as React from 'react';
import { useFilteredVendors, type ApprovalStatusFilter, type NormalizedVendorRequest } from '@/hooks/use-approvals';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { approveRequest, rejectRequest, approveVendorRequest, rejectVendorRequest } from '@/app/actions/admin/master-data-approval';
import { toast } from 'sonner';
import { ApprovalStatusFilterSelect } from './approval-status-filter';
import { RejectionReasonDialog } from './rejection-reason-dialog';

const STATUS_BADGE_CONFIG: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
  pending_approval: { label: 'Pending Approval', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export function VendorRequestsTab() {
  const [statusFilter, setStatusFilter] = React.useState<ApprovalStatusFilter>('pending');
  const { data: vendorRequests, isLoading, error, refetch } = useFilteredVendors(statusFilter);
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = React.useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectingVendor, setRejectingVendor] = React.useState<{
    id: number;
    name: string;
    type: 'request' | 'direct';
    vendorId?: number;
    requestId?: number;
  } | null>(null);

  /**
   * Handle approval for both MasterDataRequest and direct vendors
   * BUG-007 FIX: Uses different approval functions based on vendor type
   */
  const handleApprove = async (request: NormalizedVendorRequest) => {
    setProcessingId(request.id);
    try {
      let result;

      if (request.type === 'request' && request.requestId) {
        // MasterDataRequest vendor - use existing workflow
        result = await approveRequest(request.requestId);
      } else if (request.type === 'direct' && request.vendorId) {
        // Direct pending vendor - use vendor approval function
        // BUG-007 FIX: Server action now gets adminId internally from session
        result = await approveVendorRequest(request.vendorId);
      } else {
        throw new Error('Invalid vendor request type');
      }

      if (result.success) {
        toast.success('Vendor approved');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
      } else {
        toast.error(result.error || 'Failed to approve vendor');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Handle reject click for both MasterDataRequest and direct vendors
   * BUG-007 FIX: Stores vendor type for correct rejection handler
   */
  const handleRejectClick = (request: NormalizedVendorRequest) => {
    setRejectingVendor({
      id: request.id,
      name: request.request_data.name,
      type: request.type,
      vendorId: request.vendorId,
      requestId: request.requestId,
    });
    setRejectDialogOpen(true);
  };

  /**
   * Handle rejection confirmation for both types
   * BUG-007 FIX: Uses different rejection functions based on vendor type
   */
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingVendor) return;

    setProcessingId(rejectingVendor.id);
    try {
      let result;

      if (rejectingVendor.type === 'request' && rejectingVendor.requestId) {
        // MasterDataRequest vendor
        result = await rejectRequest(rejectingVendor.requestId, reason);
      } else if (rejectingVendor.type === 'direct' && rejectingVendor.vendorId) {
        // Direct pending vendor - cascade rejection to invoices
        result = await rejectVendorRequest(rejectingVendor.vendorId, reason);
        if (result.success && result.data?.rejectedInvoicesCount > 0) {
          toast.info(`Also rejected ${result.data.rejectedInvoicesCount} associated invoice(s)`);
        }
      } else {
        throw new Error('Invalid vendor rejection type');
      }

      if (result.success) {
        toast.success('Vendor rejected');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        queryClient.invalidateQueries({ queryKey: ['vendors'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } else {
        toast.error(result.error || 'Failed to reject vendor');
        throw new Error(result.error || 'Failed to reject vendor');
      }
    } finally {
      setProcessingId(null);
      setRejectingVendor(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGE_CONFIG[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const emptyMessage = statusFilter === 'pending'
    ? 'All vendor requests have been reviewed'
    : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}vendor requests found`;

  const isPending = statusFilter === 'pending';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ApprovalStatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
        <span className="text-sm text-muted-foreground">
          {vendorRequests?.length ?? 0} request{(vendorRequests?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-destructive">
          Failed to load vendor requests
        </Card>
      )}

      {!isLoading && !error && (!vendorRequests || vendorRequests.length === 0) && (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-muted-foreground">No vendor requests</h3>
          <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>
        </Card>
      )}

      {!isLoading && !error && vendorRequests && vendorRequests.length > 0 && (
        <div className="space-y-3">
          {vendorRequests.map((request) => {
            // Use normalized vendor data structure (BUG-007 FIX)
            const vendorData = request.request_data;

            return (
              <Card key={request.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{vendorData.name}</span>
                      {getStatusBadge(request.status)}
                      {/* Show badge for direct vendors (created via invoice form) */}
                      {request.type === 'direct' && (
                        <Badge variant="secondary" className="text-xs">
                          Via Invoice
                        </Badge>
                      )}
                    </div>
                    {vendorData.address && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {vendorData.address}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested by {request.requester?.full_name || 'Unknown'} on{' '}
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleApprove(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRejectClick(request)}
                        disabled={processingId === request.id}
                      >
                        {processingId === request.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RejectionReasonDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleRejectConfirm}
        title="Reject Vendor Request"
        description="Please provide a reason for rejecting this vendor request. The requester will be notified."
        itemName={rejectingVendor?.name}
      />
    </div>
  );
}

export default VendorRequestsTab;
