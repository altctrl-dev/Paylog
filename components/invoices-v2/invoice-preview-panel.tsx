/**
 * Invoice Preview Panel Component
 *
 * Displays all invoice data in a readable format before final save.
 * Shows computed values (TDS amount, net amount) and grouped sections.
 */

'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ArrowUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateTds } from '@/lib/utils/tds';

/**
 * Common invoice data structure
 */
interface InvoicePreviewData {
  // Basic Info
  invoice_number: string;
  invoice_date: Date;
  due_date: Date;
  invoice_received_date?: Date | null;

  // Vendor/Entity/Category
  vendor_name?: string;
  vendor_id?: number;
  entity_name?: string;
  entity_id?: number;
  category_name?: string;
  category_id?: number;

  // Profile (recurring only)
  profile_name?: string;
  profile_id?: number;

  // Amount & Currency
  invoice_amount: number;
  currency_code?: string;
  currency_symbol?: string;

  // TDS Details
  tds_applicable: boolean;
  tds_percentage?: number | null;
  tds_rounded?: boolean;

  // Payment Details
  is_paid?: boolean;
  paid_date?: Date | null;
  paid_amount?: number | null;
  paid_currency?: string | null;
  payment_type_name?: string | null;
  payment_reference?: string | null;

  // Period (recurring only)
  period_start?: Date | null;
  period_end?: Date | null;

  // Description
  brief_description?: string | null;

  // File
  file_name?: string | null;
}

/**
 * Props interface for InvoicePreviewPanel
 */
interface InvoicePreviewPanelProps {
  /** Invoice data to preview */
  invoiceData: InvoicePreviewData;
  /** Callback when user confirms and saves */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether the form is currently submitting */
  isSubmitting?: boolean;
  /** Whether this is a recurring invoice */
  isRecurring?: boolean;
}

/**
 * Format currency with symbol
 */
