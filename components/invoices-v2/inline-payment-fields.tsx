/**
 * Inline Payment Fields Component
 *
 * Conditional payment tracking fields that appear inline in invoice forms.
 * Includes toggle for "Paid?" and conditional fields for payment details.
 */

'use client';

import * as React from 'react';
import { Controller, Control } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * Props interface for InlinePaymentFields
 */
interface InlinePaymentFieldsProps {
  /** Whether the invoice is marked as paid */
  isPaid: boolean;
  /** Callback when isPaid toggle changes */
  onIsPaidChange: (isPaid: boolean) => void;
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
  errors?: Record<string, string>;
  /** React Hook Form control for Controller components */
  control?: Control<Record<string, unknown>>;
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
 * Inline Payment Fields Component
 *
 * Shows/hides payment tracking fields based on "Paid?" toggle.
 * Auto-fills currency from invoice currency when toggled on.
 * Conditionally shows reference number field based on payment type.
 */
export function InlinePaymentFields({
  isPaid,
  onIsPaidChange,
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
}: InlinePaymentFieldsProps) {
  // Find selected payment type to check if reference is required
  const selectedPaymentType = paymentTypes.find((pt) => pt.id === paymentTypeId);
  const requiresReference = selectedPaymentType?.requires_reference ?? false;

  // Auto-fill currency when toggling paid to true
  React.useEffect(() => {
    if (isPaid && !paidCurrency && invoiceCurrency) {
      onFieldChange('paid_currency', invoiceCurrency);
    }
  }, [isPaid, paidCurrency, invoiceCurrency, onFieldChange]);

  // Auto-fill date to current date when toggling paid to true
  React.useEffect(() => {
    if (isPaid && !paidDate) {
      onFieldChange('paid_date', new Date());
    }
  }, [isPaid, paidDate, onFieldChange]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      {/* Toggle: Paid? */}
      <div className="flex items-center justify-between">
        <Label htmlFor="is_paid" className="text-base font-semibold">
          Payment Status
        </Label>
        <div className="flex items-center gap-3">
          <span className={cn('text-sm', !isPaid && 'text-muted-foreground')}>
            {isPaid ? 'Paid' : 'Unpaid'}
          </span>
          <Switch
            id="is_paid"
            checked={isPaid}
            onCheckedChange={onIsPaidChange}
          />
        </div>
      </div>

      {/* Conditional Payment Fields */}
      {isPaid && (
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
                    value={formatDateForInput(field.value)}
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
              <p className="text-xs text-destructive">{errors.paid_date}</p>
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
                      value={field.value || ''}
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
              <Input
                id="paid_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paidAmount ?? ''}
                onChange={(e) =>
                  onFieldChange('paid_amount', e.target.value ? parseFloat(e.target.value) : null)
                }
                className={errors.paid_amount ? 'border-destructive' : ''}
              />
            </div>
            {(errors.paid_amount || errors.paid_currency) && (
              <p className="text-xs text-destructive">
                {errors.paid_amount || errors.paid_currency}
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
              <p className="text-xs text-destructive">{errors.payment_type_id}</p>
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
                <p className="text-xs text-destructive">{errors.payment_reference}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
