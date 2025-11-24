/**
 * Master Data Requests Component
 *
 * Admin approval queue for master data requests from users.
 * Displays pending, approved, and rejected requests with filtering.
 * Reuses existing components from Sprint 5 approval system.
 *
 * Created as part of Sprint 9A Phase 4 corrections.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePanel } from '@/hooks/use-panel';
import {
  getAdminRequests,
  getPendingRequestCount,
  type GetAdminRequestsFilters,
} from '@/app/actions/admin/master-data-approval';
import type { MasterDataRequestWithDetails, MasterDataEntityType } from '@/app/actions/master-data-requests';

export default function MasterDataRequests() {
  const [requests, setRequests] = React.useState<MasterDataRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [filters, setFilters] = React.useState<GetAdminRequestsFilters>({});
  const { openPanel } = usePanel();

  const loadPendingCount = React.useCallback(async () => {
    try {
      const result = await getPendingRequestCount();
      if (result.success) {
        setPendingCount(result.data);
      }
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  }, []);

  const loadRequests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAdminRequests(filters);
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Load data on mount and when filters change
  React.useEffect(() => {
    loadRequests();
    loadPendingCount();
  }, [loadRequests, loadPendingCount]);

  // Listen for admin-request-reviewed event to refresh list
  React.useEffect(() => {
    const handleRequestReviewed = () => {
      loadRequests();
      loadPendingCount();
    };

    window.addEventListener('admin-request-reviewed', handleRequestReviewed);
    return () => {
      window.removeEventListener('admin-request-reviewed', handleRequestReviewed);
    };
  }, [loadRequests, loadPendingCount]);

  const handleViewRequest = (request: MasterDataRequestWithDetails) => {
    openPanel('admin-request-review', { requestId: request.id }, { width: 700 });
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

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      vendor: 'Vendor',
      category: 'Category',
      invoice_profile: 'Invoice Profile',
      payment_type: 'Payment Type',
    };
    return labels[entityType] || entityType;
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

  return (
    <div className="space-y-4">
      {/* Stats Banner */}
      {pendingCount > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-900">
                You have {pendingCount} request{pendingCount !== 1 ? 's' : ''} pending review
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Click on any request below to review and approve/reject
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Entity Type:</span>
            <select
              value={filters.entity_type || 'all'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  entity_type: e.target.value === 'all' ? undefined : (e.target.value as MasterDataEntityType),
                }))
              }
              className="rounded border border-gray-300 px-3 py-1 text-sm"
            >
              <option value="all">All Types</option>
              <option value="vendor">Vendors</option>
              <option value="category">Categories</option>
              <option value="invoice_profile">Invoice Profiles</option>
              <option value="payment_type">Payment Types</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <select
              value={filters.status || 'all'}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value === 'all' ? undefined : (e.target.value as 'pending_approval' | 'approved' | 'rejected'),
                }))
              }
              className="rounded border border-gray-300 px-3 py-1 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending_approval">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={loadRequests}>
            Refresh
          </Button>
        </div>
      </Card>

      {/* Requests List */}
      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading requests...</p>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No requests found matching the selected filters.</p>
          <p className="text-sm text-muted-foreground">
            Requests will appear here when users submit new master data requests.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((request) => (
            <Card
              key={request.id}
              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleViewRequest(request)}
            >
              <div className="space-y-3">
                {/* Status and Entity Type */}
                <div className="flex items-center justify-between">
                  {getStatusBadge(request.status)}
                  <span className="text-xs text-gray-500">{getEntityTypeLabel(request.entity_type)}</span>
                </div>

                {/* Request Name */}
                <div>
                  <p className="font-semibold text-base">{(request.request_data as { name: string }).name}</p>
                </div>

                {/* Requester Info */}
                <div className="text-xs text-gray-600">
                  <p>By: {request.requester.full_name}</p>
                  <p>Created: {formatDate(request.created_at)}</p>
                </div>

                {/* Resubmission Count */}
                {request.resubmission_count > 0 && (
                  <div className="text-xs text-amber-600 font-medium">
                    Resubmission #{request.resubmission_count + 1}
                  </div>
                )}

                {/* Rejection Reason Preview */}
                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="text-xs text-red-600 line-clamp-2">{request.rejection_reason}</div>
                )}

                {/* Created Entity ID */}
                {request.status === 'approved' && request.created_entity_id && (
                  <div className="text-xs text-green-600 font-medium">
                    Created: {request.created_entity_id}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
