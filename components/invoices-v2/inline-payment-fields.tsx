/**
 * Inline Payment Fields Component
 *
 * Conditional payment recording fields that appear inline in invoice forms.
 * Includes toggle for "Record Payment?" and conditional fields for payment details.
 *
 * NOTE: This does NOT show current payment status. It only allows recording
 * a new payment while editing an invoice. Payment status is derived from
 * the Payment records in the database.
 */

'use client';

import * as React from 'react';
import { Controller, Control } from 'react-hook-form';
import { ArrowUp } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AmountInput } from './amount-input';
import { calculateTds } from '@/lib/utils/tds';

/**
 * Get currency symbol from code
 */
function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    AUD: 'A$',
    CAD: 'C$',
    CHF: 'Fr',
    CNY: '¥',
    SGD: 'S$',
  };
  return symbols[code] || code;
}

/**
 * Props interface for InlinePaymentFields
 */
interface InlinePaymentFieldsProps {
  /** Whether to show payment recording fields */
  recordPayment: boolean;
  /** Callback when record payment toggle changes */
  onRecordPaymentChange: (record: boolean) => void;
  /** Payment date (null if not paid) */
  paidDate: Date | null;
  /** Amount paid (null if not paid) */
  paidAmount: number | null;
  /** Currency of payment (null if not paid) */
  paidCurrency: string | null;
  /** Payment type ID (null if not paid) */
  paymentTypeId: number | null;
  /** Payment reference number (null if not paid or not required) */
  paymentReference: string | null;
  /** Callback when any field changes */
  onFieldChange: (field: string, value: boolean | number | string | Date | null) => void;
  /** Invoice currency code (e.g., 'INR', 'USD') - used for display prefix */
  invoiceCurrency?: string;
  /** Available currencies for dropdown (legacy - no longer used) */
  currencies?: Array<{ id: number; code: string; symbol: string }>;
  /** Available payment types for dropdown */
  paymentTypes?: Array<{ id: number; name: string; requires_reference: boolean }>;
  /** Form errors keyed by field name */
  errors?: Record<string, { message?: string }>;
  /** React Hook Form control for Controller components */
  control?: Control<Record<string, unknown>>;
  /** Whether TDS is applicable for this invoice */
  tdsApplicable?: boolean;
  /** TDS percentage (e.g., 10 for 10%) */
  tdsPercentage?: number;
  /** Invoice amount for TDS calculation and context stats */
  invoiceAmount?: number;
  /** Whether TDS rounding is enabled */
  tdsRounded?: boolean;
  /** Callback when TDS rounding changes */
  onTdsRoundedChange?: (rounded: boolean) => void;
}

/**
 * Format date for input[type="date"]
 */
function formatDateForInput(date: Date | null): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date from input[type="date"]
 */
function parseDateFromInput(value: string): Date | null {
  if (!value || value === '') return null;
  return new Date(value);
}

/**
 * Format currency for display (INR)
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
 * Inline Payment Fields Component
 *
 * Shows/hides payment recording fields based on "Record Payment?" toggle.
 * Auto-fills currency from invoice currency when toggled on.
 * Conditionally shows reference number field based on payment type.
 */
