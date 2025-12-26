/**
 * Vendor Text Autocomplete Component
 *
 * A text input field with autocomplete suggestions.
 * User can type directly and see matching vendors.
 * Can select from suggestions or keep custom text for new vendor.
 */

'use client';

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from 'cmdk';
import { cn } from '@/lib/utils';
import { useSearchVendors, useAllVendors } from '@/hooks/use-vendors';

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
  const [isBrowseMode, setIsBrowseMode] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch vendors based on search query OR when we need to load initial vendor by ID
  const shouldFetchVendors = open || search.length > 0 || (!!value && value > 0 && !search);
  const { data: searchVendors = [], isLoading: isSearchLoading } = useSearchVendors(search || '', shouldFetchVendors && !isBrowseMode);

  // IMP-004: Fetch ALL vendors when browsing (arrow key triggered)
  const { data: allVendors = [], isLoading: isBrowseLoading } = useAllVendors(isBrowseMode && open);

  // Use browse vendors when in browse mode, otherwise use search vendors
  const vendors = isBrowseMode ? allVendors : searchVendors;
  const isLoading = isBrowseMode ? isBrowseLoading : isSearchLoading;

  // Initialize search with selected vendor name when value changes (for edit forms)
  // Note: `search` is intentionally excluded from dependencies to avoid race conditions
  // where the effect re-runs and interferes with vendor name initialization
  React.useEffect(() => {
    if (value && value > 0 && vendors.length > 0) {
      const selected = vendors.find((v) => v.id === value);
      if (selected) {
        setSearch(selected.name);
        setSelectedVendorName(selected.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, vendors]);

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setOpen(newValue.length > 0);
    // Exit browse mode when user types - switch to search mode
    setIsBrowseMode(false);

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
    setIsBrowseMode(false);
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
      setIsBrowseMode(false);
    }, 200);
  };

  /**
   * Handle keyboard navigation
   * IMP-004: Arrow down opens dropdown with all vendors
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && !open) {
      e.preventDefault();
      setIsBrowseMode(true);
      setOpen(true);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setIsBrowseMode(false);
    }
  };

  /**
   * Handle chevron click - toggle browse mode
   * IMP-005: Clickable chevron with touch support
   */
  const handleChevronClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (open && isBrowseMode) {
      // If already open in browse mode, close it
      setOpen(false);
      setIsBrowseMode(false);
    } else {
      // Open in browse mode (show all vendors)
      setIsBrowseMode(true);
      setOpen(true);
      // Focus the input so user can start typing
      inputRef.current?.focus();
    }
  };

  /**
   * Get display value for input
   */
  const getDisplayValue = () => {
    return search;
  };

  return (
    <div className="relative space-y-1">
      {/* Text Input with Chevron Indicator */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={getDisplayValue()}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full pr-8',
            error && 'border-destructive focus:ring-0'
          )}
          autoComplete="off"
        />
        {/* IMP-004/IMP-005: Clickable chevron button with touch-friendly target (32x32px) */}
        <button
          type="button"
          onClick={handleChevronClick}
          onTouchEnd={handleChevronClick}
          disabled={disabled}
          tabIndex={-1}
          aria-label={open ? 'Close vendor list' : 'Browse all vendors'}
          className={cn(
            'absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center',
            'text-muted-foreground hover:text-foreground transition-colors',
            'focus:outline-none',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {/* IMP-004: Show dropdown when searching OR when in browse mode (arrow key) */}
      {open && (search.length > 0 || isBrowseMode) && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground shadow-md rounded-md border max-h-60 overflow-auto">
          <Command>
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {isBrowseMode ? 'Loading vendors...' : 'Searching...'}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {isBrowseMode
                      ? 'No vendors found. Type to add a new vendor.'
                      : 'No vendor found. Keep typing to add new vendor.'}
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
                      // Use onMouseDown to ensure selection fires before blur on Windows
                      // Without this, Windows event timing causes blur to fire before click,
                      // requiring users to double-click to select items
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(vendor);
                      }}
                      className="cursor-pointer"
                    >
                      {vendor.name}
                      {selectedVendorName === vendor.name && (
                        <Check className="ml-2 h-4 w-4 inline-block" />
                      )}
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
