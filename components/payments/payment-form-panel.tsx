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
 * 4. Transaction Reference (optional)
 * 5. TDS Rounding Toggle (if TDS applicable)
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { PanelLevel } from '@/components/panels/panel-level';
import { usePanel } from '@/hooks/use-panel';
import { useCreatePayment } from '@/hooks/use-payments';
import { usePaymentTypes } from '@/hooks/use-invoices-v2';
import { type PaymentFormData } from '@/types/payment';
import { paymentFormSchema } from '@/lib/validations/payment';
import { AmountInput } from '@/components/invoices-v2/amount-input';
import { calculateTds } from '@/lib/utils/tds';
import type { PanelConfig } from '@/types/panel';

interface PaymentFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  invoiceAmount: number;
  remainingBalance: number;
  /** Whether TDS is applicable for this invoice */
  tdsApplicable?: boolean;
  /** TDS percentage (e.g., 10 for 10%) */
  tdsPercentage?: number;
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
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
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
  tdsApplicable = false,
  tdsPercentage = 0,
}: PaymentFormPanelProps) {
  const { closeAllPanels } = usePanel();
  const createPaymentMutation = useCreatePayment();

  // Fetch payment types from master data
  const { data: paymentTypes = [], isLoading: isLoadingPaymentTypes } = usePaymentTypes();

  // TDS rounding state (only relevant if TDS is applicable)
  const [roundTds, setRoundTds] = React.useState(false);

  // Form setup
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    mode: 'onChange',
    defaultValues: {
      amount_paid: 0,
      payment_date: new Date(),
      payment_type_id: 0, // Will be set when payment types load
      payment_reference: null,
      tds_amount_applied: null,
      tds_rounded: false,
    },
  });

  // Set default payment type when payment types load
  React.useEffect(() => {
    if (paymentTypes.length > 0 && !watch('payment_type_id')) {
      setValue('payment_type_id', paymentTypes[0].id);
    }
  }, [paymentTypes, setValue, watch]);

  // Watch amount to validate against remaining balance
  const watchedAmount = watch('amount_paid');

  // Calculate TDS amounts (exact and rounded)
  const tdsCalculation = React.useMemo(() => {
    if (!tdsApplicable || !tdsPercentage) {
      return { exactTds: 0, roundedTds: 0, activeTds: 0, payableExact: invoiceAmount, payableRounded: invoiceAmount };
    }

    const exactResult = calculateTds(invoiceAmount, tdsPercentage, false);
    const roundedResult = calculateTds(invoiceAmount, tdsPercentage, true);

    return {
      exactTds: exactResult.tdsAmount,
      roundedTds: roundedResult.tdsAmount,
      activeTds: roundTds ? roundedResult.tdsAmount : exactResult.tdsAmount,
      payableExact: exactResult.payableAmount,
      payableRounded: roundedResult.payableAmount,
    };
  }, [invoiceAmount, tdsApplicable, tdsPercentage, roundTds]);

  // Calculate the actual remaining balance (accounting for TDS)
  // The passed remainingBalance may be based on invoice amount, but we need it based on net payable
  const actualRemainingBalance = React.useMemo(() => {
    // If TDS is applicable, the remaining balance should be based on net payable
    // remainingBalance from caller = invoiceAmount - totalPaid (without TDS consideration)
    // We need: netPayable - totalPaid
    if (tdsApplicable && tdsPercentage) {
      const netPayable = roundTds ? tdsCalculation.payableRounded : tdsCalculation.payableExact;
      // Calculate what's already been paid: invoiceAmount - remainingBalance
      const alreadyPaid = invoiceAmount - remainingBalance;
      return Math.max(0, netPayable - alreadyPaid);
    }
    return remainingBalance;
  }, [remainingBalance, invoiceAmount, tdsApplicable, tdsPercentage, roundTds, tdsCalculation]);

  // Calculate remaining balance after this payment
  const remainingAfterPayment = React.useMemo(() => {
    const amount = watchedAmount || 0;
    return Math.max(0, actualRemainingBalance - amount);
  }, [watchedAmount, actualRemainingBalance]);

  // Update form TDS fields when toggle changes
  React.useEffect(() => {
    if (tdsApplicable && tdsPercentage) {
      setValue('tds_amount_applied', tdsCalculation.activeTds);
      setValue('tds_rounded', roundTds);
    }
  }, [tdsApplicable, tdsPercentage, roundTds, tdsCalculation.activeTds, setValue]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      // Validate amount doesn't exceed remaining balance (after TDS)
      if (data.amount_paid > actualRemainingBalance) {
        setError('amount_paid', {
          message: `Amount cannot exceed remaining balance of ${formatCurrency(actualRemainingBalance)}`,
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
            {tdsApplicable && tdsPercentage > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TDS ({tdsPercentage}%):</span>
                  <span className="font-medium text-amber-600">
                    -{formatCurrency(tdsCalculation.activeTds)}
                    {roundTds && tdsCalculation.exactTds !== tdsCalculation.roundedTds && (
                      <span className="ml-1 text-xs">(rounded)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="text-muted-foreground">Net Payable:</span>
                  <span className="font-semibold">
                    {formatCurrency(roundTds ? tdsCalculation.payableRounded : tdsCalculation.payableExact)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remaining Balance:</span>
              <span className="font-semibold text-destructive">
                {formatCurrency(actualRemainingBalance)}
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
          <Controller
            name="amount_paid"
            control={control}
            render={({ field }) => (
              <AmountInput
                id="amount_paid"
                value={field.value}
                onChange={field.onChange}
                placeholder="0.00"
                hasError={!!errors.amount_paid}
              />
            )}
          />
          {errors.amount_paid && (
            <p className="text-xs text-destructive">
              {errors.amount_paid.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Maximum: {formatCurrency(actualRemainingBalance)}
          </p>
        </div>

        {/* Payment Type */}
        <div className="space-y-2">
          <Label htmlFor="payment_type_id">
            Payment Type <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="payment_type_id"
            control={control}
            render={({ field }) => (
              <Select
                id="payment_type_id"
                value={field.value?.toString() || ''}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : 0)}
                className={errors.payment_type_id ? 'border-destructive' : ''}
                disabled={isLoadingPaymentTypes}
              >
                {isLoadingPaymentTypes ? (
                  <option value="">Loading...</option>
                ) : paymentTypes.length === 0 ? (
                  <option value="">No payment types available</option>
                ) : (
                  <>
                    <option value="">-- Select Payment Type --</option>
                    {paymentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </>
                )}
              </Select>
            )}
          />
          {errors.payment_type_id && (
            <p className="text-xs text-destructive">
              {errors.payment_type_id.message}
            </p>
          )}
        </div>

        {/* Transaction Reference (Conditional based on payment type) */}
        <div className="space-y-2">
          <Label htmlFor="payment_reference">
            Transaction Reference{' '}
            {paymentTypes.find(pt => pt.id === watch('payment_type_id'))?.requires_reference ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-muted-foreground text-xs">(Optional)</span>
            )}
          </Label>
          <Controller
            name="payment_reference"
            control={control}
            render={({ field }) => (
              <Input
                id="payment_reference"
                type="text"
                placeholder="e.g., TXN123456789"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value || null)}
                className={errors.payment_reference ? 'border-destructive' : ''}
              />
            )}
          />
          {errors.payment_reference && (
            <p className="text-xs text-destructive">
              {errors.payment_reference.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Bank transaction number or check number
          </p>
        </div>

        {/* TDS Rounding Toggle - Only show when TDS amount is a decimal */}
        {tdsApplicable && tdsPercentage > 0 && tdsCalculation.exactTds !== tdsCalculation.roundedTds && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="round_tds" className="text-base font-semibold flex items-center gap-2">
                  <ArrowUp className="h-4 w-4 text-amber-600" />
                  Round Off TDS
                </Label>
                <p className="text-xs text-muted-foreground">
                  Round up TDS to the next integer (ceiling)
                </p>
              </div>
              <Switch
                id="round_tds"
                checked={roundTds}
                onCheckedChange={setRoundTds}
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
                <span className={roundTds ? 'text-amber-600' : ''}>
                  {formatCurrency(tdsCalculation.activeTds)}
                  {roundTds && <span className="ml-1 text-xs">(rounded)</span>}
                </span>
              </div>
            </div>
          </Card>
        )}

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