export function InlinePaymentFields({
  recordPayment,
  onRecordPaymentChange,
  paidDate,
  paidAmount,
  paidCurrency,
  paymentTypeId,
  paymentReference,
  onFieldChange,
  invoiceCurrency,
  // currencies prop deprecated - currency now derived from invoice's currency
  paymentTypes = [],
  errors = {},
  control,
  tdsApplicable = false,
  tdsPercentage = 0,
  invoiceAmount = 0,
  tdsRounded = false,
  onTdsRoundedChange,
}: InlinePaymentFieldsProps) {
  // Find selected payment type to check if reference is required
  const selectedPaymentType = paymentTypes.find((pt) => pt.id === paymentTypeId);
  const requiresReference = selectedPaymentType?.requires_reference ?? false;

  // Calculate TDS amounts (exact and rounded) - only when TDS is applicable
  const tdsCalculation = React.useMemo(() => {
    if (!tdsApplicable || !tdsPercentage || !invoiceAmount) {
      return { exactTds: 0, roundedTds: 0, activeTds: 0 };
    }

    const exactResult = calculateTds(invoiceAmount, tdsPercentage, false);
    const roundedResult = calculateTds(invoiceAmount, tdsPercentage, true);

    return {
      exactTds: exactResult.tdsAmount,
      roundedTds: roundedResult.tdsAmount,
      activeTds: tdsRounded ? roundedResult.tdsAmount : exactResult.tdsAmount,
    };
  }, [tdsApplicable, tdsPercentage, invoiceAmount, tdsRounded]);

  // Only show TDS rounding toggle when TDS amount is a decimal (rounding would make a difference)
  // When TDS is already a whole number (e.g., 10000 × 2% = 200), no need to show the toggle
  const showTdsRounding =
    tdsApplicable &&
    tdsPercentage > 0 &&
    invoiceAmount > 0 &&
    tdsCalculation.exactTds !== tdsCalculation.roundedTds;

  // Auto-fill currency when toggling record payment to true
  React.useEffect(() => {
    if (recordPayment && !paidCurrency && invoiceCurrency) {
      onFieldChange('paid_currency', invoiceCurrency);
    }
  }, [recordPayment, paidCurrency, invoiceCurrency, onFieldChange]);

  // Auto-fill date to current date when toggling record payment to true
  React.useEffect(() => {
    if (recordPayment && !paidDate) {
      onFieldChange('paid_date', new Date());
    }
  }, [recordPayment, paidDate, onFieldChange]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Toggle: Record Payment? */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="record_payment" className="text-base font-semibold">
            Record Payment
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add payment details for this invoice
          </p>
        </div>
        <Switch
          id="record_payment"
          checked={recordPayment}
          onCheckedChange={onRecordPaymentChange}
        />
      </div>

      {/* Info Note */}
      {recordPayment && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> Payment will be recorded after the invoice is approved. For immediate payment recording, add it from the invoice detail page after creation.
          </p>
        </div>
      )}

      {/* Conditional Payment Fields */}
      {recordPayment && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Context Stats - Only show when invoice amount is available */}
          {invoiceAmount > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {/* Invoice Amount */}
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">Invoice Amount</p>
                <p className="text-sm font-semibold mt-0.5">
                  {formatCurrency(invoiceAmount)}
                </p>
              </div>
              {/* TDS Deducted - Only show if TDS applicable */}
              {tdsApplicable && tdsPercentage > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-3">
                  <p className="text-xs text-muted-foreground">TDS Deducted</p>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                    -{formatCurrency(tdsCalculation.activeTds)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tdsPercentage}%{tdsRounded ? ' · Rounded' : ''}
                  </p>
                </div>
              )}
              {/* Net Payable */}
              <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20 p-3">
                <p className="text-xs text-muted-foreground">Net Payable</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mt-0.5">
                  {formatCurrency(
                    tdsApplicable && tdsPercentage > 0
                      ? invoiceAmount - tdsCalculation.activeTds
                      : invoiceAmount
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Row 1: Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            {/* Amount with Currency Prefix */}
            <div className="space-y-2">
              <Label htmlFor="paid_amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="flex">
                {/* Currency Prefix */}
                <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm font-medium min-w-[70px]">
                  {invoiceCurrency || 'INR'} {getCurrencySymbol(invoiceCurrency || 'INR')}
                </div>
                {/* Amount Input */}
                <AmountInput
                  id="paid_amount"
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(value) => onFieldChange('paid_amount', value)}
                  hasError={!!errors.paid_amount}
                  className="rounded-l-none flex-1"
                />
              </div>
              {errors.paid_amount && (
                <p className="text-xs text-destructive">{errors.paid_amount.message}</p>
              )}
              {/* Max hint */}
              {invoiceAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Max: {formatCurrency(
                    tdsApplicable && tdsPercentage > 0
                      ? invoiceAmount - tdsCalculation.activeTds
                      : invoiceAmount
                  )}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="paid_date">
                Date <span className="text-destructive">*</span>
              </Label>
              {control ? (
                <Controller
                  name="paid_date"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="paid_date"
                      type="date"
                      value={formatDateForInput(field.value as Date | null)}
                      onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
                      className={errors.paid_date ? 'border-destructive' : ''}
                    />
                  )}
                />
              ) : (
                <Input
                  id="paid_date"
                  type="date"
                  value={formatDateForInput(paidDate)}
                  onChange={(e) => onFieldChange('paid_date', parseDateFromInput(e.target.value))}
                  className={errors.paid_date ? 'border-destructive' : ''}
                />
              )}
              {errors.paid_date && (
                <p className="text-xs text-destructive">{errors.paid_date.message}</p>
              )}
            </div>
          </div>

          {/* Row 2: Payment Type + Reference */}
          <div className="grid grid-cols-2 gap-4">
            {/* Payment Type */}
            <div className="space-y-2">
              <Label htmlFor="payment_type_id">
                Payment Type <span className="text-destructive">*</span>
              </Label>
              {control ? (
                <Controller
                  name="payment_type_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="payment_type_id"
                      value={field.value?.toString() || ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)
                      }
                      className={errors.payment_type_id ? 'border-destructive' : ''}
                    >
                      <option value="">-- Select --</option>
                      {paymentTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              ) : (
                <Select
                  id="payment_type_id"
                  value={paymentTypeId?.toString() || ''}
                  onChange={(e) =>
                    onFieldChange(
                      'payment_type_id',
                      e.target.value ? parseInt(e.target.value, 10) : null
                    )
                  }
                  className={errors.payment_type_id ? 'border-destructive' : ''}
                >
                  <option value="">-- Select --</option>
                  {paymentTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
              )}
              {errors.payment_type_id && (
                <p className="text-xs text-destructive">{errors.payment_type_id.message}</p>
              )}
            </div>

            {/* Reference Number (Conditional based on payment type) */}
            <div className="space-y-2">
              <Label htmlFor="payment_reference">
                Reference {requiresReference && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="payment_reference"
                type="text"
                placeholder={requiresReference ? 'Required' : 'Optional'}
                value={paymentReference || ''}
                onChange={(e) => onFieldChange('payment_reference', e.target.value || null)}
                className={errors.payment_reference ? 'border-destructive' : ''}
              />
              {requiresReference && (
                <p className="text-xs text-muted-foreground">
                  Required for {selectedPaymentType?.name}
                </p>
              )}
              {errors.payment_reference && (
                <p className="text-xs text-destructive">{errors.payment_reference.message}</p>
              )}
            </div>
          </div>

          {/* TDS Rounding Toggle - Only show when TDS amount is a decimal */}
          {showTdsRounding && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="tds_rounded" className="text-base font-semibold flex items-center gap-2">
                    <ArrowUp className="h-4 w-4 text-amber-600" />
                    Round Off TDS
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Round up TDS to the next integer (ceiling)
                  </p>
                </div>
                <Switch
                  id="tds_rounded"
                  checked={tdsRounded}
                  onCheckedChange={(checked) => onTdsRoundedChange?.(checked)}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Exact TDS:</span>
                  <span>{formatCurrency(tdsCalculation.exactTds)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Rounded TDS:</span>
                  <span>{formatCurrency(tdsCalculation.roundedTds)}</span>
                </div>
                <div className="flex justify-between mt-2 pt-2 border-t border-amber-200 dark:border-amber-800 font-semibold">
                  <span>Applied TDS:</span>
                  <span className={tdsRounded ? 'text-amber-600' : ''}>
                    {formatCurrency(tdsCalculation.activeTds)}
                    {tdsRounded && <span className="ml-1 text-xs">(rounded)</span>}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
