'use client';

/**
 * Unified Filter Popover Component
 *
 * Wide, horizontal filter panel for the All Invoices Tab with:
 * - View Mode toggle (Pending Actions / Monthly)
 * - Date Range and Sorting controls
 * - 3-column layout: Entry Types | Type Filters | Dropdown Filters
 */

import * as React from 'react';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { type InvoiceFilterState, PENDING_ACTIONS_STATUS } from './invoice-filter-popover';
import type { EntryType } from '@/types/unified-entry';

// ============================================================================
// Types
// ============================================================================

export interface FilterOptions {
  vendors: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  profiles: Array<{ id: number; name: string }>;
  entities: Array<{ id: number; name: string }>;
  paymentTypes: Array<{ id: number; name: string }>;
}

export interface UnifiedFilterPopoverProps {
  filters: InvoiceFilterState;
  onFiltersChange: (filters: InvoiceFilterState) => void;
  entryTypeFilter: EntryType | 'all';
  onEntryTypeFilterChange: (types: EntryType | 'all') => void;
  options: FilterOptions;
  isLoading?: boolean;
  activeFilterCount: number;
  counts?: { invoice: number; credit_note: number; advance_payment: number };
}

// ============================================================================
// Component
// ============================================================================

export function UnifiedFilterPopover({
  filters,
  onFiltersChange,
  entryTypeFilter,
  onEntryTypeFilterChange,
  options,
  isLoading,
  activeFilterCount,
  counts = { invoice: 0, credit_note: 0, advance_payment: 0 },
}: UnifiedFilterPopoverProps) {
  const [open, setOpen] = useState(false);

  // Local state for the popover (apply on submit)
  const [localFilters, setLocalFilters] = useState<InvoiceFilterState>(filters);
  const [localEntryTypes, setLocalEntryTypes] = useState<Set<EntryType>>(
    entryTypeFilter === 'all'
      ? new Set(['invoice', 'credit_note', 'advance_payment'])
      : new Set([entryTypeFilter])
  );

  // Sync local state when popover opens
  React.useEffect(() => {
    if (open) {
      setLocalFilters(filters);
      setLocalEntryTypes(
        entryTypeFilter === 'all'
          ? new Set(['invoice', 'credit_note', 'advance_payment'])
          : new Set([entryTypeFilter])
      );
    }
  }, [open, filters, entryTypeFilter]);

  const handleApply = () => {
    onFiltersChange(localFilters);

    // Convert entry type set to filter value
    if (localEntryTypes.size === 3) {
      onEntryTypeFilterChange('all');
    } else if (localEntryTypes.size === 1) {
      onEntryTypeFilterChange(Array.from(localEntryTypes)[0]);
    } else {
      // For 2 types, we'll need to handle differently - for now just use 'all'
      onEntryTypeFilterChange('all');
    }

    setOpen(false);
  };

  const handleReset = () => {
    setLocalFilters({
      viewMode: 'pending',
      status: PENDING_ACTIONS_STATUS,
      showArchived: false,
      sortOrder: 'asc',
    });
    setLocalEntryTypes(new Set(['invoice', 'credit_note', 'advance_payment']));
  };

  const toggleEntryType = (type: EntryType) => {
    const newSet = new Set(localEntryTypes);
    if (newSet.has(type)) {
      // Don't allow deselecting all
      if (newSet.size > 1) {
        newSet.delete(type);
      }
    } else {
      newSet.add(type);
    }
    setLocalEntryTypes(newSet);
  };

  // Handle sort change from select
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const [sortBy, sortOrder] = value.split('-') as [string, 'asc' | 'desc'];
    setLocalFilters(prev => ({
      ...prev,
      sortBy: sortBy as InvoiceFilterState['sortBy'],
      sortOrder,
    }));
  };

  const getCurrentSortValue = () => {
    return `${localFilters.sortBy || 'created_at'}-${localFilters.sortOrder}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="default"
          className={cn(
            'gap-2',
            activeFilterCount > 0 && 'border-primary text-primary'
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[600px] p-0"
        align="start"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Filters</h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={handleReset}
          >
            Reset All
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Row 1: View Mode */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              View Mode
            </Label>
            <div className="flex gap-2">
              <Button
                variant={localFilters.viewMode === 'pending' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setLocalFilters(prev => ({
                  ...prev,
                  viewMode: 'pending',
                  status: PENDING_ACTIONS_STATUS,
                }))}
              >
                Pending Actions
              </Button>
              <Button
                variant={localFilters.viewMode === 'monthly' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setLocalFilters(prev => ({
                  ...prev,
                  viewMode: 'monthly',
                  status: undefined,
                }))}
              >
                Monthly View
              </Button>
            </div>
            {localFilters.viewMode === 'pending' && (
              <p className="text-[11px] text-muted-foreground">
                Shows unpaid, partial, overdue, on-hold & pending approval entries
              </p>
            )}
          </div>

          {/* Row 2: Sorting */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              Sorting
            </Label>
            <Select
              value={getCurrentSortValue()}
              onChange={handleSortChange}
              className="h-9"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="invoice_amount-desc">Amount (High to Low)</option>
              <option value="invoice_amount-asc">Amount (Low to High)</option>
              <option value="invoice_date-desc">Date (Newest)</option>
              <option value="invoice_date-asc">Date (Oldest)</option>
            </Select>
          </div>

          {/* Row 3: Three-column grid */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            {/* Column 1: Entry Types */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Entry Type
              </Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localEntryTypes.has('invoice')}
                    onCheckedChange={() => toggleEntryType('invoice')}
                  />
                  <span className="text-sm">Invoice</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {counts.invoice}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localEntryTypes.has('credit_note')}
                    onCheckedChange={() => toggleEntryType('credit_note')}
                  />
                  <span className="text-sm">Credit Note</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {counts.credit_note}
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localEntryTypes.has('advance_payment')}
                    onCheckedChange={() => toggleEntryType('advance_payment')}
                  />
                  <span className="text-sm">Advance Payment</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {counts.advance_payment}
                  </span>
                </label>
              </div>
            </div>

            {/* Column 2: Type Filters */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Type
              </Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.isRecurring === true}
                    onCheckedChange={(checked) =>
                      setLocalFilters(prev => ({
                        ...prev,
                        isRecurring: checked ? true : undefined,
                      }))
                    }
                  />
                  <span className="text-sm">Recurring</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.isRecurring === false}
                    onCheckedChange={(checked) =>
                      setLocalFilters(prev => ({
                        ...prev,
                        isRecurring: checked ? false : undefined,
                      }))
                    }
                  />
                  <span className="text-sm">One-time</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.tdsApplicable === true}
                    onCheckedChange={(checked) =>
                      setLocalFilters(prev => ({
                        ...prev,
                        tdsApplicable: checked ? true : undefined,
                      }))
                    }
                  />
                  <span className="text-sm">TDS Applicable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.showArchived === true}
                    onCheckedChange={(checked) =>
                      setLocalFilters(prev => ({
                        ...prev,
                        showArchived: checked === true,
                      }))
                    }
                  />
                  <span className="text-sm">Archived</span>
                </label>
              </div>
            </div>

            {/* Column 3: Dropdown Filters */}
            <div className="space-y-3">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Filters
              </Label>
              <div className="space-y-2">
                <Select
                  value={localFilters.entityId?.toString() || ''}
                  onChange={(e) =>
                    setLocalFilters(prev => ({
                      ...prev,
                      entityId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="h-8 text-xs"
                >
                  <option value="">All Entities</option>
                  {options.entities.map((entity) => (
                    <option key={entity.id} value={entity.id.toString()}>
                      {entity.name}
                    </option>
                  ))}
                </Select>

                <Select
                  value={localFilters.vendorId?.toString() || ''}
                  onChange={(e) =>
                    setLocalFilters(prev => ({
                      ...prev,
                      vendorId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="h-8 text-xs"
                >
                  <option value="">All Vendors</option>
                  {options.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </option>
                  ))}
                </Select>

                <Select
                  value={localFilters.categoryId?.toString() || ''}
                  onChange={(e) =>
                    setLocalFilters(prev => ({
                      ...prev,
                      categoryId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="h-8 text-xs"
                >
                  <option value="">All Categories</option>
                  {options.categories.map((category) => (
                    <option key={category.id} value={category.id.toString()}>
                      {category.name}
                    </option>
                  ))}
                </Select>

                <Select
                  value={localFilters.profileId?.toString() || ''}
                  onChange={(e) =>
                    setLocalFilters(prev => ({
                      ...prev,
                      profileId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="h-8 text-xs"
                >
                  <option value="">All Profiles</option>
                  {options.profiles.map((profile) => (
                    <option key={profile.id} value={profile.id.toString()}>
                      {profile.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-4 py-3 bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Apply Filters'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default UnifiedFilterPopover;
