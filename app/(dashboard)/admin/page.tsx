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

  // Get active tab from URL, default to 'dashboard'
  const activeTab = (searchParams.get('tab') as AdminTab) || 'dashboard';
  const activeSubTab = (searchParams.get('subtab') as MasterDataTab) || 'requests';

  // Redirect old "requests" tab to Master Data > All Requests
  React.useEffect(() => {
    if (activeTab === ('requests' as string)) {
      router.replace('/admin?tab=master-data&subtab=requests');
    }
  }, [activeTab, router]);

  // Handle tab change by updating URL
  const handleTabChange = (tab: AdminTab) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    // Reset subtab when switching main tabs
    if (tab === 'master-data') {
      params.set('subtab', 'requests');
    }
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
      onTabChange={handleTabChange}
      onSubTabChange={handleSubTabChange}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
