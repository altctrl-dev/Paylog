'use client';

/**
 * Report Tabs Component (v3)
 *
 * Modern tab navigation for switching between report views:
 * - Consolidated: Shows all invoices in a consolidated report view
 * - TDS: Shows TDS-related reports
 * - Ledger: Shows ledger reports
 * - Categorized: Shows categorized reports (coming soon)
 *
 * Design: Clean underline-style tabs with subtle hover states
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type ReportTab = 'monthly' | 'consolidated' | 'tds' | 'ledger' | 'categorized';

export interface ReportTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected tab */
  value: ReportTab;
  /** Callback when tab selection changes */
  onChange: (tab: ReportTab) => void;
}

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: ReportTab;
  label: string;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'consolidated', label: 'Consolidated' },
  { id: 'tds', label: 'TDS' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'categorized', label: 'Categorized' },
];

// ============================================================================
// Variants
// ============================================================================

const tabVariants = cva(
  [
    'w-[140px] py-1.5',
    'text-sm font-medium font-bold text-center',
    'transition-all duration-200',
    'focus:outline-none focus:ring-0 focus-visible:border-primary',
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

export function ReportTabs({
  value,
  onChange,
  className,
  ...props
}: ReportTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Report views"
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
// Mobile Variant - Compact Selector
// ============================================================================

export interface ReportTabsCompactProps {
  /** Currently selected tab */
  value: ReportTab;
  /** Callback when tab selection changes */
  onChange: (tab: ReportTab) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Compact version for mobile - shows as a dropdown-style selector
 * Use this on smaller screens where horizontal tabs don't fit
 */
export function ReportTabsCompact({
  value,
  onChange,
  className,
}: ReportTabsCompactProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ReportTab)}
        className={cn(
          'appearance-none w-full',
          'px-4 pr-8 py-2 rounded-lg',
          'bg-muted/50 border border-border',
          'text-sm font-medium text-foreground',
          'focus:outline-none focus:ring-0',
          'cursor-pointer'
        )}
        aria-label="Select report view"
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

export interface ReportTabsResponsiveProps {
  /** Currently selected tab */
  value: ReportTab;
  /** Callback when tab selection changes */
  onChange: (tab: ReportTab) => void;
  /** Additional class names */
  className?: string;
  /** Breakpoint to switch from compact to full tabs (default: 'sm') */
  breakpoint?: 'sm' | 'md' | 'lg';
}

/**
 * Responsive wrapper that shows compact selector on mobile
 * and full tabs on larger screens
 */
export function ReportTabsResponsive({
  value,
  onChange,
  className,
  breakpoint = 'sm',
}: ReportTabsResponsiveProps) {
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
        <ReportTabsCompact value={value} onChange={onChange} />
      </div>
      {/* Desktop: Full tabs */}
      <ReportTabs value={value} onChange={onChange} className={classes.block} />
    </div>
  );
}

export default ReportTabs;
