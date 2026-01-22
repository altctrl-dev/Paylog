/**
 * Credit Note Form Panel
 *
 * Form for recording credit notes against an invoice.
 * Uses React Hook Form + Zod for type-safe form handling.
 * Styled to match the Invoice Details Panel pattern.
 */

'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { PanelLevel } from '@/components/panels/panel-level';
import {
  PanelSummaryHeader,
  PanelStatGroup,
  PanelSection,
  type StatItem,
} from '@/components/panels/shared';
import { usePanel } from '@/hooks/use-panel';
import { AmountInput } from '@/components/invoices-v2/amount-input';
import { createCreditNote } from '@/app/actions/credit-notes';
import { toast } from 'sonner';
import type { PanelConfig } from '@/types/panel';
import { useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Validation Schema
// ============================================================================

const creditNoteFormSchema = z.object({
  credit_note_number: z.string().min(1, 'Credit note number is required'),
  credit_note_date: z.coerce.date(),
  amount: z.number().positive('Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional().nullable(),
  tds_applicable: z.boolean(),
  tds_amount: z.number().optional().nullable(),
});

type CreditNoteFormData = z.infer<typeof creditNoteFormSchema>;

// ============================================================================
// Props
// ============================================================================

interface CreditNoteFormPanelProps {
  config: PanelConfig;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  invoiceName?: string;
  invoiceAmount: number;
  vendorName?: string;
  entityName?: string;
  currencyCode?: string;
  currencySymbol?: string;
  /** Whether parent invoice has TDS */
  invoiceTdsApplicable?: boolean;
  /** TDS percentage on parent invoice */
  invoiceTdsPercentage?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateForInput(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateFromInput(value: string): Date {
  if (!value) return new Date();
  return new Date(value);
}

function formatCurrency(amount: number, currencyCode: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// Component
// ============================================================================

export function CreditNoteFormPanel({
  config,
  onClose,
  invoiceId,
  invoiceNumber,
  invoiceName,
  invoiceAmount,
  vendorName,
  currencyCode = 'INR',
  currencySymbol = '₹',
  invoiceTdsApplicable = false,
  invoiceTdsPercentage = 0,
}: CreditNoteFormPanelProps) {
  const { closeAllPanels } = usePanel();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Calculate TDS amount for the invoice
  const invoiceTdsAmount = React.useMemo(() => {
    if (!invoiceTdsApplicable || !invoiceTdsPercentage) return 0;
    return (invoiceAmount * invoiceTdsPercentage) / 100;
  }, [invoiceAmount, invoiceTdsApplicable, invoiceTdsPercentage]);

  // Calculate net payable (invoice amount - TDS)
  const netPayable = React.useMemo(() => {
    return invoiceAmount - invoiceTdsAmount;
  }, [invoiceAmount, invoiceTdsAmount]);

  // Form setup - TDS reversal defaults to ON when invoice has TDS
  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreditNoteFormData>({
    resolver: zodResolver(creditNoteFormSchema),
    mode: 'onBlur',
    defaultValues: {
      credit_note_number: '',
      credit_note_date: new Date(),
      amount: 0,
      reason: '',
      notes: null,
      tds_applicable: invoiceTdsApplicable && invoiceTdsPercentage > 0,
      tds_amount: null,
    },
  });

  // Watch values for UI updates
  const watchedAmount = watch('amount');
  const watchedTdsApplicable = watch('tds_applicable');
  const watchedTdsAmount = watch('tds_amount');

  // Calculate TDS reversal amount when amount or TDS toggle changes
  // TDS reversal is proportional: (credit_amount / net_payable) × invoice_TDS
  React.useEffect(() => {
    if (watchedTdsApplicable && invoiceTdsApplicable && invoiceTdsAmount > 0 && watchedAmount > 0 && netPayable > 0) {
      // Proportional TDS reversal based on credit amount relative to net payable
      const proportion = Math.min(watchedAmount / netPayable, 1); // Cap at 100%
      const tdsReversal = invoiceTdsAmount * proportion;
      setValue('tds_amount', Math.round(tdsReversal * 100) / 100);
    } else if (!watchedTdsApplicable) {
      setValue('tds_amount', null);
    }
  }, [watchedAmount, watchedTdsApplicable, invoiceTdsApplicable, invoiceTdsAmount, netPayable, setValue]);

  // Check if amount exceeds invoice amount (warning, not error)
  const amountExceedsInvoice = watchedAmount > invoiceAmount;

  const onSubmit = async (data: CreditNoteFormData) => {
    try {
      setIsSubmitting(true);

      const result = await createCreditNote(invoiceId, data);

      if (!result.success) {
        toast.error('Failed to create credit note', {
          description: result.error,
        });
        return;
      }

      toast.success('Credit note created', {
        description: `Credit note ${data.credit_note_number} has been recorded.`,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['credit-notes', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['credit-note-totals', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['payment-summary', invoiceId] });

      closeAllPanels();
    } catch (error) {
      console.error('Credit note submission error:', error);
      toast.error('Failed to create credit note');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build hero stats array (follows Payment Form pattern - no badges, clean stats)
  const heroStats: StatItem[] = [
    {
      label: 'Invoice Amount',
      value: formatCurrency(invoiceAmount, currencyCode),
      variant: 'default',
    },
  ];

  // Add TDS stat if applicable
  if (invoiceTdsApplicable && invoiceTdsPercentage > 0) {
    heroStats.push({
      label: 'TDS Deducted',
      value: formatCurrency(invoiceTdsAmount, currencyCode),
      subtitle: `${invoiceTdsPercentage}%`,
      variant: 'warning',
    });
  }

  // Add Net Payable
  heroStats.push({
    label: 'Net Payable',
    value: formatCurrency(netPayable, currencyCode),
    variant: 'success',
  });

  // Add Credit Amount if entered (shows impact)
  if (watchedAmount > 0) {
    heroStats.push({
      label: 'Credit Amount',
      value: `-${formatCurrency(watchedAmount, currencyCode)}`,
      variant: amountExceedsInvoice ? 'warning' : 'danger',
    });
  }

  return (
    <PanelLevel
      config={config}
      title={`Add Credit Note - ${invoiceName || invoiceNumber}`}
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
            {isSubmitting ? 'Processing...' : 'Add Credit Note'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Header Section - matches Invoice Details Panel */}
        <div className="border-b pb-4">
          <PanelSummaryHeader
            title={invoiceNumber}
            subtitle={vendorName}
          />
        </div>

        {/* Stats Row - matches Invoice Details Panel */}
        <PanelStatGroup
          stats={heroStats}
          columns={heroStats.length as 2 | 3 | 4}
        />

        {/* Warning if credit exceeds invoice */}
        {amountExceedsInvoice && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Credit note amount exceeds invoice amount. This may result in a credit balance.
            </p>
          </div>
        )}

        {/* Form Section: Credit Note Details */}
        <PanelSection title="Credit Note Details">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Credit Note Number */}
            <div>
              <Label htmlFor="credit_note_number" className="text-xs text-muted-foreground">
                Credit Note Number <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="credit_note_number"
                control={control}
                render={({ field }) => (
                  <Input
                    id="credit_note_number"
                    type="text"
                    placeholder="CN-001"
                    value={field.value}
                    onChange={field.onChange}
                    className={`mt-1 ${errors.credit_note_number ? 'border-destructive' : ''}`}
                  />
                )}
              />
              {errors.credit_note_number && (
                <p className="text-xs text-destructive mt-1">
                  {errors.credit_note_number.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="credit_note_date" className="text-xs text-muted-foreground">
                Date <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="credit_note_date"
                control={control}
                render={({ field }) => (
                  <Input
                    id="credit_note_date"
                    type="date"
                    value={formatDateForInput(field.value)}
                    onChange={(e) => field.onChange(parseDateFromInput(e.target.value))}
                    max={formatDateForInput(new Date())}
                    className={`mt-1 ${errors.credit_note_date ? 'border-destructive' : ''}`}
                  />
                )}
              />
              {errors.credit_note_date && (
                <p className="text-xs text-destructive mt-1">
                  {errors.credit_note_date.message}
                </p>
              )}
            </div>

            {/* Credit Amount */}
            <div>
              <Label htmlFor="amount" className="text-xs text-muted-foreground">
                Credit Amount <span className="text-destructive">*</span>
              </Label>
              <div className="flex mt-1">
                <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm font-medium">
                  {currencySymbol}
                </div>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <AmountInput
                      id="amount"
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="0.00"
                      hasError={!!errors.amount}
                      className="rounded-l-none flex-1"
                    />
                  )}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* TDS Reversal */}
            <div>
              <Label className="text-xs text-muted-foreground">TDS Reversal</Label>
              {invoiceTdsApplicable && invoiceTdsPercentage > 0 ? (
                <>
                  <div className="flex items-center justify-between h-10 px-3 mt-1 border rounded-md bg-background">
                    <div className="flex items-center gap-2">
                      <Controller
                        name="tds_applicable"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="tds_applicable"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <span className="text-sm">
                        {invoiceTdsPercentage}%
                      </span>
                    </div>
                    {watchedTdsApplicable && watchedTdsAmount && (
                      <span className="text-sm font-medium text-green-600">
                        +{formatCurrency(watchedTdsAmount, currencyCode)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reverse TDS deduction
                  </p>
                </>
              ) : (
                <div className="flex items-center h-10 px-3 mt-1 border rounded-md bg-muted/50">
                  <span className="text-sm text-muted-foreground">
                    Not applicable
                  </span>
                </div>
              )}
            </div>

            {/* Reason - full width */}
            <div className="col-span-2">
              <Label htmlFor="reason" className="text-xs text-muted-foreground">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <Input
                    id="reason"
                    type="text"
                    placeholder="e.g., Goods returned, Service cancelled, Pricing adjustment"
                    value={field.value}
                    onChange={field.onChange}
                    className={`mt-1 ${errors.reason ? 'border-destructive' : ''}`}
                  />
                )}
              />
              {errors.reason && (
                <p className="text-xs text-destructive mt-1">{errors.reason.message}</p>
              )}
            </div>
          </dl>
        </PanelSection>

        {/* Form Section: Additional Notes */}
        <PanelSection title="Notes">
          <div>
            <Label htmlFor="notes" className="text-xs text-muted-foreground">
              Additional Notes <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="notes"
                  placeholder="Any additional details..."
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  rows={3}
                  className="mt-1"
                />
              )}
            />
          </div>
        </PanelSection>
      </div>
    </PanelLevel>
  );
}
