'use client';

/**
 * Invoice Filter Popover (v3)
 *
 * Comprehensive filter popover for the All Invoices tab.
 * Features:
 * - View Mode (Pending/Monthly)
 * - Filter dropdowns (Status, Vendor, Category, Profile, Payment Type)
 * - Invoice Type radio buttons
 * - TDS/Archived checkboxes
 * - Date Range with presets
 * - Sort options
 * - Reset/Apply buttons
 *
 * Width: ~320px (desktop popover)
 */

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { INVOICE_STATUS, type InvoiceStatus, type InvoiceFilters } from '@/types/invoice';

// ============================================================================
// Types
// ============================================================================

export type ViewMode = 'pending' | 'monthly';

export interface FilterOptions {
  vendors: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  profiles: Array<{ id: number; name: string }>;
  entities: Array<{ id: number; name: string }>;
  paymentTypes: Array<{ id: number; name: string }>;
}

export interface InvoiceFilterState {
  viewMode: ViewMode;
  /** Status filter - can be a single InvoiceStatus or 'pending_actions' for composite filter */
  status?: InvoiceStatus | typeof PENDING_ACTIONS_STATUS;
  vendorId?: number;
  categoryId?: number;
  profileId?: number;
  paymentTypeId?: number;
  entityId?: number;
  isRecurring?: boolean;
  tdsApplicable?: boolean;
  showArchived: boolean;
  startDate?: Date;
  endDate?: Date;
  sortBy?: InvoiceFilters['sort_by'];
  sortOrder: 'asc' | 'desc';
}

export interface InvoiceFilterPopoverProps {
  filters: InvoiceFilterState;
  onFiltersChange: (filters: InvoiceFilterState) => void;
  options: FilterOptions;
  isLoading?: boolean;
  activeFilterCount?: number;
}

// ============================================================================
// Date Preset Helpers
// ============================================================================

type DatePreset = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear';

const DATE_PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
];

function getDatePresetRange(preset: DatePreset): { start: Date; end: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'all':
      return null;
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: yesterday };
    }
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end: today };
    }
    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start, end };
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { start, end };
    }
  }
}

// ============================================================================
// Sort Options
// ============================================================================

const SORT_OPTIONS: Array<{ value: string; label: string; sortBy: InvoiceFilters['sort_by']; sortOrder: 'asc' | 'desc' }> = [
  { value: 'date_newest', label: 'Date: Newest First', sortBy: 'invoice_date', sortOrder: 'desc' },
  { value: 'date_oldest', label: 'Date: Oldest First', sortBy: 'invoice_date', sortOrder: 'asc' },
  { value: 'amount_high', label: 'Amount: High to Low', sortBy: 'invoice_amount', sortOrder: 'desc' },
  { value: 'amount_low', label: 'Amount: Low to High', sortBy: 'invoice_amount', sortOrder: 'asc' },
  { value: 'remaining_high', label: 'Remaining: High to Low', sortBy: 'remaining_balance', sortOrder: 'desc' },
  { value: 'remaining_low', label: 'Remaining: Low to High', sortBy: 'remaining_balance', sortOrder: 'asc' },
  { value: 'status_asc', label: 'Status (A-Z)', sortBy: 'status', sortOrder: 'asc' },
];

// ============================================================================
// Status Options
// ============================================================================

/**
 * Special composite status value for "Pending Actions" filter
 * Combines: pending_approval, unpaid, partial, overdue, on_hold
 */
export const PENDING_ACTIONS_STATUS = 'pending_actions' as const;

const STATUS_OPTIONS: Array<{ value: string; label: string; description?: string }> = [
  { value: '', label: 'All Statuses' },
  { value: PENDING_ACTIONS_STATUS, label: 'Pending Actions', description: 'Unpaid, Partial, Overdue, On Hold, Pending Approval' },
  { value: INVOICE_STATUS.PENDING_APPROVAL, label: 'Pending Approval' },
  { value: INVOICE_STATUS.UNPAID, label: 'Unpaid' },
  { value: INVOICE_STATUS.PARTIAL, label: 'Partially Paid' },
  { value: INVOICE_STATUS.PAID, label: 'Paid' },
  { value: INVOICE_STATUS.OVERDUE, label: 'Overdue' },
  { value: INVOICE_STATUS.ON_HOLD, label: 'On Hold' },
  { value: INVOICE_STATUS.REJECTED, label: 'Rejected' },
];

