'use client';

/**
 * Data Table Component (v3)
 *
 * A styled data table with:
 * - Search input
 * - Filter dropdown
 * - Export button
 * - New Invoice button
 * - Checkbox selection
 * - Status badges (paid, pending, overdue)
 * - Action buttons (view, edit, more)
 *
 * Built with:
 * - Native HTML table with Tailwind styling
 * - shadcn/ui components for buttons, badges, inputs
 * - Lucide icons
 */

import * as React from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Pencil,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type InvoiceStatus = 'paid' | 'pending' | 'overdue';

export interface InvoiceRow {
  id: string;
  invoiceId: string;
  client?: string;
  amount: number;
  status: InvoiceStatus;
  date: string;
  due: string;
}

export interface DataTableProps {
  data: InvoiceRow[];
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  onExport?: () => void;
  onNewInvoice?: () => void;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
}

// ============================================================================
// Status Badge Component
// ============================================================================

const statusConfig: Record<
  InvoiceStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  paid: { label: 'paid', variant: 'success' },
  pending: { label: 'pending', variant: 'warning' },
  overdue: { label: 'overdue', variant: 'destructive' },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'text-xs font-medium capitalize',
        status === 'paid' && 'bg-green-500/10 text-green-500 border-green-500/20',
        status === 'pending' && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        status === 'overdue' && 'bg-red-500/10 text-red-400 border-red-500/20'
      )}
    >
      {config.label}
    </Badge>
  );
}

// ============================================================================
// Toolbar Component
// ============================================================================

interface ToolbarProps {
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  onExport?: () => void;
  onNewInvoice?: () => void;
}

function Toolbar({ onSearch, onFilter, onExport, onNewInvoice }: ToolbarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-9 bg-muted/50 border-border"
        />
      </div>

      {/* Filter Button */}
      <Button variant="outline" onClick={onFilter} className="gap-2">
        <Filter className="h-4 w-4" />
        Filter
      </Button>

      {/* Spacer */}
      <div className="flex-1 hidden sm:block" />

      {/* Export Button */}
      <Button variant="outline" onClick={onExport} className="gap-2">
        <Download className="h-4 w-4" />
        Export
      </Button>

      {/* New Invoice Button */}
      <Button onClick={onNewInvoice} className="gap-2">
        <Plus className="h-4 w-4" />
        New Invoice
      </Button>
    </div>
  );
}

// ============================================================================
// Action Cell Component
// ============================================================================

interface ActionCellProps {
  id: string;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function ActionCell({ id, onView, onEdit }: ActionCellProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 transition-colors duration-150"
        onClick={() => onView?.(id)}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">View</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 transition-colors duration-150"
        onClick={() => onEdit?.(id)}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 transition-colors duration-150">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView?.(id)}>
            View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit?.(id)}>
            Edit invoice
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTable({
  data,
  onSearch,
  onFilter,
  onExport,
  onNewInvoice,
  onView,
  onEdit,
  selectedIds = [],
  onSelectionChange,
  className,
}: DataTableProps) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(data.map((row) => row.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange?.([...selectedIds, id]);
    }
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <Toolbar
        onSearch={onSearch}
        onFilter={onFilter}
        onExport={onExport}
        onNewInvoice={onNewInvoice}
      />

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-12 p-3">
                  <Checkbox
                    checked={allSelected}
                    // @ts-expect-error - indeterminate is valid but not in types
                    indeterminate={someSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Invoice ID
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Client
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Amount
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Date
                </th>
                <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Due
                </th>
                <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border last:border-0',
                    'transition-colors hover:bg-muted/50',
                    index % 2 === 1 && 'bg-muted/20',
                    selectedIds.includes(row.id) && 'bg-primary/5'
                  )}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={selectedIds.includes(row.id)}
                      onCheckedChange={() => handleSelectRow(row.id)}
                      aria-label={`Select ${row.invoiceId}`}
                    />
                  </td>
                  <td className="p-3 text-sm font-medium">{row.invoiceId}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {row.client || '-'}
                  </td>
                  <td className="p-3 text-sm font-medium">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{row.date}</td>
                  <td className="p-3 text-sm">
                    <span
                      className={cn(
                        row.status === 'overdue' && 'text-red-400',
                        row.status === 'pending' && 'text-foreground'
                      )}
                    >
                      {row.due}
                    </span>
                  </td>
                  <td className="p-3">
                    <ActionCell id={row.id} onView={onView} onEdit={onEdit} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {data.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No invoices found.
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
