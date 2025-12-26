/**
 * Smart Vendor ComboBox Component
 *
 * Searchable vendor dropdown with smart "create new vendor" functionality.
 * Detects when user enters a non-existent vendor name and flags for confirmation.
 */

'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, AlertCircle } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { useSearchVendors } from '@/hooks/use-vendors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { findSimilar } from '@/lib/fuzzy-match';
import { VENDOR_STATUS_CONFIG } from '@/types/vendor';

/**
 * Extended vendor type with optional fields for display
 */
type VendorWithOptionalFields = {
  id: number;
  name: string;
  gst_status?: string;
  is_active?: boolean;
  status?: string;
};

/**
 * Props interface for SmartVendorComboBox
 */
interface SmartVendorComboBoxProps {
  /** Current selected vendor ID */
  value: string | number | null;
  /** Callback when vendor selection changes */
  onChange: (value: number | null) => void;
  /** Callback when user wants to create a new vendor */
  onCreateNew?: (vendorName: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Error message to display */
  error?: string;
}

/**
 * Smart Vendor ComboBox Component
 *
 * Features:
 * - Searchable dropdown with real-time filtering
 * - Detects non-existent vendor names on blur/submit
 * - Shows confirmation dialog to add new vendor
 * - Displays vendor GST status and active status as secondary info
 */
export function SmartVendorComboBox({
  value,
  onChange,
  onCreateNew,
  disabled = false,
  placeholder = 'Select vendor...',
  error,
}: SmartVendorComboBoxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [pendingVendorName, setPendingVendorName] = React.useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [similarVendors, setSimilarVendors] = React.useState<Array<{ value: string; score: number }>>([]);
  const [showSimilarWarning, setShowSimilarWarning] = React.useState(false);

  // Fetch vendors based on search query
  const { data: vendors = [], isLoading } = useSearchVendors(search, open || value !== null);

  // Find selected vendor
  const selectedVendor = vendors.find((v) => v.id === Number(value));

  // Auto-focus input when popover opens
  React.useEffect(() => {
    if (open) {
      console.log('[SmartVendorComboBox] Popover opened');
      // Small delay to ensure popover is rendered
      setTimeout(() => {
        console.log('[SmartVendorComboBox] Attempting to focus input');
        inputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  // Reset search when dropdown closes
  React.useEffect(() => {
    if (!open) {
      console.log('[SmartVendorComboBox] Popover closed, clearing search');
      setSearch('');
    }
  }, [open]);

  // Debug: Log search changes
  React.useEffect(() => {
    console.log('[SmartVendorComboBox] Search value changed:', search);
  }, [search]);

  // Fuzzy match for duplicate detection
  React.useEffect(() => {
    if (search.length >= 3 && vendors.length > 0) {
      const vendorNames = vendors.map((v) => v.name);
      const similar = findSimilar(search, vendorNames, 0.75);

      if (similar.length > 0) {
        setSimilarVendors(similar);
        setShowSimilarWarning(true);
      } else {
        setSimilarVendors([]);
        setShowSimilarWarning(false);
      }
    } else {
      setSimilarVendors([]);
      setShowSimilarWarning(false);
    }
  }, [search, vendors]);

  /**
   * Handle vendor selection
   */
  const handleSelect = (vendorId: number) => {
    onChange(vendorId === value ? null : vendorId);
    setOpen(false);
    setPendingVendorName(null);
  };

  /**
   * Handle search input blur - detect non-existent vendor
   */
  const handleSearchBlur = () => {
    // If user typed something and no exact match exists, flag it
    if (search.trim() && vendors.length === 0 && !isLoading) {
      setPendingVendorName(search.trim());
    }
  };

  /**
   * Handle form submission attempt with non-existent vendor
   */
  const handleFormSubmitAttempt = (e: React.FormEvent) => {
    if (pendingVendorName) {
      e.preventDefault();
      setShowConfirmDialog(true);
    }
  };

  /**
   * Confirm creation of new vendor
   */
  const handleConfirmCreate = () => {
    if (pendingVendorName && onCreateNew) {
      onCreateNew(pendingVendorName);
      setShowConfirmDialog(false);
      setPendingVendorName(null);
    }
  };

  /**
   * Cancel creation of new vendor
   */
  const handleCancelCreate = () => {
    setShowConfirmDialog(false);
    setPendingVendorName(null);
    setSearch('');
  };

  return (
    <>
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
              onSubmit={handleFormSubmitAttempt}
              className={cn(
                'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:outline-none focus:ring-0 focus:border-primary',
                'disabled:cursor-not-allowed disabled:opacity-50',
                error && 'border-destructive focus:ring-0',
                pendingVendorName && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
              )}
            >
              <span className={cn(!selectedVendor && 'text-muted-foreground')}>
                {selectedVendor ? selectedVendor.name : placeholder}
              </span>
              {pendingVendorName && (
                <AlertCircle className="ml-2 h-4 w-4 text-yellow-600" />
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              align="start"
              className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover text-popover-foreground shadow-md outline-none rounded-md border z-50"
              sideOffset={4}
            >
              <Command>
                <CommandInput
                  ref={inputRef}
                  placeholder="Search vendors..."
                  value={search}
                  onValueChange={setSearch}
                  onBlur={handleSearchBlur}
                  className="h-9"
                  autoFocus
                />
                <CommandList>
                  <CommandEmpty>
                    {isLoading ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Searching...
                      </div>
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No vendor found. Type and press Tab to flag for creation.
                      </div>
                    )}
                  </CommandEmpty>

                  <CommandGroup>
                    {vendors.map((vendor) => (
                      <CommandItem
                        key={vendor.id}
                        value={vendor.name}
                        onSelect={() => handleSelect(vendor.id)}
                        className="flex cursor-pointer items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Check
                            className={cn(
                              'h-4 w-4',
                              value === vendor.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{vendor.name}</div>
                            {((vendor as VendorWithOptionalFields).gst_status || (vendor as VendorWithOptionalFields).is_active !== undefined) && (
                              <div className="text-xs text-muted-foreground">
                                {(vendor as VendorWithOptionalFields).gst_status && `GST: ${(vendor as VendorWithOptionalFields).gst_status}`}
                                {(vendor as VendorWithOptionalFields).gst_status && (vendor as VendorWithOptionalFields).is_active !== undefined && ' • '}
                                {(vendor as VendorWithOptionalFields).is_active !== undefined &&
                                  ((vendor as VendorWithOptionalFields).is_active ? 'Active' : 'Inactive')}
                              </div>
                            )}
                          </div>
                          {(vendor as VendorWithOptionalFields).status && (vendor as VendorWithOptionalFields).status !== 'APPROVED' && (
                            <Badge
                              variant={VENDOR_STATUS_CONFIG[(vendor as VendorWithOptionalFields).status as keyof typeof VENDOR_STATUS_CONFIG]?.variant || 'outline'}
                              className="text-xs"
                            >
                              {VENDOR_STATUS_CONFIG[(vendor as VendorWithOptionalFields).status as keyof typeof VENDOR_STATUS_CONFIG]?.label || (vendor as VendorWithOptionalFields).status}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {showSimilarWarning && similarVendors.length > 0 && (
                    <div className="border-t border-border bg-yellow-50 p-3 text-xs dark:bg-yellow-950">
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-semibold">Similar vendors exist:</span>
                      </div>
                      <ul className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300">
                        {similarVendors.slice(0, 3).map((similar, index) => (
                          <li key={index}>
                            • {similar.value} ({Math.round(similar.score * 100)}% match)
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-yellow-600 dark:text-yellow-400">
                        Are you sure you want to create a new vendor?
                      </p>
                    </div>
                  )}
                </CommandList>
              </Command>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Error message */}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Pending vendor warning */}
        {pendingVendorName && (
          <div className="flex items-start gap-2 rounded-md border border-yellow-500 bg-yellow-50 p-3 text-sm dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-yellow-900 dark:text-yellow-200">
                Vendor not found
              </p>
              <p className="text-yellow-800 dark:text-yellow-300">
                &quot;{pendingVendorName}&quot; will be flagged for creation on submit.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancelCreate}
              className="text-yellow-900 hover:text-yellow-950 dark:text-yellow-200 dark:hover:text-yellow-100"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add New Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              The vendor &quot;{pendingVendorName}&quot; does not exist in the system.
              {onCreateNew
                ? ' Would you like to create it now?'
                : ' Please contact your administrator to add this vendor.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCreate}>Cancel</AlertDialogCancel>
            {onCreateNew && (
              <AlertDialogAction onClick={handleConfirmCreate}>
                Create Vendor
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