// ============================================================================
// Component
// ============================================================================

export function InvoiceFilterPopover({
  filters,
  onFiltersChange,
  options,
  isLoading = false,
  activeFilterCount = 0,
}: InvoiceFilterPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<InvoiceFilterState>(filters);
  const [datePreset, setDatePreset] = React.useState<DatePreset>('all');

  // Sync local filters when props change
  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Update local filter
  const updateFilter = <K extends keyof InvoiceFilterState>(
    key: K,
    value: InvoiceFilterState[K]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Handle date preset change
  const handleDatePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as DatePreset;
    setDatePreset(preset);
    const range = getDatePresetRange(preset);
    if (range) {
      setLocalFilters((prev) => ({
        ...prev,
        startDate: range.start,
        endDate: range.end,
      }));
    } else {
      setLocalFilters((prev) => ({
        ...prev,
        startDate: undefined,
        endDate: undefined,
      }));
    }
  };

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const option = SORT_OPTIONS.find((opt) => opt.value === value);
    if (option) {
      setLocalFilters((prev) => ({
        ...prev,
        sortBy: option.sortBy,
        sortOrder: option.sortOrder,
      }));
    }
  };

  // Get current sort value
  const getCurrentSortValue = () => {
    const option = SORT_OPTIONS.find(
      (opt) => opt.sortBy === localFilters.sortBy && opt.sortOrder === localFilters.sortOrder
    );
    return option?.value || 'date_newest';
  };

  // Apply filters and close
  const handleApply = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  // Reset all filters
  const handleReset = () => {
    const resetFilters: InvoiceFilterState = {
      viewMode: 'pending',
      status: PENDING_ACTIONS_STATUS, // Default to "Pending Actions" for pending view mode
      showArchived: false,
      sortOrder: 'desc',
    };
    setLocalFilters(resetFilters);
    setDatePreset('all');
  };

  // Count active filters (excluding defaults)
  const countActiveFilters = () => {
    let count = 0;
    // Don't count 'pending_actions' as active filter when in pending mode (it's the default)
    if (localFilters.status && !(localFilters.viewMode === 'pending' && localFilters.status === PENDING_ACTIONS_STATUS)) count++;
    if (localFilters.vendorId) count++;
    if (localFilters.categoryId) count++;
    if (localFilters.profileId) count++;
    if (localFilters.paymentTypeId) count++;
    if (localFilters.entityId) count++;
    if (localFilters.isRecurring !== undefined) count++;
    if (localFilters.tdsApplicable !== undefined) count++;
    if (localFilters.showArchived) count++;
    if (localFilters.startDate || localFilters.endDate) count++;
    return count;
  };

  const filterCount = activeFilterCount || countActiveFilters();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={filterCount > 0 ? 'default' : 'outline'}
          className={cn(
            'gap-2',
            filterCount > 0 && 'bg-primary text-primary-foreground'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {filterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-medium">
              {filterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex flex-col max-h-[70vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h4 className="font-semibold text-sm">Filters</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleReset}
            >
              Reset All
            </Button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* VIEW MODE Section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                View Mode
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={localFilters.viewMode === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setLocalFilters((prev) => ({
                      ...prev,
                      viewMode: 'pending',
                      status: PENDING_ACTIONS_STATUS, // Auto-select "Pending Actions" status
                    }));
                  }}
                >
                  Pending Actions
                </Button>
                <Button
                  variant={localFilters.viewMode === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setLocalFilters((prev) => ({
                      ...prev,
                      viewMode: 'monthly',
                      status: undefined, // Clear status filter for monthly view
                    }));
                  }}
                >
                  Monthly
                </Button>
              </div>
              {localFilters.viewMode === 'pending' && (
                <p className="text-xs text-muted-foreground">
                  Shows unpaid, partial, overdue, on-hold & pending approval invoices
                </p>
              )}
            </div>

            {/* FILTERS Section */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Filters
                {isLoading && <span className="ml-2 text-xs font-normal animate-pulse">Loading...</span>}
              </Label>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={localFilters.status || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === PENDING_ACTIONS_STATUS) {
                      updateFilter('status', PENDING_ACTIONS_STATUS);
                    } else if (value) {
                      updateFilter('status', value as InvoiceStatus);
                    } else {
                      updateFilter('status', undefined);
                    }
                  }}
                  className="h-9"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Vendor */}
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor</Label>
                <Select
                  value={localFilters.vendorId?.toString() || ''}
                  onChange={(e) =>
                    updateFilter('vendorId', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isLoading}
                  className="h-9"
                >
                  <option value="">All Vendors</option>
                  {options.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select
                  value={localFilters.categoryId?.toString() || ''}
                  onChange={(e) =>
                    updateFilter('categoryId', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isLoading}
                  className="h-9"
                >
                  <option value="">All Categories</option>
                  {options.categories.map((cat) => (
                    <option key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Invoice Profile */}
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice Profile</Label>
                <Select
                  value={localFilters.profileId?.toString() || ''}
                  onChange={(e) =>
                    updateFilter('profileId', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isLoading}
                  className="h-9"
                >
                  <option value="">All Profiles</option>
                  {options.profiles.map((profile) => (
                    <option key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Payment Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Type</Label>
                <Select
                  value={localFilters.paymentTypeId?.toString() || ''}
                  onChange={(e) =>
                    updateFilter('paymentTypeId', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isLoading}
                  className="h-9"
                >
                  <option value="">All Payment Types</option>
                  {options.paymentTypes.map((type) => (
                    <option key={type.id} value={type.id.toString()}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Entity */}
              <div className="space-y-1.5">
                <Label className="text-xs">Entity</Label>
                <Select
                  value={localFilters.entityId?.toString() || ''}
                  onChange={(e) =>
                    updateFilter('entityId', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  disabled={isLoading}
                  className="h-9"
                >
                  <option value="">All Entities</option>
                  {options.entities.map((entity) => (
                    <option key={entity.id} value={entity.id.toString()}>
                      {entity.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* INVOICE TYPE Section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Invoice Type
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={localFilters.isRecurring === undefined ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateFilter('isRecurring', undefined)}
                >
                  All
                </Button>
                <Button
                  variant={localFilters.isRecurring === true ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateFilter('isRecurring', true)}
                >
                  Recurring
                </Button>
                <Button
                  variant={localFilters.isRecurring === false ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateFilter('isRecurring', false)}
                >
                  One-time
                </Button>
              </div>
            </div>

            {/* CHECKBOXES Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tds-applicable"
                  checked={localFilters.tdsApplicable === true}
                  onCheckedChange={(checked) =>
                    updateFilter('tdsApplicable', checked ? true : undefined)
                  }
                />
                <Label htmlFor="tds-applicable" className="text-sm cursor-pointer">
                  TDS Applicable Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-archived"
                  checked={localFilters.showArchived}
                  onCheckedChange={(checked) =>
                    updateFilter('showArchived', !!checked)
                  }
                />
                <Label htmlFor="show-archived" className="text-sm cursor-pointer">
                  Show Archived
                </Label>
              </div>
            </div>

            {/* DATE RANGE Section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date Range
              </Label>
              <Select value={datePreset} onChange={handleDatePresetChange} className="h-9">
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </Select>
              {localFilters.startDate && localFilters.endDate && (
                <p className="text-xs text-muted-foreground">
                  {localFilters.startDate.toLocaleDateString()} - {localFilters.endDate.toLocaleDateString()}
                </p>
              )}
            </div>

            {/* SORT Section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sort By
              </Label>
              <Select value={getCurrentSortValue()} onChange={handleSortChange} className="h-9">
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default InvoiceFilterPopover;
