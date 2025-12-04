'use client';

/**
 * Settings Page Component (v3)
 *
 * Main settings management page with tabbed navigation:
 * - Profile: User profile settings
 * - Security: Security and session settings
 * - Activities: Activity log and audit trail
 *
 * This component follows the same pattern as InvoicesPage (v3)
 */

import * as React from 'react';
import { SettingsTabsResponsive, type SettingsTab } from './settings-tabs';
import { ProfileTab } from '@/app/(dashboard)/settings/components/profile-tab';
import { SecurityTab } from '@/app/(dashboard)/settings/components/security-tab';
import { ActivitiesTab } from '@/app/(dashboard)/settings/components/activities-tab';

// ============================================================================
// Types
// ============================================================================

export interface SettingsPageProps {
  /** Currently active tab (controlled by parent/URL) */
  activeTab?: SettingsTab;
  /** Callback when tab changes */
  onTabChange?: (tab: SettingsTab) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export function SettingsPage({
  activeTab = 'profile',
  onTabChange,
}: SettingsPageProps) {
  // Handle tab change
  const handleTabChange = (tab: SettingsTab) => {
    onTabChange?.(tab);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tab Navigation */}
      <SettingsTabsResponsive
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
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'activities' && <ActivitiesTab />}
      </div>
    </div>
  );
}

export default SettingsPage;
