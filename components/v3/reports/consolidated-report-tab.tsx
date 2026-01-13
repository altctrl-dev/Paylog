'use client';

/**
 * Consolidated Report Tab Component
 *
 * Displays all invoices for a selected period in a report format with:
 * - Period selector (This Month, Last Month, This FY, Last FY, Custom)
 * - Month navigator for quick navigation
 * - Export button (Excel)
 * - Audit button (placeholder)
 * - Table with: checkbox, Invoice Details, Date, Amount, Status, Remaining
 *
 * Based on AllInvoicesTab but simplified for reporting purposes:
 * - No search field
 * - No filters
 * - No "New Invoice" button
 * - Shows all invoices regardless of status
 */

import * as React from 'react';
import { useState } from 'react';
import {
  Download,
  Pencil,
  Trash2,
  Archive,
  CreditCard,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ClipboardCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useInvoices } from '@/hooks/use-invoices';
import { createInvoiceArchiveRequest, permanentDeleteInvoice, rejectInvoice, bulkArchiveInvoices } from '@/app/actions/invoices';
import {
  ConfirmationDialog,
  ConfirmationContentRow,
  InputDialog,
} from '@/components/ui/confirmation-dialog';
import { toast } from 'sonner';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { useSession } from 'next-auth/react';
import { type InvoiceStatus, INVOICE_STATUS, type InvoiceFilters } from '@/types/invoice';
import { MonthNavigator } from '../invoices/month-navigator';
import { FloatingActionBar } from '../invoices/floating-action-bar';
import { calculateTds } from '@/lib/utils/tds';
import { formatCurrency } from '@/lib/utils/format';
import { bulkExportInvoices } from '@/app/actions/bulk-operations';
import {
  PeriodSelector,
  getDefaultPeriod,
  type PeriodSelection,
} from '@/components/ui/period-selector';
import { getMonthRange, formatPeriodLabel } from '@/lib/utils/invoice-filters';

// ============================================================================
// Sortable Table Head Component
// ============================================================================

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: NonNullable<InvoiceFilters['sort_by']>;
  currentSortBy?: InvoiceFilters['sort_by'];
  currentSortOrder: 'asc' | 'desc';
  onSort: (sortBy: NonNullable<InvoiceFilters['sort_by']>) => void;
  className?: string;
}

function SortableTableHead({
  children,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSortBy === sortKey;

  return (
    <TableHead
      className={cn(
        'text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none',
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSortOrder === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    </TableHead>
  );
}

// ============================================================================
// Status Badge Component
// ============================================================================

const STATUS_LABELS: Record<string, string> = {
  [INVOICE_STATUS.PAID]: 'Paid',
  [INVOICE_STATUS.PENDING_APPROVAL]: 'Pending Approval',
  [INVOICE_STATUS.OVERDUE]: 'Overdue',
  [INVOICE_STATUS.PARTIAL]: 'Partially Paid',
  [INVOICE_STATUS.UNPAID]: 'Unpaid',
  [INVOICE_STATUS.ON_HOLD]: 'On Hold',
  [INVOICE_STATUS.REJECTED]: 'Rejected',
};

interface StatusBadgeProps {
  status: string;
  hasPendingPayment?: boolean;
}

function StatusBadge({ status, hasPendingPayment }: StatusBadgeProps) {
  if (hasPendingPayment && status !== INVOICE_STATUS.PENDING_APPROVAL) {
    return (
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
          'bg-purple-500/20 text-purple-400 border-purple-500/30'
        )}
      >
        Payment Pending
      </span>
    );
  }

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
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        variants[status] || defaultVariant
      )}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Format Helpers
// ============================================================================

