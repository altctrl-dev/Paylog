'use client';

/**
 * Invoices Page Component (v3)
 *
 * Main invoices management page with tabbed navigation:
 * - Recurring: Shows recurring invoice cards in a grid
 * - All: Shows all invoices (placeholder for now)
 * - TDS: Shows TDS-related invoices (placeholder for now)
 *
 * This component aggregates invoice data by profile to calculate:
 * - pendingAmount, unpaidCount, overdueCount, dueCount
 * - lastInvoiceDate, lastPaidDate
 */

import * as React from 'react';
import { useMemo } from 'react';
import { FileText } from 'lucide-react';
import { RecurringInvoiceCard, RecurringCardGrid } from './recurring-card';
import { InvoiceTabsResponsive, type InvoiceTab } from './invoice-tabs';
import { AllInvoicesTab } from './all-invoices-tab';
import { TDSTab } from './tds-tab';
import { LedgerTab } from './ledger-tab';
import { useInvoiceProfiles } from '@/hooks/use-invoices-v2';
import { useInvoices } from '@/hooks/use-invoices';
import { usePanel } from '@/hooks/use-panel';
import { PANEL_WIDTH } from '@/types/panel';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateTds } from '@/lib/utils/tds';

// ============================================================================
// Types
// ============================================================================

export interface InvoicesPageProps {
  /** Currently active tab (controlled by parent/URL) */
  activeTab?: InvoiceTab;
  /** Callback when tab changes */
  onTabChange?: (tab: InvoiceTab) => void;
}

/**
 * Aggregated statistics for a recurring invoice profile
 */
