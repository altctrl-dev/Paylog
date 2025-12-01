'use client';

/**
 * Invoice Tabs Component (v3)
 *
 * Tab navigation for switching between invoice views:
 * - Recurring: Shows recurring invoice cards
 * - All: Shows all invoices in a table/list
 * - TDS: Shows TDS-related invoices
 *
 * Design:
 * ┌─────────────────────────────────────────────────┐
 * │ [Recurring]    [All]    [TDS]                   │
 * └─────────────────────────────────────────────────┘
 *
 * Styling:
 * - Active: Blue/10% bg, Blue-400 text
 * - Inactive: Gray-400 text
 * - Hover: Gray-800 bg
 * - Padding: 8px 16px
 * - Border radius: 8px
 * - Gap: 4px
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { RefreshCw, List, Receipt } from 'lucide-react';
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
  icon: React.ComponentType<{ className?: string }>;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'recurring', label: 'Recurring', icon: RefreshCw },
  { id: 'all', label: 'All', icon: List },
  { id: 'tds', label: 'TDS', icon: Receipt },
];

// ============================================================================
// Variants
// ============================================================================

const tabVariants = cva(
  [
    'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
    'text-sm font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'hover:scale-[1.02]',
  ],
  {
    variants: {
      state: {
        active: 'bg-blue-500/10 text-blue-400',
        inactive: 'text-gray-400 hover:bg-gray-800',
      },
    },
    defaultVariants: {
      state: 'inactive',
    },
  }
);

const containerVariants = cva('inline-flex items-center gap-1 p-1 rounded-lg', {
  variants: {
    variant: {
      default: 'bg-transparent',
      contained: 'bg-gray-900/50 border border-gray-800',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

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
      className={cn(containerVariants({ variant: 'default' }), className)}
      {...props}
    >
      {TAB_CONFIG.map((tab) => {
        const isActive = value === tab.id;
        const Icon = tab.icon;

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
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
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
  const activeTab = TAB_CONFIG.find((tab) => tab.id === value);
  const ActiveIcon = activeTab?.icon ?? List;

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as InvoiceTab)}
        className={cn(
          'appearance-none w-full',
          'pl-10 pr-8 py-2 rounded-lg',
          'bg-gray-900/50 border border-gray-800',
          'text-sm font-medium text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
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
      <ActiveIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 pointer-events-none" />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="h-4 w-4 text-gray-400"
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
    sm: { hidden: 'sm:hidden', block: 'hidden sm:flex' },
    md: { hidden: 'md:hidden', block: 'hidden md:flex' },
    lg: { hidden: 'lg:hidden', block: 'hidden lg:flex' },
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
