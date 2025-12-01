'use client';

/**
 * KPI Card Component (v3)
 *
 * Displays key performance indicators with:
 * - Icon in colored container
 * - Label and value
 * - Change percentage badge (positive/negative)
 *
 * Matches the mockup design:
 * ┌─────────────────────────────────────┐
 * │ [Icon]                [Change Badge]│
 * │                                     │
 * │ Label (small, muted)                │
 * │ ₹2,42,350 (large, bold)             │
 * └─────────────────────────────────────┘
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Variants
// ============================================================================

const kpiCardVariants = cva('p-5 transition-all duration-200 hover:shadow-md hover:border-border/80', {
  variants: {
    status: {
      default: '',
      success: 'border-green-500/20',
      warning: 'border-orange-500/20',
      danger: 'border-red-500/20',
    },
  },
  defaultVariants: {
    status: 'default',
  },
});

const iconContainerVariants = cva(
  'flex h-10 w-10 items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        primary: 'bg-primary/10 text-primary',
        success: 'bg-green-500/10 text-green-500',
        warning: 'bg-orange-500/10 text-orange-500',
        danger: 'bg-red-500/10 text-red-500',
        info: 'bg-blue-500/10 text-blue-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const changeBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      trend: {
        up: 'bg-green-500/10 text-green-500',
        down: 'bg-red-500/10 text-red-500',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      trend: 'neutral',
    },
  }
);

// ============================================================================
// Types
// ============================================================================

export interface KPICardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiCardVariants> {
  /** Card label/title */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Icon component to display */
  icon: LucideIcon;
  /** Icon container color variant */
  iconVariant?: VariantProps<typeof iconContainerVariants>['variant'];
  /** Change percentage (e.g., 12.5 for +12.5%) */
  changePercent?: number;
  /** Whether change is positive (up) or negative (down) */
  changeTrend?: 'up' | 'down' | 'neutral';
  /** Optional subtitle text */
  subtitle?: string;
}

// ============================================================================
// Component
// ============================================================================

export function KPICard({
  label,
  value,
  icon: Icon,
  iconVariant = 'default',
  changePercent,
  changeTrend,
  subtitle,
  status,
  className,
  ...props
}: KPICardProps) {
  // Determine trend direction from percent if not explicitly set
  const effectiveTrend =
    changeTrend ?? (changePercent ? (changePercent >= 0 ? 'up' : 'down') : 'neutral');

  // Format the change percent for display
  const formattedChange = changePercent
    ? `${changePercent >= 0 ? '+' : ''}${Math.abs(changePercent).toFixed(1)}%`
    : null;

  return (
    <Card className={cn(kpiCardVariants({ status }), className)} {...props}>
      {/* Header: Icon + Change Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className={cn(iconContainerVariants({ variant: iconVariant }))}>
          <Icon className="h-5 w-5" />
        </div>

        {formattedChange && (
          <div className={cn(changeBadgeVariants({ trend: effectiveTrend }))}>
            {effectiveTrend === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : effectiveTrend === 'down' ? (
              <TrendingDown className="h-3 w-3" />
            ) : null}
            <span>{formattedChange}</span>
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-sm text-muted-foreground mb-1">{label}</p>

      {/* Value */}
      <p className="text-2xl font-bold tracking-tight">{value}</p>

      {/* Optional subtitle */}
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </Card>
  );
}

// ============================================================================
// Grid Container
// ============================================================================

export interface KPIGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function KPIGrid({ children, className, ...props }: KPIGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default KPICard;
