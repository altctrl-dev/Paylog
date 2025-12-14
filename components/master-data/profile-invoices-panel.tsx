/**
 * Profile Invoices Panel
 *
 * Shows profile details along with pending invoices for that profile.
 * Used from recurring invoice cards "View Details" and "Record Payment" actions.
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
} from 'lucide-react';
import { getInvoiceProfiles } from '@/app/actions/master-data';
import { useInvoices } from '@/hooks/use-invoices';
import { usePanel } from '@/hooks/use-panel';
import { calculateTds } from '@/lib/utils/tds';
import { cn } from '@/lib/utils';
import type { PanelConfig } from '@/types/panel';
import { PANEL_WIDTH } from '@/types/panel';
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from '@/types/invoice';

interface ProfileInvoicesPanelProps {
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

interface PendingInvoice {
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

export function ProfileInvoicesPanel({
  config,
  onClose,
  profileId,
}: ProfileInvoicesPanelProps) {
  const { openPanel } = usePanel();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = React.useState(true);

  // Fetch invoices for this profile (only unpaid/partial status)
  const {
    data: invoicesData,
    isLoading: isLoadingInvoices,
  } = useInvoices({
    invoice_profile_id: profileId,
    page: 1,
    per_page: 100,
  });

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

  // Process invoices to get pending ones with calculated balances
  const pendingInvoices = React.useMemo<PendingInvoice[]>(() => {
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
          tds_rounded: inv.tds_rounded ?? false,
          totalPaid: paid,
          remainingBalance,
          isOverdue,
          daysOverdue,
        };
      })
      .sort((a, b) => {
        // Sort by overdue first, then by due date
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.due_date && b.due_date) {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        }
        return 0;
      });
  }, [invoicesData]);

  // Calculate totals
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.remainingBalance, 0);
  const overdueCount = pendingInvoices.filter((inv) => inv.isOverdue).length;

  // Handle record payment for an invoice
  const handleRecordPayment = (invoice: PendingInvoice) => {
    openPanel('payment-record', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceAmount: invoice.invoice_amount,
      remainingBalance: invoice.remainingBalance,
      tdsApplicable: invoice.tds_applicable,
      tdsPercentage: invoice.tds_percentage,
      tdsRounded: invoice.tds_rounded,
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
          <Skeleton className="h-20 w-full" />
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
      title={profile.name}
      onClose={onClose}
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Profile Summary */}
        <div className="space-y-3">
          {/* Description */}
          {profile.description && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">{profile.description}</p>
            </div>
          )}

          {/* Profile Info Row */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{profile.vendor.name}</Badge>
            {profile.billing_frequency && (
              <Badge variant="secondary">
                {profile.billing_frequency.charAt(0).toUpperCase() +
                  profile.billing_frequency.slice(1)}
              </Badge>
            )}
            {profile.tds_applicable && profile.tds_percentage && (
              <Badge variant="default">{profile.tds_percentage}% TDS</Badge>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Pending</p>
            <p className={cn(
              'text-lg font-bold',
              totalPending > 0 ? 'text-amber-500' : 'text-green-500'
            )}>
              {formatIndianCurrency(totalPending)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Pending Invoices</p>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold">{pendingInvoices.length}</p>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} overdue
                </Badge>
              )}
            </div>
          </Card>
        </div>

        {/* Pending Invoices List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Pending Invoices
          </h3>

          {pendingInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No pending invoices for this profile.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingInvoices.map((invoice) => (
                <Card
                  key={invoice.id}
                  className={cn(
                    'p-3 cursor-pointer transition-colors hover:bg-muted/50',
                    invoice.isOverdue && 'border-red-500/30'
                  )}
                  onClick={() => handleViewInvoice(invoice.id)}
                >
                  <div className="flex items-start justify-between gap-2">
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

                      {/* Due date */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
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

                      {/* Balance */}
                      <p className={cn(
                        'text-sm font-semibold mt-1',
                        invoice.isOverdue ? 'text-red-500' : 'text-amber-500'
                      )}>
                        {formatIndianCurrency(invoice.remainingBalance)}
                        {invoice.totalPaid > 0 && (
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            ({formatIndianCurrency(invoice.totalPaid)} paid)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Record Payment Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordPayment(invoice);
                      }}
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                      Pay
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PanelLevel>
  );
}
