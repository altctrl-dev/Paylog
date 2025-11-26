/**
 * TDS Invoices Page
 *
 * Shows TDS-applicable invoices with calculations and monthly totals.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePanel } from '@/hooks/use-panel';
import { useInvoices } from '@/hooks/use-invoices';
import { MonthNavigator } from '@/components/invoices/month-navigator';
import type { InvoiceWithRelations } from '@/types/invoice';
import { PANEL_WIDTH } from '@/types/panel';
import { formatCurrency } from '@/lib/utils/format';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Receipt, Download } from 'lucide-react';

export default function TDSInvoicesPage() {
  const { openPanel } = usePanel();

  // Month filter state
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());
  const [dateRange, setDateRange] = React.useState(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  }));

  // Fetch TDS-applicable invoices with date filter
  const { data, isLoading, error } = useInvoices({
    tds_applicable: true,
    start_date: dateRange.start,
    end_date: dateRange.end,
    page: 1,
    per_page: 100, // Get all for the month
    sort_by: 'invoice_date',
    sort_order: 'desc',
  });

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setSelectedDate(startDate);
    setDateRange({ start: startDate, end: endDate });
  };

  const handleRowClick = (invoice: InvoiceWithRelations) => {
    openPanel('invoice-v2-detail', { invoiceId: invoice.id }, { width: PANEL_WIDTH.LARGE });
  };

  // Calculate TDS totals
  const tdsCalculations = React.useMemo(() => {
    if (!data?.invoices) return { totalAmount: 0, totalTDS: 0, totalPayable: 0, invoiceCount: 0 };

    return data.invoices.reduce(
      (acc, invoice) => {
        const amount = invoice.invoice_amount || 0;
        const tdsPercent = invoice.tds_percentage || 0;
        const tdsAmount = (amount * tdsPercent) / 100;
        const payable = amount - tdsAmount;

        return {
          totalAmount: acc.totalAmount + amount,
          totalTDS: acc.totalTDS + tdsAmount,
          totalPayable: acc.totalPayable + payable,
          invoiceCount: acc.invoiceCount + 1,
        };
      },
      { totalAmount: 0, totalTDS: 0, totalPayable: 0, invoiceCount: 0 }
    );
  }, [data?.invoices]);

  const handleExportCSV = () => {
    if (!data?.invoices || data.invoices.length === 0) return;

    const headers = ['Invoice #', 'Vendor', 'Date', 'Paid On', 'Amount', 'TDS %', 'TDS Amount', 'Payable'];
    const rows = data.invoices.map((inv) => {
      const tdsAmount = ((inv.invoice_amount || 0) * (inv.tds_percentage || 0)) / 100;
      const payable = (inv.invoice_amount || 0) - tdsAmount;
      const invoiceAny = inv as unknown as Record<string, unknown>;
      return [
        inv.invoice_number,
        inv.vendor?.name || '',
        inv.invoice_date ? format(new Date(inv.invoice_date), 'dd/MM/yyyy') : '',
        invoiceAny.paid_date ? format(new Date(invoiceAny.paid_date as string), 'dd/MM/yyyy') : '',
        inv.invoice_amount?.toFixed(2) || '0.00',
        inv.tds_percentage?.toFixed(2) || '0.00',
        tdsAmount.toFixed(2),
        payable.toFixed(2),
      ];
    });

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      tdsCalculations.totalAmount.toFixed(2),
      '',
      tdsCalculations.totalTDS.toFixed(2),
      tdsCalculations.totalPayable.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TDS_Report_${format(selectedDate, 'MMMM_yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TDS Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage TDS-applicable invoices
          </p>
        </div>
        <div className="flex items-center gap-4">
          <MonthNavigator
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={!data?.invoices || data.invoices.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Invoices</p>
          <p className="text-2xl font-bold">{tdsCalculations.invoiceCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl font-bold">{formatCurrency(tdsCalculations.totalAmount, 'INR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total TDS</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(tdsCalculations.totalTDS, 'INR')}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Net Payable</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(tdsCalculations.totalPayable, 'INR')}</p>
        </Card>
      </div>

      {/* Table */}
      {error && (
        <Card className="p-8 text-center">
          <p className="text-destructive">
            {error.message || 'Failed to load invoices'}
          </p>
        </Card>
      )}

      {!error && !isLoading && data && (
        <>
          {data.invoices.length === 0 ? (
            <Card className="p-12 text-center">
              <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No TDS invoices</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No TDS-applicable invoices found for {format(selectedDate, 'MMMM yyyy')}.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-medium">Invoice #</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Vendor</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Invoice Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Paid On</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">TDS %</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">TDS Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.map((invoice) => {
                      const invoiceAny = invoice as unknown as Record<string, unknown>;
                      const amount = invoice.invoice_amount || 0;
                      const tdsPercent = invoice.tds_percentage || 0;
                      const tdsAmount = (amount * tdsPercent) / 100;
                      const payable = amount - tdsAmount;

                      return (
                        <tr
                          key={invoice.id}
                          className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRowClick(invoice)}
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-4 py-3 text-sm">{invoice.vendor?.name}</td>
                          <td className="px-4 py-3 text-sm">
                            {invoice.invoice_date
                              ? format(new Date(invoice.invoice_date), 'dd MMM yyyy')
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {invoiceAny.paid_date
                              ? format(new Date(invoiceAny.paid_date as string), 'dd MMM yyyy')
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(amount, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Badge variant="secondary">{tdsPercent}%</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-destructive">
                            {formatCurrency(tdsAmount, 'INR')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium">
                            {formatCurrency(payable, 'INR')}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals Row */}
                    <tr className="bg-muted/50 font-bold">
                      <td className="px-4 py-3 text-sm" colSpan={4}>
                        Total ({tdsCalculations.invoiceCount} invoices)
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(tdsCalculations.totalAmount, 'INR')}
                      </td>
                      <td className="px-4 py-3 text-sm"></td>
                      <td className="px-4 py-3 text-sm text-right text-destructive">
                        {formatCurrency(tdsCalculations.totalTDS, 'INR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(tdsCalculations.totalPayable, 'INR')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {!error && isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading TDS invoices...</p>
        </Card>
      )}
    </div>
  );
}
