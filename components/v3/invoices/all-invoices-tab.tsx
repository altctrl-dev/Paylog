'use client';

/**
 * All Invoices Tab Component (v3)
 *
 * Displays unified entries (Invoices, Credit Notes, Advance Payments) in a table format with:
 * - Entry type filter with count badges
 * - Month navigation with calendar picker (monthly view)
 * - Search bar for quick filtering
 * - Comprehensive filter popover (status, vendor, category, profile, payment type,
 *   entity, invoice type, TDS, archived, date range, sort)
 * - Export button (Excel)
 * - New Invoice button (recurring/non-recurring)
 * - Table with: checkbox, Entry Details, Date, Amount, Status, Actions, Remaining
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
  Link2,
  Eye,
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
import { useInvoiceFormOptions } from '@/hooks/use-invoices';
import { useActivePaymentTypes } from '@/hooks/use-payment-types';
import {
  useUnifiedEntries,
  useApproveCreditNote,
  useRejectCreditNote,
  useApproveAdvancePayment,
  useRejectAdvancePayment,
} from '@/hooks/use-unified-entries';
import type {
  UnifiedEntry,
  UnifiedEntryFilters,
  EntryType,
  InvoiceEntry,
} from '@/types/unified-entry';
import {
  isInvoiceEntry,
  isCreditNoteEntry,
  isAdvancePaymentEntry,
} from '@/types/unified-entry';
import { createInvoiceArchiveRequest, permanentDeleteInvoice, approveInvoice, rejectInvoice, bulkArchiveInvoices } from '@/app/actions/invoices';
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
  PENDING_ACTIONS_STATUS,
  type InvoiceFilterState,
  type FilterOptions,
} from './invoice-filter-popover';
import { InvoiceFilterSheet } from './invoice-filter-sheet';
import { UnifiedFilterPopover } from './unified-filter-popover';
import { SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { INVOICE_STATUS, type InvoiceFilters } from '@/types/invoice';
import { MonthNavigator } from './month-navigator';
import { FloatingActionBar } from './floating-action-bar';
import { calculateTds } from '@/lib/utils/tds';
import { formatCurrency } from '@/lib/utils/format';
import { bulkExportInvoices } from '@/app/actions/bulk-operations';

// ============================================================================
// Entry Type Filter Constants
// ============================================================================

const ENTRY_TYPE_OPTIONS: { value: EntryType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'credit_note', label: 'Credit Notes' },
  { value: 'advance_payment', label: 'Advance Payments' },
];

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
// Entry Type Badge Component
// ============================================================================

interface EntryTypeBadgeProps {
  entryType: EntryType;
}

/**
 * Badge showing entry type with appropriate color coding
 */
function EntryTypeBadge({ entryType }: EntryTypeBadgeProps) {
  const variants: Record<EntryType, string> = {
    invoice: 'bg-muted text-muted-foreground border-border',
    credit_note: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
    advance_payment: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  };

  const labels: Record<EntryType, string> = {
    invoice: 'Invoice',
    credit_note: 'Credit Note',
    advance_payment: 'Advance Payment',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border h-4',
        variants[entryType]
      )}
    >
      {labels[entryType]}
    </span>
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
 * Note: pending_approval and rejected are shared between invoice, credit note, and advance payment
 */
const STATUS_LABELS: Record<string, string> = {
  [INVOICE_STATUS.PAID]: 'Paid',
  [INVOICE_STATUS.PENDING_APPROVAL]: 'Pending Approval',
  [INVOICE_STATUS.OVERDUE]: 'Overdue',
  [INVOICE_STATUS.PARTIAL]: 'Partially Paid',
  [INVOICE_STATUS.UNPAID]: 'Unpaid',
  [INVOICE_STATUS.ON_HOLD]: 'On Hold',
  [INVOICE_STATUS.REJECTED]: 'Rejected',
  // Credit note and advance payment specific status (not in INVOICE_STATUS)
  approved: 'Approved',
};

interface StatusBadgeProps {
  status: string;
  /** When true, shows "Payment Pending" badge (purple) instead of invoice status */
  hasPendingPayment?: boolean;
}

