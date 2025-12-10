'use client';

/**
 * Approvals Page Component (v3)
 *
 * Main approvals management page with tabbed navigation:
 * - Invoices: Invoice approval requests
 * - Payments: Payment approval requests
 * - Vendors: Vendor approval requests
 * - Archives: Archive/deletion requests
 *
 * This component follows the same pattern as AdminPage and SettingsPage (v3)
 */

import * as React from 'react';
import { ApprovalTabsResponsive, type ApprovalTab } from './approval-tabs';
import { useApprovalCounts } from '@/hooks/use-approvals';
import { InvoiceRequestsTab } from './invoice-requests-tab';
import { PaymentRequestsTab } from './payment-requests-tab';
import { VendorRequestsTab } from './vendor-requests-tab';
import { ArchiveRequestsTab } from './archive-requests-tab';

// ============================================================================
// Types
// ============================================================================

export interface ApprovalsPageProps {
  /** Currently active tab (controlled by parent/URL) */
  activeTab?: ApprovalTab;
  /** Callback when tab changes */
  onTabChange?: (tab: ApprovalTab) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function ApprovalsPage({
  activeTab = 'invoices',
  onTabChange,
}: ApprovalsPageProps) {
  const { data: counts } = useApprovalCounts();

  // Handle tab change
  const handleTabChange = (tab: ApprovalTab) => {
    onTabChange?.(tab);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Approvals</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve pending requests
        </p>
      </div>

      {/* Sub-tab Navigation */}
      <ApprovalTabsResponsive
        value={activeTab}
        onChange={handleTabChange}
        counts={counts || undefined}
        breakpoint="lg"
      />

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'invoices' && <InvoiceRequestsTab />}
        {activeTab === 'payments' && <PaymentRequestsTab />}
        {activeTab === 'vendors' && <VendorRequestsTab />}
        {activeTab === 'archives' && <ArchiveRequestsTab />}
      </div>
    </div>
  );
}

export default ApprovalsPage;
