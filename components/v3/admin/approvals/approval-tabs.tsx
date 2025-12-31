'use client';

/**
 * Approval Tabs Component (v3)
 *
 * Sub-tab navigation for switching between approval request types:
 * - Invoice Requests: Pending invoice approvals
 * - Payment Requests: Pending payment approvals
 * - Vendor Requests: Pending vendor approvals
 * - Archive Requests: Pending archive approvals
 *
 * Features:
 * - Badge counts showing pending items per category
 * - Responsive design (desktop tabs + mobile select)
 * - Consistent styling with MasterDataTabs
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Types
// ============================================================================

export type ApprovalTab = 'invoices' | 'payments' | 'vendors' | 'archives';

export interface ApprovalTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected tab */
  value: ApprovalTab;
  /** Callback when tab selection changes */
  onChange: (tab: ApprovalTab) => void;
  /** Pending counts for each tab */
  counts?: {
    invoices: number;
    payments: number;
    vendors: number;
    archives: number;
  };
}

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: ApprovalTab;
  label: string;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'invoices', label: 'Invoice Requests' },
  { id: 'payments', label: 'Payment Requests' },
  { id: 'vendors', label: 'Vendor Requests' },
  { id: 'archives', label: 'Archive Requests' },
];

// ============================================================================
// Variants
// ============================================================================

const tabVariants = cva(
  [
    'px-4 py-1.5',
    'text-sm font-medium font-bold text-center',
    'transition-all duration-200',
    'focus:outline-none focus:ring-0 focus-visible:border-primary',
    'rounded-md',
    'whitespace-nowrap',
    'inline-flex items-center gap-2',
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

export function ApprovalTabs({
  value,
  onChange,
  counts,
  className,
  ...props
}: ApprovalTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Approval request views"
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
        const count = counts?.[tab.id] ?? 0;

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
            {count > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 min-w-[20px] h-5 px-1.5 text-xs"
              >
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Mobile Variant - Compact Selector
// ============================================================================

export interface ApprovalTabsCompactProps {
  /** Currently selected tab */
  value: ApprovalTab;
  /** Callback when tab selection changes */
  onChange: (tab: ApprovalTab) => void;
  /** Pending counts for each tab */
  counts?: {
    invoices: number;
    payments: number;
    vendors: number;
    archives: number;
  };
  /** Additional class names */
  className?: string;
}

/**
 * Compact version for mobile - shows as a dropdown-style selector
 * Use this on smaller screens where horizontal tabs don't fit
 */
export function ApprovalTabsCompact({
  value,
  onChange,
  counts,
  className,
}: ApprovalTabsCompactProps) {
  // Build option label with count
  const getOptionLabel = (tab: TabConfig) => {
    const count = counts?.[tab.id] ?? 0;
    return count > 0 ? `${tab.label} (${count})` : tab.label;
  };

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ApprovalTab)}
        className={cn(
          'appearance-none w-full',
          'px-4 pr-8 py-2 rounded-lg',
          'bg-muted/50 border border-border',
          'text-sm font-medium text-foreground',
          'focus:outline-none focus:ring-0',
          'cursor-pointer'
        )}
        aria-label="Select approval request view"
      >
        {TAB_CONFIG.map((tab) => (
          <option key={tab.id} value={tab.id}>
            {getOptionLabel(tab)}
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

export interface ApprovalTabsResponsiveProps {
  /** Currently selected tab */
  value: ApprovalTab;
  /** Callback when tab selection changes */
  onChange: (tab: ApprovalTab) => void;
  /** Pending counts for each tab */
  counts?: {
    invoices: number;
    payments: number;
    vendors: number;
    archives: number;
  };
  /** Additional class names */
  className?: string;
  /** Breakpoint to switch from compact to full tabs (default: 'md') */
  breakpoint?: 'sm' | 'md' | 'lg';
}

/**
 * Responsive wrapper that shows compact selector on mobile
 * and full tabs on larger screens
 */
export function ApprovalTabsResponsive({
  value,
  onChange,
  counts,
  className,
  breakpoint = 'md',
}: ApprovalTabsResponsiveProps) {
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
        <ApprovalTabsCompact value={value} onChange={onChange} counts={counts} />
      </div>
      {/* Desktop: Full tabs */}
      <ApprovalTabs
        value={value}
        onChange={onChange}
        counts={counts}
        className={classes.block}
      />
    </div>
  );
}

export default ApprovalTabs;
