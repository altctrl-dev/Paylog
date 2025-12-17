/**
 * Payment Form Panel (Level 3)
 *
 * Records full or partial payments against an invoice.
 * Uses React Hook Form + Zod for type-safe form handling.
 *
 * Redesigned with shared panel components for consistency with V3 panels.
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { PanelLevel } from '@/components/panels/panel-level';
import {
  PanelSummaryHeader,
  PanelStatGroup,
  PanelSection,
  type StatItem,
} from '@/components/panels/shared';
import { usePanel } from '@/hooks/use-panel';
import { useCreatePayment } from '@/hooks/use-payments';
import { usePaymentTypes } from '@/hooks/use-invoices-v2';
import { type PaymentFormData } from '@/types/payment';
import { paymentFormSchema } from '@/lib/validations/payment';
import { AmountInput } from '@/components/invoices-v2/amount-input';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';
import { calculateTds } from '@/lib/utils/tds';
import type { InvoiceStatus } from '@/types/invoice';
import { cn } from '@/lib/utils';
import type { PanelConfig } from '@/types/panel';

interface PaymentFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  /** Invoice name (profile name for recurring, invoice_name for non-recurring) */
  invoiceName?: string;
  /** Invoice status for display badge */
  invoiceStatus?: InvoiceStatus;
  invoiceAmount: number;
  remainingBalance: number;
  /** Whether TDS is applicable for this invoice */
  tdsApplicable?: boolean;
  /** TDS percentage (e.g., 10 for 10%) */
  tdsPercentage?: number;
  /** Whether TDS should be rounded (ceiling) - from invoice preference (BUG-003) */
  tdsRounded?: boolean;
  /** Vendor name for display in header */
  vendorName?: string;
  /** Currency code for display (e.g., 'INR', 'USD') */
  currencyCode?: string;
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
function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Progress bar component for payment progress visualization
 */
function PaymentProgressBar({
  percentage,
  label = 'Payment Progress',
}: {
  percentage: number;
  label?: string;
}) {
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{clampedPercentage.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            clampedPercentage >= 100
              ? 'bg-green-500 dark:bg-green-400'
              : clampedPercentage >= 50
                ? 'bg-primary'
                : 'bg-amber-500 dark:bg-amber-400'
          )}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
    </div>
  );
}

