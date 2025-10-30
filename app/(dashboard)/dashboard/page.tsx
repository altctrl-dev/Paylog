/**
 * Dashboard Page (Server Component)
 *
 * Fetches initial dashboard data with 60-second cache TTL,
 * then hands off to client wrapper for interactivity.
 *
 * Sprint 12, Phase 3: Dashboard Integration & Real-time Updates
 * Sprint 13, Phase 3: Added error boundary for crash protection
 */

import { DashboardWrapper } from '@/components/dashboard/dashboard-wrapper';
import { ErrorBoundary } from '@/components/error-boundary';
import { auth } from '@/lib/auth';
import { DATE_RANGE } from '@/types/dashboard';
import {
  getCachedDashboardKPIs,
  getCachedInvoiceStatusBreakdown,
  getCachedPaymentTrends,
  getCachedTopVendorsBySpending,
  getCachedMonthlyInvoiceVolume,
  getCachedRecentActivity,
} from '@/app/actions/dashboard';

export default async function DashboardPage() {
  // Get current user session for RBAC
  const session = await auth();
  const userRole = session?.user?.role ?? 'associate';

  // Default to 6 months date range
  const defaultDateRange = DATE_RANGE.SIX_MONTHS;

  // Fetch initial data using cached versions (60s TTL for fast initial load)
  const [kpis, statusData, paymentTrends, topVendors, invoiceVolume, activities] =
    await Promise.all([
      getCachedDashboardKPIs(defaultDateRange),
      getCachedInvoiceStatusBreakdown(defaultDateRange),
      getCachedPaymentTrends(defaultDateRange),
      getCachedTopVendorsBySpending(defaultDateRange),
      getCachedMonthlyInvoiceVolume(defaultDateRange),
      getCachedRecentActivity(),
    ]);

  // Pass initial data to client wrapper with error boundary
  return (
    <ErrorBoundary section="Dashboard">
      <DashboardWrapper
        initialData={{
          kpis,
          statusData,
          paymentTrends,
          topVendors,
          invoiceVolume,
          activities,
        }}
        userRole={userRole}
      />
    </ErrorBoundary>
  );
}
