'use client';

/**
 * Stat Badges - Reusable badge components for stat cards
 *
 * Used in invoice detail panel hero cards to display:
 * - Invoice type (recurring/non-recurring)
 * - TDS percentage
 * - Payment progress
 * - Payment status icons
 *
 * All badges share consistent sizing through BadgeSize.
 */

import * as React from 'react';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger';

export interface BaseBadgeProps {
  /** Size of the badge */
  size?: BadgeSize;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Size Configuration
// ============================================================================

const sizeConfig = {
  sm: {
    container: 'h-8 w-8',
    text: 'text-xs',
    smallText: 'text-[8px]',
    icon: 'h-4 w-4',
    strokeWidth: 2,
    radius: 15, // (32 - 2) / 2 = 15, stroke reaches edge
    viewBox: 32,
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-sm',
    smallText: 'text-[10px]',
    icon: 'h-5 w-5',
    strokeWidth: 3,
    radius: 18.5, // (40 - 3) / 2 = 18.5, stroke reaches edge
    viewBox: 40,
  },
  lg: {
    container: 'h-12 w-12',
    text: 'text-base',
    smallText: 'text-xs',
    icon: 'h-6 w-6',
    strokeWidth: 4,
    radius: 22, // (48 - 4) / 2 = 22, stroke reaches edge
    viewBox: 48,
  },
};

// ============================================================================
// Variant Styles
// ============================================================================

const variantStyles = {
  text: {
    default: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  },
  border: {
    default: 'border-muted-foreground/30',
    success: 'border-green-500',
    warning: 'border-amber-500',
    danger: 'border-red-500',
  },
  bg: {
    default: 'bg-muted/50',
    success: 'bg-green-100 dark:bg-green-950/50',
    warning: 'bg-amber-100 dark:bg-amber-950/50',
    danger: 'bg-red-100 dark:bg-red-950/50',
  },
  stroke: {
    default: 'stroke-muted-foreground',
    success: 'stroke-green-500 dark:stroke-green-400',
    warning: 'stroke-amber-500 dark:stroke-amber-400',
    danger: 'stroke-red-500 dark:stroke-red-400',
  },
};

// ============================================================================
// Recurring Badge - (R) in colored circle
// ============================================================================

export type RecurringBadgeProps = BaseBadgeProps;

export function RecurringBadge({ size = 'md', className }: RecurringBadgeProps) {
  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full',
        'bg-muted-0 shadow-[inset_0_0_0_3px_#f97316] dark:bg-muted-0 dark:shadow-[inset_0_0_0_3px_#f97316]',
        config.container,
        className
      )}
    >
      <span className={cn('font-bold text-orange-600 dark:text-orange-400', config.text)}>
        R
      </span>
    </div>
  );
}

// ============================================================================
// Non-Recurring Badge - (R) with strikethrough
// ============================================================================

export type NonRecurringBadgeProps = BaseBadgeProps;

export function NonRecurringBadge({ size = 'md', className }: NonRecurringBadgeProps) {
  const config = sizeConfig[size];
  // Strikethrough width scales with size
  const strikeWidth = size === 'sm' ? 'w-8' : size === 'lg' ? 'w-13' : 'w-10';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full',
        'bg-muted/0 shadow-[inset_0_0_0_1px_rgba(100,116,139,0.3)]',
        config.container,
        className
      )}
    >
      <span className={cn('font-regular text-muted-foreground/30', config.text)}>R</span>
      {/* Strikethrough line */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn('h-[2px] rotate-45 bg-[rgba(100,116,139,0.3)] hidden', strikeWidth)} />
      </div>
    </div>
  );
}

// ============================================================================
// Percentage Badge - [X%] rounded badge
// ============================================================================

export interface PercentageBadgeProps extends BaseBadgeProps {
  /** The percentage value to display */
  value: number | string;
}

