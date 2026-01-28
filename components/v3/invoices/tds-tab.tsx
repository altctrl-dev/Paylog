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
import { useCreditNotesWithTdsByMonth } from '@/hooks/use-credit-notes';
import { MonthNavigator } from './month-navigator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { calculateTds } from '@/lib/utils/tds';
import { formatCurrency } from '@/lib/utils/format';

// ============================================================================
// Types
// ============================================================================

/**
 * Unified TDS entry type that can represent either:
 * - Invoice with TDS deduction (positive TDS)
 * - Credit note with TDS reversal (negative TDS)
 */
interface TdsEntry {
  id: string; // Unique key for React (inv_{id} or cn_{id})
  type: 'invoice' | 'reversal';
  details: string;
  invoice_number: string;
  date: Date | string | null;
  invoice_amount: number;
  tds_percentage: number | null;
  tds_amount: number; // Positive for deductions, negative for reversals
  currency_code: string;
  original_id: number; // Original invoice or credit note ID
  credit_note_number?: string; // Only for reversals
}

// ============================================================================
// Format Helpers
// ============================================================================

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

/**
 * Calculate TDS amount using invoice's tds_rounded preference (BUG-003)
 */
function calculateTdsAmountWithRounding(
  invoiceAmount: number,
  tdsPercentage: number | null,
  tdsRounded: boolean = false
): number {
  if (tdsPercentage === null || tdsPercentage === undefined) return 0;
  return calculateTds(invoiceAmount, tdsPercentage, tdsRounded).tdsAmount;
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
  const { data, isLoading: isLoadingInvoices } = useInvoices({
    page: 1,
    per_page: 100,
    tds_applicable: true,
    start_date: start,
    end_date: end,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  // Fetch credit notes with TDS reversals for selected month
  const { data: creditNotes, isLoading: isLoadingCreditNotes } = useCreditNotesWithTdsByMonth(
    selectedMonth,
    selectedYear
  );

  const isLoading = isLoadingInvoices || isLoadingCreditNotes;
  const invoices = data?.invoices ?? [];

  // Build unified TDS entries list
  const tdsEntries: TdsEntry[] = React.useMemo(() => {
    const entries: TdsEntry[] = [];

    // Add invoice TDS deductions
    invoices.forEach((invoice) => {
      const inv = invoice as typeof invoice & {
        tds_rounded?: boolean;
        invoice_profile?: { name: string } | null;
        invoice_name?: string | null;
        description?: string | null;
      };
      const tdsAmount = calculateTdsAmountWithRounding(
        invoice.invoice_amount,
        invoice.tds_percentage,
        inv.tds_rounded ?? false
      );

      entries.push({
        id: `inv_${invoice.id}`,
        type: 'invoice',
        details: inv.is_recurring
          ? inv.invoice_profile?.name || 'Unknown Profile'
          : inv.invoice_name || inv.description || invoice.notes || 'Unnamed Invoice',
        invoice_number: invoice.invoice_number || '',
        date: invoice.invoice_date,
        invoice_amount: invoice.invoice_amount,
        tds_percentage: invoice.tds_percentage,
        tds_amount: tdsAmount, // Positive for deductions
        currency_code: invoice.currency?.code || 'INR',
        original_id: invoice.id,
      });
    });

    // Add credit note TDS reversals
    (creditNotes ?? []).forEach((cn) => {
      entries.push({
        id: `cn_${cn.id}`,
        type: 'reversal',
        details: cn.invoice.invoice_name || cn.invoice.vendor.name,
        invoice_number: cn.invoice.invoice_number,
        date: cn.credit_note_date,
        invoice_amount: -cn.amount, // Show credit amount as negative
        tds_percentage: cn.invoice.tds_percentage,
        tds_amount: -cn.tds_amount, // Negative for reversals
        currency_code: cn.currency_code,
        original_id: cn.id,
        credit_note_number: cn.credit_note_number,
      });
    });

    // Sort by date
    entries.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return entries;
  }, [invoices, creditNotes, sortOrder]);

  // Filter by search query and TDS percentage
  const filteredEntries = tdsEntries.filter((entry) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !entry.details.toLowerCase().includes(query) &&
        !entry.invoice_number?.toLowerCase().includes(query) &&
        !entry.credit_note_number?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // TDS percentage filter (skip reversals for percentage filter)
    if (entry.type === 'invoice') {
      if (tdsFilter === 'high' && (entry.tds_percentage || 0) < 10) return false;
      if (tdsFilter === 'low' && (entry.tds_percentage || 0) >= 10) return false;
    }

    return true;
  });

  // Calculate totals
  const totals = filteredEntries.reduce(
    (acc, entry) => {
      if (entry.type === 'invoice') {
        return {
          tdsDeducted: acc.tdsDeducted + entry.tds_amount,
          tdsReversed: acc.tdsReversed,
        };
      } else {
        // Reversal - tds_amount is already negative
        return {
          tdsDeducted: acc.tdsDeducted,
          tdsReversed: acc.tdsReversed + Math.abs(entry.tds_amount),
        };
      }
    },
    { tdsDeducted: 0, tdsReversed: 0 }
  );

  const netTds = totals.tdsDeducted - totals.tdsReversed;

  // Selection handlers - now using string IDs (inv_{id} or cn_{id})
  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredEntries.length) {
      setSelectedInvoices(new Set());
    } else {
      // For selection, we only select invoices (not reversals) by their original ID
      const invoiceIds = filteredEntries
        .filter((e) => e.type === 'invoice')
        .map((e) => e.original_id);
      setSelectedInvoices(new Set(invoiceIds));
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
    filteredEntries.filter((e) => e.type === 'invoice').length > 0 &&
    selectedInvoices.size === filteredEntries.filter((e) => e.type === 'invoice').length;

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      alert('No TDS entries to export');
      return;
    }

    // Prepare data for export
    const exportData = filteredEntries.map((entry) => ({
      Type: entry.type === 'invoice' ? 'Deduction' : 'Reversal',
      Details: entry.details,
      'Invoice Number': entry.invoice_number,
      'Credit Note': entry.credit_note_number || '',
      Date: formatDate(entry.date),
      Amount: entry.invoice_amount,
      'TDS %': entry.tds_percentage || 0,
      'TDS Amount': entry.tds_amount,
    }));

    // Add summary rows
    exportData.push({
      Type: '',
      Details: '',
      'Invoice Number': '',
      'Credit Note': '',
      Date: '',
      Amount: 0,
      'TDS %': 0,
      'TDS Amount': 0,
    });
    exportData.push({
      Type: 'SUMMARY',
      Details: 'TDS Deducted',
      'Invoice Number': '',
      'Credit Note': '',
      Date: '',
      Amount: 0,
      'TDS %': 0,
      'TDS Amount': totals.tdsDeducted,
    });
    exportData.push({
      Type: '',
      Details: 'TDS Reversed',
      'Invoice Number': '',
      'Credit Note': '',
      Date: '',
      Amount: 0,
      'TDS %': 0,
      'TDS Amount': -totals.tdsReversed,
    });
    exportData.push({
      Type: '',
      Details: 'NET TDS',
      'Invoice Number': '',
      'Credit Note': '',
      Date: '',
      Amount: 0,
      'TDS %': 0,
      'TDS Amount': netTds,
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
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No TDS entries found for this month
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => {
                const isReversal = entry.type === 'reversal';

                return (
                  <TableRow
                    key={entry.id}
                    data-state={!isReversal && selectedInvoices.has(entry.original_id) ? 'selected' : undefined}
                    className={cn(
                      'border-b border-border/50',
                      isReversal && 'bg-cyan-500/5'
                    )}
                  >
                    <TableCell className="pl-4">
                      {!isReversal ? (
                        <Checkbox
                          checked={selectedInvoices.has(entry.original_id)}
                          onCheckedChange={() => toggleSelect(entry.original_id)}
                          aria-label={`Select ${entry.invoice_number}`}
                        />
                      ) : (
                        <span className="text-cyan-500/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {entry.details}
                        {isReversal && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-cyan-500/50 text-cyan-500"
                          >
                            Reversal
                          </Badge>
                        )}
                      </div>
                      {isReversal && entry.credit_note_number && (
                        <div className="text-[10px] text-muted-foreground">
                          CN: {entry.credit_note_number}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.invoice_number}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className={cn('font-medium', isReversal && 'text-cyan-500')}>
                      {formatCurrency(entry.invoice_amount, entry.currency_code)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTdsPercentage(entry.tds_percentage)}
                    </TableCell>
                    <TableCell className={cn('font-medium pl-4', isReversal && 'text-cyan-500')}>
                      {formatCurrency(entry.tds_amount, entry.currency_code)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Summary Footer - Inside Table Border */}
        {!isLoading && filteredEntries.length > 0 && (
          <div className="flex justify-center items-center gap-8 px-4 py-4 border-t bg-muted/30">
            {/* TDS Deducted */}
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">TDS Deducted</div>
              <div className="text-lg font-semibold">
                {formatCurrency(totals.tdsDeducted, filteredEntries[0]?.currency_code)}
              </div>
            </div>

            {/* TDS Reversed (only show if there are reversals) */}
            {totals.tdsReversed > 0 && (
              <>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">TDS Reversed</div>
                  <div className="text-lg font-semibold text-cyan-500">
                    -{formatCurrency(totals.tdsReversed, filteredEntries[0]?.currency_code)}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-10 w-px bg-border" />

                {/* Net TDS */}
                <div className="text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Net TDS</div>
                  <div className="text-xl font-semibold">
                    {formatCurrency(netTds, filteredEntries[0]?.currency_code)}
                  </div>
                </div>
              </>
            )}

            {/* Just show Total TDS if no reversals */}
            {totals.tdsReversed === 0 && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
                <div className="text-xl font-semibold">
                  {formatCurrency(totals.tdsDeducted, filteredEntries[0]?.currency_code)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TDSTab;
