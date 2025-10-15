/**
 * Reports Page
 *
 * Financial reports and analytics for invoices and vendors.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  getInvoiceSummaryReport,
  getVendorSpendingReport,
  type InvoiceSummaryReport,
  type VendorSpendingReport,
} from '@/app/actions/reports';
import { INVOICE_STATUS_CONFIG } from '@/types/invoice';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export default function ReportsPage() {
  // Date range state
  const [startDate, setStartDate] = React.useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Default to last month
    return date;
  });
  const [endDate, setEndDate] = React.useState<Date>(new Date());

  // Report data state
  const [summaryReport, setSummaryReport] =
    React.useState<InvoiceSummaryReport | null>(null);
  const [vendorReport, setVendorReport] =
    React.useState<VendorSpendingReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Chart colors for status breakdown
  const CHART_COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
  ];

  // Generate reports
  const handleGenerateReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Adjust dates to start/end of day
      const adjustedStartDate = new Date(startDate);
      adjustedStartDate.setHours(0, 0, 0, 0);

      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setHours(23, 59, 59, 999);

      const dateRange = {
        start_date: adjustedStartDate,
        end_date: adjustedEndDate,
      };

      // Fetch both reports
      const [summaryResult, vendorResult] = await Promise.all([
        getInvoiceSummaryReport(dateRange),
        getVendorSpendingReport(dateRange),
      ]);

      if (summaryResult.success) {
        setSummaryReport(summaryResult.data);
      } else {
        setError(summaryResult.error);
      }

      if (vendorResult.success) {
        setVendorReport(vendorResult.data);
      } else {
        setError(vendorResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate reports');
    } finally {
      setIsLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!summaryReport || !vendorReport) return;

    // Create CSV content
    let csv = 'Invoice Summary Report\n\n';
    csv += `Date Range:,${formatDate(summaryReport.dateRange.start_date)},to,${formatDate(summaryReport.dateRange.end_date)}\n`;
    csv += `Total Invoices:,${summaryReport.totalInvoices}\n`;
    csv += `Total Amount:,${summaryReport.totalAmount}\n\n`;

    csv += 'Status Breakdown\n';
    csv += 'Status,Count,Amount\n';
    Object.entries(summaryReport.byStatus).forEach(([status, data]) => {
      const config = INVOICE_STATUS_CONFIG[status as keyof typeof INVOICE_STATUS_CONFIG];
      csv += `${config?.label || status},${data.count},${data.amount}\n`;
    });

    csv += '\n\nTop Vendors\n';
    csv += 'Vendor,Invoice Count,Total Amount\n';
    summaryReport.topVendors.forEach((vendor) => {
      csv += `${vendor.vendor_name},${vendor.invoice_count},${vendor.total_amount}\n`;
    });

    csv += '\n\nVendor Spending Report\n';
    csv += 'Vendor,Invoice Count,Total Amount,Paid Amount,Unpaid Amount,Average Invoice\n';
    vendorReport.vendors.forEach((vendor) => {
      csv += `${vendor.vendor_name},${vendor.invoice_count},${vendor.total_amount},${vendor.paid_amount},${vendor.unpaid_amount},${vendor.average_invoice_amount.toFixed(2)}\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-report-${formatDate(startDate)}-${formatDate(endDate)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Quick date presets
  const handleThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleThisYear = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), 0, 1);
    const lastDay = new Date(now.getFullYear(), 11, 31);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View financial reports and analytics
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
              Quick Filters:
            </span>
            <Button variant="outline" size="sm" onClick={handleThisMonth}>
              This Month
            </Button>
            <Button variant="outline" size="sm" onClick={handleLastMonth}>
              Last Month
            </Button>
            <Button variant="outline" size="sm" onClick={handleThisYear}>
              This Year
            </Button>
          </div>

          {/* Date Range Inputs */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate.toISOString().split('T')[0]}
                onChange={(e) => setStartDate(new Date(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate.toISOString().split('T')[0]}
                onChange={(e) => setEndDate(new Date(e.target.value))}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={handleGenerateReports}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Generating...' : 'Generate Reports'}
              </Button>
              {summaryReport && vendorReport && (
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={isLoading}
                >
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive">
          <p className="text-destructive">{error}</p>
        </Card>
      )}

      {/* Invoice Summary Report */}
      {summaryReport && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Invoice Summary</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {formatDate(summaryReport.dateRange.start_date)} -{' '}
            {formatDate(summaryReport.dateRange.end_date)}
          </p>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-3xl font-bold">{summaryReport.totalInvoices}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold">
                {formatCurrency(summaryReport.totalAmount)}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Average Invoice</p>
              <p className="text-3xl font-bold">
                {formatCurrency(
                  summaryReport.totalInvoices > 0
                    ? summaryReport.totalAmount / summaryReport.totalInvoices
                    : 0
                )}
              </p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">By Status</h3>

            {/* Pie Chart */}
            <div className="mb-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(summaryReport.byStatus)
                      .filter(([_, data]) => data.count > 0)
                      .map(([status, data]) => {
                        const config =
                          INVOICE_STATUS_CONFIG[status as keyof typeof INVOICE_STATUS_CONFIG];
                        return {
                          name: config?.label || status,
                          value: data.amount,
                          count: data.count,
                        };
                      })}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) =>
                      `${props.name}: ${(props.percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(summaryReport.byStatus)
                      .filter(([_, data]) => data.count > 0)
                      .map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      `${formatCurrency(value)} (${props.payload.count} invoices)`,
                      name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Status List */}
            <div className="space-y-2">
              {Object.entries(summaryReport.byStatus).map(([status, data]) => {
                const config =
                  INVOICE_STATUS_CONFIG[status as keyof typeof INVOICE_STATUS_CONFIG];
                if (data.count === 0) return null;
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{config?.label || status}</span>
                      <span className="text-sm text-muted-foreground">
                        ({data.count} invoices)
                      </span>
                    </div>
                    <span className="font-bold">{formatCurrency(data.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Vendors */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Top 10 Vendors</h3>

            {/* Bar Chart */}
            <div className="mb-4 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summaryReport.topVendors.map((vendor) => ({
                    name: vendor.vendor_name,
                    amount: vendor.total_amount,
                    count: vendor.invoice_count,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat('en-IN', {
                        notation: 'compact',
                        compactDisplay: 'short',
                      }).format(value)
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => [
                      formatCurrency(value),
                      `Total (${props.payload.count} invoices)`,
                    ]}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Vendor List */}
            <div className="space-y-2">
              {summaryReport.topVendors.map((vendor) => (
                <div
                  key={vendor.vendor_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{vendor.vendor_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {vendor.invoice_count} invoices
                    </p>
                  </div>
                  <span className="font-bold">
                    {formatCurrency(vendor.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Vendor Spending Report */}
      {vendorReport && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Vendor Spending Report</h2>

          {/* Stacked Bar Chart - Paid vs Unpaid */}
          <div className="mb-6 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vendorReport.vendors.slice(0, 10).map((vendor) => ({
                  name: vendor.vendor_name,
                  paid: vendor.paid_amount,
                  unpaid: vendor.unpaid_amount,
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('en-IN', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="paid" stackId="a" fill="#10b981" name="Paid" />
                <Bar dataKey="unpaid" stackId="a" fill="#ef4444" name="Unpaid" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vendor Details */}
          <div className="space-y-2">
            {vendorReport.vendors.map((vendor) => (
              <div
                key={vendor.vendor_id}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{vendor.vendor_name}</h3>
                  <span className="text-lg font-bold">
                    {formatCurrency(vendor.total_amount)}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Invoices</p>
                    <p className="font-medium">{vendor.invoice_count}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="font-medium text-green-600">
                      {formatCurrency(vendor.paid_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unpaid</p>
                    <p className="font-medium text-red-600">
                      {formatCurrency(vendor.unpaid_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Invoice</p>
                    <p className="font-medium">
                      {formatCurrency(vendor.average_invoice_amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && !summaryReport && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Select a date range and click &quot;Generate Reports&quot; to view financial analytics
          </p>
        </Card>
      )}
    </div>
  );
}
