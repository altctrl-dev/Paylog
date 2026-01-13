/**
 * Reports Page
 *
 * Main reports view using v3 ReportsPage component.
 * Supports tabbed navigation: Consolidated, TDS, Ledger, Categorized
 */

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReportsPage as ReportsPageV3 } from '@/components/v3/reports';
import type { ReportTab } from '@/components/v3/reports';

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active tab from URL, default to 'consolidated'
  const activeTab = (searchParams.get('tab') as ReportTab) || 'consolidated';

  // Handle tab change by updating URL
  const handleTabChange = (tab: ReportTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/reports?${params.toString()}`);
  };

  return (
    <ReportsPageV3
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  );
}
