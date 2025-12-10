/**
 * Admin Console Page
 *
 * Main admin landing page with role-based tabs.
 * - Admin users: 2 tabs (Dashboard, Master Data)
 * - Super Admin users: 3 tabs (+ User Management)
 *
 * Uses v3 AdminPage component for consistent styling with Invoice/Settings pages.
 * This page is protected by Phase 3 RBAC middleware (admin/super_admin only).
 */

'use client';

import * as React from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminPage as AdminPageV3 } from '@/components/v3/admin/admin-page';
import type { AdminTab } from '@/components/v3/admin/admin-tabs';
import type { MasterDataTab } from '@/components/v3/admin/master-data-tabs';

export default function AdminPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSuperAdmin = session?.user?.role === 'super_admin';

  // Get active tab from URL, default to 'approvals'
  const activeTab = (searchParams.get('tab') as AdminTab) || 'approvals';
  const activeSubTab = (searchParams.get('subtab') as MasterDataTab) || 'vendors';
  const activeApprovalTab = (searchParams.get('approval') as 'invoices' | 'payments' | 'vendors' | 'archives') || 'invoices';

  // Redirect old "dashboard" tab to Approvals
  React.useEffect(() => {
    if (activeTab === ('dashboard' as string)) {
      router.replace('/admin?tab=approvals');
    }
  }, [activeTab, router]);

  // Handle tab change by updating URL
  const handleTabChange = (tab: AdminTab) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    // Reset subtab when switching main tabs
    if (tab === 'master-data') {
      params.set('subtab', 'vendors');
    } else if (tab === 'approvals') {
      params.set('approval', 'invoices');
    }
    router.push(`/admin?${params.toString()}`);
  };

  // Handle approval sub-tab change by updating URL
  const handleApprovalTabChange = (approval: 'invoices' | 'payments' | 'vendors' | 'archives') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'approvals');
    params.set('approval', approval);
    router.push(`/admin?${params.toString()}`);
  };

  // Handle sub-tab change by updating URL
  const handleSubTabChange = (subtab: MasterDataTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'master-data');
    params.set('subtab', subtab);
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <AdminPageV3
      activeTab={activeTab}
      activeSubTab={activeSubTab}
      activeApprovalTab={activeApprovalTab}
      onTabChange={handleTabChange}
      onSubTabChange={handleSubTabChange}
      onApprovalTabChange={handleApprovalTabChange}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
