'use client';

/**
 * All Invoices Tab Component (v3)
 *
 * Displays all invoices in a table format with:
 * - Month navigation with calendar picker (monthly view)
 * - Search bar for quick filtering
 * - Comprehensive filter popover (status, vendor, category, profile, payment type,
 *   entity, invoice type, TDS, archived, date range, sort)
 * - Export button (Excel)
 * - New Invoice button (recurring/non-recurring)
 * - Table with: checkbox, Invoice Details, Date, Amount, Status, Actions, Remaining
 */

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Plus,
  Pencil,
  Trash2,
  Archive,
  RefreshCw,
  FileText,
  CreditCard,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
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
import { useInvoices, useInvoiceFormOptions } from '@/hooks/use-invoices';
import { useActivePaymentTypes } from '@/hooks/use-payment-types';
import { createInvoiceArchiveRequest, permanentDeleteInvoice, approveInvoice, rejectInvoice } from '@/app/actions/invoices';
import { approveVendorRequest } from '@/app/actions/admin/master-data-approval';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ConfirmationDialog,
  ConfirmationContentRow,
  CONFIRMATION_CARD_STYLES,
  InputDialog,
} from '@/components/ui/confirmation-dialog';
import {
  InvoiceFilterPopover,
  PENDING_ACTIONS_STATUS,
  type InvoiceFilterState,
  type FilterOptions,
} from './invoice-filter-popover';
import { InvoiceFilterSheet } from './invoice-filter-sheet';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { type InvoiceStatus, INVOICE_STATUS, type InvoiceFilters } from '@/types/invoice';
import { MonthNavigator } from './month-navigator';
import { calculateTds } from '@/lib/utils/tds';
import { formatCurrency } from '@/lib/utils/format';

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

/**
 * Get human-readable label for active filters (used by filter pills)
 */
function getFilterLabel(
  key: keyof InvoiceFilterState,
  value: unknown,
  options: FilterOptions
): string | null {
  switch (key) {
    case 'status':
      return `Status: ${String(value).replace(/_/g, ' ')}`;
    case 'vendorId': {
      const vendor = options.vendors.find(v => v.id === value);
      return vendor ? `Vendor: ${vendor.name}` : null;
    }
    case 'categoryId': {
      const category = options.categories.find(c => c.id === value);
      return category ? `Category: ${category.name}` : null;
    }
    case 'profileId': {
      const profile = options.profiles.find(p => p.id === value);
      return profile ? `Profile: ${profile.name}` : null;
    }
    case 'paymentTypeId': {
      const paymentType = options.paymentTypes.find(pt => pt.id === value);
      return paymentType ? `Payment: ${paymentType.name}` : null;
    }
    case 'entityId': {
      const entity = options.entities.find(e => e.id === value);
      return entity ? `Entity: ${entity.name}` : null;
    }
    case 'isRecurring':
      return value === true ? 'Recurring' : value === false ? 'One-time' : null;
    case 'tdsApplicable':
      return value === true ? 'TDS Applicable' : null;
    case 'showArchived':
      return value === true ? 'Archived' : null;
    case 'startDate':
    case 'endDate':
      // Combined date range handled separately in activeFilterPills
      return null;
    default:
      return null;
  }
}

// ============================================================================
// Status Badge Component
// ============================================================================

/**
 * Status labels for display
 */
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
  /** When true, shows "Payment Pending" badge (purple) instead of invoice status */
  hasPendingPayment?: boolean;
}

/**
 * Status badge for invoice table rows
 *
 * Color scheme:
 * - Invoice Pending Approval: Amber/Yellow (bg-amber-500/20)
 * - Payment Pending: Purple (bg-purple-500/20)
 * - Paid: Green
 * - Overdue/Rejected: Red
 * - Partial: Blue
 * - Unpaid: Orange
 * - On Hold: Gray
 */