/**
 * Status badge for table rows
 *
 * Color scheme:
 * - Invoice Pending Approval: Amber/Yellow (bg-amber-500/20)
 * - Payment Pending: Purple (bg-purple-500/20)
 * - Paid/Approved: Green
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
    // Credit note and advance payment specific status (not in INVOICE_STATUS)
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
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
 * Get month/year group key for an entry date
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
 * Group entries by month/year
 * @param sortOrder - 'asc' for oldest month first, 'desc' for newest month first (used when sorting by date)
 */
function groupEntriesByMonth(
  entries: UnifiedEntry[],
  currentYear: number,
  sortOrder: 'asc' | 'desc' = 'desc'
): Array<{ key: string; sortKey: number; entries: UnifiedEntry[] }> {
  const groups = new Map<string, { sortKey: number; entries: UnifiedEntry[] }>();

  for (const entry of entries) {
    const groupKey = getMonthGroupKey(entry.date, currentYear);
    const sortKey = getMonthSortKey(entry.date);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, { sortKey, entries: [] });
    }
    groups.get(groupKey)!.entries.push(entry);
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
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set()); // Using composite key: `${entry_type}-${id}`
  const [showInvoiceTypeMenu, setShowInvoiceTypeMenu] = useState(false);

  // Entry type filter state
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryType | 'all'>('all');

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
    entryId: number;
    entryType: EntryType;
    referenceNumber: string;
  } | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Bulk operation dialog states
  const [bulkArchiveDialog, setBulkArchiveDialog] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [isBulkOperationLoading, setIsBulkOperationLoading] = useState(false);

  // Credit note and advance payment mutations
  const approveCreditNoteMutation = useApproveCreditNote();
  const rejectCreditNoteMutation = useRejectCreditNote();
  const approveAdvancePaymentMutation = useApproveAdvancePayment();
  const rejectAdvancePaymentMutation = useRejectAdvancePayment();

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

  // Build filter options for the popover (memoized to prevent re-renders)
  const filterOptions: FilterOptions = useMemo(() => ({
    vendors: formOptions?.vendors ?? [],
    categories: formOptions?.categories ?? [],
    profiles: formOptions?.profiles ?? [],
    entities: formOptions?.entities ?? [],
    paymentTypes: paymentTypes,
  }), [formOptions?.vendors, formOptions?.categories, formOptions?.profiles, formOptions?.entities, paymentTypes]);

  // Build unified entry filters
  const unifiedFilters: UnifiedEntryFilters = useMemo(() => {
    const entryTypes = entryTypeFilter === 'all' ? undefined : [entryTypeFilter];

    // Check if pending actions filter is active
    const isPendingActions = filters.status === PENDING_ACTIONS_STATUS;

    // Map filter status to array for unified entries (only if not pending_actions)
    let statusArray: string[] | undefined;
    if (!isPendingActions && filters.status) {
      statusArray = [filters.status];
    }

    return {
      entry_types: entryTypes,
      status: statusArray,
      pending_actions: isPendingActions, // Use the new pending_actions flag
      vendor_id: filters.vendorId,
      category_id: filters.categoryId,
      entity_id: filters.entityId,
      is_recurring: filters.isRecurring,
      tds_applicable: filters.tdsApplicable,
      show_archived: filters.showArchived,
      date_from: filters.showArchived || filters.viewMode === 'pending'
        ? filters.startDate
        : (filters.startDate ?? start),
      date_to: filters.showArchived || filters.viewMode === 'pending'
        ? filters.endDate
        : (filters.endDate ?? end),
      search: searchQuery || undefined,
      page: 1,
      per_page: 500,
    };
  }, [entryTypeFilter, filters, searchQuery, start, end]);

  // Fetch unified entries
  const { data, isLoading } = useUnifiedEntries(unifiedFilters);
  const entries = data?.entries ?? [];
  const counts = data?.counts ?? { invoice: 0, credit_note: 0, advance_payment: 0 };

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
    if (entryTypeFilter !== 'all') count++;
    return count;
  }, [filters, entryTypeFilter]);

  // Build list of active filter pills for display
  const activeFilterPills = useMemo(() => {
    const pills: Array<{ key: keyof InvoiceFilterState | 'entryType'; label: string }> = [];

    if (entryTypeFilter !== 'all') {
      const label = ENTRY_TYPE_OPTIONS.find(o => o.value === entryTypeFilter)?.label || entryTypeFilter;
      pills.push({ key: 'entryType', label: `Type: ${label}` });
    }
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
  }, [filters, filterOptions, entryTypeFilter]);

  // Remove single filter handler
  const handleRemoveFilter = (key: keyof InvoiceFilterState | 'entryType') => {
    if (key === 'entryType') {
      setEntryTypeFilter('all');
      return;
    }

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
    setEntryTypeFilter('all');
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

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  // Selection handlers using composite keys
  const getEntryKey = (entry: UnifiedEntry) => `${entry.entry_type}-${entry.id}`;

  const toggleSelectAll = () => {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(entries.map(getEntryKey)));
    }
  };

  const toggleSelect = (entry: UnifiedEntry) => {
    const key = getEntryKey(entry);
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedEntries(newSelected);
  };

  const isAllSelected =
    entries.length > 0 && selectedEntries.size === entries.length;

  // Action handlers
  const handleNewInvoice = (type: 'recurring' | 'non-recurring') => {
    setShowInvoiceTypeMenu(false);
    if (invoiceCreationMode === 'panel') {
      const panelTypeMap = {
        'recurring': 'invoice-create-recurring',
        'non-recurring': 'invoice-create-non-recurring',
      };
      openPanel(panelTypeMap[type], {}, { width: PANEL_WIDTH.LARGE });
    } else {
      router.push(`/invoices/new/${type}`);
    }
  };

  // Row click handlers - open appropriate panel based on entry type
  const handleRowClick = (entry: UnifiedEntry) => {
    if (isInvoiceEntry(entry)) {
      openPanel('invoice-v3-detail', { invoiceId: entry.invoice_id }, { width: PANEL_WIDTH.LARGE });
    } else if (isCreditNoteEntry(entry)) {
      // Open invoice detail panel with the parent invoice
      // Credit notes are viewed in context of their parent invoice
      openPanel('invoice-v3-detail', { invoiceId: entry.parent_invoice_id }, { width: PANEL_WIDTH.LARGE });
    } else if (isAdvancePaymentEntry(entry)) {
      // If linked to an invoice, open that invoice; otherwise show a toast
      if (entry.linked_invoice_id) {
        openPanel('invoice-v3-detail', { invoiceId: entry.linked_invoice_id }, { width: PANEL_WIDTH.LARGE });
      } else {
        toast.info('Advance payment is not linked to any invoice yet');
      }
    }
  };

  const handleEditInvoice = (id: number, isRecurring: boolean) => {
    const panelType = isRecurring ? 'invoice-edit-recurring-v2' : 'invoice-edit-non-recurring-v2';
    openPanel(panelType, { invoiceId: id }, { width: PANEL_WIDTH.LARGE });
  };

  const handleExport = () => {
    if (entries.length === 0) {
      alert('No entries to export');
      return;
    }

    // Prepare data for export with entry type information
    const exportData = entries.map((entry) => {
      const baseData = {
        'Entry Type': entry.entry_type === 'invoice' ? 'Invoice' :
          entry.entry_type === 'credit_note' ? 'Credit Note' : 'Advance Payment',
        'Reference Number': entry.reference_number,
        'Name/Description': entry.name,
        'Vendor': entry.vendor_name,
        'Date': formatDate(entry.date),
        'Amount': entry.amount,
        'Status': entry.status,
      };

      if (isInvoiceEntry(entry)) {
        return {
          ...baseData,
          'Type': entry.is_recurring ? 'Recurring' : 'One-time',
          'TDS %': entry.tds_percentage || 0,
          'Entity': entry.entity_name || '',
          'Category': entry.category_name || '',
        };
      }

      if (isCreditNoteEntry(entry)) {
        return {
          ...baseData,
          'Parent Invoice': entry.parent_invoice_number,
          'TDS Amount': entry.tds_amount || 0,
          'Reason': entry.reason,
        };
      }

      if (isAdvancePaymentEntry(entry)) {
        return {
          ...baseData,
          'Payment Type': entry.payment_type_name,
          'Payment Reference': entry.payment_reference || '',
          'Linked Invoice': entry.linked_invoice_number || 'Not Linked',
        };
      }

      return baseData;
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entries');

    // Generate filename with month/year
    const filename = `unified_entries_${monthNames[selectedMonth]}_${selectedYear}.xlsx`;

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
  const handleRecordPayment = (entry: InvoiceEntry) => {
    // Calculate remaining balance accounting for TDS
    const tdsAmount = entry.tds_applicable && entry.tds_percentage
      ? calculateTdsAmount(entry.amount, entry.tds_percentage, false)
      : 0;
    const netPayable = entry.amount - tdsAmount;

    openPanel('payment-record', {
      invoiceId: entry.invoice_id,
      invoiceNumber: entry.reference_number,
      invoiceName: entry.name,
      invoiceStatus: entry.status,
      invoiceAmount: entry.amount,
      remainingBalance: netPayable, // TODO: Should calculate actual remaining from payments
      tdsApplicable: entry.tds_applicable,
      tdsPercentage: entry.tds_percentage,
      tdsRounded: false,
      vendorName: entry.vendor_name,
      currencyCode: entry.currency_code,
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

    // Get invoice details to determine if recurring - find the invoice entry
    const invoiceEntry = entries.find(e => isInvoiceEntry(e) && e.invoice_id === vendorPendingData.invoiceId) as InvoiceEntry | undefined;
    const isRecurring = invoiceEntry?.is_recurring ?? false;

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

  // Approve entry handler (for all entry types)
  const handleApproveEntry = async (entry: UnifiedEntry) => {
    if (isInvoiceEntry(entry)) {
      try {
        const result = await approveInvoice(entry.invoice_id);
        if (result.success) {
          toast.success(`Invoice ${entry.reference_number} approved`);
        } else {
          toast.error(result.error || 'Failed to approve invoice');
        }
      } catch (error) {
        console.error('Approve invoice error:', error);
        toast.error('An unexpected error occurred');
      }
    } else if (isCreditNoteEntry(entry)) {
      approveCreditNoteMutation.mutate(entry.credit_note_id);
    } else if (isAdvancePaymentEntry(entry)) {
      approveAdvancePaymentMutation.mutate(entry.advance_payment_id);
    }
  };

  // Reject entry handler - opens reason dialog
  const handleRejectEntry = (entry: UnifiedEntry) => {
    setRejectReasonDialog({
      entryId: entry.id,
      entryType: entry.entry_type,
      referenceNumber: entry.reference_number,
    });
  };

  const handleRejectReasonConfirm = async (reason: string) => {
    if (!rejectReasonDialog) return;

    const { entryId, entryType, referenceNumber } = rejectReasonDialog;
    setIsRejecting(true);

    try {
      if (entryType === 'invoice') {
        const result = await rejectInvoice(entryId, reason);
        if (result.success) {
          toast.success(`Invoice ${referenceNumber} rejected`);
        } else {
          toast.error(result.error || 'Failed to reject invoice');
        }
      } else if (entryType === 'credit_note') {
        rejectCreditNoteMutation.mutate({ id: entryId, reason });
      } else if (entryType === 'advance_payment') {
        rejectAdvancePaymentMutation.mutate({ id: entryId, reason });
      }
      setRejectReasonDialog(null);
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsRejecting(false);
    }
  };

  // ============================================================================
  // Bulk Operation Handlers
  // ============================================================================

  /**
   * Handle bulk export - exports selected entries to CSV
   */
  const handleBulkExport = async () => {
    if (selectedEntries.size === 0) return;

    // For now, only support bulk export of invoices
    const invoiceIds = Array.from(selectedEntries)
      .filter(key => key.startsWith('invoice-'))
      .map(key => parseInt(key.split('-')[1]));

    if (invoiceIds.length === 0) {
      toast.info('Bulk export is currently only supported for invoices');
      return;
    }

    setIsBulkOperationLoading(true);
    try {
      // Default columns for export
      const defaultColumns = [
        'invoice_number',
        'vendor_name',
        'invoice_amount',
        'invoice_date',
        'due_date',
        'status',
        'total_paid',
        'remaining_balance',
      ];

      const result = await bulkExportInvoices(invoiceIds, defaultColumns);

      if (!result.success) {
        toast.error(result.error || 'Failed to export invoices');
        return;
      }

      if (result.data?.csvContent) {
        // Create and download CSV file
        const blob = new Blob([result.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${invoiceIds.length} invoice(s)`);
        setSelectedEntries(new Set());
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

  /**
   * Handle bulk archive - opens archive dialog
   */
  const handleBulkArchive = () => {
    if (selectedEntries.size === 0) return;
    setBulkArchiveDialog(true);
  };

  /**
   * Handle bulk archive confirmation with reason
   */
  const handleBulkArchiveConfirm = async (reason: string) => {
    // Only support bulk archive for invoices
    const invoiceIds = Array.from(selectedEntries)
      .filter(key => key.startsWith('invoice-'))
      .map(key => parseInt(key.split('-')[1]));

    if (invoiceIds.length === 0) {
      toast.info('Bulk archive is currently only supported for invoices');
      setBulkArchiveDialog(false);
      return;
    }

    setIsBulkOperationLoading(true);
    try {
      const result = await bulkArchiveInvoices(invoiceIds, reason);

      if (!result.success) {
        toast.error(result.error || 'Failed to archive invoices');
        return;
      }

      // Check result type: archivedCount means direct archive, requestId means pending approval
      if (result.data.archivedCount !== undefined) {
        toast.success(`${result.data.archivedCount} invoice(s) archived successfully`);
      } else if (result.data.requestId !== undefined) {
        toast.success(`Archive request submitted for ${invoiceIds.length} invoice(s). Pending admin approval.`);
      }

      setBulkArchiveDialog(false);
      setSelectedEntries(new Set());
    } catch (error) {
      console.error('Bulk archive error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsBulkOperationLoading(false);
    }
  };

  /**
   * Handle bulk delete - opens delete dialog (super admin only)
   */
  const handleBulkDelete = () => {
    if (selectedEntries.size === 0 || !isSuperAdmin) return;
    setBulkDeleteDialog(true);
  };

  /**
   * Handle bulk delete confirmation with reason
   */
  const handleBulkDeleteConfirm = async (reason: string) => {
    // Only support bulk delete for invoices
    const invoiceIds = Array.from(selectedEntries)
      .filter(key => key.startsWith('invoice-'))
      .map(key => parseInt(key.split('-')[1]));

    if (invoiceIds.length === 0 || !isSuperAdmin) {
      toast.info('Bulk delete is currently only supported for invoices');
      setBulkDeleteDialog(false);
      return;
    }

    setIsBulkOperationLoading(true);
    try {
      // For now, delete invoices one by one using existing soft delete
      let successCount = 0;
      let failCount = 0;

      for (const invoiceId of invoiceIds) {
        const result = await permanentDeleteInvoice(invoiceId, reason);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} invoice(s) moved to deleted`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} invoice(s)`);
      }

      setBulkDeleteDialog(false);
      setSelectedEntries(new Set());
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsBulkOperationLoading(false);
    }
  };

  /**
   * Get entry details text for display
   */
  function getEntryDetails(entry: UnifiedEntry): { primary: string; secondary: string } {
    if (isInvoiceEntry(entry)) {
      return {
        primary: entry.name,
        secondary: entry.reference_number,
      };
    }
    if (isCreditNoteEntry(entry)) {
      return {
        primary: `Against: ${entry.parent_invoice_number}`,
        secondary: entry.reference_number,
      };
    }
    // isAdvancePaymentEntry - last case
    return {
      primary: entry.description,
      secondary: entry.reference_number,
    };
  }

  // Format month name for title
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const titleMonth = `${monthNames[selectedMonth]} ${selectedYear}`;

  // Group entries by month when in pending view mode
  // Pass sort order so month groups are also sorted correctly when sorting by date
  const currentYear = now.getFullYear();
  const groupSortOrder = filters.sortBy === 'invoice_date' ? filters.sortOrder : 'desc';
  const groupedEntries = filters.viewMode === 'pending' && !filters.showArchived
    ? groupEntriesByMonth(entries, currentYear, groupSortOrder)
    : null;

  // Get title based on view mode
  const getTitle = () => {
    if (filters.showArchived) return 'Archived Entries';
    if (filters.viewMode === 'pending') return 'Entries Overview';
    return `All Entries - ${titleMonth}`;
  };

  // Helper to get amount color class
  const getAmountColorClass = (entry: UnifiedEntry): string => {
    if (isCreditNoteEntry(entry)) return 'text-cyan-500';
    if (isAdvancePaymentEntry(entry)) return 'text-purple-500';
    return '';
  };

  // Helper to get link icon color class
  const getLinkIconColorClass = (entry: UnifiedEntry): string => {
    if (isCreditNoteEntry(entry)) return 'text-cyan-500';
    if (isAdvancePaymentEntry(entry)) return 'text-purple-500';
    return 'text-cyan-500';
  };

  // Check if entry has links to show
  const hasLinks = (entry: UnifiedEntry): boolean => {
    if (isInvoiceEntry(entry)) return entry.linked_credit_note_count > 0;
    if (isCreditNoteEntry(entry)) return !!entry.parent_invoice_id;
    if (isAdvancePaymentEntry(entry)) return !!entry.linked_invoice_id;
    return false;
  };

  // Render a single entry row
  const renderEntryRow = (entry: UnifiedEntry) => {
    const entryKey = getEntryKey(entry);
    const details = getEntryDetails(entry);
    const isPendingApproval = entry.status === 'pending_approval';
    const canApproveReject = isAdmin && isPendingApproval;

    // Invoice-specific permissions
    const isInvoice = isInvoiceEntry(entry);
    const canRecordPayment = isInvoice &&
      !isPendingApproval &&
      entry.status !== 'paid' &&
      entry.status !== 'rejected' &&
      entry.status !== 'on_hold';

    return (
      <TableRow
        key={entryKey}
        data-state={selectedEntries.has(entryKey) ? 'selected' : undefined}
        className="border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => handleRowClick(entry)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick(entry);
          }
        }}
      >
        {/* Checkbox */}
        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedEntries.has(entryKey)}
            onCheckedChange={() => toggleSelect(entry)}
            aria-label={`Select ${entry.reference_number}`}
          />
        </TableCell>

        {/* Entry Details: Name + Reference Number + Type Badge */}
        <TableCell>
          <div className="space-y-0.5">
            <div className="font-medium text-sm">{details.primary}</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{details.secondary}</span>
              {isInvoiceEntry(entry) && entry.is_recurring && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-orange-500/50 text-orange-500"
                >
                  Recurring
                </Badge>
              )}
              {!isInvoiceEntry(entry) && (
                <EntryTypeBadge entryType={entry.entry_type} />
              )}
              {hasLinks(entry) && (
                <Link2 className={cn('h-3.5 w-3.5', getLinkIconColorClass(entry))} />
              )}
            </div>
          </div>
        </TableCell>

        {/* Date */}
        <TableCell className="text-muted-foreground text-sm">
          {formatDate(entry.date)}
        </TableCell>

        {/* Amount */}
        <TableCell>
          <div className="space-y-0.5">
            <div className={cn('font-medium text-sm', getAmountColorClass(entry))}>
              {formatCurrency(entry.amount, isInvoiceEntry(entry) ? entry.currency_code : 'INR')}
            </div>
            {isInvoiceEntry(entry) && entry.tds_applicable && entry.tds_percentage && (
              <div className="text-[10px] text-muted-foreground">
                TDS {entry.tds_percentage}%
              </div>
            )}
            {isCreditNoteEntry(entry) && entry.tds_amount && entry.tds_amount > 0 && (
              <div className="text-[10px] text-muted-foreground">
                TDS reversal {formatCurrency(entry.tds_amount, entry.currency_code)}
              </div>
            )}
          </div>
        </TableCell>

        {/* Status */}
        <TableCell>
          <StatusBadge status={entry.status} />
        </TableCell>

        {/* Actions */}
        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {/* View - for all types */}
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => handleRowClick(entry)}
              title="View"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">View</span>
            </button>

            {/* Edit - invoices only, hide when archived */}
            {isInvoice && !filters.showArchived && (
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleEditInvoice(entry.invoice_id, (entry as InvoiceEntry).is_recurring)}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </button>
            )}

            {/* Record Payment - invoices only */}
            {canRecordPayment && (
              <button
                className="text-muted-foreground hover:text-primary transition-colors"
                onClick={() => handleRecordPayment(entry as InvoiceEntry)}
                title="Record Payment"
              >
                <CreditCard className="h-4 w-4" />
                <span className="sr-only">Record Payment</span>
              </button>
            )}

            {/* Approve - admin only for pending entries */}
            {canApproveReject && (
              <button
                className="text-muted-foreground hover:text-green-500 transition-colors"
                onClick={() => handleApproveEntry(entry)}
                title="Approve"
                disabled={
                  approveCreditNoteMutation.isPending ||
                  approveAdvancePaymentMutation.isPending
                }
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Approve</span>
              </button>
            )}

            {/* Reject - admin only for pending entries */}
            {canApproveReject && (
              <button
                className="text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => handleRejectEntry(entry)}
                title="Reject"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Reject</span>
              </button>
            )}

            {/* Archive - invoices only, hide when archived */}
            {isInvoice && !filters.showArchived && (
              <button
                className="text-muted-foreground hover:text-amber-500 transition-colors"
                onClick={() => handleArchiveInvoice(entry.invoice_id, entry.reference_number)}
                title="Archive"
              >
                <Archive className="h-4 w-4" />
                <span className="sr-only">Archive</span>
              </button>
            )}

            {/* Delete - invoices only, super admin only */}
            {isInvoice && isSuperAdmin && (
              <button
                className="text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => handleDeleteInvoice(entry.invoice_id, entry.reference_number)}
                disabled={isDeleting}
                title="Permanently Delete"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </button>
            )}
          </div>
        </TableCell>

        {/* Remaining - only meaningful for invoices */}
        <TableCell className="pr-6">
          {isInvoiceEntry(entry) ? (
            <span className="text-muted-foreground text-sm">
              -
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </TableCell>
      </TableRow>
    );
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
        {/* Search */}
        <div className="relative flex-1 min-w-[120px] max-w-[220px] sm:max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-w-0 pl-9 bg-background"
          />
        </div>

        {/* Entry Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0"
            >
              <span className="hidden sm:inline">
                {ENTRY_TYPE_OPTIONS.find(o => o.value === entryTypeFilter)?.label || 'All'}
              </span>
              <span className="sm:hidden">Type</span>
              {entryTypeFilter === 'all' && (
                <span className="text-xs text-muted-foreground">
                  ({counts.invoice + counts.credit_note + counts.advance_payment})
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {ENTRY_TYPE_OPTIONS.map((option) => {
              const count = option.value === 'all'
                ? counts.invoice + counts.credit_note + counts.advance_payment
                : counts[option.value];

              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setEntryTypeFilter(option.value)}
                  className="flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

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
          <UnifiedFilterPopover
            filters={filters}
            onFiltersChange={setFilters}
            entryTypeFilter={entryTypeFilter}
            onEntryTypeFilterChange={setEntryTypeFilter}
            options={filterOptions}
            isLoading={isLoadingOptions}
            activeFilterCount={activeFilterCount}
            counts={counts}
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

        {/* Spacer to push buttons to the right */}
        <div className="hidden sm:flex sm:flex-1" />

        {/* Export Button - icon only on mobile */}
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'default'}
          className={cn(isMobile ? 'shrink-0' : 'gap-2')}
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          {!isMobile && <span>Export</span>}
        </Button>

        {/* New Invoice Button - icon only on mobile */}
        <DropdownMenu open={showInvoiceTypeMenu} onOpenChange={setShowInvoiceTypeMenu}>
          <DropdownMenuTrigger asChild>
            <Button size="default" className={cn(isMobile ? 'px-3 shrink-0' : 'gap-2')}>
              {isMobile ? (
                <span className="font-semibold">+ New</span>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>New Invoice</span>
                </>
              )}
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
            `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`
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

              {/* Entry Details - not sortable (composite field) */}
              <TableHead className="w-[22%] text-xs font-medium text-muted-foreground uppercase tracking-wider text-left">
                Entry Details
              </TableHead>

              {/* Date - sortable */}
              <SortableTableHead
                sortKey="invoice_date"
                currentSortBy={filters.sortBy}
                currentSortOrder={filters.sortOrder}
                onSort={handleColumnSort}
                className="w-[12%]"
              >
                Date
              </SortableTableHead>

              {/* Amount - sortable */}
              <SortableTableHead
                sortKey="invoice_amount"
                currentSortBy={filters.sortBy}
                currentSortOrder={filters.sortOrder}
                onSort={handleColumnSort}
                className="w-[14%]"
              >
                Amount
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
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    {activeFilterCount > 0 ? (
                      <>
                        <p className="text-muted-foreground">No entries match your filters</p>
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
                        <p className="text-muted-foreground">No pending entries</p>
                        <p className="text-xs text-muted-foreground/70">All caught up!</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No entries found for {titleMonth}</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : groupedEntries ? (
              // Grouped view (pending mode)
              groupedEntries.map((group) => (
                <React.Fragment key={group.key}>
                  {/* Month Group Header */}
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={7} className="py-2 pl-4">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.key}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({group.entries.length} entr{group.entries.length !== 1 ? 'ies' : 'y'})
                      </span>
                    </TableCell>
                  </TableRow>
                  {/* Entries in this group */}
                  {group.entries.map(renderEntryRow)}
                </React.Fragment>
              ))
            ) : (
              // Flat view (monthly mode or archived)
              entries.map(renderEntryRow)
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
            className="absolute right-5 top-5 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 focus-visible:border-primary disabled:pointer-events-none"
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
        title={`Reject ${rejectReasonDialog?.entryType === 'invoice' ? 'Invoice' :
          rejectReasonDialog?.entryType === 'credit_note' ? 'Credit Note' : 'Advance Payment'}`}
        description={`Enter a reason for rejecting ${rejectReasonDialog?.referenceNumber || ''}.`}
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

      {/* Bulk Archive Reason Input Dialog */}
      <InputDialog
        open={bulkArchiveDialog}
        onOpenChange={(open) => !open && setBulkArchiveDialog(false)}
        title="Archive Selected Entries"
        description={`Enter a reason for archiving ${selectedEntries.size} entr${selectedEntries.size !== 1 ? 'ies' : 'y'}.`}
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

      {/* Bulk Delete Reason Input Dialog (Super Admin Only) */}
      <InputDialog
        open={bulkDeleteDialog}
        onOpenChange={(open) => !open && setBulkDeleteDialog(false)}
        title="Delete Selected Entries"
        description={`Enter a reason for deleting ${selectedEntries.size} entr${selectedEntries.size !== 1 ? 'ies' : 'y'}. They will be recoverable for 30 days.`}
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

      {/* Floating Action Bar for Bulk Operations */}
      <FloatingActionBar
        selectedCount={selectedEntries.size}
        selectedInvoices={new Set(
          Array.from(selectedEntries)
            .filter(key => key.startsWith('invoice-'))
            .map(key => parseInt(key.split('-')[1]))
        )}
        userRole={userRole as string}
        onExport={handleBulkExport}
        onArchive={handleBulkArchive}
        onDelete={isSuperAdmin ? handleBulkDelete : undefined}
        onClearSelection={() => setSelectedEntries(new Set())}
        isLoading={isBulkOperationLoading}
      />
    </div>
  );
}

export default AllInvoicesTab;
