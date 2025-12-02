'use client';

/**
 * All Invoices Tab Component (v3)
 *
 * Displays all invoices in a table format with:
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
  Download,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useInvoices, useDeleteInvoice } from '@/hooks/use-invoices';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { type InvoiceStatus, INVOICE_STATUS } from '@/types/invoice';

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

  // Fetch invoices
  const { data, isLoading } = useInvoices({
    page: 1,
    per_page: 100,
    status: statusFilter === 'all' ? undefined : (statusFilter as InvoiceStatus),
  });

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
  const handleNewInvoice = () => {
    if (invoiceCreationMode === 'panel') {
      openPanel('invoice-create-non-recurring', {}, { width: PANEL_WIDTH.LARGE });
    } else {
      router.push('/invoices/new/non-recurring');
    }
  };

  const handleViewInvoice = (id: number) => {
    openPanel('invoice-detail', { invoiceId: id });
  };

  const handleEditInvoice = (id: number, isRecurring: boolean) => {
    const panelType = isRecurring ? 'invoice-edit-recurring-v2' : 'invoice-edit-non-recurring-v2';
    openPanel(panelType, { invoiceId: id }, { width: PANEL_WIDTH.LARGE });
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked');
  };

  const handleDeleteInvoice = (id: number) => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteInvoice.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all invoices..."
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
                <ChevronDown className="h-4 w-4" />
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
        </div>

        <div className="flex gap-3">
          {/* Export */}
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>

          {/* New Invoice */}
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={handleNewInvoice}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-12 p-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Invoice ID
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vendor
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Amount
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
                <th className="p-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="p-4">
                      <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="h-4 w-20 bg-muted rounded animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={cn(
                      'border-b border-border transition-colors hover:bg-muted/30',
                      selectedInvoices.has(invoice.id) && 'bg-muted/50'
                    )}
                  >
                    <td className="p-4">
                      <Checkbox
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                        aria-label={`Select ${invoice.invoice_number}`}
                      />
                    </td>
                    <td className="p-4 font-medium">{invoice.invoice_number}</td>
                    <td className="p-4 text-muted-foreground">
                      {invoice.vendor?.name || '-'}
                    </td>
                    <td className="p-4">{formatCurrency(invoice.invoice_amount)}</td>
                    <td className="p-4">
                      <StatusBadge status={invoice.status as InvoiceStatus} />
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewInvoice(invoice.id)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditInvoice(invoice.id, invoice.is_recurring)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            disabled={deleteInvoice.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AllInvoicesTab;
