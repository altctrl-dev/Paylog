'use client';

/**
 * TDS Tab Component (v3)
 *
 * Displays invoices with TDS (Tax Deducted at Source) in a table format:
 * - Invoice Details (profile name for recurring, invoice name for non-recurring)
 * - Invoice Number
 * - Invoice Date
 * - Invoice Amount
 * - TDS %
 * - TDS Amount
 *
 * Features:
 * - Month navigation with calendar picker
 * - Defaults to current month
 * - Summary row with totals
 */

import * as React from 'react';
import { useInvoices } from '@/hooks/use-invoices';
import { MonthNavigator } from './month-navigator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================================================
// Format Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateString: string | Date | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

function formatTdsPercentage(percentage: number | null): string {
  if (percentage === null || percentage === undefined) return '-';
  return `${percentage.toFixed(1)}%`;
}

function calculateTdsAmount(invoiceAmount: number, tdsPercentage: number | null): number {
  if (tdsPercentage === null || tdsPercentage === undefined) return 0;
  return (invoiceAmount * tdsPercentage) / 100;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get start and end dates for a given month/year
 */
function getMonthDateRange(month: number, year: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month
  return { start, end };
}

// ============================================================================
// Main Component
// ============================================================================

export function TDSTab() {
  // Default to current month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = React.useState(now.getMonth());
  const [selectedYear, setSelectedYear] = React.useState(now.getFullYear());

  // Calculate date range for selected month
  const { start, end } = getMonthDateRange(selectedMonth, selectedYear);

  // Fetch invoices with TDS applicable for selected month
  const { data, isLoading } = useInvoices({
    page: 1,
    per_page: 100,
    tds_applicable: true,
    start_date: start,
    end_date: end,
    sort_by: 'invoice_date',
    sort_order: 'asc',
  });

  const invoices = data?.invoices ?? [];

  // Calculate totals
  const totals = invoices.reduce(
    (acc, invoice) => {
      const tdsAmount = calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage);
      return {
        invoiceAmount: acc.invoiceAmount + invoice.invoice_amount,
        tdsAmount: acc.tdsAmount + tdsAmount,
      };
    },
    { invoiceAmount: 0, tdsAmount: 0 }
  );

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  /**
   * Get invoice details text:
   * - For recurring: invoice profile name
   * - For non-recurring: invoice name (stored in description)
   */
  const getInvoiceDetails = (invoice: (typeof invoices)[0]): string => {
    // Cast to access additional fields that may exist from API
    const inv = invoice as typeof invoice & {
      invoice_profile?: { name: string } | null;
      description?: string | null;
    };

    if (inv.is_recurring) {
      // Try invoice_profile first, then profile (legacy)
      return inv.invoice_profile?.name || inv.profile?.name || 'Unknown Profile';
    }
    // Non-recurring: use description as invoice name, fall back to notes
    return inv.description || inv.notes || 'Unnamed Invoice';
  };

  return (
    <div className="space-y-4">
      {/* Header with Month Navigator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">TDS Invoices</h2>
        <MonthNavigator
          month={selectedMonth}
          year={selectedYear}
          onChange={handleMonthChange}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[25%]">Invoice Details</TableHead>
              <TableHead className="w-[25%]">Invoice Number</TableHead>
              <TableHead className="w-[15%]">Invoice Date</TableHead>
              <TableHead className="w-[15%] text-right">Invoice Amt</TableHead>
              <TableHead className="w-[10%] text-right">TDS %</TableHead>
              <TableHead className="w-[10%] text-right">TDS Amt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No TDS invoices found for this month
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const tdsAmount = calculateTdsAmount(
                  invoice.invoice_amount,
                  invoice.tds_percentage
                );

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {getInvoiceDetails(invoice)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.invoice_date)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.invoice_amount)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTdsPercentage(invoice.tds_percentage)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(tdsAmount)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {!isLoading && invoices.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">
                  Total
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totals.invoiceAmount)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold">
                  {formatCurrency(totals.tdsAmount)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

export default TDSTab;
