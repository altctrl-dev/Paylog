/**
 * Profile Payment Panel V3 (Template A - Complex Detail)
 *
 * V3 redesign with:
 * - Hero section with payment summary stats
 * - Vertical action bar (right side)
 * - Clean footer with only Close button
 *
 * Width: LARGE (800px)
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
import {
  PanelSummaryHeader,
  PanelActionBar,
  PanelSection,
  PanelStatGroup,
  type ActionBarAction,
  type StatItem,
} from '@/components/panels/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  FileText,
  Calendar,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { getInvoiceProfiles } from '@/app/actions/master-data';
import { useInvoices } from '@/hooks/use-invoices';
import { usePanel } from '@/hooks/use-panel';
import { useLedgerSummary } from '@/hooks/use-ledger';
import { calculateTds } from '@/lib/utils/tds';
import { cn } from '@/lib/utils';
import type { PanelConfig } from '@/types/panel';
import { PANEL_WIDTH } from '@/types/panel';
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from '@/types/invoice';

interface ProfilePaymentPanelV3Props {
  config: PanelConfig;
  onClose: () => void;
  profileId: number;
}

type Profile = {
  id: number;
  name: string;
  description: string | null;
  vendor: { name: string };
  currency: { code: string };
  billing_frequency: string | null;
  tds_applicable: boolean;
  tds_percentage: number | null;
};

interface OutstandingInvoice {
  id: number;
  invoice_number: string;
  invoice_amount: number;
  due_date: Date | null;
  status: InvoiceStatus;
  tds_applicable: boolean;
  tds_percentage: number | null;
  tds_rounded: boolean;
  totalPaid: number;
  remainingBalance: number;
  isOverdue: boolean;
  daysOverdue: number;
}

/**
 * Format currency in Indian number system (lakhs/crores)
 */
function formatIndianCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

