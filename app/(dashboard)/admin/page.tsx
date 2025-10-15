/**
 * Admin Page
 *
 * Admin dashboard with Master Data Requests review functionality.
 * Only accessible to admin and super_admin roles.
 */

'use client';

import * as React from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePanel } from '@/hooks/use-panel';
import {
  getAdminRequests,
  getPendingRequestCount,
  type GetAdminRequestsFilters,
} from '@/app/actions/admin/master-data-approval';
import type { MasterDataRequestWithDetails, MasterDataEntityType } from '@/app/actions/master-data-requests';

export default function AdminPage() {
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'requests'>('dashboard');
  const [requests, setRequests] = React.useState<MasterDataRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [filters, setFilters] = React.useState<GetAdminRequestsFilters>({});
  const { openPanel } = usePanel();

  // Load pending count on mount
  React.useEffect(() => {
    loadPendingCount();
  }, []);

  // Load requests when Master Data Requests tab is active
  React.useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    }
  }, [activeTab, filters]);

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
  }, []);

  const loadPendingCount = async () => {
    try {
      const result = await getPendingRequestCount();
      if (result.success) {
        setPendingCount(result.data);
      }
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  };

  const loadRequests = async () => {
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
  };

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, permissions, and master data requests
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
              ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center gap-2
              ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Master Data Requests
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-amber-500 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold">User Management</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage users, roles, and permissions.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold">Statistics</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-gray-600">Pending Requests</p>
                <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Approved Today</p>
                <p className="text-3xl font-bold text-green-600">-</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Rejected Today</p>
                <p className="text-3xl font-bold text-red-600">-</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Master Data Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
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
                      status: e.target.value === 'all' ? undefined : (e.target.value as any),
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
                      <p className="font-semibold text-base">{(request.request_data as any).name}</p>
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
      )}
    </div>
  );
}
