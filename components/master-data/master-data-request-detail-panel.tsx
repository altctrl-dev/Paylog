/**
 * Master Data Request Detail Panel (Level 2)
 *
 * View and manage master data request details.
 * Actions available based on request status:
 * - Draft: Edit, Delete, Submit
 * - Pending: Cancel (withdraw)
 * - Rejected: Resubmit
 * - Approved: View only
 */

'use client';

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useToast } from '@/hooks/use-toast';
import {
  getRequestById,
  submitRequest,
  deleteRequest,
  type MasterDataRequestWithDetails,
  type MasterDataEntityType,
} from '@/app/actions/master-data-requests';
import type { PanelConfig } from '@/types/panel';
import { PANEL_WIDTH } from '@/types/panel';

interface MasterDataRequestDetailPanelProps {
  config: PanelConfig;
  onClose: () => void;
  requestId: number;
}

// Get status badge variant
function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'draft':
      return 'muted';
    case 'pending_approval':
      return 'info';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'destructive';
    default:
      return 'default';
  }
}

// Get status display text
function getStatusDisplayText(status: string) {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'pending_approval':
      return 'Pending Approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    default:
      return status;
  }
}

// Get entity display name
function getEntityDisplayName(entityType: MasterDataEntityType): string {
  switch (entityType) {
    case 'vendor':
      return 'Vendor';
    case 'category':
      return 'Category';
    case 'invoice_profile':
      return 'Invoice Profile';
    case 'payment_type':
      return 'Payment Type';
    case 'invoice_archive':
      return 'Invoice Archive';
  }
}

