/**
 * Invoices Page
 *
 * Main invoice management view using v3 InvoicesPage component.
 * Supports tabbed navigation: Recurring, All Invoices, TDS
 */

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { InvoicesPage as InvoicesPageV3 } from '@/components/v3/invoices/invoices-page';
import type { InvoiceTab } from '@/components/v3/invoices/invoice-tabs';

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get active tab from URL, default to 'recurring'
  const activeTab = (searchParams.get('tab') as InvoiceTab) || 'recurring';

  // Handle tab change by updating URL
  const handleTabChange = (tab: InvoiceTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/invoices?${params.toString()}`);
  };

  return (
    <InvoicesPageV3
      activeTab={activeTab}
      onTabChange={handleTabChange}
    />
  );
}