interface ProfileAggregatedStats {
  profileId: number;
  profileName: string;
  vendorName: string;
  pendingAmount: number;
  unpaidCount: number;
  overdueCount: number;
  dueSoonCount: number; // Due within 3 days
  dueCount: number; // Due in >3 days
  invoicesMissed: number;
  nextExpectedDays?: number;
  lastInvoiceDate?: Date;
  lastPaidDate?: Date;
  maxOverdueDays?: number;
  maxDueDays?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate days difference between two dates
 */
function daysDiff(date1: Date, date2: Date): number {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get billing frequency in days
 */
function getBillingFrequencyDays(frequency: string | null | undefined): number {
  if (!frequency) return 30; // default to monthly
  switch (frequency.toLowerCase()) {
    case 'weekly':
      return 7;
    case 'biweekly':
    case 'bi-weekly':
      return 14;
    case 'monthly':
      return 30;
    case 'bimonthly':
    case 'bi-monthly':
      return 60;
    case 'quarterly':
      return 90;
    case 'half-yearly':
    case 'semi-annual':
      return 180;
    case 'yearly':
    case 'annual':
      return 365;
    default:
      return 30;
  }
}

/**
 * Calculate next expected invoice date and days until next invoice
 */
function calculateNextInvoice(
  lastInvoiceDate: Date | undefined,
  billingFrequency: string | null | undefined
): { nextExpectedDays: number; invoicesMissed: number } {
  if (!lastInvoiceDate) {
    return { nextExpectedDays: 0, invoicesMissed: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const frequencyDays = getBillingFrequencyDays(billingFrequency);
  const lastDate = new Date(lastInvoiceDate);
  lastDate.setHours(0, 0, 0, 0);

  // Calculate next expected date
  const nextExpectedDate = new Date(lastDate);
  nextExpectedDate.setDate(nextExpectedDate.getDate() + frequencyDays);

  // How many days until next invoice (can be negative if overdue)
  const daysUntilNext = daysDiff(nextExpectedDate, today);

  // Calculate invoices missed (how many billing cycles have passed without an invoice)
  let invoicesMissed = 0;
  if (daysUntilNext < 0) {
    // Next invoice date has passed, calculate how many cycles missed
    invoicesMissed = Math.floor(Math.abs(daysUntilNext) / frequencyDays);
    // Adjust next expected date to next upcoming cycle
    const cyclesPassed = invoicesMissed + 1;
    const adjustedNextDate = new Date(lastDate);
    adjustedNextDate.setDate(adjustedNextDate.getDate() + frequencyDays * cyclesPassed);
    const adjustedDays = daysDiff(adjustedNextDate, today);
    return { nextExpectedDays: Math.max(0, adjustedDays), invoicesMissed };
  }

  return { nextExpectedDays: Math.max(0, daysUntilNext), invoicesMissed: 0 };
}

/**
 * Check if a date is overdue (before today)
 */
function isOverdue(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Check if a date is due soon (within next 3 days, not overdue)
 */
function isDueSoon(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return due >= today && due <= threeDaysFromNow;
}

/**
 * Check if a date is due but not urgent (more than 3 days away)
 */
function isDueLater(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return due > threeDaysFromNow;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Loading skeleton for the recurring cards grid
 */
function RecurringCardsSkeleton() {
  return (
    <RecurringCardGrid>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4 space-y-4">
          {/* Header skeleton */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
          {/* Title skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          {/* Stats skeleton */}
          <div className="flex justify-between">
            <div className="space-y-1">
              <Skeleton className="h-7 w-8" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          {/* Last invoice section */}
          <Skeleton className="h-10 w-full rounded-lg" />
          {/* Status badges */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </Card>
      ))}
    </RecurringCardGrid>
  );
}

/**
 * Empty state when no recurring profiles exist
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No Recurring Invoices
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        You don&apos;t have any recurring invoice profiles yet. Create a profile
        to start tracking recurring invoices.
      </p>
    </div>
  );
}


// ============================================================================
// Main Component
// ============================================================================

export function InvoicesPage({
  activeTab = 'all',
  onTabChange,
}: InvoicesPageProps) {
  const { openPanel } = usePanel();

  // Fetch invoice profiles
  const {
    data: profiles,
    isLoading: isLoadingProfiles,
    error: profilesError,
  } = useInvoiceProfiles();

  // Fetch recurring invoices
  const {
    data: invoicesData,
    isLoading: isLoadingInvoices,
    error: invoicesError,
  } = useInvoices({ is_recurring: true, page: 1, per_page: 1000 });

  // Aggregate invoice data by profile
  const aggregatedStats = useMemo<ProfileAggregatedStats[]>(() => {
    if (!profiles || profiles.length === 0) return [];

    const invoices = invoicesData?.invoices ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = profiles.map((profile) => {
      // Filter invoices for this profile
      const profileInvoices = invoices.filter(
        (inv) => inv.invoice_profile?.id === profile.id
      );

      // Calculate aggregated statistics
      let pendingAmount = 0;
      let unpaidCount = 0;
      let overdueCount = 0;
      let dueSoonCount = 0; // Due within 3 days
      let dueCount = 0; // Due in >3 days
      let maxOverdueDays: number | undefined;
      let maxDueDays: number | undefined;
      let lastInvoiceDate: Date | undefined;
      let lastPaidDate: Date | undefined;

      for (const invoice of profileInvoices) {
        // Check if invoice is unpaid (status is unpaid or partial)
        // Note: pending_approval invoices should NOT be counted until approved
        const isUnpaidStatus = ['unpaid', 'partial'].includes(
          invoice.status
        );

        if (isUnpaidStatus) {
          // Add to pending amount (accounting for TDS deduction)
          const paid = invoice.totalPaid ?? 0;

          // Calculate net payable amount after TDS
          let payableAmount = invoice.invoice_amount;
          if (invoice.tds_applicable && invoice.tds_percentage) {
            const tdsResult = calculateTds(invoice.invoice_amount, invoice.tds_percentage);
            payableAmount = tdsResult.payableAmount;
          }

          pendingAmount += payableAmount - paid;
          unpaidCount += 1;

          // Check overdue/due status
          if (invoice.due_date) {
            const dueDate = new Date(invoice.due_date);
            dueDate.setHours(0, 0, 0, 0);

            if (isOverdue(invoice.due_date)) {
              overdueCount += 1;
              const overdueDays = daysDiff(today, dueDate);
              if (maxOverdueDays === undefined || overdueDays > maxOverdueDays) {
                maxOverdueDays = overdueDays;
              }
            } else if (isDueSoon(invoice.due_date)) {
              // Due within 3 days
              dueSoonCount += 1;
              const dueDays = daysDiff(dueDate, today);
              if (maxDueDays === undefined || dueDays < maxDueDays) {
                maxDueDays = dueDays;
              }
            } else if (isDueLater(invoice.due_date)) {
              // Due in >3 days
              dueCount += 1;
              const dueDays = daysDiff(dueDate, today);
              if (maxDueDays === undefined || dueDays < maxDueDays) {
                maxDueDays = dueDays;
              }
            }
          }
        }

        // Track last invoice date
        if (invoice.invoice_date) {
          const invDate = new Date(invoice.invoice_date);
          if (!lastInvoiceDate || invDate > lastInvoiceDate) {
            lastInvoiceDate = invDate;
          }
        }

        // Track last paid date
        if (invoice.status === 'paid' && invoice.invoice_date) {
          const paidDate = new Date(invoice.invoice_date);
          if (!lastPaidDate || paidDate > lastPaidDate) {
            lastPaidDate = paidDate;
          }
        }
      }

      // Calculate next expected invoice and missed invoices
      const { nextExpectedDays, invoicesMissed } = calculateNextInvoice(
        lastInvoiceDate,
        profile.billing_frequency
      );

      return {
        profileId: profile.id,
        profileName: profile.name,
        vendorName: profile.vendor.name,
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
      };
    });

    // Sort by priority: overdue > pending amount > dueSoon > due > missed > nextInvoice
    return stats.sort((a, b) => {
      // Priority 1: Overdue count (descending)
      if (a.overdueCount !== b.overdueCount) {
        return b.overdueCount - a.overdueCount;
      }
      // Priority 2: Pending amount (descending)
      if (a.pendingAmount !== b.pendingAmount) {
        return b.pendingAmount - a.pendingAmount;
      }
      // Priority 3: Due soon count (descending)
      if (a.dueSoonCount !== b.dueSoonCount) {
        return b.dueSoonCount - a.dueSoonCount;
      }
      // Priority 4: Due count (descending)
      if (a.dueCount !== b.dueCount) {
        return b.dueCount - a.dueCount;
      }
      // Priority 5: Invoice missed count (descending)
      if (a.invoicesMissed !== b.invoicesMissed) {
        return b.invoicesMissed - a.invoicesMissed;
      }
      // Priority 6: Days until next invoice (ascending - sooner = higher priority)
      const nextA = a.nextExpectedDays ?? Infinity;
      const nextB = b.nextExpectedDays ?? Infinity;
      return nextA - nextB;
    });
  }, [profiles, invoicesData]);

  // Handle tab change
  const handleTabChange = (tab: InvoiceTab) => {
    onTabChange?.(tab);
  };

  // Action handlers
  const handleViewDetails = (profileId: number) => {
    // Opens panel showing profile description and pending invoices
    openPanel('profile-invoices', { profileId }, { width: PANEL_WIDTH.LARGE });
  };

  const handleAddInvoice = (profileId: number) => {
    // Opens recurring invoice form with profile pre-selected
    openPanel('invoice-create-recurring', { profileId }, { width: PANEL_WIDTH.LARGE });
  };

  const handleRecordPayment = (profileId: number) => {
    // Opens payment panel showing all outstanding invoices for this profile
    // User can select specific invoices to pay
    openPanel('profile-payment', { profileId }, { width: PANEL_WIDTH.LARGE });
  };

  // Loading state
  const isLoading = isLoadingProfiles || isLoadingInvoices;

  // Error state
  const error = profilesError || invoicesError;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Invoice Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage recurring, pending and completed invoices
        </p>
      </div>

      {/* Tab Navigation */}
      <InvoiceTabsResponsive
        value={activeTab}
        onChange={handleTabChange}
        breakpoint="sm"
      />

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'recurring' && (
          <>
            {isLoading ? (
              <RecurringCardsSkeleton />
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Failed to load invoice data. Please try again.
              </div>
            ) : aggregatedStats.length === 0 ? (
              <EmptyState />
            ) : (
              <RecurringCardGrid>
                {aggregatedStats.map((stats) => (
                  <RecurringInvoiceCard
                    key={stats.profileId}
                    id={String(stats.profileId)}
                    profileName={stats.profileName}
                    vendorName={stats.vendorName}
                    pendingAmount={stats.pendingAmount}
                    unpaidCount={stats.unpaidCount}
                    overdueCount={stats.overdueCount}
                    dueSoonCount={stats.dueSoonCount}
                    dueCount={stats.dueCount}
                    invoicesMissed={stats.invoicesMissed}
                    nextExpectedDays={stats.nextExpectedDays}
                    lastInvoiceDate={stats.lastInvoiceDate}
                    lastPaidDate={stats.lastPaidDate}
                    maxOverdueDays={stats.maxOverdueDays}
                    maxDueDays={stats.maxDueDays}
                    onViewDetails={() => handleViewDetails(stats.profileId)}
                    onAddInvoice={() => handleAddInvoice(stats.profileId)}
                    onRecordPayment={() => handleRecordPayment(stats.profileId)}
                    onCardClick={() => handleViewDetails(stats.profileId)}
                  />
                ))}
              </RecurringCardGrid>
            )}
          </>
        )}

        {activeTab === 'all' && <AllInvoicesTab />}

        {activeTab === 'tds' && <TDSTab />}

        {activeTab === 'ledger' && <LedgerTab />}
      </div>
    </div>
  );
}

export default InvoicesPage;
