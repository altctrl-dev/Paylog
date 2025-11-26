/**
 * Settings Page
 *
 * User settings with Profile, Security, My Requests, and Activities tabs.
 */

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import {
  getUserRequests,
  type MasterDataRequestWithDetails,
  type MasterDataEntityType,
} from '@/app/actions/master-data-requests';
import { ProfileTab } from './components/profile-tab';
import { SecurityTab } from './components/security-tab';
import { ActivitiesTab } from './components/activities-tab';
import { User, Shield, FileText, Activity } from 'lucide-react';

type SettingsTab = 'profile' | 'security' | 'requests' | 'activities';

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
  { id: 'requests', label: 'My Requests', icon: <FileText className="h-4 w-4" /> },
  { id: 'activities', label: 'Activities', icon: <Activity className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const [requests, setRequests] = React.useState<MasterDataRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [filter, setFilter] = React.useState<MasterDataEntityType | 'all'>('all');
  const { openPanel } = usePanel();

  const loadRequests = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUserRequests(
        filter !== 'all' ? { entity_type: filter } : undefined
      );
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Fetch requests when tab is active
  React.useEffect(() => {
    if (activeTab === 'requests') {
      loadRequests();
    }
  }, [activeTab, loadRequests]);

  const handleTabChange = (tab: SettingsTab) => {
    router.push(`/settings?tab=${tab}`);
  };

  const handleNewRequest = (entityType: MasterDataEntityType) => {
    openPanel('master-data-request-form', { entityType }, { width: PANEL_WIDTH.MEDIUM });
  };

  const handleViewRequest = (request: MasterDataRequestWithDetails) => {
    openPanel('master-data-request-detail', { requestId: request.id }, { width: PANEL_WIDTH.MEDIUM });
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

  const pendingCount = requests.filter((r) => r.status === 'pending_approval').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium flex items-center gap-2
                transition-colors duration-150
                ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                }
              `}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'requests' && pendingCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-amber-500 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && <ProfileTab />}

      {/* Security Tab */}
      {activeTab === 'security' && <SecurityTab />}

      {/* My Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Actions Bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filter:</span>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as MasterDataEntityType | 'all')}
                  className="rounded border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="vendor">Vendors</option>
                  <option value="invoice_profile">Invoice Profiles</option>
                </select>
                <Button variant="outline" size="sm" onClick={loadRequests}>
                  Refresh
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNewRequest('invoice_profile')}
                >
                  Request Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleNewRequest('vendor')}
                >
                  Request Vendor
                </Button>
              </div>
            </div>
          </Card>

          {/* Requests List */}
          {isLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading requests...</p>
            </Card>
          ) : requests.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No requests found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Request new master data using the buttons above.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <Card
                  key={request.id}
                  className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewRequest(request)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(request.status)}
                        <span className="text-sm font-medium text-muted-foreground">
                          {getEntityTypeLabel(request.entity_type)}
                        </span>
                      </div>
                      <p className="font-semibold text-lg">
                        {request.request_data.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created {formatDate(request.created_at)}
                      </p>
                      {request.status === 'rejected' && request.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2">
                          Rejected: {request.rejection_reason}
                        </p>
                      )}
                      {request.status === 'approved' && request.created_entity_id && (
                        <p className="text-sm text-green-600 mt-2">
                          Created: {request.created_entity_id}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {request.resubmission_count > 0 && (
                        <p className={`text-xs mb-1 ${request.resubmission_count >= 2 ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                          Resubmission #{request.resubmission_count}
                          {request.resubmission_count >= 2 && ' (Limit Reached)'}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && <ActivitiesTab />}
    </div>
  );
}
