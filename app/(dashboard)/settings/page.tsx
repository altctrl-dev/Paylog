/**
 * Settings Page
 *
 * User settings with Profile, Security, and Activities tabs.
 * Uses v3 SettingsPage component for consistent styling with Invoice page.
 */

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { SettingsPage as SettingsPageV3 } from '@/components/v3/settings/settings-page';
import type { SettingsTab } from '@/components/v3/settings/settings-tabs';

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active tab from URL, default to 'profile'
  const activeTab = (searchParams.get('tab') as SettingsTab) || 'profile';

  // Handle tab change by updating URL
  const handleTabChange = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/settings?${params.toString()}`);
  };

  return (
    <SettingsPageV3
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  );
}