function StatusBadge({ status, hasPendingPayment }: StatusBadgeProps) {
  // Payment pending takes precedence over invoice status (when invoice is approved but has pending payment)
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

/**
 * Calculate TDS amount using invoice's tds_rounded preference
 * Uses calculateTds utility which supports ceiling rounding
 */
function calculateTdsAmount(invoiceAmount: number, tdsPercentage: number | null, tdsRounded: boolean = false): number {
  if (tdsPercentage === null || tdsPercentage === undefined) return 0;
  const { tdsAmount } = calculateTds(invoiceAmount, tdsPercentage, tdsRounded);
  return tdsAmount;
}

/**
 * Get month/year group key for an invoice date
 * Returns: "Dec 2024" or "Dec" (if current year)
 */
function getMonthGroupKey(dateString: string | Date | null, currentYear: number): string {
  if (!dateString) return 'No Date';
  const date = new Date(dateString);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  // Only show year if it's not the current year
  return year === currentYear ? month : `${month} ${year}`;
}

/**
 * Get sortable key for month groups (for sorting groups chronologically)
 */
function getMonthSortKey(dateString: string | Date | null): number {
  if (!dateString) return 0;
  const date = new Date(dateString);
  return date.getFullYear() * 100 + date.getMonth();
}

/**
 * Group invoices by month/year
 * @param sortOrder - 'asc' for oldest month first, 'desc' for newest month first (used when sorting by date)
 */
interface GroupableInvoice {
  id: number;
  invoice_date: string | Date | null;
  invoice_number: string;
}

function groupInvoicesByMonth<T extends GroupableInvoice>(
  invoices: T[],
  currentYear: number,
  sortOrder: 'asc' | 'desc' = 'desc'
): Array<{ key: string; sortKey: number; invoices: T[] }> {
  const groups = new Map<string, { sortKey: number; invoices: T[] }>();

  for (const invoice of invoices) {
    const groupKey = getMonthGroupKey(invoice.invoice_date, currentYear);
    const sortKey = getMonthSortKey(invoice.invoice_date);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { sortKey, invoices: [] });
    }
    groups.get(groupKey)!.invoices.push(invoice);
  }

  // Convert to array and sort by sortKey
  // 'asc' = oldest month first, 'desc' = newest month first
  return Array.from(groups.entries())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => sortOrder === 'asc' ? a.sortKey - b.sortKey : b.sortKey - a.sortKey);
}

// ============================================================================
// Main Component
// ============================================================================

