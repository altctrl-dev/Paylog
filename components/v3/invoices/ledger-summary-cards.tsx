'use client';

/**
 * Ledger Summary Cards Component (v3)
 *
 * Displays summary statistics for a profile's ledger:
 * - Total Invoiced
 * - Total TDS Deducted
 * - Total Paid
 * - Outstanding Balance
 */

import * as React from 'react';
import { IndianRupee, FileText, Receipt, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/format';
import type { LedgerSummary } from '@/types/ledger';

// ============================================================================
// Types
// ============================================================================

interface LedgerSummaryCardsProps {
  summary: LedgerSummary;
  /** Currency code (ISO 4217) for proper currency formatting */
  currencyCode?: string;
  className?: string;
}

interface SummaryCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  /** Currency code (ISO 4217) for proper currency formatting */
  currencyCode?: string;
  className?: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  currencyCode,
  className,
}: SummaryCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20',
    warning: 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
    danger: 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-green-700 dark:text-green-300',
    warning: 'text-amber-700 dark:text-amber-300',
    danger: 'text-red-700 dark:text-red-300',
  };

  return (
    <Card className={cn('p-4 transition-colors', variantStyles[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-2xl font-bold tracking-tight', valueStyles[variant])}>
            {formatCurrency(value, currencyCode)}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-muted/50', iconStyles[variant])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LedgerSummaryCards({ summary, currencyCode, className }: LedgerSummaryCardsProps) {
  const {
    totalInvoiced,
    totalTdsDeducted,
    totalPaid,
    outstandingBalance,
    invoiceCount,
    paymentCount,
    unpaidInvoiceCount,
  } = summary;

  // Determine outstanding balance variant
  const outstandingVariant =
    outstandingBalance <= 0
      ? 'success'
      : unpaidInvoiceCount > 0
        ? 'warning'
        : 'default';

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      <SummaryCard
        title="Total Invoiced"
        value={totalInvoiced}
        subtitle={`${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''}`}
        icon={<FileText className="h-5 w-5" />}
        variant="default"
        currencyCode={currencyCode}
      />

      <SummaryCard
        title="TDS Deducted"
        value={totalTdsDeducted}
        subtitle="Tax deducted at source"
        icon={<Receipt className="h-5 w-5" />}
        variant="default"
        currencyCode={currencyCode}
      />

      <SummaryCard
        title="Total Paid"
        value={totalPaid}
        subtitle={`${paymentCount} payment${paymentCount !== 1 ? 's' : ''}`}
        icon={<IndianRupee className="h-5 w-5" />}
        variant="success"
        currencyCode={currencyCode}
      />

      <SummaryCard
        title="Outstanding"
        value={outstandingBalance}
        subtitle={
          outstandingBalance <= 0
            ? 'Fully paid'
            : `${unpaidInvoiceCount} unpaid invoice${unpaidInvoiceCount !== 1 ? 's' : ''}`
        }
        icon={<AlertCircle className="h-5 w-5" />}
        variant={outstandingVariant}
        currencyCode={currencyCode}
      />
    </div>
  );
}

export default LedgerSummaryCards;
