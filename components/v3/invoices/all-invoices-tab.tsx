'use client';

/**
 * All Invoices Tab Component (v3)
 *
 * Displays all invoices in a table format with:
 * - Month navigation with calendar picker
 * - Search bar
 * - Filter dropdown
 * - Export button
 * - New Invoice button
 * - Table with: checkbox, Invoice ID, Vendor, Amount, Status, Date, Actions
 */

import * as React from 'react';
import { useState } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useInvoices, useDeleteInvoice } from '@/hooks/use-invoices';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { type InvoiceStatus, INVOICE_STATUS } from '@/types/invoice';
import { MonthNavigator } from './month-navigator';

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
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    [INVOICE_STATUS.PAID]: 'bg-green-500/20 text-green-400 border-green-500/30',
    [INVOICE_STATUS.PENDING_APPROVAL]: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    [INVOICE_STATUS.OVERDUE]: 'bg-red-500/20 text-red-400 border-red-500/30',
    [INVOICE_STATUS.PARTIAL]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    [INVOICE_STATUS.UNPAID]: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    [INVOICE_STATUS.ON_HOLD]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    [INVOICE_STATUS.REJECTED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const defaultVariant = 'bg-gray-500/20 text-gray-400 border-gray-500/30';

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        variants[status] || defaultVariant
      )}
    >
      {status}
    </span>
  );
}

// ============================================================================
// Format Helpers
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string | Date | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// ============================================================================
// Main Component
// ============================================================================

export function AllInvoicesTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const { openPanel } = usePanel();
  const { invoiceCreationMode } = useUIVersion();
  const deleteInvoice = useDeleteInvoice();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'invoice_date' | 'invoice_amount' | 'status'>('invoice_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showInvoiceTypeMenu, setShowInvoiceTypeMenu] = useState(false);

  // Default to current month
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Calculate date range for selected month
  const { start, end } = getMonthDateRange(selectedMonth, selectedYear);

  // Fetch invoices for selected month
  const { data, isLoading } = useInvoices({
    page: 1,
    per_page: 100,
    status: statusFilter === 'all' ? undefined : (statusFilter as InvoiceStatus),
    start_date: start,
    end_date: end,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const invoices = data?.invoices ?? [];

  // Filter by search query
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(query) ||
      invoice.vendor?.name?.toLowerCase().includes(query)
    );
  });

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

  // Action handlers
  const handleNewInvoice = (type: 'recurring' | 'non-recurring') => {
    setShowInvoiceTypeMenu(false);
    if (invoiceCreationMode === 'panel') {
      const panelType = type === 'recurring' ? 'invoice-create-recurring' : 'invoice-create-non-recurring';
      openPanel(panelType, {}, { width: PANEL_WIDTH.LARGE });
    } else {
      router.push(`/invoices/new/${type}`);
    }
  };

  const handleViewInvoice = (id: number) => {
    openPanel('invoice-v2-detail', { invoiceId: id });
  };

  const handleEditInvoice = (id: number, isRecurring: boolean) => {
    const panelType = isRecurring ? 'invoice-edit-recurring-v2' : 'invoice-edit-non-recurring-v2';
    openPanel(panelType, { invoiceId: id }, { width: PANEL_WIDTH.LARGE });
  };

  const handleExport = () => {
    if (filteredInvoices.length === 0) {
      alert('No invoices to export');
      return;
    }

    // Prepare data for export
    const exportData = filteredInvoices.map((invoice) => ({
      'Invoice ID': invoice.invoice_number || '',
      'Vendor': invoice.vendor?.name || '',
      'Amount': invoice.invoice_amount,
      'Status': invoice.status,
      'Date': formatDate(invoice.invoice_date),
      'Type': invoice.is_recurring ? 'Recurring' : 'One-time',
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    // Generate filename with month/year
    const filename = `invoices_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;

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

  const handleDeleteInvoice = (id: number) => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice.mutate(id);
    }
  };

  // Format month name for title
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const titleMonth = `${monthNames[selectedMonth]} ${selectedYear}`;

  return (
    <div className="space-y-4">
      {/* Title with Month */}
      <h2 className="text-lg font-semibold">All Invoices - {titleMonth}</h2>

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
              <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(INVOICE_STATUS.PAID)}>
                Paid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(INVOICE_STATUS.UNPAID)}>
                Unpaid
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(INVOICE_STATUS.OVERDUE)}>
                Overdue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter(INVOICE_STATUS.PENDING_APPROVAL)}>
                Pending Approval
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
              <DropdownMenuItem onClick={() => handleSort('status')}>
                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Month Navigator, Export, New Invoice */}
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
          <DropdownMenu open={showInvoiceTypeMenu} onOpenChange={setShowInvoiceTypeMenu}>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleNewInvoice('recurring')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recurring Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNewInvoice('non-recurring')}>
                <FileText className="mr-2 h-4 w-4" />
                One-time Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[18%] text-xs font-medium text-muted-foreground uppercase tracking-wider Text-left">
                Invoice ID
              </TableHead>
              <TableHead className="w-[22%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vendor
              </TableHead>
              <TableHead className="w-[14%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </TableHead>
              <TableHead className="w-[12%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="w-[14%] text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </TableHead>
              <TableHead className="w-[12%] text-xs font-medium text-muted-foreground uppercase tracking-wider text-left pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4"><Skeleton className="h-5 w-5 rounded" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="pr-6"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
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
                  <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {invoice.vendor?.name || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.invoice_amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status as InvoiceStatus} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.invoice_date)}
                  </TableCell>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => handleViewInvoice(invoice.id)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </button>
                      <button
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => handleEditInvoice(invoice.id, invoice.is_recurring)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </button>
                      {isSuperAdmin && (
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          disabled={deleteInvoice.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default AllInvoicesTab;
