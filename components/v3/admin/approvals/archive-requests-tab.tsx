'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFilteredArchives, type ApprovalStatusFilter } from '@/hooks/use-approvals';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Archive, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ApprovalStatusFilterSelect } from './approval-status-filter';
import { RejectionReasonDialog } from './rejection-reason-dialog';

const STATUS_BADGE_CONFIG: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
  pending_approval: { label: 'Pending', variant: 'outline' },
  approved: { label: 'Approved', variant: 'default' },
  rejected: { label: 'Rejected', variant: 'destructive' },
};

export function ArchiveRequestsTab() {
  const [statusFilter, setStatusFilter] = React.useState<ApprovalStatusFilter>('pending');
  const { data: requests, isLoading, error, refetch } = useFilteredArchives(statusFilter);
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = React.useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectingArchive, setRejectingArchive] = React.useState<{
    id: number;
    invoiceNumber?: string;
  } | null>(null);

  const handleApprove = async (requestId: number) => {
    setProcessingId(requestId);
    try {
      const { approveRequest } = await import('@/app/actions/admin/master-data-approval');
      const result = await approveRequest(requestId);
      if (result.success) {
        toast.success('Archive request approved');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
      } else {
        toast.error(result.error || 'Failed to approve request');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (request: { id: number; request_data: unknown }) => {
    const requestData = request.request_data as { invoice_number?: string };
    setRejectingArchive({
      id: request.id,
      invoiceNumber: requestData.invoice_number,
    });
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingArchive) return;

    setProcessingId(rejectingArchive.id);
    try {
      const { rejectRequest } = await import('@/app/actions/admin/master-data-approval');
      const result = await rejectRequest(rejectingArchive.id, reason);
      if (result.success) {
        toast.success('Archive request rejected');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['approval-counts'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
      } else {
        toast.error(result.error || 'Failed to reject request');
        throw new Error(result.error || 'Failed to reject request');
      }
    } finally {
      setProcessingId(null);
      setRejectingArchive(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGE_CONFIG[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const emptyMessage = statusFilter === 'pending'
    ? 'All archive requests have been reviewed'
    : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}archive requests found`;

  const isPending = statusFilter === 'pending';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ApprovalStatusFilterSelect value={statusFilter} onChange={setStatusFilter} />
        <span className="text-sm text-muted-foreground">
          {requests?.length ?? 0} request{(requests?.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card className="p-6 text-center text-destructive">
          Failed to load archive requests
        </Card>
      )}

      {!isLoading && !error && (!requests || requests.length === 0) && (
        <Card className="p-8 text-center">
          <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium text-muted-foreground">No archive requests</h3>
          <p className="text-sm text-muted-foreground mt-1">{emptyMessage}</p>
        </Card>
      )}

      {!isLoading && !error && requests && requests.length > 0 && (
        <div className="space-y-3">
          {requests.map((request) => {
            // request_data is already parsed by getAdminRequests
            const requestData = request.request_data as {
              invoice_id?: number;
              invoice_number?: string;
              reason?: string;
            };

            return (
              <Card key={request.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">
                        Archive Request {requestData.invoice_number ? `- ${requestData.invoice_number}` : `#${request.id}`}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>
                    {requestData.reason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {requestData.reason}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Requested by {request.requester?.full_name || 'Unknown'} on {format(new Date(request.created_at), 'MMM dd, yyyy')}
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
        title="Reject Archive Request"
        description="Please provide a reason for rejecting this archive request. The requester will be notified."
        itemName={rejectingArchive?.invoiceNumber ? `Invoice #${rejectingArchive.invoiceNumber}` : undefined}
      />
    </div>
  );
}

export default ArchiveRequestsTab;
