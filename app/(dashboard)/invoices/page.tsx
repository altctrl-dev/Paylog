/**
 * Invoices Page
 *
 * Main invoice list view with search, filters, and panel integration.
 */

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { usePanel } from '@/hooks/use-panel';
import { useInvoices } from '@/hooks/use-invoices';
import { InvoiceListTable } from '@/components/invoices/invoice-list-table';
import { INVOICE_STATUS } from '@/types/invoice';
import type { InvoiceWithRelations, InvoiceStatus } from '@/types/invoice';

export default function InvoicesPage() {
  const { openPanel } = usePanel();

  // Filter state
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus | ''>('');
  const [page, setPage] = React.useState(1);

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch invoices with filters
  const filters = {
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
    page,
    per_page: 20,
  };

  const { data, isLoading, error } = useInvoices(filters);

  const handleNewInvoice = () => {
    openPanel('invoice-create', {}, { width: 700 });
  };

  const handleRowClick = (invoice: InvoiceWithRelations) => {
    openPanel('invoice-detail', { invoiceId: invoice.id }, { width: 350 });
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as InvoiceStatus | '');
    setPage(1); // Reset to page 1 on filter change
  };

  const handlePreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (data?.pagination.total_pages) {
      setPage((prev) => Math.min(data.pagination.total_pages, prev + 1));
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
        <Button onClick={handleNewInvoice}>Add Invoice</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              type="text"
              placeholder="Search by invoice # or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="">All Statuses</option>
              <option value={INVOICE_STATUS.PENDING_APPROVAL}>
                Pending Approval
              </option>
              <option value={INVOICE_STATUS.ON_HOLD}>On Hold</option>
              <option value={INVOICE_STATUS.UNPAID}>Unpaid</option>
              <option value={INVOICE_STATUS.PARTIAL}>Partially Paid</option>
              <option value={INVOICE_STATUS.PAID}>Paid</option>
              <option value={INVOICE_STATUS.OVERDUE}>Overdue</option>
            </Select>
          </div>

          {/* Result Count */}
          <div className="flex items-end">
            <div className="text-sm text-muted-foreground">
              {data && (
                <span>
                  Showing {data.invoices.length} of {data.pagination.total}{' '}
                  invoices
                </span>
              )}
              {isLoading && <span>Loading...</span>}
            </div>
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
          <InvoiceListTable
            invoices={data.invoices}
            onRowClick={handleRowClick}
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

      {!error && isLoading && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Loading invoices...</p>
        </Card>
      )}
    </div>
  );
}
