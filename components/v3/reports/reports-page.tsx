'use client';

/**
 * Reports Page Component (v3)
 *
 * Main reports page with tabbed navigation:
 * - Consolidated: Shows all invoices in a consolidated report view
 * - TDS: Shows TDS-related reports
 * - Ledger: Shows ledger reports
 * - Categorized: Shows categorized reports (coming soon)
 *
 * This component reuses invoice tab components for the actual data display.
 */

import * as React from 'react';
import { ReportTabsResponsive, type ReportTab } from './report-tabs';
import { MonthlyReportTab } from './monthly-report-tab';
import { ConsolidatedReportTab } from './consolidated-report-tab';
import { TDSTab } from '../invoices/tds-tab';
import { LedgerTab } from '../invoices/ledger-tab';
import { CategorizedTab } from './categorized-tab';

// ============================================================================
// Types
// ============================================================================

export interface ReportsPageProps {
  /** Currently active tab (controlled by parent/URL) */
  activeTab?: ReportTab;
  /** Callback when tab changes */
  onTabChange?: (tab: ReportTab) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function ReportsPage({
  activeTab = 'monthly',
  onTabChange,
}: ReportsPageProps) {
  // Handle tab change
  const handleTabChange = (tab: ReportTab) => {
    onTabChange?.(tab);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate monthly reports, view TDS summaries, and ledger data
        </p>
      </div>

      {/* Tab Navigation */}
      <ReportTabsResponsive
        value={activeTab}
        onChange={handleTabChange}
        breakpoint="sm"
      />

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'monthly' && <MonthlyReportTab />}

        {activeTab === 'consolidated' && <ConsolidatedReportTab />}

        {activeTab === 'tds' && <TDSTab />}

        {activeTab === 'ledger' && <LedgerTab />}

        {activeTab === 'categorized' && <CategorizedTab />}
      </div>
    </div>
  );
}

export default ReportsPage;
