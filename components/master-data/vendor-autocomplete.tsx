/**
 * Vendor Autocomplete Component
 *
 * Searchable dropdown for vendor selection with "Request New Vendor" link.
 * Uses cmdk for command menu and Radix Popover for positioning.
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { useSearchVendors } from '@/hooks/use-vendors';
import { usePanel } from '@/hooks/use-panel';

// ============================================================================
// TYPES
// ============================================================================

interface VendorAutocompleteProps {
  value: number | null;
  onChange: (vendorId: number | null) => void;
  error?: string;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function VendorAutocomplete({
  value,
  onChange,
  error,
  disabled = false,
}: VendorAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: vendors = [], isLoading } = useSearchVendors(search, open);
  const { openPanel } = usePanel();

  // Find selected vendor name
  const selectedVendor = vendors.find((v) => v.id === value);

  // Debounce search (handled by React Query staleTime)
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (vendorId: number) => {
    onChange(vendorId === value ? null : vendorId);
    setOpen(false);
  };

  const handleRequestNew = () => {
    setOpen(false);
    // TODO: Open master data request form panel
    // openPanel('master-data-request-form', { entityType: 'vendor' });
  };

  return (
    <div className="space-y-1">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls="vendor-listbox"
            aria-haspopup="listbox"
            aria-label="Select vendor"
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500'
            )}
          >
            <span className={cn(!selectedVendor && 'text-muted-foreground')}>
              {selectedVendor ? selectedVendor.name : 'Select vendor...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover text-popover-foreground shadow-md outline-none rounded-md border"
            sideOffset={4}
          >
            <Command>
              <CommandInput
                placeholder="Search vendors..."
                value={search}
                onValueChange={setSearch}
                className="h-9"
              />
              <CommandList>
                <CommandEmpty>
                  {isLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Searching...
                    </div>
                  ) : (
                    <div className="py-6 text-center text-sm">
                      <p className="text-muted-foreground mb-3">No vendor found.</p>
                      <button
                        type="button"
                        onClick={handleRequestNew}
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Request new vendor
                      </button>
                    </div>
                  )}
                </CommandEmpty>

                <CommandGroup>
                  {vendors.map((vendor) => (
                    <CommandItem
                      key={vendor.id}
                      value={vendor.name}
                      onSelect={() => handleSelect(vendor.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === vendor.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {vendor.name}
                    </CommandItem>
                  ))}
                </CommandGroup>

                {vendors.length > 0 && (
                  <div className="border-t p-2">
                    <button
                      type="button"
                      onClick={handleRequestNew}
                      className="flex w-full items-center justify-center text-sm text-muted-foreground hover:text-primary"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Request new vendor
                    </button>
                  </div>
                )}
              </CommandList>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
