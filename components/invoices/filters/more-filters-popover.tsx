/**
 * More Filters Popover Component
 *
 * Popover containing vendor and category dropdowns.
 * Shows badge count (0-2) of active filters.
 * No Apply/Reset buttons - changes are immediate (onChange).
 */

'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MoreFiltersPopoverProps {
  vendorId: number | '';
  categoryId: number | '';
  vendors: Array<{ id: number; name: string }>;
  categories: Array<{ id: number; name: string }>;
  onVendorChange: (vendorId: number | '') => void;
  onCategoryChange: (categoryId: number | '') => void;
}

/**
 * Renders a popover with additional filter options (vendor, category).
 * Shows badge with count of active filters (0-2).
 * Optimized with React.memo to prevent unnecessary re-renders.
 */
export const MoreFiltersPopover = React.memo(function MoreFiltersPopover({
  vendorId,
  categoryId,
  vendors = [],
  categories = [],
  onVendorChange,
  onCategoryChange,
}: MoreFiltersPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Count active filters
  const activeCount = React.useMemo(() => {
    let count = 0;
    if (vendorId !== '' && vendorId !== undefined && vendorId !== null) count++;
    if (categoryId !== '' && categoryId !== undefined && categoryId !== null) count++;
    return count;
  }, [vendorId, categoryId]);

  // Handle vendor change
  const handleVendorChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onVendorChange(value === '' ? '' : Number(value));
    },
    [onVendorChange]
  );

  // Handle category change
  const handleCategoryChange = React.useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      onCategoryChange(value === '' ? '' : Number(value));
    },
    [onCategoryChange]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative"
          aria-label="More filters"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          More Filters
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 h-5 min-w-[20px] rounded-full px-1 text-xs"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Additional Filters</h4>
            <p className="text-xs text-muted-foreground">
              Filter invoices by vendor or category
            </p>
          </div>

          {/* Vendor dropdown */}
          <div className="space-y-2">
            <Label htmlFor="vendor-filter" className="text-sm">
              Vendor
            </Label>
            <Select
              id="vendor-filter"
              value={vendorId === '' || vendorId === null || vendorId === undefined ? '' : String(vendorId)}
              onChange={handleVendorChange}
              className="w-full"
              disabled={vendors.length === 0}
            >
              <option value="">
                {vendors.length === 0 ? 'Loading vendors...' : 'All Vendors'}
              </option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </Select>
            {vendors.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Check database connection if vendors don&apos;t load
              </p>
            )}
          </div>

          {/* Category dropdown */}
          <div className="space-y-2">
            <Label htmlFor="category-filter" className="text-sm">
              Category
            </Label>
            <Select
              id="category-filter"
              value={categoryId === '' || categoryId === null || categoryId === undefined ? '' : String(categoryId)}
              onChange={handleCategoryChange}
              className="w-full"
              disabled={categories.length === 0}
            >
              <option value="">
                {categories.length === 0 ? 'Loading categories...' : 'All Categories'}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Check database connection if categories don&apos;t load
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
