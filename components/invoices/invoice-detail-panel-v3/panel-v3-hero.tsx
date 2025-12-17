'use client';

/**
 * Panel V3 Hero Component
 *
 * Displays key invoice stats and payment progress:
 * - 4 stat cards (Invoice Amount, TDS, Total Paid, Remaining)
 * - Progress bar showing payment completion
 */

import * as React from 'react';
import { IndianRupee, AlertCircle, CheckCircle } from 'lucide-react';
import { PanelStatGroup, type StatItem } from '@/components/panels/shared';
import { cn } from '@/lib/utils';
import { calculateTds } from '@/lib/utils/tds';

// ============================================================================
// Types
// ============================================================================

export interface PanelV3HeroProps {
  invoiceAmount: number;
  totalPaid: number;
  remainingBalance: number;
  tdsApplicable: boolean;
  tdsPercentage?: number | null;
  tdsRounded?: boolean; // BUG-003: Invoice-level TDS rounding preference
  currencyCode?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format number as currency with proper locale
 */
function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ProgressBarProps {
  percentage: number;
}

function ProgressBar({ percentage }: ProgressBarProps) {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Payment Progress</span>
        <span className="font-medium">{clampedPercentage.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            clampedPercentage >= 100
              ? 'bg-green-500 dark:bg-green-400'
              : clampedPercentage >= 50
                ? 'bg-primary'
                : 'bg-amber-500 dark:bg-amber-400'
          )}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PanelV3Hero({
  invoiceAmount,
  totalPaid,
  remainingBalance,
  tdsApplicable,
  tdsPercentage,
  tdsRounded = false, // BUG-003: Invoice-level TDS rounding preference
  currencyCode = 'INR',
}: PanelV3HeroProps) {
  // Calculate TDS amount using invoice's tds_rounded preference (BUG-003)
  const tdsAmount = tdsApplicable && tdsPercentage
    ? calculateTds(invoiceAmount, tdsPercentage, tdsRounded).tdsAmount
    : 0;

  // Calculate payable amount (invoice minus TDS if applicable)
  const payableAmount = invoiceAmount - tdsAmount;

  // Calculate payment progress percentage
  const progressPercentage =
    payableAmount > 0 ? (totalPaid / payableAmount) * 100 : 0;

  // Build stat items
  const stats: StatItem[] = [
    {
      label: 'Inv Amount',
      value: formatCurrency(invoiceAmount, currencyCode),
      icon: <IndianRupee className="h-4 w-4" />,
      variant: 'default',
    },
  ];

  // Add TDS card if applicable
  if (tdsApplicable) {
    stats.push({
      label: 'TDS Deducted',
      value: formatCurrency(tdsAmount, currencyCode),
      subtitle: tdsPercentage ? `${tdsPercentage}% TDS` : undefined,
      icon: <IndianRupee className="h-4 w-4" />,
      variant: 'default',
    });
  }

  // Add Total Paid card
  stats.push({
    label: 'Total Paid',
    value: formatCurrency(totalPaid, currencyCode),
    icon: <CheckCircle className="h-4 w-4" />,
    variant: 'success',
  });

  // Add Remaining card
  stats.push({
    label: 'Remaining',
    value: formatCurrency(Math.max(remainingBalance, 0), currencyCode),
    icon: <AlertCircle className="h-4 w-4" />,
    variant: remainingBalance > 0 ? 'warning' : 'success',
  });

  // Determine column count based on whether TDS is shown
  const columns = tdsApplicable ? 4 : 3;

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <PanelStatGroup stats={stats} columns={columns as 2 | 3 | 4} />

      {/* Progress Bar */}
      <ProgressBar percentage={progressPercentage} />
    </div>
  );
}

export default PanelV3Hero;
