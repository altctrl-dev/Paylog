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
  /** Invoice currency to auto-fill paid currency */
  invoiceCurrency?: string;
  /** Available currencies for dropdown */
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
  /** Invoice amount for TDS calculation */
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
  currencies = [],
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
            Add a payment while updating this invoice
          </p>
        </div>
        <Switch
          id="record_payment"
          checked={recordPayment}
          onCheckedChange={onRecordPaymentChange}
        />
      </div>

      {/* Conditional Payment Fields */}
      {recordPayment && (
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paid_date">
              Payment Date <span className="text-destructive">*</span>
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

          {/* Currency & Amount Paid */}
          <div className="space-y-2">
            <Label htmlFor="paid_amount">
              Amount Paid <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              {/* Currency Dropdown */}
              {control ? (
                <Controller
                  name="paid_currency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      id="paid_currency"
                      value={(field.value as string) || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      className={errors.paid_currency ? 'border-destructive' : ''}
                    >
                      <option value="">--</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.code}>
                          {currency.code} {currency.symbol}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              ) : (
                <Select
                  id="paid_currency"
                  value={paidCurrency || ''}
                  onChange={(e) => onFieldChange('paid_currency', e.target.value)}
                  className={errors.paid_currency ? 'border-destructive' : ''}
                >
                  <option value="">--</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.code}>
                      {currency.code} {currency.symbol}
                    </option>
                  ))}
                </Select>
              )}

              {/* Amount Input */}
              <AmountInput
                id="paid_amount"
                placeholder="0.00"
                value={paidAmount}
                onChange={(value) => onFieldChange('paid_amount', value)}
                hasError={!!errors.paid_amount}
              />
            </div>
            {(errors.paid_amount || errors.paid_currency) && (
              <p className="text-xs text-destructive">
                {errors.paid_amount?.message || errors.paid_currency?.message}
              </p>
            )}
          </div>

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
                    <option value="">-- Select Payment Type --</option>
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
                <option value="">-- Select Payment Type --</option>
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

          {/* Reference Number (Conditional) */}
          {requiresReference && (
            <div className="space-y-2">
              <Label htmlFor="payment_reference">
                Reference Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payment_reference"
                type="text"
                placeholder="Enter reference number"
                value={paymentReference || ''}
                onChange={(e) => onFieldChange('payment_reference', e.target.value || null)}
                className={errors.payment_reference ? 'border-destructive' : ''}
              />
              {errors.payment_reference && (
                <p className="text-xs text-destructive">{errors.payment_reference.message}</p>
              )}
            </div>
          )}

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
