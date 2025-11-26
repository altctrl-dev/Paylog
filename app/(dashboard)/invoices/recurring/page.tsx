/**
 * Recurring Invoices Page
 *
 * Shows only recurring invoices with invoice profile filter.
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { usePanel } from '@/hooks/use-panel';
import { useInvoices, useInvoiceFormOptions } from '@/hooks/use-invoices';
import { InvoiceListTable } from '@/components/invoices/invoice-list-table';
import { BulkActionBar } from '@/components/bulk-operations/bulk-action-bar';
import type { InvoiceWithRelations } from '@/types/invoice';
import { useSession } from 'next-auth/react';
import { PANEL_WIDTH } from '@/types/panel';
import { useUIVersion } from '@/lib/stores/ui-version-store';
import { RefreshCw, Plus } from 'lucide-react';

export default function RecurringInvoicesPage() {
  const router = useRouter();
  const { openPanel } = usePanel();
  const { data: session } = useSession();
  const { invoiceCreationMode } = useUIVersion();

  // Fetch form options for filter dropdowns (invoice profiles)
  const { data: formOptions } = useInvoiceFormOptions();

  // Local filter state
  const [page, setPage] = React.useState(1);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>('');

  // Bulk operations state
  const [selectedInvoiceIds, setSelectedInvoiceIds] = React.useState<number[]>([]);

  // Fetch recurring invoices with filters
  const { data, isLoading, error } = useInvoices({
    is_recurring: true,
    invoice_profile_id: selectedProfileId ? parseInt(selectedProfileId, 10) : undefined,
    page,
    per_page: 20,
    sort_order: 'desc',
  });

  const handleNewRecurringInvoice = () => {
    if (invoiceCreationMode === 'panel') {
      openPanel('invoice-create-recurring', {}, { width: PANEL_WIDTH.LARGE });
    } else {
      router.push('/invoices/new/recurring');
    }
  };

  const handleRowClick = (invoice: InvoiceWithRelations) => {
    openPanel('invoice-v2-detail', { invoiceId: invoice.id }, { width: PANEL_WIDTH.LARGE });
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (data?.pagination.total_pages) {
      setPage((prev) => Math.min(data.pagination.total_pages, prev + 1));
    }
  };

  const handleProfileFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProfileId(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  // Get invoice profiles from form options
  const invoiceProfiles = formOptions?.profiles || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recurring Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your recurring invoice subscriptions
          </p>
        </div>
        <Button onClick={handleNewRecurringInvoice}>
          <Plus className="mr-2 h-4 w-4" />
          New Recurring Invoice
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Invoice Profile:</span>
            <Select
              value={selectedProfileId}
              onChange={handleProfileFilterChange}
              className="w-[250px]"
            >
              <option value="">All Profiles</option>
              {invoiceProfiles.map((profile: { id: number; name: string }) => (
                <option key={profile.id} value={profile.id.toString()}>
                  {profile.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground">
            {data?.pagination.total ?? 0} recurring invoice{(data?.pagination.total ?? 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

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
              <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No recurring invoices</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedProfileId
                  ? 'No recurring invoices found for the selected profile.'
                  : 'Create your first recurring invoice to get started.'}
              </p>
              <Button onClick={handleNewRecurringInvoice} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Recurring Invoice
              </Button>
            </Card>
          ) : (
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
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {data.pagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={handleNextPage}
                    disabled={page === data.pagination.total_pages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!error && isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading recurring invoices...</p>
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
