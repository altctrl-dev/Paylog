/**
 * Vendor Text Autocomplete Component
 *
 * A text input field with autocomplete suggestions.
 * User can type directly and see matching vendors.
 * Can select from suggestions or keep custom text for new vendor.
 */

'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from 'cmdk';
import { cn } from '@/lib/utils';
import { useSearchVendors } from '@/hooks/use-vendors';

interface VendorTextAutocompleteProps {
  /** Current vendor ID (null if new/custom vendor) */
  value: number | null;
  /** Callback when vendor selection changes */
  onChange: (vendorId: number | null, vendorName: string) => void;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Vendor Text Autocomplete
 *
 * A text input field that shows autocomplete suggestions as you type.
 * - Type directly in the field
 * - See matching vendors in dropdown
 * - Select a vendor or keep custom text
 * - Custom text (new vendor) handled on form submit
 */
export function VendorTextAutocomplete({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Type vendor name...',
}: VendorTextAutocompleteProps) {
  const [search, setSearch] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [selectedVendorName, setSelectedVendorName] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch vendors based on search query
  const { data: vendors = [], isLoading } = useSearchVendors(search, open || search.length > 0);

  // Initialize search with selected vendor name
  React.useEffect(() => {
    if (value && vendors.length > 0) {
      const selected = vendors.find((v) => v.id === value);
      if (selected && !search) {
        setSearch(selected.name);
        setSelectedVendorName(selected.name);
      }
    }
  }, [value, vendors, search]);

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setOpen(newValue.length > 0);

    // Check if input matches a vendor
    const matchedVendor = vendors.find(
      (v) => v.name.toLowerCase() === newValue.toLowerCase()
    );

    if (matchedVendor) {
      onChange(matchedVendor.id, matchedVendor.name);
      setSelectedVendorName(matchedVendor.name);
    } else {
      // Custom vendor name (not in database)
      onChange(null, newValue);
      setSelectedVendorName('');
    }
  };

  /**
   * Handle vendor selection from dropdown
   */
  const handleSelect = (vendor: { id: number; name: string }) => {
    setSearch(vendor.name);
    setSelectedVendorName(vendor.name);
    onChange(vendor.id, vendor.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  /**
   * Handle input focus
   */
  const handleFocus = () => {
    if (search.length > 0) {
      setOpen(true);
    }
  };

  /**
   * Handle input blur
   */
  const handleBlur = () => {
    // Delay closing to allow click on dropdown items
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  /**
   * Get display value for input
   */
  const getDisplayValue = () => {
    return search;
  };

  return (
    <div className="relative space-y-1">
      {/* Text Input */}
      <Input
        ref={inputRef}
        type="text"
        value={getDisplayValue()}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'w-full',
          error && 'border-destructive focus-visible:ring-destructive'
        )}
        autoComplete="off"
      />

      {/* Autocomplete Dropdown */}
      {open && search.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground shadow-md rounded-md border">
          <Command>
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No vendor found. Keep typing to add new vendor.
                  </div>
                )}
              </CommandEmpty>

              {vendors.length > 0 && (
                <CommandGroup>
                  {vendors.map((vendor) => (
                    <CommandItem
                      key={vendor.id}
                      value={vendor.name}
                      onSelect={() => handleSelect(vendor)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedVendorName === vendor.name ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {vendor.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Hint for new vendor */}
      {search && !value && search.length > 2 && !isLoading && (
        <p className="text-xs text-muted-foreground">
          &quot;{search}&quot; will be added as a new vendor
        </p>
      )}
    </div>
  );
}
