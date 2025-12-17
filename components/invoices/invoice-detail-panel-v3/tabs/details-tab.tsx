'use client';

/**
 * Details Tab Component
 *
 * Displays comprehensive invoice details in a two-column grid layout.
 * Organized into sections: Invoice Details, Financial, Classification,
 * Profile (recurring only), Notes/Description, and Metadata.
 */

import { format } from 'date-fns';
import { Calendar } from 'lucide-react';
import { PanelSection } from '@/components/panels/shared';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/format';
import { VENDOR_STATUS_CONFIG, type VendorStatus } from '@/types/vendor';
import { calculateTds } from '@/lib/utils/tds';
import { cn } from '@/lib/utils';
import type { InvoicePanelData } from '../hooks/use-invoice-panel-v3';

// ============================================================================
// Types
// ============================================================================

export interface DetailsTabProps {
  invoice: InvoicePanelData;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate days until/since due date
 */
function getDaysFromDue(dueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Helper Components
// ============================================================================

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

function DetailItem({ label, value, className = '' }: DetailItemProps) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value ?? '-'}</dd>
    </div>
  );
}

interface DueDateDisplayProps {
  dueDate: Date;
  isPaid: boolean;
}

function DueDateDisplay({ dueDate, isPaid }: DueDateDisplayProps) {
  const daysFromDue = getDaysFromDue(dueDate);
  const isOverdue = daysFromDue < 0 && !isPaid;
  const isDueSoon = daysFromDue >= 0 && daysFromDue <= 7 && !isPaid;

  return (
    <div>
      <dt className="text-xs text-muted-foreground">Due Date</dt>
      <dd className="mt-1">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span
              className={cn(
                'text-sm font-medium',
                isOverdue && 'text-red-600 dark:text-red-400',
                isDueSoon && !isOverdue && 'text-amber-600 dark:text-amber-400'
              )}
            >
              {format(dueDate, 'MMM dd, yyyy')}
            </span>
          </div>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs w-fit">
              Overdue by {Math.abs(daysFromDue)} day{Math.abs(daysFromDue) !== 1 ? 's' : ''}
            </Badge>
          )}
          {isDueSoon && !isOverdue && (
            <Badge variant="warning" className="text-xs w-fit">
              Due in {daysFromDue} day{daysFromDue !== 1 ? 's' : ''}
            </Badge>
          )}
          {isPaid && (
            <Badge variant="success" className="text-xs w-fit">
              Paid
            </Badge>
          )}
        </div>
      </dd>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DetailsTab({ invoice }: DetailsTabProps) {
  const currencyCode = invoice.currency?.code || 'USD';

  // Calculate TDS amount and payable amount using invoice's tds_rounded preference (BUG-003)
  const tdsCalc = invoice.tds_applicable && invoice.tds_percentage
    ? calculateTds(invoice.invoice_amount, invoice.tds_percentage, invoice.tds_rounded ?? false)
    : { tdsAmount: 0, payableAmount: invoice.invoice_amount };
  const tdsAmount = tdsCalc.tdsAmount;
  const payableAmount = tdsCalc.payableAmount;

  // Format date helper
  const formatDateValue = (date: Date | null | undefined): string => {
    if (!date) return '-';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Format datetime helper (for metadata)
  const formatDateTimeValue = (date: Date | null | undefined): string => {
    if (!date) return '-';
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  };

  // Check if vendor needs status badge (not approved)
  const vendorNeedsBadge =
    invoice.vendor.status && invoice.vendor.status !== 'APPROVED';
  const vendorStatusConfig = vendorNeedsBadge
    ? VENDOR_STATUS_CONFIG[invoice.vendor.status as VendorStatus]
    : null;

  // Determine if invoice is paid
  const isPaid = invoice.status?.toLowerCase() === 'paid';

  return (
    <div className="space-y-6">
      {/* Section 1: Invoice Details */}
      <PanelSection title="Invoice Details">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem
            label="Invoice Date"
            value={formatDateValue(invoice.invoice_date)}
          />
          {invoice.invoice_received_date && (
            <DetailItem
              label="Date Received"
              value={formatDateValue(invoice.invoice_received_date)}
            />
          )}
          {invoice.due_date ? (
            <DueDateDisplay
              dueDate={new Date(invoice.due_date)}
              isPaid={isPaid}
            />
          ) : (
            <DetailItem label="Due Date" value="-" />
          )}
          {invoice.period_start && invoice.period_end && (
            <DetailItem
              label="Billing Period"
              value={`${format(new Date(invoice.period_start), 'MMM dd')} - ${format(new Date(invoice.period_end), 'MMM dd, yyyy')}`}
            />
          )}
        </dl>
      </PanelSection>

      {/* Section 2: Financial */}
      <PanelSection title="Financial">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem
            label="Invoice Amount"
            value={formatCurrency(invoice.invoice_amount, currencyCode)}
          />
          {invoice.tds_applicable && invoice.tds_percentage && (
            <DetailItem
              label="TDS"
              value={`${invoice.tds_percentage}% (${formatCurrency(tdsAmount, currencyCode)})`}
            />
          )}
          <DetailItem
            label="Payable Amount"
            value={formatCurrency(payableAmount, currencyCode)}
          />
        </dl>
      </PanelSection>

      {/* Section 3: Classification */}
      <PanelSection title="Classification">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem
            label="Vendor"
            value={
              <div className="flex items-center gap-2">
                <span>{invoice.vendor.name}</span>
                {vendorStatusConfig && (
                  <Badge variant={vendorStatusConfig.variant} className="text-xs">
                    {vendorStatusConfig.label}
                  </Badge>
                )}
              </div>
            }
          />
          {invoice.entity && (
            <DetailItem label="Entity" value={invoice.entity.name} />
          )}
          {invoice.category && (
            <DetailItem label="Category" value={invoice.category.name} />
          )}
          {invoice.currency && (
            <DetailItem
              label="Currency"
              value={`${invoice.currency.code} (${invoice.currency.symbol})`}
            />
          )}
        </dl>
      </PanelSection>

      {/* Section 4: Profile (only for recurring invoices) */}
      {invoice.is_recurring && invoice.invoice_profile && (
        <PanelSection title="Profile">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
            <DetailItem
              label="Profile Name"
              value={invoice.invoice_profile.name}
            />
            {invoice.invoice_profile.description && (
              <DetailItem
                label="Profile Description"
                value={invoice.invoice_profile.description}
                className="col-span-2"
              />
            )}
          </dl>
        </PanelSection>
      )}

      {/* Section 5: Notes/Description */}
      {(invoice.description || invoice.notes) && (
        <PanelSection title="Notes">
          <dl className="grid grid-cols-1 gap-y-4">
            {invoice.description && (
              <DetailItem
                label="Description"
                value={invoice.description}
              />
            )}
            {invoice.notes && (
              <DetailItem label="Notes" value={invoice.notes} />
            )}
          </dl>
        </PanelSection>
      )}

      {/* Section 6: Metadata */}
      <PanelSection title="Metadata">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
          <DetailItem
            label="Created By"
            value={
              <div>
                <div>{invoice.creator.full_name}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {invoice.creator.email}
                </div>
              </div>
            }
          />
          <DetailItem
            label="Created At"
            value={formatDateTimeValue(invoice.created_at)}
          />
          <DetailItem
            label="Last Updated"
            value={formatDateTimeValue(invoice.updated_at)}
            className="col-span-2"
          />
        </dl>
      </PanelSection>
    </div>
  );
}

export default DetailsTab;