export function PaymentFormPanel({
  config,
  onClose,
  invoiceId,
  invoiceNumber,
  invoiceName,
  invoiceStatus,
  invoiceAmount,
  remainingBalance,
  tdsApplicable = false,
  tdsPercentage = 0,
  tdsRounded = false,
  vendorName,
  currencyCode = 'INR',
}: PaymentFormPanelProps) {
  const { closeAllPanels } = usePanel();
  const createPaymentMutation = useCreatePayment();

  // Fetch payment types from master data
  const { data: paymentTypes = [], isLoading: isLoadingPaymentTypes } = usePaymentTypes();

  // TDS rounding state - initialize from invoice preference (BUG-003)
  const [roundTds, setRoundTds] = React.useState(tdsRounded);

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
    mode: 'onBlur', // Changed from onChange to prevent premature validation errors
    defaultValues: {
      amount_paid: 0,
      payment_date: new Date(),
      payment_type_id: 0, // Will be set when payment types load
      payment_reference: null,
      tds_amount_applied: null,
      tds_rounded: tdsRounded, // Initialize from invoice preference (BUG-003)
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
  const watchedPaymentTypeId = watch('payment_type_id');

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

  // Calculate the net payable amount (after TDS)
  const payableAmount = React.useMemo(() => {
    if (tdsApplicable && tdsPercentage) {
      return roundTds ? tdsCalculation.payableRounded : tdsCalculation.payableExact;
    }
    return invoiceAmount;
  }, [invoiceAmount, tdsApplicable, tdsPercentage, roundTds, tdsCalculation]);

  // Calculate the actual remaining balance (accounting for TDS)
  // The passed remainingBalance is already: originalNetPayable - totalPaid (TDS already deducted by caller)
  // When user toggles TDS rounding, we need to recalculate based on new net payable
  const actualRemainingBalance = React.useMemo(() => {
    if (tdsApplicable && tdsPercentage) {
      // Calculate original TDS using invoice's tdsRounded preference (passed as prop)
      const originalTdsResult = calculateTds(invoiceAmount, tdsPercentage, tdsRounded);
      const originalNetPayable = originalTdsResult.payableAmount;

      // Calculate what's already been paid from the passed remainingBalance
      // remainingBalance = originalNetPayable - totalPaid
      // So: totalPaid = originalNetPayable - remainingBalance
      const totalPaid = Math.max(0, originalNetPayable - remainingBalance);

      // Calculate current net payable based on user's toggle state
      const currentNetPayable = roundTds ? tdsCalculation.payableRounded : tdsCalculation.payableExact;

      // Actual remaining = current net payable - what's been paid
      return Math.max(0, currentNetPayable - totalPaid);
    }
    return remainingBalance;
  }, [remainingBalance, invoiceAmount, tdsApplicable, tdsPercentage, tdsRounded, roundTds, tdsCalculation]);

  // Calculate total paid so far
  const totalPaid = React.useMemo(() => {
    if (tdsApplicable && tdsPercentage) {
      const originalTdsResult = calculateTds(invoiceAmount, tdsPercentage, tdsRounded);
      const originalNetPayable = originalTdsResult.payableAmount;
      return Math.max(0, originalNetPayable - remainingBalance);
    }
    return invoiceAmount - remainingBalance;
  }, [invoiceAmount, remainingBalance, tdsApplicable, tdsPercentage, tdsRounded]);

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

  // Check if selected payment type requires reference
  const requiresReference = React.useMemo(() => {
    const selectedType = paymentTypes.find((pt) => pt.id === watchedPaymentTypeId);
    return selectedType?.requires_reference ?? false;
  }, [paymentTypes, watchedPaymentTypeId]);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      // Validate amount doesn't exceed remaining balance (after TDS)
      if (data.amount_paid > actualRemainingBalance) {
        setError('amount_paid', {
          message: `Amount cannot exceed remaining balance of ${formatCurrency(actualRemainingBalance, currencyCode)}`,
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

  // Calculate payment progress percentage
  const currentProgressPercentage = payableAmount > 0 ? (totalPaid / payableAmount) * 100 : 0;

  // Build hero stats array (2x2 grid layout)
  const heroStats: StatItem[] = [
    {
      label: 'Invoice Amount',
      value: formatCurrency(invoiceAmount, currencyCode),
      variant: 'default',
    },
  ];

  if (tdsApplicable && tdsPercentage > 0) {
    heroStats.push({
      label: 'TDS Deducted',
      value: `-${formatCurrency(tdsCalculation.activeTds, currencyCode)}`,
      subtitle: roundTds ? `${tdsPercentage}% · Rounded` : `${tdsPercentage}%`,
      variant: 'warning',
    });
  }

  // Add "Already Paid" card with percentage
  heroStats.push({
    label: 'Already Paid',
    value: formatCurrency(totalPaid, currencyCode),
    subtitle: totalPaid > 0 ? `${currentProgressPercentage.toFixed(0)}%` : undefined,
    variant: 'success',
  });

  heroStats.push({
    label: 'Remaining',
    value: formatCurrency(actualRemainingBalance, currencyCode),
    variant: actualRemainingBalance > 0 ? 'danger' : 'success',
  });

  return (
    <PanelLevel
      config={config}
      title={`Record Payment - ${invoiceName || invoiceNumber}`}
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
      <div className="space-y-6">
        {/* Header Section */}
        <div className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <PanelSummaryHeader
              title={invoiceNumber}
              subtitle={vendorName ? `from ${vendorName}` : undefined}
            />
            {/* Right side: Status badge + TDS toggle */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Status Badge - using same component as invoice list */}
              {invoiceStatus && (
                <InvoiceStatusBadge status={invoiceStatus} />
              )}
              {/* TDS Round Toggle - Only show when TDS amounts differ */}
              {tdsApplicable && tdsPercentage > 0 && tdsCalculation.exactTds !== tdsCalculation.roundedTds && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">TDS Round off</span>
                  <Switch
                    id="round_tds_header"
                    checked={roundTds}
                    onCheckedChange={setRoundTds}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Stats - 3 cards = single row, 4 cards = 2x2 grid */}
        <PanelStatGroup
          stats={heroStats}
          columns={heroStats.length === 3 ? 3 : 2}
        />

        {/* Current Payment Progress */}
        {totalPaid > 0 && (
          <PaymentProgressBar
            percentage={currentProgressPercentage}
            label="Current Progress"
          />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Payment Details Section */}
          <PanelSection title="Payment Details">
            {/* Row 1: Amount (with currency prefix) + Date */}
            <div className="grid grid-cols-2 gap-4">
              {/* Amount Paid with Currency Prefix */}
              <div className="space-y-2">
                <Label htmlFor="amount_paid">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <div className="flex">
                  {/* Currency Prefix */}
                  <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm font-medium min-w-[70px]">
                    {currencyCode} {currencyCode === 'INR' ? '₹' : currencyCode === 'USD' ? '$' : ''}
                  </div>
                  {/* Amount Input */}
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
                        className="rounded-l-none flex-1"
                      />
                    )}
                  />
                </div>
                {errors.amount_paid && (
                  <p className="text-xs text-destructive">
                    {errors.amount_paid.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Max: {formatCurrency(actualRemainingBalance, currencyCode)}
                </p>
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label htmlFor="payment_date">
                  Date <span className="text-destructive">*</span>
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Payment Type - Left */}
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
                          <option value="">-- Select --</option>
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

              {/* Reference - Right */}
              <div className="space-y-2">
                <Label htmlFor="payment_reference">
                  Reference{' '}
                  {requiresReference ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">(Optional)</span>
                  )}
                </Label>
                <Controller
                  name="payment_reference"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="payment_reference"
                      type="text"
                      placeholder="TXN123456789"
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
              </div>
            </div>
          </PanelSection>

          {/* After This Payment Preview */}
          {watchedAmount > 0 && (
            <PanelSection title="After This Payment">
              <PaymentProgressBar
                percentage={((totalPaid + watchedAmount) / payableAmount) * 100}
                label="Projected Progress"
              />

              <Card
                className={cn(
                  'p-4 mt-4',
                  remainingAfterPayment === 0
                    ? 'border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20'
                    : 'border-border'
                )}
              >
                {remainingAfterPayment === 0 ? (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">Invoice will be marked as PAID</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Remaining after payment:</span>
                    <span className="font-semibold">{formatCurrency(remainingAfterPayment, currencyCode)}</span>
                  </div>
                )}
              </Card>
            </PanelSection>
          )}
        </form>
      </div>
    </PanelLevel>
  );
}
