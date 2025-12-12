'use client';

/**
 * Invoice Filter Sheet (Mobile)
 *
 * Mobile-optimized bottom sheet for comprehensive invoice filtering.
 * Uses Dialog with custom positioning to slide up from bottom.
 * Features same filter options as desktop popover.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { INVOICE_STATUS, type InvoiceStatus, type InvoiceFilters } from '@/types/invoice';
import type { InvoiceFilterState, FilterOptions } from './invoice-filter-popover';

// Re-export types from popover
export type { InvoiceFilterState, FilterOptions };

// ============================================================================
// Date Preset Helpers (same as popover)
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
// Sort Options (same as popover)
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
// Status Options (same as popover)
// ============================================================================

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: INVOICE_STATUS.PENDING_APPROVAL, label: 'Pending Approval' },
  { value: INVOICE_STATUS.UNPAID, label: 'Unpaid' },
  { value: INVOICE_STATUS.PARTIAL, label: 'Partial' },
  { value: INVOICE_STATUS.PAID, label: 'Paid' },
  { value: INVOICE_STATUS.OVERDUE, label: 'Overdue' },
  { value: INVOICE_STATUS.ON_HOLD, label: 'On Hold' },
  { value: INVOICE_STATUS.REJECTED, label: 'Rejected' },
];

// ============================================================================
// Component Props
// ============================================================================

export interface InvoiceFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: InvoiceFilterState;
  onFiltersChange: (filters: InvoiceFilterState) => void;
  options: FilterOptions;
  isLoading?: boolean;
  activeFilterCount?: number;
}

// ============================================================================
// Component
// ============================================================================

export function InvoiceFilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  options,
  isLoading = false,
  activeFilterCount = 0,
}: InvoiceFilterSheetProps) {
  const [localFilters, setLocalFilters] = React.useState<InvoiceFilterState>(filters);
  const [datePreset, setDatePreset] = React.useState<DatePreset>('all');

  // Sync local filters when props change or dialog opens
  React.useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [filters, open]);

  const updateFilter = <K extends keyof InvoiceFilterState>(
    key: K,
    value: InvoiceFilterState[K]
  ) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

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

  const getCurrentSortValue = () => {
    const option = SORT_OPTIONS.find(
      (opt) => opt.sortBy === localFilters.sortBy && opt.sortOrder === localFilters.sortOrder
    );
    return option?.value || 'date_newest';
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetFilters: InvoiceFilterState = {
      viewMode: 'pending',
      showArchived: false,
      sortOrder: 'desc',
    };
    setLocalFilters(resetFilters);
    setDatePreset('all');
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[10010] bg-black/80',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Content - Bottom Sheet */}
        <DialogPrimitive.Content
          className={cn(
            // Fixed at bottom, full width
            'fixed bottom-0 left-0 right-0 z-[10011]',
            // Height and shape
            'max-h-[85vh] w-full rounded-t-xl',
            // Colors
            'border-t bg-background shadow-lg',
            // Animations - slide from bottom
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'duration-300',
            // Layout
            'flex flex-col'
          )}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              Filters
            </DialogPrimitive.Title>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-muted-foreground"
              onClick={handleReset}
            >
              Reset All
            </Button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {/* VIEW MODE Section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                View
              </Label>
              <div className="flex gap-2">
                <Button
                  variant={localFilters.viewMode === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateFilter('viewMode', 'pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={localFilters.viewMode === 'monthly' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateFilter('viewMode', 'monthly')}
                >
                  Monthly
                </Button>
              </div>
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
                  onChange={(e) =>
                    updateFilter('status', e.target.value ? (e.target.value as InvoiceStatus) : undefined)
                  }
                  className="h-10"
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
                  className="h-10"
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
                  className="h-10"
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
                  className="h-10"
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
                  className="h-10"
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
                  className="h-10"
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
                  id="tds-applicable-mobile"
                  checked={localFilters.tdsApplicable === true}
                  onCheckedChange={(checked) =>
                    updateFilter('tdsApplicable', checked ? true : undefined)
                  }
                />
                <Label htmlFor="tds-applicable-mobile" className="text-sm cursor-pointer">
                  TDS Applicable Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-archived-mobile"
                  checked={localFilters.showArchived}
                  onCheckedChange={(checked) =>
                    updateFilter('showArchived', !!checked)
                  }
                />
                <Label htmlFor="show-archived-mobile" className="text-sm cursor-pointer">
                  Show Archived
                </Label>
              </div>
            </div>

            {/* DATE RANGE Section */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date Range
              </Label>
              <Select value={datePreset} onChange={handleDatePresetChange} className="h-10">
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
              <Select value={getCurrentSortValue()} onChange={handleSortChange} className="h-10">
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-4 py-3 border-t bg-background flex-shrink-0">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleApply}>
              Apply Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default InvoiceFilterSheet;