export function AllInvoicesTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  const { openPanel } = usePanel();
  const { invoiceCreationMode } = useUIVersion();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [showInvoiceTypeMenu, setShowInvoiceTypeMenu] = useState(false);

  // BUG-007 FIX: Vendor pending approval dialog state
  const [isVendorPendingDialogOpen, setIsVendorPendingDialogOpen] = useState(false);
  const [vendorPendingData, setVendorPendingData] = useState<{
    invoiceId: number;
    invoiceNumber: string;
    vendor: {
      id: number;
      name: string;
      address?: string | null;
      bank_details?: string | null;
      gst_exemption?: boolean;
    };
  } | null>(null);
  const [isApprovingVendor, setIsApprovingVendor] = useState(false);
  // Two-step dialog: 'details' shows vendor info, 'confirm' shows final confirmation
  const [vendorDialogStep, setVendorDialogStep] = useState<'details' | 'confirm'>('details');

  // Delete confirmation dialog state
  const [deleteDialogData, setDeleteDialogData] = useState<{
    invoiceId: number;
    invoiceNumber: string;
    reason: string;
  } | null>(null);

  // Input dialog states for deletion, archive, rejection reasons
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

  // Unified filter state for InvoiceFilterPopover
  const [filters, setFilters] = useState<InvoiceFilterState>({
    viewMode: 'pending',
    status: PENDING_ACTIONS_STATUS, // Default to "Pending Actions" status for pending view
    showArchived: false,
    sortOrder: 'asc',
  });

  // Mobile detection for filter UI
  const [isMobile, setIsMobile] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Default to current month (used when in monthly view mode)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Calculate date range for selected month
  const { start, end } = getMonthDateRange(selectedMonth, selectedYear);

  // Fetch filter options for the popover
  const { data: formOptions, isLoading: isLoadingOptions } = useInvoiceFormOptions();
  const { data: paymentTypes = [] } = useActivePaymentTypes();

  // Build filter options for the popover
  const filterOptions: FilterOptions = {
    vendors: formOptions?.vendors ?? [],
    categories: formOptions?.categories ?? [],
    profiles: formOptions?.profiles ?? [],
    entities: formOptions?.entities ?? [],
    paymentTypes: paymentTypes,
  };

  // Compute active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.vendorId) count++;
    if (filters.categoryId) count++;
    if (filters.profileId) count++;
    if (filters.paymentTypeId) count++;
    if (filters.entityId) count++;
    if (filters.isRecurring !== undefined) count++;
    if (filters.tdsApplicable !== undefined) count++;
    if (filters.showArchived) count++;
    if (filters.startDate || filters.endDate) count++;
    return count;
  }, [filters]);

  // Build list of active filter pills for display
  const activeFilterPills = useMemo(() => {
    const pills: Array<{ key: keyof InvoiceFilterState; label: string }> = [];

    if (filters.status) {
      const label = getFilterLabel('status', filters.status, filterOptions);
      if (label) pills.push({ key: 'status', label });
    }
    if (filters.vendorId) {
      const label = getFilterLabel('vendorId', filters.vendorId, filterOptions);
      if (label) pills.push({ key: 'vendorId', label });
    }
    if (filters.categoryId) {
      const label = getFilterLabel('categoryId', filters.categoryId, filterOptions);
      if (label) pills.push({ key: 'categoryId', label });
    }
    if (filters.profileId) {
      const label = getFilterLabel('profileId', filters.profileId, filterOptions);
      if (label) pills.push({ key: 'profileId', label });
    }
    if (filters.paymentTypeId) {
      const label = getFilterLabel('paymentTypeId', filters.paymentTypeId, filterOptions);
      if (label) pills.push({ key: 'paymentTypeId', label });
    }
    if (filters.entityId) {
      const label = getFilterLabel('entityId', filters.entityId, filterOptions);
      if (label) pills.push({ key: 'entityId', label });
    }
    if (filters.isRecurring !== undefined) {
      const label = getFilterLabel('isRecurring', filters.isRecurring, filterOptions);
      if (label) pills.push({ key: 'isRecurring', label });
    }
    if (filters.tdsApplicable !== undefined) {
      const label = getFilterLabel('tdsApplicable', filters.tdsApplicable, filterOptions);
      if (label) pills.push({ key: 'tdsApplicable', label });
    }
    if (filters.showArchived) {
      pills.push({ key: 'showArchived', label: 'Archived' });
    }
    // Date range (show as single pill)
    if (filters.startDate || filters.endDate) {
      const startStr = filters.startDate?.toLocaleDateString('en-IN') ?? '';
      const endStr = filters.endDate?.toLocaleDateString('en-IN') ?? '';
      pills.push({ key: 'startDate', label: `Date: ${startStr} - ${endStr}` });
    }

    return pills;
  }, [filters, filterOptions]);

  // Remove single filter handler
  const handleRemoveFilter = (key: keyof InvoiceFilterState) => {
    setFilters(prev => {
      const next = { ...prev };
      if (key === 'startDate') {
        // Remove both date filters together
        next.startDate = undefined;
        next.endDate = undefined;
      } else if (key === 'showArchived') {
        // showArchived is non-optional boolean, reset to false
        next.showArchived = false;
      } else if (key === 'isRecurring' || key === 'tdsApplicable') {
        next[key] = undefined;
      } else {
        (next as Record<string, unknown>)[key] = undefined;
      }
      return next;
    });
  };

  // Clear all filters handler
  const handleClearAllFilters = () => {
    setFilters({
      viewMode: filters.viewMode, // Keep view mode
      showArchived: false,
      sortOrder: 'asc',
    });
  };

  // Handle column header sort click
  const handleColumnSort = (sortKey: NonNullable<InvoiceFilters['sort_by']>) => {
    setFilters(prev => ({
      ...prev,
      sortBy: sortKey,
      sortOrder: prev.sortBy === sortKey && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Determine which statuses to exclude for "pending" view (everything except paid)
  const pendingStatuses: InvoiceStatus[] = [
    INVOICE_STATUS.PENDING_APPROVAL as InvoiceStatus,
    INVOICE_STATUS.UNPAID as InvoiceStatus,
    INVOICE_STATUS.PARTIAL as InvoiceStatus,
    INVOICE_STATUS.OVERDUE as InvoiceStatus,
    INVOICE_STATUS.ON_HOLD as InvoiceStatus,
  ];

  // Determine the status to send to API (undefined for composite 'pending_actions' filter)
  // 'pending_actions' is a client-side composite filter, not a valid API status
  const apiStatus = filters.showArchived ? undefined :
    (filters.status === PENDING_ACTIONS_STATUS ? undefined : filters.status as InvoiceStatus | undefined);

  // Fetch invoices based on filter state
  const { data, isLoading } = useInvoices({
    page: 1,
    per_page: 500, // Fetch more for pending view since no date filter
    status: apiStatus,
    vendor_id: filters.vendorId,
    category_id: filters.categoryId,
    entity_id: filters.entityId,
    invoice_profile_id: filters.profileId,
    payment_type_id: filters.paymentTypeId,
    is_recurring: filters.isRecurring,
    tds_applicable: filters.tdsApplicable,
    // Use date range from filters if provided, otherwise use month range in monthly view
    start_date: filters.showArchived || filters.viewMode === 'pending'
      ? filters.startDate
      : (filters.startDate ?? start),
    end_date: filters.showArchived || filters.viewMode === 'pending'
      ? filters.endDate
      : (filters.endDate ?? end),
    sort_by: filters.sortBy,
    sort_order: filters.sortOrder,
    show_archived: filters.showArchived,
  });

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Filter invoices based on view mode and status
  const rawInvoices = data?.invoices ?? [];
  // Apply pending statuses filter ONLY when 'pending_actions' is explicitly selected
  // "All Statuses" (undefined) shows ALL invoices including paid, rejected, etc.
  const shouldFilterPendingStatuses = filters.status === PENDING_ACTIONS_STATUS;
  const invoices = shouldFilterPendingStatuses
    ? rawInvoices.filter(inv => pendingStatuses.includes(inv.status as InvoiceStatus))
    : rawInvoices;

  // Filter by search query
  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(query) ||
      invoice.vendor?.name?.toLowerCase().includes(query) ||
      invoice.invoice_name?.toLowerCase().includes(query) ||
      invoice.invoice_profile?.name?.toLowerCase().includes(query)
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
    openPanel('invoice-v3-detail', { invoiceId: id }, { width: PANEL_WIDTH.LARGE });
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

    // Prepare data for export with new column structure
    const exportData = filteredInvoices.map((invoice) => {
      // Calculate TDS and pending amounts
      // Use invoice's tds_rounded preference for consistent TDS calculation
      const tdsAmount = invoice.tds_applicable && invoice.tds_percentage
        ? calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
        : 0;
      const netPayable = invoice.invoice_amount - tdsAmount;
      const totalPaid = invoice.totalPaid ?? 0;
      const pendingAmount = Math.max(0, netPayable - totalPaid);

      // Get invoice details (profile name or invoice name)
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

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    // Generate filename with month/year
    const filename = `invoices_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  };

  const handleDeleteInvoice = async (invoiceId: number, invoiceNumber: string) => {
    // Open input dialog to get deletion reason
    setDeleteReasonDialog({ invoiceId, invoiceNumber });
  };

  const handleDeleteReasonConfirm = (reason: string) => {
    if (!deleteReasonDialog) return;
    // Show confirmation dialog with the reason
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

  const handleArchiveInvoice = async (id: number, invoiceNumber: string) => {
    // Open input dialog to get archive reason (optional)
    setArchiveReasonDialog({ invoiceId: id, invoiceNumber });
  };

  const handleArchiveReasonConfirm = async (reason: string) => {
    if (!archiveReasonDialog) return;

    setIsArchiving(true);
    try {
      const result = await createInvoiceArchiveRequest(
        archiveReasonDialog.invoiceId,
        reason || undefined
      );

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

  // Record payment handler - opens payment panel for the invoice
  const handleRecordPayment = (invoice: (typeof invoices)[0]) => {
    // Calculate remaining balance accounting for TDS using invoice's tds_rounded preference
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

  /**
   * Handle "Edit Invoice" from the vendor pending dialog
   * Opens the edit panel for the invoice
   */
  const handleEditInvoiceFromDialog = () => {
    if (!vendorPendingData) return;

    // Close dialog first
    setIsVendorPendingDialogOpen(false);
    setVendorDialogStep('details');

    // Get invoice details to determine if recurring
    const invoice = filteredInvoices.find(inv => inv.id === vendorPendingData.invoiceId);
    const isRecurring = invoice?.is_recurring ?? false;

    // Open edit panel
    handleEditInvoice(vendorPendingData.invoiceId, isRecurring);

    setVendorPendingData(null);
  };

  /**
   * Proceed to confirmation step in the two-step dialog
   */
  const handleProceedToConfirm = () => {
    setVendorDialogStep('confirm');
  };

  /**
   * Go back to details step in the two-step dialog
   */
  const handleBackToDetails = () => {
    setVendorDialogStep('details');
  };

  /**
   * Handle "Approve Vendor & Invoice" from the confirmation step
   * Approves both the vendor and the invoice using direct server actions
   */
  const handleApproveVendorAndInvoice = async () => {
    if (!vendorPendingData) return;

    const { invoiceId, invoiceNumber, vendor } = vendorPendingData;

    setIsApprovingVendor(true);
    try {
      // First approve the vendor
      const vendorResult = await approveVendorRequest(vendor.id);

      if (!vendorResult.success) {
        toast.error(vendorResult.error || 'Failed to approve vendor');
        setIsApprovingVendor(false);
        return;
      }

      toast.success(`Vendor "${vendor.name}" has been approved`);

      // Now approve the invoice
      const invoiceResult = await approveInvoice(invoiceId);

      if (invoiceResult.success) {
        toast.success(`Invoice ${invoiceNumber} has been approved`);
        // Close dialog only on full success
        setIsVendorPendingDialogOpen(false);
        setVendorDialogStep('details');
        setVendorPendingData(null);
      } else {
        toast.error(invoiceResult.error || 'Failed to approve invoice. Please try approving the invoice manually.');
      }
    } catch (error) {
      console.error('Error in approval flow:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsApprovingVendor(false);
    }
  };

  // Reject invoice handler
  const handleRejectInvoice = (id: number, invoiceNumber: string) => {
    // Open input dialog to get rejection reason
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

  /**
   * Get invoice details text:
   * - For recurring: invoice profile name
   * - For non-recurring: invoice name (stored in description or notes)
   */
  function getInvoiceDetails(invoice: (typeof invoices)[0]): string {
    // Cast to access additional fields that may exist from API
    const inv = invoice as typeof invoice & {
      invoice_profile?: { name: string } | null;
      invoice_name?: string | null;
      description?: string | null;
    };

    if (inv.is_recurring) {
      return inv.invoice_profile?.name || 'Unknown Profile';
    }
    // Non-recurring: use invoice_name field (fallback to description for backwards compatibility)
    return inv.invoice_name || inv.description || inv.notes || 'Unnamed Invoice';
  }

  // Format month name for title
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const titleMonth = `${monthNames[selectedMonth]} ${selectedYear}`;

  // Group invoices by month when in pending view mode
  // Pass sort order so month groups are also sorted correctly when sorting by date
  const currentYear = now.getFullYear();
  const groupSortOrder = filters.sortBy === 'invoice_date' ? filters.sortOrder : 'desc';
  const groupedInvoices = filters.viewMode === 'pending' && !filters.showArchived
    ? groupInvoicesByMonth(filteredInvoices, currentYear, groupSortOrder)
    : null;

  // Get title based on view mode
  const getTitle = () => {
    if (filters.showArchived) return 'Archived Invoices';
    if (filters.viewMode === 'pending') return 'Invoices Overview';
    return `All Invoices - ${titleMonth}`;
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="pl-1">
        <h2 className="text-lg font-semibold">
          {getTitle()}
        </h2>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2">
        {/* Search - shrinks on mobile to fit other elements */}
        <div className="relative flex-1 min-w-0 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        {/* Filters - Popover on desktop, Sheet on mobile */}
        {isMobile ? (
          <>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 relative"
              onClick={() => setFilterSheetOpen(true)}
              aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Open filters'}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-muted text-muted-foreground text-[10px] font-medium flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <InvoiceFilterSheet
              open={filterSheetOpen}
              onOpenChange={setFilterSheetOpen}
              filters={filters}
              onFiltersChange={setFilters}
              options={filterOptions}
              isLoading={isLoadingOptions}
              activeFilterCount={activeFilterCount}
            />
          </>
        ) : (
          <InvoiceFilterPopover
            filters={filters}
            onFiltersChange={setFilters}
            options={filterOptions}
            isLoading={isLoadingOptions}
            activeFilterCount={activeFilterCount}
          />
        )}

        {/* Month Navigator - desktop only, shown when in monthly view */}
        {!isMobile && !filters.showArchived && filters.viewMode === 'monthly' && (
          <MonthNavigator
            month={selectedMonth}
            year={selectedYear}
            onChange={handleMonthChange}
          />
        )}

        {/* Export Button - icon only on mobile, with text on desktop */}
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'default'}
          className={isMobile ? 'shrink-0' : 'gap-2 shrink-0'}
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          {!isMobile && <span>Export</span>}
        </Button>

        {/* New Invoice Button */}
        <DropdownMenu open={showInvoiceTypeMenu} onOpenChange={setShowInvoiceTypeMenu}>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              <span>New</span>
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

      {/* Active Filter Pills */}
      {activeFilterPills.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="region" aria-label="Active filters">
          {activeFilterPills.map((pill) => (
            <Badge
              key={pill.key}
              variant="secondary"
              className="gap-1 pr-1 text-xs"
              aria-label={`Filter: ${pill.label}`}
            >
              {pill.label}
              <button
                className="ml-1 rounded-full hover:bg-muted p-0.5"
                onClick={() => handleRemoveFilter(pill.key)}
                aria-label={`Remove ${pill.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {activeFilterPills.length >= 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleClearAllFilters}
            >
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Result Count */}
      <div className="flex items-center">
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''}`
          )}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
              {/* Checkbox - not sortable */}
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>

              {/* Invoice Details - not sortable (composite field) */}
              <TableHead className="w-[22%] text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                Invoice Details
              </TableHead>

              {/* Date - sortable */}
              <SortableTableHead
                sortKey="invoice_date"
                currentSortBy={filters.sortBy}
                currentSortOrder={filters.sortOrder}
                onSort={handleColumnSort}
                className="w-[12%]"
              >
                Inv Date
              </SortableTableHead>

              {/* Amount - sortable */}
              <SortableTableHead
                sortKey="invoice_amount"
                currentSortBy={filters.sortBy}
                currentSortOrder={filters.sortOrder}
                onSort={handleColumnSort}
                className="w-[14%]"
              >
                Inv Amount
              </SortableTableHead>

              {/* Status - sortable */}
              <SortableTableHead
                sortKey="status"
                currentSortBy={filters.sortBy}
                currentSortOrder={filters.sortOrder}
                onSort={handleColumnSort}
                className="w-[16%]"
              >
                Status
              </SortableTableHead>

              {/* Actions - not sortable */}
              <TableHead className="w-[16%] text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                Actions
              </TableHead>

              {/* Remaining - sortable */}
              <SortableTableHead
                sortKey="remaining_balance"
                currentSortBy={filters.sortBy}
                currentSortOrder={filters.sortOrder}
                onSort={handleColumnSort}
                className="w-[14%] pr-6"
              >
                Remaining
              </SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
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
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    {activeFilterCount > 0 ? (
                      <>
                        <p className="text-muted-foreground">No invoices match your filters</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearAllFilters}
                          className="mt-2"
                        >
                          Clear All Filters
                        </Button>
                      </>
                    ) : filters.viewMode === 'pending' ? (
                      <>
                        <p className="text-muted-foreground">No pending invoices</p>
                        <p className="text-xs text-muted-foreground/70">All caught up!</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No invoices found for {titleMonth}</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : groupedInvoices ? (
              // Grouped view (pending mode)
              groupedInvoices.map((group) => (
                <React.Fragment key={group.key}>
                  {/* Month Group Header */}
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={7} className="py-2 pl-4">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.key}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({group.invoices.length} invoice{group.invoices.length !== 1 ? 's' : ''})
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* Invoices in this group */}
                  {group.invoices.map((invoice) => {
                    // Calculate TDS and pending amounts using invoice's tds_rounded preference
                    const tdsAmount = invoice.tds_applicable && invoice.tds_percentage
                      ? calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
                      : 0;
                    const netPayable = invoice.invoice_amount - tdsAmount;
                    const totalPaid = invoice.totalPaid ?? 0;
                    const pendingAmount = Math.max(0, netPayable - totalPaid);

                    // Permission checks for actions
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
                            {!filters.showArchived && (
                              <button className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => handleEditInvoice(invoice.id, invoice.is_recurring)} title="Edit">
                                <Pencil className="h-4 w-4" /><span className="sr-only">Edit</span>
                              </button>
                            )}
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
                            {!filters.showArchived && (
                              <button className="text-muted-foreground hover:text-amber-500 transition-colors" onClick={() => handleArchiveInvoice(invoice.id, invoice.invoice_number)} title="Archive">
                                <Archive className="h-4 w-4" /><span className="sr-only">Archive</span>
                              </button>
                            )}
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
                  })}
                </React.Fragment>
              ))
            ) : (
              // Flat view (monthly mode or archived)
              filteredInvoices.map((invoice) => {
                // Calculate TDS and pending amounts using invoice's tds_rounded preference
                const tdsAmount = invoice.tds_applicable && invoice.tds_percentage
                  ? calculateTdsAmount(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
                  : 0;
                const netPayable = invoice.invoice_amount - tdsAmount;
                const totalPaid = invoice.totalPaid ?? 0;
                const pendingAmount = Math.max(0, netPayable - totalPaid);

                // Permission checks for actions
                const isPendingApproval = invoice.status === INVOICE_STATUS.PENDING_APPROVAL;
                // Record Payment: Any logged-in user can record payments for unpaid/partial invoices
                const canRecordPayment = !isPendingApproval &&
                  invoice.status !== INVOICE_STATUS.PAID &&
                  invoice.status !== INVOICE_STATUS.REJECTED &&
                  invoice.status !== INVOICE_STATUS.ON_HOLD;
                // Approve/Reject: Admin only for pending_approval invoices
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
                    {/* Checkbox */}
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                        aria-label={`Select ${invoice.invoice_number}`}
                      />
                    </TableCell>

                    {/* Invoice Details: Profile/Invoice Name + Invoice Number + Recurring Badge */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">
                          {getInvoiceDetails(invoice)}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {invoice.invoice_number}
                          </span>
                          {invoice.is_recurring && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 border-orange-500/50 text-orange-500"
                            >
                              Recurring
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Invoice Date */}
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(invoice.invoice_date)}
                    </TableCell>

                    {/* Invoice Amount + TDS info */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm">
                          {formatCurrency(invoice.invoice_amount, invoice.currency?.code)}
                        </div>
                        {invoice.tds_applicable && invoice.tds_percentage && tdsAmount > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            TDS {formatCurrency(tdsAmount, invoice.currency?.code)} ({invoice.tds_percentage}%)
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={invoice.status as InvoiceStatus} hasPendingPayment={invoice.has_pending_payment} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {/* Edit - hide when archived */}
                        {!filters.showArchived && (
                          <button
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => handleEditInvoice(invoice.id, invoice.is_recurring)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </button>
                        )}

                        {/* Record Payment - show for unpaid/partial/overdue invoices (any user) */}
                        {canRecordPayment && (
                          <button
                            className="text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => handleRecordPayment(invoice)}
                            title="Record Payment"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span className="sr-only">Record Payment</span>
                          </button>
                        )}

                        {/* Approve - show for pending_approval invoices (admin only) */}
                        {canApproveReject && (
                          <button
                            className="text-muted-foreground hover:text-green-500 transition-colors"
                            onClick={() => handleViewInvoice(invoice.id)}
                            title="Review & Approve"
                          >
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Review & Approve</span>
                          </button>
                        )}

                        {/* Reject - show for pending_approval invoices (admin only) */}
                        {canApproveReject && (
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => handleRejectInvoice(invoice.id, invoice.invoice_number)}
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Reject</span>
                          </button>
                        )}

                        {/* Archive - hide when archived */}
                        {!filters.showArchived && (
                          <button
                            className="text-muted-foreground hover:text-amber-500 transition-colors"
                            onClick={() => handleArchiveInvoice(invoice.id, invoice.invoice_number)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                            <span className="sr-only">Archive</span>
                          </button>
                        )}

                        {/* Delete - super admin only */}
                        {isSuperAdmin && (
                          <button
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                            disabled={isDeleting}
                            title="Permanently Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </button>
                        )}
                      </div>
                    </TableCell>

                    {/* Pending Amount */}
                    <TableCell className="pr-6">
                      <span className={cn(
                        'font-medium text-sm',
                        pendingAmount > 0 ? 'text-amber-500' : 'text-muted-foreground'
                      )}>
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

      {/* BUG-007 FIX: Vendor Pending Approval Dialog - Two-Step */}
      <AlertDialog open={isVendorPendingDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsVendorPendingDialogOpen(false);
          setVendorDialogStep('details');
          setVendorPendingData(null);
        }
      }}>
        <AlertDialogContent className="relative max-w-lg p-8 rounded-2xl">
          {/* Step Indicator Dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={cn(
              'h-3 w-3 rounded-full transition-colors',
              vendorDialogStep === 'details' ? 'bg-foreground' : 'bg-foreground/60'
            )} />
            <div className={cn(
              'h-3 w-3 rounded-full transition-colors',
              vendorDialogStep === 'confirm' ? 'bg-foreground' : 'border-2 border-muted-foreground/40 bg-transparent'
            )} />
          </div>
          {/* Close button */}
          <button
            onClick={() => {
              setIsVendorPendingDialogOpen(false);
              setVendorDialogStep('details');
              setVendorPendingData(null);
            }}
            className="absolute right-5 top-5 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            disabled={isApprovingVendor}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
          {/* Step 1: Vendor Details */}
          {vendorDialogStep === 'details' && (
            <>
              <AlertDialogHeader className="space-y-3 mb-6">
                <AlertDialogTitle className="text-2xl font-bold text-primary">
                  Vendor Pending Approval
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base leading-relaxed">
                  The associated vendor is still waiting for approval and approving
                  will add a new vendor to the list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {vendorPendingData?.vendor && (
                <div className={cn(CONFIRMATION_CARD_STYLES, 'mb-6')}>
                  <p className="font-bold text-lg mb-2">{vendorPendingData.vendor.name}</p>
                  {vendorPendingData.vendor.address && (
                    <p className="text-base text-muted-foreground">
                      Address: {vendorPendingData.vendor.address}
                    </p>
                  )}
                  {vendorPendingData.vendor.bank_details && (
                    <p className="text-base text-muted-foreground">
                      Bank Details: {vendorPendingData.vendor.bank_details}
                    </p>
                  )}
                  <p className="text-base text-muted-foreground">
                    GST Exemption: {vendorPendingData.vendor.gst_exemption ? 'Yes' : 'No'}
                  </p>
                </div>
              )}
              <AlertDialogFooter className="gap-3 mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleEditInvoiceFromDialog}
                  className="px-6 text-base font-medium"
                >
                  Edit Invoice
                </Button>
                <Button
                  size="lg"
                  onClick={handleProceedToConfirm}
                  className="px-6 text-base font-medium"
                >
                  Continue
                </Button>
              </AlertDialogFooter>
            </>
          )}

          {/* Step 2: Confirmation */}
          {vendorDialogStep === 'confirm' && vendorPendingData?.vendor && (
            <>
              <AlertDialogHeader className="space-y-3 mb-6">
                <AlertDialogTitle className="text-2xl font-bold">Confirm Approval</AlertDialogTitle>
                <AlertDialogDescription className="text-base leading-relaxed">
                  You are about to approve both the vendor and the invoice.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3 mb-6">
                <div className={cn(CONFIRMATION_CARD_STYLES, 'flex items-start gap-3 p-4')}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-base">Approve Vendor</p>
                    <p className="text-base text-muted-foreground">
                      &quot;{vendorPendingData.vendor.name}&quot; will be added to your vendor list
                    </p>
                  </div>
                </div>
                <div className={cn(CONFIRMATION_CARD_STYLES, 'flex items-start gap-3 p-4')}>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white text-sm font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-base">Approve Invoice</p>
                    <p className="text-base text-muted-foreground">
                      Invoice {vendorPendingData.invoiceNumber} will be approved and ready for payment
                    </p>
                  </div>
                </div>
              </div>
              <AlertDialogFooter className="gap-3 mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBackToDetails}
                  disabled={isApprovingVendor}
                  className="px-6 text-base font-medium"
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleApproveVendorAndInvoice}
                  disabled={isApprovingVendor}
                  className="px-6 text-base font-medium"
                >
                  {isApprovingVendor ? 'Approving...' : 'Approve Both'}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Invoice Confirmation Dialog */}
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
            <ConfirmationContentRow
              label="Invoice Number"
              value={deleteDialogData.invoiceNumber}
            />
            <ConfirmationContentRow
              label="Reason"
              value={deleteDialogData.reason}
            />
            <div className="mt-3 text-xs text-muted-foreground">
              <p>This will:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Remove the invoice from the database</li>
                <li>Move all files to the Deleted folder</li>
              </ul>
            </div>
          </div>
        )}
      </ConfirmationDialog>

      {/* Deletion Reason Input Dialog */}
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

      {/* Archive Reason Input Dialog */}
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

      {/* Rejection Reason Input Dialog */}
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
    </div>
  );
}

export default AllInvoicesTab;