// Format date for display
function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MasterDataRequestDetailPanel({
  config,
  onClose,
  requestId,
}: MasterDataRequestDetailPanelProps) {
  const { openPanel, closeTopPanel } = usePanel();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActionInProgress, setIsActionInProgress] = React.useState(false);

  // Fetch request details
  const { data: requestResult, isLoading, isError, error } = useQuery({
    queryKey: ['master-data-request', requestId],
    queryFn: async () => {
      const result = await getRequestById(requestId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data;
    },
    retry: 1, // Only retry once on failure
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const request = requestResult as MasterDataRequestWithDetails | undefined;

  // Handle submit action
  const handleSubmit = async () => {
    if (!request) return;
    setIsActionInProgress(true);
    try {
      const result = await submitRequest(requestId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Request submitted for approval',
        });
        queryClient.invalidateQueries({ queryKey: ['master-data-request'] });
        closeTopPanel();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Handle delete action
  const handleDelete = async () => {
    if (!request) return;
    if (!confirm('Are you sure you want to delete this draft request?')) {
      return;
    }
    setIsActionInProgress(true);
    try {
      const result = await deleteRequest(requestId);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Request deleted',
        });
        queryClient.invalidateQueries({ queryKey: ['master-data-request'] });
        closeTopPanel();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete request',
        variant: 'destructive',
      });
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Handle resubmit action
  const handleResubmit = () => {
    if (!request) return;
    openPanel(
      'master-data-request-form',
      {
        entityType: request.entity_type,
        initialData: request.request_data,
        isResubmit: true,
        originalRequestId: requestId,
      },
      { width: PANEL_WIDTH.MEDIUM }
    );
  };

  // Handle edit action (convert to form mode)
  const handleEdit = () => {
    if (!request) return;
    openPanel(
      'master-data-request-form',
      {
        entityType: request.entity_type,
        initialData: request.request_data,
        requestId: requestId,
        isEdit: true,
      },
      { width: PANEL_WIDTH.MEDIUM }
    );
  };

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title="Loading..."
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-muted-foreground">Loading request...</div>
        </div>
      </PanelLevel>
    );
  }

  if (isError) {
    return (
      <PanelLevel
        config={config}
        title="Error"
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center p-8 space-y-2">
          <div className="text-sm text-destructive font-medium">Failed to load request</div>
          <div className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      </PanelLevel>
    );
  }

  if (!request) {
    return (
      <PanelLevel
        config={config}
        title="Error"
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex items-center justify-center p-8">
          <div className="text-sm text-destructive">Request not found</div>
        </div>
      </PanelLevel>
    );
  }

  const entityName = getEntityDisplayName(request.entity_type);

  return (
    <PanelLevel
      config={config}
      title={`${entityName} Request`}
      onClose={onClose}
      footer={
        <>
          {request.status === 'draft' && (
            <>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isActionInProgress}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
                disabled={isActionInProgress}
              >
                Edit
              </Button>
              <Button onClick={handleSubmit} disabled={isActionInProgress}>
                {isActionInProgress ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </>
          )}
          {request.status === 'pending_approval' && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
          {request.status === 'rejected' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={handleResubmit}
                disabled={isActionInProgress || request.resubmission_count >= 2}
                title={request.resubmission_count >= 2 ? 'Maximum resubmission limit reached (3 total attempts)' : undefined}
              >
                {request.resubmission_count >= 2 ? 'Limit Reached' : 'Resubmit Request'}
              </Button>
            </>
          )}
          {request.status === 'approved' && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Status</h3>
          <Badge variant={getStatusBadgeVariant(request.status)}>
            {getStatusDisplayText(request.status)}
          </Badge>
        </div>

        {/* Request Data */}
        <div className="rounded-md border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold mb-2">Request Details</h3>
          {Object.entries(request.request_data).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground capitalize">
                {key.replace(/_/g, ' ')}
              </Label>
              <div className="text-sm">
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value || 'N/A'}
              </div>
            </div>
          ))}
        </div>

        {/* Requester Info */}
        <div className="rounded-md border border-border p-4 space-y-2">
          <h3 className="text-sm font-semibold mb-2">Requester</h3>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <div className="text-sm">{request.requester.full_name}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <div className="text-sm">{request.requester.email}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Submitted On</Label>
            <div className="text-sm">{formatDate(request.created_at)}</div>
          </div>
        </div>

        {/* Reviewer Info (if reviewed) */}
        {request.reviewer && (
          <div className="rounded-md border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold mb-2">Reviewer</h3>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <div className="text-sm">{request.reviewer.full_name}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="text-sm">{request.reviewer.email}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Reviewed On</Label>
              <div className="text-sm">{formatDate(request.reviewed_at)}</div>
            </div>
          </div>
        )}

        {/* Rejection Reason (if rejected) */}
        {request.status === 'rejected' && request.rejection_reason && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-destructive">
              Rejection Reason
            </h3>
            <p className="text-sm">{request.rejection_reason}</p>
          </div>
        )}

        {/* Admin Notes (if present) */}
        {request.admin_notes && (
          <div className="rounded-md border border-border p-4 space-y-2">
            <h3 className="text-sm font-semibold">Admin Notes</h3>
            <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
          </div>
        )}

        {/* Created Entity ID (if approved) */}
        {request.status === 'approved' && request.created_entity_id && (
          <div className="rounded-md border border-success/50 bg-success/10 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-success-foreground">
              Created Successfully
            </h3>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Entity ID</Label>
              <div className="text-sm font-mono">{request.created_entity_id}</div>
            </div>
          </div>
        )}

        {/* Resubmission Info */}
        {request.resubmission_count > 0 && (
          <div className={`rounded-md border p-3 text-xs ${request.resubmission_count >= 2 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
            <p className={request.resubmission_count >= 2 ? 'text-red-700' : 'text-amber-700'}>
              <strong>Resubmission #{request.resubmission_count}</strong> -
              {request.resubmission_count >= 2
                ? ' Maximum limit reached (3 total attempts: initial + 2 resubmissions)'
                : ` You have ${2 - request.resubmission_count} more resubmission${2 - request.resubmission_count === 1 ? '' : 's'} available`
              }
            </p>
          </div>
        )}
      </div>
    </PanelLevel>
  );
}
