/**
 * Invoices Page
 *
 * Main invoice list view with search, filters, and panel integration.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePanel } from '@/hooks/use-panel';
import { useInvoices, useInvoiceFormOptions } from '@/hooks/use-invoices';
import { InvoiceListTable } from '@/components/invoices/invoice-list-table';
import { BulkActionBar } from '@/components/bulk-operations/bulk-action-bar';
import { FilterBar } from '@/components/invoices/filters/filter-bar';
import { useUrlFilters } from '@/hooks/use-url-filters';
import type { InvoiceWithRelations } from '@/types/invoice';
import { useSession } from 'next-auth/react';
import { PANEL_WIDTH } from '@/types/panel';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { ChevronDown, RefreshCw, FileText } from 'lucide-react';

export default function InvoicesPage() {
  const router = useRouter();
  const { openPanel } = usePanel();
  const { data: session } = useSession();
  const { invoiceCreationMode } = useUIVersion();

  // Fetch form options for filter dropdowns
  const { data: formOptions } = useInvoiceFormOptions();

  // URL-synced filter state
  const { filters, setFilter, clearFilters } = useUrlFilters({
    defaultFilters: { page: 1, per_page: 20, sort_order: 'desc' as const },
  });

  // Bulk operations state
  const [selectedInvoiceIds, setSelectedInvoiceIds] = React.useState<number[]>([]);

  // Fetch invoices with filters
  const { data, isLoading, error } = useInvoices(filters);

  const handleNewRecurringInvoice = () => {
    if (invoiceCreationMode === 'panel') {
      openPanel('invoice-create-recurring', {}, { width: PANEL_WIDTH.LARGE });
    } else {
      router.push('/invoices/new/recurring');
    }
  };

  const handleNewNonRecurringInvoice = () => {
    if (invoiceCreationMode === 'panel') {
      openPanel('invoice-create-non-recurring', {}, { width: PANEL_WIDTH.LARGE });
    } else {
      router.push('/invoices/new/non-recurring');
    }
  };

  const handleRowClick = (invoice: InvoiceWithRelations) => {
    console.log('[InvoicesPage] Invoice clicked:', invoice.id, invoice.invoice_number);

    // Detect V2 invoices: Check for V2-specific fields
    // V2 invoices have currency_id, entity_id, or payment_type_id populated
    // V1 invoices don't have these fields (they're null)
    const invoiceAny = invoice as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const isV2Invoice =
      invoiceAny.currency_id !== null ||
      invoiceAny.entity_id !== null ||
      invoiceAny.payment_type_id !== null ||
      invoiceAny.is_recurring === true;

    console.log('[InvoicesPage] Invoice type:', isV2Invoice ? 'V2' : 'V1');

    if (isV2Invoice) {
      // Open V2 detail panel (wider for more content)
      console.log('[InvoicesPage] Opening invoice-v2-detail panel for invoice:', invoice.id);
      openPanel('invoice-v2-detail', { invoiceId: invoice.id }, { width: PANEL_WIDTH.LARGE });
    } else {
      // Open V1 detail panel (legacy)
      console.log('[InvoicesPage] Opening invoice-detail panel for invoice:', invoice.id);
      openPanel('invoice-detail', { invoiceId: invoice.id }, { width: PANEL_WIDTH.SMALL });
    }
  };

  const handlePreviousPage = () => {
    setFilter('page', Math.max(1, (filters.page || 1) - 1));
  };

  const handleNextPage = () => {
    if (data?.pagination.total_pages) {
      setFilter('page', Math.min(data.pagination.total_pages, (filters.page || 1) + 1));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your invoices and payments
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              Add Invoice
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleNewRecurringInvoice}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recurring Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNewNonRecurringInvoice}>
              <FileText className="mr-2 h-4 w-4" />
              One-time Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters - New Compact Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        formOptions={{
          vendors: formOptions?.vendors || [],
          categories: formOptions?.categories || [],
        }}
        totalCount={data?.pagination.total ?? 0}
      />

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
          <InvoiceListTable
            invoices={data.invoices}
            onRowClick={handleRowClick}
            selectedInvoiceIds={selectedInvoiceIds}
            onSelectionChange={setSelectedInvoiceIds}
          />

          {/* Pagination */}
          {data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePreviousPage}
                disabled={(filters.page || 1) === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {filters.page || 1} of {data.pagination.total_pages}
              </span>
              <Button
                variant="outline"
                onClick={handleNextPage}
                disabled={(filters.page || 1) === data.pagination.total_pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {!error && isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading invoices...</p>
        </Card>
      )}

      {/* Bulk Action Bar (floating) */}
      <BulkActionBar
        selectedInvoiceIds={selectedInvoiceIds}
        onClearSelection={() => setSelectedInvoiceIds([])}
        currentUserRole={session?.user?.role || 'standard_user'}
      />
    </div>
  );
}
