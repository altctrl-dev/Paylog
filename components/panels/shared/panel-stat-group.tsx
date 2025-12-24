'use client';

/**
 * Panel Stat Group - Displays a grid of stat cards
 *
 * Each card can display a value with an optional badge.
 * Badges are rendered using the reusable stat-badges components.
 */

import * as React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  StatBadge,
  type BadgeType,
  type BadgeVariant,
  type BadgeSize,
} from '@/components/ui/stat-badges';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

// Re-export badge types for convenience
export type { BadgeType, BadgeVariant, BadgeSize };

export interface StatItem {
  /** Label displayed above the value */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Optional indicator icon next to value (e.g., up arrow for rounded) */
  valueIndicator?: 'rounded-up' | 'rounded-down' | null;
  /** Optional subtitle below the value */
  subtitle?: string;
  /** Card background variant */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  /** @deprecated Use badgeType instead */
  icon?: React.ReactNode;
  /** Type of badge to display */
  badgeType?: BadgeType;
  /** Value for the badge (percentage number, status, etc.) */
  badgeValue?: number | string;
  /** Color variant for the badge */
  badgeVariant?: BadgeVariant;
  /** Size of the badge */
  badgeSize?: BadgeSize;
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
  const {
    label,
    value,
    valueIndicator,
    subtitle,
    variant = 'default',
    icon,
    badgeType,
    badgeValue,
    badgeVariant,
    badgeSize = 'md',
  } = stat;

  return (
    <Card className={cn('p-4 transition-colors', cardVariantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn('text-lg font-bold tracking-tight flex items-center gap-1', valueVariantStyles[variant])}>
            {value}
            {valueIndicator === 'rounded-up' && (
              <ArrowUp className="h-4 w-4 text-orange-500" />
            )}
            {valueIndicator === 'rounded-down' && (
              <ArrowDown className="h-4 w-4 text-orange-500" />
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <StatBadge
          type={badgeType ?? 'none'}
          value={badgeValue}
          variant={badgeVariant}
          size={badgeSize}
          icon={icon}
        />
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
    <div className={cn('grid gap-2', columnStyles[columns], className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </div>
  );
}

export default PanelStatGroup;
