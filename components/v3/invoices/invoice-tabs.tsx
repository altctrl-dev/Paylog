'use client';

/**
 * Invoice Tabs Component (v3)
 *
 * Modern tab navigation for switching between invoice views:
 * - Recurring: Shows recurring invoice cards
 * - All: Shows all invoices in a table/list
 * - TDS: Shows TDS-related invoices
 *
 * Design: Clean underline-style tabs with subtle hover states
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type InvoiceTab = 'recurring' | 'all' | 'tds';

export interface InvoiceTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected tab */
  value: InvoiceTab;
  /** Callback when tab selection changes */
  onChange: (tab: InvoiceTab) => void;
}

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: InvoiceTab;
  label: string;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'recurring', label: 'Recurring' },
  { id: 'all', label: 'All Invoices' },
  { id: 'tds', label: 'TDS' },
];

// ============================================================================
// Variants
// ============================================================================

const tabVariants = cva(
  [
    'w-[170px] py-1.5',
    'text-sm font-medium font-bold text-center',
    'transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'rounded-md',
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

export function InvoiceTabs({
  value,
  onChange,
  className,
  ...props
}: InvoiceTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Invoice views"
      className={cn(
        'inline-flex items-center p-1 rounded-lg',
        'bg-muted/40',
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
// Pill Variant - Contained tabs with background
// ============================================================================

const pillTabVariants = cva(
  [
    'inline-flex items-center justify-center px-4 py-2 rounded-lg',
    'text-sm font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  ],
  {
    variants: {
      state: {
        active: 'bg-primary text-primary-foreground shadow-sm',
        inactive: 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
      },
    },
    defaultVariants: {
      state: 'inactive',
    },
  }
);

export interface InvoiceTabsPillProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected tab */
  value: InvoiceTab;
  /** Callback when tab selection changes */
  onChange: (tab: InvoiceTab) => void;
}

/**
 * Pill-style tabs with contained background
 */
export function InvoiceTabsPill({
  value,
  onChange,
  className,
  ...props
}: InvoiceTabsPillProps) {
  return (
    <div
      role="tablist"
      aria-label="Invoice views"
      className={cn('inline-flex items-center gap-1 p-1 rounded-lg bg-muted/30', className)}
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
            className={cn(pillTabVariants({ state: isActive ? 'active' : 'inactive' }))}
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

export interface InvoiceTabsCompactProps {
  /** Currently selected tab */
  value: InvoiceTab;
  /** Callback when tab selection changes */
  onChange: (tab: InvoiceTab) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Compact version for mobile - shows as a dropdown-style selector
 * Use this on smaller screens where horizontal tabs don't fit
 */
export function InvoiceTabsCompact({
  value,
  onChange,
  className,
}: InvoiceTabsCompactProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as InvoiceTab)}
        className={cn(
          'appearance-none w-full',
          'px-4 pr-8 py-2 rounded-lg',
          'bg-muted/50 border border-border',
          'text-sm font-medium text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          'cursor-pointer'
        )}
        aria-label="Select invoice view"
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

export interface InvoiceTabsResponsiveProps {
  /** Currently selected tab */
  value: InvoiceTab;
  /** Callback when tab selection changes */
  onChange: (tab: InvoiceTab) => void;
  /** Additional class names */
  className?: string;
  /** Breakpoint to switch from compact to full tabs (default: 'sm') */
  breakpoint?: 'sm' | 'md' | 'lg';
}

/**
 * Responsive wrapper that shows compact selector on mobile
 * and full tabs on larger screens
 */
export function InvoiceTabsResponsive({
  value,
  onChange,
  className,
  breakpoint = 'sm',
}: InvoiceTabsResponsiveProps) {
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
        <InvoiceTabsCompact value={value} onChange={onChange} />
      </div>
      {/* Desktop: Full tabs */}
      <InvoiceTabs value={value} onChange={onChange} className={classes.block} />
    </div>
  );
}

export default InvoiceTabs;