export function PercentageBadge({ value, size = 'md', className }: PercentageBadgeProps) {
  const config = sizeConfig[size];
  const displayValue = typeof value === 'number' ? `${value}%` : value;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-muted/80',
        config.container,
        className
      )}
    >
      <span className={cn('font-semibold text-muted-foreground', config.smallText)}>
        {displayValue}
      </span>
    </div>
  );
}

// ============================================================================
// Circular Progress Badge - SVG ring with percentage
// ============================================================================

export interface CircularProgressBadgeProps extends BaseBadgeProps {
  /** Progress percentage (0-100) */
  percentage: number;
  /** Color variant */
  variant?: BadgeVariant;
  /** Whether to show percentage text */
  showText?: boolean;
}

export function CircularProgressBadge({
  percentage,
  variant = 'default',
  size = 'md',
  showText = false,
  className,
}: CircularProgressBadgeProps) {
  const config = sizeConfig[size];
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  return (
    <div className={cn('relative flex items-center justify-center', config.container, className)}>
      <svg
        className={cn(config.container, '-rotate-90')}
        viewBox={`0 0 ${config.viewBox} ${config.viewBox}`}
      >
        {/* Background circle */}
        <circle
          cx={config.viewBox / 2}
          cy={config.viewBox / 2}
          r={config.radius}
          fill="none"
          strokeWidth={config.strokeWidth}
          className="stroke-muted/50"
        />
        {/* Progress circle */}
        <circle
          cx={config.viewBox / 2}
          cy={config.viewBox / 2}
          r={config.radius}
          fill="none"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          className={cn('transition-all duration-500', variantStyles.stroke[variant])}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      {/* Percentage text */}
      {showText && (
        <span className={cn('absolute font-bold', config.smallText, variantStyles.text[variant])}>
          {clampedPercentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Status Icon Badge - ✓/⚠/◷ based on variant
// ============================================================================

export interface StatusIconBadgeProps extends BaseBadgeProps {
  /** Color variant determines which icon to show */
  variant?: BadgeVariant;
}

export function StatusIconBadge({ variant = 'default', size = 'md', className }: StatusIconBadgeProps) {
  const config = sizeConfig[size];
  const Icon =
    variant === 'success' ? CheckCircle :
    variant === 'danger' ? AlertTriangle :
    Clock;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full',
        variantStyles.bg[variant],
        config.container,
        className
      )}
    >
      <Icon className={cn(variantStyles.text[variant], config.icon)} />
    </div>
  );
}

// ============================================================================
// Badge Factory - Render badge by type
// ============================================================================

export type BadgeType =
  | 'none'
  | 'recurring'
  | 'non-recurring'
  | 'percentage'
  | 'progress'
  | 'status-icon';

export interface StatBadgeProps extends BaseBadgeProps {
  /** Type of badge to render */
  type: BadgeType;
  /** Value for percentage or progress badges */
  value?: number | string;
  /** Color variant */
  variant?: BadgeVariant;
  /** Legacy icon support (deprecated) */
  icon?: React.ReactNode;
}

/**
 * Factory component that renders the appropriate badge based on type
 */
export function StatBadge({
  type,
  value,
  variant = 'default',
  size = 'md',
  icon,
  className,
}: StatBadgeProps) {
  // Legacy icon support (backwards compatibility)
  if (type === 'none' || !type) {
    if (icon) {
      return (
        <div className={cn('flex items-center justify-center rounded-lg bg-muted/50 p-2', className)}>
          {icon}
        </div>
      );
    }
    return null;
  }

  switch (type) {
    case 'recurring':
      return <RecurringBadge size={size} className={className} />;
    case 'non-recurring':
      return <NonRecurringBadge size={size} className={className} />;
    case 'percentage':
      return <PercentageBadge value={value ?? 0} size={size} className={className} />;
    case 'progress':
      return (
        <CircularProgressBadge
          percentage={Number(value) || 0}
          variant={variant}
          size={size}
          className={className}
        />
      );
    case 'status-icon':
      return <StatusIconBadge variant={variant} size={size} className={className} />;
    default:
      return null;
  }
}

export default StatBadge;
