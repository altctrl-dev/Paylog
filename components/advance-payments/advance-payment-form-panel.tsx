'use client';

/**
 * Advance Payment Form Panel
 *
 * Side panel for creating advance payments (payments before invoice exists).
 * Used from the Monthly Report tab when recording payments without invoices.
 */

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePanel } from '@/hooks/use-panel';
import { useCreateAdvancePayment } from '@/hooks/use-advance-payments';
import { useQuery } from '@tanstack/react-query';

// ============================================================================
// Form Schema
// ============================================================================

const advancePaymentFormSchema = z.object({
  vendor_id: z.number({ required_error: 'Vendor is required' }).min(1, 'Vendor is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be positive'),
  payment_type_id: z.number({ required_error: 'Payment type is required' }).min(1, 'Payment type is required'),
  payment_date: z.date({ required_error: 'Payment date is required' }),
  payment_reference: z.string().optional().nullable(),
  reporting_month: z.date({ required_error: 'Reporting month is required' }),
  notes: z.string().optional().nullable(),
});

type AdvancePaymentFormValues = z.infer<typeof advancePaymentFormSchema>;

// ============================================================================
// Component Props
// ============================================================================

interface AdvancePaymentFormPanelProps {
  defaultMonth?: number;
  defaultYear?: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function AdvancePaymentFormPanel({
  defaultMonth,
  defaultYear,
}: AdvancePaymentFormPanelProps) {
  const { closeTopPanel } = usePanel();
  const createMutation = useCreateAdvancePayment();

  // Calculate default reporting month
  const now = new Date();
  const defaultReportingMonth = new Date(
    defaultYear || now.getFullYear(),
    (defaultMonth ? defaultMonth - 1 : now.getMonth()),
    1
  );

  // Fetch vendors
  const { data: vendors = [], isLoading: isLoadingVendors } = useQuery({
    queryKey: ['vendors', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/vendors?status=APPROVED');
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      return data.vendors || [];
    },
  });

  // Fetch payment types
  const { data: paymentTypes = [], isLoading: isLoadingPaymentTypes } = useQuery({
    queryKey: ['payment-types', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/payment-types?active=true');
      if (!response.ok) throw new Error('Failed to fetch payment types');
      const data = await response.json();
      return data.paymentTypes || [];
    },
  });

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdvancePaymentFormValues>({
    resolver: zodResolver(advancePaymentFormSchema),
    defaultValues: {
      vendor_id: undefined,
      description: '',
      amount: undefined,
      payment_type_id: undefined,
      payment_date: now,
      payment_reference: '',
      reporting_month: defaultReportingMonth,
      notes: '',
    },
  });

  // Watch payment type for reference requirement
  const selectedPaymentTypeId = watch('payment_type_id');
  const selectedPaymentType = paymentTypes.find(
    (pt: { id: number }) => pt.id === selectedPaymentTypeId
  );
  const requiresReference = selectedPaymentType?.requires_reference ?? false;

  // Submit handler
  const onSubmit = async (data: AdvancePaymentFormValues) => {
    try {
      await createMutation.mutateAsync({
        vendor_id: data.vendor_id,
        description: data.description,
        amount: data.amount,
        payment_type_id: data.payment_type_id,
        payment_date: data.payment_date,
        payment_reference: data.payment_reference || null,
        reporting_month: data.reporting_month,
        notes: data.notes || null,
      });

      toast.success('Advance payment created successfully');
      closeTopPanel();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create advance payment');
    }
  };

  const isLoading = isLoadingVendors || isLoadingPaymentTypes;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">New Advance Payment</h2>
        <p className="text-sm text-muted-foreground">
          Record a payment made before receiving the invoice
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Vendor */}
          <div className="space-y-2">
            <Label htmlFor="vendor_id">Vendor *</Label>
            <Controller
              name="vendor_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() || ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                  disabled={isLoading}
                  className={cn(errors.vendor_id && 'border-destructive')}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor: { id: number; name: string }) => (
                    <option key={vendor.id} value={vendor.id.toString()}>
                      {vendor.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.vendor_id && (
              <p className="text-sm text-destructive">{errors.vendor_id.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="What is this payment for?"
              {...register('description')}
              className={cn(errors.description && 'border-destructive')}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
              className={cn(errors.amount && 'border-destructive')}
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <Label htmlFor="payment_type_id">Payment Type *</Label>
            <Controller
              name="payment_type_id"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.toString() || ''}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                  disabled={isLoading}
                  className={cn(errors.payment_type_id && 'border-destructive')}
                >
                  <option value="">Select payment type</option>
                  {paymentTypes.map((pt: { id: number; name: string }) => (
                    <option key={pt.id} value={pt.id.toString()}>
                      {pt.name}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.payment_type_id && (
              <p className="text-sm text-destructive">{errors.payment_type_id.message}</p>
            )}
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Controller
              name="payment_date"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground',
                        errors.payment_date && 'border-destructive'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>

          {/* Payment Reference */}
          <div className="space-y-2">
            <Label htmlFor="payment_reference">
              Payment Reference {requiresReference && '*'}
            </Label>
            <Input
              id="payment_reference"
              placeholder="Transaction ID, check number, etc."
              {...register('payment_reference')}
            />
          </div>

          {/* Reporting Month */}
          <div className="space-y-2">
            <Label>Reporting Month *</Label>
            <Controller
              name="reporting_month"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground',
                        errors.reporting_month && 'border-destructive'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? format(field.value, 'MMMM yyyy')
                        : 'Pick a month'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          // Set to first of month
                          const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                          field.onChange(firstOfMonth);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Which month&apos;s report should this payment appear in?
            </p>
            {errors.reporting_month && (
              <p className="text-sm text-destructive">{errors.reporting_month.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              rows={3}
              {...register('notes')}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 border-t bg-background flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => closeTopPanel()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || isLoading}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Advance Payment
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AdvancePaymentFormPanel;