function formatCurrency(amount: number, symbol?: string): string {
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol} ${formatted}` : formatted;
}

/**
 * Display row component
 */
function DisplayRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={cn('grid grid-cols-2 gap-4 py-2', highlight && 'bg-accent/50')}>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm', highlight && 'font-semibold')}>{value}</dd>
    </div>
  );
}

/**
 * Invoice Preview Panel Component
 *
 * Features:
 * - Two-column layout (label: value)
 * - Grouped sections (Basic, Vendor/Entity, Amount, TDS, Payment, Period)
 * - Computed values (TDS amount, net amount)
 * - Confirm & Save / Cancel buttons
 * - Shows file attachment name if present
 */
export function InvoicePreviewPanel({
  invoiceData,
  onConfirm,
  onCancel,
  isSubmitting = false,
  isRecurring = false,
}: InvoicePreviewPanelProps) {
  // Calculate TDS if applicable (using the shared calculateTds utility)
  const tdsCalc = React.useMemo(() => {
    if (!invoiceData.tds_applicable || !invoiceData.tds_percentage) {
      return { tdsAmount: 0, payableAmount: invoiceData.invoice_amount, isRounded: false };
    }
    return calculateTds(
      invoiceData.invoice_amount,
      invoiceData.tds_percentage,
      invoiceData.tds_rounded ?? false
    );
  }, [invoiceData.invoice_amount, invoiceData.tds_percentage, invoiceData.tds_applicable, invoiceData.tds_rounded]);

  const tdsAmount = tdsCalc.tdsAmount;
  const netAmount = tdsCalc.payableAmount;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h3 className="text-lg font-semibold">Invoice Preview</h3>
            <p className="text-sm text-muted-foreground">
              Review all details before saving
            </p>
          </div>

          {/* Basic Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground border-b pb-2">
              Basic Information
            </h4>
            <dl className="divide-y divide-border">
              <DisplayRow
                label="Invoice Number"
                value={invoiceData.invoice_number}
                highlight
              />
              <DisplayRow
                label="Invoice Date"
                value={format(invoiceData.invoice_date, 'dd MMM yyyy')}
              />
              <DisplayRow
                label="Due Date"
                value={format(invoiceData.due_date, 'dd MMM yyyy')}
              />
              {invoiceData.invoice_received_date && (
                <DisplayRow
                  label="Received Date"
                  value={format(invoiceData.invoice_received_date, 'dd MMM yyyy')}
                />
              )}
              {invoiceData.brief_description && (
                <DisplayRow label="Description" value={invoiceData.brief_description} />
              )}
              {invoiceData.file_name && (
                <DisplayRow
                  label="Attached File"
                  value={
                    <Badge variant="secondary" className="font-mono text-xs">
                      {invoiceData.file_name}
                    </Badge>
                  }
                />
              )}
            </dl>
          </div>

          {/* Profile (Recurring Only) */}
          {isRecurring && invoiceData.profile_name && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                Invoice Profile
              </h4>
              <dl className="divide-y divide-border">
                <DisplayRow label="Profile" value={invoiceData.profile_name} highlight />
              </dl>
            </div>
          )}

          {/* Vendor / Entity / Category */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground border-b pb-2">
              Vendor & Classification
            </h4>
            <dl className="divide-y divide-border">
              <DisplayRow label="Vendor" value={invoiceData.vendor_name || 'N/A'} />
              <DisplayRow label="Entity" value={invoiceData.entity_name || 'N/A'} />
              <DisplayRow label="Category" value={invoiceData.category_name || 'N/A'} />
            </dl>
          </div>

          {/* Period (Recurring Only) */}
          {isRecurring && invoiceData.period_start && invoiceData.period_end && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                Billing Period
              </h4>
              <dl className="divide-y divide-border">
                <DisplayRow
                  label="Period"
                  value={`${format(invoiceData.period_start, 'dd MMM yyyy')} - ${format(
                    invoiceData.period_end,
                    'dd MMM yyyy'
                  )}`}
                />
              </dl>
            </div>
          )}

          {/* Amount & Currency */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground border-b pb-2">
              Amount Details
            </h4>
            <dl className="divide-y divide-border">
              <DisplayRow label="Currency" value={invoiceData.currency_code || 'N/A'} />
              <DisplayRow
                label="Invoice Amount"
                value={formatCurrency(
                  invoiceData.invoice_amount,
                  invoiceData.currency_symbol
                )}
                highlight
              />
            </dl>
          </div>

          {/* TDS Details */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground border-b pb-2">
              TDS Details
            </h4>
            <dl className="divide-y divide-border">
              <DisplayRow
                label="TDS Applicable"
                value={
                  <Badge variant={invoiceData.tds_applicable ? 'default' : 'secondary'}>
                    {invoiceData.tds_applicable ? 'Yes' : 'No'}
                  </Badge>
                }
              />
              {invoiceData.tds_applicable && invoiceData.tds_percentage && (
                <>
                  <DisplayRow
                    label="TDS Percentage"
                    value={`${invoiceData.tds_percentage}%`}
                  />
                  <DisplayRow
                    label="TDS Amount"
                    value={
                      <span className="flex items-center gap-1">
                        {formatCurrency(tdsAmount, invoiceData.currency_symbol)}
                        {invoiceData.tds_rounded && (
                          <Badge variant="outline" className="ml-1 px-1 py-0 text-xs bg-amber-50 border-amber-200 text-amber-700">
                            <ArrowUp className="h-3 w-3 mr-0.5" />
                            Rounded
                          </Badge>
                        )}
                      </span>
                    }
                  />
                  <DisplayRow
                    label="Net Amount (After TDS)"
                    value={formatCurrency(netAmount, invoiceData.currency_symbol)}
                    highlight
                  />
                </>
              )}
            </dl>
          </div>

          {/* Payment Details */}
          {invoiceData.is_paid && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                Payment Details
              </h4>
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 mb-2">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Payment will be recorded after the invoice is approved. You can also add payments later from the invoice detail view.
                </p>
              </div>
              <dl className="divide-y divide-border">
                <DisplayRow
                  label="Payment Status"
                  value={
                    <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">
                      To be recorded
                    </Badge>
                  }
                />
                {invoiceData.paid_date && (
                  <DisplayRow
                    label="Payment Date"
                    value={format(invoiceData.paid_date, 'dd MMM yyyy')}
                  />
                )}
                {invoiceData.paid_amount && (
                  <DisplayRow
                    label="Amount Paid"
                    value={formatCurrency(invoiceData.paid_amount, invoiceData.paid_currency ?? undefined)}
                  />
                )}
                {invoiceData.payment_type_name && (
                  <DisplayRow label="Payment Type" value={invoiceData.payment_type_name} />
                )}
                {invoiceData.payment_reference && (
                  <DisplayRow
                    label="Reference Number"
                    value={
                      <Badge variant="secondary" className="font-mono">
                        {invoiceData.payment_reference}
                      </Badge>
                    }
                  />
                )}
              </dl>
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Confirm & Save'}
        </Button>
      </div>
    </div>
  );
}
