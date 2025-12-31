'use client';

/**
 * Admin Tabs Component (v3)
 *
 * Modern tab navigation for switching between admin views:
 * - Approvals: Pending approvals for invoices, payments, vendors, archives
 * - Master Data: Master data management (with sub-tabs)
 * - User Management: User management (super_admin only)
 *
 * Design: Clean pill-style tabs with subtle hover states (matches Invoice/Settings tabs)
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type AdminTab = 'approvals' | 'master-data' | 'users';

export interface AdminTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected tab */
  value: AdminTab;
  /** Callback when tab selection changes */
  onChange: (tab: AdminTab) => void;
  /** Whether user is super_admin (shows User Management tab) */
  isSuperAdmin?: boolean;
}

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: AdminTab;
  label: string;
  superAdminOnly?: boolean;
}

const TAB_CONFIG: TabConfig[] = [
  { id: 'approvals', label: 'Approvals' },
  { id: 'master-data', label: 'Master Data' },
  { id: 'users', label: 'User Management', superAdminOnly: true },
];

// ============================================================================
// Variants
// ============================================================================

const tabVariants = cva(
  [
    'w-[170px] py-1.5',
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

export function AdminTabs({
  value,
  onChange,
  isSuperAdmin = false,
  className,
  ...props
}: AdminTabsProps) {
  const visibleTabs = TAB_CONFIG.filter(
    (tab) => !tab.superAdminOnly || isSuperAdmin
  );

  return (
    <div
      role="tablist"
      aria-label="Admin views"
      className={cn(
        'inline-flex items-center p-1 rounded-lg',
        'bg-muted/40',
        className
      )}
      {...props}
    >
      {visibleTabs.map((tab) => {
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

export interface AdminTabsCompactProps {
  /** Currently selected tab */
  value: AdminTab;
  /** Callback when tab selection changes */
  onChange: (tab: AdminTab) => void;
  /** Whether user is super_admin (shows User Management tab) */
  isSuperAdmin?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Compact version for mobile - shows as a dropdown-style selector
 * Use this on smaller screens where horizontal tabs don't fit
 */
export function AdminTabsCompact({
  value,
  onChange,
  isSuperAdmin = false,
  className,
}: AdminTabsCompactProps) {
  const visibleTabs = TAB_CONFIG.filter(
    (tab) => !tab.superAdminOnly || isSuperAdmin
  );

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AdminTab)}
        className={cn(
          'appearance-none w-full',
          'px-4 pr-8 py-2 rounded-lg',
          'bg-muted/50 border border-border',
          'text-sm font-medium text-foreground',
          'focus:outline-none focus:ring-0',
          'cursor-pointer'
        )}
        aria-label="Select admin view"
      >
        {visibleTabs.map((tab) => (
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

export interface AdminTabsResponsiveProps {
  /** Currently selected tab */
  value: AdminTab;
  /** Callback when tab selection changes */
  onChange: (tab: AdminTab) => void;
  /** Whether user is super_admin (shows User Management tab) */
  isSuperAdmin?: boolean;
  /** Additional class names */
  className?: string;
  /** Breakpoint to switch from compact to full tabs (default: 'sm') */
  breakpoint?: 'sm' | 'md' | 'lg';
}

/**
 * Responsive wrapper that shows compact selector on mobile
 * and full tabs on larger screens
 */
export function AdminTabsResponsive({
  value,
  onChange,
  isSuperAdmin = false,
  className,
  breakpoint = 'sm',
}: AdminTabsResponsiveProps) {
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
        <AdminTabsCompact value={value} onChange={onChange} isSuperAdmin={isSuperAdmin} />
      </div>
      {/* Desktop: Full tabs */}
      <AdminTabs
        value={value}
        onChange={onChange}
        isSuperAdmin={isSuperAdmin}
        className={classes.block}
      />
    </div>
  );
}

export default AdminTabs;