function formatDate(dateString: string | Date | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function calculateTdsAmount(invoiceAmount: number, tdsPercentage: number | null, tdsRounded: boolean = false): number {
  if (tdsPercentage === null || tdsPercentage === undefined) return 0;
  const { tdsAmount } = calculateTds(invoiceAmount, tdsPercentage, tdsRounded);
  return tdsAmount;
}

// ============================================================================
// Main Component
// ============================================================================

export function ConsolidatedReportTab() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  const { openPanel } = usePanel();

  // Period selection state (default to this month)
  const [period, setPeriod] = useState<PeriodSelection>(getDefaultPeriod);

  // Derive month/year from period for MonthNavigator
  const selectedMonth = period.startDate.getMonth();
  const selectedYear = period.startDate.getFullYear();

  // Selection state
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState<InvoiceFilters['sort_by']>('invoice_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Dialog states
  const [deleteDialogData, setDeleteDialogData] = useState<{
    invoiceId: number;
    invoiceNumber: string;
    reason: string;
  } | null>(null);
  const [deleteReasonDialog, setDeleteReasonDialog] = useState<{
    invoiceId: number;
    invoiceNumber: string;
  } | null>(null);
  const [archiveReasonDialog, setArchiveReasonDialog] = useState<{
    invoiceId: number;
    invoiceNumber: string;
  } | null>(null);
  const [rejectReasonDialog, setRejectReasonDialog] = useState<{
    invoiceId: number;
    invoiceNumber: string;
  } | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Bulk operation states
  const [bulkArchiveDialog, setBulkArchiveDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [isBulkOperationLoading, setIsBulkOperationLoading] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch invoices for the selected period (all statuses)
  const { data, isLoading } = useInvoices({
    page: 1,
    per_page: 500,
    start_date: period.startDate,
    end_date: period.endDate,
    sort_by: sortBy,
    sort_order: sortOrder,
  });

  const invoices = data?.invoices ?? [];

  // Handle period change
  const handlePeriodChange = (newPeriod: PeriodSelection) => {
    setPeriod(newPeriod);
    setSelectedInvoices(new Set()); // Clear selection on period change
  };

  // Handle month navigator change - syncs with period selector
  const handleMonthChange = (month: number, year: number) => {
    const { start, end } = getMonthRange(month, year);
    setPeriod({
      startDate: start,
      endDate: end,
      type: 'custom',
      label: formatPeriodLabel(start, end),
    });
    setSelectedInvoices(new Set());
  };

  // Handle column sort
  const handleColumnSort = (sortKey: NonNullable<InvoiceFilters['sort_by']>) => {
    if (sortBy === sortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sortKey);
      setSortOrder('asc');
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedInvoices.size === invoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(invoices.map((inv) => inv.id)));
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

  const isAllSelected = invoices.length > 0 && selectedInvoices.size === invoices.length;

  // Action handlers
  const handleViewInvoice = (id: number) => {
    openPanel('invoice-v3-detail', { invoiceId: id }, { width: PANEL_WIDTH.LARGE });
  };

  const handleEditInvoice = (id: number, isRecurring: boolean) => {
    const panelType = isRecurring ? 'invoice-edit-recurring-v2' : 'invoice-edit-non-recurring-v2';
    openPanel(panelType, { invoiceId: id }, { width: PANEL_WIDTH.LARGE });
  };

  const handleRecordPayment = (invoice: (typeof invoices)[0]) => {
    const tdsAmount = invoice.tds_applicable && invoice.tds_percentage
      ? calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
      : 0;
    const netPayable = invoice.invoice_amount - tdsAmount;
    const totalPaid = invoice.totalPaid ?? 0;
    const remainingBalance = Math.max(0, netPayable - totalPaid);

    openPanel('payment-record', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceName: invoice.is_recurring
        ? invoice.invoice_profile?.name
        : invoice.invoice_name || invoice.description,
      invoiceStatus: invoice.status,
      invoiceAmount: invoice.invoice_amount,
      remainingBalance,
      tdsApplicable: invoice.tds_applicable,
      tdsPercentage: invoice.tds_percentage,
      tdsRounded: invoice.tds_rounded ?? false,
      vendorName: invoice.vendor?.name,
      currencyCode: invoice.currency?.code,
    });
  };

  // Export handler
  const handleExport = () => {
    if (invoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }

    const exportData = invoices.map((invoice) => {
      const tdsAmount = invoice.tds_applicable && invoice.tds_percentage
        ? calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
        : 0;
      const netPayable = invoice.invoice_amount - tdsAmount;
      const totalPaid = invoice.totalPaid ?? 0;
      const pendingAmount = Math.max(0, netPayable - totalPaid);

      const inv = invoice as typeof invoice & {
        invoice_profile?: { name: string } | null;
        invoice_name?: string | null;
        description?: string | null;
      };
      const invoiceDetails = inv.is_recurring
        ? (inv.invoice_profile?.name || 'Unknown Profile')
        : (inv.invoice_name || inv.description || inv.notes || 'Unnamed Invoice');

      return {
        'Invoice Details': invoiceDetails,
        'Invoice Number': invoice.invoice_number || '',
        'Type': invoice.is_recurring ? 'Recurring' : 'One-time',
        'Invoice Date': formatDate(invoice.invoice_date),
        'Invoice Amount': invoice.invoice_amount,
        'TDS %': invoice.tds_percentage || 0,
        'TDS Amount': tdsAmount,
        'Net Payable': netPayable,
        'Total Paid': totalPaid,
        'Pending Amount': pendingAmount,
        'Status': invoice.status,
        'Vendor': invoice.vendor?.name || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidated Report');

    const filename = `consolidated_report_${period.label.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Report exported successfully');
  };

  // Audit button handler (placeholder)
  const handleAudit = () => {
    toast.info('Audit feature coming soon');
  };

  // Delete handlers
  const handleDeleteInvoice = (invoiceId: number, invoiceNumber: string) => {
    setDeleteReasonDialog({ invoiceId, invoiceNumber });
  };

  const handleDeleteReasonConfirm = (reason: string) => {
    if (!deleteReasonDialog) return;
    setDeleteDialogData({
      invoiceId: deleteReasonDialog.invoiceId,
      invoiceNumber: deleteReasonDialog.invoiceNumber,
      reason,
    });
    setDeleteReasonDialog(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogData) return;

    setIsDeleting(true);
    try {
      const result = await permanentDeleteInvoice(deleteDialogData.invoiceId, deleteDialogData.reason);
      if (result.success) {
        toast.success(`Invoice ${deleteDialogData.invoiceNumber} has been permanently deleted`);
        setDeleteDialogData(null);
      } else {
        toast.error(result.error || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  // Archive handlers
  const handleArchiveInvoice = (id: number, invoiceNumber: string) => {
    setArchiveReasonDialog({ invoiceId: id, invoiceNumber });
  };

  const handleArchiveReasonConfirm = async (reason: string) => {
    if (!archiveReasonDialog) return;

    setIsArchiving(true);
    try {
      const result = await createInvoiceArchiveRequest(archiveReasonDialog.invoiceId, reason || undefined);

      if (result.success) {
        if (result.data?.archived) {
          toast.success(`Invoice ${archiveReasonDialog.invoiceNumber} has been archived`);
        } else {
          toast.success(`Archive request submitted for approval`);
        }
        setArchiveReasonDialog(null);
      } else {
        toast.error(result.error || 'Failed to create archive request');
      }
    } catch (error) {
      console.error('Archive error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsArchiving(false);
    }
  };

  // Reject handler
  const handleRejectInvoice = (id: number, invoiceNumber: string) => {
    setRejectReasonDialog({ invoiceId: id, invoiceNumber });
  };

  const handleRejectReasonConfirm = async (reason: string) => {
    if (!rejectReasonDialog) return;

    setIsRejecting(true);
    try {
      const result = await rejectInvoice(rejectReasonDialog.invoiceId, reason);
      if (result.success) {
        toast.success(`Invoice ${rejectReasonDialog.invoiceNumber} has been rejected`);
        setRejectReasonDialog(null);
      } else {
        toast.error(result.error || 'Failed to reject invoice');
      }
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsRejecting(false);
    }
  };

  // Bulk operation handlers
  const handleBulkExport = async () => {
    if (selectedInvoices.size === 0) return;

    setIsBulkOperationLoading(true);
    try {
      const defaultColumns = [
        'invoice_number', 'vendor_name', 'invoice_amount', 'invoice_date',
        'due_date', 'status', 'total_paid', 'remaining_balance',
      ];

      const result = await bulkExportInvoices(Array.from(selectedInvoices), defaultColumns);

      if (!result.success) {
        toast.error(result.error || 'Failed to export invoices');
        return;
      }

      if (result.data?.csvContent) {
        const blob = new Blob([result.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${selectedInvoices.size} invoice(s)`);
        setSelectedInvoices(new Set());
      } else {
        toast.error('Failed to export invoices');
      }
    } catch (error) {
      console.error('Bulk export error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsBulkOperationLoading(false);
    }
  };

  const handleBulkArchive = () => {
    if (selectedInvoices.size === 0) return;
    setBulkArchiveDialog(true);
  };

  const handleBulkArchiveConfirm = async (reason: string) => {
    if (selectedInvoices.size === 0) return;

    setIsBulkOperationLoading(true);
    try {
      const invoiceIds = Array.from(selectedInvoices);
      const result = await bulkArchiveInvoices(invoiceIds, reason);

      if (!result.success) {
        toast.error(result.error || 'Failed to archive invoices');
        return;
      }

      if (result.data.archivedCount !== undefined) {
        toast.success(`${result.data.archivedCount} invoice(s) archived successfully`);
      } else if (result.data.requestId !== undefined) {
        toast.success(`Archive request submitted for ${selectedInvoices.size} invoice(s). Pending admin approval.`);
      }

      setBulkArchiveDialog(false);
      setSelectedInvoices(new Set());
    } catch (error) {
      console.error('Bulk archive error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsBulkOperationLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedInvoices.size === 0 || !isSuperAdmin) return;
    setBulkDeleteDialog(true);
  };

  const handleBulkDeleteConfirm = async (reason: string) => {
    if (selectedInvoices.size === 0 || !isSuperAdmin) return;

    setIsBulkOperationLoading(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const invoiceId of selectedInvoices) {
        const result = await permanentDeleteInvoice(invoiceId, reason);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} invoice(s) deleted`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} invoice(s)`);
      }

      setBulkDeleteDialog(false);
      setSelectedInvoices(new Set());
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsBulkOperationLoading(false);
    }
  };

  // Get invoice details text
  function getInvoiceDetails(invoice: (typeof invoices)[0]): string {
    const inv = invoice as typeof invoice & {
      invoice_profile?: { name: string } | null;
      invoice_name?: string | null;
      description?: string | null;
    };

    if (inv.is_recurring) {
      return inv.invoice_profile?.name || 'Unknown Profile';
    }
    return inv.invoice_name || inv.description || inv.notes || 'Unnamed Invoice';
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="pl-1">
        <h2 className="text-lg font-semibold">
          Consolidated Report - {period.label}
        </h2>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Period Selector */}
        <PeriodSelector
          value={period}
          onChange={handlePeriodChange}
          minWidth="200px"
        />

        {/* Month Navigator - desktop only */}
        {!isMobile && (
          <MonthNavigator
            month={selectedMonth}
            year={selectedYear}
            onChange={handleMonthChange}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export Button */}
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'default'}
          className={cn(isMobile ? 'shrink-0' : 'gap-2')}
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          {!isMobile && <span>Export</span>}
        </Button>

        {/* Audit Button */}
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'default'}
          className={cn(isMobile ? 'shrink-0' : 'gap-2')}
          onClick={handleAudit}
        >
          <ClipboardCheck className="h-4 w-4" />
          {!isMobile && <span>Audit</span>}
        </Button>
      </div>

      {/* Result Count */}
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`
          )}
        </p>
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
              <TableHead className="w-[22%] text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                Invoice Details
              </TableHead>
              <SortableTableHead
                sortKey="invoice_date"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={handleColumnSort}
                className="w-[12%]"
              >
                Inv Date
              </SortableTableHead>
              <SortableTableHead
                sortKey="invoice_amount"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={handleColumnSort}
                className="w-[14%]"
              >
                Inv Amount
              </SortableTableHead>
              <SortableTableHead
                sortKey="status"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={handleColumnSort}
                className="w-[16%]"
              >
                Status
              </SortableTableHead>
              <TableHead className="w-[16%] text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                Actions
              </TableHead>
              <SortableTableHead
                sortKey="remaining_balance"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={handleColumnSort}
                className="w-[14%] pr-6"
              >
                Remaining
              </SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-4"><Skeleton className="h-5 w-5 rounded" /></TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="pr-6"><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <p className="text-muted-foreground">No invoices found for {period.label}</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((invoice) => {
                const tdsAmount = invoice.tds_applicable && invoice.tds_percentage
                  ? calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
                  : 0;
                const netPayable = invoice.invoice_amount - tdsAmount;
                const totalPaid = invoice.totalPaid ?? 0;
                const pendingAmount = Math.max(0, netPayable - totalPaid);

                const isPendingApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
                const canRecordPayment = !isPendingApproval &&
                  invoice.status !== INVOICE_STATUS.PAID &&
                  invoice.status !== INVOICE_STATUS.REJECTED &&
                  invoice.status !== INVOICE_STATUS.ON_HOLD;
                const canApproveReject = isAdmin && isPendingApproval;

                return (
                  <TableRow
                    key={invoice.id}
                    data-state={selectedInvoices.has(invoice.id) ? 'selected' : undefined}
                    className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleViewInvoice(invoice.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleViewInvoice(invoice.id);
                      }
                    }}
                  >
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                        aria-label={`Select ${invoice.invoice_number}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">{getInvoiceDetails(invoice)}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{invoice.invoice_number}</span>
                          {invoice.is_recurring && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-orange-500/50 text-orange-500">
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(invoice.invoice_date)}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">{formatCurrency(invoice.invoice_amount, invoice.currency?.code)}</div>
                        {invoice.tds_applicable && invoice.tds_percentage && tdsAmount > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            TDS {formatCurrency(tdsAmount, invoice.currency?.code)} ({invoice.tds_percentage}%)
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={invoice.status as InvoiceStatus} hasPendingPayment={invoice.has_pending_payment} /></TableCell>
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => handleEditInvoice(invoice.id, invoice.is_recurring)} title="Edit">
                          <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                        </button>
                        {canRecordPayment && (
                          <button className="text-muted-foreground hover:text-primary transition-colors" onClick={() => handleRecordPayment(invoice)} title="Record Payment">
                            <CreditCard className="h-4 w-4" /><span className="sr-only">Record Payment</span>
                          </button>
                        )}
                        {canApproveReject && (
                          <button className="text-muted-foreground hover:text-green-500 transition-colors" onClick={() => handleViewInvoice(invoice.id)} title="Review & Approve">
                            <Check className="h-4 w-4" /><span className="sr-only">Review & Approve</span>
                          </button>
                        )}
                        {canApproveReject && (
                          <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleRejectInvoice(invoice.id, invoice.invoice_number)} title="Reject">
                            <X className="h-4 w-4" /><span className="sr-only">Reject</span>
                          </button>
                        )}
                        <button className="text-muted-foreground hover:text-amber-500 transition-colors" onClick={() => handleArchiveInvoice(invoice.id, invoice.invoice_number)} title="Archive">
                          <Archive className="h-4 w-4" /><span className="sr-only">Archive</span>
                        </button>
                        {isSuperAdmin && (
                          <button className="text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)} disabled={isDeleting} title="Permanently Delete">
                            <Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span>
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="pr-6">
                      <span className={cn('font-medium text-sm', pendingAmount > 0 ? 'text-amber-500' : 'text-muted-foreground')}>
                        {pendingAmount > 0 ? formatCurrency(pendingAmount, invoice.currency?.code) : '–'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        open={!!deleteDialogData}
        onOpenChange={(open) => !open && setDeleteDialogData(null)}
        title="Permanently Delete Invoice"
        description="This action cannot be undone. The invoice will be permanently removed from the database."
        variant="destructive"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Permanently'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      >
        {deleteDialogData && (
          <div className="space-y-2">
            <ConfirmationContentRow label="Invoice Number" value={deleteDialogData.invoiceNumber} />
            <ConfirmationContentRow label="Reason" value={deleteDialogData.reason} />
          </div>
        )}
      </ConfirmationDialog>

      <InputDialog
        open={!!deleteReasonDialog}
        onOpenChange={(open) => !open && setDeleteReasonDialog(null)}
        title="Delete Invoice"
        description={`Enter a reason for deleting invoice ${deleteReasonDialog?.invoiceNumber || ''}.`}
        inputLabel="Deletion Reason"
        inputPlaceholder="Enter reason for deletion..."
        required
        minLength={6}
        maxLength={500}
        variant="destructive"
        confirmLabel="Continue"
        onConfirm={handleDeleteReasonConfirm}
      />

      <InputDialog
        open={!!archiveReasonDialog}
        onOpenChange={(open) => !open && setArchiveReasonDialog(null)}
        title="Archive Invoice"
        description={`Enter a reason for archiving invoice ${archiveReasonDialog?.invoiceNumber || ''}.`}
        inputLabel="Archive Reason"
        inputPlaceholder="Enter reason for archiving..."
        required
        minLength={6}
        maxLength={500}
        variant="default"
        confirmLabel="Archive"
        onConfirm={handleArchiveReasonConfirm}
        isLoading={isArchiving}
      />

      <InputDialog
        open={!!rejectReasonDialog}
        onOpenChange={(open) => !open && setRejectReasonDialog(null)}
        title="Reject Invoice"
        description={`Enter a reason for rejecting invoice ${rejectReasonDialog?.invoiceNumber || ''}.`}
        inputLabel="Rejection Reason"
        inputPlaceholder="Enter reason for rejection..."
        required
        minLength={6}
        maxLength={500}
        variant="destructive"
        confirmLabel="Reject"
        onConfirm={handleRejectReasonConfirm}
        isLoading={isRejecting}
      />

      <InputDialog
        open={bulkArchiveDialog}
        onOpenChange={(open) => !open && setBulkArchiveDialog(false)}
        title="Archive Selected Invoices"
        description={`Enter a reason for archiving ${selectedInvoices.size} invoice(s).`}
        inputLabel="Archive Reason"
        inputPlaceholder="Enter reason for archiving..."
        required
        minLength={6}
        maxLength={500}
        variant="default"
        confirmLabel={isBulkOperationLoading ? 'Archiving...' : 'Archive All'}
        onConfirm={handleBulkArchiveConfirm}
        isLoading={isBulkOperationLoading}
      />

      <InputDialog
        open={bulkDeleteDialog}
        onOpenChange={(open) => !open && setBulkDeleteDialog(false)}
        title="Delete Selected Invoices"
        description={`Enter a reason for deleting ${selectedInvoices.size} invoice(s).`}
        inputLabel="Deletion Reason"
        inputPlaceholder="Enter reason for deletion..."
        required
        minLength={6}
        maxLength={500}
        variant="destructive"
        confirmLabel={isBulkOperationLoading ? 'Deleting...' : 'Delete All'}
        onConfirm={handleBulkDeleteConfirm}
        isLoading={isBulkOperationLoading}
      />

      <FloatingActionBar
        selectedCount={selectedInvoices.size}
        selectedInvoices={selectedInvoices}
        userRole={userRole as string}
        onExport={handleBulkExport}
        onArchive={handleBulkArchive}
        onDelete={isSuperAdmin ? handleBulkDelete : undefined}
        onClearSelection={() => setSelectedInvoices(new Set())}
        isLoading={isBulkOperationLoading}
      />
    </div>
  );
}

export default ConsolidatedReportTab;
