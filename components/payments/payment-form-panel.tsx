/**
 * Payment Form Panel (Level 3)
 *
 * Records full or partial payments against an invoice.
 * Uses React Hook Form + Zod for type-safe form handling.
 *
 * Field Order:
 * 1. Payment Date
 * 2. Amount Paid
 * 3. Payment Method
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useCreatePayment } from '@/hooks/use-payments';
import { type PaymentFormData } from '@/types/payment';
import { paymentFormSchema } from '@/lib/validations/payment';
import { PAYMENT_METHOD, PAYMENT_METHOD_CONFIG } from '@/types/payment';
import type { PanelConfig } from '@/types/panel';

interface PaymentFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  invoiceAmount: number;
  remainingBalance: number;
}

/**
 * Format date for input[type="date"]
 */
function formatDateForInput(date: Date | null | undefined): string {
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
function parseDateFromInput(value: string): Date {
  if (!value) return new Date();
  return new Date(value);
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function PaymentFormPanel({
  config,
  onClose,
  invoiceId,
  invoiceNumber,
  invoiceAmount,
  remainingBalance,
}: PaymentFormPanelProps) {
  const { closeAllPanels } = usePanel();
  const createPaymentMutation = useCreatePayment();

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    mode: 'onChange',
    defaultValues: {
      amount_paid: 0,
      payment_date: new Date(),
      payment_method: PAYMENT_METHOD.CASH,
    },
  });

  // Watch amount to validate against remaining balance
  const watchedAmount = watch('amount_paid');

  // Calculate remaining balance after this payment
  const remainingAfterPayment = React.useMemo(() => {
    const amount = watchedAmount || 0;
    return Math.max(0, remainingBalance - amount);
  }, [watchedAmount, remainingBalance]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      // Validate amount doesn't exceed remaining balance
      if (data.amount_paid > remainingBalance) {
        setError('amount_paid', {
          message: `Amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`,
        });
        return;
      }

      await createPaymentMutation.mutateAsync({
        invoiceId,
        data,
      });

      closeAllPanels(); // Close all panels on success
    } catch (error) {
      // Error handling is done in mutation hook
      console.error('Payment submission error:', error);
    }
  };

  return (
    <PanelLevel
      config={config}
      title={`Record Payment - ${invoiceNumber}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || Object.keys(errors).length > 0}
          >
            {isSubmitting ? 'Processing...' : 'Record Payment'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Invoice Summary Card */}
        <Card className="border-secondary p-4">
          <h3 className="mb-2 font-semibold text-secondary">Invoice Summary</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Amount:</span>
              <span className="font-medium">{formatCurrency(invoiceAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="font-semibold text-destructive">
                {formatCurrency(remainingBalance)}
              </span>
            </div>
            {watchedAmount > 0 && (
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">After This Payment:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(remainingAfterPayment)}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Date */}
        <div className="space-y-2">
          <Label htmlFor="payment_date">
            Payment Date <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="payment_date"
            control={control}
            render={({ field }) => (
              <Input
                id="payment_date"
                type="date"
                value={formatDateForInput(field.value)}
                onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
                max={formatDateForInput(new Date())}
                className={errors.payment_date ? 'border-destructive' : ''}
              />
            )}
          />
          {errors.payment_date && (
            <p className="text-xs text-destructive">
              {errors.payment_date.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Date when payment was received
          </p>
        </div>

        {/* Amount Paid */}
        <div className="space-y-2">
          <Label htmlFor="amount_paid">
            Amount Paid <span className="text-destructive">*</span>
          </Label>
          <Input
            id="amount_paid"
            type="number"
            step="0.01"
            min="0.01"
            max={remainingBalance}
            {...register('amount_paid', { valueAsNumber: true })}
            placeholder="0.00"
            className={errors.amount_paid ? 'border-destructive' : ''}
          />
          {errors.amount_paid && (
            <p className="text-xs text-destructive">
              {errors.amount_paid.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Maximum: {formatCurrency(remainingBalance)}
          </p>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="payment_method">
            Payment Method <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="payment_method"
            control={control}
            render={({ field }) => (
              <Select
                id="payment_method"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                className={errors.payment_method ? 'border-destructive' : ''}
              >
                {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </Select>
            )}
          />
          {errors.payment_method && (
            <p className="text-xs text-destructive">
              {errors.payment_method.message}
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="rounded-md border border-border bg-muted p-3 text-xs">
          <p className="mb-1 font-semibold">Payment Tips:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Payment date cannot be in the future</li>
            <li>• Amount must not exceed remaining balance</li>
            <li>• Invoice status will update automatically</li>
            <li>• All panels will close after recording payment</li>
          </ul>
        </div>

        {/* Payment Status Preview */}
        {watchedAmount > 0 && (
          <Card className="bg-primary/5 p-4">
            <h4 className="mb-2 text-sm font-semibold">After Recording:</h4>
            <div className="space-y-1 text-xs">
              {remainingAfterPayment === 0 ? (
                <p className="font-medium text-primary">
                  ✓ Invoice will be marked as PAID
                </p>
              ) : remainingAfterPayment < remainingBalance ? (
                <p className="font-medium text-secondary">
                  ⚠ Invoice will be marked as PARTIALLY PAID
                </p>
              ) : null}
            </div>
          </Card>
        )}
      </form>
    </PanelLevel>
  );
}
