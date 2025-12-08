'use client';

/**
 * Recurring Invoice Card Component (v3)
 *
 * Displays recurring invoice information with:
 * - Header: Amount with status-based coloring + action buttons
 * - Title: Vendor info + status icon
 * - Stats: Unpaid count + timing info
 * - Last invoice info section
 * - Status badges showing overdue/due/paid status
 *
 * Design:
 * ┌─────────────────────────────────────────┐
 * │ ₹1,00,000          [+] [...]            │
 * │ Pending Amount                          │
 * ├─────────────────────────────────────────┤
 * │ Vendor Name               [Status Icon] │
 * │ #12345                                  │
 * ├─────────────────────────────────────────┤
 * │ 3 Unpaid          2d Next Invoice       │
 * ├─────────────────────────────────────────┤
 * │ Last Invoice: 15 Nov 2024               │
 * │ Last Paid: 10 Nov 2024                  │
 * ├─────────────────────────────────────────┤
 * │ [2 Overdue] [1 Due in 3 days]           │
 * └─────────────────────────────────────────┘
 */

import * as React from 'react';
import { cva } from 'class-variance-authority';
import {
  DollarSign,
  AlertTriangle,
  Check,
  Plus,
  MoreHorizontal,
  FileText,
  CreditCard,
  Eye,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format currency in Indian number system (lakhs/crores)
 * Example: 100000 -> "1,00,000"
 */
function formatIndianCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
  return formatted;
}

/**
 * Format date as "DD MMM YYYY"
 * Example: 2024-11-15 -> "15 Nov 2024"
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ============================================================================
// Variants
// ============================================================================

/**
 * Card container variants based on status tier
 * - Has overdue: Red ring/border
 * - Has unpaid but no overdue: Default border
 * - All clear: Default border
 */
const cardVariants = cva(
  'p-4 transition-all duration-200 hover:shadow-lg hover:border-border/80 active:scale-[0.98] cursor-pointer',
  {
    variants: {
      tier: {
        overdue: 'ring-1 ring-red-500/30 border-red-500/20',
        unpaid: '',
        clear: '',
      },
    },
    defaultVariants: {
      tier: 'clear',
    },
  }
);

/**
 * Amount text color based on status tier
 */
const amountVariants = cva('text-[30px] font-bold leading-tight', {
  variants: {
    tier: {
      overdue: 'text-red-400',
      unpaid: 'text-amber-500',
      clear: 'text-green-500',
    },
  },
  defaultVariants: {
    tier: 'clear',
  },
});

/**
 * Status icon container variants
 * - Has overdue: Red/20% bg, $ icon, Red-400
 * - Has unpaid OR missed: Amber/20% bg, ! icon, Amber-400
 * - All clear: Green/20% bg, check icon, Green-400
 */
const statusIconVariants = cva(
  'flex h-10 w-10 items-center justify-center rounded-full',
  {
    variants: {
      tier: {
        overdue: 'bg-red-500/20 text-red-400',
        unpaid: 'bg-amber-500/20 text-amber-500',
        clear: 'bg-green-500/20 text-green-500',
      },
    },
    defaultVariants: {
      tier: 'clear',
    },
  }
);

/**
 * Unpaid count color variants
 * - Coral if any overdue
 * - Orange if unpaid no overdue
 * - Green if zero
 */
const unpaidCountVariants = cva('text-2xl font-bold', {
  variants: {
    status: {
      overdue: 'text-red-400',
      unpaid: 'text-amber-500',
      clear: 'text-green-500',
    },
  },
  defaultVariants: {
    status: 'clear',
  },
});

/**
 * Invoice timing color variants
 * - Orange if invoices missed
 * - Blue if next expected
 */
const timingVariants = cva('text-2xl font-bold', {
  variants: {
    status: {
      missed: 'text-orange-500',
      upcoming: 'text-blue-500',
      none: 'text-muted-foreground',
    },
  },
  defaultVariants: {
    status: 'none',
  },
});

/**
 * Status badge variants
 */
const statusBadgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border',
  {
    variants: {
      status: {
        overdue: 'bg-red-500/10 text-red-400 border-red-500/20',
        upcoming: 'bg-amber-500/10 text-amber-500 border-amber-500/20', // Due soon (<=3 days)
        due: 'bg-amber-500/10 text-amber-500 border-amber-500/20', // Due later (>3 days)
        missed: 'bg-orange-500/10 text-amber-500 border-orange-500/20', // Invoice missed
        onTrack: 'bg-green-500/10 text-green-500 border-green-500/20', // All clear
      },
    },
    defaultVariants: {
      status: 'onTrack',
    },
  }
);

// ============================================================================
// Types
// ============================================================================

export interface RecurringInvoiceCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'id'> {
  /** Unique identifier for the recurring invoice */
  id: string;
  /** Invoice profile name (main title) */
  profileName: string;
  /** Vendor/company name (subtitle) */
  vendorName: string;
  /** Total pending amount */
  pendingAmount: number;
  /** Number of unpaid invoices */
  unpaidCount: number;
  /** Number of overdue invoices */
  overdueCount: number;
  /** Number of invoices due within 3 days */
  dueSoonCount: number;
  /** Number of invoices due in >3 days */
  dueCount: number;
  /** Number of missed invoices */
  invoicesMissed: number;
  /** Days until next expected invoice */
  nextExpectedDays?: number;
  /** Date of last invoice */
  lastInvoiceDate?: Date | string;
  /** Date of last payment */
  lastPaidDate?: Date | string;
  /** Maximum days any invoice is overdue */
  maxOverdueDays?: number;
  /** Maximum days until earliest due invoice */
  maxDueDays?: number;
  /** Callback when "Add New Invoice" is clicked */
  onAddInvoice?: () => void;
  /** Callback when "Record Payment" is clicked */
  onRecordPayment?: () => void;
  /** Callback when "View Details" is clicked */
  onViewDetails?: () => void;
  /** Callback when card is clicked */
  onCardClick?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function RecurringInvoiceCard({
  id,
  profileName,
  vendorName,
  pendingAmount,
  unpaidCount,
  overdueCount,
  dueSoonCount,
  dueCount,
  invoicesMissed,
  nextExpectedDays,
  lastInvoiceDate,
  lastPaidDate,
  maxOverdueDays,
  maxDueDays,
  onAddInvoice,
  onRecordPayment,
  onViewDetails,
  onCardClick,
  className,
  ...props
}: RecurringInvoiceCardProps) {
  // Determine the status tier
  const tier: 'overdue' | 'unpaid' | 'clear' =
    overdueCount > 0 ? 'overdue' : unpaidCount > 0 || invoicesMissed > 0 ? 'unpaid' : 'clear';

  // Determine unpaid count status
  const unpaidStatus: 'overdue' | 'unpaid' | 'clear' =
    overdueCount > 0 ? 'overdue' : unpaidCount > 0 ? 'unpaid' : 'clear';

  // Determine timing status
  const timingStatus: 'missed' | 'upcoming' | 'none' =
    invoicesMissed > 0 ? 'missed' : nextExpectedDays !== undefined ? 'upcoming' : 'none';

  // Get status icon
  const StatusIcon =
    tier === 'overdue' ? DollarSign : tier === 'unpaid' ? AlertTriangle : Check;

  // Prevent card click when clicking action buttons
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    }
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      data-recurring-id={id}
      className={cn(cardVariants({ tier }), className)}
      onClick={handleCardClick}
      {...props}
    >
      {/* Section 1: Header - Amount + Actions */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={cn(amountVariants({ tier }))}>
            ₹{formatIndianCurrency(pendingAmount)}
          </p>
          <p
            className={cn('text-xs', {
              'text-red-400': tier === 'overdue',
              'text-amber-400': tier === 'unpaid',
              'text-green-400': tier === 'clear',
            })}
          >
            Pending Amount
          </p>
        </div>

        <div className="flex items-center gap-1" onClick={stopPropagation}>
          {/* Plus Button - Add Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRecordPayment}>
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddInvoice}>
                <FileText className="mr-2 h-4 w-4" />
                Add New Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More Actions Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Section 2: Title - Profile Name + Vendor + Status Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0 flex-1 max-w-[200px]">
          <p className="text-base font-semibold text-foreground truncate">
            {profileName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{vendorName}</p>
        </div>
        <div className={cn(statusIconVariants({ tier }))}>
          <StatusIcon className="h-5 w-5" />
        </div>
      </div>

      {/* Section 3: Stats - Unpaid Count + Timing */}
      <div className="flex items-center justify-between px-2 mb-4">
        {/* Left: Unpaid Count */}
        <div className="text-center">
          <p className={cn(unpaidCountVariants({ status: unpaidStatus }))}>
            {unpaidCount > 0 ? unpaidCount : 0}
          </p>
          <p className="text-sm text-muted-foreground">Unpaid</p>
        </div>

        {/* Right: Invoice Timing */}
        <div className="text-center">
          {timingStatus === 'missed' ? (
            <>
              <p className={cn(timingVariants({ status: 'missed' }))}>
                {invoicesMissed}
              </p>
              <p className="text-sm text-muted-foreground">Invoice Missed</p>
            </>
          ) : nextExpectedDays !== undefined ? (
            <>
              <p className={cn(timingVariants({ status: 'upcoming' }))}>
                {nextExpectedDays}d
              </p>
              <p className="text-sm text-muted-foreground">Next Invoice</p>
            </>
          ) : (
            <>
              <p className={cn(timingVariants({ status: 'none' }))}>-</p>
              <p className="text-sm text-muted-foreground">Next Invoice</p>
            </>
          )}
        </div>
      </div>

      {/* Section 4: Last Invoice Info */}
      <div className="rounded-lg bg-muted/30 p-2.5 mb-3">
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-muted-foreground">
            Last Invoice: <span className="text-foreground font-medium">{formatDate(lastInvoiceDate)}</span>
          </span>
          <span className="text-muted-foreground">
            Last Paid: <span className="text-foreground font-medium">{formatDate(lastPaidDate)}</span>
          </span>
        </div>
      </div>

      {/* Section 5: Status Badges */}
      <div className="flex flex-wrap gap-2">
        {/* Overdue badge (red) */}
        {overdueCount > 0 && (
          <span className={cn(statusBadgeVariants({ status: 'overdue' }))}>
            {overdueCount} Overdue{maxOverdueDays !== undefined && ` by ${maxOverdueDays}d`}
          </span>
        )}
        {/* Upcoming badge (yellow) - Due within 3 days */}
        {dueSoonCount > 0 && (
          <span className={cn(statusBadgeVariants({ status: 'upcoming' }))}>
            {dueSoonCount} Upcoming
          </span>
        )}
        {/* Due badge (yellow) - Due in >3 days */}
        {dueCount > 0 && (
          <span className={cn(statusBadgeVariants({ status: 'due' }))}>
            {dueCount} Due in {maxDueDays ?? 0}d
          </span>
        )}
        {/* Invoice Missed badge (orange) */}
        {invoicesMissed > 0 && (
          <span className={cn(statusBadgeVariants({ status: 'missed' }))}>
            {invoicesMissed} Invoice Missed
          </span>
        )}
        {/* On Track badge (green) - Only when everything is clear */}
        {overdueCount === 0 && dueSoonCount === 0 && dueCount === 0 && invoicesMissed === 0 && (
          <span className={cn(statusBadgeVariants({ status: 'onTrack' }))}>
            On Track
          </span>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// Grid Container
// ============================================================================

export interface RecurringCardGridProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Grid container for recurring invoice cards
 * Responsive 4-column layout:
 * - 1 column on mobile
 * - 2 columns on tablet (sm)
 * - 3 columns on medium screens (lg)
 * - 4 columns on extra large screens (xl)
 */
export function RecurringCardGrid({
  children,
  className,
  ...props
}: RecurringCardGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default RecurringInvoiceCard;
