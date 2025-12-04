'use client';

/**
 * Master Data Tabs Component (v3)
 *
 * Modern tab navigation for switching between master data management views:
 * - All Requests: Master data change requests
 * - Vendors: Vendor management
 * - Categories: Category management
 * - Entities: Entity management
 * - Payment Types: Payment type management
 * - Currencies: Currency management
 * - Invoice Profiles: Invoice profile management
 *
 * Design: Clean pill-style tabs with subtle hover states (matches Invoice/Settings/Admin tabs)
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type MasterDataTab =
  | 'requests'
  | 'vendors'
  | 'categories'
  | 'entities'
  | 'payment-types'
  | 'currencies'
  | 'profiles';

export interface MasterDataTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected tab */
  value: MasterDataTab;
  /** Callback when tab selection changes */
  onChange: (tab: MasterDataTab) => void;
}

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: MasterDataTab;
  label: string;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'requests', label: 'All Requests' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'categories', label: 'Categories' },
  { id: 'entities', label: 'Entities' },
  { id: 'payment-types', label: 'Payment Types' },
  { id: 'currencies', label: 'Currencies' },
  { id: 'profiles', label: 'Invoice Profiles' },
];

// ============================================================================
// Variants
// ============================================================================

const tabVariants = cva(
  [
    'px-4 py-1.5',
    'text-sm font-medium font-bold text-center',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'rounded-md',
    'whitespace-nowrap',
  ],
  {
    variants: {
      state: {
        active: 'bg-background text-foreground shadow-sm border border-border/50',
        inactive: 'text-muted-foreground hover:text-foreground',
      },
    },
    defaultVariants: {
      state: 'inactive',
    },
  }
);

// ============================================================================
// Component
// ============================================================================

export function MasterDataTabs({
  value,
  onChange,
  className,
  ...props
}: MasterDataTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Master data views"
      className={cn(
        'inline-flex items-center p-1 rounded-lg',
        'bg-muted/40',
        'overflow-x-auto',
        className
      )}
      {...props}
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = value === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={cn(tabVariants({ state: isActive ? 'active' : 'inactive' }))}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Mobile Variant - Compact Selector
// ============================================================================

export interface MasterDataTabsCompactProps {
  /** Currently selected tab */
  value: MasterDataTab;
  /** Callback when tab selection changes */
  onChange: (tab: MasterDataTab) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Compact version for mobile - shows as a dropdown-style selector
 * Use this on smaller screens where horizontal tabs don't fit
 */
export function MasterDataTabsCompact({
  value,
  onChange,
  className,
}: MasterDataTabsCompactProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MasterDataTab)}
        className={cn(
          'appearance-none w-full',
          'px-4 pr-8 py-2 rounded-lg',
          'bg-muted/50 border border-border',
          'text-sm font-medium text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          'cursor-pointer'
        )}
        aria-label="Select master data view"
      >
        {TAB_CONFIG.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {tab.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="h-4 w-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Responsive Wrapper
// ============================================================================

export interface MasterDataTabsResponsiveProps {
  /** Currently selected tab */
  value: MasterDataTab;
  /** Callback when tab selection changes */
  onChange: (tab: MasterDataTab) => void;
  /** Additional class names */
  className?: string;
  /** Breakpoint to switch from compact to full tabs (default: 'md') */
  breakpoint?: 'sm' | 'md' | 'lg';
}

/**
 * Responsive wrapper that shows compact selector on mobile
 * and full tabs on larger screens
 */
export function MasterDataTabsResponsive({
  value,
  onChange,
  className,
  breakpoint = 'md',
}: MasterDataTabsResponsiveProps) {
  const breakpointClasses = {
    sm: { hidden: 'sm:hidden', block: 'hidden sm:inline-flex' },
    md: { hidden: 'md:hidden', block: 'hidden md:inline-flex' },
    lg: { hidden: 'lg:hidden', block: 'hidden lg:inline-flex' },
  };

  const classes = breakpointClasses[breakpoint];

  return (
    <div className={className}>
      {/* Mobile: Compact selector */}
      <div className={classes.hidden}>
        <MasterDataTabsCompact value={value} onChange={onChange} />
      </div>
      {/* Desktop: Full tabs */}
      <MasterDataTabs value={value} onChange={onChange} className={classes.block} />
    </div>
  );
}

export default MasterDataTabs;
