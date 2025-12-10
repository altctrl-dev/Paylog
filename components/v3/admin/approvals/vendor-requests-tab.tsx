'use client';

/**
 * Vendor Requests Tab Component (v3)
 *
 * Displays vendor approval requests for admin review with status filtering.
 * Uses master data request workflow - approving/rejecting a vendor request
 * creates or rejects the vendor entity accordingly.
 *
 * Features:
 * - Lists vendor requests from MasterDataRequest table
 * - Status filter (Pending/Approved/Rejected/All)
 * - Approve/reject actions with appropriate feedback
 * - Auto-refreshes approval counts after actions
 */

import * as React from 'react';
import { useFilteredVendors, type ApprovalStatusFilter } from '@/hooks/use-approvals';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Building2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { approveRequest, rejectRequest } from '@/app/actions/admin/master-data-approval';
import { toast } from 'sonner';
import type { VendorRequestData } from '@/app/actions/master-data-requests';
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
  } | null>(null);

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const result = await approveRequest(requestId);
      if (result.success) {
        toast.success('Vendor approved');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
      } else {
        toast.error(result.error || 'Failed to approve vendor');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (request: { id: number; request_data: unknown }) => {
    const vendorData = request.request_data as VendorRequestData;
    setRejectingVendor({
      id: request.id,
      name: vendorData.name,
    });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingVendor) return;

    setProcessingId(rejectingVendor.id);
    try {
      const result = await rejectRequest(rejectingVendor.id, reason);
      if (result.success) {
        toast.success('Vendor rejected');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
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
            // Extract vendor data from the request
            const vendorData = request.request_data as VendorRequestData;

            return (
              <Card key={request.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{vendorData.name}</span>
                      {getStatusBadge(request.status)}
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
                        onClick={() => handleApprove(request.id)}
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
