'use client';

/**
 * Dashboard Page Component (v3)
 *
 * Main dashboard layout with:
 * - Page header (title + description)
 * - KPI cards grid
 * - Data table with toolbar
 * - AI insights panel
 *
 * This component receives data and renders the v3 modern dashboard.
 */

import * as React from 'react';
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { KPICard, KPIGrid } from './kpi-card';
import { DataTable, type InvoiceRow } from './data-table';
import { SimpleAIInsight } from './ai-insights';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface DashboardKPIs {
  totalPayable: number;
  totalPayableChange?: number;
  paidThisMonth: number;
  paidThisMonthChange?: number;
  pendingPayments: number;
  pendingPaymentsChange?: number;
  overdueCount: number;
  overdueCountChange?: number;
}

export interface DashboardPageProps {
  /** KPI data */
  kpis: DashboardKPIs;
  /** Invoice rows for the table */
  invoices: InvoiceRow[];
  /** AI insight text */
  aiInsight?: string;
  /** Callback when search is triggered */
  onSearch?: (query: string) => void;
  /** Callback when filter is triggered */
  onFilter?: () => void;
  /** Callback when export is triggered */
  onExport?: () => void;
  /** Callback when new invoice is triggered */
  onNewInvoice?: () => void;
  /** Callback when view invoice is triggered */
  onViewInvoice?: (id: string) => void;
  /** Callback when edit invoice is triggered */
  onEditInvoice?: (id: string) => void;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// Page Header Component
// ============================================================================

interface PageHeaderProps {
  title: string;
  description?: string;
}

function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DashboardPage({
  kpis,
  invoices,
  aiInsight,
  onSearch,
  onFilter,
  onExport,
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  className,
}: DashboardPageProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header */}
      <PageHeader
        title="Dashboard"
        description="Overview of your payment obligations"
      />

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard
          label="Total Payables"
          value={formatCurrency(kpis.totalPayable)}
          icon={DollarSign}
          iconVariant="primary"
          changePercent={kpis.totalPayableChange}
          changeTrend={kpis.totalPayableChange && kpis.totalPayableChange >= 0 ? 'up' : 'down'}
        />
        <KPICard
          label="Paid This Month"
          value={formatCurrency(kpis.paidThisMonth)}
          icon={CheckCircle}
          iconVariant="success"
          changePercent={kpis.paidThisMonthChange}
          changeTrend={kpis.paidThisMonthChange && kpis.paidThisMonthChange >= 0 ? 'up' : 'down'}
        />
        <KPICard
          label="Pending Payments"
          value={formatCurrency(kpis.pendingPayments)}
          icon={Clock}
          iconVariant="warning"
          changePercent={kpis.pendingPaymentsChange}
          changeTrend={kpis.pendingPaymentsChange && kpis.pendingPaymentsChange <= 0 ? 'up' : 'down'}
        />
        <KPICard
          label="Overdue"
          value={String(kpis.overdueCount)}
          icon={AlertTriangle}
          iconVariant="danger"
          changePercent={kpis.overdueCountChange}
          changeTrend={kpis.overdueCountChange && kpis.overdueCountChange <= 0 ? 'up' : 'down'}
        />
      </KPIGrid>

      {/* Data Table */}
      <DataTable
        data={invoices}
        onSearch={onSearch}
        onFilter={onFilter}
        onExport={onExport}
        onNewInvoice={onNewInvoice}
        onView={onViewInvoice}
        onEdit={onEditInvoice}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* AI Insights */}
      {aiInsight && (
        <SimpleAIInsight
          description={aiInsight}
          link="/reports"
          linkText="View detailed analysis"
        />
      )}
    </div>
  );
}

export default DashboardPage;
