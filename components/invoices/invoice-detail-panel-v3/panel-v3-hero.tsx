'use client';

/**
 * Panel V3 Hero Component
 *
 * Displays key invoice stats with contextual badges:
 * - Inv Amount: (R) recurring or (R̸) non-recurring badge
 * - TDS Deducted: [X%] percentage badge
 * - Total Paid: Circular progress ring with colored background
 * - Remaining: Status icon (✓/⚠/◷) based on payment status
 */

import * as React from 'react';
import { PanelStatGroup, type StatItem } from '@/components/panels/shared';
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
  /** Whether this is a recurring invoice */
  isRecurring?: boolean;
  /** Invoice due date for determining overdue status */
  dueDate?: Date | string | null;
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

/**
 * Determine if an invoice is overdue
 */
function isOverdue(dueDate: Date | string | null | undefined): boolean {
  if (!dueDate) return false;
  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Determine payment status variant based on payment progress and due date
 */
function getPaymentVariant(
  progressPercentage: number,
  dueDate: Date | string | null | undefined
): 'success' | 'warning' | 'danger' {
  // Fully paid = success
  if (progressPercentage >= 100) {
    return 'success';
  }
  // Not fully paid and overdue = danger
  if (isOverdue(dueDate)) {
    return 'danger';
  }
  // Not fully paid but not overdue = warning
  return 'warning';
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
  isRecurring = false,
  dueDate,
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

  // Determine payment status variant (success/warning/danger)
  const paymentVariant = getPaymentVariant(progressPercentage, dueDate);

  // Build stat items with new badge system
  const stats: StatItem[] = [
    // Inv Amount card with recurring/non-recurring badge
    {
      label: 'Inv Amount',
      value: formatCurrency(invoiceAmount, currencyCode),
      variant: 'default',
      badgeType: isRecurring ? 'recurring' : 'non-recurring',
    },
  ];

  // Add TDS card if applicable with percentage badge
  if (tdsApplicable) {
    stats.push({
      label: 'TDS Deducted',
      value: formatCurrency(tdsAmount, currencyCode),
      valueIndicator: tdsRounded ? 'rounded-up' : null,
      variant: 'default',
      badgeType: 'percentage',
      badgeValue: tdsPercentage ?? 0,
    });
  }

  // Add Total Paid card with circular progress
  stats.push({
    label: 'Total Paid',
    value: formatCurrency(totalPaid, currencyCode),
    variant: paymentVariant,
    badgeType: 'progress',
    badgeValue: progressPercentage,
    badgeVariant: paymentVariant,
  });

  // Add Remaining card with status icon
  stats.push({
    label: 'Remaining',
    value: formatCurrency(Math.max(remainingBalance, 0), currencyCode),
    variant: 'default', // Always muted background
    badgeType: 'status-icon',
    badgeVariant: paymentVariant, // Icon color matches payment status
  });

  // Determine column count based on whether TDS is shown
  const columns = tdsApplicable ? 4 : 3;

  return (
    <PanelStatGroup stats={stats} columns={columns as 2 | 3 | 4} />
  );
}

export default PanelV3Hero;
