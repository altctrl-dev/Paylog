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
 * - Search bar, Filter, and Sort on the left
 * - Month navigation and Export on the right
 * - Summary row with labeled totals
 */

import * as React from 'react';
import { useState } from 'react';
import { Search, Filter, ArrowUpDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useInvoices } from '@/hooks/use-invoices';
import { MonthNavigator } from './month-navigator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
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
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'invoice_date' | 'invoice_amount' | 'status'>('invoice_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tdsFilter, setTdsFilter] = useState<'all' | 'high' | 'low'>('all');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());

  // Calculate date range for selected month
  const { start, end } = getMonthDateRange(selectedMonth, selectedYear);

  // Fetch invoices with TDS applicable for selected month
  const { data, isLoading } = useInvoices({
    page: 1,
    per_page: 100,
    tds_applicable: true,
    start_date: start,
    end_date: end,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const invoices = data?.invoices ?? [];

  // Filter by search query and TDS percentage
  const filteredInvoices = invoices.filter((invoice) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const details = getInvoiceDetails(invoice).toLowerCase();
      if (!details.includes(query) && !invoice.invoice_number?.toLowerCase().includes(query)) {
        return false;
      }
    }

    // TDS percentage filter
    if (tdsFilter === 'high' && (invoice.tds_percentage || 0) < 10) return false;
    if (tdsFilter === 'low' && (invoice.tds_percentage || 0) >= 10) return false;

    return true;
  });

  // Calculate totals from filtered invoices
  const totals = filteredInvoices.reduce(
    (acc, invoice) => {
      const tdsAmount = calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage);
      return {
        invoiceAmount: acc.invoiceAmount + invoice.invoice_amount,
        tdsAmount: acc.tdsAmount + tdsAmount,
      };
    },
    { invoiceAmount: 0, tdsAmount: 0 }
  );

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map((inv) => inv.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const isAllSelected =
    filteredInvoices.length > 0 && selectedInvoices.size === filteredInvoices.length;

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleExport = () => {
    if (filteredInvoices.length === 0) {
      alert('No TDS invoices to export');
      return;
    }

    // Prepare data for export
    const exportData = filteredInvoices.map((invoice) => {
      const tdsAmount = calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage);
      return {
        'Invoice Details': getInvoiceDetails(invoice),
        'Invoice Number': invoice.invoice_number || '',
        'Invoice Date': formatDate(invoice.invoice_date),
        'Invoice Amount': invoice.invoice_amount,
        'TDS %': invoice.tds_percentage || 0,
        'TDS Amount': tdsAmount,
      };
    });

    // Add totals row
    exportData.push({
      'Invoice Details': 'TOTAL',
      'Invoice Number': '',
      'Invoice Date': '',
      'Invoice Amount': totals.invoiceAmount,
      'TDS %': 0,
      'TDS Amount': totals.tdsAmount,
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TDS');

    // Generate filename with month/year
    const filename = `tds_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  };

  const handleSort = (field: 'invoice_date' | 'invoice_amount' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  /**
   * Get invoice details text:
   * - For recurring: invoice profile name
   * - For non-recurring: invoice name (stored in description)
   */
  function getInvoiceDetails(invoice: (typeof invoices)[0]): string {
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
  }

  // Format month name for title
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const titleMonth = `${monthNames[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-4">
      {/* Title with Month */}
      <h2 className="text-lg font-semibold">TDS - {titleMonth}</h2>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Left: Search, Filter, Sort */}
        <div className="flex flex-1 gap-2">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setTdsFilter('all')}>
                All TDS Rates {tdsFilter === 'all' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTdsFilter('high')}>
                High TDS (≥10%) {tdsFilter === 'high' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTdsFilter('low')}>
                Low TDS ({'<'}10%) {tdsFilter === 'low' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleSort('invoice_date')}>
                Date {sortBy === 'invoice_date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('invoice_amount')}>
                Amount {sortBy === 'invoice_amount' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Month Navigator, Export */}
        <div className="flex items-center gap-2">
          <MonthNavigator
            month={selectedMonth}
            year={selectedYear}
            onChange={handleMonthChange}
          />
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Table with Summary Footer inside */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
              <TableHead className="w-8 pl-4">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[20%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Invoice Details
              </TableHead>
              <TableHead className="w-[20%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Invoice Number
              </TableHead>
              <TableHead className="w-[14%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Invoice Date
              </TableHead>
              <TableHead className="w-[14%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Invoice Amt
              </TableHead>
              <TableHead className="w-[10%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                TDS %
              </TableHead>
              <TableHead className="w-[14%] text-xs font-medium text-muted-foreground uppercase tracking-wider pl-4">
                TDS Amt
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4"><Skeleton className="h-4 w-4 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell className="pl-4"><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No TDS invoices found for this month
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => {
                const tdsAmount = calculateTdsAmount(
                  invoice.invoice_amount,
                  invoice.tds_percentage
                );

                return (
                  <TableRow
                    key={invoice.id}
                    data-state={selectedInvoices.has(invoice.id) ? 'selected' : undefined}
                    className="border-b border-border/50"
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                        aria-label={`Select ${invoice.invoice_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {getInvoiceDetails(invoice)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.invoice_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(invoice.invoice_amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTdsPercentage(invoice.tds_percentage)}
                    </TableCell>
                    <TableCell className="font-medium pl-4">
                      {formatCurrency(tdsAmount)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Summary Footer - Inside Table Border */}
        {!isLoading && filteredInvoices.length > 0 && (
          <div className="flex justify-between items-center px-4 py-4 border-t bg-muted/30">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Invoice Amount</div>
              <div className="text-xl font-semibold">{formatCurrency(totals.invoiceAmount)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total TDS Amount</div>
              <div className="text-xl font-semibold">{formatCurrency(totals.tdsAmount)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TDSTab;
