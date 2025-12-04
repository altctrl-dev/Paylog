'use client';

/**
 * Admin Page Component (v3)
 *
 * Main admin management page with tabbed navigation:
 * - Dashboard: Admin dashboard overview
 * - Master Data: Master data management with sub-tabs
 * - User Management: User management (super_admin only)
 *
 * This component follows the same pattern as InvoicesPage and SettingsPage (v3)
 */

import * as React from 'react';
import { AdminTabsResponsive, type AdminTab } from './admin-tabs';
import { MasterDataTabsResponsive, type MasterDataTab } from './master-data-tabs';
import AdminDashboard from '@/components/admin/admin-dashboard';
import MasterDataRequests from '@/components/admin/master-data-requests';
import VendorManagement from '@/components/master-data/vendor-management';
import CategoryManagement from '@/components/master-data/category-management';
import EntityManagement from '@/components/master-data/entity-management';
import PaymentTypeManagement from '@/components/master-data/payment-type-management';
import CurrencyManagement from '@/components/master-data/currency-management';
import InvoiceProfileManagement from '@/components/master-data/invoice-profile-management';
import UserManagement from '@/components/admin/user-management';

// ============================================================================
// Types
// ============================================================================

export interface AdminPageProps {
  /** Currently active tab (controlled by parent/URL) */
  activeTab?: AdminTab;
  /** Currently active sub-tab for Master Data (controlled by parent/URL) */
  activeSubTab?: MasterDataTab;
  /** Callback when tab changes */
  onTabChange?: (tab: AdminTab) => void;
  /** Callback when sub-tab changes */
  onSubTabChange?: (subtab: MasterDataTab) => void;
  /** Whether user is super_admin */
  isSuperAdmin?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminPage({
  activeTab = 'dashboard',
  activeSubTab = 'requests',
  onTabChange,
  onSubTabChange,
  isSuperAdmin = false,
}: AdminPageProps) {
  // Handle tab change
  const handleTabChange = (tab: AdminTab) => {
    onTabChange?.(tab);
  };

  // Handle sub-tab change
  const handleSubTabChange = (subtab: MasterDataTab) => {
    onSubTabChange?.(subtab);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Console</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage master data, review requests, and configure system settings
        </p>
      </div>

      {/* Tab Navigation */}
      <AdminTabsResponsive
        value={activeTab}
        onChange={handleTabChange}
        isSuperAdmin={isSuperAdmin}
        breakpoint="sm"
      />

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'master-data' && (
          <MasterDataContent
            activeSubTab={activeSubTab}
            onSubTabChange={handleSubTabChange}
          />
        )}
        {activeTab === 'users' && isSuperAdmin && <UserManagement />}
      </div>
    </div>
  );
}

// ============================================================================
// Master Data Content (with sub-tabs)
// ============================================================================

interface MasterDataContentProps {
  activeSubTab: MasterDataTab;
  onSubTabChange: (subtab: MasterDataTab) => void;
}

function MasterDataContent({
  activeSubTab,
  onSubTabChange,
}: MasterDataContentProps) {
  return (
    <div className="space-y-6">
      {/* Master Data Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Master Data Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all master data types for the invoice system
        </p>
      </div>

      {/* Sub-Tab Navigation */}
      <MasterDataTabsResponsive
        value={activeSubTab}
        onChange={onSubTabChange}
        breakpoint="lg"
      />

      {/* Sub-Tab Content */}
      <div
        role="tabpanel"
        id={`panel-${activeSubTab}`}
        aria-labelledby={`tab-${activeSubTab}`}
      >
        {activeSubTab === 'requests' && <MasterDataRequests />}
        {activeSubTab === 'vendors' && <VendorManagement />}
        {activeSubTab === 'categories' && <CategoryManagement />}
        {activeSubTab === 'entities' && <EntityManagement />}
        {activeSubTab === 'payment-types' && <PaymentTypeManagement />}
        {activeSubTab === 'currencies' && <CurrencyManagement />}
        {activeSubTab === 'profiles' && <InvoiceProfileManagement />}
      </div>
    </div>
  );
}

export default AdminPage;
