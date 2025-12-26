/**
 * MultiSelect Component
 *
 * A custom multi-select dropdown with checkbox-based selection.
 * Follows Shadcn/ui styling patterns and design tokens.
 *
 * Features:
 * - Checkbox-based selection (not native <select multiple>)
 * - Selected count badge
 * - "Clear all" button when selections exist
 * - Search/filter for >10 options
 * - Keyboard navigation and accessibility
 * - Dark mode support via CSS variables
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Select items...',
  label,
  className,
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Show search input if more than 10 options
  const showSearch = options.length > 10;

  // Handle option toggle
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  // Handle clear all
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setIsOpen(false);
  };

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Display text for the trigger button
  const displayText =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((opt) => opt.value === value[0])?.label || placeholder
        : `${value.length} selected`;

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label
          className="mb-2 block text-sm font-medium text-foreground"
          id={`${label}-label`}
        >
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-0 focus:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOpen && 'ring-2 ring-ring ring-offset-2'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${label}-label` : undefined}
        aria-disabled={disabled}
      >
        <span
          className={cn(
            'truncate',
            value.length === 0 && 'text-muted-foreground'
          )}
        >
          {displayText}
        </span>

        {/* Selected count badge */}
        {value.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="ml-2">
              {value.length}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={handleClearAll}
              aria-label="Clear all selections"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-50 hover:opacity-100"
              >
                <path
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                  fill="currentColor"
                  fillRule="evenodd"
                  clipRule="evenodd"
                ></path>
              </svg>
            </Button>
          </div>
        )}

        {/* Dropdown arrow icon */}
        {value.length === 0 && (
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(
              'ml-2 h-4 w-4 opacity-50 transition-transform',
              isOpen && 'rotate-180'
            )}
          >
            <path
              d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.6148C7.64964 10.7951 7.35036 10.7951 7.15803 10.6148L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            ></path>
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-full rounded-md border border-input bg-background shadow-md',
            'max-h-[300px] overflow-y-auto'
          )}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Search input for large lists */}
          {showSearch && (
            <div className="border-b border-input p-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
                aria-label="Search options"
              />
            </div>
          )}

          {/* Options list */}
          <div className="p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                      'transition-colors',
                      isSelected && 'bg-accent/50'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(option.value)}
                      className={cn(
                        'h-4 w-4 rounded border-input bg-background',
                        'focus:ring-0',
                        'cursor-pointer'
                      )}
                      aria-label={option.label}
                    />
                    <span className="flex-1 truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>

          {/* Clear all button (footer) */}
          {value.length > 0 && (
            <div className="border-t border-input p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full"
                onClick={handleClearAll}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
