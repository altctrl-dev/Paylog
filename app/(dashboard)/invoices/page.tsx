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
import { useInvoices, useInvoiceFormOptions } from '@/hooks/use-invoices';
import { InvoiceListTable } from '@/components/invoices/invoice-list-table';
import { INVOICE_STATUS } from '@/types/invoice';
import type { InvoiceWithRelations, InvoiceStatus } from '@/types/invoice';

export default function InvoicesPage() {
  const { openPanel } = usePanel();

  // Fetch form options for filter dropdowns
  const { data: formOptions } = useInvoiceFormOptions();

  // Filter state
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<InvoiceStatus | ''>('');
  const [vendorFilter, setVendorFilter] = React.useState<number | ''>('');
  const [categoryFilter, setCategoryFilter] = React.useState<number | ''>('');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [page, setPage] = React.useState(1);

  // Sort state
  const [sortBy, setSortBy] = React.useState<
    'invoice_date' | 'due_date' | 'invoice_amount' | 'status' | 'created_at' | ''
  >('');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

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
    vendor_id: vendorFilter || undefined,
    category_id: categoryFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    sort_by: sortBy || undefined,
    sort_order: sortOrder,
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

  const handleVendorFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setVendorFilter(value === '' ? '' : parseInt(value, 10));
    setPage(1); // Reset to page 1 on filter change
  };

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategoryFilter(value === '' ? '' : parseInt(value, 10));
    setPage(1); // Reset to page 1 on filter change
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartDate(value ? new Date(value) : null);
    setPage(1);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndDate(value ? new Date(value) : null);
    setPage(1);
  };

  const handleMonthPreset = (monthOffset: number) => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    setStartDate(firstDay);
    setEndDate(lastDay);
    setPage(1);
  };

  const handleYearPreset = (yearOffset: number) => {
    const now = new Date();
    const targetYear = now.getFullYear() + yearOffset;
    const firstDay = new Date(targetYear, 0, 1);
    const lastDay = new Date(targetYear, 11, 31);
    setStartDate(firstDay);
    setEndDate(lastDay);
    setPage(1);
  };

  const handleClearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    setPage(1);
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as any);
    setPage(1);
  };

  const handleSortOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as 'asc' | 'desc');
    setPage(1);
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
        <div className="space-y-4">
          {/* Date Range Presets */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center">
              Quick Filters:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthPreset(0)}
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMonthPreset(-1)}
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleYearPreset(0)}
            >
              This Year
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleYearPreset(-1)}
            >
              Last Year
            </Button>
            {(startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearDateFilter}
              >
                Clear Dates
              </Button>
            )}
          </div>

          {/* Filter Inputs */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
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

          {/* Vendor Filter */}
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Select
              id="vendor"
              value={vendorFilter}
              onChange={handleVendorFilterChange}
            >
              <option value="">All Vendors</option>
              {formOptions?.vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={categoryFilter}
              onChange={handleCategoryFilterChange}
            >
              <option value="">All Categories</option>
              {formOptions?.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={handleStartDateChange}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={handleEndDateChange}
            />
          </div>
        </div>

          {/* Sorting Section */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort-by">Sort By</Label>
              <Select
                id="sort-by"
                value={sortBy}
                onChange={handleSortByChange}
              >
                <option value="">Priority (Default)</option>
                <option value="invoice_date">Invoice Date</option>
                <option value="due_date">Due Date</option>
                <option value="invoice_amount">Amount</option>
                <option value="status">Status</option>
                <option value="created_at">Created Date</option>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="sort-order">Sort Order</Label>
              <Select
                id="sort-order"
                value={sortOrder}
                onChange={handleSortOrderChange}
              >
                <option value="desc">Descending (High to Low)</option>
                <option value="asc">Ascending (Low to High)</option>
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
