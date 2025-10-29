/**
 * Dashboard Wrapper Component (Client Component)
 *
 * Manages interactive dashboard state including:
 * - Date range selection
 * - Manual refresh
 * - Last updated tracking
 * - Data fetching for date range changes
 *
 * Sprint 12, Phase 3: Dashboard Integration & Real-time Updates
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from './dashboard-header';
import { KPICard } from './kpi-card';
import { StatusPieChart } from './status-pie-chart';
import { PaymentTrendsChart } from './payment-trends-chart';
import { TopVendorsChart } from './top-vendors-chart';
import { InvoiceVolumeChart } from './invoice-volume-chart';
import { ActivityFeed } from './activity-feed';
import { QuickActions } from './quick-actions';
import {
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle,
} from 'lucide-react';
import type { DateRange } from '@/types/dashboard';
import { DATE_RANGE } from '@/types/dashboard';
import {
  getDashboardKPIs,
  getInvoiceStatusBreakdown,
  getPaymentTrends,
  getTopVendorsBySpending,
  getMonthlyInvoiceVolume,
  getRecentActivity,
} from '@/app/actions/dashboard';

// Initial data structure (passed from Server Component)
interface DashboardData {
  kpis: Awaited<ReturnType<typeof getDashboardKPIs>>;
  statusData: Awaited<ReturnType<typeof getInvoiceStatusBreakdown>>;
  paymentTrends: Awaited<ReturnType<typeof getPaymentTrends>>;
  topVendors: Awaited<ReturnType<typeof getTopVendorsBySpending>>;
  invoiceVolume: Awaited<ReturnType<typeof getMonthlyInvoiceVolume>>;
  activities: Awaited<ReturnType<typeof getRecentActivity>>;
}

interface DashboardWrapperProps {
  initialData: DashboardData;
  userRole: string;
}

export function DashboardWrapper({
  initialData,
  userRole,
}: DashboardWrapperProps) {
  // State management
  const [dateRange, setDateRange] = useState<DateRange>(DATE_RANGE.SIX_MONTHS);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<DashboardData>(initialData);

  // Fetch fresh data (non-cached)
  const fetchData = useCallback(async (range: DateRange) => {
    try {
      const [kpis, statusData, paymentTrends, topVendors, invoiceVolume, activities] =
        await Promise.all([
          getDashboardKPIs(range),
          getInvoiceStatusBreakdown(range),
          getPaymentTrends(range),
          getTopVendorsBySpending(range),
          getMonthlyInvoiceVolume(range),
          getRecentActivity(),
        ]);

      setData({
        kpis,
        statusData,
        paymentTrends,
        topVendors,
        invoiceVolume,
        activities,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Keep existing data on error
    }
  }, []);

  // Handle date range change
  useEffect(() => {
    fetchData(dateRange);
  }, [dateRange, fetchData]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(dateRange);
    setIsRefreshing(false);
  };

  // Extract data (with error handling)
  const kpis = data.kpis.success ? data.kpis.data : null;
  const statusBreakdown = data.statusData.success ? data.statusData.data : [];
  const paymentTrendsData = data.paymentTrends.success ? data.paymentTrends.data : [];
  const topVendorsData = data.topVendors.success ? data.topVendors.data : [];
  const invoiceVolumeData = data.invoiceVolume.success ? data.invoiceVolume.data : [];
  const activitiesData = data.activities.success ? data.activities.data : [];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Invoices"
          value={kpis?.totalInvoices ?? 0}
          format="number"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isRefreshing}
        />
        <KPICard
          title="Pending Approvals"
          value={kpis?.pendingApprovals ?? 0}
          format="number"
          icon={<Clock className="h-4 w-4" />}
          isLoading={isRefreshing}
        />
        <KPICard
          title="Total Unpaid"
          value={kpis?.totalUnpaid ?? 0}
          format="currency"
          icon={<AlertCircle className="h-4 w-4" />}
          isLoading={isRefreshing}
        />
        <KPICard
          title="Paid This Month"
          value={kpis?.totalPaidCurrentMonth ?? 0}
          format="currency"
          icon={<CheckCircle2 className="h-4 w-4" />}
          isLoading={isRefreshing}
        />
        <KPICard
          title="Overdue Invoices"
          value={kpis?.overdueInvoices ?? 0}
          format="number"
          icon={<XCircle className="h-4 w-4" />}
          isLoading={isRefreshing}
        />
        <KPICard
          title="On Hold"
          value={kpis?.onHoldInvoices ?? 0}
          format="number"
          icon={<PauseCircle className="h-4 w-4" />}
          isLoading={isRefreshing}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusPieChart data={statusBreakdown} isLoading={isRefreshing} />
        <PaymentTrendsChart data={paymentTrendsData} isLoading={isRefreshing} />
        <TopVendorsChart data={topVendorsData} isLoading={isRefreshing} />
        <InvoiceVolumeChart data={invoiceVolumeData} isLoading={isRefreshing} />
      </div>

      {/* Activity & Quick Actions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activities={activitiesData} isLoading={isRefreshing} />
        <QuickActions
          pendingCount={kpis?.pendingApprovals ?? 0}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
