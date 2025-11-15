/**
 * Invoice List Table Component
 *
 * Data table displaying invoices with sorting and row click handlers.
 */

'use client';

import * as React from 'react';
import { InvoiceStatusBadge } from './invoice-status-badge';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { INVOICE_STATUS, type InvoiceWithRelations } from '@/types/invoice';

interface InvoiceListTableProps {
  invoices: InvoiceWithRelations[];
  onRowClick: (invoice: InvoiceWithRelations) => void;
  selectedInvoiceIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function InvoiceListTable({
  invoices,
  onRowClick,
  selectedInvoiceIds = [],
  onSelectionChange,
}: InvoiceListTableProps) {
  const showCheckboxes = !!onSelectionChange;

  // Handle "Select All" checkbox
  const allSelected =
    invoices.length > 0 &&
    invoices.every((inv) => selectedInvoiceIds.includes(inv.id));
  const someSelected =
    selectedInvoiceIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (allSelected) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all on current page
      onSelectionChange(invoices.map((inv) => inv.id));
    }
  };

  const handleToggleInvoice = (invoiceId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    if (!onSelectionChange) return;

    if (selectedInvoiceIds.includes(invoiceId)) {
      onSelectionChange(selectedInvoiceIds.filter((id) => id !== invoiceId));
    } else {
      onSelectionChange([...selectedInvoiceIds, invoiceId]);
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No invoices found. Try adjusting your search filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-muted/50">
            {showCheckboxes && (
              <th className="p-3 w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all invoices"
                  className={someSelected ? 'opacity-50' : ''}
                />
              </th>
            )}
            <th className="p-3 text-left text-sm font-semibold">
              Invoice Number
            </th>
            <th className="p-3 text-left text-sm font-semibold">Vendor</th>
            <th className="p-3 text-right text-sm font-semibold">Amount</th>
            <th className="p-3 text-left text-sm font-semibold">Status</th>
            <th className="p-3 text-left text-sm font-semibold">
              Invoice Date
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const isSelected = selectedInvoiceIds.includes(invoice.id);

            return (
              <tr
                key={invoice.id}
                onClick={() => onRowClick(invoice)}
                className={`cursor-pointer border-b transition-colors hover:bg-muted/50 ${
                  isSelected ? 'bg-muted/30' : ''
                }`}
              >
                {showCheckboxes && (
                  <td className="p-3 w-12">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() =>
                        handleToggleInvoice(invoice.id, {
                          stopPropagation: () => {},
                        } as React.MouseEvent)
                      }
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select invoice ${invoice.invoice_number}`}
                    />
                  </td>
                )}
                <td className="p-3 text-sm font-medium">
                  {invoice.invoice_number}
                </td>
              <td className="p-3 text-sm text-muted-foreground">
                {invoice.vendor?.name || 'N/A'}
              </td>
              <td className="p-3 text-right text-sm font-medium">
                {formatCurrency(invoice.invoice_amount)}
              </td>
              <td className="p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {invoice.status !== INVOICE_STATUS.UNPAID && (
                    <InvoiceStatusBadge status={invoice.status} />
                  )}
                  {invoice.dueLabel && (
                    <Badge variant={invoice.dueStatusVariant ?? 'outline'}>
                      {invoice.dueLabel}
                    </Badge>
                  )}
                </div>
              </td>
                <td className="p-3 text-sm text-muted-foreground">
                  {formatDate(invoice.invoice_date)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
