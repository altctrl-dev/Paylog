/**
 * Profile Payment Panel
 *
 * Allows recording payments against outstanding invoices for a profile.
 * Shows total pending amount and list of invoices that need payment.
 *
 * Design:
 * - Header: Profile name + Total Pending Amount
 * - Summary: Outstanding invoice count
 * - List: Each invoice with remaining balance and "Pay" button
 */

'use client';

import * as React from 'react';
import { PanelLevel } from '@/components/panels/panel-level';
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
  ChevronRight,
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

interface ProfilePaymentPanelProps {
  config: PanelConfig;
  onClose: () => void;
  profileId: number;
}

type Profile = {
  id: number;
  name: string;
  description: string | null;
  vendor: { name: string };
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
  totalPaid: number;
  remainingBalance: number;
  isOverdue: boolean;
  daysOverdue: number;
}

/**
 * Format currency in Indian number system
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

export function ProfilePaymentPanel({
  config,
  onClose,
  profileId,
}: ProfilePaymentPanelProps) {
  const { openPanel } = usePanel();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);

  // Fetch invoices for this profile
  const {
    data: invoicesData,
    isLoading: isLoadingInvoices,
  } = useInvoices({
    invoice_profile_id: profileId,
    page: 1,
    per_page: 100,
  });

  // Fetch ledger summary for accurate totals
  const {
    data: ledgerSummary,
  } = useLedgerSummary(profileId, profileId > 0);

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

        // Calculate net payable amount after TDS
        let payableAmount = inv.invoice_amount;
        if (inv.tds_applicable && inv.tds_percentage) {
          const tdsResult = calculateTds(inv.invoice_amount, inv.tds_percentage);
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
            daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
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

  // Handle record payment for an invoice
  const handleRecordPayment = (invoice: OutstandingInvoice) => {
    openPanel('payment-record', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceAmount: invoice.invoice_amount,
      remainingBalance: invoice.remainingBalance,
      tdsApplicable: invoice.tds_applicable,
      tdsPercentage: invoice.tds_percentage,
    });
  };

  // Handle view invoice detail
  const handleViewInvoice = (invoiceId: number) => {
    openPanel('invoice-v3-detail', { invoiceId }, { width: PANEL_WIDTH.LARGE });
  };

  const isLoading = isLoadingProfile || isLoadingInvoices;

  if (isLoading) {
    return (
      <PanelLevel
        config={config}
        title="Loading..."
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PanelLevel>
    );
  }

  if (!profile) {
    return (
      <PanelLevel
        config={config}
        title="Profile Not Found"
        onClose={onClose}
        footer={
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Could not find the invoice profile.
          </p>
        </div>
      </PanelLevel>
    );
  }

  return (
    <PanelLevel
      config={config}
      title={`Record Payment - ${profile.name}`}
      onClose={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Payment Summary Card - Similar to Invoice Summary in payment-form-panel */}
        <Card className="border-secondary p-4">
          <h3 className="mb-3 font-semibold text-secondary">Payment Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Profile:</span>
              <span className="font-medium">{profile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor:</span>
              <span className="font-medium">{profile.vendor.name}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Total Pending Amount:</span>
              <span className={cn(
                'font-bold text-lg',
                totalPending > 0 ? 'text-destructive' : 'text-green-500'
              )}>
                {formatCurrency(totalPending)}
              </span>
            </div>
          </div>
        </Card>

        {/* Outstanding Invoices Count */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium text-foreground">
            Outstanding Invoices
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {outstandingInvoices.length} invoice{outstandingInvoices.length !== 1 ? 's' : ''}
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        </div>

        {/* Outstanding Invoices List */}
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
          <div className="space-y-3">
            {outstandingInvoices.map((invoice) => (
              <Card
                key={invoice.id}
                className={cn(
                  'p-4 transition-colors',
                  invoice.isOverdue && 'border-red-500/30 bg-red-500/5'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Invoice Details */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleViewInvoice(invoice.id)}
                  >
                    {/* Invoice number and status */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-semibold truncate">
                        #{invoice.invoice_number}
                      </span>
                      <Badge
                        variant={INVOICE_STATUS_CONFIG[invoice.status].variant}
                        className="text-xs shrink-0"
                      >
                        {INVOICE_STATUS_CONFIG[invoice.status].label}
                      </Badge>
                    </div>

                    {/* Due date and overdue indicator */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      {invoice.isOverdue ? (
                        <>
                          <Clock className="h-3.5 w-3.5 text-red-500" />
                          <span className="text-red-500 font-medium">
                            {invoice.daysOverdue}d overdue
                          </span>
                        </>
                      ) : invoice.due_date ? (
                        <>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Due {formatDate(invoice.due_date)}</span>
                        </>
                      ) : (
                        <span>No due date</span>
                      )}
                    </div>

                    {/* Amount breakdown */}
                    <div className="space-y-0.5 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Invoice Amount:</span>
                        <span>{formatCurrency(invoice.invoice_amount)}</span>
                      </div>
                      {invoice.totalPaid > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Paid:</span>
                          <span className="text-green-600">
                            -{formatCurrency(invoice.totalPaid)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t font-semibold">
                        <span>Remaining:</span>
                        <span className={invoice.isOverdue ? 'text-red-500' : 'text-amber-500'}>
                          {formatCurrency(invoice.remainingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Pay Button */}
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordPayment(invoice);
                      }}
                      className="gap-1.5"
                    >
                      <CreditCard className="h-4 w-4" />
                      Pay
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground gap-1"
                      onClick={() => handleViewInvoice(invoice.id)}
                    >
                      View
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>Click &quot;Pay&quot; on any invoice to record a payment. Partial payments are supported.</p>
        </div>
      </div>
    </PanelLevel>
  );
}
