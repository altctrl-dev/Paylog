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
import { useInvoiceProfiles } from '@/hooks/use-invoices-v2';
import { useInvoices } from '@/hooks/use-invoices';
import { usePanel } from '@/hooks/use-panel';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
  vendorNumber?: number;
  pendingAmount: number;
  unpaidCount: number;
  overdueCount: number;
  dueCount: number;
  invoicesMissed: number;
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
 * Check if a date is due soon (within next 7 days)
 */
function isDueSoon(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return due >= today && due <= sevenDaysFromNow;
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
  activeTab = 'recurring',
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

    return profiles.map((profile) => {
      // Filter invoices for this profile
      const profileInvoices = invoices.filter(
        (inv) => inv.profile?.id === profile.id
      );

      // Calculate aggregated statistics
      let pendingAmount = 0;
      let unpaidCount = 0;
      let overdueCount = 0;
      let dueCount = 0;
      let maxOverdueDays: number | undefined;
      let maxDueDays: number | undefined;
      let lastInvoiceDate: Date | undefined;
      let lastPaidDate: Date | undefined;

      for (const invoice of profileInvoices) {
        // Check if invoice is unpaid (status is unpaid, partial, or pending_approval)
        const isUnpaid = ['unpaid', 'partial', 'pending_approval'].includes(
          invoice.status
        );

        if (isUnpaid) {
          // Add to pending amount
          const paid = invoice.totalPaid ?? 0;
          pendingAmount += invoice.invoice_amount - paid;
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

      return {
        profileId: profile.id,
        profileName: profile.name,
        vendorName: profile.vendor.name,
        vendorNumber: profile.vendor.id,
        pendingAmount,
        unpaidCount,
        overdueCount,
        dueCount,
        invoicesMissed: 0, // TODO: Calculate based on billing frequency
        lastInvoiceDate,
        lastPaidDate,
        maxOverdueDays,
        maxDueDays,
      };
    });
  }, [profiles, invoicesData]);

  // Handle tab change
  const handleTabChange = (tab: InvoiceTab) => {
    onTabChange?.(tab);
  };

  // Action handlers
  const handleViewDetails = (profileId: number) => {
    openPanel('profile-detail', { profileId });
  };

  const handleAddInvoice = (profileId: number) => {
    openPanel('invoice-create-recurring', { profileId });
  };

  const handleRecordPayment = (profileId: number) => {
    // For now, navigate to filtered invoice list
    // In the future, this could open a payment panel
    openPanel('profile-invoices', { profileId });
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
                    vendorName={stats.vendorName}
                    vendorNumber={stats.vendorNumber}
                    pendingAmount={stats.pendingAmount}
                    unpaidCount={stats.unpaidCount}
                    overdueCount={stats.overdueCount}
                    dueCount={stats.dueCount}
                    invoicesMissed={stats.invoicesMissed}
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
      </div>
    </div>
  );
}

export default InvoicesPage;