/**
 * Format date as "DD MMM YYYY"
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ProfilePaymentPanelV3({
  config,
  onClose,
  profileId,
}: ProfilePaymentPanelV3Props) {
  const { openPanel } = usePanel();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);

  // Fetch invoices for this profile
  const { data: invoicesData, isLoading: isLoadingInvoices } = useInvoices({
    invoice_profile_id: profileId,
    page: 1,
    per_page: 100,
  });

  // Fetch ledger summary for accurate totals
  const { data: ledgerSummary } = useLedgerSummary(profileId, profileId > 0);

  // Load profile details
  const loadProfile = React.useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const result = await getInvoiceProfiles({ per_page: 1000 });
      if (result.success) {
        const found = result.data.profiles.find((p) => p.id === profileId);
        if (found) {
          setProfile(found);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [profileId]);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Process invoices to get outstanding ones with calculated balances
  const outstandingInvoices = React.useMemo<OutstandingInvoice[]>(() => {
    if (!invoicesData?.invoices) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoicesData.invoices
      .filter((inv) => ['unpaid', 'partial'].includes(inv.status))
      .map((inv) => {
        const paid = inv.totalPaid ?? 0;

        // Calculate net payable amount after TDS using invoice's tds_rounded preference (BUG-003)
        let payableAmount = inv.invoice_amount;
        if (inv.tds_applicable && inv.tds_percentage) {
          const tdsResult = calculateTds(inv.invoice_amount, inv.tds_percentage, inv.tds_rounded ?? false);
          payableAmount = tdsResult.payableAmount;
        }

        const remainingBalance = payableAmount - paid;

        // Check if overdue
        let isOverdue = false;
        let daysOverdue = 0;
        if (inv.due_date) {
          const dueDate = new Date(inv.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            isOverdue = true;
            daysOverdue = Math.ceil(
              (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
            );
          }
        }

        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          invoice_amount: inv.invoice_amount,
          due_date: inv.due_date,
          status: inv.status as InvoiceStatus,
          tds_applicable: inv.tds_applicable,
          tds_percentage: inv.tds_percentage,
          tds_rounded: inv.tds_rounded ?? false,
          totalPaid: paid,
          remainingBalance,
          isOverdue,
          daysOverdue,
        };
      })
      .sort((a, b) => {
        // Sort: overdue first, then by due date
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        return 0;
      });
  }, [invoicesData]);

  // Calculate totals
  const totalPending = React.useMemo(() => {
    // Use ledger summary if available (more accurate), otherwise calculate from invoices
    if (ledgerSummary?.outstandingBalance !== undefined) {
      return ledgerSummary.outstandingBalance;
    }
    return outstandingInvoices.reduce((sum, inv) => sum + inv.remainingBalance, 0);
  }, [ledgerSummary, outstandingInvoices]);

  const overdueCount = outstandingInvoices.filter((inv) => inv.isOverdue).length;
  const overdueAmount = outstandingInvoices
    .filter((inv) => inv.isOverdue)
    .reduce((sum, inv) => sum + inv.remainingBalance, 0);

  // Handle record payment for an invoice
  const handleRecordPayment = (invoice: OutstandingInvoice) => {
    openPanel('payment-record', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceName: profile?.name,
      invoiceStatus: invoice.status,
      invoiceAmount: invoice.invoice_amount,
      remainingBalance: invoice.remainingBalance,
      tdsApplicable: invoice.tds_applicable,
      tdsPercentage: invoice.tds_percentage,
      tdsRounded: invoice.tds_rounded,
      vendorName: profile?.vendor?.name,
      currencyCode: profile?.currency?.code,
    });
  };

  // Handle view invoice detail
  const handleViewInvoice = (invoiceId: number) => {
    openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
  };

  // ============================================================================
  // ACTION BAR CONFIG
  // ============================================================================

  // No primary actions for payment panel - payments are per-invoice
  const primaryActions: ActionBarAction[] = [];

  // ============================================================================
  // STATS CONFIG
  // ============================================================================

  const stats: StatItem[] = [
    {
      label: 'Total Outstanding',
      value: formatIndianCurrency(totalPending),
      variant: totalPending > 0 ? 'danger' : 'success',
    },
    {
      label: 'Outstanding Invoices',
      value: outstandingInvoices.length.toString(),
    },
    {
      label: 'Overdue',
      value: overdueCount.toString(),
      variant: overdueCount > 0 ? 'danger' : undefined,
      subtitle: overdueCount > 0 ? formatIndianCurrency(overdueAmount) : undefined,
    },
  ];

  const isLoading = isLoadingProfile || isLoadingInvoices;

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title="Loading..."
        onClose={onClose}
        footer={
          <div className="flex w-full justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PanelLevel>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (!profile) {
    return (
      <PanelLevel
        config={config}
        title="Profile Not Found"
        onClose={onClose}
        footer={
          <div className="flex w-full justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Could not find the invoice profile.
          </p>
        </div>
      </PanelLevel>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PanelLevel
      config={config}
      title={`Record Payment - ${profile.name}`}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="flex h-full">
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <PanelSummaryHeader
              title={profile.name}
              subtitle={profile.description || undefined}
              badges={[
                { label: profile.vendor.name, variant: 'outline' },
                ...(profile.billing_frequency
                  ? [
                      {
                        label:
                          profile.billing_frequency.charAt(0).toUpperCase() +
                          profile.billing_frequency.slice(1),
                        variant: 'secondary' as const,
                      },
                    ]
                  : []),
                ...(profile.tds_applicable && profile.tds_percentage
                  ? [
                      {
                        label: `${profile.tds_percentage}% TDS`,
                        variant: 'default' as const,
                      },
                    ]
                  : []),
              ]}
            />
          </div>

          {/* Hero Stats */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <PanelStatGroup stats={stats} />
          </div>

          {/* Invoice List */}
          <div className="flex-1 overflow-auto p-6">
            <PanelSection title="Outstanding Invoices">
              {outstandingInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
                  <FileText className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-600">
                    All invoices are paid!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No outstanding payments for this profile.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {outstandingInvoices.map((invoice) => (
                    <Card
                      key={invoice.id}
                      className={cn(
                        'p-4 cursor-pointer transition-colors hover:bg-muted/50',
                        invoice.isOverdue && 'border-red-500/30'
                      )}
                      onClick={() => handleViewInvoice(invoice.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Invoice number and status */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {invoice.invoice_number}
                            </span>
                            <Badge
                              variant={INVOICE_STATUS_CONFIG[invoice.status].variant}
                              className="text-xs shrink-0"
                            >
                              {INVOICE_STATUS_CONFIG[invoice.status].label}
                            </Badge>
                          </div>

                          {/* Due date and amounts */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {/* Due date */}
                            <div className="flex items-center gap-1">
                              {invoice.isOverdue ? (
                                <>
                                  <Clock className="h-3 w-3 text-red-500" />
                                  <span className="text-red-500">
                                    {invoice.daysOverdue}d overdue
                                  </span>
                                </>
                              ) : invoice.due_date ? (
                                <>
                                  <Calendar className="h-3 w-3" />
                                  <span>Due {formatDate(invoice.due_date)}</span>
                                </>
                              ) : (
                                <span>No due date</span>
                              )}
                            </div>

                            {/* Amount info */}
                            {invoice.totalPaid > 0 && (
                              <span className="text-muted-foreground">
                                {formatIndianCurrency(invoice.totalPaid)} paid
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: Balance and actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p
                              className={cn(
                                'text-sm font-semibold',
                                invoice.isOverdue
                                  ? 'text-red-500'
                                  : 'text-amber-500'
                              )}
                            >
                              {formatIndianCurrency(invoice.remainingBalance)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              remaining
                            </p>
                          </div>

                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(invoice.id);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordPayment(invoice);
                              }}
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              Pay
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </PanelSection>

            {/* Help Text */}
            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>Click &quot;Pay&quot; on any invoice to record a payment. Partial payments are supported.</p>
            </div>
          </div>
        </div>

        {/* Action Bar (right side) - minimal for payment panel */}
        {primaryActions.length > 0 && (
          <div className="border-l bg-muted/20">
            <PanelActionBar primaryActions={primaryActions} />
          </div>
        )}
      </div>
    </PanelLevel>
  );
}

export default ProfilePaymentPanelV3;
