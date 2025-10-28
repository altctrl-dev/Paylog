/**
 * Admin Request Review Panel
 *
 * Level 2 panel for admins to review, edit, approve, or reject master data requests.
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { usePanel } from '@/hooks/use-panel';
import { getRequestById } from '@/app/actions/master-data-requests';
import { approveRequest } from '@/app/actions/admin/master-data-approval';
import type {
  MasterDataRequestWithDetails,
} from '@/app/actions/master-data-requests';
import type { PanelConfig } from '@/types/panel';
import { useToast } from '@/hooks/use-toast';

interface AdminRequestReviewPanelProps {
  config: PanelConfig;
  onClose: () => void;
  requestId: number;
}

export function AdminRequestReviewPanel({ config, onClose, requestId }: AdminRequestReviewPanelProps) {
  const [request, setRequest] = React.useState<MasterDataRequestWithDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [adminEdits, setAdminEdits] = React.useState<Record<string, unknown>>({});
  const [adminNotes, setAdminNotes] = React.useState('');
  const { openPanel} = usePanel();
  const { toast } = useToast();
  const loadingRef = React.useRef(false);

  const loadRequest = React.useCallback(async () => {
    // Guard against concurrent calls using ref
    if (loadingRef.current) return;
    loadingRef.current = true;

    setIsLoading(true);
    setError(null);

    // Add timeout to prevent infinite loading
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      setIsLoading(false);
      setError('Request timed out. Please try again.');
      loadingRef.current = false;
      toast({
        title: 'Timeout',
        description: 'Failed to load request. Please try again.',
        variant: 'destructive',
      });
    }, 10000); // 10 second timeout

    try {
      const result = await getRequestById(requestId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (result.success) {
        setRequest(result.data);
        // Pre-fill admin edits if they exist
        if (result.data.admin_edits) {
          setAdminEdits(result.data.admin_edits);
        }
        // Pre-fill admin notes if they exist
        if (result.data.admin_notes) {
          setAdminNotes(result.data.admin_notes);
        }
      } else {
        setError(result.error || 'Failed to load request');
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to load request';
      console.error('Failed to load request:', error);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsLoading(false);
      loadingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);
  // Note: toast is intentionally excluded from dependencies to prevent infinite re-render loop
  // toast is a stable reference from useToast hook and doesn't need to trigger re-fetch

  // Load request on mount and when requestId changes
  React.useEffect(() => {
    loadRequest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);
  // Note: loadRequest is intentionally excluded to prevent infinite loop
  // We only want to re-fetch when requestId changes

  const handleEditField = (field: string, value: unknown) => {
    setAdminEdits((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApprove = async () => {
    if (!request) return;

    setIsSaving(true);
    try {
      const result = await approveRequest(
        requestId,
        Object.keys(adminEdits).length > 0 ? adminEdits : undefined,
        adminNotes || undefined
      );

      if (result.success) {
        toast({
          title: 'Request Approved',
          description: `Request approved successfully. Entity created: ${result.data.created_entity_id}`,
        });

        // Dispatch event to refresh admin list
        window.dispatchEvent(new CustomEvent('admin-request-reviewed'));

        // Close panel
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReject = () => {
    // Open Level 3 rejection modal
    openPanel('admin-rejection-modal', { requestId }, { width: 500 });
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      vendor: 'Vendor',
      category: 'Category',
      invoice_profile: 'Invoice Profile',
      payment_type: 'Payment Type',
    };
    return labels[entityType] || entityType;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      pending_approval: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
    };
    const variant = variants[status] || variants.draft;
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${variant.bg} ${variant.text}`}>
        {variant.label}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Get final data (original + edits)
  const getFinalValue = (field: string): unknown => {
    if (adminEdits[field] !== undefined) {
      return adminEdits[field];
    }
    if (!request) return undefined;
    const data = request.request_data as unknown as Record<string, unknown>;
    return data[field];
  };

  const getAdminEditValue = <T,>(field: string): T | undefined => {
    return adminEdits[field] as T | undefined;
  };

  const isPending = request?.status === 'pending_approval';
  const editedName = getAdminEditValue<string>('name');
  const editedDescription = getAdminEditValue<string>('description');

  return (
    <PanelLevel
      config={config}
      title="Review Request"
      onClose={onClose}
      footer={
        !isLoading && request && isPending ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSaving}>
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={isSaving}>
              {isSaving ? 'Approving...' : 'Approve'}
            </Button>
          </>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Loading request...</p>
          <p className="text-xs text-muted-foreground">If this takes too long, try closing and reopening the panel</p>
        </div>
      ) : error ? (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="text-destructive font-medium">Failed to load request</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={loadRequest} variant="outline">
            Retry
          </Button>
        </div>
      ) : !request ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Request not found</p>
        </div>
      ) : (
          <div className="space-y-6">
            {/* Request Status Card */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  {getStatusBadge(request.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Entity Type</span>
                  <span className="text-sm">{getEntityTypeLabel(request.entity_type)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Request ID</span>
                  <span className="text-sm font-mono">#{request.id}</span>
                </div>
              </div>
            </Card>

            {/* Requester Info Card */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Requester Information</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Name</span>
                  <span className="text-sm">{request.requester.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <span className="text-sm">{request.requester.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Created</span>
                  <span className="text-sm">{formatDate(request.created_at)}</span>
                </div>
                {request.resubmission_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Resubmission</span>
                    <span className="text-sm text-amber-600 font-medium">
                      Attempt #{request.resubmission_count + 1}/4
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Request Data Card */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Request Data</h3>
                {isPending && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'Cancel Edit' : 'Edit'}
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Name Field (all entity types have name) */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                  {isEditing ? (
                    <Input
                      value={(getFinalValue('name') as string | undefined) ?? ''}
                      onChange={(e) => handleEditField('name', e.target.value)}
                      placeholder="Enter name"
                    />
                  ) : (
                    <div className="text-sm p-2 bg-gray-50 rounded border border-gray-200">
                      {(getFinalValue('name') as string | undefined) || '-'}
                    </div>
                  )}
                  {editedName !== undefined && editedName !== request.request_data.name && (
                    <p className="text-xs text-blue-600 mt-1">
                      Original: {request.request_data.name}
                    </p>
                  )}
                </div>

                {/* Vendor-specific fields */}
                {request.entity_type === 'vendor' && (
                  <>
                    {/* Address */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                      {isEditing ? (
                        <Textarea
                          value={(getFinalValue('address') as string | undefined) ?? ''}
                          onChange={(e) => handleEditField('address', e.target.value)}
                          placeholder="Enter address"
                          rows={3}
                        />
                      ) : (
                        <div className="text-sm p-2 bg-gray-50 rounded border border-gray-200 min-h-[60px]">
                          {(getFinalValue('address') as string | undefined) || '-'}
                        </div>
                      )}
                      {(() => {
                        const originalAddress =
                          'address' in request.request_data
                            ? (request.request_data as { address?: string }).address
                            : undefined;
                        return (
                          adminEdits.address !== undefined &&
                          adminEdits.address !== originalAddress && (
                            <p className="text-xs text-blue-600 mt-1">
                              Original: {originalAddress || 'None'}
                            </p>
                          )
                        );
                      })()}
                    </div>

                    {/* GST/VAT Exempt */}
                    <div>
                      <label className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={
                              (getFinalValue('gst_exemption') as boolean | undefined) ?? false
                            }
                            onChange={(e) => handleEditField('gst_exemption', e.target.checked)}
                            className="h-4 w-4"
                          />
                        ) : (
                          <div className="h-4 w-4 border rounded flex items-center justify-center bg-gray-50">
                            {(getFinalValue('gst_exemption') as boolean | undefined) ? '✓' : ''}
                          </div>
                        )}
                        <span className="text-sm font-medium">GST/VAT Exempt</span>
                      </label>
                    </div>

                    {/* Bank Details */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Bank Details</label>
                      {isEditing ? (
                        <Textarea
                          value={(getFinalValue('bank_details') as string | undefined) ?? ''}
                          onChange={(e) => handleEditField('bank_details', e.target.value)}
                          placeholder="Enter bank details"
                          rows={4}
                        />
                      ) : (
                        <div className="text-sm p-2 bg-gray-50 rounded border border-gray-200 min-h-[80px]">
                          {(getFinalValue('bank_details') as string | undefined) || '-'}
                        </div>
                      )}
                      {(() => {
                        const originalBankDetails =
                          'bank_details' in request.request_data
                            ? (request.request_data as { bank_details?: string }).bank_details
                            : undefined;
                        return (
                          adminEdits.bank_details !== undefined &&
                          adminEdits.bank_details !== originalBankDetails && (
                            <p className="text-xs text-blue-600 mt-1">
                              Original: {originalBankDetails || 'None'}
                            </p>
                          )
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* Description Field (invoice_profile, payment_type) */}
                {(request.entity_type === 'invoice_profile' || request.entity_type === 'payment_type') && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                    {isEditing ? (
                      <Textarea
                        value={(getFinalValue('description') as string | undefined) ?? ''}
                        onChange={(e) => handleEditField('description', e.target.value)}
                        placeholder="Enter description"
                        rows={3}
                      />
                    ) : (
                      <div className="text-sm p-2 bg-gray-50 rounded border border-gray-200 min-h-[60px]">
                        {(getFinalValue('description') as string | undefined) || '-'}
                      </div>
                    )}
                    {(() => {
                      const originalDescription =
                        'description' in request.request_data
                          ? (request.request_data as { description?: string }).description
                          : undefined;
                      return (
                        editedDescription !== undefined &&
                        editedDescription !== originalDescription && (
                          <p className="text-xs text-blue-600 mt-1">
                            Original: {originalDescription || 'None'}
                          </p>
                        )
                      );
                    })()}
                  </div>
                )}

                {/* Visible to All (invoice_profile) */}
                {request.entity_type === 'invoice_profile' && (
                  <div>
                    <label className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={
                            (getFinalValue('visible_to_all') as boolean | undefined) ?? true
                          }
                          onChange={(e) => handleEditField('visible_to_all', e.target.checked)}
                          className="h-4 w-4"
                        />
                      ) : (
                        <div className="h-4 w-4 border rounded flex items-center justify-center bg-gray-50">
                          {(getFinalValue('visible_to_all') as boolean | undefined) ? '✓' : ''}
                        </div>
                      )}
                      <span className="text-sm font-medium">Visible to All</span>
                    </label>
                  </div>
                )}

                {/* Requires Reference (payment_type) */}
                {request.entity_type === 'payment_type' && (
                  <div>
                    <label className="flex items-center gap-2">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={
                            (getFinalValue('requires_reference') as boolean | undefined) ?? false
                          }
                          onChange={(e) => handleEditField('requires_reference', e.target.checked)}
                          className="h-4 w-4"
                        />
                      ) : (
                        <div className="h-4 w-4 border rounded flex items-center justify-center bg-gray-50">
                          {(getFinalValue('requires_reference') as boolean | undefined)
                            ? '✓'
                            : ''}
                        </div>
                      )}
                      <span className="text-sm font-medium">Requires Reference</span>
                    </label>
                  </div>
                )}
              </div>
            </Card>

            {/* Admin Notes */}
            {isPending && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Admin Notes (Optional)</h3>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this request..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-2">These notes are for internal reference only.</p>
              </Card>
            )}

            {/* Reviewer Info (if approved or rejected) */}
            {(request.status === 'approved' || request.status === 'rejected') && request.reviewer && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Review Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Reviewed By</span>
                    <span className="text-sm">{request.reviewer.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Reviewed At</span>
                    <span className="text-sm">{request.reviewed_at ? formatDate(request.reviewed_at) : '-'}</span>
                  </div>
                  {request.status === 'approved' && request.created_entity_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Created Entity</span>
                      <span className="text-sm font-mono text-green-600">{request.created_entity_id}</span>
                    </div>
                  )}
                  {request.status === 'rejected' && request.rejection_reason && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Rejection Reason</span>
                      <div className="text-sm p-2 bg-red-50 rounded border border-red-200 text-red-900">
                        {request.rejection_reason}
                      </div>
                    </div>
                  )}
                  {request.admin_notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-1">Admin Notes</span>
                      <div className="text-sm p-2 bg-gray-50 rounded border border-gray-200">
                        {request.admin_notes}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}
    </PanelLevel>
  );
}
