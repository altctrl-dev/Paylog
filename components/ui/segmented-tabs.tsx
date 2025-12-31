'use client';

/**
 * Segmented Tabs Component
 *
 * A modern segmented control tab switcher for use across the site.
 * Compact container that wraps tightly around tabs with active pill highlight.
 *
 * Usage:
 * ```tsx
 * <SegmentedTabs
 *   tabs={[
 *     { id: 'profile', label: 'Profile' },
 *     { id: 'security', label: 'Security' },
 *     { id: 'activities', label: 'Activities' },
 *   ]}
 *   value="security"
 *   onChange={(id) => setActiveTab(id)}
 * />
 * ```
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
}

export interface SegmentedTabsProps<T extends string = string>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Array of tab items */
  tabs: TabItem<T>[];
  /** Currently selected tab ID */
  value: T;
  /** Callback when tab selection changes */
  onChange: (id: T) => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// Component
// ============================================================================

export function SegmentedTabs<T extends string = string>({
  tabs,
  value,
  onChange,
  size = 'md',
  className,
  ...props
}: SegmentedTabsProps<T>) {
  const sizeClasses = {
    sm: {
      container: 'p-0.5 rounded-md',
      tab: 'min-w-[80px] py-1.5 text-xs rounded',
    },
    md: {
      container: 'p-1 rounded-lg',
      tab: 'min-w-[100px] py-2 text-sm rounded-md',
    },
    lg: {
      container: 'p-1.5 rounded-xl',
      tab: 'min-w-[120px] py-2.5 text-base rounded-lg',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center',
        'bg-muted',
        sizes.container,
        className
      )}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = value === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={cn(
              'font-medium text-center',
              'transition-all duration-200',
              'focus:outline-none focus:ring-0 focus-visible:border-primary',
              sizes.tab,
              isActive
                ? 'bg-background text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
