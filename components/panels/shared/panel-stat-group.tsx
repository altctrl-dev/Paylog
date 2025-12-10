'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface StatItem {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

export interface PanelStatGroupProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

const cardVariantStyles = {
  default: 'border-border',
  success: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
  warning: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
  danger: 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
};

const iconVariantStyles = {
  default: 'text-muted-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const valueVariantStyles = {
  default: 'text-foreground',
  success: 'text-green-700 dark:text-green-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-red-700 dark:text-red-300',
};

const columnStyles = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
};

// ============================================================================
// Sub-Components
// ============================================================================

interface StatCardProps {
  stat: StatItem;
}

function StatCard({ stat }: StatCardProps) {
  const { label, value, subtitle, variant = 'default', icon } = stat;

  return (
    <Card className={cn('p-4 transition-colors', cardVariantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-lg font-bold tracking-tight', valueVariantStyles[variant])}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={cn('p-2 rounded-lg bg-muted/50', iconVariantStyles[variant])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PanelStatGroup({ stats, columns = 4, className }: PanelStatGroupProps) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid gap-4', columnStyles[columns], className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </div>
  );
}

export default PanelStatGroup;
